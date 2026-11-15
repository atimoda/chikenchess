// Keeps the game's own things (training dummies, item racks, loose items, horde buttons, Gongos, Jukeboxes and Baús) in step with
// the Pátio's layout: adds the new ones, moves and resizes the ones that changed, removes the deleted ones. A loose item
// (Item solto) puts its item in the world once; taken, it does not come back until the Pátio opens again (reset). A
// rack deleted in the editor becomes a loose item with the same id, which keeps the item already there (and back). A dummy keeps its life
// and stage while it is moved; a new total life keeps the share it had. Things past a narrow world's last scene
// wait out of the world (they would land in the temple) and come back when the world is made wider.
import { cageCap } from './cages'
import type { Chest, Combat, Target } from './combat'
import { DUMMY_DEFAULTS } from './dummies'
import { SCENE_W } from './world'
import { elementWorldX, type LayoutElement } from './layout'
import { rackRespawnDelay } from './racks'

type Rack = Combat['racks'][number]
const AWAY = -1e6
// a Gongo or a Jukebox is a button the game draws: its label says which element it is; the box is where a strike
// counts (the gong's disc and frame, the jukebox's cabinet) and y is where the art's ground sits above it
const DEVICES = {
  gong: { w: 130, h: 150, lift: 40 },
  jukebox: { w: 112, h: 214, lift: 4 },
} as const
export const deviceLabel = (kind: 'gong' | 'jukebox', id: string) => `${kind}:${id}`

