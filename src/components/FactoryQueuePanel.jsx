import { useState, useMemo, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   FULFILMENT TRACKER — ROS INDIA ONLY
   (component/file name kept as FactoryQueuePanel — renaming the file would
   touch the import in App.jsx and git history for no functional benefit;
   "Fulfilment Tracker" is the name shown in the sidebar and on the page)
   ───────────────────────────────────────────────────────────────────────────
   Scoped to the ROS India factory/production queue specifically (not UK) —
   mock data below is India-only, one currency (₹), no per-row shop badge.

   Unifies three business streams into one "who's waiting on us" queue:
     1. Sales Orders pending factory fulfilment      (salesData)
     2. Returned items awaiting a factory exchange   (returnsExchangeData)
     3. Returned items awaiting a refund              (refundsData)

   STANDALONE BY DESIGN: this component ships with realistic mock data
   (below) so it renders and is fully interactive with zero setup. To go
   live, just pass real arrays as props — the shapes match exactly what's
   documented above each mock array:

     <FactoryQueuePanel
       salesData={realSalesRows}
       returnsExchangeData={realReturnsRows}
       refundsData={realRefundsRows}
     />

   No external libraries — the bar chart, drawer and toasts are all plain
   React + inline styles, consistent with the rest of this codebase.

   IDEAS ADDED ON TOP OF THE ORIGINAL SPEC (flagging these since they go
   beyond what was literally asked for):
     • Default sort is "Most Overdue First" — production orders past the
       14-day benchmark always bubble to the top (worst-late first), ahead
       of everything else, so the page opens already triaged.
     • "Total Waiting Customers" counts unique customers, with total
       order/return count as a sub-label (a customer with 2 open orders
       shouldn't be counted twice as a "customer").
     • A day-scale axis header (0 / 7 / 14 target / 21 / 30+) above the bar
       list, so the Day-14 benchmark line has a readable reference.
     • "Ready to Dispatch" and "Completed" are distinct steps — completing
       an entry removes it from the pending queue (this is a *pending*
       tracker), with a small "N completed just now" footnote so the count
       doesn't just silently vanish.
     • The WhatsApp message preview is editable/visible in the drawer
       *before* copying, not just generated blind.
     • Every action is layered on top of the mock data via local overrides
       rather than mutating the source arrays — the same pattern you'd use
       once this reads from Supabase (optimistic local state, synced later).
   ═══════════════════════════════════════════════════════════════════════════ */

// ── date helper for building mock data relative to "today" ────────────────
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/* ────────────────────────────────────────────────────────────────────────
   1) salesData — Sales Orders pending factory fulfilment
   Shape: { orderId, customerName, phone, item, orderDate, paidAmount,
            totalAmount, factoryStatus: 'in_production' | 'ready_to_ship',
            unit: 'India-Unit1' | 'India-Unit2' | 'UK-Unit' | '' }
   (shop/currency are additive extras — harmless if your real data omits them.
   unit is the despatch unit the order is fulfilled from — matches the same
   "Dispatch Unit" field/values used on the Sales form; '' means not set,
   e.g. an order created before this field existed.)
   ──────────────────────────────────────────────────────────────────────── */
const MOCK_SALES_DATA = [
  { orderId: "SO-1042", customerName: "Aisha Verma", phone: "+91 98765 43210", item: "Bridal Lehenga Set", orderDate: daysAgo(2), paidAmount: 15000, totalAmount: 32000, factoryStatus: "in_production", shop: "ROS India", currency: "₹", unit: "India-Unit1" },
  { orderId: "SO-1039", customerName: "Rahul Mehta", phone: "+91 98200 12345", item: "Groom Sherwani", orderDate: daysAgo(5), paidAmount: 18000, totalAmount: 22000, factoryStatus: "in_production", shop: "ROS India", currency: "₹", unit: "India-Unit2" },
  { orderId: "SO-1031", customerName: "Priya Nair", phone: "+91 98450 11223", item: "Silk Saree — Custom Blouse", orderDate: daysAgo(8), paidAmount: 6000, totalAmount: 14500, factoryStatus: "in_production", shop: "ROS India", currency: "₹", unit: "India-Unit1" },
  { orderId: "SO-1024", customerName: "Kavya Iyer", phone: "+91 90080 33445", item: "Anarkali Suit", orderDate: daysAgo(12), paidAmount: 9000, totalAmount: 9000, factoryStatus: "ready_to_ship", shop: "ROS India", currency: "₹", unit: "UK-Unit" },
  { orderId: "SO-1015", customerName: "Fatima Sheikh", phone: "+91 99870 55667", item: "Designer Lehenga", orderDate: daysAgo(16), paidAmount: 12000, totalAmount: 28000, factoryStatus: "in_production", shop: "ROS India", currency: "₹", unit: "India-Unit1", remarks: "Fabric delay — zari border restock expected Thu (noted by Priya)" },
  { orderId: "SO-1006", customerName: "Neha Kapoor", phone: "+91 98450 65432", item: "Wedding Gown Alteration", orderDate: daysAgo(19), paidAmount: 6500, totalAmount: 6500, factoryStatus: "ready_to_ship", shop: "ROS India", currency: "₹", unit: "India-Unit2" },
  { orderId: "SO-0998", customerName: "Sana Ali", phone: "+91 98220 77889", item: "Party Wear Suit", orderDate: daysAgo(24), paidAmount: 5000, totalAmount: 11000, factoryStatus: "in_production", shop: "ROS India", currency: "₹", unit: "India-Unit1", remarks: "Tailor on leave — resuming Monday, then 2 days to finish (Arun)" },
  { orderId: "SO-0987", customerName: "Divya Reddy", phone: "+91 90360 99001", item: "Reception Outfit Set", orderDate: daysAgo(29), paidAmount: 14000, totalAmount: 26000, factoryStatus: "in_production", shop: "ROS India", currency: "₹", unit: "" },
];

/* ────────────────────────────────────────────────────────────────────────
   2) returnsExchangeData — Returned items awaiting a factory exchange
   Shape: { returnId, originalOrderId, customerName, phone, returnedItem,
            exchangeItemRequested, returnReceivedDate, balanceAdjustment }
   balanceAdjustment: positive = customer owes more, negative = a refund is
   owed to the customer as part of the exchange, 0 = even swap.
   ──────────────────────────────────────────────────────────────────────── */
const MOCK_RETURNS_EXCHANGE_DATA = [
  { returnId: "RX-201", originalOrderId: "SO-0950", customerName: "Meera Joshi", phone: "+91 99001 22334", returnedItem: "Silk Saree (wrong colour)", exchangeItemRequested: "Same design — Maroon", returnReceivedDate: daysAgo(6), balanceAdjustment: 500, shop: "ROS India", currency: "₹" },
  { returnId: "RX-198", originalOrderId: "SO-0941", customerName: "Arjun Malhotra", phone: "+91 98110 44556", returnedItem: "Kurta Set (size M)", exchangeItemRequested: "Size L — same design", returnReceivedDate: daysAgo(11), balanceAdjustment: 0, shop: "ROS India", currency: "₹" },
  { returnId: "RX-205", originalOrderId: "SO-0962", customerName: "Zara Khan", phone: "+91 90210 66778", returnedItem: "Lehenga (damaged on arrival)", exchangeItemRequested: "Replacement piece", returnReceivedDate: daysAgo(3), balanceAdjustment: -200, shop: "ROS India", currency: "₹" },
];

/* ────────────────────────────────────────────────────────────────────────
   3) refundsData — Returned items awaiting a refund
   Shape: { refundId, originalOrderId, customerName, phone, returnedItem,
            refundAmountDue, returnReceivedDate, refundStatus: 'pending' | 'approved' }
   ──────────────────────────────────────────────────────────────────────── */
const MOCK_REFUNDS_DATA = [
  { refundId: "RF-114", originalOrderId: "SO-0930", customerName: "Ritu Sharma", phone: "+91 99880 11009", returnedItem: "Blouse (quality issue)", refundAmountDue: 1200, returnReceivedDate: daysAgo(9), refundStatus: "pending", shop: "ROS India", currency: "₹" },
  { refundId: "RF-109", originalOrderId: "SO-0918", customerName: "Karan Bose", phone: "+91 98300 22110", returnedItem: "Dupatta Set", refundAmountDue: 450, returnReceivedDate: daysAgo(15), refundStatus: "pending", shop: "ROS India", currency: "₹", remarks: "Awaiting customer's bank details to process refund" },
  { refundId: "RF-121", originalOrderId: "SO-0955", customerName: "Ayesha Khan", phone: "+91 90120 34567", returnedItem: "Suit Set", refundAmountDue: 3200, returnReceivedDate: daysAgo(4), refundStatus: "approved", shop: "ROS India", currency: "₹" },
];

// ── visual scale + color rules ─────────────────────────────────────────────
const MAX_SCALE_DAYS = 30; // bar length caps out here even if daysWaiting is higher
const BENCHMARK_DAY = 14;  // factory target completion window (dashed line)

// Sora (bold, geometric — headings, big numbers) + Inter (clean, highly
// legible — body copy, financial figures) — a common premium-dashboard
// pairing that stays crisp at small sizes for currency figures.
const FONT_DISPLAY = "'Sora', 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Pulls the two fonts in via @import inside a <style> tag so this component
// stays fully self-contained (no edits needed to your app's index.html).
// For a very slightly faster first paint you could instead add the
// equivalent <link> tag to public/index.html and delete this component —
// purely optional, both approaches render identically.
function FontLoader() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
  );
}

