// The Pátio's layout: every thing placed in the world (platforms, trees, training dummies, item racks, horde
// buttons) as a list of elements in world units. The Pátio draws itself from it and the editor mode changes it.
// The default layout is the Pátio as the code always had it; a lobby keeps its own copy once someone edits it.
//
// An element is a box (x, y = its top-left corner before turning; w, h) turned by `rot` degrees around its centre.
// The game's things (dummy, rack, button) are drawn by the game itself (canvas) and never turn; for them the box's
// bottom middle is where they stand.
import { CAGE_SOULS_MAX, CONSUMABLE_IDS, INSTRUMENT_IDS, RACK_ITEM_IDS, WEAPON_IDS, isCage, type ItemId } from './items'
import { DUMMY_DEFAULTS, DUMMY_HP_RANGE, dummyTip } from './dummies'
import { SCENE_PLATFORMS, SCENE_W, SHELF_TOP, WORLD_GROUND_Y, templeScene, villageScene, worldScenes } from './world'
import { DEFAULT_PATIO_SETTINGS, PATIO_LOWEST_TOP, PATIO_SCREENS, normalizePatioSettings, type PatioSettings } from './patio-settings'
import type { Box } from './combat'
import { outlineTops } from './box-tops'
import { RACK_TABLE, rackRefillLimit, rackRespawnDelay } from './racks'
import { pressGapParam, pressLimitParam, pressWindowParam } from './button-limit'
import { HOUSE_SIZE, housePreset, houseRoof, houseWallPolygon, newHouseSeed, normalizeHouse, type HouseParams } from './houses'
import { createCollisionOcclusion, type CollisionMask } from '../chicken/collision-occlusion'
import { TREE_SIZE, newTreeSeed, normalizeTree, treePreset, treeSurfaces, type TreeParams, type TreePoint } from './trees'
import { normalizeTrampoline, type TrampolineParams } from './trampoline'
import { VILLAGE_COLORS, VILLAGE_HOUSES, normalizeVillageRidge } from './village'
import { VILLAGE_GROUND_ID, defaultSurface, fitSurface, normalizeSurface, polygonContains, surfacePolygon, villageGround, type SurfaceKind, type SurfaceParams } from './surfaces'
import { defaultPower, normalizeDepth, normalizePower, type PowerParams } from './power-lines'
import { BACKDROP_DEPTH, isBackdropLayer, type BackdropLayerId } from './backdrop-layers'
import { GONG_BOX, JUKEBOX_BOX, RESET_STONE_BOX, TEMPLE_SPOTS, VITROLA_BOX, defaultGong, defaultPlayer, normalizeGong, normalizePlayer, type GongParams, type PlayerParams } from './gong'
import { BALUSTRADE_FLOOR, BALUSTRADE_SIZE, BUILDING_SIZE, buildingSurfaces, defaultBalustrade, defaultBuilding, normalizeBalustrade, normalizeBuilding, type BalustradeParams, type BuildingParams } from './buildings'
import { defaultChalkboard, normalizeChalkboard, type ChalkboardParams } from './chalkboard'
import { CHEST_BOX, defaultChest, normalizeChest, type ChestParams } from './chests'
import { DRUMKIT_BOX, HARP_BOX, isFixedKind } from './fixed-instruments'
import { defaultLanes, defaultSoundZone, normalizeLanes, normalizeSoundZone, normalizeSurfaceRebate, type LanesBox, type LanesParams, type SoundZoneParams, type SurfaceRebate, type ZoneBox } from './sound-zones'

// v2 adds consumable racks, v3 adds houses and scene-local positions, v4 stores shortcut portals and v5 turns the
// Vila's fixed ground (`terrain`) into a ground element. v6 seats the default portals on their starting platforms.
// v7 puts the Hangdrum's rack at the end of the instruments' shelf of the default Pátio. v8: the Gaiola básica's
// rack. v9: the Harpa's floating island over the first scene of the default Pátio. v10 brings that island down
// (v9 had it above what a screen shows from the floor, the Harpa cut by the top of the view). v11: no more
// scene-local positions: what stood in the Templo or the Vila (`region`) gets its world x, like everything else.
// v12: the Templo do Gongo is made of elements (Prédios, Mureta com cerca, trees, the Gongo do Templo, the Recomeçar
// stone, the Jukebox and its racks): a Pátio saved with the Templo gets them where its fixed drawing stood.
export const LAYOUT_VERSION = 12
// the widest world the Pátio offers (its width setting): the default layout covers it, a narrower world hides the rest
export const LAYOUT_MAX_SCREENS = 8
const FIRST_SCENE_PLATFORMS = SCENE_PLATFORMS[0]
const TEMPLE_START_PLATFORM = FIRST_SCENE_PLATFORMS.find(p => p.x === 538)!
const VILLAGE_START_PLATFORM = FIRST_SCENE_PLATFORMS.find(p => p.x === 1229)!
const LEGACY_MAX_ELEMENTS = 1500
// Reserve space to migrate both shortcut pairs, the Vila's ground, the entry portal and the Templo's elements
// (TEMPLE_ELEMENTS) without dropping any.
const TEMPLE_ELEMENTS = 16
export const LAYOUT_MAX_ELEMENTS = LEGACY_MAX_ELEMENTS + 6 + TEMPLE_ELEMENTS

// the layers, back to front. back: behind the platforms; scene: the platforms' own; behind: in front of the game's
// things (dummies, racks, shots) but behind the characters; front: in front of the characters; frontGhost: in front,
// half see-through (the trees)
export const LAYERS = ['back', 'scene', 'behind', 'front', 'frontGhost'] as const
export type LayoutLayer = (typeof LAYERS)[number]
export const LAYER_LABELS: Record<LayoutLayer, string> = {
  back: 'Fundo', scene: 'Cenário', behind: 'Atrás dos bonecos', front: 'Frente', frontGhost: 'Frente translúcida',
}
export const LAYER_HINTS: Record<LayoutLayer, string> = {
  back: 'Atrás das plataformas, logo à frente das montanhas',
  scene: 'Onde ficam as plataformas',
  behind: 'À frente dos alvos, armas e tiros, atrás da galinha',
  front: 'À frente da galinha, opaco',
  frontGhost: 'À frente da galinha, meio transparente',
}

export const ELEMENT_KINDS = ['platform', 'terrace', 'pillar', 'pine', 'blossom', 'dummy', 'rack', 'loose', 'button', 'portal', 'entry', 'spawn', 'house', 'tree', 'trampoline', 'zone', 'lanes', 'ground', 'wall', 'pole', 'tower', 'gong', 'jukebox', 'vitrola', 'chalkboard', 'chest', 'pedalharp', 'drumkit', 'building', 'balustrade', 'resetstone'] as const
export type ElementKind = (typeof ELEMENT_KINDS)[number]
export const HORDE_BUTTONS = ['aliens', 'pattern', 'zombies', 'zcount'] as const
export type HordeButton = (typeof HORDE_BUTTONS)[number]
export const HORDE_BUTTON_LABELS: Record<HordeButton, string> = { aliens: 'Aliens', pattern: 'Padrão dos aliens', zombies: 'Zumbis', zcount: 'Quantidade de zumbis' }

export type ElementParams = {
  message?: string; maxHp?: number // dummy
  item?: ItemId; respawnDelay?: number // rack (and loose: its item), seconds after pickup
  refillLimit?: number // rack: how many times it puts the item back after the first one (none: no limit)
  cageSouls?: number // rack and loose holding a Gaiola: how many souls fit in that one (none: the model's own)
  action?: HordeButton // button
  // the Aliens button: at most pressLimit presses (0: no limit) in any pressWindow seconds, pressGap seconds apart
  // (none: 10, 60 and 0.3; lib/pigchicken/button-limit.ts)
  pressLimit?: number; pressWindow?: number; pressGap?: number
  seed?: number; flip?: boolean // trees; a fixed instrument (the Harpa) turned the other way: its player on its right
  house?: HouseParams
  tree?: TreeParams
  trampoline?: TrampolineParams
  portalPairId?: string; portalLabel?: string; portalInstruction?: 'always' | 'hover'
  // a portal to another Pátio (lib/pigchicken/portal-links.ts): its lobby id or "default"; '' not chosen yet; absent:
  // it leads to its pair. portalTargetName: that Pátio's name when it was chosen (shown even after it is gone)
  portalTarget?: string; portalTargetName?: string
  // the entry portal and the Portais de nascimento: the chance of being born at this one, in whole percents
  // (lib/pigchicken/spawn-portals.ts; kept only while the Pátio has more than one of them)
  spawnChance?: number
  // "Bloco liberado": in a Pátio with the Grade de blocos, the block this portal stands in starts open, never hides
  // a bomb and never closes again. Unset: on for the entry portal, off for a Portal de nascimento
  freeBlock?: boolean
  zone?: SoundZoneParams // Zona sonora
  lanes?: LanesParams // Faixas fixas
  surface?: SurfaceParams // Chão (biome) and Parede (style): the outline's points
  power?: PowerParams // Poste de energia and Torre de transmissão: model, line, wires
  gong?: GongParams // Gongo: the strikes to start and stop the song of its zone's sequencer (or the Templo's campaign)
  player?: PlayerParams // Jukebox and Vitrola toca-discos: the goal of the songs they play (least accuracy, hearts)
  building?: BuildingParams // Prédio: its roof, storeys, columns, doors, lanterns (lib/pigchicken/buildings.ts)
  balustrade?: BalustradeParams // Mureta com cerca: the courtyard's stone floor under it
  chalkboard?: ChalkboardParams // Quadro de lousa: its text and the ghost's move
  chest?: ChestParams // Baú: what opens it, what is inside, its rarity
}

