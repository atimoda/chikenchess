"use client"

import { forwardRef, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Power, Play, Pause } from "lucide-react"
import { Draggable } from "./ui/draggable"
import { Resizable } from "re-resizable"
import { Knob } from "./knob"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { TeamMix, TeamMixes } from "@/lib/music/team-mixer"
import { filterDialLabel, teamGainsForCrossfader, calculateCrossfaderPosition, TEAM_GAIN_MAX } from "@/lib/music/team-mixer"
import type { GlobalEffects } from "@/lib/types"
import type { MusicMonitor } from "@/lib/music/monitor"
import { SpectrogramCanvas } from "./spectrogram-widget"
import type { SpectrogramMode } from "@/hooks/use-spectrogram-mode"
import styles from "./mixer-widget.module.css"

interface MixerWidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  teamMixes: TeamMixes
  effects: GlobalEffects
  monitor: MusicMonitor
  onEffectChange: (effect: keyof GlobalEffects, value: number) => void
  topColor: 'w' | 'b'
  onTeamMixChange: (color: 'w' | 'b', patch: Partial<TeamMix>) => void
  cityColor: string
  sessionId: string
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  togglePortalized?: boolean
  isOn: boolean
  onToggle: () => void
  evalScore?: number | null
  evalMate?: number | null
  turn?: 'w' | 'b'
  crossfaderSync?: boolean
  isPlaying?: boolean
  onTogglePlay?: () => void
  spectrogramMode?: SpectrogramMode
  getTeamFrequencyData?: (color: 'w' | 'b', data: Uint8Array<ArrayBuffer>) => void
  getFrequencyData?: (data: Uint8Array<ArrayBuffer>) => void
}

type BpmHoverPreview = { x: number; y: number; percent: number }

function calculateBpmHoverPreview(wrapper: HTMLDivElement, x: number, y: number, baseBpm: number): BpmHoverPreview | null {
  const track = wrapper.querySelector<HTMLElement>('[data-slot="slider-track"]')
  if (!track) return null
  const trackBounds = track.getBoundingClientRect()
  if (!trackBounds.width) return null
  const ratio = Math.max(0, Math.min(1, (x - trackBounds.left) / trackBounds.width))
  const targetBpm = Math.round(30 + ratio * (240 - 30))
  const percent = ((targetBpm - baseBpm) / baseBpm) * 100
  const wrapperBounds = wrapper.getBoundingClientRect()
  return { x: x - wrapperBounds.left, y: y - wrapperBounds.top - 6, percent }
}

