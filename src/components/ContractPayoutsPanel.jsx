import { useState, useEffect, useMemo } from "react";
import { dbLoadContractStaff, dbSaveContractStaff, dbLoadContractPayouts, dbSaveContractPayout, dbDeleteContractPayout } from "../db";
import { showAlert, showConfirm } from "./PopupHost";

/* ─────────────────────────────────────────────────────────────────────────
   PAYROLL → CONTRACT PAYOUTS  (ROS India)

   For people paid per unit of work (e.g. a video editor paid ₹200 per
   video) instead of a monthly salary. Completely separate from salary
   payslips: no attendance, no working days, no absence deductions, no
   advances/loans. Each month the admin types the number of units done;
   the amount is units × rate. A professional "Contractor Payment Slip" is
   produced for the person. Paid on the 1st of the following month.

   Tables: contract_staff, contract_payouts (see contract_payouts.sql).
   ───────────────────────────────────────────────────────────────────────── */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PAY_MODES = ["", "Bank Transfer", "UPI", "Cash", "Cheque"];
const pad = (n) => String(n).padStart(2, "0");
const money = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const monthLabelOf = (key) => { const [y, m] = key.split("-").map(Number); return `${MONTH_NAMES[m - 1]} ${y}`; };
const nextMonthFirst = (key) => { const [y, m] = key.split("-").map(Number); const d = new Date(y, m, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; };   // 1st of the following month
const fmtDate = (iso) => { if (!iso) return "—"; try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } };
const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim();

