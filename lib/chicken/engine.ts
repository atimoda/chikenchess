// Player chicken: a rigged 2D chicken that walks, runs, jumps, flies, broods, slides, clings to walls
// and can be picked up with the pointer. Ported from the "Pátio da Caipira" prototype.
//
// It draws in its own full-screen SVG layer above the page. Colliders come from the page itself:
// every element with `data-chicken-platform` (or a direct child of `data-chicken-platforms`) is a
// floating box: its horizontal edges are one-way floors, its sides are walls she grabs when her feet
// touch them in the air with no movement control held. The screen sides are solid (rigid) walls she climbs by pushing into them, and the
// ground sits `groundHeight` px above the bottom of the viewport.
import { requestGameFrame, cancelGameFrame } from '../game-frame'
import type { PeckPose } from '../pigchicken/peck'
import { LOOK_ART, type ChickenLook } from './look-art'
import { CHICKEN_CLUCKS, CHICKEN_PARAMS, CHICKEN_PX_PARAMS, type ChickenParams } from './params'
import { getChickenConfig, subscribeChickenConfig, type ChickenConfig } from './config'
import { CHICKEN_ACTIONS, virtualActionHeld, isChickenControlsListening, readTouchMoveStick, loadChickenControls, subscribeChickenControls, type ChickenAction, type ChickenControls } from './controls'
import { directionalJumpImpulse } from './jump-impulse'
import { createThrowTransition } from './throw-transition'
import { chickenPlatformElements, chickenPlatformRects, chickenPlatformLines, chickenPlatformWalls, chickenPlatformBounce, type PlatformOcclusion } from './platform-geometry'
import { trampolineVelocity, type TrampolineParams } from '../pigchicken/trampoline'
import { allKeyTokens, keyTokensFor, padTokensFor, stickFor, type InputDeviceId } from './input-devices'
import { mixGain } from '../pigchicken/mixer'

export type ChickenState = { x: number; y: number; angle: number; shoulder: { x: number; y: number }; vx: number; vy: number; face: number; scale: number; grounded: boolean; state: string; held: boolean; width: number; height: number; groundY: number }
// Game hooks (PigChicKen's Parquinho): the screen walls move with the camera, the camera shifts her, aim can set where she faces
// accelMult scales her acceleration; accelPower > 1 eases each start (1 linear, 3 "ease-super-in": slow, then fast),
// reaching full speed in accelRamp seconds; aura draws a state on her (a consumable's effect in the Pátio)
export type ChickenAura = 'none' | 'buddha' | 'fizz'
export type ChickenGame = { gameMode?: boolean; throwHeld?: boolean; throwCharging?: boolean; aimFace?: number | null; lookAngle?: number | null; speedMult?: number; accelMult?: number; accelPower?: number; accelRamp?: number; aura?: ChickenAura }
export type ChickenEngine = {
  setVirtual: (action: ChickenAction, on: boolean) => void
  getState: () => ChickenState
  getMotionState: () => Omit<ChickenState, 'shoulder'>
  // every action held right now (keys, gamepad buttons and on-screen controls)
  getActions: () => Record<ChickenAction, boolean>
  // Only actions held NOW: no remembered taps, and no consumption (portals, pickup hints).
  peekActions: () => Record<ChickenAction, boolean>
  peekUse: (now: number) => boolean
  isShiftHeld: () => boolean
  // Freeze gameplay and shrink/fade the drawn rig into a screen-space portal centre.
  // Repeated calls update the target without restarting; null cancels the transition.
  setPortalEntry: (entry: { x: number; y: number; durationMs: number } | null) => void
  arriveAtPortal: (arrival: { x: number; y: number; durationMs: number }) => void
  // camera moved: move her (and everything she keeps in screen coordinates) by dx, dy pixels
  shift: (dx: number, dy?: number) => void
  // left and right walls in screen pixels; null = the screen edges
  setBounds: (bounds: { lo: number; hi: number } | null) => void
  // the ground's height from the bottom of the screen (the Pátio raises it on a phone held upright)
  setGroundHeight: (h: number) => void
  setGame: (game: ChickenGame) => void
  // the item in her wing: SVG art pointing right with the grip at (0, 0), in rig units; drawn in front of
  // her body and in front of the wing, turned to `angle` (screen radians), pulled back by `kick` rig units.
  // The wing turns with it: its tip follows the aim.
  // `bow`: a bow played across it (the violin), held by the wing: `x` is where it crosses the strings (rig units
  // along the item), `stroke` 0..1 how far the bow has slid (0: played at its frog, 1: at its tip)
  setHeld: (held: { svg: string; itemKey?: string; angle: number; kick: number; pull?: number; throwing?: boolean; atHand?: boolean; consumable?: { upright: number; progress?: number }; bow?: { x: number; stroke: number } | null } | null) => void
  // the melee swing: the wing turns to `angle` (screen radians) and stretches out to `reach` px from her
  // shoulder; a held item rides on the wing tip. `t` 0..1 eases the wing out and back in.
  setPeck: (peck: PeckPose | null) => void
  setSwing: (swing: { angle: number; reach: number; t: number } | null) => void
  // a point on the held item's drawing (rig units, x forward from the grip, y down) on the screen when the
  // item points at `angle` (screen radians); her shoulder for (0, 0)
  heldPoint: (angle: number, x: number, y: number) => { x: number; y: number }
  rigPoint: (point: 'hand' | 'mouth' | 'neck') => { x: number; y: number }
  // A push (px/s), e.g. recoil, only in the air by default. Blast=true also launches
  // her off the floor/wall and keeps its sideways impulse until landing.
  impulse: (vx: number, vy: number, blast?: boolean) => void
  // the input devices this chicken listens to (local players: each drives their own); null = every device
  setDevices: (devices: InputDeviceId[] | null) => void
  getDevices: () => InputDeviceId[] | null
  // her look, apart from the central configuration's (another local player's chicken); null follows the configuration
  setLook: (look: ChickenLook | null) => void
  // falls from above the screen at x (screen px): a player arriving in the lobby
  dropAt: (x: number) => void
  destroy: () => void
}

type Seg = { id: string; ax: number; ay: number; bx: number; by: number; anchorX: number; clipOffset?: number; topEdge: boolean; len: number; ang: number; wall: boolean; solid: boolean; bounce?: TrampolineParams }