function GlobalPlaybackControls({ effects, monitor, onEffectChange, isOn, cityColor }: Pick<MixerWidgetProps, "effects" | "monitor" | "onEffectChange" | "isOn" | "cityColor">) {
  const panelStyle = { "--city-neon": cityColor } as React.CSSProperties
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const bpm = frame.transport?.bpm ?? effects.bpm
  const bpmHoverBaseRef = useRef(bpm)
  const bpmHoverWrapperRef = useRef<HTMLDivElement | null>(null)
  const bpmHoverPointerRef = useRef<{ x: number; y: number; onSlider: boolean } | null>(null)
  const bpmDragActiveRef = useRef(false)
  const bpmReleasePreviewRef = useRef(false)
  const pendingBpmRef = useRef(bpm)
  const bpmDragStartRef = useRef(bpm)
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
    pendingBpmRef.current = bpm
    bpmDragStartRef.current = bpm
    bpmHoverBaseRef.current = bpm
    setBpmDraft(bpm)
  }

  const finishBpmDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!bpmDragActiveRef.current) return
    bpmDragActiveRef.current = false
    const nextBpm = pendingBpmRef.current
    const changed = nextBpm !== bpmDragStartRef.current
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
    pendingBpmRef.current = bpm
    setBpmDraft(null)
    setBpmHoverPreview(null)
  }

  useEffect(() => {
    if (bpmReleasePreviewRef.current) {
      bpmReleasePreviewRef.current = false
      return
    }
    if (bpmDragActiveRef.current) return
    pendingBpmRef.current = bpm
    const wrapper = bpmHoverWrapperRef.current
    const pointer = bpmHoverPointerRef.current
    if (wrapper && pointer?.onSlider) {
      setBpmHoverPreview(calculateBpmHoverPreview(wrapper, pointer.x, pointer.y, bpmHoverBaseRef.current))
    } else bpmHoverBaseRef.current = bpm
  }, [bpm])

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
      onPointerEnter={event => { bpmHoverBaseRef.current = bpm; updateBpmHoverPreview(event) }}
      onPointerMove={updateBpmHoverPreview}
      onPointerLeave={() => { if (bpmDragActiveRef.current) return; bpmHoverWrapperRef.current = null; bpmHoverPointerRef.current = null; setBpmHoverPreview(null) }}
      onPointerDownCapture={beginBpmDrag}
      onPointerUp={finishBpmDrag}
      onPointerCancel={cancelBpmDrag}
    >
      <Slider
        aria-label="BPM"
        value={[bpmDraft ?? bpm]}
        min={30}
        max={240}
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
        <span className="pr-[5px] text-[10px] font-mono leading-none text-white/50">{(bpmDraft ?? bpm).toFixed(0)}</span>
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
  teamMixes, effects, monitor, onEffectChange, topColor, onTeamMixChange, cityColor, position, onPositionChange,
  sessionId, handleRef, toggleRef, togglePortalized = false, isOn, onToggle,
  evalScore, evalMate, turn, crossfaderSync = true,
  isPlaying = false, onTogglePlay, spectrogramMode = "crossfader", getTeamFrequencyData, getFrequencyData, ...props
}, ref) => {
  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef
  const initialPositionRef = useRef<{ x: number; y: number } | null>(null)
  const [compactLayout, setCompactLayout] = useState(true)
  const [crossfader, setCrossfader] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isThumbDragging, setIsThumbDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const thumbPointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const thumbMovedRef = useRef(false)
  const borderColor = isOn ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"
  const leftTeamColor = topColor
  const rightTeamColor = topColor === 'w' ? 'b' : 'w'

  const handleCrossfaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    setIsDragging(true)
    const onThumb = !!(event.target instanceof Element && event.target.closest('[data-slot="slider-thumb"]'))
    if (onThumb) {
      thumbPointerDownRef.current = { x: event.clientX, y: event.clientY, time: performance.now() }
      thumbMovedRef.current = false
    } else {
      thumbPointerDownRef.current = null
      thumbMovedRef.current = true
      setIsThumbDragging(true)
    }
  }

  const handleCrossfaderPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (thumbPointerDownRef.current && !thumbMovedRef.current) {
      const dist = Math.hypot(event.clientX - thumbPointerDownRef.current.x, event.clientY - thumbPointerDownRef.current.y)
      if (dist > 3) {
        thumbMovedRef.current = true
        setIsThumbDragging(true)
      }
    }
  }

  const handleCrossfaderPointerUp = () => {
    if (thumbPointerDownRef.current && !thumbMovedRef.current) {
      onTogglePlay?.()
    }
    thumbPointerDownRef.current = null
    thumbMovedRef.current = false
    isDraggingRef.current = false
    setIsDragging(false)
    setIsThumbDragging(false)
  }

  const handleCrossfaderPointerCancel = () => {
    thumbPointerDownRef.current = null
    thumbMovedRef.current = false
    isDraggingRef.current = false
    setIsDragging(false)
    setIsThumbDragging(false)
  }

  useEffect(() => {
    if (!isDragging) return
    const handleGlobalPointerUp = () => {
      thumbPointerDownRef.current = null
      thumbMovedRef.current = false
      isDraggingRef.current = false
      setIsDragging(false)
      setIsThumbDragging(false)
    }
    window.addEventListener('pointerup', handleGlobalPointerUp)
    window.addEventListener('pointercancel', handleGlobalPointerUp)
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp)
      window.removeEventListener('pointercancel', handleGlobalPointerUp)
    }
  }, [isDragging])

  const updateCrossfader = useCallback((pos: number) => {
    const gains = teamGainsForCrossfader(pos)
    setCrossfader(pos)
    onTeamMixChange(leftTeamColor, { gain: gains.left })
    onTeamMixChange(rightTeamColor, { gain: gains.right })
  }, [leftTeamColor, rightTeamColor, onTeamMixChange])

  useEffect(() => {
    if (!crossfaderSync) return
    if (turn === undefined) {
      updateCrossfader(0)
      return
    }
    const target = calculateCrossfaderPosition({
      score: evalScore ?? null,
      mate: evalMate ?? null,
      turn,
      topColor,
    })
    updateCrossfader(target)
  }, [sessionId, evalScore, evalMate, turn, topColor, updateCrossfader, crossfaderSync])

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
    <Resizable
      defaultSize={{ width: 180, height: 450 }}
      size={props.style?.position === 'static' ? { width: '100%', height: 450 } : undefined}
      minWidth={156}
      minHeight={420}
      enable={props.style?.position === 'static' ? false : { top: false, right: true, bottom: true, left: true, topRight: false, bottomRight: true, bottomLeft: true, topLeft: false }}
      handleStyles={{
        right: { zIndex: 80 },
        bottom: { zIndex: 80 },
        left: { zIndex: 80 },
        bottomRight: { zIndex: 80 },
        bottomLeft: { zIndex: 80 },
      }}
      className="relative"
      onResizeStart={event => {
        event.stopPropagation()
        initialPositionRef.current = position || { x: 0, y: 0 }
      }}
      onResize={(_event, direction, element, delta) => {
        setCompactLayout(current => {
          const next = element.offsetWidth < 292
          return current === next ? current : next
        })
        if (direction.includes("left") && initialPositionRef.current) {
          onPositionChange?.({
            x: initialPositionRef.current.x - delta.width,
            y: initialPositionRef.current.y,
          })
        }
      }}
    >
    <div className={cn("absolute inset-0 z-50 rounded-md border backdrop-blur-md transition-all duration-300", isOn ? "bg-black/80" : "bg-black/60 opacity-60")}
      style={{ borderColor, boxShadow: isOn ? `0 0 20px ${cityColor}40` : "none" }} />
    <button ref={toggleRef} type="button" aria-label={isOn ? "Desligar Mixer" : "Ligar Mixer"} aria-hidden={togglePortalized || undefined} tabIndex={togglePortalized ? -1 : 0}
      className={cn("absolute z-70 -left-2 -top-1 w-8 h-8 flex items-center justify-center rounded-full bg-background border shadow-md cursor-pointer transition-all hover:text-[#60a5fa]", togglePortalized && "invisible pointer-events-none", !isOn && "hover:drop-shadow-[0_0_8px_#60a5fa]", isOn ? "text-[var(--city-neon)]" : "text-white")}
      style={{ borderColor, backgroundColor: isOn ? undefined : "color-mix(in srgb, var(--background) 50%, transparent)", "--city-neon": cityColor } as React.CSSProperties}
      onClick={event => { event.stopPropagation(); onToggle() }}>
      <Power className="w-4 h-4" />
    </button>
    <div ref={effectiveHandleRef} className="absolute inset-x-0 top-0 h-8 z-60" />
    <div className={cn("relative z-50 w-full h-full min-h-0 overflow-hidden px-2.5 pt-2.5 pb-3", !isOn && "opacity-50 grayscale")}
      style={{ "--city-neon": cityColor } as React.CSSProperties}>
      <div className="h-4 text-center text-xs font-mono font-bold tracking-wider text-white">MIXER</div>
      <div className="mt-3">
        <GlobalPlaybackControls effects={effects} monitor={monitor} onEffectChange={onEffectChange} isOn={isOn} cityColor={cityColor} />
      </div>
      <fieldset disabled={!isOn} aria-label="Mixer por equipe" className={cn("mt-5 grid justify-center", compactLayout ? "grid-cols-[40px_40px_40px] gap-x-1" : "grid-cols-[40px_64px_40px] gap-x-5")}>
        {([topColor, topColor === 'w' ? 'b' : 'w'] as const).map((color, index) => <div key={color} className={index === 0 ? "col-start-1 row-start-1 flex flex-col items-center gap-1" : "col-start-3 row-start-1 flex flex-col items-center gap-1"}>
          <span className="h-3 text-[8px] font-mono text-muted-foreground">{color === 'b' ? 'BLACKS' : 'WHITES'}</span>
          <Knob label="LPF/HPF" ariaLabel="LPF/HPF" value={teamMixes[color].filter} min={-1} max={1} step={.01} formatValue={filterDialLabel} onChange={filter => onTeamMixChange(color, { filter })} neon={isOn} hideLabel />
          {(['highs', 'mids', 'bass'] as const).map((band, i) => <Knob key={band} label={['Hi', 'Mid', 'Low'][i]} ariaLabel={['Hi', 'Mid', 'Low'][i]} value={teamMixes[color][band]} min={-12} max={12} onChange={value => onTeamMixChange(color, { [band]: value })} neon={isOn} hideLabel />)}
          <Knob label="Gain" ariaLabel="Gain" value={teamMixes[color].gain} min={0} max={TEAM_GAIN_MAX} onChange={gain => onTeamMixChange(color, { gain })} neon={isOn} hideLabel />
        </div>)}
        <div aria-hidden="true" className={cn("col-start-2 row-start-1 flex flex-col items-center gap-1 font-mono text-muted-foreground", compactLayout ? "text-[8px]" : "text-[9px]")}>
          <span className="h-3" />
          {['LPF/HPF', 'HI', 'MID', 'LOW', 'GAIN'].map(label => <span key={label} className="flex h-10 w-full items-center justify-center whitespace-nowrap">{label}</span>)}
        </div>
      </fieldset>
      <fieldset disabled={!isOn} aria-label="Crossfader de equipe" className="mt-4 min-w-0 px-0.5">
        <legend className="sr-only">Crossfader de equipe</legend>
        <div className={cn("relative mx-auto mb-1 h-3 w-full font-mono font-bold tracking-wide text-muted-foreground", compactLayout ? "text-[8px]" : "text-[9px]")}>
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-foreground/70">CROSSFADER</span>
        </div>
        <div
          className={cn("relative mx-auto h-14 w-[calc(100%-20px)]", styles.crossfader, isDragging && styles.isDragging, isDragging && "is-dragging")}
          onDoubleClick={event => {
            if (event.target instanceof Element && event.target.closest('[data-slot="slider-thumb"]')) updateCrossfader(0)
          }}
          onPointerDownCapture={handleCrossfaderPointerDown}
          onPointerMoveCapture={handleCrossfaderPointerMove}
          onPointerUpCapture={handleCrossfaderPointerUp}
          onPointerCancelCapture={handleCrossfaderPointerCancel}
        >
          {spectrogramMode === "crossfader" && (
            <div className="pointer-events-none absolute inset-0 z-0 flex overflow-hidden rounded opacity-75">
              <div className="relative h-full w-1/2 overflow-hidden">
                <SpectrogramCanvas
                  cityColor={cityColor}
                  isOn={isOn}
                  isPlaying={!!isPlaying}
                  origin="center"
                  getFrequencyData={getTeamFrequencyData ? (data) => getTeamFrequencyData(leftTeamColor, data) : getFrequencyData}
                  className="h-full w-full"
                />
              </div>
              <div className="relative h-full w-1/2 overflow-hidden">
                <SpectrogramCanvas
                  cityColor={cityColor}
                  isOn={isOn}
                  isPlaying={!!isPlaying}
                  origin="center"
                  mirrored
                  getFrequencyData={getTeamFrequencyData ? (data) => getTeamFrequencyData(rightTeamColor, data) : getFrequencyData}
                  className="h-full w-full"
                />
              </div>
            </div>
          )}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex h-10 -translate-y-1/2 items-center justify-between">
            {Array.from({ length: 9 }, (_, index) => <span key={index} className={cn("w-px bg-white/35", index === 4 ? "h-9" : index % 2 === 0 ? "h-6" : "h-4")} />)}
          </div>
          <Slider
            aria-label="Crossfader"
            aria-valuetext={`${crossfader > 0 ? '+' : ''}${crossfader.toFixed(2)}`}
            disabled={!isOn}
            value={[crossfader]}
            min={-1}
            max={1}
            step={0.01}
            onValueChange={([value]) => {
              thumbMovedRef.current = true
              if (!isThumbDragging) setIsThumbDragging(true)
              updateCrossfader(Math.abs(value) < 0.04 ? 0 : value)
            }}
            thumbOffset={15}
            thumbChildren={
              !isThumbDragging && (
                isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white text-white translate-x-[0.5px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none" />
                )
              )
            }
            className="absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 py-2 [&_[data-slot=slider-track]]:cursor-ew-resize [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:hover:ring-0"
            style={{ "--city-neon": cityColor } as React.CSSProperties}
          />
        </div>
      </fieldset>
    </div>
    {!isOn && <div className={cn("absolute inset-0 z-[65]", props.style?.position === 'static' ? "touch-pan-y" : "touch-none")} aria-hidden="true" />}
    </Resizable>
  </Draggable>
})

MixerWidget.displayName = "MixerWidget"
