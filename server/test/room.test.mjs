// End to end: a real server on a spare port and browsers made with the Colyseus SDK.
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { Client } from '@colyseus/sdk'
import { decodeSnapshot, encodeState } from '../src/protocol.mjs'

const PORT = 2599
let server
const url = `http://localhost:${PORT}`
const wait = ms => new Promise(r => setTimeout(r, ms))
async function until(fn, ms = 3000) {
  const end = Date.now() + ms
  for (;;) { const v = fn(); if (v) return v; if (Date.now() > end) throw new Error('timed out'); await wait(20) }
}

before(async () => {
  const env = { ...process.env, PORT: String(PORT) }
  delete env.SUPABASE_URL; delete env.SUPABASE_ANON_KEY
  server = spawn('node', [new URL('../src/index.mjs', import.meta.url).pathname], { env, stdio: ['ignore', 'pipe', 'inherit'] })
  await new Promise((resolve, reject) => {
    server.stdout.on('data', d => { if (String(d).includes('listening')) resolve() })
    server.on('exit', code => reject(new Error(`server exited ${code}`)))
  })
})
after(() => server?.kill())

async function browser(options = {}) {
  const room = await new Client(`ws://localhost:${PORT}`).joinOrCreate('patio', { name: 'b', chickens: 1, ...options })
  const seen = { hello: null, room: null, snaps: [], chat: [], denied: [], kicked: null, layout: [], saved: [], foes: [], hits: [], spawn: [], shots: [], souls: [], take: [], give: [], chicks: [], houses: [], chests: [], cages: [] }
  room.onMessage('hello', m => { seen.hello = m; seen.room = m.room })
  room.onMessage('room', m => { seen.room = m })
  room.onMessage('w', b => seen.snaps.push(decodeSnapshot(new Uint8Array(b))))
  room.onMessage('chat', m => seen.chat.push(m))
  room.onMessage('denied', m => seen.denied.push(m))
  room.onMessage('kicked', m => { seen.kicked = m })
  room.onMessage('layout', m => seen.layout.push(m))
  room.onMessage('saved', m => seen.saved.push(m))
  for (const type of ['foes', 'hits', 'spawn', 'shots', 'souls', 'take', 'give', 'chicks', 'chests', 'cages', 'houses']) room.onMessage(type, m => seen[type].push(m))
  await until(() => seen.hello)
  return { room, seen }
}

test('public lobby: fills the oldest room up to 13 browsers, then opens another', async () => {
  const patioId = '0f000000-0000-4000-8000-000000000001'
  const list = []
  for (let i = 0; i < 14; i++) list.push(await browser({ patioId, name: `p${i}` }))
  const ids = new Set(list.map(b => b.room.roomId))
  assert.equal(ids.size, 2)
  assert.equal(list.filter(b => b.room.roomId === list[0].room.roomId).length, 13)
  const lobbies = await (await fetch(`${url}/lobbies`)).json()
  const mine = lobbies.filter(l => l.patioId === patioId)
  assert.deepEqual(mine.map(l => l.players), [13, 1])
  for (const b of list) await b.room.leave()
})

