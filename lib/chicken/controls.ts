// Player chicken controls: keyboard and gamepad bindings, on-screen (touch) controls and sound.
// One store for every screen, saved in this browser; the panel and the engine both read it.

export type ChickenAction = 'left' | 'right' | 'up' | 'down' | 'crouch' | 'jump' | 'run'
  // items (PigChicKen weapons and instruments); only the Parquinho acts on them for now
  | 'fire' | 'melee' | 'throw' | 'nextItem' | 'prevItem' | 'itemWheel' | 'reload' | 'grab' | 'deselectItem'
export type ChickenTouchMode = 'auto' | 'on' | 'off'
type Slots = (string | null)[]

// Input types: each one is a separate source of input that the players panel can hand to one local player.
// keys = primary keyboard (left hand, WASD), keys2 = secondary keyboard (right hand, arrows and the
// Insert/Home/Page Up block), pad = gamepad. A key belongs to one keyboard type and one action only.
export type ChickenInputType = 'keys' | 'keys2' | 'pad'
export const CHICKEN_INPUT_TYPES: { id: ChickenInputType; label: string; device: 'keyboard' | 'gamepad'; slots: number }[] = [
  { id: 'keys', label: 'Primary keyboard', device: 'keyboard', slots: 3 },
  { id: 'keys2', label: 'Secondary keyboard', device: 'keyboard', slots: 2 },
  { id: 'pad', label: 'Gamepad', device: 'gamepad', slots: 3 },
]
export const KEYBOARD_INPUT_TYPES: ChickenInputType[] = CHICKEN_INPUT_TYPES.filter(t => t.device === 'keyboard').map(t => t.id)

export const CHICKEN_ACTIONS: { key: ChickenAction; label: string; keys: Slots; keys2: Slots; pad: Slots; group?: 'items' }[] = [
  { key: 'left', label: 'Esquerda', keys: ['Key:KeyA', null, null], keys2: ['Key:ArrowLeft', null], pad: ['Pad:a0-', 'Pad:b14', null] },
  { key: 'right', label: 'Direita', keys: ['Key:KeyD', null, null], keys2: ['Key:ArrowRight', null], pad: ['Pad:a0+', 'Pad:b15', null] },
  { key: 'up', label: 'Olhar pra cima / subir', keys: ['Key:KeyW', null, null], keys2: ['Key:ArrowUp', null], pad: ['Pad:a1-', 'Pad:b12', null] },
  { key: 'down', label: 'Chocar / cair / travar mira', keys: ['Key:ControlLeft', null, null], keys2: ['Key:ArrowDown', 'Key:ControlRight'], pad: ['Pad:b6', null, null] },
  { key: 'crouch', label: 'Agachar / slide / super pulo', keys: ['Key:KeyS', 'Key:KeyC', null], keys2: ['Key:PageDown', null], pad: ['Pad:a1+', 'Pad:b13', null] },
  { key: 'jump', label: 'Pular / voar', keys: ['Key:Space', null, null], keys2: ['Key:PageUp', null], pad: ['Pad:b0', 'Pad:b11', null] },
  { key: 'run', label: 'Correr', keys: ['Key:ShiftLeft', null, null], keys2: ['Key:ShiftRight', null], pad: ['Pad:b5', 'Pad:b2', null] },
  // the mouse is fixed: left click fires, right click hits, the mouse wheel cycles items; 1 to 9 pick an item
  { key: 'fire', label: 'Atirar', keys: ['Key:KeyX', 'Key:KeyV', null], keys2: ['Key:Insert', null], pad: ['Pad:b7', null, null], group: 'items' },
  { key: 'melee', label: 'Golpe (melee)', keys: ['Key:KeyZ', 'Key:KeyB', null], keys2: ['Key:Home', null], pad: ['Pad:b1', null, null], group: 'items' },
  { key: 'throw', label: 'Arremessar item', keys: ['Key:KeyG', null, null], keys2: ['Key:End', null], pad: ['Pad:b3', null, null], group: 'items' },
  { key: 'nextItem', label: 'Próximo item', keys: ['Key:Tab', null, null], keys2: ['Key:Delete', null], pad: ['Pad:b4', null, null], group: 'items' },
  { key: 'deselectItem', label: 'Deselecionar item', keys: ['Key:KeyF', null, null], keys2: [null, null], pad: [null, null, null], group: 'items' },
  { key: 'prevItem', label: 'Item anterior', keys: [null, null, null], keys2: ['Key:Backslash', null], pad: [null, null, null], group: 'items' },
  // the inventory wheel stays open while held: aim at an item (mouse / right stick) and let go (or fire / jump / run)
  { key: 'itemWheel', label: 'Roda do inventário', keys: ['Key:KeyQ', null, null], keys2: [null, null], pad: ['Pad:b10', null, null], group: 'items' },
  // RB and X run; X also grabs while standing on an item. Y throws, B hits, LT broods.
  { key: 'grab', label: 'Pegar / trocar item', keys: ['Key:KeyE', null, null], keys2: ['Key:Slash', null], pad: ['Pad:b2', null, null], group: 'items' },
  { key: 'reload', label: 'Recarregar', keys: ['Key:KeyR', null, null], keys2: ['Key:Backspace', null], pad: ['Pad:b9', null, null], group: 'items' },
]

