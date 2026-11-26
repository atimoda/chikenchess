// Input devices of this computer, so each local player can drive their own chicken: the primary keyboard,
// the secondary keyboard, each gamepad (by its index), the mouse and the touch screen. The binds themselves
// stay in controls.ts; this file only says which of them belong to which device.
import { msg, t as tr } from '../i18n'
import { CHICKEN_ACTIONS, type ChickenAction, type ChickenControls } from './controls'
import { magnetVector } from './analog-magnet'

export type InputDeviceId = 'kb1' | 'kb2' | 'mouse' | 'touch' | `pad${number}`

export const isPadDevice = (d: InputDeviceId): d is `pad${number}` => d.startsWith('pad')
export const padIndex = (d: InputDeviceId) => (isPadDevice(d) ? Number(d.slice(3)) : -1)

/** The device's name on screen (inputDeviceLabel stays the language-free value that is compared and sent). */
export function inputDeviceText(d: InputDeviceId) {
  if (isPadDevice(d)) return tr('Gamepad {n}', { n: padIndex(d) + 1 })
  return tr(inputDeviceLabel(d))
}

export function inputDeviceLabel(d: InputDeviceId) {
  if (d === 'kb1') return msg('Primary keyboard')
  if (d === 'kb2') return msg('Secondary keyboard')
  if (d === 'mouse') return msg('Mouse')
  if (d === 'touch') return msg('Touch')
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
  // the Pátio's binds (the editing switch) are not the chicken's: the engine leaves those keys to the page
  CHICKEN_ACTIONS.filter(a => a.group !== 'patio').forEach(a => keyTokensFor(c, a.key, devices).forEach(t => out.add(t)))
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

// How far one stick of the player's first gamepad is pushed (0..1, dead zone included); null without a gamepad
export function stickExtentFor(devices: readonly InputDeviceId[] | null, stick: 0 | 1): number | null {
  const pad = devices ? devices.find(isPadDevice) : null
  const gp = devices ? (pad ? gamepadAt(padIndex(pad)) : null) : firstGamepad()
  if (!gp) return null
  return Math.min(1, Math.hypot(gp.axes[stick * 2] ?? 0, gp.axes[stick * 2 + 1] ?? 0))
}

// How deep each button of the player's gamepads is (0..1; a trigger says how far it is pulled, a plain button 0 or 1;
// the deepest among their gamepads), by the button's index
export function padButtonValues(devices: readonly InputDeviceId[] | null): number[] {
  const pads = devices ? devices.filter(isPadDevice).map(d => gamepadAt(padIndex(d))) : [firstGamepad()]
  const out: number[] = []
  pads.forEach(gp => gp?.buttons.forEach((b, i) => { out[i] = Math.max(out[i] ?? 0, b ? Math.max(b.value, b.pressed ? 1 : 0) : 0) }))
  return out
}
