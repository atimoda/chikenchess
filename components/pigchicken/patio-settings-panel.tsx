"use client"

// The Sun button's panel: the current Pátio's own settings (its limits), saved with the Pátio like its layout.
// Whoever may edit the Pátio changes them; everyone else sees them.
import { useState } from "react"
import { X } from "lucide-react"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"
import type { PatioLayout } from "@/lib/pigchicken/layout"
import { PATIO_HEIGHT, PATIO_INVENTORY, PATIO_SCREENS, patioHeight, patioInventoryLimit, patioSceneMusic, patioTemple, type PatioSettings } from "@/lib/pigchicken/patio-settings"
import { SCENE_W, worldScenes } from "@/lib/pigchicken/world"
import { DEFAULT_PARQUINHO } from "@/lib/pigchicken/settings"
import { hourLabel } from "@/lib/pigchicken/sky"
import { CloudFields, MountainFields, SkyFields } from "./sky-fields"

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
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const group = (title: string, children: React.ReactNode) => (
    <PatioDisclosure title={title} open={!!open[title]} onToggle={v => setOpen(o => ({ ...o, [title]: v }))}>{open[title] && children}</PatioDisclosure>
  )
  return (
    <FloatingPanel id="patio-settings" aria-label="Configurações do Pátio" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(340, vw - 24), h: Math.min(canEdit ? 720 : 300, vh - 80) })} className="rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-4">
        <h2 className="flex-1 text-sm text-white">Configurações do Pátio</h2>
        {canEdit && <button type="button" onClick={() => set({ screens: DEFAULT_PARQUINHO.screens, height: PATIO_HEIGHT.default, inventory: PATIO_INVENTORY.default })} title="Volta largura, altura e limite do inventário para o padrão" className="h-7 rounded-md border border-white/20 px-2 hover:border-[#ffd166]">Padrão</button>}
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166]"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      {canEdit ? (
        <>
          <div className="grid gap-[3px] border-b border-white/10 px-4 pb-4">
          <PatioRange label="Largura limite" min={PATIO_SCREENS.min} max={PATIO_SCREENS.max} step={PATIO_SCREENS.step} value={screens}
            display={`${screens} ${screens === 1 ? "tela" : "telas"}`} onChange={v => set({ screens: v })}
            hint={`Telas do Parquinho antes do Templo e da Vila. O mundo inteiro tem ${units(width)} unidades de largura.`} />
          <PatioRange label="Altura limite" min={PATIO_HEIGHT.min} max={PATIO_HEIGHT.max} step={PATIO_HEIGHT.step} value={height}
            display={`${units(height)} u`} onChange={v => set({ height: v })} onReset={() => set({ height: PATIO_HEIGHT.default })}
            hint="Do chão até o teto do mundo. A câmera para no teto e a galinha pode escalá-lo." />
          <PatioRange label="Limite do inventário" min={PATIO_INVENTORY.min} max={PATIO_INVENTORY.max} step={PATIO_INVENTORY.step} value={inventory}
            display={itemsLabel} onChange={v => set({ inventory: v })} onReset={() => set({ inventory: PATIO_INVENTORY.default })}
            hint="Quantos itens cada player carrega neste Pátio. Baixar o limite não tira itens de ninguém; só não cabem novos." />
          <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title="Cada cena toca a sua zona (Campo, Noite, Feira…). Desligado, só as Zonas sonoras do mapa tocam; fora delas não há percussão nem drone.">
            <span>Zonas das cenas</span>
            <input type="checkbox" checked={patioSceneMusic(layout.settings)} onChange={e => {
              const { sceneMusic: _old, ...rest } = layout.settings ?? {}
              onChange({ ...layout, settings: e.target.checked ? rest : { ...rest, sceneMusic: false } })
            }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title="O Templo do Gongo (gongo, jukebox e os suportes de armas da entrada) e a Vila dos Telhados no fim do mundo. Desligado, as duas cenas ficam vazias.">
            <span>Templo e Vila</span>
            <input type="checkbox" checked={patioTemple(layout.settings)} onChange={e => {
              const { temple: _old, ...rest } = layout.settings ?? {}
              onChange({ ...layout, settings: e.target.checked ? rest : { ...rest, temple: false } })
            }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          </div>
          {group("Céu e luz", <SkyFields sky={layout.settings?.sky} onChange={sky => {
            const { sky: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: sky ? { ...rest, sky } : rest })
          }} />)}
          {group("Montanhas", <MountainFields mountains={layout.settings?.mountains} onChange={mountains => {
            const { mountains: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: mountains ? { ...rest, mountains } : rest })
          }} />)}
          {group("Nuvens", <CloudFields clouds={layout.settings?.clouds} skyClouds={layout.settings?.sky?.clouds} onChange={clouds => {
            const { clouds: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: clouds ? { ...rest, clouds } : rest })
          }} />)}
        </>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-4 text-[#dfe8df]">
          <dt>Largura limite</dt><dd className="font-bold">{screens} {screens === 1 ? "tela" : "telas"} · {units(width)} u</dd>
          <dt>Altura limite</dt><dd className="font-bold">{units(height)} u</dd>
          <dt>Limite do inventário</dt><dd className="font-bold">{itemsLabel}</dd>
          <dt>Zonas das cenas</dt><dd className="font-bold">{patioSceneMusic(layout.settings) ? "Ligadas" : "Desligadas"}</dd>
          <dt>Céu</dt><dd className="font-bold">{layout.settings?.sky ? hourLabel(layout.settings.sky.hour) : "Clássico"}</dd>
          <dt>Templo e Vila</dt><dd className="font-bold">{patioTemple(layout.settings) ? "Sim" : "Não"}</dd>
          <dt>Montanhas</dt><dd className="font-bold">{layout.settings?.mountains?.show === false ? "Escondidas" : "Visíveis"}</dd>
        </dl>
      )}
      {!canEdit && <p className="px-4 py-3 text-[10px] leading-relaxed text-[#93a79a]">Só quem pode editar este Pátio muda as configurações.</p>}
      </div>
    </FloatingPanel>
  )
}
