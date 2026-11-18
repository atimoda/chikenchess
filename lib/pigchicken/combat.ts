// PigChicKen combat in the Parquinho: the items she carries, firing, hitting, throwing, projectiles,
// target dummies and items lying on the ground. World coordinates (x grows into the world, y is the screen's).
import { PECK_CONTACT, peckPose, type Peck, type PeckPose } from './peck'
import { SWING_PHASES, announceComboBlow, blowKind, nextCombo, swingCombo as comboOf, swingHitAt, swingLife, type Swing } from './swing'
import { DEFAULT_RULE, rebateSound, type NoteEnv, type NoteOut, type RebateRule, type Transform } from './transforms'
import { SURFACE_BOUNCES, type PlaceEnv, type SurfaceRebate } from './sound-zones'
import { BIRDS, birdPhrase, birdsFor, pickBird, type BirdId, type BirdType, type UndeadMode } from './birds'
import { birdPerchParams, perchEnd, perchSeekIn, perchSit, perchStart, perchStep, type PerchState, type PerchWorld } from './bird-perch'
import { ABDUCT_GAP, CHICK_SOUL_COLOR, farSpot, newSoul, noteClass, originOf, shotClass, soulSpecies, stepAbductions, stepScares, weaponClass, type Abduction, type Scare, type Soul, type SoulMark, type SoulOrigin, type SoulWeapon } from './souls'
import { SOUL_FLIGHT, createSoulBrain, soulErrandStep, soulFollowStep, spreadSouls, type SoulAir, type SoulBrain, type SoulFollowParams } from './soul-follow'
import { newSoulRoam, roamLift, soulFleeStep, soulRoamStep, type SoulRoam } from './soul-roam'
import { POOP, newPoop, poopFall, poopHits, poopKnock, poopUnder, poopWait, type Poop } from './poop'
import { SOUL_ACT, actClockStep, actDone, actLerp, hinderOf, newActClock, songDue, type SoulActClock, type SoulActParams, type SoulHinder } from './soul-acts'
import { guideBird } from './bird-guide'
import { entryActParams, entryFollowParams, entryOf } from './soul-library'
import { crossedTop, landing } from './box-tops'
import { UNDEAD_DEFAULTS, UNDEAD_MAX, deathNotes, deathSoundsFor, floorUnder, newUndead, stepUndead, type UndeadParams, type UndeadState } from './undead'
import { NOTE_GOOD, NOTE_LATE, REBATE_HARMONY, REBATE_LIFE, REBATE_SPEED, inSector, judgeNote, type NoteShot, type NoteShotEvent } from './note-shots'
import { explosionImpulse, stepBlastMotion, type BlastBox, type BlastMotion } from './explosion'
import { chestBlock, rollLoot, type ChestParams } from './chests'
import { CAGES_MAX, CAGE_DENY, bringFront, cageCap, cageRoom, cageSouls, cageWithRoom, cycleCages, flashCage, newCage, stepCage, type CageState } from './cages'
import { CONSUMABLE_LIMITS, DEFAULT_ITEMS, INSTRUMENT_WEAPON, bowed, hangOf, isCage, isKey, isMineItem, isStaff, pizzicato, type AccelCurve, type EffectLook, type ItemDef, type ItemId } from './items'
import { FIRST_IN_GROUP, INVENTORY_MAX, arrivalScale, clampInventoryLimit, groupStep, scaleStep, insertSorted, itemGroup, moveToSlot, wrapSlot, type ItemGroup } from './inventory'
import type { WeaponSound } from './sfx'
import { RACK_ITEM_START, rackRefillLimit, rackRespawnDelay } from './racks'
import { glideMirror, isSharedTarget, netIdFor, type NetHit, type NetShot } from './net-world'
import { TAKE_WAIT, glideSoulMirror, importSouls, soulFromWho, soulWho, type NetGive, type NetSoulWho, type NetTake, type SoulMirror } from './net-souls'
import { ALIEN_DEATH, ZOMBIE_TIMES, spawnAlienRow, spawnZombieAt, spawnZombies, stepEnemy, stepFormations, type AlienPatternDef, type EnemyEnv } from './enemies'
import { newTremolo, stepTremolo, type TremoloState } from './tremolo'
import { aimVolume } from './aim-volume'
import { arcAngle, assistPick, blendAngle, magnetSteer, type Magnet } from './aim-assist'
import { BOLT_HOP, BOLT_LIFE, BOLT_LIFE_SPECIAL, SHOCK_POWER, addShock, shockChain, type Shock } from './shock'
import { curveSide, launchDir, outPath, steerCurve } from './return-flight'
import { HOOK_ARRIVE, HOOK_ARRIVE_TARGET, HOOK_KEEP, HOOK_REEL, HOOK_STEP, hookCast, hookPullSpeed, pullDelta, pullStep, spinRate, type HookHit } from './grapple'
import { CHAIN_DELAY, DECK_SIZE, burstReaches, burstsAlone, cardSpot, cardTouches, nextCard, type CardPhase } from './cards'
import { STRINGS_SCALE, scaleAt, stringShift, type InstrumentScale } from './instrument-scales'
import { FIXED_INSTRUMENTS, markNetSeats, nearestSeat, type FixedKind, type Seat } from './fixed-instruments'
import { drumKit, drumPiece, hatRing, newDrumState, padOf, stepDrums, type DrumHit, type DrumInput, type DrumKnock, type DrumPiece, type DrumState } from './drum-kit'
import { SWEEP_GAP, newStringHand, stepStringHand, stringAlong, stringSlide, type StringHand } from './strings-play'
import { NO_EFFECTS, type ZoneEffects } from './zone-physics'
import { chordOn, createConductor, DEGREE_COLORS, NOTE_SYMBOLS, SCALES, type PitchSet } from './music'
import type { Drum, Held, Vibrato, VoiceId } from './synth'
import { cleanDummyParams, dummyAnswerMidi, dummyStage, DUMMY_STAGE_MAX, type DummyParams } from './dummies'
import { canPress, press as pressButton, stepPress, type ButtonPress } from './button-limit'

export type AimKind = 'point' | 'stick' | 'none'
// a string sounding on the Cordas soltas: its sound and its note in flight, the string's own note with the octave
// of a harmonic in it (`base`), what the place of the pluck added (`from`: -1, 0, 1) and where it was (`r0`)
type StringNote = { held: Held | null; bullet: Bullet | null; base: number; from: number; r0: number; bend: number }
// `late`: the plucks that wait their time (the front hand's, after the back hand's: "Atraso entre as mãos")
type HarpState = { hands: StringHand[]; notes: Map<number, StringNote>; plucked: Map<number, number>; late: { index: number; r: number; due: number; bonus: number }[]; t: number }
const newHarp = (): HarpState => ({ hands: [newStringHand(), newStringHand()], notes: new Map(), plucked: new Map(), late: [], t: 0 })
/**
 * One hand over the Cordas soltas this frame (null: that hand is off the strings). `angle`: where it points from her
 * shoulder; `reach` and `kind`: like the aim's (setAimReach); `sharp`: Correr held, a stick or the keys pluck past
 * the strings' end (the sustenido); `fire` / `pressed`: this hand's own Atirar (a finger on the screen), when it is
 * not the player's.
 */
export type StringAim = { angle: number; reach: number; kind: AimKind; sharp?: boolean; fire?: boolean; pressed?: boolean }
// the Bateria (lib/pigchicken/drum-kit.ts): the kit's own state, the open Chimbal ringing now (to damp and stop it),
// when and how hard each piece was last hit (s of `t`, for the drawing) and what the page said this frame
// knocks: the last knocks on the hardware (a click between the pieces): where on the chart and when
type KitState = { st: DrumState; hat: Held | null; struck: Map<DrumPiece, { at: number; vel: number }>; knocks: { x: number; y: number; at: number }[]; t: number; input: DrumInput | null }
const newKit = (): KitState => ({ st: newDrumState(), hat: null, struck: new Map(), knocks: [], t: 0, input: null })

// where the instruments' sound goes (the Parquinho plugs the synth in)
export type MusicOut = {
  // vib: the item's "Vibrato natural" (the note's whole vibrato; missing = the voice's own)
  note: (voice: VoiceId, midi: number, at: number, dur: number, vel: number, fade?: number, vib?: Vibrato) => void
  hold: (voice: VoiceId, midi: number, vib?: Vibrato) => Held | null
  // a note that can still be slid or cut short after it starts (the Cordas soltas' strings); without it, `note`
  pluck?: (voice: VoiceId, midi: number, at: number, dur: number, vel: number, vib?: Vibrato) => Held | null
  drum: (kind: Drum, at: number, vel?: number) => void
  // a hit of the Bateria (open: the Chimbal's pedal; light: a stroke of a roll); without it, `note` on the voice `kit`
  kit?: (piece: DrumPiece, at: number, vel: number, open?: number, light?: boolean) => Held | null
  // a knock on the Bateria's hardware (a click between its pieces); without it, the ambience's woodblock
  knock?: (kind: DrumKnock, vel: number) => void
}
const vibOf = (d: ItemDef): Vibrato => ({ depth: d.vibratoDepth, rate: d.vibratoRate, delay: d.vibratoDelay })
// the ambience where a note is rebated (the song tells it): what it forces, the scale it fits, whose rule counts
export type NoteEnvFn = (shot: NoteShot, angle: number) => (Partial<NoteEnv> & { rule?: RebateRule; combo?: number }) | null
// what a point of the map plays (the layout's Zonas sonoras and Faixas fixas)
export type PlaceEnvFn = (x: number, y: number) => PlaceEnv | null
// a note going from (px, py) to (x, y) through the wall of a zone with life: which way it bounces, the zone's colour
// and whether that hit made it change (count: false only replays what another browser already counted)
export type ZoneWallsFn = (px: number, py: number, x: number, y: number, count: boolean) => { flipX: boolean; color: string; died: boolean } | null
// the Grade de blocos (lib/pigchicken/mine-round.ts), for what flies here. by: the local player it counts for (null:
// a preview or another browser's, which only meets the wall). note, shot: something going from (px, py) to (x, y)
// meets the wall of a closed block (null: no wall there); a note bounces off it or goes on (bounce), a shot stops
// and leaves its damage. blast: an explosion's damage on the blocks around. shock: a lightning weapon's blow along
// that line. blow: a Golpe from (x, y) over `arc` around `angle`, as far as `reach` (music: with an instrument).
export type MineHooks = {
  note: (px: number, py: number, x: number, y: number, by: string | null) => { flipX: boolean; bounce: boolean; color: string } | null
  shot: (px: number, py: number, x: number, y: number, damage: number, by: string | null) => { flipX: boolean } | null
  blast: (x: number, y: number, r: number, damage: number, by: string) => void
  shock: (x1: number, y1: number, x2: number, y2: number) => void
  blow: (x: number, y: number, angle: number, arc: number, reach: number, damage: number, music: boolean, by: string) => void
}
const SILENT: MusicOut = { note: () => {}, hold: () => null, drum: () => {} }
// a note in flight: its pitch, colour and how it sways
export type NoteInfo = { midi: number; color: string; sym: string; wave: number; phase: number; voice: VoiceId }
// a bird the Passaguá can catch apart from the enemies (a chick): its middle and radius in world px. Online, id:
// the number this browser's chick goes by in the lobby; net: another browser's chick (pid: whose, id: its id in
// the lobby), which is asked of that browser (catch: it hides here meanwhile)
// push: shoves it (a Passaguá whose player carries no Gaiola); style: the chick's look, kept by its soul
export type Catchable = { x: number; y: number; r: number; catch: () => void; id?: number; net?: { pid: number; id: number }; push?: (vx: number, vy: number) => void; style?: number }

// a converted enemy leaving the scene: aliens become birds, zombies become happy people
// birds: their type, where they circle or perch, their next whistle and when they leave
export type Critter = {
  kind: 'bird' | 'person'; x: number; y: number; vx: number; vy: number; t: number; color: string; face: number; groundY: number
  bird?: BirdId; homeX?: number; homeY?: number; whistleIn?: number
  soul?: SoulOrigin // a bird: the alien it was and how it became one (lib/pigchicken/souls.ts)
  perch?: PerchState | null // resting on a wire (lib/pigchicken/bird-perch.ts); null: it already tried
  poopIn?: number // a bird whose type has the power: s until its next dropping (lib/pigchicken/poop.ts)
}
// a soul let out of its owner's Gaiola: it flies with them as a friend (lib/pigchicken/soul-follow.ts) until it is
// called back (recallIn: s until it leaves for their Gaiola) or a Passaguá catches it. away: s since its owner left
// the game (it flies off); null while it has one. act, clock: what it does for and against its owner, and when
// (lib/pigchicken/soul-acts.ts); job: what it is off doing right now; acts: how many helps it has done; warned: the
// enemy it last warned of. roam: its outings to the wires, trees, platforms and objects around its owner
// (lib/pigchicken/soul-roam.ts)
export type FreeSoul = {
  soul: Soul; owner: string; x: number; y: number; face: number; t: number; brain: SoulBrain; params: SoulFollowParams; recallIn: number | null; away: number | null
  roam: SoulRoam
  poopIn: number // s until it may let a dropping fall (its entry's poopEvery; lib/pigchicken/poop.ts)
  act: SoulActParams; clock: SoulActClock; job: SoulJob | null; acts: number; warned: { id: number; at: number } | null
  // the real bird its entry takes after (lib/pigchicken/bird-guide.ts): the voice of its notes and the song it sings
  // now and then; sang: when it last did (s of the souls' clock)
  bird: string; sang: number
  // in a portal with its owner: where it was when she went in (it flies from there to the portal's centre) and how big
  // it is drawn meanwhile (1 .. 0 inside; missing: its own size)
  portal?: { x: number; y: number } | null; k?: number
}
// where a player is in a portal now (world px: its centre): going in or coming out, and how far (0..1)
export type SoulPortal = { mode: 'enter' | 'arrive'; x: number; y: number; k: number }
// what goes with the players from one Pátio to the next (each local player's): the inventory and the item in hand, the
// Gaiolas (the first one in front) with the souls in each, and the souls that were flying free with them (they come
// out of the portal with them)
export type WorldCarry = Record<string, { inv: Owned[]; cur: number; cages: { item: ItemId; cap: number; souls: Soul[] }[]; loose: Soul[] }>
// an errand of a soul: fetching an item (fetch: on its way to it; carry: bringing it), a step under its owner's feet,
// or something against her. t: s on it; item: the one it goes for or carries; side: the side of her it comes from
export type SoulJob = { kind: 'fetch' | 'carry' | 'step' | Exclude<SoulHinder, 'own' | 'none' | 'detune'>; t: number; item?: Pickup; side?: 1 | -1 }
export const CALLBACK_GAP = 0.2 // s between two souls called back
export const CALLBACK_GUARD = 0.5 // s after letting one out before a press on the Gaiola can call them back

// a platform's box. solid: she and the items lying around stand on it (default yes); shots: bullets, grenades and the
// beam stop at it (default yes); notes: the instruments' notes stop at it (default no, they go through); rebate: the
// notes (rebated ones and the instruments') bounce off it and play
// topsAt: a shaped one's tops at x (the lines of its outline that face up), where the falling things land (box-tops.ts)
export type Box = { l: number; t: number; r: number; b: number; solid?: boolean; shots?: boolean; notes?: boolean; rebate?: SurfaceRebate; occludedAt?: (x: number, y: number) => boolean; topsAt?: (x: number) => number[] }
export const boxContains = (box: Box, x: number, y: number) =>
  x >= box.l && x <= box.r && y >= box.t && y <= box.b && !box.occludedAt?.(x, y)
