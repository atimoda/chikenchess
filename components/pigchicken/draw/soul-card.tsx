"use client"

// A soul's drawing in the middle of a canvas, for the cards of the Biblioteca de almas and of the Guia de pássaros
// (a real bird is drawn like a soul, with its own colours).
import { useEffect, useRef } from "react"
import { SOUL_COLS, SOUL_ROWS, drawSoulArt } from "@/components/pigchicken/draw/soul-art"
import type { SoulLook } from "@/lib/pigchicken/soul-library"

export function sizeCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
  const ctx = c.getContext("2d")!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
  return { ctx, w, h }
}
// as big as `most` lets it be (the big ones stay bigger than the small ones); found: its drawing with its glow, else
// its outline. now: null stands still, wings up
export function drawSoulCard(c: HTMLCanvasElement, look: SoulLook, found: boolean, now: number | null, most: number) {
  const { ctx, w, h } = sizeCanvas(c)
  const k = Math.min(most, (h * 0.8) / (SOUL_ROWS * look.pixel), (w * 0.9) / (SOUL_COLS * look.pixel))
  ctx.save(); ctx.translate(w / 2, h / 2 + (now === null ? 0 : Math.sin(now * 3) * 2)); ctx.scale(k, k)
  if (found) { ctx.globalAlpha = 0.18; ctx.fillStyle = look.halo ? look.eye : look.body; ctx.beginPath(); ctx.arc(0, 0, Math.min(SOUL_ROWS * look.pixel * 0.7, (h * 0.45) / k), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 }
  drawSoulArt(ctx, 0, 0, 1, now ?? 0, look, !found)
  ctx.restore()
}

/** A card's canvas that draws itself: still, or beating its wings while `live`. */
export function SoulCanvas({ look, found = true, most, live = false, className, label }: { look: SoulLook; found?: boolean; most: number; live?: boolean; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const key = JSON.stringify(look)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let raf = 0
    const draw = () => { if (c.isConnected) drawSoulCard(c, look, found, live ? performance.now() / 1000 : null, most) }
    const frame = () => { draw(); raf = requestAnimationFrame(frame) }
    if (live) raf = requestAnimationFrame(frame); else draw()
    const watch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw)
    watch?.observe(c)
    return () => { cancelAnimationFrame(raf); watch?.disconnect() }
    // (the look by its content: a new object with the same colours draws the same)
  }, [key, found, most, live])
  return <canvas ref={ref} aria-hidden={label ? undefined : true} aria-label={label} className={className} />
}
