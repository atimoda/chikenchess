// PigChicKen items: weapons and instruments share one sheet of numbers. An instrument is its weapon family's
// sheet with a music block: the projectile is a note, and notes convert (fill the harmony bar) instead of
// destroying. The Parquinho's item popup edits these sheets; they are saved in this browser for now.
import { COMBO_WINDOW, cleanCombo, isSwingKind, swingCombo, type BlowKind, type ComboStep } from './swing'
import type { PitchSet } from './music'
import { cleanScales, type InstrumentScaleId } from './instrument-scales'
import type { VoiceId } from './synth'
import DEFAULTS_FILE from '../../data/pigchicken/default-items.json'
import { CHAIN_MAX, cleanTransform, newTransform, type Transform, type TransformKind } from './transforms'

export type FireMode = 'semi' | 'auto' | 'burst' | 'charge' | 'release'
// when the projectile's path is drawn: never, while the fire button is held, held or with the aim locked, always
export type PathShow = 'off' | 'hold' | 'holdAim' | 'always'
export const PATH_SHOWS: { value: PathShow; label: string }[] = [
  { value: 'off', label: 'Escondido' }, { value: 'hold', label: 'Com o tiro segurado' }, { value: 'holdAim', label: 'Tiro segurado ou mira travada' }, { value: 'always', label: 'Sempre' },
]
export type ItemId = 'wing' | 'peck' | 'bat' | 'pistol' | 'smg' | 'rifle' | 'pump' | 'sniper' | 'launcher' | 'grenade' | 'bow'
  | 'flute' | 'sax' | 'trumpet' | 'guitar' | 'violin' | 'keys' | 'tambourine' | 'harp' | 'hangdrum'
  | 'maryjane' | 'cok' | 'passagua' | 'mjolnir' | 'odinstaff' | 'key' | 'boomerang' | 'cardsRed' | 'cardsBlue'
  | 'cage' | 'cageWire' | 'cageConcorde' | 'cageWood' | 'cageArch' | 'cageFlight'
// how an instrument walks through the notes shot after shot (off: the aim alone picks the note)
export type Arp = 'off' | 'up' | 'down' | 'updown' | 'random' | 'phrase'
// each family's reticle shows what matters for it
export type Reticle = 'dot' | 'circle' | 'cross' | 'cone' | 'laser' | 'impact' | 'grenade' | 'bow'
// consumables: how her walk / run picks up speed while the effect lasts. linear: at a steady rate (her own
// acceleration); superIn ("ease-super-in"): it starts slow and ends fast, reaching full speed in `effectRamp` seconds
export type AccelCurve = 'linear' | 'easeIn' | 'superIn'
export const ACCEL_CURVES: { value: AccelCurve; label: string; power: number }[] = [
  { value: 'linear', label: 'Linear (a aceleração dela)', power: 1 },
  { value: 'easeIn', label: 'Ease in (começa devagar)', power: 2 },
  { value: 'superIn', label: 'Ease super in (lento, depois rápido)', power: 3 },
]
// the state an effect puts her in (drawn on her): buddha: a golden halo, a calm glow and half-closed eyes; fizz: bubbles
export type EffectLook = 'none' | 'buddha' | 'fizz'
export const EFFECT_LOOKS: { value: EffectLook; label: string }[] = [
  { value: 'none', label: 'Nenhum' }, { value: 'buddha', label: 'Estado búdico (auréola dourada)' }, { value: 'fizz', label: 'Gás (bolhinhas)' },
]

export type ItemDef = {
  id: ItemId
  name: string
  family: string
  reticle: Reticle
  pathShow: PathShow
  landShow: PathShow // launchers and grenades: where it lands and the blast's circle (same options as the path)
  // firing
  fireMode: FireMode
  rate: number // shots per second
  burst: number // shots per press in burst mode
  burstHold: boolean // burst mode: the burst only goes on while Atirar is held (letting go stops it)
  mag: number // shots per magazine (0 = no ammo, never reloads)
  reloadTime: number // s
  autoReload: boolean
  slideFire: boolean // can fire while sliding
  shellReload: boolean // reloads one shot at a time (reloadTime each); firing stops it
  // gradual auto reload: every `refillTime` s without using it, `refillAmount` shots come back on their own (0 = off)
  refillTime: number
  refillAmount: number
  meleeOnly: boolean // only for hitting (the taco): Atirar swings it too, and each blow uses one of its `mag`
  chargeTime: number // charge mode: s to full charge (force and precision grow with it)
  chargeMin: number // charge mode: share of the speed with no charge
  // projectile
  speed: number // px/s
  drop: number // projectile drop (gravity, px/s²); 0 = straight line
  damage: number
  pierce: number // targets it goes through
  range: number // px before it fades
  size: number // px
  pellets: number // projectiles per shot, spread across the cone
  hitscan: boolean // the shot arrives at once (it still stops at walls)
  explodeRadius: number // px; 0 = no explosion
  explodePush: number // radial impulse, px/s at the centre; 0 disables knockback
  explodeDamage: number // at the centre, fading to the edge
  fuse: number // s before it explodes; 0 = on impact
  bounce: number // speed kept when bouncing off the floor (with a fuse)
  // spread (degrees)
  spreadBase: number
  spreadShot: number // added per shot
  spreadMax: number
  spreadRecover: number // per second
  spreadMove: number // added while walking
  spreadAir: number // added in the air
  crouchMult: number
  broodMult: number
  // feel
  recoilKick: number // px the weapon jumps back
  recoilPush: number // px/s pushing her away from the shot, only in the air
  weight: number // walking speed multiplier
  turnRate: number // deg/s the aim can turn (0 = instant)
  // art (rig units, on the item's drawing: x forward from the grip, y down)
  muzzleX: number // where the shot leaves and the aim line starts
  muzzleY: number
  length: number // how far the item reaches past the wing tip in a melee swing
  // melee (Y / right click)
  meleeDamage: number
  meleeRange: number // px
  meleeArc: number // degrees: the Bicada's cone (the other items' blows take their arc from the combo)
  meleeCooldown: number // s
  meleeInterrupt: boolean // a blow pressed while the last one is still going cuts it off and starts at once
  meleeTime: number // s the swing takes to sweep its arc
  durability: number // melee hits on a target before it breaks (0 = never)
  meleePush: number // knockback px/s
  // the combo: the blows in a row, each with its direction and hit arc (degrees; the spin always 360), and how
  // long after a blow the next still carries it on (s)
  combo: ComboStep[]
  comboWindow: number
  // the blow's air trail: thickness at the tip (px), colour, seconds it takes to dissolve, little curls, opacity
  trailWidth: number
  trailColor: string
  trailTime: number
  trailWisps: number
  trailOpacity: number
  peckPull: number // rig units the neck retracts while preparing a peck
  // the rebate (guitar hero mode): the chain of transformations a note it rebates goes through, how far the note
  // is pulled toward the nearest character (snap: degrees, 0 = off; force 0..1), how fast it flies off (×), and
  // the wooden "tok" of a real hit
  rebateChain: Transform[]
  rebateSnap: number
  rebateSnapForce: number
  rebateSpeed: number
  rebateTok: boolean
  // Throw: per-item launch strength, charge time and impact damage
  throwDamage: number
  throwMin: number // px/s with no charge (a tap)
  throwSpeed: number // px/s at full charge
  throwCharge: number // s to full charge
  // music (instruments only): damage above is the harmony each note adds
  instrument: boolean
  voice: VoiceId
  pitchSet: PitchSet // notes from the chord playing now, or from the whole scale
  octave: number // register: 0 = around middle C
  span: number // octaves the aim covers, from pointing down to pointing up
  arp: Arp
  arpRate: number // notes per second of the arpeggio / phrase on one press (burst and auto)
  noteLen: number // s each note sounds
  wave: number // px the note sways sideways as it flies
  quantize: boolean // pull the sound to the next sixteenth (at most quantWindow)
  quantWindow: number // ms
  beatBonus: number // harmony multiplier for a shot on the beat
  beam: boolean // a held, sustained note in a beam (violin): the magazine is seconds of bow
  stun: number // s an enemy stays still after a note (the beam keeps it still while it plays)
  strum: number // s between the notes of a chord (pellets)
  ringNotes: number // notes it lets out in a circle when it bursts (with a fuse or on impact)
  gliss: boolean // charge plays a glissando and the note rises with the charge (harp)
  tremolo: number // 0..1: shaking the aim inside a lane of the fan bends the note (lib/pigchicken/tremolo.ts); 0 = off
  tremoloRange: number // semitones the tremolo can bend a note each way
  // the natural vibrato of its notes (lib/pigchicken/synth.ts Vibrato): cents the pitch sways each way (0 = a straight
  // note), sways per second, and seconds after the note starts before it comes in
  vibratoDepth: number
  vibratoRate: number
  vibratoDelay: number
  volMin: number // 0..1: loudness of its notes with the aim close to her (lib/pigchicken/aim-volume.ts)
  volMax: number // 0..1: with the aim far; equal to volMin = the distance changes nothing
  meleeNotes: number // notes of the blow's strum, from the aim's lane note up the chord (1 = just that note)
  fretless: boolean // no frets (violin): the bend is free and changing lane slides instead of jumping
  // the scales the aim can play (lib/pigchicken/instrument-scales.ts), in order; the quick switch goes through them
  // before the next item
  scales: InstrumentScaleId[]
  spiralDescending: boolean // the Espiral from the highest note (outside) to the lowest (inside)
  // the Hangdrum scale: rows of notes around the ding (1 or 2) and the notes in the first and second rows (5 to 9)
  hangRows: number
  hangNotes: number
  hangNotes2: number
  // consumables (Fire uses one dose; `mag` is the doses per pickup; stacks have a per-item limit). One effect at a time:
  // a new one replaces the one running
  consumable: boolean
  cageSouls: number // a Gaiola (lib/pigchicken/cages.ts): how many souls fit in it; 0: not a cage
  consumeKind: 'food' | 'liquid'
  effectTime: number // s the effect lasts
  effectSpeed: number // × her final speed (walk, run, in the air)
  effectAccel: number // × her acceleration
  effectCurve: AccelCurve
  effectRamp: number // s to full speed with an eased curve
  effectLook: EffectLook
  // how it sits on her (rig units, on the item's drawing like the muzzle): the turning point (`pivot`) is placed on a
  // body part (`pivotAt`: the shoulder, where items always were, or the mouth for the wind instruments) and the item turns
  // around it with the aim; the wing's hand holds it at `hand` and the back wing's at `back` (each only when on),
  // turning and stretching the wing so its tip always touches that point, like the violin's bow
  pivotAt: PivotPart
  pivotX: number
  pivotY: number
  handOn: boolean
  handX: number
  handY: number
  backOn: boolean
  backX: number
  backY: number
  // "Arco e Flecha": while Fire charges, the wing's hand pulls its point (`hand`, where it holds the arrow) straight
  // back along the item, up to `drawLen` rig units at the full charge; the arrow and the string follow it and the item
  // itself stays where it is, held by the back wing (lib/pigchicken/held-pose.ts)
  archery: boolean
  drawLen: number
  wingFlip: boolean // the wings that hold it are flipped vertically (mirrored along their length), for poses that turn them upside down
  // a staff (an item only for hitting: taco, passaguá): how she carries it. The wing's hand grips the point `grip` of
  // its drawing; that point sits at (staffX, staffY) from her shoulder (rig units, x to her front, y down) with the
  // staff turned to `staffAngle` (degrees, 0 = pointing to her front, -90 = up). `wind*`: the same three at the full
  // charge of the strong blow (lib/pigchicken/staff-pose.ts)
  gripX: number
  gripY: number
  staffX: number
  staffY: number
  staffAngle: number
  windX: number
  windY: number
  windAngle: number
  // the strong blow (Atirar with a staff): held to charge, it comes out when the button is let go. Its own numbers,
  // like the quick blow's (Golpe); the longer the charge (up to `heavyCharge` s), the further it reaches (up to
  // `heavyReachMax` × its reach) and the bigger the staff and its air get (up to `heavySizeMax` ×)
  heavyDamage: number
  heavyRange: number // px
  heavyArc: number // degrees
  heavyCooldown: number // s
  heavyTime: number // s the whole move takes
  heavyPush: number // knockback px/s
  heavyKind: BlowKind
  heavyCharge: number
  heavyReachMax: number
  heavySizeMax: number
  heavyTrailWidth: number
  heavyTrailTime: number
  heavyTrailWisps: number
  heavyTrailOpacity: number
  // the shock of a lightning weapon (lib/pigchicken/shock.ts): whoever a blow hits is shocked, and the shock jumps
  // from one to the nearest next within `shockRange` px (0 = no shock), up to `shockJumps` times. The ones it reaches
  // shake for `shockTime` s (the strong blow has its own range and time), take `shockDamage` and lose `shockDrain`
  // of their harmony bar
  shockRange: number
  shockJumps: number
  shockTime: number
  shockDamage: number
  shockDrain: number
  heavyShockRange: number
  heavyShockTime: number
  // the special: the first blow that hits someone after `specialCooldown` s (0 = no special) shocks with these
  // numbers, with thunder or lightning, and leaves the ones it reaches in the x-ray state for `specialTime` s
  specialCooldown: number
  specialRange: number
  specialJumps: number
  specialTime: number
  specialDamage: number
  specialKind: SpecialKind
  // a staff that is thrown and comes back (Atirar, in place of the strong blow): held to charge, it flies straight
  // from `returnMin` of `returnRange` px (no charge) to all of it (`returnCharge` s), then back to her wing
  returnThrow: boolean
  returnDamage: number
  returnRange: number
  returnMin: number
  returnSpeed: number // px/s
  returnCharge: number // s
  returnPush: number // knockback px/s
  // its curve (lib/pigchicken/return-flight.ts), degrees a leg bends: the least, with nobody steering (0: straight
  // out and back), and the most, with the aim turned far from where it was thrown to
  returnCurveMin: number
  returnCurveMax: number
  // how many of it can be away at once (the Boomerang: two, one in each hand; a deck: its cards). The next one only
  // leaves her wing when there is one in it
  returnCount: number
  // a deck of cards (lib/pigchicken/cards.ts): Atirar throws its next card to where she aims, where it stays floating
  // until it touches someone and bursts (its Explosão numbers; an instrument's deck bursts in the note it was thrown
  // with). `deckLeash`: px from a card at which its owner is too far and it flies back to her; `deckBig`: × the burst's
  // radius for the cards that burst on their own when they arrive (the 7 and the Ás); `deckTouch`: px around a card
  // that touch someone; `deckGap`: s between two cards with Atirar held
  deck: boolean
  deckLeash: number
  deckBig: number
  deckTouch: number
  deckGap: number
}
// what a special sounds and looks like: thunder (a bolt from the sky and its rumble) or lightning (long crackling arcs)
export type SpecialKind = 'thunder' | 'lightning'
export const SPECIAL_KINDS: { value: SpecialKind; label: string }[] = [{ value: 'thunder', label: 'Trovão (raio do céu)' }, { value: 'lightning', label: 'Raio (arcos longos)' }]
/** A staff: an item only for hitting, carried in its own pose and with a strong blow on Atirar. */
export const isStaff = (d: ItemDef) => d.meleeOnly
// the body parts a held item can turn around
export type PivotPart = 'shoulder' | 'mouth'
// the rig the chicken's engine draws it with: the pivot on a body part and the wings' touch points (null: as always,
// turning around the shoulder with the wing following the aim)
// `draw`: how far back (rig units) the wing's hand has pulled its point ("Arco e Flecha")
export function itemRig(d: ItemDef, draw = 0): { at: PivotPart; x: number; y: number; hand: { x: number; y: number } | null; back: { x: number; y: number } | null; flip: boolean } | null {
  if (d.pivotAt === 'shoulder' && !d.pivotX && !d.pivotY && !d.handOn && !d.backOn) return null
  return { at: d.pivotAt, x: d.pivotX, y: d.pivotY, hand: d.handOn ? { x: d.handX - draw, y: d.handY } : null, back: d.backOn ? { x: d.backX, y: d.backY } : null, flip: d.wingFlip }
}
export const PIVOT_PARTS: { value: PivotPart; label: string }[] = [{ value: 'shoulder', label: 'Ombro (padrão)' }, { value: 'mouth', label: 'Boca (bico)' }]

