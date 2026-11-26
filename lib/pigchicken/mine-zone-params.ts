// "Blocos são zonas sonoras" (the Grade de blocos' own Zonas sonoras): its settings as the Pátio saves them in
// settings.mineGrid.zones, and the choice of rhythms that go into the draw. Pure; the zones themselves are made in
// mine-zones.ts.
import { BEATS, type BeatId } from './beats'
import { t } from '../i18n'

// on: every block is a sound zone; rhythm: the share of blocks, whole percents, that get a rhythm drawn (the rest:
// Silêncio); all: "Todos", every rhythm the game has goes into the draw (the ones added later too); pool: otherwise,
// the rhythms chosen one by one; seed: the draw ("Sortear" makes a new one)
export type MineZoneParams = { on: boolean; rhythm: number; all: boolean; pool: BeatId[]; seed: number }
export const MINE_ZONE_RHYTHM = { min: 0, max: 100, step: 1, default: 3 } as const
export const MINE_ZONE_SEED = 1
export const defaultMineZones = (): MineZoneParams => ({ on: true, rhythm: MINE_ZONE_RHYTHM.default, all: true, pool: [], seed: MINE_ZONE_SEED })

const BEAT_ORDER = BEATS.map(b => b.id)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
// the rhythms of a pool, each once and in the game's order
const inOrder = (ids: Iterable<unknown>) => { const set = new Set(ids); return BEAT_ORDER.filter(id => set.has(id)) }

// what a Pátio saved (nothing saved: on, with the defaults)
export function normalizeMineZones(raw: unknown): MineZoneParams {
  const d = defaultMineZones()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d
  const p = raw as Record<string, unknown>
  const rhythm = typeof p.rhythm === 'number' && Number.isFinite(p.rhythm) ? Math.round(clamp(p.rhythm, MINE_ZONE_RHYTHM.min, MINE_ZONE_RHYTHM.max)) : d.rhythm
  const seed = typeof p.seed === 'number' && Number.isFinite(p.seed) ? Math.abs(Math.round(p.seed)) % 0x7fffffff : d.seed
  const pool = Array.isArray(p.pool) ? inOrder(p.pool) : []
  // every rhythm chosen one by one is "Todos"
  const all = p.all !== false || pool.length === BEAT_ORDER.length
  return { on: p.on !== false, rhythm, all, pool: all ? [] : pool, seed }
}

// the rhythms that go into the draw
export const mineZonePool = (z: Pick<MineZoneParams, 'all' | 'pool'>): BeatId[] => (z.all ? BEAT_ORDER.slice() : z.pool.slice())
export const mineZoneHas = (z: Pick<MineZoneParams, 'all' | 'pool'>, id: BeatId) => z.all || z.pool.includes(id)

// a mark of the rhythms' list changed. "Todos" marks or clears every rhythm; a rhythm cleared while "Todos" is on
// clears "Todos" too (from then on the rhythms are chosen one by one); marking the last one missing is "Todos" again
export function toggleMineZoneBeat(z: MineZoneParams, id: BeatId | 'all', on: boolean): MineZoneParams {
  if (id === 'all') return { ...z, all: on, pool: [] }
  const pool = new Set(mineZonePool(z))
  if (on) pool.add(id); else pool.delete(id)
  const list = inOrder(pool), all = list.length === BEAT_ORDER.length
  return { ...z, all, pool: all ? [] : list }
}

// how the list reads closed: "Todos", "Nenhum", the one chosen, or how many
export function mineZonePoolLabel(z: Pick<MineZoneParams, 'all' | 'pool'>) {
  if (z.all) return t('Todos')
  if (!z.pool.length) return t('Nenhum')
  if (z.pool.length === 1) return t(BEATS.find(b => b.id === z.pool[0])?.label ?? '1 ritmo')
  return t('{n} ritmos', { n: z.pool.length })
}
