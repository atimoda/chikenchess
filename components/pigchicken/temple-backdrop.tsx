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

// one hall: a stone base, columns with lattice windows lit from inside, the painted dougong band and its roof
// (two roofs when tall). The roofs are glazed gold tiles with a shade over them, green ridges and dragon finials.
function Roof({ d, ridge }: { d: string; ridge?: { x: number; y: number; w: number } }) {
  return (
    <g>
      <path d={d} fill="url(#tp-tiles)" />
      <path d={d} fill="url(#tp-roofshade)" stroke="#8a520c" strokeWidth={2} />
      {ridge && (
        <>
          <rect x={ridge.x - 6} y={ridge.y - 14} width={ridge.w + 12} height={16} rx={4} fill="#2e7d5b" stroke="#1c4f3a" strokeWidth={2} />
          <rect x={ridge.x - 6} y={ridge.y - 14} width={ridge.w + 12} height={4} rx={2} fill="#5fbf8f" />
          {/* the dragon-fish finials at the ridge's ends */}
          <path d={`M ${ridge.x - 8} ${ridge.y - 12} q -10 -26 8 -36 q 2 14 12 12 q -6 10 -2 24 z M ${ridge.x + ridge.w + 8} ${ridge.y - 12} q 10 -26 -8 -36 q -2 14 -12 12 q 6 10 2 24 z`} fill="#2e7d5b" stroke="#ffd166" strokeWidth={1.5} />
          <circle cx={ridge.x + ridge.w / 2} cy={ridge.y - 18} r={7} fill="#ffd166" stroke="#c98a1c" strokeWidth={2} />
        </>
      )}
    </g>
  )
}

function Hall({ cx, half, base, colTop, upper, dim = 1 }: { cx: number; half: number; base: number; colTop: number; upper?: { half: number; top: number; ridge: number }; dim?: number }) {
  const cols = Math.max(4, Math.round((half * 2) / 82))
  const step = (half * 2) / cols
  return (
    <g opacity={dim}>
      {upper && (
        <>
          <rect x={cx - upper.half} y={upper.top} width={upper.half * 2} height={colTop - 64 - upper.top} fill="url(#tp-redwall)" />
          {colTop - 92 - upper.top > 30 && Array.from({ length: Math.round(upper.half / 40) }, (_, i) => {
            const n = Math.round(upper.half / 40), w = (upper.half * 2 - 40) / n
            return <rect key={`u${i}`} x={cx - upper.half + 20 + i * w + 7} y={upper.top + 16} width={w - 14} height={colTop - 92 - upper.top - 24} fill="url(#tp-lattice)" stroke="#5c120d" strokeWidth={1.5} />
          })}
          <rect x={cx - upper.half} y={colTop - 92} width={upper.half * 2} height={28} fill="url(#tp-band)" />
          <Roof d={roof(cx, upper.ridge, upper.half * 0.55, upper.half + 70, upper.top + 4, 30)} ridge={{ x: cx - upper.half * 0.55, y: upper.ridge, w: upper.half * 1.1 }} />
          {/* the eaves' shadow on the wall */}
          <rect x={cx - upper.half} y={upper.top + 4} width={upper.half * 2} height={10} fill="rgba(40,8,4,0.35)" />
        </>
      )}
      {/* lower roof over the columns */}
      <Roof d={roof(cx, colTop - 64, half - 10, half + 60, colTop + 2, 34)} />
      <rect x={cx - half} y={colTop} width={half * 2} height={26} fill="url(#tp-band)" />
      <rect x={cx - half} y={colTop + 26} width={half * 2} height={base - colTop - 26} fill="#6e140e" />
      {Array.from({ length: cols }, (_, i) => (
        <g key={i}>
          <rect x={cx - half + i * step + 14} y={colTop + 34} width={step - 28} height={base - colTop - 44} fill="url(#tp-lattice)" stroke="#5c120d" strokeWidth={2} />
          <rect className="tp-window" x={cx - half + i * step + 14} y={colTop + 34} width={step - 28} height={base - colTop - 44} fill="url(#tp-warm)" />
          {/* the hanging gold bracket under the beam */}
          <path d={`M ${cx - half + i * step + 14} ${colTop + 34} l 16 0 l -16 14 z M ${cx - half + (i + 1) * step - 14} ${colTop + 34} l -16 0 l 16 14 z`} fill="#e0a526" />
        </g>
      ))}
      {Array.from({ length: cols + 1 }, (_, i) => (
        <g key={`c${i}`}>
          <rect x={cx - half + i * step - 8} y={colTop + 26} width={16} height={base - colTop - 26} fill="url(#tp-column)" />
          <rect x={cx - half + i * step - 10} y={colTop + 26} width={20} height={6} fill="#ffd166" />
          <rect x={cx - half + i * step - 11} y={base - 8} width={22} height={8} rx={2} fill="#e9e4d0" />
        </g>
      ))}
      {/* the shade under the eaves */}
      <rect x={cx - half} y={colTop + 26} width={half * 2} height={18} fill="url(#tp-undershade)" />
      {/* a white marble terrace with its steps */}
      <rect x={cx - half - 30} y={base} width={half * 2 + 60} height={12} fill="#ece7da" />
      <rect x={cx - half - 30} y={base + 10} width={half * 2 + 60} height={3} fill="#bdb6a6" />
    </g>
  )
}

