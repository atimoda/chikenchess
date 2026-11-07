// Load test: starts the game server as a child process, fills rooms with bots (13 browsers × up to 4 chickens per
// room) that walk around at 20 Hz, and reports the server's CPU, memory and traffic.
// Usage: npm run loadtest -- [browsers] [seconds] [chickens per browser]
import { execFileSync, spawn } from 'node:child_process'
import { Client } from '@colyseus/sdk'
import { decodeSnapshot, encodeState } from './protocol.mjs'

const BROWSERS = Number(process.argv[2] ?? 13), SECONDS = Number(process.argv[3] ?? 20), CHICKENS = Math.min(4, Number(process.argv[4] ?? 4)), PORT = 2598

const env = { ...process.env, PORT: String(PORT) }
delete env.SUPABASE_URL
const server = spawn('node', [new URL('./index.mjs', import.meta.url).pathname], { env, stdio: ['ignore', 'ignore', 'inherit'] })
// CPU seconds and resident memory of the server, from `ps` (macOS and Linux)
function usage() {
  const [rss, time] = execFileSync('ps', ['-o', 'rss=,time=', '-p', String(server.pid)], { encoding: 'utf8' }).trim().split(/\s+/)
  const parts = time.replace(/-/g, ':').split(':').map(Number)
  const seconds = parts.reduce((acc, v) => acc * 60 + v, 0)
  return { cpu: seconds, rssMb: Number(rss) / 1024 }
}
await new Promise(r => setTimeout(r, 2500))

let closing = false, bytesIn = 0, snapshots = 0, entries = 0, errors = 0
const bots = []
const client = new Client(`ws://localhost:${PORT}`)
const started = Date.now()
for (let i = 0; i < BROWSERS; i++) {
  try {
    const room = await client.joinOrCreate('patio', { name: `bot${i}`, chickens: CHICKENS })
    room.onMessage('w', bytes => { bytesIn += bytes.byteLength; snapshots++; entries += decodeSnapshot(new Uint8Array(bytes)).entries.length })
    for (const t of ['hello', 'room', 'chat', 'denied', 'kicked']) room.onMessage(t, () => {})
    room.onError((c, m) => { errors++; if (errors < 3) console.error('room error', c, m) })
    room.onLeave(c => { if (!closing) console.error('left with code', c) })
    bots.push({ room, chickens: Array.from({ length: CHICKENS }, (_, slot) => ({ slot, x: Math.random() * 6000, y: 0, vx: 0, vy: 0, face: 1, state: 1, item: 0, dir: Math.random() < 0.5 ? -1 : 1 })), seq: 0 })
  } catch (e) { errors++; if (errors === 1) console.error('join failed:', e?.message ?? e) }
}
console.log(`${bots.length}/${BROWSERS} browsers (${CHICKENS} chickens each) joined in ${Date.now() - started} ms, ${new Set(bots.map(b => b.room.roomId)).size} rooms (${errors} errors)`)

const timer = setInterval(() => {
  for (const b of bots) {
    for (const c of b.chickens) {
      c.x += c.dir * 13; if (Math.random() < 0.02) c.dir = -c.dir
      c.vx = c.dir * 260; c.face = c.dir; c.y = Math.random() < 0.03 ? -200 : 0
    }
    b.room.sendBytes('s', encodeState(b.chickens, b.seq++))
  }
}, 50)

const u0 = usage(), t0 = Date.now(), bytes0 = bytesIn
await new Promise(r => setTimeout(r, SECONDS * 1000))
const secs = (Date.now() - t0) / 1000, u1 = usage(), out = bytesIn - bytes0
console.log(`server CPU ${((u1.cpu - u0.cpu) / secs * 100).toFixed(0)}% of one core, RSS ${u1.rssMb.toFixed(0)} MB`)
console.log(`traffic out of the server: ${(out / secs / 1024).toFixed(1)} KB/s (${(out / secs / Math.max(1, bots.length) / 1024).toFixed(1)} KB/s per browser), ${(entries / Math.max(1, snapshots)).toFixed(1)} chickens per snapshot`)
console.log(`per hour: ${(out / secs * 3600 / 1073741824).toFixed(2)} GB`)
closing = true
clearInterval(timer)
for (const b of bots) b.room.leave()
server.kill()
process.exit(errors ? 1 : 0)
