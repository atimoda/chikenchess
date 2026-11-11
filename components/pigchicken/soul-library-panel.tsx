"use client"

// Popup with the library of souls: a card for each soul of the catalogue, by species and then the rare ones. One
// never caught is only its outline in black; the first capture reveals its drawing, its name and what it is, and a
// card opens with how many were caught and the notes and weapons already seen (the ones missing stay hidden).
// The cards stand still: only the one under the pointer or focused beats its wings, so the whole library costs one
// drawing a frame. The collection lives in this browser (lib/pigchicken/soul-library.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { SOUL_COLS, SOUL_ROWS, drawSoulArt } from "@/components/pigchicken/draw/soul-art"
import {
  SOUL_ENTRIES, SOUL_NOTES, SOUL_RARITIES, SOUL_SHOTS, SOUL_SPECIES, SOUL_SPECIES_ORDER, SOUL_STATES, SOUL_WEAPONS, collectionProgress,
  entryClassName, entryColor, entryTraits, loadCollection, subscribeCollection, type SoulCollection, type SoulEntry,
} from "@/lib/pigchicken/soul-library"

function sizeCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
  const ctx = c.getContext("2d")!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
  return { ctx, w, h }
}
// the soul in the middle of a canvas, as big as `most` lets it be (the big ones stay bigger than the small ones);
// found: its drawing with its glow, else its outline. now: null stands still, wings up
function drawSoul(c: HTMLCanvasElement, e: SoulEntry, found: boolean, now: number | null, most: number) {
  const { ctx, w, h } = sizeCanvas(c)
  const k = Math.min(most, (h * 0.8) / (SOUL_ROWS * e.look.pixel), (w * 0.9) / (SOUL_COLS * e.look.pixel))
  ctx.save(); ctx.translate(w / 2, h / 2 + (now === null ? 0 : Math.sin(now * 3) * 2)); ctx.scale(k, k)
  if (found) { ctx.globalAlpha = 0.18; ctx.fillStyle = entryColor(e); ctx.beginPath(); ctx.arc(0, 0, Math.min(SOUL_ROWS * e.look.pixel * 0.7, (h * 0.45) / k), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 }
  drawSoulArt(ctx, 0, 0, 1, now ?? 0, e.look, !found)
  ctx.restore()
}
const CARD = 1.2, PREVIEW = 3.4
const sectionsOf = (entries: readonly SoulEntry[]) => [
  ...SOUL_SPECIES_ORDER.map(sp => ({ id: sp as string, name: SOUL_SPECIES[sp].name, entries: entries.filter(e => !e.recipe && e.species === sp) })),
  { id: "rare", name: "Raras", entries: entries.filter(e => e.recipe) },
].filter(s => s.entries.length)
// what a soul never caught is, when the catalogue's rule says it (a rare one keeps its secret)
const hintOf = (e: SoulEntry) => (e.recipe || !e.shot ? undefined : `${SOUL_STATES[e.state]} · ${SOUL_SHOTS[e.shot].name}`)

export function SoulLibraryPanel({ onClose }: { onClose: () => void }) {
  const [col, setCol] = useState<SoulCollection>(() => loadCollection())
  const [sel, setSel] = useState<string | null>(null)
  const cards = useRef(new Map<string, HTMLCanvasElement>())
  const preview = useRef<HTMLCanvasElement | null>(null)
  // the list keeps its scroll while a soul is open
  const scroller = useRef<HTMLDivElement | null>(null), listTop = useRef(0)
  const pick = (id: string | null) => {
    if (id && !sel) listTop.current = scroller.current?.scrollTop ?? 0
    setSel(id)
    requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = id ? 0 : listTop.current })
  }
  useEffect(() => subscribeCollection(setCol), [])
  const entries = SOUL_ENTRIES
  const sections = useMemo(() => sectionsOf(entries), [entries])
  const progress = useMemo(() => collectionProgress(col, entries), [col, entries])
  const picked = sel ? entries.find(e => e.id === sel) ?? null : null
  const v = picked && col[picked.id] ? picked : null, got = v ? col[v.id] : null

  // The cards are drawn still, each one when its canvas comes in (the panel puts its content in a moment after it
  // opens, so there is none yet when this first runs) and again when the collection changes or the panel's width
  // does; one loop moves only the card under the pointer or focused, or the open soul
  const live = useRef({ col, v, entries })
  live.current = { col, v, entries }
  const moving = useRef<string | null>(null)
  const drawStill = (id?: string) => {
    const { col: c, entries: list } = live.current
    cards.current.forEach((el, key) => {
      if (id && key !== id) return
      const e = list.find(o => o.id === key)
      if (e && el.isConnected) drawSoul(el, e, !!c[key], null, CARD)
    })
  }
  const hover = (id: string | null) => {
    const was = moving.current
    moving.current = id
    if (was && was !== id) drawStill(was)
  }
  const still = useRef(drawStill)
  still.current = drawStill
  useEffect(() => { if (!v) drawStill() }, [col, v, entries])
  const watch = useRef<ResizeObserver | null>(null)
  const setScroller = useCallback((el: HTMLDivElement | null) => {
    watch.current?.disconnect(); watch.current = null
    scroller.current = el
    if (!el || typeof ResizeObserver === "undefined") return
    let w = el.clientWidth
    watch.current = new ResizeObserver(() => { if (el.clientWidth !== w) { w = el.clientWidth; if (!live.current.v) still.current() } })
    watch.current.observe(el)
  }, [])
  const setCard = (e: SoulEntry, found: boolean) => (el: HTMLCanvasElement | null) => {
    if (!el) { cards.current.delete(e.id); return }
    cards.current.set(e.id, el)
    if (moving.current !== e.id) drawSoul(el, e, found, null, CARD)
  }
  useEffect(() => {
    let raf = 0
    const frame = () => {
      const now = performance.now() / 1000
      const { col: c, v: cur, entries: list } = live.current
      if (cur && preview.current) drawSoul(preview.current, cur, true, now, PREVIEW)
      else if (moving.current) {
        const el = cards.current.get(moving.current), e = list.find(o => o.id === moving.current)
        if (el && e && el.isConnected && c[e.id]) drawSoul(el, e, true, now, CARD)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const traits = v ? entryTraits(v, entries) : null
  const row = "flex items-center justify-between gap-3"
  const chip = (key: string, label: string, on: boolean) => (
    <span key={key} className={on ? "rounded-md border border-[#ffd166]/60 px-2 py-1 text-[#ffd166]" : "rounded-md border border-white/10 px-2 py-1 text-white/30"}>{on ? `★ ${label}` : "?"}</span>
  )

  return (
    <FloatingPanel id="pigchicken-souls" aria-label="Biblioteca de almas" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(560, vw - 24), h: vh - 104 })} minW={300} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        {v && <button type="button" aria-label="Voltar à biblioteca" title="Voltar à biblioteca" onClick={() => pick(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><ArrowLeft className="h-4 w-4" /></button>}
        <h2 className="min-w-0 flex-1 truncate text-sm text-white">{v ? v.name : "Biblioteca de almas"}</h2>
        {!v && <span className="shrink-0 text-[#93a79a]" title="Almas encontradas e estrelas de notas e armas">{progress.found}/{progress.total} · <span className="text-[#ffd166]">★</span> {progress.stars}/{progress.allStars}</span>}
        <button type="button" aria-label="Fechar biblioteca" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div ref={setScroller} className="min-h-0 flex-1 overflow-y-auto">
        {!v && (
          <>
            {sections.map(s => (
              <section key={s.id} className="px-4 pt-3">
                <h3 className="flex items-baseline justify-between pb-2 text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]"><span>{s.name}</span><span className="font-normal">{s.entries.filter(e => col[e.id]).length}/{s.entries.length}</span></h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2">
                  {s.entries.map(e => {
                    const f = col[e.id], t = entryTraits(e, entries), all = t.notes.length + t.weapons.length
                    const stars = f ? t.notes.filter(n => f.notes.includes(n)).length + t.weapons.filter(w => f.weapons.includes(w)).length : 0
                    return (
                      <button key={e.id} type="button" disabled={!f} aria-label={f ? e.name : "Alma ainda não capturada"} title={f ? undefined : hintOf(e)} onClick={() => { hover(null); pick(e.id) }}
                        onPointerEnter={() => { if (f) hover(e.id) }} onPointerLeave={() => { if (moving.current === e.id) hover(null) }}
                        onFocus={() => { if (f) hover(e.id) }} onBlur={() => { if (moving.current === e.id) hover(null) }} className="grid min-w-0 content-start gap-1 rounded-lg border border-white/10 bg-[#0b110e] p-1.5 text-left enabled:hover:border-primary">
                        <canvas ref={setCard(e, !!f)} aria-hidden="true" className="h-20 w-full rounded-md bg-[#1b2531]" />
                        <span className={f ? "min-h-[30px] px-0.5 text-[12px] leading-[15px] text-white" : "min-h-[30px] px-0.5 text-[12px] leading-[15px] text-white/30"}>{f ? e.name : "???"}</span>
                        <span className="flex justify-between gap-1 px-0.5 text-[10px]">
                          {f ? <span className="truncate" style={{ color: SOUL_RARITIES[e.rarity].color }}>{SOUL_RARITIES[e.rarity].name}</span> : <span>&nbsp;</span>}
                          {f && all > 0 && <span className={stars === all ? "shrink-0 text-[#ffd166]" : "shrink-0 text-[#93a79a]"}>★ {stars}/{all}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
            <div className="h-4" />
          </>
        )}
        {v && got && traits && (
          <div className="grid gap-3 px-4 py-3">
            <canvas ref={preview} aria-label={v.name} className="h-36 w-full rounded-lg bg-[#1b2531]" />
            <div className="grid gap-2">
              <div className={row}><span>Raridade</span><span style={{ color: SOUL_RARITIES[v.rarity].color }}>{SOUL_RARITIES[v.rarity].name}</span></div>
              <div className={row}><span>Espécie</span><span className="text-white">{v.species ? SOUL_SPECIES[v.species].name : "Qualquer"}</span></div>
              {v.species !== "chick" && <div className={row}><span>Estado</span><span className="text-white">{SOUL_STATES[v.state]}</span></div>}
              {v.species !== "chick" && <div className={row}><span>Instrumento</span><span className="text-white">{v.shot ? SOUL_SHOTS[v.shot].name : "Qualquer"}</span></div>}
              <div className={row}><span>Voo</span><span className="text-white">{entryClassName(v)}</span></div>
              <div className={row}><span>Capturadas</span><span className="text-white">{got.n}</span></div>
              {got.at > 0 && <div className={row}><span>Primeira captura</span><span className="text-white">{new Date(got.at).toLocaleDateString("pt-BR")}</span></div>}
            </div>
            {traits.notes.length > 0 && (
              <div className="grid gap-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">Notas</h3>
                <div className="flex flex-wrap gap-1.5">{traits.notes.map(n => chip(n, SOUL_NOTES[n], got.notes.includes(n)))}</div>
              </div>
            )}
            {traits.weapons.length > 0 && (
              <div className="grid gap-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">Armas</h3>
                <div className="flex flex-wrap gap-1.5">{traits.weapons.map(w => chip(w, SOUL_WEAPONS[w], got.weapons.includes(w)))}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </FloatingPanel>
  )
}
