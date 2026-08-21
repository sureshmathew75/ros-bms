import { useState, useEffect, useMemo } from "react";
import { dbSaveDispatchEntry, dbLoadDispatchLog, dbDeleteDispatchEntry } from "../db";

/* ─────────────────────────────────────────────────────────────────────────
   DISPATCH PANEL  (all three shops — daily despatch log)

   Independent of the Sales table: entries live in their own `dispatch_log`
   Supabase table (see db.js) so one sale can be despatched in more than one
   parcel, and this page's data never overwrites anything the Sales tab
   manages. Adding an entry snapshots the customer/address/phone from the
   sale at that moment (still editable afterwards, e.g. to fix a typo on
   the label) and keeps a soft link back via saleId.

   NOTE ON DUPLICATION: WaModal and the tracking-message/URL builders below
   intentionally mirror the versions in SalesPanel.jsx. This codebase does
   not share components across panel files (see the note on WaModal in
   SalesPanel.jsx), so the same small pieces are duplicated here rather
   than introducing a new shared-imports architecture.
   ───────────────────────────────────────────────────────────────────────── */

/* ── localISO: Date → "YYYY-MM-DD" using LOCAL date parts (no UTC shift) ── */
function localISO(dt) {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}
const todayISO = () => localISO(new Date());

/* ── Shipper config — India and UK shops use different carrier lists,
   mirroring the same IN_CARRIERS/UK_CARRIERS split already used for the
   per-sale tracking field in SalesPanel.jsx. ────────────────────────── */
const IN_SHIPPERS = ["DTDC", "SPEEDPOST", "FEDEX", "DHL", "UPS", "Others"];
const UK_SHIPPERS = ["Royal Mail", "Evri", "DPD", "Parcelforce", "FedEx", "UPS", "Other"];

// Keyed uppercase and looked up uppercase so "FedEx" (UK) and "FEDEX"
// (India) share one color regardless of casing.
const SHIPPER_COLORS = {
  DTDC:         { bg: "#fef3c7", color: "#92400e" },
  SPEEDPOST:    { bg: "#dbeafe", color: "#1e40af" },
  FEDEX:        { bg: "#fee2e2", color: "#991b1b" },
  DHL:          { bg: "#fef9c3", color: "#854d0e" },
  UPS:          { bg: "#e0e7ff", color: "#3730a3" },
  "ROYAL MAIL": { bg: "#e0f2fe", color: "#075985" },
  EVRI:         { bg: "#fce7f3", color: "#9d174d" },
  DPD:          { bg: "#ecfccb", color: "#3f6212" },
  PARCELFORCE:  { bg: "#ede9fe", color: "#5b21b6" },
  OTHERS:       { bg: "#f1f5f9", color: "#475569" },
  OTHER:        { bg: "#f1f5f9", color: "#475569" },
};
const shipperColorFor = (shipper) => SHIPPER_COLORS[(shipper || "").toUpperCase()] || SHIPPER_COLORS.OTHERS;

const trackingURL = (shipper, trackNo) => {
  const cleanNo = (trackNo || "").replace(/\s+/g, "");
  if (!cleanNo) return null;
  switch ((shipper || "").toLowerCase()) {
    case "dtdc":         return `https://www.dtdc.com/track-your-shipment/`;
    case "speedpost":    return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    case "fedex":        return `https://www.fedex.com/wtrk/track/?trknbr=${cleanNo}`;
    case "dhl":          return `https://www.dhl.com/in-en/home/tracking.html?tracking-id=${cleanNo}&tracking-type=shipment`;
    case "ups":          return `https://www.ups.com/track?tracknum=${cleanNo}`;
    case "royal mail":   return `https://www.royalmail.com/track-your-item#/tracking-results/${cleanNo}`;
    case "evri":         return `https://www.evri.com/track/${cleanNo}`;
    case "dpd":          return `https://track.dpd.co.uk/parcels/${cleanNo}`;
    case "parcelforce":  return `https://www.parcelforce.com/track-trace?trackNumber=${cleanNo}`;
    default:             return null; // "Others"/"Other" — no deep tracking link available
  }
};

/* Mirrors buildTrackingMsg() in SalesPanel.jsx — same customer-facing
   wording, adapted to read from a dispatch-log entry instead of a sale. */
