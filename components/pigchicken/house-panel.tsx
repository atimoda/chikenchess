"use client"

import { useId, useRef } from 'react'
import { Dice5, Move, X } from 'lucide-react'
import { FloatingPanel } from '@/components/ui/floating-panel'
import { PatioRange } from '@/components/ui/patio-range'
import { PatioSelect } from '@/components/ui/patio-select'
import {
  HOUSE_DOOR_POSITIONS, HOUSE_GLAZING, HOUSE_ROOFS, HOUSE_STYLES, OPENING_SHAPES, ROOF_TEXTURES, WALL_TEXTURES,
  houseDraftSize, housePreset, randomHouse, type HouseParams,
} from '@/lib/pigchicken/houses'
import { HouseArt } from './house-art'
import type { PatioPlacementHandlers } from './use-patio-placement'
import { msg, useT } from "@/lib/i18n"
import { trRecord } from "@/lib/pigchicken/tr-options"

const BUTTON = 'inline-flex h-8 items-center justify-center gap-2 rounded border border-white/15 px-2.5 text-white hover:border-primary'

export const HOUSE_STYLE_LABELS = Object.fromEntries(Object.entries(HOUSE_STYLES).map(([id, style]) => [id, style.label])) as Record<HouseParams['style'], string>
const COLORS = [['wall', msg('Parede')], ['roofColor', msg('Telhado')], ['trim', msg('Molduras')], ['doorColor', msg('Porta e venezianas')]] as const

