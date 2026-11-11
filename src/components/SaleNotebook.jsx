import React from "react";
import { ItemSuggestInput, PriceHint } from "./PriceListPanel";

/* ── "Notebook" style items + totals block for the New Sale form (ROS India / ROS Hairlines UK) ──
   Rows:   Item · Qty · Price (price-list price, editable) · Received
   Below:  Other charges, Discount, GST, then Sale total → Received → BALANCE DUE.
   Purely presentational — all numbers are worked out in NewSaleForm and passed in. */

const PAPER = "#fffef8";
const RULE = "#cfdbee";      // blue ruled line
const MARGIN = "rgba(239,68,68,.38)";
const INK = "#0f172a";
const MONO = "DM Mono, monospace";

const num = (shopId, n) => Number(n || 0).toLocaleString(shopId === "ros-india" ? "en-IN" : "en-GB", { maximumFractionDigits: 2 });

export default function SaleNotebook({
  shopId, shop, lines, rowAmts, recvAmts, showHint, rosieRefs,
  onName, onPick, onQty, onPrice, onRecv, onResetRecv, onRemove, onAdd,
  calc, other, discount, onOther, onDiscount, taxRate, onTax,
}) {
  const accent = shop.accent, sym = shop.symbol;
  const cols = "minmax(0,1fr) 46px 84px 92px 22px";
  const field = (extra) => ({
    width: "100%", boxSizing: "border-box", border: "none", borderBottom: "1.5px solid transparent", background: "transparent",
    padding: "9px 4px", fontSize: 13, color: INK, outline: "none", fontFamily: "DM Sans, sans-serif", borderRadius: 4, ...extra,
  });
  const fo = (e) => { e.target.style.borderBottomColor = accent; e.target.style.background = accent + "10"; };
  const bl = (e) => { e.target.style.borderBottomColor = "transparent"; e.target.style.background = "transparent"; };
  const head = { fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 4px 5px" };

  const balance = calc.balance;
  const bal0 = Math.abs(balance) <= 0.5;
  const balColor = bal0 ? "#15803d" : balance > 0 ? "#b45309" : "#b91c1c";
  const balBg = bal0 ? "#f0fdf4" : balance > 0 ? "#fffbeb" : "#fef2f2";

  const Leader = () => <span style={{ flex: 1, borderBottom: "1.5px dotted #b8c4d6", margin: "0 8px 4px", minWidth: 12 }} />;
  const Line = ({ label, value, bold, color, children }) => (
    <div style={{ display: "flex", alignItems: "flex-end", padding: "5px 0", fontSize: bold ? 14 : 13, fontWeight: bold ? 800 : 600, color: color || "#334155" }}>
      <span style={{ whiteSpace: "nowrap" }}>{label}</span><Leader />
      {children || <span style={{ fontFamily: MONO, fontWeight: 800, color: color || INK }}>{value}</span>}
    </div>
  );
  const MoneyInput = ({ value, onChange, placeholder }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, borderBottom: "1.5px solid #94a3b8" }}>
      <span style={{ fontFamily: MONO, fontSize: 12, color: "#64748b" }}>{sym}</span>
      <input type="number" onWheel={(e) => e.target.blur()} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "0"}
        onFocus={(e) => (e.target.parentNode.style.borderBottomColor = accent)} onBlur={(e) => (e.target.parentNode.style.borderBottomColor = "#94a3b8")}
        style={{ width: 92, border: "none", outline: "none", background: "transparent", textAlign: "right", fontFamily: MONO, fontWeight: 800, fontSize: 13, color: INK, padding: "2px 0" }} />
    </span>
  );

  return (
    <div style={{ position: "relative", background: PAPER, border: "1px solid #e6dcc0", borderRadius: 12, padding: "12px 14px 14px 42px", marginBottom: 8, overflow: "hidden",
      boxShadow: "0 1px 0 #fff inset, 0 8px 18px -10px rgba(90,70,20,.35)" }}>
      {/* margin rule + binder holes */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 29, width: 1.5, background: MARGIN }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 33, width: 1.5, background: MARGIN }} />
      {[14, "50%", "calc(100% - 22px)"].map((t, i) => (
        <div key={i} style={{ position: "absolute", left: 8, top: t, width: 11, height: 11, borderRadius: "50%", background: "#e9e2cc", boxShadow: "inset 0 1px 2px rgba(0,0,0,.25)" }} />
      ))}

      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>📒 Items</p>

      {/* column heads */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 4, borderBottom: "2px solid #94a3b8" }}>
        <span style={head}>Item</span>
        <span style={{ ...head, textAlign: "center" }}>Qty</span>
        <span style={{ ...head, textAlign: "right" }} title="Price from the price list (you can change it)">Price</span>
        <span style={{ ...head, textAlign: "right" }} title="Amount received for this item">Received</span>
        <span />
      </div>

      {lines.map((line, idx) => {
        const touched = line.recv !== undefined;
        const short = recvAmts[idx] + 0.5 < rowAmts[idx];
        return (
          <div key={line.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 4, alignItems: "center", borderBottom: "1px solid " + RULE, padding: "1px 0" }}>
            <ItemSuggestInput inputRef={(el) => { if (idx === 0) rosieRefs.current.item = el; }} value={line.name} shopId={shopId}
              onChange={(v) => onName(line.id, v)} onPick={(en) => onPick(line.id, en)} placeholder={"Item " + (idx + 1)}
              style={field({ fontWeight: 700 })} onFocus={fo} onBlur={bl} />
            <input type="number" onWheel={(e) => e.target.blur()} value={line.qty} onChange={(e) => onQty(line.id, e.target.value)}
              style={field({ textAlign: "center", fontFamily: MONO })} onFocus={fo} onBlur={bl} />
            <input ref={(el) => { if (idx === 0) rosieRefs.current.price = el; }} type="number" onWheel={(e) => e.target.blur()} value={line.price}
              onChange={(e) => onPrice(line.id, e.target.value)} placeholder="0"
              style={field({ textAlign: "right", fontFamily: MONO, fontWeight: 700 })} onFocus={fo} onBlur={bl} />
            <input type="number" onWheel={(e) => e.target.blur()} value={touched ? line.recv : (recvAmts[idx] ? String(+recvAmts[idx].toFixed(2)) : "")}
              onChange={(e) => onRecv(line.id, e.target.value)} placeholder="0"
              title={touched ? "Typed by you" : "Fills in automatically — type to change it (e.g. for an advance)"}
              style={field({ textAlign: "right", fontFamily: MONO, fontWeight: 800, color: short ? "#b45309" : touched ? INK : "#15803d" })} onFocus={fo} onBlur={bl} />
            <button type="button" onClick={() => onRemove(line.id)} title="Remove item"
              style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")} onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}>×</button>
            {showHint && <div style={{ gridColumn: "1 / -1" }}><PriceHint shopId={shopId} name={line.name} price={line.price} /></div>}
          </div>
        );
      })}
      <button type="button" onClick={onAdd}
        style={{ marginTop: 8, padding: "5px 12px", borderRadius: 7, border: "1px dashed " + accent + "77", background: "transparent", color: accent, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>＋ Add item</button>

      {/* ledger */}
      <div style={{ marginTop: 14, borderTop: "2px solid #94a3b8", paddingTop: 6 }}>
        {calc.mode === "deal" ? (
          <>
            <Line label={"Sale total (Advance" + (calc.advLabel ? " " + calc.advLabel : "") + ")"} value={sym + num(shopId, calc.expected)} />
            <Line label="Received earlier" value={sym + num(shopId, calc.priorReceived)} />
            <Line label="Received now" value={sym + num(shopId, calc.receivedNow)} />
          </>
        ) : (
          <>
            <Line label="Items total" value={sym + num(shopId, calc.itemsTotal)} />
            <Line label="+ Other charges"><MoneyInput value={other} onChange={onOther} /></Line>
            <Line label="− Discount"><MoneyInput value={discount} onChange={onDiscount} /></Line>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 0" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginRight: 4 }}>GST</span>
              {[0, 5, 10, 18, 20].map((r) => (
                <button key={r} type="button" onClick={() => onTax(r)}
                  style={{ padding: "3px 9px", borderRadius: 999, border: "1.5px solid " + (taxRate === r ? accent : "#d5dce8"), background: taxRate === r ? accent : "transparent",
                    color: taxRate === r ? "white" : "#64748b", fontWeight: 700, fontSize: 10.5, cursor: "pointer", fontFamily: "inherit" }}>{r}%</button>
              ))}
              {calc.gstAmt > 0 && <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, fontWeight: 800, color: "#475569" }}>+{sym}{num(shopId, calc.gstAmt)}</span>}
            </div>
            <div style={{ borderTop: "1px solid #94a3b8", marginTop: 3 }} />
            <Line label="Sale total" value={sym + num(shopId, calc.saleTotal)} bold />
            <Line label="Received" value={sym + num(shopId, calc.receivedNow)} bold />
          </>
        )}
        {/* balance due */}
        <div style={{ marginTop: 6, borderTop: "3px double #64748b", paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: balBg, border: "1px solid " + balColor + "33", borderRadius: 10, padding: "9px 12px" }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: balColor, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {bal0 ? "Balance due" : balance > 0 ? "Balance due" : "Received is more than the total by"}
            </span>
            {calc.mode !== "deal" && balance > 0.5 && (
              <button type="button" onClick={onResetRecv} title="Set Received to the full sale total"
                style={{ fontSize: 10.5, fontWeight: 800, color: balColor, background: "white", border: "1px solid " + balColor + "55", borderRadius: 999, padding: "2px 9px", cursor: "pointer", fontFamily: "inherit" }}>Mark fully received</button>
            )}
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 20, fontWeight: 900, color: balColor }}>{sym}{num(shopId, Math.abs(balance))}</span>
          </div>
          {bal0 && <div style={{ fontSize: 11, color: "#15803d", fontWeight: 700, marginTop: 4 }}>✓ Fully received</div>}
        </div>
      </div>
    </div>
  );
}
