"use client"

// Electric portal on the globe's ground: a ring of blue lightning standing in the right corner of the
// ground strip, half transparent, rising behind the footer buttons. While the player chicken is touching it
// (walked, jumped, flew or was dropped into it), an "Enter playground?" button floats above the ring;
// clicking or tapping it makes the portal flare, play a soft sound and the game goes to the Pátio (/patio).
// The destination portal spawns her with an inverse shrink/fade and waits for a full exit before re-arming.
// The Pátio has its own portal, standing
// near the start of its world, that leads back to the globe (the same ring, placed in world units: `world`).
// On either, pressing run or grab (Shift / E, the gamepad's X) while the button shows confirms it too, and
// arriving running (run held while she moves) goes straight in without stopping to confirm.
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { CHICKEN_GROUND_H } from "./chicken-layer"
import { isLiteDevice } from "@/lib/performance"
import { loadEntryMode, saveEntryMode, type LobbyMode } from "@/lib/chicken/lobby"
import { mixGain } from "@/lib/pigchicken/mixer"
import { markPortalArrival, takePortalArrival, portalGate, PORTAL_TRANSITION_MS } from "@/lib/chicken/portal"

const PAD = 34 // room around the ring for the glow, arcs and sparks
const OPACITY = 0.5 // the ring is half transparent
const ENTER_MS = PORTAL_TRANSITION_MS // from the touch to the navigation

type Strand = { pts: { a: number; r: number }[]; w: number; alpha: number }
type Spark = { a: number; r: number; vr: number; va: number; life: number; max: number; size: number }
type Arc = { pts: { x: number; y: number }[]; life: number }

// ---------- sound ----------
let ac: AudioContext | null = null
function audio() {
  if (typeof window === "undefined") return null
  if (!ac) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ac = new Ctor()
  }
  if (ac.state === "suspended") void ac.resume()
  return ac
}

function noiseBuffer(a: AudioContext, seconds: number) {
  const b = a.createBuffer(1, Math.round(a.sampleRate * seconds), a.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

// a soft, quiet sound: a gentle airy swell with a faint sparkle and a soft chime (no harsh zap)
export function playPortalSound(kind: "enter" | "arrive") {
  const a = audio()
  if (!a) return
  const t = a.currentTime + 0.01
  const out = a.createGain(); out.gain.value = 0.16 * mixGain("effects"); out.connect(a.destination)
  const env = (g: GainNode, at: number, peak: number, attack: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(peak, at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }
  const noise = noiseBuffer(a, 1.6)

  // airy whoosh: low-passed noise that swells and fades (rising into the portal, opening on arrival)
  {
    const src = a.createBufferSource(); src.buffer = noise
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 0.7
    const [from, to] = kind === "enter" ? [400, 2200] : [2200, 500]
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + 0.7)
    const g = a.createGain(); env(g, t, 0.35, 0.25, 0.6)
    src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + 1.2)
  }
  // faint sparkle: a few tiny, soft ticks
  for (let i = 0; i < 4; i++) {
    const at = t + 0.1 + Math.random() * 0.5
    const src = a.createBufferSource(); src.buffer = noise
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3500 + Math.random() * 2500; f.Q.value = 6
    const g = a.createGain(); env(g, at, 0.08, 0.004, 0.06)
    src.connect(f); f.connect(g); g.connect(out); src.start(at, Math.random() * 0.5, 0.1)
  }
  // soft chime: sines with a slow attack
  const base = kind === "enter" ? 523.25 : 659.25
  ;[1, 1.5, 2].forEach((m, i) => {
    const o = a.createOscillator(); o.type = "sine"; o.frequency.value = base * m
    const g = a.createGain(); env(g, t + 0.15 + i * 0.06, 0.1 / (i + 1), 0.12, 1.1)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.8)
  })
  window.setTimeout(() => out.disconnect(), 2200)
}

// ---------- drawing ----------
function makeStrands(n: number, r: number, amp: number, points = 64): Strand[] {
  return Array.from({ length: n }, (_, k) => {
    const count = points + Math.floor(Math.random() * (points * 3 / 8))
    // the first strand runs on the ring, the others drift around it like loose wisps
    const off = k === 0 ? 0 : (Math.random() - 0.5) * amp * 2.2
    let jitter = 0
    const pts = Array.from({ length: count }, (_, i) => {
      jitter = jitter * 0.55 + (Math.random() - 0.5) * amp
      return { a: (i / count) * Math.PI * 2, r: r + off + jitter }
    })
    return { pts, w: k === 0 ? 2.4 : 0.8 + Math.random() * 1.4, alpha: k === 0 ? 1 : 0.35 + Math.random() * 0.5 }
  })
}

