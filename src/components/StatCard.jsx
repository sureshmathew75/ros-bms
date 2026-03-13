import { useState } from "react";

const OUTFIT = "Outfit, system-ui, sans-serif";
const NUNITO = "Nunito, system-ui, sans-serif";

export default function StatCard({ icon, label, value, sub, color, bg, border }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 14,
        background: hov
          ? "linear-gradient(120deg," + bg + " 0%," + color + "1a 100%)"
          : (bg || "#f8fafc"),
        border: "1px solid " + (hov ? color + "55" : (border || color + "22")),
        boxShadow: hov
          ? "0 10px 28px " + color + "28, 0 2px 6px " + color + "18"
          : "0 1px 4px rgba(0,0,0,0.05)",
        transform: hov ? "translateY(-4px) scale(1.025)" : "translateY(0) scale(1)",
        transition: "transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s cubic-bezier(.4,0,.2,1), background 0.22s ease, border-color 0.2s ease",
        cursor: "default",
        overflow: "hidden",
        position: "relative",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{
        position: "absolute", right: -20, bottom: -20,
        width: 70, height: 70, borderRadius: "50%",
        background: color + "10",
        transform: hov ? "scale(1.6)" : "scale(1)",
        transition: "transform 0.3s ease",
        pointerEvents: "none",
      }} />

      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: hov ? color + "30" : color + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0, transition: "background 0.2s ease",
      }}>
        {icon}
      </div>

      <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
        <p style={{
          margin: "0 0 2px", fontSize: 10, fontWeight: 700,
          color: color, textTransform: "uppercase", letterSpacing: "0.07em",
          fontFamily: OUTFIT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {label}
        </p>
        <p style={{
          margin: "0 0 2px", fontSize: 20, fontWeight: 800,
          color: "#0f172a", letterSpacing: "-0.3px", lineHeight: 1.1,
          fontFamily: NUNITO,
        }}>
          {value}
        </p>
        {sub && (
          <p style={{
            margin: 0, fontSize: 10, color: "#94a3b8", fontWeight: 500,
            fontFamily: OUTFIT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {sub}
          </p>
        )}
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, height: 3,
        borderRadius: "0 0 14px 14px",
        background: "linear-gradient(90deg," + color + "," + color + "66)",
        width: hov ? "100%" : "0%",
        transition: "width 0.28s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}
