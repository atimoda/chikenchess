"use client"

// The header's eye: the Camadas panel (floating, like Ajustes). Fundo (the scenery far behind), Zonas (the scenes' zones and the
// map's) and Escalas (debug: each player's aim fan with the notes) have a slider from 0 to 100%: 0 turns the layer
// off, above that it is how strongly it shows; Escalas (Tamanho) and Escalas (Degradê) shape the fan. Hit-boxes
// (debug) is on or off, and below it this browser's FPS options (Contador de FPS, limit). Each Pátio starts from its own saved values (or the defaults): anyone may change them here,
// and whoever may edit the Pátio saves them into it with "Salvar no pátio". An admin also sees "Salvar no game": the values
// become the defaults of every Pátio that saved none (data/pigchicken/default-patio.json).
import { useCallback, useEffect, useState } from "react"
import { Eye, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"
import { useFramePreferences } from "@/components/fps-preferences"
import { GAME_FPS_LIMIT, setFramePreference } from "@/lib/game-frame"
import { PATIO_DEFAULTS_PATH } from "@/lib/pigchicken/patio-defaults"
import { saveDefaultPatioLayers } from "@/lib/admin/game-defaults-client"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { LAYERS_DEFAULT, LAYERS_SIZE as SIZE, sameLayers, type PatioLayers } from "@/lib/pigchicken/patio-layers"

export type { PatioLayers }
const SLIDERS: { key: "backdrop" | "zones" | "scale"; label: string }[] = [
  { key: "backdrop", label: "Fundo" },
  { key: "zones", label: "Zonas" },
  { key: "scale", label: "Escalas (Visibilidade)" },
]

// patioKey: which Pátio is open; saved: its layers. Entering a Pátio (or its saved layers changing) brings them back.
export function usePatioLayers(patioKey: string, saved: PatioLayers | undefined) {
  const base = saved ?? LAYERS_DEFAULT
  const savedKey = JSON.stringify(saved ?? null)
  const [layers, setLayers] = useState<PatioLayers>(base)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLayers(saved ?? LAYERS_DEFAULT) }, [patioKey, savedKey])
  const set = useCallback((p: Partial<PatioLayers>) => setLayers(l => ({ ...l, ...p })), [])
  return { layers, set, base }
}

// onSave: shown only to whoever may edit this Pátio
export function LayerEyes({ layers, set, base, onSave }: ReturnType<typeof usePatioLayers> & { onSave?: (layers: PatioLayers) => void }) {
  const [open, setOpen] = useState(false)
  const DEFAULT = base
  const changed = !sameLayers(layers, base)
  const fps = useFramePreferences()
  return <>
    <button type="button" aria-label="Camadas" aria-pressed={open} title="Camadas" onClick={() => setOpen(v => !v)}
      className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open || changed ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
      <Eye className="h-4 w-4" />
    </button>
    {open && (
      <FloatingPanel id="patio-layers-menu" aria-label="Camadas" initial={vw => { const w = Math.min(300, vw - 24); return { x: vw - w - 12, y: 64, w, h: 500 } }} minW={220} minH={160}
        className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs text-[#dfe8df] shadow-[0_20px_60px_rgba(0,0,0,0.6)] [text-shadow:none]">
        <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <h2 className="flex-1 text-sm text-white">Camadas</h2>
          <button type="button" aria-label="Fechar camadas" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
        </div>
        <div data-chicken-ignore className="grid min-h-0 flex-1 content-start gap-field overflow-y-auto px-4 py-3">
          <div className="grid gap-field">
          {SLIDERS.map(l => (
            <PatioRange key={l.key} label={l.label} min={0} max={100} value={layers[l.key]} display={`${layers[l.key]}%`}
              changed={layers[l.key] !== DEFAULT[l.key]} onReset={() => set({ [l.key]: DEFAULT[l.key] })} onChange={v => set({ [l.key]: v })} />
          ))}
          <PatioRange label="Escalas (Tamanho)" min={SIZE.min} max={SIZE.max} step={SIZE.step} value={layers.scaleSize} display={`${layers.scaleSize.toFixed(2)}x`}
            changed={layers.scaleSize !== DEFAULT.scaleSize} onReset={() => set({ scaleSize: DEFAULT.scaleSize })} onChange={v => set({ scaleSize: v })} />
          <PatioRange label="Escalas (Degradê)" min={0} max={100} value={layers.scaleFade} display={`${layers.scaleFade}%`}
            changed={layers.scaleFade !== DEFAULT.scaleFade} onReset={() => set({ scaleFade: DEFAULT.scaleFade })} onChange={v => set({ scaleFade: v })} />
          <PatioRange label="Escalas (Linhas)" min={0} max={100} value={layers.scaleLines} display={`${layers.scaleLines}%`}
            changed={layers.scaleLines !== DEFAULT.scaleLines} onReset={() => set({ scaleLines: DEFAULT.scaleLines })} onChange={v => set({ scaleLines: v })} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className={cn(layers.hitboxes !== DEFAULT.hitboxes && "text-amber-300")}>Hit-boxes</span>
            <input type="checkbox" checked={layers.hitboxes} onChange={e => set({ hitboxes: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Contador de FPS</span>
            <input type="checkbox" checked={fps.counter} onChange={e => setFramePreference("counter", e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Limitar a {GAME_FPS_LIMIT} FPS</span>
            <input type="checkbox" checked={fps.limit} onChange={e => setFramePreference("limit", e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          {onSave && (
            <button type="button" disabled={!changed} onClick={() => onSave(layers)}
              className="mt-2 rounded-md border border-[#ffd166]/60 px-3 py-2 text-[#ffd166] transition-colors hover:bg-[#ffd166]/15 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent">
              Salvar no pátio
            </button>
          )}
          <SaveToGameButton path={PATIO_DEFAULTS_PATH} save={() => saveDefaultPatioLayers(layers)} className="mt-1 justify-end" />
        </div>
      </FloatingPanel>
    )}
  </>
}
