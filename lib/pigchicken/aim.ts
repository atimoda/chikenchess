// PigChicKen aim: which input owns the aim this frame and where it points. Pure functions, screen coordinates (y down).
// Priority: right stick > mouse (after it moves) > on-screen right stick > left stick > movement keys > facing.
// The movement keys aim in the 8 directions for a player without the mouse (see keysAimFor); a player with the mouse
// gets them back after the mouse has been still for `keysAimRelease` seconds (0 = never).
import { magnetVector } from '../chicken/analog-magnet'

export type Stick = { x: number; y: number; mag: number }
export type AimSource = 'rightStick' | 'mouse' | 'touch' | 'leftStick' | 'keys' | 'facing'
export type AimInput = {
  rightStick: Stick | null
  mouse: { x: number; y: number } | null // cursor, only while the mouse owns the aim
  touch: Stick | null
  leftStick: Stick | null
  keys: { x: number; y: number } // -1, 0 or 1 on each axis: the movement keys (left / right / up / crouch)
  origin: { x: number; y: number } // where the aim starts (her shoulder)
  face: number
  aimMagnetDeg: number
}
export type Aim = {
  angle: number // radians, 0 = right, positive = down
  dx: number
  dy: number
  source: AimSource
  strength: number // 0..1: how far the stick is pushed (1 for mouse, keys and facing)
  secondary: boolean // right stick, mouse or on-screen right stick: these turn her around
  target: { x: number; y: number } | null // the exact point (mouse cursor)
}

// The movement keys aim only for a player without the mouse (a keyboard with a mouse beside it aims with the mouse).
// null devices (everything, as on the globe) include the mouse.
export const keysAimFor = (devices: readonly string[] | null) => !!devices && !devices.includes('mouse')
// A player with the mouse (not the globe's null list): the movement keys take the aim back from a mouse still for `idleS`
// seconds; 0 turns it off and the mouse keeps the aim.
export const keysAimAfterMouse = (devices: readonly string[] | null, idleS: number) => !!devices && devices.includes('mouse') && idleS > 0

const TAU = Math.PI * 2
const STEP = Math.PI / 4

// pulls an angle to the nearest of the 8 directions when it is within `deg` degrees of it
export function magnetAngle(angle: number, deg: number) {
  const snapped = Math.round(angle / STEP) * STEP
  return Math.abs(angle - snapped) <= (deg * Math.PI) / 180 ? snapped : angle
}

const fromVec = (dx: number, dy: number, source: AimSource, strength: number, secondary: boolean, target: Aim['target'] = null): Aim => {
  const len = Math.hypot(dx, dy) || 1
  return { angle: Math.atan2(dy, dx), dx: dx / len, dy: dy / len, source, strength, secondary, target }
}

export function resolveAim(i: AimInput): Aim {
  if (i.rightStick) { const stick = magnetVector(i.rightStick, i.aimMagnetDeg); return fromVec(stick.x, stick.y, 'rightStick', stick.mag, true) }
  if (i.mouse) {
    const dx = i.mouse.x - i.origin.x, dy = i.mouse.y - i.origin.y
    if (Math.hypot(dx, dy) > 4) return fromVec(dx, dy, 'mouse', 1, true, { ...i.mouse })
  }
  if (i.touch) { const stick = magnetVector(i.touch, i.aimMagnetDeg); return fromVec(stick.x, stick.y, 'touch', stick.mag, true) }
  // the left stick aims every way, up and down included, on the ground or in the air
  if (i.leftStick) {
    const { x, y } = i.leftStick
    if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
      const a = magnetAngle(Math.atan2(y, x), i.aimMagnetDeg)
      return { ...fromVec(Math.cos(a), Math.sin(a), 'leftStick', i.leftStick.mag, false) }
    }
  }
  // the movement keys aim in the 8 directions (the mouse / aim stick give the aim back to them after `aimRelease`)
  if (i.keys.x || i.keys.y) return fromVec(i.keys.x, i.keys.y, 'keys', 1, false)
  // with no other aim, she aims ahead
  return fromVec(i.face || 1, 0, 'facing', 1, false)
}

// Keep the cursor's radius around the grip while the weapon is still turning.
// Measuring cursor-to-muzzle distance and reusing it along another angle makes a
// fast reversal push the reticle away by up to twice the barrel length.
export function reticleAtAngle(target: { x: number; y: number }, grip: { x: number; y: number }, muzzle: { x: number; y: number }, angle: number) {
  const dx = Math.cos(angle), dy = Math.sin(angle)
  const mx = muzzle.x - grip.x, my = muzzle.y - grip.y
  const radius = Math.hypot(target.x - grip.x, target.y - grip.y)
  const along = mx * dx + my * dy, across = mx * dy - my * dx
  // Circle/ray-line intersection. Signed travel also handles a cursor closer
  // than the barrel; very close cursors fall back to the nearest point on the line.
  const travel = -along + Math.sqrt(Math.max(0, radius * radius - across * across))
  return { x: muzzle.x + dx * travel, y: muzzle.y + dy * travel, distance: Math.abs(travel) }
}

// The mouse (or the aim stick) takes the aim after moving `grabPx`; it gives it back when the movement keys / left stick are
// used and it has been still for `idleS` seconds. `idleS` = Infinity: it never gives it back (the aim stays put).
export function createMouseOwner(grabPx = 8) {
  let owns = false, travel = 0, lastMove = -Infinity
  return {
    get owns() { return owns },
    moved(dist: number, now: number) {
      travel += dist; lastMove = now
      if (travel >= grabPx) owns = true
    },
    otherAim(now: number, idleS: number) {
      if (owns && Number.isFinite(idleS) && now - lastMove >= idleS * 1000) { owns = false; travel = 0 }
    },
    release() { owns = false; travel = 0 },
  }
}

export const normAngle = (a: number) => ((a % TAU) + TAU) % TAU
