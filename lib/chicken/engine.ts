// Player chicken: a rigged 2D chicken that walks, runs, jumps, flies, broods, slides, clings to walls
// and can be picked up with the pointer. Ported from the "Pátio da Caipira" prototype.
//
// It draws in its own full-screen SVG layer above the page. Colliders come from the page itself:
// every element with `data-chicken-platform` (or a direct child of `data-chicken-platforms`) is a
// floating box: its horizontal edges are one-way floors, its sides are walls she grabs when her feet
// touch them in the air with no movement control held. The screen sides are solid (rigid) walls she climbs by pushing into them, and the
// ground sits `groundHeight` px above the bottom of the viewport.
import { LOOK_ART, type ChickenLook } from './look-art'
import { CHICKEN_CLUCKS, CHICKEN_PX_PARAMS, type ChickenParams } from './params'
import { getChickenConfig, subscribeChickenConfig, type ChickenConfig } from './config'
import { CHICKEN_ACTIONS, isChickenControlsListening, loadChickenControls, readGamepadTokens, subscribeChickenControls, type ChickenAction, type ChickenControls } from './controls'

export type ChickenState = { x: number; y: number; angle: number; vx: number; vy: number; face: number; scale: number; grounded: boolean; state: string; held: boolean; width: number; height: number; groundY: number }
// Game hooks (PigChicKen's Parquinho): the screen walls move with the camera, the camera shifts her, aim can set where she faces
export type ChickenGame = { gameMode?: boolean; moveLock?: boolean; aimFace?: number | null; backpedal?: number }
export type ChickenEngine = {
  setVirtual: (action: ChickenAction, on: boolean) => void
  getState: () => ChickenState
  // every action held right now (keys, gamepad buttons and on-screen controls)
  getActions: () => Record<ChickenAction, boolean>
  // camera moved: move her (and everything she keeps in screen coordinates) by dx pixels
  shift: (dx: number) => void
  // left and right walls in screen pixels; null = the screen edges
  setBounds: (bounds: { lo: number; hi: number } | null) => void
  setGame: (game: ChickenGame) => void
  destroy: () => void
}

type Seg = { id: string; ax: number; ay: number; bx: number; by: number; len: number; ang: number; wall: boolean; solid: boolean }

