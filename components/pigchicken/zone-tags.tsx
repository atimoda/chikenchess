"use client"

// The tags on a Zona sonora's label (and on each scene's zone): one per parameter, showing only its value. In the
// editor a click moves it to the next value (zone-slam.ts nextZoneTag; the progression counts down) and the sliders
// (tempo, priority, life) are dragged along the whole tag, its coloured fill following. Viewing only (the header's
// eye outside the editor): the same text in the same place, no background, not clickable. Each tag carries
// data-zone-tag (its key), for the slams on the scenes' strip (music-zones-layer.tsx). A value that changes flips
// like a departures board: the old text drops down out of the tag and the new one comes in from above.
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { NOTE_NAMES, SCALES } from "@/lib/pigchicken/music"
import { BIRDS } from "@/lib/pigchicken/birds"
import { ZONE_BPM, ZONE_LIFE, ZONE_PRIORITY, chainSummary, normalizeSoundZone, type SoundZoneParams } from "@/lib/pigchicken/sound-zones"
import { bassLabel, beatName } from "@/lib/pigchicken/zone-ambience"
import { gravityLabel, zoneTimeLabel } from "@/lib/pigchicken/zone-physics"
import { FEEL_LABELS, PROGRESSIONS, pcOf, progressionIndex, progressionText, zoneChange } from "@/lib/pigchicken/zone-changes"
import { nextZoneTag, type ZoneTagKey } from "@/lib/pigchicken/zone-slam"

const TAG = "relative inline-flex h-7 shrink-0 items-center overflow-hidden whitespace-nowrap rounded px-2 font-mono text-[13px] leading-none"
const VIEW = "pointer-events-none [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]"
const EDIT = "pointer-events-auto select-none bg-black/80 hover:bg-black"
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// The value shown in a tag: when `k` changes the old value drops out and the new one comes in from above (the tag
// clips both to its line). render: how a value is drawn (its text by default); still: no flip (a slider being
// dragged changes its value every moment)
function Flip({ k, render = v => v, still }: { k: string; render?: (k: string) => React.ReactNode; still?: boolean }) {
  const [shown, setShown] = useState<{ k: string; out: string | null; n: number }>({ k, out: null, n: 0 })
  if (shown.k !== k) setShown({ k, out: still ? null : shown.k, n: shown.n + 1 })
  const { out, n } = shown
  return (
    <span className="relative inline-flex items-center">
      {out !== null && <span key={`out${n}`} aria-hidden="true" className="zone-flip-out absolute left-0 top-0 inline-flex items-center whitespace-nowrap"
        onAnimationEnd={() => setShown(v => (v.n === n ? { ...v, out: null } : v))}>{render(out)}</span>}
      <span key={`in${n}`} className={cn("inline-flex items-center", out !== null && "zone-flip-in")}>{render(k)}</span>
    </span>
  )
}

// tag: its key (data-zone-tag); label: the value's text, or render draws it (the colour's swatch)
function CycleTag({ tag, label, render, title, color, editable, onClick }: { tag: ZoneTagKey; label: string; render?: (k: string) => React.ReactNode; title: string; color: string; editable: boolean; onClick: () => void }) {
  const shown = <Flip k={label} render={render} />
  if (!editable) return <span data-zone-tag={tag} className={cn(TAG, VIEW)} style={{ color }} title={title}>{shown}</span>
  return <button type="button" data-zone-tag={tag} data-chicken-ignore title={title} aria-label={title} onClick={onClick} className={cn(TAG, EDIT)} style={{ color }}>{shown}</button>
}

// a slider the size of a tag: pressing and dragging anywhere on it sets the value, the fill shows where it is.
// `bar`: a value shown as a thin bar under the text when viewing (the zone's life)
function SliderTag({ tag, label, title, color, editable, value, min, max, step = 1, onChange, bar }: {
  tag: ZoneTagKey; label: string; title: string; color: string; editable: boolean; value: number; min: number; max: number; step?: number
  onChange: (v: number, gesture: string) => void; bar?: number
}) {
  const drag = useRef<{ pointer: number; gesture: string } | null>(null)
  // while dragged the value changes every moment: no flip
  const [dragging, setDragging] = useState(false)
  const share = clamp((value - min) / (max - min), 0, 1)
  if (!editable) return (
    <span data-zone-tag={tag} className={cn(TAG, VIEW)} style={{ color }} title={title}>
      <Flip k={label} />
      {bar !== undefined && <span className="absolute bottom-0.5 left-2 right-2 h-[3px] rounded bg-white/20"><span className="block h-full rounded" style={{ width: `${clamp(bar, 0, 1) * 100}%`, background: color }} /></span>}
    </span>
  )
  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const v = min + clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1) * (max - min)
    return clamp(Math.round(v / step) * step, min, max)
  }
  return (
    <div role="slider" tabIndex={0} data-zone-tag={tag} data-chicken-ignore title={title} aria-label={title} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
      className={cn(TAG, EDIT, "cursor-ew-resize touch-none")} style={{ color, minWidth: 64 }}
      onPointerDown={e => {
        if (e.button !== 0) return
        e.preventDefault(); e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { pointer: e.pointerId, gesture: `${e.pointerId}:${Math.round(e.timeStamp)}` }
        setDragging(true)
        onChange(at(e), drag.current.gesture)
      }}
      onPointerMove={e => { const d = drag.current; if (d && d.pointer === e.pointerId) onChange(at(e), d.gesture) }}
      onPointerUp={e => { if (drag.current?.pointer === e.pointerId) { drag.current = null; setDragging(false) } }}
      onPointerCancel={() => { drag.current = null; setDragging(false) }}
      onKeyDown={e => {
        const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0
        if (d) { e.preventDefault(); e.stopPropagation(); onChange(clamp(value + d * step, min, max), `key:${title}`) }
      }}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0" style={{ width: `${share * 100}%`, background: `${color}55` }} />
      <span className="relative"><Flip k={label} still={dragging} /></span>
    </div>
  )
}

