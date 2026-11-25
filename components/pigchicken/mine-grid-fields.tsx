"use client"

// The fields of the Grade de blocos' panel (components/pigchicken/mine-grid-panel.tsx; lib/pigchicken/mine-grid.ts).
// Turning the grid on or off belongs to the Pátio's creator and godparent (and the admin); "Resetar grade" also to
// the room's owner; the other settings to whoever may edit the Pátio (everyone else sees them, dimmed).
import { useState, useSyncExternalStore } from "react"
import { ChevronDown, Dices, Eye, Power, RotateCcw } from "lucide-react"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { PatioRange } from "@/components/ui/patio-range"
import { StepSelect } from "@/components/ui/step-select"
import { MINE_BOMBS, MINE_CELL, MINE_CORNER, MINE_DAMAGE, MINE_FUSE, MINE_GAP, MINE_NOTES, MINE_START_BOMBS, MINE_TURNS, MINE_WALL_OPACITY, defaultMineGrid, type MineGridParams, type MineTurn } from "@/lib/pigchicken/mine-grid"
import { mineStore, setMineDebug, setMineNumbersFront } from "@/lib/pigchicken/mine-grid-store"
import { patioIsAdmin } from "@/lib/pigchicken/edit-access"
import { MINE_ZONE_RHYTHM, mineZoneHas, mineZonePoolLabel, toggleMineZoneBeat, type MineZoneParams } from "@/lib/pigchicken/mine-zone-params"
import { BEATS, BEAT_GROUPS } from "@/lib/pigchicken/beats"
import { MINE_ITEM_CHANCE, MINE_ITEM_GROUPS, MINE_ITEM_GROUP_CHANCE, MINE_ITEM_MAX, MINE_ITEM_WEIGHT, defaultMineItems, mineItemWeight, setMineItemWeight, type MineItemParams } from "@/lib/pigchicken/mine-item-params"
import { DEFAULT_ITEMS } from "@/lib/pigchicken/items"
import { ResetArrow } from "@/components/ui/reset-arrow"
import { useGameDefaults } from "@/hooks/use-game-defaults"
import { cn } from "@/lib/utils"

const ROW = "flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3"
// the seesaw's turn: where the blue grows from (the red comes from the other side)
const TURN_LABELS: Record<string, string> = {
  0: "Azul de baixo", 45: "Azul do canto de baixo, à esquerda", 90: "Azul da esquerda", 135: "Azul do canto de cima, à esquerda",
  180: "Azul de cima", 225: "Azul do canto de cima, à direita", 270: "Azul da direita", 315: "Azul do canto de baixo, à direita",
  random: "Aleatório", first: "Primeiro tiro determina o lado",
}
const COLOR_ROWS = [["grey", "Cor neutra"], ["blue", "Cor da música"], ["red", "Cor do dano"], ["orange", "Cor da dúvida"]] as const
const MENU_ITEM = "cursor-pointer font-mono text-xs text-white focus:bg-white/10 focus:text-white"
// the three buttons on top (Ligar/Desligar, Resetar, Números)
const TOP_BUTTON = "flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md border px-1 hover:text-white disabled:opacity-40 disabled:hover:text-inherit"
const TOP_ON = "border-[#ffd166] bg-[#ffd166]/15 text-[#ffd166]"
const TOP_OFF = "border-white/15 bg-[#0b110e] enabled:hover:border-[#ffd166]"

// a field's name: amber with the small reset in front while it is off the game's default
function Named({ label, changed, onReset }: { label: string; changed: boolean; onReset: () => void }) {
  return <span className={cn("flex min-w-0 items-center gap-1", changed && "text-amber-300")}>{changed && <ResetArrow label={label} onReset={onReset} />}{label}</span>
}

