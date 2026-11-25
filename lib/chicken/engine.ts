// Player chicken: a rigged 2D chicken that walks, runs, jumps, flies, broods, slides, clings to walls
// and can be picked up with the pointer. Ported from the "Pátio da Caipira" prototype.
//
// It draws in its own full-screen SVG layer above the page. Colliders come from the page itself:
// every element with `data-chicken-platform` (or a direct child of `data-chicken-platforms`) is a
// floating box: its horizontal edges are one-way floors, its sides are walls she grabs when her feet
// touch them in the air with no movement control held, and its underside is a ceiling she grabs rising into it
// with Up held (she hangs upside down). The limits (screen sides and top, or the Pátio's world) are solid walls
// and a solid ceiling she climbs by pushing into them, going round the corners; the ground sits `groundHeight` px
// above the bottom of the viewport. A closed outline (`data-chicken-shape`) splits into floors, walls and ceilings by
// how each edge faces; with `data-chicken-hard` ("Objeto duro") they are all solid and its walls stop her.
import { requestGameFrame, cancelGameFrame } from '../game-frame'
import type { PeckPose } from '../pigchicken/peck'
import { LOOK_ART, type ChickenArtSet, type ChickenLook } from './look-art'
import { speciesParams, type BirdSpecies } from './species'
import { variantClass } from './beast-art'
import { armMarkup, type ArmsSpec } from './arm-rig'
import { CHICKEN_CLUCKS, CHICKEN_PARAMS, CHICKEN_PX_PARAMS, CHICKEN_VOICES, SCALE_BASE, chickenClucks, type ChickenParams } from './params'
import { getChickenConfig, subscribeChickenConfig, type ChickenConfig } from './config'
import { barPoint, bodyHeight, poseOf } from './body-frame'
import { CHICKEN_ACTIONS, virtualActionHeld, isChickenControlsListening, readTouchMoveStick, touchMoveExtent, loadChickenControls, subscribeChickenControls, type ChickenAction, type ChickenControls } from './controls'
import { advanceShockingAirCharge, directionalJumpImpulse, shockingAirMultiplier } from './jump-impulse'
import { grabDamageStep } from './grab-damage'
import { clingAnim, clingSpeedLimit } from './cling-brood'
import { autoWalkArrived, autoWalkHeldStill, cancelsAutoWalk } from './auto-walk'
import { crossDirection, crossFloor, hangSwitch, standSwitch, wallSwitch } from './side-switch'
import { crossingBranch } from './line-crossing'
import { shockingAirLegPose } from './shocking-pose'
import { magnetVector } from './analog-magnet'
import { createThrowTransition } from './throw-transition'
import { chickenPlatformElements, chickenPlatformRects, chickenPlatformLines, chickenPlatformWalls, chickenPlatformBounce, chickenPlatformShape, chickenPlatformHard, type PlatformOcclusion } from './platform-geometry'
import { blockHardWalls, clipAboveGround, crossTarget, crossesFused, fuseFaces, polygonContains, shapeEdges, type FusedBox, type JoinedShape } from './hard-shapes'
import { trampolineVelocity, type TrampolineParams } from '../pigchicken/trampoline'
import { allKeyTokens, keyTokensFor, padTokensFor, stickExtentFor, stickFor, type InputDeviceId } from './input-devices'
import { slowWalkMult } from './analog-walk'
import { mixGain } from '../pigchicken/mixer'
import { LIMIT_BORDER } from './limits'
import { stageHeight, stageWidth, stageY } from "../stage-size"

export type ChickenState = { x: number; y: number; angle: number; shoulder: { x: number; y: number }; vx: number; vy: number; face: number; scale: number; grounded: boolean; state: string; networkAnimation?: string; held: boolean; width: number; height: number; groundY: number; species?: BirdSpecies; hp?: number; maxHp?: number }
// Game hooks (PigChicKen's Parquinho): the screen walls move with the camera, the camera shifts her, aim can set where she faces
// accelMult scales her acceleration; accelPower > 1 eases each start (1 linear, 3 "ease-super-in": slow, then fast),
// reaching full speed in accelRamp seconds; buddha / fizz are how many doses of each consumable look she has
// (the Pátio): they stack up (more glow, more bubbles) and show together
export type ChickenGame = { gameMode?: boolean; throwHeld?: boolean; throwCharging?: boolean; aimFace?: number | null; lookAngle?: number | null; speedMult?: number; accelMult?: number; accelPower?: number; accelRamp?: number; buddha?: number; fizz?: number; seat?: ChickenSeat | null }
// Sitting at a fixed instrument (the Pátio's Harpa: lib/pigchicken/fixed-instruments.ts): her feet stay at (x, y) on
// the screen, she faces `face` and no movement input counts, in the seated pose. Pular, a blast or being dragged
// gets her up: takeSeatLeft() says so once, for the game to free the seat. keepJump: Pular does not get her up (the
// Piano de cauda, where Pular is a dynamic)
export type ChickenSeat = { x: number; y: number; face: number; keepJump?: boolean }
// A chicken driven from outside (an online player's, from the network): where she is on this screen and what she
// is doing. She follows it smoothly, animates by its state and ignores input, physics and the pointer.
// cling: the angle (radians) of the surface she holds, turned like hers (null: not clinging); then x/y is the
// contact point, vx her speed along the surface and state the pose she shows on it (cling, walk, idle...)
export type ChickenRemote = { x: number; y: number; vx: number; vy: number; face: number; state: string; cling?: number | null }
// the states a remote chicken animates; anything else (portal, the shocking jump's wind-up) looks like the nearest
// one (cling without a surface angle, from an older browser, as a jump)
// how far her body comes down while she sits on a stool (px at size 1)
const SEAT_SINK = 16
const REMOTE_STATE: Record<string, string> = { cling: 'jump', shockingPrepare: 'brood', portal: 'idle', portalArrival: 'idle' }
const REMOTE_SNAP = 400

export type ChickenEngine = {
  setRemote: (source: (() => ChickenRemote | null) | null) => void
  // the item in her hand (its key) and where it points (radians; else where she looks, null: nowhere), for the online Pátio
  getHeldItem: () => string | null
  getAim: () => number | null
  setVirtual: (action: ChickenAction, on: boolean) => void
  getState: () => ChickenState
  getMotionState: () => Omit<ChickenState, 'shoulder'>
  /** Health (docs/mechanics/chicken/characters.md): takes `amount` off (from a source at x `fromX`, for Pig's Guarda). */
  hurt: (amount: number, fromX?: number) => void
  /** What happens when her health reaches zero (she turns into a Filhote, lib/chicken/baby.ts); she gets it all back. */
  setOnDown: (fn: (() => void) | null) => void
  /** A bar over her head that is not her health (the Filhote's music bar, 0..1), or null for none. */
  setMeter: (fill: number | null) => void
  /** The strong blow being charged with an empty hand (Pig's Correntada, Ken's Rabada), 0..1, or null. */
  setBareCharge: (charge: number | null) => void
  // every action held right now (keys, gamepad buttons and on-screen controls)
  getActions: () => Record<ChickenAction, boolean>
  // Only actions held NOW: no remembered taps, and no consumption (portals, pickup hints).
  peekActions: () => Record<ChickenAction, boolean>
  peekUse: (now: number) => boolean
  // Inside a house (lib/pigchicken/house-rooms.ts): only the colliders of that room (`data-chicken-room`) are hers,
  // and outside (null) none of any room is.
  setRoom: (id: string | null) => void
  canPointAndClick: () => boolean
  // Clicking a portal's button may walk her there in every mode (the Pátio's game mode included).
  canWalkToPortal: () => boolean
  walkToPortal: (id: string, point: { x: number; y: number }) => boolean
  isWalkingToPortal: (id: string) => boolean
  cancelPortalWalk: (id: string) => void
  isShiftHeld: () => boolean
  // the Pegar of the last getActions came only from inputs Correr also has (a shared key or pad button, or the on-screen
  // Correr with "Correr também pega itens"): it still takes items, but does not equip one she already carries
  grabIsRun: () => boolean
  // one press of an action that has no button to hold (the mouse wheel's bind, components/pigchicken/parquinho.tsx):
  // it counts in the next getActions and in the next physics step, like a key pressed and let go between two reads
  tapAction: (action: ChickenAction) => void
  // Freeze gameplay and shrink/fade the drawn rig into a screen-space portal centre.
  // Repeated calls update the target without restarting; null cancels the transition.
  setPortalEntry: (entry: { x: number; y: number; durationMs: number } | null) => void
  // glide: she comes out of the other portal of a pair in the same Pátio (the camera runs there from the first one)
  arriveAtPortal: (arrival: { x: number; y: number; durationMs: number; glide?: boolean }) => void
  // The portal she is going into or coming out of now: its centre on the screen and how far the animation is (0..1).
  getPortalTransit: () => { mode: 'enter' | 'arrive'; x: number; y: number; k: number; glide?: boolean } | null
  // camera moved: move her (and everything she keeps in screen coordinates) by dx, dy pixels
  shift: (dx: number, dy?: number) => void
  // left and right walls and the ceiling (top) in screen pixels; null = the screen edges inside the limits' border
  setBounds: (bounds: { lo: number; hi: number; top?: number } | null) => void
  // the ground's height from the bottom of the screen (the Pátio raises it on a phone held upright)
  setGroundHeight: (h: number) => void
  // magnification of the shared Pátio camera
  setCameraZoom: (zoom: number) => void
  // what the Zona where she stands does to her (lib/pigchicken/zone-physics.ts): a factor on her gravity and the
  // x-ray look, and its time (slow motion: a share of each frame for all she does); the Pátio sets it every frame
  setZoneEffects: (fx: { gravity: number; time?: number; xray: boolean }) => void
  // the Pátio's point-and-click: walk to this spot (screen pixels as clicked, before the camera's zoom)
  walkTo: (point: { x: number; y: number }) => void
  // that walk is still going (not the portal button's), and calling it off
  isWalking: () => boolean
  stopWalk: () => void
  setGame: (game: ChickenGame) => void
  takeSeatLeft: () => boolean
  takeSlam: () => boolean
  // the item in her wing: SVG art pointing right with the grip at (0, 0), in rig units; drawn in front of
  // her body and in front of the wing, turned to `angle` (screen radians), pulled back by `kick` rig units.
  // The wing turns with it: its tip follows the aim.
  // `bow`: a bow played across it (the violin), held by the wing: `x` is where it crosses the strings (rig units
  // along the item), `stroke` 0..1 how far the bow has slid (0: played at its frog, 1: at its tip)
  // `rig`: how it sits on her (rig units on the item's drawing): the point (x, y) sits on her shoulder or mouth (`at`)
  // and the item turns around it; `hand` / `back`: the points the wing's and the back wing's tips hold, the wing turning
  // and stretching to keep touching them (the bow, while it plays, takes the wing's hand)
  // `archery`: a bow and its arrow drawn apart ("Arco e Flecha"): the string runs from one end on the bow to the
  // arrow's nock at (x, y) to the other end (`string`: [x1, y1, x2, y2]), and the arrow (`arrow`: its drawing with the
  // nock at (0, 0), or null with none on the string) sits with its nock there; all on the item's drawing, turning with it
  // `staff`: a staff carried in its own pose (lib/pigchicken/staff-pose.ts), in her body's frame: the wing's hand at
  // (x, y) from her shoulder holding the drawing's point (gripX, gripY), the staff turned to `angle` (degrees, 0 = to
  // her front, -90 = up). A swing leaves from this pose and comes back to it
  // `off`: with a staff, one of it in the back wing's hand, carried in this pose (the two Boomerangs)
  // `back`: the back wing holds the item (the second Boomerang): with `off`, carried there, and the item itself is not
  // shown; without, the back wing moves as the front wing would. The front wing rests
  setHeld: (held: { svg: string; itemKey?: string; angle: number; kick: number; pull?: number; throwing?: boolean; atHand?: boolean; consumable?: { upright: number; progress?: number }; bow?: { x: number; stroke: number } | null; rig?: HeldRig | null; archery?: { x: number; y: number; arrow: string | null; string: [number, number, number, number] } | null; staff?: HeldStaff | null; off?: HeldStaff | null; back?: boolean; swap?: boolean; charging?: boolean } | null) => void
  // the melee swing: the wing turns to `angle` (screen radians) and stretches out to `reach` px from her
  // shoulder; a held item rides on the wing tip. `t` 0..1 eases the wing out and back in. `size`: how much bigger
  // the item is drawn at the height of the blow (×, a charged strong blow)
  setPeck: (peck: PeckPose | null) => void
  setSwing: (swing: { angle: number; reach: number; t: number; size?: number; bare?: boolean; heavy?: boolean } | null) => void
  // her species class now ('chicken', 'pig', 'fox', 'chick'): the one set, or the one her look gives
  speciesNow: () => BirdSpecies
  // the most items of each category she carries now (instruments, weapons, utilities: Personagem → Inventário, by class)
  inventoryLimits: () => [number, number, number]
  // a point on the held item's drawing (rig units, x forward from the grip, y down) on the screen when the
  // item points at `angle` (screen radians); her shoulder for (0, 0)
  heldPoint: (angle: number, x: number, y: number) => { x: number; y: number }
  rigPoint: (point: 'hand' | 'mouth' | 'neck') => { x: number; y: number }
  // A push (px/s), e.g. recoil, only in the air by default. Blast=true also launches
  // her off the floor/wall and keeps its sideways impulse until landing.
  // `damage`: what the blow that pushes her does (a blast, a dropping). Grabbed on a wall or a ceiling, she holds on
  // (no push at all) until the damage taken on that grab reaches `clingDropDamage`; without it, the push always
  // takes her off
  impulse: (vx: number, vy: number, blast?: boolean, damage?: number) => void
  // the input devices this chicken listens to (local players: each drives their own); null = every device
  setDevices: (devices: InputDeviceId[] | null) => void
  getDevices: () => InputDeviceId[] | null
  // her look, apart from the central configuration's (another local player's chicken); null follows the configuration
  setLook: (look: ChickenLook | null) => void
  /** Her species from now on (lib/chicken/species.ts): the tuning of her body and movement; her art is setArt's. */
  setSpecies: (species: BirdSpecies | undefined) => void
  // a whole set of parts of her own (a chick's style), over the look; null goes back to the look
  setArt: (art: ChickenArtSet | null) => void
  // driven by a bot (the chicks' follow brain): read once per step, it replaces every input (keys, gamepad, touch);
  // null gives her back to her devices
  setBot: (read: (() => Partial<Record<ChickenAction, boolean>>) | null) => void
  // falls from above the screen at x (screen px): a player arriving in the lobby
  dropAt: (x: number) => void
  // puts her at (x, y) (screen px, her feet) facing `face`, still, in the air: she falls onto the floor below
  // (the Quadro de lousa's ghost starting its move again)
  placeAt: (x: number, y: number, face?: 1 | -1) => void
  // the key she carries for the hard walls that lead to another room (`data-chicken-cross="<key>,<reach>[,<skip>]"`,
  // the Grade de blocos): Brood + Jump on one of them takes her through only while the keys match
  setCrossKey: (key: string | null) => void
  // how many times she went through such a wall so far (the grid tells a way out of a room from a slip through a wall)
  crossings: () => number
  destroy: () => void
}

// flip: the wings that hold it are mirrored across their own length (shoulder to tip), for poses that turn them upside down
export type HeldStaff = { x: number; y: number; angle: number; gripX: number; gripY: number; flip?: boolean; grip2?: { x: number; y: number } | null }
export type HeldRig = { at: 'shoulder' | 'mouth'; x: number; y: number; hand?: { x: number; y: number } | null; back?: { x: number; y: number } | null; flip?: boolean }

// ceil: a ceiling she hangs from upside down (never a floor; counted with the walls so floors skip it)
// hardN: the outside of an "Objeto duro" edge (its walls stop her, its floors catch her feet)
// side: a piece of a thin line with two sides (a power wire, `data-chicken-wire`): `top` the floor she walks on,
// otherwise the ceiling under it she hangs from; `base` names the line, so she can switch to its other side
type Seg = { id: string; ax: number; ay: number; bx: number; by: number; anchorX: number; clipOffset?: number; topEdge: boolean; len: number; ang: number; wall: boolean; solid: boolean; bounce?: TrampolineParams; ceil?: boolean; hardN?: number[]; side?: { base: string; top: boolean }; cross?: SegCross; fused?: string; join?: string }
// a hard wall with a room behind it (`data-chicken-cross="<key>,<reach>[,<skip>]"`): who it lets through, how far
// behind it the surface she comes out on can be and, on a slanted one, how near behind it nothing counts
type SegCross = { key: string; reach: number; skip?: number }

const NS = 'http://www.w3.org/2000/svg'
const DEG = 180 / Math.PI
const TAU = Math.PI * 2
const CONSUMABLE_WING_AIM_LIMIT = 25
// leg chain (bird anatomy): hip, hidden inside the body -> knee at the belly -> ankle (bends back) -> foot joint -> toes
const LEG = { F: { hx: -14 }, B: { hx: -26 } } as const
const LF = 30, LT = 32, LS = 40, HIP_Y = -88, FOOT_Y = -3, NECK_LEN = 56
// from her feet to the top of her head (comb), in rig units: what bumps into a ceiling
const HEAD_TOP = 200
// how long after pressing a direction against her look Jump still switches sides (seconds)
const SWITCH_GRACE = 0.18
// Brood pressed right after a ground jump (Jump still held) still counts as the shocking jump's preparation:
// a trigger (LT) reaches its threshold a little after the button pressed together with it
const SHOCKING_GROUND_GRACE = 0.12
// a box collider's edges: `<element id>:<part>`, clipped pieces add `~n`
const BOX_PART = /^(.*):(top|bottom|left|right|under|topBelow)(?:~\d+)?$/
// where Ken's tail points at rest from its pivot (degrees, rig units, 0 = forward): the Rabada turns it from here
const TAIL_REST_DEG = 117
const PIV: Record<string, [number, number]> = {
  legF: [-14, -88], tibF: [-14, -58], shinF: [-14, -26], toeF: [-14, 14],
  legB: [-26, -88], tibB: [-26, -58], shinB: [-26, -26], toeB: [-26, 14],
  body: [0, -62], neck: [24, -124], head: [40, -178], wing: [14, -120], tail: [-52, -110],
}
// the wing's tip (its far back corner) seen from its pivot at the shoulder, in rig units: the swing aims it
export const CHICKEN_HAND = { x: -44, y: -92 } as const
export const CHICKEN_MOUTH = { x: 70, y: -188 } as const
// her shoulder (the wing's pivot) in rig units: what a held item's place on her body is measured from
export const CHICKEN_SHOULDER = { x: PIV.wing[0], y: PIV.wing[1] } as const
const HAND_DX = CHICKEN_HAND.x - PIV.wing[0], HAND_DY = CHICKEN_HAND.y - PIV.wing[1]
const WING_TIP_DEG = Math.atan2(HAND_DY, HAND_DX) * 180 / Math.PI, WING_TIP_LEN = Math.hypot(HAND_DX, HAND_DY)
/** The near wing's SVG transform (rig units) that turns and stretches it from the shoulder until its tip is at (x, y) from the shoulder. */
export function wingReachTransform(x: number, y: number, flip = false) {
  const [px, py] = PIV.wing
  return `translate(${px} ${py}) rotate(${Math.atan2(y, x) * 180 / Math.PI}) scale(${Math.hypot(x, y) / WING_TIP_LEN} ${flip ? -1 : 1}) rotate(${-WING_TIP_DEG}) translate(${-px} ${-py})`
}
const rot = (k: string, a: number) => `rotate(${a.toFixed(2)} ${PIV[k][0]} ${PIV[k][1]})`
const legMarkup = (k: 'Front' | 'Back', x: number) => `
  <g data-part="leg${k}Wrap"><g data-part="leg${k}">
    <path class="c-drum" d="M${x} -88 L ${x} -58" stroke-width="6" stroke-linecap="round" fill="none"/>
    <g data-part="tib${k}"><path class="c-drum" d="M${x} -58 L ${x} -26" stroke-width="9" stroke-linecap="round" fill="none"/>
      <g data-part="shin${k}"><path class="c-shank" d="M${x} -26 L ${x} 14" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <g data-part="toe${k}"><path class="c-shank" d="M${x} 14 L ${x + 15} 16 M${x} 14 L ${x + 10} 18 M${x} 14 L ${x - 9} 16" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>
      </g>
    </g>
  </g></g>`
// the violin's bow, drawn from its frog at (0, 0) up to its tip at (0, -BOW_LEN): a thin curved stick, the
// pale hair beside it, the dark frog with its pearl eye
const BOW_LEN = 118
// the bow crosses the strings a little off square, its frog toward her
const BOW_TILT = 10
const BOW_MARKUP = `
  <path d="M1.5 -3 L1.5 ${-BOW_LEN + 5}" stroke="#efe6cf" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M-1 4 Q-4.5 ${-BOW_LEN / 2} -1 ${-BOW_LEN}" fill="none" stroke="#6b3f1f" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M-1.5 ${-BOW_LEN} L3 ${-BOW_LEN + 1.5} L2.5 ${-BOW_LEN + 6} Z" fill="#6b3f1f"/>
  <rect x="-2.5" y="-5" width="6.5" height="11" rx="1.5" fill="#1d1a18"/>
  <circle cx="0.8" cy="0.5" r="1.3" fill="#f4f1e8"/>`
// Consumable states: the buddha state's calm golden glow behind her;
// a soda's fizz, little bubbles rising around her
// each buddha dose adds a glow layer (a little wider, overlapping: the shadow gets more intense); each soda dose adds bubbles
const BUDDHA_LAYERS = 6
const FIZZ_BUBBLES = [[-62, 0, 6], [-32, 0.7, 4.5], [8, 1.5, 7], [38, 0.35, 5], [66, 1.1, 6], [-12, 1.9, 4],
  [-48, 1.2, 5], [22, 0.15, 4.5], [52, 1.7, 5.5], [-72, 1.55, 4], [-20, 0.5, 6.5], [76, 0.85, 4.5]]
const FIZZ_PER_DOSE = 6
const AURA_MARKUP = `<g data-part="aura" style="display:none">
    ${Array.from({ length: BUDDHA_LAYERS }, (_, i) =>
      `<ellipse data-layer="${i}" cx="0" cy="${-110 - i * 2}" rx="${120 + i * 9}" ry="${140 + i * 11}" fill="url(#chk-buddhaGlow)" style="display:${i ? 'none' : ''}"><animate attributeName="opacity" values="0.75;1;0.75" dur="${3.2 + i * 0.3}s" repeatCount="indefinite"/></ellipse>`).join('')}
  </g>
  <g data-part="fizz" style="display:none">
    ${FIZZ_BUBBLES.map(([x, d, r], i) =>
      `<circle data-bubble="${i}" cx="${x}" r="${r}" fill="rgba(255,255,255,0.12)" stroke="#fff3df" stroke-width="2.6" opacity="0" style="display:${i < FIZZ_PER_DOSE ? '' : 'none'}"><animate attributeName="cy" values="-20;-210" dur="2.2s" begin="${d}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.9;0" dur="2.2s" begin="${d}s" repeatCount="indefinite"/></circle>`).join('')}
  </g>`
const HALO_MARKUP = `<g data-part="halo" style="display:none">
    <circle cx="34" cy="-204" r="34" fill="none" stroke="#ffd166" stroke-width="9" opacity="0.22"/>
    <circle cx="34" cy="-204" r="34" fill="none" stroke="#ffe08a" stroke-width="3.5" opacity="0.95"><animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite"/></circle>
  </g>`
// a Zona with x-ray (lib/pigchicken/zone-physics.ts): the same look as someone shocked by a lightning weapon
// (components/pigchicken/draw/shock.ts): the body dark and bluish with a cold glow around it, and the bones showing
const XRAY_BONE = '#f1fbff', XRAY_SOCKET = '#1b2438', XRAY_GLOW = '#86d9ff'
const XRAY_DEFS = `
    <filter id="chk-xray" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0.19  0 0 0 0 0.235  0 0 0 0 0.36  0 0 0 1 0"/>
    </filter>
    <filter id="chk-xrayBone" x="-20%" y="-20%" width="140%" height="140%">
      <feFlood flood-color="${XRAY_BONE}"/><feComposite in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="chk-xrayGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feFlood flood-color="${XRAY_GLOW}" flood-opacity="0.85"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="6" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`
const XRAY_STROKE = `fill="none" stroke="${XRAY_BONE}" stroke-linecap="round" stroke-linejoin="round"`
// the spine from the tail to the neck, the ribs hanging from it, the keel and the hips (in the body)
const XRAY_BODY = `<g data-part="bonesBody" style="display:none">
    <path d="M-52 -104 Q -16 -120 22 -124" stroke-width="5" ${XRAY_STROKE}/>
    <path d="${[-34, -20, -6, 8].map(x => `M${x} ${-116 + x * -0.05} Q ${x + 14} ${-96} ${x + 6} ${-76}`).join(' ')}" stroke-width="3.2" ${XRAY_STROKE}/>
    <path d="M30 -120 Q 50 -100 34 -76" stroke-width="4" ${XRAY_STROKE}/>
    <ellipse cx="-22" cy="-90" rx="15" ry="7" fill="${XRAY_BONE}"/>
  </g>`
