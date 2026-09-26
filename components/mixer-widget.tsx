"use client"

import type React from "react"
import { Fragment, forwardRef, useRef } from "react"
import { Power } from "lucide-react"
import { Draggable } from "./ui/draggable"
import { Knob } from "./knob"
import { cn } from "@/lib/utils"
import type { TeamMix, TeamMixes } from "@/lib/music/team-mixer"
import { filterDialLabel } from "@/lib/music/team-mixer"

interface MixerWidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  teamMixes: TeamMixes
  topColor: 'w' | 'b'
  onTeamMixChange: (color: 'w' | 'b', patch: Partial<TeamMix>) => void
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  isOn: boolean
  onToggle: () => void
}

export const MixerWidget = forwardRef<HTMLDivElement, MixerWidgetProps>(({
  teamMixes, topColor, onTeamMixChange, cityColor, position, onPositionChange,
  handleRef, toggleRef, isOn, onToggle, ...props
}, ref) => {
  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef
  const borderColor = isOn ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"

  return <Draggable
    data-widget="mixer"
    ref={ref}
    position={position}
    onDrag={onPositionChange}
    handleRef={effectiveHandleRef}
    dragFromBackground
    className={cn("pointer-events-auto", props.className)}
    style={{ ...props.style, zIndex: undefined }}
    {...props}
  >
    <div className={cn("absolute inset-0 z-50 rounded-md border backdrop-blur-md transition-all duration-300", isOn ? "bg-black/80" : "bg-black/60 opacity-60")}
      style={{ borderColor, boxShadow: isOn ? `0 0 20px ${cityColor}40` : "none" }} />
    <button ref={toggleRef} type="button" aria-label={isOn ? "Desligar Mixer" : "Ligar Mixer"}
      className={cn("absolute z-70 -left-2 -top-1 w-8 h-8 flex items-center justify-center rounded-full bg-background border shadow-md cursor-pointer transition-colors hover:text-[#60a5fa]", isOn ? "text-[var(--city-neon)]" : "text-white")}
      style={{ borderColor, "--city-neon": cityColor } as React.CSSProperties}
      onClick={event => { event.stopPropagation(); onToggle() }}>
      <Power className="w-4 h-4" />
    </button>
    <div ref={effectiveHandleRef} className="absolute inset-x-0 top-0 h-8 z-60" />
    <div className={cn("relative z-50 w-[340px] max-w-full px-2.5 py-2.5", !isOn && "opacity-50 grayscale")}
      style={{ "--city-neon": cityColor } as React.CSSProperties}>
      <div className="h-4 text-center text-xs font-mono font-bold tracking-wider text-white">MIXER</div>
      <fieldset disabled={!isOn} aria-label="Mixer por equipe" className="mt-3 grid gap-3">
        {([topColor, topColor === 'w' ? 'b' : 'w'] as const).map((color, index) => <Fragment key={color}>
          {index === 1 && <div className="flex items-center justify-center gap-2 py-0.5 text-[10px] font-mono font-bold tracking-wide text-white/70">
            <span>BRANCAS</span><span>·</span><span>PRETAS</span>
          </div>}
          <div className="grid gap-1">
            <div className="grid grid-cols-5 gap-1">
              <Knob label="Gain" value={teamMixes[color].gain} min={0} max={1.5} onChange={gain => onTeamMixChange(color, { gain })} neon={isOn} />
              {(['highs', 'mids', 'bass'] as const).map((band, i) => <Knob key={band} label={['Hi', 'Mid', 'Low'][i]} value={teamMixes[color][band]} min={-12} max={12} onChange={value => onTeamMixChange(color, { [band]: value })} neon={isOn} />)}
              <Knob label="LPF/HPF" value={teamMixes[color].filter} min={-1} max={1} step={.01} formatValue={filterDialLabel} onChange={filter => onTeamMixChange(color, { filter })} neon={isOn} />
            </div>
          </div>
        </Fragment>)}
      </fieldset>
    </div>
    {!isOn && <div className="absolute inset-0 z-[65] touch-none" aria-hidden="true" />}
  </Draggable>
})

MixerWidget.displayName = "MixerWidget"
