/* ── formatDate: yyyy-mm-dd → DD-MM-YYYY ───────────────────────────
   Supabase stores dates as yyyy-mm-dd (ISO).
   Display format across the app: DD-MM-YYYY  */
export function formatDate(raw) {
  if (!raw) return "—";
  const s = String(raw).trim();

  // yyyy-mm-dd → DD-MM-YYYY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;

  // Already dd-mm-yyyy or dd-mm-yy → return as-is
  if (/^\d{2}-\d{2}-(\d{4}|\d{2})$/.test(s)) return s;

  // dd/mm/yyyy → dd-mm-yyyy
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[1].padStart(2,"0")}-${slash[2].padStart(2,"0")}-${slash[3]}`;

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