/* ─────────────────────────────────────────────────────────────────────────────
   ROS INDIA — Hair Products Price List (effective 10.11.2026)
   Used by: the Price List tab, item suggestions in New/Edit Sale (ROS India and
   ROS Hairlines UK) and the price / short-payment checks.

   India prices:  Net + GST 18% = Gross  (the Gross price is what a customer pays and
   what staff enter in a sale).   UK prices are in £ (null = not available in the UK).
   Delivery: India free · UK £7 per order.   Refund service charge: see REFUND_TIERS.
   Pure data + helpers — nothing here touches the database or any sale.
   ───────────────────────────────────────────────────────────────────────────── */

export const PRICE_LIST_EFFECTIVE = "10.11.2026";
export const PRICE_LIST_GST = 18;
export const UK_DELIVERY = 7;            // £ per UK order
export const PRICE_SHOPS = ["ros-india", "ros-hairlines"];   // shops this list applies to

// [group, product, description, [[length″ | null, net ₹, GST ₹, gross ₹, UK £ | null], ...]]
const RAW = [
  ["Clip-in Patches", "Single Clip Patch", "Size 1.5″ × 1", [[10,1500,270,1770,20],[12,1750,315,2065,25],[14,2000,360,2360,30],[16,2200,396,2596,32],[18,2400,432,2832,36],[20,2800,504,3304,40],[22,3000,540,3540,45]]],
  ["Clip-in Patches", "Double Clip Patch", "Size 3″ × 1", [[10,2500,450,2950,36],[12,2800,504,3304,40],[14,3500,630,4130,45],[16,3800,684,4484,50],[18,4300,774,5074,60],[20,5000,900,5900,70],[22,6200,1116,7316,80]]],
  ["Clip-in Patches", "Three Clip Patch", "Size 4.5″ × 1", [[10,6000,1080,7080,80],[12,7000,1260,8260,90],[14,8000,1440,9440,110],[16,9000,1620,10620,130],[18,10000,1800,11800,140],[20,11000,1980,12980,150],[22,12000,2160,14160,160]]],
  ["Ponytails", "Ponytail with Clip — Budget", "Removable clip extension", [[8,3500,630,4130,null],[10,4200,756,4956,null],[12,4800,864,5664,null],[14,5200,936,6136,null],[16,6200,1116,7316,null],[18,7500,1350,8850,null],[20,8500,1530,10030,null],[22,9500,1710,11210,null],[24,11000,1980,12980,null]]],
  ["Ponytails", "Ponytail with Clip — Premium", "Removable clip extension", [[8,4500,810,5310,70],[10,5500,990,6490,80],[12,6500,1170,7670,90],[14,7500,1350,8850,110],[16,8500,1530,10030,120],[18,9500,1710,11210,130],[20,10500,1890,12390,140],[22,11500,2070,13570,150],[24,12500,2250,14750,160]]],
  ["Ponytails", "Ponytail with Tie / Claw Clip", "Removable clip extension", [[8,5500,990,6490,80],[10,6500,1170,7670,90],[12,7500,1350,8850,110],[14,8500,1530,10030,120],[16,9500,1710,11210,140],[18,11500,2070,13570,160],[20,12500,2250,14750,180],[22,13500,2430,15930,200],[24,14500,2610,17110,220]]],
  ["Volumizers & Patches", "Back Patch Volumizer — Budget", "Size 6.5″ × 1.5″", [[8,6000,1080,7080,null],[10,6500,1170,7670,null],[12,7000,1260,8260,null],[14,8000,1440,9440,null],[16,9000,1620,10620,null],[18,11500,2070,13570,null],[20,13000,2340,15340,null],[22,14000,2520,16520,null],[24,15500,2790,18290,null]]],
  ["Volumizers & Patches", "Back Patch Volumizer — Premium", "6.5″ × 1.5″ · Avg. 90–100 g", [[8,8000,1440,9440,100],[10,10000,1800,11800,140],[12,12500,2250,14750,155],[14,14500,2610,17110,165],[16,16500,2970,19470,175],[18,18500,3330,21830,185],[20,20500,3690,24190,200],[22,22500,4050,26550,220],[24,24500,4410,28910,240]]],
  ["Volumizers & Patches", "Cover Up Patch", "Lightweight cover patch", [[16,3800,684,4484,45],[18,4300,774,5074,50],[20,4800,864,5664,55],[22,5500,990,6490,60],[24,6000,1080,7080,65]]],
  ["Ladies Toppers", "Ladies Topper 3×5", "Base size 3 × 5", [[16,13000,2340,15340,150],[18,15000,2700,17700,170],[20,17000,3060,20060,190],[22,19000,3420,22420,210],[24,21000,3780,24780,230]]],
  ["Ladies Toppers", "Ladies Topper 4×4", "Base size 4 × 4", [[16,14000,2520,16520,160],[18,16000,2880,18880,180],[20,18000,3240,21240,200],[22,20000,3600,23600,220],[24,22000,3960,25960,240]]],
  ["Ladies Toppers", "Ladies Topper 5×5", "Base size 5 × 5", [[16,18000,3240,21240,220],[18,20000,3600,23600,240],[20,22000,3960,25960,260],[22,24000,4320,28320,280],[24,26000,4680,30680,300]]],
  ["Ladies Toppers", "Ladies Topper 6×6", "Base size 6 × 6", [[16,25000,4500,29500,280],[18,28000,5040,33040,300],[20,30000,5400,35400,320],[22,33000,5940,38940,340],[24,36000,6480,42480,360]]],
  ["Ladies Toppers", "Ladies Topper HD 2×3", "Base size 2 × 3", [[16,11000,1980,12980,135],[18,12000,2160,14160,145],[20,13000,2340,15340,155],[22,14000,2520,16520,165],[24,15000,2700,17700,175]]],
  ["Ladies Toppers", "Ladies Topper HD 4×5", "Base size 4 × 5", [[16,15000,2700,17700,180],[18,18000,3240,21240,210],[20,20000,3600,23600,230],[22,22000,3960,25960,250],[24,24000,4320,28320,270]]],
  ["Ladies Toppers", "Ladies Topper HD 5×5", "Base size 5 × 5", [[16,20000,3600,23600,240],[18,22000,3960,25960,260],[20,24000,4320,28320,280],[22,27000,4860,31860,310],[24,30000,5400,35400,330]]],
  ["Ladies Toppers", "Ladies Topper HD 6×6", "Base size 6 × 6", [[16,28000,5040,33040,300],[18,30000,5400,35400,320],[20,33000,5940,38940,350],[22,36000,6480,42480,380],[24,40000,7200,47200,400]]],
  ["Wigs & Hairlines", "Hairline Topper HD", "HD lace hairline", [[16,26500,4770,31270,300],[18,30500,5490,35990,325],[20,34500,6210,40710,350],[22,39500,7110,46610,375],[24,44000,7920,51920,400]]],
  ["Wigs & Hairlines", "Wig", "Full wig", [[16,32500,5850,38350,330],[18,36500,6570,43070,370],[20,38500,6930,45430,390],[22,42500,7650,50150,430],[24,46000,8280,54280,470]]],
  ["Wigs & Hairlines", "Wig HD", "Full wig, HD lace", [[16,36000,6480,42480,360],[18,42000,7560,49560,425],[20,47000,8460,55460,475],[22,54000,9720,63720,550],[24,60000,10800,70800,600]]],
  ["Wigs & Hairlines", "Hairlines with Band HD", "HD hairline on band", [[16,16500,2970,19470,195],[18,18500,3330,21830,215],[20,20500,3690,24190,235],[22,22500,4050,26550,255],[24,24500,4410,28910,280]]],
  ["Accessories", "Scrunchies", "Hair accessories", [[null,2700,486,3186,35]]],
  ["Accessories", "Plain Updo", "Hair accessories", [[null,1800,324,2124,25]]],
  ["Accessories", "Messy Updo", "Hair accessories", [[null,3500,630,4130,45]]],
  ["Accessories", "Curtain Bangs", "Hair accessories", [[null,5500,990,6490,70]]],
  ["Accessories", "Side Bangs", "Hair accessories", [[null,3200,576,3776,40]]],
];