export type LayoutElement = {
  id: string; kind: ElementKind
  // only in layouts saved before v11: x was scene-local in these two scenes. normalizeLayout turns it into a world x
  region?: 'temple' | 'village'
  x: number; y: number; w: number; h: number; rot: number
  layer: LayoutLayer; locked: boolean
  // she stands on it and bumps its sides · bullets stop at it · the instruments' notes stop at it
  solid: boolean; shots: boolean; notes: boolean
  // the notes bounce off it (the "Rebate notas" collision) and play through its chain, the taco's or as they are
  rebate?: SurfaceRebate
  occludesColliders?: boolean
  // "Objeto duro": the characters cannot pass through it from any side (no one-way floors, no dropping through)
  hard?: boolean
  // only shown in the editor mode (invisible walls and floors)
  hidden: boolean
  opacity: number
  // falls until it rests on a solid element (or the ground): settleLayout
  gravity?: boolean
  // parallax depth (0 with the ground, up to 0.95 almost still on the screen): scenery only, never collides; x is
  // where it stands with the camera at 0 (on screen it sits at x - camX × (1 - depth)), see live-camera's followDepth
  depth?: number
  // pinned to a fixed point of a layer of the scenery far behind (a Poste or Torre on a mountain range, say): its
  // depth is that layer's, and it slides like the layer on every screen (x/y are the layer's point with the camera
  // at 0), see lib/pigchicken/backdrop-layers.ts
  backdrop?: BackdropLayerId
  params: ElementParams
}
// settings: the Pátio's limits (width in scenes, height up to the ceiling), from the Sun button's panel
export type PatioLayout = { v: number; elements: LayoutElement[]; settings?: PatioSettings }

export type ElementDef = {
  label: string; group: string
  w: number; h: number; layer: LayoutLayer; solid: boolean; shots: boolean
  // drawn by the game (canvas): fixed layer, never turns, not a platform
  entity: boolean
  rotatable: boolean; resizable: boolean
  // has an Edit panel
  editable: boolean
  minW: number; minH: number
}
export const ELEMENT_DEFS: Record<ElementKind, ElementDef> = {
  platform: { label: 'Plataforma', group: 'Plataformas', w: 230, h: 48, layer: 'scene', solid: true, shots: true, entity: false, rotatable: true, resizable: true, editable: false, minW: 12, minH: 12 },
  terrace: { label: 'Terraço do templo', group: 'Plataformas', w: 269, h: 48, layer: 'scene', solid: true, shots: true, entity: false, rotatable: true, resizable: true, editable: false, minW: 12, minH: 12 },
  // the temple's white balustrade over a red wall: a floating floor along the top of the wall (lib/pigchicken/buildings.ts)
  balustrade: { label: 'Mureta com cerca', group: 'Plataformas', ...BALUSTRADE_SIZE, layer: 'scene', solid: true, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 40, minH: BALUSTRADE_FLOOR + 8 },
  trampoline: { label: 'Trampolim', group: 'Plataformas', w: 230, h: 56, layer: 'scene', solid: true, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 72, minH: 20 },
  pillar: { label: 'Pilar / parede', group: 'Plataformas', w: 96, h: 288, layer: 'scene', solid: true, shots: true, entity: false, rotatable: true, resizable: true, editable: false, minW: 12, minH: 12 },
  pine: { label: 'Pinheiro', group: 'Árvores', w: 340, h: 389, layer: 'frontGhost', solid: false, shots: false, entity: false, rotatable: true, resizable: true, editable: true, minW: 40, minH: 40 },
  blossom: { label: 'Ameixeira florida', group: 'Árvores', w: 340, h: 389, layer: 'frontGhost', solid: false, shots: false, entity: false, rotatable: true, resizable: true, editable: true, minW: 40, minH: 40 },
  dummy: { label: 'Alvo de treino', group: 'Alvos', w: 46, h: 112, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: true, editable: true, minW: 20, minH: 40 },
  rack: { label: 'Suporte de item', group: 'Itens', w: 76, h: 62, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: 76, minH: 62 },
  // an item on its own (left where its rack was deleted): it is there once each time the Pátio opens, never comes back
  loose: { label: 'Item solto', group: 'Itens', w: 64, h: 62, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: 64, minH: 62 },
  button: { label: 'Botão da horda', group: 'Botões', w: 40, h: 40, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: true, editable: true, minW: 20, minH: 20 },
  tree: { label: 'Árvore', group: 'Árvores', ...TREE_SIZE, layer: 'scene', solid: false, shots: false, entity: false, rotatable: true, resizable: true, editable: true, minW: 100, minH: 100 },
  house: { label: 'Casa', group: 'Casas', ...HOUSE_SIZE, layer: 'scene', solid: true, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 120, minH: 100 },
  // a hall in the Templo do Gongo's style: its roofs are floors (lib/pigchicken/buildings.ts)
  building: { label: 'Prédio', group: 'Casas', ...BUILDING_SIZE, layer: 'scene', solid: true, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 120, minH: 120 },
  portal: { label: 'Par de portais', group: 'Portais', w: 150, h: 150, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: 150, minH: 150 },
  // the lobby's entry (and way back to the globe): exactly one per Pátio, moved but never deleted or duplicated
  entry: { label: 'Portal de entrada', group: 'Portais', w: 150, h: 150, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: false, minW: 150, minH: 150 },
  // a Portal de nascimento: one more place to be born at, by its chance (spawn-portals.ts); it leads nowhere
  spawn: { label: 'Portal de nascimento', group: 'Portais', w: 150, h: 150, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: 150, minH: 150 },
  zone: { label: 'Zona', group: 'Música', w: 720, h: 520, layer: 'back', solid: false, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 80, minH: 80 },
  lanes: { label: 'Faixas fixas', group: 'Música', w: 520, h: 280, layer: 'back', solid: false, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 60, minH: 60 },
  ground: { label: 'Chão', group: 'Chãos e paredes', w: 640, h: 200, layer: 'scene', solid: true, shots: true, entity: false, rotatable: false, resizable: true, editable: true, minW: 40, minH: 24 },
  wall: { label: 'Parede', group: 'Chãos e paredes', w: 72, h: 320, layer: 'scene', solid: true, shots: true, entity: false, rotatable: false, resizable: true, editable: true, minW: 12, minH: 24 },
  pole: { label: 'Poste de energia', group: 'Energia', w: 120, h: 440, layer: 'back', solid: false, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 16, minH: 60 },
  tower: { label: 'Torre de transmissão', group: 'Energia', w: 380, h: 920, layer: 'back', solid: false, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 40, minH: 100 },
  // the guitar hero mode anywhere: the Jukebox and the Vitrola let her pick a song and play it; the Gongo presses
  // Tocar on the one of its zone after its strikes
  gong: { label: 'Gongo', group: 'Música', ...GONG_BOX, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: GONG_BOX.w, minH: GONG_BOX.h },
  // a green chalkboard with a text in chalk; its ghost chicken shows a move while a player is near (chalkboard.ts)
  chalkboard: { label: 'Quadro de lousa', group: 'Treino', w: 420, h: 260, layer: 'back', solid: false, shots: false, entity: false, rotatable: false, resizable: true, editable: true, minW: 120, minH: 80 },
  jukebox: { label: 'Jukebox', group: 'Música', ...JUKEBOX_BOX, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: JUKEBOX_BOX.w, minH: JUKEBOX_BOX.h },
  vitrola: { label: 'Vitrola toca-discos', group: 'Música', ...VITROLA_BOX, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: VITROLA_BOX.w, minH: VITROLA_BOX.h },
  // the Recomeçar stone: strikes end the Templo's campaign (or the song playing) and clear its points
  resetstone: { label: 'Pedra Recomeçar', group: 'Música', ...RESET_STONE_BOX, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: false, minW: RESET_STONE_BOX.w, minH: RESET_STONE_BOX.h },
  // a chest the players open with Pegar (lib/pigchicken/chests.ts): free, with a key or by merit (the souls in their Gaiolas)
  chest: { label: 'Baú', group: 'Baús', ...CHEST_BOX, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: CHEST_BOX.w, minH: CHEST_BOX.h },
  // a fixed instrument (lib/pigchicken/fixed-instruments.ts): the pedal harp and its stool; a player sits at it with Pegar
  pedalharp: { label: 'Harpa', group: 'Música', ...HARP_BOX, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: HARP_BOX.w, minH: HARP_BOX.h },
  // the acoustic drum kit and its throne
  drumkit: { label: 'Bateria', group: 'Música', ...DRUMKIT_BOX, layer: 'scene', solid: false, shots: false, entity: true, rotatable: false, resizable: false, editable: true, minW: DRUMKIT_BOX.w, minH: DRUMKIT_BOX.h },
}
// the Gongo, the Jukebox and the Baú keep their art's size
const fixedSize = (kind: ElementKind) => kind === 'loose' || kind === 'portal' || kind === 'entry' || kind === 'spawn' || kind === 'gong' || kind === 'jukebox' || kind === 'vitrola' || kind === 'resetstone' || kind === 'chest' || isFixedKind(kind)
// Postes and Torres: their wires join the next one of the same model and line (lib/pigchicken/power-lines.ts)
export const isPowerElement = (kind: ElementKind): kind is 'pole' | 'tower' => kind === 'pole' || kind === 'tower'
// what may stand in a parallax depth of its own: the scenery (not the game's things, the music or the entry)
export const canHaveDepth = (kind: ElementKind) => !ELEMENT_DEFS[kind].entity && !isMusicElement(kind)
export const elementDepth = (el: Pick<LayoutElement, 'depth'>) => el.depth ?? 0
// the music's elements: no collisions of their own (the zone is never drawn in the game)
export const isMusicElement = (kind: ElementKind) => kind === 'zone' || kind === 'lanes'
// Chãos e Paredes: shaped by their own points (lib/pigchicken/surfaces.ts)
export const isSurfaceElement = (kind: ElementKind): kind is SurfaceKind => kind === 'ground' || kind === 'wall'
// the elements whose collisions offer "Objeto duro" (on by default only on grounds and walls)
export const HARD_KINDS: readonly ElementKind[] = ['platform', 'terrace', 'pillar', 'ground', 'wall']
export const isHard = (el: Pick<LayoutElement, 'kind' | 'hard' | 'solid'>) => el.solid && HARD_KINDS.includes(el.kind) && !!el.hard

