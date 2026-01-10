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

  // 1. PAWNS (Drum Layers)
  // "Cada peão ative um único instrumento (camada) da bateria"
  // "Peão inicie com gain de 0.5, e a cada passo para a frente, aumente 0.1 de gain"
  // "Alterar o 'pan' de acordo com a casa... direita (0) ou esquerda (1)"
  if (pawns.length > 0) {
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
      // White starts at rank 1 (index 1), moves to 7. Gain 0.5 + (rank-1)*0.1
      // Black starts at rank 6 (index 6), moves to 0. Gain 0.5 + (6-rank)*0.1
      const advancement = p.color === 'w' ? Math.max(0, p.rank - 1) : Math.max(0, 6 - p.rank)
      const gain = Math.min(1.0, 0.5 + advancement * 0.1).toFixed(2)

      // Calculate Pan
      // "quanto mais a peça andar para a esquerda ou direita, o 'pan' é alterado para a direita (0) ou para a esquerda (1)"
      // File 0 (Left/A) -> Pan 1? User said "direita (0) ou esquerda (1)". Usually Left is -1/0, Right is 1.
      // Assuming User mapping: Left(File 0) -> 1, Right(File 7) -> 0.
      const pan = (1 - (p.file / 7)).toFixed(2)

      // Sample selection based on file
      const sample = drumSamples[p.file % drumSamples.length]

      layers.push(`  // Pawn ${p.square} (${sample})`)
      layers.push(`  s("${sample}")`)
      layers.push(`    .struct("${str}")`)
      layers.push(`    .gain(${gain}).pan(${pan}),`)
    })
  }

  const inCheck = game.isCheck()

  // 2. BISHOPS (Piano with specific patterns)
  // "cada bispo será um piano diferente"
  // "Pattern: note('c1, eb3 g3 [bb3 c4]').s('piano').slow(10).gain(siren)"
  if (bishops.length > 0) {
    bishops.forEach((b, i) => {
      // Base scale indices: [0, 1, 3, 4, 5] (C, Eb, G, Bb, C)
      const baseIndices = [0, 1, 3, 4, 5]
      const shift = b.rank
      const shiftedIndices = baseIndices.map(idx => idx + shift)
      
      const noteStr = shiftedIndices.map(idx => {
        const octaveOffset = Math.floor(idx / 5)
        const scaleIdx = idx % 5
        const note = city.scale[scaleIdx]
        // Hacky way to add octave to note string if needed, 
        // but for display we'll just show the base note or try to format it.
        // Actually, let's just use the note names from the scale.
        return note
      })

      // Construct sequence string: "n1, n2 n3 [n4 n5]"
      // We have 5 notes.
      const patternNote = `"${noteStr[0]}, ${noteStr[1]} ${noteStr[2]} [${noteStr[3]} ${noteStr[4]}]"`

      const posPan = (1 - (b.file / 7)).toFixed(2)
      const slowFactor = (i % 2 === 0) ? 10 : 1

      layers.push(`  // Bishop ${b.square} (Piano)`)
      layers.push(`  note(${patternNote})`)
      layers.push(`    .s("piano")`)
      layers.push(`    .slow(${slowFactor})`)
      layers.push(`    .gain("siren").mul(0.3)`)
      layers.push(`    .pan(${posPan}),`)
    })
  }
  
  // 3. KING (Queen's Sound)
  // "substitua o som do rei com o da rainha"
  const king = pieces.find(p => p.type === 'k')
  if (king) {
    const sound = king.color === 'b' ? "darbuka" : "synth"
    layers.push(`  // King (${sound})`)
    layers.push(`  n("0 [2 4] <3 5> [~ <4 1>]".add("<0 [0,2,4]>"))`)
    layers.push(`    .scale("${city.scale[0]}5:minor")`) 
    layers.push(`    .sound("${sound}")`)
    layers.push(`    .slow(2)`)
    layers.push(`    .room(.4).delay(.125),`)
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

  // 5. QUEENS (Now uses previous Bishop Logic - Lead/Synth)
  if (queens.length > 0) {
    queens.forEach((q, i) => {
       // Euclidean rhythm for melody
       const pulses = 3 + (q.rank % 4)
       const struct = euclidean(pulses, 16)
       const miniStruct = struct.map(x => x ? "x" : ".").join("")
       
       // Note selection
       const noteIdx = (q.file + q.rank * 2) % city.scale.length
       const note = city.scale[noteIdx]
 
       // Position Pan
       const posPan = (1 - (q.file / 7)).toFixed(2)
       const sound = q.color === 'b' ? "darbuka" : "synth"

       layers.push(`  // Queen ${q.square}`)
       layers.push(`  note("${note}")`)
       layers.push(`    .s("${sound}")`)
       layers.push(`    .struct("${miniStruct}")`)
       layers.push(`    .slow(4)`)
       layers.push(`    .release(1).pan(${posPan})`) 
       layers.push(`    .gain("sine").decay(0.2).sustain(1.25).gain(.6),`)
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
export function parsePatternForAudio(game: Chess, city: CityData, activeSquares: Set<string>): ParsedPattern {
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

  // --- PAWN LOGIC (8 Layers, Gain, Pan) ---
  const pawnLayers = pawns.slice(0, 8).map(p => {
    const drumSamples = ["bd", "sd", "hh", "cp", "mt", "ht", "lt", "cy"]
    const sample = drumSamples[p.file % drumSamples.length]
    
    const pattern = new Array(16).fill(false)
    const step = (p.file * 2 + p.rank) % 16
    pattern[step] = true
    if (p.rank > 2 && p.rank < 6) {
      pattern[(step + 8) % 16] = true
    }

    const advancement = p.color === 'w' ? Math.max(0, p.rank - 1) : Math.max(0, 6 - p.rank)
    const gain = Math.min(1.0, 0.5 + advancement * 0.1)
    const pan = 1 - (p.file / 7) // Left=1, Right=0 (Strudel usually -1 to 1, but respecting user's 0-1 scale)
    // Actually WebAudio StereoPanner is -1 (Left) to 1 (Right).
    // User said: "Esquerda (1) ou Direita (0)".
    // We need to map 1 -> -1 (Left) and 0 -> 1 (Right)? Or is it 0..1 range?
    // Let's assume user means 0-1 range where 0 is Right and 1 is Left.
    // Map to WebAudio (-1 to 1): 
    // Val 1 (Left) -> -1
    // Val 0 (Right) -> 1
    // Formula: (1 - val) * 2 - 1 ? 
    // If val=1: 0*2 -1 = -1 (Left). Correct.
    // If val=0: 1*2 -1 = 1 (Right). Correct.
    // So webAudioPan = (1 - pan) * 2 - 1 = (p.file/7) * 2 - 1.
    // Wait, simpler: p.file/7 is 0 (Left) to 1 (Right).
    // User wants Left=1. So userPan = 1 - (p.file/7).
    // WebAudio wants Left=-1.
    // So if file=0 (Left), userPan=1. WebAudio should be -1.
    // If file=7 (Right), userPan=0. WebAudio should be 1.
    // Map userPan [1...0] to [-1...1].
    // -1 + (1 - userPan) * 2
    // If userPan=1: -1 + 0 = -1.
    // If userPan=0: -1 + 2 = 1.
    // Correct.
    
    // BUT, let's stick to what we pass to audio engine. If audio engine expects -1 to 1, we convert.
    // If audio engine expects 0 to 1, we pass 0 to 1.
    // Existing audio engine uses `panner.pan.value = pan`. StereoPanner is -1 to 1.
    // So we need to calculate the final pan value here.
    // File 0 (Left) -> -0.8
    // File 7 (Right) -> 0.8
    const webAudioPan = ((p.file / 7) * 2 - 1) * -1 // Invert to match user's Left=1 preference?
    // Wait, user: "esquerda (1)".
    // Standard: Left is -1.
    // So if user wants "1" to mean left, I should probably just pass the value derived from file to match "leftness".
    // File 0 is Left. Pan should be -1.
    // File 7 is Right. Pan should be 1.
    // Let's use (p.file / 7) * 2 - 1.

    return {
      sample,
      pattern,
      gain,
      pan: (p.file / 7) * 2 - 1, // -1 (Left/File 0) to 1 (Right/File 7)
      color: p.color
    }
  })

  // --- QUEEN LOGIC (Old Bishop Synth: Triangle + Tremolo) ---
  const queenLayers = queens.map(q => {
    const pulses = 3 + (q.rank % 4)
    const struct = euclidean(pulses, 16)
    
    const noteIdx = (q.file + q.rank * 2) % city.scale.length
    const freq = noteToFrequency(city.scale[noteIdx])

    const pattern = new Array(16).fill(null)
    struct.forEach((isActive, i) => {
      if (isActive) pattern[i] = freq
    })

    // Position Pan
    const pan = (q.file / 7) * 2 - 1

    return {
      pattern,
      gain: 0.5,
      pan,
      adsr: [0.01, 0.2, 1.25, 1.0] as [number, number, number, number],
      lfo: true, // Use LFO for Tremolo
      color: q.color
    }
  })

  // --- BISHOP LOGIC (Piano with Third Progression) ---
  const pianoLayers = bishops.map((b, i) => {
    // "cada bispo será um piano diferente"
    // "Pattern 1: slow(2.5)" (Bishop 1)
    // "Pattern 2: slow(1)" (Bishop 2)
    const isFirst = i % 2 === 0
    const slowFactor = isFirst ? 2.5 : 1
    
    // Base chord indices in the scale (C, Eb, G, Bb, C) -> [0, 1, 3, 4, 5]
    const baseIndices = [0, 1, 3, 4, 5] 
    
    // "a cada casa que o bispo anda para a frente, sobe uma 'terça'"
    // We shift the scale index by 1 per rank (approx a third/fourth in pentatonic)
    const shift = b.rank
    const shiftedIndices = baseIndices.map(idx => idx + shift)
    
    const notes = shiftedIndices.map(idx => {
      const scaleLen = city.scale.length
      const octaveOffset = Math.floor(idx / scaleLen)
      const scaleIdx = idx % scaleLen
      
      // Get base frequency of note in scale
      const baseNote = city.scale[scaleIdx]
      let freq = noteToFrequency(baseNote)
      
      // Apply octave offset (multiply frequency by 2^offset)
      if (octaveOffset > 0) freq *= Math.pow(2, octaveOffset)
      
      return freq
    })

    // Create pattern based on slowFactor
    // If slow(1), it plays once per bar (16 steps).
    
    const pattern = new Array(16).fill(null)
    // Trigger on first step
    pattern[0] = notes

    return {
      pattern,
      gain: 0.3, // Reduced gain as requested
      pan: (b.file / 7) * 2 - 1,
      lfo: null,
      delay: 0.4
    }
  })

  // --- KING LOGIC (Queen's Sound) ---
  const kingLayers = pieces.filter(p => p.type === 'k').map(k => {
      // ... same pattern logic ...
      const pattern = new Array(16).fill(null)
      const getFreq = (scaleIdx: number) => {
          const idx = scaleIdx % city.scale.length
          return noteToFrequency(city.scale[idx])
      }
      pattern[0] = getFreq(0)  
      pattern[2] = getFreq(2)  
      pattern[3] = getFreq(4)
      pattern[4] = getFreq(3)
      pattern[6] = getFreq(5)

      return {
          pattern,
          gain: 0.8,
          pan: (k.file / 7) * 2 - 1,
          sound: k.color === 'b' ? "darbuka" : "synth",
          color: k.color
      }
  })

  // --- KNIGHT LOGIC (Acoustic Bass) ---
  const knightLayers = knights.map(k => {
    const pattern = new Array(16).fill(null)
    const idx = (k.file + k.rank * 2) % city.scale.length
    const noteName = city.scale[idx].replace(/[0-9]/, '2')
    const freq = noteToFrequency(noteName)
    
    let step = (k.file * 4 + k.rank) % 16
    pattern[step] = freq
    
    return {
      pattern,
      gain: 0.5,
      pan: (k.file / 7) * 2 - 1,
      sound: "gm_acoustic_bass",
      adsr: [0.1, 0.2, 1.0, 0.1] as [number, number, number, number],
      room: 0.5
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
    pawns: pawnLayers,
    queens: queenLayers.map(q => ({...q, sound: q.color === 'b' ? "darbuka" : "synth" as "darbuka" | "synth"})), 
    bishops: pianoLayers, // Renamed 'piano' to 'bishops'
    kings: kingLayers.map(k => ({...k, sound: "synth" as "synth" | "xylophone"})), 
    knights: knightLayers.map(k => ({...k, sound: "gm_acoustic_bass" as "gm_acoustic_bass" | "bass"})),
    bass: {
      pattern: bassPattern,
      cutoff: 600,
      resonance: 5,
      gain: 0, // Disable legacy bass
      adsr: [0.1, 0.2, 0.8, 1.0]
    },
    pad: {
      pattern: padPattern,
      pan: 0,
      reverb: 0.3,
      gain: rooks.length > 0 ? 0.25 : 0,
      adsr: [0.5, 0.5, 0.8, 1.0]
    },
    effects: {
      distort: inCheck ? 0.4 : 0,
      delay: 0.2,
    },
  }
}
