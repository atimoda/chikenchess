"use client"

import { useRef } from "react"
import type { Enable, HandleStyles, ResizeCallback, ResizeStartCallback } from "re-resizable"

type WidgetPosition = { x: number; y: number }

// Top edge and top-right corner, shared by every floating match widget. The top edge leaves the
// top-left corner free for the power button and stops before the top-right corner.
const TOP_HANDLE_STYLES: HandleStyles = {
  top: { zIndex: 90, height: 10, top: -5, left: 28, right: 12, width: "auto", cursor: "ns-resize" },
  topRight: { zIndex: 90, width: 16, height: 16, right: -6, top: -6, cursor: "nesw-resize" },
}

/**
 * Resize props for a floating match widget (`re-resizable` inside `Draggable`): the top edge, the
 * top-right corner, the right edge, the bottom edge and the bottom-right corner always; the left edge
 * and the bottom-left corner too when `left`. Pulling the top or the left moves the widget so the
 * opposite side stays put, and the widget never grows past the window. `isStatic` (stacked on phones)
 * turns resizing off.
 */
export function useWidgetResize({ isStatic, left, position, onPositionChange, onResize, handleStyles }: {
  isStatic: boolean
  left: boolean
  position?: WidgetPosition
  onPositionChange?: (position: WidgetPosition) => void
  onResize?: ResizeCallback
  handleStyles?: HandleStyles
}) {
  const startRef = useRef<WidgetPosition | null>(null)
  const enable: Enable | false = isStatic ? false : { top: true, right: true, bottom: true, left, topRight: true, bottomRight: true, bottomLeft: left, topLeft: false }
  const onResizeStart: ResizeStartCallback = event => {
    event.stopPropagation()
    startRef.current = position ?? { x: 0, y: 0 }
  }
  const handleResize: ResizeCallback = (event, direction, element, delta) => {
    onResize?.(event, direction, element, delta)
    const start = startRef.current
    if (!start || !onPositionChange) return
    const fromLeft = /left/i.test(direction)
    const fromTop = /top/i.test(direction)
    if (!fromLeft && !fromTop) return
    onPositionChange({ x: start.x - (fromLeft ? delta.width : 0), y: start.y - (fromTop ? delta.height : 0) })
  }
  return {
    enable,
    bounds: "window" as const,
    boundsByDirection: true,
    handleStyles: { ...TOP_HANDLE_STYLES, ...handleStyles },
    onResizeStart,
    onResize: handleResize,
  }
}
