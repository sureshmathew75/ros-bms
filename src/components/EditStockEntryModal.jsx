import React from "react";
import SaleLinkInput, { saleDateIso } from "./SaleLinkInput";

/* EditStockEntryModal — fix a stock entry that was typed wrongly (a stock-out "sale" or a restock): quantity, date,
   customer (with sale link), note. Saving adjusts the item's stock automatically (done by the caller). */
export default function EditStockEntryModal({ movement, item, sales = [], onClose, onSave }) {
  const isSale = movement.type === "sale";
  const today = new Date().toISOString().slice(0, 10);
  const [qty, setQty] = React.useState(String(movement.qty));
  const [date, setDate] = React.useState(String(movement.date || today).slice(0, 10));
  const [customer, setCustomer] = React.useState(movement.customer || "");
  const [saleId, setSaleId] = React.useState(movement.saleId || "");
  const [note, setNote] = React.useState(movement.note || "");
  const [saving, setSaving] = React.useState(false);
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
  const q = Number(qty);
  const diff = q - Number(movement.qty);
  const stockEffect = isSale ? -diff : diff;   // what happens to the item's stock if saved
  const canSave = q > 0 && date && date <= today && (!isSale || customer.trim()) && (diff !== 0 || date !== String(movement.date).slice(0, 10) || customer.trim() !== (movement.customer || "") || note !== (movement.note || "") || saleId !== (movement.saleId || ""));
  const save = async () => { if (!canSave || saving) return; setSaving(true); await onSave({ qty: q, date, customer: customer.trim(), note: note.trim(), saleId: isSale ? saleId : "" }); setSaving(false); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 330, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 22, maxWidth: 360, width: "94%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>✏️ Edit {isSale ? "sale" : "restock"} · {item ? item.name : ""}</div>
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 14px" }}>The item's stock is adjusted automatically when you save.{movement.byName ? " Originally entered by " + movement.byName + "." : ""}</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Quantity</label><input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={inp} /></div>
          <div style={{ flex: 1.3 }}><label style={lbl}>Date</label><input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
        </div>
        {isSale && (
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Customer name</label>
            <SaleLinkInput sales={sales} value={customer} onChange={setCustomer} linkedId={saleId} style={inp} placeholder="Who bought it — type to find the sale"
              onPick={s => { setSaleId(s ? s.id : ""); const d = s ? saleDateIso(s.date) : ""; if (d && d <= today) setDate(d); }} />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} style={inp} />
        </div>
        {diff !== 0 && q > 0 && (
          <div style={{ marginBottom: 12, padding: "8px 11px", borderRadius: 9, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
            Stock of this item will go <b style={{ color: stockEffect > 0 ? "#166534" : "#991b1b" }}>{stockEffect > 0 ? "up" : "down"} by {Math.abs(stockEffect)}</b>.
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={save} disabled={!canSave || saving} style={{ flex: 1.3, padding: "10px 0", borderRadius: 9, border: "none", background: "#0369a1", color: "white", fontWeight: 700, fontSize: 13, cursor: (!canSave || saving) ? "default" : "pointer", opacity: (!canSave || saving) ? 0.55 : 1, fontFamily: "inherit" }}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
