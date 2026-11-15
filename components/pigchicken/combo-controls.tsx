"use client"

import { useEffect, useRef } from "react"
import { COMBO_ARC_MAX, COMBO_ARC_MIN, subscribeComboBlow, type ComboBlowEvent } from "@/lib/pigchicken/swing"

const ARC_STEP = 5 // degrees the knob moves in
const KNOB_KEYS: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }

// The angle a combo blow covers, as a little dial: the wedge is the hit area (centred on the aim, to the right) and
// dragging sideways or up/down changes it like a knob. The number beside it is only a reference
export function AngleKnob({ value, label, disabled, onChange }: { value: number; label: string; disabled?: boolean; onChange: (value: number) => void }) {
  const drag = useRef<{ x: number; y: number; from: number; last: number } | null>(null)
  const snap = (v: number) => Math.min(COMBO_ARC_MAX, Math.max(COMBO_ARC_MIN, Math.round(v / ARC_STEP) * ARC_STEP))
  const half = value / 2 * Math.PI / 180, r = 11, c = 14
  const x = c + r * Math.cos(half), y = r * Math.sin(half)
  return (
    <span role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={COMBO_ARC_MIN} aria-valuemax={COMBO_ARC_MAX} aria-valuenow={value} aria-valuetext={`${value}°`} aria-disabled={disabled || undefined}
      title="Ângulo que o golpe cobre: arraste para os lados ou para cima/baixo"
      onPointerDown={e => { if (disabled) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, from: value, last: value } }}
      onPointerMove={e => {
        const d = drag.current
        if (!d) return
        const v = snap(d.from + (e.clientX - d.x - (e.clientY - d.y)) * 1.5)
        if (v !== d.last) { d.last = v; onChange(v) }
      }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
      onKeyDown={e => { const k = KNOB_KEYS[e.key]; if (!k || disabled) return; e.preventDefault(); e.stopPropagation(); const v = snap(value + k * ARC_STEP); if (v !== value) onChange(v) }}
      className={`inline-flex h-8 shrink-0 touch-none select-none items-center gap-1 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-primary ${disabled ? "opacity-60" : "cursor-ew-resize"}`}>
      <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden>
        <circle cx={c} cy={c} r={r + 1.5} fill="#0b110e" stroke="rgba(255,255,255,0.2)" />
        {value >= 360
          ? <circle cx={c} cy={c} r={r} fill="var(--primary)" />
          : <path d={`M${c} ${c} L${x.toFixed(2)} ${(c - y).toFixed(2)} A${r} ${r} 0 ${value > 180 ? 1 : 0} 1 ${x.toFixed(2)} ${(c + y).toFixed(2)} Z`} fill="var(--primary)" />}
      </svg>
      <span className="w-6 text-[10px] tabular-nums text-white/60">{value}°</span>
    </span>
  )
}

// The combo window as a thin bar: full while the main player's blow moves (and while its block holds the next one),
// then it empties for as long as the next blow still carries on the sequence. It only listens while it is on screen
export function ComboWindowBar() {
  const fill = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0, start = 0, blow: ComboBlowEvent | null = null
    const tick = () => {
      const t = (performance.now() - start) / 1000
      const left = !blow || blow.window <= 0 ? 0 : Math.max(0, Math.min(1, 1 - (t - blow.busy) / blow.window))
      if (fill.current) fill.current.style.transform = `scaleX(${left})`
      raf = left > 0 ? requestAnimationFrame(tick) : 0
    }
    const stop = subscribeComboBlow(e => { blow = e; start = performance.now(); if (!raf) raf = requestAnimationFrame(tick) })
    return () => { stop(); cancelAnimationFrame(raf) }
  }, [])
  return <div data-combo-window-bar aria-hidden className="h-2 overflow-hidden rounded-full bg-[#22302a]"><div ref={fill} className="h-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} /></div>
}
