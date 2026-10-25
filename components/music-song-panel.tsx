'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Square } from 'chess.js'
import type { Arrangement } from '@/lib/music/arrangement'
import type { HarmonyPlanId } from '@/lib/music/harmony'
import type { MusicPiece } from '@/lib/music/model'
import type { MusicMonitor } from '@/lib/music/monitor'
import { cn } from '@/lib/utils'
import { MusicArrangementControls } from './music-arrangement-controls'
import { MusicPlaybackViewport, MusicVoiceBadge } from './music-playback'
import { MusicMiniRoll } from './music-piano-editor'
import { NoteParamsHostContext } from './music-note-params'
import styles from './music-playback.module.css'
import type { MusicSnapshot } from '@/lib/music/runtime'

export interface SongPanelHover { square: Square; anchor: HTMLElement }

// Note params live only in the full Piece Params; the list's editors drop them.
const ignoreNoteParams = () => {}

/** Opens and closes its content with an ease-in-out height change; the content
 * fades in whenever `mode` changes, so closed, compact and expanded all animate. */
function Reveal({ open, mode, children }: { open: boolean; mode: string; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)
  const [height, setHeight] = useState(0)
  const [animating, setAnimating] = useState(false)
  if (open && !mounted) setMounted(true)
  useEffect(() => {
    const element = inner.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new window.ResizeObserver(() => setHeight(element.offsetHeight))
    observer.observe(element)
    return () => observer.disconnect()
  }, [mounted])
  // Unmount after the closing transition so hidden rows keep no live strips.
  useEffect(() => {
    if (open) return
    const timer = window.setTimeout(() => setMounted(false), 320)
    return () => window.clearTimeout(timer)
  }, [open])
  if (!mounted) return null
  return <div className="transition-[height] duration-300 ease-in-out motion-reduce:transition-none"
    style={{ height: open ? height : 0, overflow: open && height > 0 && !animating ? 'visible' : 'hidden' }}
    onTransitionRun={event => { if (event.target === event.currentTarget) setAnimating(true) }}
    onTransitionEnd={event => { if (event.target === event.currentTarget) setAnimating(false) }}>
    <div ref={inner} className="flow-root">
      <div key={mode} className="animate-in fade-in duration-300 motion-reduce:animate-none">{children}</div>
    </div>
  </div>
}

/** The match's compact Global Sections bar, shared by the instrument list and
 * Piece Params (above the variation tabs). */
export function MusicSongSections({ arrangement, harmony, monitor, onChange, onSeek }: {
  arrangement: Arrangement
  harmony?: HarmonyPlanId
  monitor: MusicMonitor
  onChange?: (arrangement: Arrangement) => void
  onSeek: (sectionId: string) => void
}) {
  return <section aria-label="Global Sections" className="min-w-0">
    <MusicArrangementControls compact arrangement={arrangement} harmony={harmony ?? 'kit'} monitor={monitor} onChange={onChange} onSeek={onSeek} />
  </section>
}

/** Song & Instruments: the Piece Params list view. The Global Sections bar sits
 * on top; each row turns its piece on or off from the dot on the left. Active
 * pieces show a compact MIDI strip. Selecting a piece (here or on the board)
 * only highlights its row; a click on the name or on the strip expands its full
 * sequencer in place, turning the piece on if it was off (a second click on the
 * name collapses it); hovering a row plays its note and blinks its dot. A double
 * click or "Params" opens the full Piece Params. */
