// The luneta's lupa: a round glass on the reticle that shows what is under it bigger (lib/pigchicken/scope.ts).
// What the canvas draws (aliens, zombies, bonecos, items, shots, notes) is drawn again inside it, magnified around the
// reticle; behind it, the glass darkens what is not drawn again (the scenery and the characters' layer).
import { type ViewRect } from "@/lib/pigchicken/viewport"
import { type Ctx } from "./shared"

export type Lens = { r: number; zoom: number; alpha: number }

/**
 * Draws the lupa centred on (x, y) with radius `lens.r` (in the canvas's current units). `paint(view)` draws the world
 * as usual; it runs magnified around (x, y) and clipped to the glass, with `view` the world rect it covers (world px,
 * from `toWorld`, which turns a canvas point into the world's).
 */
export function drawLens(ctx: Ctx, x: number, y: number, lens: Lens, toWorld: (x: number, y: number) => { x: number; y: number }, paint: (view: ViewRect) => void) {
  const { r, zoom: m, alpha } = lens
  if (!(r > 0) || !(m > 0)) return
  const half = r / m, a = toWorld(x - half, y - half)
  const view = { x: a.x, y: a.y, w: half * 2, h: half * 2 }
  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip()
  ctx.globalAlpha = alpha
  ctx.fillStyle = "rgba(6,12,18,0.66)"; ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.globalAlpha = 1
  ctx.save()
  ctx.translate(x, y); ctx.scale(m, m); ctx.translate(-x, -y)
  paint(view)
  ctx.restore()
  // the glass's edge darkens a little toward the rim
  const shade = ctx.createRadialGradient(x, y, r * 0.6, x, y, r)
  shade.addColorStop(0, "rgba(0,0,0,0)"); shade.addColorStop(1, `rgba(0,0,0,${0.35 * alpha})`)
  ctx.fillStyle = shade; ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
  // the rim: dark outside, a thin light line inside
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.7)"
  ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.45)"
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}
