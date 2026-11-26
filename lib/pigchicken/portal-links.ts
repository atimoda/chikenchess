// Portals that lead to another Pátio (params.portalTarget: its lobby id, or "default" for the default Pátio).
// Entering one checks that the Pátio is still there before travelling: a Pátio deleted meanwhile (or an unnamed one
// cleaned up after 30 days) answers "Este pátio não existe mais...", and the portal stays where it is for whoever
// edits this Pátio to point it elsewhere. Making a new Pátio for a portal uses the same generator as Playgrounds.
import { DEFAULT_PATIO_TARGET, type LayoutElement } from './layout'
import { msg } from '../i18n'
import { isPatioId, keepPatio, keptPatio, newPatio, type PatioRecord } from './patio-store'
import type { PatioRecipe } from './patio-generator'
import { fetchPatioLobby, isPatioServerMissing, patioOnlineAvailable, renamePatioLobby, savePatioLobby } from './patio-online'

export { DEFAULT_PATIO_TARGET }
export const MISSING_PATIO_TEXT = msg('Este pátio não existe mais...')
export const OFFLINE_PATIO_TEXT = msg('Sem conexão para abrir este Pátio agora.')

// undefined: the portal leads to its pair; '' : to another Pátio, not chosen yet
export const portalTarget = (el: Pick<LayoutElement, 'kind' | 'params'>) => (el.kind === 'portal' ? el.params.portalTarget : undefined)
export const leadsToPatio = (el: Pick<LayoutElement, 'kind' | 'params'>) => portalTarget(el) !== undefined
// the lobby id to open (null: the default Pátio)
export const targetLobbyId = (target: string) => (target === DEFAULT_PATIO_TARGET ? null : target)

export type PatioTargetStatus = 'ok' | 'missing' | 'offline'
// local: this browser's copy; server: the database row (null: none there), or how asking for it failed
export function patioTargetStatus(target: string, local: Pick<PatioRecord, 'revision'> | null, server: { found: boolean } | 'offline' | 'unavailable'): PatioTargetStatus {
  if (target === DEFAULT_PATIO_TARGET) return 'ok'
  if (!isPatioId(target)) return 'missing'
  if (server === 'unavailable') return local ? 'ok' : 'missing'
  if (server === 'offline') return local ? 'ok' : 'offline'
  if (server.found) return 'ok'
  // never reached the database yet (made here, still unsaved): it stands; once saved there and now gone: deleted
  return local && local.revision === 0 ? 'ok' : 'missing'
}

export async function checkPatioTarget(target: string): Promise<PatioTargetStatus> {
  if (target === DEFAULT_PATIO_TARGET || !isPatioId(target)) return patioTargetStatus(target, null, 'unavailable')
  const local = keptPatio(target)
  if (!patioOnlineAvailable()) return patioTargetStatus(target, local, 'unavailable')
  try {
    const row = await fetchPatioLobby(target, local?.revision || null)
    return patioTargetStatus(target, local, { found: !!row })
  } catch (e) {
    return patioTargetStatus(target, local, isPatioServerMissing(e) ? 'unavailable' : 'offline')
  }
}

// A new Pátio for a portal: made by the generator, kept in this browser at once and, when possible, saved to the
// database (and named, with an account) so other players reach it too. It is not opened.
export async function createPatioForPortal(recipe: PatioRecipe, creatorId: string, name?: string): Promise<{ id: string; name: string | null; saved: boolean }> {
  let rec = keepPatio({ ...newPatio(creatorId, recipe), dirty: true })
  const id = rec.id!
  if (!patioOnlineAvailable()) return { id, name: null, saved: false }
  try {
    const res = await savePatioLobby(id, rec.layout, 0)
    rec = keepPatio({ ...rec, revision: res.revision, dirty: false })
  } catch { return { id, name: null, saved: false } }
  const clean = name?.trim()
  if (!clean) return { id, name: null, saved: true }
  try {
    const row = await renamePatioLobby(id, clean.slice(0, 60))
    keepPatio({ ...rec, name: row.name, godparentId: row.godparentId })
    return { id, name: row.name, saved: true }
  } catch { return { id, name: null, saved: true } }
}
