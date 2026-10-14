"use client"

import React, { useRef, useState, useCallback, useEffect, forwardRef } from "react"

interface DraggableProps {
  children: React.ReactNode
  position?: { x: number; y: number }
  defaultPosition?: { x: number; y: number }
  onDrag?: (position: { x: number; y: number }, e?: MouseEvent | TouchEvent) => void
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void
  onDragEnd?: () => void
  handleRef?: React.RefObject<HTMLElement | null>
  dragFromBackground?: boolean
  className?: string
  style?: React.CSSProperties
  scale?: number
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>
  onTouchStart?: React.TouchEventHandler<HTMLDivElement>
  onAnimationEnd?: React.AnimationEventHandler<HTMLDivElement>
}

export const Draggable = forwardRef<HTMLDivElement, DraggableProps>(({
  children,
  position: controlledPosition,
  defaultPosition = { x: 0, y: 0 },
  onDrag,
  onDragStart,
  onDragEnd,
  handleRef,
  dragFromBackground = false,
  className,
  style,
  scale = 1,
  onMouseDown: externalMouseDown,
  onTouchStart: externalTouchStart,
  ...props
}, ref) => {
  const [internalPosition, setInternalPosition] = useState(defaultPosition)
  const isControlled = controlledPosition !== undefined
  const position = isControlled ? controlledPosition : internalPosition

  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [])
  const acceptsDrag = useCallback((target: React.SyntheticEvent['target']) => {
    if (style?.position === 'static' || !(target instanceof Element)) return false
    if (target.closest('[data-no-drag]')) return false
    const onHandle = handleRef?.current?.contains(target)
    if (!onHandle && target.closest('button, input, select, textarea, a, label, summary, [role="slider"], [data-slot="slider"], [role="button"], [role="combobox"], [contenteditable="true"], [data-no-drag]')) return false
    return dragFromBackground || onHandle || !handleRef?.current || !!target.closest('[data-drag-handle="true"]')
  }, [style?.position, handleRef, dragFromBackground])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !acceptsDrag(e.target)) return
      cleanupRef.current?.()
      
      e.preventDefault()
      e.stopPropagation()

      const currentX = position.x
      const currentY = position.y

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: currentX,
        originY: currentY,
      }

      if (onDragStart) onDragStart(e)

      if (typeof document !== "undefined") {
        document.body.style.userSelect = "none"
      }

      const onMove = (mv: MouseEvent) => {
        if (!dragRef.current) return
        const s = Number(scale) || 1 // Safety check for 0 or undefined
        const dx = (mv.clientX - dragRef.current.startX) / s
        const dy = (mv.clientY - dragRef.current.startY) / s
        
        const newPos = {
          x: dragRef.current.originX + dx,
          y: dragRef.current.originY + dy,
        }

        if (!isControlled) {
          setInternalPosition(newPos)
        }
        
        if (onDrag) {
          onDrag(newPos, mv)
        }
      }

      const onUp = () => {
        dragRef.current = null
        if (typeof document !== "undefined") {
          document.body.style.userSelect = ""
        }
        if (onDragEnd) onDragEnd()
        
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseup", onUp)
        window.removeEventListener("blur", onUp)
        cleanupRef.current = null
      }

      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
      window.addEventListener("blur", onUp)
      cleanupRef.current = onUp
    },
    [position, isControlled, onDrag, onDragStart, onDragEnd, acceptsDrag, scale]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1 || !acceptsDrag(e.target)) return
      cleanupRef.current?.()

      // Prevent scrolling while dragging
      // e.preventDefault() // This might be too aggressive if we want to allow scroll on non-drag areas, but we checked handle.
      e.stopPropagation()

      const touch = e.touches[0]
      const currentX = position.x
      const currentY = position.y

      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        originX: currentX,
        originY: currentY,
      }

      if (onDragStart) onDragStart(e)

      if (typeof document !== "undefined") {
        document.body.style.userSelect = "none"
      }

      const onTouchMove = (te: TouchEvent) => {
        if (!dragRef.current) return
        // Prevent scrolling
        te.preventDefault() 
        
        const t = te.touches[0]
        const s = Number(scale) || 1
        const dx = (t.clientX - dragRef.current.startX) / s
        const dy = (t.clientY - dragRef.current.startY) / s
        
        const newPos = {
          x: dragRef.current.originX + dx,
          y: dragRef.current.originY + dy,
        }

        if (!isControlled) {
          setInternalPosition(newPos)
        }
        
        if (onDrag) {
          onDrag(newPos, te)
        }
      }

      const onTouchEnd = () => {
        dragRef.current = null
        if (typeof document !== "undefined") {
          document.body.style.userSelect = ""
        }
        if (onDragEnd) onDragEnd()
        
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", onTouchEnd)
        window.removeEventListener("touchcancel", onTouchEnd)
        window.removeEventListener("blur", onTouchEnd)
        cleanupRef.current = null
      }

      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", onTouchEnd)
      window.addEventListener("touchcancel", onTouchEnd)
      window.addEventListener("blur", onTouchEnd)
      cleanupRef.current = onTouchEnd
    },
    [position, isControlled, onDrag, onDragStart, onDragEnd, acceptsDrag, scale]
  )

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        // Flow layouts still need a containing block for each widget's absolute
        // background/controls; static positioning would cover neighboring panels.
        position: style?.position === 'static' ? 'relative' : style?.position || 'absolute',
        left: style?.position === 'static' ? undefined : position.x,
        top: style?.position === 'static' ? undefined : position.y,
      }}
      {...props}
      onMouseDown={(e) => {
        handleMouseDown(e)
        externalMouseDown?.(e)
      }}
      onTouchStart={(e) => {
        handleTouchStart(e)
        externalTouchStart?.(e)
      }}
    >
      {children}
    </div>
  )
})

Draggable.displayName = "Draggable"