// Analog sticks: dead zones (0..0.9 of the travel) and the optional magnet that pulls the left stick's aim to 8 angles
export type ChickenAnalog = { deadzoneL: number; deadzoneR: number; magnet: boolean; magnetDeg: number }
export const DEFAULT_ANALOG: ChickenAnalog = { deadzoneL: 0.25, deadzoneR: 0.25, magnet: false, magnetDeg: 12 }

export type ChickenControls = {
  keys: Record<ChickenAction, Slots>
  keys2: Record<ChickenAction, Slots>
  pad: Record<ChickenAction, Slots>
  touch: ChickenTouchMode
  touchRunGrab: boolean
  sound: boolean
  analog: ChickenAnalog
}

const STORE = 'chickenchess-chicken-controls-v1'
const EVENT = 'chickenchess-chicken-controls'

export function defaultChickenControls(): ChickenControls {
  const keys = {} as ChickenControls['keys'], keys2 = {} as ChickenControls['keys2'], pad = {} as ChickenControls['pad']
  CHICKEN_ACTIONS.forEach(a => { keys[a.key] = a.keys.slice(); keys2[a.key] = a.keys2.slice(); pad[a.key] = a.pad.slice() })
  return { keys, keys2, pad, touch: 'auto', touchRunGrab: true, sound: true, analog: { ...DEFAULT_ANALOG } }
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
      base.keys[a.key] = slots(saved?.keys?.[a.key], a.keys, 'Key:')
      base.pad[a.key] = slots(saved?.pad?.[a.key], a.pad, 'Pad:')
    })
    // Add the new default only after legacy Throw migrations have freed F.
    if (!Array.isArray(saved?.keys?.deselectItem)) base.keys.deselectItem = [null, null, null]
    if (saved?.touch === 'on' || saved?.touch === 'off' || saved?.touch === 'auto') base.touch = saved.touch
    if (typeof saved?.touchRunGrab === 'boolean') base.touchRunGrab = saved.touchRunGrab
    if (typeof saved?.sound === 'boolean') base.sound = saved.sound
    const num = (v: unknown, lo: number, hi: number, d: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d
    const an = saved?.analog ?? {}
    base.analog = {
      deadzoneL: num(an.deadzoneL, 0, 0.9, DEFAULT_ANALOG.deadzoneL), deadzoneR: num(an.deadzoneR, 0, 0.9, DEFAULT_ANALOG.deadzoneR),
      magnet: typeof an.magnet === 'boolean' ? an.magnet : DEFAULT_ANALOG.magnet, magnetDeg: num(an.magnetDeg, 1, 22.5, DEFAULT_ANALOG.magnetDeg),
    }
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
      const moved = new Set(CHICKEN_ACTIONS.flatMap(a => a.keys2).filter(Boolean) as string[])
      CHICKEN_ACTIONS.forEach(a => { base.keys[a.key] = base.keys[a.key].map(t => t && moved.has(t) ? null : t) })
      const addKey = (action: ChickenAction, tok: string) => {
        if (CHICKEN_ACTIONS.some(a => base.keys[a.key].includes(tok))) return
        const free = base.keys[action].indexOf(null)
        if (free >= 0) base.keys[action][free] = tok
      }
      addKey('fire', 'Key:KeyV'); addKey('melee', 'Key:KeyB')
    } else {
      CHICKEN_ACTIONS.forEach(a => { base.keys2[a.key] = slots(saved?.keys2?.[a.key], a.keys2, 'Key:', CHICKEN_INPUT_TYPES.find(t => t.id === 'keys2')!.slots) })
      // controls saved before the secondary keyboard could grab (03/11): / takes grab there, if it is free
      if (!saved?.grabKeys2 && !base.keys2.grab.some(Boolean) && !CHICKEN_ACTIONS.some(a => base.keys[a.key].includes('Key:Slash') || base.keys2[a.key].includes('Key:Slash'))) base.keys2.grab[0] = 'Key:Slash'
    }
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
    if (!Array.isArray(saved?.keys?.deselectItem) && !CHICKEN_ACTIONS.some(a => base.keys[a.key].includes('Key:KeyF') || base.keys2[a.key].includes('Key:KeyF'))) {
      base.keys.deselectItem[0] = 'Key:KeyF'
    }
    // one key, one action, on one keyboard type: the primary keyboard wins
    const primary = new Set(CHICKEN_ACTIONS.flatMap(a => base.keys[a.key]).filter(Boolean) as string[])
    CHICKEN_ACTIONS.forEach(a => { base.keys2[a.key] = base.keys2[a.key].map(t => t && primary.has(t) ? null : t) })
  } catch { /* storage unavailable: defaults */ }
  return base
}

