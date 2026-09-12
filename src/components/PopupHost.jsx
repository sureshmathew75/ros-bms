import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   POPUP HOST — a stylish, centered replacement for the browser's native
   alert()/confirm(), used everywhere in the app instead of those.

   Native alert()/confirm() render as an unstyled OS dialog pinned near the
   top of the browser chrome — this renders a proper in-app modal, centered
   on screen, matching the rest of the app's look.

   Deliberately plain functions (showAlert/showConfirm), NOT a React hook —
   alert() and confirm() get called from dozens of components scattered
   across App.jsx and the panel files, including deep inside event handlers.
   A hook would need wiring into every one of those components; a module-
   level function can be called from anywhere just like the browser
   built-ins it replaces, with a single <PopupHost/> mounted once at the
   app's root doing the actual rendering.

   Usage:
     import { showAlert, showConfirm } from "./PopupHost"; (or "../PopupHost"
     from a file in components/)
     showAlert("Couldn't save — please try again.");
     const ok = await showConfirm("Delete this item? This can't be undone.");
     if (!ok) return;
   ───────────────────────────────────────────────────────────────────────── */

let _setState = null;

export function showAlert(message) {
  if (_setState) _setState({ type: "alert", message });
  else window.alert(message); // fallback if PopupHost hasn't mounted yet
}

export function showConfirm(message) {
  return new Promise((resolve) => {
    if (_setState) _setState({ type: "confirm", message, resolve });
    else resolve(window.confirm(message));
  });
}

export default function PopupHost() {
  const [state, setState] = useState(null);

  useEffect(() => {
    _setState = setState;
    return () => { _setState = null; };
  }, []);

  if (!state) return null;

  const close = (result) => {
    if (state.type === "confirm" && state.resolve) state.resolve(result);
    setState(null);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999999,
        background: "rgba(15,23,42,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={() => { if (state.type === "alert") close(true); }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 18, padding: "28px 26px 24px",
          maxWidth: 400, width: "92%", textAlign: "center",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
          border: "1px solid #f1f5f9",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: state.type === "confirm" ? "#eff6ff" : "#fffbeb",
          border: "1.5px solid " + (state.type === "confirm" ? "#bfdbfe" : "#fde68a"),
          fontSize: 24,
        }}>
          {state.type === "confirm" ? "❓" : "ℹ️"}
        </div>
        <div style={{
          fontSize: 13.5, color: "#334155", lineHeight: 1.6, marginBottom: 22,
          whiteSpace: "pre-line",
        }}>
          {state.message}
        </div>
        {state.type === "confirm" ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => close(false)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={() => close(true)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#1e293b", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              OK
            </button>
          </div>
        ) : (
          <button onClick={() => close(true)}
            style={{ width: "100%", padding: "12px 0", borderRadius: 11, border: "none", background: "#1e293b", color: "white", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
