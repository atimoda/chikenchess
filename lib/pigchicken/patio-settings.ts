// The Pátio's own settings (the Sun button's panel): its limits, saved with the layout of each Pátio.
// Width: how many scenes of the Parquinho come before the Templo and the Vila (the world's right wall follows).
// Height: from the ground up to the world's ceiling, in world units (the camera stops there and she climbs it).
// Ground: how much ground shows below the floor at the foot of the screen, in px (room for the inventory bar).
// Inventory: how many items each player may carry here (1 to 30).
// New empty Pátios start from data/pigchicken/default-patio.json (its `settings`, written by "Salvar no game").
import { WORLD_GROUND_Y, WORLD_TOP } from './world'
import { INVENTORY_MAX, INVENTORY_MIN } from './inventory'
import { normalizeSceneEdges, normalizeSceneZones, type SceneEdges, type SceneZones } from './sound-zones'
import { normalizePatioLayers, type PatioLayers } from './patio-layers'
import { normalizeSky, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT, normalizeMountains, type MountainParams } from './mountains'
import { normalizeClouds, type CloudParams } from './clouds'
import { normalizeSnowfall, type SnowfallParams } from './snowfall'
import { normalizeAurora, type AuroraParams } from './aurora'
import { normalizeMineGrid, type MineGridParams } from './mine-grid'
import DEFAULTS_FILE from '../../data/pigchicken/default-patio.json'

// sceneZones: the scenes' own music changed in this Pátio (the "Zonas sonoras" layer), by scene number
// sceneEdges: the limits between the scenes' zones moved in this Pátio (world x, by scene number)
// layers: the Camadas panel this Pátio starts with ("Salvar no pátio")
// sky: its sky and light (lib/pigchicken/sky.ts); without it, the classic dusk
// mountains: the far ranges' shape (lib/pigchicken/mountains.ts); without it, the three usual ranges
// clouds: the clouds' shape (lib/pigchicken/clouds.ts); temple: false leaves out the Templo do Gongo (gong, stones,
// jukebox, its weapon racks, its music) and the Vila dos Telhados' mountain: their two scenes are empty space
// snowfall: the snow falling over the far scenery (lib/pigchicken/snowfall.ts); without it, none
// aurora: the curtains of light in the sky (lib/pigchicken/aurora.ts); without it, none
// sceneMusic: false turns off the scenes' own zones (only the map's Zonas sonoras play); missing or true: on
// mineGrid: the Grade de blocos (lib/pigchicken/mine-grid.ts); without it, or with it off, the Pátio has no grid
// zoom: how far the camera may zoom here (Configurações do Pátio → Zoom): min, the farthest out (0: the whole Pátio
// fits the screen); max, the closest in. Without it, PATIO_ZOOM's min and max
export type PatioSettings = { screens?: number; height?: number; ground?: number; inventory?: number; sceneZones?: SceneZones; sceneEdges?: SceneEdges; layers?: PatioLayers; sky?: SkyParams; mountains?: MountainParams; clouds?: CloudParams; snowfall?: SnowfallParams; aurora?: AuroraParams; temple?: boolean; sceneMusic?: boolean; mineGrid?: MineGridParams; zoom?: PatioZoom }

