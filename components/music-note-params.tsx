'use client'

import { createContext, useContext, useState } from 'react'
import type { PianoNote } from '@/lib/music/piano-roll'
import { Knob, LARGE_KNOB_SIZE, type KnobUpdateMode } from './knob'
import { useT } from '@/lib/i18n'

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

/** Slide graph: the pitch ramp from 0 to `slide` semitones over `seconds` (2 s at full width).
 * Shared by Note params and Piece params; spans two knob cells. */
export function SlideRamp({ slide, seconds, neon = true }: { slide: number; seconds: number; neon?: boolean }) {
  const t = useT()
  const end = { x: 8 + Math.max(.001, Math.min(2, seconds)) / 2 * 144, y: 24 - Math.max(-20, Math.min(20, slide / 24 * 20)) }
  return <div className="col-span-2 flex min-w-0 items-center self-start" style={{ height: LARGE_KNOB_SIZE, opacity: neon ? 1 : .4 }} data-slide-ramp>
    <svg className="block h-full w-full" style={{ height: '100%', background: 'transparent' }} viewBox="0 0 160 48" preserveAspectRatio="none" role="img" aria-label={t('Slide: {slide} semitones over {seconds} seconds', { slide, seconds })}>
      <line x1="8" x2="152" y1="24" y2="24" stroke="#425544" vectorEffect="non-scaling-stroke"/>
      <path d={`M8 24 L${end.x} ${end.y}`} fill="none" stroke="#dfa67a" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg>
  </div>
}

/** On/off cell sized like a knob, for switches inside the knob grids. */
export function ToggleCell({ label, ariaLabel, title, checked, onChange, neon = true, disabled = false }: { label: string; ariaLabel?: string; title?: string; checked: boolean; onChange: (checked: boolean) => void; neon?: boolean; disabled?: boolean }) {
  const t = useT()
  return <div className="flex min-w-0 flex-col items-center gap-1" style={{ opacity: neon && !disabled ? 1 : .4 }}>
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel ?? label} title={title} disabled={disabled} onClick={() => onChange(!checked)}
      className="flex items-center justify-center rounded-full border font-mono text-[9px] transition-colors"
      style={{ width: LARGE_KNOB_SIZE, height: LARGE_KNOB_SIZE, borderColor: checked ? '#b6ff3b' : '#425544', color: checked ? '#b6ff3b' : '#9eafa2', background: checked ? 'rgba(182,255,59,.12)' : 'transparent' }}>
      {checked ? t('ON') : t('OFF')}
    </button>
    <span className="font-mono text-[9px] leading-none text-[#9eafa2]">{label}</span>
  </div>
}

/** Knob cells for a selected note, laid out for the five-column Piece Params grid:
 * ACCENT, PAN, CHANCE, RATCHET, CUTOFF on the first row; SLIDE ST, SLIDE SEC, the
 * slide graph and VIB on the second. */
/** The piece's values a note inherits until it sets its own release, reverb, delay or drive. */
export interface NoteSoundBase { release: number; reverb: number; delay: number; drive: number }

export function NoteParamsKnobs({ note, onChange, updateMode = 'immediate', neon = true, base }: { note: PianoNote; onChange: (patch: Partial<PianoNote>) => void; updateMode?: KnobUpdateMode; neon?: boolean; base?: NoteSoundBase }) {
  const t = useT()
  const slide = note.slide ?? 0, seconds = note.slideSeconds ?? .5, pan = note.pan ?? .5
  // The graph follows the knobs while they are dragged, before the release commits.
  const [draft, setDraft] = useState<{ slide?: number | null; seconds?: number | null }>({})
  return <>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="ACCENT" ariaLabel={t('Note accent')} value={note.velocity} min={0} max={1} step={.01} updateMode={updateMode} formatValue={n => n.toFixed(2)} onChange={velocity => onChange({ velocity })} neon={neon}/>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="PAN" ariaLabel={t('Note pan')} value={pan} min={0} max={1} step={.01} updateMode={updateMode} formatValue={n => n.toFixed(2)} onChange={pan => onChange({ pan })} neon={neon}/>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="CHANCE" ariaLabel={t('Note chance')} value={note.chance ?? 1} min={0} max={1} step={.01} updateMode={updateMode} formatValue={n => `${Math.round(n * 100)}%`} onChange={chance => onChange({ chance: chance >= 1 ? undefined : chance })} neon={neon}/>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="RATCHET" ariaLabel={t('Note ratchet')} value={note.ratchet ?? 1} min={1} max={4} step={1} updateMode={updateMode} formatValue={n => `×${n}`} onChange={ratchet => onChange({ ratchet: ratchet <= 1 ? undefined : ratchet })} neon={neon}/>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="CUTOFF" ariaLabel={t('Note filter accent')} value={note.cutoff ?? 0} min={-.5} max={.5} step={.01} updateMode={updateMode} formatValue={n => `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`} onChange={cutoff => onChange({ cutoff: Math.abs(cutoff) < .005 ? undefined : cutoff })} neon={neon}/>
    <div className="col-start-1"><Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="SLIDE ST" ariaLabel={t('Note slide')} value={slide} min={-24} max={24} step={1} updateMode={updateMode} formatValue={n => `${n > 0 ? '+' : ''}${n} st`} onChange={slide => onChange({ slide })} onDraftChange={value => setDraft(d => ({ ...d, slide: value }))} neon={neon}/></div>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label="SLIDE SEC" ariaLabel={t('Note slide time')} value={seconds} min={.001} max={2} step={.001} updateMode={updateMode} formatValue={n => `${Number(n.toFixed(3))} s`} onChange={slideSeconds => onChange({ slideSeconds })} onDraftChange={value => setDraft(d => ({ ...d, seconds: value }))} neon={neon}/>
    <SlideRamp slide={draft.slide ?? slide} seconds={draft.seconds ?? seconds} neon={neon}/>
    <ToggleCell label="VIB" ariaLabel={t('Note vibrato')} title={t("Apply the piece's vibrato to this note (5.5 Hz, 0.3 st when the piece has none)")} checked={!!note.vibrato} onChange={vibrato => onChange({ vibrato: vibrato || undefined })} neon={neon}/>
    {base && <>
      <NoteSoundKnob field="release" label="RELEASE" ariaLabel={t('Note release')} note={note} base={base} min={.01} max={2} format={n => `${n.toFixed(2)} s`} onChange={onChange} updateMode={updateMode} neon={neon} first/>
      <NoteSoundKnob field="reverb" label="REVERB" ariaLabel={t('Note reverb')} note={note} base={base} min={0} max={1} format={n => `${Math.round(n * 100)}%`} onChange={onChange} updateMode={updateMode} neon={neon}/>
      <NoteSoundKnob field="delay" label="DELAY" ariaLabel={t('Note delay')} note={note} base={base} min={0} max={1} format={n => `${Math.round(n * 100)}%`} onChange={onChange} updateMode={updateMode} neon={neon}/>
      <NoteSoundKnob field="drive" label="DRIVE" ariaLabel={t('Note drive')} note={note} base={base} min={0} max={10} step={.1} format={n => n.toFixed(1)} onChange={onChange} updateMode={updateMode} neon={neon}/>
    </>}
  </>
}