const buildDispatchTrackingMsg = (entry, shop) => {
  const url = trackingURL(entry.shipper, entry.trackingNo);
  const shipperName = (entry.shipper || "our courier").toUpperCase();
  const isDtdc = (entry.shipper || "").toUpperCase() === "DTDC";
  const trackLine = url
    ? isDtdc
      ? `*TRACKING* -- ${url}\n\nPlease enter your tracking number (${entry.trackingNo}) and the security code shown on the page to see your delivery status.`
      : `*TRACKING* -- ${url}`
    : `Your tracking number is: ${entry.trackingNo}`;
  const signOff = shop?.short ? `ROS ${shop.short}` : "ROS";
  return `Dear *${(entry.customer || "Customer").toUpperCase()}*,

Your order is now **ready to despatch!** 📦💜

━━━━━━━━━━━━━━━━━━

*📦 DELIVERY & TRACKING*

**Carrier:** ${shipperName}
**Tracking Number:** ${entry.trackingNo}

${trackLine}

Your parcel is expected to arrive within **1–3 working days**.

We kindly recommend keeping an eye on the tracking updates until your parcel has been successfully delivered.

━━━━━━━━━━━━━━━━━━

*🔎 IMPORTANT — PLEASE CHECK YOUR DELIVERY ADDRESS*

**Before every dispatch, we provide the recipient with the tracking details and a photo of the address label attached to the parcel.**

Please **carefully check the address shown on the label** and contact us as soon as possible if you notice any incorrect or missing information.

⚠️ **Once the address details have been checked and confirmed, any subsequent delivery issue resulting from incorrect or incomplete information in the confirmed address will be the responsibility of the recipient.**

This is why we strongly recommend checking the address label carefully **before or immediately after dispatch notification**, so that any genuine error can be brought to our attention at the earliest opportunity.

━━━━━━━━━━━━━━━━━━

*🚚 YOUR DELIVERY*

Once your parcel has been dispatched, it is our responsibility to ensure that it is handed over to the carrier correctly and sent securely to your delivery address.

However, we kindly ask you to **monitor the tracking regularly** and let us know immediately if you notice anything unusual, such as:

• An unexpected delivery delay
• An incorrect or unusual tracking update
• A delivery attempt you were not expecting
• Any other issue with the movement of your parcel

Early notification allows us to contact the carrier promptly and take the necessary steps to assist you.

━━━━━━━━━━━━━━━━━━

*⚠️ IMPORTANT — MARKED AS DELIVERED*

If the tracking shows that your parcel has been **delivered but you have not physically received it**, please contact us **on the same day**.

This is extremely important because reporting the issue promptly gives us the best opportunity to contact the carrier, investigate the delivery and, where necessary, recover the parcel.

If you notify us **on the same day that the parcel is marked as delivered**, we will take full responsibility for raising the matter with the carrier and will do everything reasonably possible to resolve it.

If the issue is reported later, it may become more difficult for us to investigate or recover the parcel. Any loss arising from a delayed notification may therefore become the responsibility of the recipient, particularly where the carrier's investigation or recovery options have become limited.

━━━━━━━━━━━━━━━━━━

*🔍 PLEASE CHECK YOUR ORDER PROMPTLY*

When your parcel arrives, please check the contents as soon as possible.

If you receive:

• A damaged item
• An incorrect item
• A missing item
• Or there is any other genuine concern with your order

please contact us via **WhatsApp within 2 days of delivery**.

We will always do our best to review genuine concerns promptly and find a fair solution.

Please note that concerns reported after this notification period may be more difficult to investigate and, where applicable, return or handling charges may apply in accordance with our return policy.

━━━━━━━━━━━━━━━━━━

*📦 IF YOUR PARCEL IS RETURNED TO US*

If a parcel is returned to us because of **repeated unsuccessful delivery attempts**, failure to receive the parcel, an incorrect/incomplete address, **non-payment of import charges or any levy on the parcel**, or other circumstances within the recipient's control, the responsibility for the resulting return rests with the recipient.

Once the parcel is safely returned to us, we will be happy to arrange a **refund or exchange**, subject to our applicable return policy.

Please note that any **additional shipping costs and other reasonable expenses incurred as a result of the parcel being returned and subsequently re-shipped** will be the responsibility of the recipient.

We strongly recommend following the tracking updates and making the necessary arrangements to receive the parcel promptly to avoid these additional costs.

━━━━━━━━━━━━━━━━━━

*🌍 INTERNATIONAL ORDERS*

For international shipments, customs regulations, import duties, taxes and clearance procedures vary from country to country.

Depending on the destination country's applicable customs regulations and tariff policies, your parcel may be subject to:

• Import duties
• Customs charges
• VAT or other taxes
• Clearance or government-imposed fees

These charges are determined by the **customs authorities of the destination country** and are completely outside our control.

Any applicable customs or import charges are the **responsibility of the customer**.

Please note that these charges are **not shipping charges**. We have already paid the applicable shipping cost for your parcel before dispatch.

If required, we will be happy to provide the relevant **shipping invoice or proof of postage** upon request.

━━━━━━━━━━━━━━━━━━

*💜 OUR COMMITMENT TO YOU*

We genuinely appreciate your order and your trust in ${signOff}.

Our aim is to make sure your parcel reaches you **safely and securely**. Your cooperation in checking the address, monitoring the tracking and informing us promptly of any unusual activity helps us resolve any delivery issues as quickly as possible.

Thank you for your trust and continued support.

We hope you enjoy your purchase! 💜

*${signOff}*`;
};

/* ── WaModal: mirrors the one in SalesPanel.jsx (files don't share
   components). Lets staff copy the message or open WhatsApp directly. ─── */
