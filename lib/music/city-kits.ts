import { CREATIVE_STORAGE, parseCreativeSession, type CreativeSession } from './creative'
import { cities } from '../cities-data'
import { CAMPAIGNS, citiesInCampaign } from '../campaigns'
import { createStyledCityKit } from './styled-kits'
import { OFFICIAL_CITY_KITS } from './official-kits'

export const CITY_KIT_STORAGE_PREFIX = 'chickenchess:city-kit:v1:'
export const KIT_LIBRARY_STORAGE = `${CREATIVE_STORAGE}:kits`

export const EDITABLE_CITY_KITS = cities.map(({ id, name, year }) => ({ id, name: `${name} · ${year}` }))

/** Creative's Default kits, one group per campaign in map order, labelled "year City - style". */
export const DEFAULT_KIT_GROUPS = CAMPAIGNS.map(campaign => ({
  id: campaign.id,
  name: campaign.name,
  kits: citiesInCampaign(cities, campaign.id)
    .filter(city => city.campaigns[0] === campaign.id)
    .map(city => ({ id: city.id, label: `${city.year} ${city.name} - ${city.genre}` })),
})).filter(group => group.kits.length > 0)

export type EditableCityKitId = typeof EDITABLE_CITY_KITS[number]['id']

export function cityKitStorageKey(cityId: string) {
  return `${CITY_KIT_STORAGE_PREFIX}${cityId}`
}

const officialKits = new Map<string, CreativeSession>()
function officialCityKit(cityId: string) {
  if (!Object.hasOwn(OFFICIAL_CITY_KITS, cityId)) return null
  let kit = officialKits.get(cityId)
  if (!kit) {
    kit = prepareOfficialCityKit(parseCreativeSession(JSON.stringify(OFFICIAL_CITY_KITS[cityId])), cityId)
    officialKits.set(cityId, kit)
  }
  return globalThis.structuredClone(kit)
}

/** The city's official kit saved from Creative (Save DB), else the kit composed from its style profile. */
export function defaultCityKit(cityId: string): CreativeSession | null {
  const city = cities.find(city => city.id === cityId)
  if (!city) return null
  return officialCityKit(cityId) ?? createStyledCityKit(city)
}

/** Normalizes a kit into a city's official kit: starting squares, the white band on. */
export function prepareOfficialCityKit(session: CreativeSession, cityId: string, revision = session.catalogRevision): CreativeSession {
  return parseCreativeSession(JSON.stringify({
    ...session,
    cityId,
    catalogRevision: revision,
    pieces: session.pieces.map(piece => ({ ...piece, square: piece.origin, active: piece.color === 'w' })),
  }))
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
