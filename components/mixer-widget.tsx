"use client"

import type React from "react"
import { Fragment, forwardRef, useEffect, useRef, useState } from "react"
import { Power } from "lucide-react"
import { Draggable } from "./ui/draggable"
import { Knob } from "./knob"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { TeamMix, TeamMixes } from "@/lib/music/team-mixer"
import { filterDialLabel } from "@/lib/music/team-mixer"
import type { GlobalEffects } from "@/lib/types"
import type { CreativeSession } from "@/lib/music/creative"
import type { HarmonyPlanId } from "@/lib/music/harmony"
import { BoardMusicSelectors } from "./board-music-selectors"

interface MixerWidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  teamMixes: TeamMixes
  effects: GlobalEffects
  onEffectChange: (effect: keyof GlobalEffects, value: number) => void
  topColor: 'w' | 'b'
  onTeamMixChange: (color: 'w' | 'b', patch: Partial<TeamMix>) => void
  tonality?: Pick<CreativeSession, "root" | "scale">
  onTonalityChange: (root: CreativeSession["root"], scale: CreativeSession["scale"]) => void
  harmony?: HarmonyPlanId
  onHarmonyChange: (harmony: HarmonyPlanId) => void
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  isOn: boolean
  onToggle: () => void
}

type BpmHoverPreview = { x: number; y: number; percent: number }

function calculateBpmHoverPreview(wrapper: HTMLDivElement, x: number, y: number, baseBpm: number): BpmHoverPreview | null {
  const track = wrapper.querySelector<HTMLElement>('[data-slot="slider-track"]')
  if (!track) return null
  const trackBounds = track.getBoundingClientRect()
  if (!trackBounds.width) return null
  const ratio = Math.max(0, Math.min(1, (x - trackBounds.left) / trackBounds.width))
  const targetBpm = Math.round(60 + ratio * (244 - 60))
  const percent = ((targetBpm - baseBpm) / baseBpm) * 100
  const wrapperBounds = wrapper.getBoundingClientRect()
  return { x: x - wrapperBounds.left, y: y - wrapperBounds.top - 6, percent }
}

