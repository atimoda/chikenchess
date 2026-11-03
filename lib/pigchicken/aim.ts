// PigChicKen aim: which input owns the aim this frame and where it points. Pure functions, screen coordinates (y down).
// Priority: right stick > mouse (after it moves) > on-screen right stick > left stick > facing. The movement keys
// (arrows, WASD) do not aim.

export type Stick = { x: number; y: number; mag: number }
export type AimSource = 'rightStick' | 'mouse' | 'touch' | 'leftStick' | 'keys' | 'facing'
export type AimInput = {
  rightStick: Stick | null
  mouse: { x: number; y: number } | null // cursor, only while the mouse owns the aim
  touch: Stick | null
  leftStick: Stick | null
  keys: { x: number; y: number } // -1, 0 or 1 on each axis (movement keys: not used for the aim any more)
  origin: { x: number; y: number } // where the aim starts (her shoulder)
  face: number
  grounded: boolean
  aimLock: boolean
  magnet: boolean
  magnetDeg: number
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
  if (i.rightStick) return fromVec(i.rightStick.x, i.rightStick.y, 'rightStick', i.rightStick.mag, true)
  if (i.mouse) {
    const dx = i.mouse.x - i.origin.x, dy = i.mouse.y - i.origin.y
    if (Math.hypot(dx, dy) > 4) return fromVec(dx, dy, 'mouse', 1, true, { ...i.mouse })
  }
  if (i.touch) return fromVec(i.touch.x, i.touch.y, 'touch', i.touch.mag, true)
  // on the ground, down is crouch: it only aims while the aim is locked
  const downOk = !i.grounded || i.aimLock
  if (i.leftStick) {
    let { x, y } = i.leftStick
    if (y > 0 && !downOk) y = 0
    if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
      let a = Math.atan2(y, x)
      if (i.magnet) a = magnetAngle(a, i.magnetDeg)
      return { ...fromVec(Math.cos(a), Math.sin(a), 'leftStick', i.leftStick.mag, false) }
    }
  }
  // the keyboard's movement keys never aim (they would fight the mouse): with no other aim, she aims ahead
  return fromVec(i.face || 1, 0, 'facing', 1, false)
}

// The mouse takes the aim after moving `grabPx`; it gives it back when the arrows / left stick are used and the
// mouse has been still for `idleS` seconds.
export function createMouseOwner(grabPx = 8) {
  let owns = false, travel = 0, lastMove = -Infinity
  return {
    get owns() { return owns },
    moved(dist: number, now: number) {
      travel += dist; lastMove = now
      if (travel >= grabPx) owns = true
    },
    otherAim(now: number, idleS: number) {
      if (owns && now - lastMove >= idleS * 1000) { owns = false; travel = 0 }
    },
  }
}

export const normAngle = (a: number) => ((a % TAU) + TAU) % TAU
