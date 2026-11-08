import { normalizeTrampoline, type TrampolineParams } from '../pigchicken/trampoline'
import type { CollisionOcclusion } from './collision-occlusion'

// Shared by local chickens. World colliders already have numeric layout bounds,
// so following the Pátio camera must not force a DOM layout for every collider.
type PlatformRect = { left: number; top: number; right: number; bottom: number; width: number; height: number }
const offsets = new WeakMap<Element, { x: number; y: number }>()
const worldOcclusions = new WeakMap<Element, NonNullable<CollisionOcclusion>>()
const worldBoxes = new WeakMap<Element, { source: string; coords: number[] }>()
let elements: Element[] = [], queriedAt = -Infinity
export type PlatformOcclusion = { clip: NonNullable<CollisionOcclusion>['clip']; depth: number; x: number; y: number }
let measuredAt = -Infinity, measured: { el: Element; rect: PlatformRect; occlusion?: PlatformOcclusion }[] = []

export function setPlatformWorldOcclusion(world: Element, clip: CollisionOcclusion) {
  if (clip) worldOcclusions.set(world, clip)
  else worldOcclusions.delete(world)
  measuredAt = -Infinity
}

export function setPlatformWorldOffset(world: Element, x: number, y: number) {
  const old = offsets.get(world)
  if (old?.x === x && old.y === y) return
  offsets.set(world, { x, y }); measuredAt = -Infinity
}

export function chickenPlatformElements(now: number) {
  if (now - queriedAt > 200) {
    elements = [...new Set(document.querySelectorAll('[data-chicken-platform], [data-chicken-platforms] > *'))]
    queriedAt = now; measuredAt = -Infinity
  }
  return elements
}

export function chickenPlatformRects(now: number) {
  const found = chickenPlatformElements(now)
  if (now === measuredAt) return measured
  measuredAt = now
  measured = found.filter(el => el.isConnected).map(el => {
    const h = el as HTMLElement, source = h.dataset.chickenWorldBox
    if (source) {
      const world = el.closest('[data-chicken-world]'), offset = world && offsets.get(world)
      if (world && offset) {
        let box = worldBoxes.get(el)
        if (!box || box.source !== source) {
          box = { source, coords: source.split(',').map(Number) }
          worldBoxes.set(el, box)
        }
        const [x, y, width, height] = box.coords
        const left = x + offset.x, top = y + offset.y
        const clip = worldOcclusions.get(world)?.clip
        return {
          el, rect: { left, top, right: left + width, bottom: top + height, width, height },
          occlusion: clip ? { clip, depth: Number(h.dataset.chickenDepth ?? 0), x: offset.x, y: offset.y } : undefined,
        }
      }
    }
    return { el, rect: el.getBoundingClientRect() }
  })
  return measured
}


// Cache independent lines in one collider node. Floors and climbable edges keep separate groups.
type PlatformLine = { src: string; groups: number[][][] }
const lineCache = new WeakMap<Element, PlatformLine>()
const wallCache = new WeakMap<Element, PlatformLine>()
function platformPaths(el: Element, src: string | undefined, cache: WeakMap<Element, PlatformLine>) {
  if (!src) return null
  const old = cache.get(el)
  if (old?.src === src) return old.groups
  const groups = src.split('|').map(line => line.trim().split(/\s+/)
    .map(point => point.split(',').map(Number)).filter(point => point.length === 2 && point.every(Number.isFinite)))
  cache.set(el, { src, groups })
  return groups
}
export const chickenPlatformLines = (el: Element) => platformPaths(el, (el as HTMLElement).dataset.chickenLine, lineCache)
export const chickenPlatformWalls = (el: Element) => platformPaths(el, (el as HTMLElement).dataset.chickenWalls, wallCache)
// a closed outline (`data-chicken-shape`, one polygon) and whether it is an "Objeto duro" (`data-chicken-hard`)
const shapeCache = new WeakMap<Element, PlatformLine>()
export const chickenPlatformShape = (el: Element) => platformPaths(el, (el as HTMLElement).dataset.chickenShape, shapeCache)?.[0] ?? null
export const chickenPlatformHard = (el: Element) => (el as HTMLElement).dataset.chickenHard !== undefined

const bounceCache = new WeakMap<Element, { src: string; params: TrampolineParams }>()
export function chickenPlatformBounce(el: Element) {
  const src = (el as HTMLElement).dataset.chickenBounce
  if (!src) return null
  const old = bounceCache.get(el)
  if (old?.src === src) return old.params
  const [strength, angle] = src.split(',').map(Number)
  const params = normalizeTrampoline({ strength, angle })
  bounceCache.set(el, { src, params })
  return params
}
