// PigChicKen combat in the Parquinho: the items she carries, firing, hitting, throwing, projectiles,
// target dummies and items lying on the ground. World coordinates (x grows into the world, y is the screen's).
import { DEFAULT_ITEMS, type ItemDef, type ItemId } from './items'
import { INVENTORY_MAX, insertSorted, itemGroup, slotCount, wrapSlot } from './inventory'
import type { WeaponSound } from './sfx'
import { ALIEN_DEATH, ZOMBIE_TIMES, spawnAlienRow, spawnZombies, stepEnemy, stepFormations, type EnemyEnv } from './enemies'
import { createConductor, DEGREE_COLORS, NOTE_SYMBOLS } from './music'
import type { Drum, Held, VoiceId } from './synth'
import { cleanDummyParams, dummyAnswerMidi, dummyStage, DUMMY_STAGE_MAX, type DummyParams } from './dummies'

// where the instruments' sound goes (the Parquinho plugs the synth in)
export type MusicOut = {
  note: (voice: VoiceId, midi: number, at: number, dur: number, vel: number) => void
  hold: (voice: VoiceId, midi: number) => Held | null
  drum: (kind: Drum, at: number) => void
}
const SILENT: MusicOut = { note: () => {}, hold: () => null, drum: () => {} }
// a note in flight: its pitch, colour and how it sways
export type NoteInfo = { midi: number; color: string; sym: string; wave: number; phase: number; voice: VoiceId }
// a converted enemy leaving the scene: aliens become birds, zombies become happy people
export type Critter = { kind: 'bird' | 'person'; x: number; y: number; vx: number; vy: number; t: number; color: string; face: number; groundY: number }

// a platform's box. solid: she and the items lying around stand on it (default yes); shots: bullets, grenades and the
// beam stop at it (default yes); notes: the instruments' notes stop at it (default no, they go through)
export type Box = { l: number; t: number; r: number; b: number; solid?: boolean; shots?: boolean; notes?: boolean }
export type Owned = { item: ItemId; ammo: number; durability: number }
export type Bullet = {
  x: number; y: number; vx: number; vy: number; dist: number; damage: number; pierce: number; hits: Set<number>; size: number; drop: number; range: number
  item: ItemId; t: number; explode: number; explodeDamage: number; fuse: number; bounce: number
  note?: NoteInfo; ring?: number // instruments: the note it carries; notes it lets out when it bursts
  ghost?: boolean // goes through walls and floating platforms (instruments' notes)
}
export type Boom = { x: number; y: number; r: number; life: number; color?: string }
export type Tracer = { x1: number; y1: number; x2: number; y2: number; life: number }
export type Thrown = { x: number; y: number; vx: number; vy: number; spin: number; angle: number; owned: Owned; damage: number; hit: boolean }
// x: centre, y: bottom. dummy targets break in stages and stay wrecked until notes mend them; aliens and zombies are removed; buttons never fall
export type TargetKind = 'dummy' | 'alien' | 'zombie' | 'button'
export type Target = {
  id: number; kind: TargetKind; home: number; x: number; y: number; w: number; h: number; hp: number; maxHp: number; flash: number; wobble: number; vx: number; deadT: number
  face: number; state: string; animT: number; label?: string; data?: unknown
  // instruments: the harmony bar (full at maxHp converts), how long it stays still, its answer's cooldown, the tint of the last note
  harmony?: number; stun?: number; answerCool?: number; tint?: string
  // the share of each hit it blocks (1 = immune right now): the temple's drums between beats, the dragon's head
  shield?: number
  // training dummies: their own params, the stage they are in, how long the tip bubble shows, the crack's jolt
  dummy?: DummyState
}
export type DummyState = { params: DummyParams; stage: number; tipT: number; crackT: number }
// how long the tip stays up after it is destroyed (and after each hit while wrecked)
export const TIP_TIME = 8
export const TIP_AGAIN = 5
export type Pickup = { id: number; owned: Owned; x: number; y: number; vy: number; resting: boolean; noPick: number }
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export type FloatText = { x: number; y: number; text: string; life: number; color: string; size?: number }
// range: wing reach; reach: wing plus the item's length (the hit area); dir: which way it sweeps (1 = clockwise on screen)
// time: seconds the sweep takes
export type Swing = { angle: number; arc: number; range: number; reach: number; t: number; time: number; wing: boolean; dir: number }

export type Body = { x: number; y: number; face: number; scale: number; grounded: boolean; state: string; vx: number }
export type FrameInput = {
  fire: boolean; firePressed: boolean; melee: boolean; throwHeld: boolean; throwReleased: boolean
  reload: boolean; pick: number; slot: number // pick: +1 / -1 cycles; slot: 1-based exact slot (keys, bar, wheel), 0 none
  grab?: boolean // standing on an item: takes it (free slot) or swaps it with the held one (full inventory)
  grabHeld?: boolean // Pegar held down: every item she passes over is taken as if grab were pressed on it
}

export const SLOTS = INVENTORY_MAX
const THROW_GRAVITY = 1500
const ITEM_GRAVITY = 1800

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const DEG = Math.PI / 180

