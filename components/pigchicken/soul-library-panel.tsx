"use client"

// The Almas tab of the Catálogo (catalog-panel.tsx), the library of souls: a card for each soul of the catalogue, by species and then the rare ones. One
// never caught is only its outline in black; the first capture reveals its drawing, its name and what it is, and a
// card opens with how many were caught and the notes and weapons already seen (the ones missing stay hidden).
// The cards stand still: only the one under the pointer or focused beats its wings, so the whole library costs one
// drawing a frame. The collection lives in this browser (lib/pigchicken/soul-library.ts).
// A click on a card (and on the open soul's drawing) plays the sound the soul makes: three notes in the voice of the
// real bird it takes after. The open card says its recipe and its Inspiration, which opens the Guia de pássaros on
// that bird (onBird); `focus` opens the library on a soul (from the guide).
// An admin gets the pencil: with it on, every card opens its sheet to edit (name, rarity, flight, look, what it does
// let out, and a rare one's recipe), kept as a draft in this browser and followed live by the souls in the game; "Salvar no game" writes
// it to the game's file.
import { StepSelect } from "@/components/ui/step-select"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowUp, Cloud, CloudOff, Copy, Pencil, Plus, Trash2 } from "lucide-react"
import { PatioRange } from "@/components/ui/patio-range"
import { SaveToGameButton, useIsAdmin } from "@/components/admin/save-to-game-button"
import { saveDefaultSouls } from "@/lib/admin/game-defaults-client"
import { soulSyncState, subscribeSoulSyncState } from "@/lib/pigchicken/soul-online"
import { drawSoulCard } from "@/components/pigchicken/draw/soul-card"
import { GUIDE_BIRDS } from "@/lib/pigchicken/bird-guide"
import { playNote } from "@/lib/pigchicken/synth"
import { SOUL_ACT_DEFAULTS, SOUL_ACT_RANGES, SOUL_HELPS, SOUL_HINDERS, type SoulActParams, type SoulHelp, type SoulHinder } from "@/lib/pigchicken/soul-acts"
import { SOUL_CLASSES, SOUL_FOLLOW_DEFAULTS, SOUL_FOLLOW_RANGES, SOUL_PATTERNS, SOUL_SIDES, type SoulClassId, type SoulFollowParams, type SoulPattern, type SoulSide } from "@/lib/pigchicken/soul-follow"
import {
  SOUL_ENTRIES, SOUL_LOOK_COLOURS, SOUL_NAME_MAX, SOUL_NOTES, SOUL_NOTE_ORDER, SOUL_PIXEL, SOUL_RARITIES, SOUL_SHAPES, SOUL_SHOTS, SOUL_SHOT_ORDER, SOUL_SPECIES, SOUL_SPECIES_ORDER,
  SOUL_STATES, SOUL_WEAPONS, SOUL_WEAPON_ORDER, addRare, changeEntry, cleanRecipe, collectionProgress, entryActBase, entryActParams, entryBird, entryClassName, entryFollowParams, entryTraits,
  loadCollection, loadSoulEntries, moveRare, recipeText, removeRare, resetEntry, saveSoulEntries, subscribeCollection, subscribeSoulEntries,
  type SoulCollection, type SoulEntry, type SoulLook, type SoulRecipe, type SoulShape,
} from "@/lib/pigchicken/soul-library"
import type { SoulRarity } from "@/lib/pigchicken/souls"

const CARD = 1.2, PREVIEW = 3.4
const sectionsOf = (entries: readonly SoulEntry[]) => [
  ...SOUL_SPECIES_ORDER.map(sp => ({ id: sp as string, name: SOUL_SPECIES[sp].name, entries: entries.filter(e => !e.recipe && e.species === sp) })),
  { id: "rare", name: "Raras", entries: entries.filter(e => e.recipe) },
]
// what a soul never caught is, when the catalogue's rule says it (a rare one keeps its secret)
const hintOf = (e: SoulEntry) => (e.recipe || !e.shot ? undefined : `${SOUL_STATES[e.state]} · ${SOUL_SHOTS[e.shot].name}`)
// what an entry is on each axis (a rare one: what its recipe asks for)
const any = <T extends string>(list: readonly T[] | undefined, names: (x: T) => string) => (list?.length ? list.map(names).join(", ") : "Qualquer")
const speciesOf = (e: SoulEntry) => (e.recipe ? any(e.recipe.species, s => SOUL_SPECIES[s].name) : e.species ? SOUL_SPECIES[e.species].name : "Qualquer")
const stateOf = (e: SoulEntry) => (e.recipe ? (e.recipe.state ? SOUL_STATES[e.recipe.state] : "Qualquer") : SOUL_STATES[e.state])
const shotOf = (e: SoulEntry) => (e.recipe ? any(e.recipe.shot, s => SOUL_SHOTS[s].name) : e.shot ? SOUL_SHOTS[e.shot].name : "Qualquer")