export function HousePanel({ house, dimensions = houseDraftSize(house), onChange, onClose, previewDrag, dragging }: {
  house: HouseParams; dimensions?: { w: number; h: number }; onChange: (value: HouseParams, step?: string) => void
  onClose: () => void; previewDrag?: PatioPlacementHandlers; dragging?: boolean
}) {
  const t = useT()
  const gesture = useRef(0)
  const editSession = useId()
  const set = (patch: Partial<HouseParams>, group?: string) => onChange({ ...house, ...patch }, group ? `house:${editSession}:${group}:${gesture.current}` : undefined)
  const end = () => { gesture.current++ }
  const preview = <div className="absolute inset-x-4 top-2 bottom-4 flex justify-center">
    <div className="relative h-full max-w-full" style={{ aspectRatio: `${dimensions.w} / ${dimensions.h}` }}><HouseArt house={house} /></div>
  </div>
  return <FloatingPanel id="patio-house" overDock aria-label={t("Criador de casas")} initial={(vw, vh) => ({ x: Math.max(8, vw - 390), y: 64, w: Math.min(vw - 16, 376), h: Math.min(vh - 78, 660) })}
    minW={245} minH={170} keepInViewport
    className={`rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs text-[#dfe8df] shadow-[0_20px_60px_#0009] ${dragging ? 'pointer-events-none opacity-0' : ''}`}>
    <div data-drag-handle className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
      <h2 className="text-sm text-white">{previewDrag ? t("Criador de casas") : t("Editar casa")}</h2>
      <button type="button" className={BUTTON} aria-label={t("Fechar criador de casas")} onClick={onClose}><X size={16} /></button>
    </div>
    <div className="mx-3 my-2 shrink-0">
      {previewDrag
        ? <button type="button" data-house-preview aria-label={t("Arraste a prévia para inserir a casa")} {...previewDrag}
            className="relative block h-[clamp(64px,20dvh,144px)] w-full cursor-grab touch-none overflow-hidden rounded-md border border-[#ffd166]/35 bg-[#222936] active:cursor-grabbing">
            {preview}<span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#141922]/90 py-0.5 text-[10px] text-[#ffdba1]"><Move size={12} /> {t("Arraste para o Pátio")}</span>
          </button>
        : <div className="relative h-[clamp(64px,20dvh,144px)] overflow-hidden rounded-md border border-white/10 bg-[#222936]">{preview}</div>}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" data-house-parameters>
      <div className="mb-3 grid gap-field">
        <PatioSelect label={t("Estilo")} options={trRecord(HOUSE_STYLE_LABELS)} value={house.style} onChange={style => onChange(housePreset(style, house.seed))} />
        <button type="button" className={`${BUTTON} justify-self-end`} onClick={() => onChange(randomHouse(house.style).house)}
          title={t("Sorteia outra casa deste estilo")}><Dice5 size={15} /> {t("Sortear")}</button>
      </div>
      <fieldset className="mb-4 grid min-w-0 gap-field border-t border-white/10 pt-2">
        <legend className="pr-2 text-[#ffdba1]">{t("Telhado e revestimento")}</legend>
        <PatioSelect label={t("Formato")} name={t("Formato do telhado")} options={trRecord(HOUSE_ROOFS)} value={house.roof} onChange={roof => set({ roof })} />
        <PatioSelect label={t("Acabamento")} options={trRecord(ROOF_TEXTURES)} value={house.roofTexture} onChange={roofTexture => set({ roofTexture })} />
        <PatioSelect label={t("Textura")} options={trRecord(WALL_TEXTURES)} value={house.texture} onChange={texture => set({ texture })} />
        <div className="grid gap-field">
        <PatioRange label={t("Desgaste")} min={0} max={100} value={house.wear} display={`${house.wear}%`} onChange={wear => set({ wear }, 'wear')} onEnd={end} />
        <PatioRange label={house.roof === 'parapet' ? t("Profundidade do terraço") : house.roof === 'flat' ? t("Espaço acima da fachada") : t("Altura do telhado")} min={8} max={40} value={house.pitch}
          display={`${house.pitch}%`} onChange={pitch => set({ pitch }, 'pitch')} onEnd={end} />
        </div>
        <div className="grid grid-cols-2 gap-field">
          {COLORS.map(([key, label]) => <label key={key} className="flex min-w-0 items-center gap-2">
            <input type="color" value={house[key]} onChange={e => set({ [key]: e.target.value }, key)} onBlur={end}
              className="h-7 w-8 shrink-0 cursor-pointer rounded bg-transparent" /><span>{key === 'trim' && house.style === 'paper' ? t("Apoios e molduras") : t(label)}</span>
          </label>)}
        </div>
      </fieldset>
      <fieldset className="grid min-w-0 gap-field border-t border-white/10 pt-2">
        <legend className="pr-2 text-[#ffdba1]">{t("Fachada")}</legend>
        <div className="grid gap-field">
        <PatioRange label={t("Andares")} min={1} max={4} value={house.floors} onChange={floors => set({ floors }, 'floors')} onEnd={end} />
        <PatioRange label={t("Janelas por andar")} min={0} max={4} value={house.windows} onChange={windows => set({ windows }, 'windows')} onEnd={end} />
        </div>
        <PatioSelect label={t("Janelas")} name={t("Formato das janelas")} options={trRecord(OPENING_SHAPES)} value={house.windowShape} onChange={windowShape => set({ windowShape })} />
        <PatioSelect label={t("Luz")} name={t("Luz das janelas")} options={trRecord(HOUSE_GLAZING)} value={house.glass} onChange={glass => set({ glass })} />
        <PatioRange label={t("Tamanho das janelas")} min={65} max={130} value={house.windowSize} display={`${house.windowSize}%`}
          onChange={windowSize => set({ windowSize }, 'windowSize')} onEnd={end} />
        <div className="grid grid-cols-2 gap-field">
          <label className="flex items-center gap-2"><input type="checkbox" checked={house.panes} onChange={e => set({ panes: e.target.checked })} /> {t("Vidro quadriculado")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={house.shutters} onChange={e => set({ shutters: e.target.checked })} /> {t("Venezianas")}</label>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={house.door} onChange={e => set({ door: e.target.checked })} /> {t("Porta")}</label>
        {house.door && <>
          <PatioSelect label={t("Formato")} name={t("Formato da porta")} options={trRecord(OPENING_SHAPES)} value={house.doorShape} onChange={doorShape => set({ doorShape })} />
          <PatioSelect label={t("Posição")} name={t("Posição da porta")} options={trRecord(HOUSE_DOOR_POSITIONS)} value={house.doorPosition} onChange={doorPosition => set({ doorPosition })} />
        </>}
      </fieldset>
    </div>
  </FloatingPanel>
}
