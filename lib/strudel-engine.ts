import type { Chess, PieceSymbol, Square } from "chess.js"
import type { CityData } from "./cities-data"
import { type ParsedPattern, noteToFrequency } from "./audio-engine"
import type { SquareEffectMap } from "./types"

interface PiecePosition {
  type: PieceSymbol
  color: "w" | "b"
  square: Square
  file: number // 0-7 (a-h)
  rank: number // 0-7 (1-8)
}

// Generate both the display pattern (Strudel-like code) and the parsed pattern for audio
export function generateStrudelPattern(game: Chess, city: CityData, activeSquares: Set<string>, squareEffects: SquareEffectMap = {}): string {
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

  const layers: string[] = []

  // Header
  layers.push(`// =======================================`)
  layers.push(`// ${city.name.toUpperCase()} - ${city.genre}`)
  layers.push(`// =======================================`)
  layers.push(``)
  layers.push(`setcps(${(city.bpm / 60 / 2).toFixed(3)})`)
  layers.push(``)
  layers.push(`stack(`)

  
  // 1. PAWNS (Drum Layers / Violins for Vienna)
  if (pawns.length > 0) {
    if (city.id === "vienna") {
       // VIENNA: Pawns -> Violins (Pizzicato)
       pawns.forEach((p, i) => {
         if (i >= 8) return 
         
         // Simple rhythmic pattern based on position
         const pattern = new Array(16).fill(0)
         const step = (p.file * 2 + p.rank) % 16
         pattern[step] = 1
         if (p.rank > 3) pattern[(step + 8) % 16] = 1 // More activity if advanced
         
         const str = patternToMini(pattern)
         
         // Pitch based on file (scale degree)
         // C Major scale degrees: 0=C, 1=D, 2=E, etc.
         const degree = p.file % 7
         const noteName = city.scale[degree] || "C4"
         
         // Gain increases with rank
         const advancement = p.color === 'w' ? Math.max(0, p.rank - 1) : Math.max(0, 6 - p.rank)
         const gain = Math.min(1.0, 0.4 + advancement * 0.1).toFixed(2)
         
         // Pan based on file
         const pan = ((p.file / 7) * 2 - 1).toFixed(2) // -1 to 1

         layers.push(`  // Violin ${p.square}`)
         layers.push(`  note("${noteName}")`)
         layers.push(`    .struct("${str}")`)
         layers.push(`    .sound("violin_pizz")`)
         layers.push(`    .gain(${gain}).pan(${pan}),`)
       })

    } else {
      // DEFAULT (Dusseldorf/NYC/etc): Drums
      const drumSamples = ["bd", "sd", "hh", "cp", "mt", "ht", "lt", "cy"]
      
      pawns.forEach((p, i) => {
        if (i >= 8) return // Limit to 8 layers

        // Calculate Step for rhythm (simple distribution)
        const pattern = new Array(16).fill(0)
        const step = (p.file * 2 + p.rank) % 16
        pattern[step] = 1
        // Add a second hit for rhythm density
        if (p.rank > 2 && p.rank < 6) {
          pattern[(step + 8) % 16] = 1
        }
        const str = patternToMini(pattern)
        
        // Calculate Gain
        const advancement = p.color === 'w' ? Math.max(0, p.rank - 1) : Math.max(0, 6 - p.rank)
        const gain = Math.min(1.0, 0.5 + advancement * 0.1).toFixed(2)

        // Calculate Pan
        const pan = (1 - (p.file / 7)).toFixed(2)

        // Sample selection based on file
        const sample = drumSamples[p.file % drumSamples.length]

        layers.push(`  // Pawn ${p.square} (${sample})`)
        layers.push(`  s("${sample}")`)
        layers.push(`    .struct("${str}")`)
        layers.push(`    .gain(${gain}).pan(${pan}),`)
      })
    }
  }

  const inCheck = game.isCheck()

  // --- BISHOP LOGIC (Piano with specific patterns) ---
  // "n("0 [2 4] <3 5> [~ <4 1>]".add("<0 [0,2,4]>")) .scale("C5:minor")"
  if (bishops.length > 0) {
    bishops.forEach((b, i) => {
      // Calculate Scale based on position
      // Roots: C, D, Eb, F, G, Ab, Bb (Minor scale degrees)
      const roots = ["C", "D", "Eb", "F", "G", "Ab", "Bb"]
      const root = roots[b.file % roots.length]
      const scaleName = `${root}5:minor`
      
      const patternNote = `"0 [2 4] <3 5> [~ <4 1>]".add("<0 [0,2,4]>")`
      
      // Pan: -1 (Left/File 0) to 1 (Right/File 7)
      const posPan = ((b.file / 7) * 2 - 1).toFixed(2)
      
      let sound = "gm_xylophone"
      if (city.id === "vienna") {
          sound = "woodwind"
      }

      layers.push(`  // Bishop ${b.square} (${scaleName})`)
      layers.push(`  note(${patternNote})`)
      layers.push(`    .scale("${scaleName}")`)
      layers.push(`    .sound("${sound}")`)
      layers.push(`    .room(.4).delay(.125).slow(2)`)
      layers.push(`    .pan(${posPan}),`)
    })
  }
  
  // 3. KING (Woodblock / Melodic Tom)
  // "substitua o instrumento do rei ("sawtooth") por "gm_woodblock". quando ele estiver em cheque, substitua por "gm_melodic_tom"."
  const king = pieces.find(p => p.type === 'k')
  if (king) {
    const soundName = inCheck ? "gm_melodic_tom" : "gm_woodblock"
      const notePattern = inCheck ? "c2 [eb2,g2] " : "c2 "
      
      let finalSound = soundName
      if (city.id === "vienna") {
          finalSound = "timpani"
      }
    
      layers.push(`  // King (${finalSound})`)
      layers.push(`  setcpm(60)`)
      layers.push(`  note("${notePattern}".add("<0 <1 -1>>"))`)
      layers.push(`    .sound("${finalSound}")`) 
      layers.push(`    .room(.5),`)
  }

  // 4. KNIGHTS (Acoustic Bass)
  if (knights.length > 0) {
    const notes = new Array(16).fill("~")
    knights.forEach(k => {
      const idx = (k.file + k.rank * 2) % city.scale.length
      const root = city.scale[idx].replace("4", "2") // Lower octave
      const third = city.scale[(idx + 2) % city.scale.length].replace("4", "3")
      const fifth = city.scale[(idx + 4) % city.scale.length].replace("4", "3")
      
      const chord = `${root} [${third},${fifth}]`
      let step = (k.file * 4 + k.rank) % 16
      notes[step] = chord
    })
    
    layers.push(`  // Bass (Knights)`)
    layers.push(`  note("${notes.join(" ")}")`)
    layers.push(`    .adsr("[.1 0]:.2:[1 0]")`)
    layers.push(`    .sound("gm_acoustic_bass")`)
    layers.push(`    .room(.5),`)
  }

  // 4. ROOKS (Pads)
  if (rooks.length > 0) {
    const chord = city.scale.slice(0, 3).join(" ")
    layers.push(`  // Pads (Rooks)`)
    layers.push(`  note("<${chord}>")`)
    layers.push(`    .s("${city.samples.pad}")`)
    layers.push(`    .slow(2).gain(0.25),`)
  }

  // 5. QUEENS (Lead Voice with specific pattern)
  if (queens.length > 0) {
    queens.forEach(q => {
      // User request: note("c2 g2!2 d2 f1").s(wchoose(["sine",10], ["triangle",1], ["bd:6",1]))
      // Variation: Transpose slightly based on rank/file
      
      const offset = (q.file + q.rank) % 5
      // Representing offset in code as a transformation or just modifying the notes string?
      // "pode alterar as notas conforme ela anda"
      // Let's modify the notes string to be accurate to what is playing.
      // Or just show the base pattern with a comment about variation?
      // The user wants to SEE the code.
      // "note("c2 g2!2 d2 f1")"
      
      // I'll construct the string with offset if possible, or just use |+ offset logic
      // Strudel: note("c2...").|+ (offset)
      
      const patternStr = `"c2 g2!2 d2 f1"`
      const transformation = offset > 0 ? `.|+ ${offset}` : ""
      
      const posPan = (1 - (q.file / 7)).toFixed(2)

      layers.push(`  // Queen ${q.square}`)
      layers.push(`  note(${patternStr})${transformation}`)
      layers.push(`    .s(wchoose(["sine",10], ["triangle",1], ["bd:6",1]))`)
      layers.push(`    .pan(${posPan}),`)
    })
  }

  layers.push(`)`)
  return layers.join("\n")
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

// Helper to convert binary array to Strudel hex string or mini notation
function patternToMini(arr: number[]): string {
  return arr.map(x => x ? "1" : "0").join(" ") // Using binary string for clarity in parsing
}

// Parse the board state into an audio-playable pattern
export function parsePatternForAudio(game: Chess, city: CityData, activeSquares: Set<string>, squareEffects: SquareEffectMap = {}): ParsedPattern {
  const board = game.board()
  const pieces: PiecePosition[] = []
  const inCheck = game.isCheck()

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

  // Helper to apply effects
  const getEffects = (square: string) => squareEffects[square] || {}

  // --- PAWN LOGIC (8 Layers, Gain, Pan) ---
  const pawnLayers = pawns.slice(0, 8).map(p => {
    let sample = ""
    let frequency: number | undefined = undefined
    const fx = getEffects(p.square)

    if (city.id === "vienna") {
        sample = "violin_pizz"
        // Scale degree based on file
        const degree = p.file % 7
        const noteName = city.scale[degree] || "C4"
        const pitchMult = fx.pitch ?? 1
        frequency = noteToFrequency(noteName) * pitchMult
    } else {
        const drumSamples = ["bd", "sd", "hh", "cp", "mt", "ht", "lt", "cy"]
        sample = drumSamples[p.file % drumSamples.length]
    }
    
    const pattern = new Array(16).fill(false)
    const step = (p.file * 2 + p.rank) % 16
    pattern[step] = true
    if (p.rank > 2 && p.rank < 6) {
      pattern[(step + 8) % 16] = true
    }

    const advancement = p.color === 'w' ? Math.max(0, p.rank - 1) : Math.max(0, 6 - p.rank)
    let gain = Math.min(1.0, 0.5 + advancement * 0.1)
    
    // Pan: Left(-1) to Right(1)
    let pan = (p.file / 7) * 2 - 1
    
    // Apply Effects
    if (fx.gain !== undefined) gain *= fx.gain
    if (fx.pan !== undefined) pan = Math.max(-1, Math.min(1, pan + fx.pan))

    return {
      sample,
      pattern,
      gain,
      pan,
      color: p.color,
      delay: fx.delay,
      reverb: fx.reverb,
      pitch: fx.pitch,
      frequency
    }
  })

  // --- QUEEN LOGIC (Random Low Octave Pattern) ---
  // "note("c2 g2!2 d2 f1").s(wchoose(["sine",10], ["triangle",1], ["bd:6",1]))"
  const queenLayers = queens.map(q => {
    const fx = getEffects(q.square)
    const pitchMult = fx.pitch ?? 1
    
    // Base notes frequencies
    // Variation: Transpose by (file + rank) % 5 semitones to keep it subtle and low
    const offset = (q.file + q.rank) % 5
    const ratio = Math.pow(2, offset / 12)

    let sound: "gm_queen_random" | "violin_legato" = "gm_queen_random"
    let c2 = noteToFrequency("c2") * ratio * pitchMult
    let g2 = noteToFrequency("g2") * ratio * pitchMult
    let d2 = noteToFrequency("d2") * ratio * pitchMult
    let f1 = noteToFrequency("f1") * ratio * pitchMult

    if (city.id === "vienna") {
        sound = "violin_legato"
        c2 *= 4; g2 *= 4; d2 *= 4; f1 *= 4;
    }

    const pattern = new Array(16).fill(null)

    // Pattern: c2 g2!2 d2 f1
    pattern[0] = c2
    pattern[4] = g2
    pattern[6] = g2
    pattern[8] = d2
    pattern[12] = f1
    
    let pan = (q.file / 7) * 2 - 1
    let gain = 0.6
    
    if (fx.gain !== undefined) gain *= fx.gain
    if (fx.pan !== undefined) pan = Math.max(-1, Math.min(1, pan + fx.pan))

    return {
      pattern,
      gain,
      pan,
      sound, 
      adsr: [0.01, 0.1, 0.5, 0.5] as [number, number, number, number],
      color: q.color,
      delay: fx.delay,
      reverb: fx.reverb,
      decay: fx.decay
    }
  })

  // --- BISHOP LOGIC (Xylophone Pattern) ---
  const pianoLayers = bishops.map((b, i) => {
    const fx = getEffects(b.square)
    const pitchMult = fx.pitch ?? 1

    // Use current chord tones (1, 3, 5 of scale) based on file
    // Scale usually has 5 or 7 notes. We pick indices 0, 2, 4 (Triad)
    const chordIndices = [0, 2, 4]
    // Map file (0-7) to these indices cyclically
    const noteIndex = chordIndices[b.file % chordIndices.length]
    // Get note name from city scale (fallback to C4 if missing)
    const noteName = city.scale[noteIndex % city.scale.length] || "C4"
    
    // Convert to frequency and lower by 1 octave (/ 2)
    const freq = (noteToFrequency(noteName) / 2) * pitchMult
    
    const pattern = new Array(16).fill(null)
    
    // Create a pattern based on file/rank to avoid unison
    // Simple Arpeggio-like pattern
    // File 0: [x, ., ., .]
    // File 1: [., x, ., .]
    // etc.
    let step = (b.file * 2 + b.rank) % 16
    pattern[step] = freq
    // Add a second hit for rhythm
    pattern[(step + 8) % 16] = freq

    let pan = (b.file / 7) * 2 - 1
    // Invert pan as per previous request? Or keep standard?
    // "Invert Bishop audio panning to match user perception" was a previous task.
    // If left bishop is on left side of board (File A -> 0), pan should be -1 (Left).
    // (0/7)*2 - 1 = -1. Correct.
    
    let gain = 0.5 // Reduced volume by 50% (Base was implicit 1.0 or high)
    let sound: "gm_xylophone" | "woodwind" = "gm_xylophone"

    if (city.id === "vienna") {
        sound = "woodwind"
        // Woodwinds can be sustained or short. Defaulting to short in pattern logic for now.
    }
    
    if (fx.gain !== undefined) gain *= fx.gain
    if (fx.pan !== undefined) pan = Math.max(-1, Math.min(1, pan + fx.pan))

    return {
      pattern,
      velocities: new Array(16).fill(1),
      gain,
      pan,
      sound,
      lfo: null,
      delay: fx.delay ?? 0.125,
      reverb: fx.reverb ?? 0.4,
      decay: fx.decay
    }
  })

  // --- KING LOGIC (Woodblock / Melodic Tom) ---
  const kingLayers = pieces.filter(p => p.type === 'k').map(k => {
      const pattern = new Array(16).fill(null)
      const fx = getEffects(k.square)
      const pitchMult = fx.pitch ?? 1
      
      // Pattern logic matching display:
      // Normal: "c2 "
      // Check: "c2 [eb2,g2]"
      // Plus the <0 <1 -1>> variation logic
      
      const offsets = [0, 1, -1]
      const offset = offsets[(k.file + k.rank) % 3]
      const semitoneRatio = Math.pow(2, offset / 12)

      // Use frequencies appropriate for the instruments
      // Woodblock uses internal fixed freq in AudioEngine, but Tom needs input freq.
      // C2 is approx 65Hz. For Tom, maybe higher is better? 
      // User requested "gm_melodic_tom".
      
      const c2 = noteToFrequency("c2") * pitchMult * semitoneRatio
      const eb2 = noteToFrequency("eb2") * pitchMult * semitoneRatio
      const g2 = noteToFrequency("g2") * pitchMult * semitoneRatio
      
      const soundName = inCheck ? "gm_melodic_tom" : "gm_woodblock"

      pattern[0] = c2
      if (inCheck) {
         pattern[8] = [eb2, g2] // Add extra hit for check tension
      } else {
         // Maybe just simple beat for woodblock
      }

      let pan = (k.file / 7) * 2 - 1
      let gain = 0.8
      
      if (fx.gain !== undefined) gain *= fx.gain
      if (fx.pan !== undefined) pan = Math.max(-1, Math.min(1, pan + fx.pan))

      return {
          pattern,
          gain,
          pan,
          sound: soundName as "gm_melodic_tom" | "gm_woodblock" | "timpani", // Dynamic sound name
          color: k.color,
          adsr: [0.1, 0, 0.2, 1.0] as [number, number, number, number],
          room: 0.5,
          delay: fx.delay,
          decay: fx.decay
      }
  })

  // --- KNIGHT LOGIC (Acoustic Bass) ---
  const knightLayers = knights.map(k => {
    const pattern = new Array(16).fill(null)
    const idx = (k.file + k.rank * 2) % city.scale.length
    const noteName = city.scale[idx].replace(/[0-9]/, '2')
    const fx = getEffects(k.square)
    const pitchMult = fx.pitch ?? 1
    const freq = noteToFrequency(noteName) * pitchMult
    
    let step = (k.file * 4 + k.rank) % 16
    pattern[step] = freq
    
    let pan = (k.file / 7) * 2 - 1
    let gain = 0.5
    let sound: string = "gm_acoustic_bass"

    if (city.id === "vienna") {
        sound = "brass_staccato"
    }
    
    if (fx.gain !== undefined) gain *= fx.gain
    if (fx.pan !== undefined) pan = Math.max(-1, Math.min(1, pan + fx.pan))

    return {
      pattern,
      gain,
      pan,
      sound,
      adsr: [0.1, 0.2, 1.0, 0.1] as [number, number, number, number],
      room: 0.5,
      delay: fx.delay,
      reverb: fx.reverb,
      decay: fx.decay
    }
  })
  
  // Legacy bass pattern (fallback or unused)
  const bassPattern: (number | null)[] = new Array(16).fill(null)

  const padPattern: (number[] | null)[] = new Array(16).fill(null)
  if (rooks.length > 0) {
    const chord = city.scale.slice(0, 3).map(n => noteToFrequency(n))
    padPattern[0] = chord
  }

  return {
    bpm: city.bpm,
    swing: 0,
    cityId: city.id,
    scale: city.scale,
    pawns: pawnLayers,
    queens: queenLayers, 
    bishops: pianoLayers,
    kings: kingLayers, 
    knights: knightLayers,
    bass: {
      pattern: bassPattern,
      cutoff: 600,
      resonance: 5,
      gain: 0,
      adsr: [0.1, 0.2, 0.8, 1.0]
    },
    pad: {
      pattern: padPattern,
      pan: 0,
      reverb: 0.3,
      gain: rooks.length > 0 ? 0.25 : 0,
      adsr: [0.5, 0.5, 0.8, 1.0],
      sound: city.id === "vienna" ? "string_pad" : "synth_pad"
    },
    effects: {
      distort: inCheck ? 0.25 : 0,
      delay: 0.2,
    },
  }
}
