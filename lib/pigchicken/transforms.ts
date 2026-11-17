// Transformations of a rebated note (the guitar hero mode). Every rebatedor (an item now; surfaces and sound zones
// later) carries a chain: a short list applied in order, each with a chance (0..1) and its parameters. A chain turns
// one note into what is played: pitches, voices, little rhythms and ornaments, timbre and dynamics.
// The rule of each note says whose chain counts: the taco's, the ambience's (the stage's fan or the zone), both in
// either order, or none (the note as sequenced).
// Pure functions over plain data; the random number comes from the caller.
import { SCALES, type ScaleId } from './music'
import type { Drum, VoiceId } from './synth'

// one sound of the result: when (s after the rebate's grid point), how long, how loud; a voice or a drum
export type NoteOut = { midi: number; at: number; dur: number; vel: number; voice?: VoiceId; drum?: Drum }
// the harmony a chain works in: the key's root and scale steps, the chord now, seconds per beat
export type Harmony = { root: number; steps: number[]; chord: number[]; spb: number }
export type TransformCtx = Harmony & {
  combo: number
  angle: number // where she aims (screen radians)
  byAngle: (angle: number, octave: number) => number // the note the aim plays (like the instruments)
  rand: () => number
}

export type TransformKind =
  | 'transpose' | 'octave' | 'fixed' | 'snapChord' | 'mirror' | 'walk' | 'byAngle'
  | 'scale' | 'parallel'
  | 'double' | 'voices' | 'counter'
  | 'arpeggio' | 'echo' | 'ratchet' | 'shift'
  | 'ornament' | 'gliss' | 'blue'
  | 'timbre' | 'drum' | 'dynamics'
  | 'combo'
// n and mode mean what TRANSFORMS says for each kind
export type Transform = { kind: TransformKind; chance: number; n: number; mode: string }

