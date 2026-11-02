// Binary wire format shared by the server, the load test and (later) the browser client.
//
// Client -> server, message "s" (20 bytes, little endian):
//   f32 x, f32 y, f32 vx, f32 vy, i8 face, u8 state, u16 seq
// Server -> client, message "w" (snapshot, 2 + 22 * n bytes):
//   u16 n, then n x { u16 id, f32 x, f32 y, f32 vx, f32 vy, i8 face, u8 state }
// Reliable JSON messages: "hello" (server -> client, own id + world), "join" / "leave"
// (server -> everyone, id + name + look).

export const STATE_BYTES = 20
export const ENTRY_BYTES = 22

// Animation state of a chicken, sent as one byte.
export const STATES = ['idle', 'walk', 'run', 'jump', 'fall', 'fly', 'brood', 'slide', 'cling', 'held']

// World of the Patio, in px of a 800 px tall screen. y grows downwards; the ground is y = 0.
export const WORLD = { width: 6000, minY: -1600, maxY: 80, maxSpeed: 1600 }

export function encodeState(buf, s) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  dv.setFloat32(0, s.x, true); dv.setFloat32(4, s.y, true); dv.setFloat32(8, s.vx, true); dv.setFloat32(12, s.vy, true)
  dv.setInt8(16, s.face); dv.setUint8(17, s.state); dv.setUint16(18, s.seq & 0xffff, true)
  return buf
}

export function decodeState(bytes) {
  if (!bytes || bytes.byteLength !== STATE_BYTES) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const s = { x: dv.getFloat32(0, true), y: dv.getFloat32(4, true), vx: dv.getFloat32(8, true), vy: dv.getFloat32(12, true), face: dv.getInt8(16), state: dv.getUint8(17), seq: dv.getUint16(18, true) }
  return Number.isFinite(s.x + s.y + s.vx + s.vy) ? s : null
}

export function decodeSnapshot(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const n = dv.getUint16(0, true), out = []
  for (let i = 0, o = 2; i < n; i++, o += ENTRY_BYTES) {
    out.push({ id: dv.getUint16(o, true), x: dv.getFloat32(o + 2, true), y: dv.getFloat32(o + 6, true), vx: dv.getFloat32(o + 10, true), vy: dv.getFloat32(o + 14, true), face: dv.getInt8(o + 18), state: dv.getUint8(o + 19) })
  }
  return out
}