const NS = 'http://www.w3.org/2000/svg'
const DEG = 180 / Math.PI
const CONSUMABLE_WING_AIM_LIMIT = 25
// leg chain (bird anatomy): hip, hidden inside the body -> knee at the belly -> ankle (bends back) -> foot joint -> toes
const LEG = { F: { hx: -14 }, B: { hx: -26 } } as const
const LF = 30, LT = 32, LS = 40, HIP_Y = -88, FOOT_Y = -3, NECK_LEN = 56
const PIV: Record<string, [number, number]> = {
  legF: [-14, -88], tibF: [-14, -58], shinF: [-14, -26], toeF: [-14, 14],
  legB: [-26, -88], tibB: [-26, -58], shinB: [-26, -26], toeB: [-26, 14],
  body: [0, -62], neck: [24, -124], head: [40, -178], wing: [14, -120], tail: [-52, -110],
}
// the wing's tip (its far back corner) seen from its pivot at the shoulder, in rig units: the swing aims it
export const CHICKEN_HAND = { x: -44, y: -92 } as const
export const CHICKEN_MOUTH = { x: 70, y: -188 } as const
const HAND_DX = CHICKEN_HAND.x - PIV.wing[0], HAND_DY = CHICKEN_HAND.y - PIV.wing[1]
const WING_TIP_DEG = Math.atan2(HAND_DY, HAND_DX) * 180 / Math.PI, WING_TIP_LEN = Math.hypot(HAND_DX, HAND_DY)
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
const AURA_MARKUP = `<g data-part="aura" style="display:none">
    <ellipse cx="0" cy="-110" rx="120" ry="140" fill="url(#chk-buddhaGlow)"><animate attributeName="opacity" values="0.75;1;0.75" dur="3.2s" repeatCount="indefinite"/></ellipse>
  </g>
  <g data-part="fizz" style="display:none">
    ${[[-62, 0, 6], [-32, 0.7, 4.5], [8, 1.5, 7], [38, 0.35, 5], [66, 1.1, 6], [-12, 1.9, 4]].map(([x, d, r]) =>
      `<circle cx="${x}" r="${r}" fill="rgba(255,255,255,0.12)" stroke="#fff3df" stroke-width="2.6" opacity="0"><animate attributeName="cy" values="-20;-210" dur="2.2s" begin="${d}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.9;0" dur="2.2s" begin="${d}s" repeatCount="indefinite"/></circle>`).join('')}
  </g>`
const HALO_MARKUP = `<g data-part="halo" style="display:none">
    <circle cx="34" cy="-204" r="34" fill="none" stroke="#ffd166" stroke-width="9" opacity="0.22"/>
    <circle cx="34" cy="-204" r="34" fill="none" stroke="#ffe08a" stroke-width="3.5" opacity="0.95"><animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" repeatCount="indefinite"/></circle>
  </g>`
