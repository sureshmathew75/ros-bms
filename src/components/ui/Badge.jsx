const BSTYLE = {
  "PENDING":        { bg: "#fef9c3", c: "#a16207", b: "#fde047" },
  "FULFILLED":      { bg: "#dcfce7", c: "#15803d", b: "#bbf7d0" },
  "GOOD FEEDBACK":  { bg: "#d1fae5", c: "#065f46", b: "#6ee7b7" },
  "RTRN REQSTD":    { bg: "#ffedd5", c: "#c2410c", b: "#fed7aa" },
  "RETRN RCVD":     { bg: "#fee2e2", c: "#991b1b", b: "#fca5a5" },
  "EXCHANGED":      { bg: "#e0e7ff", c: "#4338ca", b: "#c7d2fe" },
  "REFUNDED":       { bg: "#f3e4ff", c: "#7e22ce", b: "#d8b4fe" },
  "DISPATCHED":     { bg: "#e0e7ff", c: "#4338ca", b: "#c7d2fe" },
  "DELIVERED":      { bg: "#dcfce7", c: "#15803d", b: "#bbf7d0" },
  Paid:             { bg: "#dcfce7", c: "#15803d", b: "#bbf7d0" },
  Pending:          { bg: "#fef9c3", c: "#a16207", b: "#fde047" },
  Partial:          { bg: "#ffedd5", c: "#c2410c", b: "#fed7aa" },
};

export default function Badge({ children, l }) {
  const label = children || l;
  const b = BSTYLE[label] || { bg: "#f1f5f9", c: "#475569", b: "#e2e8f0" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: b.bg, color: b.c, border: "1px solid " + b.b }}>
      {label}
    </span>
  );
}