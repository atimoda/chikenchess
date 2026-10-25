import { useSyncExternalStore } from 'react'
import { defaultGlobalReactions, REACTION_PRESET_REVISION, reactionsSchema, TRIGGERS, type Reactions, type Trigger } from './reactions'

/** Personal edits of the global States & Events set; the official set ships in data/music/reactions.json. */
export const GLOBAL_REACTIONS_STORAGE = 'chickenchess:reactions:global:v1'

const listeners = new Set<() => void>()
let cached: { raw: string | null; value: Reactions } | null = null

function readRaw() {
  try { return typeof window === 'undefined' ? null : window.localStorage.getItem(GLOBAL_REACTIONS_STORAGE) } catch { return null }
}

export function parseGlobalReactions(raw: string | null): Reactions {
  if (!raw) return defaultGlobalReactions()
  try {
    const data = JSON.parse(raw)
    const parsed = reactionsSchema.parse({ minimumPieces: data.minimumPieces, rules: data.rules })
    // Triggers added after the save start from the official rules; authored ones stay untouched.
    // Saves list the triggers they knew, so a new trigger is recognised without a revision bump.
    if (data.revision !== REACTION_PRESET_REVISION || Array.isArray(data.knownTriggers)) {
      const known = new Set<string>(data.knownTriggers ?? parsed.rules.map(rule => rule.trigger))
      parsed.rules.push(...defaultGlobalReactions().rules.filter(rule => !known.has(rule.trigger)))
    }
    return parsed
  } catch { return defaultGlobalReactions() }
}

export function loadGlobalReactions(): Reactions {
  const raw = readRaw()
  if (!cached || cached.raw !== raw) {
    const value = parseGlobalReactions(raw)
    // Once the official file carries these edits (saved to the game), drop the personal copy.
    if (raw && isOfficialGlobalReactions(value)) {
      try { window.localStorage.removeItem(GLOBAL_REACTIONS_STORAGE) } catch { /* keep using the equal copy */ }
      cached = { raw: readRaw(), value }
    } else cached = { raw, value }
  }
  return cached.value
}

export function isOfficialGlobalReactions(value: Reactions) {
  return JSON.stringify(reactionsSchema.parse(value)) === JSON.stringify(defaultGlobalReactions())
}

export function saveGlobalReactions(value: Reactions | null) {
  try {
    if (!value || isOfficialGlobalReactions(value)) window.localStorage.removeItem(GLOBAL_REACTIONS_STORAGE)
    else window.localStorage.setItem(GLOBAL_REACTIONS_STORAGE, JSON.stringify({ revision: REACTION_PRESET_REVISION, knownTriggers: Object.keys(TRIGGERS) as Trigger[], ...value }))
  } catch { /* Unavailable storage keeps the edit for this page only. */ cached = { raw: readRaw(), value: value ?? defaultGlobalReactions() } }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => { if (event.key === GLOBAL_REACTIONS_STORAGE) listener() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}

const serverSnapshot = defaultGlobalReactions()
/** Every kit (Creative, campaign and online) resolves its rules against this shared set. */
export function useGlobalReactions(): Reactions {
  return useSyncExternalStore(subscribe, loadGlobalReactions, () => serverSnapshot)
}
