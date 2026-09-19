import { useState, useEffect, useMemo } from "react";
import { dbLoadInventoryItems, dbAddInventoryMovement, dbLoadWeeklyRoutine, dbSaveWeeklyRoutine, dbListWeeklyRoutines } from "../db";
import { showAlert, showConfirm } from "./PopupHost";

/* ─────────────────────────────────────────────────────────────────────────
   WEEKLY ROUTINE  (ROS India only — a Saturday checklist for staff)

   One row per shop per week, keyed by that week's Saturday date, covering
   three things in one page instead of three separate hunts around the app:

   1. Stock count — every item in Fresh Stock, staff enter what they
      physically counted; any mismatch against the system quantity is
      applied as a 'correction' movement through the same mechanism the
      Stock page already uses (dbAddInventoryMovement), so this is just a
      guided weekly prompt to use it, not a second way of tracking stock.
   2. Documentation check — a checklist (invoices attached, sales complete,
      returns up to date, etc.), tick + optional note. Starts from a fixed
      set of 5 but admins can add or remove items for the current week.
   3. Work assigned — read live from Rosie Tasks (not stored here at all)
      so it's never stale: whatever's due for the logged-in staff member
      this week, with a way to mark it done without leaving the page.
      Admins also get add/delete controls here so tasks created for
      testing (or for other staff) can be cleaned up without hunting
      around elsewhere.

   Data lives in its own `weekly_routines` table (see db.js) — nothing
   here touches the `products` table used by the UK shops. Every week ever
   saved stays in that table (nothing is deleted by a reset), and the
   "This week ▾" picker at the top surfaces past weeks in read-only mode
   so that history stays reachable.
   ───────────────────────────────────────────────────────────────────────── */

const WEEKLY_DOC_CHECKS = [
  { key: "purchases", label: "This week's purchases have supplier invoices attached" },
  { key: "sales", label: "This week's sales/invoices are complete and correctly filled" },
  { key: "returns", label: "Returns & Refunds cases from this week are up to date" },
  { key: "pettycash", label: "Petty cash entries this week are logged with receipts" },
  { key: "customers", label: "Customer/supplier contact details are accurate for this week's transactions" },
];

