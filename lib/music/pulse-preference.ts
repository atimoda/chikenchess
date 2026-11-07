const KEY = 'chickenchess:simultaneous-note-flashes:v1'
const DEFAULT = true
let enabled: boolean | undefined
const listeners = new Set<() => void>()

function readPreference() {
  try { return window.localStorage.getItem(KEY) !== 'false' }
  catch { return DEFAULT }
}

export const getServerSimultaneousPulses = () => DEFAULT
export const getSimultaneousPulses = () => enabled ??= readPreference()

function publish(value: boolean) {
  if (getSimultaneousPulses() === value) return
  enabled = value
  listeners.forEach(listener => listener())
}

export function setSimultaneousPulses(value: boolean) {
  publish(value)
  try { window.localStorage.setItem(KEY, String(value)) } catch { /* Keep the current session preference. */ }
}

export function subscribeSimultaneousPulses(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) publish(readPreference())
  })
}
