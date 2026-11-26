"use client"

// Popup with every number of the PigChicKen items (weapons and instruments), one item at a time
// picked in the dropdown at the top. Saved in this browser; the Parquinho follows it live.
import { cn } from "@/lib/utils"
import { msg, useT } from "@/lib/i18n"
import { StepSelect } from "@/components/ui/step-select"
import { PatioRange } from "@/components/ui/patio-range"
import { PatioDualRange } from "@/components/ui/patio-dual-range"
import { VOLUME_SNAP } from "@/lib/pigchicken/aim-volume"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { ACCEL_CURVES, ARPS, CAGE_IDS, CONSUMABLE_IDS, EFFECT_LOOKS, PATH_SHOWS, DEFAULT_ITEMS, FIXED_IDS, HAND_DELAYS, INSTRUMENT_IDS, ITEM_PARAM_GROUPS, ITEM_PARAM_META, KEY_IDS, TROPHY_IDS, MINE_ITEM_IDS, MAGIC_IDS, SPECIAL_KINDS, SPORTS_IDS, TREMOLO_AXES, WEAPON_IDS, currentHeldItem, currentPlayerClass, isStaff, itemsDefaultsFile, itemsTuning, loadItems, classItem, pointsOf, POINT_KEYS, saveItems, subscribeHeldItem, subscribeItems, subscribePlayerClass, type PointClass, type AccelCurve, type Arp, type EffectLook, type FireMode, type PathShow, type ItemDef, type ItemId, type SpecialKind, type TremoloAxis } from "@/lib/pigchicken/items"
import { HANG_VOICES, VOICE_LABELS, type VoiceId } from "@/lib/pigchicken/synth"
import { COMBO_COOLDOWNS, COMBO_MAX, COMBO_REACHES, COMBO_TIMES, SWING_KINDS, comboBlow, type BlowKind, type ComboStep } from "@/lib/pigchicken/swing"
import { AngleKnob, ComboWindowBar } from "./combo-controls"
import { ChainEditor } from "./chain-editor"
import { CagesView } from "./cages-view"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { ResetArrow } from "@/components/ui/reset-arrow"
import { patioSaveOf, tuningLocked } from "@/lib/pigchicken/patio-tuning"
import { LockedFieldset } from "@/components/pigchicken/tuning-lock"
import { useTuningVersion } from "@/hooks/use-game-defaults"
import { saveDefaultItems } from "@/lib/admin/game-defaults-client"
import { ItemPointsEditor } from "./item-points-editor"
import { StaffPoseEditor } from "./staff-pose-editor"
import { INSTRUMENT_SCALES, INSTRUMENT_SCALE_IDS } from "@/lib/pigchicken/instrument-scales"

const FIRE_MODES: { value: FireMode; label: string }[] = [
  { value: "semi", label: msg("Semi (um por toque)") },
  { value: "auto", label: msg("Automático") },
  { value: "burst", label: msg("Rajada") },
  { value: "charge", label: msg("Carga (segura e solta)") },
  { value: "release", label: msg("Ao soltar o botão") },
]

