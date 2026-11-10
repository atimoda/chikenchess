// The Pátio's own settings (the Sun button's panel): its limits, saved with the layout of each Pátio.
// Width: how many scenes of the Parquinho come before the Templo and the Vila (the world's right wall follows).
// Height: from the ground up to the world's ceiling, in world units (the camera stops there and she climbs it).
// Inventory: how many items each player may carry here (1 to 25).
import { WORLD_GROUND_Y, WORLD_TOP } from './world'
import { INVENTORY_MAX, INVENTORY_MIN } from './inventory'
import { normalizeSceneZones, type SceneZones } from './sound-zones'
import { normalizePatioLayers, type PatioLayers } from './patio-layers'

// sceneZones: the scenes' own music changed in this Pátio (the "Zonas sonoras" layer), by scene number
// layers: the Camadas panel this Pátio starts with ("Salvar no pátio")
export type PatioSettings = { screens?: number; height?: number; inventory?: number; sceneZones?: SceneZones; layers?: PatioLayers }

export const PATIO_SCREENS = { min: 1, max: 8, step: 1 } as const
export const PATIO_HEIGHT = { min: 400, max: 8000, step: 10, default: WORLD_GROUND_Y - WORLD_TOP } as const
export const PATIO_INVENTORY = { min: INVENTORY_MIN, max: INVENTORY_MAX, step: 1, default: INVENTORY_MAX } as const
// the lowest world y anything may be placed at (above the tallest ceiling allowed, with some room)
export const PATIO_LOWEST_TOP = WORLD_GROUND_Y - PATIO_HEIGHT.max - 1000

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function normalizePatioSettings(raw: unknown): PatioSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as { screens?: unknown; height?: unknown; inventory?: unknown; sceneZones?: unknown; layers?: unknown }
  const out: PatioSettings = {}
  if (typeof r.screens === 'number' && Number.isFinite(r.screens)) out.screens = Math.round(clamp(r.screens, PATIO_SCREENS.min, PATIO_SCREENS.max))
  if (typeof r.height === 'number' && Number.isFinite(r.height)) out.height = Math.round(clamp(r.height, PATIO_HEIGHT.min, PATIO_HEIGHT.max))
  if (typeof r.inventory === 'number' && Number.isFinite(r.inventory)) out.inventory = Math.round(clamp(r.inventory, PATIO_INVENTORY.min, PATIO_INVENTORY.max))
  // the Parquinho's scenes and the Vila after the Templo
  const sceneZones = normalizeSceneZones(r.sceneZones, PATIO_SCREENS.max + 1)
  if (sceneZones) out.sceneZones = sceneZones
  const layers = normalizePatioLayers(r.layers)
  if (layers) out.layers = layers
  return out.screens === undefined && out.height === undefined && out.inventory === undefined && !out.sceneZones && !out.layers ? undefined : out
}

// the width in scenes: the Pátio's own, or (saved before it had one) the browser's old "Largura do mundo"
export const patioScreens = (settings: PatioSettings | undefined, fallback: number) =>
  settings?.screens ?? Math.round(clamp(fallback, PATIO_SCREENS.min, PATIO_SCREENS.max))
export const patioHeight = (settings: PatioSettings | undefined) => settings?.height ?? PATIO_HEIGHT.default
// world y of the ceiling (negative is above y = 0)
export const patioWorldTop = (settings: PatioSettings | undefined) => WORLD_GROUND_Y - patioHeight(settings)
// how many items each player may carry in this Pátio (a Pátio saved before it had the setting: all 25)
export const patioInventoryLimit = (settings: PatioSettings | undefined) => settings?.inventory ?? PATIO_INVENTORY.default
