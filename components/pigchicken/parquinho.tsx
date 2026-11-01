"use client"

// Parquinho: PigChicKen's creative mode, built on the Pátio. A world several screens wide with a camera
// (follow, scenes, fixed), and the aim of the items: right stick > mouse > on-screen right stick > left stick /
// arrows > facing, drawn as a reticle. Firing, hitting and throwing only flash for now; the items come next.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { loadChickenControls, readStick, subscribeChickenControls, type ChickenAction, type ChickenControls } from "@/lib/chicken/controls"
import { createMouseOwner, resolveAim, type Aim, type AimSource, type Stick } from "@/lib/pigchicken/aim"
import { cameraBounds, cameraStep } from "@/lib/pigchicken/camera"
import { createCombat, SLOTS, type Box, type Combat, type Swing } from "@/lib/pigchicken/combat"
import { INSTRUMENT_IDS, loadItems, subscribeItems, WEAPON_IDS, type ItemId } from "@/lib/pigchicken/items"
import { ITEM_SVG, itemImage } from "@/lib/pigchicken/art"
import { playWeaponSound, setWeaponVolume } from "@/lib/pigchicken/sfx"
import { ALIEN_FRAMES, ALIEN_PATTERNS, ALIEN_PIXEL, ZOMBIE_TIMES, type EnemyData } from "@/lib/pigchicken/enemies"
import type { ParquinhoSettings } from "@/lib/pigchicken/settings"
import { createDrone, playDrum, playNote, setMusicVolumes } from "@/lib/pigchicken/synth"
import { ZONES, chordName, zoneLabel, type Zone } from "@/lib/pigchicken/music"
import { useTouchControls } from "@/components/chicken/chicken-layer"

// floating boxes per screen (percent of the screen), so every screen has something to climb
const SCREENS: { left: number; bottom: number; width: number; height: number }[][] = [
  [
    // the first one is the long shelf with the instruments, above the weapons' racks
    { left: 8, bottom: 32, width: 86, height: 3 },
    { left: 1, bottom: 16, width: 6, height: 4 },
    { left: 28, bottom: 60, width: 14, height: 5 },
    { left: 64, bottom: 60, width: 14, height: 5 },
  ],
  [
    { left: 6, bottom: 14, width: 12, height: 5 },
    { left: 22, bottom: 26, width: 12, height: 5 },
    { left: 38, bottom: 38, width: 12, height: 5 },
    { left: 54, bottom: 50, width: 12, height: 5 },
    { left: 76, bottom: 0, width: 6, height: 46 },
  ],
  [
    { left: 10, bottom: 0, width: 5, height: 30 },
    { left: 30, bottom: 20, width: 26, height: 5 },
    { left: 66, bottom: 0, width: 5, height: 55 },
    { left: 80, bottom: 30, width: 14, height: 5 },
  ],
  [
    { left: 8, bottom: 30, width: 10, height: 5 },
    { left: 26, bottom: 30, width: 10, height: 5 },
    { left: 44, bottom: 30, width: 10, height: 5 },
    { left: 62, bottom: 30, width: 10, height: 5 },
    { left: 35, bottom: 56, width: 30, height: 5 },
  ],
]

const SOURCE_LABEL: Record<AimSource, string> = {
  rightStick: "analógico direito", mouse: "mouse", touch: "analógico da tela", leftStick: "analógico esquerdo", keys: "setas", facing: "olhando pra frente",
}

