// A song's cover, drawn from its own sequence (made again whenever the song changes). Sulco: the song as a record
// seen from above, time running from the centre out to the rim, each note a dot at the angle of its lane, in the
// colour of its degree and the size and glow of its shot, each alien's path a thin line through its notes and the
// long rests empty rings. Grade: the timeline folded into rows of 4 bars inside the square, like a piano roll.
// Plain geometry in a unit square (0..1), so the jukebox, its panel and the end of a song draw the same cover.
import type { Song } from './note-stage'
import { alienNotes, spawnBeat } from './note-stage'
import { fanAngleOf, fanNotes } from './fan'
import { DEGREE_COLORS, SCALES } from './music'
import { BUILTIN_VARIANTS, variantFor, type Catalog } from './alien-catalog'
import type { CoverPalette, CoverStyle } from './song-library'

export type CoverDot = { x: number; y: number; r: number; color: string; glow: number }
export type CoverArt = {
  dots: CoverDot[]
  paths: { pts: { x: number; y: number }[]; color: string }[]
  rings: number[] // radii of the empty rings (Sulco)
  rows: number // rows of 4 bars (Grade)
}
const BAR = 4, ROW_BARS = 4
// the Sulco's record: the label in the middle, the grooves out to the rim
export const SULCO_IN = 0.17, SULCO_OUT = 0.47

function colorOf(palette: CoverPalette, degree: number, zone: string) {
  if (palette === 'mono') return '#f4f1e8'
  if (palette === 'zona') return zone
  return DEGREE_COLORS[((degree % DEGREE_COLORS.length) + DEGREE_COLORS.length) % DEGREE_COLORS.length]
}

export function coverArt(song: Song, style: CoverStyle, palette: CoverPalette, catalog: Catalog = BUILTIN_VARIANTS): CoverArt {
  const z = song.music.zone, steps = SCALES[z.scale].steps
  const degree = (m: number) => { const pc = (((m - z.root) % 12) + 12) % 12; const i = steps.indexOf(pc); return i >= 0 ? i : steps.findIndex(s => s > pc) }
  // every alien's notes (with its variation's second note and echo)
  const aliens = song.aliens.map(a => {
    const v = variantFor(catalog, a.variant, a.species)
    const shot = { ...v.shot, ...a.shot }
    return { notes: alienNotes(a, v, { root: z.root, steps }), size: shot.size, glow: shot.glow, start: spawnBeat(a) }
  })
  const all = aliens.flatMap(a => a.notes.map(n => n.beat))
  const first = Math.min(0, ...aliens.map(a => a.start)), last = Math.max(1, ...all)
  const span = Math.max(1, last - first)
  const lanes = fanNotes(song.fan).filter((m): m is number => m !== null)
  const lo = Math.min(...lanes, ...aliens.flatMap(a => a.notes.map(n => n.midi))), hi = Math.max(...lanes, ...aliens.flatMap(a => a.notes.map(n => n.midi)))
  const rows = Math.max(1, Math.ceil((last + 1) / (BAR * ROW_BARS)))
  const place = (beat: number, midi: number) => {
    if (style === 'sulco') {
      const r = SULCO_IN + (SULCO_OUT - SULCO_IN) * Math.max(0, beat - first) / span
      // a slow turn as time goes (the groove), plus the angle of its lane
      const a = fanAngleOf(song.fan, midi) + (beat - first) / span * Math.PI * 0.35
      return { x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r }
    }
    const per = BAR * ROW_BARS, row = Math.floor(Math.max(0, beat) / per), k = (Math.max(0, beat) % per) / per
    const h = 0.84 / rows, pitch = hi > lo ? (midi - lo) / (hi - lo) : 0.5
    return { x: 0.08 + k * 0.84, y: 0.08 + row * h + (1 - pitch) * h * 0.86 + h * 0.07 }
  }
  const unit = style === 'sulco' ? 0.0026 : 0.0022 / Math.sqrt(rows)
  const dots: CoverDot[] = [], paths: CoverArt['paths'] = []
  for (const a of aliens) {
    const pts = a.notes.map(n => place(n.beat, n.midi))
    paths.push({ pts, color: colorOf(palette, degree(a.notes[0].midi), z.color) })
    a.notes.forEach((n, i) => dots.push({ ...pts[i], r: Math.max(0.006, a.size * unit), color: colorOf(palette, degree(n.midi), z.color), glow: a.glow }))
  }
  // the long rests (two bars or more without a note): empty rings on the record
  const rings: number[] = []
  if (style === 'sulco') {
    const beats = [...new Set(all)].sort((x, y) => x - y)
    for (let i = 1; i < beats.length; i++) if (beats[i] - beats[i - 1] >= BAR * 2) {
      rings.push(SULCO_IN + (SULCO_OUT - SULCO_IN) * ((beats[i] + beats[i - 1]) / 2 - first) / span)
    }
  }
  return { dots, paths, rings, rows }
}
