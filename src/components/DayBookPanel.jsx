import { useState, useEffect, useMemo } from "react";
import { dbLoadDayBookNotes, dbAddDayBookNote, dbUpdateDayBookNote, dbDeleteDayBookNote,
  dbLoadDayBookTemplates, dbAddDayBookTemplate, dbDeleteDayBookTemplate } from "../db";
import { showAlert, showConfirm } from "./PopupHost";

/* ─────────────────────────────────────────────────────────────────────────
   DAY BOOK  (ROS India only — the shared UK/India handover log)

   Built because WhatsApp is where the day-to-day customer chat happens,
   but a hundred-message day buries the one line that actually needed
   action ("refund this customer") between routine back-and-forth. This
   page is deliberately independent of WhatsApp and of any sale/customer
   record — a staff member writes one line the moment something needs
   doing, admin reviews and resolves it (optionally noting what was
   done), and anything left open never disappears: it stays pinned under
   "Needs Attention" regardless of what day it is, so nothing quietly
   falls through a shift change or a time-zone gap. If it's still open
   the next day, staff reply on the SAME note to nudge it rather than
   writing a new one, so the whole back-and-forth on one issue stays
   together.

   Named "Day Book" after the old bookkeeping term for a shop's running
   daily log — every note also lives on a dated page below the pinned
   section, so the page itself doubles as a full audit trail.

   Data lives in its own `daybook_notes` Supabase table (see db.js) —
   nothing here touches sales, customers, or any other table.
   ───────────────────────────────────────────────────────────────────────── */

function localISO(dt) {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}
const todayISO = () => localISO(new Date());

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ── Whose turn to reply — role-only (not tied to a specific named person):
   walks the note's messages (the note itself, then each reply, in order)
   and returns the role that's now waiting, i.e. the opposite of whoever
   sent the LAST message. Returns null for a resolved note (nothing owed).

   Replies written from now on carry their own authorRole (see handleReply
   below); older replies saved before this feature don't have one, so for
   those we infer a role by simply alternating from the previous message —
   a reasonable assumption for a back-and-forth thread, and it only ever
   affects the small number of replies that already existed before this
   was added. */
function whoseTurn(note) {
  if (!note || note.status !== "open") return null;
  let lastRole = note.authorRole === "admin" ? "admin" : "staff";
  (note.replies || []).forEach(r => {
    lastRole = r.authorRole === "admin" ? "admin" : r.authorRole === "staff" ? "staff" : (lastRole === "admin" ? "staff" : "admin");
  });
  return lastRole === "admin" ? "staff" : "admin";
}

