// One pose contract for every local player: Throw and proportional Fire share the pullback.
import type { Combat } from './combat'
import type { ChickenEngine } from '../chicken/engine'
import { ITEM_SVG } from './art'
import { isStaff, itemRig } from './items'
import { aimElevation, staffPose } from './staff-pose'
export function heldItemPose(combat: Combat, now: number, bow?: { x: number; stroke: number } | null, faceHint?: number): Parameters<ChickenEngine['setHeld']>[0] {
  const held = combat.held, eating = combat.consumption
  const id = eating?.item ?? held?.item
  if (!id) return null
  // thrown and on its way back (the Martelo de Thor): her wing is empty until it arrives
  if (held?.flying && !eating) return null
  const svg = ITEM_SVG[id]
  if (!svg) return null
  const d = combat.item(id), sw = combat.swing, swinging = !!sw
  const charge = swinging ? 0 : Math.max(combat.throwCharge, d.fireMode === 'charge' ? combat.fireCharge : 0)
  const pull = charge > 0 ? 6 + 30 * charge + (charge >= 1 ? Math.sin(now / 25) * 1.5 : 0) : 0
  const face = faceHint === -1 ? -1 : faceHint === 1 ? 1 : Math.cos(combat.aimAngle) >= 0 ? 1 : -1
  // a staff has its own pose on her body (lib/pigchicken/staff-pose.ts): carried, or wound back while the strong
  // blow charges. A blow leaves from the pose it was let go in (the charged one, for a strong blow) and comes back
  // to the carried one. A Throw takes the item to the hand like any other
  const staff = isStaff(d) && !eating && combat.throwCharge <= 0
  const wind = sw ? (sw.heavy && sw.t < sw.hitAt ? sw.charge ?? 0 : 0) : combat.heavyCharge
  return {
    svg, itemKey: id, angle: combat.throwCharge > 0 ? combat.throwAngle : combat.aimAngle,
    kick: combat.kick + pull, pull,
    throwing: !swinging && combat.throwCharge > 0,
    atHand: isStaff(d) || d.consumable || (d.reticle === 'grenade' && d.fireMode === 'charge') || charge > 0,
    consumable: d.consumable ? { upright: d.consumeKind === 'liquid' ? -90 : 0, progress: eating ? 1 - eating.left / eating.total : undefined } : undefined,
    bow: charge <= 0 ? bow : null,
    rig: charge <= 0 && !swinging ? itemRig(d) : null,
    staff: staff ? staffPose(d, wind, aimElevation(combat.aimAngle, face), now) : null,
  }
}
