// The online Pátio's shared world on this browser: decides whether it simulates the enemies (it owns the lobby) or
// mirrors the owner's, and moves enemies, hits, spawns and shots through the game server (lib/chicken/online-room.ts).
// The rules and the data are in lib/pigchicken/net-world.ts. ParquinhoPlay calls frame() once a frame, before the
// combat's step.
import { getNetState, onNetWorld, remoteChicken, sendNetFoes, sendNetHits, sendNetShots, sendNetSpawn, type NetWorldMsg } from '../chicken/online-room'
import type { Combat } from './combat'
import { DEFAULT_ITEMS } from './items'
import { cleanHit, cleanShot, cleanSpawn, exportFoes, importFoes, newFoeCache, type NetFormation, type NetHit, type NetShot, type NetSpawn } from './net-world'

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

  function become(next: NetRole) {
    if (next === 'follower') { combat.yieldShared(); combat.setNetFollower(h => { if (hitsOut.length < 256) hitsOut.push(h) }) }
    else { combat.setNetFollower(null); combat.adoptMirrors() }
    combat.setNetOn(next !== 'off')
    role = next
    inbox.length = 0; hitsOut.length = 0; formations.clear()
    cache = newFoeCache(); lastFull = 0; sentEmpty = true
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
      }

      // ---------- out ----------
      if (combat.netShots.length > BATCH * 2) combat.netShots.splice(0, combat.netShots.length - BATCH * 2)
      if (now - lastOut >= OUT_MS) {
        lastOut = now
        if (combat.netShots.length && others.length) sendNetShots(combat.netShots.splice(0, BATCH))
        else if (!others.length) combat.netShots.length = 0
        if (hitsOut.length) sendNetHits(hitsOut.splice(0, 64))
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