// refill: seconds the gradual auto reload has counted toward the next shots coming back (reset whenever it is used).
// group: the inventory group it sits in (its own when taken; dragging it on the bar may change it)
// scale: the index in its item's `scales` it plays now (instruments with more than one scale)
// out: how many of it are away now (a staff that comes back, thrown; a deck's cards); flying: all of them are, and
// her wing is empty until one is back; specialAt: when its special is ready again, on the world's clock (missing: ready)
// next: a deck's card of the order that its next throw starts looking from (lib/pigchicken/cards.ts)
// back: of two (the Boomerangs), the one in hand is in the back wing (the front one went first)
// cage: a Gaiola's limit and the souls in it (lib/pigchicken/cages.ts); it goes with the item wherever it is
export type Owned = { item: ItemId; ammo: number; durability: number; refill?: number; group?: ItemGroup; scale?: number; out?: number; flying?: boolean; back?: boolean; next?: number; specialAt?: number; cage?: CageState }
export type Bullet = {
  x: number; y: number; vx: number; vy: number; dist: number; damage: number; pierce: number; hits: Set<number>; size: number; drop: number; range: number
  item: ItemId; t: number; explode: number; explodeDamage: number; fuse: number; bounce: number
  note?: NoteInfo; ring?: number // instruments: the note it carries; notes it lets out when it bursts
  explodePush?: number // snapshot of the item's blast force when fired
  ghost?: boolean // goes through walls and floating platforms (instruments' notes)
  bounces?: number // times it bounced off a "Rebate notas" surface
  remote?: boolean // another browser's shot (online): it flies and shows, never damages
  by?: string // the local player who fired it (the Grade de blocos counts whose note or shot it was)
  room?: ShotRoom // fired inside a house: it stops at that room's walls and touches nothing outside
}
// the room of a house for what is fired inside it (lib/pigchicken/house-rooms.ts): its walls and its floor
export type ShotRoom = { id: string; boxes: Box[]; groundY: number }
export type Boom = { x: number; y: number; r: number; life: number; color?: string }
export type Tracer = { x1: number; y1: number; x2: number; y2: number; life: number }
// a bolt of a shock, from one point to another: t counts up from before 0 (it shows a moment after the bolt it comes
// from) to life; special: a special's (thicker, longer); sky: the thunder's bolt from the sky
export type Bolt = { x1: number; y1: number; x2: number; y2: number; t: number; life: number; seed: number; special: boolean; sky?: boolean }
// a staff thrown that comes back (the Martelo de Thor): straight out for `left` px, then back to its owner's wing;
// hits: who it already hit on this leg. remote: another browser's (it only shows, back to where it left from: home)
export type Flight = {
  x: number; y: number; vx: number; vy: number; angle: number; spin: number; owned: Owned; owner: string; back: boolean; left: number; speed: number
  damage: number; push: number; hits: Set<number>; remote?: boolean; home?: { x: number; y: number }
  // its curve (lib/pigchicken/return-flight.ts). dir: where it heads; launch: where it was thrown to; reach: how long
  // the way out is; aim: where its owner aims now; side: the side it bends to; bend: how much it bends now (radians
  // over a leg, with the side's sign; it follows the aim softly); far: how far it was when it turned back
  dir: number; launch: number; reach: number; aim?: number; side: number; bend: number; far?: number
}
// a card of a deck (lib/pigchicken/cards.ts): thrown to (tx, ty), it floats there until someone touches it and it
// bursts, or its owner goes too far and it flies back. rank: which card of the deck; t: s in this phase; seed: its
// own sway and tilt; fuse: s until it bursts because another burst reached it; note: what a music deck's card keeps
// to play when it bursts; remote: another browser's (it only shows; net: its id there; home: where it left from)
export type Card = {
  id: number; rank: number; x: number; y: number; tx: number; ty: number; phase: CardPhase; t: number; seed: number; speed: number; angle: number
  item: ItemId; owned: Owned; owner: string; fuse?: number; note?: NoteInfo; remote?: boolean; net: number; home?: { x: number; y: number }
}
// the Corrente-gancho's hook (lib/pigchicken/grapple.ts): out along the aim from its owner's hand (hx, hy: where the
// chain starts this frame), latched and pulling (`hit`: on the world, her to the anchor (ax, ay); on someone, them to
// her, the hook riding on them at (ox, oy) from their middle), or reeling back to her hand. pull: the pull's speed;
// t: s in this phase; best / stall: how close the pull got and for how long it has not got closer.
// remote: another browser's (it only shows: out to where it latched over there, held a moment, back home)
export type Hook = {
  x: number; y: number; hx: number; hy: number; angle: number; speed: number; left: number; phase: 'out' | 'pull' | 'back'
  owned: Owned; owner: string; hit: HookHit | null; ax: number; ay: number; ox: number; oy: number
  pull: number; damage: number; t: number; best: number; stall: number; scale: number; flew?: boolean; room?: ShotRoom; remote?: boolean; latched?: boolean; home?: { x: number; y: number }
}
export type Thrown = { x: number; y: number; vx: number; vy: number; spin: number; angle: number; owned: Owned; damage: number; hit: boolean; remote?: boolean; room?: ShotRoom }
// x: centre, y: bottom. dummy targets break in stages and stay wrecked until notes mend them; aliens and zombies are removed; buttons never fall
// undead: what an alien leaves when its life runs out (lib/pigchicken/undead.ts); data is its UndeadState
export type TargetKind = 'dummy' | 'alien' | 'zombie' | 'button' | 'undead'
export type Target = {
  id: number; kind: TargetKind; home: number; x: number; y: number; w: number; h: number; hp: number; maxHp: number; flash: number; wobble: number; vx: number; deadT: number
  face: number; state: string; animT: number; label?: string; data?: unknown
  // instruments: the harmony bar (full at maxHp converts), how long it stays still, its answer's cooldown, the tint of the last note
  harmony?: number; stun?: number; answerCool?: number; tint?: string
  // a horde button with a limit (lib/pigchicken/button-limit.ts): its presses and the gap between them
  press?: ButtonPress
  // the share of each hit it blocks (1 = immune right now): the temple's drums between beats, the dragon's head
  shield?: number
  // training dummies: their own params, the stage they are in, how long the tip bubble shows, the crack's jolt
  blast?: BlastMotion
  dummy?: DummyState
  // online (lib/pigchicken/net-world.ts): its id in the lobby; mirror: the owner's enemy drawn here (not moved here),
  // gliding to where the owner has it (netX, netY)
  net?: number; mirror?: boolean; netX?: number; netY?: number
  // what the soul it leaves will remember: the weapon that killed it, the instrument and the note that finished it
  soul?: SoulMark
  // shocked by a lightning weapon (lib/pigchicken/shock.ts): it shakes, stands still and blinks in x-ray
  shock?: Shock
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
// a Baú of the layout (lib/pigchicken/chests.ts): x is its middle, y the floor it stands on. lid: 0 shut … 1 open
// (eased by the world's step); t: s since it opened; shake: s left of the shiver of a press that could not open it
export type Chest = { id: string; x: number; y: number; params: ChestParams; open: boolean; lid: number; t: number; shake: number }
// what a player sees of the nearest closed Baú in reach: whether Pegar opens it, and what keeps it shut
export type ChestNear = { chest: Chest; block: 'key' | 'souls' | null }
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
// a peck's defence: while the beak is out, damaging notes and projectiles in its cone vanish in a little cloud
export type ParryZone = { x: number; y: number; angle: number; reach: number; arc: number }
export type Puff = { x: number; y: number; t: number; life: number; seed: number; color: string }
export const PARRY_WINDOW = [0.12, 1] as const // fractions of the peck's time when the beak defends
export const PUFF_LIFE = 0.4
export type FloatText = { x: number; y: number; text: string; life: number; color: string; size?: number }
export type { Swing } from './swing'

// species: her class's species ('pig', 'fox'): an empty hand of theirs hits with the chain or the tail
// invLimits: the most items of each category she carries (instruments, weapons, utilities; Personagem → Inventário)
export type Body = { x: number; y: number; face: number; scale: number; grounded: boolean; state: string; vx: number; species?: string; invLimits?: readonly number[] }
export type FrameInput = {
  fire: boolean; firePressed: boolean; melee: boolean; throwHeld: boolean; throwReleased: boolean
  reload: boolean; pick: number; slot: number // pick: +1 / -1 cycles; slot: 1-based exact slot (keys, bar, wheel), 0 none
  groupPick?: ItemGroup | null // Próximo instrumento / arma / utilitário: the next item of that group
  // Próxima variação pressed: the held item's next variation (an instrument's next scale, round to the first; a
  // weapon shows its tambor)
  variation?: boolean
  // Controles → "Incluir variações / escalas…": the quick switch (pick) and the group switch go through the held
  // instrument's scales before the next item (off: straight to the next item)
  pickVariations?: boolean
  groupVariations?: boolean
  move?: { from: number; to: number; after: boolean } | null // a slot dragged on the bar, dropped before / after another
  deselect?: boolean // empty hands without dropping anything; cancels prepared actions
  cancelFire?: boolean // UI, focus loss or a grabbed/portal chicken cancels preparation
  grab?: boolean // standing on an item: takes it (free slot) or swaps it with the held one (full inventory)
  grabHeld?: boolean // Pegar held down: every item she passes over is taken as if grab were pressed on it
  grabReleased?: boolean // Pegar let go in this frame (a Gaiola with no room for it is swapped in only by a whole press on it)
  grabRun?: boolean // that press came only from Correr's keys/buttons: it takes (Pegar) but never equips (Equipar)
  grabKeep?: boolean // seated: that press came only from the instrument's own binds (lib/pigchicken/instrument-binds.ts): it does not get her up
}

export const SLOTS = INVENTORY_MAX
// the inputs that switch items, cleared when something blocks switching
const NO_SWITCH = { pick: 0, slot: 0, groupPick: null }
const THROW_GRAVITY = 1500
const ITEM_GRAVITY = 1800
// a card of a deck: half its size (px), for the bursts that reach it; s another browser's card floats here at most
// (its burst or its way back may never arrive: the shots' queue drops the oldest when it is full)
const CARD_HALF = 14
const REMOTE_CARD_LIFE = 90
// an item on the floor, as a circle for the blows' hit areas (Golpe and Bicada): radius (px), centred this far above
// where it rests
export const PICKUP_HIT_R = 14
const SWING_PICKUP_R = PICKUP_HIT_R
// how much wider than an item's the reach of a Baú is (px each side): it is wider than an item
const CHEST_REACH_X = 30
// how near her feet (horizontally, vertically) an item on the floor counts as touching her body (offered to Pegar)
export const pickupReach = (scale: number) => ({ x: (46 * scale + 10) * 1.15, y: 60 * scale + 20 })

const rand = (a: number, b: number) => a + Math.random() * (b - a)
// the Filhote's limits that the combat applies (Personagem → Filhote; lib/chicken/params.ts has the defaults)
export type BabyRules = { noStaffs: boolean; oneCage: boolean; noMelee: boolean; piu: boolean }
export const BABY_RULES: BabyRules = { noStaffs: true, oneCage: true, noMelee: false, piu: true }
// a Pegar refused by the category's limit (Personagem → Inventário)
const CATEGORY_FULL: Record<ItemGroup, string> = { 0: 'Limite de instrumentos', 1: 'Limite de armas', 2: 'Limite de utilitários' }
const DEG = Math.PI / 180
// a combo for an item that has none (never in the game: every item has one)
const DEFAULT_COMBO = comboOf(110)

export function createCombat() {
  let items: Record<ItemId, ItemDef> = structuredClone(DEFAULT_ITEMS)
  // the items she carries, grouped and in order (instruments, weapons, others); cur may be inv.length:
  // the empty slot (empty hands), which exists while there is room
  const inv: Owned[] = []
  let cur = 0
  // the Pátio's inventory limit (the same for every local player)
  let limit = INVENTORY_MAX
  let cooldown = 0, burstLeft = 0, reloadT = 0, bloom = 0, meleeCool = 0, kick = 0, throwT = 0, chargeT = 0, prevFire = false
  // the strong blow of a staff (Atirar held): the item being charged (null: not armed) and how long it has charged (s)
  let heavyItem: Owned | null = null, heavyT = 0
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
  // id: the local player it is (the souls act on their owner through it); the chicks have none
  // push(vx, vy, damage): damage is what the blow does, for a bird grabbed on a wall (lib/chicken/grab-damage.ts);
  // without it the push always takes it off. v: its velocity now (the Corrente-gancho's pull keeps it at its speed)
  let blastActors: { id?: string; box: BlastBox; v?: { x: number; y: number }; push: (vx: number, vy: number, damage?: number) => void }[] = []
  // other catchable birds in the world (the chicks that follow her): where they are (world px, their middle and
  // size) and what to do when the Passaguá catches one (the Parquinho removes it)
  let catchables: Catchable[] = []
  // the wires of the Postes and Torres the birds rest on (the Parquinho keeps it up to date)
  let perchWorld: PerchWorld | null = null
  let nextId = 1
  const booms: Boom[] = [], tracers: Tracer[] = []
  // sounds to play this frame (the Parquinho drains it)
  const sounds: { kind: WeaponSound; item: ItemId | null }[] = []
  // the real songs the souls flying free started this frame (the Parquinho drains it: lib/pigchicken/bird-song.ts)
  const songs: { bird: string; x: number; y: number }[] = []
  const sound = (kind: WeaponSound, item: ItemId | null = held()?.item ?? null) => {
    const d = item ? items[item] : null
    // instruments make musical sounds instead of the mechanical ones
    if (d?.instrument) {
      const root = music.noteFor(-Math.PI / 2, 'chord', d.octave, 0.5)
      // equipping: a very soft two-note sigh (low velocity, slow fade-in), well under the played notes
      if (d.voice === 'kit') { if (kind === 'equip') out.note('kit', 42, 0, 0.1, 0.2); return }
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
  // the lightning weapons: the bolts showing, the staffs thrown that are coming back, the world's clock (the
  // specials' cooldowns count on it) and how bright the sky still is from a special (1 right at the thunder)
  const bolts: Bolt[] = [], flights: Flight[] = []
  // the cards of the decks out in the world: flying, floating where they were thrown to, or on their way back
  const cards: Card[] = []
  // the Corrente-gancho's hooks out in the world, each local player's hand (where the chain starts) and the angle of
  // the chain spinning in it while Atirar charges
  const hooks: Hook[] = []
  const hands = new Map<string, { x: number; y: number }>(), spins = new Map<string, number>()
  // the targets a hook is pulling this frame: their blast motion is the pull's, not the fall's
  const hooked = new Set<Target>()
  let clock = 0, skyFlash = 0
  // y: the floor the rack stands on (a platform's top), or the ground when unset
  const racks: { x: number; item: ItemId; t: number; label: string; y?: number; respawnDelay: number; pickupId?: number; spawnX?: number; spawnY?: number; cageSouls?: number; refillLimit?: number; given: number }[] = []
  // the Baús of the layout (the layout sync adds, moves and removes them) and the one each local player is next to
  const chests: Chest[] = []
  const chestNear = new Map<string, ChestNear>()
  // the fixed instruments of the layout (lib/pigchicken/fixed-instruments.ts) and the free one each player is next to
  const seats: Seat[] = []
  const seatNear = new Map<string, Seat>()
  // online: the Baús opened here this frame, for the sync to tell the other browsers (lib/pigchicken/net-chests.ts)
  const chestOpens: string[] = []
  let swing: Swing | null = null
  // the pecks defending right now (one per local player) and the little clouds of what they cancelled
  const parryZones = new Map<string, ParryZone>()
  const puffs: Puff[] = []
  // note shots (tiros-nota) in flight, what happened to them this frame (the song reads it), and the rule that
  // says which note a rebate plays (the song's fan; by default the note sequenced)
  const noteShots: NoteShot[] = []
  // the players inside a house, by player: what they fire and throw stays in that room
  const shotRooms = new Map<string, ShotRoom>()
  const noteEvents: NoteShotEvent[] = []
  let noteEnv: NoteEnvFn | null = null
  let placeEnv: PlaceEnvFn | null = null
  // what the Zona at a point does to the bodies there (zone-physics.ts): the factor on gravity and the x-ray look
  let zoneFx: ((x: number, y: number) => ZoneEffects) | null = null
  const gravityAt = (x: number, y: number) => zoneFx?.(x, y).gravity ?? 1
  // the share of a frame a point lives (a Zona's slow motion): what is there moves and counts down by it
  const timeAt = (x: number, y: number) => zoneFx?.(x, y).time ?? 1
  // the walls of the Zonas sonoras with life: a note crossing one bounces (count: it takes a point of the zone's life)
  let zoneWalls: ZoneWallsFn | null = null
  // mineQuiet: the blast being made is a block's own bomb, which does not hurt the blocks around
  let mine: MineHooks | null = null, mineQuiet = false
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
  let beam: { x1: number; y1: number; x2: number; y2: number; midi: number; color: string; target: number | null; bend?: number; vib?: number } | null = null
  let beamHeld: Held | null = null, beamMidi = 0
  // the aim's tremolo (lib/pigchicken/tremolo.ts): semitones the held instrument's notes bend right now
  let trem: TremoloState = newTremolo(), tremBend = 0
  // "Tremolo: reage a" the movement along the string: the aim's reach when the note started (null: nothing playing)
  let tremReach: number | null = null
  // how far the aim reaches (0 at her … 1 far; lib/pigchicken/aim-volume.ts): the instrument's notes get louder with it
  let aimReach = 1
  // what that reach is: the pointer's own place ('point'), how far a stick is pushed ('stick') or nothing ('none': keys)
  let aimKind: AimKind = 'none'
  // the Cordas soltas (lib/pigchicken/strings-play.ts): her hands on the strings, the note each string sounds now
  // (to slide it, and to cut it when the string is plucked again) and when each one was last plucked (s of `t`)
  let harp: HarpState = newHarp()
  // her hands over the strings as the page gave them ([front, back]); null: one hand, the aim itself
  let stringAims: (StringAim | null)[] | null = null
  // the Bateria she sits at
  let kit: KitState = newKit()
  // where the reticle is, in world px (null: unknown, only the aim's angle): a deck's card flies there
  let aimPoint: { x: number; y: number } | null = null
  const noteVol = (d: ItemDef) => aimVolume(d.volMin, d.volMax, aimReach)
  // the held instrument's scale (lib/pigchicken/instrument-scales.ts) and its notes for the aim right now
  const scaleOf = (h: Owned | null | undefined, d: ItemDef): InstrumentScale => scaleAt(d.instrument ? d.scales : undefined, h?.scale)
  // where along the Cordas soltas the aim is, in the aim's reach: the pointer's own place; a stick's push, from her
  // to the strings' end (all the way is still the plain note); the keys have no distance: a plain note
  // (with Correr held, a stick or the keys are past the strings' end: the sustenido)
  function stringReachOf(kind: AimKind, reach: number, sharp = false) {
    const sh = STRINGS_SCALE.shape
    if (kind === 'point') return reach
    if (sharp) return 1
    if (kind === 'stick') return reach * (sh.stringEnd - 0.005)
    return sh.stringStart + (sh.stringEnd - sh.stringStart) * 0.8
  }
  const stringReach = () => stringReachOf(aimKind, aimReach)
  // her hands over the strings now ([front, back]; null: that hand is off them)
  const handAims = (): (StringAim | null)[] => stringAims ?? [{ angle: aimAngle, reach: aimReach, kind: aimKind }, null]
  function tones(d: ItemDef) {
    const sc = scaleOf(held(), d), angle = aimAngle, reach = sc.id === 'strings' ? stringReach() : aimReach
    const q = { angle, reach, set: d.pitchSet, octave: d.octave, span: d.span, descending: d.spiralDescending, hang: hangOf(d) }
    return {
      scale: sc,
      note: () => sc.noteFor(music, q),
      // the aim between the Hangdrum's notes: a percussive slap instead of the clean note
      slap: () => sc.isSlap(music, q),
      pool: () => sc.pool(music, q),
      walk: (from: number, n: number, set: PitchSet) => sc.walk(music, from, n, set, angle, reach, q),
      color: (m: number) => DEGREE_COLORS[sc.degreeOf(music, m, angle, reach) % DEGREE_COLORS.length],
    }
  }
  // ---------- Aim Assist (lib/pigchicken/aim-assist.ts) ----------
  // each player's scale drawing in the world: its middle (her shoulder) and radius (setScaleFan)
  const scaleFans = new Map<string, { x: number; y: number; r: number }>()
  // where an instrument's shot leaving `from` at `speed` goes: toward the enemy standing in the cell of its scale the
  // aim (angle, reach) is on, by the item's Aim Assist (an enemy's reach is its distance from her over the drawing's
  // radius, so a cell goes on past the drawing like the aim does); with nobody there, where the aim is.
  // p: how far it turned (the spread shrinks as much: 100% goes right at it)
  function assistAim(d: ItemDef, from: { x: number; y: number }, speed: number, angle = aimAngle, reach?: number): { angle: number; p: number } {
    const p = d.instrument ? Math.max(0, Math.min(1, (d.aimAssist ?? 0) / 100)) : 0
    if (!(p > 0)) return { angle, p: 0 }
    const sc = scaleOf(held(), d)
    const q = (a: number, r: number) => ({ angle: a, reach: r, set: d.pitchSet, octave: d.octave, span: d.span, descending: d.spiralDescending, hang: hangOf(d) })
    const cell = sc.cellAt(music, q(angle, reach ?? (sc.id === 'strings' ? stringReach() : aimReach)))
    if (!cell) return { angle, p: 0 }
    const fan = scaleFans.get(active) ?? { x: from.x, y: from.y, r: 0 }
    const list: { x: number; y: number }[] = []
    for (const t of targets) {
      if (!alive(t) || t.kind === 'button' || (t.kind === 'undead' && (t.data as UndeadState).bird)) continue
      const x = t.x, y = t.y - t.h / 2
      if (Math.hypot(x - from.x, y - from.y) <= d.range) list.push({ x, y })
    }
    const cellOf = (o: { x: number; y: number }) => sc.cellAt(music, q(Math.atan2(o.y - fan.y, o.x - fan.x), fan.r > 0 ? Math.min(1, Math.hypot(o.x - fan.x, o.y - fan.y) / fan.r) : aimReach))
    const pick = assistPick(list, cell, cellOf, aimPoint ?? from)
    if (!pick) return { angle, p: 0 }
    const to = arcAngle(pick.x - from.x, pick.y - from.y, speed, d.drop * gravityAt(from.x, from.y))
    return { angle: blendAngle(angle, to, p), p }
  }
  // ---------- Bullet Magnetism: the aliens whose variation pulls (lib/pigchicken/alien-catalog.ts), once per step ----------
  let magnetCache: (Magnet & { id: number })[] | null = null
  function magnetList() {
    if (magnetCache) return magnetCache
    magnetCache = []
    for (const t of targets) {
      const m = Number((t.data as { magnet?: unknown } | undefined)?.magnet) || 0
      if (m > 0 && t.kind === 'alien' && alive(t)) magnetCache.push({ id: t.id, x: t.x, y: t.y - t.h / 2, m })
    }
    return magnetCache
  }
  // bends something flying toward the alien that pulls it (skip: the ones it already went through)
  function magnetize(o: { x: number; y: number; vx: number; vy: number }, dt: number, skip?: Set<number>) {
    let ms = magnetList()
    if (!ms.length) return
    if (skip?.size) ms = ms.filter(m => !skip.has(m.id))
    const v = magnetSteer(o.vx, o.vy, o.x, o.y, ms, dt)
    if (v) { o.vx = v.vx; o.vy = v.vy }
  }
  // the violin's beam on the wall of a closed block: time since the last note it counted there, per player
  const beamWall = new Map<string, number>()
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

  // sitting at a fixed instrument: it is what she holds (never in the inventory), until she gets up
  let seated: { seat: Seat; owned: Owned } | null = null
  const held = (): Owned | null => seated?.owned ?? inv[cur] ?? null
  const ownGroup = (item: ItemId) => itemGroup(item, !!items[item]?.instrument)
  const groupOf = (o: Owned) => o.group ?? ownGroup(o.item)
  // an item taken goes to the end of its own group (even one dragged to another group before it was dropped); the
  // Passaguá goes to the first slot of the utilities instead, and stays there unless the player drags it away
  const takeIn = (o: Owned) => { o.group = ownGroup(o.item); return insertSorted(inv, o, groupOf, FIRST_IN_GROUP.has(o.item)) }
  const room = () => inv.length < limit
  // the most of a category a player carries (her class's, from her body each step; none known: only the Pátio's
  // limit), and how many of it a list has (by the item's own category: dragging it to another group does not count)
  const capOf = (b: Body | null | undefined, g: ItemGroup) => { const n = b?.invLimits?.[g]; return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n)) : INVENTORY_MAX }
  const countIn = (list: readonly Owned[], g: ItemGroup) => list.reduce((n, o) => n + (ownGroup(o.item) === g ? 1 : 0), 0)
  // a free slot for a new item: the Pátio's limit and its category's (items already carried past them stay)
  const roomFor = (item: ItemId) => { const g = ownGroup(item); return room() && countIn(inv, g) < capOf(lastBody, g) }
  // grab with no room for it: it takes the place of the held one, unless that would put its category past its limit
  const swapFits = (item: ItemId) => { const h = held(), g = ownGroup(item); return !!h && !h.out && (ownGroup(h.item) === g || countIn(inv, g) < capOf(lastBody, g)) }
  // the slots shown on the bar and the wheel: her items, plus the empty one while there is room
  const shown = (): (Owned | null)[] => room() ? [...inv, null] : inv.slice()
  // the held item leaves (broke, thrown): her hands are empty (the empty slot, at the end)
  const removeHeld = () => { inv.splice(cur, 1); cur = inv.length }
  // the keys (Chave) in her inventory, and using one up (the stack goes when it is the last)
  const keyCount = () => inv.reduce((n, o) => n + (isKey(o.item) ? o.ammo : 0), 0)
  // one less of a stack (a key, a Chave dourada, a Bomba); the last one takes the item away
  const spend = (fits: (item: ItemId) => boolean) => {
    const i = inv.findIndex(o => fits(o.item) && o.ammo > 0)
    if (i < 0) return false
    if (--inv[i].ammo > 0) return true
    if (i === cur) removeHeld(); else { inv.splice(i, 1); if (i < cur) cur-- }
    return true
  }
  const useKey = () => { spend(isKey) }
  // an empty hand: the wing, or Pig's chain (Correntada) and Ken's tail (Rabada)
  const bareDef = (): ItemDef => lastBody?.species === 'pig' ? items.chainBlow : lastBody?.species === 'fox' ? items.tailBlow : items.wing
  // the strong blow charged with an empty hand (Pig, Ken) has no item: this stands in for it
  const BARE: Owned = { item: 'wing', ammo: 0, durability: 0 }
  const def = (): ItemDef => { const h = held(); return h ? items[h.item] : bareDef() }
  // a Gaiola is born empty with its model's limit (cap: this one's own, a rack's or a loose item's)
  const fresh = (item: ItemId, cap?: number): Owned => ({ item, ammo: items[item].consumable ? Math.max(1, Math.min(CONSUMABLE_LIMITS[item] ?? 1, items[item].mag)) : items[item].mag, durability: items[item].durability, ...(items[item].cageSouls > 0 ? { cage: newCage(cageCap(cap, items[item].cageSouls)) } : {}) })

  function addText(x: number, y: number, text: string, color = '#ffffff') { texts.push({ x, y, text, life: 0.9, color }) }
  function burst(x: number, y: number, n: number, color: string, speed = 220, size = 3) {
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(speed * 0.3, speed); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.5), max: 0.5, color, size }) }
  }

  // a button can be pressed: its limit allows it (lib/pigchicken/button-limit.ts), or, without one, 0.3 s after the last press
  const buttonFree = (t: Target) => t.flash <= 0 && (!t.press || canPress(t.press))
  function hitTarget(t: Target, damage: number, pushX: number, x: number, y: number, by: SoulWeapon | null = null) {
    if (t.deadT > 0 || damage <= 0) return
    // a button: any hit presses it
    if (t.kind === 'button') {
      if (!buttonFree(t)) return
      // with a limit: pressed down for a moment, then greyed out for the rest of its gap
      if (t.press) { pressButton(t.press); t.flash = Math.min(0.12, t.press.gap) } else t.flash = 0.3
      pressed.push(t.label ?? ''); burst(x, y, 6, '#7bdff2', 140, 2); sound('button', null)
      return
    }
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
      spawnUndead(t, pushX, by)
    } else if (t.kind === 'zombie') {
      t.state = 'dead'; t.animT = 0; t.deadT = ZOMBIE_TIMES.dead + ZOMBIE_TIMES.fade; kills.zombies++; sound('zombieDie', null)
    }
  }

  // ---------- shock (lib/pigchicken/shock.ts) ----------
  const shockable = (t: Target) => t.deadT <= 0 && t.kind !== 'button' && t.state !== 'converted' && t.state !== 'dead' && (t.shield ?? 0) < 1
  // the state itself: it shakes and blinks, stands still, and loses some of its harmony bar
  function applyShock(t: Target, time: number, power: number, drain: number) {
    t.shock = addShock(t.shock, time, power)
    if (t.kind !== 'dummy') t.stun = Math.max(t.stun ?? 0, time)
    if (drain > 0 && t.harmony) t.harmony = Math.max(0, t.harmony - drain)
    if (t.kind === 'zombie' && (t.state === 'walk' || t.state === 'idle')) { t.state = 'hurt'; t.animT = 0 }
    burst(t.x, t.y - t.h / 2, 5, '#cfe9ff', 180, 2)
  }
  function shockTarget(t: Target, time: number, power: number, drain: number, damage: number) {
    const x = t.x, y = t.y - t.h / 2
    // the owner's enemy: it shakes here at once, and the owner decides the rest
    if (t.mirror && reportHit && t.net !== undefined) {
      t.shock = addShock(t.shock, time, power)
      reportHit({ id: t.net, d: damage, px: 0, x, y, sh: [time, power, drain] })
      return
    }
    if (damage > 0) hitTarget(t, damage, 0, x, y, 'impact')
    if (shockable(t)) applyShock(t, time, power, drain)
  }
  // a blow of a lightning weapon landed on `direct`: they are shocked, and the shock jumps on to the ones around,
  // one after the other. from: where the bolt leaves the weapon; o: the item (the blow may be its special, which
  // then starts counting again)
  function zap(from: { x: number; y: number }, direct: Target[], d: ItemDef, heavy: boolean, o: Owned | null) {
    if (!direct.length) return
    const special = !!o && d.specialCooldown > 0 && d.specialRange > 0 && clock >= (o.specialAt ?? 0)
    const range = special ? d.specialRange : heavy ? d.heavyShockRange : d.shockRange
    if (range <= 0) return
    if (special) o!.specialAt = clock + d.specialCooldown
    const time = special ? d.specialTime : heavy ? d.heavyShockTime : d.shockTime
    const power = special ? SHOCK_POWER.special : heavy ? SHOCK_POWER.heavy : SHOCK_POWER.quick
    const life = special ? BOLT_LIFE_SPECIAL : BOLT_LIFE
    const point = (t: Target) => ({ id: t.id, x: t.x, y: t.y - t.h / 2 })
    const links = shockChain(direct.map(point), targets.filter(t => shockable(t) && !direct.includes(t)).map(point), range, special ? d.specialJumps : d.shockJumps)
    // what the other browsers draw: x1, y1, x2, y2 and the hop of each bolt (-1: the one from the sky)
    const sent: number[] = []
    const bolt = (x1: number, y1: number, x2: number, y2: number, hop: number, sky = false) => {
      bolts.push({ x1, y1, x2, y2, t: -hop * BOLT_HOP, life, seed: Math.random() * 1000, special, sky })
      sent.push(Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2), sky ? -1 : hop)
    }
    const first = point(direct[0])
    direct.forEach(t => { const p = point(t); bolt(from.x, from.y, p.x, p.y, 0); if (shockable(t)) shockTarget(t, time, power, d.shockDrain, special ? d.specialDamage : 0) })
    links.forEach(l => {
      bolt(l.from.x, l.from.y, l.to.x, l.to.y, l.hop)
      const t = targets.find(g => g.id === l.to.id)
      if (t) shockTarget(t, time, power, d.shockDrain, special ? d.specialDamage : d.shockDamage)
    })
    // the special: thunder falls from the sky on the first one hit and lights everything up; lightning glows less
    if (special && d.specialKind === 'thunder') { bolt(first.x + rand(-80, 80), first.y - 1100, first.x, first.y, 0, true); skyFlash = 1 }
    else if (special) skyFlash = 0.45
    sound(special ? d.specialKind : 'zap', null)
    if (netOn) netShots.push({ k: 'z', i: d.id, p: sent, s: special ? 1 : 0 })
  }
  // how many of an item that comes back can be away at once, and one more of them leaving / arriving: her wing is
  // empty only while all of them are away
  const awayMax = (d: ItemDef) => Math.max(1, Math.min(d.deck ? DECK_SIZE : 14, Math.round(d.returnCount)))
  // two of it (the Boomerangs): the first goes from the front wing and the one left is in the back wing, which throws
  // it next; one coming back goes to the front wing
  const leaves = (h: Owned, d: ItemDef) => { h.out = (h.out ?? 0) + 1; h.flying = h.out >= awayMax(d); h.back = h.out === 1 && awayMax(d) === 2 }
  const arrives = (h: Owned) => { h.out = Math.max(0, (h.out ?? 1) - 1); h.flying = false; h.back = false }
  // a staff that comes back (the Martelo de Thor, the Boomerang) leaves her wing: where she aims, further with the charge
  function launch(h: Owned, d: ItemDef, from: { x: number; y: number }, charge: number) {
    const reach = d.returnRange * (d.returnMin + (1 - d.returnMin) * charge)
    const face = Math.cos(aimAngle) >= 0 ? 1 : -1
    flights.push({
      x: from.x, y: from.y, vx: Math.cos(aimAngle) * d.returnSpeed, vy: Math.sin(aimAngle) * d.returnSpeed, angle: aimAngle, spin: face * 24, owned: h, owner: active,
      back: false, left: reach, speed: d.returnSpeed, damage: d.returnDamage * (0.5 + 0.5 * charge), push: d.returnPush, hits: new Set(),
      dir: launchDir(aimAngle, d.returnCurveMin), launch: aimAngle, reach, aim: aimAngle, side: curveSide(aimAngle), bend: curveSide(aimAngle) * Math.max(0, d.returnCurveMin) * DEG,
    })
    leaves(h, d)
    sound('throw', null)
    if (netOn) netShots.push({ k: 'hm', i: h.item, x: Math.round(from.x), y: Math.round(from.y), a: aimAngle, sp: d.returnSpeed, rg: Math.round(reach) })
  }
  // where a staff that comes back would fly if let go now and not steered: as long as the charge reaches, with the
  // least bend of its curve, cut short by walls and the floor (null: the item in her wing is not being charged for that)
  function predictReturn(from: { x: number; y: number }, ctx: StepCtx) {
    const d = def()
    if (!d.returnThrow || d.deck || !heavyItem || heavyItem !== held()) return null
    const charge = Math.min(1, heavyT / Math.max(0.05, d.returnCharge))
    const reach = d.returnRange * (d.returnMin + (1 - d.returnMin) * charge)
    const path = outPath(from.x, from.y, aimAngle, reach, d.returnCurveMin)
    const stop = path.findIndex((p, i) => i > 0 && (p.y >= ctx.groundY || solidAt(ctx.boxes, p.x, p.y)))
    return stop < 0 ? path : path.slice(0, stop + 1)
  }
  // the charge of a staff's Atirar fills in its strong blow's time, or in its throw's when it is one that comes back
  const staffCharge = (d: ItemDef) => Math.max(0.05, d.grapple ? d.hookCharge : d.returnThrow ? d.returnCharge : d.heavyCharge)

  // ---------- Corrente-gancho (lib/pigchicken/grapple.ts) ----------
  // what the hook latches on at (x, y), thrown by `owner`: a live enemy, undead or dummy (a mirror of another
  // browser's, a button or one with a full shield only hold it like a wall), another local player, or the world
  // (the floor, a wall, a platform, an object)
  function hookHitAt(x: number, y: number, owner: string, ctx: StepCtx): HookHit | null {
    for (const t of targets) {
      if (!alive(t) || Math.abs(x - t.x) > t.w / 2 + 6 || y < t.y - t.h - 6 || y > t.y + 6) continue
      if (t.kind === 'button' || t.mirror || (t.shield ?? 0) >= 1) return { kind: 'world' }
      return { kind: 'target', id: t.id }
    }
    for (const a of blastActors) if (a.id && a.id !== owner && x >= a.box.l && x <= a.box.r && y >= a.box.t && y <= a.box.b) return { kind: 'player', id: a.id }
    if (y >= ctx.groundY || solidAt(ctx.boxes, x, y)) return { kind: 'world' }
    return null
  }
  // where the hook would latch if thrown now from `from` (the orange dot): null when the item in her wing is not a
  // Corrente-gancho ready in her hand, or nothing is in its reach
  function predictHook(from: { x: number; y: number }, ctx: StepCtx) {
    const h = held(), d = def()
    if (!h || !d.grapple || h.out || (swing && swing.t < swing.time)) return null
    const c = hookCast(from, aimAngle, d.hookRange, (x, y) => hookHitAt(x, y, active, shotRooms.get(active) ?? ctx))
    return c.hit ? c : null
  }
  // Atirar let go: the hook leaves her hand where she aims, its pull as strong as the chain was spun
  function throwHook(h: Owned, d: ItemDef, from: { x: number; y: number }, charge: number, ctx: StepCtx) {
    const room = shotRooms.get(active)
    hooks.push({
      x: from.x, y: from.y, hx: from.x, hy: from.y, angle: aimAngle, speed: d.hookSpeed, left: d.hookRange, phase: 'out', owned: h, owner: active,
      hit: null, ax: 0, ay: 0, ox: 0, oy: 0, pull: hookPullSpeed(d, charge), damage: d.hookDamage, t: 0, best: Infinity, stall: 0, scale: lastBody?.scale ?? 1, room,
    })
    leaves(h, d)
    sound('throw', null)
    if (netOn) {
      const c = hookCast(from, aimAngle, d.hookRange, (x, y) => hookHitAt(x, y, active, room ?? ctx))
      netShots.push({ k: 'gk', i: h.item, x: Math.round(from.x), y: Math.round(from.y), tx: Math.round(c.x), ty: Math.round(c.y), sp: d.hookSpeed, l: c.hit ? 1 : 0 })
    }
  }
  // the hook latches on what it touched
  function latchHook(k: Hook, hit: HookHit) {
    k.phase = 'pull'; k.t = 0; k.best = Infinity; k.stall = 0; k.hit = hit
    burst(k.x, k.y, 6, '#9d9ca8', 150, 2)
    sound('block', null)
    if (hit.kind === 'world') { k.ax = k.x; k.ay = k.y; return }
    if (hit.kind === 'target') {
      const t = targets.find(o => o.id === hit.id)
      if (!t) { k.phase = 'back'; return }
      k.ox = k.x - t.x; k.oy = k.y - (t.y - t.h / 2)
      hitTarget(t, k.damage, 0, k.x, k.y, 'impact')
      if (!alive(t)) k.phase = 'back'
      return
    }
    const a = actorOf(hit.id)
    if (!a) { k.phase = 'back'; return }
    k.ox = k.x - (a.box.l + a.box.r) / 2; k.oy = k.y - (a.box.t + a.box.b) / 2
  }
  // the pull is over: a pulled player keeps a part of her speed, a pulled target falls from where it is (a zombie or
  // an undead stays there; an alien goes back to its row and a dummy to its post, as after a blast)
  function unhook(k: Hook) {
    if (k.phase !== 'pull' || !k.hit) { k.phase = 'back'; return }
    const hit = k.hit
    if (hit.kind === 'world' || hit.kind === 'player') {
      const a = actorOf(hit.kind === 'world' ? k.owner : hit.id)
      if (a?.v) a.push(-a.v.x * (1 - HOOK_KEEP), -a.v.y * (1 - HOOK_KEEP))
    } else {
      const t = targets.find(o => o.id === hit.id)
      if (t?.blast) { t.blast.vx = 0; t.blast.vy = 0; if (t.kind === 'zombie' || t.kind === 'undead') t.blast.x = 0 }
    }
    k.phase = 'back'; k.t = 0
  }
  // she lets go of her hooks (Atirar pressed again while one is out)
  function releaseHooks(owner: string) { for (const k of hooks) if (!k.remote && k.owner === owner && k.phase !== 'back') unhook(k) }
  // each hook: out until it latches or its reach ends, pulling while latched, then reeling back to her hand
  function stepHooks(frameDt: number, ctx: StepCtx) {
    hooked.clear()
    for (let i = hooks.length - 1; i >= 0; i--) {
      const k = hooks[i], d = items[k.owned.item], dt = frameDt * timeAt(k.x, k.y)
      const hand = k.remote ? k.home! : bodyOf(k.owner) ? hands.get(k.owner) ?? null : null
      // its owner is gone: it falls where it is
      if (!hand) { hooks.splice(i, 1); arrives(k.owned); if (!k.remote && !k.owned.out) pickups.push({ id: nextId++, owned: k.owned, x: k.x, y: k.y, vy: 0, resting: false, noPick: 0.3 }); continue }
      k.hx = hand.x; k.hy = hand.y; k.t += dt
      if (k.phase === 'out') {
        for (let left = k.speed * dt; left > 0 && k.phase === 'out'; left -= HOOK_STEP) {
          const s = Math.min(HOOK_STEP, left, Math.max(0, k.left))
          k.x += Math.cos(k.angle) * s; k.y += Math.sin(k.angle) * s; k.left -= s
          if (k.remote) { if (k.left <= 0) { k.phase = k.latched ? 'pull' : 'back'; k.t = 0 } continue }
          const hit = hookHitAt(k.x, k.y, k.owner, k.room ?? ctx)
          if (hit) latchHook(k, hit)
          else if (k.left <= 0) { k.phase = 'back'; k.t = 0 }
        }
        continue
      }
      if (k.phase === 'pull') {
        // another browser's: it only holds a moment where it latched
        if (k.remote) { if (k.t >= 0.35) { k.phase = 'back'; k.t = 0 } continue }
        const hit = k.hit!
        if (hit.kind === 'world') {
          const me = actorOf(k.owner), her = bodyOf(k.owner)
          if (!me || !her) { k.phase = 'back'; continue }
          // her feet go to the hook: on top of a platform or an object she lands on it; on a wall or a ceiling her body
          // stops against it first and the pull lets go
          const feet = { x: her.x, y: her.y }, to = { x: k.ax, y: k.ay - 4 }
          const r = pullStep(Math.hypot(to.x - feet.x, to.y - feet.y), k.best, k.stall, k.t, dt, HOOK_ARRIVE * her.scale * 0.4, d.hookTime)
          k.best = r.best; k.stall = r.stall
          // (she also is there once she flew and landed at the hook's height or above it)
          if (!her.grounded) k.flew = true
          if (r.done || (her.grounded && k.flew && her.y <= k.ay + 12)) { unhook(k); continue }
          const dv = pullDelta(feet, to, k.pull, me.v ?? { x: her.vx, y: 0 })
          me.push(dv.x, dv.y)
          continue
        }
        if (hit.kind === 'player') {
          const a = actorOf(hit.id)
          if (!a) { k.phase = 'back'; continue }
          const mid = { x: (a.box.l + a.box.r) / 2, y: (a.box.t + a.box.b) / 2 }
          k.x = mid.x + k.ox; k.y = mid.y + k.oy
          const r = pullStep(Math.hypot(hand.x - mid.x, hand.y - mid.y), k.best, k.stall, k.t, dt, HOOK_ARRIVE_TARGET, d.hookTime)
          k.best = r.best; k.stall = r.stall
          if (r.done) { unhook(k); continue }
          const dv = pullDelta(mid, hand, k.pull, a.v ?? { x: 0, y: 0 })
          a.push(dv.x, dv.y)
          continue
        }
        const t = targets.find(o => o.id === hit.id)
        if (!t || !alive(t)) { k.phase = 'back'; k.t = 0; continue }
        const mid = { x: t.x, y: t.y - t.h / 2 }, dist = Math.hypot(hand.x - mid.x, hand.y - mid.y)
        const r = pullStep(dist, k.best, k.stall, k.t, dt, HOOK_ARRIVE_TARGET, d.hookTime)
        k.best = r.best; k.stall = r.stall
        if (r.done) { k.x = mid.x + k.ox; k.y = mid.y + k.oy; unhook(k); continue }
        // it moves on its blast motion, which the pull drives this frame (no fall, no drag)
        const m = t.blast ??= { x: 0, y: 0, vx: 0, vy: 0 }
        const s = Math.min(k.pull * dt, Math.max(0, dist - HOOK_ARRIVE_TARGET * 0.5)), ux = (hand.x - mid.x) / (dist || 1), uy = (hand.y - mid.y) / (dist || 1)
        t.x += ux * s; t.y += uy * s; m.x += ux * s; m.y += uy * s; m.vx = 0; m.vy = 0
        hooked.add(t)
        k.x = t.x + k.ox; k.y = t.y - t.h / 2 + k.oy
        continue
      }
      // back: the chain reels in to her hand
      const dx = hand.x - k.x, dy = hand.y - k.y, dist = Math.hypot(dx, dy), s = d.hookSpeed * HOOK_REEL * dt
      if (dist <= s + 4) { hooks.splice(i, 1); arrives(k.owned); if (!k.remote) sound('catch', null); continue }
      k.x += (dx / dist) * s; k.y += (dy / dist) * s
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

  // a zone with "Dano só no tom" (music.fits): a note outside it glances off grey, with no harmony
  function offKey(t: Target, m: number, x: number, y: number) {
    if (t.dummy || t.kind === 'button' || music.fits(m)) return false
    if (t.flash <= 0) { t.flash = 0.06; burst(x, y, 3, '#8d949c', 110, 2); sound('block', null) }
    return true
  }

  // what the bird it becomes will remember: the instrument and the note that landed last (the ones that fill its bar)
  // (a note sung by a soul flying free leaves no mark: the player's last note still says what the bird is)
  function markSoul(t: Target, note: NoteInfo, by: ItemId | 'rebate' | 'soul' | null) {
    if (by === 'soul' || (t.kind !== 'alien' && t.kind !== 'undead')) return
    const z = music.zone
    t.soul = { ...t.soul, shot: shotClass(by, note.voice), note: noteClass(note.midi, z.root, SCALES[z.scale].steps) }
  }

  // a note lands: it fills the harmony bar instead of hurting; the enemy answers with a note of its own
  // by: the instrument that played it ('rebate': a note sent back by a blow; 'soul': sung by a soul flying free)
  function harmonize(t: Target, amount: number, pushX: number, x: number, y: number, note: NoteInfo, stun: number, by: ItemId | 'rebate' | 'soul' | null = null) {
    if (t.deadT > 0 || t.state === 'converted' || amount <= 0) return
    if (t.kind === 'button') { hitTarget(t, 1, 0, x, y); return }
    if (t.kind === 'undead' && (t.data as UndeadState).bird) return
    if (offKey(t, note.midi, x, y)) return
    if (t.mirror && reportHit && t.net !== undefined) {
      t.flash = 0.12; t.tint = note.color
      texts.push({ x, y: y - 10, text: note.sym, life: 0.8, color: note.color, size: 18 })
      burst(x, y, 4, note.color, 120, 3)
      // the bird this browser will see takes after the last note played to it here
      markSoul(t, note, by)
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
    markSoul(t, note, by)
    t.harmony = (t.harmony ?? 0) + amount; t.flash = 0.12; t.tint = note.color; t.vx += pushX * 0.3
    t.stun = Math.max(t.stun ?? 0, stun)
    if (t.kind === 'zombie' && (t.state === 'walk' || t.state === 'idle') && stun > 0) { t.state = 'hurt'; t.animT = 0 }
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
        bird: type.id, homeX: t.x, homeY: top - 60, whistleIn: whistleTime(type), soul: originOf(soulSpecies(t.data), 'alive', t.soul) })
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
  // damage to this browser's own player (setHurt): a zombie's bite takes ZOMBIE_BITE of its health
  let hurtSelf: ((amount: number, fromX: number) => void) | null = null
  const ZOMBIE_BITE = 15
  // the Filhotes here (lib/chicken/baby.ts): the notes that reach one fill its music bar (not its own notes)
  let babies: { by?: string; box: BlastBox; fill: () => void }[] = []
  const babyAt = (x: number, y: number, r: number, by?: string) => babies.find(b => b.by !== by && x + r > b.box.l && x - r < b.box.r && y + r > b.box.t && y - r < b.box.b)

  // ---------- the undead ----------
  const harmonyNow = () => { const z = music.zone; return { root: z.root, steps: SCALES[z.scale].steps, chord: music.chord(true), spb: music.secondsPerBeat() } }
  const whistleTime = (type: BirdType) => (type.whistle.max > 0 ? rand(type.whistle.min, type.whistle.max) : Infinity)
  function spawnUndead(t: Target, pushX: number, weapon: SoulWeapon | null = null) {
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
      face: t.face, state: 'undead', animT: 0, harmony: 0, soul: { weapon },
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
    throwT: number; throwAngle: number; throwItem: Owned | null; throwVoid: boolean; chargeT: number; prevFire: boolean; fireHeldItem: Owned | null; fireResume: Owned | null; aimAngle: number; pumpT: number; swing: Swing | null; swingCombo: number; swingGap: number; heavyItem: Owned | null; heavyT: number
    beam: { x1: number; y1: number; x2: number; y2: number; midi: number; color: string; target: number | null; bend?: number; vib?: number } | null; beamHeld: Held | null; beamMidi: number; arpStep: number; arpIdle: number; phraseBase: number
    glissNext: number; glissSteps: number; hover: Pickup | null; hoverOwned: Pickup | null; lastBody: Body | null; consumption: Consumption; effects: Effect[]; cages: Owned[]; cageDeny: number; cageArm: number | null
    trem: TremoloState; tremBend: number; tremReach: number | null; aimReach: number; aimKind: AimKind; harp: HarpState; stringAims: (StringAim | null)[] | null; kit: KitState; seated: { seat: Seat; owned: Owned } | null; aimPoint: { x: number; y: number } | null
  }
  const loadouts = new Map<string, Loadout>()
  let active = 'p1'
  // her Gaiolas (lib/pigchicken/cages.ts), at most CAGES_MAX: the first one is in front, where the souls caught go
  // and come out of; each one is a stack (the last soul in is the first one out). cageDeny: s left of the shake of a
  // catch that did not fit anywhere. cageArm: the Gaiola on the floor (its pickup's id) Pegar was pressed on while
  // she had no room for it: letting Pegar go still on it swaps it in
  let cages: Owned[] = []
  let cageDeny = 0
  let cageArm: number | null = null
  // the ground's y, as the last step had it
  let floorY = 0
  // souls on their way to a Gaiola (the world's: each one knows whose it is and which cage keeps its place)
  const abductions: Abduction[] = []
  // the birds a Passaguá without a Gaiola scared off, on their quick flight to somewhere else in sight
  const scares: Scare[] = []
  // the chicks let out of a Gaiola since the screen last asked: each one is a chick again (the Parquinho puts it in
  // the flock); (x, y): where its cage is, in world px
  const chickReleases: { soul: Soul; owner: string; x: number; y: number }[] = []
  const NO_SOULS: Soul[] = []
  // the souls caught from the wild since the screen last asked (not the ones that only changed bags or came back):
  // whoever draws takes them from here to the library (lib/pigchicken/soul-library.ts)
  const soulNews: { soul: Soul; owner: string; x: number; y: number }[] = []
  // the souls out of the bags (the world's: each one knows whose it is), the world's clock for them and when each
  // player last let one out
  const freed: FreeSoul[] = []
  // online (lib/pigchicken/net-souls.ts): the souls the other browsers fly, drawn here; what this browser asks of the
  // others, for the sync to send (pid: the browser that flies the soul; none: the lobby's owner); who asked and
  // where, until the answer comes; the owner's undead birds asked for, hidden meanwhile (s left)
  const soulMirrors: SoulMirror[] = []
  const netTakes: (NetTake & { pid?: number })[] = []
  const asked = new Map<string, { owner: string; x: number; y: number; t: number }>()
  const takenFoes = new Map<number, number>()
  // whether the others can be asked at all (the game server relays it): without it, the owner's undead bird is caught
  // here as it always was
  let netAsks = false
  const lastRelease = new Map<string, number>()
  let soulClock = 0
  // the players in a portal now (the Parquinho says it each frame): their souls flying free go in and out with them
  const soulPortals = new Map<string, SoulPortal>()
  // the walls of the world and the top of the sky the camera shows (the Parquinho keeps it up to date)
  let soulAir: SoulAir | null = null
  const save = (): Loadout => ({
    peck, peckPrep, peckCool, inv: inv.slice(), cur, cooldown, burstLeft, reloadT, bloom, meleeCool, kick, throwT, throwAngle, throwItem, throwVoid, chargeT, prevFire, fireHeldItem, fireResume, aimAngle, pumpT, swing, swingCombo, swingGap, heavyItem, heavyT,
    beam, beamHeld, beamMidi, arpStep, arpIdle, phraseBase, glissNext, glissSteps, hover, hoverOwned, lastBody, consumption, effects, cages, cageDeny, cageArm, trem, tremBend, tremReach, aimReach, aimKind, harp, stringAims, kit, seated, aimPoint,
  })
  const blank = (): Loadout => ({
    peck: null, peckPrep: 0, peckCool: 0, inv: [], cur: 0, cooldown: 0, burstLeft: 0, reloadT: 0, bloom: 0, meleeCool: 0, kick: 0, throwT: 0, throwAngle: 0, throwItem: null, throwVoid: false, chargeT: 0, prevFire: false, fireHeldItem: null, fireResume: null, aimAngle: 0, pumpT: 0, swing: null, swingCombo: 0, swingGap: Infinity, heavyItem: null, heavyT: 0,
    beam: null, beamHeld: null, beamMidi: 0, arpStep: 0, arpIdle: 0, phraseBase: 0, glissNext: 0, glissSteps: 0, hover: null, hoverOwned: null, lastBody: null, consumption: null, effects: [], cages: [], cageDeny: 0, cageArm: null, trem: newTremolo(), tremBend: 0, tremReach: null, aimReach: 1, aimKind: 'none', harp: newHarp(), stringAims: null, kit: newKit(), seated: null, aimPoint: null,
  })
  function useLoadout(id: string) {
    if (id === active) return
    loadouts.set(active, save())
    const l = loadouts.get(id) ?? blank()
    inv.splice(0, inv.length, ...l.inv)
    ;({ peck, peckPrep, peckCool, cur, cooldown, burstLeft, reloadT, bloom, meleeCool, kick, throwT, throwAngle, throwItem, throwVoid, chargeT, prevFire, fireHeldItem, fireResume, aimAngle, pumpT, swing, swingCombo, swingGap, heavyItem, heavyT, beam, beamHeld, beamMidi, arpStep, arpIdle, phraseBase, glissNext, glissSteps, hover, hoverOwned, lastBody, consumption, effects, cages, cageDeny, cageArm, trem, tremBend, tremReach, aimReach, aimKind, harp, stringAims, kit, seated, aimPoint } = l)
    active = id
  }

  // One slot per type; consumables can top up their existing stack.
  // A Gaiola is always offered: it hangs with the others, or takes the place of the one in front.
  // the Filhotes among the local players (lib/chicken/baby.ts): one firearm, one instrument, one utility and one Gaiola
  // at most (a new one of a group takes the place of the one it had, which falls); no staff (Taco, Passaguá, Martelo,
  // Cajado, Boomerang, baralhos): it never hits
  const babyHere = new Set<string>()
  const isBabyNow = () => babyHere.has(active)
  // which of the Filhote's limits are on (Personagem → Filhote; how many of each category: its column's Inventário)
  let babyRules: BabyRules = { ...BABY_RULES }
  const babyRefuses = (item: ItemId) => isBabyNow() && babyRules.noStaffs && !isCage(item) && (isStaff(items[item]) || (ownGroup(item) === 1 && items[item].mag <= 0))
  // a Filhote with its category full: the new one takes the place of the one it had of it, which falls
  const babySwaps = (item: ItemId) => { const g = ownGroup(item); return isBabyNow() && inv.some(o => ownGroup(o.item) === g) && countIn(inv, g) >= capOf(lastBody, g) }
  const canTake = (p: Pickup) => p.noPick <= 0 && !babyRefuses(p.owned.item) && (!!p.owned.cage || !inv.some(o => o.item === p.owned.item) || inv.some(o => o.item === p.owned.item && o.ammo < (CONSUMABLE_LIMITS[o.item] ?? 0)))
  // when the Filhote's piu can sound again
  let piuCool = 0

  // ---------- Gaiolas (lib/pigchicken/cages.ts) ----------
  // the souls on their way to a cage (caught, called back, asked of another browser) keep their place in it
  const reserved = (c: CageState) => { let n = 0; for (const a of abductions) if (a.cage === c) n++; return n }
  // the cage of the active player's a soul caught now goes into: the one in front, or the first one behind it with
  // room, which comes to the front (null: nothing fits)
  function cageForCatch(): CageState | null {
    const i = cageWithRoom(cages, reserved)
    if (i < 0) return null
    if (i > 0) { bringFront(cages, i); sound('equip', cages[0].item) }
    return cages[0].cage!
  }
  // how many more souls this player's cages take, with the ones already on their way
  // (the ones asked of other browsers and not answered yet count too)
  const cageRoomLeft = () => { let n = cages.reduce((m, o) => m + (o.cage ? cageRoom(o.cage, reserved(o.cage)) : 0), 0); asked.forEach(a => { if (a.owner === active) n-- }); return Math.max(0, n) }
  const cagesOf = (id: string): Owned[] => (id === active ? cages : loadouts.get(id)?.cages ?? [])
  // the cage of `owner`'s a soul on its way back takes (the one in front first; no cage comes to the front for it)
  const cageFor = (owner: string): CageState | null => { const list = cagesOf(owner), i = cageWithRoom(list, reserved); return i < 0 ? null : list[i].cage! }
  const denyCatch = () => { if (cageDeny <= 0) sound('locked', null); cageDeny = CAGE_DENY }
  // a Gaiola taken hangs with her others, behind them (the first one is in front). With CAGES_MAX already, a whole
  // press of Pegar on it (swap: pressed and let go while it is the one offered, see the step) puts it in front and
  // the one that was there falls to the floor with its souls; Golpe and Pegar held while passing never swap
  function takeCage(p: Pickup, swap: boolean) {
    const cage = p.owned.cage!
    if (cages.length >= (isBabyNow() && babyRules.oneCage ? 1 : CAGES_MAX)) {
      if (!swap) return false
      const old = cages[0]
      old.cage!.enterT = Infinity
      pickups.push({ id: nextId++, owned: old, x: p.x + (Math.random() < 0.5 ? -30 : 30), y: p.y - 20, vy: -260, resting: false, noPick: 1.2 })
      cages[0] = p.owned
      addText(p.x, p.y - 30, `↔ ${items[p.owned.item].name}`, '#4cc9f0')
    } else {
      cages.push(p.owned)
      addText(p.x, p.y - 30, `+ ${items[p.owned.item].name}`, '#7bdff2')
    }
    cage.enterT = 0
    sound('equip', p.owned.item)
    return true
  }

  // Usar/Pegar equips a new item; Golpe can store it without changing the item she already holds.
  function pickUp(p: Pickup, equip = true) {
    if (!canTake(p)) return false
    if (p.owned.cage) return takeCage(p, equip)
    const stack = inv.find(o => o.item === p.owned.item)
    if (stack) {
      const amount = Math.min(p.owned.ammo, (CONSUMABLE_LIMITS[stack.item] ?? 0) - stack.ammo)
      stack.ammo += amount; p.owned.ammo -= amount
      if (p.owned.ammo > 0) pickups.push(p)
      sound('equip', stack.item)
      addText(p.x, p.y - 30, `+${amount} ${items[stack.item].name}`, '#7bdff2')
      return true
    }
    // a Filhote with its category full: the new one takes the place of the first of it, which falls
    const same = babySwaps(p.owned.item) ? inv.findIndex(o => ownGroup(o.item) === ownGroup(p.owned.item)) : -1
    if (same >= 0) {
      const old = inv[same]
      if (same === cur) stopBeam()
      inv.splice(same, 1)
      if (cur > same || cur >= inv.length + 1) cur = Math.max(0, cur - 1)
      pickups.push({ id: nextId++, owned: old, x: p.x + (Math.random() < 0.5 ? -24 : 24), y: p.y - 20, vy: -260, resting: false, noPick: 1.2 })
    }
    if (!roomFor(p.owned.item)) return false
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
  // a Baú opens: the lid goes up (the world's step eases it), its sound and sparks in its rarity's colour
  function openChestFx(c: Chest) {
    c.open = true; c.t = 0
    const legend = c.params.rarity === 'legendary'
    sound(legend ? 'chestLegend' : 'chest', null)
    burst(c.x, c.y - 50, legend ? 34 : 18, legend ? '#7cc4ff' : '#ffd76a', legend ? 320 : 220, 3)
  }
  // Pegar at a Baú: shut for her (no key, not enough souls in her Gaiolas), it shivers and says why; otherwise
  // it opens (a key is used up) and its items jump out, each line of the loot drawn by its chance
  function openChest(c: Chest) {
    const block = chestBlock(c.params, { keys: keyCount(), souls: cageSouls(cages) })
    const top = c.y - 70
    if (block) {
      c.shake = 0.35
      sound('locked', null)
      addText(c.x, top - 16, block === 'key' ? 'Precisa de uma chave' : `Almas nas gaiolas: ${cageSouls(cages)}/${c.params.souls}`, '#ffb4a8')
      return
    }
    if (c.params.lock === 'key') useKey()
    openChestFx(c)
    if (netOn && chestOpens.length < 16) chestOpens.push(c.id)
    const loot = rollLoot(c.params.loot)
    if (!loot.length) { addText(c.x, top - 16, 'Vazio', '#c9ced6'); return }
    // they jump out of the lid side by side and fall to the floor around it
    loot.forEach((item, i) => {
      const off = (i - (loot.length - 1) / 2) * 30
      pickups.push({ id: nextId++, owned: fresh(item), x: c.x + off, y: top + 10, vy: -rand(420, 560), resting: false, noPick: 0.45 })
    })
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

  // another scale on the held instrument: the reload of its weapon family (a real gun racking a round) and the
  // scale's name over her
  function switchScale(h: Owned, i: number) {
    h.scale = i
    stopBeam()
    const weapon = INSTRUMENT_WEAPON[h.item] ?? null
    sounds.push({ kind: 'scale', item: weapon })
    if (lastBody) addText(lastBody.x, lastBody.y - 120 * lastBody.scale, scaleOf(h, items[h.item]).label, '#ffd166')
  }

  function startReload() {
    const h = held(); if (!h) return
    const d = items[h.item]
    if (d.consumable || d.infiniteAmmo) return
    if (d.mag > 0 && h.ammo < d.mag && reloadT <= 0) { reloadT = d.reloadTime; sound('reload') }
  }

  // one shot: `power` (0..1) scales speed in charge mode; pellets spread evenly across the cone
  // the notes of one shot: the aim picks the note inside the chord (or scale); the arpeggiator, the phrase,
  // the strum and the glissando walk from there
  function shotNotes(d: ItemDef, n: number) {
    const t = tones(d), base = t.note()
    if (n > 1) return Array.from({ length: n }, (_, i) => t.walk(base, Math.floor(n / 2) - i, 'chord'))
    if (d.gliss) return [t.walk(base, glissSteps, d.pitchSet)]
    let off = 0
    const k = arpStep++
    if (d.arp === 'up') off = k % 4
    else if (d.arp === 'down') off = -(k % 4)
    else if (d.arp === 'updown') { const c = k % 6; off = c <= 3 ? c : 6 - c }
    else if (d.arp === 'random') off = Math.floor(rand(-2, 4))
    else if (d.arp === 'phrase' && pizzicato(d)) return [t.walk(base, k % Math.max(2, d.burst), d.pitchSet)]
    else if (d.arp === 'phrase') { if (burstLeft === d.burst || burstLeft <= 0) phraseBase = base; return [t.walk(phraseBase, d.burst - Math.max(1, burstLeft), d.pitchSet)] }
    return [t.walk(base, off, d.arp === 'off' ? d.pitchSet : 'chord')]
  }

  // ---------- fixed instruments (lib/pigchicken/fixed-instruments.ts) ----------
  // she sits at it: whatever she was doing with her item stops, and the instrument is what she holds
  function sit(seat: Seat) {
    if (seated || seat.by !== null || seat.net) return
    stopBeam(); peck = null; peckPrep = 0; swing = null; heavyItem = null; heavyT = 0
    reloadT = 0; burstLeft = 0; chargeT = 0; pumpT = 0; throwT = 0; throwItem = null
    const item = FIXED_INSTRUMENTS[seat.kind].item
    seated = { seat, owned: { item, ammo: 0, durability: items[item].durability } }
    seat.by = active
    harp = newHarp()
    kit = newKit()
    sound('equip', item)
  }
  // she gets up (Pegar, Pular, a blast, being dragged, a portal, the editor, the instrument gone): her own item again
  function standUp() {
    if (!seated) return
    if (seated.seat.by === active) seated.seat.by = null
    seated = null
    harp.hands.forEach(h => { h.on = -1 })
    harp.late = []
    stringAims = null
    kit.hat?.stop(0.05)
    kit = newKit()
  }

  // ---------- Bateria: the kit (lib/pigchicken/drum-kit.ts) ----------
  // one hit: its sound, the piece's pulse on the chart and (a roll's strokes aside) its batida flying off toward
  // where the piece sits around her
  function drumHit(h: Owned, d: ItemDef, hit: DrumHit, muzzle: { x: number; y: number }, bonus: number) {
    // between the pieces: only a little noise of the hardware, and its mark where it landed (no piece, no batida)
    if (hit.knock) {
      if (out.knock) out.knock(hit.knock, hit.vel); else out.drum('wood', 0, hit.vel)
      kit.knocks.push({ x: hit.x, y: hit.y, at: kit.t })
      if (kit.knocks.length > 8) kit.knocks.shift()
      return
    }
    const open = hit.piece === 'hat' && hit.open !== undefined, piece: DrumPiece = open ? 'hatOpen' : hit.piece
    const info = drumPiece(piece), vel = Math.max(0.05, Math.min(1, hit.vel))
    // (a Chimbal hit, open or closed, stops the open one still ringing)
    if (hit.piece === 'hat') { kit.hat?.stop(0.02); kit.hat = null }
    const sound = out.kit ? out.kit(piece, 0, vel, open ? hit.open : undefined, hit.roll) : (out.note('kit', info.gm, 0, d.noteLen, vel), null)
    if (open && sound) { kit.hat = sound; sound.setVolume?.(hatRing(hit.open!)) }
    kit.struck.set(hit.piece, { at: kit.t, vel })
    if (hit.roll) return
    const at = padOf(drumKit(), hit.piece), angle = at ? Math.atan2(at.y, at.x) : aimAngle
    const b: Bullet = {
      x: muzzle.x, y: muzzle.y, vx: Math.cos(angle) * d.speed, vy: Math.sin(angle) * d.speed, dist: 0, damage: d.damage * bonus * (0.4 + 0.6 * vel), pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
      item: h.item, t: 0, explode: d.explodeRadius, explodeDamage: d.explodeDamage * bonus, explodePush: d.explodePush, fuse: d.fuse, bounce: d.bounce,
      note: { midi: info.gm, color: info.color, sym: info.cymbal ? '✶' : '●', wave: d.wave, phase: rand(0, Math.PI * 2), voice: 'kit' }, ring: d.ringNotes, ghost: true,
    }
    b.by = active
    bullets.push(b)
    if (netOn) netShots.push(shotOf(b))
    burst(muzzle.x, muzzle.y, 2, info.color, 110, 3)
  }
  // one frame of the kit: what the page read (the sticks, the clicks, each piece's shortcuts) becomes hits; the
  // Chimbal's pedal damps the open one as it closes and stops it when it shuts
  function stepKit(h: Owned, d: ItemDef, muzzle: { x: number; y: number }, dt: number) {
    kit.t += dt
    const r = stepDrums(kit.st, drumKit(), kit.input ?? { sticks: [], taps: [], binds: {} }, dt)
    if (kit.input) kit.input = { ...kit.input, taps: [] }
    if (r.hits.length) {
      let bonus = 1
      if (music.offBeat() < 0.07) {
        bonus = d.beatBonus
        if (bonusTextT <= 0 && bonus > 1) { texts.push({ x: muzzle.x, y: muzzle.y - 40, text: 'no tempo!', life: 0.7, color: '#ffd166', size: 12 }); bonusTextT = 0.6 }
      }
      r.hits.forEach(hit => drumHit(h, d, hit, muzzle, bonus))
    }
    if (kit.hat) {
      if (r.choke) { kit.hat.stop(0.03); kit.hat = null }
      else kit.hat.setVolume?.(hatRing(r.open))
    }
  }

  // ---------- the Filhote's piu ----------
  // a peep of the bird voice on a note of the chord (higher aiming up), and that note flying off a little way: it
  // gives a little harmony to what it reaches and fills the music bar of another Filhote
  function piu(at: { x: number; y: number }, angle: number) {
    const d = items.piu
    const midi = music.noteFor(angle, 'chord', d.octave, d.span)
    out.note(d.voice, midi, 0, d.noteLen, 0.55)
    const color = DEGREE_COLORS[music.degreeOf(midi) % DEGREE_COLORS.length]
    const b: Bullet = {
      x: at.x, y: at.y, vx: Math.cos(angle) * d.speed, vy: Math.sin(angle) * d.speed, dist: 0, damage: d.damage, pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
      item: 'piu', t: 0, explode: 0, explodeDamage: 0, explodePush: 0, fuse: 0, bounce: 0,
      note: { midi, color, sym: NOTE_SYMBOLS[0], wave: d.wave, phase: rand(0, Math.PI * 2), voice: d.voice }, ring: 0, ghost: true,
    }
    b.by = active
    bullets.push(b)
    if (netOn) netShots.push(shotOf(b))
    burst(at.x, at.y, 3, color, 90, 2)
  }

  // ---------- Cordas soltas: the strings (lib/pigchicken/strings-play.ts) ----------
  // plucks string `index` at `r` along the radius, `at` s from now: its note sounds from nothing (whatever that
  // string was sounding stops and its note in flight goes away) and flies off along the string
  function pluckString(h: Owned, d: ItemDef, index: number, r: number, at: number, muzzle: { x: number; y: number }, bonus: number) {
    const sc = STRINGS_SCALE, sh = sc.shape
    const str = sc.layout(music, { octave: d.octave })[index]
    if (!str) return
    const zone = sc.touch(str.angle, r).zone
    const from = zone === 'flat' ? -1 : zone === 'sharp' ? 1 : 0, base = str.midi + (zone === 'harmonic' ? stringShift(zone) : 0)
    const old = harp.notes.get(index)
    if (old) {
      old.held?.stop(0.04)
      if (old.bullet) { const i = bullets.indexOf(old.bullet); if (i >= 0) bullets.splice(i, 1) }
    }
    const midi = base + from + detuneNow(), voice: VoiceId = zone === 'harmonic' ? 'harpHarmonic' : d.voice
    const vel = 0.75 * aimVolume(d.volMin, d.volMax, stringAlong(r, sh.stringStart, sh.stringEnd))
    let sound: Held | null = null
    if (out.pluck) sound = out.pluck(voice, midi, at, d.noteLen, vel, vibOf(d))
    else out.note(voice, midi, at, d.noteLen, vel, undefined, vibOf(d))
    const color = DEGREE_COLORS[music.degreeOf(midi) % DEGREE_COLORS.length]
    const way = assistAim(d, muzzle, d.speed, str.angle, r).angle
    const b: Bullet = {
      x: muzzle.x, y: muzzle.y, vx: Math.cos(way) * d.speed, vy: Math.sin(way) * d.speed, dist: 0, damage: d.damage * bonus, pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
      item: h.item, t: 0, explode: d.explodeRadius, explodeDamage: d.explodeDamage * bonus, explodePush: d.explodePush, fuse: d.fuse, bounce: d.bounce,
      note: { midi, color, sym: NOTE_SYMBOLS[index % NOTE_SYMBOLS.length], wave: d.wave, phase: rand(0, Math.PI * 2), voice }, ring: d.ringNotes, ghost: true,
    }
    b.by = active
    bullets.push(b)
    if (netOn) netShots.push(shotOf(b))
    burst(muzzle.x, muzzle.y, 3, color, 110, 3)
    harp.notes.set(index, { held: sound, bullet: b, base, from, r0: r, bend: 0 })
    harp.plucked.set(index, harp.t + at)
  }
  // one frame of the strings, for each hand: the press plucks the string under it, the hand dragged with Atirar held
  // plucks every string it goes into, and moving along the string just plucked slides its note (the glissando).
  // The back hand goes first: pressed together, the front hand's string sounds "Atraso entre as mãos" later; the
  // two on the same string pluck it once
  function stepStrings(h: Owned, d: ItemDef, input: FrameInput, muzzle: { x: number; y: number }) {
    const sc = STRINGS_SCALE, sh = sc.shape, aims = handAims()
    // the plucks whose time has come
    if (harp.late.length) {
      const due = harp.late.filter(l => l.due <= harp.t + 1 / 60)
      if (due.length) {
        harp.late = harp.late.filter(l => !due.includes(l))
        due.forEach(l => pluckString(h, d, l.index, l.r, Math.max(0, l.due - harp.t), muzzle, l.bonus))
      }
    }
    const done = new Set<number>()
    let backPressed = false
    for (const k of [1, 0]) {
      const hand = harp.hands[k], aim = aims[k] ?? null
      if (!aim) { hand.on = -1; continue }
      const fire = aim.fire ?? input.fire, pressed = aim.pressed ?? input.firePressed
      const r = stringReachOf(aim.kind, aim.reach, aim.sharp), was = hand.on
      const plucks = stepStringHand(hand, sc.stringAt(aim.angle), fire, pressed, sc.count).filter(i => !done.has(i))
      if (plucks.length) {
        let bonus = 1
        if (music.offBeat() < 0.07) {
          bonus = d.beatBonus
          if (bonusTextT <= 0 && bonus > 1) { texts.push({ x: muzzle.x, y: muzzle.y - 40, text: 'no tempo!', life: 0.7, color: '#ffd166', size: 12 }); bonusTextT = 0.6 }
        }
        // only the press waits for the grid (a sweep keeps the hand's own time)
        const g = music.toGrid(), grid = pressed && d.quantize && quantizeAll && g * 1000 <= d.quantWindow ? g : 0
        const wait = pressed && k === 0 && backPressed ? d.handDelay * music.secondsPerBeat() : 0
        plucks.forEach((index, n) => {
          done.add(index)
          const at = grid + wait + n * SWEEP_GAP
          // (a pluck far ahead waits here, so the note it cuts and the one that flies keep its time)
          if (at > 0.05) harp.late.push({ index, r, due: harp.t + at, bonus })
          else pluckString(h, d, index, r, at, muzzle, bonus)
        })
        if (pressed && k === 1) backPressed = true
      } else if (fire && hand.on >= 0 && hand.on === was && !(k === 0 && harp.hands[1].on === hand.on) && !harp.late.some(l => l.index === hand.on)) {
        // the glissando ("Tremolo: reage a" the movement along the string gives its amount and limit; otherwise whole)
        const n = harp.notes.get(hand.on)
        if (n?.held) {
          const along = d.tremoloAxis === 'along'
          const slide = stringSlide(n.from, n.r0, r, sh.stringStart, sh.stringEnd) - n.from
          const bend = along ? Math.max(-d.tremoloRange, Math.min(d.tremoloRange, slide * d.tremolo)) : slide
          if (Math.abs(bend - n.bend) > 0.003) { n.bend = bend; n.held.setPitch(n.base + n.from + bend + detuneNow()) }
        }
      }
    }
  }

  function shoot(muzzle: { x: number; y: number }, spreadDeg: number, onRecoil: (vx: number, vy: number) => void, power = 1, ctx?: StepCtx) {
    const h = held()!, d = items[h.item]
    const mx = muzzle.x, my = muzzle.y
    const n = Math.max(1, Math.round(d.pellets))
    // instruments: the sound waits for the next sixteenth (within the window), and a shot on the beat converts more
    let notes: number[] = [], at = 0, bonus = 1
    // the violin's pizzicato: plucked notes at the arpeggio's speed, each one a slice of the bow's seconds and of
    // its harmony per second
    const pz = pizzicato(d), pzRate = Math.max(1, d.arpRate)
    // the Hangdrum's aim between its notes: the hit is a percussive slap (its voice), ringing the nearest note
    const voice: VoiceId = pz ? 'pizz' : d.instrument && tones(d).slap() ? 'hangSlap' : d.voice
    if (d.instrument) {
      notes = shotNotes(d, n)
      const g = music.toGrid()
      at = d.quantize && quantizeAll && g * 1000 <= d.quantWindow ? g : 0
      if (music.offBeat() < 0.07) {
        bonus = d.beatBonus
        if (bonusTextT <= 0 && bonus > 1) { texts.push({ x: mx, y: my - 40, text: 'no tempo!', life: 0.7, color: '#ffd166', size: 12 }); bonusTextT = 0.6 }
      }
      notes.forEach((m, i) => out.note(voice, m + tremBend + detuneNow(), at + i * d.strum, pz ? Math.min(d.noteLen, 0.15) : d.noteLen, 0.75 * noteVol(d), undefined, vibOf(d)))
    }
    const speed = d.speed * power
    const aim = assistAim(d, muzzle, speed)
    const damage = pz ? d.damage / pzRate : d.explodeRadius > 0 ? d.damage : d.damage * (d.fireMode === 'charge' ? 0.3 + 0.7 * power : 1)
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? rand(-0.5, 0.5) : i / (n - 1) - 0.5 + rand(-0.3, 0.3) / n
      const a = aim.angle + u * spreadDeg * (1 - aim.p) * DEG
      const b: Bullet = {
        x: mx, y: my, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dist: 0, damage: damage * bonus, pierce: d.pierce, hits: new Set(), size: d.size, drop: d.drop, range: d.range,
        item: h.item, t: 0, explode: d.explodeRadius, explodeDamage: d.explodeDamage * bonus, explodePush: d.explodePush, fuse: d.fuse, bounce: d.bounce,
        room: shotRooms.get(active),
      }
      if (d.instrument) {
        const m = notes[Math.min(notes.length - 1, n === 1 ? 0 : n - 1 - i)]
        // (a soul singing out of tune near her: the note itself goes off, not only its sound)
        b.note = { midi: m + detuneNow(), color: tones(d).color(m), sym: NOTE_SYMBOLS[(m + i) % NOTE_SYMBOLS.length], wave: d.wave, phase: rand(0, Math.PI * 2), voice }
        b.ring = d.ringNotes; b.ghost = true
      }
      b.by = active
      // instant shots travel their whole way now and leave a tracer
      if (d.hitscan && ctx) {
        // (a line per stretch: a note that bounces off a wall draws its way, not a line straight to where it ended)
        let guard = 0, sx = mx, sy = my, dirX = Math.sign(b.vx), dirY = Math.sign(b.vy)
        const line = (x2: number, y2: number) => {
          tracers.push({ x1: sx, y1: sy, x2, y2, life: 0.12 })
          if (netOn) netShots.push({ k: 't', i: b.item, x1: sx, y1: sy, x2, y2 })
          sx = x2; sy = y2
        }
        while (!stepBullet(b, 1 / 240, ctx) && guard++ < 2000) {
          if (Math.sign(b.vx) !== dirX || Math.sign(b.vy) !== dirY) { line(b.x, b.y); dirX = Math.sign(b.vx); dirY = Math.sign(b.vy) }
        }
        line(b.x, b.y)
      } else {
        bullets.push(b)
        if (netOn) netShots.push(shotOf(b))
      }
    }
    if (d.instrument) burst(mx, my, 2 + n, tones(d).color(notes[0]), 110, 3)
    else { burst(mx, my, 3 + n, '#fff3b0', 140, 2); sound('shot', h.item) }
    if (d.shellReload && h.ammo > 1) pumpT = Math.min(0.3, 0.6 / d.rate)
    if (d.infiniteAmmo) { /* the Granada: never runs out */ } else if (pz) h.ammo = Math.max(0, h.ammo - d.rate / pzRate); else h.ammo--
    if (h.refill) h.refill = 0; bloom = Math.min(d.spreadMax, bloom + d.spreadShot); cooldown = 1 / (pz ? pzRate : d.rate); kick = d.recoilKick
    onRecoil(-Math.cos(aimAngle) * d.recoilPush, -Math.sin(aimAngle) * d.recoilPush)
    if (h.ammo <= 0 && d.autoReload) startReload()
  }

  // a bullet as it goes to the other browsers
  const shotOf = (b: Bullet): NetShot => ({
    k: 'b', i: b.item, x: b.x, y: b.y, vx: b.vx, vy: b.vy, sz: b.size, dr: b.drop, rg: b.range, fu: b.fuse, bo: b.bounce, ex: b.explode, ep: b.explodePush, pi: b.pierce,
    ...(b.note ? { n: { m: b.note.midi, c: b.note.color, s: b.note.sym, w: b.note.wave, v: b.note.voice } } : {}), ...(b.ring ? { rn: b.ring } : {}), ...(b.ghost ? { gh: true } : {}),
  })
  // another browser's shots: they fly here too, only to be seen (and heard when they are in this scene)
  // roomAt: the room a shot of that browser begins in ('hidden': a house closed on this screen, nothing shows)
  function addRemoteShots(list: readonly NetShot[], roomAt?: (x: number, y: number) => ShotRoom | 'hidden' | null) {
    let heard = 0
    for (const s of list) {
      const d = items[s.i]
      if (!d) continue
      const x = s.k === 't' ? s.x1 : s.k === 'z' ? s.p[0] ?? 0 : s.k === 'cb' ? 0 : s.x
      const where = s.k === 'cb' ? null : roomAt?.(x, s.k === 't' ? s.y1 : s.k === 'z' ? s.p[1] ?? 0 : s.y) ?? null
      if (where === 'hidden') continue
      const room = where ?? undefined
      const near = x > view.l - 200 && x < view.r + 200
      if (s.k === 'z') {
        // another browser's shock: its bolts (and the light of its special), only to be seen
        const special = !!s.s
        for (let n = 0; n + 4 < s.p.length; n += 5) bolts.push({ x1: s.p[n], y1: s.p[n + 1], x2: s.p[n + 2], y2: s.p[n + 3], t: -Math.max(0, s.p[n + 4]) * BOLT_HOP, life: special ? BOLT_LIFE_SPECIAL : BOLT_LIFE, seed: Math.random() * 1000, special, sky: s.p[n + 4] < 0 })
        if (special && near) skyFlash = Math.max(skyFlash, d.specialKind === 'thunder' ? 1 : 0.45)
        if (near && heard++ < 4) sounds.push({ kind: special ? d.specialKind : 'zap', item: null })
        continue
      }
      if (s.k === 'cd') {
        // another browser's card: it flies to its place and floats there, only to be seen
        cards.push({ id: nextId++, rank: s.r, x: s.x, y: s.y, tx: s.tx, ty: s.ty, phase: 'out', t: 0, seed: Math.random(), speed: s.sp, angle: Math.atan2(s.ty - s.y, s.tx - s.x), item: s.i, owned: fresh(s.i), owner: '', remote: true, net: s.c, home: { x: s.x, y: s.y }, ...(s.col ? { note: { midi: 60, color: s.col, sym: NOTE_SYMBOLS[s.r % NOTE_SYMBOLS.length], wave: 0, phase: 0, voice: d.voice } } : {}) })
        if (near && heard++ < 4) sounds.push({ kind: 'throw', item: null })
        continue
      }
      if (s.k === 'cb') { const c = cards.find(o => o.remote && o.net === s.c); if (c) { c.phase = 'back'; c.t = 0 } continue }
      if (s.k === 'cx') {
        // it burst over there: it is gone here, with its burst (which pushes the players here and sets off the
        // cards of this browser it reaches); the damage is the other browser's
        const at = cards.findIndex(o => o.remote && o.net === s.c)
        if (at >= 0) cards.splice(at, 1)
        blastPush(s.x, s.y, s.rd, d.explodePush, d.explodeDamage)
        booms.push({ x: s.x, y: s.y, r: s.rd, life: s.n ? 0.5 : 0.35, ...(s.n ? { color: s.n.c } : {}) })
        burst(s.x, s.y, 16, s.n ? s.n.c : '#ff6b5b', 300, 3)
        if (near && heard++ < 4) { if (s.n) out.note(s.n.v as VoiceId, s.n.m, 0, d.noteLen, 0.4); else sounds.push({ kind: 'explode', item: null }) }
        chainCards(s.x, s.y, s.rd)
        continue
      }
      if (s.k === 'gk') {
        const dx = s.tx - s.x, dy = s.ty - s.y
        hooks.push({
          x: s.x, y: s.y, hx: s.x, hy: s.y, angle: Math.atan2(dy, dx), speed: s.sp, left: Math.hypot(dx, dy), phase: 'out', owned: fresh(s.i), owner: '',
          hit: null, ax: s.tx, ay: s.ty, ox: 0, oy: 0, pull: 0, damage: 0, t: 0, best: Infinity, stall: 0, scale: 1, remote: true, latched: s.l === 1, home: { x: s.x, y: s.y },
        })
        if (near && heard++ < 4) sounds.push({ kind: 'throw', item: null })
        continue
      }
      if (s.k === 'hm') {
        flights.push({ x: s.x, y: s.y, vx: Math.cos(s.a) * s.sp, vy: Math.sin(s.a) * s.sp, angle: s.a, spin: (Math.cos(s.a) >= 0 ? 1 : -1) * 24, owned: fresh(s.i), owner: '', back: false, left: s.rg, speed: s.sp, damage: 0, push: 0, hits: new Set(), remote: true, home: { x: s.x, y: s.y }, dir: launchDir(s.a, items[s.i].returnCurveMin), launch: s.a, reach: s.rg, side: curveSide(s.a), bend: curveSide(s.a) * Math.max(0, items[s.i].returnCurveMin) * DEG })
        if (near && heard++ < 4) sounds.push({ kind: 'throw', item: null })
        continue
      }
      if (s.k === 't') { tracers.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, life: 0.12 }); burst(s.x2, s.y2, 4, '#fff3b0', 120, 2) }
      else if (s.k === 'th') {
        thrown.push({ x: s.x, y: s.y, vx: s.vx, vy: s.vy, spin: s.sp, angle: s.a, owned: fresh(s.i), damage: 0, hit: false, remote: true, room })
      } else {
        const note = s.n ? { midi: s.n.m, color: s.n.c, sym: s.n.s, wave: s.n.w, phase: rand(0, Math.PI * 2), voice: s.n.v as VoiceId } : undefined
        bullets.push({
          x: s.x, y: s.y, vx: s.vx, vy: s.vy, dist: 0, damage: 0, pierce: s.pi, hits: new Set(), size: s.sz, drop: s.dr, range: s.rg, item: s.i, t: 0,
          explode: s.ex, explodeDamage: 0, explodePush: s.ep, fuse: s.fu, bounce: s.bo, note, ring: s.rn, ghost: s.gh, remote: true, room,
        })
        // its note, softer than one's own
        if (note && near && heard < 4) out.note(note.voice, note.midi, 0, d.noteLen, 0.4)
      }
      if (near && heard++ < 4 && !d.instrument && s.i !== 'piu') sounds.push({ kind: s.k === 'th' ? 'throw' : 'shot', item: s.k === 'th' ? null : s.i })
    }
  }

  // a burst pushes away whoever is in its radius: the players (the one who made it too) and the enemies.
  // damage: the burst's at its centre; a player takes it fading to the edge like the push (it only counts for
  // falling off a grab)
  function blastPush(x: number, y: number, r: number, strength: number, damage: number, housed = false) {
    blastActors.forEach(actor => {
      const push = explosionImpulse(x, y, r, strength, actor.box)
      if (push) actor.push(push.x, push.y, damage * Math.hypot(push.x, push.y) / strength)
    })
    // inside a house the blast stays in the room: the enemies are all outside
    if (!housed) targets.forEach(t => {
      if (t.kind === 'button' || t.deadT > 0 || (t.mirror && reportHit)) return
      const push = explosionImpulse(x, y, r, strength, { l: t.x - t.w / 2, r: t.x + t.w / 2, t: t.y - t.h, b: t.y })
      if (!push) return
      const m = t.blast ??= { x: 0, y: 0, vx: 0, vy: 0 }
      m.vx += push.x; m.vy += push.y
    })
  }
  function explode(x: number, y: number, r: number, damage: number, b?: Bullet) {
    // (another browser's shot carries no damage here: its item's stands for it)
    blastPush(x, y, r, b ? b.explodePush ?? items[b.item].explodePush : 0, b?.remote ? items[b.item].explodeDamage : damage, !!b?.room)
    if (b?.note) { musicBurst(x, y, r, damage, b); return }
    booms.push({ x, y, r, life: 0.35 })
    sound('explode', null)
    burst(x, y, 26, '#ffb347', 380, 4); burst(x, y, 14, '#fff3b0', 220, 3)
    if (b?.remote || b?.room) return
    if (!mineQuiet) mine?.blast(x, y, r, damage, b?.by ?? active)
    targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = Math.max(t.x - t.w / 2, Math.min(x, t.x + t.w / 2)), cy = Math.max(t.y - t.h, Math.min(y, t.y))
      const dist = Math.hypot(cx - x, cy - y)
      if (dist > r) return
      hitTarget(t, damage * (1 - dist / r), 0, cx, cy, 'blast')
    })
  }

  // an instrument bursting: the chord rings out, everything around takes harmony and a push, and notes fly out in a circle
  function musicBurst(x: number, y: number, r: number, amount: number, b: Bullet) {
    const note = b.note!
    booms.push({ x, y, r, life: 0.5, color: note.color })
    const chord = music.chord(true).map(m => m + 12 * Math.round((note.midi - 60) / 12))
    if (b.item === 'tambourine') out.drum('jingle', 0)
    chord.forEach((m, i) => out.note(note.voice, m, i * 0.03, 0.5, b.remote ? 0.35 : 0.6))
    if (!b.remote && !b.room) targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = Math.max(t.x - t.w / 2, Math.min(x, t.x + t.w / 2)), cy = Math.max(t.y - t.h, Math.min(y, t.y))
      const dist = Math.hypot(cx - x, cy - y)
      if (dist > r) return
      harmonize(t, amount * (1 - 0.5 * dist / r), 0, cx, cy, note, items[b.item].stun, b.item)
    })
    const n = Math.round(b.ring ?? 0)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, m = chord[i % chord.length] + (i >= chord.length ? 12 : 0)
      bullets.push({
        x, y: y - 6, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dist: 0, damage: Math.max(5, amount * 0.35), pierce: 0, hits: new Set(), size: 9, drop: 0, range: r * 1.6,
        item: b.item, t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0,
        note: { midi: m, color: DEGREE_COLORS[music.degreeOf(m) % DEGREE_COLORS.length], sym: NOTE_SYMBOLS[i % 4], wave: 3, phase: rand(0, 6), voice: note.voice }, ring: 0, ghost: true, remote: b.remote, by: b.by, room: b.room,
      })
    }
  }

  // ---------- the decks of cards (lib/pigchicken/cards.ts) ----------
  // Atirar with a deck: its next card still in it flies to the reticle (no further than the deck reaches) and stays
  // there. A music deck's card keeps the note of the scale she aims at, to play when it bursts
  // the card a deck throws next (null: as many as it may have away already are)
  function deckNext(h: Owned, d: ItemDef) {
    const away = cards.filter(c => c.owned === h).map(c => c.rank)
    return away.length >= awayMax(d) ? null : nextCard(h.next ?? 0, away)
  }
  function throwCard(h: Owned, d: ItemDef, from: { x: number; y: number }) {
    const rank = deckNext(h, d)
    if (rank === null) return false
    const angle = aimPoint ? Math.atan2(aimPoint.y - from.y, aimPoint.x - from.x) : aimAngle
    const to = cardSpot(from.x, from.y, angle, aimPoint ? Math.hypot(aimPoint.x - from.x, aimPoint.y - from.y) : d.returnRange * aimReach, d.returnRange)
    let note: NoteInfo | undefined
    if (d.instrument) {
      const t = tones(d), m = t.note()
      note = { midi: m + detuneNow(), color: t.color(m), sym: NOTE_SYMBOLS[rank % NOTE_SYMBOLS.length], wave: 0, phase: 0, voice: d.voice }
    }
    const c: Card = { id: nextId++, rank, x: from.x, y: from.y, tx: to.x, ty: to.y, phase: 'out', t: 0, seed: Math.random(), speed: d.returnSpeed, angle, item: h.item, owned: h, owner: active, note, net: Math.floor(Math.random() * 190000) }
    cards.push(c)
    h.next = (rank + 1) % DECK_SIZE
    leaves(h, d)
    sound('throw', null)
    if (netOn) netShots.push({ k: 'cd', i: h.item, c: c.net, r: rank, x: Math.round(from.x), y: Math.round(from.y), tx: Math.round(to.x), ty: Math.round(to.y), sp: d.returnSpeed, ...(note ? { col: note.color } : {}) })
    return true
  }
  // who makes a card burst by touching it: the enemies still standing and the training dummies (a broken one only
  // for a music card, which mends it), the other players (never the one who threw it, nor the chicks) and, online,
  // the other browsers' chickens
  function cardTouched(c: Card, touch: number) {
    for (const g of targets) {
      if (!alive(g) || g.kind === 'button' || (g.shield ?? 0) >= 1 || (g.kind === 'undead' && (g.data as UndeadState).bird) || (g.dummy && g.hp <= 0 && !c.note)) continue
      if (cardTouches(c.x, c.y, touch, { l: g.x - g.w / 2, r: g.x + g.w / 2, t: g.y - g.h, b: g.y })) return true
    }
    for (const a of blastActors) if (a.id && a.id !== c.owner && cardTouches(c.x, c.y, touch, a.box)) return true
    for (const b of netBodies) if (cardTouches(c.x, c.y, touch, { l: b.x - 45, r: b.x + 45, t: b.y - 200, b: b.y })) return true
    return false
  }
  // a burst reaches the cards floating around it: each one bursts too, a moment later (a chain goes off in a row)
  const chainCards = (x: number, y: number, r: number) => {
    for (const o of burstReaches(cards, x, y, r, CARD_HALF)) if (!o.remote && o.fuse === undefined) o.fuse = CHAIN_DELAY
  }
  // a card bursts: it is gone from the world and back in its deck; whoever is in the burst's radius is pushed and
  // takes its damage, or its harmony in the note the card kept (a music deck). The 7 and the Ás burst wider
  function burstCard(c: Card) {
    const d = items[c.item], at = cards.indexOf(c)
    if (at >= 0) cards.splice(at, 1)
    arrives(c.owned)
    const r = Math.max(10, d.explodeRadius) * (burstsAlone(c.rank) ? Math.max(1, d.deckBig) : 1)
    blastPush(c.x, c.y, r, d.explodePush, d.explodeDamage)
    const reach = (hit: (t: Target, cx: number, cy: number, dist: number) => void) => targets.forEach(t => {
      if (t.deadT > 0) return
      const cx = Math.max(t.x - t.w / 2, Math.min(c.x, t.x + t.w / 2)), cy = Math.max(t.y - t.h, Math.min(c.y, t.y))
      const dist = Math.hypot(cx - c.x, cy - c.y)
      if (dist <= r) hit(t, cx, cy, dist)
    })
    const note = c.note
    if (note) {
      booms.push({ x: c.x, y: c.y, r, life: 0.5, color: note.color })
      out.note(note.voice, note.midi, 0, d.noteLen, 0.7, undefined, vibOf(d))
      burst(c.x, c.y, 14, note.color, 260, 3)
      reach((t, cx, cy, dist) => harmonize(t, d.explodeDamage * (1 - 0.5 * dist / r), 0, cx, cy, note, d.stun, c.item))
    } else {
      booms.push({ x: c.x, y: c.y, r, life: 0.35 })
      sound('explode', null)
      burst(c.x, c.y, 20, '#ff6b5b', 340, 4); burst(c.x, c.y, 10, '#fff3b0', 200, 3)
      reach((t, cx, cy, dist) => hitTarget(t, d.explodeDamage * (1 - dist / r), 0, cx, cy, 'blast'))
    }
    chainCards(c.x, c.y, r)
    if (netOn) netShots.push({ k: 'cx', i: c.item, c: c.net, x: Math.round(c.x), y: Math.round(c.y), rd: Math.round(r), ...(note ? { n: { m: note.midi, c: note.color, v: note.voice } } : {}) })
  }
  // a card is gone without bursting (its owner left the game): a little cloud where it was
  function dropCard(c: Card) {
    const at = cards.indexOf(c)
    if (at >= 0) cards.splice(at, 1)
    if (!c.remote) { arrives(c.owned); if (netOn) netShots.push({ k: 'cb', i: c.item, c: c.net }) }
    puffs.push({ x: c.x, y: c.y, t: 0, life: PUFF_LIFE, seed: Math.random(), color: '#ffffff' })
  }
  // the cards in the world, one step: out to where they were thrown (a wall or the floor stops them short), floating
  // there, and back to their owner once she is further than the deck's leash. Touching someone on any of the three
  // bursts them; the 7 and the Ás burst on their own as they arrive
  function stepCards(frameDt: number, { boxes, groundY }: StepCtx) {
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i], d = items[c.item], dt = frameDt * timeAt(c.x, c.y)
      c.t += dt
      if (c.remote) {
        // another browser's card: it only shows. Out to its place and floating; sent back, to where it left from
        const to = c.phase === 'back' ? c.home ?? { x: c.tx, y: c.ty } : { x: c.tx, y: c.ty }
        const dx = to.x - c.x, dy = to.y - c.y, dist = Math.hypot(dx, dy), go = c.speed * dt
        if (c.phase === 'park') { if (c.t > REMOTE_CARD_LIFE) cards.splice(i, 1); continue }
        if (dist <= Math.max(1, go)) { if (c.phase === 'back') cards.splice(i, 1); else { c.x = to.x; c.y = to.y; c.phase = 'park'; c.t = 0 } continue }
        c.x += (dx / dist) * go; c.y += (dy / dist) * go
        continue
      }
      if (c.fuse !== undefined) { c.fuse -= dt; if (c.fuse <= 0) { burstCard(c); continue } }
      const her = bodyOf(c.owner)
      if (c.phase === 'out') {
        let arrived = false, burstNow = false
        // in short steps, so it never jumps over a thin wall or a small enemy
        for (let left = c.speed * dt; left > 0 && !arrived && !burstNow; left -= 12) {
          const rem = Math.hypot(c.tx - c.x, c.ty - c.y), s = Math.min(12, left, rem)
          if (rem < 0.5) { arrived = true; break }
          const nx = c.x + ((c.tx - c.x) / rem) * s, ny = c.y + ((c.ty - c.y) / rem) * s
          if (ny >= groundY || solidAt(boxes, nx, ny)) { arrived = true; break }
          c.x = nx; c.y = ny
          if (cardTouched(c, d.deckTouch)) burstNow = true
          else if (rem - s < 0.5) arrived = true
        }
        if (burstNow || (arrived && burstsAlone(c.rank))) { burstCard(c); continue }
        if (arrived) { c.phase = 'park'; c.t = 0; c.tx = c.x; c.ty = c.y }
        continue
      }
      // its owner is gone: it goes in a little cloud
      if (!her) { dropCard(c); continue }
      const hx = her.x, hy = her.y - 90 * her.scale, dx = hx - c.x, dy = hy - c.y, dist = Math.hypot(dx, dy) || 1
      if (c.phase === 'park') {
        if (dist > d.deckLeash) { c.phase = 'back'; c.t = 0; c.speed = d.returnSpeed * 0.5; if (netOn) netShots.push({ k: 'cb', i: c.item, c: c.net }) }
      } else {
        c.speed = Math.min(c.speed + 2400 * dt, d.returnSpeed * 1.6)
        if (dist <= Math.max(34, c.speed * dt)) { cards.splice(i, 1); arrives(c.owned); sound('catch', null); continue }
        c.x += (dx / dist) * c.speed * dt; c.y += (dy / dist) * c.speed * dt
      }
      if (cardTouched(c, d.deckTouch)) burstCard(c)
    }
  }

  type StepCtx = { boxes: Box[]; groundY: number }
  const boxAt = (boxes: Box[], x: number, y: number, note = false) => boxes.find(b => (note ? b.notes === true : b.shots !== false) && boxContains(b, x, y))
  const solidAt = (boxes: Box[], x: number, y: number) => boxes.find(b => b.solid !== false && boxContains(b, x, y))
  // moves a projectile one step; true when it is gone
  function stepBullet(b: Bullet, dt: number, ctx: StepCtx, dry = false): boolean {
    // fired inside a house: its world is that room
    const { boxes, groundY } = b.room ?? ctx
    const px = b.x, py = b.y
    b.t += dt
    // (a grenade lying on the ground stays there)
    if (!(b.fuse > 0 && !b.drop)) magnetize(b, dt, b.hits)
    if (b.drop) b.vy += b.drop * gravityAt(b.x, b.y) * dt
    b.x += b.vx * dt; b.y += b.vy * dt
    b.dist += Math.hypot(b.x - px, b.y - py)
    const gone = (x: number, y: number) => { if (b.explode > 0 && !dry) explode(x, y, b.explode, b.explodeDamage, b); return true }
    if (b.fuse > 0 && b.t >= b.fuse) return gone(b.x, b.y)
    if (b.dist > b.range) return b.explode > 0 && b.fuse === 0 ? gone(b.x, b.y) : true
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - px, b.y - py) / 8))
    // an instrument's note that reaches a Filhote (not the one who played it) fills its music bar
    if (b.note && !b.room) {
      for (let k = 1; k <= steps; k++) {
        const x = px + (b.x - px) * k / steps, y = py + (b.y - py) * k / steps, baby = babyAt(x, y, b.size, b.by)
        if (baby) { baby.fill(); burst(x, y, 6, b.note.color, 140, 2); return true }
      }
    }
    // swept test against targets: points along the step's segment inside the target's box
    for (const t of b.room ? [] : targets) {
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
          if (b.note) harmonize(t, b.damage, Math.sign(b.vx) * 40, x, y, b.note, items[b.item].stun, b.item)
          else hitTarget(t, b.damage, Math.sign(b.vx) * 40, x, y, weaponClass(b.item))
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
        // the wall of a closed block of the Grade de blocos: the note counts there (one the zone's "Só notas do tom"
        // leaves out only glances off) and, with "Notas quicam nas paredes", bounces
        let mw = wall || zw || b.room ? null : mine?.note(lx, ly, x, y, dry || b.remote || !music.fits(b.note.midi) ? null : b.by ?? null) ?? null
        // a note that bursts on hitting (the Teclado's) bursts on the wall, like a rocket, instead of going on or bouncing
        if (mw && b.explode > 0 && b.fuse <= 0) { b.x = lx; b.y = ly; return gone(lx, ly) }
        if (mw && !mw.bounce) mw = null
        if (!wall && !zw && !mw) continue
        b.x = lx; b.y = ly
        if ((wall ?? zw ?? mw)!.flipX) b.vx = -b.vx; else b.vy = -b.vy
        b.bounces = (b.bounces ?? 0) + 1
        if (mw) {
          if (!dry) { b.hits.clear(); burst(lx, ly, 5, mw.color, 140, 2) }
          return false
        }
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
      // the wall of a closed block of the Grade de blocos stops a shot and takes its damage (an explosive's comes
      // from its blast); one with a fuse bounces off it
      if (mine && !b.note && !b.room) {
        const lx = px + (b.x - px) * (k - 1) / steps, ly = py + (b.y - py) * (k - 1) / steps
        const mw = mine.shot(lx, ly, x, y, b.explode > 0 || b.fuse > 0 ? 0 : b.damage, dry || b.remote ? null : b.by ?? null)
        if (mw) {
          b.x = lx; b.y = ly
          if (b.fuse > 0) {
            if (mw.flipX) b.vx = -b.vx * b.bounce
            else { b.vy = -b.vy * b.bounce; b.vx *= 0.7; if (Math.abs(b.vy) < 60) { b.vy = 0; b.drop = 0; b.vx *= 0.5 } }
            return false
          }
          if (b.explode > 0) return gone(lx, ly)
          if (!dry) burst(lx, ly, 4, '#c9ced6', 120, 2)
          return true
        }
      }
      const box = boxAt(boxes, x, y, !!b.ghost)
      const floor = y >= groundY
      if (!box && !floor) continue
      if (b.fuse > 0) {
        const top = floor || !box ? null : crossedTop(box, x, py, y)
        const fromAbove = floor || top !== null
        if (fromAbove && !dry && Math.abs(b.vy) > 120) sound('bounce', b.item)
        if (fromAbove) { b.y = floor ? groundY - 1 : top! - 1; b.vy = -Math.abs(b.vy) * b.bounce; b.vx *= 0.7; if (Math.abs(b.vy) < 60) { b.vy = 0; b.drop = 0; b.vx *= 0.5 } }
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
      item: d.id, t: 0, explode: 0, explodeDamage: 0, fuse: d.fuse, bounce: d.bounce, ghost: d.instrument, room: shotRooms.get(active),
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
      vy += THROW_GRAVITY * gravityAt(x, y) * dt; x += vx * dt; y += vy * dt
      points.push({ x, y })
      if (targets.some(g => g.deadT <= 0 && Math.abs(x - g.x) < g.w / 2 + 10 && y > g.y - g.h && y < g.y)) break
      const top = vy > 0 ? landing(ctx.boxes, x, py, y) : null
      if (top) { points[points.length - 1] = { x, y: top.y }; break }
      if (vy > 0 && y >= ctx.groundY) { points[points.length - 1] = { x, y: ctx.groundY }; break }
      if (boxAt(ctx.boxes, x, y)) break
    }
    return points
  }

  // a blow pressed while the last one is still going interrupts it and the new one starts right away (with no
  // interval, every note of a song can be hit), unless the item says not to: then it waits for the move to end
  function canSwing(wing: boolean) {
    const d = wing ? bareDef() : def()
    return d.meleeInterrupt || !swing || swing.t >= swing.time
  }
  // an item only for hitting with blows to count (the taco): a blow needs one loaded and not reloading
  const blowsLeft = (h: Owned | null, d: ItemDef) => !h || !d.meleeOnly || d.mag <= 0 || (reloadT <= 0 && h.ammo > 0)
  // an empty taco: the dry click, and it reloads on its own when set to
  function dryBlow(h: Owned, d: ItemDef) { sound('dry'); if (h.ammo <= 0 && d.autoReload) startReload() }
  // heavy: the strong blow, with the share of the charge it was let go with (0..1)
  function melee(wing: boolean, scale: number, heavy: number | null = null) {
    const d = wing ? bareDef() : def()
    const strong = heavy !== null
    const own = wing ? null : held()
    if (own && d.meleeOnly && d.mag > 0) {
      own.ammo = Math.max(0, own.ammo - 1); if (own.refill) own.refill = 0
      if (own.ammo <= 0 && d.autoReload) startReload()
    }
    sound('swing', null)
    // an instrument hit with Y still sounds: a quick strum that starts at the note of the fan lane she aims at
    // (the same note a shot would play there) and climbs the chord `meleeNotes` notes; its air takes that note's colour
    let color = d.trailColor
    if (!wing && d.instrument) {
      const t = tones(d), base = t.note()
      const n = Math.max(1, Math.min(4, Math.round(d.meleeNotes)))
      for (let i = 0; i < n; i++) out.note(d.voice, (i ? t.walk(base, i, 'chord') : base) + tremBend, i * 0.02, 0.15, 0.5 * noteVol(d), undefined, vibOf(d))
      color = t.color(base)
    }
    // the strong blow: its own numbers, and the charge stretches its reach and makes the staff and its air bigger
    const far = strong ? 1 + (Math.max(1, d.heavyReachMax) - 1) * heavy : 1, size = strong ? 1 + (Math.max(1, d.heavySizeMax) - 1) * heavy : 1
    // blows in a row follow the item's combo (by default down, up, horizontal, a full spin), each with its own
    // arc, duration, block and reach. Down comes clockwise facing right. A blow "relative to the aim" goes up when
    // she aims above the horizon and down otherwise. The strong blow is always the same move and starts the combo over
    const order = d.combo.length ? d.combo : DEFAULT_COMBO
    swingCombo = strong ? -1 : nextCombo(swingCombo, swingGap, d.comboWindow, order.length)
    const step = order[Math.max(0, swingCombo) % order.length]
    const kind = blowKind(strong ? d.heavyKind : step.kind, aimAngle)
    const arc = kind === 'spin' ? Math.PI * 2 : (strong ? d.heavyArc : step.arc) * DEG
    const face = Math.cos(aimAngle) >= 0 ? 1 : -1
    // the combo blow's reach multiplies the whole reach (wing and item); the wing stretches by the same share
    const mult = strong ? 1 : step.reach
    const range = (strong ? d.heavyRange : d.meleeRange) * far * mult
    // an item in the wing rides on its tip: the blow reaches its length further
    const reach = range + (wing ? 0 : d.length * scale * size * mult)
    // the item's interval and the blow's own block both hold the next blow, counted from this one's start
    meleeCool = strong ? d.heavyCooldown : Math.max(d.meleeCooldown, step.cooldown)
    const time = Math.max(0.02, strong ? d.heavyTime : d.meleeTime * step.time), trailTime = Math.max(0.05, strong ? d.heavyTrailTime : d.trailTime)
    swing = {
      angle: aimAngle, arc, range, reach, t: 0, time, wing,
      dir: kind === 'up' ? -face : face, kind, combo: Math.max(0, swingCombo), hitAt: swingHitAt(time), hit: false, hits: 0,
      life: swingLife(time, trailTime), impacts: [], seed: Math.random(),
      trail: strong
        ? { width: d.heavyTrailWidth * size, color, time: trailTime, wisps: Math.round(d.heavyTrailWisps), opacity: d.heavyTrailOpacity }
        : { width: d.trailWidth, color, time: trailTime, wisps: Math.round(d.trailWisps), opacity: d.trailOpacity },
      item: wing ? null : held() ?? null, damage: strong ? d.heavyDamage : d.meleeDamage, push: strong ? d.heavyPush : d.meleePush, durability: d.durability > 0, name: d.name,
      ...(strong ? { heavy: true, charge: heavy, size } : {}),
    }
    swingGap = 0
    // the Itens panel's combo window bar (only while it is open): the window counts once the move and the block end
    if (active === 'p1') announceComboBlow(() => ({ busy: Math.max(time, meleeCool), window: strong ? 0 : d.comboWindow }))
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

  // A Passaguá whose player carries no Gaiola keeps nothing. The chicks in its arc are shoved away; the birds (the
  // living ones and the undead ones flying) are scared off: each goes, in the quick flight of a soul being caught, to
  // a free spot on a wire the screen shows and sits there; with no wire in sight, to somewhere on the screen far
  // from whoever swung
  function scareSweep(sw: Swing, origin: { x: number; y: number }) {
    const box = { l: view.l + 40, r: view.r - 40, t: (soulAir?.top ?? floorY - 700) + 40, b: floorY - 120 }
    const spotFor = (pp: ReturnType<typeof birdPerchParams>) => (perchWorld?.spans.length ? perchSeekIn(perchWorld, box, pp, Math.random, origin) : null)
    let n = 0
    const fly = (x: number, y: number, soul: Soul, to: { x: number; y: number }, land: () => void) => {
      puffs.push({ x, y, t: 0, life: PUFF_LIFE, seed: Math.random(), color: '#cceef0' })
      scares.push({ soul, x, y, tx: to.x, ty: to.y, t: -n++ * ABDUCT_GAP, land })
    }
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i]
      if (t.kind !== 'undead' || t.deadT > 0 || t.mirror) continue
      const u = t.data as UndeadState | undefined
      if (!u?.bird || (u.phase !== 'bird' && u.phase !== 'leave')) continue
      const x = t.x, y = t.y - t.h / 2
      if (!inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, x, y, Math.max(t.w, t.h) * 0.35)) continue
      if (u.perch && perchWorld) perchEnd(perchWorld, u.perch)
      const pp = birdPerchParams(BIRDS[u.bird].perch), spot = spotFor(pp), to = spot ?? farSpot(box, origin)
      targets.splice(i, 1)
      fly(x, y, newSoul(0, originOf(soulSpecies(u.look), 'dead', t.soul), u.eye, u.bird), to, () => {
        t.x = to.x; t.y = to.y + t.h / 2; u.phase = 'bird'; u.homeX = to.x; u.homeY = to.y; u.t = 0
        u.perch = spot && perchWorld?.byId.has(spot.span) ? perchSit(perchWorld, spot, pp) : null
        targets.push(t)
      })
    }
    for (let i = critters.length - 1; i >= 0; i--) {
      const c = critters[i]
      if (c.kind !== 'bird' || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, c.x, c.y, 16)) continue
      if (c.perch && perchWorld) perchEnd(perchWorld, c.perch)
      const pp = birdPerchParams(c.bird ? BIRDS[c.bird].perch : undefined), spot = spotFor(pp), to = spot ?? farSpot(box, origin)
      critters.splice(i, 1)
      fly(c.x, c.y, newSoul(0, c.soul ?? originOf('horde', 'alive'), c.color, c.bird ?? null), to, () => {
        // on a wire it sits; in the air it circles there for as long as its kind stays, then leaves as it would have
        c.x = to.x; c.y = to.y; c.vx = 0; c.vy = 0; c.homeX = to.x; c.homeY = to.y; c.groundY = 0; c.t = 0
        c.perch = spot && perchWorld?.byId.has(spot.span) ? perchSit(perchWorld, spot, pp) : null
        critters.push(c)
      })
    }
    // the chicks only get a shove away from her (the other browsers' are theirs to move)
    for (const c of catchables) {
      if (c.net || !c.push || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, c.x, c.y, c.r)) continue
      c.push((Math.sign(c.x - origin.x) || 1) * rand(380, 520), -rand(260, 380))
      puffs.push({ x: c.x, y: c.y, t: 0, life: PUFF_LIFE, seed: Math.random(), color: '#cceef0' })
      n++
    }
    if (n) sound('puff', null)
  }

  // the blow lands at the end of the preparação: everything in its arc is hit once
  function strike(sw: Swing, origin: { x: number; y: number }) {
    sw.hit = true
    collectInSwing(sw, origin)
    // the passaguá catches birds and souls first: what it catches is gone before the blow could hurt or push it.
    // Without a Gaiola nothing can be kept: it only shoves the chicks and scares the birds off
    if ((sw.item as Owned | null)?.item === 'passagua' && !cages.length) scareSweep(sw, origin)
    else if ((sw.item as Owned | null)?.item === 'passagua') {
      const caught: { x: number; y: number; soul: Soul; wild: boolean }[] = []
      // each one needs a place in one of her cages (the souls on their way and the ones asked of other browsers
      // already have theirs); what does not fit stays where it is
      let room = cageRoomLeft(), denied = false
      const fits = () => { if (room > 0) { room--; return true } denied = true; return false }
      // Undead birds stay Targets while circling; the other undead phases are not capturable.
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if (t.kind !== 'undead' || t.deadT > 0) continue
        const u = t.data as UndeadState | undefined
        if (!u?.bird || (u.phase !== 'bird' && u.phase !== 'leave')) continue
        const x = t.x, y = t.y - t.h / 2
        if (!inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, x, y, Math.max(t.w, t.h) * 0.35) || !fits()) continue
        // the lobby owner's bird, on another browser: it is asked of the owner, and hides here until the answer
        if (t.mirror && reportHit && netAsks && t.net !== undefined) { targets.splice(i, 1); takenFoes.set(t.net, TAKE_WAIT); askFor({ k: 'f', id: t.net }, x, y); continue }
        if (u.perch && perchWorld) perchEnd(perchWorld, u.perch)
        targets.splice(i, 1); caught.push({ x, y, wild: true, soul: newSoul(nextId++, originOf(soulSpecies(u.look), 'dead', t.soul), u.eye, u.bird) })
      }
      // Converted living birds fly as critters rather than targets and use the same capture sweep.
      for (let i = critters.length - 1; i >= 0; i--) {
        const c = critters[i]
        if (c.kind !== 'bird' || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, c.x, c.y, 16) || !fits()) continue
        if (c.perch && perchWorld) perchEnd(perchWorld, c.perch)
        critters.splice(i, 1); caught.push({ x: c.x, y: c.y, wild: true, soul: newSoul(nextId++, c.soul ?? originOf('horde', 'alive'), c.color, c.bird ?? null) })
      }
      // souls flying free, whoever let them out: they change cages (or go back to her own)
      for (let i = freed.length - 1; i >= 0; i--) {
        const f = freed[i]
        if (f.portal || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, f.x, f.y, 16) || !fits()) continue
        letGo(f); freed.splice(i, 1); caught.push({ x: f.x, y: f.y, wild: false, soul: f.soul })
      }
      // online, a soul another browser flies: it is asked of that browser
      for (const m of soulMirrors) {
        if (m.asked !== null || !inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, m.x, m.y, 16) || !fits()) continue
        m.asked = 0; askFor({ k: 's', id: m.net, pid: m.pid }, m.x, m.y)
      }
      // the chicks that follow her: caught like the birds, they are souls too (and still chicks: "almas pintinho")
      catchables = catchables.filter(c => {
        if (!inSector(origin.x, origin.y, sw.angle, sw.arc, sw.reach, c.x, c.y, c.r) || !fits()) return true
        c.catch()
        // online, another browser's chick: it is asked of that browser
        if (c.net) askFor({ k: 'c', id: c.net.id, pid: c.net.pid }, c.x, c.y)
        else caught.push({ x: c.x, y: c.y, wild: true, soul: { ...newSoul(nextId++, originOf('chick', 'alive'), CHICK_SOUL_COLOR, null), ...(c.style !== undefined ? { chick: c.style } : {}) } })
        return false
      })
      if (caught.length) {
        // each one leaves a little cloud and flies to the cage of this player's that takes it, where it counts (one
        // after the other). A full cage in front gives its place to one with room
        caught.forEach(({ x, y, soul, wild }, i) => {
          puffs.push({ x, y, t: 0, life: PUFF_LIFE, seed: Math.random(), color: '#cceef0' })
          abductions.push({ soul, owner: active, x, y, t: -i * ABDUCT_GAP, cage: cageForCatch() })
          if (wild) soulNews.push({ soul, owner: active, x, y })
        })
        sound('puff', null)
      }
      // nothing has room for what was left in the net: the cages shake their no
      if (denied) denyCatch()
      // whatever it did not catch (aliens, zombies, dummies, undead on the ground) takes its damage and push below
    }
    const struck: Target[] = []
    targets.forEach(t => {
      if (t.deadT > 0 || sw.damage <= 0) return
      const cx = t.x, cy = t.y - t.h / 2
      const dx = cx - origin.x, dy = cy - origin.y, dist = Math.hypot(dx, dy) - t.w / 2
      if (dist > sw.reach) return
      let diff = Math.atan2(dy, dx) - sw.angle
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      if (Math.abs(diff) > sw.arc / 2 && dist > 10) return
      const hx = cx - Math.sign(dx) * t.w / 2
      hitTarget(t, sw.damage, Math.sign(dx || 1) * sw.push, hx, cy, 'impact')
      sw.impacts.push({ x: hx - origin.x, y: cy - origin.y })
      sw.hits++
      if (t.kind !== 'button') struck.push(t)
    })
    // items wear out on hits; the wing never breaks
    const h = sw.item as Owned | null
    // a lightning weapon: whoever the blow hit is shocked, and the ones around after them
    if (h && struck.length) zap({ x: origin.x + Math.cos(sw.angle) * sw.reach * 0.85, y: origin.y + Math.sin(sw.angle) * sw.reach * 0.85 }, struck, items[h.item], !!sw.heavy, h)
    // and a block of the Grade de blocos the blow reaches goes back to grey
    if (h && items[h.item].shockRange > 0) mine?.shock(origin.x, origin.y, origin.x + Math.cos(sw.angle) * sw.reach, origin.y + Math.sin(sw.angle) * sw.reach)
    // any other blow on the wall of a closed block moves its seesaw: an instrument's toward the music, the rest
    // (the wing too) toward the damage. Not from inside a house, whose room is all she reaches.
    else if (sw.damage > 0 && !shotRooms.has(active)) mine?.blow(origin.x, origin.y, sw.angle, sw.arc, sw.reach, sw.damage, !!h && !!items[h.item].instrument, active)
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
      const d = sw.wing ? bareDef() : def()
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

  // the notes in flight, once per world step: incoming ones the peck and the piu cancel, ones that reach a player or come too
  // late are missed; rebated ones fill the harmony of the first alien or zombie they meet
  function stepNoteShots(dt: number, ctx: StepCtx) {
    for (let i = noteShots.length - 1; i >= 0; i--) {
      const n = noteShots[i]
      const px = n.x, py = n.y
      if (n.state === 'rebated') magnetize(n, dt)
      n.t += dt; n.x += n.vx * dt; n.y += n.vy * dt
      if (n.state === 'incoming') {
        if (parryAt(n.x, n.y, n.size, n.color)) { noteEvents.push({ kind: 'parry', shot: n, player: parriedBy }); noteShots.splice(i, 1); continue }
        // the Filhote's piu cancels it too, like the peck (the piu's note stops there)
        const pi = bullets.findIndex(b => b.item === 'piu' && Math.hypot(b.x - n.x, b.y - n.y) < b.size + n.size + 6)
        if (pi >= 0) {
          puffs.push({ x: n.x, y: n.y, t: 0, life: PUFF_LIFE, seed: Math.random(), color: n.color }); sound('puff', null)
          noteEvents.push({ kind: 'parry', shot: n, player: bullets[pi].by ?? '' })
          bullets.splice(pi, 1); noteShots.splice(i, 1); continue
        }
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
      // a rebated note that reaches a Filhote fills its music bar
      const baby = babyAt(n.x, n.y, n.size)
      if (baby) { baby.fill(); burst(n.x, n.y, 8, n.color, 160, 3); noteShots.splice(i, 1); continue }
      const hit = targets.find(t => (t.kind === 'alien' || t.kind === 'zombie' || (t.kind === 'undead' && !(t.data as UndeadState).bird)) && t.deadT <= 0 && t.state !== 'converted' &&
        n.x + n.size > t.x - t.w / 2 && n.x - n.size < t.x + t.w / 2 && n.y + n.size > t.y - t.h && n.y - n.size < t.y)
      if (hit) {
        const note: NoteInfo = { midi: n.midi, color: n.color, sym: '♪', wave: 0, phase: 0, voice: 'bells' }
        // (a full harmony turns it into a bird)
        harmonize(hit, hit.maxHp * REBATE_HARMONY, Math.sign(n.vx) * 120, n.x, n.y, note, 0.3, 'rebate')
        noteShots.splice(i, 1); continue
      }
      if (n.t > REBATE_LIFE) noteShots.splice(i, 1)
    }
  }

  // the violin: a held note in a beam from the muzzle to the first thing it meets; its pitch follows the aim and the chord
  function stepBeam(d: ItemDef, h: Owned, dt: number, muzzle: { x: number; y: number }, ctx: StepCtx) {
    const way = assistAim(d, muzzle, d.speed).angle
    const dx = Math.cos(way), dy = Math.sin(way)
    let x = muzzle.x, y = muzzle.y, hit: Target | null = null, lx = x, ly = y, onWall = false
    for (let s = 0; s < d.range; s += 6) {
      x = muzzle.x + dx * s; y = muzzle.y + dy * s
      if (y >= ctx.groundY || boxAt(ctx.boxes, x, y, d.instrument)) break
      // the wall of a closed block of the Grade de blocos: the beam stops on it
      if (mine && !shotRooms.has(active) && mine.note(lx, ly, x, y, null)) { onWall = true; break }
      lx = x; ly = y
      hit = targets.find(t => t.deadT <= 0 && t.state !== 'converted' && !(t.kind === 'undead' && (t.data as UndeadState).bird) && x >= t.x - t.w / 2 && x <= t.x + t.w / 2 && y >= t.y - t.h && y <= t.y) ?? null
      if (hit) break
    }
    const t = tones(d), midi = t.note()
    const color = t.color(midi)
    // the sound bends with the aim's tremolo; the note (colour, harmony) stays the lane's
    const pitch = midi + tremBend + detuneNow()
    if (!beamHeld) { beamHeld = out.hold(d.voice, pitch, vibOf(d)); beamMidi = pitch }
    else if (Math.abs(pitch - beamMidi) > 0.005) { beamHeld.setPitch(pitch); beamMidi = pitch }
    beamHeld?.setVolume?.(noteVol(d))
    // bend: semitones the aim's tremolo is bending it right now; vib: its "Vibrato natural" depth in cents (the beam's wave shows both)
    // on a block's wall it counts as a note there every sixteenth (the first one at once), as the notes it plays
    // would (one the zone leaves out only glances off)
    if (onWall) {
      const since = (beamWall.get(active) ?? Infinity) + dt, every = Math.max(0.05, music.secondsPerBeat() / 4)
      if (since >= every) {
        if (music.fits(midi)) mine?.note(lx, ly, x, y, active)
        burst(lx, ly, 3, color, 120, 2)
        beamWall.set(active, since >= 2 * every ? 0 : since - every)
      } else beamWall.set(active, since)
      x = lx; y = ly
    } else beamWall.delete(active)
    beam = { x1: muzzle.x, y1: muzzle.y, x2: x, y2: y, midi, color, target: hit?.id ?? null, bend: tremBend, vib: d.vibratoDepth }
    h.ammo = Math.max(0, h.ammo - dt * d.rate); if (h.refill) h.refill = 0
    bloom = 0
    if (hit && offKey(hit, midi, x, y)) hit = null
    if (hit) {
      const note: NoteInfo = { midi, color, sym: '♩', wave: 0, phase: 0, voice: d.voice }
      // harmony flows while it plays; the target stays still; it answers every so often
      hit.stun = Math.max(hit.stun ?? 0, d.stun)
      if (hit.dummy) { mendDummy(hit, d.damage * dt, color); answerDummy(hit) }
      else hit.harmony = (hit.harmony ?? 0) + d.damage * dt
      hit.tint = color
      if (Math.random() < dt * 10) sparks.push({ x, y, vx: rand(-60, 60), vy: rand(-120, -30), life: 0.4, max: 0.4, color, size: 3 })
      if ((hit.answerCool ?? 0) <= 0 && hit.kind !== 'dummy' && hit.kind !== 'button') harmonize(hit, 0.0001, 0, x, y, note, d.stun, h.item)
      if (hit.kind === 'button' && buttonFree(hit)) hitTarget(hit, 1, 0, x, y)
      if (!hit.dummy && (hit.harmony ?? 0) >= hit.maxHp) { markSoul(hit, note, h.item); fullHarmony(hit, note) }
    }
    if (h.ammo <= 0) { stopBeam(); if (d.autoReload) startReload() }
  }
  function stopBeam() { beamHeld?.stop(); beamHeld = null; beam = null; beamWall.delete(active) }

  // ---------- what the souls flying free do for and against their owners (lib/pigchicken/soul-acts.ts) ----------
  // each owner's fall (a step in the air needs to know she is falling); what a soul did to a player: the sway of
  // their aim, how far off their notes play, how long their item does not answer (s); the floors of the world in this
  // frame; the beat the last frame was in
  const falls = new Map<string, { y: number; vy: number; air: number }>()
  const aimSways = new Map<string, { amp: number; left: number; total: number; seed: number }>()
  const detunes = new Map<string, { semis: number; left: number }>()
  const locks = new Map<string, number>()
  const detuneNow = () => detunes.get(active)?.semis ?? 0
  let actGround: StepCtx = { boxes: [], groundY: 0 }, actBeat = NaN
  const bodyOf = (id: string) => (id === active ? lastBody : loadouts.get(id)?.lastBody) ?? null
  const invOf = (id: string): readonly Owned[] => (id === active ? inv : loadouts.get(id)?.inv ?? [])
  const actorOf = (id: string) => blastActors.find(a => a.id === id)
  // the player nearest a soul flying free that is not its owner (the other local players and, online, the other
  // browsers' chickens), inside its alert radius: the middle of their body (null: nobody)
  function strangerNear(f: FreeSoul) {
    let best: { x: number; y: number } | null = null, near = f.params.alert
    if (near <= 0 || f.params.flee <= 0) return null
    const see = (x: number, y: number) => { const d = Math.hypot(x - f.x, y - f.y); if (d < near) { near = d; best = { x, y } } }
    for (const a of blastActors) if (a.id && a.id !== f.owner) see((a.box.l + a.box.r) / 2, (a.box.t + a.box.b) / 2)
    for (const b of netBodies) see(b.x, b.y - 100)
    return best as { x: number; y: number } | null
  }
  // the voice of a soul's notes is its real bird's
  const soulVoice = (f: FreeSoul): VoiceId => guideBird(f.bird).voice
  // the k-th note of the chord playing, `up` semitones above
  const chordNote = (k: number, up = 12) => { const chord = music.chord(true); return chord[((k % chord.length) + chord.length) % chord.length] + up }
  const alive = (t: Target) => t.deadT <= 0 && t.state !== 'converted' && t.state !== 'dead'
  // an enemy a sung note may fill; one that may hurt her
  const fillable = (t: Target) => alive(t) && (t.shield ?? 0) < 1 && (t.kind === 'alien' || t.kind === 'zombie' || (t.kind === 'undead' && !(t.data as UndeadState).bird))
  const threat = (t: Target) => alive(t) && (t.kind === 'alien' || t.kind === 'zombie' || (t.kind === 'undead' && ((t.data as UndeadState).phase === 'walk' || (t.data as UndeadState).phase === 'rise')))
  function trackFall(id: string, dt: number) {
    const her = bodyOf(id), was = falls.get(id)
    if (!her) { falls.delete(id); return }
    falls.set(id, { y: her.y, vy: was && dt > 0 ? Math.max(-3000, Math.min(3000, (her.y - was.y) / dt)) : 0, air: her.grounded ? 0 : (was?.air ?? 0) + dt })
  }
  // the item it carries hangs under it, and nobody takes it from the air
  const hang = (f: FreeSoul, p: Pickup) => { p.x = f.x; p.y = f.y + SOUL_ACT.fetch.hang; p.resting = true; p.vy = 0; p.noPick = Math.max(p.noPick, 0.2) }
  const cloud = (x: number, y: number) => puffs.push({ x, y, t: 0, life: PUFF_LIFE, seed: Math.random(), color: '#cceef0' })
  // online: this player's Passaguá went over something another browser decides. A little cloud now; the soul flies
  // to their Gaiola when that browser gives it
  function askFor(take: NetTake & { pid?: number }, x: number, y: number) {
    cloud(x, y); sound('puff', null)
    asked.set(take.k + take.id, { owner: active, x, y, t: 0 })
    netTakes.push(take)
  }
  // a soul stops what it was off doing: what it carried falls from where it is
  function letGo(f: FreeSoul) {
    const item = f.job?.kind === 'carry' ? f.job.item : null
    if (item && pickups.includes(item)) { item.resting = false; item.vy = 0; item.noPick = 0.15 }
    f.job = null
  }

  // ---------- "cagar" (lib/pigchicken/poop.ts) ----------
  const poops: Poop[] = []
  // what a dropping left: on a chicken (it goes with her; dx, dy from the top of her box) and on the floor
  const poopStains: { id: string; dx: number; dy: number; x: number; y: number; left: number }[] = []
  const poopMarks: { x: number; y: number; left: number }[] = []
  const poopable = (t: Target) => alive(t) && !t.blast && (t.kind === 'alien' || t.kind === 'zombie' || !!t.dummy || (t.kind === 'undead' && !(t.data as UndeadState).bird))
  const targetBox = (t: Target): BlastBox => ({ l: t.x - t.w / 2, r: t.x + t.w / 2, t: t.y - t.h, b: t.y })
  // a bird at (x, y) with the power: its clock, and a dropping as soon as a boneco is under it. by: the player whose
  // soul it is (null: a wild bird); spare: it never counts that player; foes: the enemies and dummies count
  function birdPoops(at: { x: number; y: number; poopIn?: number }, every: number, damage: number, vx: number, by: string | null, spare: boolean, foes: boolean, dt: number) {
    if (every <= 0) return
    if (at.poopIn === undefined) at.poopIn = poopWait(every, Math.random, true)
    at.poopIn -= dt
    if (at.poopIn > 0) return
    const bodies: BlastBox[] = []
    for (const a of blastActors) if (a.id && !(spare && a.id === by)) bodies.push(a.box)
    if (foes) for (const t of targets) if (poopable(t)) bodies.push(targetBox(t))
    const floors = actGround.boxes.filter(b => b.solid !== false)
    // nobody there: it looks again in a moment
    if (!poopUnder(at.x, at.y, bodies, floors)) { at.poopIn = POOP.look; return }
    poops.push(newPoop(at.x, at.y + 8, vx, damage, by, spare, foes))
    at.poopIn = poopWait(every)
  }
  // an undead bird: an enemy itself, it only lets them fall on the chickens
  function undeadPoops(t: Target, u: UndeadState, p: { every: number; damage: number }, dt: number) {
    const at = { x: t.x, y: t.y - t.h / 2, poopIn: u.poopIn }
    birdPoops(at, p.every, p.damage, 0, null, false, false, dt)
    u.poopIn = at.poopIn
  }
  // the droppings fall: on an enemy or a dummy they hurt; on a chicken they knock her a little and leave a stain; on
  // a floor they leave a mark
  function stepPoops(dt: number) {
    const splat = (x: number, y: number) => { burst(x, y, 6, '#f4f1e6', 110, 2); sound('splat', null) }
    for (let i = poops.length - 1; i >= 0; i--) {
      const p = poops[i], py = p.y
      let gone = !poopFall(p, dt * timeAt(p.x, p.y), gravityAt(p.x, p.y))
      if (!gone) {
        const who = blastActors.find(a => a.id && !(p.spare && a.id === p.by) && poopHits(p, a.box))
        const foe = !who && p.foes ? targets.find(t => poopable(t) && poopHits(p, targetBox(t))) : undefined
        if (who) {
          const k = poopKnock(p.damage), dir = p.vx > 0 ? 1 : p.vx < 0 ? -1 : Math.random() < 0.5 ? -1 : 1
          who.push(dir * k, -k * POOP.knock.up, p.damage)
          // on her back: nearer the middle of her box than where it fell, and below her head
          poopStains.push({ id: who.id!, dx: (p.x - (who.box.l + who.box.r) / 2) * POOP.stainIn, dy: (who.box.b - who.box.t) * POOP.stainAt, x: p.x, y: p.y, left: POOP.stain })
          splat(p.x, p.y); gone = true
        } else if (foe) {
          hitTarget(foe, p.damage, 0, p.x, p.y, 'impact'); splat(p.x, p.y); gone = true
        } else {
          const floor = floorUnder(actGround, p.x, py)
          if (p.y >= floor) { poopMarks.push({ x: p.x, y: floor, left: POOP.mark }); splat(p.x, floor); gone = true }
        }
      }
      if (gone) poops.splice(i, 1)
    }
    for (let i = poopStains.length - 1; i >= 0; i--) {
      const st = poopStains[i], a = actorOf(st.id)
      st.left -= dt
      if (!a || st.left <= 0) { poopStains.splice(i, 1); continue }
      st.x = (a.box.l + a.box.r) / 2 + st.dx; st.y = a.box.t + st.dy
    }
    for (let i = poopMarks.length - 1; i >= 0; i--) if ((poopMarks[i].left -= dt) <= 0) poopMarks.splice(i, 1)
  }

  // a note of the chord to the nearest enemy it reaches: it fills its harmony a little
  function soulSings(f: FreeSoul, onBeat: boolean) {
    let best: Target | null = null, near = f.act.range
    for (const t of targets) {
      if (!fillable(t)) continue
      const d = Math.hypot(t.x - f.x, t.y - t.h / 2 - f.y)
      if (d < near) { near = d; best = t }
    }
    if (!best) return false
    const m = chordNote(f.acts), color = DEGREE_COLORS[music.degreeOf(m) % DEGREE_COLORS.length]
    const note: NoteInfo = { midi: m, color, sym: NOTE_SYMBOLS[m % NOTE_SYMBOLS.length], wave: 0, phase: 0, voice: soulVoice(f) }
    const x = best.x, y = best.y - best.h / 2
    // nobody played this one a note yet: the bird it becomes takes after the soul that sang to it
    if ((best.kind === 'alien' || best.kind === 'undead') && !best.soul?.shot) { const z = music.zone; best.soul = { ...best.soul, shot: f.soul.shot ?? 'wind', note: noteClass(m, z.root, SCALES[z.scale].steps) } }
    out.note(note.voice, m, 0, SOUL_ACT.sing.dur, SOUL_ACT.sing.vel)
    texts.push({ x: f.x, y: f.y - 18, text: note.sym, life: 0.7, color, size: 16 })
    // its note on the way to the enemy
    const n = Math.min(14, Math.max(3, Math.round(near / SOUL_ACT.sing.trail)))
    for (let i = 1; i <= n; i++) sparks.push({ x: f.x + ((x - f.x) * i) / (n + 1), y: f.y + ((y - f.y) * i) / (n + 1), vx: 0, vy: -20, life: 0.2 + (i / n) * 0.3, max: 0.5, color, size: 3 })
    harmonize(best, SOUL_ACT.sing.amount * f.act.power * (onBeat ? SOUL_ACT.sing.beat : 1), 0, x, y, note, 0, 'soul')
    return true
  }
  // an item lying loose within its reach (thrown, dropped; not the ones on the racks) that its owner does not carry
  // and has room for: it goes for it
  function soulFetches(f: FreeSoul, her: Body) {
    const hers = invOf(f.owner)
    let best: Pickup | null = null, near = f.act.range
    for (const p of pickups) {
      if (p.owned.cage || !p.resting || p.noPick > 0 || Math.hypot(p.x - her.x, p.y - her.y) < SOUL_ACT.fetch.near * her.scale || racks.some(r => r.pickupId === p.id) || freed.some(o => o.job?.item === p)) continue
      const has = hers.find(o => o.item === p.owned.item)
      const g = ownGroup(p.owned.item)
      if (has ? has.ammo >= (CONSUMABLE_LIMITS[has.item] ?? 0) : hers.length >= limit || countIn(hers, g) >= capOf(f.owner === active ? lastBody : loadouts.get(f.owner)?.lastBody, g)) continue
      const d = Math.hypot(p.x - f.x, p.y - f.y)
      if (d < near) { near = d; best = p }
    }
    if (!best) return false
    f.job = { kind: 'fetch', t: 0, item: best }
    return true
  }
  // the nearest enemy she has her back to, within its reach of her: a cry, and a mark over the enemy
  function soulWarns(f: FreeSoul, her: Body) {
    let best: Target | null = null, near = f.act.range
    for (const t of targets) {
      if (!threat(t) || (t.x - her.x) * her.face >= 0) continue
      if (f.warned?.id === t.id && soulClock - f.warned.at < f.act.every * SOUL_ACT.warn.again) continue
      const d = Math.hypot(t.x - her.x, t.y - her.y)
      if (d < near) { near = d; best = t }
    }
    if (!best) return false
    f.warned = { id: best.id, at: soulClock }
    const m = chordNote(0, 24), v = soulVoice(f)
    out.note(v, m, 0, 0.07, 0.55); out.note(v, m, 0.12, 0.07, 0.55)
    texts.push({ x: f.x, y: f.y - 22, text: '!', life: 0.9, color: '#ff6b5b', size: 22 }, { x: best.x, y: best.y - best.h - 14, text: '!', life: 0.9, color: '#ff6b5b', size: 18 })
    return true
  }
  // she is falling, high above the floor, and it is near: it dives under her feet
  function soulSteps(f: FreeSoul, her: Body) {
    const fall = falls.get(f.owner), S = SOUL_ACT.step
    if (!fall || her.grounded || fall.air < S.air || fall.vy < S.fall || !actorOf(f.owner)) return false
    if (Math.hypot(her.x - f.x, her.y - f.y) > f.act.range || floorUnder(actGround, her.x, her.y) - her.y < S.drop) return false
    f.job = { kind: 'step', t: 0 }
    return true
  }
  // against her: out of tune at once, from where it is; the others, it flies at her first
  function soulHinders(f: FreeSoul, her: Body) {
    const kind = hinderOf(f.act, f.soul)
    if (kind === 'none') return
    if (kind !== 'detune') { f.job = { kind, t: 0, side: f.x >= her.x ? 1 : -1 }; return }
    detunes.set(f.owner, { semis: (Math.random() < 0.5 ? -1 : 1) * SOUL_ACT.detune.semis, left: actLerp(SOUL_ACT.detune.time, f.act.force) })
    const m = chordNote(0), v = soulVoice(f)
    out.note(v, m, 0, 0.3, 0.5); out.note(v, m + 1, 0, 0.3, 0.5)
    texts.push({ x: f.x, y: f.y - 20, text: '♭', life: 1, color: '#9aa0a8', size: 20 })
  }
  // a frame of what a soul is off doing; false: done or given up (it flies back to its spot)
  function soulJobStep(f: FreeSoul, her: Body, dt: number): boolean {
    const job = f.job!, E = SOUL_ACT.errand, s = her.scale, fall = falls.get(f.owner)
    job.t += dt
    let speed = Math.max(E.min, f.params.speed * E.speed), time = E.time, to: { x: number; y: number }
    if (job.kind === 'fetch') {
      // (somebody took it first)
      if (!job.item || !pickups.includes(job.item) || !job.item.resting || job.item.noPick > 0) return false
      to = { x: job.item.x, y: job.item.y - SOUL_ACT.fetch.hang }
    } else if (job.kind === 'carry') {
      if (!job.item || !pickups.includes(job.item)) return false
      to = { x: her.x, y: her.y - (SOUL_FLIGHT.head + SOUL_ACT.fetch.drop) * s }; time = SOUL_ACT.fetch.time
    } else if (job.kind === 'step') {
      if (her.grounded || !fall) return false
      to = { x: her.x, y: her.y + 12 }; speed = Math.max(speed, fall.vy + SOUL_ACT.step.chase); time = SOUL_ACT.step.time
    } else if (job.kind === 'push') to = { x: her.x + (job.side ?? 1) * SOUL_ACT.push.beside * s, y: her.y - 80 * s }
    else if (job.kind === 'bounce') to = { x: her.x, y: her.y - 14 * s }
    else if (job.kind === 'aim') to = { x: her.x + her.face * 60 * s, y: her.y - 150 * s }
    else to = { x: her.x, y: her.y - 170 * s }
    if (job.t > time) return false
    const left = soulErrandStep(f.brain, f, to, speed, dt)
    if (job.kind === 'carry' && job.item) hang(f, job.item)
    // coming at her, it leaves a red trail
    else if (job.kind !== 'fetch' && job.kind !== 'step' && Math.random() < dt * 40) sparks.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#ff6b5b', size: 2 })
    if (left > E.reach) return true
    // it got there
    const actor = actorOf(f.owner), force = f.act.force, v = soulVoice(f)
    if (job.kind === 'fetch') { job.kind = 'carry'; job.t = 0; if (job.item) hang(f, job.item); out.note(v, chordNote(1, 24), 0, 0.08, 0.35); return true }
    if (job.kind === 'carry') return false
    if (job.kind === 'step') {
      // whatever her fall was, she leaves upwards
      actor?.push(0, -(actLerp(SOUL_ACT.step.lift, f.act.power) + Math.max(0, fall?.vy ?? 0)))
      if (fall) { fall.air = 0; fall.vy = 0 }
      burst(her.x, her.y, 10, f.soul.color, 180, 3)
      out.note(v, chordNote(0), 0, 0.1, 0.5); out.note(v, chordNote(2), 0.07, 0.14, 0.5)
    } else if (job.kind === 'push') {
      const r = SOUL_ACT.push.r, strength = actLerp(SOUL_ACT.push.strength, force)
      for (const a of blastActors) { const p = explosionImpulse(f.x, f.y, r, strength, a.box); if (p) a.push(p.x, p.y - Math.abs(p.x) * SOUL_ACT.push.up) }
      booms.push({ x: f.x, y: f.y, r: r * 0.5, life: 0.3, color: f.soul.color }); sound('puff', null); burst(f.x, f.y, 14, f.soul.color, 300, 3)
    } else if (job.kind === 'bounce') {
      actor?.push(rand(-1, 1) * SOUL_ACT.bounce.side, -actLerp(SOUL_ACT.bounce.lift, force)); sound('bounce', null); burst(her.x, her.y, 8, f.soul.color, 200, 3)
    } else if (job.kind === 'aim') {
      const T = actLerp(SOUL_ACT.aim.time, force)
      aimSways.set(f.owner, { amp: actLerp(SOUL_ACT.aim.deg, force) * DEG, left: T, total: T, seed: rand(0, Math.PI * 2) })
      burst(f.x, f.y, 6, f.soul.color, 160, 2); out.note(v, chordNote(0, 25), 0, 0.12, 0.45)
    } else {
      // a peck: a knock away from it, and her item does not answer for a moment
      const dir = f.x >= her.x ? -1 : 1, p = actLerp(SOUL_ACT.peck.push, force)
      actor?.push(dir * p, -p * 0.6); locks.set(f.owner, Math.max(locks.get(f.owner) ?? 0, actLerp(SOUL_ACT.peck.lock, force)))
      sound('bite', null); burst(f.x, f.y, 8, '#ff6b5b', 200, 3)
    }
    return false
  }
  // a frame of a soul at its spot: its clock, and its help as soon as there is something to do
  function soulActs(f: FreeSoul, her: Body, dt: number, onBeat: boolean) {
    // now and then, as its clock comes round, the real song of its bird
    if (songDue(f.clock, f.act, soulClock - f.sang, dt)) {
      f.sang = soulClock; songs.push({ bird: f.bird, x: f.x, y: f.y })
      texts.push({ x: f.x, y: f.y - 20, text: '♪', life: 1.2, color: f.soul.color, size: 18 })
    }
    if (actClockStep(f.clock, f.act, f.soul, dt)) { soulHinders(f, her); return }
    if (!f.clock.ready) return
    const h = f.act.help
    const did = h === 'sing' ? soulSings(f, false) : h === 'beat' ? onBeat && soulSings(f, true) : h === 'fetch' ? soulFetches(f, her) : h === 'warn' ? soulWarns(f, her) : h === 'step' ? soulSteps(f, her) : false
    if (did) { actDone(f.clock, f.act); f.acts++ }
  }

  // a soul out of a cage (or with no cage to go to): it flies free with `owner` from (x, y)
  function flyFree(soul: Soul, owner: string, x: number, y: number) {
    // how it flies and what it does are its entry's in the library (the class of its family, or a rare one's own)
    const entry = entryOf(soul), params = entryFollowParams(entry), act = entryActParams(entry), brain = createSoulBrain(x, y, params)
    // it pops out, down and to one side
    brain.vx = rand(-160, 160); brain.vy = rand(80, 180)
    freed.push({ soul, owner, x, y, face: brain.vx >= 0 ? 1 : -1, t: 0, brain, params, roam: newSoulRoam(params), poopIn: poopWait(act.poopEvery, Math.random, true), recallIn: null, away: null, act, clock: newActClock(act), job: null, acts: 0, warned: null, bird: entry.bird, sang: -Infinity })
  }

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
      if (px === playerX && py === playerY) { kills.bites++; hurtSelf?.(ZOMBIE_BITE, t.x) }
      addText(px, py - 150, 'mordida!', '#ff6b5b'); burst(px + (t.face > 0 ? -20 : 20), py - 80, 10, '#ff6b5b', 200, 3); sound('bite', null)
    },
  })

  return {
    setBlastActors(actors: { id?: string; box: BlastBox; v?: { x: number; y: number }; push: (vx: number, vy: number, damage?: number) => void }[]) { blastActors = actors },
    /** What damage to this browser's own player does (its health, lib/chicken/engine.ts): a zombie's bite. */
    setHurt(fn: ((amount: number, fromX: number) => void) | null) { hurtSelf = fn },
    /** The Filhotes the notes can reach: each note that does fills a share of its music bar. */
    setBabies(list: { by?: string; box: BlastBox; fill: () => void }[]) { babies = list },
    /** Whether the local player `id` is a Filhote (what it can carry and do). */
    setBaby(id: string, on: boolean) { if (on) babyHere.add(id); else babyHere.delete(id) },
    /** Which of the Filhote's limits are on (Personagem → Filhote). */
    setBabyRules(rules: Partial<BabyRules>) { babyRules = { ...BABY_RULES, ...rules } },
    /** The active player becomes a Filhote: every item and Gaiola she had falls around her, up to `spread` px away. */
    dropAll(spread: number) {
      standUp()
      stopBeam(); peck = null; peckPrep = 0; swing = null; heavyItem = null; heavyT = 0; consumption = null; reloadT = 0; chargeT = 0; burstLeft = 0
      const at = lastBody ?? { x: 0, y: floorY }
      const fling = (o: Owned) => pickups.push({ id: nextId++, owned: o, x: at.x + rand(-spread, spread), y: at.y - 40, vy: -rand(260, 460), resting: false, noPick: 1 })
      inv.splice(0).forEach(fling); cur = 0
      for (const o of cages.splice(0)) { o.cage!.enterT = Infinity; fling(o) }
    },
    setCatchables(list: Catchable[]) { catchables = list },
    /** a little cloud where something left (another browser's chick that is no longer there) */
    puff(x: number, y: number) { cloud(x, y) },
    setPerchWorld(w: PerchWorld | null) { perchWorld = w },
    setSoulAir(air: SoulAir | null) { soulAir = air },
    // Local players: each one has their own items, aim, cooldowns and swing (a loadout); the world (targets,
    // enemies, shots, pickups, music) is shared. use(id) makes that player's loadout the current one; the
    // first one in use is 'p1'. Every getter and step() below act on the current loadout.
    use(id: string) { useLoadout(id) },
    get player() { return active },
    // this player's Gaiolas (lib/pigchicken/cages.ts): the first one is in front. capturedSouls: the souls in all of
    // them; bagOfSouls: the ones in the cage in front (the last one caught on top; none without a cage); cageDeny:
    // how much of the shake of a catch that did not fit is left (1 right then, 0 at rest)
    get cages() { return cages as readonly Owned[] },
    cagesOf(id: string) { return cagesOf(id) as readonly Owned[] },
    get capturedSouls() { return cageSouls(cages) },
    get bagOfSouls() { return cages[0]?.cage?.souls ?? NO_SOULS },
    get cageDeny() { return cageDeny / CAGE_DENY },
    // the next cage comes to the front (the bind), or the one at `i` swaps places with the one in front (a press on it)
    rotateCages(i?: number) {
      const ok = i === undefined ? cycleCages(cages) : bringFront(cages, i)
      if (ok) sound('equip', cages[0].item)
      return ok
    },
    // every player's souls flying to their Gaiolas (lib/pigchicken/souls.ts), the birds a Passaguá without a Gaiola
    // scared off, on their way, and the chicks let out of a cage, for the screen to take (splice) into the flock
    get abductions() { return abductions as readonly Abduction[] },
    get scares() { return scares as readonly Scare[] },
    chickReleases,
    // the souls caught from the wild, to be taken (spliced) by whoever keeps the library; (x, y): where, in world px
    soulNews,
    // the library's sheets changed: the souls flying free take the numbers their entries have now
    refreshSouls() { for (const f of freed) { const e = entryOf(f.soul); f.params = entryFollowParams(e); f.act = entryActParams(e); f.bird = e.bird } },
    // the souls out of the bags, every player's (lib/pigchicken/soul-follow.ts), and how many are this player's
    get freedSouls() { return freed as readonly FreeSoul[] },
    // the droppings falling, the stains they left on the chickens and the marks on the floor (lib/pigchicken/poop.ts)
    get poops() { return poops as readonly Poop[] },
    get poopStains() { return poopStains as readonly { x: number; y: number; left: number }[] },
    get poopMarks() { return poopMarks as readonly { x: number; y: number; left: number }[] },
    get looseSouls() { let n = 0; for (const f of freed) if (f.owner === active) n++; return n },
    // lets the soul on top of this player's cage in front out at `from` (world px: where that cage is); it flies with
    // them. A chick ("alma pintinho") is a chick again: it goes to chickReleases, for the screen's flock
    releaseSoul(from: { x: number; y: number }) {
      const cage = cages[0]?.cage, soul = cage?.souls.pop()
      if (!cage || !soul) return null
      flashCage(cage, 'lose'); lastRelease.set(active, soulClock)
      sound('puff', null)
      if (soul.species === 'chick') chickReleases.push({ soul, owner: active, x: from.x, y: from.y })
      else flyFree(soul, active, from.x, from.y)
      return soul
    },
    // Callback: the souls of this player's flying free go back to their Gaiolas (the one in front first), one every
    // CALLBACK_GAP, the one nearest to them first; only as many as still fit. Returns how many were called.
    callSouls() {
      if (soulClock - (lastRelease.get(active) ?? -Infinity) < CALLBACK_GUARD) return 0
      const mine = freed.filter(f => f.owner === active && f.recallIn === null && f.away === null && !f.portal)
      const her = lastBody ? { x: lastBody.x, y: lastBody.y - 90 * lastBody.scale } : null
      if (her) mine.sort((a, b) => Math.hypot(a.x - her.x, a.y - her.y) - Math.hypot(b.x - her.x, b.y - her.y))
      let room = cageRoomLeft()
      for (const f of freed) if (f.owner === active && f.recallIn !== null) room--
      const called = mine.slice(0, Math.max(0, room))
      if (mine.length && !called.length) denyCatch()
      called.forEach((f, i) => { f.recallIn = i * CALLBACK_GAP })
      return called.length
    },
    // a local player left: their souls fly away and their Gaiolas fall where they were, with what is in them
    /** the house that player is inside of (null: outside): what she fires and throws stays in its room */
    setPlayerRoom(id: string, room: ShotRoom | null) { if (room) shotRooms.set(id, room); else shotRooms.delete(id) },
    drop(id: string) {
      if (id === active) return
      const l = loadouts.get(id)
      if (l?.seated && l.seated.seat.by === id) l.seated.seat.by = null
      seatNear.delete(id)
      if (l) for (const o of l.cages) {
        o.cage!.enterT = Infinity
        pickups.push({ id: nextId++, owned: o, x: (l.lastBody?.x ?? 0) + rand(-50, 50), y: (l.lastBody?.y ?? floorY) - 40, vy: -220, resting: false, noPick: 0.6 })
      }
      loadouts.delete(id); parryZones.delete(id); falls.delete(id); aimSways.delete(id); detunes.delete(id); locks.delete(id); shotRooms.delete(id)
      for (const f of freed) if (f.owner === id && f.away === null) { letGo(f); f.away = 0 }
    },
    // the players in a portal this frame (by player; world px), for their souls flying free
    setSoulPortals(list: ReadonlyMap<string, SoulPortal>) { soulPortals.clear(); list.forEach((t, id) => soulPortals.set(id, t)) },
    // Leaving this Pátio for another: what each local player takes along. Everything else of this world stays behind.
    exportCarry(): WorldCarry {
      loadouts.set(active, save())
      const out: WorldCarry = {}
      loadouts.forEach((l, id) => {
        // her Gaiolas go as they hang (the first one in front), each with its souls. The souls on their way to one are
        // in it (the one that kept their place, else another of hers with room); with no room left they fly free
        const kept = l.cages.map(o => ({ item: o.item, cap: o.cage!.cap, souls: o.cage!.souls.slice() }))
        const loose = freed.filter(f => f.owner === id && f.away === null).map(f => f.soul)
        for (const a of abductions) {
          if (a.owner !== id) continue
          const at = l.cages.findIndex(o => o.cage === a.cage)
          const to = at >= 0 && kept[at].souls.length < kept[at].cap ? kept[at] : kept.find(k => k.souls.length < k.cap)
          if (to) to.souls.push(a.soul); else loose.push(a.soul)
        }
        out[id] = {
          // a hammer still on its way back is in her wing again; the specials are ready (the next world's clock is new)
          // (the Boomerangs and a deck's cards too; the deck goes on from the card it was at)
          inv: l.inv.map(({ item, ammo, durability, refill, group, scale, next }) => ({ item, ammo, durability, refill, group, scale, ...(next !== undefined ? { next } : {}) })),
          cur: l.cur, cages: kept, loose,
        }
      })
      return out
    },
    // Arriving from another Pátio (a new world: call it before the first step). The souls that were flying free wait
    // unseen until their owner comes out of the portal, and come out with them.
    importCarry(carry: WorldCarry) {
      for (const [id, c] of Object.entries(carry)) {
        const hung = c.cages.slice(0, CAGES_MAX).map(k => { const o = fresh(k.item, k.cap); o.cage!.souls.push(...k.souls.slice(0, o.cage!.cap)); return o })
        const l: Loadout = { ...blank(), inv: c.inv.map(o => ({ ...o })), cur: Math.max(0, Math.min(c.cur, c.inv.length)), cages: hung }
        if (id === active) { inv.splice(0, inv.length, ...l.inv); cur = l.cur; cages = l.cages } else loadouts.set(id, l)
        for (const soul of [...c.cages.flatMap(k => k.souls), ...c.loose]) nextId = Math.max(nextId, soul.id + 1)
        for (const soul of c.loose) {
          const entry = entryOf(soul), params = entryFollowParams(entry), act = entryActParams(entry)
          freed.push({ soul, owner: id, x: 0, y: 0, face: 1, t: 0, brain: createSoulBrain(0, 0, params), params, roam: newSoulRoam(params), poopIn: poopWait(act.poopEvery, Math.random, true), recallIn: null, away: null, act, clock: newActClock(act), job: null, acts: 0, warned: null, bird: entry.bird, sang: -Infinity, portal: { x: 0, y: 0 }, k: 0 })
        }
      }
    },
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
    // the reach of the next Golpe (the held item's, or the empty hand's blow) when its point-and-click is on (right
    // button, Itens → Golpe): the Pátio walks her toward a clicked point farther than this before the blow; null: off
    pointClickReach(scale: number) {
      const h = held(), d = h ? items[h.item] : bareDef()
      if (!d.pointClick || seated) return null
      const order = d.combo.length ? d.combo : DEFAULT_COMBO
      const step = order[Math.max(0, nextCombo(swingCombo, swingGap, d.comboWindow, order.length)) % order.length]
      return d.meleeRange * step.reach + (h ? d.length * scale * step.reach : 0)
    },
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
    // what the Zona at a point does to the bodies there: gravity for what falls and flies, x-ray for the canvas
    setZoneEffects(fn: ((x: number, y: number) => ZoneEffects) | null) { zoneFx = fn },
    zoneEffectsAt(x: number, y: number): ZoneEffects { return zoneFx?.(x, y) ?? NO_EFFECTS },
    // the walls of the zones with life (zone-life.ts)
    setZoneWalls(fn: ZoneWallsFn | null) { zoneWalls = fn },
    // the Grade de blocos: what the notes, the shots, the blasts and the shocks do to its blocks
    setMine(hooks: MineHooks | null) { mine = hooks },
    // the bomb of a block going off: the blast everyone sees, hears and is pushed by, which hurts the enemies in it
    boom(x: number, y: number, r: number, damage: number, push: number) {
      mineQuiet = true
      try { explode(x, y, r, damage); blastPush(x, y, r, push, damage) } finally { mineQuiet = false }
    },
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
    // the Bicada's hit area while the beak is out (the Hit-boxes layer): aim, reach, cone and whether it has landed
    get peckZone() { return peck && !held() ? { angle: peck.angle, reach: peck.reach, arc: Math.min(160, Math.max(0, items.peck.meleeArc)) * DEG, hit: peck.hit } : null },
    // the item she stands on that grab would take (drawn with a blue outline)
    get hover() { return hover },
    get hoverOwned() { return hoverOwned },
    // grab on the hovered item swaps (inventory full) instead of taking it into a free slot
    get hoverSwaps() { return hover?.owned.cage ? cages.length >= CAGES_MAX : !(hover ? roomFor(hover.owned.item) : room()) && !inv.some(o => o.item === hover?.owned.item) },
    // the strong blow being charged with the staff in the wing: whether it is armed and how full the charge is (0..1)
    // the class of the body it last stepped (Pig's and Ken's items have their own Pontos)
    get species() { return lastBody?.species },
    get heavyCharging() { return !!heavyItem && heavyItem === (held() ?? BARE) },
    get heavyCharge() { return heavyItem && heavyItem === (held() ?? BARE) ? Math.min(1, heavyT / staffCharge(def())) : 0 },
    // the lightning weapons (lib/pigchicken/shock.ts): the bolts showing, the staffs thrown that are coming back,
    // how bright the sky is from a special (0..1) and where a throw that comes back would fly if let go now
    bolts, flights,
    // the Corrente-gancho (lib/pigchicken/grapple.ts): its hooks out in the world, where it would latch if thrown now
    // (the orange dot), and the angle of the chain spinning in her hand while Atirar charges
    get hooks() { return hooks as readonly Hook[] },
    predictHook,
    get hookSpin() { return spins.get(active) ?? 0 },
    get hookSpinning() { return !!heavyItem && heavyItem === held() && def().grapple },
    // the cards of the decks out in the world (lib/pigchicken/cards.ts)
    get cards() { return cards as readonly Card[] },
    // the card a deck throws next (its place in CARD_RANKS), or null: not a deck, or all its cards are away
    nextCard(o: Owned) { return items[o.item]?.deck ? deckNext(o, items[o.item]) : null },
    // how many of an item that comes back are in her wings now (the Boomerang: one in each)
    inHand(o: Owned) { const d = items[o.item]; return d?.returnThrow ? Math.max(0, awayMax(d) - (o.out ?? 0)) : 1 },
    get skyFlash() { return skyFlash },
    predictReturn,
    // an item's special: null when it has none, else how full it is (1 = ready, the next blow that hits is one)
    special(o: Owned) {
      const d = items[o.item]
      return d.specialCooldown > 0 && d.specialRange > 0 ? Math.max(0, Math.min(1, 1 - ((o.specialAt ?? 0) - clock) / d.specialCooldown)) : null
    },
    get throwCharge() { return throwT > 0 ? Math.min(1, throwT / Math.max(0.05, def().throwCharge)) : 0 },
    get aimAngle() { return aimAngle },
    // what a soul's mischief does to this player right now (lib/pigchicken/soul-acts.ts): how far it turns their aim
    // (radians: the screen adds it to the aim it gives the step) and how far off their notes play (semitones)
    get aimSkew() { const j = aimSways.get(active); if (!j) return 0; return j.amp * (j.left / j.total) * Math.sin((j.total - j.left) * SOUL_ACT.aim.rate + j.seed) },
    get detune() { return detuneNow() },
    // the aim's reach (0..1) for the current player, set by the page before step; the loudness it gives the held item
    // (kind: what that reach is: the pointer's place, a stick's push or nothing; the Cordas soltas read it)
    // where this player's scale drawing is in the world (her shoulder) and its radius: the Aim Assist's cells
    setScaleFan(fan: { x: number; y: number; r: number } | null) { if (fan && [fan.x, fan.y, fan.r].every(Number.isFinite)) scaleFans.set(active, { ...fan }); else scaleFans.delete(active) },
    setAimReach(r: number, kind: AimKind = 'none') { aimReach = Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 1; aimKind = kind },
    // the Cordas soltas for the current player: where along the strings her aim is (the aim's reach) and how long
    // ago string `i` was plucked (s; Infinity: not yet)
    get stringReach() { return stringReach() },
    /** Her hands over the Cordas soltas for this player's next frames ([front, back]; null: one hand, the aim itself). */
    setStringHands(hands: (StringAim | null)[] | null) { stringAims = hands },
    /** The Bateria: what the page read this frame (the sticks' places on the chart, the clicks, each piece's shortcuts). */
    setDrumInput(input: DrumInput | null) { kit.input = input },
    /** The Bateria's drawing: the sticks on the chart, how long ago and how hard a piece was hit, the Chimbal's pedal. */
    get drumSticks() { return kit.st.sticks.map(s => (s.live ? { x: s.x, y: s.y } : null)) },
    drumPulse(piece: DrumPiece) { const s = kit.struck.get(piece); return s ? { age: kit.t - s.at, vel: s.vel } : null },
    get hatOpen() { return kit.st.open },
    /** The knocks between the pieces still showing: where on the chart and how long ago (s). */
    get drumKnocks() { return kit.knocks.filter(k => kit.t - k.at < 0.4).map(k => ({ x: k.x, y: k.y, age: kit.t - k.at })) },
    /** The same pulse for the kit in the world: of whoever sits at that Bateria (null: nobody, or never hit). */
    seatPulse(seat: Seat, piece: DrumPiece) {
      const k = seat.by === null ? null : seat.by === active ? kit : loadouts.get(seat.by)?.kit
      const s = k?.struck.get(piece)
      return k && s ? { age: k.t - s.at, vel: s.vel } : null
    },
    /** Where each hand is over the strings now: its angle and its place along the radius (null: off the strings). */
    get stringHands() { return handAims().map(a => a ? { angle: a.angle, r: stringReachOf(a.kind, a.reach, a.sharp) } : null) },
    stringAge(i: number) { const at = harp.plucked.get(i); return at === undefined ? Infinity : harp.t - at },
    // where the current player's reticle is, in world px (a deck's card is thrown there); null: only the aim's angle
    setAimPoint(p: { x: number; y: number } | null) { aimPoint = p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null },
    get aimReach() { return aimReach },
    // the held instrument's scale now (the primary one for anything else)
    get scale() { return scaleOf(held(), def()) },
    get aimVolume() { return noteVol(def()) },
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
    booms, tracers, sounds, songs, critters, music,
    get beam() { return beam },
    get converted() { return conv },
    setMusicOut(o: MusicOut) { out = o },
    setQuantize(v: boolean) { quantizeAll = v },
    bullets, thrown, targets, pickups, sparks, texts, racks, chests, seats,
    // the fixed instrument the current player sits at (null: none), the free one they are next to, and getting up
    get seated() { return seated?.seat ?? null },
    get seatNear() { return seatNear.get(active) ?? null },
    standUp,
    addSeat(id: string, kind: FixedKind, x: number, y: number, face: 1 | -1): Seat { const s: Seat = { id, kind, x, y, face, by: null }; seats.push(s); return s },
    /** Online: the other browsers' chickens in the seated pose (world px): the seats they are at are taken here. */
    setNetSeated(list: readonly { x: number; y: number; first: boolean }[]) { markNetSeats(seats, list) },
    // the nearest closed Baú this player is next to (null: none), for the hint over it
    get chestNear() { return chestNear.get(active) ?? null },
    // the keys this player carries
    get keys() { return keyCount() },
    // how many of a stacked item the current player has, and one less of it (false: they had none)
    count(item: ItemId) { return inv.reduce((n, o) => n + (o.item === item ? o.ammo : 0), 0) },
    spend(item: ItemId) { return spend(id => id === item) },
    // n of a stacked item straight into the current player's inventory, without taking it in the wing
    grant(item: ItemId, n = 1) {
      for (let k = 0; k < n; k++) {
        const stack = inv.find(o => o.item === item)
        if (stack) { stack.ammo = Math.min(CONSUMABLE_LIMITS[item] ?? 1, stack.ammo + 1); continue }
        if (!roomFor(item)) return
        if (takeIn({ ...fresh(item), ammo: 1 }) <= cur) cur++
      }
    },
    // effects for the modes built on top (the temple): sparks and floating text
    burst, addText(x: number, y: number, text: string, color = '#ffffff', size?: number) { texts.push({ x, y, text, life: size ? 1.2 : 0.9, color, size }) },
    def,
    // an item's sheet (names and numbers for the bar and the wheel)
    item(id: ItemId): ItemDef { return items[id] },
    // creative mode / tests: put an item straight into the inventory (in its group's place) and hold it
    give(item: ItemId) {
      if (item === 'peck' || item === 'wing') return
      // a Gaiola hangs with the others (not in the inventory)
      if (isCage(item)) { if (cages.length < CAGES_MAX) { const o = fresh(item); o.cage!.enterT = 0; cages.push(o); sound('equip', item) } return }
      peck = null; peckPrep = 0
      const stack = inv.find(o => o.item === item)
      if (stack) { if (CONSUMABLE_LIMITS[item]) stack.ammo = Math.min(CONSUMABLE_LIMITS[item]!, stack.ammo + 1); return }
      if (!roomFor(item)) return
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
    // pattern: which aliens, in how many rows and columns (lib/pigchicken/alien-patterns.ts; the Fileira by default)
    spawnAliens(groundY: number, playerX: number, bounds?: { l: number; r: number }, pattern?: AlienPatternDef) { spawnAlienRow(targets, env(groundY, playerX, 0, bounds), pattern) },
    spawnZombies(groundY: number, playerX: number, count: number, bounds?: { l: number; r: number }) { spawnZombies(targets, env(groundY, playerX, 0, bounds), count) },
    // ---------- online (lib/pigchicken/net-world-sync.ts) ----------
    // follower: report hits on the owner's enemies to fn instead of applying them (null: this browser decides)
    setNetFollower(fn: ((h: NetHit) => void) | null) { reportHit = fn },
    get netFollower() { return !!reportHit },
    // while online, the shots fired here are kept for the sync to send (it empties the list)
    setNetOn(on: boolean) { netOn = on; if (!on) { netShots.length = 0; chestOpens.length = 0; netBodies = []; soulMirrors.length = 0; netTakes.length = 0; asked.clear(); takenFoes.clear(); netAsks = false } },
    netShots,
    setNetBodies(list: { x: number; y: number }[]) { netBodies = list },
    addRemoteShots,
    // the owner applies another browser's hit on one of its enemies, as if it were its own
    applyNetHit(h: NetHit) {
      const t = targets.find(g => g.net === h.id && !g.mirror)
      if (!t) return false
      // a note in a voice no instrument has was sung by a soul flying free: it fills, and leaves no mark
      if (h.n) harmonize(t, h.d, h.px, h.x, h.y, { midi: h.n.m, color: h.n.c, sym: h.n.s, wave: h.n.w, phase: 0, voice: h.n.v as VoiceId }, h.st ?? 0, shotClass(null, h.n.v) ? null : 'soul')
      else hitTarget(t, h.d, h.px, h.x, h.y)
      if (h.sh && shockable(t)) applyShock(t, h.sh[0], h.sh[1], h.sh[2])
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
    // ---------- online: the souls flying free (lib/pigchicken/net-souls.ts) ----------
    // the souls the other browsers fly, drawn here
    get netSouls() { return soulMirrors as readonly SoulMirror[] },
    // a browser's souls as it just sent them; the ones that left (called back, caught) go in a little cloud
    importNetSouls(pid: number, list: unknown) { for (const m of importSouls(soulMirrors, pid, list)) if (m.asked === null && (m.k ?? 1) > 0.2) cloud(m.x, m.y) },
    // only these browsers are still in the lobby
    keepNetSouls(pids: ReadonlySet<number>) { for (let i = soulMirrors.length - 1; i >= 0; i--) if (!pids.has(soulMirrors[i].pid)) soulMirrors.splice(i, 1) },
    // what this browser asks of the others (the sync empties the list), and whether it can ask
    netTakes,
    setNetAsks(on: boolean) { netAsks = on },
    // an undead bird of the owner's this browser asked for: hidden until the answer has had time to come
    netFoeTaken(id: number) { return takenFoes.has(id) },
    // another browser's Passaguá went over a soul this browser flies or a chick of its own (pid: this browser's) or,
    // on the lobby's owner, over one of its undead birds: it leaves here and what it is goes back (null: it is not
    // here any more)
    giveNetTake(take: NetTake, pid: number): NetSoulWho | null {
      if (take.k === 's') {
        const i = freed.findIndex(f => !f.portal && netIdFor(pid, f.soul.id) === take.id)
        if (i < 0) return null
        const [f] = freed.splice(i, 1)
        letGo(f); cloud(f.x, f.y); sound('puff', null)
        return soulWho(f.soul)
      }
      if (take.k === 'c') {
        const i = catchables.findIndex(c => c.id !== undefined && netIdFor(pid, c.id) === take.id)
        if (i < 0) return null
        const [c] = catchables.splice(i, 1)
        c.catch(); cloud(c.x, c.y); sound('puff', null)
        return soulWho({ ...newSoul(0, originOf('chick', 'alive'), CHICK_SOUL_COLOR, null), ...(c.style !== undefined ? { chick: c.style } : {}) })
      }
      const i = targets.findIndex(t => t.net === take.id && !t.mirror && t.kind === 'undead' && t.deadT <= 0)
      const t = targets[i], u = t?.data as UndeadState | undefined
      if (!t || !u?.bird || (u.phase !== 'bird' && u.phase !== 'leave')) return null
      if (u.perch && perchWorld) perchEnd(perchWorld, u.perch)
      targets.splice(i, 1)
      cloud(t.x, t.y - t.h / 2); sound('puff', null)
      return soulWho(newSoul(0, originOf(soulSpecies(u.look), 'dead', t.soul), u.eye, u.bird))
    },
    // the answer: the soul flies from where it was caught to the Gaiola of the player who caught it, and is new
    // to this browser's library
    applyNetGive(g: NetGive) {
      const a = asked.get(g.k + g.id), soul = a ? soulFromWho(g.soul, nextId++) : null
      if (!a || !soul) return false
      asked.delete(g.k + g.id)
      abductions.push({ soul, owner: a.owner, x: a.x, y: a.y, t: 0, cage: cageFor(a.owner) })
      soulNews.push({ soul, owner: a.owner, x: a.x, y: a.y })
      return true
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
    // an item on its own in the world (a Pátio's "Item solto"): it falls to the floor there and never comes back
    addPickup(x: number, item: ItemId, y: number, cageSouls?: number) { const id = nextId++; pickups.push({ id, owned: fresh(item, cageSouls), x, y, vy: 0, resting: false, noPick: 0 }); return id },
    // online: the Baús opened here since the sync last asked
    chestOpens,
    // another browser opened this Baú `t` s ago: it opens here too, with its animation and sound when it is news (the
    // items came out only for whoever opened it)
    openNetChest(id: string, t: number) {
      const c = chests.find(o => o.id === id)
      if (!c) return
      // already open here: only its clock follows (the one that closes again closes with the others)
      if (c.open) { c.t = Math.max(c.t, t); return }
      if (t < 0.5) { openChestFx(c); c.t = t } else { c.open = true; c.lid = 1; c.t = t }
    },
    // the lobby's owner has it shut (its time ran out there, or it never opened)
    closeNetChest(id: string) { const c = chests.find(o => o.id === id); if (c?.open) { c.open = false; c.t = 0 } },
    // a Baú of the layout (x: its middle, y: its floor); the layout sync keeps its place and params up to date
    addChest(id: string, x: number, y: number, params: ChestParams): Chest { const c: Chest = { id, x, y, params, open: false, lid: 0, t: 0, shake: 0 }; chests.push(c); return c },
    // cageSouls: a Gaiola's limit of souls on this rack (none: the item's own)
    // (a Gaiola's rack waits longer between one cage and the next, but its first one is there from the start)
    addRack(x: number, item: ItemId, y?: number, respawnDelay?: number, cageSouls?: number, refillLimit?: number) { const delay = rackRespawnDelay(item, respawnDelay); racks.push({ x, item, t: isCage(item) ? delay : 0, label: items[item].name.toUpperCase(), y, respawnDelay: delay, cageSouls, refillLimit: rackRefillLimit(refillLimit), given: 0 }) },
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
    step(frameDt: number, body: Body, origin: { x: number; y: number }, muzzle: { x: number; y: number }, targetAngle: number, input: FrameInput, boxes: Box[], groundY: number, onRecoil: (vx: number, vy: number) => void, opts: { world?: boolean; throwOrigin?: { x: number; y: number }; peckOrigin?: { x: number; y: number }; hand?: { x: number; y: number } } = {}) {
      const world = opts.world !== false
      magnetCache = null
      // her own hands (aim, cooldowns, swings, charges) live on the time of the Zona she is in; the world below goes
      // thing by thing, each on the time of where it is, and the music keeps the frame's
      let dt = frameDt * timeAt(body.x, body.y - 60 * body.scale)
      floorY = groundY
      let peckStarted = false
      // what calls a strong blow's charge off without hitting: the interface, empty hands, a soul's peck
      const heavyCancel = !!input.cancelFire || !!input.deselect || locks.has(active)
      // sitting at a fixed instrument: only the aim and Atirar count; Pegar gets her up (not a key that is one of the
      // instrument's own binds);
      // a portal, being carried or the instrument leaving the Pátio too (online: another browser's player who sat
      // at it at the same time and comes first)
      let stoodUp = false
      if (seated) {
        if (!seats.includes(seated.seat) || seated.seat.yield || (input.grab && !input.grabKeep) || body.state === 'held' || body.state.startsWith('portal')) { standUp(); stoodUp = true; input = { ...input, grab: false, grabHeld: false, grabReleased: false } }
        else input = { ...input, ...NO_SWITCH, move: null, deselect: false, melee: false, throwHeld: false, throwReleased: false, reload: false, grab: false, grabHeld: false, grabReleased: false }
      }
      // rearranging the bar never changes what she holds (nor what is being done with it)
      if (input.move) moveSlot(input.move.from, input.move.to, input.move.after)
      if (input.deselect) {
        stopBeam(); peck = null; peckPrep = 0; swing = null; consumption = null; heavyItem = null; heavyT = 0
        cur = inv.length; reloadT = 0; burstLeft = 0; chargeT = 0; pumpT = 0
        throwT = 0; throwItem = null; throwVoid = input.throwHeld
        input = { ...input, ...NO_SWITCH, cancelFire: true, fire: false, firePressed: false, melee: false, throwReleased: false, reload: false, grab: false, grabHeld: false, grabReleased: false }
      }
      // pecked by a soul (lib/pigchicken/soul-acts.ts): her item does not answer for a moment
      if (locks.has(active)) input = { ...input, fire: false, firePressed: false, melee: false }
      // her hammer is out flying: the wing waits for it (she can still change items). With one of two Boomerangs or
      // some of a deck's cards away she still hits and throws the rest, but the item itself is not thrown (Arremesso)
      // the Corrente-gancho out: a press on Atirar lets go of it and the chain comes back
      if (held()?.flying && items[held()!.item].grapple && input.firePressed) releaseHooks(active)
      if (held()?.flying) input = { ...input, fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false }
      else if (held()?.out) input = { ...input, throwHeld: false, throwReleased: false }
      const d = def()
      if (consumption) {
        consumption.left -= dt
        if (consumption.left <= 0) consumption = null
        input = { ...input, ...NO_SWITCH, fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, grab: false, grabHeld: false, grabReleased: false }
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
      // ("Tremolo: reage a" the movement along the string: the aim going away from her raises the note, coming closer
      // lowers it, from where it was when the note started; on the Cordas soltas each string slides by itself)
      if (d.instrument && d.tremolo > 0 && d.tremoloAxis === 'along' && scaleOf(held(), d).id !== 'strings') {
        if (Number.isFinite(trem.slow)) trem = newTremolo()
        if (!(input.fire && (!bowed(d) || !!beamHeld))) { tremReach = null; tremBend = 0 }
        else {
          if (tremReach === null) tremReach = aimReach
          tremBend = Math.max(-d.tremoloRange, Math.min(d.tremoloRange, (aimReach - tremReach) * 2 * d.tremoloRange * d.tremolo))
        }
      } else if (d.instrument && d.tremolo > 0 && d.tremoloAxis !== 'along' && scaleOf(held(), d).id === 'primary') {
        tremReach = null
        const pool = music.aimPool(d.pitchSet, d.octave, d.span)
        const playing = input.fire && (!bowed(d) || !!beamHeld)
        const lane = stepTremolo(trem, pool, -Math.sin(aimAngle), dt, d.tremolo, d.fretless, playing, d.tremoloRange)
        tremBend = pool.length ? lane - music.noteFor(aimAngle, d.pitchSet, d.octave, d.span) : 0
      } else { if (tremBend || Number.isFinite(trem.slow)) trem = newTremolo(); tremBend = 0; tremReach = null }

      lastBody = body
      hands.set(active, opts.hand ?? opts.throwOrigin ?? origin)
      if (world) { music.step(frameDt); bonusTextT = Math.max(0, bonusTextT - frameDt); clock += frameDt; skyFlash = Math.max(0, skyFlash - frameDt * 2.2) }
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
      // the combo window counts from the end of the move, and not while the blow's block still holds the next one
      if ((!swing || swing.t > swing.time) && meleeCool <= 0) swingGap += dt

      // switching items
      // the shown slots: the empty one (empty hands) belongs to the last group, so Próximo utilitário passes by it
      let groupSlot = -1, pick = input.pick
      if (!input.slot && !pick && input.groupPick != null) {
        groupSlot = groupStep(shown().map(o => o ? groupOf(o) : 2), cur, input.groupPick)
        // no instrument: Próximo instrumento works as Item anterior; no weapon: Próxima arma as Próximo item
        if (groupSlot < 0) pick = input.groupPick === 0 ? -1 : input.groupPick === 1 ? 1 : 0
      }
      if (input.slot) { if (input.slot <= shown().length) equip(input.slot - 1) }
      else if (pick) {
        // with "Incluir variações", an instrument with more scales goes through them first (each switch sounds its
        // weapon's reload); with none left that way, the next item, arriving at its first scale (backward: its last).
        // Without it, straight to the next item, keeping the scale each instrument has.
        const h = held(), count = h ? d.scales.length : 0
        const next = input.pickVariations && h && d.instrument ? scaleStep(count, h.scale ?? 0, pick) : null
        if (h && next !== null) switchScale(h, next)
        else {
          // A full inventory has no displayed empty slot; Deselecionar can still leave it unequipped.
          const from = !room() && !held() ? (pick > 0 ? -1 : inv.length) : cur
          equip(from + pick)
          const now = held()
          if (input.pickVariations && now && now !== h && items[now.item].instrument && items[now.item].scales.length > 1) now.scale = arrivalScale(items[now.item].scales.length, pick)
        }
      }
      else if (groupSlot >= 0) {
        // with "Incluir escalas" (Próximo instrumento), the held instrument goes through its scales first, then the
        // group's next item at its first scale; the group's only item goes round its scales
        const h = held(), count = h ? d.scales.length : 0
        const ofGroup = !!h && groupOf(h) === input.groupPick
        const next = input.groupVariations && h && ofGroup && d.instrument ? scaleStep(count, h.scale ?? 0, 1) ?? (groupSlot === cur && count > 1 ? 0 : null) : null
        if (h && next !== null) switchScale(h, next)
        else {
          equip(groupSlot)
          const now = held()
          if (input.groupVariations && now && now !== h && items[now.item].instrument && items[now.item].scales.length > 1) now.scale = 0
        }
      }
      else if (input.variation) {
        // Próxima variação: the held instrument's next scale, round to the first after the last
        const h = held()
        if (h && d.instrument && d.scales.length > 1) switchScale(h, ((h.scale ?? 0) + 1) % d.scales.length)
      }
      const dNow = def()
      // Golpe is taken before firing, even with Atirar held: on an item that shoots, the blow interrupts firing
      // (no shot, charge, beam or rest of a burst while it moves). When it ends with Atirar still held, firing
      // starts again as if the button had just been pressed.
      const hNow = held()
      // a Filhote never hits: Golpe with the hand empty is its piu (below)
      if (input.melee && meleeCool <= 0 && !(isBabyNow() && babyRules.noMelee) && canSwing(!hNow)) { if (hNow && !blowsLeft(hNow, dNow)) dryBlow(hNow, dNow); else melee(!hNow, body.scale) }
      // a strong blow being charged is called off by Golpe (the quick blow comes out instead), by another item in
      // the wing and by a Throw
      if (heavyItem && (heavyCancel || input.melee || heavyItem !== (hNow ?? BARE) || input.throwHeld)) { heavyItem = null; heavyT = 0 }
      if (hNow && !dNow.consumable && !dNow.meleeOnly && dNow.mag !== 0 && swing && swing.t < swing.time) {
        fireResume = input.fire ? hNow : null
        input = { ...input, fire: false, firePressed: false }
        prevFire = false; chargeT = 0; glissSteps = 0; burstLeft = 0
      } else if (fireResume) {
        // only the same item: switching or emptying the wing during the blow asks for a new press, as usual
        if (input.fire && hNow === fireResume) input = { ...input, firePressed: true }
        fireResume = null
      }
      if (beam && (!input.fire || !bowed(dNow))) stopBeam()

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
        // a never-ending one (the Granada) is always full, even one carried empty from before
        if (dr.infiniteAmmo && dr.mag > 0 && hr.ammo < dr.mag) hr.ammo = dr.mag
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
          const hit = new Set<number>(), touched = new Set<Pickup>()
          const arc = Math.min(160, Math.max(0, d.meleeArc)) * DEG
          for (let ray = 0; ray <= 8; ray++) {
            const a = peck.angle + (ray / 8 - 0.5) * arc
            for (let r = 0; r <= peck.reach; r += 3) {
              const x = at.x + Math.cos(a) * r, y = at.y + Math.sin(a) * r
              if (y > groundY || boxAt(boxes, x, y)) break
              targets.forEach(t => {
                if (hit.has(t.id) || t.deadT > 0 || x < t.x - t.w / 2 || x > t.x + t.w / 2 || y < t.y - t.h || y > t.y) return
                hit.add(t.id)
                hitTarget(t, d.meleeDamage, Math.cos(peck!.angle) * d.meleePush, x, y, 'impact')
              })
              for (const p of pickups) if (Math.hypot(x - p.x, y - (p.y - PICKUP_HIT_R)) <= PICKUP_HIT_R) touched.add(p)
            }
          }
          // the beak also collects the new items it touches, like Golpe: stored without changing hands, never swapped
          touched.forEach(p => {
            const i = pickups.indexOf(p)
            if (i < 0 || !canTake(p)) return
            pickups.splice(i, 1)
            if (!pickUp(p, false)) pickups.splice(i, 0, p)
            else if (hover === p) hover = null
          })
          // and it chips the closed blocks of the Grade de blocos whose wall it reaches, like a Golpe with the wing
          if (d.meleeDamage > 0 && !shotRooms.has(active)) mine?.blow(at.x, at.y, peck.angle, arc, peck.reach, d.meleeDamage, false, active)
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
      piuCool = Math.max(0, piuCool - dt)
      if (!h && isBabyNow() && babyRules.piu) {
        // the Filhote's empty hand: Atirar (and Golpe, while it has no quick blow) peeps a small note that flies a little way
        if ((input.firePressed || (input.melee && babyRules.noMelee)) && !input.cancelFire && piuCool <= 0 && body.state !== 'held' && !body.state.startsWith('portal')) {
          piu(opts.peckOrigin ?? origin, targetAngle)
          piuCool = 1 / Math.max(0.2, items.piu.rate)
        }
      } else if (!h && bareDef() !== items.wing) {
        // Pig and Ken with empty hands: Atirar is the strong blow of the chain or the tail, like a staff's
        const bd = bareDef()
        if (input.cancelFire || body.state === 'held' || body.state.startsWith('portal')) { heavyItem = null; heavyT = 0 }
        else if (input.firePressed && !heavyCancel && !input.melee && !input.throwHeld) { heavyItem = BARE; heavyT = 0 }
        else if (heavyItem === BARE && input.fire) { if (meleeCool <= 0) heavyT += dt }
        else if (heavyItem === BARE) {
          if (meleeCool <= 0 && canSwing(true)) melee(true, body.scale, Math.min(1, heavyT / staffCharge(bd)))
          heavyItem = null; heavyT = 0
        }
      } else if (!h) {
        if (!input.cancelFire && !input.melee && body.state !== 'held' && !body.state.startsWith('portal')) {
          if (input.firePressed && peckCool <= 0 && meleeCool <= 0 && !peck) peckPrep = dt
          else if (input.fire && peckPrep > 0) peckPrep += dt
          if (!input.fire && prevFire && peckPrep > 0) {
            const p = items.peck
            peck = { angle: targetAngle, pull: p.peckPull * Math.min(1, peckPrep / 0.12), reach: p.meleeRange, t: 0, time: Math.max(0.05, p.meleeTime), hit: false }
            peckPrep = 0; peckCool = Math.max(p.meleeCooldown, p.meleeTime); sound('swing', null); peckStarted = true
          }
        }
      } else if (h && d.consumable) {
        // a key (Chave) is only for the Baús: Atirar does nothing with it
        if (input.firePressed && cooldown <= 0 && !isKey(h.item) && !isMineItem(h.item)) consume(h, d, origin)
      } else if (isStaff(items[h.item])) {
        // a staff (the taco, the passaguá): Atirar is its strong blow. A press arms it, holding charges it (once the
        // interval of the last blow is over) and letting go hits, with whatever charge it has
        // (the item in the wing now: `d` is still the one she held when the frame started)
        const sd = items[h.item]
        if (sd.deck) {
          // a deck: a press throws its next card where she aims; held, one more every `deckGap` s
          if (input.firePressed && !heavyCancel && !input.melee && !input.throwHeld) heavyItem = h
          else if (heavyItem === h && !input.fire) heavyItem = null
          if (heavyItem === h && cooldown <= 0 && throwCard(h, sd, opts.throwOrigin ?? origin)) cooldown = Math.max(0.05, sd.deckGap)
        }
        else if (input.firePressed && !heavyCancel && !input.melee && !input.throwHeld) { if (!blowsLeft(h, sd)) dryBlow(h, sd); else { heavyItem = h; heavyT = 0 } }
        else if (heavyItem === h && input.fire) {
          if (meleeCool <= 0) heavyT += dt
          // the Corrente-gancho: the chain spins in her hand, faster as the charge fills
          if (sd.grapple) spins.set(active, ((spins.get(active) ?? 0) + dt * spinRate(Math.min(1, heavyT / staffCharge(sd)))) % (Math.PI * 2))
        }
        else if (heavyItem === h) {
          // one that comes back is thrown instead (the Martelo de Thor); the Corrente-gancho throws its hook
          if (sd.grapple) throwHook(h, sd, opts.throwOrigin ?? origin, Math.min(1, heavyT / staffCharge(sd)), { boxes, groundY })
          else if (sd.returnThrow) launch(h, sd, opts.throwOrigin ?? origin, Math.min(1, heavyT / staffCharge(sd)))
          else if (meleeCool <= 0 && canSwing(false)) { if (!blowsLeft(h, sd)) dryBlow(h, sd); else melee(false, body.scale, Math.min(1, heavyT / staffCharge(sd))) }
          heavyItem = null; heavyT = 0
        }
      } else if (items[h.item].instrument && scaleOf(h, items[h.item]).id === 'drums') {
        // the Bateria: the sticks, the clicks and the pieces' shortcuts hit by themselves (no Atirar)
        if (beam) stopBeam()
        chargeT = 0; burstLeft = 0
        if (input.cancelFire) { kit.hat?.stop(0.05); kit.hat = null; kit.st = newDrumState(); kit.input = null }
        else stepKit(h, items[h.item], muzzle, dt)
      } else if (items[h.item].instrument && scaleOf(h, items[h.item]).id === 'strings') {
        // an instrument on the Cordas soltas: Atirar plucks the strings (no magazine, no charge, no reload)
        if (beam) stopBeam()
        chargeT = 0; burstLeft = 0
        harp.t += dt
        if (input.cancelFire) harp.hands.forEach(hand => { hand.on = -1 })
        else stepStrings(h, items[h.item], input, muzzle)
      } else if (d.meleeOnly || d.mag === 0) {
        // an item with no shots: Atirar swings it too
        if (input.firePressed && meleeCool <= 0 && canSwing(false)) melee(false, body.scale)
      } else if (canFire) {
        const spreadDeg = this.spread(body)
        const ctx = { boxes, groundY }
        // shell by shell: firing with something loaded stops the reload
        if (reloadT > 0 && d.shellReload && h.ammo > 0 && input.firePressed) reloadT = 0
        if (bowed(d)) { if (reloadT <= 0 && h.ammo > 0 && input.fire) stepBeam(d, h, dt, muzzle, ctx); else if (beam) stopBeam(); if (input.firePressed && (reloadT > 0 || h.ammo <= 0)) { sound('dry'); if (h.ammo <= 0 && d.autoReload) startReload() } }
        // pizzicato: while Atirar is held, one plucked note of the arpeggio at a time
        else if (pizzicato(d)) {
          if (reloadT > 0 || h.ammo <= 0) { if (input.firePressed) { sound('dry'); if (h.ammo <= 0 && d.autoReload) startReload() } }
          else if (input.fire && cooldown <= 0) shoot(muzzle, spreadDeg, onRecoil, 1, ctx)
        }
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
                const t = tones(d)
                out.note(d.voice, t.walk(t.note(), glissSteps, d.pitchSet), 0, 0.25, (0.35 + 0.3 * p) * noteVol(d), undefined, vibOf(d))
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
          // only while Atirar is held: letting go keeps the rest of the burst in (the press's own shot always leaves)
          else if (d.burstHold && !input.fire) burstLeft = 0
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
          thrown.push({ x: throwFrom.x, y: throwFrom.y, vx, vy, spin, angle: throwAngle, owned: t, damage: d.throwDamage * (0.4 + 0.6 * p), hit: false, room: shotRooms.get(active) })
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
      // from here on, the world: each thing on the time of the Zona where it is
      dt = frameDt
      if (world) for (let i = bullets.length - 1; i >= 0; i--) if (stepBullet(bullets[i], dt * timeAt(bullets[i].x, bullets[i].y), ctx)) bullets.splice(i, 1)
      if (world) stepNoteShots(dt, ctx)
      if (world) for (let i = booms.length - 1; i >= 0; i--) { booms[i].life -= dt; if (booms[i].life <= 0) booms.splice(i, 1) }
      if (world) for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) tracers.splice(i, 1) }

      // thrown items: spin, hit once, land as a pickup
      if (world) for (let i = thrown.length - 1; i >= 0; i--) {
        const t = thrown[i], dt = frameDt * timeAt(t.x, t.y)
        const py = t.y
        t.vy += THROW_GRAVITY * gravityAt(t.x, t.y) * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.angle += t.spin * dt
        // thrown inside a house: it stays in that room
        const tBoxes = t.room?.boxes ?? boxes, tGround = t.room?.groundY ?? groundY
        if (!t.hit && !t.room) for (const g of targets) {
          if (g.deadT > 0) continue
          if (Math.abs(t.x - g.x) < g.w / 2 + 10 && t.y > g.y - g.h && t.y < g.y) {
            if (!t.remote) { hitTarget(g, t.damage, Math.sign(t.vx) * 220, t.x, t.y, 'impact'); zap({ x: t.x, y: t.y }, [g], items[t.owned.item], false, t.owned) }
            t.hit = true; t.vx *= -0.3; t.vy = Math.min(t.vy, -200)
          }
        }
        const top = landing(tBoxes, t.x, py, t.y, b => b.solid !== false)
        const side = !top && solidAt(tBoxes, t.x, t.y)
        if (side) { t.vx *= -0.4; t.x += t.vx * dt * 2 }
        const floor = top ? top.y : t.y >= tGround ? tGround : null
        if (floor !== null && t.vy > 0) {
          // another browser's throw: the item lands on that browser's floor, not here
          if (!t.remote) pickups.push({ id: nextId++, owned: t.owned, x: t.x, y: floor, vy: 0, resting: true, noPick: 0.5 })
          burst(t.x, floor, 6, '#c9b48a', 120, 2)
          thrown.splice(i, 1)
        }
      }

      // where she aims steers her staff in the air
      for (const f of flights) if (!f.remote && f.owner === active) f.aim = aimAngle
      // a staff thrown that comes back: out along its curve, hitting and shocking whoever it crosses, then to its
      // owner's wing. Its path bends to the side its owner aims, the more the further the aim is from its line
      if (world) for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i], fd = items[f.owned.item], dt = frameDt * timeAt(f.x, f.y)
        f.angle += f.spin * dt
        const touch = () => {
          if (!f.remote && fd.shockRange > 0) mine?.shock(f.x, f.y, f.x, f.y)
          if (!f.remote) for (const g of targets) {
            if (g.deadT > 0 || f.hits.has(g.id) || Math.abs(f.x - g.x) > g.w / 2 + 16 || f.y < g.y - g.h - 12 || f.y > g.y + 12) continue
            f.hits.add(g.id)
            hitTarget(g, f.damage, Math.sign(f.vx || 1) * f.push, f.x, f.y, 'impact')
            if (g.kind !== 'button') zap({ x: f.x, y: f.y }, [g], fd, false, f.owned)
          }
        }
        // it bends to the side she turned the aim to since the throw; the bend follows the aim in about a tenth of a
        // second, so a change of side is a smooth turn
        const steer = steerCurve((f.aim ?? f.launch) - f.launch, f.side, fd.returnCurveMin, fd.returnCurveMax)
        f.side = steer.side
        f.bend += (steer.side * steer.curve - f.bend) * Math.min(1, dt * 12)
        if (!f.back) {
          // on the way out it is its heading that turns
          const turn = f.reach > 0 ? f.bend / f.reach : 0
          // in short steps, so it never jumps over a thin wall or a small enemy
          for (let left = f.speed * dt; left > 0 && !f.back; left -= 12) {
            const s = Math.min(12, left)
            f.dir += turn * s * 0.5; f.vx = Math.cos(f.dir) * f.speed; f.vy = Math.sin(f.dir) * f.speed
            f.x += Math.cos(f.dir) * s; f.y += Math.sin(f.dir) * s; f.left -= s; f.dir += turn * s * 0.5
            touch()
            if (f.left <= 0 || f.y >= groundY || inBox(f.x, f.y)) { if (f.left > 0) { burst(f.x, f.y, 8, '#c9d6e2', 170, 2); sound('bounce', null) } f.back = true; f.hits.clear() }
          }
          continue
        }
        const her = f.remote ? null : bodyOf(f.owner)
        const home = f.home ?? (her ? { x: her.x, y: her.y - 90 * her.scale } : null)
        // its owner is gone: it falls where it is
        if (!home) { arrives(f.owned); if (!f.owned.out) pickups.push({ id: nextId++, owned: f.owned, x: f.x, y: f.y, vy: 0, resting: false, noPick: 0.3 }); flights.splice(i, 1); continue }
        const dx = home.x - f.x, dy = home.y - f.y, dist = Math.hypot(dx, dy) || 1
        f.speed = Math.min(f.speed + 2400 * dt, fd.returnSpeed * 1.6)
        if (dist <= Math.max(34, f.speed * dt)) {
          arrives(f.owned); flights.splice(i, 1)
          if (!f.remote) sound('catch', null)
          continue
        }
        // on the way back it swings round her to the same side, less and less as it gets near, so it always arrives
        f.far = Math.max(f.far ?? dist, 1)
        f.dir = Math.atan2(dy, dx) - Math.max(-1, Math.min(1, f.bend * 0.5)) * Math.min(1, dist / f.far)
        f.vx = Math.cos(f.dir) * f.speed; f.vy = Math.sin(f.dir) * f.speed
        f.x += f.vx * dt; f.y += f.vy * dt
        touch()
      }
      if (world) stepHooks(frameDt, { boxes, groundY })
      if (world) stepCards(dt, { boxes, groundY })
      if (world) for (let i = bolts.length - 1; i >= 0; i--) { bolts[i].t += dt; if (bolts[i].t >= bolts[i].life) bolts.splice(i, 1) }

      // pickups: fall to the floor; walking over one only offers it, grab (Pegar) takes it
      hover = null; hoverOwned = null
      const { x: pickupReachX, y: pickupReachY } = pickupReach(body.scale)
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i], dt = frameDt * timeAt(p.x, p.y)
        if (world) p.noPick = Math.max(0, p.noPick - dt)
        if (world && !p.resting) {
          const py = p.y
          p.vy += ITEM_GRAVITY * gravityAt(p.x, p.y) * dt; p.y += p.vy * dt
          const top = landing(boxes, p.x, py, p.y, b => b.solid !== false)
          if (top) { p.y = top.y; p.resting = true; p.vy = 0 }
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
      // Golpe or a Bicada (when it is let go) also stores the new item offered at her body
      // a Gaiola with no room for it (she has CAGES_MAX): it is only offered ("trocar"). Passing over it with Pegar
      // held (running) or a Golpe leaves it there; it is swapped with the one in front only by a whole press of
      // Pegar on it: pressed and let go while it is the item offered
      const fullCage = !!hover?.owned.cage && cages.length >= CAGES_MAX
      if (input.grab && fullCage) cageArm = hover!.id
      else if (cageArm !== null && (input.grab || hover?.id !== cageArm)) cageArm = null
      const cageSwap = !!input.grabReleased && fullCage && cageArm === hover!.id
      if (input.grabReleased) cageArm = null
      const meleePickup = (!!input.melee || peckStarted) && !input.grab && !input.grabHeld && !!hover && !fullCage
      const grabNow = fullCage ? cageSwap : !!input.grab || meleePickup || (!!input.grabHeld && !!hover && !heldTaken.has(hover.id))
      // an item offered at her body (to take or to equip) goes before a Baú
      const itemOffered = !!hover || !!hoverOwned
      if (grabNow && hover && pickups.includes(hover) && (!!hover.owned.cage || roomFor(hover.owned.item) || swapFits(hover.owned.item) || babySwaps(hover.owned.item) || inv.some(o => o.item === hover!.owned.item))) {
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
      // no room in its category and nothing of it in her wing to trade: a word over it says why it stays
      else if (input.grab && hover && !hover.owned.cage && !hoverOwned && room()) addText(hover.x, hover.y - 30, CATEGORY_FULL[ownGroup(hover.owned.item)], '#c9ced6')
      else if (input.grab && hoverOwned && !input.grabRun) {
        // the same item is in her inventory: grab equips it (the one on the floor stays);
        // not when the press is Correr's own key, so running over her items never swaps the one in her hand
        const slot = inv.findIndex(o => o.item === hoverOwned!.owned.item)
        if (slot >= 0 && slot !== cur) { equip(slot); addText(hoverOwned.x, hoverOwned.y - 30, `= ${items[hoverOwned.owned.item].name}`, '#c9ced6') }
      }
      // the nearest closed Baú in her reach: Pegar opens it when no item is offered, also from a key/button shared
      // with Correr (the gamepad's X has no other Pegar)
      let nearChest: Chest | null = null
      for (const c of chests) {
        if (c.open || Math.abs(c.x - body.x) > pickupReachX + CHEST_REACH_X || body.y < c.y - 70 - pickupReachY || body.y > c.y + pickupReachY) continue
        if (!nearChest || Math.abs(c.x - body.x) < Math.abs(nearChest.x - body.x)) nearChest = c
      }
      // (an item offered at her feet hides its hint: Pegar takes the item first)
      if (nearChest && !itemOffered) chestNear.set(active, { chest: nearChest, block: chestBlock(nearChest.params, { keys: keyCount(), souls: cageSouls(cages) }) })
      else chestNear.delete(active)
      if (nearChest && input.grab && !itemOffered) openChest(nearChest)
      // the nearest free fixed instrument in her reach: Pegar sits at it (Correr's shared key too), when no item
      // nor Baú comes first
      if (seated) { hover = null; hoverOwned = null }
      const nearSeat = seated || itemOffered || nearChest || !body.grounded ? null : nearestSeat(seats, body.x, body.y, pickupReachX, pickupReachY)
      if (nearSeat) seatNear.set(active, nearSeat); else seatNear.delete(active)
      if (nearSeat && input.grab && !stoodUp && body.state !== 'held' && !body.state.startsWith('portal')) sit(nearSeat)
      if (!world) return
      // the Baús: the lid eases open or shut, the shiver fades and one that closes again does so after its time
      for (const c of chests) {
        c.lid = c.open ? Math.min(1, c.lid + dt * 4) : Math.max(0, c.lid - dt * 3)
        c.shake = Math.max(0, c.shake - dt)
        if (!c.open) continue
        c.t += dt
        if (c.params.reopen > 0 && c.t >= c.params.reopen) { c.open = false; c.t = 0 }
      }
      // Each rack owns its pickup, so neighbouring racks and dropped copies
      // cannot suppress its refill. A partially collected stack still occupies it.
      racks.forEach(r => {
        if (r.pickupId !== undefined) {
          const active = pickups.find(p => p.id === r.pickupId)
          if (active) {
            if (r.spawnX !== r.x || r.spawnY !== r.y) {
              active.x = r.x; active.y = (r.y ?? groundY) - RACK_ITEM_START; active.vy = 0; active.resting = false
              r.spawnX = r.x; r.spawnY = r.y
            }
            r.t = 0; return
          }
          r.pickupId = undefined; r.t = 0
          if (r.respawnDelay > 0) return
        }
        // its "Limite de reposição": the first item and that many more, then it stays empty
        if (r.refillLimit !== undefined && r.given > r.refillLimit) return
        r.t += dt
        if (r.t + 1e-9 >= r.respawnDelay) {
          r.pickupId = nextId++; r.given++
          r.spawnX = r.x; r.spawnY = r.y
          pickups.push({ id: r.pickupId, owned: fresh(r.item, r.cageSouls), x: r.x, y: (r.y ?? groundY) - RACK_ITEM_START, vy: 0, resting: false, noPick: 0 }); r.t = 0
        }
      })

      // targets: knockback, wobble, fall and come back
      // enemies move; the ones that finished dying leave
      // the owner's enemies (online, another browser owns the lobby) only glide to where the owner has them
      targets.forEach(t => { if (t.mirror) glideMirror(t, dt) })
      targets.forEach(t => { if (t.blast && !t.mirror) { t.x -= t.blast.x; t.y -= t.blast.y } })
      const e = env(groundY, body.x, body.y)
      // each target on the time of where it is (its middle)
      const tdt = (t: { x: number; y: number; h: number }) => frameDt * timeAt(t.x, t.y - t.h / 2)
      stepFormations(targets.some(t => t.mirror) ? targets.filter(t => !t.mirror) : targets, dt, e, (x, y) => timeAt(x, y))
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if ((t.kind === 'alien' || t.kind === 'zombie') && !t.mirror && !stepEnemy(t, tdt(t), e)) targets.splice(i, 1)
      }
      // the undead: fall, lie, get up and wander, fly as birds (and whistle), leave once the music ends
      targets.push(...pendingUndead.splice(0))
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if (t.kind !== 'undead' || t.mirror) continue
        const u = t.data as UndeadState, dt = tdt(t)
        t.animT += dt
        // an undead bird may rest on a wire after circling a while, and runs from whoever comes near
        if (u.bird && u.perch !== null && perchWorld?.spans.length && t.deadT <= 0) {
          const type = BIRDS[u.bird], pp = birdPerchParams(type.perch)
          if (u.perch === undefined && u.phase === 'bird' && u.t > 2.5) u.perch = Math.random() < pp.perchChance ? perchStart(perchWorld, t.x, t.y - t.h / 2, pp) : null
          if (u.perch) {
            const pos = { x: t.x, y: t.y - t.h / 2, face: t.face }
            if (perchStep(perchWorld, u.perch, pos, dt, pp) === 'done') { u.perch = null; u.phase = 'leave'; u.t = 0; u.dir = pos.face >= 0 ? 1 : -1 }
            else {
              t.x = pos.x; t.y = pos.y + t.h / 2; t.face = pos.face; t.animT += dt
              u.whistleIn -= dt
              if (u.whistleIn <= 0) { u.whistleIn = whistleTime(type); whistle(t.x, t.y - t.h / 2, type, u.params.mode) }
              if (type.poop) undeadPoops(t, u, type.poop, dt)
              continue
            }
          }
        }
        if (!stepUndead(t, u, dt, { boxes, groundY, viewL: view.l, viewR: view.r, playing, rand: Math.random, gravity: gravityAt })) { targets.splice(i, 1); continue }
        if (u.bird && u.phase === 'bird' && t.deadT <= 0) {
          const type = BIRDS[u.bird]
          u.whistleIn -= dt
          if (u.whistleIn <= 0) { u.whistleIn = whistleTime(type); whistle(t.x, t.y - t.h / 2, type, u.params.mode) }
          if (type.poop) undeadPoops(t, u, type.poop, dt)
        }
      }
      targets.forEach(t => {
        if (t.kind !== 'dummy' && t.kind !== 'button') return
        const dt = tdt(t)
        t.flash = Math.max(0, t.flash - dt)
        if (t.press) stepPress(t.press, dt)
        if (t.kind === 'button') return
        t.wobble *= Math.pow(0.02, dt)
        t.x += t.vx * dt; t.vx *= Math.pow(0.004, dt)
        t.x += (t.home - t.x) * Math.min(1, 1.5 * dt)
        if (t.dummy) { t.dummy.tipT = Math.max(0, t.dummy.tipT - dt); t.dummy.crackT = Math.max(0, t.dummy.crackT - dt) }
      })

      targets.forEach(t => {
        if (!t.blast || t.mirror) return
        // (one a hook is pulling moves only with the pull)
        if (!hooked.has(t)) stepBlastMotion(t.blast, tdt(t))
        t.x += t.blast.x; t.y += t.blast.y
      })

      // every target: the stillness of a note wears off; answers cool down
      targets.forEach(t => {
        const dt = tdt(t)
        if (t.stun && !t.mirror) t.stun = Math.max(0, t.stun - dt); if (t.answerCool) t.answerCool = Math.max(0, t.answerCool - dt)
        if (t.shock && (t.shock.left -= dt) <= 0) t.shock = undefined
      })
      // converted enemies leave: birds flap up and away, people run off with little hops
      for (let i = critters.length - 1; i >= 0; i--) {
        const c = critters[i], dt = frameDt * timeAt(c.x, c.y)
        c.t += dt
        const type = c.kind === 'bird' && c.bird ? BIRDS[c.bird] : null
        // a wild bird of a type with the power lets its droppings fall on any boneco under it
        if (type?.poop) birdPoops(c, type.poop.every, type.poop.damage, c.perch ? 0 : c.vx, null, false, true, dt)
        // when it would leave, it may rest on a wire of the Postes and Torres instead (and run from whoever comes near)
        if (type && c.perch === undefined && perchWorld?.spans.length && c.t >= (type.flight === 'leave' ? 0.6 : type.stay)) {
          const pp = birdPerchParams(type.perch)
          c.perch = Math.random() < pp.perchChance ? perchStart(perchWorld, c.x, c.y, pp) : null
        }
        if (type && c.perch && perchWorld) {
          if (perchStep(perchWorld, c.perch, c, dt, birdPerchParams(type.perch)) === 'done') {
            // off the wires: it flies away as it would have
            c.perch = null; c.t = type.stay; c.vx = c.face * rand(110, 160); c.vy = -rand(140, 200)
          } else {
            if (c.whistleIn !== undefined) { c.whistleIn -= dt; if (c.whistleIn <= 0) { c.whistleIn = whistleTime(type); whistle(c.x, c.y, type, null) } }
            continue
          }
        }
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
      // the souls flying free: each one flies with its owner; called back, it leaves for their Gaiola in its turn
      soulClock += dt
      // what they do needs each owner's fall, the floors and the beat; what they did to a player wears off
      actGround = ctx
      for (const id of new Set(freed.map(f => f.owner))) trackFall(id, dt)
      aimSways.forEach((j, id) => { j.left -= dt; if (j.left <= 0) aimSways.delete(id) })
      detunes.forEach((d, id) => { d.left -= dt; if (d.left <= 0) detunes.delete(id) })
      locks.forEach((left, id) => { if (left > dt) locks.set(id, left - dt); else locks.delete(id) })
      const beatNow = Math.floor(music.beat), onBeat = !Number.isNaN(actBeat) && beatNow !== actBeat
      actBeat = beatNow
      for (let i = freed.length - 1; i >= 0; i--) {
        const f = freed[i]
        f.t += dt
        if (f.away !== null) {
          // its owner left the game: it flies up and away
          f.away += dt; f.brain.vy = Math.max(-260, f.brain.vy - 240 * dt); f.x += f.face * 130 * dt; f.y += f.brain.vy * dt
          if (f.away > 5) freed.splice(i, 1)
          continue
        }
        // its owner is in a portal: it is sucked in with them (from where it was to the portal's centre, shrinking) and
        // waits inside; it comes out with them, small as when let out, or pops back by them if they never left
        const transit = soulPortals.get(f.owner)
        if (transit?.mode === 'enter') {
          if (!f.portal) { letGo(f); f.recallIn = null; f.portal = { x: f.x, y: f.y } }
          const u = transit.k * transit.k * (3 - 2 * transit.k)
          f.x = f.portal.x + (transit.x - f.portal.x) * u; f.y = f.portal.y + (transit.y - f.portal.y) * u; f.k = 1 - u
          continue
        }
        if (f.portal) {
          const owner = bodyOf(f.owner)
          const at = transit ?? (owner ? { x: owner.x, y: owner.y - 90 * owner.scale } : null)
          if (!at) continue
          f.portal = null; f.k = undefined
          f.x = at.x; f.y = at.y; f.t = 0; f.brain = createSoulBrain(at.x, at.y, f.params); f.roam = newSoulRoam(f.params); f.clock = newActClock(f.act)
        }
        if (f.recallIn !== null) {
          f.recallIn -= dt
          // its turn: it leaves for the cage that takes it; with none left (they filled up meanwhile) it stays out
          const cage = f.recallIn <= 0 ? cageFor(f.owner) : null
          if (f.recallIn <= 0 && !cage) f.recallIn = null
          else if (cage) { letGo(f); freed.splice(i, 1); abductions.push({ soul: f.soul, owner: f.owner, x: f.x, y: f.y, t: 0, cage }); sound('puff', null); continue }
        }
        const her = bodyOf(f.owner)
        if (!her) continue
        // called back, it drops everything; off doing something, it does not follow
        if (f.job && (f.recallIn !== null || !soulJobStep(f, her, dt))) letGo(f)
        if (f.job) { roamLift(f.roam); continue }
        // out exploring (on its way to a wire, a tree, a platform or an object, or resting there), it does not follow
        if (!soulRoamStep(f.roam, f.brain, f, her, f.params, perchWorld, dt)) soulFollowStep(f.brain, f, her, f.params, { beat: beatNow, air: soulAir }, dt)
        // it keeps away from the other players (never from its owner); called back, it minds nobody
        if (f.recallIn === null) soulFleeStep(f.roam, f.brain, f, strangerNear(f), f.params, perchWorld, soulAir, dt)
        if (f.recallIn === null) {
          soulActs(f, her, dt, onBeat)
          birdPoops(f, f.act.poopEvery, f.act.poopDamage, f.brain.vx, f.owner, f.act.poopSpare, true, dt)
        }
      }
      spreadSouls(freed, dt)
      stepPoops(dt)
      // online: the other browsers' souls glide to where they are; what was asked and never answered is forgotten
      for (const m of soulMirrors) glideSoulMirror(m, dt)
      asked.forEach((a, key) => { if ((a.t += dt) > TAKE_WAIT * 2) asked.delete(key) })
      takenFoes.forEach((left, id) => { if (left > dt) takenFoes.set(id, left - dt); else takenFoes.delete(id) })
      // souls on their way: each one counts in the cage that kept its place when it gets there (it glows blue). A cage
      // that left its player meanwhile gives the place to another of theirs; with nowhere to go, the soul flies free
      for (const a of stepAbductions(abductions, dt)) {
        const theirs = cagesOf(a.owner)
        const cage = a.cage && a.cage.souls.length < a.cage.cap && theirs.some(o => o.cage === a.cage) ? a.cage : cageFor(a.owner)
        if (cage) { cage.souls.push(a.soul); flashCage(cage, 'gain') }
        else if (a.soul.species === 'chick') chickReleases.push({ soul: a.soul, owner: a.owner, x: a.x, y: a.y })
        else flyFree(a.soul, a.owner, a.x, a.y)
      }
      // the scared birds land where they were going
      stepScares(scares, dt)
      // every cage's glow and way in (the ones lying in the world keep still), and the shake of a catch that did not fit
      cageDeny = Math.max(0, cageDeny - dt)
      for (const o of cages) stepCage(o.cage!, dt)
      loadouts.forEach((l, id) => { if (id === active) return; l.cageDeny = Math.max(0, l.cageDeny - dt); for (const o of l.cages) stepCage(o.cage!, dt) })
      for (let i = puffs.length - 1; i >= 0; i--) { puffs[i].t += dt; if (puffs[i].t >= puffs[i].life) puffs.splice(i, 1) }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.life <= 0) sparks.splice(i, 1) }
      for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) texts.splice(i, 1) }
    },
  }
}

export type Combat = ReturnType<typeof createCombat>