function makeArc(cx: number, cy: number, r: number): Arc {
  const a = Math.random() * Math.PI * 2
  const out = Math.random() < 0.6 ? 1 : -1
  const len = 10 + Math.random() * 22
  const pts = [{ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }]
  const steps = 4
  for (let i = 1; i <= steps; i++) {
    const d = r + out * (len * i) / steps
    const aa = a + (Math.random() - 0.5) * 0.25
    pts.push({ x: cx + Math.cos(aa) * d, y: cy + Math.sin(aa) * d })
  }
  return { pts, life: 1 }
}

// Lite ring (phones, or when the full one drops frames): canvas shadowBlur is the costly part, so the
// halo is drawn once into a sprite and the strands get a wide faint stroke instead of a blurred one.
function makeHalo(r: number, dpr: number) {
  const size = Math.ceil((r + PAD) * 2)
  const c = document.createElement("canvas")
  c.width = Math.round(size * dpr); c.height = Math.round(size * dpr)
  const g = c.getContext("2d")
  if (!g) return null
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  const cx = size / 2
  const core = g.createRadialGradient(cx, cx, r * 0.2, cx, cx, r * 1.05)
  core.addColorStop(0, "rgba(5,10,60,0.55)")
  core.addColorStop(0.75, "rgba(20,50,170,0.32)")
  core.addColorStop(1, "rgba(40,110,255,0)")
  g.fillStyle = core
  g.beginPath(); g.arc(cx, cx, r * 1.05, 0, Math.PI * 2); g.fill()
  g.globalCompositeOperation = "lighter"
  g.shadowColor = "#1f6bff"; g.shadowBlur = 26
  g.strokeStyle = "rgba(40,120,255,0.22)"; g.lineWidth = 12
  g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.stroke()
  return { canvas: c, size }
}

