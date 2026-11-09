// The online Pátio's Templo do Gongo, as data: the lobby owner's browser runs the mini-game (lib/pigchicken/temple.ts)
// and sends its state ("world": tp) with the sounds and effects it played ("world": te); the other browsers take
// that state in and follow it (temple.follow), and ask the owner for gong and reset strikes, hurts and rhythm grades.
// The aliens themselves travel with the other shared enemies (net-world.ts); here they go by their lobby ids.
import { SPECIES, STAGES, type Bomb, type Phase, type TempleAlien, type TempleState } from './temple'
import type { TempleSound } from './temple-music'

export type NetTemple = Record<string, unknown>
// what the owner's temple played: a sound, a burst of sparks, a floating text
export type NetTempleEvent =
  | { s: TempleSound }
  | { b: [number, number, number, string, number?, number?] }
  | { t: [number, number, string, string?, number?] }

const NUMS = ['t', 'gongHits', 'gongNeed', 'gongRing', 'resetHits', 'resetRing', 'hearts', 'invuln', 'score', 'stageScore', 'combo', 'bestCombo', 'melodyStep', 'rng', 'dragonT', 'kills', 'perfects'] as const
const PHASES: Phase[] = ['idle', 'intro', 'playing', 'cleared', 'failed', 'victory']
const MODES = ['form', 'dive', 'free', 'dragon'] as const
const ALIEN_NUMS = ['id', 'col', 'row', 'u', 'dur', 'tx', 'side', 'vx', 'by', 'seg', 'charge', 'lastHp', 'x', 'y'] as const
const r2 = (v: number) => Math.round(v * 100) / 100
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * The owner's side. idOf gives each alien's lobby id (its target's). full: every alien's whole record (else only
 * its id and glow; the whole records go every couple of seconds and whenever the set of aliens changes).
 */
export function exportTemple(s: TempleState, idOf: (id: number) => number, full: boolean): NetTemple {
  const out: NetTemple = { phase: s.phase, stage: s.stage }
  for (const k of NUMS) out[k] = r2(s[k])
  out.f = s.f ? { ...s.f } : null
  out.banner = s.banner ? { title: s.banner.title, sub: s.banner.sub, color: s.banner.color, life: s.banner.life, t: r2(s.banner.t) } : null
  out.bombs = s.bombs.map(b => [r2(b.x), r2(b.y), r2(b.vx), r2(b.vy), b.kind === 'fire' ? 1 : 0, r2(b.t)])
  if (full) out.aliens = s.aliens.map(a => ({ ...a, id: idOf(a.id) }))
  else out.ac = s.aliens.map(a => [idOf(a.id), r2(a.charge)])
  return out
}

/** the set of aliens, to know when the whole records must go again */
export const templeAlienKey = (s: TempleState) => s.aliens.map(a => a.id).join(',')

/** the others' side: the owner's state replaces this browser's (its own welcome, grade and hurt stay) */
export function importTemple(s: TempleState, m: unknown) {
  const o = m as NetTemple | null
  if (!o || typeof o !== 'object' || !PHASES.includes(o.phase as Phase) || !num(o.stage) || o.stage < 0 || o.stage >= STAGES.length) return
  s.phase = o.phase as Phase; s.stage = Math.floor(o.stage)
  for (const k of NUMS) if (num(o[k])) s[k] = o[k] as number
  const f = o.f as TempleState['f']
  s.f = f && typeof f === 'object' && [f.x, f.y, f.goalX, f.dir, f.targetY, f.gap].every(num) ? { x: f.x, y: f.y, goalX: f.goalX, dir: f.dir, targetY: f.targetY, gap: f.gap } : null
  const b = o.banner as TempleState['banner']
  // a banner of the owner's: kept running here (no restart on every message); none there: this one runs out
  if (b && typeof b === 'object' && typeof b.title === 'string' && typeof b.sub === 'string' && num(b.life)) {
    if (!s.banner || s.banner.title !== b.title || s.banner.sub !== b.sub) s.banner = { title: b.title.slice(0, 120), sub: b.sub.slice(0, 400), color: typeof b.color === 'string' ? b.color.slice(0, 16) : '#ffd166', life: Math.min(20, b.life), t: num(b.t) ? b.t : 0 }
  }
  if (Array.isArray(o.bombs)) {
    s.bombs = (o.bombs as unknown[]).slice(0, 200).filter((e): e is number[] => Array.isArray(e) && e.length >= 6 && e.every(num))
      .map(e => ({ x: e[0], y: e[1], vx: e[2], vy: e[3], kind: e[4] ? 'fire' : 'orb', t: e[5] }) as Bomb)
  }
  if (Array.isArray(o.aliens)) {
    s.aliens = (o.aliens as unknown[]).slice(0, 200).flatMap(a => {
      const r = a as Record<string, unknown>
      if (!r || typeof r !== 'object' || !(typeof r.sp === 'string' && r.sp in SPECIES) || !MODES.includes(r.mode as TempleAlien['mode']) || !ALIEN_NUMS.every(k => num(r[k]))) return []
      const out = { sp: r.sp, mode: r.mode } as TempleAlien
      for (const k of ALIEN_NUMS) (out as Record<string, unknown>)[k] = r[k]
      return [out]
    })
  } else if (Array.isArray(o.ac)) {
    const glow = new Map<number, number>()
    for (const e of o.ac as unknown[]) if (Array.isArray(e) && num(e[0]) && num(e[1])) glow.set(e[0], e[1])
    s.aliens = s.aliens.filter(a => glow.has(a.id))
    s.aliens.forEach(a => { a.charge = glow.get(a.id)! })
  }
}

/** an effect or sound of the owner's temple, checked; the kill's grid time is this browser's own */
export function cleanTempleEvent(e: unknown): NetTempleEvent | null {
  const o = e as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return null
  if (Array.isArray(o.b) && num(o.b[0]) && num(o.b[1]) && num(o.b[2]) && typeof o.b[3] === 'string') return { b: [o.b[0], o.b[1], Math.min(80, o.b[2]), o.b[3].slice(0, 16), num(o.b[4]) ? o.b[4] : undefined, num(o.b[5]) ? o.b[5] : undefined] }
  if (Array.isArray(o.t) && num(o.t[0]) && num(o.t[1]) && typeof o.t[2] === 'string') return { t: [o.t[0], o.t[1], o.t[2].slice(0, 80), typeof o.t[3] === 'string' ? o.t[3].slice(0, 16) : undefined, num(o.t[4]) ? o.t[4] : undefined] }
  const s = cleanSound(o.s)
  return s ? { s } : null
}

// the owner's temple sounds that every browser hears (a grade and a hurt are only heard where they happened)
const PLAIN = new Set(['gongDull', 'fail', 'dive', 'bomb', 'fire', 'split', 'clank', 'roar'])
export const relaysSound = (e: TempleSound) => e.kind !== 'judge' && e.kind !== 'hurt'
function cleanSound(v: unknown): TempleSound | null {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || typeof o.kind !== 'string') return null
  const k = o.kind
  if (PLAIN.has(k)) return { kind: k } as TempleSound
  if ((k === 'gong' || k === 'reset') && num(o.hit) && num(o.need)) return { kind: k, hit: o.hit, need: o.need }
  if (k === 'stageStart' && num(o.root)) return { kind: k, root: o.root }
  if ((k === 'clear' || k === 'victory') && num(o.root) && Array.isArray(o.chord) && o.chord.length <= 8 && o.chord.every(num)) return { kind: k, root: o.root, chord: o.chord as number[] }
  if (k === 'kill' && num(o.midi) && num(o.combo)) return { kind: k, midi: o.midi, combo: o.combo, at: 0 }
  return null
}