test('owner, chat, kick, visibility and up to 4 chickens per browser', async () => {
  const patioId = '0f000000-0000-4000-8000-000000000002'
  const a = await browser({ patioId, name: 'Ana', chickens: 4 })
  const b = await browser({ patioId, name: 'Bia', chickens: 9 })
  assert.equal(b.room.roomId, a.room.roomId)
  const info = await until(() => (a.seen.room?.players.length === 2 ? a.seen.room : null))
  assert.equal(info.ownerPid, a.seen.hello.pid)
  assert.deepEqual(info.players.map(p => p.chickens), [4, 4])
  assert.notEqual(info.players[0].color, info.players[1].color)

  // both send their chickens; each snapshot carries all of them
  a.room.sendBytes('s', encodeState([0, 1, 2, 3].map(slot => ({ slot, x: 100 * slot, y: 0, vx: 0, vy: 0, face: 1, state: 1, item: 0 }))))
  b.room.sendBytes('s', encodeState([{ slot: 0, x: 5, y: 0, vx: 0, vy: 0, face: -1, state: 2, item: 3 }]))
  const snap = await until(() => b.seen.snaps.find(s => s.entries.length === 5))
  assert.equal(snap.entries.filter(e => e.pid === a.seen.hello.pid).length, 4)

  b.room.send('chat', { text: '  olá   galinhas  ' })
  const msg = await until(() => a.seen.chat[0])
  assert.deepEqual([msg.pid, msg.text], [b.seen.hello.pid, 'olá galinhas'])

  // only the owner closes the lobby or removes someone
  b.room.send('visibility', { public: false })
  await until(() => b.seen.denied.length)
  a.room.send('visibility', { public: false })
  await until(() => a.seen.room?.public === false)
  let lobbies = await (await fetch(`${url}/lobbies`)).json()
  assert.equal(lobbies.some(l => l.patioId === patioId), false)

  const c = await browser({ patioId, name: 'Caio' })
  assert.notEqual(c.room.roomId, a.room.roomId) // the private room is not matched any more
  await c.room.leave()

  a.room.send('kick', { pid: b.seen.hello.pid })
  await until(() => b.seen.kicked)
  await until(() => a.seen.room?.players.length === 1)

  // the owner leaves: the next oldest owns the lobby
  const d = await new Client(`ws://localhost:${PORT}`).joinById(a.room.roomId, { name: 'Davi' })
  let dRoom = null
  d.onMessage('room', m => { dRoom = m }); d.onMessage('hello', () => {}); d.onMessage('w', () => {}); d.onMessage('chat', () => {})
  await a.room.leave()
  await until(() => dRoom && dRoom.players.length === 1 && dRoom.ownerPid === dRoom.players[0].pid)
  await d.leave()
  lobbies = await (await fetch(`${url}/lobbies`)).json()
  assert.ok(Array.isArray(lobbies))
})

test('Edit mode live: the owner and the editors it allows send the layout; newcomers get the latest', async () => {
  const patioId = '0f000000-0000-4000-8000-000000000003'
  const a = await browser({ patioId, name: 'Dona' })
  const b = await browser({ patioId, name: 'Bia' })
  const big = { elements: Array.from({ length: 300 }, (_, i) => ({ id: `e${i}`, kind: 'box', x: i * 10, y: 0, w: 40, h: 20 })) }
  assert.ok(JSON.stringify(big).length > 4096) // more than the transport's default limit
  a.room.send('layout', { layout: big })
  const got = await until(() => b.seen.layout[0])
  assert.equal(got.layout.elements.length, 300)
  assert.equal(got.by, a.seen.hello.pid)

  // not allowed yet
  b.room.send('layout', { layout: { elements: [] } })
  await until(() => b.seen.denied.length)
  a.room.send('editor', { pid: b.seen.hello.pid, on: true })
  await until(() => a.seen.room?.editors.includes(b.seen.hello.pid))
  b.room.send('layout', { layout: { elements: [{ id: 'x' }] } })
  await until(() => a.seen.layout.length === 1)

  // the owner saved: the others learn the revision
  a.room.send('saved', { revision: 7 })
  assert.equal((await until(() => b.seen.saved[0])).revision, 7)

  const c = await browser({ patioId, name: 'Caio' })
  const late = await until(() => c.seen.layout[0])
  assert.deepEqual(late.layout, { elements: [{ id: 'x' }] })
  for (const x of [a, b, c]) await x.room.leave()
})

