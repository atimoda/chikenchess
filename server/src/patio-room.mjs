import { Room } from 'colyseus'
import { authenticate } from './auth.mjs'
import { decodeState, ENTRY_BYTES, STATE_BYTES, WORLD } from './protocol.mjs'

const TICK_MS = 50 // 20 snapshots per second
const NEAR_COUNT = 40 // players sent every tick
const FAR_EVERY = 4 // the rest, every 4th tick (5 Hz)
const MAX_STATE_RATE = 30 // packets a client may send per second

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Public yard: up to 100 chickens in one wide world. Each browser simulates its own chicken and
// sends its state; the server only checks it is plausible, then relays to each player the nearest
// chickens at full rate and the rest at a lower one (area of interest).
export class PatioRoom extends Room {
  maxClients = 100
  maxMessagesPerSecond = 60
  players = new Map() // sessionId -> player
  nextId = 1
  tick = 0

  async onAuth(client, options) {
    return authenticate(options)
  }

  onUncaughtException(err, methodName) {
    console.error(`patio ${methodName}:`, err)
  }

  onCreate() {
    this.onMessageBytes('s', (client, bytes) => this.onState(client, bytes))
    this.setSimulationInterval(() => this.broadcastSnapshots(), TICK_MS)
  }

  onJoin(client, _options, auth) {
    const a = auth ?? client.auth
    const id = this.nextId++ & 0xffff || (this.nextId++ & 0xffff)
    const x = 300 + Math.random() * (WORLD.width - 600)
    // drops in from the top, like in the lobby
    const p = { id, client, userId: a.userId, name: a.name, look: a.look, x, y: WORLD.minY, vx: 0, vy: 0, face: 1, state: 4, lastAt: Date.now(), budget: MAX_STATE_RATE, budgetAt: Date.now(), seq: 0 }
    this.players.set(client.sessionId, p)
    client.send('hello', { id, world: WORLD, tickMs: TICK_MS, players: [...this.players.values()].filter(o => o !== p).map(o => ({ id: o.id, name: o.name, look: o.look })) })
    this.broadcast('join', { id, name: p.name, look: p.look }, { except: client })
  }

  onLeave(client) {
    const p = this.players.get(client.sessionId)
    if (!p) return
    this.players.delete(client.sessionId)
    this.broadcast('leave', { id: p.id })
  }

  onState(client, bytes) {
    const p = this.players.get(client.sessionId)
    const s = decodeState(bytes)
    if (!p || !s) return
    const now = Date.now()
    // plain rate limit: refills 30 packets per second
    p.budget = Math.min(MAX_STATE_RATE, p.budget + (now - p.budgetAt) / 1000 * MAX_STATE_RATE); p.budgetAt = now
    if (p.budget < 1) return
    p.budget -= 1
    const dt = clamp((now - p.lastAt) / 1000, 0.01, 0.5); p.lastAt = now
    // plausibility: stay inside the world and do not travel faster than any chicken could
    let x = clamp(s.x, 0, WORLD.width), y = clamp(s.y, WORLD.minY, WORLD.maxY)
    const reach = WORLD.maxSpeed * dt + 60, dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy)
    if (d > reach) { x = p.x + dx * reach / d; y = p.y + dy * reach / d }
    p.x = x; p.y = y; p.vx = clamp(s.vx, -WORLD.maxSpeed, WORLD.maxSpeed); p.vy = clamp(s.vy, -WORLD.maxSpeed * 2, WORLD.maxSpeed * 2)
    p.face = s.face < 0 ? -1 : 1; p.state = s.state
    p.seq = s.seq
  }

  broadcastSnapshots() {
    this.tick++
    const all = [...this.players.values()]
    const far = this.tick % FAR_EVERY === 0
    for (const me of all) {
      let others = all.length - 1
      if (others > NEAR_COUNT) {
        // nearest chickens always; the rest only on "far" ticks
        const byDist = all.filter(o => o !== me).map(o => [Math.abs(o.x - me.x), o]).sort((a, b) => a[0] - b[0]).map(e => e[1])
        others = byDist.slice(0, far ? byDist.length : NEAR_COUNT)
        this.send(me, others)
      } else {
        this.send(me, all.filter(o => o !== me))
      }
    }
  }

  send(me, list) {
    if (!list.length) return
    const buf = Buffer.allocUnsafe(2 + list.length * ENTRY_BYTES)
    buf.writeUInt16LE(list.length, 0)
    let o = 2
    for (const p of list) {
      buf.writeUInt16LE(p.id, o); buf.writeFloatLE(p.x, o + 2); buf.writeFloatLE(p.y, o + 6); buf.writeFloatLE(p.vx, o + 10); buf.writeFloatLE(p.vy, o + 14)
      buf.writeInt8(p.face, o + 18); buf.writeUInt8(p.state, o + 19); buf.writeUInt16LE(0, o + 20)
      o += ENTRY_BYTES
    }
    me.client.sendBytes('w', buf)
  }
}

export { STATE_BYTES }
