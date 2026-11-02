"use client"

// Player chicken layer: mounts the chicken engine above everything on the screen and, on touch
// devices, the on-screen controls (stick on the left, round jump / brood / run buttons on the right).
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { ChevronsUp, Egg, Footprints, Gamepad2 } from "lucide-react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import { refreshChickenConfig } from "@/lib/chicken/config"
import { loadChickenControls, setTouchMoveStick, subscribeChickenControls, type ChickenAction, type ChickenTouchMode } from "@/lib/chicken/controls"
import { clampDelta, finishTouchLayoutEdit, getServerTouchLayout, getTouchLayout, resetTouchLayout, setTouchOffset, subscribeTouchLayout, type TouchControlId } from "@/lib/chicken/touch-layout"

// Height of the ground strip at the bottom of the screen; the footer buttons stick up above it.
export const CHICKEN_GROUND_H = 30

export function ChickenGround({ className = "", height = CHICKEN_GROUND_H }: { className?: string; height?: number }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 bottom-0 ${className}`}
      style={{ height, background: `linear-gradient(to bottom, #6b8f3a 0, #54752c 4px, #4a3522 7px, #3a2a1b ${CHICKEN_GROUND_H}px, #2a1e13 100%)`, boxShadow: "0 -1px 0 rgba(0,0,0,.35)" }}
    />
  )
}

// a touch screen (phone, tablet)
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)")
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return coarse
}

export const useTouchLayout = () => useSyncExternalStore(subscribeTouchLayout, getTouchLayout, getServerTouchLayout)

// edit mode always shows the controls, so they can be placed
export function useTouchControls(mode: ChickenTouchMode) {
  const coarse = useCoarsePointer()
  const { editing } = useTouchLayout()
  return editing || mode === "on" || (mode === "auto" && coarse)
}

// A touch control that sits at its default place plus the saved offset. In edit mode a dashed layer over it takes
// the drag (so the control itself does not react) and the offset follows the finger.
export function Movable({ id, className = "", style, children }: { id: TouchControlId; className?: string; style?: CSSProperties; children: ReactNode }) {
  const { offsets, editing } = useTouchLayout()
  const off = offsets[id]
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pid: number; sx: number; sy: number; ox: number; oy: number; rect: DOMRect } | null>(null)
  const down = (e: ReactPointerEvent) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: off?.x ?? 0, oy: off?.y ?? 0, rect: ref.current!.getBoundingClientRect() }
  }
  const move = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    const c = clampDelta(d.rect, e.clientX - d.sx, e.clientY - d.sy, window.innerWidth, window.innerHeight)
    setTouchOffset(id, { x: Math.round(d.ox + c.x), y: Math.round(d.oy + c.y) })
  }
  const up = () => { drag.current = null }
  return (
    <div ref={ref} className={className} style={{ ...style, transform: off ? `translate(${off.x}px, ${off.y}px)` : undefined }}>
      {children}
      {editing && (
        <div
          aria-label="Arrastar para mudar a posição"
          className="pointer-events-auto absolute inset-0 z-10 cursor-move rounded-[inherit] border-2 border-dashed border-[#ffd166] bg-[#ffd166]/10"
          style={{ touchAction: "none", borderRadius: 16 }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      )}
    </div>
  )
}

// top of the screen while placing the controls
function TouchLayoutBar() {
  return (
    <div data-chicken-ignore className="pointer-events-auto fixed left-1/2 z-[320] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[#ffd166]/60 bg-black/80 px-3 py-2 font-mono text-xs text-white backdrop-blur" style={{ top: 64 }}>
      <span className="hidden sm:inline">Arraste os controles</span>
      <button type="button" onClick={resetTouchLayout} className="h-8 rounded-md border border-white/25 px-3 hover:border-primary">Padrão</button>
      <button type="button" onClick={finishTouchLayoutEdit} className="h-8 rounded-md border border-primary bg-primary/25 px-5 font-bold hover:bg-primary/40">Ok</button>
    </div>
  )
}