// the air a blow leaves behind: cream, like the reference
export const TRAIL_CREAM = '#fff4dc'

// defaults that keep weapons out of the music block
const NO_MUSIC = {
  peckPull: 38, instrument: false, voice: 'flute' as VoiceId, pitchSet: 'chord' as PitchSet, octave: 0, span: 2, arp: 'off' as Arp, arpRate: 10, noteLen: 0.25, wave: 6,
  quantize: true, quantWindow: 60, beatBonus: 1.5, beam: false, stun: 0, strum: 0.018, ringNotes: 0, gliss: false, tremolo: 0, tremoloRange: 0.5, vibratoDepth: 0, vibratoRate: 5.5, vibratoDelay: 0.15, volMin: 1, volMax: 1, meleeNotes: 3, fretless: false, scales: ['primary'] as InstrumentScaleId[], spiralDescending: false,
  hangRows: 1, hangNotes: 8, hangNotes2: 7,
  consumable: false, cageSouls: 0, consumeKind: 'food' as const, effectTime: 0, effectSpeed: 1, effectAccel: 1, effectCurve: 'linear' as AccelCurve, effectRamp: 0.5, effectLook: 'none' as EffectLook,
  pivotAt: 'shoulder' as PivotPart, pivotX: 0, pivotY: 0, handOn: false, handX: 0, handY: 0, backOn: false, backX: 0, backY: 0, wingFlip: false, archery: false, drawLen: 30,
  gripX: 0, gripY: 0, staffX: 38, staffY: 34, staffAngle: -135, windX: -34, windY: -44, windAngle: -205,
  heavyDamage: 30, heavyRange: 80, heavyArc: 170, heavyCooldown: 0.15, heavyTime: 0.4, heavyPush: 500, heavyKind: 'down' as BlowKind,
  heavyCharge: 1, heavyReachMax: 1.5, heavySizeMax: 1.6, heavyTrailWidth: 34, heavyTrailTime: 0.3, heavyTrailWisps: 6, heavyTrailOpacity: 0.8,
  shockRange: 0, shockJumps: 3, shockTime: 0.35, shockDamage: 0, shockDrain: 0, heavyShockRange: 0, heavyShockTime: 0.6,
  specialCooldown: 0, specialRange: 260, specialJumps: 6, specialTime: 3, specialDamage: 20, specialKind: 'thunder' as SpecialKind,
  returnThrow: false, returnDamage: 30, returnRange: 700, returnMin: 0.5, returnSpeed: 1300, returnCharge: 0.8, returnPush: 500, returnCurveMin: 0, returnCurveMax: 0,
  returnCount: 1, deck: false, deckLeash: 700, deckBig: 2, deckTouch: 26, deckGap: 0.2,
}

// a rebate chain from [kind, mode, n?] steps (always happening)
function chain(...steps: [TransformKind, string?, number?][]): Transform[] {
  return steps.map(([kind, mode, n]) => ({ ...newTransform(kind), ...(mode !== undefined ? { mode } : {}), ...(n !== undefined ? { n } : {}) }))
}

const PISTOL: ItemDef = {
  id: 'pistol', name: 'Pistola', family: 'Pistola', reticle: 'dot', pathShow: 'off', landShow: 'always',
  fireMode: 'semi', rate: 6, burst: 3, burstHold: true, mag: 12, reloadTime: 1.1, autoReload: true, slideFire: true, shellReload: false, refillTime: 0, refillAmount: 1, meleeOnly: false, chargeTime: 0.1, chargeMin: 0.3,
  speed: 1500, drop: 0, damage: 12, pierce: 0, range: 1100, size: 3, pellets: 1, hitscan: false, explodeRadius: 0, explodeDamage: 0, explodePush: 0, fuse: 0, bounce: 0,
  spreadBase: 1.5, spreadShot: 2.2, spreadMax: 9, spreadRecover: 14, spreadMove: 1.5, spreadAir: 3, crouchMult: 0.7, broodMult: 0.5,
  recoilKick: 7, recoilPush: 60, weight: 1, turnRate: 0,
  muzzleX: 54, muzzleY: -7, length: 56,
  meleeDamage: 18, meleeRange: 95, meleeArc: 110, meleeCooldown: 0, meleeInterrupt: true, meleeTime: 0.2, durability: 0, meleePush: 260,
  combo: swingCombo(110), comboWindow: COMBO_WINDOW,
  trailWidth: 24, trailColor: TRAIL_CREAM, trailTime: 0.2, trailWisps: 4, trailOpacity: 0.7,
  rebateChain: chain(['dynamics', 'staccato']), rebateSnap: 15, rebateSnapForce: 0.4, rebateSpeed: 1, rebateTok: false,
  throwDamage: 25, throwMin: 275, throwSpeed: 1100, throwCharge: 1,
  ...NO_MUSIC,
}

const SMG: ItemDef = {
  ...PISTOL, id: 'smg', name: 'Submetralhadora', family: 'SMG', reticle: 'circle',
  fireMode: 'auto', rate: 14, mag: 35, reloadTime: 1.4,
  speed: 1600, damage: 6, range: 900, size: 2,
  spreadBase: 3, spreadShot: 0.8, spreadMax: 12, spreadRecover: 18, spreadMove: 2, spreadAir: 3,
  recoilKick: 3, recoilPush: 30, weight: 0.98,
  muzzleX: 62, muzzleY: -6.5, length: 70, meleeDamage: 16, durability: 0, throwDamage: 22,
  rebateChain: chain(['ratchet', undefined, 4]),
}