type Opt = { value: string; label: string }
export type TransformMeta = {
  label: string; group: string; hint: string
  n?: { label: string; min: number; max: number; step: number; def: number }
  modes?: Opt[]; mode?: string
}
const DRUMS: Opt[] = [
  { value: 'taiko', label: 'Taiko' }, { value: 'wood', label: 'Woodblock' }, { value: 'clap', label: 'Palmas' }, { value: 'snare', label: 'Caixa' },
  { value: 'kick', label: 'Bumbo' }, { value: 'hat', label: 'Chimbal' }, { value: 'jingle', label: 'Platinela' }, { value: 'shaker', label: 'Chocalho' },
]
const VOICES: Opt[] = [
  { value: 'flute', label: 'Flauta' }, { value: 'sax', label: 'Sax' }, { value: 'trumpet', label: 'Trompete' }, { value: 'guitar', label: 'Violão' },
  { value: 'violin', label: 'Violino' }, { value: 'keys', label: 'Teclado' }, { value: 'harp', label: 'Harpa de Lira' }, { value: 'bells', label: 'Sinos' },
  { value: 'guzheng', label: 'Guzheng' }, { value: 'bass', label: 'Baixo' }, { value: 'chip', label: 'Chip' },
]
export const TRANSFORMS: Record<TransformKind, TransformMeta> = {
  transpose: { label: 'Transpor', group: 'Altura', hint: 'Sobe ou desce graus da escala (2 = terça, 4 = quinta, 5 = sexta) ou semitons', n: { label: 'Quanto', min: -12, max: 12, step: 1, def: 2 }, modes: [{ value: 'degree', label: 'graus' }, { value: 'semitone', label: 'semitons' }], mode: 'degree' },
  octave: { label: 'Oitava', group: 'Altura', hint: 'Sobe ou desce oitavas; aleatória sorteia até N para cima ou para baixo', n: { label: 'Oitavas', min: -2, max: 2, step: 1, def: 1 }, modes: [{ value: 'fixed', label: 'fixa' }, { value: 'random', label: 'aleatória' }], mode: 'fixed' },
  fixed: { label: 'Nota fixa', group: 'Altura', hint: 'Troca por uma nota específica (MIDI, 60 = Dó central)', n: { label: 'Nota', min: 24, max: 108, step: 1, def: 60 } },
  snapChord: { label: 'Encaixar no acorde', group: 'Altura', hint: 'Puxa para a nota do acorde atual mais perto' },
  mirror: { label: 'Espelho', group: 'Altura', hint: 'Inverte o intervalo em volta da tônica (melodia de cabeça para baixo)' },
  walk: { label: 'Passeio', group: 'Altura', hint: 'Anda até N graus ao acaso dentro da escala', n: { label: 'Até', min: 1, max: 3, step: 1, def: 1 } },
  byAngle: { label: 'Pelo ângulo do golpe', group: 'Altura', hint: 'A nota sai da direção da mira, como os instrumentos', n: { label: 'Oitava', min: -1, max: 2, step: 1, def: 0 } },
  scale: { label: 'Trocar escala', group: 'Escala', hint: 'Mantém o grau e troca a escala', modes: (Object.keys(SCALES) as ScaleId[]).map((s): Opt => ({ value: s, label: SCALES[s].label })).concat({ value: 'diminished', label: 'Diminuta' }), mode: 'minor' },
  parallel: { label: 'Menor', group: 'Escala', hint: 'Escurece a frase: paralela (Dó maior → Dó menor), relativa (→ Lá menor) ou diminuta', modes: [{ value: 'parallel', label: 'paralela' }, { value: 'relative', label: 'relativa' }, { value: 'diminished', label: 'diminuta' }], mode: 'parallel' },
  double: { label: 'Duplicar', group: 'Vozes', hint: 'Toca de novo N semicolcheias depois', n: { label: 'Semicolcheias', min: 1, max: 4, step: 1, def: 2 } },
  voices: { label: 'Adicionar vozes', group: 'Vozes', hint: 'Monta um acorde em cima da nota', modes: [{ value: 'triad', label: 'tríade' }, { value: 'power', label: 'power chord (5ª)' }, { value: 'sus2', label: 'sus2' }, { value: 'sus4', label: 'sus4' }, { value: 'seventh', label: 'com sétima' }, { value: 'cluster', label: 'cluster' }], mode: 'triad' },
  counter: { label: 'Contracanto', group: 'Vozes', hint: 'Uma segunda voz em terças ou sextas, acima (1) ou abaixo (-1)', n: { label: 'Lado', min: -1, max: 1, step: 2, def: 1 }, modes: [{ value: 'thirds', label: 'terças' }, { value: 'sixths', label: 'sextas' }], mode: 'thirds' },
  arpeggio: { label: 'Arpejar', group: 'Ritmo', hint: 'Espalha as notas juntas ao longo de N batidas', n: { label: 'Batidas', min: 0.05, max: 2, step: 0.05, def: 0.5 }, modes: [{ value: 'up', label: 'sobe' }, { value: 'down', label: 'desce' }, { value: 'updown', label: 'vai e volta' }], mode: 'up' },
  echo: { label: 'Eco', group: 'Ritmo', hint: 'Repetições que diminuem', n: { label: 'Repetições', min: 1, max: 6, step: 1, def: 3 }, modes: [{ value: 'dotted', label: 'colcheia pontuada' }, { value: 'eighth', label: 'colcheia' }, { value: 'triplet', label: 'tercina' }], mode: 'dotted' },
  ratchet: { label: 'Ratchet / rufo', group: 'Ritmo', hint: 'Repetições bem rápidas (fusas)', n: { label: 'Vezes', min: 2, max: 6, step: 1, def: 3 } },
  shift: { label: 'Deslocar', group: 'Ritmo', hint: 'Empurra para o contratempo, a semicolcheia seguinte ou com swing', modes: [{ value: 'offbeat', label: 'contratempo' }, { value: 'sixteenth', label: 'semicolcheia' }, { value: 'swing', label: 'swing' }], mode: 'offbeat' },
  ornament: { label: 'Ornamento', group: 'Enfeite', hint: 'Apojatura, trinado, mordente ou notas de passagem', modes: [{ value: 'appoggiatura', label: 'apojatura' }, { value: 'trill', label: 'trinado' }, { value: 'mordent', label: 'mordente' }, { value: 'passing', label: 'passagem' }], mode: 'appoggiatura' },
  gliss: { label: 'Glissando', group: 'Enfeite', hint: 'Desliza pela escala até a nota', n: { label: 'Notas', min: 2, max: 8, step: 1, def: 4 }, modes: [{ value: 'up', label: 'de baixo' }, { value: 'down', label: 'de cima' }], mode: 'up' },
  blue: { label: 'Blue note', group: 'Enfeite', hint: 'Dobra a terça e/ou a sétima um quarto de tom para baixo', modes: [{ value: 'both', label: 'terça e sétima' }, { value: 'third', label: 'terça' }, { value: 'seventh', label: 'sétima' }], mode: 'both' },
  timbre: { label: 'Trocar timbre', group: 'Som', hint: 'Muda a voz da nota', modes: VOICES, mode: 'bells' },
  drum: { label: 'Percussão', group: 'Som', hint: 'Troca a nota por um tambor (0) ou soma o tambor a ela (1)', n: { label: 'Somar', min: 0, max: 1, step: 1, def: 0 }, modes: DRUMS, mode: 'taiko' },
  dynamics: { label: 'Dinâmica e duração', group: 'Som', hint: 'Acento, mais fraca, staccato, legato ou sustentar', modes: [{ value: 'accent', label: 'acento' }, { value: 'soft', label: 'mais fraca' }, { value: 'staccato', label: 'staccato' }, { value: 'legato', label: 'legato' }, { value: 'sustain', label: 'sustentar' }], mode: 'accent' },
  combo: { label: 'Pelo combo', group: 'Jogo', hint: 'A cada N de combo, uma oitava acima ou mais vozes', n: { label: 'A cada', min: 2, max: 32, step: 1, def: 8 }, modes: [{ value: 'octave', label: 'oitava' }, { value: 'voices', label: 'vozes' }], mode: 'octave' },
}
export const TRANSFORM_KINDS = Object.keys(TRANSFORMS) as TransformKind[]
export const isTransformKind = (v: unknown): v is TransformKind => typeof v === 'string' && v in TRANSFORMS
// a new transformation with its defaults
export function newTransform(kind: TransformKind, chance = 1): Transform {
  const m = TRANSFORMS[kind]
  return { kind, chance, n: m.n?.def ?? 0, mode: m.mode ?? '' }
}
// a saved transformation, checked (null if it is not one)
export function cleanTransform(v: unknown): Transform | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!isTransformKind(o.kind)) return null
  const m = TRANSFORMS[o.kind], t = newTransform(o.kind)
  if (typeof o.chance === 'number' && Number.isFinite(o.chance)) t.chance = Math.max(0, Math.min(1, o.chance))
  if (m.n && typeof o.n === 'number' && Number.isFinite(o.n)) t.n = Math.max(m.n.min, Math.min(m.n.max, o.n))
  if (m.modes && typeof o.mode === 'string' && m.modes.some(x => x.value === o.mode)) t.mode = o.mode
  return t
}
export const CHAIN_MAX = 8

