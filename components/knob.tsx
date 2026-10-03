"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface KnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  ariaLabel?: string
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  neon?: boolean
  logarithmic?: boolean
  hideLabel?: boolean
  labelPosition?: "top" | "bottom" | "left" | "right"
  monitorValue?: number
  size?: number
  accentColor?: string
  updateMode?: KnobUpdateMode
}

export type KnobUpdateMode = 'immediate' | 'on-release'

export function Knob({ value, min, max, step = .01, label, ariaLabel, onChange, formatValue, neon = true, logarithmic = false, hideLabel = false, labelPosition = "top", monitorValue, size = 40, accentColor, updateMode = 'immediate' }: KnobProps) {
  const drag = useRef<{ x: number; y: number; amount: number; latestValue: number } | null>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const pointerInsideRef = useRef(false)
  const lastMonitorValueRef = useRef<number | undefined>(undefined)
  const flashSequenceRef = useRef(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dragging, setDragging] = useState(false)
  const [draftValue, setDraftValue] = useState<number | null>(null)
  const [flashMarker, setFlashMarker] = useState<{ amount: number; sequence: number } | null>(null)
  const toAmount = (v: number) => logarithmic ? (Math.log1p(v) - Math.log1p(min)) / (Math.log1p(max) - Math.log1p(min)) : (v - min) / (max - min)
  const fromAmount = (amount: number) => logarithmic ? Math.expm1(Math.log1p(min) + amount * (Math.log1p(max) - Math.log1p(min))) : min + amount * (max - min)
  const commit = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v / step) * step)))
  const displayedValue = dragging && updateMode === 'on-release' && draftValue !== null ? draftValue : value
  const amount = Math.max(0, Math.min(1, toAmount(displayedValue)))
  useEffect(() => {
    if (monitorValue === undefined || !Number.isFinite(monitorValue)) {
      lastMonitorValueRef.current = undefined
      return
    }
    if (Object.is(lastMonitorValueRef.current, monitorValue)) return
    lastMonitorValueRef.current = monitorValue
    const amount = Math.max(0, Math.min(1, toAmount(monitorValue)))
    const sequence = ++flashSequenceRef.current
    setFlashMarker({ amount, sequence })
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashMarker(null), 650)
  }, [monitorValue, min, max, logarithmic])
  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
  }, [])
  const setIndicatorOutside = (outside: boolean) => {
    // Shift half the scaled dash height so it straddles the knob's outer edge.
    if (indicatorRef.current) indicatorRef.current.style.transform = `translateX(-50%) translateY(${outside ? -size / 10 : 0}px)`
  }
  const finish = (pointerIsInside = pointerInsideRef.current, applyDraft = false) => {
    const pending = drag.current
    drag.current = null
    if (applyDraft && updateMode === 'on-release' && pending && !Object.is(pending.latestValue, value)) onChange(pending.latestValue)
    setDraftValue(null)
    setDragging(false)
    pointerInsideRef.current = pointerIsInside
    setIndicatorOutside(pointerIsInside)
  }
  const horizontalLabel = labelPosition === "left" || labelPosition === "right"
  const labelClasses = cn(
    "text-[10px] uppercase font-mono text-muted-foreground",
    horizontalLabel ? "w-[52px] shrink-0 text-[9px] leading-tight" : "text-center",
    labelPosition === "left" && "text-right",
    labelPosition === "right" && "text-left",
  )

  return <div className={cn("flex items-center gap-1 select-none", horizontalLabel ? "w-full flex-row" : "flex-col", labelPosition === "left" && "justify-end", labelPosition === "right" && "justify-start", !neon && "opacity-50")}>
    {!hideLabel && labelPosition === "top" && <span className="text-[10px] uppercase font-mono text-muted-foreground text-center" style={size!==40?{fontSize:size/4}:undefined}>{label}</span>}
    {!hideLabel && labelPosition === "left" && <span className={labelClasses}>{label}</span>}
    <div role="slider" data-update-mode={updateMode} aria-label={ariaLabel ?? label} title={ariaLabel} aria-valuemin={min} aria-valuemax={max} aria-valuenow={displayedValue} aria-valuetext={formatValue?.(displayedValue)} aria-disabled={!neon} tabIndex={neon ? 0 : -1}
      style={{width:size,height:size,borderColor:dragging?'#fff':accentColor}}
      className={cn("relative w-10 h-10 rounded-full bg-secondary border border-border group touch-none focus-visible:outline-2 focus-visible:outline-[var(--city-neon)]", neon ? "cursor-grab hover:border-[var(--city-neon)]" : "cursor-default", dragging && "border-white cursor-grabbing")}
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
        drag.current = { x: event.clientX, y: event.clientY, amount, latestValue: value }; setDragging(true); setIndicatorOutside(true)
      }}
      onPointerMove={event => {
        const start = drag.current
        if (!start) return
        const next = Math.max(0, Math.min(1, start.amount + (start.y - event.clientY + event.clientX - start.x) / 200))
        const nextValue = Math.max(min, Math.min(max, Math.round(fromAmount(next) / step) * step))
        start.latestValue = nextValue
        if (updateMode === 'immediate') commit(nextValue)
        else setDraftValue(nextValue)
      }}
      onPointerUp={event => {
        const start = drag.current
        if (start) {
          const next = Math.max(0, Math.min(1, start.amount + (start.y - event.clientY + event.clientX - start.x) / 200))
          const nextValue = Math.max(min, Math.min(max, Math.round(fromAmount(next) / step) * step))
          if (!Object.is(start.latestValue, nextValue)) {
            start.latestValue = nextValue
            if (updateMode === 'immediate') commit(nextValue)
            else setDraftValue(nextValue)
          }
        }
        const bounds = event.currentTarget.getBoundingClientRect()
        finish(event.pointerType !== 'touch' && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom, true)
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
      {/* CSS normalizes excess precision before hydration; serialize a stable angle. */}
      <div className="absolute w-full h-full rounded-full" style={{ transform: `rotate(${Number((-135 + amount * 270).toFixed(3))}deg)` }}>
        <div ref={indicatorRef} className={cn("absolute top-0 left-1/2 w-1 h-2 rounded-full transition-transform duration-150 ease-out", neon ? (dragging ? "" : "bg-[var(--city-neon)] group-hover:bg-white") : "bg-foreground/20")} style={{ transform: "translateX(-50%)", width: size / 10, height: size / 5, backgroundColor: !neon ? 'rgba(161, 161, 170, .45)' : dragging ? updateMode === 'on-release' ? 'rgba(161, 161, 170, .55)' : 'var(--city-neon, #b6e5ac)' : undefined }} />
      </div>
      {flashMarker && <div key={flashMarker.sequence} className="pointer-events-none absolute w-full h-full rounded-full" style={{ transform: `rotate(${Number((-135 + flashMarker.amount * 270).toFixed(3))}deg)` }} aria-hidden="true">
        <div className="absolute top-[1px] left-1/2 h-[6px] w-[2px] -translate-x-1/2 rounded-full bg-zinc-400" style={{ animation: 'knob-monitor-flash 260ms steps(2, end) 2' }} />
      </div>}
      <style jsx global>{`@keyframes knob-monitor-flash { 0%, 100% { opacity: .15; } 50% { opacity: .95; } }`}</style>
      <span style={size!==40?{fontSize:Math.max(6,size/5)}:undefined} className={cn("pointer-events-none absolute inset-x-0 top-[66%] -translate-y-1/2 whitespace-nowrap text-center font-mono text-[8px] font-bold leading-none transition-colors", neon ? "text-foreground/50 group-hover:text-white" : "text-foreground/20")}>
        {formatValue ? formatValue(displayedValue) : displayedValue.toFixed(2)}
      </span>
    </div>
    {!hideLabel && labelPosition === "bottom" && <span className="text-[10px] uppercase font-mono text-muted-foreground text-center">{label}</span>}
    {!hideLabel && labelPosition === "right" && <span className={labelClasses}>{label}</span>}
  </div>
}
