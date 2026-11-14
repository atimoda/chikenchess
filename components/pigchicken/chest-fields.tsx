"use client"

// The Editar panel of a Baú (lib/pigchicken/chests.ts): its rarity, what opens it and what comes out of it, each line
// a specific item or a group (one of its items is drawn) with its own chance. Also the item dropdown's groups, shared
// by the racks and loose items.
import { Plus, X } from "lucide-react"
import { CHEST_LOCKS, CHEST_LOOT_MAX, CHEST_RARITIES, CHEST_REOPEN_MAX, CHEST_SOULS, LOOT_GROUPS, type ChestLock, type ChestParams, type ChestRarity, type LootEntry } from "@/lib/pigchicken/chests"
import { CONSUMABLE_IDS, DEFAULT_ITEMS, INSTRUMENT_IDS, KEY_IDS, MAGIC_IDS, SPORTS_IDS, WEAPON_IDS } from "@/lib/pigchicken/items"

const FIELD = "h-9 rounded-md border border-white/15 bg-[#0b110e] px-2"

// the items a rack, a loose item or a Baú can hold, by group
export function ItemOptGroups() {
  const group = (label: string, ids: typeof WEAPON_IDS) => <optgroup label={label}>{ids.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
  return <>
    {group("Esportivos", SPORTS_IDS)}
    {group("Armas", WEAPON_IDS)}
    {group("Instrumentos", INSTRUMENT_IDS)}
    {group("Habilidades especiais", CONSUMABLE_IDS)}
    {group("Magia", MAGIC_IDS)}
    {group("Chaves", KEY_IDS)}
  </>
}

export function ChestFields({ chest, onChange }: { chest: ChestParams; onChange: (chest: ChestParams, step?: string) => void }) {
  const set = (patch: Partial<ChestParams>, step?: string) => onChange({ ...chest, ...patch }, step)
  const setLine = (i: number, patch: Partial<LootEntry>, step?: string) => set({ loot: chest.loot.map((e, j) => (j === i ? { ...e, ...patch } : e)) }, step && `${step}-${i}`)
  return <>
    <label className="grid gap-1">
      <span>Raridade</span>
      <select aria-label="Raridade do baú" value={chest.rarity} onChange={e => set({ rarity: e.target.value as ChestRarity })} className={FIELD}>
        {CHEST_RARITIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
    </label>
    <label className="grid gap-1">
      <span>Abre com</span>
      <select aria-label="O que abre o baú" value={chest.lock} onChange={e => set({ lock: e.target.value as ChestLock })} className={FIELD}>
        {CHEST_LOCKS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>
    </label>
    {chest.lock === "souls" && <label className="grid gap-1">
      <span>Almas na Bag of souls</span>
      <input aria-label="Almas na Bag of souls" type="number" min={CHEST_SOULS.min} max={CHEST_SOULS.max} step={1} value={chest.souls}
        onChange={e => { if (e.target.value !== "") set({ souls: Math.round(Math.max(CHEST_SOULS.min, Math.min(CHEST_SOULS.max, Number(e.target.value)))) }, "chest-souls") }} className={FIELD} />
    </label>}
    <label className="grid gap-1" title="Depois de aberto, fecha de novo após este tempo e pode ser aberto outra vez, com novo sorteio. 0: fica aberto até o Pátio ser aberto de novo.">
      <span>Fecha de novo após (s)</span>
      <input aria-label="Fecha de novo após" type="number" min={0} max={CHEST_REOPEN_MAX} step={1} value={chest.reopen}
        onChange={e => { if (e.target.value !== "") set({ reopen: Math.max(0, Math.min(CHEST_REOPEN_MAX, Number(e.target.value))) }, "chest-reopen") }} className={FIELD} />
    </label>
    <div className="grid min-w-0 gap-1.5" role="group" aria-label="Itens do baú">
      <span>Itens</span>
      {chest.loot.map((e, i) => (
        <div key={i} className="flex min-w-0 items-center gap-1.5">
          <select aria-label={`Item ${i + 1}`} value={e.pick} onChange={ev => setLine(i, { pick: ev.target.value as LootEntry["pick"] })} className={`${FIELD} min-w-0 flex-1`}>
            <optgroup label="Aleatório">{LOOT_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <ItemOptGroups />
          </select>
          <label className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-white/15 bg-[#0b110e] pr-2" title="Chance de este item sair">
            <input aria-label={`Chance do item ${i + 1}`} type="number" min={0} max={100} step={5} value={e.chance}
              onChange={ev => { if (ev.target.value !== "") setLine(i, { chance: Math.round(Math.max(0, Math.min(100, Number(ev.target.value)))) }, "chest-chance") }}
              className="h-full w-12 bg-transparent pl-2 text-right outline-none" />
            <span className="text-[#93a79a]">%</span>
          </label>
          <button type="button" aria-label={`Tirar item ${i + 1}`} onClick={() => set({ loot: chest.loot.filter((_, j) => j !== i) })}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
        </div>
      ))}
      {chest.loot.length < CHEST_LOOT_MAX && <button type="button" onClick={() => set({ loot: [...chest.loot, { pick: "any", chance: 100 }] })}
        className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-dashed border-white/20 hover:border-primary hover:text-white"><Plus className="h-4 w-4" />Item</button>}
    </div>
  </>
}
