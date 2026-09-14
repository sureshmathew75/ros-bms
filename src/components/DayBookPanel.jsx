import { useState, useEffect, useMemo } from "react";
import { dbLoadDayBookNotes, dbAddDayBookNote, dbUpdateDayBookNote, dbDeleteDayBookNote } from "../db";
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

function fmtDayHeader(day) {
  if (!day || day === "unknown") return "Undated";
  const yest = localISO(new Date(Date.now() - 86400000));
  if (day === todayISO()) return "Today";
  if (day === yest) return "Yesterday";
  try {
    return new Date(day + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return day; }
}

const NoteCard = ({ note, isAdmin, onReply, onResolve, onReopen, onDelete, replyDraft, setReplyDraft, resolveDraft, setResolveDraft, resolvingOpen, setResolvingOpen }) => {
  const isResolved = note.status === "resolved";
  return (
    <div style={{
      background: isResolved ? "#fafaf8" : "white",
      border: "1px solid " + ((note.urgent && !isResolved) ? "#fecaca" : "#e7e2d4"),
      borderLeft: (note.urgent && !isResolved) ? "4px solid #dc2626" : "1px solid #e7e2d4",
      borderRadius: 12,
      padding: "13px 15px",
      opacity: isResolved ? 0.75 : 1,
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
        {isAdmin && (
          <button onClick={onDelete} title="Delete this note"
            style={{ border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2 }}>✕</button>
        )}
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
  const [replyDrafts, setReplyDrafts] = useState({});
  const [resolveDrafts, setResolveDrafts] = useState({});
  const [resolvingId, setResolvingId] = useState(null);

  const refresh = async () => {
    const data = await dbLoadDayBookNotes(shopId);
    setNotes(data);
  };

  useEffect(() => { refresh().then(() => setLoaded(true)); }, [shopId]);

  const openNotes = useMemo(() => notes
    .filter(n => n.status === "open")
    .sort((a, b) => (b.urgent === a.urgent ? 0 : (b.urgent ? 1 : -1)) || (new Date(a.createdAt) - new Date(b.createdAt))),
  [notes]);

  const groupedByDay = useMemo(() => {
    const groups = {};
    notes.forEach(n => {
      const day = (n.createdAt || "").slice(0, 10) || "unknown";
      (groups[day] = groups[day] || []).push(n);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [notes]);

  const handleAdd = async () => {
    if (!newText.trim()) { showAlert("Write something before adding it to the Day Book."); return; }
    setPosting(true);
    const res = await dbAddDayBookNote(shopId, {
      author: authorName, authorRole: isAdmin ? "admin" : "staff",
      text: newText.trim(), urgent: newUrgent,
    });
    setPosting(false);
    if (res.error) { showAlert("Couldn't save — please check your connection and try again."); return; }
    setNewText(""); setNewUrgent(false);
    await refresh();
  };

  const handleReply = async (note) => {
    const text = (replyDrafts[note.id] || "").trim();
    if (!text) return;
    const reply = { author: authorName, text, at: new Date().toISOString() };
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
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          rows={2}
          placeholder="Write something that needs attention…"
          style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = shop?.accent || "#059669"}
          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 10 }}>
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
          <p style={{ fontSize: 12.5, color: "#c4bda8", textAlign: "center", padding: "10px 0" }}>Nothing written yet — the first page starts today.</p>
        ) : groupedByDay.map(([day, dayNotes]) => {
          const allResolved = dayNotes.every(n => n.status === "resolved");
          return (
            <div key={day} style={{ marginBottom: 24, background: "#fdfbf3", borderRadius: 14, padding: "16px 18px", border: "1px solid #f1ead4" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #ede4cd" }}>
                <span style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 15.5, fontWeight: 700, color: "#78716c" }}>
                  {fmtDayHeader(day)}
                </span>
                {allResolved && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#166534" }}>✅ All clear</span>}
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
    </div>
  );
}
