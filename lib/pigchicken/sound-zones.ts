// The map's own music (Editor Mode): the Zona sonora element (a box with its key, scale, tempo and ambience chain),
// the Faixas fixas element (lanes fixed to the map that force the note of anything rebated inside them) and the
// "Rebate notas" collision (a surface the notes bounce off, playing through its own chain, the last item's or as
// they are). All data: the layout stores them, combat asks what a point of the map plays.
import { SCALES, ZONES, NOTE_NAMES, type Feel, type ScaleId, type Zone } from './music'
import { fanLaneAt, fanLanes, fanNotes, type Fan, type FanContent } from './fan'
import { CHAIN_MAX, TRANSFORMS, cleanTransform, degreeOf, type Transform } from './transforms'
import { isBirdId, type BirdId } from './birds'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const SCALE_IDS = Object.keys(SCALES) as ScaleId[]
const FEELS: Feel[] = ['straight', 'swing', 'half']
const isScale = (v: unknown): v is ScaleId => typeof v === 'string' && v in SCALES
const COLOR = /^#[0-9a-f]{6}$/i

export function cleanChain(v: unknown): Transform[] {
  return Array.isArray(v) ? v.map(cleanTransform).filter((t): t is Transform => !!t).slice(0, CHAIN_MAX) : []
}

// ---------- Zona sonora ----------

export type SoundZoneParams = {
  name: string
  root: number; scale: ScaleId; chordScale: ScaleId; bpm: number; feel: Feel; progression: number[]; color: string
  // the ambience's transformations: every note rebated inside it goes through them (the "ambiente" of the rule)
  chain: Transform[]
  // where zones overlap the higher one wins; any zone wins over the scene's
  priority: number
  // walking in changes the music (key, scale, tempo); off: it only changes the notes rebated inside it
  music: boolean
  // the birds the aliens become inside it (empty: the scene's)
  birds: BirdId[]
}
export const ZONE_PRIORITY = { min: 1, max: 9 }
export const ZONE_BPM = { min: 40, max: 200 }

// a new zone starts as a copy of one of the scenes' (the Noite by default), so it sounds right away
export function defaultSoundZone(from: Zone = ZONES[1]): SoundZoneParams {
  return {
    name: from.name, root: from.root, scale: from.scale, chordScale: from.chordScale, bpm: from.bpm, feel: from.feel,
    progression: from.progression.slice(), color: from.color, chain: [], priority: 1, music: true, birds: [],
  }
}

export function normalizeSoundZone(raw: unknown): SoundZoneParams {
  const d = defaultSoundZone()
  if (!raw || typeof raw !== 'object') return d
  const z = raw as Record<string, unknown>
  const prog = Array.isArray(z.progression) ? z.progression.filter(n => typeof n === 'number' && Number.isFinite(n)).map(n => clamp(Math.round(n as number), 0, 6)).slice(0, 16) : []
  return {
    name: String(z.name ?? d.name).trim().slice(0, 40) || d.name,
    root: Math.round(clamp(num(z.root, d.root), 36, 84)),
    scale: isScale(z.scale) ? z.scale : d.scale,
    chordScale: isScale(z.chordScale) && SCALES[z.chordScale].steps.length === 7 ? z.chordScale : d.chordScale,
    bpm: Math.round(clamp(num(z.bpm, d.bpm), ZONE_BPM.min, ZONE_BPM.max)),
    feel: FEELS.includes(z.feel as Feel) ? (z.feel as Feel) : d.feel,
    progression: prog.length ? prog : d.progression,
    color: typeof z.color === 'string' && COLOR.test(z.color) ? z.color : d.color,
    chain: cleanChain(z.chain),
    priority: Math.round(clamp(num(z.priority, d.priority), ZONE_PRIORITY.min, ZONE_PRIORITY.max)),
    music: z.music !== false,
    birds: Array.isArray(z.birds) ? [...new Set(z.birds.filter(isBirdId))] : [],
  }
}

// the conductor's zone for a Zona sonora element: its id names the element and what it sounds like, so the conductor
// keeps it while it stays the same and takes an edited one on the next bar
export function soundZoneOf(id: string, p: SoundZoneParams): Zone {
  return { id: `zona:${id}:${p.root}:${p.scale}:${p.chordScale}:${p.bpm}:${p.feel}:${p.progression.join('.')}`, name: p.name, root: p.root, scale: p.scale, chordScale: p.chordScale, bpm: p.bpm, feel: p.feel, progression: p.progression, color: p.color }
}

