// Keeps the game's own things (training dummies, item racks, horde buttons, Gongos and Jukeboxes) in step with the Pátio's layout:
// adds the new ones, moves and resizes the ones that changed, removes the deleted ones. A dummy keeps its life
// and stage while it is moved; a new total life keeps the share it had. Things past a narrow world's last scene
// wait out of the world (they would land in the temple) and come back when the world is made wider.
import type { Combat, Target } from './combat'
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

  function sync(elements: LayoutElement[], screens: number) {
    const end = screens * SCENE_W
    const seen = new Set<string>()
    for (const el of elements) {
      if (el.kind !== 'dummy' && el.kind !== 'rack' && el.kind !== 'button' && el.kind !== 'gong' && el.kind !== 'jukebox') continue
      seen.add(el.id)
      const cx = elementWorldX(el, screens) + el.w / 2, bottom = el.y + el.h
      const inside = !!el.region || cx < end
      if (el.kind === 'rack') {
        let r = racks.get(el.id)
        const item = el.params.item!
        if (!r || r.item !== item) {
          if (r) combat.racks.splice(combat.racks.indexOf(r), 1)
          combat.addRack(cx, item, bottom, el.params.respawnDelay)
          r = combat.racks[combat.racks.length - 1]
          racks.set(el.id, r)
        }
        r.x = inside ? cx : AWAY; r.y = bottom
        r.respawnDelay = rackRespawnDelay(item, el.params.respawnDelay)
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
  }

  return { sync, owns: (o: object) => [...targets.values()].includes(o as Target) || [...racks.values()].includes(o as Rack) }
}
