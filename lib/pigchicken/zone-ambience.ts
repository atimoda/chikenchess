// What a zone plays in the background: the percussion (a 16-step grid per row, from a list of beats of several
// styles or the zone's own, each note with its own place in time) and the bass (a sustained drone or pad, a bass
// line or a synth figure over the chord of the bar). Pure data and functions: sound-zones.ts cleans what is stored,
// the Parquinho plays the hits. The beats, their microtiming and their variations are in beats.ts; the recorded
// instrument of each row, in beat-kits.ts. To add a bass: one entry in BASSES.
import type { Feel } from './music'
import { DRUM_ROWS, kitOf, type DrumRow, type Kit } from './beat-kits'
import { BEATS, SHIFT_MAX, STEPS, type Beat, type BeatId, type BeatPattern, type DrumGrid, type DrumTime } from './beats'

export { DRUM_ROWS, type DrumRow } from './beat-kits'
export { BEATS, BEAT_GROUPS, SHIFT_MAX, STEPS, type Beat, type BeatId, type BeatPattern, type DrumGrid, type DrumTime } from './beats'

// ---------- percussion ----------

const VEL: Record<string, number> = { o: 0.5, x: 0.8, X: 1 }
const REST = '.'.repeat(STEPS)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// "Silêncio" first: what the Batida tag steps through
export const BEAT_IDS: BeatId[] = ['none', ...BEATS.map(b => b.id)]
export const isBeat = (v: unknown): v is BeatId => typeof v === 'string' && (BEAT_IDS as string[]).includes(v)
export const beatOf = (id: BeatId): Beat | undefined => BEATS.find(b => b.id === id)
export const beatLabel = (id: BeatId) => beatOf(id)?.label ?? 'Silêncio'

const cleanRow = (v: unknown) => (typeof v === 'string' ? (v.replace(/[^oxX.]/g, '.') + REST).slice(0, STEPS) : REST)
// a zone's own grid as stored: only the rows that play anything (undefined when it is not a grid)
export function cleanDrums(raw: unknown): DrumGrid | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: DrumGrid = {}
  for (const { id } of DRUM_ROWS) { const row = cleanRow((raw as Record<string, unknown>)[id]); if (row !== REST) out[id] = row }
  return out
}
const cleanShift = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(clamp(v, -SHIFT_MAX, SHIFT_MAX)) || 0 : 0)
// the times of a grid's notes as stored: only the rows with a note off its sixteenth, and only where there is a
// note (undefined when no note is off the grid)
export function cleanDrumTime(raw: unknown, grid: DrumGrid): DrumTime | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: DrumTime = {}
  for (const { id } of DRUM_ROWS) {
    const src = (raw as Record<string, unknown>)[id], row = grid[id]
    if (!Array.isArray(src) || !row) continue
    const t = Array.from({ length: STEPS }, (_, i) => (row[i] === '.' ? 0 : cleanShift(src[i])))
    if (t.some(Boolean)) out[id] = t
  }
  return Object.keys(out).length ? out : undefined
}
export const drumRow = (grid: DrumGrid, row: DrumRow) => grid[row] ?? REST
export const drumShift = (time: DrumTime | undefined, row: DrumRow, step: number) => time?.[row]?.[step] ?? 0

// the beat's microtiming on a sixteenth of the bar, in hundredths of a sixteenth
export const microAt = (beat: Beat | undefined, step: number) => { const m = beat?.micro; return m?.length ? m[step % m.length] ?? 0 : 0 }
// the times of every note of one of a beat's patterns: its own where the pattern says so, else the beat's
// microtiming plus what the row lags as a whole
export function patternTime(beat: Beat, p: BeatPattern = beat): DrumTime {
  const out: DrumTime = {}, lag = p.lag ?? beat.lag ?? {}, own = p.time
  for (const { id } of DRUM_ROWS) {
    const row = p.grid[id]
    if (!row) continue
    const t = Array.from({ length: STEPS }, (_, i) => (row[i] === '.' ? 0 : cleanShift(own?.[id]?.[i] || microAt(beat, i) + (lag[id] ?? 0))))
    if (t.some(Boolean)) out[id] = t
  }
  return out
}
// a beat's patterns in order: the base one, then its variations
export const beatPatterns = (beat: Beat | undefined): BeatPattern[] => (beat ? [beat, ...beat.variations] : [])

