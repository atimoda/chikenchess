// A Zona sonora one step at a time: what each tag of its label moves to on a click, and the "padrões de mudança"
// (what a zone with walls turns into when its life runs out). Pure data and functions; sound-zones.ts normalizes
// the results, the tags (components/pigchicken/zone-tags.tsx) and the Parquinho call them.
// To add a pattern: one entry in ZONE_CHANGES (id, label, group, hint, apply).
import { DEGREE_COLORS, SCALES, ZONES, type Feel, type ScaleId } from './music'
import { CHAIN_MAX, newTransform, type Transform, type TransformKind } from './transforms'
import { BIRD_IDS, type BirdId } from './birds'
// type only: sound-zones imports this file
import type { SoundZoneParams } from './sound-zones'

export const ZONE_BPM = { min: 40, max: 200 }
// the zone's life: how many notes its walls take before it changes (0: no walls)
export const ZONE_LIFE = { min: 0, max: 60 }
export const SCALE_IDS = Object.keys(SCALES) as ScaleId[]
export const CHORD_SCALES = SCALE_IDS.filter(s => SCALES[s].steps.length === 7)
export const FEELS: Feel[] = ['straight', 'swing', 'half']
export const FEEL_LABELS: Record<Feel, string> = { straight: 'Reto', swing: 'Swing', half: 'Meio tempo' }
export const pcOf = (m: number) => ((m % 12) + 12) % 12
// a key picked by name sits around the middle of the keyboard (Fá♯3 … Fá4), like the scenes' zones
export const rootOf = (pc: number) => 54 + ((pcOf(pc) - 6 + 12) % 12)

// popular progressions (scale degrees from 0, one chord per bar); the Progressão tag steps down this list
export const PROGRESSIONS: { label: string; degrees: number[] }[] = [
  { label: 'Pedal na tônica', degrees: [0] },
  { label: 'I ii (flutuante)', degrees: [0, 1, 0, 1] },
  { label: 'Vamp i iv', degrees: [0, 3, 0, 3] },
  { label: 'I IV V IV', degrees: [0, 3, 4, 3] },
  { label: 'I V vi IV (pop)', degrees: [0, 4, 5, 3] },
  { label: 'vi IV I V', degrees: [5, 3, 0, 4] },
  { label: 'I vi IV V (anos 50)', degrees: [0, 5, 3, 4] },
  { label: 'ii V I', degrees: [1, 4, 0, 0] },
  { label: 'Andaluza', degrees: [0, 6, 5, 4] },
  { label: 'I bVII IV I', degrees: [0, 6, 3, 0] },
  { label: 'Cânone', degrees: [0, 4, 5, 2, 3, 0, 3, 4] },
  { label: 'Blues de 12', degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] },
]
const sameList = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])
export const progressionIndex = (p: number[]) => PROGRESSIONS.findIndex(x => sameList(x.degrees, p))
// "1 5 6 4"
export const progressionText = (p: number[]) => p.map(d => d + 1).join(' ')

// the colours the Cor tag steps through: the scenes' and the degrees'
export const ZONE_COLORS = [...new Set([...ZONES.map(z => z.color), ...DEGREE_COLORS])]

// the ambience chains the Cadeia tag steps through: none, then one step of each of these
export const CHAIN_STEPS: TransformKind[] = ['transpose', 'octave', 'echo', 'counter', 'voices', 'arpeggio', 'mirror', 'ornament', 'blue']

const after = <T,>(list: readonly T[], v: T, by = 1) => list[(((list.indexOf(v) + by) % list.length) + list.length) % list.length]

// ---------- one click on a tag ----------

