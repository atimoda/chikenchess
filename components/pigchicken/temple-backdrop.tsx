// The temple scene's backdrop (Templo do Gongo), inspired by the halls of a Chinese palace: a teal sky with drifting
// clouds, golden tiled roofs with upturned eaves, red columns, a painted beam band, white marble balustrades, a red
// wall in front and lanterns that sway. Plain SVG in world units (one scene: 1920 x WORLD_GROUND_Y); the lanterns
// light up when a stage is cleared (data-temple on the world element, set by the Parquinho).
import { SCENE_W, WORLD_GROUND_Y } from "@/lib/pigchicken/world"

const G = WORLD_GROUND_Y

// a hip roof: ridge from cx-top..cx+top at yTop, eaves cx-bot..cx+bot at yBot, the corners flying up
function roof(cx: number, yTop: number, top: number, bot: number, yBot: number, fly = 26) {
  const l = cx - bot, r = cx + bot
  return [
    `M ${l - fly} ${yBot - 14}`,
    `Q ${l - 4} ${yBot - 2} ${l + 26} ${yBot - 8}`,
    `Q ${cx - top - (bot - top) * 0.15} ${yBot - (yBot - yTop) * 0.25} ${cx - top} ${yTop}`,
    `L ${cx + top} ${yTop}`,
    `Q ${cx + top + (bot - top) * 0.15} ${yBot - (yBot - yTop) * 0.25} ${r - 26} ${yBot - 8}`,
    `Q ${r + 4} ${yBot - 2} ${r + fly} ${yBot - 14}`,
    `L ${r + fly - 10} ${yBot + 6}`,
    `L ${l - fly + 10} ${yBot + 6} Z`,
  ].join(" ")
}

// the roof's upper outline as points (the same curves as roof()), for its platform collider
type Pt = [number, number]
const quad = (a: Pt, c: Pt, b: Pt, n = 6): Pt[] => Array.from({ length: n }, (_, i) => { const t = (i + 1) / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as Pt })
function roofTop(cx: number, yTop: number, top: number, bot: number, yBot: number, fly = 26): Pt[] {
  const l = cx - bot, r = cx + bot
  const p0: Pt = [l - fly, yBot - 14], p1: Pt = [l + 26, yBot - 8], p2: Pt = [cx - top, yTop], p3: Pt = [cx + top, yTop], p4: Pt = [r - 26, yBot - 8], p5: Pt = [r + fly, yBot - 14]
  return [p0, ...quad(p0, [l - 4, yBot - 2], p1, 3), ...quad(p1, [cx - top - (bot - top) * 0.15, yBot - (yBot - yTop) * 0.25], p2), p3, ...quad(p3, [cx + top + (bot - top) * 0.15, yBot - (yBot - yTop) * 0.25], p4), ...quad(p4, [r + 4, yBot - 2], p5, 3)]
}
// a roof's lower edge (the eaves' line), straight
const eaves = (cx: number, bot: number, yBot: number, fly = 26): Pt[] => [[cx - bot - fly + 10, yBot + 6], [cx + bot + fly - 10, yBot + 6]]

// The roofs and eaves she can stand on (scene units): one-way floors with the roofs' own curves. The main hall's
// two roofs and their eaves, and the right pavilion's pyramid and lower roof (the faded far pavilion is scenery).
export const TEMPLE_ROOF_LINES: { id: string; pts: Pt[] }[] = [
  { id: "roof-main-top", pts: roofTop(660, 400, 400 * 0.55, 400 + 70, 524, 30) },
  { id: "roof-main-top-eaves", pts: eaves(660, 470, 524, 30) },
  { id: "roof-main-low", pts: roofTop(660, 576, 510, 580, 642, 34) },
  { id: "roof-main-low-eaves", pts: eaves(660, 580, 642, 34) },
  { id: "roof-right-top", pts: [[1560, 556], ...quad([1560, 556], [1590, 552], [1610, 540], 3), [1730, 452], [1850, 540], ...quad([1850, 540], [1870, 552], [1900, 556], 3)] },
  { id: "roof-right-low", pts: roofTop(1730, 596, 70, 170, 650, 30) },
]
// "x,y x,y …" for data-chicken-line
export const lineAttr = (pts: Pt[]) => pts.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(" ")

