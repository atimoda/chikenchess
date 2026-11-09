"use client"

// The tags on a Zona sonora's label (and on each scene's zone): one per parameter, showing only its value. In the
// editor a click moves it to the next value (zone-changes.ts ZONE_STEP; the progression counts down) and the sliders
// (tempo, priority, life) are dragged along the whole tag, its coloured fill following. Viewing only (the header's
// eye outside the editor): the same text in the same place, no background, not clickable.
import { useRef } from "react"
import { cn } from "@/lib/utils"
import { NOTE_NAMES, SCALES } from "@/lib/pigchicken/music"
import { BIRDS } from "@/lib/pigchicken/birds"
import { ZONE_BPM, ZONE_LIFE, ZONE_PRIORITY, chainSummary, normalizeSoundZone, type SoundZoneParams } from "@/lib/pigchicken/sound-zones"
import { FEEL_LABELS, PROGRESSIONS, ZONE_STEP, pcOf, progressionIndex, progressionText, zoneChange } from "@/lib/pigchicken/zone-changes"

const TAG = "relative inline-flex h-7 shrink-0 items-center overflow-hidden whitespace-nowrap rounded px-2 font-mono text-[13px] leading-none"
const VIEW = "pointer-events-none [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]"
const EDIT = "pointer-events-auto select-none bg-black/80 hover:bg-black"
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function CycleTag({ label, title, color, editable, onClick }: { label: React.ReactNode; title: string; color: string; editable: boolean; onClick: () => void }) {
  if (!editable) return <span className={cn(TAG, VIEW)} style={{ color }} title={title}>{label}</span>
  return <button type="button" data-chicken-ignore title={title} aria-label={title} onClick={onClick} className={cn(TAG, EDIT)} style={{ color }}>{label}</button>
}

// a slider the size of a tag: pressing and dragging anywhere on it sets the value, the fill shows where it is.
// `bar`: a value shown as a thin bar under the text when viewing (the zone's life)
function SliderTag({ label, title, color, editable, value, min, max, step = 1, onChange, bar }: {
  label: string; title: string; color: string; editable: boolean; value: number; min: number; max: number; step?: number
  onChange: (v: number, gesture: string) => void; bar?: number
}) {
  const drag = useRef<{ pointer: number; gesture: string } | null>(null)
  const share = clamp((value - min) / (max - min), 0, 1)
  if (!editable) return (
    <span className={cn(TAG, VIEW)} style={{ color }} title={title}>
      {label}
      {bar !== undefined && <span className="absolute bottom-0.5 left-2 right-2 h-[3px] rounded bg-white/20"><span className="block h-full rounded" style={{ width: `${clamp(bar, 0, 1) * 100}%`, background: color }} /></span>}
    </span>
  )
  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const v = min + clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1) * (max - min)
    return clamp(Math.round(v / step) * step, min, max)
  }
  return (
    <div role="slider" tabIndex={0} data-chicken-ignore title={title} aria-label={title} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
      className={cn(TAG, EDIT, "cursor-ew-resize touch-none")} style={{ color, minWidth: 64 }}
      onPointerDown={e => {
        if (e.button !== 0) return
        e.preventDefault(); e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { pointer: e.pointerId, gesture: `${e.pointerId}:${Math.round(e.timeStamp)}` }
        onChange(at(e), drag.current.gesture)
      }}
      onPointerMove={e => { const d = drag.current; if (d && d.pointer === e.pointerId) onChange(at(e), d.gesture) }}
      onPointerUp={e => { if (drag.current?.pointer === e.pointerId) drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
      onKeyDown={e => {
        const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0
        if (d) { e.preventDefault(); e.stopPropagation(); onChange(clamp(value + d * step, min, max), `key:${title}`) }
      }}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0" style={{ width: `${share * 100}%`, background: `${color}55` }} />
      <span className="relative">{label}</span>
    </div>
  )
}

// scene: a scene's own zone (only the music: no priority, walls or birds); live: the zone as it plays now (its life)
export function ZoneTags({ zone, editable, onChange, onOpen, scene = false, live, sceneLabel }: {
  zone: SoundZoneParams; editable: boolean; onChange: (z: SoundZoneParams, step?: string) => void; onOpen: () => void
  scene?: boolean; live?: { hp: number }; sceneLabel?: string
}) {
  const c = zone.color
  const set = (p: Partial<SoundZoneParams>, step?: string) => onChange(normalizeSoundZone({ ...zone, ...p }), step)
  const step = (k: keyof typeof ZONE_STEP) => () => set(ZONE_STEP[k](zone))
  const prog = progressionIndex(zone.progression)
  return <>
    <CycleTag label={`♫ ${sceneLabel ? `${sceneLabel} · ` : ""}${zone.name}`} title="Abrir a configuração da zona" color={c} editable={editable} onClick={onOpen} />
    <CycleTag label={NOTE_NAMES[pcOf(zone.root)]} title="Tom" color={c} editable={editable} onClick={step("root")} />
    <CycleTag label={SCALES[zone.scale].label} title="Escala" color={c} editable={editable} onClick={step("scale")} />
    <CycleTag label={SCALES[zone.chordScale].label} title="Acordes de" color={c} editable={editable} onClick={step("chordScale")} />
    <CycleTag label={FEEL_LABELS[zone.feel]} title="Balanço" color={c} editable={editable} onClick={step("feel")} />
    <SliderTag label={`${zone.bpm} bpm`} title="Andamento" color={c} editable={editable} value={zone.bpm} min={ZONE_BPM.min} max={ZONE_BPM.max} onChange={(bpm, g) => set({ bpm }, `tag-bpm:${g}`)} />
    <CycleTag label={progressionText(zone.progression)} title={`Progressão${prog >= 0 ? `: ${PROGRESSIONS[prog].label}` : ""}`} color={c} editable={editable} onClick={step("progression")} />
    {!scene && <>
      <CycleTag label={zone.chain.length ? chainSummary(zone.chain) : "sem cadeia"} title="Cadeia do ambiente" color={c} editable={editable} onClick={step("chain")} />
      <SliderTag label={`prioridade ${zone.priority}`} title="Prioridade" color={c} editable={editable} value={zone.priority} min={ZONE_PRIORITY.min} max={ZONE_PRIORITY.max} onChange={(priority, g) => set({ priority }, `tag-priority:${g}`)} />
      <CycleTag label={zone.music ? "troca a música" : "só rebates"} title="Troca a música ao entrar" color={c} editable={editable} onClick={step("music")} />
      <CycleTag label={zone.birds.length ? zone.birds.map(b => BIRDS[b].name).join(", ") : "pássaros da cena"} title="Pássaros da zona" color={c} editable={editable} onClick={step("birds")} />
      <SliderTag label={zone.life ? (live && !editable ? `♥ ${live.hp}/${zone.life}` : `♥ ${zone.life}`) : "sem paredes"} title="Vida das paredes (notas até mudar; 0 = sem paredes)" color={c} editable={editable}
        value={zone.life} min={ZONE_LIFE.min} max={ZONE_LIFE.max} bar={zone.life && live ? live.hp / zone.life : undefined} onChange={(life, g) => set({ life }, `tag-life:${g}`)} />
      {zone.life > 0 && <CycleTag label={zoneChange(zone.change).label} title={`Padrão de mudança: ${zoneChange(zone.change).hint}`} color={c} editable={editable} onClick={step("change")} />}
    </>}
    <CycleTag label={<span aria-hidden="true" className="block h-3.5 w-3.5 rounded-sm border border-white/50" style={{ background: c }} />} title="Cor" color={c} editable={editable} onClick={step("color")} />
  </>
}
