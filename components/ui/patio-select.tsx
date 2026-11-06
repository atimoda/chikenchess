"use client"

import { useId } from "react"
import { ChevronRight } from "lucide-react"

const FIELD = 'h-8 w-full min-w-0 rounded border border-white/15 bg-[#0b110e] px-2 text-white'

export function PatioSelect<K extends string>({ label, name = label, options, value, onChange }: {
  label: string; name?: string; options: Record<K, string>; value: K; onChange: (value: K) => void
}) {
  const id = useId()
  const keys = Object.keys(options) as K[]
  const next = keys[(keys.indexOf(value) + 1) % keys.length]
  return <div className="grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)_2rem] items-center gap-2">
    <label htmlFor={id}>{label}</label>
    <select id={id} aria-label={name} className={FIELD} value={value} onChange={e => onChange(e.target.value as K)}>
      {keys.map(key => <option key={key} value={key}>{options[key]}</option>)}
    </select>
    <button type="button" aria-label={`Avançar em ${name.toLowerCase()}`} title={`Próximo: ${options[next]}`} onClick={() => onChange(next)}
      className="inline-flex h-8 items-center justify-center rounded border border-white/15 text-white hover:border-primary"><ChevronRight size={16} /></button>
  </div>
}
