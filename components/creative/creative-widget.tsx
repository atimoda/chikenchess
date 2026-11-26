'use client'

/* global PointerEvent */

import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Power } from 'lucide-react'
import { Draggable } from '../ui/draggable'
import { useT } from '@/lib/i18n'
import styles from '../creative-studio.module.css'

export interface CreativeWidgetSize { width: number; height?: number }

interface CreativeWidgetProps {
  id: string
  title: string
  /** Shown after the title in normal case, such as the 32 voices' active count. */
  titleNote?: string
  on: boolean
  onToggle: () => void
  position: { x: number; y: number }
  onPositionChange: (position: { x: number; y: number }) => void
  size: CreativeWidgetSize
  onSizeChange: (size: CreativeWidgetSize) => void
  zIndex: number
  onFront: () => void
  cityColor: string
  /** Portrait phones stack the widgets under the board instead of floating them. */
  stacked: boolean
  widgetRef: RefObject<HTMLDivElement | null>
  info?: ReactNode
  children: ReactNode
}

const MIN_WIDTH = 240
const MIN_HEIGHT = 96

/**
 * Floating Creative panel, styled like the match widgets: drag from any non-control part, power button on
 * the corner, resize grip at the bottom right. Turning it off collapses it to its title bar.
 */
export function CreativeWidget({ id, title, titleNote, on, onToggle, position, onPositionChange, size, onSizeChange, zIndex, onFront, cityColor, stacked, widgetRef, info, children }: CreativeWidgetProps) {
  const t = useT()
  const headerRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const startResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget
    const start = { x: event.clientX, y: event.clientY, width: widgetRef.current?.offsetWidth ?? size.width, height: bodyRef.current?.offsetHeight ?? size.height ?? 200 }
    const pointerId = event.pointerId
    target.setPointerCapture(pointerId)
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      onSizeChange({
        width: Math.round(Math.max(MIN_WIDTH, Math.min(window.innerWidth - 16, start.width + moveEvent.clientX - start.x))),
        height: Math.round(Math.max(MIN_HEIGHT, start.height + moveEvent.clientY - start.y)),
      })
    }
    const end = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }

  const style: CSSProperties = stacked
    ? { position: 'static' }
    : { zIndex, width: on ? size.width : undefined, '--city-neon': cityColor } as CSSProperties
  return <Draggable
    ref={widgetRef}
    position={position}
    onDrag={next => onPositionChange({ x: Math.round(next.x), y: Math.max(0, Math.round(next.y)) })}
    handleRef={headerRef}
    dragFromBackground
    className={`${styles.studio} ${styles.widget}`}
    style={style}
    data-creative-widget={id}
    data-on={on || undefined}
    onMouseDown={onFront}
    onTouchStart={onFront}
  >
    <div ref={headerRef} className={styles.widgetHeader}>
      <button type="button" data-no-drag className={styles.widgetPower} aria-pressed={on} aria-label={on ? t('Turn off {title}', { title: t(title) }) : t('Turn on {title}', { title: t(title) })} title={on ? t('Turn off {title}', { title: t(title) }) : t('Turn on {title}', { title: t(title) })} onClick={event => { event.stopPropagation(); onToggle() }}><Power size={15} /></button>
      <span className={styles.widgetTitle}>{t(title)}{titleNote && <span className={styles.widgetTitleNote}> {titleNote}</span>}</span>
      {info && <span data-no-drag className={styles.widgetInfo}>{info}</span>}
    </div>
    {on && <div ref={bodyRef} className={styles.widgetBody} style={stacked ? undefined : size.height ? { height: size.height } : { maxHeight: `max(${MIN_HEIGHT}px, calc(100dvh - ${position.y + 56}px))` }}>
      {children}
    </div>}
    {on && !stacked && <span className={styles.widgetGrip} aria-hidden="true" onPointerDown={startResize} />}
  </Draggable>
}
