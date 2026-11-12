// Shared helpers of the Blues, Jazz & Rock kits (scripts/blues-jazz-rock/<id>.cjs), on top of the
// World ballads composer (scripts/ballads/lib.cjs). Kits in the Chromatic scale write every pitch as
// semitones above the key's root; chord symbols turn into voicings and walking lines here.
const lib = require('../ballads/lib.cjs')

const PITCH = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const QUALITY = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14], m9: [0, 3, 7, 10, 14], '7b9': [0, 4, 7, 10, 13], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], 69: [0, 4, 7, 9, 14],
  sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], add9: [0, 4, 7, 14], 5: [0, 7],
}

/** "Dm7" in the key of `key` → { root: semitones above the key (0–11), tones: intervals }. */
function chord(symbol, key) {
  const match = /^([A-G][#b]?)(.*)$/.exec(symbol)
  if (!match || !(match[2] in QUALITY)) throw new Error(`chord ${symbol}`)
  return { root: (PITCH[match[1]] - PITCH[key] + 12) % 12, tones: QUALITY[match[2]], symbol }
}

/**
 * Close voicings that move as little as possible from one chord to the next, kept around `center`
 * (semitones above the key root at the instrument's octave). `drop` leaves out the root (rootless
 * jazz voicings over a bass player); `size` keeps the top notes.
 */
function voiceLead(symbols, key, { center = 7, size = 4, drop = false } = {}) {
  let previous
  return symbols.map(symbol => {
    const { root, tones } = chord(symbol, key)
    let pitches = tones.map(t => root + t)
    if (drop && pitches.length > 3) pitches = pitches.slice(1)
    pitches = pitches.slice(-size)
    const options = []
    for (let inversion = 0; inversion < pitches.length; inversion++) {
      const rotated = [...pitches.slice(inversion), ...pitches.slice(0, inversion).map(p => p + 12)]
      for (const octave of [-24, -12, 0, 12]) options.push(rotated.map(p => p + octave))
    }
    const mean = notes => notes.reduce((a, b) => a + b, 0) / notes.length
    const cost = notes => (previous ? notes.reduce((sum, n, i) => sum + Math.abs(n - (previous[i] ?? previous.at(-1))), 0) : 0) + 1.5 * Math.abs(mean(notes) - center)
    previous = options.reduce((best, option) => cost(option) < cost(best) ? option : best)
    return previous
  })
}

/**
 * A walking bass: one note per beat, the root on beat one, chord tones in between and a chromatic or
 * scale approach into the next bar's root. `low`/`high` keep it in the instrument's register.
 */
function walking(symbols, key, { beats = 4, low = -5, high = 12, seed = 7 } = {}) {
  let x = seed
  const random = () => { x = (x * 16807) % 2147483647; return x / 2147483647 }
  const fit = (pitch, near) => { let p = pitch; while (p - near > 6) p -= 12; while (near - p > 6) p += 12; while (p < low) p += 12; while (p > high) p -= 12; return p }
  const lines = []
  let last = 0
  symbols.forEach((symbol, bar) => {
    const { root, tones } = chord(symbol, key), next = chord(symbols[(bar + 1) % symbols.length], key)
    const line = [fit(root, last)]
    for (let beat = 1; beat < beats; beat++) {
      if (beat === beats - 1) {
        const target = fit(next.root, line.at(-1))
        line.push(random() < .6 ? target + (target > line.at(-1) ? -1 : 1) : target + (random() < .5 ? -2 : 2))
      } else {
        const tone = tones[1 + Math.floor(random() * (tones.length - 1))]
        line.push(fit(root + tone, line.at(-1)))
      }
    }
    last = line.at(-1)
    lines.push(line)
  })
  return lines
}

/** Bar roots (Kit Harmony, one per bar) from a list of chord symbols with `perBar` chords per bar. */
const roots = (symbols, key, perBar = 1) => symbols.filter((_, i) => i % perBar === 0).map(symbol => chord(symbol, key).root)

/**
 * Notes on chords: `voicings` (one per chord symbol, `perBar` per bar) played on the rhythm of each bar,
 * given in beats as [beat, length, velocity, extra?] (or a function of the bar index returning it).
 * Swing comes from the composer `C`, so a hit on beat 1.5 lands on the swung off-beat; `straight`
 * keeps the times as written (triplets).
 */
function onChords(C, voicings, rhythm, { perBar = 1, gate = .9, extra = {}, straight = false } = {}) {
  const bars = voicings.length / perBar, notes = [], beat = C.M.beat
  for (let bar = 0; bar < bars; bar++) {
    for (const [at, length, velocity, more] of (typeof rhythm === 'function' ? rhythm(bar) : rhythm)) {
      const half = Math.min(perBar - 1, Math.floor(at * beat * perBar + 1e-9))
      const start = bar + C.warp(at * beat, straight), end = bar + C.warp(Math.min(1, (at + length) * beat), straight)
      for (const degree of voicings[bar * perBar + half]) notes.push({ start, duration: Math.max(1 / 64, (end - start) * gate), degree, velocity, ...extra, ...more })
    }
  }
  return notes
}

/** One note per beat from walking() lines, the downbeat a little stronger. */
function walkNotes(C, lines, { gate = .85, velocity = .78 } = {}) {
  return lines.flatMap((line, bar) => line.map((degree, beat) => {
    const start = bar + C.warp(beat * C.M.beat)
    return { start, duration: C.M.beat * gate, degree, velocity: beat === 0 ? Math.min(1, velocity + .08) : beat % 2 ? velocity - .04 : velocity }
  }))
}

/** Text bar for mel(): pitches (or chords as arrays) of equal length `units`, with optional marks. */
const bar = (pitches, units = 2, marks = '') => pitches.map(p => `${Array.isArray(p) ? p.join(',') : p}:${units}${marks}`).join(' ')

const P = (slot, name, role, behavior, source, rolls, sections, opts = {}) => ({ slot, name, role, behavior, source, rolls, sections, ...opts })

/** Keeps each part only in the sections whose bank it actually plays. */
function present(parts, form) {
  for (const part of parts) part.sections = part.sections.map((on, i) => on && part.rolls[form[i].bank] ? true : null)
  return parts
}

// Drum mix shared by the kits: role 'drums' so reactions on the kit's drums reach every one of them.
const DRUM = { attack: .001, sustain: 0, octave: 2, design: { role: 'drums' } }
// Chromatic kits do not move pitch when a piece changes file: a semitone shift would leave the key.
const FIXED = { fileDegrees: 0, rankDegrees: 0 }

module.exports = { ...lib, chord, voiceLead, walking, roots, onChords, walkNotes, bar, P, present, DRUM, FIXED }
