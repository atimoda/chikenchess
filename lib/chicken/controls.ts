// Player chicken controls: keyboard and gamepad bindings, on-screen (touch) controls and sound.
// One store for every screen, saved in this browser; the panel and the engine both read it.
// The defaults (new players and "Restaurar padrão") come from data/chicken/default-controls.json, which an admin
// rewrites from the panel ("Salvar no game"); the binds in CHICKEN_ACTIONS are the fallback for anything it lacks.
import DEFAULTS_FILE from '../../data/chicken/default-controls.json'
import { gameDefault } from '../game-defaults'
import { msg, t as tr } from '../i18n'

export type ChickenAction = 'left' | 'right' | 'up' | 'down' | 'crouch' | 'jump' | 'run'
  // items (PigChicKen weapons and instruments); only the Parquinho acts on them for now
  | 'fire' | 'melee' | 'throw' | 'nextItem' | 'prevItem' | 'itemWheel' | 'reload' | 'grab' | 'deselectItem'
  | 'nextInstrument' | 'nextWeapon' | 'nextUtility' | 'nextVariation'
  // the Gaiolas (lib/pigchicken/cages.ts): lets a soul out of the one in front (held: the next one comes to the front)
  | 'cageRelease' | 'cageSwap'
  // the Pátio: turns the Modo editor's editing switch on and off (a tap: pressed and let go with no other key)
  | 'editMode'
export type ChickenTouchMode = 'auto' | 'on' | 'off'
type Slots = (string | null)[]

// Input types: each one is a separate source of input that the players panel can hand to one local player.
// keys = primary keyboard (left hand, WASD), keys2 = secondary keyboard (right hand, arrows and the
// Insert/Home/Page Up block), pad = gamepad. A key belongs to one keyboard type and one action only.
export type ChickenInputType = 'keys' | 'keys2' | 'pad'
export const CHICKEN_INPUT_TYPES: { id: ChickenInputType; label: string; device: 'keyboard' | 'gamepad'; slots: number }[] = [
  { id: 'keys', label: msg('Primary keyboard'), device: 'keyboard', slots: 3 },
  { id: 'keys2', label: msg('Secondary keyboard'), device: 'keyboard', slots: 2 },
  { id: 'pad', label: msg('Gamepad'), device: 'gamepad', slots: 3 },
]
export const KEYBOARD_INPUT_TYPES: ChickenInputType[] = CHICKEN_INPUT_TYPES.filter(t => t.device === 'keyboard').map(t => t.id)

export const CHICKEN_ACTIONS: { key: ChickenAction; label: string; keys: Slots; keys2: Slots; pad: Slots; group?: 'items' | 'patio' }[] = [
  { key: 'left', label: msg('Esquerda'), keys: ['Key:KeyA', null, null], keys2: ['Key:ArrowLeft', null], pad: ['Pad:a0-', 'Pad:b14', null] },
  { key: 'right', label: msg('Direita'), keys: ['Key:KeyD', null, null], keys2: ['Key:ArrowRight', null], pad: ['Pad:a0+', 'Pad:b15', null] },
  { key: 'up', label: msg('Olhar pra cima / subir'), keys: ['Key:KeyW', null, null], keys2: ['Key:ArrowUp', null], pad: ['Pad:a1-', 'Pad:b12', null] },
  { key: 'down', label: msg('Chocar / cair / travar mira'), keys: ['Key:ControlLeft', 'Key:KeyX', null], keys2: ['Key:Slash', 'Key:ControlRight'], pad: ['Pad:b6', null, null] },
  { key: 'crouch', label: msg('Agachar / slide / super pulo'), keys: ['Key:KeyS', null, null], keys2: ['Key:PageDown', 'Key:ArrowDown'], pad: ['Pad:a1+', 'Pad:b13', null] },
  { key: 'jump', label: msg('Pular / voar'), keys: ['Key:Space', 'Key:KeyZ', null], keys2: ['Key:PageUp', 'Key:Semicolon'], pad: ['Pad:b0', null, null] },
  { key: 'run', label: msg('Correr'), keys: ['Key:ShiftLeft', null, null], keys2: ['Key:ShiftRight', null], pad: ['Pad:b2', null, null] },
  // the mouse is fixed: left click fires, right click hits, the mouse wheel cycles items; 1 to 9 pick an item
  { key: 'fire', label: msg('Atirar'), keys: ['Key:KeyV', null, null], keys2: ['Key:Insert', 'Key:BracketRight'], pad: ['Pad:b7', null, null], group: 'items' },
  { key: 'melee', label: msg('Golpe de perto'), keys: ['Key:KeyC', null, null], keys2: ['Key:BracketLeft', null], pad: ['Pad:b3', null, null], group: 'items' },
  { key: 'throw', label: msg('Arremessar item'), keys: ['Key:KeyG', null, null], keys2: ['Key:Backslash', null], pad: ['Pad:b11', null, null], group: 'items' },
  // every item in the bar's order (the mouse wheel does the same); the three below go through one group each
  { key: 'nextItem', label: msg('Próximo item'), keys: [null, null, null], keys2: [null, null], pad: [null, null, null], group: 'items' },
  { key: 'prevItem', label: msg('Item anterior'), keys: [null, null, null], keys2: ['Key:Quote', null], pad: [null, null, null], group: 'items' },
  { key: 'nextInstrument', label: msg('Próximo instrumento'), keys: ['Key:Tab', null, null], keys2: [null, null], pad: ['Pad:b4', null, null], group: 'items' },
  { key: 'nextWeapon', label: msg('Próxima arma'), keys: [null, null, null], keys2: [null, null], pad: ['Pad:b5', null, null], group: 'items' },
  { key: 'nextUtility', label: msg('Próximo utilitário'), keys: ['Key:KeyF', null, null], keys2: [null, null], pad: ['Pad:b1', null, null], group: 'items' },
  // the held item's next variation: an instrument's next scale, a weapon's tambor (lib/pigchicken/inventory.ts)
  { key: 'nextVariation', label: msg('Próxima variação'), keys: ['Key:KeyQ', null, null], keys2: [null, null], pad: [null, null, null], group: 'items' },
  { key: 'deselectItem', label: msg('Deselecionar item'), keys: ['Key:KeyB', null, null], keys2: [null, null], pad: [null, null, null], group: 'items' },
  // the inventory wheel stays open while held: aim at an item (mouse / right stick) and let go (or fire / jump / run)
  // (no gamepad button since 15/11: L3 went to the Gaiolas)
  { key: 'itemWheel', label: msg('Roda do inventário'), keys: ['Key:KeyT', null, null], keys2: [null, null], pad: [null, null, null], group: 'items' },
  // the Gaiolas: a press lets the last soul of the one in front out (with it empty, calls the souls back); the same
  // bind held for CAGE_HOLD turns the cages instead, so one button (L3) does both on the gamepad
  { key: 'cageRelease', label: msg('Soltar alma (segurar: trocar)'), keys: ['Key:KeyH', null, null], keys2: ['Key:End', null], pad: ['Pad:b10', null, null], group: 'items' },
  { key: 'cageSwap', label: msg('Trocar de gaiola'), keys: ['Key:KeyY', null, null], keys2: ['Key:Home', null], pad: [null, null, null], group: 'items' },
  // X runs and also grabs while standing on an item; the Shifts do the same on the keyboards. R3 throws, Y hits, LT broods.
  { key: 'grab', label: msg('Usar / pegar item'), keys: ['Key:KeyE', null, null], keys2: ['Key:KeyP', 'Key:ShiftRight'], pad: ['Pad:b2', null, null], group: 'items' },
  { key: 'reload', label: msg('Recarregar'), keys: ['Key:KeyR', null, null], keys2: [null, null], pad: ['Pad:b9', null, null], group: 'items' },
  { key: 'editMode', label: msg('Edição (Modo editor)'), keys: ['Key:AltLeft', 'Key:MetaLeft', null], keys2: [null, null], pad: [null, null, null], group: 'patio' },
]

