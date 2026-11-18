// The Corrente-gancho on the canvas (lib/pigchicken/grapple.ts): the chain out from her hand to the hook, the chain
// spinning in her hand while Atirar charges, and the orange dot where the hook would latch.
import { type Combat } from "@/lib/pigchicken/combat"
import { HOOK_IRON, HOOK_PATHS } from "@/lib/pigchicken/art"
import { spinEnd } from "@/lib/pigchicken/grapple"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { type Ctx } from "./shared"

type P = { x: number; y: number }
// rig units of one link (× her size), and of the chain spinning in her hand
const LINK = 9, SPIN_LEN = 100
const paths = typeof Path2D === "undefined" ? null : {
  eye: new Path2D(HOOK_PATHS.eye), bend: new Path2D(`${HOOK_PATHS.shank} ${HOOK_PATHS.bend}`), barb: new Path2D(HOOK_PATHS.barb),
}

/** A chain of iron links from a to b: rings seen flat and side on, one after the other. k: her size. */
export function drawChain(ctx: Ctx, a: P, b: P, k: number) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy)
  if (len < 1) return
  const link = LINK * k, n = Math.max(1, Math.round(len / link)), step = len / n, ang = Math.atan2(dy, dx)
  ctx.save()
  ctx.translate(a.x, a.y); ctx.rotate(ang); ctx.lineCap = "round"
  for (let i = 0; i < n; i++) {
    const x = step * (i + 0.5)
    if (i % 2 === 0) {
      ctx.beginPath(); ctx.ellipse(x, 0, step * 0.68, link * 0.4, 0, 0, Math.PI * 2)
      ctx.strokeStyle = HOOK_IRON.edge; ctx.lineWidth = 3.2 * k; ctx.stroke()
      ctx.strokeStyle = HOOK_IRON.ring; ctx.lineWidth = 1.8 * k; ctx.stroke()
    } else {
      ctx.beginPath(); ctx.moveTo(x - step * 0.62, 0); ctx.lineTo(x + step * 0.62, 0)
      ctx.strokeStyle = HOOK_IRON.edge; ctx.lineWidth = 3.6 * k; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x - step * 0.45, -0.5 * k); ctx.lineTo(x + step * 0.45, -0.5 * k)
      ctx.strokeStyle = HOOK_IRON.hi; ctx.lineWidth = 0.8 * k; ctx.stroke()
    }
  }
  ctx.restore()
}

/** The hook with its eye at `at`, pointing along `angle`; `flip` turns its bend to the other side. */
export function drawHookTip(ctx: Ctx, at: P, angle: number, k: number, flip = false) {
  if (!paths) return
  ctx.save()
  ctx.translate(at.x, at.y); ctx.rotate(angle); ctx.scale(k, flip ? -k : k)
  ctx.lineCap = "round"; ctx.lineJoin = "round"
  ctx.strokeStyle = HOOK_IRON.edge; ctx.lineWidth = 2.6; ctx.stroke(paths.eye)
  ctx.lineWidth = 5.2; ctx.stroke(paths.bend)
  ctx.strokeStyle = HOOK_IRON.ring; ctx.lineWidth = 3; ctx.stroke(paths.bend)
  ctx.fillStyle = HOOK_IRON.ring; ctx.fill(paths.barb); ctx.strokeStyle = HOOK_IRON.edge; ctx.lineWidth = 1; ctx.stroke(paths.barb)
  ctx.restore()
}

/** The hooks out in the world (world pass): the chain from the hand to the hook, and the hook. */
export function drawHooks(ctx: Ctx, combat: Combat, camX: number, view: ViewRect) {
  for (const h of combat.hooks) {
    const l = Math.min(h.x, h.hx), t = Math.min(h.y, h.hy)
    if (!intersectsView({ x: l - 40, y: t - 40, w: Math.abs(h.x - h.hx) + 80, h: Math.abs(h.y - h.hy) + 80 }, view, 40)) continue
    const hand = { x: h.hx - camX, y: h.hy }, tip = { x: h.x - camX, y: h.y }
    const out = Math.atan2(tip.y - hand.y, tip.x - hand.x)
    drawChain(ctx, hand, tip, h.scale * 1.15)
    drawHookTip(ctx, tip, out, h.scale * 1.4, Math.cos(out) < 0)
  }
}

/** The chain spinning in her hand while Atirar charges (screen pass): a circle around the hand seen a little from the side, the hook at its end. */
export function drawHookSpin(ctx: Ctx, hand: P, spin: number, k: number, face: number) {
  const end = spinEnd(hand, spin, SPIN_LEN * k, face)
  // (the far half of the turn goes behind the hand: a little fainter)
  const back = Math.sin(spin) < 0
  ctx.save()
  if (back) ctx.globalAlpha = 0.85
  drawChain(ctx, hand, end, k * 1.15)
  const out = Math.atan2(end.y - hand.y, end.x - hand.x)
  drawHookTip(ctx, end, out, k * 1.4, Math.cos(out) < 0)
  ctx.restore()
}

/** Where the hook would latch: a small orange dot. */
export function drawHookDot(ctx: Ctx, at: P) {
  ctx.save()
  ctx.beginPath(); ctx.arc(at.x, at.y, 5.5, 0, Math.PI * 2)
  ctx.fillStyle = "#ff8a1f"; ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(60,25,0,0.75)"; ctx.stroke()
  ctx.restore()
}
