"use client"

// The Friends panel inside the Pátio: the globe's Friends list (add by code or e-mail, accept, hide, remove) with
// Invite on each friend, which calls them into this lobby (the Pátio and, online, its room). Loaded only when opened.
import { X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { FriendsPane } from "@/components/online/online-hub"
import type { OnlineFriend } from "@/lib/online/types"
import { useT } from "@/lib/i18n"

export function PatioFriendsPanel({ onClose, onInvite }: { onClose: () => void; onInvite: (friend: OnlineFriend) => Promise<string> }) {
  const t = useT()
  return (
    <FloatingPanel
      id="patio-friends"
      aria-label={t("Friends")}
      initial={(vw, vh) => { const w = Math.min(440, vw - 24); return { x: vw - w - 12, y: 64, w, h: Math.min(560, vh - 80) } }}
      minW={300}
      className="rounded-xl border border-primary/30 bg-[#101713] text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
    >
      <div data-drag-handle className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <h2 className="flex-1 font-mono text-sm">{t("Friends")}</h2>
        <button type="button" aria-label={t("Fechar")} onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <FriendsPane friendAction={{ label: t("Invite"), run: onInvite }} />
      </div>
    </FloatingPanel>
  )
}