const r1 = (v: number) => Math.round(v * 10) / 10
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

let idSeq = 0
export function newElementId(kind: ElementKind) {
  idSeq = (idSeq + 1) % 1e6
  return `${kind}-${Date.now().toString(36)}${idSeq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

// a new element of a kind, centred on (cx, cy)
export function createElement(kind: ElementKind, cx: number, cy: number, params: ElementParams = {}): LayoutElement {
  const d = ELEMENT_DEFS[kind]
  const p: ElementParams = { ...defaultParams(kind), ...params }
  return normalizeElement({
    id: newElementId(kind), kind, x: cx - d.w / 2, y: cy - d.h / 2, w: d.w, h: d.h, rot: 0, layer: d.layer, locked: false,
    solid: d.solid, shots: d.shots, notes: false, hidden: false, opacity: 1, params: p,
    ...(isSurfaceElement(kind) ? { hard: true } : {}),
  })!
}

export function defaultParams(kind: ElementKind): ElementParams {
  if (kind === 'house') return { house: housePreset('cliff', newHouseSeed()) }
  if (kind === 'building') return { building: defaultBuilding() }
  if (kind === 'balustrade') return { balustrade: defaultBalustrade() }
  if (kind === 'tree') return { tree: treePreset('pine', newTreeSeed()) }
  if (kind === 'dummy') return { message: DUMMY_DEFAULTS.message, maxHp: DUMMY_DEFAULTS.maxHp }
  if (kind === 'rack' || kind === 'loose') return { item: WEAPON_IDS[0] }
  if (kind === 'button') return { action: 'aliens' }
  if (kind === 'portal') return { portalLabel: 'Entrar no portal?', portalInstruction: 'hover' }
  if (kind === 'pine' || kind === 'blossom') return { seed: Math.floor(Math.random() * 2 ** 31), flip: Math.random() < 0.5 }
  if (kind === 'zone') return { zone: defaultSoundZone() }
  if (kind === 'lanes') return { lanes: defaultLanes() }
  if (isSurfaceElement(kind)) return { surface: defaultSurface(kind) }
  if (isPowerElement(kind)) return { power: defaultPower(kind) }
  if (kind === 'gong') return { gong: defaultGong() }
  if (kind === 'jukebox' || kind === 'vitrola') return { player: defaultPlayer() }
  if (kind === 'chalkboard') return { chalkboard: defaultChalkboard() }
  if (kind === 'chest') return { chest: defaultChest() }
  if (isFixedKind(kind)) return { flip: false }
  return {}
}

// the name shown for an element (a portal on its own is not a pair)
export const elementLabel = (el: Pick<LayoutElement, 'kind' | 'params'>) =>
  el.kind === 'portal' && !el.params.portalPairId && el.params.portalTarget !== undefined ? 'Portal para outro Pátio' : ELEMENT_DEFS[el.kind].label

// a portal to another Pátio: the lobby id (a uuid) or the default Pátio; anything else is "not chosen yet"
export const DEFAULT_PATIO_TARGET = 'default'
const LOBBY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const normalizePortalTarget = (raw: unknown) =>
  typeof raw !== 'string' ? undefined : raw === DEFAULT_PATIO_TARGET || LOBBY_ID.test(raw) ? raw : ''
// one portal on its own, leading to another Pátio (the palette's "Portal para outro Pátio")
export function createPatioPortal(cx: number, cy: number): LayoutElement {
  return createElement('portal', cx, cy, { portalPairId: '', portalTarget: '' })
}

export function createPortalPair(cx: number, cy: number): [LayoutElement, LayoutElement] {
  const a = createElement('portal', cx, cy), b = createElement('portal', cx + 240, cy)
  a.params.portalPairId = a.id; b.params.portalPairId = a.id
  return [a, b]
}

function shortcutPortals(existing: LayoutElement[] = []): LayoutElement[] {
  const used = new Set(existing.flatMap(el => el.params.portalPairId ? [el.id, el.params.portalPairId] : [el.id]))
  const reserveId = (base: string) => {
    let id = base
    for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`
    used.add(id)
    return id
  }
  const d = ELEMENT_DEFS.portal
  const portal = (id: string, pairId: string, cx: number, label: string, region?: LayoutElement['region'], platform?: typeof FIRST_SCENE_PLATFORMS[number]) => normalizeElement({
    id, kind: 'portal', region, x: cx - d.w / 2, y: platform ? WORLD_GROUND_Y - platform.bottom - platform.h - d.h + 6 : WORLD_GROUND_Y - d.h + 6,
    params: { portalPairId: pairId, portalLabel: label, portalInstruction: 'always' },
  })!
  const temple = reserveId('shortcut-temple')
  const village = reserveId('shortcut-village')
  return [
    portal(temple, temple, TEMPLE_START_PLATFORM.x + TEMPLE_START_PLATFORM.w / 2, 'Templo do Gongo', undefined, TEMPLE_START_PLATFORM),
    portal(reserveId('shortcut-temple-return'), temple, 125, 'Voltar ao início do Pátio', 'temple'),
    portal(village, village, VILLAGE_START_PLATFORM.x + VILLAGE_START_PLATFORM.w / 2, 'Vila dos Telhados', undefined, VILLAGE_START_PLATFORM),
    portal(reserveId('shortcut-village-return'), village, 150, 'Voltar ao início do Pátio', 'village'),
  ]
}

// The entry portal: where she arrives from the globe or another Pátio (and leaves to the globe). It starts over the
// small platform at the far left of the first scene.
export const ENTRY_PORTAL_ID = 'entry-portal'
const ENTRY_PLATFORM = FIRST_SCENE_PLATFORMS[1]
export function entryPortalElement(): LayoutElement {
  const d = ELEMENT_DEFS.entry
  return normalizeElement({
    id: ENTRY_PORTAL_ID, kind: 'entry', x: ENTRY_PLATFORM.x + (ENTRY_PLATFORM.w - d.w) / 2,
    y: WORLD_GROUND_Y - ENTRY_PLATFORM.bottom - ENTRY_PLATFORM.h - d.h + 6,
  })!
}
// the entry portal in the world (elementsInWorld), or the default one when it lies past a narrower world's end
export function entryPortalIn(shown: LayoutElement[]): LayoutElement {
  return shown.find(e => e.kind === 'entry') ?? entryPortalElement()
}
// every portal she may be born at, in the world: the entry portal first, then the Portais de nascimento in the
// layout's order
export function spawnPortalsIn(shown: LayoutElement[]): LayoutElement[] {
  return [entryPortalIn(shown), ...shown.filter(e => e.kind === 'spawn')]
}
// a Pátio with nothing in it but the entry portal, with the game's default settings for a new one
// (data/pigchicken/default-patio.json: no Templo do Gongo nor Vila at the end until "Salvar no game" says otherwise)
export function emptyLayout(): PatioLayout {
  const settings = structuredClone(DEFAULT_PATIO_SETTINGS)
  return { v: LAYOUT_VERSION, elements: [entryPortalElement()], ...(Object.keys(settings).length ? { settings } : {}) }
}

