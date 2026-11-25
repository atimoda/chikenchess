"use client"

// The Catálogo: one popup with the Aliens, Almas and Pássaros as title tabs (each with its icon before its name). It
// opens on Aliens; only the open tab is mounted. A soul's Inspiration opens the Pássaros tab on that bird, and a soul
// caught in a bird's card opens the Almas tab on it (each by `focus`, cleared when a tab is picked by hand).
import { useState } from "react"
import { Bird, Feather, Ghost, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { AlienCatalogBody } from "@/components/pigchicken/alien-catalog-panel"
import { SoulLibraryBody } from "@/components/pigchicken/soul-library-panel"
import { BirdGuideBody } from "@/components/pigchicken/bird-guide-panel"

export type CatalogTab = "aliens" | "souls" | "birds"
const TABS: { id: CatalogTab; label: string; Icon: LucideIcon }[] = [
  { id: "aliens", label: "Aliens", Icon: Ghost },
  { id: "souls", label: "Almas", Icon: Bird },
  { id: "birds", label: "Pássaros", Icon: Feather },
]
type Focus = { id: string; n: number } | null

export function CatalogPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<CatalogTab>("aliens")
  const [soulFocus, setSoulFocus] = useState<Focus>(null)
  const [birdFocus, setBirdFocus] = useState<Focus>(null)
  const pickTab = (id: CatalogTab) => { setSoulFocus(null); setBirdFocus(null); setTab(id) }
  return (
    <FloatingPanel id="pigchicken-catalog" aria-label="Catálogo" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(560, vw - 24), h: vh - 104 })} minW={300} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <nav role="tablist" aria-label="Catálogo" className="flex min-w-0 flex-1 gap-4 overflow-x-auto text-sm">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => pickTab(id)} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", tab === id ? "text-white" : "text-[#93a79a] hover:text-white")}>
              <Icon className="h-4 w-4 shrink-0" />{label}
            </button>
          ))}
        </nav>
        <button type="button" aria-label="Fechar catálogo" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      {tab === "aliens" && <AlienCatalogBody />}
      {tab === "souls" && <SoulLibraryBody focus={soulFocus} onBird={id => { setBirdFocus(f => ({ id, n: (f?.n ?? 0) + 1 })); setTab("birds") }} />}
      {tab === "birds" && <BirdGuideBody focus={birdFocus} onSoul={id => { setSoulFocus(f => ({ id, n: (f?.n ?? 0) + 1 })); setTab("souls") }} />}
    </FloatingPanel>
  )
}
