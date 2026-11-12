// Shared composer for the World ballads campaign kits (scripts/ballads/<city>.cjs).
// Same pipeline as scripts/build-tango-kit.cjs: rolls written note by note, Kit Harmony per bar,
// per-section sound (Section scope), per-note sound, fills, sound design and the kit's own reactions.
// Time is in bars. Every start and length is snapped to a small grid (binary meters: starts 1/128,
// lengths 1/64; compound meters: 1/192) because Strudel keeps time as exact fractions and decimal
// leftovers turn into huge fractions that freeze compilation (see docs/mechanics/kit-tango.md).
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../../tests/helpers/music.cjs')

const root = path.resolve(__dirname, '../..')
const METERS = {
  '4/4': { beat: 1 / 4, eighth: 1 / 8, sixteenth: 1 / 16, beats: 4, ternary: false, res: 16 },
  '6/8': { beat: 1 / 2, eighth: 1 / 6, sixteenth: 1 / 12, beats: 2, ternary: true, res: 12 },
  '12/8': { beat: 1 / 4, eighth: 1 / 12, sixteenth: 1 / 24, beats: 4, ternary: true, res: 24 },
  // Simple meters with swung eighths or triplets snap to 48 ticks per beat (song.grid = beats * 48).
  '3/4': { beat: 1 / 3, eighth: 1 / 6, sixteenth: 1 / 12, beats: 3, ternary: false, res: 12 },
  '5/4': { beat: 1 / 5, eighth: 1 / 10, sixteenth: 1 / 20, beats: 5, ternary: false, res: 20 },
  '7/4': { beat: 1 / 7, eighth: 1 / 14, sixteenth: 1 / 28, beats: 7, ternary: false, res: 28 },
}
const SCALES = { 'Maior': [0, 2, 4, 5, 7, 9, 11], 'Dórica': [0, 2, 3, 5, 7, 9, 10], 'Mixolídia': [0, 2, 4, 5, 7, 9, 10], 'Menor natural': [0, 2, 3, 5, 7, 8, 10], 'Harmônica menor': [0, 2, 3, 5, 7, 8, 11], 'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }

/**
 * `swing` (0.5 straight … 0.67 triplet feel) moves every off-beat eighth of a simple meter later and
 * stretches the sixteenths with it, for melodies and drum grids alike; the song then needs a grid of
 * 48 ticks per beat (build({ grid })).
 */
function composer(meter, scale, { swing = .5 } = {}) {
  const M = METERS[meter], steps = SCALES[scale]
  if (!M || !steps) throw new Error(`meter/scale ${meter} ${scale}`)
  const size = steps.length, semitone = degree => 12 * Math.floor(degree / size) + steps[((degree % size) + size) % size]
  const near = (a, b) => Math.abs(a - b) < 1e-6
  /** Bar time → swung bar time (identity when straight). */
  function warp(at, straight = false) {
    if (straight || swing === .5 || M.ternary) return at
    const beatIndex = Math.floor(at / M.beat + 1e-9), inBeat = at - beatIndex * M.beat, half = M.beat / 2
    const moved = inBeat <= half ? inBeat / half * swing * M.beat : swing * M.beat + (inBeat - half) / half * (1 - swing) * M.beat
    return beatIndex * M.beat + moved
  }

  /** Velocity by position: downbeat, beats, the rest. */
  function weight(at, { strong = 1, beat = .82, off = .66 } = {}) {
    const inBar = at - Math.floor(at + 1e-9)
    if (near(inBar, 0)) return strong
    if (near(inBar / M.beat, Math.round(inBar / M.beat))) return meter === '4/4' && near(inBar, .5) ? (strong + beat) / 2 : beat
    return off
  }

  /**
   * Bars separated by "|"; tokens "degree:length" (or "0,2,4:length" for chords, "r:length" for rests).
   * Length counts `unit`s (default: the eighth of the meter). Marks after the length:
   * ~ vibrato · ! accent · ' soft · ? chance .7 (?? .45) · ^n slide n semitones into the note ·
   * > delay · * ring (release + reverb) · # drive · xN ratchet · s staccato · pN pan N/10 · cN cutoff.
   */
  function mel(text, { unit = M.eighth, gate = .92, accent = {}, start = 0, straight = false } = {}) {
    const notes = []
    text.split('|').forEach((barText, bar) => {
      let cursor = 0
      for (const token of barText.trim().split(/\s+/).filter(Boolean)) {
        const match = /^(r|-?\d+(?:,-?\d+)*):(\d+(?:\.\d+)?)(.*)$/.exec(token)
        if (!match) throw new Error(`token ${token}`)
        const length = Number(match[2]) * unit
        if (cursor > 1 - 1e-9) throw new Error(`bar ${bar + 1} overflows at ${token}: ${text.slice(0, 60)}`)
        if (match[1] !== 'r') {
          const at = start + bar + warp(cursor, straight)
          const extra = { velocity: weight(start + bar + cursor, accent) }
          let duration = (warp(Math.min(1, cursor + length), straight) - warp(cursor, straight)) * gate, mods = match[3]
          while (mods) {
            let m
            if ((m = /^\^(-?\d+)/.exec(mods))) { extra.slide = Number(m[1]); extra.slideSeconds = .08 }
            else if ((m = /^x(\d)/.exec(mods))) extra.ratchet = Number(m[1])
            else if ((m = /^p(\d)/.exec(mods))) extra.pan = Number(m[1]) / 10
            else if ((m = /^c(-?\d)/.exec(mods))) extra.cutoff = Number(m[1]) / 10
            else if ((m = /^\?\?/.exec(mods))) extra.chance = .45
            else if ((m = /^[~!'?>*#s]/.exec(mods))) {
              const c = m[0]
              if (c === '~') extra.vibrato = true
              if (c === '!') extra.velocity = 1
              if (c === "'") extra.velocity = Math.round(extra.velocity * .7 * 100) / 100
              if (c === '?') extra.chance = .7
              if (c === '>') extra.delay = .32
              if (c === '*') Object.assign(extra, { release: .8, reverb: .42 })
              if (c === '#') extra.drive = 1.3
              if (c === 's') duration = duration / gate * .5
            } else throw new Error(`mark ${mods} in ${token}`)
            mods = mods.slice(m[0].length)
          }
          for (const degree of match[1].split(',').map(Number)) notes.push({ start: at, duration, degree, ...extra })
        }
        cursor += length
      }
    })
    return notes
  }
  /** Repeats bar text n times. */
  const rep = (text, n) => Array.from({ length: n }, () => text).join(' | ')
  /** Drum grid: one character per unit; bars separated by "|". X x o g (ghost) ? (chance) r R (ratchets) . rest. */
  function hits(text, { unit = M.eighth, length = unit * .5, degree = 0, start = 0, extra = {}, straight = false } = {}) {
    const notes = [], V = { X: 1, x: .82, o: .62, g: .36, '?': .6, r: .78, R: .82, h: .5 }
    text.split('|').forEach((barText, bar) => {
      [...barText.replace(/\s+/g, '')].forEach((c, i) => {
        if (c === '.' || c === '-') return
        if (!(c in V)) throw new Error(`hit ${c}`)
        const n = { start: start + bar + warp(i * unit, straight), duration: length, degree, velocity: V[c], ...extra }
        if (c === '?') n.chance = .5
        if (c === 'r') n.ratchet = 2
        if (c === 'R') n.ratchet = 3
        notes.push(n)
      })
    })
    return notes
  }
  /** Absolute scale degrees become chord-relative: Kit Harmony adds each bar's root back. */
  const relative = (notes, harmony, from = 0) => notes.map(n => ({ ...n, degree: n.degree - harmony[(Math.floor(n.start + 1e-6) + from) % harmony.length] }))
  /** Spreads simultaneous chord notes like a strum (down: low to high). */
  function strum(notes, spread = M.ternary ? 1 / 192 : 1 / 128, up = false) {
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
  const shift = (notes, bars) => notes.map(n => ({ ...n, start: n.start + bars }))
  const up = (notes, degrees) => notes.map(n => ({ ...n, degree: n.degree + degrees }))
  const vel = (notes, factor) => notes.map(n => ({ ...n, velocity: Math.round(Math.min(1, Math.max(.15, n.velocity * factor)) * 100) / 100 }))
  const set = (notes, extra) => notes.map(n => ({ ...n, ...extra }))
  /** Deterministic human touch: velocity spread (±amount) and optional timing push in bars (+ is late). */
  function human(notes, amount = .06, late = 0, seed = 1) {
    let x = seed * 9301 + 49297
    const next = () => { x = (x * 9301 + 49297) % 233280; return x / 233280 - .5 }
    return notes.map(n => ({ ...n, start: Math.max(0, n.start + late), velocity: Math.round(Math.min(1, Math.max(.12, n.velocity * (1 + 2 * amount * next()))) * 100) / 100 }))
  }
  const roll = (bars, ...groups) => ({ bars, notes: groups.flat().filter(n => n.start < bars - 1e-9).map(n => ({ ...n, duration: Math.min(n.duration, bars - n.start) })) })
  return { M, meter, semitone, mel, rep, hits, relative, strum, portamento, shift, up, vel, set, roll, weight, warp, human }
}

/** Snaps every note to the grid, keeps it inside its roll and drops what falls outside. */
function snap(rollValue, ternary, grid) {
  const startGrid = grid ?? (ternary ? 192 : 128), lengthGrid = grid ?? (ternary ? 192 : 64), minimum = grid ? 3 / grid : ternary ? 3 / 192 : 1 / 64
  rollValue.notes = rollValue.notes.map(n => {
    const start = Math.min(rollValue.bars - minimum, Math.round(n.start * startGrid) / startGrid)
    const duration = Math.min(rollValue.bars - start, Math.max(minimum, Math.round(n.duration * lengthGrid) / lengthGrid))
    const clean = { ...n, start, duration, velocity: Math.round(n.velocity * 100) / 100 }
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
  // "0?0" marks where a note ends; dense rolls leave it out so the text roll stays within 256 notes.
  const notes = cells.filter(c => c.length).reduce((n, c) => n + new Set(c).size, 0)
  const marks = notes + ends.size <= 250
  return cells.map((degrees, i) => degrees.length ? [...new Set(degrees)].join(',') + '_' : marks && ends.has(i) ? '0?0' : '.').join(' ')
}

const SAMPLE = (bank, asset, variant = 0, pitched = true) => ({ kind: 'sample', bank, asset, variant, pitched })
const WHITE = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2']

/**
 * Builds the official kit (and, unless `profile: false`, the text profile) of one stage.
 * `form`: [{ label, bars, bank, harmony, transpose? }]; bank indices are global (0–7) so that
 * reactions changing the variation mean the same material for every instrument.
 * Each part: { slot, rolls: { [bank]: roll }, sections: (true|null)[] (presence per section), fills: { [section]: bank }, params: { [section]: {...} } }.
 */
async function build(song) {
  const { id, form, parts, ternary } = song
  const { cities } = loadTs('lib/cities-data.ts')
  const { createStyledCityKit, CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
  const { styleProfileSchema, validateOfficialKit } = loadTs('lib/admin/validation.ts')
  const { kitReactionsSchema } = loadTs('lib/music/reactions.ts')
  if (parts.map(p => p.slot).join() !== WHITE.join()) throw new Error('Parts must follow the white slots a1…h2')
  const bankCount = Math.max(...form.map(s => s.bank), ...parts.flatMap(p => Object.values(p.fills ?? {}))) + 1
  if (bankCount > 8) throw new Error('At most 8 banks')
  const bankBars = Array.from({ length: bankCount }, (_, bank) => form.find(s => s.bank === bank)?.bars ?? 1)
  for (const part of parts) {
    if (part.sections.length !== form.length) throw new Error(`${part.name}: one presence per section`)
    part.bankRolls = Array.from({ length: bankCount }, (_, bank) => {
      // A bank may be given as a plain note list: it fills the section's length (notes past it are cut).
      const given = part.rolls[bank], bars = bankBars[bank]
      const r = !given ? { bars, notes: [] } : Array.isArray(given) ? { bars, notes: given.filter(n => n.start < bars - 1e-9).map(n => ({ ...n, duration: Math.min(n.duration, bars - n.start) })) } : given
      if (r.bars !== bankBars[bank]) throw new Error(`${part.name} bank ${bank}: ${r.bars} bars, expected ${bankBars[bank]}`)
      return snap(structuredClone(r), ternary, song.grid)
    })
    form.forEach((section, index) => {
      if (part.sections[index] && !part.rolls[section.bank]) throw new Error(`${part.name}: section ${index} plays an empty bank ${section.bank}`)
    })
  }
  const reactions = kitReactionsSchema.parse(song.reactions)
  const res = METERS[song.meter].res
  const profile = {
    name: song.profileName, bpm: song.bpm, meter: song.meter, root: song.root, scale: song.scale, harmony: 'kit', swing: 0,
    sections: form.map(s => s.bars * METERS[song.meter].beats), sectionLabels: form.map(s => s.label), harmonicSequences: form.map(s => s.harmony),
    reactions, reference: song.reference, url: song.url,
    parts: parts.map(part => ({
      role: part.role, name: part.name, behavior: part.behavior, source: part.source,
      patterns: part.bankRolls.map(r => pattern(r, res)), bars: part.bankRolls.map(r => r.bars), octave: part.octave, gain: part.gain,
      attack: part.attack, decay: part.decay, sustain: part.sustain, release: part.release, clip: part.clip, lpf: part.lpf, hpf: part.hpf,
      ...(part.lpfRange ? { lpfRange: part.lpfRange } : {}), ...(part.reverbRange ? { reverbRange: part.reverbRange } : {}), ...(part.driveRange ? { driveRange: part.driveRange } : {}),
      arrangement: { restart: true, active: part.sections.map(Boolean), variations: form.map(s => s.bank), transpose: form.map(s => s.transpose ?? 0),
        ...(part.fills ? { fills: form.map((_, index) => part.fills[index] ?? null) } : {}) },
      effects: part.effects ?? {}, ...(part.design ? { design: part.design } : {}), ...(part.mapping ? { mapping: part.mapping } : {}),
    })),
  }
  // Sources for the profile schema use the short bank names.
  const SHORT = { 'chicken-classical-v1': 'classical', 'chicken-band-v1': 'band', 'chicken-percussion-v1': 'percussion', 'chicken-guitars-v1': 'guitars', 'chicken-amps-v1': 'amps', 'chicken-voices-v1': 'voices', 'chicken-keys-v1': 'keys', 'chicken-drums-v1': 'drums', 'chicken-machines-v1': 'machines', 'chicken-brasil-v1': 'brasil', 'chicken-electronic-v1': 'electronic', 'chicken-strings-v1': 'strings', 'chicken-jazz-v1': 'jazz', 'chicken-synths-v1': 'synths', 'chicken-world-v1': 'world' }
  for (const part of profile.parts) part.source = { ...part.source, bank: SHORT[part.source.bank] ?? part.source.bank }
  styleProfileSchema.parse(profile)
  if (song.writeProfile !== false) fs.writeFileSync(path.join(root, 'data/music/profiles', `${id}.json`), `${JSON.stringify(profile, null, 2)}\n`)
  const city = cities.find(c => c.id === id)
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
  console.log(`Wrote ${saved.path} (${saved.revision}): ${form.length} sections, ${form.reduce((n, s) => n + s.bars, 0)} bars, ${notes} notes per team`)
}

/** Reactions in the same spirit as the Tango's, with each stage's own sections. */
function reactions(prefix, { lift, contrast, lament, calm, finale, climax, solo }) {
  const rule = (rid, trigger, target, duration, quantize, actions, instruments) => ({ id: `${prefix}-${rid}`, trigger, enabled: true, quantize, target, duration, actions, ...(instruments ? { instruments } : {}) })
  const action = (type, value = 0, extra = {}) => ({ type, value, ...extra })
  return {
    overrides: ['opening', 'middle', 'endgame', 'check', 'capture', 'queenCapture', 'firstCastle', 'quiet', 'tension', 'captureDrought', 'promotion', 'evalSwing', 'minimumBoth', 'mate'],
    rules: [
      // The "old record" filter lives in each Intro's section params, not here: a filter rule would hold
      // for the first 20 plies and override the low-pass the player sets in Piece Parameters.
      rule('opening', 'opening', 'both', 1, true, [action('gain', -4)]),
      rule('middle', 'middle', 'both', 1, true, [action('bpm', 2, { rampBars: 8 }), action('gain', 2)]),
      rule('endgame', 'endgame', 'both', 1, true, [action('bpm', 3, { rampBars: 8 }), action('variation', solo), action('gain', 4)], 'lead'),
      rule('check', 'check', 'actor', 1, false, [action('activate'), action('variation', contrast), action('gain', 4)]),
      rule('capture', 'capture', 'actor', 1, false, [action('gain', 5)], 'drums'),
      rule('queen-capture', 'queenCapture', 'both', 2, true, [action('variation', lament), action('lpf', 2400, { rampBars: 2 }), action('reverb', .45)]),
      rule('first-castle', 'firstCastle', 'both', 4, true, [action('relative')]),
      rule('quiet', 'quiet', 'both', 2, true, [action('variation', calm), action('gain', -5, { rampBars: 2 }), action('lpf', 3000, { rampBars: 2 })]),
      rule('tension', 'tension', 'both', 1, true, [action('lpf', 2000, { rampBars: 8 }), action('resonance', 8), action('gain', -2, { rampBars: 4 })], 'lead'),
      rule('capture-drought', 'captureDrought', 'both', 1, true, [action('reverb', .5), action('delay', .3), action('gain', -3, { rampBars: 4 })], 'lead'),
      rule('promotion', 'promotion', 'both', 2, true, [action('transpose', lift)]),
      rule('eval-swing', 'evalSwing', 'actor', 2, false, [action('variation', contrast), action('gain', 5)]),
      rule('minimum-both', 'minimumBoth', 'both', 0, true, [action('bpm', 3, { rampBars: 8 }), action('variation', climax), action('gain', 6)]),
      rule('mate', 'mate', 'both', 0, true, [action('variation', finale), action('reverb', .5)]),
    ],
  }
}

module.exports = { composer, build, reactions, SAMPLE, METERS }
