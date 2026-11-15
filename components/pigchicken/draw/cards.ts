// The decks' cards out in the world (lib/pigchicken/cards.ts): a white card with its rank and suit, spinning while it
// flies and swaying where it floats. A red deck's is a red diamond; a blue deck's is blue, with a note sign in
// its own note's colour.
import type { Combat } from "@/lib/pigchicken/combat"
import { CARD_RANKS, burstsAlone, cardBob } from "@/lib/pigchicken/cards"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { roundRect } from "./hud"
import type { Ctx } from "./shared"

const W = 24, H = 34
export function drawCards(ctx: Ctx, combat: Combat, camX: number, view: ViewRect) {
  for (const c of combat.cards) {
    if (!intersectsView({ x: c.x - 30, y: c.y - 30, w: 60, h: 60 }, view, 20)) continue
    const parked = c.phase === "park"
    // the deck's ink: red, or blue with the note's own colour kept for the glow, the flash and the note sign
    const deck = c.note ? "#2f6fde" : "#d63a3a"
    const ink = c.note ? c.note.color : deck
    const lit = c.fuse !== undefined
    ctx.save()
    ctx.translate(c.x - camX, c.y + (parked ? cardBob(c.t, c.seed) : 0))
    // flying it spins; floating it leans a little, each one its own way
    ctx.rotate(parked ? (c.seed - 0.5) * 0.5 + Math.sin(c.t * 1.7 + c.seed * 9) * 0.06 : c.t * 16 * (Math.cos(c.angle) >= 0 ? 1 : -1))
    // the 7 and the Ás glow on their way: they burst when they arrive
    if (burstsAlone(c.rank)) { ctx.shadowColor = ink; ctx.shadowBlur = 14 }
    roundRect(ctx, -W / 2, -H / 2, W, H, 4)
    // about to burst in a chain: it flashes in its ink
    ctx.fillStyle = lit ? ink : "#fbfbf6"; ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = 1.5; ctx.strokeStyle = deck; ctx.stroke()
    ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.fillStyle = lit ? "#fbfbf6" : deck
    ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif"; ctx.fillText(CARD_RANKS[c.rank] ?? "", 0, -6)
    ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif"
    if (c.note && !lit) { ctx.lineWidth = 2.5; ctx.strokeStyle = "#1c2a4a"; ctx.lineJoin = "round"; ctx.strokeText("♪", 0, 8); ctx.fillStyle = ink }
    ctx.fillText(c.note ? "♪" : "♦", 0, 8)
    ctx.restore()
  }
}
