"use client"

// The Bateria's setup (lib/pigchicken/drum-kit.ts), inside the Escalas panel: the same chart the player sees around
// her, with every piece draggable to its place. The piece picked shows its size, whether it sits behind the others
// (out of the drumsticks' reach) and its shortcuts: a key or a gamepad button caught on the next press, or one of
// the player's own movement directions. Below, how the chart is framed around her in the Pátio (its size, its
// shift from her shoulder, whether it always fits the screen). Saved in this browser; the Pátio follows it live.
import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { PatioRange } from "@/components/ui/patio-range"
import { setChickenControlsListening } from "@/lib/chicken/controls"
import { BINDS_MAX, DEFAULT_KIT, DEFAULT_VIEW, MOVE_TOKENS, PAD_R_MAX, PAD_R_MIN, VIEW_SHIFT_MAX, VIEW_SIZE_MAX, VIEW_SIZE_MIN, drumKit, drumPiece, padAt, saveDrumKit, subscribeDrumKit, type DrumKit, type DrumPiece } from "@/lib/pigchicken/drum-kit"
import { drumBindName } from "@/lib/pigchicken/drum-input"
import { drawDrumChart, drumHints } from "@/components/pigchicken/draw/drum-chart"

const MOVE_LABEL: Record<string, string> = { "Move:left": "Andar ←", "Move:right": "Andar →", "Move:up": "Andar ↑", "Move:down": "Andar ↓" }

