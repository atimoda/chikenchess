"use client"

import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

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

export function GameControls({ onReset, cityColor, hasStarted }: GameControlsProps) {
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
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="w-full gap-2 bg-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset game</span>
      </Button>
    </div>
  )
}