// Footer button (touch screens): shows / hides the chicken's on-screen controls. The globe keeps its own choice
// (off at first), apart from the "Na tela (celular)" setting of the controls panel.
export function ChickenTouchToggle({ active, onToggle, className = "" }: { active: boolean; onToggle: () => void; className?: string }) {
  const coarse = useCoarsePointer()
  if (!coarse) return null
  const label = active ? "Esconder controles da galinha" : "Mostrar controles da galinha"
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onToggle}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background/80 backdrop-blur-sm transition-colors ${active ? "border-primary/60 text-primary" : "border-white/30 text-white/45"} ${className}`}
    >
      <Gamepad2 className="h-4 w-4" />
      {!active && <span aria-hidden="true" className="pointer-events-none absolute h-[1.5px] w-5 rotate-45 rounded bg-current" />}
    </button>
  )
}

// whether the on-screen controls are showing, following the saved touch setting
export function useChickenTouch() {
  const [touchMode, setTouchMode] = useState<ChickenTouchMode>("auto")
  useEffect(() => {
    setTouchMode(loadChickenControls().touch)
    return subscribeChickenControls(c => setTouchMode(c.touch))
  }, [])
  return useTouchControls(touchMode)
}

// a phone held upright: the screen is taller than wide
export function usePortrait() {
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)")
    const update = () => setPortrait(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return portrait
}

// groundHeight: how high the ground reaches from the bottom of the screen; controlsBottom: where the touch controls sit
// touch: forces the on-screen controls on or off (the globe has its own switch); left out, the saved setting decides
// dropAvoid: horizontal spans (for a window this wide) the entrance fall must not start above
export function ChickenLayer({ dropIn = true, onEngine, groundHeight = CHICKEN_GROUND_H, controlsBottom = CONTROLS_BOTTOM, touch, dropAvoid }: { dropIn?: boolean; onEngine?: (engine: ChickenEngine | null) => void; groundHeight?: number; controlsBottom?: number; touch?: boolean; dropAvoid?: (w: number) => [number, number][] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ChickenEngine | null>(null)
  const savedTouch = useChickenTouch()
  const { editing } = useTouchLayout()
  const showTouch = editing || (touch ?? savedTouch)
  const onEngineRef = useRef(onEngine)
  onEngineRef.current = onEngine
  const groundRef = useRef(groundHeight)
  groundRef.current = groundHeight
  const avoidRef = useRef(dropAvoid)
  avoidRef.current = dropAvoid

  // the central configuration: cached copy right away, the saved version as soon as it arrives
  useEffect(() => { void refreshChickenConfig() }, [])

  useEffect(() => {
    if (!hostRef.current) return
    const engine = createChickenEngine(hostRef.current, { groundHeight: groundRef.current, dropIn, dropAvoid: w => avoidRef.current?.(w) ?? [] })
    engineRef.current = engine
    onEngineRef.current?.(engine)
    return () => { onEngineRef.current?.(null); engine.destroy(); engineRef.current = null }
  }, [dropIn])

  useEffect(() => { engineRef.current?.setGroundHeight(groundHeight) }, [groundHeight])

  const set = (action: ChickenAction, on: boolean) => engineRef.current?.setVirtual(action, on)

  return (
    <>
      {showTouch && <TouchControls set={set} bottom={controlsBottom} />}
      {editing && <TouchLayoutBar />}
      <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[200]" />
    </>
  )
}

// ---------- touch controls ----------
// above the footer buttons (bottom-4, 36 px tall)
export const STICK = 112, CONTROLS_BOTTOM = 64
const KNOB = 48

function TouchControls({ set, bottom }: { set: (action: ChickenAction, on: boolean) => void; bottom: number }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const stickRef = useRef<HTMLDivElement>(null)
  const active = useRef<Partial<Record<ChickenAction, boolean>>>({})
  const pointerId = useRef<number | null>(null)

  const apply = (next: Partial<Record<ChickenAction, boolean>>) => {
    (["left", "right", "up", "crouch"] as const).forEach(a => {
      const on = !!next[a]
      if (!!active.current[a] !== on) set(a, on)
    })
    active.current = next
  }
  const move = (e: ReactPointerEvent) => {
    const r = stickRef.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const max = (STICK - KNOB) / 2 + 8, len = Math.hypot(dx, dy)
    if (len > max) { dx *= max / len; dy *= max / len }
    setKnob({ x: dx, y: dy })
    const nx = dx / max, ny = dy / max
    apply({ left: nx < -0.35, right: nx > 0.35, up: ny < -0.6, crouch: ny > 0.6 })
    // the aim follows the stick in any direction, not only the 8 the actions give
    const l = Math.hypot(nx, ny)
    setTouchMoveStick(l > 0 ? { x: nx / l, y: ny / l, len: Math.min(1, l) } : null)
  }
  const release = () => { pointerId.current = null; setKnob({ x: 0, y: 0 }); apply({}); setTouchMoveStick(null) }

  useEffect(() => () => { apply({}); setTouchMoveStick(null) }, [])

  return (
    <div data-chicken-ignore className="pointer-events-none fixed inset-0 z-[190] select-none" style={{ touchAction: "none" }}>
      <Movable id="move" className="absolute" style={{ width: STICK, height: STICK, left: 20, bottom }}>
      <div
        ref={stickRef}
        aria-label="Analógico"
        className="pointer-events-auto absolute inset-0 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-[2px]"
        style={{ touchAction: "none" }}
        onPointerDown={e => { pointerId.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
        onPointerMove={e => { if (pointerId.current === e.pointerId) move(e) }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <div
          className="absolute rounded-full border-2 border-white/50 bg-white/30"
          style={{ width: KNOB, height: KNOB, left: (STICK - KNOB) / 2 + knob.x, top: (STICK - KNOB) / 2 + knob.y }}
        />
      </div>
      </Movable>
      {/* buttons in one row, centred on the stick's vertical centre */}
      <Movable id="actions" className="absolute flex items-center gap-3" style={{ right: 20, bottom, height: STICK }}>
        <TouchButton label="Correr" action="run" set={set} size={54}><Footprints className="h-6 w-6" /></TouchButton>
        <TouchButton label="Chocar" action="down" set={set} size={54}><Egg className="h-6 w-6" /></TouchButton>
        <TouchButton label="Pular" action="jump" set={set} size={68}><ChevronsUp className="h-8 w-8" /></TouchButton>
      </Movable>
    </div>
  )
}

function TouchButton({ label, action, set, size, style, children }: { label: string; action: ChickenAction; set: (action: ChickenAction, on: boolean) => void; size: number; style?: React.CSSProperties; children: ReactNode }) {
  const [down, setDown] = useState(false)
  const press = (on: boolean) => { setDown(on); set(action, on) }
  return (
    <button
      type="button"
      aria-label={label}
      className={`pointer-events-auto relative flex shrink-0 items-center justify-center rounded-full border-2 text-white/80 backdrop-blur-[2px] transition-colors ${down ? "border-white/70 bg-white/35" : "border-white/30 bg-white/12"}`}
      style={{ width: size, height: size, touchAction: "none", ...style }}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); press(true) }}
      onPointerUp={() => press(false)}
      onPointerCancel={() => press(false)}
      onLostPointerCapture={() => { if (down) press(false) }}
      onContextMenu={e => e.preventDefault()}
    >
      {children}
    </button>
  )
}
