// The instruments' and the throwing items' tambor, in the space line (docs/mechanics/patio/item-variations.md → Mira
// espacial): a neon ring round the reticle, one drawing per class, where the weapons have their rounds
// (lib/pigchicken/ammo-hud.ts). What a shot spends leaves the ring and floats off (it does not fall like a round);
// the next note is lit in its scale degree's colour; the notes coming back fill in; Próxima variação sweeps the ring
// back on. Only at the reticle (the scale's fan is already round her shoulder), with the same "Na mira" checkbox.
// Pure state and geometry here; components/pigchicken/draw/note-hud.ts draws it.
import type { ItemDef, ItemId } from './items'

export type NoteStyle = 'dots' | 'bars' | 'trios' | 'rosette' | 'strokes' | 'keys' | 'jingles' | 'lyre' | 'fields' | 'cards' | 'wings' | 'coil' | 'links' | 'pulse' | 'blocks'
/** The instruments' base colour (the next note takes its degree's). */
export const NOTE_CYAN = '#5ee7ff'

const STYLES: Partial<Record<ItemId, { style: NoteStyle; color: string }>> = {
  flute: { style: 'dots', color: NOTE_CYAN },
  sax: { style: 'bars', color: NOTE_CYAN },
  trumpet: { style: 'trios', color: NOTE_CYAN },
  guitar: { style: 'rosette', color: NOTE_CYAN },
  violin: { style: 'strokes', color: NOTE_CYAN },
  keys: { style: 'keys', color: NOTE_CYAN },
  tambourine: { style: 'jingles', color: NOTE_CYAN },
  harp: { style: 'lyre', color: NOTE_CYAN },
  hangdrum: { style: 'fields', color: NOTE_CYAN },
  cardsBlue: { style: 'cards', color: '#7fb2ff' },
  cardsRed: { style: 'cards', color: '#ff6f86' },
  boomerang: { style: 'wings', color: '#ffd38a' },
  mjolnir: { style: 'coil', color: '#8fd3ff' },
  odinstaff: { style: 'coil', color: '#ffd36b' },
  hook: { style: 'links', color: '#d9d7e0' },
  grenade: { style: 'pulse', color: '#ffb347' },
  bat: { style: 'blocks', color: '#ffe0b0' },
}
// past this many the ring would be a blur, like the weapons' pente
export const NOTE_MAX_SLOTS = 60
/** The ring's radius (px), the same as the weapons' HUD. */
export const NOTE_HUD_R = 32
// the special cards of a deck (lib/pigchicken/cards.ts burstsAlone): the 7 and the Ace
export const SPECIAL_CARDS = [6, 13]
const DECK = 14

export type NoteLook = { style: NoteStyle; color: string; n: number; group: number; deg: boolean }

/** How the held item's ring looks, or null when it has none (weapons with a pente, the fixed instruments, consumables). */
export function noteLook(id: ItemId, d: ItemDef): NoteLook | null {
  const s = STYLES[id]
  if (!s) return null
  let n: number
  switch (s.style) {
    case 'cards': n = DECK; break
    case 'wings': n = Math.max(1, Math.min(2, Math.round(d.returnCount ?? 2))); break
    case 'coil': if (!(d.specialCooldown > 0 && d.specialRange > 0)) return null; n = 12; break
    case 'links': n = 10; break
    case 'pulse': n = 16; break
    default: if (!(d.mag >= 1)) return null; n = Math.min(NOTE_MAX_SLOTS, Math.round(d.mag))
  }
  const group = s.style === 'trios' ? 3 : s.style === 'rosette' ? 5 : s.style === 'keys' || s.style === 'bars' ? 4 : 1
  return { style: s.style, color: s.color, n, group, deg: !!d.instrument }
}
/** The styles that count notes in the magazine (the rest show cards, wings, a special or a charge). */
export const countsAmmo = (s: NoteStyle) => !['cards', 'wings', 'coil', 'links', 'pulse'].includes(s)

