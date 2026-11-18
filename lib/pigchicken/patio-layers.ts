// The Camadas panel's values (the header's eye). Each Pátio may save its own (PatioSettings.layers, "Salvar no
// pátio"); whoever enters a Pátio starts from them (or from LAYERS_DEFAULT) and may change them only for themselves.
// backdrop, zones, scale: 0 to 100 (0 hides the layer, above that its opacity). scaleSize: the Escalas fan's size in
// x. scaleFade: the fan's fade toward the circle (0 none, 50 linear, 100 a long soft ease-out). scaleLines: how
// strongly the fan's dividing lines show (0 to 100). scaleKeep: "Prevenir fadeout das escalas", the scales never go
// into standby (lib/pigchicken/scale-params.ts). hitboxes: on or off. stageDebug: the fases de notas' live numbers in a
// corner of the screen (on or off).
import DEFAULTS_FILE from '../../data/pigchicken/default-patio.json'

export type PatioLayers = { backdrop: number; zones: number; scale: number; scaleSize: number; scaleFade: number; scaleLines: number; scaleKeep: boolean; hitboxes: boolean; stageDebug: boolean; grid: number }

// the layers as written in the code; the game's defaults are these with data/pigchicken/default-patio.json over them
// (its `layers`, which the Camadas panel writes with "Salvar no game")
const CODE_LAYERS: PatioLayers = { backdrop: 100, zones: 33, scale: 0, scaleSize: 0.3, scaleFade: 50, scaleLines: 100, scaleKeep: false, hitboxes: false, stageDebug: false, grid: 60 }
export const LAYERS_SIZE = { min: 0.1, max: 3, step: 0.05 } as const

const pct = (v: unknown, d: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(0, Math.min(100, v))) : d

function readLayers(raw: unknown, d: PatioLayers): PatioLayers | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return {
    backdrop: pct(r.backdrop, d.backdrop), zones: pct(r.zones, d.zones), scale: pct(r.scale, d.scale), scaleFade: pct(r.scaleFade, d.scaleFade), scaleLines: pct(r.scaleLines, d.scaleLines),
    scaleSize: typeof r.scaleSize === 'number' && Number.isFinite(r.scaleSize) ? Math.round(Math.max(LAYERS_SIZE.min, Math.min(LAYERS_SIZE.max, r.scaleSize)) * 100) / 100 : d.scaleSize,
    scaleKeep: r.scaleKeep === true,
    hitboxes: r.hitboxes === true,
    stageDebug: r.stageDebug === true,
    // the Grade de blocos (the Pátio Campo minado): how strongly its blocks show
    grid: pct(r.grid, d.grid),
  }
}

export const LAYERS_DEFAULT: PatioLayers = readLayers(DEFAULTS_FILE.layers, CODE_LAYERS) ?? CODE_LAYERS
export const normalizePatioLayers = (raw: unknown) => readLayers(raw, LAYERS_DEFAULT)

export const sameLayers = (a: PatioLayers, b: PatioLayers) => (Object.keys(LAYERS_DEFAULT) as (keyof PatioLayers)[]).every(k => a[k] === b[k])
