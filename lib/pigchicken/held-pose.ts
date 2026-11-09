// One pose contract for every local player: Throw and proportional Fire share the pullback.
import type { Combat } from './combat'
import type { ChickenEngine } from '../chicken/engine'
import { ITEM_SVG } from './art'
export function heldItemPose(combat: Combat, now: number, bow?: { x: number; stroke: number } | null, faceHint?: number): Parameters<ChickenEngine['setHeld']>[0] {
  const held = combat.held, eating = combat.consumption
  const id = eating?.item ?? held?.item
  if (!id) return null
  const svg = ITEM_SVG[id]
  if (!svg) return null
  const d = combat.item(id), swinging = !!combat.swing
  const charge = swinging ? 0 : Math.max(combat.throwCharge, d.fireMode === 'charge' ? combat.fireCharge : 0)
  const pull = charge > 0 ? 6 + 30 * charge + (charge >= 1 ? Math.sin(now / 25) * 1.5 : 0) : 0
  const sportsTool = id === 'bat' || id === 'passagua'
  const face = faceHint === -1 ? -1 : faceHint === 1 ? 1 : Math.cos(combat.aimAngle) >= 0 ? 1 : -1
  // Keep the shaft upright and slightly swept behind her. Vertical aim changes the lean softly without
  // moving the grip away from the wing hand.
  const sportsPose = sportsTool && combat.throwCharge <= 0
  const angle = sportsPose ? -Math.PI / 2 - face * 0.14 + Math.sin(combat.aimAngle) * 0.08 : combat.throwCharge > 0 ? combat.throwAngle : combat.aimAngle
  return {
    svg, itemKey: id, angle,
    kick: combat.kick + pull, pull,
    throwing: !swinging && combat.throwCharge > 0,
    atHand: sportsTool || d.consumable || (d.reticle === 'grenade' && d.fireMode === 'charge') || charge > 0,
    consumable: d.consumable ? { upright: d.consumeKind === 'liquid' ? -90 : 0, progress: eating ? 1 - eating.left / eating.total : undefined } : undefined,
    bow: charge <= 0 ? bow : null,
  }
}