// a short reading of a chain: "+3ª", "+1 oit", "eco"…
export function chainSummary(chain: Transform[]) {
  return chain.map(t => {
    if (t.kind === 'transpose') return t.mode === 'semitone' ? `${t.n >= 0 ? '+' : ''}${t.n} st` : `${t.n >= 0 ? '+' : '-'}${Math.abs(t.n) + 1}ª`
    if (t.kind === 'octave') return t.mode === 'random' ? `oit ±${Math.abs(t.n)}` : `${t.n >= 0 ? '+' : ''}${t.n} oit`
    return TRANSFORMS[t.kind].label.toLowerCase()
  }).join(' ')
}

// "Noite · Lá pentatônica menor · 88 bpm · +3ª"
export function soundZoneLabel(p: Pick<SoundZoneParams, 'name' | 'root' | 'scale' | 'bpm'> & { chain?: Transform[] }) {
  const chain = p.chain?.length ? ` · ${chainSummary(p.chain)}` : ''
  return `${p.name} · ${NOTE_NAMES[((p.root % 12) + 12) % 12]} ${SCALES[p.scale].label.toLowerCase()} · ${p.bpm} bpm${chain}`
}

// ---------- Faixas fixas ----------

export type LanesParams = {
  // fan: lanes around a point (like hers); columns: side by side across the box
  layout: 'fan' | 'columns'
  open: number; start: number; dir: 1 | -1; mirrored: boolean
  // the fan's centre, px above the box's bottom (0: on the bottom edge; half the height: the middle, for a full circle)
  centerY: number
  content: FanContent
  widths?: number[]
  // how strongly the lanes show in the game (0: invisible, only the editor shows them)
  glow: number
}
export const LANES_MAX = 24

export function defaultLanes(): LanesParams {
  return { layout: 'fan', open: 180, start: 180, dir: 1, mirrored: false, centerY: 0, content: { kind: 'scale', root: 60, scale: 'majorPenta', low: 60, octaves: 2 }, glow: 0.35 }
}

function cleanContent(raw: unknown, d: FanContent): FanContent {
  if (!raw || typeof raw !== 'object') return d
  const c = raw as Record<string, unknown>
  if (c.kind === 'notes' && Array.isArray(c.notes)) {
    const notes = c.notes.slice(0, LANES_MAX).map(n => (typeof n === 'number' && Number.isFinite(n) ? Math.round(clamp(n, 24, 108)) : null))
    return notes.length ? { kind: 'notes', notes } : d
  }
  const root = Math.round(clamp(num(c.root, 60), 24, 96))
  return { kind: 'scale', root, scale: isScale(c.scale) ? c.scale : 'majorPenta', low: Math.round(clamp(num(c.low, root), 24, 96)), octaves: Math.round(clamp(num(c.octaves, 2), 1, 3)) }
}

export function normalizeLanes(raw: unknown): LanesParams {
  const d = defaultLanes()
  if (!raw || typeof raw !== 'object') return d
  const l = raw as Record<string, unknown>
  const widths = Array.isArray(l.widths) ? l.widths.slice(0, LANES_MAX).map(w => clamp(num(w, 1), 0.05, 10)) : undefined
  return {
    layout: l.layout === 'columns' ? 'columns' : 'fan',
    open: Math.round(clamp(num(l.open, d.open), 10, 360)),
    start: ((Math.round(num(l.start, d.start)) % 360) + 360) % 360,
    dir: l.dir === -1 ? -1 : 1,
    mirrored: !!l.mirrored,
    centerY: Math.round(clamp(num(l.centerY, 0), 0, 6000)),
    content: cleanContent(l.content, d.content),
    ...(widths?.length ? { widths } : {}),
    glow: Math.round(clamp(num(l.glow, d.glow), 0, 1) * 100) / 100,
  }
}

export const lanesFan = (p: LanesParams): Fan => ({ open: p.open, start: p.start, dir: p.dir, mirrored: p.mirrored, centerY: p.centerY, content: p.content, widths: p.widths })
export const lanesNotes = (p: LanesParams) => fanNotes(lanesFan(p)).slice(0, LANES_MAX)

type Rect = { x: number; y: number; w: number; h: number }
// the fan's centre in the box (world units)
export const lanesCenter = (b: Rect, p: LanesParams) => ({ x: b.x + b.w / 2, y: b.y + b.h - Math.min(b.h, p.centerY) })