function fmtDayHeader(day) {
  if (!day || day === "unknown") return "Undated";
  const yest = localISO(new Date(Date.now() - 86400000));
  if (day === todayISO()) return "Today";
  if (day === yest) return "Yesterday";
  try {
    return new Date(day + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return day; }
}

// yyyy-mm-dd (native <input type="date"> value) → dd/mm/yyyy, matching how
// dates read elsewhere in the app.
function fmtDMY(iso) {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/* ─────────────────────────────────────────────────────────────────────────
   QUICK TEMPLATES — admin-managed (see the ⚙️ Manage Templates control
   below), stored in the `daybook_templates` table (see db.js) and seeded
   with the 4 that staff originally asked for (Refund, Item Returned,
   Please Call, Orders Received Today) — see daybook_templates_table.sql.

   Each template is a tiny guided form: staff fills in just the named
   fields, and buildNoteText() assembles a clean plain-text note from
   them — it still lands as an ordinary Day Book entry, same as a
   freeform note, so nothing else about the page (Needs Attention,
   Archive, replies, resolve) needs to know templates exist at all.

   Convention: the FIRST field is the headline (e.g. "Customer Name") and
   shows right after the template's label; every field after that is
   listed as its own "Label: value" line below (empty optional ones are
   skipped). This keeps admin-authored templates simple to build — no
   custom wording per template — while still reading cleanly.
   ───────────────────────────────────────────────────────────────────────── */
function buildNoteText(tpl, values) {
  const fmtVal = (f) => {
    const raw = (values[f.key] || "").toString().trim();
    if (!raw) return "";
    return f.type === "date" ? fmtDMY(raw) : raw;
  };
  const [first, ...rest] = tpl.fields || [];
  let text = `${tpl.icon} ${tpl.label}`.trim();
  if (first) text += ` — ${fmtVal(first)}`;
  for (const f of rest) {
    const v = fmtVal(f);
    if (v) text += `\n${f.label}: ${v}`;
  }
  return text;
}

// Turns a field label like "Payment Received Date" into a safe, unique
// storage key ("payment_received_date", "payment_received_date_2", …).
function slugify(label, existingKeys) {
  let base = (label || "field").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
  let key = base, i = 2;
  while (existingKeys.includes(key)) { key = `${base}_${i}`; i++; }
  return key;
}

const NoteCard = ({ note, isAdmin, onReply, onResolve, onReopen, onDelete, replyDraft, setReplyDraft, resolveDraft, setResolveDraft, resolvingOpen, setResolvingOpen }) => {
  const isResolved = note.status === "resolved";
  // Whose turn to reply, role-only (see whoseTurn()) — highlighted ONLY for
  // the side that's actually waiting, so a card doesn't nag the person who
  // just spoke and is themselves waiting on the other side.
  const owedRole = whoseTurn(note);
  const isMyTurn = !!owedRole && ((isAdmin && owedRole === "admin") || (!isAdmin && owedRole === "staff"));
  return (
    <div style={{
      background: isResolved ? "#fafaf8" : "white",
      border: "1px solid " + ((note.urgent && !isResolved) ? "#fecaca" : "#e7e2d4"),
      borderLeft: (note.urgent && !isResolved) ? "4px solid #dc2626" : "1px solid #e7e2d4",
      borderRadius: 12,
      padding: "13px 15px",
      opacity: isResolved ? 0.75 : 1,
      animation: isMyTurn ? "daybook-card-glow 2.2s ease-in-out infinite" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 12.5, color: "#0f172a" }}>{note.author || "Staff"}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
            background: note.authorRole === "admin" ? "#eff6ff" : "#f1f5f9",
            color: note.authorRole === "admin" ? "#2563eb" : "#64748b",
          }}>{note.authorRole === "admin" ? "Admin" : "Staff"}</span>
          {note.urgent && !isResolved && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
              🔖 URGENT
            </span>
          )}
          <span style={{ fontSize: 10.5, color: "#94a3b8" }}>{timeAgo(note.createdAt)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {isMyTurn && (
            <span style={{ position: "relative", display: "inline-flex" }}>
              {/* sonar ripple — same visual language as the sidebar badge, so
                 "it's your turn" reads as one consistent Day Book signal */}
              {[0, 1].map(i => (
                <span key={i} style={{
                  position: "absolute", inset: 0, borderRadius: 999,
                  border: "1.5px solid #6366f1",
                  animation: "daybook-ripple 1.8s ease-out infinite",
                  animationDelay: (i * 0.9) + "s",
                }} />
              ))}
              <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: "#eef2ff", color: "#4338ca", fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}>
                ⏳ Your turn
              </span>
            </span>
          )}
          {isAdmin && (
            <button onClick={onDelete} title="Delete this note"
              style={{ border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{
        fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
        color: isResolved ? "#94a3b8" : "#334155",
        textDecoration: isResolved ? "line-through" : "none",
      }}>
        {note.text}
      </div>

      {isResolved && (
        <div style={{ marginTop: 9, fontSize: 11.5, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 10px" }}>
          ✅ Done by {note.resolvedBy || "Admin"}{note.resolvedAt ? " · " + timeAgo(note.resolvedAt) : ""}
          {note.resolvedNote && <div style={{ marginTop: 2, color: "#15803d" }}>{note.resolvedNote}</div>}
        </div>
      )}

      {note.replies && note.replies.length > 0 && (
        <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 5, paddingLeft: 11, borderLeft: "2px solid #f1f5f9" }}>
          {note.replies.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: "#475569" }}>
              <strong style={{ color: "#0f172a" }}>{r.author}:</strong> {r.text}
              <span style={{ marginLeft: 7, fontSize: 10, color: "#94a3b8" }}>{timeAgo(r.at)}</span>
            </div>
          ))}
        </div>
      )}

      {!isResolved && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={replyDraft || ""}
            onChange={e => setReplyDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onReply(); } }}
            placeholder="Reply or nudge…"
            style={{ flex: 1, minWidth: 140, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={onReply}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#475569" }}>
            Send
          </button>
          {isAdmin && !resolvingOpen && (
            <button onClick={() => setResolvingOpen(true)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#166534", color: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              ✓ Mark Done
            </button>
          )}
        </div>
      )}

      {!isResolved && isAdmin && resolvingOpen && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <input
            value={resolveDraft || ""}
            onChange={e => setResolveDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onResolve(); } }}
            placeholder="What did you do? (optional)"
            autoFocus
            style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid #a7f3d0", fontSize: 12, fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={onResolve}
            style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#166534", color: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Confirm
          </button>
          <button onClick={() => setResolvingOpen(false)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#64748b" }}>
            Cancel
          </button>
        </div>
      )}

      {isResolved && isAdmin && (
        <button onClick={onReopen}
          style={{ marginTop: 8, border: "none", background: "transparent", color: "#94a3b8", fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0 }}>
          Reopen
        </button>
      )}
    </div>
  );
};

