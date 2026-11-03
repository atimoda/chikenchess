// The aliens' eyes follow the nearest character. Pixel art keeps its eyes as letters: 'w' the white, 'o' the
// pupil. Each eye (a patch of 'w'/'o' cells touching each other) gets its pupil slid inside it toward a
// direction; the frames come back as new rows, so every drawing that paints rows paints the look too.
export type Point = { x: number; y: number }

// the character nearest to a point (each alien picks its own: with several characters on screen online, each
// one looks at whoever is closest to it)
export function nearestPoint(from: Point, points: readonly Point[]): Point | null {
  let best: Point | null = null, bd = Infinity
  for (const p of points) {
    const d = (p.x - from.x) ** 2 + (p.y - from.y) ** 2
    if (d < bd) { bd = d; best = p }
  }
  return best
}

// a unit direction from a point toward another (null when there is nothing to look at)
export function lookDir(from: Point, to: Point | null): Point | null {
  if (!to) return null
  const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy)
  return len < 1 ? null : { x: dx / len, y: dy / len }
}

type Cell = [number, number] // row, column
type Eye = { cells: Set<string>; pupil: Cell[]; shifts: Cell[]; mid: Cell; half: Cell }

const layouts = new WeakMap<readonly string[], Eye[]>()
function eyesOf(rows: readonly string[]): Eye[] {
  const cached = layouts.get(rows)
  if (cached) return cached
  const isEye = (r: number, c: number) => rows[r]?.[c] === 'w' || rows[r]?.[c] === 'o'
  const seen = new Set<string>(), eyes: Eye[] = []
  rows.forEach((row, r0) => {
    for (let c0 = 0; c0 < row.length; c0++) {
      if (!isEye(r0, c0) || seen.has(`${r0},${c0}`)) continue
      // flood the patch
      const cells = new Set<string>(), list: Cell[] = [], stack: Cell[] = [[r0, c0]]
      seen.add(`${r0},${c0}`)
      while (stack.length) {
        const [r, c] = stack.pop()!
        cells.add(`${r},${c}`); list.push([r, c])
        for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]] as Cell[]) {
          if (isEye(nr, nc) && !seen.has(`${nr},${nc}`)) { seen.add(`${nr},${nc}`); stack.push([nr, nc]) }
        }
      }
      const pupil = list.filter(([r, c]) => rows[r][c] === 'o')
      if (!pupil.length) continue
      // the pupil's shape from its top-left corner, and every place it fits whole inside the eye
      const pr = Math.min(...pupil.map(p => p[0])), pc = Math.min(...pupil.map(p => p[1]))
      const shape = pupil.map(([r, c]) => [r - pr, c - pc] as Cell)
      const shifts: Cell[] = []
      for (const [r, c] of list) if (shape.every(([sr, sc]) => cells.has(`${r + sr},${c + sc}`))) shifts.push([r, c])
      const rs = shifts.map(s => s[0]), cs = shifts.map(s => s[1])
      const lo: Cell = [Math.min(...rs), Math.min(...cs)], hi: Cell = [Math.max(...rs), Math.max(...cs)]
      eyes.push({ cells, pupil: shape, shifts, mid: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2], half: [(hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2] })
    }
  })
  layouts.set(rows, eyes)
  return eyes
}

const looks = new WeakMap<readonly string[], Map<string, string[]>>()
// the rows with every pupil slid toward `dir` (screen direction, unit length); null keeps the drawing as it is
export function lookRows(rows: string[], dir: Point | null): string[] {
  if (!dir) return rows
  const eyes = eyesOf(rows)
  if (!eyes.length) return rows
  // where each pupil goes: the place it fits nearest to the eye's middle pushed toward the direction
  const at = eyes.map(e => {
    const want: Cell = [e.mid[0] + dir.y * (e.half[0] + 0.01), e.mid[1] + dir.x * (e.half[1] + 0.01)]
    let best = e.shifts[0], bd = Infinity
    for (const s of e.shifts) { const d = (s[0] - want[0]) ** 2 + (s[1] - want[1]) ** 2; if (d < bd) { bd = d; best = s } }
    return best
  })
  const key = at.map(s => s.join(',')).join(';')
  let byKey = looks.get(rows)
  if (!byKey) { byKey = new Map(); looks.set(rows, byKey) }
  const hit = byKey.get(key)
  if (hit) return hit
  const grid = rows.map(row => row.split(''))
  eyes.forEach((e, i) => {
    e.cells.forEach(k => { const [r, c] = k.split(',').map(Number); grid[r][c] = 'w' })
    e.pupil.forEach(([sr, sc]) => { grid[at[i][0] + sr][at[i][1] + sc] = 'o' })
  })
  const out = grid.map(r => r.join(''))
  byKey.set(key, out)
  return out
}
