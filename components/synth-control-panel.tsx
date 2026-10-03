"use client"

import type React from "react"
import { useCallback, useRef, useSyncExternalStore, forwardRef } from "react"
import { Knob } from "./knob"
import { RangeKnob } from "./range-knob"
import type { SquareEffects } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import type { Instrument, InstrumentPerformanceEdit } from '@/lib/music/model'
import { filterDialHertz, filterDialLabel, filterDialValue } from '@/lib/music/team-mixer'
import type { MusicMonitor, TrackFrame } from '@/lib/music/monitor'

const EMPTY_VOICE_VALUES: TrackFrame['values'] = {}

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
  togglePortalized?: boolean
  isOn: boolean
  onToggle: () => void
  isSolo?: boolean
  onSoloToggle?: () => void
  playback?: React.ReactNode
  instrument?: Instrument | null
  onInstrumentChange?: (patch: InstrumentPerformanceEdit) => void
  pieceSvg?: string | null
  selectedStatus?: React.ReactNode
  monitor?: MusicMonitor
  monitorId?: string
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
  togglePortalized = false,
  isOn,
  onToggle,
  isSolo = false,
  onSoloToggle,
  playback,
  instrument,
  onInstrumentChange,
  pieceSvg,
  selectedStatus,
  monitor,
  monitorId,
  ...props
}, ref) => {
  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef
  const pitchSlideEnabled = isOn && !!selectedSquare && !!instrument && !(instrument.source?.kind === 'sample' && !instrument.source.pitched)
  const subscribeMonitor = useCallback((listener: () => void) => monitor?.subscribe(listener) ?? (() => {}), [monitor])
  const readMonitorValues = useCallback(() => monitor && monitorId
    ? monitor.getSnapshot().tracks[monitorId]?.values ?? EMPTY_VOICE_VALUES
    : EMPTY_VOICE_VALUES, [monitor, monitorId])
  const monitorValues = useSyncExternalStore(subscribeMonitor, readMonitorValues, () => EMPTY_VOICE_VALUES)

  const widgetBorderColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : "rgba(255,255,255,0.3)"

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
            isOn ? "border bg-black/80 backdrop-blur-md opacity-100" : "border bg-black/60 backdrop-blur-sm opacity-60",
            "border-white/30",
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

      {/* Invisible Drag Handle Header - z-60 */}
      <div 
        ref={effectiveHandleRef}
        className="absolute inset-x-0 top-0 h-8 z-60"
      />

      {isOn && selectedSquare && instrument && onInstrumentChange && playback && <>
        {onSoloToggle && <button
          type="button"
          aria-label={isSolo ? 'Desativar Solo da peça' : 'Ativar Solo da peça'}
          title={isSolo ? 'Desativar Solo' : 'Ativar Solo'}
          aria-pressed={isSolo}
          className={cn(
            "absolute right-[35px] top-2 z-[70] flex h-[25px] w-[27px] items-center justify-center rounded border bg-[#111a15] font-mono text-[11px] font-bold transition-colors hover:border-white/60 hover:text-white",
            isSolo ? "border-white/70 text-white" : "border-white/25 text-white/60",
          )}
          onClick={event => {
            event.stopPropagation()
            onSoloToggle()
          }}
        >S</button>}
        <button
          type="button"
          aria-label={instrument.loopEnabled === false ? 'Ligar variações da peça' : 'Desligar variações da peça'}
          title={instrument.loopEnabled === false ? 'Ligar variações da peça' : 'Desligar variações da peça'}
          aria-pressed={instrument.loopEnabled === false}
          data-loop-enabled={instrument.loopEnabled !== false}
          className={cn(
            "absolute right-2 top-2 z-[70] flex h-[25px] w-[27px] items-center justify-center rounded border bg-[#111a15] text-white/60 transition-colors hover:border-white/60 hover:text-white",
            instrument.loopEnabled === false ? "border-red-400/70 text-red-300" : "border-white/25",
          )}
          onClick={event => {
            event.stopPropagation()
            onInstrumentChange({ loopEnabled: instrument.loopEnabled === false })
          }}
        ><Power className="h-3 w-3" /></button>
      </>}

      {/* Main Content - z-50 */}
      <div className={cn("relative z-50 px-2.5 py-2.5 max-w-full", props.style?.position === 'static' ? "w-full" : "w-[340px]", !isOn && "opacity-50 grayscale")} style={panelStyle}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 mb-1 px-2 pr-10 min-h-12 relative">
            {pieceSvg && selectedSquare ? <div className="w-11 h-11 shrink-0 rounded border border-white/20 bg-white/10 p-1" aria-hidden="true" dangerouslySetInnerHTML={{ __html: pieceSvg }} /> : <div className="w-11 h-11 shrink-0 rounded border border-white/10 bg-white/5" />}
            <div className="min-w-0">
              <h2 className={cn(
                "truncate text-sm font-mono font-bold transition-colors duration-300",
                "text-white"
              )}>{selectedSquare ? selectedPieceInfo ?? 'Instrumento' : 'Selecione uma peça'}</h2>
              {selectedSquare && <span className="flex items-center gap-1 text-[10px] font-mono text-white/50"><span>{selectedSquare}</span>{isOn&&selectedStatus&&<><span>·</span>{selectedStatus}</>}</span>}
            </div>
          </div>
          <div
            className={cn(
              "grid grid-cols-5 gap-x-2 gap-y-4 py-2",
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
              monitorValue={monitorValues.gain}
              updateMode="on-release"
              onChange={(v) => onEffectChange("gain", v)}
              neon={isOn}
            />
            {instrument && !(instrument.source?.kind === 'sample' && !instrument.source.pitched) ? <RangeKnob label="Range" showFrequency value={instrument.octaveRange ?? { first: instrument.octave, second: instrument.octave, frequency: 'note' }} min={0} max={7} step={1} formatValue={range => `${range.first}–${range.second}`} formatSingleValue={value => String(value)} updateMode="on-release" onChange={octaveRange => onInstrumentChange?.({ octaveRange })} neon={isOn && !!selectedSquare} /> : <Knob
              label="PITCH"
              value={effects.pitch}
              min={0.5}
              max={2}
              updateMode="on-release"
              onChange={(v) => onEffectChange("pitch", v)}
              neon={isOn}
            />}
            <Knob
              label="PAN"
              value={effects.pan}
              min={-1}
              max={1}
              monitorValue={monitorValues.pan === undefined ? undefined : monitorValues.pan * 2 - 1}
              updateMode="on-release"
              onChange={(v) => onEffectChange("pan", v)}
              neon={isOn}
            />
            <Knob
              label="DELAY"
              value={effects.delay}
              min={0}
              max={1}
              monitorValue={monitorValues.delay}
              updateMode="on-release"
              onChange={(v) => onEffectChange("delay", v)}
              neon={isOn}
            />
            
            {instrument ? <>
            <RangeKnob
              label="LPF"
              ariaLabel="Corte passa-baixas"
              showFrequency
              updateMode="on-release"
              value={{ ...instrument.lpfRange, first: instrument.lpfRange?.first ?? effects.lpf ?? instrument.lpf, second: instrument.lpfRange?.second ?? effects.lpf ?? instrument.lpf, frequency: instrument.lpfRange?.frequency ?? 'note' }}
              min={20}
              max={20000}
              step={10}
              formatValue={range => `${Math.round(range.first)}–${Math.round(range.second)}Hz`}
              formatSingleValue={value => `${Math.round(value)}Hz`}
              monitorValue={monitorValues.lpf}
              onChange={lpfRange => onInstrumentChange?.({ lpfRange })}
              neon={isOn && !!selectedSquare}
            />
            <Knob
              label="HPF"
              value={effects.hpf ?? instrument.hpf}
              min={0}
              max={20000}
              step={10}
              logarithmic
              updateMode="on-release"
              formatValue={value => `${Math.round(value)}Hz`}
              onChange={value => onEffectChange("hpf", value)}
              neon={isOn}
            />
            </> : <Knob
              label="LPF / HPF"
              value={filterDialValue(effects.lpf, effects.hpf)}
              min={-1}
              max={1}
              step={.01}
              formatValue={filterDialLabel}
              updateMode="on-release"
              monitorValue={monitorValues.lpf !== undefined && Number.isFinite(monitorValues.lpf) ? filterDialValue(monitorValues.lpf) : undefined}
              onChange={(value) => {
                onEffectChange("lpf", value < 0 ? filterDialHertz(value) : 20000)
                onEffectChange("hpf", value > 0 ? filterDialHertz(value) : 0)
              }}
              neon={isOn}
            />}
            <RangeKnob
              label="DRIVE"
              showFrequency
              updateMode="on-release"
              value={instrument?.driveRange ?? { first: instrument?.distortion ?? 0, second: instrument?.distortion ?? 0 }}
              min={0}
              max={10}
              step={.1}
              formatValue={range => `${Number(range.first.toFixed(1))}–${Number(range.second.toFixed(1))}`}
              formatSingleValue={value => Number(value.toFixed(1)).toString()}
              onChange={driveRange => onInstrumentChange?.({ driveRange })}
              neon={isOn && !!selectedSquare && !!instrument}
            />
            <RangeKnob
              label="REVERB"
              showFrequency
              updateMode="on-release"
              monitorValue={monitorValues.room}
              value={instrument?.reverbRange ?? { first: effects.reverb, second: effects.reverb }}
              min={0}
              max={1}
              step={.01}
              formatValue={range => `${Math.round(range.first * 100)}–${Math.round(range.second * 100)}%`}
              formatSingleValue={value => `${Math.round(value * 100)}%`}
              onChange={reverbRange => onInstrumentChange?.({ reverbRange })}
              neon={isOn && !!selectedSquare && !!instrument}
            />
            <Knob
              label="DECAY"
              value={effects.decay}
              min={0.01}
              max={2}
              updateMode="on-release"
              onChange={(v) => onEffectChange("decay", v)}
              neon={isOn}
            />
            {instrument && <>
              <Knob label="ATAQUE" value={instrument.attack} min={.001} max={2} step={.001} logarithmic updateMode="on-release" formatValue={v => `${v.toFixed(3)} s`} onChange={attack => onInstrumentChange?.({ attack })} neon={isOn && !!selectedSquare} />
              <Knob label="SUSTAIN" value={instrument.sustain ?? .55} min={0} max={1} updateMode="on-release" onChange={sustain => onInstrumentChange?.({ sustain })} neon={isOn && !!selectedSquare} />
              <Knob label="RELEASE" value={instrument.release} min={.01} max={2} logarithmic updateMode="on-release" formatValue={v => `${v.toFixed(2)} s`} onChange={release => onInstrumentChange?.({ release })} neon={isOn && !!selectedSquare} />
              <Knob label="Length" value={instrument.clip ?? .7} min={.05} max={1} updateMode="on-release" formatValue={v => `${Math.round(v * 100)}%`} onChange={clip => onInstrumentChange?.({ clip })} neon={isOn && !!selectedSquare} />
              <Knob label="SLIDE ST" ariaLabel="Slide de afinação" value={instrument.pitchEnvelope ?? 0} min={-24} max={24} step={1} updateMode="on-release" formatValue={v => `${v > 0 ? '+' : ''}${v.toFixed(0)} st`} onChange={pitchEnvelope => onInstrumentChange?.({ pitchEnvelope })} neon={pitchSlideEnabled} />
              <Knob label="SLIDE SEC" ariaLabel="Tempo do slide" value={instrument.pitchAttack ?? .15} min={.001} max={2} step={.01} logarithmic updateMode="on-release" formatValue={v => `${v.toFixed(2)} s`} onChange={pitchAttack => onInstrumentChange?.({ pitchAttack })} neon={pitchSlideEnabled} />
              <RangeKnob label="SWING" showFrequency updateMode="on-release" value={instrument.swingRange ?? { first: instrument.extraSwing ?? 0, second: instrument.extraSwing ?? 0, frequency: 'note' }} min={0} max={.5} step={.01} formatValue={range => `${Math.round(range.first * 100)}–${Math.round(range.second * 100)}%`} formatSingleValue={value => `${Math.round(value * 100)}%`} onChange={swingRange => onInstrumentChange?.({ swingRange })} neon={isOn && !!selectedSquare} />
              <Knob label="CHANCE" ariaLabel="Chance de tocar" value={instrument.playChance ?? 1} min={0} max={1} step={.01} updateMode="on-release" formatValue={value => `${Math.round(value * 100)}%`} onChange={playChance => onInstrumentChange?.({ playChance })} neon={isOn && !!selectedSquare} />
            </>}
          </div>
          <div className="min-h-[390px]">{playback}</div>
        </div>
      </div>
      {!isOn && <div className={cn("absolute inset-0 z-[65]", props.style?.position === 'static' ? "touch-pan-y" : "touch-none")} aria-hidden="true" />}
    </Draggable>
  )
})

SynthControlPanel.displayName = "SynthControlPanel"
