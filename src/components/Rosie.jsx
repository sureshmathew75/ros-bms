import React from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Rosie — the app's floating assistant, drawn entirely in SVG (no image files, so it stays light).
   Same props as before: mood ("happy" | "neutral" | "worried" | "crying"), size, pose
   ("idle" | "walk" | "point" | "fly" | "sit" | "lie").  New, optional:
     outfit  — one of OUTFITS below (otherwise picked from today's date + the shop: see rosieOutfitFor)
   She has shaded skin / hair, expressive eyes that blink and follow the mouse, brows and lips that change
   with her mood, and festival outfits (Onam, Vishu, Diwali, Christmas, New Year).
   ───────────────────────────────────────────────────────────────────────────── */

/* Main festival days. Onam (Thiruvonam) and Diwali move every year — add the next years here when you like;
   outside the listed years she simply wears her everyday outfit. */
export const ROSIE_FESTIVAL_DATES = {
  onam:   ["2026-08-27", "2027-09-12", "2028-09-01"],
  diwali: ["2026-11-08", "2027-10-29", "2028-10-17"],
};
const ISO = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const near = (iso, list, before, after) => (list || []).some((f) => {
  const t = new Date(f + "T00:00:00").getTime(), x = new Date(iso + "T00:00:00").getTime();
  return x >= t - before * 86400000 && x <= t + after * 86400000;
});
export const OUTFITS = ["casual", "office", "onam", "vishu", "diwali", "christmas", "newyear"];
export const OUTFIT_LABELS = {
  auto: "Automatic (by date)", casual: "Everyday", office: "Office", onam: "Onam — kasavu saree", vishu: "Vishu — konna yellow",
  diwali: "Diwali — festive", christmas: "Christmas", newyear: "New Year",
};
/* Which outfit she wears on a given day, in a given shop. */
export const rosieOutfitFor = (date, shopId) => {
  const d = date instanceof Date ? date : new Date();
  const iso = ISO(d), md = iso.slice(5);
  const india = shopId === "ros-india" || shopId === "ros-india-staff" || !shopId;
  if (md >= "12-18" && md <= "12-26") return "christmas";
  if (md >= "12-30" || md <= "01-02") return "newyear";
  if (near(iso, ROSIE_FESTIVAL_DATES.diwali, 3, 2)) return "diwali";
  if (india && near(iso, ROSIE_FESTIVAL_DATES.onam, 4, 1)) return "onam";
  if (india && md >= "04-12" && md <= "04-15") return "vishu";
  return india ? "casual" : "office";
};

const PALETTE = {
  casual:    { top: "#f472b6", top2: "#db2777", trim: "#ffffff", bottom: "#fdf2f8", shoe: "#f472b6", hairAcc: "#ec4899" },
  office:    { top: "#1e3a5f", top2: "#0f2540", trim: "#ffffff", bottom: "#1f2937", shoe: "#111827", hairAcc: null },
  onam:      { top: "#166534", top2: "#14532d", trim: "#d4a017", bottom: "#fff8e1", shoe: "#d4a017", hairAcc: "#ffffff" },
  vishu:     { top: "#facc15", top2: "#ca8a04", trim: "#ffffff", bottom: "#fef3c7", shoe: "#f59e0b", hairAcc: "#eab308" },
  diwali:    { top: "#be185d", top2: "#831843", trim: "#f59e0b", bottom: "#9d174d", shoe: "#f59e0b", hairAcc: "#f59e0b" },
  christmas: { top: "#dc2626", top2: "#991b1b", trim: "#ffffff", bottom: "#dc2626", shoe: "#7f1d1d", hairAcc: null },
  newyear:   { top: "#312e81", top2: "#1e1b4b", trim: "#fbbf24", bottom: "#312e81", shoe: "#fbbf24", hairAcc: "#fbbf24" },
};

let _uid = 0;

export default function Rosie({ mood = "happy", size = 56, pose = "idle", outfit, shopId }) {
  const uid = React.useRef(null);
  if (uid.current === null) uid.current = "rs" + (++_uid);
  const id = uid.current;
  const key = OUTFITS.includes(outfit) ? outfit : rosieOutfitFor(new Date(), shopId);
  const P = PALETTE[key];
  const skin = "#f6cfa8", skinHi = "#fde3c8", skinLo = "#e2a77c";
  const walking = pose === "walk", pointing = pose === "point", flying = pose === "fly";
  const sitting = pose === "sit", lying = pose === "lie";
  const sleepy = sitting || lying;
  const crying = mood === "crying", worried = mood === "worried", neutral = mood === "neutral";

  /* eyes follow the mouse a little */
  const ref = React.useRef(null);
  const [look, setLook] = React.useState({ x: 0, y: 0 });
  React.useEffect(() => {
    if (sleepy) return undefined;
    let last = 0;
    const move = (e) => {
      const now = Date.now(); if (now - last < 60) return; last = now;
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.25);
      const m = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, m / 260);
      setLook({ x: (dx / m) * 1.5 * k, y: (dy / m) * 1.1 * k });
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [sleepy]);

  const lx = sitting ? 31 : flying ? 45 : 43, rx2 = sitting ? 69 : flying ? 55 : 57;
  const lipFill = "#d9485f";
  const browY = worried || crying ? -1 : 0;

  return (
    <svg ref={ref} width={size} height={size * 1.5} viewBox="0 0 100 150" style={{
      animation: (walking || flying || lying) ? "none" : "petBob 2.2s ease-in-out infinite",
      overflow: "visible", transform: lying ? "rotate(90deg)" : "none", transformOrigin: "50px 90px",
    }}>
      <style>{`@keyframes rsBlink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}`}</style>
      <defs>
        <radialGradient id={id + "s"} cx="45%" cy="38%" r="70%"><stop offset="0" stopColor={skinHi} /><stop offset="0.65" stopColor={skin} /><stop offset="1" stopColor={skinLo} /></radialGradient>
        <linearGradient id={id + "h"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a3022" /><stop offset="0.5" stopColor="#2a1a12" /><stop offset="1" stopColor="#170d08" /></linearGradient>
        <linearGradient id={id + "t"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.top} /><stop offset="1" stopColor={P.top2} /></linearGradient>
        <radialGradient id={id + "i"} cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#8a5a3a" /><stop offset="1" stopColor="#3b2316" /></radialGradient>
      </defs>

      <ellipse cx="50" cy="143" rx="20" ry="3.6" fill={(flying || lying) ? "transparent" : "#00000018"} />
      {lying && <text x="78" y="20" fontSize="16" fill="#94a3b8" style={{ transform: "rotate(-90deg)", transformOrigin: "78px 20px" }}>Zzz</text>}

      {/* wings only while flying */}
      {flying && (<>
        <g style={{ transformOrigin: "34px 74px", animation: "petWingFlap 0.35s ease-in-out infinite" }}><ellipse cx="14" cy="70" rx="18" ry="9" fill="white" opacity="0.92" transform="rotate(-24 14 70)" /></g>
        <g style={{ transformOrigin: "66px 74px", animation: "petWingFlap 0.35s ease-in-out infinite reverse" }}><ellipse cx="86" cy="70" rx="18" ry="9" fill="white" opacity="0.92" transform="rotate(24 86 70)" /></g>
      </>)}

      {/* long hair, behind the body */}
      <path d="M31 30 Q27 6 50 5 Q73 6 69 30 Q77 58 73 96 Q62 104 50 99 Q38 104 27 96 Q23 58 31 30 Z" fill={`url(#${id}h)`} />
      <path d="M33 36 Q30 62 33 92" stroke="#6b4a36" strokeWidth="1.2" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M67 40 Q71 64 68 90" stroke="#6b4a36" strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round" />

      {/* legs */}
      {[["L", 44, lx, "petLegSwingL"], ["R", 56, rx2, "petLegSwingR"]].map(([n, hx, fx, anim]) => (
        <g key={n} style={{ transformOrigin: hx + "px 118px", animation: walking ? anim + " 0.45s ease-in-out infinite" : "none", opacity: flying ? 0.7 : 1 }}>
          <line x1={hx} y1="118" x2={sitting ? fx : (flying ? hx : fx)} y2={sitting ? 124 : 136} stroke={key === "office" ? "#e7c7a6" : (key === "casual" || key === "vishu") ? P.bottom : skin} strokeWidth="6.4" strokeLinecap="round" />
          {sitting && <line x1={fx} y1="124" x2={fx} y2="134" stroke={skin} strokeWidth="6" strokeLinecap="round" />}
          <ellipse cx={sitting ? fx - 2 * (n === "L" ? 1 : -1) : fx} cy={sitting ? 136 : 138.5} rx="7" ry="3.8" fill={P.shoe} />
        </g>
      ))}

      {/* skirt / lower garment */}
      {key === "onam" ? (<>
        <path d="M33 92 L67 92 L74 134 Q50 141 26 134 Z" fill={P.bottom} />
        <path d="M31 126 L69 126 L74 134 Q50 141 26 134 Z" fill={P.trim} opacity="0.95" />
        <path d="M30 129 Q50 135 70 129" stroke="#a16207" strokeWidth="1" fill="none" />
        <path d="M40 94 L38 130 M50 94 L50 132 M60 94 L62 130" stroke="#e8d9a8" strokeWidth="0.9" opacity="0.8" />
      </>) : key === "office" ? (
        <path d="M34 94 L66 94 L70 124 Q50 128 30 124 Z" fill={P.bottom} />
      ) : (<>
        <path d="M33 90 L67 90 L74 124 Q50 132 26 124 Z" fill={`url(#${id}t)`} />
        <path d="M33 90 L67 90 L69 100 Q50 105 31 100 Z" fill="#000" opacity="0.07" />
        {key === "christmas" && <path d="M26 122 Q50 131 74 122 L74 127 Q50 136 26 127 Z" fill={P.trim} />}
        {key === "diwali" && <path d="M27 120 Q50 129 73 120" stroke={P.trim} strokeWidth="2" fill="none" />}
      </>)}

      {/* neck */}
      <path d="M45 50 L45 64 Q50 69 55 64 L55 50 Z" fill={skinLo} />
      <path d="M45 50 L45 60 Q50 63 55 60 L55 50 Z" fill="#000" opacity="0.06" />

      {/* torso / top */}
      {key === "office" ? (<>
        <path d="M35 66 Q50 61 65 66 L67 96 Q50 101 33 96 Z" fill={`url(#${id}t)`} />
        <path d="M44 63 L50 80 L56 63 Q50 66 44 63 Z" fill="#ffffff" />
        <path d="M44 63 L50 84 L40 70 Z" fill="#0f2540" /><path d="M56 63 L50 84 L60 70 Z" fill="#0f2540" />
        <circle cx="50" cy="90" r="1" fill="#cbd5e1" />
      </>) : key === "onam" ? (<>
        <path d="M35 66 Q50 61 65 66 L66 88 Q50 93 34 88 Z" fill={`url(#${id}t)`} />
        <path d="M65 64 L67 70 L40 104 L34 98 Z" fill={P.bottom} /><path d="M65 64 L67 70 L40 104 L34 98 Z" fill="none" stroke={P.trim} strokeWidth="2.2" />
      </>) : (<>
        <path d="M35 66 Q50 61 65 66 L67 94 Q50 99 33 94 Z" fill={`url(#${id}t)`} />
        <path d="M42 63 Q50 72 58 63" stroke={P.trim} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {key === "diwali" && (<><path d="M36 92 Q50 97 64 92" stroke={P.trim} strokeWidth="2" fill="none" /><circle cx="50" cy="80" r="2" fill={P.trim} /></>)}
        {key === "newyear" && [[42, 76], [58, 84], [48, 92], [60, 70], [38, 88]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={P.trim} />)}
        {key === "christmas" && <path d="M40 63 Q50 74 60 63" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />}
      </>)}

      {/* arms */}
      {!flying && (
        <g style={{ transformOrigin: "35px 68px", animation: walking ? "petArmSwing 0.45s ease-in-out infinite" : "none" }}>
          <line x1="35" y1="69" x2="27" y2="95" stroke={skin} strokeWidth="5.4" strokeLinecap="round" />
          <circle cx="35" cy="68" r="6" fill={key === "onam" ? P.top : `url(#${id}t)`} />
          <circle cx="26.5" cy="96" r="3.6" fill={skin} />
          {key === "diwali" && !pointing && <g><path d="M22 98 L31 98 L29 102 L24 102 Z" fill="#b45309" /><path d="M26.5 90 Q23 95 26.5 98 Q30 95 26.5 90 Z" fill="#fbbf24" style={{ animation: "petBob 0.9s ease-in-out infinite" }} /></g>}
        </g>
      )}
      {!flying && (pointing ? (<>
        <line x1="65" y1="68" x2="89" y2="47" stroke={skin} strokeWidth="5.4" strokeLinecap="round" />
        <circle cx="65" cy="68" r="6" fill={key === "onam" ? P.top : `url(#${id}t)`} />
        <circle cx="89.5" cy="46.5" r="3.6" fill={skin} />
      </>) : (
        <g style={{ transformOrigin: "65px 68px", animation: walking ? "petArmSwing 0.45s ease-in-out infinite reverse" : "none" }}>
          <line x1="65" y1="69" x2="73" y2="95" stroke={skin} strokeWidth="5.4" strokeLinecap="round" />
          <circle cx="65" cy="68" r="6" fill={key === "onam" ? P.top : `url(#${id}t)`} />
          <circle cx="73.5" cy="96" r="3.6" fill={skin} />
        </g>
      ))}

      {/* head */}
      <ellipse cx="32.5" cy="37" rx="2.6" ry="4" fill={skinLo} /><ellipse cx="67.5" cy="37" rx="2.6" ry="4" fill={skinLo} />
      {(key === "diwali" || key === "onam" || key === "newyear") && (<><circle cx="32.5" cy="43" r="1.8" fill="#fbbf24" /><circle cx="67.5" cy="43" r="1.8" fill="#fbbf24" /></>)}
      <ellipse cx="50" cy="34" rx="17.5" ry="20.5" fill={`url(#${id}s)`} />

      {/* fringe, side-parted */}
      <path d="M32 33 Q31 10 52 8 Q70 9 68 30 Q62 18 50 17 Q40 18 34 36 Z" fill={`url(#${id}h)`} />
      <path d="M36 22 Q44 13 58 14" stroke="#7a5540" strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M32 33 Q29 24 33 17 Q31 28 35 36 Z" fill={`url(#${id}h)`} />

      {/* hair accessory */}
      {key === "onam" && [[36, 16], [41, 12], [47, 10.5], [53, 10.5], [59, 12], [64, 16]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.1" fill="#fff" stroke="#e5e7eb" strokeWidth="0.5" />)}
      {key === "vishu" && (<g><circle cx="62" cy="14" r="2.6" fill="#eab308" /><circle cx="66" cy="17" r="2.3" fill="#facc15" /><circle cx="59" cy="18" r="2.3" fill="#facc15" /><circle cx="63" cy="16" r="1.2" fill="#a16207" /></g>)}
      {key === "casual" && (<g><path d="M62 15 Q56 9 53 14 Q57 17 60 16 Q57 17 53 21 Q59 21 62 15 Z" fill={P.hairAcc} /><path d="M62 15 Q68 9 71 14 Q67 17 64 16 Q67 17 71 21 Q65 21 62 15 Z" fill={P.hairAcc} opacity="0.9" /><circle cx="62" cy="15.5" r="1.8" fill="#fff" opacity="0.8" /></g>)}
      {key === "newyear" && (<g><path d="M57 19 L65 -5 L74 21 Z" fill="#fbbf24" /><circle cx="65" cy="-5" r="2.4" fill="#fff" /><path d="M60 12 L70 14 M62 6 L68 8" stroke="#b45309" strokeWidth="1.2" /></g>)}
      {key === "christmas" && (<g><path d="M32 17 Q34 0 54 -3 Q66 -5 71 6 Q76 12 76 20 Q56 9 32 17 Z" fill="#dc2626" /><path d="M31 15 Q52 6 72 15 L72 22 Q52 13 31 22 Z" fill="#fff" /><circle cx="75" cy="19" r="4.2" fill="#fff" /></g>)}

      {/* face */}
      <ellipse cx="38" cy="43" rx="5" ry="3" fill="#f59ea6" opacity="0.32" /><ellipse cx="62" cy="43" rx="5" ry="3" fill="#f59ea6" opacity="0.32" />
      {key === "diwali" && <circle cx="50" cy="26" r="1.4" fill="#dc2626" />}

      {/* brows */}
      <path d={`M37 ${28 + browY * -0} Q42.5 ${25.5} 47.5 ${28 + (worried || crying ? -1.5 : 0)}`} stroke="#3a261b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d={`M52.5 ${28 + (worried || crying ? -1.5 : 0)} Q57.5 25.5 63 28`} stroke="#3a261b" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* eyes */}
      {sleepy ? (
        <g>
          <path d="M38 34 Q43 37 48 34" stroke="#2a1a12" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M52 34 Q57 37 62 34" stroke="#2a1a12" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g style={{ transformOrigin: "50px 34px", animation: "rsBlink 4.6s ease-in-out infinite" }}>
          {[43, 57].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx} cy="34" rx="4.6" ry="3.7" fill="#fff" />
              <circle cx={cx + look.x} cy={34 + look.y} r="2.9" fill={`url(#${id}i)`} />
              <circle cx={cx + look.x} cy={34 + look.y} r="1.35" fill="#140a06" />
              <circle cx={cx + look.x + 1} cy={33 + look.y} r="0.95" fill="#fff" />
              <path d={`M${cx - 5} 33.6 Q${cx} 29.6 ${cx + 5} 33.6`} stroke="#1a0f0a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d={`M${cx - 4.2} 36.2 Q${cx} 38.2 ${cx + 4.2} 36.2`} stroke="#c58f6b" strokeWidth="0.7" fill="none" opacity="0.6" />
            </g>
          ))}
          <path d="M38 32.6 L36.4 31.2 M62 32.6 L63.6 31.2" stroke="#1a0f0a" strokeWidth="1" strokeLinecap="round" />
        </g>
      )}
      {crying && !sleepy && (
        <g style={{ animation: "petBob 1s ease-in-out infinite" }}>
          <path d="M40 38 Q37.5 45 40 50 Q42.5 45 40 38 Z" fill="#60a5fa" opacity="0.85" />
          <path d="M60 38 Q57.5 45 60 50 Q62.5 45 60 38 Z" fill="#60a5fa" opacity="0.85" />
        </g>
      )}

      {/* nose */}
      <path d="M49.2 36 Q47.8 41.4 50 42.4 Q52.2 41.4 50.8 36" stroke="#c98f68" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* bindi on festive days */}
      {(key === "onam" || key === "vishu") && <circle cx="50" cy="27" r="1" fill="#7f1d1d" opacity="0.8" />}

      {/* mouth */}
      {sleepy
        ? <path d="M46.5 47.5 Q50 48.8 53.5 47.5" stroke="#b4535f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        : crying
          ? <path d="M44 50 Q50 45.5 56 50" stroke="#b4535f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          : worried
            ? <path d="M45 48.5 Q50 46 55 48.5" stroke="#b4535f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            : neutral
              ? <path d="M45.5 47.6 Q50 48.8 54.5 47.6" stroke="#b4535f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              : (<g>
                <path d="M43.5 46.4 Q50 53.6 56.5 46.4 Q50 48.6 43.5 46.4 Z" fill={lipFill} />
                <path d="M44.6 47.2 Q50 51.8 55.4 47.2 Q50 49.2 44.6 47.2 Z" fill="#fff" opacity="0.9" />
              </g>)}
    </svg>
  );
}
