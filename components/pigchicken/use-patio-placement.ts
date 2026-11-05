"use client"

import { useCallback, useRef, useState, type ComponentProps } from 'react'
import type { LayoutElement } from '@/lib/pigchicken/layout'

type Drag = { pointer: number; x: number; y: number; el: LayoutElement; moving: boolean }

export type PatioPlacementHandlers = Pick<ComponentProps<'button'>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture' | 'onClick'>

function moveGhost(node: HTMLDivElement | null, drag: Drag) {
  if (node) node.style.transform = `translate3d(${drag.x}px,${drag.y}px,0)`
}

export function usePatioPlacement(place: (el: LayoutElement, x: number, y: number) => void) {
  const active = useRef<Drag | null>(null)
  const [ghost, setGhost] = useState<LayoutElement | null>(null)
  const ghostNode = useRef<HTMLDivElement>(null)
  const ghostRef = useCallback((node: HTMLDivElement | null) => {
    ghostNode.current = node
    if (active.current) moveGhost(node, active.current)
  }, [])
  const cancel = useCallback(() => {
    if (!active.current) return false
    active.current = null
    setGhost(null)
    return true
  }, [])
  const bind = (make: () => LayoutElement, tap?: () => void): PatioPlacementHandlers => ({
    onPointerDown(e) {
      if (e.button !== 0 || !e.isPrimary) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      active.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, el: make(), moving: false }
    },
    onPointerMove(e) {
      const drag = active.current
      if (!drag || drag.pointer !== e.pointerId) return
      if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return
      drag.x = e.clientX
      drag.y = e.clientY
      if (!drag.moving) {
        drag.moving = true
        setGhost(drag.el)
      }
      moveGhost(ghostNode.current, drag)
    },
    onPointerUp(e) {
      const drag = active.current
      if (!drag || drag.pointer !== e.pointerId) return
      const { clientX: x, clientY: y } = e
      const target = document.elementFromPoint(x, y)
      cancel()
      if (!drag.moving) { tap?.(); return }
      if (target && !target.closest('aside, header, [role="dialog"]')) place(drag.el, x, y)
    },
    onPointerCancel(e) {
      if (active.current?.pointer === e.pointerId) cancel()
    },
    onLostPointerCapture(e) {
      if (active.current?.pointer === e.pointerId) cancel()
    },
    onClick(e) {
      // Pointer gestures finish on pointer up. Keyboard activation has no pointer coordinates.
      if (e.detail !== 0) return
      if (tap) tap()
      else place(make(), window.innerWidth / 2, window.innerHeight / 2)
    },
  })
  return { bind, cancel, ghost, ghostRef }
}
