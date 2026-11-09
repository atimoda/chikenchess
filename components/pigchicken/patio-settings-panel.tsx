"use client"

// The Sun button's panel: the current Pátio's own settings (its limits), saved with the Pátio like its layout.
// Whoever may edit the Pátio changes them; everyone else sees them.
import { X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"
import type { PatioLayout } from "@/lib/pigchicken/layout"
import { PATIO_HEIGHT, PATIO_INVENTORY, PATIO_SCREENS, patioHeight, patioInventoryLimit, type PatioSettings } from "@/lib/pigchicken/patio-settings"
import { SCENE_W, worldScenes } from "@/lib/pigchicken/world"
import { DEFAULT_PARQUINHO } from "@/lib/pigchicken/settings"

const units = (v: number) => v.toLocaleString("pt-BR")

export function PatioSettingsPanel({ layout, screens, canEdit, onChange, onClose }: {
  layout: PatioLayout; screens: number; canEdit: boolean
  onChange: (layout: PatioLayout) => void; onClose: () => void
}) {
  const height = patioHeight(layout.settings)
  const inventory = patioInventoryLimit(layout.settings)
  const itemsLabel = `${inventory} ${inventory === 1 ? "item" : "itens"}`
  const set = (next: PatioSettings) => onChange({ ...layout, settings: { ...layout.settings, ...next } })
  const width = worldScenes(screens) * SCENE_W
  return (
    <FloatingPanel id="patio-settings" aria-label="Configurações do Pátio" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(340, vw - 24), h: Math.min(canEdit ? 420 : 260, vh - 80) })} className="gap-3 overflow-y-auto rounded-xl border border-[#ffd166]/40 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Configurações do Pátio</h2>
        {canEdit && <button type="button" onClick={() => set({ screens: DEFAULT_PARQUINHO.screens, height: PATIO_HEIGHT.default, inventory: PATIO_INVENTORY.default })} title="Volta largura, altura e limite do inventário para o padrão" className="h-7 rounded-md border border-white/20 px-2 hover:border-[#ffd166]">Padrão</button>}
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166]"><X className="h-4 w-4" /></button>
      </div>
      {canEdit ? (
        <>
          <PatioRange label="Largura limite" min={PATIO_SCREENS.min} max={PATIO_SCREENS.max} step={PATIO_SCREENS.step} value={screens}
            display={`${screens} ${screens === 1 ? "tela" : "telas"}`} onChange={v => set({ screens: v })}
            hint={`Telas do Parquinho antes do Templo e da Vila. O mundo inteiro tem ${units(width)} unidades de largura.`} />
          <PatioRange label="Altura limite" min={PATIO_HEIGHT.min} max={PATIO_HEIGHT.max} step={PATIO_HEIGHT.step} value={height}
            display={`${units(height)} u`} onChange={v => set({ height: v })} onReset={() => set({ height: PATIO_HEIGHT.default })}
            hint="Do chão até o teto do mundo. A câmera para no teto e a galinha pode escalá-lo." />
          <PatioRange label="Limite do inventário" min={PATIO_INVENTORY.min} max={PATIO_INVENTORY.max} step={PATIO_INVENTORY.step} value={inventory}
            display={itemsLabel} onChange={v => set({ inventory: v })} onReset={() => set({ inventory: PATIO_INVENTORY.default })}
            hint="Quantos itens cada player carrega neste Pátio. Baixar o limite não tira itens de ninguém; só não cabem novos." />
        </>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[#dfe8df]">
          <dt>Largura limite</dt><dd className="font-bold">{screens} {screens === 1 ? "tela" : "telas"} · {units(width)} u</dd>
          <dt>Altura limite</dt><dd className="font-bold">{units(height)} u</dd>
          <dt>Limite do inventário</dt><dd className="font-bold">{itemsLabel}</dd>
        </dl>
      )}
      <p className="text-[10px] leading-relaxed text-[#93a79a]">
        {canEdit ? "Salvo junto com o Pátio. " : "Só quem pode editar este Pátio muda as configurações. "}
        Os quatro limites têm uma borda preta: a galinha escala as paredes e o teto, e pendura de cabeça para baixo nele.
      </p>
    </FloatingPanel>
  )
}
