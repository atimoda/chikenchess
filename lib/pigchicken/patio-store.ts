// The Pátio (lobby) the page has open: its layout, who created it, and where it is kept. A Pátio is the same thing
// as a lobby; its id is a uuid made when someone starts a new Pátio, kept in the page address (/patio?lobby=<id>).
// Without one the page shows the default Pátio (the admin's). Each Pátio is kept in this browser as soon as it is
// edited, so nothing is lost while offline; the database copy (lib/pigchicken/patio-online.ts) is saved over it on
// "Salvar" and every minute, and `revision` / `dirty` say how this copy relates to the saved one.
import { compactLayout, defaultLayout, normalizeLayout, type PatioLayout } from './layout'
import { generatePatioLayout, type PatioRecipe } from './patio-generator'

export type PatioRecord = {
  id: string | null // null: the default Pátio
  layout: PatioLayout
  creatorId: string | null
  name: string | null
  godparentId: string | null
  updatedAt: string | null
  // someone changed it (only then it is kept)
  edited: boolean
  // the database's revision this copy builds on (0: never saved there)
  revision: number
  // changed since the last database save
  dirty: boolean
  // the database row: the lobby's own id, or for the default Pátio the row the admin set as default (null: none yet)
  dbId: string | null
}

const KEY = 'chickenchess:patio:v1:'
const DEVICE = 'chickenchess:device-id'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null }
}
const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16) }))

// who is playing on this computer when there is no account: a steady id of this browser
export function deviceId() {
  const s = storage()
  try {
    const known = s?.getItem(DEVICE)
    if (known) return known
    const id = `device:${uuid()}`
    s?.setItem(DEVICE, id)
    return id
  } catch { return 'device:unknown' }
}

export const isPatioId = (id: unknown): id is string => typeof id === 'string' && UUID.test(id)

function read(key: string): PatioRecord | null {
  try {
    const raw = storage()?.getItem(KEY + key)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<PatioRecord>
    const layout = normalizeLayout(v.layout, key === 'default')
    if (!layout) return null
    return {
      id: key === 'default' ? null : key, layout, creatorId: typeof v.creatorId === 'string' ? v.creatorId : null,
      name: typeof v.name === 'string' ? v.name : null, godparentId: typeof v.godparentId === 'string' ? v.godparentId : null,
      updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : null, edited: true,
      revision: Number.isInteger(v.revision) && (v.revision as number) >= 0 ? (v.revision as number) : 0, dirty: v.dirty === true,
      dbId: isPatioId(v.dbId) ? v.dbId : key === 'default' ? null : key,
    }
  } catch { return null }
}

// the default Pátio: the one the admin set, or the code's
export function loadDefaultPatio(): PatioRecord {
  return read('default') ?? { id: null, layout: defaultLayout(), creatorId: null, name: null, godparentId: null, updatedAt: null, edited: false, revision: 0, dirty: false, dbId: null }
}

// a Pátio by id; one this browser does not know yet starts as a copy of the default with no creator (nobody here
// may edit it until the database says who created it)
export function loadPatio(id: string | null): PatioRecord {
  if (!id) return loadDefaultPatio()
  return read(id) ?? { ...loadDefaultPatio(), id, creatorId: null, name: null, godparentId: null, updatedAt: null, edited: false, revision: 0, dirty: false, dbId: id }
}

// a new Pátio of mine: a copy of the default (kept only once it is edited) or one from the generator (Empty: only the
// entry portal; Basic biome: random nature, lib/pigchicken/patio-generator.ts).
// The example Pátios are normal lobbies of the admin's, featured (lib/pigchicken/example-seed.ts).
export type NewPatioKind = 'default' | PatioRecipe
export function newPatio(creatorId: string, kind: NewPatioKind = 'default'): PatioRecord {
  const id = uuid()
  return { id, layout: kind === 'default' ? structuredClone(loadDefaultPatio().layout) : generatePatioLayout(kind), creatorId, name: null, godparentId: null, updatedAt: null, edited: false, revision: 0, dirty: false, dbId: id }
}
// a Pátio this browser keeps (null: it only knows it from the database, or not at all)
export const keptPatio = (id: string) => read(id)
// this browser has its own copy of that Pátio (null: the default one)
export const hasKeptPatio = (id: string | null) => { try { return storage()?.getItem(KEY + (id ?? 'default')) != null } catch { return false } }
export const newPatioId = uuid

