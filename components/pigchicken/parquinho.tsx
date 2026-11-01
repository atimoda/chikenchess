"use client"

// Parquinho: PigChicKen's creative mode, built on the Pátio. A world several screens wide with a camera
// (follow, scenes, fixed), and the aim of the items: right stick > mouse > on-screen right stick > left stick /
// arrows > facing, drawn as a reticle. Firing, hitting and throwing only flash for now; the items come next.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { loadChickenControls, readStick, subscribeChickenControls, type ChickenAction, type ChickenControls } from "@/lib/chicken/controls"
import { createMouseOwner, resolveAim, type Aim, type AimSource, type Stick } from "@/lib/pigchicken/aim"
import { cameraBounds, cameraStep } from "@/lib/pigchicken/camera"
import { createCombat, SLOTS, type Box, type Combat } from "@/lib/pigchicken/combat"
import { loadItems, subscribeItems, type ItemId } from "@/lib/pigchicken/items"
import { ITEM_SVG } from "@/lib/pigchicken/art"
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
    const isUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("header, aside, button, input, select, a, [data-chicken-ignore], [role='dialog']")
    const onMove = (e: PointerEvent) => {
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
    engine.setGame({ gameMode: true })

    let camX = 0, last = performance.now(), raf = 0
    let prev: Partial<Record<ChickenAction, boolean>> = {}
    let aim: Aim | null = null
    const combat = createCombat()
    combat.setItems(loadItems())
    const unsubItems = subscribeItems(next => combat.setItems(next))
    // creative mode: a rack that keeps a pistol to pick up, and target dummies in the first two scenes
    let placed = false
    const place = (viewW: number, groundY: number) => {
      combat.addRack(viewW * 0.22, "pistol")
      combat.addRack(viewW * 1.12, "pistol")
      ;[0.5, 0.9, 1.45, 1.8].forEach(f => combat.addTarget(viewW * f, groundY))
      placed = true
    }
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
      if (!placed) place(viewW, st.groundY)

      // ---------- camera ----------
      const worldX = camX + st.x
      const next = st.held ? camX : cameraStep(camX, { mode: S.camera, worldX, viewW, worldW, dt, deadband: S.deadband, lag: S.lag })
      if (next !== camX) { engine.shift(camX - next); camX = next }
      engine.setBounds(cameraBounds(camX, { mode: S.camera, viewW, worldW }))
      if (worldRef.current) worldRef.current.style.transform = `translate3d(${-camX}px,0,0)`

      // ---------- aim ----------
      const act = engine.getActions()
      const an = controls.analog
      const rightStick = readStick(1, an.deadzoneR), leftStick = readStick(0, an.deadzoneL)
      const keys = { x: (act.right ? 1 : 0) - (act.left ? 1 : 0), y: (act.crouch || act.down ? 1 : 0) - (act.up ? 1 : 0) }
      if (leftStick || keys.x || keys.y) owner.otherAim(now, S.mouseIdle)
      // her shoulder as drawn (it turns with her body on walls)
      const origin = st.shoulder
      aim = resolveAim({
        rightStick, mouse: owner.owns ? mouse : null, touch: touchAim.current, leftStick, keys, origin,
        face: st.face, grounded: st.grounded, aimLock: act.aimLock, magnet: an.magnet, magnetDeg: an.magnetDeg,
      })
      const d = combat.def()
      engine.setGame({
        moveLock: act.aimLock,
        aimFace: aim.secondary && Math.abs(aim.dx) > 0.2 ? Math.sign(aim.dx) : null,
        backpedal: S.backpedal,
        speedMult: d.weight,
      })

      // ---------- combat (world coordinates) ----------
      const fire = act.fire || mouseBtn.fire, melee = act.melee || mouseBtn.melee
      let pick = 0
      if (act.nextItem && !prev.nextItem) pick = 1
      if (act.prevItem && !prev.prevItem) pick = -1
      if (wheel) { pick = wheel > 0 ? 1 : -1; wheel = 0 }
      const input = {
        fire, firePressed: fire && !prev.fire, melee: melee && !prev.melee,
        throwHeld: act.throw, throwReleased: !act.throw && !!prev.throw,
        reload: act.reload && !prev.reload, pick, slot: slotPick,
      }
      slotPick = 0
      prev = { ...act, fire, melee }
      const boxes: Box[] = []
      document.querySelectorAll("[data-chicken-platforms] > *").forEach(e => {
        const r = e.getBoundingClientRect()
        boxes.push({ l: r.left + camX, t: r.top, r: r.right + camX, b: Math.min(r.bottom, st.groundY) })
      })
      const body = { x: st.x + camX, y: st.y, face: st.face, scale: st.scale, grounded: st.grounded, state: st.state, vx: st.vx }
      const worldOrigin = { x: origin.x + camX, y: origin.y }
      combat.step(dt, body, worldOrigin, aim.angle, input, boxes, st.groundY, (vx, vy) => engine.impulse(vx, vy))

      // ---------- draw ----------
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      drawWorld(ctx, combat, camX)
      const ang = combat.aimAngle, adx = Math.cos(ang), ady = Math.sin(ang)
      drawSwing(ctx, combat, origin)
      // the item itself is drawn inside her rig, in front of her body and behind the wing
      const h = combat.inventory[combat.current], sw = combat.swing
      const art = h ? ITEM_SVG[h.item] : undefined
      engine.setHeld(art ? { svg: art, angle: sw && !sw.wing ? sw.angle - sw.arc / 2 + sw.arc * Math.min(1, sw.t / 0.2) : ang, kick: combat.kick } : null)
      const dist = aim.target ? Math.hypot(aim.target.x - origin.x, aim.target.y - origin.y) : S.reticleDist * (aim.source === "rightStick" || aim.source === "touch" ? 0.45 + 0.55 * aim.strength : 1)
      const rx = d.turnRate > 0 || !aim.target ? origin.x + adx * dist : aim.target.x, ry = d.turnRate > 0 || !aim.target ? origin.y + ady * dist : aim.target.y
      drawReticle(ctx, combat, origin, rx, ry, dist, combat.spread(body), act.aimLock, st.scale)
      drawInventory(ctx, combat)
      if (act.aimLock) {
        // aim lock only while held: show it right above her
        ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"
        const label = "MIRA TRAVADA"
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(st.x - 110, origin.y - 120 * st.scale - 34, 220, 18)
        ctx.fillStyle = "#ffd166"; ctx.fillText(label, st.x, origin.y - 120 * st.scale - 21)
      }
      if (hudRef.current) {
        const h = combat.inventory[combat.current]
        const item = h ? `${d.name}${d.mag > 0 ? ` ${h.ammo}/${d.mag}` : ""}${d.durability > 0 ? ` · ${h.durability} golpes` : ""}${combat.reloading ? " · recarregando" : ""}` : "mãos vazias (asa)"
        hudRef.current.textContent = `${item} · mira: ${SOURCE_LABEL[aim.source]}${act.aimLock ? " (travada)" : ""} · ${S.camera === "follow" ? "câmera seguindo" : S.camera === "scenes" ? `cena ${Math.floor(worldX / viewW) + 1}` : "câmera fixa"}`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      unsub()
      unsubItems()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("contextmenu", onMenu)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", fit)
      engine.setGame({ gameMode: false, moveLock: false, aimFace: null, backpedal: 1, speedMult: 1 })
      engine.setHeld(null)
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

// ---------- drawing (canvas, screen pixels) ----------
type Ctx = CanvasRenderingContext2D

// flat item art, pointing right with the grip at (0, 0)
function drawItemShape(ctx: Ctx, item: ItemId, s: number) {
  ctx.save()
  ctx.scale(s, s)
  if (item === "pistol") {
    ctx.fillStyle = "#2b2f38"
    ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(11, -1); ctx.lineTo(9, 12); ctx.lineTo(1, 12); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = "#2b2f38"; ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.quadraticCurveTo(16, 1, 15, 6); ctx.lineTo(11, 6); ctx.stroke()
    ctx.fillStyle = "#566072"; ctx.fillRect(-2, -8, 32, 8)
    ctx.fillStyle = "#7d8899"; ctx.fillRect(-2, -8, 32, 2.5)
    ctx.fillStyle = "#1c1f25"; ctx.fillRect(28, -6.5, 4, 5)
  }
  ctx.restore()
}

function drawSwing(ctx: Ctx, combat: Combat, origin: { x: number; y: number }) {
  const sw = combat.swing
  if (!sw) return
  // the swing: a fan in front of her
  const k = 1 - sw.t / 0.2
  ctx.save()
  ctx.translate(origin.x, origin.y)
  ctx.fillStyle = sw.wing ? `rgba(255,236,179,${0.35 * k})` : `rgba(255,209,102,${0.4 * k})`
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, sw.range, sw.angle - sw.arc / 2, sw.angle + sw.arc / 2); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, sw.range, sw.angle - sw.arc / 2, sw.angle - sw.arc / 2 + sw.arc * (sw.t / 0.2)); ctx.stroke()
  ctx.restore()
}

