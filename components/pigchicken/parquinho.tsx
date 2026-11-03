"use client"

// Parquinho: PigChicKen's creative mode, built on the Pátio. A world several screens wide with a camera
// (follow, scenes, fixed), and the aim of the items: right stick > mouse > on-screen right stick > left stick /
// arrows > facing, drawn as a reticle. Firing, hitting and throwing only flash for now; the items come next.
// The world is in fixed units (lib/pigchicken/world.ts): the same size on every screen, which only changes the crop.
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { chickenBindName, readTouchMoveStick, loadChickenControls, subscribeChickenControls, type ChickenAction, type ChickenControls } from "@/lib/chicken/controls"
import { stickFor, type InputDeviceId } from "@/lib/chicken/input-devices"
import { createMouseOwner, resolveAim, type Aim, type AimSource, type Stick } from "@/lib/pigchicken/aim"
import { cameraBounds, cameraStep, leadStep } from "@/lib/pigchicken/camera"
import { createCombat, TIP_TIME, type Box, type Combat, type Pickup, type Swing } from "@/lib/pigchicken/combat"
import { itemGroup, wheelSliceAt, wheelSliceCenter, wheelSpan, wrapSlot } from "@/lib/pigchicken/inventory"
import { loadItems, subscribeItems, type ItemId, type PathShow } from "@/lib/pigchicken/items"
import { ITEM_SVG, itemImage } from "@/lib/pigchicken/art"
import { playWeaponSound, setWeaponVolume } from "@/lib/pigchicken/sfx"
import { lookDir, lookRows, nearestPoint } from "@/lib/pigchicken/eyes"
import { ALIEN_FRAMES, ALIEN_PATTERNS, ALIEN_PIXEL, ZOMBIE_TIMES, type EnemyData } from "@/lib/pigchicken/enemies"
import type { ParquinhoSettings } from "@/lib/pigchicken/settings"
import { createDrone, playDrum, playNote, setMusicVolumes } from "@/lib/pigchicken/synth"
import { mixGain } from "@/lib/pigchicken/mixer"
import { ZONES, chordName, zoneLabel, type Zone } from "@/lib/pigchicken/music"
import { Movable, useTouchControls, useTouchLayout } from "@/components/chicken/chicken-layer"
import { getTouchLayout } from "@/lib/chicken/touch-layout"
import { SCENE_W, TEMPLE_PLATFORMS, WORLD_GROUND_Y, cameraYRange, cameraYStep, sceneAt, templeScene, worldScenes } from "@/lib/pigchicken/world"
import { defaultLayout, elementsInWorld, layoutBoxes, type LayoutElement } from "@/lib/pigchicken/layout"
import { createLayoutSync } from "@/lib/pigchicken/layout-sync"
import { moveLiveCamera } from "@/lib/pigchicken/live-camera"
import { FollowLayer, LayoutColliders, LayoutLayerView, TreeStyles } from "@/components/pigchicken/patio-layout"
import { GONG_X, RESET_X, createTemple, type Temple, type TempleIO } from "@/lib/pigchicken/temple"
import { TEMPLE_IDLE, playTempleSound, templeAmbience, type TempleSound } from "@/lib/pigchicken/temple-music"
import { drawGong, drawResetStone, drawTempleAlien, drawTempleHud, drawTempleShots } from "@/components/pigchicken/temple-draw"
import { TEMPLE_ROOF_LINES, TempleBackdrop, lineAttr } from "@/components/pigchicken/temple-backdrop"
import { ParallaxBackdrop } from "@/components/pigchicken/parallax"

const SOURCE_LABEL: Record<AimSource, string> = {
  rightStick: "analógico direito", mouse: "mouse", touch: "analógico da tela", leftStick: "analógico esquerdo", keys: "setas", facing: "olhando pra frente",
}

// The world in fixed world units: scenes of SCENE_W, the ground at WORLD_GROUND_Y. ParquinhoPlay moves it with the
// camera (translate); nothing in it depends on the screen's size.
// the code's own Pátio, when the page gives no layout
const DEFAULT_ELEMENTS = defaultLayout().elements
const GROUND_FILL = `linear-gradient(to bottom, #6b8f3a 0, #54752c 4px, #4a3522 7px, #3a2a1b 30px, #2a1e13 100%)`
export function ParquinhoWorld({ screens, worldRef, debug = false, elements = DEFAULT_ELEMENTS, editing = false }: { screens: number; worldRef: React.RefObject<HTMLDivElement | null>; debug?: boolean; elements?: LayoutElement[]; editing?: boolean }) {
  // the Parquinho's scenes, then the temple (Templo do Gongo, the aliens' mini-game)
  const width = worldScenes(screens) * SCENE_W
  const shown = useMemo(() => elementsInWorld({ v: 1, elements }, screens), [elements, screens])
  return (
    <div ref={worldRef} className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ width, height: WORLD_GROUND_Y }}>
      {/* the scenery far behind: sky, sun, clouds, mountains and trees, in parallax along the whole world */}
      <ParallaxBackdrop worldW={width} />
      {/* the ground: reaches far past the world's sides and down past any screen's bottom */}
      <div aria-hidden="true" className="absolute" style={{ left: -4000, width: width + 8000, top: WORLD_GROUND_Y, height: 4000, background: GROUND_FILL, boxShadow: "0 -1px 0 rgba(0,0,0,.35)" }} />
      {debug && Array.from({ length: screens }, (_, s) => (
        <div key={`m${s}`} className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: s * SCENE_W }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/25">Cena {s + 1} <span style={{ color: ZONES[s % ZONES.length].color, opacity: 0.6 }}>· {zoneLabel(ZONES[s % ZONES.length])}</span></span>
        </div>
      ))}
      <TempleBackdrop left={templeScene(screens) * SCENE_W} />
      {debug && (
        <div className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: templeScene(screens) * SCENE_W }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/50">Cena {screens + 1} · Templo do Gongo</span>
        </div>
      )}
      {/* the temple's roofs: floors with their own curves (drawn only in debug) */}
      {debug && (
        <svg aria-hidden="true" className="absolute top-0" style={{ left: templeScene(screens) * SCENE_W, width: SCENE_W, height: WORLD_GROUND_Y }}>
          {TEMPLE_ROOF_LINES.map(l => <polyline key={l.id} points={lineAttr(l.pts)} fill="none" stroke="#ff3b3b" strokeWidth={3} strokeDasharray="8 5" />)}
        </svg>
      )}
      {/* the Pátio's layout (lib/pigchicken/layout.ts): the scenery behind the platforms, then the platforms' layer */}
      <TreeStyles />
      <LayoutLayerView elements={shown} layer="back" editing={editing} />
      <LayoutLayerView elements={shown} layer="scene" editing={editing} />
      {/* what she stands on: the layout's solid elements (invisible boxes; the art is in the layers) */}
      <LayoutColliders elements={shown} />
      <div data-chicken-platforms className="absolute inset-0">
        {TEMPLE_PLATFORMS.map((p, i) => (
          <div key={`tp-${i}`} data-chicken-id={`tp-${i}`} className="absolute rounded-sm border-t-4 border-[#ffd166] shadow-[0_6px_0_#5c120d,0_14px_18px_rgba(40,8,4,0.35)]" style={{ left: templeScene(screens) * SCENE_W + p.x, top: WORLD_GROUND_Y - p.bottom - p.h, width: p.w, height: p.h, background: "linear-gradient(#d8402f, #9a2117 55%, #1f6b62 55%, #1f6b62 80%, #ffd166 80%, #ffd166 88%, #7a1710 88%)" }} />
        ))}
        {TEMPLE_ROOF_LINES.map(l => (
          <div key={l.id} data-chicken-id={`tp-${l.id}`} data-chicken-line={lineAttr(l.pts)} className="absolute top-0" style={{ left: templeScene(screens) * SCENE_W, width: SCENE_W, height: WORLD_GROUND_Y }} />
        ))}
      </div>
    </div>
  )
}


// The layers above the game's things: "behind" (in front of the dummies, racks and shots, behind the characters),
// "front" (in front of her) and "frontGhost" (in front, half see-through, like the trees). Each is a fixed layer
// that follows the camera (lib/pigchicken/live-camera.ts).
export function ParquinhoForeground({ screens, elements = DEFAULT_ELEMENTS, editing = false }: { screens: number; fgRef?: React.RefObject<HTMLDivElement | null>; elements?: LayoutElement[]; editing?: boolean }) {
  const width = worldScenes(screens) * SCENE_W
  const shown = useMemo(() => elementsInWorld({ v: 1, elements }, screens), [elements, screens])
  return (
    <>
      <FollowLayer z={197} width={width}><LayoutLayerView elements={shown} layer="behind" editing={editing} /></FollowLayer>
      <FollowLayer z={202} width={width}><LayoutLayerView elements={shown} layer="front" editing={editing} /></FollowLayer>
      <FollowLayer z={202} opacity={0.55} width={width}><LayoutLayerView elements={shown} layer="frontGhost" editing={editing} /></FollowLayer>
    </>
  )
}

