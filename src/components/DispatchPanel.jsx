import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { dbSaveDispatchEntry, dbLoadDispatchLog, dbDeleteDispatchEntry } from "../db";
import { showAlert, showConfirm } from "./PopupHost";
import AddressEntryModal from "./AddressEntryModal";

/* ─────────────────────────────────────────────────────────────────────────
   DISPATCH PANEL  (all three shops — daily despatch log)

   Independent of the Sales table: entries live in their own `dispatch_log`
   Supabase table (see db.js) so one sale can be despatched in more than one
   parcel, and this page's data never overwrites anything the Sales tab
   manages. Adding an entry snapshots the customer/address/phone from the
   sale at that moment (still editable afterwards, e.g. to fix a typo on
   the label) and keeps a soft link back via saleId.

   NOTE ON DUPLICATION: WaModal and the tracking-message/URL builders below
   intentionally mirror the versions in SalesPanel.jsx. This codebase does
   not share components across panel files (see the note on WaModal in
   SalesPanel.jsx), so the same small pieces are duplicated here rather
   than introducing a new shared-imports architecture.
   ───────────────────────────────────────────────────────────────────────── */

/* ── localISO: Date → "YYYY-MM-DD" using LOCAL date parts (no UTC shift) ── */
function localISO(dt) {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}
const todayISO = () => localISO(new Date());
const yesterdayISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return localISO(d); };

/* ── Shipper config — India and UK shops use different carrier lists,
   mirroring the same IN_CARRIERS/UK_CARRIERS split already used for the
   per-sale tracking field in SalesPanel.jsx. ────────────────────────── */
const IN_SHIPPERS = ["DTDC", "SPEEDPOST", "FEDEX", "DHL", "UPS", "Others"];
const UK_SHIPPERS = ["Royal Mail", "Evri", "DPD", "Parcelforce", "FedEx", "UPS", "Other"];

// Keyed uppercase and looked up uppercase so "FedEx" (UK) and "FEDEX"
// (India) share one color regardless of casing.
const SHIPPER_COLORS = {
  DTDC:         { bg: "#fef3c7", color: "#92400e" },
  SPEEDPOST:    { bg: "#dbeafe", color: "#1e40af" },
  FEDEX:        { bg: "#fee2e2", color: "#991b1b" },
  DHL:          { bg: "#fef9c3", color: "#854d0e" },
  UPS:          { bg: "#e0e7ff", color: "#3730a3" },
  "ROYAL MAIL": { bg: "#e0f2fe", color: "#075985" },
  EVRI:         { bg: "#fce7f3", color: "#9d174d" },
  DPD:          { bg: "#ecfccb", color: "#3f6212" },
  PARCELFORCE:  { bg: "#ede9fe", color: "#5b21b6" },
  OTHERS:       { bg: "#f1f5f9", color: "#475569" },
  OTHER:        { bg: "#f1f5f9", color: "#475569" },
};
const shipperColorFor = (shipper) => SHIPPER_COLORS[(shipper || "").toUpperCase()] || SHIPPER_COLORS.OTHERS;

const trackingURL = (shipper, trackNo) => {
  const cleanNo = (trackNo || "").replace(/\s+/g, "");
  if (!cleanNo) return null;
  switch ((shipper || "").toLowerCase()) {
    case "dtdc":         return `https://www.dtdc.com/track-your-shipment/`;
    case "speedpost":    return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    case "fedex":        return `https://www.fedex.com/wtrk/track/?trknbr=${cleanNo}`;
    case "dhl":          return `https://www.dhl.com/in-en/home/tracking.html?tracking-id=${cleanNo}&tracking-type=shipment`;
    case "ups":          return `https://www.ups.com/track?tracknum=${cleanNo}`;
    case "royal mail":   return `https://www.royalmail.com/track-your-item#/tracking-results/${cleanNo}`;
    case "evri":         return `https://www.evri.com/track/${cleanNo}`;
    case "dpd":          return `https://track.dpd.co.uk/parcels/${cleanNo}`;
    case "parcelforce":  return `https://www.parcelforce.com/track-trace?trackNumber=${cleanNo}`;
    default:             return null; // "Others"/"Other" — no deep tracking link available
  }
};

// Staff-only tracking destination for the in-app "🔎 Track" button — kept
// separate from trackingURL() above (which also builds the link sent to
// CUSTOMERS in the WhatsApp tracking message, and stays pointed at each
// carrier's own official site so customers land somewhere recognisably
// "theirs"). For DTDC specifically, dtdc.com sits behind a manual
// verification checkbox/captcha that can't be filled in from a link, so
// for staff use only this instead deep-links to trackcourier.io — a free,
// no-signup public tracking lookup site that takes the consignment number
// straight in the URL and shows the result with no captcha. It's an
// unofficial third-party aggregator, not DTDC itself, so if it ever shows
// nothing for a very fresh shipment, DTDC's own site (still one tap away —
// see the manual-entry fallback below) is the authoritative source.
const staffTrackingURL = (shipper, trackNo) => {
  const cleanNo = (trackNo || "").replace(/\s+/g, "");
  if ((shipper || "").toLowerCase() === "dtdc" && cleanNo) {
    return `https://trackcourier.io/track-and-trace/dtdc/${encodeURIComponent(cleanNo)}`;
  }
  return trackingURL(shipper, trackNo);
};

// Carriers whose tracking page has no URL parameter to carry the tracking
// number in — trackingURL()/staffTrackingURL() above can only point at the
// generic page for these, so the number has to be typed in by hand. Every
// other carrier's link already lands directly on that shipment's result.
const MANUAL_ENTRY_SHIPPERS = new Set(["SPEEDPOST"]);

// Normalizes a customer name for GROUPING purposes only (never for display —
// the sale's own `customer` field is always shown as typed). Case and
// leading/trailing space differences were already handled by the old
// `.toLowerCase().trim()`; this also collapses repeated internal whitespace
// and drops stray periods/commas (e.g. an initial typed as "K." vs "K"),
// since either of those was enough to split one customer's linked orders
// into two different despatch groups — silently leaving one of them
// un-updated when tracking was entered against the other. Kept identical
// in SalesPanel.jsx, which builds the same grouping key independently; if
// this ever changes, it has to change in both places or the two tabs will
// disagree about which sales are linked.
const normCustomerName = (name) => (name || "")
  .toLowerCase()
  .replace(/[.,]/g, "")
  .replace(/\s+/g, " ")
  .trim();

// "One click track" for a despatch row: opens the carrier's tracking page,
// and for the carrier above also copies the tracking number to the
// clipboard first so staff just paste it in rather than retyping it — the
// closest this can get to one-click when the site requires manual entry.
// window.open() is called synchronously, before the clipboard write, so
// it isn't blocked as a popup.
const trackClick = (entry, url) => {
  window.open(url, "_blank", "noopener,noreferrer");
  const shipperUpper = (entry.shipper || "").toUpperCase();
  if (MANUAL_ENTRY_SHIPPERS.has(shipperUpper) && entry.trackingNo) {
    navigator.clipboard?.writeText(entry.trackingNo).catch(() => {});
    showAlert(`📋 Tracking number ${entry.trackingNo} copied.\n\nPaste it into ${entry.shipper}'s tracking field and search.`);
  }
};

/* Mirrors buildTrackingMsg() in SalesPanel.jsx — same customer-facing
   wording, adapted to read from a dispatch-log entry instead of a sale. */
const buildDispatchTrackingMsg = (entry, shop) => {
  const url = trackingURL(entry.shipper, entry.trackingNo);
  const shipperName = (entry.shipper || "our courier").toUpperCase();
  const isDtdc = (entry.shipper || "").toUpperCase() === "DTDC";
  const trackLine = url
    ? isDtdc
      ? `*TRACKING* -- ${url}\n\nPlease enter your tracking number (${entry.trackingNo}) and the security code shown on the page to see your delivery status.`
      : `*TRACKING* -- ${url}`
    : `Your tracking number is: ${entry.trackingNo}`;
  const signOff = shop?.short ? `ROS ${shop.short}` : "ROS";
  return `Dear *${(entry.customer || "Customer").toUpperCase()}*,

Your order is now **ready to despatch!** 📦💜

━━━━━━━━━━━━━━━━━━

*📦 DELIVERY & TRACKING*

**Carrier:** ${shipperName}
**Tracking Number:** ${entry.trackingNo}

${trackLine}

Your parcel is expected to arrive within **1–3 working days**.

We kindly recommend keeping an eye on the tracking updates until your parcel has been successfully delivered.

━━━━━━━━━━━━━━━━━━

*🔎 IMPORTANT — PLEASE CHECK YOUR DELIVERY ADDRESS*

**Before every dispatch, we provide the recipient with the tracking details and a photo of the address label attached to the parcel.**

Please **carefully check the address shown on the label** and contact us as soon as possible if you notice any incorrect or missing information.

⚠️ **Once the address details have been checked and confirmed, any subsequent delivery issue resulting from incorrect or incomplete information in the confirmed address will be the responsibility of the recipient.**

This is why we strongly recommend checking the address label carefully **before or immediately after dispatch notification**, so that any genuine error can be brought to our attention at the earliest opportunity.

━━━━━━━━━━━━━━━━━━

*🚚 YOUR DELIVERY*

Once your parcel has been dispatched, it is our responsibility to ensure that it is handed over to the carrier correctly and sent securely to your delivery address.

However, we kindly ask you to **monitor the tracking regularly** and let us know immediately if you notice anything unusual, such as:

• An unexpected delivery delay
• An incorrect or unusual tracking update
• A delivery attempt you were not expecting
• Any other issue with the movement of your parcel

Early notification allows us to contact the carrier promptly and take the necessary steps to assist you.

━━━━━━━━━━━━━━━━━━

*⚠️ IMPORTANT — MARKED AS DELIVERED*

If the tracking shows that your parcel has been **delivered but you have not physically received it**, please contact us **on the same day**.

This is extremely important because reporting the issue promptly gives us the best opportunity to contact the carrier, investigate the delivery and, where necessary, recover the parcel.

If you notify us **on the same day that the parcel is marked as delivered**, we will take full responsibility for raising the matter with the carrier and will do everything reasonably possible to resolve it.

If the issue is reported later, it may become more difficult for us to investigate or recover the parcel. Any loss arising from a delayed notification may therefore become the responsibility of the recipient, particularly where the carrier's investigation or recovery options have become limited.

━━━━━━━━━━━━━━━━━━

*🔍 PLEASE CHECK YOUR ORDER PROMPTLY*

When your parcel arrives, please check the contents as soon as possible.

If you receive:

• A damaged item
• An incorrect item
• A missing item
• Or there is any other genuine concern with your order

please contact us via **WhatsApp within 2 days of delivery**.

We will always do our best to review genuine concerns promptly and find a fair solution.

Please note that concerns reported after this notification period may be more difficult to investigate and, where applicable, return or handling charges may apply in accordance with our return policy.

━━━━━━━━━━━━━━━━━━

*📦 IF YOUR PARCEL IS RETURNED TO US*

If a parcel is returned to us because of **repeated unsuccessful delivery attempts**, failure to receive the parcel, an incorrect/incomplete address, **non-payment of import charges or any levy on the parcel**, or other circumstances within the recipient's control, the responsibility for the resulting return rests with the recipient.

Once the parcel is safely returned to us, we will be happy to arrange a **refund or exchange**, subject to our applicable return policy.

Please note that any **additional shipping costs and other reasonable expenses incurred as a result of the parcel being returned and subsequently re-shipped** will be the responsibility of the recipient.

We strongly recommend following the tracking updates and making the necessary arrangements to receive the parcel promptly to avoid these additional costs.

━━━━━━━━━━━━━━━━━━

*🌍 INTERNATIONAL ORDERS*

For international shipments, customs regulations, import duties, taxes and clearance procedures vary from country to country.

Depending on the destination country's applicable customs regulations and tariff policies, your parcel may be subject to:

• Import duties
• Customs charges
• VAT or other taxes
• Clearance or government-imposed fees

These charges are determined by the **customs authorities of the destination country** and are completely outside our control.

Any applicable customs or import charges are the **responsibility of the customer**.

Please note that these charges are **not shipping charges**. We have already paid the applicable shipping cost for your parcel before dispatch.

If required, we will be happy to provide the relevant **shipping invoice or proof of postage** upon request.

━━━━━━━━━━━━━━━━━━

*💜 OUR COMMITMENT TO YOU*

We genuinely appreciate your order and your trust in ${signOff}.

Our aim is to make sure your parcel reaches you **safely and securely**. Your cooperation in checking the address, monitoring the tracking and informing us promptly of any unusual activity helps us resolve any delivery issues as quickly as possible.

Thank you for your trust and continued support.

We hope you enjoy your purchase! 💜

*${signOff}*`;
};

/* ── WaModal: mirrors the one in SalesPanel.jsx (files don't share
   components). Lets staff copy the message or open WhatsApp directly. ─── */
