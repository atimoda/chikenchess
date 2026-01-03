import type { Chess, PieceSymbol, Square } from "chess.js"
import type { CityData } from "./cities-data"
import { type ParsedPattern, noteToFrequency } from "./audio-engine"

interface PiecePosition {
  type: PieceSymbol
  color: "w" | "b"
  square: Square
  file: number // 0-7 (a-h)
  rank: number // 0-7 (1-8)
}

// Generate both the display pattern (Strudel-like code) and the parsed pattern for audio
export function generateStrudelPattern(game: Chess, city: CityData, activeSquares: Set<string>): string {
  // We reuse the logic from parsePatternForAudio to ensure what you see is what you hear
  // However, since parsePattern return frequencies, we need to map back to note names or just use frequencies
  // Ideally we would refactor to share the logic source. 
  // For now, let's replicate the structure but output string notation.

  const board = game.board()
  const pieces: PiecePosition[] = []

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file]
      if (piece) {
        const square = `${files[file]}${8 - rank}` as Square
        if (activeSquares.has(square)) {
          pieces.push({
            type: piece.type,
            color: piece.color,
            square: square,
            file,
            rank: 7 - rank,
          })
        }
      }
    }
  }

  const pawns = pieces.filter((p) => p.type === "p")
  const knights = pieces.filter((p) => p.type === "n")
  const bishops = pieces.filter((p) => p.type === "b")
  const rooks = pieces.filter((p) => p.type === "r")
  const queens = pieces.filter((p) => p.type === "q")

  const whitePawns = pawns.filter((p) => p.color === "w")
  const blackPawns = pawns.filter((p) => p.color === "b")

  const layers: string[] = []

  // Header (Safe ASCII)
  layers.push(`// =======================================`)
  layers.push(`// ${city.name.toUpperCase()} - ${city.genre}`)
  layers.push(`// =======================================`)
  layers.push(``)
  layers.push(`setcps(${(city.bpm / 60 / 2).toFixed(3)})`)
  layers.push(``)
  layers.push(`stack(`)

  // 1. KICK (Pawns)
  if (whitePawns.length > 0) {
    const pattern = new Array(16).fill(0)
    // Base House
    pattern[0] = 1; pattern[4] = 1; pattern[8] = 1; pattern[12] = 1;
    // Variations
    whitePawns.forEach(p => {
      if (p.file < 4 && p.rank > 2) {
        const step = (p.file * 4 + 2) % 16
        pattern[step] = 1
      }
    })

    // Convert to hex-string or mini-notation
    const str = patternToMini(pattern)
    layers.push(`  // Kick`)
    layers.push(`  s("${city.samples.kick}")`)
    layers.push(`    .struct("${str}")`)
    layers.push(`    .gain(0.8),`)
  }

  // 2. SNARE
  if (whitePawns.some(p => p.file >= 4)) {
    const pattern = new Array(16).fill(0)
    pattern[4] = 1; pattern[12] = 1;
    whitePawns.forEach(p => {
      if (p.file >= 4 && p.rank > 3) {
        const step = (p.file * 3 + 15) % 16
        pattern[step] = 1
      }
    })
    layers.push(`  // Snare`)
    layers.push(`  s("${city.samples.snare}")`)
    layers.push(`    .struct("${patternToMini(pattern)}")`)
    layers.push(`    .gain(0.7),`)
  }

  const inCheck = game.isCheck()

  // 3. HIHAT (Black Pawns)
  if (blackPawns.length > 0) {
    const pattern = new Array(16).fill(0)
    blackPawns.forEach((p) => {
      const baseStep = (p.file * 2) % 16
      pattern[baseStep] = 1
      if (p.rank < 5) pattern[(baseStep + 1) % 16] = 1
    })
    layers.push(`  // Hihat (Probabilistic 80%)`)
    layers.push(`  s("${city.samples.hihat}")`)
    layers.push(`    .struct("${patternToMini(pattern)}")`)
    layers.push(`    .gain(0.4 * "0.8?"),`) // Strudel probability notation
  }

  // 4. BASS (Knights)
  if (knights.length > 0) {
    const notes = new Array(16).fill("~")
    knights.forEach(k => {
      const idx = (k.file + k.rank * 2) % city.scale.length
      const note = city.scale[idx].replace("4", "3")
      let step = 0
      if (k.file < 3) step = (k.file * 4) % 16
      else if (k.file < 6) step = ((k.file - 3) * 4 + 2) % 16
      else step = ((k.file - 6) * 4 + 7) % 16
      step = (step + k.rank) % 16
      notes[step] = note
    })

    layers.push(`  // Bass (Knights)`)
    layers.push(`  note("${notes.join(" ")}")`)
    layers.push(`    .s("${city.samples.bass}")`)
    layers.push(`    .decay(0.2).gain(0.5 * "0.9?"),`)
  }

  // 5. LEAD / MELODY
  if (bishops.length > 0 || queens.length > 0) {
    const count = bishops.length + queens.length
    const pulses = Math.min(count + 2, 7)

    const noteList = queens.length > 0 ? `"${city.scale[0]} ${city.scale[2]} ${city.scale[4]}"` : `"${city.scale[0]} ${city.scale[3]}"`

    layers.push(`  // Melody (Euclidean Structure)`)
    if (inCheck) layers.push(`  // ⚠️ TENSION SCALE ACTIVATED `)

    layers.push(`  note(${noteList})`)
    layers.push(`    .s("${city.samples.lead}")`)
    layers.push(`    .struct("x(${pulses},16)")`)
    layers.push(`    .gain(0.5 * "0.6?").delay(0.3),`)
  }

  // 6. PADS (Rooks)
  if (rooks.length > 0) {
    const chord = city.scale.slice(0, 3).join(" ") // Simple triadic chord
    layers.push(`  // Pads (Rooks)`)
    layers.push(`  note("<${chord}>")`) // Cycle chord
    layers.push(`    .s("${city.samples.pad}")`)
    layers.push(`    .slow(2).gain(0.25),`)
  }

  layers.push(`)`)
  return layers.join("\n")
}

