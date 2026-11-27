import React from "react";

/* ExplainShortModal — staff explain a stock shortage found in the physical count: how many, who got them, on which date, why.
   Saving logs a stock-out ("sale") on that date and reduces the closing stock (done by the caller). */

const REASONS = [
  { id: "sold",    label: "Sold to a customer",   who: "Customer name",       needWho: true },
  { id: "gift",    label: "Gift / sample given",  who: "Given to",            needWho: true },
  { id: "damaged", label: "Damaged / lost",       who: "Details (optional)",  needWho: false },
  { id: "other",   label: "Other reason",         who: "Details (optional)",  needWho: false },
];

export default function ExplainShortModal({ item, shortage, who = "", isAdmin = false, onClose, onSave, onCancelShort }) {
  const remaining = Math.max(0, (Number(shortage.shortQty) || 0) - (Number(shortage.explainedQty) || 0));
  const today = new Date().toISOString().slice(0, 10);
  const [qty, setQty] = React.useState(String(remaining));
  const [date, setDate] = React.useState(today);
  const [reason, setReason] = React.useState("sold");
  const [customer, setCustomer] = React.useState("");
  const [staff, setStaff] = React.useState(who);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
  const R = REASONS.find(r => r.id === reason) || REASONS[0];
  const q = Number(qty);
  const canSave = q > 0 && q <= remaining && date && date <= today && staff.trim() && (!R.needWho || customer.trim());
  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await onSave({ qty: q, date, reason: R.label, customer: customer.trim(), by: staff.trim(), note: note.trim() });
    setSaving(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 320, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 22, maxWidth: 380, width: "94%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>⚠ Short in stock count · {item.name}</div>
        <div style={{ padding: "9px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#7f1d1d", lineHeight: 1.5, marginBottom: 14 }}>
          System showed <b>{shortage.systemQty}</b>, physically counted <b>{shortage.countedQty}</b> → <b>{shortage.shortQty} short</b>
          {shortage.explainedQty > 0 ? <> ({shortage.explainedQty} already explained, <b>{remaining} left</b>)</> : null}.
          {shortage.foundBy ? <><br />Counted by {shortage.foundBy}{shortage.foundAt ? " on " + String(shortage.foundAt).slice(0, 10) : ""}.</> : null}
          <br />Please tell us where {remaining === 1 ? "it" : "they"} went. It is saved as a sale on the date you choose.
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>How many</label>
            <input type="number" min="1" max={remaining} value={qty} onChange={e => setQty(e.target.value)} style={inp} />
          </div>
          <div style={{ flex: 1.3 }}>
            <label style={lbl}>Date it went</label>
            <input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>What happened</label>
          <select value={reason} onChange={e => setReason(e.target.value)} style={inp}>
            {REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>{R.who}</label>
          <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder={R.needWho ? "Name" : ""} style={inp} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Your name</label>
          <input value={staff} onChange={e => setStaff(e.target.value)} placeholder="Staff name" style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Sold at the counter, forgot to enter" style={inp} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Later</button>
          <button onClick={save} disabled={!canSave || saving}
            style={{ flex: 1.4, padding: "10px 0", borderRadius: 9, border: "none", background: "#b91c1c", color: "white", fontWeight: 700, fontSize: 13, cursor: (!canSave || saving) ? "default" : "pointer", opacity: (!canSave || saving) ? 0.55 : 1, fontFamily: "inherit" }}>
            {saving ? "Saving…" : "Save as sale"}
          </button>
        </div>
        {isAdmin && onCancelShort && (
          <button onClick={onCancelShort} style={{ marginTop: 10, width: "100%", padding: "7px 0", borderRadius: 9, border: "1px dashed #cbd5e1", background: "transparent", color: "#64748b", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
            Count was wrong — cancel this shortage
          </button>
        )}
      </div>
    </div>
  );
}