export const REFUND_TIERS = {
  "ros-india":     [[10000, 250], [20000, 500], [30000, 1000], [Infinity, 1500]],   // item value below X → deduct ₹
  "ros-hairlines": [[100, 5], [200, 10], [Infinity, 20]],                           // item value below X → deduct £
};
export const refundDeduction = (shopId, itemValue) => {
  const tiers = REFUND_TIERS[shopId]; if (!tiers) return null;
  const v = Number(itemValue) || 0;
  for (const [below, fee] of tiers) if (v < below) return fee;
  return null;
};

export const isPriceShop = (shopId) => PRICE_SHOPS.includes(shopId);
export const priceSymbol = (shopId) => (shopId === "ros-india" ? "₹" : "£");

const clean = (n) => String(n == null ? "" : n);
// "Single Clip Patch" + 12 → "Single Clip Patch 12″"
const labelOf = (name, len) => len ? `${name} ${len}″` : name;

export const PRICE_ENTRIES = [];
RAW.forEach(([group, name, spec, rows]) => {
  rows.forEach(([len, net, gst, gross, uk]) => {
    PRICE_ENTRIES.push({ id: `${name}|${len || ""}`, group, product: name, spec, length: len, net, gst, gross, uk, label: labelOf(name, len) });
  });
});
export const PRICE_PRODUCTS = RAW.map(([group, name, spec, rows]) => ({
  group, name, spec,
  entries: PRICE_ENTRIES.filter(e => e.product === name),
}));
export const PRICE_GROUPS = Array.from(new Set(RAW.map(r => r[0])));

