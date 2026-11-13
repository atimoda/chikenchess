"use client"

// The new Pátio generator: Empty (only the entry portal) or Basic biome (random nature, with the density from
// desmatado to a dense forest). Used by Playgrounds and by a portal's Destino (lib/pigchicken/patio-generator.ts).
import { useState } from "react"
import { PatioRange } from "@/components/ui/patio-range"
import { cn } from "@/lib/utils"
import { BIOME_DENSITY, type PatioRecipe } from "@/lib/pigchicken/patio-generator"

const choice = "h-9 flex-1 rounded-md border px-2 hover:border-[#ffd166]"
const densityText = (v: number) => (v <= 15 ? "Desmatado" : v >= 85 ? "Floresta" : `${v}%`)

export function NewPatioGenerator({ onCreate, busy, action = "Criar", withName = false }: {
  onCreate: (recipe: PatioRecipe, name: string) => void
  busy?: boolean
  action?: string
  // a name field (a named Pátio is kept for good)
  withName?: boolean
}) {
  const [kind, setKind] = useState<PatioRecipe["kind"]>("biome")
  const [density, setDensity] = useState<number>(BIOME_DENSITY.default)
  const [name, setName] = useState("")
  return (
    <div className="grid gap-2">
      <div role="radiogroup" aria-label="Tipo de Pátio novo" className="flex gap-2">
        {([["empty", "Empty"], ["biome", "Basic biome"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={cn(choice, kind === k ? "border-[#ffd166] bg-[#ffd166]/15 text-white" : "border-white/15 text-[#b9c7b9]")}>{label}</button>
        ))}
      </div>
      {kind === "biome" && <PatioRange label="Densidade" min={BIOME_DENSITY.min} max={BIOME_DENSITY.max} step={BIOME_DENSITY.step} value={density}
        display={densityText(density)} onChange={setDensity} />}
      {withName && <input aria-label="Nome do Pátio novo" placeholder="Nome (opcional)" maxLength={60} value={name} onChange={e => setName(e.target.value)}
        className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2" />}
      <button type="button" disabled={busy} onClick={() => onCreate(kind === "empty" ? { kind } : { kind, density }, name)}
        className="h-9 rounded-md border border-[#ffd166] bg-[#ffd166] px-3 font-bold text-[#05060c] disabled:opacity-50">{busy ? "Criando…" : action}</button>
    </div>
  )
}