// devices: the input devices of the player she belongs to (null: all of them); without the mouse she ignores it
// and the aim sticks come from that player's own gamepad. extras: the other local players' chickens, which move
// with the same camera (no items yet).
export function ParquinhoPlay({ engine, settings, worldRef, groundHeight = 30, lifted = false, spawnX, fgRef, devices = null, extras, colors, elements = DEFAULT_ELEMENTS }: { engine: ChickenEngine | null; settings: ParquinhoSettings; worldRef: React.RefObject<HTMLDivElement | null>; groundHeight?: number; lifted?: boolean; spawnX?: number; fgRef?: React.RefObject<HTMLDivElement | null>; devices?: InputDeviceId[] | null; extras?: React.RefObject<Map<string, ChickenEngine>>; colors?: Record<string, string>; elements?: LayoutElement[] }) {
  // the Pátio's layout: the game's things (dummies, racks, buttons) and the boxes the shots meet follow it live
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // the inventory wheel has its own canvas, above the chicken
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const devicesRef = useRef(devices)
  devicesRef.current = devices
  // each local player's lobby color (p1: the first one, the others by their id): their reticle's color
  const colorsRef = useRef(colors)
  colorsRef.current = colors
  // where the page keeps the ground on the screen (raised above the touch controls on a phone held upright)
  const groundHRef = useRef(groundHeight)
  groundHRef.current = groundHeight
  const touchAim = useRef<Stick | null>(null)
  // time of the last quick tap on the right stick: shoots the nearest enemy
  const tapShot = useRef(0)
  // a slot the player clicked or tapped on the inventory bar (1-based, 0 none): equips it on the next frame
  const slotTap = useRef(0)
  // how many slots the inventory bar shows (her items plus the empty one while there is room)
  const [invSlots, setInvSlots] = useState(1)
  // the inventory wheel: open (its layer takes the clicks and taps), where the pointer is over it, a click on it
  const [wheelOpen, setWheelOpen] = useState(false)
  const wheelPtr = useRef<{ x: number; y: number } | null>(null)
  const wheelTap = useRef<{ x: number; y: number } | null>(null)
  // what the on-screen grab button offers: '' hidden, 'take' an item to pick up, 'equip' one she already carries
  const [grabOffer, setGrabOffer] = useState<"" | "take" | "equip">("")
  const [controls, setControls] = useState<ChickenControls | null>(null)
  useEffect(() => {
    setControls(loadChickenControls())
    return subscribeChickenControls(setControls)
  }, [])
  const showTouch = useTouchControls(controls?.touch ?? "auto")
  const { editing } = useTouchLayout()

  useEffect(() => {
    if (!engine) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const wheelCanvas = wheelCanvasRef.current!, wctx = wheelCanvas.getContext("2d")!
    let controls = loadChickenControls()
    const unsub = subscribeChickenControls(c => { controls = c })
    const owner = createMouseOwner()
    // the aim stick (gamepad right stick or the on-screen one) keeps its last direction after it is let go,
    // with the same release rule as the mouse; whichever of the two moved last holds the aim
    const stickOwner = createMouseOwner(0)
    let heldStick: { stick: Stick; touch: boolean } | null = null
    let mouse: { x: number; y: number } | null = null
    // the violin's bow: how far it has slid (0 frog .. 1 tip), which way it goes, and the mouse's travel that
    // pushes it (px since the last frame; when the mouse rests, it bows on the beat by itself)
    const bowing = { stroke: 0.5, dir: 1, travel: 0, movedAt: 0 }
    const mouseBtn = { fire: false, melee: false }
    let wheel = 0, slotPick = 0, escape = false
    const isUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("header, aside, button, input, select, a, [data-chicken-ignore], [role='dialog']")
    // the mouse is someone else's (another local player holds it)
    const noMouse = () => !!devicesRef.current && !devicesRef.current.includes("mouse")
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || noMouse()) return
      if (mouse) {
        const moved = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y)
        owner.moved(moved, performance.now())
        bowing.travel += moved
        if (moved > 0) bowing.movedAt = performance.now()
        if (owner.owns) stickOwner.release()
      }
      mouse = { x: e.clientX, y: e.clientY }
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || isUi(e.target) || noMouse()) return
      if (e.button === 0) mouseBtn.fire = true
      if (e.button === 2) mouseBtn.melee = true
    }
    const onUp = (e: PointerEvent) => {
      if (e.button === 0) mouseBtn.fire = false
      if (e.button === 2) mouseBtn.melee = false
    }
    const onMenu = (e: MouseEvent) => { if (!isUi(e.target)) e.preventDefault() }
    const onWheel = (e: WheelEvent) => { if (!isUi(e.target) && !noMouse()) wheel += Math.sign(e.deltaY) }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const m = /^Digit([1-9])$/.exec(e.code)
      if (m && !e.repeat) slotPick = Number(m[1])
      if (e.code === "Escape") escape = true
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("contextmenu", onMenu)
    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("keydown", onKey)
    engine.setGame({ gameMode: true })
    // only the reticle: the mouse arrow hides over the game (panels and buttons keep it)
    document.body.classList.add("pigchicken-play")

    // camX: world x at the screen's left edge; oy: screen y of world y = 0 (null until the first frame)
    let camX = 0, oy: number | null = null, last = performance.now(), raf = 0
    let prev: Partial<Record<ChickenAction, boolean>> = {}
    // the other local players' actions in the last frame (presses are edges)
    const extraPrev = new Map<string, Partial<Record<ChickenAction, boolean>>>()
    const extraAim = new Map<string, { muzzle: { x: number; y: number }; angle: number; reach: number }>()
    let aim: Aim | null = null
    let wasLocked = false, autoUntil = 0
    // the camera's look-ahead (px toward the side she faces) and the aim's shake after a jump (degrees, fading)
    let lead = 0, shake = 0, shakeT = 0, prevVy = 0
    const shakePhase = [Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3]
    // the inventory wheel: open, left open by a quick tap of its button (sticky), when it opened, the slice under
    // the pointer / stick (-1 none); slotsShown: the bar's slot count the page knows
    const wh = { open: false, sticky: false, at: 0, hover: -1 }
    let slotsShown = 1, wheelDrawn = false
    // horde settings, changed by shooting their buttons
    const horde = { zombies: 6, pattern: 0 }
    const ZOMBIE_COUNTS = [3, 6, 10, 20]
    const combat = createCombat()
    combat.setItems(loadItems())
    // instruments, the enemies' answers and the zone's ambience play on PigChicKen's own synth
    combat.setMusicOut({
      note: (voice, midi, at, dur, vel) => { playNote(voice, midi, { at, dur, vel }) },
      hold: (voice, midi) => playNote(voice, midi, { sustain: true, vel: 0.8 }),
      drum: (kind, at) => playDrum(kind, at),
    })
    // the temple's mini-game (its state is plain data, stepped with the beats: ready to be shared in multiplayer)
    const temple = createTemple(Math.floor(Math.random() * 2 ** 31))
    templeDraw.temple = temple
    const templeSounds: TempleSound[] = []
    let templeShown = ""
    // dev only: lets the test scripts reach the combat and the temple
    if (process.env.NODE_ENV !== "production") Object.assign(window as unknown as Record<string, unknown>, { __pigchicken: combat, __pigchickenTemple: temple, __chickenEngine: engine })
    const drone = createDrone()
    let zoneShown: Zone | null = null, zoneBanner = 0
    const unsubItems = subscribeItems(next => combat.setItems(next))
    // creative mode: a rack that keeps a pistol to pick up, and target dummies in the first two scenes
    let placed = false, offerShown = "", templeFor = -1
    // the temple's things move with the world's width: the gong and its racks
    let gong: Combat["targets"][number] | null = null, resetStone: Combat["targets"][number] | null = null
    const templeRacks: Combat["racks"] = []
    const G = WORLD_GROUND_Y
    // the Pátio's own things (dummies, racks, horde buttons) come from its layout and follow its edits
    const layoutSync = createLayoutSync(combat)
    let syncedElements: LayoutElement[] | null = null, syncedScreens = -1
    const place = () => {
      // the temple: the gong (strike it to start) and a few weapons and instruments by the entrance
      combat.addButton(0, G - 40, "gong", 130, 150)
      gong = combat.targets[combat.targets.length - 1]
      // and the reset stone (Recomeçar): strike it to end the game and clear the panels
      combat.addButton(0, G - 4, "reset", 80, 110)
      resetStone = combat.targets[combat.targets.length - 1]
      ;(["pistol", "smg", "guitar", "flute"] as ItemId[]).forEach(id => { combat.addRack(0, id); templeRacks.push(combat.racks[combat.racks.length - 1]) })
      placed = true
    }
    const placeTemple = (screens: number) => {
      const L = templeScene(screens) * SCENE_W
      if (gong) { gong.x = gong.home = L + GONG_X }
      if (resetStone) { resetStone.x = resetStone.home = L + RESET_X }
      templeRacks.forEach((r, i) => { r.x = L + 80 + i * 100 })
      templeFor = screens
    }
    // the platforms the shots hit, in world units (the same boxes the world draws)
    let worldBoxes: Box[] = []
    const header = document.querySelector("main header")
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(window.innerWidth * dpr); canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      wheelCanvas.width = canvas.width; wheelCanvas.height = canvas.height
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      wheelDrawn = true
    }
    fit()
    window.addEventListener("resize", fit)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const S = settingsRef.current
      let st = engine.getState()
      const viewW = st.width, worldW = SCENE_W * worldScenes(S.screens)
      if (!placed) {
        place()
        // she starts by the entrance portal (world x), not in the middle of the screen
        if (spawnX !== undefined) { engine.shift(spawnX - camX - st.x); st = engine.getState() }
      }
      if (templeFor !== S.screens) placeTemple(S.screens)
      if (syncedElements !== elementsRef.current || syncedScreens !== S.screens) {
        syncedElements = elementsRef.current; syncedScreens = S.screens
        const shown = elementsInWorld({ v: 1, elements: syncedElements }, S.screens)
        layoutSync.sync(syncedElements, S.screens)
        worldBoxes = layoutBoxes(shown)
      }
      // the button stays while Pegar is held, so holding it while walking keeps taking items
      const offer = combat.hover ? "take" : combat.hoverOwned ? "equip" : offerShown && engine.peekActions().grab ? offerShown as "take" | "equip" : ""
      if (offer !== offerShown) { offerShown = offer; setGrabOffer(offer) }

      // ---------- camera: only the crop changes with the screen, never the size of things ----------
      const worldX = camX + st.x
      // the look-ahead: the view leans toward the side she faces (and slides over when she turns around)
      if (!st.held) lead = leadStep(lead, st.face, S.camera === "follow" ? S.lookAhead : 0, S.lookAheadSpeed, dt)
      const next = st.held ? camX : cameraStep(camX, { mode: S.camera, worldX, viewW, worldW, dt, deadband: S.deadband, lag: S.lag, lead })
      const groundScreen = st.height - groundHRef.current
      const yr = cameraYRange(groundScreen)
      if (oy === null) oy = yr.lo
      const viewTop = header ? header.getBoundingClientRect().bottom : 0
      const nextOy = st.held ? Math.max(yr.lo, Math.min(yr.hi, oy)) : cameraYStep(oy, { worldY: st.y - oy, groundScreen, viewTop, dt, lag: S.lag })
      const others = extras?.current ? [...extras.current.values()] : []
      if (next !== camX || nextOy !== oy) {
        engine.shift(camX - next, nextOy - oy)
        others.forEach(o => o.shift(camX - next, nextOy - (oy as number)))
        camX = next; oy = nextOy
      }
      // her ground is the world's, wherever the camera puts it on the screen
      if (Math.abs(st.groundY - (G + oy)) > 0.01) engine.setGroundHeight(st.height - G - oy)
      st = engine.getState()
      const camY = oy
      const walls = cameraBounds(camX, { mode: S.camera, viewW, worldW })
      engine.setBounds(walls)
      others.forEach(o => {
        const os = o.getState()
        if (Math.abs(os.groundY - (G + camY)) > 0.01) o.setGroundHeight(os.height - G - camY)
        o.setBounds(walls)
      })
      if (worldRef.current) {
        worldRef.current.style.transform = `translate3d(${-camX}px,${camY}px,0)`
        // the parallax layers follow the camera at their own rates (parallax.tsx)
        worldRef.current.style.setProperty("--camx", String(Math.round(camX * 10) / 10))
      }
      if (fgRef?.current) fgRef.current.style.transform = `translate3d(${-camX}px,${camY}px,0)`
      // the layers above the chicken and the editor's handles follow the same camera
      moveLiveCamera(camX, camY)

      // ---------- aim ----------
      const act = engine.getActions()
      const an = controls.analog
      const devs = devicesRef.current
      if (noMouse() && (mouse || mouseBtn.fire || mouseBtn.melee)) { mouse = null; mouseBtn.fire = false; mouseBtn.melee = false }
      const rightStick = stickFor(devs, 1, an.deadzoneR), leftStick = stickFor(devs, 0, an.deadzoneL) ?? readTouchMoveStick(an.deadzoneL)

      // ---------- the inventory wheel: hold its button, point at an item (mouse, right stick, touch) and let go ----------
      const slots = combat.inventory, nSlots = slots.length
      if (nSlots !== slotsShown) { slotsShown = nSlots; setInvSlots(nSlots) }
      let wheelPick = 0
      const showWheel = (on: boolean) => {
        if (wh.open === on) return
        wh.open = on; wh.sticky = false; wh.at = now; wh.hover = -1
        wheelPtr.current = null; wheelTap.current = null
        setWheelOpen(on)
      }
      const wheelDown = act.itemWheel && !prev.itemWheel, wheelUp = !act.itemWheel && !!prev.itemWheel
      if (wheelDown) {
        if (!wh.open) showWheel(true)
        else { if (wh.hover >= 0) wheelPick = wh.hover + 1; showWheel(false) }
      } else if (wheelUp && wh.open && !wh.sticky) {
        // let go on an item: equip it; a quick tap with nothing chosen leaves the wheel open
        if (wh.hover >= 0) { wheelPick = wh.hover + 1; showWheel(false) }
        else if (now - wh.at < 300) wh.sticky = true
        else showWheel(false)
      }
      if (wh.open) {
        const g = wheelGeom()
        let hov = wh.hover >= nSlots ? -1 : wh.hover
        // the right stick (or the on-screen one) pushed far enough points at a slice; at rest it keeps the last one
        const stick = rightStick ?? (touchAim.current && touchAim.current.mag > 0.4 ? touchAim.current : null)
        const ptr = wheelPtr.current
        if (stick && (stick.mag ?? 1) > 0.5) hov = wheelSliceAt(Math.atan2(stick.y, stick.x), nSlots)
        else if (ptr && Math.hypot(ptr.x - g.cx, ptr.y - g.cy) > g.rIn * 0.35) hov = wheelSliceAt(Math.atan2(ptr.y - g.cy, ptr.x - g.cx), nSlots)
        if (wheel) { hov = wrapSlot((hov < 0 ? combat.current : hov) + Math.sign(wheel), nSlots); wheel = 0 }
        if (hov !== wh.hover) { wh.hover = hov; if (hov >= 0) playWeaponSound("tick", null) }
        // a click or a tap: on the ring equips that slice, anywhere else just closes
        const tap = wheelTap.current
        wheelTap.current = null
        if (tap) {
          const r = Math.hypot(tap.x - g.cx, tap.y - g.cy)
          if (r >= g.rIn * 0.6 && r <= g.rOut * 1.12) wheelPick = wheelSliceAt(Math.atan2(tap.y - g.cy, tap.x - g.cx), nSlots) + 1
          showWheel(false)
        }
        if (escape || slotPick) showWheel(false)
      }
      escape = false
      // brooding with an item in the wing is aiming: she stays put and the aim is locked while brood is held
      const armed = !!combat.inventory[combat.current]
      const aimLock = act.down && armed && st.grounded
      const keys = { x: (act.right ? 1 : 0) - (act.left ? 1 : 0), y: (act.crouch || (act.down && !aimLock) ? 1 : 0) - (act.up ? 1 : 0) }
      // the wheel's stick choices are not aim: while it is open the aim stick is not held
      const liveStick = wh.open ? null : rightStick ?? touchAim.current
      if (liveStick) { heldStick = { stick: liveStick, touch: !rightStick }; stickOwner.moved(1, now); owner.release() }
      // only the left stick takes the aim back from a still mouse / aim stick: the movement keys never aim
      if (leftStick) { owner.otherAim(now, S.aimRelease); stickOwner.otherAim(now, S.aimRelease) }
      const held = !liveStick && stickOwner.owns ? heldStick : null
      // her shoulder as drawn (it turns with her body on walls)
      const origin = st.shoulder
      // a quick tap on the on-screen right stick: aim at the nearest enemy (dummies when none is left) and fire for a moment
      if (tapShot.current) { if (!wh.open) autoUntil = now + 260; tapShot.current = 0 }
      let autoAt: { x: number; y: number } | null = null
      if (now < autoUntil) {
        let best = Infinity
        const pick = (kinds: string[]) => combat.targets.forEach(t => {
          if (!kinds.includes(t.kind) || t.deadT > 0 || t.state === "dead" || t.state === "converted") return
          const cx = t.x - camX, cy = t.y - t.h / 2 + camY, dd = Math.hypot(cx - origin.x, cy - origin.y)
          if (dd < best) { best = dd; autoAt = { x: cx, y: cy } }
        })
        pick(["alien", "zombie"])
        if (!autoAt) pick(["dummy"])
      }
      // while the wheel is open the mouse and the right stick choose items, not the aim
      aim = resolveAim({
        rightStick: wh.open ? null : rightStick ?? (held && !held.touch ? held.stick : null), mouse: autoAt ?? (owner.owns && !wh.open ? mouse : null),
        touch: wh.open ? null : touchAim.current ?? (held?.touch ? held.stick : null), leftStick, keys, origin,
        face: st.face, grounded: st.grounded, aimLock, magnet: an.magnet, magnetDeg: an.magnetDeg,
      })
      const d = combat.def()
      // the aim starts at the muzzle: with the cursor, turn the item until the line through its muzzle
      // (not her shoulder) passes over the cursor
      const tgt = aim.target
      if (armed && tgt && d.muzzleY) {
        for (let i = 0; i < 3; i++) {
          const o = engine.heldPoint(aim.angle, 0, d.muzzleY)
          const a = Math.atan2(tgt.y - o.y, tgt.x - o.x)
          aim = { ...aim, angle: a, dx: Math.cos(a), dy: Math.sin(a) }
        }
      }
      // a jump shakes the aim for a moment (a super jump, crouch + jump, more): a wobble that fades out
      if (!st.grounded && st.vy < -250 && st.vy < prevVy - 250) {
        const amp = act.crouch ? S.superJumpShake : S.jumpShake
        if (amp > 0 && amp >= shake) { shake = amp; shakeT = 0 }
      }
      prevVy = st.vy
      if (shake > 0) {
        shakeT += dt
        const k = Math.max(0, 1 - shakeT / 0.45), t = shakeT * 2 * Math.PI
        if (k <= 0) shake = 0
        else {
          const w = Math.sin(t * 13 + shakePhase[0]) * 0.55 + Math.sin(t * 21 + shakePhase[1]) * 0.3 + Math.sin(t * 34 + shakePhase[2]) * 0.15
          const a = aim.angle + (shake * k * k * w * Math.PI) / 180
          aim = { ...aim, angle: a, dx: Math.cos(a), dy: Math.sin(a) }
        }
      }
      const muzzleAt = (a: number) => armed ? engine.heldPoint(a, d.muzzleX, d.muzzleY) : origin
      engine.setGame({
        // brooding does not freeze her: "frente + chocar" walks at its own speed (0 keeps her still), aiming with the item
        moveLock: false,
        aimFace: aim.secondary && Math.abs(aim.dx) > 0.2 ? Math.sign(aim.dx) : null,
        backpedal: S.backpedal,
        speedMult: d.weight,
      })

      // ---------- combat (world coordinates) ----------
      const fire = !wh.open && (act.fire || mouseBtn.fire || (!!autoAt && now < autoUntil)), melee = !wh.open && (act.melee || mouseBtn.melee)
      let pick = 0
      if (act.nextItem && !prev.nextItem) pick = 1
      if (act.prevItem && !prev.prevItem) pick = -1
      if (wheel) { pick = wheel > 0 ? 1 : -1; wheel = 0 }
      const input = {
        fire, firePressed: fire && !prev.fire, melee: melee && !prev.melee,
        throwHeld: act.throw && !wh.open, throwReleased: !act.throw && !!prev.throw && !wh.open,
        reload: act.reload && !prev.reload, pick: wh.open ? 0 : pick, slot: wheelPick || slotPick || slotTap.current, grab: act.grab && !prev.grab, grabHeld: act.grab,
      }
      slotPick = 0; slotTap.current = 0
      prev = { ...act, fire, melee }
      const boxes = worldBoxes
      const body = { x: st.x + camX, y: st.y - camY, face: st.face, scale: st.scale, grounded: st.grounded, state: st.state, vx: st.vx }
      const worldOrigin = { x: origin.x + camX, y: origin.y - camY }
      // the enemies move inside the scene she is in: the same for every screen size (and every player)
      const sceneL = Math.min(sceneAt(body.x), worldScenes(S.screens) - 1) * SCENE_W
      combat.setView(sceneL, sceneL + SCENE_W)
      let gongHit = false, resetHit = false
      combat.pressed.splice(0).forEach(id => {
        if (id === "gong") gongHit = true
        else if (id === "reset") resetHit = true
        else if (id === "aliens") combat.spawnAliens(G, body.x)
        else if (id === "zombies") combat.spawnZombies(G, body.x, horde.zombies)
        else if (id === "zcount") horde.zombies = ZOMBIE_COUNTS[(ZOMBIE_COUNTS.indexOf(horde.zombies) + 1) % ZOMBIE_COUNTS.length]
        else if (id === "pattern") horde.pattern = (horde.pattern + 1) % ALIEN_PATTERNS.length
      })
      buttonLabels.aliens = "SOLTAR ALIENS"; buttonLabels.pattern = `PADRÃO: ${ALIEN_PATTERNS[horde.pattern].label.toUpperCase()}`
      buttonLabels.zombies = "SOLTAR ZUMBIS"; buttonLabels.zcount = `ZUMBIS: ${horde.zombies}`
      const m0 = muzzleAt(d.turnRate > 0 ? combat.aimAngle : aim.angle)
      combat.step(dt, body, worldOrigin, { x: m0.x + camX, y: m0.y - camY }, aim.angle, input, boxes, G, (vx, vy) => engine.impulse(vx, vy))
      // the items each local player stands on: a blue (take / swap) or grey (equip) outline with that player's grab key
      pickupMarks.clear()
      markHover(combat, grabLabel(controls, devs))

      // ---------- the other local players: their own items (a loadout each), in the same world ----------
      const extraList = extras?.current ? [...extras.current.entries()] : []
      extraList.forEach(([id, eng]) => {
        const xs = eng.getState(), xa = eng.getActions(), xp = extraPrev.get(id) ?? {}
        combat.use(id)
        const xd = combat.def(), xArmed = !!combat.inventory[combat.current]
        // aim: their gamepad's right stick; else up (looking up) or straight ahead
        const devs = eng.getDevices()
        const rs = stickFor(devs, 1, an.deadzoneR)
        const ahead = xs.face >= 0 ? 0 : Math.PI
        const angle = rs ? Math.atan2(rs.y, rs.x) : xa.up ? (xs.face >= 0 ? -Math.PI / 3 : -Math.PI * 2 / 3) : ahead
        const xo = xs.shoulder
        const xm = xArmed ? eng.heldPoint(xd.turnRate > 0 ? combat.aimAngle : angle, xd.muzzleX, xd.muzzleY) : xo
        let xpick = 0
        if (xa.nextItem && !xp.nextItem) xpick = 1
        if (xa.prevItem && !xp.prevItem) xpick = -1
        const xin = {
          fire: xa.fire, firePressed: xa.fire && !xp.fire, melee: xa.melee && !xp.melee,
          throwHeld: xa.throw, throwReleased: !xa.throw && !!xp.throw, reload: xa.reload && !xp.reload, pick: xpick, slot: 0, grab: xa.grab && !xp.grab,
        }
        extraPrev.set(id, xa)
        extraAim.set(id, { muzzle: xm, angle: xd.turnRate > 0 ? combat.aimAngle : angle, reach: rs ? 0.45 + 0.55 * rs.mag : 1 })
        const xbody = { x: xs.x + camX, y: xs.y - camY, face: xs.face, scale: xs.scale, grounded: xs.grounded, state: xs.state, vx: xs.vx }
        combat.step(dt, xbody, { x: xo.x + camX, y: xo.y - camY }, { x: xm.x + camX, y: xm.y - camY }, angle, xin, boxes, G, (vx, vy) => eng.impulse(vx, vy), { world: false })
        markHover(combat, grabLabel(controls, devs))
        eng.setGame({ moveLock: false, aimFace: null, backpedal: S.backpedal, speedMult: xd.weight })
        const xh = combat.inventory[combat.current], xsw = combat.swing
        const xart = xh ? ITEM_SVG[xh.item] : undefined
        eng.setHeld(xart ? { svg: xart, angle: combat.aimAngle, kick: combat.kick } : null)
        eng.setSwing(xsw ? { angle: swingAngle(xsw), reach: xsw.range, t: Math.min(1, xsw.t / (xsw.time * 0.3), (xsw.time - xsw.t) / (xsw.time * 0.3)) } : null)
      })
      extraPrev.forEach((_, id) => { if (!extras?.current?.has(id)) { extraPrev.delete(id); extraAim.delete(id); combat.drop(id) } })
      combat.use("p1")

      // ---------- the temple's mini-game ----------
      const tL = templeScene(S.screens) * SCENE_W
      const inTemple = body.x >= tL
      const events = combat.music.events.splice(0)
      const io: TempleIO = {
        targets: combat.targets, music: combat.music, sceneL: tL, groundY: G, inside: inTemple, body: { x: body.x, y: body.y, scale: body.scale }, boxes,
        gongHit, resetHit, firePressed: input.firePressed, beats: events.filter(e => e.kind === "beat").map(e => e.n),
        fx: { burst: combat.burst, text: combat.addText },
        hurt: dir => engine.impulse(dir * 420, -380),
        sound: e => templeSounds.push(e),
      }
      temple.step(dt, io)
      templeSounds.splice(0).forEach(e => playTempleSound(e, mixGain("effects")))
      const tp = temple.state.phase
      if (tp !== templeShown) { templeShown = tp; if (worldRef.current) worldRef.current.dataset.temple = tp }
      // a cleared stage: fireworks over the temple
      if ((tp === "cleared" || tp === "victory") && temple.state.t < (tp === "victory" ? 5 : 2.6) && Math.random() < dt * (tp === "victory" ? 9 : 6)) {
        const colors = ["#ffd166", "#ff4d6d", "#7bdff2", "#7bd88f", "#c77dff"]
        combat.burst(tL + 200 + Math.random() * (SCENE_W - 400), 140 + Math.random() * 320, 34, colors[Math.floor(Math.random() * colors.length)], 320, 4)
      }
      templeDraw.charges.clear()
      temple.state.aliens.forEach(a => { if (a.charge > 0) templeDraw.charges.set(a.id, a.charge) })

      // ---------- music: the zone of the scene she is in sets key, scale and tempo; ambience on its beat ----------
      // (in the temple: the stage's music, or the temple at rest)
      const zone = inTemple ? temple.music?.zone ?? TEMPLE_IDLE : ZONES[sceneAt(worldX) % ZONES.length]
      combat.music.setZone(zone)
      combat.setQuantize(S.quantize)
      setMusicVolumes(mixGain("notes"), mixGain("ambience"))
      if (combat.music.zone !== zoneShown) { zoneShown = combat.music.zone; zoneBanner = 2.5 }
      zoneBanner = Math.max(0, zoneBanner - dt)
      const templeZone = combat.music.zone.id.startsWith("templo")
      events.forEach(e => {
        if (mixGain("ambience") <= 0) return
        if (e.kind === "bar") drone.set(combat.music.chord()[0])
        if (e.kind === "step") {
          if (templeZone) templeAmbience(temple.music && combat.music.zone.id !== "templo" ? temple.music : null, e.n % 16, combat.music.bar, combat.music.chord(), combat.music.secondsPerBeat())
          else ambience(combat.music.zone, e.n % 16, combat.music.secondsPerBeat())
        }
      })
      if (mixGain("ambience") <= 0) drone.set(null)

      // ---------- sound ----------
      setWeaponVolume(mixGain("weapons"))
      combat.sounds.splice(0).forEach(e => playWeaponSound(e.kind, e.item))
      // aiming in (brood with an item): a soft sound on the weapons that have one
      if (aimLock && !wasLocked) playWeaponSound("aim", combat.inventory[combat.current]?.item ?? null)
      wasLocked = aimLock

      // ---------- draw ----------
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      // the world's things stay under the header, like the world itself
      const inWorld = () => { ctx.save(); ctx.beginPath(); ctx.rect(0, viewTop, viewW, st.height - viewTop); ctx.clip(); ctx.translate(0, camY) }
      lookTargets.length = 0
      lookTargets.push({ x: body.x, y: body.y - 170 * st.scale })
      inWorld()
      drawWorld(ctx, combat, camX)
      drawTempleShots(ctx, temple, camX)
      ctx.restore()
      const ang = combat.aimAngle, adx = Math.cos(ang), ady = Math.sin(ang)
      drawSwing(ctx, combat, origin)
      // the item itself is drawn inside her rig, in front of her body and of the wing; in a swing the wing
      // turns with the blow and stretches to its reach, and the item rides on the wing tip
      const h = combat.inventory[combat.current], sw = combat.swing
      const art = h ? ITEM_SVG[h.item] : undefined
      // charging a throw: the item points where it will fly (all the way round) and is pulled back the other
      // way as the charge grows, like a slingshot; at full charge it trembles
      const charge = h && !sw ? combat.throwCharge : 0
      const pull = charge > 0 ? 6 + 30 * charge + (charge >= 1 ? Math.sin(now / 25) * 1.5 : 0) : 0
      // the violin: while it plays, the bow goes back and forth across the strings with the mouse's movement
      // (a full stroke every BOW_STROKE_PX), or once a beat when the mouse rests or another control aims
      if (combat.beam) {
        const push = now - bowing.movedAt < 150 ? bowing.travel / BOW_STROKE_PX : dt / combat.music.secondsPerBeat()
        bowing.stroke += bowing.dir * push
        while (bowing.stroke > 1 || bowing.stroke < 0) {
          if (bowing.stroke > 1) { bowing.stroke = 2 - bowing.stroke; bowing.dir = -1 } else { bowing.stroke = -bowing.stroke; bowing.dir = 1 }
        }
      }
      bowing.travel = 0
      engine.setHeld(art ? { svg: art, angle: charge > 0 ? combat.throwAngle : ang, kick: combat.kick + pull, bow: h && d.beam && charge <= 0 ? { x: VIOLIN_BOW_X, stroke: bowing.stroke } : null } : null)
      engine.setSwing(sw ? { angle: swingAngle(sw), reach: sw.range, t: Math.min(1, sw.t / (sw.time * 0.3), (sw.time - sw.t) / (sw.time * 0.3)) } : null)
      const muzzle = muzzleAt(ang)
      const dist = aim.target ? Math.hypot(aim.target.x - muzzle.x, aim.target.y - muzzle.y) : S.reticleDist * (aim.source === "rightStick" || aim.source === "touch" ? 0.45 + 0.55 * aim.strength : 1)
      // (while the aim shakes the reticle shakes with it, off the cursor)
      const free = d.turnRate > 0 || !aim.target || shake > 0
      const rx = free || !aim.target ? muzzle.x + adx * dist : aim.target.x, ry = free || !aim.target ? muzzle.y + ady * dist : aim.target.y
      // weapons whose reticle shows where the shot lands: the path a shot fired now would take
      let path: { x: number; y: number }[] | null = null
      if (armed && ["laser", "impact", "grenade", "bow"].includes(d.reticle)) {
        const power = d.fireMode === "charge" ? d.chargeMin + (1 - d.chargeMin) * combat.fireCharge : 1
        path = combat.predict({ x: muzzle.x + camX, y: muzzle.y - camY }, ang, power, { boxes, groundY: G }).points.map(p => ({ x: p.x - camX, y: p.y + camY }))
      }
      inWorld()
      drawBeam(ctx, combat, camX)
      extraList.forEach(([id]) => { combat.use(id); drawBeam(ctx, combat, camX) })
      combat.use("p1")
      ctx.restore()
      extraList.forEach(([id, eng]) => { combat.use(id); drawSwing(ctx, combat, eng.getState().shoulder) })
      combat.use("p1")
      // the projectile's path shows per item: hidden, with the fire button held, held or aim locked, always
      const shows = (v: PathShow) => armed && (v === "always" || (v !== "off" && fire) || (v === "holdAim" && aimLock))
      const showPath = shows(d.pathShow), showLand = shows(d.landShow)
      const tints = colorsRef.current
      drawReticle(ctx, combat, muzzle, rx, ry, dist, combat.spread(body), aimLock, st.scale, path, showPath, showLand, tints?.p1 ?? "#ffffff")
      if (charge > 0) drawThrowPath(ctx, combat.predictThrow({ x: origin.x + camX, y: origin.y - camY }, { boxes, groundY: G }).map(p => ({ x: p.x - camX, y: p.y + camY })))
      // the other local players' reticles, each in their own color, where their item points
      extraList.forEach(([id, eng]) => {
        const at = extraAim.get(id)
        if (!at) return
        combat.use(id)
        const xd = combat.def(), xs = eng.getState()
        const xArmed = !!combat.inventory[combat.current]
        const xdist = S.reticleDist * at.reach
        const xrx = at.muzzle.x + Math.cos(at.angle) * xdist, xry = at.muzzle.y + Math.sin(at.angle) * xdist
        let xpath: { x: number; y: number }[] | null = null
        if (xArmed && ["laser", "impact", "grenade", "bow"].includes(xd.reticle)) {
          const power = xd.fireMode === "charge" ? xd.chargeMin + (1 - xd.chargeMin) * combat.fireCharge : 1
          xpath = combat.predict({ x: at.muzzle.x + camX, y: at.muzzle.y - camY }, at.angle, power, { boxes, groundY: G }).points.map(p => ({ x: p.x - camX, y: p.y + camY }))
        }
        const xFire = !!extraPrev.get(id)?.fire
        const xShow = xArmed && (xd.pathShow === "always" || (xd.pathShow !== "off" && xFire))
        const xLand = xArmed && (xd.landShow === "always" || (xd.landShow !== "off" && xFire))
        const xbody = { x: xs.x + camX, y: xs.y - camY, face: xs.face, scale: xs.scale, grounded: xs.grounded, state: xs.state, vx: xs.vx }
        drawReticle(ctx, combat, at.muzzle, xrx, xry, xdist, combat.spread(xbody), false, xs.scale, xpath, xShow, xLand, tints?.[id] ?? "#ffffff")
      })
      combat.use("p1")
      if (zoneBanner > 0 && !inTemple) drawZoneBanner(ctx, combat.music.zone, zoneBanner)
      // one inventory per local player, stacked in the top right corner (the avatars sit to their right)
      const invOff = getTouchLayout().offsets.inventory
      drawInventory(ctx, combat, 0, invOff)
      extraList.forEach(([id], i) => { combat.use(id); drawInventory(ctx, combat, i + 1, invOff) })
      combat.use("p1")
      if (wh.open || wheelDrawn) { wctx.clearRect(0, 0, window.innerWidth, window.innerHeight); wheelDrawn = false }
      if (wh.open) { drawWheel(wctx, combat, wh.hover, Math.min(1, (now - wh.at) / 110)); wheelDrawn = true }
      drawTempleHud(ctx, temple, combat.music, inTemple, INV_TOP + INV_SIZE + 12)
      if (hudRef.current) hudRef.current.style.display = S.debug ? "" : "none"
      if (hudRef.current && S.debug) {
        const h = combat.inventory[combat.current]
        const item = h ? `${d.name}${d.mag > 0 ? ` ${h.ammo}/${d.mag}` : ""}${d.durability > 0 ? ` · ${h.durability} golpes` : ""}${combat.reloading ? " · recarregando" : ""}` : "mãos vazias (asa)"
        const k = combat.kills, cv = combat.converted
        const shown = h && d.mag > 0 ? Math.ceil(h.ammo) : 0
        const item2 = h ? item.replace(`${h.ammo}/`, `${shown}/`) : item
        const m = combat.music
        hudRef.current.textContent = `${item2} · ${m.zone.name} ${chordName(m.chord())} ${[0, 1, 2, 3].map(i => (Math.floor(m.beat) % 4 === i ? "●" : "·")).join("")}${combat.enemies || k.aliens || k.zombies || cv.birds || cv.people ? ` · inimigos: ${combat.enemies} · aliens ${k.aliens} · zumbis ${k.zombies} · passarinhos ${cv.birds} · curados ${cv.people} · mordidas ${k.bites}` : ""} · mira: ${SOURCE_LABEL[aim.source]}${aimLock ? " (travada)" : ""} · ${S.camera === "follow" ? "câmera seguindo" : S.camera === "scenes" ? `cena ${sceneAt(worldX) + 1}` : "câmera fixa"}`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      unsub()
      unsubItems()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("contextmenu", onMenu)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", fit)
      engine.setGame({ gameMode: false, moveLock: false, aimFace: null, backpedal: 1, speedMult: 1 })
      engine.setHeld(null)
      engine.setSwing(null)
      engine.setBounds(null)
      drone.set(null)
      templeDraw.temple = null
      if (worldRef.current) delete worldRef.current.dataset.temple
      document.body.classList.remove("pigchicken-play")
      if (camX || oy !== null) engine.shift(camX, oy === null ? 0 : cameraYRange(window.innerHeight - groundHRef.current).lo - oy)
      engine.setGroundHeight(groundHRef.current)
      if (worldRef.current) worldRef.current.style.transform = ""
      moveLiveCamera(0, 0)
    }
  }, [engine, worldRef, spawnX, fgRef])

  return (
    <>
      <style>{`body.pigchicken-play { cursor: none; } body.pigchicken-play :is(header, aside, [role="dialog"], button, input, select, textarea, a, label, summary, [data-chicken-ignore]) { cursor: auto; } body.pigchicken-play :is(button, a, select, summary, label) { cursor: pointer; }`}</style>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[195] h-full w-full" />
      <canvas ref={wheelCanvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[205] h-full w-full" />
      <div ref={hudRef} className="pointer-events-none absolute left-3 z-[120] font-mono text-[11px] text-[#93a79a]" style={{ bottom: groundHeight + 10 }} />
      {/* the inventory bar is drawn on the canvas; these invisible slots sit on top of it so a click or a tap
          equips that item. In edit mode the Movable's drag handle covers them, so dragging never equips. */}
      {engine && (
        <Movable id="inventory" className="pointer-events-none fixed z-[190]" style={{ right: invRight, top: invRowY(0), width: INV_W(invSlots), height: INV_SIZE }}>
          {!editing && (
            <div data-chicken-ignore className="flex h-full" style={{ gap: INV_GAP }}>
              {Array.from({ length: invSlots }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  aria-label={`Equipar item ${i + 1} do inventário`}
                  className="pointer-events-auto h-full shrink-0 rounded-sm bg-transparent"
                  style={{ width: INV_SIZE, touchAction: "none" }}
                  // pointerdown (not click): instant on touch, and preventDefault keeps focus off the button so Space stays a game key
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); slotTap.current = i + 1 }}
                  onContextMenu={e => e.preventDefault()}
                />
              ))}
            </div>
          )}
        </Movable>
      )}
      {/* the inventory wheel (drawn on the canvas): this layer, under the touch controls, takes the pointer while it is open */}
      {engine && wheelOpen && (
        <div
          data-chicken-ignore
          aria-label="Roda do inventário"
          className="pointer-events-auto fixed inset-0 z-[189]"
          style={{ touchAction: "none" }}
          onPointerMove={e => { wheelPtr.current = { x: e.clientX, y: e.clientY } }}
          onPointerDown={e => { e.preventDefault(); wheelPtr.current = { x: e.clientX, y: e.clientY }; wheelTap.current = { x: e.clientX, y: e.clientY } }}
          onContextMenu={e => e.preventDefault()}
        />
      )}
      {showTouch && engine && <TouchAimStick engine={engine} aimRef={touchAim} tapRef={tapShot} bottom={lifted ? 16 + STICK + 12 : STICK_BOTTOM} grabOffer={grabOffer} />}
    </>
  )
}