// Independent eight-direction magnets for movement and aim; zero disables each.
// slowWalk: the speed multiplier while the movement stick is pushed less than 80% (lib/chicken/analog-walk.ts)
export type ChickenAnalog = { deadzoneL: number; deadzoneR: number; magnet: boolean; magnetDeg: number; magnetRestoreDeg: number; aimMagnetDeg: number; slowWalk: number }
export const DEFAULT_ANALOG: ChickenAnalog = { deadzoneL: 0.25, deadzoneR: 0.25, magnet: false, magnetDeg: 0, magnetRestoreDeg: 12, aimMagnetDeg: 0, slowWalk: 0.5 }

export type ChickenControls = {
  keys: Record<ChickenAction, Slots>
  keys2: Record<ChickenAction, Slots>
  pad: Record<ChickenAction, Slots>
  touch: ChickenTouchMode
  touchRunGrab: boolean
  // the Pátio on a touch screen: a finger on the scene aims there and fires, a quick tap also walks her there and a
  // tap on what Pegar offers takes it (Tela serve como mira); and whether the on-screen aim stick shows
  touchScreenAim: boolean
  touchAimStick: boolean
  sound: boolean
  analog: ChickenAnalog
  inventory: ChickenInventoryControls
  wheel: ChickenWheel
  harp: Record<ChickenInputType, Record<HarpAction, Slots>>
  variations: ChickenVariations
}

// The item-switching actions that may also go through the held item's variations (an instrument's scales, a weapon's
// tambores, a utility's types) before the next item: the small checkbox after each one's name in Controles. All off by
// default: the switch goes straight to the next item, and Próxima variação is the way to the variations.
export type VariationAction = 'nextItem' | 'prevItem' | 'nextInstrument' | 'nextWeapon' | 'nextUtility'
export type ChickenVariations = Record<VariationAction, boolean>
export const VARIATION_ACTIONS: { key: VariationAction; label: string }[] = [
  { key: 'nextItem', label: msg('Incluir variações') }, { key: 'prevItem', label: msg('Incluir variações') },
  { key: 'nextInstrument', label: msg('Incluir escalas') }, { key: 'nextWeapon', label: msg('Incluir tambores') }, { key: 'nextUtility', label: msg('Incluir tipos') },
]
export const DEFAULT_VARIATIONS: ChickenVariations = { nextItem: false, prevItem: false, nextInstrument: false, nextWeapon: false, nextUtility: false }
const variationsOf = (raw: unknown, fallback: ChickenVariations): ChickenVariations => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return Object.fromEntries(VARIATION_ACTIONS.map(({ key }) => [key, typeof r[key] === 'boolean' ? r[key] : fallback[key]])) as ChickenVariations
}

// Inventário: the repeat of the item switches while held (seconds) and where the first player's big bar sits at the
// bottom of the screen: split (instruments on the left, weapons and utilities on the right; the default), centred,
// all on the left or all on the right (components/pigchicken/draw/hud.ts → invGeom)
export type InventoryAlign = 'split' | 'center' | 'left' | 'right'
export const INVENTORY_ALIGNS: { value: InventoryAlign; label: string }[] = [
  { value: 'center', label: msg('Centralizado') }, { value: 'split', label: msg('Separado') }, { value: 'left', label: msg('Esquerda') }, { value: 'right', label: msg('Direita') },
]
export type ChickenInventoryControls = { repeatDelay: number; repeatInterval: number; align: InventoryAlign }
export const DEFAULT_INVENTORY: ChickenInventoryControls = { repeatDelay: 1.5, repeatInterval: 0.3, align: 'split' }
const isInventoryAlign = (v: unknown): v is InventoryAlign => INVENTORY_ALIGNS.some(a => a.value === v)
const inventoryOf = (raw: unknown, fallback: ChickenInventoryControls): ChickenInventoryControls => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    repeatDelay: num(r.repeatDelay, 0.2, 5, fallback.repeatDelay), repeatInterval: num(r.repeatInterval, 0.1, 2, fallback.repeatInterval),
    align: isInventoryAlign(r.align) ? r.align : fallback.align,
  }
}

// The Harpa's own binds (a fixed instrument: sitting there she does not walk), edited apart from the actions above in
// Controles → Instrumentos. They may reuse keys and buttons of the movement and of the other actions: a key here never
// leaves the action that also has it. Read by components/pigchicken/parquinho.tsx (lib/pigchicken/instrument-binds.ts)
export type HarpAction = 'sharp'
export const HARP_ACTIONS: { key: HarpAction; label: string; keys: Slots; keys2: Slots; pad: Slots }[] = [
  { key: 'sharp', label: msg('Sustenido (segurar)'), keys: ['Key:ShiftLeft', null, null], keys2: ['Key:ShiftRight', null], pad: ['Pad:b10', null, null] },
]
const harpOf = (raw: unknown, fallback: ChickenControls['harp']): ChickenControls['harp'] => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, Record<string, unknown> | undefined>
  const out = {} as ChickenControls['harp']
  CHICKEN_INPUT_TYPES.forEach(t => {
    out[t.id] = {} as Record<HarpAction, Slots>
    HARP_ACTIONS.forEach(a => { out[t.id][a.key] = slots(r[t.id]?.[a.key], fallback[t.id][a.key], t.device === 'gamepad' ? 'Pad:' : 'Key:', t.slots) })
  })
  return out
}

