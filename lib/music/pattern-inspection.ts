// Validate explicit MIDI banks without opening AudioContext or playing audio.
import { compileVoice } from './pattern-compiler'
import { voiceSpecs } from './voice-spec'
import { loadLibrary } from './strudel-loader'
import type { MusicSnapshot } from './runtime-types'

export async function validateMusicSnapshot(state: MusicSnapshot) {
  const api = await loadLibrary()
  for (const voice of voiceSpecs({ ...state, playing: true, pieces: state.pieces.map(p => ({ ...p, active: true })) }, null)) {
    for (let section = 0; section < voice.pianoRolls.length; section++) {
      const pattern = compileVoice(api, { ...voice, performance: undefined, sectionPattern: String(section) })
      for (let cycle = 0; cycle < 8; cycle++) {
        if (pattern.queryArc(cycle, cycle + 1).length > 128) throw new Error(`${voice.instrument.name}: reduza a densidade das notas.`)
      }
    }
  }
}