// ---------- the editor's labels ----------
type FollowNumber = keyof typeof SOUL_FOLLOW_RANGES
const FOLLOW_NUMBERS: { key: FollowNumber; label: string; unit?: string; hint: string }[] = [
  { key: "dist", label: "Distância", unit: "px", hint: "Distância lateral do lugar dela (na órbita, o raio)." },
  { key: "height", label: "Altura", hint: "0 é a cabeça do dono, 1 é o topo do céu que a câmera mostra." },
  { key: "leash", label: "Folga", unit: "px", hint: "Quanto o dono se afasta do lugar antes de ela seguir." },
  { key: "speed", label: "Velocidade", unit: "px/s", hint: "Velocidade de voo." },
  { key: "accel", label: "Aceleração", hint: "Quão rápido pega velocidade e quão tarde freia." },
  { key: "react", label: "Reação", unit: "s", hint: "Demora para notar que o dono saiu." },
  { key: "patternSize", label: "Tamanho do padrão", unit: "px", hint: "Largura do que ela faz no lugar." },
  { key: "patternTime", label: "Tempo do padrão", unit: "s", hint: "Duração de uma volta do padrão." },
  { key: "loopEvery", label: "Voltinha a cada", unit: "s", hint: "Intervalo das voltinhas no descanso (0: nunca)." },
  { key: "restless", label: "Inquietação", hint: "Quanto vagueia em volta do lugar." },
  { key: "alert", label: "Susto", unit: "px", hint: "A que distância outro player a incomoda (nunca o dono). 0: não foge de ninguém." },
  { key: "flee", label: "Fuga", hint: "Quanto se afasta de outro player e a chance de largar o lugar onde pousou. 0: não foge." },
]
// exploring the map: how keen it is, how far it goes, how long it rests and where it likes to land
const ROAM_NUMBERS: { key: FollowNumber; label: string; unit?: string; hint: string }[] = [
  { key: "roam", label: "Explorar", hint: "Vontade de sair de perto do dono para pousar pelo mapa. 0: nunca sai." },
  { key: "roamRange", label: "Alcance", unit: "px", hint: "Até que distância do dono ficam os lugares que ela visita." },
  { key: "perchTime", label: "Tempo pousada", unit: "s", hint: "Quanto descansa em cada lugar." },
  { key: "wires", label: "Fios", hint: "Quanto gosta de pousar nos fios de energia. 0: nunca." },
  { key: "trees", label: "Árvores", hint: "Quanto gosta de pousar em galhos e copas. 0: nunca." },
  { key: "platforms", label: "Plataformas", hint: "Quanto gosta de pousar em plataformas e telhados. 0: nunca." },
  { key: "objects", label: "Objetos", hint: "Quanto gosta de pousar em postes, torres, Baús, Gongo, Jukebox, lousas e alvos. 0: nunca." },
]
type ActNumber = keyof typeof SOUL_ACT_RANGES
const ACT_NUMBERS: Record<ActNumber, { label: string; unit?: string; hint: string }> = {
  every: { label: "A cada", unit: "s", hint: "Intervalo das ações. A cada volta ela pode atrapalhar; se não, fica pronta para ajudar assim que houver o que fazer." },
  range: { label: "Alcance", unit: "px", hint: "Até onde ela age, contado de onde ela está (o aviso de perigo conta do dono)." },
  power: { label: "Força da ajuda", hint: "Quanto de harmonia a nota dá, ou a altura do degrau." },
  chance: { label: "Chance de atrapalhar", hint: "A cada volta do intervalo. Alma de nota fora da escala soma 15%." },
  force: { label: "Força do atrapalho", hint: "Tamanho do empurrão, do quique, do desvio da mira, da bicada, ou o tempo desafinada." },
  poopEvery: { label: "Cagar a cada", unit: "s", hint: "Intervalo entre dois cagados; ela só solta com um boneco embaixo. 0: não tem esse poder." },
  poopDamage: { label: "Dano do cagado", hint: "Vida que tira de inimigo ou alvo de treino; numa galinha, a força do tranco." },
  song: { label: "Canto real", hint: "Chance de cantar uma gravação da ave que a inspira, a cada volta do intervalo. 0: nunca." },
}
// the sound a soul of this entry makes: three notes of a chord (minor for a dead one) in its bird's voice
function soulSound(e: SoulEntry) {
  const voice = entryBird(e).voice
  ;(e.state === "dead" ? [0, 3, 7] : [0, 4, 7]).forEach((step, i) => playNote(voice, 72 + step, { at: i * 0.16, dur: i === 2 ? 0.45 : 0.2, vel: 0.5 }))
}
// what a soul of this entry does against its owner, for the card
const hinderName = (e: SoulEntry, p: SoulActParams) => (p.hinder !== "own" ? SOUL_HINDERS[p.hinder] : e.state === "dead" ? "Pela arma que a matou" : "Desafinar")
const COLOUR_LABELS: Record<(typeof SOUL_LOOK_COLOURS)[number], string> = { body: "Corpo", wing: "Asa", belly: "Barriga", beak: "Bico", eye: "Olho" }
const GROUPS = ["Ficha", "Aparência", "Voo", "Exploração", "Ações", "Receita"] as const
const field = "h-8 w-44 min-w-0 rounded-md border border-white/15 bg-[#0b110e] px-2"
const small = "inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-2 hover:border-primary disabled:opacity-40"

