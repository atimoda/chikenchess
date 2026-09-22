"use client"

import type React from "react"
import { useRef, forwardRef } from "react"
import { Knob } from "./knob"
import type { SquareEffects } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import type { Instrument, InstrumentPerformanceEdit } from '@/lib/music/model'

interface SynthControlPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  selectedSquare: string | null
  selectedPieceInfo: string | null
  effects: SquareEffects
  onEffectChange: (effect: keyof SquareEffects, value: number) => void
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  isOn: boolean
  onToggle: () => void
  playback?: React.ReactNode
  instrument?: Instrument | null
  onInstrumentChange?: (patch: InstrumentPerformanceEdit) => void
  pieceSvg?: string | null
}

export const SynthControlPanel = forwardRef<HTMLDivElement, SynthControlPanelProps>(({
  selectedSquare,
  selectedPieceInfo,
  effects,
  onEffectChange,
  cityColor,
  position,
  onPositionChange,
  handleRef,
  toggleRef,
  isOn,
  onToggle,
  playback,
  instrument,
  onInstrumentChange,
  pieceSvg,
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
    ? "var(--city-neon)" 
    : (selectedSquare ? "var(--city-neon)" : "#60a5fa")

  return (
    <Draggable
      data-widget="piece"
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
            isOn ? "border-2 bg-black/80 backdrop-blur-md opacity-100" : "border bg-black/60 backdrop-blur-sm opacity-60",
            selectedSquare ? "border-white/70" : "border-white/30",
        )}
        style={{
            ...panelStyle,
            borderColor: widgetBorderColor,
            boxShadow: isOn && selectedSquare ? `0 0 20px ${cityColor}40` : "none",
        }}
      />

      {/* Toggle Button (On/Off) - Top Left - z-70 */}
      <button
        aria-label={isOn ? 'Desligar Piece Params' : 'Ligar Piece Params'}
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

      {/* Invisible Drag Handle Header - z-60 */}
      <div 
        ref={effectiveHandleRef}
        className="absolute inset-x-0 top-0 h-8 cursor-grab active:cursor-grabbing z-60"
      />

      {/* Main Content - z-50 */}
      <div className={cn("relative z-50 px-2.5 py-2.5 w-[340px] max-w-full", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 mb-1 px-2 min-h-12 relative">
            {pieceSvg && selectedSquare ? <div className="w-11 h-11 shrink-0 rounded border border-white/20 bg-white/10 p-1" aria-hidden="true" dangerouslySetInnerHTML={{ __html: pieceSvg }} /> : <div className="w-11 h-11 shrink-0 rounded border border-white/10 bg-white/5" />}
            <div className="min-w-0">
              <h2 className={cn(
                "truncate text-sm font-mono font-bold transition-colors duration-300",
                isOn && selectedSquare ? "text-[var(--city-neon)]" : "text-muted-foreground"
              )}>{selectedSquare ? selectedPieceInfo ?? 'Instrumento' : 'Selecione uma peça'}</h2>
              {selectedSquare && <span className="text-[10px] font-mono text-white/50">Casa {selectedSquare}</span>}
            </div>
          </div>
          <div className="h-[215px] overflow-hidden">{playback}</div>
          
          <div
            className={cn(
              "grid grid-cols-4 gap-x-2 gap-y-4 py-2",
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
            {instrument && !(instrument.source?.kind === 'sample' && !instrument.source.pitched) ? <Knob label="OITAVA" value={instrument.octave} min={1} max={6} step={1} formatValue={v => String(v)} onChange={octave => onInstrumentChange?.({ octave })} neon={isOn && !!selectedSquare} /> : <Knob
              label="PITCH"
              value={effects.pitch}
              min={0.5}
              max={2}
              onChange={(v) => onEffectChange("pitch", v)}
              neon={isOn}
            />}
            <Knob
              label="PAN"
              value={effects.pan}
              min={-1}
              max={1}
              onChange={(v) => onEffectChange("pan", v)}
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
              label="HPF"
              value={effects.hpf ?? 0}
              min={0}
              max={20000}
              logarithmic
              onChange={(v) => onEffectChange("hpf", v)}
              neon={isOn}
            />
            <Knob
              label="LPF"
              value={effects.lpf ?? 20000}
              min={20}
              max={20000}
              logarithmic
              onChange={(v) => onEffectChange("lpf", v)}
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
              min={0.01}
              max={2}
              onChange={(v) => onEffectChange("decay", v)}
              neon={isOn}
            />
            {instrument && <>
              <Knob label="ATAQUE" value={instrument.attack} min={.001} max={2} step={.001} logarithmic formatValue={v => `${v.toFixed(3)} s`} onChange={attack => onInstrumentChange?.({ attack })} neon={isOn && !!selectedSquare} />
              <Knob label="SUSTAIN" value={instrument.sustain ?? .55} min={0} max={1} onChange={sustain => onInstrumentChange?.({ sustain })} neon={isOn && !!selectedSquare} />
              <Knob label="RELEASE" value={instrument.release} min={.01} max={2} logarithmic formatValue={v => `${v.toFixed(2)} s`} onChange={release => onInstrumentChange?.({ release })} neon={isOn && !!selectedSquare} />
              <Knob label="DURAÇÃO" value={instrument.clip ?? .7} min={.05} max={1} formatValue={v => `${Math.round(v * 100)}%`} onChange={clip => onInstrumentChange?.({ clip })} neon={isOn && !!selectedSquare} />
            </>}
          </div>
        </div>
      </div>
    </Draggable>
  )
})

SynthControlPanel.displayName = "SynthControlPanel"
