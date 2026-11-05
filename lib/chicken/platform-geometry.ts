// Shared by local chickens. World colliders already have numeric layout bounds,
// so following the Pátio camera must not force a DOM layout for every collider.
type PlatformRect = { left: number; top: number; right: number; bottom: number; width: number; height: number }
const offsets = new WeakMap<Element, { x: number; y: number }>()
let elements: Element[] = [], queriedAt = -Infinity
let measuredAt = -Infinity, measured: { el: Element; rect: PlatformRect }[] = []

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
      if (offset) {
        const [x, y, width, height] = source.split(',').map(Number)
        const left = x + offset.x, top = y + offset.y
        return { el, rect: { left, top, right: left + width, bottom: top + height, width, height } }
      }
    }
    return { el, rect: el.getBoundingClientRect() }
  })
  return measured
}
