import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  PRICE_PRODUCTS, PRICE_GROUPS, PRICE_LIST_EFFECTIVE, PRICE_LIST_GST, UK_DELIVERY, REFUND_TIERS,
  priceFor, priceSymbol, searchPriceList, isPriceShop, matchEntry,
} from "../priceList";

/* ─────────────────────────────────────────────────────────────────────────────
   Price List — the tab staff use to answer "how much is …?" calls, plus two small
   pieces used by the sale forms:
     <ItemSuggestInput/>  item box that suggests list items (with price) as you type
     <PriceDiffModal/>    "this price differs from the list — give a reason" dialog
   Read-only: nothing here changes a sale or the database.
   ───────────────────────────────────────────────────────────────────────────── */

const money = (shopId, n) => {
  if (n == null) return "N/A";
  return priceSymbol(shopId) + Number(n).toLocaleString(shopId === "ros-india" ? "en-IN" : "en-GB");
};

/* ── Item box with suggestions ─────────────────────────────────────────────── */
export const ItemSuggestInput = ({ value, onChange, onPick, shopId, placeholder, style, inputRef, onFocus, onBlur }) => {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const byKey = useRef(false); // true while moving with the arrow keys, so the list follows the highlight
  const list = useMemo(() => (isPriceShop(shopId) ? searchPriceList(value, shopId, 80) : []), [value, shopId]);
  const show = open && list.length > 0;
  useEffect(() => { setHi(0); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [value]);
  useEffect(() => {
    if (!byKey.current || !scrollRef.current) return;
    byKey.current = false;
    const el = scrollRef.current.children[hi];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [hi]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const pick = (entry) => { setOpen(false); onPick(entry); };
  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <input
        ref={inputRef} value={value} placeholder={placeholder} style={style} autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={(e) => { setOpen(true); onFocus && onFocus(e); }}
        onBlur={(e) => { onBlur && onBlur(e); }}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") { e.preventDefault(); byKey.current = true; setHi(h => Math.min(h + 1, list.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); byKey.current = true; setHi(h => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); pick(list[hi]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
      />
      {show && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 300, marginTop: 3, minWidth: 270, width: "max-content", maxWidth: "min(380px, 88vw)",
          background: "white", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 12px 30px rgba(15,23,42,0.22)", overflow: "hidden",
        }}>
          <div ref={scrollRef} style={{ maxHeight: 280, overflowY: "auto", overscrollBehavior: "contain" }}>
          {list.map((e, i) => (
            <div key={e.id} onMouseDown={(ev) => { ev.preventDefault(); pick(e); }} onMouseEnter={() => setHi(i)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 11px", cursor: "pointer",
                background: i === hi ? "#eff6ff" : "white", borderBottom: i < list.length - 1 ? "1px solid #f1f5f9" : "none",
              }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{e.label}
                {e.spec && <span style={{ fontWeight: 500, color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>{e.spec}</span>}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#166534", whiteSpace: "nowrap" }}>{money(shopId, priceFor(e, shopId))}</span>
            </div>
          ))}
          </div>
          <div style={{ padding: "5px 11px", fontSize: 10, color: "#94a3b8", background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}>{list.length} item{list.length === 1 ? "" : "s"} · Price list {PRICE_LIST_EFFECTIVE} · scroll or ↑↓ then Enter, or click</div>
        </div>
      )}
    </div>
  );
};

/* ── Small note under an item row when its price differs from the list ───── */
export const PriceHint = ({ shopId, name, price, hide }) => {
  if (hide || !isPriceShop(shopId)) return null;
  const en = matchEntry(name);
  if (!en) return null;
  const exp = priceFor(en, shopId);
  const base = { gridColumn: "1 / -1", fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "3px 8px", marginTop: -2 };
  if (exp == null) return <div style={{ ...base, color: "#64748b", background: "#f1f5f9" }}>Not sold in the UK (N/A on the price list)</div>;
  const pr = parseFloat(price);
  if (!(pr > 0) || Math.abs(pr - exp) <= 0.5) return null;
  if (pr < exp) return <div style={{ ...base, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe" }}>Below the list price by {money(shopId, exp - pr)} — on Save you'll be asked if this is an Advance</div>;
  return <div style={{ ...base, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a" }}>⚠ List price {money(shopId, exp)} · you entered {money(shopId, pr)} (+{money(shopId, pr - exp)})</div>;
};

/* ── Read-only "List" cell beside the Price box: the price-list price for the picked item.
   Click it to copy it into the Price box (for a full payment). ─────────────── */
export const ListPriceCell = ({ shopId, name, onUse }) => {
  const en = isPriceShop(shopId) ? matchEntry(name) : null;
  const p = en ? priceFor(en, shopId) : null;
  const base = { boxSizing: "border-box", width: "100%", padding: "7px 4px", borderRadius: 9, fontSize: 12, fontWeight: 800, textAlign: "center", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  if (p == null) return <div title={en ? "Not sold in the UK" : "Not on the price list"} style={{ ...base, background: "#f8fafc", border: "1px dashed #e2e8f0", color: "#cbd5e1" }}>{en ? "N/A" : "—"}</div>;
  return (
    <button type="button" onClick={() => onUse && onUse(p)} title="Price-list price — click to use it as the price"
      style={{ ...base, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", cursor: "pointer" }}>{Number(p).toLocaleString(shopId === "ros-india" ? "en-IN" : "en-GB")}</button>
  );
};

/* ── "Price differs from the list" — a reason is required ─────────────────── */
const REASONS = ["Festival / special offer", "Repeat customer discount", "Damaged / defective item", "Price changed after quote", "Other"];

export const priceNoteText = (shopId, mismatches, reason) =>
  "Price note — " + mismatches.map(m => `${m.label}: list ${money(shopId, m.expected)}, sold ${money(shopId, m.entered)}`).join("; ") + " (" + reason + ")";

export const PriceDiffModal = ({ shopId, mismatches, onCancel, onConfirm, onAdvance, listTotal, receivedNow, delivery, accent = "#0f172a" }) => {
  const canAdvance = !!onAdvance && mismatches.some(m => m.diff < 0);
  const [step, setStep] = useState(canAdvance ? "advance" : "reason");
  const [sel, setSel] = useState("");
  const [other, setOther] = useState("");
  const reason = sel === "Other" ? other.trim() : sel;
  const ok = !!reason;
  if (step === "advance") {
    const bal = (listTotal || 0) - (receivedNow || 0);
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "white", borderRadius: 16, padding: 22, maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1d4ed8", marginBottom: 4 }}>Is this an Advance payment?</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>The amount entered is lower than the price list ({PRICE_LIST_EFFECTIVE}).</div>
          <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, marginBottom: 12 }}>
            {mismatches.map((m, i) => (
              <div key={i} style={{ padding: "9px 12px", borderTop: i ? "1px solid #bfdbfe" : "none", fontSize: 12.5 }}>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{m.label}{m.qty > 1 ? " × " + m.qty : ""}</div>
                <div style={{ color: "#475569", marginTop: 2 }}>List <b>{money(shopId, m.expected)}</b> · Entered <b>{money(shopId, m.entered)}</b></div>
              </div>
            ))}
          </div>
          {listTotal > 0 && (
            <div style={{ fontSize: 12.5, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", marginBottom: 14, lineHeight: 1.7 }}>
              Price list total: <b>{money(shopId, listTotal)}</b>{delivery ? " (includes " + money(shopId, delivery) + " delivery)" : ""}<br />
              Received now: <b>{money(shopId, receivedNow || 0)}</b><br />
              Balance to come: <b style={{ color: "#b45309" }}>{money(shopId, Math.max(bal, 0))}</b>
            </div>
          )}
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>If <b>Yes</b>, this entry is saved as an <b>Advance</b> with the price-list total as its Expected Total, so the Final payment can be checked against it.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" onClick={onAdvance}
              style={{ padding: "11px 0", borderRadius: 10, border: "none", background: accent, color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Yes — it's an Advance</button>
            <button type="button" onClick={() => setStep("reason")}
              style={{ padding: "11px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>No — customer paid in full at a different price</button>
            <button type="button" onClick={onCancel}
              style={{ padding: "9px 0", borderRadius: 10, border: "none", background: "transparent", color: "#64748b", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>← Go back &amp; fix</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 22, maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#b45309", marginBottom: 4 }}>⚠️ Price differs from the price list</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Price list effective {PRICE_LIST_EFFECTIVE}. Please give a reason — it is saved in the sale's remarks.</div>
        <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 10, marginBottom: 14 }}>
          {mismatches.map((m, i) => (
            <div key={i} style={{ padding: "9px 12px", borderTop: i ? "1px solid #fde68a" : "none", fontSize: 12.5 }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>{m.label}{m.qty > 1 ? " × " + m.qty : ""}</div>
              <div style={{ color: "#475569", marginTop: 2 }}>
                List <b>{money(shopId, m.expected)}</b> · Entered <b>{money(shopId, m.entered)}</b>{" "}
                <span style={{ fontWeight: 800, color: m.diff < 0 ? "#b91c1c" : "#166534" }}>({m.diff < 0 ? "−" : "+"}{money(shopId, Math.abs(m.diff))} each)</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Reason</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {REASONS.map(r => (
            <button key={r} type="button" onClick={() => setSel(r)}
              style={{ padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                border: "1.5px solid " + (sel === r ? accent : "#e2e8f0"), background: sel === r ? accent : "white", color: sel === r ? "white" : "#475569" }}>{r}</button>
          ))}
        </div>
        {sel === "Other" && (
          <input autoFocus value={other} onChange={e => setOther(e.target.value)} placeholder="Type the reason…"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 10 }} />
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Go back &amp; fix</button>
          <button type="button" disabled={!ok} onClick={() => onConfirm(reason)}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: ok ? accent : "#cbd5e1", color: "white", fontWeight: 800, fontSize: 13, cursor: ok ? "pointer" : "default", fontFamily: "inherit" }}>Save with this reason</button>
        </div>
      </div>
    </div>
  );
};

/* ── Final payment leaves the deal short of the price-list / Expected total ───
   canWaive (admins only) shows "Add discount to match" which closes the gap as an admin discount. ── */
export const FinalShortModal = ({ shopId, info, canWaive, onCancel, onSaveAnyway, onWaive, accent = "#0f172a" }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "white", borderRadius: 16, padding: 22, maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#b91c1c", marginBottom: 4 }}>⚠️ Total received is short of the price list</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>This Final payment is linked to an Advance{info.parts > 0 ? " and " + info.parts + " other payment" + (info.parts > 1 ? "s" : "") : ""} for the same customer.</div>
      <div style={{ fontSize: 13, color: "#334155", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px", marginBottom: 14, lineHeight: 1.8 }}>
        {info.source === "list" ? "Price list total" : "Expected total"}: <b>{money(shopId, info.expected)}</b><br />
        Received so far (incl. this payment): <b>{money(shopId, info.received)}</b><br />
        Short by: <b style={{ color: "#b91c1c" }}>{money(shopId, info.short)}</b>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ padding: "11px 0", borderRadius: 10, border: "none", background: accent, color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Go back &amp; correct the amount</button>
        {canWaive && (
          <button type="button" onClick={onWaive}
            style={{ padding: "11px 0", borderRadius: 10, border: "1px solid #86efac", background: "#f0fdf4", color: "#166534", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Admin: add {money(shopId, info.short)} discount to match the price list</button>
        )}
        <button type="button" onClick={onSaveAnyway}
          style={{ padding: "10px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Save anyway — balance stays open</button>
      </div>
    </div>
  </div>
);

/* ── The Price List tab ───────────────────────────────────────────────────── */
export default function PriceListPanel({ shop, shopId }) {
  const isIndia = shopId === "ros-india";
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("ALL");
  const [view, setView] = useState("gross");     // India only: "gross" | "net"
  const [copied, setCopied] = useState("");
  const accent = shop?.accent || "#0f172a";

  const matchIds = useMemo(() => (q.trim() ? new Set(searchPriceList(q, null, 200).map(e => e.id)) : null), [q]);
  const cards = useMemo(() => PRICE_PRODUCTS
    .filter(p => group === "ALL" || p.group === group)
    .map(p => ({ ...p, rows: matchIds ? p.entries.filter(e => matchIds.has(e.id)) : p.entries }))
    .filter(p => p.rows.length > 0), [group, matchIds]);

  const messageFor = (e) => {
    const price = priceFor(e, shopId);
    if (isIndia) return `${e.label} — ${money(shopId, e.gross)} (incl. ${PRICE_LIST_GST}% GST). Free delivery across India.`;
    return `${e.label} — ${money(shopId, price)}. Delivery ${money(shopId, UK_DELIVERY)} per order.`;
  };
  const copy = async (e) => {
    const text = messageFor(e);
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch {} document.body.removeChild(t); }
    setCopied(e.id); setTimeout(() => setCopied(c => (c === e.id ? "" : c)), 1500);
  };

  const printList = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const sym = priceSymbol(shopId);
    const body = PRICE_PRODUCTS.map(p => `<h3>${p.name} <small>${p.spec || ""}</small></h3><table><thead><tr><th>Length</th>${isIndia ? "<th>Net</th><th>GST 18%</th><th>Gross</th>" : "<th>Price</th>"}</tr></thead><tbody>${
      p.entries.map(e => `<tr><td>${e.length ? e.length + "″" : "—"}</td>${isIndia ? `<td>${money(shopId, e.net)}</td><td>${money(shopId, e.gst)}</td><td><b>${money(shopId, e.gross)}</b></td>` : `<td><b>${money(shopId, e.uk)}</b></td>`}</tr>`).join("")}</tbody></table>`).join("");
    w.document.write(`<html><head><title>ROS ${isIndia ? "India" : "Hairlines UK"} price list</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#0f172a}h2{margin:0}h3{margin:16px 0 4px;font-size:13px}h3 small{font-weight:400;color:#64748b}table{border-collapse:collapse;width:100%;max-width:520px;font-size:11px}th,td{border:1px solid #cbd5e1;padding:3px 7px;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#f1f5f9}.cols{column-count:2;column-gap:28px}h3,table{break-inside:avoid}@media print{.cols{column-count:2}}</style></head><body><h2>ROS ${isIndia ? "INDIA" : "HAIRLINES UK"} — Hair Products Price List</h2><div style="font-size:11px;color:#64748b;margin-bottom:8px">Effective from ${PRICE_LIST_EFFECTIVE} · ${isIndia ? "India prices: Net + GST 18% = Gross" : "Prices in " + sym} · Prices subject to change without prior notice</div><div class="cols">${body}</div></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  };

  const card = { background: "white", border: "1px solid #d3deeb", borderRadius: 14, boxShadow: "0 1px 0 #fff inset, 0 2px 4px rgba(15,23,42,.06), 0 10px 22px -8px rgba(15,23,42,.16)", overflow: "hidden" };
  const chip = (on) => ({ padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: on ? 800 : 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    border: "1px solid " + (on ? "rgba(0,0,0,.15)" : "#d3deeb"), color: on ? "white" : "#64748b", backgroundColor: on ? accent : "white",
    boxShadow: on ? "0 1px 0 rgba(255,255,255,.3) inset, 0 4px 8px -2px rgba(15,23,42,.3)" : "0 1px 2px rgba(15,23,42,.08)" });

  return (
    <div style={{ padding: "0 0 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>🏷️ Price List</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            Effective from <b>{PRICE_LIST_EFFECTIVE}</b> · {isIndia ? `India prices: Net + GST ${PRICE_LIST_GST}% = Gross (the Gross price is what the customer pays)` : "UK prices in £ · N/A = not available in the UK"} · prices are subject to change without prior notice
          </p>
        </div>
        <button onClick={printList} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #d3deeb", background: "white", color: "#334155", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 4px rgba(15,23,42,.08)" }}>🖨️ Print / PDF</button>
      </div>

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search — e.g.  topper 5x5 20   ·   wig 18   ·   side bangs   ·   ponytail 12" autoFocus
        style={{ width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 12, border: "1.5px solid #cbd5e1", fontSize: 15, fontFamily: "inherit", outline: "none", marginBottom: 10, boxShadow: "0 2px 6px rgba(15,23,42,.06) inset" }} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => setGroup("ALL")} style={chip(group === "ALL")}>All</button>
        {PRICE_GROUPS.map(g => <button key={g} onClick={() => setGroup(g)} style={chip(group === g)}>{g}</button>)}
        {isIndia && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
            <button onClick={() => setView("gross")} style={chip(view === "gross")}>Gross (incl. GST)</button>
            <button onClick={() => setView("net")} style={chip(view === "net")}>Net + GST</button>
          </span>
        )}
      </div>

      {cards.length === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8", fontSize: 13 }}>No item matches "{q}". Try fewer words, e.g. "wig 18" or "topper".</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 14 }}>
        {cards.map(p => (
          <div key={p.name} style={card}>
            <div style={{ padding: "11px 14px", borderBottom: "1px solid #d3deeb", backgroundColor: "#eaf0f7", backgroundImage: "linear-gradient(180deg,#ffffff,#e3eaf3)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.03em" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{p.spec}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {p.rows.map((e, i) => {
                  const price = priceFor(e, shopId);
                  const na = price == null;
                  return (
                    <tr key={e.id} style={{ background: i % 2 ? "#f8fafc" : "white" }}>
                      <td style={{ padding: "8px 14px", fontWeight: 700, color: "#334155", width: 70 }}>{e.length ? e.length + "″" : "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>
                        {na ? <span style={{ color: "#cbd5e1", fontWeight: 700 }}>N/A</span>
                          : isIndia && view === "net"
                            ? <span><b style={{ color: "#0f172a" }}>{money(shopId, e.net)}</b> <span style={{ fontSize: 11, color: "#94a3b8" }}>+ {money(shopId, e.gst)} GST</span></span>
                            : <b style={{ color: "#166534", fontSize: 14 }}>{money(shopId, price)}</b>}
                      </td>
                      <td style={{ padding: "6px 10px 6px 4px", textAlign: "right", width: 64 }}>
                        {!na && (
                          <button onClick={() => copy(e)} title="Copy a ready reply to paste into WhatsApp"
                            style={{ padding: "4px 8px", borderRadius: 7, border: "1px solid #d3deeb", background: copied === e.id ? "#ecfdf3" : "white", color: copied === e.id ? "#166534" : "#64748b", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                            {copied === e.id ? "Copied ✓" : "Copy"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Delivery & refund policy */}
      <div style={{ ...card, marginTop: 18, maxWidth: 560 }}>
        <div style={{ padding: "11px 14px", borderBottom: "1px solid #d3deeb", backgroundColor: "#eaf0f7", backgroundImage: "linear-gradient(180deg,#ffffff,#e3eaf3)", fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.03em" }}>Delivery &amp; refund policy</div>
        <div style={{ padding: "10px 14px", fontSize: 12.5, color: "#334155", lineHeight: 1.7 }}>
          <div><b>Delivery:</b> {isIndia ? "FREE delivery on India orders" : `${money(shopId, UK_DELIVERY)} per order`}</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>A service charge is deducted from refunds, based on the item value:</div>
          {(REFUND_TIERS[shopId] || []).map(([below, fee], i, arr) => {
            const lo = i === 0 ? 0 : arr[i - 1][0];
            const label = i === 0 ? `Item value under ${money(shopId, below)}` : below === Infinity ? `${money(shopId, lo)} and above` : `${money(shopId, lo)} – under ${money(shopId, below)}`;
            return <div key={i} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", padding: "3px 0" }}><span>{label}</span><b style={{ color: "#b91c1c" }}>− {money(shopId, fee)}</b></div>;
          })}
        </div>
      </div>
    </div>
  );
}
