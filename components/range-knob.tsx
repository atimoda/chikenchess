"use client"

import { useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react"
import { cn } from "@/lib/utils"
import type { ParameterRange } from '@/lib/music/model'

export type IntegerRange = ParameterRange

interface RangeKnobProps {
  label: string
  value: IntegerRange
  min: number
  max: number
  step?: number
  neon?: boolean
  formatValue?: (range: IntegerRange) => string
  monitorValue?: number
  ariaLabel?: string
  labelPosition?: "top" | "bottom"
  hideLabel?: boolean
  showFrequency?: boolean
  legacyFrequency?: boolean
  onChange: (range: IntegerRange) => void
}

type Thumb = "first" | "second"

/** A compact two-thumb circular control for bounded ranges. */
export function RangeKnob({
  label,
  value,
  min,
  max,
  step = 1,
  neon = true,
  formatValue,
  monitorValue,
  ariaLabel,
  labelPosition = "top",
  hideLabel = false,
  showFrequency = false,
  legacyFrequency = false,
  onChange,
}: RangeKnobProps) {
  const drag = useRef<{ thumb: Thumb; x: number; y: number; amount: number } | null>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const amount = (current: number) => max === min ? 0 : (current - min) / (max - min)
  const snap = (current: number) => Number(Math.max(min, Math.min(max, min + Math.round((current - min) / step) * step)).toFixed(6))
  const commit = (thumb: Thumb, current: number) => {
    onChange({ ...value, [thumb]: snap(current) })
  }
  const point = (thumb: Thumb) => {
    const angle = (-135 + amount(value[thumb]) * 270) * Math.PI / 180
    const radius = 15.5
    return { left: 20 + Math.sin(angle) * radius, top: 20 - Math.cos(angle) * radius }
  }
  const arcPoint = (currentAmount: number) => {
    const angle = (-135 + currentAmount * 270) * Math.PI / 180
    const radius = 15.5
    return { x: 20 + Math.sin(angle) * radius, y: 20 - Math.cos(angle) * radius }
  }
  const arcPath = (from: number, to: number) => {
    const start = arcPoint(from)
    const end = arcPoint(to)
    const largeArc = to - from > 2 / 3 ? 1 : 0
    return `M ${start.x} ${start.y} A 15.5 15.5 0 ${largeArc} 1 ${end.x} ${end.y}`
  }
  const interval = { first: Math.min(value.first, value.second), second: Math.max(value.first, value.second) }
  const start = (thumb: Thumb, event: PointerEvent<HTMLButtonElement>) => {
    if (!neon || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = dialRef.current?.getBoundingClientRect()
    const distance = (candidate: Thumb) => {
      const position = point(candidate)
      return (event.clientX - bounds!.left - position.left) ** 2 + (event.clientY - bounds!.top - position.top) ** 2
    }
    const firstDistance = bounds ? distance("first") : 0
    const secondDistance = bounds ? distance("second") : 0
    const activeThumb = !bounds || firstDistance === secondDistance
      ? thumb
      : firstDistance < secondDistance ? "first" : "second"
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { thumb: activeThumb, x: event.clientX, y: event.clientY, amount: amount(value[activeThumb]) }
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current) return
    event.preventDefault()
    event.stopPropagation()
    const nextAmount = Math.max(0, Math.min(1, current.amount + (current.y - event.clientY + event.clientX - current.x) / 200))
    commit(current.thumb, min + nextAmount * (max - min))
  }
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const updateFromInput = (thumb: Thumb, event: KeyboardEvent<HTMLButtonElement>) => {
    if (!neon) return
    const direction = ["ArrowUp", "ArrowRight"].includes(event.key) ? 1 : -1
    const increment = step * (event.shiftKey ? 10 : 1)
    if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home", "End"].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      const next = event.key === "Home"
        ? min
        : event.key === "End"
          ? max
          : value[thumb] + direction * increment
      commit(thumb, next)
    } else if (event.key === "Escape") {
      drag.current = null
    }
  }
  const adjustFromWheel = (thumb: Thumb, event: WheelEvent<HTMLButtonElement>) => {
    if (!neon || event.deltaY === 0) return
    event.preventDefault()
    event.stopPropagation()
    commit(thumb, value[thumb] + (event.deltaY < 0 ? 1 : -1) * step * (event.shiftKey ? 10 : 1))
  }
  const labelNode = <span className="text-center text-[10px] font-mono uppercase text-muted-foreground">{label}</span>
  const renderThumb = (thumb: Thumb) => {
    const position = point(thumb)
    return <button
      key={thumb}
      type="button"
      role="slider"
      aria-label={`${ariaLabel ?? label} cursor ${thumb === "first" ? "1" : "2"}`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[thumb]}
      aria-valuetext={`Cursor ${thumb === "first" ? "1" : "2"}: ${value[thumb]}`}
      aria-disabled={!neon}
      data-range-thumb
      tabIndex={neon ? 0 : -1}
      className={cn(
        "absolute z-10 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-background touch-none",
        neon ? "bg-foreground/60 group-hover:bg-[var(--city-neon)] cursor-ew-resize focus-visible:outline-2 focus-visible:outline-[var(--city-neon)]" : "bg-foreground/20 cursor-default",
        drag.current?.thumb === thumb && "bg-white",
      )}
      style={{ left: position.left, top: position.top }}
      onPointerDown={event => start(thumb, event)}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={() => { drag.current = null }}
      onBlur={() => { drag.current = null }}
      onWheel={event => adjustFromWheel(thumb, event)}
      onKeyDown={event => updateFromInput(thumb, event)}
    />
  }

  return <div className={cn("flex flex-col items-center gap-1 select-none", !neon && "opacity-50")}>
    {!hideLabel && labelPosition === "top" && labelNode}
    <div ref={dialRef} role="group" aria-label={`${label}: ${interval.first} a ${interval.second}`} className={cn(
      "group relative h-10 w-10 rounded-full border border-border bg-secondary",
      neon && "hover:border-[var(--city-neon)]",
      !neon && "opacity-50",
    )}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 40 40" aria-hidden="true">
        {interval.first !== interval.second && <path
          d={arcPath(amount(interval.first), amount(interval.second))}
          fill="none"
          stroke="var(--city-neon)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />}
      </svg>
      {renderThumb("first")}
      {renderThumb("second")}
      {monitorValue !== undefined && Number.isFinite(monitorValue) && <div aria-hidden="true" className="pointer-events-none absolute inset-[2px]" style={{ transform: `rotate(${-135 + Math.max(0, Math.min(1, amount(monitorValue))) * 270}deg)` }}>
        <div className="absolute left-1/2 top-0 h-[6px] w-[2px] -translate-x-1/2 rounded-full bg-zinc-400" />
      </div>}
      <output className={cn(
        "pointer-events-none absolute inset-x-0 top-[66%] -translate-y-1/2 whitespace-nowrap text-center font-mono text-[7px] font-bold leading-none",
        neon ? "text-foreground/60 group-hover:text-white" : "text-foreground/20",
      )}>{formatValue?.(interval) ?? `${interval.first}–${interval.second}`}</output>
    </div>
    {showFrequency && <div role="radiogroup" aria-label={`Frequência de ${label}`} className="flex items-center justify-center gap-1" onPointerDown={event => event.stopPropagation()}>
      {([['loop', 'L', 'Por loop: sorteia a cada repetição completa'], ['section', 'S', 'Por seção: sorteia a cada entrada na seção A, B, C…'], ['note', 'N', 'Por ataque: notas simultâneas compartilham o sorteio']] as const).map(([frequency, letter, title]) => {
        const selected = (value.frequency ?? (legacyFrequency ? undefined : 'loop')) === frequency
        return <button key={frequency} type="button" role="radio" aria-checked={selected} aria-label={`${label}: ${title}`} title={title}
          tabIndex={selected || legacyFrequency && !value.frequency && frequency === 'loop' ? 0 : -1}
          disabled={!neon} onClick={() => onChange({ ...value, frequency })}
          onKeyDown={event => {
            const order = ['loop', 'section', 'note'] as const
            const index = order.indexOf(frequency)
            if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
              event.preventDefault(); event.stopPropagation()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? 2 : 1)) % 3
              onChange({ ...value, frequency: order[next] })
              const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
              buttons?.[next].focus()
            }
          }}
          style={{ width: 15, height: 15, minWidth: 15, padding: 0, borderRadius: '50%', fontSize: 8, lineHeight: '13px', fontFamily: 'monospace',
            border: `1px solid ${selected ? 'var(--city-neon)' : 'color-mix(in srgb, var(--city-neon) 30%, transparent)'}`, color: selected ? 'var(--city-neon)' : 'color-mix(in srgb, var(--city-neon) 60%, transparent)',
            background: selected ? 'color-mix(in srgb, var(--city-neon) 15%, transparent)' : 'transparent' }}>
          {letter}
        </button>
      })}
    </div>}
    {showFrequency && legacyFrequency && !value.frequency && <span className="text-[7px] text-muted-foreground" title="Kit anterior: sorteio por compasso. Escolha L, S ou N para mudar.">compasso (legado)</span>}
    {!hideLabel && labelPosition === "bottom" && labelNode}
  </div>
}
