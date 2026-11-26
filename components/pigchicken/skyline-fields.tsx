"use client"

// Configurações do Pátio → Prédios: up to four rows of buildings far behind, each from a model (Cidade, Skyline flat,
// Torres de código, Data-center) and then every setting of its own: where it stands, the buildings' shape, the
// facade and the colours. Saved with the Pátio (settings.skyline, lib/pigchicken/skyline.ts); their light follows
// the sky at their depth.
import { Trash2 } from "lucide-react"
import { PatioRange } from "@/components/ui/patio-range"
import { PatioSelect } from "@/components/ui/patio-select"
import { SKYLINE_FACADES, SKYLINE_MAX_ROWS, SKYLINE_NUMS, SKYLINE_PRESETS, SKYLINE_PRESET_LABELS, SKYLINE_SHAPES, skylinePresetOf, skylineRowFrom, skylineSlotOf, skylineSlots, type SkylineFacade, type SkylineNum, type SkylineParams, type SkylinePreset, type SkylineRow } from "@/lib/pigchicken/skyline"
import { useT, msg } from "@/lib/i18n"
import { trRecord } from "@/lib/pigchicken/tr-options"

const BTN = "h-7 shrink-0 whitespace-nowrap rounded-md border border-white/20 px-2 hover:border-[#ffd166]"
const FIELD = "h-8 w-full rounded-md border border-white/15 bg-[#22302a] px-2 text-white"
const COLOR = "h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0"
const HEAD = "pt-1 text-[10px] uppercase tracking-wider text-[#93a79a]"

const PLACE: SkylineNum[] = ["depth", "lift", "haze"]
const ON_LAYER = "on"
const SHAPE: SkylineNum[] = ["height", "heightVar", "width", "widthVar", "density", "gap", "cluster", "setback", "annex", "side", "roof", "antenna"]
const FACE: SkylineNum[] = ["windowSize", "windowGap", "contrast"]

// layers: the other layers of this Pátio's backdrop (its ranges and tree lines), for Posição
export function SkylineFields({ skyline, layers, onChange }: { skyline: SkylineParams | undefined; layers: { label: string; depth: number }[]; onChange: (s: SkylineParams | undefined) => void }) {
  const t = useT()
  const rows = skyline?.rows ?? []
  const slots = skylineSlots(layers)
  const setRows = (next: SkylineRow[]) => onChange(next.length ? { rows: next } : undefined)
  const add = (preset: SkylinePreset) => setRows([...rows, skylineRowFrom(preset, rows.length * 7)])
  const row = (r: SkylineRow, i: number) => {
    const set = (p: Partial<SkylineRow>) => setRows(rows.map((o, k) => k === i ? { ...o, ...p } : o))
    const preset = skylinePresetOf(r)
    // the model's own value is the slider's reset
    const base = SKYLINE_PRESETS[r.model]
    const range = (k: SkylineNum) => {
      const [min, max, step, label, hint] = SKYLINE_NUMS[k]
      return <PatioRange key={k} label={t(label)} name={t("{label} (fileira {v})", { label: t(label), v: i + 1 })} min={min} max={max} step={step} value={r[k]} display={`${r[k]}%`}
        changed={r[k] !== base[k]} onReset={() => set({ [k]: base[k] })} onChange={v => set({ [k]: v })} hint={t(hint)} />
    }
    const colored = (k: "wallAmount" | "faceAmount", c: "wall" | "face", label: string) => (
      <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
        <input type="color" aria-label={t("{label} (fileira {v})", { label: t(label), v: i + 1 })} value={r[c]} onChange={e => set({ [c]: e.target.value, [k]: r[k] || 50 })} className={COLOR} />
        {range(k)}
      </div>
    )
    const models = { ...(preset ? {} : { custom: msg("Personalizado") }), ...SKYLINE_PRESET_LABELS } as Record<SkylinePreset | "custom", string>
    return (
      <div key={i} className="grid gap-field border-t border-white/10 pt-2">
        <div className="flex items-center gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3"><span className="whitespace-nowrap">{t("Fileira")} {i + 1}</span>
            <input type="checkbox" checked={r.show} onChange={e => set({ show: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
          <button type="button" className={BTN} disabled={!r.show} onClick={() => set({ shape: (r.shape + 1 + Math.floor(Math.random() * (SKYLINE_SHAPES - 1))) % SKYLINE_SHAPES })} title={t("Desenha outros prédios com os mesmos ajustes")}>{t("Sortear forma")}</button>
          <button type="button" aria-label={t("Remover fileira {v}", { v: i + 1 })} className={BTN} onClick={() => setRows(rows.filter((_, k) => k !== i))} title={t("Tira esta fileira do Pátio")}><Trash2 className="h-4 w-4" /></button>
        </div>
        {r.show && <>
          <PatioSelect label={t("Modelo")} name={t("Modelo (fileira {v})", { v: i + 1 })} options={trRecord(models)} value={preset ?? "custom"}
            onChange={m => { if (m !== "custom") set({ ...SKYLINE_PRESETS[m], model: m }) }} />
          <p className={HEAD}>{t("Lugar")}</p>
          {slots.length > 1 && (() => {
            // Posição: which gap between the mountains and the tree lines; it moves Profundidade to the gap's middle
            const at = skylineSlotOf(slots, r.depth)
            const options = { ...(at ? {} : { [ON_LAYER]: t("Profundidade {v}%", { v: r.depth }) }), ...Object.fromEntries(slots.map(s => [s.id, s.label])) } as Record<string, string>
            return <PatioSelect label={t("Posição")} name={t("Posição (fileira {v})", { v: i + 1 })} options={options} value={at?.id ?? ON_LAYER}
              onChange={id => { const s = slots.find(o => o.id === id); if (s) set({ depth: s.depth }) }} />
          })()}
          {PLACE.map(range)}
          <p className={HEAD}>{t("Forma")}</p>
          {SHAPE.map(range)}
          <p className={HEAD}>{t("Fachada")}</p>
          <PatioSelect label={t("Padrão")} name={t("Padrão da fachada (fileira {v})", { v: i + 1 })} options={trRecord(SKYLINE_FACADES)} value={r.facade} onChange={(facade: SkylineFacade) => set({ facade })} />
          {FACE.map(range)}
          <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
            <input type="color" aria-label={t("Cor das luzes (fileira {v})", { v: i + 1 })} value={r.light} onChange={e => set({ light: e.target.value, lit: r.lit || 30 })} className={COLOR} />
            {range("lit")}
          </div>
          <p className={HEAD}>{t("Cores")}</p>
          {colored("wallAmount", "wall", msg("Cor"))}
          {colored("faceAmount", "face", msg("Cor da fachada"))}
        </>}
      </div>
    )
  }
  return (
    <div className="grid gap-field px-4 pb-4">
      {rows.map(row)}
      {rows.length < SKYLINE_MAX_ROWS && (
        <select aria-label={t("Adicionar fileira de prédios")} className={FIELD} value="" onChange={e => { if (e.target.value) add(e.target.value as SkylinePreset) }}>
          <option value="">{rows.length ? t("Adicionar outra fileira…") : t("Adicionar fileira…")}</option>
          {(Object.keys(SKYLINE_PRESET_LABELS) as SkylinePreset[]).map(k => <option key={k} value={k}>{t(SKYLINE_PRESET_LABELS[k])}</option>)}
        </select>
      )}
    </div>
  )
}
