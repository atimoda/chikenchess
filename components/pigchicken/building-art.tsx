// The Prédio and the Mureta com cerca drawn in their boxes (lib/pigchicken/buildings.ts): the Templo do Gongo's halls,
// inspired by a Chinese palace (golden tiled roofs with upturned eaves, red columns, a painted beam band, lattice
// doors lit from inside, lanterns that sway) and its white marble balustrade over a red wall. Muted (less saturation,
// a little darker) so it does not compete with the game, except the roofs' walkable edges, drawn last in bright gold;
// a Prédio in the haze is faded into the dusk and has nothing to climb. The lanterns and the windows light up when a
// stage of the temple is cleared (data-temple on the world element, set by the Parquinho).
"use client"

import { memo, useId, useMemo } from "react"
import { BALUSTRADE_FLOOR, buildingGeometry, pyramidPath, roofPath, type BalustradeParams, type BuildingParams, type Pt } from "@/lib/pigchicken/buildings"

const lineAttr = (pts: Pt[]) => pts.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(" ")
const MUTED = <><feColorMatrix type="saturate" values="0.42" /><feComponentTransfer><feFuncR type="linear" slope="0.8" /><feFuncG type="linear" slope="0.8" /><feFuncB type="linear" slope="0.84" /></feComponentTransfer></>
// the haze: half the colour, half the dusk's mauve-blue
const HAZE = <feColorMatrix type="matrix" values="0.32 0.06 0.04 0 0.2  0.04 0.32 0.04 0 0.19  0.04 0.06 0.34 0 0.25  0 0 0 1 0" />