// groundHeight: how high the ground reaches (raised on a phone held upright): the scene sits on top of it
export function ParquinhoWorld({ screens, worldRef, groundHeight = 30 }: { screens: number; worldRef: React.RefObject<HTMLDivElement | null>; groundHeight?: number }) {
  return (
    <div ref={worldRef} className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ width: `${screens * 100}vw`, bottom: groundHeight - 30 }}>
      {Array.from({ length: screens }, (_, s) => (
        <div key={`m${s}`} className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: `${s * 100}vw` }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/25">Cena {s + 1} <span style={{ color: ZONES[s % ZONES.length].color, opacity: 0.6 }}>· {zoneLabel(ZONES[s % ZONES.length])}</span></span>
        </div>
      ))}
      <div data-chicken-platforms className="absolute inset-0">
        {Array.from({ length: screens }, (_, s) => SCREENS[s % SCREENS.length].map((p, i) => (
          <div key={`${s}-${i}`} data-chicken-id={`pq${s}-${i}`} className="absolute rounded-md border border-primary/30 bg-[#16241b]" style={{ left: `${s * 100 + p.left}vw`, bottom: `calc(${p.bottom}% + 30px)`, width: `${p.width}vw`, height: `${p.height}%`, minHeight: 18 }} />
        )))}
      </div>
    </div>
  )
}


