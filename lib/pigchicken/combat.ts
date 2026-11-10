// PigChicKen combat in the Parquinho: the items she carries, firing, hitting, throwing, projectiles,
// target dummies and items lying on the ground. World coordinates (x grows into the world, y is the screen's).
import { PECK_CONTACT, peckPose, type Peck, type PeckPose } from './peck'
import { SWING_COMBO, SWING_PHASES, nextCombo, swingHitAt, swingLife, type Swing } from './swing'
import { DEFAULT_RULE, rebateSound, type NoteEnv, type NoteOut, type RebateRule, type Transform } from './transforms'
import { SURFACE_BOUNCES, type PlaceEnv, type SurfaceRebate } from './sound-zones'
import { BIRDS, birdPhrase, birdsFor, pickBird, type BirdId, type BirdType, type UndeadMode } from './birds'
import { UNDEAD_DEFAULTS, UNDEAD_MAX, deathNotes, deathSoundsFor, floorUnder, newUndead, stepUndead, type UndeadParams, type UndeadState } from './undead'
import { NOTE_GOOD, NOTE_LATE, REBATE_HARMONY, REBATE_LIFE, REBATE_SPEED, inSector, judgeNote, type NoteShot, type NoteShotEvent } from './note-shots'
import { explosionImpulse, stepBlastMotion, type BlastBox, type BlastMotion } from './explosion'
import { CONSUMABLE_LIMITS, DEFAULT_ITEMS, type AccelCurve, type EffectLook, type ItemDef, type ItemId } from './items'
import { INVENTORY_MAX, clampInventoryLimit, groupStep, insertSorted, itemGroup, moveToSlot, wrapSlot, type ItemGroup } from './inventory'
import type { WeaponSound } from './sfx'
import { rackRespawnDelay } from './racks'
import { glideMirror, isSharedTarget, type NetHit, type NetShot } from './net-world'
import { ALIEN_DEATH, ZOMBIE_TIMES, spawnAlienRow, spawnZombieAt, spawnZombies, stepEnemy, stepFormations, type EnemyEnv } from './enemies'
import { newTremolo, stepTremolo, type TremoloState } from './tremolo'
import { chordOn, createConductor, DEGREE_COLORS, NOTE_SYMBOLS, SCALES } from './music'
import type { Drum, Held, VoiceId } from './synth'
import { cleanDummyParams, dummyAnswerMidi, dummyStage, DUMMY_STAGE_MAX, type DummyParams } from './dummies'

// where the instruments' sound goes (the Parquinho plugs the synth in)
export type MusicOut = {
  note: (voice: VoiceId, midi: number, at: number, dur: number, vel: number, fade?: number) => void
  hold: (voice: VoiceId, midi: number) => Held | null
  drum: (kind: Drum, at: number, vel?: number) => void
}
// the ambience where a note is rebated (the song tells it): what it forces, the scale it fits, whose rule counts
export type NoteEnvFn = (shot: NoteShot, angle: number) => (Partial<NoteEnv> & { rule?: RebateRule; combo?: number }) | null
// what a point of the map plays (the layout's Zonas sonoras and Faixas fixas)
export type PlaceEnvFn = (x: number, y: number) => PlaceEnv | null
// a note going from (px, py) to (x, y) through the wall of a zone with life: which way it bounces, the zone's colour
// and whether that hit made it change (count: false only replays what another browser already counted)
export type ZoneWallsFn = (px: number, py: number, x: number, y: number, count: boolean) => { flipX: boolean; color: string; died: boolean } | null
const SILENT: MusicOut = { note: () => {}, hold: () => null, drum: () => {} }
// a note in flight: its pitch, colour and how it sways
export type NoteInfo = { midi: number; color: string; sym: string; wave: number; phase: number; voice: VoiceId }
// a converted enemy leaving the scene: aliens become birds, zombies become happy people
// birds: their type, where they circle or perch, their next whistle and when they leave
export type Critter = {
  kind: 'bird' | 'person'; x: number; y: number; vx: number; vy: number; t: number; color: string; face: number; groundY: number
  bird?: BirdId; homeX?: number; homeY?: number; whistleIn?: number
}

// a platform's box. solid: she and the items lying around stand on it (default yes); shots: bullets, grenades and the
// beam stop at it (default yes); notes: the instruments' notes stop at it (default no, they go through); rebate: the
// notes (rebated ones and the instruments') bounce off it and play
export type Box = { l: number; t: number; r: number; b: number; solid?: boolean; shots?: boolean; notes?: boolean; rebate?: SurfaceRebate; occludedAt?: (x: number, y: number) => boolean }
export const boxContains = (box: Box, x: number, y: number) =>
  x >= box.l && x <= box.r && y >= box.t && y <= box.b && !box.occludedAt?.(x, y)
const crossesBoxTop = (box: Box, x: number, prevY: number, y: number) =>
  x >= box.l && x <= box.r && prevY <= box.t && y >= box.t && !box.occludedAt?.(x, box.t)
// refill: seconds the gradual auto reload has counted toward the next shots coming back (reset whenever it is used).
// group: the inventory group it sits in (its own when taken; dragging it on the bar may change it)
export type Owned = { item: ItemId; ammo: number; durability: number; refill?: number; group?: ItemGroup }
export type Bullet = {
  x: number; y: number; vx: number; vy: number; dist: number; damage: number; pierce: number; hits: Set<number>; size: number; drop: number; range: number
  item: ItemId; t: number; explode: number; explodeDamage: number; fuse: number; bounce: number
  note?: NoteInfo; ring?: number // instruments: the note it carries; notes it lets out when it bursts
  explodePush?: number // snapshot of the item's blast force when fired
  ghost?: boolean // goes through walls and floating platforms (instruments' notes)
  bounces?: number // times it bounced off a "Rebate notas" surface
  remote?: boolean // another browser's shot (online): it flies and shows, never damages
}
export type Boom = { x: number; y: number; r: number; life: number; color?: string }
export type Tracer = { x1: number; y1: number; x2: number; y2: number; life: number }
export type Thrown = { x: number; y: number; vx: number; vy: number; spin: number; angle: number; owned: Owned; damage: number; hit: boolean; remote?: boolean }
// x: centre, y: bottom. dummy targets break in stages and stay wrecked until notes mend them; aliens and zombies are removed; buttons never fall
// undead: what an alien leaves when its life runs out (lib/pigchicken/undead.ts); data is its UndeadState
export type TargetKind = 'dummy' | 'alien' | 'zombie' | 'button' | 'undead'
export type Target = {
  id: number; kind: TargetKind; home: number; x: number; y: number; w: number; h: number; hp: number; maxHp: number; flash: number; wobble: number; vx: number; deadT: number
  face: number; state: string; animT: number; label?: string; data?: unknown
  // instruments: the harmony bar (full at maxHp converts), how long it stays still, its answer's cooldown, the tint of the last note
  harmony?: number; stun?: number; answerCool?: number; tint?: string
  // the share of each hit it blocks (1 = immune right now): the temple's drums between beats, the dragon's head
  shield?: number
  // training dummies: their own params, the stage they are in, how long the tip bubble shows, the crack's jolt
  blast?: BlastMotion
  dummy?: DummyState
  // online (lib/pigchicken/net-world.ts): its id in the lobby; mirror: the owner's enemy drawn here (not moved here),
  // gliding to where the owner has it (netX, netY)
  net?: number; mirror?: boolean; netX?: number; netY?: number
}
export type DummyState = { params: DummyParams; stage: number; tipT: number; crackT: number }
// how long the tip stays up after it is destroyed (and after each hit while wrecked)
export const TIP_TIME = 8
export const TIP_AGAIN = 5
// a consumable's effect on her; the numbers are taken when it is used. Doses add up (several at once, of the same
// item or not): each one keeps its own timer and their multipliers multiply
export type Effect = { item: ItemId; left: number; total: number; speed: number; accel: number; curve: AccelCurve; ramp: number; look: EffectLook }
// how many doses of each look are running: the visual states stack up and coexist (buddha glow + fizz together)
export function lookDoses(list: readonly Effect[]): { buddha: number; fizz: number } {
  return { buddha: list.filter(e => e.look === 'buddha').length, fizz: list.filter(e => e.look === 'fizz').length }
}
export function combineEffects(list: readonly Effect[]): Effect | null {
  if (!list.length) return null
  const last = list[list.length - 1]
  return { ...last, left: Math.max(...list.map(e => e.left)), total: Math.max(...list.map(e => e.total)), speed: list.reduce((k, e) => k * e.speed, 1), accel: list.reduce((k, e) => k * e.accel, 1) }
}
export type Pickup = { id: number; owned: Owned; x: number; y: number; vy: number; resting: boolean; noPick: number }
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
// a peck's defence: while the beak is out, damaging notes and projectiles in its cone vanish in a little cloud
export type ParryZone = { x: number; y: number; angle: number; reach: number; arc: number }
export type Puff = { x: number; y: number; t: number; life: number; seed: number; color: string }
export const PARRY_WINDOW = [0.12, 1] as const // fractions of the peck's time when the beak defends
export const PUFF_LIFE = 0.4
export type FloatText = { x: number; y: number; text: string; life: number; color: string; size?: number }
export type { Swing } from './swing'

export type Body = { x: number; y: number; face: number; scale: number; grounded: boolean; state: string; vx: number }
export type FrameInput = {
  fire: boolean; firePressed: boolean; melee: boolean; throwHeld: boolean; throwReleased: boolean
  reload: boolean; pick: number; slot: number // pick: +1 / -1 cycles; slot: 1-based exact slot (keys, bar, wheel), 0 none
  groupPick?: ItemGroup | null // Próximo instrumento / arma / utilitário: the next item of that group
  move?: { from: number; to: number; after: boolean } | null // a slot dragged on the bar, dropped before / after another
  deselect?: boolean // empty hands without dropping anything; cancels prepared actions
  cancelFire?: boolean // UI, focus loss or a grabbed/portal chicken cancels preparation
  grab?: boolean // standing on an item: takes it (free slot) or swaps it with the held one (full inventory)
  grabHeld?: boolean // Pegar held down: every item she passes over is taken as if grab were pressed on it
}

export const SLOTS = INVENTORY_MAX
// the inputs that switch items, cleared when something blocks switching
const NO_SWITCH = { pick: 0, slot: 0, groupPick: null }
const THROW_GRAVITY = 1500
const ITEM_GRAVITY = 1800
const SWING_PICKUP_R = 14 // an item on the floor, as a circle for the blow's hit area (px)

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const DEG = Math.PI / 180

