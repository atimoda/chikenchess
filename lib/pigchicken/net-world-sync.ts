// The online Pátio's shared world on this browser: decides whether it simulates the enemies (it owns the lobby) or
// mirrors the owner's, and moves enemies, hits, spawns and shots through the game server (lib/chicken/online-room.ts).
// The rules and the data are in lib/pigchicken/net-world.ts. It also sends the souls this browser's players let out,
// shows the other browsers', and passes on what a Passaguá asks of another browser and what that browser gives
// (lib/pigchicken/net-souls.ts). ParquinhoPlay calls frame() once a frame, before the combat's step.
import { getNetState, netCan, onNetWorld, remoteChicken, sendNetFoes, sendNetGive, sendNetHits, sendNetShots, sendNetSouls, sendNetSpawn, sendNetTake, type NetWorldMsg } from '../chicken/online-room'
import type { Combat } from './combat'
import { DEFAULT_ITEMS } from './items'
import { cleanHit, cleanShot, cleanSpawn, exportFoes, importFoes, newFoeCache, type NetFormation, type NetHit, type NetShot, type NetSpawn } from './net-world'
import { cleanGive, cleanTake, exportSouls } from './net-souls'

const FOES_MS = 100 // the owner's enemies: 10 times a second
const FULL_MS = 2000 // and everything about them (also right after someone joins)
const OUT_MS = 50 // shots and hits leave in batches, 20 times a second
const BATCH = 32

export type NetRole = 'off' | 'owner' | 'follower'

