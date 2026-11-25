// "Blocos são zonas sonoras": each block of the Grade de blocos is also a Zona sonora. A block takes the zone of the
// scene it stands in (its key, scale, tempo and bass) with its own percussion: one rhythm drawn from the chosen ones
// for `rhythm`% of the blocks, Silêncio for the rest. The draw comes from the saved seed, so every browser draws the
// same; "Sortear" saves a new seed. Pure: the Parquinho plays the boxes (under every Zona sonora of the map, over
// the scenes' own zones) and the "Zonas sonoras" layer draws the ones with a rhythm. Settings in mine-zone-params.ts.
import { mineCellRect, mineRandom, type MineGeo } from './mine-grid'
import { mineZonePool, type MineZoneParams } from './mine-zone-params'
import { beatLabel, type BeatId } from './zone-ambience'
import { sceneEdgeList, sceneZoneParams, type SceneEdges, type SceneZones, type SoundZoneParams, type ZoneBox } from './sound-zones'

// over the scenes' own zones (0), under every Zona sonora of the map (1 and up)
export const MINE_ZONE_PRIORITY = 0.5

// the rhythm of every block, by its index in the grid (row by row from the ground): exactly `rhythm`% of them
// (rounded) get one, drawn from the chosen rhythms; none chosen leaves every block in silence
export function mineZoneBeats(count: number, z: Pick<MineZoneParams, 'rhythm' | 'all' | 'pool' | 'seed'>): BeatId[] {
  const out: BeatId[] = Array.from({ length: count }, () => 'none')
  const pool = mineZonePool(z), n = Math.round((count * Math.max(0, Math.min(100, z.rhythm))) / 100)
  if (!pool.length || !n) return out
  const rnd = mineRandom(z.seed), order = Array.from({ length: count }, (_, i) => i)
  // the first n of a shuffle (Fisher–Yates)
  for (let i = count - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  for (let k = 0; k < n; k++) out[order[k]] = pool[Math.floor(rnd() * pool.length)]
  return out
}

export type MineZoneBox = ZoneBox & { c: number; r: number; beat: BeatId }

// the blocks' zones as boxes of the world. Each box reaches half the gap past its block, so the zones of the grid
// touch and walking from one block to the next does not pass through the scene's zone. Blocks in the same scene with
// the same rhythm share one zone (its id and its params): walking between them the music goes on unchanged.
export function mineZoneBoxes(geo: MineGeo, z: MineZoneParams, scenes: { zones?: SceneZones; edges?: SceneEdges; screens: number }): MineZoneBox[] {
  if (!z.on) return []
  const beats = mineZoneBeats(geo.cols * geo.rows, z), xs = sceneEdgeList(scenes.edges, scenes.screens)
  const sceneAt = (x: number) => { let s = 0; while (s + 1 < xs.length - 1 && x >= xs[s + 1]) s++; return s }
  const made = new Map<string, SoundZoneParams>(), out: MineZoneBox[] = [], half = geo.gap / 2
  for (let r = 0; r < geo.rows; r++) for (let c = 0; c < geo.cols; c++) {
    const b = mineCellRect(geo, c, r), s = sceneAt(b.x + b.w / 2), beat = beats[r * geo.cols + c], id = `bloco:cena${s}:${beat}`
    let zone = made.get(id)
    if (!zone) {
      const scene = sceneZoneParams(scenes.zones, s)
      // the scene's zone with the block's percussion (its variation blocks would bring their own beats back)
      const { blocks: _b, beats: _n, reps: _r, ...base } = scene
      // a block with a rhythm plays it (its music on, whatever the scene's toggle), with the scene's bass only when
      // the scene's music is on; a block in Silêncio sounds like the scene
      const bass = scene.ambienceOn ? { bass: scene.ambience.bass, ...(scene.ambience.bassVol !== undefined ? { bassVol: scene.ambience.bassVol } : {}), ...(scene.ambience.bassOct !== undefined ? { bassOct: scene.ambience.bassOct } : {}) } : { bass: 'none' as const }
      const { ambienceOn: _on, ...rest } = base
      zone = { ...rest, name: beat === 'none' ? scene.name : `${scene.name} · ${beatLabel(beat)}`, life: 0, priority: MINE_ZONE_PRIORITY, ambience: { ...bass, beat }, ...(beat !== 'none' || scene.ambienceOn ? { ambienceOn: true as const } : {}) }
      made.set(id, zone)
    }
    out.push({ id, c, r, beat, x: b.x - half, y: b.y - half, w: b.w + geo.gap, h: b.h + geo.gap, zone })
  }
  return out
}