// The mouse wheel: the action each direction does (null: none). By default up is Próximo item and down Item anterior;
// in the Controles panel each one can be dragged to any action, as one more bind of it (the Pátio reads it)
export type ChickenWheel = { up: ChickenAction | null; down: ChickenAction | null }
export const DEFAULT_WHEEL: ChickenWheel = { up: 'nextItem', down: 'prevItem' }
const isAction = (v: unknown): v is ChickenAction => typeof v === 'string' && CHICKEN_ACTIONS.some(a => a.key === v)
const wheelOf = (raw: unknown, fallback: ChickenWheel): ChickenWheel => {
  const w = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const dir = (v: unknown, d: ChickenAction | null) => v === null ? null : isAction(v) ? v : d
  return { up: dir(w.up, fallback.up), down: dir(w.down, fallback.down) }
}

const STORE = 'chickenchess-chicken-controls-v1'
// The secondary-keyboard keys of 03/11: controls saved before keys2 existed lose these from the primary keyboard
const LEGACY_KEYS2 = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ControlRight', 'PageDown', 'PageUp', 'ShiftRight', 'Insert', 'Home', 'End', 'Delete', 'Backslash', 'Slash', 'Backspace']
const EVENT = 'chickenchess-chicken-controls'
const GROUP_ACTIONS: ChickenAction[] = ['nextInstrument', 'nextWeapon', 'nextUtility']

