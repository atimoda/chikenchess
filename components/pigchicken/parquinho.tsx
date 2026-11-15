"use client"

// Parquinho: PigChicKen's creative mode, built on the Pátio. A world several screens wide with a camera
// (follow, scenes, fixed), and the aim of the items: right stick > mouse > on-screen right stick > left stick /
// arrows > facing, drawn as a reticle. Firing, hitting and throwing only flash for now; the items come next.
// The world is in fixed units (lib/pigchicken/world.ts): the same size on every screen, which only changes the crop.
import { requestGameFrame, cancelGameFrame } from "@/lib/game-frame"
import { Search } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { createCollisionOcclusion } from "@/lib/chicken/collision-occlusion"
import type { ChickenEngine, ChickenGame } from "@/lib/chicken/engine"
import { readTouchMoveStick, loadChickenControls, subscribeChickenControls, type ChickenAction, type ChickenControls } from "@/lib/chicken/controls"
import { padTokensFor, stickFor, type InputDeviceId } from "@/lib/chicken/input-devices"
import { createMouseOwner, keysAimFor, magnetAngle, reticleAtAngle, resolveAim, type Aim, type AimSource, type Stick } from "@/lib/pigchicken/aim"
import { cameraBounds, cameraStep, cameraXRange, leadStep } from "@/lib/pigchicken/camera"
import { CONSUMABLE_LIMITS } from "@/lib/pigchicken/items"
import { heldItemPose } from "@/lib/pigchicken/held-pose"
import { createCombat, lookDoses, type Box, type Catchable, type Combat, type Effect, type SoulPortal, type WorldCarry } from "@/lib/pigchicken/combat"
import { createNetWorldSync } from "@/lib/pigchicken/net-world-sync"
import { getNetState, remoteChicken } from "@/lib/chicken/online-room"
import { chickNumber, chickStyleOf } from "@/lib/chicken/net-chicks"
import { releaseChick } from "@/lib/chicken/chick-release"
import { CAGE_HOLD } from "@/lib/pigchicken/cages"
import { cageCounterWidth, cageCounts, cageHudSpot, drawCageCounters, drawHangingCages, drawPlayerTag, newCageHud, stepCageHud } from "@/components/pigchicken/draw/cages"
import type { NetChickMirror } from "@/components/chicken/online-chickens"
import { PLAYER_COLORS } from "@/lib/chicken/lobby"
import type { NetSpawn } from "@/lib/pigchicken/net-world"
import { INVENTORY_MAX, inventorySlotFromCode, newQuickSwitchRepeat, quickSwitchStep, wheelSliceAt, wrapSlot, type ItemGroup, type QuickSwitchRepeat } from "@/lib/pigchicken/inventory"
import { announceHeldItem, bowed, curvePower, loadItems, nextArp, saveItems, subscribeItems, type ItemId } from "@/lib/pigchicken/items"
import { CATALOG_SPECIES, loadCatalog, subscribeCatalog, variantData, variantFor, variantSize } from "@/lib/pigchicken/alien-catalog"
import type { TrainingSpawnRequest } from "@/lib/pigchicken/training-spawn"
import { playWeaponSound, setWeaponVolume } from "@/lib/pigchicken/sfx"
import { ALIEN_PATTERNS } from "@/lib/pigchicken/enemies"
import type { ParquinhoSettings } from "@/lib/pigchicken/settings"
import { createDrone, playBass, playDrum, playNote, setMusicVolumes } from "@/lib/pigchicken/synth"
import { SILENCE, ambienceDrone, bassNotes, beatHits, legacyAmbience } from "@/lib/pigchicken/zone-ambience"
import { mixGain } from "@/lib/pigchicken/mixer"
import { ZONES, chordName, droneOf, zoneLabel, type Zone } from "@/lib/pigchicken/music"
import { Movable, useTouchControls, useTouchLayout } from "@/components/chicken/chicken-layer"
import { getTouchLayout } from "@/lib/chicken/touch-layout"
import { SCENE_W, TEMPLE_PLATFORMS, WORLD_GROUND_Y, WORLD_TOP, cameraYRange, cameraYStep, sceneAt, templeScene, villageScene, worldScenes } from "@/lib/pigchicken/world"
import { LIMIT_BORDER, LIMIT_BORDER_COLOR } from "@/lib/chicken/limits"
import { defaultLayout, elementsInWorld, layoutBoxes, layoutCollisionMasks, layoutMusic, TEMPLE_PLATFORM_DEPTH, type LayoutElement } from "@/lib/pigchicken/layout"
import { groundZones, placeEnvAt, soundZoneOf, zoneAt, type LanesBox, type SceneEdges, type SceneZones, type ZoneBox } from "@/lib/pigchicken/sound-zones"
import { hitZone, liveZones, resetZoneLife, zoneWallHit } from "@/lib/pigchicken/zone-life"
import { drawScaleFan, SCALE_FAN_R } from "@/components/pigchicken/draw/scale-fan"
import { announceHeldScale, newStandby, scaleParams, standbyStep, type StandbyState } from "@/lib/pigchicken/scale-params"
import { drawHitboxes } from "@/components/pigchicken/draw/hitboxes"
import { createLayoutSync } from "@/lib/pigchicken/layout-sync"
import { SceneryVisibilityStyles } from "./scenery-region"
import { graphicsQuality, subscribeQuality } from "@/lib/quality"
import { setPlatformWorldOcclusion, setPlatformWorldOffset } from "@/lib/chicken/platform-geometry"
import { needsTrajectory, patioPixelRatio, trajectoryVisible, zoomedView } from "@/lib/pigchicken/viewport"
import { moveLiveCamera, setCameraRestY } from "@/lib/pigchicken/live-camera"
import { FollowLayer, LayoutColliders, LayoutLayerView, PatioTreeStyles } from "@/components/pigchicken/patio-layout"
import { DISC_X, GONG_X, RESET_X, createTemple, type TempleIO } from "@/lib/pigchicken/temple"
import { TEMPLE_IDLE, playNoteStageSound, playTempleSound, templeAmbience, type TempleSound } from "@/lib/pigchicken/temple-music"
import { accuracy, createNoteStage, type NoteStageSound } from "@/lib/pigchicken/note-stage"
import { JUKEBOX_H, JUKEBOX_W, drawNoteShots, drawNoteStageHud, drawStageFan, drawStageTalk } from "@/components/pigchicken/note-stage-draw"
import { CAMPAIGN_ID, loadLibrary, nowPlaying, onPlayDraft, onPlaySong, onStopSong, openJukebox, recordScore, subscribeLibrary } from "@/lib/pigchicken/song-library"
import { newGongRun, stepGong, strikeGong, type GongParams, type GongRun } from "@/lib/pigchicken/gong"
import { drawTempleHud, drawTempleShots } from "@/components/pigchicken/temple-draw"
import { TEMPLE_ROOF_LINES, TempleBackdrop, lineAttr } from "@/components/pigchicken/temple-backdrop"
import { ParallaxBackdrop } from "@/components/pigchicken/parallax"
import type { MountainParams } from "@/lib/pigchicken/mountains"
import { patioClouds, type CloudParams } from "@/lib/pigchicken/clouds"
import type { SnowfallParams } from "@/lib/pigchicken/snowfall"
import type { AuroraParams } from "@/lib/pigchicken/aurora"
import { skyLook, type SkyLook, type SkyParams } from "@/lib/pigchicken/sky"
import { createPerchWorld, setPerchSpans } from "@/lib/pigchicken/bird-perch"
import { perchLines } from "@/lib/pigchicken/perch-places"
import { powerSpans } from "@/lib/pigchicken/power-lines"
import { VillageBackdrop } from "@/components/pigchicken/village-backdrop"
import { syncRiders, buttonLabels, lookTargets } from "@/components/pigchicken/draw/creatures"
import { drawBeam, drawZoneBanner, rigSwing, drawSwing, swingShake } from "@/components/pigchicken/draw/effects"
import { aimReach } from "@/lib/pigchicken/aim-volume"
import { drawVolumeRing } from "@/components/pigchicken/draw/volume-ring"
import { drawReticle, drawThrowPath, INV_SIZE, INV_TOP, INV_STACK, invRowY, invRight, BAR, invGeom, barSlotAt, showKeyHints, drawInventory, wheelGeom, drawWheel, type BarDrag } from "@/components/pigchicken/draw/hud"
import { drawAbductions, drawFreedSouls, drawPoops, drawPoopStains, drawScares } from "@/components/pigchicken/draw/souls"
import { SOUL_RARITIES, collectSoul, loadSoulEntries, setSoulEntries, subscribeSoulEntries } from "@/lib/pigchicken/soul-library"
import { templeDraw, pickupMarks, markHover, grabLabel, groupBindLabels, drawWorld } from "@/components/pigchicken/draw/world"
import { chestMarks } from "@/components/pigchicken/draw/chests"
import { stageWidth } from "@/lib/stage-size"
import { createTrainingGhosts } from "@/components/pigchicken/training-ghosts"

// Próximo instrumento / Próxima arma / Próximo utilitário pressed this frame: the group to go through (the first
// one listed wins when several are pressed together)
const GROUP_BINDS: [ChickenAction, ItemGroup][] = [["nextInstrument", 0], ["nextWeapon", 1], ["nextUtility", 2]]
const groupPress = (act: Partial<Record<ChickenAction, boolean>>, prev: Partial<Record<ChickenAction, boolean>>): ItemGroup | null =>
  GROUP_BINDS.find(([a]) => act[a] && !prev[a])?.[1] ?? null
// how far (px) a press on the inventory bar moves before it becomes a drag instead of a click
const BAR_DRAG_START = 6
// the keys shown left of each group on the first player's big bar (with a mouse, like the slot numbers; null: none)
const barLabels = (controls: ChickenControls | null, devices: InputDeviceId[] | null, lifted: boolean) =>
  !controls || lifted || !showKeyHints() ? null : groupBindLabels(controls, devices)

const SOURCE_LABEL: Record<AimSource, string> = {
  rightStick: "analógico direito", mouse: "mouse", touch: "analógico da tela", leftStick: "analógico esquerdo", keys: "setas", facing: "olhando pra frente",
}

// The world in fixed world units: scenes of SCENE_W, the ground at WORLD_GROUND_Y. ParquinhoPlay moves it with the
// camera (translate); nothing in it depends on the screen's size.
// the code's own Pátio, when the page gives no layout
const DEFAULT_ELEMENTS = defaultLayout().elements
const GROUND_FILL = `linear-gradient(to bottom, #6b8f3a 0, #54752c 4px, #4a3522 7px, #3a2a1b 30px, #2a1e13 100%)`
// a chicken held by the pointer keeps only Throw: every other action reads as let go
function onlyThrow(actions: Record<ChickenAction, boolean>): Record<ChickenAction, boolean> {
  const out = {} as Record<ChickenAction, boolean>
  for (const k of Object.keys(actions) as ChickenAction[]) out[k] = k === "throw" && actions[k]
  return out
}

// worldTop: the Pátio's ceiling (world y, its height limit); groundHeight: how much ground the page shows below the floor
// backdrop: how strongly the scenery far behind shows (sky, sun, mountains; the layers menu's Fundo, 0 hides it)
// sky: the Pátio's sky and light (Configurações do Pátio → Céu e luz); without it, the classic dusk
// mountains: the far ranges' shape (Configurações do Pátio → Montanhas); clouds: theirs (→ Nuvens)
// temple: false leaves out the Templo do Gongo and the Vila dos Telhados (their scenes stay, empty)
export function ParquinhoWorld({ screens, worldRef, debug = false, elements = DEFAULT_ELEMENTS, editing = false, worldTop = WORLD_TOP, groundHeight = 30, backdrop = 1, sky, mountains, clouds, snowfall, aurora, temple = true }: { screens: number; worldRef: React.RefObject<HTMLDivElement | null>; debug?: boolean; elements?: LayoutElement[]; editing?: boolean; worldTop?: number; groundHeight?: number; backdrop?: number; sky?: SkyParams; mountains?: MountainParams; clouds?: CloudParams; snowfall?: SnowfallParams; aurora?: AuroraParams; temple?: boolean }) {
  // The Parquinho, the Templo do Gongo and the Vila dos Telhados share one world.
  const width = worldScenes(screens) * SCENE_W
  const templeLeft = templeScene(screens) * SCENE_W
  const villageLeft = villageScene(screens) * SCENE_W
  const shown = useMemo(() => elementsInWorld({ v: 1, elements }, screens), [elements, screens])
  const occlusion = useMemo(() => createCollisionOcclusion(layoutCollisionMasks(shown)), [shown])
  const look = useSkyLook(sky)
  const cloudSet = useMemo(() => patioClouds(clouds, sky?.clouds), [clouds, sky?.clouds])
  // the hour's light and the contraluz on the scenery (the characters, items and shots keep their own colours)
  const lit = look.scenery === "none" ? undefined : { filter: look.scenery }
  useLayoutEffect(() => {
    const world = worldRef.current
    if (!world) return
    setPlatformWorldOcclusion(world, occlusion)
    return () => setPlatformWorldOcclusion(world, null)
  }, [worldRef, occlusion])
  return (
    <div ref={worldRef} data-chicken-world className="pointer-events-none absolute left-0 top-0" style={{ width, height: WORLD_GROUND_Y }}>
      {/* the undead she can ride: one thin floor on each, moved every frame (syncRiders) */}
      <div data-chicken-platforms data-undead-riders aria-hidden="true" className="absolute inset-0" />
      {/* the scenery far behind: sky, sun, clouds, mountains and trees, in parallax along the whole world */}
      {backdrop > 0 && (backdrop >= 1 ? <ParallaxBackdrop worldW={width} look={look} mountains={mountains} clouds={cloudSet} snowfall={snowfall} aurora={aurora} /> : <div className="absolute inset-0" style={{ opacity: backdrop }}><ParallaxBackdrop worldW={width} look={look} mountains={mountains} clouds={cloudSet} snowfall={snowfall} aurora={aurora} /></div>)}
      {/* the ground: reaches far past the world's sides and down past any screen's bottom */}
      <div aria-hidden="true" className="absolute" style={{ left: -4000, width: width + 8000, top: WORLD_GROUND_Y, height: 4000, background: GROUND_FILL, boxShadow: "0 -1px 0 rgba(0,0,0,.35)", ...lit }} />
      {debug && Array.from({ length: screens }, (_, s) => (
        <div key={`m${s}`} className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: s * SCENE_W }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/25">Cena {s + 1} <span style={{ color: ZONES[s % ZONES.length].color, opacity: 0.6 }}>· {zoneLabel(ZONES[s % ZONES.length])}</span></span>
        </div>
      ))}
      {temple && <div className="absolute inset-0" style={lit}>
        <TempleBackdrop left={templeScene(screens) * SCENE_W} />
        <VillageBackdrop left={villageLeft} />
      </div>}
      {debug && temple && (
        <div className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: templeScene(screens) * SCENE_W }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/50">Cena {screens + 1} · Templo do Gongo</span>
        </div>
      )}
      {debug && temple && (
        <div className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: villageLeft }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/50">Cena {screens + 2} · Vila dos Telhados</span>
        </div>
      )}
      {/* the temple's roofs: floors with their own curves (drawn only in debug) */}
      {debug && temple && (
        <svg aria-hidden="true" className="absolute top-0" style={{ left: templeScene(screens) * SCENE_W, width: SCENE_W, height: WORLD_GROUND_Y }}>
          {TEMPLE_ROOF_LINES.map(l => <polyline key={l.id} points={lineAttr(l.pts)} fill="none" stroke="#ff3b3b" strokeWidth={3} strokeDasharray="8 5" />)}
        </svg>
      )}
      {/* the Pátio's layout (lib/pigchicken/layout.ts): the scenery behind the platforms, then the platforms' layer */}
      <PatioTreeStyles />
      <SceneryVisibilityStyles />
      <div className="absolute inset-0" style={lit}><LayoutLayerView elements={shown} layer="back" editing={editing} power={false} /></div>
      <LayoutLayerView elements={shown} layer="back" editing={editing} power />
      <div data-chicken-platforms className="absolute inset-0">
        {temple && TEMPLE_PLATFORMS.map((p, i) => {
          const x = templeLeft + p.x, y = WORLD_GROUND_Y - p.bottom - p.h
          return <div key={`tp-${i}`} data-chicken-id={`tp-${i}`} data-chicken-depth={TEMPLE_PLATFORM_DEPTH}
            data-chicken-world-box={`${x},${y},${p.w},${p.h}`} className="absolute rounded-sm border-t-4 border-[#ffd166] shadow-[0_6px_0_#5c120d,0_14px_18px_rgba(40,8,4,0.35)]" style={{ left: x, top: y, width: p.w, height: p.h, background: "linear-gradient(#d8402f, #9a2117 55%, #1f6b62 55%, #1f6b62 80%, #ffd166 80%, #ffd166 88%, #7a1710 88%)" }} />
        })}
        {temple && TEMPLE_ROOF_LINES.map(l => (
          <div key={l.id} data-chicken-id={`tp-${l.id}`} data-chicken-world-box={`${templeScene(screens) * SCENE_W},0,${SCENE_W},${WORLD_GROUND_Y}`} data-chicken-line={lineAttr(l.pts)} className="absolute top-0" style={{ left: templeScene(screens) * SCENE_W, width: SCENE_W, height: WORLD_GROUND_Y }} />
        ))}
      </div>
      <div className="absolute inset-0" style={lit}><LayoutLayerView elements={shown} layer="scene" editing={editing} power={false} /></div>
      <LayoutLayerView elements={shown} layer="scene" editing={editing} power />
      <LayoutColliders elements={shown} />
      <WorldLimits width={width} top={worldTop} bottom={WORLD_GROUND_Y + Math.max(LIMIT_BORDER, groundHeight)} />
    </div>
  )
}

