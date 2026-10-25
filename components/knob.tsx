"use client"

import React, { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface KnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  /** Replaces the plain label text, e.g. to attach contextual help. */
  labelContent?: ReactNode
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
  /** In on-release mode, the value under the pointer while dragging; null when the drag ends. */
  onDraftChange?: (value: number | null) => void
  gestureMode?: KnobGestureMode
}

export type KnobUpdateMode = 'immediate' | 'on-release'
/**
 * relative: dragging anywhere changes the value incrementally.
 * angular: the value follows the circle point nearest to the pointer.
 * hybrid: dragging the marker is angular (grab cursor); dragging the dial background is relative (w-resize cursor).
 */
export type KnobGestureMode = 'relative' | 'angular' | 'hybrid'
export type KnobDragMode = Exclude<KnobGestureMode, 'hybrid'>
export const DEFAULT_KNOB_SIZE = 40
/** Knobs of Musical params and the Creative parameter panel are 15% larger than the default. */
export const LARGE_KNOB_SIZE = 46

/** With the label below, the unused bottom of the dial is trimmed (about 5px at 46px) and the label moves up by the same amount. */
export function knobBottomTrim(size: number, labelPosition?: string) {
  return labelPosition === 'bottom' ? Math.round(size * 5 / 46) : 0
}

export function knobDragMode(gestureMode: KnobGestureMode, onMarker: boolean): KnobDragMode {
  if (gestureMode !== 'hybrid') return gestureMode
  return onMarker ? 'angular' : 'relative'
}

export function knobRelativeAmount(startAmount: number, startX: number, startY: number, clientX: number, clientY: number) {
  return Math.max(0, Math.min(1, startAmount + (startY - clientY + clientX - startX) / 200))
}

export function knobCursor(gestureMode: KnobGestureMode, dragMode: KnobDragMode | null) {
  if (dragMode === 'angular') return 'grabbing'
  if (dragMode === 'relative') return 'w-resize'
  return gestureMode === 'relative' || gestureMode === 'hybrid' ? 'w-resize' : 'grab'
}

interface KnobBounds {
  left: number
  top: number
  width: number
  height: number
}

export function knobAmountFromPointer(clientX: number, clientY: number, bounds: KnobBounds, currentAmount: number) {
  const dx = clientX - (bounds.left + bounds.width / 2)
  const dy = clientY - (bounds.top + bounds.height / 2)
  if (Math.hypot(dx, dy) < 1) return currentAmount

  const pointerAngle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360
  const arcPosition = (pointerAngle - 135 + 360) % 360
  if (arcPosition <= 270) return arcPosition / 270
  // The unused bottom arc snaps to its nearest endpoint.
  return arcPosition < 315 ? 1 : 0
}

export function knobValueLabelStyle(size: number, row?: 'top' | 'bottom'): React.CSSProperties {
  const stackOffset = row === 'top' ? -size * .13 : row === 'bottom' ? size * .13 : 0
  return {
    left: size / 2,
    top: size / 2 + stackOffset,
    transform: 'translate(-50%, -50%)',
  }
}

