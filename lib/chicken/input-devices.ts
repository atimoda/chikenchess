// Input devices of this computer, so each local player can drive their own chicken: the primary keyboard,
// the secondary keyboard, each gamepad (by its index), the mouse and the touch screen. The binds themselves
// stay in controls.ts; this file only says which of them belong to which device.
import { CHICKEN_ACTIONS, type ChickenAction, type ChickenControls } from './controls'
import { magnetVector } from './analog-magnet'

export type InputDeviceId = 'kb1' | 'kb2' | 'mouse' | 'touch' | `pad${number}`

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

// The primary keyboard drives with the `keys` column of the controls, the secondary keyboard with `keys2`.
function primaryKeys(c: ChickenControls) {
  const out = new Set<string>()
  CHICKEN_ACTIONS.forEach(a => primaryBinds(c, a.key).forEach(t => out.add(t)))
  return out
}
function primaryBinds(c: ChickenControls, a: ChickenAction): string[] {
  return (c.keys[a] ?? []).filter((t): t is string => !!t)
}
function secondaryBinds(c: ChickenControls, a: ChickenAction): string[] {
  return (c.keys2[a] ?? []).filter((t): t is string => !!t)
}

// The keyboard keys that drive `action` for a player holding `devices` (null: everything, as on the globe).
export function keyTokensFor(c: ChickenControls, action: ChickenAction, devices: readonly InputDeviceId[] | null): string[] {
  const kb1 = !devices || devices.includes('kb1'), kb2 = !devices || devices.includes('kb2')
  const out: string[] = []
  if (kb1) out.push(...primaryBinds(c, action))
  if (kb2) {
    // a player with only the secondary keyboard never moves with keys of the primary one
    const taken = kb1 ? new Set<string>() : primaryKeys(c)
    out.push(...secondaryBinds(c, action).filter(t => kb1 || !taken.has(t)))
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

function tokensOf(gp: Gamepad | null, deadzone: number, on: Set<string>, movementMagnet: number) {
  if (!gp) return
  gp.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > 0.3)) on.add(`Pad:b${i}`) })
  const snapped = magnetVector({ x: gp.axes[0] ?? 0, y: gp.axes[1] ?? 0 }, movementMagnet)
  gp.axes.forEach((raw, i) => { const v = i === 0 ? snapped.x : i === 1 ? snapped.y : raw; if (v < -deadzone) on.add(`Pad:a${i}-`); else if (v > deadzone) on.add(`Pad:a${i}+`) })
}

// Pressed buttons / pushed stick directions of the player's gamepads (null devices: the first connected one,
// as before there were local players).
export function padTokensFor(devices: readonly InputDeviceId[] | null, deadzone = 0.4, movementMagnet = 0) {
  const on = new Set<string>()
  if (!devices) tokensOf(firstGamepad(), deadzone, on, movementMagnet)
  else devices.forEach(d => { if (isPadDevice(d)) tokensOf(gamepadAt(padIndex(d)), deadzone, on, movementMagnet) })
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
