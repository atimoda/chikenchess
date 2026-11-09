// The online Pátio's shared world on this browser: decides whether it simulates the world (it owns the lobby) or
// mirrors the owner's, and moves enemies, hits, spawns, shots, the items on the floor, the layout's dummies and the
// Templo do Gongo through the game server (lib/chicken/online-room.ts). The rules and the data are in
// lib/pigchicken/net-world.ts, net-state.ts and net-temple.ts. ParquinhoPlay calls frame() once a frame, before the
// combat's step.
import { getNetState, onNetWorld, remoteChicken, sendNetAsk, sendNetFoes, sendNetGive, sendNetHits, sendNetShots, sendNetSpawn, sendNetWorldState, type NetWorldMsg } from '../chicken/online-room'
import type { Combat } from './combat'
import { DEFAULT_ITEMS } from './items'
import { cleanHit, cleanShot, cleanSpawn, exportFoes, importFoes, netIdFor, newFoeCache, type NetAsk, type NetFormation, type NetHit, type NetShot, type NetSpawn } from './net-world'
import { cleanAsk, exportDummies, exportPickups, importDummies, importPickups, nearAny } from './net-state'
import { cleanTempleEvent, exportTemple, importTemple, relaysSound, templeAlienKey, type NetTempleEvent } from './net-temple'
import type { Temple, TempleAsk } from './temple'
import type { TempleSound } from './temple-music'

const FOES_MS = 100 // the owner's enemies: 10 times a second
const FULL_MS = 2000 // and everything about them (also right after someone joins)
const OUT_MS = 50 // shots, hits and asks leave in batches, 20 times a second
const BATCH = 32

export type NetRole = 'off' | 'owner' | 'follower'
// what the other browsers asked of the owner's temple this frame
export type TempleAsks = { gong: boolean; reset: boolean; start: boolean; list: TempleAsk[] }
const noAsks = (): TempleAsks => ({ gong: false, reset: false, start: false, list: [] })

// a dummy mended by a beam reports a little every frame: one report per dummy and kind per batch
function mergeDummyHits(list: NetHit[]) {
  const out: NetHit[] = [], byKey = new Map<string, NetHit>()
  for (const h of list) {
    if (!h.k) { out.push(h); continue }
    const key = `${h.k}:${h.n ? 'n' : 'd'}`
    const prev = byKey.get(key)
    if (prev && h.n) { prev.d += h.d; prev.x = h.x; prev.y = h.y; continue }
    byKey.set(key, h); out.push(h)
  }
  return out
}

