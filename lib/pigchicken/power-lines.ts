// Postes de energia e Torres de transmissão: the models, where their wires hang and how the wires join.
// Wires join the poles (or towers) the editor linked by hand (PowerParams.links: any pole to any other pole, any
// tower to any other tower), one wire per attachment point. A Pátio saved before the links (no `links`) keeps the
// old rule: each one joins the next one along x of the same kind, model and line ("Linha"). A pole may stand in a parallax
// depth of its own (LayoutElement.depth): the wire's ends move with each pole's depth, so the wire is worked out
// again from the camera (spanEnds) and still meets both poles when the camera moves them apart.
// Points are in % of the element's box (x from the left, y from the top). Pure: no DOM.

export type PowerKind = 'pole' | 'tower'
export type PowerModel = { id: string; label: string; kind: PowerKind; w: number; h: number; attach: [number, number][] }

export const POWER_MODELS: Record<string, PowerModel> = {
  madeira: { id: 'madeira', label: 'Madeira, uma cruzeta', kind: 'pole', w: 120, h: 440, attach: [[6, 8], [30, 8], [70, 8], [94, 8]] },
  duplo: { id: 'duplo', label: 'Madeira, duas cruzetas', kind: 'pole', w: 130, h: 470, attach: [[6, 7], [50, 3], [94, 7], [12, 19], [88, 19]] },
  rua: { id: 'rua', label: 'Concreto de rua', kind: 'pole', w: 110, h: 420, attach: [[18, 6], [82, 6]] },
  trelica: { id: 'trelica', label: 'Treliça, dois braços', kind: 'tower', w: 380, h: 920, attach: [[50, 0.5], [4, 13], [96, 13], [16, 27], [84, 27]] },
  gato: { id: 'gato', label: 'Cabeça de gato', kind: 'tower', w: 420, h: 860, attach: [[6, 12], [50, 12], [94, 12]] },
  alta: { id: 'alta', label: 'Três níveis', kind: 'tower', w: 300, h: 1000, attach: [[24, 11], [76, 11], [6, 22], [94, 22], [18, 33], [82, 33]] },
}
export const POLE_MODELS = Object.values(POWER_MODELS).filter(m => m.kind === 'pole').map(m => m.id)
export const TOWER_MODELS = Object.values(POWER_MODELS).filter(m => m.kind === 'tower').map(m => m.id)
export const POWER_LINES = 4 // "Linha" 1 to 4: separate rows of the same model (only for Pátios saved before the links)
export const POWER_LINKS_MAX = 12 // wires one pole or tower holds to others
export const POWER_SAG = { min: 0, max: 100, step: 1, default: 40 } as const
export const POWER_WIRE = { min: 1, max: 8, step: 0.5, default: 2 } as const
export const ELEMENT_DEPTH = { min: 0, max: 0.95, step: 0.01 } as const

// model, line (1 to 4), how much the wires to the next one sag (0 to 100) and how thick they are (px); floor: the
// wires are one-way floors she can stand on (Fios como plataforma, on by default; only wires on the ground's depth);
// links: the ids of the poles or towers of the same kind it is wired to (a link is kept on one of the two ends;
// absent: the old rule by line, see above)
export type PowerParams = { model: string; line: number; sag: number; wire: number; floor: boolean; links?: string[] }
export const defaultPower = (kind: PowerKind): PowerParams => ({ model: kind === 'pole' ? 'madeira' : 'trelica', line: 1, sag: POWER_SAG.default, wire: POWER_WIRE.default, floor: true })

const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d
export function normalizePower(kind: PowerKind, raw: unknown): PowerParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = defaultPower(kind)
  const model = typeof r.model === 'string' && POWER_MODELS[r.model]?.kind === kind ? r.model : d.model
  const out: PowerParams = { model, line: Math.round(num(r.line, 1, 1, POWER_LINES)), sag: Math.round(num(r.sag, d.sag, POWER_SAG.min, POWER_SAG.max)), wire: Math.round(num(r.wire, d.wire, POWER_WIRE.min, POWER_WIRE.max) * 2) / 2, floor: r.floor !== false }
  if (Array.isArray(r.links)) out.links = [...new Set(r.links.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64))].slice(0, POWER_LINKS_MAX)
  return out
}
export const normalizeDepth = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(ELEMENT_DEPTH.min, Math.min(ELEMENT_DEPTH.max, v)) * 100) / 100 : 0