export const ZONE_STEP = {
  root: (z: SoundZoneParams): Partial<SoundZoneParams> => ({ root: rootOf(pcOf(z.root) + 1) }),
  scale: (z: SoundZoneParams): Partial<SoundZoneParams> => ({ scale: after(SCALE_IDS, z.scale) }),
  chordScale: (z: SoundZoneParams): Partial<SoundZoneParams> => ({ chordScale: after(CHORD_SCALES, z.chordScale) }),
  feel: (z: SoundZoneParams): Partial<SoundZoneParams> => ({ feel: after(FEELS, z.feel) }),
  // the progression counts down: a custom one goes to the last of the list, the first goes back to the last
  progression: (z: SoundZoneParams): Partial<SoundZoneParams> => {
    const i = progressionIndex(z.progression)
    return { progression: PROGRESSIONS[i <= 0 ? PROGRESSIONS.length - 1 : i - 1].degrees.slice() }
  },
  music: (z: SoundZoneParams): Partial<SoundZoneParams> => ({ music: !z.music }),
  // none (the scene's), then each bird alone, then none again
  birds: (z: SoundZoneParams): Partial<SoundZoneParams> => {
    const list: BirdId[][] = [[], ...BIRD_IDS.map(b => [b])]
    const i = list.findIndex(l => l.length === z.birds.length && l.every(b => z.birds.includes(b)))
    return { birds: list[i < 0 ? 0 : (i + 1) % list.length] }
  },
  chain: (z: SoundZoneParams): Partial<SoundZoneParams> => {
    const i = z.chain.length === 1 ? CHAIN_STEPS.indexOf(z.chain[0].kind) : z.chain.length ? -2 : -1
    if (i === -2 || i === CHAIN_STEPS.length - 1) return { chain: [] }
    return { chain: [newTransform(CHAIN_STEPS[i + 1])] }
  },
  color: (z: SoundZoneParams): Partial<SoundZoneParams> => ({ color: ZONE_COLORS.includes(z.color) ? after(ZONE_COLORS, z.color) : ZONE_COLORS[0] }),
  change: (z: SoundZoneParams): Partial<SoundZoneParams> => ({ change: after(ZONE_CHANGE_IDS, z.change) }),
}

// ---------- the change patterns ----------

export type ZoneChangeId =
  | 'random' | 'doubleTime' | 'accelerando' | 'feel'
  | 'keyUp' | 'fifths' | 'relative' | 'parallel' | 'modal' | 'progression' | 'retrograde'
  | 'penta' | 'mirror' | 'counter' | 'octave'
export type ZoneChange = {
  id: ZoneChangeId; label: string; group: 'Geral' | 'Ritmo' | 'Harmonia' | 'Melodia'; hint: string
  apply: (z: SoundZoneParams, rnd: () => number) => Partial<SoundZoneParams>
}

const MINORISH: ScaleId[] = ['minorPenta', 'minor', 'dorian', 'harmonicMinor', 'blues']
const MODES: ScaleId[] = ['major', 'lydian', 'mixolydian', 'dorian', 'minor']
// a key moved by semitones stays between Dó3 and Dó5
const keyBy = (root: number, n: number) => { let r = root + n; while (r > 72) r -= 12; while (r < 48) r += 12; return r }
const pick = <T,>(list: readonly T[], rnd: () => number) => list[Math.min(list.length - 1, Math.floor(rnd() * list.length))]
// one step added to the ambience chain, or taken out when it is already there
function toggleStep(chain: Transform[], step: Transform): Transform[] {
  const at = chain.findIndex(t => t.kind === step.kind)
  if (at >= 0) return chain.filter((_, i) => i !== at)
  return [...chain, step].slice(-CHAIN_MAX)
}
// the relative or the parallel key, and its major or minor scales
function flipMode(z: SoundZoneParams, relative: boolean): Partial<SoundZoneParams> {
  const minor = MINORISH.includes(z.scale)
  const scale: ScaleId = minor ? (z.scale === 'minorPenta' || z.scale === 'blues' ? 'majorPenta' : 'major') : (z.scale === 'majorPenta' ? 'minorPenta' : 'minor')
  return { root: relative ? keyBy(z.root, minor ? 3 : -3) : z.root, scale, chordScale: minor ? 'major' : 'minor' }
}

