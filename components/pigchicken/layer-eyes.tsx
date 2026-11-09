"use client"

// The header's eyes: hide the scenery far behind (sky, sun, mountains, trees in parallax) and show the "Zonas
// sonoras" layer (the scenes' zones and the map's: editable in the editor, only shown otherwise). Saved in this
// browser (pigchicken-layers-v1).
import { useCallback, useEffect, useState } from "react"
import { Eye, EyeOff, Mountain, Music } from "lucide-react"
import { cn } from "@/lib/utils"

const KEY = "pigchicken-layers-v1"
export type PatioLayers = { backdrop: boolean; zones: boolean }
const DEFAULT: PatioLayers = { backdrop: true, zones: false }

export function usePatioLayers() {
  const [layers, setLayers] = useState<PatioLayers>(DEFAULT)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<PatioLayers> | null
      if (raw && typeof raw === "object") setLayers({ backdrop: raw.backdrop !== false, zones: raw.zones === true })
    } catch { /* stays the default */ }
  }, [])
  const toggle = useCallback((k: keyof PatioLayers) => setLayers(l => {
    const next = { ...l, [k]: !l[k] }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* only this session */ }
    return next
  }), [])
  return { layers, toggle }
}

const BTN = "inline-flex h-9 shrink-0 items-center justify-center gap-0.5 rounded-md border px-1.5 transition-colors hover:border-primary hover:text-white"

export function LayerEyes({ layers, toggle }: ReturnType<typeof usePatioLayers>) {
  const eye = (on: boolean) => (on ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />)
  return <>
    <button type="button" aria-pressed={!layers.backdrop} aria-label={layers.backdrop ? "Ocultar o cenário de fundo" : "Mostrar o cenário de fundo"} title={layers.backdrop ? "Ocultar o cenário de fundo" : "Mostrar o cenário de fundo"}
      onClick={() => toggle("backdrop")} className={cn(BTN, layers.backdrop ? "border-white/15 text-[#b9c7b9]" : "border-primary text-white")}>
      {eye(layers.backdrop)}<Mountain className="h-3.5 w-3.5" />
    </button>
    <button type="button" aria-pressed={layers.zones} aria-label={layers.zones ? "Ocultar as zonas musicais" : "Mostrar as zonas musicais"} title={layers.zones ? "Ocultar as zonas musicais" : "Mostrar as zonas musicais"}
      onClick={() => toggle("zones")} className={cn(BTN, layers.zones ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
      {eye(layers.zones)}<Music className="h-3.5 w-3.5" />
    </button>
  </>
}
