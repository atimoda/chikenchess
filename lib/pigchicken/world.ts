// PigChicKen world in fixed world units. Every screen (desktop, phone upright or sideways, any window size) sees
// the same world at the same size: 1 world unit = 1 CSS pixel, always. A bigger or smaller screen only shows a
// bigger or smaller crop of it (the camera), never a stretched one. This is what lets players on different
// screens share one world in multiplayer: positions and sizes mean the same thing for everyone.
//
// Coordinates: x grows to the right from the world's left edge; y grows downwards from the world's top, with the
// ground at y = WORLD_GROUND_Y. The reference is a 1920 x 960 desktop window, where the whole height fits.

// one scene (cena): the width of a desktop screen
export const SCENE_W = 1920
// from the top of the world to the ground
export const WORLD_GROUND_Y = 930
// how far above y = 0 the world goes: the camera follows her up to here (y = WORLD_TOP, negative is above)
export const WORLD_TOP = -3000
// above this world y the camera rises with her on every screen (below it, a tall screen shows the whole ground floor still)
export const CAMERA_RISE_Y = 500

export type WorldBox = { x: number; y: number; w: number; h: number }

// floating boxes per scene, in world units: x from the scene's left edge, bottom = height of its base above ground
export const SCENE_PLATFORMS: { x: number; bottom: number; w: number; h: number }[][] = [
  [
    // the first one is the long shelf with the instruments, above the weapons' racks
    { x: 154, bottom: 307, w: 1651, h: 29 },
    { x: 19, bottom: 154, w: 115, h: 38 },
    { x: 538, bottom: 576, w: 269, h: 48 },
    { x: 1229, bottom: 576, w: 269, h: 48 },
  ],
  [
    { x: 115, bottom: 134, w: 230, h: 48 },
    { x: 422, bottom: 250, w: 230, h: 48 },
    { x: 730, bottom: 365, w: 230, h: 48 },
    { x: 1037, bottom: 480, w: 230, h: 48 },
    { x: 1459, bottom: 0, w: 115, h: 442 },
  ],
  [
    { x: 192, bottom: 0, w: 96, h: 288 },
    { x: 576, bottom: 192, w: 499, h: 48 },
    { x: 1267, bottom: 0, w: 96, h: 528 },
    { x: 1536, bottom: 288, w: 269, h: 48 },
  ],
  [
    { x: 154, bottom: 288, w: 192, h: 48 },
    { x: 499, bottom: 288, w: 192, h: 48 },
    { x: 845, bottom: 288, w: 192, h: 48 },
    { x: 1190, bottom: 288, w: 192, h: 48 },
    { x: 672, bottom: 538, w: 576, h: 48 },
  ],
]

// the temple (Templo do Gongo, the aliens' mini-game) is one more scene after the `screens` of the Parquinho.
// Its halls, balustrade, gong and racks are elements of the layout (lib/pigchicken/layout.ts, templeElements): it
// has no fixed platforms of its own
export const TEMPLE_PLATFORMS: { x: number; bottom: number; w: number; h: number }[] = []
// the scene index of the temple and the whole world's width in scenes
export const templeScene = (screens: number) => screens
export const villageScene = (screens: number) => screens + 1
export const worldScenes = (screens: number) => screens + 2

// every platform of a world `screens` scenes wide, with a stable id (and the temple's, when asked)
export function worldPlatforms(screens: number, temple = false): (WorldBox & { id: string })[] {
  const out: (WorldBox & { id: string })[] = []
  for (let s = 0; s < screens; s++) {
    SCENE_PLATFORMS[s % SCENE_PLATFORMS.length].forEach((p, i) => {
      out.push({ id: `pq${s}-${i}`, x: s * SCENE_W + p.x, y: WORLD_GROUND_Y - p.bottom - p.h, w: p.w, h: p.h })
    })
  }
  if (temple) TEMPLE_PLATFORMS.forEach((p, i) => out.push({ id: `tp-${i}`, x: templeScene(screens) * SCENE_W + p.x, y: WORLD_GROUND_Y - p.bottom - p.h, w: p.w, h: p.h }))
  return out
}

// the top of the instruments' shelf (the first platform of the first scene)
export const SHELF_TOP = WORLD_GROUND_Y - SCENE_PLATFORMS[0][0].bottom - SCENE_PLATFORMS[0][0].h

// the scene a world x is in
export const sceneAt = (x: number) => Math.max(0, Math.floor(x / SCENE_W))

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// Vertical camera. `oy` is the screen y of world y = 0 (screen = world + oy). The ground never rises above the
// place the page keeps for it (groundScreen, above the touch controls on a phone). On a screen shorter than the
// ground floor (y 0..WORLD_GROUND_Y) the camera follows her to keep her a bit below the middle; on any screen, once
// she climbs above CAMERA_RISE_Y it rises with her, keeping her where that height was, up to the world's ceiling
// (`top`, the Pátio's height limit; WORLD_TOP by default). Given `viewTop` (the header's bottom), it stops once the
// ceiling reaches it, so nothing above the limit shows. `above` (sitting at a fixed instrument): this much over her
// feet has to show under the header (the instrument and its strings around her), so the camera rises for it too.
export function cameraYRange(groundScreen: number, top: number = WORLD_TOP, viewTop?: number) {
  const lo = groundScreen - WORLD_GROUND_Y
  const hi = viewTop === undefined ? lo + (WORLD_GROUND_Y - top) : Math.max(lo, viewTop - top)
  return { lo, hi }
}

// lift: px the view rises past where it would be (the luneta leaning toward an aim up; negative goes down), in its range
export function cameraYStep(oy: number, o: { worldY: number; groundScreen: number; viewTop: number; dt: number; lag: number; top?: number; above?: number; lift?: number }) {
  const { lo, hi } = cameraYRange(o.groundScreen, o.top ?? WORLD_TOP, o.viewTop)
  // short screens: keep her (her feet) a bit below the middle of what is visible between the header and the ground's place,
  // but never show above y = 0 for that alone
  const floorHi = Math.max(lo, 0)
  const want = clamp(o.viewTop + (o.groundScreen - o.viewTop) * 0.62 - o.worldY, lo, floorHi)
  // climbing above CAMERA_RISE_Y: the camera rises with her on every screen
  const rise = lo + Math.max(0, CAMERA_RISE_Y - o.worldY)
  const fit = o.above ? o.viewTop + o.above - o.worldY : lo
  const target = clamp(Math.max(want, rise, fit) + (o.lift ?? 0), lo, hi)
  const next = oy + (target - oy) * Math.min(1, o.lag * o.dt)
  return clamp(Math.abs(target - next) < 0.5 ? target : next, lo, hi)
}
