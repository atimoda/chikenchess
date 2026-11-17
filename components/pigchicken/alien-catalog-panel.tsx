"use client"

// Popup with the aliens' catalogue: a card for each variation (its drawing, its name and its species; it stands still
// and only the card under the pointer or focused moves, so a long catalogue costs one drawing a frame);
// clicking one opens its parameters, with buttons to hear its shot and its two deaths, duplicate it, bring a code's
// one back to its values or delete one made here. Saved in this browser; the songs take it live.
import { StepSelect } from "@/components/ui/step-select"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Copy, Trash2, Volume2, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioRange } from "@/components/ui/patio-range"
import { drawTempleAlien } from "@/components/pigchicken/temple-draw"
import { drawNoteShots } from "@/components/pigchicken/note-stage-draw"
import {
  BUILTIN_BY_ID, CATALOG_SPECIES, DRUM_OPTIONS, VARIANT_GROUPS, VARIANT_NUMBERS, duplicateVariant, getPath, loadCatalog,
  normalizeVariant, saveCatalog, setPath, subscribeCatalog, variantData, variantSize, type AlienVariant, type Catalog, type CatalogSpecies,
} from "@/lib/pigchicken/alien-catalog"
import { SPECIES } from "@/lib/pigchicken/temple"
import { MOVE_MODES, type MoveMode } from "@/lib/pigchicken/note-stage"
import { DEGREE_COLORS, SCALES, type ScaleId } from "@/lib/pigchicken/music"
import { REBATE_RULES, type RebateRule } from "@/lib/pigchicken/transforms"
import { BIRDS, BIRD_IDS, type BirdId } from "@/lib/pigchicken/birds"
import { deathNotes } from "@/lib/pigchicken/undead"
import { VOICE_LABELS, playDrum, playNote, type Drum, type VoiceId } from "@/lib/pigchicken/synth"
import type { Target } from "@/lib/pigchicken/combat"
import type { NoteShot } from "@/lib/pigchicken/note-shots"

const BPM = 96, SPB = 60 / BPM
// what the buttons play over: a D major chord, like the test song
const CHORD = [62, 66, 69]
const SHAPES = [{ value: "note", label: "Uma nota" }, { value: "chord", label: "Acorde" }, { value: "arp", label: "Arpejo" }] as const
const field = "h-8 w-44 min-w-0 rounded-md border border-white/15 bg-[#0b110e] px-2"

// ---------- drawing ----------

function fakeTarget(v: AlienVariant, x: number, y: number, flash = 0): Target {
  const { w, h } = variantSize(v)
  return { id: 1, kind: "alien", home: 0, x, y, w, h, hp: v.hp, maxHp: v.hp, flash, wobble: 0, vx: 0, deadT: 0, face: 1, state: "fly", animT: 0, data: variantData(v) }
}
function sizeCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
  const ctx = c.getContext("2d")!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
  return { ctx, w, h }
}
// the alien standing in the middle of a canvas, fitted to it, stomping on the beat (still: halfway between beats)
function drawCard(c: HTMLCanvasElement, v: AlienVariant, now: number | null) {
  const { ctx, w, h } = sizeCanvas(c)
  const beat = now === null ? 0.5 : now / SPB, phase = beat - Math.floor(beat)
  const sz = variantSize(v), k = Math.min(1.6, (h * 0.62) / Math.max(sz.w * 0.8, sz.h))
  ctx.save(); ctx.translate(w / 2, h * 0.8); ctx.scale(k, k)
  drawTempleAlien(ctx, fakeTarget(v, 0, 0), 0, phase, 0, beat, null)
  ctx.restore()
}
// the detail's preview: the alien on the right firing its shots to the left, at its speed, with its trail and glow
function drawPreview(c: HTMLCanvasElement, v: AlienVariant, now: number) {
  const { ctx, w, h } = sizeCanvas(c)
  const beat = now / SPB, phase = beat - Math.floor(beat)
  const ax = w - 70, ay = h * 0.72
  const sz = variantSize(v), k = Math.min(1.4, (h * 0.55) / Math.max(sz.w * 0.8, sz.h))
  // a shot every beat, flying left (with its echo and its second note)
  const shots: NoteShot[] = []
  const flight = Math.max(0.2, (ax - 30) / v.shot.speed)
  for (let i = 0; i < 6; i++) {
    const fired = Math.floor(beat) - i
    const t = (beat - fired) * SPB
    if (t > flight) continue
    const notes = [{ off: 0, deg: fired % 5 }, ...(v.shot.harmony > 0 ? [{ off: -14, deg: (fired + v.shot.harmony) % 5 }] : [])]
    for (const n of notes) {
      const color = v.shot.color === "degree" ? DEGREE_COLORS[((n.deg % 7) + 7) % 7] : v.shot.color
      shots.push({ id: i, x: ax - 30 - t * v.shot.speed, y: ay - sz.h * k * 0.5 + n.off, vx: -v.shot.speed, vy: 0, midi: 60, color, size: v.shot.size, glow: v.shot.glow, trail: v.shot.trail, arriveAt: 0, state: "incoming", t, source: "catalog" })
    }
  }
  drawNoteShots(ctx, shots, 0, { x: -1000, y: -1000, w: w + 2000, h: h + 2000 })
  ctx.save(); ctx.translate(ax, ay); ctx.scale(k, k)
  drawTempleAlien(ctx, fakeTarget(v, 0, 0, phase < 0.08 ? 0.08 : 0), 0, phase, 0, beat, { x: -500, y: 0 })
  ctx.restore()
}

