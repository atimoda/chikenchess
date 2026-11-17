// Bateria: what each piece's shortcuts say this frame (lib/pigchicken/drum-kit.ts), from the player's keys and
// gamepad. A "Move:" shortcut is whatever walks that way for that player (their keyboards' keys and their gamepad's
// buttons; never the sticks, which are the drumsticks). Pure: the page reads the keys and the gamepad.
import { chickenBindName, type ChickenAction, type ChickenControls } from '../chicken/controls'
import { keyTokensFor, type InputDeviceId } from '../chicken/input-devices'
import { DRUM_IDS, isMoveToken, isTriggerToken, type BindLevel, type DrumKit, type DrumPiece, type MoveToken } from './drum-kit'

const MOVE_ACTION: Record<MoveToken, ChickenAction> = { 'Move:left': 'left', 'Move:right': 'right', 'Move:up': 'up', 'Move:down': 'crouch' }

/** The keys and gamepad buttons a shortcut stands for, for a player holding `devices` (null: every device). */
export function bindTokens(token: string, controls: ChickenControls, devices: readonly InputDeviceId[] | null): string[] {
  if (!isMoveToken(token)) return [token]
  const action = MOVE_ACTION[token]
  return [...keyTokensFor(controls, action, devices), ...(controls.pad[action] ?? []).filter((t): t is string => !!t && t.startsWith('Pad:b'))]
}

/**
 * Every piece's shortcuts now. `keys`: the keyboard keys held ("Key:KeyD"); `pad`: how deep each button of the
 * player's gamepad is (0..1, by index). A plain button counts from halfway; a trigger gives its depth.
 */
export function drumBindLevels(kit: DrumKit, controls: ChickenControls, devices: readonly InputDeviceId[] | null, keys: ReadonlySet<string>, pad: readonly number[]): Record<DrumPiece, BindLevel> {
  const keyboard = !devices || devices.includes('kb1') || devices.includes('kb2')
  const out = {} as Record<DrumPiece, BindLevel>
  for (const id of DRUM_IDS) {
    let digital = false, depth = 0
    for (const bind of kit.binds[id]) {
      for (const t of bindTokens(bind, controls, devices)) {
        if (t.startsWith('Key:')) { if (keyboard && keys.has(t)) digital = true }
        else if (isTriggerToken(t)) depth = Math.max(depth, pad[Number(t.slice(5))] ?? 0)
        else if ((pad[Number(t.slice(5))] ?? 0) > 0.5) digital = true
      }
    }
    out[id] = { digital, depth }
  }
  return out
}

/** Every keyboard key the kit's shortcuts use for that player (the page keeps them from scrolling the page). */
export function drumKeyTokens(kit: DrumKit, controls: ChickenControls, devices: readonly InputDeviceId[] | null) {
  const out = new Set<string>()
  DRUM_IDS.forEach(id => kit.binds[id].forEach(b => bindTokens(b, controls, devices).forEach(t => { if (t.startsWith('Key:')) out.add(t) })))
  return out
}

const MOVE_NAME: Record<MoveToken, string> = { 'Move:left': '←', 'Move:right': '→', 'Move:up': '↑', 'Move:down': '↓' }
/** A shortcut's short name: a movement direction as its arrow, a key or a gamepad button by its own name. */
export const drumBindName = (token: string) => (isMoveToken(token) ? MOVE_NAME[token] : chickenBindName(token))
