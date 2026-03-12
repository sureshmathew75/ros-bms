import TH from "./ui/TH";
import TD from "./ui/TD";

export default function SuppliersPanel({ shop, suppliers }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>Supplier Database</h2>
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
          + Add Supplier
        </button>
      </div>
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #f1f5f9",
          overflow: "hidden",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Supplier", "Contact", "Phone", "Email", "Category", "Terms", ""].map((h) => (
                <TH key={h} ch={h} />
              ))}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s, i) => (
              <tr
                key={s.id}
                style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "white" : "#fafafa" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = shop.accent + "0d")}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa")}
              >
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: shop.accentBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14
                      }}
                    >
                      🏭
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>{s.name}</span>
                  </div>
                </td>
                <TD ch={s.contact} c="#374151" />
                <TD ch={s.phone} c="#64748b" />
                <TD ch={s.email} c="#64748b" />
                <td style={{ padding: "13px 16px" }}>
                  <span
                    style={{
                      background: shop.accentBg,
                      color: shop.accentText,
                      borderRadius: 999,
                      padding: "3px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      border: "1px solid " + shop.accent + "22"
                    }}
                  >
                    {s.category}
                  </span>
                </td>
                <TD ch={s.terms} c="#374151" />
                <td style={{ padding: "13px 16px" }}>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>
                    ⋯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
