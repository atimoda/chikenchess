"use client"

import type React from "react"
import { useRef, forwardRef } from "react"
import { Knob } from "./knob"
import type { SquareEffects } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"

interface SynthControlPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedSquare: string | null
  selectedPieceInfo: string | null
  effects: SquareEffects
  onEffectChange: (effect: keyof SquareEffects, value: number) => void
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  isOn: boolean
  onToggle: () => void
}

export const SynthControlPanel = forwardRef<HTMLDivElement, SynthControlPanelProps>(({
  selectedSquare,
  selectedPieceInfo: _selectedPieceInfo,
  effects,
  onEffectChange,
  cityColor,
  position,
  onPositionChange,
  handleRef,
  isOn,
  onToggle,
  ...props
}, ref) => {
  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef

  // Define styling based on state
  // Off: Border rgba(255,255,255,0.1), Icons White
  // On/Inactive: Border rgba(255,255,255,0.3), Icons matches border, Toggle Blue
  // On/Active: Border cityColor, Icons cityColor
  
  const widgetBorderColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : (selectedSquare ? cityColor : "rgba(255,255,255,0.3)")

  const toggleIconColor = !isOn 
    ? "white" 
    : (selectedSquare ? "var(--city-neon)" : "#60a5fa") // Neon if active, Blue if inactive

  const dragIconColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : (selectedSquare ? "var(--city-neon)" : "rgba(255,255,255,0.3)") // Neon if active, Matches border if inactive

  return (
    <Draggable
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      className={cn(
        "z-50 rounded-md select-none",
        isOn ? "border-2 bg-black/80 backdrop-blur-md" : "border bg-black/60 backdrop-blur-sm",
        selectedSquare ? "border-white/70" : "border-white/30",
        props.className
      )}
      style={{
        ...panelStyle,
        borderColor: widgetBorderColor,
        boxShadow: isOn && selectedSquare ? `0 0 20px ${cityColor}40` : "none",
        ...props.style
      }}
      {...props}
    >
      {/* Toggle Button (On/Off) - Top Left */}
      <button
        className={cn(
          "absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center transition-all z-50 shadow-md group hover:cursor-pointer",
        )}
        style={{ 
          borderColor: widgetBorderColor, 
          color: toggleIconColor,
          top: -13, 
          left: -16,
          boxShadow: isOn ? `0 0 10px ${cityColor}40` : "none"
        }}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <Power className={cn("w-4 h-4", isOn ? "drop-shadow-[0_0_8px_currentColor]" : "")} />
      </button>

      {/* Drag Handle - Below Toggle */}
      <div
        className={cn(
            "absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center transition-all z-40 shadow-md group hover:cursor-grab hover:text-black cursor-grab active:cursor-grabbing",
        )}
        style={{ 
            borderColor: widgetBorderColor, 
            color: dragIconColor,
            top: 24, 
            left: -16 
        }}
        ref={effectiveHandleRef}
      >
        <div className="flex flex-col gap-[2px] items-center justify-center">
          <span className={cn("block w-4 h-px bg-current", isOn && selectedSquare ? "shadow-[0_0_5px_currentColor]" : "")} />
          <span className={cn("block w-4 h-px bg-current", isOn && selectedSquare ? "shadow-[0_0_5px_currentColor]" : "")} />
          <span className={cn("block w-4 h-px bg-current", isOn && selectedSquare ? "shadow-[0_0_5px_currentColor]" : "")} />
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("px-2.5 py-2.5 min-w-[300px]", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2 px-1 h-4">
            {isOn ? (
               <span className="text-xs font-mono font-bold text-[var(--city-neon)] uppercase tracking-wider animate-in fade-in duration-300">
                  {selectedSquare ? `SQ: ${selectedSquare}` : "NO SELECTION"}
               </span>
            ) : <span />}
             <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                SYNTH PARAMS
             </span>
          </div>
          
          <div
            className={cn(
              "flex items-center justify-between gap-2 overflow-x-hidden py-2",
              (!selectedSquare && isOn) && "opacity-50 pointer-events-none grayscale",
              !isOn && "pointer-events-none"
            )}
          >
            <style jsx global>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <Knob
              label="GAIN"
              value={effects.gain}
              min={0}
              max={2}
              onChange={(v) => onEffectChange("gain", v)}
              neon={isOn}
            />
            <Knob
              label="PAN"
              value={effects.pan}
              min={-1}
              max={1}
              onChange={(v) => onEffectChange("pan", v)}
              neon={isOn}
            />
            <Knob
              label="PITCH"
              value={effects.pitch}
              min={0.5}
              max={2}
              onChange={(v) => onEffectChange("pitch", v)}
              neon={isOn}
            />

            <Knob
              label="DELAY"
              value={effects.delay}
              min={0}
              max={1}
              onChange={(v) => onEffectChange("delay", v)}
              neon={isOn}
            />
            <Knob
              label="REVERB"
              value={effects.reverb}
              min={0}
              max={1}
              onChange={(v) => onEffectChange("reverb", v)}
              neon={isOn}
            />
            <Knob
              label="DECAY"
              value={effects.decay}
              min={0.1}
              max={2}
              onChange={(v) => onEffectChange("decay", v)}
              neon={isOn}
            />
          </div>
        </div>
      </div>
    </Draggable>
  )
})

SynthControlPanel.displayName = "SynthControlPanel"
