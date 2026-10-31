import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import { dbSaveExpense, dbLoadExpenses, dbDeleteExpense, dbSaveExpenseCategory } from "../db";
import { showAlert, showConfirm } from "./PopupHost";

/* ─────────────────────────────────────────────────────────────────────────
   EXPENSES — BANK PAYOUTS  (all three shops)

   Purpose: enter EVERY payout (debit) shown on the bank statement, one line
   per transaction, so month end is a tick-off exercise instead of a puzzle.

   • Quick-entry row pinned at the top — type, press Enter, next line.
     Date + bank account stay selected between lines.
   • Every payout records which bank account it left from.
   • A payout with no category or no purpose is automatically listed under
     "Needs review" (and you can flag one by hand: "not sure what this was").
   • "Match to bank statement" check per account / month.
   • Month Report: category x bank-account table, Excel (CSV) + PDF export.

   Data lives in the existing `expenses` table (same rows Petty Cash and the
   ledger already read). New optional columns: bank_account, bank_ref,
   needs_review (see expenses_bank_payouts.sql).
   ───────────────────────────────────────────────────────────────────────── */

const BANKS = {
  "ros-india": ["SIB", "HDFC", "FEDERAL BANK", "PAYPAL INDIA", "CASH"],
  "ros-selections": ["STARLING BANK", "CASH", "OTHER"],
  "ros-hairlines": ["LLOYDS BANK", "CASH", "OTHER"],
  default: ["BANK", "CASH", "OTHER"],
};
const BUILTIN_CATEGORIES = ["Rent", "Utilities", "Salaries", "Packaging", "Shipping", "Marketing", "Software", "Equipment", "Travel", "Professional Expenses", "Agents Expenses", "Other"];
// Payouts that are NOT business expenses: still entered (so the bank statement matches line for line)
// but kept out of the expense totals.
const DRAWINGS = "Owner's Drawings / Personal";
const TRANSFER = "Transfer";
const NON_EXPENSE_CATS = [DRAWINGS, TRANSFER];
const isNonExpense = (e) => NON_EXPENSE_CATS.includes((e.cat || "").trim());
const typeLabel = (e) => { const c = (e.cat || "").trim(); return c === DRAWINGS ? "Personal / drawings" : c === TRANSFER ? "Transfer between accounts" : "Business expense"; };
const METHODS = ["Bank Transfer", "UPI", "PayPal", "Card", "Cash", "Cheque", "Other"];
const ACC_COLORS = { "SIB": "#2563eb", "HDFC": "#1d4ed8", "FEDERAL BANK": "#c2410c", "PAYPAL INDIA": "#4338ca", "CASH": "#15803d", "STARLING BANK": "#7c3aed", "LLOYDS BANK": "#15803d", "BANK": "#0369a1", "PAYPAL": "#4338ca", "OTHER": "#64748b" };

