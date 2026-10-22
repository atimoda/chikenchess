"use client"

/* global PointerEvent */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react"

export type BoardResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Power cards are 30% of the board width tall (hand at 80%, card at 25%, 2:3). Reserving 10% lets
 * a manual resize grow the board until only a third of the cards stays in view; the fixed rows
 * between board and cards fit inside the 100 px bottom margin used by `limits`.
 */
export const BOARD_CARDS_RESIZE_RATIO = 0.1

interface BoardResizeOptions {
  boardRef: RefObject<HTMLDivElement | null>
  enabled: boolean
  scale?: number
  constrainToParent?: boolean
  controlHeightRatio?: number
}

/** Session-only square sizing; the existing responsive width remains the default. */
export function useBoardResize({ boardRef, enabled, scale = 1, constrainToParent = false, controlHeightRatio = 0 }: BoardResizeOptions) {
  const [portraitPhone, setPortraitPhone] = useState(false)
  const resizeEnabled = enabled && !portraitPhone
  const [width, setWidth] = useState<number | null>(null)
  const [resizing, setResizing] = useState(false)
  const latest = useRef({ boardRef, enabled: resizeEnabled, scale, constrainToParent, controlHeightRatio, width })
  latest.current = { boardRef, enabled: resizeEnabled, scale, constrainToParent, controlHeightRatio, width }
  const gesture = useRef<{
    pointerId: number; x: number; y: number; size: number; previousWidth: number | null
    corner: BoardResizeCorner; target: HTMLButtonElement; min: number; max: number
  } | null>(null)

  const limits = useCallback(() => {
    const { boardRef, scale, constrainToParent, controlHeightRatio } = latest.current
    const board = boardRef.current
    const rect = board?.getBoundingClientRect()
    const parent = board?.parentElement
    const parentWidth = parent ? parent.clientWidth - parseFloat(window.getComputedStyle(parent).paddingLeft || '0') - parseFloat(window.getComputedStyle(parent).paddingRight || '0') : window.innerWidth - 32
    const availableHeight = constrainToParent ? window.innerHeight - 32 : window.innerHeight - (rect?.top ?? 0) - 100
    const max = Math.max(64, Math.min(window.innerWidth - 32, availableHeight / (1 + controlHeightRatio), constrainToParent ? parentWidth : Infinity) / scale)
    return { min: Math.min(240, max), max }
  }, [])

  const finish = useCallback((cancel: boolean) => {
    const current = gesture.current
    if (!current) return
    gesture.current = null
    if (cancel) setWidth(current.previousWidth)
    setResizing(false)
    if (current.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId)
  }, [])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = gesture.current
      if (!current || current.pointerId !== event.pointerId) return
      event.preventDefault()
      const sx = current.corner.endsWith('right') ? 1 : -1
      const sy = current.corner.startsWith('bottom') ? 1 : -1
      // The board stays horizontally centered; either diagonal controls its square size.
      const delta = (sx * (event.clientX - current.x) * 2 + sy * (event.clientY - current.y)) / 2 / latest.current.scale
      setWidth(Math.round(Math.max(current.min, Math.min(current.max, current.size + delta))))
    }
    const up = (event: PointerEvent) => { if (event.pointerId === gesture.current?.pointerId) finish(false) }
    const cancel = (event: PointerEvent) => { if (event.pointerId === gesture.current?.pointerId) finish(true) }
    const blur = () => finish(true)
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && gesture.current) { event.preventDefault(); finish(true) } }
    const resize = () => {
      const portrait = window.innerWidth <= 528 && window.innerHeight > window.innerWidth
      setPortraitPhone(portrait)
      finish(true)
      if (portrait || !latest.current.enabled) return
      const { min, max } = limits()
      setWidth(current => current === null ? null : Math.max(min, Math.min(max, current)))
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', blur)
    window.addEventListener('keydown', key)
    window.addEventListener('resize', resize)
    resize()
    return () => {
      const current = gesture.current
      gesture.current = null
      if (current?.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', blur)
      window.removeEventListener('keydown', key)
      window.removeEventListener('resize', resize)
    }
  }, [finish, limits])

  useEffect(() => {
    if (!resizeEnabled) { finish(true); return }
    const { min, max } = limits()
    setWidth(current => current === null ? null : Math.max(min, Math.min(max, current)))
  }, [resizeEnabled, controlHeightRatio, finish, limits])

  const startResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>, corner: BoardResizeCorner) => {
    if (!latest.current.enabled || !event.isPrimary || event.button !== 0 || gesture.current) return
    const rect = latest.current.boardRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    event.stopPropagation()
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, size: rect.width / latest.current.scale, previousWidth: latest.current.width, corner, target: event.currentTarget, ...limits() }
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizing(true)
  }, [limits])

  const resizeBy = useCallback((delta: number) => {
    if (!latest.current.enabled) return
    const rect = latest.current.boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const { min, max } = limits()
    setWidth(Math.round(Math.max(min, Math.min(max, rect.width / latest.current.scale + delta))))
  }, [limits])

  return { enabled: resizeEnabled, width: resizeEnabled ? width : null, resizing, startResize, resizeBy, cancelResize: () => finish(true) }
}
