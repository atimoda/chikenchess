import { Room } from 'colyseus'
import { authenticate } from './auth.mjs'
import { cleanPatioId, loadPatioMeta } from './patio-meta.mjs'
import { decodeState, encodeSnapshot, MAX_BROWSERS, WORLD } from './protocol.mjs'
import { bucket, canKick, clampChickens, cleanChat, cleanLooks, cleanName, freeColor, freePid, isProtected, ownerOf, uniqueName } from './rules.mjs'

const TICK_MS = 50 // 20 snapshots per second
const LAYOUT_MAX = 400_000 // the database's own limit for a Pátio's layout
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// One online Pátio lobby: up to 13 browsers, each with 1 to 4 chickens. Each browser simulates its own chickens and
// sends their state; the server keeps them inside the world and relays everyone's to everyone 20 times a second.
// Lobby rules (owner, kick, public / private, Edit mode) are decided here, so every browser sees the same thing.
//
// Join options: { patioId?, private?, token?, name, chickens (1..4), looks?, inputLabel?, claimed? }.
// Messages from the browser:
//   "s" bytes  its chickens' state (protocol.mjs)
//   "profile"  { name?, chickens?, looks?, inputLabel? }
//   "chat"     { text }  (always from the browser's primary chicken)
//   "kick"     { pid }            owner only
//   "visibility" { public: bool } owner only
//   "editor"   { pid, on: bool }  owner only
//   "layout"   { layout }  the Pátio's layout after an edit (owner or editor); kept for whoever joins later
//   "saved"    { revision }  the owner saved the layout to the database at this revision
// Messages to the browser:
//   "hello"    { pid, room }  right after joining
//   "room"     the room info below, whenever it changes
//   "w" bytes  snapshot (protocol.mjs)
//   "chat"     { pid, text, at }
//   "kicked"   { reason }  right before being removed
//   "denied"   { reason }  an owner action that was refused
//   "layout"   { seq, by, layout }  the live layout (right after "hello" too, when someone edited it)
//   "saved"    { revision }  the database revision the owner saved
export class PatioRoom extends Room {
  maxClients = MAX_BROWSERS
  players = new Map() // sessionId -> player
  editors = new Set() // pids allowed to edit besides the owner
  ownerPid = null
  isPublic = true
  meta = { name: null, creatorId: null, godparentId: null }
  patioId = 'default'
  tick = 0
  joinSeq = 0
  // the layout as edited live in this room (null: nobody edited it since the room opened)
  layout = null
  layoutSeq = 0

  async onCreate(options) {
    this.patioId = cleanPatioId(options?.patioId)
    this.meta = await loadPatioMeta(this.patioId, options?.claimed)
    this.isPublic = options?.private !== true
    if (!this.isPublic) await this.setPrivate(true)
    await this.setMetadata({ patioId: this.patioId, name: this.meta.name, owner: null })
    this.onMessageBytes('s', (client, bytes) => this.onState(client, bytes))
    this.onMessage('profile', (client, msg) => this.onProfile(client, msg))
    this.onMessage('chat', (client, msg) => this.onChat(client, msg))
    this.onMessage('kick', (client, msg) => this.onKick(client, msg))
    this.onMessage('visibility', (client, msg) => this.onVisibility(client, msg))
    this.onMessage('editor', (client, msg) => this.onEditor(client, msg))
    this.onMessage('layout', (client, msg) => this.onLayout(client, msg))
    this.onMessage('saved', (client, msg) => this.onSaved(client, msg))
    this.setSimulationInterval(() => this.broadcastSnapshot(), TICK_MS)
  }

  onAuth(_client, options) {
    return authenticate(options)
  }

  onUncaughtException(err, methodName) {
    console.error(`patio ${methodName}:`, err)
  }

  onJoin(client, options, auth) {
    const a = auth ?? client.auth
    const list = [...this.players.values()]
    const p = {
      pid: freePid(list), sessionId: client.sessionId, client,
      userId: a.userId, guest: a.guest, name: uniqueName(a.name, list),
      // the server's clock decides who arrived first; the counter breaks ties within the same millisecond
      joinedAt: Date.now() + (this.joinSeq++) / 1000,
      color: freeColor(list),
      chickens: clampChickens(options?.chickens),
      looks: cleanLooks(options?.looks),
      inputLabel: cleanName(options?.inputLabel),
      state: new Map(), // slot -> latest chicken state
      sendOk: bucket(30, 40), chatOk: bucket(2, 4), profileOk: bucket(4, 8), layoutOk: bucket(4, 8),
    }
    this.players.set(client.sessionId, p)
    this.settleOwner()
    client.send('hello', { pid: p.pid, room: this.info() })
    if (this.layout) client.send('layout', { seq: this.layoutSeq, by: 0, layout: this.layout })
    this.broadcastInfo(client)
  }

  onLeave(client) {
    if (!this.players.delete(client.sessionId)) return
    this.settleOwner()
    this.broadcastInfo()
  }

  // the owner follows ownerOf(); when it changes, only the new owner edits again
  settleOwner() {
    const owner = ownerOf([...this.players.values()], this.meta.creatorId)
    if (owner !== this.ownerPid) { this.ownerPid = owner; this.editors.clear() }
    const present = new Set([...this.players.values()].map(p => p.pid))
    for (const pid of this.editors) if (!present.has(pid)) this.editors.delete(pid)
    const o = this.byPid(owner)
    void this.setMetadata({ patioId: this.patioId, name: this.meta.name, owner: o?.name ?? null })
  }

