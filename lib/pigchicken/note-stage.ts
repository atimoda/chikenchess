// The note stage (fase de notas): the first piece of the guitar hero mode. A song is a list of aliens, each one a
// note spawner: it appears around her (polar coordinates: an angle and a distance), comes in with one of five
// movements and fires its slice of the melody as note shots timed to reach the ring around her on the song's beat.
// She rebates them with any blow (the combat judges each one against its arrival time), the peck cancels them, the
// ones that get through lower the afinação bar. The song is the stage: it ends when its last alien is gone.
//
// Plain data stepped with dt and the conductor's clock, like the temple: the same state and inputs give the same
// game (the aliens' hit points live in the combat's targets).
import type { Target } from './combat'
import type { Conductor } from './music'
import { DEGREE_COLORS, SCALES } from './music'
import type { RebateRule } from './transforms'
import { fanAngleOf, fanNoteAt, fanNotes, songFan, type Fan } from './fan'
import { aimShot, type NoteGrade, type NoteShot, type NoteShotEvent } from './note-shots'
import { GONG_X, multOf, type Species } from './temple'
import type { StageMusic } from './temple-music'
import type { VoiceId } from './synth'
import { stepScale } from './transforms'
import { BUILTIN_VARIANTS, variantData, variantFor, variantSize, type AlienVariant, type Catalog } from './alien-catalog'

const DEG = Math.PI / 180

// the five movements (the angle is always around her)
export type MoveMode = 'straight' | 'zigzag' | 'pass' | 'spiral' | 'still'
export const MOVE_MODES: { value: MoveMode; label: string }[] = [
  { value: 'straight', label: 'Reto' }, { value: 'zigzag', label: 'Zigue-zague' }, { value: 'pass', label: 'Passante' },
  { value: 'spiral', label: 'Espiral' }, { value: 'still', label: 'Parado' },
]
// the shot type (tipo de tiro): radius (px), glow (0..1), colour ('degree' = the scale degree's) and speed (px/s)
export type ShotType = { size: number; glow: number; color: 'degree' | string; speed: number }
export const SHOT_DEFAULT: ShotType = { size: 11, glow: 0.7, color: 'degree', speed: 260 }
// the firing sound: a soft note on a voice (or none), just a warning
export type FireSound = { voice: VoiceId | 'none'; vel: number }
export const FIRE_DEFAULT: FireSound = { voice: 'bells', vel: 0.07 }

// a note of a song: when it must reach her (beats from the song's start) and its pitch
export type SongNote = { beat: number; midi: number }
// an alien of a song: a variation of the catalogue (by its id, else its species' base); what the song gives here wins
// over the variation's
export type SongAlien = {
  species: Species; variant?: string; color?: string
  at?: number // the beat it appears (default: LEAD beats before its first note)
  angle?: number // degrees on screen around her (180 left, 270 up, 360 right); default: the lane of its notes
  dist?: number // px from her
  move?: MoveMode
  zig?: { amp: number; period: number } // zigue-zague: px to each side, beats per wave
  turn?: number // espiral: degrees it goes round her (the sign is the way)
  pass?: number // passante: px of its closest pass
  shot?: Partial<ShotType>
  fire?: Partial<FireSound>
  notes: SongNote[]
  rule?: RebateRule
}
// which note a rebate plays: the stage's fan (default), the fan mirrored (only the height counts, like the
// instruments' aim) or the note sequenced
export type NoteMode = 'fan' | 'angle' | 'sequenced'
// rule: whose transformations count for its notes (each alien can have its own); by default the stage's fan fixes
// the note and the taco ornaments it
export type Song = {
  id: string; name: string; intro: string; music: StageMusic; fan: Fan; noteMode: NoteMode; rule?: RebateRule; introBars: number; aliens: SongAlien[]
  pauses?: SongPause[]; lines?: SongLine[]
}
// the Diálogos lane: pauses (bars with no aliens, the background playing or total silence) and lines (someone says
// something, in a pause or over the aliens). Who: 'gongo', 'galinha', 'narrador' or 'alien:<variation id>'
export type LinePlace = 'banner' | 'balao' | 'faixa'
export const LINE_PLACES: { value: LinePlace; label: string }[] = [{ value: 'banner', label: 'Banner' }, { value: 'balao', label: 'Balão' }, { value: 'faixa', label: 'Faixa' }]
export type SongLine = { beat: number; who: string; text: string; secs: number; place: LinePlace; blip: boolean }
export type SongPause = { beat: number; bars: number; silent: boolean }
export const SPEAKERS: { value: string; label: string; color: string; voice: VoiceId; octave: number }[] = [
  { value: 'narrador', label: 'Narrador', color: '#c9ced6', voice: 'keys', octave: 0 },
  { value: 'gongo', label: 'Gongo', color: '#ffd166', voice: 'bells', octave: -12 },
  { value: 'galinha', label: 'Galinha', color: '#f4f1e8', voice: 'bird', octave: 12 },
]
// who says a line: its name, colour and voice (an alien speaks in its variation's firing voice)
export function speakerOf(who: string, catalog: Catalog = BUILTIN_VARIANTS): { name: string; color: string; voice: VoiceId; octave: number; variant: string | null } {
  const base = SPEAKERS.find(x => x.value === who)
  if (base) return { name: base.label, color: base.color, voice: base.voice, octave: base.octave, variant: null }
  const id = who.startsWith('alien:') ? who.slice(6) : ''
  const v = catalog.find(x => x.id === id)
  if (v) return { name: v.name, color: v.color, voice: v.fire.voice === 'none' ? 'chip' : v.fire.voice, octave: 12, variant: v.id }
  return { name: 'Narrador', color: '#c9ced6', voice: 'keys', octave: 0, variant: null }
}
export const STAGE_RULE: RebateRule = 'ambiente-taco'

