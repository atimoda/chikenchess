// A Filhote online: Player 1's look goes to the others with three more keys (the game server keeps any short word
// keys of a look), so they draw her as the Filhote of her class, with her skin and her music bar. A browser that does
// not know them just ignores them.
import type { BabyState } from './baby'

const BABY = 'netBaby', SKIN = 'netBabySkin', BAR = 'netBabyBar'

/** her look as it goes online: with the Filhote's keys while she is one */
export function withNetBaby<T extends Record<string, string>>(look: T, baby: BabyState | null): T | (T & Record<string, string>) {
  if (!baby?.on) return look
  return { ...look, [BABY]: '1', ...(baby.skin && /^[\w-]{1,40}$/.test(baby.skin) ? { [SKIN]: baby.skin } : {}), [BAR]: String(Math.max(0, Math.min(100, Math.round(baby.bar * 100)))) }
}

/** a look that came from another browser: the look itself and, when she is a Filhote, her skin and bar (0..1) */
export function readNetBaby(look: Record<string, string> | null): { look: Record<string, string> | null; baby: { skin: string | null; bar: number } | null } {
  if (!look) return { look, baby: null }
  const { [BABY]: on, [SKIN]: skin, [BAR]: bar, ...rest } = look
  const n = Number(bar)
  return { look: rest, baby: on === '1' ? { skin: skin ?? null, bar: Number.isFinite(n) ? Math.max(0, Math.min(1, n / 100)) : 0 } : null }
}
