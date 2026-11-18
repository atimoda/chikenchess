"use client"

// The Sun button's panel: the current Pátio's own settings (its limits), saved with the Pátio like its layout.
// Whoever may edit the Pátio changes them; everyone else sees them.
import { useState } from "react"
import { RotateCcw, X } from "lucide-react"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"
import { PatioDualRange } from "@/components/ui/patio-dual-range"
import type { PatioLayout } from "@/lib/pigchicken/layout"
import { DEFAULT_PATIO_SETTINGS, PATIO_GROUND, PATIO_HEIGHT, PATIO_INVENTORY, PATIO_SCREENS, PATIO_ZOOM, patioGround, patioHeight, patioInventoryLimit, patioItemGlow, patioSceneMusic, patioTemple, patioZoom, type PatioSettings, type PatioZoom } from "@/lib/pigchicken/patio-settings"
import { PATIO_DEFAULTS_PATH } from "@/lib/pigchicken/patio-defaults"
import { saveDefaultPatioSettings } from "@/lib/admin/game-defaults-client"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { SCENE_W, worldScenes } from "@/lib/pigchicken/world"
import { DEFAULT_PARQUINHO } from "@/lib/pigchicken/settings"
import { hourLabel } from "@/lib/pigchicken/sky"
import { AuroraFields, CloudFields, SnowfallFields, MountainFields, SkyFields, StarFields } from "./sky-fields"
import { ForestFields } from "./forest-fields"
import { SkylineFields } from "./skyline-fields"
import { backdropLayers } from "@/lib/pigchicken/backdrop-layers"
import { MOUNTAINS_DEFAULT } from "@/lib/pigchicken/mountains"
import { ITEM_GLOW, ITEM_GLOW_COLOR } from "@/lib/pigchicken/item-glow"

const units = (v: number) => v.toLocaleString("pt-BR")
// the zoom's slider runs on a log scale (each step the same proportion); its left end, below the floor, is the
// whole Pátio
const ZOOM_STEP = 0.05, ZOOM_LEFT = -3.4, ZOOM_RIGHT = Math.log2(PATIO_ZOOM.ceil)
const zoomPct = (z: number) => `${Math.round(z * 100)}%`
const zoomLabel = (z: PatioZoom) => `${z.min === 0 ? "Pátio inteiro" : zoomPct(z.min)} – ${zoomPct(z.max)}`

// the layers a row of Prédios can stand between: the ranges and the tree lines this Pátio shows
function skylineNeighbours(s: PatioSettings | undefined) {
  return backdropLayers({ mountains: s?.mountains ?? MOUNTAINS_DEFAULT, clouds: false, forest: s?.sky?.forest !== false })
    .filter(l => l.id !== "sun" && !(l.id === "forestFar" && s?.forest?.far.show === false) && !(l.id === "forestNear" && s?.forest?.near.show === false))
}

