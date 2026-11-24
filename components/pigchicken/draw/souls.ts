// Souls on their way to a Gaiola: each one flies from where it was caught (the world) to the cage of the player who
// caught it that takes it (the screen), shrinking, with a glow and a streak in its colour. The birds a Passaguá
// without a Gaiola scared off fly the same way to where they land. And the souls let out of the cages, flying with
// their owners in the world. Each one is drawn as its entry in the library (./soul-art.ts).
import { ABDUCT_TIME, abductPoint, type Abduction, type Soul } from "@/lib/pigchicken/souls"
import { type Combat } from "@/lib/pigchicken/combat"
import { POOP } from "@/lib/pigchicken/poop"
import { soulPerched } from "@/lib/pigchicken/soul-roam"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { stageHeight, stageWidth } from "@/lib/stage-size"
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
const onScreen = (x: number, y: number, cam: Cam) => { const cx = stageWidth() / 2, cy = stageHeight() / 2; return { x: cx + (x - cam.x - cx) * cam.zoom, y: cy + (y + cam.y - cy) * cam.zoom } }
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
  // still: resting somewhere, its wings folded
  const one = (f: { x: number; y: number; face: number; t: number; soul: Soul; k?: number }, tint: string | undefined, still = false) => {
    // k: a portal sucks it in with its owner (nothing shows once inside)
    if ((f.k ?? 1) <= 0.01 || !intersectsView({ x: f.x - 40, y: f.y - 40, w: 80, h: 80 }, view, 32)) return
    const grow = Math.min(1, 0.3 + (f.t / RELEASE_GROW) * 0.7) * (f.k ?? 1)
    ctx.save()
    ctx.translate(f.x - camX, f.y); ctx.scale(grow, grow)
    ctx.globalAlpha = 0.2; ctx.fillStyle = f.soul.color
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill()
    if (tint) { ctx.globalAlpha = 0.75; ctx.strokeStyle = tint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke() }
    ctx.globalAlpha = 1
    drawSoulArt(ctx, 0, 0, f.face, f.t + f.soul.id * 0.37, soulLook(f.soul), false, still)
    ctx.restore()
  }
  for (const f of combat.freedSouls) one(f, tints?.[f.owner], soulPerched(f.roam))
  // one this browser asked for is on its way out: the little cloud is all that shows
  for (const m of combat.netSouls) if (m.asked === null) one(m, netTint?.(m.pid))
}

// The birds' droppings (lib/pigchicken/poop.ts), in world px: the ones falling, the marks they left on the floor and
// the stains on the chickens they hit (each goes with its chicken and fades)
const POOP_COLOR = "#f4f1e6", POOP_SHADE = "#b9b29a"
export function drawPoops(ctx: Ctx, combat: Combat, camX: number, view: ViewRect) {
  if (!combat.poops.length && !combat.poopMarks.length) return
  const seen = (x: number, y: number) => intersectsView({ x: x - 16, y: y - 16, w: 32, h: 32 }, view, 16)
  ctx.save()
  for (const m of combat.poopMarks) {
    if (!seen(m.x, m.y)) continue
    ctx.globalAlpha = Math.min(1, m.left / (POOP.mark * 0.4)) * 0.9; ctx.fillStyle = POOP_COLOR
    ctx.beginPath(); ctx.ellipse(m.x - camX, m.y - 1.5, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (const p of combat.poops) {
    if (!seen(p.x, p.y)) continue
    // a drop, longer the faster it falls
    const x = p.x - camX, len = Math.min(10, p.vy * 0.012)
    ctx.fillStyle = POOP_COLOR
    ctx.beginPath(); ctx.ellipse(x, p.y - len / 2, POOP.r * 0.7, POOP.r * 0.7 + len / 2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = POOP_SHADE
    ctx.beginPath(); ctx.arc(x, p.y + 1, POOP.r * 0.45, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/** The stains the droppings left on the chickens: over them (the canvas in front of the players). */
export function drawPoopStains(ctx: Ctx, combat: Combat, camX: number, view: ViewRect) {
  const seen = (x: number, y: number) => intersectsView({ x: x - 16, y: y - 16, w: 32, h: 32 }, view, 16)
  ctx.save()
  for (const s of combat.poopStains) {
    if (!seen(s.x, s.y)) continue
    const x = s.x - camX
    ctx.globalAlpha = Math.min(1, s.left / (POOP.stain * 0.3)); ctx.fillStyle = POOP_COLOR
    ctx.beginPath(); ctx.ellipse(x, s.y, 8, 5, 0, 0, Math.PI * 2); ctx.fill()
    // it runs down a little
    ctx.beginPath(); ctx.ellipse(x + 3, s.y + 7, 2.5, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = POOP_SHADE
    ctx.beginPath(); ctx.arc(x - 2, s.y - 1, 2, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