// the ring where the notes arrive (px from the fan's centre), where an alien touches her, and the default distance
export const ARRIVE_R = 72, CONTACT_R = 46, SPAWN_DIST = 470
// an alien appears this many beats before its first note and touches her this many after its last
export const LEAD_BEATS = 6, AFTER_BEATS = 2
// a note is never fired less than this before it arrives (s)
export const MIN_FLIGHT = 0.35
export const POINTS: Record<NoteGrade, number> = { perfect: 300, good: 150, fora: 30 }
export const KILL_POINTS = 100, BIRD_POINTS = 500
// the afinação bar (0..1): a missed note, an alien that touches her, a good rebate
export const AFINA_MISS = 0.06, AFINA_CONTACT = 0.05, AFINA_HIT = 0.03
const SOURCE = 'stage'

// ---------- the test song ----------
const TEST_MUSIC: StageMusic = {
  zone: { id: 'templo-teste', name: 'Teste das Notas', root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 96, feel: 'straight', progression: [0, 5, 3, 4], color: '#7bdff2' },
  layers: ['gong', 'taiko', 'wood', 'hat', 'bass'], melody: [0, 1, 2, 4, 3, 2, 1, 0], groove: 1,
}
const TEST_FAN = songFan(62, 'majorPenta')
// lane by lane (0 = the lowest, on the ground to her left)
const lane = (i: number) => fanNotes(TEST_FAN)[i] as number
const ns = (...pairs: [number, number][]) => pairs.map(([beat, l]) => ({ beat, midi: lane(l) }))
export const TEST_SONG: Song = {
  id: 'teste', name: 'Teste das Notas', noteMode: 'fan', introBars: 2, music: TEST_MUSIC, fan: TEST_FAN,
  intro: 'Rebata cada nota com um golpe quando ela chegar no anel. Mande de volta nos aliens para virarem passarinhos. A bicada só anula.',
  aliens: [
    { species: 'jelly', move: 'straight', notes: ns([0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [6, 3]) },
    { species: 'lantern', move: 'zigzag', notes: ns([8, 4], [9, 5], [10, 6], [11, 5], [12, 4], [13, 3], [14, 2]) },
    { species: 'shell', move: 'still', angle: 200, dist: 430, notes: ns([16, 0], [18, 0], [20, 2], [22, 0]) },
    { species: 'twin', move: 'spiral', angle: 300, turn: 70, notes: ns([17, 5], [19, 7], [21, 9], [23, 7]) },
    { species: 'mini', move: 'pass', angle: 250, pass: 230, shot: { size: 8, speed: 300 }, notes: ns([24, 9], [24.5, 8], [25, 7], [25.5, 6], [26, 5]) },
    { species: 'drum', move: 'straight', angle: 270, shot: { size: 14, glow: 1 }, notes: ns([28, 4], [29, 2], [30, 1], [31, 0]) },
    { species: 'jelly', color: '#7bd88f', move: 'straight', angle: 205, notes: ns([32, 2], [33, 3], [34, 4], [35, 5]) },
    { species: 'jelly', color: '#4cc9f0', move: 'zigzag', angle: 335, notes: ns([36, 7], [37, 6], [38, 5], [39, 4]) },
  ],
}
export const SONGS: Song[] = [TEST_SONG]

// ---------- helpers (pure) ----------
export const spawnBeat = (a: SongAlien) => a.at ?? Math.min(...a.notes.map(n => n.beat)) - LEAD_BEATS
export const lastBeat = (a: SongAlien) => Math.max(...a.notes.map(n => n.beat))
export const pauseEnd = (p: SongPause) => p.beat + p.bars * 4
// the last beat of a song: its last note, the end of its last pause or its last line
export const songEnd = (s: Song) => Math.max(...s.aliens.map(lastBeat), ...(s.pauses ?? []).map(pauseEnd), ...(s.lines ?? []).map(l => l.beat + 1))
export const sortedLines = (s: Song) => [...(s.lines ?? [])].sort((a, b) => a.beat - b.beat)
// a pause in total silence at this beat
export const silentAt = (s: Song, beat: number) => (s.pauses ?? []).some(p => p.silent && beat >= p.beat && beat < pauseEnd(p))
export const noteCount = (s: Song) => s.aliens.reduce((k, a) => k + a.notes.length, 0)
// the angle an alien comes from (radians): given, or the lane of its middle note
export function alienAngle(s: Song, a: SongAlien) {
  if (a.angle !== undefined) return a.angle * DEG
  const sorted = a.notes.map(n => n.midi).sort((x, y) => x - y)
  return fanAngleOf(s.fan, sorted[Math.floor(sorted.length / 2)])
}

// the notes an alien fires: the song's, each with a second note at its interval and again after its echo
export function alienNotes(a: Pick<SongAlien, 'notes'>, v: Pick<AlienVariant, 'shot'>, scale: { root: number; steps: number[] }): SongNote[] {
  const out: SongNote[] = []
  for (const n of a.notes) {
    const pair = v.shot.harmony > 0 ? [n, { beat: n.beat, midi: stepScale(scale, n.midi, v.shot.harmony) }] : [n]
    out.push(...pair)
    if (v.shot.echo > 0) out.push(...pair.map(p => ({ beat: p.beat + v.shot.echo, midi: p.midi })))
  }
  return out.sort((x, y) => x.beat - y.beat)
}

// where an alien is (relative to the centre it follows), u: 0 at its spawn … 1 when it touches her
export type Path = { mode: MoveMode; theta: number; r0: number; ts: number; tEnd: number; tMid: number; zig: { amp: number; period: number }; turn: number; pass: number; side: number }
export function pathAt(p: Path, now: number, spb: number): { dx: number; dy: number; fixed: boolean } {
  const span = Math.max(0.1, p.tEnd - p.ts), u = Math.max(0, Math.min(1, (now - p.ts) / span))
  const r = CONTACT_R + (p.r0 - CONTACT_R) * (1 - u)
  if (p.mode === 'still') {
    // stays where it appeared, bobbing; once its notes are done it flies up and away
    const away = Math.max(0, now - p.tEnd)
    return { dx: Math.cos(p.theta) * p.r0, dy: Math.sin(p.theta) * p.r0 + Math.sin(now * 2.4) * 6 - 260 * away * away, fixed: true }
  }
  if (p.mode === 'pass') {
    // a straight line across, closest to her halfway through its notes
    const v = Math.max(160, 1.6 * p.r0 / span)
    const tx = -Math.sin(p.theta) * p.side, ty = Math.cos(p.theta) * p.side
    const k = v * (now - p.tMid)
    return { dx: Math.cos(p.theta) * p.pass + tx * k, dy: Math.sin(p.theta) * p.pass + ty * k, fixed: true }
  }
  const th = p.mode === 'spiral' ? p.theta + p.turn * u : p.theta
  let dx = Math.cos(th) * r, dy = Math.sin(th) * r
  if (p.mode === 'zigzag') {
    const w = p.zig.amp * Math.sin(2 * Math.PI * (now - p.ts) / Math.max(0.1, p.zig.period * spb)) * (1 - 0.7 * u)
    dx += -Math.sin(th) * w; dy += Math.cos(th) * w
  }
  return { dx, dy, fixed: false }
}

// an alien's path in a song (times in seconds, beat 0 at t0): what the stage follows and the editor's preview shows
export function alienPath(sg: Song, a: SongAlien, v: AlienVariant, notes: SongNote[], t0: number, spb: number): Path {
  const theta = alienAngle(sg, a)
  const at = (b: number) => t0 + b * spb
  const beats = notes.map(n => n.beat)
  return {
    mode: a.move ?? v.move, theta, r0: a.dist ?? SPAWN_DIST, ts: at(spawnBeat(a)), tEnd: at(Math.max(...beats) + v.after),
    tMid: at((Math.min(...beats) + Math.max(...beats)) / 2), zig: a.zig ?? v.zig, turn: (a.turn ?? v.turn) * DEG,
    pass: a.pass ?? v.pass, side: Math.cos(theta) >= 0 ? -1 : 1,
  }
}

// ---------- state ----------
export type StagePhase = 'idle' | 'playing' | 'done' | 'failed'
export type StageJudge = { grade: NoteGrade | 'miss' | 'parry' | 'contact'; t: number }
export type StageAlien = { id: number; def: number; v: AlienVariant; notes: SongNote[]; path: Path; c0: { x: number; y: number }; next: number; x: number; y: number }
export type StageBanner = { title: string; sub: string; color: string; t: number; life: number }
// a line being said: typed letter by letter; a balloon over who says it (x, y) when it is around, else a strip
export type StageTalk = { who: string; name: string; color: string; text: string; place: LinePlace; t: number; secs: number; shown: number; x: number; y: number; over: boolean }
export type NoteStageState = {
  phase: StagePhase; song: number; t: number
  t0: number // conductor time of the song's beat 0 (NaN until its zone is on)
  spawned: number // aliens already out (in spawn order)
  aliens: StageAlien[]
  anchor: { x: number; y: number } // the centre the aliens follow (her fan's centre, smoothed)
  center: { x: number; y: number } // her fan's centre now
  score: number; combo: number; bestCombo: number; afina: number
  counts: { perfect: number; good: number; fora: number; miss: number; parry: number; birds: number; kills: number }
  fired: number
  judge: StageJudge | null
  banner: StageBanner | null
  discRing: number; resetHits: number; resetRing: number; outsideT: number
  talk: StageTalk[]; said: number // the lines on screen and how many of the song's were said
  silent: boolean // in a pause of total silence
  from: number // the beat it started from (the editor's "Tocar daqui")
  draft: boolean // the editor's song (no record)
}
export function newStageState(): NoteStageState {
  return {
    phase: 'idle', song: 0, t: 0, t0: NaN, spawned: 0, aliens: [], anchor: { x: 0, y: 0 }, center: { x: 0, y: 0 },
    score: 0, combo: 0, bestCombo: 0, afina: 1, counts: { perfect: 0, good: 0, fora: 0, miss: 0, parry: 0, birds: 0, kills: 0 },
    fired: 0, judge: null, banner: null, discRing: 9, resetHits: 0, resetRing: 9, outsideT: 0,
    talk: [], said: 0, silent: false, from: 0, draft: false,
  }
}
// how well it went (0..1): perfect counts 1, good 0.6, fora 0.2, missed 0
export function accuracy(c: NoteStageState['counts'], fired: number) {
  return fired > 0 ? (c.perfect + 0.6 * c.good + 0.2 * c.fora) / fired : 0
}

export type NoteStageSound =
  | { kind: 'fire'; midi: number; voice: VoiceId; vel: number }
  | { kind: 'start'; root: number }
  | { kind: 'count'; n: number }
  | { kind: 'contact' }
  | { kind: 'miss' }
  | { kind: 'bird' }
  | { kind: 'dull' }
  | { kind: 'reset'; hit: number; need: number }
  | { kind: 'done'; root: number; chord: number[] }
  | { kind: 'fail' }
  | { kind: 'blip'; midi: number; voice: VoiceId }

// what the stage needs each frame
export type NoteStageIO = {
  targets: Target[]
  music: Conductor
  sceneL: number; sceneW: number; groundY: number
  inside: boolean // she is in the temple (always, for a song a Gongo or a Jukebox of the layout started)
  gongX?: number // where the gong that speaks stands (the temple's, if left out)
  center: { x: number; y: number } // her fan's centre (world)
  discHit: boolean // start the song picked (the gong's strikes, or Tocar in the jukebox's panel)
  resetHit: boolean // the reset stone was struck
  busy: boolean // the temple's campaign is on
  events: NoteShotEvent[] // what the note shots did this frame
  fire: (shot: Omit<NoteShot, 'id' | 'state' | 't'>) => void
  clearShots: (source: string) => void
  incoming: number // the stage's shots still in flight
  fx: { burst: (x: number, y: number, n: number, color: string, speed?: number, size?: number) => void; text: (x: number, y: number, text: string, color?: string, size?: number) => void }
  push: (dir: number) => void // an alien that touches her nudges her
  sound: (s: NoteStageSound) => void
}
export const RESET_NEED = 3
const TALK_CPS = 26 // letters a second a line is typed at, at least

let nextId = 3_000_000

export function createNoteStage() {
  const s = newStageState()
  let catalog: Catalog = BUILTIN_VARIANTS
  // the songs it can play (the jukebox's library) and the one picked (s.song)
  let songs: Song[] = SONGS
  // the song playing is a copy: the library can change while it plays
  let playing: Song | null = null
  // the editor asks: play this song (its draft) from a beat, or stop
  let request: { song: Song; from: number } | 'stop' | null = null
  let lines: SongLine[] = [], skipped = new Set<number>()
  const song = () => (s.phase !== 'idle' && playing) || songs[s.song] || songs[0] || SONGS[0]
  const order = () => song().aliens.map((a, i) => i).sort((a, b) => spawnBeat(song().aliens[a]) - spawnBeat(song().aliens[b]))
  const banner = (title: string, sub: string, color: string, life = 4) => { s.banner = { title, sub, color, t: 0, life } }
  const active = () => s.phase === 'playing'

  function removeAliens(io: Pick<NoteStageIO, 'targets' | 'fx'>, puff: boolean) {
    const ids = new Set(s.aliens.map(a => a.id))
    for (let i = io.targets.length - 1; i >= 0; i--) if (ids.has(io.targets[i].id)) {
      const t = io.targets[i]
      if (puff) io.fx.burst(t.x, t.y - t.h / 2, 10, '#e9e4d0', 160, 3)
      io.targets.splice(i, 1)
    }
    s.aliens = []
  }

  function start(io: NoteStageIO, i: number, draft?: { song: Song; from: number }) {
    removeAliens(io, false)
    io.clearShots(SOURCE)
    const keep = { discRing: 0, anchor: { ...io.center }, center: { ...io.center } }
    playing = draft ? structuredClone(draft.song) : songs[i] ?? songs[0] ?? SONGS[0]
    // from a bar: the aliens whose notes are all before it don't come, nor the lines said before it
    const from = draft ? Math.max(0, Math.floor(draft.from / 4) * 4) : 0
    lines = sortedLines(playing)
    Object.assign(s, newStageState(), keep, { phase: 'playing', song: i, from, draft: !!draft, said: from > 0 ? lines.filter(l => l.beat < from).length : 0 })
    skipped = new Set(from > 0 ? order().filter(k => lastBeat(song().aliens[k]) < from) : [])
    if (!draft || from === 0) banner(song().name, song().intro, song().music.zone.color, 5)
    else banner(song().name, `Do compasso ${from / 4 + 1}`, song().music.zone.color, 2.5)
    io.sound({ kind: 'start', root: song().music.zone.root })
  }

  function stop(io: NoteStageIO, phase: StagePhase) {
    removeAliens(io, true)
    io.clearShots(SOURCE)
    s.phase = phase; s.t = 0; s.talk = []; s.silent = false
  }

  function spawn(io: NoteStageIO, def: number, spb: number) {
    const sg = song(), a = sg.aliens[def], v = structuredClone(variantFor(catalog, a.variant, a.species))
    const z = sg.music.zone
    const notes = alienNotes(a, v, { root: z.root, steps: SCALES[z.scale].steps })
    const { w, h } = variantSize(v), color = a.color ?? v.color
    const path = alienPath(sg, a, v, notes, s.t0, spb)
    const c0 = { ...s.anchor }
    const p = pathAt(path, io.music.time, spb)
    const x = c0.x + p.dx, y = c0.y + p.dy
    const id = nextId++
    io.targets.push({
      id, kind: 'alien', home: 0, x, y: y + h / 2, w, h, hp: v.hp, maxHp: v.hp, flash: 0, wobble: 0, vx: 0, deadT: 0,
      face: 1, state: 'fly', animT: (id % 97) / 97, data: { ...variantData(v), color, note: true },
    })
    s.aliens.push({ id, def, v, notes, path, c0, next: 0, x, y })
    io.fx.burst(x, y, 10, color, 140, 3)
  }

  function judge(grade: StageJudge['grade']) { s.judge = { grade, t: 0 } }

  function step(dt: number, io: NoteStageIO) {
    s.t += dt; s.discRing += dt; s.resetRing += dt
    if (s.banner) { s.banner.t += dt; if (s.banner.t > s.banner.life) s.banner = null }
    if (s.judge) { s.judge.t += dt; if (s.judge.t > 0.7) s.judge = null }
    s.center = { ...io.center }
    s.anchor.x += (io.center.x - s.anchor.x) * Math.min(1, dt * 3)
    s.anchor.y += (io.center.y - s.anchor.y) * Math.min(1, dt * 3)
    const music = io.music, spb = music.secondsPerBeat(), now = music.time

    // the editor: play its song from a beat (over the one playing), or stop
    if (request) {
      const r = request
      request = null
      if (r === 'stop') { if (active()) { stop(io, 'idle'); banner('Música parada', 'Bata no gongo para tocar de novo.', '#7bdff2', 2) } }
      else if (io.busy) io.sound({ kind: 'dull' })
      else start(io, s.song, r)
    }
    // the gong (or the jukebox's Tocar) starts the song (not while the campaign is on, nor twice)
    if (io.discHit) {
      s.discRing = 0
      if (active() || io.busy) io.sound({ kind: 'dull' })
      else start(io, s.song)
    }
    const sg = song()
    // the reset stone stops it (a few strikes)
    if (s.resetHits > 0 && s.resetRing > 4) s.resetHits = 0
    if (io.resetHit && active()) {
      s.resetRing = 0; s.resetHits++
      io.sound({ kind: 'reset', hit: s.resetHits, need: RESET_NEED })
      if (s.resetHits >= RESET_NEED) { stop(io, 'idle'); banner('Música parada', 'Bata no gongo para tocar de novo.', '#7bdff2', 3); return }
    }
    if (!active()) { if (s.phase !== 'idle' && s.t > 6) s.phase = 'idle'; return }
    // leaving the temple in the middle of the song loses it
    if (!io.inside) { s.outsideT += dt; if (s.outsideT > 2.5) { fail(io, 'Você saiu do templo.'); return } } else s.outsideT = 0

    // the song's clock starts on the first bar of its zone, after the intro bars
    if (Number.isNaN(s.t0)) {
      if (music.zone.id !== sg.music.zone.id) return
      const barStart = now - (music.beat - 4 * music.bar) * spb
      s.t0 = barStart + (sg.introBars * 4 - s.from) * spb
    }
    const beat = (now - s.t0) / spb
    // the count in: the last bar of the intro
    if (beat < s.from && beat > s.from - 4) {
      const n = Math.ceil(s.from - beat)
      const prev = Math.ceil(s.from - (beat - dt / spb))
      if (n !== prev) { io.sound({ kind: 'count', n }); io.fx.text(s.center.x, s.center.y - 170, n === 4 ? 'Prepare-se' : String(n), sg.music.zone.color, n === 4 ? 20 : 30) }
    }

    // new aliens
    const ord = order()
    while (s.spawned < ord.length && spawnBeat(sg.aliens[ord[s.spawned]]) <= beat) {
      const k = ord[s.spawned++]
      if (!skipped.has(k)) spawn(io, k, spb)
    }
    // the lines, when their beat comes; a pause in silence quiets the background
    while (s.said < lines.length && lines[s.said].beat <= beat) say(lines[s.said++])
    talk(dt, io)
    s.silent = silentAt(sg, beat)

    // what the note shots did
    for (const e of io.events) {
      if (e.shot.source !== SOURCE) continue
      if (e.kind === 'rebate') {
        const mult = multOf(s.combo)
        const pts = POINTS[e.grade] * mult
        s.score += pts; s.counts[e.grade]++
        if (e.grade === 'fora') s.combo = 0
        else { s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); s.afina = Math.min(1, s.afina + AFINA_HIT) }
        judge(e.grade)
        io.fx.text(e.shot.x, e.shot.y - 18, `+${pts}`, e.grade === 'perfect' ? '#ffd166' : e.grade === 'good' ? '#7bdff2' : '#c9ced6', e.grade === 'perfect' ? 16 : 13)
      } else if (e.kind === 'miss') {
        s.counts.miss++; s.combo = 0; s.afina -= AFINA_MISS
        judge('miss'); io.sound({ kind: 'miss' })
      } else if (e.kind === 'parry') { s.counts.parry++; judge('parry') }
    }

    // the aliens: gone (shot down or turned into birds), moving, firing their notes, touching her
    const byId = new Map<number, Target>()
    io.targets.forEach(t => { if (t.kind === 'alien') byId.set(t.id, t) })
    for (let i = s.aliens.length - 1; i >= 0; i--) {
      const a = s.aliens[i], t = byId.get(a.id), def = sg.aliens[a.def], v = a.v
      if (!t || t.deadT > 0 || t.state === 'converted') {
        s.aliens.splice(i, 1)
        if (t?.state === 'converted') { s.counts.birds++; s.score += BIRD_POINTS * multOf(s.combo); io.fx.text(a.x, a.y - 40, `+${BIRD_POINTS * multOf(s.combo)}`, '#7bdff2', 16); io.sound({ kind: 'bird' }) }
        else { s.counts.kills++; s.score += v.points; io.fx.text(a.x, a.y - 30, `+${v.points}`, '#ffffff', 14) }
        continue
      }
      const p = pathAt(a.path, now, spb)
      const c = p.fixed ? a.c0 : s.anchor
      a.x = c.x + p.dx
      a.y = Math.min(io.groundY - t.h / 2 - 8, c.y + p.dy)
      t.x = a.x + (t.blast?.x ?? 0); t.y = a.y + t.h / 2 + (t.blast?.y ?? 0)
      t.face = s.center.x >= a.x ? 1 : -1
      // its notes: each one leaves so that it reaches the ring, in its lane, when the song wants it
      while (a.next < a.notes.length) {
        const n = a.notes[a.next], arrive = s.t0 + n.beat * spb
        const ang = fanAngleOf(sg.fan, n.midi)
        const tx = s.center.x + Math.cos(ang) * ARRIVE_R, ty = s.center.y + Math.sin(ang) * ARRIVE_R
        const shot = { ...v.shot, ...def.shot }
        const flight = Math.max(MIN_FLIGHT, Math.hypot(tx - a.x, ty - a.y) / shot.speed)
        if (now < arrive - flight) break
        a.next++
        if (arrive - now < 0.05) continue // too late to fire this one (the alien came in late)
        const vel = aimShot(a.x, a.y, tx, ty, arrive - now)
        const color = shot.color === 'degree' ? DEGREE_COLORS[music.degreeOf(n.midi) % DEGREE_COLORS.length] : shot.color
        const rule = def.rule ?? v.rule
        io.fire({
          x: a.x, y: a.y, vx: vel.vx, vy: vel.vy, midi: n.midi, color, size: shot.size, glow: shot.glow, trail: v.shot.trail, arriveAt: arrive, source: SOURCE,
          ...(rule ? { rule } : {}), ...(v.scale ? { scale: v.scale } : {}), ...(v.drum ? { drum: v.drum } : {}),
        })
        s.fired++
        t.flash = 0.08; t.tint = color
        const fs = { ...v.fire, ...def.fire }
        if (fs.voice !== 'none' && fs.vel > 0) io.sound({ kind: 'fire', midi: n.midi, voice: fs.voice, vel: fs.vel })
      }
      // the end of its path: the ones that come in touch her; the passing and the still ones go away
      if (a.path.mode === 'pass' || a.path.mode === 'still') {
        const far = a.path.mode === 'pass' ? now > a.path.tEnd + 3 : now > a.path.tEnd + 2
        if (far) { io.targets.splice(io.targets.indexOf(t), 1); s.aliens.splice(i, 1) }
        continue
      }
      if (now >= a.path.tEnd) {
        s.afina -= AFINA_CONTACT; s.combo = 0
        judge('contact'); io.sound({ kind: 'contact' })
        io.fx.burst(a.x, a.y, 16, t.tint ?? v.color, 220, 4)
        io.push(Math.sign(s.center.x - a.x) || 1)
        io.targets.splice(io.targets.indexOf(t), 1); s.aliens.splice(i, 1)
      }
    }

    if (s.afina <= 1e-6) { s.afina = 0; fail(io, 'A música desafinou: notas demais passaram.'); return }
    // the end: every alien out and gone, no note left in the air
    if (s.spawned >= ord.length && !s.aliens.length && io.incoming === 0 && !s.talk.length && beat > songEnd(sg)) done(io)
  }

  function say(l: SongLine) {
    const who = speakerOf(l.who, catalog)
    const t: StageTalk = { who: l.who, name: who.name, color: who.color, text: l.text, place: l.place, t: 0, secs: l.secs, shown: 0, x: s.center.x, y: s.center.y, over: false }
    // one banner at a time (the newest); the others pile up
    if (l.place === 'banner') { s.banner = null; s.talk = s.talk.filter(x => x.place !== 'banner') }
    s.talk.push(t)
    if (s.talk.length > 4) s.talk.shift()
    blips.set(t, l.blip)
  }
  const blips = new WeakMap<StageTalk, boolean>()
  // letter by letter (all of it within the first 60% of its time), a blip of its voice every other letter; a
  // balloon follows who says it: her, the gong or the nearest alien of its variation
  function talk(dt: number, io: NoteStageIO) {
    const z = song().music.zone, steps = SCALES[z.scale].steps
    for (let i = s.talk.length - 1; i >= 0; i--) {
      const t = s.talk[i]
      t.t += dt
      if (t.t > t.secs) { s.talk.splice(i, 1); continue }
      const cps = Math.max(TALK_CPS, t.text.length / Math.max(0.3, t.secs * 0.6))
      const shown = Math.min(t.text.length, Math.floor(t.t * cps))
      if (blips.get(t)) for (let k = t.shown; k < shown; k++) {
        const ch = t.text.charCodeAt(k)
        if (k % 2 || !/[\p{L}\p{N}]/u.test(t.text[k])) continue
        const who = speakerOf(t.who, catalog)
        io.sound({ kind: 'blip', voice: who.voice, midi: z.root + 12 + who.octave + steps[ch % steps.length] })
      }
      t.shown = shown
      if (t.place !== 'balao') continue
      const v = t.who.startsWith('alien:') ? t.who.slice(6) : null
      if (t.who === 'galinha') { t.x = s.center.x; t.y = s.center.y - 110; t.over = true }
      else if (t.who === 'gongo') { t.x = io.gongX ?? io.sceneL + GONG_X; t.y = io.groundY - 300; t.over = true }
      else if (v) {
        let best: StageAlien | null = null
        for (const a of s.aliens) if (a.v.id === v && (!best || Math.hypot(a.x - s.center.x, a.y - s.center.y) < Math.hypot(best.x - s.center.x, best.y - s.center.y))) best = a
        t.over = !!best
        if (best) { t.x = best.x; t.y = best.y - 50 }
      } else t.over = false
    }
  }

  function fail(io: NoteStageIO, why: string) {
    stop(io, 'failed')
    banner('Música perdida', `${why} Bata no gongo para tentar de novo.`, '#ff6b5b', 5)
    io.sound({ kind: 'fail' })
  }

  function done(io: NoteStageIO) {
    stop(io, 'done')
    const acc = Math.round(accuracy(s.counts, s.fired) * 100)
    const c = s.counts
    banner(`${song().name}: ${acc}%`, `${s.score.toLocaleString('pt-BR')} pontos · ${c.perfect} perfeitas, ${c.good} boas, ${c.fora} fora, ${c.miss} perdidas · combo máximo ${s.bestCombo} · ${c.birds} passarinhos. Bata no gongo para tocar de novo.`, '#ffd166', 8)
    io.sound({ kind: 'done', root: song().music.zone.root, chord: io.music.chord() })
  }

  return {
    state: s,
    step,
    get active() { return active() },
    get song() { return song() },
    // the song's music while it plays
    get music(): StageMusic | null { return active() ? song().music : null },
    // the note base a rebate takes from the stage: by the stage's fan (where the note is around her), the fan
    // mirrored, or as sequenced
    noteFor(shot: Pick<NoteShot, 'x' | 'y' | 'source'>): number | null {
      if (!active() || shot.source !== SOURCE) return null
      const sg = song(), ang = Math.atan2(shot.y - s.center.y, shot.x - s.center.x)
      if (sg.noteMode === 'sequenced') return null
      return fanNoteAt(sg.noteMode === 'angle' ? { ...sg.fan, mirrored: true, open: 180, start: 90, dir: -1 } : sg.fan, ang)
    },
    // the ambience of a note rebated in the stage: the fan's note as base, the song's scale, its rule and the combo
    noteEnv(shot: NoteShot) {
      if (!active() || shot.source !== SOURCE) return null
      const z = song().music.zone
      return { base: this.noteFor(shot), fit: { root: z.root, steps: SCALES[shot.scale ?? z.scale].steps }, rule: shot.rule ?? song().rule ?? STAGE_RULE, combo: s.combo }
    },
    // the catalogue the song's aliens come from (each one takes its variation when it appears)
    setCatalog(c: Catalog) { catalog = c },
    // the jukebox's library and the song picked in it (by id; false: not one of the list)
    setSongs(list: Song[]) { songs = list.length ? list : SONGS; if (s.song >= songs.length) s.song = 0 },
    select(id: string) {
      const i = songs.findIndex(x => x.id === id)
      if (i < 0) return false
      s.song = i
      if (!active()) { playing = null; if (s.phase !== 'idle') s.phase = 'idle' }
      return true
    },
    // the editor's "Tocar daqui" (its song as it is now, from a beat) and "Parar"
    playDraft(sg: Song, from: number) { request = { song: sg, from } },
    halt() { request = 'stop' },
    get silent() { return active() && s.silent },
    // the song's beat now (NaN while it waits for its zone)
    beatAt(now: number, spb: number) { return active() ? (now - s.t0) / spb : NaN },
    reset(io: Pick<NoteStageIO, 'targets' | 'fx' | 'clearShots'>) { removeAliens(io, false); io.clearShots(SOURCE); Object.assign(s, newStageState()) },
  }
}

export type NoteStage = ReturnType<typeof createNoteStage>
