import { useState, useMemo } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   PURCHASES PANEL
   Financial Year: 1 April → 31 March (all shops)
   ───────────────────────────────────────────────────────────────────────── */

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

/** Returns the FY start year for a date string.
 *  Jan–Mar belong to the *previous* FY start year.
 *  e.g. 2025-02-10 → FY 2024-25 → 2024
 *       2025-04-01 → FY 2025-26 → 2025
 */
function fyStartYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const m = d.getMonth(); // 0-based; April = 3
  const y = d.getFullYear();
  return m < 3 ? y - 1 : y;
}

function fyLabel(startYear) {
  return `FY ${startYear}–${String(startYear + 1).slice(-2)}`;
}

/**
 * Injects separator objects into a descending-date-sorted list.
 *   { _type: "fy",    _fyStart, _label }   — at every 1-April FY boundary
 *   { _type: "month", _monthKey, _label }  — at every month boundary
 *
 * Both can fire together (e.g. crossing March → April); FY bar appears first.
 */
function buildRowsWithSeparators(sortedRows) {
  const result = [];
  for (let i = 0; i < sortedRows.length; i++) {
    const curr = sortedRows[i];
    const prev = sortedRows[i - 1];

    if (prev) {
      const prevFY = fyStartYear(prev.date);
      const currFY = fyStartYear(curr.date);
      const prevMK = monthKey(prev.date);
      const currMK = monthKey(curr.date);

      if (prevFY !== currFY) {
        result.push({ _type: "fy", _fyStart: currFY, _label: fyLabel(currFY) });
      }
      if (prevMK !== currMK) {
        result.push({ _type: "month", _monthKey: currMK, _label: monthLabel(curr.date) });
      }
    }

    result.push(curr);
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PurchasesPanel({
  Badge,
  fmt,
  onExport,
  onImport,
  onNewPurchase,
  purch,
  shop,
  shopId,
}) {
  const [hovR, setHovR]     = useState(null);
  const [search, setSearch] = useState("");
  const accent = shop?.accent || "#059669";

  /* ── Filter by search ───────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return purch;
    return purch.filter(p =>
      (p.id            || "").toLowerCase().includes(q) ||
      (p.supplier      || p.sup || "").toLowerCase().includes(q) ||
      (p.item          || "").toLowerCase().includes(q) ||
      (p.invoiceNo     || "").toLowerCase().includes(q) ||
      (p.batch         || "").toLowerCase().includes(q)
    );
  }, [purch, search]);

  /* ── Sort descending by date ─────────────────────────────────────────── */
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [filtered]
  );

  /* ── Build rows with separators ──────────────────────────────────────── */
  const rows = useMemo(() => buildRowsWithSeparators(sorted), [sorted]);

  /* ── Summary KPIs ────────────────────────────────────────────────────── */
  const totalSpend = filtered.reduce((a, p) => a + (Number(p.total) || Number(p.amount) || 0), 0);

  /* ── Status badge colours for purchase status ────────────────────────── */
  const purchStatusBg = {
    "RECEIVED":  "#f0fdf4",
    "PENDING":   "#fffbeb",
    "ORDERED":   "#eff6ff",
    "CANCELLED": "#fef2f2",
    "PARTIAL":   "#fff7ed",
  };

  return (
    <div style={{ padding: 0 }}>

      {/* ── PAGE HEADER ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
            Purchases
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {totalSpend > 0 && (
              <> · Total: <strong style={{ color: "#374151" }}>
                {fmt ? fmt(shopId, totalSpend) : `${shop?.symbol || "£"}${totalSpend.toLocaleString()}`}
              </strong></>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onImport}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            ⬇ Import
          </button>
          <button
            onClick={onExport}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
              background: "white", color: "#374151", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            ⬆ Export
          </button>
          <button
            onClick={onNewPurchase}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: accent, color: "white", fontWeight: 800, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 3px 10px ${accent}44`,
            }}>
            + New Purchase
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "white", borderRadius: 12, border: "1px solid #e2e8f0",
          padding: "9px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <span style={{ fontSize: 14, color: "#94a3b8" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by PO ID, supplier, item, invoice…"
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 13, color: "#374151", background: "transparent",
              fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 16, color: "#94a3b8", padding: 0, lineHeight: 1,
              }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── PURCHASES TABLE ── */}
      <div style={{
        background: "white", borderRadius: 16, border: "1px solid #f1f5f9",
        overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["PO ID", "Date", "Supplier", "Item", "Qty", "Total", "Status", "Pay By"].map((h, i) => (
                  <th key={h} style={{
                    padding: "11px 16px",
                    textAlign: i >= 5 ? "right" : "left",
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
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#94a3b8", fontSize: 14 }}>
                      No purchases found
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1" }}>
                      Add a new purchase order to get started
                    </p>
                  </td>
                </tr>
              )}

              {rows.map((row, idx) => {

                /* ── FINANCIAL YEAR BOUNDARY ROW ────────────────────────── */
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

                /* ── MONTH BOUNDARY ROW ─────────────────────────────────── */
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

                /* ── PURCHASE ROW ───────────────────────────────────────── */
                const p      = row;
                const status = (p.status || "RECEIVED").toUpperCase();
                const isH    = hovR === p.id;
                const rowBg  = isH ? `${accent}08` : (purchStatusBg[status] || "white");
                const sup    = p.supplier || p.sup || "—";
                const amount = Number(p.total) || Number(p.amount) || 0;

                return (
                  <tr
                    key={p.id || idx}
                    onMouseEnter={() => setHovR(p.id)}
                    onMouseLeave={() => setHovR(null)}
                    style={{
                      background: rowBg,
                      borderBottom: "1px solid #f8fafc",
                      transition: "background 0.12s",
                    }}>
                    {/* PO ID */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{
                        fontFamily: "DM Mono, monospace", fontWeight: 700,
                        fontSize: 12, color: accent,
                      }}>
                        {p.id}
                      </div>
                      {p.invoiceNo && (
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                          Inv: {p.invoiceNo}
                        </div>
                      )}
                    </td>
                    {/* Date */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                        {p.date || "—"}
                      </span>
                    </td>
                    {/* Supplier */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                        {sup}
                      </div>
                      {p.batch && (
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                          Batch: {p.batch}
                        </div>
                      )}
                    </td>
                    {/* Item */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "#374151" }}>
                        {p.item || p.itemCustom || "—"}
                      </span>
                    </td>
                    {/* Qty */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {p.qty || "—"}
                      </span>
                    </td>
                    {/* Total */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                        {amount > 0
                          ? (fmt ? fmt(shopId, amount) : `${shop?.symbol || "£"}${amount.toLocaleString()}`)
                          : "—"}
                      </span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Badge l={status} />
                    </td>
                    {/* Pay By */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                        {p.payBy || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 20px",
            borderTop: "1px solid #f1f5f9",
            background: "#f8fafc",
          }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
            {totalSpend > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                Total Spend: {fmt ? fmt(shopId, totalSpend) : `${shop?.symbol || "£"}${totalSpend.toLocaleString()}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}