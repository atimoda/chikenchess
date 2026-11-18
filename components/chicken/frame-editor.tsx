"use client"

// The Vestiário's Hit-area editor (admin): each class's body frame (lib/chicken/body-frame.ts) drawn over the preview,
// with the box and the health bar draggable, and the numbers beside it.
import { useRef } from "react"
import { FRAME_CLASSES, FRAME_KEYS, FRAME_LABEL, defaultFrames, type BodyFrame, type BodyFrames, type FrameClass } from "@/lib/chicken/body-frame"
import { cn } from "@/lib/utils"

type Drag = { kind: "move" | "w" | "h" | "bar"; x0: number; y0: number; f: BodyFrame }

/** The view that holds the art's view and the whole frame (so a bigger box still shows). */
export function frameView(view: string, f: BodyFrame) {
  const [x, y, w, h] = view.split(" ").map(Number)
  const l = Math.min(x, f.x - f.w / 2 - 12), r = Math.max(x + w, f.x + f.w / 2 + 12)
  const t = Math.min(y, -f.y - f.h - 12, -f.bar - 16), b = Math.max(y + h, -f.y + 12)
  return `${l} ${t} ${r - l} ${b - t}`
}

/** The frame over the preview (same view as the art): the box moves, its right edge sets the width, its top the height, the bar line its height. */
export function FrameOverlay({ view, frame, onChange }: { view: string; frame: BodyFrame; onChange: (f: BodyFrame) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const at = (e: React.PointerEvent) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const start = (kind: Drag["kind"]) => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const p = at(e)
    drag.current = { kind, x0: p.x, y0: p.y, f: { ...frame } }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = at(e), dx = p.x - d.x0, dy = p.y - d.y0, f = { ...d.f }
    if (d.kind === "move") { f.x = d.f.x + dx; f.y = d.f.y - dy }
    else if (d.kind === "w") f.w = Math.max(10, d.f.w + dx * 2)
    else if (d.kind === "h") f.h = Math.max(10, d.f.h - dy)
    else f.bar = Math.max(0, d.f.bar - dy)
    onChange({ w: Math.round(f.w), h: Math.round(f.h), x: Math.round(f.x), y: Math.round(f.y), bar: Math.round(f.bar) })
  }
  const end = () => { drag.current = null }
  const l = frame.x - frame.w / 2, b = -frame.y, t = b - frame.h
  return (
    <svg ref={svg} viewBox={view} className="absolute inset-0 h-full w-full touch-none" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <title>Hit-area: arraste a caixa, a borda direita, o topo ou a linha da barra de vida</title>
      <rect x={l} y={t} width={frame.w} height={frame.h} fill="rgba(76,201,240,0.14)" stroke="#4cc9f0" strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" className="cursor-move" onPointerDown={start("move")} />
      <circle cx={l + frame.w} cy={t + frame.h / 2} r={6} fill="#4cc9f0" className="cursor-ew-resize" onPointerDown={start("w")} />
      <circle cx={frame.x} cy={t} r={6} fill="#4cc9f0" className="cursor-ns-resize" onPointerDown={start("h")} />
      <g className="cursor-ns-resize" onPointerDown={start("bar")}>
        <line x1={frame.x - 40} x2={frame.x + 40} y1={-frame.bar} y2={-frame.bar} stroke="transparent" strokeWidth={14} />
        <rect x={-32} y={-frame.bar - 4} width={64} height={8} rx={4} fill="#0b0f0c" opacity={0.8} />
        <rect x={-30} y={-frame.bar - 2} width={60} height={4} rx={2} fill="#3fcf6b" />
      </g>
    </svg>
  )
}

/** The class picker, the numbers and Salvar no game. */
export function FrameControls({ cls, onClass, frames, saved, onChange, onSave, saving, note }: { cls: FrameClass; onClass: (c: FrameClass) => void; frames: BodyFrames; saved: BodyFrames; onChange: (f: BodyFrames) => void; onSave: () => void; saving: boolean; note: string | null }) {
  const f = frames[cls], s = saved[cls]
  const set = (key: keyof BodyFrame, v: number) => { if (Number.isFinite(v)) onChange({ ...frames, [cls]: { ...f, [key]: v } }) }
  const dirty = JSON.stringify(frames) !== JSON.stringify(saved)
  return (
    <section className="grid gap-3 border-b border-white/10 px-4 py-3.5">
      <div role="radiogroup" aria-label="Classe" className="flex gap-1">
        {FRAME_CLASSES.map(c => (
          <button key={c} type="button" role="radio" aria-checked={cls === c} onClick={() => onClass(c)}
            className={cn("h-8 flex-1 rounded-md px-2 font-semibold", cls === c ? "bg-[#22302a] text-white shadow-[inset_0_0_0_1px_rgba(31,211,154,0.6)]" : "text-[#93a79a] hover:text-white", JSON.stringify(frames[c]) !== JSON.stringify(saved[c]) && "text-amber-300")}>{FRAME_LABEL[c]}</button>
        ))}
      </div>
      <div className="grid gap-1.5">
        {FRAME_KEYS.map(k => (
          <label key={k.key} className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-2">
            <span className={cn(f[k.key] !== s[k.key] && "text-amber-300")}>{k.label}</span>
            <input type="number" min={k.min} max={k.max} step={1} value={f[k.key]} onChange={e => set(k.key, Math.max(k.min, Math.min(k.max, Math.round(Number(e.target.value)))))}
              className="h-7 rounded border border-white/15 bg-black/30 px-2 text-right tabular-nums" />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {note && <span role="status" className="min-w-0 flex-1 text-[11px] text-[#8a9a8a]">{note}</span>}
        <button type="button" onClick={() => onChange({ ...frames, [cls]: defaultFrames()[cls] })} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">Padrão</button>
        <button type="button" disabled={!dirty || saving} onClick={onSave} className="h-8 rounded border border-primary/60 bg-primary/10 px-3 hover:bg-primary/25 disabled:opacity-50">{saving ? "Salvando…" : "Salvar no game"}</button>
      </div>
    </section>
  )
}
