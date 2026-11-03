// The Pátio's layout: every thing placed in the world (platforms, trees, training dummies, item racks, horde
// buttons) as a list of elements in world units. The Pátio draws itself from it and the editor mode changes it.
// The default layout is the Pátio as the code always had it; a lobby keeps its own copy once someone edits it.
//
// An element is a box (x, y = its top-left corner before turning; w, h) turned by `rot` degrees around its centre.
// The game's things (dummy, rack, button) are drawn by the game itself (canvas) and never turn; for them the box's
// bottom middle is where they stand.
import { INSTRUMENT_IDS, WEAPON_IDS, type ItemId } from './items'
import { DUMMY_DEFAULTS, DUMMY_HP_RANGE, dummyTip } from './dummies'
import { SCENE_PLATFORMS, SCENE_W, SHELF_TOP, WORLD_GROUND_Y, WORLD_TOP } from './world'
import type { Box } from './combat'

export const LAYOUT_VERSION = 1
// the widest world the Pátio offers (its width setting): the default layout covers it, a narrower world hides the rest
export const LAYOUT_MAX_SCREENS = 8
export const LAYOUT_MAX_ELEMENTS = 1500

// the layers, back to front. back: behind the platforms; scene: the platforms' own; behind: in front of the game's
// things (dummies, racks, shots) but behind the characters; front: in front of the characters; frontGhost: in front,
// half see-through (the trees)
export const LAYERS = ['back', 'scene', 'behind', 'front', 'frontGhost'] as const
export type LayoutLayer = (typeof LAYERS)[number]
export const LAYER_LABELS: Record<LayoutLayer, string> = {
  back: 'Fundo', scene: 'Cenário', behind: 'Atrás dos bonecos', front: 'Frente', frontGhost: 'Frente translúcida',
}
export const LAYER_HINTS: Record<LayoutLayer, string> = {
  back: 'Atrás das plataformas, logo à frente das montanhas',
  scene: 'Onde ficam as plataformas',
  behind: 'À frente dos alvos, armas e tiros, atrás da galinha',
  front: 'À frente da galinha, opaco',
  frontGhost: 'À frente da galinha, meio transparente',
}

export const ELEMENT_KINDS = ['platform', 'terrace', 'pillar', 'pine', 'blossom', 'dummy', 'rack', 'button'] as const
export type ElementKind = (typeof ELEMENT_KINDS)[number]
export const HORDE_BUTTONS = ['aliens', 'pattern', 'zombies', 'zcount'] as const
export type HordeButton = (typeof HORDE_BUTTONS)[number]
export const HORDE_BUTTON_LABELS: Record<HordeButton, string> = { aliens: 'Soltar aliens', pattern: 'Padrão dos aliens', zombies: 'Soltar zumbis', zcount: 'Quantidade de zumbis' }

export type ElementParams = {
  message?: string; maxHp?: number // dummy
  item?: ItemId // rack
  action?: HordeButton // button
  seed?: number; flip?: boolean // trees
}

export type LayoutElement = {
  id: string; kind: ElementKind
  x: number; y: number; w: number; h: number; rot: number
  layer: LayoutLayer; locked: boolean
  // she stands on it and bumps its sides · bullets stop at it · the instruments' notes stop at it
  solid: boolean; shots: boolean; notes: boolean
  // only shown in the editor mode (invisible walls and floors)
  hidden: boolean
  opacity: number
  // falls until it rests on a solid element (or the ground): settleLayout
  gravity?: boolean
  params: ElementParams
}
export type PatioLayout = { v: number; elements: LayoutElement[] }

