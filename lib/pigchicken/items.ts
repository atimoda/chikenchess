// PigChicKen items: weapons and instruments share one sheet of numbers. An instrument is its weapon family's
// sheet with a music block: the projectile is a note, and notes convert (fill the harmony bar) instead of
// destroying. The Parquinho's item popup edits these sheets; they are saved in this browser for now.
import { COMBO_MAX, COMBO_WINDOW, SWING_COMBO, isSwingKind, type SwingKind } from './swing'
import type { PitchSet } from './music'
import type { VoiceId } from './synth'
import { CHAIN_MAX, cleanTransform, newTransform, type Transform, type TransformKind } from './transforms'

export type FireMode = 'semi' | 'auto' | 'burst' | 'charge' | 'release'
// when the projectile's path is drawn: never, while the fire button is held, held or with the aim locked, always
export type PathShow = 'off' | 'hold' | 'holdAim' | 'always'
export const PATH_SHOWS: { value: PathShow; label: string }[] = [
  { value: 'off', label: 'Escondido' }, { value: 'hold', label: 'Com o tiro segurado' }, { value: 'holdAim', label: 'Tiro segurado ou mira travada' }, { value: 'always', label: 'Sempre' },
]
export type ItemId = 'wing' | 'peck' | 'bat' | 'pistol' | 'smg' | 'rifle' | 'pump' | 'sniper' | 'launcher' | 'grenade' | 'bow'
  | 'flute' | 'sax' | 'trumpet' | 'guitar' | 'violin' | 'keys' | 'tambourine' | 'harp'
  | 'maryjane' | 'cok'
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
  meleeArc: number // degrees
  meleeCooldown: number // s
  meleeInterrupt: boolean // a blow pressed while the last one is still going cuts it off and starts at once
  meleeTime: number // s the swing takes to sweep its arc
  durability: number // melee hits on a target before it breaks (0 = never)
  meleePush: number // knockback px/s
  // the combo: the order of the blows in a row, how long after a blow the next still carries it on (s), and the
  // hit arc of the blows up and horizontal (degrees; meleeArc is the blow down's, the spin always 360)
  combo: SwingKind[]
  comboWindow: number
  meleeArcUp: number
  meleeArcFlat: number
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
  // consumables (Fire uses one dose; `mag` is the doses per pickup; stacks have a per-item limit). One effect at a time:
  // a new one replaces the one running
  consumable: boolean
  consumeKind: 'food' | 'liquid'
  effectTime: number // s the effect lasts
  effectSpeed: number // × her final speed (walk, run, in the air)
  effectAccel: number // × her acceleration
  effectCurve: AccelCurve
  effectRamp: number // s to full speed with an eased curve
  effectLook: EffectLook
}

// the air a blow leaves behind: cream, like the reference
export const TRAIL_CREAM = '#fff4dc'

// defaults that keep weapons out of the music block
const NO_MUSIC = {
  peckPull: 38, instrument: false, voice: 'flute' as VoiceId, pitchSet: 'chord' as PitchSet, octave: 0, span: 2, arp: 'off' as Arp, arpRate: 10, noteLen: 0.25, wave: 6,
  quantize: true, quantWindow: 60, beatBonus: 1.5, beam: false, stun: 0, strum: 0.018, ringNotes: 0, gliss: false,
  consumable: false, consumeKind: 'food' as const, effectTime: 0, effectSpeed: 1, effectAccel: 1, effectCurve: 'linear' as AccelCurve, effectRamp: 0.5, effectLook: 'none' as EffectLook,
}

// a rebate chain from [kind, mode, n?] steps (always happening)
function chain(...steps: [TransformKind, string?, number?][]): Transform[] {
  return steps.map(([kind, mode, n]) => ({ ...newTransform(kind), ...(mode !== undefined ? { mode } : {}), ...(n !== undefined ? { n } : {}) }))
}