// ---------- on-screen right stick (twin-stick): pushing aims, pushing to the edge fires ----------
const STICK = 112, KNOB = 48, STICK_BOTTOM = 64 + 112 + 24, FIRE_AT = 0.85

function TouchAimStick({ engine, aimRef, tapRef, bottom, grabOffer }: { engine: ChickenEngine; aimRef: React.MutableRefObject<Stick | null>; tapRef: React.MutableRefObject<number>; bottom: number; grabOffer: "" | "take" | "equip" }) {
  const { editing } = useTouchLayout()
  const press = useRef<{ t: number; x: number; y: number; far: boolean } | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const pid = useRef<number | null>(null)
  const firing = useRef(false)
  const setFire = (on: boolean) => { if (firing.current !== on) { firing.current = on; engine.setVirtual("fire", on) } }
  const move = (e: ReactPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const max = (STICK - KNOB) / 2 + 8, len = Math.hypot(dx, dy)
    if (len > max) { dx *= max / len; dy *= max / len }
    setKnob({ x: dx, y: dy })
    const mag = Math.min(1, len / max)
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) press.current.far = true
    aimRef.current = mag > 0.15 ? { x: dx / (len || 1), y: dy / (len || 1), mag } : null
    setFire(mag >= FIRE_AT)
  }
  const release = (e?: ReactPointerEvent) => {
    // a quick touch that did not drag is a tap: shoot the nearest enemy
    const p = press.current; press.current = null
    if (e && e.type === "pointerup" && p && !p.far && performance.now() - p.t < 250) tapRef.current = performance.now()
    pid.current = null; setKnob({ x: 0, y: 0 }); aimRef.current = null; setFire(false)
  }
  useEffect(() => () => { aimRef.current = null; if (firing.current) engine.setVirtual("fire", false) }, [engine, aimRef])
  const button = (label: string, action: ChickenAction, tone = "border-white/30 bg-white/10 text-white/80") => (
    <button
      type="button"
      aria-label={label}
      className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-[9px] uppercase active:bg-white/35 ${tone}`}
      style={{ touchAction: "none" }}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engine.setVirtual(action, true) }}
      onPointerUp={() => engine.setVirtual(action, false)}
      onPointerCancel={() => engine.setVirtual(action, false)}
      onContextMenu={e => e.preventDefault()}
    >
      {label}
    </button>
  )
  return (
    <div data-chicken-ignore className="pointer-events-none fixed inset-0 z-[190] select-none" style={{ touchAction: "none" }}>
      <div className="absolute flex items-center gap-3" style={{ right: 20, bottom, height: STICK }}>
        {/* standing on an item: grab it (blue) or equip the one she already carries (grey) */}
        {(grabOffer || editing) && <Movable id="grab" className="relative">{button((grabOffer || "take") === "take" ? "Pegar" : "Equipar", "grab", (grabOffer || "take") === "take" ? "border-[#4cc9f0] bg-[#4cc9f0]/20 text-white" : "border-[#9aa0a8] bg-[#9aa0a8]/20 text-white")}</Movable>}
        <Movable id="items" className="relative flex flex-col gap-2">
          {button("Punch", "melee")}
          {button("Throw", "throw")}
          {button("Roda", "itemWheel")}
        </Movable>
        <Movable id="aim" className="relative">
        <div
          ref={ref}
          aria-label="Analógico de mira"
          className="pointer-events-auto relative rounded-full border-2 border-[#ffd166]/50 bg-white/10 backdrop-blur-[2px]"
          style={{ width: STICK, height: STICK, touchAction: "none" }}
          onPointerDown={e => { pid.current = e.pointerId; press.current = { t: performance.now(), x: e.clientX, y: e.clientY, far: false }; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
          onPointerMove={e => { if (pid.current === e.pointerId) move(e) }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div className="absolute rounded-full border-2 border-white/40" style={{ inset: (STICK - STICK * FIRE_AT) / 2 - 4, opacity: 0.35 }} />
          <div className="absolute rounded-full border-2 border-white/50 bg-white/30" style={{ width: KNOB, height: KNOB, left: (STICK - KNOB) / 2 + knob.x, top: (STICK - KNOB) / 2 + knob.y }} />
        </div>
        </Movable>
      </div>
    </div>
  )
}

// the violin's bow crosses the strings between the bridge and the fingerboard: rig units along the violin from
// her shoulder (the drawing's grip), and the mouse travel (px) for one full stroke of the bow
const VIOLIN_BOW_X = -23
const BOW_STROKE_PX = 260

// ---------- drawing (canvas, screen pixels) ----------
type Ctx = CanvasRenderingContext2D

// flat item art, pointing right with the grip at (0, 0)
// an item's art fitted into maxW x maxH around the current origin (centred), or with its grip at the origin
function drawItem(ctx: Ctx, item: ItemId, maxW: number, maxH: number, atGrip = false) {
  const im = itemImage(item)
  if (!im) return
  const [x, y, w, h] = im.box
  const k = Math.min(maxW / w, maxH / h)
  if (atGrip) ctx.drawImage(im.img, x * k, y * k, w * k, h * k)
  else ctx.drawImage(im.img, -w * k / 2, -h * k / 2, w * k, h * k)
}

// ---------- the zone's ambience: percussion on the sixteenths (the drone follows the bars) ----------
function ambience(zone: Zone, step: number, spb: number) {
  const sw = zone.feel === "swing" && step % 4 === 2 ? (spb / 4) * 0.33 : 0
  if (zone.feel === "half") {
    if (step === 0) playDrum("kick")
    if (step === 8) playDrum("snare")
    if (step % 4 === 0) playDrum("hat", 0, 0.7)
    if (step === 14) playDrum("openHat", 0, 0.6)
    return
  }
  if (zone.id === "ceu") {
    // the sky: only a soft shaker and a kick per bar
    if (step === 0) playDrum("kick", 0, 0.6)
    if (step % 2 === 0) playDrum("shaker", sw, step % 4 === 0 ? 0.8 : 0.5)
    return
  }
  if (step === 0 || step === 8 || (zone.feel === "swing" && step === 10)) playDrum("kick")
  if (step === 4 || step === 12) playDrum(zone.feel === "swing" ? "clap" : "snare")
  if (step % 2 === 0) playDrum("hat", sw, step % 4 === 0 ? 0.9 : 0.6)
  else if (zone.id === "feira") playDrum("shaker", 0, 0.4)
}

// a note in flight: its symbol in the colour of its scale degree, swaying, with a short trail, pulsing on the beat
function drawNote(ctx: Ctx, b: Combat["bullets"][number], x: number, pulse: number) {
  const n = b.note!
  const len = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / len, uy = b.vy / len
  const sway = (t: number) => Math.sin(t * Math.PI * 5 + n.phase) * n.wave
  const size = b.size * 2.8 * (1 + 0.25 * pulse)
  ctx.font = `bold ${Math.round(size)}px ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (let k = 3; k >= 0; k--) {
    const back = k * 0.025, o = sway(b.t - back)
    const px = x - b.vx * back - uy * o, py = b.y - b.vy * back + ux * o
    ctx.globalAlpha = k === 0 ? 1 : 0.35 - k * 0.09
    if (k === 0) { ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.strokeText(n.sym, px, py) }
    ctx.fillStyle = n.color; ctx.fillText(n.sym, px, py)
  }
  ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic"
}

