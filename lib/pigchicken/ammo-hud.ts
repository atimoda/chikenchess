// The weapons' tambor / pente (docs/mechanics/patio/item-variations.md → Tambor): the shots left in the held
// weapon, shown two ways, each its own checkbox in the Câmera de Mira panel:
//  - "Em volta": round her shoulder (like the Escalas), a ring of rounds seen from the side (the Escopeta's: a
//    metal drum with its holes). It shows when she takes the weapon, presses Próxima variação or reloads, and
//    fades with the Escalas' standby numbers; firing while it shows turns it and lets the round fall.
//  - "Na mira": a small HUD next to the reticle, one layout per weapon, always there while she holds it. Each shot
//    turns the cylinder (Pistola, Escopeta) and the round's micro icon jumps out and falls.
// Pure state and geometry here; components/pigchicken/draw/ammo-hud.ts draws it.
import type { ItemDef, ItemId } from './items'

export type AmmoStyle = 'revolver' | 'shotgun' | 'trios' | 'arcs' | 'column' | 'flanks' | 'fan'
// what a round looks like from the side (round her) and how big it is there (px at scale 1)
export type RoundKind = 'pistol' | 'smg' | 'rifle' | 'shell' | 'sniper' | 'rocket' | 'arrow'

const STYLES: Partial<Record<ItemId, { style: AmmoStyle; kind: RoundKind; L: number; W: number }>> = {
  pistol: { style: 'revolver', kind: 'pistol', L: 15, W: 6 },
  smg: { style: 'trios', kind: 'smg', L: 12, W: 4.4 },
  rifle: { style: 'arcs', kind: 'rifle', L: 22, W: 5 },
  pump: { style: 'shotgun', kind: 'shell', L: 20, W: 10 },
  sniper: { style: 'column', kind: 'sniper', L: 34, W: 6.5 },
  launcher: { style: 'flanks', kind: 'rocket', L: 34, W: 14 },
  bow: { style: 'fan', kind: 'arrow', L: 42, W: 5 },
}
// past this many rounds the drawing would be a blur: the magazine shows at most these
export const AMMO_MAX_SLOTS = 60

export type AmmoLook = { style: AmmoStyle; kind: RoundKind; L: number; W: number; n: number }

/** How the item's tambor / pente looks, or null when it has none (instruments, consumables, the Taco, the Granada). */
export function ammoLook(id: ItemId, d: ItemDef): AmmoLook | null {
  const s = STYLES[id]
  if (!s || d.instrument || d.consumable || d.meleeOnly || d.infiniteAmmo || !(d.mag >= 1)) return null
  return { ...s, n: Math.min(AMMO_MAX_SLOTS, Math.round(d.mag)) }
}
/** The cylinders turn one chamber a shot and fire from the top; the others stay still and fire from the last loaded one. */
export const ammoTurns = (s: AmmoStyle) => s === 'revolver' || s === 'shotgun'

// ---------- at the reticle ----------
/** The HUD's radius (px). */
export const AMMO_HUD_R = 32

// the cylinder round the reticle: rc where the chambers' centres are, cr a chamber's radius
export function cylinder(style: AmmoStyle, R: number, n: number) {
  if (style === 'shotgun') { const P = R * 1.15, rc = P * 0.6; return { rc, cr: Math.min(P * 0.2, rc * Math.sin(Math.PI / Math.max(2, n)) * 0.8) } }
  const rc = R * 0.64
  return { rc, cr: Math.min(R * 0.11, rc * Math.sin(Math.PI / Math.max(2, n)) * 0.72) }
}

export type Slot = { x: number; y: number; a: number }
/**
 * Slot j (0 … n-1) of a HUD around (0, 0): where it is and which way its icon points. `rot` (1 → 0 just after a
 * shot) turns the cylinders back one chamber; `draw` (0..1) pulls the bow's next arrow back along its line.
 */
