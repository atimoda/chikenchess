"use client"

// The Editor Mode's panels for the map's music: a Zona sonora's harmony, rhythm, bass and rules (the same fields for
// a zone of the map and for a scene's own zone); the
// Faixas fixas' layout and notes; and the "Rebate notas" collision of any surface.
import { useEffect, useRef, useState } from "react"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { PatioRange } from "@/components/ui/patio-range"
import { StepSelect } from "@/components/ui/step-select"
import { NOTE_NAMES, SCALES, ZONES, type Feel, type InKeyRule, type ScaleId } from "@/lib/pigchicken/music"
import {
  LANES_MAX, SURFACE_MODES, ZONE_BLOCKS_MAX, ZONE_BLOCK_BEATS, ZONE_BLOCK_REPS, ZONE_BPM, ZONE_LIFE, ZONE_PRIORITY, addZoneBlock, defaultSurfaceRebate, lanesNotes, normalizeLanes, normalizeSoundZone,
  removeZoneBlock, setZoneBlock, setZoneBlockSolo, zoneBlocks,
  type LanesParams, type SoundZoneParams, type SurfaceRebate, type ZoneBlockParams,
} from "@/lib/pigchicken/sound-zones"
import {
  AMBIENCE_VOL, BASSES, BASS_GROUPS, BASS_OCT, BEATS, BEAT_GROUPS, SILENCE, ambiencePattern, ambienceRows, ambienceKit, beatOf, beatPatterns, beatSilent, isBass, isBeat, microAt, withBeat,
  type ZoneAmbience,
} from "@/lib/pigchicken/zone-ambience"
import { rowLabel } from "@/lib/pigchicken/beat-kits"
import { PatioKnob } from "@/components/ui/patio-knob"
import { BeatGridEditor } from "./beat-grid-editor"
import { ChainEditor } from "./chain-editor"
import { BIRDS, BIRD_IDS } from "@/lib/pigchicken/birds"
import { LanesArt } from "./sound-zone-art"
import { GRAVITIES, ZONE_TIME, gravityOf, isGravity } from "@/lib/pigchicken/zone-physics"
import { ZONE_STYLES, ZONE_STYLE_GROUPS, presetOf, presetSequence, zonePreset } from "@/lib/pigchicken/zone-styles"
import { PROGRESSIONS, ZONE_CHANGES, chordScalesFor, fitChords, progressionIndex, zoneChange, type ZoneChangeId } from "@/lib/pigchicken/zone-changes"

const field = "h-9 w-full min-w-0 rounded-md border border-white/15 bg-[#0b110e] px-2"
// a dropdown that shares its line with knobs: less padding, so its value fits
const NARROW = "h-9 w-full min-w-0 rounded-md border border-white/15 bg-[#0b110e] px-0.5"
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
    <StepSelect aria-label={label} title={label} value={pcOf(value)} onChange={e => onChange(rootOf(Number(e.target.value)))} className={field}>
      {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
    </StepSelect>
  )
}

// ---------- Zona sonora ----------

// the panel's sections open and close like the Personagem panel's groups (yellow titles); which ones are open is kept
// while the page is open, so another zone opens the same ones
const openSections: Record<string, boolean> = {}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const key = title.split(" · ")[0]
  const [open, setOpen] = useState(!!openSections[key])
  return (
    <PatioDisclosure title={title} open={open} onToggle={v => { openSections[key] = v; setOpen(v) }}>
      {open && <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-field px-4 pb-4">{children}</div>}
    </PatioDisclosure>
  )
}
const OCTAVES = Array.from({ length: BASS_OCT.max - BASS_OCT.min + 1 }, (_, i) => BASS_OCT.min + i)

