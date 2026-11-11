// The Pátio's scenery behind everything: a dusk sky, a low sun, soft clouds, mountain ranges and tree lines, in
// layers that follow the camera at different rates (parallax) along the whole world, the temple included.
// live-camera moves each layer directly: a layer with depth p moves p * camX to the right,
// so on screen it scrolls (1 - p) as fast as
// the ground. The art is generated once from a fixed seed, so it is the same on every screen and every visit.
"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { followParallax, onCameraMove, watchCameraRegion } from "@/lib/pigchicken/live-camera"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"
import { classicLook, mix, skyGradient, skyRadial, type SkyLook } from "@/lib/pigchicken/sky"
import { MOUNTAINS_DEFAULT, MOUNTAIN_LIFT, MOUNTAIN_OUTLINE_PX, type MountainParams } from "@/lib/pigchicken/mountains"
import { ridge, rng, shadeFaces, snowRegion } from "@/lib/pigchicken/mountain-draw"
import { CLOUDS_DEFAULT, type CloudParams } from "@/lib/pigchicken/clouds"
import type { SnowfallParams } from "@/lib/pigchicken/snowfall"
import { Snowfall } from "./snowfall"

const G = WORLD_GROUND_Y
// how far down every layer reaches below the horizon: zoomed all the way out, the camera never shows the layers' foot
const BOTTOM = G + 4000
// how far past the world's left edge the layers start, and how much they reach past its right edge (the widest screen)
const PAD_L = 1600, PAD_R = 4200

// a layer's width in its own units: what the camera can reveal of it over the whole world
const layerW = (worldW: number, p: number) => Math.ceil(worldW * (1 - p)) + PAD_L + PAD_R

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
// size, height (0 low to 1 high) and spread (0 one height to 1 scattered) come from Configurações → Nuvens
function clouds(w: number, seed: number, size = 1, height = 0.5, spread = 0.5) {
  const r = rng(seed)
  const mid = 290 + (0.5 - height) * 500, band = 720 * spread
  const out: { x: number; y: number; lobes: { dx: number; dy: number; rx: number; ry: number }[]; o: number; drift: number }[] = []
  for (let x = r() * 500; x < w; x += (380 + r() * 700) * Math.max(0.6, size)) {
    const n = 3 + Math.floor(r() * 4), span = (120 + r() * 260) * size, thick = (16 + r() * 26) * size
    const lobes = Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const mid = 1 - Math.abs(t - 0.5) * 1.4
      return { dx: (t - 0.5) * span + (r() - 0.5) * 30, dy: -mid * thick * (0.4 + r() * 0.6), rx: span * (0.18 + r() * 0.16), ry: thick * (0.5 + mid * 0.6) }
    })
    // a flat base under the lobes
    lobes.push({ dx: 0, dy: thick * 0.15, rx: span * 0.62, ry: thick * 0.35 })
    out.push({ x, y: mid + (r() - 0.5) * band, lobes, o: 0.12 + r() * 0.22, drift: 60 + r() * 90 })
  }
  return out
}

// the sky's texture: a soft grain with long horizontal streaks, made once per strength, streaks and grain (0.5 is
// the usual mix) as a small tile
function useSkyTexture(strength: number, streak = 0.5, grain = 0.5) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (strength <= 0) { setUrl(null); return }
    const c = document.createElement("canvas")
    c.width = 256; c.height = 128
    const ctx = c.getContext("2d")
    if (!ctx) return
    const img = ctx.createImageData(256, 128), r = rng(97)
    for (let y = 0; y < 128; y++) {
      // a row's own drift (the streak) plus fine grain. The drift is walked over two tile widths and the two halves
      // are cross-faded, so the row ends where it starts and the tile repeats without a seam
      const walk: number[] = []
      let row = r() - 0.5
      for (let k = 0; k < 512; k++) { row += (r() - 0.5) * 0.08; row *= 0.985; walk.push(row) }
      for (let x = 0; x < 256; x++) {
        const t = x / 256, drift = walk[x + 256] * (1 - t) + walk[x] * t
        const v = 128 + (drift * 1.8 * streak + (r() - 0.5) * 1.2 * grain) * 255
        const i = (y * 256 + x) * 4
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v))
        img.data[i + 3] = Math.round(255 * Math.min(1, strength) * 0.55)
      }
    }
    ctx.putImageData(img, 0, 0)
    setUrl(c.toDataURL())
  }, [strength, streak, grain])
  return url
}

