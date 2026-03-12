import React from "react";

export default function CommandPalette({ cmd, setCmd }) {
  if (!cmd) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(6px)"
      }}
      onClick={() => setCmd(false)}
    >
      <div
        style={{
          background: "white",
          borderRadius: 18,
          width: "100%",
          maxWidth: 560,
          overflow: "hidden",
          boxShadow: "0 32px 64px rgba(0,0,0,0.25)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            borderBottom: "1px solid #f1f5f9"
          }}
        >
          <span style={{ fontSize: 18, color: "#94a3b8" }}>🔍</span>
          <input
            autoFocus
            placeholder="Search customers, invoices, products…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "#1e293b",
              fontFamily: "inherit"
            }}
          />
          <kbd
            style={{
              background: "#f1f5f9",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 12,
              color: "#64748b"
            }}
          >
            ESC
          </kbd>
        </div>

        {[
          "SI-1023 · John Carter · £450",
          "IN-2341 · Priya Sharma · ₹12,500",
          "SH-0892 · Emily Watson · £280"
        ].map(it => (
          <div
            key={it}
            style={{
              padding: "11px 20px",
              fontSize: 13,
              color: "#374151",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ color: "#94a3b8" }}>📄</span>
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}