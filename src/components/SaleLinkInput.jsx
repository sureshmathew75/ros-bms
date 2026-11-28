import React from "react";
import { saleItemNames } from "./ReturnBrief";

/* SaleLinkInput — a customer-name box that suggests matching sales as you type (name, invoice no. or phone).
   Picking one links the stock entry to that sale (its invoice number is saved on the stock entry) and fills in the name.
   Typing again after picking removes the link. */

// Sale dates are stored as yyyy-mm-dd, M/D/YYYY or DD-MM-YYYY — turn any of them into yyyy-mm-dd ("" if unknown).
export const saleDateIso = (raw) => {
  const s = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  let m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return m[3] + "-" + m[2] + "-" + m[1];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0");
  return "";
};
const dayLabel = (raw) => {
  const iso = saleDateIso(raw);
  if (!iso) return String(raw || "");
  try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }); } catch { return iso; }
};

export default function SaleLinkInput({ sales = [], value, onChange, linkedId = "", onPick, placeholder = "Customer name", style = {}, autoFocus = false }) {
  const [open, setOpen] = React.useState(false);
  const [linked, setLinked] = React.useState(null);
  React.useEffect(() => { if (!linkedId) setLinked(null); }, [linkedId]);
  const q = String(value || "").trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (q.length < 2 || linked) return [];
    return (sales || [])
      .filter(s => String(s.customer || "").toLowerCase().includes(q) || String(s.id || "").toLowerCase().includes(q) || String(s.phone || "").includes(q))
      .sort((a, b) => saleDateIso(b.date).localeCompare(saleDateIso(a.date)))
      .slice(0, 6);
  }, [q, sales, linked]);
  const pick = (s) => { setLinked(s); setOpen(false); onChange(s.customer || ""); onPick && onPick(s); };
  return (
    <div style={{ position: "relative" }}>
      <input value={value} autoFocus={autoFocus} placeholder={placeholder} style={style}
        onChange={e => { onChange(e.target.value); if (linked) { setLinked(null); onPick && onPick(null); } setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {linked && (
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 8px" }}>
          <span style={{ minWidth: 0 }}>🔗 Linked to sale <b style={{ fontFamily: "DM Mono,monospace" }}>{linked.id}</b>{linked.date ? " · " + dayLabel(linked.date) : ""}</span>
          <button type="button" onClick={() => { setLinked(null); onPick && onPick(null); }} title="Remove the link" style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#166534", cursor: "pointer", fontWeight: 800, fontSize: 12 }}>✕</button>
        </div>
      )}
      {open && matches.length > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 3, zIndex: 20, background: "white", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 10px 24px rgba(15,23,42,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "4px 10px", fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#f8fafc" }}>Pick the sale to link it</div>
          {matches.map(s => (
            <div key={s.id} onMouseDown={e => { e.preventDefault(); pick(s); }}
              style={{ padding: "7px 10px", cursor: "pointer", borderTop: "1px solid #f1f5f9", fontSize: 12 }}
              onMouseEnter={e => { e.currentTarget.style.background = "#eef6ff"; }} onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
              <div style={{ fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>{s.customer || "—"} <span style={{ fontFamily: "DM Mono,monospace", color: "#64748b", fontWeight: 600, textTransform: "none" }}>· {s.id}</span></div>
              <div style={{ color: "#64748b", fontSize: 11 }}>{dayLabel(s.date)}{s.amount ? " · ₹" + Number(s.amount).toLocaleString("en-IN") : ""}{saleItemNames(s).length ? " · " + saleItemNames(s).slice(0, 2).map(n => n.replace(/\(x1\)/gi, "")).join(", ") : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
