import React from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Rosie — the app's floating assistant: a cheerful little girl with a ponytail and bow, drawn entirely in SVG
   (no image files, so it stays light).
   Props: mood ("happy" | "neutral" | "worried" | "crying" | "success"), size, pose
   ("idle" | "walk" | "point" | "fly" | "sit" | "lie" | "cheer"), and optionally
     outfit  — one of OUTFITS below (otherwise picked from today's date + the shop: see rosieOutfitFor)
   Her eyes blink and follow the mouse, brows and mouth change with her mood, and she wears festival outfits
   (Onam, Vishu, Diwali, Christmas, New Year) on the right days.
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
  //            tee        dress      dress shade  trim       shoe       bow / hair accent
  casual:    { tee: "#ffffff", top: "#f7a8c0", top2: "#ec7fa3", trim: "#ffffff", shoe: "#f48fb1", bow: "#f9a8c9", button: "#fde4ee" },
  office:    { tee: "#ffffff", top: "#2c4a75", top2: "#1e3558", trim: "#ffffff", shoe: "#1f2937", bow: "#2c4a75", button: "#cbd5e1" },
  onam:      { tee: "#1f7a46", top: "#fff3cf", top2: "#f0dca0", trim: "#d4a017", shoe: "#d4a017", bow: "#ffffff", button: "#d4a017" },
  vishu:     { tee: "#ffffff", top: "#fcd34d", top2: "#f59e0b", trim: "#ffffff", shoe: "#f59e0b", bow: "#facc15", button: "#fff7d6" },
  diwali:    { tee: "#fde68a", top: "#d6336c", top2: "#a61e4d", trim: "#f59e0b", shoe: "#f59e0b", bow: "#f59e0b", button: "#fde68a" },
  christmas: { tee: "#ffffff", top: "#e03131", top2: "#b02525", trim: "#ffffff", shoe: "#7f1d1d", bow: "#e03131", button: "#ffffff" },
  newyear:   { tee: "#fef3c7", top: "#3b3f9c", top2: "#272a73", trim: "#fbbf24", shoe: "#fbbf24", bow: "#fbbf24", button: "#fbbf24" },
};

let _uid = 0;

