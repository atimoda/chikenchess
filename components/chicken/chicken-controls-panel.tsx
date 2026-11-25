"use client"

// Character controls panel ("Controles"): the same floating panel on every screen. One list of actions
// with the binds grouped by input type (primary keyboard, secondary keyboard, gamepad), on-screen controls mode and
// clucking sound, saved in this browser.
import { PatioRange } from "@/components/ui/patio-range"
import { useEffect, useRef, useState } from "react"
import { ChevronRight, Gamepad2, Keyboard, Mouse, X, type LucideIcon } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import {
  CHICKEN_ACTIONS, CHICKEN_INPUT_TYPES, HARP_ACTIONS, INVENTORY_ALIGNS, KEYBOARD_INPUT_TYPES, VARIATION_ACTIONS, type HarpAction, PAD_STYLE_LABELS, type PadStyle, chickenBindName, defaultChickenControls, loadChickenControls, loadKeyboardLayoutNames, padStyleAt,
  readGamepadTokens, saveChickenControls, setChickenControlsListening, subscribeChickenControls,
  type ChickenAction, type ChickenControls, type ChickenInputType, type ChickenTouchMode,
} from "@/lib/chicken/controls"
import { startTouchLayoutEdit } from "@/lib/chicken/touch-layout"
import { BINDS_MAX, DEFAULT_KIT, DRUM_PIECES, drumKit, isMoveToken, saveDrumKit, subscribeDrumKit, type DrumKit, type DrumPiece, type MoveToken } from "@/lib/pigchicken/drum-kit"
import { cn } from "@/lib/utils"
import { saveDefaultChickenControls } from "@/lib/admin/game-defaults-client"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"

// Game section where the chicken's movement and look are tuned and saved for every screen.
// list: the actions' grid (main) or the Harpa's own binds (Instrumentos → Harpa)
type Listen = { kind: ChickenInputType; action: ChickenAction; slot: number; list?: "main" } | { kind: ChickenInputType; action: HarpAction; slot: number; list: "harp" } | null
// Instrumentos → Bateria: the kit's shortcuts (lib/pigchicken/drum-kit.ts, the same list as Escalas → Bateria → Kit),
// up to BINDS_MAX per piece, each one a key, a gamepad button or a movement direction
type DrumListen = { piece: DrumPiece; slot: number } | null
const MOVE_LABEL: Record<MoveToken, string> = { "Move:left": "Andar ←", "Move:right": "Andar →", "Move:up": "Andar ↑", "Move:down": "Andar ↓" }
const MOVE_OF: [ChickenAction, MoveToken][] = [["left", "Move:left"], ["right", "Move:right"], ["up", "Move:up"], ["crouch", "Move:down"]]
// a key or button caught for a piece: one that walks a way (on any keyboard or the gamepad) becomes that direction
// ("Andar →": every key and button of hers that walks that way); any other stays itself
const drumToken = (c: ChickenControls, token: string) =>
  MOVE_OF.find(([a]) => CHICKEN_INPUT_TYPES.some(t => c[t.id][a].includes(token)))?.[1] ?? token
const COLUMNS = CHICKEN_INPUT_TYPES.flatMap((t, i) => Array.from({ length: t.slots }, (_, slot) => ({ type: t, slot, column: 2 + CHICKEN_INPUT_TYPES.slice(0, i).reduce((n, t) => n + t.slots + 1, 0) + slot })))
const DISPLAY_ACTIONS = (() => {
  const actions = [...CHICKEN_ACTIONS]
  const downIndex = actions.findIndex(action => action.key === "down")
  const crouchIndex = actions.findIndex(action => action.key === "crouch")
  if (downIndex >= 0 && crouchIndex > downIndex) {
    const [crouch] = actions.splice(crouchIndex, 1)
    actions.splice(downIndex, 0, crouch)
  }
  return actions
})()

// the icon above each input type's label in the bind grid (the secondary keyboard's carries a small 2)
const INPUT_ICONS: Record<ChickenInputType, LucideIcon> = { keys: Keyboard, keys2: Keyboard, pad: Gamepad2 }