const RIFLE: ItemDef = {
  ...PISTOL, id: 'rifle', name: 'Rifle', family: 'Rifle', reticle: 'cross',
  fireMode: 'auto', rate: 9, mag: 30, reloadTime: 1.8,
  speed: 2200, damage: 14, pierce: 1, range: 1600,
  spreadBase: 1, spreadShot: 1.2, spreadMax: 10, spreadRecover: 14, spreadMove: 3, spreadAir: 5,
  recoilKick: 5, recoilPush: 50, weight: 0.92, turnRate: 720,
  muzzleX: 106, muzzleY: -5.5, length: 110, meleeDamage: 22, durability: 0, throwDamage: 28,
  rebateChain: chain(['transpose', 'degree', 4]),
}

const PUMP: ItemDef = {
  ...PISTOL, id: 'pump', name: 'Escopeta (pump)', family: 'Pump', reticle: 'cone',
  fireMode: 'semi', rate: 1.25, mag: 6, reloadTime: 0.45, shellReload: true,
  speed: 1400, damage: 9, range: 520, pellets: 8,
  spreadBase: 14, spreadShot: 0, spreadMax: 18, spreadRecover: 30, spreadMove: 2, spreadAir: 3,
  recoilKick: 12, recoilPush: 420, weight: 0.9, turnRate: 540,
  muzzleX: 104, muzzleY: -8, length: 105, meleeDamage: 25, durability: 0, throwDamage: 30,
  rebateChain: chain(['voices', 'cluster']), rebateSnap: 60, rebateSnapForce: 0.6,
}

const SNIPER: ItemDef = {
  ...PISTOL, id: 'sniper', name: 'Sniper', family: 'Sniper', reticle: 'laser',
  fireMode: 'release', pathShow: 'holdAim', rate: 0.83, mag: 5, reloadTime: 2.2,
  speed: 4000, damage: 90, pierce: 10, range: 3000, size: 2, hitscan: true,
  spreadBase: 0.3, spreadShot: 6, spreadMax: 8, spreadRecover: 4, spreadMove: 6, spreadAir: 10, crouchMult: 0.5, broodMult: 0.2,
  recoilKick: 14, recoilPush: 250, weight: 0.85, turnRate: 360,
  muzzleX: 142, muzzleY: -4, length: 140, meleeDamage: 20, durability: 0, throwDamage: 30,
  rebateChain: chain(['octave', 'fixed', 2], ['dynamics', 'staccato']), rebateSnap: 0,
}

const LAUNCHER: ItemDef = {
  ...PISTOL, id: 'launcher', name: 'Lança-foguetes', family: 'Lançadores', reticle: 'impact',
  fireMode: 'semi', rate: 1, mag: 1, reloadTime: 1.6,
  speed: 900, damage: 0, range: 1600, size: 6, explodeRadius: 130, explodeDamage: 80, explodePush: 1100,
  spreadBase: 1, spreadShot: 0, spreadMax: 2, spreadMove: 1, spreadAir: 2,
  recoilKick: 16, recoilPush: 500, weight: 0.8, turnRate: 300,
  muzzleX: 96, muzzleY: -17, length: 120, meleeDamage: 26, durability: 0, throwDamage: 35,
  rebateChain: chain(['echo', 'dotted', 3]),
}

const GRENADE: ItemDef = {
  ...PISTOL, id: 'grenade', name: 'Granada', family: 'Granadas', reticle: 'grenade', pathShow: 'hold', landShow: 'hold',
  fireMode: 'charge', rate: 1.5, mag: 3, reloadTime: 2.5, chargeTime: 0.8, chargeMin: 0.3,
  speed: 1100, drop: 1500, damage: 0, range: 3000, size: 8, explodeRadius: 140, explodeDamage: 90, explodePush: 1250, fuse: 2.5, bounce: 0.45,
  spreadBase: 0, spreadShot: 0, spreadMax: 1, spreadMove: 0.5, spreadAir: 1,
  recoilKick: 0, recoilPush: 0,
  muzzleX: 8, muzzleY: -4, length: 0, meleeDamage: 10, meleeRange: 80, durability: 0, throwDamage: 15,
  rebateChain: chain(['octave', 'random', 1]),
}

const BOW: ItemDef = {
  ...PISTOL, id: 'bow', name: 'Arco', family: 'Arco', reticle: 'bow', pathShow: 'hold',
  fireMode: 'charge', rate: 2, mag: 12, reloadTime: 1.5, chargeTime: 0.9, chargeMin: 0.25,
  speed: 1700, drop: 900, damage: 40, range: 2500,
  spreadBase: 0.5, spreadShot: 0, spreadMax: 3, spreadMove: 1, spreadAir: 2,
  recoilKick: 0, recoilPush: 0,
  muzzleX: 28, muzzleY: 0, length: 40, meleeDamage: 12, durability: 0, throwDamage: 15,
  // held like a real bow: the grip out in front of her in the back wing, the front wing on the arrow's nock
  archery: true, drawLen: 30, pivotX: -74, handOn: true, handX: -12, handY: 0, backOn: true, backX: 1, backY: 0,
  rebateChain: chain(['counter', 'thirds', 1]), rebateSnap: 0,
}

// Empty hands: Golpe keeps the wing slap; Fire prepares a separate beak strike.
const WING: ItemDef = {
  ...PISTOL, id: 'wing', name: 'Asa (sem item)', family: 'Sem item',
  mag: 0, rate: 2.5, damage: 0, recoilKick: 0, recoilPush: 0, muzzleX: 0, muzzleY: 0, length: 0,
  meleeDamage: 8, meleeRange: 80, meleeArc: 120, combo: swingCombo(120), meleeCooldown: 0, durability: 0, meleePush: 180, throwDamage: 0,
  trailWidth: 18, trailWisps: 3,
  rebateChain: chain(['dynamics', 'soft']), rebateSnap: 25, rebateSnapForce: 0.5,
}

// Taco: only for hitting (no shots). A baseball bat: a wide arc, a quick blow, a long reach; a rebate goes off
// faster with a wooden "tok", and its chain keeps the note and only accents it (the neutral taco). It has 8 blows
// in a row (its "bullets"), which come back one every half second, or all at once when it is emptied
const BAT: ItemDef = {
  ...WING, id: 'bat', name: 'Taco', family: 'Taco', reticle: 'dot', meleeOnly: true, mag: 8, reloadTime: 1.2, autoReload: true, refillTime: 0.5, refillAmount: 1,
  muzzleX: 0, muzzleY: 0, length: 74, meleeDamage: 22, meleeRange: 70, meleeArc: 150, combo: swingCombo(150, 150, 200),
  meleeTime: 0.16, meleePush: 420, durability: 0, throwDamage: 22, trailWidth: 30, trailWisps: 5,
  gripX: 5, heavyDamage: 40, heavyRange: 75, heavyArc: 170, heavyTime: 0.42, heavyPush: 700, heavyTrailWidth: 40,
  rebateChain: chain(['dynamics', 'accent']), rebateSnap: 25, rebateSnapForce: 0.5, rebateSpeed: 1.6, rebateTok: true,
}

// Passaguá: a light bird net. It sweeps like any staff and catches living and undead birds and souls; with damage
// set, the same blow hurts and pushes whatever it did not catch.
const PASSAGUA: ItemDef = {
  ...WING, id: 'passagua', name: 'Passaguá', family: 'Esportivos', reticle: 'dot', meleeOnly: true, mag: 0,
  muzzleX: 0, muzzleY: 0, length: 72, meleeDamage: 0, meleeRange: 66, meleeArc: 150, combo: swingCombo(150, 150, 190),
  meleeTime: 0.22, meleePush: 0, durability: 0, throwDamage: 0, throwMin: 0, throwSpeed: 0,
  trailWidth: 16, trailColor: '#cceef0', trailTime: 0.3, trailWisps: 2, trailOpacity: 0.26,
  gripX: 6, heavyDamage: 0, heavyRange: 70, heavyArc: 170, heavyTime: 0.45, heavyPush: 0, heavyTrailWidth: 20, heavyTrailTime: 0.35, heavyTrailWisps: 2, heavyTrailOpacity: 0.3,
  rebateChain: [], rebateSnap: 0, rebateSnapForce: 0, rebateSpeed: 1, rebateTok: false,
}

// Martelo de Thor: a short, heavy war hammer. Golpe hits and shocks whoever it hits and the ones around; Atirar
// throws it straight and it comes back to her wing. No blows to count: it never runs out
const MJOLNIR: ItemDef = {
  ...BAT, id: 'mjolnir', name: 'Martelo de Thor', family: 'Magia', mag: 0, refillTime: 0, weight: 0.9,
  length: 48, meleeDamage: 30, meleeRange: 66, meleeArc: 150, combo: swingCombo(150, 150, 200), meleeTime: 0.2, meleePush: 520, throwDamage: 30,
  trailWidth: 34, trailColor: '#bfe6ff', gripX: 6, staffX: 36, staffY: 30, staffAngle: -120,
  shockRange: 170, shockJumps: 3, shockTime: 0.35, shockDamage: 8, shockDrain: 10,
  specialCooldown: 12, specialRange: 260, specialJumps: 6, specialTime: 3, specialDamage: 25, specialKind: 'thunder',
  returnThrow: true, returnDamage: 35, returnRange: 720, returnMin: 0.5, returnSpeed: 1300, returnCharge: 0.8, returnPush: 600, returnCurveMin: 16, returnCurveMax: 70,
}
// Cajado de Odin: a long golden staff. Both its blows shock, further than the hammer's: the quick one (Golpe) a short
// shock, the strong one (Atirar, charged) a longer one that reaches more of them
const ODINSTAFF: ItemDef = {
  ...BAT, id: 'odinstaff', name: 'Cajado de Odin', family: 'Magia', mag: 0, refillTime: 0,
  length: 90, meleeDamage: 16, meleeRange: 70, meleeArc: 150, combo: swingCombo(150, 150, 200), meleeTime: 0.2, meleePush: 300, throwDamage: 16,
  trailWidth: 26, trailColor: '#ffe9a8', gripX: 34, staffX: 34, staffY: 30, staffAngle: -100,
  heavyDamage: 30, heavyRange: 75, heavyArc: 170, heavyTime: 0.45, heavyPush: 500, heavyTrailWidth: 34,
  shockRange: 220, shockJumps: 4, shockTime: 0.3, shockDamage: 8, shockDrain: 12, heavyShockRange: 340, heavyShockTime: 0.7,
  specialCooldown: 12, specialRange: 420, specialJumps: 10, specialTime: 3.5, specialDamage: 25, specialKind: 'lightning',
  rebateTok: false, rebateSpeed: 1.2,
}
// Boomerang: a light curved blade of wood. Golpe hits with it; Atirar throws it like the hammer, further and in a
// wider curve, with no shock. There are two, one in each wing: the second can leave while the first is still away
const BOOMERANG: ItemDef = {
  ...BAT, id: 'boomerang', name: 'Boomerang', family: 'Esportivos', mag: 0, refillTime: 0, weight: 1,
  length: 40, meleeDamage: 14, meleeRange: 62, meleeArc: 150, combo: swingCombo(150, 150, 200), meleeTime: 0.16, meleePush: 300, throwDamage: 18,
  trailWidth: 22, trailColor: '#f3dcae', gripX: 4, staffX: 34, staffY: 30, staffAngle: -70,
  rebateTok: true, rebateSpeed: 1.3,
  returnThrow: true, returnDamage: 24, returnRange: 1100, returnMin: 0.5, returnSpeed: 1200, returnCharge: 0.8, returnPush: 380, returnCurveMin: 30, returnCurveMax: 85, returnCount: 2,
}
// Baralho vermelho: a deck of 14 cards (lib/pigchicken/cards.ts). Golpe slaps with the deck; Atirar throws the next
// card to where she aims, where it floats until someone touches it and it bursts, hurting and pushing
const CARDS_RED: ItemDef = {
  ...BAT, id: 'cardsRed', name: 'Baralho vermelho', family: 'Magia', mag: 0, refillTime: 0, weight: 1,
  length: 22, meleeDamage: 10, meleeRange: 60, meleeArc: 150, combo: swingCombo(150, 150, 200), meleeTime: 0.15, meleePush: 220, throwDamage: 10,
  trailWidth: 18, trailColor: '#ffd9d9', gripX: 0, staffX: 36, staffY: 22, staffAngle: -60,
  rebateTok: false, rebateSpeed: 1.1,
  explodeRadius: 110, explodeDamage: 45, explodePush: 700,
  returnThrow: true, returnRange: 800, returnSpeed: 1100, returnCount: 14,
  deck: true, deckLeash: 1000, deckBig: 2, deckTouch: 26, deckGap: 0.2,
}
// Baralho azul: the same deck in music. Each card keeps the note of the scale she aimed at when she threw it, and
// plays it when it bursts: whoever is around takes harmony instead of damage (and the push)
const CARDS_BLUE: ItemDef = {
  ...CARDS_RED, id: 'cardsBlue', name: 'Baralho azul', trailColor: '#d6e6ff',
  explodeRadius: 110, explodeDamage: 40, explodePush: 500,
  instrument: true, voice: 'bells', pitchSet: 'scale', octave: 1, span: 2, noteLen: 0.6, stun: 0.3, turnRate: 0, scales: ['primary'],
}
const PECK: ItemDef = {
  ...WING, id: 'peck', name: 'Bicada', family: 'Sem item',
  meleeDamage: 12, meleeRange: 85, meleeArc: 160, meleeCooldown: 0.1, meleeTime: 0.16, meleePush: 220,
  chargeTime: 0.12, peckPull: 38,
  rebateChain: [],
}

