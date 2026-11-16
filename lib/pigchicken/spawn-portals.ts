// Portais de nascimento: the portals the players of a browser may be born at when a Pátio opens. The entry portal
// (the one to the globe) and every "Portal de nascimento" take part, each with its chance (params.spawnChance, whole
// percents) and the chances always add up to 100. Pure: the layout keeps the params, the editor moves the sliders
// (patio-editor.tsx) and chicken-patio.tsx draws the portal.
import type { LayoutElement } from './layout'

type Portal = Pick<LayoutElement, 'id' | 'kind' | 'params'>

export const isSpawnPortal = (el: Pick<LayoutElement, 'kind'>) => el.kind === 'entry' || el.kind === 'spawn'
// "Bloco liberado" (the Grade de blocos): on for the entry portal and off for the others until someone says otherwise
export const isFreeBlock = (el: Pick<LayoutElement, 'kind' | 'params'>) => el.params.freeBlock ?? el.kind === 'entry'
export const spawnPortalsOf = <T extends Pick<LayoutElement, 'kind'>>(elements: T[]) => elements.filter(isSpawnPortal)

const weight = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

// whole numbers in the proportion of the weights, adding up to exactly `total` (the largest remainders take what the
// rounding leaves; the first one on a tie). No weight at all: equal parts.
export function shareOut(weights: number[], total = 100): number[] {
  const n = weights.length
  if (!n) return []
  const clean = weights.map(weight), sum = clean.reduce((a, b) => a + b, 0)
  const exact = clean.map(w => (sum > 0 ? (w / sum) * total : total / n))
  const out = exact.map(Math.floor)
  let left = Math.round(total - out.reduce((a, b) => a + b, 0))
  const order = exact.map((v, i) => ({ i, rest: Math.round((v - Math.floor(v)) * 1e6) })).sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (let k = 0; left > 0 && k < order.length; k++, left--) out[order[k].i]++
  return out
}

// the chance of each portal as the game reads it: what is saved, in proportion; one without a saved chance takes an
// equal part (100 / n) and the others share the rest
export function spawnChances(portals: Portal[]): number[] {
  const n = portals.length
  if (n <= 1) return n ? [100] : []
  const saved = portals.map(p => (typeof p.params.spawnChance === 'number' && Number.isFinite(p.params.spawnChance) ? Math.max(0, p.params.spawnChance) : null))
  const missing = saved.filter(v => v === null).length
  if (missing === n) return shareOut(portals.map(() => 1))
  const part = 100 / n, rest = 100 - missing * part
  const sum = saved.reduce<number>((a, v) => a + (v ?? 0), 0), known = n - missing
  return shareOut(saved.map(v => (v === null ? part : sum > 0 ? (v / sum) * rest : rest / known)))
}

// a slider moved: the difference goes to (or comes from) the others in the proportion of what each one had; all the
// others at 0, it is split equally
export function setChance(chances: number[], index: number, value: number): number[] {
  if (chances.length <= 1 || index < 0 || index >= chances.length) return shareOut(chances)
  const v = Math.round(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)))
  const others = shareOut(chances.filter((_, i) => i !== index), 100 - v)
  return chances.map((_, i) => (i === index ? v : others[i < index ? i : i - 1]))
}

// the portal she is born at, for a roll in [0, 1): never one at 0%
export function pickSpawn(chances: number[], roll: number): number {
  const sum = chances.reduce((a, b) => a + weight(b), 0)
  if (sum <= 0) return chances.length ? Math.min(chances.length - 1, Math.floor(Math.max(0, Math.min(0.999999, roll)) * chances.length)) : -1
  const at = Math.max(0, Math.min(0.999999, roll)) * sum
  let acc = 0, last = -1
  for (let i = 0; i < chances.length; i++) {
    const w = weight(chances[i])
    if (!w) continue
    acc += w; last = i
    if (at < acc) return i
  }
  return last
}

// ---------- on the layout's elements (the editor) ----------

const withChances = <T extends LayoutElement>(elements: T[], chances: number[] | null): T[] => {
  let i = 0
  return elements.map(el => {
    if (!isSpawnPortal(el)) return el
    const params = { ...el.params }
    if (chances) params.spawnChance = chances[i++]
    else delete params.spawnChance
    return { ...el, params }
  })
}

// after a portal joins or leaves: one that joins takes an equal part (100 / n) and the others shrink in proportion;
// the part of one that leaves goes back to the others in proportion. A single portal keeps no chance at all.
export function rebalanceSpawnPortals<T extends LayoutElement>(before: LayoutElement[], next: T[]): T[] {
  const now = spawnPortalsOf(next), n = now.length
  if (n <= 1) return now.some(p => p.params.spawnChance !== undefined) ? withChances(next, null) : next
  const was = spawnPortalsOf(before), had = new Map(spawnChances(was).map((c, i) => [was[i].id, c]))
  const kept = now.filter(p => had.has(p.id)), fresh = n - kept.length
  const part = 100 / n, rest = 100 - fresh * part
  const sum = kept.reduce((a, p) => a + had.get(p.id)!, 0)
  return withChances(next, shareOut(now.map(p => (!had.has(p.id) ? part : sum > 0 ? (had.get(p.id)! / sum) * rest : rest / kept.length))))
}

// the slider of one portal moved in the editor: every portal's chance is written again
export function setSpawnChance<T extends LayoutElement>(elements: T[], id: string, value: number): T[] {
  const portals = spawnPortalsOf(elements), index = portals.findIndex(p => p.id === id)
  if (index < 0 || portals.length <= 1) return elements
  return withChances(elements, setChance(spawnChances(portals), index, value))
}
