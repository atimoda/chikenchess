// Instrumentos fixos: an instrument that stands in the Pátio (Modo editor → Música) instead of being carried. A
// player next to it sits at it with Pegar and, while she sits, cannot move: only the aim and Atirar count, so all
// her attention goes to playing. Pegar again or Pular gets her up. One player at a time.
// Today: the Harpa (a pedal harp with its stool), played on the Cordas soltas (lib/pigchicken/instrument-scales.ts),
// and the Bateria (an acoustic kit with its throne), played on the scale Bateria (lib/pigchicken/drum-kit.ts).
// Pure rules and sizes; the Pátio's combat keeps who sits where (lib/pigchicken/combat.ts), the engine holds her
// still in the seated pose (lib/chicken/engine.ts) and the art is in components/pigchicken/draw/harp.ts and
// components/pigchicken/draw/drumkit.ts.
import type { ItemId } from './items'

export type FixedKind = 'pedalharp' | 'drumkit'
// box: the element's size in the layout (its art's); item: the sheet she plays with (Itens → Instrumentos fixos);
// stool: where she sits, px from the element's middle toward the side she sits on, and how high the stool's top is
// over the floor at her size 1; reach: how near (px each side of the stool) she has to be to sit
export const FIXED_INSTRUMENTS: Record<FixedKind, { label: string; item: ItemId; box: { w: number; h: number }; stool: number; stoolTop: number; reach: number }> = {
  pedalharp: { label: 'Harpa', item: 'pedalharp', box: { w: 190, h: 250 }, stool: 52, stoolTop: 40, reach: 46 },
  drumkit: { label: 'Bateria', item: 'drumkit', box: { w: 260, h: 190 }, stool: 84, stoolTop: 40, reach: 46 },
}
export const FIXED_KINDS = Object.keys(FIXED_INSTRUMENTS) as FixedKind[]
export const isFixedKind = (k: string): k is FixedKind => k in FIXED_INSTRUMENTS
export const HARP_BOX = FIXED_INSTRUMENTS.pedalharp.box
export const DRUMKIT_BOX = FIXED_INSTRUMENTS.drumkit.box
export const isFixedItem = (id: ItemId) => Object.values(FIXED_INSTRUMENTS).some(f => f.item === id)

// a fixed instrument in the world: x its middle, y the floor it stands on; face: the side its player looks at
// (1: she sits on its left, looking right); by: the player sitting at it (null: free). Online, `net` is another
// browser's player sitting there, and `yield` says that one keeps the seat when a player here sat at the same time
export type Seat = { id: string; kind: FixedKind; x: number; y: number; face: 1 | -1; by: string | null; net?: boolean; yield?: boolean }

/** Where her feet are while she sits at it (world px). */
export const seatSpot = (s: Pick<Seat, 'kind' | 'x' | 'y' | 'face'>) => ({ x: s.x - s.face * FIXED_INSTRUMENTS[s.kind].stool, y: s.y })

/** Whether a body standing at (x, y) is near enough to sit at it (reachX / reachY: the body's own pickup reach). */
export function seatInReach(s: Seat, x: number, y: number, reachX: number, reachY: number) {
  const at = seatSpot(s)
  return Math.abs(at.x - x) <= reachX + FIXED_INSTRUMENTS[s.kind].reach && y >= at.y - reachY - 70 && y <= at.y + reachY
}

/** The seat a player can take: the nearest free one in reach (null: none). */
export function nearestSeat(seats: readonly Seat[], x: number, y: number, reachX: number, reachY: number): Seat | null {
  let best: Seat | null = null
  for (const s of seats) {
    if (s.by !== null || s.net || !seatInReach(s, x, y, reachX, reachY)) continue
    if (!best || Math.abs(seatSpot(s).x - x) < Math.abs(seatSpot(best).x - x)) best = s
  }
  return best
}

// how near a seat's place another browser's seated chicken has to be to be the one sitting at it (px)
const NET_SEAT_X = 30, NET_SEAT_Y = 40
/**
 * Online: the seats another browser's player sits at. `list`: the other browsers' chickens in the seated pose (world
 * px; first: its browser comes before this one, so it keeps a seat both took at the same time).
 */
export function markNetSeats(seats: readonly Seat[], list: readonly { x: number; y: number; first: boolean }[]) {
  for (const s of seats) {
    const at = seatSpot(s), hit = list.find(c => Math.abs(c.x - at.x) <= NET_SEAT_X && Math.abs(c.y - at.y) <= NET_SEAT_Y)
    s.net = !!hit; s.yield = !!hit?.first
  }
}