// the Suporte de item's table (./racks.ts): its top board and legs, centered on the element and standing on its
// bottom. For the bonecos it is a platform like the others: a one-way floor on top, sides they climb.
export { RACK_TABLE }
export function rackTable(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h'>) {
  return { x: el.x + el.w / 2 - RACK_TABLE.w / 2, y: el.y + el.h - RACK_TABLE.h, w: RACK_TABLE.w, h: RACK_TABLE.h }
}

// deleting a rack leaves its item where it stood, on its own (same id, so the game keeps the item already there)
export function looseFromRack(rack: LayoutElement): LayoutElement {
  const d = ELEMENT_DEFS.loose
  return normalizeElement({ ...rack, kind: 'loose', x: rack.x + rack.w / 2 - d.w / 2, y: rack.y + rack.h - d.h, w: d.w, h: d.h, params: { item: rack.params.item } })!
}

export function portalPartner(portal: LayoutElement, elements: LayoutElement[]) {
  if (portal.kind !== 'portal' || !portal.params.portalPairId) return null
  const peers = elements.filter(e => e.kind === 'portal' && e.params.portalPairId === portal.params.portalPairId)
  return peers.length === 2 ? peers.find(e => e.id !== portal.id) ?? null : null
}

export function duplicatePortalPair(portal: LayoutElement, elements: LayoutElement[]) {
  // a portal on its own (to another Pátio): its copy is on its own too, to the same Pátio
  if (!portal.params.portalPairId && portal.params.portalTarget !== undefined) return [{ ...structuredClone(portal), id: newElementId('portal'), x: portal.x + 32, y: portal.y - 32, locked: false }]
  const partner = portalPartner(portal, elements)
  if (!partner) return createPortalPair(portal.x + portal.w / 2 + 32, portal.y + portal.h / 2 - 32)
  const pair = [portal, partner].map(e => ({ ...structuredClone(e), id: newElementId('portal'), x: e.x + 32, y: e.y - 32, locked: false }))
  pair.forEach(e => { e.params.portalPairId = pair[0].id })
  return pair
}

// ---------- the Templo do Gongo as elements ----------
// Where the temple's fixed drawing stood (until v12), from the scene's left edge L: the far hall and two trees in the
// haze, the main hall with two roofs, the right pavilion with its pyramid, the pine and the plum tree in front, the
// balustrade over the red wall (its floor is the old terrace), the Gongo do Templo, the jukebox, the Recomeçar stone
// and five racks by the entrance. Back to front, in the order the drawing had.
export const TEMPLE_ELEMENT_IDS = ['temple-far-pine', 'temple-far-blossom', 'temple-far-hall', 'temple-hall', 'temple-pavilion', 'temple-pine', 'temple-blossom', 'temple-wall', 'temple-gong', 'temple-jukebox', 'temple-reset', 'temple-rack-bat', 'temple-rack-pistol', 'temple-rack-smg', 'temple-rack-guitar', 'temple-rack-flute'] as const
export function templeElements(L: number): LayoutElement[] {
  const G = WORLD_GROUND_Y
  const el = (raw: Partial<LayoutElement> & Pick<LayoutElement, 'id' | 'kind' | 'x' | 'y'>) => normalizeElement({ ...raw, x: r1(raw.x), y: r1(raw.y) })!
  const tree = (id: string, kind: 'pine' | 'blossom', x: number, base: number, k: number, seed: number, far: boolean) => {
    const w = TREE_BOX.w * k, h = TREE_BOX.h * k
    return el({ id, kind, x: L + x - w / 2, y: base - h, w: r1(w), h: r1(h), layer: far ? 'back' : 'scene', opacity: far ? 0.6 : 1, params: { seed, flip: false } })
  }
  const hall = (id: string, x: number, y: number, w: number, h: number, building: Partial<BuildingParams>, layer: LayoutLayer = 'scene') =>
    el({ id, kind: 'building', x: L + x, y, w, h, layer, solid: !building.haze, params: { building: { ...defaultBuilding(), ...building } } })
  const fixed = (id: string, kind: ElementKind, cx: number, params: ElementParams = {}) => {
    const d = ELEMENT_DEFS[kind]
    return el({ id, kind, x: L + cx - d.w / 2, y: G - d.h, params })
  }
  return [
    tree('temple-far-pine', 'pine', 1230, 800, 0.95, 31337, true),
    tree('temple-far-blossom', 'blossom', 1560, 800, 0.9, 27183, true),
    hall('temple-far-hall', 1176, 422, 488, 381, { roof: 'hip', storeys: 2, columns: 5, doors: 4, lanterns: 0, plaque: false, haze: true }, 'back'),
    hall('temple-hall', 46, 352, 1228, 451, { roof: 'hip', storeys: 2, columns: 14, doors: 13, lanterns: 4, plaque: true }),
    hall('temple-pavilion', 1530, 408, 400, 395, { roof: 'pyramid', storeys: 2, columns: 5, doors: 4, lanterns: 2, plaque: false }),
    tree('temple-pine', 'pine', 110, 830, 0.95, 16180, false),
    tree('temple-blossom', 'blossom', 1890, 830, 0.8, 14142, false),
    el({ id: 'temple-wall', kind: 'balustrade', x: L, y: 800, w: SCENE_W, h: G - 800, params: { balustrade: { courtyard: true } } }),
    fixed('temple-gong', 'gong', TEMPLE_SPOTS.gong, { gong: { ...defaultGong(), temple: true } }),
    fixed('temple-jukebox', 'jukebox', TEMPLE_SPOTS.jukebox),
    fixed('temple-reset', 'resetstone', TEMPLE_SPOTS.reset),
    ...(['bat', 'pistol', 'smg', 'guitar', 'flute'] as ItemId[]).map((item, i) => fixed(`temple-rack-${item}`, 'rack', 60 + i * 90, { item, respawnDelay: rackRespawnDelay(item) })),
  ]
}

// ---------- the default layout: the Pátio as the code always drew it ----------

// the Pátio's seeded trees (the same ones on the server, in the browser and for every player): 3 or 4 per scene,
// each a random variation (size, side it faces, seed of its shape)
export type TreeSeed = { kind: 'pine' | 'blossom'; x: number; h: number; flip: boolean; seed: number; delay: number }
export const TREE_BOX = { w: 420, h: 480 }
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function defaultTrees(screens: number): TreeSeed[] {
  const out: TreeSeed[] = []
  const between = (r: () => number, a: number, b: number) => r1(a + r() * (b - a))
  for (let s = 0; s < screens; s++) {
    const r = rng(9173 + s * 7919)
    const count = 3 + Math.floor(r() * 2)
    for (let i = 0; i < count; i++) {
      // spread over the scene; the first scene keeps its start clear for the portal
      const lo = s === 0 ? 320 : 60
      const slot = (SCENE_W - lo - 60) / count
      const x = s * SCENE_W + lo + slot * (i + between(r, 0.15, 0.85))
      out.push({ kind: r() < 0.62 ? 'pine' : 'blossom', x, h: between(r, 0.62, 1), flip: r() < 0.5, seed: Math.floor(r() * 2 ** 31), delay: r() * 7 })
    }
  }
  return out
}

