"use client"

// Pátio da Galinha: the game's playground where the player chicken is tuned. The panel edits a draft of
// the central configuration (lib/chicken/config.ts) that the chicken here follows live; "Salvar padrão"
// (admin account only) saves it for every screen that draws the chicken.
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Gamepad2, SlidersHorizontal, X } from "lucide-react"
import { useOnline } from "@/components/online/online-provider"
import { isAdminUser } from "@/lib/admin/access"
import {
  defaultChickenConfig, getSavedChickenConfig, normalizeChickenConfig, refreshChickenConfig, sameChickenConfig, saveChickenConfig,
  setChickenConfigPreview, subscribeChickenConfig, type ChickenConfig, type SavedChickenConfig,
} from "@/lib/chicken/config"
import { CHICKEN_PARAM_GROUPS, CHICKEN_PARAM_META, CHICKEN_SOUND_TYPES, type ChickenParamKey, type ChickenParamMeta } from "@/lib/chicken/param-meta"
import { LOOK_ART, type ChickenSlot } from "@/lib/chicken/look-art"
import { ChickenControlsPanel } from "./chicken-controls-panel"
import { ChickenGround, ChickenLayer } from "./chicken-layer"
import { cn } from "@/lib/utils"

const DRAFT = "chickenchess:chicken-patio-draft:v1"

// floating boxes to jump on, climb and drop through (percent of the stage)
const PLATFORMS = [
  { left: 8, bottom: 22, width: 18, height: 5 },
  { left: 32, bottom: 38, width: 14, height: 5 },
  { left: 54, bottom: 26, width: 10, height: 22 },
  { left: 70, bottom: 48, width: 16, height: 5 },
  { left: 14, bottom: 58, width: 12, height: 5 },
]

