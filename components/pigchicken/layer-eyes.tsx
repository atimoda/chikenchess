"use client"

// The header's eye: a menu of the Pátio's layers. Fundo (the scenery far behind), Zonas (the scenes' zones and the
// map's) and Escalas (debug: each player's aim fan with the notes) have a slider from 0 to 100%: 0 turns the layer
// off, above that it is how strongly it shows. Hit-boxes (debug) is on or off. Saved in this browser
// (pigchicken-layers-v1).
import { useCallback, useEffect, useRef, useState } from "react"
import { Eye } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("pointerdown", away, true); window.addEventListener("keydown", esc)
    return () => { window.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc) }
  }, [open])
  const changed = (Object.keys(DEFAULT) as (keyof PatioLayers)[]).some(k => layers[k] !== DEFAULT[k])
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-label="Camadas" aria-haspopup="menu" aria-expanded={open} title="Camadas" onClick={() => setOpen(v => !v)}
        className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open || changed ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
        <Eye className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" aria-label="Camadas" data-chicken-ignore className="fixed top-14 z-[340] grid w-80 gap-1 rounded-lg border border-white/15 bg-[#101713] p-2 font-mono text-xs text-[#dfe8df] shadow-lg [text-shadow:none]" style={{ left: Math.max(8, Math.min(ref.current?.getBoundingClientRect().left ?? 0, window.innerWidth - 328)) }}>
          {SLIDERS.map(l => (
            <label key={l.key} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 px-1 py-1">
              <span className={layers[l.key] ? "" : "text-[#93a79a]"}>{l.label}</span>
              <input type="range" min={0} max={100} step={1} value={layers[l.key]} aria-label={l.label}
                onChange={e => set({ [l.key]: Number(e.target.value) })} className="h-4 w-full accent-[var(--primary)]" />
              <output className="text-right tabular-nums text-[#93a79a]">{layers[l.key]}%</output>
            </label>
          ))}
          <label className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 px-1 py-1">
            <span className={layers.scale ? "" : "text-[#93a79a]"}>Escalas (Tamanho)</span>
            <input type="range" min={SIZE.min} max={SIZE.max} step={SIZE.step} value={layers.scaleSize} aria-label="Escalas (Tamanho)"
              onChange={e => set({ scaleSize: Number(e.target.value) })} className="h-4 w-full accent-[var(--primary)]" />
            <output className="text-right tabular-nums text-[#93a79a]">{layers.scaleSize.toFixed(2)}x</output>
          </label>
          <label className="flex items-center gap-2 border-t border-white/10 px-1 pt-2">
            <input type="checkbox" checked={layers.hitboxes} onChange={e => set({ hitboxes: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            <span>Hit-boxes</span>
          </label>
        </div>
      )}
    </div>
  )
}
