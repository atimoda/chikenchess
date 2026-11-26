"use client"

// The outline of the selected Chão or Parede in the editor mode: its points all around the object (the top, the
// sides and the back). Clicking a line of the outline adds a point there (and drags it while the button is held),
// dragging a point moves it, a double click on a point removes it (at least 3 stay). With a point focused, the
// arrows move it one unit (Shift: ten) and Delete removes it. The box is refitted around the outline after each
// change, so a point can be pulled past the old box.
import { useRef, useState } from "react"
import { ELEMENT_DEFS, type LayoutElement } from "@/lib/pigchicken/layout"
import { fitSurface, insertSurfacePoint, nearestSurfaceEdge, removeSurfacePoint, surfacePolygon, type SurfacePoint } from "@/lib/pigchicken/surfaces"
import { screenToWorld } from "@/lib/pigchicken/live-camera"
import { useT } from "@/lib/i18n"

const PAD = 24

type Drag = { pointer: number; index: number; start: SurfacePoint[]; base: LayoutElement; offset: SurfacePoint; sx: number; sy: number; moved: boolean; step: string }

export function SurfacePoints({ el, onChange }: { el: LayoutElement; onChange: (el: LayoutElement, step?: string) => void }) {
  const t = useT()
  const [selected, setSelected] = useState<number | null>(null)
  const drag = useRef<Drag | null>(null)
  const surface = el.params.surface
  if (!surface) return null
  const poly = surfacePolygon(el, surface)
  const d = ELEMENT_DEFS[el.kind]
  const apply = (world: SurfacePoint[], base: LayoutElement, step?: string) => {
    const fit = fitSurface(world, d.minW, d.minH)
    const current = base.params.surface ?? surface
    onChange({ ...base, x: fit.x, y: fit.y, w: fit.w, h: fit.h, params: { ...base.params, surface: { ...current, points: fit.points } } }, step)
  }
  const startDrag = (e: React.PointerEvent<SVGElement>, index: number, start: SurfacePoint[], moved: boolean) => {
    const p = screenToWorld(e.clientX, e.clientY)
    drag.current = { pointer: e.pointerId, index, start, base: el, offset: [start[index][0] - p.x, start[index][1] - p.y], sx: e.clientX, sy: e.clientY, moved, step: `surface:${el.id}:${e.timeStamp}` }
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelected(index)
  }
  const onMove = (e: React.PointerEvent<SVGElement>) => {
    const g = drag.current
    if (!g || g.pointer !== e.pointerId) return
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 2) return
    g.moved = true
    const p = screenToWorld(e.clientX, e.clientY)
    const world = g.start.map((q, i) => (i === g.index ? [Math.round(p.x + g.offset[0]), Math.round(p.y + g.offset[1])] : q) as SurfacePoint)
    apply(world, g.base, g.step)
  }
  const onUp = (e: React.PointerEvent<SVGElement>) => {
    if (drag.current?.pointer === e.pointerId) { onMove(e); drag.current = null }
  }
  const remove = (index: number) => {
    const next = removeSurfacePoint(poly, index)
    if (!next) return
    apply(next, el)
    setSelected(null)
  }
  const b = { x: el.x - PAD, y: el.y - PAD, w: el.w + PAD * 2, h: el.h + PAD * 2 }
  const points = poly.map(p => p.join(",")).join(" ")
  return (
    <svg data-chicken-ignore aria-label={t("Pontos do contorno")} className="absolute z-[1] overflow-visible" style={{ left: b.x, top: b.y, width: b.w, height: b.h, pointerEvents: "none" }}
      viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} onContextMenu={e => e.preventDefault()}>
      <polygon points={points} fill="none" stroke="#1a1408" strokeWidth={4} strokeLinejoin="round" opacity={0.7} />
      <polygon points={points} fill="none" stroke="#ffd166" strokeWidth={2} strokeDasharray="8 5" strokeLinejoin="round" />
      {/* the lines: a click adds a point where it was clicked, and keeps dragging it */}
      <polygon points={points} fill="none" stroke="transparent" strokeWidth={14} strokeLinejoin="round" style={{ pointerEvents: "stroke", cursor: "copy", touchAction: "none" }}
        onPointerDown={e => {
          if (e.button !== 0) return
          e.preventDefault(); e.stopPropagation()
          const p = screenToWorld(e.clientX, e.clientY)
          const near = nearestSurfaceEdge(poly, p.x, p.y)
          const next = insertSurfacePoint(poly, near.edge, [Math.round(near.point[0]), Math.round(near.point[1])])
          if (!next) return
          startDrag(e, near.edge + 1, next, true)
          apply(next, el, drag.current!.step)
        }}
        onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      {poly.map(([x, y], i) => (
        <g key={i} role="button" tabIndex={0} aria-label={t("Ponto {v} de {length} · {v2}, {v3}", { v: i + 1, length: poly.length, v2: Math.round(x), v3: Math.round(y) })}
          style={{ pointerEvents: "all", cursor: "grab", touchAction: "none", outline: "none" }}
          onPointerDown={e => {
            if (e.button !== 0) return
            e.preventDefault(); e.stopPropagation()
            ;(e.currentTarget as SVGGElement).focus({ preventScroll: true })
            startDrag(e, i, poly, false)
          }}
          onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onDoubleClick={e => { e.stopPropagation(); remove(i) }}
          onFocus={() => setSelected(i)}
          onKeyDown={e => {
            if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); remove(i); return }
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return
            e.preventDefault(); e.stopPropagation()
            const k = e.shiftKey ? 10 : 1
            const dx = (Number(e.key === "ArrowRight") - Number(e.key === "ArrowLeft")) * k, dy = (Number(e.key === "ArrowDown") - Number(e.key === "ArrowUp")) * k
            apply(poly.map((q, j) => (j === i ? [q[0] + dx, q[1] + dy] : q) as SurfacePoint), el)
          }}>
          <circle cx={x} cy={y} r={14} fill="transparent" />
          <circle cx={x} cy={y} r={7} fill={selected === i ? "#ffd166" : "#62577a"} stroke="#fff3cb" strokeWidth={2} />
          <circle cx={x} cy={y} r={9.5} fill="none" stroke="#332f3c" strokeWidth={2} />
        </g>
      ))}
    </svg>
  )
}
