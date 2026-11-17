"use client"

// A portal's Destino in the editor mode's Edit panel: the other portal of its pair, or another Pátio, picked from
// the Pátios this player sees in Playgrounds or made new by the generator (lib/pigchicken/portal-links.ts).
import { StepSelect } from "@/components/ui/step-select"
import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ElementParams, LayoutElement } from "@/lib/pigchicken/layout"
import { lobbyFromUrl, localPatios } from "@/lib/pigchicken/patio-store"
import { listFeaturedPatios, listPatioLobbies, patioErrorMessage, patioOnlineAvailable } from "@/lib/pigchicken/patio-online"
import { checkPatioTarget, createPatioForPortal, DEFAULT_PATIO_TARGET, type PatioTargetStatus } from "@/lib/pigchicken/portal-links"
import { NewPatioGenerator } from "./new-patio-generator"

type Option = { id: string; name: string; label: string }
const field = "h-9 rounded-md border border-white/15 bg-[#0b110e] px-2"

// the Pátios to pick: the default one, the server's (mine, favourites, featured) and the ones only in this browser
async function patioOptions(signedIn: boolean): Promise<{ options: Option[]; error: string }> {
  const out: Option[] = [{ id: DEFAULT_PATIO_TARGET, name: "Pátio padrão", label: "Pátio padrão" }]
  const seen = new Set<string>([DEFAULT_PATIO_TARGET])
  const push = (id: string, name: string, by: string) => { if (!seen.has(id)) { seen.add(id); out.push({ id, name, label: by ? `${name} · ${by}` : name }) } }
  let error = ""
  if (patioOnlineAvailable()) {
    try {
      const rows = signedIn ? await listPatioLobbies(false) : await listFeaturedPatios()
      for (const r of rows) if (!r.isDefault) push(r.id, r.name ?? "Lobby não salvo", r.creatorName ? `de ${r.creatorName}` : "")
    } catch (e) { error = patioErrorMessage(e) }
  }
  for (const r of localPatios()) if (r.id) push(r.id, r.name ?? "Pátio sem nome", "neste navegador")
  return { options: out, error }
}

export function PortalTargetFields({ el, hasPartner, me, signedIn, onChange }: {
  el: LayoutElement
  hasPartner: boolean
  // who creates a new Pátio here (the account, or this browser)
  me: string
  signedIn: boolean
  onChange: (params: ElementParams, step?: string) => void
}) {
  const target = el.params.portalTarget
  const toPatio = target !== undefined
  const [options, setOptions] = useState<Option[] | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [status, setStatus] = useState<PatioTargetStatus | null>(null)
  const [making, setMaking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!toPatio) return
    let alive = true
    void patioOptions(signedIn).then(r => { if (alive) { setOptions(r.options); setError(r.error) } })
    return () => { alive = false }
  }, [toPatio, signedIn, tick])
  useEffect(() => {
    setStatus(null)
    if (!target) return
    let alive = true
    void checkPatioTarget(target).then(s => { if (alive) setStatus(s) })
    return () => { alive = false }
  }, [target])

  const here = lobbyFromUrl() ?? DEFAULT_PATIO_TARGET
  const list = (options ?? []).filter(o => o.id !== here)
  if (target && !list.some(o => o.id === target)) { const name = el.params.portalTargetName ?? "Pátio escolhido"; list.unshift({ id: target, name, label: name }) }
  const choose = (id: string) => {
    onChange({ portalTarget: id, portalTargetName: list.find(o => o.id === id)?.name })
  }
  const create = async (recipe: Parameters<typeof createPatioForPortal>[0], name: string) => {
    setBusy(true)
    setNotice("")
    try {
      const made = await createPatioForPortal(recipe, me, name)
      onChange({ portalTarget: made.id, portalTargetName: made.name ?? (name.trim() || "Pátio novo") })
      if (!made.saved) setNotice("O Pátio novo ficou só neste navegador: entre na sua conta para os outros players chegarem nele.")
      setMaking(false)
      setTick(t => t + 1)
    } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-2">
      {hasPartner && (
        <label className="grid gap-1">
          <span>Destino</span>
          <StepSelect aria-label="Destino do portal" value={toPatio ? "patio" : "pair"} className={field}
            onChange={e => onChange(e.target.value === "patio" ? { portalTarget: "" } : { portalTarget: undefined, portalTargetName: undefined })}>
            <option value="pair">O outro portal do par</option>
            <option value="patio">Outro Pátio</option>
          </StepSelect>
        </label>
      )}
      {toPatio && <>
        <label className="grid gap-1">
          <span>{hasPartner ? "Pátio" : "Destino"}</span>
          <StepSelect aria-label="Pátio de destino" value={target} onChange={e => choose(e.target.value)} className={field} disabled={options === null}>
            <option value="" data-skip>{options === null ? "Carregando…" : "Escolha um Pátio"}</option>
            {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </StepSelect>
        </label>
        {status === "missing" && <p role="alert" className="text-[#ff8a7a]">Este pátio não existe mais. Escolha outro destino ou crie um Pátio novo.</p>}
        <button type="button" aria-expanded={making} onClick={() => setMaking(v => !v)}
          className={cn("flex h-9 items-center gap-1.5 rounded-md border px-2 text-[#ffd166]", making ? "border-[#ffd166]" : "border-[#ffd166]/50 hover:border-[#ffd166]")}>
          <Plus className="h-4 w-4" /> Pátio novo
        </button>
        {making && <NewPatioGenerator withName={signedIn} action="Criar e ligar" busy={busy} onCreate={(recipe, name) => void create(recipe, name)} />}
        {(notice || error) && <p className="text-[#ffd166]">{notice || error}</p>}
      </>}
    </div>
  )
}
