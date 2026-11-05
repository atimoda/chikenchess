"use client"

import { useId, useRef } from 'react'
import { ChevronRight, Dice5, Move, X } from 'lucide-react'
import { FloatingPanel } from '@/components/ui/floating-panel'
import { PatioRange } from '@/components/ui/patio-range'
import {
  HOUSE_DOOR_POSITIONS, HOUSE_GLAZING, HOUSE_ROOFS, HOUSE_SIZE, HOUSE_STYLES, OPENING_SHAPES, ROOF_TEXTURES, WALL_TEXTURES,
  housePreset, randomHouse, type HouseParams,
} from '@/lib/pigchicken/houses'
import { HouseArt } from './house-art'
import type { PatioPlacementHandlers } from './use-patio-placement'

const FIELD = 'h-8 w-full min-w-0 rounded border border-white/15 bg-[#0b110e] px-2 text-white'
const BUTTON = 'inline-flex h-8 items-center justify-center gap-2 rounded border border-white/15 px-2.5 text-white hover:border-primary'

function Select<K extends string>({ label, name = label, options, value, onChange }: {
  label: string; name?: string; options: Record<K, string>; value: K; onChange: (value: K) => void
}) {
  const id = useId()
  const keys = Object.keys(options) as K[]
  const next = keys[(keys.indexOf(value) + 1) % keys.length]
  return <div className="grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)_2rem] items-center gap-2">
    <label htmlFor={id}>{label}</label>
    <select id={id} aria-label={name} className={FIELD} value={value} onChange={e => onChange(e.target.value as K)}>
      {keys.map(key => <option key={key} value={key}>{options[key]}</option>)}
    </select>
    <button type="button" aria-label={`Avançar em ${name.toLowerCase()}`} title={options[next]} onClick={() => onChange(next)}
      className={`${BUTTON} px-0`}><ChevronRight size={16} /></button>
  </div>
}

export const HOUSE_STYLE_LABELS = Object.fromEntries(Object.entries(HOUSE_STYLES).map(([id, style]) => [id, style.label])) as Record<HouseParams['style'], string>
const COLORS = [['wall', 'Parede'], ['roofColor', 'Telhado'], ['trim', 'Molduras'], ['doorColor', 'Porta e venezianas']] as const

