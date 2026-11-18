// The Ativadores de grid de campo minado (lib/pigchicken/mine-activator.ts) drawn in the world: a big blue button on
// a dark plate, with a ring over its dome split in two bars, the music one filling up its left side in blue and the
// damage one up its right side in red. The fuller one makes the dome glow. While it waits ("incólume") it is a
// small grey button with no bars, standing where it stood.
import { MINE_ACTIVATOR_SMALL } from "@/lib/pigchicken/mine-activator"
import { mineActivatorStore } from "@/lib/pigchicken/mine-activator-store"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { type Ctx } from "./shared"

export function drawMineActivators(ctx: Ctx, camX: number, view: ViewRect, colors: { blue: string; red: string }) {
  const boxes = mineActivatorStore.boxes
  if (!boxes.length) return
  const armed = mineActivatorStore.armed(), t = performance.now() / 1000
  for (const b of boxes) {
    if (!intersectsView(b, view, 32)) continue
    const bars = mineActivatorStore.bars(b.id)
    const music = Math.min(1, bars.notes / b.params.notes), damage = Math.min(1, bars.damage / b.params.damage)
    const k = armed ? 1 : MINE_ACTIVATOR_SMALL, w = b.w * k, h = b.h * k
    const cx = b.x + b.w / 2 - camX, bottom = b.y + b.h
    ctx.save()
    if (!armed) ctx.globalAlpha = 0.75
    // the plate
    const plateH = h * 0.18, plateTop = bottom - plateH
    ctx.fillStyle = armed ? "#2b3440" : "#3a3f46"
    ctx.beginPath(); ctx.roundRect(cx - w * 0.46, plateTop, w * 0.92, plateH, Math.min(8, plateH / 2)); ctx.fill()
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(cx - w * 0.44, plateTop + 2, w * 0.88, Math.max(1, plateH * 0.18))
    // the dome on its bezel
    const rx = w * 0.34, ry = h * 0.5, base = plateTop
    ctx.fillStyle = armed ? "#17202b" : "#2c3036"
    ctx.beginPath(); ctx.ellipse(cx, base, rx + w * 0.04, ry + h * 0.04, 0, Math.PI, Math.PI * 2); ctx.fill()
    const full = Math.max(music, damage)
    if (armed && full > 0) { ctx.shadowColor = music >= damage ? colors.blue : colors.red; ctx.shadowBlur = 10 + 30 * full * (0.8 + 0.2 * Math.sin(t * 6)) }
    const g = ctx.createRadialGradient(cx - rx * 0.35, base - ry * 0.7, ry * 0.05, cx, base - ry * 0.3, ry * 1.1)
    if (armed) { g.addColorStop(0, "#d8ecff"); g.addColorStop(0.35, `rgb(${70 + 60 * full},${150 + 40 * full},255)`); g.addColorStop(1, "#1b4fb8") }
    else { g.addColorStop(0, "#c9d1da"); g.addColorStop(0.4, "#7d8794"); g.addColorStop(1, "#4a525c") }
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(cx, base, rx, ry, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill()
    ctx.shadowBlur = 0
    if (armed) {
      // the two bars, around the dome: music up its left side, damage up its right side
      const r1 = rx + w * 0.09, r2 = ry + h * 0.09, lw = Math.max(4, w * 0.035)
      ctx.lineWidth = lw; ctx.lineCap = "round"
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.beginPath(); ctx.ellipse(cx, base - lw / 2, r1, r2, 0, Math.PI, Math.PI * 2); ctx.stroke()
      if (music > 0) { ctx.strokeStyle = colors.blue; ctx.beginPath(); ctx.ellipse(cx, base - lw / 2, r1, r2, 0, Math.PI, Math.PI + (Math.PI / 2) * music); ctx.stroke() }
      if (damage > 0) { ctx.strokeStyle = colors.red; ctx.beginPath(); ctx.ellipse(cx, base - lw / 2, r1, r2, 0, Math.PI * 2 - (Math.PI / 2) * damage, Math.PI * 2); ctx.stroke() }
    }
    ctx.restore()
  }
}
