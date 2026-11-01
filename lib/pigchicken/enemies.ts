// PigChicKen enemies in the Parquinho: half-aliens coming down from the sky in formations, and zombies walking in
// from the screen's sides. They live in the combat's target list (so every weapon hits them); this moves them.
import type { Target } from './combat'

// Original pixel aliens: a one-eyed jelly with two tentacle frames. '#' body, 'w' eye, 'o' pupil.
export const ALIEN_FRAMES = [
  [
    '....####....',
    '..########..',
    '.##########.',
    '.###wwww###.',
    '####wwww####',
    '.###woow###.',
    '.##########.',
    '..#.####.#..',
    '.#..#..#..#.',
    '#...#..#...#',
  ],
  [
    '....####....',
    '..########..',
    '.##########.',
    '.###wwww###.',
    '####wwww####',
    '.###woow###.',
    '.##########.',
    '..#.####.#..',
    '..#.#..#.#..',
    '.#..#..#..#.',
  ],
]
export const ALIEN_PIXEL = 4
export const ALIEN_COLORS = ['#c77dff', '#4cc9f0', '#f72585', '#ffd166', '#7bd88f']

export type AlienPattern = 'row'
export const ALIEN_PATTERNS: { id: AlienPattern; label: string }[] = [{ id: 'row', label: 'Fileira' }]

// a formation: every alien of a horde keeps its slot in it
type Formation = { x: number; y: number; dir: number; targetY: number; speed: number; cols: number; gap: number; total: number }
export type EnemyData =
  | { kind: 'alien'; f: Formation; col: number; row: number; color: string }
  | { kind: 'zombie'; speed: number; bit: boolean }

export type EnemyEnv = { playerX: number; playerY: number; groundY: number; viewL: number; viewR: number; onBite: (t: Target) => void }

let nextId = 1_000_000

export function spawnAlienRow(targets: Target[], env: EnemyEnv, cols = 6, rows = 3) {
  const gap = 70
  const width = (cols - 1) * gap
  const f: Formation = { x: (env.viewL + env.viewR) / 2 - width / 2, y: -rows * gap - 40, dir: 1, targetY: 130, speed: 80, cols, gap, total: cols * rows }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const w = ALIEN_FRAMES[0][0].length * ALIEN_PIXEL, h = ALIEN_FRAMES[0].length * ALIEN_PIXEL
    targets.push({
      id: nextId++, kind: 'alien', home: 0, x: f.x + c * gap, y: f.y + r * gap, w, h, hp: 30, maxHp: 30, flash: 0, wobble: 0, vx: 0, deadT: 0,
      face: 1, state: 'fly', animT: Math.random(), data: { kind: 'alien', f, col: c, row: r, color: ALIEN_COLORS[r % ALIEN_COLORS.length] },
    })
  }
}

export function spawnZombies(targets: Target[], env: EnemyEnv, count: number) {
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0
    const x = left ? env.viewL - 60 - Math.floor(i / 2) * 90 : env.viewR + 60 + Math.floor(i / 2) * 90
    targets.push({
      id: nextId++, kind: 'zombie', home: 0, x, y: env.groundY, w: 56, h: 160, hp: 60, maxHp: 60, flash: 0, wobble: 0, vx: 0, deadT: 0,
      face: left ? 1 : -1, state: 'walk', animT: Math.random(), data: { kind: 'zombie', speed: 55 + Math.random() * 30, bit: false },
    })
  }
}

export const ZOMBIE_TIMES = { attack: 0.7, bite: 0.45, hurt: 0.35, dead: 1.2, fade: 0.6 }
export const ALIEN_DEATH = 0.35

// moves every enemy; returns false for the ones to remove
export function stepEnemy(t: Target, dt: number, env: EnemyEnv): boolean {
  const d = t.data as EnemyData | undefined
  if (!d) return true
  t.animT += dt
  t.flash = Math.max(0, t.flash - dt)
  if (d.kind === 'alien') {
    if (t.deadT > 0) { t.deadT -= dt; return t.deadT > 0 }
    t.x = d.f.x + d.col * d.f.gap + t.vx * 0.05
    t.y = d.f.y + d.row * d.f.gap + t.h
    t.vx *= Math.pow(0.01, dt)
    return true
  }
  // zombie
  if (t.state === 'dead' || t.state === 'converted') { t.deadT -= dt; return t.deadT > 0 }
  t.x += t.vx * dt; t.vx *= Math.pow(0.02, dt)
  // held still by a note (the violin keeps it still while it plays)
  if ((t.stun ?? 0) > 0) return true
  const dx = env.playerX - t.x
  if (t.state === 'hurt') { if (t.animT > ZOMBIE_TIMES.hurt) { t.state = 'walk'; t.animT = 0 } return true }
  if (t.state === 'attack') {
    if (!d.bit && t.animT > ZOMBIE_TIMES.bite) { d.bit = true; if (Math.abs(dx) < 90 && Math.abs(env.playerY - t.y) < 120) env.onBite(t) }
    if (t.animT > ZOMBIE_TIMES.attack) { t.state = 'walk'; t.animT = 0 }
    return true
  }
  t.face = Math.sign(dx) || t.face
  if (Math.abs(dx) < 62 && Math.abs(env.playerY - t.y) < 120) { t.state = 'attack'; t.animT = 0; d.bit = false; return true }
  t.x += t.face * d.speed * dt
  return true
}

// the formations move once per frame (not once per alien): sideways, a step down at the screen's sides
export function stepFormations(targets: Target[], dt: number, env: EnemyEnv) {
  const groups = new Map<Formation, Target[]>()
  targets.forEach(t => { const d = t.data as EnemyData | undefined; if (d?.kind === 'alien' && t.deadT <= 0) { const g = groups.get(d.f) ?? []; g.push(t); groups.set(d.f, g) } })
  groups.forEach((list, f) => {
    // entering: come down from above the screen first
    if (f.y < f.targetY - 1) { f.y = Math.min(f.targetY, f.y + 160 * dt); if (f.y < 0) return }
    else if (f.y < f.targetY) f.y = f.targetY
    let lo = Infinity, hi = -Infinity
    list.forEach(t => { const d = t.data as EnemyData & { kind: 'alien' }; const x = f.x + d.col * f.gap; lo = Math.min(lo, x - t.w / 2); hi = Math.max(hi, x + t.w / 2) })
    f.x += f.dir * f.speed * dt
    const floor = env.groundY - 230 - (Math.max(...list.map(t => (t.data as EnemyData & { kind: 'alien' }).row)) + 1) * f.gap
    if ((f.dir > 0 && hi >= env.viewR - 30) || (f.dir < 0 && lo <= env.viewL + 30)) {
      f.dir = -f.dir
      f.x += f.dir * f.speed * dt * 2
      if (f.targetY < floor) f.targetY = Math.min(floor, f.targetY + 36)
      // fewer aliens left: the rest speed up
      f.speed = 80 + (f.total - list.length) * 6
    }
  })
}
