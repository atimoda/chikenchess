"use client"

import type { PointerEvent } from 'react'
import type { BoardResizeCorner } from '@/hooks/use-board-resize'
import styles from './board-resize-handles.module.css'

const corners: BoardResizeCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const labels = { 'top-left': 'superior esquerdo', 'top-right': 'superior direito', 'bottom-left': 'inferior esquerdo', 'bottom-right': 'inferior direito' }

const targets = {
  board: { name: 'tabuleiro', title: 'Arraste para redimensionar o tabuleiro' },
  cards: { name: 'cartas', title: 'Arraste para redimensionar as cartas' },
}

export function BoardResizeHandles({ enabled, onStart, onResizeBy, onCancel, target = 'board' }: {
  enabled: boolean
  /** The square board, or the power-card hand that resizes on its own. */
  target?: keyof typeof targets
  onStart: (event: PointerEvent<HTMLButtonElement>, corner: BoardResizeCorner) => void
  onResizeBy: (delta: number) => void
  onCancel: () => void
}) {
  if (!enabled) return null
  return corners.map(corner => <button
    key={corner}
    type="button"
    className={styles.handle}
    data-board-resize={corner}
    data-resize-target={target}
    aria-label={`Redimensionar ${targets[target].name} pelo canto ${labels[corner]}`}
    title={targets[target].title}
    onPointerDown={event => onStart(event, corner)}
    onMouseDown={event => { event.preventDefault(); event.stopPropagation() }}
    onClick={event => { event.preventDefault(); event.stopPropagation() }}
    onLostPointerCapture={onCancel}
    onKeyDown={event => {
      if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation()
        onResizeBy(event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 16 : -16)
      }
    }}
  ><span aria-hidden="true" /></button>)
}
