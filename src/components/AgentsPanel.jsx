export default function AgentsPanel({ agents, shop }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
            Logistics Agents
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>Shared across all shops</p>
        </div>
        <button
          style={{
            padding: "10px 22px",
            borderRadius: 12,
            border: "none",
            background: shop.accent,
            color: "white",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          + Add Agent
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 14 }}>
        {agents.map((a) => (
          <div
            key={a.id}
            style={{
              background: "white",
              borderRadius: 16,
              padding: 20,
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              transition: "all 0.18s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = shop.accent + "55";
              e.currentTarget.style.boxShadow = "0 6px 20px " + shop.accent + "18";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#f1f5f9";
              e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: shop.accentBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0
              }}
            >
              🚚
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{a.name}</p>
              <p style={{ margin: "2px 0 4px", fontSize: 12, color: "#64748b" }}>
                {a.type} · {a.contact}
              </p>
              <a href={a.url} style={{ fontSize: 11, color: shop.accent, fontWeight: 700 }}>
                Track shipment →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
