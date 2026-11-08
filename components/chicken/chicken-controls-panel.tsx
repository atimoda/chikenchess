"use client"

// Character controls panel ("Controles do boneco"): the same floating panel on every screen. One list of actions
// with the binds grouped by input type (primary keyboard, secondary keyboard, gamepad), on-screen controls mode and
// clucking sound, saved in this browser.
import { PatioRange } from "@/components/ui/patio-range"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Gamepad2, Keyboard, X, type LucideIcon } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { InfoTip } from "@/components/info-tip"
import {
  CHICKEN_ACTIONS, CHICKEN_INPUT_TYPES, KEYBOARD_INPUT_TYPES, chickenBindName, defaultChickenControls, loadChickenControls, loadKeyboardLayoutNames,
  readGamepadTokens, saveChickenControls, setChickenControlsListening, subscribeChickenControls,
  type ChickenAction, type ChickenControls, type ChickenInputType, type ChickenTouchMode,
} from "@/lib/chicken/controls"
import { startTouchLayoutEdit } from "@/lib/chicken/touch-layout"
import { cn } from "@/lib/utils"

// Game section where the chicken's movement and look are tuned and saved for every screen.
const CHICKEN_PATIO_PATH = "/patio"

type Listen = { kind: ChickenInputType; action: ChickenAction; slot: number } | null
const COLUMNS = CHICKEN_INPUT_TYPES.flatMap((t, i) => Array.from({ length: t.slots }, (_, slot) => ({ type: t, slot, column: 2 + CHICKEN_INPUT_TYPES.slice(0, i).reduce((n, t) => n + t.slots + 1, 0) + slot })))