// Parse the board state into an audio-playable pattern
export function parsePatternForAudio(game: Chess, city: CityData, activeSquares: Set<string>): ParsedPattern {
  const board = game.board()
  const pieces: PiecePosition[] = []
  const inCheck = game.isCheck()

  // Collect all pieces
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file]
      if (piece) {
        const square = `${files[file]}${8 - rank}` as Square
        if (activeSquares.has(square)) {
          pieces.push({
            type: piece.type,
            color: piece.color,
            square: square,
            file,
            rank: 7 - rank,
          })
        }
      }
    }
  }

  const pawns = pieces.filter((p) => p.type === "p")
  const knights = pieces.filter((p) => p.type === "n")
  const bishops = pieces.filter((p) => p.type === "b")
  const rooks = pieces.filter((p) => p.type === "r")
  const queens = pieces.filter((p) => p.type === "q")

  const whitePawns = pawns.filter((p) => p.color === "w")
  const blackPawns = pawns.filter((p) => p.color === "b")

  // --- ORGANIC PARAMETERS ---
  // Swing based on BPM/Genre
  let swing = 0
  if (city.bpm >= 120 && city.bpm < 130) swing = 0.2 // House/Garage swing
  if (city.id === "nyc") swing = 0.25 // Heavy Disco Swing
  if (city.id === "london") swing = 0.15 // Jungle Shuffle

  // --- VARIATION LOGIC ---

  // 1. Scale Variation on CHECK
  let currentScale = city.scale
  if (inCheck) {
    // Diminished / Tension Scale logic
    // Flatten the 2nd, 3rd, 5th, 6th to create dark tension
    currentScale = currentScale.map(note => {
      if (note.includes("#")) return note.replace("#", "") // Simplify sharp to natural (minor-ish)
      return note + "b" // Flatten natural
    })
  }

  // Helper: Euclidean Rhythm Generator
  const euclidean = (k: number, n: number): boolean[] => {
    const pattern = new Array(n).fill(false)
    let bucket = 0
    for (let i = 0; i < n; i++) {
      bucket += k
      if (bucket >= n) {
        bucket -= n
        pattern[i] = true
      }
    }
    return pattern
  }

  // ADSR Presets [Attack, Decay, Sustain, Release]
  const bassAdsr: [number, number, number, number] = city.id === "manchester"
    ? [0.01, 0.2, 0.4, 0.1] // Acid: Short, punchy
    : [0.05, 0.3, 0.6, 0.2] // Normal bass

  const padAdsr: [number, number, number, number] = [0.5 + Math.random() * 0.5, 0.5, 0.8, 1.0] // Breathing pads

  const leadAdsr: [number, number, number, number] = [0.01, 0.3, 0.2, 0.5] // Plucky FM envelope

  // Generate kick pattern with variations
  const kickPawns = whitePawns.filter((p) => p.file < 4)
  const kickPattern = new Array(16).fill(false)
  if (kickPawns.length > 0) {
    kickPattern[0] = true
    kickPattern[4] = true
    kickPattern[8] = true
    kickPattern[12] = true
    // Variation: Extra kicks based on positions, but masked randomly
    kickPawns.forEach((p) => {
      if (p.rank > 2 && Math.random() > 0.4) { // 60% chance to add ghost kick
        kickPattern[2] = true
        kickPattern[10] = true
      }
    })
  }

  // Generate snare pattern
  const snarePawns = whitePawns.filter((p) => p.file >= 4)
  const snarePattern = new Array(16).fill(false)
  if (snarePawns.length > 0) {
    snarePattern[4] = true
    snarePattern[12] = true
    // Ghost snares
    if (snarePawns.length > 2 && Math.random() > 0.6) {
      snarePattern[15] = true
    }
  }

  // Generate hihat pattern (Masking heavily applied here)
  const hihatPattern = new Array(16).fill(false)
  blackPawns.forEach((p, i) => {
    // Fill based on number of pawns
    for (let j = 0; j < 16; j += Math.max(1, Math.floor(8 / (blackPawns.length + 1)))) {
      // Masking: Randomly drop hits to create "breathing" rhythm
      if (Math.random() > 0.2) {
        hihatPattern[j] = true
      }
    }
  })

  // Bass notes from knights (Converted to Pattern Array)
  const bassPattern: (number | null)[] = new Array(16).fill(null)
  knights.forEach(k => {
    // Determine note
    const noteIndex = (k.file + k.rank * 2) % currentScale.length
    const freq = noteToFrequency(currentScale[noteIndex].replace("4", "3"))

    // Determine Timing based on File
    let step = 0
    if (k.file < 3) step = (k.file * 4) % 16
    else if (k.file < 6) step = ((k.file - 3) * 4 + 2) % 16
    else step = ((k.file - 6) * 4 + 7) % 16 // Syncopation

    // Shift by rank to vary pattern if sitting still
    step = (step + k.rank) % 16

    bassPattern[step] = freq
  })

  const whiteKnight = knights.find((k) => k.color === "w")
  const blackKnight = knights.find((k) => k.color === "b")

  // Pad notes from rooks (Converted to Pattern Array)
  const padPattern: (number[] | null)[] = new Array(16).fill(null)
  if (rooks.length > 0) {
    const chord = currentScale.slice(0, Math.min(3, rooks.length + 1)).map((n) => noteToFrequency(n))

    // Only retrigger pad on step 0 and 8 (main pulses)
    padPattern[0] = chord
    // If rooks are active/advanced, add texture on step 8
    if (rooks.some(r => r.rank > 0 && r.rank < 7)) {
      padPattern[8] = chord
    }
  }

  // Lead notes from queens/bishops (Euclidean Logic)
  const leadPattern: (number | null)[] = new Array(16).fill(null)

  if (queens.length > 0 || bishops.length > 0) {
    // Create a complex Euclidean pattern based on number of active melody pieces
    const activeMelodyCount = queens.length + bishops.length
    const pulses = Math.min(activeMelodyCount + 2, 7) // 3 to 7 pulses
    const struct = euclidean(pulses, 16)

    let melodyIndex = 0
    const allMelodyPieces = [...queens, ...bishops]

    struct.forEach((isActive, step) => {
      if (isActive) {
        const piece = allMelodyPieces[melodyIndex % allMelodyPieces.length]
        const idx = (piece.file + piece.rank + step) % currentScale.length
        leadPattern[step] = noteToFrequency(currentScale[idx])
        melodyIndex++
      }
    })
  }

  return {
    bpm: city.bpm,
    swing,
    kick: { pattern: kickPattern, gain: kickPawns.length > 0 ? 0.8 : 0, probability: 1 },
    snare: { pattern: snarePattern, gain: snarePawns.length > 0 ? 0.7 : 0, probability: 1 },
    hihat: { pattern: hihatPattern, gain: blackPawns.length > 0 ? 0.4 : 0, probability: 0.8 },
    bass: {
      pattern: bassPattern,
      cutoff: whiteKnight ? 300 + whiteKnight.rank * 150 : 800,
      resonance: blackKnight ? 3 + blackKnight.file * 2 : 8,
      gain: knights.length > 0 ? 0.5 : 0,
      probability: 0.9,
      adsr: bassAdsr
    },
    pad: {
      pattern: padPattern, // Fixed: now passing array of arrays
      pan: rooks.length > 0 ? rooks.reduce((sum, r) => sum + (r.file - 3.5) / 3.5, 0) / rooks.length : 0,
      reverb: rooks.length > 0 ? rooks.reduce((sum, r) => sum + r.rank / 7, 0) / rooks.length : 0.3,
      gain: rooks.length > 0 ? 0.25 : 0,
      probability: 1,
      adsr: padAdsr
    },
    lead: {
      pattern: leadPattern, // Fixed: now passing step-based pattern
      gain: (bishops.length > 0 || queens.length > 0) ? 0.5 : 0,
      detune: Math.random() * 8 - 4,
      probability: 0.6,
      adsr: leadAdsr,
      delay: 0.3
    },
    effects: {
      distort: inCheck ? 0.6 : 0,
      delay: 0.2,
    },
  }
}

// Helper to convert binary array to Strudel hex string or mini notation
function patternToMini(arr: number[]): string {
  return arr.join(" ")
}
