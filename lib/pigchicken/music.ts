// PigChicKen's own note engine (nothing from the ChickenChess music engine or Strudel). A zone sets the key,
// the scale, the tempo and a chord progression; the conductor keeps the beat, says which chord is playing and
// turns the aim into a note that always fits.

import { grooveOf, type ZoneAmbience } from './zone-ambience'

export type ScaleId = 'majorPenta' | 'minorPenta' | 'major' | 'minor' | 'dorian' | 'lydian' | 'mixolydian' | 'harmonicMinor' | 'blues'
export const SCALES: Record<ScaleId, { label: string; steps: number[] }> = {
  majorPenta: { label: 'Pentatônica maior', steps: [0, 2, 4, 7, 9] },
  minorPenta: { label: 'Pentatônica menor', steps: [0, 3, 5, 7, 10] },
  major: { label: 'Maior', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Menor', steps: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { label: 'Dórico', steps: [0, 2, 3, 5, 7, 9, 10] },
  lydian: { label: 'Lídio', steps: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: 'Mixolídio', steps: [0, 2, 4, 5, 7, 9, 10] },
  harmonicMinor: { label: 'Menor harmônica', steps: [0, 2, 3, 5, 7, 8, 11] },
  blues: { label: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
}

// feel: how the beat is felt (the ambience's groove and the grid the notes are pulled to)
export type Feel = 'straight' | 'swing' | 'half'
// "Dano só no tom": in a zone with it, only notes inside the key (its chord scale) or inside the chord of the bar
// harmonize the enemies; the others glance off. Off (absent) by default
export type InKeyRule = 'key' | 'chord'
export const IN_KEY_RULES: InKeyRule[] = ['key', 'chord']
export type Zone = {
  id: string; name: string
  root: number // MIDI note of the key (60 = C4)
  scale: ScaleId
  chordScale: ScaleId // the 7-note scale the chords are built on
  bpm: number
  feel: Feel
  progression: number[] // scale degrees (0 = I), one chord per bar
  color: string
  inKey?: InKeyRule
  // its percussion and bass (zone-ambience.ts); without it, the ones that follow the feel
  ambience?: ZoneAmbience
  // variation blocks (sound-zones.ts): the zone is a cycle of them, each one a zone of its own that plays its first
  // `beats` beats `reps` times and hands over to the next. The conductor plays the blocks, never the zone itself
  blocks?: ZoneBlock[]
}
export type ZoneBlock = { zone: Zone; beats: number; reps: number }

// the scenes' zones in the code: the key, scale and tempo each scene of the Parquinho starts with (in silence:
// sound-zones.ts sceneZoneBase) and what the "Cenas" of the zone's Estilo (zone-styles.ts) copy, with the ambience each one used to play
export const ZONES: Zone[] = [
  { id: 'campo', name: 'Campo', root: 60, scale: 'majorPenta', chordScale: 'major', bpm: 100, feel: 'straight', progression: [0, 4, 5, 3], color: '#7bd88f', ambience: { beat: 'straight', bass: 'drone' } },
  { id: 'noite', name: 'Noite', root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 88, feel: 'half', progression: [0, 5, 2, 6], color: '#7b8cff', ambience: { beat: 'half', bass: 'drone' } },
  { id: 'feira', name: 'Feira', root: 62, scale: 'dorian', chordScale: 'dorian', bpm: 112, feel: 'swing', progression: [0, 3, 0, 4], color: '#ffb347', ambience: { beat: 'fair', bass: 'drone' } },
  { id: 'ceu', name: 'Céu', root: 65, scale: 'lydian', chordScale: 'lydian', bpm: 80, feel: 'straight', progression: [0, 1, 0, 1], color: '#7bdff2', ambience: { beat: 'breeze', bass: 'drone' } },
  { id: 'blues', name: 'Porão', root: 55, scale: 'blues', chordScale: 'mixolydian', bpm: 96, feel: 'swing', progression: [0, 0, 3, 0, 4, 3, 0, 4], color: '#c77dff', ambience: { beat: 'swing', bass: 'drone' } },
]

// colour of each scale degree (notes are tinted by where they sit in the scale)
export const DEGREE_COLORS = ['#ff6b5b', '#ffb347', '#ffd166', '#7bd88f', '#4cc9f0', '#7b8cff', '#c77dff']
export const NOTE_SYMBOLS = ['♪', '♫', '♩', '♬']

export const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

// the notes of a scale from `lo` to `hi` (MIDI), in order
export function scaleNotes(root: number, scale: ScaleId, lo: number, hi: number) {
  const out: number[] = []
  const steps = SCALES[scale].steps
  for (let o = -4; o <= 4; o++) for (const s of steps) { const m = root + o * 12 + s; if (m >= lo && m <= hi) out.push(m) }
  return out.sort((a, b) => a - b)
}

// a chord on a degree of the zone's chord scale: root, third, fifth (and seventh)
export function chordOn(zone: Zone, degree: number, seventh = false) {
  const steps = SCALES[zone.chordScale].steps
  const at = (i: number) => { const n = steps.length; const k = degree + i; return zone.root + steps[((k % n) + n) % n] + 12 * Math.floor(k / n) }
  const notes = [at(0), at(2), at(4)]
  if (seventh) notes.push(at(6))
  return notes
}

// the drone's notes for a chord: its root kept within a fourth/fifth of the key's root (the bass does not leap an
// octave between bars), its own third (major or minor: what makes the chord's type heard) and fifth (a diminished
// chord's is a tritone, not a perfect fifth)
export function droneOf(zone: Zone, chord: number[]) {
  const up = ((((chord[0] - zone.root) % 12) + 12) % 12)
  const iv = (n: number) => ((((n - chord[0]) % 12) + 12) % 12)
  return { root: zone.root + (up > 6 ? up - 12 : up), third: iv(chord[1]), fifth: iv(chord[2]) }
}

// pitch classes of a chord spread over a register
export function chordNotes(chord: number[], lo: number, hi: number) {
  const pcs = new Set(chord.map(n => ((n % 12) + 12) % 12))
  const out: number[] = []
  for (let m = lo; m <= hi; m++) if (pcs.has(((m % 12) + 12) % 12)) out.push(m)
  return out
}

export type PitchSet = 'chord' | 'scale'

export function createConductor() {
  // family: the zone the map asked for; zone: what plays, the family itself or its current variation block
  let family = ZONES[0], zone = family, next: Zone | null = null
  let time = 0 // seconds since start, on the zone's clock
  let beatPos = 0 // beats since start
  let lastBar = -1, lastBeat = -1, lastStep = -1
  // a cycle of blocks: which one plays, how many times it has played, and the beat its current pass began on
  // (always a bar line)
  let block = 0, pass = 0, passStart = 0
  let groove: number[] = [], grooveFor: Zone | null = null
  const events: { kind: 'bar' | 'beat' | 'step'; n: number }[] = []

  const spb = () => 60 / zone.bpm
  const first = (z: Zone) => z.blocks?.[0]?.zone ?? z
  const enter = (z: Zone, at: number) => { family = z; zone = first(z); block = 0; pass = 0; passStart = at }
  // the bar of the progression: counted from the start of the pass in a cycle of blocks, else from the start
  const progBar = (bar: number, blocks = !!family.blocks?.length, start = passStart) => (blocks ? Math.max(0, bar - Math.round(start / 4)) : bar)
  const degreeAt = (z: Zone, bar: number) => z.progression[((bar % z.progression.length) + z.progression.length) % z.progression.length]
  // how far each sixteenth of the bar sits from the rigid grid, in sixteenths (zone-ambience.ts grooveOf)
  const grooveNow = () => { if (grooveFor !== zone) { grooveFor = zone; groove = grooveOf(zone.ambience, zone.feel) } return groove }

  return {
    get zone() { return zone },
    // the zone the map asked for: the playing one, or the cycle of blocks it is a part of
    get family() { return family },
    get block() { return block },
    get beat() { return beatPos },
    get bar() { return Math.floor(beatPos / 4) },
    // 0 right on the beat, rising to 1 just before the next: for pulsing visuals
    get beatPhase() { return beatPos - Math.floor(beatPos) },
    get time() { return time },
    events,
    // a new zone takes over on the next bar, so the change lands musically
    setZone(z: Zone) { if (z.id !== family.id && z.id !== next?.id) next = z },
    get pending() { return next },
    get degree() { return degreeAt(zone, progBar(this.bar)) },
    chord(seventh = false) { return chordOn(zone, degreeAt(zone, progBar(Math.floor(beatPos / 4))), seventh) },
    step(dt: number) {
      time += dt
      beatPos += dt / spb()
      // a block's pass is over: it plays again or the next block takes over, on a bar line (what is left of a bar
      // the pass cut short is skipped)
      const span = family.blocks?.[block]
      if (span && beatPos >= passStart + span.beats - 1e-9) {
        const end = passStart + span.beats, over = beatPos - end
        if (++pass >= span.reps) { pass = 0; block = (block + 1) % family.blocks!.length; zone = family.blocks![block].zone }
        passStart = Math.ceil(end / 4 - 1e-9) * 4
        beatPos = passStart + Math.max(0, over)
      }
      const bar = Math.floor(beatPos / 4), beat = Math.floor(beatPos), st = Math.floor(beatPos * 4)
      if (bar !== lastBar) {
        if (next) { enter(next, bar * 4); next = null }
        lastBar = bar; events.push({ kind: 'bar', n: bar })
      }
      if (beat !== lastBeat) { lastBeat = beat; events.push({ kind: 'beat', n: beat }) }
      if (st !== lastStep) { lastStep = st; events.push({ kind: 'step', n: st }) }
    },
    // the sixteenth that comes next, for what is scheduled ahead of its time (the ambience): the zone that will be
    // playing by then (a block or a zone may take over on it), its step of the bar, the bar of its progression,
    // its chord, the seconds until it and the length of its beat
    ahead() {
      let z = zone, blocks = !!family.blocks?.length, start = passStart
      let st = Math.floor(beatPos * 4 + 1e-9) + 1, wait = (st / 4 - beatPos) * spb()
      const span = family.blocks?.[block]
      if (span && st / 4 >= passStart + span.beats - 1e-9) {
        const end = passStart + span.beats
        wait = (end - beatPos) * spb()
        if (pass + 1 >= span.reps) z = family.blocks![(block + 1) % family.blocks!.length].zone
        start = Math.ceil(end / 4 - 1e-9) * 4; st = start * 4
      }
      if (st % 16 === 0 && next) { z = first(next); blocks = !!next.blocks?.length; start = st / 4 }
      const bar = progBar(Math.floor(st / 16), blocks, start)
      return { zone: z, step: st % 16, bar, chord: chordOn(z, degreeAt(z, bar), true), wait: Math.max(0, wait), spb: 60 / z.bpm }
    },
    // seconds until the next point of the grid the notes are pulled to: the next sixteenth where the zone's groove
    // puts it (its beat's microtiming, or the off-beat eighths late with the Balanço Swing); with Meio tempo, the
    // next eighth
    toGrid(): number {
      const sub = beatPos * 4
      if (zone.feel === 'half') return Math.max(0, (Math.ceil(sub / 2 - 1e-6) * 2 - sub) / 4) * spb()
      const g = grooveNow()
      for (let k = Math.floor(sub - 1e-6); ; k++) {
        const t = k + (g[((k % 16) + 16) % 16] ?? 0)
        if (t >= sub - 1e-6) return Math.max(0, (t - sub) / 4) * spb()
      }
    },
    // how close to a beat this moment is (s): a shot on the beat earns a bonus
    offBeat(): number {
      const ph = beatPos - Math.round(beatPos)
      return Math.abs(ph) * spb()
    },
    secondsPerBeat: spb,
    // the whole clock as it is now, and putting one back (a fase de notas keeps its zone's own clock: a copy of the
    // Pátio's taken when it starts, and the Pátio's follows it again when she comes back into that zone); putting
    // one back makes no events of its own
    snapshot(): ConductorSnapshot { return { family, zone, next, time, beatPos, block, pass, passStart } },
    restore(s: ConductorSnapshot) {
      family = s.family; zone = s.zone; next = s.next; time = s.time; beatPos = s.beatPos; block = s.block; pass = s.pass; passStart = s.passStart
      lastBar = Math.floor(beatPos / 4); lastBeat = Math.floor(beatPos); lastStep = Math.floor(beatPos * 4)
    },
    // the note the aim plays: pointing higher plays higher, always inside the chord (or the scale)
    noteFor(angle: number, set: PitchSet, octave: number, span = 2) {
      const pool = this.aimPool(set, octave, span)
      const up = Math.max(-1, Math.min(1, -Math.sin(angle))) // -1 down … 1 up
      const i = Math.round(((up + 1) / 2) * (pool.length - 1))
      return pool[Math.max(0, Math.min(pool.length - 1, i))]
    },
    // the notes the aim goes through, low (pointing down) to high (pointing up): one lane of the aim's fan each
    aimPool(set: PitchSet, octave: number, span = 2) {
      const center = 60 + 12 * octave
      const lo = center - 6 * span + 1, hi = center + 6 * span
      return set === 'chord' ? chordNotes(this.chord(true), lo, hi) : scaleNotes(zone.root, zone.scale, lo, hi)
    },
    // notes `n` steps away inside the chord or the scale (for arpeggios and phrases)
    walk(from: number, n: number, set: PitchSet) {
      const pool = set === 'chord' ? chordNotes(this.chord(true), from - 24, from + 36) : scaleNotes(zone.root, zone.scale, from - 24, from + 36)
      let i = pool.findIndex(m => m >= from)
      if (i < 0) i = pool.length - 1
      return pool[Math.max(0, Math.min(pool.length - 1, i + n))]
    },
    // whether a note may harmonize the enemies here (the zone's "Dano só no tom"; always without it)
    fits(m: number) {
      if (!zone.inKey) return true
      const pc = (n: number) => ((n % 12) + 12) % 12
      if (zone.inKey === 'chord') return this.chord(true).some(c => pc(c) === pc(m))
      return SCALES[zone.chordScale].steps.includes(pc(m - zone.root))
    },
    degreeOf(m: number) {
      const steps = SCALES[zone.scale].steps
      const pc = (((m - zone.root) % 12) + 12) % 12
      let best = 0
      steps.forEach((s, i) => { if (Math.abs(s - pc) < Math.abs(steps[best] - pc)) best = i })
      return best
    },
  }
}

export type Conductor = ReturnType<typeof createConductor>
export type ConductorSnapshot = { family: Zone; zone: Zone; next: Zone | null; time: number; beatPos: number; block: number; pass: number; passStart: number }

export const NOTE_NAMES = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si']
const LETTERS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const pc = (m: number) => ((m % 12) + 12) % 12
// "Am", "F", "B°": the chord's name in letters
export function chordName(chord: number[]) {
  const [r, t, f] = chord
  const third = pc(t - r), fifth = pc(f - r)
  return LETTERS[pc(r)] + (fifth === 6 ? '°' : third === 3 ? 'm' : '')
}
export const zoneLabel = (z: Zone) => `${z.name} · ${NOTE_NAMES[pc(z.root)]} ${SCALES[z.scale].label.toLowerCase()} · ${z.bpm} bpm`