export function MusicSongPanel({ pieces, names, activeIds, soloIds, monitor, arrangement, harmony, onArrangementChange, onSeek, onSelect, onToggle, onSolo, canToggle, onHover, ownColor = 'w', onAudition, snapshot, selectedId = null, selectedView, showMidi = true, onOpenParams }: {
  pieces: readonly MusicPiece[]
  snapshot?: MusicSnapshot
  selectedId?: string | null
  /** The selected piece's full sequencer, tabs and actions, shown under its row. */
  selectedView?: ReactNode
  /** Compact MIDI strips for the active pieces. */
  showMidi?: boolean
  onOpenParams?: (square: Square) => void
  /** The player's team, listed first; the opponent's pieces follow in the same column. */
  ownColor?: 'w' | 'b'
  /** Plays the piece's note as a tap on the board would, when its row is hovered. */
  onAudition?: (square: Square) => void
  names: Readonly<Record<string, string | undefined>>
  activeIds: ReadonlySet<string>
  soloIds: ReadonlySet<string>
  monitor: MusicMonitor
  arrangement?: Arrangement
  harmony?: HarmonyPlanId
  onArrangementChange?: (arrangement: Arrangement) => void
  onSeek: (sectionId: string) => void
  /** Null deselects. */
  onSelect: (square: Square | null) => void
  onToggle: (square: Square) => void
  onSolo?: (id: string) => void
  canToggle?: (piece: MusicPiece) => boolean
  onHover?: (hover: SongPanelHover | null) => void
}) {
  const dots = useRef(new Map<string, HTMLButtonElement>())
  const hover = (piece: MusicPiece | null) => {
    const anchor = piece && dots.current.get(piece.id)
    onHover?.(piece && anchor ? { square: piece.square, anchor } : null)
  }
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // A different selection (from the board too) collapses the expanded row.
  const [lastSelectedId, setLastSelectedId] = useState(selectedId)
  if (lastSelectedId !== selectedId) {
    setLastSelectedId(selectedId)
    if (selectedId !== expandedId) setExpandedId(null)
  }
  // Each hover audition replays the blink on that piece's dot.
  const [blink, setBlink] = useState<{ id: string; sequence: number } | null>(null)
  const expand = (piece: MusicPiece) => { setExpandedId(piece.id); if (selectedId !== piece.id) onSelect(piece.square) }
  const teams = ownColor === 'w' ? ['w', 'b'] as const : ['b', 'w'] as const
  return <div className="flex min-w-0 flex-col gap-2">
    {arrangement && <MusicSongSections arrangement={arrangement} harmony={harmony} monitor={monitor} onChange={onArrangementChange} onSeek={onSeek} />}
    <section aria-label="Instruments" className="flex min-w-0 flex-col gap-2.5" onPointerLeave={() => hover(null)}>
      {teams.map(color => <div key={color} className="min-w-0">
        <h3 className="m-0 px-1 pb-1.5 font-mono text-[9px] uppercase leading-none tracking-[1px] text-[#96a79a]">{color === 'w' ? 'White' : 'Black'}</h3>
        {pieces.filter(piece => piece.color === color).sort((a, b) => a.origin.localeCompare(b.origin)).map(piece => {
          const active = activeIds.has(piece.id)
          const solo = soloIds.has(piece.id)
          const name = names[piece.id] ?? piece.id
          const toggleAllowed = canToggle?.(piece) ?? true
          const selected = selectedId === piece.id
          const instrument = snapshot?.instruments?.[piece.id]
          const expanded = selected && expandedId === piece.id && !!selectedView
          const compact = showMidi && active && !!snapshot && !!instrument
          return <div key={piece.id} className={cn('min-w-0 rounded border-b border-[#2e3b31] transition-colors', selected && 'bg-white/10')} data-selected={selected || undefined} data-expanded={expanded || undefined}>
          <div data-piece-row={piece.id} className={cn('flex min-w-0 items-stretch rounded', !selected && 'hover:bg-white/5')}
            onPointerEnter={event => { hover(piece); if (event.pointerType === 'mouse' && onAudition) { onAudition(piece.square); setBlink(b => ({ id: piece.id, sequence: (b?.sequence ?? 0) + 1 })) } }} onFocus={() => hover(piece)} onBlur={() => hover(null)}>
            <button type="button" ref={element => { if (element) dots.current.set(piece.id, element); else dots.current.delete(piece.id) }}
              className={cn('relative w-6 shrink-0 cursor-pointer bg-transparent p-0 text-[12px] leading-none disabled:cursor-not-allowed disabled:opacity-40', active ? 'text-[#c0e494]' : 'text-white/45 hover:text-white/80')}
              aria-label={`${active ? 'Deactivate' : 'Activate'} ${name} (${piece.square})`} aria-pressed={active} disabled={!toggleAllowed}
              title={toggleAllowed ? (active ? 'Turn off' : 'Turn on') : 'This piece cannot be changed now'}
              onClick={() => onToggle(piece.square)}><span aria-hidden="true">{active ? '●' : '○'}</span>
              {blink?.id === piece.id && <span key={blink.sequence} aria-hidden="true" className={styles.auditionBlink} onAnimationEnd={() => setBlink(b => b?.sequence === blink.sequence ? null : b)} />}</button>
            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 bg-transparent py-1.5 pr-1 text-left font-mono text-[10px] text-[#e0e9df]"
              aria-expanded={expanded} title={`${expanded ? 'Collapse' : 'Expand'} ${name} (${piece.square}) · double-click opens Piece Params`}
              // The second click of a double click is left to onDoubleClick.
              onClick={event => { if (event.detail >= 2) return; if (expanded) { setExpandedId(null); onSelect(null) } else { expand(piece); if (!active && toggleAllowed) onToggle(piece.square) } }}
              onDoubleClick={() => onOpenParams?.(piece.square)}>
              <span className="truncate">{name}</span><span className="shrink-0 scale-90"><MusicVoiceBadge monitor={monitor} id={piece.id} /></span>
            </button>
            {onOpenParams && <button type="button" className="shrink-0 cursor-pointer bg-transparent px-1 font-mono text-[10px] font-semibold leading-none text-[#849389] hover:text-white/80"
              aria-label={`Open Piece Params for ${name}`} title="Open Piece Params" onClick={() => onOpenParams(piece.square)}>Params</button>}
            {onSolo && <button type="button" className={cn('w-5 shrink-0 cursor-pointer bg-transparent p-0 font-mono text-[10px] font-semibold leading-none', solo ? 'text-white' : 'text-[#849389] hover:text-white/80')}
              aria-label={`${solo ? 'Disable' : 'Enable'} solo ${name}`} title="Solo" aria-pressed={solo} onClick={() => onSolo(piece.id)}>S</button>}
          </div>
          <Reveal open={expanded || compact} mode={expanded ? 'full' : 'compact'}>
            {expanded ? <div className="pb-2 pl-6 pr-1 pt-1"><NoteParamsHostContext.Provider value={ignoreNoteParams}><MusicPlaybackViewport visualUpdatesEnabled pieceParamsLayout>{selectedView}</MusicPlaybackViewport></NoteParamsHostContext.Provider></div>
              : snapshot && instrument && <button type="button" className="block w-full cursor-pointer bg-transparent pb-1.5 pl-6 pr-1 pt-0 text-left" aria-label={`Expand the MIDI of ${name}`} title="Expand the sequencer" onClick={() => expand(piece)}>
                <MusicMiniRoll snapshot={snapshot} id={piece.id} monitor={monitor} instrument={instrument}/></button>}
          </Reveal>
          </div>
        })}
      </div>)}
    </section>
  </div>
}