test('shared world: the owner sends the enemies, hits and spawns go to the owner, shots to everyone else', async () => {
  const patioId = '0f000000-0000-4000-8000-000000000004'
  const a = await browser({ patioId, name: 'Dona' })
  const b = await browser({ patioId, name: 'Bia' })
  const c = await browser({ patioId, name: 'Caio' })
  const foes = { fs: { 10000001: [0, 130, 1, 130, 80, 6, 70, 18, -1e9, -1e9] }, l: [[10001234, 0, 500, 200, 48, 40, 30, 30, 1, 'fly', 0.4, 0, 0, 0, '', 0, 0, { kind: 'alien', fid: 10000001, col: 0, row: 0, color: '#c77dff' }]] }
  a.room.send('foes', foes)
  assert.deepEqual((await until(() => b.seen.foes[0])).l, foes.l)
  await until(() => c.seen.foes[0])
  // only the owner's enemies count
  b.room.send('foes', { fs: {}, l: [] })
  const hit = { id: 10001234, d: 12, px: 40, x: 500, y: 180 }
  b.room.send('hits', { list: [hit] })
  const got = await until(() => a.seen.hits[0])
  assert.deepEqual(got, { pid: b.seen.hello.pid, list: [hit] })
  b.room.send('spawn', { spawn: { what: 'aliens', x: 300, y: 600, l: 0, r: 1280 } })
  assert.equal((await until(() => a.seen.spawn[0])).spawn.what, 'aliens')
  const shot = { k: 'b', i: 'pistol', x: 1, y: 2, vx: 900, vy: 0, sz: 4, dr: 0, rg: 900, fu: 0, bo: 0, ex: 0, pi: 0 }
  c.room.send('shots', { list: [shot] })
  assert.deepEqual((await until(() => a.seen.shots[0])).list, [shot])
  await until(() => b.seen.shots[0])
  await wait(150)
  assert.equal(c.seen.shots.length, 0, 'the shooter does not get its own shots back')
  assert.equal(a.seen.foes.length, 0, 'a follower cannot send enemies, nor the owner gets its own')
  assert.equal(b.seen.foes.length, 1)
  assert.equal(b.seen.hits.length + c.seen.hits.length + b.seen.spawn.length, 0)
  for (const x of [a, b, c]) await x.room.leave()
})

test('souls flying free: each browser sends its own to everyone else; one asked for and given goes only to the browser named', async () => {
  const patioId = '0f000000-0000-4000-8000-000000000005'
  const a = await browser({ patioId, name: 'Dona' })
  const b = await browser({ patioId, name: 'Bia' })
  const c = await browser({ patioId, name: 'Caio' })
  assert.equal(a.seen.hello.caps.souls, 1, 'the server says it relays them')
  const pa = a.seen.hello.pid, pb = b.seen.hello.pid, pc = c.seen.hello.pid
  // anyone flies souls, not only the owner
  const l = [[pb * 10_000_000 + 7, 500, 200, 1, ['jelly', 'alive', 'wind', 'tonic', null, '#c77dff', 'sabia']]]
  b.room.send('souls', { l })
  assert.deepEqual(await until(() => a.seen.souls[0]), { pid: pb, l })
  await until(() => c.seen.souls[0])
  // Caio's Passaguá went over it: only Bia hears, and only Caio gets it
  const take = { k: 's', id: l[0][0] }
  c.room.send('take', { to: pb, take })
  assert.deepEqual(await until(() => b.seen.take[0]), { pid: pc, take })
  const give = { ...take, soul: l[0][4] }
  b.room.send('give', { to: pc, give })
  assert.deepEqual(await until(() => c.seen.give[0]), { pid: pb, give })
  // nobody to give to, itself, too much to carry: dropped
  b.room.send('take', { to: 99, take })
  b.room.send('take', { to: pb, take })
  b.room.send('give', { to: pa, give: { ...give, junk: 'x'.repeat(500) } })
  b.room.send('souls', { l: Array.from({ length: 65 }, () => l[0]) })
  await wait(150)
  assert.equal(b.seen.souls.length, 0, 'its own souls do not come back')
  assert.equal(a.seen.souls.length, 1); assert.equal(c.seen.souls.length, 1)
  assert.equal(a.seen.take.length + c.seen.take.length + b.seen.take.length, 1)
  assert.equal(a.seen.give.length + b.seen.give.length, 0)
  for (const x of [a, b, c]) await x.room.leave()
})

test('chicks: each browser sends its own to everyone else, and one is asked for like a soul', async () => {
  const patioId = '0f000000-0000-4000-8000-000000000006'
  const a = await browser({ patioId, name: 'Dona' })
  const b = await browser({ patioId, name: 'Bia' })
  const c = await browser({ patioId, name: 'Caio' })
  assert.equal(a.seen.hello.caps.chicks, 1, 'the server says it relays them')
  const pb = b.seen.hello.pid, pc = c.seen.hello.pid
  const l = [[1, 500, 200, 60, 0, 1, 1, 3], [2, 460, 200, 0, 0, -1, 0, 0]]
  b.room.send('chicks', { l })
  assert.deepEqual(await until(() => a.seen.chicks[0]), { pid: pb, l })
  await until(() => c.seen.chicks[0])
  // Caio's Passaguá went over the first one: only Bia hears, and only Caio gets it
  const take = { k: 'c', id: pb * 10_000_000 + 1 }
  c.room.send('take', { to: pb, take })
  assert.deepEqual(await until(() => b.seen.take[0]), { pid: pc, take })
  const give = { ...take, soul: ['chick', 'alive', null, null, null, '#ffd23f', null] }
  b.room.send('give', { to: pc, give })
  assert.deepEqual(await until(() => c.seen.give[0]), { pid: pb, give })
  // none left: an empty list goes through; too many, not a list: dropped
  b.room.send('chicks', { l: [] })
  assert.deepEqual(await until(() => a.seen.chicks[1]), { pid: pb, l: [] })
  b.room.send('chicks', { l: Array.from({ length: 17 }, () => l[0]) })
  b.room.send('chicks', { l: 'x' })
  await wait(150)
  assert.equal(b.seen.chicks.length, 0, 'its own chicks do not come back')
  assert.equal(a.seen.chicks.length, 2); assert.equal(c.seen.chicks.length, 2)
  for (const x of [a, b, c]) await x.room.leave()
})

