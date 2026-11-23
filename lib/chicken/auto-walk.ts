import type { ChickenAction } from './controls'

// Point-and-click (andar automático): the walk to a clicked spot, or to a portal's button.
// Only steering controls of her own call it off: a direction, Up or Jump. Crouch (Agachar), Run (Correr) and Brood
// (Chocar) change how she walks there (crouched, running, brooding) without cancelling it.
export const AUTO_WALK_CANCEL: readonly ChickenAction[] = ['left', 'right', 'up', 'jump']
export const cancelsAutoWalk = (action: ChickenAction) => AUTO_WALK_CANCEL.includes(action)

// She arrives when she is under the spot (tol), or, on the ground and moving toward it, when what she needs to brake
// (v² / 2·decel) covers what is left: letting go there stops her on the spot instead of sliding past it, which
// running would make long.
export function autoWalkArrived(dx: number, vx: number, decel: number, tol: number, grounded: boolean) {
  if (Math.abs(dx) < tol) return true
  if (!grounded || decel <= 0 || vx * dx <= 0) return false
  return (vx * vx) / (2 * decel) >= Math.abs(dx)
}

// The stuck check (barely moved in 0.3 s) waits while what she holds keeps her still on purpose: brooding with a
// brooding walk of 0, or crouched with a crouched speed of 0. Letting go, she goes on walking.
export function autoWalkHeldStill(grounded: boolean, brood: boolean, broodWalk: number, crouch: boolean, crouchSpeed: number) {
  return grounded && ((brood && broodWalk <= 0) || (!brood && crouch && crouchSpeed <= 0))
}