// the violin's beam: a vibrating string of light from the muzzle, with notes running along it
function drawBeam(ctx: Ctx, combat: Combat, camX: number) {
  const b = combat.beam
  if (!b) return
  const x1 = b.x1 - camX, x2 = b.x2 - camX, len = Math.hypot(x2 - x1, b.y2 - b.y1) || 1
  const ux = (x2 - x1) / len, uy = (b.y2 - b.y1) / len, t = performance.now() / 1000
  ctx.save()
  ctx.shadowColor = b.color; ctx.shadowBlur = 12
  ;[[5, 0.25], [2, 0.9]].forEach(([w, a]) => {
    ctx.strokeStyle = b.color; ctx.globalAlpha = a; ctx.lineWidth = w
    ctx.beginPath()
    for (let s = 0; s <= len; s += 8) {
      const o = Math.sin(s * 0.08 - t * 40) * 3 * Math.sin((s / len) * Math.PI)
      const px = x1 + ux * s - uy * o, py = b.y1 + uy * s + ux * o
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
  })
  ctx.globalAlpha = 1; ctx.shadowBlur = 0
  ctx.font = "bold 16px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = b.color
  for (let k = 0; k < 4; k++) { const s = ((t * 260 + k * len / 4) % len); ctx.fillText(k % 2 ? "♪" : "♩", x1 + ux * s, b.y1 + uy * s - 8) }
  ctx.restore()
}

function drawZoneBanner(ctx: Ctx, zone: Zone, life: number) {
  ctx.save()
  ctx.globalAlpha = Math.min(1, life, (2.5 - life) * 4)
  ctx.font = "bold 15px ui-monospace, monospace"; ctx.textAlign = "center"
  const text = `♪ ${zoneLabel(zone)}`, w = ctx.measureText(text).width + 28
  const x = window.innerWidth / 2, y = 158
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - w / 2, y - 20, w, 30)
  ctx.fillStyle = zone.color; ctx.fillText(text, x, y)
  ctx.restore()
}

