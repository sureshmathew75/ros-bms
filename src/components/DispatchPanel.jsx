import { useState, useEffect, useMemo } from "react";
import { formatDate } from "../utils";
import { dbSaveDispatchEntry, dbLoadDispatchLog, dbDeleteDispatchEntry } from "../db";

/* ─────────────────────────────────────────────────────────────────────────
   DISPATCH PANEL  (ROS India — daily despatch log)

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

/* ── Shipper config ───────────────────────────────────────────────────── */
const SHIPPERS = ["DTDC", "SPEEDPOST", "FEDEX", "DHL", "UPS", "Others"];
const SHIPPER_COLORS = {
  DTDC:      { bg: "#fef3c7", color: "#92400e" },
  SPEEDPOST: { bg: "#dbeafe", color: "#1e40af" },
  FEDEX:     { bg: "#fee2e2", color: "#991b1b" },
  DHL:       { bg: "#fef9c3", color: "#854d0e" },
  UPS:       { bg: "#e0e7ff", color: "#3730a3" },
  Others:    { bg: "#f1f5f9", color: "#475569" },
};

const trackingURL = (shipper, trackNo) => {
  const cleanNo = (trackNo || "").replace(/\s+/g, "");
  if (!cleanNo) return null;
  switch ((shipper || "").toUpperCase()) {
    case "DTDC":      return `https://www.dtdc.com/track-your-shipment/`;
    case "SPEEDPOST":  return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    case "FEDEX":     return `https://www.fedex.com/wtrk/track/?trknbr=${cleanNo}`;
    case "DHL":       return `https://www.dhl.com/in-en/home/tracking.html?tracking-id=${cleanNo}&tracking-type=shipment`;
    case "UPS":       return `https://www.ups.com/track?tracknum=${cleanNo}`;
    default:          return null; // "Others" — no deep tracking link available
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
  const e164 = clean.startsWith("0") ? "91" + clean.slice(1) : clean;
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
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{customerName || "Customer"}</div>
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

/* ═══════════════════════════════════════════════════════════════════════
   DISPATCH PANEL
   ═══════════════════════════════════════════════════════════════════════ */
export default function DispatchPanel({ shop, shopId, user, sales }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [waModal, setWaModal] = useState(null);
  const [savingIds, setSavingIds] = useState({}); // uuid -> true while a save is in flight

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await dbLoadDispatchLog(shopId);
      if (!cancelled) { setEntries(rows || []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  const allSales = sales || [];

  // Sale ids already present anywhere in the log — used to badge search
  // results as "already added" (still addable again, e.g. multi-parcel).
  const loggedSaleIds = useMemo(() => {
    const m = {};
    entries.forEach(e => { if (e.saleId) m[e.saleId] = (m[e.saleId] || 0) + 1; });
    return m;
  }, [entries]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return allSales.filter(s => {
      const name = (s.customer || "").toLowerCase();
      const phone = (s.phone || s.contact || "").replace(/\D/g, "");
      return name.includes(q) || (digits && phone.includes(digits));
    }).slice(0, 12);
  }, [allSales, search]);

  const dayEntries = useMemo(() => {
    return entries
      .filter(e => e.dispatchDate === selectedDate)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  }, [entries, selectedDate]);

  // Tracking numbers already used elsewhere (any date) — for the duplicate
  // guard. Keyed by uppercased, whitespace-stripped tracking number.
  const trackingIndex = useMemo(() => {
    const m = {};
    entries.forEach(e => {
      const key = (e.trackingNo || "").replace(/\s+/g, "").toUpperCase();
      if (!key) return;
      (m[key] = m[key] || []).push(e.uuid);
    });
    return m;
  }, [entries]);

  const summary = useMemo(() => {
    const total = dayEntries.length;
    const noTracking = dayEntries.filter(e => !e.trackingNo).length;
    const notNotified = dayEntries.filter(e => !e.notified).length;
    return { total, noTracking, notNotified };
  }, [dayEntries]);

  const persist = async (uuidOrNull, payload) => {
    setSavingIds(p => ({ ...p, [uuidOrNull || "__new__"]: true }));
    const res = await dbSaveDispatchEntry(shopId, uuidOrNull ? { ...payload, _uuid: uuidOrNull } : payload);
    setSavingIds(p => { const n = { ...p }; delete n[uuidOrNull || "__new__"]; return n; });
    return res;
  };

  const addFromSale = async (sale) => {
    const draft = {
      saleId: sale.id,
      dispatchDate: selectedDate,
      customer: sale.customer || "",
      phone: sale.phone || sale.contact || "",
      address: sale.address || "",
      trackingNo: "",
      shipper: "",
      notified: false,
      remarks: "",
    };
    const res = await persist(null, draft);
    if (res?.error) { alert("Could not add to dispatch log: " + res.error); return; }
    setEntries(prev => [...prev, { ...draft, uuid: res.uuid, createdAt: new Date().toISOString() }]);
    setSearch("");
  };

  const updateEntry = (uuid, patch) => {
    setEntries(prev => prev.map(e => e.uuid === uuid ? { ...e, ...patch } : e));
  };

  const saveEntry = async (uuid, patch) => {
    const current = entries.find(e => e.uuid === uuid);
    if (!current) return;
    const merged = { ...current, ...patch };
    updateEntry(uuid, patch);
    const res = await persist(uuid, merged);
    if (res?.error) alert("Could not save change: " + res.error);
  };

  const removeEntry = async (uuid) => {
    if (!window.confirm("Remove this row from the despatch log?")) return;
    setEntries(prev => prev.filter(e => e.uuid !== uuid));
    await dbDeleteDispatchEntry(uuid, shopId);
  };

  const notify = (entry) => {
    const phone = (entry.phone || "").replace(/[^0-9]/g, "");
    if (!phone) { alert("No phone number on this row."); return; }
    const message = buildDispatchTrackingMsg(entry, shop);
    setWaModal({
      phone, customerName: entry.customer, message,
      onSent: () => saveEntry(entry.uuid, { notified: true }),
    });
  };

  const copyDayList = async () => {
    const lines = dayEntries.map((e, i) =>
      `${i + 1}. ${e.customer || "—"} — ${e.phone || "—"} — ${e.trackingNo || "no tracking yet"} (${e.shipper || "no shipper"})`
    );
    const text = `Despatch — ${formatDate ? formatDate(selectedDate) : selectedDate}\n\n${lines.join("\n")}`;
    try { await navigator.clipboard.writeText(text); alert("Day's despatch list copied."); }
    catch { alert(text); }
  };

  /* Bulk WhatsApp — bundles the whole day's sheet into one message with no
     fixed recipient, for pinging an internal despatch group chat. Mirrors
     the old Dispatch Sheet's "Send via WhatsApp" button in SalesPanel.jsx. */
  const sendBulkWhatsApp = () => {
    const dateLabel = formatDate ? formatDate(selectedDate) : selectedDate;
    const lines = [`🚚 *Despatch Log* — ${dateLabel}`, `${dayEntries.length} item${dayEntries.length !== 1 ? "s" : ""}`, ""];
    dayEntries.forEach((e, i) => {
      lines.push(`${i + 1}. ${e.customer || "—"}`);
      lines.push(e.address || "No address on file");
      lines.push(`Phone: ${e.phone || "—"}`);
      lines.push(`Tracking: ${e.trackingNo || "—"} (${e.shipper || "no shipper"})`);
      if (e.remarks) lines.push(`Remarks: ${e.remarks}`);
      lines.push("");
    });
    setWaModal({ phone: "", customerName: "", message: lines.join("\n").trim() });
  };

  /* Print — clean tabular printout of the selected day's sheet. Mirrors
     the old Dispatch Sheet's "Print / Export" button in SalesPanel.jsx,
     extended with the extra columns this page tracks (phone, tracking,
     shipper, remarks). */
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const dateLabel = formatDate ? formatDate(selectedDate) : selectedDate;
    const rows = dayEntries.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.customer || "—"}</td>
        <td style="white-space:pre-line">${e.address || "—"}</td>
        <td>${e.phone || "—"}</td>
        <td>${e.trackingNo || "—"}</td>
        <td>${e.shipper || "—"}</td>
        <td>${e.remarks || "—"}</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Despatch Log — ${dateLabel}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0f172a;}
        h1{font-size:18px;margin-bottom:4px;} p{color:#64748b;font-size:12px;margin-top:0;}
        table{width:100%;border-collapse:collapse;margin-top:14px;}
        th,td{border:1px solid #e2e8f0;padding:8px 10px;font-size:12px;text-align:left;vertical-align:top;}
        th{background:#f8fafc;text-transform:uppercase;letter-spacing:0.04em;font-size:10px;}
      </style></head><body>
      <h1>🚚 Despatch Log</h1>
      <p>${dateLabel} · ${dayEntries.length} item${dayEntries.length !== 1 ? "s" : ""}</p>
      <table><thead><tr><th>#</th><th>Customer</th><th>Address</th><th>Phone</th><th>Tracking No.</th><th>Shipper</th><th>Remarks</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const quickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(localISO(d));
  };

  return (
    <div style={{ padding: "20px 22px", maxWidth: 1180, margin: "0 auto" }}>
      {waModal && <WaModal data={waModal} onClose={() => { waModal.onSent && waModal.onSent(); setWaModal(null); }} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>🚚 Despatch Log</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>Daily despatch sheet — tracking, shipper &amp; customer notification</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => quickDate(-1)} style={pillBtnStyle}>← Yesterday</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit" }} />
          <button onClick={() => quickDate(0)} style={pillBtnStyle}>Today</button>
          <button onClick={() => quickDate(1)} style={pillBtnStyle}>Tomorrow →</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <SummaryChip label="Rows today" value={summary.total} bg="#f1f5f9" color="#334155" />
        <SummaryChip label="Awaiting tracking" value={summary.noTracking} bg={summary.noTracking ? "#fef3c7" : "#f1f5f9"} color={summary.noTracking ? "#92400e" : "#334155"} />
        <SummaryChip label="Not yet notified" value={summary.notNotified} bg={summary.notNotified ? "#fee2e2" : "#f1f5f9"} color={summary.notNotified ? "#991b1b" : "#334155"} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handlePrint} disabled={!dayEntries.length}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#334155", fontWeight: 700, fontSize: 12.5, cursor: dayEntries.length ? "pointer" : "not-allowed", opacity: dayEntries.length ? 1 : 0.5, fontFamily: "inherit" }}>
            🖨️ Print / Export
          </button>
          <button onClick={sendBulkWhatsApp} disabled={!dayEntries.length}
            title="Send the whole day's sheet as one message — no fixed recipient, for your despatch team chat"
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: dayEntries.length ? "#25D366" : "#f1f5f9", color: dayEntries.length ? "white" : "#94a3b8", fontWeight: 700, fontSize: 12.5, cursor: dayEntries.length ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            💬 Send Sheet via WhatsApp
          </button>
          <button onClick={copyDayList} disabled={!dayEntries.length}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#334155", fontWeight: 700, fontSize: 12.5, cursor: dayEntries.length ? "pointer" : "not-allowed", opacity: dayEntries.length ? 1 : 0.5, fontFamily: "inherit" }}>
            📋 Copy Day's List
          </button>
        </div>
      </div>

      {/* Search-to-add */}
      <div style={{ marginBottom: 18, position: "relative" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search customer name or phone to add to today's despatch…"
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.customer || "—"}</div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>{s.phone || s.contact || "No phone"} · {s.item || "—"}</div>
                </div>
                {loggedSaleIds[s.id] && (
                  <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 999, padding: "2px 8px" }}>
                    already on log ×{loggedSaleIds[s.id]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spreadsheet */}
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920, fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["#", "Customer", "Address", "Phone", "Tracking No.", "Shipper", "Notify", "Remarks", ""].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 800, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
            ) : dayEntries.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Nothing on the despatch log for this date yet — add someone above.</td></tr>
            ) : dayEntries.map((e, idx) => {
              const dupKey = (e.trackingNo || "").replace(/\s+/g, "").toUpperCase();
              const isDup = dupKey && (trackingIndex[dupKey] || []).length > 1;
              const canNotify = !!(e.trackingNo && e.shipper);
              const shipperColor = SHIPPER_COLORS[e.shipper] || SHIPPER_COLORS.Others;
              return (
                <tr key={e.uuid} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 ? "#fdfbf3" : "white" }}>
                  <td style={{ padding: "8px 12px", color: "#94a3b8", fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{e.customer || "—"}</td>
                  <td style={{ padding: "8px 12px", minWidth: 180 }}>
                    <textarea value={e.address} rows={1}
                      onChange={ev => updateEntry(e.uuid, { address: ev.target.value })}
                      onBlur={ev => saveEntry(e.uuid, { address: ev.target.value })}
                      style={cellInputStyle} />
                  </td>
                  <td style={{ padding: "8px 12px", minWidth: 120 }}>
                    <input value={e.phone}
                      onChange={ev => updateEntry(e.uuid, { phone: ev.target.value })}
                      onBlur={ev => saveEntry(e.uuid, { phone: ev.target.value })}
                      style={cellInputStyle} />
                  </td>
                  <td style={{ padding: "8px 12px", minWidth: 140 }}>
                    <input value={e.trackingNo} placeholder="Tracking no."
                      onChange={ev => updateEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })}
                      onBlur={ev => saveEntry(e.uuid, { trackingNo: ev.target.value.toUpperCase() })}
                      style={{ ...cellInputStyle, borderColor: isDup ? "#fca5a5" : "#e2e8f0", background: isDup ? "#fef2f2" : "white" }} />
                    {isDup && <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginTop: 2 }}>⚠ used on another row</div>}
                  </td>
                  <td style={{ padding: "8px 12px", minWidth: 130 }}>
                    <select value={e.shipper}
                      onChange={ev => saveEntry(e.uuid, { shipper: ev.target.value })}
                      style={{ ...cellInputStyle, fontWeight: 700, color: e.shipper ? shipperColor.color : "#94a3b8", background: e.shipper ? shipperColor.bg : "white" }}>
                      <option value="">Select…</option>
                      {SHIPPERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <button onClick={() => canNotify && notify(e)} disabled={!canNotify}
                      title={canNotify ? (e.notified ? "Notified — click to resend" : "Send tracking to customer") : "Add tracking number + shipper first"}
                      style={{
                        border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: canNotify ? "pointer" : "not-allowed",
                        background: !canNotify ? "#f1f5f9" : e.notified ? "#dcfce7" : "#25D366",
                        color: !canNotify ? "#94a3b8" : e.notified ? "#166534" : "white",
                        fontFamily: "inherit",
                      }}>
                      {e.notified ? "✅" : "💬"}
                    </button>
                  </td>
                  <td style={{ padding: "8px 12px", minWidth: 160 }}>
                    <input value={e.remarks} placeholder="Remarks"
                      onChange={ev => updateEntry(e.uuid, { remarks: ev.target.value })}
                      onBlur={ev => saveEntry(e.uuid, { remarks: ev.target.value })}
                      style={cellInputStyle} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <button onClick={() => removeEntry(e.uuid)} title="Remove row"
                      style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
