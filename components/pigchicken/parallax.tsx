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
import { rng, shadeFaces, snowRegion } from "@/lib/pigchicken/mountain-draw"
import { BACKDROP_BOTTOM, BACKDROP_PAD_L, BACKDROP_PAD_R, CLOUD_DEPTH, backdropLayerTop, FOREST_FAR, FOREST_NEAR, MOUNTAIN_RANGES, SUN_DEPTH, backdropLayerW, rangeRidge, type BackdropLayerId } from "@/lib/pigchicken/backdrop-layers"
import { cloudReach, cumulusClouds, softClouds, type CloudShape } from "@/lib/pigchicken/cloud-draw"
import { CLOUDS_DEFAULT, type CloudParams } from "@/lib/pigchicken/clouds"
import type { SnowfallParams } from "@/lib/pigchicken/snowfall"
import { Snowfall } from "./snowfall"
import { auroraOpacity, type AuroraParams } from "@/lib/pigchicken/aurora"
import { AuroraLayer } from "./aurora"

const G = WORLD_GROUND_Y
// the layers' reach, widths and depths are shared with the editor (Postes e Torres pinned to a layer)
const BOTTOM = BACKDROP_BOTTOM, PAD_L = BACKDROP_PAD_L, PAD_R = BACKDROP_PAD_R
const layerW = backdropLayerW

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
// id: which one it is (the editor shows it alone while a Poste or Torre is being pinned to it)
// top: how far up its box reaches (backdropLayerTop: 0, or above it for whatever is drawn higher); the drawing keeps
// the world's y, so a taller box never moves it
function Layer({ p, w, id, top = 0, children }: { p: number; w: number; id: BackdropLayerId; top?: number; children: React.ReactNode }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => ref.current ? followParallax(ref.current, p) : undefined, [p])
  return (
    <svg ref={ref} aria-hidden="true" data-backdrop-layer={id} className="absolute" viewBox={`0 ${top} ${w} ${BOTTOM - top}`} style={{ left: -PAD_L, top, width: w, height: BOTTOM - top, overflow: "hidden" }}>
      {children}
    </svg>
  )
}

