"use client"

// The header's eye: the Camadas panel (floating, like Ajustes). Fundo (the scenery far behind), Zonas (the scenes' zones and the
// map's) and Escalas (debug: each player's aim fan with the notes) have a slider from 0 to 100%: 0 turns the layer
// off, above that it is how strongly it shows; Escalas (Tamanho) and Escalas (Degradê) shape the fan; "Prevenir fadeout
// das escalas" keeps every scale out of its standby (the Escalas editor's fade out). Hit-boxes
// (debug) and Debug da fase de notas (each song playing: its zone, beat, afinação, hearts, counts, accuracy against
// its goal and who rebated) are on or off, and below it this browser's quality levels (lib/quality.ts) and FPS options (Contador de FPS, limit). Each Pátio starts from its own saved values (or the defaults): anyone may change them here,
// and whoever may edit the Pátio saves them into it with "Salvar no pátio". An admin also sees "Salvar no game": the values
// become the defaults of every Pátio that saved none (data/pigchicken/default-patio.json).
import { useCallback, useEffect, useState } from "react"
import { Eye, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"
import { useFramePreferences } from "@/components/fps-preferences"
import { QualityFields } from "@/components/quality-preferences"
import { GAME_FPS_LIMIT, setFramePreference } from "@/lib/game-frame"
import { PATIO_DEFAULTS_PATH } from "@/lib/pigchicken/patio-defaults"
import { saveDefaultPatioLayers } from "@/lib/admin/game-defaults-client"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { LAYERS_DEFAULT, LAYERS_SIZE as SIZE, sameLayers, type PatioLayers } from "@/lib/pigchicken/patio-layers"

export type { PatioLayers }
const SLIDERS: { key: "backdrop" | "zones" | "scale" | "grid"; label: string }[] = [
  { key: "backdrop", label: "Fundo" },
  { key: "zones", label: "Zonas" },
  { key: "scale", label: "Escalas (Visibilidade)" },
  { key: "grid", label: "Grade" },
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

// onSave: shown only to whoever may edit this Pátio. open/onOpenChange: held outside when something else opens the panel
// too (the Modo editor palette's Camadas button)
export function LayerEyes({ layers, set, base, onSave, open: openProp, onOpenChange }: ReturnType<typeof usePatioLayers> & {
  onSave?: (layers: PatioLayers) => void; open?: boolean; onOpenChange?: (open: boolean) => void
}) {
  const [openOwn, setOpenOwn] = useState(false)
  const open = openProp ?? openOwn
  const setOpen = (next: boolean | ((v: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next
    if (openProp === undefined) setOpenOwn(value)
    onOpenChange?.(value)
  }
  const changed = !sameLayers(layers, base)
  return <>
    <button type="button" aria-label="Camadas" aria-pressed={open} title="Camadas" onClick={() => setOpen(v => !v)}
      className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open || changed ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
      <Eye className="h-4 w-4" />
    </button>
    {open && <LayersPanel layers={layers} set={set} base={base} onSave={onSave} onClose={() => setOpen(false)} />}
  </>
}

// The Camadas panel: floating (the header's eye), or in place in the Modo editor's Camadas tab
export function LayersPanel({ layers, set, base, onSave, onClose }: ReturnType<typeof usePatioLayers> & { onSave?: (layers: PatioLayers) => void; onClose: () => void }) {
  const DEFAULT = base
  const changed = !sameLayers(layers, base)
  const fps = useFramePreferences()
  return (
  <FloatingPanel id="patio-layers-menu" aria-label="Camadas" initial={vw => { const w = Math.min(300, vw - 24); return { x: vw - w - 12, y: 64, w, h: 500 } }} minW={220} minH={160}
    className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs text-[#dfe8df] shadow-[0_20px_60px_rgba(0,0,0,0.6)] [text-shadow:none]">
    <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
      <h2 className="flex-1 text-sm text-white">Camadas</h2>
      <button type="button" aria-label="Fechar camadas" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
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
        <span className={cn(layers.scaleKeep !== DEFAULT.scaleKeep && "text-amber-300")}>Prevenir fadeout das escalas</span>
        <input type="checkbox" checked={layers.scaleKeep} onChange={e => set({ scaleKeep: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className={cn(layers.hitboxes !== DEFAULT.hitboxes && "text-amber-300")}>Hit-boxes</span>
        <input type="checkbox" checked={layers.hitboxes} onChange={e => set({ hitboxes: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className={cn(layers.stageDebug !== DEFAULT.stageDebug && "text-amber-300")}>Debug da fase de notas</span>
        <input type="checkbox" checked={layers.stageDebug} onChange={e => set({ stageDebug: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
      </label>
      <QualityFields rowClassName="flex items-center justify-between gap-3"
        selectClassName="rounded-md border border-white/15 bg-[#0c120f] px-2 py-1 text-xs text-[#dfe8df]" checkboxClassName="h-5 w-5 accent-[var(--primary)]" />
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
      {/* Reverter para o padrão: the game's layers (not this Pátio's saved ones, which the small resets bring back) */}
      <SaveToGameButton path={PATIO_DEFAULTS_PATH} save={() => saveDefaultPatioLayers(layers)} className="mt-1 justify-end"
        onRevert={() => set(structuredClone(LAYERS_DEFAULT))} revertDisabled={sameLayers(layers, LAYERS_DEFAULT)} />
    </div>
  </FloatingPanel>
  )
}