  byPid(pid) { for (const p of this.players.values()) if (p.pid === pid) return p; return null }

  info() {
    return {
      roomId: this.roomId, patioId: this.patioId, name: this.meta.name, public: this.isPublic,
      ownerPid: this.ownerPid, editors: [...this.editors],
      players: [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt).map(p => ({
        pid: p.pid, name: p.name, guest: p.guest, userId: p.userId, color: p.color, chickens: p.chickens, looks: p.looks,
        inputLabel: p.inputLabel, joinedAt: Math.floor(p.joinedAt), protected: isProtected(p, this.meta),
      })),
    }
  }
  broadcastInfo(except) {
    const info = this.info()
    for (const c of this.clients) if (c !== except) c.send('room', info)
  }

  onState(client, bytes) {
    const p = this.players.get(client.sessionId)
    if (!p || !p.sendOk()) return
    const s = decodeState(bytes)
    if (!s) return
    for (const c of s.chickens) {
      if (c.slot >= p.chickens) continue
      p.state.set(c.slot, {
        x: clamp(c.x, WORLD.minX, WORLD.maxX), y: clamp(c.y, WORLD.minY, WORLD.maxY),
        vx: clamp(c.vx, -WORLD.maxSpeed, WORLD.maxSpeed), vy: clamp(c.vy, -WORLD.maxSpeed, WORLD.maxSpeed),
        face: c.face, state: c.state, item: c.item,
      })
    }
  }

  onProfile(client, msg) {
    const p = this.players.get(client.sessionId)
    if (!p || !p.profileOk() || !msg || typeof msg !== 'object') return
    if (typeof msg.name === 'string' && cleanName(msg.name)) p.name = uniqueName(cleanName(msg.name), [...this.players.values()], p)
    if (msg.chickens !== undefined) {
      p.chickens = clampChickens(msg.chickens)
      for (const slot of [...p.state.keys()]) if (slot >= p.chickens) p.state.delete(slot)
    }
    if (msg.looks !== undefined) p.looks = cleanLooks(msg.looks)
    if (typeof msg.inputLabel === 'string') p.inputLabel = cleanName(msg.inputLabel)
    this.settleOwner()
    this.broadcastInfo()
  }

  onChat(client, msg) {
    const p = this.players.get(client.sessionId)
    const text = cleanChat(msg?.text)
    if (!p || !text || !p.chatOk()) return
    this.broadcast('chat', { pid: p.pid, text, at: Date.now() })
  }

  owner(client) {
    const p = this.players.get(client.sessionId)
    if (p && p.pid === this.ownerPid) return p
    client.send('denied', { reason: 'Só o dono do lobby pode fazer isso.' })
    return null
  }

  onKick(client, msg) {
    const actor = this.players.get(client.sessionId), target = this.byPid(Number(msg?.pid))
    const reason = canKick(actor, target, this.ownerPid, this.meta)
    if (reason) { client.send('denied', { reason }); return }
    target.client.send('kicked', { reason: 'O dono do lobby removeu você.' })
    target.client.leave(4001)
  }

  async onVisibility(client, msg) {
    if (!this.owner(client)) return
    this.isPublic = msg?.public !== false
    await this.setPrivate(!this.isPublic)
    this.broadcastInfo()
  }

  onEditor(client, msg) {
    if (!this.owner(client)) return
    const pid = Number(msg?.pid)
    if (pid === this.ownerPid || !this.byPid(pid)) return
    if (msg?.on) this.editors.add(pid); else this.editors.delete(pid)
    this.broadcastInfo()
  }

  canEdit(p) { return !!p && (p.pid === this.ownerPid || this.editors.has(p.pid)) }

  onLayout(client, msg) {
    const p = this.players.get(client.sessionId)
    if (!this.canEdit(p)) { client.send('denied', { reason: 'O dono do lobby não liberou a edição para você.' }); return }
    if (!p.layoutOk()) return
    const layout = msg?.layout
    if (!layout || typeof layout !== 'object' || !Array.isArray(layout.elements) || JSON.stringify(layout).length > LAYOUT_MAX) return
    this.layout = layout
    this.layoutSeq++
    this.broadcast('layout', { seq: this.layoutSeq, by: p.pid, layout }, { except: client })
  }

  onSaved(client, msg) {
    const p = this.players.get(client.sessionId)
    const revision = Number(msg?.revision)
    if (!p || p.pid !== this.ownerPid || !Number.isInteger(revision) || revision < 1) return
    this.broadcast('saved', { revision }, { except: client })
  }

  // everyone's chickens to everyone: with 13 browsers × 4 chickens that is ~1.1 kB per tick; the same bytes go to
  // every browser, which skips its own pid
  broadcastSnapshot() {
    if (this.players.size < 2) return
    this.tick++
    const entries = []
    for (const p of this.players.values()) for (const [slot, c] of p.state) entries.push({ pid: p.pid, slot, ...c })
    if (!entries.length) return
    const bytes = encodeSnapshot(entries, this.tick)
    for (const c of this.clients) c.sendBytes('w', bytes)
  }
}
