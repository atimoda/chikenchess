"use client"

// The Pátio header's volume button and its popup: the master volume on top and one slider per sound layer
// (lib/pigchicken/mixer.ts). Everything is saved in this browser and heard at once.
import { PatioRange } from "@/components/ui/patio-range"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Volume1, Volume2, VolumeX, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { DEFAULT_MIX, MIX_LAYERS, getMix, setMix, subscribeMix, type Mix } from "@/lib/pigchicken/mixer"
import { loadChickenControls, saveChickenControls, subscribeChickenControls } from "@/lib/chicken/controls"

export function VolumeButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [mix, setLocal] = useState<Mix>(DEFAULT_MIX)
  useEffect(() => {
    setLocal(getMix())
    return subscribeMix(() => setLocal(getMix()))
  }, [])
  // the chicken's clucks on / off (saved with her controls)
  const [clucks, setClucks] = useState(true)
  useEffect(() => {
    setClucks(loadChickenControls().sound)
    return subscribeChickenControls(c => setClucks(c.sound))
  }, [])
  const toggleClucks = (on: boolean) => { const next = structuredClone(loadChickenControls()); next.sound = on; saveChickenControls(next); setClucks(on) }
  const Icon = mix.master <= 0 ? VolumeX : mix.master < 0.5 ? Volume1 : Volume2

  return (
    <>
      <button type="button" aria-label="Volume" aria-pressed={open} title="Volume" onClick={() => setOpen(v => !v)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", open ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]", className)}>
        <Icon className="h-4 w-4" />
      </button>
      {/* in the body: the header is its own stacking context, under the game's canvases */}
      {open && createPortal(
        <FloatingPanel id="patio-volume" aria-label="Volume" initial={(vw, vh) => { const w = Math.min(300, vw - 24); return { x: vw - w - 12, y: 64, w, h: Math.min(560, vh - 80) } }} minW={240} minH={260} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
            <h2 className="flex-1 text-sm text-white">Volume</h2>
            <button type="button" onClick={() => setMix(DEFAULT_MIX)} className="h-7 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>
            <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
          </div>
          <VolumeRange label="Master volume" value={mix.master} onChange={v => setMix({ master: v })} strong />
          <div className="grid gap-3 border-t border-white/10 pt-3">
            {MIX_LAYERS.map(l => <VolumeRange key={l.key} label={l.label} hint={l.hint} value={mix[l.key]} onChange={v => setMix({ [l.key]: v })} />)}
            <label className="flex items-center gap-2" title="Liga e desliga os cacarejos da galinha">
              <input type="checkbox" checked={clucks} onChange={e => toggleClucks(e.target.checked)} className="accent-[var(--primary)]" />
              Cacarejos
            </label>
          </div>
        </FloatingPanel>,
        document.body,
      )}
    </>
  )
}

function VolumeRange({ label, hint, value, onChange, strong }: { label: string; hint?: string; value: number; onChange: (v: number) => void; strong?: boolean }) {
  const pct = Math.round(value * 100)
  return <PatioRange label={strong ? <strong>{label}</strong> : label} name={label} min={0} max={100} step={5}
    value={pct} display={`${pct}%`} hint={hint} onChange={v => onChange(v / 100)} />
}
