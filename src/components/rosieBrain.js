/* ─────────────────────────────────────────────────────────────────────────────
   Rosie's brain — plain functions (no React, no database, no outside service). They only READ the sales that are
   already loaded in the app and turn them into a short answer.  Nothing here changes any sale.

   answerRosie(question, ctx) → { text, rows: [{ title, sub, right, saleId }] }
   buildDayWrapUp(ctx)        → { text, lines }   (text is ready to paste into WhatsApp)

   ctx = {
     sales,        // this shop's sales
     shopName,     // "ROS India"
     today,        // "YYYY-MM-DD"
     fmt,          // n => "₹1,234"
     helpers: { inferPaymentType, groupIdsFor, balanceOf }   // the app's own deal logic, so balances match the Sales page
   }
   ───────────────────────────────────────────────────────────────────────────── */

export const ROSIE_HINTS = [
  "Who owes balance?",
  "Balance of Jency",
  "Today's sales",
  "Parcels to send",
  "Last order of Deepa",
  "Phone of Meera",
];

const STOP = new Set(["of", "the", "for", "a", "an", "is", "are", "what", "whats", "what's", "how", "much", "does", "do", "did", "owe", "owes", "me", "my", "show", "tell", "give", "please", "pls", "customer", "balance", "balances", "bal", "due", "pending", "outstanding", "unpaid", "payment", "payments", "paid", "order", "orders", "last", "latest", "recent", "phone", "number", "no", "mobile", "contact", "address", "tracking", "track", "parcel", "parcels", "where", "when", "who", "has", "have", "with", "and", "to", "in", "on", "sales", "sale", "today", "yesterday", "week", "month", "this", "all", "list", "total", "much", "many", "sent", "send", "despatch", "dispatch", "left", "remaining", "remain", "s", "i", "need", "find", "search", "about", "info", "details", "history"]);

const digits = (s) => String(s || "").replace(/\D/g, "");
const money0 = (n) => Number(n || 0);
const normName = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const custKey = (s) => normName(s.customer) + "__" + digits(s.phone || s.contact).slice(-10);
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const itemText = (s) => {
  if (Array.isArray(s.saleLines) && s.saleLines.length > 0) return s.saleLines.map((l) => l.name).filter(Boolean).join(", ");
  return String(s.item || "").replace(/^__LINES__:.*\n?/, "").replace(/\(x\d+\)/gi, "").trim();
};
const shortDate = (iso) => { const m = String(iso || "").match(/^\d{4}-(\d{2})-(\d{2})/); return m ? m[2] + "/" + m[1] : ""; };
const cap = (s) => String(s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/* open deals: an Advance whose expected total is not yet covered */
const openDeals = (ctx) => {
  const { sales, helpers } = ctx;
  const seen = new Set(), out = [];
  (sales || []).forEach((s) => {
    if (helpers.inferPaymentType(s) !== "ADVANCE" || seen.has(s.id)) return;
    const ids = helpers.groupIdsFor(s, sales);
    ids.forEach((i) => seen.add(i));
    const info = helpers.balanceOf(ids, sales);
    if (!info || info.balance <= 0.5) return;
    const group = (sales || []).filter((x) => ids.includes(x.id));
    const last = group.map((x) => x.date || "").sort().pop();
    out.push({ advance: s, group, ids, ...info, last });
  });
  return out.sort((a, b) => b.balance - a.balance);
};

const findCustomers = (q, ctx) => {
  const toks = normName(q).split(" ").filter((t) => t.length >= 2 && !STOP.has(t));
  const dig = digits(q);
  if (!toks.length && dig.length < 4) return [];
  const map = new Map();
  (ctx.sales || []).forEach((s) => {
    const nm = normName(s.customer);
    const ph = digits(s.phone || s.contact);
    const okName = toks.length > 0 && toks.every((t) => nm.includes(t));
    const okPhone = dig.length >= 4 && ph.includes(dig);
    if (!okName && !okPhone) return;
    const k = custKey(s);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  });
  return Array.from(map.values()).sort((a, b) => b.length - a.length);
};

const periodOf = (q, today) => {
  const t = q.toLowerCase();
  if (/yesterday/.test(t)) { const d = addDays(today, -1); return { label: "Yesterday", from: d, to: d }; }
  if (/this week|week/.test(t)) {
    const dow = (new Date(today + "T00:00:00").getDay() + 6) % 7;   // Monday = 0
    return { label: "This week", from: addDays(today, -dow), to: today };
  }
  if (/last month/.test(t)) {
    const d = new Date(today + "T00:00:00"); const f = new Date(d.getFullYear(), d.getMonth() - 1, 1), e = new Date(d.getFullYear(), d.getMonth(), 0);
    const iso = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
    return { label: "Last month", from: iso(f), to: iso(e) };
  }
  if (/month/.test(t)) return { label: "This month", from: today.slice(0, 8) + "01", to: today };
  return { label: "Today", from: today, to: today };
};

const summarise = (list, ctx) => {
  const total = list.reduce((a, s) => a + money0(s.amount), 0);
  const qty = list.reduce((a, s) => a + (parseFloat(s.qty) || 0), 0);
  const byPay = {};
  list.forEach((s) => { const k = String(s.pay || "—").toUpperCase(); byPay[k] = (byPay[k] || 0) + money0(s.amount); });
  const kinds = { FULL: 0, ADVANCE: 0, PART: 0, FINAL: 0 };
  list.forEach((s) => { const k = ctx.helpers.inferPaymentType(s); kinds[kinds[k] === undefined ? "FULL" : k]++; });
  return { total, qty, byPay, kinds, count: list.length };
};

const payLine = (byPay, fmt) => Object.entries(byPay).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + fmt(v)).join(" · ");

