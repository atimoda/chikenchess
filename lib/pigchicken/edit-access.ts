// Who may use the Pátio's editor mode. The permission belongs to the Pátio, in any mode (local, online, offline):
// the admin, the Pátio's creator, or a player its owner allowed (the players / lobby panel's "Edit mode" column).
// The Pátio's own default (no lobby) is the admin's alone.
//
// Two sides feed it: the Pátio page (which Pátio is open, who created it, who is playing, admin or not) and the
// players / lobby panel, which may decide for the online lobby (`external`, via setPatioEditAccess). When the
// panel decides, its answer wins; otherwise the creator / admin rule applies.
import { useSyncExternalStore } from "react"

export type PatioLobbyMode = "local" | "online" | "offline"
export type PatioEditAccess = {
  lobbyId: string | null
  mode: PatioLobbyMode
  canEdit: boolean
  // why not, for the editor's hint
  reason: "" | "default" | "notCreator" | "notAllowed"
}

type PatioInfo = { lobbyId: string | null; creatorId: string | null; me: string | null; isAdmin: boolean }
let info: PatioInfo = { lobbyId: null, creatorId: null, me: null, isAdmin: false }
let external: { lobbyId: string | null; mode: PatioLobbyMode; canEdit: boolean } | null = null
let current: PatioEditAccess = compute()
const listeners = new Set<() => void>()

function compute(): PatioEditAccess {
  const mode = external?.mode ?? "local"
  if (info.isAdmin) return { lobbyId: info.lobbyId, mode, canEdit: true, reason: "" }
  if (external && external.lobbyId === info.lobbyId) return { lobbyId: info.lobbyId, mode, canEdit: external.canEdit, reason: external.canEdit ? "" : "notAllowed" }
  if (!info.lobbyId || !info.creatorId) return { lobbyId: info.lobbyId, mode, canEdit: false, reason: "default" }
  const mine = !!info.me && info.creatorId === info.me
  return { lobbyId: info.lobbyId, mode, canEdit: mine, reason: mine ? "" : "notCreator" }
}
function update() {
  const next = compute()
  if (next.canEdit === current.canEdit && next.reason === current.reason && next.mode === current.mode && next.lobbyId === current.lobbyId) return
  current = next
  listeners.forEach(fn => fn())
}

// the Pátio page: which Pátio is open and who is playing
export function setPatioInfo(next: PatioInfo) { info = next; update() }

// the players / lobby panel: its decision for the lobby (null hands it back to the creator / admin rule).
// Wire: setPatioEditAccess({ lobbyId: lobby.id, mode, canEdit: canUseEditor(lobby, firstLocal(lobby)?.id, { isAdmin }) })
export function setPatioEditAccess(next: { lobbyId: string | null; mode: PatioLobbyMode; canEdit: boolean } | null) { external = next; update() }

export const getPatioEditAccess = () => current
export function subscribePatioEditAccess(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const usePatioEditAccess = () => useSyncExternalStore(subscribePatioEditAccess, getPatioEditAccess, getPatioEditAccess)
export const usePatioCanEdit = () => usePatioEditAccess().canEdit
