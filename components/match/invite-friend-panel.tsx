"use client"

// The contents of Invite a friend (match header): the friends list with Invite, the lobby link with Copy, and the
// row of apps to share it. Opening it opens a private 1v1 lobby with this city's kit (or reuses the open lobby this
// account already occupies). Docs: docs/mechanics/online/lobby.md.
import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import { FriendsPane } from "@/components/online/online-hub"
import { useOnline } from "@/components/online/online-provider"
import { ONLINE_CONFIGURATION_MESSAGE, onlineErrorMessage, onlineRpc } from "@/lib/online/client"
import { sendInvite } from "@/lib/online/invites"
import { roomErrorMessage } from "@/lib/online/lobby-updates"
import { LOBBY_INVITE_TEXT, SHARE_APPS, lobbyInviteLink, shareAppTarget, type ShareApp } from "@/lib/online/share-links"
import type { OnlineFriend, OnlineRoom } from "@/lib/online/types"
import { cn } from "@/lib/utils"
import { ShareAppIcon } from "./share-app-icons"
import { msg, useT } from "@/lib/i18n"

const RANDOM_KIT = "random"

export function InviteFriendPanel({ cityId, lobby, onLobby }: { cityId: string; lobby: OnlineRoom | null; onLobby: (room: OnlineRoom) => void }) {
  const { configured, ensureGuest, refreshProfile } = useOnline()
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Promise<OnlineRoom> | null>(null)
  const lobbyRef = useRef(lobby)
  useEffect(() => { lobbyRef.current = lobby }, [lobby])
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current) }, [])

  // the open lobby this account occupies, or a new private one with this city's kit (Random when the server lacks it)
  const openLobby = useCallback((): Promise<OnlineRoom> => {
    if (lobbyRef.current) return Promise.resolve(lobbyRef.current)
    if (pending.current) return pending.current
    const run = (async () => {
      if (!configured) throw new Error(ONLINE_CONFIGURATION_MESSAGE)
      const me = await ensureGuest()
      await refreshProfile()
      const current = await onlineRpc<OnlineRoom | null>("online_room", { p_action: "get", p_code: null })
      if (current?.status === "open" && current.members.some(member => member.user_id === me.id)) return current
      const create = (kit: string) => onlineRpc<OnlineRoom | null>("online_room", { p_action: "create", p_code: null, p_public: false, p_city_id: kit })
      const created = await create(cityId).catch(cause => {
        if (cityId !== RANDOM_KIT && /INVALID_KIT/.test(String((cause as { message?: unknown })?.message ?? ""))) return create(RANDOM_KIT)
        throw cause
      })
      if (!created) throw new Error(msg("Não deu para abrir o lobby. Tente de novo."))
      return created
    })()
    pending.current = run
    run.then(room => { lobbyRef.current = room; onLobby(room) }, () => {}).finally(() => { pending.current = null })
    return run
  }, [configured, ensureGuest, refreshProfile, cityId, onLobby])

  useEffect(() => {
    void openLobby().then(() => setError(null), cause => setError(roomErrorMessage(cause) || onlineErrorMessage(cause)))
  }, [openLobby])

  const link = lobby && typeof window !== "undefined" ? lobbyInviteLink(lobby.code, window.location.origin) : ""

  const inviteFriend = async (friend: OnlineFriend) => {
    const room = await openLobby()
    await sendInvite(friend.profile.id, { kind: "room", code: room.code })
    return t("Convite enviado para {name}.", { name: friend.profile.display_name })
  }

  const copy = async () => {
    if (!link) return false
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 1600)
      return true
    } catch {
      setNotice(t("Não deu para copiar. O link é: {link}", { link }))
      return false
    }
  }

  const share = async (app: ShareApp, label: string) => {
    if (!link) return
    setNotice(null)
    const target = shareAppTarget(app, link, t(LOBBY_INVITE_TEXT))
    if (!target.copyFirst) { window.open(target.href, "_blank", "noopener,noreferrer"); return }
    // no share page for this app on the web: the phone's share sheet lists it; elsewhere, copy and open its messages
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ text: t(LOBBY_INVITE_TEXT), url: link }); return }
      catch (cause) { if (cause instanceof DOMException && cause.name === "AbortError") return }
    }
    const ok = await copy()
    window.open(target.href, "_blank", "noopener,noreferrer")
    if (ok) setNotice(t("Link copiado: cole no {app}.", { app: label }))
  }

  const ready = Boolean(link)
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-4">
      <FriendsPane friendAction={{ label: msg("Invite"), run: inviteFriend }} />
    </div>
    <div className="shrink-0 space-y-3 border-t border-white/10 p-4">
      <div className={cn("flex items-center gap-2 rounded-md border border-white/15 bg-black/20 py-1 pl-3 pr-1 transition-opacity", !ready && "opacity-40")}>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/70 select-all">{link || "…"}</span>
        <button type="button" disabled={!ready} onClick={() => void copy()} aria-label={t(copied ? "Link copiado" : "Copiar link")} title={t("Copy link")}
          className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none", copied ? "text-primary" : "text-white/80 hover:text-white")}>
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
        </button>
      </div>
      <div className={cn("flex items-center justify-between transition-opacity", !ready && "opacity-40")}>
        {SHARE_APPS.map(app => <button key={app.id} type="button" disabled={!ready} onClick={() => void share(app.id, app.label)} aria-label={app.label} title={app.label}
          className="inline-flex size-10 items-center justify-center rounded-full text-white/75 transition-[color,background-color,transform] hover:scale-110 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none">
          <ShareAppIcon app={app.id} className="size-5" />
        </button>)}
      </div>
      {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="break-words text-xs text-primary">{notice}</p>}
    </div>
  </div>
}
