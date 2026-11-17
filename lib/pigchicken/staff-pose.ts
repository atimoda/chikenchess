// How she carries a staff (an item only for hitting: the taco, the passaguá), as a pose in her body's frame. Pure: the
// held pose (lib/pigchicken/held-pose.ts) hands it to the rig, the Itens panel's editor draws it.
//
// Rig units from her shoulder, facing right: x to her front, y down; angles in degrees, 0 = pointing to her front,
// -90 = up (the body's mirror turns it all when she faces left). The wing's hand grips the staff's drawing at
// (gripX, gripY) and that point sits at (x, y); the staff is turned to `angle` around it.
import type { ItemDef } from './items'

// grip2: the point of the drawing a two-armed character's other hand holds (null: that hand rests)
export type StaffPose = { x: number; y: number; angle: number; gripX: number; gripY: number; flip: boolean; grip2: { x: number; y: number } | null }
type StaffDef = Pick<ItemDef, 'gripX' | 'gripY' | 'staffX' | 'staffY' | 'staffAngle' | 'windX' | 'windY' | 'windAngle' | 'wingFlip' | 'grip2On' | 'grip2X' | 'grip2Y'>

const DEG = Math.PI / 180
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
// carried, the staff leans a little with the aim: up to this many degrees, forward aiming down and back aiming up
export const STAFF_LEAN = 6
// charging: how far the charge's pose is taken (0..1) for a share of the charge. It goes back fast at first and
// keeps going until the charge is full
export const windEase = (charge: number) => { const k = clamp(charge, 0, 1); return 1 - (1 - k) * (1 - k) }
// charging, the staff sways (degrees, growing with the charge) and trembles once the charge is full
const SWAY = 4, SWAY_MS = 130, TREMBLE = 1.6, TREMBLE_MS = 25

/** The aim's elevation in her body's frame (radians, 0 = to her front, negative = up), kept to her front half. */
export function aimElevation(aimAngle: number, face: number) {
  const a = face < 0 ? Math.PI - aimAngle : aimAngle
  return clamp(Math.atan2(Math.sin(a), Math.cos(a)), -Math.PI / 2, Math.PI / 2)
}

/**
 * The staff's pose. charge: how full the strong blow's charge is (0 = just carried); elev: the aim's elevation
 * (aimElevation); now: ms, for the sway.
 * Charging, the pose goes from the carried one to the charged one (wind*), which turns with the aim around her
 * shoulder: aiming up, the staff winds back lower; aiming down, higher (always opposite the blow).
 */
export function staffPose(d: StaffDef, charge = 0, elev = 0, now = 0): StaffPose {
  const k = windEase(charge)
  const turn = elev * k, c = Math.cos(turn), s = Math.sin(turn)
  const wx = d.windX * c - d.windY * s, wy = d.windX * s + d.windY * c
  const sway = k > 0 ? Math.sin(now / SWAY_MS) * SWAY * k + (charge >= 1 ? Math.sin(now / TREMBLE_MS) * TREMBLE : 0) : 0
  return {
    x: d.staffX + (wx - d.staffX) * k,
    y: d.staffY + (wy - d.staffY) * k,
    angle: d.staffAngle + (d.windAngle - d.staffAngle) * k + turn / DEG + Math.sin(elev) * STAFF_LEAN * (1 - k) + sway,
    gripX: d.gripX, gripY: d.gripY, flip: d.wingFlip,
    grip2: d.grip2On ? { x: d.grip2X, y: d.grip2Y } : null,
  }
}

/** The angle equal to `angle` (degrees) that is closest to `near`: a dragged tip keeps turning the way it was going. */
export function unwrapAngle(angle: number, near: number) {
  return near + ((((angle - near) % 360) + 540) % 360 - 180)
}
