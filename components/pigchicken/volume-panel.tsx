"use client"

// The Pátio header's volume button and its popup: the master volume on top and one slider per sound layer
// (lib/pigchicken/mixer.ts). Everything is saved in this browser and heard at once. Mute, left of Padrão,
// silences the whole mixer: the sliders turn grey but still move, and their values come back when it is off. An admin also sees
// "Salvar no game": the volumes become the game's defaults (data/pigchicken/default-patio.json).
import { PatioRange } from "@/components/ui/patio-range"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { RotateCcw, Volume1, Volume2, VolumeX, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { DEFAULT_MIX, MIX_LAYERS, getMix, isMuted, setMix, setMuted, subscribeMix, type Mix } from "@/lib/pigchicken/mixer"
import { PATIO_DEFAULTS_PATH } from "@/lib/pigchicken/patio-defaults"
import { saveDefaultVolume } from "@/lib/admin/game-defaults-client"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { loadChickenControls, saveChickenControls, subscribeChickenControls } from "@/lib/chicken/controls"

export function VolumeButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [mix, setLocal] = useState<Mix>(DEFAULT_MIX)
  const [muted, setMutedLocal] = useState(false)
  useEffect(() => {
    const sync = () => { setLocal(getMix()); setMutedLocal(isMuted()) }
    sync()
    return subscribeMix(sync)
  }, [])
  // the chicken's clucks on / off (saved with her controls)
  const [clucks, setClucks] = useState(true)
  useEffect(() => {
    setClucks(loadChickenControls().sound)
    return subscribeChickenControls(c => setClucks(c.sound))
  }, [])
  const toggleClucks = (on: boolean) => { const next = structuredClone(loadChickenControls()); next.sound = on; saveChickenControls(next); setClucks(on) }
  const Icon = muted || mix.master <= 0 ? VolumeX : mix.master < 0.5 ? Volume1 : Volume2

  return (
    <>
      <button type="button" aria-label="Volume" aria-pressed={open} title="Volume" onClick={() => setOpen(v => !v)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]", className)}>
        <Icon className="h-4 w-4" />
      </button>
      {/* in the body: the header is its own stacking context, under the game's canvases */}
      {open && createPortal(
        <FloatingPanel id="patio-volume" aria-label="Volume" initial={(vw, vh) => { const w = Math.min(300, vw - 24); return { x: vw - w - 12, y: 64, w, h: Math.min(560, vh - 80) } }} minW={240} minH={260} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div data-drag-handle className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <h2 className="flex-1 text-sm text-white">Volume</h2>
            <button type="button" aria-label="Mute" aria-pressed={muted} title="Mute: silencia todo o jogo sem mexer nos volumes" onClick={() => setMuted(!muted)} className={cn("inline-flex h-8 items-center justify-center rounded-md border px-2 text-[11px] font-bold tracking-wider hover:border-primary", muted ? "border-primary bg-primary/20 text-white" : "border-white/15 text-[#b9c7b9]")}>MUTE</button>
            <button type="button" aria-label="Padrão" title="Padrão: volta todos os volumes para o padrão do jogo" onClick={() => setMix(DEFAULT_MIX)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><RotateCcw className="h-4 w-4" /></button>
            <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-4 py-3">
          <VolumeRange label="Master volume" value={mix.master} onChange={v => setMix({ master: v })} strong dimmed={muted} />
          <div className="grid gap-field border-t border-white/10 pt-3">
            <div className="grid gap-field">
              {MIX_LAYERS.map(l => <VolumeRange key={l.key} label={l.label} hint={l.hint} value={mix[l.key]} onChange={v => setMix({ [l.key]: v })} dimmed={muted} />)}
            </div>
            <label className="flex items-center gap-2" title="Liga e desliga os cacarejos da galinha">
              <input type="checkbox" checked={clucks} onChange={e => toggleClucks(e.target.checked)} className="accent-[var(--primary)]" />
              Cacarejos
            </label>
          </div>
          <SaveToGameButton path={PATIO_DEFAULTS_PATH} save={() => saveDefaultVolume(mix)} className="justify-end" />
          </div>
        </FloatingPanel>,
        document.body,
      )}
    </>
  )
}

function VolumeRange({ label, hint, value, onChange, strong, dimmed }: { label: string; hint?: string; value: number; onChange: (v: number) => void; strong?: boolean; dimmed?: boolean }) {
  const pct = Math.round(value * 100)
  return <PatioRange label={strong ? <strong>{label}</strong> : label} name={label} min={0} max={100} step={5}
    value={pct} display={`${pct}%`} hint={hint} dimmed={dimmed} onChange={v => onChange(v / 100)} />
}
