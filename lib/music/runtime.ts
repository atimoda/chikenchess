// Compatibility entry point for hooks, widgets, tests and score-export scripts.
// Implementations live in focused modules; see lib/music/README.md for their boundaries.
export type { MusicSnapshot, Preview, MusicPulse, VoiceSpec } from './runtime-types'
export { MusicRuntime } from './runtime-session'
export { voiceSpecs } from './voice-spec'
export { compileVoice } from './pattern-compiler'
export { renderMusicCode } from './code-export'
export { validateMusicSnapshot } from './pattern-inspection'
