export function parseToDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{2,4})$/);
  if (dmy) {
    const yr = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    return new Date(yr, Number(dmy[2]) - 1, Number(dmy[1]));
  }
  return null;
}

export function formatDate(raw) {
  if (!raw) return "—";
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1].slice(2)}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[2].padStart(2,"0")}/${us[1].padStart(2,"0")}/${us[3].slice(2)}`;
  const dmy4 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy4) return `${dmy4[1]}/${dmy4[2]}/${dmy4[3].slice(2)}`;
  const dmy2 = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{2})$/);
  if (dmy2) return `${dmy2[1]}/${dmy2[2]}/${dmy2[3]}`;
  return s;
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "₹0";
  const n = Number(amount);
  if (isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatNumber(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString("en-GB");
}