// the lane a point of the box falls in (-1: outside the lanes)
export function lanesIndexAt(b: Rect, p: LanesParams, x: number, y: number): number {
  if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return -1
  if (p.layout === 'columns') {
    const n = lanesNotes(p).length
    if (!n) return -1
    const w = Array.from({ length: n }, (_, i) => Math.max(0.05, p.widths?.[i] ?? 1)), total = w.reduce((a, c) => a + c, 0)
    let at = ((p.dir === 1 ? x - b.x : b.x + b.w - x) / b.w) * total
    for (let i = 0; i < n; i++) { at -= w[i]; if (at <= 1e-9) return i }
    return n - 1
  }
  const c = lanesCenter(b, p)
  return fanLaneAt(lanesFan(p), Math.atan2(y - c.y, x - c.x))
}

// the note the lanes force at a point: undefined outside them, null on a silent lane
export function lanesNoteAt(b: Rect, p: LanesParams, x: number, y: number): number | null | undefined {
  const i = lanesIndexAt(b, p, x, y)
  return i < 0 ? undefined : lanesNotes(p)[i] ?? null
}

// each lane's colour: its note's degree in the lanes' scale (given notes: in C major)
export function lanesDegree(p: LanesParams) {
  const h = p.content.kind === 'scale' ? { root: p.content.root, steps: SCALES[p.content.scale].steps } : { root: 60, steps: SCALES.major.steps }
  return (m: number) => degreeOf(h, m).degree
}

// the lanes to draw: for the fan, angles (radians) around its centre; for columns, x spans as shares of the width
export function lanesShape(p: LanesParams) {
  const degree = lanesDegree(p)
  if (p.layout === 'fan') return fanLanes(lanesFan(p), degree).map(l => ({ ...l, from: 0, to: 0 }))
  const notes = lanesNotes(p)
  const w = notes.map((_, i) => Math.max(0.05, p.widths?.[i] ?? 1)), total = w.reduce((a, c) => a + c, 0)
  const colored = fanLanes({ ...lanesFan(p), open: 360 }, degree)
  let at = 0
  return notes.map((midi, i) => {
    const from = at / total; at += w[i]
    const to = at / total
    return { ...colored[i], midi, from: p.dir === 1 ? from : 1 - to, to: p.dir === 1 ? to : 1 - from }
  })
}

// ---------- the "Rebate notas" collision ----------

// chain: the surface's own transformations · delegate: the chain of the last item that hit the note · none: plays
// the note as it is
export type SurfaceMode = 'chain' | 'delegate' | 'none'
export type SurfaceRebate = { mode: SurfaceMode; chain: Transform[] }
export const SURFACE_MODES: { value: SurfaceMode; label: string; hint: string }[] = [
  { value: 'delegate', label: 'Delegar ao taco', hint: 'Toca com a cadeia do último item que bateu na nota' },
  { value: 'chain', label: 'Cadeia própria', hint: 'Toca com a cadeia desta superfície' },
  { value: 'none', label: 'Não mudar', hint: 'Quica tocando a nota como ela veio' },
]
export const SURFACE_BOUNCES = 6 // how many times one note bounces off surfaces before it fades

export function defaultSurfaceRebate(): SurfaceRebate { return { mode: 'delegate', chain: [] } }
export function normalizeSurfaceRebate(raw: unknown): SurfaceRebate | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return { mode: SURFACE_MODES.some(m => m.value === r.mode) ? (r.mode as SurfaceMode) : 'delegate', chain: cleanChain(r.chain) }
}

// ---------- what a point of the map plays ----------

export type ZoneBox = Rect & { id: string; zone: SoundZoneParams }
export type LanesBox = Rect & { id: string; lanes: LanesParams }
export type PlaceEnv = {
  zone: { zone: Zone; chain: Transform[] } | null
  lane: number | null | undefined // the forced note (undefined: no lanes there; null: a silent lane)
}

const inside = (b: Rect, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h

// the zone that wins at a point (the highest priority; the later one among equals); `music`: only those that
// change the music
export function zoneAt(zones: ZoneBox[], x: number, y: number, music = false): ZoneBox | null {
  let best: ZoneBox | null = null
  for (const z of zones) {
    if (music && !z.zone.music) continue
    if (inside(z, x, y) && (!best || z.zone.priority >= best.zone.priority)) best = z
  }
  return best
}

export function placeEnvAt(zones: ZoneBox[], lanes: LanesBox[], x: number, y: number): PlaceEnv | null {
  const z = zoneAt(zones, x, y)
  let lane: number | null | undefined
  for (let i = lanes.length - 1; i >= 0 && lane === undefined; i--) lane = lanesNoteAt(lanes[i], lanes[i].lanes, x, y)
  if (!z && lane === undefined) return null
  return { zone: z ? { zone: soundZoneOf(z.id, z.zone), chain: z.zone.chain } : null, lane }
}

export { SCALE_IDS, FEELS }
