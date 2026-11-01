"use client"

// Parquinho: PigChicKen's creative mode, built on the Pátio. A world several screens wide with a camera
// (follow, scenes, fixed), and the aim of the items: right stick > mouse > on-screen right stick > left stick /
// arrows > facing, drawn as a reticle. Firing, hitting and throwing only flash for now; the items come next.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { loadChickenControls, readGamepadTokens, readStick, subscribeChickenControls, type ChickenAction, type ChickenControls } from "@/lib/chicken/controls"
import { createMouseOwner, resolveAim, type Aim, type AimSource, type Stick } from "@/lib/pigchicken/aim"
import { cameraBounds, cameraStep } from "@/lib/pigchicken/camera"
import type { ParquinhoSettings } from "@/lib/pigchicken/settings"
import { useTouchControls } from "@/components/chicken/chicken-layer"

// floating boxes per screen (percent of the screen), so every screen has something to climb
const SCREENS: { left: number; bottom: number; width: number; height: number }[][] = [
  [
    { left: 8, bottom: 22, width: 18, height: 5 },
    { left: 32, bottom: 38, width: 14, height: 5 },
    { left: 54, bottom: 26, width: 10, height: 22 },
    { left: 70, bottom: 48, width: 16, height: 5 },
    { left: 14, bottom: 58, width: 12, height: 5 },
  ],
  [
    { left: 6, bottom: 14, width: 12, height: 5 },
    { left: 22, bottom: 26, width: 12, height: 5 },
    { left: 38, bottom: 38, width: 12, height: 5 },
    { left: 54, bottom: 50, width: 12, height: 5 },
    { left: 76, bottom: 0, width: 6, height: 46 },
  ],
  [
    { left: 10, bottom: 0, width: 5, height: 30 },
    { left: 30, bottom: 20, width: 26, height: 5 },
    { left: 66, bottom: 0, width: 5, height: 55 },
    { left: 80, bottom: 30, width: 14, height: 5 },
  ],
  [
    { left: 8, bottom: 30, width: 10, height: 5 },
    { left: 26, bottom: 30, width: 10, height: 5 },
    { left: 44, bottom: 30, width: 10, height: 5 },
    { left: 62, bottom: 30, width: 10, height: 5 },
    { left: 35, bottom: 56, width: 30, height: 5 },
  ],
]

const SOURCE_LABEL: Record<AimSource, string> = {
  rightStick: "analógico direito", mouse: "mouse", touch: "analógico da tela", leftStick: "analógico esquerdo", keys: "setas", facing: "olhando pra frente",
}

type Flash = { kind: "fire" | "melee" | "throw" | "item" | "reload"; t: number; power?: number; label?: string }

export function ParquinhoWorld({ screens, worldRef }: { screens: number; worldRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={worldRef} className="pointer-events-none absolute inset-y-0 left-0 will-change-transform" style={{ width: `${screens * 100}vw` }}>
      {Array.from({ length: screens }, (_, s) => (
        <div key={`m${s}`} className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: `${s * 100}vw` }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/25">Cena {s + 1}</span>
        </div>
      ))}
      <div data-chicken-platforms className="absolute inset-0">
        {Array.from({ length: screens }, (_, s) => SCREENS[s % SCREENS.length].map((p, i) => (
          <div key={`${s}-${i}`} data-chicken-id={`pq${s}-${i}`} className="absolute rounded-md border border-primary/30 bg-[#16241b]" style={{ left: `${s * 100 + p.left}vw`, bottom: `calc(${p.bottom}% + 30px)`, width: `${p.width}vw`, height: `${p.height}%`, minHeight: 18 }} />
        )))}
      </div>
    </div>
  )
}

const ITEM_SLOTS = 9

// the gamepad's aim lock button still works as hold while Caps Lock is a switch
function readPadLock(controls: ChickenControls) {
  const on = readGamepadTokens(controls.analog.deadzoneL)
  return controls.pad.aimLock.some(t => t && on.has(t))
}

