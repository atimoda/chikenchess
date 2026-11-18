"use client"

// Configurações do Pátio → Mata: each tree line of the far scenery (Mata ao longe, Mata perto) on or off, with its
// density, size, mix of crown forms (pines, round, cloud, umbrella), shape and tint. Saved with the Pátio (settings.forest, lib/pigchicken/forest.ts);
// their light still follows the sky, and Céu e luz → Mata hides both.
import { PatioRange } from "@/components/ui/patio-range"
import { FOREST_DEFAULT, FOREST_DENSITY, FOREST_LINES, FOREST_LINE_DEFAULT, FOREST_PCT, FOREST_SHAPES, FOREST_SIZE, type ForestLine, type ForestLineId, type ForestParams } from "@/lib/pigchicken/forest"

const BTN = "h-7 rounded-md border border-white/20 px-2 hover:border-[#ffd166]"
const D = FOREST_LINE_DEFAULT
type FormKey = "pines" | "round" | "cloud" | "umbrella"
const FORM_KEYS: FormKey[] = ["pines", "round", "cloud", "umbrella"]
const FORM_HINT = "Quanto desta forma entre as árvores, em proporção às outras três (o número mostra a parte dela)."

export function ForestFields({ forest, skyForest, onChange }: { forest: ForestParams | undefined; skyForest: boolean; onChange: (f: ForestParams | undefined) => void }) {
  const f = forest ?? FOREST_DEFAULT
  const line = (id: ForestLineId, label: string) => {
    const l = f[id]
    const set = (p: Partial<ForestLine>) => onChange({ ...f, [id]: { ...l, ...p } })
    const forms = l.pines + l.round + l.cloud + l.umbrella
    const range = (name: string, key: "density" | "size" | FormKey, r: { min: number; max: number; step: number }, hint: string) => (
      <PatioRange label={name} name={`${name} (${label})`} min={r.min} max={r.max} step={r.step} value={l[key]}
        display={FORM_KEYS.includes(key as FormKey) ? `${forms > 0 ? Math.round(l[key] / forms * 100) : key === "round" ? 100 : 0}%` : `${l[key]}%`}
        changed={l[key] !== D[key]} onReset={() => set({ [key]: D[key] })} onChange={v => set({ [key]: v })} hint={hint} />
    )
    return (
      <div key={id} className="grid gap-field">
        <div className="flex items-center gap-2">
          <label className="flex h-9 flex-1 items-center justify-between gap-2 rounded-md bg-[#22302a] px-3"><span>{label}</span>
            <input type="checkbox" checked={l.show} onChange={e => set({ show: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" /></label>
          <button type="button" className={BTN} disabled={!l.show} onClick={() => set({ shape: (l.shape + 1 + Math.floor(Math.random() * (FOREST_SHAPES - 1))) % FOREST_SHAPES })} title="Desenha outras árvores com os mesmos ajustes">Sortear forma</button>
        </div>
        {l.show && <>
          {range("Densidade", "density", FOREST_DENSITY, "Quantas árvores em cada trecho.")}
          {range("Tamanho", "size", FOREST_SIZE, "A altura das árvores.")}
          {range("Pinheiros", "pines", FOREST_PCT, FORM_HINT)}
          {range("Copas redondas", "round", FOREST_PCT, FORM_HINT)}
          {range("Copas em nuvem", "cloud", FOREST_PCT, `${FORM_HINT} Copa alta, contornada por muitos montinhos.`)}
          {range("Guarda-chuvas", "umbrella", FOREST_PCT, `${FORM_HINT} Copa larga e achatada, dobrada pelo vento, sobre um tronco grosso em Y.`)}
          <div className="grid grid-cols-[32px_1fr] items-center gap-1.5">
            <input type="color" aria-label={`Cor (${label})`} value={l.tint} onChange={e => set({ tint: e.target.value, tintAmount: l.tintAmount || 50 })} className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0" />
            <PatioRange label="Cor" name={`Cor (${label})`} min={FOREST_PCT.min} max={FOREST_PCT.max} step={FOREST_PCT.step} value={l.tintAmount} display={`${l.tintAmount}%`}
              changed={l.tintAmount !== D.tintAmount} onReset={() => set({ tintAmount: D.tintAmount })} onChange={tintAmount => set({ tintAmount })} hint="Quanto a cor escolhida tinge as árvores. 0: só a luz do céu." />
          </div>
        </>}
      </div>
    )
  }
  return (
    <div className="grid gap-field px-4 pb-4">
      {!skyForest && <p className="text-[#93a79a]">Escondida em Céu e luz → Mata.</p>}
      {forest && <div className="flex justify-end"><button type="button" className={BTN} onClick={() => onChange(undefined)} title="Volta à mata de sempre">Padrão</button></div>}
      {FOREST_LINES.map(o => line(o.id, o.label))}
    </div>
  )
}