// the wing's bones, from the shoulder to its tip (in the wing)
const XRAY_WING = `<g data-part="bonesWing" style="display:none"><path d="M14 -120 L -12 -102 L -44 -92" stroke-width="3.5" ${XRAY_STROKE}/></g>`
// the neck's vertebrae (in the neck) and the skull with its eye socket and the beak's bone (in the head)
const XRAY_NECK = `<g data-part="bonesNeck" style="display:none"><path d="M24 -124 L 40 -176" stroke-width="7" stroke-dasharray="5 3" ${XRAY_STROKE.replace('stroke-linecap="round"', 'stroke-linecap="butt"')}/></g>`
const XRAY_HEAD = `<g data-part="bonesHead" style="display:none">
    <circle cx="45" cy="-190" r="13" fill="${XRAY_BONE}"/>
    <path d="M55 -197 L 73 -189 L 55 -182 Z" fill="${XRAY_BONE}"/>
    <circle data-part="xraySocket" cx="51" cy="-192" r="4.6" fill="${XRAY_SOCKET}"/>
  </g>`
const SVG_MARKUP = `
  <defs>${XRAY_DEFS}
    <clipPath id="chk-wingClip"><path d="${LOOK_ART.WING}"/></clipPath>
    <pattern id="chk-pearlDots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.35" fill="#eef1f5"/><circle cx="5.5" cy="5.5" r="1.35" fill="#eef1f5"/></pattern>
    <radialGradient id="chk-buddhaGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.55"/><stop offset="0.6" stop-color="#ffd166" stop-opacity="0.22"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse data-part="shadow" rx="60" ry="7" fill="#000" opacity="0.35"/>
  <g data-part="hpBar" style="display:none"><rect x="-32" y="-4" width="64" height="8" rx="4" fill="#0b0f0c" opacity="0.7"/><rect data-part="hpFill" x="-30" y="-2" width="60" height="4" rx="2" fill="#3fcf6b"/></g>
  <g data-part="root" style="pointer-events: visiblePainted; cursor: grab; touch-action: none">
    ${AURA_MARKUP}
    ${legMarkup('Back', -26)}${legMarkup('Front', -14)}
    <g data-part="body">
      <g data-part="wingBack"><g data-part="artWingBack"></g><g data-part="heldOff" style="display:none"></g></g>
      <g data-part="tail"><g data-part="artTail"></g></g>
      <g data-part="artTorso"></g>
      <g data-part="armB"></g>
      <g data-part="neck"><g data-part="artNeck"></g>
        <g data-part="head">${HALO_MARKUP}<g data-part="artComb"></g><g data-part="artFace"></g><g data-part="artBeak"></g><g data-part="artWattle"></g>
          <circle data-part="sclera" cx="51" cy="-192" r="4.6" fill="#fff8e1"/>
          <circle data-part="pupil" cx="52.5" cy="-192" r="2.8" fill="#1f1a17"/>
          <ellipse data-part="lid" cx="51" cy="-197.4" rx="5.4" ry="0" fill="#f7b21b"/>
          ${XRAY_HEAD}
        </g>
        ${XRAY_NECK}
      </g>
      <g data-part="wing"><g data-part="artWing"></g>${XRAY_WING}</g>
      <g data-part="armF"></g>
      <g data-part="heldPivot" transform="translate(14 -120)"><g data-part="held"><path data-part="heldString" fill="none" stroke="#e8e2d0" stroke-width="1.2" stroke-linejoin="round" style="display:none"/><g data-part="heldArrow" style="display:none"></g><g data-part="heldArt"></g><g data-part="heldBow" style="display:none">${BOW_MARKUP}</g></g></g>
      ${XRAY_BODY}
    </g>
  </g>`

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const approach = (v: number, t: number, d: number) => v < t ? Math.min(t, v + d) : Math.max(t, v - d)
const ease = (cur: number, tgt: number, k: number, dt: number) => cur + (tgt - cur) * Math.min(1, k * dt)
const smooth = (t: number) => t * t * (3 - 2 * t)

function isTextField(t: EventTarget | null) {
  const e = t as HTMLElement | null
  if (!e || !e.tagName) return false
  return (e.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes((e as HTMLInputElement).type)) || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable
}

