"use client"

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ResetArrow } from './reset-arrow'
import { useT } from '@/lib/i18n'

const RANGE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

// changed: the value differs from the default (amber, and with onReset the small reset in front of the name);
// resettable: the reset shows for more than this value (a row with other controls), default `changed`
export function PatioRange({ label, name, min, max, step = 1, value, display = value, hint, changed, resettable = changed, dimmed, onChange, onReset, onEnd }: {
  label: ReactNode; name?: string; min: number; max: number; step?: number; value: number; display?: ReactNode
  hint?: string; changed?: boolean; resettable?: boolean; dimmed?: boolean; onChange: (value: number) => void; onReset?: () => void; onEnd?: () => void
}) {
  const t = useT()
  const fill = Math.max(0, Math.min(100, (value - min) / (max - min) * 100))
  const title = [hint, onReset && t('Duplo clique para voltar ao padrão.')].filter(Boolean).join(' ') || undefined
  return <div className="grid min-w-0 gap-1" title={title}>
    <div data-patio-range className="relative h-10 overflow-hidden rounded-md bg-[#22302a] focus-within:ring-1 focus-within:ring-primary" onDoubleClick={onReset}>
      <div className={cn('pointer-events-none absolute inset-y-0 left-0', dimmed ? 'bg-white/15' : 'bg-primary/50')} style={{ width: `${fill}%` }} />
      {/* changed from the default: the small reset in front of the name */}
      {resettable && onReset && <ResetArrow onReset={onReset} label={name ?? (typeof label === 'string' ? label : undefined)} className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2" />}
      <div className={cn('pointer-events-none absolute inset-0 flex items-center justify-between gap-2 px-3 [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]', resettable && onReset && 'pl-8', dimmed ? 'text-white/40' : 'text-white')}>
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
  </div>
}