function drawWorld(ctx: Ctx, combat: Combat, camX: number) {
  const X = (x: number) => x - camX
  const t = performance.now() / 1000
  const groundY = combat.targets[0]?.y ?? window.innerHeight - 30
  combat.racks.forEach(r => {
    const x = X(r.x)
    ctx.fillStyle = "#5b4630"; ctx.fillRect(x - 34, groundY - 52, 6, 52); ctx.fillRect(x + 28, groundY - 52, 6, 52)
    ctx.fillStyle = "#7a5f40"; ctx.fillRect(x - 38, groundY - 56, 76, 7)
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText("ARMAS", x, groundY - 62)
  })
  combat.pickups.forEach(p => {
    const x = X(p.x), y = p.y - 14 - Math.sin(t * 3 + p.id) * 3
    ctx.fillStyle = "rgba(123,223,242,0.18)"; ctx.beginPath(); ctx.ellipse(x, p.y - 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.translate(x - 14, y); drawItemShape(ctx, p.owned.item, 1.2); ctx.restore()
  })
  combat.thrown.forEach(o => {
    ctx.save(); ctx.translate(X(o.x), o.y); ctx.rotate(o.angle); ctx.translate(-14, 0); drawItemShape(ctx, o.owned.item, 1.2); ctx.restore()
  })
  combat.targets.forEach(g => {
    const x = X(g.x)
    ctx.save()
    ctx.translate(x, g.y)
    if (g.deadT > 0) { ctx.globalAlpha = Math.min(1, g.deadT); ctx.rotate(Math.sign(g.wobble || 1) * Math.PI / 2 * Math.min(1, (2.5 - g.deadT) * 4)) }
    else ctx.rotate(g.wobble)
    ctx.fillStyle = "#5b4630"; ctx.fillRect(-3, -g.h * 0.35, 6, g.h * 0.35)
    ctx.fillStyle = g.flash > 0 ? "#ffffff" : "#d9cfb8"
    ctx.beginPath(); ctx.roundRect(-g.w / 2, -g.h, g.w, g.h * 0.68, 14); ctx.fill()
    ;[17, 11, 5].forEach((r, i) => { ctx.fillStyle = g.flash > 0 ? "#ffffff" : i % 2 ? "#f4f1e8" : "#d6453d"; ctx.beginPath(); ctx.arc(0, -g.h * 0.68, r, 0, Math.PI * 2); ctx.fill() })
    ctx.restore()
    if (g.deadT <= 0 && g.hp < g.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 24, g.y - g.h - 14, 48, 5)
      ctx.fillStyle = g.hp > 50 ? "#7bd88f" : g.hp > 25 ? "#ffd166" : "#ff6b5b"; ctx.fillRect(x - 24, g.y - g.h - 14, 48 * Math.max(0, g.hp / g.maxHp), 5)
    }
  })
  combat.bullets.forEach(b => {
    const len = Math.hypot(b.vx, b.vy) || 1
    ctx.strokeStyle = "rgba(255,230,140,0.9)"; ctx.lineWidth = b.size; ctx.lineCap = "round"
    ctx.beginPath(); ctx.moveTo(X(b.x) - (b.vx / len) * 14, b.y - (b.vy / len) * 14); ctx.lineTo(X(b.x), b.y); ctx.stroke()
  })
  combat.sparks.forEach(s => { ctx.globalAlpha = Math.max(0, s.life / s.max); ctx.fillStyle = s.color; ctx.fillRect(X(s.x) - s.size / 2, s.y - s.size / 2, s.size, s.size) })
  ctx.globalAlpha = 1
  ctx.font = "bold 13px ui-monospace, monospace"; ctx.textAlign = "center"
  combat.texts.forEach(tx => { ctx.globalAlpha = Math.min(1, tx.life * 2); ctx.fillStyle = "#000"; ctx.fillText(tx.text, X(tx.x) + 1, tx.y + 1); ctx.fillStyle = tx.color; ctx.fillText(tx.text, X(tx.x), tx.y) })
  ctx.globalAlpha = 1
}

