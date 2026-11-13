// The aurora's curtains (Configurações do Pátio → Aurora), in the sun layer's units (x from the layer's left, y the
// world's). Pure: components/pigchicken/aurora.tsx paints each curtain once into a small canvas.
//
// A curtain is a row of vertical rays standing on a wavy foot line. Each ray is brightest just above its foot and
// fades upward into the top colour. Raios sets how different the rays are from each other (0: an even veil);
// Ondulação how deep the foot line folds.
import { rng } from './mountain-draw'
import type { AuroraParams } from './aurora'

export type AuroraRay = { x: number; y: number; h: number; a: number } // foot x and y, length, strength (0 to 1)
export type AuroraCurtain = {
  x: number; w: number // where it starts and how long it is
  base: number; amp: number; len: number // the foot line's middle height, how deep it folds, the rays' usual length
  f1: number; f2: number; ph1: number; ph2: number; seed: number
  top: number; bottom: number // the box that holds the rays (and their glow)
  sway: number; period: number; delay: number // the sway: how far (units), how long one way (s at 100%), its phase
}

// the gap between rays, in units
export const AURORA_RAY_STEP = 7
// the usual curtain length and ray length, and where the feet go from Altura no céu 0 (behind the mountains) to 100
export const AURORA_LEN = 1500, AURORA_RAY = 320, AURORA_FOOT = { low: 640, high: -120 } as const

type Shape = Pick<AuroraParams, 'bands' | 'width' | 'height' | 'lift' | 'wave' | 'shape'>

// smooth value noise in 0..1
const hash = (i: number, seed: number) => { const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return s - Math.floor(s) }
function noise(x: number, seed: number) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f)
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u
}

/** The curtains spread over the layer's x range `span` (the part of the sun layer a screen can show). */
export function auroraCurtains(span: [number, number], p: Shape): AuroraCurtain[] {
  const r = rng(53 + p.shape * 131)
  const [a, b] = span, slot = (b - a) / p.bands
  const foot = AURORA_FOOT.low + (AURORA_FOOT.high - AURORA_FOOT.low) * p.lift / 100
  const out: AuroraCurtain[] = []
  for (let i = 0; i < p.bands; i++) {
    const w = AURORA_LEN * (p.width / 100) * (0.75 + r() * 0.5)
    const mid = a + slot * (i + 0.5) + (r() - 0.5) * slot * 0.5
    const base = foot + (p.bands > 1 ? (r() - 0.5) * 140 : 0)
    const amp = 110 * (p.wave / 100) * (0.7 + r() * 0.6)
    const len = AURORA_RAY * (p.height / 100) * (0.8 + r() * 0.4)
    const pad = 24
    out.push({
      x: mid - w / 2, w, base, amp, len,
      f1: 0.8 + r() * 1.2, f2: 2.5 + r() * 3, ph1: r() * 6.283, ph2: r() * 6.283, seed: Math.floor(r() * 9973),
      top: base - amp * 1.5 - len * 1.25 - pad, bottom: base + amp + pad,
      sway: 20 + r() * 40, period: 9 + r() * 8, delay: -r() * 20,
    })
  }
  return out
}

/** The foot line's height at t (0 to 1 along the curtain): two folds and a slight arch up in the middle. */
export function auroraFoot(c: AuroraCurtain, t: number) {
  return c.base + c.amp * (0.65 * Math.sin(6.283 * t * c.f1 + c.ph1) + 0.35 * Math.sin(6.283 * t * c.f2 + c.ph2) - 0.5 * Math.sin(Math.PI * t))
}

/** A curtain's rays. rays: 0 to 1 (Raios). variant: another set of rays on the same feet (the shimmer's second copy). */
export function auroraRays(c: AuroraCurtain, rays: number, variant = 0): AuroraRay[] {
  const out: AuroraRay[] = [], n = Math.max(2, Math.round(c.w / AURORA_RAY_STEP)), seed = c.seed + variant * 7919
  for (let k = 0; k <= n; k++) {
    const t = k / n, x = c.x + t * c.w
    // fades in and out at the curtain's ends, brighter and dimmer stretches along it
    const env = Math.pow(Math.sin(Math.PI * t), 0.7) * (0.55 + 0.45 * noise(x / 380, c.seed + 1))
    const fine = noise(x / 16, seed + 2), mid = noise(x / 120, seed + 3)
    const a = env * (0.6 * (1 - rays) + (0.12 + 0.88 * fine * fine) * rays)
    const h = c.len * (0.9 * (1 - rays) + (0.45 + 0.75 * mid) * rays) * (0.7 + 0.3 * env)
    if (a > 0.01) out.push({ x, y: auroraFoot(c, t), h, a: Math.min(1, a) })
  }
  return out
}

/** The x range of the sun layer that the curtains spread over: around what a screen shows over the whole world. */
export function auroraSpan(worldW: number, padL: number, depth: number): [number, number] {
  return [padL - 700, padL + Math.ceil(worldW * (1 - depth)) + 3100]
}
