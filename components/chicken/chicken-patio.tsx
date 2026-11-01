"use client"

// Pátio da Galinha: the game's playground where the player chicken is tuned. The panel edits a draft of
// the central configuration (lib/chicken/config.ts) that the chicken here follows live; "Salvar padrão"
// (admin account only) saves it for every screen that draws the chicken.
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Crosshair, Gamepad2, SlidersHorizontal, Swords, X } from "lucide-react"
import { useOnline } from "@/components/online/online-provider"
import { isAdminUser } from "@/lib/admin/access"
import {
  defaultChickenConfig, getSavedChickenConfig, normalizeChickenConfig, refreshChickenConfig, sameChickenConfig, saveChickenConfig,
  setChickenConfigPreview, subscribeChickenConfig, type ChickenConfig, type SavedChickenConfig,
} from "@/lib/chicken/config"
import { CHICKEN_PARAM_GROUPS, CHICKEN_PARAM_META, CHICKEN_SOUND_TYPES, type ChickenParamKey, type ChickenParamMeta } from "@/lib/chicken/param-meta"
import { ChickenControlsPanel } from "./chicken-controls-panel"
import { ChickenGround, ChickenLayer } from "./chicken-layer"
import { ChickenPortalArrival } from "./chicken-portal"
import { ChickenHeadIcon, ChickenVestiario } from "./chicken-vestiario"
import { cn } from "@/lib/utils"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { ParquinhoPlay, ParquinhoWorld } from "@/components/pigchicken/parquinho"
import { ItemsPanel } from "@/components/pigchicken/items-panel"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { CAMERA_MODES } from "@/lib/pigchicken/camera"
import { DEFAULT_PARQUINHO, loadParquinho, saveParquinho, type ParquinhoSettings } from "@/lib/pigchicken/settings"

