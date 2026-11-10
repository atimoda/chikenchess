"use client"

// The Modo editor's panel docked at the right side of the screen: the Pátio (header, world, game and its floating
// panels) shrinks to the space left of it, as if the screen ended there, and the divider between the two resizes
// it. Whether it is docked and its width are remembered in this browser.
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { setStageInset } from "@/lib/stage-size"
import { registerEscClose } from "@/components/ui/floating-panel"
import { cn } from "@/lib/utils"

const KEY = "chickenchess:patio-editor-dock"
export const DOCK_MIN_W = 220
const DOCK_DEFAULT_W = 300
const STAGE_MIN_W = 320 // the Pátio never gets narrower than this

type DockPref = { on: boolean; w: number }
let pref: DockPref | null = null
const listeners = new Set<() => void>()
function readPref(): DockPref {
  if (pref) return pref
  pref = { on: false, w: DOCK_DEFAULT_W }
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "null")
    if (saved && typeof saved.on === "boolean" && Number.isFinite(saved.w)) pref = { on: saved.on, w: saved.w }
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

const fitWidth = (w: number) => Math.round(Math.max(DOCK_MIN_W, Math.min(w, window.innerWidth - STAGE_MIN_W)))

export function EditorDock({ children, className, ...rest }: { children: React.ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const [width, setWidth] = useState(() => fitWidth(readPref().w))
  const drag = useRef<number | null>(null)
  const ref = useRef<HTMLElement | null>(null)
  // Esc closes it like the floating panels, in the order they opened
  useEffect(() => (ref.current ? registerEscClose(ref.current) : undefined), [])

  // the Pátio gives up this width while the dock is open, and gets it back when it closes
  useEffect(() => { setStageInset(width) }, [width])
  useEffect(() => () => setStageInset(0), [])
  useEffect(() => {
    const onResize = () => setWidth(w => fitWidth(w))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return createPortal(
    <aside ref={ref} data-chicken-ignore data-patio-dock {...rest} style={{ ...rest.style, width }}
      className={cn("fixed inset-y-0 right-0 z-[200] flex flex-col border-l border-[#ffd166]/40 bg-[#101713]", className)}>
      {children}
      {/* the divider between the Pátio and the panel */}
      <div role="separator" aria-orientation="vertical" aria-label="Largura do painel" title="Arraste para mudar a largura"
        className="group absolute inset-y-0 -left-1.5 z-10 w-3 cursor-col-resize touch-none"
        onPointerDown={e => {
          if (e.button !== 0) return
          e.preventDefault(); e.stopPropagation()
          drag.current = e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          document.body.style.userSelect = "none"
        }}
        onPointerMove={e => { if (drag.current === e.pointerId) setWidth(fitWidth(window.innerWidth - e.clientX)) }}
        onPointerUp={e => {
          if (drag.current !== e.pointerId) return
          drag.current = null
          document.body.style.userSelect = ""
          writePref({ ...readPref(), w: width })
        }}
        onPointerCancel={() => { drag.current = null; document.body.style.userSelect = "" }}>
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-[#ffd166]/70" />
      </div>
    </aside>,
    document.body,
  )
}
