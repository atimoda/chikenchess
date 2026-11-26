"use client"

// The Modo editor's panel docked at a side of the screen: at the right (top to bottom), at the top (under the header's
// strip, which stays above it, the whole width) or at the bottom (the whole width). The Pátio (header, world, game and
// its floating panels) shrinks to the space left, as if the screen ended there, and the divider between the two
// resizes it. Whether it is docked, the side and its width/height are remembered in this browser.
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { setStageDock } from "@/lib/stage-size"
import { registerEscClose } from "@/components/ui/floating-panel"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

const KEY = "chickenchess:patio-editor-dock"
export const DOCK_MIN_W = 220
const DOCK_DEFAULT_W = 300
const STAGE_MIN_W = 320 // the Pátio never gets narrower than this
const DOCK_MIN_H = 140
const DOCK_DEFAULT_H = 260
const STAGE_MIN_H = 240 // nor shorter than this
/** The header's strip, kept above the panel docked at the top. */
export const PATIO_HEADER_H = 56

export type DockSide = "right" | "top" | "bottom"
type DockPref = { on: boolean; w: number; side: DockSide; h: number }
let pref: DockPref | null = null
const listeners = new Set<() => void>()
const SIDES: DockSide[] = ["right", "top", "bottom"]
function readPref(): DockPref {
  if (pref) return pref
  pref = { on: false, w: DOCK_DEFAULT_W, side: "right", h: DOCK_DEFAULT_H }
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "null")
    if (saved && typeof saved.on === "boolean" && Number.isFinite(saved.w)) pref = {
      on: saved.on, w: saved.w,
      side: SIDES.includes(saved.side) ? saved.side : "right",
      h: Number.isFinite(saved.h) ? saved.h : DOCK_DEFAULT_H,
    }
  } catch { /* ignore */ }
  return pref
}
function writePref(next: DockPref) {
  pref = next
  try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  listeners.forEach(l => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** Whether the Modo editor's panel is docked, and the toggle. */
export function useEditorDocked(): [boolean, () => void] {
  const on = useSyncExternalStore(subscribe, () => readPref().on, () => false)
  return [on, () => writePref({ ...readPref(), on: !readPref().on })]
}

/** The side it docks at, and the choice of a side: the side it is at undocks it, another one moves it there. */
export function useEditorDockSide(): [DockSide, (side: DockSide) => void] {
  const side = useSyncExternalStore(subscribe, () => readPref().side, () => "right" as DockSide)
  return [side, next => {
    const p = readPref()
    writePref(p.on && p.side === next ? { ...p, on: false } : { ...p, on: true, side: next })
  }]
}

const fitWidth = (w: number) => Math.round(Math.max(DOCK_MIN_W, Math.min(w, window.innerWidth - STAGE_MIN_W)))
const fitHeight = (h: number, side: DockSide) =>
  Math.round(Math.max(DOCK_MIN_H, Math.min(h, window.innerHeight - STAGE_MIN_H - (side === "top" ? PATIO_HEADER_H : 0))))

export function EditorDock({ children, className, ...rest }: { children: React.ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const t = useT()
  const [side] = useEditorDockSide()
  const across = side !== "right"
  const [width, setWidth] = useState(() => fitWidth(readPref().w))
  const [height, setHeight] = useState(() => fitHeight(readPref().h, readPref().side))
  const drag = useRef<number | null>(null)
  const ref = useRef<HTMLElement | null>(null)
  // Esc closes it like the floating panels, in the order they opened
  useEffect(() => (ref.current ? registerEscClose(ref.current) : undefined), [])

  // the Pátio gives up this width (or height) while the dock is open, and gets it back when it closes
  useEffect(() => {
    setStageDock(side === "right" ? { right: width } : side === "top" ? { top: PATIO_HEADER_H + height } : { bottom: height })
  }, [side, width, height])
  useEffect(() => () => setStageDock({}), [])
  useEffect(() => { setHeight(h => fitHeight(h, side)) }, [side])
  useEffect(() => {
    const onResize = () => { setWidth(w => fitWidth(w)); setHeight(h => fitHeight(h, readPref().side)) }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const place = side === "right" ? { width } : side === "top" ? { top: PATIO_HEADER_H, height } : { height }
  return createPortal(
    <aside ref={ref} data-chicken-ignore data-patio-dock={side} {...rest} style={{ ...rest.style, ...place }}
      className={cn("fixed z-[200] flex flex-col border-[#ffd166]/40 bg-[#101713]",
        side === "right" ? "inset-y-0 right-0 border-l" : side === "top" ? "inset-x-0 border-b" : "inset-x-0 bottom-0 border-t", className)}>
      {children}
      {/* the divider between the Pátio and the panel */}
      <div role="separator" aria-orientation={across ? "horizontal" : "vertical"} aria-label={across ? t("Altura do painel") : t("Largura do painel")}
        title={across ? t("Arraste para mudar a altura") : t("Arraste para mudar a largura")}
        className={cn("group absolute z-10 touch-none",
          side === "right" ? "inset-y-0 -left-1.5 w-3 cursor-col-resize" : side === "top" ? "inset-x-0 -bottom-1.5 h-3 cursor-row-resize" : "inset-x-0 -top-1.5 h-3 cursor-row-resize")}
        onPointerDown={e => {
          if (e.button !== 0) return
          e.preventDefault(); e.stopPropagation()
          drag.current = e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          document.body.style.userSelect = "none"
        }}
        onPointerMove={e => {
          if (drag.current !== e.pointerId) return
          if (side === "right") setWidth(fitWidth(window.innerWidth - e.clientX))
          else setHeight(fitHeight(side === "top" ? e.clientY - PATIO_HEADER_H : window.innerHeight - e.clientY, side))
        }}
        onPointerUp={e => {
          if (drag.current !== e.pointerId) return
          drag.current = null
          document.body.style.userSelect = ""
          writePref(across ? { ...readPref(), h: height } : { ...readPref(), w: width })
        }}
        onPointerCancel={() => { drag.current = null; document.body.style.userSelect = "" }}>
        <span aria-hidden className={cn("absolute bg-transparent transition-colors group-hover:bg-[#ffd166]/70",
          across ? "inset-x-0 top-1/2 h-0.5 -translate-y-1/2" : "inset-y-0 left-1/2 w-0.5 -translate-x-1/2")} />
      </div>
    </aside>,
    document.body,
  )
}
