// Rendering bounds only. Never use camera culling to skip simulation or contacts.
export type ViewRect = { x: number; y: number; w: number; h: number }

// Inverse of the canvas zoom around the screen centre. `top` excludes the unscaled header.
export function zoomedView(width: number, height: number, zoom: number, top = 0): ViewRect {
  return {
    x: width / 2 - width / (2 * zoom),
    y: height / 2 + (top - height / 2) / zoom,
    w: width / zoom,
    h: (height - top) / zoom,
  }
}

export function intersectsView(a: ViewRect, view: ViewRect, margin = 0) {
  return a.x + a.w >= view.x - margin && a.x <= view.x + view.w + margin &&
    a.y + a.h >= view.y - margin && a.y <= view.y + view.h + margin
}

export function trajectoryVisible(mode: 'off' | 'always' | 'hold' | 'holdAim', fire: boolean, aim: boolean) {
  return mode === 'always' || (mode !== 'off' && fire) || (mode === 'holdAim' && aim)
}

export function needsTrajectory(reticle: string, path: boolean, landing: boolean) {
  return (reticle === 'laser' && path) ||
    ((reticle === 'impact' || reticle === 'grenade') && (path || landing)) ||
    (reticle === 'bow' && path)
}

export const patioPixelRatio = (dpr: number, lite: boolean) => lite ? 1 : Math.min(2, Math.max(1, dpr || 1))
