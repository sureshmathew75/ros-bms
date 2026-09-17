import { useState, useEffect, useMemo, useRef } from "react";
import { dbLoadMemos, dbAddMemo, dbUpdateMemo, dbDeleteMemo, dbUploadDoc, dbDeleteDoc } from "../db";
import { showAlert, showConfirm } from "./PopupHost";

/* ─────────────────────────────────────────────────────────────────────────
   MEMOS  (ROS India only — admin-issued PDF memos to staff)

   A simple library for the memos admin already issues from time to time —
   target changes, business-pattern updates, policy announcements — which
   used to just live as loose PDFs with no single place to find them again.
   Admin posts a PDF with a short title/note; every ROS India user (staff
   included) can open the list and read it. Each memo tracks who has
   actually opened it (`viewedBy`), so admin can tell at a glance whether
   it's actually landed, not just been posted.

   Data lives in its own `memos` Supabase table (see db.js) — nothing here
   touches sales, customers, or any other table. The PDF itself lives in
   Supabase Storage, bucket 'memo-docs' (see dbUploadDoc/dbDeleteDoc).
   ───────────────────────────────────────────────────────────────────────── */

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
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const fmtSize = (b) => { if (!b) return ""; if (b < 1024) return b + "B"; if (b < 1048576) return (b / 1024).toFixed(1) + "KB"; return (b / 1048576).toFixed(1) + "MB"; };