/* ── The slip itself — same look as the company's salary payslip so it feels like one family of documents ── */
export const ContractSlipDocument = ({ shop, toWords, domId, slipId, generatedDate, isPreview, monthLabel, data }) => {
  const sym = shop.symbol;
  const d = data || {};
  const units = Number(d.units || 0), rate = Number(d.rate || 0);
  const gross = units * rate;
  const adj = Number(d.adjustment || 0);          // signed: + bonus, − deduction
  const total = gross + adj;
  const unitLabel = d.unitLabel || "video";
  const plural = (n) => (n === 1 ? unitLabel : unitLabel + "s");
  const lbl = { fontSize: 9.5, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 6 };
  const row = { display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "2.5px 0", gap: 10 };
  const th = { fontSize: 9.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#64748b", padding: "9px 10px", textAlign: "left", background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" };
  const td = { padding: "11px 10px", fontSize: 12.5, borderBottom: "1px dashed #e5e7eb", verticalAlign: "top" };
  return (
    <div id={domId} style={{ maxWidth: 794, margin: "0 auto", fontFamily: "Arial,Helvetica,sans-serif", fontSize: 13, color: "#0f172a", background: "white", position: "relative", overflow: "hidden", border: "1px solid #e5e7eb", borderRadius: 4 }}>
      <div style={{ height: 7, background: `linear-gradient(90deg, ${shop.accent}, ${shop.accentText})` }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0 }}>
        <span style={{ fontSize: 120, fontWeight: 900, color: "#0f172a", opacity: 0.025, transform: "rotate(-28deg)", whiteSpace: "nowrap" }}>{shop.name}</span>
      </div>
      <div style={{ position: "relative", zIndex: 1, padding: "40px 48px 34px" }}>

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {shop.logoIncludesName ? (
              <div>
                <img src={shop.logo} alt={shop.name} style={{ height: 86, objectFit: "contain", display: "block" }} />
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>Kottayam, Kerala, India</div>
              </div>
            ) : (<>
              <img src={shop.logo} alt={shop.name} style={{ height: 74, objectFit: "contain" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.15 }}>{shop.name}</div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Kottayam, Kerala, India</div>
              </div>
            </>)}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Contractor Payment Slip</div>
            <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-0.02em" }}>{monthLabel}</div>
            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>
              {slipId && <>Ref: {slipId}<br /></>}
              {isPreview ? "Preview — not yet saved" : (generatedDate ? `Issued ${fmtDate(generatedDate)}` : "")}
            </div>
          </div>
        </div>
        <div style={{ height: 2, background: "#0f172a", marginBottom: 20 }} />

        {/* contractor + payment details */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, marginBottom: 22 }}>
          <div style={{ background: shop.accentBg, border: "1px solid " + shop.accent + "55", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ ...lbl, color: shop.accentText }}>Contractor</div>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>{d.fullName || ""}</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{d.position || "Contractor"} · {shop.name}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>Engagement: <b style={{ color: "#0f172a" }}>Contract — paid per {unitLabel}</b></div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ ...lbl, color: "#94a3b8" }}>Payment Details</div>
            <div style={row}><span style={{ color: "#64748b" }}>Work period</span><span style={{ fontWeight: 700 }}>{monthLabel}</span></div>
            <div style={row}><span style={{ color: "#64748b" }}>Payment date</span><span style={{ fontWeight: 700 }}>{fmtDate(d.paymentDate)}</span></div>
            {d.paymentMode ? <div style={row}><span style={{ color: "#64748b" }}>Mode</span><span style={{ fontWeight: 700 }}>{d.paymentMode}</span></div> : null}
            {d.paymentRef ? <div style={row}><span style={{ color: "#64748b" }}>Reference</span><span style={{ fontWeight: 700 }}>{d.paymentRef}</span></div> : null}
            <div style={{ display: "inline-flex", marginTop: 8, borderRadius: 20, padding: "3px 10px", fontSize: 10.5, fontWeight: 800, background: isPreview ? "#fffbeb" : "#ecfdf5", color: isPreview ? "#92400e" : "#166534", border: "1px solid " + (isPreview ? "#fde68a" : "#bbf7d0") }}>
              {isPreview ? "PREVIEW — NOT SAVED" : "PAYMENT SLIP ISSUED"}
            </div>
          </div>
        </div>

        {/* work summary */}
        <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 9 }}>Work Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>
          {[[`${plural(2).charAt(0).toUpperCase() + plural(2).slice(1)} delivered`, units, shop.accentText], [`Rate per ${unitLabel}`, `${sym}${money(rate)}`, "#0f172a"], ["Work amount", `${sym}${money(gross)}`, "#166534"]].map(([l, v, c]) => (
            <div key={l} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "13px 8px 11px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* statement */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th style={th}>Description</th><th style={{ ...th, textAlign: "right" }}>Quantity</th><th style={{ ...th, textAlign: "right" }}>Rate</th><th style={{ ...th, textAlign: "right" }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>{d.position || "Contract work"} — {monthLabel}<small style={{ display: "block", color: "#94a3b8", fontSize: 10, marginTop: 2 }}>{units} {plural(units)} completed and delivered</small></td>
              <td style={{ ...td, textAlign: "right" }}>{units}</td>
              <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{sym}{money(rate)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{sym}{money(gross)}</td>
            </tr>
            {adj !== 0 && (
              <tr>
                <td style={td} colSpan={3}>{d.adjustmentLabel || (adj > 0 ? "Bonus" : "Deduction")}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: adj > 0 ? "#166534" : "#dc2626" }}>{adj > 0 ? "+" : "−"}{sym}{money(Math.abs(adj))}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* total banner */}
        <div style={{ marginTop: 20, borderRadius: 12, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#166534" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.85 }}>Total Payable</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, maxWidth: 420 }}>{toWords ? toWords(total) : ""}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>{sym}{money(total)}</div>
        </div>

        {d.note ? <div style={{ marginTop: 14, fontSize: 11.5, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px" }}><b>Note:</b> {d.note}</div> : null}

        {/* footer */}
        <div style={{ marginTop: 26, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
          <p style={{ margin: 0, fontSize: 10.5, color: "#94a3b8", lineHeight: 1.6, maxWidth: 330 }}>Remuneration for contract services, calculated per {unitLabel} delivered. This is not a salary payslip: no attendance or leave applies. Issued by {shop.name}.</p>
          <div style={{ display: "flex", gap: 26 }}>
            <div style={{ textAlign: "center" }}><div style={{ width: 140, height: 36, borderBottom: "1px solid #0f172a", marginBottom: 5 }} /><span style={{ fontSize: 10.5, color: "#64748b" }}>Received by</span></div>
            <div style={{ textAlign: "center" }}><div style={{ width: 140, height: 36, borderBottom: "1px solid #0f172a", marginBottom: 5 }} /><span style={{ fontSize: 10.5, color: "#64748b" }}>Authorised Signatory</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── The admin screen ───────────────────────────────────────────────────── */
export default function ContractPayoutsPanel({ shop, shopId, downloadPdf, toWords }) {
  const ac = shop.accent;
  const [loaded, setLoaded] = useState(false);
  const [staff, setStaff] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [selName, setSelName] = useState("");
  const [profileModal, setProfileModal] = useState(null);   // { mode:"add"|"edit", name, position, rate, unitLabel, startMonth }
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);   // the payout on the 1st is for the PREVIOUS month
  const [selYear, setSelYear] = useState(prev.getFullYear());
  const [selMonth, setSelMonth] = useState(prev.getMonth() + 1);
  const monthKey = `${selYear}-${pad(selMonth)}`;

  const [units, setUnits] = useState("");
  const [rate, setRate] = useState("");
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjLabel, setAdjLabel] = useState("");
  const [adjSign, setAdjSign] = useState("+");
  const [adjAmt, setAdjAmt] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMode, setPayMode] = useState("");
  const [payRef, setPayRef] = useState("");
  const [note, setNote] = useState("");

  const load = () => Promise.all([dbLoadContractStaff(shopId), dbLoadContractPayouts(shopId)]).then(([s, p]) => { setStaff(s); setPayouts(p); });
  useEffect(() => { load().then(() => setLoaded(true)); /* eslint-disable-next-line */ }, [shopId]);
  useEffect(() => { if (!selName && staff.length) setSelName(staff[0].name); }, [staff, selName]);

  const person = staff.find(s => s.name === selName) || null;
  const existing = payouts.find(p => p.staffName === selName && p.month === monthKey) || null;
  const history = useMemo(() => payouts.filter(p => p.staffName === selName).sort((a, b) => b.month.localeCompare(a.month)), [payouts, selName]);

  // Fill the form: from the saved slip if there is one for this month, otherwise fresh defaults.
  useEffect(() => {
    if (existing) {
      const b = existing.breakdown || {};
      setUnits(String(existing.units)); setRate(String(existing.rate));
      const adj = Number(b.adjustment || 0);
      setAdjOpen(adj !== 0); setAdjLabel(b.adjustmentLabel || ""); setAdjSign(adj < 0 ? "−" : "+"); setAdjAmt(adj ? String(Math.abs(adj)) : "");
      setPayDate(b.paymentDate || nextMonthFirst(monthKey)); setPayMode(b.paymentMode || ""); setPayRef(b.paymentRef || ""); setNote(existing.note || "");
    } else {
      setUnits(""); setRate(person ? String(person.rate) : "");
      setAdjOpen(false); setAdjLabel(""); setAdjSign("+"); setAdjAmt("");
      setPayDate(nextMonthFirst(monthKey)); setPayMode(""); setPayRef(""); setNote("");
    }
    // eslint-disable-next-line
  }, [selName, monthKey, existing ? existing.id : "", person ? person.rate : ""]);

  const nUnits = Number(units), nRate = Number(rate);
  const adjSigned = (adjSign === "−" ? -1 : 1) * (Number(adjAmt) || 0);
  const total = (nUnits || 0) * (nRate || 0) + adjSigned;
  const monthLabel = monthLabelOf(monthKey);
  const slipData = {
    fullName: person?.name || "", position: person?.position || "", unitLabel: person?.unitLabel || "video",
    units: nUnits || 0, rate: nRate || 0, adjustment: adjSigned, adjustmentLabel: adjLabel.trim(),
    paymentDate: payDate, paymentMode: payMode, paymentRef: payRef.trim(), note: note.trim(),
  };

  const saveProfile = async () => {
    const m = profileModal;
    const name = cleanName(m.name);
    if (!name) { showAlert("Please enter the contractor's name."); return; }
    if (!(Number(m.rate) > 0)) { showAlert("Please enter the rate (amount paid per " + (m.unitLabel || "unit") + ")."); return; }
    if (m.mode === "add" && staff.some(s => s.name.toLowerCase() === name.toLowerCase())) { showAlert("A contractor with this name already exists."); return; }
    setSaving(true);
    const ok = await dbSaveContractStaff(shopId, { name, position: cleanName(m.position), rate: Number(m.rate), unitLabel: cleanName(m.unitLabel) || "video", startMonth: m.startMonth || "" });
    setSaving(false);
    if (!ok) { showAlert("Couldn't save. Has contract_payouts.sql been run in Supabase?"); return; }
    await load();
    setSelName(name);
    setProfileModal(null);
  };

  const saveSlip = async () => {
    if (!person) return;
    if (units === "" || !(nUnits >= 0)) { showAlert("Please enter the number of " + (person.unitLabel || "video") + "s completed (0 or more)."); return; }
    if (!(nRate > 0)) { showAlert("Please enter the rate."); return; }
    if (total < 0) { showAlert("The total can't be negative. Please check the deduction."); return; }
    if (adjOpen && adjSigned !== 0 && !adjLabel.trim()) { showAlert("Please give the bonus / deduction a short label (for example 'Bonus' or 'Advance recovered')."); return; }
    setSaving(true);
    const id = await dbSaveContractPayout(shopId, person.name, monthKey, nUnits, nRate, total, note.trim(), { ...slipData, monthLabel });
    setSaving(false);
    if (!id) { showAlert("Couldn't save the slip. Has contract_payouts.sql been run in Supabase?"); return; }
    await load();
  };

  const removeSlip = async (rec) => {
    if (!(await showConfirm(`Delete the ${monthLabelOf(rec.month)} slip for ${rec.staffName}? This cannot be undone.`))) return;
    await dbDeleteContractPayout(rec.id);
    await load();
  };

  /* ── styles ── */
  const inp = { padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", background: "white", boxSizing: "border-box", width: "100%" };
  const lb = { display: "block", fontSize: 10, fontWeight: 800, color: shop.accentText, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 };
  const btn = { padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading contract payouts…</div>;

  const ProfileModal = () => {
    const m = profileModal; if (!m) return null;
    const s = (k, v) => setProfileModal(p => ({ ...p, [k]: v }));
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={() => setProfileModal(null)} />
        <div style={{ position: "relative", background: "white", borderRadius: 16, width: "100%", maxWidth: 440, padding: 22, boxShadow: "0 24px 64px rgba(0,0,0,.2)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>{m.mode === "add" ? "➕ Add contractor" : "✏️ Edit contractor"}</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label style={lb}>Name</label><input style={{ ...inp, ...(m.mode === "edit" ? { background: "#f1f5f9" } : {}) }} value={m.name} disabled={m.mode === "edit"} onChange={e => s("name", e.target.value)} /></div>
            <div><label style={lb}>Position</label><input style={inp} value={m.position} onChange={e => s("position", e.target.value)} placeholder="e.g. Video Editor" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={lb}>Rate ({shop.symbol})</label><input style={inp} type="number" min="0" value={m.rate} onChange={e => s("rate", e.target.value)} /></div>
              <div><label style={lb}>Paid per</label><input style={inp} value={m.unitLabel} onChange={e => s("unitLabel", e.target.value)} placeholder="video" /></div>
            </div>
            <div><label style={lb}>Started in</label><input style={inp} type="month" value={m.startMonth} onChange={e => s("startMonth", e.target.value)} /></div>
            <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Changing the rate later only affects slips you make from then on; slips already issued keep their own rate.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            <button style={{ ...btn, background: ac, color: "white", border: "none", padding: "11px 0" }} disabled={saving} onClick={saveProfile}>{saving ? "Saving…" : "💾 Save"}</button>
            <button style={{ ...btn, padding: "11px 0" }} onClick={() => setProfileModal(null)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  /* ── empty state: no contractor yet ── */
  if (staff.length === 0) return (
    <div style={{ padding: "34px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 38, marginBottom: 8 }}>🎬</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800 }}>Contract Payouts</h3>
      <p style={{ margin: "0 auto 16px", maxWidth: 460, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>For people paid per piece of work instead of a monthly salary. No attendance or working days — enter the number of videos each month and the slip is ready.</p>
      <button style={{ ...btn, background: ac, color: "white", border: "none", padding: "11px 20px", fontSize: 13 }}
        onClick={() => setProfileModal({ mode: "add", name: "AKHIL A", position: "Video Editor", rate: "200", unitLabel: "video", startMonth: "2026-10" })}>➕ Add contractor</button>
      {ProfileModal()}
    </div>
  );

  return (
    <div>
      {/* contractor + period strip */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 14, padding: "14px 16px", background: shop.accentBg, borderRadius: 12, border: "1px solid " + ac + "33" }}>
        <div style={{ minWidth: 190 }}>
          <label style={lb}>Contractor</label>
          <select style={inp} value={selName} onChange={e => setSelName(e.target.value)}>{staff.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>
        </div>
        {person && (
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
            <b style={{ color: "#0f172a" }}>{person.position || "Contractor"}</b> · {shop.symbol}{money(person.rate)} per {person.unitLabel}
            {person.startMonth ? <> · since {monthLabelOf(person.startMonth)}</> : null}
            <div><button style={{ ...btn, padding: "3px 9px", fontSize: 11, marginTop: 3 }} onClick={() => setProfileModal({ mode: "edit", name: person.name, position: person.position, rate: String(person.rate), unitLabel: person.unitLabel, startMonth: person.startMonth })}>✏️ Edit</button>
              <button style={{ ...btn, padding: "3px 9px", fontSize: 11, marginTop: 3, marginLeft: 6 }} onClick={() => setProfileModal({ mode: "add", name: "", position: "", rate: "", unitLabel: "video", startMonth: "" })}>➕ Add another</button></div>
          </div>
        )}
        <div style={{ marginLeft: "auto", background: "white", border: "1.5px solid " + ac, borderRadius: 10, padding: "8px 14px" }}>
          <label style={lb}>Work period (paid on the 1st of next month)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...inp, width: "auto", fontWeight: 800 }} value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>{MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <select style={{ ...inp, width: "auto", fontWeight: 800 }} value={selYear} onChange={e => setSelYear(Number(e.target.value))}>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
        </div>
      </div>

      {/* entry */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 18, background: "white" }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
          🎬 {monthLabel} — {person?.name}
          {existing && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 800, color: "#166534", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 10px" }}>Slip already saved — editing it</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, alignItems: "end" }}>
          <div><label style={lb}>Number of {person?.unitLabel}s done</label>
            <input style={{ ...inp, fontSize: 20, fontWeight: 900, padding: "10px 12px" }} type="number" min="0" step="1" inputMode="numeric" value={units} onChange={e => setUnits(e.target.value)} placeholder="0" autoFocus /></div>
          <div><label style={lb}>Rate per {person?.unitLabel} ({shop.symbol})</label>
            <input style={inp} type="number" min="0" value={rate} onChange={e => setRate(e.target.value)} /></div>
          <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 10, padding: "9px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total payout</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#166534" }}>{shop.symbol}{money(total)}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 12 }}>
          <div><label style={lb}>Payment date</label><input style={inp} type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
          <div><label style={lb}>Payment mode (optional)</label><select style={inp} value={payMode} onChange={e => setPayMode(e.target.value)}>{PAY_MODES.map(m => <option key={m} value={m}>{m || "— Not shown —"}</option>)}</select></div>
          <div><label style={lb}>Bank / UPI reference (optional)</label><input style={inp} value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="UTR / transaction ID" /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button style={{ ...btn, padding: "5px 12px", fontSize: 11.5 }} onClick={() => setAdjOpen(v => !v)}>{adjOpen ? "▾" : "▸"} Bonus / deduction &amp; note (optional)</button>
          {adjOpen && (
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 160px", gap: 10, marginTop: 10, alignItems: "end" }}>
              <div><label style={lb}>Type</label><select style={inp} value={adjSign} onChange={e => setAdjSign(e.target.value)}><option value="+">+ Bonus</option><option value="−">− Deduct</option></select></div>
              <div><label style={lb}>Label on slip</label><input style={inp} value={adjLabel} onChange={e => setAdjLabel(e.target.value)} placeholder="e.g. Bonus — urgent project" /></div>
              <div><label style={lb}>Amount ({shop.symbol})</label><input style={inp} type="number" min="0" value={adjAmt} onChange={e => setAdjAmt(e.target.value)} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lb}>Note on slip</label><input style={inp} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional short note" /></div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button style={{ ...btn, background: ac, color: "white", border: "none", padding: "11px 22px", fontSize: 13 }} disabled={saving} onClick={saveSlip}>{saving ? "Saving…" : existing ? "💾 Update slip" : "💾 Save slip"}</button>
        </div>
      </div>

      {/* live preview (only while this month's slip isn't saved yet) */}
      {!existing && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Preview</div>
          <div style={{ overflowX: "auto" }}><div style={{ zoom: 0.8 }}>
            <ContractSlipDocument shop={shop} toWords={toWords} domId="contract-slip-preview" monthLabel={monthLabel} data={slipData} isPreview />
          </div></div>
        </div>
      )}

      {/* history */}
      <div style={{ fontSize: 13, fontWeight: 800, margin: "6px 0 10px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span>📚 Slips issued to {person?.name}</span>
        {history.length > 0 && <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{history.reduce((a, r) => a + r.units, 0)} {person?.unitLabel}s · {shop.symbol}{money(history.reduce((a, r) => a + r.amount, 0))} in total</span>}
      </div>
      {history.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: 12 }}>No slips saved yet.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.map(rec => (
            <div key={rec.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{monthLabelOf(rec.month)} <span style={{ color: "#64748b", fontWeight: 600 }}>· {rec.units} {person?.unitLabel}{rec.units === 1 ? "" : "s"}</span></span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: ac }}>{shop.symbol}{money(rec.amount)}</span>
                  <button style={btn} onClick={() => downloadPdf && downloadPdf(`contract-hist-${rec.id}`, `ContractSlip-${rec.staffName}-${rec.month}.pdf`)}>⬇ PDF</button>
                  <button style={btn} onClick={() => { setSelYear(Number(rec.month.slice(0, 4))); setSelMonth(Number(rec.month.slice(5))); window.scrollTo({ top: 0, behavior: "smooth" }); }}>✏️ Edit</button>
                  <button style={{ ...btn, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626" }} onClick={() => removeSlip(rec)}>Delete</button>
                </div>
              </div>
              <div style={{ padding: 12, overflowX: "auto" }}>
                <div style={{ zoom: 0.62 }}>
                  <ContractSlipDocument shop={shop} toWords={toWords} domId={`contract-hist-${rec.id}`} slipId={rec.id} generatedDate={rec.generatedDate} monthLabel={monthLabelOf(rec.month)}
                    data={{ ...(rec.breakdown || {}), fullName: rec.breakdown?.fullName || rec.staffName, units: rec.units, rate: rec.rate }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {ProfileModal()}
    </div>
  );
}
