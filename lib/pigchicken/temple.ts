// Templo do Gongo: PigChicKen's aliens mini-game, a mix of the old invader games and a rhythm game, in the
// temple scene after the Parquinho. Strike the gong (the totem) a few times to start; each stage brings a new
// kind of alien and a new layer of music; clearing it shows the score and the gong starts the next one.
//
// Everything here is plain data stepped with dt and the conductor's beats, with a seeded random number: the same
// state, inputs and beats give the same game, so it can later be run by a server and sent to every player
// (the aliens' hit points live in the combat's targets, like every other enemy).
import { boxContains, type Box, type Target } from './combat'
import type { Conductor } from './music'
import { SCENE_W } from './world'
import { STAGE_MUSIC, melodyNote, type TempleSound } from './temple-music'

export type Species = 'jelly' | 'lantern' | 'shell' | 'twin' | 'mini' | 'drum' | 'dragon' | 'dragonHead'
export const SPECIES: Record<Species, { name: string; hp: number; points: number; w: number; h: number; color: string }> = {
  jelly: { name: 'Água-viva', hp: 30, points: 100, w: 48, h: 40, color: '#c77dff' },
  lantern: { name: 'Lanterna', hp: 30, points: 150, w: 48, h: 52, color: '#e63946' },
  shell: { name: 'Casco', hp: 120, points: 250, w: 56, h: 40, color: '#6a994e' },
  twin: { name: 'Gêmeos', hp: 50, points: 200, w: 56, h: 36, color: '#4cc9f0' },
  mini: { name: 'Mini', hp: 15, points: 80, w: 32, h: 24, color: '#f72585' },
  drum: { name: 'Tambor', hp: 60, points: 300, w: 48, h: 44, color: '#c1121f' },
  dragon: { name: 'Dragão', hp: 45, points: 200, w: 52, h: 52, color: '#ffb703' },
  dragonHead: { name: 'Cabeça do dragão', hp: 400, points: 2000, w: 84, h: 64, color: '#ff6b35' },
}
const JELLY_COLORS = ['#c77dff', '#7bd88f', '#ffd166', '#4cc9f0', '#f72585']

export type StageDef = {
  name: string; intro: string
  rows: Species[]; cols: number
  bombEvery: number; bombs: number; bombSpeed: number // a bomb drop every N beats, how many aliens drop one, how fast
  diveEvery: number // lanterns: one dives every N beats (0 = never)
  stepPx: number // the formation's step on each beat
  dragon?: boolean
}
export const STAGES: StageDef[] = [
  { name: 'Despertar', intro: 'As águas-vivas marcham no ritmo. Nos tempos vermelhos da pista, elas soltam bombas.', rows: ['jelly', 'jelly', 'jelly'], cols: 7, bombEvery: 4, bombs: 1, bombSpeed: 220, diveEvery: 0, stepPx: 22 },
  { name: 'Lanternas', intro: 'Novo: Lanterna. Ela mergulha em você e volta para a formação.', rows: ['lantern', 'jelly', 'jelly', 'jelly'], cols: 7, bombEvery: 4, bombs: 1, bombSpeed: 240, diveEvery: 6, stepPx: 24 },
  { name: 'Couraça', intro: 'Novo: Casco. Aguenta vários tiros e racha aos poucos.', rows: ['shell', 'lantern', 'jelly', 'jelly'], cols: 7, bombEvery: 2, bombs: 1, bombSpeed: 250, diveEvery: 6, stepPx: 24 },
  { name: 'Gêmeos', intro: 'Novo: Gêmeos. Derrubado, vira dois pequenos que voam soltos.', rows: ['twin', 'shell', 'lantern', 'jelly'], cols: 6, bombEvery: 2, bombs: 2, bombSpeed: 270, diveEvery: 4, stepPx: 26 },
  { name: 'Tambores', intro: 'Novo: Tambor. Só abre no tempo da música: acerte no compasso!', rows: ['drum', 'twin', 'lantern', 'jelly'], cols: 7, bombEvery: 2, bombs: 2, bombSpeed: 290, diveEvery: 6, stepPx: 26 },
  { name: 'Dragão', intro: 'O dragão do templo! Destrua o corpo para expor a cabeça.', rows: [], cols: 0, bombEvery: 4, bombs: 1, bombSpeed: 300, diveEvery: 0, stepPx: 0, dragon: true },
]
export const GONG_FIRST = 5, GONG_NEXT = 3
// the reset stone (Recomeçar): this many strikes put the temple back at rest, panels and score cleared
export const RESET_NEED = 3
export const RESET_X = 1770
// the jukebox (the songs of the guitar hero mode), left of the reset stone
export const DISC_X = 1640
const MAX_HEARTS = 3
const INTRO = 3.2
const DRAGON_SEGMENTS = 14

