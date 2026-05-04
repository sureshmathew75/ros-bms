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
  /* Month picker state */
  const [pickedMonth, setPickedMonth] = useState(null);   // "YYYY-MM" or null
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
    return arr.filter(s => {
      const dt = safeParseDate(s.date);
      if (!dt || isNaN(dt.getTime())) return false;
      return dt.getFullYear() === py && (dt.getMonth() + 1) === pm;
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

  /* ── Sort: FY descending → date descending → invoice number descending ── */
  const sortedSales = useMemo(
    () => [...statusFiltered].sort((a, b) => {
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
    [statusFiltered]
  );

  /* ── Rows with month / FY separators ────────────────────────────────── */
  const rowsWithSeparators = useMemo(
    () => buildRowsWithSeparators(sortedSales),
    [sortedSales]
  );

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
                {/* FY rows — newest first, current year bigger */}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
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
                {["Invoice", "Date", "Customer", "Item", "Amount", "Payment", "Status", "Tags",
                  ...(shopId==="ros-india" ? ["Pur. Amount"] : []),
                  "Actions"]
                  .map((h, i) => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: (i >= 4 && i !== 7) ? "right" : "left",
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
                  <td colSpan={shopId==="ros-india" ? 10 : 9} style={{ padding: "52px 16px", textAlign: "center" }}>
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
                      <td colSpan={shopId==="ros-india" ? 10 : 9} style={{ padding: 0 }}>
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
                      <td colSpan={shopId==="ros-india" ? 10 : 9} style={{ padding: 0 }}>
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
                        {fmtDateForSale(s)}
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
                      {(() => {
                        const sym = shop?.symbol || "£";
                        const net = (Number(s.amount)||0) - (Number(s.adjAmt)||0);
                        const orig = Number(s.amount)||0;
                        const fmtVal = (v) => fmt ? fmt(shopId, v) : sym + v.toLocaleString("en-GB", {minimumFractionDigits:2,maximumFractionDigits:2});
                        return (
                          <>
                            <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{fmtVal(net)}</span>
                            {(Number(s.adjAmt)||0) > 0 && (
                              <div style={{ fontSize: 10, color: "#d97706", marginTop: 2, whiteSpace: "nowrap" }}>
                                was {fmtVal(orig)}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    {/* Payment */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Badge l={s.pay || "SHOP"} />
                      {(s.pay === "SHOP" || !s.pay) && s.shopInvoiceNo && (
                        <div style={{
                          fontSize: 10, fontFamily: "DM Mono,monospace",
                          color: "#64748b", marginTop: 3, whiteSpace: "nowrap",
                        }}>
                          {s.shopInvoiceNo}
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Badge l={ful} />
                    </td>
                    {/* Tags */}
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
                    {/* Pur. Amount — ROS INDIA only */}
                    {shopId==="ros-india"&&(
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {s.purAmount ? (
                          <span style={{
                            fontFamily: "DM Mono, monospace", fontSize: 12, fontWeight: 700,
                            color: "#166534", background: "#f0fdf4",
                            border: "1px solid #bbf7d0", borderRadius: 7,
                            padding: "3px 9px", whiteSpace: "nowrap",
                          }}>
                            {shop.symbol}{Number(s.purAmount).toLocaleString()}
                          </span>
                        ) : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                      </td>
                    )}
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
              {fmtAmt(sortedSales.reduce((a, s) => a + (Number(s.amount) || 0) - (Number(s.adjAmt) || 0), 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}