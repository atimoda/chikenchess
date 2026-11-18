// Portal interaction is per character and per entrance, independent of render rate.
export type PortalBody = { x: number; y: number; scale: number; state: string }
export type PortalCircle = { x: number; y: number; r: number }
export const PORTAL_TRANSITION_MS = 950
const ARRIVAL_KEY = 'chickenchess:portal-arrival'

export function overlapsPortal(body: PortalBody, portal: PortalCircle) {
  // Entire bird, rather than just the centre used to offer entry. A foot/head
  // still touching the ring must not re-arm the destination.
  const x = Math.max(body.x - 90 * body.scale, Math.min(portal.x, body.x + 100 * body.scale))
  const y = Math.max(body.y - 220 * body.scale, Math.min(portal.y, body.y + 16 * body.scale))
  return Math.hypot(x - portal.x, y - portal.y) <= portal.r
}

export function touchesPortal(body: PortalBody, circle: PortalCircle, alreadyTouching: boolean) {
  const dx = body.x - circle.x, dy = body.y - 80 * body.scale - circle.y
  const k = alreadyTouching ? 1.15 : 1
  return Math.abs(dx) < circle.r * .55 * k && Math.abs(dy) < circle.r * .95 * k && Math.hypot(dx, dy) < circle.r
}

export function createPortalGate() {
  let blocked = false, touching = false, wasUsing = false
  return {
    block() { blocked = true; touching = false },
    update(body: PortalBody, circle: PortalCircle, using: boolean, enabled = true, walkingHere = false) {
      const transiting = body.state === 'portal' || body.state === 'portalArrival'
      const overlaps = overlapsPortal(body, circle)
      if (transiting && overlaps) blocked = true
      if (!transiting && !overlaps) blocked = false
      const wasTouching = touching
      touching = enabled && !blocked && !transiting && touchesPortal(body, circle, wasTouching)
      const enter = touching && (walkingHere || (wasTouching && using && !wasUsing))
      wasUsing = using
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

// A Pátio's ring closes after the spawn: open at least SHUT_FIRST_MS once there is a chicken, then until SHUT_HOLD_MS
// after the last one came out of it or went in (`needed`, also while held open by the Modo editor). Needed again, it
// reopens from wherever it was.
export const PORTAL_CLOSE_MS = 720
export const PORTAL_OPEN_MS = 380
const SHUT_FIRST_MS = 700
const SHUT_HOLD_MS = 280
export type PortalShut = { phase: 'open' | 'closing' | 'closed' | 'opening'; at: number; from: number; closeAt: number }

export function createPortalShut(closed = false): PortalShut {
  return { phase: closed ? 'closed' : 'open', at: 0, from: closed ? 0 : 1, closeAt: 0 }
}

// how open the ring is (its size, 1 = open): closing, it swells a little and then collapses faster and faster;
// opening, it overshoots a little
export function portalOpenness(s: PortalShut, now: number) {
  if (s.phase === 'open') return 1
  if (s.phase === 'closed') return 0
  if (s.phase === 'closing') {
    const k = Math.min(1, (now - s.at) / PORTAL_CLOSE_MS)
    return Math.max(0, s.from * (k < 0.18 ? 1 + 0.07 * k / 0.18 : 1.07 * Math.cos((k - 0.18) / 0.82 * Math.PI / 2)))
  }
  const t = Math.min(1, (now - s.at) / PORTAL_OPEN_MS) - 1
  return s.from + (1 - s.from) * (1 + 2.70158 * t * t * t + 1.70158 * t * t)
}

// one frame: `ready` once the Pátio has its chicken (the timer starts there)
export function stepPortalShut(s: PortalShut, now: number, needed: boolean, ready: boolean) {
  if (!s.closeAt && ready) s.closeAt = now + SHUT_FIRST_MS
  if (needed) s.closeAt = Math.max(s.closeAt, now + SHUT_HOLD_MS)
  if (needed && (s.phase === 'closed' || s.phase === 'closing')) Object.assign(s, { phase: 'opening', from: portalOpenness(s, now), at: now })
  else if (!needed && s.closeAt && now >= s.closeAt && (s.phase === 'open' || s.phase === 'opening')) Object.assign(s, { phase: 'closing', from: portalOpenness(s, now), at: now })
  if (s.phase === 'opening' && now - s.at >= PORTAL_OPEN_MS) s.phase = 'open'
  if (s.phase === 'closing' && now - s.at >= PORTAL_CLOSE_MS) s.phase = 'closed'
  return s
}