const CATEGORY = {
  fresh:    { bar: "#22c55e", barGrad: "linear-gradient(90deg,#4ade80,#16a34a)", bg: "#dcfce7", text: "#166534", label: "On Track" },
  amber:    { bar: "#f59e0b", barGrad: "linear-gradient(90deg,#fbbf24,#d97706)", bg: "#fef3c7", text: "#92400e", label: "Approaching" },
  overdue:  { bar: "#e11d48", barGrad: "linear-gradient(90deg,#fb7185,#be123c)", bg: "#fee2e2", text: "#991b1b", label: "Overdue" },
  exchange: { bar: "#6366f1", barGrad: "linear-gradient(90deg,#818cf8,#4338ca)", bg: "#e0e7ff", text: "#3730a3", label: "Exchange" },
  refund:   { bar: "#f43f5e", barGrad: "linear-gradient(90deg,#fb7185,#e11d48)", bg: "#ffe4e6", text: "#9f1239", label: "Refund" },
};

// Matches the "Dispatch Unit" field/values on the Sales form exactly (see
// dispatchFrom in App.jsx) — three despatch units, plus an "unassigned"
// bucket for orders saved before this field existed or without one picked.
// Only production (sales) entries carry a real unit today — returns don't
// track one yet, so exchange/refund entries fall through to unassigned.
const UNIT_META = {
  "India-Unit1": { label: "Unit 1", flag: "🇮🇳", bg: "#e0f2fe", text: "#075985" },
  "India-Unit2": { label: "Unit 2", flag: "🇮🇳", bg: "#ede9fe", text: "#5b21b6" },
  "UK-Unit":     { label: "UK Unit", flag: "🇬🇧", bg: "#fce7f3", text: "#9d174d" },
  "":            { label: "Unassigned", flag: "❔", bg: "#f1f5f9", text: "#64748b" },
};
const UNIT_TABS = [
  { key: "all", label: "All Units" },
  { key: "India-Unit1", label: "🇮🇳 Unit 1" },
  { key: "India-Unit2", label: "🇮🇳 Unit 2" },
  { key: "UK-Unit", label: "🇬🇧 UK Unit" },
  { key: "", label: "Unassigned" },
];