// the bird an alien becomes: original pixel art, two flaps. '#' body, 'o' eye, '>' beak
const BIRD_FRAMES = [
  [
    "..#......#.",
    "..##....##.",
    "...##..##..",
    "....####...",
    "..#####o#>>",
    ".########..",
    "...####....",
    "....#.#....",
  ],
  [
    "...........",
    "...........",
    "....####...",
    "..#####o#>>",
    "##########.",
    "#.######...",
    "...####....",
    "....#.#....",
  ],
]
function drawBird(ctx: Ctx, c: Combat["critters"][number], x: number) {
  const f = BIRD_FRAMES[Math.floor(c.t / 0.12) % 2], p = 4
  ctx.save(); ctx.translate(x, c.y); ctx.scale(c.face < 0 ? -1 : 1, 1)
  f.forEach((row, r) => { for (let i = 0; i < row.length; i++) {
    const ch = row[i]; if (ch === ".") continue
    ctx.fillStyle = ch === "o" ? "#101018" : ch === ">" ? "#ffb347" : c.color
    ctx.fillRect((i - 5.5) * p, (r - 4) * p, p, p)
  } })
  ctx.restore()
}

// the person a zombie becomes (the zombie art with its colour back), running away happy
const PERSON_RUN = { w: 182, h: 208, n: 10, ax: 91 }
let personImg: HTMLImageElement | null = null
function drawPerson(ctx: Ctx, c: Combat["critters"][number], x: number) {
  if (!personImg) { personImg = new Image(); personImg.src = "/pigchicken/person/run.webp" }
  if (!personImg.complete || !personImg.naturalWidth) return
  const f = Math.floor(c.t / 0.06) % PERSON_RUN.n, k = ZOMBIE_HEIGHT / ZOMBIE_SHEETS.walk.h
  ctx.save(); ctx.translate(x, c.y); ctx.scale(c.face < 0 ? -k : k, k)
  ctx.drawImage(personImg, f * PERSON_RUN.w, 0, PERSON_RUN.w, PERSON_RUN.h, -PERSON_RUN.ax, -PERSON_RUN.h, PERSON_RUN.w, PERSON_RUN.h)
  ctx.restore()
}

// the harmony bar (instruments fill it; full converts)
function harmonyBar(ctx: Ctx, g: Combat["targets"][number], x: number, y: number, w: number) {
  const v = g.harmony ?? 0
  if (v <= 0) return
  const grad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  grad.addColorStop(0, "#7b8cff"); grad.addColorStop(0.5, "#c77dff"); grad.addColorStop(1, "#ff6b9a")
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - w / 2, y, w, 5)
  ctx.fillStyle = grad; ctx.fillRect(x - w / 2, y, w * Math.min(1, v / g.maxHp), 5)
}

// where the blow is now: it sweeps across its arc in sw.time, downward in front of her
function swingAngle(sw: Swing) {
  return sw.angle + sw.dir * (-sw.arc / 2 + sw.arc * Math.min(1, sw.t / sw.time))
}

function drawSwing(ctx: Ctx, combat: Combat, origin: { x: number; y: number }) {
  const sw = combat.swing
  if (!sw) return
  // the swing: a faint fan over the whole hit area, and a trail behind the wing tip
  const k = 1 - sw.t / sw.time
  const a0 = sw.angle - sw.dir * sw.arc / 2, now = swingAngle(sw)
  ctx.save()
  ctx.translate(origin.x, origin.y)
  ctx.fillStyle = sw.wing ? `rgba(255,236,179,${0.18 * k})` : `rgba(255,209,102,${0.2 * k})`
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, sw.reach, a0, now, sw.dir < 0); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, sw.reach, a0, now, sw.dir < 0); ctx.stroke()
  ctx.restore()
}

// where the characters are (world coordinates, at their heads), set every frame: the aliens' eyes follow the
// nearest one. Only her for now; online, every character on screen goes in here.
const lookTargets: { x: number; y: number }[] = []

// the temple drawn with the world: its state and which aliens are about to drop a bomb (set every frame)
const templeDraw: { temple: Temple | null; charges: Map<number, number> } = { temple: null, charges: new Map() }