// scene: a scene's own zone, stuck to the ground (no priority and no walls); live: the zone as it plays now (its life)
export function ZoneTags({ zone, editable, onChange, onOpen, scene = false, live, sceneLabel }: {
  zone: SoundZoneParams; editable: boolean; onChange: (z: SoundZoneParams, step?: string) => void; onOpen: () => void
  scene?: boolean; live?: { hp: number }; sceneLabel?: string
}) {
  const c = zone.color
  const set = (p: Partial<SoundZoneParams>, step?: string) => onChange(normalizeSoundZone({ ...zone, ...p }), step)
  const step = (k: ZoneTagKey) => () => { const next = nextZoneTag(zone, k); if (next) onChange(next) }
  const prog = progressionIndex(zone.progression)
  return <>
    <CycleTag tag="name" label={`♫ ${sceneLabel ? `${sceneLabel} · ` : ""}${zone.name}`} title="Abrir a configuração da zona" color={c} editable={editable} onClick={onOpen} />
    <CycleTag tag="root" label={NOTE_NAMES[pcOf(zone.root)]} title="Tom" color={c} editable={editable} onClick={step("root")} />
    <CycleTag tag="scale" label={SCALES[zone.scale].label} title="Escala" color={c} editable={editable} onClick={step("scale")} />
    <CycleTag tag="chordScale" label={SCALES[zone.chordScale].label} title="Acordes de" color={c} editable={editable} onClick={step("chordScale")} />
    <CycleTag tag="feel" label={FEEL_LABELS[zone.feel]} title="Balanço" color={c} editable={editable} onClick={step("feel")} />
    <SliderTag tag="bpm" label={`${zone.bpm} bpm`} title="Andamento" color={c} editable={editable} value={zone.bpm} min={ZONE_BPM.min} max={ZONE_BPM.max} onChange={(bpm, g) => set({ bpm }, `tag-bpm:${g}`)} />
    <CycleTag tag="progression" label={progressionText(zone.progression)} title={`Progressão${prog >= 0 ? `: ${PROGRESSIONS[prog].label}` : ""}`} color={c} editable={editable} onClick={step("progression")} />
    <CycleTag tag="beat" label={`♪ ${beatName(zone.ambience)}`} title="Batida" color={c} editable={editable} onClick={step("beat")} />
    <CycleTag tag="bass" label={`♩ ${bassLabel(zone.ambience.bass)}`} title="Baixo" color={c} editable={editable} onClick={step("bass")} />
    <CycleTag tag="chain" label={zone.chain.length ? chainSummary(zone.chain) : "sem cadeia"} title="Cadeia do ambiente" color={c} editable={editable} onClick={step("chain")} />
    {!scene && <SliderTag tag="priority" label={`prioridade ${zone.priority}`} title="Prioridade" color={c} editable={editable} value={zone.priority} min={ZONE_PRIORITY.min} max={ZONE_PRIORITY.max} onChange={(priority, g) => set({ priority }, `tag-priority:${g}`)} />}
    <CycleTag tag="music" label={zone.music ? "troca a música" : "só rebates"} title="Troca a música ao entrar" color={c} editable={editable} onClick={step("music")} />
    <CycleTag tag="gravity" label={gravityLabel(zone.gravity)} title="Gravidade" color={c} editable={editable} onClick={step("gravity")} />
    <CycleTag tag="time" label={zoneTimeLabel(zone.time)} title="Tempo: abaixo de 100%, tudo dentro da zona anda em câmera lenta" color={c} editable={editable} onClick={step("time")} />
    <CycleTag tag="xray" label={zone.xray ? "raio-x" : "sem raio-x"} title="Raio-x: todo boneco dentro da zona aparece em raio-x" color={c} editable={editable} onClick={step("xray")} />
    <CycleTag tag="birds" label={zone.birds.length ? zone.birds.map(b => BIRDS[b].name).join(", ") : "pássaros da cena"} title="Pássaros da zona" color={c} editable={editable} onClick={step("birds")} />
    {!scene && <>
      <SliderTag tag="life" label={zone.life ? (live && !editable ? `♥ ${live.hp}/${zone.life}` : `♥ ${zone.life}`) : "sem paredes"} title="Vida das paredes (notas até mudar; 0 = sem paredes)" color={c} editable={editable}
        value={zone.life} min={ZONE_LIFE.min} max={ZONE_LIFE.max} bar={zone.life && live ? live.hp / zone.life : undefined} onChange={(life, g) => set({ life }, `tag-life:${g}`)} />
      {zone.life > 0 && <CycleTag tag="change" label={zoneChange(zone.change).label} title={`Padrão de mudança: ${zoneChange(zone.change).hint}`} color={c} editable={editable} onClick={step("change")} />}
    </>}
    <CycleTag tag="color" label={c} render={k => <span aria-hidden="true" className="block h-3.5 w-3.5 rounded-sm border border-white/50" style={{ background: k }} />} title="Cor" color={c} editable={editable} onClick={step("color")} />
  </>
}
