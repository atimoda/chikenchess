"use client"

import { useRef } from 'react'
import { cn } from '@/lib/utils'

const KEYS: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }
// the dial: an arc of 270° open at the bottom, as a stroke around the centre of a 36 px box
const R = 14.5, C = 18, LEN = 2 * Math.PI * R, ARC = LEN * 0.75
// px of drag (to the right or up) that cover the whole range
const TRAVEL = 160

// A parameter as a little dial, in the Pátio panels' language (the companion of PatioRange for a value that
// shares a line with other fields): the name above, the value inside, the arc filled up to it. Drag sideways or
// up and down or the arrows (Shift: ten steps) change it; a double click goes back to `initial`.
export function PatioKnob({ label, name, min, max, step = 1, value, display = value, initial, hint, dimmed, onChange }: {
  label: string; name?: string; min: number; max: number; step?: number; value: number; display?: string | number
  initial?: number; hint?: string; dimmed?: boolean; onChange: (value: number) => void
}) {
  const drag = useRef<{ x: number; y: number; from: number; last: number } | null>(null)
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const put = (v: number) => { const n = snap(v); if (n !== value) onChange(n) }
  const fill = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return (
    <div className="grid justify-items-center gap-1" title={hint}>
      <span>{label}</span>
      <span role="slider" tabIndex={0} aria-label={name ?? label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={String(display)}
        onPointerDown={e => { e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, from: value, last: value } }}
        onPointerMove={e => {
          const d = drag.current
          if (!d) return
          const v = snap(d.from + (e.clientX - d.x - (e.clientY - d.y)) / TRAVEL * (max - min))
          if (v !== d.last) { d.last = v; onChange(v) }
        }}
        onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
        onDoubleClick={() => { if (initial !== undefined) put(initial) }}
        onKeyDown={e => {
          const k = KEYS[e.key]
          if (k) { e.preventDefault(); e.stopPropagation(); put(value + k * step * (e.shiftKey ? 10 : 1)) }
          else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); e.stopPropagation(); put(e.key === 'Home' ? min : max) }
        }}
        className="relative grid h-9 w-9 cursor-ew-resize touch-none select-none place-items-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-primary">
        <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full rotate-[135deg]" aria-hidden>
          <circle cx={C} cy={C} r={R} fill="#0b110e" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${ARC} ${LEN}`} />
          <circle cx={C} cy={C} r={R} fill="none" stroke={dimmed ? 'rgba(255,255,255,0.3)' : 'var(--primary)'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${ARC * fill} ${LEN}`} />
        </svg>
        <output className={cn('relative text-[10px] font-bold tabular-nums', dimmed ? 'text-white/40' : 'text-white')}>{display}</output>
      </span>
    </div>
  )
}