// ---------- geometry (in units of the ring's radius, around 0, 0; angles from +x, y down) ----------
export type NoteSlot = { a: number; r: number; a0: number; a1: number; r0: number; r1: number }
const DEG = Math.PI / 180, TAU = Math.PI * 2, TOP = -Math.PI / 2
const slot = (a: number, r: number, half = 0, r0 = r, r1 = r): NoteSlot => ({ a, r, a0: a - half, a1: a + half, r0, r1 })
/** The Violão's rings: [count, radius] from the inside out. */
export function rosetteRings(n: number): [number, number][] {
  if (n < 9) return [[n, 0.88]]
  const inner = Math.round(n * 0.25), mid = Math.round(n / 3)
  return [[inner, 0.5], [mid, 0.69], [n - inner - mid, 0.88]]
}
/** The Teclado's black keys (the octave's pattern from C). */
export const blackKey = (j: number) => [1, 3, 6, 8, 10].includes(j % 12)
/** How many dots each of the Hangdrum's 8 fields keeps. */
export const fieldSize = (n: number) => Math.max(1, Math.ceil(n / 8))

/** Slot j (0 … n-1) of the ring: where it is; the arc (a0..a1) or the ray (r0..r1) it fills. */
export function noteSlot(look: NoteLook, j: number): NoteSlot {
  const n = Math.max(1, look.n)
  switch (look.style) {
    case 'dots': return slot(TOP + j * TAU / n, 0.86)
    case 'bars': return slot(TOP + j * TAU / n, 0.8, 0, 0.66, 0.94)
    case 'keys': { const a = TOP + j * TAU / n; return slot(a, 0.8, 0, blackKey(j) ? 0.77 : 0.62, 0.95) }
    case 'pulse': return slot(TOP + j * TAU / n, 0.8, 0, 0.68, 0.92)
    case 'strokes': case 'blocks': case 'coil': {
      const w = TAU / n, gap = (look.style === 'coil' ? 3.5 : look.style === 'blocks' ? 5 : 6) * DEG
      return slot(TOP + (j + 0.5) * w, look.style === 'coil' ? 0.88 : 0.84, w / 2 - gap)
    }
    case 'trios': {
      // two arcs like the Rifle's (left: the first half), in threes with a wider gap between each three
      const left = Math.ceil(n / 2), side = j < left, k = side ? j : j - left, m = side ? left : n - left
      const groups = Math.ceil(m / 3), ws = 110 / (m + (m - 1) * 0.25 + Math.max(0, groups - 1) * 0.65)
      const off = k * ws * 1.25 + Math.floor(k / 3) * ws * 0.65, total = m * ws + (m - 1) * ws * 0.25 + Math.max(0, groups - 1) * ws * 0.65
      const at = off - total / 2 + ws / 2, a = (side ? 180 - at : at) * DEG
      return slot(a, 0.88, ws / 2 * DEG)
    }
    case 'rosette': {
      let base = 0
      for (const [m, r] of rosetteRings(n)) {
        if (j < base + m) { const w = TAU / m, a = TOP + (j - base + 0.5) * w; return slot(a, r, w / 2 - 2.2 * DEG) }
        base += m
      }
      return slot(TOP, 0.88)
    }
    case 'jingles': return slot(TOP + j * TAU / n, 0.92)
    case 'lyre': { const a = (160 - (n > 1 ? j * 140 / (n - 1) : 70)) * DEG; return slot(a, 0.95, 0, 0.74, 1.18) }
    case 'fields': {
      const f = fieldSize(n), field = Math.floor(j / f), d = j - field * f, fa = TOP + field * TAU / 8
      const t = (d - (f - 1) / 2) * 0.065, x = Math.cos(fa) * 0.72 + Math.cos(fa + Math.PI / 2) * t, y = Math.sin(fa) * 0.72 + Math.sin(fa + Math.PI / 2) * t
      return slot(Math.atan2(y, x), Math.hypot(x, y))
    }
    case 'cards': return slot((-152 + j * (124 / Math.max(1, n - 1))) * DEG, 1)
    case 'wings': return slot(n === 1 || j === 0 ? 0 : Math.PI, 0.82, 38 * DEG)
    case 'links': return slot(j * TAU / n, 0.86)
  }
}
/** The angle of the Hangdrum's field i (of 8). */
export const fieldAngle = (i: number) => TOP + i * TAU / 8
/** The field (of 8) nearest an aim angle. */
export const fieldAt = (angle: number) => ((Math.round((angle - TOP) / (TAU / 8)) % 8) + 8) % 8

