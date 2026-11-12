// Shared composer for the Brazilian campaign kits in the section-based format (scripts/brazilian/<stage>.cjs).
// Same pipeline as the Tango and the World ballads (scripts/ballads/lib.cjs): rolls written note by note,
// Kit Harmony per bar, per-section sound, per-note sound, fills and the kit's own reactions. What this
// library adds for Brazilian rhythms: 2/4 bars, the sixteenth feel of samba written into the note starts
// (`feel`), hand dynamics per hit, hits that only sometimes play, and rolls shorter than their section.
// Time is in bars. Starts land on 1/128 bar and lengths on 1/64 (6/8: both on 1/192) because Strudel keeps
// time as exact fractions and decimal leftovers freeze compilation (see docs/mechanics/kit-tango.md).
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../../tests/helpers/music.cjs')

const root = path.resolve(__dirname, '../..')
const METERS = {
  '2/4': { beat: 1 / 2, eighth: 1 / 4, sixteenth: 1 / 8, beats: 2, ternary: false, res: 8 },
  '4/4': { beat: 1 / 4, eighth: 1 / 8, sixteenth: 1 / 16, beats: 4, ternary: false, res: 16 },
  '6/8': { beat: 1 / 2, eighth: 1 / 6, sixteenth: 1 / 12, beats: 2, ternary: true, res: 12 },
  '12/8': { beat: 1 / 4, eighth: 1 / 12, sixteenth: 1 / 24, beats: 4, ternary: true, res: 24 },
  // Aksak bars count eighths: 5/8 (3+2) on a 1/160 grid, 7/8 (3+2+2) on 1/224.
  '5/8': { beat: 1 / 5, eighth: 1 / 5, sixteenth: 1 / 10, beats: 5, ternary: false, res: 10, grid: 160 },
  '7/8': { beat: 1 / 7, eighth: 1 / 7, sixteenth: 1 / 14, beats: 7, ternary: false, res: 14, grid: 224 },
  // 9/8 as the Balkan aksak (2+2+2+3): the engine counts three beats a bar, the writing counts nine eighths.
  '9/8': { beat: 1 / 9, eighth: 1 / 9, sixteenth: 1 / 18, beats: 3, ternary: false, res: 18, grid: 144 },
}
const SCALES = {
  'Maior': [0, 2, 4, 5, 7, 9, 11], 'Dórica': [0, 2, 3, 5, 7, 9, 10], 'Mixolídia': [0, 2, 4, 5, 7, 9, 10],
  'Menor natural': [0, 2, 3, 5, 7, 8, 10], 'Harmônica menor': [0, 2, 3, 5, 7, 8, 11],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10], 'Phrygian dominant': [0, 1, 4, 5, 7, 8, 10],
}
// Hand dynamics of a drum grid: accent, stroke, medium, soft, softer, ghost; "?" and "," only sometimes play.
const HIT = { X: 1, x: .8, m: .68, o: .58, h: .46, g: .32, '?': .58, ',': .3, r: .74, R: .8 }

