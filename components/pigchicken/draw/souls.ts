// Souls on their way to a counter: each one flies from where it was caught (the world) to the counter of the player
// who caught it (the screen), shrinking, with a glow and a streak in its colour.
import { BIRDS } from "@/lib/pigchicken/birds"
import { ABDUCT_TIME, abductPoint } from "@/lib/pigchicken/souls"
import { type Combat } from "@/lib/pigchicken/combat"
import { stageWidth } from "@/lib/stage-size"
import { drawBirdArt } from "./creatures"
import { soulCounterBox } from "./hud"
import { type Ctx } from "./shared"

const UNDEAD_BODY = "#8d9096"

// rows: each local player's row in the counters' stack; cam: the world's camera and zoom this frame.
// Drawn in screen px, over the counters
export function drawAbductions(ctx: Ctx, combat: Combat, rows: ReadonlyMap<string, number>, offset: { x: number; y: number } | undefined, cam: { x: number; y: number; zoom: number }) {
  const cx = stageWidth() / 2, cy = window.innerHeight / 2
  for (const a of combat.abductions) {
    const box = soulCounterBox(rows.get(a.owner) ?? 0, offset)
    const from = { x: cx + (a.x - cam.x - cx) * cam.zoom, y: cy + (a.y + cam.y - cy) * cam.zoom }
    const to = { x: box.x + box.size / 2, y: box.y + box.size / 2 }
    // waiting its turn, it hovers where it was caught
    const k = Math.max(0, a.t) / ABDUCT_TIME
    const p = abductPoint(from, to, k)
    const size = p.scale * (cam.zoom + (1 - cam.zoom) * k)
    ctx.save()
    ctx.fillStyle = ctx.strokeStyle = a.soul.color
    // the streak behind it: thinner and fainter the further back
    ctx.lineCap = "round"
    let prev = p
    for (let i = 1; i <= 6; i++) {
      const q = abductPoint(from, to, k - i * 0.025)
      ctx.globalAlpha = 0.34 - i * 0.05; ctx.lineWidth = (11 - i * 1.5) * size
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke()
      prev = q
    }
    ctx.globalAlpha = 0.3
    ctx.beginPath(); ctx.arc(p.x, p.y, 16 * size, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
    ctx.translate(p.x, p.y); ctx.scale(size, size)
    const dead = a.soul.state === "dead"
    drawBirdArt(ctx, 0, 0, to.x >= from.x ? 1 : -1, Math.max(0, a.t) + a.soul.id * 0.37, a.soul.bird ? BIRDS[a.soul.bird] : null, dead ? UNDEAD_BODY : a.soul.color, dead, a.soul.color)
    ctx.restore()
  }
}
