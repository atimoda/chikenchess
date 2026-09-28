"use client"

import React, { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface KnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  neon?: boolean
  logarithmic?: boolean
  hideLabel?: boolean
}

export function Knob({ value, min, max, step = .01, label, onChange, formatValue, neon = true, logarithmic = false, hideLabel = false }: KnobProps) {
  const drag = useRef<{ x: number; y: number; amount: number } | null>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const pointerInsideRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const toAmount = (v: number) => logarithmic ? (Math.log1p(v) - Math.log1p(min)) / (Math.log1p(max) - Math.log1p(min)) : (v - min) / (max - min)
  const fromAmount = (amount: number) => logarithmic ? Math.expm1(Math.log1p(min) + amount * (Math.log1p(max) - Math.log1p(min))) : min + amount * (max - min)
  const commit = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v / step) * step)))
  const amount = Math.max(0, Math.min(1, toAmount(value)))
  const setIndicatorOutside = (outside: boolean) => {
    // The 8px dash shifts 4px so it straddles the knob's outer edge.
    if (indicatorRef.current) indicatorRef.current.style.transform = `translateX(-50%) translateY(${outside ? -4 : 0}px)`
  }
  const finish = (pointerIsInside = pointerInsideRef.current) => {
    drag.current = null
    setDragging(false)
    pointerInsideRef.current = pointerIsInside
    setIndicatorOutside(pointerIsInside)
  }
  return <div className={cn("flex flex-col items-center gap-1 select-none", !neon && "opacity-50")}>
    {!hideLabel && <span className="text-[10px] uppercase font-mono text-muted-foreground text-center">{label}</span>}
    <div role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={formatValue?.(value)} aria-disabled={!neon} tabIndex={neon ? 0 : -1}
      className={cn("relative w-10 h-10 rounded-full bg-secondary border border-border group touch-none focus-visible:outline-2 focus-visible:outline-[var(--city-neon)]", neon ? "cursor-ew-resize hover:border-[var(--city-neon)]" : "cursor-default", dragging && "border-white")}
      onPointerEnter={() => {
        pointerInsideRef.current = true
        if (neon && !drag.current) setIndicatorOutside(true)
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false
        if (!drag.current) setIndicatorOutside(false)
      }}
      onPointerDown={event => {
        if (!neon || event.button !== 0) return
        event.preventDefault(); event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { x: event.clientX, y: event.clientY, amount }; setDragging(true); setIndicatorOutside(true)
      }}
      onPointerMove={event => {
        const start = drag.current
        if (!start) return
        const next = Math.max(0, Math.min(1, start.amount + (start.y - event.clientY + event.clientX - start.x) / 200))
        commit(fromAmount(next))
      }}
      onPointerUp={event => {
        const bounds = event.currentTarget.getBoundingClientRect()
        finish(event.pointerType !== 'touch' && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom)
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={event => finish(event.pointerType !== 'touch' && pointerInsideRef.current)}
      onLostPointerCapture={event => finish(event.pointerType !== 'touch' && pointerInsideRef.current)}
      onBlur={event => finish(event.currentTarget.matches(':hover'))}
      onWheel={event => {
        if (!neon || event.deltaY === 0) return
        event.preventDefault(); event.stopPropagation()
        const direction = event.deltaY < 0 ? 1 : -1
        const multiplier = event.shiftKey ? 4 : 1
        const next = logarithmic
          ? fromAmount(Math.max(0, Math.min(1, amount + direction * .02 * multiplier)))
          : value + direction * Math.max(step, (max - min) * .01) * multiplier
        commit(next)
        event.currentTarget.focus({ preventScroll: true })
      }}
      onKeyDown={event => {
        if (!neon) return
        if (event.key === 'Escape') { finish(); return }
        if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
        event.preventDefault(); event.stopPropagation()
        const direction = ['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1
        commit(event.key === 'Home' ? min : event.key === 'End' ? max : logarithmic ? fromAmount(Math.max(0, Math.min(1, amount + direction * .02))) : value + direction * step * (event.shiftKey ? 10 : 1))
      }}>
      <div className="absolute w-full h-full rounded-full" style={{ transform: 'rotate(' + (-135 + amount * 270) + 'deg)' }}>
        <div ref={indicatorRef} className={cn("absolute top-0 left-1/2 w-1 h-2 rounded-full transition-transform duration-150 ease-out", neon ? "bg-foreground/50 group-hover:bg-white" : "bg-foreground/20")} style={{ transform: "translateX(-50%)" }} />
      </div>
      <span className={cn("pointer-events-none absolute inset-x-0 top-[66%] -translate-y-1/2 whitespace-nowrap text-center font-mono text-[8px] font-bold leading-none transition-colors", neon ? "text-foreground/50 group-hover:text-white" : "text-foreground/20")}>
        {formatValue ? formatValue(value) : value.toFixed(2)}
      </span>
    </div>
  </div>
}
