// The online Pátio: the browser's packets (lib/chicken/net-protocol.ts) match the game server's (server/src/protocol.mjs).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const P = loadTs('lib/chicken/net-protocol.ts')

const chickens = [
  { slot: 0, x: 1234.5, y: -80, vx: 320, vy: -900, face: -1, state: P.stateByte('run'), item: 3, aim: P.angleByte(-0.5), rot: 0 },
  { slot: 3, x: -10, y: 0, vx: 0, vy: 0, face: 1, state: P.stateByte('walk'), item: 0, aim: 0, rot: P.angleByte(-Math.PI / 2) },
]

test('browser and server write the same bytes and read each other', async () => {
  const S = await import('../server/src/protocol.mjs')
  assert.deepEqual([...P.encodeNetState(chickens, 77)], [...S.encodeState(chickens, 77)])
  assert.deepEqual(S.decodeState(P.encodeNetState(chickens, 77)).chickens, chickens)
  const entries = chickens.map((c, i) => ({ pid: 5 + i, ...c }))
  assert.deepEqual(P.decodeNetSnapshot(S.encodeSnapshot(entries, 9)), { tick: 9, entries })
  assert.equal(P.NET_MAX_BROWSERS, S.MAX_BROWSERS)
  assert.equal(P.NET_MAX_CHICKENS, S.MAX_CHICKENS)
})

test('chicken states travel as one byte; unknown ones as idle', () => {
  for (const s of P.NET_STATES) assert.equal(P.stateName(P.stateByte(s)), s)
  assert.equal(P.stateName(P.stateByte('portal?')), 'idle')
  assert.equal(P.stateName(250), 'idle')
  // a truncated snapshot is ignored
  assert.deepEqual(P.decodeNetSnapshot(new Uint8Array([0, 0, 3, 1])).entries, [])
})

test('aim and the clinging surface travel as one byte each (0: none)', () => {
  assert.equal(P.angleByte(null), 0)
  assert.equal(P.byteAngle(0), null)
  for (const a of [0, 0.3, Math.PI / 2, -Math.PI / 2, Math.PI, -3, 6.2, 12]) {
    const b = P.angleByte(a), back = P.byteAngle(b)
    assert.ok(b >= 1 && b <= 255)
    const d = Math.abs(((back - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
    assert.ok(d <= Math.PI / 255 + 1e-9, `${a} -> ${back}`)
  }
})

test('older packets (without aim and rot) are still read, as aim 0 and rot 0', async () => {
  const S = await import('../server/src/protocol.mjs')
  // an old browser's 20-byte entries: the new bytes cut off
  const now = S.encodeState(chickens, 4), old = new Uint8Array(3 + 20 * 2)
  old.set(now.subarray(0, 3))
  for (let i = 0; i < 2; i++) old.set(now.subarray(3 + 22 * i, 3 + 22 * i + 20), 3 + 20 * i)
  assert.deepEqual(S.decodeState(old).chickens, chickens.map(c => ({ ...c, aim: 0, rot: 0 })))
  // an old server's 21-byte snapshot entries
  const snap = S.encodeSnapshot(chickens.map((c, i) => ({ pid: i, ...c })), 2), oldSnap = new Uint8Array(3 + 21 * 2)
  oldSnap.set(snap.subarray(0, 3))
  for (let i = 0; i < 2; i++) oldSnap.set(snap.subarray(3 + 23 * i, 3 + 23 * i + 21), 3 + 21 * i)
  assert.deepEqual(P.decodeNetSnapshot(oldSnap).entries, chickens.map((c, i) => ({ pid: i, ...c, aim: 0, rot: 0 })))
})
