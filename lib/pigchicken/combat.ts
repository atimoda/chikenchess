// PigChicKen combat in the Parquinho: the items she carries, firing, hitting, throwing, projectiles,
// target dummies and items lying on the ground. World coordinates (x grows into the world, y is the screen's).
import { DEFAULT_ITEMS, type ItemDef, type ItemId } from './items'
import type { WeaponSound } from './sfx'
import { ALIEN_DEATH, ZOMBIE_TIMES, spawnAlienRow, spawnZombies, stepEnemy, stepFormations, type EnemyEnv } from './enemies'

export type Box = { l: number; t: number; r: number; b: number }
export type Owned = { item: ItemId; ammo: number; durability: number }
export type Bullet = {
  x: number; y: number; vx: number; vy: number; dist: number; damage: number; pierce: number; hits: Set<number>; size: number; drop: number; range: number
  item: ItemId; t: number; explode: number; explodeDamage: number; fuse: number; bounce: number
}
export type Boom = { x: number; y: number; r: number; life: number }
export type Tracer = { x1: number; y1: number; x2: number; y2: number; life: number }
export type Thrown = { x: number; y: number; vx: number; vy: number; spin: number; angle: number; owned: Owned; damage: number; hit: boolean }
// x: centre, y: bottom. dummy targets come back after falling; aliens and zombies are removed; buttons never fall
export type TargetKind = 'dummy' | 'alien' | 'zombie' | 'button'
export type Target = {
  id: number; kind: TargetKind; home: number; x: number; y: number; w: number; h: number; hp: number; maxHp: number; flash: number; wobble: number; vx: number; deadT: number
  face: number; state: string; animT: number; label?: string; data?: unknown
}
export type Pickup = { id: number; owned: Owned; x: number; y: number; vy: number; resting: boolean; noPick: number }
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export type FloatText = { x: number; y: number; text: string; life: number; color: string }
// range: wing reach; reach: wing plus the item's length (the hit area); dir: which way it sweeps (1 = clockwise on screen)
// time: seconds the sweep takes
export type Swing = { angle: number; arc: number; range: number; reach: number; t: number; time: number; wing: boolean; dir: number }

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
  let cooldown = 0, burstLeft = 0, reloadT = 0, bloom = 0, meleeCool = 0, kick = 0, throwT = 0, chargeT = 0, prevFire = false
  let aimAngle = 0
  let nextId = 1
  const booms: Boom[] = [], tracers: Tracer[] = []
  // sounds to play this frame (the Parquinho drains it)
  const sounds: { kind: WeaponSound; item: ItemId | null }[] = []
  const sound = (kind: WeaponSound, item: ItemId | null = held()?.item ?? null) => { sounds.push({ kind, item }) }
  let pumpT = 0
  // buttons hit this frame, bites she took, enemies down
  const pressed: string[] = []
  const kills = { aliens: 0, zombies: 0, bites: 0 }
  let view = { l: 0, r: 1280 }
  const bullets: Bullet[] = [], thrown: Thrown[] = [], targets: Target[] = [], pickups: Pickup[] = [], sparks: Spark[] = [], texts: FloatText[] = []
  const racks: { x: number; item: ItemId; t: number; label: string }[] = []
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
    // a button: any hit presses it
    if (t.kind === 'button') { if (t.flash <= 0) { t.flash = 0.3; pressed.push(t.label ?? ''); burst(x, y, 6, '#7bdff2', 140, 2); sound('button', null) } return }
    t.hp -= damage; t.flash = 0.12; t.wobble = Math.sign(pushX || 1) * 0.35; t.vx += pushX
    addText(x, y - 10, String(Math.round(damage)), '#ffd166')
    burst(x, y, 5, t.kind === 'zombie' ? '#7a9a3a' : '#ffd166', 160, 2)
    if (t.kind === 'zombie' && t.hp > 0 && t.state !== 'attack') { t.state = 'hurt'; t.animT = 0 }
    if (t.hp > 0) return
    if (t.kind === 'alien') {
      const color = (t.data as { color?: string } | undefined)?.color ?? '#ffffff'
      t.deadT = ALIEN_DEATH; burst(t.x, t.y - t.h / 2, 24, color, 260, 5); kills.aliens++; sound('alienDie', null)
    } else if (t.kind === 'zombie') {
      t.state = 'dead'; t.animT = 0; t.deadT = ZOMBIE_TIMES.dead + ZOMBIE_TIMES.fade; kills.zombies++; sound('zombieDie', null)
    } else { t.deadT = 2.5; burst(t.x, t.y - t.h / 2, 22, '#e8e2d0', 320, 4); addText(t.x, t.y - t.h - 16, 'derrubado!', '#ff8c69') }
  }

  function pickUp(p: Pickup) {
    // one of each item: walking past the rack again does not fill every slot with the same weapon
    if (inv.some(o => o && o.item === p.owned.item)) return false
    let slot = inv.findIndex(s => s === null)
    if (slot < 0) return false
    // hands empty: she holds what she picks up
    if (!held()) slot = cur
    inv[slot] = p.owned
    if (slot === cur) sound('equip', p.owned.item)
    addText(p.x, p.y - 30, `+ ${items[p.owned.item].name}`, '#7bdff2')
    return true
  }

  function equip(i: number) {
    if (i === cur) return
    cur = (i + SLOTS) % SLOTS; reloadT = 0; burstLeft = 0; chargeT = 0; pumpT = 0; cooldown = Math.max(cooldown, 0.15)
    if (held()) sound('equip')
  }

  function startReload() {
    const h = held(); if (!h) return
    const d = items[h.item]
    if (d.mag > 0 && h.ammo < d.mag && reloadT <= 0) { reloadT = d.reloadTime; sound('reload') }
  }

  // one shot: `power` (0..1) scales speed in charge mode; pellets spread evenly across the cone
  function shoot(muzzle: { x: number; y: number }, spreadDeg: number, onRecoil: (vx: number, vy: number) => void, power = 1, ctx?: StepCtx) {
    const h = held()!, d = items[h.item]
    const mx = muzzle.x, my = muzzle.y
    const n = Math.max(1, Math.round(d.pellets))
    const speed = d.speed * power
    const damage = d.explodeRadius > 0 ? d.damage : d.damage * (d.fireMode === 'charge' ? 0.3 + 0.7 * power : 1)
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? rand(-0.5, 0.5) : i / (n - 1) - 0.5 + rand(-0.3, 0.3) / n
      const a = aimAngle + u * spreadDeg * DEG
      const b: Bullet = {
        x: mx, y: my, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dist: 0, damage, pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
        item: h.item, t: 0, explode: d.explodeRadius, explodeDamage: d.explodeDamage, fuse: d.fuse, bounce: d.bounce,
      }
      // instant shots travel their whole way now and leave a tracer
      if (d.hitscan && ctx) {
        let guard = 0
        while (!stepBullet(b, 1 / 240, ctx) && guard++ < 2000) { /* travel */ }
        tracers.push({ x1: mx, y1: my, x2: b.x, y2: b.y, life: 0.12 })
      } else bullets.push(b)
    }
    burst(mx, my, 3 + n, '#fff3b0', 140, 2)
    sound('shot', h.item)
    if (d.shellReload && h.ammo > 1) pumpT = Math.min(0.3, 0.6 / d.rate)
    h.ammo--; bloom = Math.min(d.spreadMax, bloom + d.spreadShot); cooldown = 1 / d.rate; kick = d.recoilKick
    onRecoil(-Math.cos(aimAngle) * d.recoilPush, -Math.sin(aimAngle) * d.recoilPush)
    if (h.ammo <= 0 && d.autoReload) startReload()
  }

  function explode(x: number, y: number, r: number, damage: number) {
    booms.push({ x, y, r, life: 0.35 })
    sound('explode', null)
    burst(x, y, 26, '#ffb347', 380, 4); burst(x, y, 14, '#fff3b0', 220, 3)
    targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = Math.max(t.x - t.w / 2, Math.min(x, t.x + t.w / 2)), cy = Math.max(t.y - t.h, Math.min(y, t.y))
      const dist = Math.hypot(cx - x, cy - y)
      if (dist > r) return
      hitTarget(t, damage * (1 - dist / r), Math.sign(t.x - x || 1) * 420 * (1 - dist / r), cx, cy)
    })
  }

  type StepCtx = { boxes: Box[]; groundY: number }
  const boxAt = (boxes: Box[], x: number, y: number) => boxes.find(b => x >= b.l && x <= b.r && y >= b.t && y <= b.b)
  // moves a projectile one step; true when it is gone
  function stepBullet(b: Bullet, dt: number, { boxes, groundY }: StepCtx, dry = false): boolean {
    const px = b.x, py = b.y
    b.t += dt
    b.vy += b.drop * dt
    b.x += b.vx * dt; b.y += b.vy * dt
    b.dist += Math.hypot(b.x - px, b.y - py)
    const gone = (x: number, y: number) => { if (b.explode > 0 && !dry) explode(x, y, b.explode, b.explodeDamage); return true }
    if (b.fuse > 0 && b.t >= b.fuse) return gone(b.x, b.y)
    if (b.dist > b.range) return b.explode > 0 && b.fuse === 0 ? gone(b.x, b.y) : true
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - px, b.y - py) / 8))
    // swept test against targets: points along the step's segment inside the target's box
    for (const t of targets) {
      if (t.deadT > 0 || b.hits.has(t.id)) continue
      const l = t.x - t.w / 2, r = t.x + t.w / 2, top = t.y - t.h, bot = t.y
      for (let k = 1; k <= steps; k++) {
        const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps
        if (x >= l && x <= r && y >= top && y <= bot) {
          if (b.explode > 0 || dry) { b.x = x; b.y = y; return gone(x, y) }
          hitTarget(t, b.damage, Math.sign(b.vx) * 40, x, y); b.hits.add(t.id)
          if (b.hits.size > b.pierce) return true
          break
        }
      }
    }
    // walls and the floor: explode, bounce (with a fuse) or stop
    for (let k = 1; k <= steps; k++) {
      const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps
      const box = boxAt(boxes, x, y)
      const floor = y >= groundY
      if (!box && !floor) continue
      if (b.fuse > 0) {
        const fromAbove = floor || (box && py <= box.t)
        if (fromAbove && !dry && Math.abs(b.vy) > 120) sound('bounce', b.item)
        if (fromAbove) { b.y = floor ? groundY - 1 : box!.t - 1; b.vy = -Math.abs(b.vy) * b.bounce; b.vx *= 0.7; if (Math.abs(b.vy) < 60) { b.vy = 0; b.drop = 0; b.vx *= 0.5 } }
        else { b.x = px; b.vx = -b.vx * b.bounce }
        if (!floor && box && !fromAbove) b.y = py
        return false
      }
      b.x = x; b.y = Math.min(y, groundY)
      if (b.explode > 0) return gone(b.x, b.y)
      if (!dry) burst(b.x, b.y, 4, floor ? '#8a6d4b' : '#9fd3a8', 120, 2)
      return true
    }
    return false
  }

  // where a shot would go now (for the reticles): its path and where it ends
  function predict(from: { x: number; y: number }, angle: number, power: number, ctx: StepCtx) {
    const d = def()
    const b: Bullet = {
      x: from.x, y: from.y, vx: Math.cos(angle) * d.speed * power, vy: Math.sin(angle) * d.speed * power, dist: 0, damage: 0, pierce: d.explodeRadius > 0 ? 0 : d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
      item: d.id, t: 0, explode: 0, explodeDamage: 0, fuse: d.fuse, bounce: d.bounce,
    }
    // a dry run: it stops at the first target and changes nothing
    const points: { x: number; y: number }[] = [{ x: b.x, y: b.y }]
    for (let n = 0; n < 400; n++) {
      const done = stepBullet(b, 1 / 60, ctx, true)
      points.push({ x: b.x, y: b.y })
      if (done) break
    }
    return { points, end: points[points.length - 1] }
  }

  function melee(origin: { x: number; y: number }, wing: boolean, scale: number) {
    const d = wing ? items.wing : def()
    meleeCool = d.meleeCooldown
    sound('swing', null)
    // an item in the wing rides on its tip: the blow reaches its length further
    const reach = d.meleeRange + (wing ? 0 : d.length * scale)
    // the blow comes down in front of her: clockwise facing right, counterclockwise facing left
    swing = { angle: aimAngle, arc: d.meleeArc * DEG, range: d.meleeRange, reach, t: 0, time: Math.max(0.02, d.meleeTime), wing, dir: Math.cos(aimAngle) >= 0 ? 1 : -1 }
    let hits = 0
    targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = t.x, cy = t.y - t.h / 2
      const dx = cx - origin.x, dy = cy - origin.y, dist = Math.hypot(dx, dy) - t.w / 2
      if (dist > reach) return
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

  const env = (groundY: number, playerX: number, playerY: number): EnemyEnv => ({
    playerX, playerY, groundY, viewL: view.l, viewR: view.r,
    onBite: t => { kills.bites++; addText(playerX, playerY - 150, 'mordida!', '#ff6b5b'); burst(playerX + (t.face > 0 ? -20 : 20), playerY - 80, 10, '#ff6b5b', 200, 3); sound('bite', null) },
  })

  return {
    get inventory() { return inv },
    get current() { return cur },
    get reloading() { return reloadT > 0 ? 1 - reloadT / Math.max(0.01, def().reloadTime) : 0 },
    get kick() { return kick },
    get swing() { return swing },
    get throwCharge() { return throwT > 0 ? Math.min(1, throwT / Math.max(0.05, def().throwCharge)) : 0 },
    get aimAngle() { return aimAngle },
    get fireCharge() { const d = def(); return d.fireMode === 'charge' && chargeT > 0 ? Math.min(1, chargeT / Math.max(0.05, d.chargeTime)) : 0 },
    predict,
    booms, tracers, sounds,
    bullets, thrown, targets, pickups, sparks, texts, racks,
    def,
    setItems(next: Record<ItemId, ItemDef>) {
      items = next
      inv.forEach(o => { if (o) { o.ammo = Math.min(o.ammo, items[o.item].mag); if (items[o.item].durability > 0 && o.durability <= 0) o.durability = items[o.item].durability } })
    },
    addTarget(x: number, y: number) { targets.push({ id: nextId++, kind: 'dummy', home: x, x, y, w: 46, h: 112, hp: 100, maxHp: 100, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'idle', animT: 0 }) },
    addButton(x: number, y: number, id: string) { targets.push({ id: nextId++, kind: 'button', home: x, x, y, w: 40, h: 40, hp: 1, maxHp: 1, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'idle', animT: 0, label: id }) },
    // the part of the world on screen (enemies enter from its sides)
    setView(l: number, r: number) { view = { l, r } },
    pressed, kills,
    spawnAliens(groundY: number, playerX: number) { spawnAlienRow(targets, env(groundY, playerX, 0)) },
    spawnZombies(groundY: number, playerX: number, count: number) { spawnZombies(targets, env(groundY, playerX, 0), count) },
    clearEnemies() { for (let i = targets.length - 1; i >= 0; i--) if (targets[i].kind === 'alien' || targets[i].kind === 'zombie') targets.splice(i, 1) },
    get enemies() { return targets.filter(t => (t.kind === 'alien' || t.kind === 'zombie') && t.deadT <= 0 && t.state !== 'dead').length },
    addRack(x: number, item: ItemId) { racks.push({ x, item, t: 0, label: items[item].name.toUpperCase() }) },
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

    step(dt: number, body: Body, origin: { x: number; y: number }, muzzle: { x: number; y: number }, targetAngle: number, input: FrameInput, boxes: Box[], groundY: number, onRecoil: (vx: number, vy: number) => void) {
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
      if (swing) { swing.t += dt; if (swing.t > swing.time) swing = null }

      // switching items
      if (input.slot) equip(input.slot - 1)
      else if (input.pick) equip(cur + input.pick)

      // reload
      if (reloadT > 0) {
        reloadT -= dt
        if (reloadT <= 0) {
          const h = held()
          if (h && d.shellReload) { h.ammo = Math.min(d.mag, h.ammo + 1); reloadT = h.ammo < d.mag ? d.reloadTime : 0; sound(reloadT ? 'shell' : 'reloadDone') }
          else { if (h) { h.ammo = items[h.item].mag; sound('reloadDone') } reloadT = 0 }
        }
      }
      if (input.reload) startReload()
      if (pumpT > 0) { pumpT -= dt; if (pumpT <= 0) sound('pump') }

      // fire: with an item it shoots; with empty hands (or an item without ammo) it is a wing slap
      const h = held()
      const canFire = body.state !== 'slide' || d.slideFire
      if (!h || d.mag === 0) {
        if (input.firePressed && meleeCool <= 0) melee(origin, true, body.scale)
      } else if (canFire) {
        const spreadDeg = this.spread(body)
        const ctx = { boxes, groundY }
        // shell by shell: firing with something loaded stops the reload
        if (reloadT > 0 && d.shellReload && h.ammo > 0 && input.firePressed) reloadT = 0
        if (reloadT > 0) { if (input.firePressed) sound('dry') }
        else if (h.ammo <= 0) { if (input.firePressed) { sound('dry'); if (d.autoReload) startReload(); else addText(origin.x, origin.y - 40, 'vazio', '#aaaaaa') } }
        else if (d.fireMode === 'semi') { if (input.firePressed && cooldown <= 0) shoot(muzzle, spreadDeg, onRecoil, 1, ctx) }
        else if (d.fireMode === 'auto') { if (input.fire && cooldown <= 0) shoot(muzzle, spreadDeg, onRecoil, 1, ctx) }
        else if (d.fireMode === 'charge') {
          // hold to charge, let go to shoot; force and precision grow with the charge
          if (input.fire && cooldown <= 0) { if (chargeT === 0) sound('charge'); chargeT += dt }
          if (!input.fire && prevFire && chargeT > 0) {
            const p = Math.min(1, chargeT / Math.max(0.05, d.chargeTime))
            shoot(muzzle, spreadDeg * (1 - 0.7 * p), onRecoil, d.chargeMin + (1 - d.chargeMin) * p, ctx)
            chargeT = 0
          }
        } else {
          if (input.firePressed && burstLeft <= 0 && cooldown <= 0) burstLeft = d.burst
          if (burstLeft > 0 && cooldown <= 0 && h.ammo > 0) { shoot(muzzle, spreadDeg, onRecoil, 1, ctx); burstLeft--; if (burstLeft <= 0) cooldown = 3 / d.rate }
        }
      }
      prevFire = input.fire
      if (input.melee && meleeCool <= 0) melee(origin, !h, body.scale)

      // throw: hold to charge, let go to throw what she holds
      if (input.throwHeld) throwT += dt
      if (input.throwReleased) {
        const t = held()
        if (t) {
          const p = Math.min(1, throwT / Math.max(0.05, d.throwCharge))
          const v = d.throwMin + (Math.max(d.throwMin, d.throwSpeed) - d.throwMin) * p
          sound('throw', null)
          thrown.push({ x: origin.x, y: origin.y, vx: Math.cos(aimAngle) * v + body.vx * 0.5, vy: Math.sin(aimAngle) * v, spin: (Math.cos(aimAngle) >= 0 ? 1 : -1) * (8 + 10 * p), angle: aimAngle, owned: t, damage: d.throwDamage * (0.4 + 0.6 * p), hit: false })
          inv[cur] = null; reloadT = 0
          const next = inv.findIndex(o => o !== null)
          if (next >= 0) cur = next
        }
        throwT = 0
      }

      const inBox = (x: number, y: number) => boxAt(boxes, x, y)

      // projectiles
      const ctx = { boxes, groundY }
      for (let i = bullets.length - 1; i >= 0; i--) if (stepBullet(bullets[i], dt, ctx)) bullets.splice(i, 1)
      for (let i = booms.length - 1; i >= 0; i--) { booms[i].life -= dt; if (booms[i].life <= 0) booms.splice(i, 1) }
      for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) tracers.splice(i, 1) }

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
      // enemies move; the ones that finished dying leave
      const e = env(groundY, body.x, body.y)
      stepFormations(targets, dt, e)
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if ((t.kind === 'alien' || t.kind === 'zombie') && !stepEnemy(t, dt, e)) targets.splice(i, 1)
      }
      targets.forEach(t => {
        if (t.kind !== 'dummy' && t.kind !== 'button') return
        t.flash = Math.max(0, t.flash - dt)
        if (t.kind === 'button') return
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
