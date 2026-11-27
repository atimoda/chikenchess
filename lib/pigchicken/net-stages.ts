// The fases de notas (lib/pigchicken/note-stage.ts) played in another browser, online. A stage runs only in the
// browser of the player whose fan it is (its timing stays exact there); 10 times a second that browser says what it
// looks like (the song, the score, the hearts, the afinação, where her fan is, its aliens and its note shots) in the
// same list as the shots (lib/pigchicken/net-world-sync.ts; any server relays it as it is, an older browser drops the
// kind it does not know). The others draw it, hear the notes she rebates, and keep its zone busy: nobody starts
// another song there while it plays.
import { SPECIES, type Species } from './temple'

// an alien: x, y (its feet), w, h, species, colour, size, 1 dying
export type NetStageAlien = [number, number, number, number, Species, string, number, number]
// a note shot: its id, x, y, vx, vy, colour, radius, state (0 coming, 1 rebated, 2 missed), the note
export type NetStageShot = [number, number, number, number, number, string, number, number, number]
// s: the slot of the player (in her browser) whose fan it is; z: the zone it is bound to; n: the song's name; c: its
// colour; sc, cb: score and combo; h, hm: hearts left and given; af: afinação (0..1); x, y: her fan's centre.
// cp: 1, the Templo do Gongo's campaign (n: its phase; no fan nor afinação; the shots are its bombs)
export type NetStageAct = { k: 'ns'; s: number; z: string; n: string; c: string; sc: number; cb: number; h: number; hm: number; af: number; x: number; y: number; a: NetStageAlien[]; q: NetStageShot[]; cp?: 1 }

