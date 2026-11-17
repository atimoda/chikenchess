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
// l, r: the scene it keeps to (where it was called); without them, the part of the world on screen
type Formation = { x: number; y: number; dir: number; targetY: number; speed: number; cols: number; gap: number; total: number; l?: number; r?: number }
export type EnemyData =
  | { kind: 'alien'; f: Formation; col: number; row: number; color: string }
  | { kind: 'zombie'; speed: number; bit: boolean; race: string; hue: number }
  // the temple's aliens (lib/pigchicken/temple.ts moves them; here they only blink and die)
  | { kind: 'temple'; species: string; color: string }

// nearest: the chicken a zombie goes for (online: any browser's); by default the player at playerX, playerY
export type EnemyEnv = {
  playerX: number; playerY: number; groundY: number; viewL: number; viewR: number
  nearest?: (x: number, y: number) => { x: number; y: number }
  onBite: (t: Target, at?: { x: number; y: number }) => void
  // the zombies' wandering draws from here (tests pass a fixed sequence); Math.random by default
  rand?: () => number
}

let nextId = 1_000_000

// One sprite set supports several zombie races through distinct color mutations.
export const ZOMBIE_RACES = [
  { id: 'moss', label: 'Musgo', hue: 55 },
  { id: 'violet', label: 'Violeta', hue: 245 },
  { id: 'ice', label: 'Gelo', hue: 170 },
  { id: 'rust', label: 'Ferrugem', hue: 330 },
  { id: 'sickly', label: 'Amarelado', hue: 85 },
] as const

function zombieRace() { return ZOMBIE_RACES[Math.floor(Math.random() * ZOMBIE_RACES.length)] }

export function spawnAlienRow(targets: Target[], env: EnemyEnv, cols = 6, rows = 3) {
  const gap = 70
  const width = (cols - 1) * gap
  const f: Formation = { x: (env.viewL + env.viewR) / 2 - width / 2, y: -rows * gap - 40, dir: 1, targetY: 130, speed: 80, cols, gap, total: cols * rows, l: env.viewL, r: env.viewR }
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
    const race = zombieRace()
    targets.push({
      id: nextId++, kind: 'zombie', home: 0, x, y: env.groundY, w: 56, h: 160, hp: 60, maxHp: 60, flash: 0, wobble: 0, vx: 0, deadT: 0,
      face: left ? 1 : -1, state: 'walk', animT: Math.random(), data: { kind: 'zombie', speed: 55 + Math.random() * 30, bit: false, race: race.id, hue: race.hue },
    })
  }
}

export function spawnZombieAt(targets: Target[], x: number, groundY: number) {
  const race = zombieRace()
  targets.push({
    id: nextId++, kind: 'zombie', home: x, x, y: groundY, w: 56, h: 160, hp: 60, maxHp: 60, flash: 0, wobble: 0, vx: 0, deadT: 0,
    face: Math.random() < 0.5 ? 1 : -1, state: 'walk', animT: Math.random(), data: { kind: 'zombie', speed: 55 + Math.random() * 30, bit: false, race: race.id, hue: race.hue },
  })
}

export const ZOMBIE_TIMES = { attack: 0.7, bite: 0.45, hurt: 0.35, dead: 1.2, fade: 0.6 }

// A zombie that cannot reach her (she is up on a platform, or below one) prowls around her instead of piling up
// under her: after `lost` seconds out of reach, each one keeps its own spot `near`..`far` from her (to either side,
// often crossing under her), walks there at its own slower pace, stands a moment looking at her and picks another.
// `reachY`: how far above or below her a zombie still bites (the same reach as before).
export const ZOMBIE_ROAM = { reachY: 120, lost: 0.5, near: 60, far: 260, cross: 0.65, waitMin: 0.35, waitMax: 1.8, paceMin: 0.4, paceMax: 0.75, rush: 420 }
// owner-side only (not part of the zombie's shared data): where it is heading around her, how long it still waits
type Roam = { lostT: number; off: number; wait: number; pace: number }
const roams = new WeakMap<Target, Roam>()
function roamSpot(prev: number, rand: () => number) {
  const side = prev === 0 ? (rand() < 0.5 ? -1 : 1) : rand() < ZOMBIE_ROAM.cross ? -Math.sign(prev) : Math.sign(prev)
  return side * (ZOMBIE_ROAM.near + rand() * (ZOMBIE_ROAM.far - ZOMBIE_ROAM.near))
}
/** the spot around her a roaming zombie is heading to (offset from her x), or null while it is chasing her */
export function zombieRoamSpot(t: Target): number | null {
  const r = roams.get(t)
  return r && r.lostT >= ZOMBIE_ROAM.lost ? r.off : null
}
export const ALIEN_DEATH = 0.35