export function ParquinhoPlay({ engine, settings, worldRef, groundHeight = 30, lifted = false }: { engine: ChickenEngine | null; settings: ParquinhoSettings; worldRef: React.RefObject<HTMLDivElement | null>; groundHeight?: number; lifted?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const touchAim = useRef<Stick | null>(null)
  // what the on-screen grab button offers: '' hidden, 'take' an item to pick up, 'equip' one she already carries
  const [grabOffer, setGrabOffer] = useState<"" | "take" | "equip">("")
  const [controls, setControls] = useState<ChickenControls | null>(null)
  useEffect(() => {
    setControls(loadChickenControls())
    return subscribeChickenControls(setControls)
  }, [])
  const showTouch = useTouchControls(controls?.touch ?? "auto")

  useEffect(() => {
    if (!engine) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    let controls = loadChickenControls()
    const unsub = subscribeChickenControls(c => { controls = c })
    const owner = createMouseOwner()
    let mouse: { x: number; y: number } | null = null
    const mouseBtn = { fire: false, melee: false }
    let wheel = 0, slotPick = 0
    const isUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("header, aside, button, input, select, a, [data-chicken-ignore], [role='dialog']")
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      if (mouse) owner.moved(Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y), performance.now())
      mouse = { x: e.clientX, y: e.clientY }
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || isUi(e.target)) return
      if (e.button === 0) mouseBtn.fire = true
      if (e.button === 2) mouseBtn.melee = true
    }
    const onUp = (e: PointerEvent) => {
      if (e.button === 0) mouseBtn.fire = false
      if (e.button === 2) mouseBtn.melee = false
    }
    const onMenu = (e: MouseEvent) => { if (!isUi(e.target)) e.preventDefault() }
    const onWheel = (e: WheelEvent) => { if (!isUi(e.target)) wheel += Math.sign(e.deltaY) }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const m = /^Digit([1-9])$/.exec(e.code)
      if (m && !e.repeat) slotPick = Number(m[1])
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

    let camX = 0, last = performance.now(), raf = 0
    let prev: Partial<Record<ChickenAction, boolean>> = {}
    let aim: Aim | null = null
    let wasLocked = false
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
    // dev only: lets the test scripts reach the combat
    if (process.env.NODE_ENV !== "production") (window as unknown as { __pigchicken?: Combat }).__pigchicken = combat
    const drone = createDrone()
    let zoneShown: Zone | null = null, zoneBanner = 0
    const unsubItems = subscribeItems(next => combat.setItems(next))
    // creative mode: a rack that keeps a pistol to pick up, and target dummies in the first two scenes
    let placed = false, groundAt = 0, offerShown = ""
    const place = (viewW: number, groundY: number) => {
      // the creative mode: a row of racks with every weapon on the first screen, targets further in
      WEAPON_IDS.forEach((id, i) => combat.addRack(viewW * (0.14 + i * 0.105), id))
      // horde buttons on the second screen: shoot them; the instruments right after them
      ;(["aliens", "pattern", "zombies", "zcount"] as const).forEach((id, i) => combat.addButton(viewW * (1.06 + i * 0.09), groundY - 46, id))
      // the instruments on the long shelf above the weapons
      INSTRUMENT_IDS.forEach((id, i) => combat.addRack(viewW * (0.14 + i * 0.105), id, shelfTop() ?? groundY))
      ;[1.7, 2.0, 2.4, 2.8, 3.2].forEach(f => combat.addTarget(viewW * f, groundY))
      placed = true
    }
    // the top of the instruments' shelf (the first platform of the first scene), in screen pixels
    const shelfTop = () => document.querySelector('[data-chicken-id="pq0-0"]')?.getBoundingClientRect().top
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(window.innerWidth * dpr); canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    window.addEventListener("resize", fit)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const S = settingsRef.current
      const st = engine.getState()
      const viewW = st.width, worldW = viewW * S.screens
      if (!placed) { place(viewW, st.groundY); groundAt = st.groundY }
      // the ground moved (phone turned upright or back): what stands on it moves with it
      if (st.groundY !== groundAt) {
        const dy = st.groundY - groundAt
        combat.targets.forEach(t => { if (Math.abs(t.y - groundAt) < 2 || t.kind === "button") t.y += dy })
        combat.pickups.forEach(pk => { if (Math.abs(pk.y - groundAt) < 2) pk.y += dy })
        groundAt = st.groundY
      }
      const offer = combat.hover ? "take" : combat.hoverOwned ? "equip" : ""
      if (offer !== offerShown) { offerShown = offer; setGrabOffer(offer) }
      const shelf = shelfTop()
      if (shelf !== undefined) combat.racks.forEach(r => { if (r.y !== undefined) r.y = shelf })

      // ---------- camera ----------
      const worldX = camX + st.x
      const next = st.held ? camX : cameraStep(camX, { mode: S.camera, worldX, viewW, worldW, dt, deadband: S.deadband, lag: S.lag })
      if (next !== camX) { engine.shift(camX - next); camX = next }
      engine.setBounds(cameraBounds(camX, { mode: S.camera, viewW, worldW }))
      if (worldRef.current) worldRef.current.style.transform = `translate3d(${-camX}px,0,0)`

      // ---------- aim ----------
      const act = engine.getActions()
      const an = controls.analog
      const rightStick = readStick(1, an.deadzoneR), leftStick = readStick(0, an.deadzoneL)
      // brooding with an item in the wing is aiming: she stays put and the aim is locked while brood is held
      const armed = !!combat.inventory[combat.current]
      const aimLock = act.down && armed && st.grounded
      const keys = { x: (act.right ? 1 : 0) - (act.left ? 1 : 0), y: (act.crouch || (act.down && !aimLock) ? 1 : 0) - (act.up ? 1 : 0) }
      if (leftStick || keys.x || keys.y) owner.otherAim(now, S.mouseIdle)
      // her shoulder as drawn (it turns with her body on walls)
      const origin = st.shoulder
      aim = resolveAim({
        rightStick, mouse: owner.owns ? mouse : null, touch: touchAim.current, leftStick, keys, origin,
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
      const muzzleAt = (a: number) => armed ? engine.heldPoint(a, d.muzzleX, d.muzzleY) : origin
      engine.setGame({
        // brooding does not freeze her: "frente + chocar" walks at its own speed (0 keeps her still), aiming with the item
        moveLock: false,
        aimFace: aim.secondary && Math.abs(aim.dx) > 0.2 ? Math.sign(aim.dx) : null,
        backpedal: S.backpedal,
        speedMult: d.weight,
      })

      // ---------- combat (world coordinates) ----------
      const fire = act.fire || mouseBtn.fire, melee = act.melee || mouseBtn.melee
      grabKey = controls.keys.grab.find(Boolean)?.replace("Key:Key", "").replace("Key:", "") ?? "E"
      let pick = 0
      if (act.nextItem && !prev.nextItem) pick = 1
      if (act.prevItem && !prev.prevItem) pick = -1
      if (wheel) { pick = wheel > 0 ? 1 : -1; wheel = 0 }
      const input = {
        fire, firePressed: fire && !prev.fire, melee: melee && !prev.melee,
        throwHeld: act.throw, throwReleased: !act.throw && !!prev.throw,
        reload: act.reload && !prev.reload, pick, slot: slotPick, grab: act.grab && !prev.grab,
      }
      slotPick = 0
      prev = { ...act, fire, melee }
      const boxes: Box[] = []
      document.querySelectorAll("[data-chicken-platforms] > *").forEach(e => {
        const r = e.getBoundingClientRect()
        boxes.push({ l: r.left + camX, t: r.top, r: r.right + camX, b: Math.min(r.bottom, st.groundY) })
      })
      const body = { x: st.x + camX, y: st.y, face: st.face, scale: st.scale, grounded: st.grounded, state: st.state, vx: st.vx }
      const worldOrigin = { x: origin.x + camX, y: origin.y }
      combat.setView(camX, camX + viewW)
      combat.pressed.splice(0).forEach(id => {
        if (id === "aliens") combat.spawnAliens(st.groundY, body.x)
        else if (id === "zombies") combat.spawnZombies(st.groundY, body.x, horde.zombies)
        else if (id === "zcount") horde.zombies = ZOMBIE_COUNTS[(ZOMBIE_COUNTS.indexOf(horde.zombies) + 1) % ZOMBIE_COUNTS.length]
        else if (id === "pattern") horde.pattern = (horde.pattern + 1) % ALIEN_PATTERNS.length
      })
      buttonLabels.aliens = "SOLTAR ALIENS"; buttonLabels.pattern = `PADRÃO: ${ALIEN_PATTERNS[horde.pattern].label.toUpperCase()}`
      buttonLabels.zombies = "SOLTAR ZUMBIS"; buttonLabels.zcount = `ZUMBIS: ${horde.zombies}`
      const m0 = muzzleAt(d.turnRate > 0 ? combat.aimAngle : aim.angle)
      combat.step(dt, body, worldOrigin, { x: m0.x + camX, y: m0.y }, aim.angle, input, boxes, st.groundY, (vx, vy) => engine.impulse(vx, vy))

      // ---------- music: the zone of the scene she is in sets key, scale and tempo; ambience on its beat ----------
      const zone = ZONES[Math.max(0, Math.floor(worldX / viewW)) % ZONES.length]
      combat.music.setZone(zone)
      combat.setQuantize(S.quantize)
      setMusicVolumes(S.noteVolume, S.ambienceVolume)
      if (combat.music.zone !== zoneShown) { zoneShown = combat.music.zone; zoneBanner = 2.5 }
      zoneBanner = Math.max(0, zoneBanner - dt)
      combat.music.events.splice(0).forEach(e => {
        if (S.ambienceVolume <= 0) return
        if (e.kind === "bar") drone.set(combat.music.chord()[0])
        if (e.kind === "step") ambience(combat.music.zone, e.n % 16, combat.music.secondsPerBeat())
      })
      if (S.ambienceVolume <= 0) drone.set(null)

      // ---------- sound ----------
      setWeaponVolume(S.weaponVolume)
      combat.sounds.splice(0).forEach(e => playWeaponSound(e.kind, e.item))
      // aiming in (brood with an item): a soft sound on the weapons that have one
      if (aimLock && !wasLocked) playWeaponSound("aim", combat.inventory[combat.current]?.item ?? null)
      wasLocked = aimLock

      // ---------- draw ----------
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      drawWorld(ctx, combat, camX)
      const ang = combat.aimAngle, adx = Math.cos(ang), ady = Math.sin(ang)
      drawSwing(ctx, combat, origin)
      // the item itself is drawn inside her rig, in front of her body and behind the wing; in a swing the wing
      // turns with the blow and stretches to its reach, and the item rides on the wing tip
      const h = combat.inventory[combat.current], sw = combat.swing
      const art = h ? ITEM_SVG[h.item] : undefined
      engine.setHeld(art ? { svg: art, angle: ang, kick: combat.kick } : null)
      engine.setSwing(sw ? { angle: swingAngle(sw), reach: sw.range, t: Math.min(1, sw.t / (sw.time * 0.3), (sw.time - sw.t) / (sw.time * 0.3)) } : null)
      const muzzle = muzzleAt(ang)
      const dist = aim.target ? Math.hypot(aim.target.x - muzzle.x, aim.target.y - muzzle.y) : S.reticleDist * (aim.source === "rightStick" || aim.source === "touch" ? 0.45 + 0.55 * aim.strength : 1)
      const rx = d.turnRate > 0 || !aim.target ? muzzle.x + adx * dist : aim.target.x, ry = d.turnRate > 0 || !aim.target ? muzzle.y + ady * dist : aim.target.y
      // weapons whose reticle shows where the shot lands: the path a shot fired now would take
      let path: { x: number; y: number }[] | null = null
      if (armed && ["laser", "impact", "grenade", "bow"].includes(d.reticle)) {
        const power = d.fireMode === "charge" ? d.chargeMin + (1 - d.chargeMin) * combat.fireCharge : 1
        path = combat.predict({ x: muzzle.x + camX, y: muzzle.y }, ang, power, { boxes, groundY: st.groundY }).points.map(p => ({ x: p.x - camX, y: p.y }))
      }
      drawBeam(ctx, combat, camX)
      // the projectile's path shows per item: hidden, with the fire button held, held or aim locked, always
      const showPath = armed && (d.pathShow === "always" || (d.pathShow !== "off" && fire) || (d.pathShow === "holdAim" && aimLock))
      drawReticle(ctx, combat, muzzle, rx, ry, dist, combat.spread(body), aimLock, st.scale, path, showPath)
      if (zoneBanner > 0) drawZoneBanner(ctx, combat.music.zone, zoneBanner)
      drawInventory(ctx, combat)
      if (hudRef.current) {
        const h = combat.inventory[combat.current]
        const item = h ? `${d.name}${d.mag > 0 ? ` ${h.ammo}/${d.mag}` : ""}${d.durability > 0 ? ` · ${h.durability} golpes` : ""}${combat.reloading ? " · recarregando" : ""}` : "mãos vazias (asa)"
        const k = combat.kills, cv = combat.converted
        const shown = h && d.mag > 0 ? Math.ceil(h.ammo) : 0
        const item2 = h ? item.replace(`${h.ammo}/`, `${shown}/`) : item
        const m = combat.music
        hudRef.current.textContent = `${item2} · ${m.zone.name} ${chordName(m.chord())} ${[0, 1, 2, 3].map(i => (Math.floor(m.beat) % 4 === i ? "●" : "·")).join("")}${combat.enemies || k.aliens || k.zombies || cv.birds || cv.people ? ` · inimigos: ${combat.enemies} · aliens ${k.aliens} · zumbis ${k.zombies} · passarinhos ${cv.birds} · curados ${cv.people} · mordidas ${k.bites}` : ""} · mira: ${SOURCE_LABEL[aim.source]}${aimLock ? " (travada)" : ""} · ${S.camera === "follow" ? "câmera seguindo" : S.camera === "scenes" ? `cena ${Math.floor(worldX / viewW) + 1}` : "câmera fixa"}`
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
      document.body.classList.remove("pigchicken-play")
      if (camX) engine.shift(camX)
      if (worldRef.current) worldRef.current.style.transform = ""
    }
  }, [engine, worldRef])

  return (
    <>
      <style>{`body.pigchicken-play { cursor: none; } body.pigchicken-play :is(header, aside, [role="dialog"], button, input, select, textarea, a, label, summary, [data-chicken-ignore]) { cursor: auto; } body.pigchicken-play :is(button, a, select, summary, label) { cursor: pointer; }`}</style>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[195] h-full w-full" />
      <div ref={hudRef} className="pointer-events-none absolute left-3 z-[120] font-mono text-[11px] text-[#93a79a]" style={{ bottom: groundHeight + 10 }} />
      {showTouch && engine && <TouchAimStick engine={engine} aimRef={touchAim} bottom={lifted ? 16 + STICK + 12 : STICK_BOTTOM} grabOffer={grabOffer} />}
    </>
  )
}

