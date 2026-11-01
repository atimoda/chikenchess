"use client"

// A popup panel that floats over the page: drag it by any element marked data-drag-handle, resize it by its
// sides and corners. Its place and size are remembered in this browser under `id`.
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Rect = { x: number; y: number; w: number; h: number }
type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

const EDGES: { edge: Edge; className: string; cursor: string }[] = [
  { edge: "n", className: "inset-x-3 top-0 h-1.5", cursor: "ns-resize" },
  { edge: "s", className: "inset-x-3 bottom-0 h-1.5", cursor: "ns-resize" },
  { edge: "w", className: "inset-y-3 left-0 w-1.5", cursor: "ew-resize" },
  { edge: "e", className: "inset-y-3 right-0 w-1.5", cursor: "ew-resize" },
  { edge: "nw", className: "left-0 top-0 h-3 w-3", cursor: "nwse-resize" },
  { edge: "se", className: "bottom-0 right-0 h-3 w-3", cursor: "nwse-resize" },
  { edge: "ne", className: "right-0 top-0 h-3 w-3", cursor: "nesw-resize" },
  { edge: "sw", className: "bottom-0 left-0 h-3 w-3", cursor: "nesw-resize" },
]

const KEEP = 48 // px of the panel that always stays on the screen

function fit(r: Rect, minW: number, minH: number): Rect {
  const vw = window.innerWidth, vh = window.innerHeight
  const w = Math.max(Math.min(minW, vw), Math.min(r.w, vw)), h = Math.max(Math.min(minH, vh), Math.min(r.h, vh))
  return { w, h, x: Math.min(vw - KEEP, Math.max(KEEP - w, r.x)), y: Math.min(vh - KEEP, Math.max(0, r.y)) }
}

export function FloatingPanel({ id, initial, minW = 240, minH = 160, className, children, ...rest }: {
  id: string
  initial: (vw: number, vh: number) => Rect
  minW?: number
  minH?: number
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const [rect, setRect] = useState<Rect | null>(null)
  const op = useRef<{ pointer: number; edge: Edge | "move"; sx: number; sy: number; start: Rect } | null>(null)
  const key = `floating-panel:${id}`

  useEffect(() => {
    let r = initial(window.innerWidth, window.innerHeight)
    try { const saved = JSON.parse(window.localStorage.getItem(key) || "null"); if (saved && [saved.x, saved.y, saved.w, saved.h].every(Number.isFinite)) r = saved } catch { /* ignore */ }
    setRect(fit(r, minW, minH))
    const onResize = () => setRect(cur => cur && fit(cur, minW, minH))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [key])

  const begin = (edge: Edge | "move") => (e: React.PointerEvent<HTMLElement>) => {
    if (!rect || e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    op.current = { pointer: e.pointerId, edge, sx: e.clientX, sy: e.clientY, start: rect }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const o = op.current
    if (!o || o.pointer !== e.pointerId) return
    e.stopPropagation()
    const dx = e.clientX - o.sx, dy = e.clientY - o.sy, s = o.start
    let { x, y, w, h } = s
    if (o.edge === "move") { x += dx; y += dy }
    else {
      const vw = window.innerWidth, vh = window.innerHeight
      if (o.edge.includes("e")) w = Math.min(vw - s.x, Math.max(minW, s.w + dx))
      if (o.edge.includes("s")) h = Math.min(vh - s.y, Math.max(minH, s.h + dy))
      if (o.edge.includes("w")) { w = Math.max(minW, s.w - dx); w = Math.min(w, s.x + s.w); x = s.x + s.w - w }
      if (o.edge.includes("n")) { h = Math.max(minH, s.h - dy); h = Math.min(h, s.y + s.h); y = s.y + s.h - h }
    }
    setRect(fit({ x, y, w, h }, minW, minH))
  }
  const end = (e: React.PointerEvent<HTMLElement>) => {
    if (op.current?.pointer !== e.pointerId) return
    op.current = null
    setRect(cur => { if (cur) { try { window.localStorage.setItem(key, JSON.stringify(cur)) } catch { /* ignore */ } } return cur })
  }

  if (!rect) return null
  return (
    <aside
      data-chicken-ignore
      {...rest}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      className={cn("fixed z-[210] flex flex-col overflow-hidden", className)}
      onPointerDown={e => {
        rest.onPointerDown?.(e)
        e.stopPropagation()
        const t = e.target as Element
        if (!t.closest("[data-drag-handle]") || t.closest('button,a,input,textarea,select,option,label,summary,[role="button"],[data-no-drag]')) return
        begin("move")(e)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {children}
      {EDGES.map(({ edge, className: c, cursor }) => (
        <div key={edge} aria-hidden className={cn("absolute z-10 touch-none", c)} style={{ cursor }} onPointerDown={begin(edge)} />
      ))}
    </aside>
  )
}