export function saveChickenControls(next: ChickenControls) {
  try { window.localStorage.setItem(STORE, JSON.stringify({ ...next, padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, grabKeys2: true, noCmdBrood: true })) } catch { /* ignore */ }
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

const KEY_NAMES: Record<string, string> = { CapsLock: 'Caps Lock', AltLeft: 'Alt/Option esq.', AltRight: 'Alt/Option dir.', Space: 'Espaço', ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: 'Enter', Tab: 'Tab', Insert: 'Ins', Delete: 'Del', PageUp: 'PgUp', PageDown: 'PgDn', Backspace: 'Bksp', Backslash: '\\', Slash: '/', MetaLeft: 'Cmd esq.', MetaRight: 'Cmd dir.' }
// Xbox names; LS / RS are the left / right sticks
const PAD_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3', 'Dir. ↑', 'Dir. ↓', 'Dir. ←', 'Dir. →', 'Home']
const PAD_AXES = ['LS ←', 'LS →', 'LS ↑', 'LS ↓', 'RS ←', 'RS →', 'RS ↑', 'RS ↓']

let layoutNames: Map<string, string> | null = null
// Reads the keyboard layout once (Chromium only) so punctuation binds show their real character
export function loadKeyboardLayoutNames(): Promise<void> {
  const kb = typeof navigator !== 'undefined' ? (navigator as any).keyboard : null
  if (layoutNames || !kb?.getLayoutMap) return Promise.resolve()
  return kb.getLayoutMap().then((m: Map<string, string>) => { layoutNames = new Map(m) }).catch(() => {})
}

export function chickenBindName(token: string | null) {
  if (!token) return '—'
  const value = token.slice(token.indexOf(':') + 1)
  if (token.startsWith('Pad:')) {
    if (value[0] === 'b') { const i = Number(value.slice(1)); return PAD_BUTTONS[i] ?? `Botão ${i}` }
    const i = Number(value.slice(1, -1)), plus = value.endsWith('+')
    return PAD_AXES[i * 2 + (plus ? 1 : 0)] ?? `Eixo ${i}${plus ? '+' : '−'}`
  }
  // punctuation keys: event.code names the US position, so show what this keyboard's layout prints there
  // (on ABNT2 the US "\\" key is "]"); Chrome and Edge tell us, the others keep the US name
  if (layoutNames?.get(value) && !value.startsWith('Key') && !value.startsWith('Digit')) return layoutNames.get(value)!.toUpperCase()
  if (KEY_NAMES[value]) return KEY_NAMES[value]
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
export function readTouchMoveStick(deadzone: number): { x: number; y: number; mag: number } | null {
  if (!touchMove || touchMove.len <= deadzone || touchMove.len === 0) return null
  const mag = Math.min(1, (touchMove.len - deadzone) / Math.max(0.01, 1 - deadzone))
  return { x: touchMove.x, y: touchMove.y, mag }
}

// Only the on-screen Run source also grabs; physical Run bindings keep their own behavior.
export function virtualActionHeld(active: Partial<Record<ChickenAction, boolean>>, action: ChickenAction, runGrab: boolean): boolean {
  return !!active[action] || (action === 'grab' && runGrab && !!active.run)
}
