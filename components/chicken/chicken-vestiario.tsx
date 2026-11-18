"use client"

// Vestiário (ported from the "Pátio da Caipira" prototype): picks the chicken's look by breed or part by
// part, with art thumbnails and a big preview. It edits the look of the Pátio's draft of the central
// configuration, so "Salvar no game" in Ajustes saves it for every screen together with the params.
import { useEffect, useState, useSyncExternalStore } from "react"
import { Lock, X } from "lucide-react"
import { LOOK_ART, type ChickenLook, type ChickenSlot } from "@/lib/chicken/look-art"
import { variantClass } from "@/lib/chicken/beast-art"
import { babyArt, babyClassOf, babySkins, defaultBabySkin, getBaby, setBaby, subscribeBaby, type BabyState } from "@/lib/chicken/baby"

const NO_BABY: BabyState = { on: false, skin: null, bar: 0 }
import { RARITIES, RARITY_COLOR, RARITY_LABEL, breedRarity, itemRarity, type Rarity } from "@/lib/chicken/rarity"
import { cn } from "@/lib/utils"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { FrameControls, FrameOverlay, frameView } from "./frame-editor"
import type { BodyFrames, FrameClass } from "@/lib/chicken/body-frame"

/** The admin's Hit-area editor: the central configuration's frames (draft and saved) and its Salvar no game. */
export type FramesEdit = { value: BodyFrames; saved: BodyFrames; onChange: (f: BodyFrames) => void; onSave: () => void; saving: boolean; note: string | null }
// the look each class shows in the editor when the current look is of another class
const CLASS_LOOK: Record<Exclude<FrameClass, "baby">, string> = { chi: "caipira", pig: "porco-rosa", ken: "raposa-vermelha" }
const lookFrame = (l: ChickenLook): FrameClass => { const k = variantClass(l.torso); return k === "porco" ? "pig" : k === "raposa" ? "ken" : "chi" }

const UNLOCK = "chickenchess:chicken-vest-unlock-all:v1"
type Src = "green" | "gold" | "red"
// where each variant comes from: Caipira items come with the player; the others are earned (gold) or bought (red)
const SRC: Record<string, Src> = { caipira: "green", none: "green", angola: "gold", onagadori: "red", "porco-rosa": "green", "raposa-vermelha": "green" }
// the other pigs and foxes are earned
const srcOf = (id: string): Src => SRC[id] ?? (variantClass(id) === "galinha" ? "green" : "gold")
const SRC_LABEL: Record<Src, string> = { green: "liberado", gold: "conquista", red: "loja" }
// the cards' border: a neutral gray, so it never reads as a player's color (players are told apart by color)
const CARD_BORDER = "#3a3e42"
const SRC_COLOR: Record<Src, string> = { green: "#1fd39a", gold: "#f2c14e", red: "#ef4b4b" }
// the three protagonists come with the player: Chi (the Caipira), Pig and Ken
const OWNED = new Set(["caipira", "none", "porco-rosa", "raposa-vermelha"])
// the species class of each breed: it sets the movement; the breed only the look
const KLASS: Record<string, string> = { galinha: "Galinha", porco: "Porco", raposa: "Raposa" }
const TABS = [{ id: "racas", label: "Raças" }, { id: "cabeca", label: "Cabeça" }, { id: "penas", label: "Penas" }, { id: "corpo", label: "Corpo" }, { id: "pernas", label: "Pernas" }, { id: "acessorios", label: "Acessórios" }]

const sameLook = (a: ChickenLook, b: ChickenLook) => LOOK_ART.SLOTS.every(s => a[s.id] === b[s.id])
const fullView = (look: ChickenLook) => (look.tail === "onagadori" ? "-350 -246 440 270" : "-110 -246 200 270")

export function ChickenHeadIcon({ look }: { look: ChickenLook }) {
  return <svg viewBox="12 -232 70 70" aria-hidden="true" className="h-full w-full" dangerouslySetInnerHTML={{ __html: LOOK_ART.headSvg(look) }} />
}

