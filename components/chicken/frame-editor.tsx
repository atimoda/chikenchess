"use client"

// The Vestiário's Hit-area editor (admin): each class's body frame (lib/chicken/body-frame.ts) in each pose, drawn over
// a real character in that pose (a chicken engine driven like another browser's chicken, so the pose is the game's),
// with the box and the health bar draggable, and the numbers beside it.
import { useEffect, useRef, useState } from "react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import type { ChickenArtSet, ChickenLook } from "@/lib/chicken/look-art"
import {
  FRAME_CLASSES, FRAME_KEYS, FRAME_LABEL, FRAME_POSES, POSE_LABEL, frameFor, withFrame,
  type BodyFrame, type BodyFrames, type FrameClass, type FramePose,
} from "@/lib/chicken/body-frame"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Drag = { kind: "move" | "w" | "h" | "bar"; x0: number; y0: number; f: BodyFrame }
// the state the engine animates for each pose, and the surface she is on (a wall on her right while clinging)
const POSE_STATE: Record<FramePose, string> = { stand: "idle", crouch: "crouch", brood: "brood", air: "jump", seat: "seat", cling: "cling" }
const CLING_ANGLE = -Math.PI / 2
const angleOf = (pose: FramePose) => (pose === "cling" ? CLING_ANGLE : 0)

