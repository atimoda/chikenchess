import { defineRoom, defineServer, listen, matchMaker } from 'colyseus'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { PatioRoom } from './patio-room.mjs'
import { MAX_BROWSERS } from './protocol.mjs'

const port = Number(process.env.PORT ?? 2567)
// the site's addresses allowed to read the lobby list (comma separated); "*" in development
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*').split(',').map(s => s.trim()).filter(Boolean)

// Matchmaking: joinOrCreate('patio', { patioId }) fills the oldest public, unlocked room of that Pátio with a free
// seat (13 browsers), else opens a new one. Private rooms are left out and only joined by their room id (invite).
const patio = defineRoom(PatioRoom).filterBy(['patioId']).sortBy({ createdAt: 1 })

const server = defineServer({
  transport: new WebSocketTransport({ pingInterval: 5000, pingMaxRetries: 3 }),
  rooms: { patio },
  express: app => {
    app.use((req, res, next) => {
      const origin = req.headers.origin
      if (ORIGINS.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*')
      else if (origin && ORIGINS.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin') }
      next()
    })
    app.get('/health', (_req, res) => res.json({ ok: true }))
    // the public lobbies, oldest first: the lobby switcher and the live counts of the "Abrir" lists
    app.get('/lobbies', async (_req, res) => {
      const rooms = await matchMaker.query({ name: 'patio', private: false }, { createdAt: 1 })
      res.setHeader('Cache-Control', 'no-store')
      res.json(rooms.map(r => ({
        roomId: r.roomId, patioId: r.metadata?.patioId ?? 'default', name: r.metadata?.name ?? null, owner: r.metadata?.owner ?? null,
        players: r.clients, max: MAX_BROWSERS, createdAt: r.createdAt,
      })))
    })
  },
})
await listen(server, port)
console.log(`game server listening on :${port}`)
