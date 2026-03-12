import React from "react";

export default function StatCard({ icon, label, value, sub, color, bg, border }) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 4
      }}
    >
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}