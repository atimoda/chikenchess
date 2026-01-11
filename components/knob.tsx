"use client"

import React, { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface KnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

export function Knob({ value, min, max, step = 0.01, label, onChange, formatValue }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef<number>(0)
  const startX = useRef<number>(0)
  const startValue = useRef<number>(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    startY.current = e.clientY
    startX.current = e.clientX
    startValue.current = value
    document.body.style.cursor = "ns-resize"
    
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
    setIsDragging(false)
    document.body.style.cursor = "default"
    window.removeEventListener("mousemove", handleMouseMove)
    window.removeEventListener("mouseup", handleMouseUp)
  }

  // Calculate rotation for visual
  // Map min-max to -135deg to +135deg
  const percent = (value - min) / (max - min)
  const rotation = -135 + percent * 270

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div 
        className="relative w-10 h-10 rounded-full bg-secondary border border-border cursor-ns-resize group"
        onMouseDown={handleMouseDown}
      >
        <div 
          className="absolute w-full h-full rounded-full transition-colors group-hover:border-[var(--city-neon)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-foreground/50 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[10px] uppercase font-mono text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono font-bold" style={{ color: "var(--city-neon)" }}>
          {formatValue ? formatValue(value) : value.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
