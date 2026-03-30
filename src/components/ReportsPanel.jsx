import { useState } from "react";

const REPORTS = [
  { t:"Sales Report",     d:"Sales summary with customer breakdown",  ic:"📊", key:"sales"    },
  { t:"Purchase Report",  d:"Supplier purchases & payment status",     ic:"📦", key:"purchases" },
  { t:"P&L Statement",    d:"Revenue, expenses and profit / loss",     ic:"💹", key:"pl"        },
  { t:"Stock Report",     d:"Inventory levels and valuation",          ic:"🏷️", key:"stock"     },
  { t:"Customer Report",  d:"Customer activity and lifetime value",    ic:"👥", key:"customers" },
  { t:"Expense Report",   d:"Expense breakdown by category",           ic:"💳", key:"expenses"  },
];

export default function ReportsPanel({ shop }) {
  const [hov, setHov] = useState(null);
  const [active, setActive] = useState(null);

  const handlePreview = (r) => setActive(active === r.key ? null : r.key);

  const handlePdf = (r) => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for this site."); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${r.t} — ${shop.name}</title>
<style>
  body{font-family:Arial,sans-serif;padding:32px;color:#0f172a;}
  h1{font-size:22px;margin:0 0 4px;}
  p{color:#64748b;font-size:13px;margin:0 0 24px;}
  .badge{display:inline-block;background:#f1f5f9;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;color:#475569;}
  @page{size:A4;margin:20mm;}
</style></head><body>
<h1>${r.ic} ${r.t}</h1>
<p>${shop.name} · Generated ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</p>
<p class="badge">Full report data coming soon — connect your data source.</p>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.onafterprint = () => win.close(); }, 400);
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
          Reports
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
          {shop.name} · Select a report to preview or download as PDF
        </p>
      </div>

      {/* ── Cards grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
        gap: 16,
        marginBottom: 24,
      }}>
        {REPORTS.map(r => {
          const isH = hov === r.key;
          const isA = active === r.key;
          return (
            <div key={r.key}
              onMouseEnter={() => setHov(r.key)}
              onMouseLeave={() => setHov(null)}
              style={{
                background: "white",
                borderRadius: 16,
                padding: 22,
                border: isA
                  ? "2px solid " + shop.accent
                  : isH
                    ? "1px solid " + shop.accent + "55"
                    : "1px solid #f1f5f9",
                boxShadow: isH || isA
                  ? "0 8px 24px " + shop.accent + "22"
                  : "0 1px 6px rgba(0,0,0,0.06)",
                transition: "all 0.18s",
                cursor: "default",
              }}>

              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: shop.accentBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, marginBottom: 12,
              }}>{r.ic}</div>

              {/* Title + desc */}
              <h3 style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                {r.t}
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                {r.d}
              </p>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handlePreview(r)}
                  style={{
                    padding: "7px 16px", borderRadius: 9,
                    border: "1px solid " + shop.accent + "44",
                    background: isA ? shop.accent : shop.accentBg,
                    color: isA ? "white" : shop.accentText,
                    fontSize: 12, fontWeight: 800, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                  {isA ? "▲ Hide" : "👁 Preview"}
                </button>
                <button
                  onClick={() => handlePdf(r)}
                  style={{
                    padding: "7px 16px", borderRadius: 9,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc", color: "#374151",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#0f172a"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#374151"; }}>
                  🖨 Print / PDF
                </button>
              </div>

              {/* Preview panel */}
              {isA && (
                <div style={{
                  marginTop: 16,
                  padding: "14px 16px",
                  background: shop.accentBg,
                  borderRadius: 10,
                  border: "1px solid " + shop.accent + "33",
                }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: shop.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {r.t} Preview
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: shop.accentText, lineHeight: 1.6 }}>
                    Full report data will appear here once report generation is connected to your live sales, purchase, and expense data.
                  </p>
                  <button
                    onClick={() => handlePdf(r)}
                    style={{
                      marginTop: 12,
                      width: "100%", padding: "9px 0", borderRadius: 9,
                      border: "none", background: shop.accent, color: "white",
                      fontSize: 13, fontWeight: 800, cursor: "pointer",
                      fontFamily: "inherit",
                      boxShadow: "0 4px 14px " + shop.accent + "44",
                    }}>
                    🖨 Print / Save as PDF
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Info banner ── */}
      <div style={{
        background: "#fffbeb", border: "1px solid #fde68a",
        borderRadius: 12, padding: "14px 18px",
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
        <div>
          <p style={{ margin: "0 0 3px", fontWeight: 800, fontSize: 13, color: "#92400e" }}>
            Report Generation
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#a16207", lineHeight: 1.6 }}>
            Click <strong>Preview</strong> to expand a report card, or <strong>Print / PDF</strong> to open a print-ready version. Full data integration with your live sales and expense records can be added on request.
          </p>
        </div>
      </div>
    </div>
  );
}