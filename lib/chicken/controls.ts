// Player chicken controls: keyboard and gamepad bindings, on-screen (touch) controls and sound.
// One store for every screen, saved in this browser; the panel and the engine both read it.

export type ChickenAction = 'left' | 'right' | 'up' | 'down' | 'crouch' | 'jump' | 'run'
export type ChickenTouchMode = 'auto' | 'on' | 'off'
type Slots = (string | null)[]

export const CHICKEN_ACTIONS: { key: ChickenAction; label: string; keys: Slots; pad: Slots }[] = [
  { key: 'left', label: 'Esquerda', keys: ['Key:KeyA', 'Key:ArrowLeft', null], pad: ['Pad:a0-', 'Pad:b14', null] },
  { key: 'right', label: 'Direita', keys: ['Key:KeyD', 'Key:ArrowRight', null], pad: ['Pad:a0+', 'Pad:b15', null] },
  { key: 'up', label: 'Olhar pra cima / subir', keys: ['Key:KeyW', 'Key:ArrowUp', null], pad: ['Pad:a1-', 'Pad:b12', null] },
  { key: 'down', label: 'Chocar / cair', keys: ['Key:ControlLeft', 'Key:ArrowDown', null], pad: ['Pad:b1', 'Pad:b4', null] },
  { key: 'crouch', label: 'Agachar / slide / super pulo', keys: ['Key:KeyS', 'Key:KeyC', null], pad: ['Pad:a1+', 'Pad:b13', null] },
  { key: 'jump', label: 'Pular / voar', keys: ['Key:Space', null, null], pad: ['Pad:b0', null, null] },
  { key: 'run', label: 'Correr', keys: ['Key:ShiftLeft', 'Key:ShiftRight', null], pad: ['Pad:b2', 'Pad:b5', 'Pad:b7'] },
]

export type ChickenControls = {
  keys: Record<ChickenAction, Slots>
  pad: Record<ChickenAction, Slots>
  touch: ChickenTouchMode
  sound: boolean
}

const STORE = 'chickenchess-chicken-controls-v1'
const EVENT = 'chickenchess-chicken-controls'

export function defaultChickenControls(): ChickenControls {
  const keys = {} as ChickenControls['keys'], pad = {} as ChickenControls['pad']
  CHICKEN_ACTIONS.forEach(a => { keys[a.key] = a.keys.slice(); pad[a.key] = a.pad.slice() })
  return { keys, pad, touch: 'auto', sound: true }
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
  } catch { /* storage unavailable: defaults */ }
  return base
}

export function saveChickenControls(next: ChickenControls) {
  try { window.localStorage.setItem(STORE, JSON.stringify(next)) } catch { /* ignore */ }
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

const KEY_NAMES: Record<string, string> = { Space: 'Espaço', ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.', AltLeft: 'Alt esq.', AltRight: 'Alt dir.', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: 'Enter', Tab: 'Tab' }
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
export function readGamepadTokens() {
  const on = new Set<string>()
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  const gp = Array.from(pads).find(g => g && g.connected)
  if (!gp) return on
  gp.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > 0.3)) on.add(`Pad:b${i}`) })
  gp.axes.forEach((v, i) => { if (v < -0.4) on.add(`Pad:a${i}-`); else if (v > 0.4) on.add(`Pad:a${i}+`) })
  return on
}
