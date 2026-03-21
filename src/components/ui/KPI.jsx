export default function KPI({ label, val, change, plus, icon, color, sub }) {
  return (
    <div style={{
      background: "white", borderRadius: 14, padding: "16px 18px",
      border: "1px solid #f1f5f9", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</span>
        {change && (
          <span style={{ fontSize: 11, fontWeight: 700, color: plus ? "#15803d" : "#dc2626", background: plus ? "#dcfce7" : "#fee2e2", borderRadius: 999, padding: "2px 8px" }}>
            {plus ? "▲" : "▼"} {change}
          </span>
        )}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px", lineHeight: 1.1 }}>{val}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{sub}</p>}
      </div>
    </div>
  );
}