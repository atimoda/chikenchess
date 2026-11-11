// The Pátio's scenery behind everything: a dusk sky, a low sun, soft clouds, mountain ranges and tree lines, in
// layers that follow the camera at different rates (parallax) along the whole world, the temple included.
// live-camera moves each layer directly: a layer with depth p moves p * camX to the right,
// so on screen it scrolls (1 - p) as fast as
// the ground. The art is generated once from a fixed seed, so it is the same on every screen and every visit.
"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { followParallax, watchCameraRegion } from "@/lib/pigchicken/live-camera"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"
import { classicLook, skyGradient, type SkyLook } from "@/lib/pigchicken/sky"

const G = WORLD_GROUND_Y
// how far past the world's left edge the layers start, and how much they reach past its right edge (the widest screen)
const PAD_L = 1600, PAD_R = 4200

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let r = s
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// a layer's width in its own units: what the camera can reveal of it over the whole world
const layerW = (worldW: number, p: number) => Math.ceil(worldW * (1 - p)) + PAD_L + PAD_R

// a mountain range: peaks of a few sizes summed, sampled every `step`
function ridge(w: number, seed: number, base: number, amp: number, rough: number, step = 24) {
  const r = rng(seed)
  const waves = Array.from({ length: 5 }, (_, i) => ({ k: (0.0016 + r() * 0.002) * (i + 1) * rough, ph: r() * 6.28, a: amp / (i + 1.3) }))
  const pts: string[] = [`M 0 ${G + 40}`]
  for (let x = 0; x <= w + step; x += step) {
    let y = base
    waves.forEach(v => { y -= v.a * (0.5 + 0.5 * Math.sin(x * v.k + v.ph)) })
    // sharper tops: a little extra on the highest parts
    pts.push(`L ${x} ${Math.round(y)}`)
  }
  pts.push(`L ${w + step} ${G + 40} Z`)
  return pts.join(" ")
}

// trees along a line: rounded crowns and pines, as one silhouette path per colour
function trees(w: number, seed: number, base: number, size: number, gap: number) {
  const r = rng(seed)
  let crowns = "", trunks = ""
  for (let x = r() * gap; x < w; x += gap * (0.5 + r())) {
    const h = size * (0.65 + r() * 0.6)
    if (r() < 0.45) {
      // a pine: three stacked triangles
      const wd = h * 0.42
      trunks += `M ${x - h * 0.03} ${base} L ${x - h * 0.03} ${base - h * 0.2} L ${x + h * 0.03} ${base - h * 0.2} L ${x + h * 0.03} ${base} Z `
      for (let k = 0; k < 3; k++) {
        const y0 = base - h * (0.15 + k * 0.27), y1 = y0 - h * 0.42, ww = wd * (1 - k * 0.25)
        crowns += `M ${x - ww} ${y0} L ${x} ${y1} L ${x + ww} ${y0} Z `
      }
    } else {
      // a round crown on a short trunk
      const rr = h * 0.32
      trunks += `M ${x - h * 0.035} ${base} L ${x - h * 0.035} ${base - h * 0.45} L ${x + h * 0.035} ${base - h * 0.45} L ${x + h * 0.035} ${base} Z `
      crowns += `M ${x - rr} ${base - h * 0.55} a ${rr} ${rr * 0.9} 0 1 1 ${rr * 2} 0 a ${rr} ${rr * 0.9} 0 1 1 ${-rr * 2} 0 Z `
      crowns += `M ${x - rr * 1.25} ${base - h * 0.42} a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${rr * 1.4} 0 a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${-rr * 1.4} 0 Z `
      crowns += `M ${x - rr * 0.15} ${base - h * 0.42} a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${rr * 1.4} 0 a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${-rr * 1.4} 0 Z `
    }
  }
  return { crowns, trunks }
}

// clouds: each one a few soft lobes of its own size and shape, faint and see-through
function clouds(w: number, seed: number) {
  const r = rng(seed)
  const out: { x: number; y: number; lobes: { dx: number; dy: number; rx: number; ry: number }[]; o: number; drift: number }[] = []
  for (let x = r() * 500; x < w; x += 380 + r() * 700) {
    const n = 3 + Math.floor(r() * 4), span = 120 + r() * 260, thick = 16 + r() * 26
    const lobes = Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const mid = 1 - Math.abs(t - 0.5) * 1.4
      return { dx: (t - 0.5) * span + (r() - 0.5) * 30, dy: -mid * thick * (0.4 + r() * 0.6), rx: span * (0.18 + r() * 0.16), ry: thick * (0.5 + mid * 0.6) }
    })
    // a flat base under the lobes
    lobes.push({ dx: 0, dy: thick * 0.15, rx: span * 0.62, ry: thick * 0.35 })
    out.push({ x, y: 110 + r() * 360, lobes, o: 0.12 + r() * 0.22, drift: 60 + r() * 90 })
  }
  return out
}