export type Phase = 'idle' | 'intro' | 'playing' | 'cleared' | 'failed' | 'victory'
// one alien of the temple: its behaviour (the combat's target with the same id holds its hit points)
export type TempleAlien = {
  id: number; sp: Species; col: number; row: number
  mode: 'form' | 'dive' | 'free' | 'dragon'
  u: number; dur: number; tx: number; side: number // a dive: progress 0..1, its length (s), where it aims, which way it loops
  vx: number; by: number // flying free: speed and the height it drifts at
  seg: number // the dragon: 0 the head, 1.. the body
  charge: number // about to drop a bomb on the next drop beat (glows)
  lastHp: number
  x: number; y: number // centre, world units
}
export const BOMB_R = 9 // a bomb's radius, for the peck's defence
export type Bomb = { x: number; y: number; vx: number; vy: number; kind: 'orb' | 'fire'; t: number }
export type Banner = { title: string; sub: string; color: string; t: number; life: number }
export type Judge = { grade: 'perfect' | 'good' | 'miss'; t: number }
export type TempleState = {
  phase: Phase; stage: number; t: number
  gongHits: number; gongNeed: number; gongRing: number // the ring of light of the last strike (s since)
  resetHits: number; resetRing: number // the reset stone: strikes so far, s since the last one
  hearts: number; invuln: number; hurtT: number
  score: number; stageScore: number; combo: number; bestCombo: number; judge: Judge | null
  melodyStep: number; rng: number
  f: { x: number; y: number; goalX: number; dir: number; targetY: number; gap: number } | null
  aliens: TempleAlien[]; bombs: Bomb[]
  dragonT: number
  banner: Banner | null
  welcomed: boolean; outsideT: number
  kills: number; perfects: number
}

export function newTempleState(seed = 1): TempleState {
  return {
    phase: 'idle', stage: 0, t: 0, gongHits: 0, gongNeed: GONG_FIRST, gongRing: 9, resetHits: 0, resetRing: 9,
    hearts: MAX_HEARTS, invuln: 0, hurtT: 9, score: 0, stageScore: 0, combo: 0, bestCombo: 0, judge: null,
    melodyStep: 0, rng: seed >>> 0 || 1, f: null, aliens: [], bombs: [], dragonT: 0, banner: null, welcomed: false, outsideT: 0, kills: 0, perfects: 0,
  }
}

// what the temple needs from the Parquinho each frame
export type TempleIO = {
  targets: Target[]
  music: Conductor
  sceneL: number // the temple scene's left edge (world x)
  groundY: number
  inside: boolean // she is in the temple scene
  body: { x: number; y: number; scale: number }
  boxes: Box[]
  gongHit: boolean // the gong (totem) was struck this frame
  // a song of the jukebox is picked (not the campaign): the gong's strikes start it instead of the campaign
  song?: () => void
  // start the campaign now (the jukebox's Tocar), as if the gong had been struck enough
  start?: boolean
  resetHit?: boolean // the reset stone was struck this frame
  firePressed: boolean
  beats: number[] // conductor beats that started this frame
  fx: { burst: (x: number, y: number, n: number, color: string, speed?: number, size?: number) => void; text: (x: number, y: number, text: string, color?: string, size?: number) => void }
  hurt: (dir: number) => void // knock the chicken back
  sound: (s: TempleSound) => void
  // a peck defending where a bomb is cancels it (it vanishes in a little cloud)
  parry?: (x: number, y: number, r: number, color: string) => boolean
}

