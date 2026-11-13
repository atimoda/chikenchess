"use client"

// The art of the Postes de energia and Torres de transmissão, and the wires between them (lib/pigchicken/power-lines.ts).
// Everything is drawn in one colour, the sky's silhouette mixed toward its horizon by depth (the far ones fade into
// the haze), so against a sunset they read as black cut-outs. The wires are redrawn only when the camera moves and
// only when their poles stand in different depths; otherwise their layer just slides with the camera.
import { memo, useEffect, useMemo, useRef } from "react"
import { POWER_MODELS, fixedDepth, powerSpans, spanFloor, spanPath, type PowerParams, type Span } from "@/lib/pigchicken/power-lines"
import { cameraRestY, followDepth, onCameraMove } from "@/lib/pigchicken/live-camera"
import type { LayoutElement } from "@/lib/pigchicken/layout"

// the silhouette colour at a depth (CSS variables set by the backdrop from the Pátio's sky)
export const depthColor = (depth: number) => depth > 0
  ? `color-mix(in srgb, var(--patio-sil, #0b0a12), var(--patio-horizon, #7a6670) ${Math.round(Math.min(0.95, depth) * 85)}%)`
  : "var(--patio-sil, #0b0a12)"

type Profile = [number, number][] // [y, half width] from the base up, in % of the box
type Arm = { y: number; tip: number; attach: number } // tip: x of the left tip (mirrored right), attach: y where the wire hangs

const halfAt = (profile: Profile, y: number) => {
  for (let i = 1; i < profile.length; i++) {
    const [ya, ha] = profile[i - 1], [yb, hb] = profile[i]
    if (y <= ya && y >= yb) return ha + (hb - ha) * ((ya - y) / (ya - yb))
  }
  return profile[profile.length - 1][1]
}
// a lattice tower: legs along the profile, braced with an X between each pair of bars, arms with hanging insulators
function lattice(profile: Profile, arms: Arm[], step: number, peak?: number) {
  const L = (y: number) => 50 - halfAt(profile, y), R = (y: number) => 50 + halfAt(profile, y)
  const top = profile[profile.length - 1][0]
  let d = `M${L(100)} 100` + profile.map(([y]) => `L${L(y)} ${y}`).join("") + `M${R(100)} 100` + profile.map(([y]) => `L${R(y)} ${y}`).join("")
  const bars: number[] = []
  for (let y = 100; y > top + 0.01; y -= step * (0.55 + 0.45 * (y / 100))) bars.push(y)
  bars.push(top)
  bars.forEach((y, i) => {
    d += `M${L(y)} ${y}L${R(y)} ${y}`
    if (i) { const p = bars[i - 1]; d += `M${L(p)} ${p}L${R(y)} ${y}M${R(p)} ${p}L${L(y)} ${y}` }
  })
  arms.forEach(a => {
    const w = 1.6, l = L(a.y), r = R(a.y)
    d += `M${l} ${a.y - w}L${a.tip} ${a.y}L${l} ${a.y + w}M${r} ${a.y - w}L${100 - a.tip} ${a.y}L${r} ${a.y + w}`
    d += `M${(l + a.tip) / 2} ${a.y - w / 2}L${(l + a.tip) / 2} ${a.y + w / 2}M${(r + 100 - a.tip) / 2} ${a.y - w / 2}L${(r + 100 - a.tip) / 2} ${a.y + w / 2}`
    d += `M${a.tip} ${a.y}L${a.tip} ${a.attach}M${100 - a.tip} ${a.y}L${100 - a.tip} ${a.attach}`
  })
  if (peak !== undefined) d += `M${L(top)} ${top}L50 ${peak}L${R(top)} ${top}`
  return d
}

const TOWERS: Record<string, string> = {
  trelica: lattice([[100, 40], [30, 12], [3, 8]], [{ y: 10.5, tip: 4, attach: 13 }, { y: 24.5, tip: 16, attach: 27 }], 7, 0.5),
  gato: lattice([[100, 32], [42, 9], [22, 18], [9, 14]], [{ y: 9.5, tip: 6, attach: 12 }], 6.5) + "M44 9.5L50 3L56 9.5M50 3L50 12",
  alta: lattice([[100, 28], [6, 9], [2, 7]], [{ y: 9, tip: 24, attach: 11 }, { y: 20, tip: 6, attach: 22 }, { y: 31, tip: 18, attach: 33 }], 6, 0),
}