// (the Grade de blocos has its own panel: components/pigchicken/mine-grid-panel.tsx)
export function PatioSettingsPanel({ layout, screens, canEdit, onChange, onClose }: {
  layout: PatioLayout; screens: number; canEdit: boolean
  onChange: (layout: PatioLayout) => void; onClose: () => void
}) {
  const height = patioHeight(layout.settings)
  const ground = patioGround(layout.settings)
  // Padrão: what a new empty Pátio gets (the game's defaults file, the code's values where it has none)
  const base = { screens: DEFAULT_PATIO_SETTINGS.screens ?? DEFAULT_PARQUINHO.screens, height: patioHeight(DEFAULT_PATIO_SETTINGS), ground: patioGround(DEFAULT_PATIO_SETTINGS), inventory: patioInventoryLimit(DEFAULT_PATIO_SETTINGS), zoom: DEFAULT_PATIO_SETTINGS.zoom }
  const zoom = patioZoom(layout.settings)
  const inventory = patioInventoryLimit(layout.settings)
  const itemsLabel = `${inventory} ${inventory === 1 ? "item" : "itens"}`
  const glow = patioItemGlow(layout.settings)
  // Brilho dos itens: 0 takes it out of the Pátio's settings (off, as before it existed); the color stays meanwhile
  const setGlow = (amount: number, color = glow.color) => {
    const { itemGlow: _old, ...rest } = layout.settings ?? {}
    onChange({ ...layout, settings: amount > 0 || color !== ITEM_GLOW_COLOR ? { ...rest, itemGlow: { amount, color } } : rest })
  }
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
        {canEdit && <button type="button" aria-label="Padrão" onClick={() => set(base)} title="Padrão: volta largura, altura, espaço abaixo do chão, limite do inventário e zoom para o padrão do jogo" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166]"><RotateCcw className="h-4 w-4" /></button>}
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166]"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      {canEdit ? (
        <>
          <div className="grid gap-field border-b border-white/10 px-4 pb-4">
          <PatioRange label="Largura limite" min={PATIO_SCREENS.min} max={PATIO_SCREENS.max} step={PATIO_SCREENS.step} value={screens}
            display={`${screens} ${screens === 1 ? "tela" : "telas"}`} onChange={v => set({ screens: v })}
            hint={`Telas do Parquinho antes do Templo e da Vila. O mundo inteiro tem ${units(width)} unidades de largura.`} />
          <PatioRange label="Altura limite" min={PATIO_HEIGHT.min} max={PATIO_HEIGHT.max} step={PATIO_HEIGHT.step} value={height}
            display={`${units(height)} u`} onChange={v => set({ height: v })} onReset={() => set({ height: base.height })}
            hint="Do chão até o teto do mundo. A câmera para no teto e a galinha pode escalá-lo." />
          <PatioRange label="Espaço abaixo do chão" min={PATIO_GROUND.min} max={PATIO_GROUND.max} step={PATIO_GROUND.step} value={ground}
            display={`${ground} px`} onChange={v => set({ ground: v })} onReset={() => set({ ground: base.ground })}
            hint="Quanto chão aparece abaixo dos bonecos, no pé da tela, onde fica a barra do inventário. No celular em pé, o espaço é o dos controles de toque." />
          <PatioRange label="Limite do inventário" min={PATIO_INVENTORY.min} max={PATIO_INVENTORY.max} step={PATIO_INVENTORY.step} value={inventory}
            display={itemsLabel} onChange={v => set({ inventory: v })} onReset={() => set({ inventory: base.inventory })}
            hint="Quantos itens cada player carrega neste Pátio. Baixar o limite não tira itens de ninguém; só não cabem novos." />
          <PatioDualRange label="Zoom" min={ZOOM_LEFT} max={ZOOM_RIGHT} step={ZOOM_STEP}
            lo={zoom.min === 0 ? ZOOM_LEFT : Math.log2(zoom.min)} hi={Math.log2(zoom.max)} display={zoomLabel(zoom)}
            onChange={(a, b) => {
              const max = Math.round(2 ** b * 100) / 100
              set({ zoom: { min: 2 ** a < PATIO_ZOOM.floor ? 0 : Math.min(max, Math.round(2 ** a * 100) / 100), max } })
            }}
            onReset={() => set({ zoom: base.zoom })}
            hint="Até onde a câmera afasta (ponto da esquerda) e aproxima (ponto da direita). Na ponta esquerda, Pátio inteiro: afasta até o Pátio todo caber na tela." />
          <div className="grid grid-cols-[1fr_40px] items-center gap-1.5">
            <PatioRange label="Brilho dos itens" min={ITEM_GLOW.min} max={ITEM_GLOW.max} step={ITEM_GLOW.step} value={glow.amount}
              display={glow.amount ? `${glow.amount}%` : "Desligado"} onChange={v => setGlow(v)} onReset={() => setGlow(0)}
              hint="Uma coluna de luz sobre cada item caído no chão e um contorno aceso em volta dele. Valores baixos ficam bem suaves." />
            <input type="color" aria-label="Cor do brilho dos itens" title="Cor do brilho dos itens" value={glow.color} onChange={e => setGlow(glow.amount, e.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-white/15 bg-transparent p-0" />
          </div>
          <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title="Cada cena toca a sua zona (Campo, Noite, Feira…). Desligado, só as Zonas do mapa tocam; fora delas não há percussão nem drone.">
            <span>Zonas das cenas</span>
            <input type="checkbox" checked={patioSceneMusic(layout.settings)} onChange={e => {
              const { sceneMusic: _old, ...rest } = layout.settings ?? {}
              onChange({ ...layout, settings: e.target.checked ? rest : { ...rest, sceneMusic: false } })
            }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title="Os terraços e a placa ao fundo da Vila dos Telhados, no fim do mundo. O Templo do Gongo e as casas da Vila são elementos do Modo editor.">
            <span>Fundo da Vila</span>
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
          {group("Estrelas", <StarFields sky={layout.settings?.sky} onChange={sky => onChange({ ...layout, settings: { ...layout.settings, sky } })} />)}
          {group("Aurora", <AuroraFields aurora={layout.settings?.aurora} onChange={aurora => {
            const { aurora: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: aurora ? { ...rest, aurora } : rest })
          }} />)}
          {group("Montanhas", <MountainFields mountains={layout.settings?.mountains} onChange={mountains => {
            const { mountains: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: mountains ? { ...rest, mountains } : rest })
          }} />)}
          {group("Mata", <ForestFields forest={layout.settings?.forest} skyForest={layout.settings?.sky?.forest !== false} onChange={forest => {
            const { forest: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: forest ? { ...rest, forest } : rest })
          }} />)}
          {group("Prédios", <SkylineFields skyline={layout.settings?.skyline} layers={skylineNeighbours(layout.settings)} onChange={skyline => {
            const { skyline: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: skyline ? { ...rest, skyline } : rest })
          }} />)}
          {group("Nuvens", <CloudFields clouds={layout.settings?.clouds} skyClouds={layout.settings?.sky?.clouds} onChange={clouds => {
            const { clouds: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: clouds ? { ...rest, clouds } : rest })
          }} />)}
          {group("Neve caindo", <SnowfallFields snowfall={layout.settings?.snowfall} onChange={snowfall => {
            const { snowfall: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: snowfall ? { ...rest, snowfall } : rest })
          }} />)}
        </>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-4 text-[#dfe8df]">
          <dt>Largura limite</dt><dd className="font-bold">{screens} {screens === 1 ? "tela" : "telas"} · {units(width)} u</dd>
          <dt>Altura limite</dt><dd className="font-bold">{units(height)} u</dd>
          <dt>Espaço abaixo do chão</dt><dd className="font-bold">{ground} px</dd>
          <dt>Limite do inventário</dt><dd className="font-bold">{itemsLabel}</dd>
          <dt>Zoom</dt><dd className="font-bold">{zoomLabel(zoom)}</dd>
          <dt>Brilho dos itens</dt><dd className="font-bold">{glow.amount ? `${glow.amount}%` : "Desligado"}</dd>
          <dt>Zonas das cenas</dt><dd className="font-bold">{patioSceneMusic(layout.settings) ? "Ligadas" : "Desligadas"}</dd>
          <dt>Céu</dt><dd className="font-bold">{layout.settings?.sky ? hourLabel(layout.settings.sky.hour) : "Clássico"}</dd>
          <dt>Fundo da Vila</dt><dd className="font-bold">{patioTemple(layout.settings) ? "Sim" : "Não"}</dd>
          <dt>Montanhas</dt><dd className="font-bold">{layout.settings?.mountains?.show === false ? "Escondidas" : "Visíveis"}</dd>
        </dl>
      )}
      <SaveToGameButton path={PATIO_DEFAULTS_PATH} save={() => saveDefaultPatioSettings(layout.settings, screens)} className="justify-end px-4 py-3" />
      {!canEdit && <p className="px-4 py-3 text-[10px] leading-relaxed text-[#93a79a]">Só quem pode editar este Pátio muda as configurações.</p>}
      </div>
    </FloatingPanel>
  )
}
