"use client"

// Popup with every number of the PigChicKen items (weapons and instruments), one item at a time
// picked in the dropdown at the top. Saved in this browser; the Parquinho follows it live.
import { PatioRange } from "@/components/ui/patio-range"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { ACCEL_CURVES, ARPS, CONSUMABLE_IDS, EFFECT_LOOKS, PATH_SHOWS, DEFAULT_ITEMS, INSTRUMENT_IDS, ITEM_PARAM_GROUPS, ITEM_PARAM_META, MELEE_IDS, WEAPON_IDS, loadItems, saveItems, subscribeItems, type AccelCurve, type Arp, type EffectLook, type FireMode, type PathShow, type ItemDef, type ItemId } from "@/lib/pigchicken/items"
import { VOICE_LABELS, type VoiceId } from "@/lib/pigchicken/synth"
import { COMBO_MAX, SWING_KINDS, type SwingKind } from "@/lib/pigchicken/swing"
import { cn } from "@/lib/utils"
import { CHAIN_MAX, TRANSFORMS, TRANSFORM_KINDS, newTransform, type Transform, type TransformKind } from "@/lib/pigchicken/transforms"

const FIRE_MODES: { value: FireMode; label: string }[] = [
  { value: "semi", label: "Semi (um por toque)" },
  { value: "auto", label: "Automático" },
  { value: "burst", label: "Rajada" },
  { value: "charge", label: "Carga (segura e solta)" },
  { value: "release", label: "Ao soltar o botão" },
]