// ---------- spans: one wire between two neighbours ----------
type Pole = { id: string; kind: string; x: number; y: number; w: number; h: number; depth?: number; backdrop?: string; params: { power?: PowerParams } }
// pin: its pole is pinned to a layer of the scenery far behind (LayoutElement.backdrop): it slides vertically from
// the camera at 0, not from the resting height
export type WireEnd = { x: number; y: number; d: number; pin?: boolean }
export type Span = { id: string; group: string; a: WireEnd; b: WireEnd; sag: number; wire: number; depth: number; floor: boolean }

export const powerGroup = (kind: string, p: PowerParams) => `${kind}:${p.model}:${p.line}`

const centre = (e: Pole) => e.x + e.w / 2
const isPower = (e: Pole) => (e.kind === 'pole' || e.kind === 'tower') && !!e.params.power

// every pair of poles (or towers) joined by wires, each pair once, the one on the left first: the links the editor
// made, and for the ones saved before the links, the next one along x of the same kind, model and line
export function powerPairs<T extends Pole>(elements: readonly T[]): [T, T][] {
  const byId = new Map(elements.map(e => [e.id, e]))
  const out: [T, T][] = [], seen = new Set<string>(), legacy = new Map<string, T[]>()
  const pair = (a: T, b: T) => {
    if (a.id === b.id || a.kind !== b.kind) return
    const k = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
    if (seen.has(k)) return
    seen.add(k)
    out.push(centre(a) <= centre(b) ? [a, b] : [b, a])
  }
  for (const el of elements) {
    if (!isPower(el)) continue
    const p = el.params.power!
    if (p.links) { p.links.forEach(id => { const o = byId.get(id); if (o && isPower(o)) pair(el, o) }); continue }
    const key = powerGroup(el.kind, p), list = legacy.get(key)
    if (list) list.push(el); else legacy.set(key, [el])
  }
  legacy.forEach(list => {
    list.sort((a, b) => centre(a) - centre(b))
    for (let i = 1; i < list.length; i++) pair(list[i - 1], list[i])
  })
  return out
}

// every wire, in the elements' own coordinates: one per attachment point of the left pole (its sag, thickness
// and floor), to the same point of the other one
export function powerSpans(elements: readonly Pole[]): Span[] {
  return powerPairs(elements).flatMap(([A, B]) => {
    const pa = A.params.power!, model = POWER_MODELS[pa.model]
    const da = A.depth ?? 0, db = B.depth ?? 0, group = powerGroup(A.kind, pa)
    return model.attach.map(([px, py], k) => {
      const qb = POWER_MODELS[B.params.power!.model].attach[k] ?? [px, py]
      return {
        id: `${A.id}>${B.id}:${k}`, group,
        a: { x: A.x + (px / 100) * A.w, y: A.y + (py / 100) * A.h, d: da, ...(A.backdrop ? { pin: true } : {}) },
        b: { x: B.x + (qb[0] / 100) * B.w, y: B.y + (qb[1] / 100) * B.h, d: db, ...(B.backdrop ? { pin: true } : {}) },
        sag: pa.sag, wire: pa.wire, depth: Math.max(da, db), floor: pa.floor,
      }
    })
  })
}

// the poles (or towers) wired to this one, directly
export function linkedTo(elements: readonly Pole[], id: string): Set<string> {
  const out = new Set<string>()
  powerPairs(elements).forEach(([a, b]) => { if (a.id === id) out.add(b.id); else if (b.id === id) out.add(a.id) })
  return out
}

// every one reached from this one through the wires (itself included)
function joined(elements: readonly Pole[], id: string): Set<string> {
  const next = new Map<string, string[]>()
  powerPairs(elements).forEach(([a, b]) => { next.set(a.id, [...(next.get(a.id) ?? []), b.id]); next.set(b.id, [...(next.get(b.id) ?? []), a.id]) })
  const seen = new Set([id]), queue = [id]
  while (queue.length) for (const n of next.get(queue.shift()!) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n) }
  return seen
}

// the old rule turned into links: every pole or tower without `links` keeps the wires it has now, as links
// (each kept on one end), so the editor can change any of them
export function materializeLinks<T extends Pole>(elements: readonly T[]): T[] {
  if (!elements.some(e => isPower(e) && !e.params.power!.links)) return [...elements]
  const add = new Map<string, string[]>()
  powerPairs(elements).forEach(([a, b]) => {
    const holder = !a.params.power!.links ? a : !b.params.power!.links ? b : null
    if (holder) add.set(holder.id, [...(add.get(holder.id) ?? []), holder === a ? b.id : a.id])
  })
  return elements.map(e => isPower(e) && !e.params.power!.links ? { ...e, params: { ...e.params, power: { ...e.params.power!, links: add.get(e.id) ?? [] } } } : e)
}