// the sky's texture: a soft grain with long horizontal streaks, made once per strength as a small tile
function useSkyTexture(strength: number) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (strength <= 0) { setUrl(null); return }
    const c = document.createElement("canvas")
    c.width = 256; c.height = 128
    const ctx = c.getContext("2d")
    if (!ctx) return
    const img = ctx.createImageData(256, 128), r = rng(97)
    for (let y = 0; y < 128; y++) {
      // a row's own drift (the streak) plus fine grain
      let row = r() - 0.5
      for (let x = 0; x < 256; x++) {
        row += (r() - 0.5) * 0.08; row *= 0.985
        const v = 128 + (row * 0.9 + (r() - 0.5) * 0.6) * 255
        const i = (y * 256 + x) * 4
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v))
        img.data[i + 3] = Math.round(255 * Math.min(1, strength) * 0.55)
      }
    }
    ctx.putImageData(img, 0, 0)
    setUrl(c.toDataURL())
  }, [strength])
  return url
}

// stars: tiny dots high in the sky, one path
function stars(w: number, seed: number) {
  const r = rng(seed)
  let d = ""
  for (let i = 0; i < w / 9; i++) {
    const x = r() * w, y = -300 + Math.pow(r(), 1.6) * 900, s = 0.6 + r() * 1.6
    d += `M${x.toFixed(0)} ${y.toFixed(0)}m-${s} 0a${s} ${s} 0 1 0 ${s * 2} 0a${s} ${s} 0 1 0 -${s * 2} 0`
  }
  return d
}
const CLASSIC = classicLook()

// one parallax layer: depth p (0 = with the ground, 1 = fixed on the screen)
function Layer({ p, w, children }: { p: number; w: number; children: React.ReactNode }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => ref.current ? followParallax(ref.current, p) : undefined, [p])
  return (
    <svg ref={ref} aria-hidden="true" className="absolute" viewBox={`0 0 ${w} ${G + 40}`} style={{ left: -PAD_L, top: 0, width: w, height: G + 40, overflow: "hidden" }}>
      {children}
    </svg>
  )
}

function Cloud({ c, lit, shade }: { c: ReturnType<typeof clouds>[number]; lit: string; shade: string }) {
  const ref = useRef<SVGGElement>(null)
  useEffect(() => {
    const l = Math.min(...c.lobes.map(l => l.dx - l.rx)) - c.drift - 16
    const r = Math.max(...c.lobes.map(l => l.dx + l.rx)) + c.drift + 16
    return ref.current ? watchCameraRegion(ref.current, { x: -PAD_L + c.x + l, y: c.y - 100, w: r - l, h: 200 }, 0.9) : undefined
  }, [c])
  return <g ref={ref} className="px-cloud" style={{ ["--d" as string]: `${c.drift}s`, ["--a" as string]: `${c.drift}px` }} opacity={c.o} filter="url(#px-soft)">
    {c.lobes.map((l, k) => <ellipse key={k} cx={c.x + l.dx} cy={c.y + l.dy} rx={l.rx} ry={l.ry} fill={k === c.lobes.length - 1 ? shade : lit} />)}
  </g>
}

