"use client"

// Parquinho: PigChicKen's creative mode, built on the Pátio. A world several screens wide with a camera
// (follow, scenes, fixed), and the aim of the items: right stick > mouse > on-screen right stick > left stick /
// arrows > facing, drawn as a reticle. Firing, hitting and throwing only flash for now; the items come next.
// The world is in fixed units (lib/pigchicken/world.ts): the same size on every screen, which only changes the crop.
import { requestGameFrame, cancelGameFrame } from "@/lib/game-frame"
import { feedBaby, getBaby } from "@/lib/chicken/baby"
import { getChickenConfig } from "@/lib/chicken/config"
import { bodyBox, poseOf } from "@/lib/chicken/body-frame"
import { Search } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { createCollisionOcclusion } from "@/lib/chicken/collision-occlusion"
import type { ChickenEngine, ChickenGame } from "@/lib/chicken/engine"
import { stickAimDepth } from "@/lib/chicken/analog-walk"
import { isChickenControlsListening, readTouchMoveStick, loadChickenControls, subscribeChickenControls, type ChickenAction, type ChickenControls } from "@/lib/chicken/controls"
import { isPadDevice, padButtonValues, padTokensFor, stickFor, type InputDeviceId } from "@/lib/chicken/input-devices"
import { fireDepth, grabIsSeatBind, harpHeld, movesOf, seatBindsOf, seatTokens } from "@/lib/pigchicken/instrument-binds"
import { createMouseOwner, keysAimAfterMouse, keysAimFor, magnetAngle, reticleAtAngle, resolveAim, type Aim, type AimSource, type Stick } from "@/lib/pigchicken/aim"
import { cameraBounds, cameraStep, cameraXRange, leadStep, wholeWorldZoom, zoomLimits } from "@/lib/pigchicken/camera"
import { drawLens } from "./draw/lens"
import { lensAt, leanWithin, scopeLean, scopeOn, scopeReachAt, scopeStep, scopeZoom, type ScopeParams } from "@/lib/pigchicken/scope"
import { PATIO_ZOOM, type PatioZoom } from "@/lib/pigchicken/patio-settings"
import { type ItemGlow } from "@/lib/pigchicken/item-glow"
import { CONSUMABLE_LIMITS } from "@/lib/pigchicken/items"
import { heldItemPose } from "@/lib/pigchicken/held-pose"
import { createCombat, lookDoses, type Box, type Catchable, type Effect, type ShotRoom, type SoulPortal, type StringAim, type WorldCarry } from "@/lib/pigchicken/combat"
import { createNetWorldSync } from "@/lib/pigchicken/net-world-sync"
import { getNetState, remoteChicken } from "@/lib/chicken/online-room"
import { chickNumber, chickStyleOf } from "@/lib/chicken/net-chicks"
import { releaseChick } from "@/lib/chicken/chick-release"
import { CAGE_HOLD } from "@/lib/pigchicken/cages"
import { cageCounterWidth, cageCounts, cageHudSpot, drawCageCounters, drawHangingCages, drawPlayerTag, newCageHud, stepCageHud } from "@/components/pigchicken/draw/cages"
import type { NetChickMirror } from "@/components/chicken/online-chickens"
import { PLAYER_COLORS } from "@/lib/chicken/lobby"
import type { NetSpawn } from "@/lib/pigchicken/net-world"
import { GROUP_SWITCHES, INVENTORY_MAX, groupSwitchStep, inventorySlotFromCode, newGroupSwitchRepeat, newQuickSwitchRepeat, quickSwitchStep, wheelSliceAt, wrapSlot, type GroupSwitchRepeat, type ItemGroup, type QuickSwitchRepeat } from "@/lib/pigchicken/inventory"
import { announceHeldItem, announcePlayerClass, bowed, classItem, pointClassOf, curvePower, loadItems, nextArp, saveItems, subscribeItems, type ItemId } from "@/lib/pigchicken/items"
import { CATALOG_SPECIES, loadCatalog, subscribeCatalog, variantData, variantFor, variantSize } from "@/lib/pigchicken/alien-catalog"
import type { TrainingSpawnRequest } from "@/lib/pigchicken/training-spawn"
import { playWeaponSound, setWeaponVolume } from "@/lib/pigchicken/sfx"
import { ALIEN_PATTERNS, alienPattern } from "@/lib/pigchicken/alien-patterns"
import type { ParquinhoSettings } from "@/lib/pigchicken/settings"
import { audioTime, createDrone, playBass, playDrum, playNote, setMusicVolumes, stopZoneAmbience } from "@/lib/pigchicken/synth"
import { SILENCE, ambienceDrone, ambienceKit, ambienceSilent, bassNotes, grooveOf, legacyAmbience } from "@/lib/pigchicken/zone-ambience"
import { ZONE_MIX, createAmbienceEntry, createZoneSwitchWatch, zoneBassLevel, zoneHits } from "@/lib/pigchicken/zone-dynamics"
import { playKitHit, preloadKit } from "@/lib/pigchicken/kit-player"
import { mixGain } from "@/lib/pigchicken/mixer"
import { playBirdSong } from "@/lib/pigchicken/bird-song"
import { songVolume } from "@/lib/pigchicken/soul-acts"
import { ZONES, chordName, droneOf, zoneLabel, type Zone } from "@/lib/pigchicken/music"
import { Movable, useTouchControls, useTouchLayout } from "@/components/chicken/chicken-layer"
import { getTouchLayout } from "@/lib/chicken/touch-layout"
import { zoneSlam } from "@/lib/pigchicken/zone-slam"
import { SCENE_W, WORLD_GROUND_Y, WORLD_TOP, cameraYRange, cameraYStep, sceneAt, templeScene, villageScene, worldScenes } from "@/lib/pigchicken/world"
import { LIMIT_BORDER, LIMIT_BORDER_COLOR } from "@/lib/chicken/limits"
import { defaultLayout, elementsInWorld, layoutBoxes, layoutCollisionMasks, layoutMusic, type LayoutElement } from "@/lib/pigchicken/layout"
import { groundZones, placeEnvAt, soundZoneOf, zoneAt, zoneBlockSolo, type LanesBox, type SceneEdges, type SceneZones, type ZoneBox } from "@/lib/pigchicken/sound-zones"
import { setLiveZones, zoneEffectsAt } from "@/lib/pigchicken/zone-physics"
import { hitZone, liveZones, resetZoneLife, zoneWallHit } from "@/lib/pigchicken/zone-life"
import { bindMinePlay } from "./mine-grid-play"
import { mineStore } from "@/lib/pigchicken/mine-grid-store"
import { setMineActivators } from "@/lib/pigchicken/mine-activator-store"
import { defaultMineActivator } from "@/lib/pigchicken/mine-activator"
import { drawMineActivators } from "./draw/mine-activator"
import { mineZoneBoxes } from "@/lib/pigchicken/mine-zones"
import { drawScaleFan, SCALE_FAN_R, seatedFanSize } from "@/components/pigchicken/draw/scale-fan"
import { starSeatFrame } from "@/components/pigchicken/draw/star-grid"
import { drawAmmoAround, drawAmmoDrops, drawAmmoHud } from "@/components/pigchicken/draw/ammo-hud"
import { drawNoteBits, drawNoteHud } from "@/components/pigchicken/draw/note-hud"
import { NOTE_HUD_R, newNoteView, noteLook, stepNoteView, type NoteView } from "@/lib/pigchicken/note-hud"
import { AMMO_AROUND_SCALE, AMMO_HUD_R, ammoLook, aroundVisibility, newAmmoView, stepAmmoView, type AmmoView } from "@/lib/pigchicken/ammo-hud"
import { announceHeldScale, newStandby, scaleParams, standbyStep, type StandbyState } from "@/lib/pigchicken/scale-params"
import { dropScaleStage, setScaleStage } from "@/lib/pigchicken/scale-preview"
import { drawHitboxes } from "@/components/pigchicken/draw/hitboxes"
import { createLayoutSync, deviceLabel, isSequencerLabel } from "@/lib/pigchicken/layout-sync"
import { SceneryVisibilityStyles } from "./scenery-region"
import { graphicsQuality, subscribeQuality } from "@/lib/quality"
import { setPlatformWorldOcclusion, setPlatformWorldOffset } from "@/lib/chicken/platform-geometry"
import { needsTrajectory, patioPixelRatio, trajectoryVisible, zoomedView, type ViewRect } from "@/lib/pigchicken/viewport"
import { holdLayer, moveLiveCamera, setCameraRestY, worldTransform } from "@/lib/pigchicken/live-camera"
import { FollowLayer, LayoutColliders, LayoutLayerView, PatioTreeStyles } from "@/components/pigchicken/patio-layout"
import { houseRooms, roomShotWalls, type RoomRect } from "@/lib/pigchicken/house-rooms"
import { houseRoomsStore } from "@/lib/pigchicken/house-rooms-store"
import { HouseDusk, useHouseDuskFilter } from "@/components/pigchicken/house-dusk"
import { GONG_X, createTemple, type TempleIO } from "@/lib/pigchicken/temple"
import { TEMPLE_IDLE, playNoteStageSound, playTempleSound, templeAmbience, type TempleSound } from "@/lib/pigchicken/temple-music"
import { GOAL_DEFAULT, type NoteStage, type NoteStageIO, type NoteStageSound, type StageBy, type StageRequest } from "@/lib/pigchicken/note-stage"
import { createNoteStages } from "@/lib/pigchicken/note-stages"
import { rollLoot } from "@/lib/pigchicken/chests"
import { drawNoteShots, drawNoteStageHud, drawStageDebug, drawStageFan, drawStageTalk } from "@/components/pigchicken/note-stage-draw"
import { CAMPAIGN_ID, loadLibrary, nowPlaying, onPlayDraft, onPlaySong, onStopSong, openJukebox, pickOf, recordScore, subscribeLibrary, type DraftRequest } from "@/lib/pigchicken/song-library"
import { defaultPlayer, newGongRun, stepGong, strikeGong, type GongParams, type GongRun, type PlayerParams } from "@/lib/pigchicken/gong"
import { drawTempleHud, drawTempleShots } from "@/components/pigchicken/temple-draw"
import { BuildingStyles } from "@/components/pigchicken/building-art"
import { ParallaxBackdrop } from "@/components/pigchicken/parallax"
import { useBareScenery } from "@/hooks/use-reduced-graphics"
import type { MountainParams } from "@/lib/pigchicken/mountains"
import type { ForestParams } from "@/lib/pigchicken/forest"
import type { SkylineParams } from "@/lib/pigchicken/skyline"
import { patioClouds, type CloudParams } from "@/lib/pigchicken/clouds"
import type { SnowfallParams } from "@/lib/pigchicken/snowfall"
import type { AuroraParams } from "@/lib/pigchicken/aurora"
import { skyLook, type SkyLook, type SkyParams } from "@/lib/pigchicken/sky"
import { createPerchWorld, setPerchSpans } from "@/lib/pigchicken/bird-perch"
import { perchLines } from "@/lib/pigchicken/perch-places"
import { powerSpans } from "@/lib/pigchicken/power-lines"
import { VillageBackdrop } from "@/components/pigchicken/village-backdrop"
import { syncRiders, buttonLabels, lookTargets } from "@/components/pigchicken/draw/creatures"
import { drawBeam, drawZoneBanner, rigSwing, drawSwing, drawDrawing, swingShake } from "@/components/pigchicken/draw/effects"
import { drawnPath, type SwingPath } from "@/lib/pigchicken/swing"
import { aimReach } from "@/lib/pigchicken/aim-volume"
import { drawVolumeRing } from "@/components/pigchicken/draw/volume-ring"
import { drawHookDot, drawHookSpin } from "@/components/pigchicken/draw/hook"
import { drawReticle, drawThrowPath, INV_SIZE, INV_TOP, INV_STACK, invRowY, BAR, invGeom, barSlotAt, showKeyHints, drawInventory, wheelGeom, drawWheel, type BarDrag } from "@/components/pigchicken/draw/hud"
import { drawAbductions, drawFreedSouls, drawPoops, drawPoopStains, drawScares } from "@/components/pigchicken/draw/souls"
import { SOUL_RARITIES, collectSoul, loadSoulEntries, setSoulEntries, subscribeSoulEntries } from "@/lib/pigchicken/soul-library"
import { templeDraw, pickupMarks, markHover, grabLabel, groupBindLabels, drawWorld } from "@/components/pigchicken/draw/world"
import { chestMarks } from "@/components/pigchicken/draw/chests"
import { seatMarks } from "@/components/pigchicken/draw/harp"
import { FIXED_INSTRUMENTS, HARP_BOX, seatKeepsJump, seatSpot } from "@/lib/pigchicken/fixed-instruments"
import { drumKit } from "@/lib/pigchicken/drum-kit"
import { playKit, playKnock } from "@/lib/pigchicken/drum-synth"
import { drumFrame, setDrumScreen } from "@/components/pigchicken/draw/drum-chart"
import { drumBindLevels, drumKeyTokens } from "@/lib/pigchicken/drum-input"
import { stageHeight, stageTop, stageWidth, stageY } from "@/lib/stage-size"
import { createTrainingGhosts } from "@/components/pigchicken/training-ghosts"

