"use client"

// Electric portal on the globe's ground: a ring of blue lightning standing in the right corner of the
// ground strip, to the left of the footer buttons. When the player chicken walks (jumps, flies or is
// dropped) into it, it flares, zaps and the game goes to the Pátio (/patio). The Pátio shows a short
// arrival burst around her (ChickenPortalArrival).
import { useEffect, useRef, useState, type RefObject } from "react"
import { useRouter } from "next/navigation"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { CHICKEN_GROUND_H } from "./chicken-layer"

const ARRIVAL_KEY = "chickenchess:portal-arrival"
const PAD = 34 // room around the ring for the glow, arcs and sparks
const GAP = 14 // space between the portal and the footer buttons
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

// the zap of touching the ring and the whoosh of being pulled in
export function playPortalSound(kind: "enter" | "arrive") {
  const a = audio()
  if (!a) return
  const t = a.currentTime + 0.01
  const out = a.createGain(); out.gain.value = 0.55; out.connect(a.destination)
  const env = (g: GainNode, at: number, peak: number, attack: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(peak, at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }
  const noise = noiseBuffer(a, 1.2)

  if (kind === "enter") {
    // electric crackle: short bursts of band-passed noise
    for (let i = 0; i < 9; i++) {
      const at = t + Math.random() * 0.45
      const src = a.createBufferSource(); src.buffer = noise
      const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2500 + Math.random() * 4500; f.Q.value = 2
      const g = a.createGain(); env(g, at, 0.35 + Math.random() * 0.3, 0.002, 0.03 + Math.random() * 0.05)
      src.connect(f); f.connect(g); g.connect(out); src.start(at, Math.random() * 0.5, 0.12)
    }
    // the zap: a falling noise sweep
    {
      const src = a.createBufferSource(); src.buffer = noise
      const f = a.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.4
      f.frequency.setValueAtTime(7000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.5)
      const g = a.createGain(); env(g, t, 0.5, 0.004, 0.5)
      src.connect(f); f.connect(g); g.connect(out); src.start(t)
    }
    // the pull: a buzzing saw rising into the portal
    {
      const o = a.createOscillator(); o.type = "sawtooth"
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(1400, t + 0.7)
      const lfo = a.createOscillator(); lfo.frequency.value = 38
      const lfoGain = a.createGain(); lfoGain.gain.value = 30
      lfo.connect(lfoGain); lfoGain.connect(o.frequency)
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(5000, t + 0.7)
      const g = a.createGain(); env(g, t, 0.22, 0.12, 0.65)
      o.connect(f); f.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + 0.9); lfo.stop(t + 0.9)
    }
  }
  // shimmer (both): a bright chord that rings out
  const base = kind === "enter" ? 660 : 880
  ;[1, 1.5, 2, 3].forEach((m, i) => {
    const o = a.createOscillator(); o.type = "sine"; o.frequency.value = base * m
    const g = a.createGain(); env(g, t + (kind === "enter" ? 0.25 : 0) + i * 0.03, 0.12 / (i + 1), 0.02, kind === "enter" ? 0.9 : 1.1)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.6)
  })
  if (kind === "arrive") {
    const src = a.createBufferSource(); src.buffer = noise
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2
    f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(6000, t + 0.4)
    const g = a.createGain(); env(g, t, 0.35, 0.01, 0.45)
    src.connect(f); f.connect(g); g.connect(out); src.start(t)
  }
  window.setTimeout(() => out.disconnect(), 2000)
}

