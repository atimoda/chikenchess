"use client"

// The Pátio's editor mode: everyone allowed to edit this Pátio (lib/pigchicken/edit-access.ts) changes its layout
// live. A palette of every element (drag one onto the Pátio), click to select, drag the body to move, the corners
// to resize (Shift keeps the shape), and a small bar on the selected one: lock, turn (snaps to the 8 main angles),
// layers and collisions, Edit (elements with params), duplicate and delete. Ctrl+Z / Ctrl+Shift+Z undo and redo.
// The game keeps running underneath: the keyboard moves her, and a click on empty space still shoots (with
// something selected, the first click there only clears the selection).
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownToLine, Copy, Layers, Lock, LockOpen, Pencil, Redo2, RotateCw, Trash2, Undo2, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { cn } from "@/lib/utils"
import {
  ELEMENT_DEFS, HORDE_BUTTONS, HORDE_BUTTON_LABELS, LAYERS, LAYER_HINTS, LAYER_LABELS, createElement, elementBounds, elementsInWorld, layoutBoxes,
  newElementId, normalizeElement, settleLayout, type ElementKind, type ElementParams, type LayoutElement, type PatioLayout,
} from "@/lib/pigchicken/layout"
import { DUMMY_HP_RANGE } from "@/lib/pigchicken/dummies"
import { CONSUMABLE_IDS, DEFAULT_ITEMS, INSTRUMENT_IDS, WEAPON_IDS, type ItemId } from "@/lib/pigchicken/items"
import { ITEM_BOX, ITEM_SVG } from "@/lib/pigchicken/art"
import { followCamera, screenToWorld } from "@/lib/pigchicken/live-camera"
import { SCENE_W, WORLD_GROUND_Y, worldScenes } from "@/lib/pigchicken/world"
import { ElementArt } from "./patio-layout"

const UI = "header, aside, button, input, select, textarea, a, label, [data-chicken-ignore], [role='dialog']"
const HISTORY_MAX = 80

type Change = (next: PatioLayout) => void
type Gesture = { kind: "move" | "resize" | "rotate"; id: string; pointer: number; sx: number; sy: number; start: LayoutElement; corner?: [number, number]; moved: boolean }

// ---------- history: one undo step per gesture ----------
function useHistory(layout: PatioLayout, onChange: Change) {
  const undo = useRef<PatioLayout[]>([]), redo = useRef<PatioLayout[]>([])
  const gesture = useRef<string | null>(null)
  const [, bump] = useState(0)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  // `step`: a gesture id; changes with the same id after the first one join its undo step
  const commit = useCallback((next: PatioLayout, step?: string) => {
    if (!step || step !== gesture.current) {
      undo.current.push(layoutRef.current)
      if (undo.current.length > HISTORY_MAX) undo.current.shift()
      redo.current = []
      bump(n => n + 1)
    }
    gesture.current = step ?? null
    onChange(next)
  }, [onChange])
  const back = useCallback(() => {
    const prev = undo.current.pop(); if (!prev) return
    redo.current.push(layoutRef.current); gesture.current = null; bump(n => n + 1); onChange(prev)
  }, [onChange])
  const forward = useCallback(() => {
    const next = redo.current.pop(); if (!next) return
    undo.current.push(layoutRef.current); gesture.current = null; bump(n => n + 1); onChange(next)
  }, [onChange])
  return { commit, back, forward, canUndo: undo.current.length > 0, canRedo: redo.current.length > 0 }
}

const replaceEl = (layout: PatioLayout, el: LayoutElement): PatioLayout => ({ ...layout, elements: layout.elements.map(e => (e.id === el.id ? el : e)) })
const rad = (deg: number) => (deg * Math.PI) / 180
const snap45 = (deg: number) => ((Math.round(deg / 45) * 45) % 360 + 360) % 360

