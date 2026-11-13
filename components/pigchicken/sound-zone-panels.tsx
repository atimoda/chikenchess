"use client"

// The Editor Mode's panels for the map's music: a Zona sonora's harmony, rhythm, bass and rules (the same fields for
// a zone of the map and for a scene's own zone); the
// Faixas fixas' layout and notes; and the "Rebate notas" collision of any surface.
import { useEffect, useState } from "react"
import { PatioRange } from "@/components/ui/patio-range"
import { NOTE_NAMES, SCALES, ZONES, type Feel, type InKeyRule, type ScaleId } from "@/lib/pigchicken/music"
import {
  LANES_MAX, SURFACE_MODES, ZONE_BPM, ZONE_LIFE, ZONE_PRIORITY, defaultSurfaceRebate, lanesNotes, normalizeLanes, normalizeSoundZone,
  type LanesParams, type SoundZoneParams, type SurfaceRebate,
} from "@/lib/pigchicken/sound-zones"
import {
  AMBIENCE_VOL, BASSES, BASS_GROUPS, BASS_OCT, BEATS, BEAT_GROUPS, DRUM_ROWS, SILENCE, ambienceGrid, beatSilent, drumRow, isBass, isBeat, legacyAmbience, toggleDrumStep,
  type DrumGrid, type ZoneAmbience,
} from "@/lib/pigchicken/zone-ambience"
import { ChainEditor } from "./chain-editor"
import { BIRDS, BIRD_IDS } from "@/lib/pigchicken/birds"
import { LanesArt } from "./sound-zone-art"
import { PROGRESSIONS, ZONE_CHANGES, chordScalesFor, fitChords, progressionIndex, zoneChange, type ZoneChangeId } from "@/lib/pigchicken/zone-changes"

const field = "h-9 w-full min-w-0 rounded-md border border-white/15 bg-[#0b110e] px-2"
const SCALE_IDS = Object.keys(SCALES) as ScaleId[]
const CHORD_SCALES = SCALE_IDS.filter(s => SCALES[s].steps.length === 7)
const FEEL_LABELS: Record<Feel, string> = { straight: "Reto", swing: "Swing", half: "Meio tempo" }
const IN_KEY_LABELS: Record<InKeyRule | "", string> = { "": "Todas as notas", key: "Só notas do tom", chord: "Só o acorde da hora" }
// a key picked by name sits around the middle of the keyboard (Fá♯3 … Fá4), like the scenes' zones
const rootOf = (pc: number) => 54 + ((pc - 6 + 12) % 12)
const pcOf = (m: number) => ((m % 12) + 12) % 12

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-1" title={hint}><span>{label}</span>{children}</label>
}