const num = (v: unknown, lo: number, hi: number, d: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d
const isTouchMode = (v: unknown): v is ChickenTouchMode => v === 'on' || v === 'off' || v === 'auto'

function codeDefaultChickenControls(): ChickenControls {
  const keys = {} as ChickenControls['keys'], keys2 = {} as ChickenControls['keys2'], pad = {} as ChickenControls['pad']
  CHICKEN_ACTIONS.forEach(a => { keys[a.key] = a.keys.slice(); keys2[a.key] = a.keys2.slice(); pad[a.key] = a.pad.slice() })
  const harp = Object.fromEntries(CHICKEN_INPUT_TYPES.map(t => [t.id, Object.fromEntries(HARP_ACTIONS.map(a => [a.key, a[t.id].slice()]))])) as ChickenControls['harp']
  return { keys, keys2, pad, touch: 'auto', touchRunGrab: true, touchScreenAim: true, touchAimStick: false, sound: true, analog: { ...DEFAULT_ANALOG }, inventory: { ...DEFAULT_INVENTORY }, wheel: { ...DEFAULT_WHEEL }, harp, variations: { ...DEFAULT_VARIATIONS } }
}

/** The game's default controls: the defaults file over the code fallback (a missing or invalid field keeps the code's). */
export function defaultChickenControls(): ChickenControls {
  const base = codeDefaultChickenControls()
  const file = gameDefault('controls', DEFAULTS_FILE) as Record<string, unknown> & { [type: string]: unknown }
  CHICKEN_INPUT_TYPES.forEach(t => {
    const binds = file?.[t.id] as Record<string, unknown> | undefined
    CHICKEN_ACTIONS.forEach(a => {
      if (Array.isArray(binds?.[a.key])) base[t.id][a.key] = slots(binds[a.key], base[t.id][a.key], t.device === 'gamepad' ? 'Pad:' : 'Key:', t.slots)
    })
  })
  if (isTouchMode(file?.touch)) base.touch = file.touch
  if (typeof file?.touchRunGrab === 'boolean') base.touchRunGrab = file.touchRunGrab
  if (typeof file?.touchScreenAim === 'boolean') base.touchScreenAim = file.touchScreenAim
  if (typeof file?.touchAimStick === 'boolean') base.touchAimStick = file.touchAimStick
  if (typeof file?.sound === 'boolean') base.sound = file.sound
  const an = (file?.analog ?? {}) as Partial<ChickenAnalog>, d = base.analog
  const magnetDeg = num(an.magnetDeg, 0, 22.5, d.magnetDeg)
  base.analog = {
    deadzoneL: num(an.deadzoneL, 0, 0.9, d.deadzoneL), deadzoneR: num(an.deadzoneR, 0, 0.9, d.deadzoneR),
    magnet: magnetDeg > 0, magnetDeg, magnetRestoreDeg: num(an.magnetRestoreDeg, .5, 22.5, d.magnetRestoreDeg), aimMagnetDeg: num(an.aimMagnetDeg, 0, 22.5, d.aimMagnetDeg), slowWalk: num(an.slowWalk, 0.1, 1, d.slowWalk),
  }
  base.inventory = inventoryOf(file?.inventory, base.inventory)
  base.wheel = wheelOf(file?.wheel, base.wheel)
  base.harp = harpOf(file?.harp, base.harp)
  base.variations = variationsOf(file?.variations, base.variations)
  return base
}

/** The defaults file's content for a set of controls (what "Salvar no game" writes). */
export function chickenControlsDefaultsFile(c: ChickenControls) {
  const pick = (type: ChickenInputType) => Object.fromEntries(CHICKEN_ACTIONS.map(a => [a.key, c[type][a.key].slice()]))
  return { keys: pick('keys'), keys2: pick('keys2'), pad: pick('pad'), touch: c.touch, touchRunGrab: c.touchRunGrab, touchScreenAim: c.touchScreenAim, touchAimStick: c.touchAimStick, sound: c.sound, analog: { ...c.analog }, inventory: { ...c.inventory }, wheel: { ...c.wheel }, harp: harpOf(c.harp, c.harp), variations: { ...c.variations } }
}

// The binds of one action on one input type (the players panel reads a player's inputs through this)
export const chickenBinds = (controls: ChickenControls, type: ChickenInputType, action: ChickenAction): Slots => controls[type][action]

const slots = (raw: unknown, fallback: Slots, prefix: string, n = 3): Slots => {
  if (!Array.isArray(raw)) return fallback.slice()
  return Array.from({ length: n }, (_, i) => i).map(i => typeof raw[i] === 'string' && raw[i].startsWith(prefix) ? raw[i] : null)
}

export function loadChickenControls(): ChickenControls {
  const base = defaultChickenControls()
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(STORE)
    if (!raw) return base
    const saved = JSON.parse(raw)
    CHICKEN_ACTIONS.forEach(a => {
      base.keys[a.key] = slots(saved?.keys?.[a.key], base.keys[a.key], 'Key:')
      base.pad[a.key] = slots(saved?.pad?.[a.key], base.pad[a.key], 'Pad:')
    })
    if (!saved?.keyboardJumpZ && !Array.isArray(saved?.keys?.jump)) base.keys.jump = ['Key:Space', null, null]
    // the group binds (09/11) start empty on controls saved before them: the migration at the end gives them their
    // keys only where those are free, after the older migrations have settled
    if (!saved?.inventoryGroupBinds) GROUP_ACTIONS.forEach(a => {
      if (!Array.isArray(saved?.keys?.[a])) base.keys[a] = [null, null, null]
      if (!Array.isArray(saved?.pad?.[a])) base.pad[a] = [null, null, null]
    })
    // the Gaiolas' binds (15/11) start empty too on controls saved before them, so the older migrations see the
    // buttons they move as free; the migration at the end gives them their keys
    if (!saved?.cageBinds) (['cageRelease', 'cageSwap'] as const).forEach(a => {
      if (!Array.isArray(saved?.keys?.[a])) base.keys[a] = [null, null, null]
      if (!Array.isArray(saved?.pad?.[a])) base.pad[a] = [null, null, null]
    })
    // Próxima variação (18/11) starts empty on controls saved before it; the migration at the end gives it Q
    if (!saved?.variationBind && !Array.isArray(saved?.keys?.nextVariation)) base.keys.nextVariation = [null, null, null]
    // Add the new default only after legacy Throw migrations have freed F.
    if (!Array.isArray(saved?.keys?.deselectItem)) base.keys.deselectItem = [null, null, null]
    if (isTouchMode(saved?.touch)) base.touch = saved.touch
    if (typeof saved?.touchRunGrab === 'boolean') base.touchRunGrab = saved.touchRunGrab
    if (typeof saved?.touchScreenAim === 'boolean') base.touchScreenAim = saved.touchScreenAim
    if (typeof saved?.touchAimStick === 'boolean') base.touchAimStick = saved.touchAimStick
    if (typeof saved?.sound === 'boolean') base.sound = saved.sound
    base.wheel = wheelOf(saved?.wheel, base.wheel)
    base.harp = harpOf(saved?.harp, base.harp)
    base.variations = variationsOf(saved?.variations, base.variations)
    const an = saved?.analog ?? {}
    const savedMagnet = num(an.magnetDeg, 0, 22.5, an.magnet === true ? 12 : 0)
    const movementMagnet = an.magnet === false ? 0 : savedMagnet
    // a save without analog settings keeps the defaults file's
    if (saved?.analog && typeof saved.analog === 'object') base.analog = {
      deadzoneL: num(an.deadzoneL, 0, 0.9, base.analog.deadzoneL), deadzoneR: num(an.deadzoneR, 0, 0.9, base.analog.deadzoneR),
      magnet: movementMagnet > 0, magnetDeg: movementMagnet, magnetRestoreDeg: num(an.magnetRestoreDeg, .5, 22.5, savedMagnet > 0 ? savedMagnet : 12), aimMagnetDeg: num(an.aimMagnetDeg, 0, 22.5, 0), slowWalk: num(an.slowWalk, 0.1, 1, base.analog.slowWalk),
    }
    base.inventory = inventoryOf(saved?.inventory, base.inventory)
    // controls saved before X became run (01/11): X leaves brood and takes RB's place in run
    if (!saved?.padXRun) {
      base.pad.down = base.pad.down.map(t => t === 'Pad:b2' ? null : t)
      if (!base.pad.run.includes('Pad:b2')) {
        const rb = base.pad.run.indexOf('Pad:b5'), free = base.pad.run.indexOf(null)
        const at = rb >= 0 ? rb : free
        if (at >= 0) base.pad.run[at] = 'Pad:b2'
      }
    }
    // controls saved before the items: the item buttons leave the movement actions (run goes to X, brood keeps B)
    if (!saved?.itemsV1) {
      const taken = new Set(CHICKEN_ACTIONS.filter(a => a.group === 'items' && a.key !== 'grab').flatMap(a => [...a.keys, ...a.pad]).filter(Boolean) as string[])
      CHICKEN_ACTIONS.filter(a => !a.group).forEach(a => {
        base.keys[a.key] = base.keys[a.key].map(t => t && taken.has(t) ? null : t)
        base.pad[a.key] = base.pad[a.key].map(t => t && taken.has(t) ? null : t)
      })
      if (!base.pad.run.some(Boolean)) {
        base.pad.down = base.pad.down.map(t => t === 'Pad:b2' ? null : t)
        base.pad.run = ['Pad:b2', null, null]
      }
    }
    // controls saved before brood got LT too (01/11): LT joins B on brood (B stays; it comes back if it was taken off)
    if (!saved?.broodLTB) {
      const add = (btn: string) => {
        if (base.pad.down.includes(btn)) return
        if (CHICKEN_ACTIONS.some(a => a.key !== 'down' && base.pad[a.key].includes(btn))) return
        const free = base.pad.down.indexOf(null)
        if (free >= 0) base.pad.down[free] = btn
      }
      add('Pad:b6'); add('Pad:b1')
    }
    // controls saved before E became grab (01/11): Q goes to next item and E leaves it
    if (!saved?.grabE) {
      if (base.keys.nextItem.includes('Key:KeyE')) base.keys.nextItem = base.keys.nextItem.map(t => t === 'Key:KeyE' ? 'Key:KeyQ' : t)
      base.keys.prevItem = base.keys.prevItem.map(t => t === 'Key:KeyQ' && base.keys.nextItem.includes('Key:KeyQ') ? null : t)
    }
    // controls saved before F became throw (02/11): V on throw turns into F, unless F is taken
    if (!saved?.throwF && base.keys.throw.includes('Key:KeyV') && !CHICKEN_ACTIONS.some(a => base.keys[a.key].includes('Key:KeyF'))) {
      base.keys.throw = base.keys.throw.map(t => t === 'Key:KeyV' ? 'Key:KeyF' : t)
    }
    // controls saved before the secondary keyboard (03/11): the arrows and Shift dir. leave the primary keyboard for
    // the new keys2 column, and V / B join fire / melee where they are free
    if (!saved?.keys2) {
      const moved = new Set(LEGACY_KEYS2.map(k => `Key:${k}`))
      CHICKEN_ACTIONS.forEach(a => { base.keys[a.key] = base.keys[a.key].map(t => t && moved.has(t) ? null : t) })
      const addKey = (action: ChickenAction, tok: string) => {
        if (CHICKEN_ACTIONS.some(a => base.keys[a.key].includes(tok))) return
        const free = base.keys[action].indexOf(null)
        if (free >= 0) base.keys[action][free] = tok
      }
      addKey('fire', 'Key:KeyV'); addKey('melee', 'Key:KeyB')
    } else {
      CHICKEN_ACTIONS.forEach(a => { base.keys2[a.key] = slots(saved?.keys2?.[a.key], base.keys2[a.key], 'Key:', CHICKEN_INPUT_TYPES.find(t => t.id === 'keys2')!.slots) })
      if (!saved?.cageBinds) (['cageRelease', 'cageSwap'] as const).forEach(a => { if (!Array.isArray(saved?.keys2?.[a])) base.keys2[a] = [null, null] })
      // controls saved before the secondary keyboard could grab (03/11): / takes grab there, if it is free
      if (!saved?.grabKeys2 && !base.keys2.grab.some(Boolean) && !CHICKEN_ACTIONS.some(a => base.keys[a.key].includes('Key:Slash') || base.keys2[a.key].includes('Key:Slash'))) base.keys2.grab[0] = 'Key:Slash'
      // right-hand punctuation (08/11): / broods, P grabs, ' goes back an item, and ] [ ; \ join fire / melee / jump /
      // throw as second keys; the freed down arrow becomes crouch's second key. Each action moves only while it is still on the previous default, and a key
      // only enters an action if nothing else (on either keyboard) holds it.
      if (!saved?.keys2Punctuation) {
        const k2 = base.keys2
        const is = (action: ChickenAction, toks: Slots) => k2[action].length === toks.length && toks.every((t, i) => k2[action][i] === t)
        const held = (tok: string, except: ChickenAction) => CHICKEN_ACTIONS.some(a => a.key !== except && (base.keys[a.key].includes(tok) || k2[a.key].includes(tok)))
        if (is('grab', ['Key:Slash', null]) && !held('Key:KeyP', 'grab')) k2.grab = ['Key:KeyP', null]
        if (is('down', ['Key:ArrowDown', 'Key:ControlRight']) && !held('Key:Slash', 'down')) k2.down = ['Key:Slash', 'Key:ControlRight']
        if (is('prevItem', ['Key:Backslash', null]) && !held('Key:Quote', 'prevItem')) k2.prevItem = ['Key:Quote', null]
        const second = (action: ChickenAction, first: string, tok: string) => { if (is(action, [first, null]) && !held(tok, action)) k2[action] = [first, tok] }
        second('fire', 'Key:Insert', 'Key:BracketRight'); second('melee', 'Key:Home', 'Key:BracketLeft')
        second('jump', 'Key:PageUp', 'Key:Semicolon'); second('throw', 'Key:End', 'Key:Backslash')
        second('crouch', 'Key:PageDown', 'Key:ArrowDown')
      }
    }
    // 11/11: Del and Backspace leave the secondary keyboard (Del deletes in the Pátio editor): taken off Próximo item
    // and Recarregar once, wherever the player had them on the secondary keyboard
    if (!saved?.keys2NoDelBksp) CHICKEN_ACTIONS.forEach(a => { base.keys2[a.key] = base.keys2[a.key].map(t => t === 'Key:Delete' || t === 'Key:Backspace' ? null : t) })
    // Cmd esq. is no longer a brood key (03/11): controls that still have it on brood lose it (once)
    if (!saved?.noCmdBrood) KEYBOARD_INPUT_TYPES.forEach(k => { base[k].down = base[k].down.map(t => t === 'Key:MetaLeft' ? null : t) })
    // Migrate the old default trio once, leaving customized bindings intact.
    if (!saved?.padRunRBThrowY) {
      const only = (action: ChickenAction, token: string) => base.pad[action].filter(Boolean).length === 1 && base.pad[action].includes(token)
      const l3Taken = CHICKEN_ACTIONS.some(a => a.key !== 'melee' && base.pad[a.key].includes('Pad:b10'))
      if (only('run', 'Pad:b2') && only('throw', 'Pad:b5') && only('melee', 'Pad:b3') && !l3Taken) {
        base.pad.run = ['Pad:b5', null, null]; base.pad.throw = ['Pad:b3', null, null]; base.pad.melee = ['Pad:b10', null, null]
      }
    }
    // B is Melee now; remove its former Brood alias only for the previous default layout.
    if (!saved?.padMeleeB) {
      const only = (action: ChickenAction, token: string) => base.pad[action].filter(Boolean).length === 1 && base.pad[action].includes(token)
      const bTaken = CHICKEN_ACTIONS.some(a => a.key !== 'down' && a.key !== 'melee' && base.pad[a.key].includes('Pad:b1'))
      if ((only('run', 'Pad:b5') || (base.pad.run[0] === 'Pad:b5' && base.pad.run[1] === 'Pad:b2' && base.pad.run.filter(Boolean).length === 2)) && only('throw', 'Pad:b3') && only('melee', 'Pad:b10') && !bTaken) {
        base.pad.down = base.pad.down.map(t => t === 'Pad:b1' ? null : t)
        base.pad.melee = ['Pad:b1', null, null]
      }
    }
    // Stick-click shortcuts: A/R3 Jump, L3 wheel (Select removed), Menu reload.
    if (!saved?.padStickShortcuts) {
      const occupied = (token: string, except: ChickenAction[]) => CHICKEN_ACTIONS.some(a => !except.includes(a.key) && base.pad[a.key].includes(token))
      const oldReload = base.pad.reload.filter(Boolean).length === 1 && base.pad.reload.includes('Pad:b11')
      if (oldReload) base.pad.reload = [occupied('Pad:b9', ['reload']) ? null : 'Pad:b9', null, null]
      if (!occupied('Pad:b11', ['jump']) && !base.pad.jump.includes('Pad:b11')) {
        const free = base.pad.jump.indexOf(null)
        if (free >= 0) base.pad.jump[free] = 'Pad:b11'
      }
      if (base.pad.itemWheel.includes('Pad:b8')) {
        base.pad.itemWheel = base.pad.itemWheel.map(t => t === 'Pad:b8' ? null : t)
        if (!occupied('Pad:b10', ['itemWheel']) && !base.pad.itemWheel.includes('Pad:b10')) {
          const free = base.pad.itemWheel.indexOf(null)
          if (free >= 0) base.pad.itemWheel[free] = 'Pad:b10'
        }
      }
    }
    // Restore X as a secondary Run bind for the previous RB-only default.
    if (!saved?.padRunRBX && base.pad.run.filter(Boolean).length === 1 && base.pad.run.includes('Pad:b5')) {
      base.pad.run = ['Pad:b5', 'Pad:b2', null]
    }
    // Adopt the new keyboard defaults once; preserve custom bindings.
    if (!saved?.keyboardThrowG) {
      const oldThrow = base.keys.throw.filter(Boolean)
      if (oldThrow.length && oldThrow.every(t => t === 'Key:KeyF' || t === 'Key:KeyG')) base.keys.throw = ['Key:KeyG', null, null]
    }
    if (!saved?.keyboardInventoryQ) {
      const onlyKey = (action: ChickenAction, tok: string) => base.keys[action].filter(Boolean).length === 1 && base.keys[action].includes(tok)
      if (onlyKey('nextItem', 'Key:KeyQ') && onlyKey('itemWheel', 'Key:Tab')) {
        base.keys.nextItem = ['Key:Tab', null, null]; base.keys.itemWheel = ['Key:KeyQ', null, null]
      }
    }
    // V fires, C strikes, X broods and Z throws (06/11): actions still on the previous defaults take the new ones;
    // a key goes to its new action only if nothing else holds it
    if (!saved?.keyboardVCXZ) {
      const is = (action: ChickenAction, toks: string[]) => { const on = base.keys[action].filter(Boolean); return on.length === toks.length && toks.every(t => on.includes(t)) }
      const held = (tok: string, except: ChickenAction) => CHICKEN_ACTIONS.some(a => a.key !== except && (base.keys[a.key].includes(tok) || base.keys2[a.key].includes(tok)))
      if (is('fire', ['Key:KeyX', 'Key:KeyV'])) base.keys.fire = ['Key:KeyV', null, null]
      if (is('crouch', ['Key:KeyS', 'Key:KeyC'])) base.keys.crouch = ['Key:KeyS', null, null]
      if (is('melee', ['Key:KeyZ', 'Key:KeyB']) && !held('Key:KeyC', 'melee')) base.keys.melee = ['Key:KeyC', null, null]
      if (is('down', ['Key:ControlLeft']) && !held('Key:KeyX', 'down')) base.keys.down = ['Key:ControlLeft', 'Key:KeyX', null]
      if (is('throw', ['Key:KeyG']) && !held('Key:KeyZ', 'throw')) base.keys.throw = ['Key:KeyG', 'Key:KeyZ', null]
    }
    // Z moves from the old default Throw to the secondary Jump slot. Do not
    // remove a custom use of Z or replace a customized Jump configuration.
    if (!saved?.keyboardJumpZ) {
      const jump = base.keys.jump.filter(Boolean)
      const oldThrow = base.keys.throw.filter(Boolean)
      const defaultThrow = oldThrow.length === 2 && oldThrow.includes('Key:KeyG') && oldThrow.includes('Key:KeyZ')
      const occupiedElsewhere = CHICKEN_ACTIONS.some(a => a.key !== 'jump' && (a.key !== 'throw' || !defaultThrow) && base.keys[a.key].includes('Key:KeyZ')) || CHICKEN_ACTIONS.some(a => base.keys2[a.key].includes('Key:KeyZ'))
      if (jump.length === 1 && jump[0] === 'Key:Space' && !occupiedElsewhere) {
        if (defaultThrow) base.keys.throw = base.keys.throw.map(t => t === 'Key:KeyZ' ? null : t)
        base.keys.jump[1] = 'Key:KeyZ'
      }
    }
    if (!Array.isArray(saved?.keys?.deselectItem) && !CHICKEN_ACTIONS.some(a => base.keys[a.key].includes('Key:KeyF') || base.keys2[a.key].includes('Key:KeyF'))) {
      base.keys.deselectItem[0] = 'Key:KeyF'
    }
    // 08/11: Shift dir. also grabs on the secondary keyboard (as X on the gamepad: run + use / grab; Shift esq. left
    // Pegar on 20/11), LB goes back an item and RB goes forward (RB leaves Run, where X stays). Each action changes only
    // while it is still on the previous default.
    if (!saved?.shiftGrabLBRB) {
      const only = (list: Slots, toks: string[]) => { const on = list.filter(Boolean); return on.length === toks.length && toks.every(t => on.includes(t)) }
      const elsewhere = (tok: string, allow: ChickenAction[]) => CHICKEN_ACTIONS.some(a => !allow.includes(a.key) && (base.keys[a.key].includes(tok) || base.keys2[a.key].includes(tok)))
      const addSecond = (list: Slots, tok: string) => { const free = list.indexOf(null); if (free >= 0 && !list.includes(tok)) list[free] = tok }
      if (only(base.keys2.grab, ['Key:KeyP']) && !elsewhere('Key:ShiftRight', ['run', 'grab'])) addSecond(base.keys2.grab, 'Key:ShiftRight')
      const padHas = (tok: string, allow: ChickenAction[]) => CHICKEN_ACTIONS.some(a => !allow.includes(a.key) && base.pad[a.key].includes(tok))
      if (only(base.pad.nextItem, ['Pad:b4']) && !base.pad.prevItem.some(Boolean) && only(base.pad.run, ['Pad:b5', 'Pad:b2']) && !padHas('Pad:b5', ['run']) && !padHas('Pad:b4', ['nextItem'])) {
        base.pad.run = ['Pad:b2', null, null]; base.pad.nextItem = ['Pad:b5', null, null]; base.pad.prevItem = ['Pad:b4', null, null]
      }
    }
    // 09/11: the inventory groups get their own binds: Próximo instrumento (Tab, LB), Próxima arma (Q, RB) and Próximo
    // utilitário (F, Y). Próximo item / Item anterior leave Tab, RB and LB (the mouse wheel and the secondary keyboard
    // keep them), the wheel goes from Q to T, Deselecionar from F to B, and Arremessar on the gamepad from Y to R3
    // (which leaves Jump). Each action moves only while it is still on the previous default; a key or button only
    // enters a new action if nothing else holds it.
    if (!saved?.inventoryGroupBinds) {
      const only = (list: Slots, toks: string[]) => { const on = list.filter(Boolean); return on.length === toks.length && toks.every(t => on.includes(t)) }
      const keyHeld = (tok: string) => CHICKEN_ACTIONS.some(a => base.keys[a.key].includes(tok) || base.keys2[a.key].includes(tok))
      const padHeld = (tok: string) => CHICKEN_ACTIONS.some(a => base.pad[a.key].includes(tok))
      // keyboard
      if (only(base.keys.nextItem, ['Key:Tab'])) base.keys.nextItem = [null, null, null]
      if (only(base.keys.itemWheel, ['Key:KeyQ']) && !keyHeld('Key:KeyT')) base.keys.itemWheel = ['Key:KeyT', null, null]
      if (only(base.keys.deselectItem, ['Key:KeyF'])) base.keys.deselectItem = [keyHeld('Key:KeyB') ? null : 'Key:KeyB', null, null]
      const giveKey = (action: ChickenAction, tok: string) => { if (!Array.isArray(saved?.keys?.[action]) && !keyHeld(tok)) base.keys[action][0] = tok }
      giveKey('nextInstrument', 'Key:Tab'); giveKey('nextWeapon', 'Key:KeyQ'); giveKey('nextUtility', 'Key:KeyF')
      // gamepad
      if (only(base.pad.nextItem, ['Pad:b5']) && only(base.pad.prevItem, ['Pad:b4'])) { base.pad.nextItem = [null, null, null]; base.pad.prevItem = [null, null, null] }
      if (only(base.pad.throw, ['Pad:b3']) && only(base.pad.jump, ['Pad:b0', 'Pad:b11']) && !CHICKEN_ACTIONS.some(a => a.key !== 'jump' && a.key !== 'throw' && base.pad[a.key].includes('Pad:b11'))) {
        base.pad.jump = ['Pad:b0', null, null]; base.pad.throw = ['Pad:b11', null, null]
      }
      const givePad = (action: ChickenAction, tok: string) => { if (!Array.isArray(saved?.pad?.[action]) && !padHeld(tok)) base.pad[action][0] = tok }
      givePad('nextInstrument', 'Pad:b4'); givePad('nextWeapon', 'Pad:b5'); givePad('nextUtility', 'Pad:b3')
    }
    // 09/11: on the gamepad Y hits (Golpe) and B goes through the utilities, the other way round from the first
    // group binds. Only while Golpe is still on B alone and Próximo utilitário on Y alone (or without a button, Y free).
    if (!saved?.padMeleeY) {
      const only = (list: Slots, tok: string) => list.filter(Boolean).length === 1 && list.includes(tok)
      const yFree = !CHICKEN_ACTIONS.some(a => base.pad[a.key].includes('Pad:b3'))
      if (only(base.pad.melee, 'Pad:b1') && (only(base.pad.nextUtility, 'Pad:b3') || (!base.pad.nextUtility.some(Boolean) && yFree))) {
        base.pad.melee = ['Pad:b3', null, null]; base.pad.nextUtility = ['Pad:b1', null, null]
      }
    }
    // 09/11: the editing switch's bind (Alt, Cmd) on controls saved before it, only with keys nothing else holds
    if (!Array.isArray(saved?.keys?.editMode)) {
      const held = (tok: string | null) => !!tok && CHICKEN_ACTIONS.some(a => a.key !== 'editMode' && (base.keys[a.key].includes(tok) || base.keys2[a.key].includes(tok)))
      base.keys.editMode = base.keys.editMode.map(t => held(t) ? null : t)
    }
    // 15/11: the Gaiolas' binds. Soltar alma: H, End, L3; Trocar de gaiola: Y, Home. End and Home leave Arremessar and
    // Golpe on the secondary keyboard and L3 leaves the Roda do inventário, each only while still on the previous
    // default; a key or button only enters its new action if nothing else holds it.
    if (!saved?.cageBinds) {
      const only = (list: Slots, toks: string[]) => { const on = list.filter(Boolean); return on.length === toks.length && toks.every(t => on.includes(t)) }
      const keyHeld = (tok: string) => CHICKEN_ACTIONS.some(a => a.key !== 'cageRelease' && a.key !== 'cageSwap' && (base.keys[a.key].includes(tok) || base.keys2[a.key].includes(tok)))
      const padHeld = (tok: string) => CHICKEN_ACTIONS.some(a => a.key !== 'cageRelease' && a.key !== 'cageSwap' && base.pad[a.key].includes(tok))
      if (only(base.keys2.throw, ['Key:End', 'Key:Backslash'])) base.keys2.throw = ['Key:Backslash', null]
      if (only(base.keys2.melee, ['Key:Home', 'Key:BracketLeft'])) base.keys2.melee = ['Key:BracketLeft', null]
      if (only(base.pad.itemWheel, ['Pad:b10'])) base.pad.itemWheel = [null, null, null]
      base.keys.cageRelease = [keyHeld('Key:KeyH') ? null : 'Key:KeyH', null, null]; base.keys.cageSwap = [keyHeld('Key:KeyY') ? null : 'Key:KeyY', null, null]
      base.keys2.cageRelease = [keyHeld('Key:End') ? null : 'Key:End', null]; base.keys2.cageSwap = [keyHeld('Key:Home') ? null : 'Key:Home', null]
      base.pad.cageRelease = [padHeld('Pad:b10') ? null : 'Pad:b10', null, null]; base.pad.cageSwap = [null, null, null]
    }
    // 18/11: Próxima variação takes Q, which leaves Próxima arma (only while Próxima arma is still on Q alone; Q goes to
    // Próxima variação only if nothing else holds it)
    if (!saved?.variationBind) {
      const on = base.keys.nextWeapon.filter(Boolean)
      if (on.length === 1 && on[0] === 'Key:KeyQ') base.keys.nextWeapon = [null, null, null]
      const qHeld = CHICKEN_ACTIONS.some(a => base.keys[a.key].includes('Key:KeyQ') || base.keys2[a.key].includes('Key:KeyQ'))
      if (!Array.isArray(saved?.keys?.nextVariation) && !qHeld) base.keys.nextVariation = ['Key:KeyQ', null, null]
    }
    // 20/11: Shift esq. is no longer a default Pegar key (it stays on Correr): taken off Pegar once, only while Pegar is
    // still on the previous default (E + Shift esq.)
    if (!saved?.grabNoShiftLeft) {
      const on = base.keys.grab.filter(Boolean)
      if (on.length === 2 && on.includes('Key:KeyE') && on.includes('Key:ShiftLeft')) base.keys.grab = ['Key:KeyE', null, null]
    }
    // one key, one action, on one keyboard type: the primary keyboard wins
    const primary = new Set(CHICKEN_ACTIONS.flatMap(a => base.keys[a.key]).filter(Boolean) as string[])
    CHICKEN_ACTIONS.forEach(a => { base.keys2[a.key] = base.keys2[a.key].map(t => t && primary.has(t) ? null : t) })
  } catch { /* storage unavailable: defaults */ }
  return base
}

