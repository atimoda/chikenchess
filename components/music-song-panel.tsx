'use client'

import { useRef, type ReactNode } from 'react'
import type { Square } from 'chess.js'
import type { Arrangement } from '@/lib/music/arrangement'
import type { HarmonyPlanId } from '@/lib/music/harmony'
import type { MusicPiece } from '@/lib/music/model'
import type { MusicMonitor } from '@/lib/music/monitor'
import { cn } from '@/lib/utils'
import { MusicArrangementControls } from './music-arrangement-controls'
import { MusicPlaybackViewport, MusicVoiceBadge } from './music-playback'
import { MusicMiniRoll } from './music-piano-editor'
import type { MusicSnapshot } from '@/lib/music/runtime'

export interface SongPanelHover { square: Square; anchor: HTMLElement }

/** Song & Instruments: the Piece Params list view. The Global Sections bar sits
 * on top; each row turns its piece on or off from the dot on the left. Active
 * pieces show a compact MIDI strip; a click on the name selects (or deselects)
 * the piece and expands its full sequencer in place, and a double click or
 * "Params" opens the full Piece Params. */
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
  const teams = ownColor === 'w' ? ['w', 'b'] as const : ['b', 'w'] as const
  return <div className="flex min-w-0 flex-col gap-2">
    {arrangement && <section aria-label="Global Sections" className="min-w-0">
      <MusicArrangementControls compact arrangement={arrangement} harmony={harmony ?? 'kit'} monitor={monitor} onChange={onArrangementChange} onSeek={onSeek} />
    </section>}
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
          return <div key={piece.id} className="min-w-0 border-b border-[#2e3b31]" data-selected={selected || undefined}>
          <div data-piece-row={piece.id} className={cn('flex min-w-0 items-stretch rounded hover:bg-white/5', selected && 'bg-white/10')}
            onPointerEnter={event => { hover(piece); if (event.pointerType === 'mouse') onAudition?.(piece.square) }} onFocus={() => hover(piece)} onBlur={() => hover(null)}>
            <button type="button" ref={element => { if (element) dots.current.set(piece.id, element); else dots.current.delete(piece.id) }}
              className={cn('w-6 shrink-0 cursor-pointer bg-transparent p-0 text-[12px] leading-none disabled:cursor-not-allowed disabled:opacity-40', active ? 'text-[#c0e494]' : 'text-white/45 hover:text-white/80')}
              aria-label={`${active ? 'Deactivate' : 'Activate'} ${name} (${piece.square})`} aria-pressed={active} disabled={!toggleAllowed}
              title={toggleAllowed ? (active ? 'Turn off' : 'Turn on') : 'This piece cannot be changed now'}
              onClick={() => onToggle(piece.square)}><span aria-hidden="true">{active ? '●' : '○'}</span></button>
            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 bg-transparent py-1.5 pr-1 text-left font-mono text-[10px] text-[#e0e9df]"
              aria-pressed={selected} title={`${selected ? 'Deselect' : 'Select'} ${name} (${piece.square}) · double-click opens Piece Params`}
              // The second click of a double click is left to onDoubleClick.
              onClick={event => { if (event.detail < 2) onSelect(selected ? null : piece.square) }}
              onDoubleClick={() => onOpenParams?.(piece.square)}>
              <span className="truncate">{name}</span><span className="shrink-0 scale-90"><MusicVoiceBadge monitor={monitor} id={piece.id} /></span>
            </button>
            {onOpenParams && <button type="button" className="shrink-0 cursor-pointer bg-transparent px-1 font-mono text-[10px] font-semibold leading-none text-[#849389] hover:text-white/80"
              aria-label={`Open Piece Params for ${name}`} title="Open Piece Params" onClick={() => onOpenParams(piece.square)}>Params</button>}
            {onSolo && <button type="button" className={cn('w-5 shrink-0 cursor-pointer bg-transparent p-0 font-mono text-[10px] font-semibold leading-none', solo ? 'text-white' : 'text-[#849389] hover:text-white/80')}
              aria-label={`${solo ? 'Disable' : 'Enable'} solo ${name}`} title="Solo" aria-pressed={solo} onClick={() => onSolo(piece.id)}>S</button>}
          </div>
          {selected && selectedView ? <div className="pb-2 pt-1"><MusicPlaybackViewport visualUpdatesEnabled pieceParamsLayout>{selectedView}</MusicPlaybackViewport></div>
            : showMidi && active && snapshot && instrument && <div className="pb-1.5 pl-6 pr-1"><MusicMiniRoll snapshot={snapshot} id={piece.id} monitor={monitor} instrument={instrument}/></div>}
          </div>
        })}
      </div>)}
    </section>
  </div>
}