const awaitingDispatch = (ctx) => (ctx.sales || []).filter((s) => {
  const st = String(s.ful || s.status || "PENDING").toUpperCase();
  return st === "PENDING" && !(s.trackingNo && String(s.trackingNo).trim());
}).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

export const answerRosie = (question, ctx) => {
  const q = String(question || "").trim();
  const t = q.toLowerCase();
  const { fmt, today } = ctx;
  if (!q) return { text: "Ask me something — for example: " + ROSIE_HINTS.slice(0, 3).join(" · "), rows: [] };

  if (/^(help|hi|hello|hey)\b|what can you do/.test(t)) {
    return { text: "I can tell you about balances, today's sales, parcels waiting to be sent, and look up a customer's last order, phone or tracking. Try: " + ROSIE_HINTS.join(" · "), rows: [] };
  }

  const custs = findCustomers(q, ctx);
  const wantsBalance = /balance|owe|owes|due|outstanding|unpaid|remaining|left to pay/.test(t);
  const wantsPhone = /phone|number|mobile|contact|whatsapp/.test(t);
  const wantsTrack = /track|where is|parcel|courier|dtdc|despatched|dispatched|sent/.test(t);

  /* a customer was named */
  if (custs.length > 0 && !/^(who|which|list|all)\b/.test(t)) {
    const group = custs[0];
    const sorted = [...group].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const latest = sorted[0];
    const name = cap(latest.customer);
    const phone = latest.phone || latest.contact || "";
    const total = group.reduce((a, s) => a + money0(s.amount), 0);
    const deals = openDeals({ ...ctx, sales: ctx.sales }).filter((d) => d.group.some((x) => group.some((g) => g.id === x.id)));
    const more = custs.length > 1 ? " (" + custs.length + " customers match — showing the closest; add more of the name to narrow it)" : "";

    if (wantsPhone) {
      return { text: name + (phone ? " — " + phone : " — no phone number saved") + (latest.address ? "\n" + latest.address : "") + more, rows: [] };
    }
    if (wantsTrack) {
      const rows = sorted.slice(0, 5).map((s) => ({
        title: shortDate(s.date) + " · " + (itemText(s) || s.id), sub: s.trackingNo ? (s.carrier ? s.carrier + " · " : "") + s.trackingNo : "No tracking yet",
        right: String(s.ful || s.status || "PENDING"), saleId: s.id,
      }));
      return { text: "Parcels for " + name + ":" + more, rows };
    }
    if (wantsBalance) {
      if (deals.length === 0) return { text: name + " has no balance to pay. ✅" + more, rows: [] };
      return {
        text: name + " still owes " + fmt(deals.reduce((a, d) => a + d.balance, 0)) + "." + more,
        rows: deals.map((d) => ({ title: itemText(d.advance) || d.advance.id, sub: "Expected " + fmt(d.expectedTotal) + " · received " + fmt(d.received) + " · last payment " + shortDate(d.last), right: fmt(d.balance), saleId: d.advance.id })),
      };
    }
    /* general customer summary */
    const rows = sorted.slice(0, 4).map((s) => ({ title: shortDate(s.date) + " · " + (itemText(s) || s.id), sub: String(s.ful || s.status || "PENDING") + (s.trackingNo ? " · " + s.trackingNo : ""), right: fmt(money0(s.amount)), saleId: s.id }));
    return {
      text: name + (phone ? " · " + phone : "") + "\n" + group.length + " order" + (group.length === 1 ? "" : "s") + ", " + fmt(total) + " in total. Last order " + shortDate(latest.date) + "." + (deals.length ? " Balance to pay: " + fmt(deals.reduce((a, d) => a + d.balance, 0)) + "." : "") + more,
      rows,
    };
  }

  /* who owes / balances */
  if (wantsBalance) {
    const deals = openDeals(ctx);
    if (deals.length === 0) return { text: "Nobody owes a balance right now. ✅", rows: [] };
    const total = deals.reduce((a, d) => a + d.balance, 0);
    return {
      text: deals.length + " customer" + (deals.length === 1 ? " owes " : "s owe ") + fmt(total) + " in total" + (deals.length > 8 ? " (biggest 8 shown)" : "") + ":",
      rows: deals.slice(0, 8).map((d) => ({ title: cap(d.advance.customer), sub: "last payment " + shortDate(d.last) + " · of " + fmt(d.expectedTotal), right: fmt(d.balance), saleId: d.advance.id })),
    };
  }

  /* parcels waiting */
  if (/(to send|not sent|waiting|awaiting|despatch|dispatch|pending|tracking)/.test(t)) {
    const list = awaitingDispatch(ctx);
    if (list.length === 0) return { text: "Every order has tracking — nothing is waiting to be sent. ✅", rows: [] };
    return {
      text: list.length + " parcel" + (list.length === 1 ? " is" : "s are") + " waiting to be sent (oldest first" + (list.length > 8 ? ", 8 shown" : "") + "):",
      rows: list.slice(0, 8).map((s) => ({ title: cap(s.customer), sub: (itemText(s) || s.id).slice(0, 48), right: Math.max(0, dayDiff(s.date || today, today)) + "d", saleId: s.id })),
    };
  }

  /* sales summary for a period */
  if (/sale|sold|revenue|collected|received|took|total|how much|today|yesterday|week|month/.test(t)) {
    const p = periodOf(q, today);
    const list = (ctx.sales || []).filter((s) => String(s.date || "") >= p.from && String(s.date || "") <= p.to);
    if (list.length === 0) return { text: p.label + ": no sales yet.", rows: [] };
    const sm = summarise(list, ctx);
    return {
      text: p.label + ": " + sm.count + " order" + (sm.count === 1 ? "" : "s") + ", " + fmt(sm.total) + " received" + (sm.qty ? ", " + sm.qty + " item" + (sm.qty === 1 ? "" : "s") : "") + ".\n" + payLine(sm.byPay, fmt) +
        "\nFull " + sm.kinds.FULL + " · Advance " + sm.kinds.ADVANCE + " · Part " + sm.kinds.PART + " · Final " + sm.kinds.FINAL,
      rows: [],
    };
  }

  return { text: "I'm not sure I understood that. Try one of these: " + ROSIE_HINTS.join(" · "), rows: [] };
};

