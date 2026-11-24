// Which switch of side a gesture asks for, on a floating collider (a box, a wire). Pure: the engine (engine.ts)
// finds the surface and moves her. Two switches:
// - 'face': the other face of the same line, at the same point (a box's top <-> hanging under that top from inside the
//   box; its side from outside <-> from inside; hanging under the box <-> standing inside on its bottom; a wire's
//   top <-> under it).
// - 'box': the opposite side of the whole box (its top <-> hanging under its bottom; its left side <-> its right
//   side, outside).
// Brood + Jump is the face switch. The box switch is Brood + Jump with the direction that points into the surface
// (Down standing on it, Up hanging from it), and the gestures without Brood that already were: Jump against her
// look (standing or hanging), Jump with Up hanging, Jump toward the wall on a side.
// The hard colliders have one side only: no switch at all (the engine never asks for them).
// On a wall, Brood + Jump with the direction that points away from it is no switch: it prepares a shocking jump off
// the wall ('shock'), on any wall, hard or not. Letting go of Jump launches it; letting go of Brood first cancels it.
export type SideSwitch = 'face' | 'box' | null
type Keys = { brood: boolean; up: boolean; down: boolean }

// standing on a floating floor. against: a direction just pressed against where she looks
export function standSwitch(k: Keys & { against: boolean }): SideSwitch {
  // (Up + Brood + Jump is the shocking jump up)
  if (k.brood) return k.up ? null : k.down ? 'box' : 'face'
  return k.against && !k.down ? 'box' : null
}

// hanging upside down under a ceiling
export function hangSwitch(k: Keys & { against: boolean }): SideSwitch {
  if (k.up || k.against) return 'box'
  return k.brood && !k.down ? 'face' : null
}

// clinging to a wall. dir: left/right held (-1, 0, 1); toward: that direction points into the wall
export function wallSwitch(k: { brood: boolean; dir: number; toward: boolean }): SideSwitch | 'shock' {
  // (away from the wall without Brood it is the wall jump)
  if (k.dir !== 0) return k.toward ? 'box' : k.brood ? 'shock' : null
  return k.brood ? 'face' : null
}

// on a hard wall of the Grade de blocos that leads to another room (engine.ts, crossWall), Jump with the one direction
// that points into it also takes her through: toward a wall she clings to (left on her left wall), or Up hanging from
// a ceiling. Never on a diagonal: Up or Crouch on a wall, or left/right hanging, keep Jump what it was. (Brood + Jump,
// the older gesture, still goes through, in the engine.) dir: left/right held (-1, 0, 1); toward: it points into the wall
export function crossDirection(k: { hanging: boolean; dir: number; toward: boolean; up: boolean; down: boolean }): boolean {
  if (k.down) return false
  return k.hanging ? k.up && k.dir === 0 : k.dir !== 0 && k.toward && !k.up
}

// standing on the floor of a room of the Grade de blocos over another room (engine.ts, crossWall), or on a cut
// corner's slanted floor with a room on that diagonal: Brood + Jump (without Up or Crouch) takes her through, and so
// does Down (Crouch) + Jump without Up, Brood or left/right, which is no super jump there. (Down with a direction is
// still the sideways super jump.) dir: left/right held (-1, 0, 1)
export function crossFloor(k: { brood: boolean; crouch: boolean; up: boolean; dir: number }): boolean {
  if (k.up) return false
  return k.brood ? !k.crouch : k.crouch && k.dir === 0
}