const PISTOL: ItemDef = {
  id: 'pistol', name: 'Pistola', family: 'Pistola', reticle: 'dot', pathShow: 'off', landShow: 'always',
  fireMode: 'semi', rate: 6, burst: 3, mag: 12, reloadTime: 1.1, autoReload: true, slideFire: true, shellReload: false, refillTime: 0, refillAmount: 1, meleeOnly: false, chargeTime: 0, chargeMin: 0.3,
  speed: 1500, drop: 0, damage: 12, pierce: 0, range: 1100, size: 3, pellets: 1, hitscan: false, explodeRadius: 0, explodeDamage: 0, explodePush: 0, fuse: 0, bounce: 0,
  spreadBase: 1.5, spreadShot: 2.2, spreadMax: 9, spreadRecover: 14, spreadMove: 1.5, spreadAir: 3, crouchMult: 0.7, broodMult: 0.5,
  recoilKick: 7, recoilPush: 60, weight: 1, turnRate: 0,
  muzzleX: 54, muzzleY: -7, length: 56,
  meleeDamage: 18, meleeRange: 95, meleeArc: 110, meleeCooldown: 0, meleeInterrupt: true, meleeTime: 0.2, durability: 0, meleePush: 260,
  combo: SWING_COMBO.slice(), comboWindow: COMBO_WINDOW, meleeArcUp: 110, meleeArcFlat: 110,
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
  speed: 9000, damage: 90, pierce: 10, range: 3000, size: 2, hitscan: true,
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
  speed: 1100, drop: 1500, damage: 0, range: 4000, size: 8, explodeRadius: 140, explodeDamage: 90, explodePush: 1250, fuse: 2.5, bounce: 0.45,
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
  rebateChain: chain(['counter', 'thirds', 1]), rebateSnap: 0,
}

// Empty hands: Golpe keeps the wing slap; Fire prepares a separate beak strike.
const WING: ItemDef = {
  ...PISTOL, id: 'wing', name: 'Asa (sem item)', family: 'Sem item',
  mag: 0, rate: 2.5, damage: 0, recoilKick: 0, recoilPush: 0, muzzleX: 0, muzzleY: 0, length: 0,
  meleeDamage: 8, meleeRange: 80, meleeArc: 120, meleeArcUp: 120, meleeArcFlat: 120, meleeCooldown: 0, durability: 0, meleePush: 180, throwDamage: 0,
  trailWidth: 18, trailWisps: 3,
  rebateChain: chain(['dynamics', 'soft']), rebateSnap: 25, rebateSnapForce: 0.5,
}