// stars: tiny dots high in the sky, one path; count and size are multipliers (Céu e luz → Estrelas)
function stars(w: number, seed: number, count = 1, size = 1) {
  const r = rng(seed)
  let d = ""
  for (let i = 0; i < (w / 9) * count; i++) {
    const x = r() * w, y = -300 + Math.pow(r(), 1.6) * 900, s = (0.6 + r() * 1.6) * size
    d += `M${x.toFixed(0)} ${y.toFixed(0)}m-${s} 0a${s} ${s} 0 1 0 ${s * 2} 0a${s} ${s} 0 1 0 -${s * 2} 0`
  }
  return d
}
const CLASSIC = classicLook()

// the sky with its bands curved round the sun (Curvatura): the rings' centre follows the sun sideways (0.97, like
// its layer) by a transform only, so moving the camera never repaints the gradient
function RadialSky({ look, left, width, top, height, cx }: { look: SkyLook; left: number; width: number; top: number; height: number; cx: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => onCameraMove(x => { if (ref.current) ref.current.style.transform = `translate3d(${(x * 0.97).toFixed(2)}px,0,0)` }), [])
  return <div ref={ref} className="absolute" style={{ left, width, top, height, background: skyRadial(look, top, -200, G - 60, cx - left) ?? undefined }} />
}

// one parallax layer: depth p (0 = with the ground, 1 = fixed on the screen)
function Layer({ p, w, children }: { p: number; w: number; children: React.ReactNode }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => ref.current ? followParallax(ref.current, p) : undefined, [p])
  return (
    <svg ref={ref} aria-hidden="true" className="absolute" viewBox={`0 0 ${w} ${BOTTOM}`} style={{ left: -PAD_L, top: 0, width: w, height: BOTTOM, overflow: "hidden" }}>
      {children}
    </svg>
  )
}

function Cloud({ c, lit, shade, wind = 1 }: { c: ReturnType<typeof clouds>[number]; lit: string; shade: string; wind?: number }) {
  const ref = useRef<SVGGElement>(null)
  useEffect(() => {
    const l = Math.min(...c.lobes.map(l => l.dx - l.rx)) - c.drift - 16
    const r = Math.max(...c.lobes.map(l => l.dx + l.rx)) + c.drift + 16
    return ref.current ? watchCameraRegion(ref.current, { x: -PAD_L + c.x + l, y: c.y - 100, w: r - l, h: 200 }, 0.9) : undefined
  }, [c])
  // wind: the drift's speed (0 holds the cloud still)
  return <g ref={ref} className={wind > 0 ? "px-cloud" : undefined} style={{ ["--d" as string]: `${(c.drift / Math.max(wind, 0.05)).toFixed(1)}s`, ["--a" as string]: `${c.drift}px` }} opacity={c.o} filter="url(#px-soft)">
    {c.lobes.map((l, k) => <ellipse key={k} cx={c.x + l.dx} cy={c.y + l.dy} rx={l.rx} ry={l.ry} fill={k === c.lobes.length - 1 ? shade : lit} />)}
  </g>
}