// Config (icon/label only — no live numbers here) for the four Returns
// metrics shown inside the "returns" documentation check, shared between
// the live entry form and the read-only history view so both stay in sync.
const RETURNS_METRIC_META = [
  { key: "expecting", icon: "📥", label: "Return Expecting" },
  { key: "refund", icon: "💰", label: "Awaiting Refund" },
  { key: "exchange", icon: "🔄", label: "Awaiting Exchange" },
  { key: "confirmation", icon: "❓", label: "Received – Awaiting Customer Confirmation" },
];
const RETURNS_METRIC_STYLE = {
  expecting: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  refund: { bg: "#f5f3ff", border: "#ddd6fe", color: "#6d28d9" },
  exchange: { bg: "#fdf4ff", border: "#f5d0fe", color: "#a21caf" },
  confirmation: { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
};

function blankDocChecks() {
  return WEEKLY_DOC_CHECKS.map(d => ({ ...d, checked: false, checkedBy: "", checkedAt: null, note: "" }));
}

function getWeekEndingSaturday(d = new Date()) {
  const dt = new Date(d); dt.setHours(0, 0, 0, 0);
  const day = dt.getDay(); // 0=Sun … 6=Sat
  const diff = (6 - day + 7) % 7;
  dt.setDate(dt.getDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function fmtSaturday(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// A fixed date+time for the printed/PDF export — "3h ago" only makes sense
// live on screen, not on a document someone opens weeks later.
function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function WeeklyRoutinePanel({ shopId, shop, user, rosieTasks = [], isRosieTaskDue, onMarkTaskDone, onDeleteTask, staffAccounts = [], onAddTask, returnsExpecting = 0, refundsAwaiting = 0, exchangesAwaiting = 0, awaitingConfirmation = 0, returnedStockSource = [] }) {
  const myId = user?.id || "";
  const myName = user?.fullName || user?.name || "Staff";
  const isAdmin = user?.role === "superadmin" || user?.role === "admin";
  const weekEnding = useMemo(() => getWeekEndingSaturday(), []);
  const routineId = `WR-${shopId}-${weekEnding}`;

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [routine, setRoutine] = useState(null);
  const [newTask, setNewTask] = useState({ assignedTo: "", message: "", recurrence: "once", dueDate: "" });
  const [addingTask, setAddingTask] = useState(false);
  const [newCheckLabel, setNewCheckLabel] = useState("");

  // Past-weeks history: the picker lists every week ever saved (loaded
  // lightweight via dbListWeeklyRoutines); selecting one loads its full
  // detail read-only, without touching the live current-week `routine`.
  const [historyList, setHistoryList] = useState([]);
  const [viewingWeek, setViewingWeek] = useState(""); // "" = live current week
  const [historyRoutine, setHistoryRoutine] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refresh = async () => {
    const [items, existing] = await Promise.all([
      dbLoadInventoryItems(shopId),
      dbLoadWeeklyRoutine(shopId, weekEnding),
    ]);
    const existingMap = new Map((existing?.stockItems || []).map(si => [si.itemId, si]));
    const stockItems = items.map(it => {
      const ex = existingMap.get(it.id);
      // Once staff have counted an item, its systemQty tracks the corrected
      // stock going forward — refreshing the page shouldn't discard that.
      if (ex) return ex;
      return { itemId: it.id, itemName: it.name, category: it.category || "", systemQty: it.currentStock, countedQty: null, countedBy: "", countedAt: null, wasCorrected: false };
    });
    // Documentation checklist for the week: start from whatever was already
    // saved for it (this preserves admin-added/removed items for THIS
    // week); only fall back to the standard 5 when there's no saved row yet.
    const docChecks = existing?.docChecks && existing.docChecks.length ? existing.docChecks : blankDocChecks();
    const returnsCheck = existing?.returnsCheck || {};
    // Returned-stock physical verification: same merge pattern as stock
    // items above — items already tracked this week keep their verified
    // state, items newly "In Office" since last refresh get added fresh,
    // and anything that's since left "In Office" (resold, handed over)
    // simply drops off the live list.
    const existingReturnedMap = new Map((existing?.returnedStockItems || []).map(ri => [ri.returnId, ri]));
    const returnedStockItems = (returnedStockSource || []).map(rs => {
      const ex = existingReturnedMap.get(rs.returnId);
      if (ex) return { ...ex, item: rs.item, customer: rs.customer, receivedDate: rs.receivedDate };
      return { returnId: rs.returnId, item: rs.item, customer: rs.customer, receivedDate: rs.receivedDate, verified: false, verifiedBy: "", verifiedAt: null };
    });
    setRoutine(existing ? { ...existing, stockItems, docChecks, returnsCheck, returnedStockItems } : {
      id: routineId, shopId, weekEnding, stockItems, docChecks, returnsCheck, returnedStockItems, returnedStockManual: [], status: "in_progress", completedBy: "", completedAt: null,
    });
    setLoaded(true);
  };

  useEffect(() => { setLoaded(false); refresh(); /* eslint-disable-next-line */ }, [shopId, weekEnding]);
  useEffect(() => { dbListWeeklyRoutines(shopId).then(setHistoryList); }, [shopId]);

  const persist = async (next) => {
    setRoutine(next);
    setSaving(true);
    const ok = await dbSaveWeeklyRoutine(next);
    setSaving(false);
    if (!ok) showAlert("Couldn't save — please check your connection and try again.");
  };

  const loadHistoryWeek = async (wk) => {
    if (!wk) { setViewingWeek(""); setHistoryRoutine(null); return; }
    setViewingWeek(wk);
    setHistoryLoading(true);
    const data = await dbLoadWeeklyRoutine(shopId, wk);
    setHistoryRoutine(data);
    setHistoryLoading(false);
  };

  const handleReset = async () => {
    const ok = await showConfirm(
      "Reset this week's routine? This clears all stock counts, documentation checks (back to the standard 5) and the completion status so staff start fresh.\n\n" +
      "Important: any stock corrections already applied from counts entered so far (for example test/dummy numbers) are NOT undone by this — " +
      "those already changed the real stock quantities. If test numbers threw off real stock, fix the affected items manually on the Stock page after resetting."
    );
    if (!ok) return;
    setSaving(true);
    const items = await dbLoadInventoryItems(shopId);
    const stockItems = items.map(it => ({ itemId: it.id, itemName: it.name, category: it.category || "", systemQty: it.currentStock, countedQty: null, countedBy: "", countedAt: null, wasCorrected: false }));
    const returnedStockItems = (returnedStockSource || []).map(rs => ({ returnId: rs.returnId, item: rs.item, customer: rs.customer, receivedDate: rs.receivedDate, verified: false, verifiedBy: "", verifiedAt: null }));
    setSaving(false);
    await persist({ ...routine, stockItems, docChecks: blankDocChecks(), returnsCheck: {}, returnedStockItems, returnedStockManual: [], status: "in_progress", completedBy: "", completedAt: null });
  };

  const handleDeleteTask = async (task) => {
    if (!onDeleteTask) return;
    const ok = await showConfirm(`Delete this task?\n\n"${task.message}"`);
    if (!ok) return;
    await onDeleteTask(task.id);
  };

  if (!loaded || !routine) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading Weekly Routine…</div>;

  const isViewingHistory = !!viewingWeek;
  const display = isViewingHistory ? historyRoutine : routine;
  const displayStockItems = display?.stockItems || [];
  const displayReturnedStockItems = display?.returnedStockItems || [];
  const displayReturnedStockManual = display?.returnedStockManual || [];
  const displayDocChecks = (display?.docChecks && display.docChecks.length) ? display.docChecks : blankDocChecks();
  const isCompleted = display?.status === "completed";
  const countedCount = displayStockItems.filter(si => si.countedQty !== null && si.countedQty !== undefined).length;
  const verifiedReturnedCount = displayReturnedStockItems.filter(ri => ri.verified).length;
  // Two grand totals for the summary bar: what the system says should be on
  // hand (every Fresh Stock system quantity, plus one unit per Returned
  // Stock item the system has marked "In Office") versus what's actually
  // been physically confirmed so far (counted quantities entered, verified
  // returned items, plus any manually-logged extra items) — uncounted
  // items simply contribute 0 to the physical total until staff get to
  // them, so this fills in as the week progresses rather than pretending
  // to be final from the start. Manual items have no system expectation
  // behind them, so they only ever add to the physical side.
  const freshSystemTotal = displayStockItems.reduce((a, it) => a + (Number(it.systemQty) || 0), 0);
  const freshCountedTotal = displayStockItems.reduce((a, it) => a + ((it.countedQty !== null && it.countedQty !== undefined) ? (Number(it.countedQty) || 0) : 0), 0);
  const manualCountedTotal = displayReturnedStockManual.reduce((a, m) => a + (Number(m.count) || 0), 0);
  const totalSystemStock = freshSystemTotal + displayReturnedStockItems.length;
  const totalPhysicalStock = freshCountedTotal + verifiedReturnedCount + manualCountedTotal;
  const allStockChecked = displayStockItems.length > 0 && countedCount === displayStockItems.length && verifiedReturnedCount === displayReturnedStockItems.length;
  const checkedCount = displayDocChecks.filter(c => c.checked).length;
  const myTasks = (rosieTasks || []).filter(t => t.assignedTo === myId && (typeof isRosieTaskDue === "function" ? isRosieTaskDue(t) : !t.doneAt));
  const allTasksForAdmin = [...(rosieTasks || [])].sort((a, b) => (a.assignedTo || "").localeCompare(b.assignedTo || ""));
  const staffName = (id) => { const u = staffAccounts.find(s => s.id === id); return u ? (u.fullName || u.name) : (id || "—"); };

  const today = new Date().toISOString().slice(0, 10);

  const handleCountBlur = async (item, value) => {
    if (value === "") return;
    const counted = Number(value);
    if (Number.isNaN(counted)) return;
    const noChange = counted === item.systemQty && item.countedQty === counted;
    if (noChange) return;
    const delta = counted - item.systemQty;
    if (delta !== 0) {
      const ok = await dbAddInventoryMovement(shopId, item.itemId, "correction", delta, today, null, null, `Saturday stock count by ${myName}`);
      if (!ok) { showAlert("Couldn't apply the stock correction — please check your connection and try again."); return; }
    }
    const updatedItem = { ...item, systemQty: counted, countedQty: counted, countedBy: myName, countedAt: new Date().toISOString(), wasCorrected: item.wasCorrected || delta !== 0 };
    await persist({ ...routine, stockItems: routine.stockItems.map(si => si.itemId === item.itemId ? updatedItem : si) });
  };

  // Physical verification of returned-stock items still "In Office" (see
  // the Returned Stock tab on the Stock page) — a simple found-it toggle
  // per item, same idea as the documentation checklist rather than a
  // quantity count, since each row is a specific customer's return.
  const toggleReturnedStockVerify = async (returnId) => {
    const nextItems = (routine.returnedStockItems || []).map(ri => ri.returnId === returnId
      ? { ...ri, verified: !ri.verified, verifiedBy: !ri.verified ? myName : "", verifiedAt: !ri.verified ? new Date().toISOString() : null }
      : ri);
    await persist({ ...routine, returnedStockItems: nextItems });
  };

  // Extra returned-stock items staff physically find that aren't linked to
  // any specific return record — a free-form item name + count list, kept
  // alongside (not instead of) the per-return checklist above.
  const getManualItems = () => routine.returnedStockManual || [];

  const saveManualItems = (items) => persist({ ...routine, returnedStockManual: items });

  const handleAddManualItem = () => {
    saveManualItems([...getManualItems(), { id: "m-" + Date.now(), item: "", count: "", enteredBy: myName, enteredAt: new Date().toISOString() }]);
  };

  const handleManualItemBlur = (idx, field, rawValue) => {
    const items = [...getManualItems()];
    const cur = items[idx];
    const value = field === "count" ? (rawValue === "" ? "" : Number(rawValue)) : rawValue;
    if (cur[field] === value) return;
    items[idx] = { ...cur, [field]: value };
    saveManualItems(items);
  };

  const handleRemoveManualItem = (idx) => {
    saveManualItems(getManualItems().filter((_, i) => i !== idx));
  };

  const toggleDocCheck = async (key) => {
    const nextChecks = routine.docChecks.map(c => c.key === key
      ? { ...c, checked: !c.checked, checkedBy: !c.checked ? myName : "", checkedAt: !c.checked ? new Date().toISOString() : null }
      : c);
    await persist({ ...routine, docChecks: nextChecks });
  };

  const updateDocNote = async (key, note) => {
    if (note === (routine.docChecks.find(c => c.key === key)?.note || "")) return;
    const nextChecks = routine.docChecks.map(c => c.key === key ? { ...c, note } : c);
    await persist({ ...routine, docChecks: nextChecks });
  };

  const handleDeleteDocCheck = async (check) => {
    const ok = await showConfirm(`Remove this check from this week's list?\n\n"${check.label}"`);
    if (!ok) return;
    await persist({ ...routine, docChecks: routine.docChecks.filter(c => c.key !== check.key) });
  };

  const handleAddDocCheck = async () => {
    const label = newCheckLabel.trim();
    if (!label) { showAlert("Enter what needs to be checked."); return; }
    const key = "custom-" + Date.now();
    const nextChecks = [...routine.docChecks, { key, label, checked: false, checkedBy: "", checkedAt: null, note: "" }];
    setNewCheckLabel("");
    await persist({ ...routine, docChecks: nextChecks });
  };

  // Staff enter WHO they actually find in each category on the Returns &
  // Refunds page (a named list, not just a number) — each entry is saved
  // alongside the live system count at the moment it was entered, so a
  // mismatch (staff found a name the system doesn't show, or vice versa)
  // is visible rather than assumed away. `counted` is derived from the
  // non-blank names and kept for the matched/mismatch comparison.
  const getMetricNames = (metricKey) => (routine.returnsCheck?.[metricKey]?.names) || [];

  const saveMetricNames = async (metricKey, systemValue, names) => {
    const counted = names.filter(n => n && n.trim() !== "").length;
    const nextCheck = { ...(routine.returnsCheck || {}), [metricKey]: { system: systemValue, names, counted, countedBy: myName, countedAt: new Date().toISOString() } };
    await persist({ ...routine, returnsCheck: nextCheck });
  };

  const handleAddMetricName = (metricKey, systemValue) => {
    saveMetricNames(metricKey, systemValue, [...getMetricNames(metricKey), ""]);
  };

  const handleMetricNameBlur = (metricKey, systemValue, idx, value) => {
    const names = [...getMetricNames(metricKey)];
    if (names[idx] === value) return;
    names[idx] = value;
    saveMetricNames(metricKey, systemValue, names);
  };

  const handleRemoveMetricName = (metricKey, systemValue, idx) => {
    saveMetricNames(metricKey, systemValue, getMetricNames(metricKey).filter((_, i) => i !== idx));
  };

  const handleComplete = async () => {
    if (!(await showConfirm("Mark this week's Saturday Routine as complete?"))) return;
    await persist({ ...routine, status: "completed", completedBy: myName, completedAt: new Date().toISOString() });
  };

  const handleReopen = async () => {
    await persist({ ...routine, status: "in_progress", completedBy: "", completedAt: null });
  };

  const handleAddTask = async () => {
    if (!newTask.assignedTo) { showAlert("Choose who this task is for."); return; }
    if (!newTask.message.trim()) { showAlert("Add a short description of the task."); return; }
    if (!onAddTask) return;
    setAddingTask(true);
    await onAddTask({ assignedTo: newTask.assignedTo, message: newTask.message.trim(), recurrence: newTask.recurrence, dueDate: newTask.dueDate, createdBy: myName });
    setAddingTask(false);
    setNewTask({ assignedTo: "", message: "", recurrence: "once", dueDate: "" });
  };

  // Exports whichever week is currently on screen (live current week, or a
  // past week loaded from history) as a printable document — opens a new
  // tab and triggers the browser's print dialog, where "Save as PDF" gives
  // a real PDF file. Same pattern already used for the Returned Stock
  // print/export on the Stock page, so no new dependency is needed and the
  // exported page keeps matching the app's own look.
  const handlePrintRoutine = () => {
    const data = display;
    if (!data) { showAlert("Nothing to export yet."); return; }
    const stockItems = data.stockItems || [];
    const returnedItems = data.returnedStockItems || [];
    const manualItems = data.returnedStockManual || [];
    const docChecks = (data.docChecks && data.docChecks.length) ? data.docChecks : blankDocChecks();
    const returnsCheck = data.returnsCheck || {};

    const freshSystemTotal = stockItems.reduce((a, it) => a + (Number(it.systemQty) || 0), 0);
    const freshCountedTotal = stockItems.reduce((a, it) => a + ((it.countedQty !== null && it.countedQty !== undefined) ? (Number(it.countedQty) || 0) : 0), 0);
    const verifiedCount = returnedItems.filter(ri => ri.verified).length;
    const manualCountedTotal = manualItems.reduce((a, m) => a + (Number(m.count) || 0), 0);
    const totalSystem = freshSystemTotal + returnedItems.length;
    const totalPhysical = freshCountedTotal + verifiedCount + manualCountedTotal;

    const stockRows = stockItems.map(it => `
      <tr>
        <td>${it.itemName || "—"}</td>
        <td>${it.category || "—"}</td>
        <td style="text-align:right">${it.systemQty ?? "—"}</td>
        <td style="text-align:right">${it.countedQty === null || it.countedQty === undefined ? "—" : it.countedQty}</td>
        <td>${it.countedQty === null || it.countedQty === undefined ? "Not counted" : (it.wasCorrected ? "⚠ Corrected" : "✓ Matched")}</td>
      </tr>`).join("");

    const returnedRows = returnedItems.map(ri => `
      <tr>
        <td>${ri.item || "—"}</td>
        <td>${ri.customer || "—"}</td>
        <td>${ri.verified ? "✓ Verified" : "○ Not verified"}</td>
        <td>${ri.verified ? ((ri.verifiedBy || "—") + " · " + fmtDateTime(ri.verifiedAt)) : "—"}</td>
      </tr>`).join("");

    const manualRows = manualItems.map(m => `
      <tr><td>${m.item || "—"}</td><td style="text-align:right">${m.count === "" || m.count === null || m.count === undefined ? "—" : m.count}</td></tr>`).join("");

    const docRows = docChecks.map(c => {
      let extra = "";
      if (c.key === "returns" && returnsCheck && Object.keys(returnsCheck).length) {
        extra = RETURNS_METRIC_META.map(m => {
          const saved = returnsCheck[m.key];
          if (!saved || saved.counted === null || saved.counted === undefined) return "";
          const names = (saved.names || []).filter(Boolean);
          return `<div style="margin-top:4px;font-size:10.5px;color:#334155;"><strong>${m.icon} ${m.label}:</strong> System ${saved.system} · Counted ${saved.counted}${names.length ? " — " + names.map((n, i) => (i + 1) + ". " + n).join(", ") : ""}</div>`;
        }).join("");
      }
      return `
      <tr>
        <td>${c.checked ? "☑" : "☐"} ${c.label}</td>
        <td>${c.checked ? ("✓ " + (c.checkedBy || "—") + " · " + fmtDateTime(c.checkedAt)) : "—"}</td>
        <td>${c.note || "—"}${extra}</td>
      </tr>`;
    }).join("");

    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Weekly Routine — ${shop?.name || shopId} — ${fmtSaturday(data.weekEnding)}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:28px;color:#0f172a;}
        h1{font-size:19px;margin:0 0 2px;} h2{font-size:13px;margin:22px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;}
        p.meta{color:#64748b;font-size:11.5px;margin:0 0 4px;}
        table{width:100%;border-collapse:collapse;margin-top:6px;} th,td{border:1px solid #e2e8f0;padding:6px 8px;font-size:10.5px;text-align:left;vertical-align:top;}
        th{background:#f8fafc;text-transform:uppercase;letter-spacing:0.03em;font-size:9.5px;}
        .totals{display:flex;gap:14px;margin-top:8px;}
        .totalbox{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;}
        .totalbox .lbl{font-size:9.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;}
        .totalbox .val{font-size:15px;font-weight:800;margin-top:2px;}
        .status{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10.5px;font-weight:700;margin-top:4px;}
      </style></head><body>
      <h1>🗓️ Weekly Routine — ${shop?.name || shopId}</h1>
      <p class="meta">Week ending: ${fmtSaturday(data.weekEnding)}</p>
      <span class="status" style="background:${data.status === "completed" ? "#f0fdf4" : "#fffbeb"};color:${data.status === "completed" ? "#166534" : "#92400e"};">
        ${data.status === "completed" ? "✅ Completed by " + (data.completedBy || "—") + " · " + fmtDateTime(data.completedAt) : "⏳ In Progress"}
      </span>
      <p class="meta" style="margin-top:14px;">Generated ${fmtDateTime(new Date().toISOString())}</p>

      <h2>📦 Stock Count</h2>
      <table><thead><tr><th>Item</th><th>Category</th><th>System Qty</th><th>Counted Qty</th><th>Status</th></tr></thead>
      <tbody>${stockRows || '<tr><td colspan="5">No stock items recorded.</td></tr>'}</tbody></table>

      <div class="totals">
        <div class="totalbox"><div class="lbl">Total Stock — As Per System</div><div class="val">${totalSystem}</div></div>
        <div class="totalbox"><div class="lbl">Total Stock — Physical Count</div><div class="val">${totalPhysical}</div></div>
      </div>

      <h2>↩️ Returned Stock</h2>
      <table><thead><tr><th>Item</th><th>Customer</th><th>Verified</th><th>Verified By / At</th></tr></thead>
      <tbody>${returnedRows || '<tr><td colspan="4">No returned-stock items recorded.</td></tr>'}</tbody></table>
      ${manualItems.length ? `<h2 style="font-size:11.5px;">Additional Items Found</h2>
      <table><thead><tr><th>Item</th><th>Count</th></tr></thead><tbody>${manualRows}</tbody></table>` : ""}

      <h2>📋 Documentation Check</h2>
      <table><thead><tr><th>Check</th><th>Checked</th><th>Note / Details</th></tr></thead>
      <tbody>${docRows || '<tr><td colspan="3">No documentation checks recorded.</td></tr>'}</tbody></table>

      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const sectionCard = { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
  const sectionTitle = { margin: "0 0 4px", fontSize: 14.5, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 7 };
  const sectionSub = { margin: "0 0 14px", fontSize: 11.5, color: "#94a3b8" };
  const pastWeeks = historyList.filter(h => h.weekEnding !== weekEnding);

  // The four figures staff verify against the Returns & Refunds page for
  // the "returns up to date" documentation check. `system` is always the
  // live count computed from today's Returns data (never persisted as-is);
  // what IS persisted per week is the list of customer names staff typed
  // in against it.
  const wrMetricSystemValue = { expecting: returnsExpecting, refund: refundsAwaiting, exchange: exchangesAwaiting, confirmation: awaitingConfirmation };
  const wrMetrics = RETURNS_METRIC_META.map(m => ({ ...m, ...RETURNS_METRIC_STYLE[m.key], system: wrMetricSystemValue[m.key] }));

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
            🗓️ Weekly Routine
          </h2>
          <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>{isViewingHistory ? fmtSaturday(viewingWeek) + " (past week — read only)" : fmtSaturday(weekEnding)}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select value={viewingWeek} onChange={e => loadHistoryWeek(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", background: "white", color: "#0f172a" }}>
            <option value="">This week — {fmtSaturday(weekEnding)}</option>
            {pastWeeks.map(h => (
              <option key={h.weekEnding} value={h.weekEnding}>{fmtSaturday(h.weekEnding)}{h.status === "completed" ? " ✓" : ""}</option>
            ))}
          </select>
          <button onClick={handlePrintRoutine} title="Opens a printable version — choose 'Save as PDF' in the print dialog"
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", color: "#334155", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            🖨️ Print / Export PDF
          </button>
          {isAdmin && !isViewingHistory && (
            <button onClick={handleReset}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              ↺ Reset This Week
            </button>
          )}
        </div>
      </div>

      {isViewingHistory ? (
        historyLoading || !historyRoutine ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{historyLoading ? "Loading…" : "No data found for this week."}</div>
        ) : (
          <>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "10px 15px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: "#1e40af" }}>
                👁 Viewing a past week, read-only{isCompleted ? ` · completed by ${display.completedBy} · ${timeAgo(display.completedAt)}` : " · was not marked complete"}.
              </span>
              <button onClick={() => loadHistoryWeek("")} style={{ border: "none", background: "transparent", color: "#1e40af", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>← Back to this week</button>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>📦 Stock Count <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: 11.5 }}>({countedCount} of {displayStockItems.length} counted)</span></h3>
              {displayStockItems.length === 0 ? <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No stock items recorded for this week.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {displayStockItems.map(item => (
                    <div key={item.itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 9, background: "#f8fafc" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.itemName}</div>
                        {item.category && <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{item.category}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>System: <strong style={{ color: "#0f172a" }}>{item.systemQty}</strong></div>
                      <div style={{ fontSize: 11, color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap" }}>Counted: {item.countedQty === null || item.countedQty === undefined ? "—" : item.countedQty}</div>
                      {item.countedQty !== null && item.countedQty !== undefined && (
                        item.wasCorrected ? (
                          <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#fff7ed", color: "#c2410c", whiteSpace: "nowrap" }}>⚠ corrected</span>
                        ) : (
                          <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#f0fdf4", color: "#166534", whiteSpace: "nowrap" }}>✓ matched</span>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Stock Summary bar — the two figures that matter: what
                the system says total stock (Fresh quantities + Returned
                items expected) should be, versus what's actually been
                physically confirmed so far (counts entered + items
                verified). Sits right under Stock Count. */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: -8, marginBottom: 18 }}>
              <div style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 17 }}>🧮</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Stock — As Per System</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{totalSystemStock} <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>({freshSystemTotal} fresh + {displayReturnedStockItems.length} returned)</span></div>
                </div>
              </div>
              <div style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 10, background: allStockChecked ? "#f0fdf4" : "#fffbeb", border: "1px solid " + (allStockChecked ? "#bbf7d0" : "#fde68a"), display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 17 }}>{allStockChecked ? "✅" : "📝"}</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: allStockChecked ? "#166534" : "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Stock — Physical Count</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{totalPhysicalStock} <span style={{ fontWeight: 600, color: allStockChecked ? "#166534" : "#92400e", fontSize: 11 }}>{allStockChecked ? "· fully counted" : `· ${countedCount + verifiedReturnedCount} of ${displayStockItems.length + displayReturnedStockItems.length} checked so far`}</span></div>
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>↩️ Returned Stock <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: 11.5 }}>({verifiedReturnedCount} of {displayReturnedStockItems.length} verified)</span></h3>
              {displayReturnedStockItems.length === 0 ? <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No returned-stock items recorded for this week.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {displayReturnedStockItems.map(ri => (
                    <div key={ri.returnId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 9, background: "#f8fafc" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ri.item}</div>
                        <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{ri.customer}</div>
                      </div>
                      {ri.verified ? (
                        <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#f0fdf4", color: "#166534", whiteSpace: "nowrap" }}>✓ verified</span>
                      ) : (
                        <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#fef2f2", color: "#b91c1c", whiteSpace: "nowrap" }}>○ not verified</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {displayReturnedStockManual.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #e2e8f0" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Additional Items Found
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {displayReturnedStockManual.map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: "#334155" }}>{m.item || "—"}</span>
                        <span style={{ color: "#64748b" }}>Count: <strong style={{ color: "#0f172a" }}>{m.count === "" || m.count === null || m.count === undefined ? "—" : m.count}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>📋 Documentation Check <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: 11.5 }}>({checkedCount} of {displayDocChecks.length})</span></h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displayDocChecks.map(c => (
                  <div key={c.key} style={{ padding: "9px 11px", borderRadius: 9, background: c.checked ? "#f0fdf4" : "#f8fafc", border: "1px solid " + (c.checked ? "#bbf7d0" : "#f1f5f9") }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                      <span style={{ fontSize: 14, marginTop: -1 }}>{c.checked ? "☑" : "☐"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: "#0f172a", fontWeight: c.checked ? 700 : 500 }}>{c.label}</div>
                        {c.checked && <div style={{ fontSize: 10.5, color: "#166534", marginTop: 2 }}>✓ {c.checkedBy} · {timeAgo(c.checkedAt)}</div>}
                        {c.note && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>"{c.note}"</div>}
                      </div>
                    </div>
                    {c.key === "returns" && display?.returnsCheck && Object.keys(display.returnsCheck).length > 0 && (
                      <div style={{ marginTop: 8, marginLeft: 24, display: "flex", flexDirection: "column", gap: 7 }}>
                        {RETURNS_METRIC_META.map(m => {
                          const saved = display.returnsCheck[m.key];
                          if (!saved || saved.counted === null || saved.counted === undefined) return null;
                          const names = saved.names || [];
                          return (
                            <div key={m.key} style={{ fontSize: 11 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: "#334155" }}>{m.icon} {m.label}</span>
                                <span style={{ color: "#64748b" }}>System: <strong style={{ color: "#0f172a" }}>{saved.system}</strong></span>
                                <span style={{ color: "#64748b" }}>Counted: <strong style={{ color: "#0f172a" }}>{saved.counted}</strong></span>
                                {saved.counted === saved.system ? (
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#f0fdf4", color: "#166534" }}>✓</span>
                                ) : (
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#fff7ed", color: "#c2410c" }}>⚠</span>
                                )}
                              </div>
                              {names.length > 0 && (
                                <div style={{ marginTop: 3, marginLeft: 2, fontSize: 10.5, color: "#475569" }}>
                                  {names.map((n, i) => (i + 1) + ". " + (n && n.trim() ? n : "—")).join("   ")}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "#94a3b8", textAlign: "center", marginBottom: 30 }}>
              Work-assigned tasks aren't tracked per week — see Rosie Tasks for current assignments.
            </div>
          </>
        )
      ) : (
        <>
          {isCompleted && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 15px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>✅ This week's routine was completed by {routine.completedBy} · {timeAgo(routine.completedAt)}</span>
              <button onClick={handleReopen} style={{ border: "none", background: "transparent", color: "#166534", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>↺ Reopen</button>
            </div>
          )}

          {/* ── 1. Stock Count ── */}
          <div style={sectionCard}>
            <h3 style={sectionTitle}>📦 Stock Count <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: 11.5 }}>({countedCount} of {routine.stockItems.length} counted)</span></h3>
            <p style={sectionSub}>Count every item and enter what's physically on the shelf. Anything different from the system quantity is corrected automatically.</p>
            {routine.stockItems.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No stock items found for this shop yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {routine.stockItems.map(item => (
                  <div key={item.itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 9, background: "#f8fafc" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.itemName}</div>
                      {item.category && <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{item.category}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>System: <strong style={{ color: "#0f172a" }}>{item.systemQty}</strong></div>
                    <input type="number" defaultValue={item.countedQty ?? ""} placeholder="Count"
                      onBlur={e => handleCountBlur(item, e.target.value)}
                      style={{ width: 64, padding: "5px 7px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", textAlign: "right", boxSizing: "border-box" }} />
                    {item.countedQty !== null && (
                      item.wasCorrected ? (
                        <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#fff7ed", color: "#c2410c", whiteSpace: "nowrap" }}>⚠ corrected</span>
                      ) : (
                        <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "#f0fdf4", color: "#166534", whiteSpace: "nowrap" }}>✓ matched</span>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Stock Summary bar — the two figures that matter: what the
              system says total stock (Fresh quantities + Returned items
              expected) should be, versus what's actually been physically
              confirmed so far (counts entered + items verified). `display`
              equals `routine` here (we're not viewing history), so the same
              totals computed above apply directly. */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: -8, marginBottom: 18 }}>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 17 }}>🧮</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Stock — As Per System</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{totalSystemStock} <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>({freshSystemTotal} fresh + {(routine.returnedStockItems || []).length} returned)</span></div>
              </div>
            </div>
            <div style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 10, background: allStockChecked ? "#f0fdf4" : "#fffbeb", border: "1px solid " + (allStockChecked ? "#bbf7d0" : "#fde68a"), display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 17 }}>{allStockChecked ? "✅" : "📝"}</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: allStockChecked ? "#166534" : "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Stock — Physical Count</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{totalPhysicalStock} <span style={{ fontWeight: 600, color: allStockChecked ? "#166534" : "#92400e", fontSize: 11 }}>{allStockChecked ? "· fully counted" : `· ${countedCount + verifiedReturnedCount} of ${routine.stockItems.length + (routine.returnedStockItems || []).length} checked so far`}</span></div>
              </div>
            </div>
          </div>

          {/* ── 1b. Returned Stock (physical verification) ── */}
          <div style={sectionCard}>
            <h3 style={sectionTitle}>↩️ Returned Stock <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: 11.5 }}>({verifiedReturnedCount} of {(routine.returnedStockItems || []).length} verified)</span></h3>
            <p style={sectionSub}>Physically confirm every returned item still marked "In Office" on the Stock page's Returned Stock tab is actually there.</p>
            {(routine.returnedStockItems || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Nothing to verify — no returned items are currently marked "In Office".</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {routine.returnedStockItems.map(ri => (
                  <div key={ri.returnId} style={{ padding: "7px 10px", borderRadius: 9, background: ri.verified ? "#f0fdf4" : "#f8fafc", border: "1px solid " + (ri.verified ? "#bbf7d0" : "#f1f5f9") }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={!!ri.verified} onChange={() => toggleReturnedStockVerify(ri.returnId)}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: shop?.accent || "#059669", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ri.item}</div>
                        <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{ri.customer}</div>
                      </div>
                      {ri.verified && <div style={{ fontSize: 10, color: "#166534", whiteSpace: "nowrap" }}>✓ {ri.verifiedBy} · {timeAgo(ri.verifiedAt)}</div>}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Extra items staff physically find that aren't linked to a
                specific return — a free-form item + count list, separate
                from the checklist above rather than replacing it. */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #e2e8f0" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Additional Items Found (not linked to a specific return)
              </div>
              {(routine.returnedStockManual || []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {routine.returnedStockManual.map((m, idx) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input defaultValue={m.item} placeholder="Item name"
                        onBlur={e => handleManualItemBlur(idx, "item", e.target.value)}
                        style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                      <input type="number" defaultValue={m.count === "" || m.count === null || m.count === undefined ? "" : m.count} placeholder="Count"
                        onBlur={e => handleManualItemBlur(idx, "count", e.target.value)}
                        style={{ width: 70, padding: "6px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", textAlign: "right", boxSizing: "border-box" }} />
                      <button onClick={() => handleRemoveManualItem(idx)} title="Remove this item"
                        style={{ border: "none", background: "transparent", color: "#b91c1c", fontSize: 13, cursor: "pointer", padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleAddManualItem}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px dashed #cbd5e1", background: "white", color: "#475569", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                + Add Item
              </button>
            </div>
          </div>

          {/* ── 2. Documentation Check ── */}
          <div style={sectionCard}>
            <h3 style={sectionTitle}>📋 Documentation Check <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: 11.5 }}>({checkedCount} of {routine.docChecks.length})</span></h3>
            <p style={sectionSub}>A quick weekly sanity check — tick each one off, add a note if something needs follow-up.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {routine.docChecks.map(c => (
                <div key={c.key} style={{ padding: "9px 11px", borderRadius: 9, background: c.checked ? "#f0fdf4" : "#f8fafc", border: "1px solid " + (c.checked ? "#bbf7d0" : "#f1f5f9") }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer", flex: 1, minWidth: 0 }}>
                      <input type="checkbox" checked={c.checked} onChange={() => toggleDocCheck(c.key)} style={{ width: 15, height: 15, marginTop: 2, cursor: "pointer", accentColor: shop?.accent || "#059669", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: "#0f172a", fontWeight: c.checked ? 700 : 500 }}>{c.label}</div>
                        {c.checked && <div style={{ fontSize: 10.5, color: "#166534", marginTop: 2 }}>✓ {c.checkedBy} · {timeAgo(c.checkedAt)}</div>}
                      </div>
                    </label>
                    {isAdmin && (
                      <button onClick={() => handleDeleteDocCheck(c)} title="Remove this check"
                        style={{ border: "none", background: "transparent", color: "#b91c1c", fontSize: 13, cursor: "pointer", padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}>
                        🗑
                      </button>
                    )}
                  </div>
                  {c.key === "returns" && (
                    <div style={{ marginTop: 8, marginLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>Check the Returns &amp; Refunds page and list the customers in each category:</div>
                      {wrMetrics.map(m => {
                        const saved = routine.returnsCheck?.[m.key];
                        const names = saved?.names || [];
                        const hasEntry = saved && saved.counted !== null && saved.counted !== undefined;
                        return (
                          <div key={m.key} style={{ padding: "7px 8px", borderRadius: 8, background: m.bg, border: "1px solid " + m.border }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: m.color, flex: 1, minWidth: 0 }}>{m.icon} {m.label}</span>
                              <span style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>System: <strong style={{ color: "#0f172a" }}>{m.system}</strong></span>
                              {hasEntry && (
                                saved.counted === saved.system ? (
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#f0fdf4", color: "#166534", whiteSpace: "nowrap" }}>✓ {saved.counted} matched</span>
                                ) : (
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#fff7ed", color: "#c2410c", whiteSpace: "nowrap" }}>⚠ {saved.counted} vs {saved.system}</span>
                                )
                              )}
                            </div>
                            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                              {names.map((n, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 10.5, color: "#94a3b8", width: 16, textAlign: "right", flexShrink: 0 }}>{idx + 1}.</span>
                                  <input defaultValue={n} placeholder="Customer name"
                                    onBlur={e => handleMetricNameBlur(m.key, m.system, idx, e.target.value)}
                                    style={{ flex: 1, minWidth: 0, padding: "4px 7px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11.5, fontFamily: "inherit", boxSizing: "border-box", background: "white" }} />
                                  <button onClick={() => handleRemoveMetricName(m.key, m.system, idx)} title="Remove this name"
                                    style={{ border: "none", background: "transparent", color: "#b91c1c", fontSize: 12, cursor: "pointer", padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}>✕</button>
                                </div>
                              ))}
                              <button onClick={() => handleAddMetricName(m.key, m.system)}
                                style={{ alignSelf: "flex-start", marginTop: 2, padding: "3px 9px", borderRadius: 6, border: "1px dashed " + m.border, background: "white", color: m.color, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                + Add Name
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <input defaultValue={c.note || ""} placeholder="Note (optional)…" onBlur={e => updateDocNote(c.key, e.target.value)}
                    style={{ marginTop: 6, marginLeft: 24, width: "calc(100% - 24px)", padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 11.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>

            {isAdmin && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #e2e8f0", display: "flex", gap: 8 }}>
                <input value={newCheckLabel} onChange={e => setNewCheckLabel(e.target.value)} placeholder="Add a check for this week…"
                  onKeyDown={e => { if (e.key === "Enter") handleAddDocCheck(); }}
                  style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                <button onClick={handleAddDocCheck}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: shop?.accent || "#059669", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  + Add Check
                </button>
              </div>
            )}
          </div>

          {/* ── 3. Work Assigned (live from Rosie Tasks) ── */}
          <div style={sectionCard}>
            <h3 style={sectionTitle}>🧾 Work Assigned to You This Week</h3>
            <p style={sectionSub}>Pulled live from your tasks — mark them done here or from Rosie.</p>
            {myTasks.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Nothing outstanding — you're all caught up.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myTasks.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 11px", borderRadius: 9, background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: "#0f172a", fontWeight: 700 }}>{t.message}</div>
                      <div style={{ fontSize: 10.5, color: "#92400e", marginTop: 2 }}>{t.recurrence !== "once" ? t.recurrence + " · " : ""}{t.dueDate ? "due " + t.dueDate : ""}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button onClick={async () => { if (onMarkTaskDone) await onMarkTaskDone(t); }}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#f59e0b", color: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        ✓ Mark Done
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDeleteTask(t)} title="Delete this task"
                          style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div style={{ marginTop: myTasks.length ? 14 : 0, paddingTop: myTasks.length ? 14 : 0, borderTop: myTasks.length ? "1px dashed #e2e8f0" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Assign a New Task</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    style={{ flex: "1 1 140px", padding: "7px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", background: "white", color: newTask.assignedTo ? "#0f172a" : "#94a3b8" }}>
                    <option value="">Assign to…</option>
                    {staffAccounts.map(u => (<option key={u.id} value={u.id}>{u.fullName || u.name}</option>))}
                  </select>
                  <select value={newTask.recurrence} onChange={e => setNewTask({ ...newTask, recurrence: e.target.value })}
                    style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", background: "white" }}>
                    <option value="once">One-off</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                    style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newTask.message} onChange={e => setNewTask({ ...newTask, message: e.target.value })} placeholder="What needs doing…"
                    style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                  <button onClick={handleAddTask} disabled={addingTask}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: shop?.accent || "#059669", color: "white", fontSize: 12, fontWeight: 700, cursor: addingTask ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: addingTask ? 0.6 : 1 }}>
                    {addingTask ? "Adding…" : "+ Add Task"}
                  </button>
                </div>

                {allTasksForAdmin.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #e2e8f0" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Manage All Tasks ({allTasksForAdmin.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                      {allTasksForAdmin.map(t => {
                        const due = typeof isRosieTaskDue === "function" ? isRosieTaskDue(t) : !t.doneAt;
                        return (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "7px 10px", borderRadius: 8, background: "#f8fafc" }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.message}</div>
                              <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>
                                {staffName(t.assignedTo)} · {t.recurrence !== "once" ? t.recurrence : "one-off"}{t.dueDate ? " · due " + t.dueDate : ""} · {due ? "pending" : "done"}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteTask(t)}
                              style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                              🗑 Delete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isCompleted && (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginBottom: 30 }}>
              {saving && <span style={{ fontSize: 11, color: "#94a3b8" }}>Saving…</span>}
              <button onClick={handleComplete}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: shop?.accent || "#059669", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                ✓ Mark This Week's Routine Complete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
