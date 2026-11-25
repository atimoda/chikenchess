"use client"

// The Grade de blocos' own panel (the grid button in the Pátio's header): its settings, saved with the Pátio like
// the rest of its settings (settings.mineGrid), and "Resetar grade". At the end, Reverter para o padrão and (admin)
// Salvar no game: the grid's settings, all but Ligar, become what a Pátio that saved none starts with.
import { useSyncExternalStore } from "react"
import { X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import type { PatioLayout } from "@/lib/pigchicken/layout"
import { MineGridFields } from "./mine-grid-fields"
import { defaultMineGrid, mineGridAtDefault, mineGridIsDefault } from "@/lib/pigchicken/mine-grid"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { saveDefaultMineGrid } from "@/lib/admin/game-defaults-client"
import { hideActivatedMineGrid, mineActivatorStore } from "@/lib/pigchicken/mine-activator-store"

// canGrid: may turn the grid on and off (the Pátio's creator, its godparent, the admin); onResetGrid: may start its
// round again (them and the room's owner)
export function MineGridPanel({ layout, canEdit, canGrid, onResetGrid, onChange, onClose }: {
  layout: PatioLayout; canEdit: boolean; canGrid: boolean; onResetGrid?: () => void
  onChange: (layout: PatioLayout) => void; onClose: () => void
}) {
  // a grid an Ativador de grid de campo minado turned on shows as on: turning it off hides it, and the activators
  // come back
  const activated = !!useSyncExternalStore(mineActivatorStore.subscribe, () => mineActivatorStore.via, () => null)
  const saved = layout.settings?.mineGrid, shown = !!saved?.on || activated
  const grid = saved || activated ? { ...(saved ?? defaultMineGrid()), on: shown } : undefined
  return (
    <FloatingPanel id="mine-grid" aria-label="Grade de blocos" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(340, vw - 24), h: Math.min(380, vh - 80) })} className="rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-4">
        <h2 className="flex-1 text-sm text-white">Grade de blocos</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166]"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MineGridFields grid={grid} canEdit={canEdit} canToggle={canGrid} onReset={onResetGrid}
          onChange={mineGrid => {
            if (activated && !mineGrid.on) {
              hideActivatedMineGrid()
              // (only shown by an activator: the Pátio itself has nothing to change)
              if (!saved?.on) return
            }
            // "Grade ligada" itself saves what was asked; any other change keeps the saved one
            onChange({ ...layout, settings: { ...layout.settings, mineGrid: { ...mineGrid, on: mineGrid.on !== shown ? mineGrid.on : !!saved?.on } } })
          }} />
        <SaveToGameButton part="mineGrid" save={() => saveDefaultMineGrid(grid ?? defaultMineGrid())} className="justify-end px-4 py-3"
          onRevert={canEdit ? () => { if (saved) onChange({ ...layout, settings: { ...layout.settings, mineGrid: mineGridAtDefault(saved) } }) } : undefined}
          revertDisabled={mineGridIsDefault(saved)} />
      </div>
    </FloatingPanel>
  )
}