export const ParallaxBackdrop = memo(function ParallaxBackdrop({ worldW, look = CLASSIC }: { worldW: number; look?: SkyLook }) {
  const wSun = layerW(worldW, 0.97), wCloud = layerW(worldW, 0.9), wFar = layerW(worldW, 0.82), wMid = layerW(worldW, 0.66)
  const wHill = layerW(worldW, 0.48), wTreesFar = layerW(worldW, 0.34), wTrees = layerW(worldW, 0.2)
  const shapes = useMemo(() => ({
    far: ridge(wFar, 3, 720, 190, 1.3), mid: ridge(wMid, 7, 790, 160, 1.7), hill: ridge(wHill, 19, 860, 90, 1.1, 32),
    treeFar: trees(wTreesFar, 31, G - 40, 64, 46), treeNear: trees(wTrees, 47, G - 6, 120, 210),
    clouds: clouds(wCloud, 11), stars: stars(wSun, 5),
  }), [wFar, wMid, wHill, wTreesFar, wTrees, wCloud, wSun])
  const texture = useSkyTexture(look.texture)
  const { treeFar, treeNear } = shapes
  const shownClouds = look.clouds.amount >= 1 ? shapes.clouds : shapes.clouds.filter((_, i) => ((i * 0.618) % 1) < look.clouds.amount)
  // the haze at the foot of each range (aerial perspective): the horizon's colour fading up
  const haze = (w: number, id: string, top: number, o: number) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.haze} stopOpacity="0" />
          <stop offset="1" stopColor={look.haze} stopOpacity={Math.min(1, o * look.hazeAmount)} />
        </linearGradient>
      </defs>
      <rect x={0} y={top} width={w} height={G + 40 - top} fill={`url(#${id})`} />
    </>
  )
  const sunX = PAD_L + 1350
  const skyTop = -4200
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {/* the sky: the Pátio's gradient from y = -200 down to the horizon; it reaches far above the world's top */}
      <div className="absolute" style={{
        left: -PAD_L - 4000, width: worldW + PAD_L + PAD_R + 8000, top: skyTop, height: G - skyTop,
        background: skyGradient(look, skyTop, -200, G - 60),
      }} />
      {texture && <div className="absolute" style={{
        left: -PAD_L - 4000, width: worldW + PAD_L + PAD_R + 8000, top: -1600, height: G + 1600,
        backgroundImage: `url(${texture})`, backgroundSize: "1024px 256px", mixBlendMode: "soft-light",
      }} />}
      <Layer p={0.97} w={wSun}>
        <defs>
          <radialGradient id="px-sun">
            <stop offset="0" stopColor={look.sun.color} stopOpacity={0.55 * look.sun.glow + 0.05} />
            <stop offset="0.35" stopColor={look.sun.color} stopOpacity={0.22 * look.sun.glow} />
            <stop offset="1" stopColor={look.sun.color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="px-horizon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={look.sun.color} stopOpacity={0.55} />
            <stop offset="0.5" stopColor={look.horizon} stopOpacity={0.25} />
            <stop offset="1" stopColor={look.horizon} stopOpacity="0" />
          </radialGradient>
        </defs>
        {look.stars > 0 && <path d={shapes.stars} fill="#f4f1ff" opacity={look.stars * 0.85} />}
        {look.horizonGlow > 0 && <ellipse cx={sunX} cy={860} rx={1700} ry={420} fill="url(#px-horizon)" opacity={look.horizonGlow} />}
        {look.moon.opacity > 0 && <>
          <circle cx={sunX + 900} cy={look.moon.y} r={150} fill="url(#px-sun)" opacity={look.moon.opacity * 0.6} />
          <circle cx={sunX + 900} cy={look.moon.y} r={30} fill="#eef0ff" opacity={look.moon.opacity} />
          <circle cx={sunX + 912} cy={look.moon.y - 6} r={26} fill={look.stops[0].color} opacity={look.moon.opacity * 0.85} />
        </>}
        {look.sun.opacity > 0 && <>
          <circle cx={sunX} cy={look.sun.y} r={look.sun.r * 7.8} fill="url(#px-sun)" opacity={look.sun.opacity} />
          <circle cx={sunX} cy={look.sun.y} r={look.sun.r} fill={look.sun.color} opacity={0.9 * look.sun.opacity} />
        </>}
      </Layer>
      {shownClouds.length > 0 && <Layer p={0.9} w={wCloud}>
        <defs><filter id="px-soft" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4" /></filter></defs>
        <style>{`
          .px-cloud { animation: px-drift var(--d) ease-in-out infinite alternate; }
          @keyframes px-drift { from { transform: translateX(calc(var(--a) * -1)); } to { transform: translateX(var(--a)); } }
          @media (prefers-reduced-motion: reduce) { .px-cloud { animation: none; } }
        `}</style>
        <g opacity={Math.min(1, look.clouds.opacity)}>
          {shownClouds.map((c, i) => <Cloud key={i} c={look.clouds.opacity > 1 ? { ...c, o: Math.min(0.85, c.o * look.clouds.opacity) } : c} lit={look.clouds.lit} shade={look.clouds.shade} />)}
        </g>
      </Layer>}
      {look.mountains && <>
        <Layer p={0.82} w={wFar}><path d={shapes.far} fill={look.ranges[0]} />{haze(wFar, "px-h1", 560, 0.7)}</Layer>
        <Layer p={0.66} w={wMid}><path d={shapes.mid} fill={look.ranges[1]} />{haze(wMid, "px-h2", 680, 0.55)}</Layer>
        <Layer p={0.48} w={wHill}><path d={shapes.hill} fill={look.ranges[2]} />{haze(wHill, "px-h3", 790, 0.35)}</Layer>
      </>}
      {look.forest && <>
        <Layer p={0.34} w={wTreesFar}>
          <path d={treeFar.trunks} fill={look.trees[0]} /><path d={treeFar.crowns} fill={look.trees[0]} />
          <rect x={0} y={G - 42} width={wTreesFar} height={90} fill={look.trees[0]} />
        </Layer>
        <Layer p={0.2} w={wTrees}>
          <path d={treeNear.trunks} fill={look.trees[1]} /><path d={treeNear.crowns} fill={look.trees[1]} />
        </Layer>
      </>}
    </div>
  )
})
