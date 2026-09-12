"use client"

import { useState, useEffect, forwardRef, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { PAD_SAMPLES, SquareEffects, DEFAULT_EFFECTS } from "@/lib/types"
import { Draggable } from "@/components/ui/draggable"
import { Power } from "lucide-react"

interface StrudelEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  selectedSquare: string | null
  effects: SquareEffects
  onEffectChange: (effect: keyof SquareEffects, value: any) => void
  cityColor: string
  isOpen: boolean
  onToggle: () => void
  position?: { x: number; y: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
}

export const StrudelEditor = forwardRef<HTMLDivElement, StrudelEditorProps>(({
  selectedSquare,
  effects,
  onEffectChange,
  cityColor,
  isOpen,
  onToggle,
  position,
  onPositionChange,
  handleRef,
  className,
  style,
  ...props
}, ref) => {
  
  // Ensure sequence exists
  const sequence = effects.sequence || [1, 0, 0, 0]
  const division = effects.division || 4

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef

  const handleSequenceToggle = (index: number) => {
    const newSeq = [...sequence]
    newSeq[index] = newSeq[index] ? 0 : 1
    onEffectChange("sequence", newSeq)
  }

  const handleDivisionChange = (newDiv: number) => {
    // Resize sequence array if needed
    let newSeq = [...sequence]
    if (newDiv > sequence.length) {
        newSeq = [...newSeq, ...Array(newDiv - sequence.length).fill(0)]
    } else if (newDiv < sequence.length) {
        newSeq = newSeq.slice(0, newDiv)
    }
    onEffectChange("division", newDiv)
    onEffectChange("sequence", newSeq)
  }

  const widgetBorderColor = !isOpen 
    ? "rgba(255,255,255,0.1)" 
    : (selectedSquare ? cityColor : "rgba(255,255,255,0.3)")

  const toggleIconColor = !isOpen 
    ? "white" 
    : (selectedSquare ? "var(--city-neon)" : "#60a5fa")

  const dragIconColor = !isOpen 
    ? "rgba(255,255,255,0.1)" 
    : (selectedSquare ? "var(--city-neon)" : "rgba(255,255,255,0.3)")

  return (
    <Draggable
        ref={ref}
        position={position}
        onDrag={onPositionChange}
        handleRef={effectiveHandleRef}
        dragFromBackground
        className={cn(
            "z-50 rounded-lg shadow-2xl flex flex-col w-[350px] max-h-[60vh]",
            isOpen ? "bg-card/95 backdrop-blur-md border" : "bg-black/60 backdrop-blur-sm border",
            className
        )}
        style={{ 
            borderColor: widgetBorderColor,
            boxShadow: isOpen && selectedSquare ? `0 0 20px ${cityColor}40` : "none",
            ...style
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
                boxShadow: isOpen ? `0 0 10px ${cityColor}40` : "none"
            }}
            onClick={(e) => {
                e.stopPropagation()
                onToggle()
            }}
        >
            <Power className={cn("w-4 h-4", isOpen ? "drop-shadow-[0_0_8px_currentColor]" : "")} />
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
                <span className={cn("block w-4 h-px bg-current", isOpen && selectedSquare ? "shadow-[0_0_5px_currentColor]" : "")} />
                <span className={cn("block w-4 h-px bg-current", isOpen && selectedSquare ? "shadow-[0_0_5px_currentColor]" : "")} />
                <span className={cn("block w-4 h-px bg-current", isOpen && selectedSquare ? "shadow-[0_0_5px_currentColor]" : "")} />
            </div>
        </div>

        <div className={cn("flex flex-col h-full overflow-hidden", !isOpen && "opacity-50 grayscale pointer-events-none")}>
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between bg-muted/20">
                <h3 className="font-mono font-bold text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cityColor }} />
                    STRUDEL EDITOR
                </h3>
                <div className="flex items-center gap-2">
                     <div className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {selectedSquare ? selectedSquare.toUpperCase() : "NO SEL"}
                     </div>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6 pb-4">
                    
                    {/* Empty State */}
                    {!selectedSquare && (
                        <div className="text-center py-8 text-muted-foreground text-xs font-mono">
                            Select a square on the board to edit its sound.
                        </div>
                    )}

                    <div className={cn("space-y-6", !selectedSquare && "opacity-50 pointer-events-none filter blur-[1px]")}>
                        
                        {/* Sample Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-muted-foreground font-bold tracking-wider">SAMPLE</label>
                            <div className="grid grid-cols-4 gap-1">
                                {PAD_SAMPLES.slice(0, 16).map(sample => (
                                    <button
                                        key={sample}
                                        className={cn(
                                            "text-[10px] px-1 py-1.5 rounded border transition-colors truncate font-mono",
                                            effects.sample === sample 
                                                ? "bg-primary text-primary-foreground" 
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                        style={effects.sample === sample ? { backgroundColor: cityColor, borderColor: cityColor } : {}}
                                        onClick={() => onEffectChange("sample", sample)}
                                    >
                                        {sample}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sequencer */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-mono text-muted-foreground font-bold tracking-wider">PATTERN</label>
                                <div className="flex gap-1">
                                     {[4, 8, 16].map(d => (
                                         <button
                                            key={d}
                                            className={cn(
                                                "text-[9px] px-1.5 py-0.5 rounded border transition-colors",
                                                division === d ? "bg-muted text-foreground border-foreground/50" : "text-muted-foreground border-transparent hover:border-border"
                                            )}
                                            onClick={() => handleDivisionChange(d)}
                                         >
                                            1/{d}
                                         </button>
                                     ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-8 gap-1">
                                {sequence.map((step, i) => (
                                    <button
                                        key={i}
                                        className={cn(
                                            "aspect-square rounded-sm border transition-all",
                                            step ? "bg-foreground" : "bg-muted/20"
                                        )}
                                        style={{ 
                                            backgroundColor: step ? cityColor : undefined,
                                            borderColor: step ? cityColor : undefined,
                                            opacity: step ? 1 : 0.3
                                        }}
                                        onClick={() => handleSequenceToggle(i)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-5 pt-2">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-mono">
                                    <label className="font-bold text-muted-foreground">GAIN</label>
                                    <span>{effects.gain.toFixed(2)}</span>
                                </div>
                                <Slider 
                                    value={[effects.gain]} 
                                    min={0} 
                                    max={2} 
                                    step={0.01}
                                    onValueChange={([v]) => onEffectChange("gain", v)}
                                    className="cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-mono">
                                    <label className="font-bold text-muted-foreground">PITCH</label>
                                    <span>{effects.pitch.toFixed(2)}x</span>
                                </div>
                                <Slider 
                                    value={[effects.pitch]} 
                                    min={0.1} 
                                    max={4} 
                                    step={0.1}
                                    onValueChange={([v]) => onEffectChange("pitch", v)}
                                    className="cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-mono">
                                    <label className="font-bold text-muted-foreground">DECAY</label>
                                    <span>{effects.decay.toFixed(2)}s</span>
                                </div>
                                <Slider 
                                    value={[effects.decay]} 
                                    min={0.1} 
                                    max={2} 
                                    step={0.1}
                                    onValueChange={([v]) => onEffectChange("decay", v)}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    </Draggable>
  )
})