// the consumables' racks: on the floor of the second scene, between the horde buttons and the dummies
// the Hangdrum's rack: at the right end of the instruments' long shelf (first scene), after the Harpa de Lira
const SHELF = SCENE_PLATFORMS[0][0]
function hangdrumRack(): LayoutElement {
  const d = ELEMENT_DEFS.rack, x = SHELF.x + SHELF.w - d.w - 4
  return { id: 'rack-hangdrum', kind: 'rack', x: r1(x), y: r1(SHELF_TOP - d.h), w: d.w, h: d.h, rot: 0, layer: d.layer, locked: false, solid: d.solid, shots: d.shots, notes: false, hidden: false, opacity: 1, params: { item: 'hangdrum', respawnDelay: rackRespawnDelay('hangdrum') } }
}
// the Gaiola básica's rack: on the floor of the first scene, before the weapons (nobody starts with a cage)
function cageRack(): LayoutElement {
  const d = ELEMENT_DEFS.rack, cx = SCENE_W * 0.0875
  return { id: 'rack-cage', kind: 'rack', x: r1(cx - d.w / 2), y: r1(WORLD_GROUND_Y - d.h), w: d.w, h: d.h, rot: 0, layer: d.layer, locked: false, solid: d.solid, shots: d.shots, notes: false, hidden: false, opacity: 1, params: { item: 'cage', respawnDelay: rackRespawnDelay('cage') } }
}
// the Harpa (lib/pigchicken/fixed-instruments.ts) on its floating island: over the middle of the first scene,
// between the two high platforms of the portals and a little under them (a step down from either one, a jump up
// from the instruments' shelf); a flat top with lower rims and a rocky belly, like the islands of "Vales e ilhas
// no céu". Low enough for the whole Harpa to show from the floor on a desktop screen (some 840 px over the floor
// under the header), and its belly high enough to walk under it on the shelf
export const HARP_ISLAND = { cx: FIRST_SCENE_PLATFORMS[2].x + FIRST_SCENE_PLATFORMS[2].w + (FIRST_SCENE_PLATFORMS[3].x - FIRST_SCENE_PLATFORMS[2].x - FIRST_SCENE_PLATFORMS[2].w) / 2, top: WORLD_GROUND_Y - 560, w: 380, t: 70 }
// where v9 had it (the same island, 800 over the floor and 120 thick)
const HARP_ISLAND_V9 = { ...HARP_ISLAND, top: WORLD_GROUND_Y - 800, t: 120 }
function harpIsland(at = HARP_ISLAND): LayoutElement[] {
  const { cx, top: y, w, t } = at, l = cx - w / 2, r = cx + w / 2
  const { points, ...box } = fitSurface([
    [l, y + 16], [l + w * 0.07, y], [r - w * 0.07, y], [r, y + 16],
    [r - w * 0.06, y + t * 0.45], [cx + w * 0.22, y + t * 0.8], [cx + w * 0.05, y + t], [cx - w * 0.2, y + t * 0.85], [l + w * 0.1, y + t * 0.5],
  ], 40, 24)
  return [
    normalizeElement({ id: 'harp-island', kind: 'ground', ...box, hard: true, params: { surface: { style: 'meadow', points } } })!,
    normalizeElement({ id: 'harp', kind: 'pedalharp', x: cx + 30 - HARP_BOX.w / 2, y: y - HARP_BOX.h })!,
  ]
}
function consumableRacks(): LayoutElement[] {
  const d = ELEMENT_DEFS.rack
  return CONSUMABLE_IDS.map((id, i) => {
    const cx = SCENE_W * (1.45 + i * 0.08)
    return { id: `rack-${id}`, kind: 'rack' as ElementKind, x: r1(cx - d.w / 2), y: r1(WORLD_GROUND_Y - d.h), w: d.w, h: d.h, rot: 0, layer: d.layer, locked: false, solid: d.solid, shots: d.shots, notes: false, hidden: false, opacity: 1, params: { item: id, respawnDelay: rackRespawnDelay(id) } }
  })
}

// the Vila's rocky slope (the old fixed "Chão da Vila"), from a saved ridge or the default one
function villageGroundElement(ridge?: ReturnType<typeof normalizeVillageRidge>): LayoutElement {
  const { surface, ...box } = villageGround(ridge)
  return normalizeElement({ id: VILLAGE_GROUND_ID, kind: 'ground', region: 'village', ...box, hard: true, params: { surface } })!
}

function villageHouses(): LayoutElement[] {
  return VILLAGE_HOUSES.map(([x, bottom, w, h, palette, roof, floors], i) => normalizeElement({
    id: `village-house-${i}`, kind: 'house', region: 'village', x, y: bottom - h, w, h,
    params: { house: {
      ...housePreset('cliff', 4537 + i * 71791), ...VILLAGE_COLORS[palette], roof, floors,
      pitch: 17 + i % 5 * 3, wear: 35 + i % 4 * 8, texture: i % 4 === 0 ? 'boards' : 'auto',
      windows: i % 7 === 0 ? 3 : 2, door: i >= 8, doorPosition: i % 2 ? 'left' : 'right',
    } },
  })!)
}

export function defaultLayout(trees: TreeSeed[] = defaultTrees(LAYOUT_MAX_SCREENS)): PatioLayout {
  const out: LayoutElement[] = []
  const G = WORLD_GROUND_Y
  const base = (kind: ElementKind, id: string, x: number, y: number, w: number, h: number, params: ElementParams = {}): LayoutElement => {
    const d = ELEMENT_DEFS[kind]
    if (kind === 'rack') params = { ...params, respawnDelay: rackRespawnDelay(params.item ?? 'pistol', params.respawnDelay) }
    return { id, kind, x: r1(x), y: r1(y), w: r1(w), h: r1(h), rot: 0, layer: d.layer, locked: false, solid: d.solid, shots: d.shots, notes: false, hidden: false, opacity: 1, params }
  }
  for (let s = 0; s < LAYOUT_MAX_SCREENS; s++) {
    SCENE_PLATFORMS[s % SCENE_PLATFORMS.length].forEach((p, i) => {
      // the tall narrow ones are pillars (walls); the rest, platforms. Same boxes, same ids as before.
      const kind: ElementKind = p.h > p.w ? 'pillar' : 'platform'
      out.push(base(kind, `pq${s}-${i}`, s * SCENE_W + p.x, G - p.bottom - p.h, p.w, p.h))
    })
  }
  trees.forEach((t, i) => {
    const w = r1(TREE_BOX.w * t.h), h = r1(TREE_BOX.h * t.h)
    out.push(base(t.kind, `tree-${i}`, t.x - w / 2, G + 6 - h, w, h, { seed: t.seed, flip: t.flip }))
  })
  // the weapons' racks on the floor of the first scene, the instruments on the long shelf above them
  const rack = ELEMENT_DEFS.rack
  WEAPON_IDS.forEach((id, i) => { const cx = SCENE_W * (0.14 + i * 0.105); out.push(base('rack', `rack-${id}`, cx - rack.w / 2, G - rack.h, rack.w, rack.h, { item: id })) })
  INSTRUMENT_IDS.filter(id => id !== 'hangdrum').forEach((id, i) => { const cx = SCENE_W * (0.14 + i * 0.105); out.push(base('rack', `rack-${id}`, cx - rack.w / 2, SHELF_TOP - rack.h, rack.w, rack.h, { item: id })) })
  out.push(hangdrumRack(), ...consumableRacks(), cageRack(), ...harpIsland())
  // the horde buttons on the second scene
  HORDE_BUTTONS.forEach((id, i) => { const cx = SCENE_W * (1.06 + i * 0.09); out.push(base('button', `btn-${id}`, cx - 20, G - 46 - 40, 40, 40, { action: id })) })
  // the training dummies, each with its own tip
  ;[1.7, 2.0, 2.4, 2.8, 3.2].forEach((f, i) => { const d = ELEMENT_DEFS.dummy; out.push(base('dummy', `dummy-${i}`, SCENE_W * f - d.w / 2, G - d.h, d.w, d.h, { message: dummyTip(i), maxHp: DUMMY_DEFAULTS.maxHp })) })
  // the code's Pátio is all of its 8 screens wide, the Templo and the Vila after them (at their world x, like the rest)
  const elements = [villageGroundElement(), ...out, ...villageHouses(), ...shortcutPortals(), entryPortalElement()]
  detachRegions(elements, LAYOUT_MAX_SCREENS, false)
  elements.splice(1, 0, ...templeElements(templeScene(LAYOUT_MAX_SCREENS) * SCENE_W))
  return { v: LAYOUT_VERSION, elements, settings: { screens: LAYOUT_MAX_SCREENS } }
}

