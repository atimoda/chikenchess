"use client"

import { useId } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { STEP_BUTTON } from "./step-select"
import { useT } from "@/lib/i18n"

const FIELD = 'h-8 w-full min-w-0 rounded border border-white/15 bg-[#0b110e] px-2 text-white'

export function PatioSelect<K extends string>({ label, name = label, options, value, onChange }: {
  label: string; name?: string; options: Record<K, string>; value: K; onChange: (value: K) => void
}) {
  const t = useT()
  const id = useId()
  const keys = Object.keys(options) as K[]
  const next = keys[(keys.indexOf(value) + 1) % keys.length]
  return <div className="grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-2">
    <label htmlFor={id}>{label}</label>
    <span className="flex min-w-0">
      <select id={id} aria-label={name} className={cn(FIELD, "rounded-r-none border-r-0")} value={value} onChange={e => onChange(e.target.value as K)}>
      {keys.map(key => <option key={key} value={key}>{options[key]}</option>)}
    </select>
    <button type="button" aria-label={t('Avançar em {name}', { name: name.toLowerCase() })} title={t('Próximo: {option}', { option: options[next] })} onClick={() => onChange(next)}
      className={cn(STEP_BUTTON, "h-8 w-8")}><ChevronDown size={16} /></button>
    </span>
  </div>
}
