import { useState, useMemo } from "react";
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
  // DD/MM/YY or DD-MM-YY  (UK 2-digit year → 2000s)
  mo = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (mo) { const y = +mo[3]; return new Date(y < 50 ? 2000 + y : 1900 + y, +mo[2] - 1, +mo[1]); }
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

  // For "year": use invoice number suffix as ground truth for FY
  // Invoice suffix digit = last digit of the FY end year
  // e.g. ROS13277 ends in 7 → FY 2026-27 (current if now in FY26-27)
  //      ROS13276 ends in 6 → FY 2025-26
  if (period === "year") {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    // Current FY end year: if Apr-Dec → ends next year; if Jan-Mar → ends this year
    const fyEndYear = m >= 3 ? y + 1 : y;
    const fySuffix = String(fyEndYear).slice(-1); // e.g. "7" for 2026-27

    return sales.filter(s => {
      const id = String(s.id || "");
      // If invoice has the ROS pattern with a suffix digit, use it
      const m2 = id.match(/^[A-Z]{2,3}(\d{4})(\d)$/);
      if (m2) return m2[2] === fySuffix;
      // Fallback to date for invoices without the suffix pattern
      const dt = toSortableDate(s.date);
      const { start, end } = getPeriodRange("year");
      return dt >= start && dt <= end;
    });
  }

  const { start, end } = getPeriodRange(period);
  if (!start || !end) return sales;
  return sales.filter(s => {
    const dt = toSortableDate(s.date);
    return dt >= start && dt <= end;
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
  // Accept either a raw dateStr or a sale object
  const id = dateStrOrSale && typeof dateStrOrSale === "object" ? dateStrOrSale.id : null;
  const dateStr = dateStrOrSale && typeof dateStrOrSale === "object" ? dateStrOrSale.date : dateStrOrSale;
  // Use invoice suffix if available — most reliable FY indicator
  if (id) {
    const m2 = String(id).match(/^[A-Z]{2,3}(\d{4})(\d)$/);
    if (m2) {
      const suffixDigit = +m2[2];
      // Determine the full FY end year from the suffix digit
      // The suffix is the last digit of the year FY ends in.
      // Find the nearest decade that makes sense relative to now.
      const nowYear = new Date().getFullYear();
      const decade = Math.floor(nowYear / 10) * 10;
      let endYear = decade + suffixDigit;
      // Adjust if endYear is more than 5 years away from now (pick closer decade)
      if (endYear - nowYear > 5) endYear -= 10;
      if (nowYear - endYear > 5) endYear += 10;
      return endYear - 1; // FY start year = end year - 1
    }
  }
  const d = safeParseDate(dateStr);
  if (!d || isNaN(d.getTime())) return null;
  return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
}
function fyLabel(startYear) {
  if (startYear === null || isNaN(startYear)) return "";
  return `FY ${startYear}–${String(startYear + 1).slice(-2)}`;
}

function buildRowsWithSeparators(sortedRows) {
  const result = [];
  for (let i = 0; i < sortedRows.length; i++) {
    const curr = sortedRows[i];
    const prev = sortedRows[i - 1];
    if (prev) {
      const prevFY = fyStartYear(prev);   // pass full sale object
      const currFY = fyStartYear(curr);
      const prevMK = monthKey(prev.date);
      const currMK = monthKey(curr.date);
      if (prevFY !== currFY)
        result.push({ _type: "fy", _fyStart: currFY, _label: fyLabel(currFY) });
      if (prevMK !== currMK)
        result.push({ _type: "month", _monthKey: currMK, _label: monthLabel(curr.date) });
    }
    result.push(curr);
  }
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
  statusFilter,
  setStatusFilter,
  statusTabs,
  statusRowBg: statusRowBgProp,
}) {
  const [hovR,    setHovR]    = useState(null);
  const [hovCard, setHovCard] = useState(null);
  const [hovTab,  setHovTab]  = useState(null);
  const [reloading, setReloading] = useState(false);
  /* Use prop-driven status tab if provided, else fall back to local state */
  const [statusTabLocal, setStatusTabLocal] = useState("ALL");
  const statusTab    = statusFilter    ?? statusTabLocal;
  const setStatusTab = setStatusFilter ?? setStatusTabLocal;

  const accent   = shop?.accent   || "#059669";
  const accentBg = shop?.accentBg || "#ecfdf5";

  /* ── Period-filtered sales ───────────────────────────────────────────── */
  // KPI cards: filter from ALL sales (not search/status filtered)
  const periodSales = useMemo(
    () => filterByPeriod(sales, salesPeriod),
    [sales, salesPeriod]
  );
  // Table rows: filter from search+status filtered sales
  const periodFiltSales = useMemo(
    () => filterByPeriod(filtSales, salesPeriod),
    [filtSales, salesPeriod]
  );

  /* ── KPI values — across full period, all statuses ───────────────────── */
  const totalRev = periodSales.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const totalQty = periodSales.reduce((a, s) => a + (Number(s.qty)    || 1), 0);
  const avgOrder = periodSales.length > 0 ? Math.round(totalRev / periodSales.length) : 0;
  const fmtAmt   = v => fmt ? fmt(shopId, v) : `${shop?.symbol || "£"}${Number(v).toLocaleString()}`;

  /* ── Status tab counts (from period+search filtered) ─────────────────── */
  const tabCounts = useMemo(() => {
    const c = { ALL: periodFiltSales.length };
    (statusTabs || STATUS_TABS).forEach(t => {
      const k = t.key ?? t;
      if (k !== "ALL")
        c[k] = periodFiltSales.filter(s => (s.ful || s.status || "PENDING") === k).length;
    });
    return c;
  }, [periodFiltSales, statusTabs]);

  /* ── Status-filtered rows for table ─────────────────────────────────── */
  const statusFiltered = useMemo(() => {
    if (statusTab === "ALL") return periodFiltSales;
    return periodFiltSales.filter(s => (s.ful || s.status || "PENDING") === statusTab);
  }, [periodFiltSales, statusTab]);

  /* ── Sort descending by date ─────────────────────────────────────────── */
  const sortedSales = useMemo(
    () => [...statusFiltered].sort((a, b) => {
    const dateDiff = toSortableDate(b.date).localeCompare(toSortableDate(a.date));
    if (dateDiff !== 0) return dateDiff;
    const numA = parseInt((a.id||"0").replace(/[^0-9]/g,""))||0;
    const numB = parseInt((b.id||"0").replace(/[^0-9]/g,""))||0;
    return numB - numA;
  }),
    [statusFiltered]
  );

  /* ── Rows with month / FY separators ────────────────────────────────── */
  const rowsWithSeparators = useMemo(
    () => buildRowsWithSeparators(sortedSales),
    [sortedSales]
  );

  /* ── Period range label ─────────────────────────────────────────────── */
  const { start, end } = getPeriodRange(salesPeriod);
  const rangeLabel = !start ? "All records"
    : start === end ? fmtDate(start)
    : `${fmtDate(start)} → ${fmtDate(end)}`;

  const PERIODS = isStaff
    ? ["day", "week", "month"]
    : ["day", "week", "month", "year", "lifetime"];

  const resolvedTabs = statusTabs || STATUS_TABS;
  const activeTabCfg = STATUS_TABS.find(t => t.key === statusTab) || STATUS_TABS[0];

  /* ── KPI card config ────────────────────────────────────────────────── */
  const kpiCards = [
    {
      icon: "🛒", label: "Total Orders",
      value: periodSales.length,
      sub: `${periodSales.length} order${periodSales.length !== 1 ? "s" : ""}`,
      topColor:  "#6366f1",
      topGrad:   "linear-gradient(90deg,#4f46e5,#818cf8,#4f46e5)",
      iconBg:    "#eef2ff",
      iconColor: "#4f46e5",
      valColor:  "#1e1b4b",
      shadow:    "rgba(99,102,241,0.14)",
      glowColor: "rgba(99,102,241,0.32)",
    },
    {
      icon: "📦", label: "Total Quantity",
      value: `${totalQty} units`,
      sub: "units sold",
      topColor:  "#0ea5e9",
      topGrad:   "linear-gradient(90deg,#0284c7,#38bdf8,#0284c7)",
      iconBg:    "#e0f2fe",
      iconColor: "#0284c7",
      valColor:  "#0c4a6e",
      shadow:    "rgba(14,165,233,0.14)",
      glowColor: "rgba(14,165,233,0.32)",
    },
    {
      icon: "💰", label: "Total Revenue",
      value: fmtAmt(totalRev),
      sub: "gross revenue",
      topColor:  accent,
      topGrad:   `linear-gradient(90deg,${accent},${accent}99,${accent})`,
      iconBg:    accentBg,
      iconColor: accent,
      valColor:  "#0f172a",
      shadow:    `${accent}22`,
      glowColor: `${accent}44`,
    },
    {
      icon: "📈", label: "Avg Order Value",
      value: fmtAmt(avgOrder),
      sub: "per order",
      topColor:  "#f59e0b",
      topGrad:   "linear-gradient(90deg,#d97706,#fbbf24,#d97706)",
      iconBg:    "#fef3c7",
      iconColor: "#d97706",
      valColor:  "#451a03",
      shadow:    "rgba(245,158,11,0.14)",
      glowColor: "rgba(245,158,11,0.36)",
    },
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
          {/* Period selector */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
            {PERIODS.map(p => {
              const isActive = salesPeriod === p;
              return (
                <button key={p} onClick={() => setSalesPeriod(p)} title={PERIOD_META[p].desc}
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
          <button onClick={() => setModal("import-sales")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            ⬇ Import
          </button>
          <button onClick={() => setModal("export-sales")}
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
          KPI CARDS
         ══════════════════════════════════════════════════════════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16, marginBottom: 20,
      }}>
        {kpiCards.map((card, i) => {
          const isHov = hovCard === i;
          return (
            <div key={card.label}
              onMouseEnter={() => setHovCard(i)}
              onMouseLeave={() => setHovCard(null)}
              style={{
                background: "white",
                borderRadius: 18,
                border: "1px solid #f1f5f9",
                overflow: "hidden",
                boxShadow: isHov
                  ? `0 20px 48px ${card.glowColor}, 0 4px 16px ${card.shadow}`
                  : `0 2px 12px ${card.shadow}`,
                transform: isHov ? "translateY(-6px) scale(1.025)" : "translateY(0) scale(1)",
                transition: "all 0.24s cubic-bezier(0.34,1.56,0.64,1)",
                cursor: "default",
                position: "relative",
              }}>

              {/* ── Coloured top accent bar ── */}
              <div style={{
                height: 5,
                background: card.topGrad,
                backgroundSize: isHov ? "200% 100%" : "100% 100%",
                transition: "background-size 0.4s ease",
              }} />

              {/* ── Shimmer overlay on hover ── */}
              <div style={{
                position: "absolute", top: 5, left: 0, right: 0, bottom: 0,
                background: isHov
                  ? `radial-gradient(ellipse at 60% 0%, ${card.glowColor} 0%, transparent 70%)`
                  : "transparent",
                transition: "background 0.30s ease",
                pointerEvents: "none",
                borderRadius: "0 0 18px 18px",
              }} />

              {/* ── Card body ── */}
              <div style={{ padding: "18px 20px 20px" }}>
                {/* Icon + label row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: card.iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 21,
                    boxShadow: isHov ? `0 4px 14px ${card.glowColor}` : "none",
                    transition: "box-shadow 0.24s",
                    transform: isHov ? "scale(1.10) rotate(-4deg)" : "scale(1) rotate(0deg)",
                  }}>
                    {card.icon}
                  </div>
                  {/* Animated colour dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: card.topColor,
                    boxShadow: isHov ? `0 0 0 4px ${card.glowColor}` : "none",
                    transition: "box-shadow 0.24s",
                  }} />
                </div>

                {/* Label */}
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#94a3b8",
                  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6,
                }}>
                  {card.label}
                </div>

                {/* Value */}
                <div style={{
                  fontSize: 26, fontWeight: 900,
                  color: isHov ? card.topColor : card.valColor,
                  lineHeight: 1.1, letterSpacing: "-0.5px",
                  transition: "color 0.20s",
                }}>
                  {card.value}
                </div>

                {/* Sub label + accent bottom line */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{card.sub}</span>
                  <div style={{
                    height: 2, width: isHov ? 32 : 16, borderRadius: 2,
                    background: card.topColor,
                    transition: "width 0.30s ease",
                  }} />
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
                {["Invoice", "Date", "Customer", "Item", "Amount", "Payment", "Status", "Actions"]
                  .map((h, i) => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: i >= 4 ? "right" : "left",
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
                  <td colSpan={8} style={{ padding: "52px 16px", textAlign: "center" }}>
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
                      <td colSpan={8} style={{ padding: 0 }}>
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
                      <td colSpan={8} style={{ padding: 0 }}>
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

                /* ── SALE ROW ────────────────────────────────────────────── */
                const s   = row;
                const ful = s.ful || s.status || "PENDING";
                const isH = hovR === s.id;
                const mergedRowBg = { ...STATUS_ROW_BG, ...(statusRowBgProp || {}) };
                const rowBg = isH ? `${accent}10` : (mergedRowBg[ful] || "white");

                return (
                  <tr key={s.id}
                    onClick={() => setSelRow(s)}
                    onMouseEnter={() => setHovR(s.id)}
                    onMouseLeave={() => setHovR(null)}
                    style={{
                      background: rowBg, cursor: "pointer",
                      borderBottom: "1px solid #f8fafc",
                      transition: "background 0.12s",
                    }}>
                    {/* Invoice */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: "DM Mono,monospace", fontWeight: 700, fontSize: 12, color: accent }}>
                        {s.id}
                      </span>
                    </td>
                    {/* Date */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                        {fmtDate(s.date)}
                      </span>
                    </td>
                    {/* Customer */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", textTransform: "uppercase" }}>{s.customer}</div>
                      {s.phone && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{s.phone}</div>}
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
                    {/* Amount */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                        {fmt ? fmt(shopId, s.amount) : `${shop?.symbol || "£"}${Number(s.amount).toLocaleString()}`}
                      </span>
                    </td>
                    {/* Payment */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Badge l={s.pay || "SHOP"} />
                    </td>
                    {/* Status */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Badge l={ful} />
                    </td>
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
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {sortedSales.length} record{sortedSales.length !== 1 ? "s" : ""}
              {statusTab !== "ALL" && (
                <span style={{ color: activeTabCfg.color, fontWeight: 700 }}>
                  {" "}· {activeTabCfg.label}
                </span>
              )}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
              Subtotal:{" "}
              {fmtAmt(sortedSales.reduce((a, s) => a + (Number(s.amount) || 0), 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
