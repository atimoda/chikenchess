"use client"

// The Editar panel of a Baú (lib/pigchicken/chests.ts): its rarity, what opens it and what comes out of it, each line
// a specific item or a group (one of its items is drawn) with its own chance. Also the item dropdown's groups, shared
// by the racks and loose items, and the list of lines itself, shared by the prize of the Jukebox and the Vitrola.
import { StepSelect } from "@/components/ui/step-select"
import { Plus, X } from "lucide-react"
import { CHEST_LOCKS, CHEST_LOOT_MAX, CHEST_RARITIES, CHEST_REOPEN_MAX, CHEST_SOULS, LOOT_GROUPS, type ChestLock, type ChestParams, type ChestRarity, type LootEntry } from "@/lib/pigchicken/chests"
import { CAGE_IDS, CONSUMABLE_IDS, DEFAULT_ITEMS, INSTRUMENT_IDS, KEY_IDS, MAGIC_IDS, MINE_ITEM_IDS, SPORTS_IDS, WEAPON_IDS } from "@/lib/pigchicken/items"
import { msg, useT } from "@/lib/i18n"

const FIELD = "h-9 rounded-md border border-white/15 bg-[#0b110e] px-2"

// the items a rack, a loose item or a Baú can hold, by group
export function ItemOptGroups() {
  const t = useT()
  const group = (label: string, ids: typeof WEAPON_IDS) => <optgroup label={t(label)}>{ids.map(id => <option key={id} value={id}>{t(DEFAULT_ITEMS[id].name)}</option>)}</optgroup>
  return <>
    {group(msg("Esportivos"), SPORTS_IDS)}
    {group(msg("Armas"), WEAPON_IDS)}
    {group(msg("Instrumentos"), INSTRUMENT_IDS)}
    {group(msg("Habilidades especiais"), CONSUMABLE_IDS)}
    {group(msg("Magia"), MAGIC_IDS)}
    {group(msg("Chaves"), KEY_IDS)}
    {group(msg("Grade de blocos"), MINE_ITEM_IDS)}
    {group(msg("Gaiolas"), CAGE_IDS)}
  </>
}

export function ChestFields({ chest, onChange }: { chest: ChestParams; onChange: (chest: ChestParams, step?: string) => void }) {
  const t = useT()
  const set = (patch: Partial<ChestParams>, step?: string) => onChange({ ...chest, ...patch }, step)
  return <>
    <label className="grid gap-1">
      <span>{t("Raridade")}</span>
      <StepSelect aria-label={t("Raridade do baú")} value={chest.rarity} onChange={e => set({ rarity: e.target.value as ChestRarity })} className={FIELD}>
        {CHEST_RARITIES.map(r => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
      </StepSelect>
    </label>
    <label className="grid gap-1">
      <span>{t("Abre com")}</span>
      <StepSelect aria-label={t("O que abre o baú")} value={chest.lock} onChange={e => set({ lock: e.target.value as ChestLock })} className={FIELD}>
        {CHEST_LOCKS.map(l => <option key={l.value} value={l.value}>{t(l.label)}</option>)}
      </StepSelect>
    </label>
    {chest.lock === "souls" && <label className="grid gap-1">
      <span>{t("Almas nas gaiolas")}</span>
      <input aria-label={t("Almas nas gaiolas")} type="number" min={CHEST_SOULS.min} max={CHEST_SOULS.max} step={1} value={chest.souls}
        onChange={e => { if (e.target.value !== "") set({ souls: Math.round(Math.max(CHEST_SOULS.min, Math.min(CHEST_SOULS.max, Number(e.target.value)))) }, "chest-souls") }} className={FIELD} />
    </label>}
    <label className="grid gap-1" title={t("Depois de aberto, fecha de novo após este tempo e pode ser aberto outra vez, com novo sorteio. 0: fica aberto até o Pátio ser aberto de novo.")}>
      <span>{t("Fecha de novo após (s)")}</span>
      <input aria-label={t("Fecha de novo após")} type="number" min={0} max={CHEST_REOPEN_MAX} step={1} value={chest.reopen}
        onChange={e => { if (e.target.value !== "") set({ reopen: Math.max(0, Math.min(CHEST_REOPEN_MAX, Number(e.target.value))) }, "chest-reopen") }} className={FIELD} />
    </label>
    <LootList label={t("Itens")} groupLabel={t("Itens do baú")} loot={chest.loot} onChange={(loot, step) => set({ loot }, step)} />
  </>
}

// lines of what comes out: a specific item or a group, each with its chance; "+ Item" adds Qualquer item at 100%
export function LootList({ label, groupLabel, loot, onChange }: { label: string; groupLabel: string; loot: LootEntry[]; onChange: (loot: LootEntry[], step?: string) => void }) {
  const t = useT()
  const setLine = (i: number, patch: Partial<LootEntry>, step?: string) => onChange(loot.map((e, j) => (j === i ? { ...e, ...patch } : e)), step && `${step}-${i}`)
  return <div className="grid min-w-0 gap-1.5" role="group" aria-label={groupLabel}>
    <span>{label}</span>
    {loot.map((e, i) => (
      <div key={i} className="flex min-w-0 items-center gap-1.5">
        <StepSelect aria-label={t("Item {v}", { v: i + 1 })} value={e.pick} onChange={ev => setLine(i, { pick: ev.target.value as LootEntry["pick"] })} className={`${FIELD} min-w-0 flex-1`}>
          <optgroup label={t("Aleatório")}>{LOOT_GROUPS.map(g => <option key={g.value} value={g.value}>{t(g.label)}</option>)}</optgroup>
          <ItemOptGroups />
        </StepSelect>
        <label className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-white/15 bg-[#0b110e] pr-2" title={t("Chance de este item sair")}>
          <input aria-label={t("Chance do item {v}", { v: i + 1 })} type="number" min={0} max={100} step={5} value={e.chance}
            onChange={ev => { if (ev.target.value !== "") setLine(i, { chance: Math.round(Math.max(0, Math.min(100, Number(ev.target.value)))) }, "chest-chance") }}
            className="h-full w-12 bg-transparent pl-2 text-right outline-none" />
          <span className="text-[#93a79a]">%</span>
        </label>
        <button type="button" aria-label={t("Tirar item {v}", { v: i + 1 })} onClick={() => onChange(loot.filter((_, j) => j !== i))}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
    ))}
    {loot.length < CHEST_LOOT_MAX && <button type="button" onClick={() => onChange([...loot, { pick: "any", chance: 100 }])}
      className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-dashed border-white/20 hover:border-primary hover:text-white"><Plus className="h-4 w-4" />{t("Item")}</button>}
  </div>
}