// what a grid being edited is: its notes and the time of each one
export type DrumPattern = { grid: DrumGrid; time: DrumTime }
const withNote = (p: DrumPattern, row: DrumRow, step: number, c: string, shift: number): DrumPattern => {
  const cur = drumRow(p.grid, row), grid = cleanDrums({ ...p.grid, [row]: cur.slice(0, step) + c + cur.slice(step + 1) }) ?? {}
  const t = (p.time[row] ?? Array.from({ length: STEPS }, () => 0)).slice(); t[step] = c === '.' ? 0 : shift
  return { grid, time: cleanDrumTime({ ...p.time, [row]: t }, grid) ?? {} }
}
// one click on a cell of the grid: rest → normal → accent → rest (a soft hit goes to normal). A new note starts
// `seed` hundredths of a sixteenth off the grid (the beat's microtiming there); a note that stays keeps its place
export function toggleDrumNote(p: DrumPattern, row: DrumRow, step: number, seed = 0): DrumPattern {
  const cur = drumRow(p.grid, row)[step], next = ({ '.': 'x', o: 'x', x: 'X', X: '.' } as Record<string, string>)[cur] ?? '.'
  return withNote(p, row, step, next, cur === '.' ? cleanShift(seed) : drumShift(p.time, row, step))
}
// a note dragged to `pos` (in sixteenths from the start of the bar, any fraction): it goes to the nearest step that
// is free (its own counts) and keeps the rest as its distance from it; with the neighbour taken it stops half a
// sixteenth away from its own. `step` is where it ended up
export function moveDrumNote(p: DrumPattern, row: DrumRow, step: number, pos: number): { pattern: DrumPattern; step: number } {
  const cur = drumRow(p.grid, row), c = cur[step]
  if (!c || c === '.') return { pattern: p, step }
  const at = clamp(pos, -SHIFT_MAX / 100, STEPS - 1 + SHIFT_MAX / 100)
  let to = clamp(Math.round(at), 0, STEPS - 1)
  if (to !== step && cur[to] !== '.') to = step
  const shift = cleanShift((at - to) * 100)
  if (to === step) return { pattern: withNote(p, row, step, c, shift), step }
  return { pattern: withNote(withNote(p, row, step, '.', 0), row, to, c, shift), step: to }
}
// the old name, for a grid alone
export function toggleDrumStep(grid: DrumGrid, row: DrumRow, step: number): DrumGrid { return toggleDrumNote({ grid, time: {} }, row, step).grid }

// ---------- bass, drone and synth ----------

// sustained under the chord (the drone's timbre)
export type DroneTone = 'saw' | 'dark' | 'pad'
// a note of a line or figure (the synth's playBass)
export type BassTone = 'sub' | 'pluck' | 'square' | 'saw'
export type BassId =
  | 'none' | 'drone' | 'droneDark' | 'pad'
  | 'pulse' | 'eighths' | 'octaves' | 'walking' | 'funk' | 'reggae' | 'baiao' | 'bossa'
  | 'arp' | 'arpFast' | 'acid' | 'offbeat' | 'stabs'
