// What a zone plays in the background: the percussion (a 16-step grid per drum, from a list of beats of several
// styles or the zone's own) and the bass (a sustained drone or pad, a bass line or a synth figure over the chord of
// the bar). Pure data and functions: sound-zones.ts cleans what is stored, the Parquinho plays the hits on the synth.
// To add a beat or a bass: one entry in BEATS or BASSES.
import type { Feel } from './music'

// ---------- percussion ----------

export type DrumRow = 'kick' | 'snare' | 'clap' | 'hat' | 'openHat' | 'shaker'
export const DRUM_ROWS: { id: DrumRow; label: string }[] = [
  { id: 'kick', label: 'Bumbo' }, { id: 'snare', label: 'Caixa' }, { id: 'clap', label: 'Palma' },
  { id: 'hat', label: 'Chimbal' }, { id: 'openHat', label: 'Aberto' }, { id: 'shaker', label: 'Chocalho' },
]
// one bar in sixteenths per drum: "." rest, "o" soft, "x" normal, "X" accent
export type DrumGrid = Partial<Record<DrumRow, string>>
export const STEPS = 16
const VEL: Record<string, number> = { o: 0.5, x: 0.8, X: 1 }
const REST = '.'.repeat(STEPS)

export type BeatId =
  | 'none' | 'straight' | 'half' | 'swing' | 'rock' | 'disco' | 'funk'
  | 'house' | 'techno' | 'trap' | 'boombap'
  | 'bossa' | 'samba' | 'baiao'
  | 'reggae' | 'dembow' | 'afro'
  | 'breeze' | 'fair' | 'pulse'
export type Beat = { id: BeatId; label: string; group: 'Pop e rock' | 'Eletrônica' | 'Brasil' | 'Mundo' | 'Suave'; grid: DrumGrid }
export const BEATS: Beat[] = [
  { id: 'straight', label: 'Reto', group: 'Pop e rock', grid: { kick: 'X.......X.......', snare: '....X.......X...', hat: 'X.o.X.o.X.o.X.o.' } },
  { id: 'half', label: 'Meio tempo', group: 'Pop e rock', grid: { kick: 'X...............', snare: '........X.......', hat: 'x...x...x...x...', openHat: '..............o.' } },
  { id: 'swing', label: 'Swing', group: 'Pop e rock', grid: { kick: 'X.......X.X.....', clap: '....X.......X...', hat: 'X.o.X.o.X.o.X.o.' } },
  { id: 'rock', label: 'Rock', group: 'Pop e rock', grid: { kick: 'X.....x.X.x.....', snare: '....X.......X...', hat: 'X.x.X.x.X.x.X.x.', openHat: '..............x.' } },
  { id: 'disco', label: 'Disco', group: 'Pop e rock', grid: { kick: 'X...X...X...X...', snare: '....X.......X...', hat: 'x...x...x...x...', openHat: '..x...x...x...x.' } },
  { id: 'funk', label: 'Funk', group: 'Pop e rock', grid: { kick: 'X..x..x...x..x..', snare: '....X..o.o..X..o', hat: 'x.x.x.x.x.x.x.x.', openHat: '..............x.' } },
  { id: 'house', label: 'House', group: 'Eletrônica', grid: { kick: 'X...X...X...X...', clap: '....X.......X...', hat: '..X...X...X...X.', shaker: '.o.o.o.o.o.o.o.o' } },
  { id: 'techno', label: 'Techno', group: 'Eletrônica', grid: { kick: 'X...X...X...X...', clap: '....x.......x...', hat: '..x...x...x...x.', shaker: 'oooooooooooooooo' } },
  { id: 'trap', label: 'Trap', group: 'Eletrônica', grid: { kick: 'X.....X...x.....', clap: '........X.......', hat: 'x.x.x.oox.x.x.xo', openHat: '..............o.' } },
  { id: 'boombap', label: 'Boom bap', group: 'Eletrônica', grid: { kick: 'X......xX.x.....', snare: '....X.......X...', hat: 'x.o.x.o.x.o.x.o.' } },
  { id: 'bossa', label: 'Bossa nova', group: 'Brasil', grid: { kick: 'X.....x.X.....x.', snare: 'o..o..o...o..o..', shaker: 'x.o.x.o.x.o.x.o.' } },
  { id: 'samba', label: 'Samba', group: 'Brasil', grid: { kick: 'X..xX..xX..xX..x', snare: 'o.o.oo.o.o.oo.o.', shaker: 'xooxxooxxooxxoox' } },
  { id: 'baiao', label: 'Baião', group: 'Brasil', grid: { kick: 'X..x..x.X..x..x.', snare: '......o.......o.', hat: 'ooXoooXoooXoooXo' } },
  { id: 'reggae', label: 'Reggae', group: 'Mundo', grid: { kick: '........X.......', snare: '........x.......', hat: 'o.X.o.X.o.X.o.X.' } },
  { id: 'dembow', label: 'Reggaeton', group: 'Mundo', grid: { kick: 'X...X...X...X...', snare: '...x..x....x..x.', hat: 'o.o.o.o.o.o.o.o.' } },
  { id: 'afro', label: 'Afrobeat', group: 'Mundo', grid: { kick: 'X..x..X...x.....', snare: 'o..o..o...o.o...', shaker: 'x.xox.xox.xox.xo' } },
  { id: 'breeze', label: 'Brisa', group: 'Suave', grid: { kick: 'o...............', shaker: 'x.o.x.o.x.o.x.o.' } },
  { id: 'fair', label: 'Feira', group: 'Suave', grid: { kick: 'X.......X.X.....', clap: '....X.......X...', hat: 'X.o.X.o.X.o.X.o.', shaker: '.o.o.o.o.o.o.o.o' } },
  { id: 'pulse', label: 'Pulso', group: 'Suave', grid: { kick: 'x...x...x...x...' } },
]
export const BEAT_GROUPS = ['Pop e rock', 'Eletrônica', 'Brasil', 'Mundo', 'Suave'] as const
// "Silêncio" first: what the Batida tag steps through
export const BEAT_IDS: BeatId[] = ['none', ...BEATS.map(b => b.id)]
export const isBeat = (v: unknown): v is BeatId => typeof v === 'string' && (BEAT_IDS as string[]).includes(v)
export const beatLabel = (id: BeatId) => BEATS.find(b => b.id === id)?.label ?? 'Silêncio'

