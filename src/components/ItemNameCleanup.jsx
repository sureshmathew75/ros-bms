import React, { useMemo, useState } from "react";
import { matchEntry, findListEntry, searchPriceList, priceFor, PRICE_ENTRIES } from "../priceList";
import { ItemSuggestInput } from "./PriceListPanel";
import { showAlert, showConfirm } from "./PopupHost";

/* ── ROS India — "Fix item names" (admin) ───────────────────────────────────────────────────────────────────
   Old sales have item names that staff typed by hand, so Orbit can't pick the price-list item. This screen lists every
   sale line whose name is not exactly a price-list item, suggests the list item, and renames the ones you tick.
   ONLY THE NAME CHANGES — quantity, price entered, amount received and the sale total are never touched. The typed
   name is kept on the line as `changedFrom` (so it can be restored), and a CSV of every change is downloaded first.
   Nothing is written until you press Apply. */

const SHOP = "ros-india";
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const qtyN = (q) => (q === undefined || q === null || q === "" ? 1 : (parseFloat(q) || 0));
const todayISO = () => new Date().toISOString().slice(0, 10);

/* every sale line that is not exactly a list item */
const collectRows = (sales) => {
  const out = [];
  (sales || []).forEach((s) => {
    const lines = Array.isArray(s.saleLines) && s.saleLines.length > 0 ? s.saleLines : null;
    if (lines) {
      lines.forEach((l, i) => {
        const name = String(l.name || "").trim();
        if (!name || matchEntry(name)) return;
        out.push({ key: s.id + "#L" + i, sale: s, kind: "line", idx: i, name, qty: qtyN(l.qty), paid: qtyN(l.qty) * (parseFloat(l.price) || 0) });
      });
    } else if (s.item) {
      const parts = String(s.item).split(/\)\s*,\s*/);
      parts.forEach((t, j) => {
        const m = t.match(/^(.*?)\s*\(x(\d+)\)?\s*$/i);
        const name = (m ? m[1] : t.replace(/\)\s*$/, "")).trim();
        if (!name || matchEntry(name)) return;
        out.push({ key: s.id + "#T" + j, sale: s, kind: "text", idx: j, name, qty: m ? Number(m[2]) : 1, paid: parts.length === 1 ? Number(s.amount) || 0 : null });
      });
    }
  });
  return out;
};

/* the sale after renaming — name (and item text) only */
const renamedSale = (sale, picks) => {
  const today = todayISO();
  if (Array.isArray(sale.saleLines) && sale.saleLines.length > 0) {
    const saleLines = sale.saleLines.map((l, i) => {
      const p = picks.find((x) => x.kind === "line" && x.idx === i);
      return p ? { ...l, name: p.entry.label, changedFrom: l.changedFrom || l.name, changedOn: today, cleanedOn: today } : l;
    });
    return { ...sale, saleLines, item: saleLines.map((l) => `${l.name}(x${qtyN(l.qty)})`).join(", ") };
  }
  const parts = String(sale.item || "").split(/\)\s*,\s*/).map((t, j) => {
    const m = t.match(/^(.*?)\s*\(x(\d+)\)?\s*$/i);
    const p = picks.find((x) => x.kind === "text" && x.idx === j);
    const name = p ? p.entry.label : (m ? m[1] : t.replace(/\)\s*$/, "")).trim();
    return m ? `${name}(x${m[2]})` : name;
  });
  return { ...sale, item: parts.join(", ") };
};