const DRAFT = "chickenchess:chicken-patio-draft:v1"


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
  const [vestOpen, setVestOpen] = useState(false)
  const [status, setStatus] = useState<{ kind: "info" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [engine, setEngine] = useState<ChickenEngine | null>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const [pq, setPq] = useState<ParquinhoSettings>(DEFAULT_PARQUINHO)
  const [pqOpen, setPqOpen] = useState(false)
  const [itemsOpen, setItemsOpen] = useState(false)
  useEffect(() => { setPq(loadParquinho()) }, [])
  const setPqValue = <K extends keyof ParquinhoSettings>(key: K, value: ParquinhoSettings[K]) => setPq(prev => { const next = { ...prev, [key]: value }; saveParquinho(next); return next })
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
        <select aria-label="Câmera" title="Câmera" value={pq.camera} onChange={e => setPqValue("camera", e.target.value as ParquinhoSettings["camera"])} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2 font-mono text-xs">
          {CAMERA_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button type="button" aria-label="Itens" aria-pressed={itemsOpen} title="Armas e instrumentos" onClick={() => { setItemsOpen(v => !v); setPqOpen(false) }} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", itemsOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Swords className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Ajustes do Parquinho" aria-pressed={pqOpen} title="Ajustes do Parquinho (câmera e mira)" onClick={() => { setPqOpen(v => !v); setItemsOpen(false) }} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", pqOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Crosshair className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Controles da galinha" title="Controles da galinha" onClick={() => setControlsOpen(v => !v)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-[#b9c7b9] transition-colors hover:border-primary hover:text-white">
          <Gamepad2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Vestiário" aria-pressed={vestOpen} title="Vestiário" onClick={() => setVestOpen(v => !v)} className={cn("h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 bg-[#101713] transition-colors hover:border-primary", vestOpen ? "border-primary" : "border-primary/50")}>
          <ChickenHeadIcon look={draft.look} />
        </button>
        <button type="button" aria-label="Ajustes da galinha" aria-pressed={panelOpen} title="Ajustes da galinha" onClick={() => setPanelOpen(v => !v)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", panelOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </header>

      <p className="pointer-events-none absolute left-1/2 top-16 z-10 w-full -translate-x-1/2 px-4 text-center font-mono text-xs text-[#93a79a]">
        A/D andar · Shift correr · S agachar · Ctrl chocar · Espaço pular · mouse ou setas miram · clique/X atira · clique direito/Z golpe · V arremessa · Q/1–9 trocam o item · E pega (troca com o da mão) · chocar com item trava a mira
      </p>

      <ParquinhoWorld screens={pq.screens} worldRef={worldRef} />

      <ChickenGround />
      <ChickenLayer dropIn={false} onEngine={setEngine} />
      <ChickenPortalArrival engine={engine} />
      <ParquinhoPlay engine={engine} settings={pq} worldRef={worldRef} />
      {itemsOpen && <ItemsPanel onClose={() => setItemsOpen(false)} />}
      {pqOpen && (
        <FloatingPanel id="parquinho" aria-label="Ajustes do Parquinho" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(320, vw - 24), h: Math.min(560, vh - 80) })} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
            <h2 className="flex-1 text-sm text-white">Parquinho</h2>
            <button type="button" onClick={() => { setPq(DEFAULT_PARQUINHO); saveParquinho(DEFAULT_PARQUINHO) }} className="h-7 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>
            <button type="button" aria-label="Fechar" onClick={() => setPqOpen(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
          </div>
          <PqRange label="Largura do mundo" unit="telas" min={1} max={8} step={1} value={pq.screens} onChange={v => setPqValue("screens", v)} />
          <PqRange label="Folga da câmera" unit="px" min={0} max={400} step={10} value={pq.deadband} onChange={v => setPqValue("deadband", v)} hint="Quanto ela anda a partir do centro antes da câmera seguir" />
          <PqRange label="Velocidade da câmera" unit="" min={1} max={20} step={1} value={pq.lag} onChange={v => setPqValue("lag", v)} />
          <PqRange label="Andar de costas" unit="%" min={20} max={100} step={5} value={Math.round(pq.backpedal * 100)} onChange={v => setPqValue("backpedal", v / 100)} hint="Velocidade ao andar mirando para trás" />
          <PqRange label="Mouse parado devolve a mira" unit="s" min={0} max={5} step={0.25} value={pq.mouseIdle} onChange={v => setPqValue("mouseIdle", v)} />
          <PqRange label="Distância da retícula" unit="px" min={60} max={500} step={10} value={pq.reticleDist} onChange={v => setPqValue("reticleDist", v)} hint="No analógico e nas setas" />
          <PqRange label="Volume das armas" unit="%" min={0} max={100} step={5} value={Math.round(pq.weaponVolume * 100)} onChange={v => setPqValue("weaponVolume", v / 100)} />
          <PqRange label="Volume dos instrumentos" unit="%" min={0} max={100} step={5} value={Math.round(pq.noteVolume * 100)} onChange={v => setPqValue("noteVolume", v / 100)} hint="Notas e as respostas dos inimigos" />
          <PqRange label="Volume do ambiente" unit="%" min={0} max={100} step={5} value={Math.round(pq.ambienceVolume * 100)} onChange={v => setPqValue("ambienceVolume", v / 100)} hint="Percussão e drone de cada zona (0 desliga)" />
          <label className="flex items-center justify-between gap-3 text-xs"><span>Notas no ritmo (quantizar)</span><input type="checkbox" checked={pq.quantize} onChange={e => setPqValue("quantize", e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" /></label>
          <p className="text-[10px] text-[#93a79a]">Zona morta e ímã dos analógicos ficam em Controles.</p>
        </FloatingPanel>
      )}
      <ChickenControlsPanel open={controlsOpen} onOpenChange={setControlsOpen} />

      {vestOpen && <ChickenVestiario look={draft.look} savedLook={saved.config.look} onChange={look => update(c => { c.look = look })} onClose={() => setVestOpen(false)} />}

      {panelOpen && (
        <FloatingPanel id="chicken-tuning" aria-label="Ajustes da galinha" initial={(vw, vh) => { const w = Math.min(400, vw - 24); return { x: vw - w - 12, y: 64, w, h: vh - 104 } }} minW={280} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div data-drag-handle className="flex cursor-move items-center gap-2 border-b border-white/10 px-4 py-2.5">
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
              <button type="button" onClick={() => setVestOpen(true)} className="h-8 justify-self-start rounded-md border border-white/20 px-3 hover:border-primary">Abrir o vestiário (raças e partes)</button>
              {CHICKEN_PARAM_META.filter(p => p.group === "Visual").map(p => <ParamRow key={p.key} meta={p} draft={draft} saved={saved.config} onChange={setParam} />)}
            </Group>
            {CHICKEN_PARAM_GROUPS.filter(g => g !== "Visual").map(g => (
              <Group key={g} title={g} open={!!openGroups[g]} onToggle={v => setOpenGroups(o => ({ ...o, [g]: v }))}>
                {CHICKEN_PARAM_META.filter(p => p.group === g).map(p => <ParamRow key={p.key} meta={p} draft={draft} saved={saved.config} onChange={setParam} />)}
              </Group>
            ))}
          </div>
        </FloatingPanel>
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

function PqRange({ label, unit, min, max, step, value, onChange, hint }: { label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="grid gap-1" title={hint}>
      <span className="flex justify-between gap-2"><span>{label}</span><output className="tabular-nums text-white">{value}{unit ? ` ${unit}` : ""}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} onPointerUp={e => e.currentTarget.blur()} className="accent-[var(--primary)]" />
    </label>
  )
}