function GlobalPlaybackControls({ effects, onEffectChange, isOn, cityColor }: Pick<MixerWidgetProps, "effects" | "onEffectChange" | "isOn" | "cityColor">) {
  const panelStyle = { "--city-neon": cityColor } as React.CSSProperties
  const bpmHoverBaseRef = useRef(effects.bpm)
  const bpmHoverWrapperRef = useRef<HTMLDivElement | null>(null)
  const bpmHoverPointerRef = useRef<{ x: number; y: number; onSlider: boolean } | null>(null)
  const bpmDragActiveRef = useRef(false)
  const bpmReleasePreviewRef = useRef(false)
  const pendingBpmRef = useRef(effects.bpm)
  const [bpmDraft, setBpmDraft] = useState<number | null>(null)
  const [bpmHoverPreview, setBpmHoverPreview] = useState<BpmHoverPreview | null>(null)

  const updateBpmHoverPreview = (event: React.PointerEvent<HTMLDivElement>) => {
    const wrapper = event.currentTarget
    bpmHoverWrapperRef.current = wrapper
    const onSlider = event.target instanceof Element && !!event.target.closest('[data-slot="slider"]')
    bpmHoverPointerRef.current = { x: event.clientX, y: event.clientY, onSlider }
    if (!onSlider && !bpmDragActiveRef.current) {
      setBpmHoverPreview(null)
      return
    }
    setBpmHoverPreview(calculateBpmHoverPreview(wrapper, event.clientX, event.clientY, bpmHoverBaseRef.current))
  }

  const beginBpmDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-slot="slider"]')) return
    bpmDragActiveRef.current = true
    bpmReleasePreviewRef.current = false
    pendingBpmRef.current = effects.bpm
    bpmHoverBaseRef.current = effects.bpm
    setBpmDraft(effects.bpm)
  }

  const finishBpmDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!bpmDragActiveRef.current) return
    bpmDragActiveRef.current = false
    const nextBpm = pendingBpmRef.current
    const changed = nextBpm !== effects.bpm
    const wrapper = event.currentTarget
    bpmHoverWrapperRef.current = wrapper
    bpmHoverPointerRef.current = { x: event.clientX, y: event.clientY, onSlider: true }
    setBpmDraft(null)
    if (changed) {
      setBpmHoverPreview(calculateBpmHoverPreview(wrapper, event.clientX, event.clientY, bpmHoverBaseRef.current))
      bpmReleasePreviewRef.current = true
      onEffectChange("bpm", nextBpm)
    }
  }

  const cancelBpmDrag = () => {
    if (!bpmDragActiveRef.current) return
    bpmDragActiveRef.current = false
    pendingBpmRef.current = effects.bpm
    setBpmDraft(null)
    setBpmHoverPreview(null)
  }

  useEffect(() => {
    bpmHoverBaseRef.current = effects.bpm
    pendingBpmRef.current = effects.bpm
    if (bpmReleasePreviewRef.current) {
      bpmReleasePreviewRef.current = false
      return
    }
    const wrapper = bpmHoverWrapperRef.current
    const pointer = bpmHoverPointerRef.current
    if (!bpmDragActiveRef.current && wrapper && pointer?.onSlider) {
      setBpmHoverPreview(calculateBpmHoverPreview(wrapper, pointer.x, pointer.y, effects.bpm))
    }
  }, [effects.bpm])

  return <fieldset disabled={!isOn} className="grid gap-2">
    <legend className="sr-only">Controles gerais de áudio</legend>
    <div className={cn("relative", !isOn && "pointer-events-none")}>
      <Slider
        aria-label="Volume geral"
        value={[effects.volume]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={([value]) => onEffectChange("volume", value)}
        className={cn("w-full py-[2px] [&_[data-slot=slider-track]]:h-[18px] [&_[data-slot=slider-range]]:bg-[var(--city-neon)] [&_[data-slot=slider-thumb]]:border-[var(--city-neon)]", !isOn && "[&_[data-slot=slider-range]]:opacity-50")}
        style={panelStyle}
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-[3px]">
        <span className="pl-[6px] text-[10px] font-mono leading-none text-black/[0.69]">VOLUME</span>
        <span className="pr-[5px] text-[10px] font-mono leading-none text-white/50">{(effects.volume * 100).toFixed(0)}%</span>
      </div>
    </div>
    <div
      className={cn("relative", !isOn && "pointer-events-none")}
      onPointerEnter={event => { bpmHoverBaseRef.current = effects.bpm; updateBpmHoverPreview(event) }}
      onPointerMove={updateBpmHoverPreview}
      onPointerLeave={() => { if (bpmDragActiveRef.current) return; bpmHoverWrapperRef.current = null; bpmHoverPointerRef.current = null; setBpmHoverPreview(null) }}
      onPointerDownCapture={beginBpmDrag}
      onPointerUp={finishBpmDrag}
      onPointerCancel={cancelBpmDrag}
    >
      <Slider
        aria-label="BPM"
        value={[bpmDraft ?? effects.bpm]}
        min={60}
        max={244}
        step={1}
        onValueChange={([value]) => {
          if (bpmDragActiveRef.current) {
            pendingBpmRef.current = value
            setBpmDraft(value)
          } else onEffectChange("bpm", value)
        }}
        className={cn("w-full py-[2px] [&_[data-slot=slider-track]]:h-[18px] [&_[data-slot=slider-range]]:bg-[var(--city-neon)] [&_[data-slot=slider-thumb]]:border-[var(--city-neon)]", !isOn && "[&_[data-slot=slider-range]]:opacity-50")}
        style={panelStyle}
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-[3px]">
        <span className="pl-[6px] text-[10px] font-mono leading-none text-black/[0.69]">BPM</span>
        <span className="pr-[5px] text-[10px] font-mono leading-none text-white/50">{(bpmDraft ?? effects.bpm).toFixed(0)}</span>
      </div>
      {bpmHoverPreview && isOn && <span
        aria-hidden="true"
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-white/20 bg-black/90 px-1.5 py-0.5 font-mono text-[9px] text-white shadow"
        style={{ left: bpmHoverPreview.x, top: bpmHoverPreview.y }}
      >{bpmHoverPreview.percent > 0 ? "+" : bpmHoverPreview.percent < 0 ? "−" : ""}{Math.abs(bpmHoverPreview.percent).toFixed(0)}%</span>}
    </div>
  </fieldset>
}

