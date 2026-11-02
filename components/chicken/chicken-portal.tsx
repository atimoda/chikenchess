"use client"

// Electric portal on the globe's ground: a ring of blue lightning standing in the right corner of the
// ground strip, half transparent, rising behind the footer buttons. While the player chicken is touching it
// (walked, jumped, flew or was dropped into it), an "Enter playground?" button floats above the ring;
// clicking or tapping it makes the portal flare, play a soft sound and the game goes to the Pátio (/patio).
// The Pátio shows a short arrival burst around her (ChickenPortalArrival).
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { CHICKEN_GROUND_H } from "./chicken-layer"
import { isLiteDevice } from "@/lib/performance"

const ARRIVAL_KEY = "chickenchess:portal-arrival"
const PAD = 34 // room around the ring for the glow, arcs and sparks
const OPACITY = 0.5 // the ring is half transparent
const ENTER_MS = 750 // from the touch to the navigation

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
  const out = a.createGain(); out.gain.value = 0.16; out.connect(a.destination)
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

export function ChickenPortal({ engine, href = "/patio", visible = true }: {
  engine: ChickenEngine | null
  href?: string
  visible?: boolean
}) {
  const router = useRouter()
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

  useEffect(() => { router.prefetch(href) }, [router, href])

  // size and place: in the right corner of the ground
  useEffect(() => {
    const place = () => {
      const { d, right } = portalLayout(window.innerWidth)
      setLayout(l => (l && l.d === d && l.right === right ? l : { d, right }))
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [])

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
    let touchingNow = false, enteredAt = 0, raf = 0
    let slowFrames = 0, measured = 0
    // the canvas is fixed: its place only changes with the window
    let box = canvas.getBoundingClientRect()
    const onResize = () => { box = canvas.getBoundingClientRect() }
    window.addEventListener("resize", onResize)

    const enter = () => {
      if (enteredAt) return
      enteredAt = performance.now()
      touchingNow = false
      setTouching(false)
      setEntering(true)
      playPortalSound("enter")
      try { window.sessionStorage.setItem(ARRIVAL_KEY, String(Date.now())) } catch { /* private mode */ }
      window.setTimeout(() => router.push(href), ENTER_MS)
    }

    enterRef.current = enter

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const elapsed = now - last
      // hidden (city popup open) or tab in the background: nothing to draw
      if (!visibleRef.current && !enteredAt) {
        if (touchingNow) { touchingNow = false; setTouching(false) }
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
      const pcx = box.left + cx, pcy = box.top + cy

      // ---------- the chicken ----------
      let near = 0
      const eng = engineRef.current
      if (eng && !enteredAt) {
        const st = eng.getState()
        const bodyY = st.y - 80 * st.scale
        const dx = st.x - pcx, dy = bodyY - pcy
        // touching: her body inside the ring; she has to move a bit further out to let go (no flicker at the edge)
        const k = touchingNow ? 1.15 : 1
        const inside = Math.abs(dx) < r * 0.55 * k && Math.abs(dy) < r * 0.95 * k
        if (inside !== touchingNow) { touchingNow = inside; setTouching(inside) }
        near = Math.max(0, 1 - Math.hypot(dx, dy) / (r * 3.5))
      }
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
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); enterRef.current = null }
  }, [layout, router, href])

  if (!layout) return null
  const size = layout.d + PAD * 2
  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-chicken-portal
        className="pointer-events-none fixed z-[66] transition-opacity duration-700"
        style={{ width: size, height: size, right: layout.right - PAD, bottom: CHICKEN_GROUND_H - 6 - PAD, opacity: visible ? OPACITY : 0 }}
      />
      {touching && visible && !entering && (
        <button
          type="button"
          data-chicken-ignore
          ref={el => { if (el && Math.abs(el.offsetWidth - buttonW) > 1) setButtonW(el.offsetWidth) }}
          onClick={() => enterRef.current?.()}
          className="pointer-events-auto fixed z-[195] whitespace-nowrap rounded-full border border-[#7cc4ff]/70 bg-[#0a1a4a]/85 px-4 py-2 font-semibold text-sm text-white shadow-[0_0_18px_rgba(60,150,255,0.6)] backdrop-blur transition hover:bg-[#123080]/90 active:scale-95 animate-in fade-in zoom-in-95 duration-200"
          style={{ right: Math.max(8, layout.right + layout.d / 2 - buttonW / 2), bottom: CHICKEN_GROUND_H - 6 + layout.d + 10, touchAction: "manipulation" }}
        >
          Enter playground?
        </button>
      )}
      {entering && (
        <div
          ref={flashRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[300]"
          style={{
            opacity: 0,
            background: `radial-gradient(circle at calc(100% - ${layout.right + layout.d / 2}px) calc(100% - ${CHICKEN_GROUND_H - 6 + layout.d / 2}px), rgba(235,248,255,1) 0, rgba(90,170,255,0.95) 18%, rgba(15,40,140,0.97) 55%, rgba(3,6,30,1) 100%)`,
          }}
        />
      )}
    </>
  )
}

// On the Pátio: if she just came through the portal, a burst of blue lightning around her and the
// arrival shimmer.
export function ChickenPortalArrival({ engine }: { engine: ChickenEngine | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    try {
      const at = Number(window.sessionStorage.getItem(ARRIVAL_KEY))
      window.sessionStorage.removeItem(ARRIVAL_KEY)
      if (at && Date.now() - at < 8000) setActive(true)
    } catch { /* private mode */ }
  }, [])

  useEffect(() => {
    if (!active || !engine) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const lite = isLiteDevice()
    const dpr = lite ? 1 : Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(window.innerWidth * dpr); canvas.height = Math.round(window.innerHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    playPortalSound("arrive")
    const start = performance.now(), DUR = 1100
    let raf = 0, strands: Strand[] = [], next = 0
    const frame = (now: number) => {
      const t = Math.max(0, (now - start) / DUR)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      if (t >= 1) { setActive(false); return }
      const st = engine.getState()
      const cx = st.x, cy = st.y - 80 * st.scale
      const r = (60 + 90 * Math.sqrt(t)) * Math.max(0.6, st.scale)
      if (now >= next) { strands = makeStrands(3, r, 7); next = now + 50 }
      // the screen fades in from the portal's flash
      ctx.fillStyle = `rgba(3,6,30,${Math.max(0, 1 - t * 3)})`
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.globalAlpha = OPACITY * Math.max(0, 1 - t)
      if (lite) drawRingLite(ctx, cx, cy, r, strands, now / 400, 1.6 - t, null)
      else drawRing(ctx, cx, cy, r, strands, now / 400, 1.6 - t)
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [active, engine])

  if (!active) return null
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[250] h-full w-full" />
}