// what each item uses; the wing has no ammo, projectile or throw; a consumable has its effect (and its doses), a slap and a throw
const CONSUMABLE_HIDES = ["Disparo", "Projétil", "Espalhamento", "Manuseio", "Desenho", "Explosão", "Música", "Rebate"]
const HIDDEN: Partial<Record<ItemId, string[]>> = {
  peck: ["Disparo", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Explosão", "Efeito", "Combo", "Rebate"],
  bat: ["Disparo", "Projétil", "Espalhamento", "Explosão", "Efeito"],
  wing: ["Disparo", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Explosão", "Efeito"],
  ...Object.fromEntries(CONSUMABLE_IDS.map(id => [id, CONSUMABLE_HIDES])),
}
// a consumable's doses are the magazine's number
const DOSES = { ...ITEM_PARAM_META.find(m => m.key === "mag")!, label: "Doses", unit: "", group: "Efeito", hint: "Cada Atirar usa uma; 0 = nunca acaba" }

export function ItemsPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Record<ItemId, ItemDef>>(DEFAULT_ITEMS)
  const [sel, setSel] = useState<ItemId>("pistol")
  const [open, setOpen] = useState<Record<string, boolean>>({ Disparo: true, Projétil: true, Efeito: true, Golpe: true, Combo: true, Bicada: true })
  useEffect(() => {
    setItems(loadItems())
    return subscribeItems(setItems)
  }, [])
  const it = items[sel], base = DEFAULT_ITEMS[sel]
  const update = (fn: (d: ItemDef) => void) => {
    const next = structuredClone(items)
    fn(next[sel])
    saveItems(next)
    setItems(next)
  }
  return (
    <FloatingPanel id="pigchicken-items" aria-label="Itens" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(380, vw - 24), h: vh - 104 })} minW={280} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex cursor-move items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <select aria-label="Item" value={sel} onChange={e => setSel(e.target.value as ItemId)} className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white">
          <optgroup label="Armas"><option value="peck">{items.peck.name} (sem item)</option>{[...MELEE_IDS, ...WEAPON_IDS].map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
          <optgroup label="Instrumentos">{INSTRUMENT_IDS.map(id => <option key={id} value={id}>{items[id].name} ({items[id].family})</option>)}</optgroup>
          <optgroup label="Habilidades especiais">{CONSUMABLE_IDS.map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
          <option value="wing">{items.wing.name}</option>
        </select>
        <button type="button" onClick={() => update(d => Object.assign(d, structuredClone(base)))} title="Volta este item para os valores do código" className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>
        <button type="button" aria-label="Fechar itens" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-4 pt-3 text-[10px] text-[#93a79a]">Família: {it.family}. {sel === "peck" && "Sem item selecionado: segure Atirar para recolher o pescoço e solte para bicar na direção da mira. Golpe continua dando uma asada. "}Vale na hora no Parquinho e fica salvo neste navegador. Duplo clique numa barra volta o valor do código.</p>
        {ITEM_PARAM_GROUPS.filter(g => !HIDDEN[sel]?.includes(g) && (g !== "Bicada" || sel === "peck") && (g !== "Música" || it.instrument) && (g !== "Efeito" || it.consumable)).map(g => (
          <details key={g} open={!!open[g]} onToggle={e => { const v = (e.currentTarget as HTMLDetailsElement).open; setOpen(o => ({ ...o, [g]: v })) }} className="border-b border-white/10">
            <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#93a79a] hover:text-white">{g}</summary>
            <div className="grid gap-3 px-4 pb-4">
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
                  <label className="flex items-center justify-between gap-3"><span>Recarga automática</span><input type="checkbox" checked={it.autoReload} onChange={e => { const v = e.target.checked; update(d => { d.autoReload = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Recarrega um tiro por vez</span><input type="checkbox" checked={it.shellReload} onChange={e => { const v = e.target.checked; update(d => { d.shellReload = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Tiro instantâneo</span><input type="checkbox" checked={it.hitscan} onChange={e => { const v = e.target.checked; update(d => { d.hitscan = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Atira durante o slide</span><input type="checkbox" checked={it.slideFire} onChange={e => { const v = e.target.checked; update(d => { d.slideFire = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                </>
              )}
              {g === "Música" && (
                <>
                  <label className="flex items-center justify-between gap-3">
                    <span>Som</span>
                    <select value={it.voice} onChange={e => { const v = e.target.value as VoiceId; update(d => { d.voice = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {(Object.keys(VOICE_LABELS) as VoiceId[]).map(v => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Notas de onde</span>
                    <select value={it.pitchSet} onChange={e => { const v = e.target.value as ItemDef["pitchSet"]; update(d => { d.pitchSet = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      <option value="chord">Do acorde da hora</option>
                      <option value="scale">Da escala da zona</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Arpejador</span>
                    <select value={it.arp} onChange={e => { const v = e.target.value as Arp; update(d => { d.arp = v }) }} className="h-8 w-44 rounded-md border border-white/15 bg-[#0b110e] px-2">
                      {ARPS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3"><span>No ritmo (quantizar)</span><input type="checkbox" checked={it.quantize} onChange={e => { const v = e.target.checked; update(d => { d.quantize = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Nota sustentada em feixe</span><input type="checkbox" checked={it.beam} onChange={e => { const v = e.target.checked; update(d => { d.beam = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                  <label className="flex items-center justify-between gap-3"><span>Carga em glissando</span><input type="checkbox" checked={it.gliss} onChange={e => { const v = e.target.checked; update(d => { d.gliss = v }) }} className="h-5 w-5 accent-[var(--primary)]" /></label>
                </>
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
              {g === "Combo" && (
                <div className="grid gap-1.5">
                  <span title="Golpes seguidos dentro da janela seguem esta ordem e depois recomeçam">Ordem dos golpes</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {it.combo.map((k, i) => (
                      <select key={i} aria-label={`Golpe ${i + 1} do combo`} value={k} onChange={e => { const v = e.target.value; update(d => { if (v === "") d.combo.splice(i, 1); else d.combo[i] = v as SwingKind }) }} className="h-8 rounded-md border border-white/15 bg-[#0b110e] px-1.5">
                        {SWING_KINDS.map(o => <option key={o.value} value={o.value}>{i + 1}. {o.label}</option>)}
                        {it.combo.length > 1 && <option value="">remover</option>}
                      </select>
                    ))}
                    {it.combo.length < COMBO_MAX && (
                      <button type="button" aria-label="Adicionar golpe ao combo" title="Adicionar golpe" onClick={() => update(d => { d.combo.push("down") })} className="h-8 w-8 rounded-md border border-white/20 hover:border-primary">+</button>
                    )}
                    {it.combo.join() !== base.combo.join() && (
                      <button type="button" title="Volta a ordem do código" onClick={() => update(d => { d.combo = base.combo.slice() })} className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>
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
              {[...(g === "Efeito" ? [DOSES] : []), ...ITEM_PARAM_META.filter(m => m.group === g && !(sel === "peck" && (m.key === "durability" || m.key.startsWith("trail")))).map(m => sel === "peck" ? { ...m, label: m.key === "meleeRange" ? "Alcance da bicada" : m.key === "meleeTime" ? "Duração da bicada" : m.label, hint: m.key === "meleeTime" ? "Avanço rápido e retorno do pescoço" : m.hint } : m)].map(m => {
                const v = it[m.key] as number, changed = v !== base[m.key]
                const label = m === DOSES ? m.label : it.instrument && m.key === "damage" ? "Harmonia por nota" : it.instrument && m.key === "explodeDamage" ? "Harmonia no estouro" : it.beam && m.key === "mag" ? "Arco (segundos)" : m.label
                return <PatioRange key={m.key} label={label} name={m.label} min={m.min} max={m.max} step={m.step} value={v}
                  display={`${v}${m.unit ? ` ${m.unit}` : ""}`} changed={changed} hint={m.hint}
                  onChange={n => update(d => { (d as Record<string, unknown>)[m.key] = n })}
                  onReset={() => update(d => { (d as Record<string, unknown>)[m.key] = base[m.key] })} />
              })}
            </div>
          </details>
        ))}
      </div>
    </FloatingPanel>
  )
}

// the rebate's chain of transformations: one row per step (what, its chance, its number and its mode), in order
const GROUPS = [...new Set(TRANSFORM_KINDS.map(k => TRANSFORMS[k].group))]
const field = "h-8 rounded-md border border-white/15 bg-[#0b110e] px-1.5"
function ChainEditor({ chain, changed, onChange, onReset }: { chain: Transform[]; changed: boolean; onChange: (fn: (c: Transform[]) => void) => void; onReset: () => void }) {
  const kindSelect = (value: string, onPick: (k: TransformKind) => void, label: string, empty?: string) => (
    <select aria-label={label} value={value} onChange={e => { if (e.target.value) onPick(e.target.value as TransformKind) }} className={cn(field, "min-w-0 flex-1")}>
      {empty && <option value="">{empty}</option>}
      {GROUPS.map(g => <optgroup key={g} label={g}>{TRANSFORM_KINDS.filter(k => TRANSFORMS[k].group === g).map(k => <option key={k} value={k}>{TRANSFORMS[k].label}</option>)}</optgroup>)}
    </select>
  )
  return (
    <div className="grid gap-2">
      <span title="Cada nota rebatida por este item passa por estes passos, em ordem; cada um acontece com a sua chance">Cadeia de transformações</span>
      {chain.length === 0 && <span className="text-[10px] text-[#93a79a]">Vazia: a nota sai como veio.</span>}
      {chain.map((t, i) => {
        const m = TRANSFORMS[t.kind]
        return (
          <div key={i} className="grid gap-1.5 rounded-md border border-white/10 p-2" title={m.hint}>
            <div className="flex items-center gap-1.5">
              <span className="w-4 text-right text-[#93a79a]">{i + 1}.</span>
              {kindSelect(t.kind, k => onChange(c => { c[i] = { ...newTransform(k), chance: c[i].chance } }), `Passo ${i + 1}`)}
              <button type="button" aria-label="Subir passo" disabled={i === 0} onClick={() => onChange(c => { [c[i - 1], c[i]] = [c[i], c[i - 1]] })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary disabled:opacity-30">↑</button>
              <button type="button" aria-label="Descer passo" disabled={i === chain.length - 1} onClick={() => onChange(c => { [c[i + 1], c[i]] = [c[i], c[i + 1]] })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary disabled:opacity-30">↓</button>
              <button type="button" aria-label="Remover passo" onClick={() => onChange(c => { c.splice(i, 1) })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary">×</button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pl-5">
              <label className="flex items-center gap-1" title="Chance de acontecer em cada rebate">
                <input type="number" aria-label="Chance" min={0} max={100} step={5} value={Math.round(t.chance * 100)} onChange={e => { const v = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100; onChange(c => { c[i].chance = v }) }} className={cn(field, "w-16")} />%
              </label>
              {m.n && (
                <label className="flex items-center gap-1">{m.n.label}
                  <input type="number" aria-label={m.n.label} min={m.n.min} max={m.n.max} step={m.n.step} value={t.n} onChange={e => { const v = Math.max(m.n!.min, Math.min(m.n!.max, Number(e.target.value) || 0)); onChange(c => { c[i].n = v }) }} className={cn(field, "w-16")} />
                </label>
              )}
              {m.modes && (
                <select aria-label="Modo" value={t.mode} onChange={e => { const v = e.target.value; onChange(c => { c[i].mode = v }) }} className={cn(field, "min-w-0 flex-1")}>
                  {m.modes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-1.5">
        {chain.length < CHAIN_MAX && kindSelect("", k => onChange(c => { c.push(newTransform(k)) }), "Adicionar transformação", "+ adicionar…")}
        {changed && <button type="button" title="Volta a cadeia do código" onClick={onReset} className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>}
      </div>
    </div>
  )
}
