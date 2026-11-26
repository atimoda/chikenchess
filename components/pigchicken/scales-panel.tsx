"use client"

// Popup with every number of the instruments' scales, one scale at a time picked in the dropdown at the top (like
// the Itens panel). Saved in this browser; the Parquinho follows it live. The dropdown follows the scale the main
// player's instrument is on. Under the dropdown, always in view, the scale's own drawing follows its numbers
// (components/pigchicken/scale-preview.tsx); the Bateria's is its kit's setup (components/pigchicken/drum-kit-editor.tsx).
import { useT } from "@/lib/i18n"
import { StepSelect } from "@/components/ui/step-select"
import { PatioRange } from "@/components/ui/patio-range"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { saveDefaultScales } from "@/lib/admin/game-defaults-client"
import { INSTRUMENT_SCALES, INSTRUMENT_SCALE_IDS, type InstrumentScaleId } from "@/lib/pigchicken/instrument-scales"
import { DEFAULT_KIT, saveDrumKit } from "@/lib/pigchicken/drum-kit"
import { DrumKitEditor } from "@/components/pigchicken/drum-kit-editor"
import { ScalePreview } from "@/components/pigchicken/scale-preview"
import { DEFAULT_SCALES, SCALE_PARAM_GROUPS, SCALE_PARAM_META, saveScaleParams, scaleParamApplies, scaleParams, scalesDefaultsFile, scalesTuning, subscribeHeldScale, subscribeScaleParams, type ScaleParams } from "@/lib/pigchicken/scale-params"
import { patioSaveOf, tuningLocked } from "@/lib/pigchicken/patio-tuning"
import { LockedFieldset } from "@/components/pigchicken/tuning-lock"
import { useTuningVersion } from "@/hooks/use-game-defaults"

export function ScalesPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [scales, setScales] = useState<Record<InstrumentScaleId, ScaleParams>>(DEFAULT_SCALES)
  const [sel, setSel] = useState<InstrumentScaleId>("primary")
  const [open, setOpen] = useState<Record<string, boolean>>({ Standby: true, Forma: true })
  useEffect(() => {
    setScales(scaleParams())
    return subscribeScaleParams(setScales)
  }, [])
  useEffect(() => subscribeHeldScale(id => { if (id) setSel(id) }), [])
  // re-render when the open Pátio's values or who may save into it change
  useTuningVersion()
  const sc = scales[sel], base = DEFAULT_SCALES[sel]
  const update = (fn: (p: ScaleParams) => void) => {
    if (tuningLocked()) return
    const next = structuredClone(scales)
    fn(next[sel])
    saveScaleParams(next)
    setScales(next)
  }
  const metas = SCALE_PARAM_META.filter(m => scaleParamApplies(m, sel))
  return (
    <FloatingPanel id="pigchicken-scales" aria-label={t("Escalas")} initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(360, vw - 24), h: Math.min(560, vh - 104) })} minW={260} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <StepSelect aria-label={t("Escala")} value={sel} onChange={e => setSel(e.target.value as InstrumentScaleId)} className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white">
          {INSTRUMENT_SCALE_IDS.map(id => <option key={id} value={id}>{t(INSTRUMENT_SCALES[id].label)}</option>)}
        </StepSelect>
        <button type="button" onClick={() => { { const next = structuredClone(scales); next[sel] = structuredClone(base); saveScaleParams(next); setScales(next) }; if (sel === "drums") saveDrumKit(structuredClone(DEFAULT_KIT)) }} title={t("Volta esta escala para os valores padrão")} className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">{t("Padrão")}</button>
        <button type="button" aria-label={t("Fechar escalas")} onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      {/* the scale's drawing, above the numbers and out of their scroll */}
      {sel !== "drums" && <ScalePreview scale={sel} params={sc} className="max-h-[340px] min-h-[200px] w-full shrink-0 basis-1/2 touch-none border-b border-white/10 bg-black/30" />}
      <div className="min-h-0 flex-1 overflow-y-auto">
      <LockedFieldset>
        {/* the Bateria's setup: where each piece sits and its shortcuts */}
        {sel === "drums" && (
          <details open={open.Kit !== false} onToggle={e => { const v = (e.currentTarget as HTMLDetailsElement).open; setOpen(o => ({ ...o, Kit: v })) }} className="border-b border-white/10">
            <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#ffd166] hover:text-white">{t("Kit")}</summary>
            <DrumKitEditor />
          </details>
        )}
        {SCALE_PARAM_GROUPS.filter(g => metas.some(m => m.group === g)).map(g => (
          <details key={g} open={!!open[g]} onToggle={e => { const v = (e.currentTarget as HTMLDetailsElement).open; setOpen(o => ({ ...o, [g]: v })) }} className="border-b border-white/10">
            <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#ffd166] hover:text-white">{t(g)}</summary>
            <div className="grid gap-[3px] px-4 pb-4">
              {metas.filter(m => m.group === g).map(m => {
                const v = sc[m.key]
                const display = m.unit === "%" ? `${v}%` : m.unit ? `${v.toFixed(1)} ${m.unit}` : v.toFixed(2)
                return <PatioRange key={m.key} label={t(m.label)} min={m.min} max={m.max} step={m.step} value={v} display={display}
                  changed={v !== base[m.key]} hint={t(m.hint ?? "")}
                  onChange={n => update(p => { p[m.key] = n })}
                  onReset={() => update(p => { p[m.key] = base[m.key] })} />
              })}
            </div>
          </details>
        ))}
        {/* admins: every scale's current numbers become the game's default (data/pigchicken/default-scales.json) */}
        {/* Reverter para o padrão: every scale (and the Bateria's kit), not only the one shown */}
        {/* Salvar no Pátio: the numbers that differ from the game's become the open Pátio's (the Bateria's kit stays this browser's) */}
        <SaveToGameButton part="scales" save={() => saveDefaultScales(scales)} className="justify-end px-4 py-3"
          patio={patioSaveOf("scales", scalesTuning().game, scalesDefaultsFile(scales))}
          onRevert={() => { const next = structuredClone(DEFAULT_SCALES); saveScaleParams(next); setScales(next); saveDrumKit(structuredClone(DEFAULT_KIT)) }} />
      </LockedFieldset>
      </div>
    </FloatingPanel>
  )
}