const cleanRow = (v: unknown) => (typeof v === 'string' ? (v.replace(/[^oxX.]/g, '.') + REST).slice(0, STEPS) : REST)
// a zone's own grid as stored: only the rows that play anything (undefined when it is not a grid)
export function cleanDrums(raw: unknown): DrumGrid | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: DrumGrid = {}
  for (const { id } of DRUM_ROWS) { const row = cleanRow((raw as Record<string, unknown>)[id]); if (row !== REST) out[id] = row }
  return out
}
export const drumRow = (grid: DrumGrid, row: DrumRow) => grid[row] ?? REST
// one click on a cell of the grid: rest → normal → accent → rest (a soft hit goes to normal)
export function toggleDrumStep(grid: DrumGrid, row: DrumRow, step: number): DrumGrid {
  const cur = drumRow(grid, row), next = ({ '.': 'x', o: 'x', x: 'X', X: '.' } as Record<string, string>)[cur[step]] ?? '.'
  return cleanDrums({ ...grid, [row]: cur.slice(0, step) + next + cur.slice(step + 1) }) ?? {}
}

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

// beat: the percussion's pattern ("none": silence); drums: its own grid, in place of the beat's; bass: the bass
// ("none": silence). Volumes 0..100 and the bass's octave: absent when at their defaults (100 and 0)
export type ZoneAmbience = { beat: BeatId; drums?: DrumGrid; beatVol?: number; bass: BassId; bassVol?: number; bassOct?: number }
export const SILENCE: ZoneAmbience = { beat: 'none', bass: 'none' }
// zones saved before the ambience could be chosen: the percussion followed the feel, over the drone
const FEEL_BEAT: Record<Feel, BeatId> = { straight: 'straight', swing: 'swing', half: 'half' }
export const legacyAmbience = (feel: Feel): ZoneAmbience => ({ beat: FEEL_BEAT[feel], bass: 'drone' })
// the beat that follows the feel while it is one of those three ("Troca de levada" keeps them together)
export const beatForFeel = (beat: BeatId, feel: Feel): BeatId => ((Object.values(FEEL_BEAT) as BeatId[]).includes(beat) ? FEEL_BEAT[feel] : beat)

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const share = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(clamp(v, AMBIENCE_VOL.min, AMBIENCE_VOL.max)) : 100)

// what is stored, cleaned. `legacy`: the ambience of a zone that has none saved
export function cleanAmbience(raw: unknown, legacy: ZoneAmbience = SILENCE): ZoneAmbience {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!('beat' in r) && !('bass' in r) && !('drums' in r)) return { ...legacy }
  const drums = cleanDrums(r.drums)
  const beatVol = share(r.beatVol), bassVol = share(r.bassVol)
  const bassOct = typeof r.bassOct === 'number' && Number.isFinite(r.bassOct) ? Math.round(clamp(r.bassOct, BASS_OCT.min, BASS_OCT.max)) : 0
  return {
    beat: isBeat(r.beat) ? r.beat : 'none',
    ...(drums ? { drums } : {}),
    ...(beatVol !== 100 ? { beatVol } : {}),
    bass: isBass(r.bass) ? r.bass : 'none',
    ...(bassVol !== 100 ? { bassVol } : {}),
    ...(bassOct ? { bassOct } : {}),
  }
}
// the grid that plays: the zone's own, or its beat's
export const ambienceGrid = (a: ZoneAmbience): DrumGrid => a.drums ?? BEATS.find(b => b.id === a.beat)?.grid ?? {}
export const beatSilent = (a: ZoneAmbience) => !DRUM_ROWS.some(r => drumRow(ambienceGrid(a), r.id) !== REST)
export const ambienceSilent = (a: ZoneAmbience) => beatSilent(a) && a.bass === 'none'
// what tells two ambiences apart (part of the conductor's zone id)
export const ambienceKey = (a: ZoneAmbience) => [a.beat, a.drums ? DRUM_ROWS.map(r => drumRow(a.drums!, r.id)).join('/') : '', a.beatVol ?? 100, a.bass, a.bassVol ?? 100, a.bassOct ?? 0].join(',')
export const beatName = (a: ZoneAmbience) => (a.drums ? 'Batida própria' : beatLabel(a.beat))

// the drums that hit on a sixteenth of the bar (0..15)
export function beatHits(a: ZoneAmbience, step: number): { drum: DrumRow; vel: number }[] {
  const grid = ambienceGrid(a), vol = (a.beatVol ?? 100) / 100, out: { drum: DrumRow; vel: number }[] = []
  if (vol <= 0) return out
  for (const { id } of DRUM_ROWS) { const v = VEL[grid[id]?.[step] ?? '.']; if (v) out.push({ drum: id, vel: v * vol }) }
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