export const MixerWidget = forwardRef<HTMLDivElement, MixerWidgetProps>(({
  teamMixes, effects, onEffectChange, topColor, onTeamMixChange, tonality, onTonalityChange, harmony, onHarmonyChange, cityColor, position, onPositionChange,
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
      className={cn("absolute z-70 -left-2 -top-1 w-8 h-8 flex items-center justify-center rounded-full bg-background border shadow-md cursor-pointer transition-all hover:text-[#60a5fa]", !isOn && "hover:drop-shadow-[0_0_8px_#60a5fa]", isOn ? "text-[var(--city-neon)]" : "text-white")}
      style={{ borderColor, "--city-neon": cityColor } as React.CSSProperties}
      onClick={event => { event.stopPropagation(); onToggle() }}>
      <Power className="w-4 h-4" />
    </button>
    <div ref={effectiveHandleRef} className="absolute inset-x-0 top-0 h-8 z-60" />
    <div className={cn("relative z-50 w-[340px] max-w-full px-2.5 py-2.5", !isOn && "opacity-50 grayscale")}
      style={{ "--city-neon": cityColor } as React.CSSProperties}>
      <div className="h-4 text-center text-xs font-mono font-bold tracking-wider text-white">MIXER</div>
      <div className="mt-3">
        <GlobalPlaybackControls effects={effects} onEffectChange={onEffectChange} isOn={isOn} cityColor={cityColor} />
      </div>
      {tonality && harmony && <div className="mt-1.5">
        <BoardMusicSelectors
          cityColor={cityColor}
          tonality={tonality}
          onTonalityChange={onTonalityChange}
          harmony={harmony}
          onHarmonyChange={onHarmonyChange}
        />
      </div>}
      <fieldset disabled={!isOn} aria-label="Mixer por equipe" className="mt-3 grid gap-3">
        {([topColor, topColor === 'w' ? 'b' : 'w'] as const).map((color, index) => <Fragment key={color}>
          {index === 1 && <div className="py-0.5 text-center text-[10px] font-mono font-bold tracking-wide text-muted-foreground">
            {topColor === 'b' ? 'BLACKS / WHITES' : 'WHITES / BLACKS'}
          </div>}
          <div className="grid gap-1">
            <div className="grid grid-cols-5 gap-1">
              <Knob label="Gain" value={teamMixes[color].gain} min={0} max={1.5} onChange={gain => onTeamMixChange(color, { gain })} neon={isOn} labelPosition={index === 1 ? "bottom" : "top"} />
              {(['highs', 'mids', 'bass'] as const).map((band, i) => <Knob key={band} label={['Hi', 'Mid', 'Low'][i]} value={teamMixes[color][band]} min={-12} max={12} onChange={value => onTeamMixChange(color, { [band]: value })} neon={isOn} labelPosition={index === 1 ? "bottom" : "top"} />)}
              <Knob label="LPF/HPF" value={teamMixes[color].filter} min={-1} max={1} step={.01} formatValue={filterDialLabel} onChange={filter => onTeamMixChange(color, { filter })} neon={isOn} labelPosition={index === 1 ? "bottom" : "top"} />
            </div>
          </div>
        </Fragment>)}
      </fieldset>
    </div>
    {!isOn && <div className="absolute inset-0 z-[65] touch-none" aria-hidden="true" />}
  </Draggable>
})

MixerWidget.displayName = "MixerWidget"
