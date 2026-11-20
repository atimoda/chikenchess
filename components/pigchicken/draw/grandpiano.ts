// The Piano de cauda (a fixed instrument: lib/pigchicken/fixed-instruments.ts) drawn in the world, seen from the
// side: the bench on the player's side, the keyboard facing her, the long black case on three legs with the pedal
// lyre under the keys, the music stand and the lid propped open on its stick. Free and with a player next to it,
// the hint to sit shows under it.
import { FIXED_INSTRUMENTS, type Seat } from "@/lib/pigchicken/fixed-instruments"
import { drawSeatHint } from "./harp"
import { type Ctx } from "./shared"

const CASE = "#16161a", CASE_LIGHT = "#2c2c33", GLOSS = "rgba(255,255,255,0.16)", BRASS = "#d4a84a", IVORY = "#f2ecdc", WOOD = "#5b3a22"

// x: the element's middle on the screen; the floor is seat.y
export function drawGrandPiano(ctx: Ctx, seat: Seat, x: number) {
  const f = seat.face, floor = seat.y, def = FIXED_INSTRUMENTS[seat.kind]
  const X = (dx: number) => x + f * dx, Y = (dy: number) => floor - dy
  const rect = (x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.lineTo(X(x0), Y(y1)); ctx.closePath() }
  ctx.save()
  ctx.lineCap = "round"; ctx.lineJoin = "round"
  // shadows on the floor
  ctx.fillStyle = "rgba(0,0,0,0.26)"
  ctx.beginPath(); ctx.ellipse(X(30), floor, 130, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(X(-def.stool), floor, 28, 4, 0, 0, Math.PI * 2); ctx.fill()

  // the bench: a padded top on four legs
  const sx = -def.stool, top = def.stoolTop
  ctx.strokeStyle = CASE; ctx.lineWidth = 4
  for (const dx of [-18, 18]) { ctx.beginPath(); ctx.moveTo(X(sx + dx), Y(top - 6)); ctx.lineTo(X(sx + dx * 1.1), Y(0)); ctx.stroke() }
  ctx.fillStyle = CASE; rect(sx - 26, top - 8, sx + 26, top); ctx.fill()
  ctx.fillStyle = "#3a2a22"; rect(sx - 24, top, sx + 24, top + 4); ctx.fill()

  // the legs (front, middle, tail) and the pedal lyre under the keys
  ctx.fillStyle = CASE
  for (const [dx, w] of [[-84, 9], [52, 9], [128, 9]] as const) {
    ctx.beginPath(); ctx.moveTo(X(dx - w / 2), Y(64)); ctx.lineTo(X(dx + w / 2), Y(64)); ctx.lineTo(X(dx + w / 2 - 1.5), Y(5)); ctx.lineTo(X(dx - w / 2 + 1.5), Y(5)); ctx.closePath(); ctx.fill()
    ctx.fillStyle = BRASS; ctx.beginPath(); ctx.ellipse(X(dx), Y(3), 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = CASE
  }
  ctx.strokeStyle = CASE; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(X(-62), Y(64)); ctx.lineTo(X(-62), Y(14)); ctx.moveTo(X(-52), Y(64)); ctx.lineTo(X(-52), Y(14)); ctx.stroke()
  ctx.fillStyle = CASE; rect(-68, 10, -46, 16); ctx.fill()
  ctx.fillStyle = BRASS
  for (const dx of [-66, -57, -48]) { ctx.beginPath(); ctx.ellipse(X(dx + 1), Y(10), 3.2, 1.6, 0, 0, Math.PI * 2); ctx.fill() }

  // the case: a long slab, the tail rounded on the far side
  ctx.fillStyle = CASE
  ctx.beginPath()
  ctx.moveTo(X(-100), Y(64)); ctx.lineTo(X(118), Y(64))
  ctx.quadraticCurveTo(X(150), Y(64), X(150), Y(78)); ctx.quadraticCurveTo(X(150), Y(94), X(118), Y(94))
  ctx.lineTo(X(-100), Y(94)); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = GLOSS; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(X(-94), Y(88)); ctx.lineTo(X(112), Y(88)); ctx.stroke()
  // the keybed sticking out toward her, the keys on it and the fallboard behind them
  ctx.fillStyle = CASE_LIGHT; rect(-116, 70, -96, 84); ctx.fill()
  ctx.fillStyle = IVORY; rect(-116, 84, -96, 89); ctx.fill()
  ctx.fillStyle = CASE; for (const dx of [-113, -108, -102]) { rect(dx, 87, dx + 2.4, 90.5); ctx.fill() }
  ctx.fillStyle = CASE; rect(-97, 84, -90, 100); ctx.fill()

  // the music stand, leaning back toward the lid
  ctx.fillStyle = WOOD
  ctx.beginPath(); ctx.moveTo(X(-86), Y(96)); ctx.lineTo(X(-78), Y(96)); ctx.lineTo(X(-66), Y(128)); ctx.lineTo(X(-74), Y(130)); ctx.closePath(); ctx.fill()
  ctx.fillStyle = "#e9e2cf"; ctx.beginPath(); ctx.moveTo(X(-82), Y(100)); ctx.lineTo(X(-78), Y(100)); ctx.lineTo(X(-69), Y(124)); ctx.lineTo(X(-73), Y(125)); ctx.closePath(); ctx.fill()

  // the lid, propped open on its stick from the far side
  ctx.strokeStyle = BRASS; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(X(70), Y(94)); ctx.lineTo(X(98), Y(156)); ctx.stroke()
  ctx.fillStyle = CASE
  ctx.beginPath()
  ctx.moveTo(X(-60), Y(96)); ctx.lineTo(X(-56), Y(100)); ctx.lineTo(X(146), Y(170)); ctx.lineTo(X(150), Y(164)); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = GLOSS; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(X(-50), Y(101)); ctx.lineTo(X(140), Y(166)); ctx.stroke()

  drawSeatHint(ctx, seat, x)
  ctx.restore()
}
