// The Escalas editor's numbers, one set per instrument scale (lib/pigchicken/instrument-scales.ts). Every scale has
// its standby: after `standbyAfter` seconds with nobody playing it, the Escalas layer fades over `fadeTime` seconds
// down to `standbyVis` (0..100% of the layer), and the cell the aim is on keeps `aimedVis` more (0: it fades with the
// rest). The round charts also have their own shape: `ringSplit` (the reach where the inner ring ends and the outer
// begins) and `hole` (the empty middle, drawing only); the Campo harmônico has its `hole`. The Cordas soltas have
// how many strings there are, where along the radius they start and end, and how wide the harmonic's place in
// their middle is. The Estrela has how long its arms are (cells from the middle to a tip).
// Saved in this browser (like the Itens panel); "Salvar no game" writes data/pigchicken/default-scales.json.
import DEFAULTS_FILE from '../../data/pigchicken/default-scales.json'
import { CHART_HOLE, INSTRUMENT_SCALES, INSTRUMENT_SCALE_IDS, RING_SPLIT, STRINGS_DEFAULT, STRINGS_MAX, STRINGS_MIN, type InstrumentScaleId } from './instrument-scales'
import { STAR_ARM_DEFAULT, STAR_ARM_MAX, STAR_ARM_MIN } from './star-grid'

export type ScaleParams = { standbyAfter: number; fadeTime: number; standbyVis: number; aimedVis: number; ringSplit: number; hole: number; strings: number; stringStart: number; stringEnd: number; harmonicWidth: number; starArm: number }
export type ScaleParamKey = keyof ScaleParams
export type ScaleParamMeta = { key: ScaleParamKey; label: string; min: number; max: number; step: number; unit: string; group: string; hint?: string; only?: InstrumentScaleId[] }

export const SCALE_PARAM_GROUPS = ['Standby', 'Forma'] as const
export const SCALE_PARAM_META: ScaleParamMeta[] = [
  { key: 'standbyAfter', label: 'Fade out (standby) depois de', min: 0.1, max: 3, step: 0.1, unit: 's', group: 'Standby', hint: 'Tempo sem tocar o instrumento até a escala começar a sumir' },
  { key: 'fadeTime', label: 'Tempo do fade out', min: 0.1, max: 5, step: 0.1, unit: 's', group: 'Standby', hint: 'Quanto o fade out dura' },
  { key: 'standbyVis', label: 'Visibilidade em standby', min: 0, max: 100, step: 1, unit: '%', group: 'Standby', hint: 'Quanto da camada Escalas fica visível depois do fade out' },
  { key: 'aimedVis', label: 'Visibilidade da célula mirada', min: 0, max: 100, step: 1, unit: '%', group: 'Standby', hint: 'Quanto a célula da mira fica acima do resto em standby; 0 = some junto com a escala' },
  { key: 'ringSplit', label: 'Divisa dos anéis', min: 0.3, max: 0.9, step: 0.05, unit: '', group: 'Forma', hint: 'Até onde vai o anel de dentro (fração do raio e do alcance da mira)', only: ['fifths', 'tension'] },
  { key: 'hole', label: 'Miolo vazio', min: 0, max: 0.5, step: 0.01, unit: '', group: 'Forma', hint: 'O vazio do meio (fração do raio); só o desenho', only: ['fifths', 'tension', 'harmonic'] },
  { key: 'strings', label: 'Cordas', min: STRINGS_MIN, max: STRINGS_MAX, step: 1, unit: '', group: 'Forma', hint: 'Quantas cordas a harpa tem (uma por nota, a partir de um Dó)', only: ['strings'] },
  { key: 'stringStart', label: 'Começo das cordas', min: 0.1, max: 0.45, step: 0.01, unit: '', group: 'Forma', hint: 'Onde as cordas começam (fração do raio); abaixo disso, o toque é o bemol da corda', only: ['strings'] },
  { key: 'stringEnd', label: 'Fim das cordas', min: 0.6, max: 0.95, step: 0.01, unit: '', group: 'Forma', hint: 'Onde as cordas terminam (fração do raio); acima disso, o toque é o sustenido da corda', only: ['strings'] },
  { key: 'starArm', label: 'Pontas da estrela', min: STAR_ARM_MIN, max: STAR_ARM_MAX, step: 1, unit: '', group: 'Forma', hint: 'Quantos passos longos vão do meio até cada ponta; maior = mais notas (8: a extensão do piano), menor = casas maiores', only: ['star'] },
  { key: 'harmonicWidth', label: 'Largura do harmônico', min: 0.02, max: 0.2, step: 0.01, unit: '', group: 'Forma', hint: 'Tamanho do ponto no meio da corda onde o toque sai como harmônico (fração do raio)', only: ['strings'] },
]
export const scaleParamApplies = (m: ScaleParamMeta, id: InstrumentScaleId) => !m.only || m.only.includes(id)

const BASE: ScaleParams = { standbyAfter: 0.5, fadeTime: 1.5, standbyVis: 0, aimedVis: 33, ringSplit: RING_SPLIT, hole: CHART_HOLE, ...STRINGS_DEFAULT, starArm: STAR_ARM_DEFAULT }
const CODE_SCALES = Object.fromEntries(INSTRUMENT_SCALE_IDS.map(id => [id, { ...BASE }])) as Record<InstrumentScaleId, ScaleParams>

