"use client"

// The fields of the Grade de blocos' panel (components/pigchicken/mine-grid-panel.tsx; lib/pigchicken/mine-grid.ts).
// Turning the grid on or off belongs to the Pátio's creator and godparent (and the admin); "Resetar grade" also to
// the room's owner; the other settings to whoever may edit the Pátio (everyone else sees them, dimmed).
import { useState, useSyncExternalStore } from "react"
import { ChevronDown, Dices, RotateCcw } from "lucide-react"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { PatioRange } from "@/components/ui/patio-range"
import { StepSelect } from "@/components/ui/step-select"
import { MINE_BOMBS, MINE_CELL, MINE_COLORS, MINE_CORNER, MINE_DAMAGE, MINE_FUSE, MINE_GAP, MINE_NOTES, MINE_START_BOMBS, MINE_TURNS, MINE_WALL_OPACITY, defaultMineGrid, type MineGridParams, type MineTurn } from "@/lib/pigchicken/mine-grid"
import { mineStore, setMineDebug } from "@/lib/pigchicken/mine-grid-store"
import { patioIsAdmin } from "@/lib/pigchicken/edit-access"
import { MINE_ZONE_RHYTHM, mineZoneHas, mineZonePoolLabel, toggleMineZoneBeat, type MineZoneParams } from "@/lib/pigchicken/mine-zone-params"
import { BEATS, BEAT_GROUPS } from "@/lib/pigchicken/beats"

const ROW = "flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3"
// the seesaw's turn: where the blue grows from (the red comes from the other side)
const TURN_LABELS: Record<string, string> = {
  0: "Azul de baixo", 45: "Azul do canto de baixo, à esquerda", 90: "Azul da esquerda", 135: "Azul do canto de cima, à esquerda",
  180: "Azul de cima", 225: "Azul do canto de cima, à direita", 270: "Azul da direita", 315: "Azul do canto de baixo, à direita",
  random: "Aleatório", first: "Primeiro tiro determina o lado",
}
const COLOR_ROWS = [["grey", "Cor neutra"], ["blue", "Cor da música"], ["red", "Cor do dano"]] as const
const MENU_ITEM = "cursor-pointer font-mono text-xs text-white focus:bg-white/10 focus:text-white"

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