export function createNetWorldSync(combat: Combat) {
  let role: NetRole = 'off'
  const inbox: NetWorldMsg[] = []
  const off = onNetWorld(m => { inbox.push(m); if (inbox.length > 300) inbox.shift() })
  let cache = newFoeCache()
  const formations = new Map<number, NetFormation>()
  const hitsOut: NetHit[] = []
  const asksOut: NetAsk[] = []
  let temple: Temple | null = null
  let templeAsks = noAsks()
  // the owner's temple: what it played since the last send; the others: what the owner's played, to play here
  const templeOut: NetTempleEvent[] = []
  const templeIn: NetTempleEvent[] = []
  let lastFoes = 0, lastFull = 0, lastOut = 0, othersKey = '', sentEmpty = true
  let stateFull = 0, sentPickups = '', sentDummies = '', sentTemple = '', sentAliens = ''
  let bodies: { x: number; y: number }[] = []

  function become(next: NetRole) {
    if (next === 'follower') {
      combat.yieldShared()
      combat.setNetFollower(h => { if (hitsOut.length < 256) hitsOut.push(h) })
      combat.setNetAsk(a => { if (asksOut.length < 64) asksOut.push(a) })
    } else { combat.setNetFollower(null); combat.setNetAsk(null); combat.adoptMirrors() }
    combat.setNetOn(next !== 'off')
    role = next
    inbox.length = 0; hitsOut.length = 0; asksOut.length = 0; formations.clear()
    templeAsks = noAsks(); templeOut.length = 0; templeIn.length = 0
    cache = newFoeCache(); lastFull = 0; sentEmpty = true
    stateFull = 0; sentPickups = ''; sentDummies = ''; sentTemple = ''; sentAliens = ''
  }

  // the owner: what another browser asked
  function onAsk(pid: number, list: unknown[]) {
    const s = getNetState()
    const player = s.info?.players.find(p => p.pid === pid)
    if (!player) return
    const theirs: { x: number; y: number }[] = []
    for (let slot = 0; slot < player.chickens; slot++) { const c = remoteChicken(pid, slot); if (c) theirs.push(c) }
    const gives: unknown[] = []
    for (const raw of list.slice(0, BATCH)) {
      const a = cleanAsk(raw, DEFAULT_ITEMS)
      if (!a) continue
      if (a.k === 'take') {
        const p = combat.pickups.find(q => q.net === a.id && !q.mirror)
        // only near one of its chickens, and only once
        if (!p || !nearAny(p.x, p.y, theirs)) continue
        const got = combat.netTake(a.id)
        if (got && gives.length < 16) gives.push({ k: 'give', id: a.id, pl: a.pl, o: { item: got.owned.item, ammo: got.owned.ammo, durability: got.owned.durability }, x: got.x, y: got.y })
      } else if (a.k === 'drop') combat.netDrop({ ...a.o }, a.x, a.y, a.vy, !!a.r, a.n)
      else if (a.k === 'gong') templeAsks.gong = true
      else if (a.k === 'reset') templeAsks.reset = true
      else if (a.k === 'start') templeAsks.start = true
      else if (templeAsks.list.length < 64) templeAsks.list.push(a)
    }
    if (gives.length) sendNetGive(pid, gives)
  }

  // the others: what the owner granted here
  function onGive(list: unknown[]) {
    for (const g of list.slice(0, 16)) {
      const o = g as { id?: unknown; pl?: unknown; o?: { item?: unknown; ammo?: unknown; durability?: unknown }; x?: unknown; y?: unknown }
      const item = o?.o?.item
      if (typeof item !== 'string' || !(item in DEFAULT_ITEMS) || typeof o.pl !== 'string') continue
      const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
      combat.netGive(o.pl, { item: item as keyof typeof DEFAULT_ITEMS, ammo: Math.max(0, n(o.o!.ammo)), durability: Math.max(0, n(o.o!.durability)) }, n(o.x), n(o.y), typeof o.id === 'number' ? o.id : undefined)
    }
  }

  function onState(st: Record<string, unknown>) {
    if (st.p !== undefined) importPickups(combat.pickups, st.p, DEFAULT_ITEMS)
    if (st.d !== undefined) importDummies(combat, st.d)
    if (st.tp !== undefined && temple) importTemple(temple.state, st.tp)
    if (Array.isArray(st.te)) for (const e of st.te.slice(0, 48)) { const c = cleanTempleEvent(e); if (c && templeIn.length < 96) templeIn.push(c) }
  }

  // the owner: its floor, dummies and temple, when they changed (and everything every couple of seconds)
  function sendState(pid: number, full: boolean) {
    const out: Record<string, unknown> = {}
    const p = exportPickups(combat.pickups, combat.racks, pid), pk = JSON.stringify(p)
    if (full || pk !== sentPickups) { out.p = p; sentPickups = pk }
    const d = exportDummies(combat.targets), dk = JSON.stringify(d)
    if (full || dk !== sentDummies) { out.d = d; sentDummies = dk }
    if (temple) {
      const s = temple.state
      const idOf = (id: number) => { const t = combat.targets.find(g => g.id === id); return t ? (t.net ??= netIdFor(pid, t.id)) : netIdFor(pid, id) }
      const ak = templeAlienKey(s)
      const tp = exportTemple(s, idOf, full || ak !== sentAliens)
      const key = JSON.stringify([s.phase, s.stage, s.gongHits, s.resetHits, s.score, s.hearts, s.combo, s.banner?.title, s.banner?.sub])
      const busy = s.phase === 'intro' || s.phase === 'playing' || s.bombs.length > 0
      if (full || busy || key !== sentTemple || ak !== sentAliens) { out.tp = tp; sentTemple = key; sentAliens = ak }
    }
    if (templeOut.length) out.te = templeOut.splice(0, 48)
    if (Object.keys(out).length) sendNetWorldState(out)
  }

  return {
    get role() { return role },
    get follower() { return role === 'follower' },
    /** the temple this browser runs (owner) or follows (the others) */
    setTemple(t: Temple | null) { temple = t },
    /** the other browsers' chickens (world units), as of the last frame */
    get bodies() { return bodies },
    /** asks the owner for a horde or a training enemy (only a follower needs to) */
    requestSpawn(spawn: NetSpawn) { sendNetSpawn(spawn) },
    /** not the owner: a strike of the temple's gong or reset stone, the campaign's Tocar, a hurt, a grade */
    askTemple(a: NetAsk) { if (role === 'follower' && asksOut.length < 64) asksOut.push(a) },
    /** the owner: what the others asked of its temple since the last call */
    takeTempleAsks(): TempleAsks { const a = templeAsks; templeAsks = noAsks(); return a },
    /** the owner: a sound or effect of its temple, for the others to play too */
    templeEvent(e: NetTempleEvent) {
      if (role !== 'owner' || templeOut.length >= 48) return
      if ('s' in e && !relaysSound(e.s)) return
      templeOut.push(e)
    },
    /** the others: the sounds and effects the owner's temple played (the kill's note on this browser's grid) */
    takeTempleEvents(toGrid: () => number): NetTempleEvent[] {
      return templeIn.splice(0).map(e => ('s' in e && e.s.kind === 'kill' ? { s: { ...e.s, at: toGrid() } as TempleSound } : e))
    },
    /** once a frame: returns the spawns other browsers asked of this one (only while it owns the lobby) */
    frame(now: number): NetSpawn[] {
      const s = getNetState()
      const online = s.status === 'online' && !!s.info && s.myPid !== null
      const next: NetRole = !online ? 'off' : s.info!.ownerPid === s.myPid ? 'owner' : 'follower'
      if (next !== role) become(next)
      if (role === 'off') { bodies = []; return [] }
      const others = s.info!.players.filter(p => p.pid !== s.myPid)

      // the other browsers' chickens: the zombies go for the nearest one, the temple's aliens for any inside
      bodies = []
      for (const p of others) for (let slot = 0; slot < p.chickens; slot++) { const c = remoteChicken(p.pid, slot, now); if (c) bodies.push({ x: c.x, y: c.y }) }
      combat.setNetBodies(bodies)

      // ---------- in ----------
      const spawns: NetSpawn[] = []
      for (const m of inbox.splice(0)) {
        if (m.type === 'foes') { if (role === 'follower' && m.foes && Array.isArray(m.foes.l)) importFoes(combat.targets, m.foes, formations, combat.netChange) }
        else if (m.type === 'hits') { if (role === 'owner') for (const h of m.list.slice(0, 64)) { const c = cleanHit(h); if (c) combat.applyNetHit(c) } }
        else if (m.type === 'spawn') { if (role === 'owner') { const c = cleanSpawn(m.spawn); if (c) spawns.push(c) } }
        else if (m.type === 'shots') {
          const list = m.list.slice(0, BATCH).map(x => cleanShot(x, DEFAULT_ITEMS)).filter((x): x is NetShot => !!x)
          if (list.length) combat.addRemoteShots(list)
        }
        else if (m.type === 'world') { if (role === 'follower') onState(m.state) }
        else if (m.type === 'ask') { if (role === 'owner') onAsk(m.pid, m.list) }
        else if (m.type === 'give') { if (role === 'follower') onGive(m.list) }
      }

      // ---------- out ----------
      if (combat.netShots.length > BATCH * 2) combat.netShots.splice(0, combat.netShots.length - BATCH * 2)
      if (now - lastOut >= OUT_MS) {
        lastOut = now
        if (combat.netShots.length && others.length) sendNetShots(combat.netShots.splice(0, BATCH))
        else if (!others.length) combat.netShots.length = 0
        if (hitsOut.length) sendNetHits(mergeDummyHits(hitsOut.splice(0)).slice(0, 64))
        if (asksOut.length) sendNetAsk(asksOut.splice(0, BATCH))
      }
      if (role === 'owner' && others.length && now - lastFoes >= FOES_MS) {
        lastFoes = now
        const key = others.map(p => p.pid).join(',')
        const full = key !== othersKey || now - lastFull >= FULL_MS
        if (full) { othersKey = key; lastFull = now }
        const foes = exportFoes(combat.targets, s.myPid!, cache, full)
        // nothing to show: one empty message clears the others' mirrors, then quiet
        if (foes.l.length || !sentEmpty) { sendNetFoes(foes); sentEmpty = !foes.l.length }
        const stateAll = full || now - stateFull >= FULL_MS
        if (stateAll) stateFull = now
        sendState(s.myPid!, stateAll)
      }
      if (role === 'owner' && !others.length) templeOut.length = 0
      return spawns
    },
    dispose() { off(); if (role !== 'off') become('off') },
  }
}
export type NetWorldSync = ReturnType<typeof createNetWorldSync>