function KeySelect({ value, onChange, label = "Tom" }: { value: number; onChange: (root: number) => void; label?: string }) {
  return (
    <select aria-label={label} value={pcOf(value)} onChange={e => onChange(rootOf(Number(e.target.value)))} className={field}>
      {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
    </select>
  )
}

// ---------- Zona sonora ----------

const SECTION = "mt-1 border-t border-white/10 pt-3 text-[10px] uppercase tracking-[0.12em] text-[#93a79a]"
const OCTAVES = Array.from({ length: BASS_OCT.max - BASS_OCT.min + 1 }, (_, i) => BASS_OCT.min + i)

// the zone's own beat: one row per drum, sixteen steps; a click goes rest → normal → accent → rest
function DrumGridEditor({ grid, color, onChange }: { grid: DrumGrid; color: string; onChange: (g: DrumGrid) => void }) {
  return (
    <div className="grid gap-field" aria-label="Grade da batida">
      {DRUM_ROWS.map(r => {
        const row = drumRow(grid, r.id)
        return (
          <div key={r.id} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-1.5">
            <span className="truncate text-[10px] text-[#93a79a]">{r.label}</span>
            <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-px">
              {Array.from(row, (c, i) => (
                <button key={i} type="button" aria-label={`${r.label}, passo ${i + 1}`} aria-pressed={c !== "."} onClick={() => onChange(toggleDrumStep(grid, r.id, i))}
                  className="h-4 rounded-[2px]" style={c === "." ? { background: i % 8 < 4 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)" } : { background: color, opacity: c === "o" ? 0.45 : c === "x" ? 0.75 : 1 }} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// One component for every Zona sonora. scene: a scene's own zone, stuck to the ground (no priority and no walls:
// any zone of the map wins over it, and it has no edges for the notes to bounce off)
export function SoundZoneFields({ zone, onChange, scene = false }: { zone: SoundZoneParams; onChange: (z: SoundZoneParams, step?: string) => void; scene?: boolean }) {
  const set = (p: Partial<SoundZoneParams>, step?: string) => onChange(normalizeSoundZone({ ...zone, ...p }), step)
  const amb = zone.ambience
  const setAmb = (p: Partial<ZoneAmbience>, step?: string) => set({ ambience: { ...amb, ...p } }, step)
  const progText = zone.progression.map(d => d + 1).join(" ")
  const [prog, setProg] = useState(progText)
  // a tag on the label changed it: the text follows
  useEffect(() => { setProg(t => (t.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 7).join(" ") === progText ? t : progText)) }, [progText])
  const preset = progressionIndex(zone.progression)
  // the degrees are typed only for a progression of its own
  const [ownProg, setOwnProg] = useState(preset < 0)
  const typing = ownProg || preset < 0
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-field">
        <Field label="Nome"><input aria-label="Nome da zona" maxLength={40} value={zone.name} onChange={e => set({ name: e.target.value }, "zone-name")} className={field} /></Field>
        <Field label="Cor"><input aria-label="Cor da zona" type="color" value={zone.color} onChange={e => set({ color: e.target.value }, "zone-color")} className="h-9 w-12 rounded-md border border-white/15 bg-transparent" /></Field>
      </div>
      <Field label="Predefinição">
        <select aria-label="Predefinição" value="" onChange={e => {
          if (e.target.value === "silence") return set({ ambience: { ...SILENCE } })
          const z = ZONES.find(x => x.id === e.target.value)
          if (!z) return
          set({ name: z.name, root: z.root, scale: z.scale, chordScale: z.chordScale, bpm: z.bpm, feel: z.feel, progression: z.progression.slice(), color: z.color, ambience: z.ambience ?? legacyAmbience(z.feel) })
          setProg(z.progression.map(d => d + 1).join(" ")); setOwnProg(false)
        }} className={field}>
          <option value="">Escolher…</option>
          <option value="silence">Silêncio</option>
          {ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </Field>

      <h3 className={SECTION}>Harmonia</h3>
      <div className="grid grid-cols-2 gap-field">
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
        <Field label="Progressão" hint="Um acorde por compasso">
          <select aria-label="Progressão" value={typing ? -1 : preset} onChange={e => {
            const p = PROGRESSIONS[Number(e.target.value)]
            setOwnProg(!p)
            if (p) { set({ progression: p.degrees.slice() }); setProg(p.degrees.map(d => d + 1).join(" ")) }
          }} className={field}>
            {PROGRESSIONS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
            <option value={-1}>Própria</option>
          </select>
        </Field>
      </div>
      {typing && (
        <input aria-label="Graus da progressão" title="Graus de 1 a 7, um acorde por compasso. Ex.: 1 5 6 4" value={prog} onChange={e => {
          setProg(e.target.value)
          const degrees = e.target.value.split(/[\s,]+/).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 7).map(n => n - 1)
          if (degrees.length) set({ progression: degrees }, "zone-prog")
        }} className={field} />
      )}

      <h3 className={SECTION}>Ritmo</h3>
      <PatioRange label="Andamento" min={ZONE_BPM.min} max={ZONE_BPM.max} value={zone.bpm} display={`${zone.bpm} bpm`} onChange={bpm => set({ bpm }, "zone-bpm")} />
      <div className="grid grid-cols-2 gap-field">
        <Field label="Batida">
          <select aria-label="Batida" value={amb.drums ? "own" : amb.beat} onChange={e => { if (isBeat(e.target.value)) { const { drums: _own, ...rest } = amb; set({ ambience: { ...rest, beat: e.target.value } }) } }} className={field}>
            {amb.drums && <option value="own">Própria</option>}
            <option value="none">Silêncio</option>
            {BEAT_GROUPS.map(g => <optgroup key={g} label={g}>{BEATS.filter(b => b.group === g).map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</optgroup>)}
          </select>
        </Field>
        <Field label="Balanço" hint="Como o tempo é sentido: atrasa as notas fracas (Swing) ou puxa tudo para a metade (Meio tempo)">
          <select aria-label="Balanço" value={zone.feel} onChange={e => set({ feel: e.target.value as Feel })} className={field}>
            {(Object.keys(FEEL_LABELS) as Feel[]).map(f => <option key={f} value={f}>{FEEL_LABELS[f]}</option>)}
          </select>
        </Field>
      </div>
      {!beatSilent(amb) && <PatioRange label="Volume da batida" min={AMBIENCE_VOL.min} max={AMBIENCE_VOL.max} step={AMBIENCE_VOL.step} value={amb.beatVol ?? 100} display={`${amb.beatVol ?? 100}%`} onChange={beatVol => setAmb({ beatVol }, "zone-beat-vol")} />}
      <details className="group">
        <summary className="cursor-pointer select-none text-[#93a79a] hover:text-white">Editar a batida</summary>
        <div className="pt-2"><DrumGridEditor grid={ambienceGrid(amb)} color={zone.color} onChange={drums => setAmb({ drums })} /></div>
      </details>

      <h3 className={SECTION}>Baixo</h3>
      <div className="grid grid-cols-[1fr_auto] gap-field">
        <Field label="Som">
          <select aria-label="Baixo" value={amb.bass} onChange={e => { if (isBass(e.target.value)) setAmb({ bass: e.target.value }) }} className={field}>
            <option value="none">Silêncio</option>
            {BASS_GROUPS.map(g => <optgroup key={g} label={g}>{BASSES.filter(b => b.group === g).map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</optgroup>)}
          </select>
        </Field>
        {amb.bass !== "none" && (
          <Field label="Oitava">
            <select aria-label="Oitava do baixo" value={amb.bassOct ?? 0} onChange={e => setAmb({ bassOct: Number(e.target.value) })} className={field}>
              {OCTAVES.map(o => <option key={o} value={o}>{o > 0 ? `+${o}` : o}</option>)}
            </select>
          </Field>
        )}
      </div>
      {amb.bass !== "none" && <PatioRange label="Volume do baixo" min={AMBIENCE_VOL.min} max={AMBIENCE_VOL.max} step={AMBIENCE_VOL.step} value={amb.bassVol ?? 100} display={`${amb.bassVol ?? 100}%`} onChange={bassVol => setAmb({ bassVol }, "zone-bass-vol")} />}

      <details className="mt-1 border-t border-white/10 pt-3">
        <summary className="cursor-pointer select-none text-[10px] uppercase tracking-[0.12em] text-[#93a79a] hover:text-white">Notas e regras</summary>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-field pt-3">
          <Field label="Dano nos inimigos" hint="Notas fora da regra resvalam sem harmonizar">
            <select aria-label="Dano nos inimigos" value={zone.inKey ?? ""} onChange={e => set({ inKey: (e.target.value || undefined) as InKeyRule | undefined })} className={field}>
              {(Object.keys(IN_KEY_LABELS) as (InKeyRule | "")[]).map(k => <option key={k} value={k}>{IN_KEY_LABELS[k]}</option>)}
            </select>
          </Field>
          {!scene && <PatioRange label="Prioridade" min={ZONE_PRIORITY.min} max={ZONE_PRIORITY.max} value={zone.priority} hint="Onde zonas se sobrepõem, vale a de prioridade maior. Qualquer zona vale mais que a da cena."
            onChange={priority => set({ priority }, "zone-priority")} />}
          <label className="flex items-center justify-between gap-3" title="Desligado: só muda as notas rebatidas dentro dela">
            <span>Troca a música ao entrar</span>
            <input type="checkbox" checked={zone.music} onChange={e => set({ music: e.target.checked })} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
          </label>
          <div className="grid gap-1" title="Os aliens convertidos aqui viram estes pássaros (nenhum marcado: os da cena)">
            <span>Pássaros da zona</span>
            <div className="flex flex-wrap gap-field">
              {BIRD_IDS.map(id => {
                const on = zone.birds.includes(id)
                return <button key={id} type="button" aria-pressed={on} onClick={() => set({ birds: on ? zone.birds.filter(b => b !== id) : [...zone.birds, id] })}
                  className={"h-8 rounded-md border px-2 " + (on ? "border-primary bg-primary/15 text-white" : "border-white/15 text-[#93a79a] hover:border-white/40")}>{BIRDS[id].name}</button>
              })}
            </div>
          </div>
          <ChainEditor chain={zone.chain} changed={false} title="Cadeia do ambiente"
            hint="Toda nota rebatida dentro da zona passa por estes passos (a parte “ambiente” da regra de rebate)"
            onChange={fn => { const chain = structuredClone(zone.chain); fn(chain); set({ chain }) }} />
          {!scene && <PatioRange label="Vida das paredes" min={ZONE_LIFE.min} max={ZONE_LIFE.max} value={zone.life} display={zone.life ? `${zone.life} notas` : "Sem paredes"}
            hint="Com vida, as notas quicam nas bordas da zona e cada uma tira 1 ponto. Quando zera, a zona muda pelo padrão e a vida enche de novo."
            onChange={life => set({ life }, "zone-life")} />}
          {!scene && zone.life > 0 && (
            <Field label="Padrão de mudança" hint={zoneChange(zone.change).hint}>
              <select aria-label="Padrão de mudança" value={zone.change} onChange={e => set({ change: e.target.value as ZoneChangeId })} className={field}>
                {(["Geral", "Ritmo", "Harmonia", "Melodia"] as const).map(g => (
                  <optgroup key={g} label={g}>{ZONE_CHANGES.filter(c => c.group === g).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>
                ))}
              </select>
            </Field>
          )}
        </div>
      </details>
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
      <div className="grid grid-cols-2 gap-field">
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
        <div className="grid grid-cols-3 gap-field">
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
      {lanes.layout === "fan" && <div className="grid gap-field">
        <PatioRange label="Abertura" min={10} max={360} step={5} value={lanes.open} display={`${lanes.open}°`} onChange={open => set({ open }, "lanes-open")} />
        <PatioRange label="Começa em" min={0} max={355} step={5} value={lanes.start} display={`${lanes.start}°`} hint="0° = direita, 90° = baixo, 180° = esquerda, 270° = cima" onChange={start => set({ start }, "lanes-start")} />
        <PatioRange label="Altura do centro" min={0} max={Math.round(h)} step={5} value={Math.min(lanes.centerY, Math.round(h))} display={`${Math.min(lanes.centerY, Math.round(h))} px`} hint="Acima da borda de baixo; no meio da caixa dá para abrir um círculo inteiro" onChange={centerY => set({ centerY }, "lanes-center")} />
        <label className="flex items-center justify-between gap-3" title="Só a altura conta, como a mira dos instrumentos">
          <span>Espelhado</span>
          <input type="checkbox" checked={lanes.mirrored} onChange={e => set({ mirrored: e.target.checked })} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
        </label>
      </div>}
      <PatioRange label="Brilho no jogo" min={0} max={100} step={5} value={Math.round(lanes.glow * 100)} display={lanes.glow ? `${Math.round(lanes.glow * 100)}%` : "Invisível"} onChange={v => set({ glow: v / 100 }, "lanes-glow")} />
    </>
  )
}

// ---------- the "Rebate notas" collision ----------

export function SurfaceRebateFields({ rebate, onChange }: { rebate: SurfaceRebate | undefined; onChange: (r: SurfaceRebate | undefined) => void }) {
  const r = rebate ?? defaultSurfaceRebate()
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-field">
      <label className="flex items-center justify-between gap-3" title="As notas quicam nele e tocam de novo">
        <span>Rebate notas</span>
        <input type="checkbox" checked={!!rebate} onChange={e => onChange(e.target.checked ? r : undefined)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
      </label>
      {rebate && <>
        <select aria-label="O que a superfície toca" title={SURFACE_MODES.find(m => m.value === r.mode)?.hint} value={r.mode} onChange={e => onChange({ ...r, mode: e.target.value as SurfaceRebate["mode"] })} className={field}>
          {SURFACE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {r.mode === "chain" && <ChainEditor chain={r.chain} changed={false} title="Cadeia da superfície" hint="Cada nota que quica aqui passa por estes passos"
          onChange={fn => { const chain = structuredClone(r.chain); fn(chain); onChange({ ...r, chain }) }} />}
      </>}
    </div>
  )
}