// Taco: only for hitting (no shots). A baseball bat: a wide arc, a quick blow, a long reach; a rebate goes off
// faster with a wooden "tok", and its chain keeps the note and only accents it (the neutral taco). It has 8 blows
// in a row (its "bullets"), which come back one every half second, or all at once when it is emptied
const BAT: ItemDef = {
  ...WING, id: 'bat', name: 'Taco', family: 'Taco', reticle: 'dot', meleeOnly: true, mag: 8, reloadTime: 1.2, autoReload: true, refillTime: 0.5, refillAmount: 1,
  muzzleX: 0, muzzleY: 0, length: 74, meleeDamage: 22, meleeRange: 70, meleeArc: 150, meleeArcUp: 150, meleeArcFlat: 200,
  meleeTime: 0.16, meleePush: 420, durability: 0, throwDamage: 22, trailWidth: 30, trailWisps: 5,
  rebateChain: chain(['dynamics', 'accent']), rebateSnap: 25, rebateSnapForce: 0.5, rebateSpeed: 1.6, rebateTok: true,
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
const MUSIC_MELEE = { meleeDamage: 10, durability: 0, refillTime: 0.5, throwDamage: 10, recoilPush: 0, trailWidth: 20, trailWisps: 5 }

// Flautas → pistol: one short note per press
const FLUTE: ItemDef = {
  ...PISTOL, ...MUSIC_MELEE, id: 'flute', name: 'Flauta', family: 'Flautas', reticle: 'dot',
  mag: 16, reloadTime: 0.9, speed: 900, damage: 14, size: 10, range: 1000, spreadBase: 1, spreadShot: 1,
  recoilKick: 2, muzzleX: 60, muzzleY: 0, length: 60,
  instrument: true, voice: 'flute', pitchSet: 'chord', octave: 1, span: 2, noteLen: 0.22, wave: 7,
  rebateChain: chain(['octave', 'fixed', 1]),
}
// Palhetas → SMG: holding plays a fast arpeggio of the chord
const SAX: ItemDef = {
  ...SMG, ...MUSIC_MELEE, id: 'sax', name: 'Sax', family: 'Palhetas', reticle: 'circle',
  rate: 8, mag: 32, speed: 850, damage: 5, size: 9, range: 800,
  recoilKick: 2, muzzleX: 32, muzzleY: 18, length: 50,
  instrument: true, voice: 'sax', pitchSet: 'chord', octave: 0, span: 1.5, arp: 'updown', noteLen: 0.12, wave: 9,
  rebateChain: chain(['transpose', 'degree', 2]),
}
// Metais → rifle: a phrase of 3 notes per press, going through one enemy
const TRUMPET: ItemDef = {
  ...RIFLE, ...MUSIC_MELEE, id: 'trumpet', name: 'Trompete', family: 'Metais', reticle: 'cross',
  fireMode: 'burst', burst: 3, rate: 9, mag: 24, speed: 1300, damage: 10, size: 10, pierce: 1,
  recoilKick: 3, turnRate: 0, muzzleX: 66, muzzleY: -5, length: 66,
  instrument: true, voice: 'trumpet', pitchSet: 'scale', octave: 0, span: 2, arp: 'phrase', noteLen: 0.12, wave: 4,
  rebateChain: chain(['voices', 'power']),
}
// Cordas → pump: a strummed chord in a fan, each pellet one note of the chord
const GUITAR: ItemDef = {
  ...PUMP, ...MUSIC_MELEE, id: 'guitar', name: 'Violão', family: 'Cordas', reticle: 'cone',
  rate: 1.6, mag: 6, reloadTime: 0.35, pellets: 5, speed: 900, damage: 9, size: 10, range: 480,
  spreadBase: 24, spreadMax: 30, recoilKick: 5, muzzleX: 87, muzzleY: 0, length: 87,
  instrument: true, voice: 'guitar', pitchSet: 'chord', octave: -1, span: 2, noteLen: 0.5, wave: 3, strum: 0.022,
  rebateChain: chain(['voices', 'triad'], ['arpeggio', 'up', 0.15]),
}
// Cordas friccionadas → sniper: a held note in a beam; it keeps the enemy still while it plays
const VIOLIN: ItemDef = {
  ...SNIPER, ...MUSIC_MELEE, id: 'violin', name: 'Violino', family: 'Cordas friccionadas', reticle: 'laser', pathShow: 'off',
  fireMode: 'auto', rate: 1, mag: 4, reloadTime: 1.2, damage: 32, hitscan: false, pierce: 0, range: 1400,
  spreadBase: 0, spreadShot: 0, spreadMove: 0, spreadAir: 0, recoilKick: 0, recoilPush: 0, turnRate: 240, muzzleX: 78, muzzleY: 0, length: 78,
  instrument: true, voice: 'violin', pitchSet: 'chord', octave: 0, span: 2, noteLen: 0.5, wave: 0, beam: true, stun: 0.4,
  rebateChain: chain(['gliss', 'up', 3], ['dynamics', 'legato']),
}
// Teclas → launcher: a slow low note that bursts into a chord where it lands, pushing and converting around
const KEYS: ItemDef = {
  ...LAUNCHER, ...MUSIC_MELEE, id: 'keys', name: 'Teclado', family: 'Teclas', reticle: 'impact',
  rate: 1.2, mag: 3, reloadTime: 1.4, speed: 650, size: 14, explodeRadius: 150, explodeDamage: 45, explodePush: 900, damage: 0,
  recoilKick: 6, muzzleX: 82, muzzleY: -9, length: 82,
  instrument: true, voice: 'keys', pitchSet: 'chord', octave: -1, span: 1.5, noteLen: 0.6, wave: 5, ringNotes: 6,
  rebateChain: chain(['voices', 'seventh']),
}
// Percussion fires a musical note with a fuse, then lets out notes in a circle.
const TAMBOURINE: ItemDef = {
  ...GRENADE, ...MUSIC_MELEE, id: 'tambourine', name: 'Pandeiro', family: 'Percussão', reticle: 'grenade', landShow: 'hold',
  mag: 3, fuse: 1.6, explodeRadius: 120, explodeDamage: 20, explodePush: 1000, size: 14, muzzleX: 14, muzzleY: 0, length: 20,
  instrument: true, voice: 'bells', pitchSet: 'chord', octave: 1, span: 1, noteLen: 0.3, wave: 4, ringNotes: 10,
  rebateChain: chain(['ratchet', undefined, 3], ['drum', 'jingle', 1]), rebateSnap: 60, rebateSnapForce: 0.6,
}
// Harpas → bow: the charge is a glissando, the note rises with the charge and flies far and precise
const HARP: ItemDef = {
  ...BOW, ...MUSIC_MELEE, id: 'harp', name: 'Harpa', family: 'Harpas', reticle: 'bow',
  damage: 40, size: 12, speed: 1500, drop: 700, muzzleX: 21, muzzleY: -10, length: 30,
  instrument: true, voice: 'harp', pitchSet: 'scale', octave: 0, span: 2, noteLen: 0.6, wave: 3, gliss: true,
  rebateChain: chain(['voices', 'triad'], ['arpeggio', 'up', 1]),
}

// ---------- consumables (special abilities): Fire uses a dose and puts an effect on her for a while ----------
const CONSUMABLE = {
  ...WING, reticle: 'dot' as Reticle, fireMode: 'semi' as FireMode, rate: 2, mag: 1, reloadTime: 0.2, autoReload: false,
  meleeDamage: 4, meleeRange: 70, durability: 0, throwDamage: 4, throwMin: 275, throwSpeed: 900, throwCharge: 0.8,
  muzzleX: 10, muzzleY: -6, length: 0, consumable: true,
  rebateChain: [] as Transform[],
}
// Maryjane: red gummy bears. The buddha state: a third faster, and every start is slow at first and fast at the end
const MARYJANE: ItemDef = {
  ...CONSUMABLE, id: 'maryjane', name: 'Maryjane', family: 'Habilidades especiais',
  effectTime: 15, effectSpeed: 1.33, effectAccel: 1, effectCurve: 'superIn', effectRamp: 0.6, effectLook: 'buddha',
}
// Cok: a little glass bottle of soda. The opposite: slower in the end, but quicker off the mark
const COK: ItemDef = {
  ...CONSUMABLE, id: 'cok', name: 'Cok', family: 'Habilidades especiais',
  consumeKind: 'liquid',
  effectTime: 15, effectSpeed: 0.78, effectAccel: 1.33, effectCurve: 'linear', effectRamp: 0.5, effectLook: 'fizz',
}

export const DEFAULT_ITEMS: Record<ItemId, ItemDef> = {
  wing: WING, peck: PECK, bat: BAT, pistol: PISTOL, smg: SMG, rifle: RIFLE, pump: PUMP, sniper: SNIPER, launcher: LAUNCHER, grenade: GRENADE, bow: BOW,
  flute: FLUTE, sax: SAX, trumpet: TRUMPET, guitar: GUITAR, violin: VIOLIN, keys: KEYS, tambourine: TAMBOURINE, harp: HARP,
  maryjane: MARYJANE, cok: COK,
}
export const WEAPON_IDS: ItemId[] = ['pistol', 'smg', 'rifle', 'pump', 'sniper', 'launcher', 'grenade', 'bow']
export const INSTRUMENT_IDS: ItemId[] = ['flute', 'sax', 'trumpet', 'guitar', 'violin', 'keys', 'tambourine', 'harp']
export const CONSUMABLE_LIMITS: Partial<Record<ItemId, number>> = { maryjane: 13, cok: 3 }
export const CONSUMABLE_IDS: ItemId[] = ['maryjane', 'cok']
// items only for hitting
export const MELEE_IDS: ItemId[] = ['bat']
// the items a rack can hold
export const RACK_ITEM_IDS: ItemId[] = [...MELEE_IDS, ...WEAPON_IDS, ...INSTRUMENT_IDS, ...CONSUMABLE_IDS]
export const ITEM_IDS: ItemId[] = [...MELEE_IDS, ...WEAPON_IDS, ...INSTRUMENT_IDS, ...CONSUMABLE_IDS, 'wing', 'peck']
// the multiplier of the effect's speed-up curve (1 = linear)
export const curvePower = (c: AccelCurve) => ACCEL_CURVES.find(o => o.value === c)?.power ?? 1
// the voices an instrument can use (checked when loading)
const VOICE_IDS: Record<string, true> = { flute: true, sax: true, trumpet: true, guitar: true, violin: true, keys: true, harp: true, bells: true, chip: true, hum: true, bird: true }
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
  { key: 'meleeDamage', label: 'Dano do golpe', min: 0, max: 100, step: 1, group: 'Golpe' },
  { key: 'meleeRange', label: 'Alcance da asa', min: 30, max: 250, step: 5, unit: 'px', group: 'Golpe' },
  { key: 'meleeArc', label: 'Arco do golpe', min: 20, max: 360, step: 10, unit: '°', group: 'Golpe', hint: 'Do golpe para baixo; o giro acerta em volta toda' },
  { key: 'meleeCooldown', label: 'Intervalo', min: 0, max: 2, step: 0.05, unit: 's', group: 'Golpe', hint: '0 = golpes seguidos sem espera' },
  { key: 'meleeTime', label: 'Duração do giro', min: 0.05, max: 1, step: 0.01, unit: 's', group: 'Golpe', hint: 'Menos = giro mais rápido' },
  { key: 'meleePush', label: 'Empurrão', min: 0, max: 800, step: 10, unit: 'px/s', group: 'Golpe' },
  { key: 'comboWindow', label: 'Janela do combo', min: 0, max: 2, step: 0.05, unit: 's', group: 'Combo', hint: 'Até quanto tempo depois do fim de um golpe o próximo continua a sequência; depois disso ela recomeça' },
  { key: 'meleeArcUp', label: 'Arco para cima', min: 20, max: 360, step: 10, unit: '°', group: 'Combo', hint: 'Área de acerto do golpe para cima' },
  { key: 'meleeArcFlat', label: 'Arco horizontal', min: 20, max: 360, step: 10, unit: '°', group: 'Combo', hint: 'Área de acerto do golpe horizontal (o desenho cobre pelo menos 200°)' },
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
  { key: 'ringNotes', label: 'Notas ao estourar', min: 0, max: 16, step: 1, group: 'Música', hint: 'Saem em círculo' },
  { key: 'effectTime', label: 'Duração do efeito', min: 1, max: 120, step: 1, unit: 's', group: 'Efeito', hint: 'Um efeito por vez: o novo substitui o anterior' },
  { key: 'effectSpeed', label: 'Velocidade final', min: 0.3, max: 2.5, step: 0.01, unit: '×', group: 'Efeito', hint: '1,33 = +33%; 0,78 = −22%' },
  { key: 'effectAccel', label: 'Aceleração', min: 0.3, max: 3, step: 0.01, unit: '×', group: 'Efeito', hint: '1,33 = +33%' },
  { key: 'effectRamp', label: 'Tempo da arrancada', min: 0.1, max: 2, step: 0.05, unit: 's', group: 'Efeito', hint: 'Com curva ease: quanto leva até a velocidade final' },
]
export const ITEM_PARAM_GROUPS = [...new Set(ITEM_PARAM_META.map(m => m.group))]