/* End-of-day summary, formatted for WhatsApp (*bold*). */
export const buildDayWrapUp = (ctx) => {
  const { fmt, today, shopName } = ctx;
  const todays = (ctx.sales || []).filter((s) => String(s.date || "") === today);
  const sm = summarise(todays, ctx);
  const deals = openDeals(ctx);
  const owed = deals.reduce((a, d) => a + d.balance, 0);
  const wait = awaitingDispatch(ctx);
  const d = new Date(today + "T00:00:00");
  const pretty = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const lines = [];
  lines.push("🌙 *" + (shopName || "Shop") + " — day summary*");
  lines.push(pretty);
  lines.push("");
  if (todays.length === 0) lines.push("*Sales today:* none entered");
  else {
    lines.push("*Sales today:* " + sm.count + " order" + (sm.count === 1 ? "" : "s") + " · " + fmt(sm.total) + " received");
    if (Object.keys(sm.byPay).length) lines.push("Paid into: " + payLine(sm.byPay, fmt));
    lines.push("Full " + sm.kinds.FULL + " · Advance " + sm.kinds.ADVANCE + " · Part " + sm.kinds.PART + " · Final " + sm.kinds.FINAL);
  }
  lines.push("");
  if (deals.length === 0) lines.push("*Balances to collect:* none ✅");
  else {
    lines.push("*Balances to collect:* " + deals.length + " customer" + (deals.length === 1 ? "" : "s") + " · " + fmt(owed));
    deals.slice(0, 5).forEach((x) => lines.push("• " + cap(x.advance.customer) + " — " + fmt(x.balance)));
    if (deals.length > 5) lines.push("• …and " + (deals.length - 5) + " more");
  }
  lines.push("");
  if (wait.length === 0) lines.push("*Parcels waiting to be sent:* none ✅");
  else {
    lines.push("*Parcels waiting to be sent:* " + wait.length);
    wait.slice(0, 5).forEach((s) => lines.push("• " + cap(s.customer) + " — " + Math.max(0, dayDiff(s.date || today, today)) + " day(s)"));
    if (wait.length > 5) lines.push("• …and " + (wait.length - 5) + " more");
  }
  return { text: lines.join("\n"), lines };
};

