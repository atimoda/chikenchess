// The Gongo, the Jukebox and the Vitrola toca-discos as elements of the Pátio's layout (Modo editor → Música). The
// Jukebox and the Vitrola are the sequencers: each one opens the songs' panel, keeps its own pick and plays it (the
// fase de notas, bound to the zone it stands in). A Gongo has no song: after its strikes it presses Tocar on the
// sequencer of its zone. Pure: the params, their limits and the strikes' count.
import { normalizeLoot, type LootEntry } from './chests'
export type GongParams = {
  hits: number // strikes to start it
  lamps: boolean // the little lamps of the strikes so far
  forget: number // seconds without a strike that clear the count (0 = never)
  stopHits: number // strikes during the song that stop it (0 = it never stops from here)
  // the Gongo do Templo: its strikes run the Templo do Gongo (the aliens' campaign, or the song picked in the
  // sequencer of its zone) in the scene around it, as the temple's fixed gong did; its own strikes are not used
  temple: boolean
}
export const GONG_HITS = { min: 1, max: 20 }
export const GONG_STOP_HITS = { min: 0, max: 10 }
export const GONG_FORGET = { min: 0, max: 30 }
// the box each one takes in the layout (its art, standing on the box's bottom)
export const GONG_BOX = { w: 224, h: 270 }
export const JUKEBOX_BOX = { w: 112, h: 214 }
export const VITROLA_BOX = { w: 150, h: 190 }
// the Recomeçar stone (Pedra Recomeçar): the stele on its plinth
export const RESET_STONE_BOX = { w: 92, h: 124 }
// where the Templo do Gongo had its gong, jukebox and stone (x from the scene's left edge): its campaign's scene is
// placed so the Gongo do Templo stands at TEMPLE_SPOTS.gong in it
export const TEMPLE_SPOTS = { gong: 560, jukebox: 1640, reset: 1770 }

export const defaultGong = (): GongParams => ({ hits: 5, lamps: true, forget: 0, stopHits: 3, temple: false })

const int = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d)
export function normalizeGong(raw: unknown): GongParams {
  const d = defaultGong()
  if (!raw || typeof raw !== 'object') return d
  const g = raw as Record<string, unknown>
  // (a song or a title saved with an old Gongo is left out: it plays the sequencer of its zone and shows its count)
  return {
    hits: int(g.hits, d.hits, GONG_HITS.min, GONG_HITS.max),
    lamps: typeof g.lamps === 'boolean' ? g.lamps : d.lamps,
    forget: int(g.forget, d.forget, GONG_FORGET.min, GONG_FORGET.max),
    stopHits: int(g.stopHits, d.stopHits, GONG_STOP_HITS.min, GONG_STOP_HITS.max),
    temple: g.temple === true,
  }
}

// one Gongo while the game runs: the strikes counted, the time since the last one and its ring
export type GongRun = { hits: number; since: number; ring: number; stops: number }
export const newGongRun = (): GongRun => ({ hits: 0, since: 0, ring: 9, stops: 0 })
export type GongOutcome = 'count' | 'start' | 'dull' | 'stop'
// a strike: while its song plays, it counts towards stopping it (or is dull); else it counts towards starting it
export function strikeGong(run: GongRun, p: GongParams, playing: boolean): GongOutcome {
  run.ring = 0; run.since = 0
  if (playing) {
    if (p.stopHits <= 0) return 'dull'
    run.stops++
    if (run.stops >= p.stopHits) { run.stops = 0; return 'stop' }
    return 'count'
  }
  run.stops = 0
  run.hits++
  if (run.hits >= p.hits) { run.hits = 0; return 'start' }
  return 'count'
}
// the time passing: a count left too long is forgotten (the stopping strikes after 4 s, like the reset stone)
export function stepGong(run: GongRun, p: GongParams, dt: number) {
  run.ring += dt; run.since += dt
  if (p.forget > 0 && run.hits > 0 && run.since > p.forget) run.hits = 0
  if (run.stops > 0 && run.since > 4) run.stops = 0
}

// ---------- the sequencers' goal ----------
// what a Jukebox or a Vitrola asks of its songs: the least accuracy at the end (%, 0 = none) and the hearts; and
// what it gives for a won song: its prize, lines of items or groups with a chance each, like a Baú's (empty: none)
export type PlayerParams = { minAccuracy: number; hearts: number; prize: LootEntry[] }
export const PLAYER_ACCURACY = { min: 0, max: 100 }
export const PLAYER_HEARTS = { min: 1, max: 9 }
export const defaultPlayer = (): PlayerParams => ({ minAccuracy: 0, hearts: 3, prize: [] })
export function normalizePlayer(raw: unknown): PlayerParams {
  const d = defaultPlayer()
  if (!raw || typeof raw !== 'object') return d
  const p = raw as Record<string, unknown>
  return { minAccuracy: int(p.minAccuracy, d.minAccuracy, PLAYER_ACCURACY.min, PLAYER_ACCURACY.max), hearts: int(p.hearts, d.hearts, PLAYER_HEARTS.min, PLAYER_HEARTS.max), prize: normalizeLoot(p.prize, d.prize) }
}