export const PATIO_SCREENS = { min: 1, max: 8, step: 1 } as const
export const PATIO_HEIGHT = { min: 400, max: 8000, step: 10, default: WORLD_GROUND_Y - WORLD_TOP } as const
// the ground below the floor on desktop and tablet (a phone held upright keeps the touch controls' room instead)
export const PATIO_GROUND = { min: 30, max: 400, step: 10, default: 100 } as const
// the camera's zoom (1 = 100%): floor and ceil bound the slider; min and max are a Pátio's range by default
export type PatioZoom = { min: number; max: number }
export const PATIO_ZOOM = { floor: 0.1, ceil: 4, min: 0.5, max: 2.5 } as const
export const PATIO_INVENTORY = { min: INVENTORY_MIN, max: INVENTORY_MAX, step: 1, default: INVENTORY_MAX } as const
// the lowest world y anything may be placed at (above the tallest ceiling allowed, with some room)
export const PATIO_LOWEST_TOP = WORLD_GROUND_Y - PATIO_HEIGHT.max - 1000

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function normalizePatioSettings(raw: unknown): PatioSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as { screens?: unknown; height?: unknown; ground?: unknown; inventory?: unknown; sceneZones?: unknown; sceneEdges?: unknown; layers?: unknown; sky?: unknown; mountains?: unknown; clouds?: unknown; snowfall?: unknown; aurora?: unknown; temple?: unknown; sceneMusic?: unknown; mineGrid?: unknown; zoom?: unknown }
  const out: PatioSettings = {}
  if (typeof r.screens === 'number' && Number.isFinite(r.screens)) out.screens = Math.round(clamp(r.screens, PATIO_SCREENS.min, PATIO_SCREENS.max))
  if (typeof r.height === 'number' && Number.isFinite(r.height)) out.height = Math.round(clamp(r.height, PATIO_HEIGHT.min, PATIO_HEIGHT.max))
  if (typeof r.ground === 'number' && Number.isFinite(r.ground)) out.ground = Math.round(clamp(r.ground, PATIO_GROUND.min, PATIO_GROUND.max))
  if (typeof r.inventory === 'number' && Number.isFinite(r.inventory)) out.inventory = Math.round(clamp(r.inventory, PATIO_INVENTORY.min, PATIO_INVENTORY.max))
  // the Parquinho's scenes and the Vila after the Templo
  const sceneZones = normalizeSceneZones(r.sceneZones, PATIO_SCREENS.max + 1)
  if (sceneZones) out.sceneZones = sceneZones
  const sceneEdges = normalizeSceneEdges(r.sceneEdges, (out.screens ?? PATIO_SCREENS.max) - 1)
  if (sceneEdges) out.sceneEdges = sceneEdges
  const layers = normalizePatioLayers(r.layers)
  if (layers) out.layers = layers
  const sky = normalizeSky(r.sky)
  if (sky) out.sky = sky
  const mountains = normalizeMountains(r.mountains)
    // the sky used to carry an on/off for them (10/11)
    ?? ((r.sky as { mountains?: unknown } | undefined)?.mountains === false ? { ...MOUNTAINS_DEFAULT, show: false } : undefined)
  if (mountains) out.mountains = mountains
  const clouds = normalizeClouds(r.clouds)
  if (clouds) out.clouds = clouds
  const snowfall = normalizeSnowfall(r.snowfall)
  if (snowfall) out.snowfall = snowfall
  const aurora = normalizeAurora(r.aurora)
  if (aurora) out.aurora = aurora
  if (r.temple === false) out.temple = false
  if (r.sceneMusic === false) out.sceneMusic = false
  const mineGrid = normalizeMineGrid(r.mineGrid)
  if (mineGrid) out.mineGrid = mineGrid
  const zoom = normalizePatioZoom(r.zoom)
  if (zoom) out.zoom = zoom
  return Object.keys(out).length ? out : undefined
}

// a zoom range: min 0 (or below the floor) is the whole Pátio; min never passes max
export function normalizePatioZoom(raw: unknown): PatioZoom | undefined {
  const z = raw as { min?: unknown; max?: unknown } | null
  if (!z || typeof z !== 'object' || typeof z.min !== 'number' || typeof z.max !== 'number' || !Number.isFinite(z.min) || !Number.isFinite(z.max)) return undefined
  const max = Math.round(clamp(z.max, PATIO_ZOOM.floor, PATIO_ZOOM.ceil) * 1000) / 1000
  const min = z.min < PATIO_ZOOM.floor ? 0 : Math.min(max, Math.round(clamp(z.min, PATIO_ZOOM.floor, PATIO_ZOOM.ceil) * 1000) / 1000)
  return { min, max }
}
// the zoom range of this Pátio (Configurações do Pátio → Zoom)
export const patioZoom = (settings: PatioSettings | undefined): PatioZoom => settings?.zoom ?? { min: PATIO_ZOOM.min, max: PATIO_ZOOM.max }

