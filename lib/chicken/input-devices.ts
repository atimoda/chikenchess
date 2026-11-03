// Input devices of this computer, so each local player can drive their own chicken: the primary keyboard,
// the secondary keyboard, each gamepad (by its index), the mouse and the touch screen. The binds themselves
// stay in controls.ts; this file only says which of them belong to which device.
import { CHICKEN_ACTIONS, type ChickenAction, type ChickenControls } from './controls'

export type InputDeviceId = 'kb1' | 'kb2' | 'mouse' | 'touch' | `pad${number}`
type Slots = (string | null)[]

export const isPadDevice = (d: InputDeviceId): d is `pad${number}` => d.startsWith('pad')
export const padIndex = (d: InputDeviceId) => (isPadDevice(d) ? Number(d.slice(3)) : -1)

export function inputDeviceLabel(d: InputDeviceId) {
  if (d === 'kb1') return 'Primary keyboard'
  if (d === 'kb2') return 'Secondary keyboard'
  if (d === 'mouse') return 'Mouse'
  if (d === 'touch') return 'Touch'
  return `Gamepad ${padIndex(d) + 1}`
}

// the order of the columns: keyboards, mouse, gamepads, touch
export function sortDevices(list: InputDeviceId[]) {
  const rank = (d: InputDeviceId) => d === 'kb1' ? 0 : d === 'kb2' ? 1 : d === 'mouse' ? 2 : isPadDevice(d) ? 10 + padIndex(d) : 100
  return [...new Set(list)].sort((a, b) => rank(a) - rank(b))
}

// The secondary keyboard's keys while controls.ts has no column of its own for it: the arrows plus the
// INS / HOME / PGUP / DEL / END / PGDN group, right Shift and right Ctrl. Once controls carry `keys2`, those win.
export const SECONDARY_KEYBOARD_FALLBACK: Partial<Record<ChickenAction, string[]>> = {
  left: ['Key:ArrowLeft'], right: ['Key:ArrowRight'], up: ['Key:ArrowUp'],
  down: ['Key:ControlRight'], crouch: ['Key:PageDown', 'Key:ArrowDown'], jump: ['Key:PageUp'], run: ['Key:ShiftRight'],
  fire: ['Key:Insert'], melee: ['Key:Home'], throw: ['Key:End'], nextItem: ['Key:Delete'], prevItem: ['Key:Backslash'], reload: ['Key:Backspace'],
}

const has2 = (c: ChickenControls): c is ChickenControls & { keys2: Record<ChickenAction, Slots> } => !!(c as { keys2?: unknown }).keys2

// every key bound on the primary keyboard (to any action); the secondary fallback never takes these
function primaryKeys(c: ChickenControls) {
  const out = new Set<string>()
  CHICKEN_ACTIONS.forEach(a => primaryBinds(c, a.key).forEach(t => out.add(t)))
  return out
}
function primaryBinds(c: ChickenControls, a: ChickenAction): string[] {
  // without a secondary column yet, the middle slot (the arrows) is the secondary keyboard's
  const slots = has2(c) ? c.keys[a] : c.keys[a].filter((_, i) => i !== 1)
  return slots.filter((t): t is string => !!t)
}
function secondaryBinds(c: ChickenControls, a: ChickenAction, taken: Set<string>): string[] {
  if (has2(c)) return (c.keys2[a] ?? []).filter((t): t is string => !!t)
  const out = new Set<string>()
  const mid = c.keys[a][1]
  if (mid) out.add(mid)
  ;(SECONDARY_KEYBOARD_FALLBACK[a] ?? []).forEach(t => { if (!taken.has(t)) out.add(t) })
  return [...out]
}

// The keyboard keys that drive `action` for a player holding `devices` (null: everything, as on the globe).
export function keyTokensFor(c: ChickenControls, action: ChickenAction, devices: readonly InputDeviceId[] | null): string[] {
  const kb1 = !devices || devices.includes('kb1'), kb2 = !devices || devices.includes('kb2')
  const out: string[] = []
  if (kb1) out.push(...primaryBinds(c, action))
  if (kb2) {
    // a player with only the secondary keyboard never moves with keys of the primary one
    const taken = kb1 ? new Set<string>() : primaryKeys(c)
    out.push(...secondaryBinds(c, action, taken).filter(t => kb1 || !taken.has(t)))
  }
  return out
}

// every key any device of the list uses (the engine only takes those from the page)
export function allKeyTokens(c: ChickenControls, devices: readonly InputDeviceId[] | null) {
  const out = new Set<string>()
  CHICKEN_ACTIONS.forEach(a => keyTokensFor(c, a.key, devices).forEach(t => out.add(t)))
  return out
}

function gamepadAt(index: number) {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  const gp = pads[index]
  return gp && gp.connected ? gp : null
}
function firstGamepad() {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  return Array.from(pads).find(g => g && g.connected) ?? null
}

// connected gamepads, by their index (the browser only lists one after its first button press)
export function connectedPads(): InputDeviceId[] {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  return Array.from(pads).flatMap((g, i) => (g && g.connected ? [`pad${i}` as InputDeviceId] : []))
}

function tokensOf(gp: Gamepad | null, deadzone: number, on: Set<string>) {
  if (!gp) return
  gp.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > 0.3)) on.add(`Pad:b${i}`) })
  gp.axes.forEach((v, i) => { if (v < -deadzone) on.add(`Pad:a${i}-`); else if (v > deadzone) on.add(`Pad:a${i}+`) })
}

// Pressed buttons / pushed stick directions of the player's gamepads (null devices: the first connected one,
// as before there were local players).
export function padTokensFor(devices: readonly InputDeviceId[] | null, deadzone = 0.4) {
  const on = new Set<string>()
  if (!devices) tokensOf(firstGamepad(), deadzone, on)
  else devices.forEach(d => { if (isPadDevice(d)) tokensOf(gamepadAt(padIndex(d)), deadzone, on) })
  return on
}

// One stick (0 left, 1 right) of the player's first gamepad, dead zone removed and rescaled to 0..1 (as readStick)
export function stickFor(devices: readonly InputDeviceId[] | null, stick: 0 | 1, deadzone: number): { x: number; y: number; mag: number } | null {
  const pad = devices ? devices.find(isPadDevice) : null
  const gp = devices ? (pad ? gamepadAt(padIndex(pad)) : null) : firstGamepad()
  if (!gp) return null
  const x = gp.axes[stick * 2] ?? 0, y = gp.axes[stick * 2 + 1] ?? 0
  const len = Math.hypot(x, y)
  if (len <= deadzone || len === 0) return null
  return { x: x / len, y: y / len, mag: Math.min(1, (len - deadzone) / Math.max(0.01, 1 - deadzone)) }
}
