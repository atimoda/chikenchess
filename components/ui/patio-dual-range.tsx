"use client"

import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// A slider with two points in the look of PatioRange: drag either point (the nearest to the press); points closer
// than `snap` join (same value). Arrow keys move the focused point; a double click resets.
export function PatioDualRange({ label, min, max, step = 0.01, lo, hi, snap = 0, display, hint, changed, onChange, onReset }: {
  label: ReactNode; min: number; max: number; step?: number; lo: number; hi: number; snap?: number; display?: ReactNode
  hint?: string; changed?: boolean; onChange: (lo: number, hi: number) => void; onReset?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const which = useRef<0 | 1>(0)
  const pct = (v: number) => Math.max(0, Math.min(100, (v - min) / (max - min) * 100))
  const round = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step))
  const set = (k: 0 | 1, v: number) => {
    let a = k === 0 ? round(v) : lo, b = k === 1 ? round(v) : hi
    if (a > b) { if (k === 0) a = b; else b = a }
    if (Math.abs(b - a) < snap) { if (k === 0) a = b; else b = a }
    onChange(Number(a.toFixed(4)), Number(b.toFixed(4)))
  }
  const title = [hint, onReset && 'Duplo clique para voltar ao padrão.'].filter(Boolean).join(' ') || undefined
  const valueAt = (x: number) => { const r = box.current!.getBoundingClientRect(); return min + (max - min) * Math.max(0, Math.min(1, (x - r.left) / r.width)) }
  const thumb = (k: 0 | 1, v: number) => (
    <span role="slider" tabIndex={0} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} aria-label={k ? 'máximo' : 'mínimo'}
      onKeyDown={e => {
        const s = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : 0
        if (s) { e.preventDefault(); e.stopPropagation(); set(k, v + s) }
      }}
      className="absolute top-1/2 h-6 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white shadow outline-none focus:ring-2 focus:ring-primary"
      style={{ left: `${pct(v)}%` }} />
  )
  return <div className="grid min-w-0 gap-1" title={title}>
    <div ref={box} data-patio-range className="relative h-10 cursor-pointer touch-none overflow-hidden rounded-md bg-[#22302a]"
      onDoubleClick={onReset}
      onPointerDown={e => {
        const v = valueAt(e.clientX)
        which.current = Math.abs(v - lo) < Math.abs(v - hi) || (lo === hi && v < lo) ? 0 : 1
        e.currentTarget.setPointerCapture(e.pointerId); set(which.current, v)
      }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) set(which.current, valueAt(e.clientX)) }}>
      <div className="pointer-events-none absolute inset-y-0 bg-primary/50" style={{ left: `${pct(lo)}%`, width: `${Math.max(0.6, pct(hi) - pct(lo))}%` }} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between gap-2 px-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">
        <span className="min-w-0 truncate">{label}</span>
        <output className={cn('shrink-0 font-bold tabular-nums', changed && 'text-amber-300')}>{display}</output>
      </div>
      {thumb(0, lo)}{thumb(1, hi)}
    </div>
  </div>
}