export default function MemosPanel({ shopId, shop, user, staffAccounts = [] }) {
  const isAdmin = user?.role === "superadmin" || user?.role === "admin";
  const myId = user?.id || "";
  const myName = user?.fullName || user?.name || (isAdmin ? "Admin" : "Staff");

  const [memos, setMemos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [seenOpenId, setSeenOpenId] = useState(null); // which memo's "seen by" detail is expanded
  const fileRef = useRef(null);

  const refresh = async () => {
    const data = await dbLoadMemos(shopId);
    setMemos(data);
  };

  useEffect(() => { refresh().then(() => setLoaded(true)); }, [shopId]);

  const hasViewed = (memo, id, name) => (memo.viewedBy || []).some(v => (id && v.id === id) || (!id && v.name === name));

  const handleChooseFile = (f) => {
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (ext !== "pdf") { showAlert("Memos are PDF only — please choose a .pdf file."); return; }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ""));
  };

  const resetForm = () => {
    setTitle(""); setNote(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePost = async () => {
    if (!file) { showAlert("Attach a PDF before posting a memo."); return; }
    const finalTitle = title.trim() || file.name.replace(/\.pdf$/i, "");
    setPosting(true);
    // Admin already knows what they just posted, so they start out counted
    // as having seen it — otherwise their own memo would show up as
    // "unread" on their own sidebar the moment they post it.
    const res = await dbAddMemo(shopId, {
      title: finalTitle, note: note.trim(), postedBy: myName,
      viewedBy: [{ id: myId, name: myName, at: new Date().toISOString() }],
    });
    if (res.error) { setPosting(false); showAlert("Couldn't save the memo — please check your connection and try again."); return; }
    const upl = await dbUploadDoc("memo-docs", res.id, file);
    if (upl.error) {
      setPosting(false);
      showAlert("The memo was created but the PDF failed to upload: " + upl.error + "\n\nPlease delete this memo and try posting it again.");
      await refresh();
      return;
    }
    await dbUpdateMemo(res.id, shopId, { fileUrl: upl.url, filePath: upl.path, fileName: file.name });
    setPosting(false);
    resetForm();
    await refresh();
  };

  const handleView = async (memo) => {
    if (!memo.fileUrl) { showAlert("This memo's PDF isn't available."); return; }
    window.open(memo.fileUrl, "_blank", "noopener,noreferrer");
    if (hasViewed(memo, myId, myName)) return;
    const nextViewedBy = [...(memo.viewedBy || []), { id: myId, name: myName, at: new Date().toISOString() }];
    // Update locally right away so the sidebar badge/ripple clears
    // immediately, without waiting on a round trip.
    setMemos(prev => prev.map(m => m.id === memo.id ? { ...m, viewedBy: nextViewedBy } : m));
    await dbUpdateMemo(memo.id, shopId, { viewedBy: nextViewedBy });
  };

  const handleDelete = async (memo) => {
    if (!(await showConfirm(`Delete the memo "${memo.title || "Untitled"}"? This can't be undone.`))) return;
    if (memo.filePath) await dbDeleteDoc("memo-docs", memo.filePath);
    await dbDeleteMemo(memo.id, shopId);
    await refresh();
  };

  const sortedMemos = useMemo(() =>
    [...memos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [memos]);

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading Memos…</div>;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* Self-contained keyframes — also defined in App.jsx's sidebar
         styling for the same "unseen memo" ripple/glow, but kept here too
         so this panel never depends on that render order. */}
      <style>{`
        @keyframes daybook-ripple{0%{transform:scale(1);opacity:0.65;}100%{transform:scale(2.6);opacity:0;}}
      `}</style>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
          🗒️ Memos
        </h2>
        <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>
          Target updates, business-pattern changes, announcements — every memo issued to the team, all in one place.
        </p>
      </div>

      {/* compose — admin/superadmin only */}
      {isAdmin && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 26, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. October Sales Target"
                style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="A line or two of context, if useful…"
                style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>PDF</label>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={e => handleChooseFile(e.target.files?.[0])}
                style={{ fontSize: 12.5, fontFamily: "inherit" }} />
              {file && <div style={{ marginTop: 4, fontSize: 11.5, color: "#166534" }}>📄 {file.name} ({fmtSize(file.size)})</div>}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={handlePost} disabled={posting}
              style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: shop?.accent || "#059669", color: "white", fontWeight: 700, fontSize: 12.5, cursor: posting ? "default" : "pointer", fontFamily: "inherit", opacity: posting ? 0.6 : 1 }}>
              {posting ? "Posting…" : "+ Post Memo"}
            </button>
          </div>
        </div>
      )}

      {/* list, newest first */}
      {sortedMemos.length === 0 ? (
        <div style={{ padding: "22px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
          No memos yet{isAdmin ? " — post the first one above." : "."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sortedMemos.map(m => {
            const iViewed = hasViewed(m, myId, myName);
            const viewedNames = new Set((m.viewedBy || []).map(v => v.name));
            const notSeen = staffAccounts.filter(u => !viewedNames.has(u.fullName || u.name));
            return (
              <div key={m.id} style={{
                background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "13px 15px",
                boxShadow: (!iViewed) ? "0 0 0 1px rgba(245,158,11,0.25)" : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>📄</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}>{m.title || "Untitled memo"}</span>
                        {!iViewed && (
                          <span style={{ fontSize: 9.5, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: "#fef3c7", color: "#92400e" }}>NEW</span>
                        )}
                      </div>
                      {m.note && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3, lineHeight: 1.45 }}>{m.note}</div>}
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
                        Posted by {m.postedBy || "Admin"} · {timeAgo(m.createdAt)}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(m)} title="Delete this memo"
                      style={{ border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2, flexShrink: 0 }}>✕</button>
                  )}
                </div>

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => handleView(m)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: shop?.accent || "#059669", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    📄 View PDF ↗
                  </button>

                  {isAdmin && (
                    <button onClick={() => setSeenOpenId(seenOpenId === m.id ? null : m.id)}
                      style={{ border: "none", background: "transparent", color: "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                      👁 Seen by {(m.viewedBy || []).length}
                    </button>
                  )}
                </div>

                {isAdmin && seenOpenId === m.id && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, fontSize: 11.5, color: "#475569" }}>
                    <div><strong style={{ color: "#166534" }}>Seen:</strong> {(m.viewedBy || []).length ? (m.viewedBy || []).map(v => v.name).join(", ") : "—"}</div>
                    {staffAccounts.length > 0 && (
                      <div style={{ marginTop: 3 }}><strong style={{ color: "#b45309" }}>Not yet seen:</strong> {notSeen.length ? notSeen.map(u => u.fullName || u.name).join(", ") : "everyone has seen this"}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