test('chests: an opened Baú goes to everyone else; only the owner sends the list of open ones', async () => {
  const patioId = '0f000000-0000-4000-8000-000000000007'
  const a = await browser({ patioId, name: 'Dona' })
  const b = await browser({ patioId, name: 'Bia' })
  assert.equal(a.seen.hello.caps.chests, 1, 'the server says it relays them')
  assert.equal(a.seen.room.ownerPid, a.seen.hello.pid)
  const pa = a.seen.hello.pid, pb = b.seen.hello.pid
  b.room.send('chests', { l: [['chest-1', 0]], o: 1 })
  assert.deepEqual(await until(() => a.seen.chests[0]), { pid: pb, l: [['chest-1', 0]], o: 1 })
  // the list without o: the owner's only
  b.room.send('chests', { l: [] })
  a.room.send('chests', { l: [['chest-1', 1.5]] })
  assert.deepEqual(await until(() => b.seen.chests[0]), { pid: pa, l: [['chest-1', 1.5]] })
  // too many, not a list: dropped
  b.room.send('chests', { l: Array.from({ length: 65 }, (_, i) => [`c${i}`, 0]), o: 1 })
  b.room.send('chests', { l: 'x', o: 1 })
  await wait(150)
  assert.equal(a.seen.chests.length, 1); assert.equal(b.seen.chests.length, 1)
  for (const x of [a, b]) await x.room.leave()
})

test("cages: the Gaiolas a browser's chickens carry go to everyone else", async () => {
  const patioId = '0f000000-0000-4000-8000-000000000008'
  const a = await browser({ patioId, name: 'Ana' })
  const b = await browser({ patioId, name: 'Bia' })
  assert.equal(a.seen.hello.caps.cages, 1, 'the server says it relays them')
  const pb = b.seen.hello.pid
  b.room.send('cages', { l: [[[0, 3, 8], [2, 0, 16]]] })
  assert.deepEqual(await until(() => a.seen.cages[0]), { pid: pb, l: [[[0, 3, 8], [2, 0, 16]]] })
  // more chickens than a browser has, not a list: dropped; the sender hears nothing of its own
  b.room.send('cages', { l: [[], [], [], [], []] })
  b.room.send('cages', { l: 'x' })
  await wait(150)
  assert.equal(a.seen.cages.length, 1); assert.equal(b.seen.cages.length, 0)
  for (const x of [a, b]) await x.room.leave()
})

test("houses: the house each of a browser's chickens is inside of goes to everyone else", async () => {
  const patioId = '0f000000-0000-4000-8000-00000000000a'
  const a = await browser({ patioId, name: 'Ana' })
  const b = await browser({ patioId, name: 'Bia' })
  assert.equal(a.seen.hello.caps.houses, 1, 'the server says it relays them')
  const pb = b.seen.hello.pid
  b.room.send('houses', { l: ['house-3', ''] })
  assert.deepEqual(await until(() => a.seen.houses[0]), { pid: pb, l: ['house-3', ''] })
  // more chickens than a browser has, not a list: dropped; the sender hears nothing of its own
  b.room.send('houses', { l: ['', '', '', '', ''] })
  b.room.send('houses', { l: 'x' })
  await wait(150)
  assert.equal(a.seen.houses.length, 1); assert.equal(b.seen.houses.length, 0)
  for (const x of [a, b]) await x.room.leave()
})