// wires two poles (or towers) of the same kind together, or takes the wires between them away when they were
// joined; null when they cannot be joined (another kind, or the first one already holds POWER_LINKS_MAX)
export function toggleLink<T extends Pole>(elements: readonly T[], aId: string, bId: string): { elements: T[]; linked: boolean } | null {
  const els = materializeLinks(elements)
  const a = els.find(e => e.id === aId), b = els.find(e => e.id === bId)
  if (!a || !b || a.id === b.id || a.kind !== b.kind || !isPower(a) || !isPower(b)) return null
  const without = (e: T, id: string): T => ({ ...e, params: { ...e.params, power: { ...e.params.power!, links: e.params.power!.links!.filter(x => x !== id) } } })
  if (a.params.power!.links!.includes(b.id) || b.params.power!.links!.includes(a.id))
    return { elements: els.map(e => e.id === a.id ? without(e, b.id) : e.id === b.id ? without(e, a.id) : e), linked: false }
  if (a.params.power!.links!.length >= POWER_LINKS_MAX) return null
  return { elements: els.map(e => e.id === a.id ? { ...e, params: { ...e.params, power: { ...e.params.power!, links: [...e.params.power!.links!, b.id] } } } : e), linked: true }
}

// a pole or tower taken away: no link points to it any more
export function dropLinks<T extends Pole>(elements: readonly T[], id: string): T[] {
  return elements.map(e => isPower(e) && e.params.power!.links?.includes(id) ? { ...e, params: { ...e.params, power: { ...e.params.power!, links: e.params.power!.links!.filter(x => x !== id) } } } : e)
}

// One line's look is shared: changing the model or "Fios como plataforma" of one pole or tower changes every other
// one reached from it through the wires. A new model keeps each one's height and base centre, in the model's own
// proportions. `after` replaces `before`; the rest of the list stays as it is.
export function spreadPower<T extends Pole>(elements: readonly T[], before: T, after: T): T[] {
  const was = before.params.power, now = after.params.power
  if (!was || !now || (was.model === now.model && was.floor === now.floor)) return elements.map(e => (e.id === after.id ? after : e))
  const line = joined(elements, before.id), model = POWER_MODELS[now.model]
  return elements.map(e => {
    if (e.id === after.id) return after
    const p = e.params.power
    if (e.kind !== before.kind || !p || !line.has(e.id)) return e
    const w = p.model === now.model ? e.w : Math.round(e.h * model.w / model.h)
    return { ...e, x: e.x + (e.w - w) / 2, w, params: { ...e.params, power: { ...p, model: now.model, floor: now.floor } } }
  })
}

// a span as a one-way floor: `n` straight pieces along its curve, with the camera at rest (its ends on the
// ground's depth); null when an end is in a parallax depth or its line has the floor off
export function spanFloor(s: Span, n = 12) {
  if (!s.floor || s.a.d || s.b.d) return null
  return Array.from({ length: n + 1 }, (_, i) => spanPoint(s, i / n, 0, 0))
}

// where a span's ends are in the world with the camera at (camX, camY) (live-camera's: x at the screen's left,
// camY the screen y of world 0 less the resting height restY): a thing at depth d moves d × camX right and d × camY
// up; pinned to a backdrop layer, d × (camY + restY) up, like the layer
export const endAt = (e: WireEnd, camX: number, camY: number, restY = 0) => ({ x: e.x + e.d * camX, y: e.y - e.d * (camY + (e.pin ? restY : 0)) })

// the quadratic curve of a span: its two ends and the control point that makes it sag
export function spanCurve(s: Span, camX: number, camY: number, restY = 0) {
  const a = endAt(s.a, camX, camY, restY), b = endAt(s.b, camX, camY, restY)
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  // the middle sags `sag` % of 18% of the span; a quadratic's middle sits half way to its control point
  const drop = (s.sag / 100) * 0.18 * len * 2
  return { a, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + drop }, b, len }
}
export function spanPoint(s: Span, t: number, camX: number, camY: number, restY = 0) {
  const { a, c, b } = spanCurve(s, camX, camY, restY), u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}
export function spanPath(s: Span, camX: number, camY: number, restY = 0) {
  const { a, c, b } = spanCurve(s, camX, camY, restY)
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}
// all spans share one depth (and pinned or not alike): their curve only slides with the camera (drawn once, moved as
// a layer)
export const fixedDepth = (spans: Span[]) => spans.every(s => s.a.d === s.b.d && s.a.d === spans[0]?.a.d && !s.a.pin === !s.b.pin && !s.a.pin === !spans[0]?.a.pin)