const csvCell = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
const downloadCsv = (picks) => {
  const head = ["Sale", "Date", "Customer", "Typed name", "New item", "Amount paid (line)"];
  const rows = picks.map((p) => [p.sale.invoiceNo || p.sale.id, p.sale.date, p.sale.customer, p.name, p.entry.label, p.paid == null ? "" : p.paid]);
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "item-name-changes-" + todayISO() + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export default function ItemNameCleanup({ sales, accent = "#e95597", onApply, onClose }) {
  const [period, setPeriod] = useState("3m");          // 3m | 12m | all
  const [show, setShow] = useState("all");             // all | suggested | manual
  const [choice, setChoice] = useState({});            // key → price-list entry id (overrides the suggestion)
  const [off, setOff] = useState({});                  // key → true = unticked
  const [other, setOther] = useState(null);            // key whose "search the list" box is open
  const [otherText, setOtherText] = useState("");
  const [busy, setBusy] = useState(null);              // {done,total} while applying

  const all = useMemo(() => collectRows(sales).map((r) => ({
    ...r,
    sugg: findListEntry(r.name, SHOP),
    cands: searchPriceList(r.name, SHOP, 8),
  })), [sales]);

  const cutoff = useMemo(() => {
    if (period === "all") return "";
    const d = new Date(); d.setMonth(d.getMonth() - (period === "3m" ? 3 : 12));
    return d.toISOString().slice(0, 10);
  }, [period]);

  const entryOf = (r) => {
    const id = choice[r.key];
    if (id) return PRICE_ENTRIES.find((e) => e.id === id) || null;
    return r.sugg || null;
  };
  const inPeriod = all.filter((r) => !cutoff || String(r.sale.date || "") >= cutoff);
  const shown = inPeriod
    .filter((r) => (show === "suggested" ? !!entryOf(r) : show === "manual" ? !entryOf(r) : true))
    .sort((a, b) => String(b.sale.date || "").localeCompare(String(a.sale.date || "")));
  const picks = inPeriod.filter((r) => entryOf(r) && !off[r.key]).map((r) => ({ ...r, entry: entryOf(r) }));
  const nSugg = inPeriod.filter((r) => entryOf(r)).length;
  const nManual = inPeriod.length - nSugg;

  const apply = async () => {
    if (!picks.length) return;
    if (!(await showConfirm("Rename " + picks.length + " item" + (picks.length === 1 ? "" : "s") + " on " + new Set(picks.map((p) => p.sale.id)).size + " sale(s)?\n\nOnly the item NAME changes — quantity, price and amount paid stay exactly as they are. A CSV of the changes will download first."))) return;
    downloadCsv(picks);
    const bySale = {};
    picks.forEach((p) => { (bySale[p.sale.id] = bySale[p.sale.id] || []).push(p); });
    const ids = Object.keys(bySale);
    let done = 0, failed = 0;
    setBusy({ done: 0, total: ids.length });
    for (const id of ids) {
      const sale = bySale[id][0].sale;
      try { const ok = await onApply(renamedSale(sale, bySale[id])); if (ok === false) failed++; } catch (e) { failed++; }
      done++; setBusy({ done, total: ids.length });
    }
    setBusy(null);
    await showAlert(failed ? (done - failed) + " sale(s) renamed, " + failed + " could not be saved — those were left unchanged. Run this screen again to retry them." : "Done — " + done + " sale(s) renamed. Amounts were not changed.");
    if (!failed) onClose();
  };

  const th = { padding: "7px 8px", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 };
  const td = { padding: "7px 8px", fontSize: 12, borderTop: "1px solid #f1f5f9", verticalAlign: "top" };
  const pill = (active) => ({ padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + (active ? accent : "#e2e8f0"), background: active ? accent : "white", color: active ? "white" : "#64748b" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={busy ? undefined : onClose} />
      <div style={{ position: "relative", background: "white", borderRadius: 16, width: "100%", maxWidth: 1000, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>🧹 Fix item names</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Renames hand-typed items to the price-list item. <b>Only the name changes</b> — quantity, price and amount paid stay as they are.</div>
          </div>
          <button onClick={onClose} disabled={!!busy} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: 18, color: "#64748b" }}>×</button>
        </div>

        <div style={{ padding: "10px 18px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>PERIOD</span>
          {[["3m", "Last 3 months"], ["12m", "Last 12 months"], ["all", "All sales"]].map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} style={pill(period === k)}>{l}</button>)}
          <span style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 4px" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>SHOW</span>
          {[["all", "All (" + inPeriod.length + ")"], ["suggested", "Match found (" + nSugg + ")"], ["manual", "Needs a person (" + nManual + ")"]].map(([k, l]) => <button key={k} onClick={() => setShow(k)} style={pill(show === k)}>{l}</button>)}
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {shown.length === 0 ? (
            <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{inPeriod.length === 0 ? "✅ Every item in this period already matches the price list." : "Nothing in this view."}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ ...th, width: 30 }} />
                <th style={th}>Date</th><th style={th}>Customer</th><th style={th}>Typed name</th>
                <th style={{ ...th, textAlign: "right" }}>Paid</th><th style={{ ...th, minWidth: 250 }}>Change to (price list)</th>
              </tr></thead>
              <tbody>
                {shown.map((r) => {
                  const en = entryOf(r);
                  const cands = r.cands.some((c) => en && c.id === en.id) || !en ? r.cands : [en, ...r.cands];
                  return (
                    <tr key={r.key} style={{ opacity: en && off[r.key] ? 0.5 : 1 }}>
                      <td style={td}><input type="checkbox" disabled={!en} checked={!!en && !off[r.key]} onChange={(e) => setOff((o) => ({ ...o, [r.key]: !e.target.checked }))} /></td>
                      <td style={{ ...td, whiteSpace: "nowrap", color: "#64748b" }}>{r.sale.date}</td>
                      <td style={{ ...td, fontWeight: 700, textTransform: "uppercase" }}>{r.sale.customer}</td>
                      <td style={td}>{r.name}{r.qty !== 1 && <span style={{ color: "#94a3b8" }}> ×{r.qty}</span>}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>{r.paid == null ? "—" : money(r.paid)}</td>
                      <td style={td}>
                        <select value={en ? en.id : ""} onChange={(e) => { if (e.target.value === "__other") { setOther(r.key); setOtherText(""); } else { setChoice((c) => ({ ...c, [r.key]: e.target.value })); setOff((o) => ({ ...o, [r.key]: false })); } }}
                          style={{ width: "100%", padding: "5px 7px", borderRadius: 7, border: "1px solid " + (en ? "#bbf7d0" : "#fde68a"), background: en ? "#f0fdf4" : "#fffbeb", fontSize: 12, fontFamily: "inherit" }}>
                          {!en && <option value="">— choose the item —</option>}
                          {cands.filter((c) => priceFor(c, SHOP) != null).map((c) => <option key={c.id} value={c.id}>{c.label} · {money(priceFor(c, SHOP))}</option>)}
                          <option value="__other">🔍 Search the whole list…</option>
                        </select>
                        {other === r.key && (
                          <div style={{ marginTop: 5 }}>
                            <ItemSuggestInput value={otherText} shopId={SHOP} onChange={setOtherText} placeholder="Search the price list…"
                              onPick={(e) => { setChoice((c) => ({ ...c, [r.key]: e.id })); setOff((o) => ({ ...o, [r.key]: false })); setOther(null); }}
                              style={{ width: "100%", padding: "5px 7px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>
            {busy ? "Saving… " + busy.done + " / " + busy.total + " sales" : picks.length + " item" + (picks.length === 1 ? "" : "s") + " ticked to rename · amounts are never changed"}
          </span>
          <button onClick={() => picks.length && downloadCsv(picks)} disabled={!picks.length || !!busy}
            style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 12, cursor: picks.length ? "pointer" : "default", fontFamily: "inherit", opacity: picks.length ? 1 : 0.5 }}>⬇ Change list (CSV)</button>
          <button onClick={apply} disabled={!picks.length || !!busy}
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: picks.length && !busy ? accent : "#cbd5e1", color: "white", fontWeight: 800, fontSize: 13, cursor: picks.length && !busy ? "pointer" : "default", fontFamily: "inherit" }}>
            ✓ Apply {picks.length || ""}
          </button>
        </div>
      </div>
    </div>
  );
}
