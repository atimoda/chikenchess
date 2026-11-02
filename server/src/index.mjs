import { defineRoom, defineServer, listen } from 'colyseus'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { PatioRoom } from './patio-room.mjs'

const port = Number(process.env.PORT ?? 2567)
const server = defineServer({
  transport: new WebSocketTransport({ pingInterval: 5000, pingMaxRetries: 3 }),
  rooms: { patio: defineRoom(PatioRoom) },
})
await listen(server, port)
console.log(`game server listening on :${port}`)
