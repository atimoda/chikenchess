// The map's own music (Editor Mode): the Zona sonora element (a box with its key, scale, tempo and ambience chain),
// the Faixas fixas element (lanes fixed to the map that force the note of anything rebated inside them) and the
// "Rebate notas" collision (a surface the notes bounce off, playing through its own chain, the last item's or as
// they are). All data: the layout stores them, combat asks what a point of the map plays.
import { IN_KEY_RULES, SCALES, ZONES, NOTE_NAMES, type Feel, type InKeyRule, type ScaleId, type Zone } from './music'
import { fanLaneAt, fanLanes, fanNotes, type Fan, type FanContent } from './fan'
import { CHAIN_MAX, TRANSFORMS, cleanTransform, degreeOf, type Transform } from './transforms'
import { isBirdId, type BirdId } from './birds'
import { SILENCE, ambienceKey, cleanAmbience, legacyAmbience, type ZoneAmbience } from './zone-ambience'
import { SCENE_W, templeScene, worldScenes } from './world'
import { FEELS, SCALE_IDS, ZONE_BPM, ZONE_LIFE, isZoneChange, zoneChange, type ZoneChangeId } from './zone-changes'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
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
  // its walls: with life, the notes bounce off its edges and each one takes a point; at 0 it changes by `change`
  // (zone-changes.ts) and its life fills again (0: no walls)
  life: number
  change: ZoneChangeId
  // "Dano só no tom" (music.ts): absent when off
  inKey?: InKeyRule
  // its percussion and bass (zone-ambience.ts): silence by default
  ambience: ZoneAmbience
}
export const ZONE_PRIORITY = { min: 1, max: 9 }
export { ZONE_BPM, ZONE_LIFE }

// a new zone starts with the key, scale and tempo of one of the scenes' (the Noite by default), in silence: no
// percussion and no bass until they are chosen
export function defaultSoundZone(from: Zone = ZONES[1]): SoundZoneParams {
  return {
    name: from.name, root: from.root, scale: from.scale, chordScale: from.chordScale, bpm: from.bpm, feel: from.feel,
    progression: from.progression.slice(), color: from.color, chain: [], priority: 1, music: true, birds: [],
    life: 0, change: 'random', ambience: { ...SILENCE },
  }
}

export function normalizeSoundZone(raw: unknown): SoundZoneParams {
  const d = defaultSoundZone()
  if (!raw || typeof raw !== 'object') return d
  const z = raw as Record<string, unknown>
  const feel = FEELS.includes(z.feel as Feel) ? (z.feel as Feel) : d.feel
  const prog = Array.isArray(z.progression) ? z.progression.filter(n => typeof n === 'number' && Number.isFinite(n)).map(n => clamp(Math.round(n as number), 0, 6)).slice(0, 16) : []
  return {
    name: String(z.name ?? d.name).trim().slice(0, 40) || d.name,
    root: Math.round(clamp(num(z.root, d.root), 36, 84)),
    scale: isScale(z.scale) ? z.scale : d.scale,
    chordScale: isScale(z.chordScale) && SCALES[z.chordScale].steps.length === 7 ? z.chordScale : d.chordScale,
    bpm: Math.round(clamp(num(z.bpm, d.bpm), ZONE_BPM.min, ZONE_BPM.max)),
    feel,
    progression: prog.length ? prog : d.progression,
    color: typeof z.color === 'string' && COLOR.test(z.color) ? z.color : d.color,
    chain: cleanChain(z.chain),
    priority: Math.round(clamp(num(z.priority, d.priority), ZONE_PRIORITY.min, ZONE_PRIORITY.max)),
    music: z.music !== false,
    birds: Array.isArray(z.birds) ? [...new Set(z.birds.filter(isBirdId))] : [],
    life: Math.round(clamp(num(z.life, 0), ZONE_LIFE.min, ZONE_LIFE.max)),
    change: isZoneChange(z.change) ? z.change : d.change,
    ...(IN_KEY_RULES.includes(z.inKey as InKeyRule) ? { inKey: z.inKey as InKeyRule } : {}),
    // saved before the ambience could be chosen: it keeps the percussion of its feel and the drone it played
    ambience: z.ambience === undefined ? legacyAmbience(feel) : cleanAmbience(z.ambience),
  }
}

// a zone after its life ran out: changed by its pattern (the walls and the rest stay)
export function applyZoneChange(z: SoundZoneParams, id: ZoneChangeId = z.change, rnd: () => number = Math.random): SoundZoneParams {
  return normalizeSoundZone({ ...z, ...zoneChange(id).apply(z, rnd) })
}

