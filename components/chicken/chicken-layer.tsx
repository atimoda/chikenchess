"use client"

// Player chicken layer: mounts the chicken engine above everything on the screen and, on touch
// devices, the on-screen controls (stick on the left, round jump / brood / run buttons on the right).
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { ChevronsUp, Egg, Footprints, Gamepad2 } from "lucide-react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import { ChickFlock } from "./chick-flock"
import { getChickenConfig, refreshChickenConfig, subscribeChickenConfig } from "@/lib/chicken/config"
import { babyArt, defaultBabySkin, getBaby, setBaby, subscribeBaby, type BabyState } from "@/lib/chicken/baby"
import { loadChickenControls, setTouchMoveStick, subscribeChickenControls, type ChickenAction, type ChickenTouchMode } from "@/lib/chicken/controls"
import { magnetVector } from "@/lib/chicken/analog-magnet"
import { LIMIT_BORDER, LIMIT_BORDER_COLOR } from "@/lib/chicken/limits"
import { clampDelta, finishTouchLayoutEdit, getServerTouchLayout, getTouchLayout, resetTouchLayout, setTouchOffset, subscribeTouchLayout, touchOffset, type TouchControlId } from "@/lib/chicken/touch-layout"
import { stageHeight, stageTop, stageWidth } from "@/lib/stage-size"
import { useT } from "@/lib/i18n"

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

