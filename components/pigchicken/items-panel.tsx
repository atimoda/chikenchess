"use client"

// Popup with every number of the PigChicKen items (weapons and instruments), one item at a time
// picked in the dropdown at the top. Saved in this browser; the Parquinho follows it live.
import { PatioRange } from "@/components/ui/patio-range"
import { PatioDualRange } from "@/components/ui/patio-dual-range"
import { VOLUME_SNAP } from "@/lib/pigchicken/aim-volume"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { ACCEL_CURVES, ARPS, CONSUMABLE_IDS, EFFECT_LOOKS, PATH_SHOWS, DEFAULT_ITEMS, INSTRUMENT_IDS, ITEM_PARAM_GROUPS, ITEM_PARAM_META, KEY_IDS, MAGIC_IDS, SPECIAL_KINDS, SPORTS_IDS, WEAPON_IDS, currentHeldItem, isStaff, loadItems, saveItems, subscribeHeldItem, subscribeItems, type AccelCurve, type Arp, type EffectLook, type FireMode, type PathShow, type ItemDef, type ItemId, type SpecialKind } from "@/lib/pigchicken/items"
import { HANG_VOICES, VOICE_LABELS, type VoiceId } from "@/lib/pigchicken/synth"
import { COMBO_COOLDOWNS, COMBO_MAX, COMBO_REACHES, COMBO_TIMES, SWING_KINDS, comboBlow, type BlowKind, type ComboStep } from "@/lib/pigchicken/swing"
import { AngleKnob, ComboWindowBar } from "./combo-controls"
import { ChainEditor } from "./chain-editor"
import { SaveToGameButton } from "@/components/admin/save-to-game-button"
import { saveDefaultItems } from "@/lib/admin/game-defaults-client"
import { ItemPointsEditor } from "./item-points-editor"
import { StaffPoseEditor } from "./staff-pose-editor"
import { INSTRUMENT_SCALES, INSTRUMENT_SCALE_IDS } from "@/lib/pigchicken/instrument-scales"

const FIRE_MODES: { value: FireMode; label: string }[] = [
  { value: "semi", label: "Semi (um por toque)" },
  { value: "auto", label: "Automático" },
  { value: "burst", label: "Rajada" },
  { value: "charge", label: "Carga (segura e solta)" },
  { value: "release", label: "Ao soltar o botão" },
]

// what each item uses; the wing has no ammo, projectile or throw; a consumable has its effect (and its doses), a slap and a
// throw; the taco has no shots, but its blows are its ammo (Munição)
const CONSUMABLE_HIDES = ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Desenho", "Pontos", "Explosão", "Música", "Rebate"]
const HIDDEN: Partial<Record<ItemId, string[]>> = {
  peck: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito", "Combo", "Rebate"],
  bat: ["Disparo", "Projétil", "Espalhamento", "Explosão", "Efeito"],
  passagua: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Explosão", "Efeito", "Música", "Rebate"],
  mjolnir: ["Disparo", "Munição", "Projétil", "Espalhamento", "Explosão", "Efeito", "Música"],
  odinstaff: ["Disparo", "Munição", "Projétil", "Espalhamento", "Explosão", "Efeito", "Música"],
  wing: ["Disparo", "Munição", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Pontos", "Explosão", "Efeito"],
  ...Object.fromEntries(CONSUMABLE_IDS.map(id => [id, CONSUMABLE_HIDES])),
  // a key only opens Baús: it has no effect, just its slap and its throw
  ...Object.fromEntries(KEY_IDS.map(id => [id, [...CONSUMABLE_HIDES, "Efeito"]])),
}
// Pontos of a staff (how she carries it, lib/pigchicken/staff-pose.ts); the other items have the pivot and the wings' points
// the strong blow's own shock numbers, for the staffs that have a strong blow (one that is thrown and comes back has none)
const HEAVY_SHOCK: (keyof ItemDef)[] = ["heavyShockRange", "heavyShockTime"]
const STAFF_POINTS: (keyof ItemDef)[] = ["gripX", "gripY", "staffX", "staffY", "staffAngle", "windX", "windY", "windAngle"]
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
  { key: "time", name: "duração", hint: "Duração deste golpe, em vezes a Duração do giro do item: mais = golpe mais lento", values: COMBO_TIMES, show: v => `×${v}` },
  { key: "cooldown", name: "cooldown", hint: "Cooldown: por quanto tempo, a partir do início deste golpe, o próximo fica bloqueado", values: COMBO_COOLDOWNS, show: v => `${v}s` },
  { key: "reach", name: "alcance", hint: "Alcance deste golpe, em vezes o alcance do item", values: COMBO_REACHES, show: v => `×${v}` },
]
// a consumable's doses are the magazine's number
const DOSES = { ...ITEM_PARAM_META.find(m => m.key === "mag")!, label: "Doses", unit: "", group: "Efeito", hint: "Cada Atirar usa uma; 0 = nunca acaba" }