// One component for every Zona sonora. scene: a scene's own zone, stuck to the ground (no priority and no walls:
// any zone of the map wins over it, and it has no edges for the notes to bounce off)
export function SoundZoneFields({ zone, onChange, scene = false }: { zone: SoundZoneParams; onChange: (z: SoundZoneParams, step?: string) => void; scene?: boolean }) {
  const set = (p: Partial<SoundZoneParams>, step?: string) => onChange(normalizeSoundZone({ ...zone, ...p }), step)
  // the variation blocks: the harmony, rhythm and bass below are the chosen block's (the first is the zone's own)
  const blocks = zoneBlocks(zone)
  const [picked, setPicked] = useState(0)
  const at = Math.min(picked, blocks.length - 1), cur = blocks[at]
  const setSeq = (p: Partial<ZoneBlockParams>, step?: string) => onChange(setZoneBlock(zone, at, p), step)
  // while the panel is open the chosen block plays alone, so a change is heard at once (off: the whole cycle)
  const [solo, setSolo] = useState(true)
  useEffect(() => { setZoneBlockSolo(blocks.length > 1 && solo ? at : null); return () => setZoneBlockSolo(null) }, [at, solo, blocks.length])
  const amb = cur.ambience
  const setAmb = (p: Partial<ZoneAmbience>, step?: string) => setSeq({ ambience: { ...amb, ...p } }, step)
  const beat = beatOf(amb.beat), patterns = beatPatterns(beat), silent = beatSilent(amb)
  const kit = ambienceKit(amb)
  // the name as typed: it may be empty (the placeholder shows) or end in a space while the zone keeps its tidy name
  const [nameText, setNameText] = useState(zone.name)
  const typedName = useRef(zone.name)
  // a preset or an undo changed it: the field follows
  useEffect(() => { if (zone.name !== typedName.current) { typedName.current = zone.name; setNameText(zone.name) } }, [zone.name])
  const progText = cur.progression.map(d => d + 1).join(" ")
  const [prog, setProg] = useState(progText)
  // a tag on the label changed it: the text follows
  useEffect(() => { setProg(t => (t.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 7).join(" ") === progText ? t : progText)) }, [progText])
  const preset = progressionIndex(cur.progression)
  // the degrees are typed only for a progression of its own
  const [ownProg, setOwnProg] = useState(preset < 0)
  const typing = ownProg || preset < 0
  // a new block: a copy of the chosen one, on the next pattern of its rhythm (its variations in turn) when it has one
  const addBlock = () => {
    const next = !amb.drums && patterns.length > 1 ? ((amb.variant ?? 0) + 1) % patterns.length : -1
    const z = addZoneBlock(zone, at, next < 0 ? {} : { ambience: withBeat(amb, amb.beat, next), beats: patterns[next].beats ?? ZONE_BLOCK_BEATS.initial, reps: patterns[next].reps ?? ZONE_BLOCK_REPS.initial })
    if (z) { onChange(z); setPicked(at + 1) }
  }
  const tab = "h-8 min-w-8 rounded-md border px-2 tabular-nums "
  // with more than one block, the sections that are the block's say which one they edit
  const ofBlock = blocks.length > 1 ? ` · bloco ${at + 1}` : ""
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-field">
        <input aria-label="Nome da zona" title="Nome" placeholder="Nome" maxLength={40} value={nameText} onChange={e => {
          const z = normalizeSoundZone({ ...zone, name: e.target.value })
          setNameText(e.target.value); typedName.current = z.name; onChange(z, "zone-name")
        }} className={`${field} placeholder:text-[#5f6f65]`} />
        <input aria-label="Cor da zona" title="Cor" type="color" value={zone.color} onChange={e => set({ color: e.target.value }, "zone-color")} className="h-9 w-12 rounded-md border border-white/15 bg-transparent" />
      </div>
      <StepSelect aria-label="Estilo" title="Estilo: a zona inteira (tom, acordes, andamento, batida e baixo) de uma cena ou de um ritmo" value={presetOf(cur)} onChange={e => {
        if (e.target.value === "silence") return setSeq({ ambience: { ...SILENCE } })
        const z = zonePreset(e.target.value)
        if (!z) return
        const seq = presetSequence(z)
        // the block's volumes and the bass's octave stay
        onChange(setZoneBlock(normalizeSoundZone({ ...zone, name: z.name, color: z.color }), at, { ...seq, ambience: { ...seq.ambience, beatVol: amb.beatVol, bassVol: amb.bassVol, bassOct: amb.bassOct } }))
        setProg(z.progression.map(d => d + 1).join(" ")); setOwnProg(progressionIndex(z.progression) < 0)
      }} className={field}>
        <option value="" data-skip>Escolher estilo…</option>
        <option value="silence">Silêncio</option>
        <optgroup label="Cenas">{ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</optgroup>
        {ZONE_STYLE_GROUPS.map(g => <optgroup key={g} label={g}>{ZONE_STYLES.filter(s => s.group === g).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}
      </StepSelect>

      <div className="-mx-4 border-t border-white/10">
      <Section title="Blocos">
      <div className="flex flex-wrap gap-field" title="Variações da harmonia, do ritmo e do baixo, tocadas uma depois da outra">
        {blocks.map((_, i) => (
          <button key={i} type="button" aria-label={`Bloco ${i + 1}`} aria-pressed={i === at} onClick={() => setPicked(i)}
            className={tab + (i === at ? "border-primary bg-primary/25 text-white" : "border-white/15 text-[#93a79a] hover:border-white/40")}>{i + 1}</button>
        ))}
        {blocks.length < ZONE_BLOCKS_MAX && <button type="button" aria-label="Adicionar bloco" title="Novo bloco, cópia deste na próxima variação do ritmo" onClick={addBlock} className={tab + "border-white/15 text-white hover:border-white/40"}>+</button>}
        {blocks.length > 1 && <button type="button" aria-label="Remover este bloco" title="Remover este bloco" onClick={() => { onChange(removeZoneBlock(zone, at)); setPicked(Math.max(0, at - 1)) }} className={tab + "border-white/15 text-white hover:border-white/40"}>−</button>}
      </div>
      {blocks.length > 1 && (
        <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-end gap-x-3">
          <PatioKnob label="Tempos" name="Tempos do bloco" hint="Quantos tempos do bloco tocam antes de recomeçar (4 tempos: um compasso)" min={ZONE_BLOCK_BEATS.min} max={ZONE_BLOCK_BEATS.max} initial={ZONE_BLOCK_BEATS.initial} value={cur.beats} onChange={beats => setSeq({ beats }, "zone-block-beats")} />
          <PatioKnob label="Repete" name="Repetições do bloco" hint="Quantas vezes o bloco toca antes de passar ao próximo" min={ZONE_BLOCK_REPS.min} max={ZONE_BLOCK_REPS.max} initial={ZONE_BLOCK_REPS.initial} value={cur.reps} display={`${cur.reps}×`} onChange={reps => setSeq({ reps }, "zone-block-reps")} />
          <button type="button" aria-pressed={solo} title="Tocar só este bloco enquanto o painel está aberto" onClick={() => setSolo(v => !v)}
            className={"h-9 justify-self-end rounded-md border px-3 " + (solo ? "border-primary bg-primary/25 text-white" : "border-white/15 text-[#93a79a] hover:border-white/40")}>Solo</button>
        </div>
      )}
      </Section>

      <Section title={`Harmonia${ofBlock}`}>
      <div className="grid grid-cols-2 gap-field">
        <KeySelect value={cur.root} onChange={root => setSeq({ root })} />
        <StepSelect aria-label="Escala" title="Escala" value={cur.scale} onChange={e => { const scale = e.target.value as ScaleId; setSeq({ scale, chordScale: fitChords(scale, cur.chordScale) }) }} className={field}>
          {SCALE_IDS.map(s => <option key={s} value={s}>{SCALES[s].label}</option>)}
        </StepSelect>
        <StepSelect aria-label="Escala dos acordes" title="Acordes de" value={cur.chordScale} onChange={e => setSeq({ chordScale: e.target.value as ScaleId })} className={field}>
          {CHORD_SCALES.map(s => <option key={s} value={s}>{SCALES[s].label}{chordScalesFor(cur.scale).includes(s) ? "" : " (desafina)"}</option>)}
        </StepSelect>
        <StepSelect aria-label="Progressão" title="Progressão: um acorde por compasso" value={typing ? -1 : preset} onChange={e => {
          const p = PROGRESSIONS[Number(e.target.value)]
          setOwnProg(!p)
          if (p) { setSeq({ progression: p.degrees.slice() }); setProg(p.degrees.map(d => d + 1).join(" ")) }
        }} className={field}>
          {PROGRESSIONS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
          <option value={-1}>Própria</option>
        </StepSelect>
      </div>
      {typing && (
        <input aria-label="Graus da progressão" title="Graus de 1 a 7, um acorde por compasso. Ex.: 1 5 6 4" value={prog} onChange={e => {
          setProg(e.target.value)
          const degrees = e.target.value.split(/[\s,]+/).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 7).map(n => n - 1)
          if (degrees.length) setSeq({ progression: degrees }, "zone-prog")
        }} className={field} />
      )}
      </Section>

      <Section title={`Ritmo${ofBlock}`}>
      <div className="grid grid-cols-[auto_auto_minmax(0,1.2fr)_minmax(0,1fr)] items-end gap-x-1.5">
        <PatioKnob label="Volume" name="Volume da batida" hint="Parcela do volume Ambiente" min={AMBIENCE_VOL.min} max={AMBIENCE_VOL.max} step={AMBIENCE_VOL.step} initial={100} dimmed={silent} value={amb.beatVol ?? 100} onChange={beatVol => setAmb({ beatVol }, "zone-beat-vol")} />
        <PatioKnob label="BPM" name="Andamento" min={ZONE_BPM.min} max={ZONE_BPM.max} value={cur.bpm} onChange={bpm => setSeq({ bpm }, "zone-bpm")} />
        <StepSelect aria-label="Batida" title="Batida" value={amb.drums ? "own" : amb.beat} onChange={e => { if (isBeat(e.target.value)) setSeq({ ambience: withBeat(amb, e.target.value) }) }} className={NARROW}>
          {amb.drums && <option value="own">Própria</option>}
          <option value="none">Silêncio</option>
          {BEAT_GROUPS.map(g => <optgroup key={g} label={g}>{BEATS.filter(b => b.group === g).map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</optgroup>)}
        </StepSelect>
        <StepSelect aria-label="Balanço" title="Balanço: como o tempo é sentido. Atrasa o contratempo nas batidas sem balanço próprio (Swing) ou puxa as notas para a metade (Meio tempo)" value={cur.feel} onChange={e => setSeq({ feel: e.target.value as Feel })} className={NARROW}>
          {(Object.keys(FEEL_LABELS) as Feel[]).map(f => <option key={f} value={f}>{FEEL_LABELS[f]}</option>)}
        </StepSelect>
      </div>
      {patterns.length > 1 && (
        <Field label="Variação" hint="Os padrões deste ritmo: o de base e as variações dele">
          <StepSelect aria-label="Variação da batida" value={amb.drums ? "own" : amb.variant ?? 0} onChange={e => { if (e.target.value !== "own") setSeq({ ambience: withBeat(amb, amb.beat, Number(e.target.value)) }) }} className={field}>
            {amb.drums && <option value="own">Própria</option>}
            {patterns.map((p, i) => <option key={i} value={i}>{i ? p.label : "Base"}</option>)}
          </StepSelect>
        </Field>
      )}
      <div className="pt-1">
        <BeatGridEditor pattern={ambiencePattern(amb)} rows={ambienceRows(amb).map(r => ({ id: r.id, label: rowLabel(kit, r.id) }))} color={zone.color} bpm={cur.bpm}
          seed={step => microAt(beat, step)} onChange={p => setAmb({ variant: undefined, drums: p.grid, drumTime: p.time })} />
      </div>
      </Section>

      <Section title={`Baixo${ofBlock}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-x-2">
        <PatioKnob label="Volume" name="Volume do baixo" hint="Parcela do volume Ambiente" min={AMBIENCE_VOL.min} max={AMBIENCE_VOL.max} step={AMBIENCE_VOL.step} initial={100} dimmed={amb.bass === "none"} value={amb.bassVol ?? 100} onChange={bassVol => setAmb({ bassVol }, "zone-bass-vol")} />
        <Field label="Som">
          <StepSelect aria-label="Baixo" value={amb.bass} onChange={e => { if (isBass(e.target.value)) setAmb({ bass: e.target.value }) }} className={field}>
            <option value="none">Silêncio</option>
            {BASS_GROUPS.map(g => <optgroup key={g} label={g}>{BASSES.filter(b => b.group === g).map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</optgroup>)}
          </StepSelect>
        </Field>
        <Field label="Oitava">
          <StepSelect aria-label="Oitava do baixo" value={amb.bassOct ?? 0} onChange={e => setAmb({ bassOct: Number(e.target.value) })} className={field}>
            {OCTAVES.map(o => <option key={o} value={o}>{o > 0 ? `+${o}` : o}</option>)}
          </StepSelect>
        </Field>
      </div>
      </Section>

      <Section title="Gravidade">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-field">
        <StepSelect aria-label="Gravidade" title="Gravidade: a de um planeta, da Lua ou do Sol, em relação à da Terra" value={gravityOf(zone.gravity).id} onChange={e => { if (isGravity(e.target.value)) set({ gravity: e.target.value }) }} className={field}>
          {GRAVITIES.map(p => <option key={p.id} value={p.id}>{p.label} · {Math.round(p.g * 100)}%</option>)}
        </StepSelect>
        <label className="flex items-center gap-2" title="Todo boneco dentro da zona aparece em raio-x">
          <span>Raio-x</span>
          <input type="checkbox" checked={!!zone.xray} onChange={e => set({ xray: e.target.checked ? true : undefined })} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
        </label>
      </div>
      <PatioRange label="Tempo" min={ZONE_TIME.min} max={ZONE_TIME.max} step={ZONE_TIME.step} value={zone.time ?? ZONE_TIME.initial} changed={(zone.time ?? ZONE_TIME.initial) !== ZONE_TIME.initial} onReset={() => set({ time: undefined })} display={`${zone.time ?? ZONE_TIME.initial}%`}
        hint="Abaixo de 100%, tudo dentro da zona (galinhas, tiros, itens, inimigos) anda em câmera lenta; acima, acelera. A música não muda."
        onChange={time => set({ time }, "zone-time")} />
      </Section>

      <Section title="Notas e regras">
          <Field label="Dano nos inimigos" hint="Notas fora da regra resvalam sem harmonizar">
            <StepSelect aria-label="Dano nos inimigos" value={zone.inKey ?? ""} onChange={e => set({ inKey: (e.target.value || undefined) as InKeyRule | undefined })} className={field}>
              {(Object.keys(IN_KEY_LABELS) as (InKeyRule | "")[]).map(k => <option key={k} value={k}>{IN_KEY_LABELS[k]}</option>)}
            </StepSelect>
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
              <StepSelect aria-label="Padrão de mudança" value={zone.change} onChange={e => set({ change: e.target.value as ZoneChangeId })} className={field}>
                {(["Geral", "Ritmo", "Harmonia", "Melodia"] as const).map(g => (
                  <optgroup key={g} label={g}>{ZONE_CHANGES.filter(c => c.group === g).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>
                ))}
              </StepSelect>
            </Field>
          )}
      </Section>
      </div>
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
          <StepSelect aria-label="Disposição das faixas" value={lanes.layout} onChange={e => set({ layout: e.target.value as LanesParams["layout"] })} className={field}>
            <option value="fan">Leque</option>
            <option value="columns">Colunas</option>
          </StepSelect>
        </Field>
        <Field label="Sentido">
          <StepSelect aria-label="Sentido das faixas" value={lanes.dir} onChange={e => set({ dir: Number(e.target.value) === -1 ? -1 : 1 })} className={field}>
            <option value={1}>{lanes.layout === "fan" ? "Horário" : "Grave à esquerda"}</option>
            <option value={-1}>{lanes.layout === "fan" ? "Anti-horário" : "Grave à direita"}</option>
          </StepSelect>
        </Field>
      </div>
      <Field label="Notas">
        <StepSelect aria-label="Conteúdo das faixas" value={c.kind} onChange={e => {
          if (e.target.value === "notes") { const notes = lanesNotes(lanes); setNotesText(notes.map(n => n ?? "-").join(" ")); set({ content: { kind: "notes", notes } }) }
          else set({ content: { kind: "scale", root: 60, scale: "majorPenta", low: 60, octaves: 2 } })
        }} className={field}>
          <option value="scale">Uma escala repartida nas faixas</option>
          <option value="notes">Uma nota escolhida por faixa</option>
        </StepSelect>
      </Field>
      {c.kind === "scale" ? (
        <div className="grid grid-cols-3 gap-field">
          <Field label="Tom"><KeySelect value={c.root} onChange={root => set({ content: { ...c, root, low: root + 12 * Math.round((c.low - c.root) / 12) } })} /></Field>
          <Field label="Escala">
            <StepSelect aria-label="Escala das faixas" value={c.scale} onChange={e => set({ content: { ...c, scale: e.target.value as ScaleId } })} className={field}>
              {SCALE_IDS.map(s => <option key={s} value={s}>{SCALES[s].label}</option>)}
            </StepSelect>
          </Field>
          <Field label="Oitavas">
            <StepSelect aria-label="Oitavas das faixas" value={c.octaves} onChange={e => set({ content: { ...c, octaves: Number(e.target.value) } })} className={field}>
              {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </StepSelect>
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
        <StepSelect aria-label="O que a superfície toca" title={SURFACE_MODES.find(m => m.value === r.mode)?.hint} value={r.mode} onChange={e => onChange({ ...r, mode: e.target.value as SurfaceRebate["mode"] })} className={field}>
          {SURFACE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </StepSelect>
        {r.mode === "chain" && <ChainEditor chain={r.chain} changed={false} title="Cadeia da superfície" hint="Cada nota que quica aqui passa por estes passos"
          onChange={fn => { const chain = structuredClone(r.chain); fn(chain); onChange({ ...r, chain }) }} />}
      </>}
    </div>
  )
}