// the wooden and concrete poles: filled shapes (they stretch with their box)
function Pole({ model }: { model: string }) {
  const m = POWER_MODELS[model]
  const ins = m.attach.map(([x, y], i) => <rect key={i} x={x - 1.6} y={y - 2.6} width={3.2} height={2.6} rx={0.8} />)
  if (model === "rua") return <>
    <path d="M45 100L47.5 3H52.5L55 100Z" />
    <rect x={8} y={5} width={84} height={2.2} rx={0.6} />
    <path d="M52 30C66 28 80 27 90 31L90 32.4C80 29 66 30.4 52 32Z" />
    <path d="M84 31.5h12l-2 2.4h-8Z" />
    {ins}
  </>
  if (model === "duplo") return <>
    <path d="M46 100L47.6 1.5H52.4L54 100Z" />
    <rect x={1} y={6.6} width={98} height={2.4} rx={0.6} />
    <rect x={7} y={18.6} width={86} height={2.4} rx={0.6} />
    <path d="M48 16L22 9M52 16L78 9M48 28L26 21M52 28L74 21" stroke="currentColor" strokeWidth={1.4} vectorEffect="non-scaling-stroke" fill="none" />
    <path d="M51 46c6 0 7 6 0 7l-1-1c4-1 4-4 1-5Z" />
    {ins}
  </>
  return <>
    <path d="M45.5 100L47.4 2H52.6L54.5 100Z" />
    <rect x={1} y={7.6} width={98} height={2.4} rx={0.6} />
    <path d="M48 17L20 10M52 17L80 10" stroke="currentColor" strokeWidth={1.4} vectorEffect="non-scaling-stroke" fill="none" />
    <rect x={44} y={34} width={12} height={5} rx={1.4} />
    {ins}
  </>
}

export const PowerArt = memo(function PowerArt({ kind, power, w, depth = 0 }: { kind: "pole" | "tower"; power: PowerParams; w: number; depth?: number }) {
  const color = depthColor(depth)
  if (kind === "tower") {
    const d = TOWERS[power.model] ?? TOWERS.trelica
    return <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" style={{ color }}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={Math.max(0.7, Math.min(3.2, w / 140))} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  }
  return <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" style={{ color }} fill="currentColor">
    <Pole model={power.model} />
  </svg>
})

// one group's wires: slid as a layer when every pole shares a depth, else redrawn from the camera
function WireGroup({ spans }: { spans: Span[] }) {
  const ref = useRef<SVGGElement>(null)
  const fixed = fixedDepth(spans)
  const depth = spans[0]?.a.d ?? 0, pinned = !!spans[0]?.a.pin
  useEffect(() => {
    const g = ref.current
    if (!g) return
    if (fixed) return depth ? followDepth(g, depth, pinned) : undefined
    const paths = Array.from(g.querySelectorAll("path"))
    return onCameraMove((x, y) => { const rest = cameraRestY(); spans.forEach((s, i) => paths[i]?.setAttribute("d", spanPath(s, x, y, rest))) })
  }, [spans, fixed, depth, pinned])
  return <g ref={ref}>
    {spans.map(s => <path key={s.id} d={spanPath(s, 0, 0)} fill="none" stroke={depthColor(s.depth)} strokeWidth={s.wire * (1 - s.depth * 0.6)} strokeLinecap="round" />)}
  </g>
}

// the wires that start on this layer's poles (a line may cross layers: each wire is drawn with its first pole)
export const PowerLines = memo(function PowerLines({ elements, layer }: { elements: LayoutElement[]; layer: LayoutElement["layer"] }) {
  const groups = useMemo(() => {
    const by = new Map<string, Span[]>()
    const layers = new Map(elements.map(e => [e.id, e.layer]))
    powerSpans(elements).filter(s => layers.get(s.id.slice(0, s.id.indexOf(">"))) === layer).forEach(s => { const k = `${s.group}:${s.a.d === s.b.d && !s.a.pin === !s.b.pin ? `${s.a.d}${s.a.pin ? "p" : ""}` : "mix"}`; const l = by.get(k); if (l) l.push(s); else by.set(k, [s]) })
    return [...by.entries()]
  }, [elements, layer])
  if (!groups.length) return null
  return <svg aria-hidden="true" data-power-lines className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
    {groups.map(([k, spans]) => <WireGroup key={k} spans={spans} />)}
  </svg>
})

// the wires she can stand on (Fios como plataforma): one invisible one-way floor per wire on the ground's depth,
// a polyline along its curve (`data-chicken-line`, in the box's own pixels). Hidden poles and towers have none.
export const PowerFloors = memo(function PowerFloors({ elements }: { elements: LayoutElement[] }) {
  const floors = useMemo(() => powerSpans(elements.filter(e => !e.hidden)).flatMap(s => {
    const pts = spanFloor(s)
    if (!pts) return []
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
    const x = Math.min(...xs), y = Math.min(...ys)
    return [{ id: s.id, box: `${x.toFixed(1)},${y.toFixed(1)},${(Math.max(...xs) - x).toFixed(1)},${(Math.max(...ys) - y).toFixed(1)}`,
      line: pts.map(p => `${(p.x - x).toFixed(1)},${(p.y - y).toFixed(1)}`).join(" ") }]
  }), [elements])
  return <>{floors.map(f => <div key={f.id} data-chicken-id={`wire-${f.id}`} data-chicken-world-box={f.box} data-chicken-line={f.line} data-chicken-wire data-chicken-nearby className="absolute" />)}</>
})