// The name being typed. An empty one is no name: the soul keeps the last it had until something is written.
function NameInput({ name, onName }: { name: string; onName: (name: string) => void }) {
  const [typed, setTyped] = useState<string | null>(null)
  return <input aria-label="Nome" value={typed ?? name} maxLength={SOUL_NAME_MAX} onChange={e => { setTyped(e.target.value); if (e.target.value.trim()) onName(e.target.value) }} onBlur={() => setTyped(null)} onKeyDown={e => e.stopPropagation()} className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white" />
}

export function SoulLibraryBody({ focus, onBird }: { focus?: { id: string; n: number } | null; onBird?: (bird: string) => void }) {
  const [col, setCol] = useState<SoulCollection>(() => loadCollection())
  const [entries, setEntries] = useState<readonly SoulEntry[]>(() => loadSoulEntries())
  const [sel, setSel] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({ Ficha: true, Aparência: true, Voo: false, Exploração: false, Ações: false, Receita: true })
  const admin = useIsAdmin(), editing = admin && edit
  const cards = useRef(new Map<string, HTMLCanvasElement>())
  const preview = useRef<HTMLCanvasElement | null>(null)
  // the list keeps its scroll while a soul is open
  const scroller = useRef<HTMLDivElement | null>(null), listTop = useRef(0)
  const pick = (id: string | null, quiet = false) => {
    if (id && !sel) listTop.current = scroller.current?.scrollTop ?? 0
    setSel(id)
    const e = id && !quiet ? entries.find(o => o.id === id) : null
    if (e) soulSound(e)
    requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = id ? 0 : listTop.current })
  }
  useEffect(() => subscribeCollection(setCol), [])
  // asked for from the Guia de pássaros: the library opens on that soul
  const asked = focus?.n
  useEffect(() => { if (focus) pick(focus.id) }, [asked]) // (only a new ask opens it)
  const [sync, setSync] = useState(soulSyncState)
  useEffect(() => subscribeSoulSyncState(setSync), [])
  useEffect(() => subscribeSoulEntries(setEntries), [])
  const sections = useMemo(() => sectionsOf(entries), [entries])
  const progress = useMemo(() => collectionProgress(col, entries), [col, entries])
  const picked = sel ? entries.find(e => e.id === sel) ?? null : null
  const v = picked && (editing || col[picked.id]) ? picked : null, got = v ? col[v.id] ?? null : null

  // The cards are drawn still, each one when its canvas comes in (the panel puts its content in a moment after it
  // opens, so there is none yet when this first runs) and again when the collection changes or the panel's width
  // does; one loop moves only the card under the pointer or focused, or the open soul
  const live = useRef({ col, v, entries, editing })
  live.current = { col, v, entries, editing }
  const moving = useRef<string | null>(null)
  const drawStill = (id?: string) => {
    const { col: c, entries: list, editing: all } = live.current
    cards.current.forEach((el, key) => {
      if (id && key !== id) return
      const e = list.find(o => o.id === key)
      if (e && el.isConnected) drawSoulCard(el, e.look, all || !!c[key], null, CARD)
    })
  }
  const hover = (id: string | null) => {
    const was = moving.current
    moving.current = id
    if (was && was !== id) drawStill(was)
  }
  const still = useRef(drawStill)
  still.current = drawStill
  useEffect(() => { if (!v) drawStill() }, [col, v, entries, editing])
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
    if (moving.current !== e.id) drawSoulCard(el, e.look, found, null, CARD)
  }
  useEffect(() => {
    let raf = 0
    const frame = () => {
      const now = performance.now() / 1000
      const { col: c, v: cur, entries: list, editing: all } = live.current
      if (cur && preview.current) drawSoulCard(preview.current, cur.look, true, now, PREVIEW)
      else if (moving.current) {
        const el = cards.current.get(moving.current), e = list.find(o => o.id === moving.current)
        if (el && e && el.isConnected && (all || c[e.id])) drawSoulCard(el, e.look, true, now, CARD)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---------- the editor ----------
  const commit = (next: readonly SoulEntry[]) => { setEntries(next); saveSoulEntries(next) }
  const update = (change: (e: SoulEntry) => SoulEntry) => { if (v) commit(changeEntry(entries, v.id, change)) }
  const setLook = (patch: Partial<SoulLook>) => update(e => ({ ...e, look: { ...e.look, ...patch } }))
  const ofClass = v ? { ...SOUL_FOLLOW_DEFAULTS, ...SOUL_CLASSES[v.cls].params } : SOUL_FOLLOW_DEFAULTS
  const flight = v ? entryFollowParams(v) : SOUL_FOLLOW_DEFAULTS
  // its own number over its class's (the class's own value: no number of its own)
  const setFollow = <K extends keyof SoulFollowParams>(key: K, value: SoulFollowParams[K]) => update(e => {
    const own: Partial<SoulFollowParams> = { ...e.follow }
    if (value === ofClass[key]) delete own[key]; else own[key] = value
    return { ...e, follow: own }
  })
  // what it does let out: its own over its class's and its state's, the same way
  const actBase = v ? entryActBase(v) : SOUL_ACT_DEFAULTS, acts = v ? entryActParams(v) : SOUL_ACT_DEFAULTS
  const setAct = <K extends keyof SoulActParams>(key: K, value: SoulActParams[K]) => update(e => {
    const own: Partial<SoulActParams> = { ...e.act }
    if (value === entryActBase(e)[key]) delete own[key]; else own[key] = value
    return { ...e, act: own }
  })
  const actRange = (key: ActNumber) => {
    const n = acts[key], r = SOUL_ACT_RANGES[key], m = ACT_NUMBERS[key]
    return <PatioRange key={key} label={m.label} min={r.min} max={r.max} step={r.step} value={n} display={key === "chance" || key === "song" ? `${Math.round(n * 100)}%` : `${Math.round(n * 100) / 100}${m.unit ? ` ${m.unit}` : ""}`}
      changed={n !== actBase[key]} hint={m.hint} onChange={x => setAct(key, x)} onReset={() => setAct(key, actBase[key])} />
  }
  const setRecipe = (patch: Partial<SoulRecipe>) => update(e => ({ ...e, recipe: cleanRecipe({ ...e.recipe, ...patch }) }))
  const toggle = <T extends string>(list: readonly T[] | undefined, x: T) => (list?.includes(x) ? list.filter(o => o !== x) : [...(list ?? []), x])
  const base = v ? SOUL_ENTRIES.find(e => e.id === v.id) ?? null : null
  const changed = !!(v && base && JSON.stringify(v) !== JSON.stringify(base))
  const draft = useMemo(() => JSON.stringify(entries) !== JSON.stringify(SOUL_ENTRIES), [entries])
  const duplicate = () => { const made = addRare(entries, v); if (made) { commit(made.entries); setSel(made.id) } }
  const create = () => { const made = addRare(entries); if (made) { commit(made.entries); hover(null); pick(made.id, true) } }

  const traits = v ? entryTraits(v, entries) : null
  const row = "flex items-center justify-between gap-3"
  const chip = (key: string, label: string, on: boolean) => (
    <span key={key} className={on ? "rounded-md border border-[#ffd166]/60 px-2 py-1 text-[#ffd166]" : "rounded-md border border-white/10 px-2 py-1 text-white/30"}>{on ? `★ ${label}` : "?"}</span>
  )
  const pill = (key: string, label: string, on: boolean, press: () => void) => (
    <button key={key} type="button" aria-pressed={on} onClick={press} className={on ? "rounded-md border border-primary bg-primary/20 px-2 py-1 text-white" : "rounded-md border border-white/15 px-2 py-1 text-[#93a79a] hover:border-primary"}>{label}</button>
  )

  return (
    <>
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        {v && <button type="button" aria-label="Voltar à biblioteca" title="Voltar à biblioteca" onClick={() => pick(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><ArrowLeft className="h-4 w-4" /></button>}
        {v && editing
          ? <NameInput key={v.id} name={v.name} onName={name => update(o => ({ ...o, name }))} />
          : v ? <h2 className="min-w-0 flex-1 truncate text-sm text-white">{v.name}</h2> : null}
        {!v && <span className="min-w-0 flex-1 text-[#93a79a]" title="Almas encontradas e estrelas de notas e armas">{progress.found}/{progress.total} · <span className="text-[#ffd166]">★</span> {progress.stars}/{progress.allStars}</span>}
        {admin && <button type="button" aria-label="Editar fichas" aria-pressed={edit} title="Editar fichas (admin)" onClick={() => setEdit(x => !x)} className={edit ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary text-white" : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"}><Pencil className="h-4 w-4" /></button>}
      </div>
      <div ref={setScroller} className="min-h-0 flex-1 overflow-y-auto">
        {!v && (
          <>
            {/* where the collection is kept */}
            {!editing && (
              <div className="flex items-center gap-1.5 px-4 pt-3 text-[11px] text-[#93a79a]">
                {sync.status === "local" ? <CloudOff className="h-3.5 w-3.5 shrink-0" /> : <Cloud className={sync.status === "error" ? "h-3.5 w-3.5 shrink-0 text-[#ff6b5b]" : "h-3.5 w-3.5 shrink-0 text-primary"} />}
                <span className="min-w-0">
                  {sync.status === "local" ? "Neste navegador. Entre com sua conta para guardar as almas nela."
                    : sync.status === "syncing" ? "Sincronizando com a sua conta…"
                    : sync.status === "synced" ? "Na sua conta."
                    : sync.message}
                </span>
              </div>
            )}
            {sections.filter(s => s.entries.length || (editing && s.id === "rare")).map(s => (
              <section key={s.id} className="px-4 pt-3">
                <h3 className="flex items-center justify-between gap-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">
                  <span>{s.name}</span>
                  {editing && s.id === "rare" && <button type="button" onClick={create} className="inline-flex h-7 items-center gap-1 rounded-md border border-white/20 px-2 font-normal normal-case tracking-normal hover:border-primary"><Plus className="h-3.5 w-3.5" />Nova rara</button>}
                  <span className="font-normal">{s.entries.filter(e => col[e.id]).length}/{s.entries.length}</span>
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2">
                  {s.entries.map(e => {
                    const f = col[e.id], shown = !!f || editing, t = entryTraits(e, entries), all = t.notes.length + t.weapons.length
                    const stars = f ? t.notes.filter(n => f.notes.includes(n)).length + t.weapons.filter(w => f.weapons.includes(w)).length : 0
                    return (
                      <button key={e.id} type="button" disabled={!shown} aria-label={shown ? e.name : "Alma ainda não capturada"} title={shown ? undefined : hintOf(e)} onClick={() => { hover(null); pick(e.id) }}
                        onPointerEnter={() => { if (shown) hover(e.id) }} onPointerLeave={() => { if (moving.current === e.id) hover(null) }}
                        onFocus={() => { if (shown) hover(e.id) }} onBlur={() => { if (moving.current === e.id) hover(null) }} className="grid min-w-0 content-start gap-1 rounded-lg border border-white/10 bg-[#0b110e] p-1.5 text-left enabled:hover:border-primary">
                        <canvas ref={setCard(e, shown)} aria-hidden="true" className="h-20 w-full rounded-md bg-[#1b2531]" />
                        <span className={shown ? "min-h-[30px] px-0.5 text-[12px] leading-[15px] text-white" : "min-h-[30px] px-0.5 text-[12px] leading-[15px] text-white/30"}>{shown ? e.name : "???"}</span>
                        <span className="flex justify-between gap-1 px-0.5 text-[10px]">
                          {shown ? <span className="truncate" style={{ color: SOUL_RARITIES[e.rarity].color }}>{SOUL_RARITIES[e.rarity].name}</span> : <span>&nbsp;</span>}
                          {f && all > 0 && <span className={stars === all ? "shrink-0 text-[#ffd166]" : "shrink-0 text-[#93a79a]"}>★ {stars}/{all}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
            {editing && (
              <SaveToGameButton part="souls" save={() => saveDefaultSouls(entries)} className="justify-end px-4 pt-4"
                onRevert={() => commit(SOUL_ENTRIES)} revertDisabled={!draft} />
            )}
            <div className="h-4" />
          </>
        )}
        {v && traits && (
          <>
            <div className="grid gap-3 px-4 py-3">
              <canvas ref={preview} role="button" tabIndex={0} aria-label={`${v.name}: ouvir`} title="Ouvir" onClick={() => soulSound(v)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); soulSound(v) } }} className="h-36 w-full cursor-pointer rounded-lg bg-[#1b2531]" />
              {editing && (
                <div className="flex flex-wrap gap-1.5">
                  {v.recipe && <button type="button" aria-label="Subir" title="Antes na lista: a primeira receita que serve leva a alma" onClick={() => commit(moveRare(entries, v.id, -1))} className={small}><ArrowUp className="h-3.5 w-3.5" /></button>}
                  {v.recipe && <button type="button" aria-label="Descer" title="Depois na lista" onClick={() => commit(moveRare(entries, v.id, 1))} className={small}><ArrowDown className="h-3.5 w-3.5" /></button>}
                  <span className="flex-1" />
                  <button type="button" onClick={duplicate} title="Uma rara nova a partir desta" className={small}><Copy className="h-3.5 w-3.5" />Duplicar como rara</button>
                  {base && <button type="button" disabled={!changed} title="Volta esta ficha para a do game" onClick={() => commit(resetEntry(entries, v.id))} className={small}>Padrão</button>}
                  {v.recipe && <button type="button" title="Apaga esta rara" onClick={() => { const id = v.id; pick(null); commit(removeRare(entries, id)) }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-2 hover:border-[#ff6b5b]"><Trash2 className="h-3.5 w-3.5" />Excluir</button>}
                </div>
              )}
              {!editing && (
                <div className="grid gap-2">
                  <div className={row}><span>Raridade</span><span style={{ color: SOUL_RARITIES[v.rarity].color }}>{SOUL_RARITIES[v.rarity].name}</span></div>
                  <div className={row}><span>Espécie</span><span className="text-white">{speciesOf(v)}</span></div>
                  {v.species !== "chick" && <div className={row}><span>Estado</span><span className="text-white">{stateOf(v)}</span></div>}
                  {v.species !== "chick" && <div className={row}><span>Instrumento</span><span className="text-white">{shotOf(v)}</span></div>}
                  <div className={row}><span>Voo</span><span className="text-white">{entryClassName(v)}</span></div>
                  {acts.help !== "none" && <div className={row}><span>Ajuda</span><span className="text-white">{SOUL_HELPS[acts.help]}</span></div>}
                  {acts.hinder !== "none" && acts.chance > 0 && <div className={row}><span>Atrapalho</span><span className="text-white">{hinderName(v, acts)}</span></div>}
                  {acts.poopEvery > 0 && <div className={row}><span>Caga</span><span className="text-white">{acts.poopSpare ? "Poupa o dono" : "Até no dono"}</span></div>}
                  {got && <div className={row}><span>Capturadas</span><span className="text-white">{got.n}</span></div>}
                  {got && got.at > 0 && <div className={row}><span>Primeira captura</span><span className="text-white">{new Date(got.at).toLocaleDateString("pt-BR")}</span></div>}
                  <div className={row}><span>Inspiration</span>
                    <button type="button" title="Abrir no Guia de pássaros" onClick={() => onBird?.(v.bird)} className="min-w-0 truncate text-right text-primary hover:underline"><i>{entryBird(v).sci}</i> · {entryBird(v).name}</button>
                  </div>
                </div>
              )}
              {!editing && (
                <div className="grid gap-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">Receita</h3>
                  <p className="leading-relaxed text-white">{recipeText(v)}</p>
                </div>
              )}
              {!editing && got && traits.notes.length > 0 && (
                <div className="grid gap-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">Notas</h3>
                  <div className="flex flex-wrap gap-1.5">{traits.notes.map(n => chip(n, SOUL_NOTES[n], got.notes.includes(n)))}</div>
                </div>
              )}
              {!editing && got && traits.weapons.length > 0 && (
                <div className="grid gap-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">Armas</h3>
                  <div className="flex flex-wrap gap-1.5">{traits.weapons.map(w => chip(w, SOUL_WEAPONS[w], got.weapons.includes(w)))}</div>
                </div>
              )}
            </div>
            {editing && GROUPS.filter(g => g !== "Receita" || v.recipe).map(g => (
              <details key={g} open={!!open[g]} onToggle={e => { const o = (e.currentTarget as HTMLDetailsElement).open; setOpen(s => ({ ...s, [g]: o })) }} className="border-t border-white/10">
                <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#93a79a] hover:text-white">{g}</summary>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-field px-4 pb-4">
                  {g === "Ficha" && (
                    <>
                      <label className={row}><span>Raridade</span>
                        <StepSelect value={v.rarity} onChange={e => { const r = e.target.value as SoulRarity; update(o => ({ ...o, rarity: r })) }} className={field}>
                          {(Object.keys(SOUL_RARITIES) as SoulRarity[]).map(r => <option key={r} value={r}>{SOUL_RARITIES[r].name}</option>)}
                        </StepSelect>
                      </label>
                      <label className={row} title="A classe dá os números do voo; a aba Voo muda os desta alma"><span>Classe de voo</span>
                        <StepSelect value={v.cls} onChange={e => { const c = e.target.value as SoulClassId; update(o => ({ ...o, cls: c })) }} className={field}>
                          {(Object.keys(SOUL_CLASSES) as SoulClassId[]).map(c => <option key={c} value={c}>{SOUL_CLASSES[c].name}</option>)}
                        </StepSelect>
                      </label>
                      <label className={row} title="A ave real que inspira esta alma: a voz das notas dela e o canto real que ela solta de vez em quando"><span>Inspiration</span>
                        <select value={v.bird} onChange={e => { const b = e.target.value; update(o => ({ ...o, bird: b })) }} className={field}>
                          {GUIDE_BIRDS.map(b => <option key={b.id} value={b.id}>{b.name} ({b.sci})</option>)}
                        </select>
                      </label>
                      {!v.recipe && <p className="text-[10px] text-[#93a79a]">{speciesOf(v)}{v.species !== "chick" ? ` · ${stateOf(v)} · ${shotOf(v)}` : ""}</p>}
                    </>
                  )}
                  {g === "Aparência" && (
                    <>
                      <label className={row}><span>Forma</span>
                        <StepSelect value={v.look.shape} onChange={e => setLook({ shape: e.target.value as SoulShape })} className={field}>
                          {(Object.keys(SOUL_SHAPES) as SoulShape[]).map(s => <option key={s} value={s}>{SOUL_SHAPES[s].name}</option>)}
                        </StepSelect>
                      </label>
                      <PatioRange label="Tamanho do pixel" min={SOUL_PIXEL.min} max={SOUL_PIXEL.max} step={1} value={v.look.pixel} display={`${v.look.pixel} px`}
                        changed={!!base && v.look.pixel !== base.look.pixel} onChange={x => setLook({ pixel: x })} onReset={base ? () => setLook({ pixel: base.look.pixel }) : undefined} />
                      {SOUL_LOOK_COLOURS.map(k => (
                        <label key={k} className={row}><span>{COLOUR_LABELS[k]}</span>
                          <input type="color" aria-label={COLOUR_LABELS[k]} value={v.look[k]} onChange={e => setLook({ [k]: e.target.value })} className="h-8 w-14 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
                        </label>
                      ))}
                      <label className={row}><span>Olho brilhante</span>
                        <input type="checkbox" checked={v.look.halo} onChange={e => setLook({ halo: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
                      </label>
                    </>
                  )}
                  {g === "Voo" && (
                    <>
                      <label className={row}><span>Lado</span>
                        <StepSelect value={flight.side} onChange={e => setFollow("side", e.target.value as SoulSide)} className={field}>
                          {(Object.keys(SOUL_SIDES) as SoulSide[]).map(s => <option key={s} value={s}>{SOUL_SIDES[s]}</option>)}
                        </StepSelect>
                      </label>
                      <label className={row}><span>No lugar</span>
                        <StepSelect value={flight.pattern} onChange={e => setFollow("pattern", e.target.value as SoulPattern)} className={field}>
                          {(Object.keys(SOUL_PATTERNS) as SoulPattern[]).map(p => <option key={p} value={p}>{SOUL_PATTERNS[p]}</option>)}
                        </StepSelect>
                      </label>
                      <div className="grid gap-field">
                        {FOLLOW_NUMBERS.map(m => {
                          const n = flight[m.key], r = SOUL_FOLLOW_RANGES[m.key]
                          return <PatioRange key={m.key} label={m.label} min={r.min} max={r.max} step={r.step} value={n} display={`${Math.round(n * 100) / 100}${m.unit ? ` ${m.unit}` : ""}`}
                            changed={n !== ofClass[m.key]} hint={m.hint} onChange={x => setFollow(m.key, x)} onReset={() => setFollow(m.key, ofClass[m.key])} />
                        })}
                      </div>
                    </>
                  )}
                  {g === "Exploração" && (
                    <div className="grid gap-field">
                      {(flight.roam > 0 ? ROAM_NUMBERS : ROAM_NUMBERS.slice(0, 1)).map(m => {
                        const n = flight[m.key], r = SOUL_FOLLOW_RANGES[m.key]
                        return <PatioRange key={m.key} label={m.label} min={r.min} max={r.max} step={r.step} value={n} display={`${Math.round(n * 100) / 100}${m.unit ? ` ${m.unit}` : ""}`}
                          changed={n !== ofClass[m.key]} hint={m.hint} onChange={x => setFollow(m.key, x)} onReset={() => setFollow(m.key, ofClass[m.key])} />
                      })}
                    </div>
                  )}
                  {g === "Ações" && (
                    <>
                      <label className={row}><span>Ajuda</span>
                        <StepSelect value={acts.help} onChange={e => setAct("help", e.target.value as SoulHelp)} className={field}>
                          {(Object.keys(SOUL_HELPS) as SoulHelp[]).map(h => <option key={h} value={h}>{SOUL_HELPS[h]}</option>)}
                        </StepSelect>
                      </label>
                      <div className="grid gap-field">{(["every", "range", "power"] as const).map(actRange)}</div>
                      <label className={row} title="O da própria alma: a morta, pelo que a matou (explosão empurra, bala faz quicar, flecha desvia a mira, impacto bica); a viva de nota fora da escala desafina"><span>Atrapalho</span>
                        <StepSelect value={acts.hinder} onChange={e => setAct("hinder", e.target.value as SoulHinder)} className={field}>
                          {(Object.keys(SOUL_HINDERS) as SoulHinder[]).map(h => <option key={h} value={h}>{SOUL_HINDERS[h]}</option>)}
                        </StepSelect>
                      </label>
                      <div className="grid gap-field">{(["chance", "force"] as const).map(actRange)}</div>
                      <div className="grid gap-field">{actRange("song")}</div>
                      <div className="grid gap-field">{(acts.poopEvery > 0 ? ["poopEvery", "poopDamage"] as const : ["poopEvery"] as const).map(actRange)}</div>
                      {acts.poopEvery > 0 && (
                        <label className={row} title="Ligado, ela nunca caga no próprio dono; desligado, o dono é um boneco como os outros"><span>Poupar o dono</span>
                          <input type="checkbox" checked={acts.poopSpare} onChange={e => setAct("poopSpare", e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
                        </label>
                      )}
                    </>
                  )}
                  {g === "Receita" && v.recipe && (
                    <>
                      <div className="grid gap-1.5"><span>Espécie</span><div className="flex flex-wrap gap-field">{SOUL_SPECIES_ORDER.filter(s => s !== "chick").map(s => pill(s, SOUL_SPECIES[s].name, !!v.recipe?.species?.includes(s), () => setRecipe({ species: toggle(v.recipe?.species, s) })))}</div></div>
                      <label className={row}><span>Estado</span>
                        <StepSelect value={v.recipe.state ?? ""} disabled={!!v.recipe.weapon} onChange={e => setRecipe({ state: (e.target.value || undefined) as SoulRecipe["state"] })} className={field}>
                          <option value="">Qualquer</option><option value="alive">{SOUL_STATES.alive}</option><option value="dead">{SOUL_STATES.dead}</option>
                        </StepSelect>
                      </label>
                      <div className="grid gap-1.5"><span>Instrumento</span><div className="flex flex-wrap gap-field">{SOUL_SHOT_ORDER.map(s => pill(s, SOUL_SHOTS[s].name, !!v.recipe?.shot?.includes(s), () => setRecipe({ shot: toggle(v.recipe?.shot, s) })))}</div></div>
                      <div className="grid gap-1.5"><span>Nota</span><div className="flex flex-wrap gap-field">{SOUL_NOTE_ORDER.map(n => pill(n, SOUL_NOTES[n], !!v.recipe?.note?.includes(n), () => setRecipe({ note: toggle(v.recipe?.note, n) })))}</div></div>
                      <div className="grid gap-1.5"><span>Arma (só mortas)</span><div className="flex flex-wrap gap-field">{SOUL_WEAPON_ORDER.map(w => pill(w, SOUL_WEAPONS[w], !!v.recipe?.weapon?.includes(w), () => setRecipe({ weapon: toggle(v.recipe?.weapon, w) })))}</div></div>
                      <p className={traits.notes.length ? "text-[10px] text-[#93a79a]" : "text-[10px] text-amber-300"}>{traits.notes.length ? "Sem nada marcado num eixo, vale qualquer. A primeira rara da lista que serve leva a alma." : "Nenhuma alma cumpre esta receita, ou outra rara antes dela leva todas."}</p>
                    </>
                  )}
                </div>
              </details>
            ))}
          </>
        )}
      </div>
    </>
  )
}