// one hall: a stone base, columns with lattice windows, the painted band and its roof (two roofs when tall)
function Hall({ cx, half, base, colTop, upper, dim = 1 }: { cx: number; half: number; base: number; colTop: number; upper?: { half: number; top: number; ridge: number }; dim?: number }) {
  const cols = Math.max(4, Math.round((half * 2) / 82))
  const step = (half * 2) / cols
  return (
    <g opacity={dim}>
      {upper && (
        <>
          <rect x={cx - upper.half} y={upper.top} width={upper.half * 2} height={colTop - 64 - upper.top} fill="#8d1b14" />
          <rect x={cx - upper.half} y={colTop - 92} width={upper.half * 2} height={28} fill="url(#tp-band)" />
          <path d={roof(cx, upper.ridge, upper.half * 0.55, upper.half + 70, upper.top + 4, 30)} fill="url(#tp-tiles)" stroke="#9c6413" strokeWidth={2} />
          <rect x={cx - upper.half * 0.55 - 6} y={upper.ridge - 12} width={upper.half * 1.1 + 12} height={14} rx={3} fill="#b5761a" />
          <path d={`M ${cx - upper.half * 0.55 - 10} ${upper.ridge - 10} q -6 -22 10 -30 q 4 12 12 10 z M ${cx + upper.half * 0.55 + 10} ${upper.ridge - 10} q 6 -22 -10 -30 q -4 12 -12 10 z`} fill="#c98a1c" />
        </>
      )}
      {/* lower roof over the columns */}
      <path d={roof(cx, colTop - 64, half - 10, half + 60, colTop + 2, 34)} fill="url(#tp-tiles)" stroke="#9c6413" strokeWidth={2} />
      <rect x={cx - half} y={colTop} width={half * 2} height={26} fill="url(#tp-band)" />
      <rect x={cx - half} y={colTop + 26} width={half * 2} height={base - colTop - 26} fill="#7a1710" />
      {Array.from({ length: cols }, (_, i) => (
        <g key={i}>
          <rect x={cx - half + i * step + 14} y={colTop + 34} width={step - 28} height={base - colTop - 44} fill="url(#tp-lattice)" stroke="#5c120d" strokeWidth={2} />
        </g>
      ))}
      {Array.from({ length: cols + 1 }, (_, i) => (
        <rect key={`c${i}`} x={cx - half + i * step - 7} y={colTop + 26} width={14} height={base - colTop - 26} fill="#b3261e" />
      ))}
      <rect x={cx - half - 30} y={base} width={half * 2 + 60} height={12} fill="#d9d4c7" />
    </g>
  )
}

