"use client"

// The Editor Mode's panels for the map's music: a Zona sonora's key, scale, tempo, ambience chain and priority; the
// Faixas fixas' layout and notes; and the "Rebate notas" collision of any surface.
import { useEffect, useState } from "react"
import { PatioRange } from "@/components/ui/patio-range"
import { NOTE_NAMES, SCALES, ZONES, type Feel, type ScaleId } from "@/lib/pigchicken/music"
import {
  LANES_MAX, SURFACE_MODES, ZONE_BPM, ZONE_LIFE, ZONE_PRIORITY, defaultSurfaceRebate, lanesNotes, normalizeLanes, normalizeSoundZone,
  type LanesParams, type SoundZoneParams, type SurfaceRebate,
} from "@/lib/pigchicken/sound-zones"
import { ChainEditor } from "./chain-editor"
import { BIRDS, BIRD_IDS } from "@/lib/pigchicken/birds"
import { LanesArt } from "./sound-zone-art"
import { PROGRESSIONS, ZONE_CHANGES, chordScalesFor, fitChords, progressionIndex, zoneChange, type ZoneChangeId } from "@/lib/pigchicken/zone-changes"

const field = "h-9 w-full min-w-0 rounded-md border border-white/15 bg-[#0b110e] px-2"
const SCALE_IDS = Object.keys(SCALES) as ScaleId[]
const CHORD_SCALES = SCALE_IDS.filter(s => SCALES[s].steps.length === 7)
const FEEL_LABELS: Record<Feel, string> = { straight: "Reto", swing: "Swing", half: "Meio tempo" }
// a key picked by name sits around the middle of the keyboard (Fá♯3 … Fá4), like the scenes' zones
const rootOf = (pc: number) => 54 + ((pc - 6 + 12) % 12)
const pcOf = (m: number) => ((m % 12) + 12) % 12

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-1" title={hint}><span>{label}</span>{children}{hint && <span className="text-[10px] text-[#93a79a]">{hint}</span>}</label>
}