export function saveChickenControls(next: ChickenControls) {
  try { window.localStorage.setItem(STORE, JSON.stringify({ ...next, cageBinds: true, padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, keyboardVCXZ: true, keyboardJumpZ: true, grabKeys2: true, keys2Punctuation: true, noCmdBrood: true, shiftGrabLBRB: true, inventoryGroupBinds: true, padMeleeY: true, keys2NoDelBksp: true, variationBind: true, grabNoShiftLeft: true })) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribeChickenControls(onChange: (controls: ChickenControls) => void) {
  const handler = () => onChange(loadChickenControls())
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => { window.removeEventListener(EVENT, handler); window.removeEventListener('storage', handler) }
}

// While the panel waits for a key or button, the chicken ignores input.
let listening = false
export const isChickenControlsListening = () => listening
export const setChickenControlsListening = (value: boolean) => { listening = value }

const KEY_NAMES: Record<string, string> = { CapsLock: 'Caps Lock', AltLeft: msg('Alt/Option esq.'), AltRight: msg('Alt/Option dir.'), Space: msg('Espaço'), ShiftLeft: msg('Shift esq.'), ShiftRight: msg('Shift dir.'), ControlLeft: msg('Ctrl esq.'), ControlRight: msg('Ctrl dir.'), ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: 'Enter', Tab: 'Tab', Insert: 'Ins', Delete: 'Del', PageUp: 'PgUp', PageDown: 'PgDn', Backspace: 'Bksp', Backslash: '\\', Slash: '/', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", MetaLeft: msg('Cmd esq.'), MetaRight: msg('Cmd dir.') }
// The binds are stored by the standard gamepad layout (Pad:b0 = bottom face button ...), named after the Xbox pad by
// default; a PlayStation pad (Sony vendor 054c, or a DualShock / DualSense / PlayStation name in the browser's id)
// shows the same buttons with its own names. LS / RS are the left / right sticks for both.
export type PadStyle = 'xbox' | 'playstation'
const PAD_BUTTONS: Record<PadStyle, string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3', msg('Dir. ↑'), msg('Dir. ↓'), msg('Dir. ←'), msg('Dir. →'), 'Home'],
  playstation: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', msg('Dir. ↑'), msg('Dir. ↓'), msg('Dir. ←'), msg('Dir. →'), 'PS', 'Touchpad'],
}
export const PAD_STYLE_LABELS: Record<PadStyle, string> = { xbox: 'Xbox', playstation: 'PlayStation' }
// the browser's id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)" (Chrome, Safari),
// "054c-0ce6-Wireless Controller" (Firefox)
export const padStyleOfId = (id: string | null | undefined): PadStyle =>
  id && (/(^|[^0-9a-f])054c([^0-9a-f]|$)/i.test(id) || /playstation|dualshock|dualsense/i.test(id)) ? 'playstation' : 'xbox'
function connectedPad(index?: number) {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads()) : []
  return (index === undefined ? pads.find(g => g && g.connected) : pads[index]) ?? null
}
// the style of the gamepad at `index` (the first connected one when omitted); Xbox when there is none
export const padStyleAt = (index?: number): PadStyle => padStyleOfId(connectedPad(index)?.id)
const PAD_AXES = ['LS ←', 'LS →', 'LS ↑', 'LS ↓', 'RS ←', 'RS →', 'RS ↑', 'RS ↓']

let layoutNames: Map<string, string> | null = null
// Reads the keyboard layout once (Chromium only) so punctuation binds show their real character
export function loadKeyboardLayoutNames(): Promise<void> {
  const kb = typeof navigator !== 'undefined' ? (navigator as any).keyboard : null
  if (layoutNames || !kb?.getLayoutMap) return Promise.resolve()
  return kb.getLayoutMap().then((m: Map<string, string>) => { layoutNames = new Map(m) }).catch(() => {})
}

// `padStyle`: the names of the gamepad buttons (the first connected gamepad's when omitted)
export function chickenBindName(token: string | null, padStyle?: PadStyle) {
  if (!token) return '—'
  const value = token.slice(token.indexOf(':') + 1)
  if (token.startsWith('Pad:')) {
    if (value[0] === 'b') { const i = Number(value.slice(1)); return (PAD_BUTTONS[padStyle ?? padStyleAt()][i] ? tr(PAD_BUTTONS[padStyle ?? padStyleAt()][i]) : tr('Botão {n}', { n: i })) }
    const i = Number(value.slice(1, -1)), plus = value.endsWith('+')
    return PAD_AXES[i * 2 + (plus ? 1 : 0)] ?? tr('Eixo {n}', { n: `${i}${plus ? '+' : '−'}` })
  }
  // punctuation keys: event.code names the US position, so show what this keyboard's layout prints there
  // (on ABNT2 the US "\\" key is "]"); Chrome and Edge tell us, the others keep the US name
  if (layoutNames?.get(value) && !value.startsWith('Key') && !value.startsWith('Digit')) return layoutNames.get(value)!.toUpperCase()
  if (KEY_NAMES[value]) return tr(KEY_NAMES[value])
  if (value.startsWith('Key')) return value.slice(3)
  if (value.startsWith('Digit')) return value.slice(5)
  return value
}

// Every pressed button / pushed stick direction of the first connected gamepad, as tokens (Pad:b0, Pad:a1+ ...)
export function readGamepadTokens(deadzone = 0.4) {
  const on = new Set<string>()
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  const gp = Array.from(pads).find(g => g && g.connected)
  if (!gp) return on
  gp.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > 0.3)) on.add(`Pad:b${i}`) })
  gp.axes.forEach((v, i) => { if (v < -deadzone) on.add(`Pad:a${i}-`); else if (v > deadzone) on.add(`Pad:a${i}+`) })
  return on
}

