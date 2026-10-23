'use client'

import { useEffect, useRef } from 'react'
import type React from 'react'
import styles from './creative-studio.module.css'

const REPEAT_DELAY_MS = 400
const REPEAT_INTERVAL_MS = 60

/** Press-and-hold repetition for +/- buttons, matching native number spinners. */
export function useRepeatPress(step: () => void) {
  const stepRef = useRef(step)
  stepRef.current = step
  const timerRef = useRef<number | null>(null)
  const stop = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
  useEffect(() => stop, [])
  const start = () => {
    stop()
    stepRef.current()
    const repeat = (delay: number) => {
      timerRef.current = window.setTimeout(() => { stepRef.current(); repeat(REPEAT_INTERVAL_MS) }, delay)
    }
    repeat(REPEAT_DELAY_MS)
    // Disabled buttons stop receiving events at the limit, so listen on the window.
    const release = () => { stop(); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); window.removeEventListener('blur', release) }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    window.addEventListener('blur', release)
  }
  return {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      if (event.button !== 0) return
      event.preventDefault()
      start()
    },
    onPointerLeave: stop,
    // Keyboard activation (Enter/Space) arrives as a click without pointer detail.
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); if (event.detail === 0) stepRef.current() },
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  }
}

interface StepperButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onPointerDown'> {
  onStep: () => void
}

export function StepperButton({ onStep, ...props }: StepperButtonProps) {
  const press = useRepeatPress(onStep)
  return <button type="button" {...props} {...press} />
}

/** Clamped value helper shared by the steppers; keeps decimal steps exact. */
export function stepValue(value: number, direction: -1 | 1, min: number, max: number, step: number) {
  const precision = Math.max(...[min, max, step].map(number => (String(number).split('.')[1] ?? '').length))
  return Number(Math.max(min, Math.min(max, value + direction * step)).toFixed(precision))
}

interface Props {
  ariaLabel: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

export function CompactNumberInput({ariaLabel,value,min,max,step=1,onChange}:Props) {
  // Repeated steps read the latest value even before the parent re-renders.
  const valueRef=useRef(value)
  valueRef.current=value
  const adjust=(direction:-1|1)=>{const next=stepValue(valueRef.current,direction,min,max,step);if(next===valueRef.current)return;valueRef.current=next;onChange(next)}
  return <div className={styles.numberStepper}>
    <input aria-label={ariaLabel} inputMode="decimal" value={value} onChange={event=>{const next=Number(event.target.value);if(Number.isFinite(next)&&next>=min&&next<=max)onChange(next)}} />
    <StepperButton aria-label={`Decrease ${ariaLabel}`} disabled={value<=min} onStep={()=>adjust(-1)}>−</StepperButton>
    <StepperButton aria-label={`Increase ${ariaLabel}`} disabled={value>=max} onStep={()=>adjust(1)}>+</StepperButton>
  </div>
}
