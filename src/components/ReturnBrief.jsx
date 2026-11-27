import React from "react";

/* ─────────────────────────────────────────────────────────────
   ReturnBrief — the "case file" shown on every Returns card.

   Purpose: the moment a return card is opened, staff can see WHAT THE
   CUSTOMER ASKED FOR (exchange / refund / voucher), WHY, which order and
   items it is about, what is still pending, and how far the case has got —
   without expanding anything. Display only: it reads the return + its
   linked sale and never saves or changes anything.
   ───────────────────────────────────────────────────────────── */

const ASK = {
  exchange:        { icon: "🔄",   label: "EXCHANGE",          sub: "wants a replacement item",        bg: "#fdf4ff", bd: "#f0abfc", fg: "#a21caf" },
  refund:          { icon: "💰",   label: "REFUND",            sub: "wants the money back",            bg: "#f5f3ff", bd: "#c4b5fd", fg: "#6d28d9" },
  exchange_refund: { icon: "🔄💰", label: "EXCHANGE + REFUND", sub: "replacement and a balance refund", bg: "#fff7ed", bd: "#fdba74", fg: "#c2410c" },
  voucher:         { icon: "🎁",   label: "GIFT VOUCHER",      sub: "wants store credit",              bg: "#fdf2f8", bd: "#f9a8d4", fg: "#be185d" },
};
const NOT_SET = { icon: "❔", label: "NOT DECIDED YET", sub: "confirm with the customer", bg: "#f8fafc", bd: "#cbd5e1", fg: "#475569" };

const fmtD = (d) => {
  if (!d) return "";
  const p = String(d).split("T")[0].split("-");
  if (p.length !== 3) return "";
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(p[1]) - 1];
  return Number(p[2]) + " " + (m || p[1]);
};
const agoDays = (d) => {
  if (!d) return null;
  const x = new Date(String(d).split("T")[0]); x.setHours(0, 0, 0, 0);
  if (isNaN(x.getTime())) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((t - x) / 86400000);
};
const agoText = (n) => (n == null ? "" : n <= 0 ? "today" : n === 1 ? "yesterday" : n + " days ago");

// Item names of the linked sale — from the sale lines when present, otherwise the plain item text
// (stripping the internal "__LINES__:{json}" prefix some rows carry).
export const saleItemNames = (sale) => {
  if (!sale) return [];
  if (Array.isArray(sale.saleLines) && sale.saleLines.length) {
    return sale.saleLines.map(l => (String(l.name || "").trim() + (Number(l.qty) > 1 ? " × " + l.qty : ""))).filter(Boolean);
  }
  let t = String(sale.item || "");
  if (t.startsWith("__LINES__:")) { const i = t.indexOf("\n"); t = i >= 0 ? t.slice(i + 1) : ""; }
  return t.split(/\n|;/).map(x => x.trim()).filter(Boolean);
};

const STEPS = ["Requested", "Instructions sent", "In transit", "Received", "Resolved"];
const stepIndex = (status) => ({ RETURN_APPROVED: 0, MSG_SENT: 1, RETURN_IN_TRANSIT: 2, RETURN_RECEIVED: 3, REFUNDED: 4, EXCHANGED: 4, EXCHANGE_REFUND: 4 }[status] ?? 0);

const Tile = ({ label, children, tone }) => (
  <div style={{ background: tone === "warn" ? "#fffbeb" : tone === "bad" ? "#fef2f2" : "white", border: "1px solid " + (tone === "warn" ? "#fde68a" : tone === "bad" ? "#fecaca" : "#e5eaf1"), borderRadius: 10, padding: "8px 10px", minWidth: 0 }}>
    <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 12, color: "#0f172a", lineHeight: 1.35, wordBreak: "break-word" }}>{children}</div>
  </div>
);

