import { useState, useMemo, useRef, useEffect as useEff } from "react";
import { formatDate } from "../utils";
/* ─────────────────────────────────────────────────────────────────────────
   SALES PANEL
   Period definitions:
     day      → today only
     week     → Monday–Sunday of current ISO week
     month    → 1st–last of current calendar month
     year     → Financial Year: 1 April → 31 March
     lifetime → all records
   ───────────────────────────────────────────────────────────────────────── */

/* ── localISO: Date → "YYYY-MM-DD" using LOCAL date parts (no UTC shift) ── */
function localISO(dt) {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d  = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/* ── safeParseDate: any date string → local JS Date, never shifts timezone ─
   Handles: YYYY-MM-DD (Supabase ISO), DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY,
            DD-MM-YY. Always uses new Date(y,m,d) local constructor. ────── */
function safeParseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let mo;
  // YYYY-MM-DD  (ISO from Supabase / new sale form)
  mo = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mo) return new Date(+mo[1], +mo[2] - 1, +mo[3]);
  // DD/MM/YYYY or DD-MM-YYYY  (UK 4-digit year)
  mo = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mo) return new Date(+mo[3], +mo[2] - 1, +mo[1]);
  // DD/MM/YY with SLASH — manual UK entry format (DD first)
  mo = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mo) { const y = +mo[3]; return new Date(y < 50 ? 2000 + y : 1900 + y, +mo[2] - 1, +mo[1]); }
  // MM-DD-YY with HYPHEN — imported spreadsheet format (MM first)
  mo = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (mo) { const y = +mo[3]; return new Date(y < 50 ? 2000 + y : 1900 + y, +mo[1] - 1, +mo[2]); }
  return null;
}

/* ── toSortableDate: any date → "YYYY-MM-DD" for string comparison ──────── */
function toSortableDate(raw) {
  const dt = safeParseDate(raw);
  if (!dt || isNaN(dt.getTime())) return "0000-00-00";
  return localISO(dt);
}

/* ── fmtDate: any date → "DD/MM/YY" for display ────────────────────────── */
function fmtDate(raw) {
  if (!raw) return "—";
  const dt = safeParseDate(raw);
  if (!dt || isNaN(dt.getTime())) return String(raw);
  const d  = String(dt.getDate()).padStart(2, "0");
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const y  = String(dt.getFullYear()).slice(-2);
  return `${d}/${mo}/${y}`;
}

/* ── fmtDateForSale: like fmtDate but corrects year using invoice suffix ───
   If the stored date year conflicts with the FY implied by the invoice
   suffix, derive the correct year from the suffix instead.
   e.g. date="2026-04-12", id="ROS24356" (suffix=6 → FY25-26 → year 2025)
   → displays "12/04/25" not "12/04/26"                                   ── */
function fmtDateForSale(sale) {
  if (!sale) return "—";
  const raw = sale.date;
  const dt = safeParseDate(raw);
  if (!dt || isNaN(dt.getTime())) return raw ? String(raw) : "—";

  const id = String(sale.id || "");
  const rosMatch = id.match(/^[A-Z]{2,3}(\d{4})(\d)$/);
  if (rosMatch) {
    const suffix = +rosMatch[2];
    const nowYear = new Date().getFullYear();
    const decade  = Math.floor(nowYear / 10) * 10;
    let fyEndYear = decade + suffix;
    if (fyEndYear - nowYear > 5) fyEndYear -= 10;
    if (nowYear - fyEndYear > 5) fyEndYear += 10;
    const fyStartYr = fyEndYear - 1; // e.g. 2026 for FY25-26

    // The date month/day are likely correct; only fix the year
    // A sale in FY fyStartYr-fyEndYear should have year = fyStartYr (Apr-Dec)
    // or fyEndYear (Jan-Mar)
    const storedMonth = dt.getMonth(); // 0-indexed
    const correctYear = storedMonth >= 3 ? fyStartYr : fyEndYear;
    const storedYear  = dt.getFullYear();

    if (storedYear !== correctYear) {
      // Year is wrong — display with corrected year
      const d  = String(dt.getDate()).padStart(2, "0");
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const y  = String(correctYear).slice(-2);
      return `${d}/${mo}/${y}`;
    }
  }
  // No correction needed — display as stored
  const d  = String(dt.getDate()).padStart(2, "0");
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const y  = String(dt.getFullYear()).slice(-2);
  return `${d}/${mo}/${y}`;
}

function getPeriodRange(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (period) {
    case "day":
      return { start: localISO(now), end: localISO(now) };
    case "week": {
      const dow  = now.getDay();                      // 0=Sun … 6=Sat
      const diff = dow === 0 ? -6 : 1 - dow;          // offset to Monday
      return {
        start: localISO(new Date(y, m, d + diff)),
        end:   localISO(new Date(y, m, d + diff + 6)),
      };
    }
    case "month":
      return {
        start: localISO(new Date(y, m, 1)),
        end:   localISO(new Date(y, m + 1, 0)),
      };
    case "year": {
      // UK Financial Year: 1 April → 31 March
      // If we're in Jan-Mar, FY started previous calendar year
      const fy = m < 3 ? y - 1 : y;
      return { start: `${fy}-04-01`, end: `${fy + 1}-03-31` };
    }
    default: return { start: null, end: null };   // lifetime
  }
}

function filterByPeriod(sales, period) {
  if (period === "lifetime") return sales;

  if (period === "year") {
    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth(); // 0-indexed
    // Current FY: Apr 1 YYYY → Mar 31 (YYYY+1)
    // If Jan/Feb/Mar → FY started previous year
    const fyStartYr = nowM < 3 ? nowY - 1 : nowY;
    const fyEndYear  = fyStartYr + 1;
    const fySuffix   = String(fyEndYear).slice(-1); // e.g. "7" for 2026-27

    const fyStart = new Date(fyStartYr, 3, 1);  // Apr 1 of start year
    const fyEnd   = new Date(fyEndYear, 2, 31); // Mar 31 of end year

    return sales.filter(s => {
      const id = String(s.id || "");
      // ROS pattern: 3 letters + 4 digits + 1 suffix digit
      const rosMatch = id.match(/^[A-Z]{2,3}(\d{4})(\d)$/);
      if (rosMatch) {
        // Suffix digit is ground truth for FY
        return rosMatch[2] === fySuffix;
      }
      // For non-ROS IDs (imported, SI-, SH-, IN-): use date
      const dt = safeParseDate(s.date);
      if (!dt || isNaN(dt.getTime())) return false;
      const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      return d >= fyStart && d <= fyEnd;
    });
  }

  const { start, end } = getPeriodRange(period);
  if (!start || !end) return sales;

  // For month/week/day: use date comparison BUT also cross-check with invoice
  // suffix to reject sales whose date year is wrong (common with old imported data).
  // A sale belongs to the current period only if BOTH conditions hold:
  // 1. Its parsed date falls within start..end
  // 2. Its FY suffix (if present) is consistent with the period's year
  const periodYear = new Date(start).getFullYear();
  const periodFYSuffix = String(periodYear + (new Date(start).getMonth() >= 3 ? 1 : 0)).slice(-1);

  return sales.filter(s => {
    const dt = toSortableDate(s.date);
    if (dt < start || dt > end) return false;
    // Extra check: if sale has ROS invoice suffix, ensure it matches the period's FY
    if (period === "month" || period === "week" || period === "day") {
      const id = String(s.id || "");
      const rosMatch = id.match(/^[A-Z]{2,3}(\d{4})(\d)$/);
      if (rosMatch && rosMatch[2] !== periodFYSuffix) return false;
    }
    return true;
  });
}

/* ── Date / separator helpers ───────────────────────────────────────────── */

