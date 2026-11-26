"use client"

// The Sun button's panel: the current Pátio's own settings (its limits), saved with the Pátio like its layout.
// Whoever may edit the Pátio changes them; everyone else sees them.
import { useState } from "react"
import { X } from "lucide-react"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"
import { PatioDualRange } from "@/components/ui/patio-dual-range"
import type { PatioLayout } from "@/lib/pigchicken/layout"
import { DEFAULT_PATIO_SETTINGS, PATIO_GROUND, PATIO_HEIGHT, PATIO_INVENTORY, PATIO_SCREENS, PATIO_ZOOM, patioGround, patioHeight, patioInventoryLimit, patioItemGlow, patioPvp, patioSceneMusic, patioSettingsAtDefault, patioTemple, patioZoom, type PatioSettings, type PatioZoom } from "@/lib/pigchicken/patio-settings"
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
import { ITEM_GLOW, ITEM_GLOW_GROUPS, sameItemGlowColors, type ItemGlowColors } from "@/lib/pigchicken/item-glow"
import { msg, t as tr, useT } from "@/lib/i18n"

const units = (v: number) => v.toLocaleString("pt-BR")
// the zoom's slider runs on a log scale (each step the same proportion); its left end, below the floor, is the
// whole Pátio (Full Size)
const ZOOM_STEP = 0.05, ZOOM_LEFT = -3.4, ZOOM_RIGHT = Math.log2(PATIO_ZOOM.ceil)
const zoomPct = (z: number) => `${Math.round(z * 100)}%`
const zoomLabel = (z: PatioZoom) => `${z.min === 0 ? tr("Full Size") : zoomPct(z.min)} – ${zoomPct(z.max)}`

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
  const t = useT()
  const height = patioHeight(layout.settings)
  const ground = patioGround(layout.settings)
  // each field's own reset: what a new empty Pátio gets (the game's defaults file, the code's values where it has none)
  const base = { screens: DEFAULT_PATIO_SETTINGS.screens ?? DEFAULT_PARQUINHO.screens, height: patioHeight(DEFAULT_PATIO_SETTINGS), ground: patioGround(DEFAULT_PATIO_SETTINGS), inventory: patioInventoryLimit(DEFAULT_PATIO_SETTINGS), zoom: DEFAULT_PATIO_SETTINGS.zoom }
  // Reverter para o padrão: every field of this panel as a new empty Pátio gets it (the game's defaults file, the
  // code's values where it has none), so a Salvar no game right after it has nothing to write
  const revert = () => onChange({ ...layout, settings: patioSettingsAtDefault(layout.settings, base.screens) })
  const zoom = patioZoom(layout.settings)
  const inventory = patioInventoryLimit(layout.settings)
  const itemsLabel = inventory === 1 ? t("{n} item", { n: inventory }) : t("{n} itens", { n: inventory })
  const glow = patioItemGlow(layout.settings)
  // Brilho dos itens: 0 with the default colors takes it out of the Pátio's settings (off, as before it existed);
  // the colors of each group stay meanwhile
  const setGlow = (amount: number, colors: ItemGlowColors = glow.colors) => {
    const { itemGlow: _old, ...rest } = layout.settings ?? {}
    onChange({ ...layout, settings: amount > 0 || !sameItemGlowColors(colors) ? { ...rest, itemGlow: { amount, colors } } : rest })
  }
  const set = (next: PatioSettings) => onChange({ ...layout, settings: { ...layout.settings, ...next } })
  const width = worldScenes(screens) * SCENE_W
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const group = (title: string, children: React.ReactNode) => (
    <PatioDisclosure title={t(title)} open={!!open[title]} onToggle={v => setOpen(o => ({ ...o, [title]: v }))}>{open[title] && children}</PatioDisclosure>
  )
  return (
    <FloatingPanel id="patio-settings" aria-label={t("Configurações do Pátio")} initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(340, vw - 24), h: Math.min(canEdit ? 720 : 300, vh - 80) })} className="rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-4">
        <h2 className="flex-1 text-sm text-white">{t("Configurações do Pátio")}</h2>
        <button type="button" aria-label={t("Fechar")} onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-[#ffd166]"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      {canEdit ? (
        <>
          {/* Lock: whoever may not edit this Pátio plays it as it is, changing nothing in the panels of characters,
              items, scales, camera, layers and volumes (lib/pigchicken/patio-tuning.ts) */}
          <label className="mx-4 mb-3 flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title={t("Trava os ajustes deste Pátio (personagens, itens, escalas, câmera, camadas e volumes): só quem pode editá-lo muda")}>
            <span className={layout.settings?.locked ? "text-[#ffd166]" : undefined}>{t("Lock")}</span>
            <input type="checkbox" checked={!!layout.settings?.locked} onChange={e => { const { locked: _l, ...rest } = layout.settings ?? {}; onChange({ ...layout, settings: e.target.checked ? { ...rest, locked: true } : rest }) }} className="h-5 w-5 accent-[#ffd166]" />
          </label>
          <div className="grid gap-field border-b border-white/10 px-4 pb-4">
          <PatioRange label={t("Largura limite")} min={PATIO_SCREENS.min} max={PATIO_SCREENS.max} step={PATIO_SCREENS.step} value={screens}
            display={screens === 1 ? t("{n} tela", { n: screens }) : t("{n} telas", { n: screens })} onChange={v => set({ screens: v })}
            hint={t("Telas do Parquinho antes do Templo e da Vila. O mundo inteiro tem {v} unidades de largura.", { v: units(width) })} />
          <PatioRange label={t("Altura limite")} min={PATIO_HEIGHT.min} max={PATIO_HEIGHT.max} step={PATIO_HEIGHT.step} value={height}
            display={`${units(height)} u`} onChange={v => set({ height: v })} onReset={() => set({ height: base.height })}
            hint={t("Do chão até o teto do mundo. A câmera para no teto e a galinha pode escalá-lo.")} />
          <PatioRange label={t("Espaço abaixo do chão")} min={PATIO_GROUND.min} max={PATIO_GROUND.max} step={PATIO_GROUND.step} value={ground}
            display={t("{ground} px", { ground })} onChange={v => set({ ground: v })} onReset={() => set({ ground: base.ground })}
            hint={t("Quanto chão aparece abaixo dos bonecos, no pé da tela, onde fica a barra do inventário. No celular em pé, o espaço é o dos controles de toque.")} />
          <PatioRange label={t("Limite do inventário")} min={PATIO_INVENTORY.min} max={PATIO_INVENTORY.max} step={PATIO_INVENTORY.step} value={inventory}
            display={itemsLabel} onChange={v => set({ inventory: v })} onReset={() => set({ inventory: base.inventory })}
            hint={t("Quantos itens cada player carrega neste Pátio. Baixar o limite não tira itens de ninguém; só não cabem novos.")} />
          <PatioDualRange label={t("Zoom")} min={ZOOM_LEFT} max={ZOOM_RIGHT} step={ZOOM_STEP}
            lo={zoom.min === 0 ? ZOOM_LEFT : Math.log2(zoom.min)} hi={Math.log2(zoom.max)} display={zoomLabel(zoom)}
            onChange={(a, b) => {
              const max = Math.round(2 ** b * 100) / 100
              set({ zoom: { min: 2 ** a < PATIO_ZOOM.floor ? 0 : Math.min(max, Math.round(2 ** a * 100) / 100), max } })
            }}
            onReset={() => set({ zoom: base.zoom })}
            hint={t("Até onde a câmera afasta (ponto da esquerda) e aproxima (ponto da direita). Na ponta esquerda, Full Size: afasta até o Pátio todo caber na tela.")} />
          <div className="space-y-1.5">
            <PatioRange label={t("Brilho dos itens")} min={ITEM_GLOW.min} max={ITEM_GLOW.max} step={ITEM_GLOW.step} value={glow.amount}
              display={glow.amount ? `${glow.amount}%` : t("Desligado")} onChange={v => setGlow(v)} onReset={() => setGlow(0)}
              hint={t("Uma coluna de luz sobre cada item caído no chão e um contorno aceso em volta dele, na cor do grupo do item. Valores baixos ficam bem suaves.")} />
            <div className="grid grid-cols-4 gap-1.5">
              {ITEM_GLOW_GROUPS.map(g => (
                <label key={g.id} title={t("Cor do brilho: {label}", { label: t(g.label) })} className="flex cursor-pointer flex-col items-center gap-1 text-[10px] text-[#b9c7b9]">
                  <input type="color" aria-label={t("Cor do brilho: {label}", { label: t(g.label) })} value={glow.colors[g.id]} onChange={e => setGlow(glow.amount, { ...glow.colors, [g.id]: e.target.value })} className="h-8 w-full cursor-pointer rounded-md border border-white/15 bg-transparent p-0" />
                  {t(g.label)}
                </label>
              ))}
            </div>
          </div>
          <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title={t("Cada cena toca a sua zona (Campo, Noite, Feira…). Desligado, só as Zonas do mapa tocam; fora delas não há percussão nem drone.")}>
            <span>{t("Zonas das cenas")}</span>
            <input type="checkbox" checked={patioSceneMusic(layout.settings)} onChange={e => {
              const { sceneMusic: _old, ...rest } = layout.settings ?? {}
              onChange({ ...layout, settings: e.target.checked ? rest : { ...rest, sceneMusic: false } })
            }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title={t("Tiros, golpes, arremessos e o gancho de um player tiram vida dos outros. Com a vida zerada, ele vira Kid e larga os itens.")}>
            <span>{t("Dano entre jogadores")}</span>
            <input type="checkbox" checked={patioPvp(layout.settings)} onChange={e => {
              const { pvp: _old, ...rest } = layout.settings ?? {}
              onChange({ ...layout, settings: e.target.checked ? { ...rest, pvp: true } : rest })
            }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title={t("Os terraços e a placa ao fundo da Vila dos Telhados, no fim do mundo. O Templo do Gongo e as casas da Vila são elementos do Modo editor.")}>
            <span>{t("Fundo da Vila")}</span>
            <input type="checkbox" checked={patioTemple(layout.settings)} onChange={e => {
              const { temple: _old, ...rest } = layout.settings ?? {}
              onChange({ ...layout, settings: e.target.checked ? rest : { ...rest, temple: false } })
            }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          </div>
          {group(msg("Céu e luz"), <SkyFields sky={layout.settings?.sky} onChange={sky => {
            const { sky: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: sky ? { ...rest, sky } : rest })
          }} />)}
          {group(msg("Estrelas"), <StarFields sky={layout.settings?.sky} onChange={sky => onChange({ ...layout, settings: { ...layout.settings, sky } })} />)}
          {group(msg("Aurora"), <AuroraFields aurora={layout.settings?.aurora} onChange={aurora => {
            const { aurora: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: aurora ? { ...rest, aurora } : rest })
          }} />)}
          {group(msg("Montanhas"), <MountainFields mountains={layout.settings?.mountains} onChange={mountains => {
            const { mountains: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: mountains ? { ...rest, mountains } : rest })
          }} />)}
          {group(msg("Mata"), <ForestFields forest={layout.settings?.forest} skyForest={layout.settings?.sky?.forest !== false} onChange={forest => {
            const { forest: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: forest ? { ...rest, forest } : rest })
          }} />)}
          {group(msg("Prédios"), <SkylineFields skyline={layout.settings?.skyline} layers={skylineNeighbours(layout.settings)} onChange={skyline => {
            const { skyline: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: skyline ? { ...rest, skyline } : rest })
          }} />)}
          {group(msg("Nuvens"), <CloudFields clouds={layout.settings?.clouds} skyClouds={layout.settings?.sky?.clouds} onChange={clouds => {
            const { clouds: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: clouds ? { ...rest, clouds } : rest })
          }} />)}
          {group(msg("Neve caindo"), <SnowfallFields snowfall={layout.settings?.snowfall} onChange={snowfall => {
            const { snowfall: _old, ...rest } = layout.settings ?? {}
            onChange({ ...layout, settings: snowfall ? { ...rest, snowfall } : rest })
          }} />)}
        </>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-4 text-[#dfe8df]">
          <dt>{t("Largura limite")}</dt><dd className="font-bold">{screens} {screens === 1 ? t("tela") : t("telas")} · {units(width)} u</dd>
          <dt>{t("Altura limite")}</dt><dd className="font-bold">{units(height)} u</dd>
          <dt>{t("Espaço abaixo do chão")}</dt><dd className="font-bold">{ground} {t("px")}</dd>
          <dt>{t("Limite do inventário")}</dt><dd className="font-bold">{itemsLabel}</dd>
          <dt>{t("Zoom")}</dt><dd className="font-bold">{zoomLabel(zoom)}</dd>
          <dt>{t("Brilho dos itens")}</dt><dd className="font-bold">{glow.amount ? `${glow.amount}%` : t("Desligado")}</dd>
          <dt>{t("Zonas das cenas")}</dt><dd className="font-bold">{patioSceneMusic(layout.settings) ? t("Ligadas") : t("Desligadas")}</dd>
          <dt>{t("Céu")}</dt><dd className="font-bold">{layout.settings?.sky ? hourLabel(layout.settings.sky.hour) : t("Clássico")}</dd>
          <dt>{t("Dano entre jogadores")}</dt><dd className="font-bold">{patioPvp(layout.settings) ? t("Ligado") : t("Desligado")}</dd>
          <dt>{t("Fundo da Vila")}</dt><dd className="font-bold">{patioTemple(layout.settings) ? t("Sim") : t("Não")}</dd>
          <dt>{t("Lock")}</dt><dd className="font-bold">{layout.settings?.locked ? t("Travado") : t("Livre")}</dd>
          <dt>{t("Montanhas")}</dt><dd className="font-bold">{layout.settings?.mountains?.show === false ? t("Escondidas") : t("Visíveis")}</dd>
        </dl>
      )}
      <SaveToGameButton part="settings" save={() => saveDefaultPatioSettings(layout.settings, screens)} onRevert={canEdit ? revert : undefined} className="justify-end px-4 py-3" />
      {!canEdit && <p className="px-4 py-3 text-[10px] leading-relaxed text-[#93a79a]">{t("Só quem pode editar este Pátio muda as configurações.")}</p>}
      </div>
    </FloatingPanel>
  )
}