// ---------- the scale ----------
const DIMINISHED = [0, 2, 3, 5, 6, 8, 9, 11]
const pc = (m: number) => ((m % 12) + 12) % 12
const stepsOf = (s: string): number[] => s === 'diminished' ? DIMINISHED : SCALES[s as ScaleId]?.steps ?? SCALES.major.steps
// a note's place in a scale: degree (0..), octave and how far off the scale it is (semitones, for notes outside it)
export function degreeOf(h: Pick<Harmony, 'root' | 'steps'>, m: number) {
  const rel = m - h.root, oct = Math.floor(rel / 12), p = rel - oct * 12
  let best = 0
  h.steps.forEach((s, i) => { if (Math.abs(s - p) < Math.abs(h.steps[best] - p)) best = i })
  return { degree: best, octave: oct, off: p - h.steps[best] }
}
// the note `n` degrees away in the scale
export function noteAtDegree(h: Pick<Harmony, 'root' | 'steps'>, degree: number, octave: number) {
  const len = h.steps.length, k = Math.floor(degree / len), d = degree - k * len
  return h.root + 12 * (octave + k) + h.steps[d]
}
export function stepScale(h: Pick<Harmony, 'root' | 'steps'>, m: number, n: number) {
  const d = degreeOf(h, m)
  return noteAtDegree(h, d.degree + n, d.octave) + d.off
}
// the nearest note of the scale (ties go up)
export function fitScale(h: Pick<Harmony, 'root' | 'steps'>, m: number) {
  const base = Math.round(m)
  for (let k = 0; k <= 6; k++) for (const c of [base + k, base - k]) {
    if (h.steps.includes(pc(c - h.root))) return c + (m - base)
  }
  return m
}