function Lantern({ x, y, d = 0 }: { x: number; y: number; d?: number }) {
  return (
    <g className="tp-lantern" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${-d}s` }}>
      <line x1={x} y1={y} x2={x} y2={y + 26} stroke="#3a2a1b" strokeWidth={2} />
      <circle className="tp-glow" cx={x} cy={y + 50} r={46} fill="url(#tp-glow)" />
      <rect x={x - 12} y={y + 24} width={24} height={6} rx={2} fill="#ffd166" />
      <ellipse cx={x} cy={y + 50} rx={24} ry={22} fill="url(#tp-lanternbody)" />
      <path d={`M ${x - 12} ${y + 30} Q ${x - 22} ${y + 50} ${x - 12} ${y + 70} M ${x} ${y + 28} L ${x} ${y + 72} M ${x + 12} ${y + 30} Q ${x + 22} ${y + 50} ${x + 12} ${y + 70}`} stroke="#9d0208" strokeWidth={2} fill="none" />
      <rect x={x - 12} y={y + 70} width={24} height={6} rx={2} fill="#ffd166" />
      <path d={`M ${x - 4} ${y + 76} l 0 16 M ${x} ${y + 76} l 0 20 M ${x + 4} ${y + 76} l 0 16`} stroke="#ffb703" strokeWidth={2} />
    </g>
  )
}

// an auspicious cloud (xiangyun): soft puffs with a curl, lit warm from below
function Cloud({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <ellipse cx={0} cy={8} rx={150} ry={20} fill="#f6c9a8" opacity={0.55} />
      <ellipse cx={-60} cy={-6} rx={70} ry={30} fill="#fff7ec" />
      <ellipse cx={20} cy={-20} rx={80} ry={40} fill="#fff7ec" />
      <ellipse cx={95} cy={-2} rx={60} ry={26} fill="#fff7ec" />
      <ellipse cx={10} cy={6} rx={140} ry={16} fill="#ffe9d6" />
      <path d="M -28 -10 a 18 18 0 1 1 22 16 a 10 10 0 1 1 -10 -12" fill="none" stroke="#f2b48c" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <path d="M 70 -6 a 14 14 0 1 0 -18 12 a 8 8 0 1 0 8 -9" fill="none" stroke="#f2b48c" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
    </g>
  )
}

// a pine like the old ones in temple courtyards: a crooked trunk and flat layered canopies
function Pine({ x, base, h = 1, flip = false }: { x: number; base: number; h?: number; flip?: boolean }) {
  const f = flip ? -1 : 1
  const pads: [number, number, number][] = [[-70, -150, 70], [60, -210, 80], [-40, -280, 66], [40, -340, 56], [0, -395, 44]]
  return (
    <g transform={`translate(${x} ${base}) scale(${f * h} ${h})`}><g className="tp-tree">
      <path d="M -10 0 C -14 -80 22 -120 4 -190 C -8 -240 24 -300 6 -400 L 16 -400 C 34 -300 6 -240 18 -190 C 36 -120 6 -80 12 0 Z" fill="#5a3a24" />
      <path d="M 6 -150 C -20 -150 -40 -146 -60 -150 M 10 -210 C 30 -212 46 -208 62 -210 M 6 -280 C -10 -282 -24 -278 -36 -280" stroke="#5a3a24" strokeWidth={8} strokeLinecap="round" fill="none" />
      {pads.map(([px, py, r], i) => (
        <g key={i}>
          <ellipse cx={px} cy={py + 6} rx={r} ry={r * 0.32} fill="#1f4a32" />
          <ellipse cx={px} cy={py} rx={r * 0.92} ry={r * 0.28} fill="#2f6b45" />
          <ellipse cx={px - r * 0.2} cy={py - 4} rx={r * 0.55} ry={r * 0.14} fill="#4c8d5c" />
        </g>
      ))}
    </g></g>
  )
}

// a plum blossom tree: a dark twisted trunk and pink clouds of flowers (a few petals fall slowly)
function Blossom({ x, base, h = 1 }: { x: number; base: number; h?: number }) {
  const puffs: [number, number, number][] = [[-60, -200, 54], [10, -240, 64], [70, -196, 50], [-20, -290, 50], [50, -280, 44], [-80, -150, 36], [90, -150, 34]]
  return (
    <g transform={`translate(${x} ${base}) scale(${h})`}><g className="tp-tree">
      <path d="M -8 0 C -10 -60 -30 -100 -60 -150 M 0 0 C 4 -80 30 -120 10 -240 M 6 -100 C 30 -130 60 -150 80 -190 M 8 -180 C -10 -220 -20 -250 -20 -290" stroke="#3b2418" strokeWidth={10} strokeLinecap="round" fill="none" />
      {puffs.map(([px, py, r], i) => (
        <g key={i}>
          <circle cx={px} cy={py + 4} r={r} fill="#e88aa8" />
          <circle cx={px - r * 0.15} cy={py - r * 0.1} r={r * 0.8} fill="#f6aec4" />
          <circle cx={px - r * 0.3} cy={py - r * 0.3} r={r * 0.35} fill="#ffd4e1" />
        </g>
      ))}
      {Array.from({ length: 6 }, (_, i) => <circle key={`p${i}`} className="tp-petal" style={{ animationDelay: `${-i * 1.3}s` }} cx={-70 + i * 28} cy={-160} r={4} fill="#f6aec4" />)}
    </g></g>
  )
}

// far karst mountains in the haze
const MOUNTAINS = "M 0 700 L 0 560 C 60 540 90 470 140 470 C 190 470 200 560 260 560 C 300 560 320 430 380 420 C 440 410 450 540 520 540 C 580 540 600 480 660 480 C 720 480 740 560 820 560 C 880 560 900 440 960 430 C 1020 420 1040 520 1100 520 C 1160 520 1180 400 1250 390 C 1320 380 1330 520 1400 520 C 1460 520 1480 460 1540 460 C 1600 460 1620 540 1690 540 C 1750 540 1770 420 1830 420 C 1880 420 1900 500 1920 500 L 1920 700 Z"
const MOUNTAINS_NEAR = "M 0 760 L 0 640 C 80 640 110 560 180 560 C 250 560 270 640 350 640 C 420 640 440 590 500 590 C 560 590 600 660 680 660 C 760 660 780 600 860 600 C 940 600 960 650 1040 650 C 1120 650 1150 570 1230 570 C 1310 570 1330 640 1410 640 C 1490 640 1510 600 1590 600 C 1670 600 1700 650 1780 650 C 1850 650 1880 610 1920 610 L 1920 760 Z"

export function TempleBackdrop({ left }: { left: number }) {
  return (
    <svg aria-hidden="true" className="absolute top-0" style={{ left, width: SCENE_W, height: G + 160, overflow: "visible" }} viewBox={`0 0 ${SCENE_W} ${G + 160}`}>
      <defs>
        <linearGradient id="tp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2b5a" />
          <stop offset="0.35" stopColor="#3a5f8f" />
          <stop offset="0.62" stopColor="#8db3c4" />
          <stop offset="0.8" stopColor="#f2c8a0" />
          <stop offset="1" stopColor="#f7a77a" />
        </linearGradient>
        <radialGradient id="tp-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.35" stopColor="#ffd59a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffb07a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tp-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7d9c0" stopOpacity="0" />
          <stop offset="1" stopColor="#f7d9c0" stopOpacity="0.85" />
        </linearGradient>
        <pattern id="tp-tiles" width="14" height="12" patternUnits="userSpaceOnUse">
          <rect width="14" height="12" fill="#eab532" />
          <rect x="10" width="4" height="12" fill="#b9791a" />
          <rect x="2" width="2" height="12" fill="#ffd970" />
          <rect y="10" width="14" height="2" fill="#cf9426" />
        </pattern>
        <linearGradient id="tp-roofshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#5a2a00" stopOpacity="0.35" />
        </linearGradient>
        <pattern id="tp-band" width="60" height="26" patternUnits="userSpaceOnUse">
          <rect width="60" height="26" fill="#1f6b62" />
          <rect y="0" width="60" height="3" fill="#ffd166" />
          <rect y="23" width="60" height="3" fill="#ffd166" />
          <path d="M 0 13 L 8 5 L 52 5 L 60 13 L 52 21 L 8 21 Z" fill="#2c5aa8" stroke="#ffd166" strokeWidth="1" />
          <ellipse cx="30" cy="13" rx="14" ry="5.5" fill="#3fa7a0" stroke="#ffd166" strokeWidth="1.2" />
          <circle cx="30" cy="13" r="2.5" fill="#e63946" />
          <circle cx="4" cy="13" r="2.5" fill="#f4f1e8" />
          <circle cx="56" cy="13" r="2.5" fill="#f4f1e8" />
        </pattern>
        <pattern id="tp-lattice" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#7d1610" />
          <path d="M 0 7 L 14 7 M 7 0 L 7 14" stroke="#d99a2b" strokeWidth="1.4" />
          <path d="M 0 0 L 3.5 3.5 M 14 0 L 10.5 3.5 M 0 14 L 3.5 10.5 M 14 14 L 10.5 10.5" stroke="#b07a1e" strokeWidth="0.8" />
        </pattern>
        <radialGradient id="tp-warm" cx="0.5" cy="0.6" r="0.7">
          <stop offset="0" stopColor="#ffcf73" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9f43" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tp-column" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8e1a12" />
          <stop offset="0.35" stopColor="#e0402f" />
          <stop offset="0.55" stopColor="#c62f24" />
          <stop offset="1" stopColor="#7a1710" />
        </linearGradient>
        <linearGradient id="tp-undershade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0402" stopOpacity="0.5" />
          <stop offset="1" stopColor="#1a0402" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tp-redwall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a2117" />
          <stop offset="1" stopColor="#7a1710" />
        </linearGradient>
        <pattern id="tp-wall" width="80" height="20" patternUnits="userSpaceOnUse">
          <rect width="80" height="20" fill="#b02a1f" />
          <rect y="19" width="80" height="1" fill="#8a1d15" />
          <rect x="40" y="9" width="1" height="10" fill="#951f16" opacity="0.6" />
        </pattern>
        <linearGradient id="tp-wallshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a0603" stopOpacity="0.45" />
          <stop offset="0.3" stopColor="#2a0603" stopOpacity="0" />
          <stop offset="1" stopColor="#2a0603" stopOpacity="0.2" />
        </linearGradient>
        <pattern id="tp-coping" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#e6ac2c" />
          <rect x="12" width="4" height="16" fill="#b67719" />
          <rect x="2" width="2" height="16" fill="#ffd970" />
        </pattern>
        <pattern id="tp-stone" width="120" height="40" patternUnits="userSpaceOnUse">
          <rect width="120" height="40" fill="#a39684" />
          <rect x="0" y="0" width="60" height="20" fill="#ab9e8b" />
          <rect x="60" y="20" width="60" height="20" fill="#9b8f7d" />
          <path d="M 0 0 L 120 0 M 0 20 L 120 20 M 30 0 L 30 20 M 90 20 L 90 40" stroke="#7d725f" strokeWidth="2" />
        </pattern>
        <radialGradient id="tp-glow">
          <stop offset="0" stopColor="#ffd166" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffd166" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tp-lanternbody" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ff7b6b" />
          <stop offset="0.6" stopColor="#e63946" />
          <stop offset="1" stopColor="#a4161a" />
        </radialGradient>
      </defs>
      <style>{`
        .tp-lantern { animation: tp-sway 3.2s ease-in-out infinite; }
        .tp-glow { opacity: 0.25; transition: opacity 0.6s; }
        .tp-window { opacity: 0.35; transition: opacity 0.8s; }
        [data-temple="cleared"] .tp-glow, [data-temple="victory"] .tp-glow { opacity: 1; animation: tp-flicker 0.5s ease-in-out infinite alternate; }
        [data-temple="cleared"] .tp-window, [data-temple="victory"] .tp-window { opacity: 1; }
        [data-temple="playing"] .tp-glow, [data-temple="intro"] .tp-glow { opacity: 0.45; }
        [data-temple="playing"] .tp-window, [data-temple="intro"] .tp-window { opacity: 0.6; }
        .tp-cloud-a { animation: tp-drift 70s ease-in-out infinite alternate; }
        .tp-cloud-b { animation: tp-drift 110s ease-in-out infinite alternate-reverse; }
        .tp-cloud-c { animation: tp-drift 150s ease-in-out infinite alternate; }
        .tp-tree { transform-box: fill-box; transform-origin: 50% 100%; animation: tp-breeze 6s ease-in-out infinite; }
        .tp-petal { animation: tp-fall 8s linear infinite; }
        .tp-crane { animation: tp-fly 40s linear infinite; }
        .tp-wing { transform-box: fill-box; transform-origin: 50% 100%; animation: tp-flap 0.9s ease-in-out infinite alternate; }
        @keyframes tp-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @keyframes tp-flicker { from { opacity: 0.8; } to { opacity: 1; } }
        @keyframes tp-drift { from { transform: translateX(-160px); } to { transform: translateX(160px); } }
        @keyframes tp-breeze { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(-1.2deg); } }
        @keyframes tp-fall { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(-90px, 170px) rotate(240deg); opacity: 0; } }
        @keyframes tp-fly { from { transform: translateX(-300px); } to { transform: translateX(2300px); } }
        @keyframes tp-flap { from { transform: scaleY(1); } to { transform: scaleY(-0.6); } }
        @media (prefers-reduced-motion: reduce) { .tp-lantern, .tp-cloud-a, .tp-cloud-b, .tp-cloud-c, .tp-glow, .tp-tree, .tp-petal, .tp-crane, .tp-wing { animation: none !important; } }
      `}</style>
      {/* the sky at golden hour, the sun low behind the hall, far mountains in the haze */}
      <rect x={0} y={0} width={SCENE_W} height={G} fill="url(#tp-sky)" />
      <circle cx={1180} cy={520} r={240} fill="url(#tp-sun)" />
      <circle cx={1180} cy={520} r={56} fill="#fff1d0" opacity={0.9} />
      <g className="tp-cloud-c"><Cloud x={300} y={150} s={0.7} o={0.55} /><Cloud x={1500} y={110} s={0.6} o={0.5} /></g>
      <path d={MOUNTAINS} fill="#8a8fb0" opacity={0.55} />
      <path d={MOUNTAINS_NEAR} fill="#6f7f8f" opacity={0.6} />
      <rect x={0} y={480} width={SCENE_W} height={300} fill="url(#tp-haze)" />
      <g className="tp-cloud-b"><Cloud x={900} y={250} s={1} o={0.9} /><Cloud x={160} y={330} s={0.8} o={0.8} /></g>
      {/* cranes crossing the sky */}
      <g className="tp-crane" opacity={0.75}>
        {[[0, 230], [60, 250], [110, 222]].map(([dx, y], i) => (
          <g key={i} transform={`translate(${dx} ${y})`}>
            <path className="tp-wing" style={{ animationDelay: `${-i * 0.3}s` }} d="M -16 0 Q -6 -10 0 0 Q 6 -10 16 0" stroke="#2b2b3a" strokeWidth={2.5} fill="none" />
          </g>
        ))}
      </g>
      {/* trees behind the halls */}
      <Pine x={1230} base={800} h={0.95} />
      <Blossom x={1560} base={800} h={0.9} />
      {/* far pavilion, behind */}
      <Hall cx={1420} half={150} base={790} colTop={660} dim={0.85} upper={{ half: 110, top: 560, ridge: 470 }} />
      {/* main hall, two roofs */}
      <Hall cx={660} half={520} base={790} colTop={640} upper={{ half: 400, top: 520, ridge: 400 }} />
      {/* the plaque */}
      <rect x={624} y={536} width={72} height={58} rx={3} fill="#1f4fa0" stroke="#ffd166" strokeWidth={5} />
      <rect x={630} y={542} width={60} height={46} fill="none" stroke="#e0a526" strokeWidth={1.5} />
      <path d="M 660 550 l 0 30 M 646 560 l 28 0 M 648 574 l 24 0" stroke="#ffd166" strokeWidth={3} />
      {/* right pavilion with a pyramid roof and a golden finial */}
      <g>
        <rect x={1600} y={672} width={260} height={118} fill="#6e140e" />
        <rect className="tp-window" x={1614} y={680} width={232} height={104} fill="url(#tp-warm)" />
        {Array.from({ length: 5 }, (_, i) => <rect key={i} x={1602 + i * 64} y={672} width={14} height={118} fill="url(#tp-column)" />)}
        <rect x={1600} y={648} width={260} height={24} fill="url(#tp-band)" />
        <Roof d={roof(1730, 596, 70, 170, 650, 30)} />
        <rect x={1620} y={548} width={220} height={52} fill="url(#tp-redwall)" />
        <rect x={1640} y={556} width={180} height={36} fill="url(#tp-lattice)" />
        <Roof d={`M 1560 556 Q 1590 552 1610 540 L 1730 452 L 1850 540 Q 1870 552 1900 556 L 1888 566 L 1572 566 Z`} />
        <path d="M 1730 452 L 1730 414" stroke="#c98a1c" strokeWidth={4} />
        <circle cx={1730} cy={420} r={12} fill="#ffd166" stroke="#c98a1c" strokeWidth={2} />
        <circle cx={1730} cy={402} r={6} fill="#2e7d5b" stroke="#ffd166" strokeWidth={1.5} />
        <rect x={1570} y={790} width={320} height={12} fill="#ece7da" />
      </g>
      {/* trees in front of the halls, by the wall */}
      <Pine x={40} base={830} h={1.05} />
      <Blossom x={1890} base={830} h={0.8} />
      {/* lanterns hanging from the eaves */}
      {[200, 430, 890, 1120, 1630, 1830].map((x, i) => <Lantern key={x} x={x} y={i < 4 ? 642 : 650} d={i * 0.7} />)}
      <g className="tp-cloud-a"><Cloud x={620} y={90} s={0.9} o={0.85} /></g>
      {/* white marble balustrade */}
      <rect x={0} y={810} width={SCENE_W} height={8} fill="#f1ece0" />
      <rect x={0} y={818} width={SCENE_W} height={2} fill="#c9c2b2" />
      <rect x={0} y={836} width={SCENE_W} height={6} fill="#d9d4c7" />
      {Array.from({ length: 49 }, (_, i) => (
        <g key={i}>
          <rect x={i * 40} y={800} width={10} height={44} rx={2} fill="#f8f5ec" />
          <circle cx={i * 40 + 5} cy={798} r={6} fill="#f8f5ec" />
          <rect x={i * 40 + 7} y={802} width={3} height={40} fill="#d6d0c2" />
        </g>
      ))}
      {/* the red wall in front, with its golden glazed coping */}
      <rect x={0} y={842} width={SCENE_W} height={16} fill="url(#tp-coping)" />
      <rect x={0} y={842} width={SCENE_W} height={3} fill="#ffe08a" />
      <rect x={0} y={856} width={SCENE_W} height={4} fill="#7a4a10" />
      <rect x={0} y={860} width={SCENE_W} height={G - 860} fill="url(#tp-wall)" />
      <rect x={0} y={860} width={SCENE_W} height={G - 860} fill="url(#tp-wallshade)" />
      {/* the courtyard's stone floor where she walks */}
      <rect x={0} y={G} width={SCENE_W} height={160} fill="url(#tp-stone)" />
      <rect x={0} y={G} width={SCENE_W} height={4} fill="#d8cdb8" />
    </svg>
  )
}