export function ParquinhoPlay({ engine, settings, worldRef }: { engine: ChickenEngine | null; settings: ParquinhoSettings; worldRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const touchAim = useRef<Stick | null>(null)
  const [controls, setControls] = useState<ChickenControls | null>(null)
  useEffect(() => {
    setControls(loadChickenControls())
    return subscribeChickenControls(setControls)
  }, [])
  const showTouch = useTouchControls(controls?.touch ?? "auto")

  useEffect(() => {
    if (!engine) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    let controls = loadChickenControls()
    const unsub = subscribeChickenControls(c => { controls = c })
    const owner = createMouseOwner()
    let mouse: { x: number; y: number } | null = null
    const mouseBtn = { fire: false, melee: false }
    let wheel = 0, slotPick = 0
    // Caps Lock locks the aim as a switch on every system (the Mac only reports it turning on and off)
    let capsOn = false
    const readCaps = (e: KeyboardEvent | PointerEvent) => { if (typeof e.getModifierState === "function") capsOn = e.getModifierState("CapsLock") }
    const isUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("header, aside, button, input, select, a, [data-chicken-ignore], [role='dialog']")
    const onMove = (e: PointerEvent) => {
      readCaps(e)
      if (e.pointerType !== "mouse") return
      if (mouse) owner.moved(Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y), performance.now())
      mouse = { x: e.clientX, y: e.clientY }
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || isUi(e.target)) return
      if (e.button === 0) mouseBtn.fire = true
      if (e.button === 2) mouseBtn.melee = true
    }
    const onUp = (e: PointerEvent) => {
      if (e.button === 0) mouseBtn.fire = false
      if (e.button === 2) mouseBtn.melee = false
    }
    const onMenu = (e: MouseEvent) => { if (!isUi(e.target)) e.preventDefault() }
    const onWheel = (e: WheelEvent) => { if (!isUi(e.target)) wheel += Math.sign(e.deltaY) }
    const onKey = (e: KeyboardEvent) => {
      readCaps(e)
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const m = /^Digit([1-9])$/.exec(e.code)
      if (m && !e.repeat) slotPick = Number(m[1])
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("contextmenu", onMenu)
    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", readCaps)
    engine.setGame({ gameMode: true })

    let camX = 0, last = performance.now(), raf = 0
    let prev: Partial<Record<ChickenAction | "mFire" | "mMelee", boolean>> = {}
    let throwStart = 0, item = 0
    const flashes: Flash[] = []
    let aim: Aim | null = null
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(window.innerWidth * dpr); canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    window.addEventListener("resize", fit)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const S = settingsRef.current
      const st = engine.getState()
      const viewW = st.width, worldW = viewW * S.screens

      // ---------- camera ----------
      const worldX = camX + st.x
      const next = st.held ? camX : cameraStep(camX, { mode: S.camera, worldX, viewW, worldW, dt, deadband: S.deadband, lag: S.lag })
      if (next !== camX) { engine.shift(camX - next); camX = next }
      engine.setBounds(cameraBounds(camX, { mode: S.camera, viewW, worldW }))
      if (worldRef.current) worldRef.current.style.transform = `translate3d(${-camX}px,0,0)`

      // ---------- aim ----------
      const act = engine.getActions()
      if (controls.keys.aimLock.includes("Key:CapsLock")) act.aimLock = capsOn || !!readPadLock(controls)
      const an = controls.analog
      const rightStick = readStick(1, an.deadzoneR), leftStick = readStick(0, an.deadzoneL)
      const keys = { x: (act.right ? 1 : 0) - (act.left ? 1 : 0), y: (act.crouch || act.down ? 1 : 0) - (act.up ? 1 : 0) }
      if (leftStick || keys.x || keys.y) owner.otherAim(now, S.mouseIdle)
      // her shoulder, turned with her body (on a wall she is drawn rotated)
      const lx = st.face * 14 * st.scale, ly = -112 * st.scale, ca = Math.cos(st.angle), sa = Math.sin(st.angle)
      const origin = { x: st.x + lx * ca - ly * sa, y: st.y + lx * sa + ly * ca }
      aim = resolveAim({
        rightStick, mouse: owner.owns ? mouse : null, touch: touchAim.current, leftStick, keys, origin,
        face: st.face, grounded: st.grounded, aimLock: act.aimLock, magnet: an.magnet, magnetDeg: an.magnetDeg,
      })
      engine.setGame({
        moveLock: act.aimLock,
        aimFace: aim.secondary && Math.abs(aim.dx) > 0.2 ? Math.sign(aim.dx) : null,
        backpedal: S.backpedal,
      })

      // ---------- buttons (flashes until the items exist) ----------
      const fire = act.fire || mouseBtn.fire, melee = act.melee || mouseBtn.melee
      if (fire && !prev.fire) flashes.push({ kind: "fire", t: now })
      if (melee && !prev.melee) flashes.push({ kind: "melee", t: now })
      if (act.throw && !prev.throw) throwStart = now
      if (!act.throw && prev.throw) flashes.push({ kind: "throw", t: now, power: Math.min(1, (now - throwStart) / 1000) })
      let pick = 0
      if (act.nextItem && !prev.nextItem) pick = 1
      if (act.prevItem && !prev.prevItem) pick = -1
      if (wheel) { pick = wheel > 0 ? 1 : -1; wheel = 0 }
      if (pick) { item = (item + pick + ITEM_SLOTS) % ITEM_SLOTS; flashes.push({ kind: "item", t: now, label: `item ${item + 1}` }) }
      if (slotPick) { item = slotPick - 1; slotPick = 0; flashes.push({ kind: "item", t: now, label: `item ${item + 1}` }) }
      if (act.reload && !prev.reload) flashes.push({ kind: "reload", t: now })
      prev = { ...act, fire, melee }

      // ---------- draw ----------
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      const dist = aim.target ? Math.hypot(aim.target.x - origin.x, aim.target.y - origin.y) : S.reticleDist * (aim.source === "rightStick" || aim.source === "touch" ? 0.45 + 0.55 * aim.strength : 1)
      const rx = aim.target ? aim.target.x : origin.x + aim.dx * dist, ry = aim.target ? aim.target.y : origin.y + aim.dy * dist
      while (flashes.length && now - flashes[0].t > 600) flashes.shift()
      const fireAge = flashes.filter(f => f.kind === "fire").map(f => now - f.t)[0]
      const pulse = fireAge !== undefined ? 1 + 0.6 * (1 - fireAge / 600) : 1
      ctx.save()
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(rx, ry); ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = act.aimLock ? "#ffd166" : "#ffffff"; ctx.lineWidth = 2
      const r = 10 * pulse
      ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke()
      ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => { ctx.beginPath(); ctx.moveTo(rx + ux * (r + 3), ry + uy * (r + 3)); ctx.lineTo(rx + ux * (r + 9), ry + uy * (r + 9)); ctx.stroke() })
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(rx, ry, 1.6, 0, Math.PI * 2); ctx.fill()
      // throw: a charge ring around her while held
      if (act.throw) {
        const p = Math.min(1, (now - throwStart) / 1000)
        ctx.strokeStyle = "#7bdff2"; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(origin.x, origin.y, 26 * st.scale + 8, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke()
      }
      flashes.forEach(f => {
        const k = 1 - (now - f.t) / 600
        if (f.kind === "melee") {
          ctx.strokeStyle = `rgba(255,209,102,${k})`; ctx.lineWidth = 5
          ctx.beginPath(); ctx.arc(origin.x, origin.y, 70 * st.scale + 20, aim!.angle - 0.9, aim!.angle + 0.9); ctx.stroke()
        }
        if (f.kind === "throw") {
          ctx.fillStyle = `rgba(123,223,242,${k})`
          const d = 40 + (1 - k) * (120 + 380 * (f.power ?? 0))
          ctx.beginPath(); ctx.arc(origin.x + aim!.dx * d, origin.y + aim!.dy * d, 6, 0, Math.PI * 2); ctx.fill()
        }
      })
      ctx.restore()
      if (hudRef.current) {
        const latest = flashes[flashes.length - 1]
        const word = latest ? { fire: "atirou", melee: "golpe", throw: `arremesso ${Math.round((latest.power ?? 0) * 100)}%`, item: latest.label ?? "", reload: "recarregar" }[latest.kind] : ""
        hudRef.current.textContent = `mira: ${SOURCE_LABEL[aim.source]}${act.aimLock ? " · travada" : ""} · ${S.camera === "follow" ? "câmera seguindo" : S.camera === "scenes" ? `cena ${Math.floor(worldX / viewW) + 1}` : "câmera fixa"}${word ? ` · ${word}` : ""}`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      unsub()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("contextmenu", onMenu)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", readCaps)
      window.removeEventListener("resize", fit)
      engine.setGame({ gameMode: false, moveLock: false, aimFace: null, backpedal: 1 })
      engine.setBounds(null)
      if (camX) engine.shift(camX)
      if (worldRef.current) worldRef.current.style.transform = ""
    }
  }, [engine, worldRef])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[195] h-full w-full" />
      <div ref={hudRef} className="pointer-events-none absolute bottom-10 left-3 z-[120] font-mono text-[11px] text-[#93a79a]" />
      {showTouch && engine && <TouchAimStick engine={engine} aimRef={touchAim} />}
    </>
  )
}