export function createLayoutSync(combat: Combat) {
  const targets = new Map<string, Target>()
  const racks = new Map<string, Rack>()
  const lastParams = new Map<string, string>()
  // the Baús: an open one stays open while it is moved or its params change (its new loot comes the next time)
  const chests = new Map<string, Chest>()
  // each loose item's pickup in the world (undefined once taken) and where it was put
  const looses = new Map<string, { pickupId?: number; x: number; y: number; item: string }>()
  const activePickup = (id: number | undefined) => (id === undefined ? undefined : combat.pickups.find(p => p.id === id))
  // a Gaiola waiting in the world takes the limit its place gives it (none: its model's); the souls in it stay
  const setCageLimit = (p: ReturnType<typeof activePickup>, limit: number | undefined) => { const c = p?.owned.cage; if (p && c) c.cap = cageCap(limit, combat.item(p.owned.item).cageSouls) }
  const dropPickup = (id: number | undefined) => { const p = activePickup(id); if (p) combat.pickups.splice(combat.pickups.indexOf(p), 1) }

  function sync(elements: LayoutElement[], screens: number) {
    const end = screens * SCENE_W
    const seen = new Set<string>()
    for (const el of elements) {
      if (el.kind !== 'dummy' && el.kind !== 'rack' && el.kind !== 'loose' && el.kind !== 'button' && el.kind !== 'gong' && el.kind !== 'jukebox' && el.kind !== 'chest') continue
      seen.add(el.id)
      const cx = elementWorldX(el, screens) + el.w / 2, bottom = el.y + el.h
      const inside = !!el.region || cx < end
      if (el.kind === 'chest') {
        const params = el.params.chest!
        let c = chests.get(el.id)
        if (!c) { c = combat.addChest(el.id, inside ? cx : AWAY, bottom, params); chests.set(el.id, c) }
        c.x = inside ? cx : AWAY; c.y = bottom; c.params = params
        continue
      }
      if (el.kind === 'loose') {
        const item = el.params.item!
        const x = inside ? cx : AWAY, y = bottom - el.h / 2
        let l = looses.get(el.id)
        // the rack it was: its item stays (a rack with the same id and item)
        const was = racks.get(el.id)
        if (!l && was) {
          const kept = was.item === item ? activePickup(was.pickupId) : undefined
          combat.racks.splice(combat.racks.indexOf(was), 1); racks.delete(el.id)
          if (kept) { l = { pickupId: kept.id, x, y, item }; looses.set(el.id, l) }
        }
        if (!l || l.item !== item) {
          if (l) dropPickup(l.pickupId)
          l = { pickupId: combat.addPickup(x, item, y, el.params.cageSouls), x, y, item }
          looses.set(el.id, l)
        } else if (l.x !== x || l.y !== y) {
          const p = activePickup(l.pickupId)
          if (p) { p.x = x; p.y = y; p.vy = 0; p.resting = false }
          l.x = x; l.y = y
        }
        setCageLimit(activePickup(l.pickupId), el.params.cageSouls)
        continue
      }
      if (el.kind === 'rack') {
        let r = racks.get(el.id)
        const item = el.params.item!
        if (!r || r.item !== item) {
          if (r) combat.racks.splice(combat.racks.indexOf(r), 1)
          combat.addRack(cx, item, bottom, el.params.respawnDelay, el.params.cageSouls)
          r = combat.racks[combat.racks.length - 1]
          racks.set(el.id, r)
          // the loose item it was (undone delete): it holds that item again
          const was = looses.get(el.id)
          if (was) {
            const kept = was.item === item ? activePickup(was.pickupId) : undefined
            if (kept) { r.pickupId = kept.id; r.spawnX = cx; r.spawnY = bottom } else dropPickup(was.pickupId)
            looses.delete(el.id)
          }
        }
        r.x = inside ? cx : AWAY; r.y = bottom
        r.respawnDelay = rackRespawnDelay(item, el.params.respawnDelay)
        // a Gaiola's limit here: the next ones come with it, and the one waiting takes it now
        r.cageSouls = el.params.cageSouls; setCageLimit(activePickup(r.pickupId), el.params.cageSouls)
        continue
      }
      let t = targets.get(el.id)
      if (el.kind === 'gong' || el.kind === 'jukebox') {
        const dev = DEVICES[el.kind]
        if (!t) { combat.addButton(cx, bottom - dev.lift, deviceLabel(el.kind, el.id), dev.w, dev.h); t = combat.targets[combat.targets.length - 1]; targets.set(el.id, t) }
        t.w = dev.w; t.h = dev.h; t.y = bottom - dev.lift
        const x = inside ? cx : AWAY
        if (t.home !== x) { t.x = t.home = x; t.vx = 0 }
        continue
      }
      if (el.kind === 'button') {
        if (!t) { combat.addButton(cx, bottom, el.params.action!, el.w, el.h); t = combat.targets[combat.targets.length - 1]; targets.set(el.id, t) }
        t.label = el.params.action
      } else {
        const params = { message: el.params.message ?? '', maxHp: el.params.maxHp ?? DUMMY_DEFAULTS.maxHp }
        const key = JSON.stringify(params)
        if (!t) {
          const id = combat.addTarget(cx, bottom, params)
          t = combat.targets.find(g => g.id === id)!
          targets.set(el.id, t)
        } else if (lastParams.get(el.id) !== key) combat.setDummyParams(t.id, params)
        lastParams.set(el.id, key)
      }
      t.w = el.w; t.h = el.h; t.y = bottom
      const x = inside ? cx : AWAY
      // moved (or the world changed): it goes there now
      if (t.home !== x) { t.x = t.home = x; t.vx = 0 }
    }
    for (const [id, t] of targets) if (!seen.has(id)) { const i = combat.targets.indexOf(t); if (i >= 0) combat.targets.splice(i, 1); targets.delete(id); lastParams.delete(id) }
    for (const [id, r] of racks) if (!seen.has(id)) { const i = combat.racks.indexOf(r); if (i >= 0) combat.racks.splice(i, 1); racks.delete(id) }
    for (const [id, l] of looses) if (!seen.has(id)) { dropPickup(l.pickupId); looses.delete(id) }
    for (const [id, c] of chests) if (!seen.has(id)) { const i = combat.chests.indexOf(c); if (i >= 0) combat.chests.splice(i, 1); chests.delete(id) }
  }

  // another Pátio opened: everything of the last one leaves (its dummies, racks, buttons, Baús and every item lying in the
  // world, its racks' and the ones dropped there), so the next sync builds the new one from its layout alone
  function reset() {
    for (const t of targets.values()) { const i = combat.targets.indexOf(t); if (i >= 0) combat.targets.splice(i, 1) }
    for (const r of racks.values()) { const i = combat.racks.indexOf(r); if (i >= 0) combat.racks.splice(i, 1) }
    for (const c of chests.values()) { const i = combat.chests.indexOf(c); if (i >= 0) combat.chests.splice(i, 1) }
    targets.clear(); racks.clear(); looses.clear(); chests.clear(); lastParams.clear()
    combat.pickups.length = 0
  }

  return { sync, reset, owns: (o: object) => [...targets.values()].includes(o as Target) || [...racks.values()].includes(o as Rack) }
}
