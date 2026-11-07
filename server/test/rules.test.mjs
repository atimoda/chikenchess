import test from 'node:test'
import assert from 'node:assert/strict'
import { canKick, cleanChat, cleanLooks, freeColor, freePid, ownerOf } from '../src/rules.mjs'
import { decodeSnapshot, decodeState, encodeSnapshot, encodeState } from '../src/protocol.mjs'

const P = (pid, joinedAt, extra = {}) => ({ pid, joinedAt, userId: null, guest: true, color: pid - 1, ...extra })

test('owner: the Pátio creator when present, otherwise the oldest browser', () => {
  const a = P(1, 10), b = P(2, 20, { userId: 'u-creator', guest: false }), c = P(3, 30)
  assert.equal(ownerOf([a, b, c], 'u-creator'), 2)
  assert.equal(ownerOf([a, c], 'u-creator'), 1)
  assert.equal(ownerOf([c, a], null), 1)
  assert.equal(ownerOf([], null), null)
  // a guest never counts as the creator
  assert.equal(ownerOf([a, P(4, 40, { userId: 'u-creator', guest: true })], 'u-creator'), 1)
})

test('colors and pids: the first free one, kept by who stays', () => {
  const list = [P(1, 1, { color: 0 }), P(3, 3, { color: 2 })]
  assert.equal(freeColor(list), 1)
  assert.equal(freePid(list), 2)
})

test('kick: only the owner, never themselves, never the creator or godparent', () => {
  const meta = { creatorId: 'c', godparentId: 'g' }
  const owner = P(1, 1), guest = P(2, 2), creator = P(3, 3, { userId: 'c', guest: false }), god = P(4, 4, { userId: 'g', guest: false })
  assert.equal(canKick(owner, guest, 1, meta), null)
  assert.match(canKick(guest, owner, 1, meta), /Só o dono/)
  assert.match(canKick(owner, owner, 1, meta), /si mesmo/)
  assert.match(canKick(owner, creator, 1, meta), /criador e o padrinho/)
  assert.match(canKick(owner, god, 1, meta), /criador e o padrinho/)
})

test('chat and looks are cleaned', () => {
  assert.equal(cleanChat('  oi\n<b>x</b>  '), 'oi b x /b')
  assert.equal(cleanChat('a'.repeat(300)).length, 140)
  assert.equal(cleanChat('   '), '')
  assert.deepEqual(cleanLooks([{ comb: 'caipira', 'bad key!': 'x', face: 1 }, 'x', null, {}, {}]), [{ comb: 'caipira' }, null, null, {}])
})

test('protocol: 1 to 4 chickens up, every chicken down', () => {
  const chickens = [{ slot: 0, x: 10.5, y: -20, vx: 300, vy: 0, face: -1, state: 3, item: 7 }, { slot: 3, x: 1, y: 2, vx: 0, vy: 0, face: 1, state: 0, item: 0 }]
  const s = decodeState(encodeState(chickens, 9))
  assert.equal(s.seq, 9)
  assert.deepEqual(s.chickens, chickens)
  assert.equal(decodeState(encodeState([...chickens, ...chickens, chickens[0]])).chickens.length, 4)
  assert.equal(decodeState(new Uint8Array([0, 0, 5])), null)
  const bad = encodeState([{ slot: 9, x: 0, y: 0 }])
  assert.equal(decodeState(bad), null)
  const snap = decodeSnapshot(encodeSnapshot([{ pid: 4, ...chickens[0] }], 3))
  assert.equal(snap.tick, 3)
  assert.deepEqual(snap.entries[0], { pid: 4, ...chickens[0] })
})
