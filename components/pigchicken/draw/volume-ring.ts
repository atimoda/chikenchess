// "Volume pela distância": a see-through disc around the reticle of an instrument whose loudness follows the aim's
// distance; it grows from the minimum to the maximum with the volume, inside a faint ring at the item's maximum.
// Nothing shows when the minimum and the maximum are the same (no change with distance) or the hand holds no
// instrument.
import type { Combat } from "@/lib/pigchicken/combat"

const R0 = 6, R1 = 46 // px of the disc at volume 0 and 1

export function drawVolumeRing(ctx: CanvasRenderingContext2D, combat: Combat, rx: number, ry: number, tint: string) {
  if (!combat.held) return
  const d = combat.def()
  if (!d.instrument || Math.abs(d.volMax - d.volMin) < 1e-6) return
  const r = R0 + (R1 - R0) * combat.aimVolume
  const rMax = R0 + (R1 - R0) * Math.max(d.volMin, d.volMax)
  ctx.save()
  ctx.fillStyle = tint; ctx.strokeStyle = tint
  ctx.globalAlpha = 0.14
  ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.35; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = 0.12; ctx.setLineDash([3, 4])
  ctx.beginPath(); ctx.arc(rx, ry, rMax, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}