// Analog value of a stick of the first connected gamepad (0 = left, 1 = right), with the dead zone removed and
// the rest rescaled so the push still goes from 0 to 1. Null when no gamepad or inside the dead zone.
export function readStick(stick: 0 | 1, deadzone: number): { x: number; y: number; mag: number } | null {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  const gp = Array.from(pads).find(g => g && g.connected)
  if (!gp) return null
  const x = gp.axes[stick * 2] ?? 0, y = gp.axes[stick * 2 + 1] ?? 0
  const len = Math.hypot(x, y)
  if (len <= deadzone || len === 0) return null
  const mag = Math.min(1, (len - deadzone) / Math.max(0.01, 1 - deadzone))
  return { x: x / len, y: y / len, mag }
}

// The on-screen left stick as an analog vector (the movement stick of the touch controls), so the aim can follow
// it in any direction. Same shape as readStick; null at rest or inside the dead zone.
let touchMove: { x: number; y: number; len: number } | null = null
export const setTouchMoveStick = (v: { x: number; y: number; len: number } | null) => { touchMove = v }
// how far the on-screen movement stick is pushed (0..1, dead zone included); null at rest
export const touchMoveExtent = () => touchMove ? touchMove.len : null
export function readTouchMoveStick(deadzone: number): { x: number; y: number; mag: number } | null {
  if (!touchMove || touchMove.len <= deadzone || touchMove.len === 0) return null
  const mag = Math.min(1, (touchMove.len - deadzone) / Math.max(0.01, 1 - deadzone))
  return { x: touchMove.x, y: touchMove.y, mag }
}

// Only the on-screen Run source also grabs; physical Run bindings keep their own behavior.
export function virtualActionHeld(active: Partial<Record<ChickenAction, boolean>>, action: ChickenAction, runGrab: boolean): boolean {
  return !!active[action] || (action === 'grab' && runGrab && !!active.run)
}
