"use client"

// Chicken controls panel: the same floating panel on every screen. Keyboard and gamepad binds
// (3 slots per action), on-screen controls mode and clucking sound, saved in this browser.
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import {
  CHICKEN_ACTIONS, chickenBindName, defaultChickenControls, loadChickenControls, readGamepadTokens, saveChickenControls,
  setChickenControlsListening, subscribeChickenControls, type ChickenAction, type ChickenControls, type ChickenTouchMode,
} from "@/lib/chicken/controls"
import { startTouchLayoutEdit } from "@/lib/chicken/touch-layout"
import { cn } from "@/lib/utils"

// Game section where the chicken's movement and look are tuned and saved for every screen.
const CHICKEN_PATIO_PATH = "/patio"

type Listen = { kind: "keys" | "pad"; action: ChickenAction; slot: number } | null

const TOUCH_MODES: { value: ChickenTouchMode; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "on", label: "Sempre" },
  { value: "off", label: "Nunca" },
]

// editLayout: shows the button that moves the on-screen controls (the Pátio, where every control exists)
export function ChickenControlsPanel({ open, onOpenChange, editLayout = false }: { open: boolean; onOpenChange: (open: boolean) => void; editLayout?: boolean }) {
  const [controls, setControls] = useState<ChickenControls>(defaultChickenControls)
  const [listen, setListen] = useState<Listen>(null)
  const listenRef = useRef<Listen>(null)
  listenRef.current = listen

  useEffect(() => {
    setControls(loadChickenControls())
    return subscribeChickenControls(setControls)
  }, [])

  const update = (fn: (c: ChickenControls) => void) => {
    const next: ChickenControls = structuredClone(loadChickenControls())
    fn(next)
    saveChickenControls(next)
    setControls(next)
  }
  const assign = (token: string | null) => {
    const l = listenRef.current
    if (!l) return
    update(c => {
      // a key or button belongs to one action only
      if (token) CHICKEN_ACTIONS.forEach(a => { c[l.kind][a.key] = c[l.kind][a.key].map(t => t === token ? null : t) })
      c[l.kind][l.action][l.slot] = token
    })
    setListen(null)
  }

  useEffect(() => {
    setChickenControlsListening(!!listen)
    if (!listen) return
    if (listen.kind === "keys") {
      const onKey = (e: KeyboardEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (e.code === "Escape") setListen(null)
        else if (e.code === "Delete" || e.code === "Backspace") assign(null)
        else assign(`Key:${e.code}`)
      }
      window.addEventListener("keydown", onKey, true)
      return () => window.removeEventListener("keydown", onKey, true)
    }
    // gamepad: wait for a button or stick that was not already held when listening started
    let prev = readGamepadTokens(), raf = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") { e.preventDefault(); setListen(null) }
      else if (e.code === "Delete" || e.code === "Backspace") { e.preventDefault(); assign(null) }
    }
    const poll = () => {
      const now = readGamepadTokens()
      const fresh = [...now].find(t => !prev.has(t))
      prev = now
      if (fresh) { assign(fresh); return }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    window.addEventListener("keydown", onKey, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey, true) }
  }, [listen])

  useEffect(() => { if (!open) setListen(null) }, [open])
  // Esc closes the panel (while waiting for a key, Esc only cancels that)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.code === "Escape" && !listenRef.current) onOpenChange(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])
  useEffect(() => () => setChickenControlsListening(false), [])

  const grid = (kind: "keys" | "pad") => (
    <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,4.5rem))] items-center gap-1.5 text-xs">
      {CHICKEN_ACTIONS.map((a, i) => (
        <div key={a.key} className="contents">
          {a.group === "items" && CHICKEN_ACTIONS[i - 1]?.group !== "items" && (
            <span className="col-span-4 pt-2 font-mono text-[10px] uppercase tracking-wider text-[#8a9a8a]">Itens (PigChicKen)</span>
          )}
          <span className="truncate text-[#b9c7b9]" title={a.label}>{a.label}</span>
          {[0, 1, 2].map(slot => {
            const on = listen?.kind === kind && listen.action === a.key && listen.slot === slot
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setListen(on ? null : { kind, action: a.key, slot })}
                className={cn("h-7 truncate rounded border px-1 font-mono text-[11px] transition-colors", on ? "border-primary bg-primary/20 text-white" : "border-white/15 bg-black/30 text-[#dfe8df] hover:border-primary/60")}
              >
                {on ? (kind === "pad" ? "no controle…" : "aperte…") : chickenBindName(controls[kind][a.key][slot])}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  if (!open) return null
  return (
    <FloatingPanel
      id="chicken-controls" role="dialog" aria-label="Controles da galinha"
      initial={(vw, vh) => { const w = Math.min(576, vw - 32); return { x: (vw - w) / 2, y: 16, w, h: Math.min(820, vh - 32) } }}
      minW={300} className="z-[230] rounded-lg border border-primary/30 bg-[#101713] text-[#dfe8df] shadow-lg"
    >
      <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2 border-b border-white/10 px-6 py-3">
        <h2 className="flex-1 font-mono text-sm uppercase tracking-widest">Controles da galinha</h2>
        <button type="button" aria-label="Fechar controles" onClick={() => onOpenChange(false)} className="rounded p-1 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto p-6">
        <p className="text-xs text-[#9fb09f]">Os mesmos controles valem em todas as telas e ficam salvos só neste navegador. Clique num campo e aperte uma tecla ou botão. Esc cancela, Delete apaga.</p>
        <section className="grid gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-primary">Teclado</h3>
          {grid("keys")}
          <p className="text-[11px] text-[#8a9a8a]">O navegador não deixa bloquear alguns atalhos com Ctrl: Ctrl junto com W fecha a aba.</p>
        </section>
        <section className="grid gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-primary">Gamepad</h3>
          {grid("pad")}
          <p className="text-[11px] text-[#8a9a8a]">Nomes no padrão Xbox (A, B, X, Y). LS e RS são os analógicos esquerdo e direito. O analógico direito mira.</p>
        </section>
        <section className="grid gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-primary">Analógicos</h3>
          {([["deadzoneL", "Zona morta do esquerdo"], ["deadzoneR", "Zona morta do direito"]] as const).map(([k, label]) => (
            <label key={k} className="grid gap-1 text-xs">
              <span className="flex justify-between"><span>{label}</span><output className="tabular-nums">{Math.round(controls.analog[k] * 100)}%</output></span>
              <input type="range" min={0} max={90} step={1} value={Math.round(controls.analog[k] * 100)} onChange={e => { const v = Number(e.target.value) / 100; update(c => { c.analog[k] = v }) }} className="accent-[var(--primary)]" />
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.analog.magnet} onChange={e => { const v = e.target.checked; update(c => { c.analog.magnet = v }) }} className="accent-[var(--primary)]" />
            Ímã dos 8 ângulos na mira do analógico esquerdo
          </label>
          {controls.analog.magnet && (
            <label className="grid gap-1 text-xs">
              <span className="flex justify-between"><span>Força do ímã</span><output className="tabular-nums">{controls.analog.magnetDeg}°</output></span>
              <input type="range" min={1} max={22.5} step={0.5} value={controls.analog.magnetDeg} onChange={e => { const v = Number(e.target.value); update(c => { c.analog.magnetDeg = v }) }} className="accent-[var(--primary)]" />
            </label>
          )}
          <p className="text-[11px] text-[#8a9a8a]">No mouse: clique esquerdo atira, clique direito dá o golpe, a rodinha troca o item. As teclas 1 a 9 escolhem o item. Com a roda do inventário aberta, o mouse ou o analógico direito escolhe o item.</p>
        </section>
        <section className="grid gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-primary">Na tela (celular)</h3>
          <div className="flex flex-wrap gap-1.5">
            {TOUCH_MODES.map(m => (
              <button key={m.value} type="button" onClick={() => update(c => { c.touch = m.value })} className={cn("h-7 rounded border px-3 text-xs transition-colors", controls.touch === m.value ? "border-primary bg-primary/20 text-white" : "border-white/15 bg-black/30 hover:border-primary/60")}>{m.label}</button>
            ))}
          </div>
          <p className="text-[11px] text-[#8a9a8a]">Analógico à esquerda e botões de pular, chocar e correr à direita. Automático mostra em telas de toque.</p>
          {editLayout && (
            <>
              <button type="button" onClick={() => { startTouchLayoutEdit(); onOpenChange(false) }} className="h-8 justify-self-start rounded border border-primary/60 bg-primary/10 px-3 text-xs transition-colors hover:bg-primary/25">Editar posição dos botões</button>
              <p className="text-[11px] text-[#8a9a8a]">Arraste os analógicos, os botões e o inventário para onde ficarem melhor e toque em Ok.</p>
            </>
          )}
        </section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.sound} onChange={e => { const v = e.target.checked; update(c => { c.sound = v }) }} className="accent-[var(--primary)]" />
            Cacarejos
          </label>
          <Link href={CHICKEN_PATIO_PATH} onClick={() => onOpenChange(false)} className="text-xs text-primary underline-offset-2 hover:underline">Pátio da Galinha</Link>
          <button type="button" onClick={() => { const d = defaultChickenControls(); saveChickenControls(d); setControls(d); setListen(null) }} className="h-8 rounded border border-white/20 px-3 text-xs hover:border-primary">Restaurar padrão</button>
        </div>
      </div>
    </FloatingPanel>
  )
}