/** A note field that shows the piece's value, faded, until the note sets its own; double click returns it to the piece's. */
function NoteSoundKnob({ field, label, ariaLabel, note, base, min, max, step = .01, format, onChange, updateMode, neon, first = false }: { field: keyof NoteSoundBase; label: string; ariaLabel: string; note: PianoNote; base: NoteSoundBase; min: number; max: number; step?: number; format: (value: number) => string; onChange: (patch: Partial<PianoNote>) => void; updateMode: KnobUpdateMode; neon: boolean; first?: boolean }) {
  const own = note[field], inherited = own === undefined
  return <div className={first ? 'col-start-1' : undefined} data-inherited={inherited || undefined} style={{ opacity: inherited ? .4 : 1 }} onDoubleClick={inherited ? undefined : () => onChange({ [field]: undefined })}>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label={label} ariaLabel={ariaLabel} value={own ?? base[field]} min={min} max={max} step={step} updateMode={updateMode} formatValue={format}
      onChange={value => { if (!inherited || Math.abs(value - base[field]) > step / 2) onChange({ [field]: value }) }} neon={neon}/>
  </div>
}

export type PieceParamsPage = 'tone' | 'fx'
/** Small "Piece params / Note params" title; clicking Piece params leaves note mode.
 * With `onPage`, TOM and FX/MOD tabs switch the piece's knob page. */
export function KnobPanelTitle({ noteMode, onPieceParams, page, onPage }: { noteMode: boolean; onPieceParams?: () => void; page?: PieceParamsPage; onPage?: (page: PieceParamsPage) => void }) {
  const t = useT()
  const className = 'm-0 flex items-center gap-2 font-mono text-[9px] leading-none text-[#9eafa2]'
  return <h3 className={className}>
    <span>{noteMode ? <button type="button" className="cursor-pointer bg-transparent p-0 font-mono text-[9px] leading-none text-[#9eafa2] underline-offset-2 hover:text-white hover:underline" title={t('Deselect the note and show Piece params')} onClick={onPieceParams}>{t('Piece params')}</button> : t('Piece params')}
    {noteMode && <span className="text-white"> / {t('Note params')}</span>}</span>
    {!noteMode && onPage && <span role="tablist" aria-label={t('Piece params page')} className="ml-auto flex gap-1">
      {([['tone', 'TOM'], ['fx', 'FX/MOD']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={page === id} onClick={() => onPage(id)}
        className="cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[9px] leading-none"
        style={{ borderColor: page === id ? '#b6dba1' : '#425544', color: page === id ? '#fff' : '#9eafa2', background: page === id ? 'rgba(182,219,161,.12)' : 'transparent' }}>{label}</button>)}
    </span>}
  </h3>
}

/** Inline Note params, used where no Piece Params panel hosts them (Creative). */
export function MusicNoteParams({ note, onChange, updateMode = 'immediate' }: { note: PianoNote; onChange: (patch: Partial<PianoNote>) => void; updateMode?: KnobUpdateMode }) {
  const t = useT()
  return <section className="mt-2.5 min-w-0" aria-label={t('Note params')}>
    <div className="font-mono text-[9px] leading-none text-[#9eafa2]">{t('Note params')}</div>
    <div className="grid grid-cols-5 gap-x-2 gap-y-[13px] py-2">
      <NoteParamsKnobs note={note} onChange={onChange} updateMode={updateMode}/>
    </div>
  </section>
}