// the hint over the items the local players can grab (set every frame): the first player to stand on one shows theirs
const pickupMarks = new Map<Pickup, { c: string; t: string }>()
function markHover(combat: Combat, key: string) {
  const at = (p: Pickup | null, c: string, t: string) => { if (p && !pickupMarks.has(p)) pickupMarks.set(p, { c, t: key ? `${key}: ${t}` : t }) }
  at(combat.hover, "#4cc9f0", combat.hoverSwaps ? "trocar" : "pegar")
  at(combat.hoverOwned, "#9aa0a8", "equipar")
}
// the grab bind a player sees: from the keyboard they hold (primary first), else from their gamepad
function grabLabel(c: ChickenControls, devices: readonly InputDeviceId[] | null) {
  const pick = (slots: (string | null)[]) => slots.find(Boolean) ?? null
  const kb = !devices || devices.includes("kb1") ? pick(c.keys.grab) : devices.includes("kb2") ? pick(c.keys2.grab) : null
  const tok = kb ?? (!devices || devices.some(d => d.startsWith("pad")) ? pick(c.pad.grab) : null)
  return tok ? chickenBindName(tok) : ""
}
// the horde buttons' labels (set every frame from the horde settings)
const buttonLabels: Record<string, string> = {}
function drawButton(ctx: Ctx, g: Combat["targets"][number], x: number) {
  const ground = g.y + 46, cy = g.y - g.h / 2, on = g.flash > 0
  ctx.fillStyle = "#3a3f4a"; ctx.fillRect(x - 4, g.y, 8, ground - g.y)
  ctx.fillStyle = "#23262d"; ctx.beginPath(); ctx.ellipse(x, cy + 6, 24, 12, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = on ? "#ffd166" : g.label === "aliens" || g.label === "zombies" ? "#d6453d" : "#4cc9f0"
  ctx.beginPath(); ctx.ellipse(x, cy + (on ? 4 : 0), 19, 10, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(x - 19, cy + (on ? 4 : 0), 38, on ? 2 : 6)
  ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(0,0,0,0.55)"; const label = buttonLabels[g.label ?? ""] ?? ""; const w = ctx.measureText(label).width + 10
  ctx.fillRect(x - w / 2, cy - 34, w, 15)
  ctx.fillStyle = "#ffffff"; ctx.fillText(label, x, cy - 23)
}

function drawAlien(ctx: Ctx, g: Combat["targets"][number], x: number) {
  const d = g.data as EnemyData & { kind: "alien" }
  // its eye looks at the character nearest to it
  const look = lookDir({ x: g.x, y: g.y - g.h / 2 }, nearestPoint({ x: g.x, y: g.y - g.h / 2 }, lookTargets))
  const frame = lookRows(ALIEN_FRAMES[Math.floor(g.animT / 0.4) % 2], look), p = ALIEN_PIXEL
  const left = x - g.w / 2, top = g.y - g.h
  ctx.save()
  if (g.deadT > 0) ctx.globalAlpha = Math.max(0, g.deadT / 0.35) * 0.6
  frame.forEach((row, r) => { for (let c = 0; c < row.length; c++) {
    const ch = row[c]
    if (ch === ".") continue
    ctx.fillStyle = g.flash > 0 ? (g.tint ?? "#ffffff") : ch === "w" ? (Math.floor(g.animT * 2) % 9 === 0 ? d.color : "#f4f1e8") : ch === "o" ? "#101018" : d.color
    ctx.fillRect(left + c * p, top + r * p, p, p)
  } })
  ctx.restore()
  if (g.deadT <= 0) harmonyBar(ctx, g, x, top - 9, g.w)
}

// the zombie sprite sheets (Craftpix free zombie pack), one strip per animation
const ZOMBIE_SHEETS = { walk: { w: 123, h: 206, n: 6, ax: 61.6 }, attack: { w: 130, h: 192, n: 6, ax: 36.2 }, hurt: { w: 152, h: 201, n: 5, ax: 55.6 }, dead: { w: 238, h: 193, n: 8, ax: 55 }, idle: { w: 123, h: 197, n: 4, ax: 77.8 } }
type ZombieAnim = keyof typeof ZOMBIE_SHEETS
const zombieImages: Partial<Record<ZombieAnim, HTMLImageElement>> = {}
function zombieImage(a: ZombieAnim) {
  let img = zombieImages[a]
  if (!img) { img = new Image(); img.src = `/pigchicken/zombie1/${a}.webp`; zombieImages[a] = img }
  return img.complete && img.naturalWidth ? img : null
}
const ZOMBIE_HEIGHT = 175 // px on screen for the walk frame
function drawZombie(ctx: Ctx, g: Combat["targets"][number], x: number) {
  const a: ZombieAnim = g.state === "attack" ? "attack" : g.state === "hurt" ? "hurt" : g.state === "dead" ? "dead" : "walk"
  const sheet = ZOMBIE_SHEETS[a], img = zombieImage(a)
  if (!img) return
  const dur = a === "attack" ? ZOMBIE_TIMES.attack : a === "hurt" ? ZOMBIE_TIMES.hurt : a === "dead" ? ZOMBIE_TIMES.dead : 0.8
  const f = a === "walk" ? Math.floor((g.animT / dur) * sheet.n) % sheet.n : Math.min(sheet.n - 1, Math.floor((g.animT / dur) * sheet.n))
  const k = ZOMBIE_HEIGHT / ZOMBIE_SHEETS.walk.h
  ctx.save()
  ctx.translate(x, g.y)
  ctx.scale(g.face < 0 ? -k : k, k)
  if (g.state === "dead") ctx.globalAlpha = Math.min(1, g.deadT / ZOMBIE_TIMES.fade)
  if (g.flash > 0) ctx.filter = g.tint ? `drop-shadow(0 0 10px ${g.tint}) brightness(1.5)` : "brightness(2.2)"
  else if ((g.stun ?? 0) > 0 && g.tint) ctx.filter = `drop-shadow(0 0 6px ${g.tint})`
  ctx.drawImage(img, f * sheet.w, 0, sheet.w, sheet.h, -sheet.ax, -sheet.h, sheet.w, sheet.h)
  ctx.restore()
  if (g.state !== "dead" && g.hp < g.maxHp) {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 22, g.y - g.h - 16, 44, 5)
    ctx.fillStyle = "#7bd88f"; ctx.fillRect(x - 22, g.y - g.h - 16, 44 * Math.max(0, g.hp / g.maxHp), 5)
  }
  if (g.state !== "dead") harmonyBar(ctx, g, x, g.y - g.h - 9, 44)
}

function drawWorld(ctx: Ctx, combat: Combat, camX: number) {
  const X = (x: number) => x - camX
  const t = performance.now() / 1000
  const floorY = combat.targets.find(t => t.kind === "dummy")?.y ?? WORLD_GROUND_Y
  combat.racks.forEach(r => {
    const x = X(r.x), groundY = r.y ?? floorY
    ctx.fillStyle = "#5b4630"; ctx.fillRect(x - 34, groundY - 52, 6, 52); ctx.fillRect(x + 28, groundY - 52, 6, 52)
    ctx.fillStyle = "#7a5f40"; ctx.fillRect(x - 38, groundY - 56, 76, 7)
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(r.label, x, groundY - 62)
  })
  combat.pickups.forEach(p => {
    const x = X(p.x), y = p.y - 14 - Math.sin(t * 3 + p.id) * 3
    ctx.fillStyle = "rgba(123,223,242,0.18)"; ctx.beginPath(); ctx.ellipse(x, p.y - 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.translate(x, y - 8)
    // the item grab would take: a blue outline and the key to press
    // blue: grab takes it (or swaps it in when the inventory is full); grey: she already carries one, grab equips hers
    const mark = pickupMarks.get(p)
    if (mark) {
      ctx.filter = `drop-shadow(2px 0 0 ${mark.c}) drop-shadow(-2px 0 0 ${mark.c}) drop-shadow(0 2px 0 ${mark.c}) drop-shadow(0 -2px 0 ${mark.c})`
      drawItem(ctx, p.owned.item, 64, 34); ctx.filter = "none"
      ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = mark.c; ctx.fillText(mark.t, 0, 30)
    } else drawItem(ctx, p.owned.item, 64, 34)
    ctx.restore()
  })
  combat.thrown.forEach(o => {
    ctx.save(); ctx.translate(X(o.x), o.y); ctx.rotate(o.angle); drawItem(ctx, o.owned.item, 64, 34); ctx.restore()
  })
  combat.critters.forEach(c => { if (c.kind === "bird") drawBird(ctx, c, X(c.x)); else drawPerson(ctx, c, X(c.x)) })
  combat.targets.forEach(g => {
    const x = X(g.x)
    if (g.state === "converted") return
    if (g.kind === "alien" && (g.data as { kind?: string } | undefined)?.kind === "temple") { drawTempleAlien(ctx, g, x, combat.music.beatPhase, templeDraw.charges.get(g.id) ?? 0, combat.music.beat, nearestPoint({ x: g.x, y: g.y - g.h / 2 }, lookTargets)); return }
    if (g.kind === "alien") { drawAlien(ctx, g, x); return }
    if (g.kind === "button" && g.label === "gong") { if (templeDraw.temple) drawGong(ctx, g, x, templeDraw.temple); return }
    if (g.kind === "button" && g.label === "reset") { if (templeDraw.temple) drawResetStone(ctx, g, x, templeDraw.temple); return }
    if (g.kind === "zombie") { drawZombie(ctx, g, x); return }
    if (g.kind === "button") { drawButton(ctx, g, x); return }
    drawDummy(ctx, g, x, t)
  })
  const pulse = Math.pow(1 - combat.music.beatPhase, 3)
  combat.bullets.forEach(b => {
    const len = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / len, uy = b.vy / len, x = X(b.x)
    ctx.lineCap = "round"
    if (b.item === "tambourine" && b.fuse > 0) {
      ctx.save(); ctx.translate(x, b.y); ctx.rotate(b.t * 9); drawItem(ctx, "tambourine", 34, 34); ctx.restore()
    } else if (b.note) drawNote(ctx, b, x, pulse)
    else if (b.item === "grenade") {
      ctx.fillStyle = "#4b5320"; ctx.beginPath(); ctx.arc(x, b.y, b.size, 0, Math.PI * 2); ctx.fill()
      // the fuse blinks faster as it runs out
      if (Math.sin(b.t * (6 + b.t * 10)) > 0) { ctx.fillStyle = "#ff6b5b"; ctx.beginPath(); ctx.arc(x, b.y - b.size, 2.5, 0, Math.PI * 2); ctx.fill() }
    } else if (b.item === "launcher") {
      ctx.strokeStyle = "rgba(255,170,80,0.8)"; ctx.lineWidth = b.size
      ctx.beginPath(); ctx.moveTo(x - ux * 30, b.y - uy * 30); ctx.lineTo(x - ux * 8, b.y - uy * 8); ctx.stroke()
      ctx.strokeStyle = "#d6453d"; ctx.lineWidth = b.size + 2
      ctx.beginPath(); ctx.moveTo(x - ux * 10, b.y - uy * 10); ctx.lineTo(x, b.y); ctx.stroke()
    } else if (b.item === "bow") {
      ctx.strokeStyle = "#c9a46a"; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x - ux * 30, b.y - uy * 30); ctx.lineTo(x, b.y); ctx.stroke()
      ctx.fillStyle = "#c9ced6"; ctx.beginPath(); ctx.moveTo(x + ux * 4, b.y + uy * 4); ctx.lineTo(x - ux * 4 - uy * 4, b.y - uy * 4 + ux * 4); ctx.lineTo(x - ux * 4 + uy * 4, b.y - uy * 4 - ux * 4); ctx.fill()
    } else {
      ctx.strokeStyle = "rgba(255,230,140,0.9)"; ctx.lineWidth = b.size
      ctx.beginPath(); ctx.moveTo(x - ux * 14, b.y - uy * 14); ctx.lineTo(x, b.y); ctx.stroke()
    }
  })
  combat.tracers.forEach(t => {
    ctx.strokeStyle = `rgba(255,245,200,${Math.min(1, t.life * 10)})`; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(X(t.x1), t.y1); ctx.lineTo(X(t.x2), t.y2); ctx.stroke()
  })
  combat.booms.forEach(b => {
    if (b.color) {
      // an instrument's burst: rings of colour opening out
      const k = 1 - b.life / 0.5
      ctx.lineWidth = 3
      ;[1, 0.7, 0.4].forEach((f, i) => { ctx.strokeStyle = b.color!; ctx.globalAlpha = (1 - k) * (0.9 - i * 0.25); ctx.beginPath(); ctx.arc(X(b.x), b.y, b.r * f * (0.2 + 0.8 * k), 0, Math.PI * 2); ctx.stroke() })
      ctx.globalAlpha = 1
      return
    }
    const k = 1 - b.life / 0.35
    ctx.fillStyle = `rgba(255,170,70,${0.45 * (1 - k)})`; ctx.beginPath(); ctx.arc(X(b.x), b.y, b.r * (0.3 + 0.7 * k), 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(255,240,200,${0.8 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(b.x), b.y, b.r * k, 0, Math.PI * 2); ctx.stroke()
  })
  combat.sparks.forEach(s => { ctx.globalAlpha = Math.max(0, s.life / s.max); ctx.fillStyle = s.color; ctx.fillRect(X(s.x) - s.size / 2, s.y - s.size / 2, s.size, s.size) })
  ctx.globalAlpha = 1
  ctx.font = "bold 13px ui-monospace, monospace"; ctx.textAlign = "center"
  combat.texts.forEach(tx => {
    ctx.font = tx.size ? `bold ${tx.size}px ui-sans-serif, system-ui, sans-serif` : "bold 13px ui-monospace, monospace"
    ctx.globalAlpha = Math.min(1, tx.life * 2); ctx.fillStyle = "#000"; ctx.fillText(tx.text, X(tx.x) + 1, tx.y + 1); ctx.fillStyle = tx.color; ctx.fillText(tx.text, X(tx.x), tx.y)
  })
  ctx.globalAlpha = 1
  // the tips of destroyed dummies, above everything
  combat.targets.forEach(g => { if (g.dummy) drawDummyTip(ctx, g, X(g.x), t) })
}

// a steady pseudo-random number per dummy, so its cracks stay in the same place
const seeded = (id: number, i: number) => { const v = Math.sin(id * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v) }

// a crack: a zigzag from a point, with a little branch
function crack(ctx: Ctx, x: number, y: number, angle: number, len: number, id: number, k: number) {
  ctx.beginPath(); ctx.moveTo(x, y)
  let a = angle, cx = x, cy = y
  for (let i = 0; i < 4; i++) {
    a += (seeded(id, k + i) - 0.5) * 1.1
    cx += Math.cos(a) * len / 4; cy += Math.sin(a) * len / 4; ctx.lineTo(cx, cy)
    if (i === 1) { const bx = cx, by = cy; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 0.9) * len / 5, by + Math.sin(a + 0.9) * len / 5); ctx.moveTo(cx, cy) }
  }
  ctx.stroke()
}

// the board's outline: rounded while whole; chipped corners as it breaks
function boardPath(ctx: Ctx, g: Combat["targets"][number], stage: number) {
  const L = -g.w / 2, R = g.w / 2, T = -g.h, B = -g.h * 0.32
  ctx.beginPath()
  if (stage >= 3) { ctx.roundRect(L, T, g.w, B - T, 14); return }
  const r = (i: number) => seeded(g.id, i)
  ctx.moveTo(L + 10, T)
  ctx.lineTo(R - 16 - r(1) * 6, T); ctx.lineTo(R - 9, T + 5 + r(2) * 4); ctx.lineTo(R - 4, T + 9); ctx.lineTo(R, T + 18 + r(3) * 6)
  ctx.lineTo(R, B - 10); ctx.quadraticCurveTo(R, B, R - 10, B)
  if (stage <= 1) { ctx.lineTo(L + 18 + r(4) * 5, B); ctx.lineTo(L + 11, B - 6 - r(5) * 4); ctx.lineTo(L + 5, B - 9); ctx.lineTo(L, B - 18 - r(6) * 6) }
  else { ctx.lineTo(L + 10, B); ctx.quadraticCurveTo(L, B, L, B - 10) }
  ctx.lineTo(L, T + 10); ctx.quadraticCurveTo(L, T, L + 10, T)
  ctx.closePath()
}

// the whole board as it is at this stage (cracks, hole, peeled bullseye), in the dummy's own coordinates
function drawBoard(ctx: Ctx, g: Combat["targets"][number], stage: number, flash: boolean) {
  const cy = -g.h * 0.68, wrecked = stage === 0
  const wood = flash ? (g.tint ?? "#ffffff") : wrecked ? "#a69a80" : "#d9cfb8"
  boardPath(ctx, g, stage)
  ctx.fillStyle = wood; ctx.fill()
  ctx.save(); boardPath(ctx, g, stage); ctx.clip()
  // the grain: darker as it gets worn
  ctx.strokeStyle = `rgba(90,70,45,${0.12 + (4 - stage) * 0.05})`; ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) { const y = -g.h + 12 + i * 18; ctx.beginPath(); ctx.moveTo(-g.w / 2, y); ctx.bezierCurveTo(-8, y + 3, 8, y - 3, g.w / 2, y + 1); ctx.stroke() }
  const rings = flash ? ["#ffffff", "#ffffff", "#ffffff"] : wrecked ? ["#8a4a40", "#cfc6b0", "#8a4a40"] : ["#d6453d", "#f4f1e8", "#d6453d"]
  ;[17, 11, 5].forEach((r, i) => { ctx.fillStyle = rings[i]; ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill() })
  // scuffs and holes from the hits
  ctx.fillStyle = "rgba(60,40,25,0.55)"
  const marks = [0, 2, 4, 6, 9][4 - stage]
  for (let i = 0; i < marks; i++) { ctx.beginPath(); ctx.arc((seeded(g.id, 20 + i) - 0.5) * g.w * 0.8, -g.h + 10 + seeded(g.id, 40 + i) * g.h * 0.55, 1.6 + seeded(g.id, 60 + i) * 1.4, 0, Math.PI * 2); ctx.fill() }
  // the bullseye peels off
  if (stage <= 1) { ctx.fillStyle = wood; ctx.beginPath(); ctx.moveTo(4, cy - 18); ctx.lineTo(19, cy - 6); ctx.lineTo(13, cy + 4); ctx.lineTo(6, cy - 3); ctx.closePath(); ctx.fill() }
  // cracks
  ctx.strokeStyle = "rgba(55,38,22,0.85)"; ctx.lineWidth = 1.3
  if (stage <= 3) crack(ctx, g.w / 2, -g.h + 14, Math.PI * 0.85, 14, g.id, 80)
  if (stage <= 2) { crack(ctx, -g.w / 2, -g.h + 40, -0.1, 24, g.id, 90); crack(ctx, 6, -g.h, Math.PI * 0.55, 26, g.id, 100) }
  if (stage <= 1) {
    crack(ctx, g.w / 2, cy + 10, Math.PI * 1.05, 30, g.id, 110)
    // a hole straight through
    ctx.fillStyle = "#2b2016"; ctx.beginPath(); ctx.ellipse(-8, -g.h + 22, 6, 4.5, 0.4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#e8dcc0"; ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-8 + Math.cos(a) * 5, -g.h + 22 + Math.sin(a) * 4); ctx.lineTo(-8 + Math.cos(a) * 9, -g.h + 22 + Math.sin(a) * 7); ctx.stroke() }
  }
  ctx.restore()
  // the edge, darker when worn
  boardPath(ctx, g, stage); ctx.strokeStyle = `rgba(70,50,30,${0.25 + (4 - stage) * 0.1})`; ctx.lineWidth = 1.2; ctx.stroke()
}

// a training dummy: whole, scratched, cracked, falling apart or (no life) a wreck
function drawDummy(ctx: Ctx, g: Combat["targets"][number], x: number, time: number) {
  const d = g.dummy, stage = d?.stage ?? 4, flash = g.flash > 0
  const jolt = d && d.crackT > 0 ? Math.sin(d.crackT * 90) * 4 * (d.crackT / 0.35) : 0
  const side = seeded(g.id, 7) < 0.5 ? -1 : 1
  ctx.save()
  ctx.translate(x + jolt, g.y)
  ctx.rotate(g.wobble)
  if (stage > 0) {
    // the post leans a little more each stage; the board tilts on it
    const lean = [0, 0.1, 0.05, 0.015, 0][stage] * side
    ctx.rotate(lean)
    ctx.fillStyle = "#5b4630"; ctx.fillRect(-3, -g.h * 0.35, 6, g.h * 0.35)
    if (stage <= 2) { ctx.translate(0, -g.h * 0.35); ctx.rotate([0, 0.12, 0.06][stage] * -side); ctx.translate(0, g.h * 0.35) }
    drawBoard(ctx, g, stage, flash)
    // a plank nailed across while it is falling apart
    if (stage === 1) { ctx.fillStyle = "#8a6a44"; ctx.save(); ctx.translate(0, -g.h * 0.55); ctx.rotate(-0.35 * side); ctx.fillRect(-g.w / 2 - 2, -4, g.w + 4, 8); ctx.fillStyle = "#3a3a3a"; ctx.fillRect(-g.w / 2 + 2, -1, 2, 2); ctx.fillRect(g.w / 2 - 4, -1, 2, 2); ctx.restore() }
  } else {
    // a wreck: the post bent over, half of the board hanging from a nail, the other half on the floor
    const T = -g.h, B = -g.h * 0.32, split = (i: number) => -g.h * 0.62 + (seeded(g.id, 140 + i) - 0.5) * 10
    const upper = () => { ctx.beginPath(); ctx.moveTo(-g.w / 2, T); ctx.lineTo(g.w / 2, T); for (let i = 0; i <= 5; i++) ctx.lineTo(g.w / 2 - i * g.w / 5, split(i) - i * 3); ctx.closePath() }
    const lower = () => { ctx.beginPath(); for (let i = 0; i <= 5; i++) ctx.lineTo(g.w / 2 - i * g.w / 5, split(i) - i * 3); ctx.lineTo(-g.w / 2, B); ctx.lineTo(g.w / 2, B); ctx.closePath() }
    // the half on the floor
    ctx.save(); ctx.translate(side * 36, 0); ctx.rotate(side * 0.16); ctx.translate(0, g.h * 0.32 - 1)
    lower(); ctx.clip(); drawBoard(ctx, g, 0, flash); ctx.restore()
    // the post, snapped and bent
    ctx.save(); ctx.rotate(-0.28 * side)
    ctx.fillStyle = "#4a3a28"; ctx.fillRect(-3, -g.h * 0.42, 6, g.h * 0.42)
    ctx.beginPath(); ctx.moveTo(-3, -g.h * 0.42); ctx.lineTo(0, -g.h * 0.47); ctx.lineTo(3, -g.h * 0.42); ctx.fill()
    // the other half, hanging crooked from the nail at the top of the post
    ctx.translate(0, -g.h * 0.4); ctx.rotate(0.55 * side + Math.sin(time * 1.3 + g.id) * 0.04 + g.wobble)
    ctx.save(); ctx.translate(0, g.h * 0.72); upper(); ctx.clip(); drawBoard(ctx, g, 0, flash); ctx.restore()
    ctx.fillStyle = "#3a3a3a"; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    // flies buzzing around the wreck
    ctx.fillStyle = "#1d1d1d"
    for (let i = 0; i < 2; i++) { const a = time * (4 + i * 1.7) + i * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 18, -g.h * 0.55 + Math.sin(a * 1.6) * 9, 1.6, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.restore()
  // life bar while hurt (not on the wreck)
  if (stage > 0 && g.hp < g.maxHp) {
    const k = Math.max(0, g.hp / g.maxHp)
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 24, g.y - g.h - 14, 48, 5)
    ctx.fillStyle = k > 0.5 ? "#7bd88f" : k > 0.25 ? "#ffd166" : "#ff6b5b"; ctx.fillRect(x - 24, g.y - g.h - 14, 48 * k, 5)
  }
}

// the wrapped lines of a tip
function wrapLines(ctx: Ctx, text: string, maxW: number) {
  const lines: string[] = []
  let line = ""
  text.split(/\s+/).forEach(w => { const next = line ? `${line} ${w}` : w; if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = w } else line = next })
  if (line) lines.push(line)
  return lines
}

// the tip of a destroyed dummy: a speech bubble that pops up and fades; while it is down, a little "…" says there is one
function drawDummyTip(ctx: Ctx, g: Combat["targets"][number], x: number, time: number) {
  const d = g.dummy
  if (!d || !d.params.message) return
  const top = g.y - g.h * (d.stage === 0 ? 0.62 : 1) - 18
  if (d.tipT <= 0) {
    if (d.stage !== 0) return
    const y = top - 6 + Math.sin(time * 3 + g.id) * 2
    ctx.fillStyle = "rgba(255,253,245,0.9)"; ctx.beginPath(); ctx.roundRect(x - 15, y - 12, 30, 18, 9); ctx.fill()
    ctx.beginPath(); ctx.moveTo(x - 4, y + 6); ctx.lineTo(x, y + 11); ctx.lineTo(x + 3, y + 6); ctx.fill()
    ctx.fillStyle = "#5b4630"; ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("…", x, y + 1)
    return
  }
  ctx.save()
  ctx.font = "13px ui-sans-serif, system-ui, sans-serif"
  const maxW = 220, lines = wrapLines(ctx, d.params.message, maxW)
  const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + 22, lh = 17, h = lines.length * lh + 34
  const age = TIP_TIME - d.tipT, pop = Math.min(1, age / 0.18)
  ctx.globalAlpha = Math.min(1, d.tipT * 2)
  ctx.translate(x, top); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop)
  // the bubble stays on screen; its tail keeps pointing at the dummy
  const m = ctx.getTransform(), left = -m.e / m.a + 8, right = (ctx.canvas.width - m.e) / m.a - 8
  const bx = Math.max(Math.min(-w / 2, right - w), Math.min(left, -16)), by = -h - 10
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2
  ctx.fillStyle = "#fffdf5"; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 12); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-7, by + h - 1); ctx.lineTo(0, 0); ctx.lineTo(8, by + h - 1); ctx.fill()
  ctx.shadowColor = "transparent"
  ctx.fillStyle = "#b5651d"; ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("DICA", bx + 11, by + 17)
  ctx.fillStyle = "#2b2016"; ctx.font = "13px ui-sans-serif, system-ui, sans-serif"
  lines.forEach((l, i) => ctx.fillText(l, bx + 11, by + 34 + i * lh))
  ctx.restore()
}