export function createCombat() {
  let items: Record<ItemId, ItemDef> = structuredClone(DEFAULT_ITEMS)
  // the items she carries, grouped and in order (instruments, weapons, others); cur may be inv.length:
  // the empty slot (empty hands), which exists while there is room
  const inv: Owned[] = []
  let cur = 0
  let cooldown = 0, burstLeft = 0, reloadT = 0, bloom = 0, meleeCool = 0, kick = 0, throwT = 0, chargeT = 0, prevFire = false
  let aimAngle = 0
  // the throw goes where the aim points, all the way round (not slowed by a heavy item's turn rate)
  let throwAngle = 0
  let nextId = 1
  const booms: Boom[] = [], tracers: Tracer[] = []
  // sounds to play this frame (the Parquinho drains it)
  const sounds: { kind: WeaponSound; item: ItemId | null }[] = []
  const sound = (kind: WeaponSound, item: ItemId | null = held()?.item ?? null) => {
    const d = item ? items[item] : null
    // instruments make musical sounds instead of the mechanical ones
    if (d?.instrument) {
      const root = music.noteFor(-Math.PI / 2, 'chord', d.octave, 0.5)
      if (kind === 'equip') { out.note(d.voice, root, 0, 0.12, 0.5); out.note(d.voice, music.walk(root, 2, 'chord'), 0.09, 0.18, 0.5) }
      else if (kind === 'reloadDone' || kind === 'shell') out.note(d.voice, music.walk(root, 1, 'chord'), 0, 0.1, 0.35)
      else if (kind === 'dry') out.note('chip', root - 24, 0, 0.05, 0.25)
      else if (kind === 'bounce') out.drum('jingle', 0)
      else if (kind === 'throw' || kind === 'swing' || kind === 'button' || kind === 'bite' || kind === 'alienDie' || kind === 'zombieDie' || kind === 'explode') sounds.push({ kind, item })
      return
    }
    sounds.push({ kind, item })
  }
  let pumpT = 0
  // buttons hit this frame, bites she took, enemies down
  const pressed: string[] = []
  const kills = { aliens: 0, zombies: 0, bites: 0 }
  let view = { l: 0, r: 1280 }
  const bullets: Bullet[] = [], thrown: Thrown[] = [], targets: Target[] = [], pickups: Pickup[] = [], sparks: Spark[] = [], texts: FloatText[] = []
  // y: the floor the rack stands on (a platform's top), or the ground when unset
  const racks: { x: number; item: ItemId; t: number; label: string; y?: number }[] = []
  let swing: Swing | null = null
  // music: the beat and the harmony, the instruments' sound, the arpeggio's place, the violin's beam, the harp's glissando
  const music = createConductor()
  let out: MusicOut = SILENT
  let arpStep = 0, arpIdle = 0, phraseBase = 0, glissNext = 0, glissSteps = 0, bonusTextT = 0
  let beam: { x1: number; y1: number; x2: number; y2: number; midi: number; color: string; target: number | null } | null = null
  let beamHeld: Held | null = null, beamMidi = 0
  const critters: Critter[] = []
  let quantizeAll = true
  const conv = { birds: 0, people: 0, harmonized: 0 }

  const held = (): Owned | null => inv[cur] ?? null
  const groupOf = (o: Owned) => itemGroup(o.item, !!items[o.item]?.instrument)
  const room = () => inv.length < SLOTS
  // the slots shown on the bar and the wheel: her items, plus the empty one while there is room
  const shown = (): (Owned | null)[] => room() ? [...inv, null] : inv.slice()
  // the held item leaves (broke, thrown): her hands are empty (the empty slot, at the end)
  const removeHeld = () => { inv.splice(cur, 1); cur = inv.length }
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
    if (blocked(t, x, y)) return
    if (t.dummy) { hurtDummy(t, damage, pushX, x, y); return }
    damage *= 1 - (t.shield ?? 0)
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
    }
  }

  // a training dummy takes a hit: it loses life and breaks a stage at a time; wrecked, it only rattles and shows its tip again
  function hurtDummy(t: Target, damage: number, pushX: number, x: number, y: number) {
    const d = t.dummy!
    t.flash = 0.12; t.wobble = Math.sign(pushX || 1) * (d.stage === 0 ? 0.15 : 0.35); t.vx += pushX * (d.stage === 0 ? 0.3 : 1)
    if (t.hp <= 0) {
      burst(x, y, 4, '#8a7a5c', 120, 2)
      if (d.params.message) d.tipT = Math.max(d.tipT, TIP_AGAIN)
      answerDummy(t)
      return
    }
    t.hp = Math.max(0, t.hp - damage)
    addText(x, y - 10, String(Math.round(damage)), '#ffd166')
    burst(x, y, 5, '#ffd166', 160, 2)
    setStage(t)
    answerDummy(t)
  }

  // notes mend a dummy: life comes back, and with it the stages (and its tune)
  function mendDummy(t: Target, amount: number, color: string) {
    if (amount <= 0) return
    const was = t.hp
    t.hp = Math.min(t.maxHp, t.hp + amount); t.tint = color
    if (t.hp > was && Math.random() < 0.5) sparks.push({ x: t.x + rand(-t.w / 2, t.w / 2), y: t.y - rand(t.h * 0.4, t.h), vx: rand(-30, 30), vy: rand(-90, -40), life: 0.5, max: 0.5, color: '#7bd88f', size: 3 })
    setStage(t)
    if (was < t.maxHp && t.hp >= t.maxHp) {
      conv.harmonized++
      const top = t.y - t.h / 2
      music.chord(true).forEach((m, i) => { out.note('bells', m + 12, i * 0.07, 0.3, 0.5); texts.push({ x: t.x + (i - 1.5) * 16, y: top - 30 - i * 6, text: NOTE_SYMBOLS[i % 4], life: 1.1, color: DEGREE_COLORS[music.degreeOf(m)], size: 20 }) })
      addText(t.x, t.y - t.h - 24, 'novinho!', '#7bd88f')
    }
  }

  // the stage follows the life: breaking down cracks it (splinters, a jolt); mending it up chimes
  function setStage(t: Target) {
    const d = t.dummy!
    const next = dummyStage(t.hp, t.maxHp)
    if (next === d.stage) return
    const top = t.y - t.h * 0.7
    if (next < d.stage) {
      d.crackT = 0.35
      burst(t.x, top, next === 0 ? 26 : 12, '#c9a46a', next === 0 ? 320 : 220, next === 0 ? 5 : 4)
      if (next === 0) {
        burst(t.x, top, 12, '#d6453d', 240, 3)
        addText(t.x, t.y - t.h - 16, 'destruído!', '#ff8c69')
        if (d.params.message) d.tipT = TIP_TIME
        sound('block', null)
      }
    } else {
      burst(t.x, top, 8, '#7bd88f', 140, 3)
      if (d.stage === 0) d.tipT = Math.min(d.tipT, 0.4)
      if (next < DUMMY_STAGE_MAX) addText(t.x, t.y - t.h - 16, 'melhorou!', '#7bd88f')
    }
    d.stage = next
  }

  // its answer: low and sour when wrecked, climbing the zone's scale and getting in tune as it gets better
  function answerDummy(t: Target) {
    if ((t.answerCool ?? 0) > 0) return
    t.answerCool = 0.14
    const d = t.dummy!
    const m = dummyAnswerMidi(d.stage, (from, n) => music.walk(from, n, 'scale'))
    const vel = 0.35 + 0.1 * d.stage
    out.note('keys', m, 0, 0.3, vel)
    // wrecked: a second, sourer note rubs against it
    if (d.stage === 0) out.note('keys', m + 0.8 + rand(-0.15, 0.15), 0.03, 0.4, 0.3)
  }

  // a shielded target: the hit glances off with a spark and a metallic tink
  function blocked(t: Target, x: number, y: number) {
    if ((t.shield ?? 0) < 1) return false
    if (t.flash <= 0) { t.flash = 0.06; burst(x, y, 4, '#e9e4d0', 160, 2); sound('block', null) }
    return true
  }

  // a note lands: it fills the harmony bar instead of hurting; the enemy answers with a note of its own
  function harmonize(t: Target, amount: number, pushX: number, x: number, y: number, note: NoteInfo, stun: number) {
    if (t.deadT > 0 || t.state === 'converted' || amount <= 0) return
    if (t.kind === 'button') { hitTarget(t, 1, 0, x, y); return }
    if (blocked(t, x, y)) return
    if (t.dummy) {
      t.flash = 0.12; t.vx += pushX * 0.3
      texts.push({ x, y: y - 10, text: note.sym, life: 0.8, color: note.color, size: 18 })
      burst(x, y, 4, note.color, 120, 3)
      mendDummy(t, amount, note.color); answerDummy(t)
      return
    }
    t.harmony = (t.harmony ?? 0) + amount; t.flash = 0.12; t.tint = note.color; t.vx += pushX * 0.3
    t.stun = Math.max(t.stun ?? 0, stun)
    if (t.kind === 'zombie' && t.state === 'walk' && stun > 0) { t.state = 'hurt'; t.animT = 0 }
    texts.push({ x, y: y - 10, text: note.sym, life: 0.8, color: note.color, size: 18 })
    burst(x, y, 4, note.color, 120, 3)
    // question and answer: an eighth later the enemy sings a chord note above (aliens chirp, zombies hum)
    if ((t.answerCool ?? 0) <= 0 && t.kind !== 'dummy') {
      t.answerCool = 0.35
      const ans = music.walk(note.midi, 2, 'chord')
      const at = music.toGrid() + music.secondsPerBeat() / 2
      if (t.kind === 'alien') out.note('chip', ans + 12, at, 0.12, 0.5)
      else out.note('hum', ans - 12, at, 0.35, 0.6)
    }
    if (t.harmony >= t.maxHp) convert(t)
  }

  // full harmony: aliens become birds and fly away, zombies become happy people and run off
  function convert(t: Target) {
    const chord = music.chord(true)
    const top = t.y - t.h / 2
    t.state = 'converted'; t.deadT = 0.001
    const away = Math.sign(t.x - (lastBody?.x ?? t.x)) || 1
    if (t.kind === 'alien') {
      const color = (t.data as { color?: string } | undefined)?.color ?? '#ffffff'
      critters.push({ kind: 'bird', x: t.x, y: top, vx: away * rand(90, 160), vy: -rand(140, 220), t: 0, color, face: away, groundY: 0 })
      conv.birds++
      chord.forEach((m, i) => out.note('bird', m + 12, i * 0.06, 0.1, 0.6))
      burst(t.x, top, 16, color, 200, 4)
    } else {
      critters.push({ kind: 'person', x: t.x, y: t.y, vx: away * rand(230, 290), vy: 0, t: 0, color: '#ff6b9a', face: away, groundY: t.y })
      conv.people++
      chord.concat(chord[0] + 12).forEach((m, i) => out.note('keys', m, i * 0.08, 0.25, 0.6))
      texts.push({ x: t.x, y: top - 40, text: '♥', life: 1.2, color: '#ff6b9a', size: 26 })
    }
    addText(t.x, top - 60, t.kind === 'alien' ? 'virou passarinho!' : 'curado!', '#7bdff2')
  }
  let lastBody: Body | null = null

  // ---------- loadouts: one per local player ----------
  type Loadout = {
    inv: Owned[]; cur: number; cooldown: number; burstLeft: number; reloadT: number; bloom: number; meleeCool: number; kick: number
    throwT: number; chargeT: number; prevFire: boolean; aimAngle: number; pumpT: number; swing: Swing | null
    beam: { x1: number; y1: number; x2: number; y2: number; midi: number; color: string; target: number | null } | null; beamHeld: Held | null; beamMidi: number; arpStep: number; arpIdle: number; phraseBase: number
    glissNext: number; glissSteps: number; hover: Pickup | null; hoverOwned: Pickup | null; lastBody: Body | null
  }
  const loadouts = new Map<string, Loadout>()
  let active = 'p1'
  const save = (): Loadout => ({
    inv: inv.slice(), cur, cooldown, burstLeft, reloadT, bloom, meleeCool, kick, throwT, chargeT, prevFire, aimAngle, pumpT, swing,
    beam, beamHeld, beamMidi, arpStep, arpIdle, phraseBase, glissNext, glissSteps, hover, hoverOwned, lastBody,
  })
  const blank = (): Loadout => ({
    inv: [], cur: 0, cooldown: 0, burstLeft: 0, reloadT: 0, bloom: 0, meleeCool: 0, kick: 0, throwT: 0, chargeT: 0, prevFire: false, aimAngle: 0, pumpT: 0, swing: null,
    beam: null, beamHeld: null, beamMidi: 0, arpStep: 0, arpIdle: 0, phraseBase: 0, glissNext: 0, glissSteps: 0, hover: null, hoverOwned: null, lastBody: null,
  })
  function useLoadout(id: string) {
    if (id === active) return
    loadouts.set(active, save())
    const l = loadouts.get(id) ?? blank()
    inv.splice(0, inv.length, ...l.inv)
    ;({ cur, cooldown, burstLeft, reloadT, bloom, meleeCool, kick, throwT, chargeT, prevFire, aimAngle, pumpT, swing, beam, beamHeld, beamMidi, arpStep, arpIdle, phraseBase, glissNext, glissSteps, hover, hoverOwned, lastBody } = l)
    active = id
  }

  // can she take this item? (one of each item)
  const canTake = (p: Pickup) => p.noPick <= 0 && !inv.some(o => o.item === p.owned.item)

  // grab with room: the item goes into its group's place and she holds it (picking up is always the player's choice)
  function pickUp(p: Pickup) {
    if (!canTake(p) || !room()) return false
    stopBeam()
    cur = insertSorted(inv, p.owned, groupOf); reloadT = 0; chargeT = 0; burstLeft = 0; pumpT = 0
    sound('equip', p.owned.item)
    addText(p.x, p.y - 30, `+ ${items[p.owned.item].name}`, '#7bdff2')
    return true
  }

  // grab with no free slot: the item takes the place of the held one, which falls to the floor
  function swapIn(p: Pickup) {
    const old = held()
    stopBeam()
    if (old) { pickups.push({ id: nextId++, owned: old, x: p.x + (Math.random() < 0.5 ? -24 : 24), y: p.y - 20, vy: -260, resting: false, noPick: 1.2 }); inv.splice(cur, 1) }
    cur = insertSorted(inv, p.owned, groupOf); reloadT = 0; chargeT = 0; burstLeft = 0
    sound('equip', p.owned.item)
    addText(p.x, p.y - 30, `↔ ${items[p.owned.item].name}`, '#4cc9f0')
  }
  let hover: Pickup | null = null
  // items taken (or dropped by a swap) during the current hold of Pegar: each is taken once per hold
  const heldTaken = new Set<number>()
  // an item on the floor she already carries: grab equips hers
  let hoverOwned: Pickup | null = null

  function equip(i: number) {
    i = wrapSlot(i, slotCount(inv.length))
    if (i === cur) return
    stopBeam()
    cur = i; reloadT = 0; burstLeft = 0; chargeT = 0; pumpT = 0; cooldown = Math.max(cooldown, 0.15)
    if (held()) sound('equip')
  }

  function startReload() {
    const h = held(); if (!h) return
    const d = items[h.item]
    if (d.mag > 0 && h.ammo < d.mag && reloadT <= 0) { reloadT = d.reloadTime; sound('reload') }
  }

  // one shot: `power` (0..1) scales speed in charge mode; pellets spread evenly across the cone
  // the notes of one shot: the aim picks the note inside the chord (or scale); the arpeggiator, the phrase,
  // the strum and the glissando walk from there
  function shotNotes(d: ItemDef, n: number) {
    const base = music.noteFor(aimAngle, d.pitchSet, d.octave, d.span)
    if (n > 1) return Array.from({ length: n }, (_, i) => music.walk(base, Math.floor(n / 2) - i, 'chord'))
    if (d.gliss) return [music.walk(base, glissSteps, d.pitchSet)]
    let off = 0
    const k = arpStep++
    if (d.arp === 'up') off = k % 4
    else if (d.arp === 'down') off = -(k % 4)
    else if (d.arp === 'updown') { const c = k % 6; off = c <= 3 ? c : 6 - c }
    else if (d.arp === 'random') off = Math.floor(rand(-2, 4))
    else if (d.arp === 'phrase') { if (burstLeft === d.burst || burstLeft <= 0) phraseBase = base; return [music.walk(phraseBase, d.burst - Math.max(1, burstLeft), d.pitchSet)] }
    return [music.walk(base, off, d.arp === 'off' ? d.pitchSet : 'chord')]
  }

  function shoot(muzzle: { x: number; y: number }, spreadDeg: number, onRecoil: (vx: number, vy: number) => void, power = 1, ctx?: StepCtx) {
    const h = held()!, d = items[h.item]
    const mx = muzzle.x, my = muzzle.y
    const n = Math.max(1, Math.round(d.pellets))
    // instruments: the sound waits for the next sixteenth (within the window), and a shot on the beat converts more
    let notes: number[] = [], at = 0, bonus = 1
    if (d.instrument) {
      notes = shotNotes(d, n)
      const g = music.toGrid()
      at = d.quantize && quantizeAll && g * 1000 <= d.quantWindow ? g : 0
      if (music.offBeat() < 0.07) {
        bonus = d.beatBonus
        if (bonusTextT <= 0 && bonus > 1) { texts.push({ x: mx, y: my - 40, text: 'no tempo!', life: 0.7, color: '#ffd166', size: 12 }); bonusTextT = 0.6 }
      }
      notes.forEach((m, i) => out.note(d.voice, m, at + i * d.strum, d.noteLen, 0.75))
    }
    const speed = d.speed * power
    const damage = d.explodeRadius > 0 ? d.damage : d.damage * (d.fireMode === 'charge' ? 0.3 + 0.7 * power : 1)
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? rand(-0.5, 0.5) : i / (n - 1) - 0.5 + rand(-0.3, 0.3) / n
      const a = aimAngle + u * spreadDeg * DEG
      const b: Bullet = {
        x: mx, y: my, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dist: 0, damage: damage * bonus, pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
        item: h.item, t: 0, explode: d.explodeRadius, explodeDamage: d.explodeDamage * bonus, fuse: d.fuse, bounce: d.bounce,
      }
      if (d.instrument) {
        const m = notes[Math.min(notes.length - 1, n === 1 ? 0 : n - 1 - i)]
        b.note = { midi: m, color: DEGREE_COLORS[music.degreeOf(m) % DEGREE_COLORS.length], sym: NOTE_SYMBOLS[(m + i) % NOTE_SYMBOLS.length], wave: d.wave, phase: rand(0, Math.PI * 2), voice: d.voice }
        b.ring = d.ringNotes; b.ghost = true
      }
      // instant shots travel their whole way now and leave a tracer
      if (d.hitscan && ctx) {
        let guard = 0
        while (!stepBullet(b, 1 / 240, ctx) && guard++ < 2000) { /* travel */ }
        tracers.push({ x1: mx, y1: my, x2: b.x, y2: b.y, life: 0.12 })
      } else bullets.push(b)
    }
    if (d.instrument) burst(mx, my, 2 + n, DEGREE_COLORS[music.degreeOf(notes[0]) % DEGREE_COLORS.length], 110, 3)
    else { burst(mx, my, 3 + n, '#fff3b0', 140, 2); sound('shot', h.item) }
    if (d.shellReload && h.ammo > 1) pumpT = Math.min(0.3, 0.6 / d.rate)
    h.ammo--; bloom = Math.min(d.spreadMax, bloom + d.spreadShot); cooldown = 1 / d.rate; kick = d.recoilKick
    onRecoil(-Math.cos(aimAngle) * d.recoilPush, -Math.sin(aimAngle) * d.recoilPush)
    if (h.ammo <= 0 && d.autoReload) startReload()
  }

  function explode(x: number, y: number, r: number, damage: number, b?: Bullet) {
    if (b?.note) { musicBurst(x, y, r, damage, b); return }
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

  // an instrument bursting: the chord rings out, everything around takes harmony and a push, and notes fly out in a circle
  function musicBurst(x: number, y: number, r: number, amount: number, b: Bullet) {
    const note = b.note!
    booms.push({ x, y, r, life: 0.5, color: note.color })
    const chord = music.chord(true).map(m => m + 12 * Math.round((note.midi - 60) / 12))
    if (b.item === 'tambourine') out.drum('jingle', 0)
    chord.forEach((m, i) => out.note(note.voice, m, i * 0.03, 0.5, 0.6))
    targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = Math.max(t.x - t.w / 2, Math.min(x, t.x + t.w / 2)), cy = Math.max(t.y - t.h, Math.min(y, t.y))
      const dist = Math.hypot(cx - x, cy - y)
      if (dist > r) return
      harmonize(t, amount * (1 - 0.5 * dist / r), Math.sign(t.x - x || 1) * 500 * (1 - dist / r), cx, cy, note, items[b.item].stun)
    })
    const n = Math.round(b.ring ?? 0)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, m = chord[i % chord.length] + (i >= chord.length ? 12 : 0)
      bullets.push({
        x, y: y - 6, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dist: 0, damage: Math.max(5, amount * 0.35), pierce: 0, hits: new Set(), size: 9, drop: 0, range: r * 1.6,
        item: b.item, t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0,
        note: { midi: m, color: DEGREE_COLORS[music.degreeOf(m) % DEGREE_COLORS.length], sym: NOTE_SYMBOLS[i % 4], wave: 3, phase: rand(0, 6), voice: note.voice }, ring: 0, ghost: true,
      })
    }
  }

  type StepCtx = { boxes: Box[]; groundY: number }
  const boxAt = (boxes: Box[], x: number, y: number, note = false) => boxes.find(b => (note ? b.notes === true : b.shots !== false) && x >= b.l && x <= b.r && y >= b.t && y <= b.b)
  const solidAt = (boxes: Box[], x: number, y: number) => boxes.find(b => b.solid !== false && x >= b.l && x <= b.r && y >= b.t && y <= b.b)
  // moves a projectile one step; true when it is gone
  function stepBullet(b: Bullet, dt: number, { boxes, groundY }: StepCtx, dry = false): boolean {
    const px = b.x, py = b.y
    b.t += dt
    b.vy += b.drop * dt
    b.x += b.vx * dt; b.y += b.vy * dt
    b.dist += Math.hypot(b.x - px, b.y - py)
    const gone = (x: number, y: number) => { if (b.explode > 0 && !dry) explode(x, y, b.explode, b.explodeDamage, b); return true }
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
          if (b.note) harmonize(t, b.damage, Math.sign(b.vx) * 40, x, y, b.note, items[b.item].stun)
          else hitTarget(t, b.damage, Math.sign(b.vx) * 40, x, y)
          b.hits.add(t.id)
          if (b.hits.size > b.pierce) return true
          break
        }
      }
    }
    // walls and the floor: explode, bounce (with a fuse) or stop
    for (let k = 1; k <= steps; k++) {
      const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps
      const box = boxAt(boxes, x, y, !!b.ghost)
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
      if (!dry) burst(b.x, b.y, 4, b.note ? b.note.color : floor ? '#8a6d4b' : '#9fd3a8', 120, 2)
      return true
    }
    return false
  }

  // where a shot would go now (for the reticles): its path and where it ends
  function predict(from: { x: number; y: number }, angle: number, power: number, ctx: StepCtx) {
    const d = def()
    const b: Bullet = {
      x: from.x, y: from.y, vx: Math.cos(angle) * d.speed * power, vy: Math.sin(angle) * d.speed * power, dist: 0, damage: 0, pierce: d.explodeRadius > 0 ? 0 : d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
      item: d.id, t: 0, explode: 0, explodeDamage: 0, fuse: d.fuse, bounce: d.bounce, ghost: d.instrument,
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

  // a throw let go now: its speed at this charge (0..1), plus half of her own run
  function throwVelocity(angle: number, charge: number, bodyVx: number) {
    const d = def()
    const v = d.throwMin + (Math.max(d.throwMin, d.throwSpeed) - d.throwMin) * charge
    return { vx: Math.cos(angle) * v + bodyVx * 0.5, vy: Math.sin(angle) * v }
  }

  // the arc a throw let go now would fly (a dry run of the thrown item's flight): until it lands or hits a target
  function predictThrow(from: { x: number; y: number }, ctx: StepCtx) {
    const charge = throwT > 0 ? Math.min(1, throwT / Math.max(0.05, def().throwCharge)) : 0
    let { vx, vy } = throwVelocity(throwAngle, charge, lastBody?.vx ?? 0)
    let x = from.x, y = from.y
    const points = [{ x, y }], dt = 1 / 60
    for (let n = 0; n < 180; n++) {
      const py = y
      vy += THROW_GRAVITY * dt; x += vx * dt; y += vy * dt
      points.push({ x, y })
      if (targets.some(g => g.deadT <= 0 && Math.abs(x - g.x) < g.w / 2 + 10 && y > g.y - g.h && y < g.y)) break
      const top = vy > 0 && ctx.boxes.find(b => x >= b.l && x <= b.r && py <= b.t && y >= b.t)
      if (top) { points[points.length - 1] = { x, y: top.t }; break }
      if (vy > 0 && y >= ctx.groundY) { points[points.length - 1] = { x, y: ctx.groundY }; break }
      if (boxAt(ctx.boxes, x, y)) break
    }
    return points
  }

  function melee(origin: { x: number; y: number }, wing: boolean, scale: number) {
    const d = wing ? items.wing : def()
    meleeCool = d.meleeCooldown
    sound('swing', null)
    // an instrument hit with Y still sounds: a quick strum of the chord
    if (!wing && d.instrument) music.chord().forEach((m, i) => out.note(d.voice, m + 12 * d.octave, i * 0.02, 0.15, 0.5))
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
        removeHeld()
        burst(origin.x + Math.cos(aimAngle) * 30, origin.y + Math.sin(aimAngle) * 30, 18, '#c9c9c9', 200, 4)
        addText(origin.x, origin.y - 50, `${d.name} quebrou!`, '#ff8c69')
      }
    }
  }

  // the violin: a held note in a beam from the muzzle to the first thing it meets; its pitch follows the aim and the chord
  function stepBeam(d: ItemDef, h: Owned, dt: number, muzzle: { x: number; y: number }, ctx: StepCtx) {
    const dx = Math.cos(aimAngle), dy = Math.sin(aimAngle)
    let x = muzzle.x, y = muzzle.y, hit: Target | null = null
    for (let s = 0; s < d.range; s += 6) {
      x = muzzle.x + dx * s; y = muzzle.y + dy * s
      if (y >= ctx.groundY || boxAt(ctx.boxes, x, y, d.instrument)) break
      hit = targets.find(t => t.deadT <= 0 && t.state !== 'converted' && x >= t.x - t.w / 2 && x <= t.x + t.w / 2 && y >= t.y - t.h && y <= t.y) ?? null
      if (hit) break
    }
    const midi = music.noteFor(aimAngle, d.pitchSet, d.octave, d.span)
    const color = DEGREE_COLORS[music.degreeOf(midi) % DEGREE_COLORS.length]
    if (!beamHeld) { beamHeld = out.hold(d.voice, midi); beamMidi = midi }
    else if (midi !== beamMidi) { beamHeld.setPitch(midi); beamMidi = midi }
    beam = { x1: muzzle.x, y1: muzzle.y, x2: x, y2: y, midi, color, target: hit?.id ?? null }
    h.ammo = Math.max(0, h.ammo - dt * d.rate)
    bloom = 0
    if (hit) {
      const note: NoteInfo = { midi, color, sym: '♩', wave: 0, phase: 0, voice: d.voice }
      // harmony flows while it plays; the target stays still; it answers every so often
      hit.stun = Math.max(hit.stun ?? 0, d.stun)
      if (hit.dummy) { mendDummy(hit, d.damage * dt, color); answerDummy(hit) }
      else hit.harmony = (hit.harmony ?? 0) + d.damage * dt
      hit.tint = color
      if (Math.random() < dt * 10) sparks.push({ x, y, vx: rand(-60, 60), vy: rand(-120, -30), life: 0.4, max: 0.4, color, size: 3 })
      if ((hit.answerCool ?? 0) <= 0 && hit.kind !== 'dummy' && hit.kind !== 'button') harmonize(hit, 0.0001, 0, x, y, note, d.stun)
      if (hit.kind === 'button' && hit.flash <= 0) hitTarget(hit, 1, 0, x, y)
      if (!hit.dummy && (hit.harmony ?? 0) >= hit.maxHp) convert(hit)
    }
    if (h.ammo <= 0) { stopBeam(); if (d.autoReload) startReload() }
  }
  function stopBeam() { beamHeld?.stop(); beamHeld = null; beam = null }

  const env = (groundY: number, playerX: number, playerY: number): EnemyEnv => ({
    playerX, playerY, groundY, viewL: view.l, viewR: view.r,
    onBite: t => { kills.bites++; addText(playerX, playerY - 150, 'mordida!', '#ff6b5b'); burst(playerX + (t.face > 0 ? -20 : 20), playerY - 80, 10, '#ff6b5b', 200, 3); sound('bite', null) },
  })

  return {
    // Local players: each one has their own items, aim, cooldowns and swing (a loadout); the world (targets,
    // enemies, shots, pickups, music) is shared. use(id) makes that player's loadout the current one; the
    // first one in use is 'p1'. Every getter and step() below act on the current loadout.
    use(id: string) { useLoadout(id) },
    get player() { return active },
    drop(id: string) { if (id !== active) loadouts.delete(id) },
    // the slots shown (her items plus the empty one while there is room) and the one she holds
    get inventory() { return shown() },
    get current() { return cur },
    get held() { return held() },
    get reloading() { return reloadT > 0 ? 1 - reloadT / Math.max(0.01, def().reloadTime) : 0 },
    get kick() { return kick },
    get swing() { return swing },
    // the item she stands on that grab would take (drawn with a blue outline)
    get hover() { return hover },
    get hoverOwned() { return hoverOwned },
    // grab on the hovered item swaps (inventory full) instead of taking it into a free slot
    get hoverSwaps() { return !room() },
    get throwCharge() { return throwT > 0 ? Math.min(1, throwT / Math.max(0.05, def().throwCharge)) : 0 },
    get aimAngle() { return aimAngle },
    get throwAngle() { return throwAngle },
    predictThrow,
    get fireCharge() { const d = def(); return d.fireMode === 'charge' && chargeT > 0 ? Math.min(1, chargeT / Math.max(0.05, d.chargeTime)) : 0 },
    predict,
    booms, tracers, sounds, critters, music,
    get beam() { return beam },
    get converted() { return conv },
    setMusicOut(o: MusicOut) { out = o },
    setQuantize(v: boolean) { quantizeAll = v },
    bullets, thrown, targets, pickups, sparks, texts, racks,
    // effects for the modes built on top (the temple): sparks and floating text
    burst, addText(x: number, y: number, text: string, color = '#ffffff', size?: number) { texts.push({ x, y, text, life: size ? 1.2 : 0.9, color, size }) },
    def,
    // an item's sheet (names and numbers for the bar and the wheel)
    item(id: ItemId): ItemDef { return items[id] },
    // creative mode / tests: put an item straight into the inventory (in its group's place) and hold it
    give(item: ItemId) {
      if (inv.some(o => o.item === item) || !room()) return
      stopBeam(); cur = insertSorted(inv, fresh(item), groupOf); sound('equip', item)
    },
    setItems(next: Record<ItemId, ItemDef>) {
      items = next
      inv.forEach(o => { if (o) { o.ammo = Math.min(o.ammo, items[o.item].mag); if (items[o.item].durability > 0 && o.durability <= 0) o.durability = items[o.item].durability } })
    },
    // a training dummy with its own params (the tip it shows when destroyed, its total life); returns its id
    addTarget(x: number, y: number, params?: Partial<DummyParams>) {
      const p = cleanDummyParams(params)
      const id = nextId++
      targets.push({ id, kind: 'dummy', home: x, x, y, w: 46, h: 112, hp: p.maxHp, maxHp: p.maxHp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'idle', animT: 0, dummy: { params: p, stage: DUMMY_STAGE_MAX, tipT: 0, crackT: 0 } })
      return id
    },
    // the editor changes a dummy's params: a new total life keeps the share of life it had
    setDummyParams(id: number, params: Partial<DummyParams>) {
      const t = targets.find(g => g.id === id && g.dummy)
      if (!t?.dummy) return false
      const p = cleanDummyParams(params, t.dummy.params)
      const share = t.maxHp > 0 ? t.hp / t.maxHp : 1
      t.dummy.params = p; t.maxHp = p.maxHp; t.hp = Math.round(share * p.maxHp * 100) / 100
      t.dummy.stage = dummyStage(t.hp, t.maxHp)
      if (!p.message) t.dummy.tipT = 0
      return true
    },
    addButton(x: number, y: number, id: string, w = 40, h = 40) { targets.push({ id: nextId++, kind: 'button', home: x, x, y, w, h, hp: 1, maxHp: 1, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'idle', animT: 0, label: id }) },
    // the part of the world on screen (enemies enter from its sides)
    setView(l: number, r: number) { view = { l, r } },
    pressed, kills,
    spawnAliens(groundY: number, playerX: number) { spawnAlienRow(targets, env(groundY, playerX, 0)) },
    spawnZombies(groundY: number, playerX: number, count: number) { spawnZombies(targets, env(groundY, playerX, 0), count) },
    clearEnemies() { for (let i = targets.length - 1; i >= 0; i--) if (targets[i].kind === 'alien' || targets[i].kind === 'zombie') targets.splice(i, 1) },
    get enemies() { return targets.filter(t => (t.kind === 'alien' || t.kind === 'zombie') && t.deadT <= 0 && t.state !== 'dead').length },
    addRack(x: number, item: ItemId, y?: number) { racks.push({ x, item, t: 0, label: items[item].name.toUpperCase(), y }) },
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

    // world: false steps only the current player's loadout (another local player in the same frame)
    step(dt: number, body: Body, origin: { x: number; y: number }, muzzle: { x: number; y: number }, targetAngle: number, input: FrameInput, boxes: Box[], groundY: number, onRecoil: (vx: number, vy: number) => void, opts: { world?: boolean } = {}) {
      const world = opts.world !== false
      const d = def()
      // aim turns at the item's speed
      if (d.turnRate > 0) {
        let diff = Math.atan2(Math.sin(targetAngle - aimAngle), Math.cos(targetAngle - aimAngle))
        const max = d.turnRate * DEG * dt
        diff = Math.max(-max, Math.min(max, diff))
        aimAngle += diff
      } else aimAngle = targetAngle
      throwAngle = targetAngle

      lastBody = body
      if (world) { music.step(dt); bonusTextT = Math.max(0, bonusTextT - dt) }
      // the arpeggio starts over after a pause
      if (!input.fire) { arpIdle += dt; if (arpIdle > 0.6) arpStep = 0 } else arpIdle = 0
      cooldown = Math.max(0, cooldown - dt); meleeCool = Math.max(0, meleeCool - dt)
      kick = Math.max(0, kick - dt * 60)
      bloom = Math.max(0, bloom - d.spreadRecover * dt)
      if (swing) { swing.t += dt; if (swing.t > swing.time) swing = null }

      // switching items
      if (input.slot) { if (input.slot <= slotCount(inv.length)) equip(input.slot - 1) }
      else if (input.pick) equip(cur + input.pick)
      const dNow = def()
      if (beam && (!input.fire || !dNow.beam)) stopBeam()

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
        if (d.beam) { if (reloadT <= 0 && h.ammo > 0 && input.fire) stepBeam(d, h, dt, muzzle, ctx); else if (beam) stopBeam(); if (input.firePressed && (reloadT > 0 || h.ammo <= 0)) { sound('dry'); if (h.ammo <= 0 && d.autoReload) startReload() } }
        else if (reloadT > 0) { if (input.firePressed) sound('dry') }
        else if (h.ammo <= 0) { if (input.firePressed) { sound('dry'); if (d.autoReload) startReload(); else addText(origin.x, origin.y - 40, 'vazio', '#aaaaaa') } }
        else if (d.fireMode === 'semi') { if (input.firePressed && cooldown <= 0) shoot(muzzle, spreadDeg, onRecoil, 1, ctx) }
        // on release: aim with the button held, the shot leaves when it is let go
        else if (d.fireMode === 'release') { if (!input.fire && prevFire && cooldown <= 0) shoot(muzzle, spreadDeg, onRecoil, 1, ctx) }
        else if (d.fireMode === 'auto') { if (input.fire && cooldown <= 0) shoot(muzzle, spreadDeg, onRecoil, 1, ctx) }
        else if (d.fireMode === 'charge') {
          // hold to charge, let go to shoot; force and precision grow with the charge
          if (input.fire && cooldown <= 0) {
            if (chargeT === 0) { sound('charge'); glissSteps = 0; glissNext = 0 }
            chargeT += dt
            // the harp: the charge runs up the scale, faster as it fills
            if (d.gliss && d.instrument) {
              const p = Math.min(1, chargeT / Math.max(0.05, d.chargeTime))
              glissNext -= dt
              if (glissNext <= 0 && glissSteps < 7) {
                out.note(d.voice, music.walk(music.noteFor(aimAngle, d.pitchSet, d.octave, d.span), glissSteps, d.pitchSet), 0, 0.25, 0.35 + 0.3 * p)
                glissSteps++; glissNext = Math.max(0.04, 0.16 - 0.12 * p)
              }
            }
          }
          if (!input.fire && prevFire && chargeT > 0) {
            const p = Math.min(1, chargeT / Math.max(0.05, d.chargeTime))
            if (d.gliss) glissSteps = Math.max(0, glissSteps - 1)
            shoot(muzzle, spreadDeg * (1 - 0.7 * p), onRecoil, d.chargeMin + (1 - d.chargeMin) * p, ctx)
            chargeT = 0; glissSteps = 0
          }
        } else {
          if (input.firePressed && burstLeft <= 0 && cooldown <= 0) burstLeft = d.burst
          if (burstLeft > 0 && cooldown <= 0 && h.ammo > 0) {
            shoot(muzzle, spreadDeg, onRecoil, 1, ctx); burstLeft--
            if (burstLeft <= 0) cooldown = 3 / d.rate
            else if (d.instrument) cooldown = 1 / Math.max(1, d.arpRate) // a phrase plays at the arpeggio's speed
          }
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
          const { vx, vy } = throwVelocity(throwAngle, p, body.vx)
          sound('throw', null)
          thrown.push({ x: origin.x, y: origin.y, vx, vy, spin: (Math.cos(throwAngle) >= 0 ? 1 : -1) * (8 + 10 * p), angle: throwAngle, owned: t, damage: d.throwDamage * (0.4 + 0.6 * p), hit: false })
          removeHeld(); reloadT = 0
          // the next item in the wing: the first one (empty hands when she has none)
          cur = 0
        }
        throwT = 0
      }

      const inBox = (x: number, y: number) => solidAt(boxes, x, y)

      // projectiles
      const ctx = { boxes, groundY }
      if (world) for (let i = bullets.length - 1; i >= 0; i--) if (stepBullet(bullets[i], dt, ctx)) bullets.splice(i, 1)
      if (world) for (let i = booms.length - 1; i >= 0; i--) { booms[i].life -= dt; if (booms[i].life <= 0) booms.splice(i, 1) }
      if (world) for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) tracers.splice(i, 1) }

      // thrown items: spin, hit once, land as a pickup
      if (world) for (let i = thrown.length - 1; i >= 0; i--) {
        const t = thrown[i]
        const py = t.y
        t.vy += THROW_GRAVITY * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.angle += t.spin * dt
        if (!t.hit) for (const g of targets) {
          if (g.deadT > 0) continue
          if (Math.abs(t.x - g.x) < g.w / 2 + 10 && t.y > g.y - g.h && t.y < g.y) {
            hitTarget(g, t.damage, Math.sign(t.vx) * 220, t.x, t.y); t.hit = true; t.vx *= -0.3; t.vy = Math.min(t.vy, -200)
          }
        }
        const top = boxes.find(b => b.solid !== false && t.x >= b.l && t.x <= b.r && py <= b.t && t.y >= b.t)
        const side = !top && inBox(t.x, t.y)
        if (side) { t.vx *= -0.4; t.x += t.vx * dt * 2 }
        const floor = top ? top.t : t.y >= groundY ? groundY : null
        if (floor !== null && t.vy > 0) {
          pickups.push({ id: nextId++, owned: t.owned, x: t.x, y: floor, vy: 0, resting: true, noPick: 0.5 })
          burst(t.x, floor, 6, '#c9b48a', 120, 2)
          thrown.splice(i, 1)
        }
      }

      // pickups: fall to the floor; walking over one only offers it, grab (Pegar) takes it
      hover = null; hoverOwned = null
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]
        if (world) p.noPick = Math.max(0, p.noPick - dt)
        if (world && !p.resting) {
          const py = p.y
          p.vy += ITEM_GRAVITY * dt; p.y += p.vy * dt
          const top = boxes.find(b => b.solid !== false && p.x >= b.l && p.x <= b.r && py <= b.t && p.y >= b.t)
          if (top) { p.y = top.t; p.resting = true; p.vy = 0 }
          if (p.y >= groundY) { p.y = groundY; p.resting = true; p.vy = 0 }
        }
        if (Math.abs(p.x - body.x) < 46 * body.scale + 10 && Math.abs(p.y - body.y) < 60 * body.scale + 20 && canTake(p)) {
          if (!hover || Math.abs(p.x - body.x) < Math.abs(hover.x - body.x)) hover = p
        } else if (p.noPick <= 0 && Math.abs(p.x - body.x) < 46 * body.scale + 10 && Math.abs(p.y - body.y) < 60 * body.scale + 20 && inv.some(o => o.item === p.owned.item)) {
          if (!hoverOwned || Math.abs(p.x - body.x) < Math.abs(hoverOwned.x - body.x)) hoverOwned = p
        }
      }

      // the item she stands on is outlined; grab takes it into a free slot, or swaps it with the held one when full
      // holding Pegar while walking takes every item she passes over, as if it were pressed on each one
      if (!input.grabHeld) heldTaken.clear()
      const grabNow = !!input.grab || (!!input.grabHeld && !!hover && !heldTaken.has(hover.id))
      if (grabNow && hover && pickups.includes(hover)) {
        const g = hover, firstNew = nextId
        pickups.splice(pickups.indexOf(g), 1); if (!pickUp(g)) swapIn(g); hover = null
        heldTaken.add(g.id); for (let id = firstNew; id < nextId; id++) heldTaken.add(id)
      }
      else if (input.grab && hoverOwned) {
        // the same item is in her inventory: grab equips it (the one on the floor stays)
        const slot = inv.findIndex(o => o.item === hoverOwned!.owned.item)
        if (slot >= 0 && slot !== cur) { equip(slot); addText(hoverOwned.x, hoverOwned.y - 30, `= ${items[hoverOwned.owned.item].name}`, '#c9ced6') }
      }
      if (!world) return
      // racks: the creative mode always has the item to pick up again
      racks.forEach(r => {
        const near = pickups.some(p => p.owned.item === r.item && Math.abs(p.x - r.x) < 60)
        if (near) { r.t = 0; return }
        r.t += dt
        if (r.t > 2) { pickups.push({ id: nextId++, owned: fresh(r.item), x: r.x, y: (r.y ?? groundY) - 60, vy: 0, resting: false, noPick: 0 }); r.t = 0 }
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
        if (t.dummy) { t.dummy.tipT = Math.max(0, t.dummy.tipT - dt); t.dummy.crackT = Math.max(0, t.dummy.crackT - dt) }
      })

      // every target: the stillness of a note wears off; answers cool down
      targets.forEach(t => { if (t.stun) t.stun = Math.max(0, t.stun - dt); if (t.answerCool) t.answerCool = Math.max(0, t.answerCool - dt) })
      // converted enemies leave: birds flap up and away, people run off with little hops
      for (let i = critters.length - 1; i >= 0; i--) {
        const c = critters[i]
        c.t += dt
        if (c.kind === 'bird') { c.vy = Math.max(-260, c.vy - 40 * dt); c.x += c.vx * dt + Math.sin(c.t * 9) * 0.6; c.y += c.vy * dt + Math.sin(c.t * 14) * 1.2 }
        else { c.x += c.vx * dt; c.vy += 1600 * dt; c.y += c.vy * dt; if (c.y >= c.groundY) { c.y = c.groundY; c.vy = Math.random() < 0.02 ? -380 : 0 } }
        if (c.t > 1.2 && c.kind === 'person' && Math.random() < dt * 1.5) texts.push({ x: c.x, y: c.y - 190, text: Math.random() < 0.5 ? '♥' : '♪', life: 0.9, color: '#ff6b9a', size: 18 })
        if (c.y < -120 || c.t > 9 || c.x < view.l - 500 || c.x > view.r + 500) critters.splice(i, 1)
      }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.life <= 0) sparks.splice(i, 1) }
      for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) texts.splice(i, 1) }
    },
  }
}

export type Combat = ReturnType<typeof createCombat>