// The globe's limits: a black frame LIMIT_BORDER px thick on the screen's edges. The chicken's side walls and
// ceiling are its inner edge (lib/chicken/engine.ts); she climbs them and goes round the top corners.
export function ChickenLimits({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" data-chicken-limits className={`pointer-events-none fixed inset-0 ${className}`} style={{ border: `${LIMIT_BORDER}px solid ${LIMIT_BORDER_COLOR}` }} />
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
  const t = useT()
  const { offsets, editing } = useTouchLayout()
  const off = touchOffset(offsets, id)
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
    const r = d.rect, top0 = stageTop()
    const c = clampDelta({ left: r.left, right: r.right, top: r.top - top0, bottom: r.bottom - top0 }, e.clientX - d.sx, e.clientY - d.sy, stageWidth(), stageHeight())
    setTouchOffset(id, { x: Math.round(d.ox + c.x), y: Math.round(d.oy + c.y) })
  }
  const up = () => { drag.current = null }
  return (
    <div ref={ref} data-touch-control={id} className={className} style={{ ...style, transform: off ? `translate(${off.x}px, ${off.y}px)` : undefined }}>
      {children}
      {editing && (
        <div
          aria-label={t("Arrastar para mudar a posição")}
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
  const t = useT()
  return (
    <div data-chicken-ignore className="pointer-events-auto fixed left-1/2 z-[320] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[#ffd166]/60 bg-black/80 px-3 py-2 font-mono text-xs text-white backdrop-blur" style={{ top: 64 }}>
      <span className="hidden sm:inline">{t("Arraste os controles")}</span>
      <button type="button" onClick={resetTouchLayout} className="h-8 rounded-md border border-white/25 px-3 hover:border-primary">{t("Padrão")}</button>
      <button type="button" onClick={finishTouchLayoutEdit} className="h-8 rounded-md border border-primary bg-primary/25 px-5 font-bold hover:bg-primary/40">Ok</button>
    </div>
  )
}

// Footer button (touch screens): shows / hides the chicken's on-screen controls. The globe keeps its own choice
// (off at first), apart from the "Na tela (celular)" setting of the controls panel.
export function ChickenTouchToggle({ active, onToggle, className = "" }: { active: boolean; onToggle: () => void; className?: string }) {
  const t = useT()
  const coarse = useCoarsePointer()
  if (!coarse) return null
  const label = active ? t("Esconder controles da galinha") : t("Mostrar controles da galinha")
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
// fixedScale: she keeps one size on every screen (a world in fixed units, such as the Pátio's) instead of shrinking on small ones
// chickEngines: where the chicks that follow her are kept (the Pátio moves them with its camera); chickKey: a new value
// brings a new flock (another Pátio), null holds it back (see ChickFlock)
// controlsFront: the touch controls stand in front of what the world draws over the characters (the Pátio's front
// elements and the Grade de blocos' faces) instead of behind her
export function ChickenLayer({ dropIn = true, onEngine, groundHeight = CHICKEN_GROUND_H, controlsBottom = CONTROLS_BOTTOM, touch, dropAvoid, fixedScale = false, chickEngines, chickKey, controlsFront = false }: { controlsFront?: boolean; dropIn?: boolean; onEngine?: (engine: ChickenEngine | null) => void; groundHeight?: number; controlsBottom?: number; touch?: boolean; dropAvoid?: (w: number) => [number, number][]; fixedScale?: boolean; chickEngines?: React.RefObject<Map<string, ChickenEngine>>; chickKey?: string | null }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ChickenEngine | null>(null)
  const [mother, setMother] = useState<ChickenEngine | null>(null)
  const ownChicks = useRef(new Map<string, ChickenEngine>())
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
    const engine = createChickenEngine(hostRef.current, { groundHeight: groundRef.current, dropIn, fixedScale, dropAvoid: w => avoidRef.current?.(w) ?? [] })
    engineRef.current = engine
    onEngineRef.current?.(engine)
    setMother(engine)
    return () => { onEngineRef.current?.(null); setMother(null); engine.destroy(); engineRef.current = null }
  }, [dropIn, fixedScale])

  useEffect(() => { engineRef.current?.setGroundHeight(groundHeight) }, [groundHeight])

  // the Filhote (lib/chicken/baby.ts): at zero health she becomes the baby of her class, and stays one (here, on the
  // globe and in any other Pátio) until her music bar is full
  useEffect(() => {
    const engine = mother
    if (!engine) return
    const apply = (b: BabyState) => {
      if (b.on) { engine.setSpecies("chick"); engine.setArt(babyArt(getChickenConfig().look, b.skin)); engine.setMeter(b.bar) }
      else { engine.setSpecies(undefined); engine.setArt(null); engine.setMeter(null) }
    }
    apply(getBaby())
    // (a Filhote that is not immortal and falls again keeps its skin, and its music bar starts over)
    engine.setOnDown(() => setBaby(getBaby().on ? { bar: 0 } : { on: true, skin: defaultBabySkin(getChickenConfig().look), bar: 0 }))
    const offBaby = subscribeBaby(apply)
    const offLook = subscribeChickenConfig(() => { if (getBaby().on) apply(getBaby()) })
    return () => { offBaby(); offLook(); engine.setOnDown(null) }
  }, [mother])

  const set = (action: ChickenAction, on: boolean) => engineRef.current?.setVirtual(action, on)

  return (
    <>
      {showTouch && <TouchControls set={set} bottom={controlsBottom} front={controlsFront} />}
      {editing && <TouchLayoutBar />}
      <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[200]" />
      <ChickFlock lead={mother} groundHeight={groundHeight} engines={chickEngines ?? ownChicks} fixedScale={fixedScale} spawnKey={chickKey} />
    </>
  )
}

// ---------- touch controls ----------
// above the footer buttons (bottom-4, 36 px tall)
export const STICK = 112, CONTROLS_BOTTOM = 64
const KNOB = 48

// the round buttons on the right; they may overlap (placed so in the layout editor), so one finger can hold two
type PadAction = "run" | "down" | "jump"
const PAD_ACTIONS: readonly PadAction[] = ["run", "down", "jump"]
// one finger on the buttons: the ones it landed on stay held until it lifts; dragged, it also holds the ones it is
// over. A finger that landed on Correr also drives the movement stick (drag = push the stick)
type PadTouch = { origin: Set<PadAction>; over: Set<PadAction>; stick: boolean; sx: number; sy: number }

function TouchControls({ set, bottom, front }: { set: (action: ChickenAction, on: boolean) => void; bottom: number; front: boolean }) {
  const t = useT()
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const stickRef = useRef<HTMLDivElement>(null)
  const active = useRef<Partial<Record<ChickenAction, boolean>>>({})
  const pointerId = useRef<number | null>(null)
  // who moves the stick now: its own finger, or the finger dragging from Correr (its pointer id)
  const stickBy = useRef<"stick" | number | null>(null)
  const movementMagnet = useRef(loadChickenControls().analog.magnetDeg)
  useEffect(() => subscribeChickenControls(c => { movementMagnet.current = c.analog.magnetDeg }), [])
  const buttons = useRef<Partial<Record<PadAction, HTMLButtonElement | null>>>({})
  const touches = useRef(new Map<number, PadTouch>())
  const held = useRef(new Set<PadAction>())
  const [shown, setShown] = useState<ReadonlySet<PadAction>>(() => new Set())

  const { editing } = useTouchLayout()

  const apply = (next: Partial<Record<ChickenAction, boolean>>) => {
    (["left", "right", "up", "crouch"] as const).forEach(a => {
      const on = !!next[a]
      if (!!active.current[a] !== on) set(a, on)
    })
    active.current = next
  }
  // the stick pushed by (dx, dy) px from its centre
  const drive = (dx: number, dy: number) => {
    const max = (STICK - KNOB) / 2 + 8, len = Math.hypot(dx, dy)
    if (len > max) { dx *= max / len; dy *= max / len }
    setKnob({ x: dx, y: dy })
    const nx = dx / max, ny = dy / max
    const motion = magnetVector({ x: nx, y: ny }, movementMagnet.current)
    apply({ left: motion.x < -0.35, right: motion.x > 0.35, up: motion.y < -0.6, crouch: motion.y > 0.6 })
    // the aim follows the stick in any direction, not only the 8 the actions give
    const l = Math.hypot(nx, ny)
    setTouchMoveStick(l > 0 ? { x: nx / l, y: ny / l, len: Math.min(1, l) } : null)
  }
  const move = (e: ReactPointerEvent) => {
    const r = stickRef.current!.getBoundingClientRect()
    drive(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
  }
  const centre = () => { stickBy.current = null; setKnob({ x: 0, y: 0 }); apply({}); setTouchMoveStick(null) }
  const release = () => { pointerId.current = null; if (stickBy.current === "stick") centre() }

  // the buttons under a point (round: inside the circle each one draws)
  const hits = (x: number, y: number) => {
    const out = new Set<PadAction>()
    for (const a of PAD_ACTIONS) {
      const r = buttons.current[a]?.getBoundingClientRect()
      if (r && Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= r.width / 2) out.add(a)
    }
    return out
  }
  // hold exactly the buttons some finger asks for
  const sync = () => {
    const want = new Set<PadAction>()
    touches.current.forEach(t => { t.origin.forEach(a => want.add(a)); t.over.forEach(a => want.add(a)) })
    for (const a of PAD_ACTIONS) if (want.has(a) !== held.current.has(a)) set(a, want.has(a))
    held.current = want
    setShown(want)
  }
  const padDown = (action: PadAction) => (e: ReactPointerEvent) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const origin = hits(e.clientX, e.clientY)
    if (!origin.size) origin.add(action)
    // a finger that starts on Correr or Pular (not one that slides onto them) drags the movement stick too
    const stick = (origin.has("run") || origin.has("jump")) && stickBy.current !== "stick"
    if (stick) stickBy.current = e.pointerId
    touches.current.set(e.pointerId, { origin, over: new Set(), stick, sx: e.clientX, sy: e.clientY })
    sync()
  }
  const padMove = (e: ReactPointerEvent) => {
    const t = touches.current.get(e.pointerId)
    if (!t) return
    if (t.stick && stickBy.current === e.pointerId) drive(e.clientX - t.sx, e.clientY - t.sy)
    const over = hits(e.clientX, e.clientY)
    t.origin.forEach(a => over.delete(a))
    if (over.size !== t.over.size || [...over].some(a => !t.over.has(a))) { t.over = over; sync() }
  }
  const padUp = (e: ReactPointerEvent) => {
    if (!touches.current.delete(e.pointerId)) return
    if (stickBy.current === e.pointerId) centre()
    sync()
  }
  const padReset = () => {
    touches.current.clear()
    if (typeof stickBy.current === "number") centre()
    sync()
  }

  useEffect(() => { if (editing) { padReset(); set("run", false); set("down", false); set("jump", false); pointerId.current = null; centre() } }, [editing])
  useEffect(() => () => { apply({}); setTouchMoveStick(null); PAD_ACTIONS.forEach(a => set(a, false)) }, [])

  const pad = (action: PadAction, label: string, size: number, icon: ReactNode) => (
    <Movable id={action} className="relative">
      <TouchButton
        label={label}
        size={size}
        down={shown.has(action)}
        buttonRef={el => { buttons.current[action] = el }}
        onPointerDown={padDown(action)}
        onPointerMove={padMove}
        onPointerUp={padUp}
        onPointerCancel={padUp}
        onLostPointerCapture={padUp}
      >
        {icon}
      </TouchButton>
    </Movable>
  )

  return (
    <div data-chicken-ignore className={`pointer-events-none fixed inset-0 select-none ${front ? "z-[206]" : "z-[190]"}`} style={{ touchAction: "none" }}>
      <Movable id="move" className="absolute" style={{ width: STICK, height: STICK, left: 20, bottom }}>
      <div
        ref={stickRef}
        aria-label={t("Analógico")}
        className="pointer-events-auto absolute inset-0 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-[2px]"
        style={{ touchAction: "none" }}
        onPointerDown={e => { pointerId.current = e.pointerId; stickBy.current = "stick"; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
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
      <div className="absolute flex items-center gap-3" style={{ right: 20, bottom, height: STICK }}>
        {pad("run", t("Correr"), 54, <Footprints className="h-6 w-6" />)}
        {pad("down", t("Chocar"), 54, <Egg className="h-6 w-6" />)}
        {pad("jump", t("Pular"), 68, <ChevronsUp className="h-8 w-8" />)}
      </div>
    </div>
  )
}

type PadHandler = (e: ReactPointerEvent<HTMLButtonElement>) => void
function TouchButton({ label, size, down, buttonRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, children }: { label: string; size: number; down: boolean; buttonRef: (el: HTMLButtonElement | null) => void; onPointerDown: PadHandler; onPointerMove: PadHandler; onPointerUp: PadHandler; onPointerCancel: PadHandler; onLostPointerCapture: PadHandler; children: ReactNode }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-pressed={down}
      className={`pointer-events-auto relative flex shrink-0 items-center justify-center rounded-full border-2 text-white/80 backdrop-blur-[2px] transition-colors ${down ? "border-white/70 bg-white/35" : "border-white/30 bg-white/12"}`}
      style={{ width: size, height: size, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onContextMenu={e => e.preventDefault()}
    >
      {children}
    </button>
  )
}