// the rhythms that go into the blocks' draw: "Todos" and each rhythm, by group, with a check on the chosen ones
function RhythmPool({ zones, disabled, onChange }: { zones: MineZoneParams; disabled: boolean; onChange: (z: MineZoneParams) => void }) {
  const item = (id: Parameters<typeof toggleMineZoneBeat>[1], label: string, checked: boolean) => (
    <DropdownMenuCheckboxItem key={id} checked={checked} className={MENU_ITEM}
      onSelect={e => e.preventDefault()} onCheckedChange={on => onChange(toggleMineZoneBeat(zones, id, on === true))}>{label}</DropdownMenuCheckboxItem>
  )
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger disabled={disabled} className="inline-flex h-8 max-w-[60%] items-center gap-1 truncate rounded-md border border-white/15 bg-[#0b110e] px-2 hover:border-[#ffd166]">
        <span className="truncate">{mineZonePoolLabel(zones)}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[1000] max-h-80 border-white/15 bg-[#101713] text-white">
        {item("all", "Todos", zones.all)}
        {BEAT_GROUPS.map(g => <div key={g}>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuLabel className="font-mono text-[11px] font-normal text-white/50">{g}</DropdownMenuLabel>
          {BEATS.filter(b => b.group === g).map(b => item(b.id, b.label, mineZoneHas(zones, b.id)))}
        </div>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// "Spawn de itens": how many blocks are born with items, how many each gets, and the chances of each group and item
function ItemSpawnFields({ items, canToggle, onChange }: { items: MineItemParams; canToggle: boolean; onChange: (items: MineItemParams) => void }) {
  const D = defaultMineGrid()
  const set = (p: Partial<MineItemParams>) => onChange({ ...items, ...p })
  return <>
    <PatioRange label="Blocos com itens" min={MINE_ITEM_CHANCE.min} max={MINE_ITEM_CHANCE.max} step={MINE_ITEM_CHANCE.step} value={items.chance} display={`${items.chance}%`}
      onChange={v => set({ chance: v })} changed={items.chance !== D.items.chance} onReset={() => set({ chance: D.items.chance })}
      hint="Chance de cada bloco nascer com itens, numa plataforma em algum lugar do meio dele." />
    <PatioRange label="Itens por bloco" min={MINE_ITEM_MAX.min} max={MINE_ITEM_MAX.max} step={MINE_ITEM_MAX.step} value={items.max} display={`até ${items.max}`}
      onChange={v => set({ max: v })} changed={items.max !== D.items.max} onReset={() => set({ max: D.items.max })} />
    {MINE_ITEM_GROUPS.map(g => <div key={g.id} className="grid gap-field">
      <PatioRange label={g.label} min={MINE_ITEM_GROUP_CHANCE.min} max={MINE_ITEM_GROUP_CHANCE.max} step={MINE_ITEM_GROUP_CHANCE.step} value={items.groups[g.id]} display={`${items.groups[g.id]}%`}
        onChange={v => set({ groups: { ...items.groups, [g.id]: v } })} changed={items.groups[g.id] !== D.items.groups[g.id]} onReset={() => set({ groups: { ...items.groups, [g.id]: D.items.groups[g.id] } })}
        hint="Chance de cada item vir deste grupo, em proporção aos outros grupos. Em 0 o grupo não sai." />
      <details className="rounded-md border border-white/10">
        <summary className="cursor-pointer px-3 py-2 text-white/70 hover:text-white">Itens de {g.label.toLowerCase()}</summary>
        <div className="grid gap-field px-2 pb-2">
          {g.items.map(id => { const w = mineItemWeight(items, id); return (
            <PatioRange key={id} label={DEFAULT_ITEMS[id].name} min={MINE_ITEM_WEIGHT.min} max={MINE_ITEM_WEIGHT.max} step={MINE_ITEM_WEIGHT.step} value={w} display={`${w}%`}
              onChange={v => onChange(setMineItemWeight(items, id, v))} changed={w !== mineItemWeight(D.items, id)} onReset={() => onChange(setMineItemWeight(items, id, mineItemWeight(D.items, id)))} />
          ) })}
        </div>
      </details>
    </div>)}
    <button type="button" disabled={!canToggle} onClick={() => set({ seed: 1 + Math.floor(Math.random() * 0x7ffffffe) })}
      title={canToggle ? "Sorteia de novo quais blocos têm itens, onde fica a plataforma e quais itens ficam nela" : "Só o criador, o padrinho e o admin sorteiam."}
      className="flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-[#0b110e] hover:border-[#ffd166] hover:text-white disabled:opacity-40"><Dices className="h-4 w-4" />Sortear</button>
  </>
}

export function MineGridFields({ grid, canEdit, canToggle, onChange, onReset }: {
  grid: MineGridParams | undefined; canEdit: boolean; canToggle: boolean
  onChange: (grid: MineGridParams) => void; onReset?: () => void
}) {
  // the game's defaults (lib/game-defaults.ts → mineGrid): a field off them is amber with the small reset in front
  useGameDefaults()
  const D = defaultMineGrid()
  const g = grid ?? D
  const set = (p: Partial<MineGridParams>) => onChange({ ...g, ...p })
  // the admin's debug: this browser's alone, gone with the page
  const debug = useSyncExternalStore(mineStore.subscribe, () => mineStore.debug, () => mineStore.debug)
  // "Mostrar números": this browser's too
  const front = useSyncExternalStore(mineStore.subscribe, () => mineStore.numbersFront, () => false)
  const admin = patioIsAdmin()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const group = (title: string, children: React.ReactNode) => (
    <PatioDisclosure title={title} open={!!open[title]} onToggle={v => setOpen(o => ({ ...o, [title]: v }))}>{open[title] && <div className="grid gap-field px-4 pb-4">{children}</div>}</PatioDisclosure>
  )
  const check = (label: string, title: string, checked: boolean, onCheck: (on: boolean) => void, def?: boolean) => (
    <label className={ROW} title={title}>
      <Named label={label} changed={def !== undefined && checked !== def} onReset={() => onCheck(!!def)} />
      <input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
    </label>
  )
  return (
    <>
      {/* Ligar/Desligar, Resetar and Números side by side, a third of the row each; yellow while on */}
      <div className="grid grid-cols-3 gap-2 border-b border-white/10 px-4 pb-4">
        <button type="button" aria-pressed={g.on} disabled={!canToggle || !canEdit} onClick={() => set({ on: !g.on })}
          title={canToggle ? "Cobre o Pátio com blocos fechados, do chão ao teto. Cada bloco pode esconder uma bomba, e os abertos mostram quantas há em volta." : "Só o criador ou o padrinho deste Pátio ligam e desligam a grade."}
          className={`${TOP_BUTTON} ${g.on ? TOP_ON : TOP_OFF}`}><Power className="h-4 w-4 shrink-0" />{g.on ? "Desligar" : "Ligar"}</button>
        <button type="button" disabled={!g.on || !onReset} onClick={onReset} title="Fecha todos os blocos e sorteia as bombas de novo"
          className={`${TOP_BUTTON} ${TOP_OFF}`}><RotateCcw className="h-4 w-4 shrink-0" />Resetar</button>
        <button type="button" aria-pressed={g.on && front} disabled={!g.on} onClick={() => setMineNumbersFront(!front)} title="Conta de novo as bombas em volta de cada bloco aberto e mostra os números na frente de tudo, dos dois lados. Só neste navegador."
          className={`${TOP_BUTTON} ${g.on && front ? TOP_ON : TOP_OFF}`}><Eye className="h-4 w-4 shrink-0" />Números</button>
      </div>
      {/* the settings can be prepared with the grid still off */}
      <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60 [&:disabled_input]:cursor-default">
        {group("Blocos", <>
          <PatioRange label="Tamanho do bloco" min={MINE_CELL.min} max={MINE_CELL.max} step={MINE_CELL.step} value={g.cell} display={`${g.cell} u`}
            onChange={v => set({ cell: v })} changed={g.cell !== D.cell} onReset={() => set({ cell: D.cell })} />
          <PatioRange label="Vão entre blocos" min={MINE_GAP.min} max={MINE_GAP.max} step={MINE_GAP.step} value={g.gap} display={g.gap ? `${g.gap} u` : "sem vão"}
            onChange={v => set({ gap: v })} changed={g.gap !== D.gap} onReset={() => set({ gap: D.gap })}
            hint="Com vão, cada bloco fechado é uma sala com quatro paredes e dá para andar entre os blocos. Sem vão, os blocos encostam e só há parede entre um bloco fechado e um aberto." />
          <PatioRange label="Cantos em octógono" min={MINE_CORNER.min} max={MINE_CORNER.max} step={MINE_CORNER.step} value={g.corner} display={g.corner ? `${g.corner}%` : "quadrado"}
            onChange={v => set({ corner: v })} changed={g.corner !== D.corner} onReset={() => set({ corner: D.corner })}
            hint="Corta os quatro cantos de cada bloco. Em 100% o bloco é um octógono de lados iguais. O que sai do canto vira espaço entre os blocos." />
          {check("Bloqueia passagem", "As paredes dos blocos fechados barram os bonecos. Desligado, a grade é só desenho.", g.pass, on => set({ pass: on }), D.pass)}
          <PatioRange label="Opacidade das paredes" min={MINE_WALL_OPACITY.min} max={MINE_WALL_OPACITY.max} step={MINE_WALL_OPACITY.step} value={g.wallOpacity} display={`${g.wallOpacity}%`}
            onChange={v => set({ wallOpacity: v })} changed={g.wallOpacity !== D.wallOpacity} onReset={() => set({ wallOpacity: D.wallOpacity })}
            hint="O quanto os blocos fechados cobrem o que está atrás e dentro deles. Abaixo de 100% dá para ver quem está do outro lado. A gangorra, a bandeira e a interrogação não mudam." />
        </>)}
        {group("Música e dano", <>
          {check("Notas quicam nas paredes", "Ligado, as notas quicam nas paredes dos blocos fechados. Desligado, elas atravessam e contam ao entrar no bloco.", g.blockNotes, on => set({ blockNotes: on }), D.blockNotes)}
          <PatioRange label="Notas até a bandeira" min={MINE_NOTES.min} max={MINE_NOTES.max} step={MINE_NOTES.step} value={g.toFlag} display={`${g.toFlag}`}
            onChange={v => set({ toFlag: v })} changed={g.toFlag !== D.toFlag} onReset={() => set({ toFlag: D.toFlag })} hint="Notas do lado aberto que levam um bloco do cinza até a bandeira." />
          <PatioRange label="Notas até a dúvida" min={MINE_NOTES.min} max={MINE_NOTES.max} step={MINE_NOTES.step} value={g.toDoubt} display={`${g.toDoubt}`}
            onChange={v => set({ toDoubt: v })} changed={g.toDoubt !== D.toDoubt} onReset={() => set({ toDoubt: D.toDoubt })} hint="Notas em cima de uma bandeira até ela virar interrogação." />
          <PatioRange label="Dano até liberar o bloco" min={MINE_DAMAGE.min} max={MINE_DAMAGE.max} step={MINE_DAMAGE.step} value={g.toOpen} display={g.toOpen ? `${g.toOpen}` : "não quebra"}
            onChange={v => set({ toOpen: v })} changed={g.toOpen !== D.toOpen} onReset={() => set({ toOpen: D.toOpen })} hint="Dano de armas de fogo que leva um bloco do cinza até abrir." />
          {check("Lado de dentro quebra paredes", "Ligado, os tiros, as explosões e os golpes de quem está do lado fechado também contam como dano nos blocos. Desligado, só o lado aberto quebra.", g.insideBreaks, on => set({ insideBreaks: on }), D.insideBreaks)}
          <label className={ROW}>
            <Named label="Giro da gangorra" changed={g.turn !== D.turn} onReset={() => set({ turn: D.turn })} />
            <StepSelect wrap="max-w-[60%]" aria-label="Giro da gangorra" value={String(g.turn)} onChange={e => set({ turn: (e.target.value === "random" || e.target.value === "first" ? e.target.value : Number(e.target.value)) as MineTurn })} className="h-8 rounded-md border border-white/15 bg-[#0b110e] px-2">
              {[...MINE_TURNS, "random", "first"].map(t => <option key={t} value={t}>{TURN_LABELS[t]}</option>)}
            </StepSelect>
          </label>
        </>)}
        {group("Zonas", <>
          {check("Blocos são zonas", "Cada bloco é uma Zona: o tom, a escala, o andamento e o baixo da cena onde ele está, com a percussão sorteada para ele.", g.zones.on, on => set({ zones: { ...g.zones, on } }), D.zones.on)}
          {g.zones.on && <>
            <PatioRange label="Blocos com ritmo" min={MINE_ZONE_RHYTHM.min} max={MINE_ZONE_RHYTHM.max} step={MINE_ZONE_RHYTHM.step} value={g.zones.rhythm} display={`${g.zones.rhythm}%`}
              onChange={v => set({ zones: { ...g.zones, rhythm: v } })} changed={g.zones.rhythm !== D.zones.rhythm} onReset={() => set({ zones: { ...g.zones, rhythm: D.zones.rhythm } })}
              hint="Quantos blocos tocam um ritmo sorteado. Os outros ficam em silêncio." />
            <div className={ROW}>
              <span>Ritmos do sorteio</span>
              <RhythmPool zones={g.zones} disabled={!canEdit} onChange={zones => set({ zones })} />
            </div>
            <button type="button" disabled={!canToggle || !canEdit} onClick={() => set({ zones: { ...g.zones, seed: 1 + Math.floor(Math.random() * 0x7ffffffe) } })}
              title={canToggle ? "Sorteia de novo quais blocos tocam ritmo e qual ritmo cada um toca" : "Só o criador, o padrinho e o admin sorteiam."}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-[#0b110e] hover:border-[#ffd166] hover:text-white disabled:opacity-40"><Dices className="h-4 w-4" />Sortear</button>
          </>}
        </>)}
        {group("Spawn de itens", <ItemSpawnFields items={g.items ?? defaultMineItems()} canToggle={canToggle && canEdit} onChange={items => set({ items })} />)}
        {group("Bombas", <>
          <PatioRange label="Chance de bomba por bloco" min={MINE_BOMBS.min} max={MINE_BOMBS.max} step={MINE_BOMBS.step} value={g.bombs} display={`${g.bombs}%`}
            onChange={v => set({ bombs: v })} changed={g.bombs !== D.bombs} onReset={() => set({ bombs: D.bombs })} />
          <PatioRange label="Tempo do detonador" min={MINE_FUSE.min} max={MINE_FUSE.max} step={MINE_FUSE.step} value={g.fuse} display={`${g.fuse} s`}
            onChange={v => set({ fuse: v })} changed={g.fuse !== D.fuse} onReset={() => set({ fuse: D.fuse })} />
          <PatioRange label="Bombas de quem nasce do lado fechado" min={MINE_START_BOMBS.min} max={MINE_START_BOMBS.max} step={MINE_START_BOMBS.step} value={g.startBombs} display={`${g.startBombs}`}
            onChange={v => set({ startBombs: v })} changed={g.startBombs !== D.startBombs} onReset={() => set({ startBombs: D.startBombs })} />
        </>)}
        {group("Cores", COLOR_ROWS.map(([key, label]) => <label key={key} className={ROW}>
          <Named label={label} changed={g[key] !== D[key]} onReset={() => set({ [key]: D[key] })} />
          <input type="color" value={g[key]} onChange={e => set({ [key]: e.target.value })} onDoubleClick={() => set({ [key]: D[key] })} className="h-8 w-14 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
        </label>))}
        {admin && group("Debug", <>
          {check("Ver bombas", "Só para o admin, neste navegador: mostra a bomba de cada bloco que tem uma, dos dois lados.", debug.bombs, on => setMineDebug({ bombs: on }))}
          {check("Ver números em todos os blocos", "Só para o admin, neste navegador: mostra em todo bloco, aberto ou fechado, quantas bombas há em volta.", debug.numbers, on => setMineDebug({ numbers: on }))}
        </>)}
      </fieldset>
    </>
  )
}
