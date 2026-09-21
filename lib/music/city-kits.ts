import { parseCreativeSession, type CreativeSession } from './creative'
import { cities } from '../cities-data'
import { createStyledCityKit, STYLE_REVISION } from './styled-kits'

export const CITY_KIT_STORAGE_PREFIX = 'chickenchess:city-kit:v1:'

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

export function previousCityKit(cityId: string): CreativeSession | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = window.localStorage.getItem(`${CITY_KIT_STORAGE_PREFIX}backup:${STYLE_REVISION}:${cityId}`)
    return saved ? parseCreativeSession(saved) : null
  } catch { return null }
}

export function loadCityKit(cityId: string): CreativeSession | null {
  const fallback = defaultCityKit(cityId)
  if (typeof window === 'undefined') return fallback
  try {
    const saved = window.localStorage.getItem(cityKitStorageKey(cityId))
    if (!saved) return fallback
    const parsed = parseCreativeSession(saved)
    if (parsed.cityId !== cityId) return fallback
    if (parsed.catalogRevision === STYLE_REVISION || !fallback) return parsed
    // Publish the requested new collection once, retaining the exact previous save.
    // If backup/storage fails, preserve the user's existing kit.
    try {
      const backupKey = `${CITY_KIT_STORAGE_PREFIX}backup:${STYLE_REVISION}:${cityId}`
      if (!window.localStorage.getItem(backupKey)) window.localStorage.setItem(backupKey, saved)
      window.localStorage.setItem(cityKitStorageKey(cityId), JSON.stringify(fallback))
      return fallback
    } catch { return parsed }
  } catch {
    return fallback
  }
}

/** Replace one named library kit and keep at most one user kit linked per city. */
export function updateKitLibrary(kits: readonly CreativeSession[], saved: CreativeSession, limit = 30) {
  const previous = kits.find(kit => kit.name === saved.name)
  const releasedCityIds = previous?.cityId && previous.cityId !== saved.cityId ? [previous.cityId] : []
  const remaining = kits.filter(kit => kit.name !== saved.name).map(kit =>
    saved.cityId && kit.cityId === saved.cityId ? { ...kit, cityId: undefined } : kit)
  return { kits: [...remaining, saved].slice(-limit), releasedCityIds }
}