function monthKey(dateStr) {
  const d = safeParseDate(dateStr);
  if (!d || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(dateStr) {
  const d = safeParseDate(dateStr);
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}
function fyStartYear(dateStrOrSale) {
  const id = dateStrOrSale && typeof dateStrOrSale === "object" ? dateStrOrSale.id : null;
  const dateStr = dateStrOrSale && typeof dateStrOrSale === "object" ? dateStrOrSale.date : dateStrOrSale;

  // Use invoice suffix as ground truth when available
  if (id) {
    const rosMatch = String(id).match(/^[A-Z]{2,3}(\d{4})(\d)$/);
    if (rosMatch) {
      const suffix = +rosMatch[2];
      // suffix = last digit of FY end year
      // Work out full end year relative to current year
      const nowYear = new Date().getFullYear();
      const decade  = Math.floor(nowYear / 10) * 10;
      let endYear = decade + suffix;
      if (endYear - nowYear > 5) endYear -= 10;
      if (nowYear - endYear > 5) endYear += 10;
      return endYear - 1; // FY start year
    }
  }
  // Fallback: derive from date
  const d = safeParseDate(dateStr);
  if (!d || isNaN(d.getTime())) return null;
  return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
}
function fyLabel(startYear) {
  if (startYear === null || isNaN(startYear)) return "";
  return `FY ${startYear}–${String(startYear + 1).slice(-2)}`;
}

function buildRowsWithSeparators(sortedRows, showFY = true, showMonth = true) {
  const result = [];
  // Always show summary footer; showMonth/showFY control separator dividers only
  const makeSummary = (rows, monthK, label) => {
    const count  = rows.length;
    const qty    = rows.reduce((a,s)=>a+(Number(s.qty)||1),0);
    const amount = rows.reduce((a,s)=>a+(Number(s.amount)||0),0);
    // Refund = adjAmt (adjustment/discount) + refundAmt (explicit refund) - use whichever is set
    const refund = rows.reduce((a,s)=>a+Math.max(Number(s.adjAmt)||0, Number(s.refundAmt)||0),0);
    const net    = amount - refund;
    return { _type:"monthSummary", _monthKey:monthK, _label:label, count, qty, amount, refund, net };
  };

  let monthBatch = [];
  let curMK = sortedRows.length > 0 ? monthKey(sortedRows[0].date) : null;
  let curMLabel = sortedRows.length > 0 ? monthLabel(sortedRows[0].date) : "";

  for (let i = 0; i < sortedRows.length; i++) {
    const curr = sortedRows[i];
    const prev = sortedRows[i - 1];
    if (prev) {
      const prevFY = fyStartYear(prev);
      const currFY = fyStartYear(curr);
      const prevMK = monthKey(prev.date);
      const currMK2 = monthKey(curr.date);
      if (showFY && prevFY !== currFY) {
        // Always inject summary before FY break
        if (monthBatch.length > 0)
          result.push(makeSummary(monthBatch, curMK, curMLabel));
        monthBatch = [];
        result.push({ _type: "fy", _fyStart: currFY, _label: fyLabel(currFY) });
      }
      if (prevMK !== currMK2) {
        // Always inject summary at month boundary
        if (monthBatch.length > 0)
          result.push(makeSummary(monthBatch, curMK, curMLabel));
        monthBatch = [];
        curMK = currMK2;
        curMLabel = monthLabel(curr.date);
        // Only show visual separator if showMonth is true
        if (showMonth)
          result.push({ _type: "month", _monthKey: currMK2, _label: monthLabel(curr.date) });
      }
    }
    monthBatch.push(curr);
    result.push(curr);
  }
  // Always inject summary for last/only batch
  if (monthBatch.length > 0)
    result.push(makeSummary(monthBatch, curMK, curMLabel));
  return result;
}

/* ── Constants ──────────────────────────────────────────────────────────── */
const PERIOD_META = {
  day:      { label: "Day",      desc: "Today" },
  week:     { label: "Week",     desc: "Mon–Sun" },
  month:    { label: "Month",    desc: "This Month" },
  year:     { label: "Year",     desc: "Financial Year" },
  lifetime: { label: "Lifetime", desc: "All Time" },
};

const STATUS_TABS = [
  { key: "ALL",           label: "All",           color: "#475569", bg: "#f1f5f9" },
  { key: "PENDING",       label: "Pending",        color: "#d97706", bg: "#fef3c7" },
  { key: "FULFILLED",     label: "Fulfilled",      color: "#059669", bg: "#d1fae5" },
  { key: "GOOD FEEDBACK", label: "Good Feedback",  color: "#0d9488", bg: "#ccfbf1" },
  { key: "RTRN REQSTD",   label: "Rtrn Reqstd",    color: "#c2410c", bg: "#ffedd5" },
  { key: "RETRN RCVD",    label: "Retrn Rcvd",     color: "#991b1b", bg: "#fee2e2" },
  { key: "EXCHANGED",     label: "Exchanged",      color: "#4338ca", bg: "#e0e7ff" },
  { key: "REFUNDED",      label: "Refunded",       color: "#7e22ce", bg: "#f3e8ff" },
];

/* ── WaModal: shown before every WhatsApp send, mirrors the one in
   App.jsx (files don't share components). Lets staff copy the message
   (for pasting into the right device/chat manually) or open WhatsApp
   directly. ────────────────────────────────────────────────────────── */
const WaModal = ({ data, onClose }) => {
  if (!data) return null;
  const { phone, customerName, message } = data;
  const clean = (phone || "").replace(/\D/g, "");
  const e164 = clean.startsWith("0") ? "44" + clean.slice(1) : clean;
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(message); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = message; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    onClose();
  };
  const handleOpen = () => {
    window.open("https://wa.me/" + e164 + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
    onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "22px 24px", maxWidth: 460, width: "92%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>💬 Send WhatsApp Message</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{customerName || "Customer"}</div>
          <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>📱 {phone || "No phone on file"}</div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</div>
        <div style={{ flex: 1, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 13, color: "#374151", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 16, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCopy}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            📋 Copy Message
          </button>
          <button onClick={handleOpen}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#25D366", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            📱 Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

const STATUS_ROW_BG = {
  "PENDING":       "#fffbeb",
  "FULFILLED":     "#f0fdf4",
  "GOOD FEEDBACK": "#ecfdf5",
  "RTRN REQSTD":   "#fff7ed",
  "RETRN RCVD":    "#fef2f2",
  "EXCHANGED":     "#eef2ff",
  "REFUNDED":      "#faf5ff",
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function SalesPanel({
  Badge,
  customers,
  filtSales,
  fmt,
  formatDate,
  onReload,
  openMenu,
  search,
  sales,
  salesPeriod,
  setEditRow,
  setInvoiceRow,
  setModal,
  setExportRows,
  externalFlashIds,
  setOpenMenu,
  setSalesData,
  setSearch,
  setSelCustomer,
  setSelRow,
  setSalesPeriod,
  shop,
  shopId,
  TD,
  user,
  isStaff,
  isSuperadmin,
  statusFilter,
  setStatusFilter,
  statusTabs,
  statusRowBg: statusRowBgProp,
  onSaveTracking,
  onMarkDelivered,
  onInlineEdit,
  onMarkDeliveryInformed,
}) {
  const [hovR,    setHovR]    = useState(null);
  /* Drag-to-reorder (month view only) */
  const [dragId, setDragId] = useState(null);
  const [waModal, setWaModal] = useState(null); // {phone,customerName,message} | null
  /* Status cascade across instalment groups (Advance/Part/Final payment) */
  const [cascadeConfirm, setCascadeConfirm] = useState(null); // {saleId, newStatus, groupIds} | null
  const [flashIds, setFlashIds] = useState(new Set());
  const [linkedGroupView, setLinkedGroupView] = useState(null); // array of sales in the group | null
  const [manualLinkSale, setManualLinkSale] = useState(null); // sale being manually linked | null
  const [manualLinkQuery, setManualLinkQuery] = useState("");
  const [dragOverId, setDragOverId] = useState(null);
  const handleReorderDrop = async (targetId) => {
    const fromId = dragId;
    setDragId(null); setDragOverId(null);
    if (!fromId || fromId === targetId || !onInlineEdit) return;
    const list = [...sortedSales];
    const fromIdx = list.findIndex(x => x.id === fromId);
    const toIdx = list.findIndex(x => x.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    await Promise.all(list.map((sale, idx) => onInlineEdit(sale.id, { sortpos: idx + 1 })));
  };
  const [hovCard, setHovCard] = useState(null);
  const [hovTab,  setHovTab]  = useState(null);
  const [reloading, setReloading] = useState(false);
  const [editTrackingId, setEditTrackingId] = useState(null);
  const [trackingInput,  setTrackingInput]  = useState("");
  const [editCarrierId,  setEditCarrierId]  = useState(null); // saleId being shown carrier dropdown
  const [editAmountId,   setEditAmountId]   = useState(null);
  const [amountInput,    setAmountInput]    = useState("");
  const [editStatusId,   setEditStatusId]   = useState(null);
  const [showReport,     setShowReport]     = useState(false);
  const [showColMenu,    setShowColMenu]    = useState(false);

  // ROS India: staff sessions receive shopId "ros-india-staff", so match both
  const isIndiaShop = shopId === "ros-india" || shopId === "ros-india-staff";

  // Column visibility — persisted in localStorage globally
  const COL_DEFAULTS = {
    "Invoice":true,"Date":true,"Customer":true,"Item":true,
    "Amount":true,"Verified":true,"Refund":false,"Payment":true,"Status":true,
    "Tags":false,"Pur. Amount":true,"Tracking":true,
    "Delivered":true,"Informed":false,"From":true,"Actions":true,
  };
  const [colVis, setColVis] = useState(() => {
    try {
      const saved = localStorage.getItem("ros_col_vis");
      return saved ? {...COL_DEFAULTS,...JSON.parse(saved)} : COL_DEFAULTS;
    } catch { return COL_DEFAULTS; }
  });
  const toggleCol = (col) => {
    setColVis(prev => {
      const next = {...prev, [col]: !prev[col]};
      try { localStorage.setItem("ros_col_vis", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const showCol = (col) => colVis[col] !== false;
  const [rptStatuses,    setRptStatuses]    = useState(null); // null = use defaults
  const [crossOnly,      setCrossOnly]      = useState(false);
  const [rptUnit,        setRptUnit]        = useState("ALL"); // ALL / India-Unit1 / India-Unit2

  // Close column menu on outside click
  useEff(() => {
    if (!showColMenu) return;
    const handler = () => setShowColMenu(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [showColMenu]);
  /* Month picker state */
  const [pickedMonth, setPickedMonth] = useState(null);   // "YYYY-MM" or null
  /* Drag-to-reorder only makes sense when viewing a single month —
     either the default "Month" tab (current month) or an explicitly
     picked past month via the date picker. */
  const reorderEnabled = isSuperadmin && (!!pickedMonth || salesPeriod === "month");
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [pickerYear,  setPickerYear]  = useState(() => {
    // Default to FY start year — most historical sales live there
    const now = new Date();
    return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  });
  const pickerRef = useRef(null);
  /* Use prop-driven status tab if provided, else fall back to local state */
  const [statusTabLocal, setStatusTabLocal] = useState("ALL");
  const statusTab    = statusFilter    ?? statusTabLocal;
  const setStatusTab = setStatusFilter ?? setStatusTabLocal;
  /* Recheck flag filter — independent of fulfilment status tabs */
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const accent   = shop?.accent   || "#059669";
  const accentBg = shop?.accentBg || "#ecfdf5";

  /* ── Close picker when clicking outside ─────────────────────────────── */
  useEff(() => {
    if (!pickerOpen) return;
    const handler = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  /* ── Effective period: pickedMonth overrides salesPeriod ─────────────── */
  const effectivePeriod = pickedMonth ? "picked" : salesPeriod;

  /* ── Filter for picked month (YYYY-MM) ───────────────────────────────── */
  const filterByPickedMonth = (arr, ym) => {
    if (!ym) return arr;
    const [py, pm] = ym.split("-").map(Number);
    // FY suffix for the picked month's year
    const pickedFYSuffix = String(py + (pm >= 4 ? 1 : 0)).slice(-1);
    return arr.filter(s => {
      const dt = safeParseDate(s.date);
      if (!dt || isNaN(dt.getTime())) return false;
      // Date must match year+month
      if (dt.getFullYear() !== py || (dt.getMonth() + 1) !== pm) return false;
      // Cross-check invoice suffix to reject wrong-year sales
      const id = String(s.id || "");
      const rosMatch = id.match(/^[A-Z]{2,3}(\d{4})(\d)$/);
      if (rosMatch && rosMatch[2] !== pickedFYSuffix) return false;
      return true;
    });
  };

  /* ── Set of YYYY-MM strings that have at least one sale (for picker highlights) */
  const salesMonthSet = useMemo(() => {
    const s = new Set();
    sales.forEach(sale => {
      const dt = safeParseDate(sale.date);
      if (dt && !isNaN(dt.getTime())) {
        s.add(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`);
      }
    });
    return s;
  }, [sales]);

  /* ── Years that have sales (for the picker year nav) */
  const salesYears = useMemo(() => {
    const ys = new Set();
    sales.forEach(sale => {
      const dt = safeParseDate(sale.date);
      if (dt && !isNaN(dt.getTime())) ys.add(dt.getFullYear());
    });
    return [...ys].sort((a,b) => b - a); // descending
  }, [sales]);
  // KPI cards: filter from ALL sales (not search/status filtered)
  const periodSales = useMemo(
    () => pickedMonth ? filterByPickedMonth(sales, pickedMonth) : filterByPeriod(sales, salesPeriod),
    [sales, salesPeriod, pickedMonth]
  );
  // Table rows: filter from search+status filtered sales
  const periodFiltSales = useMemo(
    () => pickedMonth ? filterByPickedMonth(filtSales, pickedMonth) : filterByPeriod(filtSales, salesPeriod),
    [filtSales, salesPeriod, pickedMonth]
  );

  /* ── Build per-FY breakdown from periodSales ─────────────────────────── */
  const fyGroups = useMemo(() => {
    const groups = {};
    periodSales.forEach(s => {
      const fy = fyStartYear(s) ?? "other";
      if (!groups[fy]) groups[fy] = [];
      groups[fy].push(s);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([fyStart, rows]) => {
        const fyS = Number(fyStart);
        const rev = rows.reduce((a, s) => a + (Number(s.amount) || 0) - (Number(s.adjAmt) || 0), 0);
        const qty = rows.reduce((a, s) => a + (Number(s.qty)    || 1), 0);
        const avg = rows.length > 0 ? Math.round(rev / rows.length) : 0;
        return {
          fyStart: fyS,
          label: isNaN(fyS) ? "Other" : `${String(fyS).slice(-2)}-${String(fyS+1).slice(-2)}`,
          count: rows.length, rev, qty, avg,
        };
      });
  }, [periodSales]);

  const fmtAmt = v => fmt ? fmt(shopId, v) : `${shop?.symbol || "£"}${(Number(v)||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const totalRev = periodSales.reduce((a, s) => a + (Number(s.amount) || 0) - (Number(s.adjAmt) || 0), 0);

  /* ── Status tab counts (from period+search filtered) ─────────────────── */
  const tabCounts = useMemo(() => {
    const c = { ALL: periodFiltSales.length };
    (statusTabs || STATUS_TABS).forEach(t => {
      const k = t.key ?? t;
      if (k !== "ALL") {
        const target = k.toUpperCase();
        c[k] = periodFiltSales.filter(s => (s.ful || s.status || "PENDING").toUpperCase() === target).length;
      }
    });
    return c;
  }, [periodFiltSales, statusTabs]);

  /* ── Status-filtered rows for table ─────────────────────────────────── */
  const statusFiltered = useMemo(() => {
    const base = statusTab === "ALL" ? periodFiltSales
      : periodFiltSales.filter(s => (s.ful || s.status || "PENDING").toUpperCase() === statusTab.toUpperCase());
    return flaggedOnly ? base.filter(s => s.flagged) : base;
  }, [periodFiltSales, statusTab, flaggedOnly]);

  const flaggedCount = useMemo(
    () => periodFiltSales.filter(s => s.flagged).length,
    [periodFiltSales]
  );

  /* ── Sort: FY descending → date descending → invoice number descending ── */
  const sortedSales = useMemo(
    () => [...statusFiltered].sort((a, b) => {
      // Single-month view (current-month tab or an explicitly picked month):
      // manual drag order (sortpos) wins, but ONLY between two sales that
      // both already have one. A sale with no sortpos yet (e.g. one just
      // added after the month was reordered) falls through to normal date
      // order instead of always being pushed to the bottom.
      if (pickedMonth || salesPeriod === "month") {
        const spA = a.sortpos, spB = b.sortpos;
        if (spA != null && spB != null && spA !== spB) return spA - spB;
      }
      // Primary: FY group (use fyStartYear which reads invoice suffix)
      const fyA = fyStartYear(a) ?? 0;
      const fyB = fyStartYear(b) ?? 0;
      if (fyB !== fyA) return fyB - fyA;
      // Secondary: date descending
      const dateDiff = toSortableDate(b.date).localeCompare(toSortableDate(a.date));
      if (dateDiff !== 0) return dateDiff;
      // Tertiary: invoice number descending
      const numA = parseInt((a.id||"0").replace(/[^0-9]/g,""))||0;
      const numB = parseInt((b.id||"0").replace(/[^0-9]/g,""))||0;
      return numB - numA;
    }),
    [statusFiltered, pickedMonth, salesPeriod]
  );

  /* ── Carrier config ─────────────────────────────────────────────────── */
  const UK_CARRIERS = ["Royal Mail","Evri","DPD","UPS","Parcelforce","Other"];
  const IN_CARRIERS = ["Speed Post","DTDC","Other"];
  const CARRIERS = isIndiaShop ? IN_CARRIERS : UK_CARRIERS;

  const trackingURL = (carrier, trackNo) => {
    const cleanNo = (trackNo||"").replace(/\s+/g,"");
    switch((carrier||"").toLowerCase()){
      case "royal mail":   return `https://www.royalmail.com/track-your-item#/tracking-results/${cleanNo}`;
      case "evri":         return `https://www.evri.com/track/${cleanNo}`;
      case "dpd":          return `https://track.dpd.co.uk/parcels/${cleanNo}`;
      case "ups":          return `https://www.ups.com/track?tracknum=${cleanNo}`;
      case "parcelforce":  return `https://www.parcelforce.com/track-trace?trackNumber=${cleanNo}`;
      case "speed post":   return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
      case "dtdc":         return `https://www.dtdc.com/track-your-shipment/`;
      default: return null;
    }
  };

  const buildTrackingMsg = (sale, carrier, trackNo) => {
    const url = trackingURL(carrier, trackNo);
    const carrierName = carrier || "our courier";
    const isDtdc = (carrier||"").toLowerCase() === "dtdc";
    const trackLine = url
      ? isDtdc
        ? `You can track your parcel here:
${url}

Please enter your tracking number (${trackNo}) and the security code shown on the page to see your delivery status.`
        : `You can track your parcel here:
${url}`
      : `Your tracking number is: ${trackNo}`;
    const signOff = shop?.short ? `ROS ${shop.short}` : "ROS";
    return `Dear ${sale.customer||"Customer"},

Your order has been dispatched! 📦

Carrier: ${carrierName}
Tracking Number: ${trackNo}
${trackLine}

Your order is expected to arrive within 1–3 working days. If you experience any unexpected delay, please contact us as soon as possible.

Once your parcel arrives, kindly inspect the item(s) promptly. If your order has arrived damaged, is incorrect, or you are not completely satisfied for any reason, please contact us via WhatsApp within 2 days of delivery. We are committed to resolving any genuine concerns quickly and fairly, with your satisfaction as our priority.

Please note that requests made after this notification period may not be eligible for immediate resolution and, where applicable, return or handling charges may apply in accordance with our return policy.

Thank you for your trust and cooperation. We truly appreciate your support and hope you enjoy your purchase.
${signOff} 💜`;
  };

  const openTrackingWA = (sale, carrier, trackNo) => {
    const phone = (sale.phone || sale.contact || "").replace(/[^0-9]/g,"");
    if (!phone) { alert("No phone number for this customer."); return; }
    const msg = buildTrackingMsg(sale, carrier, trackNo);
    setWaModal({ phone, customerName: sale.customer, message: msg });
  };

  /* ── Instalment / linked-deal groups ─────────────────────────────────
     Groups a customer's sales (by name+phone) together automatically
     based on the dedicated Payment Type field (Full/Advance/Part/Final)
     chosen when the sale was saved. An ADVANCE always starts a fresh
     deal (even resetting one never formally closed); a FINAL always
     closes the deal right after it's added. PART just joins whatever
     deal is open. FULL never joins anything — always its own standalone
     sale, so it never even enters the grouping below. Status (Fulfilled
     etc.) is intentionally NOT used to decide grouping — in practice the
     advance portion often gets marked Fulfilled on its own, long before
     the final payment is even recorded, which made status an unreliable
     signal. ─────────────────────────────────────────────────────────── */
  /* Reads the new dedicated paymentType field; falls back to the old
     free-text tags for any sale not yet covered by the migration. */
  const inferPaymentType = (sale) => {
    if (sale.paymentType) return sale.paymentType;
    const tags = (sale.tag || "").split(",").map(t => t.trim());
    if (tags.includes("Advance Sale")) return "ADVANCE";
    if (tags.includes("Final Payment Sale")) return "FINAL";
    if (tags.includes("Part Payment")) return "PART";
    return "FULL";
  };
  /* Same-day transactions must sort by payment role, not invoice number —
     invoice numbers reflect save order, not necessarily the logical
     Advance -> Part -> Final sequence. */
  const tagPriority = (s) => {
    const pt = inferPaymentType(s);
    if (pt === "ADVANCE") return 0;
    if (pt === "FINAL") return 2;
    return 1; // Part, or Full
  };
  const instalmentGroups = useMemo(() => {
    const rawGroups = {};
    sales.forEach(s => {
      if (inferPaymentType(s) === "FULL") return; // never grouped
      const phone = (s.phone || s.contact || "").replace(/\D/g, "").slice(-10);
      const name = (s.customer || "").toLowerCase().trim();
      if (!phone && !name) return;
      const key = `${name}__${phone}`;
      if (!rawGroups[key]) rawGroups[key] = [];
      rawGroups[key].push(s);
    });

    const result = {};
    Object.entries(rawGroups).forEach(([custKey, custSales]) => {
      const sorted = [...custSales].sort((a,b)=>{
        const d=(a.date||"").localeCompare(b.date||"");
        if(d!==0)return d;
        const p=tagPriority(a)-tagPriority(b);
        if(p!==0)return p;
        return (a.invoiceNo||a.id||"").localeCompare(b.invoiceNo||b.id||"");
      });
      let groupIdx = 0;
      let currentKey = null;
      let dealOpen = false;
      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        const pt = inferPaymentType(s);
        const isAdvance = pt === "ADVANCE";
        const isFinal = pt === "FINAL";
        if (!dealOpen || isAdvance) {
          groupIdx++;
          currentKey = `${custKey}__grp${groupIdx}`;
          result[currentKey] = [];
          dealOpen = true;
        }
        result[currentKey].push(s);
        if (isFinal) dealOpen = false;
      }
    });

    // ── Manual link merge pass: sales sharing a manualLinkGroup value are
    // unified into one group, even if automatic Advance/Part/Final
    // detection put them in different groups (or skipped them entirely,
    // e.g. a payment mistakenly tagged Full instead of Final). ──────────
    const byManualLink = {};
    sales.forEach(s => {
      if (s.manualLinkGroup) (byManualLink[s.manualLinkGroup] ||= []).push(s);
    });
    Object.values(byManualLink).forEach(linkedSales => {
      if (linkedSales.length < 2) return;
      const linkedIds = new Set(linkedSales.map(s => s.id));
      const touchedKeys = Object.keys(result).filter(k => result[k].some(s => linkedIds.has(s.id)));
      const unionMap = {};
      touchedKeys.forEach(k => result[k].forEach(s => { unionMap[s.id] = s; }));
      linkedSales.forEach(s => { unionMap[s.id] = s; });
      touchedKeys.forEach(k => delete result[k]);
      const mergedKey = `manual__${Array.from(linkedIds).sort().join("_")}`;
      result[mergedKey] = Object.values(unionMap);
    });

    return result;
  }, [sales]);

  const getInstalmentKey = (s) => {
    if (s.manualLinkGroup) {
      // Manually-linked sales may end up in a merged group regardless of
      // payment type or customer key — search all groups for membership.
      for (const gk of Object.keys(instalmentGroups)) {
        if (instalmentGroups[gk].some(x => x.id === s.id)) return gk;
      }
      return null;
    }
    if (inferPaymentType(s) === "FULL") return null;
    const phone = (s.phone || s.contact || "").replace(/\D/g, "").slice(-10);
    const name = (s.customer || "").toLowerCase().trim();
    if (!phone && !name) return null;
    const custKey = `${name}__${phone}`;
    const groupKeys = Object.keys(instalmentGroups).filter(k => k.startsWith(custKey+"__grp"));
    for (const gk of groupKeys) {
      if (instalmentGroups[gk].some(x => x.id === s.id)) return gk;
    }
    return null;
  };

  const instalmentTagType = (s) => {
    const pt = inferPaymentType(s);
    if (pt === "ADVANCE") return "advance";
    if (pt === "FINAL") return "final";
    if (pt === "PART") return "part";
    return null;
  };

  /* A group's colour follows whichever tagged role appears first within
     it (advance leads, then part, then final), so every row in the deal —
     tagged or not — shares one consistent colour. */
  const groupColor = (group) => {
    const order = ["advance","part","final"];
    for (const want of order) {
      const hit = (group||[]).find(x => instalmentTagType(x) === want);
      if (hit) return want === "advance" ? "#f59e0b" : want === "part" ? "#7c3aed" : "#059669";
    }
    return "#0891b2";
  };

  /* Apply a status change to every sale in the same instalment group,
     then briefly flash those rows so it's obvious the cascade ran. */
  const applyCascade = async (saleId, newStatus, groupIds) => {
    if (!onInlineEdit) return;
    await Promise.all(groupIds.map(id => onInlineEdit(id, { ful: newStatus, status: newStatus })));
    setFlashIds(new Set(groupIds));
    setTimeout(() => setFlashIds(new Set()), 1500);
  };

  /* Manually links two transactions together, merging their existing
     manual-link groups if either already has one (so linking into an
     existing multi-way link works correctly, not just pairs). */
  const handleManualLink = async (saleA, saleB) => {
    if (!onInlineEdit || saleA.id === saleB.id) return;
    const groupA = saleA.manualLinkGroup;
    const groupB = saleB.manualLinkGroup;
    if (groupA && groupB && groupA === groupB) return; // already linked together
    const targetGroup = groupA || groupB || `link_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const updates = [];
    if (saleA.manualLinkGroup !== targetGroup) updates.push(onInlineEdit(saleA.id, { manualLinkGroup: targetGroup }));
    if (saleB.manualLinkGroup !== targetGroup) updates.push(onInlineEdit(saleB.id, { manualLinkGroup: targetGroup }));
    // If B belonged to a different existing manual group, migrate every
    // other sale in that old group over to the merged target group too.
    if (groupB && groupB !== targetGroup) {
      sales.filter(s => s.manualLinkGroup === groupB && s.id !== saleB.id)
        .forEach(s => updates.push(onInlineEdit(s.id, { manualLinkGroup: targetGroup })));
    }
    if (groupA && groupA !== targetGroup) {
      sales.filter(s => s.manualLinkGroup === groupA && s.id !== saleA.id)
        .forEach(s => updates.push(onInlineEdit(s.id, { manualLinkGroup: targetGroup })));
    }
    await Promise.all(updates);
  };

  const handleManualUnlink = async (sale) => {
    if (!onInlineEdit) return;
    await onInlineEdit(sale.id, { manualLinkGroup: null });
  };

  /* ── Rows with month / FY separators ────────────────────────────────── */
  // Only show FY separator when viewing year or lifetime
  // Only show month separator when viewing year, lifetime, or FY (not day/week/single month)
  const showFYSep   = effectivePeriod === "year" || effectivePeriod === "lifetime";
  const showMonSep  = showFYSep; // month separators only useful alongside FY view
  const rowsWithSeparators = useMemo(
    () => buildRowsWithSeparators(sortedSales, showFYSep, showMonSep),
    [sortedSales, showFYSep, showMonSep]
  );

  /* ── FY sale counter: "MAY 01/031" (monthly/yearly, resets 1 April) ──
     Computed from the full shop sales list (not the filtered view), so the
     numbers stay correct in Month view and renumber automatically when a
     back-dated sale is inserted. Display only - never written to the DB. */
  const FY_MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const fyCountMap = useMemo(() => {
    const map = {};
    const byFY = {};
    (sales || []).forEach(s => {
      const fy = fyStartYear(s);
      if (fy === null || fy === undefined) return;
      (byFY[fy] = byFY[fy] || []).push(s);
    });
    Object.keys(byFY).forEach(fy => {
      const list = byFY[fy].slice().sort((a, b) => {
        const da = safeParseDate(a.date), db = safeParseDate(b.date);
        const ta = da && !isNaN(da.getTime()) ? da.getTime() : 0;
        const tb = db && !isNaN(db.getTime()) ? db.getTime() : 0;
        // Group by calendar month first so reordering within a month never
        // shuffles sales into a different month's bucket.
        const ma = da && !isNaN(da.getTime()) ? da.getFullYear() * 12 + da.getMonth() : -1;
        const mb = db && !isNaN(db.getTime()) ? db.getFullYear() * 12 + db.getMonth() : -1;
        if (ma !== mb) return ma - mb;
        // Within the same month: manual drag order (sortpos) wins, but only
        // between two sales that both already have one. Counting runs
        // bottom-to-top of the on-screen order for those, so the LAST
        // displayed row of the month is numbered 01. A sale without a
        // sortpos yet (e.g. newly added) falls through to normal date
        // order instead of always being counted first.
        const spA = a.sortpos, spB = b.sortpos;
        if (spA != null && spB != null && spA !== spB) return spB - spA;
        if (ta !== tb) return ta - tb;
        return String(a.invoiceNo || a.id || "").localeCompare(String(b.invoiceNo || b.id || ""));
      });
      let yearly = 0, monthly = 0, lastMonthKey = null;
      list.forEach(s => {
        const d = safeParseDate(s.date);
        const valid = d && !isNaN(d.getTime());
        const mk = valid ? (d.getFullYear() + "-" + d.getMonth()) : "na";
        if (mk !== lastMonthKey) { monthly = 0; lastMonthKey = mk; }
        yearly++; monthly++;
        const mon = valid ? FY_MONTHS[d.getMonth()] : "";
        map[s.id] = (mon ? mon + " " : "") +
          String(monthly).padStart(2, "0") + "/" + String(yearly).padStart(3, "0");
      });
    });
    return map;
  }, [sales]);

  /* ── Period range label ─────────────────────────────────────────────── */
  const rangeLabel = (() => {
    if (pickedMonth) {
      const [py, pm] = pickedMonth.split("-").map(Number);
      const firstDay = new Date(py, pm - 1, 1);
      const lastDay  = new Date(py, pm, 0);
      return `${localISO(firstDay).split("-").reverse().slice(0,2).join("/")}/${String(py).slice(-2)} → ${localISO(lastDay).split("-").reverse().slice(0,2).join("/")}/${String(py).slice(-2)}`;
    }
    const { start, end } = getPeriodRange(salesPeriod);
    return !start ? "All records"
      : start === end ? fmtDate(start)
      : `${fmtDate(start)} → ${fmtDate(end)}`;
  })();

  const PERIODS = isStaff
    ? ["day", "week", "month"]
    : ["day", "week", "month", "year", "lifetime"];

  const resolvedTabs = statusTabs || STATUS_TABS;
  const activeTabCfg = STATUS_TABS.find(t => t.key === statusTab) || STATUS_TABS[0];

  /* ── KPI card definitions ───────────────────────────────────────────── */
  const kpiDefs = [
    { icon:"🛒", label:"Orders",    getValue: g=>String(g.count),    topGrad:"linear-gradient(90deg,#4f46e5,#818cf8,#4f46e5)", topColor:"#6366f1", iconBg:"#eef2ff", iconColor:"#4f46e5", shadow:"rgba(99,102,241,0.14)",  glowColor:"rgba(99,102,241,0.32)"  },
    { icon:"📦", label:"Quantity",  getValue: g=>`${g.qty} units`,   topGrad:"linear-gradient(90deg,#0284c7,#38bdf8,#0284c7)", topColor:"#0ea5e9", iconBg:"#e0f2fe", iconColor:"#0284c7", shadow:"rgba(14,165,233,0.14)",  glowColor:"rgba(14,165,233,0.32)"  },
    { icon:"💰", label:"Revenue",   getValue: g=>fmtAmt(g.rev),      topGrad:`linear-gradient(90deg,${accent},${accent}99,${accent})`,          topColor:accent,    iconBg:accentBg,   iconColor:accent,    shadow:`${accent}22`,               glowColor:`${accent}44`            },
    { icon:"📈", label:"Avg. Order",getValue: g=>fmtAmt(g.avg),      topGrad:"linear-gradient(90deg,#d97706,#fbbf24,#d97706)", topColor:"#f59e0b", iconBg:"#fef3c7", iconColor:"#d97706",shadow:"rgba(245,158,11,0.14)", glowColor:"rgba(245,158,11,0.36)"  },
  ];

  return (
    <div style={{ padding: 0 }}>

      {/* ══════════════════════════════════════════════════════════
          PAGE HEADER
         ══════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
            Sales
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {periodSales.length} order{periodSales.length !== 1 ? "s" : ""} · {rangeLabel}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Period selector pills */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
            {PERIODS.map(p => {
              const isActive = !pickedMonth && salesPeriod === p;
              return (
                <button key={p} onClick={() => { setSalesPeriod(p); setPickedMonth(null); setPickerOpen(false); }} title={PERIOD_META[p].desc}
                  style={{
                    padding: "5px 13px", borderRadius: 8, border: "none",
                    background: isActive ? accent : "transparent",
                    color: isActive ? "white" : "#64748b",
                    fontWeight: isActive ? 800 : 600, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    boxShadow: isActive ? `0 2px 8px ${accent}44` : "none",
                  }}>
                  {PERIOD_META[p].label}
                </button>
              );
            })}
          </div>

          {/* ── Month Picker ── */}
          <div ref={pickerRef} style={{ position: "relative" }}>
            {/* Trigger button */}
            <button
              onClick={() => setPickerOpen(o => !o)}
              title="Pick a specific month"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 8, border: "none",
                background: pickedMonth ? accent : "#f1f5f9",
                color: pickedMonth ? "white" : "#64748b",
                fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                boxShadow: pickedMonth ? `0 2px 8px ${accent}44` : "none",
                whiteSpace: "nowrap",
              }}>
              📅 {pickedMonth
                ? new Date(+pickedMonth.split("-")[0], +pickedMonth.split("-")[1] - 1, 1)
                    .toLocaleString("default", { month: "short", year: "numeric" })
                : "Pick Month"}
              {pickedMonth && (
                <span
                  onClick={e => { e.stopPropagation(); setPickedMonth(null); setPickerOpen(false); }}
                  style={{ marginLeft: 2, opacity: 0.8, fontWeight: 900, fontSize: 13, lineHeight: 1 }}
                  title="Clear">×</span>
              )}
            </button>

            {/* Dropdown picker */}
            {pickerOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "white", borderRadius: 14,
                border: "1px solid #e2e8f0",
                boxShadow: "0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
                padding: 16, zIndex: 200, minWidth: 260,
              }}>
                {/* Year navigation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <button onClick={() => setPickerYear(y => y - 1)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{pickerYear}</span>
                    {/* Dots for years that have sales */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {salesYears.map(yr => (
                        <button key={yr} onClick={() => setPickerYear(yr)}
                          title={`Go to ${yr}`}
                          style={{
                            width: 8, height: 8, borderRadius: "50%", border: "none", padding: 0,
                            cursor: "pointer",
                            background: yr === pickerYear ? accent : `${accent}44`,
                          }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setPickerYear(y => y + 1)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                </div>
                {/* Month grid — 4 columns */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((mon, idx) => {
                    const key = `${pickerYear}-${String(idx + 1).padStart(2, "0")}`;
                    const isSelected = pickedMonth === key;
                    const isCurrentMonth = key === localISO(new Date()).slice(0, 7);
                    const hasSales = salesMonthSet.has(key);
                    return (
                      <button key={key}
                        onClick={() => { setPickedMonth(key); setPickerOpen(false); }}
                        style={{
                          padding: "8px 4px", borderRadius: 8,
                          border: isSelected ? `2px solid ${accent}` : isCurrentMonth ? `1px solid ${accent}` : "1px solid transparent",
                          background: isSelected ? accent : isCurrentMonth ? `${accent}12` : hasSales ? `${accent}08` : "#f8fafc",
                          color: isSelected ? "white" : isCurrentMonth ? accent : hasSales ? "#374151" : "#cbd5e1",
                          fontWeight: isSelected || isCurrentMonth ? 700 : hasSales ? 600 : 400,
                          fontSize: 12, cursor: hasSales ? "pointer" : "default",
                          fontFamily: "inherit", transition: "all 0.12s",
                          position: "relative",
                        }}
                        onMouseEnter={e => { if (!isSelected && hasSales) { e.currentTarget.style.background = `${accent}20`; e.currentTarget.style.color = accent; }}}
                        onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = isSelected ? accent : isCurrentMonth ? `${accent}12` : hasSales ? `${accent}08` : "#f8fafc"; e.currentTarget.style.color = isSelected ? "white" : isCurrentMonth ? accent : hasSales ? "#374151" : "#cbd5e1"; }}}>
                        {mon}
                        {hasSales && !isSelected && (
                          <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: accent, display: "block" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Quick jump to current month */}
                <button
                  onClick={() => { const now = new Date(); setPickerYear(now.getFullYear()); setPickedMonth(localISO(now).slice(0, 7)); setPickerOpen(false); }}
                  style={{
                    marginTop: 10, width: "100%", padding: "7px 0", borderRadius: 8,
                    border: `1px solid ${accent}33`, background: `${accent}10`,
                    color: accent, fontWeight: 700, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                  ↩ This Month
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setModal("import-sales")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            ⬇ Import
          </button>
          <button onClick={() => { if (setExportRows) setExportRows(periodSales); setModal("export-sales"); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            ⬆ Export
          </button>
          {onReload && (
            <button onClick={async () => { setReloading(true); await onReload(); setReloading(false); }}
              disabled={reloading}
              title="Refresh sales from database"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 9, border: "1px solid #e2e8f0",
                background: "white", color: "#64748b", fontWeight: 700, fontSize: 13,
                cursor: reloading ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: reloading ? 0.6 : 1,
              }}>
              {reloading ? "⏳" : "🔄"}
            </button>
          )}
          {/* Column visibility toggle */}
          <div style={{position:"relative"}}>
            <button onClick={e=>{e.stopPropagation();setShowColMenu(v=>!v);}}
              style={{display:"flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:9,
                border:"1px solid #e2e8f0",background:"white",color:"#374151",
                fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ⚙ Columns
            </button>
            {showColMenu&&(
              <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,zIndex:50,
                background:"white",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",
                border:"1px solid #e2e8f0",padding:12,minWidth:180}}
                onClick={e=>e.stopPropagation()}>
                <div style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",
                  letterSpacing:"0.06em",marginBottom:8}}>Show / Hide Columns</div>
                {/* Presets */}
                <div style={{display:"flex",gap:5,marginBottom:10}}>
                  <button onClick={()=>{
                    const full={...COL_DEFAULTS};Object.keys(full).forEach(k=>full[k]=true);
                    setColVis(full);try{localStorage.setItem("ros_col_vis",JSON.stringify(full));}catch{}
                  }} style={{flex:1,padding:"4px 0",borderRadius:6,border:"1px solid #e2e8f0",
                    background:"#f8fafc",color:"#374151",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    Full View
                  </button>
                  <button onClick={()=>{
                    const quick={...COL_DEFAULTS,Verified:true,Refund:false,Payment:false,Tags:false,"Pur. Amount":false,Informed:false,From:false};
                    setColVis(quick);try{localStorage.setItem("ros_col_vis",JSON.stringify(quick));}catch{}
                  }} style={{flex:1,padding:"4px 0",borderRadius:6,border:"1px solid #e2e8f0",
                    background:"#f8fafc",color:"#374151",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    Quick View
                  </button>
                </div>
                {/* Column toggles */}
                {["Invoice","Date","Customer","Item","Amount",...(isIndiaShop?["Verified"]:[]),"Refund","Payment","Status","Tags","Pur. Amount","Tracking","Delivered","Informed","From"].map(col=>(
                  <label key={col} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 4px",
                    cursor:"pointer",borderRadius:6,fontSize:12,color:"#374151"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <input type="checkbox" checked={showCol(col)} onChange={()=>toggleCol(col)}
                      style={{width:14,height:14,cursor:"pointer",accentColor:accent}}/>
                    {col}
                  </label>
                ))}
                <button onClick={()=>setShowColMenu(false)}
                  style={{width:"100%",marginTop:8,padding:"6px 0",borderRadius:8,border:"none",
                    background:accent,color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  Done
                </button>
              </div>
            )}
          </div>

          <button onClick={() => { setShowReport(true); setRptStatuses(null); setCrossOnly(false); setRptUnit('ALL'); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            📋 Report
          </button>
          <button onClick={() => setModal("new-sale")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: accent, color: "white", fontWeight: 800, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 3px 10px ${accent}44`,
            }}>
            + New Sale
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          KPI COMPARISON CARDS — current FY large, prior years smaller
         ══════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:14, marginBottom:20 }}>
        {kpiDefs.map((card, i) => {
          const isHov = hovCard === i;
          return (
            <div key={card.label}
              onMouseEnter={() => setHovCard(i)}
              onMouseLeave={() => setHovCard(null)}
              style={{
                background:"white", borderRadius:16, border:"1px solid #f1f5f9", overflow:"hidden",
                boxShadow: isHov ? `0 16px 40px ${card.glowColor},0 4px 12px ${card.shadow}` : `0 2px 10px ${card.shadow}`,
                transform: isHov ? "translateY(-4px) scale(1.02)" : "none",
                transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
              {/* Top accent bar */}
              <div style={{ height:4, background:card.topGrad }} />
              <div style={{ padding:"14px 16px 16px" }}>
                {/* Icon + label row */}
                <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, background:card.iconBg,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
                    transform: isHov ? "scale(1.1) rotate(-4deg)" : "none", transition:"transform 0.22s",
                  }}>{card.icon}</div>
                  <span style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                    {card.label}
                  </span>
                  <div style={{
                    marginLeft:"auto", width:7, height:7, borderRadius:"50%", background:card.topColor,
                    boxShadow: isHov ? `0 0 0 3px ${card.glowColor}` : "none", transition:"box-shadow 0.22s",
                  }} />
                </div>
                {/* KPI value — single total for short periods, FY breakdown for year/lifetime */}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {showFYSep ? (
                    <>
                      {fyGroups.length === 0 && (
                        <span style={{ fontSize:22, fontWeight:900, color:"#94a3b8" }}>—</span>
                      )}
                      {fyGroups.map((g, gi) => {
                        const isCurrent = gi === 0;
                        return (
                          <div key={g.fyStart} style={{
                            display:"flex", alignItems:"center", justifyContent:"space-between",
                            padding: isCurrent ? "6px 10px" : "4px 10px",
                            borderRadius:8,
                            background: isCurrent ? `${card.topColor}12` : "#f8fafc",
                            borderLeft: `3px solid ${isCurrent ? card.topColor : "#e2e8f0"}`,
                          }}>
                            <span style={{
                              fontSize: isCurrent ? 10 : 9, fontWeight:700,
                              color: isCurrent ? card.topColor : "#94a3b8",
                              letterSpacing:"0.04em", minWidth:38,
                            }}>
                              FY {g.label}
                            </span>
                            <span style={{
                              fontSize: isCurrent ? 22 : 14,
                              fontWeight: isCurrent ? 900 : 700,
                              color: isCurrent ? (isHov ? card.topColor : "#0f172a") : "#64748b",
                              letterSpacing: isCurrent ? "-0.5px" : "0",
                              transition:"color 0.2s",
                            }}>
                              {card.getValue(g)}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    /* Single period — no FY breakdown, just show the total */
                    <div style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"6px 10px", borderRadius:8,
                      background:`${card.topColor}12`,
                      borderLeft:`3px solid ${card.topColor}`,
                    }}>
                      <span style={{ fontSize:10, fontWeight:700, color:card.topColor, letterSpacing:"0.04em" }}>
                        {pickedMonth
                          ? new Date(pickedMonth+"-01").toLocaleString("default",{month:"short",year:"numeric"})
                          : effectivePeriod==="month" ? "This Month"
                          : effectivePeriod==="week"  ? "This Week"
                          : effectivePeriod==="day"   ? "Today"
                          : "Period"}
                      </span>
                      <span style={{
                        fontSize:22, fontWeight:900,
                        color: isHov ? card.topColor : "#0f172a",
                        letterSpacing:"-0.5px", transition:"color 0.2s",
                      }}>
                        {periodSales.length === 0 ? "—" : card.getValue({
                          count: periodSales.length,
                          rev:   periodSales.reduce((a,s)=>a+(Number(s.amount)||0)-(Number(s.adjAmt)||0),0),
                          qty:   periodSales.reduce((a,s)=>a+(Number(s.qty)||1),0),
                          avg:   periodSales.length>0
                            ? Math.round(periodSales.reduce((a,s)=>a+(Number(s.amount)||0)-(Number(s.adjAmt)||0),0)/periodSales.length)
                            : 0,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
          STATUS FILTER TABS + SEARCH
         ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: "white", borderRadius: 14, border: "1px solid #e2e8f0",
        marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        display: "flex", alignItems: "stretch", overflow: "hidden",
      }}>
        {/* Scrollable tab strip */}
        <div style={{
          flex: 1, overflowX: "auto", scrollbarWidth: "none",
          display: "flex", alignItems: "stretch",
        }}>
          <style>{`.ros-sp-tab::-webkit-scrollbar{display:none}.ros-sp-btn:hover{background:${accentBg}!important;color:${accent}!important}`}</style>
          <div style={{ display: "flex", alignItems: "stretch", minWidth: "max-content", padding: "0 6px" }}>
            {resolvedTabs.map(t => {
              const key   = t.key   ?? t;
              const label = t.label ?? t;
              const emoji = t.emoji ?? "";
              const isActive = statusTab === key;
              const count = tabCounts[key] ?? 0;
              return (
                <button key={key}
                  className="ros-sp-btn"
                  onClick={() => setStatusTab(key)}
                  onMouseEnter={() => setHovTab(key)}
                  onMouseLeave={() => setHovTab(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "10px 13px",
                    border: "none",
                    borderBottom: isActive ? `3px solid ${accent}` : "3px solid transparent",
                    borderTop: "3px solid transparent",
                    background: isActive ? accentBg + "80" : "transparent",
                    cursor: "pointer", fontFamily: "inherit",
                    fontWeight: isActive ? 800 : 500,
                    fontSize: 12, whiteSpace: "nowrap",
                    color: isActive ? accent : "#64748b",
                    transition: "all 0.14s",
                  }}>
                  {emoji && <span style={{ fontSize: 12 }}>{emoji}</span>}
                  <span>{label}</span>
                  {count > 0 && (
                    <span style={{
                      background: isActive ? accent : "#e2e8f0",
                      color: isActive ? "white" : "#64748b",
                      borderRadius: 999, padding: "1px 7px",
                      fontSize: 10, fontWeight: 800,
                      lineHeight: "16px", display: "inline-block",
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Flagged-for-recheck filter toggle */}
        {flaggedCount > 0 && (
          <button onClick={() => setFlaggedOnly(v => !v)}
            title="Show only sales flagged for recheck"
            style={{
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              padding: "0 14px", border: "none", borderLeft: "1px solid #f1f5f9",
              borderRight: "1px solid #f1f5f9",
              background: flaggedOnly ? "#fee2e2" : "#f8fafc",
              color: "#b91c1c",
              cursor: "pointer", fontFamily: "inherit",
              fontWeight: flaggedOnly ? 800 : 600, fontSize: 12,
            }}>
            🚩 <span>Recheck</span>
            <span style={{
              background: flaggedOnly ? "#dc2626" : "#fecaca",
              color: flaggedOnly ? "white" : "#b91c1c",
              borderRadius: 999, padding: "1px 7px",
              fontSize: 10, fontWeight: 800, lineHeight: "16px",
            }}>{flaggedCount}</span>
          </button>
        )}

        {/* Inline search — right side */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          padding: "0 14px", borderLeft: "1px solid #f1f5f9",
          background: "#f8fafc",
        }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice or customer…"
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 12, color: "#374151", fontFamily: "inherit", width: 180,
            }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 16, color: "#94a3b8", padding: 0, lineHeight: 1,
              }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Active status context bar ── */}
      {statusTab !== "ALL" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", marginBottom: 12,
          background: activeTabCfg.bg, borderRadius: 11,
          border: `1px solid ${activeTabCfg.color}33`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: activeTabCfg.color, flexShrink: 0,
          }} />
          <span style={{
            fontSize: 12, fontWeight: 800, color: activeTabCfg.color,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            {activeTabCfg.label}
          </span>
          <span style={{ fontSize: 12, color: activeTabCfg.color, opacity: 0.65 }}>
            — {sortedSales.length} record{sortedSales.length !== 1 ? "s" : ""}
          </span>
          <button onClick={() => setStatusTab("ALL")}
            style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 700,
              color: activeTabCfg.color, background: "white",
              border: `1px solid ${activeTabCfg.color}44`,
              borderRadius: 7, padding: "3px 10px",
              cursor: "pointer", fontFamily: "inherit",
            }}>
            Show All ×
          </button>
        </div>
      )}

      {/* ── Active flagged-only context bar ── */}
      {flaggedOnly && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", marginBottom: 12,
          background: "#fef2f2", borderRadius: 11,
          border: "1px solid #fecaca",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            🚩 Recheck
          </span>
          <span style={{ fontSize: 12, color: "#b91c1c", opacity: 0.65 }}>
            — {sortedSales.length} record{sortedSales.length !== 1 ? "s" : ""}
          </span>
          <button onClick={() => setFlaggedOnly(false)}
            style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 700,
              color: "#b91c1c", background: "white",
              border: "1px solid #fecaca",
              borderRadius: 7, padding: "3px 10px",
              cursor: "pointer", fontFamily: "inherit",
            }}>
            Show All ×
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SALES TABLE
         ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: "white", borderRadius: 16, border: "1px solid #f1f5f9",
        overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Invoice", "Date", "Customer", "Item", "Amount", ...(isIndiaShop ? ["Verified"] : []), "Refund", "Payment", "Status", "Tags",
                  ...(isIndiaShop&&!isStaff ? ["Pur. Amount"] : []),
                  "Tracking", "Delivered", "Informed", "From", "Actions"]
                  .filter(h => h==="Actions" || showCol(h))
                  .map((h, i) => (
                    <th key={h} style={{
                      padding: "11px 16px",
                      textAlign: (h==="Amount"||h==="Refund"||h==="Payment"||h==="Status"||h==="Pur. Amount") ? "right" : "left",
                      fontSize: 11, fontWeight: 800, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>

              {/* Empty state */}
              {rowsWithSeparators.length === 0 && (
                <tr>
                  <td colSpan={Object.values(colVis).filter(Boolean).length + 1} style={{ padding: "52px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#94a3b8", fontSize: 14 }}>
                      No {statusTab !== "ALL" ? activeTabCfg.label.toLowerCase() + " " : ""}sales found
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1" }}>
                      {statusTab !== "ALL"
                        ? "Try a different status tab or time range"
                        : "Try a different time range or add a new sale"}
                    </p>
                  </td>
                </tr>
              )}

              {rowsWithSeparators.map((row, idx) => {

                /* ── FINANCIAL YEAR BOUNDARY ─────────────────────────────── */
                if (row._type === "fy") {
                  return (
                    <tr key={`fy-${row._fyStart}-${idx}`}>
                      <td colSpan={Object.values(colVis).filter(Boolean).length + 1} style={{ padding: 0 }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 16px",
                          background: "linear-gradient(90deg,#fef3c7 0%,#fde68a 40%,#fef3c7 100%)",
                          borderTop: "2px solid #f59e0b", borderBottom: "2px solid #f59e0b",
                        }}>
                          <span style={{ fontSize: 14 }}>◆</span>
                          <span style={{
                            fontSize: 11, fontWeight: 900, color: "#78350f",
                            textTransform: "uppercase", letterSpacing: "0.10em",
                          }}>
                            {row._label} &nbsp;·&nbsp; Financial Year Starts 1 April
                          </span>
                          <div style={{ flex: 1, height: 1, background: "#f59e0b88" }} />
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: "#92400e",
                            background: "#fef9c3", border: "1px solid #fde68a",
                            borderRadius: 6, padding: "2px 9px", whiteSpace: "nowrap",
                          }}>
                            📅 New Financial Year
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                /* ── MONTH BOUNDARY ──────────────────────────────────────── */
                if (row._type === "month") {
                  return (
                    <tr key={`month-${row._monthKey}-${idx}`}>
                      <td colSpan={Object.values(colVis).filter(Boolean).length + 1} style={{ padding: 0 }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "6px 16px",
                          background: "linear-gradient(90deg,#f0f9ff 0%,#e0f2fe 50%,#f0f9ff 100%)",
                          borderTop: "1px solid #bae6fd", borderBottom: "1px solid #bae6fd",
                        }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: accent, flexShrink: 0,
                            boxShadow: `0 0 0 2px ${accent}33`,
                          }} />
                          <span style={{
                            fontSize: 11, fontWeight: 800, color: "#0369a1",
                            textTransform: "uppercase", letterSpacing: "0.08em",
                          }}>
                            {row._label}
                          </span>
                          <div style={{ flex: 1, height: 1, background: "#7dd3fc" }} />
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: "#0284c7",
                            background: "white", border: "1px solid #bae6fd",
                            borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap",
                          }}>
                            ↕ month boundary
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                /* ── MONTH SUMMARY ROW ──────────────────────────────────── */
                if (row._type === "monthSummary") {
                  return (
                    <tr key={`summary-${row._monthKey}`}>
                      <td colSpan={Object.values(colVis).filter(Boolean).length + 1} style={{ padding: 0 }}>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 0,
                          padding: "8px 16px",
                          background: "linear-gradient(90deg,#f0fdf4 0%,#dcfce7 40%,#f0fdf4 100%)",
                          borderTop: "1px solid #86efac", borderBottom: "2px solid #86efac",
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#166534",
                            textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 16 }}>
                            ∑ {row._label}
                          </span>
                          {[
                            { l: "Records", v: row.count },
                            { l: "Items",   v: row.qty },
                            { l: "Sold",    v: fmtAmt(row.amount) },
                            { l: "Refund",  v: row.refund > 0 ? "-"+fmtAmt(row.refund) : "—", red: row.refund > 0 },
                            { l: "Net",     v: fmtAmt(row.net), highlight: true },
                          ].map(({ l, v, red, highlight }) => (
                            <div key={l} style={{
                              display: "flex", flexDirection: "column", alignItems: "flex-end",
                              padding: "2px 14px",
                              borderLeft: "1px solid #86efac",
                            }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#4ade80",
                                textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</span>
                              <span style={{
                                fontSize: 13, fontWeight: 900,
                                fontFamily: highlight || red ? "DM Mono,monospace" : "inherit",
                                color: red ? "#dc2626" : highlight ? "#166534" : "#374151",
                              }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                }

                /* ── SALE ROW ────────────────────────────────────────────── */
                const s   = row;
                const instKey   = getInstalmentKey(s);
                const instGroup = instKey ? (instalmentGroups[instKey] || []) : [];
                const instType  = instalmentTagType(s); // this row's own tag, if any (for the small type badge)
                const isInstalment = !!instKey; // true if this row is part of a recognised deal, tagged or not
                // Colour is shared across the whole group, not just this row's own tag
                const instColor = isInstalment ? groupColor(instGroup) : "transparent";
                const instBg    = isInstalment ? instColor + "0d" : "transparent";
                // Show instalment summary row only on the advance sale
                const showInstalmentSummary = instType === "advance" && instGroup.length >= 1;
                const totalPaid = instGroup.reduce((a,x) => a + (Number(x.amount)||0), 0);
                const expectedTotal = Number(s.expectedTotal) || 0;
                const balance = expectedTotal > 0 ? expectedTotal - totalPaid : null;
                // Only mark fully paid if group contains an explicit Final Payment Sale
                const hasFinalPayment = instGroup.some(x => instalmentTagType(x) === "final");
                const isActuallyFullyPaid = balance !== null && balance <= 0 && hasFinalPayment;
                const ful = s.ful || s.status || "PENDING";
                const isH = hovR === s.id;
                const isDragging = dragId === s.id;
                const isDragOver = dragOverId === s.id && dragId && dragId !== s.id;
                const mergedRowBg = { ...STATUS_ROW_BG, ...(statusRowBgProp || {}) };
                const isFlashing = flashIds.has(s.id) || (externalFlashIds && externalFlashIds.has(s.id));
                const rowBg = isH ? "#fde047" : (isFlashing ? "#86efac" : (s.flagged ? "#fef2f2" : (isInstalment ? instBg : (mergedRowBg[ful] || "white"))));

                return (
                  <tr key={s.id}
                    draggable={reorderEnabled}
                    onDragStart={(e) => { if (!reorderEnabled) return; setDragId(s.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => { if (!reorderEnabled || !dragId) return; e.preventDefault(); if (dragOverId !== s.id) setDragOverId(s.id); }}
                    onDragLeave={() => { if (dragOverId === s.id) setDragOverId(null); }}
                    onDrop={(e) => { if (!reorderEnabled) return; e.preventDefault(); handleReorderDrop(s.id); }}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    onClick={() => setSelRow(s)}
                    onMouseEnter={() => setHovR(s.id)}
                    onMouseLeave={() => setHovR(null)}
                    style={{
                      background: rowBg, cursor: reorderEnabled ? "grab" : "pointer",
                      opacity: isDragging ? 0.4 : 1,
                      borderBottom: isDragOver ? "2px dashed " + accent : "1px solid #e2e8f0",
                      transition: "background 0.12s",
                      borderLeft: s.flagged ? "3px solid #dc2626" : (isInstalment ? `5px solid ${instColor}` : "3px solid transparent"),
                    }}>
                    {/* Invoice */}
                    <td style={{ padding: "12px 16px" }}>
                      {reorderEnabled && (
                        <span title="Drag to reorder" style={{ marginRight: 6, color: "#cbd5e1", fontSize: 12, cursor: "grab" }}>⠿</span>
                      )}
                      {fyCountMap[s.id] && (
                        <div style={{
                          fontFamily: "DM Mono,monospace", fontSize: 9, fontWeight: 700,
                          color: "#94a3b8", letterSpacing: "0.03em", marginBottom: 2, whiteSpace: "nowrap"
                        }}>{fyCountMap[s.id]}</div>
                      )}
                      <span style={{ fontFamily: "DM Mono,monospace", fontWeight: 700, fontSize: 12,
                        color: (!isIndiaShop || !String(s.id||"").includes("-")) ? accent : "#cbd5e1" }}>
                        {(!isIndiaShop || !String(s.id||"").includes("-")) ? s.id : "\u2014"}
                      </span>
                      {(() => {
                        const vState = s.flagged ? "recheck" : (s.checked ? "verified" : "pending");
                        const vStyle = {
                          pending:  { bg: "#6b7280", border: "#4b5563", label: "To Verify" },
                          verified: { bg: "#16a34a", border: "#15803d", label: "Verified" },
                          recheck:  { bg: "#dc2626", border: "#b91c1c", label: "Recheck" },
                        }[vState];
                        if (isSuperadmin && onInlineEdit) {
                          const cycleNext = () => {
                            if (vState === "pending")       onInlineEdit(s.id, { checked: true,  flagged: false });
                            else if (vState === "verified") onInlineEdit(s.id, { checked: false, flagged: true  });
                            else                             onInlineEdit(s.id, { checked: false, flagged: false });
                          };
                          return (
                            <div onClick={(e) => { e.stopPropagation(); cycleNext(); }}
                              title="Click to change verification status"
                              style={{
                                marginTop: 2, display: "inline-flex", alignItems: "center", gap: 3,
                                fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999,
                                cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em",
                                background: vStyle.bg, color: "white",
                                border: `1px solid ${vStyle.border}`,
                              }}>
                              {vStyle.label}
                            </div>
                          );
                        }
                        return vState !== "pending" && (
                          <div style={{
                            marginTop: 2, display: "inline-flex", alignItems: "center", gap: 3,
                            fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999,
                            background: vStyle.bg, color: "white",
                            textTransform: "uppercase", letterSpacing: "0.05em",
                          }}>
                            {vStyle.label}
                          </div>
                        );
                      })()}
                      {(() => {
                        const pt = inferPaymentType(s);
                        const badgeColor = pt === "ADVANCE" ? "#f59e0b" : pt === "PART" ? "#7c3aed" : pt === "FINAL" ? "#2563eb" : "#059669";
                        const badgeLabel = pt === "ADVANCE" ? "💰 Advance" : pt === "PART" ? "🔄 Part" : pt === "FINAL" ? "🏁 Final" : "✅ Full";
                        return (
                          <div style={{ marginTop: 2 }}>
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999,
                              background: badgeColor + "20", color: badgeColor,
                              border: `1px solid ${badgeColor}44`, textTransform: "uppercase", letterSpacing: "0.05em"
                            }}>
                              {badgeLabel}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    {showCol("Date")&&(
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                        {fmtDateForSale(s)}
                      </span>
                    </td>
                    )}
                    {/* Customer */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", textTransform: "uppercase" }}>{s.customer}</div>
                      {s.phone && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{s.phone}</div>}
                      {s.paidBy && String(s.paidBy).trim() !== "" && (
                        <div style={{ fontSize: 10, color: "#b6c0cd", marginTop: 1 }}>{s.paidBy}</div>
                      )}
                      {isInstalment && instGroup.length > 1 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkedGroupView(instGroup);
                          }}
                          title="Click to view all linked transactions"
                          style={{
                            marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                            background: instColor, color: "white", cursor: "pointer",
                            boxShadow: `0 1px 3px ${instColor}66`,
                          }}>
                          🔗 Linked ({instGroup.length})
                        </div>
                      )}
                      {isInstalment && instGroup.length === 1 && instType !== "final" && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkedGroupView(instGroup);
                          }}
                          title="Click to view all linked transactions"
                          style={{
                            marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                            background: instColor, color: "white", cursor: "pointer",
                            boxShadow: `0 1px 3px ${instColor}66`,
                          }}>
                          ⏳ Awaiting Balance
                        </div>
                      )}
                      {isInstalment && instGroup.length === 1 && instType === "final" && (
                        <div
                          title="This Final Payment has no matching Advance/Part payment for this customer — check the Payment Type on this and related sales"
                          style={{
                            marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                            background: "#dc2626", color: "white",
                          }}>
                          ⚠️ No advance found
                        </div>
                      )}
                      {user?.id==="suresh" && (
                        <div
                          onClick={(e) => { e.stopPropagation(); setManualLinkSale(s); setManualLinkQuery(""); }}
                          title="Manually link this to another transaction"
                          style={{
                            marginTop: 4, display: "inline-flex", alignItems: "center", gap: 3,
                            fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
                            color: "#64748b", border: "1px dashed #cbd5e1", cursor: "pointer",
                          }}>
                          🔗+ Link
                        </div>
                      )}
                    </td>
                    {/* Item */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "#374151" }}>
                        {s.item || "—"}
                        {s.qty && s.qty !== "1" && (
                          <span style={{ color: "#94a3b8", marginLeft: 4 }}>×{s.qty}</span>
                        )}
                      </span>
                    </td>
                    {/* Amount — inline editable */}
                    <td style={{ padding: "8px 10px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      {editAmountId === s.id ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
                          <input
                            autoFocus
                            type="number"
                            value={amountInput}
                            onChange={e => setAmountInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                if (onInlineEdit) onInlineEdit(s.id, { amount: amountInput });
                                setEditAmountId(null);
                              }
                              if (e.key === "Escape") setEditAmountId(null);
                            }}
                            style={{ width: 80, padding: "5px 8px", borderRadius: 7, border: "1.5px solid #7dd3fc",
                              fontSize: 12, fontFamily: "DM Mono,monospace", outline: "none", textAlign: "right" }}
                          />
                          <button onClick={() => { if (onInlineEdit) onInlineEdit(s.id, { amount: amountInput }); setEditAmountId(null); }}
                            style={{ padding: "5px 7px", borderRadius: 7, border: "none", background: "#0369a1", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓</button>
                          <button onClick={() => setEditAmountId(null)}
                            style={{ padding: "5px 6px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                          {(() => {
                            const sym = shop?.symbol || "£";
                            const net = (Number(s.amount)||0) - (Number(s.adjAmt)||0);
                            const orig = Number(s.amount)||0;
                            const fmtVal = (v) => fmt ? fmt(shopId, v) : sym + v.toLocaleString("en-GB", {minimumFractionDigits:2,maximumFractionDigits:2});

                            // For advance sale: use the group-level totals already computed
                            // above (instGroup/totalPaid/balance), which correctly include
                            // any untagged transactions swept into this deal.
                            let balanceBlock = null;
                            if (showInstalmentSummary) {
                              if (expectedTotal > 0) {
                                balanceBlock = (
                                  <div style={{marginTop:2,textAlign:"right"}}>
                                    <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.04em"}}>of {fmtVal(expectedTotal)}</div>
                                    {isActuallyFullyPaid ? (
                                      <div style={{fontSize:10,fontWeight:800,color:"#059669",whiteSpace:"nowrap"}}>✅ Fully Paid</div>
                                    ) : (
                                      <div style={{fontSize:11,fontWeight:800,color:"#dc2626",whiteSpace:"nowrap"}}>
                                        Bal: {fmtVal(Math.max(balance,0))}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                // No expected total set — show reminder
                                balanceBlock = (
                                  <div style={{marginTop:2,fontSize:9,color:"#f59e0b",fontWeight:700,
                                    background:"#fffbeb",border:"1px solid #fde68a",borderRadius:4,
                                    padding:"1px 5px",whiteSpace:"nowrap"}}>
                                    ⚠ Set expected total
                                  </div>
                                );
                              }
                            }

                            return (<>
                              <span
                                onClick={() => { setEditAmountId(s.id); setAmountInput(String(s.amount||"")); }}
                                title="Click to edit amount"
                                style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", cursor: "text",
                                  borderBottom: "1px dashed #cbd5e1", paddingBottom: 1 }}>
                                {fmtVal(net)}
                              </span>
                              {(Number(s.adjAmt)||0) > 0 && (
                                <div style={{ fontSize: 10, color: "#d97706", whiteSpace: "nowrap" }}>was {fmtVal(orig)}</div>
                              )}
                              {balanceBlock}
                            </>);
                          })()}
                        </div>
                      )}
                    </td>

                    {isIndiaShop && (
                    <td style={{ padding: "8px 6px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                      <span
                        onClick={() => {
                          if (!isSuperadmin || !onInlineEdit) return;
                          if (s.verified) {
                            const inv = s.invoiceNo || s.id || "";
                            if (!window.confirm("Remove verification for " + inv + "?")) return;
                          }
                          onInlineEdit(s.id, { verified: !s.verified });
                        }}
                        title={s.verified ? "Verified" : (isSuperadmin ? "Mark as verified" : "Not verified")}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 20, borderRadius: "50%", fontSize: 12, fontWeight: 900, lineHeight: 1,
                          cursor: isSuperadmin ? "pointer" : "default",
                          color: s.verified ? "#ffffff" : "#94a3b8",
                          border: s.verified ? "1px solid #15803d" : "1px solid #cbd5e1",
                          background: s.verified ? "#16a34a" : "#ffffff",
                          boxShadow: s.verified ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                          userSelect: "none"
                        }}
                      >{s.verified ? "✓" : "✕"}</span>
                    </td>
                    )}

                    {showCol("Refund")&&(
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      {Math.max(Number(s.adjAmt)||0,Number(s.refundAmt)||0)>0 ? (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
                          <span style={{fontFamily:"DM Mono,monospace",fontWeight:800,fontSize:12,
                            color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",
                            borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}}>
                            -{fmtAmt(Math.max(Number(s.adjAmt)||0,Number(s.refundAmt)||0))}
                          </span>
                          {s.adjType&&<span style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase"}}>{s.adjType}</span>}
                        </div>
                      ):(
                        <span style={{color:"#cbd5e1",fontSize:11}}>—</span>
                      )}
                    </td>

                    )}
                    {showCol("Payment")&&(
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Badge l={(isIndiaShop&&(s.pay==="BANK"||s.pay==="SIB"))?"SIB":(s.pay||"SHOP")} />
                      {(s.pay === "SHOP" || !s.pay) && s.shopInvoiceNo && (
                        <div style={{
                          fontSize: 10, fontFamily: "DM Mono,monospace",
                          color: "#64748b", marginTop: 3, whiteSpace: "nowrap",
                        }}>
                          {s.shopInvoiceNo}
                        </div>
                      )}
                    </td>
                    )}
                    {/* Status — inline editable dropdown */}
                    <td style={{ padding: "8px 10px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      {editStatusId === s.id ? (
                        <select
                          autoFocus
                          value={ful}
                          onChange={e => {
                            const newStatus = e.target.value;
                            setEditStatusId(null);
                            const gKey = getInstalmentKey(s);
                            const groupIds = gKey ? (instalmentGroups[gKey] || []).map(x => x.id) : [];
                            if (groupIds.length > 1) {
                              setCascadeConfirm({ saleId: s.id, newStatus, groupIds });
                            } else if (onInlineEdit) {
                              onInlineEdit(s.id, { ful: newStatus, status: newStatus });
                            }
                          }}
                          onBlur={() => setEditStatusId(null)}
                          style={{ padding: "5px 8px", borderRadius: 8, border: "1.5px solid #7dd3fc",
                            fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer",
                            background: "white", minWidth: 130 }}>
                          {(statusTabs || STATUS_TABS).map(t => (
                            <option key={t.key} value={t.key}>{t.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => setEditStatusId(s.id)}
                          title="Click to change status"
                          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Badge l={ful} />
                          <span style={{ fontSize: 9, color: "#94a3b8" }}>▼</span>
                        </div>
                      )}
                    </td>
                    {showCol("Tags")&&(
                    <td style={{ padding: "8px 16px" }}>
                      {s.tag ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {s.tag.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                            <span key={t} style={{
                              display: "inline-block", padding: "2px 8px",
                              borderRadius: 999, fontSize: 10, fontWeight: 700,
                              background: `${accent}12`, color: accent,
                              border: `1px solid ${accent}30`, whiteSpace: "nowrap",
                            }}>{t}</span>
                          ))}
                        </div>
                      ) : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                    </td>
                    )}
                    {/* Pur. Amount — ROS INDIA only */}
                    {isIndiaShop&&!isStaff&&showCol("Pur. Amount")&&(
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {s.purInvNo ? (
                          <span style={{
                            fontFamily: "DM Mono, monospace", fontSize: 12, fontWeight: 700,
                            color: "#166534", background: "#f0fdf4",
                            border: "1px solid #bbf7d0", borderRadius: 7,
                            padding: "3px 9px", whiteSpace: "nowrap",
                          }}>
                            {shop.symbol}{Number(s.purAmount||0).toLocaleString()}
                          </span>
                        ) : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                      </td>
                    )}
                    {/* Tracking */}
                    <td style={{ padding: "8px 10px", minWidth: 180 }} onClick={e => e.stopPropagation()}>
                      {editTrackingId === s.id ? (
                        <div style={{ display: "flex", flexDirection:"column", gap: 5 }}>
                          <input
                            autoFocus
                            value={trackingInput}
                            onChange={e => setTrackingInput(e.target.value.toUpperCase())}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                if (onSaveTracking) onSaveTracking(s.id, trackingInput.trim());
                                setEditTrackingId(null);
                              }
                              if (e.key === "Escape") setEditTrackingId(null);
                            }}
                            placeholder="Tracking no."
                            style={{
                              width: "100%", padding: "5px 8px", borderRadius: 7,
                              border: "1.5px solid #7dd3fc", fontSize: 11,
                              fontFamily: "DM Mono,monospace", outline: "none",
                              textTransform: "uppercase", boxSizing:"border-box",
                            }}
                          />
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={() => { if (onSaveTracking) onSaveTracking(s.id, trackingInput.trim()); setEditTrackingId(null); }}
                              style={{ flex:1, padding: "5px 8px", borderRadius: 7, border: "none", background: "#0369a1", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Save</button>
                            <button onClick={() => setEditTrackingId(null)}
                              style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                      ) : s.trackingNo ? (
                        <div style={{ display: "flex", flexDirection:"column", gap: 4 }}>
                          {/* Tracking number + edit */}
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            {(()=>{
                              const url = trackingURL(s.carrier, s.trackingNo);
                              return url ? (
                                <a href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 11, fontFamily: "DM Mono,monospace", fontWeight: 700, color: "#0369a1",
                                    textDecoration: "none", background: "#f0f9ff", border: "1px solid #bae6fd",
                                    borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap",
                                    maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}
                                  title={s.trackingNo}>{s.trackingNo}</a>
                              ) : (
                                <span style={{ fontSize: 11, fontFamily: "DM Mono,monospace", fontWeight: 700, color: "#0369a1",
                                  background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, padding: "3px 8px",
                                  whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}
                                  title={s.trackingNo}>{s.trackingNo}</span>
                              );
                            })()}
                            <button onClick={() => { setEditTrackingId(s.id); setTrackingInput(s.trackingNo || ""); }}
                              style={{ width: 20, height: 20, borderRadius: 5, border: "1px solid #e2e8f0", background: "white", color: "#94a3b8", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink:0 }}>✏️</button>
                          </div>
                          {/* Carrier selector */}
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <select
                              value={s.carrier||""}
                              onChange={e => { if(onInlineEdit) onInlineEdit(s.id,{carrier:e.target.value}); }}
                              style={{flex:1,padding:"3px 6px",borderRadius:6,border:"1px solid #e2e8f0",
                                fontSize:10,fontFamily:"inherit",outline:"none",color:"#64748b",background:"#f8fafc"}}>
                              <option value="">— Carrier —</option>
                              {CARRIERS.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                            {/* Copy tracking */}
                            <button onClick={()=>navigator.clipboard.writeText(s.trackingNo)}
                              title="Copy tracking number"
                              style={{width:22,height:22,borderRadius:5,border:"1px solid #e2e8f0",background:"white",
                                color:"#94a3b8",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              📋
                            </button>
                          </div>
                          {/* WhatsApp button */}
                          <button
                            onClick={async()=>{
                              openTrackingWA(s, s.carrier||CARRIERS[0], s.trackingNo);
                              if(onInlineEdit) await onInlineEdit(s.id,{trackingNotified:true});
                            }}
                            style={{
                              display:"flex",alignItems:"center",gap:5,padding:"4px 9px",
                              borderRadius:7,border:"none",
                              background:s.trackingNotified?"#dcfce7":"#25d366",
                              color:s.trackingNotified?"#166534":"white",
                              fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                              width:"100%",justifyContent:"center",
                            }}>
                            {s.trackingNotified ? "✅ Notified" : "💬 Send Tracking"}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditTrackingId(s.id); setTrackingInput(""); }}
                          style={{ padding: "4px 10px", borderRadius: 7, border: "1px dashed #bae6fd", background: "#f0f9ff", color: "#0369a1", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          + Add Tracking
                        </button>
                      )}
                    </td>

                    {/* Delivered */}
                    <td style={{ padding: "8px 10px", minWidth: 110 }} onClick={e => e.stopPropagation()}>
                      {s.deliveryDate ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 7, padding: "4px 9px" }}>
                          <span style={{ fontSize: 11 }}>✅</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", whiteSpace: "nowrap" }}>{fmtDate(s.deliveryDate)}</span>
                        </div>
                      ) : (s.ful || s.status) === "FULFILLED" ? (
                        <button onClick={() => { if (onMarkDelivered) onMarkDelivered(s); }}
                          style={{ padding: "4px 10px", borderRadius: 7, border: "1px dashed #86efac", background: "#f0fdf4", color: "#166534", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          ✅ Mark Delivered
                        </button>
                      ) : (
                        <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>
                      )}
                    </td>


                    {showCol("Informed")&&(
                    <td style={{ padding: "8px 10px", minWidth: 90 }} onClick={e => e.stopPropagation()}>
                      {s.deliveryDate ? (
                        s.deliveryInformed ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4,
                              background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 7,
                              padding: "3px 8px", whiteSpace: "nowrap" }}>
                              <span style={{ fontSize: 11 }}>✅</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#166534" }}>Informed</span>
                            </div>
                            <button onClick={() => {
                              const phone = (s.phone || s.contact || "").replace(/[^0-9]/g, "");
                              const retLink=`https://ros-bms.vercel.app/returns?shop=${shopId}`;
                              const signOff = shop?.short ? `ROS ${shop.short}` : "ROS";
                              const msg = `Dear ${s.customer||"Customer"},

We noticed that you may wish to return your recent order.

To help us process your request as quickly as possible, please submit your return request using the link below:
${retLink}

As outlined in our Returns Policy, the item must be received back by us within 14 days of the delivery date to be eligible for a refund or exchange. Returns received after this period may be declined or may incur additional return or handling charges, where applicable.

To avoid any delays or inconvenience, we kindly recommend submitting your return request as soon as possible. Early submission helps us provide you with return instructions promptly and ensures there is sufficient time for the item to reach us within the required timeframe.

Once we receive your request, our team will review it and get back to you as soon as possible.

Thank you for your cooperation and for shopping with ${signOff}.`;
                            setWaModal({ phone, customerName: s.customer, message: msg });
                            }}
                              style={{ padding: "3px 8px", borderRadius: 7, border: "1px solid #e2e8f0",
                                background: "white", color: "#374151", fontSize: 10, fontWeight: 600,
                                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                              ↩️ Return Link
                            </button>
                          </div>
                        ) : (
                          <button onClick={async () => {
                            const phone = (s.phone || s.contact || "").replace(/[^0-9]/g, "");
                            const msg = "Dear Customer,\nYour order has been marked as delivered according to the tracking update.\nPlease kindly check and inspect your item. If you have any issues or concerns, please contact us within 2 days of delivery so we can help you as quickly as possible.\nThank you for your purchase and for choosing ROS. We are always happy to assist you.\nThank you 😊";
                            setWaModal({ phone, customerName: s.customer, message: msg });
                            if (onMarkDeliveryInformed) await onMarkDeliveryInformed(s.id);
                          }}
                            style={{ padding: "4px 10px", borderRadius: 7, border: "1px dashed #25d366",
                              background: "#f0fdf4", color: "#166534", fontSize: 11, fontWeight: 700,
                              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                              display: "flex", alignItems: "center", gap: 4 }}>
                            <span>💬</span><span>Notify</span>
                          </button>
                        )
                      ) : (
                        <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>
                      )}
                    </td>

                    )}
                    {/* Dispatch From */}
                    {(()=>{
                      const defaultFrom = isIndiaShop ? "India-Unit1" : "UK";
                      const current = s.dispatchFrom || defaultFrom;
                      const isIndia = current.startsWith("India");
                      const isDefaultIndia = defaultFrom.startsWith("India");
                      const isCross = isIndia !== isDefaultIndia;
                      return showCol("From") ? (
                      <td style={{ padding: "8px 10px" }} onClick={e => e.stopPropagation()}>
                          <select
                            value={current}
                            onChange={e => {
                              const newVal = e.target.value;
                              const currentVal = s.dispatchFrom || defaultFrom;
                              if (currentVal && currentVal !== defaultFrom && newVal !== currentVal) {
                                if (!window.confirm("Change dispatch unit from '" + (currentVal==="India-Unit1"?"Unit 1":currentVal==="India-Unit2"?"Unit 2":currentVal) + "' to '" + (newVal==="India-Unit1"?"Unit 1":newVal==="India-Unit2"?"Unit 2":newVal) + "'?\n\nMake sure this is intentional.")) return;
                              }
                              const changes = { dispatchFrom: newVal };
                              if (onInlineEdit) onInlineEdit(s.id, changes);
                            }}
                            style={{
                              padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                              fontFamily: "inherit", cursor: "pointer", outline: "none",
                              border: "1px solid " + (isCross ? "#f97316" : "#e2e8f0"),
                              background: isCross ? "#fff7ed" : "#f8fafc",
                              color: isCross ? "#c2410c" : "#64748b",
                            }}>
                            {isIndiaShop ? (<>
                              <option value="India-Unit1">🇮🇳 India · Unit 1</option>
                              <option value="India-Unit2">🇮🇳 India · Unit 2</option>
                              <option value="UK">🇬🇧 UK</option>
                            </>) : (<>
                              <option value="UK">🇬🇧 UK</option>
                              <option value="India-Unit1">🇮🇳 India · Unit 1</option>
                              <option value="India-Unit2">🇮🇳 India · Unit 2</option>
                            </>)}
                          </select>
                          {isCross && (
                            <div style={{ fontSize: 9, color: "#f97316", fontWeight: 700, marginTop: 2, textAlign: "center" }}>
                              Cross-dispatch
                            </div>
                          )}
                        </td>
                      ) : null;
                    })()}

                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setInvoiceRow(s); }}
                          title="View Invoice"
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            border: "1px solid #e2e8f0", background: "white",
                            cursor: "pointer", fontSize: 14,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                          🧾
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setEditRow(s); setModal("edit-sale"); }}
                          title="Edit"
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            border: `1px solid ${accent}33`, background: `${accent}12`,
                            color: accent, cursor: "pointer", fontSize: 13,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                          ✏️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Table footer ── */}
        {sortedSales.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc",
          }}>
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
              {sortedSales.length} record{sortedSales.length !== 1 ? "s" : ""}
              {statusTab !== "ALL" && (
                <span style={{ color: activeTabCfg.color, fontWeight: 700 }}>
                  {" "}· {activeTabCfg.label}
                </span>
              )}
            </span>

          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          PENDING REPORT MODAL
         ══════════════════════════════════════════════════════════ */}
      {showReport && (() => {
        const UNFULFILLED = isIndiaShop
          ? ["PENDING","IN PROGRESS"]
          : ["PENDING"];
        const ALL_STATUSES = isIndiaShop
          ? ["PENDING","IN PROGRESS","FULFILLED","RETURN RQSTD","RETURN RCVD","EXCHANGED","REFUNDED","GOOD FEEDBACK RCVD","NEGATIVE FEEDBACK RCVD"]
          : ["PENDING","PROCESSING","ON HOLD","AWAITING PAYMENT"];

        // Use top-level state; init defaults on open
        const activeStatuses = rptStatuses || UNFULFILLED;
        const today = new Date(); today.setHours(0,0,0,0);
        const daysWaiting = (dateStr) => {
          if (!dateStr) return 0;
          const d = new Date(dateStr); d.setHours(0,0,0,0);
          return Math.floor((today - d) / 86400000);
        };

        const defaultFrom = isIndiaShop ? "India-Unit1" : "UK";

        const INST_TAGS_R = ["Advance Sale", "Part Payment", "Final Payment Sale"];
        // Build instalment groups — split by each Advance Sale date per customer
        const rInstGroupsRaw = {};
        sales.forEach(s => {
          const stags = (s.tag||"").split(",").map(t=>t.trim());
          if (!stags.some(t=>INST_TAGS_R.includes(t))) return;
          const ph = (s.phone||s.contact||"").replace(/[^0-9]/g,"").slice(-10);
          const nm = (s.customer||"").toLowerCase().trim();
          const k = nm+"__"+ph;
          if (!rInstGroupsRaw[k]) rInstGroupsRaw[k] = [];
          rInstGroupsRaw[k].push(s);
        });
        // Split each customer into separate order groups per Advance Sale
        const rInstGroups = {};
        Object.entries(rInstGroupsRaw).forEach(([custKey, custSales]) => {
          const sorted = [...custSales].sort((a,b)=>{
        const d=(a.date||"").localeCompare(b.date||"");
        if(d!==0)return d;
        return (a.invoiceNo||a.id||"").localeCompare(b.invoiceNo||b.id||"");
      });
          let grpKey = null; let gi = 0;
          sorted.forEach(s => {
            const st = (s.tag||"").split(",").map(t=>t.trim());
            if (st.includes("Advance Sale")) { gi++; grpKey = custKey+"__g"+gi; rInstGroups[grpKey]=[]; }
            if (grpKey) rInstGroups[grpKey].push(s);
          });
        });

        const filteredSales = sales
          .filter(s => {
            const st = (s.ful || s.status || "").toUpperCase();
            const normSt = st === 'WORK IN PROGRESS' ? 'IN PROGRESS' : st;
            const matchStatus = activeStatuses.some(r => normSt === r.toUpperCase() || st === r.toUpperCase());
            const dispFrom = s.dispatchFrom || defaultFrom;
            const isCross = dispFrom.startsWith('India') !== defaultFrom.startsWith('India');
            const effectiveFrom = (!s.dispatchFrom || s.dispatchFrom === '') ? defaultFrom : s.dispatchFrom;
            const matchUnit = rptUnit === 'ALL' || effectiveFrom === rptUnit;
            return matchStatus && (!crossOnly || isCross) && matchUnit;
          })
          .sort((a, b) => daysWaiting(b.date) - daysWaiting(a.date));

        // Deduplicate instalment groups — one row per group (advance sale leads)
        const seenRInst = new Set();
        const reportSales = [];
        filteredSales.forEach(s => {
          const stags = (s.tag||"").split(",").map(t=>t.trim());
          const isInst = stags.some(t=>INST_TAGS_R.includes(t));
          if (isInst) {
            const ph = (s.phone||s.contact||"").replace(/[^0-9]/g,"").slice(-10);
            const nm = (s.customer||"").toLowerCase().trim();
            const custKey2 = nm+"__"+ph;
            // Find which group this sale belongs to
            const gk = Object.keys(rInstGroups).find(k => k.startsWith(custKey2+"__g") && rInstGroups[k].some(x=>x.id===s.id)) || custKey2;
            if (!seenRInst.has(gk)) {
              seenRInst.add(gk);
              // Use all sales in group (all statuses) for payment breakdown display
              const fullGrp = rInstGroups[gk] || [s];
              // Representative row = earliest pending sale in group, or advance, or first
              const pendingSales = fullGrp.filter(x => activeStatuses.some(r=>(x.ful||x.status||"").toUpperCase()===r.toUpperCase()));
              const advance = fullGrp.find(x=>(x.tag||"").includes("Advance Sale")) || fullGrp[0];
              const rep = pendingSales.length > 0 ? (pendingSales.find(x=>(x.tag||"").includes("Advance Sale")) || pendingSales[0]) : advance;
              reportSales.push({...rep, _grp: fullGrp, _grouped: true, expectedTotal: advance.expectedTotal});
              seenRInst.add(gk);
            }
          } else {
            reportSales.push(s);
          }
        });

        const unitLabel = rptUnit === "India-Unit1" ? "Unit 1" : rptUnit === "India-Unit2" ? "Unit 2" : null;
        const reportTitle = isIndiaShop
          ? (unitLabel ? `ROS India — ${unitLabel} Dispatch Report` : "ROS India — Pending Dispatch Report")
          : "ROS UK — Pending Dispatch Report";

        const shopLabel = isIndiaShop ? "ROS India · INR" :
          shopId === "ros-hairlines" ? "ROS Hairlines UK · GBP" : "ROS Selections UK · GBP";

        const fmtD = d => {
          if (!d) return "—";
          try { const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; }
          catch { return d; }
        };

        const printReport = () => {
          const w = window.open("","_blank","width=900,height=700");

          const fmtAmt2 = v => fmt ? fmt(shopId, Number(v)||0) : (shop.symbol||"£") + (Number(v)||0).toLocaleString("en-IN");
          const tagLblP = x => {
            const t=(x.tag||"").split(",").map(t=>t.trim());
            return t.includes("Advance Sale")?"Advance":t.includes("Final Payment Sale")?"Final":t.includes("Part Payment")?"Part":"";
          };
          const tagColP = l => l==="Advance"?"#92400e":l==="Final"?"#166534":l==="Part"?"#5b21b6":"#374151";
          const tagBgP  = l => l==="Advance"?"#fffbeb":l==="Final"?"#f0fdf4":l==="Part"?"#f5f3ff":"white";

          const rows = reportSales.map(s => {
            const days = daysWaiting(s.date);
            const dispFrom = ((!s.dispatchFrom||s.dispatchFrom==='')?defaultFrom:s.dispatchFrom);
            const isCross = dispFrom.startsWith('India') !== defaultFrom.startsWith('India');
            const dayColor = days >= 5 ? "#dc2626" : days >= 3 ? "#d97706" : "#059669";

            // Build amount cell — instalment breakdown or single amount
            let amountCell = "";
            if (rptUnit !== "India-Unit1") {
              if (s._grouped && s._grp && s._grp.length > 0) {
                const grp = [...s._grp].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
                const expTotal = Number(s.expectedTotal)||0;
                const totalPaid = grp.reduce((a,x)=>a+(Number(x.amount)||0),0);
                const balance = expTotal > 0 ? expTotal - totalPaid : null;
                const lines = grp.map(x => {
                  const lbl = tagLblP(x);
                  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12;margin-bottom:2px">
                    <span style="font-size:10px;color:#94a3b8">${fmtD(x.date)}</span>
                    ${lbl?`<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:${tagBgP(lbl)};color:${tagColP(lbl)};font-weight:700">${lbl}</span>`:""}
                    <span style="font-weight:800;font-size:12px">${fmtAmt2(x.amount)}</span>
                  </div>`;
                }).join("");
                const balLine = balance !== null
                  ? `<div style="border-top:1px dashed #e2e8f0;margin-top:3px;padding-top:3px;text-align:right;font-weight:800;font-size:12px;color:${balance>0?"#dc2626":"#059669"}">${balance>0?"Bal: "+fmtAmt2(balance):"✅ Fully Paid"}</div>`
                  : "";
                amountCell = `<td style="vertical-align:top">${lines}${balLine}</td>`;
              } else {
                amountCell = `<td style="text-align:right;font-weight:800;vertical-align:top">${fmtAmt2(s.amount)}</td>`;
              }
            }

            return `<tr style="background:${isCross?"#fff7ed":"white"}">
              <td style="vertical-align:top">${fmtD(s.date)}</td>
              <td style="color:${dayColor};font-weight:700;vertical-align:top">${days}d</td>
              <td style="font-weight:700;vertical-align:top">${s.customer||"—"}</td>
              <td style="vertical-align:top">${s.phone||s.contact||"—"}</td>
              <td style="vertical-align:top">${s.item||"—"}</td>
              ${amountCell}
              <td style="vertical-align:top"><span style="background:#fef9c3;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${s.ful||s.status||"—"}</span></td>
              ${rptUnit==="ALL"?`<td style="vertical-align:top">${isCross?`<span style="color:#c2410c;font-weight:700">⚠ ${dispFrom}</span>`:`<span style="color:#64748b">${dispFrom}</span>`}</td>`:""}
            </tr>`;
          }).join("");

          w.document.write(`<!DOCTYPE html><html><head><title>${reportTitle}</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1e293b;}
            .header{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #e2e8f0;}
            .logo{width:48px;height:48px;background:#059669;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:18px;flex-shrink:0;}
            h1{margin:0;font-size:18px;color:#0f172a;}
            p{margin:2px 0 0;font-size:12px;color:#64748b;}
            table{width:100%;border-collapse:collapse;font-size:12px;}
            th{background:#f8fafc;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:2px solid #e2e8f0;}
            td{padding:8px 10px;border-bottom:1px solid #f1f5f9;}
            tr:hover td{background:#f8fafc;}
            .footer{margin-top:16px;font-size:11px;color:#94a3b8;text-align:right;}
            @media print{body{padding:10px;}button{display:none!important;}}
          </style></head><body>
          <div class="header">
            <div class="logo">ROS</div>
            <div>
              <h1>${reportTitle}</h1>
              <p>${shopLabel} · Generated ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
              <p>${reportSales.length} pending order${reportSales.length!==1?"s":""}</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Order Date</th><th>Waiting</th><th>Customer</th><th>Phone</th><th>Item</th>${rptUnit!=='India-Unit1'?'<th>Amount</th>':''}<th>Status</th>${rptUnit==='ALL'?'<th>Dispatch From</th>':''}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Developed by ROS Nexus · ros-bms.vercel.app · ${new Date().toLocaleDateString("en-GB")}</div>
          <script>window.onload=()=>window.print();<\/script>
          </body></html>`);
          w.document.close();
        };

        return (
          <div style={{position:"fixed",inset:0,zIndex:95,display:"flex",flexDirection:"column",background:"white"}}>
            {/* Report header */}
            <div style={{padding:"14px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",background:"white",flexShrink:0}}>
              <div style={{width:40,height:40,background:accent,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:900,fontSize:15,flexShrink:0}}>ROS</div>
              <div style={{flex:1}}>
                <h2 style={{margin:0,fontSize:16,fontWeight:900,color:"#0f172a"}}>{reportTitle}</h2>
                <p style={{margin:0,fontSize:11,color:"#64748b"}}>{shopLabel} · {reportSales.length} pending orders</p>
                {rptUnit!=="ALL"&&(
                  <div style={{marginTop:4,display:"inline-flex",alignItems:"center",gap:6,
                    padding:"3px 12px",borderRadius:999,
                    background:rptUnit==="India-Unit1"?"#eff6ff":"#f0fdf4",
                    border:"1px solid "+(rptUnit==="India-Unit1"?"#93c5fd":"#86efac")}}>
                    <span style={{fontSize:13,fontWeight:900,color:rptUnit==="India-Unit1"?"#1d4ed8":"#166534"}}>
                      {rptUnit==="India-Unit1"?"🏭 DISPATCH UNIT 1":"🏭 DISPATCH UNIT 2"}
                    </span>
                    {rptUnit==="India-Unit1"&&<span style={{fontSize:10,color:"#64748b"}}>Agency Staff · Prices Hidden</span>}
                    {rptUnit==="India-Unit2"&&<span style={{fontSize:10,color:"#64748b"}}>Own Staff</span>}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {/* Status filter pills */}
                {ALL_STATUSES.map(st => (
                  <button key={st} onClick={() => setRptStatuses(prev => {
                    const cur = prev || UNFULFILLED;
                    return cur.includes(st) ? cur.filter(x=>x!==st) : [...cur,st];
                  })}
                    style={{padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                      border:"1px solid "+(activeStatuses.includes(st)?accent:"#e2e8f0"),
                      background:activeStatuses.includes(st)?accent+"18":"white",
                      color:activeStatuses.includes(st)?accent:"#64748b"}}>
                    {st}
                  </button>
                ))}
                <div style={{width:1,height:20,background:"#e2e8f0"}}/>
                {isIndiaShop&&(<>
                  <div style={{width:1,height:20,background:"#e2e8f0"}}/>
                  <span style={{fontSize:11,color:"#64748b",fontWeight:600}}>Unit:</span>
                  {[["ALL","All Units"],["India-Unit1","Unit 1"],["India-Unit2","Unit 2"]].map(([val,lbl])=>(
                    <button key={val} onClick={()=>setRptUnit(val)}
                      style={{padding:"4px 12px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                        border:"1px solid "+(rptUnit===val?"#7c3aed":"#e2e8f0"),
                        background:rptUnit===val?"#f5f3ff":"white",color:rptUnit===val?"#7c3aed":"#64748b"}}>
                      {lbl}
                    </button>
                  ))}
                  <div style={{width:1,height:20,background:"#e2e8f0"}}/>
                </>)}
                <button onClick={()=>setCrossOnly(v=>!v)}
                  style={{padding:"4px 12px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                    border:"1px solid "+(crossOnly?"#f97316":"#e2e8f0"),
                    background:crossOnly?"#fff7ed":"white",color:crossOnly?"#c2410c":"#64748b"}}>
                  ⚠ Cross-dispatch only
                </button>
                <button onClick={printReport}
                  style={{padding:"8px 16px",borderRadius:9,border:"none",background:"#0f172a",color:"white",
                    fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                  🖨️ Print / PDF
                </button>
                <button onClick={()=>setShowReport(false)}
                  style={{padding:"8px 14px",borderRadius:9,border:"1px solid #e2e8f0",background:"white",color:"#374151",
                    fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{flex:1,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead style={{position:"sticky",top:0,zIndex:2}}>
                  <tr>
                    {["Order Date","Waiting","Customer","Phone","Item",...(rptUnit!=="India-Unit1"?["Amount"]:[]),"Status",...(rptUnit==="ALL"?["Dispatch From"]:[])].map(h=>(
                      <th key={h} style={{padding:"10px 16px",fontSize:11,fontWeight:800,color:"#64748b",
                        textTransform:"uppercase",letterSpacing:"0.05em",background:"#f8fafc",
                        borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap",
                        textAlign:h==="Amount"?"right":"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportSales.length===0?(
                    <tr><td colSpan={8} style={{padding:"80px 20px",textAlign:"center",color:"#94a3b8"}}>
                      <div style={{fontSize:40,marginBottom:12}}>✅</div>
                      <p style={{margin:0,fontSize:16,fontWeight:700}}>All clear — no pending orders</p>
                    </td></tr>
                  ):reportSales.map((s,i)=>{
                    const days = daysWaiting(s.date);
                    const dayColor = days>=5?"#dc2626":days>=3?"#d97706":"#059669";
                    const dayBg   = days>=5?"#fef2f2":days>=3?"#fffbeb":"#f0fdf4";
                    const dispFrom = s.dispatchFrom || defaultFrom;
                    const isCross = dispFrom !== defaultFrom;
                    return(
                      <tr key={s.id} style={{background:isCross?"#fff7ed":i%2===0?"white":"#fafafa",
                        borderBottom:"1px solid #f1f5f9",
                        borderLeft:isCross?"3px solid #f97316":"3px solid transparent"}}>
                        <td style={{padding:"11px 16px",color:"#374151",whiteSpace:"nowrap",fontSize:12}}>{fmtD(s.date)}</td>
                        <td style={{padding:"11px 16px"}}>
                          <span style={{fontSize:12,fontWeight:800,padding:"2px 9px",borderRadius:999,
                            background:dayBg,color:dayColor,border:"1px solid "+dayColor+"33",whiteSpace:"nowrap"}}>
                            {days}d
                          </span>
                        </td>
                        <td style={{padding:"11px 16px",fontWeight:700,color:"#0f172a"}}>{s.customer||"—"}</td>
                        <td style={{padding:"11px 16px",fontFamily:"DM Mono,monospace",fontSize:12,color:"#64748b"}}>{s.phone||s.contact||"—"}</td>
                        <td style={{padding:"11px 16px",color:"#374151",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.item||"—"}</td>
                        {rptUnit!=="India-Unit1"&&(
                          <td style={{padding:"11px 16px",textAlign:"right",verticalAlign:"top"}}>
                            {s._grouped ? (() => {
                              const grp = (s._grp||[s]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
                              const expTotal = Number(s.expectedTotal)||0;
                              const totalPaid = grp.reduce((a,x)=>a+(Number(x.amount)||0),0);
                              const balance = expTotal>0?expTotal-totalPaid:null;
                              const tagLbl = x => {
                                const t=(x.tag||"").split(",").map(t=>t.trim());
                                return t.includes("Advance Sale")?"Advance":t.includes("Final Payment Sale")?"Final":t.includes("Part Payment")?"Part":"Pmt";
                              };
                              const col = l => l==="Advance"?"#92400e":l==="Final"?"#166534":"#5b21b6";
                              const bg  = l => l==="Advance"?"#fffbeb":l==="Final"?"#f0fdf4":"#f5f3ff";
                              return(
                                <div>
                                  {grp.map(x=>(
                                    <div key={x.id} style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:5,marginBottom:2}}>
                                      <span style={{fontSize:10,color:"#94a3b8"}}>{fmtD(x.date)}</span>
                                      <span style={{fontSize:9,padding:"1px 5px",borderRadius:999,background:bg(tagLbl(x)),color:col(tagLbl(x)),fontWeight:700}}>{tagLbl(x)}</span>
                                      <span style={{fontWeight:800,fontSize:12,fontFamily:"DM Mono,monospace"}}>{fmt?fmt(shopId,Number(x.amount)||0):(shop.symbol||"£")+(Number(x.amount)||0).toLocaleString()}</span>
                                    </div>
                                  ))}
                                  {balance!==null&&(()=>{
                                    const hasFinalLocal=grp.some(x=>(x.tag||"").includes("Final Payment Sale"));
                                    return(
                                    <div style={{borderTop:"1px dashed #e2e8f0",paddingTop:3,marginTop:2,display:"flex",justifyContent:"flex-end"}}>
                                      <span style={{fontSize:10,fontWeight:800,color:(balance>0||!hasFinalLocal)?"#dc2626":"#059669"}}>{(balance>0||!hasFinalLocal)?"Bal: "+(fmt?fmt(shopId,Math.max(balance,0)):(shop.symbol||"£")+Math.max(balance,0).toLocaleString()):"✅ Fully Paid"}</span>
                                    </div>);
                                  })()}
                                </div>
                              );
                            })():(
                              <span style={{fontWeight:800,fontSize:12,fontFamily:"DM Mono,monospace"}}>
                                {fmt?fmt(shopId,Number(s.amount)||0):(shop.symbol||"£")+(Number(s.amount)||0).toLocaleString()}
                              </span>
                            )}
                          </td>
                        )}
                        <td style={{padding:"11px 16px"}}>
                          <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:999,
                            background:"#fef9c3",color:"#854d0e",border:"1px solid #fde047",whiteSpace:"nowrap"}}>
                            {s.ful||s.status||"—"}
                          </span>
                        </td>
                        {rptUnit==="ALL"&&(
                          <td style={{padding:"11px 16px"}}>
                            {isCross?(
                              <span style={{fontSize:12,fontWeight:700,color:"#c2410c",display:"flex",alignItems:"center",gap:4}}>
                                ⚠️ {dispFrom}
                                <span style={{fontSize:10,color:"#f97316"}}>cross</span>
                              </span>
                            ):(
                              <span style={{fontSize:12,color:"#64748b"}}>{dispFrom==="India-Unit1"?"🇮🇳 Unit 1":dispFrom==="India-Unit2"?"🇮🇳 Unit 2":dispFrom==="UK"?"🇬🇧 UK":dispFrom}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {reportSales.length>0&&(
              <div style={{padding:"10px 20px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",
                alignItems:"center",fontSize:12,color:"#64748b",background:"#f8fafc",flexShrink:0}}>
                <span>{reportSales.length} order{reportSales.length!==1?"s":""} pending</span>
                <span style={{fontWeight:700,color:"#0f172a"}}>
                  Total: {fmt?fmt(shopId,reportSales.reduce((a,s)=>a+(Number(s.amount)||0),0)):""}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Linked Transactions detail popup — shown when clicking a "🔗 Linked" chip */}
      {linkedGroupView && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(15,23,42,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setLinkedGroupView(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "white", borderRadius: 16, padding: "22px 24px",
            maxWidth: 620, width: "92%", maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                🔗 Linked Transactions ({linkedGroupView.length})
              </div>
              <button onClick={() => setLinkedGroupView(null)}
                style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
              {linkedGroupView[0]?.customer || "Customer"}{linkedGroupView[0]?.phone ? ` · ${linkedGroupView[0].phone}` : ""}
            </div>
            {(() => {
              const advanceSale = linkedGroupView.find(x => instalmentTagType(x) === "advance");
              const expectedTotal = Number(advanceSale?.expectedTotal) || 0;
              if (!expectedTotal) return null;
              const received = linkedGroupView.reduce((a, x) => a + (Number(x.amount) || 0), 0);
              const balance = expectedTotal - received;
              return (
                <div style={{
                  display: "flex", justifyContent: "space-between", gap: 10,
                  padding: "12px 14px", marginBottom: 12,
                  background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Total</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{fmt ? fmt(shopId, expectedTotal) : expectedTotal}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Amount Received</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{fmt ? fmt(shopId, received) : received}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: balance > 0 ? "#b91c1c" : "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Balance to Receive
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: balance > 0 ? "#b91c1c" : "#15803d" }}>
                      {fmt ? fmt(shopId, Math.max(balance, 0)) : Math.max(balance, 0)}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{ overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
              {linkedGroupView.map((gs, i) => {
                const gType = instalmentTagType(gs);
                const gColor = gType === "advance" ? "#f59e0b" : gType === "final" ? "#059669" : gType === "part" ? "#7c3aed" : "#94a3b8";
                const gLabel = gType === "advance" ? "💰 Advance" : gType === "final" ? "✅ Final" : gType === "part" ? "🔄 Part" : "";
                return (
                  <div key={gs.id} style={{
                    padding: "10px 14px", borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, padding: "1px 7px", borderRadius: 999,
                          background: gColor + "20", color: gColor, border: `1px solid ${gColor}44`,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>{gLabel}</span>
                        <span style={{ fontFamily: "DM Mono,monospace", fontWeight: 700, fontSize: 12, color: accent }}>{gs.id}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{gs.date || ""}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#374151" }}>{gs.item || "—"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {gs.pay || "—"} · {gs.ful || gs.status || "—"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {fmt ? fmt(shopId, Number(gs.amount) || 0) : gs.amount}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9",
            }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Total across {linkedGroupView.length} transactions</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                {fmt ? fmt(shopId, linkedGroupView.reduce((a, x) => a + (Number(x.amount) || 0), 0)) : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status cascade confirmation — shown when changing status on a sale
          that's part of an Advance/Part/Final Payment group */}
      {cascadeConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(15,23,42,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setCascadeConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "white", borderRadius: 16, padding: "24px 26px",
            maxWidth: 460, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Update linked transactions?
            </div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 14 }}>
              This sale is part of an instalment group (Advance / Part / Final Payment).
              Changing the status will update all <strong>{cascadeConfirm.groupIds.length}</strong> linked
              transaction{cascadeConfirm.groupIds.length !== 1 ? "s" : ""} to{" "}
              <strong>{(STATUS_TABS.find(t => t.key === cascadeConfirm.newStatus) || {}).label || cascadeConfirm.newStatus}</strong>.
            </div>
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 18,
              maxHeight: 220, overflowY: "auto",
            }}>
              {cascadeConfirm.groupIds.map((id, i) => {
                const gs = (sales || []).find(x => x.id === id);
                if (!gs) return null;
                return (
                  <div key={id} style={{
                    display: "flex", justifyContent: "space-between", gap: 10,
                    padding: "8px 12px", fontSize: 12,
                    borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                    background: id === cascadeConfirm.saleId ? "#f8fafc" : "white",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{gs.customer || "Customer"}</div>
                      <div style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                        {gs.date || ""} · {gs.item || ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {fmt ? fmt(shopId, Number(gs.amount) || 0) : gs.amount}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setCascadeConfirm(null)}
                style={{
                  padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0",
                  background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Cancel
              </button>
              <button onClick={() => {
                  const { saleId, newStatus } = cascadeConfirm;
                  setCascadeConfirm(null);
                  if (onInlineEdit) onInlineEdit(saleId, { ful: newStatus, status: newStatus });
                }}
                style={{
                  padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0",
                  background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Just This One
              </button>
              <button onClick={async () => {
                  const { newStatus, groupIds } = cascadeConfirm;
                  setCascadeConfirm(null);
                  await applyCascade(cascadeConfirm.saleId, newStatus, groupIds);
                }}
                style={{
                  padding: "9px 18px", borderRadius: 9, border: "none",
                  background: accent, color: "white", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Update All
              </button>
            </div>
          </div>
        </div>
      )}
      <WaModal data={waModal} onClose={() => setWaModal(null)}/>
      {manualLinkSale && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(15,23,42,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setManualLinkSale(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "white", borderRadius: 16, padding: "22px 24px",
            maxWidth: 480, width: "92%", maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>🔗 Link Transactions Manually</div>
              <button onClick={() => setManualLinkSale(null)}
                style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.4 }}>
              For when automatic grouping misses a pairing — e.g. a payment tagged wrong. Search below and pick the other transaction to link with <strong>{manualLinkSale.customer||"this sale"} — {fmt?fmt(shopId,Number(manualLinkSale.amount)||0):manualLinkSale.amount}</strong>.
            </div>
            <input value={manualLinkQuery} onChange={e=>setManualLinkQuery(e.target.value)}
              placeholder="Search by customer name or invoice…"
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1.5px solid #e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:12 }}/>
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
              {manualLinkQuery.trim().length>0 && sales
                .filter(s => s.id!==manualLinkSale.id &&
                  ((s.customer||"").toLowerCase().includes(manualLinkQuery.trim().toLowerCase()) ||
                   String(s.id||"").toLowerCase().includes(manualLinkQuery.trim().toLowerCase()) ||
                   String(s.invoiceNo||"").toLowerCase().includes(manualLinkQuery.trim().toLowerCase())))
                .slice(0,20)
                .map(s => {
                  const alreadyLinked = manualLinkSale.manualLinkGroup && s.manualLinkGroup===manualLinkSale.manualLinkGroup;
                  return (
                    <div key={s.id} onClick={async()=>{
                        if(alreadyLinked) return;
                        await handleManualLink(manualLinkSale, s);
                        setManualLinkSale(null);
                      }}
                      style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center", gap:10,
                        padding:"9px 11px", borderRadius:9, border:"1px solid #e2e8f0",
                        cursor: alreadyLinked?"default":"pointer",
                        background: alreadyLinked?"#f0fdf4":"white",
                      }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:12.5, color:"#0f172a" }}>{s.customer||"Customer"}</div>
                        <div style={{ fontSize:11, color:"#64748b" }}>{s.date} · {s.item||"—"}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontWeight:800, fontSize:13, color:"#0f172a" }}>{fmt?fmt(shopId,Number(s.amount)||0):s.amount}</div>
                        {alreadyLinked
                          ? <div style={{ fontSize:10, color:"#15803d", fontWeight:700 }}>✓ Linked</div>
                          : <div style={{ fontSize:10, color:"#2563eb", fontWeight:700 }}>Link →</div>}
                      </div>
                    </div>
                  );
                })}
              {manualLinkQuery.trim().length>0 && sales.filter(s => s.id!==manualLinkSale.id &&
                  ((s.customer||"").toLowerCase().includes(manualLinkQuery.trim().toLowerCase()) ||
                   String(s.id||"").toLowerCase().includes(manualLinkQuery.trim().toLowerCase()) ||
                   String(s.invoiceNo||"").toLowerCase().includes(manualLinkQuery.trim().toLowerCase()))).length===0 && (
                <div style={{ fontSize:12, color:"#94a3b8", textAlign:"center", padding:"12px 0" }}>No matching transactions found.</div>
              )}
            </div>
            {manualLinkSale.manualLinkGroup && (
              <button onClick={async()=>{ await handleManualUnlink(manualLinkSale); setManualLinkSale(null); }}
                style={{ marginTop:12, padding:"9px 0", borderRadius:9, border:"1px solid #fca5a5", background:"#fef2f2", color:"#dc2626", fontWeight:700, fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
                ✕ Remove this from its current manual link
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}