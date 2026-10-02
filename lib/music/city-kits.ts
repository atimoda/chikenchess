import { CREATIVE_STORAGE, parseCreativeSession, type CreativeSession } from './creative'
import { cities } from '../cities-data'
import { createStyledCityKit } from './styled-kits'

export const CITY_KIT_STORAGE_PREFIX = 'chickenchess:city-kit:v1:'
export const KIT_LIBRARY_STORAGE = `${CREATIVE_STORAGE}:kits`

export const EDITABLE_CITY_KITS = cities.map(({ id, name, year }) => ({ id, name: `${name} · ${year}` }))

export type EditableCityKitId = typeof EDITABLE_CITY_KITS[number]['id']

export function cityKitStorageKey(cityId: string) {
  return `${CITY_KIT_STORAGE_PREFIX}${cityId}`
}

export function defaultCityKit(cityId: string): CreativeSession | null {
  const city = cities.find(city => city.id === cityId)
  return city ? createStyledCityKit(city) : null
}

export function prepareCityKitForCreative(session: CreativeSession, cityId: string): CreativeSession {
  return parseCreativeSession(JSON.stringify({
    ...session,
    cityId,
    pieces: session.pieces.map(piece => ({ ...piece, square: piece.origin, active: piece.color === 'w' })),
  }))
}

/** One-time authorized reset of text-era music edits; profile/progress is untouched. */
export function resetLegacyMusicStorage() {
  if (typeof window === 'undefined') return
  try {
    const storage = window.localStorage, marker = 'chickenchess:music:midi-v5'
    if (storage.getItem(marker)) return
    const targets = Array.from({length:storage.length},(_,index)=>storage.key(index)).filter((key): key is string => !!key && (key === 'chickenchess:creative:v1' || key === 'chickenchess:creative:v1:kits' || key.startsWith(CITY_KIT_STORAGE_PREFIX)))
    for (const key of targets) storage.removeItem(key)
    storage.setItem(marker,'1')
  } catch { /* Storage can be unavailable; the editor still opens the bundled MIDI kit. */ }
}

export function loadCityKit(cityId: string): CreativeSession | null {
  const fallback = defaultCityKit(cityId)
  if (typeof window === 'undefined') return fallback
  try {
    resetLegacyMusicStorage()
    const saved = window.localStorage.getItem(cityKitStorageKey(cityId))
    if (!saved) return fallback
    const parsed = parseCreativeSession(saved)
    if (parsed.cityId === cityId && (!fallback || parsed.catalogRevision === fallback.catalogRevision)) return parsed
    if (fallback) window.localStorage.setItem(cityKitStorageKey(cityId),JSON.stringify(fallback))
  } catch { /* Unavailable or invalid storage uses the bundled MIDI kit. */ }
  return fallback
}

/** Replace one named library kit and keep at most one user kit linked per city. */
export function updateKitLibrary(kits: readonly CreativeSession[], saved: CreativeSession, limit = 30) {
  const previous = kits.find(kit => kit.name === saved.name)
  const releasedCityIds = previous?.cityId && previous.cityId !== saved.cityId ? [previous.cityId] : []
  const remaining = kits.filter(kit => kit.name !== saved.name).map(kit =>
    saved.cityId && kit.cityId === saved.cityId ? { ...kit, cityId: undefined } : kit)
  return { kits: [...remaining, saved].slice(-limit), releasedCityIds }
}