function KeySelect({ value, onChange, label = "Tom" }: { value: number; onChange: (root: number) => void; label?: string }) {
  return (
    <select aria-label={label} value={pcOf(value)} onChange={e => onChange(rootOf(Number(e.target.value)))} className={field}>
      {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
    </select>
  )
}

// ---------- Zona sonora ----------

// scene: a scene's own zone (only its music: no priority, walls, birds or chain)
export function SoundZoneFields({ zone, onChange, scene = false }: { zone: SoundZoneParams; onChange: (z: SoundZoneParams, step?: string) => void; scene?: boolean }) {
  const set = (p: Partial<SoundZoneParams>, step?: string) => onChange(normalizeSoundZone({ ...zone, ...p }), step)
  const progText = zone.progression.map(d => d + 1).join(" ")
  const [prog, setProg] = useState(progText)
  // a tag on the label changed it: the text follows
  useEffect(() => { setProg(t => (t.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 7).join(" ") === progText ? t : progText)) }, [progText])
  const preset = progressionIndex(zone.progression)
  return (
    <>
      {!scene && <p className="text-[#93a79a]">Invisível no jogo. Quem entra nela ouve o tom, a escala e o andamento dela, e toda nota rebatida aqui dentro passa pela cadeia do ambiente.</p>}
      <Field label="Copiar de uma cena">
        <select aria-label="Copiar de uma cena" value="" onChange={e => { const z = ZONES.find(x => x.id === e.target.value); if (z) { set({ name: z.name, root: z.root, scale: z.scale, chordScale: z.chordScale, bpm: z.bpm, feel: z.feel, progression: z.progression.slice(), color: z.color }); setProg(z.progression.map(d => d + 1).join(" ")) } }} className={field}>
          <option value="">Escolher…</option>
          {ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label="Nome"><input aria-label="Nome da zona" maxLength={40} value={zone.name} onChange={e => set({ name: e.target.value }, "zone-name")} className={field} /></Field>
        <Field label="Cor"><input aria-label="Cor da zona" type="color" value={zone.color} onChange={e => set({ color: e.target.value }, "zone-color")} className="h-9 w-12 rounded-md border border-white/15 bg-transparent" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tom"><KeySelect value={zone.root} onChange={root => set({ root })} /></Field>
        <Field label="Escala">
          <select aria-label="Escala" value={zone.scale} onChange={e => { const scale = e.target.value as ScaleId; set({ scale, chordScale: fitChords(scale, zone.chordScale) }) }} className={field}>
            {SCALE_IDS.map(s => <option key={s} value={s}>{SCALES[s].label}</option>)}
          </select>
        </Field>
        <Field label="Acordes de">
          <select aria-label="Escala dos acordes" value={zone.chordScale} onChange={e => set({ chordScale: e.target.value as ScaleId })} className={field}>
            {CHORD_SCALES.map(s => <option key={s} value={s}>{SCALES[s].label}{chordScalesFor(zone.scale).includes(s) ? "" : " (desafina)"}</option>)}
          </select>
        </Field>
        <Field label="Balanço">
          <select aria-label="Balanço" value={zone.feel} onChange={e => set({ feel: e.target.value as Feel })} className={field}>
            {(Object.keys(FEEL_LABELS) as Feel[]).map(f => <option key={f} value={f}>{FEEL_LABELS[f]}</option>)}
          </select>
        </Field>
      </div>
      <PatioRange label="Andamento" min={ZONE_BPM.min} max={ZONE_BPM.max} value={zone.bpm} display={`${zone.bpm} bpm`} onChange={bpm => set({ bpm }, "zone-bpm")} />
      <Field label="Progressão pronta">
        <select aria-label="Progressão pronta" value={preset} onChange={e => { const p = PROGRESSIONS[Number(e.target.value)]; if (p) { set({ progression: p.degrees.slice() }); setProg(p.degrees.map(d => d + 1).join(" ")) } }} className={field}>
          {preset < 0 && <option value={-1}>Própria</option>}
          {PROGRESSIONS.map((p, i) => <option key={p.label} value={i}>{p.label} ({p.degrees.map(d => d + 1).join(" ")})</option>)}
        </select>
      </Field>
      <Field label="Progressão (graus, um acorde por compasso)" hint="Ex.: 1 5 6 4. Os graus vão de 1 a 7.">
        <input aria-label="Progressão" value={prog} onChange={e => {
          setProg(e.target.value)
          const degrees = e.target.value.split(/[\s,]+/).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 7).map(n => n - 1)
          if (degrees.length) set({ progression: degrees }, "zone-prog")
        }} className={field} />
      </Field>
      {!scene && <>
      <PatioRange label="Prioridade" min={ZONE_PRIORITY.min} max={ZONE_PRIORITY.max} value={zone.priority} hint="Onde zonas se sobrepõem, vale a de prioridade maior. Qualquer zona vale mais que a da cena."
        onChange={priority => set({ priority }, "zone-priority")} />
      <label className="flex items-center justify-between gap-3">
        <span className="grid"><span>Troca a música ao entrar</span><span className="text-[10px] text-[#93a79a]">Desligado: só muda as notas rebatidas dentro dela</span></span>
        <input type="checkbox" checked={zone.music} onChange={e => set({ music: e.target.checked })} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
      </label>
      <div className="grid gap-1" title="Os aliens convertidos aqui viram estes pássaros (nenhum marcado: os da cena)">
        <span>Pássaros da zona</span>
        <div className="flex flex-wrap gap-1.5">
          {BIRD_IDS.map(id => {
            const on = zone.birds.includes(id)
            return <button key={id} type="button" aria-pressed={on} onClick={() => set({ birds: on ? zone.birds.filter(b => b !== id) : [...zone.birds, id] })}
              className={"h-8 rounded-md border px-2 " + (on ? "border-primary bg-primary/15 text-white" : "border-white/15 text-[#93a79a] hover:border-white/40")}>{BIRDS[id].name}</button>
          })}
        </div>
        <span className="text-[10px] text-[#93a79a]">Nenhum marcado: os pássaros da cena.</span>
      </div>
      <ChainEditor chain={zone.chain} changed={false} title="Cadeia do ambiente"
        hint="Toda nota rebatida dentro da zona passa por estes passos (a parte “ambiente” da regra de rebate)"
        onChange={fn => { const chain = structuredClone(zone.chain); fn(chain); set({ chain }) }} />
      <PatioRange label="Vida das paredes" min={ZONE_LIFE.min} max={ZONE_LIFE.max} value={zone.life} display={zone.life ? `${zone.life} notas` : "Sem paredes"}
        hint="Com vida, as notas quicam nas bordas da zona e cada uma tira 1 ponto. Quando zera, a zona muda pelo padrão e a vida enche de novo."
        onChange={life => set({ life }, "zone-life")} />
      {zone.life > 0 && (
        <Field label="Padrão de mudança" hint={zoneChange(zone.change).hint}>
          <select aria-label="Padrão de mudança" value={zone.change} onChange={e => set({ change: e.target.value as ZoneChangeId })} className={field}>
            {(["Geral", "Ritmo", "Harmonia", "Melodia"] as const).map(g => (
              <optgroup key={g} label={g}>{ZONE_CHANGES.filter(c => c.group === g).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>
            ))}
          </select>
        </Field>
      )}
      </>}
    </>
  )
}

// ---------- Faixas fixas ----------

const parseNotes = (text: string) => text.split(/[\s,]+/).filter(Boolean).slice(0, LANES_MAX).map(t => {
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : null
})

export function LanesFields({ lanes, w, h, onChange }: { lanes: LanesParams; w: number; h: number; onChange: (l: LanesParams, step?: string) => void }) {
  const set = (p: Partial<LanesParams>, step?: string) => onChange(normalizeLanes({ ...lanes, ...p }), step)
  const c = lanes.content
  const [notesText, setNotesText] = useState(c.kind === "notes" ? c.notes.map(n => n ?? "-").join(" ") : lanesNotes(lanes).map(n => n ?? "-").join(" "))
  const k = Math.min(300 / w, 130 / h)
  return (
    <>
      <p className="text-[#93a79a]">Toda nota rebatida dentro de uma faixa toca a nota dela, e o item enfeita por cima. Uma nota que só passa por aqui também muda para a nota da faixa.</p>
      <div className="grid shrink-0 place-items-center rounded-md border border-white/10 bg-[#0b110e] p-2" aria-label="Prévia das faixas">
        <div className="relative" style={{ width: w * k, height: h * k }}><LanesArt lanes={lanes} w={w} h={h} editing labels /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Disposição">
          <select aria-label="Disposição das faixas" value={lanes.layout} onChange={e => set({ layout: e.target.value as LanesParams["layout"] })} className={field}>
            <option value="fan">Leque</option>
            <option value="columns">Colunas</option>
          </select>
        </Field>
        <Field label="Sentido">
          <select aria-label="Sentido das faixas" value={lanes.dir} onChange={e => set({ dir: Number(e.target.value) === -1 ? -1 : 1 })} className={field}>
            <option value={1}>{lanes.layout === "fan" ? "Horário" : "Grave à esquerda"}</option>
            <option value={-1}>{lanes.layout === "fan" ? "Anti-horário" : "Grave à direita"}</option>
          </select>
        </Field>
      </div>
      <Field label="Notas">
        <select aria-label="Conteúdo das faixas" value={c.kind} onChange={e => {
          if (e.target.value === "notes") { const notes = lanesNotes(lanes); setNotesText(notes.map(n => n ?? "-").join(" ")); set({ content: { kind: "notes", notes } }) }
          else set({ content: { kind: "scale", root: 60, scale: "majorPenta", low: 60, octaves: 2 } })
        }} className={field}>
          <option value="scale">Uma escala repartida nas faixas</option>
          <option value="notes">Uma nota escolhida por faixa</option>
        </select>
      </Field>
      {c.kind === "scale" ? (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Tom"><KeySelect value={c.root} onChange={root => set({ content: { ...c, root, low: root + 12 * Math.round((c.low - c.root) / 12) } })} /></Field>
          <Field label="Escala">
            <select aria-label="Escala das faixas" value={c.scale} onChange={e => set({ content: { ...c, scale: e.target.value as ScaleId } })} className={field}>
              {SCALE_IDS.map(s => <option key={s} value={s}>{SCALES[s].label}</option>)}
            </select>
          </Field>
          <Field label="Oitavas">
            <select aria-label="Oitavas das faixas" value={c.octaves} onChange={e => set({ content: { ...c, octaves: Number(e.target.value) } })} className={field}>
              {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <Field label="Notas, faixa por faixa" hint="Números MIDI separados por espaço (60 = Dó central); um traço deixa a faixa em silêncio.">
          <input aria-label="Notas das faixas" value={notesText} onChange={e => {
            setNotesText(e.target.value)
            const notes = parseNotes(e.target.value)
            if (notes.length) set({ content: { kind: "notes", notes } }, "lanes-notes")
          }} className={field} />
        </Field>
      )}
      {lanes.layout === "fan" && <>
        <PatioRange label="Abertura" min={10} max={360} step={5} value={lanes.open} display={`${lanes.open}°`} onChange={open => set({ open }, "lanes-open")} />
        <PatioRange label="Começa em" min={0} max={355} step={5} value={lanes.start} display={`${lanes.start}°`} hint="0° = direita, 90° = baixo, 180° = esquerda, 270° = cima" onChange={start => set({ start }, "lanes-start")} />
        <PatioRange label="Altura do centro" min={0} max={Math.round(h)} step={5} value={Math.min(lanes.centerY, Math.round(h))} display={`${Math.min(lanes.centerY, Math.round(h))} px`} hint="Acima da borda de baixo; no meio da caixa dá para abrir um círculo inteiro" onChange={centerY => set({ centerY }, "lanes-center")} />
        <label className="flex items-center justify-between gap-3">
          <span className="grid"><span>Espelhado</span><span className="text-[10px] text-[#93a79a]">Só a altura conta, como a mira dos instrumentos</span></span>
          <input type="checkbox" checked={lanes.mirrored} onChange={e => set({ mirrored: e.target.checked })} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
        </label>
      </>}
      <PatioRange label="Brilho no jogo" min={0} max={100} step={5} value={Math.round(lanes.glow * 100)} display={lanes.glow ? `${Math.round(lanes.glow * 100)}%` : "Invisível"} onChange={v => set({ glow: v / 100 }, "lanes-glow")} />
    </>
  )
}

// ---------- the "Rebate notas" collision ----------

export function SurfaceRebateFields({ rebate, onChange }: { rebate: SurfaceRebate | undefined; onChange: (r: SurfaceRebate | undefined) => void }) {
  const r = rebate ?? defaultSurfaceRebate()
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <label className="flex items-center justify-between gap-3">
        <span className="grid"><span>Rebate notas</span><span className="text-[10px] text-[#93a79a]">As notas quicam nele e tocam de novo</span></span>
        <input type="checkbox" checked={!!rebate} onChange={e => onChange(e.target.checked ? r : undefined)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
      </label>
      {rebate && <>
        <select aria-label="O que a superfície toca" value={r.mode} onChange={e => onChange({ ...r, mode: e.target.value as SurfaceRebate["mode"] })} className={field}>
          {SURFACE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <span className="text-[10px] text-[#93a79a]">{SURFACE_MODES.find(m => m.value === r.mode)?.hint}</span>
        {r.mode === "chain" && <ChainEditor chain={r.chain} changed={false} title="Cadeia da superfície" hint="Cada nota que quica aqui passa por estes passos"
          onChange={fn => { const chain = structuredClone(r.chain); fn(chain); onChange({ ...r, chain }) }} />}
      </>}
    </div>
  )
}