export function createNetWorldSync(combat: Combat) {
  let role: NetRole = 'off'
  const inbox: NetWorldMsg[] = []
  const off = onNetWorld(m => { inbox.push(m); if (inbox.length > 300) inbox.shift() })
  let cache = newFoeCache()
  const formations = new Map<number, NetFormation>()
  const hitsOut: NetHit[] = []
  let lastFoes = 0, lastFull = 0, lastOut = 0, othersKey = '', sentEmpty = true
  // the souls this browser flies: the ones the others already know, and when they were last sent (and all of them)
  const soulsTold = new Set<number>()
  let lastSouls = 0, lastSoulsFull = 0, soulsKey = '', soulsEmpty = true

  function become(next: NetRole) {
    if (next === 'follower') { combat.yieldShared(); combat.setNetFollower(h => { if (hitsOut.length < 256) hitsOut.push(h) }) }
    else { combat.setNetFollower(null); combat.adoptMirrors() }
    combat.setNetOn(next !== 'off')
    role = next
    inbox.length = 0; hitsOut.length = 0; formations.clear()
    cache = newFoeCache(); lastFull = 0; sentEmpty = true
    soulsTold.clear(); lastSoulsFull = 0; soulsEmpty = true
  }

  return {
    get role() { return role },
    get follower() { return role === 'follower' },
    /** asks the owner for a horde or a training enemy (only a follower needs to) */
    requestSpawn(spawn: NetSpawn) { sendNetSpawn(spawn) },
    /** once a frame: returns the spawns other browsers asked of this one (only while it owns the lobby) */
    frame(now: number): NetSpawn[] {
      const s = getNetState()
      const online = s.status === 'online' && !!s.info && s.myPid !== null
      const next: NetRole = !online ? 'off' : s.info!.ownerPid === s.myPid ? 'owner' : 'follower'
      if (next !== role) become(next)
      if (role === 'off') return []
      const others = s.info!.players.filter(p => p.pid !== s.myPid)

      // the other browsers' chickens: the zombies go for the nearest one
      const bodies: { x: number; y: number }[] = []
      for (const p of others) for (let slot = 0; slot < p.chickens; slot++) { const c = remoteChicken(p.pid, slot, now); if (c) bodies.push({ x: c.x, y: c.y }) }
      combat.setNetBodies(bodies)

      // souls can only be asked of the others through a server that relays it
      combat.setNetAsks(netCan('souls'))

      // ---------- in ----------
      const spawns: NetSpawn[] = []
      for (const m of inbox.splice(0)) {
        if (m.type === 'foes') {
          // an undead bird this browser just asked the owner for stays out of sight until the answer has had time
          if (role === 'follower' && m.foes && Array.isArray(m.foes.l)) importFoes(combat.targets, { ...m.foes, l: m.foes.l.filter(e => !combat.netFoeTaken(e?.[0])) }, formations, combat.netChange)
        }
        else if (m.type === 'souls') { if (others.some(p => p.pid === m.pid)) combat.importNetSouls(m.pid, m.list) }
        else if (m.type === 'take') {
          // a soul this browser flies, or (the owner) one of its undead birds: it goes to whoever asked first
          const c = cleanTake(m.take)
          const who = c && (c.k === 's' || role === 'owner') && others.some(p => p.pid === m.pid) ? combat.giveNetTake(c, s.myPid!) : null
          if (c && who) sendNetGive(m.pid, { ...c, soul: who })
        }
        // only from the browser that had it: the one in the soul's id, or the lobby's owner for its undead birds
        else if (m.type === 'give') { const c = cleanGive(m.give); if (c && m.pid === (c.k === 's' ? Math.floor(c.id / 10_000_000) : s.info!.ownerPid)) combat.applyNetGive(c) }
        else if (m.type === 'hits') { if (role === 'owner') for (const h of m.list.slice(0, 64)) { const c = cleanHit(h); if (c) combat.applyNetHit(c) } }
        else if (m.type === 'spawn') { if (role === 'owner') { const c = cleanSpawn(m.spawn); if (c) spawns.push(c) } }
        else if (m.type === 'shots') {
          const list = m.list.slice(0, BATCH).map(x => cleanShot(x, DEFAULT_ITEMS)).filter((x): x is NetShot => !!x)
          if (list.length) combat.addRemoteShots(list)
        }
      }

      // ---------- out ----------
      if (combat.netShots.length > BATCH * 2) combat.netShots.splice(0, combat.netShots.length - BATCH * 2)
      if (now - lastOut >= OUT_MS) {
        lastOut = now
        if (combat.netShots.length && others.length) sendNetShots(combat.netShots.splice(0, BATCH))
        else if (!others.length) combat.netShots.length = 0
        if (hitsOut.length) sendNetHits(hitsOut.splice(0, 64))
        for (const t of combat.netTakes.splice(0, 8)) { const to = t.k === 'f' ? s.info!.ownerPid : t.pid; if (to != null && to !== s.myPid) sendNetTake(to, { k: t.k, id: t.id }) }
        combat.netTakes.length = 0
      }
      // the souls this browser's players let out, as often as the enemies; nobody else in the lobby shows none
      combat.keepNetSouls(new Set(others.map(p => p.pid)))
      if (netCan('souls') && others.length && now - lastSouls >= FOES_MS) {
        lastSouls = now
        const key = others.map(p => p.pid).join(',')
        const full = key !== soulsKey || now - lastSoulsFull >= FULL_MS
        if (full) { soulsKey = key; lastSoulsFull = now }
        const l = exportSouls(combat.freedSouls, s.myPid!, soulsTold, full)
        // none flying: one empty message clears the others' mirrors, then quiet
        if (l.length || !soulsEmpty) { sendNetSouls(l); soulsEmpty = !l.length }
      }
      if (role === 'owner' && others.length && now - lastFoes >= FOES_MS) {
        lastFoes = now
        const key = others.map(p => p.pid).join(',')
        const full = key !== othersKey || now - lastFull >= FULL_MS
        if (full) { othersKey = key; lastFull = now }
        const foes = exportFoes(combat.targets, s.myPid!, cache, full)
        // nothing to show: one empty message clears the others' mirrors, then quiet
        if (foes.l.length || !sentEmpty) { sendNetFoes(foes); sentEmpty = !foes.l.length }
      }
      return spawns
    },
    dispose() { off(); if (role !== 'off') become('off') },
  }
}
export type NetWorldSync = ReturnType<typeof createNetWorldSync>
