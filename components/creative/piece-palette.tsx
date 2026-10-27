'use client'

/* global PointerEvent */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PiecesSVG } from '../chessground-board'
import { cn, stableHtml } from '@/lib/utils'
import styles from '../creative-studio.module.css'

export interface PalettePiece { id: string; type: string; name: string }

interface PiecePaletteProps {
  color: 'w' | 'b'
  pieces: readonly PalettePiece[]
  /** "end" keeps the row flush right, like the opponent's captures above a match board. */
  justify: 'start' | 'end'
  disabled?: boolean
  onPress?: (id: string) => void
  onDragOver?: (id: string, clientX: number, clientY: number) => void
  /** Release point; the parent turns it into a square, or ignores it off the board. */
  onDrop: (id: string, clientX: number, clientY: number) => void
  onCancel?: () => void
}

const DRAG_THRESHOLD = 4

/**
 * One fixed piece per kit instrument, in the slot of a match's captured pieces. Dragging one onto
 * the board places that instrument there; the palette itself never changes.
 */
export function PiecePalette({ color, pieces, justify, disabled, onPress, onDragOver, onDrop, onCancel }: PiecePaletteProps) {
  const [ghost, setGhost] = useState<{ id: string; type: string; x: number; y: number } | null>(null)
  const gesture = useRef<{ id: string; type: string; pointerId: number; x: number; y: number; moved: boolean } | null>(null)
  const handlers = useRef({ onDragOver, onDrop, onCancel })
  handlers.current = { onDragOver, onDrop, onCancel }

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = gesture.current
      if (!current || current.pointerId !== event.pointerId) return
      if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_THRESHOLD) return
      current.moved = true
      event.preventDefault()
      setGhost({ id: current.id, type: current.type, x: event.clientX, y: event.clientY })
      handlers.current.onDragOver?.(current.id, event.clientX, event.clientY)
    }
    const up = (event: PointerEvent) => {
      const current = gesture.current
      if (!current || current.pointerId !== event.pointerId) return
      gesture.current = null
      setGhost(null)
      document.body.style.userSelect = ''
      if (current.moved) handlers.current.onDrop(current.id, event.clientX, event.clientY)
      else handlers.current.onCancel?.()
    }
    const cancel = (event: PointerEvent) => {
      if (gesture.current?.pointerId !== event.pointerId) return
      gesture.current = null
      setGhost(null)
      document.body.style.userSelect = ''
      handlers.current.onCancel?.()
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [])

  const svg = (type: string) => stableHtml(PiecesSVG[`${color}${type.toUpperCase()}` as keyof typeof PiecesSVG])
  return <div className={cn(styles.palette, justify === 'end' && styles.paletteEnd)} role="group" aria-label={`${color === 'w' ? 'White' : 'Black'} pieces to place`}>
    {pieces.map(piece => <button
      key={piece.id}
      type="button"
      className={cn(styles.palettePiece, color === 'b' && styles.paletteBlack)}
      data-palette-piece={piece.id}
      disabled={disabled}
      title={`${piece.name}: drag onto the board to place it`}
      aria-label={`Place ${piece.name}`}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0 || disabled) return
        event.preventDefault()
        gesture.current = { id: piece.id, type: piece.type, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        document.body.style.userSelect = 'none'
        onPress?.(piece.id)
      }}
      dangerouslySetInnerHTML={svg(piece.type)}
    />)}
    {ghost && createPortal(<div className={cn(styles.paletteGhost, color === 'b' && styles.paletteBlack)} style={{ transform: `translate(${ghost.x - 24}px, ${ghost.y - 24}px)` }} aria-hidden="true" dangerouslySetInnerHTML={svg(ghost.type)} />, document.body)}
  </div>
}
