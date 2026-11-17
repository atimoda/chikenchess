// The fixed instruments' own binds, read for one player (pure: the page reads the keys and the gamepad). The Harpa's
// are in ChickenControls.harp (Controles → Instrumentos → Harpa); the Bateria's are the kit's shortcuts
// (lib/pigchicken/drum-kit.ts, the same list as Escalas → Bateria → Kit).
import { type ChickenControls, type HarpAction } from '../chicken/controls'
import { isPadDevice, keyTokensFor, type InputDeviceId } from '../chicken/input-devices'
import { bindTokens } from './drum-input'
import { DRUM_IDS, type DrumKit } from './drum-kit'

const keyboardOf = (devices: readonly InputDeviceId[] | null) => ({ kb1: !devices || devices.includes('kb1'), kb2: !devices || devices.includes('kb2') })
const hasPad = (devices: readonly InputDeviceId[] | null) => !devices || devices.some(isPadDevice)

/** The keys and gamepad buttons of a Harpa bind for a player holding `devices` (null: every device). */
export function harpTokens(c: ChickenControls, action: HarpAction, devices: readonly InputDeviceId[] | null): string[] {
  const { kb1, kb2 } = keyboardOf(devices)
  const list = [...(kb1 ? c.harp.keys[action] : []), ...(kb2 ? c.harp.keys2[action] : []), ...(hasPad(devices) ? c.harp.pad[action] : [])]
  return list.filter((t): t is string => !!t)
}

/** Some of `tokens` is held: a key in `keys` ("Key:ShiftLeft"), a gamepad button past halfway in `pad` (by index). */
export function tokensHeld(tokens: readonly string[], keys: ReadonlySet<string>, pad: readonly number[]) {
  return tokens.some(t => t.startsWith('Key:') ? keys.has(t) : t.startsWith('Pad:b') && (pad[Number(t.slice(5))] ?? 0) > 0.5)
}

export const harpHeld = (c: ChickenControls, action: HarpAction, devices: readonly InputDeviceId[] | null, keys: ReadonlySet<string>, pad: readonly number[]) =>
  tokensHeld(harpTokens(c, action, devices), keys, pad)

/** Every key and button the instrument she sits at uses for that player: the Harpa's binds or the kit's shortcuts. */
export function seatTokens(kind: 'harp' | 'drums', c: ChickenControls, devices: readonly InputDeviceId[] | null, kit: DrumKit): Set<string> {
  if (kind === 'harp') return new Set((['sharp'] as HarpAction[]).flatMap(a => harpTokens(c, a, devices)))
  return new Set(DRUM_IDS.flatMap(id => kit.binds[id].flatMap(b => bindTokens(b, c, devices))))
}

/**
 * The Pegar pressed now came only from keys and buttons that are also the seated instrument's own binds (Shift as the
 * Harpa's sustenido, say): it plays there and does not get her up. False when Pegar came from anything else (its own
 * key, the on-screen button), so that still gets her up.
 */
export function grabIsSeatBind(c: ChickenControls, devices: readonly InputDeviceId[] | null, keys: ReadonlySet<string>, pad: readonly number[], seat: ReadonlySet<string>) {
  const grab = [...keyTokensFor(c, 'grab', devices), ...(hasPad(devices) ? c.pad.grab.filter((t): t is string => !!t) : [])]
  const held = grab.filter(t => tokensHeld([t], keys, pad))
  return held.length > 0 && held.every(t => seat.has(t))
}
