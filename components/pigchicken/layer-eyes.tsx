"use client"

// The header's eye: the Camadas panel (floating, like Ajustes). Fundo (the scenery far behind), Zonas (the scenes' zones and the
// map's) and Escalas (debug: each player's aim fan with the notes) have a slider from 0 to 100%: 0 turns the layer
// off, above that it is how strongly it shows. Hit-boxes (debug) is on or off. Saved in this browser
// (pigchicken-layers-v1).
import { useCallback, useEffect, useState } from "react"
import { Eye, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"

const KEY = "pigchicken-layers-v1"
// scaleSize: the Escalas fan's size (0.1x to 2x)
export type PatioLayers = { backdrop: number; zones: number; scale: number; scaleSize: number; hitboxes: boolean }
const DEFAULT: PatioLayers = { backdrop: 100, zones: 33, scale: 0, scaleSize: 0.3, hitboxes: false }
const SIZE = { min: 0.1, max: 2, step: 0.05 }
const SLIDERS: { key: "backdrop" | "zones" | "scale"; label: string }[] = [
  { key: "backdrop", label: "Fundo" },
  { key: "zones", label: "Zonas" },
  { key: "scale", label: "Escalas" },
]

// a saved value: a number, or the first version's on/off (on: the default strength)
const level = (v: unknown, d: number) => typeof v === "number" && Number.isFinite(v) ? Math.round(Math.max(0, Math.min(100, v))) : v === true ? d || 100 : v === false ? 0 : d

export function usePatioLayers() {
  const [layers, setLayers] = useState<PatioLayers>(DEFAULT)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null
      if (raw && typeof raw === "object") setLayers({
        backdrop: level(raw.backdrop, DEFAULT.backdrop), zones: level(raw.zones, DEFAULT.zones), scale: level(raw.scale, DEFAULT.scale), hitboxes: raw.hitboxes === true,
        scaleSize: typeof raw.scaleSize === "number" && Number.isFinite(raw.scaleSize) ? Math.max(SIZE.min, Math.min(SIZE.max, raw.scaleSize)) : DEFAULT.scaleSize,
      })
    } catch { /* stays the default */ }
  }, [])
  const set = useCallback((p: Partial<PatioLayers>) => setLayers(l => {
    const next = { ...l, ...p }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* only this session */ }
    return next
  }), [])
  return { layers, set }
}

export function LayerEyes({ layers, set }: ReturnType<typeof usePatioLayers>) {
  const [open, setOpen] = useState(false)
  const changed = (Object.keys(DEFAULT) as (keyof PatioLayers)[]).some(k => layers[k] !== DEFAULT[k])
  return <>
    <button type="button" aria-label="Camadas" aria-pressed={open} title="Camadas" onClick={() => setOpen(v => !v)}
      className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open || changed ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
      <Eye className="h-4 w-4" />
    </button>
    {open && (
      <FloatingPanel id="patio-layers-menu" aria-label="Camadas" initial={vw => { const w = Math.min(300, vw - 24); return { x: vw - w - 12, y: 64, w, h: 300 } }} minW={220} minH={160}
        className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs text-[#dfe8df] shadow-[0_20px_60px_rgba(0,0,0,0.6)] [text-shadow:none]">
        <div data-drag-handle className="flex cursor-move items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <h2 className="flex-1 text-sm text-white">Camadas</h2>
          <button type="button" aria-label="Fechar camadas" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
        </div>
        <div data-chicken-ignore className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto px-4 py-3">
          {SLIDERS.map(l => (
            <PatioRange key={l.key} label={l.label} min={0} max={100} value={layers[l.key]} display={`${layers[l.key]}%`}
              changed={layers[l.key] !== DEFAULT[l.key]} onReset={() => set({ [l.key]: DEFAULT[l.key] })} onChange={v => set({ [l.key]: v })} />
          ))}
          <PatioRange label="Escalas (Tamanho)" min={SIZE.min} max={SIZE.max} step={SIZE.step} value={layers.scaleSize} display={`${layers.scaleSize.toFixed(2)}x`}
            changed={layers.scaleSize !== DEFAULT.scaleSize} onReset={() => set({ scaleSize: DEFAULT.scaleSize })} onChange={v => set({ scaleSize: v })} />
          <label className="flex items-center justify-between gap-3 pt-1">
            <span className={cn(layers.hitboxes !== DEFAULT.hitboxes && "text-amber-300")}>Hit-boxes</span>
            <input type="checkbox" checked={layers.hitboxes} onChange={e => set({ hitboxes: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
        </div>
      </FloatingPanel>
    )}
  </>
}
