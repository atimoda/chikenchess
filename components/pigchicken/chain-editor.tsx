"use client"

// A chain of transformations (lib/pigchicken/transforms.ts) to edit: the items' rebate, a surface's, a zone's ambience.
import { StepSelect } from "@/components/ui/step-select"
import { cn } from "@/lib/utils"
import { CHAIN_MAX, TRANSFORMS, TRANSFORM_KINDS, newTransform, type Transform, type TransformKind } from "@/lib/pigchicken/transforms"

// the rebate's chain of transformations: one row per step (what, its chance, its number and its mode), in order
const GROUPS = [...new Set(TRANSFORM_KINDS.map(k => TRANSFORMS[k].group))]
const field = "h-8 rounded-md border border-white/15 bg-[#0b110e] px-1.5"
export function ChainEditor({ chain, changed, onChange, onReset, title = "Cadeia de transformações", hint = "Cada nota rebatida por este item passa por estes passos, em ordem; cada um acontece com a sua chance" }: {
  chain: Transform[]; changed: boolean; onChange: (fn: (c: Transform[]) => void) => void; onReset?: () => void; title?: string; hint?: string
}) {
  // `empty`: the list that adds a step, a menu and not a choice, so it has no "next item" button
  const kindSelect = (value: string, onPick: (k: TransformKind) => void, label: string, empty?: string, Pick: "select" | typeof StepSelect = empty ? "select" : StepSelect) => (
    <Pick aria-label={label} value={value} onChange={e => { if (e.target.value) onPick(e.target.value as TransformKind) }} className={cn(field, "min-w-0 flex-1")}>
      {empty && <option value="">{empty}</option>}
      {GROUPS.map(g => <optgroup key={g} label={g}>{TRANSFORM_KINDS.filter(k => TRANSFORMS[k].group === g).map(k => <option key={k} value={k}>{TRANSFORMS[k].label}</option>)}</optgroup>)}
    </Pick>
  )
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-field">
      <span title={hint}>{title}</span>
      {chain.length === 0 && <span className="text-[10px] text-[#93a79a]">Vazia: a nota sai como veio.</span>}
      {chain.map((t, i) => {
        const m = TRANSFORMS[t.kind]
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)] gap-field rounded-md border border-white/10 p-2" title={m.hint}>
            <div className="flex items-center gap-1.5">
              <span className="w-4 text-right text-[#93a79a]">{i + 1}.</span>
              {kindSelect(t.kind, k => onChange(c => { c[i] = { ...newTransform(k), chance: c[i].chance } }), `Passo ${i + 1}`)}
              <button type="button" aria-label="Subir passo" disabled={i === 0} onClick={() => onChange(c => { [c[i - 1], c[i]] = [c[i], c[i - 1]] })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary disabled:opacity-30">↑</button>
              <button type="button" aria-label="Descer passo" disabled={i === chain.length - 1} onClick={() => onChange(c => { [c[i + 1], c[i]] = [c[i], c[i + 1]] })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary disabled:opacity-30">↓</button>
              <button type="button" aria-label="Remover passo" onClick={() => onChange(c => { c.splice(i, 1) })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary">×</button>
            </div>
            <div className="flex flex-wrap items-center gap-field pl-5">
              <label className="flex items-center gap-1" title="Chance de acontecer em cada rebate">
                <input type="number" aria-label="Chance" min={0} max={100} step={5} value={Math.round(t.chance * 100)} onChange={e => { const v = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100; onChange(c => { c[i].chance = v }) }} className={cn(field, "w-16")} />%
              </label>
              {m.n && (
                <label className="flex items-center gap-1">{m.n.label}
                  <input type="number" aria-label={m.n.label} min={m.n.min} max={m.n.max} step={m.n.step} value={t.n} onChange={e => { const v = Math.max(m.n!.min, Math.min(m.n!.max, Number(e.target.value) || 0)); onChange(c => { c[i].n = v }) }} className={cn(field, "w-16")} />
                </label>
              )}
              {m.modes && (
                <StepSelect aria-label="Modo" value={t.mode} onChange={e => { const v = e.target.value; onChange(c => { c[i].mode = v }) }} className={cn(field, "min-w-0 flex-1")}>
                  {m.modes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </StepSelect>
              )}
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-1.5">
        {chain.length < CHAIN_MAX && kindSelect("", k => onChange(c => { c.push(newTransform(k)) }), "Adicionar transformação", "+ adicionar…")}
        {changed && onReset && <button type="button" title="Volta a cadeia do código" onClick={onReset} className="h-8 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>}
      </div>
    </div>
  )
}