function readDraft(): ChickenConfig | null {
  try {
    const raw = window.localStorage.getItem(DRAFT)
    return raw ? normalizeChickenConfig(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
function writeDraft(next: ChickenConfig | null) {
  try {
    if (next) window.localStorage.setItem(DRAFT, JSON.stringify(next))
    else window.localStorage.removeItem(DRAFT)
  } catch { /* storage unavailable */ }
}

const fmt = (v: number, step: number) => (step >= 1 ? String(Math.round(v)) : v.toFixed(Math.min(3, String(step).split(".")[1]?.length ?? 2)))

export function ChickenPatio() {
  const online = useOnline()
  const isAdmin = isAdminUser(online.user)
  // same first render on the server and in the browser; the cached and saved versions come in the effect
  const [saved, setSaved] = useState<SavedChickenConfig>(() => ({ config: defaultChickenConfig(), revision: 0, updatedAt: null }))
  const [draft, setDraft] = useState<ChickenConfig>(defaultChickenConfig)
  const [panelOpen, setPanelOpen] = useState(true)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [status, setStatus] = useState<{ kind: "info" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Visual: true, Movimento: true })

  // start from this browser's unsaved draft, if any, and fetch the latest saved version
  useEffect(() => {
    const local = readDraft()
    const cached = getSavedChickenConfig()
    setSaved(cached)
    setDraft(local ?? cached.config)
    void refreshChickenConfig(true).then(next => {
      setSaved(next)
      if (!local) setDraft(next.config)
    })
    return subscribeChickenConfig(() => setSaved(getSavedChickenConfig()))
  }, [])

  // the chickens on screen follow the draft while the pátio is open
  useEffect(() => { setChickenConfigPreview(draft) }, [draft])
  useEffect(() => () => setChickenConfigPreview(null), [])

  const dirty = useMemo(() => !sameChickenConfig(draft, saved.config), [draft, saved])

  const update = (fn: (c: ChickenConfig) => void) => {
    setDraft(prev => {
      const next = structuredClone(prev)
      fn(next)
      writeDraft(sameChickenConfig(next, saved.config) ? null : next)
      return next
    })
    setStatus(null)
  }
  const setParam = (key: ChickenParamKey, value: unknown) => update(c => { (c.params as Record<string, unknown>)[key] = value })
  const replaceDraft = (next: ChickenConfig) => {
    writeDraft(sameChickenConfig(next, saved.config) ? null : next)
    setDraft(next)
    setStatus(null)
  }

  const save = async () => {
    setSaving(true)
    setStatus({ kind: "info", text: "Salvando…" })
    try {
      const next = await saveChickenConfig(draft)
      setSaved(next)
      setDraft(next.config)
      writeDraft(null)
      setStatus({ kind: "info", text: "Salvo. Todas as telas com a galinha já usam esta versão." })
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar." })
    } finally {
      setSaving(false)
    }
  }

  const savedLabel = saved.updatedAt
    ? `Versão salva ${saved.revision} · ${new Date(saved.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
    : "Nada salvo ainda: valendo o padrão do código"

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#05060c] text-[#dfe8df]">
      <header className="pointer-events-auto absolute inset-x-0 top-0 z-[120] flex items-center gap-2 border-b border-white/10 bg-[#05060c]/90 px-4 py-2.5 backdrop-blur">
        <Link href="/" aria-label="Voltar ao globo" title="Voltar ao globo" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-[#b9c7b9] transition-colors hover:border-primary hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-mono text-sm font-bold">Pátio da Galinha</h1>
          <p className="truncate font-mono text-[11px] text-[#93a79a]">{savedLabel}</p>
        </div>
        <button type="button" aria-label="Controles da galinha" title="Controles da galinha" onClick={() => setControlsOpen(v => !v)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-[#b9c7b9] transition-colors hover:border-primary hover:text-white">
          <Gamepad2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Ajustes da galinha" aria-pressed={panelOpen} title="Ajustes da galinha" onClick={() => setPanelOpen(v => !v)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", panelOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </header>

      <p className="pointer-events-none absolute left-1/2 top-16 z-10 w-full -translate-x-1/2 px-4 text-center font-mono text-xs text-[#93a79a]">
        A/D andar · Shift correr · S agachar · Ctrl chocar · Espaço pular (segure para voar) · arraste a galinha com o mouse
      </p>

      <div data-chicken-platforms className="pointer-events-none absolute inset-0">
        {PLATFORMS.map((p, i) => (
          <div key={i} className="absolute rounded-md border border-primary/30 bg-[#16241b]" style={{ left: `${p.left}%`, bottom: `calc(${p.bottom}% + 30px)`, width: `${p.width}%`, height: `${p.height}%`, minHeight: 18 }} />
        ))}
      </div>

      <ChickenGround />
      <ChickenLayer dropIn={false} />
      <ChickenControlsPanel open={controlsOpen} onOpenChange={setControlsOpen} />

      {panelOpen && (
        <aside data-chicken-ignore aria-label="Ajustes da galinha" className="absolute bottom-10 right-3 top-16 z-[210] flex w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <h2 className="flex-1 text-sm text-white">Ajustes</h2>
            {dirty && <span className="rounded-full border border-amber-300/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">rascunho</span>}
            <button type="button" aria-label="Fechar ajustes" onClick={() => setPanelOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-2 border-b border-white/10 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <button type="button" disabled={!dirty || saving} onClick={() => void save()} className="h-8 rounded-md border border-primary bg-primary px-3 font-bold text-[#05060c] disabled:cursor-default disabled:opacity-45">Salvar padrão</button>
              ) : (
                <button type="button" onClick={online.openLogin} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">Entrar para salvar</button>
              )}
              <button type="button" disabled={!dirty} onClick={() => replaceDraft(saved.config)} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary disabled:opacity-45">Desfazer</button>
              <button type="button" onClick={() => replaceDraft(defaultChickenConfig())} title="Volta todos os valores para o padrão que vem no código do jogo" className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">Valores do código</button>
            </div>
            <p className={cn("leading-relaxed", status?.kind === "error" ? "text-red-300" : "text-[#93a79a]")}>
              {status?.text ?? (isAdmin
                ? "Os ajustes valem aqui na hora. “Salvar padrão” grava para todas as telas e para todo mundo."
                : online.user && !online.user.is_anonymous
                  ? "Os ajustes valem só aqui, neste navegador. Só a conta admin salva a configuração central."
                  : "Os ajustes valem só aqui, neste navegador. Entre com a conta admin para salvar para todas as telas.")}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Group title="Visual" open={!!openGroups.Visual} onToggle={v => setOpenGroups(o => ({ ...o, Visual: v }))}>
              <div className="flex flex-wrap gap-1.5">
                {LOOK_ART.BREEDS.map(b => (
                  <button key={b.id} type="button" onClick={() => update(c => { c.look = LOOK_ART.breedLook(b.id) })} className={cn("h-8 rounded-md border px-3", JSON.stringify(draft.look) === JSON.stringify(LOOK_ART.breedLook(b.id)) ? "border-primary bg-primary/20 text-white" : "border-white/15 hover:border-primary/60")}>{b.label}</button>
                ))}
              </div>
              {LOOK_ART.SLOTS.map(s => (
                <label key={s.id} className="flex items-center justify-between gap-3">
                  <span>{s.label}</span>
                  <select value={draft.look[s.id]} onChange={e => { const v = e.target.value; update(c => { c.look[s.id as ChickenSlot] = v }) }} className="h-8 w-48 max-w-[55%] rounded-md border border-white/15 bg-[#0b110e] px-2">
                    {Object.entries(LOOK_ART.art[s.id]).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
                  </select>
                </label>
              ))}
              {CHICKEN_PARAM_META.filter(p => p.group === "Visual").map(p => <ParamRow key={p.key} meta={p} draft={draft} saved={saved.config} onChange={setParam} />)}
            </Group>
            {CHICKEN_PARAM_GROUPS.filter(g => g !== "Visual").map(g => (
              <Group key={g} title={g} open={!!openGroups[g]} onToggle={v => setOpenGroups(o => ({ ...o, [g]: v }))}>
                {CHICKEN_PARAM_META.filter(p => p.group === g).map(p => <ParamRow key={p.key} meta={p} draft={draft} saved={saved.config} onChange={setParam} />)}
              </Group>
            ))}
          </div>
        </aside>
      )}
    </main>
  )
}

function Group({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <details open={open} onToggle={e => onToggle((e.currentTarget as HTMLDetailsElement).open)} className="border-b border-white/10">
      <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#93a79a] hover:text-white">{title}</summary>
      <div className="grid gap-3 px-4 pb-4">{children}</div>
    </details>
  )
}

function ParamRow({ meta, draft, saved, onChange }: { meta: ChickenParamMeta; draft: ChickenConfig; saved: ChickenConfig; onChange: (key: ChickenParamKey, value: unknown) => void }) {
  const value = draft.params[meta.key]
  const changed = value !== saved.params[meta.key]
  if (meta.type === "bool") {
    return (
      <label className="flex items-center justify-between gap-3" title={meta.hint}>
        <span className={cn(changed && "text-amber-300")}>{meta.label}</span>
        <input type="checkbox" checked={!!value} onChange={e => onChange(meta.key, e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
      </label>
    )
  }
  if (meta.type === "select") {
    return (
      <label className="flex items-center justify-between gap-3">
        <span className={cn("min-w-0", changed && "text-amber-300")}>{meta.label}</span>
        <select value={String(value)} onChange={e => onChange(meta.key, e.target.value)} className="h-8 w-36 shrink-0 rounded-md border border-white/15 bg-[#0b110e] px-2">
          <option value="">sem som</option>
          <option value="all">sorteio</option>
          {CHICKEN_SOUND_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    )
  }
  const n = value as number
  const fill = Math.max(0, Math.min(100, ((n - meta.min) / (meta.max - meta.min)) * 100))
  return (
    <div className="grid gap-1" title={meta.hint}>
      <div className="relative h-10 overflow-hidden rounded-md bg-[#22302a]" onDoubleClick={() => onChange(meta.key, saved.params[meta.key])}>
        <div className="absolute inset-y-0 left-0 bg-primary/50" style={{ width: `${fill}%` }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between gap-2 px-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">
          <span className="truncate">{meta.label}</span>
          <output className={cn("shrink-0 font-bold tabular-nums", changed && "text-amber-300")}>{fmt(n, meta.step)}{meta.unit ? ` ${meta.unit}` : ""}</output>
        </div>
        <input
          type="range"
          aria-label={meta.label}
          min={Math.min(meta.min, n)}
          max={Math.max(meta.max, n)}
          step={meta.step}
          value={n}
          onChange={e => onChange(meta.key, Number(e.target.value))}
          // give the keyboard back to the chicken after dragging
          onPointerUp={e => e.currentTarget.blur()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      {meta.hint && <span className="text-[10px] text-[#93a79a]">{meta.hint}</span>}
    </div>
  )
}
