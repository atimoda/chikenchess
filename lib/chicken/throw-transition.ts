// Pose in the item's parent coordinate system (the shoulder). Hand coordinates
// are separate because instruments may initially be held away from their grip.
export type ThrowPose = { x: number; y: number; angle: number; handX: number; handY: number }
export const THROW_TRANSITION_SECONDS = 0.2
const angleDelta = (to: number, from: number) => Math.atan2(Math.sin((to - from) * Math.PI / 180), Math.cos((to - from) * Math.PI / 180)) * 180 / Math.PI

export function createThrowTransition() {
  let state: { from: ThrowPose; progress: number; last: number; targetAngle: number | null } | null = null
  return {
    start(from: ThrowPose, now: number) { state = { from: { ...from }, progress: 0, last: now, targetAngle: null } },
    reset() { state = null },
    active: () => state !== null,
    sample(target: ThrowPose, now: number, speed: number): ThrowPose {
      if (!state) return target
      state.progress = Math.min(1, state.progress + Math.max(0, now - state.last) / (THROW_TRANSITION_SECONDS * 1000) * Math.max(0.01, speed))
      state.last = Math.max(now, state.last)
      if (state.progress >= 1) { state = null; return target }
      // Unwrap the moving aim target continuously, taking the short route when
      // the transition starts without flipping direction across ±180° later.
      const previousAngle = state.targetAngle ?? state.from.angle
      state.targetAngle = previousAngle + angleDelta(target.angle, previousAngle)
      const t = state.progress * state.progress * (3 - 2 * state.progress)
      const mix = (a: number, b: number) => a + (b - a) * t
      return {
        x: mix(state.from.x, target.x), y: mix(state.from.y, target.y),
        angle: mix(state.from.angle, state.targetAngle),
        handX: mix(state.from.handX, target.handX), handY: mix(state.from.handY, target.handY),
      }
    },
  }
}