// the "breaks after" defaults before v6 (weapons and instruments broke); a save with these numbers was never tuned
const V5_DURABILITY: Partial<Record<ItemId, number>> = {
  pistol: 40, smg: 35, rifle: 45, pump: 45, sniper: 30, launcher: 50, grenade: 20, bow: 25,
  flute: 12, sax: 12, trumpet: 12, guitar: 12, violin: 12, keys: 12, tambourine: 12, harp: 12,
}

const STORE = 'pigchicken-items-v1'
const EVENT = 'pigchicken-items'

export function loadItems(): Record<ItemId, ItemDef> {
  const out = structuredClone(DEFAULT_ITEMS)
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) || 'null')
    if (!saved) return out
    ITEM_IDS.forEach(id => {
      const s = saved[id]
      if (!s) return
      ITEM_PARAM_META.forEach(m => {
        const v = s[m.key]
        if (typeof v === 'number' && Number.isFinite(v)) (out[id] as Record<string, unknown>)[m.key] = Math.min(m.max, Math.max(m.min, v))
      })
      // Update untouched Bicada defaults saved before v4, preserving custom tuning.
      if (id === 'peck' && !(saved._v >= 4)) {
        const old = { meleeRange: 105, meleeArc: 30, meleeCooldown: 0.4, meleeTime: 0.24 }
        for (const key of Object.keys(old) as (keyof typeof old)[]) {
          if (s[key] === old[key]) out.peck[key] = DEFAULT_ITEMS.peck[key]
        }
      }
      // saved before blows had no interval (v5): every item's golpe goes back to 0 (the Bicada keeps its own)
      if (id !== 'peck' && !(saved._v >= 5)) out[id].meleeCooldown = 0
      // saved before weapons and instruments never broke and the taco had blows (v6): an untouched old default takes
      // the new one (never breaks; 8 blows that come back on their own); custom numbers stay
      if (!(saved._v >= 6)) {
        if (s.durability === V5_DURABILITY[id]) out[id].durability = DEFAULT_ITEMS[id].durability
        if (id === 'bat') {
          if (!s.mag) out.bat.mag = DEFAULT_ITEMS.bat.mag
          if (s.reloadTime === 1.1) out.bat.reloadTime = DEFAULT_ITEMS.bat.reloadTime
        }
      }
      // saved before the sniper fired on release (v2): it takes the new mode
      if (['semi', 'auto', 'burst', 'charge', 'release'].includes(s.fireMode) && !(id === 'sniper' && !(saved._v >= 2))) out[id].fireMode = s.fireMode
      if (PATH_SHOWS.some(o => o.value === s.pathShow)) out[id].pathShow = s.pathShow
      // saved before the grenade showed its blast only with Fire held (v3): it takes the new default
      if (PATH_SHOWS.some(o => o.value === s.landShow) && !(id === 'grenade' && !(saved._v >= 3))) out[id].landShow = s.landShow
      ;(['autoReload', 'slideFire', 'shellReload', 'hitscan', 'quantize', 'beam', 'gliss', 'meleeInterrupt', 'rebateTok'] as const).forEach(k => { if (typeof s[k] === 'boolean') out[id][k] = s[k] })
      if (ARPS.some(a => a.value === s.arp)) out[id].arp = s.arp
      if (s.pitchSet === 'chord' || s.pitchSet === 'scale') out[id].pitchSet = s.pitchSet
      if (typeof s.voice === 'string' && s.voice in VOICE_IDS) out[id].voice = s.voice
      if (ACCEL_CURVES.some(c => c.value === s.effectCurve)) out[id].effectCurve = s.effectCurve
      if (EFFECT_LOOKS.some(c => c.value === s.effectLook)) out[id].effectLook = s.effectLook
      if (Array.isArray(s.combo) && s.combo.length >= 1 && s.combo.length <= COMBO_MAX && s.combo.every(isSwingKind)) out[id].combo = s.combo.slice()
      if (Array.isArray(s.rebateChain)) out[id].rebateChain = s.rebateChain.map(cleanTransform).filter((t: Transform | null): t is Transform => !!t).slice(0, CHAIN_MAX)
      if (typeof s.trailColor === 'string' && /^#[0-9a-f]{6}$/i.test(s.trailColor)) out[id].trailColor = s.trailColor
    })
  } catch { /* storage unavailable */ }
  return out
}

export function saveItems(items: Record<ItemId, ItemDef>) {
  try { window.localStorage.setItem(STORE, JSON.stringify({ ...items, _v: 6 })) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribeItems(onChange: (items: Record<ItemId, ItemDef>) => void) {
  const handler = () => onChange(loadItems())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
