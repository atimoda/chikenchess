// Souls on their way to a Gaiola: each one flies from where it was caught (the world) to the cage of the player who
// caught it that takes it (the screen), shrinking, with a glow and a streak in its colour. The birds a Passaguá
// without a Gaiola scared off fly the same way to where they land. And the souls let out of the cages, flying with
// their owners in the world. Each one is drawn as its entry in the library (./soul-art.ts).
import { ABDUCT_TIME, abductPoint, type Abduction, type Soul } from "@/lib/pigchicken/souls"
import { type Combat } from "@/lib/pigchicken/combat"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { stageWidth } from "@/lib/stage-size"
import { type Ctx } from "./shared"
import { drawChickStill } from "./cages"
import { drawSoulArt, soulLook } from "./soul-art"

type Cam = { x: number; y: number; zoom: number }
// one on its way from `from` to `to` (screen px), t s after it left; end: how big it is when it gets there (1: as in
// the world, 0: the little it is in a cage)
function drawFlight(ctx: Ctx, soul: Soul, from: { x: number; y: number }, to: { x: number; y: number }, t: number, zoom: number, end: number) {
  // waiting its turn, it hovers where it was caught
  const k = Math.max(0, t) / ABDUCT_TIME
  const p = abductPoint(from, to, k)
  const size = end ? (1 - 0.45 * Math.sin(Math.PI * Math.min(1, k))) * zoom : p.scale * (zoom + (1 - zoom) * k)
  ctx.save()
  ctx.fillStyle = ctx.strokeStyle = soul.color
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
  // a chick stays a chick all the way
  if (soul.species === "chick") drawChickStill(ctx, soul.chick ?? 0, 0, 22, 44, to.x >= from.x ? 1 : -1)
  else drawSoulArt(ctx, 0, 0, to.x >= from.x ? 1 : -1, Math.max(0, t) + soul.id * 0.37, soulLook(soul))
  ctx.restore()
}
const onScreen = (x: number, y: number, cam: Cam) => { const cx = stageWidth() / 2, cy = window.innerHeight / 2; return { x: cx + (x - cam.x - cx) * cam.zoom, y: cy + (y + cam.y - cy) * cam.zoom } }
// target: where the cage each one goes to is on the screen; cam: the world's camera and zoom this frame.
// Drawn in screen px, over the cages
export function drawAbductions(ctx: Ctx, combat: Combat, target: (a: Abduction) => { x: number; y: number }, cam: Cam) {
  for (const a of combat.abductions) drawFlight(ctx, a.soul, onScreen(a.x, a.y, cam), target(a), a.t, cam.zoom, 0)
}
// the scared birds, from where the Passaguá met them to where they land (both in the world)
export function drawScares(ctx: Ctx, combat: Combat, cam: Cam) {
  for (const s of combat.scares) drawFlight(ctx, s.soul, onScreen(s.x, s.y, cam), onScreen(s.tx, s.ty, cam), s.t, cam.zoom, 1)
}

// a soul just out of its Gaiola is small (as it was when it went in) and grows in this long (s)
const RELEASE_GROW = 0.35

// The souls flying free, in world px (inside the world's transform): each one as its entry, with a glow in its
// colour. tints: each local player's colour, given only when more than one plays here; a ring says whose it is.
// Online, the other browsers' souls fly here too (combat.netSouls), each with a ring in its browser's colour (netTint).
export function drawFreedSouls(ctx: Ctx, combat: Combat, camX: number, view: ViewRect, tints?: Readonly<Record<string, string>> | null, netTint?: (pid: number) => string | undefined) {
  const one = (f: { x: number; y: number; face: number; t: number; soul: Soul; k?: number }, tint: string | undefined) => {
    // k: a portal sucks it in with its owner (nothing shows once inside)
    if ((f.k ?? 1) <= 0.01 || !intersectsView({ x: f.x - 40, y: f.y - 40, w: 80, h: 80 }, view, 32)) return
    const grow = Math.min(1, 0.3 + (f.t / RELEASE_GROW) * 0.7) * (f.k ?? 1)
    ctx.save()
    ctx.translate(f.x - camX, f.y); ctx.scale(grow, grow)
    ctx.globalAlpha = 0.2; ctx.fillStyle = f.soul.color
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill()
    if (tint) { ctx.globalAlpha = 0.75; ctx.strokeStyle = tint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke() }
    ctx.globalAlpha = 1
    drawSoulArt(ctx, 0, 0, f.face, f.t + f.soul.id * 0.37, soulLook(f.soul))
    ctx.restore()
  }
  for (const f of combat.freedSouls) one(f, tints?.[f.owner])
  // one this browser asked for is on its way out: the little cloud is all that shows
  for (const m of combat.netSouls) if (m.asked === null) one(m, netTint?.(m.pid))
}
