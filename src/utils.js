// Utility helper functions

export function formatCurrency(value) {
  if (value == null) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value) {
  if (value == null) return "";
  return Number(value).toLocaleString("en-IN");
}

export function formatDate(value) {
  if (!value) return "—";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [y, m, d] = parts;
  return `${d}-${m}-${String(y).slice(-2)}`;
}