// the ranges, in the order Cordilheiras adds them (the usual three first, then one behind and two in between):
// depth, seed, base (their feet), peaks' height, roughness, sampling step, the haze. Drawn back to front.
const RANGES = [
  { p: 0.82, seed: 3, base: 720, amp: 190, rough: 1.3, step: 24, hazeTop: 560, haze: 0.7 },
  { p: 0.66, seed: 7, base: 790, amp: 160, rough: 1.7, step: 24, hazeTop: 680, haze: 0.55 },
  { p: 0.48, seed: 19, base: 860, amp: 90, rough: 1.1, step: 32, hazeTop: 790, haze: 0.35 },
  { p: 0.9, seed: 23, base: 680, amp: 230, rough: 1.0, step: 24, hazeTop: 500, haze: 0.8 },
  { p: 0.74, seed: 29, base: 755, amp: 175, rough: 1.5, step: 24, hazeTop: 620, haze: 0.62 },
  { p: 0.57, seed: 37, base: 825, amp: 120, rough: 1.4, step: 28, hazeTop: 735, haze: 0.45 },
] as const

// a range's colour by its depth, between the sky's three (lighter and hazier past the farthest)
function rangeColor(look: SkyLook, p: number) {
  const [a, b, c] = look.ranges
  if (p >= 0.82) return mix(a, look.haze, ((p - 0.82) / 0.08) * 0.3)
  if (p >= 0.66) return mix(a, b, (0.82 - p) / 0.16)
  return mix(b, c, (0.66 - p) / 0.18)
}