function Defs({ id, haze }: { id: string; haze: boolean }) {
  return (
    <defs>
      <filter id={`${id}tint`} colorInterpolationFilters="sRGB">{haze ? HAZE : MUTED}</filter>
      <pattern id={`${id}tiles`} width="14" height="12" patternUnits="userSpaceOnUse">
        <rect width="14" height="12" fill="#d9a43a" /><rect x="10" width="4" height="12" fill="#a8752a" /><rect y="10" width="14" height="2" fill="#bf8c33" />
      </pattern>
      <linearGradient id={`${id}roofshade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" /><stop offset="0.6" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor="#2a1400" stopOpacity="0.4" />
      </linearGradient>
      <pattern id={`${id}band`} width="60" height="26" patternUnits="userSpaceOnUse">
        <rect width="60" height="26" fill="#2b5d5a" /><rect y="0" width="60" height="2" fill="#c9a24e" /><rect y="24" width="60" height="2" fill="#c9a24e" />
        <ellipse cx="30" cy="13" rx="14" ry="5" fill="#33607f" stroke="#c9a24e" strokeWidth="1" />
      </pattern>
      <pattern id={`${id}lattice`} width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill="#6a1d16" /><path d="M 0 7 L 14 7 M 7 0 L 7 14" stroke="#a87a34" strokeWidth="1.2" />
      </pattern>
      <radialGradient id={`${id}warm`} cx="0.5" cy="0.6" r="0.7"><stop offset="0" stopColor="#ffcf73" stopOpacity="0.5" /><stop offset="1" stopColor="#ff9f43" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}column`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7a2018" /><stop offset="0.4" stopColor="#b2382b" /><stop offset="1" stopColor="#6a1a13" /></linearGradient>
      <linearGradient id={`${id}undershade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a0402" stopOpacity="0.55" /><stop offset="1" stopColor="#1a0402" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}redwall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a2a20" /><stop offset="1" stopColor="#6e1f17" /></linearGradient>
      <radialGradient id={`${id}glow`}><stop offset="0" stopColor="#ffd166" stopOpacity="0.6" /><stop offset="1" stopColor="#ffd166" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}lanternbody`} cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#e0675a" /><stop offset="0.6" stopColor="#c23a35" /><stop offset="1" stopColor="#8a1d1b" /></radialGradient>
    </defs>
  )
}

function Roof({ d, id }: { d: string; id: string }) {
  return <g><path d={d} fill={`url(#${id}tiles)`} /><path d={d} fill={`url(#${id}roofshade)`} stroke="#8a520c" strokeWidth={2} /></g>
}

function Ridge({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <>
      <rect x={x - 6} y={y - 14} width={w + 12} height={16} rx={4} fill="#2e7d5b" stroke="#1c4f3a" strokeWidth={2} />
      <rect x={x - 6} y={y - 14} width={w + 12} height={4} rx={2} fill="#5fbf8f" />
      {/* the dragon-fish finials at the ridge's ends */}
      <path d={`M ${x - 8} ${y - 12} q -10 -26 8 -36 q 2 14 12 12 q -6 10 -2 24 z M ${x + w + 8} ${y - 12} q 10 -26 -8 -36 q -2 14 -12 12 q 6 10 2 24 z`} fill="#2e7d5b" stroke="#ffd166" strokeWidth={1.5} />
      <circle cx={x + w / 2} cy={y - 18} r={7} fill="#ffd166" stroke="#c98a1c" strokeWidth={2} />
    </>
  )
}

function Lantern({ x, y, d, id }: { x: number; y: number; d: number; id: string }) {
  return (
    <g className="tp-lantern" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${-d}s` }}>
      <line x1={x} y1={y} x2={x} y2={y + 26} stroke="#3a2a1b" strokeWidth={2} />
      <circle className="tp-glow" cx={x} cy={y + 50} r={46} fill={`url(#${id}glow)`} />
      <rect x={x - 12} y={y + 24} width={24} height={6} rx={2} fill="#ffd166" />
      <ellipse cx={x} cy={y + 50} rx={24} ry={22} fill={`url(#${id}lanternbody)`} />
      <path d={`M ${x - 12} ${y + 30} Q ${x - 22} ${y + 50} ${x - 12} ${y + 70} M ${x} ${y + 28} L ${x} ${y + 72} M ${x + 12} ${y + 30} Q ${x + 22} ${y + 50} ${x + 12} ${y + 70}`} stroke="#9d0208" strokeWidth={2} fill="none" />
      <rect x={x - 12} y={y + 70} width={24} height={6} rx={2} fill="#ffd166" />
      <path d={`M ${x - 4} ${y + 76} l 0 16 M ${x} ${y + 76} l 0 20 M ${x + 4} ${y + 76} l 0 16`} stroke="#ffb703" strokeWidth={2} />
    </g>
  )
}

export const BuildingArt = memo(function BuildingArt({ building: p, w, h }: { building: BuildingParams; w: number; h: number }) {
  const id = `bd${useId().replace(/[^a-zA-Z0-9]/g, "")}-`
  const g = useMemo(() => buildingGeometry(p, w, h), [p, w, h])
  const { cx, half, base, colTop, low, upper, pyramid } = g
  const u = (n: string) => `url(#${id}${n})`
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full" style={{ overflow: "visible" }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Defs id={id} haze={p.haze} />
      <g filter={u("tint")}>
        {/* the upper storey: its red walls with lattice windows, its band and roof */}
        {upper && !pyramid && (
          <>
            <rect x={cx - upper.half} y={upper.top} width={upper.half * 2} height={Math.max(0, upper.bottom - upper.top)} fill={u("redwall")} />
            {upper.bottom - 28 - upper.top > 30 && Array.from({ length: Math.max(1, Math.round(upper.half / 40)) }, (_, i) => {
              const n = Math.max(1, Math.round(upper.half / 40)), ww = (upper.half * 2 - 40) / n
              return <rect key={`u${i}`} x={cx - upper.half + 20 + i * ww + 7} y={upper.top + 16} width={Math.max(0, ww - 14)} height={Math.max(0, upper.bottom - 28 - upper.top - 24)} fill={u("lattice")} stroke="#5c120d" strokeWidth={1.5} />
            })}
            <rect x={cx - upper.half} y={upper.bottom - 28} width={upper.half * 2} height={28} fill={u("band")} />
            {upper.roof && <Roof d={roofPath(upper.roof)} id={id} />}
            {g.ridge && <Ridge {...g.ridge} />}
            <rect x={cx - upper.half} y={upper.top + 4} width={upper.half * 2} height={10} fill="rgba(40,8,4,0.35)" />
          </>
        )}
        {/* a pyramid pavilion: the upper storey between its two roofs, the pyramid and its golden finial */}
        {pyramid && upper && (
          <>
            <rect x={cx - upper.half} y={upper.top} width={upper.half * 2} height={upper.bottom - upper.top} fill={u("redwall")} />
            <rect x={cx - upper.half * 0.82} y={upper.top + 8} width={upper.half * 1.64} height={Math.max(0, upper.bottom - upper.top - 16)} fill={u("lattice")} />
          </>
        )}
        {pyramid && <Roof d={pyramidPath(pyramid)} id={id} />}
        {pyramid && g.finial && <><path d={`M ${cx} ${pyramid.apex} L ${cx} ${pyramid.apex - 38}`} stroke="#c98a1c" strokeWidth={4} /><circle cx={cx} cy={g.finial.y} r={12} fill="#ffd166" stroke="#c98a1c" strokeWidth={2} /></>}
        {/* the roof over the columns */}
        {low && <Roof d={roofPath(low)} id={id} />}
        {!pyramid && !upper && g.ridge && <Ridge {...g.ridge} />}
        <rect x={cx - half} y={colTop} width={half * 2} height={26} fill={u("band")} />
        <rect x={cx - half} y={colTop + 26} width={half * 2} height={Math.max(0, base - colTop - 26)} fill="#6e140e" />
        {/* the bays: lattice doors lit from inside (whole height) or windows (upper half) */}
        {g.bays.map((b, i) => {
          const top = colTop + 34, full = base - colTop - 44, hh = b.door ? full : full * 0.5
          if (b.w - 28 <= 0 || hh <= 0) return null
          return (
            <g key={i}>
              <rect x={b.x + 14} y={top} width={b.w - 28} height={hh} fill={u("lattice")} stroke="#5c120d" strokeWidth={2} />
              <rect className="tp-window" x={b.x + 14} y={top} width={b.w - 28} height={hh} fill={u("warm")} />
              {/* the hanging gold bracket under the beam */}
              <path d={`M ${b.x + 14} ${top} l 16 0 l -16 14 z M ${b.x + b.w - 14} ${top} l -16 0 l 16 14 z`} fill="#e0a526" />
            </g>
          )
        })}
        {g.columns.map((x, i) => (
          <g key={`c${i}`}>
            <rect x={x - 8} y={colTop + 26} width={16} height={Math.max(0, base - colTop - 26)} fill={u("column")} />
            <rect x={x - 10} y={colTop + 26} width={20} height={6} fill="#ffd166" />
            <rect x={x - 11} y={base - 8} width={22} height={8} rx={2} fill="#e9e4d0" />
          </g>
        ))}
        {/* the shade under the eaves */}
        <rect x={cx - half} y={colTop + 26} width={half * 2} height={18} fill={u("undershade")} />
        {/* a white marble terrace */}
        <rect x={cx - half - 30} y={base} width={half * 2 + 60} height={12} fill="#ece7da" />
        <rect x={cx - half - 30} y={base + 10} width={half * 2 + 60} height={3} fill="#bdb6a6" />
        {g.plaque && <>
          <rect x={g.plaque.x} y={g.plaque.y} width={72} height={58} rx={3} fill="#1f4fa0" stroke="#ffd166" strokeWidth={5} />
          <path d={`M ${g.plaque.x + 36} ${g.plaque.y + 14} l 0 30 M ${g.plaque.x + 22} ${g.plaque.y + 24} l 28 0 M ${g.plaque.x + 24} ${g.plaque.y + 38} l 24 0`} stroke="#ffd166" strokeWidth={3} />
        </>}
        {g.lanterns.map((x, i) => <Lantern key={`l${i}`} x={x} y={colTop + 2} d={i * 0.7} id={id} />)}
      </g>
      {/* the floors she can climb: the roofs' top edges and the eaves, bright on a dark rim */}
      {g.floors.map((pts, i) => (
        <g key={`f${i}`}>
          <polyline points={lineAttr(pts)} fill="none" stroke="#1a0c03" strokeOpacity={0.75} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={lineAttr(pts)} fill="none" stroke="#f2cf72" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
})

// the Mureta com cerca: the balustrade's rails and posts, the glazed coping (its top is the floor, drawn in gold), the
// red wall down to the box's bottom and, with "Piso de pedra", the courtyard's stone floor under it
export const BalustradeArt = memo(function BalustradeArt({ balustrade, w, h }: { balustrade: BalustradeParams; w: number; h: number }) {
  const id = `bl${useId().replace(/[^a-zA-Z0-9]/g, "")}-`
  const u = (n: string) => `url(#${id}${n})`
  const posts = Math.max(1, Math.floor(w / 40))
  const f = BALUSTRADE_FLOOR
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full" style={{ overflow: "visible" }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <filter id={`${id}tint`} colorInterpolationFilters="sRGB">{MUTED}</filter>
        <pattern id={`${id}wall`} width="80" height="20" patternUnits="userSpaceOnUse"><rect width="80" height="20" fill="#93302a" /><rect y="19" width="80" height="1" fill="#7a2620" /></pattern>
        <linearGradient id={`${id}wallshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0603" stopOpacity="0.45" /><stop offset="0.3" stopColor="#1a0603" stopOpacity="0" /><stop offset="1" stopColor="#1a0603" stopOpacity="0.25" />
        </linearGradient>
        <pattern id={`${id}coping`} width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#b88a3a" /><rect x="12" width="4" height="16" fill="#8f6626" /></pattern>
        <pattern id={`${id}stone`} width="120" height="40" patternUnits="userSpaceOnUse">
          <rect width="120" height="40" fill="#6f6a66" /><rect x="0" y="0" width="60" height="20" fill="#75706b" />
          <path d="M 0 0 L 120 0 M 0 20 L 120 20 M 30 0 L 30 20 M 90 20 L 90 40" stroke="#57534f" strokeWidth="2" />
        </pattern>
      </defs>
      <g filter={u("tint")}>
        {balustrade.courtyard && <><rect x={0} y={h} width={w} height={160} fill={u("stone")} /><rect x={0} y={h} width={w} height={3} fill="#9a938a" /></>}
        <rect x={0} y={10} width={w} height={8} fill="#d8d3c8" />
        <rect x={0} y={f - 6} width={w} height={6} fill="#bfb9ad" />
        {Array.from({ length: posts + 1 }, (_, i) => <rect key={i} x={Math.min(w - 10, i * (w - 10) / posts)} y={0} width={10} height={44} rx={2} fill="#dcd7cb" />)}
        <rect x={0} y={f} width={w} height={Math.min(16, h - f)} fill={u("coping")} />
        {h > f + 18 && <rect x={0} y={f + 14} width={w} height={4} fill="#5a3a10" />}
        {h > f + 18 && <rect x={0} y={f + 18} width={w} height={h - f - 18} fill={u("wall")} />}
        {h > f + 18 && <rect x={0} y={f + 18} width={w} height={h - f - 18} fill={u("wallshade")} />}
      </g>
      <polyline points={`0,${f} ${w},${f}`} fill="none" stroke="#1a0c03" strokeOpacity={0.75} strokeWidth={9} strokeLinecap="round" />
      <polyline points={`0,${f} ${w},${f}`} fill="none" stroke="#f2cf72" strokeWidth={4} strokeLinecap="round" />
    </svg>
  )
})

// the lanterns' sway and the lights of the temple's state (once per page)
export function BuildingStyles() {
  return <style>{`
    .tp-lantern { animation: tp-sway 3.2s ease-in-out infinite; }
    .tp-glow { opacity: 0.25; transition: opacity 0.6s; }
    .tp-window { opacity: 0.3; transition: opacity 0.8s; }
    [data-temple="cleared"] .tp-glow, [data-temple="victory"] .tp-glow { opacity: 1; animation: tp-flicker 0.5s ease-in-out infinite alternate; }
    [data-temple="cleared"] .tp-window, [data-temple="victory"] .tp-window { opacity: 0.9; }
    [data-temple="playing"] .tp-glow, [data-temple="intro"] .tp-glow { opacity: 0.4; }
    [data-temple="playing"] .tp-window, [data-temple="intro"] .tp-window { opacity: 0.5; }
    @keyframes tp-sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
    @keyframes tp-flicker { from { opacity: 0.8; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .tp-lantern, .tp-glow { animation: none !important; } }
  `}</style>
}
