// The game server's binary packets, as the browser reads and writes them. Mirrors server/src/protocol.mjs (the
// server's own copy); tests/chicken-online.cases.cjs checks that both encode the same bytes.
//
// Up   "s": u16 seq, u8 n, then n x { u8 slot, f32 x, f32 y, f32 vx, f32 vy, i8 face, u8 state, u8 item }
// Down "w": u16 tick, u8 n, then n x { u8 pid, u8 slot, f32 x, f32 y, f32 vx, f32 vy, i8 face, u8 state, u8 item }
// Positions are world units (the Pátio's world, the same on every screen).

export const NET_MAX_BROWSERS = 13
export const NET_MAX_CHICKENS = 4
const IN_ENTRY = 20, OUT_ENTRY = 21

// a chicken's animation state as one byte (the engine's state names); unknown states travel as idle
export const NET_STATES = ['idle', 'walk', 'run', 'jump', 'fly', 'fastFall', 'brood', 'crouch', 'slide', 'lookUp', 'cling', 'held', 'shockingPrepare', 'portal', 'portalArrival', 'shockingAirPrepare', 'shockingAirRelease'] as const
export const stateByte = (state: string) => Math.max(0, (NET_STATES as readonly string[]).indexOf(state))
export const stateName = (byte: number) => NET_STATES[byte] ?? 'idle'

export type NetChicken = { slot: number; x: number; y: number; vx: number; vy: number; face: number; state: number; item: number }
export type NetEntry = NetChicken & { pid: number }

const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength)

export function encodeNetState(chickens: NetChicken[], seq: number) {
  const n = Math.min(NET_MAX_CHICKENS, chickens.length)
  const buf = new Uint8Array(3 + IN_ENTRY * n), dv = view(buf)
  dv.setUint16(0, seq & 0xffff, true); dv.setUint8(2, n)
  for (let i = 0, o = 3; i < n; i++, o += IN_ENTRY) {
    const c = chickens[i]
    dv.setUint8(o, c.slot); dv.setFloat32(o + 1, c.x, true); dv.setFloat32(o + 5, c.y, true); dv.setFloat32(o + 9, c.vx, true); dv.setFloat32(o + 13, c.vy, true)
    dv.setInt8(o + 17, c.face < 0 ? -1 : 1); dv.setUint8(o + 18, c.state); dv.setUint8(o + 19, c.item)
  }
  return buf
}

export function decodeNetSnapshot(bytes: Uint8Array): { tick: number; entries: NetEntry[] } {
  const dv = view(bytes), n = bytes.byteLength >= 3 ? dv.getUint8(2) : 0, entries: NetEntry[] = []
  if (bytes.byteLength < 3 + OUT_ENTRY * n) return { tick: 0, entries }
  for (let i = 0, o = 3; i < n; i++, o += OUT_ENTRY) {
    entries.push({
      pid: dv.getUint8(o), slot: dv.getUint8(o + 1), x: dv.getFloat32(o + 2, true), y: dv.getFloat32(o + 6, true), vx: dv.getFloat32(o + 10, true), vy: dv.getFloat32(o + 14, true),
      face: dv.getInt8(o + 18) < 0 ? -1 : 1, state: dv.getUint8(o + 19), item: dv.getUint8(o + 20),
    })
  }
  return { tick: dv.getUint16(0, true), entries }
}
