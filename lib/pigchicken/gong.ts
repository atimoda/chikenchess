// The Gongo and the Jukebox as elements of the Pátio's layout (Modo editor → Música). A Gongo plays the song it
// was set to after a number of strikes; the Jukebox opens the songs' panel and plays the one picked there. Both play
// the note stage (the guitar hero mode) wherever they stand. Pure: the params, their limits and the strikes' count.
export type GongParams = {
  song: string // the song it plays (an id of the jukebox's library)
  hits: number // strikes to start it
  title: string // the label over the frame ("" = none)
  lamps: boolean // the little lamps of the strikes so far
  forget: number // seconds without a strike that clear the count (0 = never)
  stopHits: number // strikes during the song that stop it (0 = it never stops from here)
  // the Gongo do Templo: its strikes run the Templo do Gongo (the aliens' campaign, or the song picked in a jukebox)
  // in the scene around it, as the temple's fixed gong did; its own song, strikes and title are not used
  temple: boolean
}
export const GONG_DEFAULT_SONG = 'teste'
export const GONG_TITLE = 'BATA NO GONGO'
export const GONG_TITLE_MAX = 40
export const GONG_HITS = { min: 1, max: 20 }
export const GONG_STOP_HITS = { min: 0, max: 10 }
export const GONG_FORGET = { min: 0, max: 30 }
// the box each one takes in the layout (its art, standing on the box's bottom)
export const GONG_BOX = { w: 224, h: 270 }
export const JUKEBOX_BOX = { w: 112, h: 214 }
// the Recomeçar stone (Pedra Recomeçar): the stele on its plinth
export const RESET_STONE_BOX = { w: 92, h: 124 }
// where the Templo do Gongo had its gong, jukebox and stone (x from the scene's left edge): its campaign's scene is
// placed so the Gongo do Templo stands at TEMPLE_SPOTS.gong in it
export const TEMPLE_SPOTS = { gong: 560, jukebox: 1640, reset: 1770 }

export const defaultGong = (song = GONG_DEFAULT_SONG): GongParams => ({ song, hits: 5, title: GONG_TITLE, lamps: true, forget: 0, stopHits: 3, temple: false })

const int = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d)
export function normalizeGong(raw: unknown): GongParams {
  const d = defaultGong()
  if (!raw || typeof raw !== 'object') return d
  const g = raw as Record<string, unknown>
  return {
    song: typeof g.song === 'string' && /^[a-z0-9-]{1,64}$/.test(g.song) ? g.song : d.song,
    hits: int(g.hits, d.hits, GONG_HITS.min, GONG_HITS.max),
    title: typeof g.title === 'string' ? g.title.slice(0, GONG_TITLE_MAX) : d.title,
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