// ---------- instruments: one per family for now, on its weapon family's sheet ----------
// melee is the same for all of them (Y); like the weapons they never break. Their notes come back on their own,
// one every half second without playing
const MUSIC_MELEE = { meleeDamage: 10, durability: 0, refillTime: 0.5, throwDamage: 10, recoilPush: 0, trailWidth: 20, trailWisps: 5, scales: ['primary', 'fifths', 'tension', 'spiral', 'harmonic'] as InstrumentScaleId[] }

// Flautas → pistol: one short note per press
const FLUTE: ItemDef = {
  ...PISTOL, ...MUSIC_MELEE, id: 'flute', name: 'Flauta', family: 'Flautas', reticle: 'dot',
  rate: 13, mag: 60, reloadTime: 0.9, speed: 900, damage: 14, size: 10, range: 1000, spreadBase: 1, spreadShot: 1,
  recoilKick: 2, muzzleX: 60, muzzleY: 0, length: 60,
  instrument: true, voice: 'flute', vibratoDepth: 10, vibratoDelay: 0.12, pitchSet: 'chord', octave: 1, span: 2, noteLen: 0.22, wave: 7, tremolo: 0.35, volMin: 0.45,
  pivotAt: 'mouth', pivotX: -49, pivotY: 0, handOn: true, handX: 13, handY: 0, backOn: true, backX: -22, backY: 0, wingFlip: true,
  throwCharge: 0.3, rebateChain: chain(['octave', 'fixed', 1]),
}
// Palhetas → SMG: holding plays a fast arpeggio of the chord
const SAX: ItemDef = {
  ...SMG, ...MUSIC_MELEE, id: 'sax', name: 'Sax', family: 'Palhetas', reticle: 'circle',
  rate: 8, burst: 6, mag: 32, speed: 850, damage: 5, size: 9, range: 800,
  recoilKick: 2, recoilPush: 100, weight: 0.75, turnRate: 0, muzzleX: 32, muzzleY: 18, length: 50,
  instrument: true, voice: 'sax', vibratoDepth: 14, vibratoDelay: 0.1, pitchSet: 'chord', octave: 0, span: 1.5, arp: 'updown', noteLen: 0.12, wave: 9, tremolo: 0.5, volMin: 0.5,
  pivotAt: 'mouth', pivotX: -27, pivotY: -52, handOn: true, handX: 0, handY: 12, backOn: true, backX: 2, backY: -15, wingFlip: true,
  rebateChain: chain(['transpose', 'degree', 2]),
}
// Metais → rifle: a phrase of 3 notes per press, going through one enemy
const TRUMPET: ItemDef = {
  ...RIFLE, ...MUSIC_MELEE, id: 'trumpet', name: 'Trompete', family: 'Metais', reticle: 'cross',
  fireMode: 'burst', burst: 3, rate: 9, mag: 24, reloadTime: 0.2, refillTime: 0.25, speed: 1300, damage: 10, size: 10, pierce: 1,
  recoilKick: 3, recoilPush: 790, turnRate: 0, muzzleX: 66, muzzleY: -5, length: 66,
  instrument: true, voice: 'trumpet', vibratoDepth: 9, vibratoDelay: 0.2, pitchSet: 'scale', octave: 0, span: 2, arp: 'phrase', noteLen: 0.12, wave: 4, tremolo: 0.4, volMin: 0.55,
  pivotAt: 'mouth', pivotX: -53, pivotY: -7, handOn: true, handX: -4, handY: -12, backOn: true, backX: -23, backY: 7, wingFlip: true,
  rebateChain: chain(['voices', 'power']),
}
// Cordas → pump: a strummed chord in a fan, each pellet one note of the chord
const GUITAR: ItemDef = {
  ...PUMP, ...MUSIC_MELEE, id: 'guitar', name: 'Violão', family: 'Cordas', reticle: 'cone',
  rate: 17, burst: 5, mag: 60, reloadTime: 0.2, refillTime: 0.55, refillAmount: 4, pellets: 2, speed: 900, damage: 9, size: 10, range: 850,
  spreadBase: 20, spreadMax: 30, recoilKick: 5, turnRate: 0, muzzleX: 87, muzzleY: 0, length: 87,
  instrument: true, voice: 'guitar', pitchSet: 'chord', octave: -1, span: 2, noteLen: 0.5, wave: 3, strum: 0.022, tremolo: 0.45, volMin: 0.5,
  handOn: true, handX: 45, handY: 0, backOn: true, backX: -10, backY: 0,
  rebateChain: chain(['voices', 'triad'], ['arpeggio', 'up', 0.15]),
}
// Cordas friccionadas → sniper: a held note in a beam; it keeps the enemy still while it plays
const VIOLIN: ItemDef = {
  ...SNIPER, ...MUSIC_MELEE, id: 'violin', name: 'Violino', family: 'Cordas friccionadas', reticle: 'laser', pathShow: 'off',
  fireMode: 'auto', rate: 1, mag: 4, reloadTime: 1.2, damage: 32, hitscan: false, pierce: 0, range: 1400,
  spreadBase: 0, spreadShot: 0, spreadMove: 0, spreadAir: 0, recoilKick: 0, recoilPush: 0, speed: 4000, weight: 0.6, turnRate: 0, muzzleX: 78, muzzleY: 0, length: 78,
  instrument: true, voice: 'violin', vibratoDepth: 12, vibratoDelay: 0.25, pitchSet: 'chord', octave: 0, span: 2, noteLen: 0.5, wave: 0, beam: true, stun: 0.4, tremolo: 1, tremoloRange: 2, volMin: 0.3, fretless: true,
  handOn: true, handX: 45, handY: 0, backOn: true, backX: -23, backY: 0,
  rebateChain: chain(['gliss', 'up', 3], ['dynamics', 'legato']),
}
// Teclas → launcher: a slow low note that bursts into a chord where it lands, pushing and converting around
const KEYS: ItemDef = {
  ...LAUNCHER, ...MUSIC_MELEE, id: 'keys', name: 'Teclado', family: 'Teclas', reticle: 'impact',
  rate: 1, burst: 4, chargeTime: 0.25, mag: 33, reloadTime: 1.4, speed: 650, size: 12, explodeRadius: 150, explodeDamage: 45, explodePush: 900, damage: 0, hitscan: true,
  recoilKick: 6, turnRate: 0, muzzleX: 82, muzzleY: -9, length: 82,
  instrument: true, voice: 'keys', pitchSet: 'chord', octave: -1, span: 1.5, noteLen: 0.6, wave: 5, ringNotes: 6, volMin: 0.6,
  handOn: true, handX: 40, handY: -15, backOn: true, backX: -30, backY: -15,
  rebateChain: chain(['voices', 'seventh']),
}
// Percussion fires a musical note with a fuse, then lets out notes in a circle.
const TAMBOURINE: ItemDef = {
  ...GRENADE, ...MUSIC_MELEE, id: 'tambourine', name: 'Pandeiro', family: 'Percussão', reticle: 'grenade', landShow: 'hold',
  mag: 3, fuse: 1.6, range: 3000, explodeRadius: 120, explodeDamage: 20, explodePush: 1000, size: 12, muzzleX: 14, muzzleY: 0, length: 20,
  instrument: true, voice: 'bells', pitchSet: 'chord', octave: 1, span: 1, noteLen: 0.3, wave: 4, ringNotes: 10, volMin: 0.7,
  rebateChain: chain(['ratchet', undefined, 3], ['drum', 'jingle', 1]), rebateSnap: 60, rebateSnapForce: 0.6,
}
// Harpas → bow: the charge is a glissando, the note rises with the charge and flies far and precise
const HARP: ItemDef = {
  ...BOW, ...MUSIC_MELEE, id: 'harp', name: 'Harpa', family: 'Harpas', reticle: 'bow', archery: false, pivotX: 0,
  damage: 40, size: 12, speed: 1500, drop: 700, muzzleX: 21, muzzleY: -10, length: 30,
  instrument: true, voice: 'harp', pitchSet: 'scale', octave: 0, span: 2, noteLen: 0.6, wave: 3, gliss: true, volMin: 0.5,
  handOn: true, handX: 30, handY: -25, backOn: true, backX: -7, backY: -17,
  rebateChain: chain(['voices', 'triad'], ['arpeggio', 'up', 1]),
}
// Idiofones → pistol: a hangdrum, one struck note per press on its own scale (the hang's ding and rows); the aim
// between its notes slaps it (a percussive hit). Its kind of sound is its voice (Hang clássico, Handpan nitretado,
// Handpan inox)
const HANGDRUM: ItemDef = {
  ...PISTOL, ...MUSIC_MELEE, id: 'hangdrum', name: 'Hangdrum', family: 'Idiofones', reticle: 'dot',
  rate: 8, mag: 40, reloadTime: 0.9, speed: 800, damage: 14, size: 11, range: 950, spreadBase: 1, spreadShot: 0.5,
  recoilKick: 1, muzzleX: 58, muzzleY: -6, length: 60,
  instrument: true, voice: 'hang', pitchSet: 'scale', octave: 0, span: 2, noteLen: 1.5, wave: 3, volMin: 0.8, volMax: 0.8,
  scales: ['hang'], hangRows: 1, hangNotes: 8, hangNotes2: 7,
  rebateChain: chain(['echo', 'dotted', 2]),
}

