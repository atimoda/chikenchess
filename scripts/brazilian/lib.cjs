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
}
const SCALES = {
  'Maior': [0, 2, 4, 5, 7, 9, 11], 'Dórica': [0, 2, 3, 5, 7, 9, 10], 'Mixolídia': [0, 2, 4, 5, 7, 9, 10],
  'Menor natural': [0, 2, 3, 5, 7, 8, 10], 'Harmônica menor': [0, 2, 3, 5, 7, 8, 11],
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
  const tick = M.ternary ? 1 / 192 : 1 / 128
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
  function mel(text, { unit = M.ternary ? M.eighth : M.sixteenth, gate = .92, accent = {}, start = 0 } = {}) {
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
  /** Drum grid: one character per unit (default: the sixteenth; the eighth in 6/8); bars separated by "|".
   * X x m o h g (loud to ghost) · ? and , (hits that only sometimes play) · r R (ratchets) · . rest. */
  function hits(text, { unit = M.ternary ? M.eighth : M.sixteenth, length = unit * .5, degree = 0, start = 0, extra = {} } = {}) {
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
  return { M, meter, tick, semitone, mel, rep, hits, comp, line, phrase, named, relative, strum, portamento, feel, tone, swell, only, without, shift, up, vel, set, roll, weight }
}

/** Snaps every note to the grid, keeps it inside its roll and rounds the dynamics to steps of .04
 * (each distinct velocity compiles as its own lane). */
function snap(rollValue, ternary) {
  const startGrid = ternary ? 192 : 128, lengthGrid = ternary ? 192 : 64, minimum = ternary ? 3 / 192 : 1 / 64
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
      try { return snap(structuredClone(r), ternary) } catch (error) { throw new Error(`${part.name} bank ${bank}: ${error.message}`) }
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

/** Shorthand for a part and for the presence list of the sections it plays. */
const P = (slot, name, role, behavior, source, rolls, sections, opts = {}) => ({ slot, name, role, behavior, source, rolls, sections, ...opts })
const presence = form => (...indices) => form.map((_, i) => indices.includes(i) || null)

module.exports = { composer, build, reactions, SAMPLE, DRUM, METERS, P, presence, random }
