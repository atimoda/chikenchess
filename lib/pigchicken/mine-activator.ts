// The Ativador de grid de campo minado: a big blue button of the Pátio's layout (Modo editor → Grade de blocos) that
// the players fill with music (their instruments' notes) or with damage (shots, blasts, blows). Whichever of its two
// bars fills first turns the Grade de blocos on for everyone in the Pátio: by music with the blocks as Zonas sonoras,
// by damage without them. Then it waits small and untouchable ("incólume") until that grid's round is over or the
// grid is hidden again. Pure: its params, its box, what meets it and its bars; the runtime is in
// mine-activator-store.ts and its drawing in components/pigchicken/draw/mine-activator.ts.
import { defaultMineGrid, type MineGridParams } from './mine-grid'

export type MineActivatorParams = {
  notes: number // "Notas até ativar": the notes that fill the music bar
  damage: number // "Dano até ativar": the damage that fills the damage bar
}
export const MINE_ACTIVATOR_NOTES = { min: 4, max: 400, step: 1, default: 48 } as const
export const MINE_ACTIVATOR_DAMAGE = { min: 50, max: 20000, step: 50, default: 1500 } as const
// the box it takes in the layout (its art stands on the box's bottom)
export const MINE_ACTIVATOR_BOX = { w: 240, h: 200 } as const
// while it waits ("incólume"): its share of the size, standing where it stood
export const MINE_ACTIVATOR_SMALL = 0.28

export const defaultMineActivator = (): MineActivatorParams => ({ notes: MINE_ACTIVATOR_NOTES.default, damage: MINE_ACTIVATOR_DAMAGE.default })
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const snap = (v: unknown, r: { min: number; max: number; step: number; default: number }) =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v / r.step) * r.step, r.min, r.max) : r.default
export function normalizeMineActivator(raw: unknown): MineActivatorParams {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return { notes: snap(p.notes, MINE_ACTIVATOR_NOTES), damage: snap(p.damage, MINE_ACTIVATOR_DAMAGE) }
}

// how it turned the grid on: its music bar (with the blocks as Zonas sonoras) or its damage bar (without them)
export type MineActivatorVia = 'music' | 'damage'
// the grid it turns on: the Pátio's own settings (none saved: the defaults), on, with or without the Zonas sonoras
export function activatedMineGrid(saved: MineGridParams | undefined, via: MineActivatorVia): MineGridParams {
  const base = saved ?? defaultMineGrid()
  return { ...base, on: true, zones: { ...base.zones, on: via === 'music' } }
}
// whether it can be filled now: with no grid shown, or with the round of the grid shown over
export const mineActivatorArmed = (o: { savedOn: boolean; via: MineActivatorVia | null; over: boolean }) => (!o.savedOn && !o.via) || o.over

// ---------- what meets it ----------