export function PatioEditor({ layout, screens, onChange, onClose }: { layout: PatioLayout; screens: number; onChange: Change; onClose: () => void }) {
  const history = useHistory(layout, onChange)
  const { back, forward, canUndo, canRedo } = history
  // the gesture under way (move, resize, turn); the element being dragged does not fall until it is let go
  const gesture = useRef<Gesture | null>(null)
  // every change lets the elements with gravity fall onto what is under them
  const commit = useCallback((next: PatioLayout, step?: string) => {
    history.commit({ ...next, elements: settleLayout(next.elements, gesture.current?.moved ? gesture.current.id : null) }, step)
  }, [history.commit])
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState<"" | "layers" | "edit" | "delete">("")
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const sel = layout.elements.find(e => e.id === selected) ?? null
  const shown = useMemo(() => elementsInWorld(layout, screens), [layout, screens])
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const select = useCallback((id: string | null) => { setSelected(id); setPanel("") }, [])
  // a deleted (or undone) element is no longer selected
  useEffect(() => { if (selected && !layout.elements.some(e => e.id === selected)) select(null) }, [layout, selected, select])

  const update = useCallback((el: LayoutElement, step?: string) => {
    const clean = normalizeElement(el)
    if (clean) commit(replaceEl(layoutRef.current, clean), step)
  }, [commit])
  const remove = useCallback((id: string) => { commit({ ...layoutRef.current, elements: layoutRef.current.elements.filter(e => e.id !== id) }); select(null) }, [commit, select])
  const duplicate = useCallback((el: LayoutElement) => {
    const copy = normalizeElement({ ...structuredClone(el), id: newElementId(el.kind), x: el.x + 32, y: el.y - 32, locked: false })!
    commit({ ...layoutRef.current, elements: [...layoutRef.current.elements, copy] })
    select(copy.id)
  }, [commit, select])
  // the floor right under a point: the ground, or the top of a solid element
  const floorBelow = useCallback((x: number, y: number) => {
    let best = WORLD_GROUND_Y
    layoutBoxes(elementsInWorld(layoutRef.current, screens)).forEach(b => { if (b.solid !== false && x >= b.l && x <= b.r && b.t >= y && b.t < best) best = b.t })
    return best
  }, [screens])
  const add = useCallback((el: LayoutElement) => { commit({ ...layoutRef.current, elements: [...layoutRef.current.elements, el] }); select(el.id) }, [commit, select])

  // keyboard: Esc clears the selection, Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo and redo, Ctrl+D duplicates
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      if (e.code === "Escape" && selectedRef.current) { select(null); return }
      if (mod && e.code === "KeyZ") { e.preventDefault(); if (e.shiftKey) forward(); else back(); return }
      if (mod && e.code === "KeyY") { e.preventDefault(); forward(); return }
      if (mod && e.code === "KeyD") {
        e.preventDefault()
        const el = layoutRef.current.elements.find(x => x.id === selectedRef.current)
        if (el && !el.locked) duplicate(el)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [back, forward, duplicate, select])

  // with something selected, the first click on empty space only clears the selection (it does not shoot)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!selectedRef.current) return
      const t = e.target as Element | null
      if (t?.closest?.(UI) || t?.closest?.("[data-patio-editor]")) return
      e.stopPropagation()
      select(null)
    }
    window.addEventListener("pointerdown", onDown, true)
    return () => window.removeEventListener("pointerdown", onDown, true)
  }, [select])

  // ---------- gestures on the selected element: move, resize, turn ----------
  const begin = (kind: Gesture["kind"], el: LayoutElement, corner?: [number, number]) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    // the first click only selects: dragging needs the element selected
    if (selectedRef.current !== el.id) { select(el.id); return }
    if (el.locked) return
    gesture.current = { kind, id: el.id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, start: el, corner, moved: false }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.pointer !== e.pointerId) return
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy
    if (!g.moved && Math.hypot(dx, dy) < 3) return
    g.moved = true
    const s = g.start, step = `${g.kind}:${g.id}:${g.sx}:${g.sy}`
    if (g.kind === "move") { update({ ...s, x: s.x + dx, y: s.y + dy }, step); return }
    if (g.kind === "rotate") {
      const p = screenToWorld(e.clientX, e.clientY)
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2
      update({ ...s, rot: snap45((Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90) }, step)
      return
    }
    // resize by a corner, in the element's own (turned) axes; the opposite corner stays put
    const [sx, sy] = g.corner!
    const a = rad(s.rot), c = Math.cos(a), sn = Math.sin(a)
    const lx = dx * c + dy * sn, ly = -dx * sn + dy * c
    const d = ELEMENT_DEFS[s.kind]
    let w = Math.max(d.minW, s.w + sx * lx), h = Math.max(d.minH, s.h + sy * ly)
    if (e.shiftKey) { const k = Math.max(w / s.w, h / s.h); w = Math.max(d.minW, s.w * k); h = Math.max(d.minH, s.h * k) }
    const ox = (sx * (w - s.w)) / 2, oy = (sy * (h - s.h)) / 2
    const cx = s.x + s.w / 2 + ox * c - oy * sn, cy = s.y + s.h / 2 + ox * sn + oy * c
    update({ ...s, x: cx - w / 2, y: cy - h / 2, w, h }, step)
  }
  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.pointer !== e.pointerId) return
    gesture.current = null
    // a click on the turn handle (no drag) turns it 45°
    if (g.kind === "rotate" && !g.moved) update({ ...g.start, rot: snap45(g.start.rot + 45) })
    // let go: with gravity it falls now (in the same undo step as the drag)
    else if (g.moved) commit(layoutRef.current, `${g.kind}:${g.id}:${g.sx}:${g.sy}`)
  }

  // ---------- the overlay in world units, following the camera ----------
  const worldRef = useRef<HTMLDivElement>(null)
  useEffect(() => (worldRef.current ? followCamera(worldRef.current) : undefined), [])
  const width = worldScenes(screens) * SCENE_W

  return (
    <>
      <style>{`
        [data-patio-hit] { cursor: pointer; }
        [data-patio-hit]:hover { outline: 1px solid rgba(255,209,102,.7); outline-offset: 2px; }
        [data-patio-hit][data-sel] { outline: 2px solid #ffd166; outline-offset: 2px; cursor: move; }
        [data-patio-hit][data-sel][data-locked] { outline-color: #9aa0a8; cursor: not-allowed; }
        .patio-corner { position: absolute; width: 28px; height: 28px; touch-action: none; display: grid; place-items: center; }
        .patio-corner span { width: 12px; height: 12px; border: 0 solid #ffd166; }
        @media (pointer: coarse) { .patio-corner { width: 44px; height: 44px; } .patio-corner span { width: 16px; height: 16px; } }
      `}</style>
      <div data-patio-editor className="pointer-events-none fixed inset-0 z-[203] overflow-hidden">
        <div ref={worldRef} className="absolute left-0 top-0" style={{ width, height: WORLD_GROUND_Y }}>
          {shown.map(el => (
            <HitBox key={el.id} el={el} selected={el.id === selected} begin={begin} onMove={onMove} onUp={onUp} />
          ))}
          {sel && (
            <Toolbar
              el={sel}
              panel={panel}
              setPanel={setPanel}
              onLock={() => update({ ...sel, locked: !sel.locked })}
              onGravity={() => update({ ...sel, gravity: !sel.gravity })}
              onRotate={begin("rotate", sel)}
              onMove={onMove}
              onUp={onUp}
              onDuplicate={() => duplicate(sel)}
              onDelete={() => remove(sel.id)}
            />
          )}
        </div>
      </div>
      {sel && panel === "layers" && <LayersPanel el={sel} onChange={el => update(el)} onClose={() => setPanel("")} />}
      {sel && panel === "edit" && <EditPanel key={sel.id} el={sel} onChange={(el, step) => update(el, step)} onClose={() => setPanel("")} />}
      <Palette onAdd={add} floorBelow={floorBelow} onClose={onClose} undo={back} redo={forward} canUndo={canUndo} canRedo={canRedo} />
    </>
  )
}

