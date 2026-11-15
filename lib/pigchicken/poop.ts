// "Cagar": the special power of some birds. Now and then, when somebody is right under it, the bird lets a dropping
// fall. Pure (no combat, no DOM): the numbers, who is under a bird and how a dropping falls; the combat
// (lib/pigchicken/combat.ts) keeps the clocks and does the hitting.
//
// - Who has it: the wild birds of some types (BirdType.poop, lib/pigchicken/birds.ts) and the souls of some species
//   flying free (SoulActParams.poopEvery, lib/pigchicken/soul-acts.ts; each entry of the library may have its own).
// - When: every `every` seconds (more or less) it is ready, and it lets go as soon as a boneco is in the column
//   under it with nothing solid in between. A soul that spares its owner never counts her.
// - What it does: on an enemy or a training dummy, `damage` (low). The players' chickens have no life in the Pátio:
//   on one of them it is a small knock (stronger with the damage) and a stain that stays for a moment.
export type Poop = {
  x: number; y: number; vx: number; vy: number; t: number
  damage: number
  by: string | null // the local player whose soul dropped it (null: a wild bird)
  spare: boolean // it does not hit `by`
  foes: boolean // it hits enemies and training dummies
}
export type PoopParams = { every: number; damage: number }
export const POOP = {
  gravity: 1500, max: 1000, // px/s²; its top speed
  r: 5, // px: its size
  life: 6, // s before it is gone whatever happens
  column: 26, // px to each side of the bird: who is under it
  drop: [50, 900] as const, // px below the bird: nearer or farther than this, nobody is under it
  first: [0.3, 1] as const, // of `every`: its first one
  vary: [0.7, 1.3] as const, // each wait, times this
  look: 0.15, // s between two looks under it once it is ready
  knock: { base: 30, per: 14, up: 0.5 }, // px/s a chicken is knocked sideways: base + per × damage; that much of it upwards
  stain: 4, // s the stain stays on a chicken
  stainAt: 0.45, // of her box's height, from its top: where the stain sits (her back, below her head)
  stainIn: 0.35, // of the distance from the middle of her box to where it fell
  mark: 3, // s the mark stays on the floor
}
const lerp = ([a, b]: readonly [number, number], k: number) => a + (b - a) * k
// s until the next one
export const poopWait = (every: number, rand: () => number = Math.random, first = false) => every * lerp(POOP.vary, rand()) * (first ? lerp(POOP.first, rand()) : 1)
export const poopKnock = (damage: number) => POOP.knock.base + POOP.knock.per * Math.max(0, damage)

type Box = { l: number; r: number; t: number; b: number }
/** Is one of these bonecos right under (x, y)? floors: what a dropping stops at (their tops) before it gets there. */
export function poopUnder(x: number, y: number, bodies: readonly Box[], floors: readonly { l: number; r: number; t: number }[] = []): boolean {
  const [near, far] = POOP.drop
  for (const b of bodies) {
    if (x < b.l - POOP.column || x > b.r + POOP.column || b.t - y < near || b.t - y > far) continue
    if (!floors.some(f => x >= f.l && x <= f.r && f.t > y && f.t < b.t)) return true
  }
  return false
}
// a dropping let go at (x, y) by a bird moving sideways at vx
export const newPoop = (x: number, y: number, vx: number, damage: number, by: string | null, spare: boolean, foes: boolean): Poop =>
  ({ x, y, vx: vx * 0.3, vy: 40, t: 0, damage, by, spare, foes })
// one frame of its fall; false: its time is up
export function poopFall(p: Poop, dt: number): boolean {
  p.t += dt
  p.vy = Math.min(POOP.max, p.vy + POOP.gravity * dt)
  p.x += p.vx * dt; p.y += p.vy * dt
  return p.t < POOP.life
}
export const poopHits = (p: Poop, b: Box) => p.x + POOP.r > b.l && p.x - POOP.r < b.r && p.y + POOP.r > b.t && p.y - POOP.r < b.b
