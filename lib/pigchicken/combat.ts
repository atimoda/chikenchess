// PigChicKen combat in the Parquinho: the items she carries, firing, hitting, throwing, projectiles,
// target dummies and items lying on the ground. World coordinates (x grows into the world, y is the screen's).
import { DEFAULT_ITEMS, type ItemDef, type ItemId } from './items'

export type Box = { l: number; t: number; r: number; b: number }
export type Owned = { item: ItemId; ammo: number; durability: number }
export type Bullet = { x: number; y: number; vx: number; vy: number; dist: number; damage: number; pierce: number; hits: Set<number>; size: number; drop: number; range: number }
export type Thrown = { x: number; y: number; vx: number; vy: number; spin: number; angle: number; owned: Owned; damage: number; hit: boolean }
export type Target = { id: number; home: number; x: number; y: number; w: number; h: number; hp: number; maxHp: number; flash: number; wobble: number; vx: number; deadT: number }
export type Pickup = { id: number; owned: Owned; x: number; y: number; vy: number; resting: boolean; noPick: number }
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export type FloatText = { x: number; y: number; text: string; life: number; color: string }
export type Swing = { angle: number; arc: number; range: number; t: number; wing: boolean }

export type Body = { x: number; y: number; face: number; scale: number; grounded: boolean; state: string; vx: number }
export type FrameInput = {
  fire: boolean; firePressed: boolean; melee: boolean; throwHeld: boolean; throwReleased: boolean
  reload: boolean; pick: number; slot: number // pick: +1 / -1 cycles; slot: 1..9 exact, 0 none
}

export const SLOTS = 9
const THROW_GRAVITY = 1500
const ITEM_GRAVITY = 1800

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const DEG = Math.PI / 180