export function MineGridFields({ grid, canEdit, canToggle, onChange, onReset }: {
  grid: MineGridParams | undefined; canEdit: boolean; canToggle: boolean
  onChange: (grid: MineGridParams) => void; onReset?: () => void
}) {
  const g = grid ?? defaultMineGrid()
  const set = (p: Partial<MineGridParams>) => onChange({ ...g, ...p })
  // the admin's debug: this browser's alone, gone with the page
  const debug = useSyncExternalStore(mineStore.subscribe, () => mineStore.debug, () => mineStore.debug)
  const admin = patioIsAdmin()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const group = (title: string, children: React.ReactNode) => (
    <PatioDisclosure title={title} open={!!open[title]} onToggle={v => setOpen(o => ({ ...o, [title]: v }))}>{open[title] && <div className="grid gap-field px-4 pb-4">{children}</div>}</PatioDisclosure>
  )
  const check = (label: string, title: string, checked: boolean, onCheck: (on: boolean) => void) => (
    <label className={ROW} title={title}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
    </label>
  )
  return (
    <>
      <div className="grid gap-field border-b border-white/10 px-4 pb-4">
        <label className={ROW} title={canToggle ? "Cobre o Pátio com blocos fechados, do chão ao teto. Cada bloco pode esconder uma bomba, e os abertos mostram quantas há em volta." : "Só o criador ou o padrinho deste Pátio ligam e desligam a grade."}>
          <span>Grade ligada</span>
          <input type="checkbox" checked={g.on} disabled={!canToggle || !canEdit} onChange={e => set({ on: e.target.checked })} className="h-5 w-5 accent-[var(--primary)] disabled:opacity-40" />
        </label>
        {g.on && onReset && <button type="button" onClick={onReset} title="Fecha todos os blocos e sorteia as bombas de novo" className="flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-[#0b110e] hover:border-[#ffd166] hover:text-white"><RotateCcw className="h-4 w-4" />Resetar grade</button>}
      </div>
      {/* the settings can be prepared with the grid still off */}
      <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60 [&:disabled_input]:cursor-default">
        {group("Blocos", <>
          <PatioRange label="Tamanho do bloco" min={MINE_CELL.min} max={MINE_CELL.max} step={MINE_CELL.step} value={g.cell} display={`${g.cell} u`}
            onChange={v => set({ cell: v })} onReset={() => set({ cell: MINE_CELL.default })} />
          <PatioRange label="Vão entre blocos" min={MINE_GAP.min} max={MINE_GAP.max} step={MINE_GAP.step} value={g.gap} display={g.gap ? `${g.gap} u` : "sem vão"}
            onChange={v => set({ gap: v })} onReset={() => set({ gap: MINE_GAP.default })}
            hint="Com vão, cada bloco fechado é uma sala com quatro paredes e dá para andar entre os blocos. Sem vão, os blocos encostam e só há parede entre um bloco fechado e um aberto." />
          <PatioRange label="Cantos em octógono" min={MINE_CORNER.min} max={MINE_CORNER.max} step={MINE_CORNER.step} value={g.corner} display={g.corner ? `${g.corner}%` : "quadrado"}
            onChange={v => set({ corner: v })} onReset={() => set({ corner: MINE_CORNER.default })}
            hint="Corta os quatro cantos de cada bloco. Em 100% o bloco é um octógono de lados iguais. O que sai do canto vira espaço entre os blocos." />
          {check("Bloqueia passagem", "As paredes dos blocos fechados barram os bonecos. Desligado, a grade é só desenho.", g.pass, on => set({ pass: on }))}
          <PatioRange label="Opacidade das paredes" min={MINE_WALL_OPACITY.min} max={MINE_WALL_OPACITY.max} step={MINE_WALL_OPACITY.step} value={g.wallOpacity} display={`${g.wallOpacity}%`}
            onChange={v => set({ wallOpacity: v })} onReset={() => set({ wallOpacity: MINE_WALL_OPACITY.default })}
            hint="O quanto os blocos fechados cobrem o que está atrás e dentro deles. Abaixo de 100% dá para ver quem está do outro lado. A gangorra, a bandeira e a interrogação não mudam." />
        </>)}
        {group("Música e dano", <>
          {check("Notas quicam nas paredes", "Ligado, as notas quicam nas paredes dos blocos fechados. Desligado, elas atravessam e contam ao entrar no bloco.", g.blockNotes, on => set({ blockNotes: on }))}
          <PatioRange label="Notas até a bandeira" min={MINE_NOTES.min} max={MINE_NOTES.max} step={MINE_NOTES.step} value={g.toFlag} display={`${g.toFlag}`}
            onChange={v => set({ toFlag: v })} onReset={() => set({ toFlag: MINE_NOTES.default })} hint="Notas do lado aberto que levam um bloco do cinza até a bandeira." />
          <PatioRange label="Notas até a dúvida" min={MINE_NOTES.min} max={MINE_NOTES.max} step={MINE_NOTES.step} value={g.toDoubt} display={`${g.toDoubt}`}
            onChange={v => set({ toDoubt: v })} onReset={() => set({ toDoubt: MINE_NOTES.default })} hint="Notas em cima de uma bandeira até ela virar interrogação." />
          <PatioRange label="Dano até liberar o bloco" min={MINE_DAMAGE.min} max={MINE_DAMAGE.max} step={MINE_DAMAGE.step} value={g.toOpen} display={g.toOpen ? `${g.toOpen}` : "não quebra"}
            onChange={v => set({ toOpen: v })} onReset={() => set({ toOpen: MINE_DAMAGE.default })} hint="Dano de armas de fogo que leva um bloco do cinza até abrir." />
          {check("Lado de dentro quebra paredes", "Ligado, os tiros, as explosões e os golpes de quem está do lado fechado também contam como dano nos blocos. Desligado, só o lado aberto quebra.", g.insideBreaks, on => set({ insideBreaks: on }))}
          <label className={ROW}>
            <span>Giro da gangorra</span>
            <StepSelect wrap="max-w-[60%]" aria-label="Giro da gangorra" value={String(g.turn)} onChange={e => set({ turn: (e.target.value === "random" || e.target.value === "first" ? e.target.value : Number(e.target.value)) as MineTurn })} className="h-8 rounded-md border border-white/15 bg-[#0b110e] px-2">
              {[...MINE_TURNS, "random", "first"].map(t => <option key={t} value={t}>{TURN_LABELS[t]}</option>)}
            </StepSelect>
          </label>
        </>)}
        {group("Zonas sonoras", <>
          {check("Blocos são zonas sonoras", "Cada bloco toca como uma Zona sonora: o tom, a escala, o andamento e o baixo da cena onde ele está, com a percussão sorteada para ele.", g.zones.on, on => set({ zones: { ...g.zones, on } }))}
          {g.zones.on && <>
            <PatioRange label="Blocos com ritmo" min={MINE_ZONE_RHYTHM.min} max={MINE_ZONE_RHYTHM.max} step={MINE_ZONE_RHYTHM.step} value={g.zones.rhythm} display={`${g.zones.rhythm}%`}
              onChange={v => set({ zones: { ...g.zones, rhythm: v } })} onReset={() => set({ zones: { ...g.zones, rhythm: MINE_ZONE_RHYTHM.default } })}
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
        {group("Bombas", <>
          <PatioRange label="Chance de bomba por bloco" min={MINE_BOMBS.min} max={MINE_BOMBS.max} step={MINE_BOMBS.step} value={g.bombs} display={`${g.bombs}%`}
            onChange={v => set({ bombs: v })} onReset={() => set({ bombs: MINE_BOMBS.default })} />
          <PatioRange label="Tempo do detonador" min={MINE_FUSE.min} max={MINE_FUSE.max} step={MINE_FUSE.step} value={g.fuse} display={`${g.fuse} s`}
            onChange={v => set({ fuse: v })} onReset={() => set({ fuse: MINE_FUSE.default })} />
          <PatioRange label="Bombas de quem nasce do lado fechado" min={MINE_START_BOMBS.min} max={MINE_START_BOMBS.max} step={MINE_START_BOMBS.step} value={g.startBombs} display={`${g.startBombs}`}
            onChange={v => set({ startBombs: v })} onReset={() => set({ startBombs: MINE_START_BOMBS.default })} />
        </>)}
        {group("Cores", COLOR_ROWS.map(([key, label]) => <label key={key} className={ROW}>
          <span>{label}</span>
          <input type="color" value={g[key]} onChange={e => set({ [key]: e.target.value })} onDoubleClick={() => set({ [key]: MINE_COLORS[key] })} className="h-8 w-14 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
        </label>))}
        {admin && group("Debug", <>
          {check("Ver bombas", "Só para o admin, neste navegador: mostra a bomba de cada bloco que tem uma, dos dois lados.", debug.bombs, on => setMineDebug({ bombs: on }))}
          {check("Ver números em todos os blocos", "Só para o admin, neste navegador: mostra em todo bloco, aberto ou fechado, quantas bombas há em volta.", debug.numbers, on => setMineDebug({ numbers: on }))}
        </>)}
      </fieldset>
    </>
  )
}