function drawReticle(ctx: Ctx, combat: Combat, origin: { x: number; y: number }, rx: number, ry: number, dist: number, spreadDeg: number, locked: boolean, scale: number, path: { x: number; y: number }[] | null, showPath: boolean, showLand: boolean, tint: string) {
  const d = combat.def(), armed = !!combat.inventory[combat.current] && d.mag > 0
  const t = performance.now() / 1000
  const gap = Math.max(5, Math.tan((spreadDeg / 2) * Math.PI / 180) * dist)
  const ang = Math.atan2(ry - origin.y, rx - origin.x)
  // the player's own color (their lobby color), with a dark outline so it reads on any background; aim locked
  // draws it thicker, reloading fainter
  const color = tint
  const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke() }
  const end = path ? path[path.length - 1] : null
  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 3
  if (combat.reloading) ctx.globalAlpha = 0.55
  // the faint aim line (the families that draw their own path skip it)
  if (showPath && !path && d.reticle !== "cone") {
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
    line(origin.x, origin.y, rx, ry)
    ctx.setLineDash([])
  }
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = locked ? 3 : 2
  if (!armed) {
    ctx.beginPath(); ctx.arc(rx, ry, 8, 0, Math.PI * 2); ctx.stroke()
  } else if (d.reticle === "circle") {
    // SMG: a circle that pulses and opens fast while firing
    const r = gap + 6 + Math.sin(t * 18) * Math.min(3, gap * 0.15)
    ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); ctx.fill()
  } else if (d.reticle === "cross") {
    // rifle: a cross with a gap in the middle that opens with walking and firing
    ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => line(rx + ux * (gap + 3), ry + uy * (gap + 3), rx + ux * (gap + 15), ry + uy * (gap + 15)))
  } else if (d.reticle === "cone") {
    // pump: the reticle is as wide as the pellets' spread at the aim's distance (small near the gun, wide far away),
    // and fades past the pellets' range; the cone's sides are its path
    const half = (spreadDeg / 2) * Math.PI / 180, reach = d.range
    if (showPath) {
      const grad = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, reach)
      grad.addColorStop(0, combat.reloading ? "rgba(138,143,152,0.8)" : "rgba(255,255,255,0.8)"); grad.addColorStop(1, "rgba(255,255,255,0)")
      ctx.strokeStyle = grad
      ;[-half, half].forEach(a => line(origin.x, origin.y, origin.x + Math.cos(ang + a) * reach, origin.y + Math.sin(ang + a) * reach))
    }
    ctx.globalAlpha = dist <= reach ? 0.95 : 0.3
    ctx.strokeStyle = color
    ctx.beginPath(); ctx.arc(origin.x, origin.y, dist, ang - half, ang + half); ctx.stroke()
    ;[-half, half].forEach(a => {
      const cx = origin.x + Math.cos(ang + a) * dist, cy = origin.y + Math.sin(ang + a) * dist
      line(cx - Math.cos(ang) * 6, cy - Math.sin(ang) * 6, cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6)
    })
    ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  } else if (d.reticle === "laser" && end) {
    // sniper: a thin laser from the muzzle to whatever it hits, and a circle with a cross that closes while still
    if (showPath) { ctx.strokeStyle = "rgba(255,80,80,0.75)"; ctx.lineWidth = 1; line(origin.x, origin.y, end.x, end.y) }
    ctx.strokeStyle = color; ctx.lineWidth = 1.5
    const r = 10 + gap
    ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke()
    line(rx - r - 6, ry, rx - 4, ry); line(rx + 4, ry, rx + r + 6, ry); line(rx, ry - r - 6, rx, ry - 4); line(rx, ry + 4, rx, ry + r + 6)
    if (showPath) { ctx.fillStyle = "#ff5050"; ctx.beginPath(); ctx.arc(end.x, end.y, 2.5, 0, Math.PI * 2); ctx.fill() }
  } else if ((d.reticle === "impact" || d.reticle === "grenade") && path && end) {
    // launchers and grenades: the path (dotted for the grenade) and where it lands, with the blast's radius
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.5
    if (!showPath) { /* path hidden: only where it lands */ }
    else if (d.reticle === "grenade") {
      path.forEach((p, i) => { if (i % 3 === 0) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill() } })
    } else { ctx.setLineDash([3, 5]); line(origin.x, origin.y, end.x, end.y); ctx.setLineDash([]) }
    // where it lands, with the blast's radius (per item: always, or only with the fire button held, …)
    if (showLand) {
      ctx.strokeStyle = color; ctx.lineWidth = 2
      line(end.x - 6, end.y - 6, end.x + 6, end.y + 6); line(end.x - 6, end.y + 6, end.x + 6, end.y - 6)
      ctx.strokeStyle = "rgba(255,170,70,0.7)"; ctx.setLineDash([6, 5])
      ctx.beginPath(); ctx.arc(end.x, end.y, d.explodeRadius || 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
    }
    // where the mouse (or the stick) points, so the aim is never lost while the marker shows the landing
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([])
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); ctx.fill()
    // the fuse: a ring that empties in the fuse's time
    if (showLand && d.fuse > 0) { ctx.strokeStyle = "#ff6b5b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(end.x, end.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, d.fuse / 6)); ctx.stroke() }
  } else if (d.reticle === "bow" && path) {
    // bow: a half moon that fills with the charge, and a short path that gets longer
    const c = combat.fireCharge
    const n = Math.max(2, Math.round(path.length * (0.25 + 0.75 * c)))
    if (showPath) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4])
      ctx.beginPath(); path.slice(0, n).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([])
    }
    const r = 26 * scale + 10
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(origin.x, origin.y, r, ang - Math.PI / 2, ang + Math.PI / 2); ctx.stroke()
    ctx.strokeStyle = c >= 1 ? "#ffd166" : color
    ctx.beginPath(); ctx.arc(origin.x, origin.y, r, ang - Math.PI / 2 * c, ang + Math.PI / 2 * c); ctx.stroke()
    const tip = showPath ? path[n - 1] : { x: rx, y: ry }
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2); ctx.stroke()
  } else {
    // pistol: a dot and four short ticks that open a little with the spread
    ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => line(rx + ux * gap, ry + uy * gap, rx + ux * (gap + 8), ry + uy * (gap + 8)))
    ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, Math.PI * 2); ctx.fill()
  }
  // grenade charge: a ring around her filling up
  if (armed && d.reticle === "grenade" && combat.fireCharge > 0) {
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(origin.x, origin.y, 26 * scale + 8, -Math.PI / 2, -Math.PI / 2 + combat.fireCharge * Math.PI * 2); ctx.stroke()
  }
  if (combat.reloading) {
    const at = end && d.reticle !== "laser" && (showLand || (d.reticle !== "impact" && d.reticle !== "grenade")) ? end : { x: rx, y: ry }
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(at.x, at.y, 18, -Math.PI / 2, -Math.PI / 2 + combat.reloading * Math.PI * 2); ctx.stroke()
  }
  if (combat.throwCharge > 0 && combat.inventory[combat.current]) {
    ctx.strokeStyle = "#7bdff2"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(origin.x, origin.y, 26 * scale + 14, -Math.PI / 2, -Math.PI / 2 + combat.throwCharge * Math.PI * 2); ctx.stroke()
  }
  ctx.restore()
}