// ---------- on-screen right stick (twin-stick): pushing aims, pushing to the edge fires ----------
const STICK = 112, KNOB = 48, STICK_BOTTOM = 64 + 112 + 24, FIRE_AT = 0.85

function TouchAimStick({ engine, aimRef, bottom, grabOffer }: { engine: ChickenEngine; aimRef: React.MutableRefObject<Stick | null>; bottom: number; grabOffer: "" | "take" | "equip" }) {
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
    aimRef.current = mag > 0.15 ? { x: dx / (len || 1), y: dy / (len || 1), mag } : null
    setFire(mag >= FIRE_AT)
  }
  const release = () => { pid.current = null; setKnob({ x: 0, y: 0 }); aimRef.current = null; setFire(false) }
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
        {grabOffer && button(grabOffer === "take" ? "Pegar" : "Equipar", "grab", grabOffer === "take" ? "border-[#4cc9f0] bg-[#4cc9f0]/20 text-white" : "border-[#9aa0a8] bg-[#9aa0a8]/20 text-white")}
        <div className="flex flex-col gap-2">
          {button("Punch", "melee")}
          {button("Throw", "throw")}
        </div>
        <div
          ref={ref}
          aria-label="Analógico de mira"
          className="pointer-events-auto relative rounded-full border-2 border-[#ffd166]/50 bg-white/10 backdrop-blur-[2px]"
          style={{ width: STICK, height: STICK, touchAction: "none" }}
          onPointerDown={e => { pid.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
          onPointerMove={e => { if (pid.current === e.pointerId) move(e) }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div className="absolute rounded-full border-2 border-white/40" style={{ inset: (STICK - STICK * FIRE_AT) / 2 - 4, opacity: 0.35 }} />
          <div className="absolute rounded-full border-2 border-white/50 bg-white/30" style={{ width: KNOB, height: KNOB, left: (STICK - KNOB) / 2 + knob.x, top: (STICK - KNOB) / 2 + knob.y }} />
        </div>
      </div>
    </div>
  )
}

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

// the hint over an item she can grab (set from the controls)
let grabKey = "E"
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
  const frame = ALIEN_FRAMES[Math.floor(g.animT / 0.4) % 2], p = ALIEN_PIXEL
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
  const floorY = combat.targets.find(t => t.kind === "dummy")?.y ?? window.innerHeight - 30
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
    // blue: grab swaps it in; grey: she already carries one, grab equips hers
    const mark = combat.hover === p ? { c: "#4cc9f0", t: "trocar" } : combat.hoverOwned === p ? { c: "#9aa0a8", t: "equipar" } : null
    if (mark) {
      ctx.filter = `drop-shadow(2px 0 0 ${mark.c}) drop-shadow(-2px 0 0 ${mark.c}) drop-shadow(0 2px 0 ${mark.c}) drop-shadow(0 -2px 0 ${mark.c})`
      drawItem(ctx, p.owned.item, 64, 34); ctx.filter = "none"
      ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = mark.c; ctx.fillText(`${grabKey}: ${mark.t}`, 0, 30)
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
    if (g.kind === "alien") { drawAlien(ctx, g, x); return }
    if (g.kind === "zombie") { drawZombie(ctx, g, x); return }
    if (g.kind === "button") { drawButton(ctx, g, x); return }
    ctx.save()
    ctx.translate(x, g.y)
    if (g.deadT > 0) { ctx.globalAlpha = Math.min(1, g.deadT); ctx.rotate(Math.sign(g.wobble || 1) * Math.PI / 2 * Math.min(1, (2.5 - g.deadT) * 4)) }
    else ctx.rotate(g.wobble)
    ctx.fillStyle = "#5b4630"; ctx.fillRect(-3, -g.h * 0.35, 6, g.h * 0.35)
    ctx.fillStyle = g.flash > 0 ? (g.tint ?? "#ffffff") : "#d9cfb8"
    ctx.beginPath(); ctx.roundRect(-g.w / 2, -g.h, g.w, g.h * 0.68, 14); ctx.fill()
    ;[17, 11, 5].forEach((r, i) => { ctx.fillStyle = g.flash > 0 ? "#ffffff" : i % 2 ? "#f4f1e8" : "#d6453d"; ctx.beginPath(); ctx.arc(0, -g.h * 0.68, r, 0, Math.PI * 2); ctx.fill() })
    ctx.restore()
    if (g.deadT <= 0 && g.hp < g.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 24, g.y - g.h - 14, 48, 5)
      ctx.fillStyle = g.hp > 50 ? "#7bd88f" : g.hp > 25 ? "#ffd166" : "#ff6b5b"; ctx.fillRect(x - 24, g.y - g.h - 14, 48 * Math.max(0, g.hp / g.maxHp), 5)
    }
    if (g.deadT <= 0) harmonyBar(ctx, g, x, g.y - g.h - 7, 48)
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
}

