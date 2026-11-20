"use client"

// Aurora (Configurações do Pátio → Aurora): a few curtains of light in the sun's layer (depth 0.97), over the stars,
// sun and moon and behind the clouds and the mountains. Each curtain is painted once into a small canvas, at a
// fraction of its size (the upscale keeps it soft), and only moved by CSS: the sway (a transform) and, at Alta, a
// second set of rays fading in and out over the first (opacity). Nothing is repainted while it moves.
// Quality (lib/quality.ts): Alta paints at half size with the shimmer; Média at a third, sway only; Baixa at a
// quarter, standing still. Curtains off the screen are hidden (watchCameraRegion).
import { memo, useEffect, useMemo, useRef } from "react"
import { followParallax, watchCameraRegion } from "@/lib/pigchicken/live-camera"
import { BACKDROP_PAD_L, SUN_DEPTH } from "@/lib/pigchicken/backdrop-layers"
import { AURORA_RAY_STEP, auroraCurtains, auroraRays, auroraSpan, type AuroraCurtain } from "@/lib/pigchicken/aurora-draw"
import type { AuroraParams } from "@/lib/pigchicken/aurora"
import { mix } from "@/lib/pigchicken/sky"
import type { GraphicsLevel } from "@/lib/quality"
import { useQuality } from "@/components/quality-preferences"

const PAD_L = BACKDROP_PAD_L
// canvas pixels per unit, and the blur (units) painted into it, by graphics quality
const LOOK: Record<GraphicsLevel, { scale: number; blur: number; shimmer: boolean; move: boolean }> = {
  high: { scale: 0.5, blur: 3, shimmer: true, move: true },
  medium: { scale: 0.34, blur: 3, shimmer: false, move: true },
  low: { scale: 0.25, blur: 0, shimmer: false, move: false },
  // not drawn at Baixíssima (the backdrop keeps only the sky); here for completeness
  lowest: { scale: 0.25, blur: 0, shimmer: false, move: false },
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

// one set of rays into a canvas: each ray a soft column, bright above its foot, fading up into the top colour
function paint(canvas: HTMLCanvasElement, c: AuroraCurtain, rays: number, variant: number, scale: number, blur: number, foot: string, top: string, gain: number) {
  const W = Math.max(1, Math.ceil(c.w * scale)), H = Math.max(1, Math.ceil((c.bottom - c.top) * scale))
  const off = document.createElement("canvas")
  off.width = W; off.height = H
  const o = off.getContext("2d"), ctx = canvas.getContext("2d")
  if (!o || !ctx) return
  const midColor = mix(foot, top, 0.45), rw = AURORA_RAY_STEP * 1.5 * scale
  for (const r of auroraRays(c, rays, variant)) {
    const x = (r.x - c.x) * scale, y0 = (r.y - c.top + 10) * scale, y1 = (r.y - c.top - r.h) * scale, a = Math.min(1, r.a * gain)
    const g = o.createLinearGradient(0, y0, 0, y1)
    g.addColorStop(0, rgba(foot, 0)); g.addColorStop(0.07, rgba(foot, a)); g.addColorStop(0.3, rgba(foot, a * 0.75))
    g.addColorStop(0.6, rgba(midColor, a * 0.4)); g.addColorStop(1, rgba(top, 0))
    o.fillStyle = g
    o.fillRect(x - rw / 2, y1, rw, y0 - y1)
  }
  canvas.width = W; canvas.height = H
  ctx.clearRect(0, 0, W, H)
  if (blur > 0) ctx.filter = `blur(${(blur * scale).toFixed(2)}px)`
  ctx.drawImage(off, 0, 0)
  ctx.filter = "none"
}

function Curtain({ c, a, quality }: { c: AuroraCurtain; a: AuroraParams; quality: GraphicsLevel }) {
  const box = useRef<HTMLDivElement>(null), one = useRef<HTMLCanvasElement>(null), two = useRef<HTMLCanvasElement>(null)
  const look = LOOK[quality], h = c.bottom - c.top
  const gain = Math.max(1, a.amount / 100), rays = a.rays / 100
  useEffect(() => {
    if (one.current) paint(one.current, c, rays, 0, look.scale, look.blur, a.color, a.top, gain * (look.shimmer ? 0.8 : 1))
    if (two.current) paint(two.current, c, rays, 1, look.scale, look.blur, a.color, a.top, gain * 0.7)
  }, [c, rays, a.color, a.top, gain, look])
  useEffect(() => box.current ? watchCameraRegion(box.current, { x: -PAD_L + c.x - c.sway, y: c.top, w: c.w + c.sway * 2, h }, SUN_DEPTH) : undefined, [c, h])
  const moving = look.move && a.speed > 0, speed = a.speed / 100
  return <div ref={box} className={moving ? "px-aurora absolute" : "absolute"} style={{
    left: c.x, top: c.top, width: c.w, height: h, willChange: moving ? "transform" : undefined,
    ["--d" as string]: `${(c.period / Math.max(speed, 0.05)).toFixed(1)}s`, ["--a" as string]: `${c.sway.toFixed(0)}px`, animationDelay: `${c.delay.toFixed(1)}s`,
  }}>
    <canvas ref={one} className="absolute inset-0 block h-full w-full" />
    {look.shimmer && <canvas ref={two} className={moving ? "px-aurora-b absolute inset-0 block h-full w-full" : "absolute inset-0 block h-full w-full"}
      style={{ ["--s" as string]: `${(c.period * 0.37 / Math.max(speed, 0.05)).toFixed(1)}s`, animationDelay: `${(c.delay * 0.6).toFixed(1)}s`, opacity: moving ? undefined : 0.5 }} />}
  </div>
}

/** The aurora's layer: a plain box at the sun's depth holding one canvas (two at Alta) per curtain. */
export const AuroraLayer = memo(function AuroraLayer({ worldW, aurora, opacity }: { worldW: number; aurora: AuroraParams; opacity: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const quality = useQuality().graphics
  useEffect(() => ref.current ? followParallax(ref.current, SUN_DEPTH) : undefined, [])
  const { bands, width, height, lift, wave, shape } = aurora
  const curtains = useMemo(() => auroraCurtains(auroraSpan(worldW, PAD_L, SUN_DEPTH), { bands, width, height, lift, wave, shape }), [worldW, bands, width, height, lift, wave, shape])
  return <div ref={ref} aria-hidden="true" className="absolute" style={{ left: -PAD_L, top: 0, width: 0, height: 0, opacity }}>
    <style>{`
      .px-aurora { transform-origin: 50% 100%; animation: px-aurora-sway var(--d) ease-in-out infinite alternate; }
      .px-aurora-b { animation: px-aurora-shimmer var(--s) ease-in-out infinite alternate; }
      @keyframes px-aurora-sway { from { transform: translateX(calc(var(--a) * -1)) skewX(-2.5deg); } to { transform: translateX(var(--a)) skewX(2.5deg); } }
      @keyframes px-aurora-shimmer { from { opacity: 0; } to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .px-aurora, .px-aurora-b { animation: none; } }
    `}</style>
    {/* faint with the rest while a Poste or Torre is being pinned to a layer (backdrop-pin.tsx) */}
    <div data-backdrop-layer="aurora" className="absolute left-0 top-0">
      {curtains.map((c, i) => <Curtain key={i} c={c} a={aurora} quality={quality} />)}
    </div>
  </div>
})
