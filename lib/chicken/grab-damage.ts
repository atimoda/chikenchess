// Falling off a grab by damage ("Cair do grab após", ChickenParams.clingDropDamage, group Agarrar).
// The birds have no life: a blow that carries damage (a blast, a card's burst, a dropping) only pushes them. Grabbed
// on a wall or hanging from a ceiling, a bird holds on, without being pushed, until the damage it took since it
// grabbed reaches the limit; that blow then takes it off with its push. A limit of 0 lets any blow do it.
// The engine keeps the sum of each bird and clears it when the bird is no longer grabbed.
export function grabDamageStep(taken: number, damage: number, limit: number) {
  const total = taken + Math.max(0, damage || 0)
  return { taken: total, drop: total >= Math.max(0, limit || 0) }
}