// ---------- the transformations ----------
const pitched = (o: NoteOut) => !o.drum
const add = (out: NoteOut[], o: NoteOut, extra: Partial<NoteOut>) => out.push({ ...o, ...extra })

function applyOne(notes: NoteOut[], t: Transform, c: TransformCtx): NoteOut[] {
  const spb = c.spb, out: NoteOut[] = []
  const map = (f: (o: NoteOut) => Partial<NoteOut> | null) => notes.map(o => pitched(o) ? { ...o, ...(f(o) ?? {}) } : o)
  switch (t.kind) {
    case 'transpose': return map(o => ({ midi: t.mode === 'semitone' ? o.midi + t.n : stepScale(c, o.midi, t.n) }))
    case 'octave': {
      const k = t.mode === 'random' ? Math.round((c.rand() * 2 - 1) * Math.abs(t.n || 1)) : t.n
      return map(o => ({ midi: o.midi + 12 * k }))
    }
    case 'fixed': return map(() => ({ midi: t.n }))
    case 'snapChord': return map(o => {
      let best = o.midi, bd = Infinity
      for (let m = Math.round(o.midi) - 7; m <= Math.round(o.midi) + 7; m++) if (c.chord.some(x => pc(x) === pc(m)) && Math.abs(m - o.midi) < bd) { bd = Math.abs(m - o.midi); best = m }
      return { midi: best }
    })
    case 'mirror': {
      return map(o => {
        const pivot = c.root + 12 * Math.round((o.midi - c.root) / 12)
        return { midi: fitScale(c, pivot - (o.midi - pivot)) }
      })
    }
    case 'walk': return map(o => {
      const k = Math.max(1, Math.round(t.n)), s = Math.floor(c.rand() * (2 * k + 1)) - k
      return { midi: stepScale(c, o.midi, s) }
    })
    case 'byAngle': return map(() => ({ midi: c.byAngle(c.angle, t.n) }))
    case 'scale':
    case 'parallel': {
      const target = t.kind === 'scale' ? stepsOf(t.mode) : t.mode === 'diminished' ? DIMINISHED : SCALES.minor.steps
      const root = t.kind === 'parallel' && t.mode === 'relative' ? c.root - 3 : c.root
      return map(o => {
        const d = degreeOf(c, o.midi)
        const deg = Math.round(d.degree * target.length / c.steps.length)
        return { midi: noteAtDegree({ root, steps: target }, deg, d.octave) }
      })
    }
    case 'double':
      notes.forEach(o => { out.push(o); add(out, o, { at: o.at + Math.max(1, t.n) * spb / 4, vel: o.vel * 0.8 }) })
      return out
    case 'voices': {
      const on: Record<string, (m: number) => number[]> = {
        triad: m => [stepScale(c, m, 2), stepScale(c, m, 4)],
        power: m => [m + 7],
        sus2: m => [m + 2, m + 7],
        sus4: m => [m + 5, m + 7],
        seventh: m => [stepScale(c, m, 2), stepScale(c, m, 4), stepScale(c, m, 6)],
        cluster: m => [stepScale(c, m, 1), stepScale(c, m, 2)],
      }
      const f = on[t.mode] ?? on.triad
      notes.forEach(o => { out.push(o); if (pitched(o)) f(o.midi).forEach(m => add(out, o, { midi: m, vel: o.vel * 0.75 })) })
      return out
    }
    case 'counter': {
      const k = (t.mode === 'sixths' ? 5 : 2) * (t.n < 0 ? -1 : 1)
      notes.forEach(o => { out.push(o); if (pitched(o)) add(out, o, { midi: stepScale(c, o.midi, k), vel: o.vel * 0.7 }) })
      return out
    }
    case 'arpeggio': {
      // the notes that sound together are spread over the span, in order
      const groups = new Map<number, NoteOut[]>()
      notes.forEach(o => { const key = Math.round(o.at * 1000); groups.set(key, [...(groups.get(key) ?? []), o]) })
      for (const g of groups.values()) {
        const ps = g.filter(pitched).sort((a, b) => a.midi - b.midi)
        g.filter(o => !pitched(o)).forEach(o => out.push(o))
        const seq = t.mode === 'down' ? ps.slice().reverse() : t.mode === 'updown' ? ps.concat(ps.slice(0, -1).reverse().slice(0, Math.max(0, ps.length - 2))) : ps
        const gap = seq.length > 1 ? t.n * spb / seq.length : 0
        seq.forEach((o, i) => add(out, o, { at: o.at + i * gap }))
      }
      return out
    }
    case 'echo': {
      const gap = t.mode === 'eighth' ? spb / 2 : t.mode === 'triplet' ? spb / 3 : spb * 0.75
      notes.forEach(o => { out.push(o); for (let k = 1; k <= Math.round(t.n); k++) add(out, o, { at: o.at + k * gap, vel: o.vel * Math.pow(0.6, k) }) })
      return out
    }
    case 'ratchet': {
      const gap = spb / 8
      notes.forEach(o => { for (let k = 0; k < Math.max(2, Math.round(t.n)); k++) add(out, o, { at: o.at + k * gap, dur: Math.min(o.dur, gap * 0.9), vel: o.vel * (k === 0 ? 1 : 0.75) }) })
      return out
    }
    case 'shift': {
      const d = t.mode === 'sixteenth' ? spb / 4 : t.mode === 'swing' ? spb / 6 : spb / 2
      return notes.map(o => ({ ...o, at: o.at + d }))
    }
    case 'ornament': {
      const g = spb / 8
      notes.forEach(o => {
        if (!pitched(o)) { out.push(o); return }
        const up = stepScale(c, o.midi, 1), down = stepScale(c, o.midi, -1)
        if (t.mode === 'trill') { for (let k = 0; k < 4; k++) add(out, o, { midi: k % 2 ? up : o.midi, at: o.at + k * g, dur: g }); add(out, o, { at: o.at + 4 * g }) }
        else if (t.mode === 'mordent') { add(out, o, { dur: g }); add(out, o, { midi: up, at: o.at + g, dur: g }); add(out, o, { at: o.at + 2 * g }) }
        else if (t.mode === 'passing') { add(out, o, { midi: stepScale(c, o.midi, -2), dur: g, vel: o.vel * 0.7 }); add(out, o, { midi: down, at: o.at + g, dur: g, vel: o.vel * 0.8 }); add(out, o, { at: o.at + 2 * g }) }
        else { add(out, o, { midi: up, dur: g, vel: o.vel * 0.8 }); add(out, o, { at: o.at + g }) }
      })
      return out
    }
    case 'gliss': {
      const n = Math.max(2, Math.round(t.n)), g = spb / 16, dir = t.mode === 'down' ? 1 : -1
      notes.forEach(o => {
        if (!pitched(o)) { out.push(o); return }
        for (let k = n; k >= 1; k--) add(out, o, { midi: stepScale(c, o.midi, dir * k), at: o.at + (n - k) * g, dur: g * 1.5, vel: o.vel * 0.55 })
        add(out, o, { at: o.at + n * g })
      })
      return out
    }
    case 'blue': return map(o => {
      const i = pc(Math.round(o.midi) - c.root)
      const third = i === 3 || i === 4, seventh = i === 10 || i === 11
      const bend = (third && t.mode !== 'seventh') || (seventh && t.mode !== 'third')
      return bend ? { midi: o.midi - 0.5 } : null
    })
    case 'timbre': return map(() => ({ voice: t.mode as VoiceId }))
    case 'drum':
      notes.forEach(o => { if (t.n >= 1 || !pitched(o)) out.push(o); if (pitched(o)) add(out, o, { drum: t.mode as Drum, voice: undefined }) })
      return out
    case 'dynamics': {
      const f: Record<string, (o: NoteOut) => Partial<NoteOut>> = {
        accent: o => ({ vel: Math.min(1, o.vel * 1.35) }), soft: o => ({ vel: o.vel * 0.55 }),
        staccato: o => ({ dur: o.dur * 0.35 }), legato: o => ({ dur: o.dur * 1.8 }), sustain: o => ({ dur: o.dur * 4 }),
      }
      const g = f[t.mode] ?? f.accent
      return notes.map(o => ({ ...o, ...g(o) }))
    }
    case 'combo': {
      const tier = Math.min(2, Math.floor(c.combo / Math.max(1, t.n)))
      if (tier <= 0) return notes
      if (t.mode === 'voices') {
        notes.forEach(o => { out.push(o); if (pitched(o)) { add(out, o, { midi: o.midi + 7, vel: o.vel * 0.7 }); if (tier > 1) add(out, o, { midi: o.midi + 12, vel: o.vel * 0.6 }) } })
        return out
      }
      return map(o => ({ midi: o.midi + 12 * tier }))
    }
  }
}