/** How lit slot j is: 1 loaded, 0..1 coming back (the gradual reload, `refill` of its time), 0 empty. A full reload
 * (0..1) lights them one by one. The Violino's strokes drain smoothly with the note. */
export function noteLit(look: NoteLook, j: number, ammo: number, reload: number, refill: number, amount: number) {
  if (reload > 0) return j < Math.floor(reload * look.n) ? 1 : 0
  if (look.style === 'strokes') return Math.max(0, Math.min(1, ammo - j))
  const have = Math.floor(ammo + 1e-6)
  if (j < have) return 1
  if (refill > 0 && have < look.n && j < have + Math.max(1, amount)) return Math.min(0.999, refill)
  return 0
}
/** The slot the next shot leaves from (the last lit one). */
export const nextNote = (ammo: number) => Math.floor(ammo + 1e-6) - 1

// ---------- each player's view ----------
export type NoteBit = { kind: 'dot' | 'line' | 'ring' | 'card'; x: number; y: number; vx: number; vy: number; a: number; spin: number; len: number; w: number; size: number; color: string; t: number; life: number; grow: number }
export type NoteFrame = {
  owned: object | null
  look: NoteLook | null
  ammo: number
  reload: number // 0..1 while reloading
  refill: number // 0..1: the gradual reload's way to the next notes
  amount: number // notes the gradual reload brings back at once
  charge: number // the charge being held (0..1): a throw, a strong blow, the chain spinning
  firing: boolean // Atirar held
  color: string | null // the scale degree's colour under the aim (instruments)
  slap: boolean // the Hangdrum's aim between its notes
  aim: number // the aim's angle
  spin: number // the Corrente-gancho's chain angle
  cadence: number // 1 → 0 until the next shot may go (the Granada)
  away: readonly number[] // the cards of the deck that are out
  out: number // the Boomerangs out / the Martelo thrown
  special: number | null // the special's fullness (1: ready)
  wake: boolean // Próxima variação pressed
}
export type NoteView = {
  owned: object | null
  look: NoteLook | null
  f: NoteFrame | null // the last frame (what the drawing reads)
  ammo: number
  away: number[]
  out: number
  special: number
  charge: number
  sweep: number // 0..1 while the ring sweeps back on (-1: not)
  bits: NoteBit[]
  flash: number[] // s left of the flash of a card or wing back in place
  twang: { j: number; t: number } | null // the Harpa de Lira's plucked string
  ripples: { field: number; t: number; color: string }[] // the Hangdrum's fields struck
  slap: number // s left of the Hangdrum's slap
  arp: number // the Sax's arpeggio step
  t: number
}
export const newNoteView = (): NoteView => ({ owned: null, look: null, f: null, ammo: 0, away: [], out: 0, special: 0, charge: 0, sweep: -1, bits: [], flash: [], twang: null, ripples: [], slap: 0, arp: 0, t: 0 })

const SWEEP_TIME = 0.5
const MAX_BITS = 48
/** How much of slot at fraction u of the ring shows while it sweeps back on (a moment brighter as it lights). */
export function sweepAlpha(v: NoteView, u: number) {
  if (v.sweep < 0) return 1
  const f = v.sweep * 1.3 - u
  return f < 0 ? 0.12 : f < 0.15 ? 1.6 : 1
}