/** The character in `pose` with `cls`'s frame over it; `look` (Chi, Pig, Ken) or `art` (a Kid). */
export function PosePreview({ cls, pose, look, art, frames, onChange }: { cls: FrameClass; pose: FramePose; look: ChickenLook; art: ChickenArtSet | null; frames: BodyFrames; onChange: (f: BodyFrames) => void }) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 260, h: 400 })
  const [scale, setScale] = useState(0.5)
  const engine = useRef<ChickenEngine | null>(null)
  // where her feet are, in the stage's pixels: on the floor, or on the wall to the right while clinging
  const feet = pose === "cling" ? { x: size.w * 0.66, y: size.h * 0.5 } : { x: size.w * 0.5, y: size.h * 0.8 }
  const live = useRef({ feet, pose })
  live.current = { feet, pose }

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (!host.current) return
    const eng = createChickenEngine(host.current, { groundHeight: 0, fixedScale: true, look })
    eng.setGame({ gameMode: true })
    eng.setRemote(() => {
      const { feet: f, pose: p } = live.current
      return { x: f.x, y: f.y, vx: 0, vy: 0, face: 1, state: POSE_STATE[p], cling: p === "cling" ? CLING_ANGLE : null }
    })
    engine.current = eng
    // the engine draws in the window's pixels (its viewBox is the stage): the host takes that size, so 1 unit is 1 px
    const fit = () => {
      const vb = host.current?.querySelector("svg")?.viewBox.baseVal
      if (vb && host.current && vb.width) { host.current.style.width = `${vb.width}px`; host.current.style.height = `${vb.height}px` }
      setScale(s => { const n = eng.getMotionState().scale; return Math.abs(n - s) > 1e-3 ? n : s })
    }
    fit()
    const t = window.setInterval(fit, 300)
    return () => { window.clearInterval(t); eng.destroy(); engine.current = null }
  // the engine is made once; the look and the art follow below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const eng = engine.current
    if (!eng) return
    if (art) { eng.setSpecies("chick"); eng.setArt(art) } else { eng.setSpecies(undefined); eng.setArt(null); eng.setLook(look) }
    setScale(eng.getMotionState().scale)
  }, [look, art])

  const f = frameFor(frames, cls, pose), angle = angleOf(pose)
  // big enough to edit: the frame's height (or the bar) takes about 70% of the preview
  const reach = Math.max(f.h + Math.max(0, f.y), f.bar + 20, f.w + 2 * Math.abs(f.x)) * scale
  const zoom = Math.max(0.6, Math.min(3, (pose === "cling" ? size.w * 0.55 : size.h * 0.7) / Math.max(1, reach)))
  // her axes on screen: along the surface (t) and away from it (n)
  const tx = Math.cos(angle), ty = Math.sin(angle), nx = Math.sin(angle), ny = -Math.cos(angle)
  const pt = (a: number, u: number) => ({ x: feet.x + (tx * a + nx * u) * scale, y: feet.y + (ty * a + ny * u) * scale })
  const corners = [pt(f.x - f.w / 2, f.y), pt(f.x + f.w / 2, f.y), pt(f.x + f.w / 2, f.y + f.h), pt(f.x - f.w / 2, f.y + f.h)]
  const aabb = { l: Math.min(...corners.map(c => c.x)), r: Math.max(...corners.map(c => c.x)), t: Math.min(...corners.map(c => c.y)), b: Math.max(...corners.map(c => c.y)) }
  const wHandle = pt(f.x + f.w / 2, f.y + f.h / 2), hHandle = pt(f.x, f.y + f.h), bar = pt(0, f.bar)

  const drag = useRef<Drag | null>(null)
  const at = (e: React.PointerEvent) => {
    const m = svg.current?.getScreenCTM()
    return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : new DOMPoint(0, 0)
  }
  const start = (kind: Drag["kind"]) => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const p = at(e)
    drag.current = { kind, x0: p.x, y0: p.y, f: { ...f } }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = at(e), dx = p.x - d.x0, dy = p.y - d.y0
    // the pointer's move in her own units: along the surface (a) and away from it (u)
    const a = (dx * tx + dy * ty) / scale, u = (dx * nx + dy * ny) / scale
    const n = { ...d.f }
    if (d.kind === "move") { n.x = d.f.x + a; n.y = d.f.y + u }
    else if (d.kind === "w") n.w = Math.max(10, d.f.w + a * 2)
    else if (d.kind === "h") n.h = Math.max(10, d.f.h + u)
    else n.bar = Math.max(0, d.f.bar + u)
    onChange(withFrame(frames, cls, pose, { w: Math.round(n.w), h: Math.round(n.h), x: Math.round(n.x), y: Math.round(n.y), bar: Math.round(n.bar) }))
  }
  const end = () => { drag.current = null }

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: `${feet.x}px ${feet.y}px` }}>
        <div ref={host} className="pointer-events-none absolute left-0 top-0" />
        <svg ref={svg} viewBox={`0 0 ${size.w} ${size.h}`} className="absolute inset-0 h-full w-full touch-none overflow-visible" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          <title>{t("Hit-area: arraste a caixa, a bolinha da borda, a do topo ou a barra de vida")}</title>
          {/* the floor, or the wall she clings to */}
          {pose === "cling"
            ? <line x1={feet.x} x2={feet.x} y1={-size.h} y2={size.h * 2} stroke="rgba(31,211,154,0.55)" strokeWidth={2 / zoom} />
            : <line x1={-size.w} x2={size.w * 2} y1={feet.y} y2={feet.y} stroke="rgba(31,211,154,0.55)" strokeWidth={2 / zoom} />}
          {/* turned with her on a wall: what the game tests is the box around it (dotted) */}
          {angle !== 0 && <rect x={aabb.l} y={aabb.t} width={aabb.r - aabb.l} height={aabb.b - aabb.t} fill="none" stroke="rgba(76,201,240,0.5)" strokeWidth={1 / zoom} strokeDasharray={`${2 / zoom} ${3 / zoom}`} />}
          <polygon points={corners.map(c => `${c.x},${c.y}`).join(" ")} fill="rgba(76,201,240,0.14)" stroke="#4cc9f0" strokeWidth={1.5 / zoom} strokeDasharray={`${5 / zoom} ${4 / zoom}`} className="cursor-move" onPointerDown={start("move")} />
          <circle cx={wHandle.x} cy={wHandle.y} r={6 / zoom} fill="#4cc9f0" className="cursor-ew-resize" onPointerDown={start("w")} />
          <circle cx={hHandle.x} cy={hHandle.y} r={6 / zoom} fill="#4cc9f0" className="cursor-ns-resize" onPointerDown={start("h")} />
          <g className="cursor-ns-resize" onPointerDown={start("bar")} transform={`translate(${bar.x} ${bar.y}) scale(${Math.max(0.6, scale * 1.6)})`}>
            <rect x={-40} y={-9} width={80} height={18} fill="transparent" />
            <rect x={-32} y={-4} width={64} height={8} rx={4} fill="#0b0f0c" opacity={0.8} />
            <rect x={-30} y={-2} width={60} height={4} rx={2} fill="#3fcf6b" />
          </g>
        </svg>
      </div>
    </div>
  )
}

