import { CREATIVE_STORAGE, parseCreativeSession, type CreativeSession } from './creative'
import { cities } from '../cities-data'
import { createStyledCityKit, LEGACY_STYLE_REVISIONS, STYLE_REVISION } from './styled-kits'

export const CITY_KIT_STORAGE_PREFIX = 'chickenchess:city-kit:v1:'
export const KIT_LIBRARY_STORAGE = `${CREATIVE_STORAGE}:kits`
const MAX_LIBRARY_KITS = 30

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

function looseKitContent(kit: CreativeSession) {
  return JSON.stringify({ ...kit, name: '', cityId: undefined })
}

function preserveAsLooseKit(saved: string, cityId: string, defaultName: string) {
  const old = parseCreativeSession(saved)
  const rawLibrary = window.localStorage.getItem(KIT_LIBRARY_STORAGE)
  const library: unknown = rawLibrary ? JSON.parse(rawLibrary) : []
  if (!Array.isArray(library)) throw new Error('Biblioteca de kits inválida')
  const kits = library.map(item => parseCreativeSession(JSON.stringify(item)))
  const oldContent = looseKitContent(old)
  const linkedIndex = kits.findIndex(kit => kit.cityId === cityId && looseKitContent(kit) === oldContent)
  if (kits.some(kit => !kit.cityId && looseKitContent(kit) === oldContent)) {
    if (linkedIndex >= 0) window.localStorage.setItem(KIT_LIBRARY_STORAGE, JSON.stringify(kits.filter((_, index) => index !== linkedIndex)))
    return
  }
  if (linkedIndex < 0 && kits.length >= MAX_LIBRARY_KITS) throw new Error('Biblioteca de kits cheia')

  const city = cities.find(item => item.id === cityId)
  const base = old.name === defaultName && city ? `${city.name} ${city.year}` : old.name
  let version = 1
  let name = ''
  do {
    const suffix = ` v${version++}`
    name = `${base.slice(0, 80 - suffix.length).trimEnd()}${suffix}`
  } while (kits.some((kit, index) => index !== linkedIndex && kit.name === name))
  const detached = parseCreativeSession(JSON.stringify({ ...old, name, cityId: undefined }))
  if (linkedIndex >= 0) kits[linkedIndex] = detached
  else kits.push(detached)
  window.localStorage.setItem(KIT_LIBRARY_STORAGE, JSON.stringify(kits))
}

function importLegacyBackups(cityId: string, revision: string, defaultName: string) {
  for (const backupRevision of new Set([...LEGACY_STYLE_REVISIONS, STYLE_REVISION, revision])) {
    const key = `${CITY_KIT_STORAGE_PREFIX}backup:${backupRevision}:${cityId}`
    const saved = window.localStorage.getItem(key)
    if (!saved) continue
    preserveAsLooseKit(saved, cityId, defaultName)
    window.localStorage.removeItem(key)
  }
}

export function loadCityKit(cityId: string): CreativeSession | null {
  const fallback = defaultCityKit(cityId)
  const revision = fallback?.catalogRevision ?? STYLE_REVISION
  if (typeof window === 'undefined') return fallback
  try { importLegacyBackups(cityId, revision, fallback?.name ?? cityId) } catch { /* Keep the backup for a later attempt. */ }
  try {
    const saved = window.localStorage.getItem(cityKitStorageKey(cityId))
    if (!saved) return fallback
    const parsed = parseCreativeSession(saved)
    if (parsed.cityId !== cityId) return fallback
    if (parsed.catalogRevision === revision || !fallback) return parsed
    // Keep the previous kit in the Creative library before replacing its city slot.
    // If preservation fails, leave the existing city kit in place.
    try {
      preserveAsLooseKit(saved, cityId, fallback.name)
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
