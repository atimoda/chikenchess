"use client"

// The header's eye: a menu of the Pátio's layers, each one turned on and off — the scenery far behind (sky, sun,
// mountains, trees in parallax), the "Zonas sonoras" layer (the scenes' zones and the map's: editable in the editor,
// only shown otherwise) and the "Escala da mira" (debug: the note and degree of each lane of every player's aim).
// Saved in this browser (pigchicken-layers-v1).
import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

const KEY = "pigchicken-layers-v1"
export type PatioLayers = { backdrop: boolean; zones: boolean; scale: boolean }
const DEFAULT: PatioLayers = { backdrop: true, zones: false, scale: false }
const LAYERS: { key: keyof PatioLayers; label: string; hint: string }[] = [
  { key: "backdrop", label: "Cenário de fundo", hint: "Céu, sol, nuvens, montanhas e árvores ao longe" },
  { key: "zones", label: "Zonas musicais", hint: "A zona de cada cena e as zonas sonoras do mapa (editáveis no modo editor)" },
  { key: "scale", label: "Escala da mira", hint: "Debug: a nota e o grau de cada faixa do leque da mira de cada boneco" },
]

export function usePatioLayers() {
  const [layers, setLayers] = useState<PatioLayers>(DEFAULT)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<PatioLayers> | null
      if (raw && typeof raw === "object") setLayers({ backdrop: raw.backdrop !== false, zones: raw.zones === true, scale: raw.scale === true })
    } catch { /* stays the default */ }
  }, [])
  const toggle = useCallback((k: keyof PatioLayers) => setLayers(l => {
    const next = { ...l, [k]: !l[k] }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* only this session */ }
    return next
  }), [])
  return { layers, toggle }
}

export function LayerEyes({ layers, toggle }: ReturnType<typeof usePatioLayers>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("pointerdown", away, true); window.addEventListener("keydown", esc)
    return () => { window.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc) }
  }, [open])
  // the eye is open while every layer shows as it does by default
  const changed = LAYERS.some(l => layers[l.key] !== DEFAULT[l.key])
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-label="Camadas" aria-haspopup="menu" aria-expanded={open} title="Camadas" onClick={() => setOpen(v => !v)}
        className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open || changed ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
        <Eye className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" aria-label="Camadas" data-chicken-ignore className="fixed left-auto top-14 z-[130] w-64 rounded-lg border border-white/15 bg-[#101713] p-1.5 font-mono text-xs text-[#dfe8df] shadow-lg [text-shadow:none]" style={{ left: (ref.current?.getBoundingClientRect().left ?? 0) }}>
          {LAYERS.map(l => (
            <button key={l.key} type="button" role="menuitemcheckbox" aria-checked={layers[l.key]} title={l.hint} onClick={() => toggle(l.key)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10">
              <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border", layers[l.key] ? "border-primary bg-primary text-[#05060c]" : "border-white/30")}>{layers[l.key] && <Check className="h-3 w-3" />}</span>
              <span className="grid"><span>{l.label}</span><span className="text-[10px] text-[#93a79a]">{l.hint}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