export const STAGE_ACT_MS = 100 // how often a stage is said
export const STAGE_HOLD_MS = 600 // a stage nobody says again for this long is over
export const STAGE_ALIENS_MAX = 24, STAGE_SHOTS_MAX = 48
const LIMIT = 1e6
const COLOR = /^[#a-z0-9(),.% -]{1,40}$/i
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const cap = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const r1 = (v: number) => Math.round(v * 10) / 10
const pos = (v: unknown): v is number => num(v) && Math.abs(v) < LIMIT
const color = (v: unknown, or: string) => (typeof v === 'string' && COLOR.test(v) ? v : or)

type StageLike = {
  zone: string; song: { name: string; music: { zone: { color: string } } }; request: { goal: { hearts: number } } | null
  source: string; state: { score: number; combo: number; hearts: number; afina: number; center: { x: number; y: number }; aliens: readonly { id: number }[] }
}
type TargetLike = { id: number; x: number; y: number; w: number; h: number; deadT: number; data?: unknown }
type ShotLike = { id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; state: 'incoming' | 'rebated' | 'missed'; midi: number; source: string }

/** what a stage playing here looks like to the others (slot: its player's, in this browser) */
export function stageAct(st: StageLike, slot: number, targets: readonly TargetLike[], shots: readonly ShotLike[]): NetStageAct {
  const mine = new Set(st.state.aliens.map(a => a.id))
  const a: NetStageAlien[] = []
  for (const t of targets) {
    if (!mine.has(t.id) || a.length >= STAGE_ALIENS_MAX) continue
    const d = (t.data ?? {}) as { species?: Species; color?: string; size?: number }
    if (!d.species) continue
    a.push([Math.round(t.x), Math.round(t.y), Math.round(t.w), Math.round(t.h), d.species, d.color ?? SPECIES[d.species]?.color ?? '#ffffff', r1(d.size ?? 1), t.deadT > 0 ? 1 : 0])
  }
  const q: NetStageShot[] = []
  for (const n of shots) {
    if (n.source !== st.source || q.length >= STAGE_SHOTS_MAX) continue
    q.push([n.id, Math.round(n.x), Math.round(n.y), Math.round(n.vx), Math.round(n.vy), n.color, r1(n.size), n.state === 'incoming' ? 0 : n.state === 'rebated' ? 1 : 2, r1(n.midi)])
  }
  const s = st.state
  return {
    k: 'ns', s: slot, z: st.zone, n: st.song.name.slice(0, 60), c: st.song.music.zone.color, sc: Math.round(s.score), cb: s.combo, h: s.hearts, hm: st.request?.goal.hearts ?? 0,
    af: Math.round(s.afina * 100) / 100, x: Math.round(s.center.x), y: Math.round(s.center.y), a, q,
  }
}

type CampaignLike = { phase: string; score: number; combo: number; hearts: number; aliens: readonly { id: number }[]; bombs: readonly { x: number; y: number; vx: number; vy: number; kind: 'orb' | 'fire' }[] }
/** the Templo do Gongo's campaign playing here (zone: its scene's; name: its phase; at: the player's body) */
export function campaignAct(c: CampaignLike, slot: number, zone: string, name: string, hearts: number, at: { x: number; y: number }, targets: readonly TargetLike[]): NetStageAct {
  const st: StageLike = {
    zone, song: { name, music: { zone: { color: '#ffd166' } } }, request: { goal: { hearts } }, source: '',
    state: { score: c.score, combo: c.combo, hearts: c.hearts, afina: 0, center: at, aliens: c.aliens },
  }
  const act = stageAct(st, slot, targets, [])
  act.q = c.bombs.slice(0, STAGE_SHOTS_MAX).map((b, i) => [i, Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.kind === 'fire' ? '#ff8c1a' : '#ff4d6d', 9, 0, 0])
  act.cp = 1
  return act
}

/** a stage as another browser says it (null: not one) */
export function cleanStageAct(o: unknown): NetStageAct | null {
  const v = o as Record<string, unknown> | null
  if (!v || typeof v !== 'object' || v.k !== 'ns' || !num(v.s) || v.s < 0 || v.s > 3 || typeof v.z !== 'string' || v.z.length > 120 || typeof v.n !== 'string') return null
  if (![v.sc, v.cb, v.h, v.hm, v.af].every(num) || !pos(v.x) || !pos(v.y) || !Array.isArray(v.a) || !Array.isArray(v.q)) return null
  const a: NetStageAlien[] = []
  for (const e of v.a.slice(0, STAGE_ALIENS_MAX)) {
    if (!Array.isArray(e) || e.length < 8 || !pos(e[0]) || !pos(e[1]) || !num(e[2]) || !num(e[3]) || typeof e[4] !== 'string' || !(e[4] in SPECIES) || !num(e[6])) continue
    a.push([e[0], e[1], cap(e[2], 1, 600), cap(e[3], 1, 600), e[4] as Species, color(e[5], SPECIES[e[4] as Species].color), cap(e[6], 0.2, 5), e[7] ? 1 : 0])
  }
  const q: NetStageShot[] = []
  for (const e of v.q.slice(0, STAGE_SHOTS_MAX)) {
    if (!Array.isArray(e) || e.length < 9 || !num(e[0]) || !pos(e[1]) || !pos(e[2]) || !num(e[3]) || !num(e[4]) || !num(e[6]) || !num(e[8])) continue
    q.push([e[0], e[1], e[2], cap(e[3], -5000, 5000), cap(e[4], -5000, 5000), color(e[5], '#ffffff'), cap(e[6], 1, 60), e[7] === 1 ? 1 : e[7] === 2 ? 2 : 0, cap(e[8], 0, 127)])
  }
  return {
    k: 'ns', s: Math.round(v.s), z: v.z, n: v.n.slice(0, 60), c: color(v.c, '#ffd166'), sc: cap(v.sc as number, 0, 1e9), cb: cap(Math.round(v.cb as number), 0, 1e6),
    h: cap(Math.round(v.h as number), 0, 9), hm: cap(Math.round(v.hm as number), 0, 9), af: cap(v.af as number, 0, 1), x: v.x as number, y: v.y as number, a, q,
    ...(v.cp === 1 ? { cp: 1 as const } : {}),
  }
}

export type RemoteStage = { pid: number; act: NetStageAct; at: number }

/** the other browsers' stages, by browser and zone; the notes their players just rebated */
export function createNetStageStore() {
  const stages = new Map<string, RemoteStage>()
  // the shots each stage had rebated already (a note is heard once, when it turns)
  const rebated = new Map<string, Set<number>>()
  const heard: { midi: number; x: number; y: number }[] = []
  const live = (now: number) => { for (const [k, s] of stages) if (now - s.at > STAGE_HOLD_MS) { stages.delete(k); rebated.delete(k) } }
  return {
    receive(pid: number, act: NetStageAct, now: number) {
      const key = `${pid}:${act.z}`
      stages.set(key, { pid, act, at: now })
      const was = rebated.get(key) ?? new Set<number>(), next = new Set<number>()
      for (const q of act.cp ? [] : act.q) if (q[7] === 1) { next.add(q[0]); if (!was.has(q[0]) && heard.length < 16) heard.push({ midi: q[8], x: q[1], y: q[2] }) }
      rebated.set(key, next)
    },
    /** the stages playing now (oldest word first) */
    list(now: number): RemoteStage[] { live(now); return [...stages.values()] },
    /** another browser plays a stage in this zone */
    busy(zone: string, now: number) { live(now); for (const s of stages.values()) if (s.act.z === zone) return true; return false },
    /** the notes rebated since the last call */
    takeHeard() { return heard.splice(0) },
    keep(pids: ReadonlySet<number>) { for (const [k, s] of stages) if (!pids.has(s.pid)) { stages.delete(k); rebated.delete(k) } },
    clear() { stages.clear(); rebated.clear(); heard.length = 0 },
    get size() { return stages.size },
  }
}
export type NetStageStore = ReturnType<typeof createNetStageStore>
export const netStageStore = createNetStageStore()