function random(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

function composer(meter, scale) {
  const M = METERS[meter], steps = SCALES[scale]
  if (!M || !steps) throw new Error(`meter/scale ${meter} ${scale}`)
  const tick = M.grid ? 1 / M.grid : M.ternary ? 1 / 192 : 1 / 128
  const semitone = degree => 12 * Math.floor(degree / 7) + steps[((degree % 7) + 7) % 7]
  const near = (a, b) => Math.abs(a - b) < 1e-6

  /** Velocity by position: downbeat, beats, the rest. */
  function weight(at, { strong = 1, beat = .82, off = .66 } = {}) {
    const inBar = at - Math.floor(at + 1e-9)
    if (near(inBar, 0)) return strong
    if (near(inBar / M.beat, Math.round(inBar / M.beat))) return meter === '4/4' && near(inBar, .5) ? (strong + beat) / 2 : beat
    return off
  }

  /**
   * Bars separated by "|"; tokens "degree:length" (or "0,2,4:length" for chords, "r:length" for rests).
   * Length counts `unit`s (default: the sixteenth in 2/4 and 4/4, the eighth in 6/8). Marks after the length:
   * ~ vibrato · ! accent · ' soft · ? chance .7 (?? .45) · ^n slide n semitones into the note ·
   * > delay · * ring (release + reverb) · # drive · xN ratchet · s staccato · t tenuto (full length) · pN pan N/10 · cN cutoff.
   */
  function mel(text, { unit = M.ternary || M.grid ? M.eighth : M.sixteenth, gate = .92, accent = {}, start = 0 } = {}) {
    const notes = []
    text.split('|').forEach((barText, bar) => {
      let cursor = 0
      for (const token of barText.trim().split(/\s+/).filter(Boolean)) {
        const match = /^(r|-?\d+(?:,-?\d+)*):(\d+(?:\.\d+)?)(.*)$/.exec(token)
        if (!match) throw new Error(`token ${token}`)
        const length = Number(match[2]) * unit
        if (cursor > 1 - 1e-9) throw new Error(`bar ${bar + 1} overflows at ${token}: ${text.slice(0, 60)}`)
        if (match[1] !== 'r') {
          const at = start + bar + cursor
          const extra = { velocity: weight(at, accent) }
          let duration = length * gate, mods = match[3]
          while (mods) {
            let m
            if ((m = /^\^(-?\d+)/.exec(mods))) { extra.slide = Number(m[1]); extra.slideSeconds = .08 }
            else if ((m = /^x(\d)/.exec(mods))) extra.ratchet = Number(m[1])
            else if ((m = /^p(\d)/.exec(mods))) extra.pan = Number(m[1]) / 10
            else if ((m = /^c(-?\d)/.exec(mods))) extra.cutoff = Number(m[1]) / 10
            else if ((m = /^\?\?/.exec(mods))) extra.chance = .45
            else if ((m = /^[~!'?>*#st]/.exec(mods))) {
              const c = m[0]
              if (c === '~') extra.vibrato = true
              if (c === '!') extra.velocity = 1
              if (c === "'") extra.velocity = Math.round(extra.velocity * .7 * 100) / 100
              if (c === '?') extra.chance = .7
              if (c === '>') extra.delay = .32
              if (c === '*') Object.assign(extra, { release: .8, reverb: .42 })
              if (c === '#') extra.drive = 1.3
              if (c === 's') duration = length * .5
              if (c === 't') duration = length
            } else throw new Error(`mark ${mods} in ${token}`)
            mods = mods.slice(m[0].length)
          }
          for (const degree of match[1].split(',').map(Number)) notes.push({ start: at, duration, degree, ...extra })
        }
        cursor += length
      }
      if (cursor > 1 + 1e-9) throw new Error(`bar ${bar + 1} is too long: ${barText.trim()}`)
    })
    return notes
  }
  /** Repeats bar text n times. */
  const rep = (text, n) => Array.from({ length: n }, () => text).join(' | ')
  /** Repeats a grid of fewer bars until it fills `bars` (a one-bar figure in a four-bar loop plays in all four). */
  const tile = (text, bars) => { const n = text.split('|').length; return n >= bars || bars % n ? text : rep(text, bars / n) }
  /** Drum grid: one character per unit (default: the sixteenth; the eighth in 6/8); bars separated by "|".
   * X x m o h g (loud to ghost) · ? and , (hits that only sometimes play) · r R (ratchets) · . rest. */
  function hits(text, { unit = M.ternary || M.grid ? M.eighth : M.sixteenth, length = unit * .5, degree = 0, start = 0, extra = {} } = {}) {
    const notes = []
    text.split('|').forEach((barText, bar) => {
      const cells = [...barText.replace(/\s+/g, '')]
      if (cells.length * unit > 1 + 1e-9) throw new Error(`bar ${bar + 1} is too long: ${barText.trim()}`)
      cells.forEach((c, i) => {
        if (c === '.' || c === '-') return
        if (!(c in HIT)) throw new Error(`hit ${c}`)
        const n = { start: start + bar + i * unit, duration: length, degree, velocity: HIT[c], ...extra }
        if (c === '?') n.chance = .5
        if (c === ',') n.chance = .6
        if (c === 'r') n.ratchet = 2
        if (c === 'R') n.ratchet = 3
        notes.push(n)
      })
    })
    return notes
  }
  /** Absolute scale degrees become chord-relative: Kit Harmony adds each bar's root back. */
  const relative = (notes, harmony, from = 0) => notes.map(n => ({ ...n, degree: n.degree - harmony[(Math.floor(n.start + 1e-6) + from) % harmony.length] }))
  /**
   * A chord per bar played on a rhythm: `rhythm` is a drum grid of one or more bars (it repeats over the
   * harmony), `voicing` the chord degrees over each bar's root. With `ahead`, hits on the last `ahead`
   * units of a bar already play the next bar's chord (the anticipation of samba and bossa). The result is
   * in absolute degrees: pass it to `relative` with the same harmony.
   */
  function comp(harmony, rhythm, voicing = [0, 2, 4], { unit = M.ternary ? M.eighth : M.sixteenth, length = unit * .8, ahead = 0, voicings } = {}) {
    const cells = rhythm.split('|').map(barText => [...barText.replace(/\s+/g, '')])
    const notes = []
    harmony.forEach((chordRoot, bar) => {
      const row = cells[bar % cells.length]
      row.forEach((c, i) => {
        if (c === '.' || c === '-') return
        if (!(c in HIT)) throw new Error(`hit ${c}`)
        const anticipated = ahead && i >= row.length - ahead
        const target = anticipated ? (bar + 1) % harmony.length : bar
        const chord = voicings?.[target] ?? voicing
        for (const degree of chord) {
          const n = { start: bar + i * unit, duration: length, degree: degree + harmony[target], velocity: HIT[c] }
          if (c === '?') n.chance = .5
          if (c === ',') n.chance = .6
          notes.push(n)
        }
      })
    })
    return notes
  }
  /** Spreads simultaneous chord notes like a strum (down: low to high). */
  function strum(notes, spread = tick, up = false) {
    const groups = new Map()
    for (const n of notes) { const key = Math.round(n.start * 384); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(n) }
    for (const group of groups.values()) {
      group.sort((a, b) => (up ? -1 : 1) * (a.degree - b.degree))
      group.forEach((n, i) => { n.start += i * spread; n.duration = Math.max(1 / 64, n.duration - i * spread) })
    }
    return notes
  }
  /** Slides between consecutive notes of a legato line when the leap is wide enough. */
  function portamento(notes, min = 3, seconds = .09, every = 1) {
    let count = 0
    notes.forEach((n, i) => {
      const previous = notes[i - 1]
      if (!previous || n.slide !== undefined) return
      const leap = semitone(n.degree) - semitone(previous.degree)
      if (Math.abs(leap) >= min && Math.abs(leap) <= 9 && ++count % every === 0) Object.assign(n, { slide: leap, slideSeconds: seconds })
    })
    return notes
  }
  /**
   * The hand on the instrument. `push` moves each sixteenth of the beat (in ticks of 1/128 bar; 1/192 in
   * 6/8): samba plays the second sixteenth a little late and the fourth early. `jitter` adds up to that
   * many ticks of loose timing and `vel` that much loose dynamics, from a seeded draw (the same kit every
   * build). A note never leaves its bar, so Kit Harmony still gives it the chord it was written on.
   */
  function feel(notes, { push, jitter = 0, vel = 0, seed = 1, late = 0 } = {}) {
    const draw = random(seed)
    return notes.map(n => {
      const bar = Math.floor(n.start + 1e-9), inBar = n.start - bar
      const position = Math.round(inBar / M.sixteenth)
      let move = late
      if (push && near(inBar, position * M.sixteenth)) move += push[position % push.length]
      if (jitter) move += Math.round((draw() * 2 - 1) * jitter)
      const start = Math.min(bar + 1 - tick, Math.max(bar, n.start + move * tick))
      const velocity = vel ? Math.min(1, Math.max(.12, n.velocity + (draw() * 2 - 1) * vel)) : n.velocity
      return { ...n, start, velocity }
    })
  }
  /** Soft strokes sound darker and accents brighter: a filter offset from the dynamics, in three steps. */
  const tone = (notes, depth = .2) => notes.map(n => n.cutoff !== undefined ? n : n.velocity < .45 ? { ...n, cutoff: -depth } : n.velocity > .9 ? { ...n, cutoff: depth / 2 } : n)
  /**
   * No two strokes of a hand sound alike: besides the darker ghosts and brighter accents of `tone`, each
   * stroke draws its own colour (a filter offset of up to `spread`) and, with `ring`, its own decay.
   * Offsets move in steps of .05 so that the strokes still group into few lanes when compiled.
   */
  function timbre(notes, seed, { depth = .2, spread = .1, ring = 0 } = {}) {
    const draw = random(seed * 7919 + 13)
    return notes.map(n => {
      if (n.cutoff !== undefined) return n
      const base = n.velocity < .45 ? -depth : n.velocity > .9 ? depth / 2 : n.velocity < .62 ? -depth / 2 : 0
      const cutoff = Math.max(-.45, Math.min(.3, Math.round((base + (draw() * 2 - 1) * spread) * 20) / 20))
      const out = cutoff ? { ...n, cutoff } : { ...n }
      if (ring && n.release === undefined && draw() < .34) out.release = ring
      return out
    })
  }
  /** Crescendo or diminuendo over the roll: velocity scales from `from` to `to` between the first and last bar. */
  const swell = (notes, bars, from, to) => notes.map(n => ({ ...n, velocity: Math.min(1, Math.max(.12, n.velocity * (from + (to - from) * Math.min(1, n.start / Math.max(1e-9, bars - 1))))) }))
  /** Keeps the notes of some bars (0-based) and drops the rest. */
  const only = (notes, ...bars) => notes.filter(n => bars.includes(Math.floor(n.start + 1e-9)))
  const without = (notes, ...bars) => notes.filter(n => !bars.includes(Math.floor(n.start + 1e-9)))
  const shift = (notes, bars) => notes.map(n => ({ ...n, start: n.start + bars }))
  const up = (notes, degrees) => notes.map(n => ({ ...n, degree: n.degree + degrees }))
  const vel = (notes, factor) => notes.map(n => ({ ...n, velocity: Math.round(Math.min(1, Math.max(.12, n.velocity * factor)) * 100) / 100 }))
  const set = (notes, extra) => notes.map(n => ({ ...n, ...extra }))
  /**
   * Token bars as the older Brazilian scripts wrote them ("7 6 . 4", one token per step, `steps` a bar):
   * a note lasts until the next token that is not "."; notes of `vibratoFrom` steps or more take vibrato.
   */
  function line(rows, { steps = M.res, vibratoFrom = 3, gate = .96 } = {}) {
    const text = rows.map(row => {
      const tokens = row.trim().split(/\s+/)
      if (tokens.length !== steps) throw new Error(`bar of ${tokens.length} steps: ${row}`)
      const out = []
      for (const token of tokens) {
        if (token === '.') { if (!out.length) out.push({ degree: 'r', length: 1 }); else out[out.length - 1].length++; continue }
        out.push({ degree: token, length: 1 })
      }
      return out.map(n => `${n.degree}:${n.length}${n.degree !== 'r' && n.length >= vibratoFrom ? '~' : ''}`).join(' ')
    }).join(' | ')
    return mel(text, { unit: 1 / steps, gate })
  }
  /** A sung phrase: each `window`-bar phrase swells to its highest note and falls back, notes off the beat are
   * lighter, wide leaps glide, and the time is a little loose. */
  function phrase(notes, seed, { low = .5, high = .86, window = 4, jitter = 1, glide = 5 } = {}) {
    const groups = new Map()
    for (const n of notes) { const key = Math.floor(n.start / window + 1e-9); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(n) }
    const shaped = []
    for (const group of groups.values()) {
      const top = Math.max(...group.map(n => n.degree)), bottom = Math.min(...group.map(n => n.degree))
      for (const n of group) {
        const height = top === bottom ? .5 : (n.degree - bottom) / (top - bottom)
        const onBeat = Math.abs(n.start / M.beat - Math.round(n.start / M.beat)) < 1e-6
        shaped.push({ ...n, velocity: (low + (high - low) * (.35 + .65 * height)) * (onBeat ? 1 : .9) })
      }
    }
    return feel(glide ? portamento(shaped, glide, .06, 2) : shaped, { jitter, vel: .04, seed })
  }
  /** Chords named per bar from a table of absolute degrees, on a rhythm of `steps` cells a bar (rows cycle);
   * with `ahead`, the last cells of a bar already play the next bar's chord. */
  function named(names, rhythm, table, { steps = M.res, length = .8 / steps, ahead = 0 } = {}) {
    const rows = rhythm.split('|').map(row => [...row.replace(/\s+/g, '')]), notes = []
    names.forEach((name, bar) => rows[bar % rows.length].forEach((c, i) => {
      if (c === '.' || c === '-') return
      if (!(c in HIT)) throw new Error(`hit ${c}`)
      const chord = table[ahead && i >= steps - ahead ? names[(bar + 1) % names.length] : name]
      for (const degree of chord) notes.push({ start: bar + i / steps, duration: length, degree, velocity: HIT[c], ...(c === ',' || c === '?' ? { chance: c === ',' ? .6 : .5 } : {}) })
    }))
    return notes
  }
  const roll = (bars, ...groups) => ({ bars, notes: groups.flat().filter(n => n.start < bars - 1e-9).map(n => ({ ...n, duration: Math.min(n.duration, bars - n.start) })) })
  return { M, meter, tick, semitone, mel, rep, tile, hits, comp, line, phrase, named, relative, strum, portamento, feel, tone, timbre, swell, only, without, shift, up, vel, set, roll, weight }
}

/** Snaps every note to the grid, keeps it inside its roll and rounds the dynamics to steps of .04
 * (each distinct velocity compiles as its own lane). */
function snap(rollValue, ternary, grid) {
  const startGrid = grid ?? (ternary ? 192 : 128), lengthGrid = grid ? grid / 2 : ternary ? 192 : 64, minimum = grid ? 2 / (grid / 2) : ternary ? 3 / 192 : 1 / 64
  rollValue.notes = rollValue.notes.map(n => {
    const start = Math.min(rollValue.bars - minimum, Math.max(0, Math.round(n.start * startGrid) / startGrid))
    const duration = Math.min(rollValue.bars - start, Math.max(minimum, Math.round(n.duration * lengthGrid) / lengthGrid))
    const clean = { ...n, start, duration, velocity: Math.max(.12, Math.min(1, Math.round(n.velocity * 25) / 25)) }
    for (const key of Object.keys(clean)) if (clean[key] === undefined) delete clean[key]
    return clean
  }).sort((a, b) => a.start - b.start || a.degree - b.degree)
  if (rollValue.notes.length > 256) throw new Error(`roll with ${rollValue.notes.length} notes`)
  return rollValue
}

/** Text form of a roll for the profile (the kit keeps the exact rolls). */
function pattern(rollValue, res) {
  const cells = Array.from({ length: Math.round(rollValue.bars * res) }, () => []), ends = new Set()
  for (const n of rollValue.notes) { const at = Math.min(cells.length - 1, Math.round(n.start * res)); cells[at].push(n.degree); ends.add(Math.round((n.start + n.duration) * res)) }
  const notes = cells.filter(c => c.length).reduce((n, c) => n + new Set(c).size, 0)
  const marks = notes + ends.size <= 250
  return cells.map((degrees, i) => degrees.length ? [...new Set(degrees)].join(',') + '_' : marks && ends.has(i) ? '0?0' : '.').join(' ')
}

const SAMPLE = (bank, asset, variant = 0, pitched = true) => ({ kind: 'sample', bank, asset, variant, pitched })
const DRUM = (bank, asset, variant = 0) => SAMPLE(bank, asset, variant, false)
const WHITE = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2']

/**
 * Builds the official kit and the text profile of one stage.
 * `form`: [{ label, bars, bank, harmony, transpose? }]; bank indices are global (0–7) so that reactions
 * changing the variation mean the same material for every instrument.
 * Each part: { slot, rolls: { [bank]: notes | roll }, sections: (true|null)[] (presence per section),
 * fills: { [section]: bank }, params: { [section]: {...} }, mapping, effects, design, extra }.
 * A bank given as a plain note list fills its section; a roll may be shorter and loop inside the section
 * when its length divides the section's.
 */
async function build(song) {
  const { id, form, parts } = song
  const meter = METERS[song.meter], ternary = meter.ternary
  const { cities } = loadTs('lib/cities-data.ts')
  const { createStyledCityKit, CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
  const { styleProfileSchema, validateOfficialKit } = loadTs('lib/admin/validation.ts')
  const { kitReactionsSchema } = loadTs('lib/music/reactions.ts')
  if (parts.map(p => p.slot).join() !== WHITE.join()) throw new Error('Parts must follow the white slots a1…h2')
  const bankCount = Math.max(...form.map(s => s.bank), ...parts.flatMap(p => Object.values(p.fills ?? {}))) + 1
  if (bankCount > 8) throw new Error('At most 8 banks')
  const bankBars = Array.from({ length: bankCount }, (_, bank) => form.find(s => s.bank === bank)?.bars ?? 1)
  for (const [bank, bars] of bankBars.entries()) if (form.some(s => s.bank === bank && s.bars !== bars)) throw new Error(`bank ${bank}: sections of different lengths`)
  for (const part of parts) {
    if (part.sections.length !== form.length) throw new Error(`${part.name}: one presence per section`)
    part.bankRolls = Array.from({ length: bankCount }, (_, bank) => {
      const given = part.rolls[bank], bars = bankBars[bank]
      const r = !given ? { bars, notes: [] } : Array.isArray(given) ? { bars, notes: given.filter(n => n.start < bars - 1e-9).map(n => ({ ...n, duration: Math.min(n.duration, bars - n.start) })) } : given
      if (bars % r.bars > 1e-9) throw new Error(`${part.name} bank ${bank}: ${r.bars} bars does not divide ${bars}`)
      try { return snap(structuredClone(r), ternary, meter.grid) } catch (error) { throw new Error(`${part.name} bank ${bank}: ${error.message}`) }
    })
    form.forEach((section, index) => {
      if (part.sections[index] && !part.rolls[section.bank]) throw new Error(`${part.name}: section ${index} plays an empty bank ${section.bank}`)
    })
  }
  const reactions = kitReactionsSchema.parse(song.reactions)
  const profile = {
    name: song.profileName, bpm: song.bpm, meter: song.meter, root: song.root, scale: song.scale, harmony: 'kit', swing: 0,
    sections: form.map(s => s.bars * meter.beats), sectionLabels: form.map(s => s.label), harmonicSequences: form.map(s => s.harmony),
    reactions, reference: song.reference, url: song.url,
    parts: parts.map(part => ({
      role: part.role, name: part.name, behavior: part.behavior, source: part.source,
      patterns: part.bankRolls.map(r => pattern(r, meter.res)), bars: part.bankRolls.map(r => r.bars), octave: part.octave, gain: part.gain,
      attack: part.attack, decay: part.decay, sustain: part.sustain, release: part.release, clip: part.clip, lpf: part.lpf, hpf: part.hpf,
      ...(part.lpfRange ? { lpfRange: part.lpfRange } : {}), ...(part.reverbRange ? { reverbRange: part.reverbRange } : {}), ...(part.driveRange ? { driveRange: part.driveRange } : {}),
      arrangement: { restart: true, active: part.sections.map(Boolean), variations: form.map(s => s.bank), transpose: form.map(s => s.transpose ?? 0),
        ...(part.fills ? { fills: form.map((_, index) => part.fills[index] ?? null) } : {}) },
      effects: part.effects ?? {}, ...(part.mapping ? { mapping: part.mapping } : {}), ...(part.design ? { design: part.design } : {}),
    })),
  }
  styleProfileSchema.parse(profile)
  fs.writeFileSync(path.join(root, 'data/music/profiles', `${id}.json`), `${JSON.stringify(profile, null, 2)}\n`)
  const city = cities.find(c => c.id === id)
  if (!city) throw new Error(`Stage ${id} is not registered in lib/rhythm-stages.ts`)
  const kit = createStyledCityKit(city, profile)
  kit.name = song.kitName
  for (const piece of kit.pieces) {
    const slot = piece.color === 'w' ? piece.origin : `${piece.origin[0]}${9 - Number(piece.origin[1])}`
    const part = parts.find(p => p.slot === slot)
    const instrument = kit.instruments[piece.id]
    instrument.pianoRolls = part.bankRolls.map(r => structuredClone(r))
    if (part.octaveRange) instrument.octaveRange = part.octaveRange
    Object.assign(instrument, part.extra)
    for (const [index, section] of kit.arrangement.sections.entries()) {
      const step = instrument.arrangement.sections[section.id]
      if (part.fills?.[index] !== undefined && step.variation !== null) step.fill = part.fills[index]
      else delete step.fill
      const params = part.params?.[index]
      if (params && step.variation !== null) step.params = structuredClone(params)
    }
  }
  kit.reactions = structuredClone(reactions)
  const official = validateOfficialKit(id, kit, CITY_STYLE_REVISIONS[id])
  const { saveOfficialKit } = await import(path.join(root, 'scripts/admin/official-kits.mjs'))
  const saved = await saveOfficialKit(root, id, official)
  const notes = parts.reduce((sum, part) => sum + part.bankRolls.reduce((n, r) => n + r.notes.length, 0), 0)
  const seconds = form.reduce((n, s) => n + s.bars, 0) * meter.beats * 60 / song.bpm
  console.log(`Wrote ${saved.path} (${saved.revision}): ${form.length} sections, ${form.reduce((n, s) => n + s.bars, 0)} bars (${Math.round(seconds)} s), ${notes} notes per team`)
}

/**
 * Reactions of a Brazilian kit. `banks` names the material each event calls:
 * refrain (castling), breque (check: the stop or convention of the style), lament (a lost queen),
 * calm (quiet moves), tense (the evaluation turning), peak (endgame, promotion, bare kings), finale (mate).
 * Long states (opening, middle, tension, drought) never pin a variation: they would freeze the song.
 */
function reactions(prefix, banks, { drumsOnly = false, lift = 0 } = {}) {
  const rule = (rid, trigger, target, duration, quantize, actions, instruments) => ({ id: `${prefix}-${rid}`, trigger, enabled: true, quantize, target, duration, actions, ...(instruments ? { instruments } : {}) })
  const action = (type, value = 0, extra = {}) => ({ type, value, ...extra })
  const lead = drumsOnly ? 'drums' : 'lead'
  const rules = [
    rule('opening', 'opening', 'both', 1, true, [action('gain', -3)]),
    rule('middle', 'middle', 'both', 1, true, [action('bpm', 2, { rampBars: 8 }), action('gain', 2)]),
    rule('endgame', 'endgame', 'both', 1, true, [action('bpm', 3, { rampBars: 8 }), action('variation', banks.peak), action('gain', 4)]),
    rule('check', 'check', 'actor', 1, true, [action('activate'), action('variation', banks.breque), action('gain', 3)]),
    rule('capture', 'capture', 'actor', 1, false, [action('gain', 5)], 'drums'),
    rule('queen-capture', 'queenCapture', 'both', 4, true, [action('variation', banks.lament), action('reverb', .4), action('lpf', 2600, { rampBars: 2 })]),
    rule('first-castle', 'firstCastle', 'both', 4, true, [action('variation', banks.refrain)]),
    rule('quiet', 'quiet', 'both', 2, true, [action('variation', banks.calm), action('gain', -4, { rampBars: 2 })]),
    rule('tension', 'tension', 'both', 1, true, [action('lpf', 2400, { rampBars: 8 }), action('resonance', 6), action('gain', -2, { rampBars: 4 })], lead),
    rule('capture-drought', 'captureDrought', 'both', 1, true, [action('reverb', .4), action('gain', -3, { rampBars: 4 })], lead),
    rule('promotion', 'promotion', 'actor', 2, true, lift ? [action('transpose', lift), action('variation', banks.peak)] : [action('variation', banks.peak), action('gain', 4)]),
    rule('eval-swing', 'evalSwing', 'actor', 2, true, [action('variation', banks.tense), action('gain', 4)]),
    rule('minimum-both', 'minimumBoth', 'both', 0, true, [action('bpm', 3, { rampBars: 8 }), action('variation', banks.peak), action('gain', 5)]),
    rule('mate', 'mate', 'both', 0, true, [action('variation', banks.finale), action('reverb', .45)]),
  ]
  return { overrides: rules.map(r => r.trigger), rules }
}

/**
 * The helpers every stage script repeats, bound to one form. `sections`: [label, bars, bank] rows; `names`: chord
 * names per bank (at most 8, they loop); `root`: scale degree of each chord name; `feel`: the style's hand.
 * `drum` loops a grid of up to four bars, `beat` writes a whole section, `sing`/`under` shape a tune (and its
 * second voice), `comp` strums named chords, `bars` writes one `mel` bar per chord, `finish` wires the fill
 * part (the one whose only material is the fill bank), drops absent sections and sets per-section sound.
 */
function studio(meterName, scale, { names, root: chordRoot, sections, feel: base = {}, fill = 7, colour = {} }) {
  const C = composer(meterName, scale)
  const H = bank => names[bank].map(name => chordRoot[name])
  const FORM = sections.map(([label, bars, bank]) => ({ label, bars, bank, harmony: H(bank) }))
  const barsOf = bank => FORM.find(s => s.bank === bank).bars
  const loopBars = bank => Math.min(4, barsOf(bank))
  // Chord loops last eight bars, or the whole section when eight does not divide it (twelve-bar sections).
  const loopNames = bank => Array.from({ length: barsOf(bank) % Math.min(8, barsOf(bank)) ? barsOf(bank) : Math.min(8, barsOf(bank)) }, (_, i) => names[bank][i % names[bank].length])
  const hand = (seed, notes, extra = {}) => C.timbre(C.feel(notes, { ...base, seed, ...extra }), seed, colour)
  // A groove of up to four bars loops; a longer pattern is written out and keeps its own length.
  const drum = (bank, seed, text, extra) => { const bars = Math.max(loopBars(bank), text.split('|').length); return C.roll(bars, hand(seed, C.hits(C.tile(text, bars)), extra)) }
  const beat = (seed, text, extra) => hand(seed, C.hits(text), extra)
  const sing = (rows, bank, seed, options = {}) => C.relative(C.phrase(C.line(rows, options.line), seed, options), H(bank))
  const under = (rows, bank, seed, options = {}, degrees = -2) => C.relative(C.vel(C.up(C.phrase(C.line(rows, options.line), seed, options), degrees), .84), H(bank))
  /** A tune in `mel` tokens ("degree:length", bars split by "|"), in absolute degrees; `harmony` its second voice. */
  const tune = (text, bank, seed, options = {}) => C.relative(C.phrase(C.mel(text, { gate: .94, ...options.mel }), seed, options), H(bank))
  const harmony = (text, bank, seed, options = {}, degrees = -2) => C.relative(C.vel(C.up(C.phrase(C.mel(text, { gate: .94, ...options.mel }), seed, options), degrees), .84), H(bank))
  const comp = (table, bank, rhythm, seed, options) => C.roll(loopNames(bank).length, C.relative(C.strum(hand(seed, C.named(loopNames(bank), rhythm, table, options)), C.tick), H(bank)))
  const bars = (bank, seed, write, options = {}) => C.roll(loopNames(bank).length, C.relative(C.feel(C.mel(loopNames(bank).map(write).join(' | '), options), { ...base, jitter: 0, vel: .04, seed, ...options.feel }), H(bank)))
  /** A picking figure for `bars`: letters a–h in the patterns stand for the notes of each bar's chord in `table`
   * (absolute degrees, voiced by hand); the patterns take turns bar by bar. */
  const figure = (table, ...patterns) => (name, bar) => patterns[bar % patterns.length].replace(/(^|\s|,)([a-h])(?=[:,])/g, (_, lead, letter) => {
    const degree = table[name][letter.charCodeAt(0) - 97]
    if (degree === undefined) throw new Error(`chord ${name} has no note ${letter}`)
    return lead + degree
  })
  /** An ostinato written chord-relative (degree 0 is each bar's root): Kit Harmony carries it through the changes. */
  const riff = (length, seed, text, options = {}) => C.roll(length, hand(seed, C.mel(C.tile(text, length), options), options.feel))
  /** Drops what sounds before bar `from` (an instrument that enters later in the introduction). */
  const from = (bar, value) => Array.isArray(value) ? value.filter(n => n.start >= bar - 1e-9) : { ...value, notes: value.notes.filter(n => n.start >= bar - 1e-9) }
  /** Unrolls a looping roll into a plain note list of `length` bars. */
  const unroll = (value, length) => Array.from({ length: Math.ceil(length / value.bars) }, (_, i) => value.notes.map(n => ({ ...n, start: n.start + i * value.bars }))).flat().filter(n => n.start < length - 1e-9)
  const finish = (parts, { fills = {}, params = {} } = {}) => {
    for (const part of parts) {
      part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)
      if (part.rolls[fill]) {
        // The part that owns the fill bank plays it as the last bar of the chosen sections, even where it is otherwise silent.
        const chosen = part.fills ?? fills[part.slot] ?? fills
        part.fills = Object.fromEntries(Object.entries(chosen).filter(([, bank]) => typeof bank === 'number'))
        for (const index of Object.keys(part.fills).map(Number)) {
          part.rolls[FORM[index].bank] ??= { bars: 1, notes: [] }
          part.sections[index] = true
        }
      }
      part.params = params[part.slot]
    }
    return parts
  }
  return { C, H, FORM, FILL: fill, on: presence(FORM), ALL: FORM.map((_, i) => i), barsOf, loopNames, hand, drum, beat, sing, under, tune, harmony, comp, bars, figure, riff, from, unroll, finish }
}

/** Shorthand for a part and for the presence list of the sections it plays. */
const P = (slot, name, role, behavior, source, rolls, sections, opts = {}) => ({ slot, name, role, behavior, source, rolls, sections, ...opts })
const presence = form => (...indices) => form.map((_, i) => indices.includes(i) || null)

// ---------- calibrated voices ----------
// One recorded source with the envelope and filter that suit it and the gain measured against the mix
// targets (lead about -33 dB, bass -33.5, harmony -37.5, kit drums -34 to -46). A script picks a voice and
// overrides what the arrangement needs: V.conga({ gain: .3, pan: .2 }). `pan`, `reverb`, `delay`, `drive`
// go to the effects; `role`, `vibrato`, `vibratoDepth` to the design; `panWidth` to the mapping.
const voice = (source, base) => (over = {}) => {
  const { pan, reverb, delay, drive, role, vibrato, vibratoDepth, panWidth, ...rest } = over
  const effects = { ...base.effects }, design = { ...base.design }, mapping = { fileDegrees: 0, rankDegrees: 0, ...base.mapping }
  for (const [key, value] of Object.entries({ pan, reverb, delay, drive })) if (value !== undefined) effects[key] = value
  for (const [key, value] of Object.entries({ role, vibrato, vibratoDepth })) if (value !== undefined) design[key] = value
  if (panWidth !== undefined) mapping.panWidth = panWidth
  return { source, opts: { ...base, ...rest, effects, mapping, ...(Object.keys(design).length ? { design } : {}) } }
}
const hit = (bank, asset, gain, decay, lpf, hpf, extra = {}) => voice(DRUM(bank, asset, extra.variant || 0), {
  octave: 2, gain, attack: .001, decay, sustain: 0, release: Math.max(.04, decay * .6), clip: extra.clip ?? .8, lpf, hpf,
  effects: { reverb: extra.reverb ?? .08, pan: 0 }, design: { role: 'drums' },
})
const tone = (bank, asset, octave, gain, envelope, lpf, hpf, extra = {}) => voice(SAMPLE(bank, asset, extra.variant || 0), {
  octave, gain, attack: envelope[0], decay: envelope[1], sustain: envelope[2], release: envelope[3], clip: 1, lpf, hpf,
  effects: { reverb: extra.reverb ?? .12, pan: 0 }, design: extra.design || {},
})
const V = {
  // acoustic kit and hand percussion
  kick: hit('percussion', 'kick', .36, .3, 4200, 30, { clip: 1, reverb: .05 }),
  snare: hit('percussion', 'snare', .5, .16, 7000, 160, { reverb: .1 }),
  ghost: hit('percussion', 'ghost-snare', .5, .1, 5500, 180, { clip: .6 }),
  hat: hit('percussion', 'hat', .9, .12, 9000, 2200, { clip: .7, reverb: .04 }),
  openHat: hit('percussion', 'open-hat', .5, .3, 9000, 1800, { reverb: .06 }),
  ride: hit('percussion', 'ride', .5, .4, 8500, 900, { reverb: .08 }),
  cymbal: hit('percussion', 'cymbal-tip', .5, .3, 9000, 1200, { reverb: .08 }),
  crash: hit('percussion', 'crash', .3, .9, 9000, 500, { reverb: .14 }),
  tom: hit('percussion', 'tom', .3, .25, 4500, 70, { clip: .9, reverb: .1 }),
  conga: hit('percussion', 'conga', .36, .2, 5000, 110),
  slap: hit('percussion', 'muted-conga', .4, .12, 5500, 160, { clip: .7 }),
  bongo: hit('percussion', 'bongo', .44, .14, 6000, 200),
  shaker: hit('percussion', 'shaker', .28, .09, 7500, 1800, { clip: .5, reverb: .05 }),
  tambourine: hit('percussion', 'tambourine', .9, .16, 9000, 1500, { clip: .7, reverb: .06 }),
  rim: hit('drums', 'wood-rim', .16, .08, 6500, 500, { clip: .6, reverb: .1 }),
  clap: hit('drums', 'room-clap', .34, .14, 6500, 400, { clip: .7, reverb: .14 }),
  brush: hit('drums', 'brush', .3, .14, 7000, 300, { clip: .7, reverb: .1 }),
  bassDrum: hit('classical', 'concert-bass-drum', .3, .5, 1800, 30, { clip: 1, reverb: .1 }),
  frame: hit('world', 'tambourine', .4, .2, 7000, 300, { reverb: .1 }),
  bellLow: hit('sambaReggae', 'agogo-grave', .2, .16, 6500, 400, { clip: .7, reverb: .1 }),
  bellHigh: hit('sambaReggae', 'agogo-agudo', .18, .14, 7000, 600, { clip: .7, reverb: .1 }),
  guiro: hit('brasil', 'reco-reco', .36, .1, 6500, 900, { clip: .6, reverb: .06 }),
  ganza: hit('brasil', 'ganza', .3, .09, 7500, 1500, { clip: .5, reverb: .05 }),
  palmas: hit('brasil', 'palmas', .3, .14, 6500, 400, { clip: .7, reverb: .14 }),
  triangle: hit('brasil', 'triangulo-aberto', .2, .3, 9000, 2000, { clip: .6, reverb: .1 }),
  // drum machines and synthesizers (levels from the Funk carioca kit)
  linnKick: hit('machines', 'linn-kick', .28, .3, 5000, 30, { clip: .9, reverb: .04 }),
  linnSnare: hit('machines', 'linn-snare', .24, .2, 9000, 150, { reverb: .12 }),
  linnClap: hit('machines', 'linn-clap', .2, .2, 9000, 300, { reverb: .14 }),
  linnCabasa: hit('machines', 'linn-cabasa', .2, .08, 10000, 2000, { clip: .6, reverb: .05 }),
  linnTambourine: hit('machines', 'linn-tambourine', .2, .12, 10000, 1500, { clip: .7, reverb: .06 }),
  linnConga: hit('machines', 'linn-conga', .2, .2, 6000, 120, { reverb: .1 }),
  rim808: hit('machines', '808-rim', .2, .08, 8000, 400, { clip: .6, reverb: .1 }),
  cowbell808: hit('machines', '808-cowbell', .09, .2, 8000, 500, { clip: .6, reverb: .08 }),
  clave808: hit('machines', '808-clave', .12, .08, 8000, 600, { clip: .6, reverb: .1 }),
  kick808: hit('machines', '808-kick-long', .29, .8, 6000, 25, { clip: .9, reverb: .03 }),
  kick909: hit('machines', '909-kick-hard', .24, .4, 5000, 35, { clip: .8, reverb: .03 }),
  snare909: hit('machines', '909-snare', .24, .2, 10000, 150, { reverb: .1 }),
  snare909Tight: hit('machines', '909-snare-tight', .22, .12, 10000, 200, { reverb: .08 }),
  clap909: hit('machines', '909-clap', .22, .2, 9000, 300, { reverb: .12 }),
  hat909: hit('machines', '909-hat', .26, .06, 13000, 4000, { clip: .5, reverb: .03 }),
  openHat909: hit('machines', '909-open-hat', .2, .25, 12000, 3000, { clip: .8, reverb: .05 }),
  ride909: hit('machines', '909-ride', .16, .3, 12000, 2500, { reverb: .06 }),
  crash909: hit('machines', '909-crash', .14, 1, 11000, 800, { clip: 1, reverb: .14 }),
  tom909: hit('machines', '909-tom', .16, .3, 5000, 60, { reverb: .08 }),
  metal: hit('electronic', 'metal-hit', .16, .2, 9000, 400, { reverb: .12 }),
  hey: hit('electronic', 'hey', .18, .3, 9000, 200, { clip: .9, reverb: .1 }),
  whistle: hit('electronic', 'whistle', .1, .3, 9000, 800, { clip: .9, reverb: .14 }),
  pad: tone('synths', 'analog-pad', 3, .035, [.6, .6, .85, .9], 3200, 150, { reverb: .2, design: { role: 'pad' } }),
  choir: tone('synths', 'choir', 3, .05, [.3, .5, .85, .7], 4000, 150, { reverb: .22, design: { role: 'pad' } }),
  rhodes: tone('keys', 'rhodes', 3, .1, [.003, .4, .3, .25], 4200, 180, { reverb: .14 }),
  fmBell: tone('synths', 'fm-bell', 4, .11, [.002, .4, .2, .25], 7000, 300, { reverb: .16 }),
  subBass: tone('synths', 'sub', 2, .2, [.004, .3, .6, .12], 900, 30, { reverb: .02, design: { role: 'bass' } }),
  acid: tone('synths', 'acid', 2, .1, [.003, .2, .4, .08], 2400, 40, { reverb: .04, design: { role: 'bass' } }),
  pluck: tone('synths', 'digital-pluck', 4, .1, [.002, .25, .1, .15], 7000, 300, { reverb: .14 }),
  wavetable: tone('synths', 'wavetable', 4, .08, [.004, .3, .5, .15], 6000, 250, { reverb: .14, design: { role: 'lead' } }),
  raveStab: tone('electronic', 'rave-stab', 3, .14, [.002, .25, .1, .12], 7000, 250, { reverb: .12 }),
  hoover: tone('electronic', 'hoover', 3, .1, [.01, .4, .6, .2], 6000, 200, { reverb: .12, design: { role: 'lead' } }),
  chant: tone('electronic', 'oh-chant', 4, .3, [.01, .3, .6, .15], 6000, 150, { reverb: .12, design: { role: 'lead' } }),
  // a hand drum that speaks: pitched, written with slides
  talking: tone('world', 'conga', 3, .4, [.002, .22, .1, .12], 3800, 90, { design: { role: 'lead' } }),
  // strings and winds
  bass: tone('guitars', 'bass', 2, .46, [.005, .4, .4, .14], 1700, 35, { reverb: .05, design: { role: 'bass' } }),
  guitar: tone('guitars', 'clean', 3, .46, [.003, .3, .2, .1], 5200, 200, { reverb: .1 }),
  leadGuitar: tone('guitars', 'clean', 4, .9, [.003, .4, .3, .16], 6500, 260, { reverb: .16, design: { role: 'lead' } }),
  muted: tone('guitars', 'muted', 3, .5, [.003, .2, .15, .08], 4200, 200, { reverb: .1 }),
  nylon: tone('guitars', 'nylon', 3, .3, [.003, .5, .2, .2], 5000, 110, { reverb: .14 }),
  steel: tone('strings', 'steel', 3, .3, [.003, .5, .2, .2], 6000, 120, { reverb: .14 }),
  sax: tone('band', 'tenor-sax', 3, .32, [.012, .3, .66, .12], 6000, 120, { variant: 1, reverb: .16, design: { role: 'lead', vibrato: 5, vibratoDepth: .06 } }),
  trumpet: tone('sambaReggae', 'trompete', 4, .54, [.006, .3, .6, .1], 7000, 200, { reverb: .16, design: { role: 'lead' } }),
  trombone: tone('sambaReggae', 'trombone', 3, .44, [.006, .3, .5, .1], 4500, 80, { reverb: .16 }),
  organ: tone('keys', 'organ', 4, .22, [.01, .3, .7, .12], 4200, 200, { reverb: .14 }),
  piano: tone('band', 'piano', 3, .3, [.003, .8, .3, .3], 6000, 80, { variant: 1, reverb: .12 }),
  marimba: tone('band', 'marimba', 4, .6, [.002, .5, .1, .3], 7000, 150, { variant: 1, reverb: .14 }),
  accordion: tone('keys', 'accordion', 4, .2, [.02, .3, .8, .12], 5000, 160, { reverb: .12 }),
  violin: tone('classical', 'violin-sustain', 4, .5, [.03, .3, .8, .16], 6500, 200, { reverb: .16, design: { role: 'lead', vibrato: 5.5, vibratoDepth: .08 } }),
  violinForte: tone('classical', 'violin-sustain', 4, .6, [.03, .3, .8, .16], 6500, 200, { variant: 1, reverb: .16, design: { role: 'lead', vibrato: 5.5, vibratoDepth: .08 } }),
  cello: tone('classical', 'cello-sustain', 2, .5, [.04, .3, .8, .2], 3500, 60, { reverb: .16 }),
  flute: tone('classical', 'flute-sustain', 4, .5, [.03, .3, .8, .14], 7000, 300, { reverb: .18, design: { role: 'lead', vibrato: 5, vibratoDepth: .05 } }),
  clarinet: tone('classical', 'orchestra-clarinet', 4, .7, [.02, .3, .8, .12], 6000, 200, { reverb: .16, design: { role: 'lead', vibrato: 5, vibratoDepth: .05 } }),
  oboe: tone('classical', 'orchestra-oboe', 4, .6, [.02, .3, .8, .12], 6000, 250, { reverb: .16, design: { role: 'lead', vibrato: 5, vibratoDepth: .05 } }),
  harpsichord: tone('classical', 'harpsichord', 4, .3, [.002, .5, .1, .25], 8000, 200, { reverb: .16 }),
  viola: tone('classical', 'viola-sustain', 3, .4, [.05, .3, .85, .25], 4500, 120, { reverb: .18, design: { role: 'pad' } }),
  pizzicato: tone('classical', 'violin-pizzicato', 4, .3, [.002, .3, .05, .15], 7000, 200, { reverb: .14 }),
  recorder: tone('classical', 'alto-recorder-sustain', 4, .4, [.02, .3, .8, .12], 7000, 300, { reverb: .18, design: { role: 'lead' } }),
  horn: tone('classical', 'horn-sustain', 3, .4, [.03, .3, .8, .16], 3500, 100, { reverb: .18 }),
  timpani: hit('classical', 'timpani-low', .3, .6, 2400, 40, { clip: 1, reverb: .14 }),
  worldFlute: tone('world', 'flute', 4, .3, [.03, .3, .8, .14], 7000, 300, { reverb: .2, design: { role: 'lead', vibrato: 5, vibratoDepth: .05 } }),
  worldGuitar: tone('world', 'guitar', 3, .3, [.003, .5, .2, .2], 5000, 110, { reverb: .14 }),
  voice: tone('brasil', 'coro-laia', 3, .42, [.03, .3, .8, .18], 5200, 140, { reverb: .16, design: { role: 'lead', vibrato: 5, vibratoDepth: .05 } }),
  // Further regional voices (the gains are starting points; each kit is measured afterwards).
  zabumba: hit('brasil', 'zabumba', .33, .35, 3200, 32, { clip: .9, reverb: .06 }),
  gongue: hit('brasil', 'gongue', .2, .25, 7500, 400, { clip: .7, reverb: .1 }),
  pandeiro: hit('brasil', 'pandeiro-grave', .34, .25, 3200, 60, { reverb: .08 }),
  surdo: hit('sambaReggae', 'surdo-fundo', .3, .5, 2600, 30, { clip: 1, reverb: .08 }),
  repique: hit('sambaReggae', 'repinique', .24, .14, 7500, 200, { clip: .7, reverb: .09 }),
  tamTam: hit('classical', 'concert-tam-tam', .3, 2, 5000, 40, { clip: 1, reverb: .22 }),
  cavaquinho: tone('brasil', 'cavaquinho', 3, .2, [.002, .25, .1, .1], 5500, 300, { reverb: .1 }),
  bandolim: tone('brasil', 'bandolim', 4, .7, [.003, .5, .2, .25], 5200, 200, { reverb: .16 }),
  celesta: tone('keys', 'celesta', 4, .3, [.002, .6, .1, .4], 8000, 300, { reverb: .18 }),
  slide: tone('strings', 'slide-electric', 4, .4, [.02, .5, .7, .3], 5000, 200, { reverb: .2, design: { role: 'lead', vibrato: 5, vibratoDepth: .08 } }),
  bassoon: tone('classical', 'orchestra-bassoon', 2, .5, [.04, .3, .85, .2], 1800, 40, { reverb: .12 }),
}
// A part from a calibrated voice: Q('a2', 'Kick', 'rhythm', 'pulse', V.kick({ gain: .36 }), rolls, on(...)).
const Q = (slot, name, role, behavior, sound, rolls, sections, extra = {}) => P(slot, name, role, behavior, sound.source, rolls, sections, { ...sound.opts, ...extra })

module.exports = { composer, studio, build, reactions, SAMPLE, DRUM, METERS, P, Q, V, voice, presence, random }
