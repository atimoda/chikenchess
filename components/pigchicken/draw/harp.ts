// The Harpa (a fixed instrument: lib/pigchicken/fixed-instruments.ts) drawn in the world: a pedal harp and its
// stool. The column stands on the far side, the soundbox leans from the base up to the player's shoulder and the
// neck curves between their tops; the strings hang from the neck to the soundbox, the Dó ones red and the Fá ones
// blue, like a real harp's. Free and with a player next to it, the hint to sit shows under it.
import { FIXED_INSTRUMENTS, type Seat } from "@/lib/pigchicken/fixed-instruments"
import { type Ctx } from "./shared"
import { t } from "@/lib/i18n"

// the hint under the fixed instrument (the Harpa, the Bateria) a local player is next to (set every frame): key is their grab bind's name
export const seatMarks = new Map<Seat, { key: string }>()

const GOLD = "#d9a441", GOLD_DARK = "#9a6a1c", WOOD = "#8a5a2b", WOOD_DARK = "#5e3a17", STRING = "rgba(244,236,216,0.55)"
const STRINGS = 22

// x: the element's middle on the screen; the floor is seat.y
export function drawHarp(ctx: Ctx, seat: Seat, x: number) {
  const f = seat.face, floor = seat.y, def = FIXED_INSTRUMENTS[seat.kind]
  const X = (dx: number) => x + f * dx, Y = (dy: number) => floor - dy
  ctx.save()
  ctx.lineCap = "round"; ctx.lineJoin = "round"
  // shadows on the floor
  ctx.fillStyle = "rgba(0,0,0,0.26)"
  ctx.beginPath(); ctx.ellipse(X(34), floor, 50, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(X(-def.stool), floor, 26, 4, 0, 0, Math.PI * 2); ctx.fill()

  // the stool: three legs and a round padded seat
  const sx = -def.stool, top = def.stoolTop
  ctx.strokeStyle = WOOD_DARK; ctx.lineWidth = 4
  for (const dx of [-15, 0, 15]) { ctx.beginPath(); ctx.moveTo(X(sx + dx * 0.6), Y(top - 4)); ctx.lineTo(X(sx + dx), Y(0)); ctx.stroke() }
  ctx.fillStyle = "#7b2d3a"; ctx.beginPath(); ctx.ellipse(X(sx), Y(top), 23, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#a8404f"; ctx.beginPath(); ctx.ellipse(X(sx), Y(top + 2), 21, 5, 0, 0, Math.PI * 2); ctx.fill()

  // the harp's triangle: A the base under the column, B the soundbox's top by her shoulder, C the column's top
  const A = { x: 64, y: 12 }, B = { x: -14, y: 150 }, C = { x: 64, y: 222 }
  // where a string hangs from on the neck (u: 0 by her shoulder … 1 at the column), and where it ends on the soundbox
  const neck = (u: number) => {
    const p0 = B, p1 = { x: 2, y: 232 }, p2 = { x: 40, y: 168 }, p3 = C, v = 1 - u
    return { x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x, y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y }
  }
  const board = (px: number) => { const k = (px - B.x) / (A.x - B.x); return B.y + (A.y - B.y) * k }
  // the strings, from the longest (the lowest, by the column) to the shortest
  for (let i = 0; i < STRINGS; i++) {
    const u = 0.93 - (i / (STRINGS - 1)) * 0.86, p = neck(u), L = i % 7
    ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y)); ctx.lineTo(X(p.x), Y(board(p.x) + 3))
    ctx.strokeStyle = L === 0 ? "#ff4d4d" : L === 3 ? "#3f6dff" : STRING
    ctx.lineWidth = L === 0 || L === 3 ? 1.3 : 1
    ctx.stroke()
  }
  // the soundbox: wide at the base, narrow at her shoulder
  ctx.beginPath()
  ctx.moveTo(X(A.x + 4), Y(A.y)); ctx.lineTo(X(B.x + 3), Y(B.y + 2)); ctx.lineTo(X(B.x - 6), Y(B.y - 4)); ctx.lineTo(X(A.x - 26), Y(A.y - 2)); ctx.closePath()
  ctx.fillStyle = WOOD; ctx.fill()
  ctx.strokeStyle = WOOD_DARK; ctx.lineWidth = 1.5; ctx.stroke()
  // the base and its feet
  ctx.fillStyle = GOLD_DARK
  ctx.beginPath(); ctx.roundRect(Math.min(X(22), X(76)), Y(13), 54, 13, 4); ctx.fill()
  ctx.fillStyle = GOLD
  ctx.beginPath(); ctx.roundRect(Math.min(X(26), X(72)), Y(16), 46, 6, 3); ctx.fill()
  // the column, with its crown
  ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(X(A.x), Y(A.y)); ctx.lineTo(X(C.x), Y(C.y)); ctx.stroke()
  ctx.strokeStyle = GOLD; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X(A.x - 1), Y(A.y)); ctx.lineTo(X(C.x - 1), Y(C.y)); ctx.stroke()
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(X(C.x), Y(C.y + 4), 9, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = GOLD_DARK; ctx.beginPath(); ctx.ellipse(X(C.x), Y(C.y - 5), 8, 3, 0, 0, Math.PI * 2); ctx.fill()
  // the neck (the harmonic curve)
  const curve = (w: number, color: string) => {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X(B.x), Y(B.y))
    ctx.bezierCurveTo(X(2), Y(232), X(40), Y(168), X(C.x), Y(C.y)); ctx.stroke()
  }
  curve(9, GOLD_DARK); curve(5, GOLD)

  drawSeatHint(ctx, seat, x)
  ctx.restore()
}

// free and with a local player next to it: the hint to sit, under the instrument
export function drawSeatHint(ctx: Ctx, seat: Seat, x: number) {
  const mark = seatMarks.get(seat)
  if (!mark || seat.by !== null) return
  const text = mark.key ? t("{key}: tocar", { key: mark.key }) : t("tocar")
  ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText(text, x, seat.y + 16)
  ctx.fillStyle = GOLD; ctx.fillText(text, x, seat.y + 16)
}