// Controles → "Incluir variações / escalas / tambores / tipos": whether a switch also goes through the held item's
// variations. pick: the quick switch (Item anterior held, else Próximo item); group: the group switch pressed
const pickVariations = (c: ChickenControls, act: Partial<Record<ChickenAction, boolean>>) => act.prevItem ? c.variations.prevItem : c.variations.nextItem
const groupVariations = (c: ChickenControls, group: ItemGroup | null) => {
  const a = GROUP_SWITCHES.find(([, g]) => g === group)?.[0]
  return a ? c.variations[a] : false
}
const variationPress = (act: Partial<Record<ChickenAction, boolean>>, prev: Partial<Record<ChickenAction, boolean>>) => !!act.nextVariation && !prev.nextVariation
// how far (px) a press on the inventory bar moves before it becomes a drag instead of a click
const BAR_DRAG_START = 6
// the state the combat reads: a bird brooding on a grab (a wall, a ceiling) broods, for the spread of its shots
const bodyState = (st: { state: string; networkAnimation?: string }) => st.state === "cling" && st.networkAnimation === "brood" ? "brood" : st.state
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
// mountains: the far ranges' shape (Configurações do Pátio → Montanhas); forest: the tree lines' (→ Mata); clouds: theirs (→ Nuvens); skyline: the buildings (→ Prédios)
// temple: false leaves out the Vila dos Telhados' fixed backdrop (the Templo do Gongo is made of layout elements)
export function ParquinhoWorld({ screens, worldRef, debug = false, elements = DEFAULT_ELEMENTS, editing = false, worldTop = WORLD_TOP, groundHeight = 30, backdrop = 1, sky, mountains, forest, skyline, clouds, snowfall, aurora, temple = true, zoomMin = PATIO_ZOOM.min }: { screens: number; worldRef: React.RefObject<HTMLDivElement | null>; debug?: boolean; elements?: LayoutElement[]; editing?: boolean; worldTop?: number; groundHeight?: number; backdrop?: number; sky?: SkyParams; mountains?: MountainParams; forest?: ForestParams; skyline?: SkylineParams; clouds?: CloudParams; snowfall?: SnowfallParams; aurora?: AuroraParams; temple?: boolean; zoomMin?: number }) {
  // The Parquinho, the Templo do Gongo and the Vila dos Telhados share one world.
  const width = worldScenes(screens) * SCENE_W
  const villageLeft = villageScene(screens) * SCENE_W
  const shown = useMemo(() => elementsInWorld({ v: 1, elements }, screens), [elements, screens])
  const occlusion = useMemo(() => createCollisionOcclusion(layoutCollisionMasks(shown)), [shown])
  const look = useSkyLook(sky)
  // Baixíssima: the far scenery keeps only its sky (always whole in the Modo editor)
  const bare = useBareScenery() && !editing
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
      {backdrop > 0 && (backdrop >= 1 ? <ParallaxBackdrop worldW={width} worldTop={worldTop} look={look} mountains={mountains} forest={forest} skyline={skyline} clouds={cloudSet} snowfall={snowfall} aurora={aurora} zoomMin={zoomMin} bare={bare} /> : <div className="absolute inset-0" style={{ opacity: backdrop }}><ParallaxBackdrop worldW={width} worldTop={worldTop} look={look} mountains={mountains} forest={forest} skyline={skyline} clouds={cloudSet} snowfall={snowfall} aurora={aurora} zoomMin={zoomMin} bare={bare} /></div>)}
      {/* the ground: reaches far past the world's sides and down past any screen's bottom */}
      <div aria-hidden="true" className="absolute" style={{ left: -4000, width: width + 8000, top: WORLD_GROUND_Y, height: 4000, background: GROUND_FILL, boxShadow: "0 -1px 0 rgba(0,0,0,.35)", ...lit }} />
      {debug && Array.from({ length: screens }, (_, s) => (
        <div key={`m${s}`} className="absolute inset-y-0 border-l border-dashed border-white/10" style={{ left: s * SCENE_W }}>
          <span className="absolute left-2 top-28 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-white/25">Cena {s + 1} <span style={{ color: ZONES[s % ZONES.length].color, opacity: 0.6 }}>· {zoneLabel(ZONES[s % ZONES.length])}</span></span>
        </div>
      ))}
      {temple && <div className="absolute inset-0" style={lit}>
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
      {/* the numbers of the Grade de blocos (components/pigchicken/mine-grid-layer.tsx), behind the Pátio's elements */}
      <div data-mine-numbers aria-hidden="true" className="absolute inset-0" />
      {/* the Pátio's layout (lib/pigchicken/layout.ts): the scenery behind the platforms, then the platforms' layer */}
      <PatioTreeStyles />
      <BuildingStyles />
      <SceneryVisibilityStyles />
      <div className="absolute inset-0" style={lit}><LayoutLayerView elements={shown} layer="back" editing={editing} power={false} /></div>
      <LayoutLayerView elements={shown} layer="back" editing={editing} power />
      <div data-chicken-platforms className="absolute inset-0">
      </div>
      <div className="absolute inset-0" style={lit}><LayoutLayerView elements={shown} layer="scene" editing={editing} power={false} /></div>
      <LayoutLayerView elements={shown} layer="scene" editing={editing} power />
      <LayoutColliders elements={shown} />
      {/* someone of this screen is inside a house: the rest of the scenery goes dark */}
      <HouseDusk elements={shown} lit={lit} />
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
const LIMIT_OUTSIDE = 30000
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
  const filter = useHouseDuskFilter(useSkyLook(sky).scenery)
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
export function ParquinhoPlay({ engine, settings, worldRef, groundHeight = 30, lifted = false, spawnX, fgRef, devices = null, extras, chicks, netChicks, colors, looks, elements = DEFAULT_ELEMENTS, worldTop = WORLD_TOP, trainingSpawns, inventoryLimit = INVENTORY_MAX, sceneZones, sceneEdges, sceneMusic = true, scaleFan = 0, scaleFanSize = 0.3, scaleFanFade = 0.5, scaleFanLines = 1, scaleKeep = false, hitboxes = false, stageDebug = false, patioKey = null, zoomRange, itemGlow }: { engine: ChickenEngine | null; settings: ParquinhoSettings; worldRef: React.RefObject<HTMLDivElement | null>; groundHeight?: number; lifted?: boolean; spawnX?: number; fgRef?: React.RefObject<HTMLDivElement | null>; devices?: InputDeviceId[] | null; extras?: React.RefObject<Map<string, ChickenEngine>>; chicks?: React.RefObject<Map<string, ChickenEngine>>; netChicks?: React.RefObject<Map<string, NetChickMirror>>; colors?: Record<string, string>; looks?: Record<string, Record<string, string> | null>; elements?: LayoutElement[]; worldTop?: number; trainingSpawns?: React.RefObject<TrainingSpawnRequest[]>; inventoryLimit?: number; sceneZones?: SceneZones; sceneEdges?: SceneEdges; sceneMusic?: boolean; scaleFan?: number; scaleFanSize?: number; scaleFanFade?: number; scaleFanLines?: number; scaleKeep?: boolean; hitboxes?: boolean; stageDebug?: boolean; patioKey?: string | null; zoomRange?: PatioZoom; itemGlow?: ItemGlow }) {
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
  // Camadas → Debug da fase de notas
  const stageDebugRef = useRef(stageDebug)
  stageDebugRef.current = stageDebug
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
  // the Pátio's zoom range (Configurações do Pátio → Zoom)
  const zoomRangeRef = useRef(zoomRange)
  zoomRangeRef.current = zoomRange
  // Configurações do Pátio → Brilho dos itens
  const itemGlowRef = useRef(itemGlow)
  itemGlowRef.current = itemGlow
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
  // the touch Punch dragged out of its circle: how far the finger has turned around the button since it left it
  // (radians, unwrapped; null: not yet) until it lifts (up), the Golpe desenhado's drawing (lib/pigchicken/swing.ts)
  const punchDraw = useRef<{ turn: number | null; up: boolean } | null>(null)
  // time of the last quick tap on the right stick: shoots the nearest enemy
  const tapShot = useRef(0)
  // the on-screen Roda dragged out of its middle: the drag's direction points at the wheel's slice (a jog)
  const wheelJog = useRef<Stick | null>(null)
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
  const [grabOffer, setGrabOffer] = useState<GrabOffer>("")
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
    const mouseBtn = { fire: false }
    // the main player sits at a fixed instrument (as the last frame left it)
    let p1Seated = false
    // whether P1 was a Filhote last frame (becoming one drops everything)
    let p1Baby = false
    // sitting at the Harpa, each finger on the screen is a hand on the strings (two fingers, two hands; slot 0: the
    // front hand). fresh: it landed since the last frame (its pluck); up: it lifted (it leaves after that frame)
    const fingers: { id: number; x: number; y: number; slot: number; fresh: boolean; up: boolean }[] = []
    // her hands were last moved by a gamepad's sticks: a stick at rest is then a hand off the strings
    let padHands = false
    // the Bateria (lib/pigchicken/drum-kit.ts): the main player sits at one; the mouse clicks that landed since the
    // last frame (each one a hit on the piece under it); the keyboard keys held now (the pieces' shortcuts)
    let p1Kit = false
    // the main player sits at the Piano de cauda (its Estrela fits the screen; the camera keeps the piano in sight)
    let p1Star = false
    const clicks: { x: number; y: number }[] = []
    const drumKeys = new Set<string>()
    const onFingerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !p1Seated || cameraKey || fingers.filter(f => !f.up).length >= (p1Kit ? 6 : 2)) return
      if (isUi(e.target) || (e.target as Element | null)?.closest?.("[data-patio-editor]")) return
      e.preventDefault()
      fingers.push({ id: e.pointerId, x: e.clientX, y: stageY(e.clientY), slot: fingers.some(f => !f.up && f.slot === 0) ? 1 : 0, fresh: true, up: false })
    }
    const onFingerMove = (e: PointerEvent) => { const f = fingers.find(f => f.id === e.pointerId && !f.up); if (f) { f.x = e.clientX; f.y = stageY(e.clientY) } }
    const onFingerUp = (e: PointerEvent) => { const f = fingers.find(f => f.id === e.pointerId && !f.up); if (f) f.up = true }
    // the arpeggiator glyphs drawn over the instruments' slots this frame (screen units, like the inventory) and the
    // instrument each one belongs to
    const arpBoxes: { item: ItemId; box: { l: number; r: number; t: number; b: number } }[] = []
    // a press on a glyph turns that instrument's arpeggiator to the next option (saved like the Itens panel); it
    // neither equips, fires nor walks
    const onArpDown = (e: PointerEvent) => {
      if (e.button !== 0 || cameraKey || !arpBoxes.length) return
      const hit = arpBoxes.find(a => e.clientX >= a.box.l && e.clientX <= a.box.r && stageY(e.clientY) >= a.box.t && stageY(e.clientY) <= a.box.b)
      if (!hit) return
      e.preventDefault(); e.stopImmediatePropagation()
      const all = loadItems()
      all[hit.item].arp = nextArp(all[hit.item].arp)
      saveItems(all)
    }
    let wheel = 0, slotPick = 0, escape = false
    let cameraKey = false, panPointer: number | null = null, panDeltaX = 0, panDeltaY = 0
    let resetCamera = false, padResetHeld = false
    const resetView = () => { viewZoom = 1; resetCamera = true }
    let cameraModeShown = false
    const showCameraMode = (on: boolean) => {
      if (on !== cameraModeShown) { cameraModeShown = on; setCameraMode(on) }
      document.body.classList.toggle('pigchicken-camera-mode', cameraKey)
    }
    const isUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("header, aside, button, input, select, a, [data-chicken-ignore], [role='dialog']")
    // the camera key's wheel (zoom) and press (pan, reset) also work over the Modo editor's hit areas (an element,
    // selected or not, and its corners): only panels and real controls keep them
    const blocksCamera = (t: EventTarget | null) => isUi(t) && !(t as Element | null)?.closest?.("[data-patio-hit]")
    // a press on a chicken's body picks her up (the engine drags her); it neither fires nor walks
    const onChicken = (t: EventTarget | null) => !!(t as Element | null)?.closest?.('[data-part="root"]')
    // point-and-click with empty hands: a click or a tap on the scene sends her walking there (like on the globe)
    let walkTap: { id: number; x: number; y: number; t: number } | null = null
    const canWalkTap = (e: PointerEvent) => e.button === 0 && !cameraKey && !isUi(e.target) && !onChicken(e.target) &&
      !(e.target as Element | null)?.closest?.("[data-patio-editor]") && !combat.held && !engine.getMotionState().held
    // Tela serve como mira (Controles → Touch, on by default): on a touch screen one finger on the scene is the mouse's
    // left button there. It aims at the finger and fires (pecks with empty hands) from the next frame on, for two frames
    // at least, following the finger while it stays down; a quick tap (the walk's rule) also sends her walking there, any
    // item in her wing. Her movement stick and keys stop that walk (the engine drops it on any movement input)
    let screenFinger: { id: number; x: number; y: number; frames: number; up: boolean } | null = null
    // a click or a tap on what Pegar offers now (the item at her feet, the one she already carries, the fixed instrument
    // or the Baú next to her) is Pegar for one frame instead of a shot or a walk; grabSpot: that thing on the screen,
    // measured by the last frame
    let grabTap = false
    let grabSpot: { l: number; r: number; t: number; b: number } | null = null
    const onGrabSpot = (x: number, y: number) => !!grabSpot && x >= grabSpot.l && x <= grabSpot.r && y >= grabSpot.t && y <= grabSpot.b
    const canScreenAim = (e: PointerEvent) => e.button === 0 && controls.touchScreenAim && !cameraKey && !p1Seated && !isUi(e.target) &&
      !(e.target as Element | null)?.closest?.("[data-patio-editor]") && !getTouchLayout().editing && !engine.getMotionState().held
    // the item at her feet is often under her own body: a press there is Pegar, not picking her up
    const takeGrabTap = (e: PointerEvent) => {
      if (!onGrabSpot(e.clientX, stageY(e.clientY))) return false
      e.preventDefault(); e.stopPropagation()
      grabTap = true
      return true
    }
    // Golpe desenhado on the screen: a finger that lands around her (within one and a half blows' reach of her shoulder,
    // ring: measured by the last frame, in client px) waits to see. Dragged more than DRAW_PX, it draws the blow from
    // where it landed and nothing fires or walks; lifted without dragging, it is the tap it always was (a shot or a
    // peck there, and the walk)
    let ring: { x: number; y: number; r: number } | null = null
    let screenDraw: { id: number; x: number; y: number; x0: number; y0: number; moved: boolean; up: boolean } | null = null
    const DRAW_PX = 10
    const onTouchDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return
      walkTap = null
      if (!canScreenAim(e) || takeGrabTap(e) || onChicken(e.target)) return
      walkTap = { id: e.pointerId, x: e.clientX, y: stageY(e.clientY), t: performance.now() }
      if (screenFinger && !screenFinger.up) return
      if (!screenDraw && ring && Math.hypot(e.clientX - ring.x, stageY(e.clientY) - ring.y) <= ring.r) {
        screenDraw = { id: e.pointerId, x: e.clientX, y: stageY(e.clientY), x0: e.clientX, y0: stageY(e.clientY), moved: false, up: false }
        return
      }
      if (!screenDraw) screenFinger = { id: e.pointerId, x: e.clientX, y: stageY(e.clientY), frames: 0, up: false }
    }
    const onScreenMove = (e: PointerEvent) => {
      if (screenFinger && !screenFinger.up && screenFinger.id === e.pointerId) { screenFinger.x = e.clientX; screenFinger.y = stageY(e.clientY) }
      const sd = screenDraw
      if (sd && !sd.up && sd.id === e.pointerId) {
        sd.x = e.clientX; sd.y = stageY(e.clientY)
        if (!sd.moved && Math.hypot(sd.x - sd.x0, sd.y - sd.y0) > DRAW_PX) { sd.moved = true; walkTap = null }
      }
    }
    const onTapUp = (e: PointerEvent) => {
      const sd = screenDraw
      if (sd && sd.id === e.pointerId) {
        // (not dragged: the tap it always was, a shot there for two frames)
        if (sd.moved) sd.up = true
        else { screenDraw = null; screenFinger = { id: e.pointerId, x: sd.x, y: sd.y, frames: 0, up: true } }
      }
      const t = walkTap
      if (!t || t.id !== e.pointerId) return
      walkTap = null
      if (Math.hypot(e.clientX - t.x, stageY(e.clientY) - t.y) <= 8 && performance.now() - t.t <= 600) engine.walkTo({ x: e.clientX, y: stageY(e.clientY) })
    }
    // Golpe desenhado with the mouse (the right button): the press starts the drawing, the frame records the pointer's
    // angle around her while it is held, and the blow comes out when it is let go (up: where). A click that drew
    // nothing is a blow of the combo there; with the item's point-and-click (pc) it also walks her toward a point out
    // of the blow's reach
    let rDown: { pc: boolean } | null = null
    let rUp: { x: number; y: number } | null = null
    // the Golpe desenhado being drawn (mouse or touch Punch): the angle around her shoulder, frame by frame (t in s)
    let drawing: { t: number; a: number }[] = []
    // the aim when the touch Punch's drawing started: its turns count from there
    let punchFrom = 0
    const canPointClick = (e: PointerEvent) => e.button === 2 && !cameraKey && !isUi(e.target) && !onChicken(e.target) &&
      !(e.target as Element | null)?.closest?.("[data-patio-editor]") && !engine.getMotionState().held
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
      const hit = cageBoxAt(e.clientX, stageY(e.clientY))
      if (!hit) return
      e.preventDefault(); e.stopImmediatePropagation()
      cageTaps.push({ id: hit.id, i: hit.i })
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || noMouse()) return
      mouseOverUi = overUi(e.target)
      // a Gaiola that can be pressed is a button too: the normal cursor, no reticle
      hoverCage(mouseOverUi || cameraKey ? null : cageBoxAt(e.clientX, stageY(e.clientY)))
      if (cageHover) mouseOverUi = true
      if (cameraKey) {
        if (e.button === 1 && (e.buttons & 4)) resetView()
        if (panPointer === e.pointerId && (e.buttons & 1) && mouse) {
          panDeltaX += e.clientX - mouse.x; panDeltaY += stageY(e.clientY) - mouse.y
        }
        mouse = { x: e.clientX, y: stageY(e.clientY) }
        return
      }
      // a button pressed or let go while another one is held arrives as a pointermove (chorded buttons), not as
      // pointerdown/up: e.g. the right button (Golpe) while the left one (Atirar) is held
      if (e.button === 0 || e.button === 2) {
        if (e.buttons & (e.button === 0 ? 1 : 2)) onDown(e); else onUp(e)
      }
      if (mouse) {
        const moved = Math.hypot(e.clientX - mouse.x, stageY(e.clientY) - mouse.y)
        owner.moved(moved, performance.now())
        bowing.travel += moved
        if (moved > 0) bowing.movedAt = performance.now()
        if (owner.owns) stickOwner.release()
      }
      mouse = { x: e.clientX, y: stageY(e.clientY) }
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || noMouse()) return
      if (cameraKey && !blocksCamera(e.target)) {
        e.preventDefault(); e.stopPropagation()
        if (e.button === 0) {
          panPointer = e.pointerId; mouse = { x: e.clientX, y: stageY(e.clientY) }
          document.body.classList.add('pigchicken-camera-dragging')
        }
        if (e.button === 1) resetView()
        return
      }
      if (isUi(e.target)) return
      // (sitting at the Harpa she is not picked up: a press on her plucks the strings there)
      // a click on what Pegar offers does it (nothing fires, nobody walks, she is not picked up)
      if (e.button === 0 && !p1Seated && !engine.getMotionState().held && takeGrabTap(e)) return
      if (e.button === 0 && onChicken(e.target) && !p1Seated) return
      // empty hands: the left button pecks as always and, on a quick click, also walks there
      if (e.button === 0 && canWalkTap(e)) walkTap = { id: e.pointerId, x: e.clientX, y: stageY(e.clientY), t: performance.now() }
      if (e.button === 0) mouseBtn.fire = true
      if (e.button === 2) { rDown = { pc: canPointClick(e) }; rUp = null }
      if (e.button === 0 && p1Kit) clicks.push({ x: e.clientX, y: stageY(e.clientY) })
    }
    const onUp = (e: PointerEvent) => {
      onTapUp(e)
      if (screenFinger?.id === e.pointerId) screenFinger.up = true
      if (panPointer === e.pointerId && e.button === 0) {
        panPointer = null
        document.body.classList.remove('pigchicken-camera-dragging')
        e.preventDefault(); e.stopPropagation()
      }
      if (e.button === 0) mouseBtn.fire = false
      if (e.button === 2 && rDown) rUp = { x: e.clientX, y: stageY(e.clientY) }
    }
    const onMenu = (e: MouseEvent) => { if (!isUi(e.target)) e.preventDefault() }
    const onCameraClick = (e: MouseEvent) => {
      if (cameraKey && !blocksCamera(e.target)) { e.preventDefault(); e.stopPropagation() }
    }
    const onWheel = (e: WheelEvent) => {
      if (noMouse()) return
      if (cameraKey) { if (!blocksCamera(e.target)) viewZoom = clampZoom(viewZoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); return }
      if (isUi(e.target) || !e.deltaY) return
      // the open inventory wheel: rolled up, the next slice; down, the one before
      if (wh.open) { wheel -= Math.sign(e.deltaY); return }
      // otherwise each direction does the action it is bound to in Controles (by default up: Próximo item, down: Item
      // anterior); the item steps count every notch, any other action is one press of it
      const action = controls.wheel[e.deltaY < 0 ? "up" : "down"]
      if (action === "nextItem") wheel++
      else if (action === "prevItem") wheel--
      else if (action) engine.tapAction(action)
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      // the Bateria's shortcuts (a key of the kit never scrolls the page while someone sits at one)
      if (!isChickenControlsListening() && !t?.closest?.('[role="dialog"], [role="alertdialog"]')) {
        drumKeys.add("Key:" + e.code)
        if ((p1Kit || extraKit.size > 0) && drumKeyTokens(drumKit(), controls, null).has("Key:" + e.code)) e.preventDefault()
      }
      if (e.code === "Backquote") {
        e.preventDefault(); cameraKey = true; mouseBtn.fire = false; rDown = null; rUp = null
        showCameraMode(true)
      }
      const slot = inventorySlotFromCode(e.code)
      if (slot !== null && !e.repeat) slotPick = slot
      if (e.code === "Escape") escape = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      drumKeys.delete("Key:" + e.code)
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
    window.addEventListener("pointerdown", onFingerDown, true)
    window.addEventListener("pointermove", onFingerMove)
    window.addEventListener("pointermove", onScreenMove)
    window.addEventListener("pointerup", onFingerUp, true)
    window.addEventListener("pointercancel", onFingerUp, true)
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
    // sucked into a portal, or coming out of the other one of a pair: where the camera was when it began and where it
    // ends, with the portal in view
    let portalCam: { mode: 'enter' | 'arrive'; x0: number; y0: number; x1: number; y1: number } | null = null
    const extraSeated = new Set<string>()
    // the other local players sitting at a Bateria
    const extraKit = new Set<string>()
    // viewZoom: the player's own zoom (the camera key, the pad); zoom: the camera's this frame, which aiming through a
    // luneta pulls farther out (lib/pigchicken/scope.ts)
    let viewZoom = carryRef.current?.zoom ?? 1, zoom = viewZoom, forceFollow = false, panParked = false, panInterrupted = false, wasPanHeld = false, lastPlayer = { x: 0, y: 0 }, playerSeen = false
    let reloadPendingAt = 0, reloadPending = false, reloadFired = false
    // the zoom's limits this frame: the Pátio's range, never farther out than the whole Pátio on this screen
    let zoomLo: number = PATIO_ZOOM.min, zoomHi: number = PATIO_ZOOM.max
    const clampZoom = (z: number) => Math.max(zoomLo, Math.min(zoomHi, z))
    let prev: Partial<Record<ChickenAction, boolean>> = {}
    const quickSwitch = newQuickSwitchRepeat(), groupSwitch = newGroupSwitchRepeat()
    // the other local players' actions in the last frame (presses are edges)
    const extraPrev = new Map<string, Partial<Record<ChickenAction, boolean>>>()
    const extraQuickSwitch = new Map<string, QuickSwitchRepeat>(), extraGroupSwitch = new Map<string, GroupSwitchRepeat>()
    const extraAim = new Map<string, { muzzle: { x: number; y: number }; angle: number; reach: number }>()
    // the Escalas layer's standby, per player: whether they played this frame and how far their scale has faded
    const scalePlaying = new Map<string, boolean>()
    const scaleStandby = new Map<string, StandbyState>()
    // the weapons' tambor / pente, per player: what they saw last frame, Próxima variação pressed, where the reticle is
    const ammoViews = new Map<string, AmmoView>()
    const noteViews = new Map<string, NoteView>()
    const ammoWake = new Map<string, boolean>()
    const ammoAt = new Map<string, { x: number; y: number }>()
    // the luneta, per player: how far in each one aims (0..1); the first player's item and aim also move the camera
    const scopeK = new Map<string, number>()
    let scopeDef: ScopeParams | null = null, scopeAngle = 0, zoomWhole = 0
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
      drumKeys.clear()
      cancelPecks = true; mouseBtn.fire = false; cameraKey = false; panPointer = null
      screenFinger = null; walkTap = null; grabTap = false; screenDraw = null
      panInterrupted = false; wasPanHeld = false; panDeltaX = 0; panDeltaY = 0
      document.body.classList.remove('pigchicken-camera-dragging'); showCameraMode(false)
    }
    window.addEventListener("blur", cancelPeckInput)
    window.addEventListener("pointercancel", cancelPeckInput)
    let slotsShown = "2:0:0", wheelDrawn = false, fireBlock = false, prevFire = false
    // the canvas over the characters, sized like the main one and empty, for this frame
    const clearFront = () => {
      if (wheelCanvas.width !== canvas.width || wheelCanvas.height !== canvas.height) {
        wheelCanvas.width = canvas.width; wheelCanvas.height = canvas.height
        const dpr = canvas.width / stageWidth()
        wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        wheelCanvas.style.display = ""
      }
      wctx.clearRect(0, 0, stageWidth(), stageHeight())
      wheelDrawn = true
    }
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
    // the rooms of the houses (lib/pigchicken/house-rooms.ts): what is fired inside one stays in it
    let shotRooms = new Map<string, ShotRoom & { rect: RoomRect }>()
    const net = createNetWorldSync(combat, () => ["p1", ...(extras?.current?.keys() ?? [])], {
      // another browser's shot that begins in the room one of its players is in: seen only when that house is open here
      shotRoom: (pid, x, y) => {
        for (let slot = 0; slot < 4; slot++) {
          const house = houseRoomsStore.netRoom(pid, slot), room = house ? shotRooms.get(house) : undefined
          if (room && x >= room.rect.l - 40 && x <= room.rect.r + 40 && y >= room.rect.t - 40 && y <= room.rect.b + 40) return houseRoomsStore.isOpen(room.id) ? room : "hidden"
        }
        return null
      },
    })
    const soulPortals = new Map<string, SoulPortal>()
    // instruments, the enemies' answers and the zone's ambience play on PigChicKen's own synth
    combat.setMusicOut({
      note: (voice, midi, at, dur, vel, fade, vib) => playNote(voice, midi, { at, dur, vel, fade, vib }),
      hold: (voice, midi, vib) => playNote(voice, midi, { sustain: true, vel: 0.8, vib }),
      pluck: (voice, midi, at, dur, vel, vib) => playNote(voice, midi, { at, dur, vel, vib }),
      drum: (kind, at, vel) => playDrum(kind, at, vel ?? 1),
      kit: (piece, at, vel, open, light) => playKit(piece, { at, vel, open, light }),
      knock: (kind, vel) => playKnock(kind, vel),
    })
    // the temple's mini-game (its state is plain data, stepped with the beats: ready to be shared in multiplayer)
    const temple = createTemple(Math.floor(Math.random() * 2 ** 31))
    templeDraw.temple = temple
    // the fases de notas (the guitar hero mode): each one asked for by a Jukebox or a Vitrola (its Tocar, or the Gongo
    // of its zone), the song editor or a bomb, bound to the zone where it began; several play at once in different
    // zones, each on its zone's own clock (lib/pigchicken/note-stages.ts)
    const stages = createNoteStages()
    // the aliens' catalogue (saved in this browser): the song's aliens take their variations from it
    let catalog = loadCatalog()
    stages.setCatalog(catalog)
    templeDraw.catalog = catalog
    const unsubCatalog = subscribeCatalog(c => { catalog = c; templeDraw.catalog = c; stages.setCatalog(c) })
    // the songs' library: the songs and each sequencer's pick (the campaign's disc, or a song)
    let library = loadLibrary()
    const useLibrary = (l: typeof library) => { library = l; templeDraw.library = l }
    useLibrary(library)
    const unsubLibrary = subscribeLibrary(useLibrary)
    // "Tocar" in a sequencer's panel (device: whose panel it is): its song starts now
    let playRequest: { id: string; device: string | null } | null = null, jukeRing = 9
    const unsubPlay = onPlaySong((id, device) => { playRequest = { id, device } })
    // a sequencer's Parar: its song stops; the campaign is put back at rest (as the reset stone does)
    let stopRequest: { device: string | null } | null = null, campaignStop = 0
    const unsubStop = onStopSong(device => { stopRequest = { device } })
    // the Gongos of the layout (by element id): their settings and their strikes so far
    const gongSet = new Map<string, GongParams>(), gongRuns = new Map<string, GongRun>()
    // the Jukeboxes and Vitrolas of the layout (by their button's label): the goal of the songs they play
    const playerSet = new Map<string, PlayerParams>()
    // the song editor's "Tocar daqui" and "Parar"; the Gongo do Templo asking for the song of its zone
    let draftRequest: DraftRequest | null = null, templeSongAsked = false
    const unsubDraft = onPlayDraft(r => { draftRequest = r })
    templeDraw.stages = stages
    combat.setNoteEnv(shot => stages.noteEnv(shot))
    const templeSounds: TempleSound[] = []
    const stageSounds: NoteStageSound[] = []
    let templeShown = ""
    // dev only: lets the test scripts reach the combat and the temple
    if (process.env.NODE_ENV !== "production") Object.assign(window as unknown as Record<string, unknown>, { __pigchicken: combat, __pigchickenTemple: temple, __pigchickenStages: stages, __chickenEngine: engine })
    const drone = createDrone()
    // how long the zone's ambience has been sounding: after a silence its layers come in one by one
    const ambEntry = createAmbienceEntry()
    // the zone's music switched off in its panel: what still plays of it until the bar line (null: nothing cut)
    const zoneSwitch = createZoneSwitchWatch()
    let cutFamily: Zone | null = null
    let zoneShown: Zone | null = null, zoneBanner = 0
    let clockOff: number | null = null
    const unsubItems = subscribeItems(next => combat.setItems(next))
    // the souls' catalogue in use: the game's, or the draft an admin edits in the library (the souls flying follow it)
    setSoulEntries(loadSoulEntries())
    const unsubSouls = subscribeSoulEntries(next => { setSoulEntries(next); combat.refreshSouls() })
    // creative mode: a rack that keeps a pistol to pick up, and target dummies in the first two scenes
    let placed = false, offerShown: GrabOffer = "", wasPortalArrival = false
    const G = WORLD_GROUND_Y
    // the Pátio's own things (dummies, racks, horde buttons) come from its layout and follow its edits
    const layoutSync = createLayoutSync(combat)
    let syncedElements: LayoutElement[] | null = null, syncedScreens = -1
    // the Quadros de lousa's ghosts (training-ghosts.ts), in world units like the layout they come from
    const ghosts = ghostHostRef.current ? createTrainingGhosts(ghostHostRef.current) : null
    let ghostElements: LayoutElement[] = []
    // the Templo do Gongo's gong, stone, jukebox and racks are elements of the layout (layout-sync.ts)
    const place = () => { placed = true }
    // the platforms the shots hit, in world units (the same boxes the world draws)
    let worldBoxes: Box[] = []
    // the layout's Zonas sonoras and Faixas fixas: what each point of the map plays
    let worldMusic: { zones: ZoneBox[]; lanes: LanesBox[] } = { zones: [], lanes: [] }
    // the zones as they play now (the ones with walls change when their life runs out: zone-life.ts)
    let playZones: ZoneBox[] = []
    // the scenes' own zones: Zonas sonoras stuck to the ground, under the map's (made again when the Pátio changes
    // them, their limits or its width)
    let ground: ZoneBox[] = [], groundOf: unknown[] = []
    // the Grade de blocos' blocks as Zonas sonoras (mine-zones.ts), between the scenes' zones and the map's: made
    // again when the grid's shape, its settings or the scenes' zones change
    let blockZones: ZoneBox[] = [], blockZonesOf: unknown[] = []
    const allZones = () => liveZones([...ground, ...blockZones, ...worldMusic.zones])
    combat.setPlaceEnv((x, y) => placeEnvAt(playZones, worldMusic.lanes, x, y))
    combat.setZoneEffects((x, y) => zoneEffectsAt(playZones, x, y))
    combat.setZoneWalls((px, py, x, y, count) => {
      const hit = zoneWallHit(playZones, px, py, x, y)
      if (!hit) return null
      const died = count ? hitZone(hit.box.id) : null
      if (died) playZones = allZones()
      return { flipX: hit.flipX, color: (died ?? hit.box.zone).color, died: !!died }
    })
    // the Grade de blocos: what the combat does to its blocks, the bombs and the Filhotes (mine-grid-play.ts)
    const minePlay = bindMinePlay(combat, { engines: () => [["p1", engine], ...(extras?.current ? [...extras.current.entries()] : [])], color: who => colorsRef.current?.[who] })
    const header = document.querySelector("main header")
    let drawnCamX = NaN, drawnCamY = NaN, drawnZoom = NaN, drawnW = NaN, drawnH = NaN
    // the header's foot on the stage (0 with the Modo editor docked at the top: the header is above the stage)
    const headerFoot = () => Math.max(0, (header?.getBoundingClientRect().bottom ?? 0) - stageTop())
    let viewTop = headerFoot()
    const measureHeader = () => { viewTop = headerFoot() }
    const headerObserver = new ResizeObserver(measureHeader)
    if (header) headerObserver.observe(header)
    const fit = () => {
      const dpr = patioPixelRatio(window.devicePixelRatio, graphicsQuality() !== "high")
      canvas.width = Math.round(stageWidth() * dpr); canvas.height = Math.round(stageHeight() * dpr)
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
      // never below 0: the first frame's time can come before the moment this loop was set up (a slow load), and a
      // step back in time brought every dummy's tip back for that long
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now
      const S = settingsRef.current
      let st = engine.getMotionState()
      const viewW = st.width, worldW = SCENE_W * worldScenes(S.screens)
      {
        const range = zoomRangeRef.current ?? { min: PATIO_ZOOM.min, max: PATIO_ZOOM.max }
        const whole = wholeWorldZoom(viewW, worldW + 2 * LIMIT_BORDER, st.height - groundHRef.current - viewTop, WORLD_GROUND_Y - topRef.current + LIMIT_BORDER)
        const z = zoomLimits(range, whole)
        zoomLo = z.lo; zoomHi = z.hi; zoomWhole = whole
        viewZoom = clampZoom(viewZoom)
        zoom = scopeZoom(viewZoom, scopeDef, scopeK.get("p1") ?? 0, whole)
      }
      if (!placed) {
        place()
        // she starts by the entrance portal (world x), not in the middle of the screen
        // (coming through a portal from another Pátio, she is put at this one's entry portal as she arrives)
        const spawnX = spawnXRef.current
        if (spawnX !== undefined && !engine.getPortalTransit()) { engine.shift(spawnX - camX - st.x); st = engine.getMotionState() }
      }
      if (syncedElements !== elementsRef.current || syncedScreens !== S.screens) {
        syncedElements = elementsRef.current; syncedScreens = S.screens
        const shown = elementsInWorld({ v: 1, elements: syncedElements }, S.screens)
        layoutSync.sync(syncedElements, S.screens)
        // the Ativadores de grid de campo minado (mine-activator-store.ts)
        setMineActivators(shown.filter(el => el.kind === "mineactivator").map(el => ({ id: el.id, x: el.x, y: el.y, w: el.w, h: el.h, params: el.params.mineActivator ?? defaultMineActivator() })))
        gongSet.clear()
        for (const el of syncedElements) if (el.kind === "gong" && el.params.gong && !el.params.gong.temple) gongSet.set(el.id, el.params.gong)
        playerSet.clear()
        for (const el of syncedElements) if (el.kind === "jukebox" || el.kind === "vitrola") playerSet.set(deviceLabel(el.kind, el.id), el.params.player ?? defaultPlayer())
        for (const id of [...gongRuns.keys()]) if (!gongSet.has(id)) { gongRuns.delete(id); templeDraw.gongs.delete(`gong:${id}`) }
        const nextBoxes = layoutBoxes(shown)
        shotRooms = new Map(houseRooms(shown).map(room => [room.id, { id: room.id, ...roomShotWalls(room), rect: room.room }]))
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
      // (next to a free Harpa it sits her at it; sitting, it gets her up)
      const offer: GrabOffer = p1Seated ? "stand" : combat.hover ? "take" : combat.hoverOwned ? "equip" : combat.seatNear ? "sit" : offerShown && offerShown !== "stand" && engine.peekActions().grab ? offerShown : ""
      if (offer !== offerShown) { offerShown = offer; setGrabOffer(offer) }
      // where what Pegar offers sits on the screen (a click or a tap on it is Pegar): the item at her feet (or the one she
      // carries), else the fixed instrument next to her, else the Baú in reach. World px around its foot, like the camera
      // draws it (scaled around the screen's middle by the zoom)
      {
        const W = stageWidth(), H = stageHeight()
        const box = (x: number, y: number, half: number, up: number) => {
          const sx = (v: number) => W / 2 + (v - camX - W / 2) * zoom, sy = (v: number) => H / 2 + (v + (oy ?? 0) - H / 2) * zoom
          return { l: sx(x - half), r: sx(x + half), t: sy(y - up), b: sy(y + 16) }
        }
        const item = combat.hover ?? combat.hoverOwned, seat = combat.seatNear, chest = combat.chestNear?.chest
        grabSpot = p1Seated || st.held || oy === null ? null : item ? box(item.x, item.y, 36, 64) : seat ? box(seat.x, seat.y, 60, 150) : chest ? box(chest.x, chest.y, 50, 90) : null
      }

      // ---------- camera: only the crop changes with the screen, never the size of things ----------
      const worldX = camX + st.x
      // the look-ahead: the view leans toward the side she faces (and slides over when she turns around)
      if (!st.held) lead = leadStep(lead, st.face, S.camera === "follow" && !p1Seated ? S.lookAhead : 0, S.lookAheadSpeed, dt)
      const portalArrival = st.state === 'portalArrival'
      const snapToPortal = portalArrival && !wasPortalArrival
      wasPortalArrival = portalArrival
      const padButtons = padTokensFor(devicesRef.current)
      const rightStick = stickFor(devicesRef.current, 1, controls.analog.deadzoneR)
      const padZoom = padButtons.has("Pad:b8")
      const padPan = padButtons.has("Pad:b9") && !!rightStick
      showCameraMode(cameraKey || padZoom || padButtons.has("Pad:b9"))
      const padReset = padZoom && padButtons.has("Pad:b11")
      if (padReset) { viewZoom = 1; if (!padResetHeld) resetView() }
      else if (padZoom && rightStick) viewZoom = clampZoom(viewZoom * Math.exp(-rightStick.y * rightStick.mag * dt * 0.8))
      zoom = scopeZoom(viewZoom, scopeDef, scopeK.get("p1") ?? 0, zoomWhole)
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
      // (sitting at a fixed instrument, the camera follows her with her in the middle)
      const cameraMode = manualView ? 'fixed' : forceFollow || snapToPortal || zoom > 1 || p1Seated ? 'follow' : S.camera
      // aiming through a luneta, the view leans toward the aim, never so far that she leaves the screen
      const lean = p1Seated || snapToPortal || recenter ? { x: 0, y: 0 } : scopeLean(scopeDef, scopeK.get("p1") ?? 0, scopeAngle)
      const leanHalf = viewW / (2 * zoom) - 90
      const camLead = (snapToPortal || forceFollow) && !lean.x ? 0 : lean.x ? leanWithin(lead / zoom + lean.x + Math.sign(lean.x) * S.deadband / zoom, leanHalf, leanHalf) : lead / zoom
      let next = manualView || (st.held && !recenter) ? camX : cameraStep(camX, { mode: lean.x ? 'follow' : cameraMode, worldX, viewW, worldW, zoom, dt: snapToPortal || recenter ? 1 : dt, deadband: (snapToPortal || forceFollow || p1Seated) ? 0 : S.deadband / zoom, lag: snapToPortal || recenter ? 1 : forceFollow ? 12 : S.lag, lead: camLead })
      const groundScreen = st.height - groundHRef.current
      const worldTop = topRef.current
      const viewCentreY = st.height / 2
      const zoomGround = viewCentreY + (groundScreen - viewCentreY) / zoom
      const zoomTop = viewCentreY + (viewTop - viewCentreY) / zoom
      const yr = cameraYRange(zoomGround, worldTop, zoomTop)
      if (oy === null) oy = yr.lo
      // (sitting at a fixed instrument, it and its strings around her have to fit under the header)
      const seatAbove = p1Star ? FIXED_INSTRUMENTS.grandpiano.box.h + 20 : p1Seated && !p1Kit ? Math.max(HARP_BOX.h + 20, st.y - engine.getState().shoulder.y + SCALE_FAN_R * seatedFanSize(scaleSizeRef.current) * st.scale * 1.12 + 16) : 0
      // (up or down too, as far as her feet and her head stay on the screen where the camera would be without it)
      let lift = 0
      if (lean.y && !manualView && !st.held) {
        const still = cameraYStep(oy, { worldY: st.y - oy, groundScreen: zoomGround, viewTop: zoomTop, dt: 1, lag: 1, top: worldTop, above: seatAbove })
        const feet = st.y - oy + still, bottom = viewCentreY + (st.height - viewCentreY) / zoom
        lift = leanWithin(-lean.y, feet - 220 * st.scale - zoomTop - 24, bottom - 24 - feet)
      }
      let nextOy = manualView || (st.held && !recenter) ? oy : cameraYStep(oy, { worldY: st.y - oy, groundScreen: zoomGround, viewTop: zoomTop, dt: snapToPortal || recenter ? 1 : dt, lag: snapToPortal || recenter ? 1 : forceFollow ? 12 : S.lag, top: worldTop, above: seatAbove, lift })
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
      // sucked into a portal far from the view (switching Pátio by the entry portal, say): the camera goes with her to
      // it on the same curve, ending where the follow camera would keep her there; a portal already in view stays put
      // coming out of the other portal of a pair in this Pátio: instead of jumping there, the camera runs from the first
      // portal to it while she comes out, so the way from one to the other shows
      const into = engine.getPortalTransit()
      if (portalCam && portalCam.mode !== into?.mode) portalCam = null
      if (into?.mode === 'enter' && (portalCam || into.k < 1)) {
        if (!portalCam) {
          const x1 = cameraStep(camX, { mode: 'follow', worldX: into.x + camX, viewW, worldW, zoom, dt: 1, deadband: S.deadband / zoom, lag: 1, lead: 0 })
          const y1 = cameraYStep(oy, { worldY: into.y + 80 * st.scale - oy, groundScreen: zoomGround, viewTop: zoomTop, dt: 1, lag: 1, top: worldTop })
          portalCam = { mode: 'enter', x0: camX, y0: oy, x1, y1 }
        }
      } else if (into?.mode === 'arrive' && into.glide && (portalCam || snapToPortal)) {
        // (this frame's camera is the jump to her: where the run ends)
        if (!portalCam) portalCam = { mode: 'arrive', x0: camX, y0: oy, x1: next, y1: nextOy }
      } else portalCam = null
      if (portalCam && into) {
        const u = into.k * into.k * (3 - 2 * into.k)
        next = portalCam.x0 + (portalCam.x1 - portalCam.x0) * u
        nextOy = portalCam.y0 + (portalCam.y1 - portalCam.y0) * u
      }
      for (const id of ["p1", ...(extras?.current?.keys() ?? [])]) combat.setPlayerRoom(id, shotRooms.get(houseRoomsStore.roomOf(id) ?? "") ?? null)
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
        const at = cageBoxes.find(b => b.id === id && b.i === 0), scx = stageWidth() / 2, scy = stageHeight() / 2
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
      // inside a house, its walls and its ceiling are hers
      const wallsOf = (id: string) => {
        const room = shotRooms.get(houseRoomsStore.roomOf(id) ?? "")
        return room ? { lo: room.rect.l - camX, hi: room.rect.r - camX, top: room.rect.t + camY } : walls
      }
      engine.setBounds(wallsOf("p1"))
      others.forEach(o => {
        const os = o.getMotionState()
        if (Math.abs(os.groundY - (G + camY)) > 0.01) o.setGroundHeight(os.height - G - camY)
        o.setBounds(walls)
      })
      extras?.current?.forEach((o, id) => { if (houseRoomsStore.roomOf(id)) o.setBounds(wallsOf(id)) })
      ghosts?.frame({
        elements: ghostElements, camX, camY, zoom, dt, walls,
        players: [st, ...[...(extras?.current?.values() ?? [])].map(o => o.getMotionState())].map(os => ({ x: os.x + camX, y: os.y - camY })),
      })
      // the zoom pivots on the stage's centre, so a new stage size (the editor's dock) also redraws it
      if (worldRef.current && (camX !== drawnCamX || camY !== drawnCamY || zoom !== drawnZoom || stageWidth() !== drawnW || stageHeight() !== drawnH)) {
        const world = worldRef.current
        world.style.transform = worldTransform(camX, camY, zoom)
        holdLayer(world, zoom)
        world.style.transformOrigin = "0 0"
        setPlatformWorldOffset(world, -camX, camY)
        drawnCamX = camX; drawnCamY = camY; drawnZoom = zoom; drawnW = stageWidth(); drawnH = stageHeight()
      }
      if (fgRef?.current) {
        fgRef.current.style.transform = worldTransform(camX, camY, zoom)
        holdLayer(fgRef.current, zoom)
        fgRef.current.style.transformOrigin = "0 0"
      }
      // the layers above the chicken and the editor's handles follow the same camera
      moveLiveCamera(camX, camY, zoom)
      engine.setCameraZoom(zoom)
      others.forEach(o => o.setCameraZoom(zoom))
      // the Zona where each chicken stands: its gravity and the x-ray look (zone-physics.ts); the online players'
      // chickens ask the same zones (setLiveZones)
      setLiveZones(playZones)
      const zoneFxOf = (o: ChickenEngine) => { const os = o.getMotionState(); o.setZoneEffects(zoneEffectsAt(playZones, os.x + camX, os.y - camY - 60 * os.scale)) }
      zoneFxOf(engine); others.forEach(zoneFxOf)

      // ---------- aim ----------
      // picked up by the pointer: every action but Throw waits until she is let go
      const dragged = st.held
      const actNow = dragged ? onlyThrow(engine.getActions()) : engine.getActions()
      // a click or a tap on what Pegar offers: Pegar pressed for this frame (let go on the next)
      const act = grabTap && !dragged ? { ...actNow, grab: true } : actNow
      grabTap = false
      if (dragged) { mouseBtn.fire = false; rDown = null; rUp = null; slotPick = 0; slotTap.current = 0; barMove.current = null; wheel = 0 }
      const an = controls.analog
      const devs = devicesRef.current
      if (noMouse() && (mouse || mouseBtn.fire || rDown)) { mouse = null; mouseBtn.fire = false; rDown = null; rUp = null }
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
        const stick = rightStickForAim ?? wheelJog.current ?? (touchAim.current && touchAim.current.mag > 0.4 ? touchAim.current : null)
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
      const armed = !!combat.held
      const aimLock = act.down && armed && st.grounded
      // the movement keys aim in the 8 directions (brood is not a direction, crouch is down): without the mouse always;
      // with the mouse only once it has been still for `keysAimRelease` (0 = never)
      const keysOwn = keysAimFor(devs), keysAfterMouse = keysAimAfterMouse(devs, S.keysAimRelease)
      const keyDir = { x: (act.right ? 1 : 0) - (act.left ? 1 : 0), y: (act.crouch ? 1 : 0) - (act.up ? 1 : 0) }
      const keysPressed = (keysOwn || keysAfterMouse) && (keyDir.x !== 0 || keyDir.y !== 0)
      // the wheel's stick choices are not aim: while it is open the aim stick is not held
      const liveStick = wh.open ? null : rightStickForAim ?? touchAim.current
      if (liveStick) { heldStick = { stick: liveStick, touch: !rightStick }; stickOwner.moved(1, now); owner.release() }
      // the left stick or the movement keys take the aim back from a mouse / aim stick still for `aimRelease`
      if (leftStick || (keysOwn && keysPressed)) { owner.otherAim(now, S.aimRelease); stickOwner.otherAim(now, S.aimRelease) }
      // with the mouse, the keys wait for it to be still for `keysAimRelease`
      if (keysAfterMouse && keysPressed) { owner.otherAim(now, S.keysAimRelease); stickOwner.otherAim(now, S.keysAimRelease) }
      const keys = keysOwn || (keysAfterMouse && !owner.owns) ? keyDir : { x: 0, y: 0 }
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
      const unzoom = (p: { x: number; y: number }) => zoom !== 1 ? {
        x: (p.x - stageWidth() / 2) / zoom + stageWidth() / 2,
        y: (p.y - stageHeight() / 2) / zoom + stageHeight() / 2,
      } : p
      const aimMouse = mouse && unzoom(mouse)
      // Tela serve como mira: the finger on the scene aims and fires; after it lifts (and two frames held at least)
      // the aim stays on it for one more frame, the one that lets go
      let screenAt: { x: number; y: number } | null = null, screenFire = false
      if (screenFinger) {
        const f = screenFinger
        if (wh.open || dragged || p1Seated || !controls.touchScreenAim) screenFinger = null
        else {
          screenAt = unzoom(f)
          if (f.up && f.frames >= 2) screenFinger = null
          else { f.frames++; screenFire = true }
        }
      }
      // while the wheel is open the mouse and the right stick choose items, not the aim
      aim = resolveAim({
        rightStick: wh.open ? null : rightStickForAim ?? (held && !held.touch ? held.stick : null), mouse: autoAt ?? screenAt ?? (owner.owns && !wh.open && !panActive ? aimMouse : null),
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
          const o = engine.heldPoint(aim.angle, classItem(d, pointClassOf(engine.speciesNow())).pivotX, d.muzzleY)
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
      // Golpe desenhado (the right button, a finger dragged on the screen around her, or the touch Punch dragged out
      // of its circle): while held, each frame records the angle around her shoulder (the pointer's or the finger's;
      // the Punch's turns from where she aims); let go, the drawing becomes the blow's move. A click that drew less
      // than DRAWN_MIN_SWEEP is a blow of the combo right away, aimed at the clicked point; with the item's
      // point-and-click it also walks her toward that point when it is out of the blow's reach (the blow does not wait)
      let meleePath: SwingPath | null = null, clickStrike = false
      {
        const toStage = (p: { x: number; y: number }) => zoom !== 1
          ? { x: (p.x - stageWidth() / 2) / zoom + stageWidth() / 2, y: (p.y - stageHeight() / 2) / zoom + stageHeight() / 2 }
          : p
        const around = (p: { x: number; y: number }) => { const m = toStage(p); return Math.atan2(m.y - origin.y, m.x - origin.x) }
        // where a finger on the screen draws a blow instead of aiming: around her shoulder (client px)
        ring = { x: (origin.x - stageWidth() / 2) * zoom + stageWidth() / 2, y: (origin.y - stageHeight() / 2) * zoom + stageHeight() / 2, r: combat.drawnReach(st.scale) * 1.5 * zoom }
        const pd = punchDraw.current, sd = screenDraw
        if (rDown && mouse) drawing.push({ t: now / 1000, a: around(mouse) })
        else if (sd?.moved) drawing.push({ t: now / 1000, a: around(drawing.length ? sd : { x: sd.x0, y: sd.y0 }) })
        else if (pd && pd.turn !== null) {
          if (!drawing.length) punchFrom = aim.angle
          drawing.push({ t: now / 1000, a: punchFrom + pd.turn })
        }
        const blocked = p1Seated || wh.open || st.held
        if (rDown && rUp) {
          const press = rDown, up = rUp, path = blocked ? null : drawnPath(drawing)
          rDown = null; rUp = null; drawing = []
          if (path) meleePath = path
          else if (!blocked) {
            clickStrike = true
            const at = toStage(up), wo = { x: origin.x + camX, y: origin.y - camY }, goal = { x: at.x + camX, y: at.y - camY }
            const a = Math.atan2(goal.y - wo.y, goal.x - wo.x)
            aim = { ...aim, angle: a, dx: Math.cos(a), dy: Math.sin(a) }
            const reach = press.pc ? combat.pointClickReach(st.scale) : null
            if (reach !== null && Math.hypot(goal.x - wo.x, goal.y - wo.y) > reach) engine.walkTo(up)
          }
        } else if (sd?.up || pd?.up) {
          // (a drag too short to be a move is a blow of the combo, like a tap)
          if (sd?.up) screenDraw = null; else punchDraw.current = null
          meleePath = blocked ? null : drawnPath(drawing)
          clickStrike = !blocked && !meleePath
          drawing = []
        } else if (!rDown && !pd && !sd?.moved) drawing = []
      }
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
      const fire = !wh.open && !fireBlock && (act.fire || mouseBtn.fire || screenFire || fingers.length > 0 || (!!autoAt && now < autoUntil)), melee = !wh.open && (act.melee || clickStrike || !!meleePath)
      // Próximo item / Item anterior and the group switches repeat while held (Controles → Inventário)
      let pick = quickSwitchStep(act, prev, engine.isShiftHeld(), quickSwitch, dt, controls.inventory.repeatDelay, controls.inventory.repeatInterval)
      const groupPick = groupSwitchStep(act, prev, groupSwitch, dt, controls.inventory.repeatDelay, controls.inventory.repeatInterval)
      let pickVar = pickVariations(controls, act)
      if (wheel) { pick = wheel > 0 ? 1 : -1; pickVar = controls.variations[wheel > 0 ? "nextItem" : "prevItem"]; wheel = 0 }
      const group = wh.open ? null : groupPick
      const move = barMove.current
      barMove.current = null
      const input = {
        deselect: act.deselectItem && !prev.deselectItem,
        cancelFire: cancelPecks || wh.open || fireBlock || document.hidden || st.held || st.state.startsWith('portal'),
        fire, firePressed: fire && !prev.fire, melee: melee && !prev.melee, meleePath,
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
        })(), pick: wh.open ? 0 : pick, slot: wheelPick || slotPick || slotTap.current, grab: act.grab && !prev.grab, grabHeld: act.grab, grabReleased: !act.grab && !!prev.grab, grabRun: engine.grabIsRun(), runPressed: act.run && !prev.run && engine.runStores(),
        grabKeep: !!combat.seated && grabIsSeatBind(controls, devs, drumKeys, padButtonValues(devs), seatTokens(seatBindsOf(combat.seated.kind), controls, devs, drumKit())),
        fireDepth: wh.open || fireBlock ? 0 : fireDepth(controls, devs, padButtonValues(devs)), moves: movesOf(act),
        groupPick: group, move, pickVariations: pickVar, groupVariations: groupVariations(controls, group),
        variation: !wh.open && variationPress(act, prev),
      }
      slotPick = 0; slotTap.current = 0
      // (sitting at a fixed instrument its own binds come first: L3 is the Harpa's sustenido and the Bateria's Ataque
      // there, not Soltar alma)
      cageBinds("p1", p1Seated ? {} : act, p1Seated ? {} : prev)
      prev = { ...act, fire, melee }
      const boxes = worldBoxes
      const body = { x: st.x + camX, y: st.y - camY, face: st.face, scale: st.scale, grounded: st.grounded, state: bodyState(st), vx: st.vx, angle: st.angle, species: st.species, invLimits: engine.inventoryLimits() }
      const worldOrigin = { x: origin.x + camX, y: origin.y - camY }
      // the enemies move inside the scene she is in: the same for every screen size (and every player)
      const sceneL = Math.min(sceneAt(body.x), worldScenes(S.screens) - 1) * SCENE_W
      combat.setView(sceneL, sceneL + SCENE_W)
      // enemies are made by the lobby's owner (online): here, or asked of it
      const spawnEnemies = (s: NetSpawn) => {
        if (net.follower) { net.requestSpawn(s); return }
        const bounds = { l: s.l, r: s.r }
        if (s.what === "aliens") combat.spawnAliens(G, s.x, bounds, alienPattern(s.p))
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
      let gongHit = false, resetHit = false
      const gongStrikes: string[] = []
      combat.pressed.splice(0).forEach(id => {
        if (id === "gong") gongHit = true
        else if (id === "reset") resetHit = true
        else if (isSequencerLabel(id)) { templeDraw.jukeLast = id; jukeRing = 0; openJukebox(id) }
        else if (id.startsWith("gong:")) gongStrikes.push(id.slice(5))
        else if (id === "aliens") spawnEnemies({ what: "aliens", x: body.x, y: body.y, p: horde.pattern, ...scene })
        else if (id === "zombies") spawnEnemies({ what: "zombies", x: body.x, y: body.y, n: horde.zombies, ...scene })
        else if (id === "zcount") horde.zombies = ZOMBIE_COUNTS[(ZOMBIE_COUNTS.indexOf(horde.zombies) + 1) % ZOMBIE_COUNTS.length]
        else if (id === "pattern") horde.pattern = (horde.pattern + 1) % ALIEN_PATTERNS.length
      })
      buttonLabels.aliens = "ALIENS"; buttonLabels.pattern = `PADRÃO: ${alienPattern(horde.pattern).label.toUpperCase()}`
      buttonLabels.zombies = "ZUMBIS"; buttonLabels.zcount = `ZUMBIS: ${horde.zombies}`
      // Register every local player before the shared projectile update, including its owner.
      // (id: the local player each one is, for what their souls flying free do to them; the chicks have none)
      const playerOf = new Map([[engine, "p1"] as const, ...Array.from(extras?.current?.entries() ?? [], ([id, e]) => [e, id] as const)])
      // a zombie biting this browser's chicken takes some of her health
      combat.setHurt((amount, fromX) => engine.hurt(amount, fromX - camX))
      // each class's hit-area (lib/chicken/body-frame.ts, edited in the Vestiário)
      const frames = getChickenConfig().frames
      combat.setBlastActors([engine, ...Array.from(extras?.current?.values() ?? []), ...Array.from(chicks?.current?.values() ?? [])].map(eng => {
        const st = eng.getMotionState(), x = st.x + camX, y = st.y - camY
        return { id: playerOf.get(eng), box: bodyBox(frames, st.species, x, y, st.scale, st.face, poseOf(st.state, st.grounded, st.angle), st.angle), v: { x: st.vx, y: st.vy }, push: (vx: number, vy: number, damage?: number) => eng.impulse(vx, vy, true, damage) }
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
      // (and where her scale's drawing is in the world: the Aim Assist's cells)
      const scaleR = SCALE_FAN_R * (combat.seated ? seatedFanSize(scaleSizeRef.current) : scaleSizeRef.current) * st.scale
      combat.setScaleFan({ x: origin.x + camX, y: origin.y - camY, r: scaleR })
      combat.setAimReach(aimReach({ px: aim.target ? Math.hypot(aim.target.x - origin.x, aim.target.y - origin.y) : null, radius: scaleR, stick: aim.source === "rightStick" || aim.source === "touch" || aim.source === "leftStick" ? aim.strength : null }), aim.target ? "point" : aim.source === "rightStick" || aim.source === "touch" || aim.source === "leftStick" ? "stick" : "none")
      // where the reticle is (the cursor; with a stick or the keys, at the reticle's distance): a deck's card flies there
      // (a stick that owns the aim sets how far by how far it is pushed: the aim stick first, else the movement stick)
      { const sd = S.reticleDist * stickAimDepth(aim.source, aim.strength); combat.setAimPoint(aim.target ? { x: aim.target.x + camX, y: aim.target.y - camY } : { x: m0.x + Math.cos(aim.angle) * sd + camX, y: m0.y + Math.sin(aim.angle) * sd - camY }) }
      // sitting at a fixed instrument (the Harpa): Pular or a blast got her up
      if (engine.takeSeatLeft()) combat.standUp()
      // she fell onto the ground holding Chocar: the zone strip's tag under her steps to its next value (zone-slam.ts)
      if (engine.takeSlam()) zoneSlam(engine.getMotionState().x + camX)
      // (the part of the screen the Bateria's chart may use, whatever the camera's zoom: under the header's buttons)
      { const hw = stageWidth() / 2, hh = stageHeight() / 2; setDrumScreen({ l: hw - (hw - 8) / zoom, r: hw + (hw - 8) / zoom, t: hh - (hh - 60) / zoom, b: hh + (hh - 8) / zoom }) }
      // her hands over its strings: the fingers on the screen (each one a hand, its touch the pluck); else a gamepad's
      // sticks (right: the front hand, left: the back one; a stick at rest is a hand off the strings; the Harpa's
      // Sustenido bind, L3 or Shift by default); else the aim itself (the mouse's own place; the keys' direction, a plain note)
      if (combat.seated) {
        const fanR = SCALE_FAN_R * seatedFanSize(scaleSizeRef.current) * st.scale
        const padR = wh.open ? null : rightStickForAim, padL = wh.open ? null : stickFor(devs, 0, an.deadzoneL)
        const sharp = harpHeld(controls, "sharp", devs, drumKeys, padButtonValues(devs))
        const stickHand = (s: Stick): StringAim => ({ angle: Math.atan2(s.y, s.x), reach: s.mag, kind: "stick", sharp })
        if (padR || padL) padHands = true
        else if (aim.source === "mouse" || aim.source === "keys") padHands = false
        let hands: (StringAim | null)[] = [null, null]
        if (fingers.length) {
          fingers.forEach(f => {
            const fx = zoom !== 1 ? (f.x - stageWidth() / 2) / zoom + stageWidth() / 2 : f.x, fy = zoom !== 1 ? (f.y - stageHeight() / 2) / zoom + stageHeight() / 2 : f.y
            hands[f.slot] = { angle: Math.atan2(fy - origin.y, fx - origin.x), reach: aimReach({ px: Math.hypot(fx - origin.x, fy - origin.y), radius: fanR }), kind: "point", fire: true, pressed: f.fresh }
          })
        } else if (padR || padL) hands = [padR ? stickHand(padR) : null, padL ? stickHand(padL) : null]
        else if (aim.target) hands = [{ angle: Math.atan2(aim.target.y - origin.y, aim.target.x - origin.x), reach: aimReach({ px: Math.hypot(aim.target.x - origin.x, aim.target.y - origin.y), radius: fanR }), kind: "point" }, null]
        else if (!padHands && (aim.source === "keys" || aim.source === "facing")) hands = [{ angle: aim.angle, reach: 1, kind: "none", sharp }, null]
        // at the Piano de cauda: its Estrela fits the screen, so a pointer's place is taken from the star's middle;
        // only the right stick is a hand (the left one is Agachar, Chocar and walking: the dynamics)
        p1Star = combat.scale.id === "star"
        if (p1Star) {
          const frame = starSeatFrame(origin.x, origin.y, fanR)
          const on = (px: number, py: number) => ({ angle: Math.atan2(py - frame.y, px - frame.x), reach: Math.hypot(px - frame.x, py - frame.y) / frame.r })
          hands = [null, null]
          if (fingers.length) fingers.forEach(f => {
            const fx = zoom !== 1 ? (f.x - stageWidth() / 2) / zoom + stageWidth() / 2 : f.x, fy = zoom !== 1 ? (f.y - stageHeight() / 2) / zoom + stageHeight() / 2 : f.y
            hands[f.slot] = { ...on(fx, fy), kind: "point", fire: true, pressed: f.fresh }
          })
          else if (padR) hands = [{ angle: Math.atan2(padR.y, padR.x), reach: padR.mag, kind: "stick" }, null]
          else if (aim.target) hands = [{ ...on(aim.target.x, aim.target.y), kind: "point" }, null]
          else if (!padHands && (aim.source === "keys" || aim.source === "facing")) hands = [{ angle: aim.angle, reach: 0.6, kind: "none" }, null]
        }
        combat.setStringHands(hands)
        // at the Bateria: each stick is a drumstick on the chart, each click or finger that landed a hit, and
        // every piece's shortcuts as her keys and gamepad say them
        p1Kit = combat.scale.id === "drums"
        if (p1Kit) {
          const mid = drumFrame(drumKit(), origin.x, origin.y, SCALE_FAN_R * st.scale)
          const onChart = (px: number, py: number) => {
            const fx = zoom !== 1 ? (px - stageWidth() / 2) / zoom + stageWidth() / 2 : px, fy = zoom !== 1 ? (py - stageHeight() / 2) / zoom + stageHeight() / 2 : py
            return { x: (fx - mid.x) / mid.r, y: (fy - mid.y) / mid.r }
          }
          const stickAt = (s: Stick | null) => (s ? { x: s.x * s.mag, y: s.y * s.mag } : null)
          combat.setDrumInput({
            sticks: [stickAt(padR), stickAt(padL)],
            taps: wh.open ? [] : [...clicks.map(c => onChart(c.x, c.y)), ...fingers.filter(f => f.fresh).map(f => onChart(f.x, f.y))],
            binds: wh.open ? {} : drumBindLevels(drumKit(), controls, devs, drumKeys, padButtonValues(devs)),
          })
        }
      } else { p1Kit = false; p1Star = false }
      clicks.length = 0
      for (let i = fingers.length - 1; i >= 0; i--) { if (fingers[i].up || !combat.seated) fingers.splice(i, 1); else fingers[i].fresh = false }
      minePlay.step(dt)
      minePlay.player("p1", engine, input)
      // a Filhote (lib/chicken/baby.ts): with its limits on (Personagem → Filhote), becoming one every item and Gaiola
      // falls around her, it carries one of each category and one Gaiola, never throws, and its empty hand peeps
      // (combat.ts); the notes that reach it fill its music bar
      const babyOn = getBaby().on, bp = getChickenConfig().params
      combat.setBaby("p1", babyOn)
      combat.setBabyRules({ noStaffs: bp.babyNoStaffs, oneCage: bp.babyOneCage, noMelee: bp.babyNoMelee, piu: bp.babyPiu })
      if (babyOn && !p1Baby && bp.babyDropItems) combat.dropAll(bp.babyDropSpread)
      p1Baby = babyOn
      if (babyOn) {
        if (bp.babyNoThrow) { input.throwHeld = false; input.throwReleased = false }
        combat.setBabies([{ by: "p1", box: bodyBox(getChickenConfig().frames, "chick", body.x, body.y, st.scale, st.face, poseOf(st.state, st.grounded, st.angle), st.angle), fill: () => { feedBaby(getChickenConfig().params.babyNotes) } }])
      } else combat.setBabies([])
      // the strong blow charged with an empty hand (Correntada, Rabada): the arm or the tail winds up
      engine.setBareCharge(!combat.held && combat.heavyCharging ? combat.heavyCharge : null)
      combat.step(dt, body, worldOrigin, { x: m0.x + camX, y: m0.y - camY }, aim.angle, input, boxes, G, (vx, vy) => engine.impulse(vx, vy), { peckOrigin: (() => { const p = engine.rigPoint("neck"); return { x: p.x + camX, y: p.y - camY } })(), hand: (() => { const p = engine.rigPoint("hand"); return { x: p.x + camX, y: p.y - camY } })(), throwOrigin: (() => { const p = engine.heldPoint(aim.angle, 0, 0); return { x: p.x + camX, y: p.y - camY } })() })
      // (she stays where its stool is, in the seated pose, until she gets up)
      { const seat = combat.seated, at = seat && seatSpot(seat); if (p1Seated !== !!seat) document.body.classList.toggle("pigchicken-seated", !!seat); p1Seated = !!seat; engine.setGame({ seat: at ? { x: at.x - camX, y: at.y + camY, face: seat!.face, keepJump: seatKeepsJump(seat!.kind) } : null }) }
      engine.setGame({ throwCharging: !!combat.held && !wh.open && (combat.throwCharge > 0 || (d.reticle === 'grenade' && d.fireMode === 'charge' && combat.fireCharge > 0)) })
      // the Itens panel follows the item the main player holds
      // (empty-handed, Pig and Ken hit with the chain and the tail: the panel opens on them)
      announceHeldItem(combat.held?.item ?? (babyOn ? 'piu' : body.species === 'pig' ? 'chainBlow' : body.species === 'fox' ? 'tailBlow' : null))
      announcePlayerClass(pointClassOf(body.species))
      announceHeldScale(combat.held && combat.def().instrument ? combat.scale.id : null)
      // (and its preview is in this Pátio's key)
      setScaleStage(combat.music)
      scalePlaying.set("p1", input.fire || input.melee)
      if (input.variation) ammoWake.set("p1", true)
      // the items each local player stands on: a blue (take / swap) or grey (equip) outline with that player's grab key
      pickupMarks.clear(); chestMarks.clear(); seatMarks.clear()
      markHover(combat, grabLabel(controls, devs))

      // ---------- the other local players: their own items (a loadout each), in the same world ----------
      const extraList = extras?.current ? [...extras.current.entries()] : []
      extraList.forEach(([id, eng]) => {
        const xs = eng.getMotionState(), xa = xs.held ? onlyThrow(eng.getActions()) : eng.getActions(), xp = extraPrev.get(id) ?? {}
        combat.use(id)
        const xd = combat.def(), xArmed = !!combat.held
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
        const xgroupRepeat = extraGroupSwitch.get(id) ?? newGroupSwitchRepeat()
        extraGroupSwitch.set(id, xgroupRepeat)
        const xgroup = groupSwitchStep(xa, xp, xgroupRepeat, dt, controls.inventory.repeatDelay, controls.inventory.repeatInterval)
        const xin = {
          deselect: xa.deselectItem && !xp.deselectItem,
          cancelFire: cancelPecks || document.hidden || xs.held || xs.state.startsWith('portal'),
          fire: xa.fire, firePressed: xa.fire && !xp.fire, melee: xa.melee && !xp.melee,
          throwHeld: xa.throw, throwReleased: !xa.throw && !!xp.throw, reload: xa.reload && !xp.reload, pick: xpick, slot: 0, grab: xa.grab && !xp.grab, grabReleased: !xa.grab && !!xp.grab, grabRun: eng.grabIsRun(), runPressed: xa.run && !xp.run && eng.runStores(),
          grabKeep: !!combat.seated && grabIsSeatBind(controls, devs, drumKeys, padButtonValues(devs), seatTokens(seatBindsOf(combat.seated.kind), controls, devs, drumKit())),
          fireDepth: fireDepth(controls, devs, padButtonValues(devs)), moves: movesOf(xa),
          groupPick: xgroup, pickVariations: pickVariations(controls, xa), groupVariations: groupVariations(controls, xgroup),
          variation: variationPress(xa, xp),
        }
        cageBinds(id, extraSeated.has(id) ? {} : xa, extraSeated.has(id) ? {} : xp)
        extraPrev.set(id, xa)
        extraAim.set(id, { muzzle: xm, angle: xd.turnRate > 0 ? combat.aimAngle : angle, reach: aimStick ? stickAimDepth("rightStick", aimStick.mag) : 1 })
        const xbody = { x: xs.x + camX, y: xs.y - camY, face: xs.face, scale: xs.scale, grounded: xs.grounded, state: bodyState(xs), vx: xs.vx, angle: xs.angle, species: xs.species, invLimits: eng.inventoryLimits() }
        combat.setAimReach((rs ?? ls)?.mag ?? 1, rs ?? ls ? "stick" : "none")
        combat.setScaleFan({ x: xo.x + camX, y: xo.y - camY, r: SCALE_FAN_R * (combat.seated ? seatedFanSize(scaleSizeRef.current) : scaleSizeRef.current) * xs.scale })
        { const xdist = S.reticleDist * (aimStick ? stickAimDepth("rightStick", aimStick.mag) : 1); combat.setAimPoint({ x: xm.x + Math.cos(angle) * xdist + camX, y: xm.y + Math.sin(angle) * xdist - camY }) }
        if (eng.takeSeatLeft()) combat.standUp()
        if (eng.takeSlam()) zoneSlam(xs.x + camX)
        // (her hands over the Harpa's strings: the two sticks; with the keys, the direction they aim)
        if (combat.seated) {
          const padL = stickFor(devs, 0, an.deadzoneL), pad = !!devs?.some(isPadDevice)
          const sharp = harpHeld(controls, "sharp", devs, drumKeys, padButtonValues(devs))
          const stickHand = (s: Stick): StringAim => ({ angle: Math.atan2(s.y, s.x), reach: s.mag, kind: "stick", sharp })
          // (at the Piano de cauda only the right stick is a hand: the left one is the dynamics)
          if (combat.scale.id === "star") combat.setStringHands(rs ? [{ angle: Math.atan2(rs.y, rs.x), reach: rs.mag, kind: "stick" }, null] : pad ? [null, null] : [{ angle, reach: 0.6, kind: "none" }, null])
          else combat.setStringHands(rs || padL ? [rs ? stickHand(rs) : null, padL ? stickHand(padL) : null] : pad ? [null, null] : [{ angle, reach: 1, kind: "none", sharp }, null])
          // (at the Bateria: their sticks are the drumsticks, their keys and buttons the pieces' shortcuts)
          if (combat.scale.id === "drums") {
            extraKit.add(id)
            const stickAt = (s: Stick | null) => (s ? { x: s.x * s.mag, y: s.y * s.mag } : null)
            combat.setDrumInput({ sticks: [stickAt(rs), stickAt(padL)], taps: [], binds: drumBindLevels(drumKit(), controls, devs, drumKeys, padButtonValues(devs)) })
          } else extraKit.delete(id)
        } else extraKit.delete(id)
        minePlay.player(id, eng, xin)
        combat.step(dt, xbody, { x: xo.x + camX, y: xo.y - camY }, { x: xm.x + camX, y: xm.y - camY }, angle, xin, boxes, G, (vx, vy) => eng.impulse(vx, vy), { world: false, peckOrigin: (() => { const p = eng.rigPoint("neck"); return { x: p.x + camX, y: p.y - camY } })(), hand: (() => { const p = eng.rigPoint("hand"); return { x: p.x + camX, y: p.y - camY } })(), throwOrigin: (() => { const p = eng.heldPoint(angle, 0, 0); return { x: p.x + camX, y: p.y - camY } })() })
        markHover(combat, grabLabel(controls, devs))
        scalePlaying.set(id, xin.fire || xin.melee)
        if (xin.variation) ammoWake.set(id, true)
        { const seat = combat.seated, at = seat && seatSpot(seat); if (seat) extraSeated.add(id); else extraSeated.delete(id); eng.setGame({ seat: at ? { x: at.x - camX, y: at.y + camY, face: seat!.face, keepJump: seatKeepsJump(seat!.kind) } : null }) }
        eng.setGame({ throwCharging: !!combat.held && (combat.throwCharge > 0 || (xd.reticle === 'grenade' && xd.fireMode === 'charge' && combat.fireCharge > 0)), throwHeld: xa.throw && !!combat.held && !combat.throwVoid, aimFace: xa.throw && rs && Math.abs(rs.x) > 0.2 ? Math.sign(rs.x) : null, lookAngle: aimStick || xKeys ? angle : null, ...effectGame(combat.effect, xd.weight, combat.effects) })
        const xsw = combat.swing
        eng.setPeck(combat.peck)
        eng.setSwing(rigSwing(xsw))
        eng.setHeld(heldItemPose(combat, now, null, xbody.face))
      })
      extraPrev.forEach((_, id) => { if (!extras?.current?.has(id)) { extraPrev.delete(id); extraQuickSwitch.delete(id); extraGroupSwitch.delete(id); extraAim.delete(id); cageHolds.delete(id); extraKit.delete(id); combat.drop(id) } })
      combat.use("p1")

      // ---------- the temple's mini-game ----------
      // the Templo plays in the scene around its Gongo do Templo (the first one in the world), the gong where the
      // temple always had it (GONG_X from the scene's left edge, the scene kept inside the world); without one there
      // is no Templo
      const templeGong = combat.targets.find(t => t.label === "gong" && t.x > -1e5)
      const hasTemple = !!templeGong
      const tL = templeGong ? Math.max(0, Math.min(SCENE_W * (worldScenes(S.screens) - 1), templeGong.x - GONG_X)) : templeScene(S.screens) * SCENE_W
      const inTemple = hasTemple && body.x >= tL && body.x < tL + SCENE_W
      // the Recomeçar stone she struck: the one nearest to her
      const resetStone = resetHit ? combat.targets.filter(t => t.label === "reset" && t.x > -1e5).sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x))[0] : undefined
      const events = combat.music.events.splice(0)
      jukeRing += dt; templeDraw.jukeRing = jukeRing
      for (const [k, v] of templeDraw.refused) { if (v > 1) templeDraw.refused.delete(k); else templeDraw.refused.set(k, v + dt) }
      // ---------- the fases de notas ----------
      // the zone of a point: the Zona sonora of the map that plays there (the blocks of the Grade de blocos are some),
      // else its scene's own (the scene's whole stretch, even with the scenes' zones off)
      const zoneOf = (x: number, y: number) => {
        const z = zoneAt(playZones, x, y, true)
        if (z) return { key: z.id, name: z.zone.name }
        const sc = Math.max(0, Math.min(sceneAt(x), worldScenes(S.screens) - 1))
        return { key: `cena${sc}`, name: `Cena ${sc + 1}` }
      }
      // the local players' bodies (whose fan a song is) and engines (an alien that touches one nudges it)
      const bodies = new Map<string, { x: number; y: number; scale: number }>([["p1", body]])
      extras?.current?.forEach((eng, id) => { const xs = eng.getMotionState(); bodies.set(id, { x: xs.x + camX, y: xs.y - camY, scale: xs.scale }) })
      const bodyOf = (pid: string) => bodies.get(pid) ?? body
      const engineOf = (pid: string) => (pid === "p1" ? engine : extras?.current?.get(pid) ?? engine)
      const nearestPlayer = (x: number) => [...bodies].sort((a, b) => Math.abs(a[1].x - x) - Math.abs(b[1].x - x))[0][0]
      const p1Zone = zoneOf(body.x, body.y - 90 * body.scale)
      // the sequencers (Jukebox, Vitrola) and the zone each one stands in
      const sequencers = combat.targets.filter(t => t.kind === "button" && isSequencerLabel(t.label) && t.x > -1e5)
      const zoneOfTarget = (t: { x: number; y: number; h: number }) => zoneOf(t.x, t.y - t.h / 2)
      // the sequencer of a zone for a Gongo: the one in its zone (the nearest), else one in its scene's own zone
      const sequencerFor = (g: { x: number; y: number; h: number }) => {
        const near = (list: typeof sequencers) => list.sort((a, b) => Math.abs(a.x - g.x) - Math.abs(b.x - g.x))[0] ?? null
        const z = zoneOfTarget(g).key, sc = `cena${Math.max(0, Math.min(sceneAt(g.x), worldScenes(S.screens) - 1))}`
        return near(sequencers.filter(t => zoneOfTarget(t).key === z)) ?? near(sequencers.filter(t => zoneOfTarget(t).key === sc))
      }
      const goalOf = (label: string | undefined) => { const p = (label && playerSet.get(label)) || defaultPlayer(); return { minAccuracy: p.minAccuracy / 100, hearts: p.hearts } }
      // the Templo's campaign keeps the zone of its scene for itself while it plays
      const campaignOn = temple.state.phase === "intro" || temple.state.phase === "playing"
      const templeKey = templeGong ? zoneOfTarget(templeGong).key : null
      let startCampaign = false
      const refuse = (label: string | undefined) => { if (label) templeDraw.refused.set(label, 0); playNoteStageSound({ kind: "dull" }, mixGain("effects")) }
      // a sequencer plays a song (its own pick, or the one asked): the campaign's disc starts the campaign
      const playOn = (dev: (typeof sequencers)[number], songId: string, owner: string, by: StageBy, gongX?: number) => {
        const z = zoneOfTarget(dev)
        if (songId === CAMPAIGN_ID) { if (templeKey && stages.busy(templeKey)) refuse(dev.label); else startCampaign = true; return }
        const song = library.songs.find(x => x.id === songId)
        if (!song) return
        const vitrola = dev.label?.startsWith("vitrola:")
        const again = by === "gongo" ? "Bata no gongo para tocar de novo." : vitrola ? "Bata na vitrola para tocar de novo." : "Bata na jukebox para tocar de novo."
        const req: StageRequest = { song, owner, zone: z.key, zoneName: z.name, by: vitrola && by === "jukebox" ? "vitrola" : by, device: dev.label, goal: goalOf(dev.label), record: true, again, gongX }
        if (stages.request(req, campaignOn && z.key === templeKey) === "busy") refuse(dev.label)
      }
      // Tocar, in a sequencer's panel (with no sequencer known: the nearest to her)
      if (playRequest !== null) {
        const r = playRequest
        playRequest = null
        const dev = sequencers.find(t => t.label === r.device) ?? [...sequencers].sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x))[0]
        if (dev) playOn(dev, r.id, "p1", "jukebox")
        else if (r.id === CAMPAIGN_ID) startCampaign = !(templeKey && stages.busy(templeKey))
      }
      // Parar, in a sequencer's panel: its song, else the campaign
      if (stopRequest) {
        const r = stopRequest
        stopRequest = null
        if (stages.playing.some(x => x.request?.device === r.device)) stages.halt({ device: r.device ?? undefined })
        else if (campaignOn) campaignStop = 3
      }
      // the song editor: its draft from a beat, in the zone she is in (over its own draft), or stop it
      if (draftRequest) {
        const r = draftRequest
        draftRequest = null
        if (r === "stop") stages.halt({ draft: true })
        else if (stages.request({ song: r.song, owner: "p1", zone: p1Zone.key, zoneName: p1Zone.name, by: "editor", goal: GOAL_DEFAULT, record: false, again: "", from: r.from, draft: true }, campaignOn && p1Zone.key === templeKey) === "busy") refuse(undefined)
      }
      // the Gongo do Templo asked for the song of its zone's sequencer (its strikes counted in the Templo)
      const templeSeq = templeGong ? sequencerFor(templeGong) : null
      const templePick = templeSeq ? pickOf(library, templeSeq.label) : CAMPAIGN_ID
      if (templeSongAsked) { templeSongAsked = false; if (templeSeq && templeGong) playOn(templeSeq, templePick, nearestPlayer(templeGong.x), "gongo", templeGong.x) }
      // the Gongos of the layout: their strikes press Tocar on the sequencer of their zone, or (while a song plays in
      // it) stop that song
      for (const id of gongStrikes) {
        const p = gongSet.get(id), g = combat.targets.find(t => t.label === `gong:${id}`)
        if (!p || !g) continue
        const run = gongRuns.get(id) ?? newGongRun()
        gongRuns.set(id, run)
        const gz = zoneOfTarget(g).key
        if (campaignOn && gz === templeKey) { run.ring = 0; templeSounds.push({ kind: "gongDull" }); continue }
        const there = stages.at(gz), playingHere = !!there && there.request?.by !== "bomba"
        const out = strikeGong(run, p, playingHere)
        if (out === "dull") playNoteStageSound({ kind: "dull" }, mixGain("effects"))
        else if (playingHere) {
          playNoteStageSound({ kind: "reset", hit: out === "stop" ? p.stopHits : run.stops, need: p.stopHits }, mixGain("effects"))
          if (out === "stop") stages.halt({ zone: gz })
        } else {
          templeSounds.push({ kind: "gong", hit: out === "start" ? p.hits : run.hits, need: p.hits })
          if (out === "start") {
            const dev = sequencerFor(g)
            if (dev) playOn(dev, pickOf(library, dev.label), nearestPlayer(g.x), "gongo", g.x)
            else playNoteStageSound({ kind: "dull" }, mixGain("effects"))
          }
        }
      }
      for (const [id, p] of gongSet) {
        const run = gongRuns.get(id) ?? newGongRun()
        gongRuns.set(id, run)
        stepGong(run, p, dt)
        const g = combat.targets.find(t => t.label === `gong:${id}`)
        const busy = g ? stages.busy(zoneOfTarget(g).key) || (campaignOn && zoneOfTarget(g).key === templeKey) : false
        templeDraw.gongs.set(`gong:${id}`, { ring: run.ring, waiting: !busy, hits: run.hits, need: p.hits, lamps: p.lamps })
      }
      // the stone struck stops the song of its zone (not a bomb's)
      const resetZone = resetStone ? zoneOfTarget(resetStone).key : null
      const resetTaken = !!resetZone && !!stages.at(resetZone) && stages.at(resetZone)?.request?.by !== "bomba"
      // what each stage needs: its owner's fan, whether its owner is in its zone, its own shots
      const noteEvents = combat.noteEvents.splice(0)
      const gongNear = (x: number) => combat.targets.filter(t => t.label === "gong" || t.label?.startsWith("gong:")).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]?.x
      const stageIo = (st: NoteStage | null, r?: StageRequest): NoteStageIO => {
        const req = r ?? st?.request ?? null, owner = req?.owner ?? "p1", b = bodyOf(owner)
        const fan = (r?.song ?? st?.song)?.fan
        const center = { x: b.x, y: b.y - (fan?.centerY ?? 0) * b.scale }
        const src = st?.source
        return {
          targets: combat.targets, music: combat.music, sceneL: tL, sceneW: SCENE_W, groundY: G,
          inside: !!req && zoneOf(b.x, b.y - 90 * b.scale).key === req.zone, gongX: req?.gongX ?? gongNear(center.x),
          center, resetHit: resetTaken && !!st && st.zone === resetZone, events: noteEvents,
          fire: n => { combat.fireNoteShot(n) }, clearShots: src => combat.clearNoteShots(src),
          incoming: src ? combat.noteShots.filter(n => n.state === "incoming" && n.source === src).length : 0,
          fx: { burst: combat.burst, text: combat.addText },
          push: dir => engineOf(owner).impulse(dir * 260, -200),
          sound: e => stageSounds.push(e),
        }
      }
      stages.step(dt, stageIo)
      stageSounds.splice(0).forEach(e => playNoteStageSound(e, mixGain("effects")))
      // a new record: the song's best score is kept (and the banner says so)
      for (const r of stages.takeResults()) {
        // a won song of a Jukebox or a Vitrola with a prize: its items jump out of it (in this browser, like a Baú's)
        const prize = r.ok && r.request.device ? playerSet.get(r.request.device)?.prize : undefined
        const dev = prize?.length ? combat.targets.find(t => t.label === r.request.device) : undefined
        if (prize && dev) combat.popPrize(dev.x, dev.y - dev.h, rollLoot(prize))
        if (!r.ok || !r.request.record) continue
        const st = stages.all.find(x => x.request === r.request)
        if (recordScore(r.request.song.id, r.score, r.accuracy) && st?.state.banner) st.state.banner.title += " · novo recorde!"
      }
      // the Gongo do Templo is dull while a song plays in its zone
      if (gongHit && templeKey && stages.busy(templeKey)) { gongHit = false; playNoteStageSound({ kind: "dull" }, mixGain("effects")) }
      if (resetTaken) resetHit = false
      const forcedReset = campaignStop > 0
      if (forcedReset) campaignStop--
      // the editor's playhead (its draft, else her song), the sequencers playing
      const mine = stages.playing.find(x => x.request?.draft) ?? stages.ownedBy("p1") ?? stages.at(p1Zone.key)
      nowPlaying.id = mine ? mine.song.id : null
      nowPlaying.beat = mine?.clock ? mine.beatAt(mine.clock.time, mine.clock.secondsPerBeat()) : NaN
      nowPlaying.draft = !!mine?.request?.draft
      nowPlaying.devices = stages.playing.flatMap(x => (x.request?.device ? [x.request.device] : []))
      const songPicked = templePick !== CAMPAIGN_ID && library.songs.some(x => x.id === templePick)
      const io: TempleIO = {
        targets: combat.targets, music: combat.music, sceneL: tL, gongX: templeGong?.x, resetX: resetStone?.x, groundY: G, inside: inTemple, body: { x: body.x, y: body.y, scale: body.scale }, boxes,
        gongHit, resetHit: resetHit || forcedReset, firePressed: input.firePressed,
        // a song picked: the gong's strikes start it (on the next frame, through the stage)
        song: songPicked ? () => { templeSongAsked = true } : undefined, start: startCampaign, beats: events.filter(e => e.kind === "beat").map(e => e.n),
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
      combat.setPlaying(stages.any || tp === "intro" || tp === "playing")
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
      // (her zone's song, or the temple: its campaign or at rest)
      const here = stages.at(p1Zone.key)
      const templeMusic = here?.music ?? temple.music
      const groundNow = [sceneZonesRef.current, sceneEdgesRef.current, sceneMusicRef.current, S.screens]
      if (groundNow.some((v, i) => v !== groundOf[i])) {
        groundOf = groundNow
        ground = sceneMusicRef.current ? groundZones(sceneZonesRef.current, sceneEdgesRef.current, S.screens) : []
        playZones = allZones()
      }
      const mineGeo = mineStore.round?.grid.geo, mineZones = mineStore.params?.zones
      const blocksNow = [mineGeo, mineZones, sceneZonesRef.current, sceneEdgesRef.current, S.screens]
      if (blocksNow.some((v, i) => v !== blockZonesOf[i])) {
        blockZonesOf = blocksNow
        blockZones = mineGeo && mineZones ? mineZoneBoxes(mineGeo, mineZones, { zones: sceneZonesRef.current, edges: sceneEdgesRef.current, screens: S.screens }) : []
        playZones = allZones()
      }
      // the zone she is in: a Zona sonora of the map wins over the scene's (not over a song playing in the temple)
      // a song a Gongo or a Jukebox of the layout started plays wherever she goes, like the temple's inside it
      const musicHere = inTemple || !!here
      const inZone = templeMusic && musicHere ? null : zoneAt(playZones, body.x, body.y - 90 * body.scale, true)
      combat.setZoneBirds(inZone?.zone.birds ?? null)
      // with the scenes' zones off (Configurações do Pátio), outside a Zona sonora there is no ambience at all
      const zone = inZone ? soundZoneOf(inZone.id, inZone.zone, zoneBlockSolo()) : musicHere ? templeMusic?.zone ?? TEMPLE_IDLE : NO_SCENE_ZONE
      combat.music.setZone(zone)
      // the music of the zone she is in switched off: its background stops at once, like a record when the
      // turntable is switched off, and the zone that would play on until the bar line stays silent
      if (zoneSwitch.off(inZone?.id ?? null, !!inZone?.zone.ambienceOn)) { cutFamily = combat.music.family; drone.set(null); stopZoneAmbience() }
      if (cutFamily && combat.music.family !== cutFamily) cutFamily = null
      // back in the zone of a song playing: the Pátio's clock follows that song's own (its bars and beats)
      if (here?.clock && combat.music.family.id === here.song.music.zone.id && Math.abs(combat.music.beat - here.clock.beat) > 1e-3) combat.music.restore(here.clock.snapshot())
      combat.setQuantize(S.quantize)
      setMusicVolumes(mixGain("notes"), mixGain("ambience"))
      if (combat.music.family !== zoneShown) { zoneShown = combat.music.family; zoneBanner = 2.5 }
      zoneBanner = Math.max(0, zoneBanner - dt)
      const templeZone = combat.music.zone.id.startsWith("templo")
      // the conductor's clock runs on frames and the sound on the audio clock: how far apart they are is kept
      // smoothed, so what is scheduled ahead lands on the audio clock without the jitter of a frame
      const clockGap = audioTime() - combat.music.time
      clockOff = clockOff === null || Math.abs(clockGap - clockOff) > 0.03 ? clockGap : clockOff + (clockGap - clockOff) * 0.02
      const clockFix = clockOff - clockGap
      events.forEach(e => {
        if (mixGain("ambience") <= 0) return
        if (e.kind === "bar" && !here?.silent) {
          // the temple keeps its drone; a zone plays the sustained voice it chose, if any (none with its music off:
          // the drone fades out)
          const z = combat.music.zone, voice = templeZone ? { tone: "saw" as const, vol: 1, oct: 0 } : z.quiet || cutFamily ? null : ambienceDrone(z.ambience ?? legacyAmbience(z.feel))
          if (voice) { const d = droneOf(z, combat.music.chord()); drone.set(d.root + 12 * voice.oct, d.fifth, d.third, voice.tone, voice.vol * (templeZone ? 1 : ZONE_MIX.drone)) }
          else drone.set(null)
        }
        // the recordings of the zone that takes over on the next bar (and of its variation blocks) load ahead
        if (e.kind === "beat") { const p = combat.music.pending; if (p) for (const z of p.blocks?.map(b => b.zone) ?? [p]) if (!z.quiet) preloadKit(ambienceKit(z.ambience ?? legacyAmbience(z.feel))) }
        if (e.kind === "step") {
          // a pause in total silence: no background
          if (templeZone) { if (!here?.silent) templeAmbience(templeMusic && combat.music.zone.id === templeMusic.zone.id ? templeMusic : null, e.n % 16, combat.music.bar, combat.music.chord(), combat.music.secondsPerBeat()) }
          // a zone's ambience is scheduled one sixteenth ahead (the Templo's own music plays on the sixteenth)
          const up = combat.music.ahead()
          // a zone about to fall quiet (its music switched off, or a quiet zone taking over) fades over the bar
          const p = combat.music.pending, fade = p?.quiet && !up.zone.quiet ? 1 - 0.8 * up.step / 16 : 1
          if (cutFamily) ambEntry.at(false, up.step)
          else if (!up.zone.id.startsWith("templo")) ambience(up.zone, up.step, up.bar, up.chord, up.spb, up.wait + clockFix, ambEntry, fade)
          else ambEntry.at(false, up.step)
        }
      })
      if (mixGain("ambience") <= 0 || here?.silent) drone.set(null)

      // ---------- sound ----------
      setWeaponVolume(mixGain("weapons"))
      combat.sounds.splice(0).forEach(e => playWeaponSound(e.kind, e.item))
      // the real songs of the souls flying free: louder the nearer the middle of the screen
      combat.songs.splice(0).forEach(e => playBirdSong(e.bird, songVolume(Math.hypot(e.x - (camX + viewW / 2), e.y - (st.height / 2 - camY)))))
      // the souls just caught go into the library: a new one says its name where it was caught, a new note or
      // weapon of one already there shows a star
      for (const n of combat.soulNews.splice(0)) {
        const got = collectSoul(n.soul)
        if (got.first || got.trait) combat.addText(n.x, n.y - 44, got.first ? got.entry.name : "★", SOUL_RARITIES[got.entry.rarity].color, 15)
      }
      // the chicks let out of a Gaiola are chicks again: each one falls from where its cage is and joins the flock
      for (const r of combat.chickReleases.splice(0)) releaseChick({ style: r.soul.chick ?? 0, x: r.x - camX, y: r.y + camY })
      // aiming in (brood with an item): a soft sound on the weapons that have one
      if (aimLock && !wasLocked) playWeaponSound("aim", combat.held?.item ?? null)
      wasLocked = aimLock

      // ---------- draw ----------
      ctx.clearRect(0, 0, stageWidth(), stageHeight())
      ctx.save()
      if (zoom !== 1) { ctx.translate(stageWidth() / 2, stageHeight() / 2); ctx.scale(zoom, zoom); ctx.translate(-stageWidth() / 2, -stageHeight() / 2) }
      // the world's things show up to the top of the screen, behind the see-through header, like the world itself
      // (viewTop only frames the camera; clipping or culling at it cut tall things in a line under the header)
      // a blow that lands jolts the world for a moment
      let jolt = swingShake(combat.swing)
      extraList.forEach(([id]) => { combat.use(id); jolt = Math.max(jolt, swingShake(combat.swing)) })
      combat.use("p1")
      const jx = jolt ? (Math.random() * 2 - 1) * jolt : 0, jy = jolt ? (Math.random() * 2 - 1) * jolt : 0
      const screenView = zoomedView(viewW, st.height, zoom)
      const view = { ...screenView, x: screenView.x + camX, y: screenView.y - camY }
      const inWorld = () => { ctx.save(); ctx.beginPath(); ctx.rect(screenView.x, screenView.y, screenView.w, screenView.h); ctx.clip(); ctx.translate(jx, camY + jy) }
      lookTargets.length = 0
      lookTargets.push({ x: body.x, y: body.y - 170 * st.scale })
      inWorld()
      drawWorld(ctx, combat, camX, view, itemGlowRef.current)
      drawMineActivators(ctx, camX, view, { blue: mineStore.params?.blue ?? "#4d9bff", red: mineStore.params?.red ?? "#ff5a5a" })
      // online, the other browsers' souls wear a ring in their browser's colour
      const netPlayers = combat.netSouls.length ? getNetState().info?.players : null
      drawFreedSouls(ctx, combat, camX, view, extraList.length ? colorsRef.current : null, netPlayers ? pid => { const p = netPlayers.find(q => q.pid === pid); return p ? PLAYER_COLORS[p.color % PLAYER_COLORS.length] : undefined } : undefined)
      drawPoops(ctx, combat, camX, view)
      drawTempleShots(ctx, temple, camX, view)
      for (const st of stages.all) drawStageFan(ctx, st, combat.noteShots, camX, combat.music.time, st.clock?.beatPhase ?? combat.music.beatPhase)
      drawNoteShots(ctx, combat.noteShots, camX, view)
      for (const st of stages.all) drawStageTalk(ctx, st, camX)
      ctx.restore()
      const ang = combat.aimAngle, adx = Math.cos(ang), ady = Math.sin(ang)
      // the luneta (Atirar held with an item that has one): it eases in and out; the camera follows it next frame
      {
        const sd = combat.def(), on = !p1Seated && scopeOn(sd, !!combat.held, fire), was = scopeK.get("p1") ?? 0
        if (on) scopeDef = sd
        const k = scopeDef ? scopeStep(was, on, scopeDef.scopeTime, dt) : 0
        if (on && !was && !aimLock) playWeaponSound("aim", combat.held?.item ?? null)
        scopeK.set("p1", k); scopeAngle = ang
        if (!k) scopeDef = null
      }
      drawSwing(ctx, combat, origin, "back", screenView)
      if (drawing.length > 1) drawDrawing(ctx, origin, drawing, combat.drawnReach(st.scale))
      // the item itself is drawn inside her rig, in front of her body and of the wing; in a swing the wing
      // turns with the blow and stretches to its reach, and the item rides on the wing tip
      const h = combat.held, sw = combat.swing
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
      const stickDistance = S.reticleDist * stickAimDepth(aim.source, aim.strength)
      const reticle = aim.target
        ? free ? reticleAtAngle(aim.target, engine.heldPoint(ang, 0, 0), muzzle, ang) : aim.target
        : { x: muzzle.x + adx * stickDistance, y: muzzle.y + ady * stickDistance }
      // (aiming through the luneta, a stick's or the keys' reticle goes farther along the aim; the mouse's stays on the cursor)
      const reach = !aim.target && scopeDef ? scopeReachAt(scopeDef, scopeK.get("p1") ?? 0) : 1
      const rx = muzzle.x + (reticle.x - muzzle.x) * reach, ry = muzzle.y + (reticle.y - muzzle.y) * reach
      const dist = aim.target ? Math.hypot(rx - muzzle.x, ry - muzzle.y) : stickDistance * reach
      // weapons whose reticle shows where the shot lands: the path a shot fired now would take
      const showPath = armed && trajectoryVisible(d.pathShow, fire, aimLock)
      const showLand = armed && trajectoryVisible(d.landShow, fire, aimLock)
      let path: { x: number; y: number }[] | null = null
      if (armed && needsTrajectory(d.reticle, showPath, showLand)) {
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
      // the luneta's lupa on a reticle: the world drawn again, magnified around it (each player's own beam)
      const lensWorld = (x: number, y: number) => ({ x: x + camX, y: y - camY })
      const lensPaint = (lv: ViewRect) => {
        ctx.translate(0, camY)
        drawWorld(ctx, combat, camX, lv, itemGlowRef.current)
        drawPoops(ctx, combat, camX, lv)
        drawNoteShots(ctx, combat.noteShots, camX, lv)
        drawBeam(ctx, combat, camX, lv)
      }
      if (!(mouseOverUi && aim.source === "mouse")) {
        const lens = scopeDef ? lensAt(scopeDef, scopeK.get("p1") ?? 0) : null
        if (lens) drawLens(ctx, rx, ry, { ...lens, r: lens.r / zoom }, lensWorld, lensPaint)
        drawVolumeRing(ctx, combat, rx, ry, tints?.p1 ?? "#ffffff")
        drawReticle(ctx, combat, muzzle, rx, ry, dist, combat.spread(body), aimLock, path, showPath, showLand, tints?.p1 ?? "#ffffff")
        ammoAt.set("p1", { x: rx, y: ry })
      }
      if (hitboxesRef.current) {
        drawHitboxes(ctx, combat, camX, camY, [["p1", engine] as const, ...extraList].map(([id, eng]) => {
          const ms = eng.getMotionState(), es = eng.getState()
          return { id, shoulder: es.shoulder, neck: eng.rigPoint("neck"), feet: { x: es.x, y: es.y }, scale: es.scale, angle: ms.angle, box: bodyBox(getChickenConfig().frames, ms.species, ms.x, ms.y, ms.scale, ms.face, poseOf(ms.state, ms.grounded, ms.angle), ms.angle) }
        }))
      }
      // the scale layer hides while a chicken is being dragged by the mouse/touch
      // each player's scale goes into standby a while after they stop playing it (the Escalas editor's numbers)
      // (sitting at a fixed instrument, its strings always show, whole and at a size she can play on: they are the
      // instrument itself, not a hint)
      if (scaleFanRef.current > 0 || p1Seated || extraList.some(([id]) => extraSeated.has(id))) {
        const fan = (id: string, x: number, y: number, angle: number) => {
          const sc = combat.scale, held = combat.held
          if (combat.seated) { drawScaleFan(ctx, combat, x, y, angle, st.scale, 1, seatedFanSize(scaleSizeRef.current), scaleFadeRef.current, scaleLinesRef.current, 1); return }
          if (!(scaleFanRef.current > 0)) return
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
      // the weapons' tambor / pente: round her shoulder (fading like the Escalas) and next to her reticle
      const drawAmmo = (id: string, eng: typeof engine) => {
        let v = ammoViews.get(id)
        if (!v) ammoViews.set(id, v = newAmmoView())
        const h = combat.held, d = combat.def(), look = h ? ammoLook(h.item, d) : null
        const at = ammoAt.get(id); ammoAt.delete(id)
        const es = eng.getState(), o = es.shoulder, sp = scaleParams().primary, reload = combat.reloading
        const around = S.ammoAround && !eng.getMotionState().held ? { x: o.x, y: o.y, scale: es.scale * AMMO_AROUND_SCALE, alpha: 1, after: sp.standbyAfter, fade: sp.fadeTime } : null
        const hud = S.ammoHud && at ? { x: at.x, y: at.y, R: AMMO_HUD_R, alpha: 1 } : null
        stepAmmoView(v, { owned: h ?? null, look, ammo: h?.ammo ?? 0, reload, draw: combat.fireCharge, wake: !!ammoWake.get(id), hud, around }, dt)
        // the instruments and the throwing items: their neon ring at the reticle (lib/pigchicken/note-hud.ts)
        let nv = noteViews.get(id)
        if (!nv) noteViews.set(id, nv = newNoteView())
        const nl = h && !look && S.ammoHud ? noteLook(h.item, d) : null
        const tone = nl?.deg ? combat.aimTone : null
        stepNoteView(nv, {
          owned: h ?? null, look: nl, ammo: h?.ammo ?? 0, reload, refill: h && d.refillTime > 0 ? (h.refill ?? 0) / d.refillTime : 0, amount: d.refillAmount,
          charge: Math.max(combat.fireCharge, combat.heavyCharge), firing: combat.firing, color: tone?.color ?? null, slap: !!tone?.slap, aim: combat.aimAngle,
          spin: combat.hookSpin, cadence: combat.cadence, away: h && nl?.style === "cards" ? combat.cards.filter(c => c.owned === h).map(c => c.rank) : [],
          out: h ? h.out ?? 0 : 0, special: h ? combat.special(h) : null, wake: !!ammoWake.get(id),
        }, dt)
        ammoWake.delete(id)
        if (around) drawAmmoAround(ctx, v, o.x, o.y, around.scale, aroundVisibility(v, sp.standbyAfter, sp.fadeTime), reload, d.shellReload)
        if (hud) drawAmmoHud(ctx, v, hud.x, hud.y, hud.R, 1, reload, d.shellReload)
        drawAmmoDrops(ctx, v)
        if (at && nl) { drawNoteHud(ctx, nv, at.x, at.y, NOTE_HUD_R); drawNoteBits(ctx, nv, at.x, at.y, NOTE_HUD_R) }
      }
      drawAmmo("p1", engine)
      if (charge > 0) { const from = engine.heldPoint(combat.throwAngle, 0, 0); drawThrowPath(ctx, combat.predictThrow({ x: from.x + camX, y: from.y - camY }, { boxes, groundY: G }).map(p => ({ x: p.x - camX, y: p.y + camY }))) }
      // a staff that comes back being charged (the Martelo de Thor): the straight line it would fly, each local player's
      const returnPath = (eng: typeof engine) => {
        const from = eng.heldPoint(combat.aimAngle, 0, 0), pts = combat.predictReturn({ x: from.x + camX, y: from.y - camY }, { boxes, groundY: G })
        if (pts) drawThrowPath(ctx, pts.map(p => ({ x: p.x - camX, y: p.y + camY })))
      }
      returnPath(engine)
      extraList.forEach(([id, eng]) => { combat.use(id); returnPath(eng) })
      combat.use("p1")
      // the Corrente-gancho in each local player's wing: the chain spinning in her hand while Atirar charges, and the
      // orange dot where the hook would latch if thrown now
      const hookAim = (eng: typeof engine) => {
        if (!combat.held || !combat.def().grapple) return
        const ms = eng.getMotionState()
        if (combat.hookSpinning) drawHookSpin(ctx, eng.rigPoint("hand"), combat.hookSpin, ms.scale, ms.face)
        const from = eng.heldPoint(combat.aimAngle, 0, 0), at = combat.predictHook({ x: from.x + camX, y: from.y - camY }, { boxes, groundY: G })
        if (at) drawHookDot(ctx, { x: at.x - camX, y: at.y + camY })
      }
      hookAim(engine)
      extraList.forEach(([id, eng]) => { combat.use(id); hookAim(eng) })
      combat.use("p1")
      // the other local players' reticles, each in their own color, where their item points
      extraList.forEach(([id, eng]) => {
        const at = extraAim.get(id)
        if (!at) return
        combat.use(id)
        const xd = combat.def(), xs = eng.getMotionState()
        const xArmed = !!combat.held
        // (each player's own luneta: their reticle reaches farther and their lupa rides on it; the camera stays the first player's)
        const xk = scopeStep(scopeK.get(id) ?? 0, !extraSeated.has(id) && scopeOn(xd, xArmed, !!extraPrev.get(id)?.fire), xd.scopeTime, dt)
        scopeK.set(id, xk)
        const xdist = S.reticleDist * at.reach * scopeReachAt(xd, xk)
        const xrx = at.muzzle.x + Math.cos(at.angle) * xdist, xry = at.muzzle.y + Math.sin(at.angle) * xdist
        const xFire = !!extraPrev.get(id)?.fire
        const xShow = xArmed && trajectoryVisible(xd.pathShow, xFire, false)
        const xLand = xArmed && trajectoryVisible(xd.landShow, xFire, false)
        let xpath: { x: number; y: number }[] | null = null
        if (xArmed && needsTrajectory(xd.reticle, xShow, xLand)) {
          const power = xd.fireMode === "charge" ? xd.chargeMin + (1 - xd.chargeMin) * combat.fireCharge : 1
          xpath = combat.predict({ x: at.muzzle.x + camX, y: at.muzzle.y - camY }, at.angle, power, { boxes, groundY: G }).points.map(p => ({ x: p.x - camX, y: p.y + camY }))
        }
        const xbody = { x: xs.x + camX, y: xs.y - camY, face: xs.face, scale: xs.scale, grounded: xs.grounded, state: bodyState(xs), vx: xs.vx, species: xs.species }
        const xLens = lensAt(xd, xk)
        if (xLens) drawLens(ctx, xrx, xry, { ...xLens, r: xLens.r / zoom }, lensWorld, lensPaint)
        drawVolumeRing(ctx, combat, xrx, xry, tints?.[id] ?? "#ffffff")
        drawReticle(ctx, combat, at.muzzle, xrx, xry, xdist, combat.spread(xbody), false, xpath, xShow, xLand, tints?.[id] ?? "#ffffff")
        ammoAt.set(id, { x: xrx, y: xry })
        drawAmmo(id, eng)
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
      // with the Grade de blocos on, the inventories and the Gaiolas go on the canvas over the characters: the faces
      // of its blocks cover everything under them
      const hudFront = !!mineStore.round, hud = hudFront ? wctx : ctx
      if (hudFront) clearFront()
      const offsets = getTouchLayout().offsets
      const drag = barDrag.current?.active ? barDrag.current : null
      arpBoxes.length = 0
      arpBoxes.push(...drawInventory(hud, combat, 0, barBottom, null, now, offsets[barBottom ? "inventoryBar" : "inventory"], drag, barLabels(controls, devicesRef.current, !barBottom), controls.inventory.align))
      cageBoxes.length = 0
      const cam = { x: camX, y: camY, zoom }
      // the first player's Gaiolas hang in the top left corner, under the header, and swing with the camera
      combat.use("p1")
      stepCageHud(cageHud, swayCamX === null || dt <= 0 ? 0 : (camX - swayCamX) / dt, dt); swayCamX = camX
      const callback = !combat.bagOfSouls.length && combat.looseSouls > 0, front = combat.bagOfSouls.length > 0 || callback
      for (const b of drawHangingCages(hud, cageHud, combat.cages, { top: viewTop, color: tints?.p1 ?? "#7bd88f", deny: combat.cageDeny, now, dt, callback, hover: cageHover?.id === "p1" ? cageHover.i : null })) cageBoxes.push({ id: "p1", ...b, on: b.i > 0 || front })
      // the other local players' are counters left of their avatars (the one in front lit), and their inventory row
      // starts left of those. With the on-screen controls (phones) the avatars and counters stay in the top right
      // corner, wherever the inventory row was moved to
      const soulsAt = showTouchRef.current ? undefined : offsets.inventory
      extraList.forEach(([id], i) => {
        combat.use(id)
        const counts = cageCounts(combat.cages), h = 24, color = tints?.[id] ?? "#7bd88f"
        const rowW = counts.reduce((n, c) => n + cageCounterWidth(c.item, h) + 3, 0)
        arpBoxes.push(...drawInventory(hud, combat, i + 1, false, tints?.[id] ?? null, now, { x: (offsets.inventory?.x ?? 0) - Math.max(0, rowW - INV_SIZE), y: offsets.inventory?.y ?? 0 }))
        const on = (counts[0]?.n ?? 0) > 0 || combat.looseSouls > 0
        const right = stageWidth() - INV_STACK.right - INV_SIZE - INV_STACK.avatarGap + (soulsAt?.x ?? 0), top = invRowY(i + 1) + (soulsAt?.y ?? 0) + (INV_SIZE - h) / 2
        for (const b of drawCageCounters(hud, counts, right, top, h, color, "right", 0)) cageBoxes.push({ id, ...b, cx: b.x + b.w / 2, cy: b.y + b.h / 2, on: b.i > 0 || on })
      })
      // the Gaiola under the pointer stopped being a button (its last soul left): the reticle comes back
      if (cageHover && !cageBoxes.some(b => b.id === cageHover!.id && b.i === cageHover!.i && b.on)) { hoverCage(null); mouseOverUi = false }
      // where the other players are: their avatar with their cages' counters, over them or, off the screen, at its
      // edge on their side. The local ones only off the screen (their counters are by their avatars)
      const tagBox = { l: 0, r: stageWidth(), t: viewTop, b: stageHeight() }
      const scx = stageWidth() / 2, scy = stageHeight() / 2
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
        if (!hudFront) clearFront()
        wctx.save()
        if (zoom !== 1) { wctx.translate(stageWidth() / 2, stageHeight() / 2); wctx.scale(zoom, zoom); wctx.translate(-stageWidth() / 2, -stageHeight() / 2) }
        fronts.forEach(([id, at]) => { combat.use(id); drawSwing(wctx, combat, at, "front", screenView) })
        // what a dropping left on a chicken, on her
        if (stained) { wctx.save(); wctx.translate(jx, camY + jy); drawPoopStains(wctx, combat, camX, view); wctx.restore() }
        wctx.restore()
        combat.use("p1")
        if (wh.open) drawWheel(wctx, combat, wh.hover, Math.min(1, (now - wh.at) / 110))
      } else if (wheelDrawn && !hudFront) {
        wheelCanvas.width = 1; wheelCanvas.height = 1
        wheelCanvas.style.display = "none"; wheelDrawn = false
      }
      // the Templo's HUD at the top, below the small inventories' rows when other local players show theirs there
      const hudTop = barBottom && !extraList.length ? INV_STACK.top : INV_TOP + INV_SIZE + 12
      drawTempleHud(ctx, temple, combat.music, inTemple && !stages.any, hudTop)
      // one panel for each song playing (the ended ones keep their banner a moment)
      let stageTop = hudTop
      for (const st of stages.all) { drawNoteStageHud(ctx, st, stageTop); if (st.active) stageTop += 66 }
      if (stageDebugRef.current) drawStageDebug(ctx, stages.all, st.height - groundHRef.current)
      if (hudRef.current) hudRef.current.style.display = S.debug ? "" : "none"
      if (hudRef.current && S.debug) {
        const h = combat.held
        const item = h ? `${d.name}${d.mag > 0 && !d.infiniteAmmo ? ` ${h.ammo}/${d.consumable ? CONSUMABLE_LIMITS[h.item] : d.mag}` : ""}${d.durability > 0 ? ` · ${h.durability} golpes` : ""}${combat.reloading ? " · recarregando" : ""}` : "mãos vazias (asa)"
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
      carryRef.current = { carry: combat.exportCarry(), zoom: viewZoom }
      resetZoneLife()
      minePlay.dispose()
      setMineActivators([])
      dropScaleStage(combat.music)
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
      window.removeEventListener("pointerdown", onFingerDown, true)
      window.removeEventListener("pointermove", onFingerMove)
      window.removeEventListener("pointermove", onScreenMove)
      window.removeEventListener("pointerup", onFingerUp, true)
      window.removeEventListener("pointercancel", onFingerUp, true)
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
      templeDraw.stages = null
      if (worldRef.current) delete worldRef.current.dataset.temple
      document.body.classList.remove("pigchicken-play", "pigchicken-bag-hover", "pigchicken-seated")
      document.body.classList.remove('pigchicken-camera-mode', 'pigchicken-camera-dragging')
      setCameraMode(false)
      if (camX || oy !== null) engine.shift(camX, oy === null ? 0 : cameraYRange(stageHeight() - groundHRef.current).lo - oy)
      engine.setGroundHeight(groundHRef.current)
      engine.setCameraZoom(1)
      extras?.current?.forEach(o => o.setCameraZoom(1))
      if (worldRef.current) { worldRef.current.style.transform = ""; worldRef.current.style.willChange = ""; setPlatformWorldOffset(worldRef.current, 0, 0) }
      moveLiveCamera(0, 0, 1)
    }
  }, [engine, worldRef, fgRef, patioKey])

  return (
    <>
      <style>{`body.pigchicken-play { cursor: none; } body.pigchicken-play.pigchicken-camera-mode { cursor: grab; } body.pigchicken-play.pigchicken-camera-dragging { cursor: grabbing; } body.pigchicken-play.pigchicken-bag-hover { cursor: pointer; } body.pigchicken-play :is(header, aside, [role="dialog"], button, input, select, textarea, a, label, summary, [data-chicken-ignore]) { cursor: auto; } body.pigchicken-play :is(button, a, select, summary, label) { cursor: pointer; } body.pigchicken-seated :is([data-touch-control="move"], [data-touch-control="run"], [data-touch-control="down"], [data-touch-control="jump"], [data-touch-control="aim"], [data-touch-control="melee"], [data-touch-control="throw"], [data-touch-control="itemWheel"]) { visibility: hidden; }`}</style>
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
        const g = invGeom(0, invGroups, !lifted, undefined, undefined, undefined, !!labels?.some(Boolean), invCur, controls?.inventory.align)
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
            style={lifted ? { left: g.x, top: invRowY(0), width: g.w, height: g.size } : { left: g.x, bottom: BAR.bottom + BAR.tab, width: g.w, height: g.size }}
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
                      barDrag.current = { from: i, to: i, after: false, x: e.clientX, y: stageY(e.clientY), x0: e.clientX, y0: stageY(e.clientY), pointer: e.pointerId, active: false }
                    }}
                    onPointerMove={e => {
                      const d = barDrag.current
                      if (!d || d.pointer !== e.pointerId) return
                      d.x = e.clientX; d.y = stageY(e.clientY)
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
          onPointerMove={e => { wheelPtr.current = { x: e.clientX, y: stageY(e.clientY) } }}
          onPointerDown={e => { e.preventDefault(); wheelPtr.current = { x: e.clientX, y: stageY(e.clientY) }; wheelTap.current = { x: e.clientX, y: stageY(e.clientY) } }}
          onContextMenu={e => e.preventDefault()}
        />
      )}
      {showTouch && engine && <TouchAimStick engine={engine} aimRef={touchAim} throwAimRef={throwAim} punchRef={punchDraw} tapRef={tapShot} jogRef={wheelJog} bottom={lifted ? 16 + STICK + 12 : STICK_BOTTOM} grabOffer={grabOffer} showStick={controls?.touchAimStick ?? false} />}
    </>
  )
}

// ---------- on-screen right stick (twin-stick): pushing aims, pushing to the edge fires, letting go inside the edge
// fires once where it pointed (Controles → Touch → Exibir analógico touch de mira; hidden, its place stays empty) ----------
const STICK = 112, KNOB = 48, STICK_BOTTOM = 64 + 112 + 24, FIRE_AT = 0.85

// what the on-screen Pegar button offers now: take the item at her feet, equip the one she already carries, sit at
// the Harpa next to her, or get up from it
type GrabOffer = "" | "take" | "equip" | "sit" | "stand"
const GRAB_LABELS: Record<Exclude<GrabOffer, "">, string> = { take: "Pegar", equip: "Equipar", sit: "Tocar", stand: "Sair" }

function TouchAimStick({ engine, aimRef, throwAimRef, punchRef, tapRef, jogRef, bottom, grabOffer, showStick }: { engine: ChickenEngine; aimRef: React.MutableRefObject<Stick | null>; throwAimRef: React.MutableRefObject<Stick | null>; punchRef: PunchDraw; tapRef: React.MutableRefObject<number>; jogRef: React.MutableRefObject<Stick | null>; bottom: number; grabOffer: GrabOffer; showStick: boolean }) {
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
  // the direction the knob last pointed during this press (any push off the middle), and a turn that a new press or
  // the release shot's end bumps, so a late frame never lets go of a newer shot
  const lastDir = useRef<{ x: number; y: number } | null>(null)
  const shotTurn = useRef(0)
  const setFire = (on: boolean) => { if (firing.current !== on) { firing.current = on; engine.setVirtual("fire", on) } }
  const move = (e: ReactPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const max = (STICK - KNOB) / 2 + 8, len = Math.hypot(dx, dy)
    if (len > max) { dx *= max / len; dy *= max / len }
    setKnob({ x: dx, y: dy })
    const mag = Math.min(1, len / max)
    if (len > 4) lastDir.current = { x: dx / len, y: dy / len }
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) press.current.far = true
    aimRef.current = mag > 0.15 ? { x: dx / (len || 1), y: dy / (len || 1), mag } : null
    setFire(mag >= FIRE_AT)
  }
  const release = (e?: ReactPointerEvent) => {
    const p = press.current
    // (the capture's loss right after the pointerup comes too: that press is over already)
    if (!p) return
    press.current = null
    const lifted = !!e && e.type === "pointerup"
    // a quick touch that did not drag is a tap: shoot the nearest enemy
    const tap = lifted && !p.far && performance.now() - p.t < 250
    if (tap) tapRef.current = performance.now()
    // let go inside the edge (it was not firing): one shot where the knob pointed, held two game frames so the combat
    // sees the press and the release, with the aim kept until then
    const dir = lastDir.current
    lastDir.current = null
    const shot = lifted && !tap && !firing.current && !!dir
    pid.current = null; setKnob({ x: 0, y: 0 }); setFire(false)
    if (!shot) { aimRef.current = null; return }
    aimRef.current = { x: dir!.x, y: dir!.y, mag: 1 }
    const t = ++shotTurn.current
    engine.setVirtual("fire", true)
    afterFrames(2, () => {
      if (shotTurn.current !== t) return
      if (!firing.current) engine.setVirtual("fire", false)
      afterFrames(2, () => { if (shotTurn.current === t && pid.current === null) aimRef.current = null })
    })
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
    <div data-chicken-ignore className="pointer-events-none fixed inset-0 z-[206] select-none" style={{ touchAction: "none" }}>
      <div className="absolute flex items-center gap-3" style={{ right: 20, bottom, height: STICK }}>
        {/* standing on an item: grab it (blue) or equip the one she already carries (grey) */}
        {(grabOffer || editing) && <Movable id="grab" className="absolute" style={{ right: 184, top: (STICK - 48) / 2 }}>{button(GRAB_LABELS[grabOffer || "take"], "grab", grabOffer === "equip" ? "border-[#9aa0a8] bg-[#9aa0a8]/20 text-white" : "border-[#4cc9f0] bg-[#4cc9f0]/20 text-white")}</Movable>}
        <div className="relative flex flex-col gap-2">
          <Movable id="melee" className="relative"><TouchPunchButton engine={engine} drawRef={punchRef} /></Movable>
          <Movable id="throw" className="relative"><TouchThrowButton engine={engine} aimRef={throwAimRef} /></Movable>
          <Movable id="itemWheel" className="relative"><TouchWheelButton engine={engine} jogRef={jogRef} /></Movable>
        </div>
        {showStick ? <Movable id="aim" className="relative">
        <div
          ref={ref}
          aria-label="Analógico de mira"
          className="pointer-events-auto relative rounded-full border-2 border-[#ffd166]/50 bg-white/10 backdrop-blur-[2px]"
          style={{ width: STICK, height: STICK, touchAction: "none" }}
          onPointerDown={e => { shotTurn.current++; lastDir.current = null; pid.current = e.pointerId; press.current = { t: performance.now(), x: e.clientX, y: e.clientY, far: false }; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
          onPointerMove={e => { if (pid.current === e.pointerId) move(e) }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div className="absolute rounded-full border-2 border-white/40" style={{ inset: (STICK - STICK * FIRE_AT) / 2 - 4, opacity: 0.35 }} />
          <div className="absolute rounded-full border-2 border-white/50 bg-white/30" style={{ width: KNOB, height: KNOB, left: (STICK - KNOB) / 2 + knob.x, top: (STICK - KNOB) / 2 + knob.y }} />
        </div>
        </Movable> : <div aria-hidden="true" style={{ width: STICK, height: STICK }} />}
      </div>
    </div>
  )
}

// ---------- on-screen Roda: held, the inventory wheel is open; dragged, it is a jog ----------
// Pressing opens the wheel (as before). Dragging the finger more than JOG_PX from the button's middle points at the
// slice in that direction, like the aim stick pushed past half; back near the middle the last slice stays. Lifting
// equips the slice pointed at and closes the wheel; the button stays held two game frames more, so a quick flick
// is still seen by the frame that picks the slice.
const JOG_PX = 14
function TouchWheelButton({ engine, jogRef }: { engine: ChickenEngine; jogRef: React.MutableRefObject<Stick | null> }) {
  const { editing } = useTouchLayout()
  const press = useRef<{ pid: number; cx: number; cy: number } | null>(null)
  const turn = useRef(0)
  const [down, setDown] = useState(false)
  const cancel = () => { press.current = null; setDown(false); turn.current++; jogRef.current = null; engine.setVirtual("itemWheel", false) }
  useEffect(() => { if (editing) cancel() }, [editing])
  useEffect(() => () => { jogRef.current = null }, [jogRef])
  const move = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p || p.pid !== e.pointerId) return
    const dx = e.clientX - p.cx, dy = e.clientY - p.cy, len = Math.hypot(dx, dy)
    if (len > JOG_PX) jogRef.current = { x: dx / len, y: dy / len, mag: 1 }
  }
  const lift = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p || p.pid !== e.pointerId) return
    press.current = null; setDown(false)
    const t = ++turn.current
    afterFrames(2, () => { if (turn.current !== t) return; engine.setVirtual("itemWheel", false); afterFrames(1, () => { if (turn.current === t) jogRef.current = null }) })
  }
  return (
    <button
      type="button"
      aria-label="Roda"
      aria-pressed={down}
      className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-[9px] uppercase text-white/80 ${down ? "border-white/70 bg-white/35" : "border-white/30 bg-white/10"}`}
      style={{ touchAction: "none" }}
      onPointerDown={e => {
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
        const r = e.currentTarget.getBoundingClientRect()
        turn.current++; jogRef.current = null
        press.current = { pid: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
        setDown(true); engine.setVirtual("itemWheel", true)
      }}
      onPointerMove={move}
      onPointerUp={lift}
      onPointerCancel={lift}
      onLostPointerCapture={lift}
      onContextMenu={e => e.preventDefault()}
    >
      Roda
    </button>
  )
}

// ---------- on-screen Punch: the Golpe acts when the finger lifts ----------
// Lifted inside the button: a tap, a blow of the combo. Dragged out of the button: the Golpe desenhado, starting where
// she aims, each turn of the finger around the button's middle turning the move around her as much (back near the
// middle, it holds); it comes out when the finger lifts, wherever it is.
type PunchDraw = React.MutableRefObject<{ turn: number | null; up: boolean } | null>
function TouchPunchButton({ engine, drawRef }: { engine: ChickenEngine; drawRef: PunchDraw }) {
  const { editing } = useTouchLayout()
  const press = useRef<{ pid: number; cx: number; cy: number; r: number; out: boolean; last: number | null; turn: number } | null>(null)
  const turn = useRef(0)
  const [down, setDown] = useState(false)
  const cancel = () => { press.current = null; setDown(false); turn.current++; drawRef.current = null }
  useEffect(() => { if (editing) cancel() }, [editing])
  useEffect(() => () => { drawRef.current = null }, [drawRef])
  const move = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p || p.pid !== e.pointerId) return
    const dx = e.clientX - p.cx, dy = e.clientY - p.cy, len = Math.hypot(dx, dy)
    if (!p.out && len > p.r) p.out = true
    if (!p.out || len <= p.r * 0.5) return
    const a = Math.atan2(dy, dx)
    if (p.last !== null) p.turn += Math.atan2(Math.sin(a - p.last), Math.cos(a - p.last))
    p.last = a
    drawRef.current = { turn: p.turn, up: false }
  }
  const lift = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p || p.pid !== e.pointerId) return
    press.current = null; setDown(false)
    if (p.out) { drawRef.current = { turn: null, up: true }; return }
    if (e.type !== "pointerup") return
    const t = ++turn.current
    // held for two frames: the combat needs one with the button down before the one that lets go
    engine.setVirtual("melee", true)
    afterFrames(2, () => { if (turn.current === t) engine.setVirtual("melee", false) })
  }
  return (
    <button
      type="button"
      aria-label="Punch"
      aria-pressed={down}
      className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-[9px] uppercase text-white/80 ${down ? "border-white/70 bg-white/35" : "border-white/30 bg-white/10"}`}
      style={{ touchAction: "none" }}
      onPointerDown={e => {
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
        const r = e.currentTarget.getBoundingClientRect()
        press.current = { pid: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2, out: false, last: null, turn: 0 }
        setDown(true)
      }}
      onPointerMove={move}
      onPointerUp={lift}
      onPointerCancel={lift}
      onLostPointerCapture={lift}
      onContextMenu={e => e.preventDefault()}
    >
      Punch
    </button>
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
// bars). It is scheduled one sixteenth ahead (music.ts ahead), `wait` seconds before the sixteenth, so every note
// lands exactly where its microtiming puts it, early or late: each drum by its own time, the bass by the groove.
// How each hit is weighed (the mix, the phrase, the layers coming in) is zone-dynamics.ts; a zone with its music
// off plays nothing. fade: the level while the bar ends before a quiet zone takes over ----------
function ambience(zone: Zone, step: number, bar: number, chord: number[], spb: number, wait: number, entry: ReturnType<typeof createAmbienceEntry>, fade = 1) {
  const a = zone.ambience ?? legacyAmbience(zone.feel), s16 = spb / 4, kit = ambienceKit(a)
  const warm = entry.at(!zone.quiet && !ambienceSilent(a), step)
  if (zone.quiet) return
  if (step % 4 === 0) preloadKit(kit)
  for (const hit of zoneHits(a, step, bar, { feel: zone.feel, warm, arranged: !!zone.arranged, kit })) playKitHit(kit, hit.drum, Math.max(0, wait + hit.shift * s16), hit.vel * fade, hit.tone)
  const notes = bassNotes(a, chord, droneOf(zone, chord).root - 24, step, bar), level = notes.length ? zoneBassLevel(step, bar, warm) * fade : 0
  if (level <= 0) return
  const late = Math.max(0, wait + grooveOf(a, zone.feel)[step] * s16)
  for (const n of notes) playBass(n.tone, n.midi, late, n.len * s16, n.vel * level)
}

export { BAR, BAR_GROUND_H, INV_STACK } from "@/components/pigchicken/draw/hud"
