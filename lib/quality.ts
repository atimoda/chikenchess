// "Qualidade e efeitos gráficos" and "Qualidade e efeitos sonoros": two levels kept per browser, first taken
// from the device, changed by hand in Preferências (the Pátio: Camadas), and lowered by quality-monitor.ts
// while "Ajustar automaticamente" is on. Only the levels chosen by hand are saved: the monitor's steps down last
// for this visit, so one slow moment never leaves a capable device at Baixa (30 FPS) for good. What each level changes is listed in docs/mechanics/performance.md.
import { isLiteDevice } from './performance'
import { msg } from './i18n'

export type QualityLevel = 'high' | 'medium' | 'low'
// the graphics have one level more, Baixíssima: Baixa without the scenery that is only decoration (the Pátio's
// mountains, tree lines, clouds, sun…, and its trees, pinheiros and ameixeiras that nothing stands on). Only chosen
// by hand: "Ajustar automaticamente" stops at Baixa.
export type GraphicsLevel = QualityLevel | 'lowest'
export type QualityKind = 'graphics' | 'sound'
export type QualityState = { graphics: GraphicsLevel; sound: QualityLevel; auto: boolean }

export const QUALITY_LEVELS: QualityLevel[] = ['high', 'medium', 'low']
export const GRAPHICS_LEVELS: GraphicsLevel[] = ['high', 'medium', 'low', 'lowest']
export const QUALITY_LABELS: Record<GraphicsLevel, string> = { high: msg('Alta'), medium: msg('Média'), low: msg('Baixa'), lowest: msg('Baixíssima') }
/** The levels each selector offers. */
export const qualityLevels = (kind: QualityKind): GraphicsLevel[] => kind === 'graphics' ? GRAPHICS_LEVELS : QUALITY_LEVELS
const KEY = 'chickenchess:quality:v2'
// v1 also saved the monitor's steps down, mixed with the levels chosen by hand.
const LEGACY_KEY = 'chickenchess:quality:v1'
const SERVER: QualityState = { graphics: 'high', sound: 'high', auto: true }
const isLevel = (value: unknown): value is QualityLevel => value === 'high' || value === 'medium' || value === 'low'
const isGraphicsLevel = (value: unknown): value is GraphicsLevel => isLevel(value) || value === 'lowest'
/** Baixa and Baixíssima: the shared frames at 30 FPS and the Pátio's scenery standing still. */
export const isLowGraphics = (level: GraphicsLevel) => level === 'low' || level === 'lowest'

/** The levels a device starts from: phones and other limited devices at Média, the rest at Alta. */
export function detectQuality(lite?: boolean): Pick<QualityState, 'graphics' | 'sound'> {
  let limited = lite
  if (limited === undefined) { try { limited = isLiteDevice() } catch { limited = false } }
  return limited ? { graphics: 'medium', sound: 'medium' } : { graphics: 'high', sound: 'high' }
}

/** Saved choices over the device's levels. A level is saved only once the player or the monitor changed it. */
export function resolveQuality(saved: unknown, detected = detectQuality()): QualityState {
  const record = saved && typeof saved === 'object' ? saved as Record<string, unknown> : {}
  return {
    graphics: isGraphicsLevel(record.graphics) ? record.graphics : detected.graphics,
    sound: isLevel(record.sound) ? record.sound : detected.sound,
    auto: record.auto !== false,
  }
}

/** What v1 saved that is surely a choice by hand: every level while auto was off, otherwise only Baixíssima
 * (the monitor never steps into it). Other levels saved with auto on may have been the monitor's, so they go. */
export function fromLegacy(legacy: unknown): Partial<QualityState> {
  const record = legacy && typeof legacy === 'object' ? legacy as Record<string, unknown> : {}
  if (record.auto === false) {
    const kept: Partial<QualityState> = { auto: false }
    if (isGraphicsLevel(record.graphics)) kept.graphics = record.graphics
    if (isLevel(record.sound)) kept.sound = record.sound
    return kept
  }
  return record.graphics === 'lowest' ? { graphics: 'lowest' } : {}
}

/** One level down, or the same level when it is already the lowest the monitor reaches (Baixa; Baixíssima stays). */
export const lowerLevel = (level: GraphicsLevel): GraphicsLevel => level === 'high' ? 'medium' : level === 'lowest' ? 'lowest' : 'low'

let state: QualityState | undefined
let saved: Partial<QualityState> = {}
// The monitor's steps down in this visit, over the saved levels; never written to the storage.
let lowered: { graphics?: GraphicsLevel; sound?: QualityLevel } = {}
const listeners = new Set<() => void>()

function resolve(): QualityState {
  const next = resolveQuality(saved)
  if (lowered.graphics) next.graphics = lowered.graphics
  if (lowered.sound) next.sound = lowered.sound
  return next
}

function read(): QualityState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw !== null) saved = JSON.parse(raw) ?? {}
    else {
      saved = fromLegacy(JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? 'null'))
      window.localStorage.setItem(KEY, JSON.stringify(saved))
      window.localStorage.removeItem(LEGACY_KEY)
    }
  } catch { saved = {} }
  if (!saved || typeof saved !== 'object') saved = {}
  return resolve()
}

function reflect(next: QualityState) {
  // CSS reads the level from the root: globals.css stops the Pátio's scenery animations at "low" and "lowest".
  if (typeof document !== 'undefined') document.documentElement.dataset.graphics = next.graphics
}

function publish(next: QualityState) {
  const previous = state
  state = next
  reflect(next)
  if (previous && previous.graphics === next.graphics && previous.sound === next.sound && previous.auto === next.auto) return
  listeners.forEach(listener => listener())
}

function store(patch: Partial<QualityState>) {
  saved = { ...saved, ...patch }
  try { window.localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* The choice still holds for this visit. */ }
  publish(resolve())
}

export const getServerQuality = () => SERVER
export function getQuality(): QualityState {
  if (typeof window === 'undefined') return SERVER
  if (!state) { state = read(); reflect(state) }
  return state
}
export const graphicsQuality = () => getQuality().graphics
export const soundQuality = () => getQuality().sound

export function subscribeQuality(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The player's own choice. It stays until changed again; the monitor may still lower it while auto is on. */
export function setQualityLevel(kind: QualityKind, level: GraphicsLevel) {
  getQuality()
  delete lowered[kind]
  store({ [kind]: kind === 'sound' && level === 'lowest' ? 'low' : level })
}

/** Turning "Ajustar automaticamente" on starts again from the device's own levels; turning it off keeps the
 * levels in use, the monitor's steps of this visit included, as if chosen by hand. */
export function setQualityAuto(auto: boolean) {
  getQuality()
  if (!auto) { const kept = lowered; lowered = {}; store({ ...kept, auto: false }); return }
  saved = { auto: true }
  lowered = {}
  try { window.localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* Session only. */ }
  publish(resolve())
}

/** The monitor's step down, for this visit only. False when that level is already the lowest. */
export function lowerQuality(kind: QualityKind) {
  const current = getQuality()[kind], next = lowerLevel(current)
  if (next === current) return false
  lowered = { ...lowered, [kind]: next }
  publish(resolve())
  return true
}

if (typeof window !== 'undefined') {
  window.addEventListener?.('storage', event => {
    // another tab changed the levels by hand: they win over this visit's steps down
    if (event.key === KEY || event.key === null) { lowered = {}; publish(read()) }
  })
}