// The mouse buttons are fixed (not rebindable): shown in the Mouse column beside the rebindable ones. The wheel's two
// directions are chips in that column, dragged to another action's row to bind them there (ChickenControls.wheel)
const MOUSE_BINDS: Partial<Record<ChickenAction, string>> = { fire: "Botão esq.", melee: "Botão dir." }
const WHEEL_DIRS = [["up", "Roda ↑"], ["down", "Roda ↓"]] as const
type WheelDir = (typeof WHEEL_DIRS)[number][0]

// The Pátio's camera is fixed too (components/pigchicken/parquinho.tsx): shown read-only under the binds, one cell
// per input type. pad: the standard buttons' numbers (Select 8, Start 9, R3 11), named after the connected gamepad.
// keys: the camera key (the one left of 1, held) with what the mouse does meanwhile
const CAMERA_BINDS: { label: string; pad: [number, string]; mouse: string }[] = [
  { label: "Zoom da câmera", pad: [8, "RS ↑↓"], mouse: "roda" },
  { label: "Mover a câmera", pad: [9, "RS"], mouse: "arrastar" },
  { label: "Voltar a câmera", pad: [8, "R3"], mouse: "botão do meio" },
]

const TOUCH_MODES: { value: ChickenTouchMode; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "on", label: "Sempre visível" },
  { value: "off", label: "Nunca mostrar" },
]

