import { createDusseldorfSession, parseCreativeSession, type CreativeSession } from './creative'

export const CITY_KIT_STORAGE_PREFIX = 'chickenchess:city-kit:v1:'

export const EDITABLE_CITY_KITS = [
  { id: 'dusseldorf', name: 'Düsseldorf' },
] as const

export type EditableCityKitId = typeof EDITABLE_CITY_KITS[number]['id']

export function cityKitStorageKey(cityId: string) {
  return `${CITY_KIT_STORAGE_PREFIX}${cityId}`
}

export function defaultCityKit(cityId: string): CreativeSession | null {
  if (cityId === 'dusseldorf') return createDusseldorfSession()
  return null
}

export function prepareCityKitForCreative(session: CreativeSession, cityId: string): CreativeSession {
  return parseCreativeSession(JSON.stringify({
    ...session,
    cityId,
    pieces: session.pieces.map(piece => ({ ...piece, square: piece.origin, active: piece.color === 'w' })),
  }))
}

export function loadCityKit(cityId: string): CreativeSession | null {
  const fallback = defaultCityKit(cityId)
  if (typeof window === 'undefined') return fallback
  try {
    const saved = window.localStorage.getItem(cityKitStorageKey(cityId))
    if (!saved) return fallback
    const parsed = parseCreativeSession(saved)
    return parsed.cityId === cityId ? parsed : fallback
  } catch {
    return fallback
  }
}