export function Knob({ value, min, max, step = .01, label, labelContent, ariaLabel, onChange, formatValue, neon = true, logarithmic = false, hideLabel = false, labelPosition = "top", monitorValue, size = DEFAULT_KNOB_SIZE, accentColor, updateMode = 'immediate', onDraftChange, gestureMode = 'hybrid' }: KnobProps) {
  const drag = useRef<{ x: number; y: number; amount: number; latestValue: number; mode: KnobDragMode } | null>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const pointerInsideRef = useRef(false)
  const lastMonitorValueRef = useRef<number | undefined>(undefined)
  const flashSequenceRef = useRef(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dragMode, setDragMode] = useState<KnobDragMode | null>(null)
  const dragging = dragMode !== null
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
    if (pending && updateMode === 'on-release') onDraftChange?.(null)
    setDragMode(null)
    pointerInsideRef.current = pointerIsInside
    setIndicatorOutside(pointerIsInside)
  }
  const horizontalLabel = labelPosition === "left" || labelPosition === "right"
  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>, start: NonNullable<typeof drag.current>) => {
    const nextAmount = start.mode === 'angular'
      ? knobAmountFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), amount)
      : knobRelativeAmount(start.amount, start.x, start.y, event.clientX, event.clientY)
    const nextValue = Math.max(min, Math.min(max, Math.round(fromAmount(nextAmount) / step) * step))
    if (Object.is(start.latestValue, nextValue)) return
    start.latestValue = nextValue
    if (updateMode === 'immediate') commit(nextValue)
    else { setDraftValue(nextValue); onDraftChange?.(nextValue) }
  }
  const labelClasses = cn(
    "text-[10px] uppercase font-mono text-muted-foreground",
    horizontalLabel ? "w-[52px] shrink-0 text-[9px] leading-tight" : "text-center",
    labelPosition === "left" && "text-right",
    labelPosition === "right" && "text-left",
  )

  const trim = knobBottomTrim(size, labelPosition)
  const cursor = neon ? knobCursor(gestureMode, dragMode) : 'default'
  const markerCursor = neon ? dragMode === 'relative' ? 'w-resize' : dragMode === 'angular' ? 'grabbing' : 'grab' : 'default'
  return <div className={cn("flex items-center select-none", labelPosition === "bottom" ? "gap-[2px]" : "gap-1", horizontalLabel ? "w-full flex-row" : "flex-col", labelPosition === "left" && "justify-end", labelPosition === "right" && "justify-start", !neon && "opacity-50")}>
    {!hideLabel && labelPosition === "top" && <span className="text-[10px] uppercase font-mono text-muted-foreground text-center" style={size!==40?{fontSize:size/4}:undefined}>{label}</span>}
    {!hideLabel && labelPosition === "left" && <span className={labelClasses}>{label}</span>}
    <div role="slider" data-update-mode={updateMode} data-gesture-mode={gestureMode} aria-label={ariaLabel ?? label} title={ariaLabel} aria-valuemin={min} aria-valuemax={max} aria-valuenow={displayedValue} aria-valuetext={formatValue?.(displayedValue)} aria-disabled={!neon} tabIndex={neon ? 0 : -1}
      style={{width:size,height:size,cursor}}
      className="relative w-10 h-10 rounded-full border border-transparent group touch-none focus-visible:outline-2 focus-visible:outline-[var(--city-neon)]"
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
        const mode = knobDragMode(gestureMode, !!(event.target as Element).closest?.('[data-knob-marker]'))
        drag.current = { x: event.clientX, y: event.clientY, amount, latestValue: value, mode }; setDragMode(mode); setIndicatorOutside(true)
        if (mode === 'angular') updateFromPointer(event, drag.current)
      }}
      onPointerMove={event => {
        const start = drag.current
        if (!start) return
        updateFromPointer(event, start)
      }}
      onPointerUp={event => {
        const start = drag.current
        if (start) updateFromPointer(event, start)
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
      {/* Visible dial: a separate layer so the trim clips only the circle, not markers or values. */}
      <div data-knob-face aria-hidden="true" className={cn("pointer-events-none absolute -inset-px rounded-full border border-border bg-secondary", neon && "group-hover:border-[var(--city-neon)]", dragging && "border-white")} style={{ borderColor: dragging ? '#fff' : accentColor, clipPath: trim ? `inset(0 0 ${trim}px 0)` : undefined }} />
      {/* CSS normalizes excess precision before hydration; serialize a stable angle. */}
      <div className="pointer-events-none absolute w-full h-full rounded-full" style={{ transform: `rotate(${Number((-135 + amount * 270).toFixed(3))}deg)` }}>
        {/* Wider invisible grip around the marker: in hybrid mode it starts the angular gesture. */}
        {gestureMode === 'hybrid' && <div data-knob-marker aria-hidden="true" className="pointer-events-auto absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: -size / 8, width: size / 2.6, height: size / 2.6, cursor: markerCursor }} />}
        <div ref={indicatorRef} className={cn("absolute top-0 left-1/2 w-1 h-2 rounded-full transition-transform duration-150 ease-out", neon ? (dragging ? "" : "bg-[var(--city-neon)] group-hover:bg-white") : "bg-foreground/20")} style={{ transform: "translateX(-50%)", width: size / 10, height: size / 5, backgroundColor: !neon ? 'rgba(161, 161, 170, .45)' : dragging ? updateMode === 'on-release' ? 'rgba(161, 161, 170, .55)' : 'var(--city-neon, #b6e5ac)' : undefined }} />
      </div>
      {flashMarker && <div key={flashMarker.sequence} className="pointer-events-none absolute w-full h-full rounded-full" style={{ transform: `rotate(${Number((-135 + flashMarker.amount * 270).toFixed(3))}deg)` }} aria-hidden="true">
        <div className="absolute top-[1px] left-1/2 h-[6px] w-[2px] -translate-x-1/2 rounded-full bg-zinc-400" style={{ animation: 'knob-monitor-flash 260ms steps(2, end) 2' }} />
      </div>}
      <style jsx global>{`@keyframes knob-monitor-flash { 0%, 100% { opacity: .15; } 50% { opacity: .95; } }`}</style>
      <span style={{ ...knobValueLabelStyle(size), ...(size!==40?{fontSize:Math.max(6,size/5)}:{}) }} className={cn("pointer-events-none absolute z-20 whitespace-nowrap text-center font-mono text-[8px] font-bold leading-none transition-colors", neon ? "text-foreground/70 group-hover:text-white" : "text-foreground/30")}>
        {formatValue ? formatValue(displayedValue) : displayedValue.toFixed(2)}
      </span>
    </div>
    {!hideLabel && labelPosition === "bottom" && <div style={{ marginTop: -trim }}>{labelContent ?? <span className="block text-[10px] uppercase font-mono leading-none text-muted-foreground text-center" style={size!==DEFAULT_KNOB_SIZE?{fontSize:Math.min(10,size/4)}:undefined}>{label}</span>}</div>}
    {!hideLabel && labelPosition === "right" && <span className={labelClasses}>{label}</span>}
  </div>
}