// the sky's look, and its silhouette and horizon colours as CSS variables for the postes, torres and wires
// (they live in several layers, so the variables sit on the page's root)
function useSkyLook(sky: SkyParams | undefined): SkyLook {
  const look = useMemo(() => skyLook(sky), [sky])
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty("--patio-sil", look.silhouette); root.setProperty("--patio-horizon", look.horizon)
    root.setProperty("--patio-haze", String(Math.min(0.9, look.hazeAmount * 0.75)))
  }, [look])
  return look
}

// where no zone plays (the scenes' own zones off, or one that does not change the music): a plain major key for the instruments, and no percussion nor drone
const NO_SCENE_ZONE: Zone = { id: "sem-zona", name: "Sem zona", root: 60, scale: "major", chordScale: "major", bpm: 100, feel: "straight", progression: [0], color: "#93a79a", ambience: SILENCE }

// The Pátio's limits: a black frame LIMIT_BORDER thick inside the world's sides and its ceiling, closed at the
// bottom of the ground the page shows, and all black beyond it (LIMIT_OUTSIDE on every side, more than the widest
// zoom-out reveals), so nothing of the sky or the scenery shows outside the Pátio. The chicken's walls and ceiling
// are its inner edge (ParquinhoPlay).
const LIMIT_OUTSIDE = 8000
function WorldLimits({ width, top, bottom }: { width: number; top: number; bottom: number }) {
  const b = LIMIT_BORDER, o = LIMIT_OUTSIDE, h = bottom - top
  const band = { position: "absolute", background: LIMIT_BORDER_COLOR } as const
  return (
    <div aria-hidden="true" data-patio-limits>
      <div style={{ ...band, left: -o, top: top - o, width: o + b, height: h + 2 * o }} />
      <div style={{ ...band, left: width - b, top: top - o, width: o + b, height: h + 2 * o }} />
      <div style={{ ...band, left: 0, top: top - o, width, height: o + b }} />
      <div style={{ ...band, left: 0, top: bottom - b, width, height: o + b }} />
    </div>
  )
}

// The layers above the game's things: "behind" (in front of the dummies, racks and shots, behind the characters),
// "front" (in front of her) and "frontGhost" (in front, half see-through, like the trees). Each is a fixed layer
// that follows the camera (lib/pigchicken/live-camera.ts).
export function ParquinhoForeground({ screens, elements = DEFAULT_ELEMENTS, editing = false, sky }: { screens: number; fgRef?: React.RefObject<HTMLDivElement | null>; elements?: LayoutElement[]; editing?: boolean; sky?: SkyParams }) {
  const width = worldScenes(screens) * SCENE_W
  const shown = useMemo(() => elementsInWorld({ v: 1, elements }, screens), [elements, screens])
  const filter = useSkyLook(sky).scenery
  return (
    <>
      <FollowLayer z={197} width={width} filter={filter}><LayoutLayerView elements={shown} layer="behind" editing={editing} /></FollowLayer>
      <FollowLayer z={202} width={width} filter={filter}><LayoutLayerView elements={shown} layer="front" editing={editing} /></FollowLayer>
      <FollowLayer z={202} opacity={0.55} width={width} filter={filter}><LayoutLayerView elements={shown} layer="frontGhost" editing={editing} /></FollowLayer>
    </>
  )
}

