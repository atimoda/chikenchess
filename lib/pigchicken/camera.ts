// PigChicKen camera over a world wider than the screen. Follow keeps her centred (with a dead band),
// scenes stays put and slides a whole screen when she crosses into the next one, fixed never moves.

export type CameraMode = 'follow' | 'scenes' | 'fixed'
export const CAMERA_MODES: { value: CameraMode; label: string }[] = [
  { value: 'follow', label: 'Seguir' },
  { value: 'scenes', label: 'Por cenas' },
  { value: 'fixed', label: 'Fixa' },
]

// lead: px the follow camera looks ahead of her (toward the side she faces; negative = to the left)
export type CameraOpts = { mode: CameraMode; worldX: number; viewW: number; worldW: number; dt: number; deadband: number; lag: number; lead?: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// next camera x (left edge of the view, in world pixels)
export function cameraStep(camX: number, o: CameraOpts) {
  const maxX = Math.max(0, o.worldW - o.viewW)
  if (o.mode === 'fixed') return clamp(camX, 0, maxX)
  let target: number
  if (o.mode === 'scenes') {
    const scene = clamp(Math.floor(o.worldX / o.viewW), 0, Math.max(0, Math.ceil(o.worldW / o.viewW) - 1))
    target = clamp(scene * o.viewW, 0, maxX)
    // a quick slide to the next screen
    const k = Math.min(1, 9 * o.dt)
    const next = camX + (target - camX) * k
    return Math.abs(target - next) < 0.5 ? target : next
  }
  // the dead band sits around the point she looks at, `lead` px ahead of her
  const centre = camX + o.viewW / 2, off = o.worldX + (o.lead ?? 0) - centre
  target = Math.abs(off) <= o.deadband ? camX : camX + off - Math.sign(off) * o.deadband
  target = clamp(target, 0, maxX)
  return camX + (target - camX) * Math.min(1, o.lag * o.dt)
}

// the look-ahead: slides toward `dist` px on the side she faces (face -1 / 1) at `speed` (1/s), so turning
// around pans the view to the other side instead of jumping
export function leadStep(lead: number, face: number, dist: number, speed: number, dt: number) {
  const target = (face < 0 ? -1 : 1) * dist
  const next = lead + (target - lead) * Math.min(1, speed * dt)
  return Math.abs(target - next) < 0.05 ? target : next
}

// walls in screen pixels: the world's edges, or the screen's in fixed mode
export function cameraBounds(camX: number, o: { mode: CameraMode; viewW: number; worldW: number }) {
  return o.mode === 'fixed' ? { lo: 0, hi: o.viewW } : { lo: -camX, hi: o.worldW - camX }
}