// lines: one bar in sixteenths per entry, played in turn. "1" the chord's root, "3" its third, "5" its fifth,
// "7" its seventh, "8" the root an octave up, "c" the whole chord, "." rest. len: sixteenths each note lasts.
// oct: octaves above the bass register (two octaves under the key)
export type Bass = {
  id: BassId; label: string; group: 'Sustentado' | 'Baixo' | 'Synth'
  drone?: DroneTone; lines?: string[]; tone?: BassTone; len?: number; oct?: number
}
export const BASSES: Bass[] = [
  { id: 'drone', label: 'Drone', group: 'Sustentado', drone: 'saw' },
  { id: 'droneDark', label: 'Drone grave', group: 'Sustentado', drone: 'dark' },
  { id: 'pad', label: 'Pad', group: 'Sustentado', drone: 'pad' },
  { id: 'pulse', label: 'Pulsado', group: 'Baixo', tone: 'sub', len: 3, lines: ['1...1...1...1...'] },
  { id: 'eighths', label: 'Colcheias', group: 'Baixo', tone: 'pluck', len: 2, lines: ['1.1.1.1.1.1.1.1.'] },
  { id: 'octaves', label: 'Oitavas', group: 'Baixo', tone: 'pluck', len: 2, lines: ['1.8.1.8.1.8.1.8.'] },
  { id: 'walking', label: 'Caminhando', group: 'Baixo', tone: 'sub', len: 4, lines: ['1...3...5...7...', '8...7...5...3...'] },
  { id: 'funk', label: 'Sincopado', group: 'Baixo', tone: 'pluck', len: 2, lines: ['1..1....1.8..5..', '1..1..7.1.8.....'] },
  { id: 'reggae', label: 'Reggae', group: 'Baixo', tone: 'sub', len: 3, lines: ['1..1..5.....3.5.'] },
  { id: 'baiao', label: 'Baião', group: 'Baixo', tone: 'sub', len: 2, lines: ['1..1..5.1..1..5.'] },
  { id: 'bossa', label: 'Bossa nova', group: 'Baixo', tone: 'sub', len: 5, lines: ['1.....1.5.....5.'] },
  { id: 'arp', label: 'Arpejo', group: 'Synth', tone: 'square', len: 2, oct: 1, lines: ['1.3.5.8.5.3.1.3.'] },
  { id: 'arpFast', label: 'Arpejo rápido', group: 'Synth', tone: 'square', len: 1, oct: 1, lines: ['1358531513585315'] },
  { id: 'acid', label: 'Sequência ácida', group: 'Synth', tone: 'saw', len: 1, lines: ['1.18.1.31.8.1.71', '1.18.1.51.8.3.18'] },
  { id: 'offbeat', label: 'Contratempo', group: 'Synth', tone: 'saw', len: 2, lines: ['..1...1...1...1.'] },
  { id: 'stabs', label: 'Acordes no contratempo', group: 'Synth', tone: 'square', len: 2, oct: 2, lines: ['..c...c...c...c.'] },
]
export const BASS_GROUPS = ['Sustentado', 'Baixo', 'Synth'] as const
export const BASS_IDS: BassId[] = ['none', ...BASSES.map(b => b.id)]
export const isBass = (v: unknown): v is BassId => typeof v === 'string' && (BASS_IDS as string[]).includes(v)
export const bassLabel = (id: BassId) => BASSES.find(b => b.id === id)?.label ?? 'Silêncio'
export const BASS_OCT = { min: -1, max: 1 }
// volumes are a share of the Ambiente volume (the panel's Volume)
export const AMBIENCE_VOL = { min: 0, max: 100, step: 5 }

// ---------- a zone's ambience ----------

// beat: the percussion's rhythm ("none": silence); variant: which of its patterns (absent: the base one; 1 …: its
// variations); drums: the zone's own grid, in place of the beat's, and drumTime: how far each of its notes sits
// from its sixteenth; bass: the bass ("none": silence). Volumes 0..100 and the bass's octave: absent when at their
// defaults (100 and 0)
export type ZoneAmbience = { beat: BeatId; variant?: number; drums?: DrumGrid; drumTime?: DrumTime; beatVol?: number; bass: BassId; bassVol?: number; bassOct?: number }
export const SILENCE: ZoneAmbience = { beat: 'none', bass: 'none' }
// zones saved before the ambience could be chosen: the percussion followed the feel, over the drone
const FEEL_BEAT: Record<Feel, BeatId> = { straight: 'straight', swing: 'swing', half: 'half' }
export const legacyAmbience = (feel: Feel): ZoneAmbience => ({ beat: FEEL_BEAT[feel], bass: 'drone' })
// the beat that follows the feel while it is one of those three ("Troca de levada" keeps them together)
export const beatForFeel = (beat: BeatId, feel: Feel): BeatId => ((Object.values(FEEL_BEAT) as BeatId[]).includes(beat) ? FEEL_BEAT[feel] : beat)

