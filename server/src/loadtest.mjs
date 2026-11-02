// Load test: starts the game server as a child process, connects N bots that walk around at 20 Hz
// and reports server CPU, memory and traffic per second. Usage: npm run loadtest -- [bots] [seconds]
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { Client } from '@colyseus/sdk'
import { decodeSnapshot, encodeState, STATE_BYTES, WORLD } from './protocol.mjs'

const BOTS = Number(process.argv[2] ?? 100), SECONDS = Number(process.argv[3] ?? 20), PORT = 2598

const server = spawn('node', [new URL('./index.mjs', import.meta.url).pathname], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'ignore', 'inherit'] })
const ticks = () => { const f = readFileSync(`/proc/${server.pid}/stat`, 'utf8').split(' '); return Number(f[13]) + Number(f[14]) }
const rssMb = () => Number(readFileSync(`/proc/${server.pid}/statm`, 'utf8').split(' ')[1]) * 4096 / 1048576
await new Promise(r => setTimeout(r, 2500))

let closing = false, left = 0
let bytesIn = 0, snapshots = 0, entries = 0, errors = 0
const rooms = []
const client = new Client(`ws://localhost:${PORT}`)
const started = Date.now()
await Promise.all(Array.from({ length: BOTS }, async (_, i) => {
  try {
    const room = await client.joinOrCreate('patio', { name: `bot${i}` })
    room.onMessage('w', bytes => { bytesIn += bytes.byteLength; snapshots++; entries += decodeSnapshot(bytes).length })
    room.onMessage('hello', () => {}); room.onMessage('join', () => {}); room.onMessage('leave', () => {})
    room.onError((c, m) => { errors++; if (errors < 3) console.error('room error', c, m) }); room.onLeave(c => { if (!closing && ++left < 4) console.error('left with code', c) })
    rooms.push({ room, x: Math.random() * WORLD.width, y: 0, dir: Math.random() < 0.5 ? -1 : 1, seq: 0 })
  } catch (e) { errors++; if (errors === 1) console.error('join failed:', e?.message ?? e) }
}))
console.log(`${rooms.length}/${BOTS} bots joined in ${Date.now() - started} ms (${errors} errors)`)

const buf = new Uint8Array(STATE_BYTES)
const timer = setInterval(() => {
  for (const b of rooms) {
    b.x += b.dir * 260 / 20; if (b.x < 0 || b.x > WORLD.width) b.dir = -b.dir
    if (Math.random() < 0.02) b.dir = -b.dir
    b.y = Math.random() < 0.03 ? -200 : 0
    encodeState(buf, { x: b.x, y: b.y, vx: b.dir * 260, vy: 0, face: b.dir, state: 1, seq: b.seq++ })
    b.room.sendBytes('s', buf)
  }
}, 50)

const cpu0 = ticks(), t0 = Date.now(), bytes0 = bytesIn
await new Promise(r => setTimeout(r, SECONDS * 1000))
const secs = (Date.now() - t0) / 1000
const cpu = (ticks() - cpu0) / 100 / secs * 100 // clock ticks are 1/100 s
console.log(`server CPU ${cpu.toFixed(0)}% of one core, RSS ${rssMb().toFixed(0)} MB`)
console.log(`traffic out of the server: ${((bytesIn - bytes0) / secs / 1024).toFixed(0)} KB/s (${((bytesIn - bytes0) / secs / Math.max(1, rooms.length)).toFixed(0)} B/s per player), ${(entries / Math.max(1, snapshots)).toFixed(1)} chickens per snapshot`)
console.log(`snapshots received: ${snapshots} total, bots still connected: ${rooms.filter(b => b.room.connection?.isOpen).length}`)
console.log(`per hour: ${((bytesIn - bytes0) / secs * 3600 / 1073741824).toFixed(2)} GB`)
closing = true
clearInterval(timer)
for (const b of rooms) b.room.leave()
server.kill()
process.exit(errors ? 1 : 0)
