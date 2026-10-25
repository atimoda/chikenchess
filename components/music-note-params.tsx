'use client'

import { createContext, useContext } from 'react'
import type { PianoNote } from '@/lib/music/piano-roll'
import { Knob, LARGE_KNOB_SIZE, type KnobUpdateMode } from './knob'

export interface NoteParamsSelection {
  note: PianoNote
  updateMode: KnobUpdateMode
  onChange: (patch: Partial<PianoNote>) => void
  onDeselect: () => void
}

// Piece Params hosts the selected note's knobs in its own knob panel. The piano
// editor publishes its selection here; without a host it draws them inline.
export const NoteParamsHostContext = createContext<((selection: NoteParamsSelection | null) => void) | null>(null)
export const useNoteParamsHost = () => useContext(NoteParamsHostContext)

function SlideRamp({ slide, seconds }: { slide: number; seconds: number }) {
  const end = { x: 8 + Math.max(.001, Math.min(2, seconds)) / 2 * 144, y: 24 - Math.max(-20, Math.min(20, slide / 24 * 20)) }
  return <div className="col-span-2 flex min-w-0 items-center self-start rounded border border-white/15 bg-[#111a15] px-1" style={{ height: LARGE_KNOB_SIZE }}>
    <svg className="block h-full w-full" style={{ height: '100%', background: 'transparent' }} viewBox="0 0 160 48" preserveAspectRatio="none" role="img" aria-label={`Slide: ${slide} semitones over ${seconds} seconds`}>
      <line x1="8" x2="152" y1="24" y2="24" stroke="#425544" vectorEffect="non-scaling-stroke"/>
      <path d={`M8 24 L${end.x} ${end.y}`} fill="none" stroke="#dfa67a" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg>
  </div>
}

/** Knob cells for a selected note, laid out for the five-column Piece Params grid.
 * The ramp spans the last two cells of the first row, right above SLIDE ST /
 * SLIDE SEC, which close the panel. */
export function NoteParamsKnobs({ note, onChange, updateMode = 'immediate', neon = true }: { note: PianoNote; onChange: (patch: Partial<PianoNote>) => void; updateMode?: KnobUpdateMode; neon?: boolean }) {
  const slide = note.slide ?? 0, seconds = note.slideSeconds ?? .5, pan = note.pan ?? .5
  return <>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="ACCENT" ariaLabel="Note accent" value={note.velocity} min={0} max={1} step={.01} updateMode={updateMode} formatValue={n => n.toFixed(2)} onChange={velocity => onChange({ velocity })} neon={neon}/>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="PAN" ariaLabel="Note pan" value={pan} min={0} max={1} step={.01} updateMode={updateMode} formatValue={n => n.toFixed(2)} onChange={pan => onChange({ pan })} neon={neon}/>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="CHANCE" ariaLabel="Note chance" value={note.chance ?? 1} min={0} max={1} step={.01} updateMode={updateMode} formatValue={n => `${Math.round(n * 100)}%`} onChange={chance => onChange({ chance: chance >= 1 ? undefined : chance })} neon={neon}/>
    <SlideRamp slide={slide} seconds={seconds}/>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="RATCHET" ariaLabel="Note ratchet" value={note.ratchet ?? 1} min={1} max={4} step={1} updateMode={updateMode} formatValue={n => `×${n}`} onChange={ratchet => onChange({ ratchet: ratchet <= 1 ? undefined : ratchet })} neon={neon}/>
    <div className="col-start-4"><Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="SLIDE ST" ariaLabel="Note slide" value={slide} min={-24} max={24} step={1} updateMode={updateMode} formatValue={n => `${n > 0 ? '+' : ''}${n} st`} onChange={slide => onChange({ slide })} neon={neon}/></div>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="SLIDE SEC" ariaLabel="Note slide time" value={seconds} min={.001} max={2} step={.001} updateMode={updateMode} formatValue={n => `${Number(n.toFixed(3))} s`} onChange={slideSeconds => onChange({ slideSeconds })} neon={neon}/>
  </>
}

/** Small "Piece params / Note params" title; clicking Piece params leaves note mode. */
export function KnobPanelTitle({ noteMode, onPieceParams }: { noteMode: boolean; onPieceParams?: () => void }) {
  const className = 'm-0 font-mono text-[9px] leading-none text-[#9eafa2]'
  return <h3 className={className}>
    {noteMode ? <button type="button" className="cursor-pointer bg-transparent p-0 font-mono text-[9px] leading-none text-[#9eafa2] underline-offset-2 hover:text-white hover:underline" title="Deselect the note and show Piece params" onClick={onPieceParams}>Piece params</button> : 'Piece params'}
    {noteMode && <span className="text-white"> / Note params</span>}
  </h3>
}

/** Inline Note params, used where no Piece Params panel hosts them (Creative). */
export function MusicNoteParams({ note, onChange, updateMode = 'immediate' }: { note: PianoNote; onChange: (patch: Partial<PianoNote>) => void; updateMode?: KnobUpdateMode }) {
  return <section className="mt-2.5 min-w-0" aria-label="Note params">
    <div className="font-mono text-[9px] leading-none text-[#9eafa2]">Note params</div>
    <div className="grid grid-cols-5 gap-x-2 gap-y-[13px] py-2">
      <NoteParamsKnobs note={note} onChange={onChange} updateMode={updateMode}/>
    </div>
  </section>
}