const decimals = (step: number) => (String(step).split('.')[1] ?? '').length
const clean = (m: ScaleParamMeta, v: unknown, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Number((Math.round(Math.max(m.min, Math.min(m.max, v)) / m.step) * m.step).toFixed(decimals(m.step))) : d
function over(base: Record<InstrumentScaleId, ScaleParams>, raw: unknown): Record<InstrumentScaleId, ScaleParams> {
  const out = structuredClone(base)
  if (!raw || typeof raw !== 'object') return out
  INSTRUMENT_SCALE_IDS.forEach(id => {
    const s = (raw as Record<string, unknown>)[id]
    if (!s || typeof s !== 'object') return
    SCALE_PARAM_META.filter(m => scaleParamApplies(m, id)).forEach(m => { out[id][m.key] = clean(m, (s as Record<string, unknown>)[m.key], out[id][m.key]) })
  })
  return out
}

/** The game's default scale numbers: the code's, with data/pigchicken/default-scales.json over them. */
export const DEFAULT_SCALES = over(CODE_SCALES, DEFAULTS_FILE)

/** The defaults file's content (what "Salvar no game" writes). */
export const scalesDefaultsFile = (scales: Record<InstrumentScaleId, ScaleParams>) =>
  Object.fromEntries(INSTRUMENT_SCALE_IDS.map(id => [id, Object.fromEntries(SCALE_PARAM_META.filter(m => scaleParamApplies(m, id)).map(m => [m.key, scales[id][m.key]]))]))

/** Why a defaults file is not valid (an unknown scale or field, or a value the game would change), or null. */
export function scalesFileProblem(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'O arquivo precisa ser um objeto com um campo por escala.'
  const applied = over(CODE_SCALES, value)
  for (const [id, fields] of Object.entries(value)) {
    if (!(INSTRUMENT_SCALE_IDS as string[]).includes(id)) return `${id}: escala desconhecida.`
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return `${id}: precisa ser um objeto.`
    for (const [key, v] of Object.entries(fields)) {
      if (!SCALE_PARAM_META.some(m => m.key === key && scaleParamApplies(m, id as InstrumentScaleId))) return `${id}.${key}: campo desconhecido.`
      if (applied[id as InstrumentScaleId][key as ScaleParamKey] !== v) return `${id}.${key}: valor inválido ou fora dos limites.`
    }
  }
  return null
}

// the shape numbers go to the scales themselves (the charts' ring split decides which ring the aim plays)
function apply(scales: Record<InstrumentScaleId, ScaleParams>) {
  INSTRUMENT_SCALE_IDS.forEach(id => { const p = scales[id]; INSTRUMENT_SCALES[id].shape = { ringSplit: p.ringSplit, hole: p.hole, strings: p.strings, stringStart: p.stringStart, stringEnd: p.stringEnd, harmonicWidth: p.harmonicWidth, starArm: p.starArm } })
}

const STORE = 'pigchicken-scales-v1'
const EVENT = 'pigchicken-scales'
let live: Record<InstrumentScaleId, ScaleParams> | null = null

export function loadScaleParams(): Record<InstrumentScaleId, ScaleParams> {
  let out = structuredClone(DEFAULT_SCALES)
  try { out = over(DEFAULT_SCALES, JSON.parse(window.localStorage.getItem(STORE) || 'null')) } catch { /* storage unavailable */ }
  return out
}

/** The numbers in use now (this browser's, loaded once). */
export function scaleParams(): Record<InstrumentScaleId, ScaleParams> {
  if (!live) { live = typeof window === 'undefined' ? structuredClone(DEFAULT_SCALES) : loadScaleParams(); apply(live) }
  return live
}

export function saveScaleParams(scales: Record<InstrumentScaleId, ScaleParams>) {
  live = structuredClone(scales)
  apply(live)
  try { window.localStorage.setItem(STORE, JSON.stringify(scales)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribeScaleParams(onChange: (scales: Record<InstrumentScaleId, ScaleParams>) => void) {
  const handler = () => onChange(scaleParams())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

// The scale the main player's instrument is on in the Pátio, announced when it changes (the Escalas panel follows it)
let heldScale: InstrumentScaleId | null = null
const HELD_EVENT = 'pigchicken-held-scale'
export function announceHeldScale(id: InstrumentScaleId | null) {
  if (id === heldScale) return
  heldScale = id
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HELD_EVENT, { detail: id }))
}
export function subscribeHeldScale(onChange: (id: InstrumentScaleId | null) => void) {
  const handler = (e: Event) => onChange((e as CustomEvent<InstrumentScaleId | null>).detail)
  window.addEventListener(HELD_EVENT, handler)
  return () => window.removeEventListener(HELD_EVENT, handler)
}

// ---------- standby: how much of the layer shows, per player ----------
export type StandbyState = { idle: number; key: string; level: number }
export const newStandby = (): StandbyState => ({ idle: 0, key: '', level: 1 })
// coming back from standby takes this long (s): quick, but not a pop
const WAKE_TIME = 0.12

/**
 * One frame of a player's standby. `playing`: the instrument played this frame (Atirar or Golpe); `key`: what she
 * holds and on which scale (a change wakes the layer too); `keep`: Camadas → "Prevenir fadeout das escalas".
 * Returns the layer's strength for the whole scale and for the cell the aim is on (0..1 of the layer).
 */
export function standbyStep(s: StandbyState, p: ScaleParams, dt: number, playing: boolean, key: string, keep: boolean) {
  if (playing || key !== s.key) s.idle = 0
  else s.idle += dt
  s.key = key
  const t = keep ? 0 : Math.max(0, Math.min(1, (s.idle - p.standbyAfter) / Math.max(0.01, p.fadeTime)))
  const ease = t * t * (3 - 2 * t)
  const target = 1 - (1 - p.standbyVis / 100) * ease
  s.level = target >= s.level ? Math.min(target, s.level + dt / WAKE_TIME) : target
  return { all: s.level, aimed: Math.min(1, s.level + p.aimedVis / 100) }
}
