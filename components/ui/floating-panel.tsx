"use client"

// A popup panel that floats over the page: drag it by its header or any other part that is not a control (a button,
// a field, a slider, a link, an element with its own pointer handling), resize it by its sides and corners. A press
// anywhere on it brings it in front of the other panels, and a panel that opens comes in front (it is drawn straight in
// the page's <main>, so no header or layer of its own keeps it behind another panel). The first time, it opens centred
// near the button that opened it; once moved or resized, its place and size are remembered in this browser under `id`.
// A panel marked `overDock` that opens while the Modo editor is docked at the right covers that dock instead: it is
// drawn over the whole page, with the dock's place and size, may be moved anywhere on the window, and its place is
// not remembered (the next time it covers the dock again).
// The panel itself never scrolls: its sides and corners (the resize areas) stay on its border. What scrolls is a part
// inside it: pass `bodyClassName` to have the whole content in one scrolling column, or give a child its own overflow.
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { stageDocked, stageHeight, stageTop, stageWidth } from "@/lib/stage-size"

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
const SLOP = 4 // px a press travels before it becomes a drag, so a press still clicks
const SCROLLBAR = 16 // px at a scroller's right/bottom edge kept for its scrollbar

// The panels' stacking: the open panels, back to front. Each one sits at PANEL_Z + its place, so the front one is on
// top and every panel stays under the chat, the editor's drag ghosts and the page's toasts.
export const PANEL_Z = 210
let order: number[] = []
let nextPanel = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
function raisePanel(token: number) {
  if (order[order.length - 1] === token) return
  order = [...order.filter(t => t !== token), token]
  emit()
}
function dropPanel(token: number) {
  order = order.filter(t => t !== token)
  emit()
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

// The button pressed last, for a moment: a panel that opens without a saved place centres itself on it.
const OPENER_MS = 1000
let opener: { rect: DOMRect; at: number } | null = null
if (typeof window !== "undefined") {
  window.addEventListener("click", e => {
    const b = (e.target as Element | null)?.closest?.('button, a, [role="button"], [role="menuitem"]')
    opener = b ? { rect: b.getBoundingClientRect(), at: performance.now() } : null
  }, true)
}
// centred under the button (above it when it does not fit below), whole on the screen
function nearOpener(r: Rect): Rect | null {
  const o = opener
  opener = null
  if (!o || performance.now() - o.at > OPENER_MS) return null
  // (the button's place on the window, on the stage: it starts stageTop() below the window's top)
  const vw = stageWidth(), vh = stageHeight(), b = o.rect, top = b.top - stageTop(), bottom = b.bottom - stageTop()
  const w = Math.min(r.w, vw), h = Math.min(r.h, vh)
  const x = Math.min(vw - w, Math.max(0, b.left + b.width / 2 - w / 2))
  const below = bottom + 8, above = top - 8 - h
  const y = below + h <= vh || above < 0 ? Math.min(vh - h, below) : above
  return { x, y: Math.max(0, y), w, h }
}

// Esc closes the panel opened last (still open and shown) through its own close button, so it closes exactly as a
// click would. Whoever uses Esc for something else first (cancel a drag, clear a selection, stop waiting for a key)
// calls preventDefault and the panel stays. Not from a text field, nor while a dialog is open.
const opened: HTMLElement[] = []
const CLOSE = 'button[aria-label^="Fechar"], button[aria-label="Sair do modo editor"]'
// Translated labels do not start with "Fechar": the close button is also found by its X icon (inside the title bar).
const CLOSE_ICON = 'button:has(> svg.lucide-x)'
// It runs once every other listener had its turn on this key, whatever order they were added in.
function onEscape(e: KeyboardEvent) {
  if (e.code === "Escape" && !e.repeat) window.setTimeout(() => closeLast(e))
}
function closeLast(e: KeyboardEvent) {
  if (e.defaultPrevented) return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
  if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"]')) return
  for (let i = opened.length - 1; i >= 0; i--) {
    const el = opened[i]
    if (!el.isConnected || !el.getClientRects().length) continue
    const button = (el.querySelector(`[data-drag-handle] :is(${CLOSE})`) ?? el.querySelector(`[data-drag-handle] ${CLOSE_ICON}`) ?? el.querySelector(CLOSE)) as HTMLButtonElement | null
    if (!button || button.disabled) continue
    button.click()
    return
  }
}
/** Registers a panel for Esc, in the order the panels open. */
export function registerEscClose(el: HTMLElement) {
  if (!opened.length) window.addEventListener("keydown", onEscape)
  opened.push(el)
  return () => {
    const i = opened.indexOf(el)
    if (i >= 0) opened.splice(i, 1)
    if (!opened.length) window.removeEventListener("keydown", onEscape)
  }
}

// What a press may not drag: controls, anything focusable or with its own pointer cursor, and an explicit data-no-drag.
const CONTROL = 'button,a,input,textarea,select,option,label,summary,[role="button"],[role="slider"],[role="checkbox"],[role="switch"],[role="tab"],[role="menuitem"],[contenteditable=""],[contenteditable="true"],[tabindex]:not([tabindex="-1"]),[data-no-drag]'
const FREE_CURSORS = new Set(["auto", "default", "move"])

function scrollable(el: Element) {
  const css = window.getComputedStyle(el)
  return {
    y: /auto|scroll/.test(css.overflowY) && el.scrollHeight > el.clientHeight + 1,
    x: /auto|scroll/.test(css.overflowX) && el.scrollWidth > el.clientWidth + 1,
  }
}

// Whether a press at (x, y) on `target` may start dragging `panel`. A touch inside a list that scrolls scrolls it
// instead (except on the header), and a press on a scrollbar keeps the scrollbar.
function canDragFrom(target: Element, panel: Element, x: number, y: number, touch: boolean) {
  if (target.closest(CONTROL)) return false
  if (target.closest("[data-drag-handle]")) return true
  if (!FREE_CURSORS.has(window.getComputedStyle(target).cursor)) return false
  for (let el: Element | null = target; el; el = el === panel ? null : el.parentElement) {
    const s = scrollable(el)
    if (!s.x && !s.y) continue
    if (touch) return false
    const r = el.getBoundingClientRect()
    if ((s.y && x > r.right - SCROLLBAR) || (s.x && y > r.bottom - SCROLLBAR)) return false
  }
  return true
}

function fit(r: Rect, minW: number, minH: number, keepInViewport: boolean, vw = stageWidth(), vh = stageHeight()): Rect {
  const w = Math.max(Math.min(minW, vw), Math.min(r.w, vw)), h = Math.max(Math.min(minH, vh), Math.min(r.h, vh))
  const x = keepInViewport ? Math.min(vw - w, Math.max(0, r.x)) : Math.min(vw - KEEP, Math.max(KEEP - w, r.x))
  const y = Math.min(vh - (keepInViewport ? h : KEEP), Math.max(0, r.y))
  return { w, h, x, y }
}

// Inside a tab of the Modo editor's palette, a panel is drawn in place instead of floating: a plain column in the
// palette's flow, without its own title bar (the tab names it, and choosing another tab closes it), border or place.
// "esc": Esc closes it as it closes a floating one (its hidden title bar's Fechar), for the tabs that come and go.
export const PanelInline = createContext<boolean | "esc">(false)

type PanelProps = {
  id: string
  overDock?: boolean
  initial: (vw: number, vh: number) => Rect
  minW?: number
  minH?: number
  keepInViewport?: boolean
  className?: string
  /** The content goes in one column that scrolls when it does not fit, with these classes (its padding, its gap). */
  bodyClassName?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">

export function FloatingPanel(props: PanelProps) {
  return useContext(PanelInline) ? <InlinePanel {...props} /> : <FloatingPanelBox {...props} />
}

function InlinePanel({ id: _id, initial: _initial, minW: _minW, minH: _minH, keepInViewport: _keep, overDock: _overDock, className: _className, bodyClassName, children, ...rest }: PanelProps) {
  const esc = useContext(PanelInline) === "esc"
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => (esc && ref.current ? registerEscClose(ref.current) : undefined), [esc])
  return (
    <section ref={ref} data-chicken-ignore {...rest} className="flex flex-col font-mono text-xs text-[#dfe8df] [text-shadow:none] [&_[data-drag-handle]]:hidden">
      {bodyClassName === undefined ? children : <div className={cn("flex flex-col", bodyClassName)}>{children}</div>}
    </section>
  )
}

function FloatingPanelBox({ id, initial, minW = 240, minH = 160, keepInViewport = false, overDock = false, className, bodyClassName, children, ...rest }: PanelProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  // where it is drawn: the page's <main> (or the body), found from a mark left where it is declared
  const markRef = useRef<HTMLSpanElement | null>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  // covering the docked Modo editor (decided when it opens): drawn on the body, over the whole window
  const onDock = useRef(false)
  const viewW = () => (onDock.current ? window.innerWidth : stageWidth())
  const viewH = () => (onDock.current ? window.innerHeight : stageHeight())
  // on the body it keeps the text colour of the page it belongs to
  const [color, setColor] = useState<string | undefined>()
  useEffect(() => {
    const main = markRef.current?.parentElement?.closest("main") ?? null
    onDock.current = overDock && stageDocked()
    if (onDock.current && main) setColor(window.getComputedStyle(main).color)
    setHost(onDock.current ? document.body : main ?? document.body)
  }, [])
  const shown = !!rect && !!host
  useEffect(() => (shown && panelRef.current ? registerEscClose(panelRef.current) : undefined), [shown])
  const op = useRef<{ pointer: number; edge: Edge | "move"; sx: number; sy: number; start: Rect; armed?: boolean } | null>(null)
  const key = `floating-panel:${id}`
  const [token] = useState(() => nextPanel++)
  const place = useSyncExternalStore(subscribe, () => order.indexOf(token), () => 0)

  useEffect(() => { raisePanel(token); return () => dropPanel(token) }, [token])

  useEffect(() => {
    // the docked panel's place (at the right, the top or the bottom), at least this panel's minimum size
    const dock = overDock && stageDocked() ? document.querySelector("[data-patio-dock]")?.getBoundingClientRect() : undefined
    let r = initial(stageWidth(), stageHeight())
    if (dock) {
      const vw = window.innerWidth, vh = window.innerHeight
      const w = Math.min(vw, Math.max(dock.width, minW)), h = Math.min(vh, Math.max(dock.height, minH))
      r = { x: Math.min(dock.left, vw - w), y: Math.min(dock.top, vh - h), w, h }
      opener = null
    } else {
      let saved: Rect | null = null
      try { const s = JSON.parse(window.localStorage.getItem(key) || "null"); if (s && [s.x, s.y, s.w, s.h].every(Number.isFinite)) saved = s } catch { /* ignore */ }
      r = saved ?? nearOpener(r) ?? r
    }
    setRect(fit(r, minW, minH, keepInViewport || !!dock, dock ? window.innerWidth : stageWidth(), dock ? window.innerHeight : stageHeight()))
    const onResize = () => setRect(cur => cur && fit(cur, minW, minH, keepInViewport, viewW(), viewH()))
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
    if (o.armed) {
      // a press on the panel's body: a drag only once it travels, so a plain press still clicks what is under it
      if (Math.hypot(dx, dy) < SLOP) return
      o.armed = false
      e.currentTarget.setPointerCapture(e.pointerId)
      window.getSelection()?.removeAllRanges()
      document.body.style.userSelect = "none"
    }
    let { x, y, w, h } = s
    if (o.edge === "move") { x += dx; y += dy }
    else {
      const vw = viewW(), vh = viewH()
      if (o.edge.includes("e")) w = Math.min(vw - s.x, Math.max(minW, s.w + dx))
      if (o.edge.includes("s")) h = Math.min(vh - s.y, Math.max(minH, s.h + dy))
      if (o.edge.includes("w")) { w = Math.max(minW, s.w - dx); w = Math.min(w, s.x + s.w); x = s.x + s.w - w }
      if (o.edge.includes("n")) { h = Math.max(minH, s.h - dy); h = Math.min(h, s.y + s.h); y = s.y + s.h - h }
    }
    setRect(fit({ x, y, w, h }, minW, minH, keepInViewport, viewW(), viewH()))
  }
  const end = (e: React.PointerEvent<HTMLElement>) => {
    if (op.current?.pointer !== e.pointerId) return
    const armed = op.current.armed
    op.current = null
    if (armed) return
    document.body.style.userSelect = ""
    if (onDock.current) return
    setRect(cur => { if (cur) { try { window.localStorage.setItem(key, JSON.stringify(cur)) } catch { /* ignore */ } } return cur })
  }

  if (!rect || !host) return <span ref={markRef} hidden />
  return createPortal(
    <aside
      ref={panelRef}
      data-chicken-ignore
      {...rest}
      style={{ color, ...rest.style, left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: PANEL_Z + Math.max(0, place) }}
      className={cn("fixed flex flex-col", className, "overflow-hidden supports-[overflow:clip]:overflow-clip")}
      onPointerDownCapture={e => { rest.onPointerDownCapture?.(e); raisePanel(token) }}
      onPointerDown={e => {
        rest.onPointerDown?.(e)
        e.stopPropagation()
        if (!rect || e.button !== 0 || (op.current && !op.current.armed)) return
        const t = e.target as Element
        if (!canDragFrom(t, e.currentTarget, e.clientX, e.clientY, e.pointerType !== "mouse")) return
        if (t.closest("[data-drag-handle]")) { begin("move")(e); return }
        op.current = { pointer: e.pointerId, edge: "move", sx: e.clientX, sy: e.clientY, start: rect, armed: true }
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {bodyClassName === undefined ? children : <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", bodyClassName)}>{children}</div>}
      {EDGES.map(({ edge, className: c, cursor }) => (
        <div key={edge} aria-hidden className={cn("absolute z-10 touch-none", c)} style={{ cursor }} onPointerDown={begin(edge)} />
      ))}
    </aside>,
    host,
  )
}