// ---------- drawing ----------
function makeStrands(n: number, r: number, amp: number): Strand[] {
  return Array.from({ length: n }, (_, k) => {
    const count = 64 + Math.floor(Math.random() * 24)
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

export function ChickenPortal({ engine, anchorRef, href = "/patio", visible = true }: {
  engine: ChickenEngine | null
  // the footer button row: the portal stands to its left
  anchorRef?: RefObject<HTMLElement | null>
  href?: string
  visible?: boolean
}) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef(engine)
  engineRef.current = engine
  const [layout, setLayout] = useState<{ d: number; right: number } | null>(null)
  const [entering, setEntering] = useState(false)

  useEffect(() => { router.prefetch(href) }, [router, href])

  // size and place: to the left of the footer buttons, standing on the ground
  useEffect(() => {
    const place = () => {
      const vw = window.innerWidth
      const d = vw < 768 ? 104 : 136
      const row = anchorRef?.current?.getBoundingClientRect()
      let right = 16
      // the buttons stand on the ground in the corner: go to their left while that is still the right half
      // of the screen; on narrow screens stay in the corner, rising behind them
      if (row && row.width > 0 && row.left - GAP - d >= vw / 2) right = vw - row.left + GAP
      setLayout(l => (l && l.d === d && l.right === right ? l : { d, right }))
    }
    place()
    window.addEventListener("resize", place)
    const ro = typeof ResizeObserver !== "undefined" && anchorRef?.current ? new ResizeObserver(place) : null
    if (ro && anchorRef?.current) ro.observe(anchorRef.current)
    return () => { window.removeEventListener("resize", place); ro?.disconnect() }
  }, [anchorRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const { d } = layout
    const size = d + PAD * 2
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cx = size / 2, cy = size / 2, r = d / 2
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let strands = makeStrands(6, r, 6)
    let arcs: Arc[] = []
    const sparks: Spark[] = []
    let rot = 0, last = performance.now(), nextStrands = 0
    let power = 1 // glow strength: rises as she comes close, flares on entering
    let armed = false, enteredAt = 0, raf = 0

    const enter = () => {
      enteredAt = performance.now()
      setEntering(true)
      playPortalSound("enter")
      try { window.sessionStorage.setItem(ARRIVAL_KEY, String(Date.now())) } catch { /* private mode */ }
      window.setTimeout(() => router.push(href), ENTER_MS)
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const box = canvas.getBoundingClientRect()
      const pcx = box.left + cx, pcy = box.top + cy

      // ---------- the chicken ----------
      let near = 0
      const eng = engineRef.current
      if (eng && !enteredAt) {
        const st = eng.getState()
        const bodyY = st.y - 80 * st.scale
        const dx = st.x - pcx, dy = bodyY - pcy
        const inside = Math.abs(dx) < r * 0.55 && Math.abs(dy) < r * 0.95
        // dropped in on top of it: wait until she has stepped out once
        if (!inside) armed = true
        else if (armed) enter()
        near = Math.max(0, 1 - Math.hypot(dx, dy) / (r * 3.5))
      }
      const enterT = enteredAt ? Math.min(1, (now - enteredAt) / ENTER_MS) : 0
      const target = 1 + near * 0.8 + enterT * 2.4
      power += (target - power) * Math.min(1, dt * 8)

      // ---------- animate ----------
      rot += dt * (0.25 + near * 0.6 + enterT * 4)
      if (now >= nextStrands) {
        strands = makeStrands(6, r, 5 + near * 3 + enterT * 6)
        nextStrands = now + (reduce ? 260 : 55 - enterT * 25)
      }
      if (!reduce && Math.random() < dt * (3 + near * 10 + enterT * 30)) arcs.push(makeArc(cx, cy, r))
      arcs = arcs.filter(a => (a.life -= dt * 7) > 0)
      if (Math.random() < dt * (12 + near * 20 + enterT * 60)) {
        sparks.push({ a: Math.random() * Math.PI * 2, r: r + (Math.random() - 0.5) * 10, vr: enterT ? -60 - Math.random() * 80 : (Math.random() - 0.5) * 30, va: (Math.random() - 0.5) * 1.2, life: 0, max: 0.5 + Math.random() * 0.9, size: 0.8 + Math.random() * 1.6 })
      }

      // ---------- draw ----------
      ctx.clearRect(0, 0, size, size)
      const ringR = r * (1 + enterT * 0.12)
      drawRing(ctx, cx, cy, ringR, strands, rot, power)

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
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
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
        style={{ width: size, height: size, right: layout.right - PAD, bottom: CHICKEN_GROUND_H - 6 - PAD, opacity: visible ? 1 : 0 }}
      />
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
    const dpr = Math.min(2, window.devicePixelRatio || 1)
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
      ctx.globalAlpha = Math.max(0, 1 - t)
      drawRing(ctx, cx, cy, r, strands, now / 400, 1.6 - t)
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [active, engine])

  if (!active) return null
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[250] h-full w-full" />
}