// where a throw let go now would fly: a dotted arc, solid for its first half and fading out over the second
function drawThrowPath(ctx: Ctx, pts: { x: number; y: number }[]) {
  if (pts.length < 2) return
  const len: number[] = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = len[len.length - 1]
  if (total < 1) return
  ctx.save()
  ctx.fillStyle = "#7bdff2"
  let j = 1
  for (let at = 14; at < total; at += 14) {
    while (j < pts.length - 1 && len[j] < at) j++
    const a = pts[j - 1], b = pts[j], seg = len[j] - len[j - 1] || 1, u = (at - len[j - 1]) / seg
    const t = at / total
    ctx.globalAlpha = 0.9 * (t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.5))
    ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 2.6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

const INV_SIZE = 34, INV_GAP = 0, INV_TOP = 100
const INV_W = (n: number) => n * INV_SIZE + (n - 1) * INV_GAP
// the inventories' stack: top right, one row per local player, the player's avatar at the right end of the row
export const INV_STACK = { top: 64, right: 12, size: INV_SIZE, rowGap: 6, avatarGap: 6 }
const invRowY = (row: number) => INV_STACK.top + row * (INV_SIZE + INV_STACK.rowGap)
const invRight = INV_STACK.right + INV_SIZE + INV_STACK.avatarGap
// a mouse is the main pointer (desktop): the slot numbers (keys 1-9) only show there
const desktopPointer = typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)") : null
// the inventory bar: top centre, moved by the player's saved offset (edit mode of the touch controls).
// Only her items show, plus one empty slot while there is room (instruments, weapons, then the other items).
// The slots touch each other, with a thin line between them; the current one is outlined in yellow.
function drawInventory(ctx: Ctx, combat: Combat, row: number, offset?: { x: number; y: number }) {
  const slots = combat.inventory, n = slots.length
  const size = INV_SIZE, w = INV_W(n)
  const x0 = Math.round(window.innerWidth - invRight - w + (offset?.x ?? 0)), y = invRowY(row) + (offset?.y ?? 0)
  // the slot numbers (keys 1-9) are the first player's
  const numbers = row === 0 && (desktopPointer?.matches ?? true)
  ctx.save()
  ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "left"
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x0, y, w, size)
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1
  ctx.strokeRect(x0 + 0.5, y + 0.5, w - 1, size - 1)
  ctx.beginPath()
  for (let i = 1; i < n; i++) { const x = x0 + i * size + 0.5; ctx.moveTo(x, y); ctx.lineTo(x, y + size) }
  ctx.stroke()
  for (let i = 0; i < n; i++) {
    const x = x0 + i * size, o = slots[i]
    if (i === combat.current) {
      ctx.fillStyle = "rgba(255,209,102,0.22)"; ctx.fillRect(x, y, size, size)
      ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
    }
    if (o) { ctx.save(); ctx.translate(x + size / 2, y + size / 2 + 2); drawItem(ctx, o.item, size - 6, size - 8); ctx.restore() }
    if (numbers && i < 9) { ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillText(String(i + 1), x + 3, y + 10) }
  }
  ctx.restore()
}

// ---------- the inventory wheel: her items plus the empty slot (while there is room), in equal slices ----------
// centred on the screen; the first slot at the top, then clockwise in the inventory's order
function wheelGeom() {
  const W = window.innerWidth, H = window.innerHeight
  const rOut = Math.max(120, Math.min(230, Math.min(W, H) * 0.42))
  return { cx: W / 2, cy: H / 2, rOut, rIn: rOut * 0.5 }
}
const GROUP_COLORS = ["#c77dff", "#ff9f43", "#7bd88f"]
const GROUP_NAMES = ["Instrumento", "Arma", "Item"]
function drawWheel(ctx: Ctx, combat: Combat, hover: number, open: number) {
  const slots = combat.inventory, n = slots.length, { cx, cy, rOut, rIn } = wheelGeom(), span = wheelSpan(n)
  const ease = 1 - (1 - open) ** 3
  ctx.save()
  ctx.globalAlpha = ease
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
  ctx.translate(cx, cy); ctx.scale(0.88 + 0.12 * ease, 0.88 + 0.12 * ease)
  const mid = (rIn + rOut) / 2, ring = rOut - rIn
  ctx.beginPath(); ctx.arc(0, 0, rIn - 3, 0, Math.PI * 2); ctx.fillStyle = "rgba(14,17,22,0.92)"; ctx.fill()
  for (let i = 0; i < n; i++) {
    const o = slots[i], c = wheelSliceCenter(i, n), on = i === hover
    const gap = n > 1 ? 1.5 / rIn : 0
    const a0 = n > 1 ? c - span / 2 + gap : 0, a1 = n > 1 ? c + span / 2 - gap : Math.PI * 2
    ctx.beginPath(); ctx.arc(0, 0, rOut, a0, a1); ctx.arc(0, 0, rIn, a1, a0, true); ctx.closePath()
    ctx.fillStyle = on ? "rgba(255,255,255,0.92)" : "rgba(28,32,38,0.66)"; ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.stroke()
    // the group's colour along the inner edge, the held one in yellow, the chosen one with a blue rim
    if (o) { ctx.strokeStyle = GROUP_COLORS[itemGroup(o.item, combat.item(o.item).instrument)]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rIn + 2.5, a0, a1); ctx.stroke() }
    if (i === combat.current) { ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, rOut - 2.5, a0, a1); ctx.stroke() }
    if (on) { ctx.strokeStyle = "#4cc9f0"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, rOut + 3.5, a0, a1); ctx.stroke() }
    const x = Math.cos(c) * mid, y = Math.sin(c) * mid, arc = n > 1 ? span * mid : Infinity
    if (o) {
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = ease * (on ? 1 : 0.85)
      // about the same area for every item: long guns stay long, a pistol is not huge, the bow is not a thin line
      const im = itemImage(o.item)
      if (im) {
        const [, , w, h] = im.box, maxW = Math.min(ring * 0.95, arc * 0.75), maxH = Math.min(ring * 0.7, arc * 0.7)
        const k = Math.min(maxW / w, maxH / h, Math.sqrt((ring * ring * 0.26) / (w * h)))
        ctx.drawImage(im.img, -w * k / 2, -h * k / 2, w * k, h * k)
      }
      ctx.restore()
    } else {
      ctx.fillStyle = on ? "rgba(20,24,30,0.7)" : "rgba(255,255,255,0.45)"
      ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText("vazio", x, y)
    }
  }
  // the centre: what the chosen (or held) slot is
  const i = hover >= 0 ? hover : combat.current, o = slots[i] ?? null
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  if (o) {
    const d = combat.item(o.item)
    ctx.fillStyle = GROUP_COLORS[itemGroup(o.item, d.instrument)]; ctx.font = "10px ui-monospace, monospace"
    ctx.fillText(GROUP_NAMES[itemGroup(o.item, d.instrument)].toUpperCase(), 0, -22)
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 17px ui-sans-serif, system-ui, sans-serif"
    ctx.fillText(d.name, 0, 0, rIn * 1.7)
    const info = [d.mag > 0 ? `${Math.ceil(o.ammo)}/${d.mag}` : "", d.durability > 0 ? `${o.durability} golpes` : ""].filter(Boolean).join(" · ")
    if (info) { ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "11px ui-monospace, monospace"; ctx.fillText(info, 0, 20) }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "bold 15px ui-sans-serif, system-ui, sans-serif"
    ctx.fillText("Mãos vazias", 0, 0)
  }
  ctx.restore()
}