export function DrumKitEditor() {
  const [kit, setKit] = useState<DrumKit>(DEFAULT_KIT)
  const [sel, setSel] = useState<DrumPiece>("snare")
  // the piece whose next key or button press becomes a shortcut
  const [listening, setListening] = useState<DrumPiece | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ piece: DrumPiece; dx: number; dy: number } | null>(null)
  useEffect(() => { setKit(drumKit()); return subscribeDrumKit(setKit) }, [])
  const update = (fn: (k: DrumKit) => void) => { const next = structuredClone(kit); fn(next); saveDrumKit(next); setKit(drumKit()) }

  // the chart: her shoulder in the middle, the radius a little inside the canvas
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
      const ctx = c.getContext("2d")
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const r = Math.min(w, h) / 2 - 6
      ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.stroke()
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill()
      drawDrumChart(ctx, kit, w / 2, h / 2, r, { alpha: 1, lines: 1, selected: sel, hint: drumHints(kit, drumBindName) })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [kit, sel])

  const chartPoint = (e: React.PointerEvent) => {
    const c = canvas.current!, b = c.getBoundingClientRect(), r = Math.min(b.width, b.height) / 2 - 6
    return { x: (e.clientX - b.left - b.width / 2) / r, y: (e.clientY - b.top - b.height / 2) / r }
  }
  const onDown = (e: React.PointerEvent) => {
    const p = chartPoint(e), hit = padAt(kit, p.x, p.y, true)
    if (!hit) return
    setSel(hit.piece)
    drag.current = { piece: hit.piece, dx: hit.x - p.x, dy: hit.y - p.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = chartPoint(e)
    let x = p.x + d.dx, y = p.y + d.dy
    const len = Math.hypot(x, y)
    if (len > 1) { x /= len; y /= len }
    update(k => { const pad = k.pads.find(q => q.piece === d.piece); if (pad) { pad.x = x; pad.y = y } })
  }
  const onUp = () => { drag.current = null }

  // catching a shortcut: the next key (Esc gives up) or the next gamepad button pressed
  useEffect(() => {
    if (!listening) return
    setChickenControlsListening(true)
    const add = (token: string) => {
      update(k => { const list = k.binds[listening]; if (!list.includes(token) && list.length < BINDS_MAX) list.push(token) })
      setListening(null)
    }
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation()
      if (e.code === "Escape") setListening(null)
      else add("Key:" + e.code)
    }
    window.addEventListener("keydown", onKey, true)
    // (the buttons already down when it started do not count)
    const pads = () => Array.from(navigator.getGamepads?.() ?? []).filter((g): g is Gamepad => !!g && g.connected)
    const down = new Set(pads().flatMap(g => g.buttons.flatMap((b, i) => (b.pressed || b.value > 0.5 ? [`${g.index}:${i}`] : []))))
    let raf = 0
    const poll = () => {
      for (const g of pads()) {
        for (let i = 0; i < g.buttons.length; i++) {
          const on = g.buttons[i].pressed || g.buttons[i].value > 0.5, key = `${g.index}:${i}`
          if (!on) down.delete(key)
          else if (!down.has(key)) { add("Pad:b" + i); return }
        }
      }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => { window.removeEventListener("keydown", onKey, true); cancelAnimationFrame(raf); setChickenControlsListening(false) }
  }, [listening])

  const pad = kit.pads.find(p => p.piece === sel), base = DEFAULT_KIT.pads.find(p => p.piece === sel)
  const binds = (piece: DrumPiece, title: string) => (
    <div className="grid gap-1.5">
      <span className="text-white/70">{title}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {kit.binds[piece].map(t => (
          <span key={t} className="inline-flex h-7 items-center gap-1 rounded-md border border-white/20 pl-2 pr-1">
            {MOVE_LABEL[t] ?? drumBindName(t)}
            <button type="button" aria-label={`Tirar o atalho ${MOVE_LABEL[t] ?? drumBindName(t)}`} onClick={() => update(k => { k.binds[piece] = k.binds[piece].filter(b => b !== t) })} className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-white/10"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {kit.binds[piece].length < BINDS_MAX && (
          <>
            <button type="button" onClick={() => setListening(listening === piece ? null : piece)} className={`h-7 rounded-md border px-2 ${listening === piece ? "border-primary text-primary" : "border-white/20 hover:border-primary"}`}>
              {listening === piece ? "Aperte uma tecla ou botão…" : "+ tecla ou botão"}
            </button>
            <select aria-label={`Atalho de andar para ${title}`} value="" onChange={e => { const t = e.target.value; if (t) update(k => { if (!k.binds[piece].includes(t)) k.binds[piece].push(t) }) }} className="h-7 rounded-md border border-white/15 bg-[#0b110e] px-1">
              <option value="">+ andar</option>
              {MOVE_TOKENS.filter(t => !kit.binds[piece].includes(t)).map(t => <option key={t} value={t}>{MOVE_LABEL[t]}</option>)}
            </select>
          </>
        )}
      </div>
    </div>
  )
  return (
    <div className="grid gap-3 px-4 pb-4">
      <canvas ref={canvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className="aspect-square w-full cursor-grab touch-none rounded-lg bg-black/30 active:cursor-grabbing" />
      {pad && base && (
        <>
          <div className="flex items-center justify-between gap-3">
            <select aria-label="Peça" value={sel} onChange={e => setSel(e.target.value as DrumPiece)} className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white">
              {kit.pads.map(p => <option key={p.piece} value={p.piece}>{drumPiece(p.piece).label}</option>)}
            </select>
          </div>
          <PatioRange label="Tamanho" min={PAD_R_MIN} max={PAD_R_MAX} step={0.01} value={pad.r} display={pad.r.toFixed(2)} changed={pad.r !== base.r} hint="O raio do botão (fração do raio da escala)"
            onChange={n => update(k => { k.pads.find(p => p.piece === sel)!.r = n })} onReset={() => update(k => { k.pads.find(p => p.piece === sel)!.r = base.r })} />
          <label className="flex items-center justify-between gap-3" title="Fica por baixo das outras peças e fora do alcance dos analógicos: toca pelo atalho ou clicando na parte que aparece">
            <span>Atrás das outras</span>
            <input type="checkbox" checked={pad.back} onChange={e => { const v = e.target.checked; update(k => { k.pads.find(p => p.piece === sel)!.back = v }) }} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          {binds(sel, sel === "hat" ? "Atalhos (fechado)" : "Atalhos")}
          {sel === "hat" && binds("hatOpen", "Atalhos do pedal (aberto)")}
        </>
      )}
      {/* how the chart is framed around the player in the Pátio */}
      <div className="grid gap-[3px] border-t border-white/10 pt-3">
        <span className="pb-1 text-white/70">Enquadramento no Pátio</span>
        <PatioRange label="Tamanho da escala" min={VIEW_SIZE_MIN} max={VIEW_SIZE_MAX} step={0.05} value={kit.view.size} display={`${kit.view.size.toFixed(2)}x`} changed={kit.view.size !== DEFAULT_VIEW.size} hint="O raio da escala em volta dela (não segue o Escalas (Tamanho) das camadas)"
          onChange={n => update(k => { k.view.size = n })} onReset={() => update(k => { k.view.size = DEFAULT_VIEW.size })} />
        <PatioRange label="Deslocar para os lados" min={-VIEW_SHIFT_MAX} max={VIEW_SHIFT_MAX} step={0.05} value={kit.view.dx} display={kit.view.dx.toFixed(2)} changed={kit.view.dx !== 0} hint="Quanto o meio da escala fica à direita (ou, negativo, à esquerda) do ombro dela, em raios"
          onChange={n => update(k => { k.view.dx = n })} onReset={() => update(k => { k.view.dx = 0 })} />
        <PatioRange label="Deslocar para cima ou para baixo" min={-VIEW_SHIFT_MAX} max={VIEW_SHIFT_MAX} step={0.05} value={kit.view.dy} display={kit.view.dy.toFixed(2)} changed={kit.view.dy !== 0} hint="Quanto o meio da escala fica abaixo (ou, negativo, acima) do ombro dela, em raios"
          onChange={n => update(k => { k.view.dy = n })} onReset={() => update(k => { k.view.dy = 0 })} />
        <label className="flex items-center justify-between gap-3 pt-1" title="A escala nunca sai da tela: perto de uma borda ela desliza para dentro e, maior que a tela, encolhe até caber. Desligado: fica sempre no ombro dela, no tamanho escolhido">
          <span>Caber inteira na tela</span>
          <input type="checkbox" checked={kit.view.fit} onChange={e => { const v = e.target.checked; update(k => { k.view.fit = v }) }} className="h-5 w-5 accent-[var(--primary)]" />
        </label>
      </div>
      <label className="flex items-center justify-between gap-3" title="Com um gatilho analógico (LT, RT) na Caixa: puxão brusco é uma batida; movimento lento faz o rufo, mais forte quanto mais fundo. Desligado: só as batidas">
        <span>Rufo da Caixa no gatilho</span>
        <input type="checkbox" checked={kit.rolls} onChange={e => { const v = e.target.checked; update(k => { k.rolls = v }) }} className="h-5 w-5 accent-[var(--primary)]" />
      </label>
    </div>
  )
}