/* The price a customer pays in this shop: India = Gross (incl. GST), Hairlines UK = £. null = not sold there. */
export const priceFor = (entry, shopId) => {
  if (!entry) return null;
  if (shopId === "ros-india") return entry.gross;
  if (shopId === "ros-hairlines") return entry.uk;
  return null;
};

/* Lower-case, no ″ " ' "inch", × → x, single spaces — so "Ladies Topper 5 x 5 20 inch" ≡ "ladies topper 5x5 20" */
export const normName = (s) => clean(s).toLowerCase()
  .replace(/[″"”“']/g, " ").replace(/\binch(es)?\b/g, " ").replace(/\bin\b/g, " ")
  .replace(/×/g, "x").replace(/\s*x\s*(?=\d)/g, "x").replace(/(\d)\s*x\s*/g, "$1x")
  .replace(/[()\[\],.]/g, " ").replace(/\s+/g, " ").trim();

const HAY = PRICE_ENTRIES.map(e => ({ e, hay: normName(`${e.label} ${e.spec}`), key: normName(e.label) }));
const BY_KEY = new Map(HAY.map(h => [h.key, h.e]));

/* Exact (after normalising) match of a typed/picked item name to a price-list entry, else null. */
export const matchEntry = (name) => BY_KEY.get(normName(name)) || null;

/* Suggestions for what staff are typing — every word must match; numbers must match a whole number
   ("20" finds 20″ but not 12 or 22). Items not sold in this shop's currency are left out. */
export const searchPriceList = (query, shopId, limit = 8) => {
  const q = normName(query);
  if (!q) return [];
  const toks = q.split(" ").filter(Boolean);
  const out = [];
  for (const { e, hay, key } of HAY) {
    if (shopId && priceFor(e, shopId) == null) continue;
    let ok = true;
    for (const t of toks) {
      if (/^\d+$/.test(t)) { if (!new RegExp("(^|[^0-9])" + t + "([^0-9]|$)").test(hay)) { ok = false; break; } }
      else if (!hay.includes(t)) { ok = false; break; }
    }
    if (!ok) continue;
    const score = (key.startsWith(toks[0]) ? 0 : 1) + (key.includes(q) ? 0 : 0.5);
    out.push({ e, score });
  }
  out.sort((a, b) => a.score - b.score);
  return out.slice(0, limit).map(x => x.e);
};

/* Finds the price-list entry for a sale line even when the name was typed freehand in the old style
   ("10\"PONYTAIL WITH TIE", "12\"VOLMIZER PREMIUM"): exact match first, else every word must match — a word with one
   typo still counts — and only a single, unambiguous entry is accepted. Used for display only. */
const _near = (a, b) => {
  if (a === b) return true;
  if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, miss = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++miss > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return miss + (a.length - i) + (b.length - j) <= 1;
};
export const findListEntry = (name, shopId) => {
  const exact = matchEntry(String(name || "").replace(/\s*\(x\d+\)\s*$/i, ""));
  if (exact) return exact;
  const q = normName(String(name || "").replace(/\s*\(x\d+\)\s*$/i, ""));
  if (!q) return null;
  const toks = q.split(" ").filter(Boolean);
  const hits = [];
  for (const { e, hay } of HAY) {
    if (shopId && priceFor(e, shopId) == null) continue;
    const words = hay.split(" ");
    const ok = toks.every(t => /^\d+$/.test(t)
      ? new RegExp("(^|[^0-9])" + t + "([^0-9]|$)").test(hay)
      : hay.includes(t) || words.some(w => _near(t, w)));
    if (ok) hits.push(e);
  }
  return hits.length === 1 ? hits[0] : null;
};

/* Lines of a sale (saleLines) compared with the list. Only lines that match a list item AND carry a
   price are checked — custom items are never flagged. */
export const priceMismatches = (lines, shopId) => {
  const out = [];
  (lines || []).forEach(l => {
    const e = matchEntry(l.name); if (!e) return;
    const expected = priceFor(e, shopId); if (expected == null) return;
    const entered = parseFloat(l.price); if (!(entered > 0)) return;
    if (Math.abs(entered - expected) > 0.5) out.push({ name: l.name, label: e.label, expected, entered, qty: parseFloat(l.qty) || 1, diff: entered - expected });
  });
  return out;
};

/* Dispatch-time check: what the list says ONE sale should have brought in, vs what was received.
   • Only a single, full-payment sale is checked — Advance / Part / Final groups already have their own
     Expected-Total balance check, and summing their lines here could double-count.
   • Sales with a GST % set are skipped (their amount is built from net prices).
   • Matched lines count at list price, unmatched lines at their entered price (so a custom item can never
     create a shortfall); a line the staff already explained with a "Price note —" counts at its entered price.
   • Hairlines UK adds the £7 delivery once per order.
   Returns null when there is nothing to check. */
export const shortfallForSales = (members, shopId) => {
  if (!isPriceShop(shopId) || !members || members.length !== 1) return null;
  const s = members[0];
  if (String(s.paymentType || "FULL").toUpperCase() !== "FULL") return null;
  if ((Number(s.taxRate) || 0) > 0) return null;
  const explained = /Price note —/.test(String(s.rem || s.remarks || ""));
  let listTotal = 0, matched = 0;
  (Array.isArray(s.saleLines) ? s.saleLines : []).forEach(l => {
    const q = parseFloat(l.qty) || 1, entered = parseFloat(l.price) || 0;
    const e = matchEntry(l.name), p = e ? priceFor(e, shopId) : null;
    if (p != null && !explained) { listTotal += p * q; matched++; } else listTotal += entered * q;
    if (p != null && explained) matched++;
  });
  if (!matched) return null;
  // Hairlines: use the shipping actually charged on the sale (£7 UK, a different amount abroad, or 0 if waived);
  // older sales without a "Shipping" line fall back to the standard £7.
  const delivery = shopId === "ros-hairlines"
    ? (String(s.otherChargesLabel || "") === "Shipping" ? (Number(s.otherCharges) || 0) : UK_DELIVERY)
    : 0;
  listTotal += delivery;
  const received = Number(s.amount) || 0;
  return { listTotal, received, short: listTotal - received, delivery };
};

/* What the price list says a set of sale lines should come to: lines that match the list at list price,
   other (custom) lines at their entered price, plus the £7 delivery once for Hairlines UK.
   Returns null when no line matches the list (nothing to compare with). */
export const listTotalForLines = (lines, shopId) => {
  if (!isPriceShop(shopId)) return null;
  let total = 0, matched = 0;
  (Array.isArray(lines) ? lines : []).forEach(l => {
    if (!l || !String(l.name || "").trim()) return;
    const q = parseFloat(l.qty) || 1;
    const e = matchEntry(l.name), p = e ? priceFor(e, shopId) : null;
    if (p != null) { total += p * q; matched++; } else total += (parseFloat(l.price) || 0) * q;
  });
  if (!matched) return null;
  const delivery = shopId === "ros-hairlines" ? UK_DELIVERY : 0;
  return { total: total + delivery, delivery };
};

export const shortfallMessage = (shopId, sf, customer) => {
  const m = (n) => priceSymbol(shopId) + Number(n).toLocaleString(shopId === "ros-india" ? "en-IN" : "en-GB");
  return "⚠️ Amount not fully received" + (customer ? " — " + customer : "") + "\n\n" +
    "Price list total: " + m(sf.listTotal) + (sf.delivery ? " (includes " + m(sf.delivery) + " delivery)" : "") + "\n" +
    "Received: " + m(sf.received) + "\n" +
    "Short by: " + m(sf.short) + "\n\n" +
    "Dispatch anyway?";
};
