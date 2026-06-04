import { useState, useMemo } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   SALES PANEL
   Period definitions:
     day      → today only (current calendar day)
     week     → Monday–Sunday of the current ISO week
     month    → 1st–last date of current calendar month
     year     → Financial Year: 1 April → 31 March
     lifetime → all records
   ───────────────────────────────────────────────────────────────────────── */

/* ── Period helpers ─────────────────────────────────────────────────────── */
function getPeriodRange(period) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();   // 0-based
  const d   = now.getDate();

  switch (period) {
    case "day": {
      const today = now.toISOString().slice(0, 10);
      return { start: today, end: today };
    }
    case "week": {
      const dow   = now.getDay();
      const diff  = (dow === 0 ? -6 : 1 - dow);
      const mon   = new Date(y, m, d + diff);
      const sun   = new Date(y, m, d + diff + 6);
      return {
        start: mon.toISOString().slice(0, 10),
        end:   sun.toISOString().slice(0, 10),
      };
    }
    case "month": {
      const first = new Date(y, m, 1).toISOString().slice(0, 10);
      const last  = new Date(y, m + 1, 0).toISOString().slice(0, 10);
      return { start: first, end: last };
    }
    case "year": {
      // Financial year: 1 April → 31 March
      const fyStartYear = (m < 3) ? y - 1 : y;
      const start = `${fyStartYear}-04-01`;
      const end   = `${fyStartYear + 1}-03-31`;
      return { start, end };
    }
    case "lifetime":
    default:
      return { start: null, end: null };
  }
}

function filterByPeriod(sales, period) {
  const { start, end } = getPeriodRange(period);
  if (!start && !end) return sales;
  return sales.filter(s => {
    const dt = s.date || "";
    return dt >= start && dt <= end;
  });
}

/* ── Date / FY helpers ──────────────────────────────────────────────────── */
function monthKey(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

/** Returns the FY start year for a given date string.
 *  FY starts 1 April, so Jan–Mar belong to the previous FY start year.
 *  e.g. 2025-01-15 → FY 2024-25 → fyStartYear = 2024
 *       2025-05-01 → FY 2025-26 → fyStartYear = 2025
 */
function fyStartYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based; April = 3
  return m < 3 ? y - 1 : y;
}

function fyLabel(startYear) {
  return `FY ${startYear}–${String(startYear + 1).slice(-2)}`;
}

/* ── Period button label descriptions ──────────────────────────────────── */
const PERIOD_META = {
  day:      { label: "Day",      desc: "Today" },
  week:     { label: "Week",     desc: "Mon–Sun" },
  month:    { label: "Month",    desc: "This Month" },
  year:     { label: "Year",     desc: "Financial Year" },
  lifetime: { label: "Lifetime", desc: "All Time" },
};

/* ── Separator row builders ─────────────────────────────────────────────── */
/**
 * Walks the descending-date-sorted list and injects two types of separator
 * objects:
 *   { _type: "month",  _monthKey, _label }   — shown at every month boundary
 *   { _type: "fy",     _fyStart, _label }     — shown at every 1-April boundary
 *
 * Since rows are newest-first, a boundary fires when the NEXT row is older.
 * We place the separator BETWEEN the two rows so it reads as the dividing line.
 * A single transition can trigger BOTH (e.g. crossing from March into April of
 * a new FY); in that case the FY bar appears first (above the month bar).
 */