function Lantern({ x, y, d = 0 }: { x: number; y: number; d?: number }) {
  return (
    <g className="tp-lantern" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${-d}s` }}>
      <line x1={x} y1={y} x2={x} y2={y + 26} stroke="#3a2a1b" strokeWidth={2} />
      <circle className="tp-glow" cx={x} cy={y + 50} r={46} fill="url(#tp-glow)" />
      <rect x={x - 12} y={y + 24} width={24} height={6} rx={2} fill="#ffd166" />
      <ellipse cx={x} cy={y + 50} rx={24} ry={22} fill="#e63946" />
      <path d={`M ${x - 12} ${y + 30} Q ${x - 22} ${y + 50} ${x - 12} ${y + 70} M ${x} ${y + 28} L ${x} ${y + 72} M ${x + 12} ${y + 30} Q ${x + 22} ${y + 50} ${x + 12} ${y + 70}`} stroke="#9d0208" strokeWidth={2} fill="none" />
      <rect x={x - 12} y={y + 70} width={24} height={6} rx={2} fill="#ffd166" />
      <path d={`M ${x - 4} ${y + 76} l 0 16 M ${x} ${y + 76} l 0 20 M ${x + 4} ${y + 76} l 0 16`} stroke="#ffb703" strokeWidth={2} />
    </g>
  )
}

export function TempleBackdrop({ left }: { left: number }) {
  return (
    <svg aria-hidden="true" className="absolute top-0" style={{ left, width: SCENE_W, height: G + 160, overflow: "visible" }} viewBox={`0 0 ${SCENE_W} ${G + 160}`}>
      <defs>
        <linearGradient id="tp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#173f52" />
          <stop offset="0.55" stopColor="#3d7f93" />
          <stop offset="1" stopColor="#8fc1c3" />
        </linearGradient>
        <pattern id="tp-tiles" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#e3a82b" />
          <rect x="9" width="3" height="12" fill="#c4861d" />
          <rect y="10" width="12" height="2" fill="#d59a24" />
        </pattern>
        <pattern id="tp-band" width="60" height="26" patternUnits="userSpaceOnUse">
          <rect width="60" height="26" fill="#22615c" />
          <rect y="0" width="60" height="3" fill="#ffd166" />
          <rect y="23" width="60" height="3" fill="#ffd166" />
          <ellipse cx="30" cy="13" rx="16" ry="6" fill="#2f4f9a" stroke="#ffd166" strokeWidth="1.5" />
          <circle cx="30" cy="13" r="2.5" fill="#ffd166" />
          <circle cx="4" cy="13" r="3" fill="#e9e4d0" />
        </pattern>
        <pattern id="tp-lattice" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#8d1b14" />
          <path d="M 0 7 L 14 7 M 7 0 L 7 14" stroke="#c98a1c" strokeWidth="1.2" />
        </pattern>
        <pattern id="tp-wall" width="80" height="20" patternUnits="userSpaceOnUse">
          <rect width="80" height="20" fill="#a3241b" />
          <rect y="19" width="80" height="1" fill="#8a1d15" />
        </pattern>
        <pattern id="tp-stone" width="120" height="40" patternUnits="userSpaceOnUse">
          <rect width="120" height="40" fill="#8e877b" />
          <path d="M 0 0 L 120 0 M 0 20 L 120 20 M 30 0 L 30 20 M 90 20 L 90 40" stroke="#6f695f" strokeWidth="2" />
        </pattern>
        <radialGradient id="tp-glow">
          <stop offset="0" stopColor="#ffd166" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffd166" stopOpacity="0" />
        </radialGradient>
      </defs>
      <style>{`
        .tp-lantern { animation: tp-sway 3.2s ease-in-out infinite; }
        .tp-glow { opacity: 0.25; transition: opacity 0.6s; }
        [data-temple="cleared"] .tp-glow, [data-temple="victory"] .tp-glow { opacity: 1; animation: tp-flicker 0.5s ease-in-out infinite alternate; }
        [data-temple="playing"] .tp-glow, [data-temple="intro"] .tp-glow { opacity: 0.45; }
        .tp-cloud { animation: tp-drift 60s linear infinite; }
        @keyframes tp-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @keyframes tp-flicker { from { opacity: 0.8; } to { opacity: 1; } }
        @keyframes tp-drift { from { transform: translateX(-120px); } to { transform: translateX(120px); } }
        @media (prefers-reduced-motion: reduce) { .tp-lantern, .tp-cloud, .tp-glow { animation: none !important; } }
      `}</style>
      <rect x={0} y={0} width={SCENE_W} height={G} fill="url(#tp-sky)" />
      <g className="tp-cloud" fill="#ffffff" opacity={0.22}>
        <ellipse cx={360} cy={210} rx={180} ry={26} />
        <ellipse cx={460} cy={190} rx={110} ry={20} />
        <ellipse cx={1180} cy={300} rx={220} ry={22} />
        <ellipse cx={1600} cy={160} rx={160} ry={18} />
      </g>
      {/* far pavilion, behind */}
      <Hall cx={1420} half={150} base={790} colTop={660} dim={0.75} upper={{ half: 110, top: 560, ridge: 470 }} />
      {/* main hall, two roofs */}
      <Hall cx={660} half={520} base={790} colTop={640} upper={{ half: 400, top: 520, ridge: 400 }} />
      {/* the plaque */}
      <rect x={636} y={540} width={48} height={50} fill="#1f4fa0" stroke="#ffd166" strokeWidth={4} />
      <path d="M 660 552 l 0 26 M 650 562 l 20 0" stroke="#ffd166" strokeWidth={3} />
      {/* right pavilion with a pyramid roof and a golden finial */}
      <g>
        <rect x={1600} y={672} width={260} height={118} fill="#7a1710" />
        {Array.from({ length: 5 }, (_, i) => <rect key={i} x={1602 + i * 64} y={672} width={12} height={118} fill="#b3261e" />)}
        <rect x={1600} y={648} width={260} height={24} fill="url(#tp-band)" />
        <path d={roof(1730, 596, 70, 170, 650, 30)} fill="url(#tp-tiles)" stroke="#9c6413" strokeWidth={2} />
        <rect x={1620} y={548} width={220} height={52} fill="#8d1b14" />
        <path d={`M 1560 556 Q 1590 552 1610 540 L 1730 452 L 1850 540 Q 1870 552 1900 556 L 1888 566 L 1572 566 Z`} fill="url(#tp-tiles)" stroke="#9c6413" strokeWidth={2} />
        <path d="M 1730 452 L 1730 414" stroke="#c98a1c" strokeWidth={4} />
        <circle cx={1730} cy={420} r={12} fill="#ffd166" stroke="#c98a1c" strokeWidth={2} />
        <rect x={1570} y={790} width={320} height={12} fill="#d9d4c7" />
      </g>
      {/* lanterns hanging from the eaves */}
      {[200, 430, 890, 1120, 1630, 1830].map((x, i) => <Lantern key={x} x={x} y={i < 4 ? 642 : 650} d={i * 0.7} />)}
      {/* white marble balustrade */}
      <rect x={0} y={810} width={SCENE_W} height={8} fill="#ece7da" />
      <rect x={0} y={836} width={SCENE_W} height={6} fill="#d9d4c7" />
      {Array.from({ length: 49 }, (_, i) => <rect key={i} x={i * 40} y={800} width={10} height={44} rx={2} fill="#f4f1e8" />)}
      {/* the red wall in front, with its grey tiled coping */}
      <rect x={0} y={844} width={SCENE_W} height={14} fill="#5d5a55" />
      <rect x={0} y={856} width={SCENE_W} height={4} fill="#3e3c39" />
      <rect x={0} y={860} width={SCENE_W} height={G - 860} fill="url(#tp-wall)" />
      {/* the courtyard's stone floor where she walks */}
      <rect x={0} y={G} width={SCENE_W} height={160} fill="url(#tp-stone)" />
      <rect x={0} y={G} width={SCENE_W} height={3} fill="#b8b1a3" />
    </svg>
  )
}