export type ElementDef = {
  label: string; group: string
  w: number; h: number; layer: LayoutLayer; solid: boolean; shots: boolean
  // drawn by the game (canvas): fixed layer, never turns, not a platform
  entity: boolean
  rotatable: boolean; resizable: boolean
  // has an Edit panel
  editable: boolean
  minW: number; minH: number
}
export const ELEMENT_DEFS: Record<ElementKind, ElementDef> = {
  platform: { label: 'Plataforma', group: 'Plataformas', w: 230, h: 48, layer: 'scene', solid: true, shots: true, entity: false, rotatable: true, resizable: true, editable: false, minW: 12, minH: 12 },
  terrace: { label: 'Terraço do templo', group: 'Plataformas', w: 269, h: 48, layer: 'scene', solid: true, shots: true, entity: false, rotatable: true, resizable: true, editable: false, minW: 12, minH: 12 },
  pillar: { label: 'Pilar / parede', group: 'Plataformas', w: 96, h: 288, layer: 'scene', solid: true, shots: true, entity: false, rotatable: true, resizable: true, editable: false, minW: 12, minH: 12 },
  pine: { label: 'Pinheiro', group: 'Árvores', w: 340, h: 389, layer: 'frontGhost', solid: false, shots: false, entity: false, rotatable: true, resizable: true, editable: true, minW: 40, minH: 40 },
  blossom: { label: 'Ameixeira florida', group: 'Árvores', w: 340, h: 389, layer: 'frontGhost', solid: false, shots: false, entity: false, rotatable: true, resizable: true, editable: true, minW: 40, minH: 40 },
  dummy: { label: 'Alvo de treino', group: 'Alvos', w: 46, h: 112, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: true, editable: true, minW: 20, minH: 40 },
  rack: { label: 'Suporte de item', group: 'Itens', w: 76, h: 62, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: 76, minH: 62 },
  button: { label: 'Botão da horda', group: 'Botões', w: 40, h: 40, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: true, editable: true, minW: 20, minH: 20 },
}

const r1 = (v: number) => Math.round(v * 10) / 10
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

