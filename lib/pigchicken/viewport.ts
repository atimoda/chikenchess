// Rendering bounds only. Never use camera culling to skip simulation or contacts.
export type ViewRect = { x: number; y: number; w: number; h: number }

export function intersectsView(a: ViewRect, view: ViewRect, margin = 0) {
  return a.x + a.w >= view.x - margin && a.x <= view.x + view.w + margin &&
    a.y + a.h >= view.y - margin && a.y <= view.y + view.h + margin
}

export function trajectoryVisible(mode: 'off' | 'always' | 'hold' | 'holdAim', fire: boolean, aim: boolean) {
  return mode === 'always' || (mode !== 'off' && fire) || (mode === 'holdAim' && aim)
}

export function needsTrajectory(reticle: string, path: boolean, landing: boolean, reloading: boolean) {
  // The bow's reload ring follows the predicted endpoint even with its path hidden.
  return (reticle === 'laser' && path) ||
    ((reticle === 'impact' || reticle === 'grenade') && (path || landing)) ||
    (reticle === 'bow' && (path || reloading))
}

export const patioPixelRatio = (dpr: number, lite: boolean) => lite ? 1 : Math.min(2, Math.max(1, dpr || 1))
