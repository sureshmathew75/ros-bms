/* ── parseToDate: parse any supported date string → JS Date ─────────
   Used for sorting. Returns null if unparseable.                     */
export function parseToDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);

  // M/D/YYYY or MM/DD/YYYY (US format from imported data)
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));

  // DD-MM-YYYY or DD-MM-YY
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{2,4})$/);
  if (dmy) {
    const yr = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    return new Date(yr, Number(dmy[2]) - 1, Number(dmy[1]));
  }

  return null;
}

/* ── formatDate: any date string → DD/MM/YY ────────────────────────
   Handles: yyyy-mm-dd (ISO), M/D/YYYY (US import), DD-MM-YYYY       */
export function formatDate(raw) {
  if (!raw) return "—";
  const s = String(raw).trim();

  // yyyy-mm-dd → DD/MM/YY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1].slice(2)}`;

  // M/D/YYYY or MM/DD/YYYY (US import format) → DD/MM/YY
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[2].padStart(2,"0")}/${us[1].padStart(2,"0")}/${us[3].slice(2)}`;

  // DD-MM-YYYY → DD/MM/YY
  const dmy4 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy4) return `${dmy4[1]}/${dmy4[2]}/${dmy4[3].slice(2)}`;

  // Already DD/MM/YY or DD-MM-YY → normalise to slashes
  const dmy2 = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{2})$/);
  if (dmy2) return `${dmy2[1]}/${dmy2[2]}/${dmy2[3]}`;

  return s;
}

/* ── formatCurrency: Indian number formatting ───────────────────── */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "₹0";
  const n = Number(amount);
  if (isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/* ── formatNumber: compact number with commas ───────────────────── */
export function formatNumber(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString("en-GB");
}