const bit = (p: Partial<NoteBit> & { x: number; y: number }): NoteBit => ({ kind: 'dot', vx: 0, vy: 0, a: 0, spin: 0, len: 0.2, w: 2, size: 1, color: NOTE_CYAN, t: 0, life: 0.7, grow: 0, ...p })
const out = (a: number, r: number, speed: number, p: Partial<NoteBit> = {}) => bit({ x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, ...p })

/** The colour of the next note (its degree's) or the ring's own. */
export const nextColor = (v: NoteView) => (v.look?.deg && v.f?.color) || v.look?.color || NOTE_CYAN

/**
 * One frame of a player's ring: notices a new item (the ring sweeps on), a shot (the notes spent float off), a note
 * that came back, a card or a Boomerang leaving and coming back, a special spent, Próxima variação, and moves what
 * floats.
 */
export function stepNoteView(v: NoteView, f: NoteFrame, dt: number, rand: () => number = Math.random) {
  const look = f.look
  if (f.owned !== v.owned || look?.style !== v.look?.style || look?.n !== v.look?.n) {
    v.owned = f.owned; v.look = look; v.f = f
    v.ammo = f.ammo; v.away = [...f.away]; v.out = f.out; v.special = f.special ?? 0; v.charge = f.charge
    v.sweep = look ? 0 : -1; v.flash = []; v.twang = null; v.ripples = []; v.slap = 0
  } else if (look) {
    v.f = f
    const color = nextColor(v)
    if (f.wake) v.sweep = 0
    if (countsAmmo(look.style) && look.style !== 'strokes') {
      const shots = Math.floor(v.ammo + 1e-6) - Math.floor(f.ammo + 1e-6)
      if (shots > 0 && f.reload <= 0) shoot(v, look, Math.floor(v.ammo + 1e-6), Math.min(shots, 6), color, f, rand)
    }
    if (look.style === 'strokes' && f.ammo < v.ammo - 1e-6 && rand() < dt * 30) {
      // the bow's head sheds rosin dust while the note plays
      const s = noteSlot(look, Math.max(0, Math.ceil(f.ammo) - 1)), k = f.ammo - Math.floor(f.ammo)
      const a = s.a0 + (s.a1 - s.a0) * (k || 1)
      v.bits.push(out(a + (rand() - 0.5) * 0.1, s.r, 0.25 + rand() * 0.3, { size: 0.5, color, life: 0.5 }))
    }
    if (look.style === 'cards') {
      for (const r of f.away) if (!v.away.includes(r) && r >= 0 && r < look.n) {
        const s = noteSlot(look, r)
        v.bits.push(out(s.a, 1.05, 1.1, { kind: 'card', a: s.a + Math.PI / 2, spin: 9, color: look.deg ? color : look.color, life: 0.6 }))
      }
      for (const r of v.away) if (!f.away.includes(r)) v.flash[r] = 0.35
      v.away = [...f.away]
    }
    if (look.style === 'wings' || look.style === 'coil') {
      if (f.out > v.out && look.style === 'wings') { const s = noteSlot(look, Math.min(look.n - 1, v.out)); v.bits.push(out(s.a, s.r, 1, { kind: 'line', len: 0.3, w: 3.5, a: s.a + Math.PI / 2, spin: 12, color: look.color, life: 0.45 })) }
      if (f.out < v.out) v.flash[Math.max(0, f.out)] = 0.35
      v.out = f.out
    }
    if (look.style === 'coil' && f.special !== null) {
      // the special spent: the coil lets its charge go
      if (v.special >= 1 && f.special < 1) for (let q = 0; q < 12; q++) v.bits.push(out(q * Math.PI / 6, 0.88, 1, { size: 0.8, color: look.color, life: 0.5 }))
      v.special = f.special
    }
    if (look.style === 'links' && v.charge > 0.05 && f.charge <= 0) {
      // let go: the links stretch out along the aim and go
      for (let q = 0; q < 6; q++) v.bits.push(bit({ x: Math.cos(f.aim) * (0.3 + q * 0.16), y: Math.sin(f.aim) * (0.3 + q * 0.16), vx: Math.cos(f.aim) * 1.5, vy: Math.sin(f.aim) * 1.5, color: look.color, life: 0.4 }))
    }
    v.charge = f.charge
  }
  v.ammo = f.ammo
  v.t += dt
  if (v.sweep >= 0) { v.sweep += dt / SWEEP_TIME; if (v.sweep >= 1) v.sweep = -1 }
  for (let i = 0; i < v.flash.length; i++) if (v.flash[i] > 0) v.flash[i] = Math.max(0, v.flash[i] - dt)
  if (v.twang) { v.twang.t += dt; if (v.twang.t > 0.3) v.twang = null }
  for (const r of v.ripples) r.t += dt
  v.ripples = v.ripples.filter(r => r.t < 0.45)
  v.slap = Math.max(0, v.slap - dt)
  for (const b of v.bits) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.pow(0.18, dt); b.vy *= Math.pow(0.18, dt); b.a += b.spin * dt }
  v.bits = v.bits.filter(b => b.t < b.life).slice(-MAX_BITS)
}