function buildRowsWithSeparators(sortedRows) {
  const result = [];

  for (let i = 0; i < sortedRows.length; i++) {
    const curr = sortedRows[i];
    const prev = sortedRows[i - 1]; // undefined for first row

    if (prev) {
      const prevMK  = monthKey(prev.date);
      const currMK  = monthKey(curr.date);
      const prevFY  = fyStartYear(prev.date);
      const currFY  = fyStartYear(curr.date);

      // FY boundary fires first (more prominent, sits above month separator)
      if (prevFY !== currFY) {
        result.push({
          _type: "fy",
          _fyStart: currFY,
          _label: fyLabel(currFY),
          // The new FY started on 1 April of currFY+1 year? No — currFY is the
          // start year, so the year label is currFY → currFY+1.
        });
      }

      // Month boundary (always fire on month change, even when FY also changed)
      if (prevMK !== currMK) {
        result.push({
          _type: "month",
          _monthKey: currMK,
          _label: monthLabel(curr.date),
        });
      }
    }

    result.push(curr);
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function SalesPanel({
  Badge,
  customers,
  filtSales,
  fmt,
  formatDate,
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
}) {
  const [hovR, setHovR] = useState(null);
  const accent = shop?.accent || "#059669";

  /* ── Compute period-filtered sales ──────────────────────────────────── */
  const periodSales = useMemo(
    () => filterByPeriod(filtSales, salesPeriod),
    [filtSales, salesPeriod]
  );

  /* ── Sort descending by date ─────────────────────────────────────────── */
  const sortedSales = useMemo(
    () => [...periodSales].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [periodSales]
  );

  /* ── Build rows with month + FY separators ───────────────────────────── */
  const rowsWithSeparators = useMemo(
    () => buildRowsWithSeparators(sortedSales),
    [sortedSales]
  );

  /* ── Overview KPIs ──────────────────────────────────────────────────── */
  const totalRev   = periodSales.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const paidCount  = periodSales.filter(s => s.pay === "Paid" || s.pay === "SHOP" || s.pay === "BANK").length;
  const pendCount  = periodSales.filter(s => s.pay === "Pending").length;
  const fulCount   = periodSales.filter(s => (s.ful || s.status || "") === "FULFILLED").length;

  /* ── Period range label ─────────────────────────────────────────────── */
  const { start, end } = getPeriodRange(salesPeriod);
  const rangeLabel = (() => {
    if (!start) return "All records";
    if (start === end) return formatDate ? formatDate(start) : start;
    return `${start} → ${end}`;
  })();

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const statusRowBg = {
    "PENDING":       "#fffbeb",
    "FULFILLED":     "#f0fdf4",
    "GOOD FEEDBACK": "#ecfdf5",
    "RTRN REQSTD":   "#fff7ed",
    "RETRN RCVD":    "#fef2f2",
    "EXCHANGED":     "#eef2ff",
    "REFUNDED":      "#faf5ff",
  };

  const PERIODS = isStaff
    ? ["day", "week", "month"]
    : ["day", "week", "month", "year", "lifetime"];

  return (
    <div style={{ padding: 0 }}>

      {/* ── PAGE HEADER ── */}
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setModal("export-sales")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            ⬆ Export
          </button>
          <button
            onClick={() => setModal("new-sale")}
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

      {/* ── SALES OVERVIEW BAR ── */}
      <div style={{
        background: "white", borderRadius: 16, border: "1px solid #f1f5f9",
        padding: "16px 20px", marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        {/* Period selector row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Overview:</span>
            <div style={{
              display: "flex", background: "#f1f5f9", borderRadius: 10,
              padding: 3, gap: 2,
            }}>
              {PERIODS.map(p => {
                const isActive = salesPeriod === p;
                const meta = PERIOD_META[p];
                return (
                  <button
                    key={p}
                    onClick={() => setSalesPeriod(p)}
                    title={meta.desc}
                    style={{
                      padding: "5px 13px", borderRadius: 8, border: "none",
                      background: isActive ? accent : "transparent",
                      color: isActive ? "white" : "#64748b",
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                      boxShadow: isActive ? `0 2px 8px ${accent}44` : "none",
                    }}>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <span style={{
            fontSize: 11, color: "#94a3b8", fontWeight: 500,
            background: "#f8fafc", border: "1px solid #f1f5f9",
            borderRadius: 7, padding: "3px 10px",
          }}>
            {rangeLabel}
          </span>
        </div>

        {/* KPI tiles */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}>
          {[
            {
              icon: "💰", label: "Revenue",
              value: fmt ? fmt(shopId, totalRev) : `${shop?.symbol || "£"}${totalRev.toLocaleString()}`,
              color: accent, bg: shop?.accentBg || "#ecfdf5",
            },
            {
              icon: "🛒", label: "Orders",
              value: periodSales.length,
              color: "#3b82f6", bg: "#eff6ff",
            },
            {
              icon: "✅", label: "Fulfilled",
              value: fulCount,
              color: "#10b981", bg: "#ecfdf5",
            },
            {
              icon: "⏳", label: "Pending Pay",
              value: pendCount,
              color: "#f59e0b", bg: "#fffbeb",
            },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: kpi.bg, borderRadius: 12,
              padding: "12px 14px",
              border: `1px solid ${kpi.color}22`,
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{kpi.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: kpi.color }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SALES TABLE ── */}
      <div style={{
        background: "white", borderRadius: 16, border: "1px solid #f1f5f9",
        overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {[
                  "Invoice", "Date", "Customer", "Item", "Amount",
                  "Payment", "Status", "Actions",
                ].map((h, i) => (
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
              {rowsWithSeparators.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#94a3b8", fontSize: 14 }}>
                      No sales found for this period
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1" }}>
                      Try a different time range or add a new sale
                    </p>
                  </td>
                </tr>
              )}

              {rowsWithSeparators.map((row, idx) => {

                /* ── FINANCIAL YEAR BOUNDARY ROW ─────────────────────────── */
                if (row._type === "fy") {
                  return (
                    <tr key={`fy-${row._fyStart}-${idx}`}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 16px",
                          background: "linear-gradient(90deg, #fef3c7 0%, #fde68a 40%, #fef3c7 100%)",
                          borderTop: "2px solid #f59e0b",
                          borderBottom: "2px solid #f59e0b",
                        }}>
                          {/* Diamond icon */}
                          <span style={{ fontSize: 14, lineHeight: 1 }}>◆</span>
                          <span style={{
                            fontSize: 11, fontWeight: 900, color: "#78350f",
                            textTransform: "uppercase", letterSpacing: "0.10em",
                          }}>
                            {row._label} &nbsp;·&nbsp; Financial Year Starts 1 April
                          </span>
                          <div style={{ flex: 1, height: 1, background: "#f59e0b88" }} />
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: "#92400e",
                            background: "#fef9c3",
                            border: "1px solid #fde68a",
                            borderRadius: 6, padding: "2px 9px",
                            whiteSpace: "nowrap",
                          }}>
                            📅 New Financial Year
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                /* ── MONTH BOUNDARY ROW ──────────────────────────────────── */
                if (row._type === "month") {
                  return (
                    <tr key={`month-${row._monthKey}-${idx}`}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "6px 16px",
                          background: "linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)",
                          borderTop: "1px solid #bae6fd",
                          borderBottom: "1px solid #bae6fd",
                        }}>
                          {/* Dot */}
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
                            background: "white",
                            border: "1px solid #bae6fd",
                            borderRadius: 6, padding: "2px 8px",
                            whiteSpace: "nowrap",
                          }}>
                            ↕ month boundary
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                /* ── SALE ROW ────────────────────────────────────────────── */
                const s = row;
                const ful = s.ful || s.status || "PENDING";
                const isH = hovR === s.id;
                const rowBg = isH ? `${accent}08` : (statusRowBg[ful] || "white");

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelRow(s)}
                    onMouseEnter={() => setHovR(s.id)}
                    onMouseLeave={() => setHovR(null)}
                    style={{
                      background: rowBg,
                      cursor: "pointer",
                      borderBottom: "1px solid #f8fafc",
                      transition: "background 0.12s",
                    }}>
                    {/* Invoice */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontFamily: "DM Mono, monospace", fontWeight: 700,
                        fontSize: 12, color: accent,
                      }}>
                        {s.id}
                      </span>
                    </td>
                    {/* Date */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatDate ? formatDate(s.date) : s.date}
                      </span>
                    </td>
                    {/* Customer */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                        {s.customer}
                      </div>
                      {s.phone && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                          {s.phone}
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

        {/* Table footer */}
        {periodSales.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 20px",
            borderTop: "1px solid #f1f5f9",
            background: "#f8fafc",
          }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {periodSales.length} record{periodSales.length !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
              Total: {fmt ? fmt(shopId, totalRev) : `${shop?.symbol || "£"}${totalRev.toLocaleString()}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