// editLayout: shows the button that moves the on-screen controls (the Pátio, where every control exists)
export function ChickenControlsPanel({ open, onOpenChange, editLayout = false }: { open: boolean; onOpenChange: (open: boolean) => void; editLayout?: boolean }) {
  const [controls, setControls] = useState<ChickenControls>(defaultChickenControls)
  const [listen, setListen] = useState<Listen>(null)
  const [drumListen, setDrumListen] = useState<DrumListen>(null)
  const [kit, setKit] = useState<DrumKit>(() => structuredClone(drumKit()))
  useEffect(() => { setKit(structuredClone(drumKit())); return subscribeDrumKit(k => setKit(structuredClone(k))) }, [])
  // the instruments' sub-lists, shut until opened
  const [shown, setShown] = useState<{ harp: boolean; drums: boolean }>({ harp: false, drums: false })
  // a wheel direction being dragged, and the row it is over
  const [wheelDrag, setWheelDrag] = useState<WheelDir | null>(null)
  const [wheelOver, setWheelOver] = useState<ChickenAction | null>(null)
  const listenRef = useRef<Listen>(null)
  listenRef.current = listen
  // the connected gamepad's make (Xbox / PlayStation): the buttons are named after it; a pad shows up after its first press
  const [padStyle, setPadStyle] = useState<PadStyle>("xbox")
  useEffect(() => {
    if (!open) return
    const read = () => setPadStyle(padStyleAt())
    read()
    const timer = window.setInterval(read, 1000)
    window.addEventListener("gamepadconnected", read)
    window.addEventListener("gamepaddisconnected", read)
    return () => { window.clearInterval(timer); window.removeEventListener("gamepadconnected", read); window.removeEventListener("gamepaddisconnected", read) }
  }, [open])

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
      // a key or button belongs to one action only, and a key to one keyboard type only (within each list: a key of
      // the Harpa's never leaves the action that also has it)
      const kinds = KEYBOARD_INPUT_TYPES.includes(l.kind) ? KEYBOARD_INPUT_TYPES : [l.kind]
      if (l.list === "harp") {
        if (token) kinds.forEach(k => HARP_ACTIONS.forEach(a => { c.harp[k][a.key] = c.harp[k][a.key].map(t => t === token ? null : t) }))
        c.harp[l.kind][l.action][l.slot] = token
        return
      }
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

  // a piece's shortcut: the next key (Esc gives up; right click on it clears it) or the next gamepad button pressed
  const setDrum = (l: NonNullable<DrumListen>, token: string | null) => {
    const next = structuredClone(drumKit()), list = next.binds[l.piece]
    if (!token) list.splice(l.slot, 1)
    else if (!list.includes(token)) { if (l.slot < list.length) list[l.slot] = token; else if (list.length < BINDS_MAX) list.push(token) }
    saveDrumKit(next)
  }
  useEffect(() => {
    if (!drumListen) return
    setChickenControlsListening(true)
    const add = (token: string | null) => { setDrum(drumListen, token && drumToken(loadChickenControls(), token)); setDrumListen(null) }
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation()
      if (e.code === "Escape") setDrumListen(null)
      else add(`Key:${e.code}`)
    }
    window.addEventListener("keydown", onKey, true)
    let prev = readGamepadTokens(), raf = 0
    const poll = () => {
      const now = readGamepadTokens()
      const fresh = [...now].find(t => !prev.has(t) && t.startsWith("Pad:b"))
      prev = now
      if (fresh) { add(fresh); return }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => { window.removeEventListener("keydown", onKey, true); cancelAnimationFrame(raf); setChickenControlsListening(false) }
  }, [drumListen])

  useEffect(() => { if (!open) { setListen(null); setDrumListen(null) } }, [open])
  // Esc closes the panel like any floating panel (components/ui/floating-panel.tsx); while waiting for a key it only
  // cancels that
  useEffect(() => () => setChickenControlsListening(false), [])

  // one list of actions; the bind columns are grouped by input type
  const cols = `clamp(7.5rem, 26vw, 15rem) ${CHICKEN_INPUT_TYPES.map(t => `repeat(${t.slots}, 4.75rem)`).join(" 0px ")} 0px minmax(4.5rem, max-content)`
  const mouseColumn = COLUMNS[COLUMNS.length - 1].column + 2
  const grid = (
    <div className="overflow-x-auto">
      <div className="grid w-max min-w-full items-center gap-field text-xs" style={{ gridTemplateColumns: cols }}>
        <span />
        {CHICKEN_INPUT_TYPES.map(t => (
          <span key={t.id} style={{ gridColumn: `${COLUMNS.find(c => c.type.id === t.id)!.column} / span ${t.slots}` }} className="flex flex-col items-center gap-1 border-b border-primary/40 pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-primary">
            <span className="relative" aria-hidden="true">
              {(() => { const Icon = INPUT_ICONS[t.id]; return <Icon className="h-5 w-5" /> })()}
              {t.id === "keys2" && <span className="absolute -right-2 -top-1 font-mono text-[9px] font-bold leading-none">2</span>}
            </span>
            {t.device === "gamepad" && padStyle !== "xbox" ? `${t.label} · ${PAD_STYLE_LABELS[padStyle]}` : t.label}
          </span>
        ))}
        <span style={{ gridColumn: mouseColumn }} className="flex flex-col items-center gap-1 border-b border-primary/40 pb-1 text-center font-mono text-[10px] uppercase tracking-wider text-primary">
          <span aria-hidden="true"><Mouse className="h-5 w-5" /></span>
          Mouse
        </span>
        {DISPLAY_ACTIONS.map((a, i) => (
          <div key={a.key} className="contents">
            {a.group === "items" && DISPLAY_ACTIONS[i - 1]?.group !== "items" && (
              <span style={{ gridColumn: `span ${COLUMNS.length + CHICKEN_INPUT_TYPES.length + 2}` }} className="pt-2 font-mono text-[10px] uppercase tracking-wider text-[#8a9a8a]">Itens (PigChicKen)</span>
            )}
            {a.group === "patio" && DISPLAY_ACTIONS[i - 1]?.group !== "patio" && (
              <span style={{ gridColumn: `span ${COLUMNS.length + CHICKEN_INPUT_TYPES.length + 2}` }} className="pt-2 font-mono text-[10px] uppercase tracking-wider text-[#8a9a8a]">Pátio</span>
            )}
            {(() => {
              // the switches that may also go through the held item's variations: a small checkbox after the name
              const v = VARIATION_ACTIONS.find(x => x.key === a.key)
              if (!v) return <span className="sticky left-0 z-[1] truncate bg-[#101713] pr-1 text-[#b9c7b9]" title={a.label}>{a.label}</span>
              return (
                <span className="sticky left-0 z-[1] flex min-w-0 items-center gap-1.5 bg-[#101713] pr-1 text-[#b9c7b9]">
                  <span className="truncate" title={a.label}>{a.label}</span>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-[10px] text-[#8a9a8a] hover:text-[#dfe8df]">
                    <input type="checkbox" checked={controls.variations[v.key]} onChange={e => { const on = e.target.checked; update(c => { c.variations[v.key] = on }) }} className="h-3 w-3 accent-[var(--primary)]" />
                    {v.label}
                  </label>
                </span>
              )
            })()}
            {COLUMNS.map(({ type, slot, column }) => {
              const kind = type.id
              const on = listen?.list !== "harp" && listen?.kind === kind && listen.action === a.key && listen.slot === slot
              return (
                <button
                  key={`${kind}-${slot}`}
                  type="button"
                  style={{ gridColumn: column }}
                  title={`${type.label}: clique e aperte ${type.device === "gamepad" ? "um botão" : "uma tecla"}; botão direito apaga`}
                  onClick={() => { setDrumListen(null); setListen(on ? null : { kind, action: a.key, slot }) }}
                  onContextMenu={e => { e.preventDefault(); assign(null, { kind, action: a.key, slot }) }}
                  className={cn("h-7 truncate rounded border border-transparent px-1 font-mono text-[11px] transition-colors focus-visible:border-primary/70", on ? "border-primary bg-primary/20 text-white" : "bg-black/30 text-[#dfe8df] hover:border-primary/60")}
                >
                  {on ? (kind === "pad" ? "no controle…" : "aperte…") : chickenBindName(controls[kind][a.key][slot], padStyle)}
                </button>
              )
            })}
            {(() => {
              const wheels = WHEEL_DIRS.filter(([dir]) => controls.wheel[dir] === a.key)
              const over = wheelDrag && wheelOver === a.key
              return (
                <span style={{ gridColumn: mouseColumn }}
                  onDragOver={e => { if (!wheelDrag) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (wheelOver !== a.key) setWheelOver(a.key) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setWheelOver(o => o === a.key ? null : o) }}
                  onDrop={e => { e.preventDefault(); const dir = wheelDrag; setWheelDrag(null); setWheelOver(null); if (dir) update(c => { c.wheel[dir] = a.key }) }}
                  className={cn("flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded border px-1 font-mono text-[11px] text-[#8a9a8a] transition-colors", over ? "border-primary bg-primary/20" : "border-transparent hover:border-white/20")}>
                  {MOUSE_BINDS[a.key] && <span title="Botão do mouse (fixo)">{MOUSE_BINDS[a.key]}</span>}
                  {wheels.map(([dir, label]) => (
                    <span key={dir} draggable title="Arraste para outra ação"
                      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", label); setWheelDrag(dir) }}
                      onDragEnd={() => { setWheelDrag(null); setWheelOver(null) }}
                      className={cn("cursor-grab rounded bg-black/30 px-1 leading-6 text-[#dfe8df] hover:bg-primary/20 active:cursor-grabbing", wheelDrag === dir && "opacity-40")}>{label}</span>
                  ))}
                  {!MOUSE_BINDS[a.key] && !wheels.length && "—"}
                </span>
              )
            })()}
          </div>
        ))}
        <span style={{ gridColumn: `span ${COLUMNS.length + CHICKEN_INPUT_TYPES.length + 2}` }} className="pt-2 font-mono text-[10px] uppercase tracking-wider text-[#8a9a8a]">Instrumentos</span>
        {(["harp", "drums"] as const).map(list => (
          <div key={list} className="contents">
            <button type="button" aria-expanded={shown[list]} onClick={() => setShown(s => ({ ...s, [list]: !s[list] }))}
              style={{ gridColumn: `span ${COLUMNS.length + CHICKEN_INPUT_TYPES.length + 2}` }}
              className="sticky left-0 flex h-7 items-center gap-1 justify-self-start text-[#b9c7b9] hover:text-white">
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", shown[list] && "rotate-90")} />
              {list === "harp" ? "Harpa" : "Bateria"}
            </button>
            {list === "harp" && shown.harp && HARP_ACTIONS.map(a => (
              <div key={a.key} className="contents">
                <span className="sticky left-0 z-[1] truncate bg-[#101713] pl-5 pr-1 text-[#b9c7b9]" title={a.label}>{a.label}</span>
                {COLUMNS.map(({ type, slot, column }) => {
                  const kind = type.id
                  const on = listen?.list === "harp" && listen.kind === kind && listen.action === a.key && listen.slot === slot
                  return (
                    <button key={`${kind}-${slot}`} type="button" style={{ gridColumn: column }}
                      title={`${type.label}: clique e aperte ${type.device === "gamepad" ? "um botão" : "uma tecla"}; botão direito apaga`}
                      onClick={() => { setDrumListen(null); setListen(on ? null : { kind, action: a.key, slot, list: "harp" }) }}
                      onContextMenu={e => { e.preventDefault(); assign(null, { kind, action: a.key, slot, list: "harp" }) }}
                      className={cn("h-7 truncate rounded border border-transparent px-1 font-mono text-[11px] transition-colors focus-visible:border-primary/70", on ? "border-primary bg-primary/20 text-white" : "bg-black/30 text-[#dfe8df] hover:border-primary/60")}>
                      {on ? (kind === "pad" ? "no controle…" : "aperte…") : chickenBindName(controls.harp[kind][a.key][slot], padStyle)}
                    </button>
                  )
                })}
                <span style={{ gridColumn: mouseColumn }} className="flex h-7 items-center justify-center font-mono text-[11px] text-[#8a9a8a]">—</span>
              </div>
            ))}
            {list === "drums" && shown.drums && DRUM_PIECES.map(p => (
              <div key={p.id} className="contents">
                <span className="sticky left-0 z-[1] truncate bg-[#101713] pl-5 pr-1 text-[#b9c7b9]" title={p.label}>{p.id === "hatOpen" ? "Chimbal aberto (pedal)" : p.label}</span>
                {Array.from({ length: BINDS_MAX }, (_, slot) => {
                  const token = kit.binds[p.id][slot] ?? null
                  const on = drumListen?.piece === p.id && drumListen.slot === slot
                  // only the next free slot takes a new one (the list has no gaps)
                  const free = slot > kit.binds[p.id].length
                  return (
                    <button key={slot} type="button" disabled={free} style={{ gridColumn: `${COLUMNS[slot * 2].column} / ${COLUMNS[slot * 2 + 1].column + 1}` }}
                      title="Clique e aperte uma tecla ou um botão do controle (uma tecla ou botão de andar vale a direção); botão direito apaga"
                      onClick={() => { setListen(null); setDrumListen(on ? null : { piece: p.id, slot }) }}
                      onContextMenu={e => { e.preventDefault(); if (token) setDrum({ piece: p.id, slot }, null) }}
                      className={cn("h-7 truncate rounded border border-transparent px-1 font-mono text-[11px] transition-colors focus-visible:border-primary/70 disabled:opacity-30", on ? "border-primary bg-primary/20 text-white" : "bg-black/30 text-[#dfe8df] enabled:hover:border-primary/60")}>
                      {on ? "aperte…" : !token ? "" : isMoveToken(token) ? MOVE_LABEL[token] : chickenBindName(token, padStyle)}
                    </button>
                  )
                })}
                <span style={{ gridColumn: mouseColumn }} className="flex h-7 items-center justify-center font-mono text-[11px] text-[#8a9a8a]">—</span>
              </div>
            ))}
          </div>
        ))}
        <span style={{ gridColumn: `span ${COLUMNS.length + CHICKEN_INPUT_TYPES.length + 2}` }} className="pt-2 font-mono text-[10px] uppercase tracking-wider text-[#8a9a8a]">Câmera do Pátio (fixos)</span>
        {CAMERA_BINDS.map(b => {
          const fixed = "flex h-7 items-center justify-center truncate rounded border border-transparent px-1 font-mono text-[11px] text-[#8a9a8a]"
          const span = (type: ChickenInputType) => { const t = CHICKEN_INPUT_TYPES.find(x => x.id === type)!; return `${COLUMNS.find(c => c.type.id === type)!.column} / span ${t.slots}` }
          const padText = `${chickenBindName(`Pad:b${b.pad[0]}`, padStyle)} + ${b.pad[1]}`
          const named = chickenBindName("Key:Backquote"), camKey = named === "Backquote" ? "`" : named
          return (
            <div key={b.label} className="contents">
              <span className="sticky left-0 z-[1] truncate bg-[#101713] pr-1 text-[#b9c7b9]" title={b.label}>{b.label}</span>
              <span style={{ gridColumn: span("keys") }} className={fixed} title="Tecla fixa: segurar e usar o mouse">{`${camKey} + ${b.mouse}`}</span>
              <span style={{ gridColumn: span("keys2") }} className={fixed}>—</span>
              <span style={{ gridColumn: span("pad") }} className={fixed} title="Botões fixos">{padText}</span>
              <span style={{ gridColumn: mouseColumn }} className={fixed}>—</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (!open) return null
  return (
    <FloatingPanel
      id="chicken-controls" role="dialog" aria-label="Controles"
      initial={(vw, vh) => { const w = Math.min(1040, vw - 32); return { x: (vw - w) / 2, y: 16, w, h: Math.min(820, vh - 32) } }}
      minW={300} className="rounded-lg border border-primary/30 bg-[#101713] text-[#dfe8df] shadow-lg"
    >
      <div data-drag-handle className="flex shrink-0 items-center gap-2 border-b border-white/10 px-6 py-3">
        <h2 className="flex-1 font-mono text-sm uppercase tracking-widest">Controles</h2>
        <button type="button" aria-label="Fechar controles" onClick={() => onOpenChange(false)} className="rounded p-1 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto p-6">
        <section className="grid gap-2">
          {grid}
        </section>
        <section className="grid gap-field">
          <h3 className="mb-1.5 font-mono text-xs uppercase tracking-wider text-primary">Inventário</h3>
          <div role="radiogroup" aria-label="Alinhamento do inventário" className="flex flex-wrap gap-field">
            {INVENTORY_ALIGNS.map(m => (
              <button key={m.value} type="button" role="radio" aria-checked={controls.inventory.align === m.value} onClick={() => update(c => { c.inventory.align = m.value })} className={cn("h-7 rounded border px-3 text-xs transition-colors", controls.inventory.align === m.value ? "border-primary bg-primary/20 text-white" : "border-white/15 bg-black/30 hover:border-primary/60")}>{m.label}</button>
            ))}
          </div>
          <div className="grid gap-field">
          <PatioRange label="Repetir troca após segurar" min={0.2} max={5} step={0.1} value={controls.inventory.repeatDelay}
            display={`${controls.inventory.repeatDelay.toFixed(1)} s`} onChange={v => update(c => { c.inventory.repeatDelay = v })} />
          <PatioRange label="Intervalo entre trocas" min={0.1} max={2} step={0.1} value={controls.inventory.repeatInterval}
            display={`${controls.inventory.repeatInterval.toFixed(1)} s`} onChange={v => update(c => { c.inventory.repeatInterval = v })} />
          </div>
        </section>
        <section className="grid gap-field">
          <h3 className="mb-1.5 font-mono text-xs uppercase tracking-wider text-primary">Analógicos</h3>
          <div className="grid gap-field">
          {([["deadzoneL", "Zona morta do esquerdo"], ["deadzoneR", "Zona morta do direito"]] as const).map(([k, label]) => (
            <PatioRange key={k} label={label} min={0} max={90} value={Math.round(controls.analog[k] * 100)}
              display={`${Math.round(controls.analog[k] * 100)}%`} onChange={v => update(c => { c.analog[k] = v / 100 })} />
          ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.analog.magnetDeg > 0} onChange={e => { const v = e.target.checked; update(c => { c.analog.magnetDeg = v ? c.analog.magnetRestoreDeg : 0; c.analog.magnet = v }) }} className="accent-[var(--primary)]" />
            Ímã dos 8 ângulos na movimentação
          </label>
          <div className="grid gap-field">
          <PatioRange label="Força do ímã dos 8 ângulos na movimentação" min={0} max={22.5} step={0.5} value={controls.analog.magnetDeg}
            display={`${controls.analog.magnetDeg}°`} onChange={v => update(c => { c.analog.magnetDeg = v; c.analog.magnet = v > 0; if (v > 0) c.analog.magnetRestoreDeg = v })} />
          <PatioRange label="Força do ímã dos 8 ângulos na mira" min={0} max={22.5} step={0.5} value={controls.analog.aimMagnetDeg}
            display={`${controls.analog.aimMagnetDeg}°`} onChange={v => update(c => { c.analog.aimMagnetDeg = v })} />
          <PatioRange label="Caminhada lenta (analógico abaixo de 80%)" min={0.1} max={1} step={0.05} value={controls.analog.slowWalk}
            display={`${controls.analog.slowWalk.toFixed(2).replace(/0$/, "").replace(".", ",")}x`} onChange={v => update(c => { c.analog.slowWalk = v })} />
          </div>
        </section>
        <section className="grid gap-field">
          <h3 className="mb-1.5 font-mono text-xs uppercase tracking-wider text-primary">Touch Controls</h3>
          <div className="flex flex-wrap gap-field">
            {TOUCH_MODES.map(m => (
              <button key={m.value} type="button" onClick={() => update(c => { c.touch = m.value })} className={cn("h-7 rounded border px-3 text-xs transition-colors", controls.touch === m.value ? "border-primary bg-primary/20 text-white" : "border-white/15 bg-black/30 hover:border-primary/60")}>{m.label}</button>
            ))}
          </div>
          <p className="text-[11px] text-[#8a9a8a]">Analógico à esquerda e botões de pular, chocar e correr à direita. Automático mostra em telas de toque.</p>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.touchRunGrab} onChange={e => { const v = e.target.checked; update(c => { c.touchRunGrab = v }) }} className="accent-[var(--primary)]" />
            Correr também pega itens do chão
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.touchScreenAim} onChange={e => { const v = e.target.checked; update(c => { c.touchScreenAim = v }) }} className="accent-[var(--primary)]" />
            Tela serve como mira
          </label>
          <p className="text-[11px] text-[#8a9a8a]">Tocar no cenário mira e atira ali e anda até lá; tocar no item ou no que o Pegar oferece faz Pegar.</p>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={controls.touchAimStick} onChange={e => { const v = e.target.checked; update(c => { c.touchAimStick = v }) }} className="accent-[var(--primary)]" />
            Exibir analógico touch de mira
          </label>
          {editLayout && (
            <>
              <button type="button" onClick={() => { startTouchLayoutEdit(); onOpenChange(false) }} className="h-8 justify-self-start rounded border border-primary/60 bg-primary/10 px-3 text-xs transition-colors hover:bg-primary/25">Editar posição dos botões</button>
              <p className="text-[11px] text-[#8a9a8a]">Arraste cada botão individualmente, os analógicos e o inventário para onde ficarem melhor e toque em Ok.</p>
            </>
          )}
        </section>
        {/* admins: these controls become the game's default (data/chicken/default-controls.json) */}
        <SaveToGameButton part="controls" save={() => saveDefaultChickenControls(controls)} className="justify-end"
          onRevert={() => { const d = defaultChickenControls(); saveChickenControls(d); setControls(d); setListen(null); setDrumListen(null); saveDrumKit({ ...structuredClone(drumKit()), binds: structuredClone(DEFAULT_KIT.binds) }) }} />
      </div>
    </FloatingPanel>
  )
}
