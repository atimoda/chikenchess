"use client"

// The Pátio (lobby) open on the page and its saving: a copy in this browser a moment after each change
// (lib/pigchicken/patio-store.ts) and the database copy (lib/pigchicken/patio-online.ts) on "Salvar agora" and
// every minute while there are changes. Saving over a version someone else saved meanwhile stops with a conflict
// the player resolves (open the saved one, or keep mine). Without a server (offline, not configured, migration not
// applied) everything keeps working in this browser.
import { useCallback, useEffect, useRef, useState } from "react"
import type { PatioLayout } from "@/lib/pigchicken/layout"
import { keepPatio, loadPatio, newPatio, newPatioId, setLobbyInUrl, type PatioRecord } from "@/lib/pigchicken/patio-store"
import {
  favoritePatioLobby, fetchDefaultPatio, fetchPatioLobby, isPatioConflict, isPatioOffline, isPatioServerMissing, patioErrorMessage,
  patioOnlineAvailable, playedPatioLobby, renamePatioLobby, savePatioLobby, setDefaultPatioLobby, type PatioLobby,
} from "@/lib/pigchicken/patio-online"

export const AUTOSAVE_MS = 60_000

export type PatioSaveState =
  | { kind: "idle" | "saving" | "saved" | "local" | "error"; text: string }
  | { kind: "conflict"; text: string; remote: PatioLobby | null }

