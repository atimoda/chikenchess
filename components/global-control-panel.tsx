"use client"

import type React from "react"
import { useRef, forwardRef } from "react"
import { Knob } from "./knob"
import { Slider } from "@/components/ui/slider"
import type { GlobalEffects } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"

interface GlobalControlPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  showAmbience?: boolean
  effects: GlobalEffects
  onEffectChange: (effect: keyof GlobalEffects, value: number) => void
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  isOn: boolean
  onToggle: () => void
}

export const GlobalControlPanel = forwardRef<HTMLDivElement, GlobalControlPanelProps>(({
  showAmbience = true,
  effects,
  onEffectChange,
  cityColor,
  position,
  onPositionChange,
  handleRef,
  toggleRef,
  isOn,
  onToggle,
  ...props
}, ref) => {
  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef

  const widgetBorderColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : "rgba(255,255,255,0.3)"

  const toggleIconColor = !isOn 
    ? "var(--city-neon)" 
    : "#60a5fa"

  return (
    <Draggable
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      className={cn(
        "pointer-events-auto", // Remove z-50 and visual styles from container
        props.className
      )}
      style={{
        ...props.style,
        zIndex: undefined // Ensure no z-index on container
      }}
      {...props}
    >
      {/* Widget Background/Box - z-50 */}
      <div 
        className={cn(
            "absolute inset-0 z-50 rounded-md transition-all duration-300",
            isOn ? "border-2 bg-black/80 backdrop-blur-md opacity-100" : "border bg-black/60 backdrop-blur-sm opacity-60",
            "border-white/30"
        )}
        style={{
            ...panelStyle,
            borderColor: widgetBorderColor,
            boxShadow: isOn ? `0 0 20px ${cityColor}40` : "none",
        }}
      />

      {/* Toggle Button (On/Off) - Top Left - z-70 */}
      <button
        ref={toggleRef}
        className={cn(
          "absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center transition-all z-70 shadow-md group hover:cursor-pointer",
        )}
        style={{ 
          borderColor: widgetBorderColor, 
          color: toggleIconColor,
          top: -5, 
          left: -8,
          boxShadow: isOn ? `0 0 10px ${cityColor}40` : "none"
        }}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <Power className={cn("w-4 h-4", isOn ? "drop-shadow-[0_0_8px_currentColor]" : "")} />
      </button>

      {/* Invisible Drag Handle Header - z-60 (above bg, below button) */}
      <div 
        ref={effectiveHandleRef}
        className="absolute inset-x-0 top-0 h-8 cursor-grab active:cursor-grabbing z-60"
      />

      {/* Main Content - z-50 (relative to sit on top of bg) */}
      <div className={cn("relative z-50 px-2.5 py-2.5 w-[340px]", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center mb-2 px-1 h-4 relative">
             <span className={cn(
               "text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300",
               isOn ? "text-[var(--city-neon)]" : "text-muted-foreground"
             )}>
                BOARD PARAMS
             </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 py-2">
            {/* Master Volume Slider */}
            <div className={cn("px-2 py-1 mb-2", !isOn && "pointer-events-none")}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">VOLUME</span>
                <span className="text-[10px] font-mono text-[var(--city-neon)]">{(effects.volume * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[effects.volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => onEffectChange("volume", v)}
                className="w-full"
              />
            </div>

            {/* BPM Slider */}
            <div className={cn("px-2 py-1 mb-2", !isOn && "pointer-events-none")}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">BPM</span>
                <span className="text-[10px] font-mono text-[var(--city-neon)]">{effects.bpm.toFixed(0)}</span>
              </div>
              <Slider
                value={[effects.bpm]}
                min={60}
                max={244}
                step={1}
                onValueChange={([v]) => onEffectChange("bpm", v)}
                className="w-full"
              />
            </div>

            {showAmbience && <div className="grid grid-cols-3 gap-2 mt-2">
              <Knob
                label="AMB PITCH"
                value={effects.ambiencePitch}
                min={0.5}
                max={2}
                onChange={(v) => onEffectChange("ambiencePitch", v)}
                neon={isOn}
              />
              <Knob
                label="AMB FILTER"
                value={effects.ambienceLpf}
                min={100}
                max={20000}
                onChange={(v) => onEffectChange("ambienceLpf", v)}
                neon={isOn}
              />
              <Knob
                label="AMB LFO"
                value={effects.ambienceLfoSpeed}
                min={0}
                max={10}
                onChange={(v) => onEffectChange("ambienceLfoSpeed", v)}
                neon={isOn}
              />
            </div>}
          </div>

        </div>
      </div>
    </Draggable>
  )
})

GlobalControlPanel.displayName = "GlobalControlPanel"
