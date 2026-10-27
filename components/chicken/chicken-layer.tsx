"use client"

// Player chicken layer: mounts the chicken engine above everything on the screen and, on touch
// devices, the on-screen controls (stick on the left, round jump / brood / run buttons on the right).
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { ChevronsUp, Egg, Footprints } from "lucide-react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import { loadChickenControls, subscribeChickenControls, type ChickenAction, type ChickenTouchMode } from "@/lib/chicken/controls"

// Height of the ground strip at the bottom of the screen; the footer buttons stick up above it.
export const CHICKEN_GROUND_H = 30

export function ChickenGround({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 bottom-0 ${className}`}
      style={{ height: CHICKEN_GROUND_H, background: "linear-gradient(to bottom, #6b8f3a 0, #54752c 4px, #4a3522 7px, #3a2a1b 100%)", boxShadow: "0 -1px 0 rgba(0,0,0,.35)" }}
    />
  )
}

function useTouchControls(mode: ChickenTouchMode) {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)")
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return mode === "on" || (mode === "auto" && coarse)
}

export function ChickenLayer({ dropIn = true }: { dropIn?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<ChickenEngine | null>(null)
  const [touchMode, setTouchMode] = useState<ChickenTouchMode>("auto")
  const showTouch = useTouchControls(touchMode)

  useEffect(() => {
    setTouchMode(loadChickenControls().touch)
    return subscribeChickenControls(c => setTouchMode(c.touch))
  }, [])

  useEffect(() => {
    if (!hostRef.current) return
    const engine = createChickenEngine(hostRef.current, { groundHeight: CHICKEN_GROUND_H, dropIn })
    engineRef.current = engine
    return () => { engine.destroy(); engineRef.current = null }
  }, [dropIn])

  const set = (action: ChickenAction, on: boolean) => engineRef.current?.setVirtual(action, on)

  return (
    <>
      {showTouch && <TouchControls set={set} />}
      <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[200]" />
    </>
  )
}

// ---------- touch controls ----------
// above the footer buttons (bottom-4, 36 px tall)
const STICK = 112, KNOB = 48, CONTROLS_BOTTOM = 64

function TouchControls({ set }: { set: (action: ChickenAction, on: boolean) => void }) {
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
  }
  const release = () => { pointerId.current = null; setKnob({ x: 0, y: 0 }); apply({}) }

  useEffect(() => () => apply({}), [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[190] select-none" style={{ touchAction: "none" }}>
      <div
        ref={stickRef}
        aria-label="Analógico"
        className="pointer-events-auto absolute rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-[2px]"
        style={{ width: STICK, height: STICK, left: 20, bottom: CONTROLS_BOTTOM, touchAction: "none" }}
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
      {/* buttons in one row, centred on the stick's vertical centre */}
      <div className="absolute flex items-center gap-3" style={{ right: 20, bottom: CONTROLS_BOTTOM, height: STICK }}>
        <TouchButton label="Correr" action="run" set={set} size={54}><Footprints className="h-6 w-6" /></TouchButton>
        <TouchButton label="Chocar" action="down" set={set} size={54}><Egg className="h-6 w-6" /></TouchButton>
        <TouchButton label="Pular" action="jump" set={set} size={68}><ChevronsUp className="h-8 w-8" /></TouchButton>
      </div>
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
