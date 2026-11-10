// Binary wire format shared by the server, its tests, the load test and the browser client (Pátio online).
// Little endian. The server never interprets `state` and `item`: they are the client's own byte codes.
//
// Client -> server, message "s" (3 + 22 * n bytes, n = 1..4 chickens of this browser):
//   u16 seq, u8 n, then n x { u8 slot, f32 x, f32 y, f32 vx, f32 vy, i8 face, u8 state, u8 item, u8 aim, u8 rot }
// Server -> client, message "w" (snapshot, 3 + 23 * n bytes, every chicken in the room, own ones included):
//   u16 tick, u8 n, then n x { u8 pid, u8 slot, f32 x, f32 y, f32 vx, f32 vy, i8 face, u8 state, u8 item, u8 aim, u8 rot }
// aim: where she points (0 none, else an angle in 255 steps); rot: the surface she clings to (0 none, else its angle).
// The older entries without aim and rot (20 bytes up) are still read, as aim 0 and rot 0.
// Reliable JSON messages: see patio-room.mjs.

export const MAX_BROWSERS = 13
export const MAX_CHICKENS = 4
export const IN_ENTRY = 22
export const OUT_ENTRY = 23
const OLD_IN_ENTRY = 20

// generous world limits (world units): the Pátio's width depends on its layout, and portals teleport
export const WORLD = { minX: -4000, maxX: 80000, minY: -40000, maxY: 8000, maxSpeed: 20000 }

const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

function writeChicken(dv, o, c) {
  dv.setFloat32(o, c.x, true); dv.setFloat32(o + 4, c.y, true)
  dv.setFloat32(o + 8, c.vx ?? 0, true); dv.setFloat32(o + 12, c.vy ?? 0, true)
  dv.setInt8(o + 16, c.face < 0 ? -1 : 1); dv.setUint8(o + 17, c.state ?? 0); dv.setUint8(o + 18, c.item ?? 0)
  dv.setUint8(o + 19, c.aim ?? 0); dv.setUint8(o + 20, c.rot ?? 0)
}
function readChicken(dv, o, extra = true) {
  return { x: dv.getFloat32(o, true), y: dv.getFloat32(o + 4, true), vx: dv.getFloat32(o + 8, true), vy: dv.getFloat32(o + 12, true), face: dv.getInt8(o + 16) < 0 ? -1 : 1, state: dv.getUint8(o + 17), item: dv.getUint8(o + 18), aim: extra ? dv.getUint8(o + 19) : 0, rot: extra ? dv.getUint8(o + 20) : 0 }
}

/** chickens: [{ slot, x, y, vx, vy, face, state, item, aim, rot }] (up to 4) */
export function encodeState(chickens, seq = 0) {
  const n = Math.min(MAX_CHICKENS, chickens.length)
  const buf = new Uint8Array(3 + IN_ENTRY * n), dv = view(buf)
  dv.setUint16(0, seq & 0xffff, true); dv.setUint8(2, n)
  for (let i = 0, o = 3; i < n; i++, o += IN_ENTRY) { dv.setUint8(o, chickens[i].slot ?? i); writeChicken(dv, o + 1, chickens[i]) }
  return buf
}

/** null when malformed (wrong size, too many chickens, a slot out of range or a number that is not finite) */
export function decodeState(bytes) {
  if (!bytes || bytes.byteLength < 3) return null
  const dv = view(bytes), n = dv.getUint8(2)
  if (n < 1 || n > MAX_CHICKENS) return null
  const size = bytes.byteLength === 3 + IN_ENTRY * n ? IN_ENTRY : bytes.byteLength === 3 + OLD_IN_ENTRY * n ? OLD_IN_ENTRY : 0
  if (!size) return null
  const chickens = []
  for (let i = 0, o = 3; i < n; i++, o += size) {
    const slot = dv.getUint8(o), c = readChicken(dv, o + 1, size === IN_ENTRY)
    if (slot >= MAX_CHICKENS || !Number.isFinite(c.x + c.y + c.vx + c.vy)) return null
    chickens.push({ slot, ...c })
  }
  return { seq: dv.getUint16(0, true), chickens }
}

/** entries: [{ pid, slot, x, y, vx, vy, face, state, item, aim, rot }] */
export function encodeSnapshot(entries, tick = 0) {
  const buf = new Uint8Array(3 + OUT_ENTRY * entries.length), dv = view(buf)
  dv.setUint16(0, tick & 0xffff, true); dv.setUint8(2, entries.length)
  entries.forEach((e, i) => { const o = 3 + OUT_ENTRY * i; dv.setUint8(o, e.pid); dv.setUint8(o + 1, e.slot); writeChicken(dv, o + 2, e) })
  return buf
}

export function decodeSnapshot(bytes) {
  const dv = view(bytes), n = dv.getUint8(2), out = []
  for (let i = 0, o = 3; i < n; i++, o += OUT_ENTRY) out.push({ pid: dv.getUint8(o), slot: dv.getUint8(o + 1), ...readChicken(dv, o + 2) })
  return { tick: dv.getUint16(0, true), entries: out }
}
