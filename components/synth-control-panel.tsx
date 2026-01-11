"use client"

import { Knob } from "./knob"
import type { SquareEffects } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SynthControlPanelProps {
  selectedSquare: string | null
  selectedPieceInfo: string | null // e.g. "Queen - Lead"
  effects: SquareEffects
  onEffectChange: (effect: keyof SquareEffects, value: number) => void
  cityColor: string
}

export function SynthControlPanel({ 
  selectedSquare, 
  selectedPieceInfo, 
  effects, 
  onEffectChange,
  cityColor
}: SynthControlPanelProps) {
  
  const headerText = selectedSquare 
    ? `${selectedSquare.toUpperCase()} - ${selectedPieceInfo || "Empty"}`
    : ""

  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  return (
    <div className="mb-4" style={panelStyle}>
      <div className="">
        <div className="flex flex-col gap-3">
          {/* Header hidden as per request */}
          {/* <div className="flex items-center justify-between border-b border-border pb-2 min-h-[2.5rem]">
            <h3 className="font-mono text-sm font-bold tracking-wider flex items-center gap-2">
              {selectedSquare && (
                <>
                   <div className="w-2 h-2 rounded-full bg-[var(--city-neon)] animate-pulse" />
                   {headerText}
                </>
              )}
            </h3>
          </div> */}
          
          <div className={cn("flex items-center justify-between gap-2 overflow-x-hidden py-2", !selectedSquare && "opacity-50 pointer-events-none grayscale")}>
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
            />
            <Knob 
              label="PAN" 
              value={effects.pan} 
              min={-1} 
              max={1} 
              onChange={(v) => onEffectChange("pan", v)} 
            />
            <Knob 
              label="PITCH" 
              value={effects.pitch} 
              min={0.5} 
              max={2} 
              onChange={(v) => onEffectChange("pitch", v)} 
            />
            
            <Knob 
              label="DELAY" 
              value={effects.delay} 
              min={0} 
              max={1} 
              onChange={(v) => onEffectChange("delay", v)} 
            />
            <Knob 
              label="REVERB" 
              value={effects.reverb} 
              min={0} 
              max={1} 
              onChange={(v) => onEffectChange("reverb", v)} 
            />
            <Knob 
              label="DECAY" 
              value={effects.decay} 
              min={0.1} 
              max={2} 
              onChange={(v) => onEffectChange("decay", v)} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}


