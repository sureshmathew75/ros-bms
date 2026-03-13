import { useState } from "react";

const OUTFIT = "Outfit, system-ui, sans-serif";
const NUNITO = "Nunito, system-ui, sans-serif";

export default function KPI({ label, val, change, plus, icon, color, sub }) {
  const [hov, setHov] = useState(false);

  const bg      = color + "14";
  const bgHov   = color + "22";
  const border  = color + "30";
  const borderH = color + "66";
  const iconBg  = color + "25";
  const iconBgH = color + "40";
  const shadow  = color + "30";

  const changeBg  = plus ? "#dcfce7" : "#fee2e2";
  const changeCol = plus ? "#15803d" : "#dc2626";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        padding: "16px 14px 14px",
        background: hov ? bgHov : bg,
        border: "1px solid " + (hov ? borderH : border),
        boxShadow: hov
          ? "0 14px 30px " + shadow + ", 0 3px 8px " + shadow
          : "0 1px 4px rgba(0,0,0,0.05)",
        transform: hov ? "translateY(-5px) scale(1.03)" : "translateY(0) scale(1)",
        transition: "transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s cubic-bezier(.4,0,.2,1), border-color 0.22s ease, background 0.22s ease",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{
        position: "absolute", right: -16, top: -16,
        width: 72, height: 72, borderRadius: "50%",
        background: color + "18",
        transform: hov ? "scale(1.5)" : "scale(1)",
        transition: "transform 0.25s ease",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: hov ? iconBgH : iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0, transition: "background 0.2s ease",
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: color,
          textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3,
          fontFamily: OUTFIT,
        }}>
          {label}
        </span>
      </div>

      <p style={{
        margin: 0, fontSize: 19, fontWeight: 900,
        color: "#0f172a", letterSpacing: "-0.4px", lineHeight: 1,
        position: "relative", fontFamily: NUNITO,
      }}>
        {val}
      </p>

      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "relative",
      }}>
        {sub
          ? <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, fontFamily: OUTFIT }}>{sub}</span>
          : <span />
        }
        {change && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            padding: "2px 7px", borderRadius: 999,
            background: changeBg, color: changeCol,
            fontSize: 10, fontWeight: 800, fontFamily: OUTFIT,
          }}>
            {plus ? "↑" : "↓"} {change}
          </span>
        )}
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, height: 3,
        borderRadius: "0 0 16px 16px",
        background: "linear-gradient(90deg," + color + "," + color + "77)",
        width: hov ? "100%" : "0%",
        transition: "width 0.28s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}