const WaModal = ({ data, onClose }) => {
  if (!data) return null;
  const { phone, customerName, message } = data;
  const clean = (phone || "").replace(/\D/g, "");
  // Matches the WaModal in SalesPanel.jsx exactly — same "0" -> "44"
  // heuristic used there across all three shops.
  const e164 = clean.startsWith("0") ? "44" + clean.slice(1) : clean;
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(message); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = message; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    onClose();
  };
  const handleOpen = () => {
    const url = clean
      ? "https://wa.me/" + e164 + "?text=" + encodeURIComponent(message)
      : "https://api.whatsapp.com/send?text=" + encodeURIComponent(message);
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "22px 24px", maxWidth: 460, width: "92%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>💬 Send Despatch Notification</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
        </div>
        {(customerName || phone) && (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", textTransform: "uppercase" }}>{customerName || "Customer"}</div>
            <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>📱 {phone || "No phone on file"}</div>
          </div>
        )}
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</div>
        <div style={{ flex: 1, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 13, color: "#374151", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 16, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCopy}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            📋 Copy Message
          </button>
          <button onClick={handleOpen}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#25D366", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            📱 Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Week helpers ─────────────────────────────────────────────────────
   Monday–Sunday, mirroring the "week" period convention used elsewhere
   in this app (see the header comment in SalesPanel.jsx). ─────────────── */
function mondayOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt;
}
function ddmmyyyy(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
function weekdayName(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long" });
}
function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
const currentMonthKey = () => todayISO().slice(0, 7);

/* ═══════════════════════════════════════════════════════════════════════
   ROS INDIA — redesigned Log view helpers (display only; no data logic)
   ═══════════════════════════════════════════════════════════════════════ */
const MON_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d} ${MON_ABBR[Number(m) - 1]}`; };
const shortDateY = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d} ${MON_ABBR[Number(m) - 1]} ${y}`; };
const shortDateMaybeY = (iso) => (iso && iso.slice(0, 4) !== String(new Date().getFullYear())) ? shortDateY(iso) : shortDate(iso);
const weekdayShort = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short" }); };
const titleCase = (s) => (s || "").toLowerCase().replace(/(^|[\s.\-'(])([a-z])/g, (_, a, b) => a + b.toUpperCase());
const shipperLabel = (s) => { const u = (s || "").toUpperCase(); return u === "SPEEDPOST" ? "Speed Post" : u === "FEDEX" ? "FedEx" : (s || ""); };
const daysBetween = (a, b) => {
  if (!a || !b) return null;
  const [y1, m1, d1] = a.split("-").map(Number); const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
};
// Delivery state used by the Status filter: delivered / in transit (has
// tracking, not yet delivered) / awaiting tracking (nothing to track yet).
const rowTrackState = (e) => e.delivered ? "delivered" : (e.trackingNo ? "transit" : "notrack");
const courierLabel = (k) => k === "NONE" ? "No courier" : k === "SPEEDPOST" ? "Speed Post" : k === "FEDEX" ? "FedEx" : k === "OTHERS" ? "Others" : k;
const courierKey = (e) => (e.shipper || "").trim().toUpperCase() || "NONE";

const Svg = ({ size = 14, fill = "none", children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill === "none" ? "currentColor" : "none"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{children}</svg>
);
const IcoPhone = () => <Svg size={12}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></Svg>;
const IcoCopy = () => <Svg size={13}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>;
const IcoCheck = ({ size = 13 }) => <Svg size={size}><path d="M20 6 9 17l-5-5" /></Svg>;
const IcoExt = () => <Svg size={12}><path d="M7 17 17 7M8 7h9v9" /></Svg>;
const IcoSearch = () => <Svg size={14}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>;
const IcoEdit = () => <Svg size={12}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>;
const IcoNote = () => <Svg size={14}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></Svg>;
const IcoTruck = () => <Svg size={20}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></Svg>;
const IcoPlus = () => <Svg size={14}><path d="M12 5v14M5 12h14" /></Svg>;
const IcoWA = () => (
  <Svg size={14} fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm5.4 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.8.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z" /></Svg>
);

const INDIA_CSS = `
.dx{font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;--ink:#0f172a;--mut:#64748b;--line:#e5e9f0}
.dx *{box-sizing:border-box}
.dx .mono{font-family:'DM Mono',ui-monospace,SFMono-Regular,Consolas,monospace}
.dx button{font-family:inherit}
/* header */
.dx-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:18px}
.dx-h1{display:flex;align-items:center;gap:12px;margin:0;font-size:22px;font-weight:800;letter-spacing:-.4px}
.dx-h1-ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--acbg);color:var(--ac)}
.dx-sub{margin:3px 0 0 50px;color:var(--mut);font-size:12.5px}
.dx-acts-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dx-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:#fff;color:#334155;font-weight:700;font-size:12.5px;cursor:pointer;transition:background .12s,border-color .12s}
.dx-btn:hover:not(:disabled){background:#f8fafc;border-color:#cbd5e1}
.dx-btn:disabled{opacity:.5;cursor:not-allowed}
.dx-btn.pri{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border:none;box-shadow:0 4px 12px var(--acsh)}
.dx-btn.pri:hover:not(:disabled){filter:brightness(1.06);background:linear-gradient(135deg,var(--ac),var(--ac2))}
.dx-btn.wa{background:#25d366;color:#fff;border:none}
.dx-btn.wa:hover:not(:disabled){background:#1fbd5a}
.dx-seg{display:inline-flex;background:#f1f5f9;border:1px solid var(--line);border-radius:10px;padding:2px}
.dx-seg button{padding:6px 14px;border-radius:8px;border:none;background:transparent;font-weight:700;font-size:12.5px;color:#64748b;cursor:pointer}
.dx-seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(15,23,42,.14)}
/* KPI cards */
.dx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:16px}
.dx-kpi{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px 13px;box-shadow:0 1px 3px rgba(15,23,42,.05);position:relative;overflow:hidden}
.dx-kpi:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--c,#cbd5e1)}
.dx-kpi .l{font-size:10.5px;font-weight:800;color:var(--mut);text-transform:uppercase;letter-spacing:.07em}
.dx-kpi .v{font-size:27px;font-weight:800;margin-top:3px;letter-spacing:-.6px;line-height:1.15}
.dx-kpi .v small{font-size:13px;font-weight:700;letter-spacing:0}
.dx-kpi .s{font-size:11.5px;color:var(--mut);margin-top:2px}
/* filters */
.dx-card{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 4px rgba(15,23,42,.05)}
.dx-filters{padding:14px 16px;margin-bottom:14px;display:flex;flex-direction:column;gap:12px}
.dx-frow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dx-flabel{font-size:10.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.09em;width:58px;flex-shrink:0}
.dx-chips{display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin;padding:2px 0;flex:1;min-width:0}
.dx-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;border:1px solid var(--line);background:#f8fafc;color:#475569;font-weight:600;font-size:12.5px;cursor:pointer;white-space:nowrap;flex:0 0 auto;transition:all .12s}
.dx-chip:hover{border-color:#cbd5e1;background:#f1f5f9}
.dx-chip b{font-size:10.5px;background:#e2e8f0;color:#64748b;border-radius:999px;padding:1px 7px;font-weight:800}
.dx-chip.on{background:var(--acbg);border-color:var(--ac);color:var(--actext);font-weight:800}
.dx-chip.on b{background:var(--ac);color:#fff}
.dx-search{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:7px 12px;width:300px;max-width:100%;color:#94a3b8;flex-shrink:0}
.dx-search input{border:none;outline:none;background:transparent;flex:1;min-width:0;font-size:12.5px;color:#0f172a;font-family:inherit}
.dx-search:focus-within{border-color:var(--ac);background:#fff}
.dx-days{display:flex;gap:7px;overflow-x:auto;flex:1;min-width:0;padding:2px 2px 6px;scrollbar-width:thin}
.dx-day-cell{flex:0 0 auto;min-width:60px;text-align:center;border:1px solid var(--line);border-radius:10px;padding:6px 6px 5px;background:#fff;cursor:pointer;transition:all .12s}
.dx-day-cell:hover:not(.z){border-color:#cbd5e1}
.dx-day-cell .d{font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
.dx-day-cell .n{font-size:16px;font-weight:800;line-height:1.2}
.dx-day-cell .bar{height:3px;border-radius:3px;background:#f1f5f9;margin-top:4px;overflow:hidden}
.dx-day-cell .bar i{display:block;height:100%;background:#f9a8d4;border-radius:3px}
.dx-day-cell.on{border-color:var(--ac);background:var(--acbg)}
.dx-day-cell.on .n{color:var(--actext)}
.dx-day-cell.on .bar i{background:var(--ac)}
.dx-day-cell.z{cursor:default}.dx-day-cell.z .n{color:#cbd5e1}
.dx-divider{height:1px;background:#f1f5f9}
.dx-segf{display:inline-flex;background:#f1f5f9;border:1px solid var(--line);border-radius:10px;padding:2px;flex-wrap:wrap}
.dx-segf button{padding:6px 13px;border-radius:8px;border:none;background:transparent;font-weight:700;font-size:12.5px;color:#64748b;cursor:pointer;white-space:nowrap}
.dx-segf button.on{background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.14);color:var(--ink)}
.dx-segf button.on.t{color:#b45309}.dx-segf button.on.d{color:#15803d}.dx-segf button.on.n{color:#475569}
.dx-count{margin-left:auto;color:#94a3b8;font-size:12.5px;display:flex;align-items:center;gap:12px}
.dx-count b{color:#334155}
.dx-clear{border:none;background:none;color:var(--ac);font-weight:700;font-size:12.5px;cursor:pointer;padding:0;text-decoration:underline}
/* add box */
.dx-addbox{padding:14px 16px;margin-bottom:14px}
.dx-addbox .ttl{font-size:12.5px;font-weight:800;margin-bottom:10px;color:#334155}
/* table */
.dx-tablewrap{overflow-x:scroll;overflow-y:hidden;border-radius:0 0 16px 16px;scrollbar-width:auto}
.dx-tablewrap::-webkit-scrollbar,.dx-topscroll::-webkit-scrollbar{height:12px}
.dx-tablewrap::-webkit-scrollbar-track,.dx-topscroll::-webkit-scrollbar-track{background:#eef2f7}
.dx-tablewrap::-webkit-scrollbar-thumb,.dx-topscroll::-webkit-scrollbar-thumb{background:#b6c0cf;border-radius:8px;border:2px solid #eef2f7}
.dx-tablewrap::-webkit-scrollbar-thumb:hover,.dx-topscroll::-webkit-scrollbar-thumb:hover{background:#94a3b8}
.dx-topscroll{overflow-x:scroll;overflow-y:hidden;position:sticky;top:0;z-index:6;background:#eef2f7;border-radius:16px 16px 0 0;border-bottom:1px solid var(--line);height:14px;scrollbar-width:auto}
.dx-table{width:100%;border-collapse:collapse;min-width:960px;font-size:12.5px}
.dx-table thead th{background:#f8fafc;text-align:left;font-size:10.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.08em;padding:10px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
.dx-day td{background:var(--acbg2);padding:8px 14px;border-top:1px solid var(--acline);border-bottom:1px solid var(--acline)}
.dx-day-in{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dx-day-title{font-weight:800;color:var(--actext);font-size:12.5px}
.dx-day-c{font-weight:600;color:var(--mut);font-size:11.5px}
.dx-pill{font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:999px}
.dx-pill.amber{background:#fef3c7;color:#b45309}.dx-pill.green{background:#dcfce7;color:#15803d}.dx-pill.grey{background:#f1f5f9;color:#64748b}
.dx-table tbody tr.dx-r td{padding:8px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.dx-table tbody tr.dx-r:hover td{background:#fbfcfe}
.dx-table tbody tr.dx-r.deliv td{background:#fafefb}
.dx-table tbody tr.dx-r.deliv:hover td{background:#f4fcf6}
.dx-date{font-weight:700;font-size:12.5px;white-space:nowrap}
.dx-date small{display:block;color:#94a3b8;font-weight:600;font-size:11px;margin-top:1px}
.dx-date.today{color:var(--actext)}
.dx-cust{font-weight:700;font-size:13px;line-height:1.25}
.dx-phone{display:flex;align-items:center;gap:4px;color:#475569;margin-top:2px;font-size:11.5px;white-space:nowrap}
.dx-badge{display:inline-block;margin-top:4px;font-size:9.5px;font-weight:800;border-radius:999px;padding:1px 7px;white-space:nowrap}
.dx-addr{display:flex;align-items:flex-start;gap:6px}
.dx-addr-t{flex:1;min-width:0;color:#475569;line-height:1.4;font-size:12px;cursor:default;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dx-addr-t.more{cursor:pointer}
.dx-addr-t.open{display:block;white-space:pre-wrap;-webkit-line-clamp:unset}
.dx-addr-t.empty{color:#94a3b8;font-style:italic;cursor:pointer}
.dx-more{font-size:10px;font-weight:800;color:var(--ac);cursor:pointer;margin-top:2px}
.dx-remark{margin-top:4px;font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:2px 8px;display:inline-block;max-width:100%}
.dx-remark-in{margin-top:5px;width:100%;padding:5px 8px;border:1px solid var(--ac);border-radius:7px;font-size:12px;font-family:inherit;outline:none}
.dx-iconbtn{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;border:1px solid var(--line);background:#fff;color:#64748b;cursor:pointer;transition:all .12s}
.dx-iconbtn:hover{color:var(--ac);border-color:var(--ac)}
.dx-iconbtn.ok{background:#dcfce7;color:#15803d;border-color:#bbf7d0}
.dx-iconbtn.note.on{background:#fef3c7;color:#92400e;border-color:#fde68a}
.dx-ship{appearance:none;-webkit-appearance:none;border:1px solid transparent;border-radius:8px;padding:4px 22px 4px 8px;font-weight:700;font-size:11.5px;cursor:pointer;font-family:inherit;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2394a3b8' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 7px center}
.dx-ship:focus{border-color:var(--ac)}
.dx-trk-wrap{display:flex;align-items:center;gap:4px}
.dx-trk{flex:1;min-width:0;width:100%;border:1px solid transparent;background:transparent;border-radius:8px;padding:4px 6px;font-size:11.5px;font-weight:500;letter-spacing:0;outline:none;color:#0f172a;transition:all .12s}
.dx-trk:hover{border-color:var(--line);background:#fff}
.dx-trk:focus{border-color:var(--ac);background:#fff}
.dx-trk.dup{border-color:#fca5a5;background:#fef2f2}
.dx-trk::placeholder{color:#cbd5e1;font-family:'DM Sans',sans-serif}
.dx-warn{font-size:10.5px;color:#dc2626;font-weight:700;margin-top:2px;padding-left:8px}
.dx-track{display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:9px;border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .12s}
.dx-track:hover{background:#e0e7ff}
.dx-muted{color:#cbd5e1;font-size:12px;white-space:nowrap}
.dx-hint{color:#94a3b8;font-size:11px;font-style:italic;white-space:nowrap}
.dx-dl{display:flex;align-items:center;gap:8px;white-space:nowrap}
.dx-mark{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:9px;border:1px dashed #fcd34d;background:#fffbeb;color:#92400e;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap}
.dx-mark:hover{background:#fef3c7}
.dx-pickwrap{position:relative;display:inline-block}
.dx-pickhid{position:absolute;left:0;bottom:0;width:100%;height:1px;opacity:0;pointer-events:none;border:0;padding:0}
.dx-dinput{padding:5px 7px;border:1px solid #e2e8f0;border-radius:8px;font-size:11.5px;font-family:'DM Mono',monospace;color:#334155;background:#fff;outline:none;width:118px}
.dx-dinput:focus{border-color:var(--ac)}
.dx-deliv{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:9px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap}
.dx-deliv span{font-weight:600;font-size:11.5px;color:#3f8f5d}
.dx-link{border:none;background:none;color:#94a3b8;font-size:11.5px;text-decoration:underline;cursor:pointer;padding:0}
.dx-link:hover{color:#475569}
.dx-inform{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;border:none;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .12s}
.dx-inform.send{background:#25d366;color:#fff;box-shadow:0 3px 8px rgba(37,211,102,.3)}
.dx-inform.send:hover{background:#1fbd5a}
.dx-inform.done{background:#ecfdf5;color:#15803d;border:1px solid #a7f3d0;padding:5px 10px}
.dx-inform.off{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.dx-actions{display:flex;align-items:center;gap:2px}
.dx-del{border:none;background:none;color:#cbd5e1;cursor:pointer;font-size:15px;padding:2px 4px}
.dx-del:hover{color:#dc2626}
.dx-empty{padding:46px 20px;text-align:center;color:#94a3b8;font-size:13.5px}
.dx-foot{padding:12px 16px;border-top:1px solid var(--line);color:#94a3b8;font-size:12px;display:flex;justify-content:space-between}
`;

/* ── Dismissed-sale tracking ──────────────────────────────────────────
   Auto-add (below) creates a row for any "Ready to Ship" sale that isn't
   on the log. Deleting that row doesn't un-flag the sale in Sales, so
   without this, auto-add would immediately recreate the row it was just
   deleted — kept in localStorage (per shop) so an admin's deletion
   sticks across reloads. Manually re-adding via search still works;
   this only stops the AUTOMATIC re-add. ───────────────────────────────── */
function dismissedKey(shopId) { return `ros_dispatch_dismissed_${shopId}`; }
function loadDismissed(shopId) {
  try { return JSON.parse(localStorage.getItem(dismissedKey(shopId)) || "{}"); }
  catch { return {}; }
}
function saveDismissed(shopId, map) {
  try { localStorage.setItem(dismissedKey(shopId), JSON.stringify(map)); } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════
   DISPATCH PANEL
   ═══════════════════════════════════════════════════════════════════════ */
export default function DispatchPanel({ shop, shopId, user, sales, onSaleUpdate, onSaleFieldEdit }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  // Which date chip is selected in the Log view — "all" shows every
  // despatch ever logged in one continuous list (no per-day grouping/
  // collapsing); a "YYYY-MM-DD" value filters to just that day. Replaces
  // the old week-by-week navigation entirely, per explicit request: one
  // flat, scrollable list instead of a collapsible day-by-day bar, with
  // per-day totals still visible via the chip counts.
  const [dateFilter, setDateFilter] = useState("all");
  // ROS India only — the log there keeps its full history (unlike the UK
  // shops' rolling 2-day window), so instead of one day-chip per day
  // forever, the Log view defaults to just the last 30 days and offers
  // month tag buttons ("September 2026", "August 2026", …) to jump to any
  // older month's despatches on demand. "recent30" = the 30-day default;
  // any other value is a "YYYY-MM" month key.
  const [monthFilter, setMonthFilter] = useState("recent30");
  const [addDate, setAddDate] = useState(todayISO());       // which day new adds land on
  const [search, setSearch] = useState("");
  const [waModal, setWaModal] = useState(null);
  const [savingIds, setSavingIds] = useState({}); // uuid -> true while a save is in flight
  const [viewMode, setViewMode] = useState("log"); // "log" | "calendar"
  const [calMonth, setCalMonth] = useState(currentMonthKey()); // "YYYY-MM" shown in Calendar view
  const [dismissedSaleIds, setDismissedSaleIds] = useState({}); // sale id -> true, blocks auto-re-add after a manual delete
  // Log-view row compactness: the Address cell shows just its first line
  // by default (click to expand) and Remarks lives behind a small icon
  // instead of an always-visible input — both purely to keep the table
  // narrow enough to fit without a horizontal scrollbar. Neither changes
  // any stored data, just how much of it is shown at once.
  const [expandedAddresses, setExpandedAddresses] = useState({}); // uuid -> true when address is expanded
  const [openRemarksUuid, setOpenRemarksUuid] = useState(null); // uuid of the row whose remarks field is open, if any
  const [openDeliveryUuid, setOpenDeliveryUuid] = useState(null); // uuid of the row whose delivered-date editor is open, if any
  const [copiedTrackingUuid, setCopiedTrackingUuid] = useState(null); // uuid whose 📋 copy button just fired — flips to ✓ briefly
  const [addressModalUuid, setAddressModalUuid] = useState(null); // uuid of the row whose "edit address" popup is open, if any
  const [savingAddress, setSavingAddress] = useState(false);
  // ROS India redesigned Log view — extra display filters (none of these are stored anywhere).
  const [courierFilter, setCourierFilter] = useState("ALL");   // "ALL" | uppercase shipper key | "NONE"
  const [statusFilter, setStatusFilter] = useState("ALL");     // "ALL" | "transit" | "delivered" | "notrack"
  const [dayFilter, setDayFilter] = useState("all");           // "all" | "YYYY-MM-DD"
  const [listSearch, setListSearch] = useState("");            // filters rows already on the log (not the add-from-sale search)
  const [showAdd, setShowAdd] = useState(false);               // reveals the add-from-sale search box
  const datePickRefs = useRef({});                         // uuid -> hidden <input type="date"> behind the Mark Delivered / Delivered button
  const tableTopRef = useRef(null);                        // always-visible horizontal scrollbar above the table (synced with the table itself)
  const tableBodyRef = useRef(null);
  const [tableScrollW, setTableScrollW] = useState(0);
  // Keys (see despatchKeyOf) currently in the middle of being written to
  // the despatch log by the auto-add effect below. React state only
  // reflects a new row once its insert has actually returned, so if the
  // effect re-runs (a re-render, a tab remount, etc.) while an earlier
  // insert for the same sale is still in flight, `entries` won't show it
  // yet and the effect would otherwise queue a second insert for the same
  // sale — a real duplicate row, not just a display glitch. This ref is a
  // synchronous lock that closes that gap; it isn't state on purpose,
  // since it must be checked and set before the next render, not after.
  const addingKeysRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await dbLoadDispatchLog(shopId);
      if (!cancelled) { setEntries(rows || []); setLoading(false); }
    })();
    setDismissedSaleIds(loadDismissed(shopId));
    return () => { cancelled = true; };
  }, [shopId]);

  // Keep the top slider as wide as the table so both scroll together.
  useEffect(() => {
    const el = tableBodyRef.current;
    if (!el) return undefined;
    const measure = () => setTableScrollW(prev => (prev === el.scrollWidth ? prev : el.scrollWidth));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });

  const allSales = sales || [];
  // Only admins/superadmins can delete a row — despatch staff can add,
  // edit, and notify, but not remove entries from the log.
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isIndiaShop = shopId === "ros-india" || shopId === "ros-india-staff";
  const SHIPPERS = isIndiaShop ? IN_SHIPPERS : UK_SHIPPERS;
  // Default shipper pre-filled on new despatch rows — DTDC for India, Royal Mail for the UK shops.
  const DEFAULT_SHIPPER = isIndiaShop ? "DTDC" : "Royal Mail";
  // ROS Selections and ROS Hairlines keep their own full despatch history
  // in a separate app, so the log here is intentionally a rolling 2-day
  // window (today + yesterday) rather than a permanent record — see the
  // pruning effect below (after despatchKeyOf) for what actually enforces
  // this against the dispatch_log table itself.
  const isTwoDayShop = shopId === "ros-selections" || shopId === "ros-hairlines";

  /* ── Linked-transaction grouping ──────────────────────────────────────
     A single customer parcel can be split across several sale rows
     (Advance/Part/Final payment, or two rows manually linked in Sales).
     Mirrors SalesPanel.jsx's own instalment-grouping logic so that if the
     "Ready to Ship" chip gets pressed on more than one of those linked
     rows, they still collapse to ONE despatch log entry instead of one
     per transaction. Kept as a local copy (rather than a shared import)
     since both files already duplicate a few small helpers like this and
     neither imports from the other. */
  const inferPaymentType = (sale) => {
    if (sale.paymentType) return sale.paymentType;
    const tags = (sale.tag || "").split(",").map(t => t.trim());
    if (tags.includes("Advance Sale")) return "ADVANCE";
    if (tags.includes("Final Payment Sale")) return "FINAL";
    if (tags.includes("Part Payment")) return "PART";
    return "FULL";
  };
  const tagPriority = (s) => {
    const pt = inferPaymentType(s);
    if (pt === "ADVANCE") return 0;
    if (pt === "FINAL") return 2;
    return 1;
  };
  const { saleGroupKey, groupMembers } = useMemo(() => {
    const rawGroups = {};
    allSales.forEach(s => {
      if (inferPaymentType(s) === "FULL") return; // never grouped
      const phone = (s.phone || s.contact || "").replace(/\D/g, "").slice(-10);
      const name = normCustomerName(s.customer);
      if (!phone && !name) return;
      const key = `${name}__${phone}`;
      (rawGroups[key] ||= []).push(s);
    });
    const result = {};
    Object.entries(rawGroups).forEach(([custKey, custSales]) => {
      const sorted = [...custSales].sort((a, b) => {
        const d = (a.date || "").localeCompare(b.date || "");
        if (d !== 0) return d;
        const p = tagPriority(a) - tagPriority(b);
        if (p !== 0) return p;
        return (a.invoiceNo || a.id || "").localeCompare(b.invoiceNo || b.id || "");
      });
      let groupIdx = 0, currentKey = null, dealOpen = false;
      for (const s of sorted) {
        const pt = inferPaymentType(s);
        const isAdvance = pt === "ADVANCE";
        const isFinal = pt === "FINAL";
        if (!dealOpen || isAdvance) {
          groupIdx++;
          currentKey = `${custKey}__grp${groupIdx}`;
          result[currentKey] = [];
          dealOpen = true;
        }
        result[currentKey].push(s);
        if (isFinal) dealOpen = false;
      }
    });
    // Manual link merge pass — same as SalesPanel: sales sharing a
    // manualLinkGroup value are unified into one group regardless of what
    // the automatic Advance/Part/Final pass did with them.
    const byManualLink = {};
    allSales.forEach(s => { if (s.manualLinkGroup) (byManualLink[s.manualLinkGroup] ||= []).push(s); });
    Object.values(byManualLink).forEach(linkedSales => {
      if (linkedSales.length < 2) return;
      const linkedIds = new Set(linkedSales.map(s => s.id));
      const touchedKeys = Object.keys(result).filter(k => result[k].some(s => linkedIds.has(s.id)));
      const unionMap = {};
      touchedKeys.forEach(k => result[k].forEach(s => { unionMap[s.id] = s; }));
      linkedSales.forEach(s => { unionMap[s.id] = s; });
      touchedKeys.forEach(k => delete result[k]);
      const mergedKey = `manual__${Array.from(linkedIds).sort().join("_")}`;
      result[mergedKey] = Object.values(unionMap);
    });
    const keyOf = {};
    Object.entries(result).forEach(([gk, members]) => { members.forEach(s => { keyOf[s.id] = gk; }); });
    return { saleGroupKey: keyOf, groupMembers: result };
  }, [allSales]);
  // A sale with no linked payments is its own solo "group" of one.
  const despatchKeyOf = (sale) => saleGroupKey[sale.id] || sale.id;

  // ── Rolling 2-day window (ROS Selections / ROS Hairlines only) ──────────
  // Two parts: (1) what's actually SHOWN never includes anything older
  // than yesterday, computed synchronously so there's no flash of older
  // rows while the prune effect below is still working; (2) the rows
  // themselves get deleted from dispatch_log so the table doesn't quietly
  // keep growing forever. `entries` (the full, unfiltered state) stays the
  // source of truth for the auto-add dedupe logic above/below, so nothing
  // here can cause a duplicate row to be created while a purge is in flight.
  const pruneCutoff = yesterdayISO();
  const visibleEntries = useMemo(() => {
    if (!isTwoDayShop) return entries;
    return entries.filter(e => e.dispatchDate && e.dispatchDate >= pruneCutoff);
  }, [entries, isTwoDayShop, pruneCutoff]);

  // Deletes any row older than yesterday and, for each one, clears "Ready
  // to Ship" on its linked sale (and every other sale in the same despatch
  // group, e.g. Advance/Part/Final) BEFORE removing it from state. This
  // matters: readyToShip never gets cleared on its own once a sale is
  // fulfilled, so the deleted row was the only thing stopping the auto-add
  // effect above from treating that old sale as "never dispatched" and
  // silently recreating a fresh entry for it today. Clearing the flag here
  // closes that loop for good, on the server, regardless of which device
  // or browser opens the tab next.
  const pruningRef = useRef(false);
  useEffect(() => {
    if (loading || !isTwoDayShop || pruningRef.current) return;
    const stale = entries.filter(e => e.dispatchDate && e.dispatchDate < pruneCutoff);
    if (!stale.length) return;
    pruningRef.current = true;
    (async () => {
      for (const e of stale) {
        await dbDeleteDispatchEntry(e.uuid, shopId);
        if (e.saleId) {
          const linkedSale = allSales.find(x => x.id === e.saleId);
          if (linkedSale) {
            const key = despatchKeyOf(linkedSale);
            const members = groupMembers[key] || [linkedSale];
            for (const m of members) {
              if (m.readyToShip && onSaleFieldEdit) await onSaleFieldEdit(m.id, { readyToShip: false });
            }
          }
        }
      }
      const staleUuids = new Set(stale.map(e => e.uuid));
      setEntries(prev => prev.filter(e => !staleUuids.has(e.uuid)));
      pruningRef.current = false;
    })();
  }, [loading, isTwoDayShop, entries, pruneCutoff, shopId, allSales, groupMembers, onSaleFieldEdit]);

  // Safety net for the cases even normCustomerName() above can't fix — a
  // genuinely different spelling, or the same person typed under two
  // clearly different names. Groups sales by PHONE ONLY (ignoring name) so
  // it can spot when a phone number appears under more than one name and
  // those sales haven't already been tied together (auto grouping or a
  // manual link) — that's exactly the shape of a missed link, and it's
  // otherwise invisible until someone happens to notice Sales didn't
  // update. Surfaced on the despatch row as a dismissible hint with a
  // one-click "Link orders" action (handleManualLink below), not a hard
  // block — plenty of real customers share a household phone number, so
  // this has to stay a suggestion, never an assumption.
  const phoneCollisionByPhone = useMemo(() => {
    const byPhone = {};
    allSales.forEach(s => {
      const phone = (s.phone || s.contact || "").replace(/\D/g, "").slice(-10);
      if (!phone) return;
      (byPhone[phone] ||= []).push(s);
    });
    const collisions = {}; // phone -> true if >1 distinct name AND not fully linked
    Object.entries(byPhone).forEach(([phone, group]) => {
      const names = new Set(group.map(s => normCustomerName(s.customer)));
      if (names.size < 2) return;
      const keys = new Set(group.map(s => despatchKeyOf(s)));
      if (keys.size < 2) return; // different names, but already unified into one group
      collisions[phone] = group;
    });
    return collisions;
  }, [allSales, saleGroupKey]);
  // For a given sale, the other differently-named sale(s) sharing its
  // phone number and not yet linked to it — null if there's no collision.
  const phoneCollisionFor = (sale) => {
    const phone = (sale?.phone || sale?.contact || "").replace(/\D/g, "").slice(-10);
    if (!phone) return null;
    const group = phoneCollisionByPhone[phone];
    if (!group) return null;
    const myKey = despatchKeyOf(sale);
    const others = group.filter(s => despatchKeyOf(s) !== myKey);
    return others.length ? others : null;
  };

  // Address is now entered/edited ONLY on the Sales page — the Despatch
  // Log always pulls the live value from the linked sale rather than
  // keeping its own editable copy, so a correction made in Sales shows up
  // here automatically. Falls back to the snapshot taken when the row was
  // added, in case the sale record itself is ever missing (e.g. deleted).
  const liveAddressFor = (entry) => {
    const linked = allSales.find(x => x.id === entry.saleId);
    return (linked ? linked.address : entry.address) || "";
  };
  // Same idea for phone — entered/edited only on the Sales page now.
  const livePhoneFor = (entry) => {
    const linked = allSales.find(x => x.id === entry.saleId);
    return (linked ? (linked.phone || linked.contact) : entry.phone) || "";
  };
  // Which sale should represent the group on the despatch row — prefer the
  // Advance (it usually carries the address/phone first), else whichever
  // transaction comes first in the same Advance→Part→Final ordering used
  // to build the groups above.
  const anchorSaleForGroup = (members) => {
    if (!members || !members.length) return null;
    const advance = members.find(m => inferPaymentType(m) === "ADVANCE");
    if (advance) return advance;
    return [...members].sort((a, b) => {
      const d = (a.date || "").localeCompare(b.date || "");
      if (d !== 0) return d;
      return tagPriority(a) - tagPriority(b);
    })[0];
  };

  // Sale ids already present anywhere in the log — used to badge search
  // results as "already added" (still addable again, e.g. multi-parcel).
  const loggedSaleIds = useMemo(() => {
    const m = {};
    entries.forEach(e => { if (e.saleId) m[e.saleId] = (m[e.saleId] || 0) + 1; });
    return m;
  }, [entries]);

  // Which despatch GROUPS (see grouping helpers above) already have a row
  // on the log — this is what the auto-add effect checks, so linked
  // transactions collapse to one entry regardless of how many of them get
  // individually flagged "Ready to Ship".
  const loggedGroupKeys = useMemo(() => {
    const s = new Set();
    entries.forEach(e => {
      if (!e.saleId) return;
      const linkedSale = allSales.find(x => x.id === e.saleId);
      s.add(linkedSale ? despatchKeyOf(linkedSale) : e.saleId);
    });
    return s;
  }, [entries, allSales, saleGroupKey]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return allSales.filter(s => {
      const name = (s.customer || "").toLowerCase();
      const phone = (s.phone || s.contact || "").replace(/\D/g, "");
      return name.includes(q) || (digits && phone.includes(digits));
    })
      .sort((a, b) => (b.readyToShip ? 1 : 0) - (a.readyToShip ? 1 : 0))
      .slice(0, 12);
  }, [allSales, search]);

  // Every entry, grouped by dispatchDate — used by the Print/WhatsApp/Copy
  // exports so they can still present a day-by-day breakdown even though
  // the on-screen Log view is now one flat, continuous list.
  const entriesByDateAll = useMemo(() => {
    const m = {};
    visibleEntries.forEach(e => { (m[e.dispatchDate] ||= []).push(e); });
    Object.values(m).forEach(list => list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")));
    return m;
  }, [visibleEntries]);

  // Distinct dispatch dates across the ENTIRE log, most recent first —
  // feeds the date-filter chip strip ("All dates N" + one chip per day
  // with its own count), replacing the old week-navigation controls.
  // (ROS India uses the month-tag strip below instead — see monthTagsIndia.)
  const chipDates = useMemo(() => {
    return Object.keys(entriesByDateAll).filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [entriesByDateAll]);

  // ROS India month browsing — every entry grouped by "YYYY-MM", most
  // recent first, each with its own count. Feeds the month-tag button
  // strip that replaces the day-chip strip for this shop only (its log
  // keeps full history, so one chip per day forever isn't practical).
  const entriesByMonthIndia = useMemo(() => {
    const m = {};
    visibleEntries.forEach(e => { if (!e.dispatchDate) return; const mk = e.dispatchDate.slice(0, 7); (m[mk] ||= []).push(e); });
    Object.values(m).forEach(list => list.sort((a, b) => {
      const d = (b.dispatchDate || "").localeCompare(a.dispatchDate || "");
      if (d !== 0) return d;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    }));
    return m;
  }, [visibleEntries]);
  const monthTagsIndia = useMemo(() => Object.keys(entriesByMonthIndia).sort((a, b) => b.localeCompare(a)), [entriesByMonthIndia]);
  // Inclusive of today — "last 30 days" means today and the 29 before it.
  const last30Cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 29); return localISO(d); }, []);
  const last30EntriesIndia = useMemo(() => {
    return visibleEntries.filter(e => e.dispatchDate && e.dispatchDate >= last30Cutoff).slice().sort((a, b) => {
      const d = (b.dispatchDate || "").localeCompare(a.dispatchDate || "");
      if (d !== 0) return d;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
  }, [visibleEntries, last30Cutoff]);

  // The entries the flat Log-view table actually shows.
  // ROS India: the last 30 days by default, or one full month once a
  // month tag is picked (see monthFilter). Every other shop: everything,
  // or just the one date currently selected via the day-chip strip.
  const filteredEntries = useMemo(() => {
    if (isIndiaShop) {
      return monthFilter === "recent30" ? last30EntriesIndia : (entriesByMonthIndia[monthFilter] || []);
    }
    const list = dateFilter === "all"
      ? visibleEntries.slice().sort((a, b) => {
          const d = (b.dispatchDate || "").localeCompare(a.dispatchDate || "");
          if (d !== 0) return d;
          return (a.createdAt || "").localeCompare(b.createdAt || "");
        })
      : (entriesByDateAll[dateFilter] || []);
    return list;
  }, [isIndiaShop, monthFilter, last30EntriesIndia, entriesByMonthIndia, visibleEntries, entriesByDateAll, dateFilter]);

  // Per-day counts across the ENTIRE log (not just the visible week) —
  // feeds the Calendar view's day badges.
  const calendarCounts = useMemo(() => {
    const m = {};
    visibleEntries.forEach(e => { if (e.dispatchDate) m[e.dispatchDate] = (m[e.dispatchDate] || 0) + 1; });
    return m;
  }, [visibleEntries]);

  // Month-by-month totals across the entire log, most recent first, with
  // a month-over-month % change — the "business growth" trend view.
  const monthlyTotals = useMemo(() => {
    const m = {};
    entries.forEach(e => {
      if (!e.dispatchDate) return;
      const key = e.dispatchDate.slice(0, 7);
      m[key] = (m[key] || 0) + 1;
    });
    const keys = Object.keys(m).sort();
    const maxCount = Math.max(1, ...Object.values(m));
    return keys.map((key, i) => {
      const prev = i > 0 ? m[keys[i - 1]] : null;
      const delta = prev ? Math.round(((m[key] - prev) / prev) * 100) : null;
      return { key, label: monthLabel(key), count: m[key], delta, pct: Math.round((m[key] / maxCount) * 100) };
    }).reverse();
  }, [entries]);

  // Calendar grid cells for calMonth — null for the leading/trailing
  // blanks so the grid lines up under Mon..Sun headers.
  const calCells = useMemo(() => {
    const [y, m] = calMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const startDow = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [calMonth]);

  // Tracking numbers already used ANYWHERE in the log (not just this
  // week) — for the duplicate guard. Keyed by uppercased, whitespace-
  // stripped tracking number.
  const trackingIndex = useMemo(() => {
    const m = {};
    entries.forEach(e => {
      const key = (e.trackingNo || "").replace(/\s+/g, "").toUpperCase();
      if (!key) return;
      (m[key] = m[key] || []).push(e.uuid);
    });
    return m;
  }, [entries]);

  // Same-customer duplicate-row guard: entries that share a customer name +
  // phone but ended up on DIFFERENT despatch groups (see despatchKeyOf
  // above) — could be two genuinely separate orders, or a case where a
  // later edit (e.g. a phone number correction) split what should have
  // been one linked group. This is purely a visual heads-up for despatch
  // staff to double-check — nothing is merged or changed automatically.
  const dupCustomerGroupKeys = useMemo(() => {
    const byCustomer = {}; // "name__phone" -> Set of despatch group keys seen
    entries.forEach(e => {
      const linked = allSales.find(x => x.id === e.saleId);
      const name = normCustomerName(linked ? linked.customer : e.customer);
      const phone = ((linked ? (linked.phone || linked.contact) : e.phone) || "").replace(/\D/g, "").slice(-10);
      if (!name && !phone) return;
      const custKey = `${name}__${phone}`;
      const groupKey = linked ? despatchKeyOf(linked) : (e.saleId || e.uuid);
      (byCustomer[custKey] ||= new Set()).add(groupKey);
    });
    const flagged = new Set();
    Object.values(byCustomer).forEach(keys => { if (keys.size > 1) keys.forEach(k => flagged.add(k)); });
    return flagged;
  }, [entries, allSales, saleGroupKey]);

  const summary = useMemo(() => {
    const total = filteredEntries.length;
    const noTracking = filteredEntries.filter(e => !e.trackingNo).length;
    const notNotified = filteredEntries.filter(e => !e.notified).length;
    const delivered = filteredEntries.filter(e => e.delivered).length;
    // Has tracking + shipper (so it CAN be tracked/marked) but hasn't been
    // confirmed delivered yet — the "still needs checking" queue.
    const awaitingDelivery = filteredEntries.filter(e => e.trackingNo && e.shipper && !e.delivered).length;
    return { total, noTracking, notNotified, delivered, awaitingDelivery };
  }, [filteredEntries]);

  /* ── ROS India redesigned Log view: filters, KPIs, grouping ──────────────
     Everything here is display-only derivation over `filteredEntries`
     (already limited to the Last-30-days / picked-month window above) — no
     stored data and no save logic is touched. Courier / Status / Day /
     text-search filters stack on top of the month window; each chip row's
     counts reflect the OTHER active filters so the numbers always match
     what you'd see after clicking. */
  const ixQ = listSearch.trim().toLowerCase();
  const ixQDigits = ixQ.replace(/\D/g, "");
  const ixQTrack = ixQ.replace(/\s+/g, "");
  const ixBase = !isIndiaShop ? [] : (!ixQ ? filteredEntries : filteredEntries.filter(e => {
    const phoneDigits = (livePhoneFor(e) || "").replace(/\D/g, "");
    return (e.customer || "").toLowerCase().includes(ixQ)
      || (ixQDigits.length >= 3 && phoneDigits.includes(ixQDigits))
      || (e.trackingNo || "").replace(/\s+/g, "").toLowerCase().includes(ixQTrack);
  }));
  const ixMatchCourier = (e) => courierFilter === "ALL" || courierKey(e) === courierFilter;
  const ixMatchStatus = (e) => statusFilter === "ALL" || rowTrackState(e) === statusFilter;
  const ixScope = ixBase.filter(e => ixMatchCourier(e) && ixMatchStatus(e));          // before the day filter
  const shownEntries = !isIndiaShop ? filteredEntries : (dayFilter === "all" ? ixScope : ixScope.filter(e => e.dispatchDate === dayFilter));
  const exportEntries = isIndiaShop ? shownEntries : filteredEntries;

  const ixCourierCounts = {};
  ixBase.filter(ixMatchStatus).forEach(e => { const k = courierKey(e); ixCourierCounts[k] = (ixCourierCounts[k] || 0) + 1; });
  const ixCourierKeys = Array.from(new Set([...Object.keys(ixCourierCounts), ...(courierFilter !== "ALL" ? [courierFilter] : [])]))
    .sort((a, b) => (ixCourierCounts[b] || 0) - (ixCourierCounts[a] || 0));
  const ixStatusCounts = { transit: 0, delivered: 0, notrack: 0 };
  ixBase.filter(ixMatchCourier).forEach(e => { ixStatusCounts[rowTrackState(e)]++; });
  const ixStatusTotal = ixStatusCounts.transit + ixStatusCounts.delivered + ixStatusCounts.notrack;

  // One cell per calendar day of the window (newest first) so quiet days
  // show as 0 instead of silently disappearing.
  const ixDayCounts = {};
  ixScope.forEach(e => { if (e.dispatchDate) ixDayCounts[e.dispatchDate] = (ixDayCounts[e.dispatchDate] || 0) + 1; });
  const ixDayList = (() => {
    if (!isIndiaShop) return [];
    const out = [];
    if (monthFilter === "recent30") {
      for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); out.push(localISO(d)); }
    } else {
      const [y, m] = monthFilter.split("-").map(Number);
      const last = new Date(y, m, 0).getDate();
      const today = todayISO();
      for (let d = last; d >= 1; d--) { const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; if (iso <= today) out.push(iso); }
    }
    return out;
  })();
  const ixDayMax = Math.max(1, ...Object.values(ixDayCounts));

  // Consecutive same-date rows → one group each (shownEntries is already date-desc).
  const ixGroups = [];
  shownEntries.forEach(e => {
    const last = ixGroups[ixGroups.length - 1];
    if (last && last.date === e.dispatchDate) last.rows.push(e);
    else ixGroups.push({ date: e.dispatchDate, rows: [e] });
  });

  // KPI cards describe the whole month/30-day window (not the narrower
  // Courier/Status/Day/search filters) so they stay a stable overview.
  const ixKpi = (() => {
    const scope = filteredEntries;
    const transit = scope.filter(e => rowTrackState(e) === "transit");
    const delivered = scope.filter(e => e.delivered);
    const noTrack = scope.filter(e => rowTrackState(e) === "notrack").length;
    const today = todayISO(), yday = yesterdayISO();
    const oldest = transit.reduce((mx, e) => Math.max(mx, daysBetween(e.dispatchDate, today) || 0), 0);
    const durs = delivered.map(e => ({ k: courierKey(e), d: daysBetween(e.dispatchDate, e.deliveredDate) })).filter(x => x.d !== null && x.d >= 0);
    const avg = durs.length ? durs.reduce((s, x) => s + x.d, 0) / durs.length : null;
    const byC = {};
    durs.forEach(x => { (byC[x.k] ||= []).push(x.d); });
    const perCourier = Object.entries(byC).sort((a, b) => b[1].length - a[1].length).slice(0, 2)
      .map(([k, arr]) => `${courierLabel(k)} ${(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)}`);
    return {
      total: scope.length, transit: transit.length, delivered: delivered.length, noTrack, oldest, avg, perCourier,
      todayN: scope.filter(e => e.dispatchDate === today).length, ydayN: scope.filter(e => e.dispatchDate === yday).length,
      notNotified: scope.filter(e => !e.notified).length,
    };
  })();
  const ixFiltersActive = courierFilter !== "ALL" || statusFilter !== "ALL" || dayFilter !== "all" || !!ixQ;
  const ixClearFilters = () => { setCourierFilter("ALL"); setStatusFilter("ALL"); setDayFilter("all"); setListSearch(""); };
  const ixMonthTitle = monthFilter === "recent30" ? "Last 30 days" : monthLabel(monthFilter);

  const persist = async (uuidOrNull, payload) => {
    setSavingIds(p => ({ ...p, [uuidOrNull || "__new__"]: true }));
    const res = await dbSaveDispatchEntry(shopId, uuidOrNull ? { ...payload, _uuid: uuidOrNull } : payload);
    setSavingIds(p => { const n = { ...p }; delete n[uuidOrNull || "__new__"]; return n; });
    return res;
  };

  const addFromSale = async (sale) => {
    const draft = {
      saleId: sale.id,
      dispatchDate: addDate,
      customer: sale.customer || "",
      phone: sale.phone || sale.contact || "",
      address: sale.address || "",
      trackingNo: "",
      shipper: DEFAULT_SHIPPER,
      notified: false,
      remarks: "",
    };
    const res = await persist(null, draft);
    if (res?.error) { showAlert("Could not add to dispatch log: " + res.error); return; }
    setEntries(prev => [...prev, { ...draft, uuid: res.uuid, createdAt: new Date().toISOString() }]);
    setSearch("");
    // Select the date chip the new row landed on, so it's immediately
    // visible even if addDate isn't today / isn't the currently selected chip.
    setDateFilter(addDate);
  };

  // Auto-add: any sale flagged "Ready to Ship" in the Sales tab that
  // isn't on the log yet gets added automatically, dated today — no
  // click needed. (Earlier this was a manual click-to-add suggestion;
  // changed to fully automatic per explicit request.) A sale un-flagged
  // later does NOT remove its row — despatch staff may already have
  // typed tracking info into it, so that stays intact; remove it by
  // hand with the row's ✕ if it was added in error.
  //
  // De-duplicated at the GROUP level: when a sale is one of several linked
  // transactions (Advance/Part/Final, or manually linked), pressing "Ready
  // to Ship" on more than one of them must still only create ONE despatch
  // row for that parcel, not one per transaction.
  useEffect(() => {
    if (loading) return;
    const seenKeys = new Set();
    const toAdd = [];
    allSales.forEach(s => {
      if (!s.readyToShip) return;
      const key = despatchKeyOf(s);
      if (loggedGroupKeys.has(key) || dismissedSaleIds[key] || seenKeys.has(key)) return;
      // Already being inserted by a run of this same effect that hasn't
      // come back from the database yet — skip, don't queue a second
      // insert for it (see addingKeysRef above for why this check exists).
      if (addingKeysRef.current.has(key)) return;
      seenKeys.add(key);
      toAdd.push({ key, sale: anchorSaleForGroup(groupMembers[key]) || s });
    });
    if (!toAdd.length) return;
    toAdd.forEach(({ key }) => addingKeysRef.current.add(key));
    let cancelled = false;
    (async () => {
      for (const { key, sale } of toAdd) {
        const draft = {
          saleId: sale.id,
          dispatchDate: todayISO(),
          customer: sale.customer || "",
          phone: sale.phone || sale.contact || "",
          address: sale.address || "",
          trackingNo: "",
          shipper: DEFAULT_SHIPPER,
          notified: false,
          remarks: "",
        };
        const res = await persist(null, draft);
        addingKeysRef.current.delete(key);
        if (cancelled) return;
        if (!res?.error) {
          setEntries(prev => [...prev, { ...draft, uuid: res.uuid, createdAt: new Date().toISOString() }]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loading, allSales, loggedGroupKeys, dismissedSaleIds, saleGroupKey]);

  const updateEntry = (uuid, patch) => {
    setEntries(prev => prev.map(e => e.uuid === uuid ? { ...e, ...patch } : e));
  };

  // Persists just linkWarning, bypassing saveEntry's own push-to-Sales
  // logic below (calling saveEntry from inside itself would re-trigger
  // that fan-out). Used to leave a durable trace on the row when a push
  // fails, and to clear it once a retry succeeds — so unlike the one-time
  // popup this replaces, the warning is still there whenever anyone next
  // opens the Despatch tab, not just for whoever was at the row when it
  // happened.
  const setLinkWarning = async (uuid, text) => {
    const current = entries.find(e => e.uuid === uuid);
    if (!current || current.linkWarning === text) return;
    updateEntry(uuid, { linkWarning: text });
    await persist(uuid, { ...current, linkWarning: text });
  };

  // Pushes one field-set to every sale in merged's linked group, via
  // onSaleUpdate (which also auto-fulfils). Returns the ids that failed,
  // with their error messages, so callers can both alert immediately (as
  // before) and leave a persistent warning on the row.
  const pushToLinkedSales = async (merged, changes, verb) => {
    const linkedSale = allSales.find(s => s.id === merged.saleId);
    const groupKey = linkedSale ? despatchKeyOf(linkedSale) : merged.saleId;
    const members = groupMembers[groupKey];
    const saleIds = members && members.length ? members.map(m => m.id) : [merged.saleId];
    const failures = [];
    for (const id of saleIds) {
      try {
        const result = await onSaleUpdate(id, changes);
        if (result && result.error) failures.push({ id, message: result.error });
      } catch (err) {
        console.error(`onSaleUpdate (${verb}) failed for`, id, err);
        failures.push({ id, message: err?.message || String(err) });
      }
    }
    return failures;
  };

  const saveEntry = async (uuid, patch) => {
    const current = entries.find(e => e.uuid === uuid);
    if (!current) return;
    const merged = { ...current, ...patch };
    updateEntry(uuid, patch);
    const res = await persist(uuid, merged);
    if (res?.error) { showAlert("Could not save change: " + res.error); return; }
    // Once both tracking number and shipper are on the row — the same
    // point that unlocks the "Send Notification" button — push it back
    // to the linked sale (tracking + carrier) and mark that sale Fulfilled.
    // A despatch row can stand in for an entire linked GROUP of transactions
    // (Advance + Part + Final, or manually linked) collapsed into one
    // parcel — see despatchKeyOf/groupMembers above; the row only stores
    // the id of the group's "anchor" sale. Tracking has to reach every
    // transaction in that group, not just the anchor, otherwise the other
    // linked transactions stay stuck showing "Awaiting Tracking" on the
    // Sales tab even though the parcel has actually shipped.
    const touchedTrackingOrShipper = ("trackingNo" in patch) || ("shipper" in patch);
    if (touchedTrackingOrShipper && merged.saleId && merged.trackingNo && merged.shipper && onSaleUpdate) {
      // Awaited (was previously fire-and-forget) so a failure here is
      // never silent — if the linked sale can't be marked Fulfilled, the
      // despatch row still shows tracking saved, but the Sales tab would
      // otherwise be left stuck on the old status with no sign anything
      // went wrong.
      const failures = await pushToLinkedSales(merged, { trackingNo: merged.trackingNo, carrier: merged.shipper }, "tracking");
      if (failures.length) {
        const msg = `Couldn't update the linked sale (${failures.map(f=>f.id).join(", ")}) to Fulfilled: ${failures[0].message}`;
        showAlert(`Tracking saved here, but ${msg}\n\nPlease flip its status manually on the Sales tab.`);
        await setLinkWarning(uuid, msg);
      } else {
        await setLinkWarning(uuid, "");
      }
    }
    // Delivery confirmation — once a row is marked (or unmarked) delivered,
    // push the delivery date back to the linked sale(s) too, using the same
    // group-aware fan-out as tracking above, so it shows up wherever the
    // Sales tab already reads deliveryDate from. Kept separate from the
    // Fulfilled push above since this can happen well after tracking was
    // first saved.
    if ("delivered" in patch && merged.saleId && onSaleUpdate) {
      const failures = await pushToLinkedSales(merged, { deliveryDate: merged.delivered ? (merged.deliveredDate || todayISO()) : "" }, "delivery");
      if (failures.length) {
        const msg = `Couldn't update the linked sale (${failures.map(f=>f.id).join(", ")}) with delivery status: ${failures[0].message}`;
        showAlert(`Delivery status saved here, but ${msg}`);
        await setLinkWarning(uuid, msg);
      } else {
        await setLinkWarning(uuid, "");
      }
    }
  };

  // Retries whatever the row's current tracking/shipper (or delivered)
  // state implies, so a warning can be cleared without re-typing anything.
  const retryLinkPush = (entry) => {
    if (entry.trackingNo && entry.shipper) saveEntry(entry.uuid, { trackingNo: entry.trackingNo, shipper: entry.shipper });
    else if (entry.delivered) saveEntry(entry.uuid, { delivered: entry.delivered });
  };

  // Manually links two transactions together (mirrors SalesPanel's own
  // handleManualLink exactly, so a link made from either tab behaves the
  // same way), merging their existing manual-link groups if either already
  // has one. Goes through onSaleFieldEdit — a plain field save — rather
  // than onSaleUpdate, which would also force the sale to FULFILLED as a
  // side effect; linking two sales together should never itself change
  // either one's status.
  const handleManualLink = async (saleA, saleB) => {
    if (!onSaleFieldEdit || !saleA || !saleB || saleA.id === saleB.id) return;
    const groupA = saleA.manualLinkGroup;
    const groupB = saleB.manualLinkGroup;
    if (groupA && groupB && groupA === groupB) return; // already linked together
    const targetGroup = groupA || groupB || `link_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const updates = [];
    if (saleA.manualLinkGroup !== targetGroup) updates.push(onSaleFieldEdit(saleA.id, { manualLinkGroup: targetGroup }));
    if (saleB.manualLinkGroup !== targetGroup) updates.push(onSaleFieldEdit(saleB.id, { manualLinkGroup: targetGroup }));
    if (groupB && groupB !== targetGroup) {
      allSales.filter(s => s.manualLinkGroup === groupB && s.id !== saleB.id)
        .forEach(s => updates.push(onSaleFieldEdit(s.id, { manualLinkGroup: targetGroup })));
    }
    if (groupA && groupA !== targetGroup) {
      allSales.filter(s => s.manualLinkGroup === groupA && s.id !== saleA.id)
        .forEach(s => updates.push(onSaleFieldEdit(s.id, { manualLinkGroup: targetGroup })));
    }
    await Promise.all(updates);
  };

  // "Mark Delivered" — defaults to today, editable afterwards by clicking
  // the green date badge (see the Delivery column below). Undo clears both
  // the flag and the date, including on the linked sale, in case it was
  // marked by mistake.
  const markDelivered = (entry, date) => {
    saveEntry(entry.uuid, { delivered: true, deliveredDate: date || todayISO() });
    setOpenDeliveryUuid(null);
  };
  const undoDelivered = (entry) => {
    saveEntry(entry.uuid, { delivered: false, deliveredDate: "" });
  };

  // Copies just the tracking number to the clipboard — the 📋 button next
  // to the tracking input, for pasting into a carrier's site, a WhatsApp
  // message, wherever, without having to select the input text by hand.
  // Flips to a ✓ for a moment as feedback, then reverts on its own.
  const copyTrackingNo = async (uuid, trackingNo) => {
    if (!trackingNo) return;
    try { await navigator.clipboard.writeText(trackingNo); } catch { /* clipboard blocked — button just won't flip to ✓ */ }
    setCopiedTrackingUuid(uuid);
    setTimeout(() => setCopiedTrackingUuid(prev => (prev === uuid ? null : prev)), 1200);
  };

  // Address is entered/edited on the Sales page — this popup is just a
  // more comfortable way to fill that in from the Despatch Log, so it
  // writes straight back to the linked sale (never to the despatch entry
  // itself), same as liveAddressFor/livePhoneFor already read it. Mirrors
  // the group-member loop saveEntry already uses for tracking/shipper, so
  // one parcel covering several linked transactions (Advance + Final)
  // gets the same address on all of them, not just the anchor sale.
  const saveAddressForRow = async (entry, formatted) => {
    if (!entry?.saleId || !onSaleUpdate) { showAlert("This row isn't linked to a sale, so there's nowhere to save the address."); return; }
    setSavingAddress(true);
    const linkedSale = allSales.find(s => s.id === entry.saleId);
    if (!linkedSale) { setSavingAddress(false); showAlert("Couldn't find the linked sale for this row — the address wasn't saved."); return; }
    const groupKey = despatchKeyOf(linkedSale);
    const members = groupMembers[groupKey];
    const saleIds = members && members.length ? members.map(m => m.id) : [entry.saleId];
    let hadError = false;
    for (const id of saleIds) {
      try {
        const result = await onSaleUpdate(id, { address: formatted });
        if (result && result.error) { hadError = true; showAlert(`Couldn't save the address for sale ${id}:\n\n${result.error}`); }
      } catch (err) {
        hadError = true;
        showAlert(`Couldn't save the address for sale ${id} — ${err?.message || err}`);
      }
    }
    setSavingAddress(false);
    if (!hadError) setAddressModalUuid(null);
  };

  const removeEntry = async (uuid) => {
    if (!isAdmin) return; // guarded here too, not just in the UI
    if (!(await showConfirm("Remove this row from the despatch log? This cannot be undone."))) return;
    const removed = entries.find(e => e.uuid === uuid);
    setEntries(prev => prev.filter(e => e.uuid !== uuid));
    await dbDeleteDispatchEntry(uuid, shopId);
    // Stop auto-add from immediately recreating this row — the linked
    // sale (or, if it's part of a linked group, ANY sale in that group)
    // is likely still flagged "Ready to Ship" in Sales.
    if (removed?.saleId) {
      const linkedSale = allSales.find(x => x.id === removed.saleId);
      const key = linkedSale ? despatchKeyOf(linkedSale) : removed.saleId;
      setDismissedSaleIds(prev => {
        const next = { ...prev, [key]: true };
        saveDismissed(shopId, next);
        return next;
      });
    }
  };

  const notify = (entry) => {
    const phone = livePhoneFor(entry).replace(/[^0-9]/g, "");
    if (!phone) { showAlert("No phone number on this row."); return; }
    const message = buildDispatchTrackingMsg(entry, shop);
    setWaModal({
      phone, customerName: entry.customer, message,
      onSent: () => saveEntry(entry.uuid, { notified: true }),
    });
  };

  // Dates covered by the exports below: every date that actually appears
  // in whatever's currently on screen (the last 30 days, one picked month,
  // "All dates", or one picked day chip), chronological. Exports stay
  // grouped by day internally for a readable paper/WhatsApp record even
  // though the on-screen table no longer is.
  const exportDates = Array.from(new Set(exportEntries.map(e => e.dispatchDate).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const exportRangeLabel = isIndiaShop
    ? (dayFilter !== "all" ? ddmmyyyy(dayFilter) : (monthFilter === "recent30" ? "Last 30 Days" : monthLabel(monthFilter)))
        + (courierFilter !== "ALL" ? ` · ${courierLabel(courierFilter)}` : "")
        + (statusFilter !== "ALL" ? ` · ${statusFilter === "transit" ? "In transit" : statusFilter === "delivered" ? "Delivered" : "Awaiting tracking"}` : "")
    : (dateFilter === "all"
        ? (exportDates.length ? `${ddmmyyyy(exportDates[0])} – ${ddmmyyyy(exportDates[exportDates.length - 1])}` : "No despatches yet")
        : ddmmyyyy(dateFilter));

  const copyWeekList = async () => {
    const lines = [`Despatch — ${exportRangeLabel}`, ""];
    exportDates.forEach(d => {
      const dayList = exportEntries.filter(x => x.dispatchDate === d);
      lines.push(`${ddmmyyyy(d)} (${dayList.length})`);
      dayList.forEach((e, i) => lines.push(
        `  ${i + 1}. ${e.customer || "—"} — ${livePhoneFor(e) || "—"} — ${e.trackingNo || "no tracking yet"} (${e.shipper || "no shipper"})${e.delivered ? ` ✅ delivered ${ddmmyyyy(e.deliveredDate || "")}` : ""}`
      ));
      lines.push("");
    });
    const text = lines.join("\n").trim();
    try { await navigator.clipboard.writeText(text); showAlert("Despatch list copied."); }
    catch { showAlert(text); }
  };

  /* Bulk WhatsApp — bundles the currently selected date range into one
     message, grouped by day, with no fixed recipient — for pinging an
     internal despatch group chat. Mirrors the old Dispatch Sheet's "Send
     via WhatsApp" button in SalesPanel.jsx. */
  const sendBulkWhatsApp = () => {
    const lines = [`🚚 *Despatch Log* — ${exportRangeLabel}`, `${exportEntries.length} item${exportEntries.length !== 1 ? "s" : ""}`, ""];
    exportDates.forEach(d => {
      const dayList = exportEntries.filter(x => x.dispatchDate === d);
      lines.push(`*${ddmmyyyy(d)}*`);
      dayList.forEach((e, i) => {
        lines.push(`${i + 1}. ${e.customer || "—"}`);
        lines.push(liveAddressFor(e) || "No address on file");
        lines.push(`Phone: ${livePhoneFor(e) || "—"}`);
        lines.push(`Tracking: ${e.trackingNo || "—"} (${e.shipper || "no shipper"})`);
        if (e.delivered) lines.push(`✅ Delivered: ${ddmmyyyy(e.deliveredDate || "")}`);
        if (e.remarks) lines.push(`Remarks: ${e.remarks}`);
        lines.push("");
      });
    });
    setWaModal({ phone: "", customerName: "", message: lines.join("\n").trim() });
  };

  /* Print — clean tabular printout of the currently selected date range,
     one table per day that actually has despatches. Mirrors the old
     Dispatch Sheet's "Print / Export" button in SalesPanel.jsx, extended
     with this page's extra columns. */
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const sections = exportDates.map(d => {
      const dayList = exportEntries.filter(x => x.dispatchDate === d);
      const rows = dayList.map((e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${(e.customer || "—").toUpperCase()}</td>
          <td style="white-space:pre-line">${liveAddressFor(e) || "—"}</td>
          <td>${livePhoneFor(e) || "—"}</td>
          <td>${e.trackingNo || "—"}</td>
          <td>${e.shipper || "—"}</td>
          <td>${e.delivered ? ("✅ " + ddmmyyyy(e.deliveredDate || "")) : "—"}</td>
          <td>${e.remarks || "—"}</td>
        </tr>`).join("");
      return `
        <h2>${weekdayName(d)}, ${ddmmyyyy(d)} — ${dayList.length} item${dayList.length !== 1 ? "s" : ""}</h2>
        <table><thead><tr><th>#</th><th>Customer</th><th>Address</th><th>Phone</th><th>Tracking No.</th><th>Shipper</th><th>Delivered</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join("") || `<p style="color:#94a3b8;font-size:12px;">No despatches recorded.</p>`;
    w.document.write(`<!DOCTYPE html><html><head><title>Despatch Log — ${exportRangeLabel}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0f172a;}
        h1{font-size:18px;margin-bottom:4px;} p{color:#64748b;font-size:12px;margin-top:0;}
        h2{font-size:13px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:0.04em;color:#475569;}
        table{width:100%;border-collapse:collapse;} th,td{border:1px solid #e2e8f0;padding:8px 10px;font-size:12px;text-align:left;vertical-align:top;}
        th{background:#f8fafc;text-transform:uppercase;letter-spacing:0.04em;font-size:10px;}
      </style></head><body>
      <h1>🚚 Despatch Log</h1>
      <p>${exportRangeLabel} · ${exportEntries.length} item${exportEntries.length !== 1 ? "s" : ""}</p>
      ${sections}
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const shiftMonth = (offset) => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const atCurrentMonthOrLater = calMonth >= currentMonthKey();

  const jumpToDay = (iso) => {
    setViewMode("log");
    if (isIndiaShop) {
      // ROS India's Log is month-scoped: open that day's month, then narrow to the day.
      setMonthFilter(iso.slice(0, 7));
      setCourierFilter("ALL"); setStatusFilter("ALL"); setListSearch("");
      setDayFilter(iso);
    } else {
      setDateFilter(iso);
    }
  };


  // One ROS India table row. All behaviour (saveEntry, notify, markDelivered,
  // address popup, remarks, remove…) is the same handlers the old table used.
  // Opens the native calendar pop-up for a row; the hidden date input's
  // onChange then records the delivery date the user picked.
  const openDatePicker = (uuid) => {
    const el = datePickRefs.current[uuid];
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); try { el.click(); } catch { /* picker unsupported — nothing else to do */ } }
  };

  const renderIndiaRow = (e) => {
    const dupKey = (e.trackingNo || "").replace(/\s+/g, "").toUpperCase();
    const isDup = dupKey && (trackingIndex[dupKey] || []).length > 1;
    const canNotify = !!(e.trackingNo && e.shipper);
    const shipperColor = shipperColorFor(e.shipper);
    const linkedSaleForRow = allSales.find(s => s.id === e.saleId);
    const rowGroupKey = linkedSaleForRow ? despatchKeyOf(linkedSaleForRow) : (e.saleId || e.uuid);
    const rowGroupCount = (groupMembers[rowGroupKey] || []).length;
    const isSameCustomerDup = dupCustomerGroupKeys.has(rowGroupKey);
    const collisionOthers = linkedSaleForRow ? phoneCollisionFor(linkedSaleForRow) : null;
    const fullAddress = liveAddressFor(e);
    const addrOneLine = fullAddress.replace(/\s*\n\s*/g, ", ");
    const addressHasMore = addrOneLine.length > 85;
    const isAddressExpanded = !!expandedAddresses[e.uuid];
    const phone = livePhoneFor(e);
    const isRowToday = e.dispatchDate === todayISO();
    const trackUrl = canNotify ? staffTrackingURL(e.shipper, e.trackingNo) : null;
    return (
      <tr key={e.uuid} className={"dx-r" + (e.delivered ? " deliv" : "")}>
        {/* Date */}
        <td style={{ width: 58 }}>
          <div className={"dx-date" + (isRowToday ? " today" : "")}>{shortDate(e.dispatchDate)}
            <small>{weekdayShort(e.dispatchDate)}{isRowToday ? " · Today" : ""}</small>
          </div>
        </td>
        {/* Customer + phone (+ link / duplicate warnings, unchanged logic) */}
        <td style={{ width: 136, minWidth: 120 }}>
          <div className="dx-cust">{titleCase(e.customer) || "—"}</div>
          <div className="dx-phone mono"><IcoPhone />{phone || "—"}</div>
          {rowGroupCount > 1 && (
            <span className="dx-badge" title="This row covers several linked sale transactions (e.g. Advance + Final) for one parcel — entering tracking here fulfils all of them."
              style={{ color: "#4338ca", background: "#e0e7ff" }}>🔗 {rowGroupCount} linked</span>
          )}
          {isSameCustomerDup && (
            <div><span className="dx-badge" title="Another despatch row exists for this same customer/phone but isn't linked to this one — check whether this is really a separate order."
              style={{ color: "#b45309", background: "#fef3c7" }}>⚠ check duplicate</span></div>
          )}
          {collisionOthers && (
            <div title={`Same phone number also appears under "${collisionOthers[0].customer}" in Sales — if that's the same person, link them so tracking reaches both.`}
              style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <span className="dx-badge" style={{ color: "#9a3412", background: "#ffedd5", marginTop: 0 }}>⚠ same phone as "{collisionOthers[0].customer}"</span>
              <button
                onClick={async () => {
                  if (!(await showConfirm(`Link "${linkedSaleForRow.customer}" and "${collisionOthers[0].customer}" as the same customer?\n\nTracking entered on either one will then update both.`))) return;
                  for (const other of collisionOthers) await handleManualLink(linkedSaleForRow, other);
                }}
                className="dx-badge" style={{ color: "#4338ca", background: "#e0e7ff", border: "none", cursor: "pointer", marginTop: 0 }}>
                🔗 Link orders
              </button>
            </div>
          )}
          {e.linkWarning && (
            <div title={e.linkWarning} style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <span className="dx-badge" style={{ color: "#991b1b", background: "#fee2e2", marginTop: 0 }}>⚠ Sales not updated</span>
              <button onClick={() => retryLinkPush(e)} className="dx-badge" style={{ color: "#4338ca", background: "#e0e7ff", border: "none", cursor: "pointer", marginTop: 0 }}>↻ Retry</button>
              <button onClick={() => setLinkWarning(e.uuid, "")} title="Dismiss without retrying" className="dx-badge" style={{ color: "#64748b", background: "#f1f5f9", border: "none", cursor: "pointer", marginTop: 0 }}>✕</button>
            </div>
          )}
        </td>
        {/* Address (always the live Sales address; ✏️ edits it there) + remarks */}
        <td style={{ minWidth: 150 }}>
          <div className="dx-addr">
            <div style={{ flex: 1, minWidth: 0 }}>
              {fullAddress ? (
                <>
                  <div className={"dx-addr-t" + (addressHasMore ? " more" : "") + (isAddressExpanded ? " open" : "")}
                    onClick={() => addressHasMore && setExpandedAddresses(p => ({ ...p, [e.uuid]: !p[e.uuid] }))}
                    title={addressHasMore ? (isAddressExpanded ? "Click to collapse" : "Click to see full address") : undefined}>
                    {isAddressExpanded ? fullAddress : addrOneLine}
                  </div>
                  {addressHasMore && (
                    <div className="dx-more" onClick={() => setExpandedAddresses(p => ({ ...p, [e.uuid]: !p[e.uuid] }))}>{isAddressExpanded ? "▲ less" : "▼ more"}</div>
                  )}
                </>
              ) : (
                <div className="dx-addr-t empty" onClick={() => e.saleId && setAddressModalUuid(e.uuid)}>No address yet — tap to add one</div>
              )}
              {openRemarksUuid === e.uuid ? (
                <input autoFocus className="dx-remark-in" value={e.remarks} placeholder="Remarks"
                  onChange={ev => updateEntry(e.uuid, { remarks: ev.target.value })}
                  onBlur={ev => { saveEntry(e.uuid, { remarks: ev.target.value }); setOpenRemarksUuid(null); }}
                  onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); }} />
              ) : e.remarks ? (
                <div className="dx-remark" title="Click to edit remarks" style={{ cursor: "pointer" }} onClick={() => setOpenRemarksUuid(e.uuid)}>📝 {e.remarks}</div>
              ) : null}
            </div>
            {e.saleId && (
              <button className="dx-iconbtn" onClick={() => setAddressModalUuid(e.uuid)} title="Edit address"><IcoEdit /></button>
            )}
          </div>
        </td>
        {/* Shipper */}
        <td style={{ width: 96 }}>
          <select className="dx-ship" value={e.shipper}
            onChange={ev => saveEntry(e.uuid, { shipper: ev.target.value })}
            style={{ color: e.shipper ? shipperColor.color : "#94a3b8", backgroundColor: e.shipper ? shipperColor.bg : "#f8fafc", borderColor: e.shipper ? "transparent" : "#e2e8f0" }}>
            <option value="">Select…</option>
            {SHIPPERS.map(s => <option key={s} value={s}>{shipperLabel(s)}</option>)}
          </select>
        </td>
        {/* Tracking number (editable) + copy */}
        <td style={{ width: 172, minWidth: 158 }}>
          <div className="dx-trk-wrap">
            <input className={"dx-trk mono" + (isDup ? " dup" : "")} value={e.trackingNo} placeholder="Tracking no."
              onChange={ev => updateEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })}
              onBlur={ev => saveEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })} />
            {e.trackingNo && (
              <button className={"dx-iconbtn" + (copiedTrackingUuid === e.uuid ? " ok" : "")} onClick={() => copyTrackingNo(e.uuid, e.trackingNo)} title="Copy tracking number">
                {copiedTrackingUuid === e.uuid ? <IcoCheck /> : <IcoCopy />}
              </button>
            )}
          </div>
          {isDup && <div className="dx-warn">⚠ used on another row</div>}
        </td>
        {/* Track */}
        <td style={{ width: 72 }}>
          {!canNotify ? <span className="dx-muted">—</span> : trackUrl ? (
            <button className="dx-track" onClick={() => trackClick(e, trackUrl)}
              title={MANUAL_ENTRY_SHIPPERS.has((e.shipper || "").toUpperCase()) ? "Opens the tracking page and copies the tracking number so you can paste it in" : "Opens this parcel's tracking page directly"}>
              Track <IcoExt />
            </button>
          ) : <span className="dx-hint">Check {shipperLabel(e.shipper)} directly</span>}
        </td>
        {/* Delivery — "Mark Delivered" opens the browser's calendar pop-up;
            picking a date marks the parcel delivered on that date. The
            delivered badge re-opens the same pop-up to correct the date. */}
        <td style={{ width: 168 }}>
          {!canNotify ? <span className="dx-muted">—</span> : (
            <span className="dx-pickwrap">
              {e.delivered ? (
                <span className="dx-dl">
                  <button className="dx-deliv" onClick={() => openDatePicker(e.uuid)} title="Click to correct the delivery date">
                    <IcoCheck /> Delivered <span className="mono">{shortDateMaybeY(e.deliveredDate || todayISO())}</span>
                  </button>
                  <button className="dx-link" onClick={() => undoDelivered(e)} title="Undo — not actually delivered">Undo</button>
                </span>
              ) : (
                <button className="dx-mark" onClick={() => openDatePicker(e.uuid)} title="Pick the date this parcel was delivered">
                  <IcoCheck /> Mark Delivered
                </button>
              )}
              <input type="date" className="dx-pickhid" tabIndex={-1} aria-hidden="true"
                ref={el => { datePickRefs.current[e.uuid] = el; }}
                value={e.deliveredDate || ""} max={todayISO()}
                onChange={ev => { if (ev.target.value) markDelivered(e, ev.target.value); }} />
            </span>
          )}
        </td>
        {/* Inform customer (WhatsApp) */}
        <td style={{ width: 112 }}>
          <button className={"dx-inform " + (!canNotify ? "off" : e.notified ? "done" : "send")}
            onClick={() => canNotify && notify(e)} disabled={!canNotify}
            title={canNotify ? (e.notified ? "Notified — click to resend" : "Send tracking to customer") : "Add tracking number + shipper first"}>
            {e.notified ? <><IcoCheck /> Informed</> : <><IcoWA /> Send Details</>}
          </button>
        </td>
        {/* Remarks + admin remove */}
        <td style={{ width: 54 }}>
          <div className="dx-actions">
            <button className={"dx-iconbtn note" + (e.remarks ? " on" : "")} onClick={() => setOpenRemarksUuid(e.uuid)}
              title={e.remarks ? `Remarks: ${e.remarks}` : "Add remarks"}><IcoNote /></button>
            {isAdmin && <button className="dx-del" onClick={() => removeEntry(e.uuid)} title="Remove row">✕</button>}
          </div>
        </td>
      </tr>
    );
  };

  // "Add a despatch" search box — same search-to-add behaviour as before,
  // just defined once so both the classic and the ROS India layout use it.
  const renderAddBox = () => (
      <div style={{ marginBottom: 22, display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 260, position: "relative" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search customer name or phone to add to the despatch log…"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" }}
          />
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 30px rgba(15,23,42,0.12)", zIndex: 50, maxHeight: 320, overflowY: "auto" }}>
              {searchResults.map(s => (
                <div key={s.id} onClick={() => addFromSale(s)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>{s.customer || "—"}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>{s.phone || s.contact || "No phone"} · <span style={{ textTransform: "uppercase" }}>{s.item || "—"}</span></div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", gap: 6 }}>
                    {s.readyToShip && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#166534", background: "#dcfce7", borderRadius: 999, padding: "2px 8px" }}>Ready</span>
                    )}
                    {loggedSaleIds[s.id] && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 999, padding: "2px 8px" }}>
                        already on log ×{loggedSaleIds[s.id]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b", fontWeight: 700, flexShrink: 0 }}>
          Add to
          <input type="date" value={addDate} max={todayISO()} onChange={e => setAddDate(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit" }} />
        </label>
      </div>
  );

  return (
    <div className={isIndiaShop ? "dx" : undefined}
      style={{
        padding: "20px 22px", maxWidth: isIndiaShop ? 1560 : 1180, margin: "0 auto",
        ...(isIndiaShop ? {
          "--ac": shop?.accent || "#e95597", "--ac2": "#c73d80", "--acsh": "rgba(233,85,151,0.33)",
          "--acbg": shop?.accentBg || "#fef0f7", "--acbg2": "#fdf5f9", "--acline": "#fbe3ee", "--actext": shop?.accentText || "#7d1047",
        } : {}),
      }}>
      {waModal && <WaModal data={waModal} onClose={() => { waModal.onSent && waModal.onSent(); setWaModal(null); }} />}
      {addressModalUuid && (() => {
        const rowForAddress = entries.find(x => x.uuid === addressModalUuid);
        if (!rowForAddress) return null;
        return (
          <AddressEntryModal
            initialValue={liveAddressFor(rowForAddress)}
            onClose={() => !savingAddress && setAddressModalUuid(null)}
            onSave={(formatted) => saveAddressForRow(rowForAddress, formatted)}
          />
        );
      })()}

      {isIndiaShop && (
        <>
          <style>{INDIA_CSS}</style>
          {/* ── Header ── */}
          <div className="dx-top">
            <div>
              <h1 className="dx-h1"><span className="dx-h1-ic"><IcoTruck /></span>Despatch Log</h1>
              <p className="dx-sub">
                {viewMode === "log"
                  ? "Every parcel sent out — track it, mark it delivered, and keep the customer informed."
                  : "Calendar & monthly trend"}
              </p>
            </div>
            <div className="dx-acts-top">
              <div className="dx-seg">
                <button className={viewMode === "log" ? "on" : ""} onClick={() => setViewMode("log")}>📋 Log</button>
                <button className={viewMode === "calendar" ? "on" : ""} onClick={() => setViewMode("calendar")}>📅 Calendar</button>
              </div>
              {viewMode === "log" && (
                <>
                  <button className="dx-btn" onClick={handlePrint} disabled={!exportEntries.length}>🖨️ Print / Export</button>
                  <button className="dx-btn" onClick={copyWeekList} disabled={!exportEntries.length}>📋 Copy List</button>
                  <button className="dx-btn wa" onClick={sendBulkWhatsApp} disabled={!exportEntries.length}
                    title="Send the shown despatches as one message, grouped by day — no fixed recipient, for your despatch team chat">
                    <IcoWA /> Send Sheet via WhatsApp
                  </button>
                  <button className="dx-btn pri" onClick={() => setShowAdd(v => !v)}><IcoPlus /> {showAdd ? "Close" : "Add Despatch"}</button>
                </>
              )}
            </div>
          </div>

          {viewMode === "log" && (
            <>
              {/* ── Summary cards ── */}
              <div className="dx-kpis">
                <div className="dx-kpi" style={{ "--c": "var(--ac)" }}>
                  <div className="l">Despatched · {ixMonthTitle}</div>
                  <div className="v">{ixKpi.total}</div>
                  <div className="s">Today {ixKpi.todayN} · Yesterday {ixKpi.ydayN}</div>
                </div>
                <div className="dx-kpi" style={{ "--c": "#f59e0b" }}>
                  <div className="l">In Transit</div>
                  <div className="v" style={{ color: "#b45309" }}>{ixKpi.transit}</div>
                  <div className="s">{ixKpi.transit ? `oldest on the road: ${ixKpi.oldest} day${ixKpi.oldest === 1 ? "" : "s"}` : "nothing on the road"}{ixKpi.noTrack ? ` · ${ixKpi.noTrack} awaiting tracking` : ""}</div>
                </div>
                <div className="dx-kpi" style={{ "--c": "#22c55e" }}>
                  <div className="l">Delivered</div>
                  <div className="v" style={{ color: "#15803d" }}>{ixKpi.delivered}</div>
                  <div className="s">{ixKpi.total ? `${Math.round((ixKpi.delivered / ixKpi.total) * 100)}% of ${ixMonthTitle.toLowerCase()}` : "—"}</div>
                </div>
                <div className="dx-kpi" style={{ "--c": "#3b82f6" }}>
                  <div className="l">Avg. Delivery Time</div>
                  <div className="v" style={{ color: "#1d4ed8" }}>{ixKpi.avg === null ? "—" : <>{ixKpi.avg.toFixed(1)} <small>days</small></>}</div>
                  <div className="s">{ixKpi.perCourier.length ? ixKpi.perCourier.join(" · ") : "once parcels are marked delivered"}</div>
                </div>
              </div>

              {/* ── Filters ── */}
              <div className="dx-card dx-filters">
                <div className="dx-frow">
                  <div className="dx-flabel">Month</div>
                  <div className="dx-chips">
                    <button className={"dx-chip" + (monthFilter === "recent30" ? " on" : "")} onClick={() => { setMonthFilter("recent30"); setDayFilter("all"); }}>
                      Last 30 Days <b>{last30EntriesIndia.length}</b>
                    </button>
                    {monthTagsIndia.map(mk => (
                      <button key={mk} className={"dx-chip" + (monthFilter === mk ? " on" : "")} onClick={() => { setMonthFilter(mk); setDayFilter("all"); }}>
                        {monthLabel(mk)} <b>{entriesByMonthIndia[mk].length}</b>
                      </button>
                    ))}
                  </div>
                  <label className="dx-search">
                    <IcoSearch />
                    <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search name, phone or tracking no." />
                  </label>
                </div>
                <div className="dx-frow">
                  <div className="dx-flabel">Date</div>
                  <div className="dx-days">
                    <div className={"dx-day-cell" + (dayFilter === "all" ? " on" : "")} onClick={() => setDayFilter("all")}>
                      <div className="d">All</div><div className="n">{ixScope.length}</div>
                      <div className="bar"><i style={{ width: "100%" }} /></div>
                    </div>
                    {ixDayList.map(d => {
                      const n = ixDayCounts[d] || 0;
                      return (
                        <div key={d} className={"dx-day-cell" + (dayFilter === d ? " on" : "") + (n === 0 && dayFilter !== d ? " z" : "")}
                          title={`${weekdayName(d)}, ${shortDateY(d)} — ${n} despatched`}
                          onClick={() => { if (n > 0 || dayFilter === d) setDayFilter(dayFilter === d ? "all" : d); }}>
                          <div className="d">{weekdayShort(d)} {Number(d.slice(8))}</div>
                          <div className="n">{n}</div>
                          <div className="bar"><i style={{ width: `${Math.round((n / ixDayMax) * 100)}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dx-divider" />
                <div className="dx-frow">
                  <div className="dx-flabel">Courier</div>
                  <div className="dx-chips" style={{ flex: "0 1 auto" }}>
                    <button className={"dx-chip" + (courierFilter === "ALL" ? " on" : "")} onClick={() => setCourierFilter("ALL")}>All <b>{ixStatusTotal}</b></button>
                    {ixCourierKeys.map(k => (
                      <button key={k} className={"dx-chip" + (courierFilter === k ? " on" : "")} onClick={() => setCourierFilter(courierFilter === k ? "ALL" : k)}>
                        {courierLabel(k)} <b>{ixCourierCounts[k] || 0}</b>
                      </button>
                    ))}
                  </div>
                  <div className="dx-flabel" style={{ width: "auto", marginLeft: 18 }}>Status</div>
                  <div className="dx-segf">
                    <button className={statusFilter === "ALL" ? "on n" : ""} onClick={() => setStatusFilter("ALL")}>All · {ixStatusTotal}</button>
                    <button className={statusFilter === "transit" ? "on t" : ""} onClick={() => setStatusFilter(statusFilter === "transit" ? "ALL" : "transit")}>🚚 In Transit · {ixStatusCounts.transit}</button>
                    <button className={statusFilter === "delivered" ? "on d" : ""} onClick={() => setStatusFilter(statusFilter === "delivered" ? "ALL" : "delivered")}>✅ Delivered · {ixStatusCounts.delivered}</button>
                    <button className={statusFilter === "notrack" ? "on n" : ""} onClick={() => setStatusFilter(statusFilter === "notrack" ? "ALL" : "notrack")}>Awaiting tracking · {ixStatusCounts.notrack}</button>
                  </div>
                  <div className="dx-count">
                    {ixKpi.notNotified > 0 && <span>💬 {ixKpi.notNotified} not yet informed</span>}
                    <span>Showing <b>{shownEntries.length}</b> of {filteredEntries.length}</span>
                    {ixFiltersActive && <button className="dx-clear" onClick={ixClearFilters}>Clear filters</button>}
                  </div>
                </div>
              </div>

              {showAdd && (
                <div className="dx-card dx-addbox">
                  <div className="ttl">Add a despatch — search a sale by customer name or phone</div>
                  {renderAddBox()}
                </div>
              )}

              {/* ── Table ── */}
              <div className="dx-card">
                {loading ? (
                  <div className="dx-empty">Loading…</div>
                ) : shownEntries.length === 0 ? (
                  <div className="dx-empty">
                    {filteredEntries.length === 0
                      ? (monthFilter === "recent30" ? "Nothing despatched in the last 30 days." : `Nothing despatched in ${monthLabel(monthFilter)}.`)
                      : "No despatches match these filters."}
                    {ixFiltersActive && filteredEntries.length > 0 && (<div style={{ marginTop: 8 }}><button className="dx-clear" onClick={ixClearFilters}>Clear filters</button></div>)}
                  </div>
                ) : (
                  <>
                  {/* Always-visible left/right slider (sticks to the top while the page scrolls); mirrors the table's own horizontal scroll. */}
                  <div className="dx-topscroll" ref={tableTopRef}
                    onScroll={ev => { if (tableBodyRef.current && tableBodyRef.current.scrollLeft !== ev.target.scrollLeft) tableBodyRef.current.scrollLeft = ev.target.scrollLeft; }}>
                    <div style={{ width: tableScrollW, height: 1 }} />
                  </div>
                  <div className="dx-tablewrap" ref={tableBodyRef}
                    onScroll={ev => { if (tableTopRef.current && tableTopRef.current.scrollLeft !== ev.target.scrollLeft) tableTopRef.current.scrollLeft = ev.target.scrollLeft; }}>
                    <table className="dx-table">
                      <thead>
                        <tr>
                          {["Date", "Customer", "Address", "Shipper", "Tracking No.", "Track", "Delivery", "Inform Customer", ""].map((h, i) => <th key={i}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {ixGroups.map(g => {
                          const nTransit = g.rows.filter(r => rowTrackState(r) === "transit").length;
                          const nDeliv = g.rows.filter(r => r.delivered).length;
                          const nNo = g.rows.filter(r => rowTrackState(r) === "notrack").length;
                          return (
                            <Fragment key={g.date}>
                              <tr className="dx-day"><td colSpan={9}>
                                <div className="dx-day-in">
                                  <span className="dx-day-title">📅 {weekdayName(g.date)}, {Number(g.date.slice(8))} {monthLabel(g.date.slice(0, 7))}</span>
                                  <span className="dx-day-c">{g.rows.length} despatched</span>
                                  {nTransit > 0 && <span className="dx-pill amber">{nTransit} in transit</span>}
                                  {nDeliv > 0 && <span className="dx-pill green">{nDeliv} delivered</span>}
                                  {nNo > 0 && <span className="dx-pill grey">{nNo} awaiting tracking</span>}
                                </div>
                              </td></tr>
                              {g.rows.map(renderIndiaRow)}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
                {!loading && shownEntries.length > 0 && (
                  <div className="dx-foot"><span>{shownEntries.length} despatch{shownEntries.length !== 1 ? "es" : ""} · {ixMonthTitle}</span><span>Click an address to expand · tracking numbers are editable in place</span></div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {!isIndiaShop && (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>🚚 Despatch Log</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
            {viewMode === "log"
              ? `${visibleEntries.length} despatch${visibleEntries.length !== 1 ? "es" : ""} logged · one row per parcel${isTwoDayShop ? " · today & yesterday only" : isIndiaShop ? ` · showing ${monthFilter === "recent30" ? "last 30 days" : monthLabel(monthFilter)}` : ""}`
              : "Calendar & monthly trend"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setViewMode("log")}
              style={{ padding: "8px 14px", border: "none", background: viewMode === "log" ? "#0f172a" : "white", color: viewMode === "log" ? "white" : "#475569", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              📋 Log
            </button>
            <button onClick={() => setViewMode("calendar")}
              style={{ padding: "8px 14px", border: "none", background: viewMode === "calendar" ? "#0f172a" : "white", color: viewMode === "calendar" ? "white" : "#475569", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              📅 Calendar
            </button>
          </div>
        </div>
      </div>
      )}

      {viewMode === "log" && !isIndiaShop && (
      <>
      {isIndiaShop ? (
        /* ROS India — month-tag strip: "Last 30 Days" (the default) plus
           one button per month that has despatches, most recent first.
           Clicking a month shows that whole month regardless of the
           30-day window; the log keeps full history here, so this is how
           older despatches stay reachable without one chip per day. */
        <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
          <button onClick={() => setMonthFilter("recent30")}
            style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 999, border: monthFilter === "recent30" ? "1px solid #0f172a" : "1px solid #e2e8f0", background: monthFilter === "recent30" ? "#0f172a" : "white", color: monthFilter === "recent30" ? "white" : "#334155", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            🗓️ Last 30 Days {last30EntriesIndia.length}
          </button>
          {monthTagsIndia.map(mk => (
            <button key={mk} onClick={() => setMonthFilter(mk)}
              style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 999, border: monthFilter === mk ? "1px solid #0f172a" : "1px solid #e2e8f0", background: monthFilter === mk ? "#0f172a" : "white", color: monthFilter === mk ? "white" : "#334155", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {monthLabel(mk)} {entriesByMonthIndia[mk].length}
            </button>
          ))}
        </div>
      ) : (
        /* Date-filter chip strip — "All dates N" plus one chip per day that
            has despatches, each showing its own count. Replaces the old
            week-by-week navigation: everything is one flat, scrollable list,
            and this is how "how many we sent each day" stays visible. */
        <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
          <button onClick={() => setDateFilter("all")}
            style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 999, border: dateFilter === "all" ? "1px solid #0f172a" : "1px solid #e2e8f0", background: dateFilter === "all" ? "#0f172a" : "white", color: dateFilter === "all" ? "white" : "#334155", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            All dates {visibleEntries.length}
          </button>
          {chipDates.map(d => (
            <button key={d} onClick={() => setDateFilter(d)}
              style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 999, border: dateFilter === d ? "1px solid #0f172a" : "1px solid #e2e8f0", background: dateFilter === d ? "#0f172a" : "white", color: dateFilter === d ? "white" : "#334155", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {ddmmyyyy(d)} {(entriesByDateAll[d] || []).length}
            </button>
          ))}
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <SummaryChip label="Despatches shown" value={summary.total} bg="#f1f5f9" color="#334155" />
        <SummaryChip label="Awaiting tracking" value={summary.noTracking} bg={summary.noTracking ? "#fef3c7" : "#f1f5f9"} color={summary.noTracking ? "#92400e" : "#334155"} />
        <SummaryChip label="Not yet notified" value={summary.notNotified} bg={summary.notNotified ? "#fee2e2" : "#f1f5f9"} color={summary.notNotified ? "#991b1b" : "#334155"} />
        <SummaryChip label="Awaiting delivery" value={summary.awaitingDelivery} bg={summary.awaitingDelivery ? "#fef3c7" : "#f1f5f9"} color={summary.awaitingDelivery ? "#92400e" : "#334155"} />
        <SummaryChip label="Delivered" value={summary.delivered} bg={summary.delivered ? "#dcfce7" : "#f1f5f9"} color={summary.delivered ? "#15803d" : "#334155"} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handlePrint} disabled={!filteredEntries.length}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#334155", fontWeight: 700, fontSize: 12.5, cursor: filteredEntries.length ? "pointer" : "not-allowed", opacity: filteredEntries.length ? 1 : 0.5, fontFamily: "inherit" }}>
            🖨️ Print / Export
          </button>
          <button onClick={sendBulkWhatsApp} disabled={!filteredEntries.length}
            title="Send the shown despatches as one message, grouped by day — no fixed recipient, for your despatch team chat"
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: filteredEntries.length ? "#25D366" : "#f1f5f9", color: filteredEntries.length ? "white" : "#94a3b8", fontWeight: 700, fontSize: 12.5, cursor: filteredEntries.length ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            💬 Send Sheet via WhatsApp
          </button>
          <button onClick={copyWeekList} disabled={!filteredEntries.length}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#334155", fontWeight: 700, fontSize: 12.5, cursor: filteredEntries.length ? "pointer" : "not-allowed", opacity: filteredEntries.length ? 1 : 0.5, fontFamily: "inherit" }}>
            📋 Copy List
          </button>
        </div>
      </div>

      {renderAddBox()}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0", borderRadius: 12 }}>Loading…</div>
      ) : filteredEntries.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 12 }}>
          {isIndiaShop
            ? (monthFilter === "recent30" ? "Nothing despatched in the last 30 days." : `Nothing despatched in ${monthLabel(monthFilter)}.`)
            : (dateFilter === "all" ? "No despatches recorded yet." : `Nothing despatched on ${ddmmyyyy(dateFilter)}.`)}
        </div>
      ) : (
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date", "Customer", "Address", "Tracking No.", "Shipper", "Delivery", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 800, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((e, idx) => {
                    const dupKey = (e.trackingNo || "").replace(/\s+/g, "").toUpperCase();
                    const isDup = dupKey && (trackingIndex[dupKey] || []).length > 1;
                    const canNotify = !!(e.trackingNo && e.shipper);
                    const shipperColor = shipperColorFor(e.shipper);
                    const linkedSaleForRow = allSales.find(s => s.id === e.saleId);
                    const rowGroupKey = linkedSaleForRow ? despatchKeyOf(linkedSaleForRow) : (e.saleId || e.uuid);
                    const rowGroupCount = (groupMembers[rowGroupKey] || []).length;
                    const isSameCustomerDup = dupCustomerGroupKeys.has(rowGroupKey);
                    const collisionOthers = linkedSaleForRow ? phoneCollisionFor(linkedSaleForRow) : null;
                    const fullAddress = liveAddressFor(e);
                    // India addresses tend to be typed as several lines (street,
                    // city, pincode...), so a newline was enough to detect "more
                    // than one line". UK addresses are usually one long comma-
                    // separated line instead — same length problem, just no \n to
                    // detect it — so anything past a normal one-line-box length
                    // also counts as "more", not just an explicit line break. This
                    // is what puts the same expand/collapse arrow on every shop.
                    const ONE_LINE_CHARS = 32;
                    const hasNewline = fullAddress.includes("\n");
                    const addressFirstLine = hasNewline ? (fullAddress.split("\n")[0] || "") : fullAddress;
                    const addressHasMore = hasNewline || fullAddress.length > ONE_LINE_CHARS;
                    const isAddressExpanded = !!expandedAddresses[e.uuid];
                    const phone = livePhoneFor(e);
                    const isRowToday = e.dispatchDate === todayISO();
                    return (
                      <tr key={e.uuid} style={{ borderBottom: "1px solid #f1f5f9", background: e.delivered ? "#f0fdf4" : (idx % 2 ? "#fdfbf3" : "white") }}>
                        <td style={{ padding: "8px 12px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 800, color: isRowToday ? (shop?.accentText || "#4338ca") : "#334155", fontSize: 12.5 }}>{ddmmyyyy(e.dispatchDate)}</div>
                          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{weekdayName(e.dispatchDate)}{isRowToday ? " · Today" : ""}</div>
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 130, maxWidth: 170, verticalAlign: "top" }}>
                          {/* Phone lives on the Sales page only — shown here read-only,
                              stacked under the name instead of its own column. */}
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 12.5, lineHeight: 1.3, textTransform: "uppercase" }}>{e.customer || "—"}</div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{phone || "—"}</div>
                          {rowGroupCount > 1 && (
                            <span title="This row covers several linked sale transactions (e.g. Advance + Final) for one parcel — entering tracking here fulfils all of them."
                              style={{ display: "inline-block", marginTop: 3, fontSize: 9.5, fontWeight: 800, color: "#4338ca", background: "#e0e7ff", borderRadius: 999, padding: "1px 6px", whiteSpace: "nowrap" }}>
                              🔗 {rowGroupCount} linked
                            </span>
                          )}
                          {isSameCustomerDup && (
                            <div title="Another despatch row exists for this same customer/phone but isn't linked to this one — check whether this is really a separate order."
                              style={{ marginTop: 3, fontSize: 9.5, fontWeight: 800, color: "#b45309", background: "#fef3c7", borderRadius: 999, padding: "1px 6px", whiteSpace: "nowrap", display: "inline-block" }}>
                              ⚠ check duplicate
                            </div>
                          )}
                          {collisionOthers && (
                            <div title={`Same phone number also appears under "${collisionOthers[0].customer}" in Sales — if that's the same person, link them so tracking reaches both.`}
                              style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: "#9a3412", background: "#ffedd5", borderRadius: 999, padding: "1px 6px", whiteSpace: "nowrap" }}>
                                ⚠ same phone as "{collisionOthers[0].customer}"
                              </span>
                              <button
                                onClick={async () => {
                                  if (!(await showConfirm(`Link "${linkedSaleForRow.customer}" and "${collisionOthers[0].customer}" as the same customer?\n\nTracking entered on either one will then update both.`))) return;
                                  for (const other of collisionOthers) await handleManualLink(linkedSaleForRow, other);
                                }}
                                style={{ fontSize: 9.5, fontWeight: 800, color: "#4338ca", background: "#e0e7ff", border: "none", borderRadius: 999, padding: "1px 6px", cursor: "pointer" }}>
                                🔗 Link orders
                              </button>
                            </div>
                          )}
                          {e.linkWarning && (
                            <div title={e.linkWarning}
                              style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: "#991b1b", background: "#fee2e2", borderRadius: 999, padding: "1px 6px", whiteSpace: "nowrap" }}>
                                ⚠ Sales not updated
                              </span>
                              <button onClick={() => retryLinkPush(e)}
                                style={{ fontSize: 9.5, fontWeight: 800, color: "#4338ca", background: "#e0e7ff", border: "none", borderRadius: 999, padding: "1px 6px", cursor: "pointer" }}>
                                ↻ Retry
                              </button>
                              <button onClick={() => setLinkWarning(e.uuid, "")}
                                title="Dismiss without retrying"
                                style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b", background: "#f1f5f9", border: "none", borderRadius: 999, padding: "1px 6px", cursor: "pointer" }}>
                                ✕
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 150, maxWidth: 220, verticalAlign: "top" }}>
                          {/* The address itself still lives on the Sales record — this
                              always shows that sale's current address live, and the
                              small ✏️ button opens a popup that writes straight back to
                              Sales, so it never drifts into its own separate copy here.
                              Collapsed to its first line by default (click to expand/
                              collapse) to keep the row compact. */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                            {fullAddress ? (
                              <div onClick={() => addressHasMore && setExpandedAddresses(p => ({ ...p, [e.uuid]: !p[e.uuid] }))}
                                title={addressHasMore ? (isAddressExpanded ? "Click to collapse" : "Click to see full address") : undefined}
                                style={{
                                  flex: 1, minWidth: 0,
                                  padding: "6px 8px", borderRadius: 7,
                                  border: "1px solid #e2e8f0", background: "#f8fafc",
                                  fontSize: 12, color: "#374151", lineHeight: 1.4,
                                  cursor: addressHasMore ? "pointer" : "default",
                                  whiteSpace: isAddressExpanded ? "pre-wrap" : "nowrap",
                                  overflow: isAddressExpanded ? "visible" : "hidden",
                                  textOverflow: "ellipsis",
                                }}>
                                {isAddressExpanded ? fullAddress : addressFirstLine}
                                {addressHasMore && (
                                  <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 800, color: "#6366f1", whiteSpace: "nowrap" }}>
                                    {isAddressExpanded ? "▲ less" : "▼ more"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span onClick={() => e.saleId && setAddressModalUuid(e.uuid)}
                                style={{ flex: 1, color: "#94a3b8", fontStyle: "italic", fontSize: 12, cursor: e.saleId ? "pointer" : "default" }}>
                                No address yet — tap to add one
                              </span>
                            )}
                            {e.saleId && (
                              <button onClick={() => setAddressModalUuid(e.uuid)} title="Edit address"
                                style={{ flexShrink: 0, border: "1px solid #e2e8f0", background: "white", borderRadius: 7, width: 24, height: 24, fontSize: 11.5, cursor: "pointer", color: "#6366f1", lineHeight: 1 }}>
                                ✏️
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 130, verticalAlign: "top" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input value={e.trackingNo} placeholder="Tracking no."
                              onChange={ev => updateEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })}
                              onBlur={ev => saveEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })}
                              style={{ ...cellInputStyle, flex: 1, minWidth: 0, borderColor: isDup ? "#fca5a5" : "#e2e8f0", background: isDup ? "#fef2f2" : "white" }} />
                            {e.trackingNo && (
                              <button onClick={() => copyTrackingNo(e.uuid, e.trackingNo)}
                                title="Copy tracking number"
                                style={{
                                  flexShrink: 0, border: "1px solid #e2e8f0", borderRadius: 7, width: 24, height: 24, fontSize: 11.5,
                                  cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
                                  background: copiedTrackingUuid === e.uuid ? "#dcfce7" : "white",
                                  color: copiedTrackingUuid === e.uuid ? "#15803d" : "#6366f1",
                                }}>
                                {copiedTrackingUuid === e.uuid ? "✓" : "📋"}
                              </button>
                            )}
                          </div>
                          {isDup && <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginTop: 2 }}>⚠ used on another row</div>}
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 120, verticalAlign: "top" }}>
                          <select value={e.shipper}
                            onChange={ev => saveEntry(e.uuid, { shipper: ev.target.value })}
                            style={{ ...cellInputStyle, fontWeight: 700, color: e.shipper ? shipperColor.color : "#94a3b8", background: e.shipper ? shipperColor.bg : "white" }}>
                            <option value="">Select…</option>
                            {SHIPPERS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 130, verticalAlign: "top" }}>
                          {/* Track + Mark Delivered — deep-links straight to the
                              carrier's own tracking page (no paid API — see
                              trackingURL() above), and once staff have seen it
                              show as delivered there, one click records that
                              here and pushes the date back to the linked
                              sale(s). The date defaults to today but stays
                              editable by clicking the green badge afterwards,
                              and can be undone with ↺ if marked by mistake. */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            {canNotify && (trackingURLValue => trackingURLValue ? (
                              <button onClick={() => trackClick(e, trackingURLValue)}
                                title={MANUAL_ENTRY_SHIPPERS.has((e.shipper || "").toUpperCase()) ? "Opens the tracking page and copies the tracking number so you can paste it in" : "Opens this parcel's tracking page directly"}
                                style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", textDecoration: "none", background: "#e0e7ff", borderRadius: 7, padding: "4px 8px", whiteSpace: "nowrap", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                                🔎 Track
                              </button>
                            ) : (
                              <span style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>Check {e.shipper} directly</span>
                            ))(staffTrackingURL(e.shipper, e.trackingNo))}
                            {e.delivered ? (
                              openDeliveryUuid === e.uuid ? (
                                <input autoFocus type="date" defaultValue={e.deliveredDate || todayISO()} max={todayISO()}
                                  onBlur={ev => markDelivered(e, ev.target.value)}
                                  style={{ ...cellInputStyle, width: 128 }} />
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span onClick={() => setOpenDeliveryUuid(e.uuid)} title="Click to correct the delivery date"
                                    style={{ fontSize: 10.5, fontWeight: 800, color: "#15803d", background: "#dcfce7", borderRadius: 999, padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                                    ✅ {ddmmyyyy(e.deliveredDate || todayISO())}
                                  </span>
                                  <button onClick={() => undoDelivered(e)} title="Undo — not actually delivered"
                                    style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0 }}>↺</button>
                                </div>
                              )
                            ) : (
                              canNotify && (
                                <button onClick={() => markDelivered(e, todayISO())}
                                  title="Mark this parcel delivered today — click the date afterwards to correct it"
                                  style={{ border: "none", borderRadius: 7, padding: "4px 8px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", background: "#f1f5f9", color: "#334155", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                                  📬 Mark Delivered
                                </button>
                              )
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => canNotify && notify(e)} disabled={!canNotify}
                              title={canNotify ? (e.notified ? "Notified — click to resend" : "Send tracking to customer") : "Add tracking number + shipper first"}
                              style={{
                                border: "none", borderRadius: 8, padding: "7px 9px", fontSize: 12, fontWeight: 700, cursor: canNotify ? "pointer" : "not-allowed",
                                background: !canNotify ? "#f1f5f9" : e.notified ? "#dcfce7" : "#25D366",
                                color: !canNotify ? "#94a3b8" : e.notified ? "#166534" : "white",
                                fontFamily: "inherit",
                              }}>
                              {e.notified ? "✅" : "💬"}
                            </button>
                            {openRemarksUuid === e.uuid ? (
                              <input autoFocus value={e.remarks} placeholder="Remarks"
                                onChange={ev => updateEntry(e.uuid, { remarks: ev.target.value })}
                                onBlur={ev => { saveEntry(e.uuid, { remarks: ev.target.value }); setOpenRemarksUuid(null); }}
                                onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); }}
                                style={{ ...cellInputStyle, width: 130 }} />
                            ) : (
                              <button onClick={() => setOpenRemarksUuid(e.uuid)}
                                title={e.remarks ? `Remarks: ${e.remarks}` : "Add remarks"}
                                style={{
                                  border: "none", borderRadius: 8, padding: "7px 9px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                                  background: e.remarks ? "#fef3c7" : "#f1f5f9", color: e.remarks ? "#92400e" : "#94a3b8",
                                }}>
                                📝
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => removeEntry(e.uuid)} title="Remove row"
                                style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>✕</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      )}
      </>
      )}

      {viewMode === "calendar" && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Month grid — each day shows its despatch count as a badge */}
          <div style={{ flex: "1 1 380px", minWidth: 320, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => shiftMonth(-1)} style={pillBtnStyle}>←</button>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{monthLabel(calMonth)}</div>
              <button onClick={() => !atCurrentMonthOrLater && shiftMonth(1)} disabled={atCurrentMonthOrLater}
                style={{ ...pillBtnStyle, opacity: atCurrentMonthOrLater ? 0.4 : 1, cursor: atCurrentMonthOrLater ? "not-allowed" : "pointer" }}>→</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {calCells.map((iso, i) => {
                if (!iso) return <div key={"blank" + i} />;
                const count = calendarCounts[iso] || 0;
                const isFuture = iso > todayISO();
                const isToday = iso === todayISO();
                const dayNum = Number(iso.slice(-2));
                return (
                  <button key={iso} onClick={() => count > 0 && !isFuture && jumpToDay(iso)}
                    disabled={isFuture || count === 0}
                    title={isFuture ? "Future date" : count ? `${count} despatched — click to view` : "Nothing despatched"}
                    style={{
                      aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                      borderRadius: 8, border: isToday ? "2px solid #0f172a" : "1px solid #f1f5f9",
                      background: isFuture ? "#fafafa" : count > 0 ? "#eef2ff" : "white",
                      cursor: (!isFuture && count > 0) ? "pointer" : "default",
                      fontFamily: "inherit",
                    }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: isFuture ? "#cbd5e1" : "#334155" }}>{dayNum}</span>
                    {!isFuture && count > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#4338ca", background: "#e0e7ff", borderRadius: 999, padding: "1px 6px" }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly totals — business growth trend across the whole log */}
          <div style={{ flex: "1 1 320px", minWidth: 280, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>📈 Monthly Despatch Totals</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 14 }}>Track volume month to month to gauge growth</div>
            {monthlyTotals.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 12.5 }}>No despatch history yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {monthlyTotals.map(mt => (
                  <div key={mt.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>{mt.label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>
                        {mt.count}
                        {mt.delta !== null && (
                          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: mt.delta >= 0 ? "#166534" : "#991b1b" }}>
                            {mt.delta >= 0 ? "▲" : "▼"} {Math.abs(mt.delta)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ width: `${mt.pct}%`, height: "100%", background: "#4338ca", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pillBtnStyle = {
  padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white",
  color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
};

const cellInputStyle = {
  width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0",
  fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box", resize: "none",
};

function SummaryChip({ label, value, bg, color }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 10, background: bg, color, display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700 }}>{label}</span>
    </div>
  );
}