export function ItemsPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Record<ItemId, ItemDef>>(DEFAULT_ITEMS)
  // opens on the item the main player holds; empty-handed, on the Bicada (what she attacks with then)
  const [sel, setSel] = useState<ItemId>(() => currentHeldItem() ?? "peck")
  const [open, setOpen] = useState<Record<string, boolean>>({ Disparo: true, Munição: true, Projétil: true, Efeito: true, Golpe: true, "Golpe forte": true, Combo: true, Bicada: true, Pontos: true, "Arremesso que volta": true, Choque: true, Especial: true })
  useEffect(() => {
    setItems(loadItems())
    return subscribeItems(setItems)
  }, [])
  // the main player equips an item while the panel is open: the dropdown jumps to it
  useEffect(() => subscribeHeldItem(id => { if (id) setSel(id) }), [])
  const it = items[sel], base = DEFAULT_ITEMS[sel]
  // items held at the hand (sports tools, consumables, a grenade charged in the hand) keep the hand's own pose
  const handHeld = it.reticle === "grenade" && it.fireMode === "charge"
  const update = (fn: (d: ItemDef) => void) => {
    const next = structuredClone(items)
    fn(next[sel])
    saveItems(next)
    setItems(next)
  }
  return (
    <FloatingPanel id="pigchicken-items" aria-label="Itens" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(380, vw - 24), h: vh - 104 })} minW={280} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <select aria-label="Item" value={sel} onChange={e => setSel(e.target.value as ItemId)} className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white">
          <optgroup label="Esportivos">{SPORTS_IDS.map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
          <optgroup label="Armas"><option value="peck">{items.peck.name} (sem item)</option>{WEAPON_IDS.map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
          <optgroup label="Instrumentos">{INSTRUMENT_IDS.map(id => <option key={id} value={id}>{items[id].name} ({items[id].family})</option>)}</optgroup>
          <optgroup label="Habilidades especiais">{CONSUMABLE_IDS.map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
          <optgroup label="Magia">{MAGIC_IDS.map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
          <optgroup label="Chaves">{KEY_IDS.map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
          <option value="wing">{items.wing.name}</option>
        </select>
        <button type="button" onClick={() => update(d => Object.assign(d, structuredClone(base)))} title="Volta este item para os valores do código" className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>
        <button type="button" aria-label="Fechar itens" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {ITEM_PARAM_GROUPS.filter(g => !HIDDEN[sel]?.includes(g) && (g !== "Bicada" || sel === "peck") && (g !== "Música" || it.instrument) && (g !== "Hangdrum" || (it.instrument && it.scales.includes("hang"))) && (g !== "Efeito" || it.consumable) && (g !== "Pontos" || !handHeld) && (g !== "Golpe forte" || (isStaff(it) && !it.returnThrow)) && (g !== "Arremesso que volta" || it.returnThrow) && ((g !== "Choque" && g !== "Especial") || isStaff(it))).map(g => (
          <details key={g} open={!!open[g]} onToggle={e => { const v = (e.currentTarget as HTMLDetailsElement).open; setOpen(o => ({ ...o, [g]: v })) }} className="border-b border-white/10">
            <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#ffd166] hover:text-white">{g === "Golpe" && isStaff(it) ? "Golpe rápido" : g}</summary>
            <div className="grid gap-field px-4 pb-4">
              {g === "Disparo" && (
                <>
                  <label className="flex items-center justify-between gap-3">
                    <span>Modo de disparo</span>
                    <select value={it.fireMode} onChange={e => { const v = e.target.value as FireMode; update(d => { d.fireMode = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {FIRE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Caminho do projétil</span>
                    <select value={it.pathShow} onChange={e => { const v = e.target.value as PathShow; update(d => { d.pathShow = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {PATH_SHOWS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  {(it.reticle === "impact" || it.reticle === "grenade") && (
                    <label className="flex items-center justify-between gap-3">
                      <span>Onde cai (círculo do dano)</span>
                      <select value={it.landShow} onChange={e => { const v = e.target.value as PathShow; update(d => { d.landShow = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                        {PATH_SHOWS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="flex items-center justify-between gap-3"><span>Tiro instantâneo</span><input type="checkbox" checked={it.hitscan} onChange={e => { const v = e.target.checked; update(d => { d.hitscan = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Atira durante o slide</span><input type="checkbox" checked={it.slideFire} onChange={e => { const v = e.target.checked; update(d => { d.slideFire = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                </>
              )}
              {g === "Munição" && (
                <>
                  <label className="flex items-center justify-between gap-3" title="Ao descarregar, recarrega tudo sozinho (no tempo da Recarga)"><span>Recarrega sozinho ao descarregar</span><input type="checkbox" checked={it.autoReload} onChange={e => { const v = e.target.checked; update(d => { d.autoReload = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  {!it.meleeOnly && <label className="flex items-center justify-between gap-3"><span>Recarrega um tiro por vez</span><input type="checkbox" checked={it.shellReload} onChange={e => { const v = e.target.checked; update(d => { d.shellReload = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>}
                </>
              )}
              {g === "Música" && (
                <>
                  <label className="flex items-center justify-between gap-3">
                    <span>Som</span>
                    <select value={it.voice} onChange={e => { const v = e.target.value as VoiceId; update(d => { d.voice = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {(Object.keys(VOICE_LABELS) as VoiceId[]).filter(v => v !== "hangSlap").map(v => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Notas de onde</span>
                    <select value={it.pitchSet} onChange={e => { const v = e.target.value as ItemDef["pitchSet"]; update(d => { d.pitchSet = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      <option value="chord">Do acorde da hora</option>
                      <option value="scale">Da escala da zona</option>
                    </select>
                  </label>
                  <div className="grid gap-field" title="A rodinha / troca rápida passa pelas escalas ligadas antes do próximo item">
                    <span>Escalas</span>
                    {INSTRUMENT_SCALE_IDS.map(id => (
                      <label key={id} className="flex items-center justify-between gap-3 pl-3">
                        <span>{INSTRUMENT_SCALES[id].label}</span>
                        <input type="checkbox" checked={it.scales.includes(id)} disabled={it.scales.length === 1 && it.scales.includes(id)}
                          onChange={e => { const on = e.target.checked; update(d => { d.scales = INSTRUMENT_SCALE_IDS.filter(k => k === id ? on : d.scales.includes(k)) }) }}
                          className="h-5 w-5 accent-[var(--primary)]" />
                      </label>
                    ))}
                    {it.scales.includes("spiral") ? (
                      <label className="flex items-center justify-between gap-3 pl-3" title="Desligado: de fora para dentro, do grave ao agudo">
                        <span>Espiral descendente (agudo → grave)</span>
                        <input type="checkbox" checked={it.spiralDescending} onChange={e => { const v = e.target.checked; update(d => { d.spiralDescending = v }) }} className="h-5 w-5 accent-[var(--primary)]" />
                      </label>
                    ) : null}
                  </div>
                  <label className="flex items-center justify-between gap-3">
                    <span>Arpejador</span>
                    <select value={it.arp} onChange={e => { const v = e.target.value as Arp; update(d => { d.arp = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {ARPS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3"><span>No ritmo (quantizar)</span><input type="checkbox" checked={it.quantize} onChange={e => { const v = e.target.checked; update(d => { d.quantize = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Nota sustentada em feixe</span><input type="checkbox" checked={it.beam} onChange={e => { const v = e.target.checked; update(d => { d.beam = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Carga em glissando</span><input type="checkbox" checked={it.gliss} onChange={e => { const v = e.target.checked; update(d => { d.gliss = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Sem trastes (tremolo livre)</span><input type="checkbox" checked={it.fretless} onChange={e => { const v = e.target.checked; update(d => { d.fretless = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <PatioDualRange label="Volume pela distância" min={0} max={1} step={0.01} lo={it.volMin} hi={it.volMax} snap={VOLUME_SNAP}
                    display={it.volMin === it.volMax ? "sem variação" : `${Math.round(it.volMin * 100)}–${Math.round(it.volMax * 100)}%`}
                    changed={it.volMin !== DEFAULT_ITEMS[it.id].volMin || it.volMax !== DEFAULT_ITEMS[it.id].volMax}
                    hint="Mira perto dela: volume mínimo; longe: máximo. Pontos juntos = sem variação"
                    onChange={(lo, hi) => update(d => { d.volMin = lo; d.volMax = hi })}
                    onReset={() => update(d => { d.volMin = DEFAULT_ITEMS[d.id].volMin; d.volMax = DEFAULT_ITEMS[d.id].volMax })} />
                </>
              )}
              {g === "Hangdrum" && (
                <label className="flex items-center justify-between gap-3" title="O timbre do hangdrum; a batida entre as notas é sempre a mesma">
                  <span>Tipo de som</span>
                  <select value={HANG_VOICES.includes(it.voice) ? it.voice : ""} onChange={e => { const v = e.target.value as VoiceId; update(d => { d.voice = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                    {!HANG_VOICES.includes(it.voice) && <option value="">{VOICE_LABELS[it.voice]}</option>}
                    {HANG_VOICES.map(v => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}
                  </select>
                </label>
              )}
              {g === "Efeito" && (
                <>
                  <label className="flex items-center justify-between gap-3">
                    <span>Curva da arrancada</span>
                    <select value={it.effectCurve} onChange={e => { const v = e.target.value as AccelCurve; update(d => { d.effectCurve = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {ACCEL_CURVES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Estado (visual)</span>
                    <select value={it.effectLook} onChange={e => { const v = e.target.value as EffectLook; update(d => { d.effectLook = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {EFFECT_LOOKS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                </>
              )}
              {g === "Pontos" && (isStaff(it) ? <StaffPoseEditor id={sel} item={it} onChange={update} /> : <ItemPointsEditor id={sel} item={it} base={base} onChange={update} />)}
              {g === "Golpe forte" && (
                <label className="flex items-center justify-between gap-3" title="O golpe forte é sempre o mesmo movimento; segure Atirar para carregar e solte para bater">
                  <span>Movimento</span>
                  <select value={it.heavyKind} onChange={e => { const v = e.target.value as BlowKind; update(d => { d.heavyKind = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                    {SWING_KINDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              )}
              {g === "Especial" && (
                <label className="flex items-center justify-between gap-3" title="Trovão: um raio cai do céu em quem levou o golpe. Raio: arcos longos entre todos">
                  <span>Efeito</span>
                  <select value={it.specialKind} onChange={e => { const v = e.target.value as SpecialKind; update(d => { d.specialKind = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                    {SPECIAL_KINDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              )}
              {g === "Combo" && (
                <div className="grid gap-1.5">
                  <span title="Golpes seguidos dentro da janela seguem esta ordem e depois recomeçam; cada um com direção, ângulo que cobre, duração, cooldown e alcance">Direção / Ângulo / Duração / Cooldown / Alcance</span>
                  {it.combo.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-1">
                      <select aria-label={`Golpe ${i + 1} do combo: direção`} value={c.kind} onChange={e => { const v = e.target.value; update(d => { if (v === "") d.combo.splice(i, 1); else d.combo[i] = { ...c, kind: v as BlowKind, arc: v === "spin" ? 360 : c.kind === "spin" ? comboArc(d.combo, base, v as BlowKind) : c.arc } }) }} className={COMBO_KIND}>
                        {SWING_KINDS.map(o => <option key={o.value} value={o.value}>{i + 1}. {o.label}</option>)}
                        {it.combo.length > 1 && <option value="">remover</option>}
                      </select>
                      <AngleKnob label={`Golpe ${i + 1} do combo: ângulo`} value={c.arc} disabled={c.kind === "spin"} onChange={v => update(d => { d.combo[i] = { ...c, arc: v } })} />
                      {COMBO_LISTS.map(l => (
                        <select key={l.key} aria-label={`Golpe ${i + 1} do combo: ${l.name}`} title={l.hint} value={c[l.key]} onChange={e => { const v = Number(e.target.value); update(d => { d.combo[i] = { ...c, [l.key]: v } }) }} className={COMBO_SELECT}>
                          {(l.values.includes(c[l.key]) ? l.values : [...l.values, c[l.key]].sort((x, y) => x - y)).map(v => <option key={v} value={v}>{l.show(v)}</option>)}
                        </select>
                      ))}
                    </div>
                  ))}
                  <div className="flex items-center gap-field">
                    {it.combo.length < COMBO_MAX && (
                      <button type="button" aria-label="Adicionar golpe ao combo" title="Adicionar golpe" onClick={() => update(d => { d.combo.push(comboBlow("down", comboArc(d.combo, base, "down"))) })} className="h-8 w-8 rounded-md border border-white/20 hover:border-primary">+</button>
                    )}
                    {JSON.stringify(it.combo) !== JSON.stringify(base.combo) && (
                      <button type="button" title="Volta os golpes do código" onClick={() => update(d => { d.combo = structuredClone(base.combo) })} className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>
                    )}
                  </div>
                </div>
              )}
              {g === "Rebate" && (
                <>
                  <ChainEditor chain={it.rebateChain} changed={JSON.stringify(it.rebateChain) !== JSON.stringify(base.rebateChain)} onChange={fn => update(d => fn(d.rebateChain))} onReset={() => update(d => { d.rebateChain = structuredClone(base.rebateChain) })} />
                  <label className="flex items-center justify-between gap-3" title="Um tok de madeira junto com a nota, como uma rebatida de verdade"><span>Som de tacada (tok)</span><input type="checkbox" checked={it.rebateTok} onChange={e => { const v = e.target.checked; update(d => { d.rebateTok = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                </>
              )}
              {g === "Golpe" && sel !== "peck" && (
                <label className="flex items-center justify-between gap-3" title="Desligado: um golpe apertado durante o anterior espera ele terminar"><span>Golpe novo interrompe o anterior</span><input type="checkbox" checked={it.meleeInterrupt} onChange={e => { const v = e.target.checked; update(d => { d.meleeInterrupt = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
              )}
              {g === "Golpe" && sel !== "peck" && (
                <label className="flex items-center justify-between gap-3">
                  <span>Rastro: cor</span>
                  <input type="color" aria-label="Cor do rastro" value={it.trailColor} onChange={e => { const v = e.target.value; update(d => { d.trailColor = v }) }} onDoubleClick={() => update(d => { d.trailColor = base.trailColor })} title={it.instrument ? "Nos instrumentos o rastro pega a cor da nota do acorde" : "Duplo clique volta a cor do código"} className="h-8 w-14 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
                </label>
              )}
              <div className="grid gap-field">
              {[...(g === "Efeito" ? [DOSES] : []), ...ITEM_PARAM_META.filter(m => m.group === g && (g !== "Pontos" || STAFF_POINTS.includes(m.key) === isStaff(it)) && (m.key !== "drawLen" || (it.archery && it.fireMode === "charge")) && !(sel === "peck" && (m.key === "durability" || m.key.startsWith("trail"))) && !(sel !== "peck" && m.key === "meleeArc") && !(m.key === "hangNotes2" && it.hangRows < 2) && !(it.returnThrow && HEAVY_SHOCK.includes(m.key))).map(m => sel === "peck" ? { ...m, label: m.key === "meleeRange" ? "Alcance da bicada" : m.key === "meleeTime" ? "Duração da bicada" : m.label, hint: m.key === "meleeTime" ? "Avanço rápido e retorno do pescoço" : m.hint } : m)].map(m => {
                const v = it[m.key] as number, changed = v !== base[m.key]
                const label = m === DOSES ? m.label : it.instrument && m.key === "damage" ? "Harmonia por nota" : it.instrument && m.key === "explodeDamage" ? "Harmonia no estouro" : it.beam && m.key === "mag" ? "Arco (segundos)" : it.meleeOnly && m.key === "mag" ? "Golpes seguidos" : m.label
                // the taco's ammo is blows; 0 in "breaks after" and in the gradual reload are words, not numbers
                const unit = it.meleeOnly && m !== DOSES && (m.key === "mag" || m.key === "refillAmount") ? "golpes" : m.unit
                const display = m.key === "durability" && v === 0 ? "0 (nunca quebra)" : m.key === "refillTime" && v === 0 ? "0 (desligada)" : `${v}${unit ? ` ${unit}` : ""}`
                const range = <PatioRange key={m.key} label={label} name={m.label} min={m.min} max={m.max} step={m.step} value={v}
                  display={display} changed={changed} hint={m.hint}
                  onChange={n => update(d => { (d as Record<string, unknown>)[m.key] = n })}
                  onReset={() => update(d => { (d as Record<string, unknown>)[m.key] = base[m.key] })} />
                // under the combo window: its timer bar, listening to the blows only while this section is open
                return m.key === "comboWindow" && open[g] ? <div key={m.key} className="grid gap-1">{range}<ComboWindowBar /></div> : range
              })}
              </div>
            </div>
          </details>
        ))}
        {/* admins: every item's current numbers become the game's default (data/pigchicken/default-items.json) */}
        <SaveToGameButton path="data/pigchicken/default-items.json" save={() => saveDefaultItems(items)} className="justify-end px-4 py-3" />
      </div>
    </FloatingPanel>
  )
}