export default function Rosie({ mood = "happy", size = 56, pose = "idle", outfit, shopId }) {
  const uid = React.useRef(null);
  if (uid.current === null) uid.current = "rs" + (++_uid);
  const id = uid.current;
  const key = OUTFITS.includes(outfit) ? outfit : rosieOutfitFor(new Date(), shopId);
  const P = PALETTE[key];
  const skin = "#fbdcc0", skinHi = "#ffeedd", skinLo = "#ecb48c";
  const walking = pose === "walk", pointing = pose === "point", flying = pose === "fly";
  const sitting = pose === "sit", lying = pose === "lie";
  const sleepy = sitting || lying;
  const success = mood === "success", cheer = pose === "cheer" || success;
  const crying = mood === "crying", worried = mood === "worried", neutral = mood === "neutral";
  const sad = crying;

  /* eyes follow the mouse a little */
  const ref = React.useRef(null);
  const [look, setLook] = React.useState({ x: 0, y: 0 });
  React.useEffect(() => {
    if (sleepy || cheer) return undefined;
    let last = 0;
    const move = (e) => {
      const now = Date.now(); if (now - last < 60) return; last = now;
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.28);
      const m = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, m / 260);
      setLook({ x: (dx / m) * 1.7 * k, y: (dy / m) * 1.3 * k });
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [sleepy, cheer]);

  const hipL = 44, hipR = 56;
  const lx = sitting ? 30 : flying ? 45 : 43, rx2 = sitting ? 70 : flying ? 55 : 57;
  const dressFill = `url(#${id}d)`;
  const teeFill = P.tee;
  const onam = key === "onam";
  const sleeve = (cx, cy) => <ellipse cx={cx} cy={cy} rx="5.2" ry="4.8" fill={teeFill} stroke="#0000001c" strokeWidth="0.6" />;

  return (
    <svg ref={ref} width={size} height={size * 1.5} viewBox="0 0 100 150" style={{
      animation: (walking || flying || lying) ? "none" : "petBob 2.2s ease-in-out infinite",
      overflow: "visible", transform: lying ? "rotate(90deg)" : "none", transformOrigin: "50px 90px",
    }}>
      <style>{`@keyframes rsBlink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}`}</style>
      <defs>
        <radialGradient id={id + "s"} cx="45%" cy="38%" r="70%"><stop offset="0" stopColor={skinHi} /><stop offset="0.7" stopColor={skin} /><stop offset="1" stopColor={skinLo} /></radialGradient>
        <linearGradient id={id + "h"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6a4430" /><stop offset="0.45" stopColor="#3d2417" /><stop offset="1" stopColor="#24140c" /></linearGradient>
        <linearGradient id={id + "d"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.top} /><stop offset="1" stopColor={P.top2} /></linearGradient>
        <radialGradient id={id + "i"} cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#8a5a3a" /><stop offset="0.55" stopColor="#5a341e" /><stop offset="1" stopColor="#2e180d" /></radialGradient>
      </defs>

      <ellipse cx="50" cy="144" rx="22" ry="3.4" fill={(flying || lying) ? "transparent" : "#00000016"} />
      {lying && <text x="78" y="20" fontSize="16" fill="#94a3b8" style={{ transform: "rotate(-90deg)", transformOrigin: "78px 20px" }}>Zzz</text>}

      {/* wings only while flying */}
      {flying && (<>
        <g style={{ transformOrigin: "36px 82px", animation: "petWingFlap 0.35s ease-in-out infinite" }}><ellipse cx="14" cy="78" rx="18" ry="9" fill="#fbe4f1" opacity="0.95" stroke="#f0abcf" strokeWidth="0.7" transform="rotate(-24 14 78)" /></g>
        <g style={{ transformOrigin: "64px 82px", animation: "petWingFlap 0.35s ease-in-out infinite reverse" }}><ellipse cx="86" cy="78" rx="18" ry="9" fill="#fbe4f1" opacity="0.95" stroke="#f0abcf" strokeWidth="0.7" transform="rotate(24 86 78)" /></g>
      </>)}

      {/* ponytail (behind the head) */}
      <g transform="translate(50 42) scale(1.12) translate(-50 -42)">
      <g style={{ transformOrigin: "30px 20px", animation: (walking || flying) ? "none" : "rsTail 3.2s ease-in-out infinite" }}>
        <style>{`@keyframes rsTail{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-3deg)}}`}</style>
        <path d="M33 21 C14 10 -2 34 5 56 C8 66 15 68 17 62 C14 54 17 42 27 36 C32 33 36 28 33 21 Z" fill={`url(#${id}h)`} />
        <path d="M29 24 C16 22 8 38 10 52" stroke="#8a5e45" strokeWidth="1.1" fill="none" opacity="0.55" strokeLinecap="round" />
        <path d="M24 30 C16 36 14 48 15 58" stroke="#8a5e45" strokeWidth="0.9" fill="none" opacity="0.4" strokeLinecap="round" />
      </g>
      {/* back hair */}
      <ellipse cx="50" cy="40" rx="28.5" ry="27" fill={`url(#${id}h)`} />

      </g>

      {/* legs, socks and sneakers */}
      {[["L", hipL, lx, "petLegSwingL"], ["R", hipR, rx2, "petLegSwingR"]].map(([n, hx, fx, anim]) => (
        <g key={n} style={{ transformOrigin: hx + "px 122px", animation: walking ? anim + " 0.45s ease-in-out infinite" : "none", opacity: flying ? 0.75 : 1 }}>
          <line x1={hx} y1="120" x2={sitting ? fx : (flying ? hx : fx)} y2={sitting ? 126 : 131} stroke={skin} strokeWidth="5.2" strokeLinecap="round" />
          {!sitting && <rect x={fx - 3.1} y="129" width="6.2" height="6.6" rx="2" fill="#fff" stroke="#e5e7eb" strokeWidth="0.4" />}
          {sitting && <line x1={fx} y1="126" x2={fx} y2="134" stroke={skin} strokeWidth="5" strokeLinecap="round" />}
          <ellipse cx={fx + (n === "L" ? -0.8 : 0.8)} cy={sitting ? 137 : 139} rx="7.8" ry="4.3" fill={P.shoe} />
          <path d={`M${fx - 7} 140.6 Q${fx} 144 ${fx + 7} 140.6`} stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx={fx + (n === "L" ? -4.6 : 4.6)} cy={sitting ? 138.4 : 140.2} rx="3" ry="2.1" fill="#fff" />
        </g>
      ))}

      {/* skirt (pinafore) */}
      <path d="M34 92 L66 92 L77 125 Q50 133 23 125 Z" fill={dressFill} />
      <path d="M34 92 L66 92 L67.5 99 Q50 103 32.5 99 Z" fill="#000" opacity="0.06" />
      {onam && (<>
        <path d="M24 119 Q50 127 76 119 L77 125 Q50 133 23 125 Z" fill={P.trim} />
        <path d="M24 122 Q50 130 76 122" stroke="#9a6b07" strokeWidth="0.9" fill="none" />
      </>)}
      {key === "diwali" && <path d="M25 118 Q50 126 75 118" stroke={P.trim} strokeWidth="2.2" fill="none" />}
      {key === "christmas" && <path d="M23.4 120 Q50 128 76.6 120 L77 125 Q50 133 23 125 Z" fill={P.trim} />}
      {key === "newyear" && [[34, 108], [48, 114], [60, 106], [68, 116], [42, 100]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.3" fill={P.trim} />)}
      {/* patch pocket */}
      {!onam && <path d="M41.5 100 L58.5 100 L58.5 110 Q58.5 112.6 56 112.6 L44 112.6 Q41.5 112.6 41.5 110 Z" fill="#fff" fillOpacity="0.12" stroke={P.top2} strokeWidth="0.8" strokeOpacity="0.8" />}

      {/* neck */}
      <path d="M45 63 L45 74 Q50 78 55 74 L55 63 Z" fill={skinLo} />

      {/* tee + bodice */}
      <path d="M35 74 Q50 69 65 74 L66 94 Q50 99 34 94 Z" fill={teeFill} stroke="#00000010" strokeWidth="0.5" />
      {onam ? (<>
        <path d="M65 71 L68 78 L40 104 L34 98 Z" fill={P.top} /><path d="M65 71 L68 78 L40 104 L34 98 Z" fill="none" stroke={P.trim} strokeWidth="2.2" />
      </>) : (<>
        {/* pinafore bodice + straps */}
        <path d="M36 86 L64 86 L66 95 Q50 100 34 95 Z" fill={dressFill} />
        <path d="M38.2 72.5 L42.8 73 L42.4 87 L36.6 87 Z" fill={dressFill} /><path d="M61.8 72.5 L57.2 73 L57.6 87 L63.4 87 Z" fill={dressFill} />
        <circle cx="39.8" cy="80" r="1.7" fill={P.button} stroke="#00000022" strokeWidth="0.4" /><circle cx="60.2" cy="80" r="1.7" fill={P.button} stroke="#00000022" strokeWidth="0.4" />
      </>)}
      {/* peter-pan collar */}
      <path d="M43.4 69.4 Q50 74.4 56.6 69.4 Q54.2 76.4 50 76 Q45.8 76.4 43.4 69.4 Z" fill={key === "office" ? "#fff" : teeFill} stroke="#00000018" strokeWidth="0.5" />
      {key === "christmas" && <path d="M43 70 Q50 77 57 70" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />}

      {/* arms */}
      {!flying && !cheer && (
        <g style={{ transformOrigin: "35px 75px", animation: walking ? "petArmSwing 0.45s ease-in-out infinite" : "none" }}>
          <line x1="35" y1="76" x2="29" y2="98" stroke={skin} strokeWidth="5" strokeLinecap="round" />
          {sleeve(35, 75.5)}
          <circle cx="28.6" cy="99" r="3.5" fill={skin} />
          {key === "diwali" && !pointing && <g><path d="M22 101 L31 101 L29 105 L24 105 Z" fill="#b45309" /><path d="M26.5 93 Q23 98 26.5 101 Q30 98 26.5 93 Z" fill="#fbbf24" style={{ animation: "petBob 0.9s ease-in-out infinite" }} /></g>}
        </g>
      )}
      {!flying && !cheer && (pointing ? (<>
        <line x1="65" y1="76" x2="88" y2="58" stroke={skin} strokeWidth="5" strokeLinecap="round" />
        {sleeve(65, 75.5)}
        <ellipse cx="91" cy="55" rx="4.1" ry="3.4" fill={skin} transform="rotate(-38 91 55)" />
        <path d="M92 51.5 L96.5 49 M93.8 54 L98.5 53.2 M92.8 57 L97 57.8" stroke={skin} strokeWidth="2" strokeLinecap="round" />
      </>) : (
        <g style={{ transformOrigin: "65px 75px", animation: walking ? "petArmSwing 0.45s ease-in-out infinite reverse" : "none" }}>
          <line x1="65" y1="76" x2="71" y2="98" stroke={skin} strokeWidth="5" strokeLinecap="round" />
          {sleeve(65, 75.5)}
          <circle cx="71.4" cy="99" r="3.5" fill={skin} />
        </g>
      ))}
      {!flying && cheer && (<>
        <line x1="35" y1="76" x2="21" y2="56" stroke={skin} strokeWidth="5" strokeLinecap="round" />{sleeve(35, 75.5)}<circle cx="19.8" cy="53.6" r="4" fill={skin} />
        <line x1="65" y1="76" x2="79" y2="56" stroke={skin} strokeWidth="5" strokeLinecap="round" />{sleeve(65, 75.5)}<circle cx="80.2" cy="53.6" r="4" fill={skin} />
      </>)}

      {/* head — drawn a little larger than life, like a cartoon */}
      <g transform="translate(50 42) scale(1.12) translate(-50 -42)">
      <ellipse cx="24.6" cy="47" rx="3.4" ry="4.4" fill={skinLo} /><ellipse cx="75.4" cy="47" rx="3.4" ry="4.4" fill={skinLo} />
      {(key === "diwali" || key === "onam" || key === "newyear") && (<><circle cx="24.6" cy="52" r="1.7" fill="#fbbf24" /><circle cx="75.4" cy="52" r="1.7" fill="#fbbf24" /></>)}
      <ellipse cx="50" cy="44" rx="25.5" ry="23.5" fill={`url(#${id}s)`} />

      {/* fringe: swept across the forehead, with side locks by the ears */}
      <path d="M24 42 C19 18 36 6.5 52 7 C69 7.5 82 20 76 42 C75 36 72 31.5 66 29.5 C62 36 52 33 46 28 C40 33 33 35 28.5 48 Z" fill={`url(#${id}h)`} />
      <path d="M31 24 Q42 12 60 14" stroke="#8a5e45" strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M44 28.5 Q38 34 35 42" stroke="#8a5e45" strokeWidth="0.9" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M23 44 Q21 54 25 59 Q24 53 26.5 46 Z" fill={`url(#${id}h)`} /><path d="M77 44 Q79 54 75 59 Q76 53 73.5 46 Z" fill={`url(#${id}h)`} />

      {/* bow / hair accessory at the ponytail */}
      {(key === "casual" || key === "office" || key === "diwali" || key === "newyear") && (
        <g>
          <path d="M33 21 C24 11 17 15 20 22 C23 28 30 25 33 21 Z" fill={P.bow} stroke="#00000018" strokeWidth="0.5" />
          <path d="M33 21 C37 10 46 9 45 16 C44 22 37 24 33 21 Z" fill={P.bow} stroke="#00000018" strokeWidth="0.5" />
          <path d="M26 19 Q29 21 31 21 M37 16 Q40 15 42 15" stroke="#00000020" strokeWidth="0.8" fill="none" />
          <ellipse cx="33" cy="21" rx="3" ry="3.4" fill={P.bow} stroke="#00000022" strokeWidth="0.5" />
        </g>
      )}
      {key === "onam" && [[31, 20], [27.5, 24], [36, 17], [41, 14.5], [47, 13], [53, 12.4], [59, 12.6], [65, 14]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" stroke="#e5e7eb" strokeWidth="0.5" />)}
      {key === "vishu" && (<g><circle cx="31" cy="19" r="3.2" fill="#eab308" /><circle cx="36" cy="22" r="2.8" fill="#facc15" /><circle cx="27" cy="23" r="2.8" fill="#facc15" /><circle cx="31.5" cy="21.5" r="1.4" fill="#a16207" /></g>)}
      {key === "christmas" && (<g><path d="M28 24 Q32 2 56 -2 Q70 -4 74 9 Q78 16 77 24 Q54 12 28 24 Z" fill="#dc2626" /><path d="M26 22 Q52 9 78 22 L78 29 Q52 16 26 29 Z" fill="#fff" /><circle cx="76" cy="6" r="4.4" fill="#fff" /></g>)}
      {key === "newyear" && (<g><path d="M60 18 L69 -8 L79 20 Z" fill="#fbbf24" /><circle cx="69" cy="-8" r="2.6" fill="#fff" /><path d="M64 11 L75 13 M66 4 L73 6" stroke="#b45309" strokeWidth="1.2" /></g>)}

      {/* face: cheeks */}
      <ellipse cx="31" cy="53.5" rx="5.6" ry="3.6" fill="#f58a98" opacity="0.38" /><ellipse cx="69" cy="53.5" rx="5.6" ry="3.6" fill="#f58a98" opacity="0.38" />
      {key === "diwali" && <circle cx="50" cy="31.5" r="1.5" fill="#dc2626" />}
      {(key === "onam" || key === "vishu") && <circle cx="50" cy="32" r="1.1" fill="#7f1d1d" opacity="0.85" />}

      {/* brows */}
      {(() => {
        const up = worried ? -1.6 : 0, slant = sad ? 1.8 : 0;   // raised when worried, drooping when sad
        return (<>
          <path d={`M33.5 ${33.4 - up * 0.2} Q38.8 ${30.6 + up * 0.4} 44 ${33.6 - slant + up}`} stroke="#5a3826" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d={`M56 ${33.6 - slant + up} Q61.2 ${30.6 + up * 0.4} 66.5 ${33.4 - up * 0.2}`} stroke="#5a3826" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </>);
      })()}

      {/* eyes */}
      {(sleepy || success) ? (
        <g>
          <path d="M33 46 Q38.5 40.6 44 46" stroke="#2a1a12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M56 46 Q61.5 40.6 67 46" stroke="#2a1a12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {sleepy && <><path d="M33.5 45 Q38.5 48.6 43.5 45" stroke="#2a1a12" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M56.5 45 Q61.5 48.6 66.5 45" stroke="#2a1a12" strokeWidth="2" fill="none" strokeLinecap="round" /></>}
        </g>
      ) : (
        <g style={{ transformOrigin: "50px 45px", animation: "rsBlink 4.6s ease-in-out infinite" }}>
          {[38.2, 61.8].map((cx, ix) => (
            <g key={cx}>
              <ellipse cx={cx} cy="45.5" rx="7.3" ry="8" fill="#fff" />
              <ellipse cx={cx + look.x} cy={45.8 + look.y} rx="6" ry="6.9" fill={`url(#${id}i)`} />
              <ellipse cx={cx + look.x} cy={46.3 + look.y} rx="3.1" ry="3.7" fill="#150905" />
              <circle cx={cx + look.x - 2.1} cy={43 + look.y} r="2.3" fill="#fff" />
              <circle cx={cx + look.x + 1.8} cy={48.6 + look.y} r="1" fill="#fff" opacity="0.9" />
              <path d={`M${cx - 7.4} 44.4 Q${cx} 36.6 ${cx + 7.4} 44.4`} stroke="#160b07" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d={ix === 0 ? `M${cx - 7.2} 43 L${cx - 8.9} 41.2` : `M${cx + 7.2} 43 L${cx + 8.9} 41.2`} stroke="#160b07" strokeWidth="0.9" strokeLinecap="round" />
            </g>
          ))}
        </g>
      )}
      {crying && !sleepy && (
        <g style={{ animation: "petBob 1s ease-in-out infinite" }}>
          <path d="M36 53 Q33.2 60 36 65 Q38.8 60 36 53 Z" fill="#60a5fa" opacity="0.85" />
          <path d="M64 53 Q61.2 60 64 65 Q66.8 60 64 53 Z" fill="#60a5fa" opacity="0.85" />
        </g>
      )}

      {/* nose */}
      <path d="M48.6 51.4 Q50 53.2 51.4 51.4" stroke="#d99a72" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* mouth */}
      {sleepy
        ? <path d="M46.5 58 Q50 59.6 53.5 58" stroke="#b4535f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        : crying
          ? <path d="M43.5 61 Q50 55.4 56.5 61" stroke="#b4535f" strokeWidth="2" fill="none" strokeLinecap="round" />
          : worried
            ? (<g><ellipse cx="50" cy="58.6" rx="3.2" ry="3.7" fill="#a83a4d" /><ellipse cx="50" cy="60" rx="1.9" ry="1.5" fill="#e87e8c" /></g>)
            : neutral
              ? <path d="M45 57.4 Q50 60.2 55 57.4" stroke="#b4535f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              : (<g>
                <path d="M41.5 55 Q50 68 58.5 55 Q50 58 41.5 55 Z" fill="#c2364f" />
                <path d="M42.8 55.6 Q50 59.6 57.2 55.6 Q50 58 42.8 55.6 Z" fill="#fff" />
                <path d="M45.5 61.4 Q50 65.2 54.5 61.4 Q50 59.2 45.5 61.4 Z" fill="#ef7a8c" />
              </g>)}
      </g>
    </svg>
  );
}