// the conductor's zone for a Zona sonora element: its id names the element and what it sounds like, so the conductor
// keeps it while it stays the same and takes an edited one on the next bar
export function soundZoneOf(id: string, p: SoundZoneParams): Zone {
  return { id: `zona:${id}:${p.root}:${p.scale}:${p.chordScale}:${p.bpm}:${p.feel}:${p.progression.join('.')}${p.inKey ? `:${p.inKey}` : ''}:${ambienceKey(p.ambience)}`, name: p.name, root: p.root, scale: p.scale, chordScale: p.chordScale, bpm: p.bpm, feel: p.feel, progression: p.progression, color: p.color, ...(p.inKey ? { inKey: p.inKey } : {}), ambience: p.ambience }
}

// ---------- the scenes' own zones: Zonas sonoras stuck to the ground ----------

// each scene of the Parquinho (and the Vila) has a zone of its own: the same Zona sonora of the map, but stuck to
// the ground and playing in the whole column above its stretch of floor. It starts in silence with the key, scale
// and tempo of one of ZONES in turn; a Pátio may change any of them (saved in its settings, by scene number) and
// move the limit between two neighbours (sceneEdges). Any Zona sonora of the map wins over them. The Templo has
// its own music and is not one of them.
export type SceneZones = Record<string, SoundZoneParams>
export const sceneZoneBase = (s: number) => defaultSoundZone(ZONES[((s % ZONES.length) + ZONES.length) % ZONES.length])
export const sceneZoneParams = (zones: SceneZones | undefined, s: number) => zones?.[String(s)] ?? sceneZoneBase(s)
// what a scene's zone keeps of a Zona sonora: no walls and no priority of its own
export const asSceneZone = (z: SoundZoneParams): SoundZoneParams => ({ ...z, life: 0, priority: 1 })
export function normalizeSceneZones(raw: unknown, maxScene: number): SceneZones | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: SceneZones = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const s = Number(k)
    if (Number.isInteger(s) && s >= 0 && s <= maxScene && v && typeof v === 'object') out[String(s)] = asSceneZone(normalizeSoundZone(v))
  }
  return Object.keys(out).length ? out : undefined
}

// the limits between the scenes' zones moved in this Pátio: world x of the left edge of scene s, by scene number.
// Only the limits between two scenes of the Parquinho move (1 … screens - 1): the Templo's stay where they are.
export type SceneEdges = Record<string, number>
export const SCENE_ZONE_MIN_W = 200
export function normalizeSceneEdges(raw: unknown, maxScene: number): SceneEdges | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: SceneEdges = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const s = Number(k)
    if (Number.isInteger(s) && s >= 1 && s <= maxScene && typeof v === 'number' && Number.isFinite(v) && Math.round(v) !== s * SCENE_W) out[String(s)] = Math.round(v)
  }
  return Object.keys(out).length ? out : undefined
}
// world x of every limit, from the world's left wall (0) to its right one: entry s is the left edge of scene s
export function sceneEdgeList(edges: SceneEdges | undefined, screens: number): number[] {
  const scenes = worldScenes(screens), end = screens * SCENE_W, xs = [0]
  for (let s = 1; s <= scenes; s++) {
    if (s >= screens) { xs.push(s * SCENE_W); continue }
    xs.push(Math.round(clamp(num(edges?.[String(s)], s * SCENE_W), xs[s - 1] + SCENE_ZONE_MIN_W, end - (screens - s) * SCENE_ZONE_MIN_W)))
  }
  return xs
}
// a limit dragged to x: the edges to save (the limit back on its scene's own line is not kept)
export function moveSceneEdge(edges: SceneEdges | undefined, screens: number, s: number, x: number): SceneEdges | undefined {
  if (s < 1 || s >= screens) return edges
  const xs = sceneEdgeList(edges, screens)
  const at = Math.round(clamp(x, xs[s - 1] + SCENE_ZONE_MIN_W, xs[s + 1] - SCENE_ZONE_MIN_W))
  return normalizeSceneEdges({ ...edges, [String(s)]: at }, screens - 1)
}
// the scenes' zones as boxes of the world, under every Zona sonora of the map (priority 0): each one's stretch of
// floor, from far under the ground to far over any ceiling. None for the Templo
const GROUND_SPAN = 1e7
export function groundZones(zones: SceneZones | undefined, edges: SceneEdges | undefined, screens: number): ZoneBox[] {
  const xs = sceneEdgeList(edges, screens), temple = templeScene(screens), out: ZoneBox[] = []
  for (let s = 0; s < worldScenes(screens); s++) {
    if (s !== temple) out.push({ id: `cena${s}`, x: xs[s], y: -GROUND_SPAN, w: xs[s + 1] - xs[s], h: 2 * GROUND_SPAN, zone: { ...asSceneZone(sceneZoneParams(zones, s)), priority: 0 } })
  }
  return out
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