export function createCombat() {
  let items: Record<ItemId, ItemDef> = structuredClone(DEFAULT_ITEMS)
  const inv: (Owned | null)[] = Array(SLOTS).fill(null)
  let cur = 0
  let cooldown = 0, burstLeft = 0, reloadT = 0, bloom = 0, meleeCool = 0, kick = 0, throwT = 0
  let aimAngle = 0
  let nextId = 1
  const bullets: Bullet[] = [], thrown: Thrown[] = [], targets: Target[] = [], pickups: Pickup[] = [], sparks: Spark[] = [], texts: FloatText[] = []
  const racks: { x: number; item: ItemId; t: number }[] = []
  let swing: Swing | null = null

  const held = () => inv[cur]
  const def = (): ItemDef => { const h = held(); return h ? items[h.item] : items.wing }
  const fresh = (item: ItemId): Owned => ({ item, ammo: items[item].mag, durability: items[item].durability })

  function addText(x: number, y: number, text: string, color = '#ffffff') { texts.push({ x, y, text, life: 0.9, color }) }
  function burst(x: number, y: number, n: number, color: string, speed = 220, size = 3) {
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(speed * 0.3, speed); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.5), max: 0.5, color, size }) }
  }

  function hitTarget(t: Target, damage: number, pushX: number, x: number, y: number) {
    if (t.deadT > 0 || damage <= 0) return
    t.hp -= damage; t.flash = 0.12; t.wobble = Math.sign(pushX || 1) * 0.35; t.vx += pushX
    addText(x, y - 10, String(Math.round(damage)), '#ffd166')
    burst(x, y, 5, '#ffd166', 160, 2)
    if (t.hp <= 0) { t.deadT = 2.5; burst(t.x, t.y - t.h / 2, 22, '#e8e2d0', 320, 4); addText(t.x, t.y - t.h - 16, 'derrubado!', '#ff8c69') }
  }

  function pickUp(p: Pickup) {
    // one of each item: walking past the rack again does not fill every slot with the same weapon
    if (inv.some(o => o && o.item === p.owned.item)) return false
    let slot = inv.findIndex(s => s === null)
    if (slot < 0) return false
    // hands empty: she holds what she picks up
    if (!held()) slot = cur
    inv[slot] = p.owned
    addText(p.x, p.y - 30, `+ ${items[p.owned.item].name}`, '#7bdff2')
    return true
  }

  function equip(i: number) {
    if (i === cur) return
    cur = (i + SLOTS) % SLOTS; reloadT = 0; burstLeft = 0; cooldown = Math.max(cooldown, 0.15)
  }

  function startReload() {
    const h = held(); if (!h) return
    const d = items[h.item]
    if (d.mag > 0 && h.ammo < d.mag && reloadT <= 0) reloadT = d.reloadTime
  }

  function shoot(body: Body, origin: { x: number; y: number }, spreadDeg: number, onRecoil: (vx: number, vy: number) => void) {
    const h = held()!, d = items[h.item]
    const a = aimAngle + rand(-spreadDeg / 2, spreadDeg / 2) * DEG
    const muzzle = 34 * body.scale
    const mx = origin.x + Math.cos(aimAngle) * muzzle, my = origin.y + Math.sin(aimAngle) * muzzle
    bullets.push({ x: mx, y: my, vx: Math.cos(a) * d.speed, vy: Math.sin(a) * d.speed, dist: 0, damage: d.damage, pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range })
    burst(mx, my, 3, '#fff3b0', 140, 2)
    h.ammo--; bloom = Math.min(d.spreadMax, bloom + d.spreadShot); cooldown = 1 / d.rate; kick = d.recoilKick
    onRecoil(-Math.cos(aimAngle) * d.recoilPush, -Math.sin(aimAngle) * d.recoilPush)
    if (h.ammo <= 0 && d.autoReload) startReload()
  }

  function melee(origin: { x: number; y: number }, wing: boolean) {
    const d = wing ? items.wing : def()
    meleeCool = d.meleeCooldown
    swing = { angle: aimAngle, arc: d.meleeArc * DEG, range: d.meleeRange, t: 0, wing }
    let hits = 0
    targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = t.x, cy = t.y - t.h / 2
      const dx = cx - origin.x, dy = cy - origin.y, dist = Math.hypot(dx, dy) - t.w / 2
      if (dist > d.meleeRange) return
      let diff = Math.atan2(dy, dx) - aimAngle
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      if (Math.abs(diff) > (d.meleeArc * DEG) / 2 && dist > 10) return
      hitTarget(t, d.meleeDamage, Math.sign(dx || 1) * d.meleePush, cx - Math.sign(dx) * t.w / 2, cy)
      hits++
    })
    // items wear out on hits; the wing never breaks
    const h = held()
    if (!wing && h && hits > 0 && d.durability > 0) {
      h.durability -= hits
      if (h.durability <= 0) {
        inv[cur] = null
        burst(origin.x + Math.cos(aimAngle) * 30, origin.y + Math.sin(aimAngle) * 30, 18, '#c9c9c9', 200, 4)
        addText(origin.x, origin.y - 50, `${d.name} quebrou!`, '#ff8c69')
      }
    }
  }

  return {
    get inventory() { return inv },
    get current() { return cur },
    get reloading() { return reloadT > 0 ? 1 - reloadT / Math.max(0.01, def().reloadTime) : 0 },
    get kick() { return kick },
    get swing() { return swing },
    get throwCharge() { return throwT > 0 ? Math.min(1, throwT / Math.max(0.05, def().throwCharge)) : 0 },
    get aimAngle() { return aimAngle },
    bullets, thrown, targets, pickups, sparks, texts, racks,
    def,
    setItems(next: Record<ItemId, ItemDef>) {
      items = next
      inv.forEach(o => { if (o) { o.ammo = Math.min(o.ammo, items[o.item].mag); if (items[o.item].durability > 0 && o.durability <= 0) o.durability = items[o.item].durability } })
    },
    addTarget(x: number, y: number) { targets.push({ id: nextId++, home: x, x, y, w: 46, h: 112, hp: 100, maxHp: 100, flash: 0, wobble: 0, vx: 0, deadT: 0 }) },
    addRack(x: number, item: ItemId) { racks.push({ x, item, t: 0 }) },
    // the spread right now, in degrees (the reticle draws it)
    spread(body: Body) {
      const d = def()
      let s = d.spreadBase + bloom
      if (!body.grounded) s += d.spreadAir
      else if (Math.abs(body.vx) > 5) s += d.spreadMove
      if (body.state === 'crouch') s *= d.crouchMult
      if (body.state === 'brood') s *= d.broodMult
      return Math.min(s, d.spreadMax + d.spreadAir + d.spreadMove)
    },

    step(dt: number, body: Body, origin: { x: number; y: number }, targetAngle: number, input: FrameInput, boxes: Box[], groundY: number, onRecoil: (vx: number, vy: number) => void) {
      const d = def()
      // aim turns at the item's speed
      if (d.turnRate > 0) {
        let diff = Math.atan2(Math.sin(targetAngle - aimAngle), Math.cos(targetAngle - aimAngle))
        const max = d.turnRate * DEG * dt
        diff = Math.max(-max, Math.min(max, diff))
        aimAngle += diff
      } else aimAngle = targetAngle

      cooldown = Math.max(0, cooldown - dt); meleeCool = Math.max(0, meleeCool - dt)
      kick = Math.max(0, kick - dt * 60)
      bloom = Math.max(0, bloom - d.spreadRecover * dt)
      if (swing) { swing.t += dt; if (swing.t > 0.2) swing = null }

      // switching items
      if (input.slot) equip(input.slot - 1)
      else if (input.pick) equip(cur + input.pick)

      // reload
      if (reloadT > 0) {
        reloadT -= dt
        if (reloadT <= 0) { const h = held(); if (h) h.ammo = items[h.item].mag; reloadT = 0 }
      }
      if (input.reload) startReload()

      // fire: with an item it shoots; with empty hands (or an item without ammo) it is a wing slap
      const h = held()
      const canFire = body.state !== 'slide' || d.slideFire
      if (!h || d.mag === 0) {
        if (input.firePressed && meleeCool <= 0) melee(origin, true)
      } else if (canFire && reloadT <= 0) {
        const spreadDeg = this.spread(body)
        if (h.ammo <= 0) { if (input.firePressed) { if (d.autoReload) startReload(); else addText(origin.x, origin.y - 40, 'vazio', '#aaaaaa') } }
        else if (d.fireMode === 'semi') { if (input.firePressed && cooldown <= 0) shoot(body, origin, spreadDeg, onRecoil) }
        else if (d.fireMode === 'auto') { if (input.fire && cooldown <= 0) shoot(body, origin, spreadDeg, onRecoil) }
        else {
          if (input.firePressed && burstLeft <= 0 && cooldown <= 0) burstLeft = d.burst
          if (burstLeft > 0 && cooldown <= 0 && h.ammo > 0) { shoot(body, origin, spreadDeg, onRecoil); burstLeft--; if (burstLeft <= 0) cooldown = 3 / d.rate }
        }
      }
      if (input.melee && meleeCool <= 0) melee(origin, !h)

      // throw: hold to charge, let go to throw what she holds
      if (input.throwHeld) throwT += dt
      if (input.throwReleased) {
        const t = held()
        if (t) {
          const p = Math.max(0.25, Math.min(1, throwT / Math.max(0.05, d.throwCharge)))
          const v = d.throwSpeed * p
          thrown.push({ x: origin.x, y: origin.y, vx: Math.cos(aimAngle) * v + body.vx * 0.5, vy: Math.sin(aimAngle) * v, spin: (Math.cos(aimAngle) >= 0 ? 1 : -1) * (8 + 10 * p), angle: aimAngle, owned: t, damage: d.throwDamage * (0.4 + 0.6 * p), hit: false })
          inv[cur] = null; reloadT = 0
          const next = inv.findIndex(o => o !== null)
          if (next >= 0) cur = next
        }
        throwT = 0
      }

      const inBox = (x: number, y: number) => boxes.find(b => x >= b.l && x <= b.r && y >= b.t && y <= b.b)

      // bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]
        const px = b.x, py = b.y
        b.vy += b.drop * dt
        b.x += b.vx * dt; b.y += b.vy * dt
        b.dist += Math.hypot(b.x - px, b.y - py)
        let dead = b.dist > b.range || b.y > groundY
        // swept test against targets: closest point of the step's segment to the target's box
        for (const t of targets) {
          if (dead || t.deadT > 0 || b.hits.has(t.id)) continue
          const l = t.x - t.w / 2, r = t.x + t.w / 2, top = t.y - t.h, bot = t.y
          const steps = Math.max(1, Math.ceil(Math.hypot(b.x - px, b.y - py) / 8))
          for (let k = 1; k <= steps; k++) {
            const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps
            if (x >= l && x <= r && y >= top && y <= bot) {
              hitTarget(t, b.damage, Math.sign(b.vx) * 40, x, y); b.hits.add(t.id)
              if (b.hits.size > b.pierce) dead = true
              break
            }
          }
        }
        if (!dead) {
          const steps = Math.max(1, Math.ceil(Math.hypot(b.x - px, b.y - py) / 10))
          for (let k = 1; k <= steps && !dead; k++) {
            const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps
            if (inBox(x, y)) { dead = true; burst(x, y, 4, '#9fd3a8', 120, 2) }
          }
        }
        if (b.y > groundY) burst(b.x, groundY, 3, '#8a6d4b', 100, 2)
        if (dead) bullets.splice(i, 1)
      }

      // thrown items: spin, hit once, land as a pickup
      for (let i = thrown.length - 1; i >= 0; i--) {
        const t = thrown[i]
        const py = t.y
        t.vy += THROW_GRAVITY * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.angle += t.spin * dt
        if (!t.hit) for (const g of targets) {
          if (g.deadT > 0) continue
          if (Math.abs(t.x - g.x) < g.w / 2 + 10 && t.y > g.y - g.h && t.y < g.y) {
            hitTarget(g, t.damage, Math.sign(t.vx) * 220, t.x, t.y); t.hit = true; t.vx *= -0.3; t.vy = Math.min(t.vy, -200)
          }
        }
        const top = boxes.find(b => t.x >= b.l && t.x <= b.r && py <= b.t && t.y >= b.t)
        const side = !top && inBox(t.x, t.y)
        if (side) { t.vx *= -0.4; t.x += t.vx * dt * 2 }
        const floor = top ? top.t : t.y >= groundY ? groundY : null
        if (floor !== null && t.vy > 0) {
          pickups.push({ id: nextId++, owned: t.owned, x: t.x, y: floor, vy: 0, resting: true, noPick: 0.5 })
          burst(t.x, floor, 6, '#c9b48a', 120, 2)
          thrown.splice(i, 1)
        }
      }

      // pickups: fall to the floor, picked up by walking over them
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]
        p.noPick = Math.max(0, p.noPick - dt)
        if (!p.resting) {
          const py = p.y
          p.vy += ITEM_GRAVITY * dt; p.y += p.vy * dt
          const top = boxes.find(b => p.x >= b.l && p.x <= b.r && py <= b.t && p.y >= b.t)
          if (top) { p.y = top.t; p.resting = true; p.vy = 0 }
          if (p.y >= groundY) { p.y = groundY; p.resting = true; p.vy = 0 }
        }
        if (p.noPick <= 0 && Math.abs(p.x - body.x) < 46 * body.scale + 10 && Math.abs(p.y - body.y) < 60 * body.scale + 20) {
          if (pickUp(p)) pickups.splice(i, 1)
        }
      }

      // racks: the creative mode always has the item to pick up again
      racks.forEach(r => {
        const near = pickups.some(p => p.owned.item === r.item && Math.abs(p.x - r.x) < 60)
        if (near) { r.t = 0; return }
        r.t += dt
        if (r.t > 2) { pickups.push({ id: nextId++, owned: fresh(r.item), x: r.x, y: groundY - 60, vy: 0, resting: false, noPick: 0 }); r.t = 0 }
      })

      // targets: knockback, wobble, fall and come back
      targets.forEach(t => {
        t.flash = Math.max(0, t.flash - dt)
        t.wobble *= Math.pow(0.02, dt)
        t.x += t.vx * dt; t.vx *= Math.pow(0.004, dt)
        t.x += (t.home - t.x) * Math.min(1, 1.5 * dt)
        if (t.deadT > 0) { t.deadT -= dt; if (t.deadT <= 0) { t.hp = t.maxHp; t.x = t.home; burst(t.x, t.y - t.h / 2, 10, '#7bdff2', 160, 3) } }
      })

      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.life <= 0) sparks.splice(i, 1) }
      for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) texts.splice(i, 1) }
    },
  }
}

export type Combat = ReturnType<typeof createCombat>
