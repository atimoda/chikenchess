"use client"

import { useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { FloatingPanel } from '@/components/ui/floating-panel'
import { screenToWorld } from '@/lib/pigchicken/live-camera'
import { moveRidgePoint, splitRidgeSegment, VILLAGE_RIDGE, type RidgePoint } from '@/lib/pigchicken/village'

const BUTTON = 'flex h-8 items-center justify-center gap-1 rounded-md border border-white/15 px-2 hover:border-primary disabled:opacity-40'

export function TerrainEditor({ left, terrain, onChange, onClose }: {
  left: number; terrain?: RidgePoint[]; onChange: (points: RidgePoint[] | undefined, step?: string) => void; onClose: () => void
}) {
  const ridge = terrain ?? VILLAGE_RIDGE
  const [selected, setSelected] = useState(0)
  const drag = useRef<{ pointer: number; index: number; offset: RidgePoint; start: RidgePoint; moved: boolean; step: string } | null>(null)
  const index = Math.min(selected, ridge.length - 1)
  const [x, y] = ridge[index]
  const segment = Math.min(index, ridge.length - 2)
  const split = splitRidgeSegment(ridge, segment)
  const move = (i: number, x: number, y: number, step?: string) => {
    const next = moveRidgePoint(ridge, i, x, y)
    if (next !== ridge) onChange(next, step)
  }
  const dragPoint = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    const g = drag.current
    if (!g || g.pointer !== e.pointerId || g.index !== index) return
    if (!g.moved && Math.hypot(e.clientX - g.start[0], e.clientY - g.start[1]) < 2) return
    g.moved = true
    const p = screenToWorld(e.clientX, e.clientY)
    move(index, p.x - left + g.offset[0], p.y + g.offset[1], g.step)
  }
  return <>
    {ridge.map(([px, py], i) => <button key={i} type="button" aria-label={`Ponto ${i + 1} do chão`} aria-pressed={i === index} data-chicken-ignore
      className="pointer-events-auto absolute z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab place-items-center rounded-full active:cursor-grabbing coarse:size-11"
      style={{ left: left + px, top: py }}
      onPointerDown={e => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        e.currentTarget.focus({ preventScroll: true })
        const p = screenToWorld(e.clientX, e.clientY)
        drag.current = { pointer: e.pointerId, index: i, offset: [left + px - p.x, py - p.y], start: [e.clientX, e.clientY], moved: false, step: `terrain:${e.timeStamp}` }
        e.currentTarget.setPointerCapture(e.pointerId)
        setSelected(i)
      }}
      onPointerMove={e => dragPoint(e, i)}
      onPointerUp={e => { dragPoint(e, i); drag.current = null }}
      onLostPointerCapture={() => { drag.current = null }}
      onFocus={() => setSelected(i)}
      onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
        e.preventDefault(); e.stopPropagation()
        const step = e.shiftKey ? 10 : 1
        move(i, px + (Number(e.key === 'ArrowRight') - Number(e.key === 'ArrowLeft')) * step,
          py + (Number(e.key === 'ArrowDown') - Number(e.key === 'ArrowUp')) * step)
      }}>
      <span className={`size-3 rounded-full border-2 border-[#fff3cb] shadow-[0_0_0_2px_#332f3c] ${i === index ? 'bg-amber-300' : 'bg-[#62577a]'}`} />
    </button>)}
    {createPortal(<FloatingPanel id="patio-terrain" aria-label="Chão da Vila" initial={vw => ({ x: Math.max(8, vw - 330), y: 64, w: Math.min(vw - 16, 316), h: 186 })}
      minW={245} minH={164} keepInViewport className="gap-2 overflow-y-auto rounded-xl border border-[#ffd166]/40 bg-[#101713] p-3 font-mono text-xs text-white shadow-xl">
      <div data-drag-handle className="flex shrink-0 cursor-move items-center justify-between">
        <h2 className="text-sm">Chão da Vila</h2>
        <button type="button" className={BUTTON} aria-label="Fechar editor do chão" onClick={onClose}><X size={15} /></button>
      </div>
      <p className="text-[#a6b5a9]">Arraste os pontos na Vila. Use as setas no ponto selecionado para ajustes finos.</p>
      <output className="tabular-nums text-[#ffdba1]">Ponto {index + 1} de {ridge.length} · {x}, {y}</output>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={BUTTON} disabled={split === ridge} onClick={() => { onChange(split); setSelected(segment + 1) }}><Plus size={14} /> Inserir</button>
        <button type="button" className={BUTTON} disabled={ridge.length <= 2} onClick={() => {
          onChange(ridge.filter((_, i) => i !== index)); setSelected(Math.max(0, index - 1))
        }}><Trash2 size={14} /> Remover</button>
        <button type="button" className={BUTTON} disabled={!terrain} onClick={() => { onChange(undefined); setSelected(0) }}><RotateCcw size={14} /> Restaurar</button>
      </div>
    </FloatingPanel>, document.body)}
  </>
}