// Writing a kept copy. A full storage (each Pátio opened is kept: tens of KB each) made the write fail without a
// word, so this browser went on showing an old copy before the database's. Now copies the database already has
// (saved, no pending changes), oldest first, make room; the ones with changes not saved yet are never dropped.
function evictable(keep: string[]): string[] {
  const s = storage()
  if (!s) return []
  const out: { key: string; at: string }[] = []
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)
      if (!k?.startsWith(KEY)) continue
      const id = k.slice(KEY.length)
      if (id === 'default' || keep.includes(id)) continue
      try {
        const v = JSON.parse(s.getItem(k) ?? 'null') as Partial<PatioRecord> | null
        if (v && v.dirty !== true && Number.isInteger(v.revision) && (v.revision as number) > 0) out.push({ key: id, at: typeof v.updatedAt === 'string' ? v.updatedAt : '' })
      } catch { out.push({ key: id, at: '' }) } // unreadable: nothing to lose
    }
  } catch { /* blocked */ }
  return out.sort((a, b) => a.at.localeCompare(b.at)).map(e => e.key)
}
function writeKept(key: string, json: string, keep: string[]): boolean {
  const s = storage()
  if (!s) return false
  let victims: string[] | null = null
  for (;;) {
    try { s.setItem(KEY + key, json); return true } catch (e) {
      victims ??= evictable([key, ...keep])
      const victim = victims.shift()
      if (!victim) { console.warn('[patio] could not keep this Pátio in this browser', e); return false }
      try { s.removeItem(KEY + victim) } catch { return false }
    }
  }
}
// the database row the kept default Pátio is (null: none yet)
function keptDefaultDbId(): string | null {
  try {
    const v = JSON.parse(storage()?.getItem(KEY + 'default') ?? 'null') as { dbId?: unknown } | null
    return isPatioId(v?.dbId) ? v.dbId : null
  } catch { return null }
}

// The default Pátio is one database row reached two ways: /patio (kept as "default") and its lobby id (a link, a
// portal, a list). Both copies are the same Pátio, so a change to one is written to the other too; before, saving
// in one left the other old, and opening it showed that old copy until the database answered.
export function keepPatio(rec: PatioRecord): PatioRecord {
  const next = { ...rec, edited: true, updatedAt: new Date().toISOString() }
  const key = rec.id ?? 'default'
  const twin = rec.id === null
    ? (isPatioId(rec.dbId) && storage()?.getItem(KEY + rec.dbId) != null ? rec.dbId : null)
    : (keptDefaultDbId() === rec.id ? 'default' : null)
  const json = JSON.stringify({
    layout: compactLayout(next.layout), creatorId: next.creatorId, name: next.name, godparentId: next.godparentId, updatedAt: next.updatedAt,
    revision: next.revision, dirty: next.dirty, dbId: next.dbId,
  })
  writeKept(key, json, twin ? [twin] : [])
  if (twin) writeKept(twin, json, [key])
  return next
}

export function forgetPatio(id: string) {
  try { storage()?.removeItem(KEY + id) } catch { /* blocked */ }
}

// the Pátios kept in this browser (the "Abrir" list when there is no server, and the ones never saved there)
export function localPatios(): PatioRecord[] {
  const s = storage()
  if (!s) return []
  const out: PatioRecord[] = []
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)
      if (!k?.startsWith(KEY)) continue
      const id = k.slice(KEY.length)
      if (id === 'default' || !isPatioId(id)) continue
      const rec = read(id)
      if (rec) out.push(rec)
    }
  } catch { /* blocked */ }
  return out.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

// switching the open Pátio from elsewhere (the lobby panel's Próximo / Anterior): the Pátio page listens, saves
// what is pending, closes the editor and loads the other one (null: the default Pátio)
type OpenListener = (id: string | null) => void
const openListeners = new Set<OpenListener>()
export function openPatioLobby(id: string | null) { openListeners.forEach(fn => fn(isPatioId(id) ? id : null)) }
export function onPatioOpenRequest(fn: OpenListener) { openListeners.add(fn); return () => { openListeners.delete(fn) } }

// the lobby in the page address, and moving to another one without reloading
export function lobbyFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('lobby')
  return isPatioId(id) ? id : null
}
export function setLobbyInUrl(id: string | null) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('lobby', id)
  else url.searchParams.delete('lobby')
  window.history.replaceState(window.history.state, '', url)
}