// the stage's mult: a long rhythm combo multiplies the points
export const multOf = (combo: number) => 1 + Math.min(3, Math.floor(combo / 8))
// rhythm windows: a press this close to a beat (s) is perfect / good
export const PERFECT = 0.07, GOOD = 0.14
// the drum aliens open around each beat (beat phase)
export const drumOpen = (beatPhase: number) => beatPhase < 0.22 || beatPhase > 0.9
// the gong totem's place in the temple scene
export const GONG_X = 560

let nextId = 2_000_000

export function createTemple(seed = 1) {
  const s = newTempleState(seed)
  // mulberry32 on the state's seed, so the game replays the same from the same state
  const rand = () => {
    s.rng = (s.rng + 0x6d2b79f5) >>> 0
    let r = s.rng
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  const banner = (title: string, sub: string, color: string, life = 3.5) => { s.banner = { title, sub, color, t: 0, life } }

  function addAlien(io: TempleIO, sp: Species, x: number, y: number, extra: Partial<TempleAlien> = {}, color?: string) {
    const d = SPECIES[sp]
    const id = nextId++
    io.targets.push({
      id, kind: 'alien', home: 0, x, y: y + d.h / 2, w: d.w, h: d.h, hp: d.hp, maxHp: d.hp, flash: 0, wobble: 0, vx: 0, deadT: 0,
      face: 1, state: 'fly', animT: rand(), data: { kind: 'temple', species: sp, color: color ?? d.color },
    })
    const a: TempleAlien = { id, sp, col: 0, row: 0, mode: 'form', u: 0, dur: 0, tx: 0, side: 1, vx: 0, by: y, seg: 0, charge: 0, lastHp: d.hp, x, y, ...extra }
    s.aliens.push(a)
    return a
  }

  function clearAliens(io: TempleIO, puff: boolean) {
    const ids = new Set(s.aliens.map(a => a.id))
    for (let i = io.targets.length - 1; i >= 0; i--) if (ids.has(io.targets[i].id)) {
      const t = io.targets[i]
      if (puff) io.fx.burst(t.x, t.y - t.h / 2, 10, '#e9e4d0', 160, 3)
      io.targets.splice(i, 1)
    }
    s.aliens = []; s.bombs = []
  }

  function startStage(io: TempleIO, i: number) {
    clearAliens(io, false)
    if (i === 0) { s.score = 0; s.bestCombo = 0 }
    s.stage = i; s.phase = 'intro'; s.t = 0
    s.hearts = MAX_HEARTS; s.invuln = 0; s.stageScore = 0; s.combo = 0; s.judge = null; s.melodyStep = 0; s.kills = 0; s.perfects = 0
    s.gongHits = 0
    const st = STAGES[i]
    const L = io.sceneL
    if (st.dragon) {
      s.f = null; s.dragonT = 0
      for (let k = 0; k <= DRAGON_SEGMENTS; k++) addAlien(io, k === 0 ? 'dragonHead' : 'dragon', L + SCENE_W / 2, -200, { mode: 'dragon', seg: k })
      io.sound({ kind: 'roar' })
    } else {
      const gap = 84
      const width = (st.cols - 1) * gap
      s.f = { x: L + SCENE_W / 2 - width / 2, y: -st.rows.length * gap - 60, goalX: L + SCENE_W / 2 - width / 2, dir: 1, targetY: 170, gap }
      st.rows.forEach((sp, r) => {
        for (let c = 0; c < st.cols; c++) addAlien(io, sp, s.f!.x + c * gap, s.f!.y + r * gap, { col: c, row: r }, sp === 'jelly' ? JELLY_COLORS[(r + i) % JELLY_COLORS.length] : undefined)
      })
    }
    banner(`Fase ${i + 1} · ${st.name}`, st.intro, STAGE_MUSIC[i].zone.color, INTRO + 0.6)
    io.sound({ kind: 'stageStart', root: STAGE_MUSIC[i].zone.root })
  }

  function fail(io: TempleIO, why: string) {
    clearAliens(io, true)
    s.phase = 'failed'; s.t = 0; s.gongHits = 0; s.gongNeed = GONG_NEXT
    banner('Fase perdida', `${why} Bata ${GONG_NEXT} vezes no gongo para tentar de novo (ou ${RESET_NEED} na pedra Recomeçar para voltar ao início).`, '#ff6b5b', 6)
    io.sound({ kind: 'fail' })
  }

  function clear(io: TempleIO) {
    s.phase = s.stage >= STAGES.length - 1 ? 'victory' : 'cleared'
    s.t = 0; s.gongHits = 0; s.bombs = []
    const bonus = s.hearts * 500
    s.score += bonus; s.stageScore += bonus
    const chord = io.music.chord()
    if (s.phase === 'victory') {
      s.gongNeed = GONG_FIRST
      banner('Templo libertado!', `Pontos ${s.score.toLocaleString('pt-BR')} · combo máximo ${s.bestCombo}. Bata ${GONG_FIRST} vezes no gongo para jogar de novo, ou ${RESET_NEED} na pedra Recomeçar para zerar.`, '#ffd166', 9)
      io.sound({ kind: 'victory', root: io.music.zone.root, chord })
    } else {
      s.gongNeed = GONG_NEXT
      banner('Fase superada!', `+${s.stageScore} pontos (${s.hearts} ♥ = +${bonus}) · combo máximo ${s.bestCombo}. Bata ${GONG_NEXT} vezes no gongo: Fase ${s.stage + 2} · ${STAGES[s.stage + 1].name}.`, '#7bd88f', 7)
      io.sound({ kind: 'clear', root: io.music.zone.root, chord })
    }
  }

  function hurtPlayer(io: TempleIO, fromX: number) {
    if (s.invuln > 0 || (s.phase !== 'playing' && s.phase !== 'intro')) return
    s.hearts--; s.invuln = 1.4; s.hurtT = 0; s.combo = 0
    const dir = Math.sign(io.body.x - fromX) || 1
    io.hurt(dir)
    io.fx.text(io.body.x, io.body.y - 170, '-♥', '#ff6b5b', 26)
    io.fx.burst(io.body.x, io.body.y - 70, 14, '#ff6b5b', 240, 3)
    io.sound({ kind: 'hurt' })
    if (s.hearts <= 0) fail(io, 'Os aliens te derrubaram.')
  }

  // the dragon's path: the head weaves over the temple; each body segment follows a little behind it
  const dragonAt = (L: number, t: number) => ({ x: L + SCENE_W / 2 + Math.sin(t * 0.42) * 760, y: 270 + Math.sin(t * 1.05) * 130 + Math.sin(t * 0.27) * 50 })

  function kill(io: TempleIO, a: TempleAlien, t: Target | undefined) {
    const d = SPECIES[a.sp]
    const mult = multOf(s.combo)
    const pts = d.points * mult
    s.score += pts; s.stageScore += pts; s.kills++
    io.fx.text(a.x, a.y - d.h / 2 - 10, mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, mult > 1 ? '#ffd166' : '#ffffff', 16)
    const midi = melodyNote(STAGE_MUSIC[s.stage], s.melodyStep++)
    io.sound({ kind: 'kill', midi, combo: s.combo, at: io.music.toGrid() })
    if (a.sp === 'twin' && t) {
      // the twins split: two small ones fly off, one each way
      ;[-1, 1].forEach(side => addAlien(io, 'mini', a.x + side * 14, a.y, { mode: 'free', vx: side * (150 + rand() * 60), by: a.y }, side < 0 ? '#4cc9f0' : '#f72585'))
      io.sound({ kind: 'split' })
    }
    if (a.sp === 'dragon') io.fx.burst(a.x, a.y, 18, '#ffb703', 260, 4)
    if (a.sp === 'dragonHead') { io.fx.burst(a.x, a.y, 60, '#ff6b35', 420, 6); io.fx.burst(a.x, a.y, 40, '#ffd166', 300, 4) }
  }

  function step(dt: number, io: TempleIO) {
    s.t += dt
    s.gongRing += dt
    s.invuln = Math.max(0, s.invuln - dt)
    s.hurtT += dt
    if (s.banner) { s.banner.t += dt; if (s.banner.t > s.banner.life) s.banner = null }
    if (s.judge) { s.judge.t += dt; if (s.judge.t > 0.6) s.judge = null }
    const st = STAGES[s.stage]
    const L = io.sceneL, G = io.groundY
    const active = s.phase === 'intro' || s.phase === 'playing'

    // arriving in the temple: the welcome
    if (io.inside && !s.welcomed && s.phase === 'idle') {
      s.welcomed = true
      banner('Templo do Gongo', `Bata ${GONG_FIRST} vezes no gongo (tiro ou golpe) para começar. Bata na jukebox, perto da pedra Recomeçar, para escolher outra música.`, '#ffd166', 6)
    }
    // leaving in the middle of a stage cancels it
    if (active && !io.inside) { s.outsideT += dt; if (s.outsideT > 2.5) { s.outsideT = 0; fail(io, 'Você saiu do templo.') } } else s.outsideT = 0

    // the gong
    if (io.gongHit) {
      s.gongRing = 0
      if (active) io.sound({ kind: 'gongDull' })
      else {
        s.gongHits++
        io.sound({ kind: 'gong', hit: s.gongHits, need: s.gongNeed })
        io.fx.text(L + GONG_X, G - 230, `${Math.min(s.gongHits, s.gongNeed)}/${s.gongNeed}`, '#ffd166', 22)
        if (s.gongHits >= s.gongNeed && io.song) {
          s.gongHits = 0
          io.song()
        } else if (s.gongHits >= s.gongNeed) {
          const next = s.phase === 'cleared' ? s.stage + 1 : s.phase === 'failed' ? s.stage : 0
          startStage(io, next)
        }
      }
    }

    if (io.start && !active && !io.song) {
      s.gongHits = 0
      startStage(io, s.phase === 'cleared' ? s.stage + 1 : s.phase === 'failed' ? s.stage : 0)
    }

    // the reset stone: a few strikes end whatever is on and put the temple back at rest (score and panels cleared)
    s.resetRing += dt
    if (s.resetHits > 0 && s.resetRing > 4) s.resetHits = 0
    if (io.resetHit) {
      s.resetRing = 0
      if (s.phase === 'idle' && s.score === 0) io.sound({ kind: 'gongDull' })
      else {
        s.resetHits++
        io.sound({ kind: 'reset', hit: s.resetHits, need: RESET_NEED })
        io.fx.text(L + RESET_X, G - 170, `${s.resetHits}/${RESET_NEED}`, '#7bdff2', 20)
        if (s.resetHits >= RESET_NEED) {
          clearAliens(io, true)
          Object.assign(s, newTempleState(s.rng), { welcomed: true, resetRing: 0 })
          banner('Templo reiniciado', `Pontos zerados. Bata ${GONG_FIRST} vezes no gongo para começar da Fase 1.`, '#7bdff2', 4)
          return
        }
      }
    }

    // rhythm: every press of fire during a stage is judged against the beat (the pista shows the beats coming)
    if (io.firePressed && s.phase === 'playing') {
      const off = io.music.offBeat()
      const grade: Judge['grade'] = off <= PERFECT ? 'perfect' : off <= GOOD ? 'good' : 'miss'
      s.judge = { grade, t: 0 }
      if (grade === 'miss') s.combo = 0
      else { s.combo++; if (grade === 'perfect') s.perfects++; s.bestCombo = Math.max(s.bestCombo, s.combo) }
      io.sound({ kind: 'judge', grade, midi: io.music.chord()[0] })
    }

    if (s.phase === 'intro' && s.t > INTRO) { s.phase = 'playing'; s.t = 0 }
    if (!active) { s.bombs.length = 0; return }

    // ---------- the aliens: who is still there, who just went down ----------
    const byId = new Map<number, Target>()
    io.targets.forEach(t => { if (t.kind === 'alien') byId.set(t.id, t) })
    for (let i = s.aliens.length - 1; i >= 0; i--) {
      const a = s.aliens[i], t = byId.get(a.id)
      if (!t || t.deadT > 0 || t.state === 'converted') { s.aliens.splice(i, 1); kill(io, a, t); continue }
      if (t.hp < a.lastHp) { if (a.sp === 'shell' || a.sp === 'dragonHead') io.sound({ kind: 'clank' }); a.lastHp = t.hp }
    }
    const beatPhase = io.music.beatPhase
    const playing = s.phase === 'playing'

    // ---------- the formation: it steps on the beat (on the eighths when few are left), down at the sides ----------
    const f = s.f
    const formation = s.aliens.filter(a => a.mode === 'form' || a.mode === 'dive')
    if (f) {
      if (f.y < f.targetY) f.y = Math.min(f.targetY, f.y + (s.phase === 'intro' ? 220 : 60) * dt)
      const total = st.rows.length * st.cols
      const few = formation.length <= Math.max(2, Math.ceil(total * 0.25))
      const steps = playing ? io.beats.length * (few ? 2 : 1) : 0
      for (let k = 0; k < steps; k++) {
        let lo = Infinity, hi = -Infinity
        formation.forEach(a => { const x = f.goalX + a.col * f.gap; lo = Math.min(lo, x - 30); hi = Math.max(hi, x + 30) })
        if (!formation.length) break
        if ((f.dir > 0 && hi + st.stepPx > L + SCENE_W - 50) || (f.dir < 0 && lo - st.stepPx < L + 50)) { f.dir = -f.dir; f.targetY += 34 }
        else f.goalX += f.dir * st.stepPx
      }
      // the step lands fast, like a stomp on the beat
      f.x += (f.goalX - f.x) * Math.min(1, dt * 22)
    }

    // ---------- each alien's place ----------
    const target = (a: TempleAlien) => byId.get(a.id)
    let dragonBody = 0
    s.aliens.forEach(a => { if (a.sp === 'dragon') dragonBody++ })
    // with fewer segments left the dragon gets angrier: it weaves faster
    if (st.dragon) s.dragonT += dt * (1 + 0.6 * (DRAGON_SEGMENTS - dragonBody) / DRAGON_SEGMENTS)
    for (const a of s.aliens) {
      const t = target(a); if (!t) continue
      const d = SPECIES[a.sp]
      if (a.mode === 'form' && f) {
        a.x = f.x + a.col * f.gap; a.y = f.y + a.row * f.gap
      } else if (a.mode === 'dive' && f) {
        // a lantern's dive: down to where she was, a loop to the side, and back up to its place
        a.u += dt / a.dur
        const hx = f.x + a.col * f.gap, hy = f.y + a.row * f.gap
        if (a.u >= 1) { a.mode = 'form'; a.x = hx; a.y = hy }
        else {
          const k = Math.sin(Math.PI * a.u)
          a.x = hx + (a.tx - hx) * k + a.side * Math.sin(2 * Math.PI * a.u) * 140
          a.y = hy + (G - 120 - hy) * k
        }
      } else if (a.mode === 'free') {
        // the minis fly loose: across the temple, bouncing off its sides, slowly lower
        a.x += a.vx * dt
        if (a.x < L + 40) { a.x = L + 40; a.vx = Math.abs(a.vx) } else if (a.x > L + SCENE_W - 40) { a.x = L + SCENE_W - 40; a.vx = -Math.abs(a.vx) }
        a.by = Math.min(G - 300, a.by + 9 * dt)
        a.y = a.by + Math.sin(t.animT * 4 + a.id) * 30
      } else if (a.mode === 'dragon') {
        const enter = Math.min(1, s.dragonT / INTRO)
        const lag = s.dragonT - a.seg * 0.13
        const p = dragonAt(L, lag), q = dragonAt(L, lag - 0.02)
        a.x = p.x; a.y = p.y - (1 - enter) * 600
        t.face = p.x >= q.x ? 1 : -1
        // the head is safe while its body is there
        if (a.sp === 'dragonHead') t.shield = dragonBody > 0 ? 1 : 0
      }
      t.x = a.x + t.vx * 0.05 + (t.blast?.x ?? 0); t.y = a.y + d.h / 2 + (t.blast?.y ?? 0)
      if (a.sp === 'drum') t.shield = drumOpen(beatPhase) ? 0 : 1
      a.charge = Math.max(0, a.charge - dt * 0.3)
      // touching her hurts (divers, minis flying low, the dragon)
      if (playing && Math.abs(a.x - io.body.x) < d.w / 2 + 22 * io.body.scale && a.y + d.h / 2 > io.body.y - 120 * io.body.scale && a.y - d.h / 2 < io.body.y) hurtPlayer(io, a.x)
    }

    // ---------- on the beat: bombs drop on the drop beats (the pista shows them red), lanterns dive ----------
    if (playing) for (const n of io.beats) {
      const drop = n % st.bombEvery === 0, warn = (n + 1) % st.bombEvery === 0
      if (warn) {
        // the next drop's aliens glow one beat ahead: the lowest of a few columns (anyone, for loose ones)
        const lowest = new Map<number, TempleAlien>()
        s.aliens.forEach(a => {
          if (a.mode === 'dragon' && a.sp === 'dragonHead') return
          const key = a.mode === 'form' ? a.col : 1000 + a.id
          const o = lowest.get(key)
          if (!o || a.y > o.y) lowest.set(key, a)
        })
        const pool = [...lowest.values()]
        for (let k = 0; k < st.bombs && pool.length; k++) pool.splice(Math.floor(rand() * pool.length), 1)[0].charge = 1
      }
      if (drop) s.aliens.forEach(a => {
        if (a.charge <= 0.3) return
        a.charge = 0
        s.bombs.push({ x: a.x, y: a.y + SPECIES[a.sp].h / 2, vx: 0, vy: st.bombSpeed, kind: 'orb', t: 0 })
        io.sound({ kind: 'bomb' })
      })
      // the dragon's head spits fire at her every other beat
      if (st.dragon && n % 2 === 0) {
        const h = s.aliens.find(a => a.sp === 'dragonHead')
        if (h) {
          const dx = io.body.x - h.x, dy = io.body.y - 70 - h.y, len = Math.hypot(dx, dy) || 1, v = 340
          s.bombs.push({ x: h.x, y: h.y, vx: dx / len * v, vy: dy / len * v, kind: 'fire', t: 0 })
          io.sound({ kind: 'fire' })
        }
      }
      if (st.diveEvery && n % st.diveEvery === 0) {
        const divers = s.aliens.filter(a => a.sp === 'lantern' && a.mode === 'form')
        if (divers.length) {
          const a = divers[Math.floor(rand() * divers.length)]
          a.mode = 'dive'; a.u = 0; a.dur = io.music.secondsPerBeat() * 4
          a.tx = Math.max(L + 80, Math.min(L + SCENE_W - 80, io.body.x)); a.side = rand() < 0.5 ? -1 : 1
          io.sound({ kind: 'dive' })
        }
      }
    }

    // ---------- bombs and fire: platforms stop them (cover), she loses a heart ----------
    for (let i = s.bombs.length - 1; i >= 0; i--) {
      const b = s.bombs[i]
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt
      if (io.parry?.(b.x, b.y, BOMB_R, b.kind === 'fire' ? '#ffd2b8' : '#f4f1ea')) { s.bombs.splice(i, 1); continue }
      const box = io.boxes.find(q => boxContains(q, b.x, b.y))
      const hitHer = Math.abs(b.x - io.body.x) < 26 * io.body.scale + 8 && b.y > io.body.y - 120 * io.body.scale && b.y < io.body.y
      if (hitHer) hurtPlayer(io, b.x)
      if (hitHer || box || b.y >= G || b.t > 8) {
        io.fx.burst(b.x, Math.min(b.y, G - 2), 8, b.kind === 'fire' ? '#ff6b35' : '#ff4d6d', 160, 3)
        s.bombs.splice(i, 1)
      }
    }

    // ---------- the end of the stage ----------
    if (s.phase !== 'playing' && s.phase !== 'intro') return
    if (f && formation.some(a => a.mode === 'form' && a.y + SPECIES[a.sp].h / 2 > G - 150)) { fail(io, 'Os aliens invadiram o templo.'); return }
    if (playing && s.aliens.length === 0) clear(io)
  }

  return {
    state: s,
    step,
    // the stage whose music plays: the one being played, the one just cleared (until the next starts) or none at rest
    get music() { return s.phase === 'idle' || s.phase === 'victory' ? null : STAGE_MUSIC[s.stage] },
    // the beats when bombs fall, for the pista
    isDropBeat(n: number) { return (s.phase === 'playing' || s.phase === 'intro') && n % STAGES[s.stage].bombEvery === 0 },
    reset(io: Pick<TempleIO, 'targets' | 'fx'>) { clearAliens(io as TempleIO, false); Object.assign(s, newTempleState(s.rng)) },
  }
}

export type Temple = ReturnType<typeof createTemple>