export function hudSlot(look: AmmoLook, R: number, j: number, rot: number, ammo: number, draw: number): Slot {
  const n = look.n
  switch (look.style) {
    case 'revolver': case 'shotgun': {
      const a = -Math.PI / 2 + (j + rot) * (Math.PI * 2 / n), { rc } = cylinder(look.style, R, n)
      return { x: Math.cos(a) * rc, y: Math.sin(a) * rc, a: 0 }
    }
    case 'trios': {
      // in threes round the reticle, a gap between each three
      const da = Math.PI * 2 / (n + Math.ceil(n / 3) * 0.9), a = Math.PI / 3 + (j + Math.floor(j / 3) * 0.9) * da
      return { x: Math.cos(a) * R * 0.86, y: Math.sin(a) * R * 0.86, a }
    }
    case 'arcs': {
      // two arcs, left (the first half) and right
      const left = Math.ceil(n / 2), side = j < left, k = side ? j : j - left, m = side ? left : n - left
      const t = m > 1 ? k / (m - 1) : 0.5, span = 55 * Math.PI / 180
      const a = side ? Math.PI + span - t * span * 2 : -span + t * span * 2
      return { x: Math.cos(a) * R * 0.86, y: Math.sin(a) * R * 0.86, a }
    }
    case 'column': {
      // along an arc to the right of the bracket, top to bottom
      const t = n > 1 ? j / (n - 1) : 0.5, a = -0.6 + 1.2 * t
      return { x: Math.cos(a) * R * 0.98, y: Math.sin(a) * R * 0.98, a: 0 }
    }
    case 'flanks':
      // right, left, right…, each pair a row
      return { x: (j % 2 === 0 ? 1 : -1) * R * 0.86, y: (Math.floor(j / 2) - (Math.ceil(n / 2) - 1) / 2) * R * 0.5, a: -Math.PI / 2 }
    case 'fan': {
      // under the reticle, each arrow pointing at its centre; used from right to left, the next one pulled back
      const t = n > 1 ? j / (n - 1) : 0.5, a = (168 - 156 * t) * Math.PI / 180
      const r = R * 1.08 + (j === Math.ceil(ammo) - 1 ? draw * R * 0.3 : 0)
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, a: a + Math.PI }
    }
  }
}
/** The slot the next shot leaves from. */
export const nextSlot = (look: AmmoLook, ammo: number) => ammoTurns(look.style) ? 0 : Math.max(0, Math.ceil(ammo) - 1)

// ---------- round her ----------
/** The ring's size for her scale (the numbers below are at 1). */
export const AMMO_AROUND_SCALE = 1.5
// scale 1's size of the ring (px from her shoulder) and of the Escopeta's drum
export function aroundRing(look: AmmoLook) {
  if (look.style === 'shotgun') { const hr = 9, Rh = 70; return { drum: true, R: Rh, hr, outer: Rh + hr + 7, inner: Math.max(0, Rh - hr - 7) } }
  return { drum: false, R: Math.max(78, look.n * look.W * 1.9 / (Math.PI * 2) + look.L / 2), hr: 0, outer: 0, inner: 0 }
}
/** Slot i round her (around 0, 0, at scale 1): the ring turns like the cylinders. */
export const aroundAngle = (look: AmmoLook, i: number, rot: number) => -Math.PI / 2 + (i + rot) * (Math.PI * 2 / look.n)

// ---------- each player's view ----------
export type AmmoDrop = { hud: boolean; look: AmmoLook; x: number; y: number; vx: number; vy: number; a: number; spin: number; t: number; alpha: number; scale: number }
export type AmmoView = {
  owned: object | null // the held item (its object: another copy of the same weapon is a new one)
  look: AmmoLook | null
  ammo: number
  reloading: boolean
  shown: number // s since the ring round her was woken (Infinity: asleep)
  rot: number // 1 → 0 over TURN_TIME after a shot
  draw: number // the bow's pull last frame
  drops: AmmoDrop[]
}
export const newAmmoView = (): AmmoView => ({ owned: null, look: null, ammo: 0, reloading: false, shown: Infinity, rot: 0, draw: 0, drops: [] })

const TURN_TIME = 0.12
const WAKE_TIME = 0.12
const HUD_DROP_LIFE = 1
const AROUND_DROP_LIFE = 0.9

/** How much of the ring round her shows (0..1): in quickly, then after `after` s it fades over `fade` s. */
export function aroundVisibility(v: AmmoView, after: number, fade: number) {
  if (!v.look || !Number.isFinite(v.shown)) return 0
  const t = Math.max(0, Math.min(1, (v.shown - after) / Math.max(0.01, fade)))
  return Math.min(1, v.shown / WAKE_TIME) * (1 - t * t * (3 - 2 * t))
}

