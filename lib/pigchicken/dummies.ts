// PigChicKen's training dummies in the Pátio: each one keeps its own params (the tip it shows when it is
// destroyed and its total life), breaks in stages as it loses life, and answers every hit with a note that is
// low and out of tune when it is wrecked and climbs the zone's scale, getting in tune, as it is mended.
// The editor mode edits `DummyParams` per object; nothing here depends on the canvas or the synth.

export type DummyParams = {
  message: string // the tip it shows when it is destroyed (empty: no bubble)
  maxHp: number // total life
}
export const DUMMY_DEFAULTS: DummyParams = { message: '', maxHp: 100 }
export const DUMMY_HP_RANGE = { min: 10, max: 1000 }

// the first tips, one per dummy of the Pátio, in order
export const DUMMY_TIPS: string[] = [
  'Instrumentos não machucam: as notas enchem a barra de harmonia e viram aliens em passarinhos e zumbis em gente feliz.',
  'Toque uma nota em mim para me consertar. Cada melhora deixa o meu som mais agudo e mais afinado.',
  'Atire com um instrumento bem na batida da música: a nota vale mais harmonia.',
  'Mira mais para cima toca notas mais agudas, e a nota sempre cabe no acorde que está tocando.',
  'Segure Tab (ou View no gamepad) para abrir a roda do inventário e soltar em cima do item.',
  'Segure arremessar (F) para jogar o item com mais força. Ele também machuca quem acertar.',
  'No fim do Pátio fica o Templo do Gongo: bata 5 vezes no gongo para começar as fases.',
]

export const dummyTip = (i: number) => DUMMY_TIPS[((i % DUMMY_TIPS.length) + DUMMY_TIPS.length) % DUMMY_TIPS.length]

// clean params: a whole, bounded life and a trimmed message
export function cleanDummyParams(p: Partial<DummyParams> | undefined, base: DummyParams = DUMMY_DEFAULTS): DummyParams {
  const hp = Number(p?.maxHp ?? base.maxHp)
  return {
    message: String(p?.message ?? base.message).trim().slice(0, 280),
    maxHp: Math.round(Math.max(DUMMY_HP_RANGE.min, Math.min(DUMMY_HP_RANGE.max, Number.isFinite(hp) ? hp : base.maxHp))),
  }
}

// 0 wrecked (no life) · 1 falling apart · 2 cracked · 3 scratched · 4 whole
export const DUMMY_STAGE_MAX = 4
export const DUMMY_STAGE_NAMES = ['estado deplorável', 'caindo aos pedaços', 'rachado', 'arranhado', 'inteiro']
export function dummyStage(hp: number, maxHp: number) {
  if (hp <= 0 || maxHp <= 0) return 0
  return Math.max(1, Math.min(DUMMY_STAGE_MAX, Math.ceil((hp / maxHp) * DUMMY_STAGE_MAX - 1e-9)))
}

// how far out of tune its answer is, in semitones, per stage (whole: in tune)
export const DUMMY_DETUNE = [-0.55, -0.32, -0.17, -0.06, 0]
// scale steps between stages, and the extra drop of the wrecked one
const STAGE_STEPS = 2
const WRECKED_DROP = 12
// the note a whole dummy answers with (it snaps to the zone's scale)
export const DUMMY_TOP = 67

// the answer's pitch (fractional MIDI) for a stage; `walk(from, n)` moves n steps inside the zone's scale
export function dummyAnswerMidi(stage: number, walk: (from: number, n: number) => number) {
  const s = Math.max(0, Math.min(DUMMY_STAGE_MAX, Math.round(stage)))
  const top = walk(DUMMY_TOP, 0)
  const note = walk(top, (s - DUMMY_STAGE_MAX) * STAGE_STEPS) - (s === 0 ? WRECKED_DROP : 0)
  return note + DUMMY_DETUNE[s]
}