// the icon above each input type's label in the bind grid (the secondary keyboard's carries a small 2)
const INPUT_ICONS: Record<ChickenInputType, LucideIcon> = { keys: Keyboard, keys2: Keyboard, pad: Gamepad2 }

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
    // punctuation binds show this keyboard layout's character (re-render once the layout is known)
    void loadKeyboardLayoutNames().then(() => setControls(loadChickenControls()))
    return subscribeChickenControls(setControls)
  }, [])

  const update = (fn: (c: ChickenControls) => void) => {
    const next: ChickenControls = structuredClone(loadChickenControls())
    fn(next)
    saveChickenControls(next)
    setControls(next)
  }
  const assign = (token: string | null, target: Listen = listenRef.current) => {
    const l = target
    if (!l) return
    update(c => {
      // a key or button belongs to one action only, and a key to one keyboard type only
      const kinds = KEYBOARD_INPUT_TYPES.includes(l.kind) ? KEYBOARD_INPUT_TYPES : [l.kind]
      if (token) kinds.forEach(k => CHICKEN_ACTIONS.forEach(a => { c[k][a.key] = c[k][a.key].map(t => t === token ? null : t) }))
      c[l.kind][l.action][l.slot] = token
    })
    setListen(null)
  }

  useEffect(() => {
    setChickenControlsListening(!!listen)
    if (!listen) return
    if (listen.kind !== "pad") {
      // every key can be bound, Delete and Backspace included (the secondary keyboard uses them): right click clears
      const onKey = (e: KeyboardEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (e.code === "Escape") setListen(null)
        else if (e.code) assign(`Key:${e.code}`)
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

  // one list of actions; the bind columns are grouped by input type
  const cols = `clamp(7.5rem, 30vw, 14rem) ${CHICKEN_INPUT_TYPES.map(t => `repeat(${t.slots}, 4.75rem)`).join(" 0px ")}`
  const grid = (
    <div className="overflow-x-auto">
      <div className="grid w-max min-w-full items-center gap-x-1.5 gap-y-1.5 text-xs" style={{ gridTemplateColumns: cols }}>
        <span />
        {CHICKEN_INPUT_TYPES.map(t => (
          <span key={t.id} style={{ gridColumn: `${COLUMNS.find(c => c.type.id === t.id)!.column} / span ${t.slots}` }} className="flex flex-col items-center gap-1 border-b border-primary/40 pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-primary">
            <span className="relative" aria-hidden="true">
              {(() => { const Icon = INPUT_ICONS[t.id]; return <Icon className="h-5 w-5" /> })()}
              {t.id === "keys2" && <span className="absolute -right-2 -top-1 font-mono text-[9px] font-bold leading-none">2</span>}
            </span>
            {t.label}
          </span>
        ))}
        {CHICKEN_ACTIONS.map((a, i) => (
          <div key={a.key} className="contents">
            {a.group === "items" && CHICKEN_ACTIONS[i - 1]?.group !== "items" && (
              <span style={{ gridColumn: `span ${COLUMNS.length + CHICKEN_INPUT_TYPES.length}` }} className="pt-2 font-mono text-[10px] uppercase tracking-wider text-[#8a9a8a]">Itens (PigChicKen)</span>
            )}
            <span className="sticky left-0 z-[1] truncate bg-[#101713] pr-1 text-[#b9c7b9]" title={a.label}>{a.label}</span>
            {COLUMNS.map(({ type, slot, column }) => {
              const kind = type.id
              const on = listen?.kind === kind && listen.action === a.key && listen.slot === slot
              return (
                <button
                  key={`${kind}-${slot}`}
                  type="button"
                  style={{ gridColumn: column }}
                  title={`${type.label}: clique e aperte ${type.device === "gamepad" ? "um botão" : "uma tecla"}; botão direito apaga`}
                  onClick={() => setListen(on ? null : { kind, action: a.key, slot })}
                  onContextMenu={e => { e.preventDefault(); assign(null, { kind, action: a.key, slot }) }}
                  className={cn("h-7 truncate rounded border px-1 font-mono text-[11px] transition-colors", on ? "border-primary bg-primary/20 text-white" : "border-white/15 bg-black/30 text-[#dfe8df] hover:border-primary/60")}
                >
                  {on ? (kind === "pad" ? "no controle…" : "aperte…") : chickenBindName(controls[kind][a.key][slot])}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  if (!open) return null
  return (
    <FloatingPanel
      id="chicken-controls" role="dialog" aria-label="Controles do boneco"
      initial={(vw, vh) => { const w = Math.min(980, vw - 32); return { x: (vw - w) / 2, y: 16, w, h: Math.min(820, vh - 32) } }}
      minW={300} className="z-[230] rounded-lg border border-primary/30 bg-[#101713] text-[#dfe8df] shadow-lg"
    >
      <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2 border-b border-white/10 px-6 py-3">
        <h2 className="flex-1 font-mono text-sm uppercase tracking-widest">Controles do boneco</h2>
        <button type="button" aria-label="Fechar controles" onClick={() => onOpenChange(false)} className="rounded p-1 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto p-6">
        <section className="grid gap-2">
          <h3 className="flex w-fit items-center gap-1 font-mono text-xs uppercase tracking-wider text-primary">Movimentos<InfoTip label="Controles de movimento"><div className="space-y-2"><p>Primary keyboard é a mão esquerda (WASD); Secondary keyboard é a mão direita (setas e o bloco Ins/Home/PgUp/Del/End/PgDn), pensado para um segundo jogador no mesmo teclado. Teclados de notebook (Mac principalmente) não têm esse bloco nem Ctrl direito: troque por teclas perto das setas, como / . ; e Enter. O navegador não deixa bloquear alguns atalhos com Ctrl: Ctrl junto com W fecha a aba.</p><p>Gamepad: nomes no padrão Xbox (A, B, X, Y). LS e RS são os analógicos esquerdo e direito. O analógico direito mira.</p></div></InfoTip></h3>
          {grid}
        </section>
        <section className="grid gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-primary">Analógicos</h3>
          {([["deadzoneL", "Zona morta do esquerdo"], ["deadzoneR", "Zona morta do direito"]] as const).map(([k, label]) => (
            <PatioRange key={k} label={label} min={0} max={90} value={Math.round(controls.analog[k] * 100)}
              display={`${Math.round(controls.analog[k] * 100)}%`} onChange={v => update(c => { c.analog[k] = v / 100 })} />
          ))}
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.analog.magnetDeg > 0} onChange={e => { const v = e.target.checked; update(c => { c.analog.magnetDeg = v ? c.analog.magnetRestoreDeg : 0; c.analog.magnet = v }) }} className="accent-[var(--primary)]" />
            Ímã dos 8 ângulos na movimentação
          </label>
          <PatioRange label="Força do ímã dos 8 ângulos na movimentação" min={0} max={22.5} step={0.5} value={controls.analog.magnetDeg}
            display={`${controls.analog.magnetDeg}°`} onChange={v => update(c => { c.analog.magnetDeg = v; c.analog.magnet = v > 0; if (v > 0) c.analog.magnetRestoreDeg = v })} />
          <PatioRange label="Força do ímã dos 8 ângulos na mira" min={0} max={22.5} step={0.5} value={controls.analog.aimMagnetDeg}
            display={`${controls.analog.aimMagnetDeg}°`} onChange={v => update(c => { c.analog.aimMagnetDeg = v })} />
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
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.touchRunGrab} onChange={e => { const v = e.target.checked; update(c => { c.touchRunGrab = v }) }} className="accent-[var(--primary)]" />
            Correr também pega itens do chão
          </label>
          {editLayout && (
            <>
              <button type="button" onClick={() => { startTouchLayoutEdit(); onOpenChange(false) }} className="h-8 justify-self-start rounded border border-primary/60 bg-primary/10 px-3 text-xs transition-colors hover:bg-primary/25">Editar posição dos botões</button>
              <p className="text-[11px] text-[#8a9a8a]">Arraste cada botão individualmente, os analógicos e o inventário para onde ficarem melhor e toque em Ok.</p>
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