const share = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(clamp(v, AMBIENCE_VOL.min, AMBIENCE_VOL.max)) : 100)

// what is stored, cleaned. `legacy`: the ambience of a zone that has none saved
export function cleanAmbience(raw: unknown, legacy: ZoneAmbience = SILENCE): ZoneAmbience {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!('beat' in r) && !('bass' in r) && !('drums' in r)) return { ...legacy }
  const beat = isBeat(r.beat) ? r.beat : 'none'
  const drums = cleanDrums(r.drums), drumTime = drums ? cleanDrumTime(r.drumTime, drums) : undefined
  const variants = beatOf(beat)?.variations.length ?? 0
  const variant = !drums && typeof r.variant === 'number' && Number.isInteger(r.variant) && r.variant >= 1 && r.variant <= variants ? r.variant : 0
  const beatVol = share(r.beatVol), bassVol = share(r.bassVol)
  const bassOct = typeof r.bassOct === 'number' && Number.isFinite(r.bassOct) ? Math.round(clamp(r.bassOct, BASS_OCT.min, BASS_OCT.max)) : 0
  return {
    beat,
    ...(variant ? { variant } : {}),
    ...(drums ? { drums } : {}),
    ...(drumTime ? { drumTime } : {}),
    ...(beatVol !== 100 ? { beatVol } : {}),
    bass: isBass(r.bass) ? r.bass : 'none',
    ...(bassVol !== 100 ? { bassVol } : {}),
    ...(bassOct ? { bassOct } : {}),
  }
}
// another beat (or another of its patterns) in place of what the zone plays: its own grid is dropped
export function withBeat(a: ZoneAmbience, beat: BeatId, variant = 0): ZoneAmbience {
  const { drums: _d, drumTime: _t, variant: _v, ...rest } = a
  return cleanAmbience({ ...rest, beat, variant })
}
// the pattern of the beat the zone chose (undefined in silence): the base one or one of its variations
export function ambienceBeatPattern(a: ZoneAmbience): BeatPattern | undefined {
  const beat = beatOf(a.beat)
  return beat ? beat.variations[(a.variant ?? 0) - 1] ?? beat : undefined
}
// what plays: the zone's own grid and times, or its beat's
export function ambiencePattern(a: ZoneAmbience): DrumPattern {
  if (a.drums) return { grid: a.drums, time: a.drumTime ?? {} }
  const beat = beatOf(a.beat), p = ambienceBeatPattern(a)
  return beat && p ? { grid: p.grid, time: patternTime(beat, p) } : { grid: {}, time: {} }
}
export const ambienceGrid = (a: ZoneAmbience): DrumGrid => ambiencePattern(a).grid
// the recorded instruments of the zone's percussion: its beat's kit (its own grid keeps the beat it came from)
export const ambienceKit = (a: ZoneAmbience): Kit => kitOf(beatOf(a.beat)?.kit)
// the rows the panel shows: the kit's, and any other with a note
export const ambienceRows = (a: ZoneAmbience) => { const kit = ambienceKit(a), grid = ambienceGrid(a); return DRUM_ROWS.filter(r => kit[r.id] || grid[r.id]) }
export const beatSilent = (a: ZoneAmbience) => !DRUM_ROWS.some(r => drumRow(ambienceGrid(a), r.id) !== REST)
export const ambienceSilent = (a: ZoneAmbience) => beatSilent(a) && a.bass === 'none'
const timeKey = (t: DrumTime | undefined) => (t ? DRUM_ROWS.map(r => (t[r.id] ?? []).join('.')).join('/') : '')
// what tells two ambiences apart (part of the conductor's zone id)
export const ambienceKey = (a: ZoneAmbience) => [a.beat, a.variant ?? 0, a.drums ? DRUM_ROWS.map(r => drumRow(a.drums!, r.id)).join('/') : '', timeKey(a.drumTime), a.beatVol ?? 100, a.bass, a.bassVol ?? 100, a.bassOct ?? 0].join(',')
export const beatName = (a: ZoneAmbience) => (a.drums ? 'Batida própria' : a.variant ? `${beatLabel(a.beat)}: ${ambienceBeatPattern(a)?.label}` : beatLabel(a.beat))