// ---------- cleaning what comes from storage, the database or another player ----------

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
export function normalizeElement(raw: unknown): LayoutElement | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const kind = e.kind as ElementKind
  if (!ELEMENT_KINDS.includes(kind)) return null
  const d = ELEMENT_DEFS[kind]
  const id = typeof e.id === 'string' && e.id.length > 0 && e.id.length <= 64 ? e.id : newElementId(kind)
  const w = fixedSize(kind) ? d.w : r1(clamp(num(e.w, d.w), d.minW, 20000))
  const h = fixedSize(kind) ? d.h : r1(clamp(num(e.h, d.h), d.minH, 6000))
  const rot = d.rotatable ? ((Math.round(num(e.rot, 0) / 45) * 45) % 360 + 360) % 360 : 0
  const layer = d.entity ? d.layer : LAYERS.includes(e.layer as LayoutLayer) ? (e.layer as LayoutLayer) : d.layer
  const p = (e.params && typeof e.params === 'object' ? e.params : {}) as Record<string, unknown>
  const params: ElementParams = {}
  if (kind === 'dummy') {
    params.message = String(p.message ?? '').trim().slice(0, 280)
    params.maxHp = Math.round(clamp(num(p.maxHp, DUMMY_DEFAULTS.maxHp), DUMMY_HP_RANGE.min, DUMMY_HP_RANGE.max))
  } else if (kind === 'loose') {
    params.item = RACK_ITEM_IDS.includes(p.item as ItemId) ? (p.item as ItemId) : WEAPON_IDS[0]
    if (isCage(params.item) && typeof p.cageSouls === 'number' && Number.isFinite(p.cageSouls)) params.cageSouls = Math.round(clamp(p.cageSouls, 1, CAGE_SOULS_MAX))
  } else if (kind === 'rack') {
    params.item = RACK_ITEM_IDS.includes(p.item as ItemId) ? (p.item as ItemId) : WEAPON_IDS[0]
    params.respawnDelay = rackRespawnDelay(params.item, typeof p.respawnDelay === 'number' ? p.respawnDelay : undefined)
    const refill = rackRefillLimit(p.refillLimit)
    if (refill !== undefined) params.refillLimit = refill
    if (isCage(params.item) && typeof p.cageSouls === 'number' && Number.isFinite(p.cageSouls)) params.cageSouls = Math.round(clamp(p.cageSouls, 1, CAGE_SOULS_MAX))
  } else if (kind === 'button') {
    params.action = HORDE_BUTTONS.includes(p.action as HordeButton) ? (p.action as HordeButton) : 'aliens'
    const limit = pressLimitParam(p.pressLimit), every = pressWindowParam(p.pressWindow), gap = pressGapParam(p.pressGap)
    if (limit !== undefined) params.pressLimit = limit
    if (every !== undefined) params.pressWindow = every
    if (gap !== undefined) params.pressGap = gap
  } else if (kind === 'house') {
    params.house = normalizeHouse(p.house)
  } else if (kind === 'building') {
    params.building = normalizeBuilding(p.building)
  } else if (kind === 'balustrade') {
    params.balustrade = normalizeBalustrade(p.balustrade)
  } else if (kind === 'tree') {
    params.tree = normalizeTree(p.tree)
  } else if (kind === 'trampoline') {
    params.trampoline = normalizeTrampoline(p.trampoline)
  } else if (kind === 'portal') {
    params.portalPairId = typeof p.portalPairId === 'string' ? p.portalPairId.slice(0, 64) : ''
    params.portalLabel = String(p.portalLabel ?? 'Entrar no portal?').slice(0, 100)
    params.portalInstruction = p.portalInstruction === 'always' ? 'always' : 'hover'
    const target = normalizePortalTarget(p.portalTarget)
    if (target !== undefined) {
      params.portalTarget = target
      if (target && typeof p.portalTargetName === 'string' && p.portalTargetName.trim()) params.portalTargetName = p.portalTargetName.slice(0, 60)
    }
  } else if (kind === 'entry' || kind === 'spawn') {
    if (typeof p.spawnChance === 'number' && Number.isFinite(p.spawnChance)) params.spawnChance = Math.round(clamp(p.spawnChance, 0, 100))
    if (typeof p.freeBlock === 'boolean') params.freeBlock = p.freeBlock
  } else if (kind === 'pine' || kind === 'blossom') {
    params.seed = Math.floor(clamp(num(p.seed, 1), 0, 2 ** 31))
    params.flip = !!p.flip
  } else if (kind === 'zone') {
    params.zone = normalizeSoundZone(p.zone)
  } else if (kind === 'lanes') {
    params.lanes = normalizeLanes(p.lanes)
  } else if (isSurfaceElement(kind)) {
    params.surface = normalizeSurface(kind, p.surface)
  } else if (isPowerElement(kind)) {
    params.power = normalizePower(kind, p.power)
  } else if (kind === 'gong') {
    params.gong = normalizeGong(p.gong)
  } else if (kind === 'jukebox' || kind === 'vitrola') {
    params.player = normalizePlayer(p.player)
  } else if (kind === 'chalkboard') {
    params.chalkboard = normalizeChalkboard(p.chalkboard)
  } else if (kind === 'chest') {
    params.chest = normalizeChest(p.chest)
  } else if (isFixedKind(kind)) {
    params.flip = !!p.flip
  }
  const music = isMusicElement(kind)
  // in a depth of its own it is only scenery: no collisions of any kind
  const backdrop = canHaveDepth(kind) && isBackdropLayer(e.backdrop) ? e.backdrop : undefined
  const depth = backdrop ? BACKDROP_DEPTH[backdrop] : canHaveDepth(kind) ? normalizeDepth(e.depth) : 0
  const flat = d.entity || music || depth > 0
  const rebate = flat ? undefined : normalizeSurfaceRebate(e.rebate)
  const region = depth === 0 && (e.region === 'temple' || e.region === 'village') ? e.region : undefined
  const x = region
    ? clamp(r1(num(e.x, 0)), -w / 2, SCENE_W - w / 2 - 0.1)
    : r1(clamp(num(e.x, 0), -2000, SCENE_W * (worldScenes(LAYOUT_MAX_SCREENS) + LEGACY_REGION_SCENES)))
  return {
    id, kind, ...(region ? { region } : {}),
    x, y: r1(clamp(num(e.y, 0), PATIO_LOWEST_TOP, WORLD_GROUND_Y + 200)),
    w, h, rot, layer, locked: !!e.locked,
    solid: depth > 0 ? false : kind === 'house' || kind === 'trampoline' ? true : kind === 'tree' || d.entity || music ? false : typeof e.solid === 'boolean' ? e.solid : d.solid,
    shots: flat ? false : typeof e.shots === 'boolean' ? e.shots : d.shots,
    notes: flat ? false : !!e.notes,
    ...(rebate ? { rebate } : {}),
    ...(!d.entity && !music && typeof e.occludesColliders === 'boolean' ? { occludesColliders: e.occludesColliders } : {}),
    // kept when on, and always on grounds and walls (where it starts on)
    ...(depth > 0 ? { depth } : {}),
    ...(backdrop ? { backdrop } : {}),
    ...(HARD_KINDS.includes(kind) && (isSurfaceElement(kind) || e.hard === true) ? { hard: typeof e.hard === 'boolean' ? e.hard : isSurfaceElement(kind) } : {}),
    hidden: kind === 'zone' ? true : d.entity ? false : !!e.hidden,
    opacity: r1(clamp(num(e.opacity, 1), 0.1, 1) * 100) / 100,
    ...(e.gravity === true && depth === 0 ? { gravity: true } : {}),
    params,
  }
}