// what each item uses; the wing has no ammo, projectile or throw; a consumable has its effect (and its doses), a slap and a
// throw; the taco has no shots, but its blows are its ammo (Munição)
const CONSUMABLE_HIDES = ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Desenho", "Pontos", "Explosão", "Música", "Rebate"]
const HIDDEN: Partial<Record<ItemId, string[]>> = {
  // a fixed instrument is never carried, thrown nor swung: only its notes (Projétil) and its music
  pedalharp: ["Disparo", "Munição", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Combo", "Rebate"],
  drumkit: ["Disparo", "Munição", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Combo", "Rebate"],
  grandpiano: ["Disparo", "Munição", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Combo", "Rebate"],
  peck: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Combo", "Rebate"],
  bat: ["Disparo", "Projétil", "Espalhamento", "Explosão", "Efeito"],
  passagua: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Explosão", "Efeito", "Música", "Rebate"],
  mjolnir: ["Disparo", "Munição", "Projétil", "Espalhamento", "Explosão", "Efeito", "Música"],
  odinstaff: ["Disparo", "Munição", "Projétil", "Espalhamento", "Explosão", "Efeito", "Música"],
  // the Boomerang and the decks: staffs thrown that come back, with no shock; a deck's cards burst (Explosão), the
  // blue one's in a note (Música)
  boomerang: ["Disparo", "Munição", "Projétil", "Espalhamento", "Explosão", "Efeito", "Música", "Choque", "Especial"],
  // the Corrente-gancho: a staff whose Atirar throws the hook (Gancho), with no shock
  hook: ["Disparo", "Munição", "Projétil", "Espalhamento", "Explosão", "Efeito", "Música", "Choque", "Especial"],
  cardsRed: ["Disparo", "Munição", "Projétil", "Espalhamento", "Efeito", "Música", "Choque", "Especial"],
  cardsBlue: ["Disparo", "Munição", "Projétil", "Espalhamento", "Efeito", "Choque", "Especial"],
  wing: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito"],
  // Pig's chain and Ken's tail: only their blows (quick, in the combo, and strong), and the notes they rebate
  // the Filhote's piu: only its note (Projétil)
  piu: ["Disparo", "Munição", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Golpe", "Golpe forte", "Combo", "Rebate", "Bicada", "Música"],
  chainBlow: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Música"],
  tailBlow: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Música"],
  ...Object.fromEntries(CONSUMABLE_IDS.map(id => [id, CONSUMABLE_HIDES])),
  // a key only opens Baús: it has no effect, just its slap and its throw
  ...Object.fromEntries([...KEY_IDS, ...TROPHY_IDS].map(id => [id, [...CONSUMABLE_HIDES, "Efeito"]])),
  ...Object.fromEntries(MINE_ITEM_IDS.map(id => [id, [...CONSUMABLE_HIDES, "Efeito"]])),
}
// Pontos of a staff (how she carries it, lib/pigchicken/staff-pose.ts); the other items have the pivot and the wings' points
// the strong blow's own shock numbers, for the staffs that have a strong blow (one that is thrown and comes back has none)
const HEAVY_SHOCK: (keyof ItemDef)[] = ["heavyShockRange", "heavyShockTime"]
// what a deck does not use: its cards fly straight to the reticle with no charge and only burst (no fuse)
const DECK_UNUSED: (keyof ItemDef)[] = ["returnDamage", "returnMin", "returnCharge", "returnPush", "returnCurveMin", "returnCurveMax", "fuse", "bounce"]
// what Pig and Ken hit with when empty-handed (lib/pigchicken/combat.ts bareDef)
const BARE_BLOWS: ItemId[] = ["chainBlow", "tailBlow"]
// what the Filhote's piu note has of a projectile
const PIU_KEYS: (keyof ItemDef)[] = ["speed", "drop", "damage", "range", "size"]
const CLASS_LABEL: Record<PointClass, string> = { chi: "Chi", pig: "Pig", fox: "Ken" }
const STAFF_POINTS: (keyof ItemDef)[] = ["gripX", "gripY", "grip2X", "grip2Y", "staffX", "staffY", "staffAngle", "windX", "windY", "windAngle"]
// the arc a combo blow of this kind starts with: another blow of the same kind, the code's, or 150°
const comboArc = (combo: ComboStep[], base: ItemDef, kind: BlowKind) =>
  combo.find(c => c.kind === kind)?.arc ?? base.combo.find(c => c.kind === kind)?.arc ?? 150
// a combo blow's lists take only the width of what they show (no arrow, and the chosen option's width where the browser can)
const COMBO_BOX = "h-8 cursor-pointer appearance-none rounded-md border border-white/15 bg-[#0b110e] px-1 hover:border-primary"
const COMBO_SELECT = `${COMBO_BOX} w-auto [field-sizing:content]`
// the direction keeps one width, so the other controls of every blow line up
const COMBO_KIND = `${COMBO_BOX} w-[144px] shrink-0`
// the numbers of a combo blow that come as lists, as narrow as what they show: duration (× the item's), the block on
// the next blow (s) and the reach (× the item's)
const COMBO_LISTS: { key: "time" | "cooldown" | "reach"; name: string; hint: string; values: number[]; show: (v: number) => string }[] = [
  { key: "time", name: msg("duração"), hint: msg("Duração deste golpe, em vezes a Duração do giro do item: mais = golpe mais lento"), values: COMBO_TIMES, show: v => `×${v}` },
  { key: "cooldown", name: msg("cooldown"), hint: msg("Cooldown: por quanto tempo, a partir do início deste golpe, o próximo fica bloqueado"), values: COMBO_COOLDOWNS, show: v => `${v}s` },
  { key: "reach", name: msg("alcance"), hint: msg("Alcance deste golpe, em vezes o alcance do item"), values: COMBO_REACHES, show: v => `×${v}` },
]
// the items that shoot can aim through a luneta (on by default only on the Sniper)
const SCOPE_IDS: ItemId[] = [...WEAPON_IDS, ...INSTRUMENT_IDS]
// a consumable's doses are the magazine's number
const DOSES = { ...ITEM_PARAM_META.find(m => m.key === "mag")!, label: msg("Doses"), unit: "", group: msg("Efeito"), hint: msg("Cada Atirar usa uma; 0 = nunca acaba") }

// a field's name: amber with the small reset in front while it is off the game's default
function Named({ label, changed, onReset }: { label: string; changed: boolean; onReset: () => void }) {
  return <span className={cn("flex min-w-0 items-center gap-1", changed && "text-amber-300")}>{changed && <ResetArrow label={label} onReset={onReset} />}{label}</span>
}

export function ItemsPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [items, setItems] = useState<Record<ItemId, ItemDef>>(DEFAULT_ITEMS)
  // opens on the item the main player holds; empty-handed, on the Bicada (what she attacks with then)
  const [sel, setSel] = useState<ItemId>(() => currentHeldItem() ?? "peck")
  const [open, setOpen] = useState<Record<string, boolean>>({ Disparo: true, Munição: true, Projétil: true, Efeito: true, Golpe: true, "Golpe forte": true, Combo: true, Bicada: true, Pontos: true, "Arremesso que volta": true, Gancho: true, Choque: true, Especial: true, Luneta: true })
  useEffect(() => {
    setItems(loadItems())
    return subscribeItems(setItems)
  }, [])
  // the main player equips an item while the panel is open: the dropdown jumps to it
  useEffect(() => subscribeHeldItem(id => { if (id) setSel(id) }), [])
  // Pontos: one version per class (Chi, Pig, Ken), on the class of the main player's body
  const [pcls, setPcls] = useState<PointClass>(currentPlayerClass)
  useEffect(() => subscribePlayerClass(setPcls), [])
  // re-render when the open Pátio's values or who may save into it change
  useTuningVersion()
  const it = items[sel], base = DEFAULT_ITEMS[sel]
  const pit = classItem(it, pcls), pbase = classItem(base, pcls)
  // the Gaiolas are one entry of the dropdown: the six models at once (sel is then any of them)
  const cages = CAGE_IDS.includes(sel)
  // items held at the hand (sports tools, consumables, a grenade charged in the hand) keep the hand's own pose
  const handHeld = it.reticle === "grenade" && it.fireMode === "charge"
  const edit = (fn: (all: Record<ItemId, ItemDef>) => void) => {
    if (tuningLocked()) return
    const next = structuredClone(items)
    fn(next)
    saveItems(next)
    setItems(next)
  }
  const update = (fn: (d: ItemDef) => void) => edit(all => fn(all[sel]))
  // an edit of the Pontos goes to the class shown: Chi's are the item's own; Pig's or Ken's become a whole set of
  // their own (from Chi's, the first time). Anything else the edit touches is the item's
  const updatePoints = (fn: (d: ItemDef) => void) => pcls === "chi" ? update(fn) : update(d => {
    const v = classItem(d, pcls)
    const view = { ...v }
    fn(view)
    for (const k of Object.keys(view) as (keyof ItemDef)[]) if (!POINT_KEYS.includes(k) && view[k] !== v[k]) (d as Record<string, unknown>)[k] = view[k]
    d.classPoints = { ...d.classPoints, [pcls]: pointsOf(view) }
  })
  return (
    <FloatingPanel id="pigchicken-items" aria-label={t("Itens")} initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(380, vw - 24), h: vh - 104 })} minW={280} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <StepSelect aria-label={t("Item")} value={cages ? CAGE_IDS[0] : sel} onChange={e => setSel(e.target.value as ItemId)} className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white">
          <optgroup label={t("Golpes")}>
            <option value="peck">{t(items.peck.name)} {t("(Chi sem item)")}</option>
            <option value="wing">{t(items.wing.name)} {t("(Chi sem item)")}</option>
            <option value="piu">{t(items.piu.name)} {t("(kid sem item)")}</option>
            <option value="chainBlow">{t(items.chainBlow.name)} {t("(Pig sem item)")}</option>
            <option value="tailBlow">{t(items.tailBlow.name)} {t("(Ken sem item)")}</option>
          </optgroup>
          <optgroup label={t("Esportivos")}>{SPORTS_IDS.map(id => <option key={id} value={id}>{t(items[id].name)}</option>)}</optgroup>
          <optgroup label={t("Armas")}>{WEAPON_IDS.map(id => <option key={id} value={id}>{t(items[id].name)}</option>)}</optgroup>
          <optgroup label={t("Instrumentos")}>{INSTRUMENT_IDS.map(id => <option key={id} value={id}>{t(items[id].name)} ({t(items[id].family)})</option>)}</optgroup>
          <optgroup label={t("Instrumentos fixos")}>{FIXED_IDS.map(id => <option key={id} value={id}>{t(items[id].name)} ({t(items[id].family)})</option>)}</optgroup>
          <optgroup label={t("Habilidades especiais")}>{CONSUMABLE_IDS.map(id => <option key={id} value={id}>{t(items[id].name)}</option>)}</optgroup>
          <optgroup label={t("Magia")}>{MAGIC_IDS.map(id => <option key={id} value={id}>{t(items[id].name)}</option>)}</optgroup>
          <optgroup label={t("Chaves")}>{[...KEY_IDS, ...TROPHY_IDS].map(id => <option key={id} value={id}>{t(items[id].name)}</option>)}</optgroup>
          <optgroup label={t("Grade de blocos")}>{MINE_ITEM_IDS.map(id => <option key={id} value={id}>{t(items[id].name)}</option>)}</optgroup>
          <option value={CAGE_IDS[0]}>{t("Gaiolas")}</option>
        </StepSelect>
        <button type="button" onClick={() => edit(all => (cages ? CAGE_IDS : [sel]).forEach(id => { all[id] = structuredClone(DEFAULT_ITEMS[id]) }))} title={cages ? t("Volta as gaiolas para os valores do código") : t("Volta este item para os valores do código")} className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">{t("Padrão")}</button>
        <button type="button" aria-label={t("Fechar itens")} onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <LockedFieldset>
        {cages ? <CagesView items={items} onChange={(id, souls) => edit(all => { all[id].cageSouls = souls })} /> : ITEM_PARAM_GROUPS.filter(g => g !== "Gaiola" && !HIDDEN[sel]?.includes(g) && (g !== "Bicada" || sel === "peck") && (g !== "Música" || it.instrument) && (g !== "Hangdrum" || (it.instrument && it.scales.includes("hang"))) && (g !== "Efeito" || it.consumable) && (g !== "Pontos" || !handHeld) && (g !== "Golpe forte" || ((isStaff(it) || sel === "chainBlow" || sel === "tailBlow") && !it.returnThrow && !it.grapple)) && (g !== "Arremesso que volta" || it.returnThrow) && (g !== "Gancho" || it.grapple) && (g !== "Baralho" || it.deck) && ((g !== "Choque" && g !== "Especial") || isStaff(it)) && (g !== "Luneta" || SCOPE_IDS.includes(sel))).map(g => (
          <details key={g} open={!!open[g]} onToggle={e => { const v = (e.currentTarget as HTMLDetailsElement).open; setOpen(o => ({ ...o, [g]: v })) }} className="border-b border-white/10">
            <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#ffd166] hover:text-white">{g === "Golpe" && isStaff(it) ? t("Golpe rápido") : t(g)}</summary>
            <div className="grid gap-field px-4 pb-4">
              {g === "Disparo" && (
                <>
                  <label className="flex items-center justify-between gap-3">
                    <Named label={t("Modo de disparo")} changed={it.fireMode !== base.fireMode} onReset={() => update(d => { d.fireMode = base.fireMode })} />
                    <StepSelect value={it.fireMode} onChange={e => { const v = e.target.value as FireMode; update(d => { d.fireMode = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {FIRE_MODES.map(m => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
                    </StepSelect>
                  </label>
                  {it.fireMode === "burst" && <label className="flex items-center justify-between gap-3" title={t("Soltar Atirar interrompe a rajada; desligado, um aperto dispara a rajada inteira")}><Named label={t("Rajada só enquanto segura Atirar")} changed={it.burstHold !== base.burstHold} onReset={() => update(d => { d.burstHold = base.burstHold })} /><input type="checkbox" checked={it.burstHold} onChange={e => { const v = e.target.checked; update(d => { d.burstHold = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>}
                  <label className="flex items-center justify-between gap-3">
                    <Named label={t("Caminho do projétil")} changed={it.pathShow !== base.pathShow} onReset={() => update(d => { d.pathShow = base.pathShow })} />
                    <StepSelect value={it.pathShow} onChange={e => { const v = e.target.value as PathShow; update(d => { d.pathShow = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {PATH_SHOWS.map(o => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                    </StepSelect>
                  </label>
                  {(it.reticle === "impact" || it.reticle === "grenade") && (
                    <label className="flex items-center justify-between gap-3">
                      <Named label={t("Onde cai (círculo do dano)")} changed={it.landShow !== base.landShow} onReset={() => update(d => { d.landShow = base.landShow })} />
                      <StepSelect value={it.landShow} onChange={e => { const v = e.target.value as PathShow; update(d => { d.landShow = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                        {PATH_SHOWS.map(o => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                      </StepSelect>
                    </label>
                  )}
                  <label className="flex items-center justify-between gap-3"><Named label={t("Tiro instantâneo")} changed={it.hitscan !== base.hitscan} onReset={() => update(d => { d.hitscan = base.hitscan })} /><input type="checkbox" checked={it.hitscan} onChange={e => { const v = e.target.checked; update(d => { d.hitscan = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><Named label={t("Atira durante o slide")} changed={it.slideFire !== base.slideFire} onReset={() => update(d => { d.slideFire = base.slideFire })} /><input type="checkbox" checked={it.slideFire} onChange={e => { const v = e.target.checked; update(d => { d.slideFire = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                </>
              )}
              {g === "Luneta" && <label className="flex items-center justify-between gap-3" title={t("Segurar Atirar mira pela luneta: a câmera avança e se afasta, a retícula vai mais longe e a lupa aparece na ponta da mira")}><Named label={t("Mirar com luneta")} changed={it.scope !== base.scope} onReset={() => update(d => { d.scope = base.scope })} /><input type="checkbox" checked={it.scope} onChange={e => { const v = e.target.checked; update(d => { d.scope = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>}
              {g === "Munição" && (
                <>
                  <label className="flex items-center justify-between gap-3" title={t("Ao descarregar, recarrega tudo sozinho (no tempo da Recarga)")}><Named label={t("Recarrega sozinho ao descarregar")} changed={it.autoReload !== base.autoReload} onReset={() => update(d => { d.autoReload = base.autoReload })} /><input type="checkbox" checked={it.autoReload} onChange={e => { const v = e.target.checked; update(d => { d.autoReload = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  {!it.meleeOnly && <label className="flex items-center justify-between gap-3"><Named label={t("Recarrega um tiro por vez")} changed={it.shellReload !== base.shellReload} onReset={() => update(d => { d.shellReload = base.shellReload })} /><input type="checkbox" checked={it.shellReload} onChange={e => { const v = e.target.checked; update(d => { d.shellReload = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>}
                </>
              )}
              {g === "Música" && (
                <>
                  <label className="flex items-center justify-between gap-3">
                    <Named label={t("Som")} changed={it.voice !== base.voice} onReset={() => update(d => { d.voice = base.voice })} />
                    <StepSelect value={it.voice} onChange={e => { const v = e.target.value as VoiceId; update(d => { d.voice = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {(Object.keys(VOICE_LABELS) as VoiceId[]).filter(v => v !== "hangSlap" && v !== "harpHarmonic").map(v => <option key={v} value={v}>{t(VOICE_LABELS[v])}</option>)}
                    </StepSelect>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <Named label={t("Notas de onde")} changed={it.pitchSet !== base.pitchSet} onReset={() => update(d => { d.pitchSet = base.pitchSet })} />
                    <StepSelect value={it.pitchSet} onChange={e => { const v = e.target.value as ItemDef["pitchSet"]; update(d => { d.pitchSet = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      <option value="chord">{t("Do acorde da hora")}</option>
                      <option value="scale">{t("Da escala da zona")}</option>
                    </StepSelect>
                  </label>
                  <div className="grid gap-field" title={t("A rodinha / troca rápida passa pelas escalas ligadas antes do próximo item")}>
                    <span>{t("Escalas")}</span>
                    {INSTRUMENT_SCALE_IDS.map(id => (
                      <label key={id} className="flex items-center justify-between gap-3 pl-3">
                        <span>{t(INSTRUMENT_SCALES[id].label)}</span>
                        <input type="checkbox" checked={it.scales.includes(id)} disabled={it.scales.length === 1 && it.scales.includes(id)}
                          onChange={e => { const on = e.target.checked; update(d => { d.scales = INSTRUMENT_SCALE_IDS.filter(k => k === id ? on : d.scales.includes(k)) }) }}
                          className="h-5 w-5 accent-[var(--primary)]" />
                      </label>
                    ))}
                    {it.scales.includes("spiral") ? (
                      <label className="flex items-center justify-between gap-3 pl-3" title={t("Desligado: de fora para dentro, do grave ao agudo")}>
                        <span>{t("Espiral descendente (agudo → grave)")}</span>
                        <input type="checkbox" checked={it.spiralDescending} onChange={e => { const v = e.target.checked; update(d => { d.spiralDescending = v }) }} className="h-5 w-5 accent-[var(--primary)]" />
                      </label>
                    ) : null}
                  </div>
                  <label className="flex items-center justify-between gap-3">
                    <Named label={t("Arpejador")} changed={it.arp !== base.arp} onReset={() => update(d => { d.arp = base.arp })} />
                    <StepSelect value={it.arp} onChange={e => { const v = e.target.value as Arp; update(d => { d.arp = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {ARPS.map(a => <option key={a.value} value={a.value}>{t(a.label)}</option>)}
                    </StepSelect>
                  </label>
                  <label className="flex items-center justify-between gap-3"><Named label={t("No ritmo (quantizar)")} changed={it.quantize !== base.quantize} onReset={() => update(d => { d.quantize = base.quantize })} /><input type="checkbox" checked={it.quantize} onChange={e => { const v = e.target.checked; update(d => { d.quantize = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><Named label={t("Nota sustentada em feixe")} changed={it.beam !== base.beam} onReset={() => update(d => { d.beam = base.beam })} /><input type="checkbox" checked={it.beam} onChange={e => { const v = e.target.checked; update(d => { d.beam = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><Named label={t("Carga em glissando")} changed={it.gliss !== base.gliss} onReset={() => update(d => { d.gliss = base.gliss })} /><input type="checkbox" checked={it.gliss} onChange={e => { const v = e.target.checked; update(d => { d.gliss = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3" title={t("Giro da mira: tremer a mira dentro da faixa entorta a nota. Ao longo da corda: afastar a mira dela sobe a nota, aproximar desce (nas Cordas soltas, é o glissando da corda)")}>
                    <Named label={t("Tremolo: reage a")} changed={it.tremoloAxis !== base.tremoloAxis} onReset={() => update(d => { d.tremoloAxis = base.tremoloAxis })} />
                    <StepSelect value={it.tremoloAxis} onChange={e => { const v = e.target.value as TremoloAxis; update(d => { d.tremoloAxis = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {TREMOLO_AXES.map(a => <option key={a.value} value={a.value}>{t(a.label)}</option>)}
                    </StepSelect>
                  </label>
                  {it.scales.includes("strings") && (
                    <label className="flex items-center justify-between gap-3" title={t("Cordas soltas com duas mãos (os dois analógicos ou dois dedos): apertando as duas juntas, a corda da mão da frente soa este tempo depois da corda da mão de trás, no andamento da música")}>
                      <Named label={t("Atraso entre as mãos")} changed={it.handDelay !== base.handDelay} onReset={() => update(d => { d.handDelay = base.handDelay })} />
                      <StepSelect value={it.handDelay} onChange={e => { const v = Number(e.target.value); update(d => { d.handDelay = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                        {HAND_DELAYS.map(a => <option key={a.value} value={a.value}>{t(a.label)}</option>)}
                      </StepSelect>
                    </label>
                  )}
                  <label className="flex items-center justify-between gap-3"><Named label={t("Sem trastes (tremolo livre)")} changed={it.fretless !== base.fretless} onReset={() => update(d => { d.fretless = base.fretless })} /><input type="checkbox" checked={it.fretless} onChange={e => { const v = e.target.checked; update(d => { d.fretless = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <PatioDualRange label={t("Volume pela distância")} min={0} max={1} step={0.01} lo={it.volMin} hi={it.volMax} snap={VOLUME_SNAP}
                    display={it.volMin === it.volMax ? t("sem variação") : `${Math.round(it.volMin * 100)}–${Math.round(it.volMax * 100)}%`}
                    changed={it.volMin !== DEFAULT_ITEMS[it.id].volMin || it.volMax !== DEFAULT_ITEMS[it.id].volMax}
                    hint={t("Mira perto dela: volume mínimo; longe: máximo. Pontos juntos = sem variação")}
                    onChange={(lo, hi) => update(d => { d.volMin = lo; d.volMax = hi })}
                    onReset={() => update(d => { d.volMin = DEFAULT_ITEMS[d.id].volMin; d.volMax = DEFAULT_ITEMS[d.id].volMax })} />
                </>
              )}
              {g === "Hangdrum" && (
                <label className="flex items-center justify-between gap-3" title={t("O timbre do hangdrum; a batida entre as notas é sempre a mesma")}>
                  <span>{t("Tipo de som")}</span>
                  <StepSelect value={HANG_VOICES.includes(it.voice) ? it.voice : ""} onChange={e => { const v = e.target.value as VoiceId; update(d => { d.voice = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                    {!HANG_VOICES.includes(it.voice) && <option value="">{t(VOICE_LABELS[it.voice])}</option>}
                    {HANG_VOICES.map(v => <option key={v} value={v}>{t(VOICE_LABELS[v])}</option>)}
                  </StepSelect>
                </label>
              )}
              {g === "Efeito" && (
                <>
                  <label className="flex items-center justify-between gap-3">
                    <Named label={t("Curva da arrancada")} changed={it.effectCurve !== base.effectCurve} onReset={() => update(d => { d.effectCurve = base.effectCurve })} />
                    <StepSelect value={it.effectCurve} onChange={e => { const v = e.target.value as AccelCurve; update(d => { d.effectCurve = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {ACCEL_CURVES.map(c => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
                    </StepSelect>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <Named label={t("Estado (visual)")} changed={it.effectLook !== base.effectLook} onReset={() => update(d => { d.effectLook = base.effectLook })} />
                    <StepSelect value={it.effectLook} onChange={e => { const v = e.target.value as EffectLook; update(d => { d.effectLook = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {EFFECT_LOOKS.map(c => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
                    </StepSelect>
                  </label>
                </>
              )}
              {g === "Pontos" && (
                <div role="radiogroup" aria-label={t("Classe")} className="grid grid-cols-3 overflow-hidden rounded-md border border-white/15">
                  {(["chi", "pig", "fox"] as const).map(c => (
                    <button key={c} type="button" role="radio" aria-checked={pcls === c} onClick={() => setPcls(c)}
                      className={cn("h-8", pcls === c ? "bg-primary/25 text-white" : "text-[#93a79a] hover:text-white")}>{CLASS_LABEL[c]}</button>
                  ))}
                </div>
              )}
              {g === "Pontos" && (isStaff(it) ? <StaffPoseEditor id={sel} item={pit} onChange={updatePoints} /> : <ItemPointsEditor id={sel} item={pit} base={pbase} onChange={updatePoints} />)}
              {g === "Golpe forte" && (
                <label className="flex items-center justify-between gap-3" title={t("O golpe forte é sempre o mesmo movimento; segure Atirar para carregar e solte para bater")}>
                  <Named label={t("Movimento")} changed={it.heavyKind !== base.heavyKind} onReset={() => update(d => { d.heavyKind = base.heavyKind })} />
                  <StepSelect value={it.heavyKind} onChange={e => { const v = e.target.value as BlowKind; update(d => { d.heavyKind = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                    {SWING_KINDS.map(o => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                  </StepSelect>
                </label>
              )}
              {g === "Especial" && (
                <label className="flex items-center justify-between gap-3" title={t("Trovão: um raio cai do céu em quem levou o golpe. Raio: arcos longos entre todos")}>
                  <Named label={t("Efeito")} changed={it.specialKind !== base.specialKind} onReset={() => update(d => { d.specialKind = base.specialKind })} />
                  <StepSelect value={it.specialKind} onChange={e => { const v = e.target.value as SpecialKind; update(d => { d.specialKind = v }) }} className="h-8 w-40 rounded-md border border-white/15 bg-[#0b110e] px-2">
                    {SPECIAL_KINDS.map(o => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                  </StepSelect>
                </label>
              )}
              {g === "Combo" && (
                <div className="grid gap-1.5">
                  <span title={t("Golpes seguidos dentro da janela seguem esta ordem e depois recomeçam; cada um com direção, ângulo que cobre, duração, cooldown e alcance")}>{t("Direção / Ângulo / Duração / Cooldown / Alcance")}</span>
                  {it.combo.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-1">
                      <StepSelect aria-label={t("Golpe {n} do combo: direção", { n: i + 1 })} value={c.kind} onChange={e => { const v = e.target.value; update(d => { if (v === "") d.combo.splice(i, 1); else d.combo[i] = { ...c, kind: v as BlowKind, arc: v === "spin" ? 360 : c.kind === "spin" ? comboArc(d.combo, base, v as BlowKind) : c.arc } }) }} className={COMBO_KIND}>
                        {SWING_KINDS.map(o => <option key={o.value} value={o.value}>{i + 1}. {t(o.label)}</option>)}
                        {it.combo.length > 1 && <option value="" data-skip>{t("remover")}</option>}
                      </StepSelect>
                      <AngleKnob label={t("Golpe {n} do combo: ângulo", { n: i + 1 })} value={c.arc} disabled={c.kind === "spin"} onChange={v => update(d => { d.combo[i] = { ...c, arc: v } })} />
                      {COMBO_LISTS.map(l => (
                        <select key={l.key} aria-label={t("Golpe {n} do combo: {name}", { n: i + 1, name: t(l.name) })} title={t(l.hint)} value={c[l.key]} onChange={e => { const v = Number(e.target.value); update(d => { d.combo[i] = { ...c, [l.key]: v } }) }} className={COMBO_SELECT}>
                          {(l.values.includes(c[l.key]) ? l.values : [...l.values, c[l.key]].sort((x, y) => x - y)).map(v => <option key={v} value={v}>{l.show(v)}</option>)}
                        </select>
                      ))}
                    </div>
                  ))}
                  <div className="flex items-center gap-field">
                    {it.combo.length < COMBO_MAX && (
                      <button type="button" aria-label={t("Adicionar golpe ao combo")} title={t("Adicionar golpe")} onClick={() => update(d => { d.combo.push(comboBlow("down", comboArc(d.combo, base, "down"))) })} className="h-8 w-8 rounded-md border border-white/20 hover:border-primary">+</button>
                    )}
                    {JSON.stringify(it.combo) !== JSON.stringify(base.combo) && (
                      <button type="button" title={t("Volta os golpes do código")} onClick={() => update(d => { d.combo = structuredClone(base.combo) })} className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">{t("Padrão")}</button>
                    )}
                  </div>
                </div>
              )}
              {g === "Rebate" && (
                <>
                  <ChainEditor chain={it.rebateChain} changed={JSON.stringify(it.rebateChain) !== JSON.stringify(base.rebateChain)} onChange={fn => update(d => fn(d.rebateChain))} onReset={() => update(d => { d.rebateChain = structuredClone(base.rebateChain) })} />
                  <label className="flex items-center justify-between gap-3" title={t("Um tok de madeira junto com a nota, como uma rebatida de verdade")}><Named label={t("Som de tacada (tok)")} changed={it.rebateTok !== base.rebateTok} onReset={() => update(d => { d.rebateTok = base.rebateTok })} /><input type="checkbox" checked={it.rebateTok} onChange={e => { const v = e.target.checked; update(d => { d.rebateTok = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                </>
              )}
              {g === "Golpe" && sel !== "peck" && (
                <label className="flex items-center justify-between gap-3" title={t("Desligado: um golpe apertado durante o anterior espera ele terminar")}><Named label={t("Golpe novo interrompe o anterior")} changed={it.meleeInterrupt !== base.meleeInterrupt} onReset={() => update(d => { d.meleeInterrupt = base.meleeInterrupt })} /><input type="checkbox" checked={it.meleeInterrupt} onChange={e => { const v = e.target.checked; update(d => { d.meleeInterrupt = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
              )}
              {g === "Golpe" && sel !== "peck" && (
                <label className="flex items-center justify-between gap-3" title={t("Clique direito do mouse num ponto fora do alcance: anda até lá e golpeia ao chegar")}><Named label={t("Clique direito: point and click")} changed={it.pointClick !== base.pointClick} onReset={() => update(d => { d.pointClick = base.pointClick })} /><input type="checkbox" checked={it.pointClick} onChange={e => { const v = e.target.checked; update(d => { d.pointClick = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
              )}
              {g === "Golpe" && sel !== "peck" && (
                <label className="flex items-center justify-between gap-3">
                  <span>{t("Rastro: cor")}</span>
                  <input type="color" aria-label={t("Cor do rastro")} value={it.trailColor} onChange={e => { const v = e.target.value; update(d => { d.trailColor = v }) }} onDoubleClick={() => update(d => { d.trailColor = base.trailColor })} title={it.instrument ? t("Nos instrumentos o rastro pega a cor da nota do acorde") : t("Duplo clique volta a cor do código")} className="h-8 w-14 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
                </label>
              )}
              <div className="grid gap-field">
              {[...(g === "Efeito" ? [DOSES] : []), ...ITEM_PARAM_META.filter(m => m.group === g && (g !== "Luneta" || it.scope) && (g !== "Pontos" || STAFF_POINTS.includes(m.key) === isStaff(it)) && (m.key !== "drawLen" || (it.archery && it.fireMode === "charge")) && !(sel === "peck" && (m.key === "durability" || m.key.startsWith("trail"))) && !(BARE_BLOWS.includes(sel) && m.key === "durability") && !(sel === "piu" && !PIU_KEYS.includes(m.key)) && !(sel !== "peck" && m.key === "meleeArc") && !(m.key === "hangNotes2" && it.hangRows < 2) && !(m.key === "aimAssist" && it.scales.every(sc => sc === "drums")) && !(it.returnThrow && HEAVY_SHOCK.includes(m.key)) && !(it.deck && DECK_UNUSED.includes(m.key))).map(m => it.deck && m.key === "returnRange" ? { ...m, hint: msg("Até onde uma carta vai; com a mira mais longe do que isto, ela para aqui") } : it.deck && m.key === "returnCount" ? { ...m, label: msg("Cartas fora ao mesmo tempo"), hint: msg("Quantas cartas do baralho podem estar no cenário de uma vez (o baralho tem 14)") } : BARE_BLOWS.includes(sel) && (m.key === "meleeRange" || m.key === "heavyRange") ? { ...m, label: sel === "chainBlow" ? msg("Alcance da corrente") : msg("Alcance do rabo") } : sel === "peck" ? { ...m, label: m.key === "meleeRange" ? msg("Alcance da bicada") : m.key === "meleeTime" ? msg("Duração da bicada") : m.label, hint: m.key === "meleeTime" ? msg("Avanço rápido e retorno do pescoço") : m.hint } : m)].map(m => {
                const pts = g === "Pontos", src = pts ? pit : it, ref = pts ? pbase : base, up = pts ? updatePoints : update
                const v = src[m.key] as number, changed = v !== ref[m.key]
                const label = m === DOSES ? m.label : (it.instrument || sel === "piu") && m.key === "damage" ? msg("Harmonia por nota") : it.instrument && m.key === "explodeDamage" ? msg("Harmonia no estouro") : it.beam && m.key === "mag" ? msg("Arco (segundos)") : it.meleeOnly && m.key === "mag" ? msg("Golpes seguidos") : m.label
                // the taco's ammo is blows; 0 in "breaks after" and in the gradual reload are words, not numbers
                const unit = it.meleeOnly && m !== DOSES && (m.key === "mag" || m.key === "refillAmount") ? msg("golpes") : m.unit
                const display = m.key === "durability" && v === 0 ? t("0 (nunca quebra)") : m.key === "refillTime" && v === 0 ? t("0 (desligada)") : `${v}${unit ? ` ${t(unit)}` : ""}`
                const range = <PatioRange key={m.key} label={t(label)} name={t(m.label)} min={m.min} max={m.max} step={m.step} value={v}
                  display={display} changed={changed} hint={m.hint ? t(m.hint) : m.hint}
                  onChange={n => up(d => { (d as Record<string, unknown>)[m.key] = n })}
                  onReset={() => up(d => { (d as Record<string, unknown>)[m.key] = ref[m.key] })} />
                // under the combo window: its timer bar, listening to the blows only while this section is open
                return m.key === "comboWindow" && open[g] ? <div key={m.key} className="grid gap-1">{range}<ComboWindowBar /></div> : range
              })}
              </div>
            </div>
          </details>
        ))}
        {/* admins: every item's current numbers become the game's default (data/pigchicken/default-items.json) */}
        {/* Reverter para o padrão: every item (not only the one shown) as the game has it */}
        {/* Salvar no Pátio: the numbers that differ from the game's become the open Pátio's */}
        <SaveToGameButton part="items" save={() => saveDefaultItems(items)} className="justify-end px-4 py-3"
          patio={patioSaveOf("items", itemsTuning().game, itemsDefaultsFile(items))}
          onRevert={() => edit(all => { for (const id of Object.keys(all) as ItemId[]) all[id] = structuredClone(DEFAULT_ITEMS[id]) })} />
      </LockedFieldset>
      </div>
    </FloatingPanel>
  )
}
