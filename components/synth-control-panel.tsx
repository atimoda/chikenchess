"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, forwardRef } from "react"
import { Knob, LARGE_KNOB_SIZE } from "./knob"
import type { SquareEffects } from "@/lib/types"
import { cn, stableHtml } from "@/lib/utils"
import { Eye, EyeOff, LockKeyhole, Music, Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import { Resizable } from "re-resizable"
import { msg, useT } from "@/lib/i18n"
import { useWidgetResize } from "@/hooks/use-widget-resize"
import { MusicPlaybackViewport } from "./music-playback"
import { KnobPanelTitle, NoteParamsHostContext, type NoteParamsSelection } from "./music-note-params"
import type { DuckSource } from "./music-sound-design"
import { InstrumentParameters, paramsSection } from "./creative/instrument-parameters"
import { useParamsScope } from "@/hooks/use-params-scope"
import type { Arrangement } from "@/lib/music/arrangement"
import type { Instrument, InstrumentPerformanceEdit, MusicPiece } from '@/lib/music/model'
import { filterDialHertz, filterDialLabel, filterDialValue } from '@/lib/music/team-mixer'
import type { MusicMonitor, TrackFrame } from '@/lib/music/monitor'

const EMPTY_VOICE_VALUES: TrackFrame['values'] = {}
// Header height: below it the panel would hide its own title and controls.
const MIN_PANEL_HEIGHT = 80

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
  /** Deselects the piece, back to the Song & Instruments list. */
  onDeselect?: () => void
  playback?: React.ReactNode
  instrument?: Instrument | null
  onInstrumentChange?: (patch: InstrumentPerformanceEdit) => void
  pieceSvg?: string | null
  selectedStatus?: React.ReactNode
  monitor?: MusicMonitor
  monitorId?: string
  selectedPiece?: MusicPiece | null
  readOnly?: boolean
  readOnlyMessage?: string
  /** Song & Instruments view, shown while no piece is selected or `showSong` is set. */
  song?: React.ReactNode
  /** Keeps the Song & Instruments list with a piece selected (Piece Params closed). */
  showSong?: boolean
  /** Global Sections bar shown above the variation tabs in Piece Params. */
  sections?: React.ReactNode
  /** "midi" eye toggle for the list's MIDI strips. */
  songMidi?: { on: boolean; onToggle: () => void }
  /** Teammates offered as sidechain sources on the FX/MOD page. */
  duckSources?: readonly DuckSource[]
  /** Global form and the section picked in the Sections bar, for the Section scope. */
  arrangement?: Arrangement
  selectedSectionId?: string | null
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
  onDeselect,
  playback,
  instrument,
  onInstrumentChange,
  pieceSvg,
  selectedStatus,
  monitor,
  monitorId,
  selectedPiece,
  readOnly = false,
  readOnlyMessage = msg("Piece Params locked"),
  song,
  sections,
  showSong = false,
  songMidi,
  duckSources,
  arrangement,
  selectedSectionId,
  ...props
}, ref) => {
  const t = useT()
  const isStatic = props.style?.position === 'static'
  const resize = useWidgetResize({
    isStatic,
    left: false,
    position,
    onPositionChange,
    handleStyles: { bottom: { zIndex: 90, height: 10, bottom: 0, cursor: 'ns-resize' }, right: { zIndex: 90, width: 10, right: -5, cursor: 'ew-resize' }, bottomRight: { zIndex: 90, width: 16, height: 16, right: -6, bottom: -6, cursor: 'nwse-resize' } },
  })
  const contentViewportRef = useRef<HTMLDivElement>(null)
  const knobGridRef = useRef<HTMLDivElement>(null)
  const [midiVisualUpdatesEnabled, setMidiVisualUpdatesEnabled] = useState(true)
  // A note selected in the MIDI editor swaps the knob panel to its Note params.
  const [noteSelection, setNoteSelection] = useState<NoteParamsSelection | null>(null)
  const noteMode = !!noteSelection && !!playback
  const paramsSectionInfo = instrument ? paramsSection(arrangement, instrument, selectedSectionId) : null
  const params = useParamsScope(noteMode ? noteSelection : null, paramsSectionInfo?.id ?? null)
  // The section picked in the Sections bar opens the Section scope.
  const lastSection = useRef<string | null | undefined>(selectedSectionId)
  useEffect(() => { if (selectedSectionId && selectedSectionId !== lastSection.current) params.showSection(); lastSection.current = selectedSectionId }, [selectedSectionId, params])
  const songMode = !!song && (!selectedSquare || showSong)
  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef

  useEffect(() => {
    // The song list renders its own editors; only the Piece Params editor is watched here.
    if (isStatic || !isOn || songMode) {
      setMidiVisualUpdatesEnabled(true)
      return
    }
    const viewport = contentViewportRef.current
    if (!viewport || typeof IntersectionObserver === 'undefined') return

    setMidiVisualUpdatesEnabled(true)
    const editor = viewport.querySelector<HTMLElement>('[data-midi-visual-panel]')
    const observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) {
        const visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0
        if (entry.target === editor) setMidiVisualUpdatesEnabled(visible)
      }
    }, { root: viewport, threshold: 0 })
    if (editor) observer.observe(editor)
    return () => observer.disconnect()
  }, [isStatic, isOn, selectedSquare, selectedPiece?.id, instrument?.pianoRolls.length, playback !== undefined, songMode])

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
      <Resizable
        defaultSize={{ width: 340, height: '60vh' }}
        size={isStatic ? { width: '100%', height: 'auto' } : undefined}
        minWidth={isStatic ? '100%' : 340}
        maxWidth={isStatic ? '100%' : '92vw'}
        // Free resize: wider shows more knobs per row; the content scrolls inside when the panel is short.
        minHeight={isStatic ? 'auto' : MIN_PANEL_HEIGHT}
        maxHeight={isStatic ? undefined : '90vh'}
        {...resize}
        handleWrapperStyle={{ zIndex: 90 }}
        handleComponent={{ bottom: <div className="pointer-events-none absolute bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-white/35" />, right: <div data-no-drag="true" className="h-full w-full" />, bottomRight: <div data-no-drag="true" className="h-full w-full" />, top: <div data-no-drag="true" className="h-full w-full" />, topRight: <div data-no-drag="true" className="h-full w-full" /> }}
        className={cn('relative', isStatic && 'w-full')}
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
        aria-label={isOn ? t('Desligar Piece Params') : t('Ligar Piece Params')}
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

      {isOn && songMode && songMidi && <button
        type="button"
        aria-pressed={songMidi.on}
        aria-label={songMidi.on ? t('Hide the MIDI of the active pieces') : t('Show the MIDI of the active pieces')}
        title={songMidi.on ? t('Hide MIDI') : t('Show MIDI')}
        className={cn("absolute right-2 top-2 z-[70] flex h-[25px] cursor-pointer items-center gap-1 rounded border bg-[#111a15] px-1.5 font-mono text-[10px] transition-colors hover:border-white/60 hover:text-white", songMidi.on ? "border-white/40 text-white" : "border-white/20 text-white/50")}
        onClick={event => {
          event.stopPropagation()
          songMidi.onToggle()
        }}
      >{songMidi.on ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}{t('midi')}</button>}

      {isOn && selectedSquare && !songMode && onDeselect && <button
        type="button"
        aria-label={t('Back to Song & Instruments')}
        title={t('Back to the instrument list')}
        className="absolute right-2 top-2 z-[70] flex h-[25px] w-[27px] cursor-pointer items-center justify-center rounded border border-white/25 bg-[#111a15] text-white/70 transition-colors hover:border-white/60 hover:text-white"
        onClick={event => {
          event.stopPropagation()
          onDeselect()
        }}
      ><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" /></svg></button>}

      {/* Main Content - z-50 */}
      <div ref={contentViewportRef} inert={readOnly} aria-disabled={readOnly || undefined} className={cn("relative z-50 max-w-full px-2.5", isStatic ? "w-full max-h-none overflow-visible py-2.5" : "h-full w-full min-h-0 overflow-hidden pt-2.5 pb-0", !isOn && "opacity-50 grayscale")} style={panelStyle}>
        <div className={cn("flex flex-col gap-3", !isStatic && "scrollbar-hide h-full min-h-0 overflow-y-auto pb-2.5")}>
          <style jsx global>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <div className="flex items-center gap-3 mb-1 px-2 pr-10 min-h-12 relative">
            {pieceSvg && selectedSquare && !songMode ? <div className="w-11 h-11 shrink-0 rounded border border-white/20 bg-white/10 p-1" aria-hidden="true" dangerouslySetInnerHTML={stableHtml(pieceSvg)} /> : songMode ? <div className="flex w-11 h-11 shrink-0 items-center justify-center rounded border border-white/20 bg-white/10 text-white/80" aria-hidden="true"><Music className="h-6 w-6" /></div> : <div className="w-11 h-11 shrink-0 rounded border border-white/10 bg-white/5" />}
            <div className="min-w-0">
              <h2 className={cn(
                "truncate text-sm font-mono font-bold transition-colors duration-300",
                "text-white"
              )}>{songMode ? t('Song & Instruments') : selectedSquare ? selectedPieceInfo ?? t('Instrumento') : t('No piece selected')}</h2>
              {selectedSquare && !songMode && <span className="flex items-center gap-1 text-[10px] font-mono text-white/50"><span>{selectedSquare}</span>{isOn&&selectedStatus&&<><span>·</span>{selectedStatus}</>}</span>}
            </div>
          </div>
          {/* The tab strip already keeps 13 px of pin headroom above it. */}
          {isOn && sections && !songMode && <div className="-mb-3 flex-none">{sections}</div>}
          {playback && !songMode && <div className="flex flex-none flex-col">
            <NoteParamsHostContext.Provider value={setNoteSelection}>
              <MusicPlaybackViewport visualUpdatesEnabled={isStatic || midiVisualUpdatesEnabled} pieceParamsLayout={!isStatic}>
                {playback}
              </MusicPlaybackViewport>
            </NoteParamsHostContext.Provider>
          </div>}
          {songMode ? song : instrument ? <div className={cn("flex-none pb-2", (!selectedSquare && isOn) && "opacity-50 pointer-events-none grayscale", !isOn && "pointer-events-none")}>
            <InstrumentParameters variant="match" updateMode="on-release" instrument={instrument} effects={effects}
              updateInstrument={patch => onInstrumentChange?.(patch as InstrumentPerformanceEdit)}
              updateEffects={patch => { for (const [key, value] of Object.entries(patch)) if (value !== undefined) onEffectChange(key as keyof SquareEffects, value as number) }}
              duckSources={duckSources} tab={params.tab} onTab={params.setTab} scope={params.scope} onScope={params.setScope}
              section={paramsSectionInfo} noteSelection={noteMode ? noteSelection : null}
              monitorValues={{ gain: monitorValues.gain, pan: monitorValues.pan, delay: monitorValues.delay, lpf: monitorValues.lpf, room: monitorValues.room }} />
          </div> : <section aria-label={t('Piece params')} className="flex flex-none flex-col">
            <KnobPanelTitle noteMode={false} />
            {/* Without an instrument (no piece selected) only the square's effects are shown. */}
            <div ref={knobGridRef} className={cn("grid grid-cols-5 gap-x-2 gap-y-[13px] py-2", (!selectedSquare && isOn) && "opacity-50 pointer-events-none grayscale", !isOn && "pointer-events-none")}>
              <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="GAIN" value={effects.gain} min={0} max={2} monitorValue={monitorValues.gain} updateMode="on-release" onChange={v => onEffectChange("gain", v)} neon={isOn} />
              <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="PITCH" value={effects.pitch} min={0.5} max={2} updateMode="on-release" onChange={v => onEffectChange("pitch", v)} neon={isOn} />
              <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="PAN" value={effects.pan} min={-1} max={1} monitorValue={monitorValues.pan === undefined ? undefined : monitorValues.pan * 2 - 1} updateMode="on-release" onChange={v => onEffectChange("pan", v)} neon={isOn} />
              <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="DELAY" value={effects.delay} min={0} max={1} monitorValue={monitorValues.delay} updateMode="on-release" onChange={v => onEffectChange("delay", v)} neon={isOn} />
              <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="LPF / HPF" value={filterDialValue(effects.lpf, effects.hpf)} min={-1} max={1} step={.01} formatValue={filterDialLabel} updateMode="on-release"
                monitorValue={monitorValues.lpf !== undefined && Number.isFinite(monitorValues.lpf) ? filterDialValue(monitorValues.lpf) : undefined}
                onChange={value => { onEffectChange("lpf", value < 0 ? filterDialHertz(value) : 20000); onEffectChange("hpf", value > 0 ? filterDialHertz(value) : 0) }} neon={isOn} />
              <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="REVERB" value={effects.reverb} min={0} max={1} monitorValue={monitorValues.room} updateMode="on-release" onChange={v => onEffectChange("reverb", v)} neon={isOn} />
              <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="DECAY" value={effects.decay} min={0.01} max={2} updateMode="on-release" onChange={v => onEffectChange("decay", v)} neon={isOn} />
            </div>
          </section>}
        </div>
      </div>
      {isOn && readOnly && <div className={cn("absolute inset-0 z-[65] flex items-center justify-center rounded-md bg-black/35", isStatic ? "touch-pan-y" : "touch-none")}>
        <div className="pointer-events-none flex items-center gap-2 rounded-lg border border-white/20 bg-black/90 p-4 text-sm text-white">
          <LockKeyhole className="h-5 w-5" />{t(readOnlyMessage)}
        </div>
      </div>}
      {!isOn && <div className={cn("absolute inset-0 z-[65]", props.style?.position === 'static' ? "touch-pan-y" : "touch-none")} aria-hidden="true" />}
      </Resizable>
    </Draggable>
  )
})

SynthControlPanel.displayName = "SynthControlPanel"