// ---------- consumables (special abilities): Fire uses a dose and puts an effect on her for a while ----------
const CONSUMABLE = {
  ...WING, reticle: 'dot' as Reticle, fireMode: 'semi' as FireMode, rate: 2, mag: 1, reloadTime: 0.2, autoReload: false,
  meleeDamage: 4, meleeRange: 70, durability: 0, throwDamage: 4, throwMin: 275, throwSpeed: 900, throwCharge: 0.8,
  muzzleX: 10, muzzleY: -6, length: 0, consumable: true,
  rebateChain: [] as Transform[],
}
// Bear Gummy (id maryjane): a red gummy bear. The buddha state: a third faster, and every start is slow at first and fast at the end
const MARYJANE: ItemDef = {
  ...CONSUMABLE, id: 'maryjane', name: 'Bear Gummy', family: 'Habilidades especiais',
  effectTime: 15, effectSpeed: 1.33, effectAccel: 1, effectCurve: 'superIn', effectRamp: 0.6, effectLook: 'buddha',
}
// Cok: a little glass bottle of soda. The opposite: slower in the end, but quicker off the mark
const COK: ItemDef = {
  ...CONSUMABLE, id: 'cok', name: 'Cok', family: 'Habilidades especiais',
  consumeKind: 'liquid',
  effectTime: 15, effectSpeed: 0.78, effectAccel: 1.33, effectCurve: 'linear', effectRamp: 0.5, effectLook: 'fizz',
}
// Chave: opens a Baú that asks for one (lib/pigchicken/chests.ts); kept in a stack like the consumables, but Atirar
// does nothing with it
const KEY: ItemDef = {
  ...CONSUMABLE, id: 'key', name: 'Chave', family: 'Chaves',
}

// ---------- Gaiolas (lib/pigchicken/cages.ts): where the souls a Passaguá catches are kept. Not carried in the
// inventory: a player hangs up to three of them. Each model has its own art (lib/pigchicken/cage-art.ts) and limit ----------
const CAGE: ItemDef = { ...CONSUMABLE, consumable: false, id: 'cage', name: 'Gaiola básica', family: 'Gaiolas', mag: 0, cageSouls: 8 }
const CAGE_WIRE: ItemDef = { ...CAGE, id: 'cageWire', name: 'Gaiola de arame', cageSouls: 12 }
const CAGE_CONCORDE: ItemDef = { ...CAGE, id: 'cageConcorde', name: 'Gaiola Concorde', cageSouls: 16 }
const CAGE_WOOD: ItemDef = { ...CAGE, id: 'cageWood', name: 'Gaiola de madeira', cageSouls: 20 }
const CAGE_ARCH: ItemDef = { ...CAGE, id: 'cageArch', name: 'Gaiolão arqueado', cageSouls: 30 }
const CAGE_FLIGHT: ItemDef = { ...CAGE, id: 'cageFlight', name: 'Voadeira', cageSouls: 50 }

// the items as written in the code; the game's defaults are these with data/pigchicken/default-items.json over them
const CODE_ITEMS: Record<ItemId, ItemDef> = {
  wing: WING, peck: PECK, bat: BAT, passagua: PASSAGUA, pistol: PISTOL, smg: SMG, rifle: RIFLE, pump: PUMP, sniper: SNIPER, launcher: LAUNCHER, grenade: GRENADE, bow: BOW,
  flute: FLUTE, sax: SAX, trumpet: TRUMPET, guitar: GUITAR, violin: VIOLIN, keys: KEYS, tambourine: TAMBOURINE, harp: HARP, hangdrum: HANGDRUM,
  maryjane: MARYJANE, cok: COK, mjolnir: MJOLNIR, odinstaff: ODINSTAFF, key: KEY, boomerang: BOOMERANG, cardsRed: CARDS_RED, cardsBlue: CARDS_BLUE,
  cage: CAGE, cageWire: CAGE_WIRE, cageConcorde: CAGE_CONCORDE, cageWood: CAGE_WOOD, cageArch: CAGE_ARCH, cageFlight: CAGE_FLIGHT,
}
export const WEAPON_IDS: ItemId[] = ['pistol', 'smg', 'rifle', 'pump', 'sniper', 'launcher', 'grenade', 'bow']
export const INSTRUMENT_IDS: ItemId[] = ['flute', 'sax', 'trumpet', 'guitar', 'violin', 'keys', 'tambourine', 'harp', 'hangdrum']
// each instrument is built on a weapon family's sheet: switching its scale makes that weapon's reload sound
export const INSTRUMENT_WEAPON: Partial<Record<ItemId, ItemId>> = {
  flute: 'pistol', sax: 'smg', trumpet: 'rifle', guitar: 'pump', violin: 'sniper', keys: 'launcher', tambourine: 'grenade', harp: 'bow', hangdrum: 'pistol',
}
export const CONSUMABLE_LIMITS: Partial<Record<ItemId, number>> = { maryjane: 13, cok: 3, key: 9 }
export const CONSUMABLE_IDS: ItemId[] = ['maryjane', 'cok']
// sports tools are held in the wing and used with Golpe / Atirar; both are melee-only for input routing.
export const SPORTS_IDS: ItemId[] = ['bat', 'passagua', 'boomerang']
// magic weapons: staffs like the sports tools (held in the wing, Golpe / Atirar): the ones whose blows shock, and
// the decks of cards that burst
export const MAGIC_IDS: ItemId[] = ['mjolnir', 'odinstaff', 'cardsRed', 'cardsBlue']
// the decks of cards (lib/pigchicken/cards.ts)
export const DECK_IDS: ItemId[] = ['cardsRed', 'cardsBlue']
// the keys: each one opens one Baú that asks for a key (lib/pigchicken/chests.ts)
export const KEY_IDS: ItemId[] = ['key']
export const isKey = (id: ItemId) => KEY_IDS.includes(id)
// the Gaiolas, from the one found most (the basic dome) to the biggest
export const CAGE_IDS: ItemId[] = ['cage', 'cageWire', 'cageConcorde', 'cageWood', 'cageArch', 'cageFlight']
export const isCage = (id: ItemId) => CAGE_IDS.includes(id)
export const CAGE_SOULS_MAX = 99
export const MELEE_IDS: ItemId[] = [...SPORTS_IDS, ...MAGIC_IDS]
// the items a rack can hold
export const RACK_ITEM_IDS: ItemId[] = [...SPORTS_IDS, ...WEAPON_IDS, ...INSTRUMENT_IDS, ...CONSUMABLE_IDS, ...MAGIC_IDS, ...KEY_IDS, ...CAGE_IDS]
export const ITEM_IDS: ItemId[] = [...SPORTS_IDS, ...WEAPON_IDS, ...INSTRUMENT_IDS, ...CONSUMABLE_IDS, ...MAGIC_IDS, ...KEY_IDS, ...CAGE_IDS, 'wing', 'peck']
// the multiplier of the effect's speed-up curve (1 = linear)
export const curvePower = (c: AccelCurve) => ACCEL_CURVES.find(o => o.value === c)?.power ?? 1
// the voices an instrument can use (checked when loading)
const VOICE_IDS: Record<string, true> = { flute: true, sax: true, trumpet: true, guitar: true, violin: true, keys: true, harp: true, bells: true, chip: true, hum: true, bird: true, hang: true, handpan: true, hangSteel: true }
// the violin (a beam instrument) bows its held note with the arpeggiator off; with it on, it plucks the arpeggio
// (pizzicato: short notes, the bow's seconds spent note by note)
export const bowed = (d: ItemDef) => d.beam && d.arp === 'off'
export const pizzicato = (d: ItemDef) => d.beam && d.arp !== 'off'
// the shape of an item's Hangdrum scale (lib/pigchicken/instrument-scales.ts)
export const hangOf = (d: ItemDef) => ({ rows: d.hangRows, notes: d.hangNotes, notes2: d.hangNotes2 })
// the arpeggiator's glyph over an instrument's slot in the inventory: one dot per column, its height (0 low … 3 high)
// the note the pattern plays there; null leaves a gap. Off: one held line; Frase: two short climbing groups
export const ARP_GLYPHS: Record<Arp, (number | null)[]> = {
  off: [1, 1, 1, 1], up: [0, 1, 2, 3], down: [3, 2, 1, 0], updown: [0, 1, 2, 3, 2, 1],
  random: [2, 0, 3, 1, 3, 0], phrase: [0, 1, 2, null, 1, 2, 3],
}
// the next option of the arpeggiator (the glyph's click), round to the first after the last
export const nextArp = (a: Arp): Arp => ARPS[(ARPS.findIndex(o => o.value === a) + 1) % ARPS.length].value
export const ARPS: { value: Arp; label: string }[] = [
  { value: 'off', label: 'Desligado (a mira escolhe)' }, { value: 'up', label: 'Subindo' }, { value: 'down', label: 'Descendo' },
  { value: 'updown', label: 'Sobe e desce' }, { value: 'random', label: 'Aleatório' }, { value: 'phrase', label: 'Frase (passos da escala)' },
]

