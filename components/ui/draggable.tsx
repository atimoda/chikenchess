"use client"

import React, { useRef, useState, useCallback, forwardRef } from "react"

interface DraggableProps {
  children: React.ReactNode
  position?: { x: number; y: number }
  defaultPosition?: { x: number; y: number }
  onDrag?: (position: { x: number; y: number }, e?: MouseEvent | TouchEvent) => void
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void
  onDragEnd?: () => void
  handleRef?: React.RefObject<HTMLElement | null>
  className?: string
  style?: React.CSSProperties
  scale?: number
}

export const Draggable = forwardRef<HTMLDivElement, DraggableProps>(({
  children,
  position: controlledPosition,
  defaultPosition = { x: 0, y: 0 },
  onDrag,
  onDragStart,
  onDragEnd,
  handleRef,
  className,
  style,
  scale = 1,
  ...props
}, ref) => {
  const [internalPosition, setInternalPosition] = useState(defaultPosition)
  const isControlled = controlledPosition !== undefined
  const position = isControlled ? controlledPosition : internalPosition

  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      console.log('Draggable: MouseDown detected', {
        target: e.target,
        handleRefCurrent: handleRef?.current,
        isContained: handleRef?.current?.contains(e.target as Node),
        isDragHandleAttribute: (e.target as Element).closest('[data-drag-handle="true"]')
      })

      // If a handle is specified, only allow dragging from the handle
      // Also allow if the element has data-drag-handle="true"
      if (handleRef?.current && !handleRef.current.contains(e.target as Node)) {
        if (!(e.target as Element).closest('[data-drag-handle="true"]')) {
          console.log('Draggable: Blocked - Click outside handle')
          return
        }
      }
      
      console.log('Draggable: Starting drag')
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
      }

      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
    },
    [position, isControlled, onDrag, onDragStart, onDragEnd, handleRef, scale]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (handleRef?.current && !handleRef.current.contains(e.target as Node)) {
        if (!(e.target as Element).closest('[data-drag-handle="true"]')) {
          return
        }
      }

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
      }

      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", onTouchEnd)
    },
    [position, isControlled, onDrag, onDragStart, onDragEnd, handleRef, scale]
  )

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        position: "absolute",
        left: position.x,
        top: position.y,
      }}
      {...props}
      onMouseDown={(e) => {
        handleMouseDown(e)
        // @ts-ignore
        if (props.onMouseDown) props.onMouseDown(e)
      }}
      onTouchStart={(e) => {
        handleTouchStart(e)
        // @ts-ignore
        if (props.onTouchStart) props.onTouchStart(e)
      }}
    >
      {children}
    </div>
  )
})

Draggable.displayName = "Draggable"