// ---------- sounds ----------

function hearFire(v: AlienVariant) {
  if (v.drum) { [0, 1, 2].forEach(i => playDrum(v.drum as Drum, i * SPB, 0.9)); return }
  if (v.fire.voice === "none" || v.fire.vel <= 0) return
  const voice = v.fire.voice as VoiceId
  ;[62, 66, 69].forEach((m, i) => playNote(voice, m + 12, { at: i * SPB, dur: 0.2, vel: v.fire.vel }))
}
function hearDeath(v: AlienVariant, which: "physical" | "musical") {
  for (const o of deathNotes(v.death[which], CHORD, SPB)) {
    if (o.drum) playDrum(o.drum, o.at, o.vel)
    else playNote(o.voice ?? "bird", o.midi, { at: o.at, dur: o.dur, vel: o.vel })
  }
}

// ---------- the panel ----------

export function AlienCatalogPanel({ onClose }: { onClose: () => void }) {
  const [catalog, setCatalog] = useState<Catalog>(() => loadCatalog())
  const [sel, setSel] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({ Corpo: true, Movimento: false, Tiro: true, Rebate: false, Sons: true, "Morto-vivo": false })
  const cards = useRef(new Map<string, HTMLCanvasElement>())
  const preview = useRef<HTMLCanvasElement | null>(null)
  // the list keeps its scroll while a variation is open; a variation opens at its top
  const scroller = useRef<HTMLDivElement | null>(null), listTop = useRef(0)
  const pick = (id: string | null) => {
    if (id && !sel) listTop.current = scroller.current?.scrollTop ?? 0
    setSel(id)
    requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = id ? 0 : listTop.current })
  }
  useEffect(() => subscribeCatalog(setCatalog), [])
  const v = sel ? catalog.find(x => x.id === sel) ?? null : null

  // the cards are drawn still, once (again when the catalogue changes or the panel's width does); one loop moves
  // only the card under the pointer or focused, or the open variation's preview
  const live = useRef({ catalog, v })
  live.current = { catalog, v }
  const moving = useRef<string | null>(null)
  const drawStill = (id?: string) => {
    const c = live.current.catalog
    cards.current.forEach((el, key) => {
      if (id && key !== id) return
      const x = c.find(o => o.id === key)
      if (x && el.isConnected) drawCard(el, x, null)
    })
  }
  const hover = (id: string | null) => {
    const was = moving.current
    moving.current = id
    if (was && was !== id) drawStill(was)
  }
  useEffect(() => { if (!v) drawStill() }, [catalog, v])
  useEffect(() => {
    const el = scroller.current
    if (!el || typeof ResizeObserver === "undefined") return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => { if (el.clientWidth !== w) { w = el.clientWidth; if (!live.current.v) drawStill() } })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    let raf = 0
    const frame = () => {
      const now = performance.now() / 1000
      const { catalog: c, v: cur } = live.current
      if (cur && preview.current) drawPreview(preview.current, cur, now)
      else if (moving.current) {
        const el = cards.current.get(moving.current), x = c.find(o => o.id === moving.current)
        if (el && x && el.isConnected) drawCard(el, x, now)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const commit = (next: Catalog) => { setCatalog(next); saveCatalog(next) }
  const update = (fn: (d: AlienVariant) => void) => {
    if (!v) return
    const d = structuredClone(v); fn(d)
    const clean = normalizeVariant(d) ?? d
    commit(catalog.map(x => (x.id === v.id ? clean : x)))
  }
  const duplicate = () => {
    if (!v) return
    const copy = duplicateVariant(catalog, v)
    const i = catalog.findIndex(x => x.id === v.id)
    commit([...catalog.slice(0, i + 1), copy, ...catalog.slice(i + 1)])
    setSel(copy.id)
  }
  const remove = () => { if (!v || v.builtin) return; commit(catalog.filter(x => x.id !== v.id)); pick(null) }
  const reset = () => { if (v?.builtin) update(d => Object.assign(d, structuredClone(BUILTIN_BY_ID[v.id]))) }
  const base = v ? BUILTIN_BY_ID[v.id] ?? null : null
  const changed = !!(v && base && JSON.stringify(v) !== JSON.stringify(base))

  return (
    <FloatingPanel id="pigchicken-aliens" aria-label="Catálogo de aliens" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(560, vw - 24), h: vh - 104 })} minW={300} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        {v ? (
          <>
            <button type="button" aria-label="Voltar ao catálogo" title="Voltar ao catálogo" onClick={() => pick(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><ArrowLeft className="h-4 w-4" /></button>
            <input aria-label="Nome" value={v.name} onChange={e => { const n = e.target.value; update(d => { d.name = n }) }} onKeyDown={e => e.stopPropagation()} className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white" />
          </>
        ) : <h2 className="min-w-0 flex-1 truncate text-sm text-white">Catálogo de aliens</h2>}
        <button type="button" aria-label="Fechar catálogo" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {!v && (
          <>
            <p className="px-4 pt-3 text-[10px] text-[#93a79a]">Cada alien é uma variação: a espécie (o desenho) e os parâmetros. Clique num cartão para mexer, ouvir o tiro e as mortes, ou duplicar. As músicas usam o catálogo na hora, e ele fica salvo neste navegador.</p>
            {CATALOG_SPECIES.map(sp => (
              <section key={sp} className="px-4 pt-3">
                <h3 className="pb-2 text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">{SPECIES[sp].name}</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2">
                  {catalog.filter(x => x.species === sp).map(x => (
                    <button key={x.id} type="button" onClick={() => { hover(null); pick(x.id) }}
                      onPointerEnter={() => hover(x.id)} onPointerLeave={() => { if (moving.current === x.id) hover(null) }}
                      onFocus={() => hover(x.id)} onBlur={() => { if (moving.current === x.id) hover(null) }} className="grid min-w-0 gap-1 rounded-lg border border-white/10 bg-[#0b110e] p-1.5 text-left hover:border-primary">
                      <canvas ref={el => { if (el) cards.current.set(x.id, el); else cards.current.delete(x.id) }} aria-hidden="true" className="h-20 w-full rounded-md bg-[#141c26]" />
                      <span className="truncate px-0.5 text-[12px] text-white">{x.name}</span>
                      <span className="truncate px-0.5 text-[10px] text-[#93a79a]">{x.id === sp ? "Base" : SPECIES[x.species].name}{!x.builtin ? " · sua" : ""}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            <div className="h-4" />
          </>
        )}
        {v && (
          <>
            <div className="px-4 pt-3">
              <canvas ref={preview} aria-label={`Prévia de ${v.name}`} className="h-36 w-full rounded-lg bg-[#141c26]" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => hearFire(v)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-2 hover:border-primary"><Volume2 className="h-3.5 w-3.5" />{v.drum ? "Rebate" : "Disparo"}</button>
                <button type="button" onClick={() => hearDeath(v, "physical")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-2 hover:border-primary"><Volume2 className="h-3.5 w-3.5" />Morte física</button>
                <button type="button" onClick={() => hearDeath(v, "musical")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-2 hover:border-primary"><Volume2 className="h-3.5 w-3.5" />Morte musical</button>
                <span className="flex-1" />
                <button type="button" onClick={duplicate} title="Uma cópia para mexer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-2 hover:border-primary"><Copy className="h-3.5 w-3.5" />Duplicar</button>
                {v.builtin
                  ? <button type="button" onClick={reset} disabled={!changed} title="Volta esta variação para os valores do código" className="h-8 rounded-md border border-white/20 px-2 hover:border-primary disabled:opacity-40">Padrão</button>
                  : <button type="button" onClick={remove} title="Apaga esta variação" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-2 hover:border-[#ff6b5b]"><Trash2 className="h-3.5 w-3.5" />Excluir</button>}
              </div>
              <p className="pt-2 text-[10px] text-[#93a79a]">Nas músicas: <code className="text-white/80">{v.id}</code>.</p>
            </div>
            {VARIANT_GROUPS.map(g => (
              <details key={g} open={!!open[g]} onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; setOpen(s => ({ ...s, [g]: o })) }} className="border-b border-white/10">
                <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#ffd166] hover:text-white">{g}</summary>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-field px-4 pb-4">
                  {g === "Corpo" && (
                    <>
                      <label className="flex items-center justify-between gap-3"><span>Espécie (desenho)</span>
                        <StepSelect value={v.species} onChange={e => { const sp = e.target.value as CatalogSpecies; update(d => { d.species = sp }) }} className={field}>
                          {CATALOG_SPECIES.map(sp => <option key={sp} value={sp}>{SPECIES[sp].name}</option>)}
                        </StepSelect>
                      </label>
                      <label className="flex items-center justify-between gap-3"><span>Cor</span>
                        <input type="color" aria-label="Cor do alien" value={v.color} onChange={e => { const c = e.target.value; update(d => { d.color = c }) }} className="h-8 w-14 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
                      </label>
                    </>
                  )}
                  {g === "Movimento" && (
                    <label className="flex items-center justify-between gap-3"><span>Modo</span>
                      <StepSelect value={v.move} onChange={e => { const m = e.target.value as MoveMode; update(d => { d.move = m }) }} className={field}>
                        {MOVE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </StepSelect>
                    </label>
                  )}
                  {g === "Tiro" && (
                    <>
                      <label className="flex items-center justify-between gap-3"><span>Cor pelo grau da nota</span>
                        <input type="checkbox" checked={v.shot.color === "degree"} onChange={e => { const on = e.target.checked; update(d => { d.shot.color = on ? "degree" : d.color }) }} className="h-5 w-5 accent-[var(--primary)]" />
                      </label>
                      {v.shot.color !== "degree" && (
                        <label className="flex items-center justify-between gap-3"><span>Cor do tiro</span>
                          <input type="color" aria-label="Cor do tiro" value={v.shot.color} onChange={e => { const c = e.target.value; update(d => { d.shot.color = c }) }} className="h-8 w-14 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
                        </label>
                      )}
                      <label className="flex items-center justify-between gap-3"><span>Som de disparo</span>
                        <StepSelect value={v.fire.voice} onChange={e => { const s = e.target.value as VoiceId | "none"; update(d => { d.fire.voice = s }) }} className={field}>
                          <option value="none">Nenhum</option>
                          {(Object.keys(VOICE_LABELS) as VoiceId[]).map(s => <option key={s} value={s}>{VOICE_LABELS[s]}</option>)}
                        </StepSelect>
                      </label>
                    </>
                  )}
                  {g === "Rebate" && (
                    <>
                      <label className="flex items-center justify-between gap-3" title="De quem são as transformações quando as notas dele são rebatidas"><span>Regra</span>
                        <StepSelect value={v.rule ?? ""} onChange={e => { const r = e.target.value; update(d => { d.rule = (r || null) as RebateRule | null }) }} className={field}>
                          <option value="">A da música</option>
                          {REBATE_RULES.map(r => <option key={r.value} value={r.value} title={r.hint}>{r.label}</option>)}
                        </StepSelect>
                      </label>
                      <label className="flex items-center justify-between gap-3" title="As notas rebatidas dele se encaixam nesta escala"><span>Escala</span>
                        <StepSelect value={v.scale ?? ""} onChange={e => { const sc = e.target.value; update(d => { d.scale = (sc || null) as ScaleId | null }) }} className={field}>
                          <option value="">A da música</option>
                          {(Object.keys(SCALES) as ScaleId[]).map(sc => <option key={sc} value={sc}>{SCALES[sc].label}</option>)}
                        </StepSelect>
                      </label>
                      <label className="flex items-center justify-between gap-3" title="Percussão pura: rebater toca este tambor no lugar da nota"><span>Rebate vira batida</span>
                        <StepSelect value={v.drum ?? ""} onChange={e => { const dr = e.target.value; update(d => { d.drum = (dr || null) as Drum | null }) }} className={field}>
                          <option value="">Não (toca a nota)</option>
                          {DRUM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </StepSelect>
                      </label>
                    </>
                  )}
                  {g === "Sons" && (
                    <>
                      <label className="flex items-center justify-between gap-3"><span>Morte física</span>
                        <StepSelect value={v.death.physical.kind === "drum" ? v.death.physical.drum : ""} onChange={e => { const dr = e.target.value as Drum; update(d => { d.death.physical = { kind: "drum", drum: dr, vel: d.death.physical.vel } }) }} className={field}>
                          {DRUM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </StepSelect>
                      </label>
                      {v.death.musical.kind === "notes" && (
                        <>
                          <label className="flex items-center justify-between gap-3"><span>Morte musical: voz</span>
                            <StepSelect value={v.death.musical.voice} onChange={e => { const s = e.target.value as VoiceId; update(d => { if (d.death.musical.kind === "notes") d.death.musical.voice = s }) }} className={field}>
                              {(Object.keys(VOICE_LABELS) as VoiceId[]).map(s => <option key={s} value={s}>{VOICE_LABELS[s]}</option>)}
                            </StepSelect>
                          </label>
                          <label className="flex items-center justify-between gap-3"><span>Morte musical: forma</span>
                            <StepSelect value={v.death.musical.shape} onChange={e => { const s = e.target.value as "note" | "chord" | "arp"; update(d => { if (d.death.musical.kind === "notes") d.death.musical.shape = s }) }} className={field}>
                              {SHAPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </StepSelect>
                          </label>
                        </>
                      )}
                    </>
                  )}
                  {g === "Morto-vivo" && (
                    <label className="flex items-center justify-between gap-3" title="O pássaro em que ele volta quando as notas o trazem de volta"><span>Vira o pássaro</span>
                      <StepSelect value={v.undead.bird ?? ""} onChange={e => { const b = e.target.value; update(d => { d.undead.bird = (b || null) as BirdId | null }) }} className={field}>
                        <option value="">Um do lugar</option>
                        {BIRD_IDS.map(b => <option key={b} value={b}>{BIRDS[b].name}</option>)}
                      </StepSelect>
                    </label>
                  )}
                  <div className="grid gap-field">
                  {VARIANT_NUMBERS.filter(m => m.group === g && (g !== "Sons" || !m.path.startsWith("death.musical") || v.death.musical.kind === "notes")).map(m => {
                    const n = getPath(v, m.path) as number
                    const was = getPath(base ?? BUILTIN_BY_ID[v.species], m.path) as number
                    return <PatioRange key={m.path} label={m.label} min={m.min} max={m.max} step={m.step} value={n}
                      display={`${Math.round(n * 100) / 100}${m.unit ? ` ${m.unit}` : ""}`} changed={n !== was} hint={m.hint}
                      onChange={x => update(d => setPath(d, m.path, x))}
                      onReset={() => update(d => setPath(d, m.path, was))} />
                  })}
                  </div>
                </div>
              </details>
            ))}
          </>
        )}
      </div>
    </FloatingPanel>
  )
}