// ---------- on-screen right stick (twin-stick): pushing aims, pushing to the edge fires ----------
const STICK = 112, KNOB = 48, STICK_BOTTOM = 64 + 112 + 24, FIRE_AT = 0.85

function TouchAimStick({ engine, aimRef }: { engine: ChickenEngine; aimRef: React.MutableRefObject<Stick | null> }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const pid = useRef<number | null>(null)
  const firing = useRef(false)
  const setFire = (on: boolean) => { if (firing.current !== on) { firing.current = on; engine.setVirtual("fire", on) } }
  const move = (e: ReactPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const max = (STICK - KNOB) / 2 + 8, len = Math.hypot(dx, dy)
    if (len > max) { dx *= max / len; dy *= max / len }
    setKnob({ x: dx, y: dy })
    const mag = Math.min(1, len / max)
    aimRef.current = mag > 0.15 ? { x: dx / (len || 1), y: dy / (len || 1), mag } : null
    setFire(mag >= FIRE_AT)
  }
  const release = () => { pid.current = null; setKnob({ x: 0, y: 0 }); aimRef.current = null; setFire(false) }
  useEffect(() => () => { aimRef.current = null; if (firing.current) engine.setVirtual("fire", false) }, [engine, aimRef])
  const button = (label: string, action: ChickenAction) => (
    <button
      type="button"
      aria-label={label}
      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 font-mono text-[9px] uppercase text-white/80 active:bg-white/35"
      style={{ touchAction: "none" }}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engine.setVirtual(action, true) }}
      onPointerUp={() => engine.setVirtual(action, false)}
      onPointerCancel={() => engine.setVirtual(action, false)}
      onContextMenu={e => e.preventDefault()}
    >
      {label}
    </button>
  )
  return (
    <div data-chicken-ignore className="pointer-events-none fixed inset-0 z-[190] select-none" style={{ touchAction: "none" }}>
      <div className="absolute flex items-center gap-3" style={{ right: 20, bottom: STICK_BOTTOM, height: STICK }}>
        <div className="flex flex-col gap-2">
          {button("Golpe", "melee")}
          {button("Jogar", "throw")}
        </div>
        <div
          ref={ref}
          aria-label="Analógico de mira"
          className="pointer-events-auto relative rounded-full border-2 border-[#ffd166]/50 bg-white/10 backdrop-blur-[2px]"
          style={{ width: STICK, height: STICK, touchAction: "none" }}
          onPointerDown={e => { pid.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
          onPointerMove={e => { if (pid.current === e.pointerId) move(e) }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div className="absolute rounded-full border-2 border-white/40" style={{ inset: (STICK - STICK * FIRE_AT) / 2 - 4, opacity: 0.35 }} />
          <div className="absolute rounded-full border-2 border-white/50 bg-white/30" style={{ width: KNOB, height: KNOB, left: (STICK - KNOB) / 2 + knob.x, top: (STICK - KNOB) / 2 + knob.y }} />
        </div>
      </div>
    </div>
  )
}
