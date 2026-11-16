// The Bateria (a fixed instrument: lib/pigchicken/fixed-instruments.ts) drawn in the world, seen from the side: the
// throne, then (away from the player) the Caixa and the Chimbal on their stands, the Bumbo lying with its pedal and
// the two toms on top of it, the Surdo on its legs and the cymbals over everything (Splash, Ataque, Condução and
// the China, its edge turned up). A piece just hit moves: a cymbal rocks on its stand, a drum's head flashes.
import { FIXED_INSTRUMENTS, type Seat } from "@/lib/pigchicken/fixed-instruments"
import type { DrumPiece } from "@/lib/pigchicken/drum-kit"
import { drawSeatHint } from "./harp"
import { type Ctx } from "./shared"

const SHELL = "#b23a2e", SHELL_DARK = "#7a2219", HEAD = "#ece6d6", METAL = "#b9bec6", METAL_DARK = "#7d838c", BRONZE = "#e3b23c", BRONZE_DARK = "#b0801c"

// x: the element's middle on the screen; the floor is seat.y; pulse: how long ago (s) and how hard a piece was hit
export function drawDrumKit(ctx: Ctx, seat: Seat, x: number, pulse: (piece: DrumPiece) => { age: number; vel: number } | null) {
  const f = seat.face, floor = seat.y, def = FIXED_INSTRUMENTS[seat.kind]
  const X = (dx: number) => x + f * dx, Y = (dy: number) => floor - dy
  // how much a piece still moves from its last hit (0 … 1) and its swing right now
  const live = (p: DrumPiece) => { const h = pulse(p); return h && h.age >= 0 && h.age < 1.2 ? { k: Math.exp(-h.age * 5) * (0.4 + 0.6 * h.vel), t: h.age } : { k: 0, t: 0 } }
  ctx.save()
  ctx.lineCap = "round"; ctx.lineJoin = "round"
  // shadows on the floor
  ctx.fillStyle = "rgba(0,0,0,0.26)"
  ctx.beginPath(); ctx.ellipse(X(34), floor, 96, 6, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(X(-def.stool), floor, 26, 4, 0, 0, Math.PI * 2); ctx.fill()

  // the throne: a tripod and a round padded seat
  const sx = -def.stool, top = def.stoolTop
  ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 3
  for (const dx of [-15, 0, 15]) { ctx.beginPath(); ctx.moveTo(X(sx), Y(top - 14)); ctx.lineTo(X(sx + dx), Y(0)); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(X(sx), Y(top - 14)); ctx.lineTo(X(sx), Y(top - 2)); ctx.stroke()
  ctx.fillStyle = "#23262b"; ctx.beginPath(); ctx.ellipse(X(sx), Y(top), 23, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#3a3f47"; ctx.beginPath(); ctx.ellipse(X(sx), Y(top + 2), 21, 5, 0, 0, Math.PI * 2); ctx.fill()

  const stand = (dx: number, h: number, spread = 13) => {
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(X(dx), Y(h)); ctx.lineTo(X(dx), Y(12)); ctx.stroke()
    for (const s of [-spread, spread]) { ctx.beginPath(); ctx.moveTo(X(dx), Y(16)); ctx.lineTo(X(dx + s), Y(0)); ctx.stroke() }
  }
  // a cymbal: a thin bronze lens with its bell, rocking on its stand after a hit; up: the China's edge turned up
  const cymbal = (piece: DrumPiece, dx: number, h: number, rx: number, tilt: number, up = false) => {
    const m = live(piece), rock = Math.sin(m.t * 26) * m.k * 0.32
    ctx.save()
    ctx.translate(X(dx), Y(h)); ctx.rotate((tilt + rock) * f)
    ctx.fillStyle = BRONZE_DARK; ctx.beginPath(); ctx.ellipse(0, 1.5, rx, 3.6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = BRONZE; ctx.beginPath(); ctx.ellipse(0, 0, rx, 3, 0, 0, Math.PI * 2); ctx.fill()
    if (up) { ctx.strokeStyle = BRONZE; ctx.lineWidth = 2.5; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * (rx - 6), 0); ctx.lineTo(s * rx, -5); ctx.stroke() } }
    ctx.fillStyle = m.k > 0.2 ? "#fff3c4" : "#f0cf7a"; ctx.beginPath(); ctx.ellipse(0, -2.5, rx * 0.2, 2.6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  // a drum from the side: its shell between two hoops, the head on top flashing after a hit
  const drum = (piece: DrumPiece, dx: number, h: number, w: number, depth: number, tilt = 0) => {
    const m = live(piece)
    ctx.save()
    ctx.translate(X(dx), Y(h)); ctx.rotate(tilt * f)
    ctx.fillStyle = SHELL; ctx.beginPath(); ctx.roundRect(-w / 2, -depth / 2, w, depth, 3); ctx.fill()
    ctx.fillStyle = SHELL_DARK; ctx.fillRect(-w / 2, depth / 2 - 4, w, 4)
    ctx.fillStyle = METAL; ctx.fillRect(-w / 2 - 1.5, -depth / 2 - 1, w + 3, 3.5); ctx.fillRect(-w / 2 - 1.5, depth / 2 - 2.5, w + 3, 3.5)
    ctx.fillStyle = m.k > 0.15 ? "#ffffff" : HEAD; ctx.fillRect(-w / 2 + 1, -depth / 2 - 2.5 - m.k * 1.5, w - 2, 2.5)
    ctx.restore()
  }

  // behind everything: the stands of the Ataque, the China and the Condução, and the Surdo's legs
  stand(-6, 150); stand(112, 158, 11); stand(84, 124, 11)
  ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 2.5
  for (const dx of [70, 92, 112]) { ctx.beginPath(); ctx.moveTo(X(dx), Y(52)); ctx.lineTo(X(dx + (dx - 91) * 0.25), Y(0)); ctx.stroke() }
  // the Chimbal: its stand and pedal, the two cymbals one over the other
  stand(-22, 98, 10)
  ctx.strokeStyle = METAL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(-34), Y(2)); ctx.lineTo(X(-20), Y(9)); ctx.stroke()
  { const m = live("hat"); ctx.fillStyle = BRONZE_DARK; ctx.beginPath(); ctx.ellipse(X(-22), Y(94), 22, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = m.k > 0.2 ? "#fff3c4" : BRONZE; ctx.beginPath(); ctx.ellipse(X(-22), Y(98 + m.k * 2), 22, 3, 0, 0, Math.PI * 2); ctx.fill() }
  // the Caixa on its stand
  stand(-44, 56, 12)
  drum("snare", -44, 62, 44, 15, -0.06)
  // the Bumbo: a big shell lying on its side, the head toward the audience, its spurs and its pedal with the beater
  { const m = live("kick"), cx = 30, cy = 46, R = 43
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 3
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X(cx + s * 24), Y(16)); ctx.lineTo(X(cx + s * 40), Y(0)); ctx.stroke() }
    ctx.fillStyle = SHELL_DARK; ctx.beginPath(); ctx.arc(X(cx), Y(cy), R + 2, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = METAL; ctx.beginPath(); ctx.arc(X(cx), Y(cy), R, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = SHELL; ctx.beginPath(); ctx.arc(X(cx), Y(cy), R - 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = m.k > 0.15 ? "#ffffff" : HEAD; ctx.beginPath(); ctx.arc(X(cx), Y(cy), R - 9 + m.k * 2, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.arc(X(cx + 14), Y(cy - 14), 8, 0, Math.PI * 2); ctx.fill()
    // the pedal and its beater, swinging into the head on a hit
    ctx.strokeStyle = METAL; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(X(-30), Y(2)); ctx.lineTo(X(-14), Y(8)); ctx.stroke()
    const bx = -14 + m.k * 6
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(-16), Y(6)); ctx.lineTo(X(bx), Y(40)); ctx.stroke()
    ctx.fillStyle = HEAD; ctx.beginPath(); ctx.arc(X(bx), Y(42), 4.5, 0, Math.PI * 2); ctx.fill() }
  // the toms on the Bumbo, each on its arm
  ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 3
  for (const dx of [14, 46]) { ctx.beginPath(); ctx.moveTo(X(30), Y(90)); ctx.lineTo(X(dx), Y(100)); ctx.stroke() }
  drum("tom1", 12, 112, 32, 22, -0.12); drum("tom2", 48, 112, 34, 24, 0.1)
  // the Surdo
  drum("floor", 91, 62, 46, 40)
  // the cymbals over the kit
  cymbal("splash", 30, 140, 14, -0.08)
  cymbal("crash", -6, 152, 30, -0.14)
  { const m = live("bell"), r = live("ride"); cymbal(m.k > r.k ? "bell" : "ride", 84, 126, 32, 0.1) }
  cymbal("china", 112, 160, 27, 0.16, true)
  drawSeatHint(ctx, seat, x)
  ctx.restore()
}