export function createCombat() {
  let items: Record<ItemId, ItemDef> = structuredClone(DEFAULT_ITEMS)
  // the items she carries, grouped and in order (instruments, weapons, others); cur may be inv.length:
  // the empty slot (empty hands), which exists while there is room
  const inv: Owned[] = []
  let cur = 0
  // the Pátio's inventory limit (the same for every local player)
  let limit = INVENTORY_MAX
  let cooldown = 0, burstLeft = 0, reloadT = 0, bloom = 0, meleeCool = 0, kick = 0, throwT = 0, chargeT = 0, prevFire = false
  // The item that received the last held-fire frame. A newly equipped weapon sees a fresh trigger press.
  let fireHeldItem: Owned | null = null
  // the item whose firing a Golpe interrupted while Atirar was held: it shoots again when the blow ends
  let fireResume: Owned | null = null
  let peck: Peck | null = null, peckPrep = 0, peckCool = 0
  let aimAngle = 0
  // the throw goes where the aim points, all the way round (not slowed by a heavy item's turn rate)
  let throwAngle = 0
  // the item in her wing when the throw started charging; another one in the wing (switched, grabbed) calls the
  // throw off until the button is let go, so the new item is never thrown by mistake
  let throwItem: Owned | null = null, throwVoid = false
  let consumption: { item: ItemId; left: number; total: number } | null = null
  let effects: Effect[] = []
  let blastActors: { box: BlastBox; push: (vx: number, vy: number) => void }[] = []
  let nextId = 1
  const booms: Boom[] = [], tracers: Tracer[] = []
  // sounds to play this frame (the Parquinho drains it)
  const sounds: { kind: WeaponSound; item: ItemId | null }[] = []
  const sound = (kind: WeaponSound, item: ItemId | null = held()?.item ?? null) => {
    const d = item ? items[item] : null
    // instruments make musical sounds instead of the mechanical ones
    if (d?.instrument) {
      const root = music.noteFor(-Math.PI / 2, 'chord', d.octave, 0.5)
      // equipping: a very soft two-note sigh (low velocity, slow fade-in), well under the played notes
      if (kind === 'equip') { out.note(d.voice, root, 0, 0.14, 0.12, 0.06); out.note(d.voice, music.walk(root, 2, 'chord'), 0.1, 0.2, 0.1, 0.08) }
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
  const kills = { aliens: 0, zombies: 0, bites: 0, undead: 0 }
  let view = { l: 0, r: 1280 }
  const bullets: Bullet[] = [], thrown: Thrown[] = [], targets: Target[] = [], pickups: Pickup[] = [], sparks: Spark[] = [], texts: FloatText[] = []
  // y: the floor the rack stands on (a platform's top), or the ground when unset
  const racks: { x: number; item: ItemId; t: number; label: string; y?: number; respawnDelay: number; pickupId?: number; spawnX?: number; spawnY?: number }[] = []
  let swing: Swing | null = null
  // the pecks defending right now (one per local player) and the little clouds of what they cancelled
  const parryZones = new Map<string, ParryZone>()
  const puffs: Puff[] = []
  // note shots (tiros-nota) in flight, what happened to them this frame (the song reads it), and the rule that
  // says which note a rebate plays (the song's fan; by default the note sequenced)
  const noteShots: NoteShot[] = []
  const noteEvents: NoteShotEvent[] = []
  let noteEnv: NoteEnvFn | null = null
  let placeEnv: PlaceEnvFn | null = null
  // the walls of the Zonas sonoras with life: a note crossing one bounces (count: it takes a point of the zone's life)
  let zoneWalls: ZoneWallsFn | null = null
  // a peck defending at (x, y) cancels what is there, in a little cloud (parriedBy: the player who did it)
  let parriedBy = ''
  function parryAt(x: number, y: number, r: number, color: string) {
    for (const [id, z] of parryZones) {
      const dx = x - z.x, dy = y - z.y, dist = Math.hypot(dx, dy)
      if (dist > z.reach + r) continue
      let diff = Math.atan2(dy, dx) - z.angle
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      if (Math.abs(diff) > z.arc / 2 && dist > 14 + r) continue
      puffs.push({ x, y, t: 0, life: PUFF_LIFE, seed: Math.random(), color })
      sound('puff', null)
      parriedBy = id
      return true
    }
    return false
  }
  // the combo: which blow of the sequence came last and how long ago the last swing ended (s)
  let swingCombo = 0, swingGap = Infinity
  // music: the beat and the harmony, the instruments' sound, the arpeggio's place, the violin's beam, the harp's glissando
  const music = createConductor()
  let out: MusicOut = SILENT
  let arpStep = 0, arpIdle = 0, phraseBase = 0, glissNext = 0, glissSteps = 0, bonusTextT = 0
  let beam: { x1: number; y1: number; x2: number; y2: number; midi: number; color: string; target: number | null } | null = null
  let beamHeld: Held | null = null, beamMidi = 0
  // the aim's tremolo (lib/pigchicken/tremolo.ts): semitones the held instrument's notes bend right now
  let trem: TremoloState = newTremolo(), tremBend = 0
  const critters: Critter[] = []
  let quantizeAll = true
  const conv = { birds: 0, people: 0, harmonized: 0, undeadBirds: 0 }
  // undead waiting to join the world (an alien that just died: it joins on the next world step, so the shot that
  // killed it does not hit it too); whether a song is playing (they leave once it ends); the place's birds
  const pendingUndead: Target[] = []
  let playing = false, undeadBorn = 0
  let zoneBirds: BirdId[] | null = null
  // online: on a browser that is not the lobby's owner, hits on the owner's enemies (mirrors) are reported here
  // instead of applied; the shots fired here wait in netShots for the sync to send them (only while online)
  let reportHit: ((h: NetHit) => void) | null = null
  let netOn = false
  const netShots: NetShot[] = []
  // the other browsers' chickens (world units): the zombies go for the nearest chicken, local or not
  let netBodies: { x: number; y: number }[] = []

  const held = (): Owned | null => inv[cur] ?? null
  const ownGroup = (item: ItemId) => itemGroup(item, !!items[item]?.instrument)
  const groupOf = (o: Owned) => o.group ?? ownGroup(o.item)
  // an item taken goes to the end of its own group (even one dragged to another group before it was dropped)
  const takeIn = (o: Owned) => { o.group = ownGroup(o.item); return insertSorted(inv, o, groupOf) }
  const room = () => inv.length < limit
  // the slots shown on the bar and the wheel: her items, plus the empty one while there is room
  const shown = (): (Owned | null)[] => room() ? [...inv, null] : inv.slice()
  // the held item leaves (broke, thrown): her hands are empty (the empty slot, at the end)
  const removeHeld = () => { inv.splice(cur, 1); cur = inv.length }
  const def = (): ItemDef => { const h = held(); return h ? items[h.item] : items.wing }
  const fresh = (item: ItemId): Owned => ({ item, ammo: items[item].consumable ? Math.max(1, Math.min(CONSUMABLE_LIMITS[item] ?? 1, items[item].mag)) : items[item].mag, durability: items[item].durability })

  function addText(x: number, y: number, text: string, color = '#ffffff') { texts.push({ x, y, text, life: 0.9, color }) }
  function burst(x: number, y: number, n: number, color: string, speed = 220, size = 3) {
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(speed * 0.3, speed); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.5), max: 0.5, color, size }) }
  }

  function hitTarget(t: Target, damage: number, pushX: number, x: number, y: number) {
    if (t.deadT > 0 || damage <= 0) return
    // a button: any hit presses it
    if (t.kind === 'button') { if (t.flash <= 0) { t.flash = 0.3; pressed.push(t.label ?? ''); burst(x, y, 6, '#7bdff2', 140, 2); sound('button', null) } return }
    // the owner's enemy: it shows the hit here and the owner decides what it does
    if (t.mirror && reportHit && t.net !== undefined) {
      t.flash = 0.12
      addText(x, y - 10, String(Math.round(damage)), t.kind === 'undead' ? '#c9ced6' : '#ffd166')
      burst(x, y, 5, t.kind === 'zombie' ? '#7a9a3a' : t.kind === 'undead' ? '#9aa0a8' : '#ffd166', 160, 2)
      reportHit({ id: t.net, d: damage, px: pushX, x, y })
      return
    }
    if (blocked(t, x, y)) return
    if (t.dummy) { hurtDummy(t, damage, pushX, x, y); return }
    if (t.kind === 'undead') { hurtUndead(t, damage, x, y); return }
    damage *= 1 - (t.shield ?? 0)
    t.hp -= damage; t.flash = 0.12; t.wobble = Math.sign(pushX || 1) * 0.35; t.vx += pushX
    addText(x, y - 10, String(Math.round(damage)), '#ffd166')
    burst(x, y, 5, t.kind === 'zombie' ? '#7a9a3a' : '#ffd166', 160, 2)
    if (t.kind === 'zombie' && t.hp > 0 && t.state !== 'attack') { t.state = 'hurt'; t.animT = 0 }
    if (t.hp > 0) return
    if (t.kind === 'alien') {
      const color = (t.data as { color?: string } | undefined)?.color ?? '#ffffff'
      t.deadT = ALIEN_DEATH; burst(t.x, t.y - t.h / 2, 24, color, 260, 5); kills.aliens++; sound('alienDie', null)
      // its physical death on the grid, and the undead it leaves
      playNotes(deathNotes(deathSoundsFor(t.data).physical, music.chord(true), music.secondsPerBeat()), 'chip')
      spawnUndead(t, pushX)
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
    if (t.kind === 'undead' && (t.data as UndeadState).bird) return
    if (t.mirror && reportHit && t.net !== undefined) {
      t.flash = 0.12; t.tint = note.color
      texts.push({ x, y: y - 10, text: note.sym, life: 0.8, color: note.color, size: 18 })
      burst(x, y, 4, note.color, 120, 3)
      reportHit({ id: t.net, d: amount, px: pushX, x, y, n: { m: note.midi, c: note.color, s: note.sym, v: note.voice, w: note.wave }, st: stun })
      return
    }
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
    if (t.harmony >= t.maxHp) fullHarmony(t, note)
  }
  const fullHarmony = (t: Target, note: Pick<NoteInfo, 'color'>) => { if (t.kind === 'undead') resurrect(t, note.color); else convert(t) }

  // full harmony: aliens become birds and fly away, zombies become happy people and run off
  function convert(t: Target) {
    const chord = music.chord(true)
    const top = t.y - t.h / 2
    t.state = 'converted'; t.deadT = 0.001
    const away = Math.sign(t.x - (lastBody?.x ?? t.x)) || 1
    if (t.kind === 'alien') {
      const color = (t.data as { color?: string } | undefined)?.color ?? '#ffffff'
      // a bird of the place: its own look, flight and whistle
      const type = BIRDS[pickBird(birdsFor(music.zone.id, zoneBirds))]
      critters.push({ kind: 'bird', x: t.x, y: top, vx: away * rand(90, 160) + (t.blast?.vx ?? 0), vy: -rand(140, 220) + (t.blast?.vy ?? 0), t: 0, color, face: away, groundY: 0,
        bird: type.id, homeX: t.x, homeY: top - 60, whistleIn: whistleTime(type) })
      conv.birds++
      // its musical death on the grid
      playNotes(deathNotes(deathSoundsFor(t.data).musical, chord, music.secondsPerBeat()), 'bird')
      burst(t.x, top, 16, color, 200, 4)
    } else {
      critters.push({ kind: 'person', x: t.x, y: t.y, vx: away * rand(230, 290) + (t.blast?.vx ?? 0), vy: t.blast?.vy ?? 0, t: 0, color: '#ff6b9a', face: away, groundY: t.y })
      conv.people++
      chord.concat(chord[0] + 12).forEach((m, i) => out.note('keys', m, i * 0.08, 0.25, 0.6))
      texts.push({ x: t.x, y: top - 40, text: '♥', life: 1.2, color: '#ff6b9a', size: 26 })
    }
    addText(t.x, top - 60, t.kind === 'alien' ? 'virou passarinho!' : 'curado!', '#7bdff2')
  }
  let lastBody: Body | null = null

  // ---------- the undead ----------
  const harmonyNow = () => { const z = music.zone; return { root: z.root, steps: SCALES[z.scale].steps, chord: music.chord(true), spb: music.secondsPerBeat() } }
  const whistleTime = (type: BirdType) => (type.whistle.max > 0 ? rand(type.whistle.min, type.whistle.max) : Infinity)
  function spawnUndead(t: Target, pushX: number) {
    const look = t.data as { kind?: string; species?: string } | undefined
    // the dragon breaks apart: no undead
    if (look?.kind === 'temple' && (look.species === 'dragon' || look.species === 'dragonHead')) return
    // too many: the oldest leaves to make room
    const all = [...targets, ...pendingUndead].filter(g => g.kind === 'undead' && g.deadT <= 0 && (g.data as UndeadState).phase !== 'leave')
    if (all.length >= UNDEAD_MAX) {
      const oldest = all.reduce((a, b) => ((a.data as UndeadState).born <= (b.data as UndeadState).born ? a : b))
      const u = oldest.data as UndeadState
      u.phase = 'leave'; u.t = 0
    }
    pendingUndead.push({
      id: nextId++, kind: 'undead', home: 0, x: t.x, y: t.y, w: t.w, h: t.h, hp: t.maxHp, maxHp: t.maxHp, flash: 0, wobble: 0, vx: 0, deadT: 0,
      face: t.face, state: 'undead', animT: 0, harmony: 0,
      data: newUndead(t.data, Math.sign(pushX) * Math.min(260, Math.abs(pushX) * 0.5) + (t.blast?.vx ?? 0), -260, { ...UNDEAD_DEFAULTS, ...((t.data as { undead?: Partial<UndeadParams> } | undefined)?.undead ?? {}) }, undeadBorn++, Math.random),
    })
  }
  // weapons wear it down; at zero it is gone for good
  function hurtUndead(t: Target, damage: number, x: number, y: number) {
    t.hp -= damage; t.flash = 0.12
    addText(x, y - 10, String(Math.round(damage)), '#c9ced6')
    burst(x, y, 5, '#9aa0a8', 150, 2)
    if (t.hp > 0) return
    t.deadT = 0.3; kills.undead++
    burst(t.x, t.y - t.h / 2, 20, '#8d9096', 240, 4)
    sound('alienDie', null)
  }
  // notes fill an undead's bar: full, it comes back as an undead bird with eyes in the note's colour, singing its
  // phrase in minor (or diminished)
  function resurrect(t: Target, color: string) {
    const u = t.data as UndeadState
    const type = BIRDS[u.params.bird ?? pickBird(birdsFor(music.zone.id, zoneBirds))]
    u.bird = type.id; u.phase = 'bird'; u.t = 0; u.eye = color; u.angle = 0; u.vx = 0; u.vy = 0
    t.harmony = 0; t.hp = t.maxHp; t.state = 'bird'; t.flash = 0.2
    t.w = 11 * type.pixel; t.h = 8 * type.pixel
    u.homeX = t.x; u.homeY = t.y - 70; u.whistleIn = whistleTime(type)
    conv.undeadBirds++
    const h = harmonyNow()
    playNotes(birdPhrase(type, h.chord[0] + 12, h, u.params.mode), type.voice)
    burst(t.x, t.y - t.h / 2, 16, color, 200, 4)
    addText(t.x, t.y - t.h - 50, 'pássaro morto-vivo!', '#c9ced6')
  }
  // a bird whistles: its phrase, and its last note flies to the nearest player, arriving on a beat (she can rebate it)
  function whistle(x: number, y: number, type: BirdType, undead: UndeadMode | null) {
    const her = lastBody
    if (!her || x < view.l - 40 || x > view.r + 40) return
    const tx = her.x, ty = her.y - 90 * her.scale
    const dist = Math.hypot(tx - x, ty - y)
    if (dist > 1100) return
    const spb = music.secondsPerBeat()
    const flight = Math.max(0.6, dist / Math.max(60, type.shot.speed))
    const beats = Math.ceil(music.beat + flight / spb)
    const T = (beats - music.beat) * spb
    const h = harmonyNow()
    const phrase = birdPhrase(type, h.chord[0] + 12, h, undead, 0.4)
    playNotes(phrase, type.voice)
    const midi = phrase[phrase.length - 1]?.midi ?? h.chord[0] + 12
    noteShots.push({
      id: nextId++, x, y, vx: (tx - x) / T, vy: (ty - y) / T, midi, color: DEGREE_COLORS[music.degreeOf(midi) % DEGREE_COLORS.length],
      size: type.shot.size, glow: 0.6, arriveAt: music.time + T, state: 'incoming', t: 0, source: 'bird', ...(type.rule ? { rule: type.rule } : {}),
    })
  }

  // ---------- loadouts: one per local player ----------
  type Consumption = { item: ItemId; left: number; total: number } | null
  type Loadout = {
    peck: Peck | null; peckPrep: number; peckCool: number
    inv: Owned[]; cur: number; cooldown: number; burstLeft: number; reloadT: number; bloom: number; meleeCool: number; kick: number
    throwT: number; throwAngle: number; throwItem: Owned | null; throwVoid: boolean; chargeT: number; prevFire: boolean; fireHeldItem: Owned | null; fireResume: Owned | null; aimAngle: number; pumpT: number; swing: Swing | null; swingCombo: number; swingGap: number
    beam: { x1: number; y1: number; x2: number; y2: number; midi: number; color: string; target: number | null } | null; beamHeld: Held | null; beamMidi: number; arpStep: number; arpIdle: number; phraseBase: number
    glissNext: number; glissSteps: number; hover: Pickup | null; hoverOwned: Pickup | null; lastBody: Body | null; consumption: Consumption; effects: Effect[]; souls: number
    trem: TremoloState; tremBend: number
  }
  const loadouts = new Map<string, Loadout>()
  let active = 'p1'
  let souls = 0
  const save = (): Loadout => ({
    peck, peckPrep, peckCool, inv: inv.slice(), cur, cooldown, burstLeft, reloadT, bloom, meleeCool, kick, throwT, throwAngle, throwItem, throwVoid, chargeT, prevFire, fireHeldItem, fireResume, aimAngle, pumpT, swing, swingCombo, swingGap,
    beam, beamHeld, beamMidi, arpStep, arpIdle, phraseBase, glissNext, glissSteps, hover, hoverOwned, lastBody, consumption, effects, souls, trem, tremBend,
  })
  const blank = (): Loadout => ({
    peck: null, peckPrep: 0, peckCool: 0, inv: [], cur: 0, cooldown: 0, burstLeft: 0, reloadT: 0, bloom: 0, meleeCool: 0, kick: 0, throwT: 0, throwAngle: 0, throwItem: null, throwVoid: false, chargeT: 0, prevFire: false, fireHeldItem: null, fireResume: null, aimAngle: 0, pumpT: 0, swing: null, swingCombo: 0, swingGap: Infinity,
    beam: null, beamHeld: null, beamMidi: 0, arpStep: 0, arpIdle: 0, phraseBase: 0, glissNext: 0, glissSteps: 0, hover: null, hoverOwned: null, lastBody: null, consumption: null, effects: [], souls: 0, trem: newTremolo(), tremBend: 0,
  })
  function useLoadout(id: string) {
    if (id === active) return
    loadouts.set(active, save())
    const l = loadouts.get(id) ?? blank()
    inv.splice(0, inv.length, ...l.inv)
    ;({ peck, peckPrep, peckCool, cur, cooldown, burstLeft, reloadT, bloom, meleeCool, kick, throwT, throwAngle, throwItem, throwVoid, chargeT, prevFire, fireHeldItem, fireResume, aimAngle, pumpT, swing, swingCombo, swingGap, beam, beamHeld, beamMidi, arpStep, arpIdle, phraseBase, glissNext, glissSteps, hover, hoverOwned, lastBody, consumption, effects, souls, trem, tremBend } = l)
    active = id
  }

  // One slot per type; consumables can top up their existing stack.
  const canTake = (p: Pickup) => p.noPick <= 0 && (!inv.some(o => o.item === p.owned.item) || inv.some(o => o.item === p.owned.item && o.ammo < (CONSUMABLE_LIMITS[o.item] ?? 0)))

  // Usar/Pegar equips a new item; Golpe can store it without changing the item she already holds.
  function pickUp(p: Pickup, equip = true) {
    if (!canTake(p)) return false
    const stack = inv.find(o => o.item === p.owned.item)
    if (stack) {
      const amount = Math.min(p.owned.ammo, (CONSUMABLE_LIMITS[stack.item] ?? 0) - stack.ammo)
      stack.ammo += amount; p.owned.ammo -= amount
      if (p.owned.ammo > 0) pickups.push(p)
      sound('equip', stack.item)
      addText(p.x, p.y - 30, `+${amount} ${items[stack.item].name}`, '#7bdff2')
      return true
    }
    if (!room()) return false
    const wasHeld = held()
    if (equip) { stopBeam(); peck = null; peckPrep = 0 }
    const limit = CONSUMABLE_LIMITS[p.owned.item]
    if (limit && p.owned.ammo > limit) {
      pickups.push({ ...p, id: nextId++, owned: { ...p.owned, ammo: p.owned.ammo - limit } })
      p.owned.ammo = limit
    }
    const added = takeIn(p.owned)
    if (equip) { cur = added; reloadT = 0; chargeT = 0; burstLeft = 0; pumpT = 0 }
    else cur = wasHeld ? inv.indexOf(wasHeld) : inv.length
    sound('equip', p.owned.item)
    addText(p.x, p.y - 30, `+ ${items[p.owned.item].name}`, '#7bdff2')
    return true
  }

  // grab with no free slot: the item takes the place of the held one, which falls to the floor
  function swapIn(p: Pickup) {
    const old = held()
    stopBeam()
    if (old) { pickups.push({ id: nextId++, owned: old, x: p.x + (Math.random() < 0.5 ? -24 : 24), y: p.y - 20, vy: -260, resting: false, noPick: 1.2 }); inv.splice(cur, 1) }
    cur = takeIn(p.owned); reloadT = 0; chargeT = 0; burstLeft = 0
    sound('equip', p.owned.item)
    addText(p.x, p.y - 30, `↔ ${items[p.owned.item].name}`, '#4cc9f0')
  }
  let hover: Pickup | null = null
  // items taken (or dropped by a swap) during the current hold of Pegar: each is taken once per hold
  const heldTaken = new Set<number>()
  // an item on the floor she already carries: grab equips hers
  let hoverOwned: Pickup | null = null

  function equip(i: number) {
    i = wrapSlot(i, shown().length)
    if (i === cur) return
    stopBeam(); peck = null; peckPrep = 0
    cur = i; reloadT = 0; burstLeft = 0; chargeT = 0; pumpT = 0; cooldown = Math.max(cooldown, 0.15)
    if (held()) sound('equip')
  }

  // a slot dragged on the bar onto another one (or the empty slot): the held item stays held, wherever it goes
  function moveSlot(from: number, to: number, after: boolean) {
    const h = held()
    moveToSlot(inv, from, Math.min(to, inv.length), after)
    cur = h ? inv.indexOf(h) : inv.length
  }

  // a consumable: one dose adds its effect to the ones running on her; the last dose ends the item
  function consume(h: Owned, d: ItemDef, at: { x: number; y: number }) {
    consumption = { item: h.item, left: 0.7, total: 0.7 }
    effects.push({ item: h.item, left: d.effectTime, total: d.effectTime, speed: d.effectSpeed, accel: d.effectAccel, curve: d.effectCurve, ramp: d.effectRamp, look: d.effectLook })
    cooldown = Math.max(0.7, 1 / Math.max(0.1, d.rate))
    sound(d.consumeKind === 'liquid' ? 'drink' : 'eat', h.item)
    const color = d.effectLook === 'buddha' ? '#ffd166' : d.effectLook === 'fizz' ? '#f3e1c7' : '#7bdff2'
    burst(at.x, at.y, 16, color, 170, 3)
    addText(at.x, at.y - 40, d.effectLook === 'buddha' ? `${d.name}: estado búdico` : d.name, color)
    h.ammo--; if (h.ammo <= 0) removeHeld()
  }

  function startReload() {
    const h = held(); if (!h) return
    const d = items[h.item]
    if (d.consumable) return
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
      notes.forEach((m, i) => out.note(d.voice, m + tremBend, at + i * d.strum, d.noteLen, 0.75))
    }
    const speed = d.speed * power
    const damage = d.explodeRadius > 0 ? d.damage : d.damage * (d.fireMode === 'charge' ? 0.3 + 0.7 * power : 1)
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? rand(-0.5, 0.5) : i / (n - 1) - 0.5 + rand(-0.3, 0.3) / n
      const a = aimAngle + u * spreadDeg * DEG
      const b: Bullet = {
        x: mx, y: my, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dist: 0, damage: damage * bonus, pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
        item: h.item, t: 0, explode: d.explodeRadius, explodeDamage: d.explodeDamage * bonus, explodePush: d.explodePush, fuse: d.fuse, bounce: d.bounce,
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
        if (netOn) netShots.push({ k: 't', i: b.item, x1: mx, y1: my, x2: b.x, y2: b.y })
      } else {
        bullets.push(b)
        if (netOn) netShots.push(shotOf(b))
      }
    }
    if (d.instrument) burst(mx, my, 2 + n, DEGREE_COLORS[music.degreeOf(notes[0]) % DEGREE_COLORS.length], 110, 3)
    else { burst(mx, my, 3 + n, '#fff3b0', 140, 2); sound('shot', h.item) }
    if (d.shellReload && h.ammo > 1) pumpT = Math.min(0.3, 0.6 / d.rate)
    h.ammo--; if (h.refill) h.refill = 0; bloom = Math.min(d.spreadMax, bloom + d.spreadShot); cooldown = 1 / d.rate; kick = d.recoilKick
    onRecoil(-Math.cos(aimAngle) * d.recoilPush, -Math.sin(aimAngle) * d.recoilPush)
    if (h.ammo <= 0 && d.autoReload) startReload()
  }

  // a bullet as it goes to the other browsers
  const shotOf = (b: Bullet): NetShot => ({
    k: 'b', i: b.item, x: b.x, y: b.y, vx: b.vx, vy: b.vy, sz: b.size, dr: b.drop, rg: b.range, fu: b.fuse, bo: b.bounce, ex: b.explode, ep: b.explodePush, pi: b.pierce,
    ...(b.note ? { n: { m: b.note.midi, c: b.note.color, s: b.note.sym, w: b.note.wave, v: b.note.voice } } : {}), ...(b.ring ? { rn: b.ring } : {}), ...(b.ghost ? { gh: true } : {}),
  })
  // another browser's shots: they fly here too, only to be seen (and heard when they are in this scene)
  function addRemoteShots(list: readonly NetShot[]) {
    let heard = 0
    for (const s of list) {
      const d = items[s.i]
      if (!d) continue
      const x = s.k === 't' ? s.x1 : s.x
      const near = x > view.l - 200 && x < view.r + 200
      if (s.k === 't') { tracers.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, life: 0.12 }); burst(s.x2, s.y2, 4, '#fff3b0', 120, 2) }
      else if (s.k === 'th') {
        thrown.push({ x: s.x, y: s.y, vx: s.vx, vy: s.vy, spin: s.sp, angle: s.a, owned: fresh(s.i), damage: 0, hit: false, remote: true })
      } else {
        const note = s.n ? { midi: s.n.m, color: s.n.c, sym: s.n.s, wave: s.n.w, phase: rand(0, Math.PI * 2), voice: s.n.v as VoiceId } : undefined
        bullets.push({
          x: s.x, y: s.y, vx: s.vx, vy: s.vy, dist: 0, damage: 0, pierce: s.pi, hits: new Set(), size: s.sz, drop: s.dr, range: s.rg, item: s.i, t: 0,
          explode: s.ex, explodeDamage: 0, explodePush: s.ep, fuse: s.fu, bounce: s.bo, note, ring: s.rn, ghost: s.gh, remote: true,
        })
        // its note, softer than one's own
        if (note && near && heard < 4) out.note(note.voice, note.midi, 0, d.noteLen, 0.4)
      }
      if (near && heard++ < 4 && !d.instrument) sounds.push({ kind: s.k === 'th' ? 'throw' : 'shot', item: s.k === 'th' ? null : s.i })
    }
  }

  function explode(x: number, y: number, r: number, damage: number, b?: Bullet) {
    const strength = b ? b.explodePush ?? items[b.item].explodePush : 0
    blastActors.forEach(actor => {
      const push = explosionImpulse(x, y, r, strength, actor.box)
      if (push) actor.push(push.x, push.y)
    })
    targets.forEach(t => {
      if (t.kind === 'button' || t.deadT > 0 || (t.mirror && reportHit)) return
      const push = explosionImpulse(x, y, r, strength, { l: t.x - t.w / 2, r: t.x + t.w / 2, t: t.y - t.h, b: t.y })
      if (!push) return
      const m = t.blast ??= { x: 0, y: 0, vx: 0, vy: 0 }
      m.vx += push.x; m.vy += push.y
    })
    if (b?.note) { musicBurst(x, y, r, damage, b); return }
    booms.push({ x, y, r, life: 0.35 })
    sound('explode', null)
    burst(x, y, 26, '#ffb347', 380, 4); burst(x, y, 14, '#fff3b0', 220, 3)
    if (b?.remote) return
    targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = Math.max(t.x - t.w / 2, Math.min(x, t.x + t.w / 2)), cy = Math.max(t.y - t.h, Math.min(y, t.y))
      const dist = Math.hypot(cx - x, cy - y)
      if (dist > r) return
      hitTarget(t, damage * (1 - dist / r), 0, cx, cy)
    })
  }

  // an instrument bursting: the chord rings out, everything around takes harmony and a push, and notes fly out in a circle
  function musicBurst(x: number, y: number, r: number, amount: number, b: Bullet) {
    const note = b.note!
    booms.push({ x, y, r, life: 0.5, color: note.color })
    const chord = music.chord(true).map(m => m + 12 * Math.round((note.midi - 60) / 12))
    if (b.item === 'tambourine') out.drum('jingle', 0)
    chord.forEach((m, i) => out.note(note.voice, m, i * 0.03, 0.5, b.remote ? 0.35 : 0.6))
    if (!b.remote) targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = Math.max(t.x - t.w / 2, Math.min(x, t.x + t.w / 2)), cy = Math.max(t.y - t.h, Math.min(y, t.y))
      const dist = Math.hypot(cx - x, cy - y)
      if (dist > r) return
      harmonize(t, amount * (1 - 0.5 * dist / r), 0, cx, cy, note, items[b.item].stun)
    })
    const n = Math.round(b.ring ?? 0)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, m = chord[i % chord.length] + (i >= chord.length ? 12 : 0)
      bullets.push({
        x, y: y - 6, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dist: 0, damage: Math.max(5, amount * 0.35), pierce: 0, hits: new Set(), size: 9, drop: 0, range: r * 1.6,
        item: b.item, t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0,
        note: { midi: m, color: DEGREE_COLORS[music.degreeOf(m) % DEGREE_COLORS.length], sym: NOTE_SYMBOLS[i % 4], wave: 3, phase: rand(0, 6), voice: note.voice }, ring: 0, ghost: true, remote: b.remote,
      })
    }
  }

  type StepCtx = { boxes: Box[]; groundY: number }
  const boxAt = (boxes: Box[], x: number, y: number, note = false) => boxes.find(b => (note ? b.notes === true : b.shots !== false) && boxContains(b, x, y))
  const solidAt = (boxes: Box[], x: number, y: number) => boxes.find(b => b.solid !== false && boxContains(b, x, y))
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
          // another browser's shot: it stops where it hit (that browser tells the owner what it did)
          if (b.remote) {
            b.hits.add(t.id)
            if (b.hits.size > b.pierce) { b.x = x; b.y = y; burst(x, y, 4, b.note ? b.note.color : '#ffd166', 120, 2); return true }
            break
          }
          if (b.note) harmonize(t, b.damage, Math.sign(b.vx) * 40, x, y, b.note, items[b.item].stun)
          else hitTarget(t, b.damage, Math.sign(b.vx) * 40, x, y)
          b.hits.add(t.id)
          if (b.hits.size > b.pierce) return true
          break
        }
      }
    }
    // the instruments' notes: a "Rebate notas" surface bounces them back, playing (a few times at most); crossing
    // the map's fixed lanes tunes them to the lane
    if (b.note) {
      for (let k = 1; k <= steps && (b.bounces ?? 0) < SURFACE_BOUNCES; k++) {
        const lx = px + (b.x - px) * (k - 1) / steps, ly = py + (b.y - py) * (k - 1) / steps
        const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps
        const wall = surfaceHit(boxes, lx, ly, x, y)
        const zw = wall ? null : zoneWalls?.(lx, ly, x, y, !dry) ?? null
        if (!wall && !zw) continue
        b.x = lx; b.y = ly
        if ((wall ?? zw)!.flipX) b.vx = -b.vx; else b.vy = -b.vy
        b.bounces = (b.bounces ?? 0) + 1
        if (zw) {
          if (!dry) { b.hits.clear(); burst(lx, ly, zw.died ? 28 : 5, zw.color, zw.died ? 340 : 140, zw.died ? 4 : 2) }
          return false
        }
        if (wall && !dry) {
          const notes = surfaceSound(wall.box.rebate!, lx, ly, b.note.midi, b.note.voice, items[b.item].rebateChain, undefined)
          const main = notes.find(o => !o.drum)?.midi
          if (main !== undefined) b.note = { ...b.note, midi: main, color: DEGREE_COLORS[music.degreeOf(main) % DEGREE_COLORS.length] }
          b.hits.clear()
          burst(lx, ly, 5, b.note.color, 140, 2)
        }
        return false
      }
      if (!dry) {
        const tuned = laneRetune(b.x, b.y)
        if (tuned !== null && tuned !== b.note.midi) b.note = { ...b.note, midi: tuned, color: DEGREE_COLORS[music.degreeOf(tuned) % DEGREE_COLORS.length] }
      }
    }
    // walls and the floor: explode, bounce (with a fuse) or stop
    for (let k = 1; k <= steps; k++) {
      const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps
      const box = boxAt(boxes, x, y, !!b.ghost)
      const floor = y >= groundY
      if (!box && !floor) continue
      if (b.fuse > 0) {
        const fromAbove = floor || (box && crossesBoxTop(box, x, py, y))
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
      const top = vy > 0 && ctx.boxes.find(b => crossesBoxTop(b, x, py, y))
      if (top) { points[points.length - 1] = { x, y: top.t }; break }
      if (vy > 0 && y >= ctx.groundY) { points[points.length - 1] = { x, y: ctx.groundY }; break }
      if (boxAt(ctx.boxes, x, y)) break
    }
    return points
  }

  // a blow pressed while the last one is still going interrupts it and the new one starts right away (with no
  // interval, every note of a song can be hit), unless the item says not to: then it waits for the move to end
  function canSwing(wing: boolean) {
    const d = wing ? items.wing : def()
    return d.meleeInterrupt || !swing || swing.t >= swing.time
  }
  // an item only for hitting with blows to count (the taco): a blow needs one loaded and not reloading
  const blowsLeft = (h: Owned | null, d: ItemDef) => !h || !d.meleeOnly || d.mag <= 0 || (reloadT <= 0 && h.ammo > 0)
  // an empty taco: the dry click, and it reloads on its own when set to
  function dryBlow(h: Owned, d: ItemDef) { sound('dry'); if (h.ammo <= 0 && d.autoReload) startReload() }
  function melee(wing: boolean, scale: number) {
    const d = wing ? items.wing : def()
    meleeCool = d.meleeCooldown
    const own = wing ? null : held()
    if (own && d.meleeOnly && d.mag > 0) {
      own.ammo = Math.max(0, own.ammo - 1); if (own.refill) own.refill = 0
      if (own.ammo <= 0 && d.autoReload) startReload()
    }
    sound('swing', null)
    // an instrument hit with Y still sounds: a quick strum of the chord, and its air takes the chord's colour
    let color = d.trailColor
    if (!wing && d.instrument) {
      const chord = music.chord()
      chord.forEach((m, i) => out.note(d.voice, m + 12 * d.octave, i * 0.02, 0.15, 0.5))
      if (chord.length) color = DEGREE_COLORS[music.degreeOf(chord[0]) % DEGREE_COLORS.length]
    }
    // an item in the wing rides on its tip: the blow reaches its length further
    const reach = d.meleeRange + (wing ? 0 : d.length * scale)
    // blows in a row alternate: down, up, horizontal, a full spin. Down comes clockwise facing right
    const order = d.combo.length ? d.combo : SWING_COMBO
    swingCombo = nextCombo(swingCombo, swingGap, d.comboWindow, order.length)
    const kind = order[swingCombo % order.length]
    const arc = kind === 'spin' ? Math.PI * 2 : (kind === 'up' ? d.meleeArcUp : kind === 'flat' ? d.meleeArcFlat : d.meleeArc) * DEG
    const face = Math.cos(aimAngle) >= 0 ? 1 : -1
    const time = Math.max(0.02, d.meleeTime), trailTime = Math.max(0.05, d.trailTime)
    swing = {
      angle: aimAngle, arc, range: d.meleeRange, reach, t: 0, time, wing,
      dir: kind === 'up' ? -face : face, kind, combo: swingCombo, hitAt: swingHitAt(time), hit: false, hits: 0,
      life: swingLife(time, trailTime), impacts: [], seed: Math.random(),
      trail: { width: d.trailWidth, color, time: trailTime, wisps: Math.round(d.trailWisps), opacity: d.trailOpacity },
      item: wing ? null : held() ?? null, damage: d.meleeDamage, push: d.meleePush, durability: d.durability > 0, name: d.name,
    }
    swingGap = 0
  }

  // the blow's hit area also collects the new items on the floor it touches, like Golpe near her body: each one is
  // stored in its group without changing the held item; with no room it stays on the floor (Golpe never swaps)
  function collectInSwing(sw: Swing, origin: { x: number; y: number }) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i]
      if (!canTake(p) || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, p.x, p.y - SWING_PICKUP_R, SWING_PICKUP_R)) continue
      pickups.splice(i, 1)
      if (!pickUp(p, false)) pickups.splice(i, 0, p)
      else if (hover === p) hover = null
    }
  }

  // the blow lands at the end of the preparação: everything in its arc is hit once
  function strike(sw: Swing, origin: { x: number; y: number }) {
    sw.hit = true
    collectInSwing(sw, origin)
    if ((sw.item as Owned | null)?.item === 'passagua') {
      let caught = 0
      const caughtAt: { x: number; y: number }[] = []
      // Undead birds stay Targets while circling; the other undead phases are not capturable.
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if (t.kind !== 'undead' || t.deadT > 0) continue
        const u = t.data as UndeadState | undefined
        if (!u?.bird || (u.phase !== 'bird' && u.phase !== 'leave')) continue
        const x = t.x, y = t.y - t.h / 2
        if (!inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, x, y, Math.max(t.w, t.h) * 0.35)) continue
        targets.splice(i, 1); caught++; caughtAt.push({ x, y })
      }
      // Converted living birds fly as critters rather than targets and use the same capture sweep.
      for (let i = critters.length - 1; i >= 0; i--) {
        const c = critters[i]
        if (c.kind !== 'bird' || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, c.x, c.y, 16)) continue
        critters.splice(i, 1); caught++; caughtAt.push({ x: c.x, y: c.y })
      }
      if (caught) {
        souls += caught
        caughtAt.forEach(({ x, y }) => puffs.push({ x, y, t: 0, life: PUFF_LIFE, seed: Math.random(), color: '#cceef0' }))
        addText(origin.x, origin.y - 54, `+${caught} alma${caught === 1 ? '' : 's'}`, '#cceef0')
        sound('puff', null)
      }
      return
    }
    targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = t.x, cy = t.y - t.h / 2
      const dx = cx - origin.x, dy = cy - origin.y, dist = Math.hypot(dx, dy) - t.w / 2
      if (dist > sw.reach) return
      let diff = Math.atan2(dy, dx) - sw.angle
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      if (Math.abs(diff) > sw.arc / 2 && dist > 10) return
      const hx = cx - Math.sign(dx) * t.w / 2
      hitTarget(t, sw.damage, Math.sign(dx || 1) * sw.push, hx, cy)
      sw.impacts.push({ x: hx - origin.x, y: cy - origin.y })
      sw.hits++
    })
    // items wear out on hits; the wing never breaks
    const h = sw.item as Owned | null
    if (h && sw.hits > 0 && sw.durability && inv.includes(h)) {
      h.durability -= sw.hits
      if (h.durability <= 0) {
        const i = inv.indexOf(h)
        if (i === cur) removeHeld(); else { inv.splice(i, 1); if (i < cur) cur-- }
        burst(origin.x + Math.cos(sw.angle) * 30, origin.y + Math.sin(sw.angle) * 30, 18, '#c9c9c9', 200, 4)
        addText(origin.x, origin.y - 50, `${sw.name} quebrou!`, '#ff8c69')
      }
    }
  }

  // a blow rebates the incoming notes in its sector during the golpe and the continuação: judged against when the
  // note should arrive, it plays (the song's rule picks the note) and flies off where she aims
  function rebateNotes(sw: Swing, origin: { x: number; y: number }) {
    if (sw.t < sw.hitAt || sw.t > sw.hitAt + sw.time * (SWING_PHASES.strike + SWING_PHASES.follow)) return
    for (const n of noteShots) {
      if (n.state !== 'incoming' || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, n.x, n.y, n.size)) continue
      const off = music.time - n.arriveAt, grade = judgeNote(off)
      // what it plays: the sequenced note through the ambience (the stage's fan, the map's lanes and zone) and the
      // item's chain of transformations, in the order the note's rule says
      const d = sw.wing ? items.wing : def()
      const env = noteEnv?.(n, Math.atan2(n.y - origin.y, n.x - origin.x)) ?? null
      const voice: VoiceId = d.instrument ? d.voice : 'bells'
      const seq: NoteOut = { midi: n.midi, at: 0, dur: grade === 'fora' ? 0.2 : 0.4, vel: grade === 'perfect' ? 0.85 : grade === 'good' ? 0.6 : 0.25, voice }
      // a percussion alien's note: the rebate is a beat
      const notes = n.drum ? [{ midi: n.midi, at: 0, dur: 0.2, vel: Math.max(0.5, seq.vel), drum: n.drum }] : noteSound(n.x, n.y, seq, d.rebateChain, env?.rule ?? n.rule, env)
      playNotes(notes, voice, d.rebateTok)
      const main = notes.find(o => !o.drum)?.midi ?? n.midi
      // off where she aims, pulled toward the nearest character by the item's snap
      const dir = snapAngle(n.x, n.y, aimAngle, d.rebateSnap * DEG, d.rebateSnapForce, origin)
      const speed = Math.max(REBATE_SPEED, Math.hypot(n.vx, n.vy) * 1.6) * Math.max(0.1, d.rebateSpeed)
      n.vx = Math.cos(dir) * speed; n.vy = Math.sin(dir) * speed
      n.state = 'rebated'; n.t = 0; n.grade = grade; n.midi = main; n.chain = d.rebateChain; n.voice = voice; n.bounces = 0
      n.color = DEGREE_COLORS[music.degreeOf(main) % DEGREE_COLORS.length]
      burst(n.x, n.y, grade === 'perfect' ? 12 : 6, n.color, grade === 'perfect' ? 260 : 160, 3)
      noteEvents.push({ kind: 'rebate', shot: n, grade, off, player: active, midi: main, notes })
    }
  }

  // what a note hit at (x, y) plays: through the ambience there (the stage's, else the map's zone and fixed lanes)
  // and the chain, in the order of the rule. A silent lane plays nothing.
  function noteSound(x: number, y: number, seq: NoteOut, chain: Transform[], rule: RebateRule | undefined, env: ReturnType<NoteEnvFn> | null): NoteOut[] {
    const place = env ? null : placeEnv?.(x, y) ?? null
    const z = place?.zone?.zone ?? music.zone
    const chord = z.id === music.zone.id ? music.chord(true) : chordOn(z, z.progression[music.bar % z.progression.length], true)
    const harmony = { root: z.root, steps: SCALES[z.scale].steps, chord, spb: music.secondsPerBeat() }
    const lane = place?.lane
    if (lane === null) return []
    // inside fixed lanes the lane's note is the base and the taco ornaments it (unless the note says otherwise)
    const r = rule ?? (lane !== undefined ? 'ambiente-taco' : DEFAULT_RULE)
    return rebateSound(seq, r, chain, { base: env?.base ?? lane ?? null, fit: env?.fit ?? harmony, chain: place?.zone?.chain }, {
      ...harmony, combo: env?.combo ?? 0, angle: aimAngle, rand: Math.random, byAngle: (a, oct) => music.noteFor(a, 'scale', oct),
    })
  }
  function playNotes(notes: NoteOut[], voice: VoiceId, tok = false) {
    const grid = music.toGrid()
    notes.forEach(o => { if (o.drum) out.drum(o.drum, grid + o.at, o.vel); else out.note(o.voice ?? voice, o.midi, grid + o.at, o.dur, o.vel) })
    if (tok) out.drum('wood', grid, 0.9)
  }
  // a note meeting a "Rebate notas" surface between two points: the face it came through (null: it was already
  // inside, or met none)
  function surfaceHit(boxes: Box[], px: number, py: number, x: number, y: number) {
    for (const b of boxes) {
      if (!b.rebate || !boxContains(b, x, y) || boxContains(b, px, py)) continue
      const side = px < b.l || px > b.r, top = py < b.t || py > b.b
      // through a corner: the axis it crossed later decides
      const flipX = side && (!top || Math.abs(px - (px < b.l ? b.l : b.r)) <= Math.abs(py - (py < b.t ? b.t : b.b)))
      return { box: b, flipX }
    }
    return null
  }
  // what a surface plays when a note bounces off it: its chain, the last item's (delegate) or the note as it is
  function surfaceSound(s: SurfaceRebate, x: number, y: number, midi: number, voice: VoiceId, lastChain: Transform[] | undefined, rule: RebateRule | undefined) {
    const seq: NoteOut = { midi, at: 0, dur: 0.3, vel: 0.5, voice }
    const notes = s.mode === 'none' ? noteSound(x, y, seq, [], 'travada', null) : noteSound(x, y, seq, s.mode === 'chain' ? s.chain : lastChain ?? [], rule, null)
    playNotes(notes, voice)
    return notes
  }
  // a note crossing the map's fixed lanes takes the lane's note (and colour), silently
  function laneRetune(x: number, y: number): number | null {
    const lane = placeEnv?.(x, y)?.lane
    return typeof lane === 'number' ? lane : null
  }

  // a rebate's direction pulled toward the nearest character (enemy, dummy or another player) within `snap` of it
  function snapAngle(x: number, y: number, angle: number, snap: number, force: number, origin: { x: number; y: number }) {
    if (snap <= 0 || force <= 0) return angle
    let best = 0, bestAbs = Infinity
    const consider = (cx: number, cy: number) => {
      let diff = Math.atan2(cy - y, cx - x) - angle
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      if (Math.abs(diff) <= snap && Math.abs(diff) < bestAbs) { bestAbs = Math.abs(diff); best = diff }
    }
    targets.forEach(t => { if (t.kind !== 'button' && t.deadT <= 0 && t.state !== 'converted') consider(t.x, t.y - t.h / 2) })
    blastActors.forEach(a => { if (origin.x < a.box.l || origin.x > a.box.r || origin.y < a.box.t || origin.y > a.box.b) consider((a.box.l + a.box.r) / 2, (a.box.t + a.box.b) / 2) })
    return bestAbs === Infinity ? angle : angle + best * Math.min(1, force)
  }

  // the notes in flight, once per world step: incoming ones the peck cancels, ones that reach a player or come too
  // late are missed; rebated ones fill the harmony of the first alien or zombie they meet
  function stepNoteShots(dt: number, ctx: StepCtx) {
    for (let i = noteShots.length - 1; i >= 0; i--) {
      const n = noteShots[i]
      const px = n.x, py = n.y
      n.t += dt; n.x += n.vx * dt; n.y += n.vy * dt
      if (n.state === 'incoming') {
        if (parryAt(n.x, n.y, n.size, n.color)) { noteEvents.push({ kind: 'parry', shot: n, player: parriedBy }); noteShots.splice(i, 1); continue }
        // it can still be rebated a little after it should have arrived (it flies on into her): touching a player
        // only counts once it is past the good window
        const late = music.time - n.arriveAt
        const hitHer = late > NOTE_GOOD && blastActors.some(a => n.x + n.size > a.box.l && n.x - n.size < a.box.r && n.y + n.size > a.box.t && n.y - n.size < a.box.b)
        if (hitHer || late > NOTE_LATE) {
          n.state = 'missed'; n.t = 0
          noteEvents.push({ kind: 'miss', shot: n })
          if (hitHer) { burst(n.x, n.y, 6, '#9aa0a8', 120, 2); noteShots.splice(i, 1) }
        }
        continue
      }
      if (n.state === 'missed') { if (n.t > 0.6) noteShots.splice(i, 1); continue }
      // a "Rebate notas" surface: it bounces back and plays again (a few times at most)
      const wall = (n.bounces ?? 0) < SURFACE_BOUNCES ? surfaceHit(ctx.boxes, px, py, n.x, n.y) : null
      const zw = wall || (n.bounces ?? 0) >= SURFACE_BOUNCES ? null : zoneWalls?.(px, py, n.x, n.y, true) ?? null
      if (zw) {
        n.x = px; n.y = py
        if (zw.flipX) n.vx = -n.vx; else n.vy = -n.vy
        n.bounces = (n.bounces ?? 0) + 1; n.t = 0
        burst(n.x, n.y, zw.died ? 28 : 6, zw.color, zw.died ? 340 : 160, zw.died ? 4 : 3)
        continue
      }
      if (wall) {
        n.x = px; n.y = py
        if (wall.flipX) n.vx = -n.vx; else n.vy = -n.vy
        n.bounces = (n.bounces ?? 0) + 1; n.t = 0
        const notes = surfaceSound(wall.box.rebate!, n.x, n.y, n.midi, n.voice ?? 'bells', n.chain, n.rule)
        const main = notes.find(o => !o.drum)?.midi
        if (main !== undefined) { n.midi = main; n.color = DEGREE_COLORS[music.degreeOf(main) % DEGREE_COLORS.length] }
        burst(n.x, n.y, 6, n.color, 160, 3)
        noteEvents.push({ kind: 'bounce', shot: n, midi: n.midi, notes })
        continue
      }
      const tuned = laneRetune(n.x, n.y)
      if (tuned !== null && tuned !== n.midi) { n.midi = tuned; n.color = DEGREE_COLORS[music.degreeOf(tuned) % DEGREE_COLORS.length] }
      const hit = targets.find(t => (t.kind === 'alien' || t.kind === 'zombie' || (t.kind === 'undead' && !(t.data as UndeadState).bird)) && t.deadT <= 0 && t.state !== 'converted' &&
        n.x + n.size > t.x - t.w / 2 && n.x - n.size < t.x + t.w / 2 && n.y + n.size > t.y - t.h && n.y - n.size < t.y)
      if (hit) {
        const note: NoteInfo = { midi: n.midi, color: n.color, sym: '♪', wave: 0, phase: 0, voice: 'bells' }
        // (a full harmony turns it into a bird)
        harmonize(hit, hit.maxHp * REBATE_HARMONY, Math.sign(n.vx) * 120, n.x, n.y, note, 0.3)
        noteShots.splice(i, 1); continue
      }
      if (n.t > REBATE_LIFE) noteShots.splice(i, 1)
    }
  }

  // the violin: a held note in a beam from the muzzle to the first thing it meets; its pitch follows the aim and the chord
  function stepBeam(d: ItemDef, h: Owned, dt: number, muzzle: { x: number; y: number }, ctx: StepCtx) {
    const dx = Math.cos(aimAngle), dy = Math.sin(aimAngle)
    let x = muzzle.x, y = muzzle.y, hit: Target | null = null
    for (let s = 0; s < d.range; s += 6) {
      x = muzzle.x + dx * s; y = muzzle.y + dy * s
      if (y >= ctx.groundY || boxAt(ctx.boxes, x, y, d.instrument)) break
      hit = targets.find(t => t.deadT <= 0 && t.state !== 'converted' && !(t.kind === 'undead' && (t.data as UndeadState).bird) && x >= t.x - t.w / 2 && x <= t.x + t.w / 2 && y >= t.y - t.h && y <= t.y) ?? null
      if (hit) break
    }
    const midi = music.noteFor(aimAngle, d.pitchSet, d.octave, d.span)
    const color = DEGREE_COLORS[music.degreeOf(midi) % DEGREE_COLORS.length]
    // the sound bends with the aim's tremolo; the note (colour, harmony) stays the lane's
    const pitch = midi + tremBend
    if (!beamHeld) { beamHeld = out.hold(d.voice, pitch); beamMidi = pitch }
    else if (Math.abs(pitch - beamMidi) > 0.005) { beamHeld.setPitch(pitch); beamMidi = pitch }
    beam = { x1: muzzle.x, y1: muzzle.y, x2: x, y2: y, midi, color, target: hit?.id ?? null }
    h.ammo = Math.max(0, h.ammo - dt * d.rate); if (h.refill) h.refill = 0
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
      if (!hit.dummy && (hit.harmony ?? 0) >= hit.maxHp) fullHarmony(hit, note)
    }
    if (h.ammo <= 0) { stopBeam(); if (d.autoReload) startReload() }
  }
  function stopBeam() { beamHeld?.stop(); beamHeld = null; beam = null }

  const env = (groundY: number, playerX: number, playerY: number, bounds?: { l: number; r: number }): EnemyEnv => ({
    playerX, playerY, groundY, viewL: bounds?.l ?? view.l, viewR: bounds?.r ?? view.r,
    // online: the other browsers' chickens count too (the nearest one is chased)
    nearest: netBodies.length ? (x: number, y: number) => {
      let best = { x: playerX, y: playerY }, dist = Math.hypot(playerX - x, playerY - y)
      for (const b of netBodies) { const d = Math.hypot(b.x - x, b.y - y); if (d < dist) { dist = d; best = b } }
      return best
    } : undefined,
    onBite: (t, at) => {
      const px = at?.x ?? playerX, py = at?.y ?? playerY
      // the bitten one is this browser's chicken: it counts here
      if (px === playerX && py === playerY) kills.bites++
      addText(px, py - 150, 'mordida!', '#ff6b5b'); burst(px + (t.face > 0 ? -20 : 20), py - 80, 10, '#ff6b5b', 200, 3); sound('bite', null)
    },
  })

  return {
    setBlastActors(actors: { box: BlastBox; push: (vx: number, vy: number) => void }[]) { blastActors = actors },
    // Local players: each one has their own items, aim, cooldowns and swing (a loadout); the world (targets,
    // enemies, shots, pickups, music) is shared. use(id) makes that player's loadout the current one; the
    // first one in use is 'p1'. Every getter and step() below act on the current loadout.
    use(id: string) { useLoadout(id) },
    get player() { return active },
    get capturedSouls() { return souls },
    drop(id: string) { if (id !== active) { loadouts.delete(id); parryZones.delete(id) } },
    // the slots shown (her items plus the empty one while there is room) and the one she holds
    get inventory() { return shown() },
    // each shown slot's group (the empty slot counts as the last group)
    get inventoryGroups(): ItemGroup[] { return shown().map(o => o ? groupOf(o) : 2) },
    // the Pátio's inventory limit (Configurações do Pátio): items already carried past it stay, no new ones fit
    get inventoryLimit() { return limit },
    setInventoryLimit(n: number) { limit = clampInventoryLimit(n) },
    get current() { return cur },
    get held() { return held() },
    get reloading() { return reloadT > 0 ? 1 - reloadT / Math.max(0.01, def().reloadTime) : 0 },
    get kick() { return kick },
    get swing() { return swing },
    get puffs() { return puffs as readonly Puff[] },
    get parryZones() { return [...parryZones.values()] },
    // a damaging note or projectile at (x, y), radius r: a peck defending there cancels it in a little cloud
    parry(x: number, y: number, r = 0, color = '#f4f1ea') { return parryAt(x, y, r, color) },
    // note shots: fire one (a note spawner), what happened to them this frame, which note a rebate plays
    fireNoteShot(n: Omit<NoteShot, 'id' | 'state' | 't'>) { const shot: NoteShot = { ...n, id: nextId++, state: 'incoming', t: 0 }; noteShots.push(shot); return shot },
    get noteShots() { return noteShots as readonly NoteShot[] },
    get noteEvents() { return noteEvents },
    // the ambience a note is rebated in (the stage's fan, the zone): its base note, its scale, the note's rule, the combo
    setNoteEnv(fn: NoteEnvFn | null) { noteEnv = fn },
    // what a point of the map plays (its Zonas sonoras and Faixas fixas); the stage's ambience wins over it
    setPlaceEnv(fn: PlaceEnvFn | null) { placeEnv = fn },
    // the walls of the zones with life (zone-life.ts)
    setZoneWalls(fn: ZoneWallsFn | null) { zoneWalls = fn },
    // a song is playing (the undead wait for it to end before leaving); the birds of the place (null: the zone's)
    setPlaying(on: boolean) { playing = on },
    setZoneBirds(list: BirdId[] | null) { zoneBirds = list?.length ? list : null },
    get undead() { return targets.filter(t => t.kind === 'undead' && t.deadT <= 0) },
    clearNoteShots(source?: string) { for (let i = noteShots.length - 1; i >= 0; i--) if (!source || noteShots[i].source === source) noteShots.splice(i, 1) },
    get peck(): PeckPose | null {
      if (held()) return null
      if (peck) return peckPose(peck)
      return peckPrep > 0 ? { angle: aimAngle, pull: items.peck.peckPull * Math.min(1, peckPrep / 0.12), reach: items.peck.meleeRange, thrust: 0 } : null
    },
    // the item she stands on that grab would take (drawn with a blue outline)
    get hover() { return hover },
    get hoverOwned() { return hoverOwned },
    // grab on the hovered item swaps (inventory full) instead of taking it into a free slot
    get hoverSwaps() { return !room() && !inv.some(o => o.item === hover?.owned.item) },
    get throwCharge() { return throwT > 0 ? Math.min(1, throwT / Math.max(0.05, def().throwCharge)) : 0 },
    get aimAngle() { return aimAngle },
    get throwAngle() { return throwAngle },
    // a throw called off (she switched items while charging): nothing happens until the button is let go
    get throwVoid() { return throwVoid },
    // the consumables' effects on the current player, combined (null: none): speed and acceleration multiply, the
    // curve, ramp and look are the latest dose's
    get effect() { return combineEffects(effects) },
    // each dose running on the current player (the inventory slots show their time)
    get effects() { return effects as readonly Effect[] },
    get consumption() { return consumption },
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
      if (item === 'peck' || item === 'wing') return
      peck = null; peckPrep = 0
      const stack = inv.find(o => o.item === item)
      if (stack) { if (CONSUMABLE_LIMITS[item]) stack.ammo = Math.min(CONSUMABLE_LIMITS[item]!, stack.ammo + 1); return }
      if (!room()) return
      stopBeam(); cur = takeIn(fresh(item)); sound('equip', item)
    },
    setItems(next: Record<ItemId, ItemDef>) {
      items = next
      inv.forEach(o => { if (o) { o.ammo = Math.min(o.ammo, CONSUMABLE_LIMITS[o.item] ?? items[o.item].mag); if (items[o.item].durability > 0 && o.durability <= 0) o.durability = items[o.item].durability } })
    },
    // a training dummy with its own params (the tip it shows when destroyed, its total life); returns its id
    addTarget(x: number, y: number, params?: Partial<DummyParams>) {
      const p = cleanDummyParams(params)
      const id = nextId++
      targets.push({ id, kind: 'dummy', home: x, x, y, w: 46, h: 112, hp: p.maxHp, maxHp: p.maxHp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'idle', animT: 0, dummy: { params: p, stage: DUMMY_STAGE_MAX, tipT: 0, crackT: 0 } })
      return id
    },
    addTrainingAlien(x: number, y: number, alien: { w: number; h: number; hp: number; data: unknown }) {
      const id = nextId++
      targets.push({ id, kind: 'alien', home: x, x, y, w: alien.w, h: alien.h, hp: alien.hp, maxHp: alien.hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'idle', animT: Math.random(), data: alien.data })
      return id
    },
    addTrainingZombie(x: number, y: number) { spawnZombieAt(targets, x, y) },
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
    // bounds: the scene the horde is for (by default the one on screen here); the aliens keep to it
    spawnAliens(groundY: number, playerX: number, bounds?: { l: number; r: number }) { spawnAlienRow(targets, env(groundY, playerX, 0, bounds)) },
    spawnZombies(groundY: number, playerX: number, count: number, bounds?: { l: number; r: number }) { spawnZombies(targets, env(groundY, playerX, 0, bounds), count) },
    // ---------- online (lib/pigchicken/net-world-sync.ts) ----------
    // follower: report hits on the owner's enemies to fn instead of applying them (null: this browser decides)
    setNetFollower(fn: ((h: NetHit) => void) | null) { reportHit = fn },
    get netFollower() { return !!reportHit },
    // while online, the shots fired here are kept for the sync to send (it empties the list)
    setNetOn(on: boolean) { netOn = on; if (!on) { netShots.length = 0; netBodies = [] } },
    netShots,
    setNetBodies(list: { x: number; y: number }[]) { netBodies = list },
    addRemoteShots,
    // the owner applies another browser's hit on one of its enemies, as if it were its own
    applyNetHit(h: NetHit) {
      const t = targets.find(g => g.net === h.id && !g.mirror)
      if (!t) return false
      if (h.n) harmonize(t, h.d, h.px, h.x, h.y, { midi: h.n.m, color: h.n.c, sym: h.n.s, wave: h.n.w, phase: 0, voice: h.n.v as VoiceId }, h.st ?? 0)
      else hitTarget(t, h.d, h.px, h.x, h.y)
      return true
    },
    // what a follower plays on its own screen when the owner's enemy dies, turns into a bird / a person, comes back
    netChange(t: Target, change: 'die' | 'convert' | 'zombieDie' | 'undeadDie' | 'bird') {
      if (change === 'die') {
        const color = (t.data as { color?: string } | undefined)?.color ?? '#ffffff'
        burst(t.x, t.y - t.h / 2, 24, color, 260, 5); sound('alienDie', null)
        playNotes(deathNotes(deathSoundsFor(t.data).physical, music.chord(true), music.secondsPerBeat()), 'chip')
      } else if (change === 'convert') convert(t)
      else if (change === 'zombieDie') sound('zombieDie', null)
      else if (change === 'undeadDie') { burst(t.x, t.y - t.h / 2, 20, '#8d9096', 240, 4); sound('alienDie', null) }
      else { burst(t.x, t.y - t.h / 2, 16, (t.data as UndeadState | undefined)?.eye ?? '#ffffff', 200, 4); addText(t.x, t.y - t.h - 50, 'pássaro morto-vivo!', '#c9ced6') }
    },
    // the owner's world becomes this browser's (it is the new owner): the mirrors move here from now on
    adoptMirrors() { targets.forEach(t => { if (t.mirror) { t.mirror = false; t.netX = undefined; t.netY = undefined } }) },
    // another browser became the owner: this browser's shared enemies become mirrors until its snapshot replaces them
    yieldShared() {
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if (!isSharedTarget(t)) continue
        if (t.net !== undefined) t.mirror = true; else targets.splice(i, 1)
      }
      for (let i = pendingUndead.length - 1; i >= 0; i--) if (isSharedTarget(pendingUndead[i])) pendingUndead.splice(i, 1)
    },
    clearEnemies() { for (let i = targets.length - 1; i >= 0; i--) if (targets[i].kind === 'alien' || targets[i].kind === 'zombie') targets.splice(i, 1) },
    get enemies() { return targets.filter(t => (t.kind === 'alien' || t.kind === 'zombie') && t.deadT <= 0 && t.state !== 'dead').length },
    addRack(x: number, item: ItemId, y?: number, respawnDelay?: number) { racks.push({ x, item, t: 0, label: items[item].name.toUpperCase(), y, respawnDelay: rackRespawnDelay(item, respawnDelay) }) },
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
    step(dt: number, body: Body, origin: { x: number; y: number }, muzzle: { x: number; y: number }, targetAngle: number, input: FrameInput, boxes: Box[], groundY: number, onRecoil: (vx: number, vy: number) => void, opts: { world?: boolean; throwOrigin?: { x: number; y: number }; peckOrigin?: { x: number; y: number } } = {}) {
      const world = opts.world !== false
      // rearranging the bar never changes what she holds (nor what is being done with it)
      if (input.move) moveSlot(input.move.from, input.move.to, input.move.after)
      if (input.deselect) {
        stopBeam(); peck = null; peckPrep = 0; swing = null; consumption = null
        cur = inv.length; reloadT = 0; burstLeft = 0; chargeT = 0; pumpT = 0
        throwT = 0; throwItem = null; throwVoid = input.throwHeld
        input = { ...input, ...NO_SWITCH, cancelFire: true, fire: false, firePressed: false, melee: false, throwReleased: false, reload: false, grab: false, grabHeld: false }
      }
      const d = def()
      if (consumption) {
        consumption.left -= dt
        if (consumption.left <= 0) consumption = null
        input = { ...input, ...NO_SWITCH, fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, grab: false, grabHeld: false }
      }
      // aim turns at the item's speed
      if (d.turnRate > 0) {
        let diff = Math.atan2(Math.sin(targetAngle - aimAngle), Math.cos(targetAngle - aimAngle))
        const max = d.turnRate * DEG * dt
        diff = Math.max(-max, Math.min(max, diff))
        aimAngle += diff
      } else aimAngle = targetAngle
      throwAngle = targetAngle
      // tremolo: shaking the aim inside a lane of the instrument's fan, after the note starts, bends its notes
      // (the press, or the violin's bow coming on, starts it in tune)
      if (d.instrument && d.tremolo > 0) {
        const pool = music.aimPool(d.pitchSet, d.octave, d.span)
        const playing = input.fire && (!d.beam || !!beamHeld)
        const lane = stepTremolo(trem, pool, -Math.sin(aimAngle), dt, d.tremolo, d.fretless, playing, d.tremoloRange)
        tremBend = pool.length ? lane - music.noteFor(aimAngle, d.pitchSet, d.octave, d.span) : 0
      } else { if (tremBend || Number.isFinite(trem.slow)) trem = newTremolo(); tremBend = 0 }

      lastBody = body
      if (world) { music.step(dt); bonusTextT = Math.max(0, bonusTextT - dt) }
      // the arpeggio starts over after a pause
      if (!input.fire) { arpIdle += dt; if (arpIdle > 0.6) arpStep = 0 } else arpIdle = 0
      cooldown = Math.max(0, cooldown - dt); meleeCool = Math.max(0, meleeCool - dt)
      kick = Math.max(0, kick - dt * 60)
      bloom = Math.max(0, bloom - d.spreadRecover * dt)
      if (swing) {
        swing.t += dt
        if (!swing.hit && swing.t >= swing.hitAt) strike(swing, origin)
        rebateNotes(swing, origin)
        if (swing.t > swing.life) swing = null
      }
      if (!swing || swing.t > swing.time) swingGap += dt

      // switching items
      if (input.slot) { if (input.slot <= shown().length) equip(input.slot - 1) }
      else if (input.pick) {
        // A full inventory has no displayed empty slot; Deselecionar can still leave it unequipped.
        const from = !room() && !held() ? (input.pick > 0 ? -1 : inv.length) : cur
        equip(from + input.pick)
      }
      else if (input.groupPick != null) {
        // the shown slots: the empty one (empty hands) belongs to the last group, so Próximo utilitário passes by it
        const i = groupStep(shown().map(o => o ? groupOf(o) : 2), cur, input.groupPick)
        if (i >= 0) equip(i)
      }
      const dNow = def()
      // Golpe is taken before firing, even with Atirar held: on an item that shoots, the blow interrupts firing
      // (no shot, charge, beam or rest of a burst while it moves). When it ends with Atirar still held, firing
      // starts again as if the button had just been pressed.
      const hNow = held()
      if (input.melee && meleeCool <= 0 && canSwing(!hNow)) { if (hNow && !blowsLeft(hNow, dNow)) dryBlow(hNow, dNow); else melee(!hNow, body.scale) }
      if (hNow && !dNow.consumable && !dNow.meleeOnly && dNow.mag !== 0 && swing && swing.t < swing.time) {
        fireResume = input.fire ? hNow : null
        input = { ...input, fire: false, firePressed: false }
        prevFire = false; chargeT = 0; glissSteps = 0; burstLeft = 0
      } else if (fireResume) {
        // only the same item: switching or emptying the wing during the blow asks for a new press, as usual
        if (input.fire && hNow === fireResume) input = { ...input, firePressed: true }
        fireResume = null
      }
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
      // gradual auto reload: while the held item is not being used (and not reloading), every refillTime s a few
      // shots (or blows) come back on their own, up to a full magazine
      const hr = held()
      if (hr) {
        const dr = items[hr.item]
        if (!dr.consumable && dr.mag > 0 && dr.refillTime > 0 && reloadT <= 0 && hr.ammo < dr.mag) {
          hr.refill = (hr.refill ?? 0) + dt
          while (hr.refill >= dr.refillTime && hr.ammo < dr.mag) { hr.ammo = Math.min(dr.mag, hr.ammo + Math.max(1, dr.refillAmount)); hr.refill -= dr.refillTime }
          if (hr.ammo >= dr.mag) hr.refill = 0
        } else if (hr.refill) hr.refill = 0
      }

      // A peck is armed only by a fresh Fire press with empty hands. UI/selection/Golpe
      // cancel it, so a later release can never strike with a newly selected item.
      peckCool = Math.max(0, peckCool - dt)
      if (held() || input.cancelFire || input.melee || body.state.startsWith('portal') || body.state === 'held') { peck = null; peckPrep = 0 }
      if (peck) {
        peck.t += dt
        if (!peck.hit && peck.t >= peck.time * PECK_CONTACT) {
          peck.hit = true
          const at = opts.peckOrigin ?? origin, d = items.peck
          // Sweep a narrow cone from the neck base; solid scenery stops the beak.
          const hit = new Set<number>()
          const arc = Math.min(160, Math.max(0, d.meleeArc)) * DEG
          for (let ray = 0; ray <= 8; ray++) {
            const a = peck.angle + (ray / 8 - 0.5) * arc
            for (let r = 0; r <= peck.reach; r += 3) {
              const x = at.x + Math.cos(a) * r, y = at.y + Math.sin(a) * r
              if (y > groundY || boxAt(boxes, x, y)) break
              targets.forEach(t => {
                if (hit.has(t.id) || t.deadT > 0 || x < t.x - t.w / 2 || x > t.x + t.w / 2 || y < t.y - t.h || y > t.y) return
                hit.add(t.id)
                hitTarget(t, d.meleeDamage, Math.cos(peck!.angle) * d.meleePush, x, y)
              })
            }
          }
        }
        if (peck.t >= peck.time) peck = null
      }
      const pk = peck as Peck | null, pf = pk ? pk.t / pk.time : -1
      if (pk && pf >= PARRY_WINDOW[0] && pf <= PARRY_WINDOW[1]) {
        const at = opts.peckOrigin ?? origin
        parryZones.set(active, { x: at.x, y: at.y, angle: pk.angle, reach: pk.reach, arc: Math.min(160, Math.max(0, items.peck.meleeArc)) * DEG })
      } else parryZones.delete(active)
      // Fire with an item shoots; Golpe continues to use the wing/item.
      const h = held()
      if (input.fire && h && h !== fireHeldItem) {
        const firingItem = items[h.item]
        if (!firingItem.consumable && !firingItem.meleeOnly && firingItem.mag > 0) {
          // Switching items while the trigger stays down acts like a new press for this weapon.
          input = { ...input, firePressed: true }
          cooldown = 0
        }
      }
      const canFire = body.state !== 'slide' || d.slideFire
      if (effects.length) { effects.forEach(e => { e.left -= dt }); effects = effects.filter(e => e.left > 0) }
      if (!h) {
        if (!input.cancelFire && !input.melee && body.state !== 'held' && !body.state.startsWith('portal')) {
          if (input.firePressed && peckCool <= 0 && meleeCool <= 0 && !peck) peckPrep = dt
          else if (input.fire && peckPrep > 0) peckPrep += dt
          if (!input.fire && prevFire && peckPrep > 0) {
            const p = items.peck
            peck = { angle: targetAngle, pull: p.peckPull * Math.min(1, peckPrep / 0.12), reach: p.meleeRange, t: 0, time: Math.max(0.05, p.meleeTime), hit: false }
            peckPrep = 0; peckCool = Math.max(p.meleeCooldown, p.meleeTime); sound('swing', null)
          }
        }
      } else if (h && d.consumable) {
        if (input.firePressed && cooldown <= 0) consume(h, d, origin)
      } else if (d.meleeOnly || d.mag === 0) {
        // an item only for hitting (the taco): Atirar swings it too
        if (input.firePressed && meleeCool <= 0 && canSwing(false)) { if (!blowsLeft(h, d)) dryBlow(h, d); else melee(false, body.scale) }
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
      fireHeldItem = input.fire ? h : null

      // throw: hold to charge, let go to throw what she holds; another item in the wing while charging
      // (switched, grabbed) calls the throw off completely, until the button is let go
      if (throwVoid || (throwT > 0 && held() !== throwItem)) {
        throwT = 0; throwItem = null
        throwVoid = input.throwHeld
      } else if (input.throwHeld) {
        if (throwT === 0) throwItem = held()
        throwT += dt
      }
      if (input.throwReleased && !throwVoid && throwT > 0) {
        const t = held()
        if (t) {
          const p = Math.min(1, throwT / Math.max(0.05, d.throwCharge))
          const { vx, vy } = throwVelocity(throwAngle, p, body.vx)
          sound('throw', null)
          const throwFrom = opts.throwOrigin ?? origin
          const spin = (Math.cos(throwAngle) >= 0 ? 1 : -1) * (8 + 10 * p)
          thrown.push({ x: throwFrom.x, y: throwFrom.y, vx, vy, spin, angle: throwAngle, owned: t, damage: d.throwDamage * (0.4 + 0.6 * p), hit: false })
          if (netOn) netShots.push({ k: 'th', i: t.item, x: throwFrom.x, y: throwFrom.y, vx, vy, sp: spin, a: throwAngle })
          const thrownAt = cur
          removeHeld(); reloadT = 0
          // the next item in the wing: the one before the thrown one (the new first when it was the first; empty
          // hands when she has none)
          cur = Math.max(0, thrownAt - 1)
        }
        throwT = 0; throwItem = null
      }

      const inBox = (x: number, y: number) => solidAt(boxes, x, y)

      // projectiles
      const ctx = { boxes, groundY }
      if (world) for (let i = bullets.length - 1; i >= 0; i--) if (stepBullet(bullets[i], dt, ctx)) bullets.splice(i, 1)
      if (world) stepNoteShots(dt, ctx)
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
            if (!t.remote) hitTarget(g, t.damage, Math.sign(t.vx) * 220, t.x, t.y)
            t.hit = true; t.vx *= -0.3; t.vy = Math.min(t.vy, -200)
          }
        }
        const top = boxes.find(b => b.solid !== false && crossesBoxTop(b, t.x, py, t.y))
        const side = !top && inBox(t.x, t.y)
        if (side) { t.vx *= -0.4; t.x += t.vx * dt * 2 }
        const floor = top ? top.t : t.y >= groundY ? groundY : null
        if (floor !== null && t.vy > 0) {
          // another browser's throw: the item lands on that browser's floor, not here
          if (!t.remote) pickups.push({ id: nextId++, owned: t.owned, x: t.x, y: floor, vy: 0, resting: true, noPick: 0.5 })
          burst(t.x, floor, 6, '#c9b48a', 120, 2)
          thrown.splice(i, 1)
        }
      }

      // pickups: fall to the floor; walking over one only offers it, grab (Pegar) takes it
      hover = null; hoverOwned = null
      const pickupReachX = (46 * body.scale + 10) * 1.15
      const pickupReachY = 60 * body.scale + 20
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]
        if (world) p.noPick = Math.max(0, p.noPick - dt)
        if (world && !p.resting) {
          const py = p.y
          p.vy += ITEM_GRAVITY * dt; p.y += p.vy * dt
          const top = boxes.find(b => b.solid !== false && crossesBoxTop(b, p.x, py, p.y))
          if (top) { p.y = top.t; p.resting = true; p.vy = 0 }
          if (p.y >= groundY) { p.y = groundY; p.resting = true; p.vy = 0 }
        }
        if (Math.abs(p.x - body.x) < pickupReachX && Math.abs(p.y - body.y) < pickupReachY && canTake(p)) {
          if (!hover || Math.abs(p.x - body.x) < Math.abs(hover.x - body.x)) hover = p
        } else if (p.noPick <= 0 && Math.abs(p.x - body.x) < pickupReachX && Math.abs(p.y - body.y) < pickupReachY && inv.some(o => o.item === p.owned.item)) {
          if (!hoverOwned || Math.abs(p.x - body.x) < Math.abs(hoverOwned.x - body.x)) hoverOwned = p
        }
      }

      // the offered item is outlined; Usar/Pegar takes it into a free slot, or swaps it with the held one when full
      // holding Pegar while walking takes every item she passes over, as if it were pressed on each one
      if (!input.grabHeld) heldTaken.clear()
      const meleePickup = !!input.melee && !input.grab && !input.grabHeld && !!hover
      const grabNow = !!input.grab || meleePickup || (!!input.grabHeld && !!hover && !heldTaken.has(hover.id))
      if (grabNow && hover && pickups.includes(hover) && (room() || held() || inv.some(o => o.item === hover!.owned.item))) {
        const g = hover, firstNew = nextId, at = pickups.indexOf(g)
        pickups.splice(at, 1)
        const picked = pickUp(g, !meleePickup)
        if (!picked && meleePickup) pickups.splice(at, 0, g)
        else {
          if (!picked) swapIn(g)
          hover = null
          heldTaken.add(g.id); for (let id = firstNew; id < nextId; id++) heldTaken.add(id)
        }
      }
      else if (input.grab && hoverOwned) {
        // the same item is in her inventory: grab equips it (the one on the floor stays)
        const slot = inv.findIndex(o => o.item === hoverOwned!.owned.item)
        if (slot >= 0 && slot !== cur) { equip(slot); addText(hoverOwned.x, hoverOwned.y - 30, `= ${items[hoverOwned.owned.item].name}`, '#c9ced6') }
      }
      if (!world) return
      // Each rack owns its pickup, so neighbouring racks and dropped copies
      // cannot suppress its refill. A partially collected stack still occupies it.
      racks.forEach(r => {
        if (r.pickupId !== undefined) {
          const active = pickups.find(p => p.id === r.pickupId)
          if (active) {
            if (r.spawnX !== r.x || r.spawnY !== r.y) {
              active.x = r.x; active.y = (r.y ?? groundY) - 60; active.vy = 0; active.resting = false
              r.spawnX = r.x; r.spawnY = r.y
            }
            r.t = 0; return
          }
          r.pickupId = undefined; r.t = 0
          if (r.respawnDelay > 0) return
        }
        r.t += dt
        if (r.t + 1e-9 >= r.respawnDelay) {
          r.pickupId = nextId++
          r.spawnX = r.x; r.spawnY = r.y
          pickups.push({ id: r.pickupId, owned: fresh(r.item), x: r.x, y: (r.y ?? groundY) - 60, vy: 0, resting: false, noPick: 0 }); r.t = 0
        }
      })

      // targets: knockback, wobble, fall and come back
      // enemies move; the ones that finished dying leave
      // the owner's enemies (online, another browser owns the lobby) only glide to where the owner has them
      targets.forEach(t => { if (t.mirror) glideMirror(t, dt) })
      targets.forEach(t => { if (t.blast && !t.mirror) { t.x -= t.blast.x; t.y -= t.blast.y } })
      const e = env(groundY, body.x, body.y)
      stepFormations(targets.some(t => t.mirror) ? targets.filter(t => !t.mirror) : targets, dt, e)
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if ((t.kind === 'alien' || t.kind === 'zombie') && !t.mirror && !stepEnemy(t, dt, e)) targets.splice(i, 1)
      }
      // the undead: fall, lie, get up and wander, fly as birds (and whistle), leave once the music ends
      targets.push(...pendingUndead.splice(0))
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if (t.kind !== 'undead' || t.mirror) continue
        const u = t.data as UndeadState
        t.animT += dt
        if (!stepUndead(t, u, dt, { boxes, groundY, viewL: view.l, viewR: view.r, playing, rand: Math.random })) { targets.splice(i, 1); continue }
        if (u.bird && u.phase === 'bird' && t.deadT <= 0) {
          u.whistleIn -= dt
          if (u.whistleIn <= 0) { const type = BIRDS[u.bird]; u.whistleIn = whistleTime(type); whistle(t.x, t.y - t.h / 2, type, u.params.mode) }
        }
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

      targets.forEach(t => {
        if (!t.blast || t.mirror) return
        stepBlastMotion(t.blast, dt)
        t.x += t.blast.x; t.y += t.blast.y
      })

      // every target: the stillness of a note wears off; answers cool down
      targets.forEach(t => { if (t.stun && !t.mirror) t.stun = Math.max(0, t.stun - dt); if (t.answerCool) t.answerCool = Math.max(0, t.answerCool - dt) })
      // converted enemies leave: birds flap up and away, people run off with little hops
      for (let i = critters.length - 1; i >= 0; i--) {
        const c = critters[i]
        c.t += dt
        const type = c.kind === 'bird' && c.bird ? BIRDS[c.bird] : null
        // circling or perched for a while, then away
        const staying = !!type && type.flight !== 'leave' && c.t < type.stay
        if (staying && type) {
          const hx = c.homeX ?? c.x, hy = type.flight === 'perch' ? (c.groundY || (c.groundY = floorUnder({ boxes, groundY }, hx, c.y))) - type.pixel * 4 : (c.homeY ?? c.y)
          const a = c.t * 1.6
          const nx = type.flight === 'circle' ? hx + Math.cos(a) * 80 : hx, ny = type.flight === 'circle' ? hy + Math.sin(a) * 30 : hy
          c.face = nx >= c.x ? 1 : -1
          c.x += (nx - c.x) * Math.min(1, dt * 2.5); c.y += (ny - c.y) * Math.min(1, dt * 2.5)
        } else if (c.kind === 'bird') {
          if (type && type.flight !== 'leave' && c.t - type.stay < dt * 1.5) { c.vx = c.face * rand(110, 160); c.vy = -rand(140, 200) }
          c.vy = Math.max(-260, c.vy - 40 * dt); c.x += c.vx * dt + Math.sin(c.t * 9) * 0.6; c.y += c.vy * dt + Math.sin(c.t * 14) * 1.2
        }
        if (type && c.whistleIn !== undefined) {
          c.whistleIn -= dt
          if (c.whistleIn <= 0) { c.whistleIn = whistleTime(type); whistle(c.x, c.y, type, null) }
        }
        else { c.x += c.vx * dt; c.vy += 1600 * dt; c.y += c.vy * dt; if (c.y >= c.groundY) { c.y = c.groundY; c.vy = Math.random() < 0.02 ? -380 : 0 } }
        if (c.t > 1.2 && c.kind === 'person' && Math.random() < dt * 1.5) texts.push({ x: c.x, y: c.y - 190, text: Math.random() < 0.5 ? '♥' : '♪', life: 0.9, color: '#ff6b9a', size: 18 })
        const stay = c.bird ? BIRDS[c.bird].stay : 0
        if (c.t > stay && (c.y < -120 || c.t > 9 + stay || c.x < view.l - 500 || c.x > view.r + 500)) critters.splice(i, 1)
      }
      for (let i = puffs.length - 1; i >= 0; i--) { puffs[i].t += dt; if (puffs[i].t >= puffs[i].life) puffs.splice(i, 1) }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.life <= 0) sparks.splice(i, 1) }
      for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) texts.splice(i, 1) }
    },
  }
}

export type Combat = ReturnType<typeof createCombat>
