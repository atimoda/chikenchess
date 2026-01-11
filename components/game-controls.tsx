"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RotateCcw, Play, Pause, Undo2, Redo2 } from "lucide-react"

interface GameControlsProps {
  onReset: () => void
  onUndo: () => void
  canUndo: boolean
  onRedo: () => void
  canRedo: boolean
  isPlaying: boolean
  onTogglePlay: () => void
  cityColor: string
  hasStarted: boolean
}

export function GameControls({ onReset, onUndo, canUndo, onRedo, canRedo, isPlaying, onTogglePlay, cityColor, hasStarted }: GameControlsProps) {
  const buttonStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  return (
    <div 
      className={`relative z-50 flex flex-col gap-2 p-3 md:p-4 rounded-lg border transition-all duration-[3000ms] ${
        hasStarted ? "bg-transparent border-transparent" : "bg-card/80 border-border backdrop-blur-sm"
      }`}
      style={buttonStyle}
    >
      <div className="flex gap-2 w-full">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onUndo} 
          disabled={!canUndo} 
          className="flex-1 gap-2 bg-transparent h-16 hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] transition-all"
        >
          <Undo2 className="w-5 h-5" />
          <span className="hidden sm:inline">Undo</span>
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRedo} 
          disabled={!canRedo} 
          className="flex-1 gap-2 bg-transparent h-16 hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] transition-all"
        >
          <Redo2 className="w-5 h-5" />
          <span className="hidden sm:inline">Redo</span>
        </Button>
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={onReset} 
        className="w-full gap-2 bg-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset game</span>
      </Button>

      <Button 
        variant={isPlaying ? "default" : "outline"} 
        size="sm" 
        onClick={onTogglePlay} 
        className="w-full gap-2 hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] transition-all"
        style={isPlaying ? { backgroundColor: cityColor, color: 'black', borderColor: cityColor, boxShadow: `0 0 15px ${cityColor}` } : {}}
      >
        {isPlaying ? (
          <>
            <Pause className="w-4 h-4" />
            <span className="hidden sm:inline">Pause Audio</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Play Audio</span>
          </>
        )}
      </Button>
    </div>
  )
}