// the width in scenes: the Pátio's own, or (saved before it had one) the browser's old "Largura do mundo"
export const patioScreens = (settings: PatioSettings | undefined, fallback: number) =>
  settings?.screens ?? Math.round(clamp(fallback, PATIO_SCREENS.min, PATIO_SCREENS.max))
export const patioHeight = (settings: PatioSettings | undefined) => settings?.height ?? PATIO_HEIGHT.default
// px of ground below the floor at the foot of the screen (Configurações do Pátio → Espaço abaixo do chão)
export const patioGround = (settings: PatioSettings | undefined) => settings?.ground ?? PATIO_GROUND.default
// world y of the ceiling (negative is above y = 0)
export const patioWorldTop = (settings: PatioSettings | undefined) => WORLD_GROUND_Y - patioHeight(settings)
// how many items each player may carry in this Pátio (a Pátio saved before it had the setting: all of them)
// whether the scenes play their own zones here (Configurações do Pátio → Zonas das cenas)
export const patioSceneMusic = (settings: PatioSettings | undefined) => settings?.sceneMusic !== false
export const patioInventoryLimit = (settings: PatioSettings | undefined) => settings?.inventory ?? PATIO_INVENTORY.default
// the Grade de blocos of this Pátio while it is on (Configurações do Pátio → Grade de blocos)
export const patioMineGrid = (settings: PatioSettings | undefined) => (settings?.mineGrid?.on ? settings.mineGrid : null)
// whether the Templo do Gongo and the Vila stand at the world's end (Configurações do Pátio → Templo e Vila)
export const patioTemple = (settings: PatioSettings | undefined) => settings?.temple !== false

// ---------- the game's defaults for a new empty Pátio (data/pigchicken/default-patio.json → settings) ----------
// what Configurações do Pátio edits, and so what the file keeps (not the scenes' zones nor the layers)
export const PATIO_DEFAULT_KEYS = ['screens', 'height', 'ground', 'inventory', 'sceneMusic', 'temple', 'sky', 'mountains', 'clouds', 'snowfall', 'aurora', 'zoom'] as const

/** The defaults file's `settings` for a Pátio (what "Salvar no game" writes): `screens` is its width as shown. */
export function patioSettingsDefaultsFile(settings: PatioSettings | undefined, screens: number): PatioSettings {
  const s = normalizePatioSettings(settings) ?? {}
  const out: PatioSettings = { screens: patioScreens(undefined, screens), height: patioHeight(s), ground: patioGround(s), inventory: patioInventoryLimit(s) }
  if (s.sceneMusic === false) out.sceneMusic = false
  if (s.temple === false) out.temple = false
  if (s.sky) out.sky = s.sky
  if (s.mountains) out.mountains = s.mountains
  if (s.clouds) out.clouds = s.clouds
  if (s.snowfall) out.snowfall = s.snowfall
  if (s.aurora) out.aurora = s.aurora
  if (s.zoom) out.zoom = s.zoom
  return out
}
/** What a defaults file's `settings` gives a new Pátio: only the keys above, as the game reads them. */
export function patioSettingsOver(raw: unknown): PatioSettings {
  const s = (normalizePatioSettings(raw) ?? {}) as Record<string, unknown>
  return Object.fromEntries(PATIO_DEFAULT_KEYS.filter(k => s[k] !== undefined).map(k => [k, s[k]])) as PatioSettings
}
export const DEFAULT_PATIO_SETTINGS: PatioSettings = patioSettingsOver(DEFAULTS_FILE.settings)
