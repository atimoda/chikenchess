"use client"

// Popup with every number of the PigChicKen items (weapons and instruments), one item at a time
// picked in the dropdown at the top. Saved in this browser; the Parquinho follows it live.
import { FloatingPanel } from "@/components/ui/floating-panel"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { ACCEL_CURVES, ARPS, CONSUMABLE_IDS, EFFECT_LOOKS, PATH_SHOWS, DEFAULT_ITEMS, INSTRUMENT_IDS, ITEM_PARAM_GROUPS, ITEM_PARAM_META, WEAPON_IDS, loadItems, saveItems, subscribeItems, type AccelCurve, type Arp, type EffectLook, type FireMode, type PathShow, type ItemDef, type ItemId } from "@/lib/pigchicken/items"
import { VOICE_LABELS, type VoiceId } from "@/lib/pigchicken/synth"
import { cn } from "@/lib/utils"

const FIRE_MODES: { value: FireMode; label: string }[] = [
  { value: "semi", label: "Semi (um por toque)" },
  { value: "auto", label: "Automático" },
  { value: "burst", label: "Rajada" },
  { value: "charge", label: "Carga (segura e solta)" },
  { value: "release", label: "Ao soltar o botão" },
]

// what each item uses; the wing has no ammo, projectile or throw; a consumable has its effect (and its doses), a slap and a throw
const CONSUMABLE_HIDES = ["Disparo", "Projétil", "Espalhamento", "Manuseio", "Desenho", "Explosão", "Música"]
const HIDDEN: Partial<Record<ItemId, string[]>> = {
  peck: ["Disparo", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Explosão", "Efeito"],
  wing: ["Disparo", "Projétil", "Espalhamento", "Manuseio", "Arremesso", "Desenho", "Explosão", "Efeito"],
  ...Object.fromEntries(CONSUMABLE_IDS.map(id => [id, CONSUMABLE_HIDES])),
}
// a consumable's doses are the magazine's number
const DOSES = { ...ITEM_PARAM_META.find(m => m.key === "mag")!, label: "Doses", unit: "", group: "Efeito", hint: "Cada Atirar usa uma; 0 = nunca acaba" }

export function ItemsPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Record<ItemId, ItemDef>>(DEFAULT_ITEMS)
  const [sel, setSel] = useState<ItemId>("pistol")
  const [open, setOpen] = useState<Record<string, boolean>>({ Disparo: true, Projétil: true, Efeito: true, Golpe: true, Bicada: true })
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
          <optgroup label="Armas"><option value="peck">{items.peck.name} (sem item)</option>{WEAPON_IDS.map(id => <option key={id} value={id}>{items[id].name}</option>)}</optgroup>
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
              {[...(g === "Efeito" ? [DOSES] : []), ...ITEM_PARAM_META.filter(m => m.group === g && !(sel === "peck" && m.key === "durability")).map(m => sel === "peck" ? { ...m, label: m.key === "meleeRange" ? "Alcance da bicada" : m.key === "meleeTime" ? "Duração da bicada" : m.label, hint: m.key === "meleeTime" ? "Avanço rápido e retorno do pescoço" : m.hint } : m)].map(m => {
                const v = it[m.key] as number, changed = v !== base[m.key]
                const fill = Math.max(0, Math.min(100, ((v - m.min) / (m.max - m.min)) * 100))
                return (
                  <div key={m.key} className="grid gap-1" title={m.hint}>
                    <div className="relative h-9 overflow-hidden rounded-md bg-[#22302a]" onDoubleClick={() => update(d => { (d as Record<string, unknown>)[m.key] = base[m.key] })}>
                      <div className="absolute inset-y-0 left-0 bg-primary/50" style={{ width: `${fill}%` }} />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-between gap-2 px-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">
                        <span className="truncate">{m === DOSES ? m.label : it.instrument && m.key === "damage" ? "Harmonia por nota" : it.instrument && m.key === "explodeDamage" ? "Harmonia no estouro" : it.beam && m.key === "mag" ? "Arco (segundos)" : m.label}</span>
                        <output className={cn("shrink-0 font-bold tabular-nums", changed && "text-amber-300")}>{v}{m.unit ? ` ${m.unit}` : ""}</output>
                      </div>
                      <input type="range" aria-label={m.label} min={m.min} max={m.max} step={m.step} value={v} onChange={e => { const n = Number(e.target.value); update(d => { (d as Record<string, unknown>)[m.key] = n }) }} onPointerUp={e => e.currentTarget.blur()} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </div>
                    {m.hint && <span className="text-[10px] text-[#93a79a]">{m.hint}</span>}
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </FloatingPanel>
  )
}
