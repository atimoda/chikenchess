"use client"

import type { PointerEvent } from 'react'
import type { BoardResizeCorner } from '@/hooks/use-board-resize'
import styles from './board-resize-handles.module.css'
import { msg, useT } from '@/lib/i18n'

const corners: BoardResizeCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const labels = { 'top-left': msg('superior esquerdo'), 'top-right': msg('superior direito'), 'bottom-left': msg('inferior esquerdo'), 'bottom-right': msg('inferior direito') }

const targets = {
  board: { name: 'tabuleiro', title: msg('Arraste para redimensionar o tabuleiro') },
  cards: { name: 'cartas', title: msg('Arraste para redimensionar as cartas') },
}

export function BoardResizeHandles({ enabled, onStart, onResizeBy, onCancel, target = 'board' }: {
  enabled: boolean
  /** The square board, or the power-card hand that resizes on its own. */
  target?: keyof typeof targets
  onStart: (event: PointerEvent<HTMLButtonElement>, corner: BoardResizeCorner) => void
  onResizeBy: (delta: number) => void
  onCancel: () => void
}) {
  const t = useT()
  if (!enabled) return null
  return corners.map(corner => <button
    key={corner}
    type="button"
    className={styles.handle}
    data-board-resize={corner}
    data-resize-target={target}
    aria-label={target === 'board' ? t('Redimensionar tabuleiro pelo canto {corner}', { corner: t(labels[corner]) }) : t('Redimensionar cartas pelo canto {corner}', { corner: t(labels[corner]) })}
    title={t(targets[target].title)}
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
