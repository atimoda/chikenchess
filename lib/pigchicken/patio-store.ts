// The Pátio (lobby) the page has open: its layout, who created it, and where it is kept. A Pátio is the same thing
// as a lobby; its id is a uuid made when someone starts a new Pátio, kept in the page address (/patio?lobby=<id>).
// Without one the page shows the default Pátio (the admin's). Each Pátio is kept in this browser as soon as it is
// edited, so nothing is lost while offline; the database copy (lib/pigchicken/patio-online.ts) is saved over it on
// "Salvar" and every minute, and `revision` / `dirty` say how this copy relates to the saved one.
import { defaultLayout, emptyLayout, normalizeLayout, type PatioLayout } from './layout'
import { sunsetPowerLayout } from './example-patios'

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

// a new Pátio of mine: a copy of the default (kept only once it is edited), an empty one (only the entry portal) or
// the example "Pôr do sol com torres" (lib/pigchicken/example-patios.ts)
export type NewPatioKind = boolean | 'sunset'
export function newPatio(creatorId: string, empty: NewPatioKind = false): PatioRecord {
  const id = uuid()
  return { id, layout: empty === 'sunset' ? sunsetPowerLayout() : empty ? emptyLayout() : structuredClone(loadDefaultPatio().layout), creatorId, name: null, godparentId: null, updatedAt: null, edited: false, revision: 0, dirty: false, dbId: id }
}
export const newPatioId = uuid

export function keepPatio(rec: PatioRecord): PatioRecord {
  const next = { ...rec, edited: true, updatedAt: new Date().toISOString() }
  try {
    storage()?.setItem(KEY + (rec.id ?? 'default'), JSON.stringify({
      layout: next.layout, creatorId: next.creatorId, name: next.name, godparentId: next.godparentId, updatedAt: next.updatedAt,
      revision: next.revision, dirty: next.dirty, dbId: next.dbId,
    }))
  } catch { /* full or blocked */ }
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
