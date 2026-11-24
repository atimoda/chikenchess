// Where two floating lines cross (a wire over another wire, a wire through a roof line), which one she walks on.
// Pure: the engine (engine.ts) calls it while she walks on a floor and moves her onto the piece it returns.
// Like a wall that she climbs by pushing into it, Up held with a direction takes the branch that climbs more toward
// where she walks, and Crouch (Agachar) with a direction the one that goes down more. With neither she stays on hers.

// a floor piece, screen px (y grows downward); ax !== bx
export type LinePiece = { ax: number; ay: number; bx: number; by: number }

// how much the piece climbs for each pixel walked toward dir (-1 left, 1 right); negative when it goes down
export function climbToward(p: LinePiece, dir: number) {
  return -((p.by - p.ay) / (p.bx - p.ax)) * dir
}

function yAt(p: LinePiece, x: number) {
  if (x < Math.min(p.ax, p.bx) || x > Math.max(p.ax, p.bx)) return null
  return p.ay + (p.by - p.ay) * (x - p.ax) / (p.bx - p.ax)
}

// the branches must differ at least this much in climb per pixel (about 8.5°) to count as a fork
export const MIN_FORK = 0.15

// standing at (x, y) on `cur`, walking toward dir with want = 1 (Up) or -1 (Crouch): the crossing piece among
// `others` (floors of other lines) to step onto, or null. step: how far she moves in a frame (px), so the crossing
// is never skipped between two frames; slack: a little more room (px).
export function crossingBranch<T extends LinePiece>(cur: LinePiece, others: T[], x: number, y: number, dir: number, want: number, step: number, slack: number): T | null {
  if (!dir || !want) return null
  const mine = climbToward(cur, dir)
  let best: T | null = null, bestClimb = 0
  for (const o of others) {
    if (o.ax === o.bx) continue
    const oy = yAt(o, x)
    if (oy === null) continue
    const climb = climbToward(o, dir), gap = (climb - mine) * want
    if (gap < MIN_FORK) continue
    // near the crossing: the two lines part by `gap` per pixel walked, and she walks up to `step` per frame
    if (Math.abs(oy - y) > Math.abs(climb - mine) * step + slack) continue
    if (!best || climb * want > bestClimb * want) { best = o; bestClimb = climb }
  }
  return best
}
