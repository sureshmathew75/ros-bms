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

  const isConfirm = state.type === "confirm";
  const accent = isConfirm ? "#2563eb" : "#b45309";
  const accentSoft = isConfirm ? "#eff6ff" : "#fffbeb";
  const accentBorder = isConfirm ? "#bfdbfe" : "#fde68a";

  // Messages that use a blank line as a paragraph break get a bolder lead-in
  // line (a heading) with the rest as regular body copy — pure presentation,
  // the text itself is untouched.
  const parts = String(state.message || "").split(/\n\n+/);
  const heading = parts[0];
  const rest = parts.slice(1).join("\n\n");

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999999,
        background: "rgba(15,23,42,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
      onClick={() => { if (state.type === "alert") close(true); }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 16, padding: "30px 28px 24px",
          maxWidth: 400, width: "92%", textAlign: "center",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
          border: "1px solid #f1f5f9",
        }}
      >
        <div style={{
          width: 46, height: 46, borderRadius: "50%", margin: "0 auto 18px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: accentSoft,
          border: "1.5px solid " + accentBorder,
        }}>
          {isConfirm ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.25" stroke={accent} strokeWidth="1.6" />
              <path d="M9.6 9.4a2.4 2.4 0 1 1 3.4 2.18c-.72.34-1 .82-1 1.42v.3" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="16.6" r="0.9" fill={accent} />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.25" stroke={accent} strokeWidth="1.6" />
              <path d="M12 11v5.4" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="7.6" r="0.9" fill={accent} />
            </svg>
          )}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em",
          lineHeight: 1.4, marginBottom: rest ? 6 : 22, whiteSpace: "pre-line",
        }}>
          {heading}
        </div>
        {rest && (
          <div style={{
            fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 22,
            whiteSpace: "pre-line",
          }}>
            {rest}
          </div>
        )}
        {isConfirm ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => close(false)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#475569", fontWeight: 600, fontSize: 13, letterSpacing: "0.01em", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={() => close(true)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#1e293b", color: "white", fontWeight: 600, fontSize: 13, letterSpacing: "0.01em", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 16px rgba(30,41,59,0.28)" }}>
              OK
            </button>
          </div>
        ) : (
          <button onClick={() => close(true)}
            style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: "#1e293b", color: "white", fontWeight: 600, fontSize: 13.5, letterSpacing: "0.01em", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 16px rgba(30,41,59,0.28)" }}>
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