export default function DayBookPanel({ shopId, shop, user }) {
  const isAdmin = user?.role === "superadmin" || user?.role === "admin";
  const authorName = user?.fullName || user?.name || "Staff";

  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [newText, setNewText] = useState("");
  const [newUrgent, setNewUrgent] = useState(false);
  const [posting, setPosting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState(null); // null = plain note
  const [templateValues, setTemplateValues] = useState({});
  const activeTemplate = templates.find(t => t.id === activeTemplateId) || null;

  // Manage Templates (admin only)
  const [manageOpen, setManageOpen] = useState(false);
  const [creatingTpl, setCreatingTpl] = useState(false);
  const [tplIcon, setTplIcon] = useState("📝");
  const [tplLabel, setTplLabel] = useState("");
  const [tplUrgent, setTplUrgent] = useState(false);
  const [tplFields, setTplFields] = useState([{ label: "", type: "text", required: true }]);
  const [savingTpl, setSavingTpl] = useState(false);

  const chooseTemplate = (tpl) => {
    setActiveTemplateId(tpl.id);
    setTemplateValues({});
    setNewUrgent(tpl.urgent);
  };
  const clearTemplate = () => {
    setActiveTemplateId(null);
    setTemplateValues({});
    setNewUrgent(false);
  };
  const [replyDrafts, setReplyDrafts] = useState({});
  const [resolveDrafts, setResolveDrafts] = useState({});
  const [resolvingId, setResolvingId] = useState(null);

  const refresh = async () => {
    const data = await dbLoadDayBookNotes(shopId);
    setNotes(data);
  };
  const refreshTemplates = async () => {
    const data = await dbLoadDayBookTemplates(shopId);
    setTemplates(data);
  };

  useEffect(() => {
    Promise.all([refresh(), refreshTemplates()]).then(() => setLoaded(true));
  }, [shopId]);

  const resetTplForm = () => {
    setCreatingTpl(false);
    setTplIcon("📝"); setTplLabel(""); setTplUrgent(false);
    setTplFields([{ label: "", type: "text", required: true }]);
  };

  const handleAddField = () => setTplFields(prev => [...prev, { label: "", type: "text", required: true }]);
  const handleRemoveField = (i) => setTplFields(prev => prev.filter((_, idx) => idx !== i));
  const handleFieldChange = (i, patch) => setTplFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const handleSaveTemplate = async () => {
    if (!tplLabel.trim()) { showAlert("Give the template a name before saving."); return; }
    const cleanFields = tplFields.filter(f => f.label.trim());
    if (cleanFields.length === 0) { showAlert("Add at least one field before saving."); return; }
    const keys = [];
    const fieldsWithKeys = cleanFields.map(f => {
      const key = slugify(f.label, keys);
      keys.push(key);
      return { key, label: f.label.trim(), type: f.type, required: !!f.required };
    });
    setSavingTpl(true);
    const res = await dbAddDayBookTemplate(shopId, {
      icon: (tplIcon || "📝").trim() || "📝", label: tplLabel.trim(), urgent: tplUrgent, fields: fieldsWithKeys,
    });
    setSavingTpl(false);
    if (res.error) { showAlert("Couldn't save the template — please check your connection and try again."); return; }
    resetTplForm();
    await refreshTemplates();
  };

  const handleDeleteTemplate = async (tpl) => {
    if (!(await showConfirm(`Delete the "${tpl.label}" template? Notes already written from it are not affected.`))) return;
    await dbDeleteDayBookTemplate(tpl.id, shopId);
    if (activeTemplateId === tpl.id) clearTemplate();
    await refreshTemplates();
  };

  const openNotes = useMemo(() => notes
    .filter(n => n.status === "open")
    .sort((a, b) => (b.urgent === a.urgent ? 0 : (b.urgent ? 1 : -1)) || (new Date(a.createdAt) - new Date(b.createdAt))),
  [notes]);

  // Archive shows only RESOLVED notes, grouped by the day they were written —
  // an open note lives solely in "Needs Attention" above until it's marked
  // done, so nothing appears twice on screen at once. The permanent record
  // is still complete: once resolved, a note stays in its day's Archive
  // entry forever.
  const groupedByDay = useMemo(() => {
    const groups = {};
    notes.filter(n => n.status === "resolved").forEach(n => {
      const day = (n.createdAt || "").slice(0, 10) || "unknown";
      (groups[day] = groups[day] || []).push(n);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [notes]);

  const handleAdd = async () => {
    let text;
    if (activeTemplate) {
      for (const f of activeTemplate.fields) {
        if (f.required && !String(templateValues[f.key] || "").trim()) {
          showAlert(`Please fill in "${f.label}" before adding this note.`);
          return;
        }
      }
      text = buildNoteText(activeTemplate, templateValues).trim();
    } else {
      if (!newText.trim()) { showAlert("Write something before adding it to the Day Book."); return; }
      text = newText.trim();
    }
    setPosting(true);
    const res = await dbAddDayBookNote(shopId, {
      author: authorName, authorRole: isAdmin ? "admin" : "staff",
      text, urgent: newUrgent,
    });
    setPosting(false);
    if (res.error) { showAlert("Couldn't save — please check your connection and try again."); return; }
    setNewText("");
    clearTemplate();
    await refresh();
  };

  const handleReply = async (note) => {
    const text = (replyDrafts[note.id] || "").trim();
    if (!text) return;
    const reply = { author: authorName, authorRole: isAdmin ? "admin" : "staff", text, at: new Date().toISOString() };
    const res = await dbUpdateDayBookNote(note.id, shopId, { replies: [...(note.replies || []), reply] });
    if (res.error) { showAlert("Couldn't send — please check your connection and try again."); return; }
    setReplyDrafts(prev => ({ ...prev, [note.id]: "" }));
    await refresh();
  };

  const handleResolve = async (note) => {
    const res = await dbUpdateDayBookNote(note.id, shopId, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: authorName,
      resolvedNote: (resolveDrafts[note.id] || "").trim(),
    });
    if (res.error) { showAlert("Couldn't save — please check your connection and try again."); return; }
    setResolvingId(null);
    setResolveDrafts(prev => ({ ...prev, [note.id]: "" }));
    await refresh();
  };

  const handleReopen = async (note) => {
    if (!(await showConfirm("Reopen this note?"))) return;
    const res = await dbUpdateDayBookNote(note.id, shopId, { status: "open", resolvedAt: null, resolvedBy: "", resolvedNote: "" });
    if (res.error) { showAlert("Couldn't reopen — please check your connection and try again."); return; }
    await refresh();
  };

  const handleDelete = async (note) => {
    if (!(await showConfirm("Delete this note? This can't be undone."))) return;
    await dbDeleteDayBookNote(note.id, shopId);
    await refresh();
  };

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading Day Book…</div>;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* Self-contained keyframes for the "your turn" ripple + card glow —
         these are also defined in App.jsx's sidebar styling, but kept here
         too so this panel never depends on that render order. */}
      <style>{`
        @keyframes daybook-ripple{0%{transform:scale(1);opacity:0.65;}100%{transform:scale(2.6);opacity:0;}}
        @keyframes daybook-card-glow{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.30);}50%{box-shadow:0 0 0 5px rgba(99,102,241,0);}}
      `}</style>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
          📔 Day Book
        </h2>
        <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>
          Anything that comes up mid-chat and needs doing — separate from WhatsApp, so it never gets lost between messages.
        </p>
      </div>

      {/* compose */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 26, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* quick template chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12, alignItems: "center" }}>
          {templates.map(tpl => (
            <button key={tpl.id} onClick={() => chooseTemplate(tpl)}
              style={{
                padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: 700,
                border: "1px solid " + (activeTemplateId === tpl.id ? (shop?.accent || "#059669") : "#e2e8f0"),
                background: activeTemplateId === tpl.id ? (shop?.accent || "#059669") : "white",
                color: activeTemplateId === tpl.id ? "white" : "#475569",
              }}>
              {tpl.icon} {tpl.label}
            </button>
          ))}
          {activeTemplateId && (
            <button onClick={clearTemplate}
              style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e2e8f0", background: "white", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              ✕ Plain note instead
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setManageOpen(true)}
              style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 999, border: "1px dashed #cbd5e1", background: "transparent", color: "#94a3b8", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              ⚙️ Manage Templates
            </button>
          )}
        </div>

        {activeTemplate ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeTemplate.fields.map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
                  {f.label}{f.required && <span style={{ color: "#dc2626" }}> *</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    value={templateValues[f.key] || ""}
                    onChange={e => setTemplateValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    rows={2}
                    placeholder={f.placeholder || ""}
                    style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                ) : (
                  <input
                    type={f.type === "date" ? "date" : "text"}
                    value={templateValues[f.key] || ""}
                    onChange={e => setTemplateValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || ""}
                    style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            rows={2}
            placeholder="Write something that needs attention…"
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = shop?.accent || "#059669"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: newUrgent ? "#dc2626" : "#64748b", cursor: "pointer" }}>
            <input type="checkbox" checked={newUrgent} onChange={e => setNewUrgent(e.target.checked)} />
            🔖 Mark Urgent
          </label>
          <button onClick={handleAdd} disabled={posting}
            style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: shop?.accent || "#059669", color: "white", fontWeight: 700, fontSize: 12.5, cursor: posting ? "default" : "pointer", fontFamily: "inherit", opacity: posting ? 0.6 : 1 }}>
            {posting ? "Adding…" : "+ Add to Day Book"}
          </button>
        </div>
      </div>

      {/* pinned open items */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          📌 Needs Attention{openNotes.length > 0 ? ` (${openNotes.length})` : ""}
        </div>
        {openNotes.length === 0 ? (
          <div style={{ padding: "22px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, color: "#166534", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
            ✅ All caught up — nothing open right now.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {openNotes.map(n => (
              <NoteCard key={"pinned-" + n.id} note={n} isAdmin={isAdmin}
                replyDraft={replyDrafts[n.id]} setReplyDraft={v => setReplyDrafts(prev => ({ ...prev, [n.id]: v }))}
                resolveDraft={resolveDrafts[n.id]} setResolveDraft={v => setResolveDrafts(prev => ({ ...prev, [n.id]: v }))}
                resolvingOpen={resolvingId === n.id} setResolvingOpen={open => setResolvingId(open ? n.id : null)}
                onReply={() => handleReply(n)} onResolve={() => handleResolve(n)}
                onReopen={() => handleReopen(n)} onDelete={() => handleDelete(n)}
              />
            ))}
          </div>
        )}
      </div>

      {/* archive, grouped by day like ledger pages */}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          📖 Archive
        </div>
        {groupedByDay.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "#c4bda8", textAlign: "center", padding: "10px 0" }}>Nothing resolved yet — completed notes will collect here, grouped by the day they were written.</p>
        ) : groupedByDay.map(([day, dayNotes]) => {
          return (
            <div key={day} style={{ marginBottom: 24, background: "#fdfbf3", borderRadius: 14, padding: "16px 18px", border: "1px solid #f1ead4" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #ede4cd" }}>
                <span style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 15.5, fontWeight: 700, color: "#78716c" }}>
                  {fmtDayHeader(day)}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#166534" }}>✅ {dayNotes.length} resolved</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 14, borderLeft: "2px solid #ede4cd" }}>
                {dayNotes.map(n => (
                  <NoteCard key={"archive-" + n.id} note={n} isAdmin={isAdmin}
                    replyDraft={replyDrafts[n.id]} setReplyDraft={v => setReplyDrafts(prev => ({ ...prev, [n.id]: v }))}
                    resolveDraft={resolveDrafts[n.id]} setResolveDraft={v => setResolveDrafts(prev => ({ ...prev, [n.id]: v }))}
                    resolvingOpen={resolvingId === n.id} setResolvingOpen={open => setResolvingId(open ? n.id : null)}
                    onReply={() => handleReply(n)} onResolve={() => handleResolve(n)}
                    onReopen={() => handleReopen(n)} onDelete={() => handleDelete(n)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage Templates (admin only) */}
      {manageOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 999998, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => { setManageOpen(false); resetTplForm(); }}
        >
          <div onClick={e => e.stopPropagation()}
            style={{ background: "white", borderRadius: 16, padding: 22, maxWidth: 480, width: "94%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: "#0f172a" }}>⚙️ Manage Templates</h3>
              <button onClick={() => { setManageOpen(false); resetTplForm(); }}
                style={{ border: "none", background: "transparent", color: "#94a3b8", fontSize: 16, cursor: "pointer", padding: 2 }}>✕</button>
            </div>

            {/* existing templates */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {templates.length === 0 && !creatingTpl && (
                <p style={{ fontSize: 12.5, color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>No templates yet.</p>
              )}
              {templates.map(tpl => (
                <div key={tpl.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <span style={{ fontSize: 16 }}>{tpl.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{tpl.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {(tpl.fields || []).length} field{(tpl.fields || []).length === 1 ? "" : "s"}{tpl.urgent ? " · defaults Urgent" : ""}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteTemplate(tpl)} title="Delete template"
                    style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {!creatingTpl ? (
              <button onClick={() => setCreatingTpl(true)}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px dashed #cbd5e1", background: "transparent", color: "#475569", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                + New Template
              </button>
            ) : (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input value={tplIcon} onChange={e => setTplIcon(e.target.value)} placeholder="📝"
                    style={{ width: 48, textAlign: "center", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 0", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
                  <input value={tplLabel} onChange={e => setTplLabel(e.target.value)} placeholder="Template name, e.g. Refund to Customer"
                    style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#64748b", cursor: "pointer", marginBottom: 12 }}>
                  <input type="checkbox" checked={tplUrgent} onChange={e => setTplUrgent(e.target.checked)} />
                  Default to 🔖 Urgent when this template is used
                </label>

                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Fields — the first one becomes the headline of the note
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {tplFields.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={f.label} onChange={e => handleFieldChange(i, { label: e.target.value })}
                        placeholder={i === 0 ? "e.g. Customer Name" : "Field label"}
                        style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", outline: "none" }} />
                      <select value={f.type} onChange={e => handleFieldChange(i, { type: e.target.value })}
                        style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 6px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                        <option value="text">Text</option>
                        <option value="textarea">Long text</option>
                        <option value="date">Date</option>
                      </select>
                      <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: "#94a3b8", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={!!f.required} onChange={e => handleFieldChange(i, { required: e.target.checked })} />
                        Req.
                      </label>
                      {tplFields.length > 1 && (
                        <button onClick={() => handleRemoveField(i)} title="Remove field"
                          style={{ border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 13 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={handleAddField}
                  style={{ border: "none", background: "transparent", color: shop?.accent || "#059669", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 14 }}>
                  + Add Field
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={resetTplForm}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveTemplate} disabled={savingTpl}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: shop?.accent || "#059669", color: "white", fontWeight: 700, fontSize: 12.5, cursor: savingTpl ? "default" : "pointer", fontFamily: "inherit", opacity: savingTpl ? 0.6 : 1 }}>
                    {savingTpl ? "Saving…" : "Save Template"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
