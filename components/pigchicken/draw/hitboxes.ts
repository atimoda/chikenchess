// The "Hit-boxes" layer (debug, the header's layers menu): what the game tests hits against, in screen units.
// Yellow: each player's blow sector while it lasts (centre, aim, arc and reach of inSector; the 20 px core always
// counts). Red: the targets' boxes (aliens, zombies, dummies, the undead, the temple's buttons). Cyan: each player's
// box (what explosions and incoming notes hit). Thin rings: shots and notes in flight with their radius.
import type { Combat } from "@/lib/pigchicken/combat"

export type HitboxPlayer = { id: string; shoulder: { x: number; y: number }; box: { l: number; r: number; t: number; b: number } }

export function drawHitboxes(ctx: CanvasRenderingContext2D, combat: Combat, camX: number, camY: number, players: HitboxPlayer[]) {
  ctx.save()
  ctx.lineWidth = 1.5
  // the targets: centred on x, standing on y
  ctx.strokeStyle = "#ff4d4d"; ctx.fillStyle = "rgba(255,77,77,0.08)"
  for (const t of combat.targets) {
    if (t.deadT > 0) continue
    const x = t.x - t.w / 2 - camX, y = t.y - t.h + camY
    ctx.fillRect(x, y, t.w, t.h); ctx.strokeRect(x, y, t.w, t.h)
  }
  // the players' boxes
  ctx.strokeStyle = "#4cc9f0"; ctx.setLineDash([5, 4])
  for (const p of players) ctx.strokeRect(p.box.l, p.box.t, p.box.r - p.box.l, p.box.b - p.box.t)
  ctx.setLineDash([])
  // shots and notes in flight
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1
  for (const b of combat.bullets) { ctx.beginPath(); ctx.arc(b.x - camX, b.y + camY, Math.max(2, b.size), 0, Math.PI * 2); ctx.stroke() }
  for (const n of combat.noteShots) { ctx.beginPath(); ctx.arc(n.x - camX, n.y + camY, Math.max(2, n.size), 0, Math.PI * 2); ctx.stroke() }
  // the blows
  ctx.lineWidth = 2
  for (const p of players) {
    combat.use(p.id)
    const sw = combat.swing
    if (!sw) continue
    const { x, y } = p.shoulder
    const landed = sw.hit
    ctx.strokeStyle = landed ? "#ffd166" : "rgba(255,209,102,0.6)"
    ctx.fillStyle = landed ? "rgba(255,209,102,0.22)" : "rgba(255,209,102,0.08)"
    ctx.beginPath()
    if (sw.arc >= Math.PI * 2 - 1e-6) ctx.arc(x, y, sw.reach, 0, Math.PI * 2)
    else { ctx.moveTo(x, y); ctx.arc(x, y, sw.reach, sw.angle - sw.arc / 2, sw.angle + sw.arc / 2); ctx.closePath() }
    ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.stroke()
  }
  combat.use("p1")
  ctx.restore()
}