export function ChickenVestiario({ look, savedLook, onChange, onClose, admin = false, frames }: { look: ChickenLook; savedLook: ChickenLook; onChange: (look: ChickenLook) => void; onClose: () => void; admin?: boolean; frames?: FramesEdit }) {
  const [tab, setTab] = useState(() => (typeof window !== "undefined" && getBaby().on ? "filhote" : "racas"))
  const [unlockAll, setUnlockAll] = useState(false)
  useEffect(() => { try { setUnlockAll(window.localStorage.getItem(UNLOCK) === "1") } catch { /* storage unavailable */ } }, [])
  const toggleUnlock = (v: boolean) => { setUnlockAll(v); try { window.localStorage.setItem(UNLOCK, v ? "1" : "0") } catch { /* ignore */ } }
  const owned = (v: string) => unlockAll || OWNED.has(v)
  const dirty = !sameLook(look, savedLook)
  // a Filhote only changes to another baby of its class (lib/chicken/baby.ts); the admin is never stuck in it:
  // the other tabs stay, and picking a breed or a part makes it an adult with that look
  const baby = useSyncExternalStore(subscribeBaby, getBaby, () => NO_BABY)
  const babySkin = baby.skin ?? defaultBabySkin(look)
  const cur = baby.on && !admin ? "filhote" : !baby.on && tab === "filhote" ? "racas" : tab
  const tabs = baby.on ? [{ id: "filhote", label: "Filhote" }, ...(admin ? TABS : [])] : TABS
  const pick = (l: ChickenLook) => { if (baby.on) setBaby({ on: false }); onChange(l) }
  // the Hit-area editor (admin): the class it edits starts as the one on screen
  const [editFrames, setEditFrames] = useState(false)
  const [fc, setFc] = useState<FrameClass>(() => baby.on ? "baby" : lookFrame(look))
  const frameEdit = admin && frames && editFrames ? frames : null
  const frameLook = fc === "baby" || lookFrame(look) === fc ? look : LOOK_ART.breedLook(CLASS_LOOK[fc])
  const previewView = frameEdit ? (fc === "baby" ? "-90 -210 180 220" : fullView(frameLook)) : baby.on ? "-90 -210 180 220" : fullView(look)
  const previewHtml = frameEdit ? (fc === "baby" ? LOOK_ART.composeSet(babyArt(look, babySkin)) : LOOK_ART.compose(frameLook)) : baby.on ? LOOK_ART.composeSet(babyArt(look, babySkin)) : LOOK_ART.compose(look)
  const shownView = frameEdit ? frameView(previewView, frameEdit.value[fc]) : previewView

  // the photo's background takes a tint of the item's rarity; where it comes from only colors the small label
  const card = (key: string, src: Src, rarity: Rarity, locked: boolean, on: boolean, art: React.ReactNode, name: React.ReactNode, label: string, onPick: () => void, wide = false) => (
    <button
      key={key}
      type="button"
      aria-pressed={on}
      aria-label={label + `, ${RARITY_LABEL[rarity].toLowerCase()}` + (locked ? `, bloqueado (${SRC_LABEL[src]})` : "") + (on ? ", no visual" : "")}
      onClick={onPick}
      className={cn("relative flex flex-col gap-1.5 rounded-[10px] border-2 p-1.5 pb-2 text-left text-[11px] transition-[opacity,transform] hover:-translate-y-px hover:opacity-100", on ? "bg-[#1a221d]" : "bg-[#0b110e]", locked && "opacity-50")}
      style={{ borderColor: on ? "#8b9096" : CARD_BORDER }}
    >
      <div
        className={cn("w-full overflow-hidden rounded-md", wide ? "aspect-[16/10]" : "aspect-square")}
        style={{ background: `radial-gradient(120% 90% at 50% 80%, color-mix(in srgb, ${RARITY_COLOR[rarity]} 42%, #17241c), color-mix(in srgb, ${RARITY_COLOR[rarity]} 16%, #121a15))` }}
      >{art}</div>
      {locked && <span className="absolute left-2.5 top-2.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-[#05060c]/75 text-white"><Lock className="h-3 w-3" /></span>}
      {on && <span className="absolute right-2.5 top-2.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-white text-xs font-bold text-[#05060c]">✓</span>}
      <span className="min-h-[2.7em] leading-snug">{name}</span>
      <span className="flex items-center justify-between gap-1 text-[9px] uppercase tracking-wider">
        <span style={{ color: SRC_COLOR[src] }}>{locked ? "bloqueado · " : ""}{SRC_LABEL[src]}</span>
        <span className="text-[#93a79a]">{RARITY_LABEL[rarity]}</span>
      </span>
    </button>
  )
  const svg = (view: string, html: string) => <svg viewBox={view} aria-hidden="true" className="h-full w-full" dangerouslySetInnerHTML={{ __html: html }} />

  let body: React.ReactNode
  if (cur === "filhote") {
    const klass = babyClassOf(look)
    body = (
      <section className="grid gap-3 border-b border-white/10 px-4 py-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">Filhote</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2.5">
          {babySkins(klass).map(k => card(k.id, "green", "comum", false, babySkin === k.id, svg("-90 -210 180 220", LOOK_ART.composeSet(babyArt(look, k.id))), k.label, `Filhote: ${k.label}`, () => setBaby({ skin: k.id })))}
        </div>
      </section>
    )
  } else if (cur === "racas") {
    body = ([["galinhas", "Galinhas"], ["galos", "Galos"], ["porcos", "Porcos"], ["raposas", "Raposas"]] as const).map(([cat, title]) => {
      const list = LOOK_ART.BREEDS.filter(b => b.cat === cat)
      return (
        <section key={cat} className="grid gap-3 border-b border-white/10 px-4 py-3.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">{title}</h3>
          {list.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-2.5">
              {list.map(br => {
                const l = LOOK_ART.breedLook(br.id)
                const locked = LOOK_ART.SLOTS.some(s => !owned(l[s.id]))
                return card(br.id, srcOf(br.id), breedRarity(br.id), locked, sameLook(look, l), svg(fullView(l), LOOK_ART.compose(l)), <>{br.label}<br /><small className="text-[#93a79a]">classe {KLASS[br.klass] ?? br.klass}</small></>, br.label, () => pick(l), true)
              })}
            </div>
          ) : <p className="rounded-[10px] border border-dashed border-white/15 p-3.5 text-center text-[#93a79a]">Em breve</p>}
        </section>
      )
    })
  } else if (cur === "acessorios") {
    body = (
      <section className="grid gap-3 border-b border-white/10 px-4 py-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">Acessórios</h3>
        <div className="flex flex-wrap gap-1.5">{["Chapéus", "Óculos", "Colares", "Mochilas", "Sapatos"].map(n => <span key={n} className="rounded-full border border-white/15 px-2.5 py-1.5 text-[#93a79a]">{n}</span>)}</div>
        <p className="rounded-[10px] border border-dashed border-white/15 p-3.5 text-center text-[#93a79a]">Os acessórios chegam na próxima etapa.</p>
      </section>
    )
  } else {
    // parts of the same species class as the current look only: a fox's head never goes on a chicken
    const klass = variantClass(look.torso)
    body = LOOK_ART.SLOTS.filter(s => s.tab === cur).map(slot => ({ slot, list: Object.entries(LOOK_ART.art[slot.id]).filter(([v]) => v === "none" ? klass === "galinha" : variantClass(v) === klass) })).filter(({ list }) => list.length > 1 || klass === "galinha").map(({ slot, list }) => (
      <section key={slot.id} className="grid gap-3 border-b border-white/10 px-4 py-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#93a79a]">{slot.label}</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2.5">
          {list.map(([v, it]) => {
            const l = { ...look, [slot.id]: v }
            const view = slot.id === "tail" && LOOK_ART.TAIL_VIEW[v] ? LOOK_ART.TAIL_VIEW[v] : LOOK_ART.VIEW[slot.id]
            const art = slot.id === "tail" ? svg(view, it.svg ?? "") : svg(view, LOOK_ART.compose(l))
            return card(v, srcOf(v), itemRarity(slot.id, v), !owned(v), look[slot.id] === v, art, it.label, `${slot.label}: ${it.label}`, () => pick({ ...look, [slot.id as ChickenSlot]: v }))
          })}
        </div>
      </section>
    ))
  }

  return (
    <FloatingPanel id="chicken-vestiario" data-chicken-ignore aria-label="Vestiário" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(740, vw - 24), h: vh - 104 })} minW={300} minH={320} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <h2 className="flex-1 text-sm text-white">Vestiário</h2>
        {admin && frames && <button type="button" aria-pressed={editFrames} onClick={() => setEditFrames(v => !v)} className={cn("h-8 rounded-md border px-3", editFrames ? "border-[#4cc9f0] text-[#4cc9f0]" : "border-white/15 text-[#93a79a] hover:border-primary hover:text-white")}>Hit-area</button>}
        {dirty && <span className="rounded-full border border-amber-300/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">rascunho</span>}
        <button type="button" aria-label="Fechar vestiário" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      {/* side by side when the window is wide enough (its own width, it can be resized) */}
      <div className="@container flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col @xl:flex-row">
        <div className="relative h-56 shrink-0 border-b border-primary/30 bg-[radial-gradient(120%_70%_at_50%_85%,rgba(31,211,154,0.09),transparent_70%)] @xl:h-auto @xl:w-[260px] @xl:border-b-0 @xl:border-r">
          <p className="absolute left-3.5 top-2.5 text-[10px] uppercase tracking-wider text-[#93a79a]">Prévia</p>
          <div className="absolute inset-x-3 bottom-8 top-8">{svg(shownView, previewHtml)}{frameEdit && <FrameOverlay view={shownView} frame={frameEdit.value[fc]} onChange={f => frameEdit.onChange({ ...frameEdit.value, [fc]: f })} />}</div>
          {!frameEdit && <div className="absolute inset-x-0 bottom-8 h-0.5 bg-primary/55" />}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {frameEdit ? <div className="min-h-0 flex-1 overflow-y-auto"><FrameControls cls={fc} onClass={setFc} frames={frameEdit.value} saved={frameEdit.saved} onChange={frameEdit.onChange} onSave={frameEdit.onSave} saving={frameEdit.saving} note={frameEdit.note} /></div> : <>
          <nav role="tablist" className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-2.5 py-2">
            {tabs.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={cur === t.id} onClick={() => setTab(t.id)} className={cn("h-[34px] whitespace-nowrap rounded-md px-3 font-semibold", cur === t.id ? "bg-[#22302a] text-white shadow-[inset_0_0_0_1px_rgba(31,211,154,0.6)]" : "text-[#93a79a] hover:text-white")}>{t.label}</button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {body}
            <section className="flex flex-wrap gap-x-3.5 gap-y-1.5 px-4 py-3.5 text-[11px] text-[#93a79a]">
              {RARITIES.map(r => <span key={r}><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-[-1px]" style={{ background: RARITY_COLOR[r] }} />{RARITY_LABEL[r]}</span>)}
              <span className="basis-full" />
              {(["green", "gold", "red"] as Src[]).map(s => <span key={s} className="uppercase tracking-wider" style={{ color: SRC_COLOR[s] }}>{SRC_LABEL[s]}</span>)}
            </section>
          </div>
          </>}
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-4 py-2.5">
            <p className="flex-1 text-[#93a79a]">{dirty ? "Visual alterado. “Salvar no game” em Ajustes grava para todas as telas." : "Visual igual ao salvo."}</p>
            <label className="flex items-center gap-2 text-[11px] text-[#93a79a]"><input type="checkbox" checked={unlockAll} onChange={e => toggleUnlock(e.target.checked)} className="accent-[var(--primary)]" />Tudo liberado (dev)</label>
            <button type="button" disabled={!dirty} onClick={() => onChange(savedLook)} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary disabled:opacity-45">Desfazer</button>
          </footer>
        </div>
      </div>
      </div>
    </FloatingPanel>
  )
}
