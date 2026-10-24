'use client'

import { memo } from 'react'
import type { Arrangement } from '@/lib/music/arrangement'
import type { HarmonyPlanId } from '@/lib/music/harmony'
import type { Instrument, MusicPiece } from '@/lib/music/model'
import type { MusicMonitor } from '@/lib/music/monitor'
import { cn } from '@/lib/utils'
import { MusicArrangementControls } from './music-arrangement-controls'
import { MusicVoiceBadge } from './music-playback'

export interface PieceHover { square: string; element: HTMLElement }

/** Piece Params without a selection: the global form and every voice on the board. */
export const MusicPieceOverview = memo(function MusicPieceOverview({ arrangement, harmony, monitor, onArrangementChange, onSeek, pieces, instruments, activeSquares, soloIds, onSelect, onToggle, onSolo, onHover, canEdit }: {
  arrangement: Arrangement
  harmony: HarmonyPlanId
  monitor: MusicMonitor
  onArrangementChange?: (arrangement: Arrangement) => void
  onSeek: (sectionId: string) => void
  pieces: readonly MusicPiece[]
  instruments?: Record<string, Instrument>
  activeSquares: ReadonlySet<string>
  soloIds: ReadonlySet<string>
  onSelect: (square: string) => void
  onToggle: (square: string) => void
  onSolo?: (id: string) => void
  onHover?: (hover: PieceHover | null) => void
  canEdit?: (id: string) => boolean
}) {
  return <div className="flex flex-col gap-2">
    <div data-no-drag><MusicArrangementControls compact arrangement={arrangement} harmony={harmony} monitor={monitor} onSeek={onSeek} onChange={onArrangementChange} /></div>
    <div className="flex flex-col gap-3" onPointerLeave={() => onHover?.(null)}>
      {(['w', 'b'] as const).map(color => {
        const team = pieces.filter(piece => piece.color === color).sort((a, b) => a.origin.localeCompare(b.origin))
        if (!team.length) return null
        return <div key={color} role="group" aria-label={color === 'w' ? 'White pieces' : 'Black pieces'}>
          <h3 className="px-2 pb-1.5 font-mono text-[10px] uppercase tracking-[1px] text-white/45">{color === 'w' ? 'White' : 'Black'}</h3>
          {team.map(piece => {
            const active = activeSquares.has(piece.square)
            const solo = soloIds.has(piece.id)
            const editable = canEdit?.(piece.id) !== false
            const name = instruments?.[piece.id]?.name ?? piece.id
            return <div key={piece.id} className="flex items-stretch rounded border-b border-white/10 hover:bg-white/5"
              onPointerEnter={event => {
                const dot = event.currentTarget.querySelector<HTMLElement>('[data-piece-dot]')
                if (dot) onHover?.({ square: piece.square, element: dot })
              }}>
              <button type="button" data-piece-dot className={cn('w-7 shrink-0 text-[13px] leading-none disabled:cursor-default disabled:opacity-40', active ? 'text-[var(--city-neon)]' : 'text-white/45 hover:text-white')}
                aria-label={(active ? 'Deactivate ' : 'Activate ') + name} aria-pressed={active} disabled={!editable}
                onClick={event => { event.stopPropagation(); onToggle(piece.square) }}><span aria-hidden="true">{active ? '●' : '○'}</span></button>
              <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left font-mono text-[11px] text-white/85 hover:text-white"
                aria-label={'Select ' + name} onClick={event => { event.stopPropagation(); onSelect(piece.square) }}>
                <span className="truncate">{name}</span><MusicVoiceBadge monitor={monitor} id={piece.id} />
              </button>
              {onSolo && <button type="button" className={cn('w-7 shrink-0 font-mono text-[10px] font-semibold disabled:cursor-default disabled:opacity-40', solo ? 'text-white' : 'text-white/45 hover:text-white')}
                aria-label={(solo ? 'Disable' : 'Enable') + ' solo ' + name} title="Solo" aria-pressed={solo} disabled={!editable}
                onClick={event => { event.stopPropagation(); onSolo(piece.id) }}>S</button>}
            </div>
          })}
        </div>
      })}
    </div>
  </div>
})
