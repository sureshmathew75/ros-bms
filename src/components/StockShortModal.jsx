import React from "react";
import SaleLinkInput, { saleDateIso } from "./SaleLinkInput";

/* ExplainShortModal — staff explain a difference found in the physical count.
   SHORT (less than the system): how many, who got them, on which date, why → saved as a sale on that date (closing stock drops).
   EXTRA (more than the system): how many, where from, on which date, why → saved as stock added on that date (closing stock rises). */

const REASONS = [
  { id: "sold",    label: "Sold to a customer",   who: "Customer name",       needWho: true },
  { id: "gift",    label: "Gift / sample given",  who: "Given to",            needWho: true },
  { id: "damaged", label: "Damaged / lost",       who: "Details (optional)",  needWho: false },
  { id: "other",   label: "Other reason",         who: "Details (optional)",  needWho: false },
];

const EXTRA_REASONS = [
  { id: "received", label: "Stock received but not entered", who: "Received from (supplier / details)", needWho: true },
  { id: "returned", label: "Returned by a customer",         who: "Customer name",                      needWho: true },
  { id: "miscount", label: "Earlier count was wrong",        who: "Details (optional)",                 needWho: false },
  { id: "other",    label: "Other reason",                   who: "Details (optional)",                 needWho: false },
];

export default function ExplainShortModal({ item, shortage, who = "", isAdmin = false, onClose, onSave, onCancelShort, cancelLabel = "", sales = [] }) {
  const extra = shortage.kind === "extra";
  const LIST = extra ? EXTRA_REASONS : REASONS;
  const remaining = Math.max(0, (Number(shortage.shortQty) || 0) - (Number(shortage.explainedQty) || 0));
  const today = new Date().toISOString().slice(0, 10);
  const [qty, setQty] = React.useState(String(remaining));
  const [date, setDate] = React.useState(today);
  const [reason, setReason] = React.useState(extra ? "received" : "sold");
  const [customer, setCustomer] = React.useState("");
  const [saleId, setSaleId] = React.useState("");   // the sale this stock-out belongs to (when "Sold to a customer" and one is picked)
  const [staff, setStaff] = React.useState(who);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
  const R = LIST.find(r => r.id === reason) || LIST[0];
  const q = Number(qty);
  const canSave = q > 0 && q <= remaining && date && date <= today && staff.trim() && (!R.needWho || customer.trim());
  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await onSave({ qty: q, date, reason: R.label, customer: customer.trim(), by: staff.trim(), note: note.trim(), saleId: (!extra && reason === "sold") ? saleId : "" });
    setSaving(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 320, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 22, maxWidth: 380, width: "94%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{extra ? "➕ Extra found in stock count" : "⚠ Short in stock count"} · {item.name}</div>
        <div style={{ padding: "9px 12px", borderRadius: 10, background: extra ? "#eff6ff" : "#fef2f2", border: "1px solid " + (extra ? "#bfdbfe" : "#fecaca"), fontSize: 12, color: extra ? "#1e3a8a" : "#7f1d1d", lineHeight: 1.5, marginBottom: 14 }}>
          System showed <b>{shortage.systemQty}</b>, physically counted <b>{shortage.countedQty}</b> → <b>{shortage.shortQty} {extra ? "extra" : "short"}</b>
          {shortage.explainedQty > 0 ? <> ({shortage.explainedQty} already explained, <b>{remaining} left</b>)</> : null}.
          {shortage.foundBy ? <><br />Counted by {shortage.foundBy}{shortage.foundAt ? " on " + String(shortage.foundAt).slice(0, 10) : ""}.</> : null}
          <br />{extra
            ? <>Please tell us how {remaining === 1 ? "this extra piece" : "these extra pieces"} came — where from and when. It is saved as stock added on the date you choose.</>
            : <>Please tell us where {remaining === 1 ? "it" : "they"} went. It is saved as a sale on the date you choose.</>}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>How many</label>
            <input type="number" min="1" max={remaining} value={qty} onChange={e => setQty(e.target.value)} style={inp} />
          </div>
          <div style={{ flex: 1.3 }}>
            <label style={lbl}>{extra ? "Date it came" : "Date it went"}</label>
            <input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>What happened</label>
          <select value={reason} onChange={e => { setReason(e.target.value); setSaleId(""); }} style={inp}>
            {LIST.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>{R.who}</label>
          {(!extra && reason === "sold")
            ? <SaleLinkInput sales={sales} value={customer} onChange={setCustomer} linkedId={saleId} style={inp} placeholder="Name"
                onPick={s => { setSaleId(s ? s.id : ""); const d = s ? saleDateIso(s.date) : ""; if (d && d <= today) setDate(d); }} />
            : <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder={R.needWho ? "Name" : ""} style={inp} />}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Your name</label>
          <input value={staff} onChange={e => setStaff(e.target.value)} placeholder="Staff name" style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={extra ? "e.g. Came with the last supplier parcel" : "e.g. Sold at the counter, forgot to enter"} style={inp} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Later</button>
          <button onClick={save} disabled={!canSave || saving}
            style={{ flex: 1.4, padding: "10px 0", borderRadius: 9, border: "none", background: "#b91c1c", color: "white", fontWeight: 700, fontSize: 13, cursor: (!canSave || saving) ? "default" : "pointer", opacity: (!canSave || saving) ? 0.55 : 1, fontFamily: "inherit" }}>
            {saving ? "Saving…" : extra ? "Save as stock added" : "Save as sale"}
          </button>
        </div>
        {isAdmin && onCancelShort && (
          <button onClick={onCancelShort} style={{ marginTop: 10, width: "100%", padding: "7px 0", borderRadius: 9, border: "1px dashed #cbd5e1", background: "transparent", color: "#64748b", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
            {cancelLabel || ("Count was wrong — cancel this " + (extra ? "difference" : "shortage"))}
          </button>
        )}
      </div>
    </div>
  );
}
