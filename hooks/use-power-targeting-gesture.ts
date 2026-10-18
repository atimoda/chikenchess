"use client"

import { useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import type { Square } from 'chess.js'
import type { MatchPowerKind } from '@/lib/chess-powers'

interface Options {
  armedPower: MatchPowerKind | null
  enabled: boolean
  boardRef: RefObject<HTMLDivElement | null>
  onArm: (kind: MatchPowerKind | null) => void
  canArm: () => boolean
  onBegin: () => void
  onTarget: (square: Square, kind: MatchPowerKind) => void
  onHover: (kind: MatchPowerKind) => void
}

type Gesture = {
  pointerId: number
  kind: MatchPowerKind
  origin: 'button' | 'board'
  previous: MatchPowerKind | null
  x: number
  y: number
  dragged: boolean
  buttonBounds?: { left: number; right: number; top: number; bottom: number }
}

/** Pointer motion updates only the cursor and frost layers, never the chess/audio snapshot. */
export function usePowerTargetingGesture(options: Options) {
  const latest = useRef(options)
  latest.current = options
  const armed = useRef(options.armedPower)
  armed.current = options.armedPower
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const cursorPoint = useRef<{ x: number; y: number; visible: boolean } | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const completedPress = useRef<{ kind: MatchPowerKind } | null>(null)
  const preview = useRef<{ square: Square; layer: HTMLElement; kind: MatchPowerKind } | null>(null)

  const syncTargetCursor = () => {
    if (armed.current) document.documentElement.dataset.powerTargetingCursor = gesture.current?.origin === 'board' ? 'grabbing' : 'grab'
    else delete document.documentElement.dataset.powerTargetingCursor
  }

  const moveCursor = (x: number, y: number, visible: boolean) => {
    cursorPoint.current = { x, y, visible }
    if (!cursorRef.current) return
    cursorRef.current.style.transform = `translate3d(${x - 10}px, ${y - 10}px, 0) translate(-50%, -50%)`
    cursorRef.current.style.opacity = visible ? '1' : '0'
  }

  const leaveSquare = (fade = true) => {
    const current = preview.current
    if (!current) return
    current.layer.style.transition = fade && current.kind === 'freeze' ? 'opacity 2s ease-out' : 'none'
    current.layer.style.opacity = '0'
    preview.current = null
  }

  const squareAt = (x: number, y: number) => {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-square]')
    return cell && latest.current.boardRef.current?.contains(cell) ? cell : null
  }

  const updatePreview = (x: number, y: number) => {
    const kind = armed.current
    const cell = kind ? squareAt(x, y) : null
    const square = cell?.dataset.square as Square | undefined
    if (preview.current?.square === square && preview.current?.kind === kind) return
    leaveSquare()
    const layer = cell?.querySelector<HTMLElement>('[data-power-preview]')
    if (!kind || !square || !layer) return
    layer.style.transition = 'none'
    const existingEffect = kind === 'freeze'
      ? cell?.querySelector('[data-power-frost]')
      : cell?.querySelector('[data-power-shield]')
    layer.style.opacity = existingEffect ? '0' : '0.7'
    preview.current = { square, layer, kind }
    latest.current.onHover(kind)
  }

  const arm = (kind: MatchPowerKind | null) => {
    armed.current = kind
    syncTargetCursor()
    latest.current.onArm(kind)
    if (!kind) {
      leaveSquare()
      if (cursorRef.current) cursorRef.current.style.opacity = '0'
    }
  }

  const toggleButtonPower = (kind: MatchPowerKind, point: { x: number; y: number; visible: boolean } | null) => {
    if (!latest.current.enabled) return
    if (armed.current === kind) { arm(null); return }
    if (!latest.current.canArm()) { arm(null); return }
    latest.current.onBegin()
    if (point) moveCursor(point.x, point.y, point.visible)
    else cursorPoint.current = null
    arm(kind)
  }

  const cancel = () => {
    const current = gesture.current
    if (current?.origin === 'button') completedPress.current = { kind: current.kind }
    gesture.current = null
    arm(null)
  }

  useEffect(() => {
    if (!options.enabled) cancel()
    if (!options.armedPower) {
      if (gesture.current?.origin === 'board') gesture.current = null
      leaveSquare()
    } else if (cursorPoint.current) {
      const point = cursorPoint.current
      moveCursor(point.x, point.y, point.visible)
    }
    syncTargetCursor()
  }, [options.armedPower, options.enabled])

  useEffect(() => {
    const down = (event: globalThis.PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !armed.current || gesture.current || !latest.current.enabled) return
      if (!squareAt(event.clientX, event.clientY)) {
        const target = event.target
        const isPowerButton = target instanceof Element && target.closest('[data-match-power-action]')
        if (!isPowerButton) arm(null)
        return
      }
      gesture.current = { pointerId: event.pointerId, kind: armed.current, origin: 'board', previous: armed.current, x: event.clientX, y: event.clientY, dragged: false }
      syncTargetCursor()
      moveCursor(event.clientX, event.clientY, true)
      updatePreview(event.clientX, event.clientY)
    }
    const move = (event: globalThis.PointerEvent) => {
      if (!event.isPrimary) return
      const current = gesture.current
      if (current) {
        if (current.pointerId !== event.pointerId) return
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 5) current.dragged = true
        if (current.origin === 'button') return
      }
      if (!armed.current) return
      const visible = event.pointerType !== 'touch' || !!current
      moveCursor(event.clientX, event.clientY, visible)
      if (visible) updatePreview(event.clientX, event.clientY)
    }
    const up = (event: globalThis.PointerEvent) => {
      const current = gesture.current
      if (!current || current.pointerId !== event.pointerId) return
      if (current.origin === 'button' && current.buttonBounds) {
        const { left, right, top, bottom } = current.buttonBounds
        const releasedOnButton = event.clientX >= left && event.clientX <= right && event.clientY >= top && event.clientY <= bottom
        current.dragged ||= !releasedOnButton
      }
      current.dragged ||= Math.hypot(event.clientX - current.x, event.clientY - current.y) > 5
      gesture.current = null
      syncTargetCursor()
      if (current.origin === 'button') {
        completedPress.current = { kind: current.kind }
        if (current.dragged) {
          if (armed.current) arm(null)
        } else {
          toggleButtonPower(current.kind, {
            x: event.clientX,
            y: event.clientY,
            visible: event.pointerType !== 'touch',
          })
        }
        return
      }
      const cell = squareAt(event.clientX, event.clientY)
      leaveSquare(false)
      if (cell && latest.current.enabled && armed.current === current.kind) latest.current.onTarget(cell.dataset.square as Square, current.kind)
      else arm(null)
      moveCursor(event.clientX, event.clientY, event.pointerType !== 'touch' && !!armed.current)
      if (event.pointerType === 'touch') leaveSquare()
    }
    const pointerCancel = (event: globalThis.PointerEvent) => { if (gesture.current?.pointerId === event.pointerId) cancel() }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel() }
    const out = (event: globalThis.PointerEvent) => {
      if (event.relatedTarget) return
      leaveSquare()
      if (cursorRef.current) cursorRef.current.style.opacity = '0'
      if (gesture.current) cancel()
    }
    const hidden = () => { if (document.visibilityState !== 'visible') cancel() }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', pointerCancel)
    window.addEventListener('keydown', key)
    window.addEventListener('blur', cancel)
    document.addEventListener('pointerout', out)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', pointerCancel)
      window.removeEventListener('keydown', key)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('visibilitychange', hidden)
      leaveSquare(false)
      delete document.documentElement.dataset.powerTargetingCursor
    }
  }, [])

  const onButtonPointerDown = (kind: MatchPowerKind, event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || !latest.current.enabled) return
    completedPress.current = null
    const bounds = event.currentTarget.getBoundingClientRect()
    gesture.current = {
      pointerId: event.pointerId,
      kind,
      origin: 'button',
      previous: armed.current,
      x: event.clientX,
      y: event.clientY,
      dragged: false,
      buttonBounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
    }
  }

  const onButtonClick = (kind: MatchPowerKind, event: MouseEvent<HTMLButtonElement>) => {
    const completed = completedPress.current
    completedPress.current = null
    if (completed?.kind === kind && event.detail > 0) return
    toggleButtonPower(kind, null)
  }

  const onLostPointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (gesture.current?.pointerId === event.pointerId) cancel()
  }

  return { cursorRef, onButtonPointerDown, onButtonClick, onLostPointerCapture, cancel }
}