export default function ReturnBrief({ ret, sale, accent = "#0f172a", symbol = "₹", delivDate, windowCloses, daysLeft, serviceCharge = 0 }) {
  const money = (n) => symbol + Number(n || 0).toLocaleString(symbol === "₹" ? "en-IN" : "en-GB");
  const closed = ["REFUNDED", "EXCHANGED", "EXCHANGE_REFUND"].includes(ret.status);
  const received = ret.status === "RETURN_RECEIVED";
  const decided = ret.resolution && ret.resolution !== "undecided";

  // What the customer originally asked for. Before the item arrives that is the saved resolution; once it
  // arrives the resolution is reset to "undecided", so the original request is kept in requestedResolution.
  // Older received cases have no saved original request — then the decision already recorded on the card is what the customer wants.
  const askedKey = (received || closed) ? (ret.requestedResolution || (decided ? ret.resolution : "")) : (decided ? ret.resolution : "");
  // A closed case shows how it was actually resolved (never "not decided"); older cases may have no saved original request.
  const outcomeKey = ret.status === "EXCHANGED" ? "exchange" : ret.status === "EXCHANGE_REFUND" ? "exchange_refund" : ret.status === "REFUNDED" ? (ret.resolution === "voucher" ? "voucher" : "refund") : "";
  const CLOSED_SUB = { exchange: "replacement item sent", refund: "money refunded", exchange_refund: "replacement sent + balance refunded", voucher: "gift voucher issued" };
  const shownKey = closed ? outcomeKey : askedKey;
  const ask = ASK[shownKey] || NOT_SET;
  const askedDiffers = closed && askedKey && outcomeKey && askedKey !== outcomeKey;
  const nowKey = decided ? ret.resolution : "";
  const changed = (received || closed) && askedKey && nowKey && askedKey !== nowKey;

  const items = saleItemNames(sale);
  const orderValue = sale ? Number(sale.amount) || 0 : 0;
  const dDeliv = agoDays(delivDate);
  const step = stepIndex(ret.status);
  const stepDate = [ret.createdAt, ret.instructionsSentAt, "", ret.receivedDate, ret.refundDate || ret.exchangeDate];
  const resolvedLabel = ret.status === "REFUNDED" ? (ret.resolution === "voucher" ? "Voucher issued" : "Refunded") : ret.status === "EXCHANGED" ? "Exchanged" : ret.status === "EXCHANGE_REFUND" ? "Exchanged + refunded" : "Resolved";
  const windowTone = daysLeft == null ? undefined : daysLeft < 0 ? "bad" : daysLeft <= 2 ? "warn" : undefined;

  // What still needs doing — one plain sentence
  let todo = "";
  if (ret.status === "RETURN_APPROVED") todo = "Send the return instructions to the customer.";
  else if (ret.status === "MSG_SENT") todo = "Waiting for the customer to post the parcel" + (ret.trackingNo ? " — tracking added." : " — no tracking yet.");
  else if (ret.status === "RETURN_IN_TRANSIT") todo = "Parcel is on its way back — mark it received when it arrives.";
  else if (received && !decided) todo = askedKey ? "Item is back. Customer asked for " + ASK[askedKey].label.toLowerCase() + " — confirm below." : "Item is back. Ask the customer what they want, then choose below.";
  else if (received && (ret.resolution === "exchange" || ret.resolution === "exchange_refund")) todo = ret.exchangeTrackingNo ? "Replacement despatched — close the case when done." : "Send the replacement and add its tracking number.";
  else if (received && (ret.resolution === "refund" || ret.resolution === "voucher")) todo = "Refund the customer, then mark the case refunded.";
  else if (closed) todo = "Case closed" + (ret.refundAmount ? " — " + money(ret.refundAmount) + (ret.refundMethod ? " via " + ret.refundMethod : "") + " refunded" : "") + ".";

  return (
    <div style={{ marginTop: 10, marginLeft: 27 }} onClick={e => e.stopPropagation()}>
      {/* 1 — What the customer wants */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>
        <div style={{ flex: "1 1 230px", minWidth: 0, background: ask.bg, border: "1.5px solid " + ask.bd, borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: ask.fg, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>
            {closed ? "Case resolved as" : (received && ret.requestedResolution) ? "Customer originally asked for" : "Customer wants"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{ask.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: ask.fg, lineHeight: 1.1 }}>{ask.label}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{closed ? (CLOSED_SUB[outcomeKey] || ask.sub) : ask.sub}</div>
            </div>
          </div>
          {askedDiffers && (
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "3px 8px", display: "inline-block" }}>
              Customer originally asked for: {ASK[askedKey].icon} {ASK[askedKey].label}
            </div>
          )}
          {!closed && changed && (
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "3px 8px", display: "inline-block" }}>
              Now handled as: {(ASK[nowKey] || NOT_SET).icon} {(ASK[nowKey] || NOT_SET).label}
            </div>
          )}
        </div>
        <div style={{ flex: "2 1 260px", minWidth: 0, background: "white", border: "1px solid #e5eaf1", borderRadius: 12, padding: "10px 12px", borderLeft: "4px solid " + accent }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>Reason given by the customer</div>
          <div style={{ marginTop: 3, fontSize: 13.5, fontWeight: 600, color: "#0f172a", lineHeight: 1.35 }}>{ret.reason ? "“" + ret.reason + "”" : <span style={{ color: "#94a3b8", fontWeight: 500 }}>No reason recorded</span>}</div>
          <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
            Requested {ret.createdAt ? fmtD(ret.createdAt) : "—"}{ret.createdAt && agoDays(ret.createdAt) != null ? " (" + agoText(agoDays(ret.createdAt)) + ")" : ""}
            {ret.phone ? " · 📞 " + ret.phone : ""}
          </div>
        </div>
      </div>

      {/* 2 — The order it is about */}
      {!closed && (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(128px,1fr))", gap: 8 }}>
          <Tile label="Order">
            <b style={{ fontFamily: "DM Mono,monospace" }}>{ret.saleId || "—"}</b>
            {sale ? <div style={{ color: "#64748b", fontSize: 11 }}>{money(orderValue)}{sale.date ? " · " + fmtD(sale.date) : ""}</div> : <div style={{ color: "#b45309", fontSize: 11 }}>Not linked to a sale</div>}
          </Tile>
          <Tile label={items.length > 1 ? "Items bought (" + items.length + ")" : "Item bought"}>
            {items.length ? items.slice(0, 3).map((n, i) => <div key={i}>{n}</div>) : <span style={{ color: "#94a3b8" }}>—</span>}
            {items.length > 3 && <div style={{ color: "#94a3b8", fontSize: 11 }}>+{items.length - 3} more</div>}
          </Tile>
          <Tile label="Delivered">
            {delivDate ? <><b>{fmtD(delivDate)}</b>{dDeliv != null && <div style={{ color: "#64748b", fontSize: 11 }}>{agoText(dDeliv)}</div>}</> : <span style={{ color: "#94a3b8" }}>Date not recorded</span>}
          </Tile>
          {!received && <Tile label="Return window" tone={windowTone}>
            {windowCloses ? <><b>Closes {fmtD(windowCloses)}</b><div style={{ fontSize: 11, color: daysLeft != null && daysLeft < 0 ? "#b91c1c" : daysLeft != null && daysLeft <= 2 ? "#b45309" : "#166534", fontWeight: 700 }}>{daysLeft == null ? "" : daysLeft < 0 ? "Window closed " + Math.abs(daysLeft) + "d ago" : daysLeft === 0 ? "Closes today" : daysLeft + " day" + (daysLeft !== 1 ? "s" : "") + " left"}</div></> : <span style={{ color: "#94a3b8" }}>—</span>}
          </Tile>}
          <Tile label="Return parcel">
            {ret.trackingNo ? <><b style={{ fontFamily: "DM Mono,monospace" }}>{ret.trackingNo}</b>{ret.courier && <div style={{ color: "#64748b", fontSize: 11 }}>{ret.courier}</div>}</> : <span style={{ color: received ? "#64748b" : "#b45309" }}>{received ? "Received — no tracking on file" : "No tracking yet"}</span>}
            {ret.proofUrl && <div><a href={ret.proofUrl} target="_blank" rel="noreferrer" style={{ color: accent, fontSize: 11, fontWeight: 700 }}>📎 Proof / photo</a></div>}
          </Tile>
          {received && orderValue > 0 && (
            <Tile label="If refunded">
              <b>{money(Math.max(0, orderValue - (Number(ret.refundDeduction) || serviceCharge || 0)))}</b>
              <div style={{ color: "#64748b", fontSize: 11 }}>{money(orderValue)} order{(Number(ret.refundDeduction) || serviceCharge) ? " − " + money(Number(ret.refundDeduction) || serviceCharge) + " service charge" : ""}</div>
            </Tile>
          )}
        </div>
      )}

      {/* 3 — Progress */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 0 }}>
        {STEPS.map((s, i) => {
          const done = i < step || (closed && i === 4);
          const cur = i === step && !closed;
          const label = i === 4 ? (closed ? resolvedLabel : "Resolved") : s;
          return (
            <div key={s} style={{ flex: 1, minWidth: 0, textAlign: "center", position: "relative" }}>
              {i > 0 && <div style={{ position: "absolute", top: 8, left: "-50%", width: "100%", height: 2, background: i <= step || (closed && i === 4) ? accent : "#e2e8f0" }} />}
              <div style={{ position: "relative", margin: "0 auto", width: 18, height: 18, borderRadius: "50%", background: done ? accent : "white", border: "2px solid " + (done || cur ? accent : "#cbd5e1"), boxShadow: cur ? "0 0 0 4px " + accent + "26" : "none", color: "white", fontSize: 10, lineHeight: "14px", fontWeight: 800 }}>{done ? "✓" : ""}</div>
              <div style={{ marginTop: 3, fontSize: 10, fontWeight: cur ? 800 : 600, color: done || cur ? "#0f172a" : "#94a3b8", lineHeight: 1.2 }}>{label}</div>
              <div style={{ fontSize: 9.5, color: "#94a3b8" }}>{(done || cur) && stepDate[i] ? fmtD(stepDate[i]) : ""}</div>
            </div>
          );
        })}
      </div>

      {/* 4 — What happens next */}
      {todo && (
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: closed ? "#475569" : "#0f172a", background: closed ? "#f8fafc" : accent + "12", border: "1px dashed " + (closed ? "#cbd5e1" : accent + "66"), borderRadius: 9, padding: "6px 10px" }}>
          {closed ? "✅" : "👉"} {todo}
        </div>
      )}
      {ret.staffNotes && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: "#475569", background: "#fffdf5", border: "1px solid #fde68a", borderRadius: 8, padding: "5px 9px" }}>📝 <b>Staff note:</b> {ret.staffNotes}</div>
      )}
    </div>
  );
}