// ── formatting helpers ──────────────────────────────────────────────────
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function fmtMoney(n, currency = "₹") {
  const locale = currency === "£" ? "en-GB" : "en-IN";
  return `${currency}${Math.abs(round2(n)).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysBetween(iso, today) {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((t - d) / 86400000));
}

// Small readable pseudo-SKU derived from the item name + reference id, since
// none of the three source schemas include a dedicated SKU field.
function skuFor(refId, item) {
  const initials = (item || "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "ITM";
  const digits = String(refId || "").replace(/\D/g, "").slice(-4) || "0000";
  return `${initials}-${digits}`;
}

function categorizeProduction(daysWaiting) {
  if (daysWaiting > BENCHMARK_DAY) return "overdue";
  if (daysWaiting >= 7) return "amber";
  return "fresh";
}

/* ────────────────────────────────────────────────────────────────────────
   normalizeQueue — merges the three source datasets into one unified,
   sortable/filterable queue, computing daysWaiting, remaining balance and
   a queue-type/category tag for each row. This is the requested "helper
   function that merges and normalizes these 3 datasets".
   ──────────────────────────────────────────────────────────────────────── */
// Any unit value that isn't one of these three falls back to "" (Unassigned)
// rather than being left as an unrecognised string — an unrecognised value
// (typo, stray whitespace, a row edited by hand in Supabase, an old/renamed
// value) would otherwise count toward "All Units" but not toward any of the
// visible Unit tabs, silently making the tab counts not add up and the
// order impossible to find under any tab.
const KNOWN_UNITS = new Set(["India-Unit1", "India-Unit2", "UK-Unit"]);
const normalizeUnit = (u) => (KNOWN_UNITS.has(String(u || "").trim()) ? String(u).trim() : "");

export function normalizeQueue(salesData = [], returnsExchangeData = [], refundsData = [], today = new Date()) {
  const list = [];

  salesData.forEach((s) => {
    const daysWaiting = daysBetween(s.orderDate, today);
    const totalAmount = s.totalAmount || 0;
    const paidAmount = s.paidAmount || 0;
    list.push({
      id: `sale-${s.orderId}`,
      queueType: "production",
      category: categorizeProduction(daysWaiting),
      customerName: s.customerName,
      phone: s.phone,
      item: s.item,
      sku: skuFor(s.orderId, s.item),
      referenceId: s.orderId,
      referenceLabel: "Order",
      referenceDate: s.orderDate,
      daysWaiting,
      totalAmount,
      paidAmount,
      balanceDue: round2(totalAmount - paidAmount),
      factoryStatus: s.factoryStatus || "in_production",
      shop: s.shop || "",
      currency: s.currency || "₹",
      unit: normalizeUnit(s.unit), // despatch unit — Unit 1 / Unit 2 / UK Unit / unset
      remarks: s.remarks || "", // staff note on why this is delayed, or any custom context
    });
  });

  returnsExchangeData.forEach((r) => {
    const daysWaiting = daysBetween(r.returnReceivedDate, today);
    list.push({
      id: `exchange-${r.returnId}`,
      queueType: "exchange",
      category: "exchange",
      customerName: r.customerName,
      phone: r.phone,
      item: r.returnedItem,
      sku: skuFor(r.returnId, r.returnedItem),
      referenceId: r.returnId,
      referenceLabel: "Return",
      referenceDate: r.returnReceivedDate,
      daysWaiting,
      totalAmount: null,
      paidAmount: null,
      balanceDue: r.balanceAdjustment || 0,
      exchangeItemRequested: r.exchangeItemRequested,
      originalOrderId: r.originalOrderId,
      shop: r.shop || "",
      currency: r.currency || "₹",
      unit: normalizeUnit(r.unit), // returns don't track a despatch unit today — stays unassigned
      remarks: r.remarks || "",
    });
  });

  refundsData.forEach((r) => {
    const daysWaiting = daysBetween(r.returnReceivedDate, today);
    list.push({
      id: `refund-${r.refundId}`,
      queueType: "refund",
      category: "refund",
      customerName: r.customerName,
      phone: r.phone,
      item: r.returnedItem,
      sku: skuFor(r.refundId, r.returnedItem),
      referenceId: r.refundId,
      referenceLabel: "Return",
      referenceDate: r.returnReceivedDate,
      daysWaiting,
      totalAmount: null,
      paidAmount: null,
      balanceDue: -(r.refundAmountDue || 0),
      refundAmountDue: r.refundAmountDue || 0,
      refundStatus: r.refundStatus || "pending",
      originalOrderId: r.originalOrderId,
      shop: r.shop || "",
      currency: r.currency || "₹",
      unit: normalizeUnit(r.unit), // returns don't track a despatch unit today — stays unassigned
      remarks: r.remarks || "",
    });
  });

  return list;
}

function groupSumByCurrency(list, getVal) {
  const m = {};
  list.forEach((e) => { m[e.currency] = (m[e.currency] || 0) + getVal(e); });
  return m;
}
function formatMultiCurrency(m) {
  const entries = Object.entries(m).filter(([, v]) => v > 0.004);
  if (!entries.length) return "—";
  return entries.map(([cur, v]) => fmtMoney(v, cur)).join(" · ");
}

/* ────────────────────────────────────────────────────────────────────────
   WhatsApp update message builder — mirrors the tone of the tracking
   messages used elsewhere in this app (bold customer name, short sections).
   ──────────────────────────────────────────────────────────────────────── */
function buildWhatsAppMessage(entry) {
  const dayWord = `${entry.daysWaiting} day${entry.daysWaiting === 1 ? "" : "s"}`;
  let statusLine, balanceLine;

  if (entry.queueType === "production") {
    statusLine = entry.factoryStatus === "ready_to_ship"
      ? "Great news — your order is *ready* and will be dispatched shortly! 📦"
      : "Your order is currently *in production*.";
    balanceLine = entry.balanceDue > 0
      ? `*Balance Due:* ${fmtMoney(entry.balanceDue, entry.currency)} — kindly clear at your convenience.`
      : "✅ *Fully paid* — thank you!";
  } else if (entry.queueType === "exchange") {
    statusLine = `Your exchange request (${entry.exchangeItemRequested}) is being processed by our factory.`;
    balanceLine = entry.balanceDue > 0
      ? `A balance adjustment of ${fmtMoney(entry.balanceDue, entry.currency)} is due — kindly settle at your convenience.`
      : entry.balanceDue < 0
        ? `A refund adjustment of ${fmtMoney(entry.balanceDue, entry.currency)} is due to you as part of this exchange.`
        : "No balance adjustment is due for this exchange.";
  } else {
    statusLine = entry.refundStatus === "approved"
      ? "Your refund has been *approved* and is being processed."
      : "We've received your return and your refund is being processed.";
    balanceLine = `*Refund Amount:* ${fmtMoney(entry.refundAmountDue, entry.currency)}`;
  }

  return `Dear *${(entry.customerName || "Customer").toUpperCase()}*,

Thank you for your patience! Here's a quick update on your order.

*Item:* ${entry.item}
${statusLine}
*Waiting:* ${dayWord} (since ${fmtDate(entry.referenceDate)})

${balanceLine}

We appreciate your patience and will keep you posted.

— ROS Team`;
}

// ── tiny responsive hook (zero dependencies) ───────────────────────────
function useIsNarrow(breakpoint = 780) {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return narrow;
}

// ── small presentational building blocks ────────────────────────────────
function Badge({ children, bg, color, title }) {
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 800, color, background: bg, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function KpiCard({ icon, label, value, sub, accent }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: "1 1 240px", minWidth: 220, position: "relative", overflow: "hidden",
        background: "white", border: "1px solid #eef1f6", borderRadius: 18,
        padding: "20px 22px 18px", fontFamily: FONT_BODY,
        boxShadow: hover ? "0 14px 30px -12px rgba(15,23,42,0.18)" : "0 2px 8px rgba(15,23,42,0.05)",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
      }}>
      {/* soft decorative wash in the accent color, top-right corner */}
      <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: accent.wash || accent.bg, opacity: 0.5, filter: "blur(2px)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: accent.grad || accent.bg, color: accent.iconColor || accent.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: `0 6px 14px -4px ${accent.shadow || "rgba(0,0,0,0.15)"}` }}>{icon}</div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      </div>
      <div style={{ position: "relative", fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ position: "relative", fontSize: 12, color: "#94a3b8", marginTop: 5, fontWeight: 500 }}>{sub}</div>}
      <div style={{ position: "relative", marginTop: 12, height: 3, width: 34, borderRadius: 999, background: accent.grad || accent.text }} />
    </div>
  );
}

// Shared day-scale axis, rendered once above the bar list so the Day-14
// benchmark drawn on every row lines up with a labeled reference point.
function AxisHeader({ leftColWidth, rightColWidth }) {
  const pct = (d) => `${Math.min(d, MAX_SCALE_DAYS) / MAX_SCALE_DAYS * 100}%`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 4px 8px", fontSize: 10.5, fontWeight: 800, color: "#94a3b8", fontFamily: FONT_BODY, letterSpacing: "0.02em" }}>
      <div style={{ flex: `0 0 ${leftColWidth}px` }} />
      <div style={{ flex: 1, position: "relative", height: 14 }}>
        {[0, 7, 14, 21, 30].map((d) => (
          <span key={d} style={{ position: "absolute", left: pct(d), transform: d === 0 ? "none" : d === 30 ? "translateX(-100%)" : "translateX(-50%)", color: d === BENCHMARK_DAY ? "#e11d48" : "#94a3b8", fontWeight: d === BENCHMARK_DAY ? 900 : 700 }}>
            {d === 30 ? "30+ days" : d === BENCHMARK_DAY ? "14d target" : `${d}d`}
          </span>
        ))}
      </div>
      <div style={{ flex: `0 0 ${rightColWidth}px` }} />
      <div style={{ flex: "0 0 20px" }} />
    </div>
  );
}

function QueueRow({ entry, narrow, onOpen, leftColWidth, rightColWidth }) {
  const cat = CATEGORY[entry.category];
  const pct = Math.min(entry.daysWaiting, MAX_SCALE_DAYS) / MAX_SCALE_DAYS * 100;
  const benchmarkPct = BENCHMARK_DAY / MAX_SCALE_DAYS * 100;
  const lateDays = entry.category === "overdue" ? entry.daysWaiting - BENCHMARK_DAY : 0;
  const isReady = entry.queueType === "production" && entry.factoryStatus === "ready_to_ship";

  const handleKeyDown = (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpen(entry); } };

  return (
    <div
      onClick={() => onOpen(entry)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={{
        display: "flex", flexDirection: narrow ? "column" : "row", alignItems: narrow ? "stretch" : "center",
        gap: narrow ? 10 : 14, padding: narrow ? "14px 14px 14px 16px" : "13px 16px 13px 18px",
        background: "white", border: "1px solid #eef1f6", borderLeft: `5px solid ${cat.bar}`, borderRadius: 14, marginBottom: 9,
        cursor: "pointer", transition: "box-shadow 0.2s ease, transform 0.2s ease", fontFamily: FONT_BODY,
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 10px 26px -10px ${cat.bar}66`; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(15,23,42,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Customer / item */}
      <div style={{ flex: narrow ? "1 1 auto" : `0 0 ${leftColWidth}px`, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.customerName}</div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.item} · <span style={{ color: "#94a3b8" }}>{entry.sku}</span></div>
        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
          <Badge bg={cat.bg} color={cat.text}>{cat.label}</Badge>
          {isReady && <Badge bg="#dbeafe" color="#1e40af">✅ Ready</Badge>}
          {entry.unit && (
            <Badge bg={UNIT_META[entry.unit]?.bg || UNIT_META[""].bg} color={UNIT_META[entry.unit]?.text || UNIT_META[""].text}>
              {UNIT_META[entry.unit]?.flag} {UNIT_META[entry.unit]?.label || entry.unit}
            </Badge>
          )}
        </div>
      </div>

      {/* Bar track */}
      <div style={{ flex: 1, minWidth: narrow ? undefined : 180 }}>
        <div style={{ position: "relative", height: 27, background: "#f1f5f9", borderRadius: 9, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(15,23,42,0.05)" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${benchmarkPct}%`, width: 0, borderLeft: "2px dashed #94a3b8", opacity: 0.7, zIndex: 2 }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${Math.max(pct, 4)}%`, background: cat.barGrad || cat.bar, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 9, transition: "width 0.4s ease", boxShadow: `0 2px 6px -1px ${cat.bar}77` }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 10.5, fontWeight: 700, color: "white", whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(0,0,0,0.3)", fontVariantNumeric: "tabular-nums" }}>
              {entry.daysWaiting}{entry.daysWaiting >= MAX_SCALE_DAYS ? "+" : ""}d
            </span>
          </div>
        </div>
        {lateDays > 0 && (
          <div style={{ marginTop: 4 }}>
            <Badge bg="#fee2e2" color="#991b1b">⚠ +{lateDays}d late</Badge>
          </div>
        )}
      </div>

      {/* Financials */}
      <div style={{ flex: narrow ? "1 1 auto" : `0 0 ${rightColWidth}px`, fontSize: 11.5 }}>
        {entry.queueType === "production" ? (
          <>
            <div style={{ color: "#64748b" }}>Total <b style={{ color: "#0f172a" }}>{fmtMoney(entry.totalAmount, entry.currency)}</b> · Paid <b style={{ color: "#0f172a" }}>{fmtMoney(entry.paidAmount, entry.currency)}</b></div>
            <div style={{ marginTop: 3 }}>
              {entry.balanceDue > 0
                ? <Badge bg="#fef3c7" color="#92400e">Balance {fmtMoney(entry.balanceDue, entry.currency)}</Badge>
                : <Badge bg="#dcfce7" color="#166534">✅ Settled</Badge>}
            </div>
          </>
        ) : entry.queueType === "exchange" ? (
          <>
            <div style={{ color: "#64748b" }}>→ {entry.exchangeItemRequested}</div>
            <div style={{ marginTop: 3 }}>
              {entry.balanceDue > 0
                ? <Badge bg="#fef3c7" color="#92400e">Owes {fmtMoney(entry.balanceDue, entry.currency)}</Badge>
                : entry.balanceDue < 0
                  ? <Badge bg="#ffe4e6" color="#9f1239">Refund {fmtMoney(entry.balanceDue, entry.currency)} due</Badge>
                  : <Badge bg="#e0e7ff" color="#3730a3">Even swap</Badge>}
            </div>
          </>
        ) : (
          <>
            <div style={{ color: "#64748b" }}>Refund due</div>
            <div style={{ marginTop: 3, display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Badge bg="#ffe4e6" color="#9f1239">{fmtMoney(entry.refundAmountDue, entry.currency)}</Badge>
              {entry.refundStatus === "approved"
                ? <Badge bg="#dcfce7" color="#166534">Approved</Badge>
                : <Badge bg="#fef3c7" color="#92400e">Pending</Badge>}
            </div>
          </>
        )}
      </div>

      {/* Staff remarks aren't shown on the bar itself — click through to the
          detail drawer to read/edit them. Just a quiet 📝 dot here as a
          heads-up that a note exists, so nothing has to be typed twice. */}
      {!narrow && (
        <div style={{ flex: "0 0 20px", textAlign: "center", color: "#cbd5e1", fontSize: 16, position: "relative" }}>
          ›
          {entry.remarks && (
            <span title="Has staff remarks — click to view" style={{ position: "absolute", top: -6, right: 2, fontSize: 10 }}>📝</span>
          )}
        </div>
      )}
    </div>
  );
}

function DetailDrawer({ entry, onClose, onMarkPaid, onAdvance, onSaveRemarks, onCopyWhatsApp, narrow }) {
  const [msg, setMsg] = useState(() => buildWhatsAppMessage(entry));
  const [remarksDraft, setRemarksDraft] = useState(entry.remarks || "");
  const [remarksSavedFlash, setRemarksSavedFlash] = useState(false);
  // Keyed on entry.id, NOT the whole entry object — entry is rebuilt fresh
  // on every re-render of the queue (a new object even when nothing about
  // this record actually changed), so keying on the object itself reset
  // these drafts back to the last saved value on every unrelated re-render
  // (e.g. a background data refresh), wiping mid-typing edits. Keying on
  // the id means they only reset when the drawer actually switches to a
  // different record.
  useEffect(() => { setMsg(buildWhatsAppMessage(entry)); }, [entry.id]);
  useEffect(() => { setRemarksDraft(entry.remarks || ""); }, [entry.id]);

  // Relying on the textarea's onBlur alone missed cases where the drawer
  // closes without a normal blur first (Escape key, a fast click on the
  // backdrop) — the edit was silently dropped. flushRemarks() is now called
  // from every way of leaving the drawer, not just onBlur, and
  // handleSaveClick() gives staff an explicit, visible "it's saved" action.
  const flushRemarks = () => {
    if (remarksDraft !== (entry.remarks || "")) onSaveRemarks(entry, remarksDraft);
  };
  const handleSaveClick = () => {
    onSaveRemarks(entry, remarksDraft);
    setRemarksSavedFlash(true);
    setTimeout(() => setRemarksSavedFlash(false), 1400);
  };
  const handleClose = () => { flushRemarks(); onClose(); };

  useEffect(() => {
    const onKey = (ev) => { if (ev.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, entry.id, entry.remarks, remarksDraft]);

  const cat = CATEGORY[entry.category];
  const canMarkPaid = entry.queueType !== "refund" && entry.balanceDue > 0;
  const advanceLabel = entry.queueType !== "production"
    ? "✅ Mark Completed"
    : entry.factoryStatus === "ready_to_ship" ? "✅ Mark Completed / Dispatched" : "📦 Move to Ready to Dispatch";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={handleClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)" }} />
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: narrow ? "100%" : 440, maxWidth: "100%",
        background: "white", boxShadow: "-8px 0 30px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column",
        fontFamily: FONT_BODY,
      }}>
        <div style={{ height: 5, background: cat.barGrad || cat.bar, flexShrink: 0 }} />
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{entry.customerName}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{entry.phone}</div>
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              <Badge bg={cat.bg} color={cat.text}>{cat.label}</Badge>
              {entry.unit && (
                <Badge bg={UNIT_META[entry.unit]?.bg || UNIT_META[""].bg} color={UNIT_META[entry.unit]?.text || UNIT_META[""].text}>
                  {UNIT_META[entry.unit]?.flag} {UNIT_META[entry.unit]?.label || entry.unit}
                </Badge>
              )}
            </div>
          </div>
          <button onClick={handleClose} title="Close" style={{ border: "none", background: "#f1f5f9", color: "#475569", borderRadius: 8, width: 30, height: 30, fontSize: 15, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Item</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{entry.item}</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{entry.sku} · {entry.referenceLabel} {entry.referenceId}</div>
            {entry.exchangeItemRequested && <div style={{ fontSize: 12, color: "#4338ca", marginTop: 6 }}>→ Requested: {entry.exchangeItemRequested}</div>}
          </div>

          <div style={{ marginBottom: 18, display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: cat.text, fontVariantNumeric: "tabular-nums" }}>{entry.daysWaiting}</div>
              <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700 }}>days waiting</div>
            </div>
            <div style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>{fmtDate(entry.referenceDate)}</div>
              <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, marginTop: 2 }}>{entry.referenceLabel.toLowerCase()} date</div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Payment</div>
            {entry.queueType === "production" ? (
              <div style={{ display: "flex", gap: 8 }}>
                {[["Total", entry.totalAmount], ["Paid", entry.paidAmount], ["Balance", entry.balanceDue]].map(([label, val]) => (
                  <div key={label} style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: label === "Balance" && val > 0 ? "#dc2626" : "#0f172a" }}>{fmtMoney(val, entry.currency)}</div>
                  </div>
                ))}
              </div>
            ) : entry.queueType === "exchange" ? (
              <div style={{ fontSize: 13, color: "#334155" }}>
                {entry.balanceDue === 0 ? "No balance adjustment for this exchange." : entry.balanceDue > 0
                  ? <>Customer owes <b>{fmtMoney(entry.balanceDue, entry.currency)}</b> more.</>
                  : <>A refund of <b>{fmtMoney(entry.balanceDue, entry.currency)}</b> is due to the customer.</>}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#334155" }}>Refund of <b>{fmtMoney(entry.refundAmountDue, entry.currency)}</b> — status: <b>{entry.refundStatus}</b>.</div>
            )}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Staff Remarks</div>
            <textarea
              value={remarksDraft}
              onChange={(e) => setRemarksDraft(e.target.value)}
              onBlur={flushRemarks}
              placeholder="Who's on it and why it's delayed — e.g. &quot;Fabric delay, awaiting restock (Priya, 18 Sep)&quot;"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 10, padding: 10, fontSize: 12.5, fontFamily: FONT_BODY, color: "#78350f", resize: "vertical" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <button
                onClick={handleSaveClick}
                style={{ border: "1px solid #fde68a", background: "#78350f", color: "#fffbeb", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                💾 Save Remarks
              </button>
              {remarksSavedFlash && (
                <span style={{ fontSize: 11.5, color: "#166534", fontWeight: 700 }}>✓ Saved</span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            {canMarkPaid && (
              <button onClick={() => onMarkPaid(entry)} style={actionBtnStyle("#f1f5f9", "#334155")}>💰 Mark Balance as Fully Paid</button>
            )}
            <button onClick={() => onAdvance(entry)} style={actionBtnStyle("#0f172a", "white")}>{advanceLabel}</button>
          </div>

          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>WhatsApp Update Preview</div>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={9}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, fontSize: 12, fontFamily: "inherit", color: "#334155", resize: "vertical" }} />
            <button onClick={() => onCopyWhatsApp(msg)} style={{ ...actionBtnStyle("#25D366", "white"), width: "100%", marginTop: 8 }}>💬 Copy WhatsApp Update</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function actionBtnStyle(bg, color) {
  return { border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer", background: bg, color, fontFamily: "inherit" };
}

// Search input with a soft focus glow — a small but very "does someone
// care about this UI" detail on an otherwise plain text field.
function SearchBox({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ position: "relative", maxWidth: 440 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.6, pointerEvents: "none" }}>🔍</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by customer name, phone, or item…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 38px", borderRadius: 12,
            border: focused ? "1px solid #818cf8" : "1px solid #e2e8f0", fontSize: 13.5, fontFamily: FONT_BODY, color: "#0f172a",
            boxShadow: focused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none", outline: "none", transition: "box-shadow 0.15s ease, border-color 0.15s ease",
            background: "white",
          }} />
      </div>
    </div>
  );
}

