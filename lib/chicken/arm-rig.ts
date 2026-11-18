// Two-bone arms for the humanoid characters (Pig, Ken): shoulder → elbow → wrist, drawn each frame by the engine.
// The chicken rig still poses its wings (lib/chicken/engine.ts) and works out where each hand should be (resting, on
// a held item's grip, on a second grip, in a blow); an arm then bends at the elbow to reach that point, never
// stretching past its length. Pure geometry and markup, rig units.

export type ArmSpec = {
  shoulder: [number, number]
  upper: number; fore: number
  // where the wrist rests, and which way the elbow bends (+1 or −1, as at rest)
  rest: [number, number]
  bend: number
  width: number; color: string
  // the hand, drawn at the wrist pointing along the forearm (+x), turned `handTurn` degrees more
  hand: string; handTurn: number
  // drawn at the wrist across the forearm (a cuff), and hanging straight down from it (a broken chain)
  wrist?: string; hang?: string
}
export type ArmsSpec = { front: ArmSpec; back: ArmSpec }

const DEG = 180 / Math.PI
const fx = (n: number) => Math.round(n * 100) / 100

/** The elbow bend for an arm reaching (tx, ty) from its shoulder: the elbow and the wrist it can actually reach. */
export function reach(a: ArmSpec, tx: number, ty: number) {
  const [sx, sy] = a.shoulder
  let dx = tx - sx, dy = ty - sy
  const max = a.upper + a.fore - 0.01, min = Math.abs(a.upper - a.fore) + 0.01
  let d = Math.hypot(dx, dy) || 0.01
  if (d > max) { dx *= max / d; dy *= max / d; d = max }
  if (d < min) { dx *= min / d; dy *= min / d; d = min }
  const cosA = (a.upper * a.upper + d * d - a.fore * a.fore) / (2 * a.upper * d)
  const base = Math.atan2(dy, dx), ang = base - a.bend * Math.acos(Math.max(-1, Math.min(1, cosA)))
  const elbow: [number, number] = [sx + Math.cos(ang) * a.upper, sy + Math.sin(ang) * a.upper]
  return { elbow, wrist: [sx + dx, sy + dy] as [number, number] }
}

/** The bend sign that puts the elbow where it is in a drawn pose (shoulder, elbow, wrist). */
export function bendOf(s: [number, number], e: [number, number], w: [number, number]) {
  const cross = (e[0] - s[0]) * (w[1] - s[1]) - (e[1] - s[1]) * (w[0] - s[0])
  return cross > 0 ? -1 : 1
}

/** The arm's markup reaching (tx, ty). */
export function armMarkup(a: ArmSpec, tx: number, ty: number) {
  const { elbow, wrist } = reach(a, tx, ty)
  const [sx, sy] = a.shoulder
  const dir = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]) * DEG
  return `<path d="M${fx(sx)} ${fx(sy)} L ${fx(elbow[0])} ${fx(elbow[1])} L ${fx(wrist[0])} ${fx(wrist[1])}" stroke="${a.color}" stroke-width="${a.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<g transform="translate(${fx(wrist[0])} ${fx(wrist[1])}) rotate(${fx(dir + a.handTurn)})">${a.hand}</g>` +
    (a.wrist ? `<g transform="translate(${fx(wrist[0])} ${fx(wrist[1])}) rotate(${fx(dir)})">${a.wrist}</g>` : '') +
    (a.hang ? `<g transform="translate(${fx(wrist[0])} ${fx(wrist[1])})">${a.hang}</g>` : '')
}
