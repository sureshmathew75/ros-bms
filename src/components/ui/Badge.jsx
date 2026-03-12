const BSTYLE = {
  ok: { bg: "#dcfce7", fg: "#166534", bd: "#bbf7d0" },
  warn: { bg: "#fef3c7", fg: "#92400e", bd: "#fde68a" },
  err: { bg: "#fee2e2", fg: "#991b1b", bd: "#fecaca" },
  info: { bg: "#dbeafe", fg: "#1e40af", bd: "#bfdbfe" },
  neutral: { bg: "#f3f4f6", fg: "#374151", bd: "#e5e7eb" },
};

export default function Badge({ children, tone = "neutral" }) {
  const s = BSTYLE[tone] || BSTYLE.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.bd}`,
      }}
    >
      {children}
    </span>
  );
}