// the clucks' audio, shared by every chicken on the page and closed when the last one goes
const sharedAudio: { ctx: AudioContext | null; users: number; buffers: Record<string, AudioBuffer> } = { ctx: null, users: 0, buffers: {} }
function sharedAudioContext() {
  const a = sharedAudio
  if (a.ctx) { if (a.ctx.state === 'suspended') void a.ctx.resume(); return a.ctx }
  try { a.ctx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { a.ctx = null; return null }
  const ctx = a.ctx
  ;[CHICKEN_CLUCKS, ...Object.values(CHICKEN_VOICES)].flatMap(v => Object.values(v).flat()).forEach(name => {
    if (a.buffers[name]) return
    fetch(`/audio/chicken/${name}.mp3`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { a.buffers[name] = buf }).catch(() => {})
  })
  return ctx
}
function releaseSharedAudio() {
  const a = sharedAudio
  a.users = Math.max(0, a.users - 1)
  if (!a.users && a.ctx) { void a.ctx.close(); a.ctx = null }
}

// species: the bird's tuning over the configured chicken's (lib/chicken/species.ts); art: its own set of parts
export function createChickenEngine(host: HTMLElement, opts: { groundHeight: number; look?: ChickenLook; dropIn?: boolean; dropAvoid?: (w: number) => [number, number][]; fixedScale?: boolean; species?: BirdSpecies; art?: ChickenArtSet; ghost?: boolean }): ChickenEngine {
  sharedAudio.users++
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;touch-action:none'
  svg.style.transformOrigin = '50% 50%'
  svg.innerHTML = SVG_MARKUP
  host.appendChild(svg)
  const part = (name: string) => svg.querySelector(`[data-part="${name}"]`) as SVGGraphicsElement
  const el: Record<string, SVGGraphicsElement> = {}
  ;['shadow', 'hpBar', 'hpFill', 'root', 'body', 'wingBack', 'tail', 'neck', 'artNeck', 'head', 'wing', 'sclera', 'pupil', 'lid', 'heldPivot', 'held', 'heldString', 'heldArrow', 'heldArt', 'heldOff', 'heldBow', 'aura', 'fizz', 'halo', 'bonesBody', 'bonesWing', 'bonesNeck', 'bonesHead', 'xraySocket', 'artWingBack', 'artTail', 'artTorso', 'artComb', 'artFace', 'artBeak', 'artWattle', 'artWing', 'armF', 'armB'].forEach(n => { el[n] = part(n) })
  ;(['F', 'B'] as const).forEach(k => {
    const n = k === 'F' ? 'Front' : 'Back'
    el['leg' + k] = part('leg' + n); el['tib' + k] = part('tib' + n); el['shin' + k] = part('shin' + n); el['toe' + k] = part('toe' + n); el['wrap' + k] = part('leg' + n + 'Wrap')
  })

  const rigMatrices = new Map<SVGGraphicsElement, DOMMatrix | null>()
  function rigMatrix(node: SVGGraphicsElement) {
    if (!rigMatrices.has(node)) rigMatrices.set(node, node.getCTM())
    return rigMatrices.get(node)!
  }

  // ---------- look ----------
  let tailSwing = 1
  // her mouth (rig units, in the head): every beak names its own, where a wind instrument's mouthpiece sits
  let mouthAt: { x: number; y: number } = CHICKEN_MOUTH
  const lookArt = (look: ChickenLook) => Object.fromEntries(LOOK_ART.SLOTS.map(sl => [sl.id, LOOK_ART.art[sl.id][look[sl.id]] ?? Object.values(LOOK_ART.art[sl.id])[0]])) as ChickenArtSet
  let ownArt: ChickenArtSet | null = opts.art ?? null
  // the eye's middle in the head (rig units): every face may set its own
  let eyeAt = { x: 51, y: -192 }
  // her hand: the near limb's tip seen from the shoulder (rig units); every wing (arm) may set its own
  const armTip = { x: CHICKEN_HAND.x as number, y: CHICKEN_HAND.y as number, dx: HAND_DX, dy: HAND_DY, deg: WING_TIP_DEG, len: WING_TIP_LEN }
  // a face that draws its own eyes hides hers (sclera, pupil, blinking lid)
  let ownEyes = false
  // the species her look's class asks for (Pig, Ken), when she was not given one (a chick): it sets her movement
  let lookSpecies: BirdSpecies | undefined
  let paramsReady = false
  // a blow with an empty hand that Ken gives with his tail
  let rotorT = 0
  // Pig's and Ken's arms (arm-rig.ts): bent at the elbow to reach where the wings put their hands
  let arms: ArmsSpec | null = null
  // where the held pivot sits (the shoulder, lowered by the art's holdDrop), and how far the strong blow has moved
  // the hand to the other shoulder (0..1, eased)
  let heldBase: [number, number] = [PIV.wing[0], PIV.wing[1]], otherHand = 0
  // where the other arm (the back wing) rests, from the near one; the strong blow's charge with an empty hand (0..1)
  let backOffset: [number, number] = [-4, -2], bareCharge: number | null = null
  const tailBlow = () => !!swingNow?.bare && (species ?? lookSpecies) === 'fox'
  // Pig and Ken (not the chicken, not a chick): they move like mammals
  // (their Filhotes too: the leitão and the raposinha draw their own eyes, the chick does not)
  const beast = () => { const sp = species ?? lookSpecies; return sp === 'pig' || sp === 'fox' || ownEyes }
  // each leg moved along her body (rig units) by legs.shape
  const legDx = { F: 0, B: 0 }
  // her voice: the breed of her beak, if that breed has clucks of its own (params.ts CHICKEN_VOICES)
  let voice = ''
  function paintLook(look: ChickenLook) {
    voice = look.beak
    const A = ownArt ?? lookArt(look)
    const set = (name: string, html: string | undefined) => { part(name).innerHTML = html ?? '' }
    set('artComb', A.comb.svg); set('artFace', A.face.svg); set('artBeak', A.beak.svg); set('artWattle', A.wattle.svg)
    set('artNeck', A.neck.svg); set('artTorso', A.torso.svg); set('artTail', A.tail.svg); set('artWing', A.wing.svg)
    set('artWingBack', A.wing.arms ? '' : A.wing.backSvg ?? `<path d="${A.wing.backPath ?? LOOK_ART.WING}" fill="${A.wing.back}"/>`)
    arms = A.wing.arms ?? null
    if (!arms) { el.armF.innerHTML = ''; el.armB.innerHTML = '' }
    // Pig's and Ken's other arm is drawn in front of the body, a little behind the near one (both arms show)
    backOffset = A.wing.backOffset ?? [-4, -2]
    if (A.wing.backFront) { if (el.wingBack.previousElementSibling !== el.artTorso) el.artTorso.after(el.wingBack) }
    else if (el.body.firstElementChild !== el.wingBack) el.body.prepend(el.wingBack)
    el.sclera.setAttribute('fill', A.face.eye ?? '#fff8e1'); el.pupil.setAttribute('fill', A.face.pupil ?? '#1f1a17')
    eyeAt = A.face.eyeAt ? { x: A.face.eyeAt[0], y: A.face.eyeAt[1] } : { x: 51, y: -192 }
    el.sclera.setAttribute('cx', String(eyeAt.x)); el.sclera.setAttribute('cy', String(eyeAt.y)); el.lid.setAttribute('cx', String(eyeAt.x))
    el.xraySocket.setAttribute('cx', String(eyeAt.x)); el.xraySocket.setAttribute('cy', String(eyeAt.y))
    const legs = A.legs
    ;([['wrapF', legs.front], ['wrapB', legs.back]] as const).forEach(([w, c]) => {
      el[w].querySelectorAll('.c-drum').forEach(p => p.setAttribute('stroke', c.drum))
      el[w].querySelectorAll('.c-shank').forEach(p => p.setAttribute('stroke', c.shank))
    })
    el.lid.setAttribute('fill', A.face.lid ?? '#f7b21b')
    tailSwing = A.tail.swing ?? 1
    const h = A.wing.hand ?? [CHICKEN_HAND.x, CHICKEN_HAND.y]
    armTip.x = h[0]; armTip.y = h[1]; armTip.dx = h[0] - PIV.wing[0]; armTip.dy = h[1] - PIV.wing[1]
    armTip.deg = Math.atan2(armTip.dy, armTip.dx) * 180 / Math.PI; armTip.len = Math.hypot(armTip.dx, armTip.dy)
    ownEyes = !!A.face.ownEyes
    heldBase = [PIV.wing[0], PIV.wing[1] + (A.wing.holdDrop ?? 0)]
    el.heldPivot.setAttribute('transform', `translate(${heldBase[0]} ${heldBase[1]})`)
    const klass = ownArt ? 'galinha' : variantClass(look.torso)
    const nextSpecies: BirdSpecies | undefined = klass === 'porco' ? 'pig' : klass === 'raposa' ? 'fox' : undefined
    if (nextSpecies !== lookSpecies) { lookSpecies = nextSpecies; if (paramsReady) resize() }
    ;['sclera', 'pupil', 'lid'].forEach(n => { el[n].style.display = ownEyes ? 'none' : '' })
    // legs drawn their own way: thicker strokes, a foot (hoof, paw) in place of the toes, each leg moved along the body
    ;([['wrapF', 'F', legs.front], ['wrapB', 'B', legs.back]] as const).forEach(([w, k, c]) => {
      const sh = legs.shape, n = k === 'F' ? 'Front' : 'Back'
      const drums = el[w].querySelectorAll('.c-drum'), shanks = el[w].querySelectorAll('.c-shank')
      drums[0]?.setAttribute('stroke-width', String(sh?.thigh ?? 6)); drums[1]?.setAttribute('stroke-width', String(sh?.tib ?? 9))
      shanks[0]?.setAttribute('stroke-width', String(sh?.shin ?? 4.5))
      const toe = part('toe' + n)
      const own = toe.querySelector('[data-foot]')
      if (own) own.remove()
      ;(shanks[1] as SVGElement | undefined)?.style.setProperty('display', sh?.foot ? 'none' : '')
      if (sh?.foot) toe.insertAdjacentHTML('beforeend', `<g data-foot transform="translate(${PIV['toe' + k][0]} ${PIV['toe' + k][1]})">${sh.foot.replaceAll('FILL', c.shank)}</g>`)
      legDx[k] = (k === 'F' ? sh?.dxFront : sh?.dxBack) ?? 0
    })
    const m = A.beak.mouth
    mouthAt = m ? { x: m[0], y: m[1] } : CHICKEN_MOUTH
  }
  // central configuration (config.ts): params and look follow it live, including the Pátio's draft
  let config: ChickenConfig = getChickenConfig()
  let ownLook = opts.look ?? null
  paintLook(ownLook ?? config.look)

  // ---------- params (scaled down on small screens, except in a fixed-size world such as the Pátio's) ----------
  let species = opts.species
  const R = speciesParams(species ?? lookSpecies, { ...CHICKEN_PARAMS, ...config.params } as ChickenParams, config.classes)
  paramsReady = true
  // ---------- health ----------
  // hp: what she has left; hurtAgo: seconds since the last damage (it comes back on its own after regenDelay);
  // a chick (a bot) has none. At zero she gets it all back for now (the Filhote comes in the next step).
  let hp = R.maxHp, hurtAgo = Infinity, barShown = 0
  let onDown: (() => void) | null = null, meter: number | null = null
  function hurt(amount: number, fromX?: number) {
    // a chick (the Filhote, the chicks that follow her) is immortal unless Personagem → Filhote → Imortal is off
    if (!(amount > 0) || portalEntry || (species === 'chick' && R.babyImmortal)) return
    // Pig's Guarda: brooding on the ground, what comes from the front hurts less
    const sp = species ?? lookSpecies
    if (sp === 'pig' && S.grounded && S.state === 'brood' && fromX !== undefined && Math.sign(fromX - S.x) === S.face) amount *= 1 - R.guardBlock / 100
    hp = Math.max(0, hp - amount); hurtAgo = 0; barShown = 2
    if (hp <= 0) { hp = R.maxHp; hurtAgo = Infinity; barShown = 0; S.squash = 1; onDown?.() }
  }
  let hpMax = R.maxHp
  function stepHealth(dt: number) {
    // another class (a new look): the same share of a different whole
    if (R.maxHp !== hpMax) { hp = hp / Math.max(1, hpMax) * R.maxHp; hpMax = R.maxHp }
    if (hp > R.maxHp) hp = R.maxHp
    hurtAgo += dt
    if (hurtAgo >= R.regenDelay && hp < R.maxHp) hp = Math.min(R.maxHp, hp + R.maxHp * R.regenRate / 100 * dt)
    if (hp < R.maxHp) barShown = 2; else barShown = Math.max(0, barShown - dt)
    const show = meter !== null || (barShown > 0 && species !== 'chick')
    el.hpBar.style.display = show ? '' : 'none'
    if (!show) return
    const f = meter ?? hp / Math.max(1, R.maxHp)
    el.hpFill.setAttribute('width', (60 * f).toFixed(1))
    el.hpFill.setAttribute('fill', meter !== null ? '#b45cff' : f > 0.5 ? '#3fcf6b' : f > 0.25 ? '#f2c14e' : '#ef4b4b')
    // the bar's height over the feet is each class's, in each pose (the Vestiário's Hit-area editor)
    const phi = S.cl ? S.cl.phi : 0
    const at = barPoint(config.frames, species ?? lookSpecies, S.cl ? S.cl.px : S.x, S.cl ? S.cl.py : S.y, R.scale, poseOf(S.state, !!S.grounded, phi), phi)
    el.hpBar.setAttribute('transform', `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) scale(${Math.max(0.6, R.scale * 1.6).toFixed(2)})`)
  }
  let W = stageWidth(), H = stageHeight(), groundY = H - opts.groundHeight
  function resize() {
    rigMatrices.clear()
    W = stageWidth(); H = stageHeight(); groundY = H - opts.groundHeight
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    // fixedScale: a world in fixed units (PigChicKen): she is the same size on every screen, like everything else
    const vf = opts.fixedScale ? 1 : clamp(Math.min(W, H) / 800, 0.55, 1)
    const P = speciesParams(species ?? lookSpecies, { ...CHICKEN_PARAMS, ...config.params } as ChickenParams, config.classes)
    Object.assign(R, P)
    CHICKEN_PX_PARAMS.forEach(k => { (R as any)[k] = (P as any)[k] * vf })
    R.scale = P.scale * SCALE_BASE * vf
    if (S.grounded && !S.plat && !S.cl) S.y = groundY
    // clinging, S.x is her distance along the surface (the limits' walls can be taller than the screen)
    if (!S.cl) S.x = clamp(S.x, 40 * R.scale, W - 40 * R.scale)
  }

  // ---------- controls ----------
  let controls: ChickenControls = loadChickenControls()
  const unsubscribe = subscribeChickenControls(c => { controls = c; rebind() })
  const held = new Set<string>(), pressed = new Set<string>(), gameTaps = new Set<string>()
  const shifts = new Set<string>()
  const virt: Partial<Record<ChickenAction, boolean>> = {}, virtTapped = new Set<ChickenAction>(), actionTaps = new Set<ChickenAction>()
  let pad: Partial<Record<ChickenAction, boolean>> = {}, padOwnGrab = false, grabRunOnly = false
  // the devices she listens to (null: all of them) and, from them, the keys of each action
  let devices: InputDeviceId[] | null = null
  let keyBinds = {} as Record<ChickenAction, string[]>, usedKeys = new Set<string>()
  const rebind = () => {
    CHICKEN_ACTIONS.forEach(a => { keyBinds[a.key] = keyTokensFor(controls, a.key, devices) })
    usedKeys = allKeyTokens(controls, devices)
  }
  rebind()
  const virtOk = () => !devices || devices.includes('touch') || devices.includes('mouse')
  // a bot's actions, read once per step (setBot)
  let bot: (() => Partial<Record<ChickenAction, boolean>>) | null = null, botNow: Partial<Record<ChickenAction, boolean>> = {}
  const input = (a: ChickenAction, touchRunGrab = controls.touchRunGrab) => bot ? !!botNow[a] : keyBinds[a].some(t => held.has(t)) || !!pad[a] || (virtOk() && virtualActionHeld(virt, a, touchRunGrab))
  const tapped = (a: ChickenAction) => !bot && (keyBinds[a].some(t => pressed.has(t)) || (virtOk() && virtTapped.has(a)))
  const usedKey = (tok: string) => usedKeys.has(tok)
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shifts.add(e.code)
    ensureAudio()
    if (isChickenControlsListening() || isTextField(e.target) || (e.target as HTMLElement | null)?.closest?.('[role="dialog"], [role="alertdialog"]')) return
    const tok = 'Key:' + e.code
    if (!usedKey(tok)) return
    if (CHICKEN_ACTIONS.some(a => cancelsAutoWalk(a.key) && keyBinds[a.key].includes(tok))) goal = null
    e.preventDefault()
    const t = e.target as HTMLElement | null
    if (t && t !== document.body && t.blur) t.blur()
    if (!e.repeat) { pressed.add(tok); gameTaps.add(tok) }
    held.add(tok)
  }
  const onKeyUp = (e: KeyboardEvent) => { held.delete('Key:' + e.code); shifts.delete(e.code) }
  const onBlur = () => { goal = null; tap = null; held.clear(); shifts.clear(); Object.keys(virt).forEach(k => { virt[k as ChickenAction] = false }) }
  let pointer: { x: number; y: number } | null = null
  const onPointerMove = (e: PointerEvent) => { pointer = { x: e.clientX, y: stageY(e.clientY) }; moveDrag(e) }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  window.addEventListener('pointermove', onPointerMove)
  let cameraResetR3 = false
  // a key or a d-pad button (not a stick) held for left / right: she walks at full speed (Caminhada lenta)
  let padDigitalWalk = false
  const digitalWalk = () => padDigitalWalk || (['left', 'right'] as const).some(k => keyBinds[k].some(t => held.has(t)))
  // how far the movement stick is pushed (gamepad's left stick or the on-screen one, the further); null without either
  function moveStickExtent() {
    const stick = stickExtentFor(devices, 0), touch = virtOk() ? touchMoveExtent() : null
    return stick == null ? touch : touch == null ? stick : Math.max(stick, touch)
  }
  function pollPad() {
    if (bot) { pad = {}; padOwnGrab = false; padDigitalWalk = false; botNow = bot(); return }
    const on = padTokensFor(devices, controls.analog.deadzoneL, controls.analog.magnetDeg)
    if (!on.has('Pad:b11')) cameraResetR3 = false
    else if (game.gameMode && on.has('Pad:b8')) cameraResetR3 = true
    if (cameraResetR3) on.delete('Pad:b11') // Consume the reset until R3 is released, without jumping.
    pad = {}
    CHICKEN_ACTIONS.forEach(a => { pad[a.key] = controls.pad[a.key].some(t => t && on.has(t)) })
    padOwnGrab = controls.pad.grab.some(t => t && on.has(t) && !controls.pad.run.includes(t))
    padDigitalWalk = (['left', 'right'] as const).some(k => controls.pad[k].some(t => t && !t.startsWith('Pad:a') && on.has(t)))
  }
  let useSampleAt = -Infinity, useSample = false

  // ---------- sound ----------
  // one audio context and one set of clucks for every chicken on the page (local players share them)
  let actx: AudioContext | null = null, lastVoice: { src: AudioBufferSourceNode; gain: GainNode } | null = null, lastName = ''
  const buffers = sharedAudio.buffers
  function ensureAudio() {
    actx = sharedAudioContext()
  }
  // the cluck chosen for a movement in the class: '' none, 'all' any switched-on type, or one type
  function sfx(ev: string) {
    const v = (R as any)['sfx_' + ev] as string | undefined
    actx = sharedAudio.ctx
    if (!v || !actx || !controls.sound || R.volume <= 0 || opts.ghost) return
    const cats = v === 'all' ? Object.keys(CHICKEN_CLUCKS).filter(c => (R as any)['snd_' + c]) : [v]
    const ready = (c: string) => chickenClucks(voice, c).filter(n => buffers[n])
    // byType: draw the type first, so every type has the same chance however many samples it has
    const types = R.byType ? cats.filter(c => ready(c).length) : cats
    // (a voice may share samples between types: each counts once)
    let pool = R.byType ? ready(types[Math.floor(Math.random() * types.length)] ?? '') : [...new Set(cats.flatMap(ready))]
    if (R.avoidRepeat && pool.length > 1) pool = pool.filter(n => n !== lastName)
    const name = pool[Math.floor(Math.random() * pool.length)]
    if (!name) return
    lastName = name
    const t = actx.currentTime
    if (R.choke && lastVoice) {
      try { lastVoice.gain.gain.cancelScheduledValues(t); lastVoice.gain.gain.setTargetAtTime(0, t, 0.015); lastVoice.src.stop(t + 0.08) } catch { /* already stopped */ }
    }
    const src = actx.createBufferSource(); src.buffer = buffers[name]
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * R.pitchJitter / 100
    const gain = actx.createGain(); gain.gain.value = 0.8 * R.volume * mixGain('chicken') * (1 + (Math.random() * 2 - 1) * R.volJitter / 100)
    src.connect(gain); gain.connect(actx.destination); src.start(t)
    lastVoice = { src, gain }
  }

  // ---------- game hooks ----------
  let heldItem: Parameters<ChickenEngine['setHeld']>[0] = null, heldSvg = '', heldArrowSvg = '', heldOffSvg = '', heldOffOn = false
  const throwTransition = createThrowTransition()
  let peckNow: PeckPose | null = null
  // bare: a blow with an empty hand (Ken hits it with the tail instead of the arm)
  let swingNow: { angle: number; reach: number; t: number; size?: number; bare?: boolean; heavy?: boolean } | null = null
  // screen angle (degrees) -> her rig: undo the root's turn, the mirror when facing left, and the body's lean
  const rigAngle = (screenDeg: number) => {
    let a = screenDeg - vis.a
    if (S.face < 0) a = 180 - a
    a -= pose.body
    return ((a % 360) + 540) % 360 - 180
  }
  const handAimAngle = (angle: number) => heldItem?.consumable && !swingNow && !(heldItem.pull && heldItem.pull > 0) ? clamp(angle, -CONSUMABLE_WING_AIM_LIMIT, CONSUMABLE_WING_AIM_LIMIT) : angle
  let bounds: { lo: number; hi: number; top?: number } | null = null
  const game: Required<ChickenGame> = { gameMode: false, throwHeld: false, throwCharging: false, aimFace: null, lookAngle: null, speedMult: 1, accelMult: 1, accelPower: 1, accelRamp: 0.5, buddha: 0, fizz: 0, seat: null }
  let auraShown = ''
  function showAura() {
    const buddha = clamp(Math.floor(game.buddha) || 0, 0, BUDDHA_LAYERS), bubbles = clamp((Math.floor(game.fizz) || 0) * FIZZ_PER_DOSE, 0, FIZZ_BUBBLES.length)
    const key = `${buddha}/${bubbles}`
    if (key === auraShown) return
    auraShown = key
    el.aura.style.display = buddha ? '' : 'none'
    el.aura.querySelectorAll<SVGElement>('[data-layer]').forEach((n, i) => { n.style.display = i < buddha ? '' : 'none' })
    el.halo.style.display = 'none'
    el.fizz.style.display = bubbles ? '' : 'none'
    el.fizz.querySelectorAll<SVGElement>('[data-bubble]').forEach((n, i) => { n.style.display = i < bubbles ? '' : 'none' })
  }
  const wallLo = () => bounds ? bounds.lo : LIMIT_BORDER, wallHi = () => bounds ? bounds.hi : W - LIMIT_BORDER
  const wallTop = () => bounds?.top ?? LIMIT_BORDER

  // ---------- simulation state ----------
  const S: any = { x: W * 0.5, y: groundY, vx: 0, vy: 0, face: 1, grounded: true, jumpIndex: -1, state: 'idle', flapPhase: 0, burst: 0, squash: 0, boostT: 0, sliding: false, runIntent: false, plat: null, platAx: 0, cl: null, held: false }
  const pose: any = { tibF: 0, tibB: 0, toeF: 0, toeB: 0, sway: 0, bob: 0, body: 0, neck: 0, head: 0, wing: 0, wingBack: 0, tail: 0, legF: 0, shinF: 0, legB: 0, shinB: 0, sink: 0, legSink: 0, lid: 0, puff: 1, ik: 1, shiftY: 0 }
  const idle = { next: 1, neck: 0, head: 0 }
  const blink = { next: 2, t: -1 }
  let portalEntry: { mode: 'enter' | 'arrive'; x: number; y: number; start: number; duration: number; fromX: number; fromY: number; dx: number; dy: number; transform: string; glide?: boolean } | null = null
  const headAnchor: any = { x: null, from: 0, to: 0, t: 1, lastContact: null }
  const feet: any = {
    F: { hip: -14, x: null, stepping: false, t: 0, from: 0, to: 0, lift: 0 },
    B: { hip: -26, x: null, stepping: false, t: 0, from: 0, to: 0, lift: 0 },
  }
  const hipWorld = (f: any) => S.x + S.face * f.hip * R.scale
  const jumpVelocity = (index: number) => Math.sqrt(2 * R.gravity * R.jumpHeight * Math.pow(R.jumpDecay, Math.min(index, Math.max(1, R.stableJump) - 1)))
  function plantFeet() { Object.values(feet).forEach((f: any) => { f.x = hipWorld(f); f.stepping = false; f.lift = 0 }) }
  resize(); S.y = groundY; plantFeet()
  const unsubscribeConfig = subscribeChickenConfig(next => {
    const lookChanged = JSON.stringify(next.look) !== JSON.stringify(config.look)
    config = next
    resize()
    if (lookChanged && !ownLook) paintLook(next.look)
  })
  window.addEventListener('resize', resize)

  let prevJump = false
  // she landed on the main ground holding Brood since takeSlam() last asked
  let slammed = false
  let shockingAirElapsed = 0
  let shockingAirLimitApplied = false
  let shockingAirReleaseTime = 0
  // the damage she took since she grabbed the surface she is on (grab-damage.ts); letting go clears it
  let grabDamage = 0
  function step(dt: number) {
    pollPad()
    const Lh = input('left'), Rh = input('right'), U = input('up'), Dk = input('down'), C = input('crouch'), J = input('jump'), RUN = input('run')
    let jumpPressed = (J && !prevJump) || (tapped('jump') && !(J && prevJump))
    const crouchPressed = tapped('crouch') || (C && !S.prevCrouch)
    const downPressed = (Dk && !S.prevD) || tapped('down')
    // the moment Up goes down: touching a wall, it grabs it whatever else is held (tryCling)
    const upPressed = (U && !S.prevU) || tapped('up')
    prevJump = J; S.prevCrouch = C; S.prevU = U; pressed.clear(); virtTapped.clear()
    if (game.seat && !S.held) { seatStep(dt, jumpPressed); return }
    // Releasing Brood at rest latches it. Chickens keep this pose until Brood again, Jump or Run with a direction;
    // other bird profiles can opt into the previous automatic stand-up behavior.
    const others = Lh || Rh || U || C || J || RUN
    const leaveBrood = R.broodStandOnMove ? others : jumpPressed || (RUN && Lh !== Rh)
    if (S.broodLatch && (leaveBrood || S.held || S.cl || !S.grounded)) S.broodLatch = false
    // pressing brood again while latched gets her up into the normal idle (until brood is released)
    if (S.broodLatch && downPressed) { S.broodLatch = false; S.broodOff = true }
    // (letting go of Brood while walking to a clicked spot is not "at rest": she goes on walking)
    if (S.prevD && !Dk && !others && !goal && S.grounded && !S.held && !S.cl && !S.broodOff) S.broodLatch = true
    if (!Dk) S.broodOff = false
    S.prevD = Dk
    const D = (Dk && !S.broodOff) || S.broodLatch
    // Shocking jump: hold Jump with Brood to prepare, then release Jump to
    // launch. Releasing Brood first cancels; normal jumps still fire on press.
    let airChargeMultiplier = 1
    let airShockReleased = false
    let groundRelease = false
    let shockLaunch = false
    if (S.shocking && (!Dk || S.held || S.cl)) S.shocking = false
    S.groundJumpT = (S.groundJumpT ?? Infinity) + dt
    // the plain jump that left the ground a moment ago turns into the preparation (on the ground's terms)
    if (!S.shocking && J && D && !jumpPressed && !S.grounded && !S.cl && !S.held && S.groundJumpT < SHOCKING_GROUND_GRACE && S.vy < 0) {
      S.shocking = true; S.shockFromGround = true; shockingAirReleaseTime = 0
      S.vx -= S.airBoost || 0; S.airBoost = 0; S.vy = 0; S.groundJumpT = Infinity
    }
    if (!S.shocking) S.shockFromGround = false
    // standing on a floating box, Brood + Jump (with or without a sideways direction, never with Up or Down/Crouch)
    // flips her under it (no shocking prep); Down + Brood + Jump still drops through, Up + Brood + Jump goes up
    const flipPlat = S.grounded && S.plat && !S.held && !S.cl ? segById(S.plat) : null
    // (side-switch.ts) without Down it is the other face of the same line (under a box's top from inside the box,
    // under the wire); with Down on a box, the box's other side (under its bottom)
    const flipKind = jumpPressed && Dk && !!flipPlat && !flipPlat.solid ? standSwitch({ brood: true, up: U, down: C, against: false }) : null
    const flipFace = flipKind === 'face' && !!otherFace(flipPlat!)
    const flipUnder = flipKind === 'box' && !flipPlat!.side && canHangUnder(flipPlat!)
    // ...and on the floor of a room over another room (a wall that leads through, see crossWall) the same gesture
    // takes her down through it, and so does Down + Jump (no super jump there); on a cut corner's slanted floor, to
    // the room on that diagonal (side-switch.ts, crossFloor)
    const crossUnder = jumpPressed && crossFloor({ brood: Dk, crouch: C, up: U, dir: (Rh ? 1 : 0) - (Lh ? 1 : 0) }) && !!flipPlat?.cross && flipPlat.cross.key === crossKey
    if (jumpPressed && D && !S.cl && !S.held && !flipFace && !flipUnder && !crossUnder) { S.shocking = true; shockingAirReleaseTime = 0; jumpPressed = false }
    if (S.shocking && !J) {
      if (Dk && !S.grounded && !S.shockFromGround) { airShockReleased = true; airChargeMultiplier = shockingAirMultiplier(shockingAirElapsed, R.shockingAirChargeTime, R.shockingAirMaxMultiplier) }
      S.shocking = false; jumpPressed = Dk; shockLaunch = Dk
      if (S.shockFromGround) { groundRelease = Dk; S.shockFromGround = false }
    }
    // the shocking jump prepared on a wall (clingStep, Brood + Jump with the direction away from it): letting go of
    // Jump with Brood held launches it off the wall like one from the ground, toward the direction held; letting go
    // of Brood first cancels it
    let wallShockN = 0
    if (S.cl?.shock && !S.held) {
      if (!Dk) S.cl.shock = false
      else if (!J) {
        const c = S.cl, jy = Math.min(groundY, c.py + 30 * R.scale)
        wallShockN = Math.sign(c.n[0]) || 1
        fallFrom(stepOff(c.px, c.n[0], 40, jy), jy, 0, 0)
        jumpPressed = true; groundRelease = true; shockLaunch = true
      }
    }
    if (S.shocking && !S.grounded && !S.shockFromGround && J && Dk) {
      const charge = advanceShockingAirCharge(shockingAirElapsed, shockingAirLimitApplied, dt, R.shockingAirChargeTime, R.shockingAirAfterTimeMultiplier)
      shockingAirElapsed = charge.elapsed
      shockingAirLimitApplied = charge.applied
      S.vy *= charge.velocityMultiplier
    } else if (!S.shocking || S.grounded) {
      shockingAirElapsed = 0
      shockingAirLimitApplied = false
    }
    const inputDir = (Rh ? 1 : 0) - (Lh ? 1 : 0)
    let dir = inputDir
    // point-and-click: a steering control of her own (a direction, Up, Jump) cancels the walk to the clicked spot;
    // Crouch, Run and Brood only change how she walks there (auto-walk.ts)
    if (goal && (Lh || Rh || J || U || S.held || S.cl)) goal = null
    const auto = !!goal && goalStep(dt, autoWalkHeldStill(S.grounded, D, R.broodWalk, C, R.crouchSpeed))
    if (auto && !game.throwHeld) dir = Math.sign(goal!.x - S.x)
    buildSegs(); heldDir = dir
    S.clCool = Math.max(0, (S.clCool || 0) - dt); S.dropT = Math.max(0, (S.dropT || 0) - dt);
    // a direction pressed against where she looks (on the screen): for a moment, Jump switches her to the other
    // side of a floating collider instead of jumping
    const nowS = performance.now() / 1000
    if (inputDir !== 0 && inputDir !== S.lastInputDir) { S.turnDir = inputDir; S.turnFace = screenFace(); S.turnT = nowS }
    S.lastInputDir = inputDir
    const against = inputDir !== 0 && S.turnDir === inputDir && S.turnFace === -inputDir && nowS - S.turnT < SWITCH_GRACE
    if (S.held) { S.shockRise = false; heldStep(dt); return }
    // grabbed, Brood broods on the surface (cling-brood.ts); only Down/Crouch is the way down
    if (S.cl) { S.shockRise = false; clingStep(dt, dir, U, C, jumpPressed, RUN, against, Dk && !C && !U, D); return }
    grabDamage = 0; S.clBrood = false
    // Floating walls grab while she passes without a movement control, or if she is looking straight up.
    // Up is therefore the one direction that does not block an airborne grab on contact.
    S.noGrab = Lh || Rh || Dk || C || J || RUN
    // standing on a floating edge: ride along when it moves, fall when walking off its end
    if (S.grounded && S.plat) {
      let sg = segById(S.plat), fy = sg ? floorY(sg, S.x) : null
      // walking off one piece of a shaped floor onto the next one (they share the element's id)
      // (the fused boxes and what is joined to them are one solid: its floors go on from one to the next as well)
      if (sg && fy === null && sg.id.includes(':l')) {
        const base = sg.id.slice(0, sg.id.lastIndexOf(':l')), solid = !!(sg.fused || sg.join)
        const next = SEGS.find(o => o !== sg && !o.wall && (o.id.startsWith(base + ':l') || (solid && !!(o.fused || o.join))) && (() => { const y = floorY(o, S.x); return y !== null && Math.abs(y - S.y) < 10 && (o.id.startsWith(base + ':l') || !crossesFused(FUSED, S.x, S.y - 1, S.x, y - 1)) })())
        if (next) { sg = next; fy = floorY(next, S.x); S.plat = next.id; S.platAx = next.anchorX }
      }
      // where another floating line crosses hers (a wire over another wire), Up with a direction takes the branch
      // that climbs more that way, Crouch with a direction the one that goes down more (line-crossing.ts)
      const want = U && !C ? 1 : C && !U ? -1 : 0
      if (sg && fy !== null && dir !== 0 && want && !sg.hardN) {
        const line = lineKey(sg.id)
        const others = SEGS.filter(o => !o.wall && !o.bounce && !o.hardN && o.ax !== o.bx && lineKey(o.id) !== line && !(S.dropT > 0 && o.id === S.dropId))
        const fork = crossingBranch(sg, others, S.x, fy, dir, want, Math.abs(S.vx) * dt + 1, 2 * R.scale)
        if (fork) { sg = fork; fy = floorY(fork, S.x); S.plat = fork.id; S.platAx = fork.anchorX }
      }
      // crouched, walking off a floating edge (or off the end of a hard outline's floor) grabs the side below it
      // instead of falling
      // (only with a direction of her own: crouched on the way to a clicked spot she walks off as usual)
      if (sg && fy === null && C && dir !== 0 && !auto && (!sg.solid || sg.hardN) && grabEdgeSide(sg, dir, (U ? 1 : 0) - (C ? 1 : 0))) { clingPose(dt, U, C, D); return }
      if (!sg || fy === null) { S.grounded = false; S.plat = null; S.vy = 0; S.jumpIndex = 0 }
      else {
        const dx = sg.anchorX - S.platAx, dy = fy - S.y; S.platAx = sg.anchorX
        if (dx) { S.x += dx; Object.values(feet).forEach((f: any) => { if (f.x !== null) f.x += dx; f.from += dx; f.to += dx }); if (headAnchor.x !== null) headAnchor.x += dx }
        S.y += dy
      }
    }
    const motionDt = dt * movementFactor()
    const speed0 = Math.abs(S.vx)
    // (in a narrow passage she got into brooding or crouching she keeps that pose: buildSegs, `squeeze`)
    const brooding = S.grounded && (D || S.squeeze === 'brood')
    // walking while brooding: a share of the walk speed (0 keeps her still)
    const broodWalking = brooding && dir !== 0 && R.broodWalk > 0
    // slide starts when crouching out of a run
    if (S.grounded && crouchPressed && !brooding && speed0 > R.walkSpeed * 1.1) S.sliding = true
    // landing from the air with crouch held and at least the slide's minimum speed goes straight into the slide
    if (S.grounded && S.justLanded && C && !brooding && speed0 >= R.slideMinSpeed) S.sliding = true
    S.justLanded = false
    if (S.sliding && (!C || !S.grounded || speed0 < R.slideMinSpeed || brooding)) S.sliding = false
    // Agachar temporarily overlays the brood pose; a fixed brood latch remains active underneath.
    const crouching = S.grounded && (C || S.squeeze === 'crouch') && !S.sliding
    // run start: initial impulse + cluck
    const runIntent = RUN && dir !== 0 && S.grounded && !brooding && !crouching && !S.sliding
    if (runIntent && !S.runIntent) {
      S.boostT = R.runBoostTime
      S.vx += dir * R.runBoost
      sfx('runStart')
    }
    S.runIntent = runIntent
    S.boostT = Math.max(0, S.boostT - dt)
    // standing up (from crouching, brooding or sliding) while walking: a short speed boost that fades out;
    // standing up still, leaving the ground or letting go of / turning the direction ends it
    const low = S.grounded && (crouching || brooding || S.sliding)
    if (S.wasLow && !low && S.grounded && dir !== 0 && R.standBoost > 1) { S.standT = R.standBoostTime; S.standDir = dir }
    S.wasLow = low
    if (low || !S.grounded || dir !== S.standDir) S.standT = 0

    // horizontal
    if (S.sliding && dir !== 0 && dir * S.vx < 0) {
      // turning back mid-slide: she kicks off the other way, faster than the slide was going
      S.vx = dir * Math.min(R.maxSpeed, Math.max(R.walkSpeed, Math.abs(S.vx) * R.slideTurnBoost))
      S.sliding = false; S.face = dir; S.squash = 0.6; sfx('slideTurn')
    } else if (S.sliding) {
      S.vx = approach(S.vx, 0, R.slideFriction * dt)
    } else {
      let target = 0
      if (broodWalking) target = dir * R.walkSpeed * R.broodWalk
      else if (!brooding) {
        let mult = RUN ? R.runMultiplier : 1
        if (crouching) mult = R.crouchSpeed * (RUN ? R.crouchRunSpeed : 1)
        if (!S.grounded) mult *= R.airSpeed * (D ? R.fallSideSpeed : 1)
        target = dir * R.walkSpeed * mult
        // aiming behind her while walking: she walks backwards, slower
        if (game.aimFace && dir !== 0 && dir !== game.aimFace) target *= R.backpedal / 100
        // Caminhada lenta: the movement stick pushed less than 80% (not running, no key or d-pad for the direction)
        if (inputDir !== 0 && !auto && !bot) target *= slowWalkMult({ extent: moveStickExtent(), factor: controls.analog.slowWalk, run: RUN, digital: digitalWalk() })
        target *= game.speedMult
        if (S.standT > 0) {
          const f = S.standT / Math.max(0.01, R.standBoostTime)
          target *= 1 + (R.standBoost - 1) * f * f * (3 - 2 * f)
        }
        if (runIntent && S.boostT > 0) target += dir * R.runBoost * (S.boostT / Math.max(0.01, R.runBoostTime))
        // the jump's sideways kick lasts until she lands, instead of fading into the air speed
        if (!S.grounded) target += S.airBoost || 0
      }
      let rate = (dir !== 0 && (!brooding || broodWalking)) ? R.acceleration : R.deceleration
      // speeding up (not braking or turning back): a consumable scales it, and an eased curve starts slow and
      // ends fast, the rate growing with the share of the final speed she has (same ramp time whatever the speed)
      if (dir !== 0 && Math.abs(target) > Math.abs(S.vx) && S.vx * target >= 0) {
        rate *= game.accelMult
        const n = game.accelPower
        if (n > 1) {
          const p = clamp(Math.abs(S.vx) / Math.max(1, Math.abs(target)), 0.03, 1)
          rate = (Math.abs(target) / Math.max(0.05, game.accelRamp)) * n * Math.pow(p, (n - 1) / n) * game.accelMult
        }
      }
      if (!S.grounded) rate *= R.airControl
      S.vx = approach(S.vx, target, rate * motionDt)
      if (!S.grounded && D) { const cap = R.walkSpeed * (RUN ? R.runMultiplier : 1) * R.airSpeed * R.fallSideSpeed + Math.abs(S.airBoost || 0); S.vx = clamp(S.vx, -cap, cap) }
    }
    // Throw reduces motion without blocking movement input or facing.
    // secondary aim still has priority, including while brooding or sliding in Throw.
    const face0 = S.face
    const facingDir = game.throwHeld ? inputDir : dir
    if ((!brooding && !S.sliding) || game.throwHeld) {
      if (facingDir !== 0) S.face = facingDir
      if (game.aimFace) S.face = game.aimFace
    }

    S.standT = Math.max(0, (S.standT || 0) - dt)

    // on a floating floor, brood + jump drops through it while walking sideways or holding down (crouch); with Up
    // held, or no direction at all, it is the shocking jump up. Down (crouch) + jump with no sideways direction also
    // drops (with a direction it is the normal super jump up)
    const plat = S.grounded && S.plat ? segById(S.plat) : null
    // ...but on a floating box, Brood + Jump without Up or Down flips her under it, upside down (see flipUnder)
    if ((flipFace || flipUnder) && jumpPressed && plat && !plat.solid && hangUnder(plat, S.face, flipFace ? otherFace(plat) : underSide(plat))) {
      clingPose(dt, U, false); return
    } else if (crossUnder && jumpPressed && plat && crossWall(plat, plat.hardN ?? [0, -1], S.x, S.y)) {
      clingPose(dt, U, false); return
    } else if (jumpPressed && plat && !plat.solid && !U && (D ? dir !== 0 || C : C && dir === 0)) {
      S.dropId = plat.id; S.dropT = 0.3; S.grounded = false; S.plat = null; S.sliding = false
      S.vy = 60; S.jumpIndex = 0; S.y += 2; plantFeet(); sfx('dropThrough')
    } else if (jumpPressed && plat && !plat.solid && !D && !C && against && hangUnder(plat, face0)) {
      clingPose(dt, U, false); return
    } else if (jumpPressed && (S.grounded || groundRelease || S.jumpIndex + 1 <= R.airJumps)) {
      const fromGround = S.grounded || groundRelease
      S.jumpIndex = fromGround ? 0 : S.jumpIndex + 1
      // the way up of a shocking jump (launched letting go of Jump with Brood held) grabs a hard ceiling by itself
      S.shockRise = shockLaunch
      // Every jump keeps its normal takeoff, including air jumps and super jumps.
      // Brood's directional impulse is added separately below; horizontal input
      // must never remove the normal upward jump.
      S.vy = -jumpVelocity(S.jumpIndex)
      if (C) S.vy *= Math.sign(R.superJump) * Math.sqrt(Math.abs(R.superJump))
      S.grounded = false; S.sliding = false; S.plat = null
      // each button combination has its own sideways boost (towards where she faces) and sound
      const hd = dir || S.face
      let kind = fromGround ? 'jump' : 'airJump', boost = 0, flaps = R.jumpFlaps
      if (dir !== 0 && C && RUN && D) { kind = 'crouchRunBroodJump'; boost = R.crouchRunBroodJumpBoost }
      else if (dir !== 0 && C && RUN) { kind = 'crouchRunJump'; boost = R.crouchRunJumpBoost }
      else if (dir !== 0 && RUN && D) { kind = 'runBroodJump'; boost = fromGround ? R.runBroodJumpBoost : R.airRunBroodJumpBoost; flaps = R.broodJumpFlaps }
      else if (D) { kind = 'broodJump'; boost = fromGround ? R.broodJumpBoost : R.airBroodJumpBoost; flaps = R.broodJumpFlaps }
      else if (C) { kind = 'superJump'; boost = R.crouchJumpBoost }
      if (D) {
        flaps = R.broodJumpFlaps
        const stick = stickFor(devices, 0, controls.analog.deadzoneL) ?? (virtOk() ? readTouchMoveStick(controls.analog.deadzoneL) : null)
        // Brood itself (LT/Control) is not a movement direction. ArrowDown is
        // movement even though the secondary keyboard also binds it to Brood.
        const downDirection = C || held.has('Key:ArrowDown')
        const direction = stick ? magnetVector({ x: stick.x * stick.mag, y: stick.y * stick.mag }, controls.analog.magnetDeg) : { x: inputDir, y: (downDirection ? 1 : 0) - (U ? 1 : 0) }
        const impulse = directionalJumpImpulse(direction, boost, R.broodJumpVerticalBoost)
        S.airBoost = impulse.x
        // off a wall, never back into it
        if (wallShockN && S.airBoost * wallShockN < 0) S.airBoost = 0
        S.vy += impulse.y
      } else S.airBoost = (dir !== 0 ? dir * R.jumpPush : 0) + hd * boost
      if (!fromGround && D) { S.airBoost *= airChargeMultiplier; S.vy *= airChargeMultiplier }
      if (!fromGround && airShockReleased) shockingAirReleaseTime = .3
      S.vx += S.airBoost
      S.burst = flaps / Math.max(1, R.jumpFlapRate)
      S.groundJumpT = fromGround && !D ? 0 : Infinity
      sfx(kind)
    }

    // vertical
    let mode: string | null = null
    if (!S.grounded) {
      let g = R.gravity * zoneGravity, term = R.terminalVelocity
      if (D) { g *= R.fastFall; term *= R.fastFall; mode = 'fastFall' }
      else if (J && !jumpPressed) {
        mode = 'fly'; if (S.vy > 0) { g /= R.flyFallDivisor; term /= R.flyFallDivisor }
        // holding Up or Down (crouch) while flying attenuates gravity: 100% cancels it, above that it lifts her,
        // a negative value pulls her down harder
        const atten = U ? R.flyUpFallAtten : C ? R.flyDownFallAtten : 0
        g *= 1 - atten / 100
      }
      S.vy = clamp(S.vy + g * motionDt, -Math.max(term, S.vy < 0 ? -S.vy : 0), term)
      const prevY = S.y
      S.y += S.vy * motionDt
      // floating floors are one-way: land on the highest one crossed while falling (holding down goes through)
      if (S.vy > 0) {
        let best: { sg: Seg; y: number } | null = null
        SEGS.forEach(sg => {
          if (sg.wall || (S.dropT > 0 && sg.id === S.dropId) || (!sg.solid && (D || C) && !S.shockFromGround)) return
          const fy = floorAt(sg, S.x)
          if (fy !== null && fy < groundY && prevY <= fy + 0.5 && S.y >= fy && (!best || fy < best.y)) best = { sg, y: fy }
        })
        if (best) land((best as { sg: Seg; y: number }).y, (best as { sg: Seg; y: number }).sg)
      }
      if (S.y >= groundY && S.vy >= 0) {
        land(groundY, null)
        // a slam: falling onto the main ground holding Brood (the Pátio steps on the zone strip under it: takeSlam)
        if (D && !S.held && S.grounded) slammed = true
      }
      // rising into a ceiling: Up grabs it (she hangs upside down); the limits' ceiling stops her otherwise.
      // A shocking jump grabs the hard ones without Up (never with Down/Crouch held)
      if (S.grounded || S.vy >= 0) S.shockRise = false
      else if (ceilingStep(prevY, U, !!S.shockRise && !C)) return
    }
    const prevX = S.x
    S.x += S.vx * motionDt
    hardStep(prevX)
    const margin = 40 * R.scale
    if (S.x < wallLo() + margin) { S.x = wallLo() + margin; S.vx = 0 }
    if (S.x > wallHi() - margin) { S.x = wallHi() - margin; S.vx = 0 }

    if (S.grounded && !S.sliding && (!brooding || broodWalking) && !crouching && dir !== 0) stepUp()
    // walking to a clicked spot never grabs the screen walls
    if (!S.shocking && tryCling(auto ? 0 : dir, U, upPressed)) return
    const speed = Math.abs(S.vx) * movementFactor()
    let st: string
    if (!S.grounded) st = mode || 'jump'
    else if (brooding && !C) st = 'brood'
    else if (S.sliding) st = 'slide'
    else if (crouching) st = 'crouch'
    else if (speed > 5) st = (RUN && speed > R.walkSpeed * 1.1) ? 'run' : 'walk'
    else if (U) st = 'lookUp'
    else st = 'idle'
    if (st !== S.prevState) sfx('st_' + st)
    S.prevState = st
    S.state = S.shocking ? 'shockingPrepare' : st
    updateFeet(dt, st, speed)
    animate(dt, st, U, speed)
  }

  // sitting at a fixed instrument: held where the seat is, no physics and no movement; Pular gets her up
  let seatLeft = false
  function leaveSeat() { if (game.seat) { game.seat = null; seatLeft = true } }
  function seatStep(dt: number, jumpPressed: boolean) {
    const s = game.seat!
    if (jumpPressed && !s.keepJump) { leaveSeat(); S.prevD = false; return }
    if (S.cl) { S.cl = null; startTurn() }
    S.x = s.x; S.y = s.y; S.vx = 0; S.vy = 0; S.grounded = true; S.jumpIndex = 0; S.airBoost = 0
    S.face = s.face < 0 ? -1 : 1
    S.broodLatch = false; S.broodOff = false; S.sliding = false; S.shocking = false; S.prevD = false; goal = null
    if (S.prevState !== 'seat') { plantFeet(); headAnchor.x = null }
    S.prevState = 'seat'; S.state = 'seat'
    animate(dt, 'seat', false, 0)
  }

  // feet stay planted in the world; a foot steps when the hip runs ahead of it
  function updateFeet(dt: number, st: string, speed: number) {
    if (!S.grounded || (st === 'brood' && speed <= 5) || st === 'slide') return
    const running = st === 'run'
    const dur = Math.max(0.04, R.stepTime / (running ? 1.5 : 1))
    const moving = speed > 5
    ;(['F', 'B'] as const).forEach(k => {
      const f = feet[k]
      // stopped mid-step: turn the rest of that step into the single settle move
      if (f.stepping && !f.settle && !moving) { f.settle = true; f.from = f.x; f.to = hipWorld(f); f.t = 0; f.curl = 0 }
      if (f.stepping && f.settle) {
        f.t = Math.min(1, f.t + dt / (dur * 0.7))
        f.x = f.from + (f.to - f.from) * smooth(f.t)
        f.lift = Math.sin(Math.PI * f.t) * 4
        if (f.t >= 1) { f.stepping = false; f.settle = false; f.lift = 0 }
        return
      }
      if (f.stepping) {
        // two moves, like the real bird: fold the leg up under the body, then extend it to the next spot
        f.t = Math.min(1, f.t + dt / dur)
        const fold = clamp(R.foldPortion, 0.05, 0.95)
        let along: number
        if (f.t < fold) { const u = smooth(f.t / fold); along = 0.12 * u; f.curl = u }
        else { const u = smooth((f.t - fold) / (1 - fold)); along = 0.12 + 0.88 * u; f.curl = 1 - u }
        f.x = f.from + (f.to - f.from) * along
        f.lift = 0
        if (f.t >= 1) { f.stepping = false; f.lift = 0; f.curl = 0; S.contact = true }
        return
      }
      if (moving) return
      const hip = hipWorld(f)
      if (Math.abs(f.x - hip) > 3 * R.scale) { f.stepping = true; f.t = 0; f.from = f.x; f.to = hip; f.settle = true }
    })
    if (!moving) { S.gaitT = 1e9; return }
    // gait clock: the legs take turns on a fixed beat; each foot lands where the hip will be mid-stance
    const gap = Math.max(0.04, R.stepGap / (running ? 1.5 : 1))
    S.gaitT = (S.gaitT === undefined ? 1e9 : S.gaitT) + dt
    if (S.gaitT < gap) return
    let k: 'F' | 'B' = S.lastFoot === 'F' ? 'B' : 'F'
    if (S.gaitT > 1e8) {
      const behind = (key: 'F' | 'B') => (hipWorld(feet[key]) - feet[key].x) * Math.sign(S.vx)
      k = behind('F') >= behind('B') ? 'F' : 'B'
    }
    const f = feet[k]
    if (f.stepping) return
    S.gaitT = 0; S.lastFoot = k
    f.stepping = true; f.settle = false; f.t = 0; f.from = f.x
    f.to = hipWorld(f) + S.vx * (dur / 2 + gap)
  }

  // ---------- colliders ----------
  let SEGS: Seg[] = []
  // the fused boxes near her (screen units): in one go she never gets from one side of them to the other
  let FUSED: FusedBox[] = []
  // the key she carries for the walls that lead to another room (setCrossKey), and how many times she went through
  let crossKey: string | null = null
  let crossCount = 0
  // her body's height (rig units) in the pose she is in (body-frame.ts, the Vestiário's Hit-area): the narrow
  // passages, the hard walls in front of her and the ceilings over her measure her by it. In a passage that only a
  // smaller pose fits (`squeeze`, the pose she came in with) she keeps that pose until she is out of it.
  const bodyTop = () => S.squeeze === 'crouch' || S.squeeze === 'brood'
    ? Math.min(bodyHeight(config.frames, species ?? lookSpecies, S.state, !!S.grounded, S.cl ? S.cl.phi : 0), S.squeezeTop ?? Infinity)
    : bodyHeight(config.frames, species ?? lookSpecies, S.state, !!S.grounded, S.cl ? S.cl.phi : 0)
  // the hard outlines near her (screen units), to lift her out when one ends up over her feet
  let HARD_SHAPES: { id: string; poly: number[][] }[] = []
  // the house she is inside of (setRoom)
  let room: string | null = null
  function buildSegs() {
    const out: Seg[] = []
    const hardShapes: typeof HARD_SHAPES = []
    // her height now, and whether her feet are inside a narrow passage (a plug she got past in a smaller pose)
    const tall = bodyTop() * R.scale, fx = S.cl ? S.cl.px : S.x, fy = (S.cl ? S.cl.py : S.y) - 1
    let squeezed = false
    const fusedBoxes: FusedBox[] = []
    const joins: JoinedShape[] = []
    let source: Element | undefined, mask: PlatformOcclusion | undefined
    const add = (id: string, ax: number, ay: number, bx: number, by: number, solid = false, floor = false, climbable = false, bounce?: TrampolineParams, ceil = false, top = false, hardN?: number[], side?: Seg['side'], cross?: SegCross) => {
      const len = Math.hypot(bx - ax, by - ay); if (len < 4) return
      const a = ((Math.atan2(by - ay, bx - ax) * DEG) % 180 + 180) % 180
      const wall = climbable || ceil || (!floor && Math.min(a, 180 - a) > 45)
      const topEdge = top || id.endsWith(':top')
      const visible = mask && source && mask.clip(source, id, mask.depth, ax - mask.x, ay - mask.y, bx - mask.x, by - mask.y)
      if (!visible) {
        out.push({ id, ax, ay, bx, by, anchorX: ax, topEdge, len, ang: a, wall, solid, bounce, ...(ceil ? { ceil } : {}), ...(hardN ? { hardN } : {}), ...(side ? { side } : {}), ...(cross ? { cross } : {}) })
        return
      }
      const dx = bx - ax, dy = by - ay
      visible.forEach(([from, to], i) => {
        const partLen = len * (to - from)
        if (partLen < 4) return
        out.push({
          id: i === 0 ? id : `${id}~${i}`, ax: ax + dx * from, ay: ay + dy * from,
          bx: ax + dx * to, by: ay + dy * to, anchorX: ax, clipOffset: from * len, topEdge, len: partLen, ang: a, wall, solid, bounce,
          ...(ceil ? { ceil } : {}), ...(hardN ? { hardN } : {}), ...(side ? { side } : {}), ...(cross ? { cross } : {}),
        })
      })
    }
    let n = 0
    chickenPlatformRects(frameNow).forEach(({ el: e, rect: r, occlusion }) => {
      source = e; mask = occlusion
      const node = e as HTMLElement
      if (r.width < 8 || r.height < 8) return
      if ((node.dataset.chickenRoom ?? null) !== room) return
      // A local player can be outside the main camera. Cull shaped surfaces relative to this actor.
      if (node.dataset.chickenNearby !== undefined) {
        if (!S.cl && (r.right < S.x - 300 || r.left > S.x + 300 || r.bottom < S.y - 300 || r.top > S.y + 300)) return
      } else if (r.bottom < 0 || r.top > H) return
      // a narrow passage's plug (`data-chicken-fit="<size>"`): there only for a body that does not fit in the passage
      if (node.dataset.chickenFit !== undefined) {
        // never a solid around her: inside it she stays in the pose that got her in
        if (fx > r.left && fx < r.right && fy > r.top && fy < r.bottom) { squeezed = true; return }
        if (tall <= Number(node.dataset.chickenFit)) return
      }
      const id = node.dataset.chickenId || node.id || `box${n++}`
      const bounce = chickenPlatformBounce(e)
      if (bounce) {
        if (r.top < groundY - 4) add(id + ':bounce', r.left, r.top, r.right, r.top, false, true, false, bounce)
        return
      }
      // a closed outline: floors along the edges facing up (named like a shaped floor's pieces, so walking goes on
      // from one to the next), walls on the steep ones and ceilings under it; hard, all of them are solid
      const shape = chickenPlatformShape(e)
      if (shape) {
        const hard = chickenPlatformHard(e)
        if (hard) hardShapes.push({ id, poly: shape.map(([x, y]) => [r.left + x, r.top + y]) })
        // a wall between two rooms: its two long faces lead through it
        const [key, reach, skip] = (hard && node.dataset.chickenCross || '').split(',')
        const through: SegCross | undefined = key ? { key, reach: Number(reach), ...(skip ? { skip: Number(skip) } : {}) } : undefined
        // hard boxes built side by side as one solid (`data-chicken-fused="<group>"`): fuseFaces, after the loop
        const fused = hard && node.dataset.chickenFused !== undefined, first = out.length
        if (fused) fusedBoxes.push({ id, group: node.dataset.chickenFused || id, left: r.left, top: r.top, right: r.right, bottom: r.bottom })
        shapeEdges(shape).forEach(({ i, a, b, kind, n }) => {
          const hn = hard ? n : undefined
          const ax = r.left + a[0], ay = r.top + a[1], bx = r.left + b[0], by = r.top + b[1]
          if (Math.min(ay, by) >= groundY - 4) return
          const cross = through && (kind === 'wall') === (r.height > r.width) ? through : undefined
          if (kind === 'floor') add(`${id}:l${i}`, ax, ay, bx, by, hard, true, false, undefined, false, true, hn, undefined, cross)
          else if (kind === 'ceil') {
            add(`${id}:u${i}`, ax, ay, bx, by, hard, false, false, undefined, true, false, hn, undefined, cross)
            // seen from inside, a floating box's bottom is a floor too
            if (!hard) add(`${id}:b${i}`, ax, ay, bx, by, false, true)
          } else {
            const part = clipAboveGround([ax, ay], [bx, by], groundY)
            if (part) add(`${id}:w${i}`, part[0][0], part[0][1], part[1][0], part[1][1], hard, false, true, undefined, false, false, hn, undefined, cross)
          }
        })
        if (fused) for (let k = first; k < out.length; k++) out[k].fused = id
        // a hard outline of any shape built as one solid with them (`data-chicken-join`)
        else if (hard && node.dataset.chickenJoin !== undefined) {
          joins.push({ id, poly: shape.map(([x, y]) => [r.left + x, r.top + y]), left: r.left, top: r.top, right: r.right, bottom: r.bottom })
          for (let k = first; k < out.length; k++) out[k].join = id
        }
        return
      }
      // a shaped floor (curved or sloped roofs): `data-chicken-line="x,y x,y …"` in the element's own pixels,
      // one-way floors along the line (never walls, however steep a piece is)
      const lines = chickenPlatformLines(e)
      const walls = chickenPlatformWalls(e)
      if (lines || walls) {
        walls?.forEach((line, group) => {
          for (let i = 1; i < line.length; i++) {
            const [ax, ay] = line[i - 1], [bx, by] = line[i]
            if (Math.min(ay, by) + r.top >= groundY) continue
            if (ay === by) {
              if (r.top + ay < groundY - 4) add(`${id}:w${group}:${i}`, r.left + ax, r.top + ay, r.left + bx, r.top + by, false, true)
            } else {
              // floating, like a non-hard outline's walls: from the ground only Up grabs them, never walking into them
              add(`${id}:w${group}:${i}`, r.left + ax, r.top + ay, r.left + bx, r.top + by, false, false, true)
            }
          }
        })
        // a wire (`data-chicken-wire`) has two sides: under each floor piece, a ceiling she hangs from
        const wire = node.dataset.chickenWire !== undefined
        lines?.forEach((line, group) => {
          const base = `${id}:${group}`
          for (let i = 1; i < line.length; i++) {
            const [ax, ay] = line[i - 1], [bx, by] = line[i]
            if (ax !== bx && r.top + Math.max(ay, by) < groundY - 4) {
              const g = group ? `${group}:` : ''
              add(`${id}:l${g}${i}`, r.left + ax, r.top + ay, r.left + bx, r.top + by, false, true, false, undefined, false, false, undefined, wire ? { base, top: true } : undefined)
              if (wire) add(`${id}:h${g}${i}`, r.left + ax, r.top + ay, r.left + bx, r.top + by, false, false, false, undefined, true, false, undefined, { base, top: false })
            }
          }
        })
        return
      }
      if (r.top < groundY - 4) {
        add(id + ':top', r.left, r.top, r.right, r.top)
        // the top edge seen from inside the box (one-way, she gets in from below): a ceiling she can hang from
        add(id + ':topBelow', r.left, r.top, r.right, r.top, false, false, false, undefined, true)
      }
      if (r.bottom < groundY - 4) {
        add(id + ':bottom', r.left, r.bottom, r.right, r.bottom)
        // its underside: she hangs from it upside down (grabbed rising into it with Up, or round a side's corner)
        add(id + ':under', r.left, r.bottom, r.right, r.bottom, false, false, false, undefined, true)
      }
      const yb = Math.min(r.bottom, groundY)
      if (yb - r.top > 8) { add(id + ':left', r.left, r.top, r.left, yb); add(id + ':right', r.right, r.top, r.right, yb) }
    })
    mask = undefined
    // the limits: two solid walls and a solid ceiling, all climbable, meeting at the top corners
    const top = Math.min(wallTop(), groundY - 8)
    add('screen:left', wallLo(), top, wallLo(), groundY, true); add('screen:right', wallHi(), top, wallHi(), groundY, true)
    add('screen:top', wallLo(), top, wallHi(), top, true, false, false, undefined, true)
    // fused boxes are one solid: what one of them covers of another's face is no surface (hard-shapes.ts)
    SEGS = fuseFaces(out, fusedBoxes, joins)
    // a passage she is in only because her pose is small enough: she keeps that pose (crouching or brooding)
    if (!squeezed) { S.squeeze = null; S.squeezeTop = undefined }
    else if (!S.squeeze) {
      const pose = poseOf(S.state, !!S.grounded, S.cl ? S.cl.phi : 0)
      S.squeeze = pose === 'crouch' || pose === 'brood' ? pose : 'other'; S.squeezeTop = bodyTop()
    }
    FUSED = fusedBoxes
    HARD_SHAPES = hardShapes
  }
  // elements without an id get one, so standing on a box survives re-ordering of the DOM
  let autoId = 0
  const tagBoxes = () => {
    chickenPlatformElements(performance.now()).forEach(e => {
      const h = e as HTMLElement
      if (!h.dataset.chickenId) h.dataset.chickenId = `chk${autoId++}`
    })
  }
  const segById = (id: string) => SEGS.find(s => s.id === id) || null
  // the line a floor piece belongs to (`<element>:l3`, `<element>:top`, a clipped `~n`: the part before the last ':')
  const lineKey = (id: string) => id.slice(0, id.lastIndexOf(':'))
  function floorY(sg: Seg, x: number) {
    const x0 = Math.min(sg.ax, sg.bx), x1 = Math.max(sg.ax, sg.bx)
    if (x < x0 || x > x1) return null
    return sg.bx === sg.ax ? Math.min(sg.ay, sg.by) : sg.ay + (sg.by - sg.ay) * (x - sg.ax) / (sg.bx - sg.ax)
  }
  // falling: a fused box's floor also catches her on the half pixel a hard wall lets her stand past its line, where
  // the floor ends and the wall begins (or she would go down inside the wall)
  function floorAt(sg: Seg, x: number) {
    const fy = floorY(sg, x)
    if (fy !== null || !sg.fused) return fy
    const lo = Math.min(sg.ax, sg.bx), hi = Math.max(sg.ax, sg.bx)
    return x > lo - 1 && x < hi + 1 ? floorY(sg, clamp(x, lo, hi)) : null
  }
  function floorBelow(x: number, y: number) {
    let best = groundY
    SEGS.forEach(sg => { if (sg.wall) return; const fy = floorY(sg, x); if (fy !== null && fy >= y - 1 && fy < best) best = fy })
    return best
  }
  function land(y: number, sg: Seg | null) {
    if (sg?.bounce) {
      const { vx, vy } = trampolineVelocity(sg.bounce, R.gravity)
      fallFrom(S.x, y, S.vx + vx, vy)
      S.airBoost = vx
      S.squash = 1
      S.justLanded = false
      S.burst = R.jumpFlaps / Math.max(1, R.jumpFlapRate)
      sfx('jump')
      return
    }
    S.justLanded = !S.grounded
    S.y = y; S.vy = 0; S.grounded = true; S.jumpIndex = -1; S.squash = 1; S.airBoost = 0
    S.plat = sg ? sg.id : null; S.platAx = sg ? sg.anchorX : 0
    plantFeet(); sfx('land')
  }
  function standAt(x: number, y: number, sg: Seg | null, face: number) {
    if (S.cl) startTurn()
    S.cl = null; S.x = x; S.vx = 0; if (face) S.face = face
    land(y, sg); S.squash = 0.4; headAnchor.x = null
  }
  function fallFrom(x: number, y: number, vx: number, vy: number) {
    if (S.cl && !S.held) startTurn()
    if (S.cl) { S.clLast = S.cl.id; S.clCool = 0.35 }
    S.cl = null; S.plat = null; S.grounded = false; S.jumpIndex = 0; S.airBoost = 0; S.shockRise = false
    S.x = x; S.y = y; S.vx = vx; S.vy = vy; plantFeet(); headAnchor.x = null
  }

  // walls: solid ones grab when pushing toward them; floating ones when her feet touch them in the
  // air while no movement control is held. Pressing Up (its press, `upPress`) grabs any wall she touches,
  // on the ground or in the air, whatever else is held, like Up held on the ground
  function tryCling(dir: number, up = false, upPress = false) {
    // a species that does not climb (Pig) never grabs a wall
    if (R.climbSpeed <= 0) return false
    const bodyY = S.y - 40 * R.scale, footY = S.y - 4 * R.scale
    for (const sg of SEGS) {
      if (!sg.wall || sg.ceil || (S.clCool > 0 && sg.id === S.clLast && !upPress)) continue
      const climbFromGround = (up && S.grounded) || upPress
      if (!sg.solid && !climbFromGround && (S.grounded || S.noGrab)) continue
      const py = sg.solid || climbFromGround ? bodyY : footY, reach = (sg.solid || climbFromGround ? 46 : 24) * R.scale
      if (py < Math.min(sg.ay, sg.by) || py > Math.max(sg.ay, sg.by)) continue
      const wx = sg.ax + (sg.bx - sg.ax) * (py - sg.ay) / ((sg.by - sg.ay) || 1e-6)
      const dx = wx - S.x
      if (Math.abs(dx) > reach) continue
      // a hard wall is grabbed from its front only, and nothing through another one: behind a thin wall (a room's)
      // its other face and whatever stands right after it are as near as the wall itself
      if (sg.hardN && sg.hardN[0] * dx > 0) continue
      if (blockHardWalls(SEGS, S.x, wx, py - 1, py + 1, 0) !== null || crossesFused(FUSED, S.x, py, wx - Math.sign(dx), py)) continue
      const toward = Math.sign(dx) || 1
      if (sg.solid && !climbFromGround && !(dir === toward || (!S.grounded && S.vx * toward > 60))) continue
      attach(sg, wx, py)
      if (climbFromGround) clingStep(frameDt, dir, true, false, false, input('run'), false)
      return true
    }
    return false
  }
  // clinging runs the normal walk on a rotated ground: local "down" points into the wall, local x runs along it
  let heldDir = 0
  function clingFrame(sg: Seg, n: number[], px: number, py: number) {
    startTurn()
    const ux = (sg.bx - sg.ax) / sg.len, uy = (sg.by - sg.ay) / sg.len
    const phi = Math.atan2(-n[1], -n[0]) - Math.PI / 2, t = [Math.cos(phi), Math.sin(phi)]
    const sigma = Math.sign(t[0] * ux + t[1] * uy) || 1
    const along = (px - sg.ax) * ux + (py - sg.ay) * uy + (sg.clipOffset ?? 0)
    S.cl = { id: sg.id, n, phi, t, sigma, px, py, tilt: 0, lastDir: heldDir, tapDir: 0, tapT: 0, carry: null }
    S.x = along * sigma; S.vx = 0; S.face = -t[1] >= 0 ? 1 : -1
    plantFeet(); headAnchor.x = null
  }
  function attach(sg: Seg, px: number, py: number) {
    const ux = (sg.bx - sg.ax) / sg.len, uy = (sg.by - sg.ay) / sg.len
    let n = [-uy, ux]
    if (n[0] * (S.x - px) + n[1] * (S.y - 40 * R.scale - py) < 0) n = [uy, -ux]
    // a hard surface has one side only (right on its line, her place says nothing)
    if (sg.hardN) n = [sg.hardN[0], sg.hardN[1]]
    clingFrame(sg, n, px, py); sfx('grab')
    S.vy = 0; S.grounded = true; S.plat = null; S.sliding = false; S.jumpIndex = -1; S.squash = 0.5
  }
  // rising into a ceiling (her head crosses it): Up grabs it and she hangs upside down; without Up a solid
  // ceiling (the limits') stops her and a box's underside lets her through. `hard`: a solid ceiling is grabbed
  // without Up (the way up of a shocking jump). True when she grabbed it.
  function ceilingStep(prevY: number, up: boolean, hard = false) {
    const reach = bodyTop() * R.scale, was = prevY - reach, now = S.y - reach
    let hit: Seg | null = null, hitY = -Infinity
    for (const sg of SEGS) {
      // (a fused box's ceiling reaches the half pixel a hard wall lets her stand past its line, like its floor)
      const pad = sg.fused ? 1 : 0
      if (!sg.ceil || S.x < Math.min(sg.ax, sg.bx) - pad || S.x > Math.max(sg.ax, sg.bx) + pad) continue
      const cy = sg.ay + (sg.by - sg.ay) * (S.x - sg.ax) / ((sg.bx - sg.ax) || 1e-6)
      // the first one her head meets on the way up
      if (was >= cy - 0.5 && now < cy && cy > hitY && !crossesFused(FUSED, S.x, S.y - 1, S.x, cy + 1)) { hit = sg; hitY = cy }
      // a fused box's ceiling already across her body (she let go of a wall right under it, her head past it): she
      // rises no further, or her feet would follow her head into the room above
      else if (sg.fused && was < cy - 0.5 && prevY > cy && prevY > S.y) { S.y = prevY; S.vy = 0 }
    }
    if (!hit) return false
    if ((up || (hard && hit.solid)) && !(S.clCool > 0 && hit.id === S.clLast)) {
      const face = S.face
      attach(hit, S.x, hitY)
      // upside down her rig's forward is the screen's backward: keep looking the same way
      S.face = -face
      return true
    }
    if (hit.solid) { S.y = hitY + reach; S.vy = 0 }
    return false
  }
  // stepping off a surface sideways, `d` rig units from (px, y) along `nx`: never through a hard wall standing
  // right there (a room's thin wall beside the one she clings to)
  function stepOff(px: number, nx: number, d: number, y: number) {
    const x = px + nx * d * R.scale
    return blockHardWalls(SEGS, px, x, y - HEAD_TOP * R.scale, y - 1, 0) ?? x
  }
  // letting go of a surface: off a wall she drops beside it, off a ceiling she turns upright just below it
  function letGo(vx: number, vy: number) {
    const c = S.cl, hanging = c.n[1] > 0.7
    let y = Math.min(groundY, c.py + (hanging ? HEAD_TOP : 30) * R.scale)
    // under a ceiling lower than her height, a hard floor comes first (never past it, into what is under the room)
    if (hanging) for (const f of SEGS) {
      if (f.wall || !f.hardN) continue
      const fy = floorY(f, c.px)
      if (fy !== null && fy > c.py + 1 && fy < y) y = fy
    }
    fallFrom(stepOff(c.px, c.n[0], 40, y), y, vx, vy)
  }
  // Going round a corner: at the end of the surface she clings to, another climbable surface (wall or ceiling)
  // that starts there takes her on, outside corners (a box's bottom corners) and inside ones (the limits' top
  // corners) alike. Holding the same controls keeps her going the same way round (carry), so she never
  // bounces back at the corner.
  function wrapCorner(sg: Seg, end: number[], other: number[], inKey: string) {
    const c = S.cl
    const out = [(end[0] - other[0]) / sg.len, (end[1] - other[1]) / sg.len]
    for (const nx of SEGS) {
      if (nx === sg || nx.id === sg.id || !nx.wall || nx.bounce) continue
      const atA = Math.hypot(nx.ax - end[0], nx.ay - end[1]) < 3, atB = !atA && Math.hypot(nx.bx - end[0], nx.by - end[1]) < 3
      if (!atA && !atB) continue
      const far = atA ? [nx.bx, nx.by] : [nx.ax, nx.ay]
      const u2 = [(far[0] - end[0]) / nx.len, (far[1] - end[1]) / nx.len]
      const n2 = cornerNormal(c.n, out, u2)
      const speed = Math.abs(S.vx)
      clingFrame(nx, n2, end[0], end[1])
      const next = S.cl, sign = atA ? 1 : -1
      // climbing straight up into a ceiling she stops there, hanging under it; otherwise she keeps going
      if (n2[1] > 0.7 && inKey.startsWith('0,')) { S.vx = 0; S.squash = 0.3; return true }
      next.carry = { key: inKey, sign }
      S.vx = sign * next.sigma * speed
      S.squash = 0.3
      return true
    }
    return false
  }
  // where she looks on the screen, sideways: standing (or on a wall) her facing, hanging upside down the opposite
  function screenFace() { return S.cl && S.cl.n[1] > 0.7 ? -S.face : S.face }
  // a box collider's part (its element id and which edge), and the piece of a part covering a point
  function boxPart(id: string) {
    const m = BOX_PART.exec(id)
    return m ? { base: m[1], part: m[2] } : null
  }
  function partAt(base: string, part: string, x: number | null, y: number | null) {
    return SEGS.find(o => (o.id === `${base}:${part}` || o.id.startsWith(`${base}:${part}~`)) &&
      (x === null || (x >= Math.min(o.ax, o.bx) - 0.5 && x <= Math.max(o.ax, o.bx) + 0.5)) &&
      (y === null || (y >= Math.min(o.ay, o.by) - 0.5 && y <= Math.max(o.ay, o.by) + 0.5))) ?? null
  }
  // the normal on a surface met at a corner: an inside corner (the new surface rises on her side) or an outside one
  // (it goes on behind the old one); `n1` her old normal, `out` the way she was going, `u2` along the new surface
  function cornerNormal(n1: number[], out: number[], u2: number[]) {
    const turn = u2[0] * n1[0] + u2[1] * n1[1]
    const toward = turn > 0.1 ? [-out[0], -out[1]] : turn < -0.1 ? out : n1
    let n2 = [-u2[1], u2[0]]
    if (n2[0] * toward[0] + n2[1] * toward[1] < 0) n2 = [u2[1], -u2[0]]
    return n2
  }
  // the piece of a wire's side (its floor, `top`, or the ceiling under it) covering x
  function wireSideAt(base: string, top: boolean, x: number) {
    return SEGS.find(o => o.side?.base === base && o.side.top === top && x >= Math.min(o.ax, o.bx) - 0.5 && x <= Math.max(o.ax, o.bx) + 0.5) ?? null
  }
  // the ceiling right below her feet on a floating floor: a box top's underside, or the other side of a wire
  function underSide(plat: Seg) {
    if (plat.side?.top) return wireSideAt(plat.side.base, false, S.x)
    const bp = boxPart(plat.id)
    return bp && bp.part === 'top' ? partAt(bp.base, 'under', S.x, null) : null
  }
  // whether the floating floor is a box top (or a wire) with an underside right below her (where hangUnder would put her)
  // the other face of the floating floor she stands on, right at her feet: the ceiling under a box's top seen from
  // inside the box, the box's underside for its bottom seen from inside, the other side of a wire
  function otherFace(plat: Seg) {
    if (plat.side?.top) return wireSideAt(plat.side.base, false, S.x)
    const bp = boxPart(plat.id)
    return bp && (bp.part === 'top' || bp.part === 'bottom') ? partAt(bp.base, bp.part === 'top' ? 'topBelow' : 'under', S.x, null) : null
  }
  function canHangUnder(plat: Seg) {
    return !!underSide(plat)
  }
  // standing on a floating box (or a wire): hang upside down from its underside, right below (switching sides)
  // (`under`: another ceiling at her feet instead, the other face of the same line)
  function hangUnder(plat: Seg, look: number, under = underSide(plat)) {
    if (!under || R.climbSpeed <= 0) return false
    const y = floorY(under, S.x) ?? under.ay
    // on a sloped wire piece her feet point into the line, square to it
    const ux = (under.bx - under.ax) / under.len, uy = (under.by - under.ay) / under.len
    const n = ux >= 0 ? [-uy, ux] : [uy, -ux]
    clingFrame(under, n, S.x, y)
    S.face = -look
    S.vy = 0; S.grounded = true; S.plat = null; S.sliding = false; S.jumpIndex = -1; S.squash = 0.5; sfx('grab')
    return true
  }
  // walking off the end of a floating floor crouched: the wall that starts at that end takes her, going down.
  // A hard outline's floor ("Objeto duro") does the same with the outline's own walls, on their outside; the other
  // solid walls (the limits) never take her this way.
  function grabEdgeSide(sg: Seg, dir: number, vup: number) {
    if (R.climbSpeed <= 0) return false
    const ex = dir > 0 ? Math.max(sg.ax, sg.bx) : Math.min(sg.ax, sg.bx), ey = floorY(sg, ex)
    if (ey === null) return false
    for (const w of SEGS) {
      if (!w.wall || w.ceil || w.bounce || (w.solid ? !(sg.hardN && w.hardN) : !!sg.hardN)) continue
      const atA = Math.hypot(w.ax - ex, w.ay - ey) < 3, atB = !atA && Math.hypot(w.bx - ex, w.by - ey) < 3
      if (!atA && !atB) continue
      const far = atA ? [w.bx, w.by] : [w.ax, w.ay]
      if (far[1] <= ey + 1) continue
      const u2 = [(far[0] - ex) / w.len, (far[1] - ey) / w.len]
      const speed = Math.abs(S.vx)
      clingFrame(w, w.hardN ?? cornerNormal([0, -1], [dir, 0], u2), ex, ey)
      const sign = atA ? 1 : -1
      S.cl.carry = { key: `${dir},${vup}`, sign }
      S.vx = sign * S.cl.sigma * speed
      S.vy = 0; S.grounded = true; S.plat = null; S.sliding = false; S.jumpIndex = -1; S.squash = 0.4; sfx('grab')
      return true
    }
    return false
  }
  // Brood + Jump on a hard wall that leads to another room (`cross`), standing on it, hanging from it or clinging to
  // it at (px, py) with `n` pointing out of it: she comes out on the surface facing the other way, straight through.
  // That is the wall's own other face when her body fits in the passage behind it, else the next room's wall (the
  // passage is plugged for her, `data-chicken-fit`, and what the plug covers is no surface). Only with the wall's key
  // (setCrossKey), and only when such a surface is there.
  // A cut corner's slanted wall leads to the room on that diagonal, past its own outer face (hard-shapes.ts, crossTarget).
  function crossWall(sg: Seg, n: number[], px: number, py: number) {
    const k = sg.cross
    if (!k || k.key !== crossKey || S.held) return false
    // the nearest surface behind the wall that faces the other way
    const hit = crossTarget(SEGS, n, px, py, k.reach, k.skip)
    if (!hit) return false
    const { to, x: qx, y: qy } = hit
    crossCount++
    const look = screenFace()
    if (n[1] > 0.7) { standAt(qx, qy, to, look); return true }
    clingFrame(to, to.hardN ?? [-n[0], -n[1]], qx, qy)
    // under the floor she stood on: upside down, looking the same way on the screen
    if (n[1] < -0.7) S.face = -look
    S.vy = 0; S.grounded = true; S.plat = null; S.sliding = false; S.jumpIndex = -1; S.squash = 0.5; sfx('grab')
    return true
  }
  // Brood + Jump on a floating (not hard) collider she clings to: the other face of the same line, at the same point.
  // Hanging, she stands on it (on the box's top from under that top inside the box, inside on the box's bottom from
  // under the box, on the wire); on a wall she clings to its other face (into the box from outside, out from inside).
  function switchFace(sg: Seg) {
    if (sg.solid) return false
    const c = S.cl, bp = boxPart(sg.id)
    if (c.n[1] > 0.7) {
      const floor = sg.side && !sg.side.top ? wireSideAt(sg.side.base, true, c.px)
        : bp && (bp.part === 'topBelow' || bp.part === 'under') ? partAt(bp.base, bp.part === 'topBelow' ? 'top' : 'bottom', c.px, null) : null
      if (!floor) return false
      const look = screenFace()
      standAt(c.px, floorY(floor, c.px) ?? c.py, floor, look)
      return true
    }
    if (sg.ceil) return false
    clingFrame(sg, [-c.n[0], -c.n[1]], c.px, c.py)
    S.squash = 0.5; sfx('grab')
    return true
  }
  // Jump against her look on a floating (not hard) collider: the other side of the same collider. Under a box she
  // climbs onto its top; on a box's outer side she moves to its opposite side; elsewhere she crosses the line.
  function switchSide(sg: Seg) {
    if (sg.solid) return false
    const c = S.cl, bp = boxPart(sg.id)
    // under a wire: up onto it, at the same point
    if (sg.side && !sg.side.top) {
      const top = wireSideAt(sg.side.base, true, c.px)
      if (!top) return false
      const look = screenFace()
      standAt(c.px, floorY(top, c.px) ?? c.py, top, look)
      return true
    }
    if (bp && (bp.part === 'under' || bp.part === 'topBelow')) {
      const top = partAt(bp.base, 'top', c.px, null)
      if (!top) return false
      const look = screenFace()
      standAt(c.px, floorY(top, c.px) as number, top, look)
      return true
    }
    if (c.n[1] > 0.7) return false
    if (bp && (bp.part === 'left' || bp.part === 'right') && (bp.part === 'left' ? c.n[0] < 0 : c.n[0] > 0)) {
      const opp = partAt(bp.base, bp.part === 'left' ? 'right' : 'left', null, c.py)
      if (!opp) return false
      clingFrame(opp, [-c.n[0], -c.n[1]], opp.ax, c.py)
    } else clingFrame(sg, [-c.n[0], -c.n[1]], c.px, c.py)
    S.squash = 0.5; sfx('grab')
    return true
  }
  function clingStep(dt: number, dir: number, U: boolean, Dn: boolean, jumpPressed: boolean, RUN: boolean, against: boolean, broodFlip = false, brood = false) {
    const vup = (U ? 1 : 0) - (Dn ? 1 : 0)
    const c = S.cl, sg = segById(c.id)
    if (!sg) { letGo(0, 0); return }
    const offset = sg.clipOffset ?? 0
    const before = S.x * c.sigma - offset
    if (sg.clipOffset !== undefined && (before < -0.01 || before > sg.len + 0.01)) {
      letGo(0, 0)
      return
    }
    const ux = (sg.bx - sg.ax) / sg.len, uy = (sg.by - sg.ay) / sg.len
    const hanging = c.n[1] > 0.7
    // Jump against her look (or into the collider: Up under a ceiling, toward a wall) on a floating collider
    // switches her to its other side; hanging, Brood + Jump (without Up or Down) does too
    // (side-switch.ts) Brood + Jump is the other face of the same line; hanging with Up, it is the box's other side
    // preparing the shocking jump off the wall: she holds still, in the preparation's pose (step() launches or cancels)
    if (c.shock) { S.vx = 0; clingPose(dt, U, Dn, true); return }
    const sw = !jumpPressed ? null : hanging ? hangSwitch({ brood, up: U, down: Dn, against }) : wallSwitch({ brood, dir, toward: dir * c.n[0] < 0 })
    // a wall that leads to another room: Brood + Jump, or Jump with the direction into it (never a diagonal)
    const intoWall = jumpPressed && crossDirection({ hanging, dir, toward: dir * c.n[0] < 0, up: U, down: Dn })
    if (jumpPressed && (((broodFlip || intoWall) && crossWall(sg, c.n, c.px, c.py)) || (sw === 'box' && switchSide(sg)) || (sw === 'face' && switchFace(sg)))) {
      if (S.cl) clingPose(dt, U, Dn, brood)
      else { S.state = 'idle'; animate(dt, 'idle', false, 0) }
      return
    }
    // (a wall that leads to another room took her through first)
    if (sw === 'shock') { c.shock = true; S.vx = 0; clingPose(dt, U, Dn, true); return }
    // hanging upside down from a ceiling: Jump lets go and she falls upright
    if (hanging && jumpPressed) {
      letGo(0, 120)
      if (Math.abs(S.vx) > 1) S.face = Math.sign(S.vx)
      S.state = 'jump'; animate(dt, 'jump', false, 0); return
    }
    if (jumpPressed) {
      // wall jump: away from the surface
      const jy = Math.min(groundY, c.py + 30 * R.scale)
      fallFrom(stepOff(c.px, c.n[0], 40, jy), jy, c.n[0] * (R.jumpPush + 220) * R.wallJump, -jumpVelocity(0) * R.wallJump)
      if (Math.abs(S.vx) > 1) S.face = Math.sign(S.vx)
      S.burst = R.jumpFlaps / Math.max(1, R.jumpFlapRate); sfx('wallJump')
      S.state = 'jump'; animate(dt, 'jump', false, Math.abs(S.vx)); return
    }
    // up/down count more the steeper the surface, left/right the flatter it is; on steep walls
    // left/right still climb at half speed (toward the wall goes up, away goes down)
    let side = dir * c.t[0]
    if (Math.abs(c.t[0]) < 0.5 && dir !== 0) side = (dir * c.n[0] < 0 ? 1 : -1) * 0.5 * (Math.sign(-c.t[1]) || 1)
    let want = clamp(side + vup * -c.t[1], -1, 1)
    // just round a corner: the same controls keep her going the same way until they change
    const inKey = `${dir},${vup}`
    if (c.carry && (c.carry.key !== inKey || (!dir && !vup))) c.carry = null
    if (c.carry) want = c.carry.sign * c.sigma
    // brooding she moves at the brooding walk's share of the climb and keeps looking the way she looked
    S.vx = approach(S.vx, want * clingSpeedLimit(R.climbSpeed, R.broodWalk, brood, RUN), R.acceleration * dt)
    if (!brood && Math.abs(want) > 0.15) S.face = Math.sign(want)
    // double tap away from the wall lets go; double tap toward a near-vertical floating wall swaps sides
    if (dir !== 0 && dir !== c.lastDir) {
      const now = performance.now() / 1000
      if (c.tapDir === dir && now - c.tapT < 0.3) {
        c.tapDir = 0
        if (dir * c.n[0] > 0.5) { letGo(c.n[0] * 90, 0); return }
        if (!sg.solid && sg.ang >= 70 && sg.ang <= 110 && switchSide(sg)) { animate(dt, 'cling', false, 0); return }
      } else { c.tapDir = dir; c.tapT = now }
    }
    c.lastDir = dir
    const prevPy = c.py
    S.x += S.vx * dt
    let s = S.x * c.sigma - offset
    c.px = sg.ax + ux * s; c.py = sg.ay + uy * s
    // climbing down onto a floor that meets the wall (never from a ceiling: the box's own bottom edge is there)
    // (a floor level with the wall's top is the corner she just rounded, e.g. the box's top seen from inside)
    if (c.n[1] <= 0.7 && c.py > prevPy + 1e-6) {
      const wallTop = Math.min(sg.ay, sg.by) + 2
      for (const f of SEGS) {
        if (f.wall) continue
        const ix = stepOff(c.px, c.n[0], 30, c.py), fy = floorY(f, ix)
        if (fy !== null && fy > wallTop && prevPy < fy && c.py >= fy && fy <= groundY && !crossesFused(FUSED, c.px + c.n[0], c.py, ix, fy - 1)) { standAt(ix, fy, fy < groundY ? f : null, Math.sign(c.n[0]) || 1); return }
      }
    }
    if (s < 0 || s > sg.len) {
      const end = s < 0 ? [sg.ax, sg.ay] : [sg.bx, sg.by], other = s < 0 ? [sg.bx, sg.by] : [sg.ax, sg.ay]
      // a wire's underside is no wall: its higher end never climbs over onto the wire, and past its last piece she falls
      const upper = end[1] < other[1] - 1 && !sg.side
      if (upper) {
        // top end: climb over onto the floor behind it (a box's top edge), if there is one
        const ix = end[0] - c.n[0] * 26 * R.scale
        let f = SEGS.find(f => !f.wall && floorY(f, ix) !== null && Math.abs((floorY(f, ix) as number) - end[1]) < 4 && !crossesFused(FUSED, end[0] + c.n[0], end[1], ix, (floorY(f, ix) as number) - 1))
        // the wall's top can be hidden a little below its box's top (an object in front): its own top still counts
        const bp = f ? null : boxPart(sg.id)
        if (bp) {
          const top = partAt(bp.base, 'top', ix, null), ty = top && floorY(top, ix)
          if (top && ty !== null && ty <= end[1] + 4 && ty >= end[1] - 60 * R.scale) f = top
        }
        if (f) { standAt(ix, floorY(f, ix) as number, f, -Math.sign(c.n[0]) || 1); return }
        // a hard slope that starts at the wall's top (a cut corner): she walks on up it
        if (sg.hardN) for (const o of SEGS) {
          if (o.wall || !o.hardN || (Math.hypot(o.ax - end[0], o.ay - end[1]) >= 3 && Math.hypot(o.bx - end[0], o.by - end[1]) >= 3)) continue
          const jx = end[0] - c.n[0] * Math.min(8 * R.scale, Math.abs(o.bx - o.ax) / 2), jy = floorY(o, jx)
          if (jy !== null && jy <= end[1] + 1) { standAt(jx, jy, o, -Math.sign(c.n[0]) || 1); return }
        }
      }
      if (end[1] < groundY - 3 && wrapCorner(sg, end, other, inKey)) { clingPose(dt, U, Dn, brood); return }
      if (upper) {
        s = clamp(s, 0, sg.len); S.x = (s + offset) * c.sigma; S.vx = 0; c.px = sg.ax + ux * s; c.py = sg.ay + uy * s
      } else if (end[1] >= groundY - 3) {
        standAt(stepOff(end[0], c.n[0], 30, groundY), groundY, null, Math.sign(c.n[0]) || 1); return
      } else if (c.n[1] > 0.7) { c.px = end[0]; c.py = end[1]; letGo(0, 0); return }
      else { fallFrom(stepOff(end[0], c.n[0], 30, end[1]), end[1], 0, 0); return }
    }
    clingPose(dt, U, Dn, brood)
  }
  // Hanging upside down she walks, stands, crouches and looks like on the ground, with Up and Down swapped
  // (Up pulls her in to the ceiling like crouching, Down stretches her head toward the ground like looking up)
  // brood: Brood held, she broods on the surface (the brood's pose in the grab's frame)
  function clingPose(dt: number, U = false, Dn = false, brood = false) {
    const c = S.cl
    // the body leans down the slope; flat (a ceiling) it does not lean
    const sin = Math.sin(c.phi)
    c.tilt = Math.abs(sin) < 0.05 ? 0 : -Math.sign(S.face * sin) * R.clingTilt
    const speed = Math.abs(S.vx)
    const hanging = c.n[1] > 0.7
    const st = clingAnim(hanging, speed, R.climbSpeed, U, Dn, brood)
    if (brood && !S.clBrood) sfx('st_brood')
    S.clBrood = brood
    S.state = 'cling'; S.clingAnim = st
    updateFeet(dt, st, speed)
    animate(dt, st, st === 'lookUp', speed)
  }

  // ---------- "Objeto duro": its walls stop her, and its floors catch her feet ----------
  // After moving sideways (not clinging): a hard wall in front of her body above the knees stops her; then a hard
  // floor up to knee height above her feet (a slope's foot, a low step, a corner she slid into) puts her on it.
  function hardStep(prevX: number) {
    const s = R.scale
    const x = blockHardWalls(SEGS, prevX, S.x, S.y - Math.max(bodyTop(), STEP_UP + 1) * s, S.y - STEP_UP * s, 16 * s, S.y - 2)
    if (x !== null) { S.x = x; S.vx = 0 }
    // a joined solid's slanted ceiling (a cut corner over the floor she walks on) coming down on her: she stops
    // where her body no longer fits under it
    if (S.grounded && S.x !== prevX) for (const sg of SEGS) {
      if (!sg.ceil || !sg.join || sg.ay === sg.by || sg.ax === sg.bx) continue
      if (S.x < Math.min(sg.ax, sg.bx) || S.x > Math.max(sg.ax, sg.bx)) continue
      const slope = (sg.by - sg.ay) / (sg.bx - sg.ax), cy = sg.ay + slope * (S.x - sg.ax)
      if (cy < S.y && cy > S.y - Math.min(LOW_CEILING, bodyTop()) * s && slope * (S.x - prevX) > 0) { S.x = prevX; S.vx = 0; break }
    }
    // an outline placed over her (the editor, a moved object): she climbs out onto its nearest floor above her feet
    const feetY = S.y - 2
    for (const { id, poly } of HARD_SHAPES) {
      if (!polygonContains(poly, S.x, feetY)) continue
      let exit: Seg | null = null, exitY = -Infinity
      for (const sg of SEGS) {
        if (!sg.hardN || sg.wall || !sg.id.startsWith(id + ':l')) continue
        const fy = floorY(sg, S.x)
        if (fy !== null && fy < feetY && fy > exitY) { exit = sg; exitY = fy }
      }
      // walking up a slope her feet sink a little into it before the floor below catches up: she just follows it
      if (exit && S.grounded && exitY >= feetY - STEP_UP * s) { S.y = exitY; S.plat = exit.id; S.platAx = exit.anchorX; return }
      if (exit) { S.cl = null; land(exitY, exit); return }
    }
    if (!S.grounded && S.vy < 0) return
    let best: Seg | null = null, bestY = Infinity
    for (const sg of SEGS) {
      if (!sg.hardN || sg.wall) continue
      const fy = floorY(sg, S.x)
      if (fy === null || fy > S.y + 0.5 || fy < S.y - STEP_UP * s || fy >= groundY) continue
      if (S.grounded && (sg.id === S.plat || fy >= S.y - 0.5)) continue
      // a room's floor is no step for whoever is under it
      if (crossesFused(FUSED, S.x, S.y - 1, S.x, fy - 1)) continue
      if (fy < bestY) { best = sg; bestY = fy }
    }
    if (!best) return
    if (S.grounded) { S.y = bestY; S.plat = best.id; S.platAx = best.anchorX }
    else land(bestY, best)
  }

  // ---------- step up: a platform edge touching her shin or foot while walking lifts her onto it ----------
  // knee height above the ground (hip minus most of the thigh), in rig units
  const STEP_UP = -HIP_Y - LF * 0.85
  // her body with her neck down, in rig units: under a ceiling lower than this she does not walk
  const LOW_CEILING = 140
  function stepUp() {
    const s = R.scale, xs = [S.x, feet.F.x ?? S.x, feet.B.x ?? S.x]
    // the legs plus the toes reaching forward
    const x0 = Math.min(...xs) - 6 * s + Math.min(0, S.face * 18 * s), x1 = Math.max(...xs) + 6 * s + Math.max(0, S.face * 18 * s)
    let best: Seg | null = null, bestY = S.y
    SEGS.forEach(sg => {
      if (sg.wall || !sg.topEdge || sg.id === S.plat) return
      const lo = Math.max(x0, Math.min(sg.ax, sg.bx)), hi = Math.min(x1, Math.max(sg.ax, sg.bx))
      if (lo > hi) return
      // a floor that goes on from another one (the next piece of a slope or a bend in a Chão, ahead of her or
      // behind her) is walked along, not stepped onto: only a free end near her (a box's top, a step over a wall) is a step
      if (continuesFloor(sg)) return
      // the highest point of it within her reach (a sloped piece is not as high everywhere)
      const fy = Math.min(floorY(sg, lo) as number, floorY(sg, hi) as number)
      if (fy >= S.y - 2 || fy < S.y - STEP_UP * s) return
      // never through a hard wall onto a floor right behind it (a room's floor, seen from outside)
      const tx = clamp(S.x, Math.min(sg.ax, sg.bx) + 4 * s, Math.max(sg.ax, sg.bx) - 4 * s)
      if (tx !== S.x && blockHardWalls(SEGS, S.x, tx, S.y - Math.max(bodyTop(), STEP_UP + 1) * s, S.y - STEP_UP * s, 0, S.y - 2) !== null) return
      if (crossesFused(FUSED, S.x, S.y - 1, tx, fy - 1)) return
      if (fy < bestY) { best = sg; bestY = fy }
    })
    if (!best) return
    const sg = best as Seg
    S.x = clamp(S.x, Math.min(sg.ax, sg.bx) + 4 * s, Math.max(sg.ax, sg.bx) - 4 * s)
    land(floorY(sg, S.x) ?? bestY, sg); S.squash = 0.35
  }

  // the end of a floor nearest her is joined to another floor (within 2 px)
  function continuesFloor(sg: Seg) {
    const [nx, ny] = Math.abs(sg.ax - S.x) < Math.abs(sg.bx - S.x) ? [sg.ax, sg.ay] : [sg.bx, sg.by]
    return SEGS.some(o => o !== sg && !o.wall && (Math.hypot(o.ax - nx, o.ay - ny) < 2 || Math.hypot(o.bx - nx, o.by - ny) < 2))
  }

  // ---------- point-and-click: a click or tap sends her walking to that spot ----------
  // She gives up (back to idle) on arriving under it, when something stops her, or on any input of her own.
  let goal: { x: number; y: number; checkT: number; checkX: number; portalId?: string } | null = null
  let tap: { id: number; x: number; y: number; t: number } | null = null
  const canPointAndClick = () => !game.gameMode && !remote && !portalEntry && (!devices || devices.includes('mouse'))
  // The portal button's walk is not the scene's point-and-click: it works in game mode too, for the mouse or touch owner.
  const canWalkToPortal = () => !remote && !portalEntry && (!devices || devices.includes('mouse') || devices.includes('touch'))
  const manualWalkInput = () => CHICKEN_ACTIONS.some(a => cancelsAutoWalk(a.key) && input(a.key))
  const ignoreTap = (t: EventTarget | null) => {
    const n = t as Element | null
    return !!n && (el.root.contains(n) || !!n.closest?.('[data-chicken-ignore], [role="dialog"], [role="alertdialog"]'))
  }
  const onTapDown = (e: PointerEvent) => {
    tap = !portalEntry && e.button === 0 && !game.gameMode && !ignoreTap(e.target) ? { id: e.pointerId, x: e.clientX, y: stageY(e.clientY), t: performance.now() } : null
  }
  const onTapUp = (e: PointerEvent) => {
    if (!tap || tap.id !== e.pointerId) return
    const t = tap; tap = null
    if (Math.hypot(e.clientX - t.x, stageY(e.clientY) - t.y) > 8 || performance.now() - t.t > 600 || S.held) return
    const m = 40 * R.scale
    goal = { x: clamp(e.clientX, m, W - m), y: stageY(e.clientY), checkT: 0.3, checkX: S.x }
    if (R.broodStandOnMove) S.broodLatch = false
  }
  window.addEventListener('pointerdown', onTapDown, true)
  window.addEventListener('pointerup', onTapUp, true)
  // true while she should keep walking to the goal (still: what she holds keeps her still on purpose, so she is not
  // stuck)
  function goalStep(dt: number, still: boolean) {
    const g = goal!
    if (autoWalkArrived(g.x - S.x, S.vx, S.sliding ? R.slideFriction : R.deceleration, 6 * R.scale, S.grounded)) { goal = null; return false }
    if (still) { g.checkT = 0.3; g.checkX = S.x }
    else if (S.grounded) {
      g.checkT -= dt
      if (g.checkT <= 0) {
        // stuck: barely moved in the last 0.3 s
        if (Math.abs(S.x - g.checkX) < 4 * R.scale) { goal = null; return false }
        g.checkT = 0.3; g.checkX = S.x
      }
    }
    return true
  }

  // ---------- drag and drop: pick her up with the pointer; let go and she falls ----------
  const drag = { on: false, id: null as number | null, x0: 0, y0: 0, ox: 0, oy: 0, px: 0, py: 0 }
  // the Pátio's camera zoom scales the drawing around the screen's centre: a pointer in her own pixels
  let camZoom = 1
  // what the Zona where she stands does to her (lib/pigchicken/zone-physics.ts): the factor on her gravity (her jump
  // keeps the Earth's push, so a lighter gravity takes her higher) and the x-ray look
  let zoneGravity = 1, zoneTime = 1, xrayOn = false
  const XRAY_DARK = ['artWingBack', 'artTail', 'artTorso', 'artNeck', 'artComb', 'artFace', 'artBeak', 'artWattle', 'artWing']
  function paintXray(on: boolean) {
    XRAY_DARK.forEach(n => (on ? el[n].setAttribute('filter', 'url(#chk-xray)') : el[n].removeAttribute('filter')))
    ;(['wrapF', 'wrapB'] as const).forEach(n => (on ? el[n].setAttribute('filter', 'url(#chk-xrayBone)') : el[n].removeAttribute('filter')))
    // one glow around her whole shape (the bones' too), like the shocked ones' on the canvas
    if (on) el.root.setAttribute('filter', 'url(#chk-xrayGlow)'); else el.root.removeAttribute('filter')
    ;['bonesBody', 'bonesWing', 'bonesNeck', 'bonesHead'].forEach(n => { el[n].style.display = on ? '' : 'none' })
    ;['sclera', 'pupil', 'lid'].forEach(n => { el[n].style.visibility = on ? 'hidden' : '' })
  }
  const local = (x: number, y: number) => camZoom === 1 ? { x, y } : { x: W / 2 + (x - W / 2) / camZoom, y: H / 2 + (y - H / 2) / camZoom }
  function heldStep(dt: number) {
    const tx = drag.px - drag.ox, ty = drag.py - drag.oy
    S.vx = ease(S.vx, (tx - S.x) / Math.max(dt, 1e-3), 12, dt); S.vy = ease(S.vy, (ty - S.y) / Math.max(dt, 1e-3), 12, dt)
    S.x = tx; S.y = ty; S.grounded = false; S.cl = null; S.plat = null; S.sliding = false
    S.state = 'held'
    animate(dt, 'held', false, 0)
  }
  const onRootDown = (e: PointerEvent) => {
    // the Pátio (game mode) can pick her up too; a remote chicken (online) is not ours to move
    // (sitting at a fixed instrument she stays put: a press on her is a press on its strings)
    if (portalEntry || e.button !== 0 || remote || opts.ghost || game.seat) return
    goal = null
    e.preventDefault(); e.stopPropagation(); ensureAudio()
    const p = local(e.clientX, stageY(e.clientY))
    drag.id = e.pointerId; drag.x0 = p.x; drag.y0 = p.y; drag.on = false
  }
  function moveDrag(e: PointerEvent) {
    if (drag.id !== e.pointerId) return
    const p = local(e.clientX, stageY(e.clientY))
    drag.px = p.x; drag.py = p.y
    if (!drag.on && Math.hypot(p.x - drag.x0, p.y - drag.y0) > 5) {
      drag.on = true
      if (S.cl) { startTurn(); S.x = S.cl.px + S.cl.n[0] * 40 * R.scale; S.y = Math.min(groundY, S.cl.py + 30 * R.scale); S.cl = null }
      drag.ox = drag.x0 - S.x; drag.oy = drag.y0 - S.y
      S.held = true; S.vx = 0; S.vy = 0; S.burst = 0; el.root.style.cursor = 'grabbing'; S.broodLatch = false; sfx('pickUp')
    }
  }
  const endDrag = (e: PointerEvent) => {
    if (drag.id !== e.pointerId) return
    drag.id = null; el.root.style.cursor = 'grab'
    if (!drag.on) return
    drag.on = false; S.held = false
    fallFrom(S.x, S.y, e.type === 'pointercancel' ? 0 : clamp(S.vx * 0.35, -420, 420), e.type === 'pointercancel' ? 0 : clamp(S.vy * 0.35, -420, 420))
  }
  // Mobile browsers ignore touch-action on SVG shapes: a finger moving on her starts a page pan, which
  // fires pointercancel and drops her. Blocking the touch's default keeps the pointer stream alive.
  const blockTouch = (e: TouchEvent) => { if (e.cancelable && !remote) e.preventDefault() }
  const blockTouchMove = (e: TouchEvent) => { if (drag.id !== null && e.cancelable) e.preventDefault() }
  el.root.addEventListener('pointerdown', onRootDown)
  el.root.addEventListener('touchstart', blockTouch, { passive: false })
  window.addEventListener('touchmove', blockTouchMove, { passive: false })
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)

  // ---------- rig ----------
  // 2-bone IK from (x0,y0) to (tx,ty): returns the two bone directions (radians), joint bending backwards
  function ik2(x0: number, y0: number, tx: number, ty: number, l1: number, l2: number) {
    const dx = tx - x0, dy = ty - y0
    const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.3)
    const a0 = Math.atan2(dy, dx)
    const alpha = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1))
    const u1 = a0 + alpha, u2 = a0 - alpha
    const up = Math.cos(u1) < Math.cos(u2) ? u1 : u2
    const jx = x0 + l1 * Math.cos(up), jy = y0 + l1 * Math.sin(up)
    return [up, Math.atan2(ty - jy, tx - jx)]
  }
  // the swing, keyframed from video reference (absolute angles, 0 = forward, 90 = down; facing right):
  // fold the ankle up and back toward the body, then swing the lower leg forward and reach out pointed
  function swingKeys() {
    const fo = clamp(R.foldPortion, 0.1, 0.9), e = (t0: number) => fo + (1 - fo) * t0
    return [[fo * 0.45, 158, 111, 35], [fo, R.foldAnkle, 88, R.toeCurl], [e(0.25), 152, 48, 80], [e(0.5), 126, 26, 60], [e(0.8), 100, R.reachAngle, R.reachAngle]]
  }
  function solveLeg(key: 'F' | 'B', ax: number, ay: number, extraFwd: number) {
    const hx = LEG[key].hx
    const fwd = clamp(R.femurAngle + clamp((ax - hx) * R.femurSwing, -20, 25) + extraFwd + (pose.legSink + R.legBend) * 1.1, 5, 88)
    const fa = (90 - fwd) / DEG
    const kx = hx + LF * Math.cos(fa), ky = HIP_Y + LF * Math.sin(fa)
    const [ta, sa] = ik2(kx, ky, ax, ay, LT, LS)
    return [fa * DEG - 90, (ta - fa) * DEG, (sa - ta) * DEG, sa * DEG - 90]
  }
  function legAbs(key: 'F' | 'B', ax: number, ay: number, extraFwd: number) {
    const a = solveLeg(key, ax, ay, extraFwd)
    const fa = a[0] + 90, ta = fa + a[1], sa = ta + a[2]
    return [fa, ta, sa, 0]
  }
  function swingPose(key: 'F' | 'B', f: any, shiftY: number, amp: number) {
    const toLocal = (wx: number) => (wx - S.x) * S.face / R.scale
    const y = FOOT_Y - shiftY
    const start = legAbs(key, toLocal(f.from), y, 0), end = legAbs(key, toLocal(f.to), y, 0)
    const keys = [[0, start[1], start[2], 0]].concat(swingKeys()).concat([[1, end[1], end[2], 0]])
    let i = 0; while (i < keys.length - 2 && f.t > keys[i + 1][0]) i++
    const A = keys[i], B = keys[i + 1], u = smooth(clamp((f.t - A[0]) / Math.max(1e-3, B[0] - A[0]), 0, 1))
    const mix = (j: number) => { const lin = j === 3 ? 0 : start[j] + (end[j] - start[j]) * f.t; return lin + (A[j] + (B[j] - A[j]) * u - lin) * amp }
    const fa = start[0] + (end[0] - start[0]) * f.t
    return [fa, mix(1), mix(2), mix(3)]
  }

  function animate(dt: number, st: string, U: boolean, speed: number) {
    const t: any = { bob: 0, body: 0, neck: 0, head: 0, wing: 0, wingBack: 0, tail: 0, sink: 0, legSink: 0, puff: 1, ik: 1, sway: 0 }
    let k = 16
    S.burst = Math.max(0, S.burst - dt)
    const flapping = S.burst > 0 || st === 'fly' || (st === 'held' && R.heldFlapRate > 0)
    // charging the shocking jump in the air (Brood + Jump held): the wings beat at their own rate (0: they stay folded)
    const chargeFlap = S.shocking && !S.grounded && !S.shockFromGround && !S.held && !S.cl && R.shockingAirFlapRate > 0
    if (chargeFlap) S.flapPhase += dt * R.shockingAirFlapRate * Math.PI * 2
    else if (flapping) S.flapPhase += dt * (S.burst > 0 ? R.jumpFlapRate : st === 'held' ? R.heldFlapRate : R.flapRate) * Math.PI * 2
    const walking = st === 'walk' || st === 'run' || ((st === 'crouch' || st === 'cling') && speed > 5)
    if (walking) {
      // the body rocks and shifts a little with each step
      const stepT = feet.F.stepping ? feet.F.t : feet.B.stepping ? feet.B.t : 0
      t.bob = -Math.sin(Math.PI * stepT) * R.bodyBob * (st === 'run' ? 1.4 : 1)
      t.body = Math.sin(Math.PI * stepT) * R.bodyRock
      t.sway = Math.sin(Math.PI * stepT) * R.bodySway
      t.tail = Math.sin(Math.PI * stepT) * 4
    }
    const contact = S.contact; S.contact = false
    // Pig and Ken walk like mammals: no head locked in the air and thrust forward at each step
    if (beast() && (st === 'walk' || ((st === 'crouch' || st === 'cling') && speed > 5))) {
      headAnchor.x = null
      const stepT = feet.F.stepping ? feet.F.t : feet.B.stepping ? feet.B.t : 0
      t.neck = -pose.body * 0.5; t.head = Math.sin(Math.PI * stepT) * 2
      k = 20
    } else if (st === 'walk' || ((st === 'crouch' || st === 'cling') && speed > 5)) {
      // head locks in place; when a foot lands it shoots forward to where the body will be next, never back
      const A = headAnchor, reach = NECK_LEN * clamp(R.headLag, 0.05, 0.9) * R.scale
      if (A.x === null) { A.x = A.from = A.to = S.x; A.t = 1; A.lastContact = S.x }
      const lag = (S.x - A.x) * S.face
      if (contact || lag > reach) {
        const stepDist = A.lastContact === null ? 30 * R.scale : Math.abs(S.x - A.lastContact)
        const ahead = clamp(stepDist * R.headLead, 0, reach)
        A.from = A.x; A.to = S.x + S.face * ahead; A.t = 0
        if ((A.to - A.from) * S.face < 0) A.to = A.from
        if (contact) A.lastContact = S.x
      }
      if (A.t < 1) { A.t = Math.min(1, A.t + dt / Math.max(0.01, R.headSnapTime)); A.x = A.from + (A.to - A.from) * smooth(A.t) }
      const dd = (S.x - A.x) * S.face / R.scale
      const th = -Math.asin(clamp(dd / NECK_LEN, -0.9, 0.9)) * DEG
      t.neck = th - pose.body; t.head = -th * 0.9
      k = 90
    } else headAnchor.x = null
    if (st === 'run') {
      t.body = R.runLean + t.body
      t.neck = R.runHeadTilt * 0.7; t.head = R.runHeadTilt * 0.3
      t.tail = -12; t.wing = 14; t.wingBack = 10
      k = 18
    } else if (st === 'crouch') {
      t.sink = R.crouchDepth; t.legSink = R.crouchDepth; t.body = speed > 5 ? 6 : 3
      if (speed <= 5) { t.neck = 6; t.head = -4 }
      t.tail = 4; k = 18
    } else if (st === 'slide') {
      t.sink = Math.min(R.crouchDepth, 20); t.legSink = t.sink; t.ik = 0
      t.body = -8; t.neck = -6; t.head = 10; t.tail = -16; t.wing = 22; t.wingBack = 18
      t.tgtF = [LEG.F.hx + 40, -10]; t.tgtB = [LEG.B.hx - 22, -22]
      k = 20
    } else if (st === 'seat') {
      // on a stool: the body a little lower and upright, the legs bent forward with the feet near the floor
      t.sink = SEAT_SINK; t.legSink = SEAT_SINK; t.ik = 0
      t.tgtF = [LEG.F.hx + 30, -3]; t.tgtB = [LEG.B.hx + 24, -3]
      t.body = -4; t.neck = 3; t.head = -3; t.tail = 10; t.wing = 12; t.wingBack = 8
      k = 12
    } else if (st === 'brood') {
      // the body settles over the legs, which fold up under it
      t.sink = R.broodDepth; t.legSink = R.broodDepth; t.puff = 1.07; t.wing = 8; t.wingBack = 6; t.tail = 6; t.neck = 6; t.head = -6
      // grabbed (brooding on a wall): the grab keeps the body's lean
      if (S.cl) t.body += S.cl.tilt
      k = 10
    } else if (st === 'cling') {
      // half sideways: feet gripping the surface, body turned back toward upright
      t.body += S.cl ? S.cl.tilt : 0; t.tail = 10; t.wing = 16; t.wingBack = 12
      t.sink = R.clingBend; t.legSink = R.clingBend
      if (speed <= 5) { t.neck = -4; t.head = -10 }
      k = Math.max(k, 18)
    } else if (st === 'lookUp') {
      t.neck = -14; t.head = -38; t.tail = 4
      k = 14
    } else if (st === 'idle') {
      idle.next -= dt
      if (idle.next <= 0) {
        const big = Math.random() < 0.35
        idle.neck = rand(-6, 9) * (big ? 1.6 : 1)
        idle.head = rand(-22, 16) * (big ? 1.3 : 1)
        idle.next = rand(R.idleMin, Math.max(R.idleMin, R.idleMax))
        if (Math.random() < 0.3) idle.next = 0.25
      }
      t.neck = idle.neck; t.head = idle.head
      // a mammal looks around much less than a hen
      if (beast()) { t.neck *= 0.25; t.head *= 0.3 }
      t.bob = Math.sin(performance.now() / 600) * 0.6
      k = beast() ? 8 : 38
    }
    if (!S.grounded) {
      t.ik = 0
      t.tgtF = [LEG.F.hx + 6, -36]; t.tgtB = [LEG.B.hx + 2, -40]; t.tuck = 12
      // Pig and Ken let their legs hang in the air (tucked up, a mammal's would hide inside the body)
      if (beast()) { t.tgtF = [LEG.F.hx + 10, -10]; t.tgtB = [LEG.B.hx - 2, -12]; t.tuck = 0 }
      t.body = clamp(S.vy / 70, -14, 14)
      t.tail = -8; t.neck = -4; t.head = S.vy < 0 ? -10 : 6
      if (st === 'held') { t.tgtF = [LEG.F.hx + 3, -2]; t.tgtB = [LEG.B.hx - 3, 0]; t.tuck = -14; t.body = clamp(-S.vx / 35, -28, 28); t.neck = 4; t.head = 10; t.tail = 10 }
      if (st === 'fastFall') { t.wing = beast() ? 30 : 120; t.wingBack = beast() ? 26 : 110; t.tgtF = [LEG.F.hx + 4, -6]; t.tgtB = [LEG.B.hx + 8, -8]; t.tuck = -10; t.body = 6; t.head = 14; t.tail = -24 }
      k = 18
    }
    if (U && (st === 'walk' || st === 'run' || st === 'crouch' || !S.grounded)) { t.neck -= 10; t.head -= 30 }
    if (S.shocking || S.cl?.shock) {
      t.sink = R.broodDepth + R.shockingBodyDepth
      t.legSink = R.broodDepth + R.shockingLegBend
      t.ik = 1; t.tuck = 0
      t.wing = 8; t.wingBack = 6
      if (!S.grounded) t.ik = 0
    }

    if (S.grounded || S.held || S.cl) shockingAirReleaseTime = 0
    const legPose = !S.grounded && S.shocking
      ? shockingAirLegPose(shockingAirElapsed, R.shockingAirChargeTime, R.shockingAirKneeBend, false)
      : !S.grounded && shockingAirReleaseTime > 0
        ? shockingAirLegPose(0, R.shockingAirChargeTime, R.shockingAirKneeBend, true) : null
    if (legPose && !S.shocking) t.ik = 0
    shockingAirReleaseTime = Math.max(0, shockingAirReleaseTime - dt)

    pose.bob = ease(pose.bob, t.bob, 30, dt)
    pose.sway = ease(pose.sway, t.sway, 20, dt)
    pose.body = ease(pose.body, t.body, 12, dt)
    pose.neck = ease(pose.neck, t.neck, k, dt)
    pose.head = ease(pose.head, t.head, k, dt)
    pose.tail = ease(pose.tail, t.tail, 12, dt)
    const sinkK = st === 'brood' ? R.broodSpeed : 12
    pose.sink = ease(pose.sink, t.sink, sinkK, dt)
    pose.legSink = ease(pose.legSink, t.legSink, sinkK, dt)
    pose.puff = ease(pose.puff, t.puff, 10, dt)
    pose.ik = ease(pose.ik, t.ik, 20, dt)

    // legs: planted feet on the ground, authored foot targets in the air / sliding, blended by pose.ik
    const shiftY = pose.bob + pose.legSink + R.legBend - 2
    const airCurl = S.grounded ? 0 : (st === 'fastFall' ? 0.2 : 0.6)
    const legK = pose.ik > 0.9 ? 60 : 22
    ;(['F', 'B'] as const).forEach(key => {
      const f = feet[key], hx = LEG[key].hx
      const gx = f.x !== null ? (f.x - S.x) * S.face / R.scale : hx, gy = FOOT_Y - f.lift - shiftY
      const tg = t['tgt' + key] || [hx + 6, -36]
      const w = pose.ik
      const ax = gx * w + tg[0] * (1 - w), ay = gy * w + tg[1] * (1 - w)
      const extra = (f.lift || 0) * 0.6 + (t.tuck || 0) * (1 - w)
      let fa: number, ta: number, sa: number, toeW: number, lk = legK
      if (!S.shocking && f.stepping && !f.settle && S.grounded && w > 0.9) {
        [fa, ta, sa, toeW] = swingPose(key, f, shiftY, st === 'crouch' ? R.crouchSwing : 1); lk = 160
        const kx = hx + LF * Math.cos(fa / DEG), ky = HIP_Y + LF * Math.sin(fa / DEG)
        const fx = kx + LT * Math.cos(ta / DEG) + LS * Math.cos(sa / DEG), fy = ky + LT * Math.sin(ta / DEG) + LS * Math.sin(sa / DEG)
        const floor = FOOT_Y - shiftY - 1
        if (fy > floor) { const r = ik2(kx, ky, fx, floor, LT, LS); ta = r[0] * DEG; sa = r[1] * DEG }
      } else {
        [fa, ta, sa] = legAbs(key, ax, ay, extra)
        toeW = airCurl * R.toeCurl
      }
      if (legPose) {
        const target = key === 'F' ? legPose.front : legPose.back
        fa = 90 + target.leg; ta = fa + target.tib; sa = ta + target.shin; toeW = sa - 90
        lk = 35
      }
      pose['leg' + key] = ease(pose['leg' + key], fa - 90, lk, dt)
      pose['tib' + key] = ease(pose['tib' + key], ta - fa, lk, dt)
      pose['shin' + key] = ease(pose['shin' + key], sa - ta, lk, dt)
      pose['toe' + key] = ease(pose['toe' + key], toeW - (sa - 90), lk === 160 ? 160 : 40, dt)
    })

    // Pig and Ken have arms, not wings: they never flap them
    if (!beast() && (chargeFlap || (!S.shocking && flapping && (st !== 'fastFall' || S.burst > 0)))) {
      const f = (1 - Math.cos(S.flapPhase)) / 2
      pose.wing = 15 + f * 95; pose.wingBack = 10 + f * 85
    } else {
      pose.wing = ease(pose.wing, t.wing, 14, dt); pose.wingBack = ease(pose.wingBack, t.wingBack, 14, dt)
    }
    S.squash = Math.max(0, S.squash - dt * 6)

    blink.next -= dt
    if (blink.next <= 0 && blink.t < 0) { blink.t = 0; blink.next = rand(R.blinkMin, Math.max(R.blinkMin, R.blinkMax)) }
    S.broodT = st === 'brood' ? (S.broodT || 0) + dt : 0
    let lid = st === 'brood' ? clamp((S.broodT - R.broodEyeDelay) / 0.35, 0, 1) * 0.55 : 0
    if (blink.t >= 0) { blink.t += dt; const b = blink.t / 0.14; lid = Math.max(lid, b < 0.5 ? b * 2 : 2 - b * 2); if (b >= 1) blink.t = -1 }
    // the buddha state: calm, half-closed eyes
    if (game.buddha > 0) lid = Math.max(lid, 0.45)
    pose.lid = lid
    pose.shiftY = shiftY
    render()
  }

  // grabbing / letting go a wall swings the drawing from the old pose into the new one
  const vis = { x: 0, y: 0, a: 0 }, turn = { t: 1, x: 0, y: 0, a: 0 }
  let frameDt = 1 / 60, frameNow = performance.now()
  function renderPortal(now: number) {
    rigMatrices.clear()
    const p = portalEntry!
    const t = clamp((now - p.start) / p.duration, 0, 1), u = smooth(t), k = p.mode === 'arrive' ? u : 1 - u
    const fromX = p.fromX + p.dx, fromY = p.fromY + p.dy
    const x = p.mode === 'arrive' ? fromX : fromX + (p.x - fromX) * u
    const y = p.mode === 'arrive' ? fromY : fromY + (p.y - fromY) * u
    el.root.setAttribute('transform', `translate(${x} ${y}) scale(${k}) translate(${-fromX} ${-fromY}) translate(${p.dx} ${p.dy}) ${p.transform}`)
    el.root.setAttribute('opacity', String(k))
    el.shadow.setAttribute('opacity', '0')
    if (p.mode === 'arrive' && t >= 1) {
      portalEntry = null
      el.root.style.pointerEvents = remote ? 'none' : 'visiblePainted'
      render()
    }
  }
  function startTurn() { if (R.clingTurnTime > 0) { turn.t = 0; turn.x = vis.x; turn.y = vis.y; turn.a = vis.a } }
  function render() {
    rigMatrices.clear()
    const s = R.scale, sq = S.squash
    const sx = s * (1 + sq * 0.08) * S.face, sy = s * (1 - sq * 0.1)
    let vx = S.cl ? S.cl.px : S.x, vy = S.cl ? S.cl.py : S.y, va = S.cl ? S.cl.phi * DEG : 0
    if (turn.t < 1) {
      turn.t = Math.min(1, turn.t + frameDt / Math.max(0.01, R.clingTurnTime))
      const u = smooth(turn.t), da = ((va - turn.a) % 360 + 540) % 360 - 180
      vx = turn.x + (vx - turn.x) * u; vy = turn.y + (vy - turn.y) * u; va = turn.a + da * u
    }
    vis.x = vx; vis.y = vy; vis.a = va
    el.root.setAttribute('transform', `translate(${vx.toFixed(1)} ${vy.toFixed(1)}) rotate(${va.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`)
    el.body.setAttribute('transform', `translate(${pose.sway.toFixed(2)} ${(pose.bob + pose.sink + R.legBend - 2).toFixed(2)}) ${rot('body', pose.body)} translate(0 -62) scale(${pose.puff.toFixed(3)}) translate(0 62)`)
    el.neck.setAttribute('transform', rot('neck', pose.neck))
    el.head.setAttribute('transform', rot('head', pose.head))
    el.artNeck.removeAttribute('transform')
    if (peckNow) {
      // Compress the neck toward its base on press; on release extend the same
      // chain along the screen aim. The head keeps its size and turns with the beak.
      const p = peckNow, a = rigAngle(p.angle * DEG), u = p.thrust
      const short = Math.max(0.15, 1 - p.pull / NECK_LEN)
      const len = short + ((p.reach / Math.max(0.01, s * pose.puff) - 30) / NECK_LEN - short) * u
      const neckA = pose.neck + (a + 73.5 - pose.neck) * u
      const base = PIV.neck, tip = PIV.head
      el.neck.setAttribute('transform', `rotate(${neckA} ${base[0]} ${base[1]})`)
      // Aim the beak immediately, independently of how far the neck has retracted
      // or extended. Undo the parent transform, including facing and jump squash.
      const parent = el.neck.getCTM()?.inverse()
      const dx = Math.cos(p.angle), dy = Math.sin(p.angle)
      const headA = parent ? Math.atan2(parent.b * dx + parent.d * dy, parent.a * dx + parent.c * dy) * DEG : a - neckA
      el.artNeck.setAttribute('transform', `translate(${base[0]} ${base[1]}) rotate(-73.5) scale(${Math.max(0.15, len)} 1) rotate(73.5) translate(${-base[0]} ${-base[1]})`)
      el.head.setAttribute('transform', `translate(${(tip[0] - base[0]) * (len - 1)} ${(tip[1] - base[1]) * (len - 1)}) ${rot('head', headA)}`)
    }
    // the swing: the wing tip points along the blow and the wing stretches out to the end of its reach
    let tipRig = 0, wingLen = 0
    // Rotate continuously with the aim; inherit the body's mirror only when she changes facing.
    const heldA = heldItem && !swingNow ? rigAngle(heldItem.angle * DEG) : 0
    const throwTilt = heldItem?.throwing && !swingNow ? -S.face * R.throwPoseAngle : 0
    const heldArtA = heldItem && !swingNow ? rigAngle(heldItem.angle * DEG + throwTilt) : 0
    // the bow: it slides across the strings and the wing holds it by the frog (its tip reaches the frog)
    const bow = heldItem && !swingNow ? heldItem.bow : null
    el.heldBow.style.display = bow ? '' : 'none'
    // "Arco e Flecha": the string bent to the arrow's nock, and the arrow on it
    const archery = heldItem?.archery ?? null
    el.heldString.style.display = archery ? '' : 'none'
    el.heldArrow.style.display = archery?.arrow ? '' : 'none'
    if (archery) {
      const [x1, y1, x2, y2] = archery.string
      el.heldString.setAttribute('d', `M${x1} ${y1} L${archery.x.toFixed(2)} ${archery.y.toFixed(2)} L${x2} ${y2}`)
      if (archery.arrow) {
        if (archery.arrow !== heldArrowSvg) { heldArrowSvg = archery.arrow; el.heldArrow.innerHTML = archery.arrow }
        el.heldArrow.setAttribute('transform', `translate(${archery.x.toFixed(2)} ${archery.y.toFixed(2)})`)
      }
    }
    const consumable = heldItem && !swingNow ? heldItem.consumable : null
    // Aim rotates the wing, while food/bottles keep their own upright pose in
    // screen space, with only a small sway. Consumption uses the mouth pose.
    const consumableAngle = consumable ? rigAngle((consumable.upright === 0 && S.face < 0 ? 180 : consumable.upright) + (consumable.progress !== undefined ? 0 : Math.sin(heldItem!.angle) * 12) + throwTilt) : 0
    // the item's rig: turned around its pivot, which sits on her shoulder or mouth (in the held pivot's frame, the shoulder)
    const rig = heldItem && !swingNow && !consumable && !heldItem.atHand && !heldItem.throwing ? heldItem.rig ?? null : null
    let anchorX = 0, anchorY = 0
    if (rig?.at === 'mouth') {
      const head = el.head.getCTM(), pivot = el.heldPivot.getCTM()
      if (head && pivot) { const m = new DOMPoint(mouthAt.x, mouthAt.y).matrixTransform(head).matrixTransform(pivot.inverse()); anchorX = m.x; anchorY = m.y }
    }
    const pivX = rig?.x ?? 0, pivY = rig?.y ?? 0
    // an instrument in her mouth: her head comes in front of the wing that holds it (the beak on the mouthpiece)
    const headFront = rig?.at === 'mouth'
    // held by the back wing and moving (the second Boomerang winding, hitting): the item is drawn behind her body
    const back = !!heldItem?.back && !heldItem.off
    if (back !== (el.heldPivot.nextElementSibling === el.tail)) el.body.insertBefore(el.heldPivot, back ? el.tail : el.wing.nextSibling)
    if (headFront !== (el.neck.nextElementSibling === el.heldPivot)) el.body.insertBefore(el.neck, headFront ? el.heldPivot : el.wing)
    // a point of the item's drawing in the held pivot's frame (from the shoulder), as drawn this frame
    const onItem = (x: number, y: number) => {
      const r = heldA / DEG, c = Math.cos(r), sn = Math.sin(r), qx = x - pivX - (heldItem?.kick ?? 0), qy = y - pivY
      return { x: anchorX + qx * c - qy * sn, y: anchorY + qx * sn + qy * c }
    }
    // the wing (or the back wing) turned and stretched from the shoulder until its tip touches (x, y); with the rig's
    // flip it is mirrored across that line, so a wing turned all the way round is not upside down
    const wingTo = (node: SVGGraphicsElement, x: number, y: number) => {
      const [px, py] = PIV.wing
      node.setAttribute('transform', `translate(${px} ${py}) rotate(${(Math.atan2(y, x) * DEG).toFixed(2)}) scale(${(beast() ? clamp(Math.hypot(x, y) / armTip.len, 0.7, 1.35) : Math.max(1, Math.hypot(x, y)) / armTip.len).toFixed(3)} ${rig?.flip ? -1 : 1}) rotate(${(-armTip.deg).toFixed(2)}) translate(${-px} ${-py})`)
    }
    // a staff carried in its own pose: the hand at its place on her body, whatever the aim
    const staff = heldItem && !consumable && !heldItem.throwing ? heldItem.staff ?? null : null
    const restAngle = (pose.wing + (heldItem?.atHand ? handAimAngle(heldA) : 0)) / DEG
    const restHandX = armTip.dx * Math.cos(restAngle) - armTip.dy * Math.sin(restAngle)
    const restHandY = armTip.dx * Math.sin(restAngle) + armTip.dy * Math.cos(restAngle)
    let handX = restHandX, handY = restHandY
    const wingToHand = (flip = false) => { el.wing.setAttribute('transform', `translate(${PIV.wing[0]} ${PIV.wing[1]}) rotate(${Math.atan2(handY, handX) * DEG}) scale(${beast() ? clamp(Math.hypot(handX, handY) / armTip.len, 0.7, 1.35) : Math.hypot(handX, handY) / armTip.len} ${flip ? -1 : 1}) rotate(${-armTip.deg}) translate(${-PIV.wing[0]} ${-PIV.wing[1]})`) }
    // the swing of a staff: the angle (degrees) the staff itself points at, turning from its carried pose to the blow
    let staffSwingA = 0
    if (consumable) {
      const pull = heldItem?.pull ?? 0
      handX -= Math.cos(heldA / DEG) * pull; handY -= Math.sin(heldA / DEG) * pull
      const progress = consumable.progress ?? 0
      const reach = smooth(clamp(progress <= 0.65 ? progress / 0.65 : (1 - progress) / 0.35, 0, 1))
      const upright = consumableAngle
      const contact = consumable.upright === -90 ? { x: 52, y: 0 } : { x: 15, y: -10 }
      const r = upright / DEG
      const head = reach > 0 ? el.head.getCTM() : null, pivot = reach > 0 ? el.heldPivot.getCTM() : null
      if (head && pivot && reach > 0) {
        const mouth = new DOMPoint(CHICKEN_MOUTH.x, CHICKEN_MOUTH.y).matrixTransform(head).matrixTransform(pivot.inverse())
        handX += (mouth.x - (contact.x * Math.cos(r) - contact.y * Math.sin(r)) - handX) * reach; handY += (mouth.y - (contact.x * Math.sin(r) + contact.y * Math.cos(r)) - handY) * reach
      }
      wingToHand()
    } else if (bow) {
      const ux = Math.cos((90 + BOW_TILT) / DEG), uy = Math.sin((90 + BOW_TILT) / DEG)
      const along = 14 + clamp(bow.stroke, 0, 1) * (BOW_LEN - 28)
      const fx = bow.x + ux * along, fy = uy * along
      el.heldBow.setAttribute('transform', `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${BOW_TILT})`)
      // the frog in her body's frame, from the shoulder: the held item's own transform applied to it
      const { x: vx, y: vy } = onItem(fx, fy)
      const b = Math.atan2(vy, vx) * DEG, stretch = clamp(Math.hypot(vx, vy) / armTip.len, 0.6, 1.5)
      const [px, py] = PIV.wing
      el.wing.setAttribute('transform', `translate(${px} ${py}) rotate(${b.toFixed(1)}) scale(${stretch.toFixed(3)} 1) rotate(${(-armTip.deg).toFixed(1)}) translate(${-px} ${-py})`)
    } else if (swingNow && !tailBlow()) {
      const e = smooth(clamp(swingNow.t, 0, 1))
      // the blow leaves from where the wing was: at rest, or holding the staff in its pose
      const rest = staff ? Math.atan2(staff.y, staff.x) * DEG : armTip.deg + pose.wing
      const restLen = staff ? Math.max(1, Math.hypot(staff.x, staff.y)) : armTip.len
      const target = rigAngle(swingNow.angle * DEG)
      const b = rest + ((((target - rest) % 360) + 540) % 360 - 180) * e
      const full = Math.max(armTip.len, swingNow.reach / Math.max(0.01, R.scale * pose.puff))
      wingLen = restLen + (full - restLen) * e
      // an arm (Pig, Ken) does not stretch like a wing: the blow's reach is the chain's or the tail's
      if (beast()) wingLen = Math.min(wingLen, armTip.len * 1.3)
      tipRig = b
      if (staff) staffSwingA = staff.angle + ((((target - staff.angle) % 360) + 540) % 360 - 180) * e
      const [px, py] = PIV.wing
      el.wing.setAttribute('transform', `translate(${px} ${py}) rotate(${b.toFixed(1)}) scale(${(wingLen / armTip.len).toFixed(3)} ${(1 - 0.2 * e).toFixed(3)}) rotate(${(-armTip.deg).toFixed(1)}) translate(${-px} ${-py})`)
    } else if (staff) {
      handX = staff.x; handY = staff.y
      wingToHand(!!staff.flip)
    } else if (heldItem?.atHand) {
      // Move the grip and anatomical hand together through the charge pullback.
      handX -= Math.cos(heldA / DEG) * heldItem.kick
      handY -= Math.sin(heldA / DEG) * heldItem.kick
      wingToHand()
    } else if (rig?.hand) {
      // the wing's hand holds the item at its touch point: the wing turns and stretches to keep touching it
      const h = onItem(rig.hand.x, rig.hand.y)
      handX = h.x; handY = h.y
      wingTo(el.wing, h.x, h.y)
    } else if (heldItem) {
      // holding an item: the wing keeps its own pivot (the shoulder) and pose, and turns by the aim's angle
      // in the same direction as the item, flap included
      el.wing.setAttribute('transform', rot('wing', pose.wing + rigAngle(heldItem.angle * DEG)))
    } else el.wing.setAttribute('transform', rot('wing', pose.wing))
    if (heldItem) {
      let a: number, at = ''
      // swinging: the item rides on the wing tip and turns with it
      if (swingNow) { a = tipRig; at = ` translate(${wingLen.toFixed(1)} 0)`; a = ((a % 360) + 540) % 360 - 180 }
      else a = heldArtA
      el.held.style.opacity = consumable?.progress !== undefined ? String(1 - clamp((consumable.progress - 0.75) / 0.25, 0, 1)) : '1'
      el.held.setAttribute('transform', consumable
        ? `translate(${handX} ${handY}) rotate(${consumableAngle})`
        // a staff: its grip point on the hand (carried) or on the wing's tip (swinging, bigger at the height of a charged blow)
        : staff ? (swingNow
          ? `rotate(${tipRig.toFixed(1)}) translate(${wingLen.toFixed(1)} 0) rotate(${(staffSwingA - tipRig).toFixed(1)}) scale(${(1 + ((swingNow.size ?? 1) - 1) * smooth(clamp(swingNow.t, 0, 1))).toFixed(3)}) translate(${(-staff.gripX).toFixed(2)} ${(-staff.gripY).toFixed(2)})`
          : `translate(${handX.toFixed(2)} ${handY.toFixed(2)}) rotate(${staff.angle.toFixed(1)}) translate(${(-staff.gripX).toFixed(2)} ${(-staff.gripY).toFixed(2)})`)
        : rig ? `translate(${anchorX.toFixed(2)} ${anchorY.toFixed(2)}) rotate(${a.toFixed(1)}) translate(${(-heldItem.kick - pivX).toFixed(2)} ${(-pivY).toFixed(2)})`
        : `${heldItem.atHand && !swingNow ? `translate(${handX} ${handY}) ` : ''}rotate(${a.toFixed(1)})${at} translate(${(-(heldItem.atHand && !swingNow ? 0 : heldItem.kick)).toFixed(1)} 0)` )
      if (throwTransition.active() && heldItem.throwing && !swingNow && consumable?.progress === undefined) {
        const angle = consumable ? consumableAngle : a
        const atHand = !!consumable || heldItem.atHand
        const x = atHand ? handX : -heldItem.kick * Math.cos(angle / DEG)
        const y = atHand ? handY : -heldItem.kick * Math.sin(angle / DEG)
        const animated = throwTransition.sample({ x, y, angle, handX: x, handY: y }, frameNow, R.throwPoseSpeed)
        el.held.setAttribute('transform', `translate(${animated.x} ${animated.y}) rotate(${animated.angle})`)
        handX = animated.handX; handY = animated.handY; wingToHand()
      }
    }
    // charging the strong Correntada: the arm with the chain goes back and up, shaking when full
    if (bareCharge !== null && !heldItem && !swingNow && (species ?? lookSpecies) === 'pig') {
      const c = smooth(bareCharge), shake = bareCharge >= 1 ? Math.sin(frameNow / 30) * 3 : 0
      el.wing.setAttribute('transform', rot('wing', 105 * c + shake))
    }
    if (rig?.back) { const h = onItem(rig.back.x, rig.back.y); wingTo(el.wingBack, h.x, h.y) }
    else el.wingBack.setAttribute('transform', rot('wing', pose.wingBack * 0.9) + ` translate(${backOffset[0]} ${backOffset[1]})`)
    // the back wing holds it: moving, it takes the pose the front wing got (the item went behind her body above);
    // carried, the item is the one in the back wing's hand below. The front wing rests
    if (heldItem?.back) {
      if (back) el.wingBack.setAttribute('transform', el.wing.getAttribute('transform') ?? '')
      else el.held.style.opacity = '0'
      el.wing.setAttribute('transform', rot('wing', pose.wing))
    }
    // a second one of the staff in the back wing's hand, carried like the first
    const off = staff && heldItem?.off ? heldItem.off : null
    if (!!off !== heldOffOn) { heldOffOn = !!off; el.heldOff.style.display = off ? '' : 'none' }
    if (off) {
      if (heldOffSvg !== heldSvg) { heldOffSvg = heldSvg; el.heldOff.innerHTML = heldSvg }
      el.heldOff.setAttribute('transform', `translate(${armTip.x} ${armTip.y}) rotate(${off.angle.toFixed(1)}) translate(${(-off.gripX).toFixed(2)} ${(-off.gripY).toFixed(2)})`)
    }
    // Ken's Rabada: the tail sweeps down and forward, under her, and back
    if (arms) {
      // the strong blow (charging and swinging) goes with the other hand: with an item, or Pig's chain (Ken's own
      // strong blow is the tail). The wing and the item move to that arm's shoulder, so the blow turns around it
      const heavy = !!swingNow?.heavy || !!heldItem?.charging || (bareCharge !== null && !heldItem)
      const handBlow = heavy && !(!heldItem && (species ?? lookSpecies) === 'fox')
      otherHand += ((handBlow ? 1 : 0) - otherHand) * Math.min(1, frameDt * 14)
      if (otherHand < 0.002) otherHand = 0
      const backHolds = !!heldItem?.swap !== handBlow
      const sx = (arms.back.shoulder[0] - arms.front.shoulder[0]) * otherHand, sy = (arms.back.shoulder[1] - arms.front.shoulder[1]) * otherHand
      el.heldPivot.setAttribute('transform', `translate(${(heldBase[0] + sx).toFixed(2)} ${(heldBase[1] + sy).toFixed(2)})`)
      if (otherHand > 0) el.wing.setAttribute('transform', `translate(${sx.toFixed(2)} ${sy.toFixed(2)}) ${el.wing.getAttribute('transform') ?? ''}`)
      const map = (node: SVGGraphicsElement, x: number, y: number): [number, number] => {
        const m = node.transform.baseVal.consolidate()?.matrix
        return m ? [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f] : [x, y]
      }
      const tipOf = (node: SVGGraphicsElement) => map(node, armTip.x, armTip.y)
      // a point of the held item's drawing, where it is drawn this frame
      const itemPt = (x: number, y: number) => { const [hx, hy] = map(el.held, x, y); return map(el.heldPivot, hx, hy) }
      const onHeld = !!heldItem && !heldItem.back && el.held.style.opacity !== '0'
      // the hand holding the item: on its touch point (a staff's grip, the hand point of the item), at the hand
      // of an item carried in it, else (no item, a blow, an item turning with the wing) where the wing's tip went.
      // The wing stretches only so far for these bodies; the arm goes to the item itself
      const main = onHeld && rig?.hand ? itemPt(rig.hand.x, rig.hand.y)
        : onHeld && staff ? itemPt(staff.gripX, staff.gripY)
        : onHeld && (heldItem?.atHand || consumable) && !swingNow ? map(el.heldPivot, handX, handY)
        : tipOf(el.wing)
      // the other hand: on the item's second touch point (or the item it holds), on a staff's second hand point
      // (carried or swinging with it), else resting where it was drawn
      const second = onHeld && rig?.back ? itemPt(rig.back.x, rig.back.y)
        : heldItem?.back ? tipOf(el.wingBack)
        : onHeld && staff?.grip2 ? itemPt(staff.grip2.x, staff.grip2.y) : null
      // "Segurar com a outra mão": the back arm takes the item and the front one is the second hand (the strong blow
      // turns it round once more)
      const f = backHolds ? second ?? arms.front.rest : main
      const b = backHolds ? main : second ?? arms.back.rest
      el.armF.innerHTML = armMarkup(arms.front, f[0], f[1])
      el.armB.innerHTML = armMarkup(arms.back, b[0], b[1])
    }
    // Ken's Planagem (gliding, Jump held in the air): the tail raised and spinning like a rotor
    const rotor = (species ?? lookSpecies) === 'fox' && S.state === 'fly'
    rotorT = rotor ? rotorT + frameDt : 0
    if (rotor) {
      const [tx, ty] = PIV.tail, c = Math.cos(rotorT * 22)
      el.tail.setAttribute('transform', `${rot('tail', 150)} translate(${tx} ${ty}) scale(${((0.25 + 0.75 * Math.abs(c)) * (c < 0 ? -1 : 1)).toFixed(3)} 1) translate(${-tx} ${-ty})`)
    } else if (tailBlow()) {
      // the Rabada: the tail swings from its rest to point where the blow goes (it rests pointing back and down)
      const target = rigAngle(swingNow!.angle * DEG), turnTo = ((((target - TAIL_REST_DEG) % 360) + 540) % 360) - 180
      el.tail.setAttribute('transform', rot('tail', turnTo * smooth(clamp(swingNow!.t, 0, 1))))
    } else if (bareCharge !== null && (species ?? lookSpecies) === 'fox') {
      // charging the strong Rabada: the tail cocks up behind him, shaking when full
      const c = bareCharge, shake = c >= 1 ? Math.sin(frameNow / 30) * 3 : 0
      el.tail.setAttribute('transform', rot('tail', 70 * smooth(c) + shake))
    } else el.tail.setAttribute('transform', rot('tail', pose.tail * tailSwing))
    const legShift = `translate(0 ${(pose.shiftY || 0).toFixed(2)})`
    el.wrapF.setAttribute('transform', `translate(${legDx.F} 0) ${legShift}`); el.wrapB.setAttribute('transform', `translate(${legDx.B} 0) ${legShift}`)
    ;(['F', 'B'] as const).forEach(k => { ['leg', 'tib', 'shin', 'toe'].forEach(b => { el[b + k].setAttribute('transform', rot(b + k, pose[b + k])) }) })
    el.lid.setAttribute('ry', (5.4 * pose.lid).toFixed(2))
    el.lid.setAttribute('cy', (eyeAt.y - 5.4 + 5.4 * pose.lid).toFixed(2))
    // Stick/touch aim takes priority over a mouse left elsewhere on the page.
    let px = 1.4, py = 0
    // a bot (a chick) does not watch the mouse
    if (game.lookAngle != null || (pointer && !bot)) {
      const r = game.lookAngle == null ? el.sclera.getBoundingClientRect() : null
      let dx = game.lookAngle != null ? Math.cos(game.lookAngle) * 100 : pointer!.x - (r!.left + r!.width / 2)
      const dy = game.lookAngle != null ? Math.sin(game.lookAngle) * 100 : pointer!.y - (stageY(r!.top) + r!.height / 2)
      dx *= S.face
      const a = -(pose.body + pose.neck + pose.head + va * S.face) / DEG
      const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a)
      const len = Math.hypot(rx, ry) || 1, m = 2.1 * Math.min(1, len / 24)
      px = rx / len * m; py = ry / len * m
    }
    el.pupil.setAttribute('cx', (eyeAt.x + px).toFixed(2)); el.pupil.setAttribute('cy', (eyeAt.y + py).toFixed(2))
    const fy = S.cl ? groundY : floorBelow(S.x, S.y)
    const shrink = Math.max(0.35, 1 - Math.max(0, fy - S.y) / 400)
    el.shadow.setAttribute('opacity', S.cl ? '0' : '0.35')
    el.shadow.setAttribute('cx', S.x.toFixed(1)); el.shadow.setAttribute('cy', (fy + 2).toFixed(1))
    el.shadow.setAttribute('rx', (58 * s * shrink).toFixed(1)); el.shadow.setAttribute('ry', (6 * s * shrink).toFixed(1))
  }

  let last = performance.now(), raf = 0, tagT = 0
  // ---------- remote (an online player's chicken) ----------
  let remote: (() => ChickenRemote | null) | null = null
  function remoteStep(dt: number) {
    const t = remote?.()
    // her browser says she is in a portal (the page started it while answering): the portal draws her from now on
    if (portalEntry) { renderPortal(frameNow); return }
    if (!t) { render(); return }
    if (t.cling != null) { remoteCling(dt, t); return }
    if (S.cl) {
      // she let go: back to an upright frame where she was on the surface
      startTurn(); S.x = S.cl.px; S.y = S.cl.py; S.cl = null; plantFeet()
    }
    const dx = t.x - S.x, dy = t.y - S.y
    // a portal or a late join jumps; otherwise she glides toward the latest position
    if (Math.hypot(dx, dy) > REMOTE_SNAP * R.scale) { S.x = t.x; S.y = t.y; plantFeet() }
    else { const k = 1 - Math.exp(-dt * 18); S.x += dx * k; S.y += dy * k }
    S.vx = t.vx / Math.max(0.0001, movementFactor()); S.vy = t.vy
    if (t.face !== S.face) { S.face = t.face < 0 ? -1 : 1 }
    const airPrepare = t.state === 'shockingAirPrepare', airRelease = t.state === 'shockingAirRelease'
    const st = airPrepare || airRelease ? 'jump' : REMOTE_STATE[t.state] ?? t.state
    S.shocking = airPrepare
    shockingAirElapsed = airPrepare ? shockingAirElapsed + dt : 0
    shockingAirReleaseTime = airRelease ? .3 : 0
    S.grounded = !['jump', 'fly', 'fastFall', 'held'].includes(st)
    S.held = st === 'held'
    S.state = st
    const speed = Math.abs(t.vx)
    updateFeet(dt, st, speed)
    animate(dt, st, st === 'lookUp', speed)
  }

  // Clinging on the other screen: the same rotated frame as a local cling (S.cl: contact point and surface angle;
  // S.x her distance along the surface's direction), turning smoothly onto each new surface
  function remoteCling(dt: number, t: ChickenRemote) {
    const phi = t.cling!
    if (S.face !== (t.face < 0 ? -1 : 1)) S.face = t.face < 0 ? -1 : 1
    let c = S.cl
    const turned = !c || Math.abs(((phi - c.phi) % TAU + TAU * 1.5) % TAU - Math.PI) > 0.03
    if (!c) c = S.cl = { px: t.x, py: t.y, phi, tilt: 0, n: [0, 0] }
    if (turned) startTurn()
    const dx = t.x - c.px, dy = t.y - c.py
    if (Math.hypot(dx, dy) > REMOTE_SNAP * R.scale) { c.px = t.x; c.py = t.y }
    else { const k = 1 - Math.exp(-dt * 18); c.px += dx * k; c.py += dy * k }
    c.phi = phi
    c.n = [Math.sin(phi), -Math.cos(phi)]
    const sin = Math.sin(phi)
    c.tilt = Math.abs(sin) < 0.05 ? 0 : -Math.sign(S.face * sin) * R.clingTilt
    S.x = c.px * Math.cos(phi) + c.py * Math.sin(phi); S.y = c.py
    if (turned) plantFeet()
    S.vx = t.vx; S.vy = 0
    S.shocking = false; shockingAirElapsed = 0; shockingAirReleaseTime = 0
    S.grounded = true; S.held = false
    const st = t.state === 'cling' ? 'cling' : REMOTE_STATE[t.state] ?? t.state
    S.state = st
    const speed = Math.abs(t.vx)
    updateFeet(dt, st, speed)
    animate(dt, st, st === 'lookUp', speed)
  }

  function frame(now: number) {
    frameNow = now
    // in a Zona's slow motion all she does (moves, animations, timers) takes that share of the frame; another
    // browser's chicken moves as her own browser says
    const dt = Math.min(1 / 30, (now - last) / 1000) * (remote ? 1 : zoneTime); last = now; frameDt = dt
    tagT -= dt; if (tagT <= 0) { tagBoxes(); tagT = 0.5 }
    // an online player's chicken in a portal: her browser is still asked (it says when she is out), the portal draws her
    if (portalEntry) { remote?.(); if (portalEntry) renderPortal(now) }
    else if (remote) remoteStep(dt)
    else if (!isChickenControlsListening()) step(dt); else render()
    if (!portalEntry && !remote) stepHealth(dt)
    raf = requestGameFrame(frame)
  }
  tagBoxes()
  // a random x in [12%, 88%] of the width outside the avoided spans (the plain range if they cover it all)
  function dropX() {
    let free: [number, number][] = [[W * 0.12, W * 0.88]]
    for (const [a, b] of opts.dropAvoid?.(W) ?? []) {
      free = free.flatMap(([l, r]): [number, number][] => b <= l || a >= r ? [[l, r]] : [[l, Math.min(r, a)], [Math.max(l, b), r]]).filter(([x, y]) => y - x > 1)
    }
    const total = free.reduce((t, [l, r]) => t + r - l, 0)
    if (!total) return W * (0.12 + Math.random() * 0.76)
    let k = Math.random() * total
    for (const [l, r] of free) { if (k <= r - l) return l + k; k -= r - l }
    return free[0][0]
  }
  // entrance: falls from above the screen at a random horizontal spot
  // (never above a spot the page asks to avoid, such as the portal: landing in it would leave the screen)
  if (opts.dropIn) fallFrom(dropX(), -160 * R.scale, 0, 0)
  raf = requestGameFrame(frame)

  // her shoulder (the item's pivot) on the screen, from the drawn rig
  function shoulder() {
    const m = rigMatrix(el.heldPivot)
    return m ? { x: m.e, y: m.f } : { x: S.x, y: S.y - 112 * R.scale }
  }

  function movementFactor() {
    const throwing = (game.throwHeld || game.throwCharging) && !S.cl && !S.held ? clamp(1 - (S.grounded ? R.throwGroundStop : R.throwAirStop) / 100, 0, 1) : 1
    const preparing = S.shocking ? clamp(1 - (S.grounded ? R.shockingGroundStop : R.shockingAirStop) / 100, 0, 1) : 1
    return throwing * preparing
  }

  function motionState(): Omit<ChickenState, 'shoulder'> {
    return { x: S.cl ? S.cl.px : S.x, y: S.cl ? S.cl.py : S.y, angle: S.cl ? S.cl.phi : 0, vx: S.vx * movementFactor(), vy: S.vy * movementFactor(), face: S.face, scale: R.scale, grounded: !!S.grounded, state: portalEntry ? portalEntry.mode === 'arrive' ? 'portalArrival' : 'portal' : S.state, networkAnimation: !portalEntry && S.cl ? S.clingAnim ?? 'cling' : !portalEntry && !S.held && !S.cl && !S.grounded && S.shocking ? 'shockingAirPrepare' : !portalEntry && !S.held && !S.cl && !S.grounded && shockingAirReleaseTime > 0 ? 'shockingAirRelease' : undefined, held: !!S.held, width: W, height: H, groundY, species: species ?? lookSpecies, hp, maxHp: R.maxHp }
  }

  return {
    getHeldItem: () => heldItem?.itemKey ?? null,
    getAim: () => heldItem ? heldItem.angle : game.lookAngle ?? null,
    setRemote(source) {
      remote = source
      S.shocking = false; shockingAirElapsed = 0; shockingAirReleaseTime = 0; shockingAirLimitApplied = false
      // nobody on this screen drags or controls an online player's chicken
      el.root.style.pointerEvents = source ? 'none' : 'visiblePainted'
      if (source) { devices = []; S.cl = null; goal = null }
    },
    grabIsRun: () => grabRunOnly,
    isShiftHeld: () => shifts.size > 0 && (!devices || devices.includes('kb1') || devices.includes('kb2')),
    setPortalEntry(entry) {
      if (!entry) {
        if (!portalEntry) return
        portalEntry = null
        el.root.setAttribute('opacity', '1')
        el.root.style.pointerEvents = remote ? 'none' : 'visiblePainted'
        render()
        return
      }
      if (portalEntry) { portalEntry.x = entry.x; portalEntry.y = entry.y; return }
      // Keep the current pose (including an interrupted turn), with the same body
      // centre used by the portal's overlap test; physics and inputs stop now.
      const m = el.root.getCTM()
      const centre = m ? new DOMPoint(0, -80).matrixTransform(m) : { x: S.x, y: S.y - 80 * R.scale }
      portalEntry = { ...entry, mode: 'enter', start: performance.now(), duration: Math.max(1, entry.durationMs), fromX: centre.x, fromY: centre.y, dx: 0, dy: 0, transform: el.root.getAttribute('transform') || '' }
      S.vx = 0; S.vy = 0; S.airBoost = 0; S.held = false
      S.shocking = false; shockingAirElapsed = 0; shockingAirReleaseTime = 0; shockingAirLimitApplied = false
      throwTransition.reset()
      goal = null; tap = null; drag.id = null; drag.on = false
      pressed.clear(); virtTapped.clear(); gameTaps.clear(); actionTaps.clear()
      el.root.style.pointerEvents = 'none'
      renderPortal(portalEntry.start)
    },
    getPortalTransit() {
      const p = portalEntry
      if (!p) return null
      const k = clamp((performance.now() - p.start) / p.duration, 0, 1)
      return p.mode === 'enter' ? { mode: 'enter', x: p.x, y: p.y, k } : { mode: 'arrive', x: p.fromX + p.dx, y: p.fromY + p.dy, k, glide: p.glide }
    },
    arriveAtPortal(arrival) {
      throwTransition.reset()
      shockingAirElapsed = 0; shockingAirReleaseTime = 0; shockingAirLimitApplied = false
      portalEntry = null
      S.cl = null; S.plat = null; S.held = false; S.grounded = false
      S.x = arrival.x; S.y = arrival.y + 80 * R.scale
      S.vx = 0; S.vy = 0; S.airBoost = 0; S.shocking = false; S.broodLatch = false; S.sliding = false
      S.state = 'idle'; S.jumpIndex = -1; S.burst = 0; S.squash = 0; turn.t = 1
      goal = null; tap = null; drag.id = null; drag.on = false
      pressed.clear(); virtTapped.clear(); gameTaps.clear(); actionTaps.clear(); plantFeet()
      el.root.setAttribute('opacity', '1')
      render()
      portalEntry = { ...arrival, mode: 'arrive', start: performance.now(), duration: Math.max(1, arrival.durationMs), fromX: arrival.x, fromY: arrival.y, dx: 0, dy: 0, transform: el.root.getAttribute('transform') || '' }
      el.root.style.pointerEvents = 'none'
      renderPortal(portalEntry.start)
    },
    setGroundHeight(h) {
      if (h === opts.groundHeight) return
      opts.groundHeight = h; groundY = H - h
      if (S.grounded && !S.plat && !S.cl) S.y = groundY
    },
    setZoneEffects(fx) {
      zoneGravity = Number.isFinite(fx.gravity) && fx.gravity > 0 ? fx.gravity : 1
      zoneTime = fx.time !== undefined && Number.isFinite(fx.time) && fx.time > 0 ? Math.min(4, fx.time) : 1
      if (fx.xray !== xrayOn) { xrayOn = fx.xray; paintXray(xrayOn) }
    },
    setCameraZoom(zoom) { camZoom = Math.max(0.02, Math.min(8, zoom)); svg.style.transform = zoom === 1 ? '' : `scale(${camZoom})` },
    tapAction(action) {
      if (bot || !virtOk() || portalEntry || isChickenControlsListening()) return
      if (cancelsAutoWalk(action)) goal = null
      virtTapped.add(action); actionTaps.add(action)
    },
    setVirtual(action, on) {
      if (on && cancelsAutoWalk(action)) goal = null
      ensureAudio()
      if (on && !virt[action]) virtTapped.add(action)
      virt[action] = on
    },
    // Full snapshots remain eager; camera/contact queries need no SVG geometry.
    getState: () => ({ ...motionState(), shoulder: shoulder() }),
    getMotionState: motionState,
    hurt,
    setOnDown(fn) { onDown = fn },
    setBareCharge(c) { bareCharge = c === null ? null : clamp(c, 0, 1) },
    setMeter(fill) { meter = fill === null ? null : clamp(fill, 0, 1) },
    canPointAndClick,
    canWalkToPortal,
    walkToPortal(id, point) {
      pollPad()
      if (!canWalkToPortal() || S.held || S.cl || manualWalkInput()) return false
      const m = 40 * R.scale
      goal = { x: clamp(point.x, m, W - m), y: point.y, checkT: .3, checkX: S.x, portalId: id }
      if (R.broodStandOnMove) S.broodLatch = false
      return true
    },
    isWalkingToPortal(id) {
      // Check live input here too: portal/physics frame ordering must not beat a cancellation.
      if (goal?.portalId !== id) return false
      pollPad()
      if (!canWalkToPortal() || S.held || S.cl || manualWalkInput()) goal = null
      return goal?.portalId === id
    },
    cancelPortalWalk(id) { if (goal?.portalId === id) goal = null },
    getActions() {
      const out = {} as Record<ChickenAction, boolean>
      // a key pressed and let go between two reads still counts once
      CHICKEN_ACTIONS.forEach(a => { out[a.key] = !portalEntry && !isChickenControlsListening() && (input(a.key) || keyBinds[a.key].some(t => gameTaps.has(t)) || actionTaps.has(a.key)) })
      // Pegar with none of its own sources: only keys/buttons shared with Correr, or the on-screen Correr
      grabRunOnly = out.grab && !bot && !padOwnGrab && !(virtOk() && virt.grab)
        && !keyBinds.grab.some(t => !keyBinds.run.includes(t) && (held.has(t) || gameTaps.has(t)))
      gameTaps.clear(); actionTaps.clear()
      return out
    },
    peekActions() {
      const out = {} as Record<ChickenAction, boolean>
      pollPad()
      CHICKEN_ACTIONS.forEach(a => { out[a.key] = !portalEntry && !isChickenControlsListening() && input(a.key) })
      return out
    },
    setRoom(id) { room = id },
    peekUse(now) {
      if (portalEntry || isChickenControlsListening()) return false
      if (useSampleAt !== now) {
        useSampleAt = now
        pollPad()
        useSample = input('grab', false)
      }
      return useSample
    },
    shift(dx, dy = 0) {
      // (the portal she is sucked into is in the world too: it moves on the screen with her)
      if (portalEntry) { portalEntry.dx += dx; portalEntry.dy += dy; if (portalEntry.mode === 'enter') { portalEntry.x += dx; portalEntry.y += dy } }
      if (dy) {
        if (!S.cl) S.y += dy
        else S.cl.py += dy
        if (goal) goal.y += dy
        if (drag.on) drag.oy -= dy
        turn.y += dy
      }
      if (!dx) return
      turn.x += dx
      // clinging: the wall moved with the world and her place on it is a distance along it, so only the contact moves
      if (!S.cl) S.x += dx
      // standing on a box: the box moved with the world too, so the ride must not carry her a second time
      if (S.plat) S.platAx += dx
      Object.values(feet).forEach((f: any) => { if (f.x !== null) f.x += dx; f.from += dx; f.to += dx })
      if (headAnchor.x !== null) { headAnchor.x += dx; headAnchor.from += dx; headAnchor.to += dx; if (headAnchor.lastContact !== null) headAnchor.lastContact += dx }
      if (S.cl) S.cl.px += dx
      if (goal) { goal.x += dx; goal.checkX += dx }
      if (drag.on) drag.ox -= dx
    },
    setBounds(next) { bounds = next },
    // entering game mode drops a globe walk; the Pátio's own point-and-click (walkTo) survives the per-frame updates
    setGame(next) { Object.assign(game, next); if (next.gameMode) goal = null; showAura() },
    takeSeatLeft() { const left = seatLeft; seatLeft = false; return left },
    // she fell onto the main ground holding Brood (a slam) since the last call: said once
    takeSlam() { const s = slammed; slammed = false; return s },
    walkTo(point) {
      if (remote || portalEntry || S.held || S.cl) return
      const p = local(point.x, point.y), m = 40 * R.scale
      goal = { x: clamp(p.x, m, W - m), y: p.y, checkT: .3, checkX: S.x }
      if (R.broodStandOnMove) S.broodLatch = false
    },
    isWalking: () => !!goal && !goal.portalId,
    stopWalk() { if (goal && !goal.portalId) goal = null },
    setPeck(next) { if (!portalEntry) peckNow = next },
    setSwing(next) { swingNow = next; if (next) throwTransition.reset() },
    speciesNow: () => species ?? lookSpecies ?? 'chicken',
    inventoryLimits: () => [R.invInstruments, R.invWeapons, R.invUtilities],
    heldPoint(angle, x, y) {
      // The trajectory and release use the resting hand, not the hand pulled
      // back while charging; otherwise each frame would move the origin again.
      const hand = heldItem?.atHand && !swingNow ? rigMatrix(el.heldPivot) : null
      const r = (pose.wing + handAimAngle(rigAngle(angle * DEG))) / DEG
      const hx = armTip.dx * Math.cos(r) - armTip.dy * Math.sin(r), hy = armTip.dx * Math.sin(r) + armTip.dy * Math.cos(r)
      // an item with a rig turns around its pivot, which sits on her shoulder or mouth
      const rig = heldItem && !swingNow && !heldItem.consumable && !heldItem.atHand && !heldItem.throwing ? heldItem.rig ?? null : null
      if (rig) { x -= rig.x; y -= rig.y }
      const mouth = rig?.at === 'mouth' ? rigMatrix(el.head) : null
      const p = hand ? new DOMPoint(hx, hy).matrixTransform(hand) : mouth ? new DOMPoint(mouthAt.x, mouthAt.y).matrixTransform(mouth) : shoulder()
      const k = R.scale * pose.puff
      const c = Math.cos(angle), sn = Math.sin(angle)
      // Local down inherits the body mirror; aim alone never changes its sign.
      const yy = y * (S.face < 0 ? -1 : 1)
      return { x: p.x + k * (x * c - yy * sn), y: p.y + k * (x * sn + yy * c) }
    },
    rigPoint(point) {
      const node = point === 'neck' ? el.body : point === 'hand' ? (heldItem?.back ? el.wingBack : el.wing) : el.head
      const at = point === 'neck' ? { x: PIV.neck[0], y: PIV.neck[1] } : point === 'hand' ? armTip : CHICKEN_MOUTH
      const m = rigMatrix(node)
      const p = m ? new DOMPoint(at.x, at.y).matrixTransform(m) : shoulder()
      return { x: p.x, y: p.y }
    },
    setHeld(next) {
      if (portalEntry) return
      const changed = (next?.itemKey ?? next?.svg) !== (heldItem?.itemKey ?? heldItem?.svg) || next?.svg !== heldItem?.svg
      const ended = !!heldItem?.throwing && !next?.throwing
      if (changed || !next?.throwing || swingNow || next?.consumable?.progress !== undefined) throwTransition.reset()
      else if (next.throwing && !heldItem?.throwing && heldItem) {
        const m = el.held.transform.baseVal.consolidate()?.matrix
        const wing = (heldItem?.back ? el.wingBack : el.wing).getCTM(), pivot = el.heldPivot.getCTM()
        if (m && wing && pivot) {
          const hand = new DOMPoint(armTip.x, armTip.y).matrixTransform(wing).matrixTransform(pivot.inverse())
          throwTransition.start({ x: m.e, y: m.f, angle: Math.atan2(m.b, m.a) * DEG, handX: hand.x, handY: hand.y }, performance.now())
        }
      }
      heldItem = next
      const svgArt = next ? next.svg : ''
      if (svgArt !== heldSvg) { heldSvg = svgArt; el.heldArt.innerHTML = svgArt }
      // A different/cancelled item must have its normal pose immediately; never
      // leave the previous Throw transform attached to freshly equipped art.
      if (changed || ended) {
        const previousDt = frameDt
        frameDt = 0; render(); frameDt = previousDt
      }
    },
    impulse(vx, vy, blast = false, damage) {
      if (portalEntry || S.held) return
      if (blast) {
        // grabbed, a blow with damage only takes her off once what she took on this grab reaches the limit
        if (S.cl && damage !== undefined) {
          const hit = grabDamageStep(grabDamage, damage, R.clingDropDamage)
          grabDamage = hit.taken
          // (she flinches and holds on)
          if (!hit.drop) { S.squash = 0.5; return }
        }
        if (damage) hurt(damage, S.x - Math.sign(vx || 1) * 100)
        // how much a push moves her (Pig barely moves; in Guarda, brooding on the ground, not at all)
        const k = R.knockbackTaken * (S.grounded && S.state === 'brood' && (species ?? lookSpecies) === 'pig' ? 0 : 1)
        if (k <= 0) { S.squash = 0.5; return }
        vx *= k; vy *= k
        leaveSeat()
        const state = { x: S.cl ? S.cl.px : S.x, y: S.cl ? S.cl.py : S.y }
        fallFrom(state.x, state.y, S.vx + vx, S.vy + vy)
        S.broodLatch = false; S.sliding = false; S.clCool = 0.3
        S.airBoost = vx
      } else {
        if (S.grounded || S.cl) return
        S.vx += vx; S.vy += vy
      }
    },
    setDevices(next) {
      if (next === devices || (next && devices && next.length === devices.length && next.every((d, i) => d === devices![i]))) return
      goal = null
      devices = next ? [...next] : null
      rebind()
      held.clear(); pressed.clear(); gameTaps.clear(); pad = {}
    },
    getDevices: () => devices,
    setArt(next) {
      if (next === ownArt) return
      ownArt = next
      paintLook(ownLook ?? config.look)
    },
    setBot(read) { bot = read; botNow = {}; held.clear(); pressed.clear(); goal = null },
    setSpecies(next) {
      if ((next ?? 'chicken') === (species ?? 'chicken')) return
      species = next
      resize()
    },
    setLook(next) {
      if (JSON.stringify(next) === JSON.stringify(ownLook)) return
      ownLook = next
      paintLook(next ?? config.look)
    },
    dropAt(x) { if (!portalEntry) fallFrom(clamp(x, 40 * R.scale, W - 40 * R.scale), -160 * R.scale, 0, 0) },
    placeAt(x, y, face) {
      if (portalEntry || S.held) return
      S.broodLatch = false; S.shocking = false; S.sliding = false; S.boostT = 0; S.standT = 0; prevJump = false
      fallFrom(x, y, 0, 0)
      if (face) S.face = face
    },
    setCrossKey(key) { crossKey = key },
    crossings: () => crossCount,
    destroy() {
      throwTransition.reset()
      cancelGameFrame(raf)
      unsubscribe()
      unsubscribeConfig()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onTapDown, true)
      window.removeEventListener('pointerup', onTapUp, true)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('touchmove', blockTouchMove)
      el.root.removeEventListener('touchstart', blockTouch)
      window.removeEventListener('resize', resize)
      el.root.removeEventListener('pointerdown', onRootDown)
      releaseSharedAudio()
      svg.remove()
    },
  }
}
