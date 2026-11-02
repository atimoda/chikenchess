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
// sky above the world's top the camera may still show (a little headroom on tall screens)
export const WORLD_TOP = 0

export type WorldBox = { x: number; y: number; w: number; h: number }

// floating boxes per scene, in world units: x from the scene's left edge, bottom = height of its base above ground
const SCENES: { x: number; bottom: number; w: number; h: number }[][] = [
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

// the temple (Templo do Gongo, the aliens' mini-game) is one more scene after the `screens` of the Parquinho:
// marble terraces to shoot from and hide behind, as the bunkers of the old invader games
export const TEMPLE_PLATFORMS: { x: number; bottom: number; w: number; h: number }[] = [
  { x: 720, bottom: 190, w: 250, h: 26 },
  { x: 1290, bottom: 190, w: 250, h: 26 },
  { x: 1015, bottom: 400, w: 210, h: 26 },
]
// the scene index of the temple and the whole world's width in scenes
export const templeScene = (screens: number) => screens
export const worldScenes = (screens: number) => screens + 1

// every platform of a world `screens` scenes wide, with a stable id (and the temple's, when asked)
export function worldPlatforms(screens: number, temple = false): (WorldBox & { id: string })[] {
  const out: (WorldBox & { id: string })[] = []
  for (let s = 0; s < screens; s++) {
    SCENES[s % SCENES.length].forEach((p, i) => {
      out.push({ id: `pq${s}-${i}`, x: s * SCENE_W + p.x, y: WORLD_GROUND_Y - p.bottom - p.h, w: p.w, h: p.h })
    })
  }
  if (temple) TEMPLE_PLATFORMS.forEach((p, i) => out.push({ id: `tp-${i}`, x: templeScene(screens) * SCENE_W + p.x, y: WORLD_GROUND_Y - p.bottom - p.h, w: p.w, h: p.h }))
  return out
}

// the top of the instruments' shelf (the first platform of the first scene)
export const SHELF_TOP = WORLD_GROUND_Y - SCENES[0][0].bottom - SCENES[0][0].h

// the scene a world x is in
export const sceneAt = (x: number) => Math.max(0, Math.floor(x / SCENE_W))

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// Vertical camera. `oy` is the screen y of world y = 0 (screen = world + oy). The ground never rises above the
// place the page keeps for it (groundScreen, above the touch controls on a phone); on a screen shorter than the
// world the camera follows her up, until the world's top reaches the top of the screen. On a desktop window as
// tall as the reference the whole world fits and the camera never moves vertically.
export function cameraYRange(groundScreen: number) {
  const lo = groundScreen - WORLD_GROUND_Y
  return { lo, hi: Math.max(lo, -WORLD_TOP) }
}

export function cameraYStep(oy: number, o: { worldY: number; groundScreen: number; viewTop: number; dt: number; lag: number }) {
  const { lo, hi } = cameraYRange(o.groundScreen)
  if (hi <= lo) return lo
  // keep her (her feet) a bit below the middle of what is visible between the header and the ground's place
  const want = o.viewTop + (o.groundScreen - o.viewTop) * 0.62 - o.worldY
  const target = clamp(want, lo, hi)
  const next = oy + (target - oy) * Math.min(1, o.lag * o.dt)
  return clamp(Math.abs(target - next) < 0.5 ? target : next, lo, hi)
}
