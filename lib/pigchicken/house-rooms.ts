// The inside of a house (docs/mechanics/patio/houses.md): a room between its walls, under the lowest point
// of its roof, with one floor for each storey, entered and left through its door with Usar. Whoever is inside is in
// that room only: the floors and walls of the Pátio outside are not hers, and the ones here are no one else's. The
// measures come from the façade's own (lib/pigchicken/houses.ts). The art is in components/pigchicken/house-art.tsx,
// who is where in house-rooms-store.ts, the frame's loop in components/pigchicken/house-doors.tsx.
import { HOUSE_WALL, houseOpenings, houseRoof, openingGeometry, type HouseParams } from './houses'
import type { LayoutElement } from './layout'

export type RoomRect = { l: number; t: number; r: number; b: number }
// floors: the y of each storey's floor above the ground one, from the top down
export type HouseInterior = { room: RoomRect; door: RoomRect; floors: number[] }
// the same in the world's units, with the house's id
export type HouseRoom = HouseInterior & { id: string }

// the least height of a storey (in % of the house) for it to have a floor of its own
const STOREY_MIN = 9
// how thick the walls and the ceiling are for what is fired inside, and the ground floor for her (world px)
export const ROOM_WALL = 160

// in % of the house's box; null without a door
export function houseInterior(p: HouseParams): HouseInterior | null {
  const opening = houseOpenings(p).find(o => o.kind === 'door')
  if (!opening) return null
  const d = openingGeometry(p, opening)
  const top = Math.max(...houseRoof(p).map(point => point[1])) + 1
  const first = p.pitch + 10, storey = (94 - first) / p.floors
  const floors: number[] = []
  for (let f = 1; f < p.floors; f++) {
    const y = first + f * storey
    if (y - (floors.at(-1) ?? top) >= STOREY_MIN && 100 - y >= STOREY_MIN) floors.push(y)
  }
  return { room: { l: HOUSE_WALL.left, t: top, r: HOUSE_WALL.right, b: HOUSE_WALL.bottom }, door: { l: d.left, t: d.y, r: d.right, b: 100 }, floors }
}

type HouseElement = Pick<LayoutElement, 'id' | 'kind' | 'x' | 'y' | 'w' | 'h' | 'rot' | 'layer' | 'solid' | 'hidden' | 'depth' | 'params'>

// a house she can go into: with a door, standing behind the characters, with its floors on and not part of the
// scenery far away
export function houseRoom(el: HouseElement): HouseRoom | null {
  if (el.kind !== 'house' || !el.params.house || el.depth || el.hidden || el.rot || !el.solid) return null
  if (el.layer === 'front' || el.layer === 'frontGhost') return null
  const inside = houseInterior(el.params.house)
  if (!inside) return null
  const rect = (r: RoomRect): RoomRect => ({ l: el.x + r.l * el.w / 100, t: el.y + r.t * el.h / 100, r: el.x + r.r * el.w / 100, b: el.y + r.b * el.h / 100 })
  return { id: el.id, room: rect(inside.room), door: rect(inside.door), floors: inside.floors.map(y => el.y + y * el.h / 100) }
}

export const houseRooms = (elements: readonly HouseElement[]) => elements.flatMap(el => houseRoom(el) ?? [])

// her feet (world units) and her size
export type RoomBody = { x: number; y: number; scale: number }

// standing at the door: her middle between its sides and her feet on the ground floor (a step above or below it)
export function atDoor(room: HouseRoom, body: RoomBody) {
  const reach = 10 * body.scale
  return body.x >= room.door.l - reach && body.x <= room.door.r + reach && Math.abs(body.y - room.door.b) <= 26 * body.scale + 4
}

// the door she is at, when there is more than one the nearest
export function doorAt(rooms: readonly HouseRoom[], body: RoomBody): HouseRoom | null {
  let best: HouseRoom | null = null, bestD = Infinity
  for (const room of rooms) {
    if (!atDoor(room, body)) continue
    const d = Math.abs(body.x - (room.door.l + room.door.r) / 2)
    if (d < bestD) { best = room; bestD = d }
  }
  return best
}

// still in the room: something else took her away (a portal, being born again, the house moved) when she is not
export function withinRoom(room: HouseRoom, body: RoomBody) {
  const m = 60 + 40 * body.scale
  return body.x >= room.room.l - m && body.x <= room.room.r + m && body.y >= room.room.t - m && body.y <= room.room.b + m
}

// One press of Usar for one character (a rising edge that began while she stood at that door): she goes in, or out
// when she is inside that house. Holding Usar while walking up to the door does nothing.
export function createDoorGate() {
  let was = false, armed: string | null = null
  return {
    update(at: string | null, using: boolean): boolean {
      const press = using && !was
      was = using
      // the door has to be met with Usar up
      if (!using) armed = at
      return press && !!at && armed === at
    },
  }
}

// While a player of this screen is inside a house the scenery outside goes dark: how much of its light is left, and
// the CSS filter of a layer of scenery with it (`filter`: the one it already has, 'none' without one)
export const HOUSE_DUSK = 0.4
export const houseDuskFilter = (filter: string, dark: boolean) => (dark ? `${filter === 'none' ? '' : `${filter} `}brightness(${HOUSE_DUSK})` : filter)

// what another browser says of its players (online): the house of each slot ('' outside); null when it is not that
export function cleanNetHouses(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length > 4) return null
  return raw.every(v => typeof v === 'string' && v.length <= 80) ? (raw as string[]) : null
}

// the walls of a room as the boxes that stop what is fired inside it (lib/pigchicken/combat.ts Box), and its floor
export function roomShotWalls(room: HouseRoom) {
  const { l, t, r, b } = room.room, T = ROOM_WALL
  const wall = (box: RoomRect) => ({ ...box, solid: true, shots: true, notes: true })
  return { boxes: [wall({ l: l - T, t: t - T, r: l, b: b + T }), wall({ l: r, t: t - T, r: r + T, b: b + T }), wall({ l: l - T, t: t - T, r: r + T, b: t })], groundY: b }
}

// For her body the walls and the ceiling are the engine's own limits, moved to the room (`setBounds`); the ground
// floor is a hard slab under it (the engine's `data-chicken-shape`), so she cannot drop through it out of the house.
export function roomFloorSlab(room: HouseRoom): RoomRect {
  const { l, r, b } = room.room, T = ROOM_WALL
  return { l: l - T, t: b, r: r + T, b: b + T }
}