function drawReticle(ctx: Ctx, combat: Combat, origin: { x: number; y: number }, rx: number, ry: number, dist: number, spreadDeg: number, locked: boolean, scale: number, path: { x: number; y: number }[] | null, showPath: boolean) {
  const d = combat.def(), armed = !!combat.inventory[combat.current] && d.mag > 0
  const t = performance.now() / 1000
  const gap = Math.max(5, Math.tan((spreadDeg / 2) * Math.PI / 180) * dist)
  const ang = Math.atan2(ry - origin.y, rx - origin.x)
  const color = combat.reloading ? "#8a8f98" : locked ? "#ffd166" : "#ffffff"
  const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke() }
  const end = path ? path[path.length - 1] : null
  ctx.save()
  // the faint aim line (the families that draw their own path skip it)
  if (showPath && !path && d.reticle !== "cone") {
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
    line(origin.x, origin.y, rx, ry)
    ctx.setLineDash([])
  }
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2
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
    ctx.strokeStyle = color; ctx.lineWidth = 2
    line(end.x - 6, end.y - 6, end.x + 6, end.y + 6); line(end.x - 6, end.y + 6, end.x + 6, end.y - 6)
    ctx.strokeStyle = "rgba(255,170,70,0.7)"; ctx.setLineDash([6, 5])
    ctx.beginPath(); ctx.arc(end.x, end.y, d.explodeRadius || 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
    // where the mouse (or the stick) points, so the aim is never lost while the marker shows the landing
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([])
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); ctx.fill()
    // the fuse: a ring that empties in the fuse's time
    if (d.fuse > 0) { ctx.strokeStyle = "#ff6b5b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(end.x, end.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, d.fuse / 6)); ctx.stroke() }
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
    const at = end && d.reticle !== "laser" ? end : { x: rx, y: ry }
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(at.x, at.y, 18, -Math.PI / 2, -Math.PI / 2 + combat.reloading * Math.PI * 2); ctx.stroke()
  }
  if (combat.throwCharge > 0 && combat.inventory[combat.current]) {
    ctx.strokeStyle = "#7bdff2"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(origin.x, origin.y, 26 * scale + 14, -Math.PI / 2, -Math.PI / 2 + combat.throwCharge * Math.PI * 2); ctx.stroke()
  }
  ctx.restore()
}

function drawInventory(ctx: Ctx, combat: Combat) {
  const size = 30, gap = 4, w = SLOTS * size + (SLOTS - 1) * gap
  const x0 = (window.innerWidth - w) / 2, y = 100
  ctx.save()
  ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "left"
  for (let i = 0; i < SLOTS; i++) {
    const x = x0 + i * (size + gap), o = combat.inventory[i], on = i === combat.current
    ctx.fillStyle = on ? "rgba(255,209,102,0.22)" : "rgba(0,0,0,0.35)"; ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = on ? "#ffd166" : "rgba(255,255,255,0.18)"; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
    if (o) { ctx.save(); ctx.translate(x + size / 2, y + size / 2 + 2); drawItem(ctx, o.item, size - 6, size - 8); ctx.restore() }
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillText(String(i + 1), x + 3, y + 10)
  }
  ctx.restore()
}