const WaModal = ({ data, onClose }) => {
  if (!data) return null;
  const { phone, customerName, message } = data;
  const clean = (phone || "").replace(/\D/g, "");
  // Matches the WaModal in SalesPanel.jsx exactly — same "0" -> "44"
  // heuristic used there across all three shops.
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
    const url = clean
      ? "https://wa.me/" + e164 + "?text=" + encodeURIComponent(message)
      : "https://api.whatsapp.com/send?text=" + encodeURIComponent(message);
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "22px 24px", maxWidth: 460, width: "92%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>💬 Send Despatch Notification</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
        </div>
        {(customerName || phone) && (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{customerName || "Customer"}</div>
            <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>📱 {phone || "No phone on file"}</div>
          </div>
        )}
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

/* ── Week helpers ─────────────────────────────────────────────────────
   Monday–Sunday, mirroring the "week" period convention used elsewhere
   in this app (see the header comment in SalesPanel.jsx). ─────────────── */
function mondayOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt;
}
function ddmmyyyy(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
function weekdayName(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long" });
}
function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
const currentMonthKey = () => todayISO().slice(0, 7);

/* ── Dismissed-sale tracking ──────────────────────────────────────────
   Auto-add (below) creates a row for any "Ready to Ship" sale that isn't
   on the log. Deleting that row doesn't un-flag the sale in Sales, so
   without this, auto-add would immediately recreate the row it was just
   deleted — kept in localStorage (per shop) so an admin's deletion
   sticks across reloads. Manually re-adding via search still works;
   this only stops the AUTOMATIC re-add. ───────────────────────────────── */
function dismissedKey(shopId) { return `ros_dispatch_dismissed_${shopId}`; }
function loadDismissed(shopId) {
  try { return JSON.parse(localStorage.getItem(dismissedKey(shopId)) || "{}"); }
  catch { return {}; }
}
function saveDismissed(shopId, map) {
  try { localStorage.setItem(dismissedKey(shopId), JSON.stringify(map)); } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════
   DISPATCH PANEL
   ═══════════════════════════════════════════════════════════════════════ */
export default function DispatchPanel({ shop, shopId, user, sales, onSaleUpdate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekAnchor, setWeekAnchor] = useState(todayISO()); // any date within the visible week
  const [addDate, setAddDate] = useState(todayISO());       // which day new adds land on
  const [search, setSearch] = useState("");
  const [waModal, setWaModal] = useState(null);
  const [savingIds, setSavingIds] = useState({}); // uuid -> true while a save is in flight
  const [viewMode, setViewMode] = useState("log"); // "log" | "calendar"
  const [calMonth, setCalMonth] = useState(currentMonthKey()); // "YYYY-MM" shown in Calendar view
  const [dismissedSaleIds, setDismissedSaleIds] = useState({}); // sale id -> true, blocks auto-re-add after a manual delete
  // Per-day collapse state for the Log view — only holds entries the user
  // has explicitly toggled THIS session; any date not in here just falls
  // back to the default (today expanded, every other day collapsed), and
  // that default is what you get again on the next page load/refresh —
  // collapse state is intentionally not persisted.
  const [collapsedDates, setCollapsedDates] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await dbLoadDispatchLog(shopId);
      if (!cancelled) { setEntries(rows || []); setLoading(false); }
    })();
    setDismissedSaleIds(loadDismissed(shopId));
    return () => { cancelled = true; };
  }, [shopId]);

  const allSales = sales || [];
  // Only admins/superadmins can delete a row — despatch staff can add,
  // edit, and notify, but not remove entries from the log.
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isIndiaShop = shopId === "ros-india" || shopId === "ros-india-staff";
  const SHIPPERS = isIndiaShop ? IN_SHIPPERS : UK_SHIPPERS;

  /* ── Linked-transaction grouping ──────────────────────────────────────
     A single customer parcel can be split across several sale rows
     (Advance/Part/Final payment, or two rows manually linked in Sales).
     Mirrors SalesPanel.jsx's own instalment-grouping logic so that if the
     "Ready to Ship" chip gets pressed on more than one of those linked
     rows, they still collapse to ONE despatch log entry instead of one
     per transaction. Kept as a local copy (rather than a shared import)
     since both files already duplicate a few small helpers like this and
     neither imports from the other. */
  const inferPaymentType = (sale) => {
    if (sale.paymentType) return sale.paymentType;
    const tags = (sale.tag || "").split(",").map(t => t.trim());
    if (tags.includes("Advance Sale")) return "ADVANCE";
    if (tags.includes("Final Payment Sale")) return "FINAL";
    if (tags.includes("Part Payment")) return "PART";
    return "FULL";
  };
  const tagPriority = (s) => {
    const pt = inferPaymentType(s);
    if (pt === "ADVANCE") return 0;
    if (pt === "FINAL") return 2;
    return 1;
  };
  const { saleGroupKey, groupMembers } = useMemo(() => {
    const rawGroups = {};
    allSales.forEach(s => {
      if (inferPaymentType(s) === "FULL") return; // never grouped
      const phone = (s.phone || s.contact || "").replace(/\D/g, "").slice(-10);
      const name = (s.customer || "").toLowerCase().trim();
      if (!phone && !name) return;
      const key = `${name}__${phone}`;
      (rawGroups[key] ||= []).push(s);
    });
    const result = {};
    Object.entries(rawGroups).forEach(([custKey, custSales]) => {
      const sorted = [...custSales].sort((a, b) => {
        const d = (a.date || "").localeCompare(b.date || "");
        if (d !== 0) return d;
        const p = tagPriority(a) - tagPriority(b);
        if (p !== 0) return p;
        return (a.invoiceNo || a.id || "").localeCompare(b.invoiceNo || b.id || "");
      });
      let groupIdx = 0, currentKey = null, dealOpen = false;
      for (const s of sorted) {
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
    // Manual link merge pass — same as SalesPanel: sales sharing a
    // manualLinkGroup value are unified into one group regardless of what
    // the automatic Advance/Part/Final pass did with them.
    const byManualLink = {};
    allSales.forEach(s => { if (s.manualLinkGroup) (byManualLink[s.manualLinkGroup] ||= []).push(s); });
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
    const keyOf = {};
    Object.entries(result).forEach(([gk, members]) => { members.forEach(s => { keyOf[s.id] = gk; }); });
    return { saleGroupKey: keyOf, groupMembers: result };
  }, [allSales]);
  // A sale with no linked payments is its own solo "group" of one.
  const despatchKeyOf = (sale) => saleGroupKey[sale.id] || sale.id;
  // Which sale should represent the group on the despatch row — prefer the
  // Advance (it usually carries the address/phone first), else whichever
  // transaction comes first in the same Advance→Part→Final ordering used
  // to build the groups above.
  const anchorSaleForGroup = (members) => {
    if (!members || !members.length) return null;
    const advance = members.find(m => inferPaymentType(m) === "ADVANCE");
    if (advance) return advance;
    return [...members].sort((a, b) => {
      const d = (a.date || "").localeCompare(b.date || "");
      if (d !== 0) return d;
      return tagPriority(a) - tagPriority(b);
    })[0];
  };

  // The 7 dates (Mon→Sun) of the week currently in view.
  const weekDates = useMemo(() => {
    const mon = mondayOf(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(d.getDate() + i);
      return localISO(d);
    });
  }, [weekAnchor]);

  // Sale ids already present anywhere in the log — used to badge search
  // results as "already added" (still addable again, e.g. multi-parcel).
  const loggedSaleIds = useMemo(() => {
    const m = {};
    entries.forEach(e => { if (e.saleId) m[e.saleId] = (m[e.saleId] || 0) + 1; });
    return m;
  }, [entries]);

  // Which despatch GROUPS (see grouping helpers above) already have a row
  // on the log — this is what the auto-add effect checks, so linked
  // transactions collapse to one entry regardless of how many of them get
  // individually flagged "Ready to Ship".
  const loggedGroupKeys = useMemo(() => {
    const s = new Set();
    entries.forEach(e => {
      if (!e.saleId) return;
      const linkedSale = allSales.find(x => x.id === e.saleId);
      s.add(linkedSale ? despatchKeyOf(linkedSale) : e.saleId);
    });
    return s;
  }, [entries, allSales, saleGroupKey]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return allSales.filter(s => {
      const name = (s.customer || "").toLowerCase();
      const phone = (s.phone || s.contact || "").replace(/\D/g, "");
      return name.includes(q) || (digits && phone.includes(digits));
    })
      .sort((a, b) => (b.readyToShip ? 1 : 0) - (a.readyToShip ? 1 : 0))
      .slice(0, 12);
  }, [allSales, search]);

  // Entries for the visible week, grouped by date — every date in
  // weekDates gets an array (empty ones included) so each day block
  // always renders, matching the "show the date even if nothing shipped"
  // layout.
  const entriesByDate = useMemo(() => {
    const m = {};
    weekDates.forEach(d => { m[d] = []; });
    entries.forEach(e => { if (m[e.dispatchDate]) m[e.dispatchDate].push(e); });
    weekDates.forEach(d => { m[d].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")); });
    return m;
  }, [entries, weekDates]);

  const weekEntries = useMemo(() => weekDates.flatMap(d => entriesByDate[d]), [weekDates, entriesByDate]);

  // Only show days that (a) aren't in the future — a future date can't
  // have despatches yet, so it's just clutter — and (b) actually have at
  // least one entry, so an empty past day doesn't take up space either.
  const visibleWeekDates = useMemo(() => {
    const today = todayISO();
    return weekDates.filter(d => d <= today && entriesByDate[d].length > 0);
  }, [weekDates, entriesByDate]);

  // Per-day counts across the ENTIRE log (not just the visible week) —
  // feeds the Calendar view's day badges.
  const calendarCounts = useMemo(() => {
    const m = {};
    entries.forEach(e => { if (e.dispatchDate) m[e.dispatchDate] = (m[e.dispatchDate] || 0) + 1; });
    return m;
  }, [entries]);

  // Month-by-month totals across the entire log, most recent first, with
  // a month-over-month % change — the "business growth" trend view.
  const monthlyTotals = useMemo(() => {
    const m = {};
    entries.forEach(e => {
      if (!e.dispatchDate) return;
      const key = e.dispatchDate.slice(0, 7);
      m[key] = (m[key] || 0) + 1;
    });
    const keys = Object.keys(m).sort();
    const maxCount = Math.max(1, ...Object.values(m));
    return keys.map((key, i) => {
      const prev = i > 0 ? m[keys[i - 1]] : null;
      const delta = prev ? Math.round(((m[key] - prev) / prev) * 100) : null;
      return { key, label: monthLabel(key), count: m[key], delta, pct: Math.round((m[key] / maxCount) * 100) };
    }).reverse();
  }, [entries]);

  // Calendar grid cells for calMonth — null for the leading/trailing
  // blanks so the grid lines up under Mon..Sun headers.
  const calCells = useMemo(() => {
    const [y, m] = calMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const startDow = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [calMonth]);

  // Tracking numbers already used ANYWHERE in the log (not just this
  // week) — for the duplicate guard. Keyed by uppercased, whitespace-
  // stripped tracking number.
  const trackingIndex = useMemo(() => {
    const m = {};
    entries.forEach(e => {
      const key = (e.trackingNo || "").replace(/\s+/g, "").toUpperCase();
      if (!key) return;
      (m[key] = m[key] || []).push(e.uuid);
    });
    return m;
  }, [entries]);

  const summary = useMemo(() => {
    const total = weekEntries.length;
    const noTracking = weekEntries.filter(e => !e.trackingNo).length;
    const notNotified = weekEntries.filter(e => !e.notified).length;
    return { total, noTracking, notNotified };
  }, [weekEntries]);

  const persist = async (uuidOrNull, payload) => {
    setSavingIds(p => ({ ...p, [uuidOrNull || "__new__"]: true }));
    const res = await dbSaveDispatchEntry(shopId, uuidOrNull ? { ...payload, _uuid: uuidOrNull } : payload);
    setSavingIds(p => { const n = { ...p }; delete n[uuidOrNull || "__new__"]; return n; });
    return res;
  };

  const addFromSale = async (sale) => {
    const draft = {
      saleId: sale.id,
      dispatchDate: addDate,
      customer: sale.customer || "",
      phone: sale.phone || sale.contact || "",
      address: sale.address || "",
      trackingNo: "",
      shipper: "",
      notified: false,
      remarks: "",
    };
    const res = await persist(null, draft);
    if (res?.error) { alert("Could not add to dispatch log: " + res.error); return; }
    setEntries(prev => [...prev, { ...draft, uuid: res.uuid, createdAt: new Date().toISOString() }]);
    setSearch("");
    // Jump the visible week to wherever the new row landed, so it's
    // immediately visible even if addDate falls outside the current view.
    setWeekAnchor(addDate);
  };

  // Auto-add: any sale flagged "Ready to Ship" in the Sales tab that
  // isn't on the log yet gets added automatically, dated today — no
  // click needed. (Earlier this was a manual click-to-add suggestion;
  // changed to fully automatic per explicit request.) A sale un-flagged
  // later does NOT remove its row — despatch staff may already have
  // typed tracking info into it, so that stays intact; remove it by
  // hand with the row's ✕ if it was added in error.
  //
  // De-duplicated at the GROUP level: when a sale is one of several linked
  // transactions (Advance/Part/Final, or manually linked), pressing "Ready
  // to Ship" on more than one of them must still only create ONE despatch
  // row for that parcel, not one per transaction.
  useEffect(() => {
    if (loading) return;
    const seenKeys = new Set();
    const toAdd = [];
    allSales.forEach(s => {
      if (!s.readyToShip) return;
      const key = despatchKeyOf(s);
      if (loggedGroupKeys.has(key) || dismissedSaleIds[key] || seenKeys.has(key)) return;
      seenKeys.add(key);
      toAdd.push(anchorSaleForGroup(groupMembers[key]) || s);
    });
    if (!toAdd.length) return;
    let cancelled = false;
    (async () => {
      for (const sale of toAdd) {
        const draft = {
          saleId: sale.id,
          dispatchDate: todayISO(),
          customer: sale.customer || "",
          phone: sale.phone || sale.contact || "",
          address: sale.address || "",
          trackingNo: "",
          shipper: "",
          notified: false,
          remarks: "",
        };
        const res = await persist(null, draft);
        if (cancelled) return;
        if (!res?.error) {
          setEntries(prev => [...prev, { ...draft, uuid: res.uuid, createdAt: new Date().toISOString() }]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loading, allSales, loggedGroupKeys, dismissedSaleIds, saleGroupKey]);

  const updateEntry = (uuid, patch) => {
    setEntries(prev => prev.map(e => e.uuid === uuid ? { ...e, ...patch } : e));
  };

  const saveEntry = async (uuid, patch) => {
    const current = entries.find(e => e.uuid === uuid);
    if (!current) return;
    const merged = { ...current, ...patch };
    updateEntry(uuid, patch);
    const res = await persist(uuid, merged);
    if (res?.error) { alert("Could not save change: " + res.error); return; }
    // Once both tracking number and shipper are on the row — the same
    // point that unlocks the "Send Notification" button — push it back
    // to the linked sale (tracking + carrier) and mark that sale Fulfilled.
    const touchedTrackingOrShipper = ("trackingNo" in patch) || ("shipper" in patch);
    if (touchedTrackingOrShipper && merged.saleId && merged.trackingNo && merged.shipper && onSaleUpdate) {
      onSaleUpdate(merged.saleId, { trackingNo: merged.trackingNo, carrier: merged.shipper });
    }
  };

  const removeEntry = async (uuid) => {
    if (!isAdmin) return; // guarded here too, not just in the UI
    if (!window.confirm("Remove this row from the despatch log? This cannot be undone.")) return;
    const removed = entries.find(e => e.uuid === uuid);
    setEntries(prev => prev.filter(e => e.uuid !== uuid));
    await dbDeleteDispatchEntry(uuid, shopId);
    // Stop auto-add from immediately recreating this row — the linked
    // sale (or, if it's part of a linked group, ANY sale in that group)
    // is likely still flagged "Ready to Ship" in Sales.
    if (removed?.saleId) {
      const linkedSale = allSales.find(x => x.id === removed.saleId);
      const key = linkedSale ? despatchKeyOf(linkedSale) : removed.saleId;
      setDismissedSaleIds(prev => {
        const next = { ...prev, [key]: true };
        saveDismissed(shopId, next);
        return next;
      });
    }
  };

  const notify = (entry) => {
    const phone = (entry.phone || "").replace(/[^0-9]/g, "");
    if (!phone) { alert("No phone number on this row."); return; }
    const message = buildDispatchTrackingMsg(entry, shop);
    setWaModal({
      phone, customerName: entry.customer, message,
      onSent: () => saveEntry(entry.uuid, { notified: true }),
    });
  };

  const copyWeekList = async () => {
    const lines = [`Despatch — ${ddmmyyyy(weekDates[0])} to ${ddmmyyyy(weekDates[6])}`, ""];
    visibleWeekDates.forEach(d => {
      const dayList = entriesByDate[d];
      lines.push(`${ddmmyyyy(d)} (${dayList.length})`);
      dayList.forEach((e, i) => lines.push(
        `  ${i + 1}. ${e.customer || "—"} — ${e.phone || "—"} — ${e.trackingNo || "no tracking yet"} (${e.shipper || "no shipper"})`
      ));
      lines.push("");
    });
    const text = lines.join("\n").trim();
    try { await navigator.clipboard.writeText(text); alert("Week's despatch list copied."); }
    catch { alert(text); }
  };

  /* Bulk WhatsApp — bundles the whole visible week into one message,
     grouped by day, with no fixed recipient — for pinging an internal
     despatch group chat. Mirrors the old Dispatch Sheet's "Send via
     WhatsApp" button in SalesPanel.jsx. */
  const sendBulkWhatsApp = () => {
    const lines = [`🚚 *Despatch Log* — ${ddmmyyyy(weekDates[0])} to ${ddmmyyyy(weekDates[6])}`, `${weekEntries.length} item${weekEntries.length !== 1 ? "s" : ""}`, ""];
    visibleWeekDates.forEach(d => {
      const dayList = entriesByDate[d];
      lines.push(`*${ddmmyyyy(d)}*`);
      dayList.forEach((e, i) => {
        lines.push(`${i + 1}. ${e.customer || "—"}`);
        lines.push(e.address || "No address on file");
        lines.push(`Phone: ${e.phone || "—"}`);
        lines.push(`Tracking: ${e.trackingNo || "—"} (${e.shipper || "no shipper"})`);
        if (e.remarks) lines.push(`Remarks: ${e.remarks}`);
        lines.push("");
      });
    });
    setWaModal({ phone: "", customerName: "", message: lines.join("\n").trim() });
  };

  /* Print — clean tabular printout of the visible week, one table per
     day that actually has despatches (matching the on-screen Log view —
     no empty or future-dated sections). Mirrors the old Dispatch Sheet's
     "Print / Export" button in SalesPanel.jsx, extended with this page's
     extra columns. */
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const sections = visibleWeekDates.map(d => {
      const dayList = entriesByDate[d];
      const rows = dayList.map((e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${e.customer || "—"}</td>
          <td style="white-space:pre-line">${e.address || "—"}</td>
          <td>${e.phone || "—"}</td>
          <td>${e.trackingNo || "—"}</td>
          <td>${e.shipper || "—"}</td>
          <td>${e.remarks || "—"}</td>
        </tr>`).join("");
      return `
        <h2>${weekdayName(d)}, ${ddmmyyyy(d)} — ${dayList.length} item${dayList.length !== 1 ? "s" : ""}</h2>
        <table><thead><tr><th>#</th><th>Customer</th><th>Address</th><th>Phone</th><th>Tracking No.</th><th>Shipper</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join("") || `<p style="color:#94a3b8;font-size:12px;">No despatches recorded this week.</p>`;
    w.document.write(`<!DOCTYPE html><html><head><title>Despatch Log — ${ddmmyyyy(weekDates[0])} to ${ddmmyyyy(weekDates[6])}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0f172a;}
        h1{font-size:18px;margin-bottom:4px;} p{color:#64748b;font-size:12px;margin-top:0;}
        h2{font-size:13px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:0.04em;color:#475569;}
        table{width:100%;border-collapse:collapse;} th,td{border:1px solid #e2e8f0;padding:8px 10px;font-size:12px;text-align:left;vertical-align:top;}
        th{background:#f8fafc;text-transform:uppercase;letter-spacing:0.04em;font-size:10px;}
      </style></head><body>
      <h1>🚚 Despatch Log</h1>
      <p>${ddmmyyyy(weekDates[0])} – ${ddmmyyyy(weekDates[6])} · ${weekEntries.length} item${weekEntries.length !== 1 ? "s" : ""}</p>
      ${sections}
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const shiftWeek = (offsetWeeks) => {
    const mon = mondayOf(weekAnchor);
    mon.setDate(mon.getDate() + offsetWeeks * 7);
    setWeekAnchor(localISO(mon));
  };
  // Can't navigate past the week that contains today — future weeks are
  // guaranteed empty, so there's nothing useful to page forward into.
  const atCurrentWeekOrLater = mondayOf(weekAnchor).getTime() >= mondayOf(todayISO()).getTime();

  const shiftMonth = (offset) => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const atCurrentMonthOrLater = calMonth >= currentMonthKey();

  const jumpToDay = (iso) => {
    setViewMode("log");
    setWeekAnchor(iso);
  };

  return (
    <div style={{ padding: "20px 22px", maxWidth: 1180, margin: "0 auto" }}>
      {waModal && <WaModal data={waModal} onClose={() => { waModal.onSent && waModal.onSent(); setWaModal(null); }} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>🚚 Despatch Log</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
            {viewMode === "log"
              ? `${ddmmyyyy(weekDates[0])} – ${ddmmyyyy(weekDates[6])} · one row per parcel, grouped by day`
              : "Calendar & monthly trend"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setViewMode("log")}
              style={{ padding: "8px 14px", border: "none", background: viewMode === "log" ? "#0f172a" : "white", color: viewMode === "log" ? "white" : "#475569", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              📋 Log
            </button>
            <button onClick={() => setViewMode("calendar")}
              style={{ padding: "8px 14px", border: "none", background: viewMode === "calendar" ? "#0f172a" : "white", color: viewMode === "calendar" ? "white" : "#475569", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              📅 Calendar
            </button>
          </div>
          {viewMode === "log" && (
            <>
              <button onClick={() => shiftWeek(-1)} style={pillBtnStyle}>← Previous Week</button>
              <input type="date" value={weekAnchor} max={todayISO()} onChange={e => setWeekAnchor(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit" }} />
              <button onClick={() => setWeekAnchor(todayISO())} style={pillBtnStyle}>This Week</button>
              <button onClick={() => !atCurrentWeekOrLater && shiftWeek(1)} disabled={atCurrentWeekOrLater}
                style={{ ...pillBtnStyle, opacity: atCurrentWeekOrLater ? 0.4 : 1, cursor: atCurrentWeekOrLater ? "not-allowed" : "pointer" }}>
                Next Week →
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === "log" && (
      <>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <SummaryChip label="Rows this week" value={summary.total} bg="#f1f5f9" color="#334155" />
        <SummaryChip label="Awaiting tracking" value={summary.noTracking} bg={summary.noTracking ? "#fef3c7" : "#f1f5f9"} color={summary.noTracking ? "#92400e" : "#334155"} />
        <SummaryChip label="Not yet notified" value={summary.notNotified} bg={summary.notNotified ? "#fee2e2" : "#f1f5f9"} color={summary.notNotified ? "#991b1b" : "#334155"} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handlePrint} disabled={!weekEntries.length}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#334155", fontWeight: 700, fontSize: 12.5, cursor: weekEntries.length ? "pointer" : "not-allowed", opacity: weekEntries.length ? 1 : 0.5, fontFamily: "inherit" }}>
            🖨️ Print / Export
          </button>
          <button onClick={sendBulkWhatsApp} disabled={!weekEntries.length}
            title="Send the whole week's sheet as one message, grouped by day — no fixed recipient, for your despatch team chat"
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: weekEntries.length ? "#25D366" : "#f1f5f9", color: weekEntries.length ? "white" : "#94a3b8", fontWeight: 700, fontSize: 12.5, cursor: weekEntries.length ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            💬 Send Sheet via WhatsApp
          </button>
          <button onClick={copyWeekList} disabled={!weekEntries.length}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#334155", fontWeight: 700, fontSize: 12.5, cursor: weekEntries.length ? "pointer" : "not-allowed", opacity: weekEntries.length ? 1 : 0.5, fontFamily: "inherit" }}>
            📋 Copy Week's List
          </button>
        </div>
      </div>

      {/* Search-to-add */}
      <div style={{ marginBottom: 22, display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 260, position: "relative" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search customer name or phone to add to the despatch log…"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" }}
          />
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 30px rgba(15,23,42,0.12)", zIndex: 50, maxHeight: 320, overflowY: "auto" }}>
              {searchResults.map(s => (
                <div key={s.id} onClick={() => addFromSale(s)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.customer || "—"}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>{s.phone || s.contact || "No phone"} · {s.item || "—"}</div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", gap: 6 }}>
                    {s.readyToShip && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#166534", background: "#dcfce7", borderRadius: 999, padding: "2px 8px" }}>Ready</span>
                    )}
                    {loggedSaleIds[s.id] && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 999, padding: "2px 8px" }}>
                        already on log ×{loggedSaleIds[s.id]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b", fontWeight: 700, flexShrink: 0 }}>
          Add to
          <input type="date" value={addDate} max={todayISO()} onChange={e => setAddDate(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit" }} />
        </label>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0", borderRadius: 12 }}>Loading…</div>
      ) : visibleWeekDates.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 12 }}>
          No despatches recorded this week yet.
        </div>
      ) : visibleWeekDates.map(d => {
        const dayList = entriesByDate[d];
        const isToday = d === todayISO();
        // Default: today expanded, every other day collapsed — unless the
        // user has explicitly toggled this date already this session.
        const isCollapsed = collapsedDates[d] !== undefined ? collapsedDates[d] : !isToday;
        const noTrackingCount = dayList.filter(e => !e.trackingNo).length;
        const notNotifiedCount = dayList.filter(e => !e.notified).length;
        return (
          <div key={d} style={{ marginBottom: 22 }}>
            {/* Strong date header — the whole point is to spot the day at
                a glance, so it gets its own high-contrast band rather than
                blending into the table below. Click to collapse/expand;
                collapsed days show date + item count (+ a small badge for
                anything still unfinished) with no table beneath. */}
            <div
              onClick={() => setCollapsedDates(prev => ({ ...prev, [d]: !isCollapsed }))}
              title={isCollapsed ? "Click to expand" : "Click to collapse"}
              style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 0,
                padding: "10px 16px", borderRadius: isCollapsed ? 12 : "12px 12px 0 0",
                // Themed per shop — today gets the shop's solid accent color
                // (same "accent bg + white text" pattern used everywhere else
                // in the app), other days get its soft tint instead of a
                // fixed indigo, so the whole log matches whichever shop it's
                // for rather than looking the same for all three.
                background: isToday ? (shop?.accent || "#0f172a") : (shop?.accentBg || "#eef2ff"),
                cursor: "pointer", userSelect: "none",
              }}>
              <span style={{ fontSize: 11, width: 12, textAlign: "center", display: "inline-block", color: isToday ? "rgba(255,255,255,0.75)" : "#64748b" }}>
                {isCollapsed ? "▶" : "▼"}
              </span>
              <span style={{ fontSize: 17, fontWeight: 900, color: isToday ? "white" : "#1e293b", letterSpacing: "0.01em" }}>{ddmmyyyy(d)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isToday ? "rgba(255,255,255,0.75)" : (shop?.accentText || "#4338ca") }}>{weekdayName(d)}</span>
              {isToday && (
                <span style={{ fontSize: 10, fontWeight: 800, color: "#0f172a", background: "#dcfce7", borderRadius: 999, padding: "2px 8px" }}>TODAY</span>
              )}
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                {isCollapsed && noTrackingCount > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", background: "#fef3c7", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
                    ⏳ {noTrackingCount} awaiting tracking
                  </span>
                )}
                {isCollapsed && notNotifiedCount > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "#9a3412", background: "#ffedd5", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
                    📨 {notNotifiedCount} not notified
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? "rgba(255,255,255,0.75)" : "#64748b" }}>
                  {dayList.length} item{dayList.length !== 1 ? "s" : ""}
                </span>
              </span>
            </div>
            {!isCollapsed && (
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 12px 12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920, fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["#", "Customer", "Address", "Phone", "Tracking No.", "Shipper", "Notify", "Remarks", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 800, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayList.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 18, textAlign: "center", color: "#94a3b8" }}>Nothing despatched this day.</td></tr>
                  ) : dayList.map((e, idx) => {
                    const dupKey = (e.trackingNo || "").replace(/\s+/g, "").toUpperCase();
                    const isDup = dupKey && (trackingIndex[dupKey] || []).length > 1;
                    const canNotify = !!(e.trackingNo && e.shipper);
                    const shipperColor = shipperColorFor(e.shipper);
                    return (
                      <tr key={e.uuid} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 ? "#fdfbf3" : "white" }}>
                        <td style={{ padding: "8px 12px", color: "#94a3b8", fontWeight: 700, verticalAlign: "top" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", verticalAlign: "top" }}>{e.customer || "—"}</td>
                        <td style={{ padding: "8px 12px", minWidth: 180, verticalAlign: "top" }}>
                          <textarea value={e.address} rows={5}
                            onChange={ev => updateEntry(e.uuid, { address: ev.target.value })}
                            onBlur={ev => saveEntry(e.uuid, { address: ev.target.value })}
                            style={{ ...cellInputStyle, resize: "vertical" }} />
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 120, verticalAlign: "top" }}>
                          <input value={e.phone}
                            onChange={ev => updateEntry(e.uuid, { phone: ev.target.value })}
                            onBlur={ev => saveEntry(e.uuid, { phone: ev.target.value })}
                            style={cellInputStyle} />
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 140, verticalAlign: "top" }}>
                          <input value={e.trackingNo} placeholder="Tracking no."
                            onChange={ev => updateEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })}
                            onBlur={ev => saveEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })}
                            style={{ ...cellInputStyle, borderColor: isDup ? "#fca5a5" : "#e2e8f0", background: isDup ? "#fef2f2" : "white" }} />
                          {isDup && <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginTop: 2 }}>⚠ used on another row</div>}
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 130, verticalAlign: "top" }}>
                          <select value={e.shipper}
                            onChange={ev => saveEntry(e.uuid, { shipper: ev.target.value })}
                            style={{ ...cellInputStyle, fontWeight: 700, color: e.shipper ? shipperColor.color : "#94a3b8", background: e.shipper ? shipperColor.bg : "white" }}>
                            <option value="">Select…</option>
                            {SHIPPERS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", verticalAlign: "top" }}>
                          <button onClick={() => canNotify && notify(e)} disabled={!canNotify}
                            title={canNotify ? (e.notified ? "Notified — click to resend" : "Send tracking to customer") : "Add tracking number + shipper first"}
                            style={{
                              border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: canNotify ? "pointer" : "not-allowed",
                              background: !canNotify ? "#f1f5f9" : e.notified ? "#dcfce7" : "#25D366",
                              color: !canNotify ? "#94a3b8" : e.notified ? "#166534" : "white",
                              fontFamily: "inherit",
                            }}>
                            {e.notified ? "✅" : "💬"}
                          </button>
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 160, verticalAlign: "top" }}>
                          <input value={e.remarks} placeholder="Remarks"
                            onChange={ev => updateEntry(e.uuid, { remarks: ev.target.value })}
                            onBlur={ev => saveEntry(e.uuid, { remarks: ev.target.value })}
                            style={cellInputStyle} />
                        </td>
                        <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                          {isAdmin && (
                            <button onClick={() => removeEntry(e.uuid)} title="Remove row"
                              style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>✕</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );
      })}
      </>
      )}

      {viewMode === "calendar" && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Month grid — each day shows its despatch count as a badge */}
          <div style={{ flex: "1 1 380px", minWidth: 320, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => shiftMonth(-1)} style={pillBtnStyle}>←</button>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{monthLabel(calMonth)}</div>
              <button onClick={() => !atCurrentMonthOrLater && shiftMonth(1)} disabled={atCurrentMonthOrLater}
                style={{ ...pillBtnStyle, opacity: atCurrentMonthOrLater ? 0.4 : 1, cursor: atCurrentMonthOrLater ? "not-allowed" : "pointer" }}>→</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {calCells.map((iso, i) => {
                if (!iso) return <div key={"blank" + i} />;
                const count = calendarCounts[iso] || 0;
                const isFuture = iso > todayISO();
                const isToday = iso === todayISO();
                const dayNum = Number(iso.slice(-2));
                return (
                  <button key={iso} onClick={() => count > 0 && !isFuture && jumpToDay(iso)}
                    disabled={isFuture || count === 0}
                    title={isFuture ? "Future date" : count ? `${count} despatched — click to view` : "Nothing despatched"}
                    style={{
                      aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                      borderRadius: 8, border: isToday ? "2px solid #0f172a" : "1px solid #f1f5f9",
                      background: isFuture ? "#fafafa" : count > 0 ? "#eef2ff" : "white",
                      cursor: (!isFuture && count > 0) ? "pointer" : "default",
                      fontFamily: "inherit",
                    }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: isFuture ? "#cbd5e1" : "#334155" }}>{dayNum}</span>
                    {!isFuture && count > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#4338ca", background: "#e0e7ff", borderRadius: 999, padding: "1px 6px" }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly totals — business growth trend across the whole log */}
          <div style={{ flex: "1 1 320px", minWidth: 280, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>📈 Monthly Despatch Totals</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 14 }}>Track volume month to month to gauge growth</div>
            {monthlyTotals.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 12.5 }}>No despatch history yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {monthlyTotals.map(mt => (
                  <div key={mt.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>{mt.label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>
                        {mt.count}
                        {mt.delta !== null && (
                          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: mt.delta >= 0 ? "#166534" : "#991b1b" }}>
                            {mt.delta >= 0 ? "▲" : "▼"} {Math.abs(mt.delta)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ width: `${mt.pct}%`, height: "100%", background: "#4338ca", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pillBtnStyle = {
  padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white",
  color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
};

const cellInputStyle = {
  width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0",
  fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box", resize: "none",
};

function SummaryChip({ label, value, bg, color }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 10, background: bg, color, display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700 }}>{label}</span>
    </div>
  );
}
