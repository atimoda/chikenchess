"use client"

// Invite a friend in the match header, left of Bot level: a popover that opens (or reuses) a private 1v1 lobby with
// this city's kit and calls a friend into it, copies its link or shares it in an app. While the match goes on, a
// friend entering that lobby shows a notice that leads to it. Docs: docs/mechanics/online/lobby.md.
import { useEffect, useRef, useState, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import * as Popover from "@radix-ui/react-popover"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOnline } from "@/components/online/online-provider"
import { playLobbyJoinSound } from "@/components/online/lobby-audio"
import { getOnlineClient, onlineRpc } from "@/lib/online/client"
import { INVITE_NOTICE_MS } from "@/lib/online/invites"
import { roomArrivalNames } from "@/lib/online/lobby-updates"
import { lobbyInviteLink } from "@/lib/online/share-links"
import type { OnlineRoom } from "@/lib/online/types"
import { t as tr, useT } from "@/lib/i18n"

// the panel carries the friends list and the lobby actions: loaded only when opened
const InviteFriendPanel = dynamic(() => import("./invite-friend-panel").then(module => module.InviteFriendPanel), {
  ssr: false,
  loading: () => <p role="status" className="p-3 text-xs text-white/55">Loading…</p>,
})

let lobbyChannelSequence = 0

export function InviteFriendButton({ cityId, cityColor }: { cityId: string; cityColor: string }) {
  const { user, notify } = useOnline()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [lobby, setLobby] = useState<OnlineRoom | null>(null)
  const userId = user?.id ?? null
  const lobbyRef = useRef(lobby)
  useEffect(() => { lobbyRef.current = lobby }, [lobby])

  // another account on this browser: the lobby was the previous one's
  useEffect(() => { setLobby(current => current && current.members.some(member => member.user_id === userId) ? current : null) }, [userId])

  // while this match goes on, a friend entering the lobby is announced with a way to it
  const lobbyId = lobby?.id ?? null
  const lobbyCode = lobby?.code ?? null
  useEffect(() => {
    const online = getOnlineClient()
    if (!lobbyId || !lobbyCode || !online) return
    let active = true
    // the lobby as it was opened is the baseline: whoever is already in it is not announced
    let known: OnlineRoom | null = lobbyRef.current
    const update = () => {
      void onlineRpc<OnlineRoom | null>("online_room", { p_action: "get", p_code: lobbyCode }).then(next => {
        if (!active) return
        const arrivals = known ? roomArrivalNames(known, next, userId) : []
        if (arrivals.length) playLobbyJoinSound()
        for (const name of arrivals) notify(tr("{name} entrou no seu lobby.", { name }), { action: { label: tr("Ir ao lobby"), href: lobbyInviteLink(lobbyCode, window.location.origin) }, ms: INVITE_NOTICE_MS })
        known = next
        if (!next || next.status !== "open" || !next.members.some(member => member.user_id === userId)) setLobby(null)
      }).catch(() => {})
    }
    const channel = online.channel(`match-invite-lobby:${lobbyId}:${++lobbyChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "online_rooms", filter: `id=eq.${lobbyId}` }, update)
      .subscribe(status => { if (status === "SUBSCRIBED") update() })
    window.addEventListener("online", update)
    return () => { active = false; window.removeEventListener("online", update); void online.removeChannel(channel) }
  }, [lobbyId, lobbyCode, userId, notify])

  return <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
    <Popover.Trigger asChild>
      <Button
        variant="outline"
        size="sm"
        aria-label={t("Invite a friend")}
        title={t("Invite a friend")}
        className="justify-center bg-transparent transition-all border-border hover:border-[var(--hover-color)] hover:shadow-[0_0_10px_var(--hover-color)] hover:text-white active:bg-black/70 active:border-[var(--hover-color)] active:text-[var(--hover-color)] focus-visible:border-[var(--hover-color)] focus-visible:text-[var(--hover-color)] data-[state=open]:border-[var(--hover-color)] data-[state=open]:text-white"
        style={{ "--hover-color": cityColor } as CSSProperties}
      >
        <UserPlus aria-hidden="true" className="size-4 md:hidden" />
        <span className="hidden px-1 text-xs font-mono md:inline">{t("Invite a friend")}</span>
      </Button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="end" sideOffset={6} collisionPadding={12} aria-label={t("Invite a friend")}
        onOpenAutoFocus={event => event.preventDefault()}
        className="z-[200] flex max-h-[min(640px,var(--radix-popover-content-available-height))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-white/15 bg-[#101713] text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <InviteFriendPanel cityId={cityId} lobby={lobby} onLobby={setLobby} />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
