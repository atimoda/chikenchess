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
export function generateStrudelPattern(game: Chess, city: CityData): string {
  const board = game.board()
  const pieces: PiecePosition[] = []
  const inCheck = game.isCheck()

  // Collect all pieces
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file]
      if (piece) {
        pieces.push({
          type: piece.type,
          color: piece.color,
          square: `${files[file]}${8 - rank}` as Square,
          file,
          rank: 7 - rank,
        })
      }
    }
  }

  // Separate by piece type
  const pawns = pieces.filter((p) => p.type === "p")
  const knights = pieces.filter((p) => p.type === "n")
  const bishops = pieces.filter((p) => p.type === "b")
  const rooks = pieces.filter((p) => p.type === "r")
  const queens = pieces.filter((p) => p.type === "q")

  const layers: string[] = []

  // Header
  layers.push(`// ═══════════════════════════════════════`)
  layers.push(`// ${city.name.toUpperCase()} - ${city.genre}`)
  layers.push(`// ═══════════════════════════════════════`)
  layers.push(``)
  layers.push(`setcps(${(city.bpm / 60 / 2).toFixed(3)})  // ${city.bpm} BPM`)
  layers.push(``)
  layers.push(`stack(`)

  // PAWNS -> Rhythm Section
  if (pawns.length > 0) {
    const whitePawns = pawns.filter((p) => p.color === "w")
    const blackPawns = pawns.filter((p) => p.color === "b")

    layers.push(`  // ♟ PAWNS → Rhythm Engine`)

    // Kicks from left-side pawns
    const kickPawns = whitePawns.filter((p) => p.file < 4)
    if (kickPawns.length > 0) {
      const kickPattern = generateKickPattern(kickPawns)
      layers.push(`  s("bd:${city.id === "detroit" ? "3" : "0"}*4")`)
      layers.push(`    .struct("${kickPattern}")`)
      layers.push(`    .gain(0.8),`)
    }

    // Snares from right-side pawns
    const snarePawns = whitePawns.filter((p) => p.file >= 4)
    if (snarePawns.length > 0) {
      const snarePattern = generateSnarePattern(snarePawns)
      layers.push(`  s("sd:${city.id === "berlin" ? "2" : "1"}")`)
      layers.push(`    .struct("${snarePattern}")`)
      layers.push(`    .gain(0.7),`)
    }

    // Hi-hats from black pawns
    if (blackPawns.length > 0) {
      const hihatDensity = Math.min(blackPawns.length * 2, 16)
      const hihatPattern = generateHihatPattern(blackPawns, hihatDensity)
      layers.push(`  s("hh*${hihatDensity}")`)
      layers.push(`    .struct("${hihatPattern}")`)
      layers.push(`    .gain(0.35),`)
    }

    layers.push(``)
  }

  // KNIGHTS -> Bass & Acid lines
  if (knights.length > 0) {
    layers.push(`  // ♞ KNIGHTS → Bass Synth`)

    const notes = knights.map((k) => {
      const noteIndex = (k.file + k.rank * 2) % city.scale.length
      return city.scale[noteIndex].replace("4", "3") // Lower octave for bass
    })

    const whiteKnight = knights.find((k) => k.color === "w")
    const blackKnight = knights.find((k) => k.color === "b")

    const cutoff = whiteKnight ? 300 + whiteKnight.rank * 150 : 800
    const resonance = blackKnight ? 3 + blackKnight.file * 2 : 8

    layers.push(`  note("${notes.join(" ")}")`)
    layers.push(`    .s("sawtooth")`)
    layers.push(`    .cutoff(${cutoff})`)
    layers.push(`    .resonance(${resonance})`)
    layers.push(`    .decay(0.2)`)
    layers.push(`    .gain(0.5),`)
    layers.push(``)
  }

  // BISHOPS -> Arpeggios
  if (bishops.length > 0) {
    layers.push(`  // ♝ BISHOPS → Arpeggios`)

    const arpeggioNotes = bishops.flatMap((b) => {
      const baseIndex = b.file % city.scale.length
      const direction = b.color === "w" ? 1 : -1
      return [
        city.scale[baseIndex],
        city.scale[(baseIndex + direction + city.scale.length) % city.scale.length],
        city.scale[(baseIndex + direction * 2 + city.scale.length) % city.scale.length],
      ]
    })

    layers.push(`  note("${arpeggioNotes.join(" ")}")`)
    layers.push(`    .s("triangle")`)
    layers.push(`    .delay(0.3)`)
    layers.push(`    .gain(0.4),`)
    layers.push(``)
  }

  // ROOKS -> Atmosphere/Pads
  if (rooks.length > 0) {
    layers.push(`  // ♜ ROOKS → Pad Layer`)

    const panValue = rooks.reduce((sum, r) => sum + (r.file - 3.5) / 3.5, 0) / rooks.length
    const reverbValue = rooks.reduce((sum, r) => sum + r.rank / 7, 0) / rooks.length

    const padChord = city.scale.slice(0, 3).join(" ")

    layers.push(`  note("<${padChord}>")`)
    layers.push(`    .s("sine")`)
    layers.push(`    .pan(${panValue.toFixed(2)})`)
    layers.push(`    .room(${reverbValue.toFixed(2)})`)
    layers.push(`    .gain(0.25),`)
    layers.push(``)
  }

  // QUEENS -> Lead melody
  if (queens.length > 0) {
    layers.push(`  // ♛ QUEENS → Lead Synth`)

    const queenNotes = queens.flatMap((q) => {
      const baseNote = city.scale[(q.file + q.rank) % city.scale.length]
      return [baseNote, city.scale[(q.file + q.rank + 2) % city.scale.length]]
    })

    layers.push(`  note("${queenNotes.join(" ")}")`)
    layers.push(`    .s("square")`)
    layers.push(`    .lpf(1200)`)
    layers.push(`    .delay(0.2)`)
    layers.push(`    .room(0.4)`)
    layers.push(`    .gain(0.5),`)
    layers.push(``)
  }

  // CHECK effects
  if (inCheck) {
    layers.push(`  // ⚠️ CHECK! → Distortion Active`)
    layers.push(`  s("hh*16")`)
    layers.push(`    .speed(2)`)
    layers.push(`    .distort(0.6)`)
    layers.push(`    .gain(0.3),`)
    layers.push(``)
  }

  // CHECKMATE effect
  if (game.isCheckmate()) {
    layers.push(`  // ☠️ CHECKMATE → Final Drop`)
    layers.push(`  s("bd:0 ~ ~ ~")`)
    layers.push(`    .room(0.99)`)
    layers.push(`    .gain(1),`)
  }

  layers.push(`)`)

  return layers.join("\n")
}

