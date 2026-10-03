"use client"

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react"
import { createPortal } from "react-dom"
import { Power } from "lucide-react"
import { cn } from "@/lib/utils"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

export interface WidgetToggleItem {
  id: string
  label: string
  ref: RefObject<HTMLButtonElement | null>
  isOn: boolean
  cityColor: string
  onToggle: () => void
  position: { x: number; y: number }
  onPositionChange: (position: { x: number; y: number }) => void
  onDragStart: () => void
}

interface WidgetToggleLayerProps {
  items: WidgetToggleItem[]
  onReady: () => void
}

type TogglePosition = { left: number; top: number }
type TogglePositions = Record<string, TogglePosition>

export function WidgetToggleLayer({ items, onReady }: WidgetToggleLayerProps) {
  const [mounted, setMounted] = useState(false)
  const [positions, setPositions] = useState<TogglePositions>({})
  const dragRef = useRef<{ id: string; pointerId: number; x: number; y: number; origin: { x: number; y: number }; moved: boolean } | null>(null)
  const ignoreClickRef = useRef<string | null>(null)

  useIsomorphicLayoutEffect(() => {
    const measure = () => {
      const next: TogglePositions = {}
      for (const item of items) {
        const rect = item.ref.current?.getBoundingClientRect()
        if (rect && rect.width > 0 && rect.height > 0) next[item.id] = { left: rect.left, top: rect.top }
      }
      setPositions(current => {
        const currentKeys = Object.keys(current)
        const nextKeys = Object.keys(next)
        if (currentKeys.length === nextKeys.length && nextKeys.every(key => current[key]?.left === next[key].left && current[key]?.top === next[key].top)) return current
        return next
      })
    }

    measure()
    setMounted(true)
    onReady()

    const observer = typeof globalThis.ResizeObserver === "undefined" ? null : new globalThis.ResizeObserver(measure)
    const animatedAnchors: HTMLElement[] = []
    for (const item of items) {
      const anchor = item.ref.current
      if (!anchor) continue
      observer?.observe(anchor)
      if (anchor.parentElement) observer?.observe(anchor.parentElement)
      anchor.addEventListener("animationend", measure)
      animatedAnchors.push(anchor)
    }
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      observer?.disconnect()
      for (const anchor of animatedAnchors) anchor.removeEventListener("animationend", measure)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [items, onReady])

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-label="Controles de energia dos widgets">
      {items.map(item => {
        const position = positions[item.id]
        if (!position) return null
        const borderColor = item.isOn ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"
        return <button
          key={item.id}
          type="button"
          aria-label={`${item.isOn ? "Desligar" : "Ligar"} ${item.label}`}
          aria-pressed={item.isOn}
          title={`${item.isOn ? "Desligar" : "Ligar"} ${item.label}`}
          data-widget-power={item.id}
          className={cn(
            "pointer-events-auto fixed z-[120] flex h-8 w-8 touch-none items-center justify-center rounded-full border bg-background shadow-md transition-colors group cursor-grab active:cursor-grabbing hover:text-[#60a5fa]",
            !item.isOn && "hover:drop-shadow-[0_0_8px_#60a5fa]",
            item.isOn ? "text-[var(--city-neon)]" : "text-white",
          )}
          style={{ left: position.left, top: position.top, borderColor, backgroundColor: item.isOn ? undefined : "color-mix(in srgb, var(--background) 50%, transparent)", "--city-neon": item.cityColor } as CSSProperties}
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0) return
            event.stopPropagation()
            ignoreClickRef.current = null
            dragRef.current = { id: item.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: item.position, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={event => {
            const drag = dragRef.current
            if (!drag || drag.id !== item.id || drag.pointerId !== event.pointerId) return
            const dx = event.clientX - drag.x
            const dy = event.clientY - drag.y
            if (!drag.moved && Math.hypot(dx, dy) < 4) return
            if (!drag.moved) {
              drag.moved = true
              item.onDragStart()
            }
            event.preventDefault()
            event.stopPropagation()
            item.onPositionChange({ x: drag.origin.x + dx, y: drag.origin.y + dy })
          }}
          onPointerUp={event => {
            const drag = dragRef.current
            if (!drag || drag.id !== item.id || drag.pointerId !== event.pointerId) return
            if (drag.moved) ignoreClickRef.current = item.id
            dragRef.current = null
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={event => {
            const drag = dragRef.current
            if (drag?.id === item.id && drag.pointerId === event.pointerId) {
              if (drag.moved) ignoreClickRef.current = item.id
              dragRef.current = null
            }
          }}
          onClick={event => {
            event.stopPropagation()
            if (event.detail > 0 && ignoreClickRef.current === item.id) {
              ignoreClickRef.current = null
              return
            }
            item.onToggle()
          }}
        >
          <Power className={cn("h-4 w-4", item.isOn && "drop-shadow-[0_0_8px_currentColor]")} />
        </button>
      })}
    </div>,
    document.body,
  )
}