// the chain applied in order; each transformation happens with its chance. The result is capped (a long chain of
// doublings could pile up hundreds of notes)
export const NOTES_MAX = 24
export function applyChain(notes: NoteOut[], chain: Transform[], c: TransformCtx): NoteOut[] {
  let cur = notes
  for (const t of chain.slice(0, CHAIN_MAX)) {
    if (t.chance < 1 && c.rand() >= t.chance) continue
    cur = applyOne(cur, t, c).slice(0, NOTES_MAX)
  }
  return cur
}

// ---------- the note's rule: whose transformations count ----------
export type RebateRule = 'taco' | 'ambiente' | 'taco-ambiente' | 'ambiente-taco' | 'travada'
export const REBATE_RULES: { value: RebateRule; label: string; hint: string }[] = [
  { value: 'taco', label: 'Só taco', hint: 'Só a cadeia do item que rebateu' },
  { value: 'ambiente', label: 'Só ambiente', hint: 'Só o lugar onde o rebate aconteceu (o leque da fase ou a zona)' },
  { value: 'taco-ambiente', label: 'Taco, depois ambiente', hint: 'O taco transforma e o lugar ajusta à escala dele' },
  { value: 'ambiente-taco', label: 'Ambiente, depois taco', hint: 'O lugar fixa a nota base e o taco enfeita' },
  { value: 'travada', label: 'Travada', hint: 'Toca exatamente a nota sequenciada' },
]
export const DEFAULT_RULE: RebateRule = 'taco-ambiente'
export const isRebateRule = (v: unknown): v is RebateRule => REBATE_RULES.some(r => r.value === v)

// the ambience where a note was rebated: a base note it forces (a lane of the stage's fan or of the map's fixed
// lanes), the scale it fits to and the zone's own chain of transformations
export type NoteEnv = { base: number | null; fit: Pick<Harmony, 'root' | 'steps'> | null; chain?: Transform[] }

// what a rebated note plays: its sequenced pitch through the ambience and the taco, in the order its rule says.
// The ambience: the base note, then the zone's chain, then its scale.
export function rebateSound(seq: NoteOut, rule: RebateRule, chain: Transform[], env: NoteEnv, c: TransformCtx): NoteOut[] {
  const fit = (notes: NoteOut[]) => env.fit ? notes.map(o => o.drum ? o : { ...o, midi: fitScale(env.fit!, o.midi) }) : notes
  const ambience = (notes: NoteOut[]) => fit(env.chain?.length ? applyChain(notes, env.chain, c) : notes)
  const based = { ...seq, midi: env.base ?? seq.midi }
  switch (rule) {
    case 'travada': return [seq]
    case 'taco': return applyChain([seq], chain, c)
    case 'ambiente': return ambience([based])
    case 'ambiente-taco': return applyChain(ambience([based]), chain, c)
    default: return ambience(applyChain([seq], chain, c))
  }
}
