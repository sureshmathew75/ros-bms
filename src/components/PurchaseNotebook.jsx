import React from "react";

/* ── "Notebook" style items + charges sheet for the ROS India New / Edit Purchase form ──
   Rows:   Item · Qty · Amount ($) · Amount (₹)
   Below:  Items total, GST / VAT, Bank transfer fee, Other charges, then TOTAL CHARGES.
   Purely presentational — every number is worked out in NewPurchaseForm and passed in
   (same look as the New Sale notebook so the two screens feel alike). */

const PAPER = "#fffef8";
const RULE = "#cfdbee";      // blue ruled line
const MARGIN = "rgba(239,68,68,.38)";
const INK = "#0f172a";
const MONO = "DM Mono, monospace";

const money = (n, sym, digits = 2) =>
  sym + Number(n || 0).toLocaleString(sym === "₹" ? "en-IN" : "en-US", { minimumFractionDigits: digits, maximumFractionDigits: 2 });

/* module level on purpose: components created inside the sheet would be re-created on every keystroke and lose focus */
const Leader = () => <span style={{ flex: 1, borderBottom: "1.5px dotted #b8c4d6", margin: "0 8px 4px", minWidth: 12 }} />;
const Line = ({ label, value, bold, color, children }) => (
  <div style={{ display: "flex", alignItems: "flex-end", padding: "5px 0", fontSize: bold ? 14 : 13, fontWeight: bold ? 800 : 600, color: color || "#334155" }}>
    <span style={{ whiteSpace: "nowrap" }}>{label}</span><Leader />
    {children || <span style={{ fontFamily: MONO, fontWeight: 800, color: color || INK }}>{value}</span>}
  </div>
);
const MoneyInput = ({ value, onChange, sym, accent }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, borderBottom: "1.5px solid #94a3b8" }}>
    <span style={{ fontFamily: MONO, fontSize: 12, color: "#64748b" }}>{sym}</span>
    <input type="number" min="0" onWheel={(e) => e.target.blur()} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
      onFocus={(e) => (e.target.parentNode.style.borderBottomColor = accent)} onBlur={(e) => (e.target.parentNode.style.borderBottomColor = "#94a3b8")}
      style={{ width: 92, border: "none", outline: "none", background: "transparent", textAlign: "right", fontFamily: MONO, fontWeight: 800, fontSize: 13, color: INK, padding: "2px 0" }} />
  </span>
);

