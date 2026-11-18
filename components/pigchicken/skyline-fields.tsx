"use client"

// Configurações do Pátio → Prédios: up to four rows of buildings far behind, each from a model (Cidade, Skyline flat,
// Torres de código, Data-center) and then every setting of its own: where it stands, the buildings' shape, the
// facade and the colours. Saved with the Pátio (settings.skyline, lib/pigchicken/skyline.ts); their light follows
// the sky at their depth.
import { Trash2 } from "lucide-react"
import { PatioRange } from "@/components/ui/patio-range"
import { PatioSelect } from "@/components/ui/patio-select"
import { SKYLINE_FACADES, SKYLINE_MAX_ROWS, SKYLINE_NUMS, SKYLINE_PRESETS, SKYLINE_PRESET_LABELS, SKYLINE_SHAPES, skylinePresetOf, skylineRowFrom, type SkylineFacade, type SkylineNum, type SkylineParams, type SkylinePreset, type SkylineRow } from "@/lib/pigchicken/skyline"

const BTN = "h-7 shrink-0 whitespace-nowrap rounded-md border border-white/20 px-2 hover:border-[#ffd166]"
const FIELD = "h-8 w-full rounded-md border border-white/15 bg-[#22302a] px-2 text-white"
const COLOR = "h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0"
const HEAD = "pt-1 text-[10px] uppercase tracking-wider text-[#93a79a]"

const PLACE: SkylineNum[] = ["depth", "lift", "haze"]
const SHAPE: SkylineNum[] = ["height", "heightVar", "width", "widthVar", "density", "gap", "cluster", "setback", "annex", "side", "roof", "antenna"]
const FACE: SkylineNum[] = ["windowSize", "windowGap", "contrast"]

export function SkylineFields({ skyline, onChange }: { skyline: SkylineParams | undefined; onChange: (s: SkylineParams | undefined) => void }) {
  const rows = skyline?.rows ?? []
  const setRows = (next: SkylineRow[]) => onChange(next.length ? { rows: next } : undefined)
  const add = (preset: SkylinePreset) => setRows([...rows, skylineRowFrom(preset, rows.length * 7)])
  const row = (r: SkylineRow, i: number) => {
    const set = (p: Partial<SkylineRow>) => setRows(rows.map((o, k) => k === i ? { ...o, ...p } : o))
    const preset = skylinePresetOf(r)
    // the model's own value is the slider's reset
    const base = SKYLINE_PRESETS[r.model]
    const range = (k: SkylineNum) => {
      const [min, max, step, label, hint] = SKYLINE_NUMS[k]
      return <PatioRange key={k} label={label} name={`${label} (fileira ${i + 1})`} min={min} max={max} step={step} value={r[k]} display={`${r[k]}%`}
        changed={r[k] !== base[k]} onReset={() => set({ [k]: base[k] })} onChange={v => set({ [k]: v })} hint={hint} />
    }
    const colored = (k: "wallAmount" | "faceAmount", c: "wall" | "face", label: string) => (
      <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
        <input type="color" aria-label={`${label} (fileira ${i + 1})`} value={r[c]} onChange={e => set({ [c]: e.target.value, [k]: r[k] || 50 })} className={COLOR} />
        {range(k)}
      </div>
    )
    const models = { ...(preset ? {} : { custom: "Personalizado" }), ...SKYLINE_PRESET_LABELS } as Record<SkylinePreset | "custom", string>
    return (
      <div key={i} className="grid gap-field border-t border-white/10 pt-2">
        <div className="flex items-center gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3"><span className="whitespace-nowrap">Fileira {i + 1}</span>
            <input type="checkbox" checked={r.show} onChange={e => set({ show: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
          <button type="button" className={BTN} disabled={!r.show} onClick={() => set({ shape: (r.shape + 1 + Math.floor(Math.random() * (SKYLINE_SHAPES - 1))) % SKYLINE_SHAPES })} title="Desenha outros prédios com os mesmos ajustes">Sortear forma</button>
          <button type="button" aria-label={`Remover fileira ${i + 1}`} className={BTN} onClick={() => setRows(rows.filter((_, k) => k !== i))} title="Tira esta fileira do Pátio"><Trash2 className="h-4 w-4" /></button>
        </div>
        {r.show && <>
          <PatioSelect label="Modelo" name={`Modelo (fileira ${i + 1})`} options={models} value={preset ?? "custom"}
            onChange={m => { if (m !== "custom") set({ ...SKYLINE_PRESETS[m], model: m }) }} />
          <p className={HEAD}>Lugar</p>
          {PLACE.map(range)}
          <p className={HEAD}>Forma</p>
          {SHAPE.map(range)}
          <p className={HEAD}>Fachada</p>
          <PatioSelect label="Padrão" name={`Padrão da fachada (fileira ${i + 1})`} options={SKYLINE_FACADES} value={r.facade} onChange={(facade: SkylineFacade) => set({ facade })} />
          {FACE.map(range)}
          <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
            <input type="color" aria-label={`Cor das luzes (fileira ${i + 1})`} value={r.light} onChange={e => set({ light: e.target.value, lit: r.lit || 30 })} className={COLOR} />
            {range("lit")}
          </div>
          <p className={HEAD}>Cores</p>
          {colored("wallAmount", "wall", "Cor")}
          {colored("faceAmount", "face", "Cor da fachada")}
        </>}
      </div>
    )
  }
  return (
    <div className="grid gap-field px-4 pb-4">
      {rows.map(row)}
      {rows.length < SKYLINE_MAX_ROWS && (
        <select aria-label="Adicionar fileira de prédios" className={FIELD} value="" onChange={e => { if (e.target.value) add(e.target.value as SkylinePreset) }}>
          <option value="">{rows.length ? "Adicionar outra fileira…" : "Adicionar fileira…"}</option>
          {(Object.keys(SKYLINE_PRESET_LABELS) as SkylinePreset[]).map(k => <option key={k} value={k}>{SKYLINE_PRESET_LABELS[k]}</option>)}
        </select>
      )}
    </div>
  )
}
