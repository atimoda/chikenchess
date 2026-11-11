// Souls on their way to a counter: each one flies from where it was caught (the world) to the counter of the player
// who caught it (the screen), shrinking, with a glow and a streak in its colour. And the souls let out of the
// baskets, flying with their owners in the world. Each one is drawn as its entry in the library (./soul-art.ts).
import { ABDUCT_TIME, abductPoint } from "@/lib/pigchicken/souls"
import { type Combat } from "@/lib/pigchicken/combat"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { stageWidth } from "@/lib/stage-size"
import { soulCounterBox } from "./hud"
import { type Ctx } from "./shared"
import { drawSoulArt, soulLook } from "./soul-art"

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
    drawSoulArt(ctx, 0, 0, to.x >= from.x ? 1 : -1, Math.max(0, a.t) + a.soul.id * 0.37, soulLook(a.soul))
    ctx.restore()
  }
}

// a soul just out of the counter is small (as it was when it went in) and grows in this long (s)
const RELEASE_GROW = 0.35

// The souls flying free, in world px (inside the world's transform): each one as its entry, with a glow in its
// colour. tints: each local player's colour, given only when more than one plays here; a ring says whose it is.
export function drawFreedSouls(ctx: Ctx, combat: Combat, camX: number, view: ViewRect, tints?: Readonly<Record<string, string>> | null) {
  for (const f of combat.freedSouls) {
    if (!intersectsView({ x: f.x - 40, y: f.y - 40, w: 80, h: 80 }, view, 32)) continue
    const grow = Math.min(1, 0.3 + (f.t / RELEASE_GROW) * 0.7), tint = tints?.[f.owner]
    ctx.save()
    ctx.translate(f.x - camX, f.y); ctx.scale(grow, grow)
    ctx.globalAlpha = 0.2; ctx.fillStyle = f.soul.color
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill()
    if (tint) { ctx.globalAlpha = 0.75; ctx.strokeStyle = tint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke() }
    ctx.globalAlpha = 1
    drawSoulArt(ctx, 0, 0, f.face, f.t + f.soul.id * 0.37, soulLook(f.soul))
    ctx.restore()
  }
}