/* ─────────────────────────────────────────────────────────────────────────────
   New Sale live coach — friendly, NON-blocking heads-ups while a sale is being typed.
   coachNotes({ shopId, customer, contact, date, itemNames, amount, sales, openDeal, paymentType, received,
                contactTouched, fmt }) → [{ key, icon, text }]
   ───────────────────────────────────────────────────────────────────────────── */
const phoneProblem = (raw, shopId) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  const d = digits(s);
  if (!d) return "That phone number has no digits.";
  const india = shopId === "ros-india";
  const cc = india ? "91" : "44";
  if (s.startsWith("+") && !s.startsWith("+" + cc)) return "";      // an overseas number — can't judge it
  let local = d;
  if (s.startsWith("+") || (d.startsWith(cc) && d.length > 10)) local = d.slice(cc.length);
  if (local.startsWith("0")) local = local.slice(1);
  if (/^(\d)\1+$/.test(local) && local.length >= 6) return "That phone number looks made-up (all the same digit).";
  if (india) {
    if (local.length > 10) return "That phone number has too many digits — an Indian mobile has 10.";
    if (local.length < 10) return "That phone number looks short — an Indian mobile has 10 digits.";
    if (!/^[6-9]/.test(local)) return "Indian mobile numbers start with 6, 7, 8 or 9 — please double-check.";
  } else {
    if (local.length > 10) return "That phone number has too many digits for a UK number.";
    if (local.length < 10) return "That phone number looks short for a UK number.";
  }
  return "";
};

export const coachNotes = (o) => {
  const out = [];
  const { shopId, customer, contact, date, itemNames = [], amount, altAmount, sales = [], openDeal, paymentType, received, contactTouched, fmt } = o;

  /* 1 — this customer already has an open Advance */
  if (openDeal && !(received > 0) && !["PART", "FINAL"].includes(paymentType)) {
    const bal = openDeal.expected - openDeal.prior;
    if (bal > 0.5) out.push({ key: "open", icon: "🔔", text: "This customer has an open Advance (" + openDeal.advanceId + ") with " + fmt(bal) + " still to pay. If they are paying that, choose Part or Final — if it's a new order, carry on." });
  }

  /* 2 — phone number looks wrong (judged once the box is left, or straight away if it is far too long) */
  const pp = phoneProblem(contact, shopId);
  if (pp && (contactTouched || digits(contact).length > 13)) out.push({ key: "phone", icon: "📱", text: pp });

  /* 3 — looks like the same entry was already made */
  const nm = normName(customer);
  const names = itemNames.map((x) => normName(x)).filter(Boolean);
  const amts = [amount, altAmount].filter((x) => x > 0);
  if (nm && date && names.length > 0 && amts.length > 0) {
    const hit = (sales || []).find((s) => {
      if (normName(s.customer) !== nm) return false;
      const dd = Math.abs(dayDiff(String(s.date || "").slice(0, 10), date));
      if (!(dd <= 1)) return false;
      const sameAmt = amts.some((a) => Math.abs(money0(s.amount) - a) < 0.5);
      const txt = normName(itemText(s));
      const sameItem = names.length > 0 && names.every((n) => txt.includes(n));
      return sameAmt && sameItem;
    });
    if (hit) out.push({ key: "dup", icon: "👯", text: "A very similar entry already exists (" + (hit.invoiceNo || hit.id) + ", " + shortDate(hit.date) + ", " + fmt(money0(hit.amount)) + "). Please check this isn't a double entry." });
  }
  return out;
};
