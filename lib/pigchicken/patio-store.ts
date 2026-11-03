// The Pátio (lobby) the page has open: its layout, who created it, and where it is kept. A Pátio is the same thing
// as a lobby; its id is a uuid made when someone starts a new Pátio, kept in the page address (/patio?lobby=<id>).
// Without one the page shows the default Pátio (the admin's). Each Pátio is kept in this browser as soon as it is
// edited; the database copy (save, open, autosave) builds on this.
import { defaultLayout, normalizeLayout, type PatioLayout } from './layout'

export type PatioRecord = {
  id: string | null // null: the default Pátio
  layout: PatioLayout
  creatorId: string | null
  name: string | null
  godparentId: string | null
  updatedAt: string | null
  // someone changed it (only then it is kept)
  edited: boolean
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
    const layout = normalizeLayout(v.layout)
    if (!layout) return null
    return {
      id: key === 'default' ? null : key, layout, creatorId: typeof v.creatorId === 'string' ? v.creatorId : null,
      name: typeof v.name === 'string' ? v.name : null, godparentId: typeof v.godparentId === 'string' ? v.godparentId : null,
      updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : null, edited: true,
    }
  } catch { return null }
}

// the default Pátio: the one the admin set, or the code's
export function loadDefaultPatio(): PatioRecord {
  return read('default') ?? { id: null, layout: defaultLayout(), creatorId: null, name: null, godparentId: null, updatedAt: null, edited: false }
}

// a Pátio by id; one this browser does not know yet starts as a copy of the default with no creator (nobody here
// may edit it until the database says who created it)
export function loadPatio(id: string | null): PatioRecord {
  if (!id) return loadDefaultPatio()
  return read(id) ?? { ...loadDefaultPatio(), id, creatorId: null, name: null, godparentId: null, updatedAt: null, edited: false }
}

// a new Pátio of mine: a copy of the default; kept only once it is edited
export function newPatio(creatorId: string): PatioRecord {
  const base = loadDefaultPatio()
  return { id: uuid(), layout: structuredClone(base.layout), creatorId, name: null, godparentId: null, updatedAt: null, edited: false }
}

export function keepPatio(rec: PatioRecord): PatioRecord {
  const next = { ...rec, edited: true, updatedAt: new Date().toISOString() }
  try { storage()?.setItem(KEY + (rec.id ?? 'default'), JSON.stringify({ layout: next.layout, creatorId: next.creatorId, name: next.name, godparentId: next.godparentId, updatedAt: next.updatedAt })) } catch { /* full or blocked */ }
  return next
}

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