// moves every enemy; returns false for the ones to remove
export function stepEnemy(t: Target, dt: number, env: EnemyEnv): boolean {
  const d = t.data as EnemyData | undefined
  if (!d) return true
  t.animT += dt
  t.flash = Math.max(0, t.flash - dt)
  if (d.kind === 'temple') {
    if (t.deadT > 0) { t.deadT -= dt; return t.deadT > 0 }
    t.vx *= Math.pow(0.01, dt)
    return true
  }
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
  const her = env.nearest ? env.nearest(t.x, t.y) : { x: env.playerX, y: env.playerY }
  const dx = her.x - t.x
  if (t.state === 'hurt') { if (t.animT > ZOMBIE_TIMES.hurt) { t.state = 'walk'; t.animT = 0 } return true }
  if (t.state === 'attack') {
    if (!d.bit && t.animT > ZOMBIE_TIMES.bite) { d.bit = true; if (Math.abs(dx) < 90 && Math.abs(her.y - t.y) < 120) env.onBite(t, her) }
    if (t.animT > ZOMBIE_TIMES.attack) { t.state = 'walk'; t.animT = 0 }
    return true
  }
  const rand = env.rand ?? Math.random
  if (Math.abs(her.y - t.y) >= ZOMBIE_ROAM.reachY) {
    let r = roams.get(t)
    if (!r) { r = { lostT: 0, off: 0, wait: 0, pace: ZOMBIE_ROAM.paceMin + rand() * (ZOMBIE_ROAM.paceMax - ZOMBIE_ROAM.paceMin) }; roams.set(t, r) }
    r.lostT += dt
    // a jump does not make it give up: it keeps walking at her for a moment
    if (r.lostT >= ZOMBIE_ROAM.lost) return roam(t, d, r, dx, dt, rand)
  } else roams.delete(t)
  if (t.state === 'idle') { t.state = 'walk'; t.animT = 0 }
  t.face = Math.sign(dx) || t.face
  if (Math.abs(dx) < 62 && Math.abs(her.y - t.y) < ZOMBIE_ROAM.reachY) { t.state = 'attack'; t.animT = 0; d.bit = false; return true }
  t.x += t.face * d.speed * dt
  return true
}

function roam(t: Target, d: EnemyData & { kind: 'zombie' }, r: Roam, dx: number, dt: number, rand: () => number) {
  // the first spot is on the side it came from
  if (r.off === 0) r.off = (-Math.sign(dx) || 1) * (ZOMBIE_ROAM.near + rand() * (ZOMBIE_ROAM.far - ZOMBIE_ROAM.near))
  if (r.wait > 0) {
    // standing, looking at her
    if (t.state !== 'idle') { t.state = 'idle'; t.animT = 0 }
    t.face = Math.sign(dx) || t.face
    r.wait -= dt
    if (r.wait <= 0) r.off = roamSpot(r.off, rand)
    return true
  }
  const gx = dx + r.off
  if (Math.abs(gx) < 4) { r.wait = ZOMBIE_ROAM.waitMin + rand() * (ZOMBIE_ROAM.waitMax - ZOMBIE_ROAM.waitMin); return true }
  if (t.state !== 'walk') { t.state = 'walk'; t.animT = 0 }
  t.face = Math.sign(gx)
  // she went far: it hurries back at its full speed
  const pace = Math.abs(gx) > ZOMBIE_ROAM.rush ? 1 : r.pace
  t.x += t.face * Math.min(Math.abs(gx), d.speed * pace * dt)
  // the steps slow down with it
  t.animT -= dt * (1 - pace)
  return true
}

// the formations move once per frame (not once per alien): sideways, a step down at the screen's sides
// timeAt: the share of the frame a point of the map lives (a Zona's slow motion, zone-physics.ts); a formation moves
// on the time of where its first alien is
export function stepFormations(targets: Target[], frameDt: number, env: EnemyEnv, timeAt?: (x: number, y: number) => number) {
  const groups = new Map<Formation, Target[]>()
  targets.forEach(t => { const d = t.data as EnemyData | undefined; if (d?.kind === 'alien' && t.deadT <= 0) { const g = groups.get(d.f) ?? []; g.push(t); groups.set(d.f, g) } })
  groups.forEach((list, f) => {
    const dt = frameDt * (timeAt?.(list[0].x, list[0].y - list[0].h / 2) ?? 1)
    // entering: come down from above the screen first
    if (f.y < f.targetY - 1) { f.y = Math.min(f.targetY, f.y + 160 * dt); if (f.y < 0) return }
    else if (f.y < f.targetY) f.y = f.targetY
    let lo = Infinity, hi = -Infinity
    list.forEach(t => { const d = t.data as EnemyData & { kind: 'alien' }; const x = f.x + d.col * f.gap; lo = Math.min(lo, x - t.w / 2); hi = Math.max(hi, x + t.w / 2) })
    f.x += f.dir * f.speed * dt
    const floor = env.groundY - 230 - (Math.max(...list.map(t => (t.data as EnemyData & { kind: 'alien' }).row)) + 1) * f.gap
    if ((f.dir > 0 && hi >= (f.r ?? env.viewR) - 30) || (f.dir < 0 && lo <= (f.l ?? env.viewL) + 30)) {
      f.dir = -f.dir
      f.x += f.dir * f.speed * dt * 2
      if (f.targetY < floor) f.targetY = Math.min(floor, f.targetY + 36)
      // fewer aliens left: the rest speed up
      f.speed = 80 + (f.total - list.length) * 6
    }
  })
}