// Parse the board state into an audio-playable pattern
export function parsePatternForAudio(game: Chess, city: CityData): ParsedPattern {
  const board = game.board()
  const pieces: PiecePosition[] = []
  const inCheck = game.isCheck()

  // Collect all pieces
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file]
      if (piece) {
        pieces.push({
          type: piece.type,
          color: piece.color,
          square: `${files[file]}${8 - rank}` as Square,
          file,
          rank: 7 - rank,
        })
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

  // Generate kick pattern (16 steps)
  const kickPawns = whitePawns.filter((p) => p.file < 4)
  const kickPattern = new Array(16).fill(false)
  if (kickPawns.length > 0) {
    kickPattern[0] = true
    kickPattern[4] = true
    kickPattern[8] = true
    kickPattern[12] = true
    // Add variations based on pawn positions
    kickPawns.forEach((p) => {
      if (p.rank > 2) {
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
  }

  // Generate hihat pattern
  const hihatPattern = new Array(16).fill(false)
  blackPawns.forEach((p, i) => {
    // Fill based on number of pawns
    for (let j = 0; j < 16; j += Math.max(1, Math.floor(8 / (blackPawns.length + 1)))) {
      hihatPattern[j] = true
    }
  })

  // Bass notes from knights
  const bassNotes = knights.map((k) => {
    const noteIndex = (k.file + k.rank * 2) % city.scale.length
    const note = city.scale[noteIndex].replace("4", "3")
    return noteToFrequency(note)
  })

  const whiteKnight = knights.find((k) => k.color === "w")
  const blackKnight = knights.find((k) => k.color === "b")

  // Pad notes from rooks/bishops
  const padNotes = city.scale.slice(0, Math.min(3, rooks.length + 1)).map((n) => noteToFrequency(n))

  // Lead notes from queens/bishops
  const leadNotes = queens.flatMap((q) => {
    const baseNote = city.scale[(q.file + q.rank) % city.scale.length]
    return [noteToFrequency(baseNote)]
  })

  if (leadNotes.length === 0 && bishops.length > 0) {
    bishops.forEach((b) => {
      const noteIndex = b.file % city.scale.length
      leadNotes.push(noteToFrequency(city.scale[noteIndex]))
    })
  }

  return {
    bpm: city.bpm,
    kick: { pattern: kickPattern, gain: kickPawns.length > 0 ? 0.8 : 0 },
    snare: { pattern: snarePattern, gain: snarePawns.length > 0 ? 0.7 : 0 },
    hihat: { pattern: hihatPattern, gain: blackPawns.length > 0 ? 0.4 : 0 },
    bass: {
      notes: bassNotes,
      cutoff: whiteKnight ? 300 + whiteKnight.rank * 150 : 800,
      resonance: blackKnight ? 3 + blackKnight.file * 2 : 8,
      gain: knights.length > 0 ? 0.5 : 0,
    },
    pad: {
      notes: padNotes,
      pan: rooks.length > 0 ? rooks.reduce((sum, r) => sum + (r.file - 3.5) / 3.5, 0) / rooks.length : 0,
      reverb: rooks.length > 0 ? rooks.reduce((sum, r) => sum + r.rank / 7, 0) / rooks.length : 0.3,
      gain: rooks.length > 0 ? 0.25 : 0,
    },
    lead: {
      notes: leadNotes,
      gain: leadNotes.length > 0 ? 0.5 : 0,
    },
    effects: {
      distort: inCheck ? 0.6 : 0,
      delay: 0.2,
    },
  }
}

function generateKickPattern(pawns: PiecePosition[]): string {
  // House-style kick pattern, modified by pawn positions
  const base = ["1", "0", "0", "0", "1", "0", "0", "0"]

  pawns.forEach((p) => {
    if (p.rank >= 4) {
      base[2] = "1" // Add offbeat kick for advanced pawns
      base[6] = "1"
    }
  })

  return base.slice(0, 4).join(" ")
}

function generateSnarePattern(pawns: PiecePosition[]): string {
  // Standard backbeat
  return "0 0 1 0"
}

function generateHihatPattern(pawns: PiecePosition[], density: number): string {
  const pattern = []
  for (let i = 0; i < Math.min(8, density); i++) {
    pattern.push(i % 2 === 0 ? "1" : pawns.length > 4 ? "1" : "0")
  }
  return pattern.join(" ")
}