const pad = (n) => String(n).padStart(2, "0");
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => localISO(new Date());
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (mk) => { if (!mk || mk === "ALL") return "All time"; const [y, m] = mk.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; };
const shiftMonth = (mk, off) => { const [y, m] = mk.split("-").map(Number); const d = new Date(y, m - 1 + off, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const fmtD = (d) => { if (!d) return "—"; const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; };
const fmtDY = (d) => { if (!d) return ""; const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const csvCell = (v) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const lsGet = (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

// A payout "needs review" when it was flagged by hand, or it has no category, or no purpose.
const isReview = (e) => !!e.needsReview || !(e.cat || "").trim() || (!(e.desc || "").trim() && !isNonExpense(e));
const reviewReason = (e) => {
  const r = [];
  if (!(e.cat || "").trim()) r.push("no category");
  if (!(e.desc || "").trim() && !isNonExpense(e)) r.push("no purpose");
  if (e.needsReview) r.push("flagged: not sure what this was");
  return r.join(" · ");
};

const CSS = `
.exq{--ink:#0f172a;--mut:#64748b;--line:#e5e9f0}
.exq *{box-sizing:border-box}
.exq-card{background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 4px rgba(15,23,42,.05)}
.exq-in{width:100%;padding:9px 11px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink)}
.exq-in:focus{border-color:var(--ac)}
.exq-lb{display:block;font-size:10.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.exq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end}
.exq-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;white-space:nowrap}
.exq-btn:hover:not(:disabled){background:#f8fafc;border-color:#cbd5e1}
.exq-btn:disabled{opacity:.5;cursor:not-allowed}
.exq-pri{background:var(--ac);color:#fff;border:none;box-shadow:0 3px 10px var(--acsh)}
.exq-pri:hover:not(:disabled){background:var(--ac);filter:brightness(1.07)}
.exq-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:600;font-size:12.5px;cursor:pointer;white-space:nowrap;font-family:inherit}
.exq-chip:hover{background:#f1f5f9}
.exq-chip b{font-size:10.5px;background:#e2e8f0;color:#64748b;border-radius:999px;padding:1px 7px;font-weight:800}
.exq-chip.on{background:var(--acbg);border-color:var(--ac);color:var(--actext);font-weight:800}
.exq-chip.on b{background:var(--ac);color:#fff}
.exq-chip.warn{background:#fef2f2;border-color:#fca5a5;color:#b91c1c}
.exq-chip.warn b{background:#fecaca;color:#b91c1c}
.exq-chip.warn.on{background:#dc2626;border-color:#dc2626;color:#fff}
.exq-chip.warn.on b{background:#fff;color:#dc2626}
.exq-seg{display:inline-flex;background:#f1f5f9;border:1px solid var(--line);border-radius:10px;padding:2px}
.exq-seg button{padding:7px 16px;border-radius:8px;border:none;background:transparent;font-weight:800;font-size:12.5px;color:#64748b;cursor:pointer;font-family:inherit}
.exq-seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(15,23,42,.14)}
.exq-th{padding:10px 14px;font-size:10.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap;text-align:left}
.exq-td{padding:10px 14px;vertical-align:middle;border-bottom:1px solid #f1f5f9;font-size:13px}
.exq-row:hover td{background:#fafcff}
.exq-row.rv td{background:#fff7ed}
.exq-row.rv td:first-child{box-shadow:inset 3px 0 0 #ef4444}
.exq-kpi{padding:12px 16px;border-radius:12px;border:1px solid var(--line);background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.04)}
.exq-kpi.click{cursor:pointer}.exq-kpi.click:hover{border-color:#cbd5e1}
@media (max-width:700px){.exq-hide-sm{display:none}}
`;

export default function BankPayoutsPanel({ exps: allExps = [], fmt, shop, shopId, setExpData, expCats = [], setExpCats, pushDeleted }) {
  const banks = BANKS[shopId] || BANKS.default;
  // Petty Cash spends are mirrored into `expenses` by the Petty Cash page (category "Petty Cash").
  // They are cash, not bank payouts, so this page leaves them out (nothing is deleted — they stay
  // on the Petty Cash page and in the shop's overall expense totals).
  const isPettyCash = (e) => (e.cat || "").trim().toLowerCase() === "petty cash";
  const exps = useMemo(() => allExps.filter(e => !isPettyCash(e)), [allExps]);
  const CATEGORIES = [...BUILTIN_CATEGORIES, ...expCats.filter(c => !BUILTIN_CATEGORIES.includes(c) && !NON_EXPENSE_CATS.includes(c) && c.trim().toLowerCase() !== "petty cash")];
  const ac = shop?.accent || "#6366f1";
  const acText = shop?.accentText || ac;
  const acBg = shop?.accentBg || ac + "14";
  const cssVars = { "--ac": ac, "--actext": acText, "--acbg": acBg, "--acsh": ac + "44" };

  const [view, setView] = useState("entries");             // "entries" | "report"
  const [month, setMonth] = useState(todayISO().slice(0, 7)); // "YYYY-MM" | "ALL"
  const [acctFilter, setAcctFilter] = useState("ALL");      // "ALL" | account | "NONE"
  const [catFilter, setCatFilter] = useState("ALL");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [editExp, setEditExp] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openCat, setOpenCat] = useState({});
  const [showMore, setShowMore] = useState(false);
  const payToRef = useRef(null);

  const blank = () => ({ payTo: "", desc: "", cat: "", amount: "", ref: "", invoiceNo: "", notes: "", review: false });
  const [qf, setQf] = useState(() => ({
    date: todayISO(),
    bank: banks.includes(lsGet("ros_exp_bank_" + shopId)) ? lsGet("ros_exp_bank_" + shopId) : banks[0],
    method: "Bank Transfer",
    ...blank(),
  }));
  const setQ = (k, v) => setQf(p => ({ ...p, [k]: v }));

  // Reset per-shop bits when the shop is switched.
  useEffect(() => {
    const saved = lsGet("ros_exp_bank_" + shopId);
    setQf(p => ({ ...p, bank: banks.includes(saved) ? saved : banks[0] }));
    setAcctFilter("ALL"); setCatFilter("ALL"); setReviewOnly(false); setSearch(""); setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  /* ── derived data ───────────────────────────────────────────── */
  const acctKey = (e) => (e.bankAccount || "").trim() || "NONE";
  const acctLabel = (k) => k === "NONE" ? "Not specified" : k;
  const inMonth = useMemo(() => exps.filter(e => month === "ALL" || (e.date || "").slice(0, 7) === month), [exps, month]);
  const monthTotal = inMonth.reduce((a, e) => a + (Number(e.amount) || 0), 0);                          // every debit (matches the bank statements)
  const expenseTotal = inMonth.filter(e => !isNonExpense(e)).reduce((a, e) => a + (Number(e.amount) || 0), 0);   // business expenses only
  const drawTotal = inMonth.filter(e => (e.cat || "").trim() === DRAWINGS).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const transferTotal = inMonth.filter(e => (e.cat || "").trim() === TRANSFER).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const nonExpTotal = drawTotal + transferTotal;
  const reviewList = inMonth.filter(isReview);
  const reviewTotal = reviewList.reduce((a, e) => a + (Number(e.amount) || 0), 0);

  const acctStats = useMemo(() => {
    const m = {};
    inMonth.forEach(e => { const k = acctKey(e); (m[k] ||= { n: 0, total: 0 }); m[k].n++; m[k].total += Number(e.amount) || 0; });
    return m;
  }, [inMonth]);
  const acctKeys = useMemo(() => {
    const present = Object.keys(acctStats);
    const known = banks.filter(b => present.includes(b));
    const extra = present.filter(k => k !== "NONE" && !banks.includes(k));
    return [...known, ...extra, ...(present.includes("NONE") ? ["NONE"] : [])];
  }, [acctStats, banks]);

  const months = useMemo(() => {
    const s = new Set(exps.map(e => (e.date || "").slice(0, 7)).filter(Boolean));
    s.add(todayISO().slice(0, 7));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [exps]);

  const payees = useMemo(() => {
    const latest = {};
    exps.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).forEach(e => {
      const k = (e.payTo || "").trim().toLowerCase();
      if (k && !latest[k]) latest[k] = e;
    });
    return latest;
  }, [exps]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = inMonth.filter(e => {
      if (acctFilter !== "ALL" && acctKey(e) !== acctFilter) return false;
      if (catFilter !== "ALL" && (e.cat || "") !== (catFilter === "NONE" ? "" : catFilter)) return false;
      if (reviewOnly && !isReview(e)) return false;
      if (q && !((e.payTo || "").toLowerCase().includes(q) || (e.desc || "").toLowerCase().includes(q) || (e.cat || "").toLowerCase().includes(q)
        || (e.bankRef || "").toLowerCase().includes(q) || (e.invoiceNo || "").toLowerCase().includes(q) || String(e.amount).includes(q))) return false;
      return true;
    });
    out.sort((a, b) => {
      const d = (a.date || "").localeCompare(b.date || "");
      return newestFirst ? -d : d;
    });
    return out;
  }, [inMonth, acctFilter, catFilter, reviewOnly, search, newestFirst]);
  const listTotal = list.reduce((a, e) => a + (Number(e.amount) || 0), 0);

  const usedCats = useMemo(() => Array.from(new Set(inMonth.map(e => e.cat).filter(Boolean))).sort(), [inMonth]);

  /* ── statement check (saved on this computer) ───────────────── */
  const stmtKey = `ros_exp_stmt_${shopId}_${month}_${acctFilter}`;
  const [stmtTotal, setStmtTotal] = useState("");
  useEffect(() => { setStmtTotal(lsGet(stmtKey)); }, [stmtKey]);
  const stmtOn = month !== "ALL" && acctFilter !== "ALL";
  const entered = stmtOn ? (acctStats[acctFilter]?.total || 0) : 0;
  const stmtNum = parseFloat(stmtTotal);
  const stmtDiff = Number.isFinite(stmtNum) ? Math.round((stmtNum - entered) * 100) / 100 : null;

  /* ── saving ─────────────────────────────────────────────────── */
  const persist = async (payload, uuid) => {
    setSaving(true);
    const res = await dbSaveExpense(shopId, uuid ? { ...payload, _uuid: uuid } : payload);
    if (res && res.error) {
      const hint = /bank_account|bank_ref|needs_review/i.test(res.error) ? "\n\nThe database needs the new columns first — run expenses_bank_payouts.sql in Supabase." : "";
      showAlert("Save failed: " + res.error + hint);
      setSaving(false);
      return false;
    }
    const fresh = await dbLoadExpenses(shopId).catch(() => null);
    if (fresh) setExpData(fresh);
    setSaving(false);
    return true;
  };

  const toPayload = (f) => ({
    date: f.date, cat: f.cat || "", desc: (f.desc || "").trim(), amount: f.amount, method: f.method || "Bank Transfer",
    notes: f.notes || "", payTo: (f.payTo || "").trim(), invoiceNo: f.invoiceNo || "", invoiceDate: f.invoiceDate || "",
    bankAccount: f.bank, bankRef: (f.ref || "").trim(), needsReview: !!f.review,
  });

  const findDuplicate = (f, ignoreId) => exps.find(e => (e.uuid || e.id) !== ignoreId && e.date === f.date && acctKey(e) === f.bank
    && Math.abs((Number(e.amount) || 0) - (Number(f.amount) || 0)) < 0.005 && (e.payTo || "").trim().toLowerCase() === (f.payTo || "").trim().toLowerCase());

  const validate = (f) => {
    if (!f.date) return "Please pick the date.";
    if (!f.bank) return "Please choose the bank account the money left from.";
    if (!(Number(f.amount) > 0)) return "Please enter the amount.";
    if (!(f.payTo || "").trim() && !(f.desc || "").trim()) return "Please enter who it was paid to (or what it was for).";
    return "";
  };

  const submitQuick = async (ev) => {
    if (ev) ev.preventDefault();
    if (saving) return;
    const bad = validate(qf);
    if (bad) { showAlert(bad); return; }
    if (findDuplicate(qf)) {
      if (!(await showConfirm(`An entry for ${qf.payTo.trim() || "this payee"} — ${fmt(shopId, Number(qf.amount))} on ${fmtDY(qf.date)} from ${qf.bank} already exists.\n\nAdd it again anyway?`))) return;
    }
    const ok = await persist(toPayload(qf));
    if (!ok) return;
    lsSet("ros_exp_bank_" + shopId, qf.bank);
    const wasReview = qf.review || !qf.cat || !(qf.desc || "").trim();
    setNote(`✓ Added ${qf.payTo.trim() || qf.desc.trim()} — ${fmt(shopId, Number(qf.amount))}` + (wasReview ? " · listed under Needs review (add category / purpose later)" : ""));
    const savedMonth = (qf.date || "").slice(0, 7);
    if (month !== "ALL" && savedMonth !== month) setMonth(savedMonth);
    setReviewOnly(false); setCatFilter("ALL"); setSearch("");
    if (acctFilter !== "ALL" && acctFilter !== qf.bank) setAcctFilter("ALL");
    setQf(p => ({ ...p, ...blank() }));
    setTimeout(() => payToRef.current && payToRef.current.focus(), 30);
  };

  const onPayTo = (v) => {
    setQf(p => {
      const next = { ...p, payTo: v };
      const m = payees[v.trim().toLowerCase()];
      // Same payee as an earlier payout → pre-fill category / purpose / method (only if still untouched).
      if (m && !p.cat && !p.desc) {
        next.cat = m.cat || ""; next.desc = m.desc || "";
        if (m.method && METHODS.includes(m.method)) next.method = m.method;
      }
      return next;
    });
  };

  const addCategory = (onDone) => {
    const newCat = window.prompt("Enter new category name:");
    if (!newCat || !newCat.trim()) return;
    const name = newCat.trim();
    dbSaveExpenseCategory(shopId, name).then(r => {
      if (!r || !r.error) { if (setExpCats) setExpCats(prev => [...prev.filter(c => c !== name), name].sort()); onDone(name); }
      else showAlert("Failed to save category: " + r.error);
    });
  };

  const quickSetCategory = async (e, cat) => {
    await persist({
      date: e.date, cat, desc: e.desc || "", amount: e.amount, method: e.method || "", notes: e.notes || "", payTo: e.payTo || "",
      invoiceNo: e.invoiceNo || "", invoiceDate: e.invoiceDate || "", bankAccount: e.bankAccount || "", bankRef: e.bankRef || "", needsReview: !!e.needsReview,
    }, e.uuid || e.id);
  };

  const handleDelete = async (e) => {
    if (pushDeleted) pushDeleted("expense", { ...e });
    await dbDeleteExpense(e.uuid || e.id, shopId);
    setExpData(prev => prev.filter(x => (x.uuid || x.id) !== (e.uuid || e.id)));
    setConfirmDelete(null);
  };

  /* ── report (category x account) ────────────────────────────── */
  const report = useMemo(() => {
    const cats = {};
    inMonth.forEach(e => {
      const c = (e.cat || "").trim() || "";
      const o = (cats[c] ||= { cat: c, total: 0, n: 0, byAcct: {}, rows: [] });
      const a = acctKey(e); const amt = Number(e.amount) || 0;
      o.total += amt; o.n++; o.byAcct[a] = (o.byAcct[a] || 0) + amt; o.rows.push(e);
    });
    const rows = Object.values(cats).sort((a, b) => b.total - a.total);
    rows.forEach(r => r.rows.sort((x, y) => (x.date || "").localeCompare(y.date || "")));
    const colTotals = {};
    inMonth.forEach(e => { const a = acctKey(e); colTotals[a] = (colTotals[a] || 0) + (Number(e.amount) || 0); });
    const colTotalsExp = {};
    inMonth.filter(e => !isNonExpense(e)).forEach(e => { const a = acctKey(e); colTotalsExp[a] = (colTotalsExp[a] || 0) + (Number(e.amount) || 0); });
    return {
      rows, colTotals,                       // colTotals = every debit per account
      expRows: rows.filter(r => !NON_EXPENSE_CATS.includes(r.cat)),
      otherRows: rows.filter(r => NON_EXPENSE_CATS.includes(r.cat)),
      colTotalsExp,                          // business expenses per account
    };
  }, [inMonth]);

  const sortedForExport = () => inMonth.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.bankAccount || "").localeCompare(b.bankAccount || ""));

  const exportCSV = () => {
    const rows = [[`${shop?.name || shopId} — Bank payouts — ${monthLabel(month)}`], [],
      ["Date", "Bank Account", "Paid To", "Purpose", "Category", "Type", "Method", "Bank Ref / UTR", "Invoice No.", "Invoice Date", "Amount", "Notes", "Needs Review"]];
    sortedForExport().forEach(e => rows.push([fmtDY(e.date), acctLabel(acctKey(e)), e.payTo || "", e.desc || "", e.cat || "(uncategorised)", typeLabel(e), e.method || "", e.bankRef || "", e.invoiceNo || "", fmtDY(e.invoiceDate), Number(e.amount) || 0, e.notes || "", isReview(e) ? "YES — " + reviewReason(e) : ""]));
    rows.push([], ["TOTAL DEBITS (all payouts — matches the bank statements)", "", "", "", "", "", "", "", "", "", monthTotal], [], ["SUMMARY BY CATEGORY"]);
    const cols = acctKeys;
    rows.push(["Category", ...cols.map(acctLabel), "Total", "No. of payouts"]);
    report.expRows.forEach(r => rows.push([r.cat || "(uncategorised)", ...cols.map(k => r.byAcct[k] || 0), r.total, r.n]));
    rows.push(["BUSINESS EXPENSES TOTAL", ...cols.map(k => report.colTotalsExp[k] || 0), expenseTotal, inMonth.filter(e => !isNonExpense(e)).length]);
    if (report.otherRows.length) {
      rows.push([], ["NOT BUSINESS EXPENSES"]);
      report.otherRows.forEach(r => rows.push([r.cat, ...cols.map(k => r.byAcct[k] || 0), r.total, r.n]));
      rows.push(["TOTAL DEBITS", ...cols.map(k => report.colTotals[k] || 0), monthTotal, inMonth.length]);
    }
    const csv = rows.map(r => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payouts_${shopId}_${month === "ALL" ? "all" : month}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const printPDF = () => {
    const sym = shop?.symbol || "";
    const money = (n) => sym + (Number(n) || 0).toLocaleString(shopId === "ros-india" ? "en-IN" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const cols = acctKeys;
    const w = window.open("", "_blank");
    if (!w) { showAlert("Pop-up blocked — please allow pop-ups for this site to print / save as PDF."); return; }
    const sumRow = (r) => `<tr><td>${esc(r.cat || "⚠ Uncategorised")}</td>${cols.map(k => `<td class="n">${r.byAcct[k] ? money(r.byAcct[k]) : "—"}</td>`).join("")}<td class="n b">${money(r.total)}</td><td class="n">${r.n}</td></tr>`;
    const totRow = (label, tot, n, byA, cls) => `<tr class="${cls}"><td>${label}</td>${cols.map(k => `<td class="n">${money(byA[k] || 0)}</td>`).join("")}<td class="n">${money(tot)}</td><td class="n">${n}</td></tr>`;
    const nExp = inMonth.filter(e => !isNonExpense(e)).length;
    const summary = report.expRows.map(sumRow).join("")
      + totRow("BUSINESS EXPENSES", expenseTotal, nExp, report.colTotalsExp, "tot")
      + (report.otherRows.length
        ? `<tr><td colspan="${cols.length + 3}" class="sub">Not business expenses (personal withdrawals and transfers between own accounts)</td></tr>` + report.otherRows.map(sumRow).join("")
          + totRow("TOTAL DEBITS (matches bank statements)", monthTotal, inMonth.length, report.colTotals, "tot")
        : "");
    const detail = sortedForExport().map(e => `<tr class="${isReview(e) ? "rv" : ""}"><td>${fmtDY(e.date)}</td><td>${esc(acctLabel(acctKey(e)))}</td><td>${esc(e.payTo || "—")}</td><td>${esc(e.desc || "—")}</td><td>${esc(e.cat || "⚠ Uncategorised")}</td><td>${esc(typeLabel(e))}</td><td>${esc(e.bankRef || "")}</td><td class="n b">${money(e.amount)}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bank payouts — ${esc(monthLabel(month))}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px;font-size:12px}h1{font-size:18px;margin:0}h2{font-size:14px;margin:22px 0 8px}p{margin:3px 0 0;color:#64748b}
table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:6px 8px;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #cbd5e1}
td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}.n{text-align:right;white-space:nowrap}.b{font-weight:700}tr.rv td{background:#fff7ed}tr.tot td{font-weight:800;border-top:2px solid #0f172a;background:#f8fafc}td.sub{background:#f1f5f9;font-weight:700;color:#475569;font-size:11px}
@media print{body{margin:10mm}h2{page-break-after:avoid}tr{page-break-inside:avoid}}</style></head><body>
<h1>${esc(shop?.name || shopId)} — Bank payouts</h1><p>${esc(monthLabel(month))} · ${inMonth.length} payout${inMonth.length !== 1 ? "s" : ""} · Business expenses ${money(expenseTotal)}${nonExpTotal ? ` · Personal / transfers ${money(nonExpTotal)}` : ""} · Total debits ${money(monthTotal)}${reviewList.length ? ` · ⚠ ${reviewList.length} still need review (${money(reviewTotal)})` : ""}</p>
<h2>Summary by category</h2>
<table><thead><tr><th>Category</th>${cols.map(k => `<th class="n">${esc(acctLabel(k))}</th>`).join("")}<th class="n">Total</th><th class="n">Payouts</th></tr></thead><tbody>${summary}</tbody></table>
<h2>All payouts (date order)</h2>
<table><thead><tr><th>Date</th><th>Bank</th><th>Paid to</th><th>Purpose</th><th>Category</th><th>Type</th><th>Bank ref</th><th class="n">Amount</th></tr></thead><tbody>${detail}</tbody></table>
<p style="margin-top:14px">Shaded rows need review.</p></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  /* ── small UI pieces ────────────────────────────────────────── */
  const acctPill = (k) => (
    <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap",
      color: k === "NONE" ? "#94a3b8" : (ACC_COLORS[k] || "#475569"), background: k === "NONE" ? "#f1f5f9" : (ACC_COLORS[k] || "#475569") + "14", border: "1px solid " + (k === "NONE" ? "#e2e8f0" : (ACC_COLORS[k] || "#475569") + "40") }}>
      {acctLabel(k)}
    </span>
  );

  const categorySelect = (value, onChange, style) => (
    <select className="exq-in" style={style} value={value} onChange={ev => { if (ev.target.value === "__add_new__") addCategory(onChange); else onChange(ev.target.value); }}>
      <option value="">— Select —</option>
      <optgroup label="Business expenses">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
      <optgroup label="Not a business expense (kept out of totals)">{NON_EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
      <option disabled>──────────</option>
      <option value="__add_new__">➕ Add new category…</option>
    </select>
  );

  const monthBar = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <button className="exq-btn" style={{ padding: "7px 11px" }} disabled={month === "ALL"} onClick={() => setMonth(shiftMonth(month, -1))} title="Previous month">‹</button>
      <select className="exq-in" style={{ width: 170, fontWeight: 800 }} value={month} onChange={ev => setMonth(ev.target.value)}>
        <option value="ALL">All time</option>
        {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
      <button className="exq-btn" style={{ padding: "7px 11px" }} disabled={month === "ALL" || month >= todayISO().slice(0, 7)} onClick={() => setMonth(shiftMonth(month, 1))} title="Next month">›</button>
    </div>
  );

  /* ── Edit modal (all fields) — state lives here so a re-render never wipes what was typed ── */
  const [ef, setEf] = useState(null);
  const sE = (k, v) => setEf(p => ({ ...p, [k]: v }));
  const openEdit = (e) => {
    setEditExp(e);
    setEf({
      date: e.date || todayISO(), bank: (e.bankAccount || "").trim(), method: e.method || "Bank Transfer",
      payTo: e.payTo || "", desc: e.desc || "", cat: e.cat || "", amount: String(e.amount ?? ""), ref: e.bankRef || "",
      invoiceNo: e.invoiceNo || "", invoiceDate: e.invoiceDate || "", notes: e.notes || "", review: !!e.needsReview,
    });
  };
  const closeEdit = () => { setEditExp(null); setEf(null); };
  const saveEdit = async () => {
    const bad = validate({ ...ef, bank: ef.bank || "—" });
    if (bad) { showAlert(bad); return; }
    const ok = await persist(toPayload(ef), editExp.uuid || editExp.id);
    if (ok) closeEdit();
  };
  const editModal = () => {
    const methods = METHODS.includes(ef.method) ? METHODS : [...METHODS, ef.method];
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)" }} onClick={closeEdit} />
        <div className="exq" style={{ ...cssVars, position: "relative", background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(0,0,0,.2)", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", zIndex: 81 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: acBg, borderRadius: "18px 18px 0 0" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>✏️ Edit Expense</h3>
            <button onClick={closeEdit} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: 16, color: "#64748b" }}>×</button>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="exq-lb">Date</label><input className="exq-in" type="date" value={ef.date} onChange={e => sE("date", e.target.value)} /></div>
              <div><label className="exq-lb">Bank account</label>
                <select className="exq-in" value={ef.bank} onChange={e => sE("bank", e.target.value)}>
                  <option value="">— Select —</option>
                  {[...banks, ...(ef.bank && !banks.includes(ef.bank) ? [ef.bank] : [])].map(b => <option key={b} value={b}>{b}</option>)}
                </select></div>
            </div>
            <div><label className="exq-lb">Paid to</label><input className="exq-in" list="exq-payees" value={ef.payTo} onChange={e => sE("payTo", e.target.value)} placeholder="Person or company name" /></div>
            <div><label className="exq-lb">What was it for?</label><input className="exq-in" value={ef.desc} onChange={e => sE("desc", e.target.value)} placeholder="Purpose of this payout" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="exq-lb">Category</label>{categorySelect(ef.cat, v => sE("cat", v))}</div>
              <div><label className="exq-lb">Amount ({shop?.symbol})</label><input className="exq-in" type="number" step="0.01" value={ef.amount} onChange={e => sE("amount", e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="exq-lb">Payment method</label>
                <select className="exq-in" value={ef.method} onChange={e => sE("method", e.target.value)}>{methods.map(m => <option key={m}>{m}</option>)}</select></div>
              <div><label className="exq-lb">Bank ref / UTR</label><input className="exq-in" value={ef.ref} onChange={e => sE("ref", e.target.value)} placeholder="From the statement" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="exq-lb">Invoice No.</label><input className="exq-in" value={ef.invoiceNo} onChange={e => sE("invoiceNo", e.target.value)} placeholder="e.g. INV-0042" /></div>
              <div><label className="exq-lb">Invoice Date</label><input className="exq-in" type="date" value={ef.invoiceDate} onChange={e => sE("invoiceDate", e.target.value)} /></div>
            </div>
            <div><label className="exq-lb">Notes</label><textarea className="exq-in" rows={2} value={ef.notes} onChange={e => sE("notes", e.target.value)} placeholder="Optional notes…" style={{ resize: "vertical" }} /></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "#b45309", cursor: "pointer" }}>
              <input type="checkbox" checked={ef.review} onChange={e => sE("review", e.target.checked)} /> ❓ Not sure what this payout was — keep it under Needs review
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 4 }}>
              <button className="exq-btn exq-pri" style={{ padding: "11px 0" }} disabled={saving} onClick={saveEdit}>{saving ? "Saving…" : "💾 Save Expense"}</button>
              <button className="exq-btn" style={{ padding: "11px 0" }} onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCatRow = (r, showShare) => {
    const open = !!openCat[r.cat];
    return (
      <Fragment key={"c" + r.cat}>
        <tr className="exq-row" style={{ cursor: "pointer" }} onClick={() => setOpenCat(p => ({ ...p, [r.cat]: !p[r.cat] }))}>
          <td className="exq-td" style={{ fontWeight: 800 }}>{open ? "▾" : "▸"} {r.cat || <span style={{ color: "#dc2626" }}>⚠ Uncategorised</span>}</td>
          {acctKeys.map(k => <td key={k} className="exq-td" style={{ textAlign: "right", color: r.byAcct[k] ? "#0f172a" : "#cbd5e1" }}>{r.byAcct[k] ? fmt(shopId, r.byAcct[k]) : "—"}</td>)}
          <td className="exq-td" style={{ textAlign: "right", fontWeight: 800, color: showShare ? "#dc2626" : "#475569" }}>{fmt(shopId, r.total)}</td>
          <td className="exq-td" style={{ textAlign: "right", color: "#64748b" }}>{r.n}</td>
          <td className="exq-td" style={{ textAlign: "right", color: "#64748b" }}>{showShare ? (expenseTotal ? Math.round((r.total / expenseTotal) * 100) : 0) + "%" : ""}</td>
        </tr>
        {open && r.rows.map(e => (
          <tr key={"d" + (e.uuid || e.id)} style={{ background: "#f8fafc" }}>
            <td className="exq-td" colSpan={acctKeys.length + 4} style={{ padding: "7px 14px 7px 34px", fontSize: 12.5 }}>
              <span style={{ display: "inline-block", width: 70, color: "#64748b", fontWeight: 700 }}>{fmtD(e.date)}</span>
              <span style={{ display: "inline-block", width: 110 }}>{acctPill(acctKey(e))}</span>
              <span style={{ fontWeight: 700 }}>{e.payTo || "—"}</span>
              <span style={{ color: "#64748b" }}> · {e.desc || "no purpose"}</span>
              <span style={{ float: "right", fontWeight: 800, color: showShare ? "#dc2626" : "#475569" }}>{fmt(shopId, Number(e.amount) || 0)}</span>
            </td>
          </tr>
        ))}
      </Fragment>
    );
  };

  /* ═════════════════════════ RENDER ═════════════════════════ */
  const sym = shop?.symbol || "";
  return (
    <div className="exq" style={{ ...cssVars, fontFamily: "inherit", color: "#0f172a" }}>
      <style>{CSS}</style>
      <datalist id="exq-payees">{Object.values(payees).slice(0, 400).map(e => <option key={(e.payTo || "").toLowerCase()} value={e.payTo} />)}</datalist>

      {/* Header */}
      <div style={{ padding: "18px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>💳 Expenses</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Bank payouts — enter every debit from the statement, one line each · Petty Cash spends stay on the Petty Cash page</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {monthBar()}
          <div className="exq-seg">
            <button className={view === "entries" ? "on" : ""} onClick={() => setView("entries")}>✍️ Entries</button>
            <button className={view === "report" ? "on" : ""} onClick={() => setView("report")}>📊 Month Report</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: "0 20px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        <div className="exq-kpi"><div className="exq-lb" style={{ margin: 0 }}>💳 Business expenses · {monthLabel(month)}</div><div style={{ fontSize: 20, fontWeight: 900, color: "#dc2626" }}>{fmt(shopId, expenseTotal)}</div>
          {nonExpTotal > 0 && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>+ {fmt(shopId, nonExpTotal)} personal / transfers (not an expense) · total debits {fmt(shopId, monthTotal)}</div>}</div>
        <div className="exq-kpi"><div className="exq-lb" style={{ margin: 0 }}>🧾 Entries</div><div style={{ fontSize: 20, fontWeight: 900, color: ac }}>{inMonth.length}</div></div>
        <div className={"exq-kpi" + (reviewList.length ? " click" : "")} style={reviewList.length ? { borderColor: "#fca5a5", background: "#fef2f2" } : undefined}
          onClick={() => { if (reviewList.length) { setView("entries"); setReviewOnly(true); setAcctFilter("ALL"); setCatFilter("ALL"); } }}>
          <div className="exq-lb" style={{ margin: 0, color: reviewList.length ? "#b91c1c" : "#64748b" }}>{reviewList.length ? "⚠" : "✅"} Needs review</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: reviewList.length ? "#dc2626" : "#15803d" }}>{reviewList.length}{reviewList.length ? <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 8 }}>{fmt(shopId, reviewTotal)}</span> : <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 8 }}>all clear</span>}</div>
        </div>
      </div>

      {view === "entries" && (
        <>
          {/* Quick entry */}
          <div style={{ padding: "0 20px 14px" }}>
            <form className="exq-card" onSubmit={submitQuick} style={{ padding: 14, borderColor: ac + "66", boxShadow: "0 4px 18px " + ac + "1f" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: acText }}>⚡ Quick entry — one line per bank statement payout</div>
                <div style={{ fontSize: 11.5, color: "#94a3b8" }}>Press Enter to add · date and bank stay for the next line</div>
              </div>
              <div className="exq-grid">
                <div><label className="exq-lb">Date</label><input className="exq-in" type="date" value={qf.date} onChange={e => setQ("date", e.target.value)} /></div>
                <div><label className="exq-lb">Bank account</label>
                  <select className="exq-in" value={qf.bank} onChange={e => setQ("bank", e.target.value)}>{banks.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                <div style={{ gridColumn: "span 1" }}><label className="exq-lb">Paid to</label>
                  <input ref={payToRef} className="exq-in" list="exq-payees" value={qf.payTo} onChange={e => onPayTo(e.target.value)} placeholder="Person / company" autoComplete="off" /></div>
                <div><label className="exq-lb">What was it for?</label>
                  <input className="exq-in" value={qf.desc} onChange={e => setQ("desc", e.target.value)} placeholder="Purpose (can add later)" /></div>
                <div><label className="exq-lb">Category</label>{categorySelect(qf.cat, v => setQ("cat", v))}</div>
                <div><label className="exq-lb">Amount ({sym})</label>
                  <input className="exq-in" type="number" step="0.01" min="0" inputMode="decimal" value={qf.amount} onChange={e => setQ("amount", e.target.value)} placeholder="0.00" style={{ fontWeight: 800 }} /></div>
                <div><button type="submit" className="exq-btn exq-pri" style={{ width: "100%", padding: "10px 14px", fontSize: 13.5 }} disabled={saving}>{saving ? "Saving…" : "＋ Add"}</button></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" className="exq-chip" onClick={() => setShowMore(v => !v)}>{showMore ? "▾" : "▸"} More details (method, bank ref / UTR, invoice, notes)</button>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#b45309", cursor: "pointer" }}>
                  <input type="checkbox" checked={qf.review} onChange={e => setQ("review", e.target.checked)} /> ❓ Not sure what this was — review later
                </label>
              </div>
              {showMore && (
                <div className="exq-grid" style={{ marginTop: 10 }}>
                  <div><label className="exq-lb">Payment method</label>
                    <select className="exq-in" value={qf.method} onChange={e => setQ("method", e.target.value)}>{METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
                  <div><label className="exq-lb">Bank ref / UTR</label><input className="exq-in" value={qf.ref} onChange={e => setQ("ref", e.target.value)} placeholder="From the statement" /></div>
                  <div><label className="exq-lb">Invoice No.</label><input className="exq-in" value={qf.invoiceNo} onChange={e => setQ("invoiceNo", e.target.value)} placeholder="e.g. INV-0042" /></div>
                  <div style={{ gridColumn: "span 2" }}><label className="exq-lb">Notes</label><input className="exq-in" value={qf.notes} onChange={e => setQ("notes", e.target.value)} placeholder="Optional notes…" /></div>
                </div>
              )}
              {note && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: "#15803d" }}>{note}</div>}
            </form>
          </div>

          {/* Filters */}
          <div style={{ padding: "0 20px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span className="exq-lb" style={{ margin: "0 4px 0 0" }}>Bank</span>
              <button className={"exq-chip" + (acctFilter === "ALL" ? " on" : "")} onClick={() => setAcctFilter("ALL")}>All <b>{inMonth.length}</b></button>
              {acctKeys.map(k => (
                <button key={k} className={"exq-chip" + (acctFilter === k ? " on" : "")} onClick={() => setAcctFilter(acctFilter === k ? "ALL" : k)}>
                  {acctLabel(k)} <b>{acctStats[k].n}</b><span style={{ fontSize: 11, opacity: .8 }}>{fmt(shopId, acctStats[k].total)}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button className={"exq-chip warn" + (reviewOnly ? " on" : "")} onClick={() => setReviewOnly(v => !v)}>⚠ Needs review <b>{reviewList.length}</b></button>
              <select className="exq-in" style={{ width: 190 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="ALL">All categories</option>
                <option value="NONE">⚠ Uncategorised</option>
                {usedCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="exq-in" style={{ width: 230 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search paid to, purpose, ref, amount…" />
              <button className="exq-btn" onClick={() => setNewestFirst(v => !v)} title="Statement order is oldest first">{newestFirst ? "⬇ Newest first" : "⬆ Oldest first (statement order)"}</button>
              {(reviewOnly || catFilter !== "ALL" || acctFilter !== "ALL" || search) && <button className="exq-btn" onClick={() => { setReviewOnly(false); setCatFilter("ALL"); setAcctFilter("ALL"); setSearch(""); }}>Clear filters</button>}
              <span style={{ flex: 1 }} />
              <button className="exq-btn" onClick={exportCSV} disabled={!inMonth.length}>⬇ Excel (CSV)</button>
              <button className="exq-btn" onClick={printPDF} disabled={!inMonth.length}>🖨️ Print / PDF</button>
            </div>
          </div>

          {/* Statement check */}
          {stmtOn && (
            <div style={{ padding: "0 20px 12px" }}>
              <div className="exq-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "#f8fafc" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800 }}>🏦 Match to bank statement · {acctLabel(acctFilter)} · {monthLabel(month)}</div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                  Total debits on the statement ({sym})
                  <input className="exq-in" type="number" step="0.01" style={{ width: 140 }} value={stmtTotal}
                    onChange={e => { setStmtTotal(e.target.value); lsSet(stmtKey, e.target.value); }} placeholder="from the bank" />
                </label>
                <div style={{ fontSize: 12.5 }}>Entered here: <b>{fmt(shopId, entered)}</b> ({acctStats[acctFilter]?.n || 0} lines, incl. personal &amp; transfers)</div>
                {stmtDiff !== null && (stmtDiff === 0
                  ? <span style={{ fontSize: 12.5, fontWeight: 800, color: "#15803d" }}>✅ Matches the statement</span>
                  : <span style={{ fontSize: 12.5, fontWeight: 800, color: "#b91c1c" }}>⚠ {stmtDiff > 0 ? "Statement is higher by " : "Entered is higher by "}{fmt(shopId, Math.abs(stmtDiff))} — {stmtDiff > 0 ? "a payout is missing" : "something is entered twice or wrongly"}</span>)}
                <span style={{ fontSize: 11, color: "#94a3b8" }}>(saved on this computer)</span>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ padding: "0 20px 20px" }}>
            <div className="exq-card" style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th className="exq-th">Date</th><th className="exq-th">Bank</th><th className="exq-th">Paid to / Purpose</th>
                      <th className="exq-th">Category</th><th className="exq-th exq-hide-sm">Method · Ref</th>
                      <th className="exq-th" style={{ textAlign: "right" }}>Amount</th><th className="exq-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontSize: 34, marginBottom: 8 }}>{reviewOnly ? "✅" : "💳"}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{reviewOnly ? "Nothing needs review — all payouts are explained." : inMonth.length ? "No payouts match these filters." : `No payouts entered for ${monthLabel(month)} yet.`}</div>
                      </td></tr>
                    ) : list.map(e => {
                      const rv = isReview(e);
                      const k = acctKey(e);
                      return (
                        <tr key={e.uuid || e.id} className={"exq-row" + (rv ? " rv" : "")}>
                          <td className="exq-td" style={{ whiteSpace: "nowrap", color: "#475569", fontWeight: 700, fontSize: 12.5 }}>{fmtD(e.date)}</td>
                          <td className="exq-td">{acctPill(k)}</td>
                          <td className="exq-td" style={{ minWidth: 200 }}>
                            <div style={{ fontWeight: 700 }}>{e.payTo || <span style={{ color: "#94a3b8", fontWeight: 600 }}>—</span>}</div>
                            <div style={{ fontSize: 12, color: e.desc ? "#64748b" : "#dc2626", marginTop: 1 }}>{e.desc || "No purpose written"}</div>
                            {rv && <div style={{ fontSize: 10.5, fontWeight: 800, color: "#c2410c", marginTop: 3 }}>⚠ NEEDS REVIEW · {reviewReason(e)}</div>}
                          </td>
                          <td className="exq-td" style={{ minWidth: 150 }}>
                            {e.cat
                              ? (isNonExpense(e)
                                ? <span title="Not a business expense — kept out of the expense totals" style={{ background: "#f1f5f9", color: "#475569", border: "1px dashed #94a3b8", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{e.cat}</span>
                                : <span style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{e.cat}</span>)
                              : <select className="exq-in" style={{ padding: "5px 8px", fontSize: 12, borderColor: "#fca5a5" }} value="" onChange={ev => { if (ev.target.value) quickSetCategory(e, ev.target.value); }}>
                                <option value="">Pick category…</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>}
                          </td>
                          <td className="exq-td exq-hide-sm" style={{ fontSize: 12, color: "#64748b" }}>
                            {e.method || "—"}{e.bankRef ? <div className="mono" style={{ fontFamily: "ui-monospace,Consolas,monospace", fontSize: 11, color: "#94a3b8" }}>{e.bankRef}</div> : null}
                            {e.invoiceNo ? <div style={{ fontSize: 11, color: "#94a3b8" }}>Inv {e.invoiceNo}</div> : null}
                          </td>
                          <td className="exq-td" style={{ textAlign: "right", fontWeight: 800, color: isNonExpense(e) ? "#64748b" : "#dc2626", whiteSpace: "nowrap" }}>{fmt(shopId, Number(e.amount) || 0)}</td>
                          <td className="exq-td" style={{ whiteSpace: "nowrap" }}>
                            <button onClick={() => openEdit(e)} title="Edit" style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid " + ac, background: ac + "12", color: ac, fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6 }}>✏️</button>
                            <button onClick={() => setConfirmDelete(e)} title="Delete" style={{ padding: "5px 9px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {list.length > 0 && (
                <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", background: "#f8fafc", flexWrap: "wrap", gap: 6 }}>
                  <span>{list.length} payout{list.length !== 1 ? "s" : ""}{list.length !== inMonth.length ? ` of ${inMonth.length}` : ""} · {monthLabel(month)}</span>
                  <span style={{ fontWeight: 800, color: "#dc2626" }}>Total: {fmt(shopId, listTotal)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view === "report" && (
        <div style={{ padding: "0 20px 24px" }}>
          {reviewList.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "11px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: "#92400e" }}>
              <span><b>⚠ {reviewList.length} payout{reviewList.length !== 1 ? "s" : ""} ({fmt(shopId, reviewTotal)}) still need review</b> — they are grouped under “Uncategorised” or have no purpose. Clear them before sending this to your accountant.</span>
              <button className="exq-btn exq-pri" onClick={() => { setView("entries"); setReviewOnly(true); setAcctFilter("ALL"); setCatFilter("ALL"); }}>Review now</button>
            </div>
          )}
          <div className="exq-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>📊 {monthLabel(month)} — payouts by category and bank</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="exq-btn" onClick={exportCSV} disabled={!inMonth.length}>⬇ Excel (CSV)</button>
                <button className="exq-btn" onClick={printPDF} disabled={!inMonth.length}>🖨️ Print / PDF</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="exq-th">Category</th>
                    {acctKeys.map(k => <th key={k} className="exq-th" style={{ textAlign: "right" }}>{acctLabel(k)}</th>)}
                    <th className="exq-th" style={{ textAlign: "right" }}>Total</th>
                    <th className="exq-th" style={{ textAlign: "right" }}>Payouts</th>
                    <th className="exq-th" style={{ textAlign: "right" }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 && <tr><td colSpan={acctKeys.length + 4} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No payouts entered for {monthLabel(month)}.</td></tr>}
                  {report.expRows.map(r => renderCatRow(r, true))}
                  {report.rows.length > 0 && (
                    <tr>
                      <td className="exq-td" style={{ fontWeight: 900, background: "#f8fafc", borderTop: "2px solid #0f172a" }}>BUSINESS EXPENSES</td>
                      {acctKeys.map(k => <td key={k} className="exq-td" style={{ textAlign: "right", fontWeight: 900, background: "#f8fafc", borderTop: "2px solid #0f172a" }}>{fmt(shopId, report.colTotalsExp[k] || 0)}</td>)}
                      <td className="exq-td" style={{ textAlign: "right", fontWeight: 900, color: "#dc2626", background: "#f8fafc", borderTop: "2px solid #0f172a" }}>{fmt(shopId, expenseTotal)}</td>
                      <td className="exq-td" style={{ textAlign: "right", fontWeight: 900, background: "#f8fafc", borderTop: "2px solid #0f172a" }}>{inMonth.filter(e => !isNonExpense(e)).length}</td>
                      <td className="exq-td" style={{ background: "#f8fafc", borderTop: "2px solid #0f172a" }}></td>
                    </tr>
                  )}
                  {report.otherRows.length > 0 && (
                    <>
                      <tr><td colSpan={acctKeys.length + 4} className="exq-td" style={{ background: "#f1f5f9", fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: ".05em", paddingTop: 14 }}>Not business expenses — personal withdrawals and transfers between your own accounts</td></tr>
                      {report.otherRows.map(r => renderCatRow(r, false))}
                      <tr>
                        <td className="exq-td" style={{ fontWeight: 900, background: "#f8fafc", borderTop: "2px solid #0f172a" }}>TOTAL DEBITS <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>(matches the bank statements)</span></td>
                        {acctKeys.map(k => <td key={k} className="exq-td" style={{ textAlign: "right", fontWeight: 900, background: "#f8fafc", borderTop: "2px solid #0f172a" }}>{fmt(shopId, report.colTotals[k] || 0)}</td>)}
                        <td className="exq-td" style={{ textAlign: "right", fontWeight: 900, background: "#f8fafc", borderTop: "2px solid #0f172a" }}>{fmt(shopId, monthTotal)}</td>
                        <td className="exq-td" style={{ textAlign: "right", fontWeight: 900, background: "#f8fafc", borderTop: "2px solid #0f172a" }}>{inMonth.length}</td>
                        <td className="exq-td" style={{ background: "#f8fafc", borderTop: "2px solid #0f172a" }}></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "#94a3b8", margin: "10px 2px 0" }}>Click a category row to see the payouts inside it. The Excel file opens in Excel with the full list plus this summary.</p>
        </div>
      )}

      {editExp && ef && editModal()}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }} onClick={() => setConfirmDelete(null)} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,.2)", width: "100%", maxWidth: 360, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>Delete Expense</h3>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "#374151" }}><strong>{confirmDelete.payTo || confirmDelete.desc}</strong> — {fmt(shopId, Number(confirmDelete.amount) || 0)}</p>
            <p style={{ margin: "0 0 24px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>⚠️ This cannot be undone.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button className="exq-btn" style={{ padding: "11px 0" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: "11px 0", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
