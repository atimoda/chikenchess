// Postes de energia e Torres de transmissão: the models, where their wires hang and how the wires join.
// Every pole or tower of the same kind, model and line ("Linha") is joined to the next one along x by one wire
// per attachment point, so adding one more of them extends the line by itself. A pole may stand in a parallax
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
export const POWER_LINES = 4 // "Linha" 1 to 4: separate rows of the same model
export const POWER_SAG = { min: 0, max: 100, step: 1, default: 40 } as const
export const POWER_WIRE = { min: 1, max: 8, step: 0.5, default: 2 } as const
export const ELEMENT_DEPTH = { min: 0, max: 0.95, step: 0.01 } as const

// model, line (1 to 4), how much the wires to the next one sag (0 to 100) and how thick they are (px)
export type PowerParams = { model: string; line: number; sag: number; wire: number }
export const defaultPower = (kind: PowerKind): PowerParams => ({ model: kind === 'pole' ? 'madeira' : 'trelica', line: 1, sag: POWER_SAG.default, wire: POWER_WIRE.default })

const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d
export function normalizePower(kind: PowerKind, raw: unknown): PowerParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = defaultPower(kind)
  const model = typeof r.model === 'string' && POWER_MODELS[r.model]?.kind === kind ? r.model : d.model
  return { model, line: Math.round(num(r.line, 1, 1, POWER_LINES)), sag: Math.round(num(r.sag, d.sag, POWER_SAG.min, POWER_SAG.max)), wire: Math.round(num(r.wire, d.wire, POWER_WIRE.min, POWER_WIRE.max) * 2) / 2 }
}
export const normalizeDepth = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(ELEMENT_DEPTH.min, Math.min(ELEMENT_DEPTH.max, v)) * 100) / 100 : 0

// ---------- spans: one wire between two neighbours ----------
type Pole = { id: string; kind: string; x: number; y: number; w: number; h: number; depth?: number; params: { power?: PowerParams } }
export type WireEnd = { x: number; y: number; d: number }
export type Span = { id: string; group: string; a: WireEnd; b: WireEnd; sag: number; wire: number; depth: number }

export const powerGroup = (kind: string, p: PowerParams) => `${kind}:${p.model}:${p.line}`

// every wire between neighbours (sorted by x inside each group), in the elements' own coordinates
export function powerSpans(elements: readonly Pole[]): Span[] {
  const groups = new Map<string, Pole[]>()
  for (const el of elements) {
    if ((el.kind !== 'pole' && el.kind !== 'tower') || !el.params.power) continue
    const key = powerGroup(el.kind, el.params.power)
    const list = groups.get(key)
    if (list) list.push(el); else groups.set(key, [el])
  }
  const out: Span[] = []
  groups.forEach((list, group) => {
    list.sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2))
    for (let i = 1; i < list.length; i++) {
      const A = list[i - 1], B = list[i], pa = A.params.power!, model = POWER_MODELS[pa.model]
      const da = A.depth ?? 0, db = B.depth ?? 0
      model.attach.forEach(([px, py], k) => {
        const qb = POWER_MODELS[B.params.power!.model].attach[k] ?? [px, py]
        out.push({
          id: `${A.id}>${B.id}:${k}`, group,
          a: { x: A.x + (px / 100) * A.w, y: A.y + (py / 100) * A.h, d: da },
          b: { x: B.x + (qb[0] / 100) * B.w, y: B.y + (qb[1] / 100) * B.h, d: db },
          sag: pa.sag, wire: pa.wire, depth: Math.max(da, db),
        })
      })
    }
  })
  return out
}

// where a span's ends are in the world with the camera at (camX, camY) (live-camera's: x at the screen's left,
// y the screen y of world 0): a thing at depth d moves d × camX right and d × camY up
export const endAt = (e: WireEnd, camX: number, camY: number) => ({ x: e.x + e.d * camX, y: e.y - e.d * camY })

// the quadratic curve of a span: its two ends and the control point that makes it sag
export function spanCurve(s: Span, camX: number, camY: number) {
  const a = endAt(s.a, camX, camY), b = endAt(s.b, camX, camY)
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  // the middle sags `sag` % of 18% of the span; a quadratic's middle sits half way to its control point
  const drop = (s.sag / 100) * 0.18 * len * 2
  return { a, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + drop }, b, len }
}
export function spanPoint(s: Span, t: number, camX: number, camY: number) {
  const { a, c, b } = spanCurve(s, camX, camY), u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}
export function spanPath(s: Span, camX: number, camY: number) {
  const { a, c, b } = spanCurve(s, camX, camY)
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}
// all spans share one depth: their curve only slides with the camera (drawn once, moved as a layer)
export const fixedDepth = (spans: Span[]) => spans.every(s => s.a.d === s.b.d && s.a.d === spans[0]?.a.d)
