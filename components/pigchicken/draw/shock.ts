// The lightning weapons on the canvas: someone shocked (shaking, blinking in x-ray with its bones showing), the
// bolts that jump between them, the light of a special and a thrown staff on its way out and back.
import type { Combat } from "@/lib/pigchicken/combat"
import { boltPath, shockShake, shockXray } from "@/lib/pigchicken/shock"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import type { UndeadState } from "@/lib/pigchicken/undead"
import { zombieSpine } from "./creatures"
import { drawItem, type Ctx } from "./shared"

type Target = Combat["targets"][number]
const BONE = "#f1fbff", SOCKET = "#1b2438", GLOW = "#86d9ff"

// a scratch canvas that only grows: the shocked one is drawn there, then darkened inside its own shape
let scratch: HTMLCanvasElement | null = null
function scratchOf(size: number) {
  const el = scratch ?? (scratch = document.createElement("canvas"))
  if (el.width < size || el.height < size) { el.width = size; el.height = size }
  return el
}

// a standing skeleton, feet at (0, 0), `h` tall: skull, spine, ribs, arms, hips and legs
function humanBones(ctx: Ctx, h: number) {
  const u = h / 100
  ctx.lineWidth = Math.max(2, 3 * u)
  ctx.beginPath(); ctx.arc(1.5 * u, -87 * u, 10 * u, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(-4 * u, -80 * u, 10 * u, 6 * u)
  ctx.beginPath()
  ctx.moveTo(0, -74 * u); ctx.lineTo(0, -43 * u)
  for (let i = 0; i < 4; i++) { const y = (-70 + i * 6) * u, w = (12 - i * 1.3) * u; ctx.moveTo(-w, y + 3.5 * u); ctx.quadraticCurveTo(-w * 0.5, y - 1.5 * u, 0, y); ctx.quadraticCurveTo(w * 0.5, y - 1.5 * u, w, y + 3.5 * u) }
  ctx.moveTo(-13 * u, -72 * u); ctx.lineTo(-17 * u, -56 * u); ctx.lineTo(-13 * u, -41 * u)
  ctx.moveTo(13 * u, -72 * u); ctx.lineTo(17 * u, -56 * u); ctx.lineTo(14 * u, -41 * u)
  ctx.moveTo(-8 * u, -43 * u); ctx.lineTo(8 * u, -43 * u)
  ctx.moveTo(-6 * u, -43 * u); ctx.lineTo(-8 * u, -23 * u); ctx.lineTo(-6 * u, -3 * u); ctx.lineTo(-1 * u, -2 * u)
  ctx.moveTo(6 * u, -43 * u); ctx.lineTo(8 * u, -23 * u); ctx.lineTo(7 * u, -3 * u); ctx.lineTo(12 * u, -2 * u)
  ctx.stroke()
  ctx.shadowBlur = 0; ctx.fillStyle = SOCKET
  ctx.beginPath(); ctx.arc(-1.5 * u, -88 * u, 2.6 * u, 0, Math.PI * 2); ctx.arc(5.5 * u, -88 * u, 2.6 * u, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(-2 * u, -78.5 * u, 1.2 * u, 3.5 * u); ctx.fillRect(1 * u, -78.5 * u, 1.2 * u, 3.5 * u); ctx.fillRect(4 * u, -78.5 * u, 1.2 * u, 3.5 * u)
}
// a small creature's: nearly all skull, a short spine with two ribs and two little legs, inside a w × h box centred on (0, 0)
function blobBones(ctx: Ctx, w: number, h: number) {
  const rx = w * 0.3, ry = h * 0.27, cy = -h * 0.12
  ctx.lineWidth = Math.max(1.8, Math.min(w, h) * 0.055)
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(-rx * 0.5, cy + ry * 0.75, rx, ry * 0.5)
  ctx.beginPath()
  ctx.moveTo(0, cy + ry * 1.2); ctx.lineTo(0, h * 0.4)
  for (let i = 0; i < 2; i++) { const y = cy + ry * 1.45 + i * h * 0.09, rw = w * (0.2 - i * 0.04); ctx.moveTo(-rw, y + h * 0.04); ctx.quadraticCurveTo(0, y - h * 0.04, rw, y + h * 0.04) }
  ctx.moveTo(-w * 0.1, h * 0.4); ctx.lineTo(-w * 0.18, h * 0.5); ctx.moveTo(w * 0.1, h * 0.4); ctx.lineTo(w * 0.18, h * 0.5)
  ctx.stroke()
  ctx.shadowBlur = 0; ctx.fillStyle = SOCKET
  ctx.beginPath(); ctx.ellipse(-rx * 0.42, cy - ry * 0.05, rx * 0.24, ry * 0.3, 0, 0, Math.PI * 2); ctx.ellipse(rx * 0.42, cy - ry * 0.05, rx * 0.24, ry * 0.3, 0, 0, Math.PI * 2); ctx.fill()
  for (let i = -1; i <= 1; i++) ctx.fillRect(i * rx * 0.3 - rx * 0.04, cy + ry * 0.82, rx * 0.08, ry * 0.4)
}
function drawBones(ctx: Ctx, g: Target, x: number) {
  ctx.save()
  ctx.fillStyle = BONE; ctx.strokeStyle = BONE; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowColor = GLOW; ctx.shadowBlur = 8
  if (g.kind === "zombie") {
    // its frames lean and sway: the bones go from its feet to its head as they are right now
    const sp = zombieSpine(g)
    ctx.translate(x + sp.feet, g.y); ctx.rotate(Math.atan2(sp.head - sp.feet, g.h * 0.87)); ctx.scale(g.face < 0 ? -1 : 1, 1)
    humanBones(ctx, g.h)
  } else if (g.kind === "dummy") {
    ctx.translate(x, g.y); ctx.rotate(g.wobble); ctx.scale(g.face < 0 ? -1 : 1, 1)
    humanBones(ctx, g.h * 0.96)
  } else {
    // an undead lies turned as it fell; as a bird it is small and upright
    const u = g.kind === "undead" ? (g.data as UndeadState | undefined) : undefined
    ctx.translate(x, g.y - g.h / 2); if (u && !u.bird) ctx.rotate(u.angle)
    blobBones(ctx, g.w, g.h)
  }
  ctx.restore()
}

/**
 * Someone shocked: `paint` draws it as usual at screen x; it shakes, and while the x-ray blinks on it is drawn dark
 * and bluish, with a glow around it and its bones showing.
 */
export function drawShocked(ctx: Ctx, g: Target, x: number, now: number, paint: (ctx: Ctx, x: number) => void) {
  const s = g.shock!, shake = shockShake(s, now, g.id)
  ctx.save(); ctx.translate(shake.x, shake.y)
  if (!shockXray(s, now)) { paint(ctx, x); ctx.restore(); return }
  const size = Math.ceil(Math.max(g.w, g.h) * 2 + 160), el = scratchOf(size), c = el.getContext("2d")!
  const cy = g.y - g.h / 2
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.filter = "none"; c.shadowBlur = 0
  c.clearRect(0, 0, el.width, el.height)
  c.save(); c.translate(size / 2 - x, size / 2 - cy); paint(c, x); c.restore()
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = "none"
  c.globalCompositeOperation = "source-atop"; c.fillStyle = "rgba(48,60,92,0.9)"; c.fillRect(0, 0, size, size)
  c.globalCompositeOperation = "source-over"
  ctx.save(); ctx.shadowColor = GLOW; ctx.shadowBlur = 14
  ctx.drawImage(el, 0, 0, size, size, x - size / 2, cy - size / 2, size, size)
  ctx.restore()
  drawBones(ctx, g, x)
  ctx.restore()
}

// the bolts of a shock: jagged, forked, redrawn in another shape every few ms so that they flicker; violet outside,
// white inside. A special's are thicker; the thunder's comes down from the sky
export function drawBolts(ctx: Ctx, combat: Combat, camX: number, view: ViewRect, now: number) {
  if (!combat.bolts.length) return
  const frame = Math.floor(now * 22)
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"
  for (const b of combat.bolts) {
    if (b.t < 0) continue
    if (!intersectsView({ x: Math.min(b.x1, b.x2), y: Math.min(b.y1, b.y2), w: Math.abs(b.x2 - b.x1), h: Math.abs(b.y2 - b.y1) }, view, 80)) continue
    const k = b.t / b.life, alpha = Math.max(0, 1 - k * k), wide = b.sky ? 2.4 : b.special ? 1.6 : 1
    const { main, forks } = boltPath(b.x1 - camX, b.y1, b.x2 - camX, b.y2, b.seed, frame, b.sky ? 0.09 : 0.16)
    const line = (pts: { x: number; y: number }[]) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke() }
    ctx.globalAlpha = alpha
    ctx.shadowColor = "#a98bff"; ctx.shadowBlur = 16 * wide
    ctx.strokeStyle = "rgba(160,120,255,0.55)"; ctx.lineWidth = 7 * wide; line(main)
    ctx.shadowBlur = 6
    ctx.strokeStyle = "rgba(205,190,255,0.9)"; ctx.lineWidth = 3.2 * wide; line(main)
    ctx.lineWidth = 1.6 * wide; forks.forEach(line)
    ctx.shadowBlur = 0
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5 * wide; line(main)
    // where it lands: a little burst of light
    const r = (9 + 7 * Math.sin(now * 60 + b.seed)) * wide
    const glow = ctx.createRadialGradient(b.x2 - camX, b.y2, 0, b.x2 - camX, b.y2, r * 2)
    glow.addColorStop(0, "rgba(255,255,255,0.95)"); glow.addColorStop(0.4, "rgba(190,170,255,0.5)"); glow.addColorStop(1, "rgba(160,120,255,0)")
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(b.x2 - camX, b.y2, r * 2, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// a special lights the whole scene for a moment
export function drawSkyFlash(ctx: Ctx, combat: Combat, camX: number, view: ViewRect) {
  const f = combat.skyFlash
  if (f <= 0) return
  ctx.save(); ctx.fillStyle = `rgba(232,240,255,${Math.min(0.6, 0.6 * f)})`; ctx.fillRect(view.x - camX, view.y, view.w, view.h); ctx.restore()
}

// a staff thrown that comes back: it spins as it flies, with a faint streak of light behind it
export function drawFlights(ctx: Ctx, combat: Combat, camX: number, view: ViewRect) {
  for (const f of combat.flights) {
    if (!intersectsView({ x: f.x - 60, y: f.y - 60, w: 120, h: 120 }, view, 40)) continue
    const x = f.x - camX, len = Math.hypot(f.vx, f.vy) || 1, ux = f.vx / len, uy = f.vy / len
    ctx.save()
    ctx.lineCap = "round"; ctx.strokeStyle = "rgba(190,225,255,0.35)"; ctx.lineWidth = 10
    ctx.beginPath(); ctx.moveTo(x - ux * 60, f.y - uy * 60); ctx.lineTo(x - ux * 14, f.y - uy * 14); ctx.stroke()
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x - ux * 44, f.y - uy * 44); ctx.lineTo(x - ux * 14, f.y - uy * 14); ctx.stroke()
    ctx.translate(x, f.y); ctx.rotate(f.angle); drawItem(ctx, f.owned.item, 70, 38)
    ctx.restore()
  }
}