const time = (iso: string | null) => (iso ? new Date(iso) : new Date()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

export function usePatioLobby({ userId, isAccount, isAdmin, canEdit }: { userId: string | null; isAccount: boolean; isAdmin: boolean; canEdit: boolean }) {
  const [patio, setPatio] = useState<PatioRecord | null>(null)
  const [remote, setRemote] = useState<PatioLobby | null>(null)
  const [save, setSave] = useState<PatioSaveState>({ kind: "idle", text: "" })
  const cur = useRef<PatioRecord | null>(null)
  const put = (next: PatioRecord) => { cur.current = next; setPatio(next) }
  const ctx = useRef({ userId, isAccount, isAdmin, canEdit })
  ctx.current = { userId, isAccount, isAdmin, canEdit }
  const saveKind = useRef(save.kind)
  saveKind.current = save.kind

  // ---------- this browser's copy, a moment after each change ----------
  const keepTimer = useRef<number | null>(null)
  const pendingKeep = useRef(false)
  const flushKeep = useCallback(() => {
    if (keepTimer.current) window.clearTimeout(keepTimer.current)
    keepTimer.current = null
    if (pendingKeep.current && cur.current) { pendingKeep.current = false; keepPatio(cur.current) }
  }, [])
  const changeLayout = useCallback((layout: PatioLayout) => {
    const p = cur.current
    if (!p) return
    put({ ...p, layout, edited: true, dirty: true })
    pendingKeep.current = true
    if (keepTimer.current) window.clearTimeout(keepTimer.current)
    keepTimer.current = window.setTimeout(flushKeep, 600)
    if (saveKind.current === "saved") setSave({ kind: "idle", text: "" })
  }, [flushKeep])
  useEffect(() => {
    window.addEventListener("pagehide", flushKeep)
    return () => { window.removeEventListener("pagehide", flushKeep); flushKeep() }
  }, [flushKeep])

  // ---------- opening a lobby: this browser's copy at once, then the database's ----------
  const loadSeq = useRef(0)
  const played = useRef(new Set<string>())
  const load = useCallback(async (id: string | null) => {
    const seq = ++loadSeq.current
    const local = loadPatio(id)
    put(local)
    setRemote(null)
    setSave({ kind: "idle", text: "" })
    if (!patioOnlineAvailable()) return
    try {
      const row = id ? await fetchPatioLobby(id) : await fetchDefaultPatio()
      if (seq !== loadSeq.current) return
      // the admin's default is kept in this browser too, so a new Pátio copies it (opening it keeps it below)
      if (id) void fetchDefaultPatio().then(def => {
        if (!def?.layout) return
        const d = loadPatio(null)
        if (d.dbId === def.id && d.revision === def.revision) return
        if (d.dirty && ctx.current.isAdmin) return // the admin's unsaved changes to it stay
        keepPatio({ ...d, layout: def.layout, name: def.name, creatorId: def.creatorId, godparentId: def.godparentId, revision: def.revision, dbId: def.id, dirty: false })
      }).catch(() => {})
      if (!row) return // not in the database yet: this browser's copy stands
      const base = cur.current ?? local
      const mine = base.edited && base.dirty
      const stale = mine && base.revision !== row.revision
      const next: PatioRecord = {
        ...base,
        layout: mine ? base.layout : row.layout ?? base.layout,
        creatorId: row.creatorId, name: row.name, godparentId: row.godparentId, dbId: row.id,
        revision: stale ? base.revision : row.revision, dirty: mine,
      }
      put(keepPatio(next))
      setRemote(row)
      if (stale) setSave({ kind: "conflict", text: "Este Pátio foi salvo em outro lugar depois das suas mudanças neste navegador.", remote: row })
      if (ctx.current.isAccount && !played.current.has(row.id)) { played.current.add(row.id); playedPatioLobby(row.id).then(() => fetchPatioLobby(row.id)).then(r => { if (r && cur.current?.dbId === r.id) setRemote(r) }).catch(() => {}) }
    } catch (e) {
      if (seq === loadSeq.current && !isPatioServerMissing(e)) setSave({ kind: "local", text: patioErrorMessage(e) })
    }
  }, [])

  const refreshRemote = useCallback(async () => {
    const p = cur.current
    if (!p?.dbId || !patioOnlineAvailable()) return
    try { const row = await fetchPatioLobby(p.dbId); if (row && cur.current?.dbId === row.id) setRemote(row) } catch { /* keep what we have */ }
  }, [])

  // ---------- saving to the database ----------
  const saving = useRef(false)
  const saveNow = useCallback(async ({ silent = false, force = false, revision }: { silent?: boolean; force?: boolean; revision?: number } = {}) => {
    flushKeep()
    const p = cur.current
    if (!p || saving.current) return false
    if (!p.dirty && !(force && p.revision === 0)) { if (!silent) setSave({ kind: "saved", text: "Tudo salvo." }); return true }
    if (!ctx.current.canEdit) return false
    if (!patioOnlineAvailable() || !ctx.current.userId) {
      setSave({ kind: "local", text: patioOnlineAvailable() ? "Entre para salvar no servidor. Ficou salvo neste navegador." : "Sem servidor: ficou salvo neste navegador." })
      return false
    }
    saving.current = true
    setSave({ kind: "saving", text: "Salvando…" })
    try {
      // the admin's first save of the default Pátio makes its database row
      const firstDefault = p.id === null && !p.dbId
      const dbId = firstDefault ? newPatioId() : p.dbId!
      const res = await savePatioLobby(dbId, p.layout, firstDefault ? 0 : revision ?? p.revision)
      if (firstDefault) await setDefaultPatioLobby(dbId)
      const latest = cur.current ?? p
      if (latest.id !== p.id) return true // switched away meanwhile
      const next = keepPatio({
        ...latest, revision: res.revision, dbId, dirty: latest.layout !== p.layout,
        creatorId: p.revision === 0 && p.id ? ctx.current.userId : latest.creatorId,
      })
      put(next)
      setSave({ kind: "saved", text: `Salvo às ${time(res.updatedAt)}.` })
      void refreshRemote()
      return true
    } catch (e) {
      if (isPatioConflict(e)) {
        const row = p.dbId ? await fetchPatioLobby(p.dbId).catch(() => null) : null
        setSave({ kind: "conflict", text: patioErrorMessage(e), remote: row })
      } else setSave({ kind: isPatioServerMissing(e) || isPatioOffline(e) ? "local" : "error", text: patioErrorMessage(e) })
      return false
    } finally {
      saving.current = false
    }
  }, [flushKeep, refreshRemote])

  // every minute while there are changes (not while a conflict waits for the player)
  useEffect(() => {
    const t = window.setInterval(() => {
      if (cur.current?.dirty && saveKind.current !== "conflict" && saveKind.current !== "saving") void saveNow({ silent: true })
    }, AUTOSAVE_MS)
    return () => window.clearInterval(t)
  }, [saveNow])

  // a conflict: open the saved version (mine is dropped) or save mine over it
  const resolveConflict = useCallback(async (choice: "saved" | "mine") => {
    if (save.kind !== "conflict") return
    const p = cur.current
    if (!p) return
    const row = save.remote ?? (p.dbId ? await fetchPatioLobby(p.dbId).catch(() => null) : null)
    if (choice === "saved") {
      if (row?.layout) put(keepPatio({ ...p, layout: row.layout, revision: row.revision, dirty: false, name: row.name, godparentId: row.godparentId }))
      if (row) setRemote(row)
      setSave({ kind: "saved", text: "Abri a versão salva." })
      return
    }
    setSave({ kind: "idle", text: "" })
    await saveNow({ revision: row?.revision ?? p.revision })
  }, [save, saveNow])

  // the first name makes it a saved lobby (kept for good); a Pátio not in the database yet is saved first
  const rename = useCallback(async (name: string) => {
    let p = cur.current
    if (!p) return false
    if (p.revision === 0 || !p.dbId) {
      const ok = await saveNow({ force: true })
      p = cur.current
      if (!ok || !p?.dbId || p.revision === 0) return false
    }
    try {
      const row = await renamePatioLobby(p.dbId!, name)
      const latest = cur.current
      if (latest?.dbId === row.id) put(keepPatio({ ...latest, name: row.name, godparentId: row.godparentId }))
      setRemote(prev => (prev && prev.id === row.id ? { ...prev, ...row } : prev))
      void refreshRemote()
      setSave({ kind: "saved", text: `Salvo como “${row.name}”.` })
      return true
    } catch (e) {
      setSave({ kind: "error", text: patioErrorMessage(e) })
      return false
    }
  }, [saveNow, refreshRemote])

  const favorite = useCallback(async (on: boolean) => {
    const id = cur.current?.dbId
    if (!id) return
    setRemote(prev => (prev && prev.id === id ? { ...prev, favorite: on } : prev))
    try { await favoritePatioLobby(id, on) } catch (e) {
      setRemote(prev => (prev && prev.id === id ? { ...prev, favorite: !on } : prev))
      setSave({ kind: "error", text: patioErrorMessage(e) })
    }
  }, [])

  // leaving for another lobby: what is pending is saved first
  const switchTo = useCallback(async (id: string | null) => {
    flushKeep()
    if (cur.current?.dirty && ctx.current.canEdit) await saveNow({ silent: true })
    setLobbyInUrl(id)
    await load(id)
  }, [flushKeep, saveNow, load])

  // a new Pátio of mine: a copy of the default one
  const startNew = useCallback(async (creatorId: string) => {
    flushKeep()
    if (cur.current?.dirty && ctx.current.canEdit) await saveNow({ silent: true })
    loadSeq.current++
    const next = newPatio(creatorId)
    setLobbyInUrl(next.id)
    put(next)
    setRemote(null)
    setSave({ kind: "idle", text: "" })
    return next.id
  }, [flushKeep, saveNow])

  return { patio, remote, save, load, changeLayout, saveNow, resolveConflict, rename, favorite, switchTo, startNew, refreshRemote }
}