// the notes a shot spent leave their slots and float outward (the Harpa de Lira's toward the centre, like the note
// it sends); some classes add their own: the strum's and the chord's wave, the Pandeiro's ten notes, the Hangdrum's
// ripple or slap
function shoot(v: NoteView, look: NoteLook, from: number, shots: number, color: string, f: NoteFrame, rand: () => number) {
  for (let k = 0; k < shots; k++) {
    const j = from - 1 - k
    if (j < 0) break
    const s = noteSlot(look, Math.min(j, look.n - 1))
    switch (look.style) {
      case 'dots': v.bits.push(out(s.a, s.r, 0.5, { color, size: 1.1, life: 0.8 })); break
      case 'bars': case 'keys': v.bits.push(out(s.a, s.r, 0.8, { kind: 'line', len: (s.r1 - s.r0), w: look.style === 'keys' && blackKey(j) ? 2 : 2.6, a: s.a, color, life: 0.55 })); break
      case 'trios': case 'rosette': case 'blocks': v.bits.push(out(s.a, s.r, 0.6, { kind: 'line', len: Math.max(0.1, (s.a1 - s.a0) * s.r), w: look.style === 'blocks' ? 5 : 2.6, a: s.a + Math.PI / 2, color: look.style === 'blocks' ? look.color : color, life: 0.55 })); break
      case 'jingles': v.bits.push(out(s.a, s.r, 0.6, { kind: 'line', len: 0.16, w: 3, a: s.a + Math.PI / 2, color, life: 0.7 })); break
      case 'lyre': v.twang = { j, t: 0 }; v.bits.push(out(s.a, 0.8, -1.1, { color, size: 1.2, life: 0.55 })); break
      case 'fields': v.bits.push(out(s.a, s.r, 0.6, { color, size: 0.9, life: 0.7 })); break
      default: break
    }
  }
  if (look.style === 'bars') v.arp += shots
  if (look.style === 'rosette') v.bits.push(bit({ x: 0, y: 0, kind: 'ring', size: 0.35, grow: 1.4, color, life: 0.45 }))
  if (look.style === 'keys') v.bits.push(bit({ x: 0, y: 0, kind: 'ring', size: 0.95, grow: 0.9, color, life: 0.5 }))
  if (look.style === 'jingles') for (let q = 0; q < 10; q++) v.bits.push(out(q * Math.PI / 5, 0.3, 1.1, { size: 0.7, color, life: 0.6 }))
  if (look.style === 'fields') { if (f.slap) v.slap = 0.25; else v.ripples.push({ field: fieldAt(f.aim), t: 0, color }) }
  void rand
}
/** A floating bit's strength (fading over its life). */
export const bitAlpha = (b: NoteBit) => Math.max(0, 1 - b.t / b.life)