let idSeq = 0
export function newElementId(kind: ElementKind) {
  idSeq = (idSeq + 1) % 1e6
  return `${kind}-${Date.now().toString(36)}${idSeq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

// a new element of a kind, centred on (cx, cy)
export function createElement(kind: ElementKind, cx: number, cy: number, params: ElementParams = {}): LayoutElement {
  const d = ELEMENT_DEFS[kind]
  const p: ElementParams = { ...defaultParams(kind), ...params }
  return normalizeElement({
    id: newElementId(kind), kind, x: cx - d.w / 2, y: cy - d.h / 2, w: d.w, h: d.h, rot: 0, layer: d.layer, locked: false,
    solid: d.solid, shots: d.shots, notes: false, hidden: false, opacity: 1, params: p,
  })!
}

export function defaultParams(kind: ElementKind): ElementParams {
  if (kind === 'dummy') return { message: DUMMY_DEFAULTS.message, maxHp: DUMMY_DEFAULTS.maxHp }
  if (kind === 'rack') return { item: WEAPON_IDS[0] }
  if (kind === 'button') return { action: 'aliens' }
  if (kind === 'pine' || kind === 'blossom') return { seed: Math.floor(Math.random() * 2 ** 31), flip: Math.random() < 0.5 }
  return {}
}

// ---------- the default layout: the Pátio as the code always drew it ----------

// the Pátio's seeded trees (the same ones on the server, in the browser and for every player): 3 or 4 per scene,
// each a random variation (size, side it faces, seed of its shape)
export type TreeSeed = { kind: 'pine' | 'blossom'; x: number; h: number; flip: boolean; seed: number; delay: number }
export const TREE_BOX = { w: 420, h: 480 }
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function defaultTrees(screens: number): TreeSeed[] {
  const out: TreeSeed[] = []
  const between = (r: () => number, a: number, b: number) => r1(a + r() * (b - a))
  for (let s = 0; s < screens; s++) {
    const r = rng(9173 + s * 7919)
    const count = 3 + Math.floor(r() * 2)
    for (let i = 0; i < count; i++) {
      // spread over the scene; the first scene keeps its start clear for the portal
      const lo = s === 0 ? 320 : 60
      const slot = (SCENE_W - lo - 60) / count
      const x = s * SCENE_W + lo + slot * (i + between(r, 0.15, 0.85))
      out.push({ kind: r() < 0.62 ? 'pine' : 'blossom', x, h: between(r, 0.62, 1), flip: r() < 0.5, seed: Math.floor(r() * 2 ** 31), delay: r() * 7 })
    }
  }
  return out
}

export function defaultLayout(trees: TreeSeed[] = defaultTrees(LAYOUT_MAX_SCREENS)): PatioLayout {
  const out: LayoutElement[] = []
  const G = WORLD_GROUND_Y
  const base = (kind: ElementKind, id: string, x: number, y: number, w: number, h: number, params: ElementParams = {}): LayoutElement => {
    const d = ELEMENT_DEFS[kind]
    return { id, kind, x: r1(x), y: r1(y), w: r1(w), h: r1(h), rot: 0, layer: d.layer, locked: false, solid: d.solid, shots: d.shots, notes: false, hidden: false, opacity: 1, params }
  }
  for (let s = 0; s < LAYOUT_MAX_SCREENS; s++) {
    SCENE_PLATFORMS[s % SCENE_PLATFORMS.length].forEach((p, i) => {
      // the tall narrow ones are pillars (walls); the rest, platforms. Same boxes, same ids as before.
      const kind: ElementKind = p.h > p.w ? 'pillar' : 'platform'
      out.push(base(kind, `pq${s}-${i}`, s * SCENE_W + p.x, G - p.bottom - p.h, p.w, p.h))
    })
  }
  trees.forEach((t, i) => {
    const w = r1(TREE_BOX.w * t.h), h = r1(TREE_BOX.h * t.h)
    out.push(base(t.kind, `tree-${i}`, t.x - w / 2, G + 6 - h, w, h, { seed: t.seed, flip: t.flip }))
  })
  // the weapons' racks on the floor of the first scene, the instruments on the long shelf above them
  const rack = ELEMENT_DEFS.rack
  WEAPON_IDS.forEach((id, i) => { const cx = SCENE_W * (0.14 + i * 0.105); out.push(base('rack', `rack-${id}`, cx - rack.w / 2, G - rack.h, rack.w, rack.h, { item: id })) })
  INSTRUMENT_IDS.forEach((id, i) => { const cx = SCENE_W * (0.14 + i * 0.105); out.push(base('rack', `rack-${id}`, cx - rack.w / 2, SHELF_TOP - rack.h, rack.w, rack.h, { item: id })) })
  // the horde buttons on the second scene
  HORDE_BUTTONS.forEach((id, i) => { const cx = SCENE_W * (1.06 + i * 0.09); out.push(base('button', `btn-${id}`, cx - 20, G - 46 - 40, 40, 40, { action: id })) })
  // the training dummies, each with its own tip
  ;[1.7, 2.0, 2.4, 2.8, 3.2].forEach((f, i) => { const d = ELEMENT_DEFS.dummy; out.push(base('dummy', `dummy-${i}`, SCENE_W * f - d.w / 2, G - d.h, d.w, d.h, { message: dummyTip(i), maxHp: DUMMY_DEFAULTS.maxHp })) })
  return { v: LAYOUT_VERSION, elements: out }
}

// ---------- cleaning what comes from storage, the database or another player ----------

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
export function normalizeElement(raw: unknown): LayoutElement | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const kind = e.kind as ElementKind
  if (!ELEMENT_KINDS.includes(kind)) return null
  const d = ELEMENT_DEFS[kind]
  const id = typeof e.id === 'string' && e.id.length > 0 && e.id.length <= 64 ? e.id : newElementId(kind)
  const w = r1(clamp(num(e.w, d.w), d.minW, 20000)), h = r1(clamp(num(e.h, d.h), d.minH, 6000))
  const rot = d.rotatable ? ((Math.round(num(e.rot, 0) / 45) * 45) % 360 + 360) % 360 : 0
  const layer = d.entity ? d.layer : LAYERS.includes(e.layer as LayoutLayer) ? (e.layer as LayoutLayer) : d.layer
  const p = (e.params && typeof e.params === 'object' ? e.params : {}) as Record<string, unknown>
  const params: ElementParams = {}
  if (kind === 'dummy') {
    params.message = String(p.message ?? '').trim().slice(0, 280)
    params.maxHp = Math.round(clamp(num(p.maxHp, DUMMY_DEFAULTS.maxHp), DUMMY_HP_RANGE.min, DUMMY_HP_RANGE.max))
  } else if (kind === 'rack') {
    params.item = ([...WEAPON_IDS, ...INSTRUMENT_IDS] as ItemId[]).includes(p.item as ItemId) ? (p.item as ItemId) : WEAPON_IDS[0]
  } else if (kind === 'button') {
    params.action = HORDE_BUTTONS.includes(p.action as HordeButton) ? (p.action as HordeButton) : 'aliens'
  } else if (kind === 'pine' || kind === 'blossom') {
    params.seed = Math.floor(clamp(num(p.seed, 1), 0, 2 ** 31))
    params.flip = !!p.flip
  }
  return {
    id, kind,
    x: r1(clamp(num(e.x, 0), -2000, SCENE_W * (LAYOUT_MAX_SCREENS + 2))), y: r1(clamp(num(e.y, 0), WORLD_TOP - 1000, WORLD_GROUND_Y + 200)),
    w, h, rot, layer, locked: !!e.locked,
    solid: d.entity ? false : typeof e.solid === 'boolean' ? e.solid : d.solid,
    shots: d.entity ? false : typeof e.shots === 'boolean' ? e.shots : d.shots,
    notes: d.entity ? false : !!e.notes,
    hidden: d.entity ? false : !!e.hidden,
    opacity: r1(clamp(num(e.opacity, 1), 0.1, 1) * 100) / 100,
    ...(e.gravity === true ? { gravity: true } : {}),
    params,
  }
}

export function normalizeLayout(raw: unknown): PatioLayout | null {
  if (!raw || typeof raw !== 'object') return null
  const list = (raw as { elements?: unknown }).elements
  if (!Array.isArray(list)) return null
  const seen = new Set<string>()
  const elements: LayoutElement[] = []
  for (const item of list.slice(0, LAYOUT_MAX_ELEMENTS)) {
    const el = normalizeElement(item)
    if (!el) continue
    if (seen.has(el.id)) el.id = newElementId(el.kind)
    seen.add(el.id)
    elements.push(el)
  }
  return { v: LAYOUT_VERSION, elements }
}

// ---------- geometry: the turned box, its bounds and the floor of a sloped one ----------

export function elementCorners(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h' | 'rot'>): [number, number][] {
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2
  const a = (el.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const dx = (sx * el.w) / 2, dy = (sy * el.h) / 2
    return [cx + dx * c - dy * s, cy + dx * s + dy * c]
  })
}

// the box around the turned element (world units)
export function elementBounds(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h' | 'rot'>) {
  if (el.rot % 180 === 0) return { x: el.x, y: el.y, w: el.w, h: el.h }
  if (el.rot % 180 === 90) return { x: el.x + el.w / 2 - el.h / 2, y: el.y + el.h / 2 - el.w / 2, w: el.h, h: el.w }
  const pts = elementCorners(el)
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

// a sloped element (turned 45°, 135°…) is a ramp: its upper edges are one-way floors. The points are relative
// to its bounds' top-left, in the format the chicken's engine reads (`data-chicken-line`). Straight ones: null.
export function elementFloorLine(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h' | 'rot'>): string | null {
  if (el.rot % 90 === 0) return null
  const b = elementBounds(el)
  const pts = elementCorners(el)
  // the upper chain: from the leftmost corner over the highest one to the rightmost
  const left = pts.reduce((a, p) => (p[0] < a[0] ? p : a)), right = pts.reduce((a, p) => (p[0] > a[0] ? p : a)), top = pts.reduce((a, p) => (p[1] < a[1] ? p : a))
  return [left, top, right].map(p => `${r1(p[0] - b.x)},${r1(p[1] - b.y)}`).join(' ')
}

// the elements inside a world `screens` scenes wide (the temple comes after them and keeps its own things)
export function elementsInWorld(layout: PatioLayout, screens: number) {
  const end = screens * SCENE_W
  return layout.elements.filter(e => e.x + e.w / 2 < end)
}

// what the shots, notes and items lying around meet (combat's boxes)
export function layoutBoxes(elements: LayoutElement[]): Box[] {
  const G = WORLD_GROUND_Y
  const out: Box[] = []
  elements.forEach(e => {
    if (ELEMENT_DEFS[e.kind].entity || (!e.solid && !e.shots && !e.notes)) return
    const b = elementBounds(e)
    out.push({ l: b.x, t: b.y, r: b.x + b.w, b: Math.min(b.y + b.h, G), solid: e.solid, shots: e.shots, notes: e.notes })
  })
  return out
}

export const sameLayout = (a: PatioLayout | null, b: PatioLayout | null) => JSON.stringify(a) === JSON.stringify(b)

// the top of a solid element over the span [l, r]: its highest point there (a ramp's sloped edge, else its top)
function surfaceTop(el: LayoutElement, l: number, r: number): number {
  const b = elementBounds(el)
  const line = elementFloorLine(el)
  if (!line) return b.y
  const pts = line.split(' ').map(p => p.split(',').map(Number)).map(([x, y]) => [b.x + x, b.y + y] as const)
  const xs = [l, r, ...pts.map(p => p[0]).filter(x => x > l && x < r)]
  let best = Infinity
  for (const x of xs) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
      if (x < Math.min(ax, bx) || x > Math.max(ax, bx) || ax === bx) continue
      best = Math.min(best, ay + ((x - ax) / (bx - ax)) * (by - ay))
    }
  }
  return Number.isFinite(best) ? best : b.y
}

// gravity: each element with `gravity` falls straight down until its bounds rest on a solid element below it or on
// the ground. The lowest ones fall first, so a stack settles in one pass; one already resting (or `skip`, the one
// being dragged) stays. Only falls: an element is never pushed up.
export function settleLayout(elements: LayoutElement[], skip?: string | null): LayoutElement[] {
  const falling = elements.filter(e => e.gravity && e.id !== skip)
  if (!falling.length) return elements
  const supports = elements.filter(e => e.solid && !ELEMENT_DEFS[e.kind].entity && (!e.gravity || e.id === skip))
  const moved = new Map<string, LayoutElement>()
  const order = [...falling].sort((a, b) => { const ba = elementBounds(a), bb = elementBounds(b); return bb.y + bb.h - (ba.y + ba.h) })
  for (const el of order) {
    const b = elementBounds(el)
    const bottom = b.y + b.h, l = b.x + 1, r = b.x + b.w - 1
    let floor = WORLD_GROUND_Y
    for (const s of supports) {
      const sb = elementBounds(s)
      if (sb.x >= r || sb.x + sb.w <= l) continue
      const top = surfaceTop(s, Math.max(l, sb.x), Math.min(r, sb.x + sb.w))
      if (top >= bottom - 2 && top < floor) floor = top
    }
    const dy = r1(floor - bottom)
    const next = Math.abs(dy) < 0.05 ? el : { ...el, y: r1(el.y + dy) }
    if (next !== el) moved.set(el.id, next)
    if (next.solid && !ELEMENT_DEFS[next.kind].entity) supports.push(next)
  }
  return moved.size ? elements.map(e => moved.get(e.id) ?? e) : elements
}