export function normalizeLayout(raw: unknown, isDefault = false): PatioLayout | null {
  if (!raw || typeof raw !== 'object') return null
  const list = (raw as { elements?: unknown }).elements
  if (!Array.isArray(list)) return null
  const v = (raw as { v?: unknown }).v
  const hasStoredShortcuts = typeof v === 'number' && v >= 4
  const seen = new Set<string>()
  const elements: LayoutElement[] = []
  for (const item of list.slice(0, hasStoredShortcuts ? LAYOUT_MAX_ELEMENTS : LEGACY_MAX_ELEMENTS)) {
    const el = normalizeElement(item)
    if (!el) continue
    // one entry portal per Pátio: the first one stands
    if (el.kind === 'entry' && elements.some(e => e.kind === 'entry')) continue
    if (seen.has(el.id)) el.id = newElementId(el.kind)
    seen.add(el.id)
    elements.push(el)
  }
  // saved before the consumables existed (v1): their racks join it once, unless one already holds that item
  if (!(typeof v === 'number' && v >= 2)) {
    consumableRacks().forEach(r => {
      if (elements.length >= LEGACY_MAX_ELEMENTS || elements.some(e => e.kind === 'rack' && e.params.item === r.params.item)) return
      if (seen.has(r.id)) r.id = newElementId('rack')
      seen.add(r.id); elements.push(r)
    })
  }
  if (isDefault && !(typeof v === 'number' && v >= 3)) {
    for (const house of villageHouses()) {
      if (elements.length >= LEGACY_MAX_ELEMENTS) break
      if (!seen.has(house.id)) elements.push(house)
    }
  }
  if (!hasStoredShortcuts) elements.push(...shortcutPortals(elements))
  // Move only untouched default entrances from their old ground positions. Custom default-layout edits and
  // every personal Patio keep their saved portal locations.
  if (isDefault && typeof v === 'number' && v < 6) {
    const portalSize = ELEMENT_DEFS.portal
    const destinations = new Map([
      ['shortcut-temple', { oldX: 395 - portalSize.w / 2, newX: TEMPLE_START_PLATFORM.x + (TEMPLE_START_PLATFORM.w - portalSize.w) / 2, y: WORLD_GROUND_Y - TEMPLE_START_PLATFORM.bottom - TEMPLE_START_PLATFORM.h - portalSize.h + 6 }],
      ['shortcut-village', { oldX: 620 - portalSize.w / 2, newX: VILLAGE_START_PLATFORM.x + (VILLAGE_START_PLATFORM.w - portalSize.w) / 2, y: WORLD_GROUND_Y - VILLAGE_START_PLATFORM.bottom - VILLAGE_START_PLATFORM.h - portalSize.h + 6 }],
    ])
    for (const el of elements) {
      const target = destinations.get(el.id)
      if (el.kind === 'portal' && target && el.x === target.oldX && el.y === WORLD_GROUND_Y - portalSize.h + 6 && !el.region) {
        el.x = target.newX
        el.y = target.y
      }
    }
  }
  // the default Pátio saved before the Hangdrum (v7): its rack joins once, unless one already holds it
  if (isDefault && !(typeof v === 'number' && v >= 7) && !elements.some(e => e.kind === 'rack' && e.params.item === 'hangdrum') && elements.length < LAYOUT_MAX_ELEMENTS) {
    const rack = hangdrumRack()
    if (seen.has(rack.id)) rack.id = newElementId('rack')
    seen.add(rack.id); elements.push(rack)
  }
  // the default Pátio saved before the Gaiolas (v8): the Gaiola básica's rack joins once, unless a rack already holds one
  if (isDefault && !(typeof v === 'number' && v >= 8) && !elements.some(e => e.kind === 'rack' && e.params.item === 'cage') && elements.length < LAYOUT_MAX_ELEMENTS) {
    const rack = cageRack()
    if (seen.has(rack.id)) rack.id = newElementId('rack')
    seen.add(rack.id); elements.push(rack)
  }
  // the default Pátio saved before the Harpa (v9): its island and the Harpa on it join once, unless it already has one
  if (isDefault && !(typeof v === 'number' && v >= 9) && !elements.some(e => e.kind === 'pedalharp') && elements.length + 2 <= LAYOUT_MAX_ELEMENTS) {
    for (const el of harpIsland()) {
      if (seen.has(el.id)) el.id = newElementId(el.kind)
      seen.add(el.id); elements.push(el)
    }
  }
  // the default Pátio saved with the island where v9 had it: untouched, the island and its Harpa come down
  if (isDefault && v === 9) {
    const [was, wasHarp] = harpIsland(HARP_ISLAND_V9), [now, nowHarp] = harpIsland()
    const same = (a: LayoutElement | undefined, b: LayoutElement) => !!a && a.kind === b.kind && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
    const island = elements.find(e => e.id === was.id), harp = elements.find(e => e.id === wasHarp.id)
    if (same(island, was) && same(harp, wasHarp)) {
      elements[elements.indexOf(island!)] = now
      elements[elements.indexOf(harp!)] = { ...harp!, y: nowHarp.y }
    }
  }
  // saved before v5: the Vila's fixed ground (with its edited ridge, `terrain`) becomes the first element, so it is
  // drawn and collides behind everything else in its layer, as before
  if (!(typeof v === 'number' && v >= 5)) {
    const ground = villageGroundElement(normalizeVillageRidge((raw as { terrain?: unknown }).terrain))
    if (seen.has(ground.id)) ground.id = newElementId('ground')
    elements.unshift(ground)
  }
  // saved before the entry portal was an element (or without it): it joins where it always stood
  if (!elements.some(e => e.kind === 'entry')) {
    const entry = entryPortalElement()
    if (seen.has(entry.id)) entry.id = newElementId('entry')
    elements.push(entry)
  }
  let settings = normalizePatioSettings((raw as { settings?: unknown }).settings)
  // saved before v11 (or anything still scene-local): every element gets the world x it had at the width it was shown
  if (!(typeof v === 'number' && v >= 11) || elements.some(e => e.region)) {
    const screens = settings?.screens ?? legacyScreens()
    if (detachRegions(elements, screens, !(typeof v === 'number' && v >= 11)) && settings?.screens === undefined) settings = { ...settings, screens }
  }
  // saved before v12 with the Templo do Gongo on: its elements join where its fixed drawing stood (the Templo's scene
  // at the width it was shown), behind everything else, so the Pátio looks and plays as before
  if (!(typeof v === 'number' && v >= 12) && settings?.temple !== false && elements.length + TEMPLE_ELEMENTS <= LAYOUT_MAX_ELEMENTS) {
    const screens = settings?.screens ?? legacyScreens()
    const temple = templeElements(templeScene(screens) * SCENE_W)
    for (const el of temple) { if (seen.has(el.id)) el.id = newElementId(el.kind); seen.add(el.id) }
    elements.splice(elements[0]?.id === VILLAGE_GROUND_ID ? 1 : 0, 0, ...temple)
    if (settings?.screens === undefined) settings = { ...settings, screens }
  }
  return { v: LAYOUT_VERSION, elements, ...(settings ? { settings } : {}) }
}

// ---------- geometry: the turned box, its bounds and the floor of a sloped one ----------

export function elementCorners(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h' | 'rot'>): [number, number][] {
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2
  const a = (el.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const dx = (sx * el.w) / 2, dy = (sy * el.h) / 2
    return [cx + dx * c - dy * s, cy + dx * s + dy * c]
  })
}

// the box around the turned element (world units)
export function elementBounds(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h' | 'rot'>) {
  if (el.rot % 180 === 0) return { x: el.x, y: el.y, w: el.w, h: el.h }
  if (el.rot % 180 === 90) return { x: el.x + el.w / 2 - el.h / 2, y: el.y + el.h / 2 - el.w / 2, w: el.h, h: el.w }
  const pts = elementCorners(el)
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export const layoutCollisionDepth = (el: LayoutElement, index: number) =>
  1 + LAYERS.indexOf(el.layer) * (LAYOUT_MAX_ELEMENTS + 1) + index
export const occludesColliders = (el: LayoutElement) =>
  !ELEMENT_DEFS[el.kind].entity && !isMusicElement(el.kind) && (el.occludesColliders ?? (el.kind === 'house'))

// a shaped element's outline (Chão, Parede) in world units, else null
export const elementOutline = (el: LayoutElement) => isSurfaceElement(el.kind) && el.params.surface ? surfacePolygon(el, el.params.surface) : null

export function layoutCollisionMasks(elements: LayoutElement[]): CollisionMask[] {
  const masks: CollisionMask[] = []
  elements.forEach((el, index) => {
    if (!occludesColliders(el) || el.hidden || el.opacity < 1 || el.layer === 'frontGhost' || el.depth) return
    const polygon = el.params.house
      ? houseWallPolygon(el.params.house).map(([x, y]) => [el.x + x * el.w / 100, el.y + y * el.h / 100] as const)
      : elementOutline(el) ?? elementCorners(el)
    masks.push({ depth: layoutCollisionDepth(el, index), polygon })
  })
  return masks
}

// a sloped element (turned 45°, 135°…) is a ramp: its upper edges are one-way floors. The points are relative
// to its bounds' top-left, in the format the chicken's engine reads (`data-chicken-line`). Straight ones: null.
export function elementFloorLine(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h' | 'rot'>): string | null {
  if (el.rot % 90 === 0) return null
  const b = elementBounds(el)
  const pts = elementCorners(el)
  // the upper chain: from the leftmost corner over the highest one to the rightmost
  const left = pts.reduce((a, p) => (p[0] < a[0] ? p : a)), right = pts.reduce((a, p) => (p[0] > a[0] ? p : a)), top = pts.reduce((a, p) => (p[1] < a[1] ? p : a))
  return [left, top, right].map(p => `${r1(p[0] - b.x)},${r1(p[1] - b.y)}`).join(' ')
}

// Every element has its own world x: none follows the Templo or the Vila when the Pátio's width changes. A narrower
// world hides (but keeps) what is past its end, the Templo's and the Vila's scenes included, and shows it again where it
// was when the world is made wider.
export const worldEnd = (screens: number) => worldScenes(screens) * SCENE_W
export function elementsInWorld(layout: PatioLayout, screens: number) {
  const end = worldEnd(screens)
  return layout.elements.filter(el => el.depth || el.x + el.w / 2 < end)
}

// where an element moved or put in the editor is kept: its world x, its centre inside the world
export function storeElementPosition(el: LayoutElement, screens: number): LayoutElement {
  const { region: _r, ...rest } = el
  if (el.depth) return rest
  const cx = Math.min(el.x + el.w / 2, worldEnd(screens) - 0.1)
  return { ...rest, x: cx - el.w / 2 }
}

// ---------- v11: the Templo's and the Vila's elements leave their scenes ----------
// Before v11 an element put in the Templo or the Vila kept an x local to that scene (`region`) and followed it when the
// Pátio's width changed, and the rest showed only up to the Parquinho's end (the Templo's scene). Now everything shows
// up to the world's end, the Templo and the Vila included. `screens`: the width the layout was shown at.
// - each scene-local element gets the world x it had at that width;
// - (legacy: true) the Parquinho's elements past its end, which a narrower width hid, move by the Templo's and the
//   Vila's two scenes, so they stay hidden (instead of turning up on the Templo and the Vila) and keep their order.
// Changes `elements` in place; true when anything moved.
const LEGACY_REGION_SCENES = 2
function legacyOrigin(region: LayoutElement['region'], screens: number) {
  return region === 'village' ? villageScene(screens) * SCENE_W : region === 'temple' ? templeScene(screens) * SCENE_W : 0
}
export function detachRegions(elements: LayoutElement[], screens: number, legacy = true): boolean {
  const end = screens * SCENE_W
  let moved = false
  elements.forEach((el, i) => {
    if (el.region) {
      const { region, ...rest } = el
      elements[i] = el.depth ? rest : { ...rest, x: r1(el.x + legacyOrigin(region, screens)) }
      moved = true
    } else if (legacy && !el.depth && el.x + el.w / 2 >= end) {
      elements[i] = { ...el, x: r1(el.x + LEGACY_REGION_SCENES * SCENE_W) }
      moved = true
    }
  })
  return moved
}

// the width a layout saved without its own was shown at: this browser's old "Largura do mundo" (the game's default
// on the server or in the tests)
function legacyScreens(): number {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem('pigchicken-parquinho-v1')
    const saved = raw ? (JSON.parse(raw) as { screens?: unknown }).screens : undefined
    if (typeof saved === 'number' && Number.isFinite(saved)) return Math.round(clamp(saved, PATIO_SCREENS.min, PATIO_SCREENS.max))
  } catch { /* storage unavailable */ }
  return DEFAULT_PATIO_SETTINGS.screens ?? LEGACY_DEFAULT_SCREENS
}
// the Parquinho's own default width (lib/pigchicken/settings.ts, CODE_PARQUINHO.screens)
const LEGACY_DEFAULT_SCREENS = 4

