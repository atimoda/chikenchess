"use client"

import { useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react"
import { cn } from "@/lib/utils"
import type { ParameterRange } from '@/lib/music/model'
import { Knob, type KnobUpdateMode } from './knob'

export type IntegerRange = ParameterRange

interface RangeKnobProps {
  label: string
  value: IntegerRange
  min: number
  max: number
  step?: number
  neon?: boolean
  formatValue?: (range: IntegerRange) => string
  formatSingleValue?: (value: number) => string
  monitorValue?: number
  ariaLabel?: string
  labelPosition?: "top" | "bottom"
  hideLabel?: boolean
  showFrequency?: boolean
  updateMode?: KnobUpdateMode
  onChange: (range: IntegerRange) => void
}

type Thumb = "first" | "second"
type ActiveDrag = {
  thumb: Thumb
  x: number
  y: number
  amount: number
  latestRange: IntegerRange
}

/** A compact range control. Its selected frequency also determines fixed/range mode. */
export function RangeKnob({
  label,
  value,
  min,
  max,
  step = 1,
  neon = true,
  formatValue,
  formatSingleValue,
  monitorValue,
  ariaLabel,
  labelPosition = "top",
  hideLabel = false,
  showFrequency = false,
  updateMode = 'immediate',
  onChange,
}: RangeKnobProps) {
  const drag = useRef<ActiveDrag | null>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const [draggingThumb, setDraggingThumb] = useState<Thumb | null>(null)
  const [draftRange, setDraftRange] = useState<IntegerRange | null>(null)
  const isFixed = value.frequency === 'fixed'
  const selectedFrequency = value.frequency ?? 'note'
  const visibleRange = updateMode === 'on-release' && draggingThumb && draftRange ? draftRange : value
  const amount = (current: number) => max === min ? 0 : (current - min) / (max - min)
  const snap = (current: number) => Number(Math.max(min, Math.min(max, min + Math.round((current - min) / step) * step)).toFixed(6))
  const point = (thumb: Thumb) => {
    const angle = (-135 + amount(visibleRange[thumb]) * 270) * Math.PI / 180
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
  const interval = { first: Math.min(visibleRange.first, visibleRange.second), second: Math.max(visibleRange.first, visibleRange.second) }
  const lowThumb = value.first <= value.second ? 'first' : 'second'
  const highThumb = value.first <= value.second ? 'second' : 'first'
  const sameEndpoints = (left: IntegerRange, right: IntegerRange) => Object.is(left.first, right.first) && Object.is(left.second, right.second)

  const changeThumb = (current: ActiveDrag, nextAmount: number) => {
    const next = min + nextAmount * (max - min)
    const nextRange = { ...current.latestRange, [current.thumb]: snap(next) }
    if (sameEndpoints(nextRange, current.latestRange)) return
    current.latestRange = nextRange
    if (updateMode === 'immediate') onChange(nextRange)
    else setDraftRange(nextRange)
  }

  const start = (thumb: Thumb | undefined, event: PointerEvent<HTMLElement>) => {
    if (!neon || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const dial = dialRef.current
    if (!dial) return
    const bounds = dial.getBoundingClientRect()
    const isLeftHalf = event.clientX < bounds.left + bounds.width / 2
    const activeThumb = thumb && !Object.is(value.first, value.second)
      ? thumb
      : isLeftHalf ? lowThumb : highThumb
    dial.setPointerCapture(event.pointerId)
    drag.current = { thumb: activeThumb, x: event.clientX, y: event.clientY, amount: amount(visibleRange[activeThumb]), latestRange: { ...visibleRange } }
    setDraggingThumb(activeThumb)
    if (updateMode === 'on-release') setDraftRange({ ...visibleRange })
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) return
    event.preventDefault()
    event.stopPropagation()
    const nextAmount = Math.max(0, Math.min(1, current.amount + (current.y - event.clientY + event.clientX - current.x) / 200))
    changeThumb(current, nextAmount)
  }

  const finish = (applyDraft: boolean) => {
    const pending = drag.current
    if (!pending) return
    if (applyDraft && updateMode === 'on-release' && !sameEndpoints(pending.latestRange, value)) onChange(pending.latestRange)
    drag.current = null
    setDraggingThumb(null)
    setDraftRange(null)
  }

  const endPointer = (event: PointerEvent<HTMLDivElement>, applyDraft: boolean) => {
    const current = drag.current
    if (current && applyDraft) {
      const nextAmount = Math.max(0, Math.min(1, current.amount + (current.y - event.clientY + event.clientX - current.x) / 200))
      changeThumb(current, nextAmount)
    }
    event.stopPropagation()
    finish(applyDraft)
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
          : visibleRange[thumb] + direction * increment
      onChange({ ...value, [thumb]: snap(next) })
    } else if (event.key === "Escape") {
      finish(false)
    }
  }

  const adjustFromWheel = (thumb: Thumb, event: WheelEvent<HTMLButtonElement>) => {
    if (!neon || event.deltaY === 0) return
    event.preventDefault()
    event.stopPropagation()
    onChange({ ...value, [thumb]: snap(visibleRange[thumb] + (event.deltaY < 0 ? 1 : -1) * step * (event.shiftKey ? 10 : 1)) })
  }

  const setFrequency = (frequency: 'loop' | 'section' | 'note') => {
    if (!isFixed && selectedFrequency === frequency) {
      const fixedValue = snap((interval.first + interval.second) / 2)
      onChange({ ...value, first: fixedValue, second: fixedValue, frequency: 'fixed' })
    } else onChange({ ...value, frequency })
  }

  const labelNode = <span className="text-center text-[10px] font-mono uppercase text-muted-foreground">{label}</span>
  const frequencyOptions = [
    ['loop', 'L', 'Por loop: sorteia a cada repetição completa'],
    ['section', 'S', 'Por seção: sorteia a cada entrada na seção A, B, C…'],
    ['note', 'N', 'Por ataque: notas simultâneas compartilham o sorteio'],
  ] as const

  const renderThumb = (thumb: Thumb) => {
    const position = point(thumb)
    const dragging = draggingThumb === thumb
    return <button
      key={thumb}
      type="button"
      role="slider"
      aria-label={`${ariaLabel ?? label} cursor ${thumb === "first" ? "1" : "2"}`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={visibleRange[thumb]}
      aria-valuetext={`Cursor ${thumb === "first" ? "1" : "2"}: ${visibleRange[thumb]}`}
      aria-disabled={!neon}
      data-range-thumb
      data-thumb={thumb}
      tabIndex={neon ? 0 : -1}
      className={cn(
        "absolute z-10 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-background touch-none",
        neon ? "bg-[var(--city-neon)] group-hover:bg-white cursor-grab focus-visible:outline-2 focus-visible:outline-[var(--city-neon)]" : "bg-foreground/20 cursor-default",
        dragging && "cursor-grabbing",
      )}
      style={{ left: position.left, top: position.top,
        backgroundColor: dragging ? updateMode === 'on-release' ? 'rgba(161, 161, 170, .62)' : 'var(--city-neon, #b6e5ac)' : undefined }}
      onPointerDown={event => start(thumb, event)}
      onWheel={event => adjustFromWheel(thumb, event)}
      onKeyDown={event => updateFromInput(thumb, event)}
      onBlur={() => { if (drag.current) finish(false) }}
    />
  }

  return <div className={cn("flex flex-col items-center gap-1 select-none", !neon && "opacity-50")}>
    {!hideLabel && labelPosition === "top" && labelNode}
    {isFixed
      ? <Knob
          label={label}
          ariaLabel={ariaLabel ?? label}
          value={visibleRange.first}
          min={min}
          max={max}
          step={step}
          neon={neon}
          updateMode={updateMode}
          formatValue={formatSingleValue ?? (current => String(Number(current.toFixed(3))))}
          monitorValue={monitorValue}
          hideLabel
          onChange={current => onChange({ ...value, first: current, second: current, frequency: 'fixed' })}
        />
      : <div
          ref={dialRef}
          data-update-mode={updateMode}
          role="group"
          aria-label={`${label}: ${interval.first} a ${interval.second}`}
          className={cn(
            "group relative h-10 w-10 rounded-full border border-border bg-secondary touch-none",
            neon && "hover:border-[var(--city-neon)] cursor-grab",
            !neon && "opacity-50 cursor-default",
            draggingThumb && "cursor-grabbing",
          )}
          onPointerDown={event => start(undefined, event)}
          onPointerMove={move}
          onPointerUp={event => endPointer(event, true)}
          onPointerCancel={event => endPointer(event, false)}
          onLostPointerCapture={() => finish(false)}
        >
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
        </div>}
    {showFrequency && <div role="group" aria-label={`Frequência de ${label}`} className="flex items-center justify-center gap-1" onPointerDown={event => event.stopPropagation()}>
      {frequencyOptions.map(([frequency, letter, title], index) => {
        const selected = !isFixed && selectedFrequency === frequency
        return <button key={frequency} type="button" aria-pressed={selected} aria-label={`${label}: ${title}`} title={title}
          tabIndex={selected || isFixed && index === 0 ? 0 : -1}
          disabled={!neon}
          onClick={() => setFrequency(frequency)}
          onKeyDown={event => {
            const order = ['loop', 'section', 'note'] as const
            const currentIndex = order.indexOf(selectedFrequency as typeof order[number])
            if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
              event.preventDefault(); event.stopPropagation()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : ((currentIndex < 0 ? 0 : currentIndex) + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? 2 : 1)) % 3
              setFrequency(order[next])
              const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
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
    {!hideLabel && labelPosition === "bottom" && labelNode}
  </div>
}
