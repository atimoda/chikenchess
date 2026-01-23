"use client"

import React, { useRef } from "react"

interface KnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  neon?: boolean
}

export function Knob({ value, min, max, step = 0.01, label, onChange, formatValue, neon = true }: KnobProps) {
  const startY = useRef<number>(0)
  const startX = useRef<number>(0)
  const startValue = useRef<number>(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!neon) return
    startY.current = e.clientY
    startX.current = e.clientX
    startValue.current = value
    document.body.style.cursor = "ew-resize"
    
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = startY.current - e.clientY // Up is positive
    const deltaX = e.clientX - startX.current // Right is positive
    
    // Combine deltas for intuitive control (up/right = increase)
    const delta = deltaY + deltaX
    
    // Sensitivity
    const range = max - min
    const change = (delta / 200) * range
    
    let newValue = startValue.current + change
    
    // Clamp
    newValue = Math.min(max, Math.max(min, newValue))
    
    // Step
    if (step) {
      newValue = Math.round(newValue / step) * step
    }

    onChange(newValue)
  }

  const handleMouseUp = () => {
    document.body.style.cursor = "default"
    window.removeEventListener("mousemove", handleMouseMove)
    window.removeEventListener("mouseup", handleMouseUp)
  }

  // Calculate rotation for visual
  // Map min-max to -135deg to +135deg
  const percent = (value - min) / (max - min)
  const rotation = -135 + percent * 270

  return (
    <div className={cn("flex flex-col items-center gap-1 select-none", !neon && "opacity-50")}>
      <div 
        className={cn(
            "relative w-10 h-10 rounded-full bg-secondary border border-border group transition-all",
            neon ? "cursor-ew-resize hover:border-[var(--city-neon)]" : "cursor-default border-border/50 bg-secondary/50"
        )}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="absolute w-full h-full rounded-full transition-colors"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className={cn("absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 rounded-full transition-colors", neon ? "bg-foreground/50 group-hover:bg-[var(--city-neon)]" : "bg-foreground/20")} />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[10px] uppercase font-mono text-muted-foreground">{label}</span>
        <span className={cn("text-[10px] font-mono font-bold transition-colors", neon ? "text-[var(--city-neon)]" : "text-muted-foreground")}>
          {formatValue ? formatValue(value) : value.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
import { cn } from "@/lib/utils"
