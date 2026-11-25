// The panels' values in three levels: the game's default (lib/game-defaults.ts, "Salvar no game"), the open Pátio's
// own (only what it personalized, "Salvar no Pátio", kept in its layout: settings.tuning, and settings.layers /
// settings.mineGrid for Camadas and Grade de blocos) and this browser's (only what this person changed and did not
// save, in localStorage). A value nobody personalized always follows the game's current default.
// Parts here: Câmera de Mira, Volume (the layers, not the master), Itens, Escalas and Personagem. The modules of each
// panel read the three through effectiveTuning and keep this browser's with setLocalTuning.
// Pure apart from localStorage: tests load it.

export const TUNING_PARTS = ['camera', 'volume', 'items', 'scales', 'chicken'] as const
export type TuningPart = typeof TUNING_PARTS[number]
export type PatioTuning = Partial<Record<TuningPart, unknown>>

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** What `value` changes over `base`: the keys (at any depth of plain objects) whose value differs; undefined when
 *  nothing does. Lists and other values count whole. */
export function deepDiff(base: unknown, value: unknown): unknown {
  if (isPlain(base) && isPlain(value)) {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value)) {
      const d = k in base ? deepDiff(base[k], value[k]) : value[k]
      if (d !== undefined) out[k] = d
    }
    return Object.keys(out).length ? out : undefined
  }
  return same(base, value) ? undefined : structuredClone(value)
}

/** `base` with `diff` over it (deepDiff's inverse); a key of diff that base does not have is left out. */
export function deepOver<T>(base: T, diff: unknown): T {
  if (diff === undefined) return structuredClone(base)
  if (isPlain(base) && isPlain(diff)) {
    const out = structuredClone(base) as Record<string, unknown>
    for (const k of Object.keys(diff)) if (k in out) out[k] = deepOver(out[k], diff[k])
    return out as T
  }
  if (isPlain(base) || isPlain(diff)) return structuredClone(base)
  return structuredClone(diff) as T
}

/** Drops the keys of a diff at `path` (the per-parameter reset); undefined when nothing is left. */
export function dropDiffPath(diff: unknown, path: readonly string[]): unknown {
  if (!path.length || !isPlain(diff)) return undefined
  const [head, ...rest] = path
  if (!(head in diff)) return diff
  const out = { ...diff }
  const next = rest.length ? dropDiffPath(out[head], rest) : undefined
  if (next === undefined) delete out[head]
  else out[head] = next
  return Object.keys(out).length ? out : undefined
}

// ---------- the open Pátio's ----------
let patio: PatioTuning = {}
// whoever may edit the Pátio saves into it (chicken-patio.tsx sets how); null: nobody here may
let patioSave: ((part: TuningPart, diff: unknown) => void) | null = null
// Lock (Configurações do Pátio): whoever may not edit the Pátio plays it with its values, changes nothing here and
// this browser's own changes do not count in it (they come back in another Pátio)
let locked = false
const listeners = new Set<(part: TuningPart) => void>()
const tell = (part: TuningPart) => listeners.forEach(fn => fn(part))
let version = 0

export const patioTuning = (part: TuningPart): unknown => patio[part]
export const canSaveTuningToPatio = () => !!patioSave
/** Whether the open Pátio's Lock keeps this person from changing its panels. */
export const tuningLocked = () => locked && !patioSave
export const tuningVersion = () => version

/** The open Pátio's personalized values (its layout's settings.tuning) and who may save into it. */
export function setPatioTuning(next: PatioTuning | undefined, save: ((part: TuningPart, diff: unknown) => void) | null, lock = false) {
  const before = patio, couldSave = !!patioSave, wasLocked = tuningLocked()
  patio = next ?? {}
  patioSave = save
  locked = lock
  const changed = TUNING_PARTS.filter(p => !same(before[p], patio[p]) || couldSave !== !!save || wasLocked !== tuningLocked())
  if (changed.length) { version++; changed.forEach(tell) }
}

/** "Salvar no Pátio": `value` (the panel's values as shown) minus the game's default become the Pátio's, and this
 *  browser's own changes of that part are gone (they are now the Pátio's). */
export function saveTuningToPatio(part: TuningPart, game: unknown, value: unknown) {
  if (!patioSave) return
  const diff = deepDiff(game, value)
  patio = { ...patio, [part]: diff }
  if (diff === undefined) delete patio[part]
  patioSave(part, diff)
  setLocalTuning(part, undefined)
}

// ---------- this browser's ----------
const STORE = 'chickenchess:tuning-local:v1'
let local: PatioTuning | null = null
function localNow(): PatioTuning {
  if (local) return local
  local = {}
  try {
    const raw = typeof window === 'undefined' ? null : JSON.parse(window.localStorage.getItem(STORE) || 'null')
    if (isPlain(raw)) for (const p of TUNING_PARTS) if (raw[p] !== undefined) local[p] = raw[p]
  } catch { /* storage unavailable */ }
  return local
}
export const localTuning = (part: TuningPart): unknown => localNow()[part]
/** Reads this browser's again on next use (its storage changed underneath: another tab, a test). */
export const forgetLocalTuning = () => { local = null }
export const hasLocalTuningStore = () => { try { return typeof window !== 'undefined' && window.localStorage.getItem(STORE) !== null } catch { return false } }

/** This browser's own changes of a part (a diff over the Pátio's values), or undefined: none. */
export function setLocalTuning(part: TuningPart, diff: unknown) {
  if (tuningLocked()) return
  const now = localNow()
  if (same(now[part], diff)) return
  if (diff === undefined) delete now[part]
  else now[part] = diff
  try { window.localStorage.setItem(STORE, JSON.stringify(now)) } catch { /* storage unavailable */ }
  version++
  tell(part)
}

/** The values a part is at in this Pátio for this person: the game's, the Pátio's over them, this browser's over
 *  those. read: the part's own normalizer (anything broken in a Pátio or browser falls back). */
export function effectiveTuning<T>(part: TuningPart, game: T, read: (raw: unknown) => T = v => v as T): { base: T; value: T } {
  const base = read(deepOver(game, patio[part]))
  return { base, value: tuningLocked() ? base : read(deepOver(base, localNow()[part])) }
}

/** Keeps this browser's changes of a part as what `value` differs from the Pátio's values (`base`). */
export const keepLocalTuning = (part: TuningPart, base: unknown, value: unknown) => setLocalTuning(part, deepDiff(base, value))

export function subscribeTuning(fn: (part: TuningPart) => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** A Pátio layout's settings.tuning as read: only known parts, each a plain object. */
export function normalizePatioTuning(raw: unknown): PatioTuning | undefined {
  if (!isPlain(raw)) return undefined
  const out: PatioTuning = {}
  for (const p of TUNING_PARTS) if (isPlain(raw[p]) && Object.keys(raw[p] as object).length) out[p] = structuredClone(raw[p])
  return Object.keys(out).length ? out : undefined
}

/** "Salvar no Pátio" of a panel whose values as shown are `value` (game: the game's default, as the same shape). */
export function patioSaveOf(part: TuningPart, game: unknown, value: unknown) {
  return {
    save: () => saveTuningToPatio(part, game, value),
    canSave: canSaveTuningToPatio(),
    changed: !same(deepDiff(game, value), patio[part]),
  }
}