type Meta = { key: keyof ItemDef; label: string; min: number; max: number; step: number; unit?: string; group: string; hint?: string }
export const ITEM_PARAM_META: Meta[] = [
  { key: 'peckPull', label: 'Recuo do pescoço', min: 0, max: 50, step: 1, unit: 'u', group: 'Bicada' },
  { key: 'rate', label: 'Cadência', min: 0.5, max: 20, step: 0.5, unit: 'tiros/s', group: 'Disparo' },
  { key: 'burst', label: 'Tiros por rajada', min: 2, max: 6, step: 1, group: 'Disparo' },
  { key: 'chargeTime', label: 'Tempo de carga do tiro', min: 0.1, max: 3, step: 0.05, unit: 's', group: 'Disparo', hint: 'Modo carga: segure e solte' },
  { key: 'chargeMin', label: 'Força sem carga', min: 0, max: 1, step: 0.05, unit: '×', group: 'Disparo', hint: 'Modo carga' },
  { key: 'mag', label: 'Pente', min: 0, max: 60, step: 1, unit: 'tiros', group: 'Munição', hint: '0 = sem munição' },
  { key: 'reloadTime', label: 'Recarga', min: 0.2, max: 4, step: 0.1, unit: 's', group: 'Munição' },
  { key: 'refillTime', label: 'Recarga automática gradual', min: 0, max: 5, step: 0.05, unit: 's', group: 'Munição', hint: 'A cada intervalo sem usar o item, balas voltam sozinhas; 0 = desligada' },
  { key: 'refillAmount', label: 'Balas por recarga gradual', min: 1, max: 20, step: 1, unit: 'balas', group: 'Munição', hint: 'Quantas voltam a cada intervalo da recarga gradual' },
  { key: 'speed', label: 'Velocidade do projétil', min: 200, max: 4000, step: 50, unit: 'px/s', group: 'Projétil' },
  { key: 'drop', label: 'Queda do projétil', min: 0, max: 3000, step: 50, unit: 'px/s²', group: 'Projétil', hint: '0 = linha reta' },
  { key: 'damage', label: 'Dano', min: 0, max: 100, step: 1, group: 'Projétil' },
  { key: 'pierce', label: 'Atravessa', min: 0, max: 10, step: 1, unit: 'alvos', group: 'Projétil' },
  { key: 'range', label: 'Alcance', min: 100, max: 3000, step: 50, unit: 'px', group: 'Projétil' },
  { key: 'size', label: 'Tamanho', min: 1, max: 12, step: 1, unit: 'px', group: 'Projétil' },
  { key: 'pellets', label: 'Projéteis por tiro', min: 1, max: 16, step: 1, group: 'Projétil', hint: 'Chumbos em leque' },
  { key: 'explodeRadius', label: 'Raio da explosão', min: 0, max: 400, step: 10, unit: 'px', group: 'Explosão', hint: '0 = não explode' },
  { key: 'explodePush', label: 'Empurrão da explosão', min: 0, max: 3000, step: 50, unit: 'px/s', group: 'Explosão', hint: 'Impulso para longe do centro; diminui até a borda. Inclui quem disparou. 0 = sem empurrão.' },
  { key: 'explodeDamage', label: 'Dano da explosão', min: 0, max: 200, step: 1, group: 'Explosão', hint: 'No centro; cai até a borda' },
  { key: 'fuse', label: 'Pavio', min: 0, max: 6, step: 0.1, unit: 's', group: 'Explosão', hint: '0 = explode ao bater' },
  { key: 'bounce', label: 'Quique', min: 0, max: 0.9, step: 0.05, unit: '×', group: 'Explosão', hint: 'Com pavio' },
  { key: 'spreadBase', label: 'Espalhamento base', min: 0, max: 20, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'spreadShot', label: 'Por tiro', min: 0, max: 10, step: 0.1, unit: '°', group: 'Espalhamento' },
  { key: 'spreadMax', label: 'Máximo', min: 0, max: 40, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'spreadRecover', label: 'Recupera', min: 1, max: 60, step: 1, unit: '°/s', group: 'Espalhamento' },
  { key: 'spreadMove', label: 'Andando', min: 0, max: 15, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'spreadAir', label: 'No ar', min: 0, max: 15, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'crouchMult', label: 'Agachada', min: 0.1, max: 1.5, step: 0.05, unit: '×', group: 'Espalhamento' },
  { key: 'broodMult', label: 'Chocando', min: 0.1, max: 1.5, step: 0.05, unit: '×', group: 'Espalhamento' },
  { key: 'recoilKick', label: 'Coice visual', min: 0, max: 30, step: 1, unit: 'px', group: 'Manuseio' },
  { key: 'recoilPush', label: 'Recuo no ar', min: 0, max: 800, step: 10, unit: 'px/s', group: 'Manuseio' },
  { key: 'weight', label: 'Peso (velocidade)', min: 0.3, max: 1.2, step: 0.05, unit: '×', group: 'Manuseio' },
  { key: 'turnRate', label: 'Giro da mira', min: 0, max: 1440, step: 30, unit: '°/s', group: 'Manuseio', hint: '0 = instantâneo' },
  { key: 'muzzleX', label: 'Saída do tiro X', min: -20, max: 160, step: 1, unit: 'u', group: 'Desenho', hint: 'Ponto de onde sai o tiro e começa a mira, a partir da empunhadura' },
  { key: 'muzzleY', label: 'Saída do tiro Y', min: -60, max: 60, step: 0.5, unit: 'u', group: 'Desenho', hint: 'Negativo sobe' },
  { key: 'length', label: 'Comprimento no golpe', min: 0, max: 200, step: 1, unit: 'u', group: 'Desenho', hint: 'Quanto a arma estende o golpe além da ponta da asa' },
  { key: 'pivotX', label: 'Eixo de giro X', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'pivotY', label: 'Eixo de giro Y', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'handX', label: 'Mão da asa X', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'handY', label: 'Mão da asa Y', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'backX', label: 'Mão da asa de trás X', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'backY', label: 'Mão da asa de trás Y', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'drawLen', label: 'Puxada da flecha', min: 0, max: 120, step: 0.5, unit: 'u', group: 'Pontos', hint: 'Quanto a asa puxa a flecha para trás com a carga cheia' },
  { key: 'gripX', label: 'Mão no bastão X', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos', hint: 'Ponto do desenho que a mão da asa segura' },
  { key: 'gripY', label: 'Mão no bastão Y', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'staffX', label: 'Posição no corpo X', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos', hint: 'Onde a mão fica, a partir do ombro; positivo é para a frente dela' },
  { key: 'staffY', label: 'Posição no corpo Y', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos', hint: 'Negativo sobe' },
  { key: 'staffAngle', label: 'Inclinação', min: -360, max: 360, step: 1, unit: '°', group: 'Pontos', hint: '0 = apontando para a frente dela; −90 = para cima' },
  { key: 'windX', label: 'Carregando: posição X', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos', hint: 'Onde a mão chega com o golpe forte todo carregado' },
  { key: 'windY', label: 'Carregando: posição Y', min: -200, max: 200, step: 0.5, unit: 'u', group: 'Pontos' },
  { key: 'windAngle', label: 'Carregando: inclinação', min: -360, max: 360, step: 1, unit: '°', group: 'Pontos', hint: 'Para onde a ponta vai com o golpe forte todo carregado; o bastão gira da Inclinação até aqui' },
  { key: 'meleeDamage', label: 'Dano do golpe', min: 0, max: 100, step: 1, group: 'Golpe' },
  { key: 'meleeRange', label: 'Alcance da asa', min: 30, max: 250, step: 5, unit: 'px', group: 'Golpe' },
  { key: 'meleeArc', label: 'Arco da bicada', min: 20, max: 360, step: 10, unit: '°', group: 'Golpe', hint: 'Abertura do cone da bicada' },
  { key: 'meleeCooldown', label: 'Intervalo', min: 0, max: 2, step: 0.05, unit: 's', group: 'Golpe', hint: '0 = golpes seguidos sem espera' },
  { key: 'meleeTime', label: 'Duração do giro', min: 0.05, max: 1, step: 0.01, unit: 's', group: 'Golpe', hint: 'Menos = giro mais rápido' },
  { key: 'meleePush', label: 'Empurrão', min: 0, max: 800, step: 10, unit: 'px/s', group: 'Golpe' },
  { key: 'comboWindow', label: 'Janela do combo', min: 0, max: 2, step: 0.05, unit: 's', group: 'Combo', hint: 'Até quanto tempo depois do fim de um golpe o próximo continua a sequência; depois disso ela recomeça' },
  { key: 'heavyDamage', label: 'Dano do golpe', min: 0, max: 200, step: 1, group: 'Golpe forte' },
  { key: 'heavyRange', label: 'Alcance da asa', min: 30, max: 250, step: 5, unit: 'px', group: 'Golpe forte', hint: 'Sem carga; a carga estica até o Alcance máximo' },
  { key: 'heavyArc', label: 'Arco do golpe', min: 20, max: 360, step: 10, unit: '°', group: 'Golpe forte' },
  { key: 'heavyCooldown', label: 'Intervalo', min: 0, max: 2, step: 0.05, unit: 's', group: 'Golpe forte', hint: 'Depois de um golpe forte, quanto esperar até o próximo golpe' },
  { key: 'heavyTime', label: 'Duração do giro', min: 0.05, max: 1.5, step: 0.01, unit: 's', group: 'Golpe forte', hint: 'Do soltar do botão até a asa voltar; menos = mais rápido' },
  { key: 'heavyPush', label: 'Empurrão', min: 0, max: 2000, step: 10, unit: 'px/s', group: 'Golpe forte' },
  { key: 'heavyCharge', label: 'Tempo de carga', min: 0.1, max: 4, step: 0.05, unit: 's', group: 'Golpe forte', hint: 'Quanto segurar Atirar até a carga máxima' },
  { key: 'heavyReachMax', label: 'Alcance máximo carregado', min: 1, max: 4, step: 0.05, unit: '×', group: 'Golpe forte', hint: 'Até onde o golpe chega com a carga cheia, em vezes o alcance sem carga; 1 = a carga não muda o alcance' },
  { key: 'heavySizeMax', label: 'Tamanho máximo carregado', min: 1, max: 4, step: 0.05, unit: '×', group: 'Golpe forte', hint: 'Tamanho do bastão e do rastro no golpe com a carga cheia; 1 = a carga não muda o tamanho' },
  { key: 'heavyTrailWidth', label: 'Rastro: espessura', min: 2, max: 80, step: 1, unit: 'px', group: 'Golpe forte' },
  { key: 'heavyTrailTime', label: 'Rastro: duração', min: 0.05, max: 1, step: 0.01, unit: 's', group: 'Golpe forte' },
  { key: 'heavyTrailWisps', label: 'Rastro: fiapos', min: 0, max: 8, step: 1, group: 'Golpe forte' },
  { key: 'heavyTrailOpacity', label: 'Rastro: opacidade', min: 0, max: 1, step: 0.05, unit: '×', group: 'Golpe forte', hint: '0 = sem rastro' },
  { key: 'returnDamage', label: 'Dano', min: 0, max: 200, step: 1, group: 'Arremesso que volta', hint: 'Com a carga cheia; sem carga, metade' },
  { key: 'returnRange', label: 'Distância máxima', min: 100, max: 3000, step: 20, unit: 'px', group: 'Arremesso que volta', hint: 'Até onde ele vai com a carga cheia antes de voltar' },
  { key: 'returnMin', label: 'Distância sem carga', min: 0.1, max: 1, step: 0.05, unit: '×', group: 'Arremesso que volta', hint: 'Parte da distância máxima com um toque rápido; a mira já começa aqui' },
  { key: 'returnCharge', label: 'Tempo de carga', min: 0.1, max: 4, step: 0.05, unit: 's', group: 'Arremesso que volta', hint: 'Quanto segurar Atirar até a distância máxima' },
  { key: 'returnSpeed', label: 'Velocidade', min: 300, max: 3000, step: 50, unit: 'px/s', group: 'Arremesso que volta' },
  { key: 'returnPush', label: 'Empurrão', min: 0, max: 2000, step: 10, unit: 'px/s', group: 'Arremesso que volta' },
  { key: 'returnCurveMin', label: 'Curvatura mínima', min: 0, max: 90, step: 1, unit: '°', group: 'Arremesso que volta', hint: 'Quanto o caminho dobra sem mexer a mira; 0 = vai e volta em linha reta' },
  { key: 'returnCurveMax', label: 'Curvatura máxima', min: 0, max: 180, step: 1, unit: '°', group: 'Arremesso que volta', hint: 'Quanto dobra com a mira virada para longe da direção do arremesso; a curva puxa para o lado da mira' },
  { key: 'returnCount', label: 'Quantos de uma vez', min: 1, max: 14, step: 1, group: 'Arremesso que volta', hint: 'Quantos podem estar fora ao mesmo tempo; com todos fora, o próximo só sai quando um volta para a mão' },
  { key: 'deckLeash', label: 'Distância de retorno', min: 100, max: 4000, step: 20, unit: 'px', group: 'Baralho', hint: 'Quando quem jogou se afasta mais do que isto de uma carta, ela volta para a mão' },
  { key: 'deckBig', label: 'Explosão do 7 e do Ás', min: 1, max: 4, step: 0.1, unit: '×', group: 'Baralho', hint: 'Raio da explosão das duas cartas que explodem sozinhas ao chegar, em vezes o Raio da explosão' },
  { key: 'deckTouch', label: 'Área de contato', min: 4, max: 120, step: 2, unit: 'px', group: 'Baralho', hint: 'Raio em volta da carta: quem encosta nele faz a carta explodir' },
  { key: 'deckGap', label: 'Intervalo entre cartas', min: 0.05, max: 2, step: 0.05, unit: 's', group: 'Baralho', hint: 'Com Atirar segurado, sai uma carta a cada intervalo' },
  { key: 'shockRange', label: 'Alcance do choque', min: 0, max: 800, step: 10, unit: 'px', group: 'Choque', hint: 'Distância que o raio pula de um para o próximo; 0 = sem choque' },
  { key: 'shockJumps', label: 'Pulos do raio', min: 0, max: 20, step: 1, group: 'Choque', hint: 'Quantos o raio alcança além dos que levaram o golpe' },
  { key: 'shockTime', label: 'Duração do choque', min: 0.05, max: 3, step: 0.05, unit: 's', group: 'Choque', hint: 'Quanto tempo tremem e ficam parados' },
  { key: 'shockDamage', label: 'Dano do choque', min: 0, max: 100, step: 1, group: 'Choque', hint: 'Em cada um que o raio alcança além dos que levaram o golpe' },
  { key: 'shockDrain', label: 'Tira da barra de harmonia', min: 0, max: 100, step: 1, group: 'Choque', hint: 'Quanto cada um que toma choque perde da barra que as notas enchem' },
  { key: 'heavyShockRange', label: 'Golpe forte: alcance do choque', min: 0, max: 800, step: 10, unit: 'px', group: 'Choque', hint: '0 = o golpe forte não dá choque' },
  { key: 'heavyShockTime', label: 'Golpe forte: duração do choque', min: 0.05, max: 3, step: 0.05, unit: 's', group: 'Choque' },
  { key: 'specialCooldown', label: 'Intervalo do especial', min: 0, max: 120, step: 1, unit: 's', group: 'Especial', hint: 'O primeiro golpe que acerta alguém depois deste tempo sai como especial; 0 = sem especial' },
  { key: 'specialRange', label: 'Alcance do choque', min: 0, max: 1200, step: 10, unit: 'px', group: 'Especial' },
  { key: 'specialJumps', label: 'Pulos do raio', min: 0, max: 30, step: 1, group: 'Especial' },
  { key: 'specialTime', label: 'Tempo em raio-x', min: 0.2, max: 15, step: 0.1, unit: 's', group: 'Especial', hint: 'Quanto tempo ficam em estado de choque' },
  { key: 'specialDamage', label: 'Dano do choque', min: 0, max: 200, step: 1, group: 'Especial' },
  { key: 'trailWidth', label: 'Rastro: espessura', min: 2, max: 60, step: 1, unit: 'px', group: 'Golpe', hint: 'Na ponta do golpe; afina até a cauda' },
  { key: 'trailTime', label: 'Rastro: duração', min: 0.05, max: 1, step: 0.01, unit: 's', group: 'Golpe', hint: 'Quanto o ar leva pra se desfazer' },
  { key: 'trailWisps', label: 'Rastro: fiapos', min: 0, max: 8, step: 1, group: 'Golpe', hint: 'Fiapos de ar que se soltam do rastro' },
  { key: 'trailOpacity', label: 'Rastro: opacidade', min: 0, max: 1, step: 0.05, unit: '×', group: 'Golpe', hint: '0 = sem rastro' },
  { key: 'durability', label: 'Quebra depois de', min: 0, max: 200, step: 1, unit: 'golpes', group: 'Golpe', hint: '0 = nunca quebra' },
  { key: 'rebateSnap', label: 'Snap: ângulo', min: 0, max: 90, step: 5, unit: '°', group: 'Rebate', hint: 'Puxa a nota rebatida para o personagem mais perto da mira dentro deste ângulo; 0 = sai na direção exata da mira' },
  { key: 'rebateSnapForce', label: 'Snap: força', min: 0, max: 1, step: 0.05, unit: '×', group: 'Rebate', hint: 'De leve (0) até grudar no alvo (1)' },
  { key: 'rebateSpeed', label: 'Velocidade da nota rebatida', min: 0.5, max: 3, step: 0.05, unit: '×', group: 'Rebate' },
  { key: 'throwDamage', label: 'Dano do arremesso', min: 0, max: 100, step: 1, group: 'Arremesso' },
  { key: 'throwMin', label: 'Força mínima', min: 0, max: 2500, step: 25, unit: 'px/s', group: 'Arremesso', hint: 'Só tocar no botão' },
  { key: 'throwSpeed', label: 'Força máxima', min: 200, max: 2500, step: 50, unit: 'px/s', group: 'Arremesso' },
  { key: 'throwCharge', label: 'Tempo de carga', min: 0.1, max: 3, step: 0.1, unit: 's', group: 'Arremesso' },
  { key: 'octave', label: 'Registro (oitava)', min: -3, max: 3, step: 1, group: 'Música', hint: '0 = perto do Dó central' },
  { key: 'span', label: 'Extensão da mira', min: 0.5, max: 4, step: 0.5, unit: 'oitavas', group: 'Música', hint: 'De apontar pra baixo até pra cima' },
  { key: 'arpRate', label: 'Velocidade do arpejo', min: 2, max: 24, step: 1, unit: 'notas/s', group: 'Música' },
  { key: 'noteLen', label: 'Duração da nota', min: 0.05, max: 2, step: 0.05, unit: 's', group: 'Música' },
  { key: 'wave', label: 'Onda da nota', min: 0, max: 30, step: 1, unit: 'px', group: 'Música', hint: 'Quanto a nota balança voando' },
  { key: 'quantWindow', label: 'Janela da quantização', min: 0, max: 150, step: 5, unit: 'ms', group: 'Música', hint: 'Até quanto o som espera a próxima semicolcheia' },
  { key: 'beatBonus', label: 'Bônus na batida', min: 1, max: 3, step: 0.1, unit: '×', group: 'Música', hint: 'Harmonia extra para tiro no tempo' },
  { key: 'stun', label: 'Paralisa', min: 0, max: 3, step: 0.1, unit: 's', group: 'Música', hint: 'O inimigo fica parado depois da nota' },
  { key: 'strum', label: 'Rasgueado', min: 0, max: 0.1, step: 0.002, unit: 's', group: 'Música', hint: 'Intervalo entre as notas do acorde' },
  { key: 'tremolo', label: 'Tremolo', min: 0, max: 1, step: 0.05, unit: '×', group: 'Música', hint: 'Tremer a mira dentro da mesma faixa do leque entorta a nota; 0 = desligado' },
  { key: 'vibratoDepth', label: 'Vibrato natural: profundidade', min: 0, max: 100, step: 1, unit: 'cents', group: 'Música', hint: 'Quanto a afinação ondula para cada lado sozinha, mesmo com a mira parada (100 cents = 1 semitom); 0 = nota reta' },
  { key: 'vibratoRate', label: 'Vibrato natural: velocidade', min: 1, max: 12, step: 0.1, unit: 'Hz', group: 'Música', hint: 'Ondulações por segundo' },
  { key: 'vibratoDelay', label: 'Vibrato natural: atraso', min: 0, max: 1.5, step: 0.05, unit: 's', group: 'Música', hint: 'Tempo de nota reta antes de o vibrato começar a entrar' },
  { key: 'tremoloRange', label: 'Tremolo: limite', min: 0.05, max: 3, step: 0.05, unit: 'semitons', group: 'Música', hint: 'Até quanto a nota sobe ou desce para cada lado' },
  { key: 'meleeNotes', label: 'Notas do golpe', min: 1, max: 4, step: 1, group: 'Música', hint: 'O golpe toca a nota da faixa do leque para onde a mira aponta e sobe o acorde a partir dela' },
  { key: 'ringNotes', label: 'Notas ao estourar', min: 0, max: 16, step: 1, group: 'Música', hint: 'Saem em círculo' },
  { key: 'hangRows', label: 'Fileiras', min: 1, max: 2, step: 1, group: 'Hangdrum', hint: 'Fileiras de notas em volta da nota central (ding)' },
  { key: 'hangNotes', label: 'Notas da 1ª fileira', min: 5, max: 9, step: 1, group: 'Hangdrum' },
  { key: 'hangNotes2', label: 'Notas da 2ª fileira', min: 5, max: 9, step: 1, group: 'Hangdrum' },
  { key: 'effectTime', label: 'Duração do efeito', min: 1, max: 120, step: 1, unit: 's', group: 'Efeito', hint: 'Doses acumulam: cada uma tem o seu tempo e os multiplicadores se multiplicam' },
  { key: 'effectSpeed', label: 'Velocidade final', min: 0.3, max: 2.5, step: 0.01, unit: '×', group: 'Efeito', hint: '1,33 = +33%; 0,78 = −22%' },
  { key: 'effectAccel', label: 'Aceleração', min: 0.3, max: 3, step: 0.01, unit: '×', group: 'Efeito', hint: '1,33 = +33%' },
  { key: 'cageSouls', label: 'Limite de almas', min: 1, max: 99, step: 1, unit: 'almas', group: 'Gaiola', hint: 'Quantas almas cabem nesta gaiola; uma gaiola já no mundo guarda o limite com que nasceu' },
  { key: 'effectRamp', label: 'Tempo da arrancada', min: 0.1, max: 2, step: 0.05, unit: 's', group: 'Efeito', hint: 'Com curva ease: quanto leva até a velocidade final' },
]
export const ITEM_PARAM_GROUPS = [...new Set(ITEM_PARAM_META.map(m => m.group))]

// the "breaks after" defaults before v6 (weapons and instruments broke); a save with these numbers was never tuned
const V5_DURABILITY: Partial<Record<ItemId, number>> = {
  pistol: 40, smg: 35, rifle: 45, pump: 45, sniper: 30, launcher: 50, grenade: 20, bow: 25,
  flute: 12, sax: 12, trumpet: 12, guitar: 12, violin: 12, keys: 12, tambourine: 12, harp: 12,
}

// One item's saved numbers and choices over out[id] (each checked and clamped); v is the version the save was written in,
// which runs the migrations of older saves (the defaults file is always current).
function applySavedItem(out: Record<ItemId, ItemDef>, id: ItemId, s: any, v: number) {
  ITEM_PARAM_META.forEach(m => {
    const n = s[m.key]
    // a value equal to the one already there stays as it is (some code defaults sit outside the panel's range)
    if (typeof n === 'number' && Number.isFinite(n) && n !== out[id][m.key]) (out[id] as Record<string, unknown>)[m.key] = Math.min(m.max, Math.max(m.min, n))
  })
  // Update untouched Bicada defaults saved before v4, preserving custom tuning.
  if (id === 'peck' && !(v >= 4)) {
    const old = { meleeRange: 105, meleeArc: 30, meleeCooldown: 0.4, meleeTime: 0.24 }
    for (const key of Object.keys(old) as (keyof typeof old)[]) {
      if (s[key] === old[key]) out.peck[key] = DEFAULT_ITEMS.peck[key]
    }
  }
  // saved before blows had no interval (v5): every item's golpe goes back to 0 (the Bicada keeps its own)
  if (id !== 'peck' && !(v >= 5)) out[id].meleeCooldown = 0
  // saved before weapons and instruments never broke and the taco had blows (v6): an untouched old default takes
  // the new one (never breaks; 8 blows that come back on their own); custom numbers stay
  if (!(v >= 6)) {
    if (s.durability === V5_DURABILITY[id]) out[id].durability = DEFAULT_ITEMS[id].durability
    if (id === 'bat') {
      if (!s.mag) out.bat.mag = DEFAULT_ITEMS.bat.mag
      if (s.reloadTime === 1.1) out.bat.reloadTime = DEFAULT_ITEMS.bat.reloadTime
    }
  }
  // saved before the sniper fired on release (v2): it takes the new mode
  if (['semi', 'auto', 'burst', 'charge', 'release'].includes(s.fireMode) && !(id === 'sniper' && !(v >= 2))) out[id].fireMode = s.fireMode
  if (PATH_SHOWS.some(o => o.value === s.pathShow)) out[id].pathShow = s.pathShow
  // saved before the grenade showed its blast only with Fire held (v3): it takes the new default
  if (PATH_SHOWS.some(o => o.value === s.landShow) && !(id === 'grenade' && !(v >= 3))) out[id].landShow = s.landShow
  if (PIVOT_PARTS.some(o => o.value === s.pivotAt)) out[id].pivotAt = s.pivotAt
  ;(['autoReload', 'burstHold', 'slideFire', 'shellReload', 'hitscan', 'quantize', 'beam', 'gliss', 'fretless', 'meleeInterrupt', 'rebateTok', 'handOn', 'backOn', 'wingFlip', 'archery', 'spiralDescending'] as const).forEach(k => { if (typeof s[k] === 'boolean') out[id][k] = s[k] })
  // saved before "Arco e Flecha" (v11): a bow whose points were never touched takes the new ones (both wings on it)
  if (id === 'bow' && !(v >= 11) && !s.handOn && !s.backOn && !s.pivotX && !s.pivotY) (['pivotX', 'handOn', 'handX', 'handY', 'backOn', 'backX', 'backY'] as const).forEach(k => { (out.bow as Record<string, unknown>)[k] = DEFAULT_ITEMS.bow[k] })
  if (ARPS.some(a => a.value === s.arp)) out[id].arp = s.arp
  if (s.pitchSet === 'chord' || s.pitchSet === 'scale') out[id].pitchSet = s.pitchSet
  ;(['volMin', 'volMax'] as const).forEach(k => { if (typeof s[k] === 'number' && Number.isFinite(s[k])) out[id][k] = Math.max(0, Math.min(1, s[k])) })
  if (typeof s.voice === 'string' && s.voice in VOICE_IDS) out[id].voice = s.voice
  if (ACCEL_CURVES.some(c => c.value === s.effectCurve)) out[id].effectCurve = s.effectCurve
  if (EFFECT_LOOKS.some(c => c.value === s.effectLook)) out[id].effectLook = s.effectLook
  if (isSwingKind(s.heavyKind)) out[id].heavyKind = s.heavyKind
  if (SPECIAL_KINDS.some(k => k.value === s.specialKind)) out[id].specialKind = s.specialKind
  { // saved before each blow had its own arc (v10): the kinds only, with the arcs of down (meleeArc), up and horizontal
    const old: Partial<Record<BlowKind, unknown>> = v >= 10 ? {} : { down: s.meleeArc, up: s.meleeArcUp, flat: s.meleeArcFlat }
    const arcOf = (kind: BlowKind) => { const a = old[kind]; return typeof a === 'number' && Number.isFinite(a) ? a : out[id].combo.find(c => c.kind === kind)?.arc ?? out[id].meleeArc }
    const combo = cleanCombo(s.combo, arcOf) ?? (v >= 10 ? null : cleanCombo(out[id].combo.map(c => c.kind), arcOf))
    if (combo) out[id].combo = combo
  }
  if (Array.isArray(s.rebateChain)) out[id].rebateChain = s.rebateChain.map(cleanTransform).filter((t: Transform | null): t is Transform => !!t).slice(0, CHAIN_MAX)
  { const sc = cleanScales(s.scales); if (sc) out[id].scales = sc }
  // saved before the Espiral (v7): an instrument that had every scale on gets the new one too
  if (!(v >= 7) && out[id].instrument && ['primary', 'fifths', 'tension'].every(k => out[id].scales.includes(k as InstrumentScaleId)) && !out[id].scales.includes('spiral')) out[id].scales = cleanScales([...out[id].scales, 'spiral'])!
  // saved before the Campo harmônico (v9): an instrument that had every other scale on gets it too
  if (!(v >= 9) && out[id].instrument && (['primary', 'fifths', 'tension', 'spiral'] as InstrumentScaleId[]).every(k => out[id].scales.includes(k)) && !out[id].scales.includes('harmonic')) out[id].scales = cleanScales([...out[id].scales, 'harmonic'])!
  if (typeof s.trailColor === 'string' && /^#[0-9a-f]{6}$/i.test(s.trailColor)) out[id].trailColor = s.trailColor
  // saved before instruments aimed instantly (v8): an untouched old Giro da mira takes the new default (0); custom numbers stay
  if (!(v >= 8) && s.turnRate === V7_TURN_RATE[id]) out[id].turnRate = DEFAULT_ITEMS[id].turnRate
}

// Giro da mira the instruments had before v8 (now 0 = instant)
const V7_TURN_RATE: Partial<Record<ItemId, number>> = { sax: 120, violin: 420, keys: 300 }

const ITEMS_VERSION = 11
// what the defaults file (and "Salvar no game") keeps of each item: every number and choice the Itens panel edits
const ITEM_FILE_KEYS: (keyof ItemDef)[] = [...new Set<keyof ItemDef>([
  ...ITEM_PARAM_META.map(m => m.key), 'fireMode', 'pathShow', 'landShow', 'autoReload', 'burstHold', 'slideFire', 'shellReload', 'hitscan', 'quantize', 'beam',
  'gliss', 'fretless', 'meleeInterrupt', 'rebateTok', 'pivotAt', 'handOn', 'backOn', 'wingFlip', 'archery', 'arp', 'pitchSet', 'volMin', 'volMax', 'voice', 'effectCurve', 'effectLook', 'combo', 'heavyKind', 'specialKind', 'rebateChain', 'trailColor', 'scales', 'spiralDescending',
])]
function itemsOver(file: unknown): Record<ItemId, ItemDef> {
  const out = structuredClone(CODE_ITEMS)
  if (file && typeof file === 'object') ITEM_IDS.forEach(id => {
    const s = (file as Record<string, unknown>)[id]
    if (s && typeof s === 'object') applySavedItem(out, id, s, ITEMS_VERSION)
  })
  return out
}
/** The game's default items: the code's, with data/pigchicken/default-items.json over them. */
export const DEFAULT_ITEMS: Record<ItemId, ItemDef> = itemsOver(DEFAULTS_FILE)

/** The defaults file's content for a set of items (what "Salvar no game" writes). */
export function itemsDefaultsFile(items: Record<ItemId, ItemDef>) {
  return Object.fromEntries(ITEM_IDS.map(id => [id, Object.fromEntries(ITEM_FILE_KEYS.map(k => [k, structuredClone(items[id][k])]))]))
}

/** Why a defaults file is not valid (an unknown item or field, or a value the game would change), or null. */
export function itemsFileProblem(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'O arquivo precisa ser um objeto com um campo por item.'
  const applied = itemsOver(value)
  for (const [id, fields] of Object.entries(value)) {
    if (!(ITEM_IDS as string[]).includes(id)) return `${id}: item desconhecido.`
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return `${id}: precisa ser um objeto.`
    for (const [key, v] of Object.entries(fields)) {
      if (!(ITEM_FILE_KEYS as string[]).includes(key)) return `${id}.${key}: campo desconhecido.`
      if (JSON.stringify(applied[id as ItemId][key as keyof ItemDef]) !== JSON.stringify(v)) return `${id}.${key}: valor inválido ou fora dos limites.`
    }
  }
  return null
}

// The item the main player (p1) holds in the Pátio, announced when it changes (the Itens panel follows it)
let heldItem: ItemId | null = null
const HELD_EVENT = 'pigchicken-held-item'
export function announceHeldItem(id: ItemId | null) {
  if (id === heldItem) return
  heldItem = id
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HELD_EVENT, { detail: id }))
}
// what the main player holds right now (null: empty-handed, or the Pátio isn't running)
export function currentHeldItem(): ItemId | null { return heldItem }
export function subscribeHeldItem(onChange: (id: ItemId | null) => void) {
  const handler = (e: Event) => onChange((e as CustomEvent<ItemId | null>).detail)
  window.addEventListener(HELD_EVENT, handler)
  return () => window.removeEventListener(HELD_EVENT, handler)
}

const STORE = 'pigchicken-items-v1'
const EVENT = 'pigchicken-items'

export function loadItems(): Record<ItemId, ItemDef> {
  const out = structuredClone(DEFAULT_ITEMS)
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) || 'null')
    if (!saved) return out
    ITEM_IDS.forEach(id => { if (saved[id]) applySavedItem(out, id, saved[id], typeof saved._v === 'number' ? saved._v : 0) })
  } catch { /* storage unavailable */ }
  return out
}

export function saveItems(items: Record<ItemId, ItemDef>) {
  try { window.localStorage.setItem(STORE, JSON.stringify({ ...items, _v: ITEMS_VERSION })) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribeItems(onChange: (items: Record<ItemId, ItemDef>) => void) {
  const handler = () => onChange(loadItems())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