/** The class and pose pickers, the numbers and Salvar no game. */
export function FrameControls({ cls, onClass, pose, onPose, frames, saved, onChange, onSave, saving, note }: { cls: FrameClass; onClass: (c: FrameClass) => void; pose: FramePose; onPose: (p: FramePose) => void; frames: BodyFrames; saved: BodyFrames; onChange: (f: BodyFrames) => void; onSave: () => void; saving: boolean; note: string | null }) {
  const t = useT()
  const f = frameFor(frames, cls, pose), s = frameFor(saved, cls, pose)
  const own = pose === "stand" || !!frames[cls].poses?.[pose]
  const set = (key: keyof BodyFrame, v: number) => { if (Number.isFinite(v)) onChange(withFrame(frames, cls, pose, { ...f, [key]: v })) }
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const dirty = !same(frames, saved)
  const seg = (on: boolean, changed: boolean) => cn("h-8 flex-1 whitespace-nowrap rounded-md px-2 font-semibold", on ? "bg-[#22302a] text-white shadow-[inset_0_0_0_1px_rgba(31,211,154,0.6)]" : "text-[#93a79a] hover:text-white", changed && "text-amber-300")
  return (
    <section className="grid gap-3 border-b border-white/10 px-4 py-3.5">
      <div role="radiogroup" aria-label={t("Classe")} className="flex gap-1">
        {FRAME_CLASSES.map(c => <button key={c} type="button" role="radio" aria-checked={cls === c} onClick={() => onClass(c)} className={seg(cls === c, !same(frames[c], saved[c]))}>{t(FRAME_LABEL[c])}</button>)}
      </div>
      {/* a pose without its own frame uses the standing one: its name is dimmed */}
      <div role="radiogroup" aria-label={t("Pose")} className="grid grid-cols-3 gap-1">
        {FRAME_POSES.map(p => (
          <button key={p} type="button" role="radio" aria-checked={pose === p} onClick={() => onPose(p)}
            className={cn(seg(pose === p, !same(frameFor(frames, cls, p), frameFor(saved, cls, p))), p !== "stand" && !frames[cls].poses?.[p] && pose !== p && "opacity-60")}>{t(POSE_LABEL[p])}</button>
        ))}
      </div>
      <div className="grid gap-1.5">
        {FRAME_KEYS.map(k => (
          <label key={k.key} className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-2">
            <span className={cn(f[k.key] !== s[k.key] && "text-amber-300")}>{t(k.label)}</span>
            <input type="number" min={k.min} max={k.max} step={1} value={f[k.key]} onChange={e => set(k.key, Math.max(k.min, Math.min(k.max, Math.round(Number(e.target.value)))))}
              className={cn("h-7 rounded border border-white/15 bg-black/30 px-2 text-right tabular-nums", !own && "text-[#93a79a]")} />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {note && <span role="status" className="min-w-0 flex-1 text-[11px] text-[#8a9a8a]">{note}</span>}
        {pose === "stand"
          ? <button type="button" onClick={() => onChange(withFrame(frames, cls, "stand", null))} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">{t("Padrão")}</button>
          : <button type="button" disabled={!own} onClick={() => onChange(withFrame(frames, cls, pose, null))} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary disabled:opacity-45">{t("Igual a Em pé")}</button>}
        <button type="button" disabled={!dirty || saving} onClick={onSave} className="h-8 rounded border border-primary/60 bg-primary/10 px-3 hover:bg-primary/25 disabled:opacity-50">{saving ? t("Salvando…") : t("Salvar no game")}</button>
      </div>
    </section>
  )
}
