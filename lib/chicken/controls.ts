// Player chicken controls: keyboard and gamepad bindings, on-screen (touch) controls and sound.
// One store for every screen, saved in this browser; the panel and the engine both read it.

export type ChickenAction = 'left' | 'right' | 'up' | 'down' | 'crouch' | 'jump' | 'run'
  // items (PigChicKen weapons and instruments); only the Parquinho acts on them for now
  | 'fire' | 'melee' | 'throw' | 'nextItem' | 'prevItem' | 'itemWheel' | 'reload' | 'grab'
export type ChickenTouchMode = 'auto' | 'on' | 'off'
type Slots = (string | null)[]

export const CHICKEN_ACTIONS: { key: ChickenAction; label: string; keys: Slots; pad: Slots; group?: 'items' }[] = [
  { key: 'left', label: 'Esquerda', keys: ['Key:KeyA', 'Key:ArrowLeft', null], pad: ['Pad:a0-', 'Pad:b14', null] },
  { key: 'right', label: 'Direita', keys: ['Key:KeyD', 'Key:ArrowRight', null], pad: ['Pad:a0+', 'Pad:b15', null] },
  { key: 'up', label: 'Olhar pra cima / subir', keys: ['Key:KeyW', 'Key:ArrowUp', null], pad: ['Pad:a1-', 'Pad:b12', null] },
  { key: 'down', label: 'Chocar / cair / travar mira (com item)', keys: ['Key:ControlLeft', 'Key:ArrowDown', null], pad: ['Pad:b6', 'Pad:b1', null] },
  { key: 'crouch', label: 'Agachar / slide / super pulo', keys: ['Key:KeyS', 'Key:KeyC', null], pad: ['Pad:a1+', 'Pad:b13', null] },
  { key: 'jump', label: 'Pular / voar', keys: ['Key:Space', null, null], pad: ['Pad:b0', null, null] },
  { key: 'run', label: 'Correr', keys: ['Key:ShiftLeft', 'Key:ShiftRight', null], pad: ['Pad:b2', null, null] },
  // the mouse is fixed: left click fires, right click hits, the mouse wheel cycles items; 1 to 9 pick an item
  { key: 'fire', label: 'Atirar', keys: ['Key:KeyX', null, null], pad: ['Pad:b7', null, null], group: 'items' },
  { key: 'melee', label: 'Golpe (melee)', keys: ['Key:KeyZ', null, null], pad: ['Pad:b3', null, null], group: 'items' },
  { key: 'throw', label: 'Arremessar item (segure p/ força)', keys: ['Key:KeyF', 'Key:KeyG', null], pad: ['Pad:b5', null, null], group: 'items' },
  { key: 'nextItem', label: 'Próximo item', keys: ['Key:KeyQ', null, null], pad: ['Pad:b4', null, null], group: 'items' },
  { key: 'prevItem', label: 'Item anterior', keys: [null, null, null], pad: [null, null, null], group: 'items' },
  // hold to open the inventory wheel, aim at an item (mouse / right stick) and let go; a quick tap leaves it open
  { key: 'itemWheel', label: 'Roda do inventário (segure e solte no item)', keys: ['Key:Tab', null, null], pad: ['Pad:b8', null, null], group: 'items' },
  // X on the gamepad also runs: grabbing only acts while she stands on an item
  { key: 'grab', label: 'Pegar / trocar item (em cima dele)', keys: ['Key:KeyE', null, null], pad: ['Pad:b2', null, null], group: 'items' },
  { key: 'reload', label: 'Recarregar', keys: ['Key:KeyR', null, null], pad: ['Pad:b11', null, null], group: 'items' },
]

// Analog sticks: dead zones (0..0.9 of the travel) and the optional magnet that pulls the left stick's aim to 8 angles
export type ChickenAnalog = { deadzoneL: number; deadzoneR: number; magnet: boolean; magnetDeg: number }
export const DEFAULT_ANALOG: ChickenAnalog = { deadzoneL: 0.25, deadzoneR: 0.25, magnet: false, magnetDeg: 12 }

export type ChickenControls = {
  keys: Record<ChickenAction, Slots>
  pad: Record<ChickenAction, Slots>
  touch: ChickenTouchMode
  sound: boolean
  analog: ChickenAnalog
}

const STORE = 'chickenchess-chicken-controls-v1'
const EVENT = 'chickenchess-chicken-controls'

export function defaultChickenControls(): ChickenControls {
  const keys = {} as ChickenControls['keys'], pad = {} as ChickenControls['pad']
  CHICKEN_ACTIONS.forEach(a => { keys[a.key] = a.keys.slice(); pad[a.key] = a.pad.slice() })
  return { keys, pad, touch: 'auto', sound: true, analog: { ...DEFAULT_ANALOG } }
}

const slots = (raw: unknown, fallback: Slots, prefix: string): Slots => {
  if (!Array.isArray(raw)) return fallback.slice()
  return [0, 1, 2].map(i => typeof raw[i] === 'string' && raw[i].startsWith(prefix) ? raw[i] : null)
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
    if (saved?.touch === 'on' || saved?.touch === 'off' || saved?.touch === 'auto') base.touch = saved.touch
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
  } catch { /* storage unavailable: defaults */ }
  return base
}

export function saveChickenControls(next: ChickenControls) {
  try { window.localStorage.setItem(STORE, JSON.stringify({ ...next, padX: true, padXRun: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true })) } catch { /* ignore */ }
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

const KEY_NAMES: Record<string, string> = { CapsLock: 'Caps Lock', AltLeft: 'Alt/Option esq.', AltRight: 'Alt/Option dir.', Space: 'Espaço', ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: 'Enter', Tab: 'Tab' }
// Xbox names; LS / RS are the left / right sticks
const PAD_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3', 'Dir. ↑', 'Dir. ↓', 'Dir. ←', 'Dir. →', 'Home']
const PAD_AXES = ['LS ←', 'LS →', 'LS ↑', 'LS ↓', 'RS ←', 'RS →', 'RS ↑', 'RS ↓']

export function chickenBindName(token: string | null) {
  if (!token) return '—'
  const value = token.slice(token.indexOf(':') + 1)
  if (token.startsWith('Pad:')) {
    if (value[0] === 'b') { const i = Number(value.slice(1)); return PAD_BUTTONS[i] ?? `Botão ${i}` }
    const i = Number(value.slice(1, -1)), plus = value.endsWith('+')
    return PAD_AXES[i * 2 + (plus ? 1 : 0)] ?? `Eixo ${i}${plus ? '+' : '−'}`
  }
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