export const ZONE_CHANGES: ZoneChange[] = [
  { id: 'random', label: 'Random', group: 'Geral', hint: 'Embaralha tom, escalas, andamento, balanço e progressão',
    apply: (_z, rnd) => ({
      root: rootOf(Math.floor(rnd() * 12)), scale: pick(SCALE_IDS, rnd), chordScale: pick(CHORD_SCALES, rnd),
      bpm: 60 + 2 * Math.floor(rnd() * 46), feel: pick(FEELS, rnd), progression: pick(PROGRESSIONS, rnd).degrees.slice(),
    }) },
  { id: 'doubleTime', label: 'Tempo dobrado', group: 'Ritmo', hint: 'Dobra o andamento (ou corta pela metade quando passaria do limite)',
    apply: z => ({ bpm: z.bpm * 2 <= ZONE_BPM.max ? z.bpm * 2 : Math.round(z.bpm / 2) }) },
  { id: 'accelerando', label: 'Acelerando', group: 'Ritmo', hint: 'Mais 10 bpm a cada morte; passando de 200 volta a 70',
    apply: z => ({ bpm: z.bpm + 10 > ZONE_BPM.max ? 70 : z.bpm + 10 }) },
  { id: 'feel', label: 'Troca de levada', group: 'Ritmo', hint: 'Reto → swing → meio tempo',
    apply: z => ({ feel: after(FEELS, z.feel) }) },
  { id: 'keyUp', label: 'Sobe meio tom', group: 'Harmonia', hint: 'Modulação de um semitom acima (a do final da música pop)',
    apply: z => ({ root: keyBy(z.root, 1) }) },
  { id: 'fifths', label: 'Ciclo de quintas', group: 'Harmonia', hint: 'Muda o tom uma quinta acima',
    apply: z => ({ root: keyBy(z.root, 7) }) },
  { id: 'relative', label: 'Relativa maior/menor', group: 'Harmonia', hint: 'Dó maior ↔ Lá menor',
    apply: z => flipMode(z, true) },
  { id: 'parallel', label: 'Homônima maior/menor', group: 'Harmonia', hint: 'Dó maior ↔ Dó menor',
    apply: z => flipMode(z, false) },
  { id: 'modal', label: 'Troca de modo', group: 'Harmonia', hint: 'Maior → lídio → mixolídio → dórico → menor (os acordes; a escala também se tiver 7 notas)',
    apply: z => { const mode = after(MODES, MODES.includes(z.chordScale) ? z.chordScale : 'minor'); return SCALES[z.scale].steps.length === 7 ? { chordScale: mode, scale: mode } : { chordScale: mode } } },
  { id: 'progression', label: 'Próxima progressão', group: 'Harmonia', hint: 'Passa para a próxima progressão da lista',
    apply: z => { const i = progressionIndex(z.progression); return { progression: PROGRESSIONS[(i + 1) % PROGRESSIONS.length].degrees.slice() } } },
  { id: 'retrograde', label: 'Progressão retrógrada', group: 'Harmonia', hint: 'Toca a progressão de trás para a frente',
    apply: z => ({ progression: z.progression.slice().reverse() }) },
  { id: 'penta', label: 'Penta ↔ diatônica', group: 'Melodia', hint: 'Pentatônica vira a escala de 7 notas e vice-versa',
    apply: z => ({ scale: z.scale === 'majorPenta' ? 'major' : z.scale === 'minorPenta' ? 'minor' : z.scale === 'blues' ? 'minorPenta' : MINORISH.includes(z.scale) ? 'minorPenta' : 'majorPenta' }) },
  { id: 'mirror', label: 'Espelho melódico', group: 'Melodia', hint: 'Liga ou desliga o espelho na cadeia do ambiente (melodia de cabeça para baixo)',
    apply: z => ({ chain: toggleStep(z.chain, newTransform('mirror')) }) },
  { id: 'counter', label: 'Contracanto', group: 'Melodia', hint: 'Liga ou desliga uma segunda voz em terças na cadeia do ambiente',
    apply: z => ({ chain: toggleStep(z.chain, newTransform('counter')) }) },
  { id: 'octave', label: 'Oitava acima', group: 'Melodia', hint: 'Liga ou desliga uma oitava acima na cadeia do ambiente',
    apply: z => ({ chain: toggleStep(z.chain, newTransform('octave')) }) },
]
export const ZONE_CHANGE_IDS = ZONE_CHANGES.map(c => c.id)
export const isZoneChange = (v: unknown): v is ZoneChangeId => typeof v === 'string' && (ZONE_CHANGE_IDS as string[]).includes(v)
export const zoneChange = (id: ZoneChangeId) => ZONE_CHANGES.find(c => c.id === id) ?? ZONE_CHANGES[0]