/** How many rounds show loaded: a reload lights them up one by one (the Escopeta's come in one each reload). */
export function litRounds(look: AmmoLook, ammo: number, reload: number, shellReload: boolean) {
  const have = Math.ceil(ammo)
  return reload > 0 && !shellReload ? Math.max(have, Math.floor(reload * look.n)) : have
}

export type AmmoFrame = {
  owned: object | null
  look: AmmoLook | null
  ammo: number
  reload: number // 0..1 while reloading
  draw: number // the bow's pull (0..1)
  wake: boolean // Próxima variação pressed
  // where the shots' rounds leave from this frame (null: that view is off)
  hud: { x: number; y: number; R: number; alpha: number } | null
  around: { x: number; y: number; scale: number; alpha: number; after: number; fade: number } | null
}

/**
 * One frame of a player's view: notices a new weapon, a shot (the ammo went down: the cylinder turns and the round
 * falls), a reload or Próxima variação (the ring round her shows again), and moves the falling rounds.
 */
export function stepAmmoView(v: AmmoView, f: AmmoFrame, dt: number, rand: () => number = Math.random) {
  const reloading = f.reload > 0
  if (f.owned !== v.owned || f.look?.style !== v.look?.style || f.look?.n !== v.look?.n) {
    v.owned = f.owned; v.look = f.look; v.rot = 0
    v.shown = f.look ? 0 : Infinity
  } else if (f.look) {
    const shots = Math.ceil(v.ammo) - Math.ceil(f.ammo)
    if (shots > 0) {
      for (let k = 0; k < Math.min(shots, 6); k++) dropRound(v, f, Math.ceil(v.ammo) - k, rand)
      if (ammoTurns(f.look.style)) v.rot = 1
    } else if (shots < 0 || (reloading && !v.reloading) || f.wake) v.shown = 0
  }
  v.ammo = f.ammo; v.reloading = reloading; v.draw = f.draw
  if (Number.isFinite(v.shown)) v.shown += dt
  v.rot = Math.max(0, v.rot - dt / TURN_TIME)
  for (const d of v.drops) {
    d.t += dt; d.vy += (d.hud ? 520 : 900) * d.scale * dt
    d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.spin * dt
  }
  v.drops = v.drops.filter(d => d.t < (d.hud ? HUD_DROP_LIFE : AROUND_DROP_LIFE))
}

// the round that goes: at the HUD it jumps out to its own side and falls, spinning (the arrow flies back up along
// its line as far as the pull took it, then falls); round her, it drops off the top of the ring
function dropRound(v: AmmoView, f: AmmoFrame, from: number, rand: () => number) {
  const look = f.look!
  if (f.hud && f.hud.alpha > 0.02) {
    const { R } = f.hud, k = R / 15
    const p = hudSlot(look, R, nextSlot(look, from), 0, from, v.draw)
    const side = Math.abs(p.x) > 1 ? Math.sign(p.x) : (rand() > 0.5 ? 1 : -1)
    let vx: number, vy: number, spin: number
    if (look.style === 'fan') { const up = (40 + 70 * v.draw) * k; vx = Math.cos(p.a) * up; vy = Math.sin(p.a) * up; spin = side * (1.5 + rand() * 2) }
    else { vx = side * (30 + rand() * 40) * k; vy = -(60 + rand() * 40) * k; spin = side * (7 + rand() * 9) }
    v.drops.push({ hud: true, look, x: f.hud.x + p.x, y: f.hud.y + p.y, vx, vy, a: p.a, spin, t: 0, alpha: f.hud.alpha, scale: k })
  }
  const vis = f.around ? f.around.alpha * aroundVisibility(v, f.around.after, f.around.fade) : 0
  if (f.around && vis > 0.02) {
    const s = f.around.scale, ring = aroundRing(look), a = aroundAngle(look, 0, 0)
    v.drops.push({ hud: false, look, x: f.around.x + Math.cos(a) * ring.R * s, y: f.around.y + Math.sin(a) * ring.R * s, vx: (rand() - 0.3) * 70 * s, vy: -(90 + rand() * 40) * s, a, spin: (rand() - 0.5) * 14, t: 0, alpha: vis, scale: s })
  }
}
/** A falling round's strength (its last 0.3 s fade). */
export const dropAlpha = (d: AmmoDrop) => d.alpha * Math.max(0, 1 - Math.max(0, d.t - (d.hud ? HUD_DROP_LIFE : AROUND_DROP_LIFE) + 0.3) / 0.3)