const NS = 'http://www.w3.org/2000/svg'
const DEG = 180 / Math.PI
// leg chain (bird anatomy): hip, hidden inside the body -> knee at the belly -> ankle (bends back) -> foot joint -> toes
const LEG = { F: { hx: -14 }, B: { hx: -26 } } as const
const LF = 30, LT = 32, LS = 40, HIP_Y = -88, FOOT_Y = -3, NECK_LEN = 56
const PIV: Record<string, [number, number]> = {
  legF: [-14, -88], tibF: [-14, -58], shinF: [-14, -26], toeF: [-14, 14],
  legB: [-26, -88], tibB: [-26, -58], shinB: [-26, -26], toeB: [-26, 14],
  body: [0, -62], neck: [24, -124], head: [40, -178], wing: [14, -120], tail: [-52, -110],
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
const SVG_MARKUP = `
  <defs>
    <clipPath id="chk-wingClip"><path d="${LOOK_ART.WING}"/></clipPath>
    <pattern id="chk-pearlDots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.35" fill="#eef1f5"/><circle cx="5.5" cy="5.5" r="1.35" fill="#eef1f5"/></pattern>
  </defs>
  <ellipse data-part="shadow" rx="60" ry="7" fill="#000" opacity="0.35"/>
  <g data-part="root" style="pointer-events: visiblePainted; cursor: grab; touch-action: none">
    ${legMarkup('Back', -26)}${legMarkup('Front', -14)}
    <g data-part="body">
      <g data-part="wingBack"><g data-part="artWingBack"></g></g>
      <g data-part="tail"><g data-part="artTail"></g></g>
      <g data-part="artTorso"></g>
      <g data-part="neck"><g data-part="artNeck"></g>
        <g data-part="head"><g data-part="artComb"></g><g data-part="artFace"></g><g data-part="artBeak"></g><g data-part="artWattle"></g>
          <circle data-part="sclera" cx="51" cy="-192" r="4.6" fill="#fff8e1"/>
          <circle data-part="pupil" cx="52.5" cy="-192" r="2.8" fill="#1f1a17"/>
          <ellipse data-part="lid" cx="51" cy="-197.4" rx="5.4" ry="0" fill="#f7b21b"/>
        </g>
      </g>
      <g data-part="wing"><g data-part="artWing"></g></g>
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

export function createChickenEngine(host: HTMLElement, opts: { groundHeight: number; look?: ChickenLook; dropIn?: boolean }): ChickenEngine {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none'
  svg.innerHTML = SVG_MARKUP
  host.appendChild(svg)
  const part = (name: string) => svg.querySelector(`[data-part="${name}"]`) as SVGGraphicsElement
  const el: Record<string, SVGGraphicsElement> = {}
  ;['shadow', 'root', 'body', 'wingBack', 'tail', 'neck', 'head', 'wing', 'sclera', 'pupil', 'lid'].forEach(n => { el[n] = part(n) })
  ;(['F', 'B'] as const).forEach(k => {
    const n = k === 'F' ? 'Front' : 'Back'
    el['leg' + k] = part('leg' + n); el['tib' + k] = part('tib' + n); el['shin' + k] = part('shin' + n); el['toe' + k] = part('toe' + n); el['wrap' + k] = part('leg' + n + 'Wrap')
  })

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
  paintLook(opts.look ?? config.look)

  // ---------- params (scaled down on small screens) ----------
  const R = { ...config.params } as ChickenParams
  let W = window.innerWidth, H = window.innerHeight, groundY = H - opts.groundHeight
  function resize() {
    W = window.innerWidth; H = window.innerHeight; groundY = H - opts.groundHeight
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const vf = clamp(Math.min(W, H) / 800, 0.55, 1)
    const P = config.params
    Object.assign(R, P)
    CHICKEN_PX_PARAMS.forEach(k => { (R as any)[k] = (P as any)[k] * vf })
    R.scale = P.scale * vf
    if (S.grounded && !S.plat && !S.cl) S.y = groundY
    S.x = clamp(S.x, 40 * R.scale, W - 40 * R.scale)
  }

  // ---------- controls ----------
  let controls: ChickenControls = loadChickenControls()
  const unsubscribe = subscribeChickenControls(c => { controls = c })
  const held = new Set<string>(), pressed = new Set<string>(), gameTaps = new Set<string>()
  const virt: Partial<Record<ChickenAction, boolean>> = {}, virtTapped = new Set<ChickenAction>()
  let pad: Partial<Record<ChickenAction, boolean>> = {}
  const input = (a: ChickenAction) => controls.keys[a].some(t => t && held.has(t)) || !!pad[a] || !!virt[a]
  const tapped = (a: ChickenAction) => controls.keys[a].some(t => t && pressed.has(t)) || virtTapped.has(a)
  const usedKey = (tok: string) => CHICKEN_ACTIONS.some(a => controls.keys[a.key].includes(tok))
  const onKeyDown = (e: KeyboardEvent) => {
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
  const onKeyUp = (e: KeyboardEvent) => { held.delete('Key:' + e.code) }
  const onBlur = () => { held.clear(); Object.keys(virt).forEach(k => { virt[k as ChickenAction] = false }) }
  let pointer: { x: number; y: number } | null = null
  const onPointerMove = (e: PointerEvent) => { pointer = { x: e.clientX, y: e.clientY }; moveDrag(e) }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  window.addEventListener('pointermove', onPointerMove)
  function pollPad() {
    const on = readGamepadTokens(controls.analog.deadzoneL)
    pad = {}
    CHICKEN_ACTIONS.forEach(a => { pad[a.key] = controls.pad[a.key].some(t => t && on.has(t)) })
  }

  // ---------- sound ----------
  let actx: AudioContext | null = null, lastVoice: { src: AudioBufferSourceNode; gain: GainNode } | null = null, lastName = ''
  const buffers: Record<string, AudioBuffer> = {}
  function ensureAudio() {
    if (actx) { if (actx.state === 'suspended') void actx.resume(); return }
    try { actx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { actx = null; return }
    const ctx = actx
    Object.values(CHICKEN_CLUCKS).flat().forEach(name => {
      fetch(`/audio/chicken/${name}.mp3`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { buffers[name] = buf }).catch(() => {})
    })
  }
  // the cluck chosen for a movement in the class: '' none, 'all' any switched-on type, or one type
  function sfx(ev: string) {
    const v = (R as any)['sfx_' + ev] as string | undefined
    if (!v || !actx || !controls.sound) return
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
    const gain = actx.createGain(); gain.gain.value = 0.55 * (1 + (Math.random() * 2 - 1) * R.volJitter / 100)
    src.connect(gain); gain.connect(actx.destination); src.start(t)
    lastVoice = { src, gain }
  }

  // ---------- game hooks ----------
  let bounds: { lo: number; hi: number } | null = null
  const game: Required<ChickenGame> = { gameMode: false, moveLock: false, aimFace: null, backpedal: 1 }
  const wallLo = () => bounds ? bounds.lo : 0, wallHi = () => bounds ? bounds.hi : W

  // ---------- simulation state ----------
  const S: any = { x: W * 0.5, y: groundY, vx: 0, vy: 0, face: 1, grounded: true, jumpIndex: -1, state: 'idle', flapPhase: 0, burst: 0, squash: 0, boostT: 0, sliding: false, runIntent: false, plat: null, platAx: 0, cl: null, held: false }
  const pose: any = { tibF: 0, tibB: 0, toeF: 0, toeB: 0, sway: 0, bob: 0, body: 0, neck: 0, head: 0, wing: 0, wingBack: 0, tail: 0, legF: 0, shinF: 0, legB: 0, shinB: 0, sink: 0, legSink: 0, lid: 0, puff: 1, ik: 1, shiftY: 0 }
  const idle = { next: 1, neck: 0, head: 0 }
  const blink = { next: 2, t: -1 }
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
    if (lookChanged && !opts.look) paintLook(next.look)
  })
  window.addEventListener('resize', resize)

  let prevJump = false
  function step(dt: number) {
    pollPad()
    const Lh = input('left'), Rh = input('right'), U = input('up'), Dk = input('down'), C = input('crouch'), J = input('jump'), RUN = input('run')
    const jumpPressed = (J && !prevJump) || (tapped('jump') && !(J && prevJump))
    const crouchPressed = tapped('crouch') || (C && !S.prevCrouch)
    const downPressed = (Dk && !S.prevD) || tapped('down')
    prevJump = J; S.prevCrouch = C; pressed.clear(); virtTapped.clear()
    // letting go of brood with nothing else held keeps her brooding until another control is used
    const others = Lh || Rh || U || C || J || RUN
    if (S.broodLatch && (others || S.held || S.cl || !S.grounded)) S.broodLatch = false
    // pressing brood again while latched gets her up into the normal idle (until brood is released)
    if (S.broodLatch && downPressed) { S.broodLatch = false; S.broodOff = true }
    if (S.prevD && !Dk && !others && S.grounded && !S.held && !S.cl && !S.broodOff) S.broodLatch = true
    if (!Dk) S.broodOff = false
    S.prevD = Dk
    const D = (Dk && !S.broodOff) || S.broodLatch
    let dir = (Rh ? 1 : 0) - (Lh ? 1 : 0)
    if (game.moveLock) dir = 0
    // point-and-click: any control of her own cancels the walk to the clicked spot
    if (goal && (dir !== 0 || J || Dk || C || U || S.held || S.cl)) goal = null
    const auto = !!goal && goalStep(dt)
    if (auto) dir = Math.sign(goal!.x - S.x)
    buildSegs(); heldDir = dir
    S.clCool = Math.max(0, (S.clCool || 0) - dt); S.dropT = Math.max(0, (S.dropT || 0) - dt);
    if (S.held) { heldStep(dt); return }
    if (S.cl) { clingStep(dt, dir, (U ? 1 : 0) - (D || C ? 1 : 0), jumpPressed, RUN); return }
    // floating walls grab only while no movement control is held
    S.noGrab = Lh || Rh || U || Dk || C || J || RUN
    // standing on a floating edge: ride along when it moves, fall when walking off its end
    if (S.grounded && S.plat) {
      const sg = segById(S.plat), fy = sg ? floorY(sg, S.x) : null
      if (!sg || fy === null) { S.grounded = false; S.plat = null; S.vy = 0; S.jumpIndex = 0 }
      else {
        const dx = sg.ax - S.platAx, dy = fy - S.y; S.platAx = sg.ax
        if (dx) { S.x += dx; Object.values(feet).forEach((f: any) => { if (f.x !== null) f.x += dx; f.from += dx; f.to += dx }); if (headAnchor.x !== null) headAnchor.x += dx }
        S.y += dy
      }
    }
    const speed0 = Math.abs(S.vx)
    const brooding = S.grounded && D
    // walking while brooding: a share of the walk speed (0 keeps her still)
    const broodWalking = brooding && dir !== 0 && R.broodWalk > 0
    // slide starts when crouching out of a run
    if (S.grounded && crouchPressed && !brooding && speed0 > R.walkSpeed * 1.1) S.sliding = true
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
        if (game.aimFace && dir !== 0 && dir !== game.aimFace) target *= game.backpedal
        if (runIntent && S.boostT > 0) target += dir * R.runBoost * (S.boostT / Math.max(0.01, R.runBoostTime))
        // the jump's sideways kick lasts until she lands, instead of fading into the air speed
        if (!S.grounded) target += S.airBoost || 0
      }
      let rate = (dir !== 0 && (!brooding || broodWalking)) ? R.acceleration : R.deceleration
      if (!S.grounded) rate *= R.airControl
      S.vx = approach(S.vx, target, rate * dt)
      if (!S.grounded && D) { const cap = R.walkSpeed * (RUN ? R.runMultiplier : 1) * R.airSpeed * R.fallSideSpeed + Math.abs(S.airBoost || 0); S.vx = clamp(S.vx, -cap, cap) }
      if (dir !== 0 && (!brooding || broodWalking)) S.face = dir
      if (game.aimFace && !brooding && !S.sliding) S.face = game.aimFace
    }

    // down + jump on a floating floor: drop through it instead of jumping
    const plat = S.grounded && S.plat ? segById(S.plat) : null
    if (jumpPressed && plat && !plat.solid && (C || D)) {
      S.dropId = plat.id; S.dropT = 0.3; S.grounded = false; S.plat = null; S.sliding = false
      S.vy = 60; S.jumpIndex = 0; S.y += 2; plantFeet(); sfx('dropThrough')
    } else if (jumpPressed) {
      const fromGround = S.grounded
      S.jumpIndex = S.grounded ? 0 : S.jumpIndex + 1
      S.vy = -jumpVelocity(S.jumpIndex)
      // super jump: holding crouch scales the jump height (air jumps too); negative pushes her down
      if (C) S.vy *= Math.sign(R.superJump) * Math.sqrt(Math.abs(R.superJump))
      S.grounded = false; S.sliding = false; S.plat = null
      // each button combination has its own sideways boost (towards where she faces) and sound
      const hd = dir || S.face
      let kind = fromGround ? 'jump' : 'airJump', boost = 0, flaps = R.jumpFlaps
      if (dir !== 0 && C && RUN && D) { kind = 'crouchRunBroodJump'; boost = R.crouchRunBroodJumpBoost }
      else if (dir !== 0 && C && RUN) { kind = 'crouchRunJump'; boost = R.crouchRunJumpBoost }
      else if (D) { kind = 'broodJump'; boost = R.broodJumpBoost; flaps = R.broodJumpFlaps }
      else if (C) { kind = 'superJump'; boost = R.crouchJumpBoost }
      S.airBoost = (dir !== 0 ? dir * R.jumpPush : 0) + hd * boost
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
      S.vy = Math.min(term, S.vy + g * dt)
      const prevY = S.y
      S.y += S.vy * dt
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
      if (S.y >= groundY) land(groundY, null)
    }
    S.x += S.vx * dt
    const margin = 40 * R.scale
    if (S.x < wallLo() + margin) { S.x = wallLo() + margin; S.vx = 0 }
    if (S.x > wallHi() - margin) { S.x = wallHi() - margin; S.vx = 0 }

    if (S.grounded && !S.sliding && (!brooding || broodWalking) && !crouching && dir !== 0) stepUp()
    // walking to a clicked spot never grabs the screen walls
    if (tryCling(auto ? 0 : dir)) return
    const speed = Math.abs(S.vx)
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
    S.state = st
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
    const add = (id: string, ax: number, ay: number, bx: number, by: number, solid = false) => {
      const len = Math.hypot(bx - ax, by - ay); if (len < 4) return
      const a = ((Math.atan2(by - ay, bx - ax) * DEG) % 180 + 180) % 180
      out.push({ id, ax, ay, bx, by, len, ang: a, wall: Math.min(a, 180 - a) > 45, solid })
    }
    const boxes = new Set<Element>()
    document.querySelectorAll('[data-chicken-platform]').forEach(e => boxes.add(e))
    document.querySelectorAll('[data-chicken-platforms] > *').forEach(e => boxes.add(e))
    let n = 0
    boxes.forEach(e => {
      const r = e.getBoundingClientRect()
      if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > H) return
      const id = (e as HTMLElement).dataset.chickenId || (e as HTMLElement).id || `box${n++}`
      if (r.top < groundY - 4) add(id + ':top', r.left, r.top, r.right, r.top)
      if (r.bottom < groundY - 4) add(id + ':bottom', r.left, r.bottom, r.right, r.bottom)
      const yb = Math.min(r.bottom, groundY)
      if (yb - r.top > 8) { add(id + ':left', r.left, r.top, r.left, yb); add(id + ':right', r.right, r.top, r.right, yb) }
    })
    add('screen:left', wallLo(), 0, wallLo(), groundY, true); add('screen:right', wallHi(), 0, wallHi(), groundY, true)
    SEGS = out
  }
  // elements without an id get one, so standing on a box survives re-ordering of the DOM
  let autoId = 0
  const tagBoxes = () => {
    document.querySelectorAll('[data-chicken-platform], [data-chicken-platforms] > *').forEach(e => {
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
    S.y = y; S.vy = 0; S.grounded = true; S.jumpIndex = -1; S.squash = 1; S.airBoost = 0
    S.plat = sg ? sg.id : null; S.platAx = sg ? sg.ax : 0
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
  function tryCling(dir: number) {
    const bodyY = S.y - 40 * R.scale, footY = S.y - 4 * R.scale
    for (const sg of SEGS) {
      if (!sg.wall || (S.clCool > 0 && sg.id === S.clLast)) continue
      if (!sg.solid && (S.grounded || S.noGrab)) continue
      const py = sg.solid ? bodyY : footY, reach = (sg.solid ? 46 : 24) * R.scale
      if (py < Math.min(sg.ay, sg.by) || py > Math.max(sg.ay, sg.by)) continue
      const wx = sg.ax + (sg.bx - sg.ax) * (py - sg.ay) / ((sg.by - sg.ay) || 1e-6)
      const dx = wx - S.x
      if (Math.abs(dx) > reach) continue
      const toward = Math.sign(dx) || 1
      if (sg.solid && !(dir === toward || (!S.grounded && S.vx * toward > 60))) continue
      attach(sg, wx, py)
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
    const along = (px - sg.ax) * ux + (py - sg.ay) * uy
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
    let s = S.x * c.sigma
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
        s = clamp(s, 0, sg.len); S.x = s * c.sigma; S.vx = 0; c.px = sg.ax + ux * s; c.py = sg.ay + uy * s
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
      if (sg.wall || !sg.id.endsWith(':top') || sg.id === S.plat) return
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
    tap = e.button === 0 && !game.gameMode && !ignoreTap(e.target) ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null
  }
  const onTapUp = (e: PointerEvent) => {
    if (!tap || tap.id !== e.pointerId) return
    const t = tap; tap = null
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8 || performance.now() - t.t > 600 || S.held) return
    const m = 40 * R.scale
    goal = { x: clamp(e.clientX, m, W - m), y: e.clientY, checkT: 0.3, checkX: S.x }; S.broodLatch = false
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
    if (e.button !== 0 || game.gameMode) return
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
  el.root.addEventListener('pointerdown', onRootDown)
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
      if (f.stepping && !f.settle && S.grounded && w > 0.9) {
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

    if (flapping && st !== 'fastFall') {
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
    pose.lid = lid
    pose.shiftY = shiftY
    render()
  }

  // grabbing / letting go a wall swings the drawing from the old pose into the new one
  const vis = { x: 0, y: 0, a: 0 }, turn = { t: 1, x: 0, y: 0, a: 0 }
  let frameDt = 1 / 60
  function startTurn() { if (R.clingTurnTime > 0) { turn.t = 0; turn.x = vis.x; turn.y = vis.y; turn.a = vis.a } }
  function render() {
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
    el.wing.setAttribute('transform', rot('wing', pose.wing))
    el.wingBack.setAttribute('transform', rot('wing', pose.wingBack * 0.9) + ' translate(-4 -2)')
    el.tail.setAttribute('transform', rot('tail', pose.tail * tailSwing))
    const legShift = `translate(0 ${(pose.shiftY || 0).toFixed(2)})`
    el.wrapF.setAttribute('transform', legShift); el.wrapB.setAttribute('transform', legShift)
    ;(['F', 'B'] as const).forEach(k => { ['leg', 'tib', 'shin', 'toe'].forEach(b => { el[b + k].setAttribute('transform', rot(b + k, pose[b + k])) }) })
    el.lid.setAttribute('ry', (5.4 * pose.lid).toFixed(2))
    el.lid.setAttribute('cy', (-197.4 + 5.4 * pose.lid).toFixed(2))
    // the eye follows the pointer
    let px = 1.4, py = 0
    if (pointer) {
      const r = el.sclera.getBoundingClientRect()
      let dx = pointer.x - (r.left + r.width / 2)
      const dy = pointer.y - (r.top + r.height / 2)
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
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now; frameDt = dt
    tagT -= dt; if (tagT <= 0) { tagBoxes(); tagT = 0.5 }
    if (!isChickenControlsListening()) step(dt); else render()
    raf = requestAnimationFrame(frame)
  }
  tagBoxes()
  // entrance: falls from above the screen at a random horizontal spot
  if (opts.dropIn) fallFrom(W * (0.12 + Math.random() * 0.76), -160 * R.scale, 0, 0)
  raf = requestAnimationFrame(frame)

  return {
    setVirtual(action, on) {
      ensureAudio()
      if (on && !virt[action]) virtTapped.add(action)
      virt[action] = on
    },
    // while clinging, S.x is the distance along the wall: report where she is drawn
    getState: () => ({ x: S.cl ? S.cl.px : S.x, y: S.cl ? S.cl.py : S.y, angle: S.cl ? S.cl.phi : 0, vx: S.vx, vy: S.vy, face: S.face, scale: R.scale, grounded: !!S.grounded, state: S.state, held: !!S.held, width: W, height: H, groundY }),
    getActions() {
      const out = {} as Record<ChickenAction, boolean>
      // a key pressed and let go between two reads still counts once
      CHICKEN_ACTIONS.forEach(a => { out[a.key] = !isChickenControlsListening() && (input(a.key) || controls.keys[a.key].some(t => t && gameTaps.has(t))) })
      gameTaps.clear()
      return out
    },
    shift(dx) {
      if (!dx) return
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
    setGame(next) { Object.assign(game, next) },
    destroy() {
      cancelAnimationFrame(raf)
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
      window.removeEventListener('resize', resize)
      el.root.removeEventListener('pointerdown', onRootDown)
      void actx?.close()
      svg.remove()
    },
  }
}
