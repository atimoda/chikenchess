"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { t as tr } from "@/lib/i18n"

/** Mobile layout switch shared by campaign and online matches. */
export function useMatchViewport(boardScale = 1) {
  const [isMobile, setIsMobile] = useState(false)
  const [isPortraitMobile, setIsPortraitMobile] = useState(false)
  useEffect(() => {
    const update = () => {
      const { innerWidth: width, innerHeight: height } = window
      const boardWidth = Math.min(Math.max(0, height - 270), 512) * boardScale
      const mobile = width <= boardWidth + 16 || (width <= 528 && height > width)
      setIsMobile(mobile)
      setIsPortraitMobile(mobile && height > width)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [boardScale])
  return { isMobile, isPortraitMobile }
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const update = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [])
  const toggleFullscreen = useCallback(() => {
    void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())
      .catch(() => toast.error(tr("Fullscreen unavailable")))
  }, [])
  return { isFullscreen, toggleFullscreen }
}

function useFitScale(count: number) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const viewport = viewportRef.current, content = contentRef.current
    if (!viewport || !content) return
    const update = () => {
      const available = viewport.clientWidth, width = content.scrollWidth
      const next = available > 0 && width > available ? available / width : 1
      setScale(current => Math.abs(current - next) < 0.001 ? current : next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    observer.observe(content)
    return () => observer.disconnect()
  }, [count])
  return { viewportRef, contentRef, scale }
}

/** Shrinks each captured-pieces row so it always fits beside the egg counter. */
export function useCapturedPiecesScale(playerCount: number, opponentCount: number) {
  return { player: useFitScale(playerCount), opponent: useFitScale(opponentCount) }
}
