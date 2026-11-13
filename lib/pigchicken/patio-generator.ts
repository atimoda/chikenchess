// The new Pátio generator ("começar do zero"): Empty is only the entry portal; Basic biome is a stretch of nature
// made at random (rolling ground of one biome, trees, bushes, a few rocks and trees far in the depth), with a
// density from 0 (desmatado: bare ground, a bush here and there) to 100 (a dense forest). The same seed makes the
// same Pátio. Everything it makes is an ordinary element of the editor mode.
import { emptyLayout, layoutFloorBelow, normalizeElement, type ElementKind, type LayoutElement, type PatioLayout } from './layout'
import { fitSurface, type GroundBiome, type SurfacePoint } from './surfaces'
import { randomTree, treeRandom, type TreeStyle } from './trees'
import { SCENE_W, WORLD_GROUND_Y } from './world'

export type PatioRecipe = { kind: 'empty' } | { kind: 'biome'; density: number; seed?: number }
export const BIOME_DENSITY = { min: 0, max: 100, step: 5, default: 50 } as const
// the width the generated nature covers (the game's usual Pátio width)
export const GENERATED_SCREENS = 4
// the start stays clear around the entry portal
const CLEAR_START = 460

type Flora = { ground: GroundBiome; trees: TreeStyle[]; far: TreeStyle[] }
const FLORAS: Flora[] = [
  { ground: 'meadow', trees: ['oak', 'birch', 'maple', 'willow', 'pine', 'plum', 'ipe', 'brazilwood', 'cypress'], far: ['oak', 'pine', 'cypress', 'birch'] },
  { ground: 'meadow', trees: ['pine', 'araucaria', 'oak', 'cypress', 'birch'], far: ['pine', 'araucaria', 'cypress'] },
  { ground: 'snow', trees: ['pine', 'cypress', 'birch', 'araucaria'], far: ['pine', 'cypress'] },
  { ground: 'desert', trees: ['palm', 'baobab', 'palm', 'cypress'], far: ['palm', 'baobab'] },
]

export const newGeneratorSeed = () => Math.floor(Math.random() * 0x100000000)

export function generatePatioLayout(recipe: PatioRecipe): PatioLayout {
  return recipe.kind === 'biome' ? biomeLayout(recipe.density, recipe.seed ?? newGeneratorSeed()) : emptyLayout()
}

export function biomeLayout(density: number, seed: number): PatioLayout {
  const d = Math.max(BIOME_DENSITY.min, Math.min(BIOME_DENSITY.max, Number.isFinite(density) ? density : BIOME_DENSITY.default)) / 100
  const rand = treeRandom(seed >>> 0)
  const between = (a: number, b: number) => a + rand() * (b - a)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length) % list.length]
  const flora = pick(FLORAS)
  const base = emptyLayout()
  const width = GENERATED_SCREENS * SCENE_W
  const G = WORLD_GROUND_Y
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>) => {
    const e = normalizeElement({ id: `${kind}-gen${(seed >>> 0).toString(36)}-${++n}`, kind, ...raw })!
    out.push(e)
    return e
  }

  // ---------- the ground: gentle hills, one surface per scene (flat at the start, by the entry portal) ----------
  const step = 160
  const heights: number[] = []
  let h = 26, slope = 0
  for (let x = 0; x <= width; x += step) {
    if (x < CLEAR_START) { heights.push(26); continue }
    slope = slope * 0.6 + between(-30, 30)
    h = Math.max(18, Math.min(170, h + slope))
    heights.push(Math.round(h))
  }
  const grounds: LayoutElement[] = []
  for (let s = 0; s < GENERATED_SCREENS; s++) {
    const from = (s * SCENE_W) / step, to = ((s + 1) * SCENE_W) / step
    const top: SurfacePoint[] = []
    for (let i = from; i <= to; i++) top.push([i * step, G - heights[i]])
    const { points, ...box } = fitSurface([...top, [top[top.length - 1][0], G + 10], [top[0][0], G + 10]], 40, 24)
    grounds.push(add('ground', { ...box, hard: true, params: { surface: { style: flora.ground, points } } }))
  }
  const floor = (x: number) => layoutFloorBelow(grounds, x, -99999)

  // ---------- trees on the ground (behind the platforms, as the editor puts them) ----------
  const tree = (style: TreeStyle, cx: number, scale: number, extra: Partial<LayoutElement> = {}) => {
    const t = randomTree(style, Math.floor(rand() * 0x100000000))
    const w = Math.round(t.w * scale), hh = Math.round(t.h * scale)
    const y = (extra.depth ? G : floor(cx)) + 8 - hh
    add('tree', { x: Math.round(cx - w / 2), y, w, h: hh, layer: 'back', ...extra, params: { tree: t.tree } })
  }
  const scatter = (count: number, from: number, to: number, place: (x: number) => void) => {
    // even slots with a random nudge, so a dense forest covers the land and a sparse one is not clumped
    const slot = (to - from) / Math.max(1, count)
    for (let i = 0; i < count; i++) place(from + slot * (i + between(0.15, 0.85)))
  }
  const perScene = (most: number) => Math.round(d * most)
  scatter(perScene(11) * GENERATED_SCREENS, CLEAR_START, width - 80, x => tree(pick(flora.trees), x, between(0.62, 1.08)))
  // bushes: a few even on bare land, more in the forest
  scatter((1 + perScene(5)) * GENERATED_SCREENS, CLEAR_START, width - 60, x => tree('shrub', x, between(0.55, 1)))
  // far trees in the depth make the forest thick behind the playable land
  scatter(perScene(8) * GENERATED_SCREENS, 0, width, x => tree(pick(flora.far), x, between(0.5, 0.85), { depth: Math.round(between(0.35, 0.7) * 100) / 100 }))

  // ---------- rocks: small stone outlines to hop over ----------
  scatter(Math.round(between(1, 3)) * GENERATED_SCREENS / 2, CLEAR_START + 200, width - 120, cx => {
    const w = between(70, 150), hh = between(34, 70), y = floor(cx) + 6
    const l = cx - w / 2, r = cx + w / 2
    const { points, ...box } = fitSurface([[l, y], [l + w * 0.12, y - hh * 0.7], [cx - w * 0.1, y - hh], [r - w * 0.2, y - hh * 0.85], [r, y - hh * 0.3], [r, y]], 12, 12)
    add('wall', { ...box, hard: true, params: { surface: { style: 'stone', points } } })
  })

  return { ...base, elements: [...out, ...base.elements], settings: { ...base.settings, screens: GENERATED_SCREENS } }
}