// devices: the input devices of the player she belongs to (null: all of them); without the mouse she ignores it
// and the aim sticks come from that player's own gamepad. extras: the other local players' chickens, which move
// with the same camera (no items yet).
export function ParquinhoPlay({ engine, settings, worldRef, groundHeight = 30, lifted = false, spawnX, fgRef, devices = null, extras, chicks, netChicks, colors, looks, elements = DEFAULT_ELEMENTS, worldTop = WORLD_TOP, trainingSpawns, inventoryLimit = INVENTORY_MAX, sceneZones, sceneEdges, sceneMusic = true, temple: templeOn = true, scaleFan = 0, scaleFanSize = 0.3, scaleFanFade = 0.5, scaleFanLines = 1, scaleKeep = false, hitboxes = false, patioKey = null }: { engine: ChickenEngine | null; settings: ParquinhoSettings; worldRef: React.RefObject<HTMLDivElement | null>; groundHeight?: number; lifted?: boolean; spawnX?: number; fgRef?: React.RefObject<HTMLDivElement | null>; devices?: InputDeviceId[] | null; extras?: React.RefObject<Map<string, ChickenEngine>>; chicks?: React.RefObject<Map<string, ChickenEngine>>; netChicks?: React.RefObject<Map<string, NetChickMirror>>; colors?: Record<string, string>; looks?: Record<string, Record<string, string> | null>; elements?: LayoutElement[]; worldTop?: number; trainingSpawns?: React.RefObject<TrainingSpawnRequest[]>; inventoryLimit?: number; sceneZones?: SceneZones; sceneEdges?: SceneEdges; sceneMusic?: boolean; temple?: boolean; scaleFan?: number; scaleFanSize?: number; scaleFanFade?: number; scaleFanLines?: number; scaleKeep?: boolean; hitboxes?: boolean; patioKey?: string | null }) {
  // the Pátio's layout: the game's things (dummies, racks, buttons) and the boxes the shots meet follow it live
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  // the Pátio open (its id): another one is another world. This one closes whole (the loop below ends and starts
  // again from nothing) and only what the players take along crosses over: inventories, Bags of souls and the souls
  // flying free with them (and the camera's zoom, which is the screen's)
  const carryRef = useRef<{ carry: WorldCarry; zoom: number } | null>(null)
  // where she starts (by the entry portal): read on the first frame, so a moved portal never restarts the loop
  const spawnXRef = useRef(spawnX)
  spawnXRef.current = spawnX
  // the scenes' own music, as this Pátio changed it
  const sceneZonesRef = useRef(sceneZones)
  sceneZonesRef.current = sceneZones
  const sceneEdgesRef = useRef(sceneEdges)
  sceneEdgesRef.current = sceneEdges
  const sceneMusicRef = useRef(sceneMusic)
  sceneMusicRef.current = sceneMusic
  // the Templo do Gongo (Configurações do Pátio → Templo e Vila): off, its gong, stones, jukebox and racks leave
  const templeRef = useRef(templeOn)
  templeRef.current = templeOn
  // the layers menu's debug layers: Escalas (each player's aim fan with the note and degree of each lane, this
  // strong; 0 off) and Hit-boxes
  const scaleFanRef = useRef(scaleFan)
  scaleFanRef.current = scaleFan
  const scaleSizeRef = useRef(scaleFanSize)
  scaleSizeRef.current = scaleFanSize
  const scaleFadeRef = useRef(scaleFanFade)
  scaleFadeRef.current = scaleFanFade
  const scaleLinesRef = useRef(scaleFanLines)
  scaleLinesRef.current = scaleFanLines
  // Camadas → "Prevenir fadeout das escalas": the scales never go into standby
  const scaleKeepRef = useRef(scaleKeep)
  scaleKeepRef.current = scaleKeep
  const hitboxesRef = useRef(hitboxes)
  hitboxesRef.current = hitboxes
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ghostHostRef = useRef<HTMLDivElement>(null)
  // the inventory wheel has its own canvas, above the chicken
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  // the Pátio's ceiling (its height limit), world y
  const topRef = useRef(worldTop)
  topRef.current = worldTop
  const devicesRef = useRef(devices)
  devicesRef.current = devices
  // each local player's lobby color (p1: the first one, the others by their id): their reticle's color
  const colorsRef = useRef(colors)
  colorsRef.current = colors
  // each local player's look, for the avatar that says where they are when they leave the screen
  const looksRef = useRef(looks)
  looksRef.current = looks
  // where the page keeps the ground on the screen (raised above the touch controls on a phone held upright)
  const groundHRef = useRef(groundHeight)
  groundHRef.current = groundHeight
  const liftedRef = useRef(lifted)
  liftedRef.current = lifted
  const touchAim = useRef<Stick | null>(null)
  // the on-screen Throw button's aim: dragged out of it, the drag's angle; a tap, her movement or where she faces
  const throwAim = useRef<Stick | null>(null)
  // time of the last quick tap on the right stick: shoots the nearest enemy
  const tapShot = useRef(0)
  // a slot the player clicked or tapped on the inventory bar (1-based, 0 none): equips it on the next frame
  const slotTap = useRef(0)
  // the groups of the slots the inventory bar shows (her items plus the empty one while there is room), as a key
  // ("0012": two instruments, a weapon, the empty slot) so the page lays its invisible slots out like the canvas, and
  // after ":" the held slot (a bar too long for the screen slides to keep it near the centre)
  // the bar's groups, the slot held and whether she carries any item ("0": the bar hides)
  const [invKey, setInvKey] = useState("2:0:0")
  const invGroups = useMemo(() => invKey.split(":")[0].split("").map(Number), [invKey])
  const invCur = Number(invKey.split(":")[1] ?? 0), invEmpty = invKey.split(":")[2] === "0"
  // which of those slots hold an item (the empty one does not drag)
  const barItems = useRef<boolean[]>([false])
  // a slot dragged on the first player's bar (null: none) and a drop waiting for the next frame
  const barDrag = useRef<(BarDrag & { pointer: number; x0: number; y0: number; active: boolean }) | null>(null)
  const barMove = useRef<{ from: number; to: number; after: boolean } | null>(null)
  const inventoryLimitRef = useRef(inventoryLimit)
  inventoryLimitRef.current = inventoryLimit
  // the bar's size follows the window (its slots shrink to fit): lay the invisible slots out again on a resize
  const [, setViewportW] = useState(0)
  useEffect(() => {
    const onResize = () => setViewportW(stageWidth())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  // the inventory wheel: open (its layer takes the clicks and taps), where the pointer is over it, a click on it
  const [wheelOpen, setWheelOpen] = useState(false)
  const [cameraMode, setCameraMode] = useState(false)
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
  const showTouchRef = useRef(showTouch)
  showTouchRef.current = showTouch
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
    // the arpeggiator glyphs drawn over the instruments' slots this frame (screen units, like the inventory) and the
    // instrument each one belongs to
    const arpBoxes: { item: ItemId; box: { l: number; r: number; t: number; b: number } }[] = []
    // a press on a glyph turns that instrument's arpeggiator to the next option (saved like the Itens panel); it
    // neither equips, fires nor walks
    const onArpDown = (e: PointerEvent) => {
      if (e.button !== 0 || cameraKey || !arpBoxes.length) return
      const hit = arpBoxes.find(a => e.clientX >= a.box.l && e.clientX <= a.box.r && e.clientY >= a.box.t && e.clientY <= a.box.b)
      if (!hit) return
      e.preventDefault(); e.stopImmediatePropagation()
      const all = loadItems()
      all[hit.item].arp = nextArp(all[hit.item].arp)
      saveItems(all)
    }
    let wheel = 0, slotPick = 0, escape = false
    let cameraKey = false, panPointer: number | null = null, panDeltaX = 0, panDeltaY = 0
    let resetCamera = false, padResetHeld = false
    const resetView = () => { zoom = 1; resetCamera = true }
    let cameraModeShown = false
    const showCameraMode = (on: boolean) => {
      if (on !== cameraModeShown) { cameraModeShown = on; setCameraMode(on) }
      document.body.classList.toggle('pigchicken-camera-mode', cameraKey)
    }
    const isUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("header, aside, button, input, select, a, [data-chicken-ignore], [role='dialog']")
    // a press on a chicken's body picks her up (the engine drags her); it neither fires nor walks
    const onChicken = (t: EventTarget | null) => !!(t as Element | null)?.closest?.('[data-part="root"]')
    // point-and-click with empty hands: a click or a tap on the scene sends her walking there (like on the globe)
    let walkTap: { id: number; x: number; y: number; t: number } | null = null
    const canWalkTap = (e: PointerEvent) => e.button === 0 && !cameraKey && !isUi(e.target) && !onChicken(e.target) &&
      !(e.target as Element | null)?.closest?.("[data-patio-editor]") && !combat.inventory[combat.current] && !engine.getMotionState().held
    const onTouchDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") walkTap = canWalkTap(e) ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null
    }
    const onTapUp = (e: PointerEvent) => {
      const t = walkTap
      if (!t || t.id !== e.pointerId) return
      walkTap = null
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) <= 8 && performance.now() - t.t <= 600) engine.walkTo({ x: e.clientX, y: e.clientY })
    }
    // the mouse is someone else's (another local player holds it)
    const noMouse = () => !!devicesRef.current && !devicesRef.current.includes("mouse")
    // the pointer is over a UI control or panel (the same ones that keep the normal cursor): p1's mouse reticle hides
    const overUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("header, aside, [role='dialog'], button, input, select, textarea, a, label, summary, [data-chicken-ignore]")
    let mouseOverUi = false
    // the Gaiolas drawn this frame (screen px; id: whose; i: its place, 0 in front; (cx, cy): its middle; on: a press
    // does something now) and the presses waiting for the frame. A press on the cage in front lets its last soul out
    // or, with it empty, calls that player's souls back; a press on one behind brings it to the front. It neither
    // fires nor walks. The first player's hang in the top left corner; the others' are the counters by their avatars
    type CageHit = { id: string; i: number; x: number; y: number; w: number; h: number; cx: number; cy: number; on: boolean }
    const cageBoxes: CageHit[] = []
    const cageTaps: { id: string; i: number }[] = []
    let cageHover: { id: string; i: number } | null = null
    const cageHud = newCageHud()
    let swayCamX: number | null = null
    // each player's "Soltar alma" bind: s it has been held (-1: the hold already turned the cages)
    const cageHolds = new Map<string, number>()
    const cageBoxAt = (x: number, y: number) => cageBoxes.find(b => b.on && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) ?? null
    const hoverCage = (hit: CageHit | null) => { cageHover = hit ? { id: hit.id, i: hit.i } : null; document.body.classList.toggle("pigchicken-bag-hover", !!hit) }
    const onCageDown = (e: PointerEvent) => {
      if (e.button !== 0 || cameraKey || overUi(e.target)) return
      const hit = cageBoxAt(e.clientX, e.clientY)
      if (!hit) return
      e.preventDefault(); e.stopImmediatePropagation()
      cageTaps.push({ id: hit.id, i: hit.i })
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || noMouse()) return
      mouseOverUi = overUi(e.target)
      // a Gaiola that can be pressed is a button too: the normal cursor, no reticle
      hoverCage(mouseOverUi || cameraKey ? null : cageBoxAt(e.clientX, e.clientY))
      if (cageHover) mouseOverUi = true
      if (cameraKey) {
        if (e.button === 1 && (e.buttons & 4)) resetView()
        if (panPointer === e.pointerId && (e.buttons & 1) && mouse) {
          panDeltaX += e.clientX - mouse.x; panDeltaY += e.clientY - mouse.y
        }
        mouse = { x: e.clientX, y: e.clientY }
        return
      }
      // a button pressed or let go while another one is held arrives as a pointermove (chorded buttons), not as
      // pointerdown/up: e.g. the right button (Golpe) while the left one (Atirar) is held
      if (e.button === 0 || e.button === 2) {
        if (e.buttons & (e.button === 0 ? 1 : 2)) onDown(e); else onUp(e)
      }
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
      if (cameraKey) {
        e.preventDefault(); e.stopPropagation()
        if (e.button === 0) {
          panPointer = e.pointerId; mouse = { x: e.clientX, y: e.clientY }
          document.body.classList.add('pigchicken-camera-dragging')
        }
        if (e.button === 1) resetView()
        return
      }
      if (e.button === 0 && onChicken(e.target)) return
      // empty hands: the left button pecks as always and, on a quick click, also walks there
      if (e.button === 0 && canWalkTap(e)) walkTap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
      if (e.button === 0) mouseBtn.fire = true
      if (e.button === 2) mouseBtn.melee = true
    }
    const onUp = (e: PointerEvent) => {
      onTapUp(e)
      if (panPointer === e.pointerId && e.button === 0) {
        panPointer = null
        document.body.classList.remove('pigchicken-camera-dragging')
        e.preventDefault(); e.stopPropagation()
      }
      if (e.button === 0) mouseBtn.fire = false
      if (e.button === 2) mouseBtn.melee = false
    }
    const onMenu = (e: MouseEvent) => { if (!isUi(e.target)) e.preventDefault() }
    const onCameraClick = (e: MouseEvent) => {
      if (cameraKey && !isUi(e.target)) { e.preventDefault(); e.stopPropagation() }
    }
    const onWheel = (e: WheelEvent) => {
      if (isUi(e.target) || noMouse()) return
      if (cameraKey) zoom = clampZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))
      // rolled up (away from her hand): the next item; down: the one before
      else wheel -= Math.sign(e.deltaY)
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      if (e.code === "Backquote") {
        e.preventDefault(); cameraKey = true; mouseBtn.fire = false; mouseBtn.melee = false
        showCameraMode(true)
      }
      const slot = inventorySlotFromCode(e.code)
      if (slot !== null && !e.repeat) slotPick = slot
      if (e.code === "Escape") escape = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Backquote") {
        cameraKey = false; panPointer = null; panDeltaX = 0; panDeltaY = 0
        document.body.classList.remove('pigchicken-camera-dragging')
        showCameraMode(false)
      }
    }
    window.addEventListener("pointerdown", onArpDown, true)
    window.addEventListener("pointerdown", onCageDown, true)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerdown", onDown, true)
    window.addEventListener("pointerdown", onTouchDown, true)
    window.addEventListener("pointerup", onUp, true)
    window.addEventListener("contextmenu", onMenu)
    window.addEventListener("click", onCameraClick, true)
    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", onKeyUp)
    engine.setGame({ gameMode: true })
    // only the reticle: the mouse arrow hides over the game (panels and buttons keep it)
    document.body.classList.add("pigchicken-play")

    // camX: world x at the screen's left edge; oy: screen y of world y = 0 (null until the first frame)
    let camX = 0, oy: number | null = null, last = performance.now(), raf = 0
    let zoom = carryRef.current?.zoom ?? 1, forceFollow = false, panParked = false, panInterrupted = false, wasPanHeld = false, lastPlayer = { x: 0, y: 0 }, playerSeen = false
    let reloadPendingAt = 0, reloadPending = false, reloadFired = false
    const clampZoom = (z: number) => Math.max(0.5, Math.min(2.5, z))
    let prev: Partial<Record<ChickenAction, boolean>> = {}
    const quickSwitch = newQuickSwitchRepeat()
    // the other local players' actions in the last frame (presses are edges)
    const extraPrev = new Map<string, Partial<Record<ChickenAction, boolean>>>()
    const extraQuickSwitch = new Map<string, QuickSwitchRepeat>()
    const extraAim = new Map<string, { muzzle: { x: number; y: number }; angle: number; reach: number }>()
    // the Escalas layer's standby, per player: whether they played this frame and how far their scale has faded
    const scalePlaying = new Map<string, boolean>()
    const scaleStandby = new Map<string, StandbyState>()
    let aim: Aim | null = null
    let wasLocked = false, autoUntil = 0
    // the camera's look-ahead (px toward the side she faces) and the aim's shake after a jump (degrees, fading)
    let lead = 0, shake = 0, shakeT = 0, prevVy = 0
    const shakePhase = [Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3]
    // the inventory wheel: open (only while its button is held), when it opened, the slice under the pointer / stick
    // (-1 none); slotsShown: the bar's slot count the page knows; fireBlock: the fire press that confirmed an item
    // does not shoot until it is let go; prevFire: fire held last frame (raw, the wheel does not mask it)
    const wh = { open: false, at: 0, hover: -1 }
    let cancelPecks = false
    const cancelPeckInput = () => {
      cancelPecks = true; mouseBtn.fire = false; cameraKey = false; panPointer = null
      panInterrupted = false; wasPanHeld = false; panDeltaX = 0; panDeltaY = 0
      document.body.classList.remove('pigchicken-camera-dragging'); showCameraMode(false)
    }
    window.addEventListener("blur", cancelPeckInput)
    window.addEventListener("pointercancel", cancelPeckInput)
    let slotsShown = "2:0:0", wheelDrawn = false, fireBlock = false, prevFire = false
    // horde settings, changed by shooting their buttons
    const horde = { zombies: 6, pattern: 0 }
    const ZOMBIE_COUNTS = [3, 6, 10, 20]
    const combat = createCombat()
    if (carryRef.current) combat.importCarry(carryRef.current.carry)
    carryRef.current = null
    // online, the other browsers' chicks the Passaguá could reach last frame, and where they were
    let netChicksSeen = new Map<string, { x: number; y: number }>()
    // the wires the birds rest on (Postes and Torres), with the camera and the players each frame
    const perches = createPerchWorld()
    combat.setPerchWorld(perches)
    combat.setItems(loadItems())
    // online: the lobby's owner moves the enemies, the others mirror them; everyone's shots fly on every screen
    const net = createNetWorldSync(combat, () => ["p1", ...(extras?.current?.keys() ?? [])])
    const soulPortals = new Map<string, SoulPortal>()
    // instruments, the enemies' answers and the zone's ambience play on PigChicKen's own synth
    combat.setMusicOut({
      note: (voice, midi, at, dur, vel, fade, vib) => { playNote(voice, midi, { at, dur, vel, fade, vib }) },
      hold: (voice, midi, vib) => playNote(voice, midi, { sustain: true, vel: 0.8, vib }),
      drum: (kind, at, vel) => playDrum(kind, at, vel ?? 1),
    })
    // the temple's mini-game (its state is plain data, stepped with the beats: ready to be shared in multiplayer)
    const temple = createTemple(Math.floor(Math.random() * 2 ** 31))
    templeDraw.temple = temple
    // the note stage (the guitar hero mode): the jukebox by the reset stone picks the song, the gong plays it
    const stage = createNoteStage()
    // the aliens' catalogue (saved in this browser): the song's aliens take their variations from it
    let catalog = loadCatalog()
    stage.setCatalog(catalog)
    templeDraw.catalog = catalog
    const unsubCatalog = subscribeCatalog(c => { catalog = c; templeDraw.catalog = c; stage.setCatalog(c) })
    // the jukebox's library: the songs and the one picked (the campaign's disc, or a song the gong starts)
    let library = loadLibrary()
    const useLibrary = (l: typeof library) => { library = l; templeDraw.library = l; stage.setSongs(l.songs); if (l.picked !== CAMPAIGN_ID) stage.select(l.picked) }
    useLibrary(library)
    const unsubLibrary = subscribeLibrary(useLibrary)
    // "Tocar" in the jukebox's panel: the song starts now
    let playRequest: string | null = null, jukeRing = 9
    // where a song plays: in the temple (leaving it loses the song), or anywhere ("free": started by a Gongo or a
    // Jukebox of the layout, or with the Templo e Vila off). jukeFrom: the jukebox struck last (its button's label)
    let jukeFrom = "jukebox", requestFree = false, stageFree = false, stageGongX: number | undefined, wasStageOn = false
    let anchor: { free: boolean; gongX?: number } | null = null
    const unsubPlay = onPlaySong(id => { playRequest = id; requestFree = jukeFrom !== "jukebox" })
    // the jukebox's Parar: the song stops; the campaign is put back at rest (as the reset stone does)
    let stopRequest = false, campaignStop = 0
    const unsubStop = onStopSong(() => { stopRequest = true })
    // the Gongos of the layout (by element id): their settings and their strikes so far
    const gongSet = new Map<string, GongParams>(), gongRuns = new Map<string, GongRun>()
    // the song editor's "Tocar daqui" and "Parar"
    const unsubDraft = onPlayDraft(r => (r === "stop" ? stage.halt() : stage.playDraft(r.song, r.from)))
    templeDraw.stage = stage
    combat.setNoteEnv(shot => stage.noteEnv(shot))
    const templeSounds: TempleSound[] = []
    const stageSounds: NoteStageSound[] = []
    let templeShown = ""
    // dev only: lets the test scripts reach the combat and the temple
    if (process.env.NODE_ENV !== "production") Object.assign(window as unknown as Record<string, unknown>, { __pigchicken: combat, __pigchickenTemple: temple, __pigchickenStage: stage, __chickenEngine: engine })
    const drone = createDrone()
    let zoneShown: Zone | null = null, zoneBanner = 0
    const unsubItems = subscribeItems(next => combat.setItems(next))
    // the souls' catalogue in use: the game's, or the draft an admin edits in the library (the souls flying follow it)
    setSoulEntries(loadSoulEntries())
    const unsubSouls = subscribeSoulEntries(next => { setSoulEntries(next); combat.refreshSouls() })
    // creative mode: a rack that keeps a pistol to pick up, and target dummies in the first two scenes
    let placed = false, offerShown = "", templeFor = "", wasPortalArrival = false
    // the temple's things move with the world's width: the gong and its racks
    let gong: Combat["targets"][number] | null = null, resetStone: Combat["targets"][number] | null = null, jukebox: Combat["targets"][number] | null = null
    const templeRacks: Combat["racks"] = []
    const G = WORLD_GROUND_Y
    // the Pátio's own things (dummies, racks, horde buttons) come from its layout and follow its edits
    const layoutSync = createLayoutSync(combat)
    let syncedElements: LayoutElement[] | null = null, syncedScreens = -1
    // the Quadros de lousa's ghosts (training-ghosts.ts), in world units like the layout they come from
    const ghosts = ghostHostRef.current ? createTrainingGhosts(ghostHostRef.current) : null
    let ghostElements: LayoutElement[] = []
    const place = () => {
      // the temple: the gong (strike it to start) and a few weapons and instruments by the entrance
      combat.addButton(0, G - 40, "gong", 130, 150)
      gong = combat.targets[combat.targets.length - 1]
      // and the reset stone (Recomeçar): strike it to end the game and clear the panels
      combat.addButton(0, G - 4, "reset", 80, 110)
      resetStone = combat.targets[combat.targets.length - 1]
      // and the jukebox: strike it to pick a song
      combat.addButton(0, G - 4, "jukebox", JUKEBOX_W, JUKEBOX_H)
      jukebox = combat.targets[combat.targets.length - 1]
      ;(["bat", "pistol", "smg", "guitar", "flute"] as ItemId[]).forEach(id => { combat.addRack(0, id); templeRacks.push(combat.racks[combat.racks.length - 1]) })
      placed = true
    }
    const placeTemple = (screens: number, on: boolean) => {
      // without the temple its things wait far outside the world, and its racks stop (their items go too)
      const L = on ? templeScene(screens) * SCENE_W : -1e6
      if (gong) { gong.x = gong.home = L + GONG_X }
      if (resetStone) { resetStone.x = resetStone.home = L + RESET_X }
      if (jukebox) { jukebox.x = jukebox.home = L + DISC_X }
      templeRacks.forEach((r, i) => {
        r.x = L + 60 + i * 90
        const at = combat.racks.indexOf(r)
        if (!on && at >= 0) {
          combat.racks.splice(at, 1)
          const item = combat.pickups.findIndex(p => p.id === r.pickupId)
          if (item >= 0) combat.pickups.splice(item, 1)
          r.pickupId = undefined; r.t = 0
        } else if (on && at < 0) combat.racks.push(r)
      })
      templeFor = `${screens}:${on}`
    }
    // the platforms the shots hit, in world units (the same boxes the world draws)
    let worldBoxes: Box[] = []
    // the layout's Zonas sonoras and Faixas fixas: what each point of the map plays
    let worldMusic: { zones: ZoneBox[]; lanes: LanesBox[] } = { zones: [], lanes: [] }
    // the zones as they play now (the ones with walls change when their life runs out: zone-life.ts)
    let playZones: ZoneBox[] = []
    // the scenes' own zones: Zonas sonoras stuck to the ground, under the map's (made again when the Pátio changes
    // them, their limits or its width)
    let ground: ZoneBox[] = [], groundOf: unknown[] = []
    const allZones = () => liveZones([...ground, ...worldMusic.zones])
    combat.setPlaceEnv((x, y) => placeEnvAt(playZones, worldMusic.lanes, x, y))
    combat.setZoneWalls((px, py, x, y, count) => {
      const hit = zoneWallHit(playZones, px, py, x, y)
      if (!hit) return null
      const died = count ? hitZone(hit.box.id) : null
      if (died) playZones = allZones()
      return { flipX: hit.flipX, color: (died ?? hit.box.zone).color, died: !!died }
    })
    const header = document.querySelector("main header")
    let drawnCamX = NaN, drawnCamY = NaN, drawnZoom = NaN, drawnW = NaN, drawnH = NaN
    let viewTop = header?.getBoundingClientRect().bottom ?? 0
    const measureHeader = () => { viewTop = header?.getBoundingClientRect().bottom ?? 0 }
    const headerObserver = new ResizeObserver(measureHeader)
    if (header) headerObserver.observe(header)
    const fit = () => {
      const dpr = patioPixelRatio(window.devicePixelRatio, graphicsQuality() !== "high")
      canvas.width = Math.round(stageWidth() * dpr); canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Allocate the wheel's full buffer only while it is open.
      wheelCanvas.width = 1; wheelCanvas.height = 1
      wheelCanvas.style.display = "none"
      wheelDrawn = false
      measureHeader()
    }
    fit()
    window.addEventListener("resize", fit)
    // a new graphics level changes the canvases' pixel ratio
    const unsubscribeQuality = subscribeQuality(fit)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const S = settingsRef.current
      let st = engine.getMotionState()
      const viewW = st.width, worldW = SCENE_W * worldScenes(S.screens)
      if (!placed) {
        place()
        // she starts by the entrance portal (world x), not in the middle of the screen
        // (coming through a portal from another Pátio, she is put at this one's entry portal as she arrives)
        const spawnX = spawnXRef.current
        if (spawnX !== undefined && !engine.getPortalTransit()) { engine.shift(spawnX - camX - st.x); st = engine.getMotionState() }
      }
      if (templeFor !== `${S.screens}:${templeRef.current}`) placeTemple(S.screens, templeRef.current)
      if (syncedElements !== elementsRef.current || syncedScreens !== S.screens) {
        syncedElements = elementsRef.current; syncedScreens = S.screens
        const shown = elementsInWorld({ v: 1, elements: syncedElements }, S.screens)
        layoutSync.sync(syncedElements, S.screens)
        gongSet.clear()
        for (const el of syncedElements) if (el.kind === "gong" && el.params.gong) gongSet.set(el.id, el.params.gong)
        for (const id of [...gongRuns.keys()]) if (!gongSet.has(id)) { gongRuns.delete(id); templeDraw.gongs.delete(`gong:${id}`) }
        const nextBoxes = layoutBoxes(shown)
        for (const pickup of combat.pickups) {
          if (!pickup.resting || pickup.y >= G) continue
          const supports = (box: Box) => box.solid !== false && pickup.y === box.t && pickup.x >= box.l && pickup.x <= box.r
          if (nextBoxes.some(box => supports(box) && box.occludedAt?.(pickup.x, pickup.y)) &&
              !nextBoxes.some(box => supports(box) && !box.occludedAt?.(pickup.x, pickup.y))) pickup.resting = false
        }
        worldBoxes = nextBoxes
        worldMusic = layoutMusic(shown)
        ghostElements = shown
        setPerchSpans(perches, powerSpans(shown.filter(e => !e.hidden)), perchLines(shown))
        playZones = allZones()
      }
      // the button stays while Pegar is held, so holding it while walking keeps taking items
      const offer = combat.hover ? "take" : combat.hoverOwned ? "equip" : offerShown && engine.peekActions().grab ? offerShown as "take" | "equip" : ""
      if (offer !== offerShown) { offerShown = offer; setGrabOffer(offer) }

      // ---------- camera: only the crop changes with the screen, never the size of things ----------
      const worldX = camX + st.x
      // the look-ahead: the view leans toward the side she faces (and slides over when she turns around)
      if (!st.held) lead = leadStep(lead, st.face, S.camera === "follow" ? S.lookAhead : 0, S.lookAheadSpeed, dt)
      const portalArrival = st.state === 'portalArrival'
      const snapToPortal = portalArrival && !wasPortalArrival
      wasPortalArrival = portalArrival
      const padButtons = padTokensFor(devicesRef.current)
      const rightStick = stickFor(devicesRef.current, 1, controls.analog.deadzoneR)
      const padZoom = padButtons.has("Pad:b8")
      const padPan = padButtons.has("Pad:b9") && !!rightStick
      showCameraMode(cameraKey || padZoom || padButtons.has("Pad:b9"))
      const padReset = padZoom && padButtons.has("Pad:b11")
      if (padReset) { zoom = 1; if (!padResetHeld) resetView() }
      else if (padZoom && rightStick) zoom = clampZoom(zoom * Math.exp(-rightStick.y * rightStick.mag * dt * 0.8))
      padResetHeld = padReset
      const mousePan = cameraKey && (panPointer !== null || panDeltaX !== 0 || panDeltaY !== 0)
      const panHeld = mousePan || padPan
      const worldY = st.y - (oy ?? 0)
      // Camera shifts rebase the engine's screen coordinates; only world motion ends a parked panorama.
      const movingPlayer = playerSeen && !st.held && Math.hypot(worldX - lastPlayer.x, worldY - lastPlayer.y) > 0.1
      if (panHeld && !wasPanHeld) { panInterrupted = false; forceFollow = false }
      if (!panHeld) panInterrupted = false
      if ((panParked || panHeld) && movingPlayer) { forceFollow = true; panParked = false; if (panHeld) panInterrupted = true }
      if (snapToPortal) { panParked = false; panInterrupted = panHeld }
      const recenter = resetCamera
      resetCamera = false
      if (recenter) {
        panParked = false; panInterrupted = panHeld; forceFollow = true; lead = 0
        panPointer = null; panDeltaX = 0; panDeltaY = 0
        document.body.classList.remove('pigchicken-camera-dragging')
      }
      const panActive = panHeld && !panInterrupted
      if (panActive) panParked = true
      const manualView = panActive || panParked
      wasPanHeld = panHeld
      const cameraMode = manualView ? 'fixed' : forceFollow || snapToPortal || zoom > 1 ? 'follow' : S.camera
      let next = manualView || (st.held && !recenter) ? camX : cameraStep(camX, { mode: cameraMode, worldX, viewW, worldW, zoom, dt: snapToPortal || recenter ? 1 : dt, deadband: (snapToPortal || forceFollow) ? 0 : S.deadband / zoom, lag: snapToPortal || recenter ? 1 : forceFollow ? 12 : S.lag, lead: (snapToPortal || forceFollow) ? 0 : lead / zoom })
      const groundScreen = st.height - groundHRef.current
      const worldTop = topRef.current
      const viewCentreY = st.height / 2
      const zoomGround = viewCentreY + (groundScreen - viewCentreY) / zoom
      const zoomTop = viewCentreY + (viewTop - viewCentreY) / zoom
      const yr = cameraYRange(zoomGround, worldTop, zoomTop)
      if (oy === null) oy = yr.lo
      let nextOy = manualView || (st.held && !recenter) ? oy : cameraYStep(oy, { worldY: st.y - oy, groundScreen: zoomGround, viewTop: zoomTop, dt: snapToPortal || recenter ? 1 : dt, lag: snapToPortal || recenter ? 1 : forceFollow ? 12 : S.lag, top: worldTop })
      if (zoom > 1 && !manualView && !st.held) {
        const feetY = st.y - oy
        const minY = zoomTop + 240 * st.scale - feetY, maxY = zoomGround - feetY
        const visibleY = minY <= maxY ? Math.max(minY, Math.min(maxY, nextOy)) : (minY + maxY) / 2
        nextOy = Math.max(yr.lo, Math.min(yr.hi, visibleY))
      }
      const panRange = cameraXRange(viewW, worldW, zoom)
      if (manualView) {
        next = Math.max(panRange.lo, Math.min(panRange.hi, next))
        nextOy = Math.max(yr.lo, Math.min(yr.hi, nextOy))
      }
      if (panActive) {
        const dx = mousePan ? -panDeltaX / zoom : 0, dy = mousePan ? panDeltaY / zoom : 0
        const speed = 720 * dt * (rightStick?.mag ?? 0)
        next = Math.max(panRange.lo, Math.min(panRange.hi, camX + dx - (padPan && rightStick ? rightStick.x * speed : 0)))
        nextOy = Math.max(yr.lo, Math.min(yr.hi, (oy ?? yr.lo) + dy + (padPan && rightStick ? rightStick.y * speed : 0)))
        panDeltaX = 0; panDeltaY = 0
      }
      // the other local players' chickens and the chicks that follow her live in the same camera
      const others = [...(extras?.current?.values() ?? []), ...(chicks?.current?.values() ?? []), ...(ghosts?.engines() ?? [])]
      if (next !== camX || nextOy !== oy) {
        engine.shift(camX - next, nextOy - oy)
        others.forEach(o => o.shift(camX - next, nextOy - (oy as number)))
        camX = next; oy = nextOy
      }
      // her ground is the world's, wherever the camera puts it on the screen
      if (Math.abs(st.groundY - (G + oy)) > 0.01) engine.setGroundHeight(st.height - G - oy)
      st = engine.getMotionState()
      const camY = oy
      // the player in use lets the last soul of their cage in front out, where that cage is on the screen (in world
      // px), or, with it empty, calls their souls back
      const letSoulOut = (id: string) => {
        if (!combat.bagOfSouls.length) { combat.callSouls(); return }
        const at = cageBoxes.find(b => b.id === id && b.i === 0), scx = stageWidth() / 2, scy = window.innerHeight / 2
        const eng = id === "p1" ? engine : extras?.current?.get(id), es = eng?.getMotionState()
        combat.releaseSoul(at ? { x: (at.cx - scx) / zoom + scx + camX, y: (at.cy - scy) / zoom + scy - camY } : { x: (es?.x ?? 0) + camX, y: (es?.y ?? 0) - camY - 200 * (es?.scale ?? 1) })
      }
      // the Gaiolas' binds of the player in use: "Trocar de gaiola" brings the next one to the front; "Soltar alma"
      // lets a soul out when it is let go, or, held for CAGE_HOLD with more than one cage, turns them instead
      const cageBinds = (id: string, a: Partial<Record<ChickenAction, boolean>>, p: Partial<Record<ChickenAction, boolean>>) => {
        if (a.cageSwap && !p.cageSwap) combat.rotateCages()
        let held = cageHolds.get(id) ?? 0
        if (a.cageRelease) {
          if (!p.cageRelease && combat.cages.length < 2) { letSoulOut(id); held = -1 }
          else if (held >= 0 && (held += dt) >= CAGE_HOLD) { combat.rotateCages(); held = -1 }
        } else { if (held > 0) letSoulOut(id); held = 0 }
        cageHolds.set(id, held)
      }
      // the resting height the parallax depths slide from (the floor near the screen's bottom)
      setCameraRestY(yr.lo)
      lastPlayer = { x: st.x + camX, y: st.y - camY }; playerSeen = true
      // the limits: walls and ceiling at the inner edge of the black frame (WorldLimits)
      const edges = cameraBounds(camX, { mode: manualView || forceFollow || zoom > 1 ? 'follow' : S.camera, viewW, worldW })
      const walls = { lo: edges.lo + LIMIT_BORDER, hi: edges.hi - LIMIT_BORDER, top: worldTop + LIMIT_BORDER + camY }
      engine.setBounds(walls)
      others.forEach(o => {
        const os = o.getMotionState()
        if (Math.abs(os.groundY - (G + camY)) > 0.01) o.setGroundHeight(os.height - G - camY)
        o.setBounds(walls)
      })
      ghosts?.frame({
        elements: ghostElements, camX, camY, zoom, dt, walls,
        players: [st, ...[...(extras?.current?.values() ?? [])].map(o => o.getMotionState())].map(os => ({ x: os.x + camX, y: os.y - camY })),
      })
      // the zoom pivots on the stage's centre, so a new stage size (the editor's dock) also redraws it
      if (worldRef.current && (camX !== drawnCamX || camY !== drawnCamY || zoom !== drawnZoom || stageWidth() !== drawnW || window.innerHeight !== drawnH)) {
        const world = worldRef.current
        world.style.transform = `translate3d(${(stageWidth() / 2) * (1 - zoom) - camX * zoom}px,${(window.innerHeight / 2) * (1 - zoom) + camY * zoom}px,0) scale(${zoom})`
        world.style.transformOrigin = "0 0"
        setPlatformWorldOffset(world, -camX, camY)
        drawnCamX = camX; drawnCamY = camY; drawnZoom = zoom; drawnW = stageWidth(); drawnH = window.innerHeight
      }
      if (fgRef?.current) {
        fgRef.current.style.transform = `translate3d(${(stageWidth() / 2) * (1 - zoom) - camX * zoom}px,${(window.innerHeight / 2) * (1 - zoom) + camY * zoom}px,0) scale(${zoom})`
        fgRef.current.style.transformOrigin = "0 0"
      }
      // the layers above the chicken and the editor's handles follow the same camera
      moveLiveCamera(camX, camY, zoom)
      engine.setCameraZoom(zoom)
      others.forEach(o => o.setCameraZoom(zoom))

      // ---------- aim ----------
      // picked up by the pointer: every action but Throw waits until she is let go
      const dragged = st.held
      const act = dragged ? onlyThrow(engine.getActions()) : engine.getActions()
      if (dragged) { mouseBtn.fire = false; mouseBtn.melee = false; slotPick = 0; slotTap.current = 0; barMove.current = null; wheel = 0 }
      const an = controls.analog
      const devs = devicesRef.current
      if (noMouse() && (mouse || mouseBtn.fire || mouseBtn.melee)) { mouse = null; mouseBtn.fire = false; mouseBtn.melee = false }
      const rightStickForAim = stickFor(devs, 1, an.deadzoneR), leftStick = stickFor(devs, 0, an.deadzoneL) ?? readTouchMoveStick(an.deadzoneL)

      // ---------- the inventory wheel: open while its button is held; point at an item (mouse, right stick, touch) ----------
      // letting go of the button closes it and equips the item pointed at; fire, jump or run pressed with an item
      // pointed at equips it and closes the wheel too
      combat.setInventoryLimit(inventoryLimitRef.current)
      const slots = combat.inventory, nSlots = slots.length
      const slotsKey = `${combat.inventoryGroups.join("")}:${combat.current}:${slots.some(Boolean) ? 1 : 0}`
      if (slotsKey !== slotsShown) { slotsShown = slotsKey; setInvKey(slotsKey) }
      barItems.current = slots.map(Boolean)
      let wheelPick = 0
      const showWheel = (on: boolean) => {
        if (wh.open === on) return
        wh.open = on; wh.at = now; wh.hover = -1
        wheelPtr.current = null; wheelTap.current = null
        setWheelOpen(on)
      }
      const confirmWheel = () => { if (wh.hover >= 0 && wh.hover < nSlots) wheelPick = wh.hover + 1; showWheel(false) }
      if ((act.deselectItem && !prev.deselectItem) || dragged) showWheel(false)
      else if (act.itemWheel && !prev.itemWheel && !wh.open) showWheel(true)
      else if (!act.itemWheel && wh.open) confirmWheel()
      else if (wh.open && wh.hover >= 0) {
        const firePressed = act.fire && !prevFire
        if (firePressed || (act.jump && !prev.jump) || (act.run && !prev.run)) { if (firePressed) fireBlock = true; confirmWheel() }
      }
      if (wh.open) {
        const g = wheelGeom()
        let hov = wh.hover >= nSlots ? -1 : wh.hover
        // the right stick (or the on-screen one) pushed far enough points at a slice; at rest it keeps the last one
        const stick = rightStickForAim ?? (touchAim.current && touchAim.current.mag > 0.4 ? touchAim.current : null)
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
      // without the mouse, the movement keys aim in the 8 directions; brood is not a direction, crouch is down
      const keys = keysAimFor(devs) ? { x: (act.right ? 1 : 0) - (act.left ? 1 : 0), y: (act.crouch ? 1 : 0) - (act.up ? 1 : 0) } : { x: 0, y: 0 }
      const keysAim = keys.x !== 0 || keys.y !== 0
      // the wheel's stick choices are not aim: while it is open the aim stick is not held
      const liveStick = wh.open ? null : rightStickForAim ?? touchAim.current
      if (liveStick) { heldStick = { stick: liveStick, touch: !rightStick }; stickOwner.moved(1, now); owner.release() }
      // the left stick or the movement keys take the aim back from a mouse / aim stick still for `aimRelease`
      if (leftStick || keysAim) { owner.otherAim(now, S.aimRelease); stickOwner.otherAim(now, S.aimRelease) }
      const held = !liveStick && stickOwner.owns ? heldStick : null
      // her shoulder as drawn (it turns with her body on walls)
      const origin = engine.getState().shoulder
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
      const aimMouse = mouse && zoom !== 1 ? {
        x: (mouse.x - stageWidth() / 2) / zoom + stageWidth() / 2,
        y: (mouse.y - window.innerHeight / 2) / zoom + window.innerHeight / 2,
      } : mouse
      // while the wheel is open the mouse and the right stick choose items, not the aim
      aim = resolveAim({
        rightStick: wh.open ? null : rightStickForAim ?? (held && !held.touch ? held.stick : null), mouse: autoAt ?? (owner.owns && !wh.open && !panActive ? aimMouse : null),
        touch: wh.open ? null : throwAim.current ?? touchAim.current ?? (held?.touch ? held.stick : null), leftStick, keys, origin,
        face: st.face, aimMagnetDeg: an.aimMagnetDeg,
      })
      const d = combat.def()
      // the aim starts at the muzzle: with the cursor, turn the item until the line through its muzzle
      // (not her shoulder) passes over the cursor
      const tgt = aim.target
      // (an item with a rig turns around its pivot: the line goes through the muzzle's height at the pivot)
      if (armed && tgt && (d.muzzleY || d.pivotY)) {
        for (let i = 0; i < 3; i++) {
          const o = engine.heldPoint(aim.angle, d.pivotX, d.muzzleY)
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
      // a soul that shakes her aim (lib/pigchicken/soul-acts.ts): it sways for a moment
      const skew = combat.aimSkew
      if (skew) { const a = aim.angle + skew; aim = { ...aim, angle: a, dx: Math.cos(a), dy: Math.sin(a) } }
      const muzzleAt = (a: number) => armed ? engine.heldPoint(a, d.muzzleX, d.muzzleY) : origin
      engine.setGame({
        // brooding does not freeze her: "frente + chocar" walks at its own speed (0 keeps her still), aiming with the item;
        // a held Throw uses the bird's ground/air slowdown (switching items cancels it)
        throwHeld: !wh.open && act.throw && armed && !combat.throwVoid,
        aimFace: aim.secondary && Math.abs(aim.dx) > 0.2 ? Math.sign(aim.dx) : null,
        lookAngle: aim.source === 'rightStick' || aim.source === 'leftStick' || aim.source === 'touch' || aim.source === 'keys' ? aim.angle : null,
        ...effectGame(combat.effect, d.weight, combat.effects),
      })

      // ---------- combat (world coordinates) ----------
      if (fireBlock && !act.fire) fireBlock = false
      prevFire = act.fire
      const fire = !wh.open && !fireBlock && (act.fire || mouseBtn.fire || (!!autoAt && now < autoUntil)), melee = !wh.open && (act.melee || mouseBtn.melee)
      let pick = quickSwitchStep(act, prev, engine.isShiftHeld(), quickSwitch, dt, controls.inventory.repeatDelay, controls.inventory.repeatInterval)
      if (wheel) { pick = wheel > 0 ? 1 : -1; wheel = 0 }
      const move = barMove.current
      barMove.current = null
      const input = {
        deselect: act.deselectItem && !prev.deselectItem,
        cancelFire: cancelPecks || wh.open || fireBlock || document.hidden || st.held || st.state.startsWith('portal'),
        fire, firePressed: fire && !prev.fire, melee: melee && !prev.melee,
        throwHeld: act.throw && !wh.open, throwReleased: !act.throw && !!prev.throw && !wh.open,
        reload: (() => {
          const menuReload = padButtons.has("Pad:b9")
          let pressed = act.reload && !prev.reload
          if (menuReload && act.reload) {
            if (!prev.reload) { reloadPending = true; reloadPendingAt = now; reloadFired = false }
            if (padPan && reloadPending) { reloadPending = false; reloadFired = true }
            else if (reloadPending && now - reloadPendingAt >= 180) { pressed = true; reloadPending = false; reloadFired = true }
          } else if (reloadPending && prev.reload && !act.reload) {
            if (!reloadFired) pressed = true
            reloadPending = false; reloadFired = false
          }
          return pressed
        })(), pick: wh.open ? 0 : pick, slot: wheelPick || slotPick || slotTap.current, grab: act.grab && !prev.grab, grabHeld: act.grab, grabRun: engine.grabIsRun(),
        groupPick: wh.open ? null : groupPress(act, prev), move,
      }
      slotPick = 0; slotTap.current = 0
      cageBinds("p1", act, prev)
      prev = { ...act, fire, melee }
      const boxes = worldBoxes
      const body = { x: st.x + camX, y: st.y - camY, face: st.face, scale: st.scale, grounded: st.grounded, state: st.state, vx: st.vx }
      const worldOrigin = { x: origin.x + camX, y: origin.y - camY }
      // the enemies move inside the scene she is in: the same for every screen size (and every player)
      const sceneL = Math.min(sceneAt(body.x), worldScenes(S.screens) - 1) * SCENE_W
      combat.setView(sceneL, sceneL + SCENE_W)
      // enemies are made by the lobby's owner (online): here, or asked of it
      const spawnEnemies = (s: NetSpawn) => {
        if (net.follower) { net.requestSpawn(s); return }
        const bounds = { l: s.l, r: s.r }
        if (s.what === "aliens") combat.spawnAliens(G, s.x, bounds)
        else if (s.what === "zombies") combat.spawnZombies(G, s.x, s.n ?? horde.zombies, bounds)
        else if (s.what === "alien") {
          const species = CATALOG_SPECIES[Math.floor(Math.random() * CATALOG_SPECIES.length)]
          const variant = variantFor(catalog, undefined, species)
          combat.addTrainingAlien(s.x, s.y, { ...variantSize(variant), hp: variant.hp, data: variantData(variant) })
        } else combat.addTrainingZombie(s.x, s.y)
      }
      const scene = { l: sceneL, r: sceneL + SCENE_W }
      for (const asked of net.frame(now)) spawnEnemies(asked)
      for (const request of trainingSpawns?.current.splice(0) ?? []) spawnEnemies({ what: request.kind === "alien" ? "alien" : "zombie", x: request.x, y: request.y, ...scene })
      let gongHit = false, resetHit = false, discHit = false
      const gongStrikes: string[] = []
      combat.pressed.splice(0).forEach(id => {
        if (id === "gong") gongHit = true
        else if (id === "reset") resetHit = true
        else if (id === "jukebox" || id.startsWith("jukebox:")) { jukeFrom = id; templeDraw.jukeLast = id; jukeRing = 0; openJukebox() }
        else if (id.startsWith("gong:")) gongStrikes.push(id.slice(5))
        else if (id === "aliens") spawnEnemies({ what: "aliens", x: body.x, y: body.y, ...scene })
        else if (id === "zombies") spawnEnemies({ what: "zombies", x: body.x, y: body.y, n: horde.zombies, ...scene })
        else if (id === "zcount") horde.zombies = ZOMBIE_COUNTS[(ZOMBIE_COUNTS.indexOf(horde.zombies) + 1) % ZOMBIE_COUNTS.length]
        else if (id === "pattern") horde.pattern = (horde.pattern + 1) % ALIEN_PATTERNS.length
      })
      buttonLabels.aliens = "SOLTAR ALIENS"; buttonLabels.pattern = `PADRÃO: ${ALIEN_PATTERNS[horde.pattern].label.toUpperCase()}`
      buttonLabels.zombies = "SOLTAR ZUMBIS"; buttonLabels.zcount = `ZUMBIS: ${horde.zombies}`
      // Register every local player before the shared projectile update, including its owner.
      // (id: the local player each one is, for what their souls flying free do to them; the chicks have none)
      const playerOf = new Map([[engine, "p1"] as const, ...Array.from(extras?.current?.entries() ?? [], ([id, e]) => [e, id] as const)])
      combat.setBlastActors([engine, ...Array.from(extras?.current?.values() ?? []), ...Array.from(chicks?.current?.values() ?? [])].map(eng => {
        const st = eng.getMotionState(), x = st.x + camX, y = st.y - camY
        return { id: playerOf.get(eng), box: { l: x - 45 * st.scale, r: x + 45 * st.scale, t: y - 200 * st.scale, b: y }, push: (vx: number, vy: number) => eng.impulse(vx, vy, true) }
      }))
      if (perches.spans.length) {
        perches.camX = camX; perches.camY = camY - yr.lo; perches.restY = yr.lo; perches.time += dt
        perches.players = [{ x: body.x, y: body.y - 90 * st.scale }, ...[...(extras?.current?.values() ?? [])].map(e => { const s = e.getMotionState(); return { x: s.x + camX, y: s.y - camY - 90 * s.scale } })]
      }
      // the chicks are caught by any player's Passaguá, like the birds (and count as souls); online, the other
      // browsers' chicks too: those are asked of their browser, and one that is no longer there (caught over there,
      // or its browser left) goes in a little cloud
      const catchables: Catchable[] = [...(chicks?.current?.entries() ?? [])].map(([id, eng]) => {
        const cs = eng.getMotionState()
        return { x: cs.x + camX, y: cs.y - camY - 100 * cs.scale, r: 100 * cs.scale, id: chickNumber(eng), style: chickStyleOf(eng), push: (vx: number, vy: number) => eng.impulse(vx, vy, true), catch: () => { eng.destroy(); chicks?.current?.delete(id) } }
      })
      const netSeen = new Map<string, { x: number; y: number }>()
      netChicks?.current?.forEach((m, key) => {
        if (m.hidden) return
        const cs = m.engine.getMotionState(), x = cs.x + camX, y = cs.y - camY - 100 * cs.scale
        netSeen.set(key, { x, y })
        catchables.push({ x, y, r: 100 * cs.scale, net: { pid: m.pid, id: m.id }, catch: m.hide })
      })
      netChicksSeen.forEach((p, key) => { if (!netSeen.has(key) && !netChicks?.current?.has(key)) combat.puff(p.x, p.y) })
      netChicksSeen = netSeen
      combat.setCatchables(catchables)
      // the air the souls flying free keep inside: the world's walls and the top of what the camera shows
      combat.setSoulAir({ l: walls.lo + camX, r: walls.hi + camX, top: Math.max(walls.top, zoomedView(viewW, st.height, zoom, viewTop).y) - camY })
      // the players in a portal: their souls flying free are sucked in and come out with them
      soulPortals.clear()
      const inPortal = (id: string, eng: ChickenEngine) => { const t = eng.getPortalTransit(); if (t) soulPortals.set(id, { mode: t.mode, x: t.x + camX, y: t.y - camY, k: t.k }) }
      inPortal("p1", engine)
      extras?.current?.forEach((eng, id) => inPortal(id, eng))
      combat.setSoulPortals(soulPortals)
      // presses on the Gaiolas: the one in front lets a soul out, one behind comes to the front
      if (cageTaps.length) {
        for (const tap of cageTaps.splice(0)) {
          if (!cageBoxes.some(b => b.id === tap.id && b.i === tap.i) || (tap.id !== "p1" && !extras?.current?.has(tap.id))) continue
          combat.use(tap.id)
          if (tap.i > 0) combat.rotateCages(tap.i); else letSoulOut(tap.id)
        }
        combat.use("p1")
      }
      const m0 = muzzleAt(d.turnRate > 0 ? combat.aimAngle : aim.angle)
      // the aim's distance from her sets the instrument's loudness (lib/pigchicken/aim-volume.ts)
      // (mouse: full at the scale fan's circle; sticks: their value, which already starts at 0 at the dead zone's edge)
      combat.setAimReach(aimReach({ px: aim.target ? Math.hypot(aim.target.x - origin.x, aim.target.y - origin.y) : null, radius: SCALE_FAN_R * scaleSizeRef.current * st.scale, stick: aim.source === "rightStick" || aim.source === "touch" || aim.source === "leftStick" ? aim.strength : null }))
      // where the reticle is (the cursor; with a stick or the keys, at the reticle's distance): a deck's card flies there
      { const sd = S.reticleDist * (aim.source === "rightStick" || aim.source === "touch" ? 0.45 + 0.55 * aim.strength : 1); combat.setAimPoint(aim.target ? { x: aim.target.x + camX, y: aim.target.y - camY } : { x: m0.x + Math.cos(aim.angle) * sd + camX, y: m0.y + Math.sin(aim.angle) * sd - camY }) }
      combat.step(dt, body, worldOrigin, { x: m0.x + camX, y: m0.y - camY }, aim.angle, input, boxes, G, (vx, vy) => engine.impulse(vx, vy), { peckOrigin: (() => { const p = engine.rigPoint("neck"); return { x: p.x + camX, y: p.y - camY } })(), throwOrigin: (() => { const p = engine.heldPoint(aim.angle, 0, 0); return { x: p.x + camX, y: p.y - camY } })() })
      engine.setGame({ throwCharging: !!combat.held && !wh.open && (combat.throwCharge > 0 || (d.reticle === 'grenade' && d.fireMode === 'charge' && combat.fireCharge > 0)) })
      // the Itens panel follows the item the main player holds
      announceHeldItem(combat.held?.item ?? null)
      announceHeldScale(combat.held && combat.def().instrument ? combat.scale.id : null)
      scalePlaying.set("p1", input.fire || input.melee)
      // the items each local player stands on: a blue (take / swap) or grey (equip) outline with that player's grab key
      pickupMarks.clear(); chestMarks.clear()
      markHover(combat, grabLabel(controls, devs))

      // ---------- the other local players: their own items (a loadout each), in the same world ----------
      const extraList = extras?.current ? [...extras.current.entries()] : []
      extraList.forEach(([id, eng]) => {
        const xs = eng.getMotionState(), xa = xs.held ? onlyThrow(eng.getActions()) : eng.getActions(), xp = extraPrev.get(id) ?? {}
        combat.use(id)
        const xd = combat.def(), xArmed = !!combat.inventory[combat.current]
        // aim: their gamepad's right stick; else the left stick (every way, up and down included); else, without the mouse, their movement keys (8 directions); else ahead
        const devs = eng.getDevices()
        const rs = stickFor(devs, 1, an.deadzoneR), ls = rs ? null : stickFor(devs, 0, an.deadzoneL)
        const ahead = xs.face >= 0 ? 0 : Math.PI
        const aimStick = rs ?? ls
        const xkb = keysAimFor(devs)
        const xkx = xkb ? (xa.right ? 1 : 0) - (xa.left ? 1 : 0) : 0, xky = xkb ? (xa.crouch ? 1 : 0) - (xa.up ? 1 : 0) : 0
        const xKeys = xkx !== 0 || xky !== 0
        const angle = (aimStick ? magnetAngle(Math.atan2(aimStick.y, aimStick.x), an.aimMagnetDeg) : xKeys ? Math.atan2(xky, xkx) : ahead) + combat.aimSkew
        const xo = eng.getState().shoulder
        const xm = xArmed ? eng.heldPoint(xd.turnRate > 0 ? combat.aimAngle : angle, xd.muzzleX, xd.muzzleY) : xo
        const xrepeat = extraQuickSwitch.get(id) ?? newQuickSwitchRepeat()
        extraQuickSwitch.set(id, xrepeat)
        const xpick = quickSwitchStep(xa, xp, eng.isShiftHeld(), xrepeat, dt, controls.inventory.repeatDelay, controls.inventory.repeatInterval)
        const xin = {
          deselect: xa.deselectItem && !xp.deselectItem,
          cancelFire: cancelPecks || document.hidden || xs.held || xs.state.startsWith('portal'),
          fire: xa.fire, firePressed: xa.fire && !xp.fire, melee: xa.melee && !xp.melee,
          throwHeld: xa.throw, throwReleased: !xa.throw && !!xp.throw, reload: xa.reload && !xp.reload, pick: xpick, slot: 0, grab: xa.grab && !xp.grab, grabRun: eng.grabIsRun(),
          groupPick: groupPress(xa, xp),
        }
        cageBinds(id, xa, xp)
        extraPrev.set(id, xa)
        extraAim.set(id, { muzzle: xm, angle: xd.turnRate > 0 ? combat.aimAngle : angle, reach: rs ? 0.45 + 0.55 * rs.mag : 1 })
        const xbody = { x: xs.x + camX, y: xs.y - camY, face: xs.face, scale: xs.scale, grounded: xs.grounded, state: xs.state, vx: xs.vx }
        combat.setAimReach((rs ?? ls)?.mag ?? 1)
        { const xdist = S.reticleDist * (rs ? 0.45 + 0.55 * rs.mag : 1); combat.setAimPoint({ x: xm.x + Math.cos(angle) * xdist + camX, y: xm.y + Math.sin(angle) * xdist - camY }) }
        combat.step(dt, xbody, { x: xo.x + camX, y: xo.y - camY }, { x: xm.x + camX, y: xm.y - camY }, angle, xin, boxes, G, (vx, vy) => eng.impulse(vx, vy), { world: false, peckOrigin: (() => { const p = eng.rigPoint("neck"); return { x: p.x + camX, y: p.y - camY } })(), throwOrigin: (() => { const p = eng.heldPoint(angle, 0, 0); return { x: p.x + camX, y: p.y - camY } })() })
        markHover(combat, grabLabel(controls, devs))
        scalePlaying.set(id, xin.fire || xin.melee)
        eng.setGame({ throwCharging: !!combat.held && (combat.throwCharge > 0 || (xd.reticle === 'grenade' && xd.fireMode === 'charge' && combat.fireCharge > 0)), throwHeld: xa.throw && !!combat.inventory[combat.current] && !combat.throwVoid, aimFace: xa.throw && rs && Math.abs(rs.x) > 0.2 ? Math.sign(rs.x) : null, lookAngle: aimStick || xKeys ? angle : null, ...effectGame(combat.effect, xd.weight, combat.effects) })
        const xsw = combat.swing
        eng.setPeck(combat.peck)
        eng.setSwing(rigSwing(xsw))
        eng.setHeld(heldItemPose(combat, now, null, xbody.face))
      })
      extraPrev.forEach((_, id) => { if (!extras?.current?.has(id)) { extraPrev.delete(id); extraQuickSwitch.delete(id); extraAim.delete(id); cageHolds.delete(id); combat.drop(id) } })
      combat.use("p1")

      // ---------- the temple's mini-game ----------
      const tL = templeScene(S.screens) * SCENE_W
      const inTemple = templeRef.current && body.x >= tL && body.x < tL + SCENE_W
      const events = combat.music.events.splice(0)
      // the note stage first: while its song plays, the gong is dull and the reset stone stops the song
      const stageOn = stage.active
      jukeRing += dt; templeDraw.jukeRing = jukeRing
      // what the gong (or Tocar) starts: the song picked, or the campaign
      const songPicked = library.picked !== CAMPAIGN_ID && stage.select(library.picked)
      let startCampaign = false
      const campaignOn = temple.state.phase === "intro" || temple.state.phase === "playing"
      if (playRequest !== null) {
        const id = playRequest
        playRequest = null
        if (id === CAMPAIGN_ID) startCampaign = !stageOn
        else if (stage.select(id) && !stageOn) { discHit = true; anchor = { free: requestFree || !templeRef.current } }
        requestFree = false
      }
      // Parar, in the jukebox's panel
      if (stopRequest) {
        stopRequest = false
        if (stageOn) stage.halt()
        else if (campaignOn) campaignStop = 3
      }
      // the Gongos of the layout: their strikes start their own song, or stop it while it plays
      for (const id of gongStrikes) {
        const p = gongSet.get(id), g = combat.targets.find(t => t.label === `gong:${id}`)
        if (!p || !g) continue
        const run = gongRuns.get(id) ?? newGongRun()
        gongRuns.set(id, run)
        if (campaignOn) { run.ring = 0; templeSounds.push({ kind: "gongDull" }); continue }
        const out = strikeGong(run, p, stageOn)
        if (out === "dull") playNoteStageSound({ kind: "dull" }, mixGain("effects"))
        else if (stageOn) {
          playNoteStageSound({ kind: "reset", hit: out === "stop" ? p.stopHits : run.stops, need: p.stopHits }, mixGain("effects"))
          if (out === "stop") stage.halt()
        } else {
          templeSounds.push({ kind: "gong", hit: out === "start" ? p.hits : run.hits, need: p.hits })
          if (out === "count") combat.addText(g.x, g.y - 190, `${run.hits}/${p.hits}`, "#ffd166", 22)
          else if (stage.select(p.song)) { discHit = true; anchor = { free: true, gongX: g.x } }
          else combat.addText(g.x, g.y - 190, "SEM MÚSICA", "#ff6b5b", 18)
        }
      }
      for (const [id, p] of gongSet) {
        const run = gongRuns.get(id) ?? newGongRun()
        gongRuns.set(id, run)
        stepGong(run, p, dt)
        templeDraw.gongs.set(`gong:${id}`, { ring: run.ring, waiting: !stageOn && !campaignOn, hits: run.hits, need: p.hits, label: p.title, lamps: p.lamps })
      }
      // the gong that speaks in the song's balloons: the one that started it, else the Gongo nearest to her
      const speakingGong = stageFree ? stageGongX ?? combat.targets.filter(t => t.label?.startsWith("gong:")).sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x))[0]?.x : undefined
      stage.step(dt, {
        targets: combat.targets, music: combat.music, sceneL: tL, sceneW: SCENE_W, groundY: G, inside: inTemple || stageFree, gongX: speakingGong,
        center: { x: body.x, y: body.y - stage.song.fan.centerY * body.scale },
        discHit, resetHit: resetHit && stageOn, busy: temple.state.phase === "intro" || temple.state.phase === "playing",
        events: combat.noteEvents.splice(0), fire: n => { combat.fireNoteShot(n) }, clearShots: src => combat.clearNoteShots(src),
        incoming: combat.noteShots.filter(n => n.state === "incoming" && n.source === "stage").length,
        fx: { burst: combat.burst, text: combat.addText },
        push: dir => engine.impulse(dir * 260, -200),
        sound: e => stageSounds.push(e),
      })
      stageSounds.splice(0).forEach(e => playNoteStageSound(e, mixGain("effects")))
      if (stageOn && gongHit) { gongHit = false; playNoteStageSound({ kind: "dull" }, mixGain("effects")) }
      // a new record: the song's best score is kept (and the banner says so)
      if (stage.state.phase === "done" && stage.state.t === 0 && !stage.state.draft) {
        const s = stage.state
        if (recordScore(stage.song.id, s.score, accuracy(s.counts, s.fired)) && s.banner) s.banner.title += " · novo recorde!"
      }
      if (stageOn) resetHit = false
      // a song just began: where it plays (the editor's Tocar daqui follows the jukebox struck last)
      if (stage.active && !wasStageOn) {
        const a = anchor ?? { free: jukeFrom !== "jukebox" || !templeRef.current }
        stageFree = a.free; stageGongX = a.gongX
      }
      wasStageOn = stage.active
      anchor = null
      if (!stage.active) { stageFree = false; stageGongX = undefined }
      const forcedReset = campaignStop > 0
      if (forcedReset) campaignStop--
      // the editor's playhead
      nowPlaying.id = stage.active ? stage.song.id : null
      nowPlaying.beat = stage.beatAt(combat.music.time, combat.music.secondsPerBeat())
      nowPlaying.draft = stage.state.draft
      const io: TempleIO = {
        targets: combat.targets, music: combat.music, sceneL: tL, groundY: G, inside: inTemple, body: { x: body.x, y: body.y, scale: body.scale }, boxes,
        gongHit, resetHit: resetHit || forcedReset, firePressed: input.firePressed,
        // a song picked: the gong's strikes start it (on the next frame, through the stage)
        song: songPicked ? () => { playRequest = library.picked; requestFree = false } : undefined, start: startCampaign, beats: events.filter(e => e.kind === "beat").map(e => e.n),
        fx: { burst: combat.burst, text: combat.addText },
        hurt: dir => engine.impulse(dir * 420, -380),
        sound: e => templeSounds.push(e),
        parry: (x, y, r, color) => combat.parry(x, y, r, color),
      }
      temple.step(dt, io)
      templeSounds.splice(0).forEach(e => playTempleSound(e, mixGain("effects")))
      const tp = temple.state.phase
      nowPlaying.campaign = tp === "intro" || tp === "playing"
      if (tp !== templeShown) { templeShown = tp; if (worldRef.current) worldRef.current.dataset.temple = tp }
      // the undead wait for the song (or the gong's campaign) to end before leaving; she rides the ones standing
      combat.setPlaying(stage.active || tp === "intro" || tp === "playing")
      const riders = worldRef.current?.querySelector<HTMLElement>("[data-undead-riders]")
      if (riders) syncRiders(riders, combat.undead)
      // a cleared stage: fireworks over the temple
      if ((tp === "cleared" || tp === "victory") && temple.state.t < (tp === "victory" ? 5 : 2.6) && Math.random() < dt * (tp === "victory" ? 9 : 6)) {
        const colors = ["#ffd166", "#ff4d6d", "#7bdff2", "#7bd88f", "#c77dff"]
        combat.burst(tL + 200 + Math.random() * (SCENE_W - 400), 140 + Math.random() * 320, 34, colors[Math.floor(Math.random() * colors.length)], 320, 4)
      }
      templeDraw.charges.clear()
      temple.state.aliens.forEach(a => { if (a.charge > 0) templeDraw.charges.set(a.id, a.charge) })

      // ---------- music: the zone of the scene she is in sets key, scale and tempo; ambience on its beat ----------
      // (in the temple: the stage's music, or the temple at rest)
      const templeMusic = stage.music ?? temple.music
      const groundNow = [sceneZonesRef.current, sceneEdgesRef.current, sceneMusicRef.current, S.screens]
      if (groundNow.some((v, i) => v !== groundOf[i])) {
        groundOf = groundNow
        ground = sceneMusicRef.current ? groundZones(sceneZonesRef.current, sceneEdgesRef.current, S.screens) : []
        playZones = allZones()
      }
      // the zone she is in: a Zona sonora of the map wins over the scene's (not over a song playing in the temple)
      // a song a Gongo or a Jukebox of the layout started plays wherever she goes, like the temple's inside it
      const musicHere = inTemple || (stageFree && stage.active)
      const inZone = templeMusic && musicHere ? null : zoneAt(playZones, body.x, body.y - 90 * body.scale, true)
      combat.setZoneBirds(inZone?.zone.birds ?? null)
      // with the scenes' zones off (Configurações do Pátio), outside a Zona sonora there is no ambience at all
      const zone = inZone ? soundZoneOf(inZone.id, inZone.zone) : musicHere ? templeMusic?.zone ?? TEMPLE_IDLE : NO_SCENE_ZONE
      combat.music.setZone(zone)
      combat.setQuantize(S.quantize)
      setMusicVolumes(mixGain("notes"), mixGain("ambience"))
      if (combat.music.zone !== zoneShown) { zoneShown = combat.music.zone; zoneBanner = 2.5 }
      zoneBanner = Math.max(0, zoneBanner - dt)
      const templeZone = combat.music.zone.id.startsWith("templo")
      events.forEach(e => {
        if (mixGain("ambience") <= 0) return
        if (e.kind === "bar" && !stage.silent) {
          // the temple keeps its drone; a zone plays the sustained voice it chose, if any
          const z = combat.music.zone, voice = templeZone ? { tone: "saw" as const, vol: 1, oct: 0 } : ambienceDrone(z.ambience ?? legacyAmbience(z.feel))
          if (voice) { const d = droneOf(z, combat.music.chord()); drone.set(d.root + 12 * voice.oct, d.fifth, d.third, voice.tone, voice.vol) }
          else drone.set(null)
        }
        if (e.kind === "step") {
          // a pause in total silence: no background
          if (templeZone) { if (!stage.silent) templeAmbience(templeMusic && combat.music.zone.id === templeMusic.zone.id ? templeMusic : null, e.n % 16, combat.music.bar, combat.music.chord(), combat.music.secondsPerBeat()) }
          else ambience(combat.music.zone, e.n % 16, combat.music.bar, combat.music.chord(true), combat.music.secondsPerBeat())
        }
      })
      if (mixGain("ambience") <= 0 || stage.silent) drone.set(null)

      // ---------- sound ----------
      setWeaponVolume(mixGain("weapons"))
      combat.sounds.splice(0).forEach(e => playWeaponSound(e.kind, e.item))
      // the souls just caught go into the library: a new one says its name where it was caught, a new note or
      // weapon of one already there shows a star
      for (const n of combat.soulNews.splice(0)) {
        const got = collectSoul(n.soul)
        if (got.first || got.trait) combat.addText(n.x, n.y - 44, got.first ? got.entry.name : "★", SOUL_RARITIES[got.entry.rarity].color, 15)
      }
      // the chicks let out of a Gaiola are chicks again: each one falls from where its cage is and joins the flock
      for (const r of combat.chickReleases.splice(0)) releaseChick({ style: r.soul.chick ?? 0, x: r.x - camX, y: r.y + camY })
      // aiming in (brood with an item): a soft sound on the weapons that have one
      if (aimLock && !wasLocked) playWeaponSound("aim", combat.inventory[combat.current]?.item ?? null)
      wasLocked = aimLock

      // ---------- draw ----------
      ctx.clearRect(0, 0, stageWidth(), window.innerHeight)
      ctx.save()
      if (zoom !== 1) { ctx.translate(stageWidth() / 2, window.innerHeight / 2); ctx.scale(zoom, zoom); ctx.translate(-stageWidth() / 2, -window.innerHeight / 2) }
      // the world's things stay under the header, like the world itself
      // a blow that lands jolts the world for a moment
      let jolt = swingShake(combat.swing)
      extraList.forEach(([id]) => { combat.use(id); jolt = Math.max(jolt, swingShake(combat.swing)) })
      combat.use("p1")
      const jx = jolt ? (Math.random() * 2 - 1) * jolt : 0, jy = jolt ? (Math.random() * 2 - 1) * jolt : 0
      const screenView = zoomedView(viewW, st.height, zoom, viewTop)
      const view = { ...screenView, x: screenView.x + camX, y: screenView.y - camY }
      const inWorld = () => { ctx.save(); ctx.beginPath(); ctx.rect(screenView.x, screenView.y, screenView.w, screenView.h); ctx.clip(); ctx.translate(jx, camY + jy) }
      lookTargets.length = 0
      lookTargets.push({ x: body.x, y: body.y - 170 * st.scale })
      inWorld()
      drawWorld(ctx, combat, camX, view)
      // online, the other browsers' souls wear a ring in their browser's colour
      const netPlayers = combat.netSouls.length ? getNetState().info?.players : null
      drawFreedSouls(ctx, combat, camX, view, extraList.length ? colorsRef.current : null, netPlayers ? pid => { const p = netPlayers.find(q => q.pid === pid); return p ? PLAYER_COLORS[p.color % PLAYER_COLORS.length] : undefined } : undefined)
      drawPoops(ctx, combat, camX, view)
      drawTempleShots(ctx, temple, camX, view)
      drawStageFan(ctx, stage, combat.noteShots, camX, combat.music.time, combat.music.beatPhase)
      drawNoteShots(ctx, combat.noteShots, camX, view)
      drawStageTalk(ctx, stage, camX)
      ctx.restore()
      const ang = combat.aimAngle, adx = Math.cos(ang), ady = Math.sin(ang)
      drawSwing(ctx, combat, origin, "back", screenView)
      // the item itself is drawn inside her rig, in front of her body and of the wing; in a swing the wing
      // turns with the blow and stretches to its reach, and the item rides on the wing tip
      const h = combat.inventory[combat.current], sw = combat.swing
      const charge = h && !sw ? combat.throwCharge : 0
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
      engine.setPeck(combat.peck)
      engine.setSwing(rigSwing(sw))
      engine.setHeld(heldItemPose(combat, now, h && bowed(d) ? { x: VIOLIN_BOW_X, stroke: bowing.stroke } : null, body.face))
      const muzzle = muzzleAt(ang)
      // Keep the delayed reticle on the cursor's radius around the grip, not a
      // distance measured from a muzzle that is still pointing the other way.
      const free = d.turnRate > 0 || !aim.target || shake > 0
      const stickDistance = S.reticleDist * (aim.source === "rightStick" || aim.source === "touch" ? 0.45 + 0.55 * aim.strength : 1)
      const reticle = aim.target
        ? free ? reticleAtAngle(aim.target, engine.heldPoint(ang, 0, 0), muzzle, ang) : aim.target
        : { x: muzzle.x + adx * stickDistance, y: muzzle.y + ady * stickDistance }
      const rx = reticle.x, ry = reticle.y
      const dist = aim.target ? Math.hypot(rx - muzzle.x, ry - muzzle.y) : stickDistance
      // weapons whose reticle shows where the shot lands: the path a shot fired now would take
      const showPath = armed && trajectoryVisible(d.pathShow, fire, aimLock)
      const showLand = armed && trajectoryVisible(d.landShow, fire, aimLock)
      let path: { x: number; y: number }[] | null = null
      if (armed && needsTrajectory(d.reticle, showPath, showLand, !!combat.reloading)) {
        const power = d.fireMode === "charge" ? d.chargeMin + (1 - d.chargeMin) * combat.fireCharge : 1
        path = combat.predict({ x: muzzle.x + camX, y: muzzle.y - camY }, ang, power, { boxes, groundY: G }).points.map(p => ({ x: p.x - camX, y: p.y + camY }))
      }
      inWorld()
      drawBeam(ctx, combat, camX, view)
      extraList.forEach(([id]) => { combat.use(id); drawBeam(ctx, combat, camX, view) })
      combat.use("p1")
      ctx.restore()
      extraList.forEach(([id, eng]) => { combat.use(id); drawSwing(ctx, combat, eng.getState().shoulder, "back", screenView) })
      combat.use("p1")
      // the projectile's path shows per item: hidden, with the fire button held, held or aim locked, always
      const tints = colorsRef.current
      // over a button or panel the mouse shows its normal cursor instead of the reticle and its volume ring
      if (!(mouseOverUi && aim.source === "mouse")) {
        drawVolumeRing(ctx, combat, rx, ry, tints?.p1 ?? "#ffffff")
        drawReticle(ctx, combat, muzzle, rx, ry, dist, combat.spread(body), aimLock, path, showPath, showLand, tints?.p1 ?? "#ffffff")
      }
      if (hitboxesRef.current) {
        drawHitboxes(ctx, combat, camX, camY, [["p1", engine] as const, ...extraList].map(([id, eng]) => {
          const ms = eng.getMotionState(), es = eng.getState()
          return { id, shoulder: es.shoulder, neck: eng.rigPoint("neck"), feet: { x: es.x, y: es.y }, scale: es.scale, box: { l: ms.x - 45 * ms.scale, r: ms.x + 45 * ms.scale, t: ms.y - 200 * ms.scale, b: ms.y } }
        }))
      }
      // the scale layer hides while a chicken is being dragged by the mouse/touch
      // each player's scale goes into standby a while after they stop playing it (the Escalas editor's numbers)
      if (scaleFanRef.current > 0) {
        const fan = (id: string, x: number, y: number, angle: number) => {
          const sc = combat.scale, held = combat.held
          let sb = scaleStandby.get(id)
          if (!sb) scaleStandby.set(id, sb = newStandby())
          const v = standbyStep(sb, scaleParams()[sc.id], dt, !!scalePlaying.get(id), `${held?.item ?? ""}:${sc.id}`, scaleKeepRef.current)
          const a = scaleFanRef.current
          drawScaleFan(ctx, combat, x, y, angle, st.scale, a * v.all, scaleSizeRef.current, scaleFadeRef.current, scaleLinesRef.current, a * v.aimed)
        }
        const o = engine.getState().shoulder
        if (!st.held) fan("p1", o.x, o.y, ang)
        extraList.forEach(([id, eng]) => {
          const at = extraAim.get(id)
          if (!at || eng.getMotionState().held) return
          combat.use(id)
          const xo = eng.getState().shoulder
          fan(id, xo.x, xo.y, at.angle)
        })
        combat.use("p1")
      }
      if (charge > 0) { const from = engine.heldPoint(combat.throwAngle, 0, 0); drawThrowPath(ctx, combat.predictThrow({ x: from.x + camX, y: from.y - camY }, { boxes, groundY: G }).map(p => ({ x: p.x - camX, y: p.y + camY }))) }
      // a staff that comes back being charged (the Martelo de Thor): the straight line it would fly, each local player's
      const returnPath = (eng: typeof engine) => {
        const from = eng.heldPoint(combat.aimAngle, 0, 0), pts = combat.predictReturn({ x: from.x + camX, y: from.y - camY }, { boxes, groundY: G })
        if (pts) drawThrowPath(ctx, pts.map(p => ({ x: p.x - camX, y: p.y + camY })))
      }
      returnPath(engine)
      extraList.forEach(([id, eng]) => { combat.use(id); returnPath(eng) })
      combat.use("p1")
      // the other local players' reticles, each in their own color, where their item points
      extraList.forEach(([id, eng]) => {
        const at = extraAim.get(id)
        if (!at) return
        combat.use(id)
        const xd = combat.def(), xs = eng.getMotionState()
        const xArmed = !!combat.inventory[combat.current]
        const xdist = S.reticleDist * at.reach
        const xrx = at.muzzle.x + Math.cos(at.angle) * xdist, xry = at.muzzle.y + Math.sin(at.angle) * xdist
        const xFire = !!extraPrev.get(id)?.fire
        const xShow = xArmed && trajectoryVisible(xd.pathShow, xFire, false)
        const xLand = xArmed && trajectoryVisible(xd.landShow, xFire, false)
        let xpath: { x: number; y: number }[] | null = null
        if (xArmed && needsTrajectory(xd.reticle, xShow, xLand, !!combat.reloading)) {
          const power = xd.fireMode === "charge" ? xd.chargeMin + (1 - xd.chargeMin) * combat.fireCharge : 1
          xpath = combat.predict({ x: at.muzzle.x + camX, y: at.muzzle.y - camY }, at.angle, power, { boxes, groundY: G }).points.map(p => ({ x: p.x - camX, y: p.y + camY }))
        }
        const xbody = { x: xs.x + camX, y: xs.y - camY, face: xs.face, scale: xs.scale, grounded: xs.grounded, state: xs.state, vx: xs.vx }
        drawVolumeRing(ctx, combat, xrx, xry, tints?.[id] ?? "#ffffff")
        drawReticle(ctx, combat, at.muzzle, xrx, xry, xdist, combat.spread(xbody), false, xpath, xShow, xLand, tints?.[id] ?? "#ffffff")
        if (combat.throwCharge > 0 && combat.held) {
          const from = eng.heldPoint(combat.throwAngle, 0, 0)
          drawThrowPath(ctx, combat.predictThrow({ x: from.x + camX, y: from.y - camY }, { boxes, groundY: G }).map(p => ({ x: p.x - camX, y: p.y + camY })))
        }
      })
      combat.use("p1")
      if (zoneBanner > 0 && !musicHere) drawZoneBanner(ctx, combat.music.zone, zoneBanner)
      ctx.restore()
      // one inventory per local player: a small row to the left of each player's avatar (top right); on desktop and
      // tablet the first player's is the big bar at the bottom right instead
      const barBottom = !liftedRef.current
      const offsets = getTouchLayout().offsets
      const drag = barDrag.current?.active ? barDrag.current : null
      arpBoxes.length = 0
      arpBoxes.push(...drawInventory(ctx, combat, 0, barBottom, null, now, offsets[barBottom ? "inventoryBar" : "inventory"], drag, barLabels(controls, devicesRef.current, !barBottom)))
      cageBoxes.length = 0
      const cam = { x: camX, y: camY, zoom }
      // the first player's Gaiolas hang in the top left corner, under the header, and swing with the camera
      combat.use("p1")
      stepCageHud(cageHud, swayCamX === null || dt <= 0 ? 0 : (camX - swayCamX) / dt, dt); swayCamX = camX
      const callback = !combat.bagOfSouls.length && combat.looseSouls > 0, front = combat.bagOfSouls.length > 0 || callback
      for (const b of drawHangingCages(ctx, cageHud, combat.cages, { top: viewTop, color: tints?.p1 ?? "#7bd88f", deny: combat.cageDeny, now, dt, callback, hover: cageHover?.id === "p1" ? cageHover.i : null })) cageBoxes.push({ id: "p1", ...b, on: b.i > 0 || front })
      // the other local players' are counters left of their avatars (the one in front lit), and their inventory row
      // starts left of those. With the on-screen controls (phones) the avatars and counters stay in the top right
      // corner, wherever the inventory row was moved to
      const soulsAt = showTouchRef.current ? undefined : offsets.inventory
      extraList.forEach(([id], i) => {
        combat.use(id)
        const counts = cageCounts(combat.cages), h = 24, color = tints?.[id] ?? "#7bd88f"
        const rowW = counts.reduce((n, c) => n + cageCounterWidth(c.item, h) + 3, 0)
        arpBoxes.push(...drawInventory(ctx, combat, i + 1, false, tints?.[id] ?? null, now, { x: (offsets.inventory?.x ?? 0) - Math.max(0, rowW - INV_SIZE), y: offsets.inventory?.y ?? 0 }))
        const on = (counts[0]?.n ?? 0) > 0 || combat.looseSouls > 0
        const right = stageWidth() - INV_STACK.right - INV_SIZE - INV_STACK.avatarGap + (soulsAt?.x ?? 0), top = invRowY(i + 1) + (soulsAt?.y ?? 0) + (INV_SIZE - h) / 2
        for (const b of drawCageCounters(ctx, counts, right, top, h, color, "right", 0)) cageBoxes.push({ id, ...b, cx: b.x + b.w / 2, cy: b.y + b.h / 2, on: b.i > 0 || on })
      })
      // the Gaiola under the pointer stopped being a button (its last soul left): the reticle comes back
      if (cageHover && !cageBoxes.some(b => b.id === cageHover!.id && b.i === cageHover!.i && b.on)) { hoverCage(null); mouseOverUi = false }
      // where the other players are: their avatar with their cages' counters, over them or, off the screen, at its
      // edge on their side. The local ones only off the screen (their counters are by their avatars)
      const tagBox = { l: 0, r: stageWidth(), t: viewTop, b: window.innerHeight }
      const scx = stageWidth() / 2, scy = window.innerHeight / 2
      extraList.forEach(([id, eng]) => {
        const s = eng.getMotionState(), sx = scx + (s.x - scx) * zoom, sy = scy + (s.y - 100 * s.scale - scy) * zoom
        if (sx >= tagBox.l && sx <= tagBox.r && sy >= tagBox.t && sy <= tagBox.b) return
        drawPlayerTag(ctx, sx, sy, tagBox, tints?.[id] ?? "#7bd88f", looksRef.current?.[id], cageCounts(combat.cagesOf(id)))
      })
      const lobby = getNetState()
      if (lobby.status === "online" && lobby.info) for (const p of lobby.info.players) {
        if (p.pid === lobby.myPid) continue
        for (let slot = 0; slot < p.chickens; slot++) {
          const c = remoteChicken(p.pid, slot, now)
          if (c) drawPlayerTag(ctx, scx + (c.x - camX - scx) * zoom, scy + (c.y + camY - 244 - scy) * zoom, tagBox, PLAYER_COLORS[p.color % PLAYER_COLORS.length], p.looks[slot], net.cagesOf(p.pid, slot))
        }
      }
      // the souls just caught, flying to the cage of whoever caught them that takes each one; and the scared birds
      if (combat.abductions.length) drawAbductions(ctx, combat, a => {
        const mine = combat.cagesOf(a.owner)
        if (a.owner === "p1") return cageHudSpot(cageHud, a.cage) ?? cageHudSpot(cageHud, mine[0]?.cage) ?? { x: 70, y: viewTop + 80 }
        const at = cageBoxes.find(b => b.id === a.owner && mine[b.i]?.cage === a.cage) ?? cageBoxes.find(b => b.id === a.owner)
        return at ? { x: at.cx, y: at.cy } : { x: stageWidth() - 60, y: viewTop + 40 }
      }, cam)
      if (combat.scares.length) drawScares(ctx, combat, cam)
      combat.use("p1")
      // over her: the front half of a horizontal blow, the stain of a dropping, and the item wheel
      const fronts: [string, { x: number; y: number }][] = []
      if (combat.swing?.kind === "flat") fronts.push(["p1", origin])
      extraList.forEach(([id, eng]) => { combat.use(id); if (combat.swing?.kind === "flat") fronts.push([id, eng.getState().shoulder]) })
      combat.use("p1")
      const stained = combat.poopStains.length > 0
      if (wh.open || fronts.length || stained) {
        if (wheelCanvas.width !== canvas.width || wheelCanvas.height !== canvas.height) {
          wheelCanvas.width = canvas.width; wheelCanvas.height = canvas.height
          const dpr = canvas.width / stageWidth()
          wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          wheelCanvas.style.display = ""
        }
        wctx.clearRect(0, 0, stageWidth(), window.innerHeight)
        wctx.save()
        if (zoom !== 1) { wctx.translate(stageWidth() / 2, window.innerHeight / 2); wctx.scale(zoom, zoom); wctx.translate(-stageWidth() / 2, -window.innerHeight / 2) }
        fronts.forEach(([id, at]) => { combat.use(id); drawSwing(wctx, combat, at, "front", screenView) })
        // what a dropping left on a chicken, on her
        if (stained) { wctx.save(); wctx.translate(jx, camY + jy); drawPoopStains(wctx, combat, camX, view); wctx.restore() }
        wctx.restore()
        combat.use("p1")
        if (wh.open) drawWheel(wctx, combat, wh.hover, Math.min(1, (now - wh.at) / 110))
        wheelDrawn = true
      } else if (wheelDrawn) {
        wheelCanvas.width = 1; wheelCanvas.height = 1
        wheelCanvas.style.display = "none"; wheelDrawn = false
      }
      // the Templo's HUD at the top, below the small inventories' rows when other local players show theirs there
      const hudTop = barBottom && !extraList.length ? INV_STACK.top : INV_TOP + INV_SIZE + 12
      drawTempleHud(ctx, temple, combat.music, inTemple && !stage.active, hudTop)
      drawNoteStageHud(ctx, stage, hudTop)
      if (hudRef.current) hudRef.current.style.display = S.debug ? "" : "none"
      if (hudRef.current && S.debug) {
        const h = combat.inventory[combat.current]
        const item = h ? `${d.name}${d.mag > 0 ? ` ${h.ammo}/${d.consumable ? CONSUMABLE_LIMITS[h.item] : d.mag}` : ""}${d.durability > 0 ? ` · ${h.durability} golpes` : ""}${combat.reloading ? " · recarregando" : ""}` : "mãos vazias (asa)"
        const k = combat.kills, cv = combat.converted
        const shown = h && d.mag > 0 ? Math.ceil(h.ammo) : 0
        const item2 = h ? item.replace(`${h.ammo}/`, `${shown}/`) : item
        const m = combat.music
        hudRef.current.textContent = `${item2} · ${m.zone.name} ${chordName(m.chord())} ${[0, 1, 2, 3].map(i => (Math.floor(m.beat) % 4 === i ? "●" : "·")).join("")}${combat.enemies || k.aliens || k.zombies || cv.birds || cv.people ? ` · inimigos: ${combat.enemies} · aliens ${k.aliens} · zumbis ${k.zombies} · passarinhos ${cv.birds} · curados ${cv.people} · mordidas ${k.bites}` : ""} · mira: ${SOURCE_LABEL[aim.source]}${aimLock ? " (travada)" : ""} · ${S.camera === "follow" ? "câmera seguindo" : S.camera === "scenes" ? `cena ${sceneAt(worldX) + 1}` : "câmera fixa"}`
      }
      cancelPecks = false
      raf = requestGameFrame(frame)
    }
    raf = requestGameFrame(frame)
    return () => {
      // what crosses to the next world, if this one closes for another Pátio
      carryRef.current = { carry: combat.exportCarry(), zoom }
      resetZoneLife()
      templeDraw.gongs.clear()
      headerObserver.disconnect()
      cancelGameFrame(raf)
      ghosts?.dispose()
      net.dispose()
      unsub()
      unsubItems()
      unsubSouls()
      unsubCatalog()
      unsubLibrary()
      unsubPlay()
      unsubStop()
      unsubDraft()
      window.removeEventListener("blur", cancelPeckInput)
      window.removeEventListener("pointercancel", cancelPeckInput)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onArpDown, true)
      window.removeEventListener("pointerdown", onCageDown, true)
      window.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("pointerdown", onTouchDown, true)
      window.removeEventListener("pointerup", onUp, true)
      window.removeEventListener("contextmenu", onMenu)
      window.removeEventListener("click", onCameraClick, true)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("resize", fit)
      unsubscribeQuality()
      engine.setGame({ gameMode: false, throwCharging: false, throwHeld: false, aimFace: null, lookAngle: null, ...effectGame(null, 1) })
      engine.setHeld(null)
      engine.setSwing(null)
      engine.setPeck(null)
      engine.setBounds(null)
      drone.set(null)
      templeDraw.temple = null
      templeDraw.stage = null
      if (worldRef.current) delete worldRef.current.dataset.temple
      document.body.classList.remove("pigchicken-play", "pigchicken-bag-hover")
      document.body.classList.remove('pigchicken-camera-mode', 'pigchicken-camera-dragging')
      setCameraMode(false)
      if (camX || oy !== null) engine.shift(camX, oy === null ? 0 : cameraYRange(window.innerHeight - groundHRef.current).lo - oy)
      engine.setGroundHeight(groundHRef.current)
      engine.setCameraZoom(1)
      extras?.current?.forEach(o => o.setCameraZoom(1))
      if (worldRef.current) { worldRef.current.style.transform = ""; setPlatformWorldOffset(worldRef.current, 0, 0) }
      moveLiveCamera(0, 0, 1)
    }
  }, [engine, worldRef, fgRef, patioKey])

  return (
    <>
      <style>{`body.pigchicken-play { cursor: none; } body.pigchicken-play.pigchicken-camera-mode { cursor: grab; } body.pigchicken-play.pigchicken-camera-dragging { cursor: grabbing; } body.pigchicken-play.pigchicken-bag-hover { cursor: pointer; } body.pigchicken-play :is(header, aside, [role="dialog"], button, input, select, textarea, a, label, summary, [data-chicken-ignore]) { cursor: auto; } body.pigchicken-play :is(button, a, select, summary, label) { cursor: pointer; }`}</style>
      {cameraMode && <div role="img" aria-label="Modo zoom e panorama" className="pointer-events-none fixed left-4 top-16 z-[209] text-white opacity-40"><Search className="h-8 w-8" aria-hidden="true" /></div>}
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[195] h-full w-full" />
      {/* the Quadros de lousa's ghosts, behind the players and the chicks */}
      <div ref={ghostHostRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[198] [&_*]:!pointer-events-none" />
      <canvas ref={wheelCanvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[205] h-full w-full" />
      <div ref={hudRef} className="pointer-events-none absolute left-3 z-[120] font-mono text-[11px] text-[#93a79a]" style={{ bottom: groundHeight + 10 }} />
      {/* the inventory bar is drawn on the canvas; this invisible layer sits on top of it: a click or a tap equips the
          slot under it, pressing and dragging moves the item to another place (it joins the group it is dropped in).
          In edit mode the Movable's drag handle covers it, so moving the bar never equips. */}
      {engine && (() => {
        const labels = barLabels(controls, devices, lifted)
        const g = invGeom(0, invGroups, !lifted, undefined, undefined, undefined, !!labels?.some(Boolean), invCur)
        // the pointer's place along the bar (px from its left end), from any slot's button
        const slotAt = (e: ReactPointerEvent<HTMLButtonElement>) => barSlotAt(g.xs, g.size, e.clientX - (e.currentTarget.parentElement?.getBoundingClientRect().left ?? 0))
        const end = (e: ReactPointerEvent<HTMLButtonElement>, drop: boolean) => {
          const d = barDrag.current
          if (!d || d.pointer !== e.pointerId) return
          barDrag.current = null
          if (!drop) return
          if (!d.active) { slotTap.current = d.from + 1; return }
          if (d.to !== d.from) barMove.current = { from: d.from, to: d.to, after: d.after }
        }
        return (
          <Movable
            id={lifted ? "inventory" : "inventoryBar"}
            className="pointer-events-none fixed z-[190]"
            style={lifted ? { right: invRight, top: invRowY(0), width: g.w, height: g.size } : { left: g.x, bottom: BAR.bottom + BAR.tab, width: g.w, height: g.size }}
          >
            {!editing && !invEmpty && (
              <div data-chicken-ignore role="toolbar" aria-label="Inventário: clique para equipar, arraste para mudar a ordem" className="relative h-full w-full">
                {g.xs.map((x, i) => (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    aria-label={`Item ${i + 1} do inventário`}
                    className="pointer-events-auto absolute top-0 h-full rounded-md bg-transparent"
                    style={{ left: x, width: g.size, touchAction: "none" }}
                    // pointerdown keeps focus off the button so Space stays a game key; the click equips on release
                    onPointerDown={e => {
                      e.preventDefault(); e.stopPropagation()
                      e.currentTarget.setPointerCapture?.(e.pointerId)
                      barDrag.current = { from: i, to: i, after: false, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, pointer: e.pointerId, active: false }
                    }}
                    onPointerMove={e => {
                      const d = barDrag.current
                      if (!d || d.pointer !== e.pointerId) return
                      d.x = e.clientX; d.y = e.clientY
                      if (!d.active && barItems.current[d.from] && Math.hypot(d.x - d.x0, d.y - d.y0) > BAR_DRAG_START) d.active = true
                      if (d.active) { const at = slotAt(e); d.to = at.slot; d.after = at.after }
                    }}
                    onPointerUp={e => end(e, true)}
                    onPointerCancel={e => end(e, false)}
                    onLostPointerCapture={e => end(e, true)}
                    onContextMenu={e => e.preventDefault()}
                  />
                ))}
              </div>
            )}
          </Movable>
        )
      })()}
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
      {showTouch && engine && <TouchAimStick engine={engine} aimRef={touchAim} throwAimRef={throwAim} tapRef={tapShot} bottom={lifted ? 16 + STICK + 12 : STICK_BOTTOM} grabOffer={grabOffer} />}
    </>
  )
}

// ---------- on-screen right stick (twin-stick): pushing aims, pushing to the edge fires ----------
const STICK = 112, KNOB = 48, STICK_BOTTOM = 64 + 112 + 24, FIRE_AT = 0.85

function TouchAimStick({ engine, aimRef, throwAimRef, tapRef, bottom, grabOffer }: { engine: ChickenEngine; aimRef: React.MutableRefObject<Stick | null>; throwAimRef: React.MutableRefObject<Stick | null>; tapRef: React.MutableRefObject<number>; bottom: number; grabOffer: "" | "take" | "equip" }) {
  const { editing } = useTouchLayout()
  useEffect(() => {
    if (editing) ["melee", "throw", "itemWheel", "grab", "fire"].forEach(a => engine.setVirtual(a as ChickenAction, false))
    return () => { ["melee", "throw", "itemWheel", "grab", "fire"].forEach(a => engine.setVirtual(a as ChickenAction, false)) }
  }, [editing, engine])
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
  useEffect(() => { if (editing) release() }, [editing])
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
      onLostPointerCapture={() => engine.setVirtual(action, false)}
      onContextMenu={e => e.preventDefault()}
    >
      {label}
    </button>
  )
  return (
    <div data-chicken-ignore className="pointer-events-none fixed inset-0 z-[190] select-none" style={{ touchAction: "none" }}>
      <div className="absolute flex items-center gap-3" style={{ right: 20, bottom, height: STICK }}>
        {/* standing on an item: grab it (blue) or equip the one she already carries (grey) */}
        {(grabOffer || editing) && <Movable id="grab" className="absolute" style={{ right: 184, top: (STICK - 48) / 2 }}>{button((grabOffer || "take") === "take" ? "Pegar" : "Equipar", "grab", (grabOffer || "take") === "take" ? "border-[#4cc9f0] bg-[#4cc9f0]/20 text-white" : "border-[#9aa0a8] bg-[#9aa0a8]/20 text-white")}</Movable>}
        <div className="relative flex flex-col gap-2">
          <Movable id="melee" className="relative">{button("Punch", "melee")}</Movable>
          <Movable id="throw" className="relative"><TouchThrowButton engine={engine} aimRef={throwAimRef} /></Movable>
          <Movable id="itemWheel" className="relative">{button("Roda", "itemWheel")}</Movable>
        </div>
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

// ---------- on-screen Throw: it acts when the finger lifts ----------
// Lifted inside the button: a tap, thrown at once (no charge) where her movement stick points, or where she faces.
// Dragged out of the button: the charge starts, the aim follows the drag's angle (from the button's middle) and the
// throw leaves when the finger lifts, wherever it is.
const afterFrames = (n: number, fn: () => void) => { if (n <= 0) fn(); else requestGameFrame(() => afterFrames(n - 1, fn)) }

function TouchThrowButton({ engine, aimRef }: { engine: ChickenEngine; aimRef: React.MutableRefObject<Stick | null> }) {
  const { editing } = useTouchLayout()
  const press = useRef<{ pid: number; cx: number; cy: number; r: number; out: boolean } | null>(null)
  const turn = useRef(0)
  const [down, setDown] = useState(false)
  // the aim is let go a few frames after the throw, so the frame that throws still reads it
  const clearAim = (frames: number) => { const t = ++turn.current; afterFrames(frames, () => { if (turn.current === t) aimRef.current = null }) }
  const cancel = () => {
    if (press.current?.out) engine.setVirtual("throw", false)
    press.current = null; setDown(false); turn.current++; aimRef.current = null
  }
  useEffect(() => { if (editing) cancel() }, [editing])
  useEffect(() => () => { aimRef.current = null }, [aimRef])
  const move = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p || p.pid !== e.pointerId) return
    const dx = e.clientX - p.cx, dy = e.clientY - p.cy, len = Math.hypot(dx, dy)
    if (!p.out && len > p.r) { p.out = true; turn.current++; engine.setVirtual("throw", true) }
    // back over the button, the last angle stays
    if (p.out && len > p.r * 0.5) aimRef.current = { x: dx / len, y: dy / len, mag: 1 }
  }
  const lift = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p || p.pid !== e.pointerId) return
    press.current = null; setDown(false)
    if (p.out) { engine.setVirtual("throw", false); clearAim(2); return }
    if (e.type !== "pointerup") return
    const deadzone = loadChickenControls().analog.deadzoneL
    const stick = readTouchMoveStick(deadzone)
    aimRef.current = stick ? { x: stick.x, y: stick.y, mag: 1 } : { x: engine.getMotionState().face || 1, y: 0, mag: 1 }
    const t = ++turn.current
    // held for two frames: the combat needs one with the button down before the one that lets go
    engine.setVirtual("throw", true)
    afterFrames(2, () => { if (turn.current !== t) return; engine.setVirtual("throw", false); clearAim(2) })
  }
  return (
    <button
      type="button"
      aria-label="Throw"
      aria-pressed={down}
      className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-[9px] uppercase text-white/80 ${down ? "border-white/70 bg-white/35" : "border-white/30 bg-white/10"}`}
      style={{ touchAction: "none" }}
      onPointerDown={e => {
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
        const r = e.currentTarget.getBoundingClientRect()
        press.current = { pid: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2, out: false }
        setDown(true)
      }}
      onPointerMove={move}
      onPointerUp={lift}
      onPointerCancel={lift}
      onLostPointerCapture={lift}
      onContextMenu={e => e.preventDefault()}
    >
      Throw
    </button>
  )
}

// the violin's bow crosses the strings between the bridge and the fingerboard: rig units along the violin from
// her shoulder (the drawing's grip), and the mouse travel (px) for one full stroke of the bow
const VIOLIN_BOW_X = -23
const BOW_STROKE_PX = 260

// flat item art, pointing right with the grip at (0, 0)
// an item's art fitted into maxW x maxH around the current origin (centred), or with its grip at the origin
// a consumable's effect on her movement and look (none: her own)
function effectGame(e: Effect | null, weight: number, doses: readonly Effect[] = []): ChickenGame {
  return { speedMult: weight * (e?.speed ?? 1), accelMult: e?.accel ?? 1, accelPower: e ? curvePower(e.curve) : 1, accelRamp: e?.ramp ?? 0.5, ...lookDoses(doses) }
}

// ---------- the zone's ambience on a sixteenth: its percussion and its bass line (the sustained voices follow the
// bars). With swing the off-beat eighths land late ----------
function ambience(zone: Zone, step: number, bar: number, chord: number[], spb: number) {
  const a = zone.ambience ?? legacyAmbience(zone.feel)
  const late = zone.feel === "swing" && step % 4 === 2 ? (spb / 4) * 0.33 : 0
  for (const hit of beatHits(a, step)) playDrum(hit.drum, late, hit.vel)
  const notes = bassNotes(a, chord, droneOf(zone, chord).root - 24, step, bar)
  for (const n of notes) playBass(n.tone, n.midi, late, n.len * (spb / 4), n.vel)
}

export { BAR, BAR_GROUND_H, INV_STACK } from "@/components/pigchicken/draw/hud"