const SVG_MARKUP = `
  <defs>
    <clipPath id="chk-wingClip"><path d="${LOOK_ART.WING}"/></clipPath>
    <pattern id="chk-pearlDots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.35" fill="#eef1f5"/><circle cx="5.5" cy="5.5" r="1.35" fill="#eef1f5"/></pattern>
    <radialGradient id="chk-buddhaGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.55"/><stop offset="0.6" stop-color="#ffd166" stop-opacity="0.22"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse data-part="shadow" rx="60" ry="7" fill="#000" opacity="0.35"/>
  <g data-part="root" style="pointer-events: visiblePainted; cursor: grab; touch-action: none">
    ${AURA_MARKUP}
    ${legMarkup('Back', -26)}${legMarkup('Front', -14)}
    <g data-part="body">
      <g data-part="wingBack"><g data-part="artWingBack"></g></g>
      <g data-part="tail"><g data-part="artTail"></g></g>
      <g data-part="artTorso"></g>
      <g data-part="neck"><g data-part="artNeck"></g>
        <g data-part="head">${HALO_MARKUP}<g data-part="artComb"></g><g data-part="artFace"></g><g data-part="artBeak"></g><g data-part="artWattle"></g>
          <circle data-part="sclera" cx="51" cy="-192" r="4.6" fill="#fff8e1"/>
          <circle data-part="pupil" cx="52.5" cy="-192" r="2.8" fill="#1f1a17"/>
          <ellipse data-part="lid" cx="51" cy="-197.4" rx="5.4" ry="0" fill="#f7b21b"/>
        </g>
      </g>
      <g data-part="wing"><g data-part="artWing"></g></g>
      <g data-part="heldPivot" transform="translate(14 -120)"><g data-part="held"><g data-part="heldArt"></g><g data-part="heldBow" style="display:none">${BOW_MARKUP}</g></g></g>
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
  Object.values(CHICKEN_CLUCKS).flat().forEach(name => {
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

export function createChickenEngine(host: HTMLElement, opts: { groundHeight: number; look?: ChickenLook; dropIn?: boolean; dropAvoid?: (w: number) => [number, number][]; fixedScale?: boolean }): ChickenEngine {
  sharedAudio.users++
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;touch-action:none'
  svg.innerHTML = SVG_MARKUP
  host.appendChild(svg)
  const part = (name: string) => svg.querySelector(`[data-part="${name}"]`) as SVGGraphicsElement
  const el: Record<string, SVGGraphicsElement> = {}
  ;['shadow', 'root', 'body', 'wingBack', 'tail', 'neck', 'artNeck', 'head', 'wing', 'sclera', 'pupil', 'lid', 'heldPivot', 'held', 'heldArt', 'heldBow', 'aura', 'fizz', 'halo'].forEach(n => { el[n] = part(n) })
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
  function paintLook(look: ChickenLook) {
    const A = LOOK_ART.art
    const set = (name: string, html: string | undefined) => { part(name).innerHTML = html ?? '' }
    set('artComb', A.comb[look.comb].svg); set('artFace', A.face[look.face].svg); set('artBeak', A.beak[look.beak].svg); set('artWattle', A.wattle[look.wattle].svg)
    set('artNeck', A.neck[look.neck].svg); set('artTorso', A.torso[look.torso].svg); set('artTail', A.tail[look.tail].svg); set('artWing', A.wing[look.wing].svg)
    set('artWingBack', `<path d="${LOOK_ART.WING}" fill="${A.wing[look.wing].back}"/>`)
    const legs = A.legs[look.legs]
    ;([['wrapF', legs.front], ['wrapB', legs.back]] as const).forEach(([w, c]) => {
      el[w].querySelectorAll('.c-drum').forEach(p => p.setAttribute('stroke', c.drum))
      el[w].querySelectorAll('.c-shank').forEach(p => p.setAttribute('stroke', c.shank))
    })
    el.lid.setAttribute('fill', A.face[look.face].lid ?? '#f7b21b')
    tailSwing = A.tail[look.tail].swing ?? 1
  }
  // central configuration (config.ts): params and look follow it live, including the Pátio's draft
  let config: ChickenConfig = getChickenConfig()
  let ownLook = opts.look ?? null
  paintLook(ownLook ?? config.look)

  // ---------- params (scaled down on small screens, except in a fixed-size world such as the Pátio's) ----------
  const R = { ...CHICKEN_PARAMS, ...config.params } as ChickenParams
  let W = window.innerWidth, H = window.innerHeight, groundY = H - opts.groundHeight
  function resize() {
    rigMatrices.clear()
    W = window.innerWidth; H = window.innerHeight; groundY = H - opts.groundHeight
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    // fixedScale: a world in fixed units (PigChicKen): she is the same size on every screen, like everything else
    const vf = opts.fixedScale ? 1 : clamp(Math.min(W, H) / 800, 0.55, 1)
    const P = { ...CHICKEN_PARAMS, ...config.params }
    Object.assign(R, P)
    CHICKEN_PX_PARAMS.forEach(k => { (R as any)[k] = (P as any)[k] * vf })
    R.scale = P.scale * vf
    if (S.grounded && !S.plat && !S.cl) S.y = groundY
    S.x = clamp(S.x, 40 * R.scale, W - 40 * R.scale)
  }

  // ---------- controls ----------
  let controls: ChickenControls = loadChickenControls()
  const unsubscribe = subscribeChickenControls(c => { controls = c; rebind() })
  const held = new Set<string>(), pressed = new Set<string>(), gameTaps = new Set<string>()
  const shifts = new Set<string>()
  const virt: Partial<Record<ChickenAction, boolean>> = {}, virtTapped = new Set<ChickenAction>()
  let pad: Partial<Record<ChickenAction, boolean>> = {}
  // the devices she listens to (null: all of them) and, from them, the keys of each action
  let devices: InputDeviceId[] | null = null
  let keyBinds = {} as Record<ChickenAction, string[]>, usedKeys = new Set<string>()
  const rebind = () => {
    CHICKEN_ACTIONS.forEach(a => { keyBinds[a.key] = keyTokensFor(controls, a.key, devices) })
    usedKeys = allKeyTokens(controls, devices)
  }
  rebind()
  const virtOk = () => !devices || devices.includes('touch') || devices.includes('mouse')
  const input = (a: ChickenAction, touchRunGrab = controls.touchRunGrab) => keyBinds[a].some(t => held.has(t)) || !!pad[a] || (virtOk() && virtualActionHeld(virt, a, touchRunGrab))
  const tapped = (a: ChickenAction) => keyBinds[a].some(t => pressed.has(t)) || (virtOk() && virtTapped.has(a))
  const usedKey = (tok: string) => usedKeys.has(tok)
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shifts.add(e.code)
    ensureAudio()
    if (isChickenControlsListening() || isTextField(e.target) || (e.target as HTMLElement | null)?.closest?.('[role="dialog"], [role="alertdialog"]')) return
    const tok = 'Key:' + e.code
    if (!usedKey(tok)) return
    e.preventDefault()
    const t = e.target as HTMLElement | null
    if (t && t !== document.body && t.blur) t.blur()
    if (!e.repeat) { pressed.add(tok); gameTaps.add(tok) }
    held.add(tok)
  }
  const onKeyUp = (e: KeyboardEvent) => { held.delete('Key:' + e.code); shifts.delete(e.code) }
  const onBlur = () => { held.clear(); shifts.clear(); Object.keys(virt).forEach(k => { virt[k as ChickenAction] = false }) }
  let pointer: { x: number; y: number } | null = null
  const onPointerMove = (e: PointerEvent) => { pointer = { x: e.clientX, y: e.clientY }; moveDrag(e) }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  window.addEventListener('pointermove', onPointerMove)
  function pollPad() {
    const on = padTokensFor(devices, controls.analog.deadzoneL)
    pad = {}
    CHICKEN_ACTIONS.forEach(a => { pad[a.key] = controls.pad[a.key].some(t => t && on.has(t)) })
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
    if (!v || !actx || !controls.sound || R.volume <= 0) return
    const cats = v === 'all' ? Object.keys(CHICKEN_CLUCKS).filter(c => (R as any)['snd_' + c]) : [v]
    const ready = (c: string) => (CHICKEN_CLUCKS[c] || []).filter(n => buffers[n])
    // byType: draw the type first, so every type has the same chance however many samples it has
    const types = R.byType ? cats.filter(c => ready(c).length) : cats
    let pool = R.byType ? ready(types[Math.floor(Math.random() * types.length)] ?? '') : cats.flatMap(ready)
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
  let heldItem: Parameters<ChickenEngine['setHeld']>[0] = null, heldSvg = ''
  const throwTransition = createThrowTransition()
  let peckNow: PeckPose | null = null
  let swingNow: { angle: number; reach: number; t: number } | null = null
  // screen angle (degrees) -> her rig: undo the root's turn, the mirror when facing left, and the body's lean
  const rigAngle = (screenDeg: number) => {
    let a = screenDeg - vis.a
    if (S.face < 0) a = 180 - a
    a -= pose.body
    return ((a % 360) + 540) % 360 - 180
  }
  const handAimAngle = (angle: number) => heldItem?.consumable && !swingNow && !(heldItem.pull && heldItem.pull > 0) ? clamp(angle, -CONSUMABLE_WING_AIM_LIMIT, CONSUMABLE_WING_AIM_LIMIT) : angle
  let bounds: { lo: number; hi: number } | null = null
  const game: Required<ChickenGame> = { gameMode: false, throwHeld: false, throwCharging: false, aimFace: null, lookAngle: null, speedMult: 1, accelMult: 1, accelPower: 1, accelRamp: 0.5, aura: 'none' }
  let auraShown: ChickenAura = 'none'
  function showAura() {
    if (game.aura === auraShown) return
    auraShown = game.aura
    el.aura.style.display = auraShown === 'buddha' ? '' : 'none'
    el.halo.style.display = 'none'
    el.fizz.style.display = auraShown === 'fizz' ? '' : 'none'
  }
  const wallLo = () => bounds ? bounds.lo : 0, wallHi = () => bounds ? bounds.hi : W

  // ---------- simulation state ----------
  const S: any = { x: W * 0.5, y: groundY, vx: 0, vy: 0, face: 1, grounded: true, jumpIndex: -1, state: 'idle', flapPhase: 0, burst: 0, squash: 0, boostT: 0, sliding: false, runIntent: false, plat: null, platAx: 0, cl: null, held: false }
  const pose: any = { tibF: 0, tibB: 0, toeF: 0, toeB: 0, sway: 0, bob: 0, body: 0, neck: 0, head: 0, wing: 0, wingBack: 0, tail: 0, legF: 0, shinF: 0, legB: 0, shinB: 0, sink: 0, legSink: 0, lid: 0, puff: 1, ik: 1, shiftY: 0 }
  const idle = { next: 1, neck: 0, head: 0 }
  const blink = { next: 2, t: -1 }
  let portalEntry: { mode: 'enter' | 'arrive'; x: number; y: number; start: number; duration: number; fromX: number; fromY: number; dx: number; dy: number; transform: string } | null = null
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
  function step(dt: number) {
    pollPad()
    const Lh = input('left'), Rh = input('right'), U = input('up'), Dk = input('down'), C = input('crouch'), J = input('jump'), RUN = input('run')
    let jumpPressed = (J && !prevJump) || (tapped('jump') && !(J && prevJump))
    const crouchPressed = tapped('crouch') || (C && !S.prevCrouch)
    const downPressed = (Dk && !S.prevD) || tapped('down')
    prevJump = J; S.prevCrouch = C; pressed.clear(); virtTapped.clear()
    // Releasing Brood at rest latches it. Chickens keep this pose until Brood again, Jump or Run with a direction;
    // other bird profiles can opt into the previous automatic stand-up behavior.
    const others = Lh || Rh || U || C || J || RUN
    const leaveBrood = R.broodStandOnMove ? others : jumpPressed || (RUN && Lh !== Rh)
    if (S.broodLatch && (leaveBrood || S.held || S.cl || !S.grounded)) S.broodLatch = false
    // pressing brood again while latched gets her up into the normal idle (until brood is released)
    if (S.broodLatch && downPressed) { S.broodLatch = false; S.broodOff = true }
    if (S.prevD && !Dk && !others && S.grounded && !S.held && !S.cl && !S.broodOff) S.broodLatch = true
    if (!Dk) S.broodOff = false
    S.prevD = Dk
    const D = (Dk && !S.broodOff) || S.broodLatch
    // Shocking jump: hold Jump with Brood to prepare, then release Jump to
    // launch. Releasing Brood first cancels; normal jumps still fire on press.
    if (S.shocking && !Dk) S.shocking = false
    if (jumpPressed && D && !S.cl && !S.held) { S.shocking = true; jumpPressed = false }
    if (S.shocking && !J) { S.shocking = false; jumpPressed = Dk }
    const inputDir = (Rh ? 1 : 0) - (Lh ? 1 : 0)
    let dir = inputDir
    // point-and-click: any control of her own cancels the walk to the clicked spot
    if (goal && (dir !== 0 || J || Dk || C || U || S.held || S.cl)) goal = null
    const auto = !!goal && goalStep(dt)
    if (auto && !game.throwHeld) dir = Math.sign(goal!.x - S.x)
    buildSegs(); heldDir = dir
    S.clCool = Math.max(0, (S.clCool || 0) - dt); S.dropT = Math.max(0, (S.dropT || 0) - dt);
    if (S.held) { heldStep(dt); return }
    if (S.cl) { clingStep(dt, dir, (U ? 1 : 0) - (D || C ? 1 : 0), jumpPressed, RUN); return }
    // floating walls grab only while no movement control is held
    S.noGrab = Lh || Rh || U || Dk || C || J || RUN
    // standing on a floating edge: ride along when it moves, fall when walking off its end
    if (S.grounded && S.plat) {
      let sg = segById(S.plat), fy = sg ? floorY(sg, S.x) : null
      // walking off one piece of a shaped floor onto the next one (they share the element's id)
      if (sg && fy === null && sg.id.includes(':l')) {
        const base = sg.id.slice(0, sg.id.lastIndexOf(':l'))
        const next = SEGS.find(o => o !== sg && !o.wall && o.id.startsWith(base + ':l') && (() => { const y = floorY(o, S.x); return y !== null && Math.abs(y - S.y) < 10 })())
        if (next) { sg = next; fy = floorY(next, S.x); S.plat = next.id; S.platAx = next.anchorX }
      }
      if (!sg || fy === null) { S.grounded = false; S.plat = null; S.vy = 0; S.jumpIndex = 0 }
      else {
        const dx = sg.anchorX - S.platAx, dy = fy - S.y; S.platAx = sg.anchorX
        if (dx) { S.x += dx; Object.values(feet).forEach((f: any) => { if (f.x !== null) f.x += dx; f.from += dx; f.to += dx }); if (headAnchor.x !== null) headAnchor.x += dx }
        S.y += dy
      }
    }
    const motionDt = dt * movementFactor()
    const speed0 = Math.abs(S.vx)
    const brooding = S.grounded && D
    // walking while brooding: a share of the walk speed (0 keeps her still)
    const broodWalking = brooding && dir !== 0 && R.broodWalk > 0
    // slide starts when crouching out of a run
    if (S.grounded && crouchPressed && !brooding && speed0 > R.walkSpeed * 1.1) S.sliding = true
    // landing from the air with crouch held and at least the slide's minimum speed goes straight into the slide
    if (S.grounded && S.justLanded && C && !brooding && speed0 >= R.slideMinSpeed) S.sliding = true
    S.justLanded = false
    if (S.sliding && (!C || !S.grounded || speed0 < R.slideMinSpeed || brooding)) S.sliding = false
    const crouching = S.grounded && C && !brooding && !S.sliding
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
    const facingDir = game.throwHeld ? inputDir : dir
    if ((!brooding && !S.sliding) || game.throwHeld) {
      if (facingDir !== 0) S.face = facingDir
      if (game.aimFace) S.face = game.aimFace
    }

    S.standT = Math.max(0, (S.standT || 0) - dt)

    // on a floating floor, brood + jump drops through it; so does down (crouch) + jump with no sideways direction
    // held (with a direction it is the normal super jump up)
    const plat = S.grounded && S.plat ? segById(S.plat) : null
    if (jumpPressed && plat && !plat.solid && (D || (C && dir === 0))) {
      S.dropId = plat.id; S.dropT = 0.3; S.grounded = false; S.plat = null; S.sliding = false
      S.vy = 60; S.jumpIndex = 0; S.y += 2; plantFeet(); sfx('dropThrough')
    } else if (jumpPressed) {
      const fromGround = S.grounded
      S.jumpIndex = S.grounded ? 0 : S.jumpIndex + 1
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
        const direction = stick ? { x: stick.x * stick.mag, y: stick.y * stick.mag } : { x: inputDir, y: (downDirection ? 1 : 0) - (U ? 1 : 0) }
        const impulse = directionalJumpImpulse(direction, boost, R.broodJumpVerticalBoost)
        S.airBoost = impulse.x
        S.vy += impulse.y
      } else S.airBoost = (dir !== 0 ? dir * R.jumpPush : 0) + hd * boost
      S.vx += S.airBoost
      S.burst = flaps / Math.max(1, R.jumpFlapRate)
      sfx(kind)
    }

    // vertical
    let mode: string | null = null
    if (!S.grounded) {
      let g = R.gravity, term = R.terminalVelocity
      if (D) { g *= R.fastFall; term *= R.fastFall; mode = 'fastFall' }
      else if (J && !jumpPressed) { mode = 'fly'; if (S.vy > 0) { g /= R.flyFallDivisor; term /= R.flyFallDivisor } }
      S.vy = Math.min(term, S.vy + g * motionDt)
      const prevY = S.y
      S.y += S.vy * motionDt
      // floating floors are one-way: land on the highest one crossed while falling (holding down goes through)
      if (S.vy > 0) {
        let best: { sg: Seg; y: number } | null = null
        SEGS.forEach(sg => {
          if (sg.wall || (S.dropT > 0 && sg.id === S.dropId) || (!sg.solid && (D || C))) return
          const fy = floorY(sg, S.x)
          if (fy !== null && fy < groundY && prevY <= fy + 0.5 && S.y >= fy && (!best || fy < best.y)) best = { sg, y: fy }
        })
        if (best) land((best as { sg: Seg; y: number }).y, (best as { sg: Seg; y: number }).sg)
      }
      if (S.y >= groundY && S.vy >= 0) land(groundY, null)
    }
    S.x += S.vx * motionDt
    const margin = 40 * R.scale
    if (S.x < wallLo() + margin) { S.x = wallLo() + margin; S.vx = 0 }
    if (S.x > wallHi() - margin) { S.x = wallHi() - margin; S.vx = 0 }

    if (S.grounded && !S.sliding && (!brooding || broodWalking) && !crouching && dir !== 0) stepUp()
    // walking to a clicked spot never grabs the screen walls
    if (!S.shocking && tryCling(auto ? 0 : dir, U)) return
    const speed = Math.abs(S.vx) * movementFactor()
    let st: string
    if (!S.grounded) st = mode || 'jump'
    else if (brooding) st = 'brood'
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
  function buildSegs() {
    const out: Seg[] = []
    let source: Element | undefined, mask: PlatformOcclusion | undefined
    const add = (id: string, ax: number, ay: number, bx: number, by: number, solid = false, floor = false, climbable = false, bounce?: TrampolineParams) => {
      const len = Math.hypot(bx - ax, by - ay); if (len < 4) return
      const a = ((Math.atan2(by - ay, bx - ax) * DEG) % 180 + 180) % 180
      const wall = climbable || (!floor && Math.min(a, 180 - a) > 45)
      const topEdge = id.endsWith(':top')
      const visible = mask && source && mask.clip(source, id, mask.depth, ax - mask.x, ay - mask.y, bx - mask.x, by - mask.y)
      if (!visible) {
        out.push({ id, ax, ay, bx, by, anchorX: ax, topEdge, len, ang: a, wall, solid, bounce })
        return
      }
      const dx = bx - ax, dy = by - ay
      visible.forEach(([from, to], i) => {
        const partLen = len * (to - from)
        if (partLen < 4) return
        out.push({
          id: i === 0 ? id : `${id}~${i}`, ax: ax + dx * from, ay: ay + dy * from,
          bx: ax + dx * to, by: ay + dy * to, anchorX: ax, clipOffset: from * len, topEdge, len: partLen, ang: a, wall, solid, bounce,
        })
      })
    }
    let n = 0
    chickenPlatformRects(frameNow).forEach(({ el: e, rect: r, occlusion }) => {
      source = e; mask = occlusion
      const node = e as HTMLElement
      if (r.width < 8 || r.height < 8) return
      // A local player can be outside the main camera. Cull shaped surfaces relative to this actor.
      if (node.dataset.chickenNearby !== undefined) {
        if (!S.cl && (r.right < S.x - 300 || r.left > S.x + 300 || r.bottom < S.y - 300 || r.top > S.y + 300)) return
      } else if (r.bottom < 0 || r.top > H) return
      const id = node.dataset.chickenId || node.id || `box${n++}`
      const bounce = chickenPlatformBounce(e)
      if (bounce) {
        if (r.top < groundY - 4) add(id + ':bounce', r.left, r.top, r.right, r.top, false, true, false, bounce)
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
              add(`${id}:w${group}:${i}`, r.left + ax, r.top + ay, r.left + bx, r.top + by, true, false, true)
            }
          }
        })
        lines?.forEach((line, group) => {
          for (let i = 1; i < line.length; i++) {
            const [ax, ay] = line[i - 1], [bx, by] = line[i]
            if (ax !== bx && r.top + Math.max(ay, by) < groundY - 4) {
              add(`${id}:l${group ? `${group}:` : ''}${i}`, r.left + ax, r.top + ay, r.left + bx, r.top + by, false, true)
            }
          }
        })
        return
      }
      if (r.top < groundY - 4) add(id + ':top', r.left, r.top, r.right, r.top)
      if (r.bottom < groundY - 4) add(id + ':bottom', r.left, r.bottom, r.right, r.bottom)
      const yb = Math.min(r.bottom, groundY)
      if (yb - r.top > 8) { add(id + ':left', r.left, r.top, r.left, yb); add(id + ':right', r.right, r.top, r.right, yb) }
    })
    mask = undefined
    add('screen:left', wallLo(), 0, wallLo(), groundY, true); add('screen:right', wallHi(), 0, wallHi(), groundY, true)
    SEGS = out
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
  function floorY(sg: Seg, x: number) {
    const x0 = Math.min(sg.ax, sg.bx), x1 = Math.max(sg.ax, sg.bx)
    if (x < x0 || x > x1) return null
    return sg.bx === sg.ax ? Math.min(sg.ay, sg.by) : sg.ay + (sg.by - sg.ay) * (x - sg.ax) / (sg.bx - sg.ax)
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
    S.cl = null; S.plat = null; S.grounded = false; S.jumpIndex = 0; S.airBoost = 0
    S.x = x; S.y = y; S.vx = vx; S.vy = vy; plantFeet(); headAnchor.x = null
  }

  // walls: solid ones grab when pushing toward them; floating ones when her feet touch them in the
  // air while no movement control is held
  function tryCling(dir: number, up = false) {
    const bodyY = S.y - 40 * R.scale, footY = S.y - 4 * R.scale
    for (const sg of SEGS) {
      if (!sg.wall || (S.clCool > 0 && sg.id === S.clLast)) continue
      const climbFromGround = up && S.grounded
      if (!sg.solid && !climbFromGround && (S.grounded || S.noGrab)) continue
      const py = sg.solid || climbFromGround ? bodyY : footY, reach = (sg.solid || climbFromGround ? 46 : 24) * R.scale
      if (py < Math.min(sg.ay, sg.by) || py > Math.max(sg.ay, sg.by)) continue
      const wx = sg.ax + (sg.bx - sg.ax) * (py - sg.ay) / ((sg.by - sg.ay) || 1e-6)
      const dx = wx - S.x
      if (Math.abs(dx) > reach) continue
      const toward = Math.sign(dx) || 1
      if (sg.solid && !climbFromGround && !(dir === toward || (!S.grounded && S.vx * toward > 60))) continue
      attach(sg, wx, py)
      if (climbFromGround) clingStep(frameDt, dir, 1, false, input('run'))
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
    S.cl = { id: sg.id, n, phi, t, sigma, px, py, tilt: 0, lastDir: heldDir, tapDir: 0, tapT: 0 }
    S.x = along * sigma; S.vx = 0; S.face = -t[1] >= 0 ? 1 : -1
    plantFeet(); headAnchor.x = null
  }
  function attach(sg: Seg, px: number, py: number) {
    const ux = (sg.bx - sg.ax) / sg.len, uy = (sg.by - sg.ay) / sg.len
    let n = [-uy, ux]
    if (n[0] * (S.x - px) + n[1] * (S.y - 40 * R.scale - py) < 0) n = [uy, -ux]
    clingFrame(sg, n, px, py); sfx('grab')
    S.vy = 0; S.grounded = true; S.plat = null; S.sliding = false; S.jumpIndex = -1; S.squash = 0.5
  }
  function clingStep(dt: number, dir: number, vup: number, jumpPressed: boolean, RUN: boolean) {
    const c = S.cl, sg = segById(c.id)
    if (!sg) { fallFrom(c.px + c.n[0] * 40 * R.scale, Math.min(groundY, c.py + 30 * R.scale), 0, 0); return }
    const offset = sg.clipOffset ?? 0
    const before = S.x * c.sigma - offset
    if (sg.clipOffset !== undefined && (before < -0.01 || before > sg.len + 0.01)) {
      fallFrom(c.px + c.n[0] * 40 * R.scale, Math.min(groundY, c.py + 30 * R.scale), 0, 0)
      return
    }
    const ux = (sg.bx - sg.ax) / sg.len, uy = (sg.by - sg.ay) / sg.len
    if (jumpPressed) {
      // wall jump: away from the surface
      fallFrom(c.px + c.n[0] * 40 * R.scale, Math.min(groundY, c.py + 30 * R.scale), c.n[0] * (R.jumpPush + 220) * R.wallJump, -jumpVelocity(0) * R.wallJump)
      if (Math.abs(S.vx) > 1) S.face = Math.sign(S.vx)
      S.burst = R.jumpFlaps / Math.max(1, R.jumpFlapRate); sfx('wallJump')
      S.state = 'jump'; animate(dt, 'jump', false, Math.abs(S.vx)); return
    }
    // up/down count more the steeper the surface, left/right the flatter it is; on steep walls
    // left/right still climb at half speed (toward the wall goes up, away goes down)
    let side = dir * c.t[0]
    if (Math.abs(c.t[0]) < 0.5 && dir !== 0) side = (dir * c.n[0] < 0 ? 1 : -1) * 0.5 * (Math.sign(-c.t[1]) || 1)
    const want = clamp(side + vup * -c.t[1], -1, 1)
    S.vx = approach(S.vx, want * R.climbSpeed * (RUN ? 1.5 : 1), R.acceleration * dt)
    if (Math.abs(want) > 0.15) S.face = Math.sign(want)
    // double tap away from the wall lets go; double tap toward a near-vertical floating wall swaps sides
    if (dir !== 0 && dir !== c.lastDir) {
      const now = performance.now() / 1000
      if (c.tapDir === dir && now - c.tapT < 0.3) {
        c.tapDir = 0
        if (dir * c.n[0] > 0.5) { fallFrom(c.px + c.n[0] * 40 * R.scale, Math.min(groundY, c.py + 30 * R.scale), c.n[0] * 90, 0); return }
        if (!sg.solid && sg.ang >= 70 && sg.ang <= 110) { clingFrame(sg, [-c.n[0], -c.n[1]], c.px, c.py); S.squash = 0.5; animate(dt, 'cling', false, 0); return }
      } else { c.tapDir = dir; c.tapT = now }
    }
    c.lastDir = dir
    const prevPy = c.py
    S.x += S.vx * dt
    let s = S.x * c.sigma - offset
    c.px = sg.ax + ux * s; c.py = sg.ay + uy * s
    // climbing down onto a floor that meets the wall
    if (c.py > prevPy) {
      for (const f of SEGS) {
        if (f.wall) continue
        const ix = c.px + c.n[0] * 30 * R.scale, fy = floorY(f, ix)
        if (fy !== null && prevPy < fy && c.py >= fy && fy <= groundY) { standAt(ix, fy, fy < groundY ? f : null, Math.sign(c.n[0]) || 1); return }
      }
    }
    if (s < 0 || s > sg.len) {
      const end = s < 0 ? [sg.ax, sg.ay] : [sg.bx, sg.by], other = s < 0 ? [sg.bx, sg.by] : [sg.ax, sg.ay]
      if (end[1] < other[1] - 1) {
        // top end: climb over onto the floor behind it (a box's top edge), if there is one
        const ix = end[0] - c.n[0] * 26 * R.scale
        const f = SEGS.find(f => !f.wall && floorY(f, ix) !== null && Math.abs((floorY(f, ix) as number) - end[1]) < 4)
        if (f) { standAt(ix, floorY(f, ix) as number, f, -Math.sign(c.n[0]) || 1); return }
        s = clamp(s, 0, sg.len); S.x = (s + offset) * c.sigma; S.vx = 0; c.px = sg.ax + ux * s; c.py = sg.ay + uy * s
      } else if (end[1] >= groundY - 3) {
        standAt(end[0] + c.n[0] * 30 * R.scale, groundY, null, Math.sign(c.n[0]) || 1); return
      } else { fallFrom(end[0] + c.n[0] * 30 * R.scale, end[1], 0, 0); return }
    }
    c.tilt = -Math.sign(S.face * Math.sin(c.phi)) * R.clingTilt
    const speed = Math.abs(S.vx)
    S.state = 'cling'
    updateFeet(dt, 'cling', speed)
    animate(dt, 'cling', false, speed)
  }

  // ---------- step up: a platform edge touching her shin or foot while walking lifts her onto it ----------
  // knee height above the ground (hip minus most of the thigh), in rig units
  const STEP_UP = -HIP_Y - LF * 0.85
  function stepUp() {
    const s = R.scale, xs = [S.x, feet.F.x ?? S.x, feet.B.x ?? S.x]
    // the legs plus the toes reaching forward
    const x0 = Math.min(...xs) - 6 * s + Math.min(0, S.face * 18 * s), x1 = Math.max(...xs) + 6 * s + Math.max(0, S.face * 18 * s)
    let best: Seg | null = null, bestY = S.y
    SEGS.forEach(sg => {
      if (sg.wall || !sg.topEdge || sg.id === S.plat) return
      const fy = Math.min(sg.ay, sg.by)
      if (fy >= S.y - 2 || fy < S.y - STEP_UP * s) return
      if (Math.max(sg.ax, sg.bx) < x0 || Math.min(sg.ax, sg.bx) > x1) return
      if (fy < bestY) { best = sg; bestY = fy }
    })
    if (!best) return
    const sg = best as Seg
    S.x = clamp(S.x, Math.min(sg.ax, sg.bx) + 4 * s, Math.max(sg.ax, sg.bx) - 4 * s)
    land(bestY, sg); S.squash = 0.35
  }

  // ---------- point-and-click: a click or tap sends her walking to that spot ----------
  // She gives up (back to idle) on arriving under it, when something stops her, or on any input of her own.
  let goal: { x: number; y: number; checkT: number; checkX: number } | null = null
  let tap: { id: number; x: number; y: number; t: number } | null = null
  const ignoreTap = (t: EventTarget | null) => {
    const n = t as Element | null
    return !!n && (el.root.contains(n) || !!n.closest?.('[data-chicken-ignore], [role="dialog"], [role="alertdialog"]'))
  }
  const onTapDown = (e: PointerEvent) => {
    tap = !portalEntry && e.button === 0 && !game.gameMode && !ignoreTap(e.target) ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null
  }
  const onTapUp = (e: PointerEvent) => {
    if (!tap || tap.id !== e.pointerId) return
    const t = tap; tap = null
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8 || performance.now() - t.t > 600 || S.held) return
    const m = 40 * R.scale
    goal = { x: clamp(e.clientX, m, W - m), y: e.clientY, checkT: 0.3, checkX: S.x }
    if (R.broodStandOnMove) S.broodLatch = false
  }
  window.addEventListener('pointerdown', onTapDown, true)
  window.addEventListener('pointerup', onTapUp, true)
  // true while she should keep walking to the goal
  function goalStep(dt: number) {
    const g = goal!
    if (Math.abs(g.x - S.x) < 6 * R.scale) { goal = null; return false }
    if (S.grounded) {
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
  function heldStep(dt: number) {
    const tx = drag.px - drag.ox, ty = drag.py - drag.oy
    S.vx = ease(S.vx, (tx - S.x) / Math.max(dt, 1e-3), 12, dt); S.vy = ease(S.vy, (ty - S.y) / Math.max(dt, 1e-3), 12, dt)
    S.x = tx; S.y = ty; S.grounded = false; S.cl = null; S.plat = null; S.sliding = false
    S.state = 'held'
    animate(dt, 'held', false, 0)
  }
  const onRootDown = (e: PointerEvent) => {
    if (portalEntry || e.button !== 0 || game.gameMode) return
    e.preventDefault(); e.stopPropagation(); ensureAudio()
    drag.id = e.pointerId; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.on = false
  }
  function moveDrag(e: PointerEvent) {
    if (drag.id !== e.pointerId) return
    drag.px = e.clientX; drag.py = e.clientY
    if (!drag.on && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 5) {
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
  const blockTouch = (e: TouchEvent) => { if (e.cancelable && !game.gameMode) e.preventDefault() }
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
    if (flapping) S.flapPhase += dt * (S.burst > 0 ? R.jumpFlapRate : st === 'held' ? R.heldFlapRate : R.flapRate) * Math.PI * 2
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
    if (st === 'walk' || ((st === 'crouch' || st === 'cling') && speed > 5)) {
      // head locks in place; when a foot lands it shoots forward to where the body will be next, never back
      const A = headAnchor, reach = NECK_LEN * 0.7 * R.scale
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
    } else if (st === 'brood') {
      // the body settles over the legs, which fold up under it
      t.sink = R.broodDepth; t.legSink = R.broodDepth; t.puff = 1.07; t.wing = 8; t.wingBack = 6; t.tail = 6; t.neck = 6; t.head = -6
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
      t.bob = Math.sin(performance.now() / 600) * 0.6
      k = 38
    }
    if (!S.grounded) {
      t.ik = 0
      t.tgtF = [LEG.F.hx + 6, -36]; t.tgtB = [LEG.B.hx + 2, -40]; t.tuck = 12
      t.body = clamp(S.vy / 70, -14, 14)
      t.tail = -8; t.neck = -4; t.head = S.vy < 0 ? -10 : 6
      if (st === 'held') { t.tgtF = [LEG.F.hx + 3, -2]; t.tgtB = [LEG.B.hx - 3, 0]; t.tuck = -14; t.body = clamp(-S.vx / 35, -28, 28); t.neck = 4; t.head = 10; t.tail = 10 }
      if (st === 'fastFall') { t.wing = 120; t.wingBack = 110; t.tgtF = [LEG.F.hx + 4, -6]; t.tgtB = [LEG.B.hx + 8, -8]; t.tuck = -10; t.body = 6; t.head = 14; t.tail = -24 }
      k = 18
    }
    if (U && (st === 'walk' || st === 'run' || st === 'crouch' || !S.grounded)) { t.neck -= 10; t.head -= 30 }
    if (S.shocking) {
      t.sink = R.broodDepth + R.shockingBodyDepth
      t.legSink = R.broodDepth + R.shockingLegBend
      t.ik = 1; t.tuck = 0
      t.wing = 8; t.wingBack = 6
    }

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
      pose['leg' + key] = ease(pose['leg' + key], fa - 90, lk, dt)
      pose['tib' + key] = ease(pose['tib' + key], ta - fa, lk, dt)
      pose['shin' + key] = ease(pose['shin' + key], sa - ta, lk, dt)
      pose['toe' + key] = ease(pose['toe' + key], toeW - (sa - 90), lk === 160 ? 160 : 40, dt)
    })

    if (!S.shocking && flapping && (st !== 'fastFall' || S.burst > 0)) {
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
    if (game.aura === 'buddha') lid = Math.max(lid, 0.45)
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
      el.root.style.pointerEvents = 'visiblePainted'
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
    const consumable = heldItem && !swingNow ? heldItem.consumable : null
    // Aim rotates the wing, while food/bottles keep their own upright pose in
    // screen space, with only a small sway. Consumption uses the mouth pose.
    const consumableAngle = consumable ? rigAngle((consumable.upright === 0 && S.face < 0 ? 180 : consumable.upright) + (consumable.progress !== undefined ? 0 : Math.sin(heldItem!.angle) * 12) + throwTilt) : 0
    const restAngle = (pose.wing + (heldItem?.atHand ? handAimAngle(heldA) : 0)) / DEG
    const restHandX = HAND_DX * Math.cos(restAngle) - HAND_DY * Math.sin(restAngle)
    const restHandY = HAND_DX * Math.sin(restAngle) + HAND_DY * Math.cos(restAngle)
    let handX = restHandX, handY = restHandY
    const wingToHand = () => {
      const b = Math.atan2(handY, handX) * DEG
      const [px, py] = PIV.wing
      el.wing.setAttribute('transform', `translate(${px} ${py}) rotate(${b}) scale(${Math.hypot(handX, handY) / WING_TIP_LEN} 1) rotate(${-WING_TIP_DEG}) translate(${-px} ${-py})`)
    }
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
      const qx = fx - heldItem!.kick, qy = fy, r = heldA / DEG
      const vx = qx * Math.cos(r) - qy * Math.sin(r), vy = qx * Math.sin(r) + qy * Math.cos(r)
      const b = Math.atan2(vy, vx) * DEG, stretch = clamp(Math.hypot(vx, vy) / WING_TIP_LEN, 0.6, 1.5)
      const [px, py] = PIV.wing
      el.wing.setAttribute('transform', `translate(${px} ${py}) rotate(${b.toFixed(1)}) scale(${stretch.toFixed(3)} 1) rotate(${(-WING_TIP_DEG).toFixed(1)}) translate(${-px} ${-py})`)
    } else if (swingNow) {
      const e = smooth(clamp(swingNow.t, 0, 1))
      const rest = WING_TIP_DEG + pose.wing
      const target = rigAngle(swingNow.angle * DEG)
      const b = rest + ((((target - rest) % 360) + 540) % 360 - 180) * e
      const full = Math.max(WING_TIP_LEN, swingNow.reach / Math.max(0.01, R.scale * pose.puff))
      wingLen = WING_TIP_LEN + (full - WING_TIP_LEN) * e
      tipRig = b
      const [px, py] = PIV.wing
      el.wing.setAttribute('transform', `translate(${px} ${py}) rotate(${b.toFixed(1)}) scale(${(wingLen / WING_TIP_LEN).toFixed(3)} ${(1 - 0.2 * e).toFixed(3)}) rotate(${(-WING_TIP_DEG).toFixed(1)}) translate(${-px} ${-py})`)
    } else if (heldItem?.atHand) {
      // Move the grip and anatomical hand together through the charge pullback.
      handX -= Math.cos(heldA / DEG) * heldItem.kick
      handY -= Math.sin(heldA / DEG) * heldItem.kick
      wingToHand()
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
    el.wingBack.setAttribute('transform', rot('wing', pose.wingBack * 0.9) + ' translate(-4 -2)')
    el.tail.setAttribute('transform', rot('tail', pose.tail * tailSwing))
    const legShift = `translate(0 ${(pose.shiftY || 0).toFixed(2)})`
    el.wrapF.setAttribute('transform', legShift); el.wrapB.setAttribute('transform', legShift)
    ;(['F', 'B'] as const).forEach(k => { ['leg', 'tib', 'shin', 'toe'].forEach(b => { el[b + k].setAttribute('transform', rot(b + k, pose[b + k])) }) })
    el.lid.setAttribute('ry', (5.4 * pose.lid).toFixed(2))
    el.lid.setAttribute('cy', (-197.4 + 5.4 * pose.lid).toFixed(2))
    // Stick/touch aim takes priority over a mouse left elsewhere on the page.
    let px = 1.4, py = 0
    if (game.lookAngle != null || pointer) {
      const r = game.lookAngle == null ? el.sclera.getBoundingClientRect() : null
      let dx = game.lookAngle != null ? Math.cos(game.lookAngle) * 100 : pointer!.x - (r!.left + r!.width / 2)
      const dy = game.lookAngle != null ? Math.sin(game.lookAngle) * 100 : pointer!.y - (r!.top + r!.height / 2)
      dx *= S.face
      const a = -(pose.body + pose.neck + pose.head + va * S.face) / DEG
      const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a)
      const len = Math.hypot(rx, ry) || 1, m = 2.1 * Math.min(1, len / 24)
      px = rx / len * m; py = ry / len * m
    }
    el.pupil.setAttribute('cx', (51 + px).toFixed(2)); el.pupil.setAttribute('cy', (-192 + py).toFixed(2))
    const fy = S.cl ? groundY : floorBelow(S.x, S.y)
    const shrink = Math.max(0.35, 1 - Math.max(0, fy - S.y) / 400)
    el.shadow.setAttribute('opacity', S.cl ? '0' : '0.35')
    el.shadow.setAttribute('cx', S.x.toFixed(1)); el.shadow.setAttribute('cy', (fy + 2).toFixed(1))
    el.shadow.setAttribute('rx', (58 * s * shrink).toFixed(1)); el.shadow.setAttribute('ry', (6 * s * shrink).toFixed(1))
  }

  let last = performance.now(), raf = 0, tagT = 0
  function frame(now: number) {
    frameNow = now
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now; frameDt = dt
    tagT -= dt; if (tagT <= 0) { tagBoxes(); tagT = 0.5 }
    if (portalEntry) renderPortal(now)
    else if (!isChickenControlsListening()) step(dt); else render()
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
    return { x: S.cl ? S.cl.px : S.x, y: S.cl ? S.cl.py : S.y, angle: S.cl ? S.cl.phi : 0, vx: S.vx * movementFactor(), vy: S.vy * movementFactor(), face: S.face, scale: R.scale, grounded: !!S.grounded, state: portalEntry ? portalEntry.mode === 'arrive' ? 'portalArrival' : 'portal' : S.state, held: !!S.held, width: W, height: H, groundY }
  }

  return {
    isShiftHeld: () => shifts.size > 0 && (!devices || devices.includes('kb1') || devices.includes('kb2')),
    setPortalEntry(entry) {
      if (!entry) {
        if (!portalEntry) return
        portalEntry = null
        el.root.setAttribute('opacity', '1')
        el.root.style.pointerEvents = 'visiblePainted'
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
      throwTransition.reset()
      goal = null; tap = null; drag.id = null; drag.on = false
      pressed.clear(); virtTapped.clear(); gameTaps.clear()
      el.root.style.pointerEvents = 'none'
      renderPortal(portalEntry.start)
    },
    arriveAtPortal(arrival) {
      throwTransition.reset()
      portalEntry = null
      S.cl = null; S.plat = null; S.held = false; S.grounded = false
      S.x = arrival.x; S.y = arrival.y + 80 * R.scale
      S.vx = 0; S.vy = 0; S.airBoost = 0; S.shocking = false; S.broodLatch = false; S.sliding = false
      S.state = 'idle'; S.jumpIndex = -1; S.burst = 0; S.squash = 0; turn.t = 1
      goal = null; tap = null; drag.id = null; drag.on = false
      pressed.clear(); virtTapped.clear(); gameTaps.clear(); plantFeet()
      el.root.setAttribute('opacity', '1')
      render()
      portalEntry = { ...arrival, mode: 'arrive', start: performance.now(), duration: Math.max(1, arrival.durationMs), fromX: arrival.x, fromY: arrival.y, dx: 0, dy: 0, transform: el.root.getAttribute('transform') || '' }
      el.root.style.pointerEvents = 'none'
      renderPortal(portalEntry.start)
    },
    setGroundHeight(h) { if (h !== opts.groundHeight) { opts.groundHeight = h; resize() } },
    setVirtual(action, on) {
      ensureAudio()
      if (on && !virt[action]) virtTapped.add(action)
      virt[action] = on
    },
    // Full snapshots remain eager; camera/contact queries need no SVG geometry.
    getState: () => ({ ...motionState(), shoulder: shoulder() }),
    getMotionState: motionState,
    getActions() {
      const out = {} as Record<ChickenAction, boolean>
      // a key pressed and let go between two reads still counts once
      CHICKEN_ACTIONS.forEach(a => { out[a.key] = !portalEntry && !isChickenControlsListening() && (input(a.key) || keyBinds[a.key].some(t => gameTaps.has(t))) })
      gameTaps.clear()
      return out
    },
    peekActions() {
      const out = {} as Record<ChickenAction, boolean>
      pollPad()
      CHICKEN_ACTIONS.forEach(a => { out[a.key] = !portalEntry && !isChickenControlsListening() && input(a.key) })
      return out
    },
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
      if (portalEntry) { portalEntry.dx += dx; portalEntry.dy += dy }
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
    setGame(next) { Object.assign(game, next); showAura() },
    setPeck(next) { if (!portalEntry) peckNow = next },
    setSwing(next) { swingNow = next; if (next) throwTransition.reset() },
    heldPoint(angle, x, y) {
      // The trajectory and release use the resting hand, not the hand pulled
      // back while charging; otherwise each frame would move the origin again.
      const hand = heldItem?.atHand && !swingNow ? rigMatrix(el.heldPivot) : null
      const r = (pose.wing + handAimAngle(rigAngle(angle * DEG))) / DEG
      const hx = HAND_DX * Math.cos(r) - HAND_DY * Math.sin(r), hy = HAND_DX * Math.sin(r) + HAND_DY * Math.cos(r)
      const p = hand ? new DOMPoint(hx, hy).matrixTransform(hand) : shoulder()
      const k = R.scale * pose.puff
      const c = Math.cos(angle), sn = Math.sin(angle)
      // Local down inherits the body mirror; aim alone never changes its sign.
      const yy = y * (S.face < 0 ? -1 : 1)
      return { x: p.x + k * (x * c - yy * sn), y: p.y + k * (x * sn + yy * c) }
    },
    rigPoint(point) {
      const node = point === 'neck' ? el.body : point === 'hand' ? el.wing : el.head
      const at = point === 'neck' ? { x: PIV.neck[0], y: PIV.neck[1] } : point === 'hand' ? CHICKEN_HAND : CHICKEN_MOUTH
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
        const wing = el.wing.getCTM(), pivot = el.heldPivot.getCTM()
        if (m && wing && pivot) {
          const hand = new DOMPoint(CHICKEN_HAND.x, CHICKEN_HAND.y).matrixTransform(wing).matrixTransform(pivot.inverse())
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
    impulse(vx, vy, blast = false) {
      if (portalEntry || S.held) return
      if (blast) {
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
      devices = next ? [...next] : null
      rebind()
      held.clear(); pressed.clear(); gameTaps.clear(); pad = {}
    },
    getDevices: () => devices,
    setLook(next) {
      if (JSON.stringify(next) === JSON.stringify(ownLook)) return
      ownLook = next
      paintLook(next ?? config.look)
    },
    dropAt(x) { if (!portalEntry) fallFrom(clamp(x, 40 * R.scale, W - 40 * R.scale), -160 * R.scale, 0, 0) },
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
