"use client"

// A chain of transformations (lib/pigchicken/transforms.ts) to edit: the items' rebate, a surface's, a zone's ambience.
import { msg, useT } from "@/lib/i18n"
import { StepSelect } from "@/components/ui/step-select"
import { cn } from "@/lib/utils"
import { CHAIN_MAX, TRANSFORMS, TRANSFORM_KINDS, newTransform, type Transform, type TransformKind } from "@/lib/pigchicken/transforms"
import { ResetArrow } from "@/components/ui/reset-arrow"

// the rebate's chain of transformations: one row per step (what, its chance, its number and its mode), in order
const GROUPS = [...new Set(TRANSFORM_KINDS.map(k => TRANSFORMS[k].group))]
const field = "h-8 rounded-md border border-white/15 bg-[#0b110e] px-1.5"
export function ChainEditor({ chain, changed, onChange, onReset, title = msg("Cadeia de transformações"), hint = msg("Cada nota rebatida por este item passa por estes passos, em ordem; cada um acontece com a sua chance") }: {
  chain: Transform[]; changed: boolean; onChange: (fn: (c: Transform[]) => void) => void; onReset?: () => void; title?: string; hint?: string
}) {
  const t = useT()
  // `empty`: the list that adds a step, a menu and not a choice, so it has no "next item" button
  const kindSelect = (value: string, onPick: (k: TransformKind) => void, label: string, empty?: string, Pick: "select" | typeof StepSelect = empty ? "select" : StepSelect) => (
    <Pick aria-label={label} value={value} onChange={e => { if (e.target.value) onPick(e.target.value as TransformKind) }} className={cn(field, "min-w-0 flex-1")}>
      {empty && <option value="">{empty}</option>}
      {GROUPS.map(g => <optgroup key={g} label={t(g)}>{TRANSFORM_KINDS.filter(k => TRANSFORMS[k].group === g).map(k => <option key={k} value={k}>{t(TRANSFORMS[k].label)}</option>)}</optgroup>)}
    </Pick>
  )
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-field">
      <span title={t(hint)}>{t(title)}</span>
      {chain.length === 0 && <span className="text-[10px] text-[#93a79a]">{t("Vazia: a nota sai como veio.")}</span>}
      {chain.map((step, i) => {
        const m = TRANSFORMS[step.kind]
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)] gap-field rounded-md border border-white/10 p-2" title={t(m.hint)}>
            <div className="flex items-center gap-1.5">
              <span className="w-4 text-right text-[#93a79a]">{i + 1}.</span>
              {kindSelect(step.kind, k => onChange(c => { c[i] = { ...newTransform(k), chance: c[i].chance } }), t("Passo {n}", { n: i + 1 }))}
              <button type="button" aria-label={t("Subir passo")} disabled={i === 0} onClick={() => onChange(c => { [c[i - 1], c[i]] = [c[i], c[i - 1]] })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary disabled:opacity-30">↑</button>
              <button type="button" aria-label={t("Descer passo")} disabled={i === chain.length - 1} onClick={() => onChange(c => { [c[i + 1], c[i]] = [c[i], c[i + 1]] })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary disabled:opacity-30">↓</button>
              <button type="button" aria-label={t("Remover passo")} onClick={() => onChange(c => { c.splice(i, 1) })} className="h-8 w-7 rounded-md border border-white/15 hover:border-primary">×</button>
            </div>
            <div className="flex flex-wrap items-center gap-field pl-5">
              <label className="flex items-center gap-1" title={t("Chance de acontecer em cada rebate")}>
                <input type="number" aria-label={t("Chance")} min={0} max={100} step={5} value={Math.round(step.chance * 100)} onChange={e => { const v = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100; onChange(c => { c[i].chance = v }) }} className={cn(field, "w-16")} />%
              </label>
              {m.n && (
                <label className="flex items-center gap-1">{t(m.n.label)}
                  <input type="number" aria-label={t(m.n.label)} min={m.n.min} max={m.n.max} step={m.n.step} value={step.n} onChange={e => { const v = Math.max(m.n!.min, Math.min(m.n!.max, Number(e.target.value) || 0)); onChange(c => { c[i].n = v }) }} className={cn(field, "w-16")} />
                </label>
              )}
              {m.modes && (
                <StepSelect aria-label={t("Modo")} value={step.mode} onChange={e => { const v = e.target.value; onChange(c => { c[i].mode = v }) }} className={cn(field, "min-w-0 flex-1")}>
                  {m.modes.map(o => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                </StepSelect>
              )}
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-1.5">
        {chain.length < CHAIN_MAX && kindSelect("", k => onChange(c => { c.push(newTransform(k)) }), t("Adicionar transformação"), t("+ adicionar…"))}
        {changed && onReset && <ResetArrow label={t(title)} onReset={onReset} />}
      </div>
    </div>
  )
}