// one element's hit area (turned like it) with its corners when selected
const HitBox = memo(function HitBox({ el, selected, begin, onMove, onUp }: {
  el: LayoutElement; selected: boolean
  begin: (kind: Gesture["kind"], el: LayoutElement, corner?: [number, number]) => (e: React.PointerEvent) => void
  onMove: (e: React.PointerEvent) => void; onUp: (e: React.PointerEvent) => void
}) {
  const d = ELEMENT_DEFS[el.kind]
  return (
    <div
      data-chicken-ignore
      data-patio-hit={el.id}
      data-sel={selected || undefined}
      data-locked={el.locked || undefined}
      aria-label={d.label}
      className="pointer-events-auto absolute touch-none"
      style={{ left: el.x, top: el.y, width: el.w, height: el.h, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}
      onPointerDown={begin("move", el)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={e => e.preventDefault()}
    >
      {selected && !el.locked && d.resizable && ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([sx, sy]) => (
        <div
          key={`${sx}${sy}`}
          className="patio-corner"
          style={{ left: sx < 0 ? -14 : undefined, right: sx > 0 ? -14 : undefined, top: sy < 0 ? -14 : undefined, bottom: sy > 0 ? -14 : undefined, cursor: sx * sy > 0 ? "nwse-resize" : "nesw-resize" }}
          onPointerDown={begin("resize", el, [sx, sy])}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span style={{ [sy < 0 ? "borderTopWidth" : "borderBottomWidth"]: 3, [sx < 0 ? "borderLeftWidth" : "borderRightWidth"]: 3 } as React.CSSProperties} />
        </div>
      ))}
    </div>
  )
})

const TOOL = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-[#101713]/95 text-[#dfe8df] transition-colors hover:border-primary hover:text-white disabled:opacity-40"

// the selected element's bar, over its top-right corner
function Toolbar({ el, panel, setPanel, onLock, onGravity, onRotate, onMove, onUp, onDuplicate, onDelete }: {
  el: LayoutElement; panel: string; setPanel: (p: "" | "layers" | "edit" | "delete") => void
  onLock: () => void; onGravity: () => void; onRotate: (e: React.PointerEvent) => void; onMove: (e: React.PointerEvent) => void; onUp: (e: React.PointerEvent) => void
  onDuplicate: () => void; onDelete: () => void
}) {
  const d = ELEMENT_DEFS[el.kind]
  const b = elementBounds(el)
  // kept on the screen side of the element when it is near the world's top
  const top = Math.max(b.y - 46, -2990)
  return (
    <div data-chicken-ignore className="pointer-events-auto absolute flex items-center gap-1 font-mono text-[11px]" style={{ left: b.x + b.w, top, transform: "translateX(-100%)" }} onPointerDown={e => e.stopPropagation()}>
      <span className="mr-1 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-white/80">{d.label}</span>
      <button type="button" className={cn(TOOL, el.locked && "border-amber-300 text-amber-300")} title={el.locked ? "Destrancar" : "Trancar (bloqueia mover, redimensionar, girar e apagar)"} aria-label={el.locked ? "Destrancar" : "Trancar"} aria-pressed={el.locked} onClick={onLock}>
        {el.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
      </button>
      {!el.locked && (
        <>
          <button type="button" className={cn(TOOL, el.gravity && "border-sky-300 text-sky-300")} title={el.gravity ? "Gravidade ligada: cai até se apoiar em algo (clique para desligar)" : "Gravidade: cai até se apoiar em algo"} aria-label="Gravidade" aria-pressed={!!el.gravity} onClick={onGravity}>
            <ArrowDownToLine className="h-4 w-4" />
          </button>
          {d.rotatable && (
            <button type="button" className={cn(TOOL, "touch-none")} title="Girar: arraste (encaixa a cada 45°) ou clique para girar 45°" aria-label="Girar" onPointerDown={onRotate} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <RotateCw className="h-4 w-4" />
            </button>
          )}
          {!d.entity && (
            <button type="button" className={cn(TOOL, panel === "layers" && "border-primary text-white")} title="Camada e colisões" aria-label="Camada e colisões" aria-pressed={panel === "layers"} onClick={() => setPanel(panel === "layers" ? "" : "layers")}>
              <Layers className="h-4 w-4" />
            </button>
          )}
          {d.editable && (
            <button type="button" className={cn(TOOL, panel === "edit" && "border-primary text-white")} title="Editar parâmetros" aria-label="Editar" aria-pressed={panel === "edit"} onClick={() => setPanel(panel === "edit" ? "" : "edit")}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button type="button" className={TOOL} title="Duplicar (Ctrl+D)" aria-label="Duplicar" onClick={onDuplicate}><Copy className="h-4 w-4" /></button>
          <div className="relative">
            <button
              type="button"
              className={cn(TOOL, "hover:border-red-400 hover:text-red-300", panel === "delete" && "border-red-400 text-red-300")}
              title="Apagar (clique duplo apaga sem confirmar)"
              aria-label="Apagar"
              onClick={() => setPanel(panel === "delete" ? "" : "delete")}
              onDoubleClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {panel === "delete" && (
              <div role="dialog" aria-label="Confirmar" className="absolute right-0 top-10 flex items-center gap-2 whitespace-nowrap rounded-lg border border-red-400/60 bg-[#101713] px-3 py-2 text-white shadow-lg">
                <span>Apagar?</span>
                <button type="button" className="h-7 rounded-md border border-red-400 bg-red-500/80 px-2 font-bold" onClick={onDelete}>Apagar</button>
                <button type="button" className="h-7 rounded-md border border-white/20 px-2" onClick={() => setPanel("")}>Não</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3" title={hint}>
      <span className="grid"><span>{label}</span>{hint && <span className="text-[10px] text-[#93a79a]">{hint}</span>}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
    </label>
  )
}

// the layer dropdown and the collisions
function LayersPanel({ el, onChange, onClose }: { el: LayoutElement; onChange: (el: LayoutElement) => void; onClose: () => void }) {
  return (
    <FloatingPanel id="patio-layers" aria-label="Camada e colisões" initial={vw => ({ x: Math.max(12, vw - 312), y: 64, w: 300, h: 470 })} minW={240} minH={200} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Camada · {ELEMENT_DEFS[el.kind].label}</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div role="radiogroup" aria-label="Camada" className="grid gap-1">
        {[...LAYERS].reverse().map(l => (
          <label key={l} className={cn("flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5", el.layer === l ? "border-primary bg-primary/10 text-white" : "border-white/10 hover:border-white/30")}>
            <input type="radio" name="patio-layer" checked={el.layer === l} onChange={() => onChange({ ...el, layer: l })} className="mt-0.5 accent-[var(--primary)]" />
            <span className="grid"><span>{LAYER_LABELS[l]}</span><span className="text-[10px] text-[#93a79a]">{LAYER_HINTS[l]}</span></span>
          </label>
        ))}
      </div>
      <div className="grid gap-3 border-t border-white/10 pt-3">
        <Toggle label="Pisar (sólido)" hint="A galinha fica em cima e bate dos lados" checked={el.solid} onChange={v => onChange({ ...el, solid: v })} />
        <Toggle label="Bloqueia tiros" hint="Balas, granadas e o feixe param nele" checked={el.shots} onChange={v => onChange({ ...el, shots: v })} />
        <Toggle label="Bloqueia notas" hint="As notas dos instrumentos param nele" checked={el.notes} onChange={v => onChange({ ...el, notes: v })} />
        <Toggle label="Invisível no jogo" hint="Só aparece no modo editor" checked={el.hidden} onChange={v => onChange({ ...el, hidden: v })} />
        <label className="grid gap-1">
          <span className="flex justify-between"><span>Opacidade</span><output className="tabular-nums text-white">{Math.round(el.opacity * 100)}%</output></span>
          <input type="range" min={10} max={100} step={5} value={Math.round(el.opacity * 100)} onChange={e => onChange({ ...el, opacity: Number(e.target.value) / 100 })} onPointerUp={e => e.currentTarget.blur()} className="accent-[var(--primary)]" />
        </label>
      </div>
    </FloatingPanel>
  )
}

// the Edit panel of the elements with params: training dummy, rack, horde button, trees
function EditPanel({ el, onChange, onClose }: { el: LayoutElement; onChange: (el: LayoutElement, step?: string) => void; onClose: () => void }) {
  const set = (p: ElementParams, step?: string) => onChange({ ...el, params: { ...el.params, ...p } }, step)
  const [msg, setMsg] = useState(el.params.message ?? "")
  return (
    <FloatingPanel id="patio-edit" aria-label="Editar elemento" initial={vw => ({ x: Math.max(12, vw - 352), y: 64, w: 340, h: 380 })} minW={260} minH={200} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Editar · {ELEMENT_DEFS[el.kind].label}</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      {el.kind === "dummy" && (
        <>
          <label className="grid gap-1">
            <span>Mensagem ao ser destruído</span>
            <textarea
              value={msg}
              maxLength={280}
              rows={4}
              onChange={e => { setMsg(e.target.value); set({ message: e.target.value }, `msg:${el.id}`) }}
              placeholder="Uma dica para quem destruir este alvo"
              className="resize-y rounded-md border border-white/15 bg-[#0b110e] p-2 text-[#dfe8df] outline-none focus:border-primary"
            />
            <span className="text-right text-[10px] text-[#93a79a]">{msg.length}/280</span>
          </label>
          <label className="grid gap-1">
            <span className="flex justify-between"><span>Vida total</span><output className="tabular-nums text-white">{el.params.maxHp}</output></span>
            <input type="range" min={DUMMY_HP_RANGE.min} max={DUMMY_HP_RANGE.max} step={10} value={el.params.maxHp ?? 100} onChange={e => set({ maxHp: Number(e.target.value) }, `hp:${el.id}`)} onPointerUp={e => e.currentTarget.blur()} className="accent-[var(--primary)]" />
          </label>
        </>
      )}
      {el.kind === "rack" && (
        <label className="grid gap-1">
          <span>Item do suporte</span>
          <select value={el.params.item} onChange={e => set({ item: e.target.value as ItemId })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            <optgroup label="Armas">{WEAPON_IDS.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
            <optgroup label="Instrumentos">{INSTRUMENT_IDS.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
            <optgroup label="Habilidades especiais">{CONSUMABLE_IDS.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
          </select>
        </label>
      )}
      {el.kind === "button" && (
        <label className="grid gap-1">
          <span>Ação ao acertar</span>
          <select value={el.params.action} onChange={e => set({ action: e.target.value as (typeof HORDE_BUTTONS)[number] })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            {HORDE_BUTTONS.map(id => <option key={id} value={id}>{HORDE_BUTTON_LABELS[id]}</option>)}
          </select>
        </label>
      )}
      {(el.kind === "pine" || el.kind === "blossom") && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => set({ seed: Math.floor(Math.random() * 2 ** 31) })} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">Sortear outra árvore</button>
          <button type="button" onClick={() => set({ flip: !el.params.flip })} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">Espelhar</button>
        </div>
      )}
    </FloatingPanel>
  )
}

// ---------- the palette: drag an element onto the Pátio ----------
type Entry = { key: string; kind: ElementKind; label: string; params?: ElementParams }
const ENTRIES: { group: string; items: Entry[] }[] = [
  { group: "Plataformas", items: (["platform", "terrace", "pillar"] as ElementKind[]).map(k => ({ key: k, kind: k, label: ELEMENT_DEFS[k].label })) },
  { group: "Árvores", items: (["pine", "blossom"] as ElementKind[]).map(k => ({ key: k, kind: k, label: ELEMENT_DEFS[k].label })) },
  { group: "Alvos", items: [{ key: "dummy", kind: "dummy", label: ELEMENT_DEFS.dummy.label }] },
  { group: "Botões da horda", items: HORDE_BUTTONS.map(a => ({ key: `btn-${a}`, kind: "button" as ElementKind, label: HORDE_BUTTON_LABELS[a], params: { action: a } })) },
  { group: "Armas", items: WEAPON_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Instrumentos", items: INSTRUMENT_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Habilidades especiais", items: CONSUMABLE_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
]

function Thumb({ entry }: { entry: Entry }) {
  const d = ELEMENT_DEFS[entry.kind]
  // the item's own art (an SVG fragment in its box; the instruments are drawings placed inside it)
  const item = entry.kind === "rack" ? entry.params?.item : undefined
  if (item && ITEM_SVG[item] && ITEM_BOX[item]) {
    return <svg aria-hidden="true" viewBox={ITEM_BOX[item]!.join(" ")} className="h-8 w-12" preserveAspectRatio="xMidYMid meet" dangerouslySetInnerHTML={{ __html: ITEM_SVG[item]! }} />
  }
  if (entry.kind === "dummy") return <span className="relative block h-9 w-6"><span className="absolute inset-x-0 top-0 h-6 rounded-md bg-[#d9cfb8]" /><span className="absolute left-1/2 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#d6453d] bg-[#f4f1e8]" /><span className="absolute bottom-0 left-1/2 h-3 w-1 -translate-x-1/2 bg-[#5b4630]" /></span>
  if (entry.kind === "button") return <span className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-[#7bdff2] bg-[#123] text-[9px] text-[#7bdff2]">!</span>
  const k = Math.min(48 / d.w, 34 / d.h)
  return <span className="relative block" style={{ width: d.w * k, height: d.h * k }}><ElementArt el={{ kind: entry.kind, params: { seed: 4242 }, w: d.w, h: d.h }} /></span>
}

function Palette({ onAdd, floorBelow, onClose, undo, redo, canUndo, canRedo }: { onAdd: (el: LayoutElement) => void; floorBelow: (x: number, y: number) => number; onClose: () => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }) {
  const [drag, setDrag] = useState<{ entry: Entry; x: number; y: number; pointer: number } | null>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  const start = (entry: Entry) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDrag({ entry, x: e.clientX, y: e.clientY, pointer: e.pointerId })
  }
  const move = (e: React.PointerEvent) => { if (drag?.pointer === e.pointerId) setDrag({ ...drag, x: e.clientX, y: e.clientY }) }
  const end = (e: React.PointerEvent) => {
    if (drag?.pointer !== e.pointerId) return
    const over = document.elementsFromPoint(e.clientX, e.clientY).some(n => n.closest?.("aside, header"))
    if (!over) {
      const p = screenToWorld(e.clientX, e.clientY)
      const el = createElement(drag.entry.kind, p.x, p.y, drag.entry.params)
      // dummies and racks stand on the floor right under where they were dropped
      if (el.kind === "dummy" || el.kind === "rack") el.y = floorBelow(p.x, p.y - el.h / 2) - el.h
      onAdd(el)
    }
    setDrag(null)
  }
  const d = drag ? ELEMENT_DEFS[drag.entry.kind] : null
  return (
    <>
      <FloatingPanel id="patio-palette" aria-label="Elementos do Pátio" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(260, vw - 24), h: vw < 640 ? Math.min(300, vh * 0.38) : Math.min(560, vh - 80) })} minW={180} minH={140} className="rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <h2 className="flex-1 text-sm text-white">Modo editor</h2>
          <button type="button" className={TOOL} disabled={!canUndo} onClick={undo} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 className="h-4 w-4" /></button>
          <button type="button" className={TOOL} disabled={!canRedo} onClick={redo} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 className="h-4 w-4" /></button>
          <button type="button" className={TOOL} onClick={onClose} title="Sair do modo editor (=)" aria-label="Sair do modo editor"><X className="h-4 w-4" /></button>
        </div>
        <div ref={paletteRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <p className="py-2 text-[10px] leading-relaxed text-[#93a79a]">Arraste um elemento para o Pátio. Clique num elemento para selecionar; arraste para mover e pelos cantos para redimensionar (Shift mantém a proporção).</p>
          {ENTRIES.map(g => (
            <section key={g.group} className="mb-2">
              <h3 className="mb-1 text-[10px] uppercase tracking-widest text-[#93a79a]">{g.group}</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {g.items.map(entry => (
                  <button
                    key={entry.key}
                    type="button"
                    title={`Arraste para o Pátio: ${entry.label}`}
                    className="flex min-h-16 cursor-grab touch-none flex-col items-center justify-center gap-1 rounded-md border border-white/10 bg-[#0b110e] px-1 py-1.5 text-center text-[10px] leading-tight hover:border-[#ffd166] active:cursor-grabbing"
                    onPointerDown={start(entry)}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={() => setDrag(null)}
                  >
                    <span className="flex h-9 items-center justify-center"><Thumb entry={entry} /></span>
                    <span>{entry.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </FloatingPanel>
      {/* what is being dragged, at its real size in the world */}
      {drag && d && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[215] outline outline-2 outline-dashed outline-[#ffd166]" style={{ left: drag.x - d.w / 2, top: drag.y - d.h / 2, width: d.w, height: d.h, opacity: 0.75 }}>
          {d.entity ? <div className="absolute inset-0 flex items-center justify-center bg-[#ffd166]/15"><Thumb entry={drag.entry} /></div> : <ElementArt el={{ kind: drag.entry.kind, params: { seed: 4242 }, w: d.w, h: d.h }} />}
        </div>
      )}
    </>
  )
}
