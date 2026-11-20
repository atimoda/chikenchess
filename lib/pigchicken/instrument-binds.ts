// The fixed instruments' own binds, read for one player (pure: the page reads the keys and the gamepad). The Harpa's
// are in ChickenControls.harp (Controles → Instrumentos → Harpa); the Bateria's are the kit's shortcuts
// (lib/pigchicken/drum-kit.ts, the same list as Escalas → Bateria → Kit). The Piano de cauda's are the movement binds
// themselves (the dynamics and Correr's accumulator of the Estrela: lib/pigchicken/star-play.ts).
import { type ChickenAction, type ChickenControls, type HarpAction } from '../chicken/controls'
import type { MoveBinds } from './star-play'
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

// the movement binds the Piano de cauda plays with (Correr, Agachar, Chocar, Pular, Esquerda, Direita)
const PIANO_ACTIONS: ChickenAction[] = ['run', 'crouch', 'down', 'jump', 'left', 'right']
const actionTokens = (c: ChickenControls, a: ChickenAction, devices: readonly InputDeviceId[] | null) =>
  [...keyTokensFor(c, a, devices), ...(hasPad(devices) ? c.pad[a].filter((t): t is string => !!t) : [])]

/** Every key and button the instrument she sits at uses for that player: the Harpa's binds, the kit's shortcuts or
 * the Piano de cauda's movement binds. */
export function seatTokens(kind: 'harp' | 'drums' | 'piano', c: ChickenControls, devices: readonly InputDeviceId[] | null, kit: DrumKit): Set<string> {
  if (kind === 'harp') return new Set((['sharp'] as HarpAction[]).flatMap(a => harpTokens(c, a, devices)))
  if (kind === 'piano') return new Set(PIANO_ACTIONS.flatMap(a => actionTokens(c, a, devices)))
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

/** The seat's kind of binds for a fixed instrument. */
export const seatBindsOf = (kind: string): 'harp' | 'drums' | 'piano' => (kind === 'drumkit' ? 'drums' : kind === 'grandpiano' ? 'piano' : 'harp')

/** How deep a player's gamepad Atirar is (its analog trigger's push, 0..1; a plain button: 0 or 1; no gamepad: 0). */
export function fireDepth(c: ChickenControls, devices: readonly InputDeviceId[] | null, pad: readonly number[]) {
  if (!hasPad(devices)) return 0
  return c.pad.fire.reduce((m, t) => (t && t.startsWith('Pad:b') ? Math.max(m, pad[Number(t.slice(5))] ?? 0) : m), 0)
}

/** The movement binds a player holds (the engine's actions): the Estrela's accumulator and dynamics. */
export const movesOf = (a: Partial<Record<ChickenAction, boolean>>): MoveBinds =>
  ({ run: !!a.run, crouch: !!a.crouch, brood: !!a.down, jump: !!a.jump, walk: !!a.left || !!a.right })
