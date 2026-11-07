// The online Pátio: the browser's packets (lib/chicken/net-protocol.ts) match the game server's (server/src/protocol.mjs).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const P = loadTs('lib/chicken/net-protocol.ts')

const chickens = [
  { slot: 0, x: 1234.5, y: -80, vx: 320, vy: -900, face: -1, state: P.stateByte('run'), item: 3 },
  { slot: 3, x: -10, y: 0, vx: 0, vy: 0, face: 1, state: P.stateByte('brood'), item: 0 },
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
