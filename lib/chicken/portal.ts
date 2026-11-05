// Portal interaction is per character and per entrance, independent of render rate.
export type PortalBody = { x: number; y: number; scale: number; vx: number; state: string }
export type PortalCircle = { x: number; y: number; r: number }
export const PORTAL_TRANSITION_MS = 750
const ARRIVAL_KEY = 'chickenchess:portal-arrival'

export function overlapsPortal(body: PortalBody, portal: PortalCircle) {
  // Entire bird, rather than just the centre used to offer entry. A foot/head
  // still touching the ring must not re-arm the destination.
  const x = Math.max(body.x - 90 * body.scale, Math.min(portal.x, body.x + 100 * body.scale))
  const y = Math.max(body.y - 220 * body.scale, Math.min(portal.y, body.y + 16 * body.scale))
  return Math.hypot(x - portal.x, y - portal.y) <= portal.r
}

export function createPortalGate() {
  let blocked = false, touching = false, wasRun = false, wasGrab = false
  return {
    block() { blocked = true; touching = false },
    update(body: PortalBody, circle: PortalCircle, held: { run: boolean; grab: boolean }) {
      const transiting = body.state === 'portal' || body.state === 'portalArrival'
      const overlaps = overlapsPortal(body, circle)
      if (transiting && overlaps) blocked = true
      if (!transiting && !overlaps) blocked = false
      const k = touching ? 1.15 : 1
      touching = !blocked && !transiting && Math.abs(body.x - circle.x) < circle.r * 0.55 * k && Math.abs(body.y - 80 * body.scale - circle.y) < circle.r * 0.95 * k
      const enter = touching && ((held.run && !wasRun) || (held.grab && !wasGrab) || (held.run && Math.abs(body.vx) > 40))
      wasRun = held.run; wasGrab = held.grab
      return { touching, enter, blocked: blocked || transiting }
    },
  }
}

const gates = new WeakMap<object, Map<string, ReturnType<typeof createPortalGate>>>()
export function portalGate(actor: object, id: string) {
  let entries = gates.get(actor)
  if (!entries) { entries = new Map(); gates.set(actor, entries) }
  let gate = entries.get(id)
  if (!gate) { gate = createPortalGate(); entries.set(id, gate) }
  return gate
}

export function markPortalArrival(destination: string) {
  try { window.sessionStorage.setItem(ARRIVAL_KEY, JSON.stringify({ destination, at: Date.now() })) } catch { /* private mode */ }
}
export function takePortalArrival(destination: string) {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(ARRIVAL_KEY) || 'null')
    if (!value || value.destination !== destination) return false
    window.sessionStorage.removeItem(ARRIVAL_KEY)
    return typeof value.at === 'number' && Date.now() - value.at >= 0 && Date.now() - value.at < 8000
  } catch { return false }
}
