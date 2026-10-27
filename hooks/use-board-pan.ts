"use client"

/* global PointerEvent */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react"

/** Same distance that turns a square tap into a drag, so a pan never also counts as a click. */
const PAN_THRESHOLD = 12
/** Part of the board that always stays inside the viewport. */
const VISIBLE_MARGIN = 96

export interface BoardPanOffset { x: number; y: number }

/**
 * Session-only board pan: dragging an empty square moves the board (and what follows it) with a
 * CSS `translate`, without touching its layout size. Escape, pointer cancel or window blur put the
 * board back where the gesture started; a viewport resize keeps it reachable.
 */
export function useBoardPan({ boardRef, enabled }: { boardRef: RefObject<HTMLElement | null>; enabled: boolean }) {
  const [offset, setOffset] = useState<BoardPanOffset>({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const offsetRef = useRef(offset)
  offsetRef.current = offset
  const gesture = useRef<{ pointerId: number; x: number; y: number; origin: BoardPanOffset; rect: DOMRect; moved: boolean } | null>(null)

  const clamp = useCallback((next: BoardPanOffset, rect: DOMRect, origin: BoardPanOffset) => {
    // `rect` was measured with `origin` applied; bound the board's own box to the viewport.
    const baseLeft = rect.left - origin.x, baseTop = rect.top - origin.y
    const minX = VISIBLE_MARGIN - rect.width - baseLeft, maxX = window.innerWidth - VISIBLE_MARGIN - baseLeft
    const minY = VISIBLE_MARGIN - rect.height - baseTop, maxY = window.innerHeight - VISIBLE_MARGIN - baseTop
    return { x: Math.round(Math.max(minX, Math.min(maxX, next.x))), y: Math.round(Math.max(minY, Math.min(maxY, next.y))) }
  }, [])

  const finish = useCallback((cancel: boolean) => {
    const current = gesture.current
    if (!current) return
    gesture.current = null
    if (cancel && current.moved) setOffset(current.origin)
    setPanning(false)
    document.body.style.userSelect = ""
  }, [])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = gesture.current
      if (!current || current.pointerId !== event.pointerId) return
      const dx = event.clientX - current.x, dy = event.clientY - current.y
      if (!current.moved) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD) return
        current.moved = true
        setPanning(true)
        document.body.style.userSelect = "none"
      }
      event.preventDefault()
      setOffset(clamp({ x: current.origin.x + dx, y: current.origin.y + dy }, current.rect, current.origin))
    }
    const up = (event: PointerEvent) => { if (event.pointerId === gesture.current?.pointerId) finish(false) }
    const cancel = (event: PointerEvent) => { if (event.pointerId === gesture.current?.pointerId) finish(true) }
    const blur = () => finish(true)
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && gesture.current?.moved) { event.preventDefault(); finish(true) } }
    const resize = () => {
      finish(true)
      const rect = boardRef.current?.getBoundingClientRect()
      if (rect) setOffset(current => {
        const next = clamp(current, rect, current)
        return next.x === current.x && next.y === current.y ? current : next
      })
    }
    window.addEventListener("pointermove", move, { passive: false })
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    window.addEventListener("blur", blur)
    window.addEventListener("keydown", key)
    window.addEventListener("resize", resize)
    return () => {
      gesture.current = null
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
      window.removeEventListener("blur", blur)
      window.removeEventListener("keydown", key)
      window.removeEventListener("resize", resize)
    }
  }, [boardRef, clamp, finish])

  useEffect(() => {
    if (enabled) return
    finish(true)
    setOffset(current => current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 })
  }, [enabled, finish])

  const startPan = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || !event.isPrimary || event.button !== 0 || gesture.current) return
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: offsetRef.current, rect, moved: false }
  }, [boardRef, enabled])

  return { offset, panning, startPan, enabled, translate: `${offset.x}px ${offset.y}px` }
}