// mountains: Configurações do Pátio → Montanhas (shape, snow, tint); their light and haze come from the sky
// clouds: Configurações do Pátio → Nuvens (amount, size, height, softness, wind, tint…); snowfall: → Neve caindo
export const ParallaxBackdrop = memo(function ParallaxBackdrop({ worldW, look = CLASSIC, mountains = MOUNTAINS_DEFAULT, clouds: cloudSet = CLOUDS_DEFAULT, snowfall }: { worldW: number; look?: SkyLook; mountains?: MountainParams; clouds?: CloudParams; snowfall?: SnowfallParams }) {
  const wSun = layerW(worldW, 0.97), wCloud = layerW(worldW, 0.9)
  const wTreesFar = layerW(worldW, 0.34), wTrees = layerW(worldW, 0.2)
  const shapes = useMemo(() => ({
    treeFar: trees(wTreesFar, 31, G - 40, 64, 46), treeNear: trees(wTrees, 47, G - 6, 120, 210),
  }), [wTreesFar, wTrees])
  const starPath = useMemo(() => stars(wSun, 5, look.starCount, look.starSize), [wSun, look.starCount, look.starSize])
  const { size: cSize, height: cHeight, spread: cSpread, shape: cShape } = cloudSet
  const cloudList = useMemo(() => clouds(wCloud, 11 + cShape * 131, cSize / 100, cHeight / 100, cSpread / 100), [wCloud, cSize, cHeight, cSpread, cShape])
  const { show, ranges: rangeCount, height, lift, rough, snow, snowEdge, shape, peak, shadeStyle, snowPeaks, snowStyle, snowSide } = mountains
  const ranges = useMemo(() => !show ? [] : RANGES.slice(0, rangeCount).map((r, i) => {
    const w = layerW(worldW, r.p), amp = r.amp * height / 100, seed = r.seed + shape * 101, up = lift * MOUNTAIN_LIFT.unit
    const rg = ridge(w, seed, r.base - up, amp, r.rough * rough / 100, peak === 'wave' ? r.step : 16, peak, BOTTOM)
    // the snow comes down at most 60% of the way to the feet: of each peak's own height, or of the highest one's
    const snowD = snowRegion(rg, { amount: snow / 100, perPeak: snowPeaks, style: snowStyle, edge: snowEdge / 100, side: snowSide / 100 }, seed + 7)
    return { ...r, i, w, d: rg.d, line: rg.line, top: rg.top, base: r.base - up, hazeTop: r.hazeTop - up, shade: shadeFaces(rg, shadeStyle, BOTTOM, seed + 13), snow: snowD }
  }).sort((a, b) => b.p - a.p), [worldW, show, rangeCount, height, lift, rough, snow, snowEdge, shape, peak, shadeStyle, snowPeaks, snowStyle, snowSide])
  const rangeFill = (p: number) => mountains.tintAmount > 0 ? mix(rangeColor(look, p), mountains.tint, mountains.tintAmount / 100 * 0.8) : rangeColor(look, p)
  // the clouds' light, with the Nuvens tint and volume (how much the shaded underside shows)
  const cloudLit = cloudSet.tintAmount > 0 ? mix(look.clouds.lit, cloudSet.tint, cloudSet.tintAmount / 100) : look.clouds.lit
  const cloudShade = mix(cloudLit, cloudSet.tintAmount > 0 ? mix(look.clouds.shade, cloudSet.tint, cloudSet.tintAmount / 200) : look.clouds.shade, cloudSet.volume / 100)
  const cloudAlpha = look.clouds.opacity * cloudSet.opacity / 100
  const texture = useSkyTexture(look.texture, look.textureLook.streak, look.textureLook.grain)
  const { treeFar, treeNear } = shapes
  const amount = cloudSet.amount / 100
  const shownClouds = amount >= 1 ? cloudList : cloudList.filter((_, i) => ((i * 0.618) % 1) < amount)
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
      {/* below the horizon the haze stays at its densest, down to the layer's foot */}
      <rect x={0} y={G + 39} width={w} height={BOTTOM - G - 39} fill={look.haze} opacity={Math.min(1, o * look.hazeAmount)} />
    </>
  )
  const sunX = PAD_L + 1350
  const skyTop = -4200
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {/* the sky: the Pátio's gradient from y = -200 down to the horizon; it reaches far above the world's top and, in its last colour, down to the layers' foot */}
      {look.radial.amount > 0
        ? <RadialSky look={look} left={-PAD_L - 4000 - worldW} width={2 * worldW + PAD_L + PAD_R + 8000} top={skyTop} height={BOTTOM - skyTop} cx={sunX - PAD_L} />
        : <div className="absolute" style={{
          left: -PAD_L - 4000, width: worldW + PAD_L + PAD_R + 8000, top: skyTop, height: BOTTOM - skyTop,
          background: skyGradient(look, skyTop, -200, G - 60),
        }} />}
      {texture && <div className="absolute" style={{
        left: -PAD_L - 4000, width: worldW + PAD_L + PAD_R + 8000, top: -1600, height: G + 1600,
        backgroundImage: `url(${texture})`, backgroundSize: `${Math.round(1024 * look.textureLook.scale)}px ${Math.round(256 * look.textureLook.scale)}px`,
        mixBlendMode: look.textureLook.blend as React.CSSProperties["mixBlendMode"],
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
        {look.stars > 0 && starPath && <path d={starPath} fill="#f4f1ff" opacity={look.stars * 0.85} />}
        {look.horizonGlow > 0 && <ellipse cx={sunX} cy={860} rx={1700 * look.sun.glowSize} ry={420 * Math.sqrt(look.sun.glowSize)} fill="url(#px-horizon)" opacity={look.horizonGlow} />}
        {look.moon.opacity > 0 && <>
          <circle cx={sunX + 900} cy={look.moon.y} r={150} fill="url(#px-sun)" opacity={look.moon.opacity * 0.6} />
          <circle cx={sunX + 900} cy={look.moon.y} r={30} fill="#eef0ff" opacity={look.moon.opacity} />
          <circle cx={sunX + 912} cy={look.moon.y - 6} r={26} fill={look.stops[0].color} opacity={look.moon.opacity * 0.85} />
        </>}
        {look.sun.opacity > 0 && <>
          <circle cx={sunX} cy={look.sun.y} r={look.sun.r * 7.8 * look.sun.glowSize} fill="url(#px-sun)" opacity={look.sun.opacity} />
          <circle cx={sunX} cy={look.sun.y} r={look.sun.r} fill={look.sun.color} opacity={0.9 * look.sun.opacity} />
        </>}
      </Layer>
      {shownClouds.length > 0 && <Layer p={0.9} w={wCloud}>
        <defs><filter id="px-soft" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation={cloudSet.soft * 0.1 * Math.max(0.6, cSize / 100)} /></filter></defs>
        <style>{`
          .px-cloud { animation: px-drift var(--d) ease-in-out infinite alternate; }
          @keyframes px-drift { from { transform: translateX(calc(var(--a) * -1)); } to { transform: translateX(var(--a)); } }
          @media (prefers-reduced-motion: reduce) { .px-cloud { animation: none; } }
        `}</style>
        <g opacity={Math.min(1, cloudAlpha)}>
          {shownClouds.map((c, i) => <Cloud key={i} c={cloudAlpha > 1 ? { ...c, o: Math.min(0.95, c.o * cloudAlpha) } : c} lit={cloudLit} shade={cloudShade} wind={cloudSet.wind / 100} />)}
        </g>
      </Layer>}
      {ranges.map(r => {
        const fill = rangeFill(r.p)
        // the snow takes the sun's light, or the colour chosen for it
        const lit = mix(fill, mix("#ffffff", look.clouds.lit, 0.4), 0.8)
        const snowFill = mountains.snowTintAmount > 0 ? mix(lit, mountains.snowTint, mountains.snowTintAmount / 100) : lit
        const g = mountains.gradient / 100
        return (
          <Layer key={r.i} p={r.p} w={r.w}>
           <g opacity={mountains.opacity < 100 ? mountains.opacity / 100 : undefined}>
            {/* Degradê: darker at the tops, lighter at the feet */}
            {g > 0 && <defs><linearGradient id={`px-mg${r.i}`} gradientUnits="userSpaceOnUse" x1="0" y1={r.top} x2="0" y2={r.base}>
              <stop offset="0" stopColor={mix(fill, "#000000", g * 0.3)} /><stop offset="1" stopColor={mix(fill, "#ffffff", g * 0.45)} />
            </linearGradient></defs>}
            <path d={r.d} fill={g > 0 ? `url(#px-mg${r.i})` : fill} />
            {mountains.shade > 0 && r.shade && <path d={r.shade} fill={mix(fill, "#000000", mountains.shade / 100 * 0.4)} opacity={g > 0 ? 0.85 : undefined} />}
            {r.snow && <>
              <defs><clipPath id={`px-snow${r.i}`}><path d={r.snow} /></clipPath></defs>
              <g clipPath={`url(#px-snow${r.i})`}>
                <path d={r.d} fill={snowFill} />
                {/* the snow's shaded faces: bluish, toward the range's own colour */}
                {mountains.snowShade > 0 && r.shade && <path d={r.shade} fill={mix(snowFill, mix(fill, "#6f86c0", 0.5), mountains.snowShade / 100 * 0.6)} />}
              </g>
            </>}
            {mountains.outline > 0 && <path d={r.line} fill="none" stroke={mountains.outlineColor} strokeWidth={mountains.outline / 100 * MOUNTAIN_OUTLINE_PX} strokeLinejoin="round" />}
           </g>
            {haze(r.w, `px-h${r.i + 1}`, r.hazeTop, r.haze)}
          </Layer>
        )
      })}
      {look.forest && <>
        <Layer p={0.34} w={wTreesFar}>
          <path d={treeFar.trunks} fill={look.trees[0]} /><path d={treeFar.crowns} fill={look.trees[0]} />
          <rect x={0} y={G - 42} width={wTreesFar} height={BOTTOM - G + 42} fill={look.trees[0]} />
        </Layer>
        <Layer p={0.2} w={wTrees}>
          <path d={treeNear.trunks} fill={look.trees[1]} /><path d={treeNear.crowns} fill={look.trees[1]} />
        </Layer>
      </>}
      {snowfall && snowfall.amount > 0 && <Snowfall snow={snowfall} color={mix("#ffffff", look.clouds.lit, 0.25)} />}
    </div>
  )
})
