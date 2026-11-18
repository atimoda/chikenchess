// One pose contract for every local player: Throw and proportional Fire share the pullback.
import type { Combat } from './combat'
import type { ChickenEngine } from '../chicken/engine'
import { ARCHERY_ART, HOOK_CUFF_SVG, ITEM_SVG } from './art'
import { classItem, isStaff, itemRig, pointClassOf } from './items'
import { aimElevation, staffPose } from './staff-pose'
export function heldItemPose(combat: Combat, now: number, bow?: { x: number; stroke: number } | null, faceHint?: number): Parameters<ChickenEngine['setHeld']>[0] {
  const held = combat.held, eating = combat.consumption
  const id = eating?.item ?? held?.item
  if (!id) return null
  // (held as this body's class holds it: Pig's and Ken's own Pontos)
  const d = classItem(combat.item(id), pointClassOf(combat.species)), sw = combat.swing, swinging = !!sw
  // the Corrente-gancho with its chain spinning or its hook out: only the shackle stays on her wrist (the chain is drawn
  // on the canvas)
  const cuffOnly = d.grapple && !eating && (!!held?.flying || combat.hookSpinning)
  // thrown and on its way back (the Martelo de Thor; both Boomerangs; a deck with every card away): her wing is
  // empty until one arrives
  if (held?.flying && !eating && !cuffOnly) return null
  const svg = cuffOnly ? HOOK_CUFF_SVG : ITEM_SVG[id]
  if (!svg) return null
  const charge = swinging ? 0 : Math.max(combat.throwCharge, d.fireMode === 'charge' ? combat.fireCharge : 0)
  // "Arco e Flecha": Fire's charge draws the arrow instead of pulling the whole item back. The item stays on its rig,
  // held still by the back wing, and the wing's hand takes its point (the arrow's nock) back along the item; at the
  // full charge it trembles a little
  const drawing = d.archery && d.fireMode === 'charge' && !swinging && combat.throwCharge <= 0 && combat.fireCharge > 0
  const draw = drawing ? d.drawLen * combat.fireCharge + (combat.fireCharge >= 1 ? Math.sin(now / 25) * 0.6 : 0) : 0
  const pull = charge > 0 && !drawing ? 6 + 30 * charge + (charge >= 1 ? Math.sin(now / 25) * 1.5 : 0) : 0
  // the bow and the arrow drawn apart: no arrow on the string with the quiver empty or while she reloads
  const parts = d.archery && !eating ? ARCHERY_ART[id] : undefined
  const face = faceHint === -1 ? -1 : faceHint === 1 ? 1 : Math.cos(combat.aimAngle) >= 0 ? 1 : -1
  // a staff has its own pose on her body (lib/pigchicken/staff-pose.ts): carried, or wound back while the strong
  // blow charges. A blow leaves from the pose it was let go in (the charged one, for a strong blow) and comes back
  // to the carried one. A Throw takes the item to the hand like any other
  const staff = isStaff(d) && !eating && combat.throwCharge <= 0
  const wind = sw ? (sw.heavy && sw.t < sw.hitAt ? sw.charge ?? 0 : 0) : combat.heavyCharge
  const pair = staff && !!held && d.returnThrow && !d.deck
  return {
    svg: parts?.body ?? svg, itemKey: id, angle: combat.throwCharge > 0 ? combat.throwAngle : combat.aimAngle,
    kick: combat.kick + pull, pull,
    throwing: !swinging && combat.throwCharge > 0,
    atHand: isStaff(d) || d.consumable || (d.reticle === 'grenade' && d.fireMode === 'charge') || (charge > 0 && !drawing),
    consumable: d.consumable ? { upright: d.consumeKind === 'liquid' ? -90 : 0, progress: eating ? 1 - eating.left / eating.total : undefined } : undefined,
    bow: charge <= 0 ? bow : null,
    rig: (charge <= 0 || drawing) && !swinging ? itemRig(d, draw) : null,
    archery: parts ? { x: d.handX - draw, y: d.handY, arrow: held && held.ammo > 0 && !combat.reloading ? parts.arrow : null, string: parts.string } : null,
    staff: staff ? staffPose(d, wind, aimElevation(combat.aimAngle, face), now) : null,
    // the Boomerang: with both in her wings, the second one is in the back wing's hand, carried still, and only the
    // front wing moves. With the front one away, the back wing holds the other: carried there the same way, and it
    // winds, hits and throws with it (each wing throws its own)
    off: pair && (combat.inHand(held!) >= 2 || (held!.back && wind <= 0 && !sw)) ? staffPose(d, 0, aimElevation(combat.aimAngle, face), now) : null,
    back: pair && !!held!.back,
    // two-armed characters: the back arm holds it and the front one is the second hand
    swap: d.swapHands,
    // the strong blow charging: two-armed characters wind it with the other hand
    charging: !swinging && combat.heavyCharging && combat.heavyCharge > 0,
  }
}
