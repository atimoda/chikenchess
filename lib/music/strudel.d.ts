// The pinned browser bundle does not ship TypeScript declarations.
// Keep its untyped surface confined to the runtime adapter.
declare module '@strudel/web' {
  export const Cyclist: any
  export const note: any
  export const n: any
  export const stack: any
  export const silence: any
  export const miniAllStrings: any
  export const registerSynthSounds: any
  export const initAudio: any
  export const getAudioContext: any
  export const setAudioContext: any
  export const getSuperdoughAudioController: any
  export const webaudioOutput: any
  export const mini: any
  export const sine: any
  export const saw: any
  export const samples: any
  export const loadBuffer: any
  export const pick: any
  export const pickRestart: any
}
