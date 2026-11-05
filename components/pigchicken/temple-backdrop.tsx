// The temple scene's backdrop (Templo do Gongo), inspired by the halls of a Chinese palace: golden tiled roofs with
// upturned eaves, red columns, a painted beam band, white marble balustrades, a red wall in front, old trees and
// lanterns that sway, in the Pátio's dusk (the sky and the mountains behind are parallax.tsx's). Plain SVG in world units (one scene: 1920 x WORLD_GROUND_Y); the lanterns
// light up when a stage is cleared (data-temple on the world element, set by the Parquinho).
"use client"

import { memo } from "react"
import { SceneryRegion } from "./scenery-region"
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

// The roofs, eaves and the terrace she can stand on (scene units): one-way floors with the roofs' own curves. The main hall's
// two roofs and their eaves, and the right pavilion's pyramid and lower roof (the faded far pavilion is scenery).
export const TEMPLE_ROOF_LINES: { id: string; pts: Pt[] }[] = [
  { id: "roof-main-top", pts: roofTop(660, 400, 400 * 0.55, 400 + 70, 524, 30) },
  { id: "roof-main-top-eaves", pts: eaves(660, 470, 524, 30) },
  { id: "roof-main-low", pts: roofTop(660, 576, 510, 580, 642, 34) },
  { id: "roof-main-low-eaves", pts: eaves(660, 580, 642, 34) },
  { id: "roof-right-top", pts: [[1560, 556], ...quad([1560, 556], [1590, 552], [1610, 540], 3), [1730, 452], [1850, 540], ...quad([1850, 540], [1870, 552], [1900, 556], 3)] },
  { id: "roof-right-low", pts: roofTop(1730, 596, 70, 170, 650, 30) },
  // the terrace: the glazed coping on top of the red wall, under the balustrade, along the whole temple
  { id: "terrace", pts: [[0, 842], [SCENE_W, 842]] },
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

function Lantern({ x, y, d = 0, prefix }: { x: number; y: number; d?: number; prefix: string }) {
  return (
    <g className="tp-lantern" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${-d}s` }}>
      <line x1={x} y1={y} x2={x} y2={y + 26} stroke="#3a2a1b" strokeWidth={2} />
      <circle className="tp-glow" cx={x} cy={y + 50} r={46} fill={`url(#${prefix}glow)`} />
      <rect x={x - 12} y={y + 24} width={24} height={6} rx={2} fill="#ffd166" />
      <ellipse cx={x} cy={y + 50} rx={24} ry={22} fill={`url(#${prefix}lanternbody)`} />
      <path d={`M ${x - 12} ${y + 30} Q ${x - 22} ${y + 50} ${x - 12} ${y + 70} M ${x} ${y + 28} L ${x} ${y + 72} M ${x + 12} ${y + 30} Q ${x + 22} ${y + 50} ${x + 12} ${y + 70}`} stroke="#9d0208" strokeWidth={2} fill="none" />
      <rect x={x - 12} y={y + 70} width={24} height={6} rx={2} fill="#ffd166" />
      <path d={`M ${x - 4} ${y + 76} l 0 16 M ${x} ${y + 76} l 0 20 M ${x + 4} ${y + 76} l 0 16`} stroke="#ffb703" strokeWidth={2} />
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
          <ellipse cx={px} cy={py + 6} rx={r} ry={r * 0.32} fill="#1c3328" />
          <ellipse cx={px} cy={py} rx={r * 0.92} ry={r * 0.28} fill="#264434" />
          <ellipse cx={px - r * 0.2} cy={py - 4} rx={r * 0.55} ry={r * 0.14} fill="#33573f" />
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

// the temple sits in the Pátio's own scenery (parallax.tsx: sky, sun, clouds, mountains): it only draws itself.
// Everything is muted (less saturation, a little darker) except the roofs' walkable edges, drawn last in bright
// gold so the floors she can climb stand out; the far pavilion and the trees behind sit in the haze.

function TempleStaticDefs({ prefix }: { prefix: string }) {
  return (
      <defs>
        <filter id={`${prefix}-muted`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0.42" />
          <feComponentTransfer><feFuncR type="linear" slope="0.8" /><feFuncG type="linear" slope="0.8" /><feFuncB type="linear" slope="0.84" /></feComponentTransfer>
        </filter>
        {/* the haze: half the colour, half the dusk's mauve-blue */}
        <filter id={`${prefix}-haze`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.32 0.06 0.04 0 0.2  0.04 0.32 0.04 0 0.19  0.04 0.06 0.34 0 0.25  0 0 0 1 0" />
        </filter>
        <pattern id={`${prefix}-tiles`} width="14" height="12" patternUnits="userSpaceOnUse">
          <rect width="14" height="12" fill="#d9a43a" />
          <rect x="10" width="4" height="12" fill="#a8752a" />
          <rect y="10" width="14" height="2" fill="#bf8c33" />
        </pattern>
        <linearGradient id={`${prefix}-roofshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#2a1400" stopOpacity="0.4" />
        </linearGradient>
        <pattern id={`${prefix}-band`} width="60" height="26" patternUnits="userSpaceOnUse">
          <rect width="60" height="26" fill="#2b5d5a" />
          <rect y="0" width="60" height="2" fill="#c9a24e" />
          <rect y="24" width="60" height="2" fill="#c9a24e" />
          <ellipse cx="30" cy="13" rx="14" ry="5" fill="#33607f" stroke="#c9a24e" strokeWidth="1" />
        </pattern>
        <pattern id={`${prefix}-lattice`} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#6a1d16" />
          <path d="M 0 7 L 14 7 M 7 0 L 7 14" stroke="#a87a34" strokeWidth="1.2" />
        </pattern>
        <radialGradient id={`${prefix}-warm`} cx="0.5" cy="0.6" r="0.7">
          <stop offset="0" stopColor="#ffcf73" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ff9f43" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${prefix}-column`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a2018" />
          <stop offset="0.4" stopColor="#b2382b" />
          <stop offset="1" stopColor="#6a1a13" />
        </linearGradient>
        <linearGradient id={`${prefix}-undershade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0402" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1a0402" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${prefix}-redwall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a2a20" />
          <stop offset="1" stopColor="#6e1f17" />
        </linearGradient>
        <pattern id={`${prefix}-wall`} width="80" height="20" patternUnits="userSpaceOnUse">
          <rect width="80" height="20" fill="#93302a" />
          <rect y="19" width="80" height="1" fill="#7a2620" />
        </pattern>
        <linearGradient id={`${prefix}-wallshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0603" stopOpacity="0.45" />
          <stop offset="0.3" stopColor="#1a0603" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0603" stopOpacity="0.25" />
        </linearGradient>
        <pattern id={`${prefix}-coping`} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#b88a3a" />
          <rect x="12" width="4" height="16" fill="#8f6626" />
        </pattern>
        <pattern id={`${prefix}-stone`} width="120" height="40" patternUnits="userSpaceOnUse">
          <rect width="120" height="40" fill="#6f6a66" />
          <rect x="0" y="0" width="60" height="20" fill="#75706b" />
          <path d="M 0 0 L 120 0 M 0 20 L 120 20 M 30 0 L 30 20 M 90 20 L 90 40" stroke="#57534f" strokeWidth="2" />
        </pattern>
        <radialGradient id={`${prefix}-glow`}>
          <stop offset="0" stopColor="#ffd166" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ffd166" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${prefix}-lanternbody`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#e0675a" />
          <stop offset="0.6" stopColor="#c23a35" />
          <stop offset="1" stopColor="#8a1d1b" />
        </radialGradient>
      </defs>
  )
}

type OverlayProps = { left: number; id: string; box: { x: number; y: number; w: number; h: number }; haze?: boolean; children: React.ReactNode }
function TempleOverlay({ left, id, box, haze, children }: OverlayProps) {
  const prefix = `tp-${id}-`
  return (
    <SceneryRegion bounds={{ ...box, x: box.x + left }} className="absolute" style={{ left: left + box.x, top: box.y, width: box.w, height: box.h, transform: "translate3d(0,0,0)" }}>
      <svg aria-hidden="true" width={box.w} height={box.h} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>
        <defs>
          <filter id={`${prefix}tint`} colorInterpolationFilters="sRGB">
            {haze ? <feColorMatrix type="matrix" values="0.32 0.06 0.04 0 0.2  0.04 0.32 0.04 0 0.19  0.04 0.06 0.34 0 0.25  0 0 0 1 0" /> : <>
              <feColorMatrix type="saturate" values="0.42" />
              <feComponentTransfer><feFuncR type="linear" slope="0.8" /><feFuncG type="linear" slope="0.8" /><feFuncB type="linear" slope="0.84" /></feComponentTransfer>
            </>}
          </filter>
          <radialGradient id={`${prefix}glow`}><stop offset="0" stopColor="#ffd166" stopOpacity="0.6" /><stop offset="1" stopColor="#ffd166" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${prefix}lanternbody`} cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#e0675a" /><stop offset="0.6" stopColor="#c23a35" /><stop offset="1" stopColor="#8a1d1b" /></radialGradient>
        </defs>
        <g filter={`url(#${prefix}tint)`}>{children}</g>
      </svg>
    </SceneryRegion>
  )
}

// Static architecture and each animated ornament own separate paint surfaces.
// Their order matches the original SVG: far trees, halls, front trees/lanterns, wall and roof edges.
export const TempleBackdrop = memo(function TempleBackdrop({ left }: { left: number }) {
  return <>
    <TempleOverlay left={left} id="far-pine" haze box={{ x: 1080, y: 380, w: 320, h: 450 }}><Pine x={1230} base={800} h={0.95} /></TempleOverlay>
    <TempleOverlay left={left} id="far-blossom" haze box={{ x: 1380, y: 450, w: 370, h: 440 }}><Blossom x={1560} base={800} h={0.9} /></TempleOverlay>
    <SceneryRegion bounds={{ x: left - 64, y: 350, w: SCENE_W + 128, h: G + 160 - 350 }}>
      <svg data-temple-static="halls" aria-hidden="true" className="absolute top-0" style={{ left, width: SCENE_W, height: G + 160, overflow: "visible" }} viewBox={`0 0 ${SCENE_W} ${G + 160}`}>
      <TempleStaticDefs prefix="tp" />
      <style>{`
        .tp-lantern { animation: tp-sway 3.2s ease-in-out infinite; }
        .tp-glow { opacity: 0.25; transition: opacity 0.6s; }
        .tp-window { opacity: 0.3; transition: opacity 0.8s; }
        [data-temple="cleared"] .tp-glow, [data-temple="victory"] .tp-glow { opacity: 1; animation: tp-flicker 0.5s ease-in-out infinite alternate; }
        [data-temple="cleared"] .tp-window, [data-temple="victory"] .tp-window { opacity: 0.9; }
        [data-temple="playing"] .tp-glow, [data-temple="intro"] .tp-glow { opacity: 0.4; }
        [data-temple="playing"] .tp-window, [data-temple="intro"] .tp-window { opacity: 0.5; }
        .tp-tree { transform-box: fill-box; transform-origin: 50% 100%; animation: tp-breeze 7s ease-in-out infinite; }
        .tp-petal { animation: tp-fall 9s linear infinite; }
        @keyframes tp-sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes tp-flicker { from { opacity: 0.8; } to { opacity: 1; } }
        @keyframes tp-breeze { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(-1deg); } }
        @keyframes tp-fall { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 0.8; } 100% { transform: translate(-90px, 170px) rotate(240deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .tp-lantern, .tp-glow, .tp-tree, .tp-petal { animation: none !important; } }
      `}</style>
      {/* in the haze, behind: two trees and the far pavilion (scenery, not climbable) */}
      <g filter="url(#tp-haze)">
        <Hall cx={1420} half={150} base={790} colTop={660} upper={{ half: 110, top: 560, ridge: 470 }} />
      </g>
      <g filter="url(#tp-muted)">
        {/* main hall, two roofs */}
        <Hall cx={660} half={520} base={790} colTop={640} upper={{ half: 400, top: 520, ridge: 400 }} />
        {/* the plaque */}
        <rect x={624} y={536} width={72} height={58} rx={3} fill="#1f4fa0" stroke="#ffd166" strokeWidth={5} />
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
          <rect x={1570} y={790} width={320} height={12} fill="#ece7da" />
        </g>
      </g>
      </svg>
    </SceneryRegion>
    <TempleOverlay left={left} id="front-pine" box={{ x: -55, y: 390, w: 340, h: 480 }}><Pine x={110} base={830} h={0.95} /></TempleOverlay>
    <TempleOverlay left={left} id="front-blossom" box={{ x: 1730, y: 500, w: 350, h: 390 }}><Blossom x={1890} base={830} h={0.8} /></TempleOverlay>
    {[200, 430, 890, 1120, 1630, 1830].map((x, i) => {
      const y = i < 4 ? 642 : 650, id = `lantern-${i}`
      return <TempleOverlay key={id} left={left} id={id} box={{ x: x - 65, y: y - 8, w: 130, h: 160 }}><Lantern x={x} y={y} d={i * 0.7} prefix={`tp-${id}-`} /></TempleOverlay>
    })}
    <SceneryRegion bounds={{ x: left - 64, y: 350, w: SCENE_W + 128, h: G + 160 - 350 }}>
      <svg data-temple-static="wall" aria-hidden="true" className="absolute top-0" style={{ left, width: SCENE_W, height: G + 160, overflow: "visible" }} viewBox={`0 0 ${SCENE_W} ${G + 160}`}>
      <TempleStaticDefs prefix="tpf" />
      <g filter="url(#tpf-muted)">
        {/* white marble balustrade */}
        <rect x={0} y={810} width={SCENE_W} height={8} fill="#d8d3c8" />
        <rect x={0} y={836} width={SCENE_W} height={6} fill="#bfb9ad" />
        {Array.from({ length: 49 }, (_, i) => <rect key={i} x={i * 40} y={800} width={10} height={44} rx={2} fill="#dcd7cb" />)}
        {/* the red wall in front, with its glazed coping */}
        <rect x={0} y={842} width={SCENE_W} height={16} fill="url(#tpf-coping)" />
        <rect x={0} y={856} width={SCENE_W} height={4} fill="#5a3a10" />
        <rect x={0} y={860} width={SCENE_W} height={G - 860} fill="url(#tpf-wall)" />
        <rect x={0} y={860} width={SCENE_W} height={G - 860} fill="url(#tpf-wallshade)" />
        {/* the courtyard's stone floor where she walks */}
        <rect x={0} y={G} width={SCENE_W} height={160} fill="url(#tpf-stone)" />
        <rect x={0} y={G} width={SCENE_W} height={3} fill="#9a938a" />
      </g>
      {/* the floors she can climb: the roofs' top edges and the eaves, bright on a dark rim */}
      {TEMPLE_ROOF_LINES.map(l => (
        <g key={l.id}>
          <polyline points={lineAttr(l.pts)} fill="none" stroke="#1a0c03" strokeOpacity={0.75} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={lineAttr(l.pts)} fill="none" stroke="#f2cf72" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
      </svg>
    </SceneryRegion>
  </>
})
