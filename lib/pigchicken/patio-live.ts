// How many players are in each Pátio (lobby) right now, for the "Abrir" lists. The live lobby state (the players /
// lobby panel's realtime presence) feeds it with setPatioLiveCounts({ [lobbyId]: players }); without it the lists
// show no count. The default Pátio, opened without a lobby id, is under "default".
import { useSyncExternalStore } from "react"

export type PatioLiveCounts = Readonly<Record<string, number>>
let counts: PatioLiveCounts = {}
const listeners = new Set<() => void>()

export function setPatioLiveCounts(next: Record<string, number>) {
  counts = Object.freeze({ ...next })
  listeners.forEach(fn => fn())
}
export const getPatioLiveCounts = () => counts
export function subscribePatioLiveCounts(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const usePatioLiveCounts = () => useSyncExternalStore(subscribePatioLiveCounts, getPatioLiveCounts, getPatioLiveCounts)
