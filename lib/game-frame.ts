import { graphicsQuality, isLowGraphics } from './quality'

export const GAME_FPS_LIMIT = 240
/** The games' frame rate at "Qualidade e efeitos gráficos" Baixa, whatever the limit option says. */
export const LOW_GRAPHICS_FPS = 30
const INTERVAL = 1000 / GAME_FPS_LIMIT
const ROUNDING = .15
const KEY = 'chickenchess:frame-preferences:v1'

type FramePreferences = { counter: boolean; limit: boolean }
const DEFAULTS: FramePreferences = { counter: true, limit: true }
let preferences: FramePreferences | undefined
const listeners = new Set<() => void>()

function readPreferences(): FramePreferences {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? 'null')
    return { counter: saved?.counter !== false, limit: saved?.limit !== false }
  } catch {
    return DEFAULTS
  }
}

export const getServerFramePreferences = () => DEFAULTS
export const getFramePreferences = () => preferences ??= readPreferences()

function publish(next: FramePreferences) {
  const previous = getFramePreferences()
  if (previous.counter === next.counter && previous.limit === next.limit) return
  preferences = next
  listeners.forEach(listener => listener())
}

export function setFramePreference(key: keyof FramePreferences, value: boolean) {
  const next = { ...getFramePreferences(), [key]: value }
  try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* Session preferences still work. */ }
  publish(next)
}

export function subscribeFramePreferences(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) publish(readPreferences())
  })
}

// Keep the cadence on the frame grid so a 240 Hz screen does not drop every
// other frame due to timestamp rounding. No work is replayed after a stall.
export function createFrameGate() {
  let due: number | undefined, pace = INTERVAL
  return (now: number, limited: boolean, interval = INTERVAL) => {
    if (!limited) { due = undefined; return true }
    if (interval !== pace) { pace = interval; due = undefined }
    if (due !== undefined && now + ROUNDING < due) return false
    due = due === undefined ? now + interval : due + (1 + Math.floor((now + ROUNDING - due) / interval)) * interval
    return true
  }
}

let gate = createFrameGate()
let sequence = 0
let nativeFrame: number | undefined
let pending = new Map<number, FrameRequestCallback>()
let spare = new Map<number, FrameRequestCallback>()
let running: Map<number, FrameRequestCallback> | undefined

function schedule() {
  if (nativeFrame === undefined && pending.size) nativeFrame = requestAnimationFrame(tick)
}

function tick(now: number) {
  nativeFrame = undefined
  const low = isLowGraphics(graphicsQuality())
  if (gate(now, low || getFramePreferences().limit, low ? 1000 / LOW_GRAPHICS_FPS : INTERVAL)) {
    running = pending
    pending = spare
    for (const callback of running.values()) {
      try { callback(now) } catch (error) { reportError(error) }
    }
    spare = running
    spare.clear()
    running = undefined
  }
  if (!pending.size) gate = createFrameGate()
  schedule()
}

export function requestGameFrame(callback: FrameRequestCallback) {
  const id = ++sequence
  pending.set(id, callback)
  schedule()
  return id
}

export function cancelGameFrame(id: number) {
  pending.delete(id)
  running?.delete(id)
  if (!pending.size && nativeFrame !== undefined) {
    cancelAnimationFrame(nativeFrame)
    nativeFrame = undefined
  }
  if (!pending.size && !running) gate = createFrameGate()
}
