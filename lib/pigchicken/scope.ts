// The luneta of a weapon (the Sniper's, and any item with `scope` on): while Atirar is held she aims through it. The
// aim's state eases in over `scopeTime` seconds (0 = out, 1 = all the way in) and, with it, the camera leans toward
// the aim (`scopePan` px) and pulls back (`scopeView` × what the screen shows), the stick's / keys' reticle reaches
// `scopeReach` × farther, and a lupa (`lensSize` px of radius, `lensZoom` × magnification) rides on the reticle.
// Pure functions; parquinho.tsx runs them each frame for each local player.
import type { ItemDef } from './items'

export type ScopeParams = Pick<ItemDef, 'scope' | 'scopeTime' | 'scopeReach' | 'scopePan' | 'scopeView' | 'lensSize' | 'lensZoom'>

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Whether this frame aims through the luneta: an item with it, Atirar held, a shooting item (not a staff). */
export function scopeOn(d: ScopeParams & Pick<ItemDef, 'mag' | 'meleeOnly'>, armed: boolean, fire: boolean) {
  return armed && fire && d.scope && d.mag > 0 && !d.meleeOnly
}

/** The aim going in (toward 1) or out (toward 0), a linear step of dt / time; time 0 is instant. */
export function scopeStep(k: number, on: boolean, time: number, dt: number) {
  const target = on ? 1 : 0
  if (!(time > 0)) return target
  const next = k + Math.sign(target - k) * dt / time
  return target > k ? Math.min(target, next) : Math.max(target, next)
}

/** The eased amount of k (smooth in and out), what everything else follows. */
export const scopeEase = (k: number) => { const t = clamp(k, 0, 1); return t * t * (3 - 2 * t) }

/** × the reticle's distance with a stick or the keys (the mouse's reticle stays on the cursor). */
export const scopeReachAt = (d: ScopeParams, k: number) => 1 + (d.scopeReach - 1) * scopeEase(k)

/** The camera's zoom while aiming: the player's zoom over `scopeView` (never past `floor`, the whole Pátio). */
export function scopeZoom(view: number, d: ScopeParams | null, k: number, floor = 0) {
  if (!d || !(k > 0)) return view
  const more = 1 + (Math.max(1, d.scopeView) - 1) * scopeEase(k)
  return Math.max(Math.min(view, floor), view / more)
}

/** How far the camera leans toward the aim (world px: x right, y down), up to `scopePan` px along the aim. */
export function scopeLean(d: ScopeParams | null, k: number, angle: number) {
  if (!d || !(k > 0) || !(d.scopePan > 0)) return { x: 0, y: 0 }
  const r = d.scopePan * scopeEase(k)
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
}

/** A lean kept to what still shows her: between -below and above (each never less than 0). */
export const leanWithin = (v: number, below: number, above: number) => clamp(v, -Math.max(0, below), Math.max(0, above))

/** The lupa now: its radius on the screen (px) and magnification, or null with none (no size, no zoom or aim out). */
export function lensAt(d: ScopeParams, k: number) {
  const e = scopeEase(k)
  if (!(d.lensSize > 0) || !(d.lensZoom > 1) || e <= 0.01) return null
  return { r: d.lensSize * (0.35 + 0.65 * e), zoom: 1 + (d.lensZoom - 1) * e, alpha: Math.min(1, e * 1.4) }
}
