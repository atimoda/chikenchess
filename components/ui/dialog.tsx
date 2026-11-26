'use client'

import type React from 'react'
import { useRef, useState } from 'react'
import * as Primitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import styles from './dialog.module.css'

export const Dialog = Primitive.Root
export const DialogTitle = Primitive.Title
export const DialogDescription = Primitive.Description
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 pr-6', className)} {...props} />
}
export function DialogContent({ children, className, closeLabel, mobileViewportScroll = false, floating = false, closeOnInteractOutside = false, onInteractOutside, ...props }: React.ComponentProps<typeof Primitive.Content> & { closeLabel?: string; mobileViewportScroll?: boolean; floating?: boolean; closeOnInteractOutside?: boolean }) {
  const t = useT()
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; left: number; right: number; top: number; bottom: number } | null>(null)
  const content = <Primitive.Content className={cn('fixed z-[130] grid w-[calc(100%-2rem)] max-w-lg gap-5 rounded-lg border p-6 shadow-lg', floating ? styles.floatingContent : mobileViewportScroll ? 'sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', !floating && mobileViewportScroll && styles.mobileContent, className)} {...props}
      style={floating ? { ...props.style, transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)` } : props.style}
      data-dragging={floating && dragging ? 'true' : undefined}
      onPointerDown={floating ? (event) => {
        props.onPointerDown?.(event)
        event.stopPropagation()
        if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return
        if (event.target.closest('button,a,input,textarea,select,option,summary,label,[role="button"],[role="tab"],[contenteditable="true"],[data-no-drag]')) return
        const rect = event.currentTarget.getBoundingClientRect()
        drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: dragOffset.x, offsetY: dragOffset.y, left: rect.left - dragOffset.x, right: rect.right - dragOffset.x, top: rect.top - dragOffset.y, bottom: rect.bottom - dragOffset.y }
        event.currentTarget.setPointerCapture(event.pointerId)
      } : props.onPointerDown}
      onPointerMove={floating ? (event) => {
        props.onPointerMove?.(event)
        event.stopPropagation()
        const activeDrag = drag.current
        if (!activeDrag || activeDrag.pointerId !== event.pointerId) return
        const nextX = activeDrag.offsetX + event.clientX - activeDrag.startX
        const nextY = activeDrag.offsetY + event.clientY - activeDrag.startY
        const minX = -activeDrag.left
        const maxX = window.innerWidth - activeDrag.right
        const minY = -activeDrag.top
        const maxY = window.innerHeight - activeDrag.bottom
        setDragOffset({ x: Math.max(minX, Math.min(maxX, nextX)), y: Math.max(minY, Math.min(maxY, nextY)) })
        setDragging(true)
      } : props.onPointerMove}
      onPointerUp={floating ? (event) => {
        props.onPointerUp?.(event)
        event.stopPropagation()
        if (drag.current?.pointerId !== event.pointerId) return
        drag.current = null
        setDragging(false)
      } : props.onPointerUp}
      onPointerCancel={floating ? (event) => {
        props.onPointerCancel?.(event)
        event.stopPropagation()
        if (drag.current?.pointerId !== event.pointerId) return
        drag.current = null
        setDragging(false)
      } : props.onPointerCancel}
      onLostPointerCapture={floating ? (event) => {
        props.onLostPointerCapture?.(event)
        event.stopPropagation()
        if (drag.current?.pointerId !== event.pointerId) return
        drag.current = null
        setDragging(false)
      } : props.onLostPointerCapture}
      onTouchStart={floating ? (event) => { props.onTouchStart?.(event); event.stopPropagation() } : props.onTouchStart}
      onTouchMove={floating ? (event) => { props.onTouchMove?.(event); event.stopPropagation() } : props.onTouchMove}
      onTouchEnd={floating ? (event) => { props.onTouchEnd?.(event); event.stopPropagation() } : props.onTouchEnd}
      onTouchCancel={floating ? (event) => { props.onTouchCancel?.(event); event.stopPropagation() } : props.onTouchCancel}
      onInteractOutside={floating ? (event) => {
        onInteractOutside?.(event)
        if (event.defaultPrevented) return
        if (!closeOnInteractOutside) {
          // Keep a nonmodal panel open while the background receives pointer/focus events.
          event.preventDefault()
        }
      } : onInteractOutside}>
      {children}
      <Primitive.Close className="absolute right-3 top-3 rounded p-1 text-white/70 hover:text-white focus-visible:outline-2" aria-label={closeLabel ?? t('Fechar parâmetros musicais')}><X className="h-4 w-4" /></Primitive.Close>
    </Primitive.Content>

  // Radix forwards DOM refs to each portal child; a Fragment ref is not an Element.
  if (floating) return <Primitive.Portal>
    <div className={styles.floatingViewport}>{content}</div>
  </Primitive.Portal>

  return <Primitive.Portal>
    <Primitive.Overlay className={cn('fixed inset-0 z-[120] bg-black/75', mobileViewportScroll && styles.mobileViewport)}>
      {mobileViewportScroll ? content : null}
    </Primitive.Overlay>
    {mobileViewportScroll ? null : content}
  </Primitive.Portal>
}