export function HousePanel({ house, dimensions = HOUSE_SIZE, onChange, onClose, previewDrag, dragging }: {
  house: HouseParams; dimensions?: { w: number; h: number }; onChange: (value: HouseParams, step?: string) => void
  onClose: () => void; previewDrag?: PatioPlacementHandlers; dragging?: boolean
}) {
  const gesture = useRef(0)
  const editSession = useId()
  const set = (patch: Partial<HouseParams>, group?: string) => onChange({ ...house, ...patch }, group ? `house:${editSession}:${group}:${gesture.current}` : undefined)
  const end = () => { gesture.current++ }
  const preview = <div className="absolute inset-x-4 top-2 bottom-4 flex justify-center">
    <div className="relative h-full max-w-full" style={{ aspectRatio: `${dimensions.w} / ${dimensions.h}` }}><HouseArt house={house} /></div>
  </div>
  return <FloatingPanel id="patio-house" aria-label="Criador de casas" initial={(vw, vh) => ({ x: Math.max(8, vw - 390), y: 64, w: Math.min(vw - 16, 376), h: Math.min(vh - 78, 660) })}
    minW={245} minH={170} keepInViewport
    className={`rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs text-[#dfe8df] shadow-[0_20px_60px_#0009] ${dragging ? 'pointer-events-none opacity-0' : ''}`}>
    <div data-drag-handle className="flex shrink-0 cursor-move items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
      <h2 className="text-sm text-white">{previewDrag ? 'Criador de casas' : 'Editar casa'}</h2>
      <button type="button" className={BUTTON} aria-label="Fechar criador de casas" onClick={onClose}><X size={16} /></button>
    </div>
    <div className="mx-3 my-2 shrink-0">
      {previewDrag
        ? <button type="button" data-house-preview aria-label="Arraste a prévia para inserir a casa" {...previewDrag}
            className="relative block h-[clamp(64px,20dvh,144px)] w-full cursor-grab touch-none overflow-hidden rounded-md border border-[#ffd166]/35 bg-[#222936] active:cursor-grabbing">
            {preview}<span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#141922]/90 py-0.5 text-[10px] text-[#ffdba1]"><Move size={12} /> Arraste para o Pátio</span>
          </button>
        : <div className="relative h-[clamp(64px,20dvh,144px)] overflow-hidden rounded-md border border-white/10 bg-[#222936]">{preview}</div>}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" data-house-parameters>
      <div className="mb-3 grid gap-2">
        <Select label="Estilo" options={HOUSE_STYLE_LABELS} value={house.style} onChange={style => onChange(housePreset(style, house.seed))} />
        <button type="button" className={`${BUTTON} justify-self-end`} onClick={() => onChange(randomHouse(house.style).house)}
          title="Sorteia outra casa deste estilo"><Dice5 size={15} /> Sortear</button>
      </div>
      <fieldset className="mb-4 grid min-w-0 gap-2 border-t border-white/10 pt-2">
        <legend className="pr-2 text-[#ffdba1]">Telhado e revestimento</legend>
        <Select label="Formato" name="Formato do telhado" options={HOUSE_ROOFS} value={house.roof} onChange={roof => set({ roof })} />
        <Select label="Acabamento" options={ROOF_TEXTURES} value={house.roofTexture} onChange={roofTexture => set({ roofTexture })} />
        <Select label="Textura" options={WALL_TEXTURES} value={house.texture} onChange={texture => set({ texture })} />
        <PatioRange label="Desgaste" min={0} max={100} value={house.wear} display={`${house.wear}%`} onChange={wear => set({ wear }, 'wear')} onEnd={end} />
        <PatioRange label={house.roof === 'flat' ? 'Espaço acima da fachada' : 'Altura do telhado'} min={8} max={40} value={house.pitch}
          display={`${house.pitch}%`} onChange={pitch => set({ pitch }, 'pitch')} onEnd={end} />
        <div className="grid grid-cols-2 gap-2">
          {COLORS.map(([key, label]) => <label key={key} className="flex min-w-0 items-center gap-2">
            <input type="color" value={house[key]} onChange={e => set({ [key]: e.target.value }, key)} onBlur={end}
              className="h-7 w-8 shrink-0 cursor-pointer rounded bg-transparent" /><span>{label}</span>
          </label>)}
        </div>
      </fieldset>
      <fieldset className="grid min-w-0 gap-2 border-t border-white/10 pt-2">
        <legend className="pr-2 text-[#ffdba1]">Fachada</legend>
        <PatioRange label="Andares" min={1} max={4} value={house.floors} onChange={floors => set({ floors }, 'floors')} onEnd={end} />
        <PatioRange label="Janelas por andar" min={0} max={4} value={house.windows} onChange={windows => set({ windows }, 'windows')} onEnd={end} />
        <Select label="Janelas" name="Formato das janelas" options={OPENING_SHAPES} value={house.windowShape} onChange={windowShape => set({ windowShape })} />
        <Select label="Luz" name="Luz das janelas" options={HOUSE_GLAZING} value={house.glass} onChange={glass => set({ glass })} />
        <PatioRange label="Tamanho das janelas" min={65} max={130} value={house.windowSize} display={`${house.windowSize}%`}
          onChange={windowSize => set({ windowSize }, 'windowSize')} onEnd={end} />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={house.panes} onChange={e => set({ panes: e.target.checked })} /> Vidro quadriculado</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={house.shutters} onChange={e => set({ shutters: e.target.checked })} /> Venezianas</label>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={house.door} onChange={e => set({ door: e.target.checked })} /> Porta</label>
        {house.door && <>
          <Select label="Formato" name="Formato da porta" options={OPENING_SHAPES} value={house.doorShape} onChange={doorShape => set({ doorShape })} />
          <Select label="Posição" name="Posição da porta" options={HOUSE_DOOR_POSITIONS} value={house.doorPosition} onChange={doorPosition => set({ doorPosition })} />
        </>}
      </fieldset>
    </div>
  </FloatingPanel>
}