function drawReticle(ctx: Ctx, combat: Combat, origin: { x: number; y: number }, rx: number, ry: number, dist: number, spreadDeg: number, locked: boolean, scale: number) {
  const d = combat.def(), armed = !!combat.inventory[combat.current] && d.mag > 0
  ctx.save()
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
  ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(rx, ry); ctx.stroke()
  ctx.setLineDash([])
  const color = combat.reloading ? "#8a8f98" : locked ? "#ffd166" : "#ffffff"
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2
  if (armed) {
    // pistol: a dot and four ticks opening with the spread
    const gap = Math.max(5, Math.tan((spreadDeg / 2) * Math.PI / 180) * dist)
    ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => { ctx.beginPath(); ctx.moveTo(rx + ux * gap, ry + uy * gap); ctx.lineTo(rx + ux * (gap + 8), ry + uy * (gap + 8)); ctx.stroke() })
    ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.beginPath(); ctx.arc(rx, ry, 8, 0, Math.PI * 2); ctx.stroke()
  }
  if (combat.reloading) {
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(rx, ry, 18, -Math.PI / 2, -Math.PI / 2 + combat.reloading * Math.PI * 2); ctx.stroke()
  }
  if (combat.throwCharge > 0 && combat.inventory[combat.current]) {
    ctx.strokeStyle = "#7bdff2"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(origin.x, origin.y, 26 * scale + 8, -Math.PI / 2, -Math.PI / 2 + combat.throwCharge * Math.PI * 2); ctx.stroke()
  }
  ctx.restore()
}

function drawInventory(ctx: Ctx, combat: Combat) {
  const size = 30, gap = 4, w = SLOTS * size + (SLOTS - 1) * gap
  const x0 = (window.innerWidth - w) / 2, y = 100
  ctx.save()
  ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "left"
  for (let i = 0; i < SLOTS; i++) {
    const x = x0 + i * (size + gap), o = combat.inventory[i], on = i === combat.current
    ctx.fillStyle = on ? "rgba(255,209,102,0.22)" : "rgba(0,0,0,0.35)"; ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = on ? "#ffd166" : "rgba(255,255,255,0.18)"; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
    if (o) { ctx.save(); ctx.translate(x + 7, y + 14); drawItemShape(ctx, o.item, 0.55); ctx.restore() }
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillText(String(i + 1), x + 3, y + 10)
  }
  ctx.restore()
}
