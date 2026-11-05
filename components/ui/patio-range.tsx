"use client"

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const RANGE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

export function PatioRange({ label, name, min, max, step = 1, value, display = value, hint, changed, onChange, onReset, onEnd }: {
  label: ReactNode; name?: string; min: number; max: number; step?: number; value: number; display?: ReactNode
  hint?: string; changed?: boolean; onChange: (value: number) => void; onReset?: () => void; onEnd?: () => void
}) {
  const fill = Math.max(0, Math.min(100, (value - min) / (max - min) * 100))
  return <div className="grid min-w-0 gap-1" title={hint}>
    <div data-patio-range className="relative h-10 overflow-hidden rounded-md bg-[#22302a] focus-within:ring-1 focus-within:ring-primary" onDoubleClick={onReset}>
      <div className="pointer-events-none absolute inset-y-0 left-0 bg-primary/50" style={{ width: `${fill}%` }} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between gap-2 px-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">
        <span className="min-w-0 truncate">{label}</span>
        <output className={cn('shrink-0 font-bold tabular-nums', changed && 'text-amber-300')}>{display}</output>
      </div>
      <input type="range" aria-label={name ?? (typeof label === 'string' ? label : undefined)}
        min={Math.min(min, value)} max={Math.max(max, value)} step={step} value={value}
        onKeyDown={e => { if (RANGE_KEYS.has(e.key)) e.stopPropagation() }}
        onChange={e => onChange(Number(e.target.value))} onPointerUp={e => e.currentTarget.blur()}
        onPointerCancel={e => e.currentTarget.blur()} onBlur={onEnd}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </div>
    {hint && <span className="text-[10px] text-[#93a79a]">{hint}</span>}
  </div>
}
