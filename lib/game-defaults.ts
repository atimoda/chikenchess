// The game's defaults of the panels with "Salvar no game" (Configurações do Pátio, Camadas, Câmera de Mira and Ajustes,
// Volume, Grade de blocos, Itens, Escalas, Controles and Biblioteca de almas), one part each. The saved version lives in
// Supabase (public.game_defaults, written only by the admin, supabase/migrations/202611250002_game_defaults.sql) and is
// cached in this browser so the game starts with it right away; a part never saved uses the repository's file
// (data/pigchicken/default-*.json, data/chicken/default-controls.json), and those use the code's values where they say
// nothing. Each module keeps its own default object and keeps it current in place (liveDefault), so whoever reads it
// at use time gets the new one; whoever holds a copy subscribes (onGameDefaults).
// No Supabase client here: the modules that read their defaults load in tests and on the server too.

/* global process, fetch */
export const GAME_DEFAULT_PARTS = ['settings', 'layers', 'camera', 'volume', 'mineGrid', 'items', 'scales', 'controls', 'souls'] as const
export type GameDefaultPart = typeof GAME_DEFAULT_PARTS[number]
export type HeldDefault = { value: unknown; revision: number; updatedAt: string | null }

const CACHE = 'chickenchess:game-defaults:v1'
const REFRESH_AFTER_MS = 60_000

let held: Partial<Record<GameDefaultPart, HeldDefault>> | null = null
let fetchedAt = 0
let request: Promise<void> | null = null
const partListeners = new Map<GameDefaultPart, Set<(value: unknown) => void>>()
const listeners = new Set<(parts: GameDefaultPart[]) => void>()
let version = 0

const isPart = (v: string): v is GameDefaultPart => (GAME_DEFAULT_PARTS as readonly string[]).includes(v)

function readCache(): Partial<Record<GameDefaultPart, HeldDefault>> {
  try {
    if (typeof window === 'undefined') return {}
    const parsed = JSON.parse(window.localStorage.getItem(CACHE) || 'null')
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Partial<Record<GameDefaultPart, HeldDefault>> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, { value?: unknown; revision?: unknown; updatedAt?: unknown }>)) {
      if (isPart(k) && v && typeof v === 'object' && 'value' in v && Number(v.revision) > 0)
        out[k] = { value: v.value, revision: Number(v.revision), updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : null }
    }
    return out
  } catch { return {} }
}
const heldNow = () => (held ??= readCache())

/** The saved value of a part (Supabase's, as cached here), or `file` (the repository's) when it was never saved. */
export const gameDefault = (part: GameDefaultPart, file: unknown): unknown => heldNow()[part]?.value ?? file
/** The revision of a part this browser holds (0: never saved). */
export const gameDefaultHeld = (part: GameDefaultPart): HeldDefault | null => heldNow()[part] ?? null
/** Goes up each time a saved default arrives (for memos that read the defaults). */
export const gameDefaultsVersion = () => version

/** Calls back with a part's new value (or undefined: back to the file) whenever it changes. */
export function onGameDefault(part: GameDefaultPart, fn: (value: unknown) => void) {
  let set = partListeners.get(part)
  if (!set) partListeners.set(part, set = new Set())
  set.add(fn)
  return () => { set.delete(fn) }
}
/** Calls back after any saved default arrived, with the parts that changed (React: useGameDefaults). */
export function onGameDefaults(fn: (parts: GameDefaultPart[]) => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// keeps `target` equal to `next` without replacing it (the modules export it as a constant)
function replaceInPlace(target: object, next: object) {
  if (Array.isArray(target) && Array.isArray(next)) { target.splice(0, target.length, ...next); return }
  const t = target as Record<string, unknown>
  for (const k of Object.keys(t)) if (!(k in next)) delete t[k]
  Object.assign(t, next)
}

/** A module's default object for a part: `read` of the saved value (or of the file), kept current in place. */
export function liveDefault<T extends object>(part: GameDefaultPart, file: unknown, read: (raw: unknown) => T): T {
  const out = read(gameDefault(part, file))
  onGameDefault(part, raw => replaceInPlace(out, read(raw ?? file)))
  return out
}

function adopt(parts: Partial<Record<GameDefaultPart, HeldDefault>>) {
  const now = heldNow()
  const changed = (Object.keys(parts) as GameDefaultPart[]).filter(p => now[p]?.revision !== parts[p]!.revision)
  if (!changed.length) return
  for (const p of changed) now[p] = parts[p]!
  try { window.localStorage.setItem(CACHE, JSON.stringify(now)) } catch { /* storage unavailable */ }
  version++
  for (const p of changed) partListeners.get(p)?.forEach(fn => fn(now[p]!.value))
  listeners.forEach(fn => fn(changed))
}

/** Takes a version just saved (by this browser's admin) as the part's current one. */
export const adoptGameDefault = (part: GameDefaultPart, saved: HeldDefault) => adopt({ [part]: saved })

function parse(row: unknown, knownOnly: Partial<Record<GameDefaultPart, HeldDefault>>): Partial<Record<GameDefaultPart, HeldDefault>> {
  const out: Partial<Record<GameDefaultPart, HeldDefault>> = {}
  if (!row || typeof row !== 'object') return out
  for (const [k, v] of Object.entries(row as Record<string, { value?: unknown; revision?: unknown; updated_at?: unknown }>)) {
    if (!isPart(k) || !v || typeof v !== 'object') continue
    const revision = Number(v.revision) || 0
    const updatedAt = typeof v.updated_at === 'string' ? v.updated_at : null
    if ('value' in v) out[k] = { value: v.value, revision, updatedAt }
    else if (knownOnly[k]?.revision === revision) out[k] = knownOnly[k]
  }
  return out
}

/** Reads the saved defaults (anonymous, no login): only the parts that changed since the ones held here come with
 *  their value. Offline or without the migration: keeps what it had. */
export function refreshGameDefaults(force = false): Promise<void> {
  if (!force && Date.now() - fetchedAt < REFRESH_AFTER_MS) return Promise.resolve()
  if (request) return request
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !/^https?:\/\//.test(url) || !key || typeof window === 'undefined') return Promise.resolve()
  const now = { ...heldNow() }
  const known = Object.fromEntries(Object.entries(now).map(([k, v]) => [k, v!.revision]))
  request = fetch(`${url}/rest/v1/rpc/game_defaults`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_known: known }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
    .then(async response => {
      if (!response.ok) throw new Error(`game_defaults ${response.status}`)
      adopt(parse(await response.json(), now))
    })
    .catch(() => { /* offline or not installed yet: keep what is held */ })
    .finally(() => { fetchedAt = Date.now(); request = null })
  return request
}

/** For the admin's save: the part as the server has it now (value and revision), read again. */
export async function freshGameDefault(part: GameDefaultPart): Promise<HeldDefault | null> {
  await refreshGameDefaults(true)
  return gameDefaultHeld(part)
}