function Toast({ text }) {
  if (!text) return null;
  return (
    <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#1e293b,#0f172a)", color: "white", padding: "11px 20px", borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, boxShadow: "0 10px 30px rgba(15,23,42,0.35)", zIndex: 300 }}>
      {text}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const FILTERS = [
  { key: "all", label: "All Pending" },
  { key: "production", label: "Factory Production" },
  { key: "overdue", label: "Overdue Alert (>14d)" },
  { key: "exchange", label: "Exchanges" },
  { key: "refund", label: "Refunds" },
];
const SORTS = [
  { key: "overdue_first", label: "Most Overdue First (default)" },
  { key: "longest", label: "Longest Wait Time" },
  { key: "shortest", label: "Shortest Wait Time" },
  { key: "balance", label: "Highest Balance Due" },
];

export default function FactoryQueuePanel({
  salesData = MOCK_SALES_DATA,
  returnsExchangeData = MOCK_RETURNS_EXCHANGE_DATA,
  refundsData = MOCK_REFUNDS_DATA,
  // Optional: (entry, text) => Promise|void — actually saves a remarks edit
  // server-side (e.g. to Supabase). Without it, remarks only live in this
  // component's own local state (overrides below) and reset on refresh —
  // exactly what App.jsx's wiring now avoids by passing this in.
  onPersistRemarks,
}) {
  const narrow = useIsNarrow();
  // True only when the caller didn't pass real data (e.g. the standalone
  // preview HTML) — the App.jsx wiring always passes real arrays (even if
  // empty), so this correctly stays false once live in the app.
  const isDemoData = salesData === MOCK_SALES_DATA && returnsExchangeData === MOCK_RETURNS_EXCHANGE_DATA && refundsData === MOCK_REFUNDS_DATA;
  const [overrides, setOverrides] = useState({});     // id -> patch layered on top of the source data
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [filter, setFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all"); // "all" | a UNIT_META key (incl. "" for Unassigned)
  const [sortBy, setSortBy] = useState("overdue_first"); // most-overdue-first, per ROS India's default triage
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState("");
  const [completedJustNow, setCompletedJustNow] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const baseQueue = useMemo(
    () => normalizeQueue(salesData, returnsExchangeData, refundsData),
    [salesData, returnsExchangeData, refundsData]
  );

  const activeQueue = useMemo(() => baseQueue
    .filter((e) => !completedIds.has(e.id))
    .map((e) => (overrides[e.id] ? { ...e, ...overrides[e.id] } : e)),
    [baseQueue, overrides, completedIds]
  );

  const kpis = useMemo(() => {
    const uniqueCustomers = new Set(activeQueue.map((e) => e.customerName.trim().toLowerCase())).size;
    const overdue = activeQueue.filter((e) => e.queueType === "production" && e.category === "overdue");
    const outstanding = groupSumByCurrency(activeQueue.filter((e) => e.queueType === "production" && e.balanceDue > 0), (e) => e.balanceDue);
    const exchangesRefunds = activeQueue.filter((e) => e.queueType !== "production");
    const exposure = groupSumByCurrency(exchangesRefunds, (e) => Math.abs(e.balanceDue));
    return {
      uniqueCustomers, totalEntries: activeQueue.length,
      overdueCount: overdue.length,
      outstandingLabel: formatMultiCurrency(outstanding),
      exchangesRefundsCount: exchangesRefunds.length,
      exposureLabel: formatMultiCurrency(exposure),
    };
  }, [activeQueue]);

  const filterCounts = useMemo(() => ({
    all: activeQueue.length,
    production: activeQueue.filter((e) => e.queueType === "production").length,
    overdue: activeQueue.filter((e) => e.queueType === "production" && e.category === "overdue").length,
    exchange: activeQueue.filter((e) => e.queueType === "exchange").length,
    refund: activeQueue.filter((e) => e.queueType === "refund").length,
  }), [activeQueue]);

  // Counts per despatch unit — independent of the category filter/search,
  // same convention as filterCounts above, so "see each unit's pending
  // separately" works as its own dimension alongside All/Production/etc.
  const unitCounts = useMemo(() => {
    const counts = { all: activeQueue.length };
    UNIT_TABS.forEach((t) => { if (t.key !== "all") counts[t.key] = 0; });
    activeQueue.forEach((e) => { counts[e.unit] = (counts[e.unit] || 0) + 1; });
    return counts;
  }, [activeQueue]);

  const visible = useMemo(() => {
    let list = activeQueue;
    if (filter === "production") list = list.filter((e) => e.queueType === "production");
    else if (filter === "overdue") list = list.filter((e) => e.queueType === "production" && e.category === "overdue");
    else if (filter === "exchange") list = list.filter((e) => e.queueType === "exchange");
    else if (filter === "refund") list = list.filter((e) => e.queueType === "refund");

    if (unitFilter !== "all") list = list.filter((e) => e.unit === unitFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        e.customerName.toLowerCase().includes(q) ||
        (e.phone || "").replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) ||
        e.item.toLowerCase().includes(q) ||
        (e.shop || "").toLowerCase().includes(q) ||
        (e.remarks || "").toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === "overdue_first") {
      // Overdue factory-production cases always float to the very top
      // (worst-late first), regardless of what else is in the queue —
      // everything else follows, longest-waiting first.
      sorted.sort((a, b) => {
        const aOver = a.category === "overdue" ? 1 : 0;
        const bOver = b.category === "overdue" ? 1 : 0;
        if (aOver !== bOver) return bOver - aOver;
        return b.daysWaiting - a.daysWaiting;
      });
    }
    else if (sortBy === "longest") sorted.sort((a, b) => b.daysWaiting - a.daysWaiting);
    else if (sortBy === "shortest") sorted.sort((a, b) => a.daysWaiting - b.daysWaiting);
    else if (sortBy === "balance") sorted.sort((a, b) => Math.abs(b.balanceDue) - Math.abs(a.balanceDue));
    return sorted;
  }, [activeQueue, filter, unitFilter, search, sortBy]);

  const activeEntry = activeId ? activeQueue.find((e) => e.id === activeId) : null;

  const markFullyPaid = (entry) => {
    setOverrides((o) => ({ ...o, [entry.id]: { ...o[entry.id], paidAmount: entry.totalAmount, balanceDue: 0 } }));
    setToast("✅ Marked as fully paid.");
  };
  const advance = (entry) => {
    if (entry.queueType === "production" && entry.factoryStatus !== "ready_to_ship") {
      setOverrides((o) => ({ ...o, [entry.id]: { ...o[entry.id], factoryStatus: "ready_to_ship" } }));
      setToast("📦 Moved to Ready to Dispatch.");
    } else {
      setCompletedIds((prev) => new Set(prev).add(entry.id));
      setCompletedJustNow((n) => n + 1);
      setActiveId(null);
      setToast("✅ Marked complete — removed from the queue.");
    }
  };
  const copyWhatsApp = async (msg) => {
    try { await navigator.clipboard.writeText(msg); setToast("💬 WhatsApp update copied."); }
    catch { setToast("Couldn't copy automatically — select the text and copy manually."); }
  };
  const saveRemarks = (entry, text) => {
    setOverrides((o) => ({ ...o, [entry.id]: { ...o[entry.id], remarks: text } }));
    if (onPersistRemarks) {
      Promise.resolve(onPersistRemarks(entry, text))
        .then(() => setToast("📝 Remarks saved."))
        .catch(() => setToast("⚠️ Saved here, but couldn't sync — check your connection."));
    } else {
      // No persistence hook wired up (e.g. the standalone preview) — stays
      // local-only, same as before.
      setToast("📝 Remarks saved.");
    }
  };

  const LEFT_COL = 190, RIGHT_COL = 170;

  return (
    <div style={{ background: "#f8fafc", minHeight: "100%", padding: narrow ? "16px 14px 40px" : "24px 28px 48px", fontFamily: FONT_BODY }}>
      <FontLoader />

      {/* Hero header */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 22, border: "1px solid #eef1f6",
        background: "linear-gradient(120deg, #eef2ff 0%, #fdf4ff 48%, #fff1f2 100%)",
        padding: narrow ? "22px 20px" : "28px 32px", marginBottom: 22, boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}>
        <div style={{ position: "absolute", top: -70, right: -50, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.20), transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,63,94,0.16), transparent 70%)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 10px 20px -6px rgba(79,70,229,0.5)" }}>🏭</div>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: narrow ? 20 : 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                Fulfilment{" "}
                <span style={{ background: "linear-gradient(90deg,#4f46e5,#db2777)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Tracker</span>
              </div>
              <Badge bg="linear-gradient(135deg,#4f46e5,#7c3aed)" color="white">🇮🇳 ROS India</Badge>
            </div>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4, fontWeight: 500 }}>
              Every ROS India customer currently waiting on production, an exchange, or a refund — in one queue.
              {completedJustNow > 0 && <span style={{ color: "#166534", fontWeight: 700 }}> · {completedJustNow} completed this session</span>}
            </div>
          </div>
          {isDemoData && (
            <Badge bg="rgba(255,255,255,0.75)" color="#4338ca" title="Populated with sample data — pass real salesData/returnsExchangeData/refundsData props to go live">✨ Demo data</Badge>
          )}
        </div>
      </div>

      {/* KPIs — the three required at-a-glance numbers */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <KpiCard icon="👥" label="Total Waiting Customers" value={kpis.uniqueCustomers}
          sub={`${kpis.totalEntries} order${kpis.totalEntries === 1 ? "" : "s"}/return${kpis.totalEntries === 1 ? "" : "s"} total`}
          accent={{ bg: "#eef2ff", text: "#4338ca", iconColor: "white", grad: "linear-gradient(135deg,#818cf8,#4f46e5)", shadow: "rgba(79,70,229,0.4)", wash: "#e0e7ff" }} />
        <KpiCard icon="⏰" label="Overdue Orders (>14d)" value={kpis.overdueCount}
          sub={kpis.overdueCount > 0 ? `Factory production · ${kpis.outstandingLabel} outstanding` : "Factory production stream"}
          accent={{ bg: "#fee2e2", text: "#dc2626", iconColor: "white", grad: "linear-gradient(135deg,#fb7185,#dc2626)", shadow: "rgba(220,38,38,0.4)", wash: "#fee2e2" }} />
        <KpiCard icon="↩️" label="Pending Refunds/Exchanges" value={kpis.exchangesRefundsCount}
          sub={`${kpis.exposureLabel} in play`}
          accent={{ bg: "#fdf2f8", text: "#9d174d", iconColor: "white", grad: "linear-gradient(135deg,#818cf8,#f43f5e)", shadow: "rgba(219,39,119,0.4)", wash: "#fce7f3" }} />
      </div>

      {/* Filter tabs + sort */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                border: filter === f.key ? "1px solid transparent" : "1px solid #e2e8f0",
                background: filter === f.key ? "linear-gradient(135deg,#0f172a,#1e293b)" : "white",
                color: filter === f.key ? "white" : "#334155", borderRadius: 999, padding: "8px 15px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT_BODY, whiteSpace: "nowrap",
                boxShadow: filter === f.key ? "0 6px 16px -6px rgba(15,23,42,0.5)" : "none", transition: "all 0.15s ease",
              }}>
              {f.label} <span style={{ opacity: 0.7 }}>({filterCounts[f.key]})</span>
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          style={{ marginLeft: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 11px", fontSize: 12.5, fontFamily: FONT_BODY, fontWeight: 600, color: "#334155", background: "white" }}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
        </select>
      </div>

      {/* Unit tabs — see each despatch unit's pending queue separately */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Unit:</span>
        {UNIT_TABS.map((t) => (
          <button key={t.key || "unassigned"} onClick={() => setUnitFilter(t.key)}
            style={{
              border: unitFilter === t.key ? "1px solid transparent" : "1px solid #e2e8f0",
              background: unitFilter === t.key ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "white",
              color: unitFilter === t.key ? "white" : "#334155", borderRadius: 999, padding: "6px 13px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT_BODY, whiteSpace: "nowrap",
              boxShadow: unitFilter === t.key ? "0 6px 14px -6px rgba(79,70,229,0.5)" : "none", transition: "all 0.15s ease",
            }}>
            {t.label} <span style={{ opacity: 0.7 }}>({unitCounts[t.key] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchBox value={search} onChange={setSearch} />

      {/* Bar chart / queue list */}
      {!narrow && <AxisHeader leftColWidth={LEFT_COL} rightColWidth={RIGHT_COL} />}
      {visible.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 12, background: "white" }}>
          No matching customers in this view.
        </div>
      ) : (
        visible.map((entry) => (
          <QueueRow key={entry.id} entry={entry} narrow={narrow} onOpen={(e) => setActiveId(e.id)} leftColWidth={LEFT_COL} rightColWidth={RIGHT_COL} />
        ))
      )}

      {activeEntry && (
        <DetailDrawer entry={activeEntry} narrow={narrow}
          onClose={() => setActiveId(null)}
          onMarkPaid={markFullyPaid}
          onAdvance={advance}
          onSaveRemarks={saveRemarks}
          onCopyWhatsApp={copyWhatsApp}
        />
      )}
      <Toast text={toast} />
    </div>
  );
}
