"use client"

import type React from "react"
import { useRef, forwardRef } from "react"
import { Knob } from "./knob"
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
  togglePortalized?: boolean
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
  togglePortalized = false,
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

  return (
    <Draggable
      data-widget="board"
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      dragFromBackground
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
            isOn ? "border bg-black/80 backdrop-blur-md opacity-100" : "border bg-black/60 backdrop-blur-sm opacity-60",
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
        aria-label={isOn ? 'Desligar Board Params' : 'Ligar Board Params'}
        aria-hidden={togglePortalized || undefined}
        tabIndex={togglePortalized ? -1 : 0}
        ref={toggleRef}
        className={cn(
          "absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center transition-all z-70 shadow-md group cursor-pointer hover:text-[#60a5fa]",
          togglePortalized && "invisible pointer-events-none",
          !isOn && "hover:drop-shadow-[0_0_8px_#60a5fa]",
          isOn ? "text-[var(--city-neon)]" : "text-white",
        )}
        style={{ 
          ...panelStyle,
          borderColor: widgetBorderColor,
          backgroundColor: isOn ? undefined : "color-mix(in srgb, var(--background) 50%, transparent)",
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
        className="absolute inset-x-0 top-0 h-8 z-60"
      />

      {/* Main Content - z-50 (relative to sit on top of bg) */}
      <div className={cn("relative z-50 px-2.5 py-2.5 w-[340px] max-w-full", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center mb-2 px-1 h-4 relative">
             <span className={cn(
               "text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300",
               "text-white"
             )}>
                BOARD PARAMS
             </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 py-2">
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
      {!isOn && <div className="absolute inset-0 z-[65] touch-none" aria-hidden="true" />}
    </Draggable>
  )
})

GlobalControlPanel.displayName = "GlobalControlPanel"
