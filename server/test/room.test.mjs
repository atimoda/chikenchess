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
  const seen = { hello: null, room: null, snaps: [], chat: [], denied: [], kicked: null }
  room.onMessage('hello', m => { seen.hello = m; seen.room = m.room })
  room.onMessage('room', m => { seen.room = m })
  room.onMessage('w', b => seen.snaps.push(decodeSnapshot(new Uint8Array(b))))
  room.onMessage('chat', m => seen.chat.push(m))
  room.onMessage('denied', m => seen.denied.push(m))
  room.onMessage('kicked', m => { seen.kicked = m })
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