export function treeWorldSurfaces(el: Pick<LayoutElement, 'x' | 'y' | 'w' | 'h' | 'rot'>, tree: TreeParams) {
  const angle = el.rot * Math.PI / 180
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2
  const transform = ([x, y]: TreePoint): TreePoint => {
    const dx = ((tree.flip ? 50 - x : x - 50) / 100) * el.w, dy = ((y - 50) / 100) * el.h
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
  }
  const { floors, walls } = treeSurfaces(tree)
  return { floors: floors.map(line => line.map(transform)), walls: walls.map(line => line.map(transform)) }
}

// what the shots, notes and items lying around meet (combat's boxes)
export function layoutBoxes(elements: LayoutElement[]): Box[] {
  const G = WORLD_GROUND_Y
  const out: Box[] = []
  const occlusion = createCollisionOcclusion(layoutCollisionMasks(elements))
  elements.forEach((e, index) => {
    // a Suporte de item's table: what falls lands on its board (only the board, so it is no wall)
    if (e.kind === 'rack') {
      if (e.depth) return
      const t = rackTable(e)
      out.push({ l: t.x, t: t.y, r: t.x + t.w, b: Math.min(t.y + RACK_TABLE.board, G), solid: true, shots: false, notes: false })
      return
    }
    const solid = e.solid && e.kind !== 'house' && e.kind !== 'building' && e.kind !== 'trampoline'
    if (ELEMENT_DEFS[e.kind].entity || (!solid && !e.shots && !e.notes && !e.rebate)) return
    const b = elementBounds(e)
    // the Mureta com cerca: what falls lands on its floor (the top of the wall), not on the balustrade
    const top = e.kind === 'balustrade' ? b.y + BALUSTRADE_FLOOR : b.y
    const box: Box = { l: b.x, t: top, r: b.x + b.w, b: Math.min(b.y + b.h, G), solid, shots: e.shots, notes: e.notes }
    if (e.rebate) box.rebate = e.rebate
    const occluded = occlusion?.forBox(layoutCollisionDepth(e, index), box)
    // a shaped one (Chão, Parede) only meets what is inside its outline
    const outline = elementOutline(e)
    const occludedAt = outline ? (x: number, y: number) => !polygonContains(outline, x, y) || !!occluded?.(x, y) : occluded
    if (occludedAt) box.occludedAt = occludedAt
    // and what falls on it lands on the lines of the outline that face up, not on the top of the box around it
    if (outline) box.topsAt = x => outlineTops(outline, x).filter(t => t <= box.b && !occluded?.(x, t))
    out.push(box)
  })
  return out
}

// the Zonas sonoras and the Faixas fixas in the world (their bounds), for what a point of the map plays
export function layoutMusic(elements: LayoutElement[]): { zones: ZoneBox[]; lanes: LanesBox[] } {
  const zones: ZoneBox[] = [], lanes: LanesBox[] = []
  for (const e of elements) {
    if (e.kind === 'zone' && e.params.zone) zones.push({ ...elementBounds(e), id: e.id, zone: e.params.zone })
    else if (e.kind === 'lanes' && e.params.lanes) lanes.push({ ...elementBounds(e), id: e.id, lanes: e.params.lanes })
  }
  return { zones, lanes }
}

export const sameLayout = (a: PatioLayout | null, b: PatioLayout | null) => JSON.stringify(a) === JSON.stringify(b)

// the top of a solid element over the span [l, r]: its highest point there (a ramp's sloped edge, else its top)
// what holds up another element (gravity, a drop from the palette): the solid ones, and a Suporte de item's table
const holdsUp = (el: LayoutElement) => (el.solid && !ELEMENT_DEFS[el.kind].entity) || el.kind === 'rack'

function surfaceTop(el: LayoutElement, l: number, r: number): number {
  if (el.kind === 'rack') return rackTable(el).y
  const b = elementBounds(el)
  if (el.kind === 'balustrade') return b.y + BALUSTRADE_FLOOR
  const line = elementFloorLine(el)
  const outline = elementOutline(el)
  const roofs = el.kind === 'house' && el.params.house ? [houseRoof(el.params.house).map(([x, y]) => [x * el.w / 100, y * el.h / 100])]
    : el.kind === 'building' && el.params.building ? buildingSurfaces(el.params.building, el.w, el.h)
    : outline ? [[...outline, outline[0]].map(([x, y]) => [x - b.x, y - b.y])] : null
  if (!line && !roofs?.length) return b.y
  let best = Infinity
  for (const roof of roofs ?? [line!.split(' ').map(p => p.split(',').map(Number))]) {
    const pts = roof.map(([x, y]) => [b.x + x, b.y + y] as const)
    const xs = [l, r, ...pts.map(p => p[0]).filter(x => x > l && x < r)]
    for (const x of xs) {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
        if (x < Math.min(ax, bx) || x > Math.max(ax, bx) || ax === bx) continue
        best = Math.min(best, ay + ((x - ax) / (bx - ax)) * (by - ay))
      }
    }
  }
  return Number.isFinite(best) ? best : b.y
}

export function settleLayoutInWorld(layout: PatioLayout, screens: number, skip?: string | null): PatioLayout {
  if (!layout.elements.some(el => el.gravity)) return layout
  const visible = elementsInWorld(layout, screens)
  const settled = settleLayout(visible, skip)
  if (visible === settled) return layout
  const heights = new Map(settled.map(el => [el.id, el.y]))
  return { ...layout, elements: layout.elements.map(el => {
    const y = heights.get(el.id)
    return y === undefined || y === el.y ? el : { ...el, y }
  }) }
}

export function layoutFloorBelow(elements: LayoutElement[], x: number, y: number) {
  let floor = WORLD_GROUND_Y
  for (const el of elements) {
    if (!holdsUp(el)) continue
    const b = elementBounds(el)
    if (x < b.x || x > b.x + b.w) continue
    const top = el.kind === 'rack' || el.kind === 'house' || el.kind === 'building' || el.kind === 'balustrade' || isSurfaceElement(el.kind) ? surfaceTop(el, x, x) : b.y
    if (top >= y && top < floor) floor = top
  }
  return floor
}

// gravity: each element with `gravity` falls straight down until its bounds rest on a solid element (or a Suporte de
// item's table) below it or on the ground. The lowest ones fall first, so a stack settles in one pass; one already resting (or `skip`, the one
// being dragged) stays. Only falls: an element is never pushed up.
export function settleLayout(elements: LayoutElement[], skip?: string | null): LayoutElement[] {
  const falling = elements.filter(e => e.gravity && e.id !== skip)
  if (!falling.length) return elements
  const supports = elements.filter(e => holdsUp(e) && (!e.gravity || e.id === skip))
  const moved = new Map<string, LayoutElement>()
  const order = [...falling].sort((a, b) => { const ba = elementBounds(a), bb = elementBounds(b); return bb.y + bb.h - (ba.y + ba.h) })
  for (const el of order) {
    const b = elementBounds(el)
    const bottom = b.y + b.h, l = b.x + 1, r = b.x + b.w - 1
    let floor = WORLD_GROUND_Y
    for (const s of supports) {
      const sb = elementBounds(s)
      if (sb.x >= r || sb.x + sb.w <= l) continue
      const top = surfaceTop(s, Math.max(l, sb.x), Math.min(r, sb.x + sb.w))
      if (top >= bottom - 2 && top < floor) floor = top
    }
    const dy = r1(floor - bottom)
    const next = Math.abs(dy) < 0.05 ? el : { ...el, y: r1(el.y + dy) }
    if (next !== el) moved.set(el.id, next)
    if (holdsUp(next)) supports.push(next)
  }
  return moved.size ? elements.map(e => moved.get(e.id) ?? e) : elements
}