// One cloud: an svg of its own, as big as the cloud and its blur. The blur is painted once into it and the wind
// only moves the whole svg (a transform the compositor runs by itself), so a drifting cloud never repaints.
// sun: where the light comes from, in the layer's own units: every puff is lit on that side and shaded on the other.
// blur: the soft edge, in units. fray: how far a noise pushes the outline around (Desfiado), in units, and grain:
// that noise's size. wind: the drift's speed (0 holds the cloud still)
function Cloud({ c, id, lit, shade, wind = 1, sun, blur, fray = 0, grain = 1 }: { c: CloudShape; id: string; lit: string; shade: string; wind?: number; sun: [number, number]; blur: number; fray?: number; grain?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const reach = cloudReach(c), pad = Math.ceil(blur * 3 + fray * 0.5) + 2
  const x = c.x + reach.l - pad, y = c.y - c.top - pad, w = reach.r - reach.l + pad * 2, h = c.top + c.bottom + pad * 2
  useEffect(() => ref.current ? watchCameraRegion(ref.current, { x: -PAD_L + x - c.drift, y, w: w + c.drift * 2, h }, CLOUD_DEPTH, true) : undefined, [x, y, w, h, c.drift])
  const dx = sun[0] - c.x, dy = sun[1] - c.y, far = Math.hypot(dx, dy) || 1, lx = dx / far, ly = dy / far
  return <svg ref={ref} className={wind > 0 ? "px-cloud absolute" : "absolute"} viewBox={`${x} ${y} ${w} ${h}`}
    style={{ left: x, top: y, width: w, height: h, opacity: c.o, willChange: wind > 0 ? "transform" : undefined, ["--d" as string]: `${(c.drift / Math.max(wind, 0.05)).toFixed(1)}s`, ["--a" as string]: `${c.drift}px` }}>
    <defs>
      {(blur > 0 || fray > 0) && <filter id={`${id}-b`} filterUnits="userSpaceOnUse" x={x} y={y} width={w} height={h} colorInterpolationFilters="sRGB">
        {fray > 0 && <>
          <feTurbulence type="fractalNoise" baseFrequency={(0.011 / grain).toFixed(5)} numOctaves={3} seed={c.puffs.length + 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={fray} xChannelSelector="R" yChannelSelector="G" />
        </>}
        {blur > 0 && <feGaussianBlur stdDeviation={blur} />}
      </filter>}
      {/* a puff: its lit face toward the sun, the shade round its far rim */}
      {c.puffs.length > 0 && <radialGradient id={`${id}-p`} cx={0.5 + lx * 0.12} cy={0.5 + ly * 0.12} r={0.68} fx={0.5 + lx * 0.34} fy={0.5 + ly * 0.34}>
        <stop offset="0" stopColor={lit} /><stop offset="0.45" stopColor={mix(lit, shade, 0.38)} /><stop offset="0.9" stopColor={shade} />
      </radialGradient>}
    </defs>
    <g filter={blur > 0 || fray > 0 ? `url(#${id}-b)` : undefined}>
      {c.lobes.map((l, k) => <ellipse key={k} cx={c.x + l.dx} cy={c.y + l.dy} rx={l.rx} ry={l.ry} fill={l.shade ? shade : lit} />)}
      {c.puffs.map((p, k) => <circle key={k} cx={c.x + p.dx} cy={c.y + p.dy} r={p.r} fill={`url(#${id}-p)`} />)}
    </g>
  </svg>
}

// the clouds' layer: a plain box at depth 0.9 that holds one svg per cloud
function CloudLayer({ w, opacity, children }: { w: number; opacity: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current ? followParallax(ref.current, CLOUD_DEPTH) : undefined, [])
  return <div ref={ref} aria-hidden="true" data-backdrop-layer="clouds" className="absolute" style={{ left: -PAD_L, top: 0, width: w, height: 0, opacity }}>{children}</div>
}

// the ranges (depth, seed, feet, peaks, haze…) are MOUNTAIN_RANGES in lib/pigchicken/backdrop-layers.ts
const RANGES = MOUNTAIN_RANGES

// a range's colour by its depth, between the sky's three (lighter and hazier past the farthest)
function rangeColor(look: SkyLook, p: number) {
  const [a, b, c] = look.ranges
  if (p >= 0.82) return mix(a, look.haze, ((p - 0.82) / 0.08) * 0.3)
  if (p >= 0.66) return mix(a, b, (0.82 - p) / 0.16)
  return mix(b, c, (0.66 - p) / 0.18)
}

// mountains: Configurações do Pátio → Montanhas (shape, snow, tint); their light and haze come from the sky
// clouds: Configurações do Pátio → Nuvens (amount, size, height, softness, wind, tint…); snowfall: → Neve caindo;
// aurora: → Aurora (curtains of light at the sun's depth, behind the clouds)
export const ParallaxBackdrop = memo(function ParallaxBackdrop({ worldW, look = CLASSIC, mountains = MOUNTAINS_DEFAULT, clouds: cloudSet = CLOUDS_DEFAULT, snowfall, aurora }: { worldW: number; look?: SkyLook; mountains?: MountainParams; clouds?: CloudParams; snowfall?: SnowfallParams; aurora?: AuroraParams }) {
  const wSun = layerW(worldW, SUN_DEPTH), wCloud = layerW(worldW, CLOUD_DEPTH)
  const wTreesFar = layerW(worldW, FOREST_FAR.p), wTrees = layerW(worldW, FOREST_NEAR.p)
  const shapes = useMemo(() => ({
    treeFar: trees(wTreesFar, 31, G - 40, 64, 46), treeNear: trees(wTrees, 47, G - 6, 120, 210),
  }), [wTreesFar, wTrees])
  const starPath = useMemo(() => stars(wSun, 5, look.starCount, look.starSize), [wSun, look.starCount, look.starSize])
  const { size: cSize, height: cHeight, spread: cSpread, shape: cShape, kind: cKind, puffs: cPuffs, detail: cDetail } = cloudSet
  const cloudList = useMemo(() => cKind === "cumulus"
    ? cumulusClouds(wCloud, 11 + cShape * 131, cSize / 100, cHeight / 100, cSpread / 100, cPuffs / 100, cDetail / 100)
    : softClouds(wCloud, 11 + cShape * 131, cSize / 100, cHeight / 100, cSpread / 100), [wCloud, cSize, cHeight, cSpread, cShape, cKind, cPuffs, cDetail])
  const { show, ranges: rangeCount, height, lift, rough, snow, snowEdge, shape, peak, shadeStyle, snowPeaks, snowStyle, snowSide } = mountains
  const ranges = useMemo(() => !show ? [] : RANGES.slice(0, rangeCount).map((r, i) => {
    const w = layerW(worldW, r.p), seed = r.seed + shape * 101, up = lift * MOUNTAIN_LIFT.unit
    const rg = rangeRidge(worldW, i, { height, lift, rough, shape, peak })
    // the snow comes down at most 60% of the way to the feet: of each peak's own height, or of the highest one's
    const snowD = snowRegion(rg, { amount: snow / 100, perPeak: snowPeaks, style: snowStyle, edge: snowEdge / 100, side: snowSide / 100 }, seed + 7)
    return { ...r, i, w, d: rg.d, line: rg.line, top: rg.top, base: r.base - up, hazeTop: r.hazeTop - up, shade: shadeFaces(rg, shadeStyle, BOTTOM, seed + 13), snow: snowD }
  }).sort((a, b) => b.p - a.p), [worldW, show, rangeCount, height, lift, rough, snow, snowEdge, shape, peak, shadeStyle, snowPeaks, snowStyle, snowSide])
  const rangeFill = (p: number) => mountains.tintAmount > 0 ? mix(rangeColor(look, p), mountains.tint, mountains.tintAmount / 100 * 0.8) : rangeColor(look, p)
  // the clouds' light, with the Nuvens tint and volume (how much the shaded underside shows)
  const cloudLit = cloudSet.tintAmount > 0 ? mix(look.clouds.lit, cloudSet.tint, cloudSet.tintAmount / 100) : look.clouds.lit
  const skyShade = cloudSet.tintAmount > 0 ? mix(look.clouds.shade, cloudSet.tint, cloudSet.tintAmount / 200) : look.clouds.shade
  const cloudShade = mix(cloudLit, cloudSet.shadeTintAmount > 0 ? mix(skyShade, cloudSet.shadeTint, cloudSet.shadeTintAmount / 100) : skyShade, cloudSet.volume / 100)
  const cloudAlpha = look.clouds.opacity * cloudSet.opacity / 100
  const texture = useSkyTexture(look.texture, look.textureLook.streak, look.textureLook.grain)
  const { treeFar, treeNear } = shapes
  const amount = cloudSet.amount / 100
  const shownClouds = cloudList.map((c, i) => ({ c, i })).filter(({ i }) => amount >= 1 || ((i * 0.618) % 1) < amount)
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
  // the moon keeps its place; the sun may be moved sideways (Posição do sol)
  const moonX = PAD_L + 1350 + 900, sunX = PAD_L + 1350 + look.sun.x
  const skyTop = -4200
  // the sun's layer reaches up to its highest star, glow or moon
  const sunGlowR = look.sun.r * 7.8 * look.sun.glowSize
  const sunTop = backdropLayerTop(Math.min(look.stars > 0 ? -300 - 3 * look.starSize : 0, look.sun.opacity > 0 ? look.sun.y - sunGlowR : 0, look.moon.opacity > 0 ? look.moon.y - 150 : 0,
    look.horizonGlow > 0 ? 860 - 420 * Math.sqrt(look.sun.glowSize) : 0))
  const auroraShown = aurora ? auroraOpacity(aurora, look.night) : 0
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {/* the sky: the Pátio's gradient from y = -200 down to the horizon; it reaches far above the world's top and, in its last colour, down to the layers' foot */}
      {look.radial.amount > 0
        ? <RadialSky look={look} left={-PAD_L - 4000 - worldW} width={2 * worldW + PAD_L + PAD_R + 8000} top={skyTop} height={BOTTOM - skyTop} cx={1350} />
        : <div className="absolute" style={{
          left: -PAD_L - 4000, width: worldW + PAD_L + PAD_R + 8000, top: skyTop, height: BOTTOM - skyTop,
          background: skyGradient(look, skyTop, -200, G - 60),
        }} />}
      {texture && <div className="absolute" style={{
        left: -PAD_L - 4000, width: worldW + PAD_L + PAD_R + 8000, top: -1600, height: G + 1600,
        backgroundImage: `url(${texture})`, backgroundSize: `${Math.round(1024 * look.textureLook.scale)}px ${Math.round(256 * look.textureLook.scale)}px`,
        mixBlendMode: look.textureLook.blend as React.CSSProperties["mixBlendMode"],
      }} />}
      <Layer p={SUN_DEPTH} w={wSun} id="sun" top={sunTop}>
        <defs>
          <radialGradient id="px-sun">
            <stop offset="0" stopColor={look.sun.glowColor} stopOpacity={Math.min(1, 0.55 * look.sun.glow + 0.05)} />
            <stop offset="0.35" stopColor={look.sun.glowColor} stopOpacity={Math.min(1, 0.22 * look.sun.glow)} />
            <stop offset="1" stopColor={look.sun.glowColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="px-moon">
            <stop offset="0" stopColor={look.sun.color} stopOpacity={Math.min(1, 0.55 * look.sun.glow + 0.05)} />
            <stop offset="0.35" stopColor={look.sun.color} stopOpacity={Math.min(1, 0.22 * look.sun.glow)} />
            <stop offset="1" stopColor={look.sun.color} stopOpacity="0" />
          </radialGradient>
          {/* Suavidade do sol: the disc stays whole up to its edge, then melts away */}
          <radialGradient id="px-disc">
            <stop offset="0" stopColor={look.sun.color} />
            <stop offset={Math.max(0, 1 - look.sun.soft) / (1 + look.sun.soft * 1.4)} stopColor={look.sun.color} />
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
          <circle cx={moonX} cy={look.moon.y} r={150} fill="url(#px-moon)" opacity={look.moon.opacity * 0.6} />
          <circle cx={moonX} cy={look.moon.y} r={30} fill="#eef0ff" opacity={look.moon.opacity} />
          <circle cx={moonX + 12} cy={look.moon.y - 6} r={26} fill={look.stops[0].color} opacity={look.moon.opacity * 0.85} />
        </>}
        {look.sun.opacity > 0 && <>
          <circle cx={sunX} cy={look.sun.y} r={sunGlowR} fill="url(#px-sun)" opacity={look.sun.opacity} />
          {look.sun.soft > 0
            ? <circle cx={sunX} cy={look.sun.y} r={look.sun.r * (1 + look.sun.soft * 1.4)} fill="url(#px-disc)" opacity={0.9 * look.sun.opacity} />
            : <circle cx={sunX} cy={look.sun.y} r={look.sun.r} fill={look.sun.color} opacity={0.9 * look.sun.opacity} />}
        </>}
      </Layer>
      {aurora && auroraShown > 0 && <AuroraLayer worldW={worldW} aurora={aurora} opacity={auroraShown} />}
      {shownClouds.length > 0 && <CloudLayer w={wCloud} opacity={Math.min(1, cloudAlpha)}>
        <style>{`
          .px-cloud { animation: px-drift var(--d) ease-in-out infinite alternate; }
          @keyframes px-drift { from { transform: translateX(calc(var(--a) * -1)); } to { transform: translateX(var(--a)); } }
          @media (prefers-reduced-motion: reduce) { .px-cloud { animation: none; } }
        `}</style>
        {shownClouds.map(({ c, i }) => <Cloud key={i} id={`px-c${i}`} c={cloudAlpha > 1 ? { ...c, o: Math.min(0.95, c.o * cloudAlpha) } : c} lit={cloudLit} shade={cloudShade} wind={cloudSet.wind / 100}
          sun={[sunX, look.sun.y]} blur={cloudSet.soft * 0.1 * Math.max(0.6, cSize / 100)}
          fray={cKind === "cumulus" ? cDetail * 0.9 * Math.pow(cSize / 100, 0.8) : 0} grain={Math.sqrt(Math.max(0.3, cSize / 100))} />)}
      </CloudLayer>}
      {ranges.map(r => {
        const fill = rangeFill(r.p)
        // the snow takes the sun's light, or the colour chosen for it
        const lit = mix(fill, mix("#ffffff", look.clouds.lit, 0.4), 0.8)
        const snowFill = mountains.snowTintAmount > 0 ? mix(lit, mountains.snowTint, mountains.snowTintAmount / 100) : lit
        const g = mountains.gradient / 100
        return (
          <Layer key={r.i} p={r.p} w={r.w} id={`range${r.i}` as BackdropLayerId} top={backdropLayerTop(r.top - mountains.outline / 100 * MOUNTAIN_OUTLINE_PX)}>
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
        <Layer p={FOREST_FAR.p} w={wTreesFar} id="forestFar">
          <path d={treeFar.trunks} fill={look.trees[0]} /><path d={treeFar.crowns} fill={look.trees[0]} />
          <rect x={0} y={FOREST_FAR.top} width={wTreesFar} height={BOTTOM - G + 42} fill={look.trees[0]} />
        </Layer>
        <Layer p={FOREST_NEAR.p} w={wTrees} id="forestNear">
          <path d={treeNear.trunks} fill={look.trees[1]} /><path d={treeNear.crowns} fill={look.trees[1]} />
        </Layer>
      </>}
      {snowfall && snowfall.amount > 0 && <Snowfall snow={snowfall} color={mix("#ffffff", look.clouds.lit, 0.25)} />}
    </div>
  )
})