function drawRingLite(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, strands: Strand[], rot: number, power: number, halo: ReturnType<typeof makeHalo>) {
  if (halo) {
    const k = r / Math.max(1, halo.size / 2 - PAD), s = halo.size * k
    ctx.globalAlpha = Math.min(1, 0.7 + 0.3 * power)
    ctx.drawImage(halo.canvas, cx - s / 2, cy - s / 2, s, s)
    ctx.globalAlpha = 1
  }
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  for (const st of strands) {
    ctx.beginPath()
    st.pts.forEach((p, i) => {
      const x = cx + Math.cos(p.a + rot) * p.r, y = cy + Math.sin(p.a + rot) * p.r
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.closePath()
    const a = st.alpha * Math.min(1, power)
    ctx.strokeStyle = `rgba(58,160,255,${0.25 * a})`
    ctx.lineWidth = st.w * 4
    ctx.stroke()
    ctx.strokeStyle = `rgba(110,200,255,${a})`
    ctx.lineWidth = st.w * (0.8 + 0.4 * power)
    ctx.stroke()
  }
  ctx.restore()
}

function drawRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, strands: Strand[], rot: number, power: number) {
  // dark core with a faint blue glow towards the rim
  const core = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.05)
  core.addColorStop(0, "rgba(5,10,60,0.55)")
  core.addColorStop(0.75, `rgba(20,50,170,${0.25 + 0.15 * power})`)
  core.addColorStop(1, "rgba(40,110,255,0)")
  ctx.fillStyle = core
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2); ctx.fill()

  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  // wide soft halo
  ctx.shadowColor = "#1f6bff"
  ctx.shadowBlur = 26 * power
  ctx.strokeStyle = `rgba(40,120,255,${0.22 * power})`
  ctx.lineWidth = 12
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()

  // lightning strands
  for (const s of strands) {
    ctx.beginPath()
    s.pts.forEach((p, i) => {
      const x = cx + Math.cos(p.a + rot) * p.r, y = cy + Math.sin(p.a + rot) * p.r
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.shadowColor = "#3aa0ff"
    ctx.shadowBlur = 14 * power
    ctx.strokeStyle = `rgba(110,200,255,${s.alpha * Math.min(1, power)})`
    ctx.lineWidth = s.w * (0.8 + 0.4 * power)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = `rgba(235,250,255,${0.7 * s.alpha * Math.min(1, power)})`
    ctx.lineWidth = Math.max(0.6, s.w * 0.35)
    ctx.stroke()
  }
  ctx.restore()
}

// the portal's size and its distance from the right edge for a window this wide
function portalLayout(vw: number) {
  // at the end of the ground, rising behind the footer buttons; from 768 px, just left of the zoom
  // buttons' column (bottom-24 right-4, 36 px wide) so it does not cover them
  return vw < 768 ? { d: 135, right: 6 } : { d: 177, right: 58 }
}

// The horizontal span the chicken's entrance must avoid: the portal plus a margin around it, so she
// never drops straight into it and leaves the globe right away.
export function chickenPortalAvoid(vw: number): [number, number][] {
  const { d, right } = portalLayout(vw)
  const margin = 70
  return [[vw - right - d - margin, vw]]
}

// a portal standing in a moving world (the Pátio): its centre x and the ground's y in the world element's units
export type ChickenPortalWorld = { host: React.RefObject<HTMLElement | null>; x: number; groundY: number; d: number }

export function ChickenPortal({ engine, href = "/patio", visible = true, world, label = "Enter playground?", modeSwitch = false, id, actors, onEnter, enabled = true, instructionMode = 'hover' }: {
  engine: ChickenEngine | null
  href?: string
  visible?: boolean
  // placed in the world (moves with its camera) instead of the screen's bottom-right corner
  world?: ChickenPortalWorld
  label?: string
  id?: string
  actors?: () => ChickenEngine[]
  onEnter?: (actor: ChickenEngine) => boolean
  enabled?: boolean
  instructionMode?: 'always' | 'hover'
  // under the button, an online / local switch: how the Pátio's lobby starts (local by default)
  modeSwitch?: boolean
}) {
  const router = useRouter()
  const local = !!onEnter
  const portalId = id ?? (world ? 'patio' : 'globe')
  const runtimeRef = useRef({ actors, onEnter, enabled, instructionMode })
  runtimeRef.current = { actors, onEnter, enabled, instructionMode }
  const candidateRef = useRef<ChickenEngine | null>(null)
  const arrivalReady = useRef<ChickenEngine | null>(null)
  const arrivalChecked = useRef(new WeakSet<ChickenEngine>())
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const [showInstruction, setShowInstruction] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef(engine)
  engineRef.current = engine
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const [layout, setLayout] = useState<{ d: number; right: number } | null>(null)
  const [entering, setEntering] = useState(false)
  const [touching, setTouching] = useState(false)
  const enterRef = useRef<(() => void) | null>(null)
  const [buttonW, setButtonW] = useState(170)
  // the button (and the switch under it): the animation keeps it over the ring
  const buttonRef = useRef<HTMLDivElement>(null)
  const [entryMode, setEntryMode] = useState<LobbyMode>("local")
  useEffect(() => { if (modeSwitch) setEntryMode(loadEntryMode()) }, [modeSwitch])
  const pickMode = (mode: LobbyMode) => { setEntryMode(mode); saveEntryMode(mode) }
  // the ring's centre on the screen, kept up to date by the animation (the button and the flash follow it)
  const centerRef = useRef<{ x: number; y: number } | null>(null)
  const transitionRef = useRef<{ at: number; engine: ChickenEngine | null; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [flashAt, setFlashAt] = useState<{ x: number; y: number } | null>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const worldRef = useRef(world)
  worldRef.current = world
  const worldD = world?.d
  useEffect(() => { if (world) setHost(world.host.current) }, [world])

  useEffect(() => { if (!local) router.prefetch(href) }, [router, href, local])
  useEffect(() => {
    const move = (e: PointerEvent) => { if (e.pointerType === 'mouse') pointerRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  useEffect(() => () => {
    const transition = transitionRef.current
    if (!transition) return
    clearTimeout(transition.timer)
    transition.engine?.setPortalEntry(null)
    transitionRef.current = null
  }, [href])

  // size and place: in the right corner of the ground
  useEffect(() => {
    const place = () => {
      const { d, right } = worldD ? { d: worldD, right: 0 } : portalLayout(window.innerWidth)
      setLayout(l => (l && l.d === d && l.right === right ? l : { d, right }))
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [worldD])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const { d } = layout
    const size = d + PAD * 2
    const cx = size / 2, cy = size / 2, r = d / 2
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // Phones start lite; any device whose full ring averages under ~36 fps switches to it.
    let lite = isLiteDevice()
    let dpr = 1, halo: ReturnType<typeof makeHalo> = null
    const setup = () => {
      dpr = lite ? 1 : Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      halo = lite ? makeHalo(r, dpr) : null
    }
    setup()
    const strandCount = () => lite ? 3 : 6
    const strandPoints = () => lite ? 36 : 64

    let strands = makeStrands(strandCount(), r, 6, strandPoints())
    let arcs: Arc[] = []
    const sparks: Spark[] = []
    let rot = 0, last = performance.now(), nextStrands = 0, drawnAt = 0
    let power = 1 // glow strength: rises as she comes close, flares on entering
    let enteredAt = transitionRef.current?.at ?? 0, raf = 0
    let slowFrames = 0, measured = 0
    let enteringEngine = transitionRef.current?.engine ?? null
    // the corner's canvas is fixed: its place only changes with the window (one in the world is read every frame)
    const inWorld = !!worldD
    let box = canvas.getBoundingClientRect()
    const onResize = () => { box = canvas.getBoundingClientRect() }
    window.addEventListener("resize", onResize)

    const enter = () => {
      if (enteredAt || !runtimeRef.current.enabled || !candidateRef.current) return
      const center = centerRef.current
      if (!center) return
      enteredAt = performance.now()
      enteringEngine = candidateRef.current
      portalGate(enteringEngine, portalId).block()
      enteringEngine?.setPortalEntry({ ...center, durationMs: ENTER_MS })
      setTouching(false)
      setFlashAt(runtimeRef.current.onEnter ? null : centerRef.current)
      setEntering(true)
      playPortalSound("enter")
      if (!runtimeRef.current.onEnter) markPortalArrival(href === '/' ? 'globe' : 'patio')
      const actor = enteringEngine
      transitionRef.current = { at: enteredAt, engine: actor, timer: setTimeout(() => {
        const teleport = runtimeRef.current.onEnter
        if (!teleport) { router.push(href); return }
        actor?.setPortalEntry(null)
        if (actor) teleport(actor)
        enteredAt = 0; enteringEngine = null; transitionRef.current = null
        setEntering(false); setTouching(false); setShowInstruction(false)
      }, ENTER_MS) }
    }

    enterRef.current = enter

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      enteredAt = transitionRef.current?.at ?? 0
      enteringEngine = transitionRef.current?.engine ?? null
      const elapsed = now - last
      // hidden (city popup open) or tab in the background: nothing to draw
      if (!visibleRef.current && !enteredAt) {
        setTouching(false); setShowInstruction(false); candidateRef.current = null
        last = now; return
      }
      // lite ring at ~30 fps
      if (lite && !enteredAt && now - drawnAt < 30) return
      drawnAt = now
      const dt = Math.min(0.05, elapsed / 1000); last = now
      if (!lite && !enteredAt) {
        measured++
        if (elapsed > 28) slowFrames++
        if (measured >= 90) {
          if (slowFrames > 45) { lite = true; setup(); strands = makeStrands(strandCount(), r, 6, strandPoints()); arcs = [] }
          measured = 0; slowFrames = 0
        }
      }
      const world = worldRef.current
      if (inWorld && world) {
        const left = world.x - size / 2 - liveCamera.x
        const top = world.groundY + 6 - d - PAD + liveCamera.y
        box = { ...box, left, top, right: left + size, bottom: top + size }
      }
      const pcx = box.left + cx, pcy = box.top + cy
      centerRef.current = { x: pcx, y: pcy }
      if (enteredAt) enteringEngine?.setPortalEntry({ x: pcx, y: pcy, durationMs: ENTER_MS })
      // the button floats over the ring, kept inside the screen
      const btn = buttonRef.current
      if (btn) {
        const w = btn.offsetWidth
        btn.style.left = `${Math.max(8, Math.min(window.innerWidth - 8 - w, pcx - w / 2))}px`
        btn.style.top = `${pcy - r - 10 - btn.offsetHeight}px`
      }

      // ---------- characters and destination arrival ----------
      let near = 0
      const runtime = runtimeRef.current
      const eng = engineRef.current
      if (eng && !runtime.onEnter && !enteredAt) {
        // The world's initial camera/spawn runs in its first frame. Place the
        // arrival afterwards, so that setup cannot overwrite the destination.
        if (arrivalReady.current !== eng) arrivalReady.current = eng
        else if (!arrivalChecked.current.has(eng)) {
          arrivalChecked.current.add(eng)
          if (takePortalArrival(portalId)) {
            portalGate(eng, portalId).block()
            eng.arriveAtPortal({ x: pcx, y: pcy, durationMs: ENTER_MS })
            playPortalSound('arrive')
          }
        }
      }
      let candidate: ChickenEngine | null = null, suppressed = false
      if (!enteredAt) {
        const characters = runtime.actors?.() ?? (eng ? [eng] : [])
        for (const actor of characters) {
          const st = actor.getMotionState()
          const gate = portalGate(actor, portalId).update(st, { x: pcx, y: pcy, r }, actor.peekActions())
          suppressed ||= gate.blocked
          near = Math.max(near, 1 - Math.hypot(st.x - pcx, st.y - 80 * st.scale - pcy) / (r * 3.5))
          if (runtime.enabled && gate.touching && !candidate) candidate = actor
          if (runtime.enabled && gate.enter) { candidateRef.current = actor; enter(); return }
        }
        candidateRef.current = candidate
        setTouching(!!candidate)
        const pointer = pointerRef.current
        const hovered = pointer && Math.hypot(pointer.x - pcx, pointer.y - pcy) <= r
        const onScreen = box.right > 0 && box.left < window.innerWidth && box.bottom > 0 && box.top < window.innerHeight
        setShowInstruction(!!(runtime.enabled && visibleRef.current && onScreen && !suppressed && label.trim() && (candidate || hovered || runtime.instructionMode === 'always')))
      }
      // Contact/arrival gates above still run for offscreen local players. Only
      // the decorative canvas work sleeps; a transition always keeps drawing.
      const onScreen = box.right > 0 && box.left < window.innerWidth && box.bottom > 0 && box.top < window.innerHeight
      if (!onScreen && !enteredAt) { sparks.length = 0; arcs = []; nextStrands = now; return }
      const enterT = enteredAt ? Math.min(1, (now - enteredAt) / ENTER_MS) : 0
      const target = 1 + near * 0.8 + enterT * 2.4
      power += (target - power) * Math.min(1, dt * 8)

      // ---------- animate ----------
      rot += dt * (0.25 + near * 0.6 + enterT * 4)
      if (now >= nextStrands) {
        strands = makeStrands(strandCount(), r, 5 + near * 3 + enterT * 6, strandPoints())
        nextStrands = now + (reduce ? 260 : (lite ? 90 : 55) - enterT * 25)
      }
      if (!lite && !reduce && Math.random() < dt * (3 + near * 10 + enterT * 30)) arcs.push(makeArc(cx, cy, r))
      arcs = arcs.filter(a => (a.life -= dt * 7) > 0)
      if (Math.random() < dt * (12 + near * 20 + enterT * 60) * (lite ? 0.4 : 1)) {
        sparks.push({ a: Math.random() * Math.PI * 2, r: r + (Math.random() - 0.5) * 10, vr: enterT ? -60 - Math.random() * 80 : (Math.random() - 0.5) * 30, va: (Math.random() - 0.5) * 1.2, life: 0, max: 0.5 + Math.random() * 0.9, size: 0.8 + Math.random() * 1.6 })
      }

      // ---------- draw ----------
      ctx.clearRect(0, 0, size, size)
      const ringR = r * (1 + enterT * 0.12)
      if (lite) drawRingLite(ctx, cx, cy, ringR, strands, rot, power, halo)
      else drawRing(ctx, cx, cy, ringR, strands, rot, power)

      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      for (const a of arcs) {
        ctx.beginPath()
        a.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        ctx.strokeStyle = `rgba(170,225,255,${a.life})`
        ctx.lineWidth = 1.2
        ctx.shadowColor = "#3aa0ff"; ctx.shadowBlur = 8
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life += dt; s.r += s.vr * dt; s.a += s.va * dt
        if (s.life >= s.max || s.r < 2) { sparks.splice(i, 1); continue }
        const k = 1 - s.life / s.max
        ctx.fillStyle = `rgba(200,240,255,${k})`
        ctx.beginPath(); ctx.arc(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r, s.size, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()

      if (flashRef.current && enteredAt) flashRef.current.style.opacity = String(Math.min(1, enterT * enterT * 1.15))
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize); enterRef.current = null
    }
  }, [layout, router, href, worldD, host, portalId, label])

  if (!layout || (world && !host)) return null
  const size = layout.d + PAD * 2
  const canvas = (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-chicken-portal
      className={world ? "pointer-events-none absolute transition-opacity duration-700" : "pointer-events-none fixed z-[66] transition-opacity duration-700"}
      style={world
        ? { width: size, height: size, left: world.x - size / 2, top: world.groundY + 6 - layout.d - PAD, opacity: visible ? OPACITY : 0 }
        : { width: size, height: size, right: layout.right - PAD, bottom: CHICKEN_GROUND_H - 6 - PAD, opacity: visible ? OPACITY : 0 }}
    />
  )
  // first place of the button (the animation keeps it on the ring from then on)
  const c = centerRef.current
  const btnStyle: React.CSSProperties = c
    ? { left: Math.max(8, c.x - buttonW / 2), top: c.y - layout.d / 2 - 10 - 36 }
    : { right: Math.max(8, layout.right + layout.d / 2 - buttonW / 2), bottom: CHICKEN_GROUND_H - 6 + layout.d + 10 }
  const flash = flashAt
    ? `${flashAt.x}px ${flashAt.y}px`
    : `calc(100% - ${layout.right + layout.d / 2}px) calc(100% - ${CHICKEN_GROUND_H - 6 + layout.d / 2}px)`
  return (
    <>
      {world && host ? createPortal(canvas, host) : canvas}
      {showInstruction && visible && !entering && (
        <div
          data-chicken-ignore
          ref={el => { buttonRef.current = el; if (el && Math.abs(el.offsetWidth - buttonW) > 1) setButtonW(el.offsetWidth) }}
          className="pointer-events-auto fixed z-[195] flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200"
          style={{ ...btnStyle, touchAction: "manipulation" }}
        >
          <button
            type="button"
            onClick={() => enterRef.current?.()}
            disabled={!touching}
            title={touching ? "Clique, ou aperte correr / pegar" : "Aproxime o boneco para entrar"}
            className="whitespace-nowrap rounded-full border border-[#7cc4ff]/70 bg-[#0a1a4a]/85 px-4 py-2 font-semibold text-sm text-white shadow-[0_0_18px_rgba(60,150,255,0.6)] backdrop-blur transition hover:bg-[#123080]/90 active:scale-95 disabled:cursor-default"
          >
            {label}
          </button>
          {modeSwitch && <EntryModeSwitch mode={entryMode} onChange={pickMode} />}
        </div>
      )}
      {entering && flashAt && (
        <div
          ref={flashRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[300]"
          style={{
            opacity: 0,
            background: `radial-gradient(circle at ${flash}, rgba(235,248,255,1) 0, rgba(90,170,255,0.95) 18%, rgba(15,40,140,0.97) 55%, rgba(3,6,30,1) 100%)`,
          }}
        />
      )}
    </>
  )
}

// online / local, a label on each side of the switch (local: a lobby of this computer's players)
function EntryModeSwitch({ mode, onChange }: { mode: LobbyMode; onChange: (mode: LobbyMode) => void }) {
  const online = mode === "online"
  const side = (m: LobbyMode, text: string) => (
    <button type="button" onClick={() => onChange(m)} aria-pressed={mode === m} className={mode === m ? "text-white" : "text-white/55 hover:text-white"}>{text}</button>
  )
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#7cc4ff]/40 bg-[#0a1a4a]/80 px-3 py-1 font-mono text-[11px] backdrop-blur" title={online ? "Entra no lobby online aberto (até 13 players)" : "Lobby só com os players deste computador"}>
      {side("online", "online")}
      <button
        type="button"
        role="switch"
        aria-checked={!online}
        aria-label="Lobby local"
        onClick={() => onChange(online ? "local" : "online")}
        className="relative h-4 w-8 rounded-full border border-[#7cc4ff]/60 bg-[#123080]/70"
      >
        <span className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-[#9fd4ff] shadow-[0_0_6px_#7cc4ff] transition-[left] duration-150" style={{ left: online ? 3 : 17 }} />
      </button>
      {side("local", "local")}
    </div>
  )
}
