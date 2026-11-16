// Who is inside which house, on this browser (the rules are in lib/pigchicken/house-rooms.ts). `inside`: this
// browser's players ('p1', 'p2'…) by the house they are in; `net`: the other browsers' players (`pid:slot`), as each
// browser says (lib/chicken/online-room.ts). A house is open on this screen, its façade gone and its inside shown,
// while one of this browser's players is in it; whoever is inside a closed one is hidden behind its façade.
const inside = new Map<string, string>()
const net = new Map<string, string>()
// the doors a player of this browser stands at (the door shows it)
let doors: ReadonlySet<string> = new Set()
let open: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

const changed = () => {
  open = new Set(inside.values())
  listeners.forEach(fn => fn())
}

export const houseRoomsStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
  /** the house this browser's player is in */
  roomOf: (who: string) => inside.get(who) ?? null,
  /** the houses open on this screen */
  get open() { return open },
  isOpen: (house: string) => open.has(house),
  atDoor: (house: string) => doors.has(house),
  /** this browser's players in their houses, by player */
  get inside(): ReadonlyMap<string, string> { return inside },
  /** another browser's player is out of sight: inside a house that is closed on this screen */
  netHidden(pid: number, slot: number) { const house = net.get(`${pid}:${slot}`); return !!house && !open.has(house) },
  netRoom: (pid: number, slot: number) => net.get(`${pid}:${slot}`) ?? null,
}

export function setHouseRoom(who: string, house: string | null) {
  if ((inside.get(who) ?? null) === house) return
  if (house) inside.set(who, house); else inside.delete(who)
  changed()
}

export function setHouseDoors(houses: readonly string[]) {
  if (houses.length === doors.size && houses.every(h => doors.has(h))) return
  doors = new Set(houses)
  listeners.forEach(fn => fn())
}

/** everyone of this browser is outside again (another Pátio, the Modo editor) */
export function clearHouseRooms() {
  if (!inside.size && !doors.size) return
  inside.clear(); doors = new Set()
  changed()
}

/** what another browser says of its players: the house of each slot ('' outside); null when it left */
export function setNetHouseRooms(pid: number, slots: readonly string[] | null) {
  let any = false
  for (const key of [...net.keys()]) if (key.startsWith(`${pid}:`)) { net.delete(key); any = true }
  slots?.forEach((house, slot) => { if (house) { net.set(`${pid}:${slot}`, house); any = true } })
  if (any) listeners.forEach(fn => fn())
}

export function clearNetHouseRooms() {
  if (!net.size) return
  net.clear()
  listeners.forEach(fn => fn())
}