export default function PurchaseNotebook({
  shop, lines, calc, gst, fee, other, productNames = [],
  onLine, onAdd, onRemove, onGst, onFee, onOther,
}) {
  const accent = shop.accent, sym = shop.symbol;
  const cols = "minmax(0,1fr) 52px 86px 98px 22px";
  const field = (extra) => ({
    width: "100%", boxSizing: "border-box", border: "none", borderBottom: "1.5px solid transparent", background: "transparent",
    padding: "9px 4px", fontSize: 13, color: INK, outline: "none", fontFamily: "DM Sans, sans-serif", borderRadius: 4, ...extra,
  });
  const fo = (e) => { e.target.style.borderBottomColor = accent; e.target.style.background = accent + "10"; };
  const bl = (e) => { e.target.style.borderBottomColor = "transparent"; e.target.style.background = "transparent"; };
  const head = { fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 4px 5px" };

  return (
    <div className="purch-nb" style={{ position: "relative", background: PAPER, border: "1px solid #e6dcc0", borderRadius: 12, padding: "12px 14px 14px 42px", marginBottom: 16, overflow: "hidden",
      boxShadow: "0 1px 0 #fff inset, 0 8px 18px -10px rgba(90,70,20,.35)" }}>
      <style>{".purch-nb input::placeholder{color:#cbd5e1 !important;font-weight:400 !important;font-style:italic;opacity:1}"}</style>
      {/* margin rule + binder holes */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 29, width: 1.5, background: MARGIN }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 33, width: 1.5, background: MARGIN }} />
      {[14, "50%", "calc(100% - 22px)"].map((t, i) => (
        <div key={i} style={{ position: "absolute", left: 8, top: t, width: 11, height: 11, borderRadius: "50%", background: "#e9e2cc", boxShadow: "inset 0 1px 2px rgba(0,0,0,.25)" }} />
      ))}

      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>📒 Items</p>

      <datalist id="purch-nb-items">{productNames.map((n) => <option key={n} value={n} />)}</datalist>

      {/* column heads */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, borderBottom: "2px solid #94a3b8" }}>
        <span style={head}>Item</span>
        <span style={{ ...head, textAlign: "center" }}>Qty</span>
        <span style={{ ...head, textAlign: "right" }}>Amount ($)</span>
        <span style={{ ...head, textAlign: "right" }}>Amount ({sym})</span>
        <span />
      </div>

      {lines.map((line, idx) => (
        <div key={line.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 4, alignItems: "center", borderBottom: "1px solid " + RULE, padding: "1px 0" }}>
          <input list="purch-nb-items" value={line.item} onChange={(e) => onLine(line.id, "item", e.target.value)} placeholder={"Item " + (idx + 1)}
            style={field({ fontWeight: 700 })} onFocus={fo} onBlur={bl} />
          <input type="number" min="0" onWheel={(e) => e.target.blur()} value={line.qty} onChange={(e) => onLine(line.id, "qty", e.target.value)} placeholder="0"
            style={field({ textAlign: "center", fontFamily: MONO })} onFocus={fo} onBlur={bl} />
          <input type="number" min="0" onWheel={(e) => e.target.blur()} value={line.usd} onChange={(e) => onLine(line.id, "usd", e.target.value)} placeholder="0.00"
            style={field({ textAlign: "right", fontFamily: MONO, fontWeight: 700 })} onFocus={fo} onBlur={bl} />
          <input type="number" min="0" onWheel={(e) => e.target.blur()} value={line.inr} onChange={(e) => onLine(line.id, "inr", e.target.value)} placeholder="0.00"
            style={field({ textAlign: "right", fontFamily: MONO, fontWeight: 700 })} onFocus={fo} onBlur={bl} />
          <button type="button" onClick={() => onRemove(line.id)} title="Remove item" disabled={lines.length < 2}
            style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: "#cbd5e1", cursor: lines.length < 2 ? "default" : "pointer", fontSize: 16, lineHeight: 1, padding: 0, opacity: lines.length < 2 ? 0.4 : 1 }}
            onMouseEnter={(e) => { if (lines.length > 1) e.currentTarget.style.color = "#dc2626"; }} onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}>×</button>
        </div>
      ))}
      <button type="button" onClick={onAdd}
        style={{ marginTop: 8, padding: "5px 12px", borderRadius: 7, border: "1px dashed " + accent + "77", background: "transparent", color: accent, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>＋ Add item</button>

      {/* ledger */}
      <div style={{ marginTop: 14, borderTop: "2px solid #94a3b8", paddingTop: 6 }}>
        <Line label={"Items total" + (calc.qty > 0 ? " · " + calc.qty + " qty" : "")}>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10, fontFamily: MONO, fontWeight: 800, color: INK }}>
            {calc.usd > 0 && <span style={{ fontSize: 12, color: "#64748b" }}>{money(calc.usd, "$")}</span>}
            <span>{money(calc.inr, sym)}</span>
          </span>
        </Line>
        <Line label="+ GST / VAT"><MoneyInput sym={sym} accent={accent} value={gst} onChange={onGst} /></Line>
        <Line label="+ Bank transfer fee"><MoneyInput sym={sym} accent={accent} value={fee} onChange={onFee} /></Line>
        <Line label="+ Other charges"><MoneyInput sym={sym} accent={accent} value={other} onChange={onOther} /></Line>
        {/* total charges */}
        <div style={{ marginTop: 6, borderTop: "3px double #64748b", paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: accent + "12", border: "1px solid " + accent + "33", borderRadius: 10, padding: "9px 12px" }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>Total charges</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 20, fontWeight: 900, color: accent }}>{money(calc.total, sym)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
