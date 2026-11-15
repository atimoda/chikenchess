// A chick let out of a Gaiola (lib/pigchicken/cages.ts) is a chick again: the Parquinho says where its cage is and
// the flock (components/chicken/chick-flock.tsx) hatches it there, in the look it had, to follow the first chicken
// like the others.
// style: its place in CHICK_STYLES; (x, y): where it comes out, in the chickens' screen px
export type ChickRelease = { style: number; x: number; y: number }
const listeners = new Set<(r: ChickRelease) => void>()
export function onChickRelease(fn: (r: ChickRelease) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const releaseChick = (r: ChickRelease) => listeners.forEach(fn => fn(r))
