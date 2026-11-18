"use client"

// The Profile panel inside the Pátio (the Vestiário's Perfil shortcut): the globe's Profile tab (name, code, golden
// eggs, progress and the account's actions) in a floating panel. Loaded only when opened.
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { ProfilePane } from "@/components/online/profile-pane"
import { useOnline } from "@/components/online/online-provider"
import { readLocalProfile } from "@/lib/online/client"
import type { PlayerProfile } from "@/lib/game-progression"

export function PatioProfilePanel({ onClose }: { onClose: () => void }) {
  const { openLogin } = useOnline()
  // this browser's campaign profile (eggs, points, cities), read without writing it back
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  useEffect(() => { setProfile(readLocalProfile()) }, [])
  return (
    <FloatingPanel
      id="patio-profile"
      aria-label="Perfil"
      initial={(vw, vh) => { const w = Math.min(440, vw - 24); return { x: vw - w - 12, y: 64, w, h: Math.min(600, vh - 80) } }}
      minW={300}
      className="rounded-xl border border-primary/30 bg-[#101713] text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
    >
      <div data-drag-handle className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <h2 className="flex-1 font-mono text-sm">Perfil</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <ProfilePane playerProfile={profile} onSignIn={() => { onClose(); openLogin() }} />
      </div>
    </FloatingPanel>
  )
}