// the Balanço "Swing" on a rhythm that has no lilt of its own on the off-beat eighth: it lands a third of a
// sixteenth late
const FEEL_SWING = 33
// the groove of the bar: how far each of its sixteenths sits from the rigid grid, in sixteenths. The bass and the
// grid the players' notes are pulled to follow it. It is the beat's microtiming; where the beat is flat on the
// off-beat eighth, the Balanço "Swing" delays it
export function grooveOf(a: ZoneAmbience | undefined, feel: Feel): number[] {
  const beat = a ? beatOf(a.beat) : undefined
  return Array.from({ length: STEPS }, (_, i) => (microAt(beat, i) || (feel === 'swing' && i % 4 === 2 ? FEEL_SWING : 0)) / 100)
}

// the drums that hit on a sixteenth of the bar (0..15). shift: how far from the sixteenth each one lands, in
// sixteenths (negative: early). A note on the grid takes the Balanço "Swing" like the groove does
export function beatHits(a: ZoneAmbience, step: number, feel: Feel = 'straight'): { drum: DrumRow; vel: number; shift: number }[] {
  const { grid, time } = ambiencePattern(a), vol = (a.beatVol ?? 100) / 100, out: { drum: DrumRow; vel: number; shift: number }[] = []
  if (vol <= 0) return out
  const swing = feel === 'swing' && step % 4 === 2 && !microAt(beatOf(a.beat), step) ? FEEL_SWING : 0
  for (const { id } of DRUM_ROWS) { const v = VEL[grid[id]?.[step] ?? '.']; if (v) out.push({ drum: id, vel: v * vol, shift: (drumShift(time, id, step) || swing) / 100 }) }
  return out
}

// the sustained voice under the chord (null: none): its timbre, volume and octave
export function ambienceDrone(a: ZoneAmbience): { tone: DroneTone; vol: number; oct: number } | null {
  const b = BASSES.find(x => x.id === a.bass), vol = (a.bassVol ?? 100) / 100
  return b?.drone && vol > 0 ? { tone: b.drone, vol, oct: a.bassOct ?? 0 } : null
}

// the bass notes that start on a sixteenth of a bar: `chord` is the bar's (root, third, fifth, seventh, as MIDI),
// `low` its root in the bass register (music.ts droneOf: near the key, played two octaves down)
export function bassNotes(a: ZoneAmbience, chord: number[], low: number, step: number, bar: number): { midi: number; tone: BassTone; len: number; vel: number }[] {
  const b = BASSES.find(x => x.id === a.bass), vol = (a.bassVol ?? 100) / 100
  if (!b?.lines?.length || !b.tone || vol <= 0) return []
  const line = b.lines[((bar % b.lines.length) + b.lines.length) % b.lines.length], t = line[step] ?? '.'
  if (t === '.') return []
  const tone = b.tone, len = b.len ?? 2
  const base = low + 12 * ((b.oct ?? 0) + (a.bassOct ?? 0))
  const up = (i: number) => base + ((((chord[i] ?? chord[0]) - chord[0]) % 12) + 12) % 12
  const note = (midi: number, vel = 1) => ({ midi, tone, len, vel: vel * vol })
  if (t === 'c') return [note(up(0), 0.6), note(up(1), 0.6), note(up(2), 0.6)]
  if (t === '8') return [note(base + 12)]
  const i = ({ '1': 0, '3': 1, '5': 2, '7': 3 } as Record<string, number>)[t]
  return i === undefined ? [] : [note(up(i))]
}