// an activator in the world: its element's box (world units) and params
export type MineActivatorBox = { id: string; x: number; y: number; w: number; h: number; params: MineActivatorParams }
const inside = (b: MineActivatorBox, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
// a shot going from (px, py) to (x, y) is in one (also one fired from inside it): that one, and whether it came in
// through a side
export function mineActivatorShotHit(boxes: readonly MineActivatorBox[], px: number, py: number, x: number, y: number): { box: MineActivatorBox; flipX: boolean } | null {
  const b = boxes.find(o => inside(o, x, y))
  return b ? { box: b, flipX: !inside(b, px, py) && (px < b.x || px > b.x + b.w) } : null
}
// a note going from (px, py) to (x, y) leaves one: it counts there once, whether it went through it or was played
// from inside it
export function mineActivatorNoteHit(boxes: readonly MineActivatorBox[], px: number, py: number, x: number, y: number): MineActivatorBox | null {
  return boxes.find(o => inside(o, px, py) && !inside(o, x, y)) ?? null
}
// the ones a blast reaches, each with how much of it (1 at the centre, 0 at the rim)
export function mineActivatorBlast(boxes: readonly MineActivatorBox[], x: number, y: number, r: number): { box: MineActivatorBox; part: number }[] {
  if (r <= 0) return []
  const out: { box: MineActivatorBox; part: number }[] = []
  for (const b of boxes) {
    const d = Math.hypot(clamp(x, b.x, b.x + b.w) - x, clamp(y, b.y, b.y + b.h) - y)
    if (d < r) out.push({ box: b, part: 1 - d / r })
  }
  return out
}
// the ones a Golpe from (x, y) reaches: along the middle, the ends and the quarters of its arc, as far as `reach`
export function mineActivatorBlow(boxes: readonly MineActivatorBox[], x: number, y: number, angle: number, arc: number, reach: number): MineActivatorBox[] {
  const wide = Math.min(Math.abs(arc), Math.PI * 2), out: MineActivatorBox[] = []
  for (const part of [0, -0.25, 0.25, -0.5, 0.5]) {
    const a = angle + wide * part
    for (let k = 1; k <= 8; k++) {
      const d = (reach * k) / 8, b = boxes.find(o => inside(o, x + Math.cos(a) * d, y + Math.sin(a) * d))
      if (b) { if (!out.includes(b)) out.push(b); break }
    }
  }
  return out
}
// what an instrument's Golpe is worth in notes: the same share of the music bar its damage takes of the damage bar
export const mineActivatorBlowNotes = (p: MineActivatorParams, damage: number) => Math.max(1, Math.min(64, Math.round((damage / p.damage) * p.notes)))

// ---------- its bars ----------

export type MineActivatorBars = { notes: number; damage: number }
// notes and damage poured into its bars; the bar that fills says how it turns the grid on (music first)
export function fillMineActivator(bars: MineActivatorBars, p: MineActivatorParams, notes: number, damage: number): MineActivatorVia | null {
  bars.notes = Math.min(p.notes, bars.notes + Math.max(0, notes))
  bars.damage = Math.min(p.damage, bars.damage + Math.max(0, damage))
  return bars.notes >= p.notes ? 'music' : bars.damage >= p.damage ? 'damage' : null
}

// ---------- online ----------

// the lobby owner's word on them: how the grid was turned on (0: it was not, 1: music, 2: damage), how many times
// (a new number is a new activation) and by which one, and each one's bars as shares (id, music, damage)
export type NetMineActivator = { v: 0 | 1 | 2; a: number; i: string; b: [string, number, number][] }
// what another browser's players poured into them (id, notes, damage)
export type NetMineActivatorHits = [string, number, number][]
const NET_ACTIVATORS = 64
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 80
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export const viaOut = (via: MineActivatorVia | null): 0 | 1 | 2 => (via === 'music' ? 1 : via === 'damage' ? 2 : 0)
export const viaIn = (v: 0 | 1 | 2): MineActivatorVia | null => (v === 1 ? 'music' : v === 2 ? 'damage' : null)
export function cleanNetMineActivator(raw: unknown): NetMineActivator | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  if ((m.v !== 0 && m.v !== 1 && m.v !== 2) || !num(m.a) || m.a < 0 || !Array.isArray(m.b)) return null
  const b: [string, number, number][] = []
  for (const x of m.b.slice(0, NET_ACTIVATORS)) if (Array.isArray(x) && id(x[0]) && num(x[1]) && num(x[2])) b.push([x[0], clamp(x[1], 0, 1), clamp(x[2], 0, 1)])
  return { v: m.v, a: Math.floor(m.a), i: id(m.i) ? m.i : '', b }
}
export function cleanNetMineActivatorHits(raw: unknown): NetMineActivatorHits | null {
  if (!Array.isArray(raw)) return null
  const out: NetMineActivatorHits = []
  for (const x of raw.slice(0, NET_ACTIVATORS)) if (Array.isArray(x) && id(x[0]) && num(x[1]) && num(x[2]) && x[1] >= 0 && x[2] >= 0) out.push([x[0], Math.min(x[1], 1000), Math.min(x[2], 100000)])
  return out.length ? out : null
}
