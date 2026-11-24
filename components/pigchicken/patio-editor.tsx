"use client"

// The Pátio's editor mode: everyone allowed to edit this Pátio (lib/pigchicken/edit-access.ts) changes its layout
// live. A palette of every element (drag one onto the Pátio), click to select, drag the body to move, the corners
// to resize (Shift keeps the shape), and a small bar on the selected one: lock, turn (snaps to the 8 main angles),
// layers and collisions, Edit (elements with params), duplicate and delete. Ctrl+Z / Ctrl+Shift+Z undo and redo.
// The game keeps running underneath: the keyboard moves her, and a click on empty space still shoots (with
// something selected, the first click there only clears the selection).
import { StepSelect } from "@/components/ui/step-select"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { PatioRange } from "@/components/ui/patio-range"
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { ArrowDownToLine, Copy, Eye, Ghost, Layers, Lock, LockOpen, Music, PackagePlus, PanelRight, Pencil, Redo2, RotateCw, Skull, Trash2, Undo2, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PortalTargetFields } from "./portal-target-fields"
import { isFreeBlock, isSpawnPortal, rebalanceSpawnPortals, setSpawnChance, spawnChances, spawnPortalsOf } from "@/lib/pigchicken/spawn-portals"
import { cn } from "@/lib/utils"
import {
  ELEMENT_DEFS, HARD_KINDS, HORDE_BUTTONS, canHaveDepth, isMusicElement, isPowerElement, isSurfaceElement, defaultParams, HORDE_BUTTON_LABELS, LAYERS, LAYER_HINTS, LAYER_LABELS, createElement, elementBounds, elementsInWorld, layoutFloorBelow, occludesColliders,
  looseFromRack, newElementId, normalizeElement, settleLayoutInWorld, storeElementPosition, createPortalPair, elementLabel, LAYOUT_MAX_ELEMENTS, portalPartner, duplicatePortalPair, type ElementKind, type ElementParams, type HordeButton, type LayoutElement, type PatioLayout,
} from "@/lib/pigchicken/layout"
import { isFixedKind } from "@/lib/pigchicken/fixed-instruments"
import { DUMMY_HP_RANGE } from "@/lib/pigchicken/dummies"
import { TRAMPOLINE_ANGLE, TRAMPOLINE_LEVELS } from "@/lib/pigchicken/trampoline"
import { rackRespawnDelay, RACK_DELAY_STEPS, RACK_REFILL_MAX } from "@/lib/pigchicken/racks"
import { pressRules, PRESS_GAP, PRESS_LIMIT_MAX, PRESS_WINDOW_STEPS } from "@/lib/pigchicken/button-limit"
import { CAGE_IDS, CAGE_SOULS_MAX, CONSUMABLE_IDS, DEFAULT_ITEMS, INSTRUMENT_IDS, KEY_IDS, MAGIC_IDS, MINE_ITEM_IDS, SPORTS_IDS, WEAPON_IDS, isCage, loadItems, type ItemId } from "@/lib/pigchicken/items"
import { addChestItem, CHEST_GLOW, CHEST_RARITIES, defaultChest, type ChestRarity } from "@/lib/pigchicken/chests"
import { ChestFields, ItemOptGroups, LootList } from "./chest-fields"
import { ITEM_BOX, ITEM_SVG } from "@/lib/pigchicken/art"
import { depthOffset, followCamera, liveCamera, onCameraMove, screenToWorld, worldToScreen } from "@/lib/pigchicken/live-camera"
import { moveToDepth } from "@/lib/pigchicken/backdrop-layers"
import { MOUNTAINS_DEFAULT } from "@/lib/pigchicken/mountains"
import { patioClouds } from "@/lib/pigchicken/clouds"
import { BackdropPin, type BackdropScene } from "./backdrop-pin"
import { ELEMENT_DEPTH, POWER_MODELS, POWER_SAG, POWER_WIRE, POLE_MODELS, TOWER_MODELS, defaultPower, dropLinks, linkedTo, spreadPower, toggleLink, type PowerParams } from "@/lib/pigchicken/power-lines"
import { SCENE_W, WORLD_GROUND_Y, sceneAt, templeScene, worldScenes } from "@/lib/pigchicken/world"
import { ZONES } from "@/lib/pigchicken/music"
import { defaultSoundZone, moveSceneEdge, sceneZoneParams, type SceneZones, type SoundZoneParams, withSceneZone } from "@/lib/pigchicken/sound-zones"
import { LanesFields, SoundZoneFields, SurfaceRebateFields } from "./sound-zone-panels"
import { MusicZonesLayer, type ZoneResize } from "./music-zones-layer"
import { DepthLayer, ElementArt } from "./patio-layout"
import { HOUSE_STYLE_LABELS, HousePanel } from "./house-panel"
import { houseDraftSize, randomHouse, type HouseParams, type HouseStyle } from "@/lib/pigchicken/houses"
import { TREE_STYLES, randomTree, treeDraftSize, treePreset, type TreeParams } from "@/lib/pigchicken/trees"
import { CustomTreeArt } from "./tree-art"
import { TreePanel } from "./tree-panel"
import { SurfacePoints } from "./surface-points"
import { GROUND_BIOMES, SURFACE_STYLE_LABELS, WALL_STYLES, defaultSurface, surfaceStyles, type SurfaceParams } from "@/lib/pigchicken/surfaces"
import { usePatioPlacement, type PatioPlacementHandlers } from "./use-patio-placement"
import { CHALK_TEXT_MAX, DEMO_IDS, GHOST_OFFSET, GHOST_REACH, TRAINING_DEMOS, chalkboardForDemo, type ChalkboardParams, type DemoId } from "@/lib/pigchicken/chalkboard"
import { MINE_ACTIVATOR_DAMAGE, MINE_ACTIVATOR_NOTES, defaultMineActivator, type MineActivatorParams } from "@/lib/pigchicken/mine-activator"
import { GONG_FORGET, GONG_HITS, GONG_STOP_HITS, PLAYER_ACCURACY, PLAYER_HEARTS, defaultGong, defaultPlayer, type GongParams, type PlayerParams } from "@/lib/pigchicken/gong"
import { BUILDING_COLUMNS, BUILDING_LANTERNS, BUILDING_ROOFS, defaultBuilding, type BuildingParams } from "@/lib/pigchicken/buildings"
import { BalustradeArt, BuildingArt } from "./building-art"
import { EditorDock, useEditorDocked } from "./editor-dock"

const UI = "header, aside, button, input, select, textarea, a, label, [data-chicken-ignore], [role='dialog']"
const HISTORY_MAX = 80

type Draft = { kind: "house"; value: HouseParams } | { kind: "tree"; value: TreeParams }
type Change = (next: PatioLayout) => void
// sx/sy: where the press began on the screen; wx/wy: the world point under it then; x/y/shift: the pointer now
type Gesture = { kind: "move" | "resize" | "rotate"; id: string; pointer: number; sx: number; sy: number; wx: number; wy: number; x: number; y: number; shift: boolean; start: LayoutElement; corner?: [number, number]; moved: boolean }

// ---------- history: one undo step per gesture ----------
function useHistory(layout: PatioLayout, onChange: Change) {
  const undo = useRef<PatioLayout[]>([]), redo = useRef<PatioLayout[]>([])
  const gesture = useRef<string | null>(null)
  const [, bump] = useState(0)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  // `step`: a gesture id; changes with the same id after the first one join its undo step
  const commit = useCallback((next: PatioLayout, step?: string) => {
    if (!step || step !== gesture.current) {
      undo.current.push(layoutRef.current)
      if (undo.current.length > HISTORY_MAX) undo.current.shift()
      redo.current = []
      bump(n => n + 1)
    }
    gesture.current = step ?? null
    onChange(next)
  }, [onChange])
  const back = useCallback(() => {
    const prev = undo.current.pop(); if (!prev) return
    redo.current.push(layoutRef.current); gesture.current = null; bump(n => n + 1); onChange(prev)
  }, [onChange])
  const forward = useCallback(() => {
    const next = redo.current.pop(); if (!next) return
    undo.current.push(layoutRef.current); gesture.current = null; bump(n => n + 1); onChange(next)
  }, [onChange])
  return { commit, back, forward, canUndo: undo.current.length > 0, canRedo: redo.current.length > 0 }
}

const replaceEl = (layout: PatioLayout, el: LayoutElement): PatioLayout => ({ ...layout, elements: layout.elements.map(e => (e.id === el.id ? el : e)) })
const rad = (deg: number) => (deg * Math.PI) / 180
const snap45 = (deg: number) => ((Math.round(deg / 45) * 45) % 360 + 360) % 360

// soundLayer: the "Zonas sonoras" layer (shared with the header's eye), editable here
// active: the switch in the panel's title; off, the panel stays open and its cards still place elements, but the
// elements cannot be selected, moved or edited and the Pátio plays as outside the editor
export function PatioEditor({ layout, screens, onChange, onClose, onSpawnEnemy, soundLayer, onSoundLayer, layersOpen = false, onLayers, active = true, onActive, palette = true, me, signedIn = false }: { layout: PatioLayout; palette?: boolean; screens: number; onChange: Change; onClose: () => void; active?: boolean; onActive?: (on: boolean) => void; onSpawnEnemy?: (kind: 'alien' | 'zombie', x: number, y: number) => void; soundLayer: number; onSoundLayer: () => void
  // the header's Camadas panel (layer-eyes.tsx), opened from the palette too
  layersOpen?: boolean; onLayers?: () => void
  // who makes a Pátio new from a portal's Destino (the account, or this browser) and whether it may be saved/named
  me: string; signedIn?: boolean }) {
  const history = useHistory(layout, onChange)
  const { back, forward, canUndo, canRedo } = history
  // the gesture under way (move, resize, turn); the element being dragged does not fall until it is let go
  const gesture = useRef<Gesture | null>(null)
  // every change lets the elements with gravity fall onto what is under them
  const commit = useCallback((next: PatioLayout, step?: string) => {
    history.commit(settleLayoutInWorld(next, screens, gesture.current?.moved ? gesture.current.id : null), step)
  }, [history.commit, screens])
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState<"" | "layers" | "edit" | "delete">("")
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const shown = useMemo(() => elementsInWorld(layout, screens), [layout, screens])
  const sel = shown.find(e => e.id === selected) ?? null
  // the portals she may be born at; with more than one, each shows its chance in Editar
  const spawnPortals = useMemo(() => spawnPortalsOf(layout.elements), [layout])
  // with the Grade de blocos on, each of them also says whether its block starts open ("Bloco liberado")
  const gridOn = !!layout.settings?.mineGrid?.on
  const [draft, setDraft] = useState<Draft | null>(null)
  // the scene whose own zone is open in its panel (the "Zonas sonoras" layer)
  const [scenePanel, setScenePanel] = useState<number | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  // "Ligar fios" on the selected pole or tower: a click on another one of its kind wires them, or unwires them
  const [linking, setLinking] = useState(false)
  const linkingRef = useRef(linking)
  linkingRef.current = linking
  useEffect(() => { if (panel !== "edit") setLinking(false) }, [panel])

  const select = useCallback((id: string | null) => { setSelected(id); setPanel(""); setLinking(false) }, [])
  // switching the editor off lets go of the selection and its panels
  useEffect(() => { if (!active) { select(null); setScenePanel(null) } }, [active, select])
  // a deleted (or undone) element is no longer selected
  useEffect(() => { if (selected && !layout.elements.some(e => e.id === selected)) select(null) }, [layout, selected, select])

  const update = useCallback((el: LayoutElement, step?: string) => {
    const clean = normalizeElement(storeElementPosition(el, screens))
    if (!clean) return
    const cur = layoutRef.current, before = cur.elements.find(e => e.id === clean.id)
    // a pole's or tower's model and "Fios como plataforma" go to the whole line joined to it
    if (before && isPowerElement(clean.kind)) commit({ ...cur, elements: spreadPower(cur.elements, before, clean) }, step)
    else commit(replaceEl(cur, clean), step)
  }, [commit, screens])
  // a scene's own zone, saved in the Pátio's settings (null: back to the scene's own, in silence)
  const setSceneZone = useCallback((scene: number, zone: SoundZoneParams | null, step?: string) => {
    const cur = layoutRef.current
    const settings = { ...cur.settings, sceneZones: withSceneZone(cur.settings?.sceneZones, scene, zone) }
    if (!settings.sceneZones) delete settings.sceneZones
    commit({ ...cur, settings }, step)
  }, [commit])
  // the limit between two scenes' zones dragged in the "Zonas sonoras" layer
  const setSceneEdge = useCallback((scene: number, x: number, step: string) => {
    const cur = layoutRef.current, sceneEdges = moveSceneEdge(cur.settings?.sceneEdges, screens, scene, x)
    const settings = { ...cur.settings, sceneEdges }
    if (!sceneEdges) delete settings.sceneEdges
    commit({ ...cur, settings }, step)
  }, [commit, screens])
  // the sides of Zonas sonoras dragged in the layer (a shared limit moves both zones at once)
  const resizeZones = useCallback((changes: ZoneResize[], step: string) => {
    const cur = layoutRef.current
    const next = new Map(changes.map(c => [c.el.id, normalizeElement(storeElementPosition({ ...c.el, ...c.rect }, screens))]))
    commit({ ...cur, elements: cur.elements.map(e => next.get(e.id) ?? e) }, step)
  }, [commit, screens])
  const remove = useCallback((id: string) => {
    const el = layoutRef.current.elements.find(e => e.id === id)
    // the entry portal moves but stays
    if (!el || el.kind === 'entry') return
    const partner = portalPartner(el, layoutRef.current.elements)
    if (partner?.locked) return
    // a rack leaves its item where it stood, on its own (no longer coming back); deleting that item takes it away
    if (el.kind === 'rack') { commit({ ...layoutRef.current, elements: layoutRef.current.elements.map(e => (e.id === id ? looseFromRack(e) : e)) }); select(null); return }
    // a Portal de nascimento gives its chance back to the others
    const left = dropLinks(layoutRef.current.elements.filter(e => e.id !== id && e.id !== partner?.id), id)
    commit({ ...layoutRef.current, elements: el.kind === 'spawn' ? rebalanceSpawnPortals(layoutRef.current.elements, left) : left }); select(null)
  }, [commit, select])
  const append = useCallback((elements: LayoutElement[], worldPosition = true) => {
    const current = layoutRef.current
    if (current.elements.length + elements.length > LAYOUT_MAX_ELEMENTS) return false
    const added = elements.map(el => normalizeElement(worldPosition ? storeElementPosition(el, screens) : el)!)
    // a new Portal de nascimento takes an equal part of the chance of being born
    const next = [...current.elements, ...added]
    commit({ ...current, elements: added.some(isSpawnPortal) ? rebalanceSpawnPortals(current.elements, next) : next })
    select(added[0].id)
    return true
  }, [commit, screens, select])
  const duplicate = useCallback((el: LayoutElement) => {
    if (el.kind === 'entry') return
    if (el.kind === 'portal') {
      const elements = layoutRef.current.elements
      const source = elements.find(e => e.id === el.id)
      if (source) append(duplicatePortalPair(source, elements), false)
      return
    }
    const copy = { ...structuredClone(el), id: newElementId(el.kind), x: el.x + 32, y: el.y - 32, locked: false }
    // a pole's or tower's copy comes wired to the original, to go on with the line
    if (copy.params.power) copy.params.power.links = [el.id]
    append([copy])
  }, [append])
  const floorBelow = useCallback((x: number, y: number) =>
    layoutFloorBelow(elementsInWorld(layoutRef.current, screens), x, y), [screens])
  // the Baú under a screen point that still takes an item (not locked, its list not full); the last one drawn first
  const chestAt = useCallback((clientX: number, clientY: number) => {
    const p = screenToWorld(clientX, clientY), m = CHEST_DROP_MARGIN
    return elementsInWorld(layoutRef.current, screens).findLast(e => e.kind === 'chest' && !e.locked && !e.depth && !!e.params.chest && !!addChestItem(e.params.chest, 'key')
      && p.x >= e.x - m && p.x <= e.x + e.w + m && p.y >= e.y - m && p.y <= e.y + e.h + m) ?? null
  }, [screens])
  // an item of the palette let go on a Baú goes inside it, always coming out
  const insertInChest = useCallback((chest: LayoutElement, item: ItemId) => {
    const next = chest.params.chest && addChestItem(chest.params.chest, item)
    if (next) update({ ...chest, params: { ...chest.params, chest: next } })
  }, [update])
  const add = useCallback((el: LayoutElement) => {
    // "Par de portais" makes two; "Portal para outro Pátio" stands on its own
    append(el.kind === 'portal' && el.params.portalTarget === undefined ? createPortalPair(el.x + el.w / 2, el.y + el.h / 2) : [el])
  }, [append])

  const placement = usePatioPlacement((el, clientX, clientY) => {
    const point = screenToWorld(clientX, clientY)
    if (append([{ ...el, x: point.x - el.w / 2, y: point.y - el.h }]) && draft) {
      setDraft(null)
      setPanel('edit')
    }
  })
  const openDraft = (next: Draft) => {
    select(null)
    setDraft(next)
  }
  const edit = (el: LayoutElement) => {
    if (el.locked || !(el.kind === 'entry' ? spawnPortalsOf(layoutRef.current.elements).length > 1 || !!layoutRef.current.settings?.mineGrid?.on : ELEMENT_DEFS[el.kind].editable)) return
    setDraft(null)
    setSelected(el.id)
    setPanel('edit')
  }
  const randomHouseElement = (style: HouseStyle) => {
    const { house, w, h } = randomHouse(style)
    return { ...createElement('house', 0, 0, { house }), w, h }
  }

  const selectedTree = sel?.kind === "tree" ? sel.params.tree : sel?.kind === "pine" || sel?.kind === "blossom"
    ? { ...treePreset(sel.kind === "pine" ? "pine" : "plum", sel.params.seed ?? 1), flip: !!sel.params.flip, climbTrunk: sel.solid }
    : undefined

  // keyboard: Esc clears the selection, Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo and redo, Del deletes the selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (placement.cancel()) { e.preventDefault(); return }
        if (draft) { e.preventDefault(); setDraft(null); return }
      }
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      if (e.code === "Escape" && linkingRef.current) { e.preventDefault(); setLinking(false); return }
      if (e.code === "Escape" && selectedRef.current) { e.preventDefault(); select(null); return }
      if (mod && e.code === "KeyZ") { e.preventDefault(); if (e.shiftKey) forward(); else back(); return }
      if (mod && e.code === "KeyY") { e.preventDefault(); forward(); return }
      // Del deletes the selected element right away (Ctrl+Z brings it back); a focused outline point takes Del first
      if (e.code === "Delete" && !mod && !e.altKey && !e.defaultPrevented && selectedRef.current) {
        e.preventDefault()
        const el = layoutRef.current.elements.find(x => x.id === selectedRef.current)
        if (el && !el.locked) remove(el.id)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [back, forward, remove, select, placement.cancel, draft])

  // with something selected, the first click on empty space only clears the selection (it does not shoot)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!selectedRef.current) return
      const t = e.target as Element | null
      if (t?.closest?.(UI) || t?.closest?.("[data-patio-editor]")) return
      e.stopPropagation()
      select(null)
    }
    window.addEventListener("pointerdown", onDown, true)
    return () => window.removeEventListener("pointerdown", onDown, true)
  }, [select])

  // ---------- gestures on the selected element: move, resize, turn ----------
  // A locked element does not hold the click: a press, a double click or the hover on it go to the first unlocked
  // element under the pointer (behind it, or around it inside its box), the way to reach a layer behind without
  // moving the one in front. Only with nothing else there does it take the click itself (to be selected and
  // unlocked). While wiring, a locked pole or tower of the selected one's kind still takes it.
  const through = useCallback((el: LayoutElement, x: number, y: number) => {
    if (!el.locked || (linkingRef.current && el.id !== selectedRef.current && layoutRef.current.elements.find(e => e.id === selectedRef.current)?.kind === el.kind)) return el
    for (const n of document.elementsFromPoint(x, y)) {
      const id = n.getAttribute("data-patio-hit")
      if (!id || id === el.id || n.hasAttribute("data-locked")) continue
      const hit = layoutRef.current.elements.find(e => e.id === id)
      if (hit) return hit
    }
    return el
  }, [])
  const passed = useRef<Element | null>(null)
  const peek = useCallback((el: LayoutElement, e: React.PointerEvent | null) => {
    const box = e?.currentTarget as Element | undefined
    const to = e && !gesture.current ? through(el, e.clientX, e.clientY) : el
    const node = to === el ? null : document.querySelector(`[data-patio-hit="${CSS.escape(to.id)}"]`)
    if (passed.current !== node) { passed.current?.removeAttribute("data-under"); node?.setAttribute("data-under", ""); passed.current = node }
    if (box) { if (node) box.setAttribute("data-through", to.id === selectedRef.current ? "move" : "pick"); else box.removeAttribute("data-through") }
  }, [through])
  const begin = (kind: Gesture["kind"], at: LayoutElement, corner?: [number, number]) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    const el = kind === "move" ? through(at, e.clientX, e.clientY) : at
    // wiring: another pole or tower of the same kind is wired to the selected one (or unwired); a new wire moves
    // the selection to it, to go on with the line
    const from = selectedRef.current
    if (linkingRef.current && from && from !== el.id) {
      const r = toggleLink(layoutRef.current.elements, from, el.id)
      if (r) { commit({ ...layoutRef.current, elements: r.elements }); if (r.linked) setSelected(el.id) }
      return
    }
    // the first click only selects: dragging needs the element selected
    if (selectedRef.current !== el.id) { select(el.id); return }
    if (el.locked) return
    const w = screenToWorld(e.clientX, e.clientY)
    gesture.current = { kind, id: el.id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, wx: w.x, wy: w.y, x: e.clientX, y: e.clientY, shift: e.shiftKey, start: el, corner, moved: false }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  // The pointer's travel is measured in world units (the world point under it now minus the one under the press),
  // so the element stays under the pointer at any zoom, also when the zoom or the camera changes mid-drag.
  // Shift while moving keeps the travel straight: horizontal or vertical, whichever is longer.
  const drag = (g: Gesture) => {
    if (!g.moved && Math.hypot(g.x - g.sx, g.y - g.sy) < 3) return
    g.moved = true
    const s = g.start, step = `${g.kind}:${g.id}:${g.sx}:${g.sy}`
    const p = screenToWorld(g.x, g.y)
    let dx = p.x - g.wx, dy = p.y - g.wy
    if (g.kind === "move") {
      if (g.shift) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0 }
      update({ ...s, x: s.x + dx, y: s.y + dy }, step)
      return
    }
    if (g.kind === "rotate") {
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2
      update({ ...s, rot: snap45((Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90) }, step)
      return
    }
    // resize by a corner, in the element's own (turned) axes; the opposite corner stays put
    const [sx, sy] = g.corner!
    const a = rad(s.rot), c = Math.cos(a), sn = Math.sin(a)
    const lx = dx * c + dy * sn, ly = -dx * sn + dy * c
    const d = ELEMENT_DEFS[s.kind]
    let w = Math.max(d.minW, s.w + sx * lx), h = Math.max(d.minH, s.h + sy * ly)
    if (g.shift) { const k = Math.max(w / s.w, h / s.h); w = Math.max(d.minW, s.w * k); h = Math.max(d.minH, s.h * k) }
    const ox = (sx * (w - s.w)) / 2, oy = (sy * (h - s.h)) / 2
    const cx = s.x + s.w / 2 + ox * c - oy * sn, cy = s.y + s.h / 2 + ox * sn + oy * c
    update({ ...s, x: cx - w / 2, y: cy - h / 2, w, h }, step)
  }
  const onMove = (e: React.PointerEvent, g = gesture.current) => {
    if (!g || g.pointer !== e.pointerId) return
    g.x = e.clientX; g.y = e.clientY; g.shift = e.shiftKey
    drag(g)
  }
  // pressing or letting go of Shift, or a zoom / camera move, mid-drag applies at once (no pointer move needed)
  const dragRef = useRef(drag)
  dragRef.current = drag
  useEffect(() => {
    const again = () => { const g = gesture.current; if (g?.moved) dragRef.current(g) }
    const onShift = (e: KeyboardEvent) => {
      const g = gesture.current
      if (e.key !== "Shift" || !g || g.shift === (e.type === "keydown")) return
      g.shift = e.type === "keydown"; again()
    }
    window.addEventListener("keydown", onShift)
    window.addEventListener("keyup", onShift)
    const stop = onCameraMove(again)
    return () => { window.removeEventListener("keydown", onShift); window.removeEventListener("keyup", onShift); stop() }
  }, [])
  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.pointer !== e.pointerId) return
    gesture.current = null
    // Apply the release coordinates even if a fast final pointer move was coalesced.
    if (g.kind === "move" && e.type === "pointerup" && (g.moved || Math.hypot(e.clientX - g.sx, e.clientY - g.sy) >= 3)) {
      onMove(e, g)
      return
    }
    // a click on the turn handle (no drag) turns it 45°
    if (g.kind === "rotate" && !g.moved) update({ ...g.start, rot: snap45(g.start.rot + 45) })
    // let go: with gravity it falls now (in the same undo step as the drag)
    else if (g.moved) commit(layoutRef.current, `${g.kind}:${g.id}:${g.sx}:${g.sy}`)
  }

  // ---------- the overlay in world units, following the camera ----------
  // The overlay only exists while editing is on, and the panel mounts before the switch turns on: follow the
  // camera each time it appears, or its handles sit where the camera was at x = 0 (objects of another screen).
  const worldRef = useRef<HTMLDivElement>(null)
  useEffect(() => (active && worldRef.current ? followCamera(worldRef.current) : undefined), [active])
  const width = worldScenes(screens) * SCENE_W
  // what the scenery far behind shows, for pinning a Poste or Torre to one of its layers (Camadas do fundo)
  const settings = layout.settings
  const backdropScene = useMemo<BackdropScene>(() => ({
    worldW: width, mountains: settings?.mountains ?? MOUNTAINS_DEFAULT,
    clouds: patioClouds(settings?.clouds, settings?.sky?.clouds).amount > 0, forest: settings?.sky?.forest !== false,
  }), [width, settings?.mountains, settings?.clouds, settings?.sky?.clouds, settings?.sky?.forest])
  const wired = useMemo(() => linking && selected ? linkedTo(layout.elements, selected) : new Set<string>(), [linking, selected, layout.elements])

  return (
    <>
      <style>{`
        [data-patio-hit] { cursor: pointer; }
        [data-patio-hit]:hover { outline: 1px solid rgba(255,209,102,.7); outline-offset: 2px; }
        [data-patio-hit][data-sel] { outline: 2px solid #ffd166; outline-offset: 2px; cursor: move; }
        [data-patio-hit][data-sel][data-locked] { outline-color: #9aa0a8; cursor: default; }
        [data-patio-hit][data-link] { outline: 1px dashed rgba(123,223,242,.8); outline-offset: 2px; cursor: crosshair; }
        [data-patio-hit][data-locked][data-through]:not([data-sel]):hover { outline: none; }
        [data-patio-hit][data-locked][data-through="pick"] { cursor: pointer; }
        [data-patio-hit][data-locked][data-through="move"] { cursor: move; }
        [data-patio-hit][data-under]:not([data-sel]) { outline: 1px solid rgba(255,209,102,.7); outline-offset: 2px; }
        [data-patio-hit][data-link="on"] { outline: 2px solid #7bdff2; }
        .patio-corner { position: absolute; width: 28px; height: 28px; touch-action: none; display: grid; place-items: center; }
        .patio-corner span { width: 12px; height: 12px; border: 0 solid #ffd166; }
        @media (pointer: coarse) { .patio-corner { width: 44px; height: 44px; } .patio-corner span { width: 16px; height: 16px; } }
      `}</style>
      {active && <div data-patio-editor className="pointer-events-none fixed inset-0 z-[203] overflow-hidden">
        <div ref={worldRef} className="absolute left-0 top-0" style={{ width, height: WORLD_GROUND_Y }}>
          {[...shown.filter(e => isMusicElement(e.kind)), ...shown.filter(e => !isMusicElement(e.kind))].map(el => {
            const link = linking && sel && el.id !== sel.id && el.kind === sel.kind ? (wired.has(el.id) ? "on" : "can") : undefined
            const box = <HitBox key={el.id} el={el} selected={el.id === selected} link={link} begin={begin} onMove={onMove} onUp={onUp} edit={edit} through={through} peek={peek} />
            // in a parallax depth its handle slides with it
            return el.depth ? <DepthLayer key={el.id} depth={el.depth} pinned={!!el.backdrop}>{box}</DepthLayer> : box
          })}
          {sel && !sel.locked && isSurfaceElement(sel.kind) && <SurfacePoints el={sel} onChange={update} />}
          {sel && (
            <DepthLayer depth={sel.depth ?? 0} pinned={!!sel.backdrop} className="pointer-events-none absolute left-0 top-0 z-[2]"><Toolbar
              el={sel}
              panel={panel}
              setPanel={setPanel}
              onLock={() => update({ ...sel, locked: !sel.locked })}
              onGravity={() => update({ ...sel, gravity: !sel.gravity })}
              onRotate={begin("rotate", sel)}
              onMove={onMove}
              onUp={onUp}
              onDuplicate={() => duplicate(sel)}
              onDelete={() => remove(sel.id)}
              deleteBlocked={!!portalPartner(sel, layout.elements)?.locked}
              pair={!!portalPartner(sel, layout.elements)}
              editable={sel.kind === "entry" ? spawnPortals.length > 1 || gridOn : undefined}
            /></DepthLayer>
          )}
        </div>
      </div>}
      {sel && panel === "layers" && <LayersPanel el={sel} onChange={el => update(el)} onClose={() => setPanel("")} />}
      {sel && panel === "edit" && !draft && (sel.kind === 'house' && sel.params.house
        ? <HousePanel key={sel.id} house={sel.params.house} dimensions={sel} onChange={(house, step) => update({ ...sel, params: { house } }, step && `${sel.id}:${step}`)} onClose={() => setPanel("")} />
        : selectedTree
          ? <TreePanel key={sel.id} tree={selectedTree} dimensions={sel} worldX={sel.x + sel.w / 2} legacy={sel.kind === "tree" ? undefined : <ElementArt el={sel} />}
            onChange={(tree, step) => update({ ...sel, kind: "tree", params: { tree } }, step && `${sel.id}:${step}`)} onClose={() => setPanel("")} />
          : <EditPanel key={sel.id} el={sel} onChange={(el, step) => update(el, step)} onClose={() => setPanel("")} onDelete={portalPartner(sel, layout.elements)?.locked ? undefined : () => remove(sel.id)} onSpawnEnemy={onSpawnEnemy} linking={linking} onLinking={setLinking} backdropScene={backdropScene}
            portal={sel.kind === "portal" ? { hasPartner: !!portalPartner(sel, layout.elements), me, signedIn } : undefined}
            spawn={isSpawnPortal(sel) && spawnPortals.length > 1 ? {
              chance: spawnChances(spawnPortals)[spawnPortals.findIndex(p => p.id === sel.id)] ?? 0,
              onChance: v => commit({ ...layoutRef.current, elements: setSpawnChance(layoutRef.current.elements, sel.id, v) }, `spawn-chance:${sel.id}`),
            } : undefined}
            freeBlock={isSpawnPortal(sel) && gridOn ? { on: isFreeBlock(sel), last: isFreeBlock(sel) && spawnPortals.filter(isFreeBlock).length <= 1 } : undefined} />)}
      {active && soundLayer > 0 && <MusicZonesLayer elements={shown} screens={screens} sceneZones={layout.settings?.sceneZones} sceneEdges={layout.settings?.sceneEdges} sceneMusic={layout.settings?.sceneMusic !== false} editable opacity={soundLayer}
        onSceneEdge={setSceneEdge} onResizeZones={resizeZones}
        onZone={(el, zone, step) => { if (!el.locked) update({ ...el, params: { ...el.params, zone } }, step) }} onOpenZone={edit}
        onScene={setSceneZone} onSlam={setSceneZone} onOpenScene={s => { select(null); setScenePanel(s) }} />}
      {active && soundLayer > 0 && scenePanel !== null && scenePanel < worldScenes(screens) && scenePanel !== templeScene(screens) && (
        <SceneZonePanel key={scenePanel} scene={scenePanel} zones={layout.settings?.sceneZones} onChange={(zone, step) => setSceneZone(scenePanel, zone, step && `${step}:cena${scenePanel}`)}
          onReset={() => setSceneZone(scenePanel, null)} onClose={() => setScenePanel(null)} />
      )}
      {palette && <Palette active={active} onActive={onActive} onAdd={add} hidden={!!draft} draggingScenery={!!placement.ghost}
        bindHouse={house => placement.bind(() => randomHouseElement(house.style), () => openDraft({ kind: "house", value: house }))}
        bindTree={tree => placement.bind(() => {
          const next = randomTree(tree.style)
          return { ...createElement("tree", 0, 0, { tree: next.tree }), w: next.w, h: next.h }
        }, () => openDraft({ kind: "tree", value: tree }))}
        canAddScenery={layout.elements.length < LAYOUT_MAX_ELEMENTS}
        soundLayer={soundLayer > 0} onSoundLayer={onSoundLayer} layersOpen={layersOpen} onLayers={onLayers}
        floorBelow={floorBelow} chestAt={chestAt} onInsert={insertInChest} onClose={onClose} undo={back} redo={forward} canUndo={canUndo} canRedo={canRedo} />}
      {palette && draft?.kind === "house" && <HousePanel house={draft.value} onChange={value => setDraft({ kind: "house", value })} onClose={() => setDraft(null)} dragging={!!placement.ghost}
        previewDrag={placement.bind(() => ({ ...createElement('house', 0, 0, { house: draft.value }), ...houseDraftSize(draft.value) }))} />}
      {palette && draft?.kind === "tree" && <TreePanel tree={draft.value} onChange={value => setDraft({ kind: "tree", value })} onClose={() => setDraft(null)} dragging={!!placement.ghost}
        previewDrag={placement.bind(() => ({ ...createElement('tree', 0, 0, { tree: draft.value }), ...treeDraftSize(draft.value) }))} />}
      {placement.ghost && <div ref={placement.ghostRef} aria-hidden="true" className="pointer-events-none fixed z-[260] opacity-75"
        style={{ left: -placement.ghost.w / 2, top: -placement.ghost.h, width: placement.ghost.w, height: placement.ghost.h }}>
        <ElementArt el={placement.ghost} />
      </div>}
    </>
  )
}

// one element's hit area (turned like it) with its corners when selected
const HitBox = memo(function HitBox({ el, selected, link, begin, onMove, onUp, edit, through, peek }: {
  el: LayoutElement; selected: boolean; link?: "on" | "can"
  begin: (kind: Gesture["kind"], el: LayoutElement, corner?: [number, number]) => (e: React.PointerEvent) => void
  onMove: (e: React.PointerEvent) => void; onUp: (e: React.PointerEvent) => void; edit: (el: LayoutElement) => void
  through: (el: LayoutElement, x: number, y: number) => LayoutElement; peek: (el: LayoutElement, e: React.PointerEvent | null) => void
}) {
  const d = ELEMENT_DEFS[el.kind]
  return (
    <div
      data-chicken-ignore
      data-patio-hit={el.id}
      data-sel={selected || undefined}
      data-locked={el.locked || undefined}
      data-link={link}
      aria-label={elementLabel(el)}
      className={cn("pointer-events-auto absolute touch-none", (el.kind === "portal" || el.kind === "entry" || el.kind === "spawn") && "z-[1]")}
      style={{ left: el.x, top: el.y, width: el.w, height: el.h, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}
      onPointerDown={begin("move", el)}
      onPointerMove={e => { onMove(e); if (el.locked) peek(el, e) }}
      onPointerLeave={() => peek(el, null)}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={e => { e.stopPropagation(); edit(through(el, e.clientX, e.clientY)) }}
      onContextMenu={e => e.preventDefault()}
    >
      {selected && !el.locked && d.resizable && ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([sx, sy]) => (
        <div
          key={`${sx}${sy}`}
          className="patio-corner"
          style={{ left: sx < 0 ? -14 : undefined, right: sx > 0 ? -14 : undefined, top: sy < 0 ? -14 : undefined, bottom: sy > 0 ? -14 : undefined, cursor: sx * sy > 0 ? "nwse-resize" : "nesw-resize" }}
          onPointerDown={begin("resize", el, [sx, sy])}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span style={{ [sy < 0 ? "borderTopWidth" : "borderBottomWidth"]: 3, [sx < 0 ? "borderLeftWidth" : "borderRightWidth"]: 3 } as React.CSSProperties} />
        </div>
      ))}
    </div>
  )
})

const TOOL = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-[#101713]/95 text-[#dfe8df] transition-colors hover:border-primary hover:text-white disabled:opacity-40"

// the selected element's bar, over its top-right corner
function Toolbar({ el, panel, setPanel, onLock, onGravity, onRotate, onMove, onUp, onDuplicate, onDelete, deleteBlocked, pair, editable }: {
  el: LayoutElement; panel: string; setPanel: (p: "" | "layers" | "edit" | "delete") => void
  onLock: () => void; onGravity: () => void; onRotate: (e: React.PointerEvent) => void; onMove: (e: React.PointerEvent) => void; onUp: (e: React.PointerEvent) => void
  onDuplicate: () => void; onDelete: () => void
  deleteBlocked: boolean; pair: boolean
  // the entry portal has something to edit only while the Pátio has Portais de nascimento (its chance)
  editable?: boolean
}) {
  const d = ELEMENT_DEFS[el.kind]
  const b = elementBounds(el)
  // kept on the screen side of the element when it is near the world's top
  const top = Math.max(b.y - 46, -2990)
  return (
    <div data-chicken-ignore className="pointer-events-auto absolute z-[2] flex items-center gap-1 font-mono text-[11px]" style={{ left: b.x + b.w, top, transform: "translateX(-100%)" }} onPointerDown={e => e.stopPropagation()}>
      <span className="mr-1 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-white/80">{elementLabel(el)}</span>
      <button type="button" className={cn(TOOL, el.locked && "border-amber-300 text-amber-300")} title={el.locked ? "Destrancar" : "Trancar (bloqueia mover, redimensionar, girar e apagar)"} aria-label={el.locked ? "Destrancar" : "Trancar"} aria-pressed={el.locked} onClick={onLock}>
        {el.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
      </button>
      {!el.locked && (
        <>
          <button type="button" className={cn(TOOL, el.gravity && "border-sky-300 text-sky-300")} title={el.gravity ? "Gravidade ligada: cai até se apoiar em algo (clique para desligar)" : "Gravidade: cai até se apoiar em algo"} aria-label="Gravidade" aria-pressed={!!el.gravity} onClick={onGravity}>
            <ArrowDownToLine className="h-4 w-4" />
          </button>
          {d.rotatable && (
            <button type="button" className={cn(TOOL, "touch-none")} title="Girar: arraste (encaixa a cada 45°) ou clique para girar 45°" aria-label="Girar" onPointerDown={onRotate} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <RotateCw className="h-4 w-4" />
            </button>
          )}
          {!d.entity && (
            <button type="button" className={cn(TOOL, panel === "layers" && "border-primary text-white")} title="Camada e colisões" aria-label="Camada e colisões" aria-pressed={panel === "layers"} onClick={() => setPanel(panel === "layers" ? "" : "layers")}>
              <Layers className="h-4 w-4" />
            </button>
          )}
          {(editable ?? d.editable) && (
            <button type="button" className={cn(TOOL, panel === "edit" && "border-primary text-white")} title="Editar parâmetros" aria-label="Editar" aria-pressed={panel === "edit"} onClick={() => setPanel(panel === "edit" ? "" : "edit")}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {el.kind === "entry" ? (
            <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-white/60">Pode mover; não apaga</span>
          ) : <>
          <button type="button" className={TOOL} title="Duplicar" aria-label="Duplicar" onClick={onDuplicate}><Copy className="h-4 w-4" /></button>
          <div className="relative">
            <button
              type="button"
              className={cn(TOOL, "hover:border-red-400 hover:text-red-300", panel === "delete" && "border-red-400 text-red-300")}
              title={deleteBlocked ? "Destranque o outro portal para apagar o par" : "Apagar (Del ou clique duplo apagam sem confirmar)"}
              disabled={deleteBlocked}
              aria-label="Apagar"
              onClick={() => setPanel(panel === "delete" ? "" : "delete")}
              onDoubleClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {panel === "delete" && (
              <div role="dialog" aria-label="Confirmar" className="absolute right-0 top-10 flex items-center gap-2 whitespace-nowrap rounded-lg border border-red-400/60 bg-[#101713] px-3 py-2 text-white shadow-lg">
                <span>{pair ? 'Apagar os dois portais do par?' : 'Apagar?'}</span>
                <button type="button" className="h-7 rounded-md border border-red-400 bg-red-500/80 px-2 font-bold" onClick={onDelete}>Apagar</button>
                <button type="button" className="h-7 rounded-md border border-white/20 px-2" onClick={() => setPanel("")}>Não</button>
              </div>
            )}
          </div>
          </>}
        </>
      )}
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3" title={hint}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
    </label>
  )
}

// the parallax depth: 0 moves with the ground, near 95% stays almost still on the screen. Changing it keeps the
// element where it is on the screen now (its stored x and y are a layer's, at the camera's 0)
function DepthField({ el, onChange }: { el: LayoutElement; onChange: (el: LayoutElement) => void }) {
  const d = el.depth ?? 0
  // a plain depth (pinned to a backdrop layer, it lets go of it)
  const setDepth = (next: number) => {
    const moved = moveToDepth(el, { depth: next }, depthOffset)
    onChange(next > 0 ? { ...moved, solid: false, shots: false, notes: false } : moved)
  }
  return <PatioRange label="Profundidade" min={ELEMENT_DEPTH.min * 100} max={ELEMENT_DEPTH.max * 100} step={ELEMENT_DEPTH.step * 100} value={Math.round(d * 100)}
    display={d ? `${Math.round(d * 100)}%` : "No chão"} changed={d > 0} onChange={v => setDepth(v / 100)} onReset={() => setDepth(0)}
    hint="Parallax: quanto mais fundo, mais devagar ele passa quando a câmera anda. 0 anda junto com o chão." />
}

// a Poste's or Torre's model, line and wires
function PowerFields({ el, power, onChange, linking = false, onLinking, backdropScene }: { el: LayoutElement; power: PowerParams; onChange: (el: LayoutElement, step?: string) => void; linking?: boolean; onLinking?: (on: boolean) => void; backdropScene?: BackdropScene }) {
  const kind = el.kind as "pole" | "tower"
  const set = (p: Partial<PowerParams>, step?: string) => onChange({ ...el, params: { ...el.params, power: { ...power, ...p } } }, step)
  const models = kind === "pole" ? POLE_MODELS : TOWER_MODELS
  return <>
    <label className="grid gap-1">
      <span>Modelo</span>
      <StepSelect aria-label="Modelo" value={power.model} onChange={e => {
        const m = POWER_MODELS[e.target.value]
        // keeps its height and stands on the same base, in the new model's proportions
        const w = Math.round(el.h * m.w / m.h)
        onChange({ ...el, x: el.x + (el.w - w) / 2, w, params: { ...el.params, power: { ...power, model: m.id } } })
      }} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
        {models.map(id => <option key={id} value={id}>{POWER_MODELS[id].label}</option>)}
      </StepSelect>
    </label>
    {onLinking && <button type="button" aria-pressed={linking} onClick={() => onLinking(!linking)}
      title={`Clique em ${kind === "pole" ? "outro poste" : "outra torre"} para ligar os fios, ou desligar se já estiverem ligados. A seleção passa para ${kind === "pole" ? "o ligado" : "a ligada"}, para seguir a linha. Esc termina.`}
      className={cn("h-9 shrink-0 rounded-md border", linking ? "border-[#7bdff2] bg-[#7bdff2]/15 text-white" : "border-white/15 hover:border-white/40")}>Ligar fios</button>}
    <div className="grid gap-field">
      <PatioRange label="Caimento dos fios" min={POWER_SAG.min} max={POWER_SAG.max} step={POWER_SAG.step} value={power.sag} display={`${power.sag}%`}
        changed={power.sag !== POWER_SAG.default} onReset={() => set({ sag: POWER_SAG.default })} onChange={sag => set({ sag }, `sag:${el.id}`)} />
      <PatioRange label="Espessura dos fios" min={POWER_WIRE.min} max={POWER_WIRE.max} step={POWER_WIRE.step} value={power.wire} display={`${power.wire} px`}
        changed={power.wire !== POWER_WIRE.default} onReset={() => set({ wire: POWER_WIRE.default })} onChange={wire => set({ wire }, `wire:${el.id}`)} />
      <DepthField el={el} onChange={next => onChange(next)} />
    </div>
    {backdropScene && <BackdropPin el={el} scene={backdropScene} onChange={next => onChange(next)} />}
    <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title="A galinha pode pousar e andar nos fios, como numa plataforma de mão única. Só vale para os fios no plano do chão (sem Profundidade). Muda a linha inteira.">
      <span>Fios como plataforma</span>
      <input type="checkbox" checked={power.floor} onChange={e => set({ floor: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
    </label>
    <p className="text-[#93a79a]">Trocar o modelo troca o de {kind === "pole" ? "todos os postes ligados" : "todas as torres ligadas"} a {kind === "pole" ? "este" : "esta"}. Os pássaros pousam nos fios.</p>
  </>
}

// the layer dropdown and the collisions
function LayersPanel({ el, onChange, onClose }: { el: LayoutElement; onChange: (el: LayoutElement) => void; onClose: () => void }) {
  return (
    <FloatingPanel id="patio-layers" overDock aria-label="Camada e colisões" initial={vw => ({ x: Math.max(12, vw - 312), y: 64, w: 300, h: 470 })} minW={240} minH={200} bodyClassName="gap-field p-4" className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="mb-2.5 flex shrink-0 items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Camada · {elementLabel(el)}</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div role="radiogroup" aria-label="Camada" className="grid gap-field">
        {[...LAYERS].reverse().map(l => (
          <label key={l} title={LAYER_HINTS[l]} className={cn("flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5", el.layer === l ? "border-primary bg-primary/10 text-white" : "border-white/10 hover:border-white/30")}>
            <input type="radio" name="patio-layer" checked={el.layer === l} onChange={() => onChange({ ...el, layer: l })} className="mt-0.5 accent-[var(--primary)]" />
            <span>{LAYER_LABELS[l]}</span>
          </label>
        ))}
      </div>
      {canHaveDepth(el.kind) && <DepthField el={el} onChange={onChange} />}
      {el.depth ? <div className="grid gap-field border-t border-white/10 pt-3">
        <p className="text-[#93a79a]">Na profundidade ele é só cenário: sem colisões.</p>
        <Toggle label="Invisível no jogo" hint="Só aparece no modo editor" checked={el.hidden} onChange={v => onChange({ ...el, hidden: v })} />
        <PatioRange label="Opacidade" min={10} max={100} step={5} value={Math.round(el.opacity * 100)}
          display={`${Math.round(el.opacity * 100)}%`} onChange={v => onChange({ ...el, opacity: v / 100 })} />
      </div> : isMusicElement(el.kind) ? <p className="border-t border-white/10 pt-3 text-[#93a79a]">{el.kind === "zone" ? "A zona é invisível no jogo e não tem colisões." : "As faixas não têm colisões: só mudam as notas que passam por elas."}</p> : <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-field border-t border-white/10 pt-3">
        {el.kind === 'house'
          ? <p className="text-[#93a79a]">Base, telhado, peitoris e vergas são pisos de mão única. A galinha pode saltar através da fachada.</p>
          : el.kind === 'tree' ? <p className="text-[#93a79a]">Configure os apoios no Editor de árvores.</p>
          : el.kind === 'trampoline' ? <p className="text-[#93a79a]">O tampo impulsiona a galinha ao pousar.</p>
          : <Toggle label="Pisar (sólido)" hint="A galinha fica em cima e bate dos lados" checked={el.solid} onChange={v => onChange({ ...el, solid: v })} />}
        {HARD_KINDS.includes(el.kind) && el.solid && <Toggle label="Objeto duro" hint="Os bonecos não atravessam: não sobem por baixo, não passam pelos lados e não descem através dele."
          checked={!!el.hard} onChange={v => onChange({ ...el, hard: v })} />}
        <Toggle label="Ocultar colisores atrás" hint="Em objetos opacos, recorta pisos e paredes cobertos pela fachada ou pela caixa do objeto."
          checked={occludesColliders(el)} onChange={v => onChange({ ...el, occludesColliders: v })} />
        <Toggle label="Bloqueia tiros" hint="Balas, granadas e o feixe param nele" checked={el.shots} onChange={v => onChange({ ...el, shots: v })} />
        <Toggle label="Bloqueia notas" hint="As notas dos instrumentos param nele" checked={el.notes} onChange={v => onChange({ ...el, notes: v })} />
        <SurfaceRebateFields rebate={el.rebate} onChange={rebate => { const { rebate: _old, ...rest } = el; onChange(rebate ? { ...rest, rebate } : rest) }} />
        <Toggle label="Invisível no jogo" hint="Só aparece no modo editor" checked={el.hidden} onChange={v => onChange({ ...el, hidden: v })} />
        <PatioRange label="Opacidade" min={10} max={100} step={5} value={Math.round(el.opacity * 100)}
          display={`${Math.round(el.opacity * 100)}%`} onChange={v => onChange({ ...el, opacity: v / 100 })} />
      </div>}
    </FloatingPanel>
  )
}

// the Edit panel for elements that do not have their own customizer
function EditPanel({ el, onChange, onClose, onDelete, onSpawnEnemy, linking, onLinking, portal, spawn, freeBlock, backdropScene }: { spawn?: { chance: number; onChance: (value: number) => void }; freeBlock?: { on: boolean; last: boolean }; el: LayoutElement; onChange: (el: LayoutElement, step?: string) => void; onClose: () => void; onDelete?: () => void; onSpawnEnemy?: (kind: 'alien' | 'zombie', x: number, y: number) => void; linking?: boolean; onLinking?: (on: boolean) => void; portal?: { hasPartner: boolean; me: string; signedIn: boolean }; backdropScene?: BackdropScene }) {
  const set = (p: ElementParams, step?: string) => onChange({ ...el, params: { ...el.params, ...p } }, step)
  const [msg, setMsg] = useState(el.params.message ?? "")
  const editSession = useId()
  const sliderGesture = useRef(0)
  const endSlider = () => { sliderGesture.current++ }
  const bounce = el.params.trampoline
  return (
    <FloatingPanel id="patio-edit" overDock aria-label="Editar elemento" initial={vw => ({ x: Math.max(12, vw - 352), y: 64, w: 340, h: 380 })} minW={260} minH={200} bodyClassName="gap-field p-4" className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="mb-2.5 flex shrink-0 items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Editar · {elementLabel(el)}</h2>
        {onDelete && el.kind !== "entry" && !el.locked && <button type="button" aria-label="Excluir" title="Excluir (Del)" onClick={onDelete} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>}
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      {el.kind === "dummy" && (
        <>
          <section className="grid gap-2">
            <h3 className="text-[10px] uppercase tracking-wider text-[#93a79a]">Alvo de treino</h3>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onSpawnEnemy?.('alien', el.x + el.w / 2, el.y + el.h)} className="flex h-9 items-center justify-center gap-2 rounded-md border border-white/15 bg-[#0b110e] hover:border-primary hover:text-white"><Ghost className="h-4 w-4" />Alien aleatório</button>
              <button type="button" onClick={() => onSpawnEnemy?.('zombie', el.x + el.w / 2, el.y + el.h)} className="flex h-9 items-center justify-center gap-2 rounded-md border border-white/15 bg-[#0b110e] hover:border-primary hover:text-white"><Skull className="h-4 w-4" />Zumbi aleatório</button>
            </div>
            <p className="text-[10px] text-[#93a79a]">Cada botão cria um inimigo com raça sorteada ao lado deste alvo.</p>
          </section>
          <label className="grid gap-1">
            <span>Mensagem ao ser destruído</span>
            <textarea
              value={msg}
              maxLength={280}
              rows={4}
              onChange={e => { setMsg(e.target.value); set({ message: e.target.value }, `msg:${el.id}`) }}
              placeholder="Uma dica para quem destruir este alvo"
              className="resize-y rounded-md border border-white/15 bg-[#0b110e] p-2 text-[#dfe8df] outline-none focus:border-primary"
            />
            <span className="text-right text-[10px] text-[#93a79a]">{msg.length}/280</span>
          </label>
          <PatioRange label="Vida total" min={DUMMY_HP_RANGE.min} max={DUMMY_HP_RANGE.max} step={10} value={el.params.maxHp ?? 100}
            onChange={v => set({ maxHp: v }, `hp:${el.id}`)} />
        </>
      )}
      {spawn && <PatioRange label="Chance de nascer aqui" min={0} max={100} value={spawn.chance} display={`${spawn.chance}%`}
        hint="A soma das chances de todos os portais de nascimento é sempre 100%: mexer nesta redistribui a diferença entre os outros." onChange={spawn.onChance} />}
      {freeBlock && <label className="flex h-10 items-center justify-between gap-3 rounded-md bg-[#22302a] px-3" title={freeBlock.last ? "Pelo menos um portal precisa ter o bloco liberado." : "O bloco onde este portal está nunca tem bomba, começa aberto e não fecha de novo: quem nasce aqui começa do lado aberto."}>
        <span>Bloco liberado</span>
        <input type="checkbox" checked={freeBlock.on} disabled={freeBlock.last} onChange={e => set({ freeBlock: e.target.checked })} className="h-5 w-5 accent-[var(--primary)] disabled:opacity-40" />
      </label>}
      {el.kind === "portal" && <>
        {portal?.hasPartner && el.params.portalTarget === undefined && <p className="text-[#93a79a]">Este portal leva ao outro portal do mesmo par. Mova cada um separadamente. Duplicar ou apagar afeta o par inteiro.</p>}
        {portal && <PortalTargetFields el={el} hasPartner={portal.hasPartner} me={portal.me} signedIn={portal.signedIn} onChange={set} />}
        <label className="grid gap-1">
          <span>Texto da instrução / confirmação</span>
          <input aria-label="Texto do portal" maxLength={100} value={el.params.portalLabel ?? ''} onChange={e => set({ portalLabel: e.target.value }, `portal-label:${el.id}`)} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2" />
        </label>
        <label className="grid gap-1">
          <span>Mostrar instrução</span>
          <StepSelect aria-label="Visibilidade da instrução do portal" value={el.params.portalInstruction ?? 'hover'} onChange={e => set({ portalInstruction: e.target.value as 'always' | 'hover' })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            <option value="hover">Ao encostar ou passar o ponteiro</option>
            <option value="always">Sempre visível</option>
          </StepSelect>
        </label>
      </>}
      {el.kind === "trampoline" && bounce && <>
        <div className="grid h-24 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0b110e]" aria-label="Prévia do trampolim">
          <div className="relative h-12 w-48"><ElementArt el={el} /></div>
        </div>
        <div className="grid gap-field">
        <PatioRange label="Força do impulso" min={1} max={TRAMPOLINE_LEVELS.length} value={bounce.strength}
          display={`Nível ${bounce.strength}`} onEnd={endSlider}
          onChange={strength => set({ trampoline: { ...bounce, strength } }, `bounce-strength:${editSession}:${sliderGesture.current}`)} />
        <PatioRange label="Direção do impulso" min={-TRAMPOLINE_ANGLE} max={TRAMPOLINE_ANGLE} value={bounce.angle}
          display={bounce.angle === 0 ? "Vertical" : `${Math.abs(bounce.angle)}° ${bounce.angle < 0 ? "←" : "→"}`} onEnd={endSlider}
          onChange={angle => set({ trampoline: { ...bounce, angle } }, `bounce-angle:${editSession}:${sliderGesture.current}`)} />
        </div>
        <p className="text-[#93a79a]">Pouse por cima para quicar. Segure Agachar ou Chocar para atravessar.</p>
      </>}
      {el.kind === "loose" && (
        <label className="grid gap-1">
          <span>Item</span>
          <StepSelect aria-label="Item solto" value={el.params.item} onChange={e => set({ item: e.target.value as ItemId })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            <ItemOptGroups />
          </StepSelect>
        </label>
      )}
      {el.kind === "rack" && <>
        <label className="grid gap-1">
          <span>Item do suporte</span>
          <StepSelect aria-label="Item do suporte" value={el.params.item} onChange={e => { const item = e.target.value as ItemId; set({ item, respawnDelay: rackRespawnDelay(item) }) }} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            <ItemOptGroups />
          </StepSelect>
        </label>
        {(() => {
          const delay = el.params.respawnDelay ?? rackRespawnDelay(el.params.item ?? 'pistol')
          const at = RACK_DELAY_STEPS.reduce((best, v, i) => Math.abs(v - delay) < Math.abs(RACK_DELAY_STEPS[best] - delay) ? i : best, 0)
          const limit = el.params.refillLimit
          return <>
            <PatioRange label="Tempo de reposição" min={0} max={RACK_DELAY_STEPS.length - 1} value={at}
              display={delay >= 60 ? `${(delay / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min` : `${delay.toLocaleString("pt-BR")} s`} onEnd={endSlider}
              hint="Espera após pegar o item. Consumíveis: 0,1 s por padrão; armas e instrumentos: 2 s. Zero repõe imediatamente."
              onChange={i => set({ respawnDelay: RACK_DELAY_STEPS[i] }, `rack-delay:${editSession}:${sliderGesture.current}`)} />
            <PatioRange label="Limite de reposição" min={0} max={RACK_REFILL_MAX + 1} value={limit ?? RACK_REFILL_MAX + 1}
              display={limit === undefined ? "∞" : limit} onEnd={endSlider}
              hint="Quantas vezes o suporte repõe o item depois do primeiro. No fim da barra: sem limite."
              onChange={v => set({ refillLimit: v > RACK_REFILL_MAX ? undefined : v }, `rack-refill:${editSession}:${sliderGesture.current}`)} />
          </>
        })()}
      </>}
      {(el.kind === "rack" || el.kind === "loose") && el.params.item && isCage(el.params.item) && (
        <label className="grid gap-1" title="Quantas almas cabem nesta gaiola. Vazio: o limite do modelo (painel Itens).">
          <span>Limite de almas</span>
          <input aria-label="Limite de almas da gaiola" type="number" min={1} max={CAGE_SOULS_MAX} step={1} placeholder={String(loadItems()[el.params.item].cageSouls)} value={el.params.cageSouls ?? ""} onChange={e => set({ cageSouls: e.target.value === "" ? undefined : Math.max(1, Math.min(CAGE_SOULS_MAX, Math.round(Number(e.target.value)))) }, `cage-souls:${el.id}`)} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2" />
        </label>
      )}
      {isPowerElement(el.kind) && el.params.power && <PowerFields el={el} power={el.params.power} onChange={onChange} linking={linking} onLinking={onLinking} backdropScene={backdropScene} />}
      {isSurfaceElement(el.kind) && el.params.surface && <SurfaceFields el={el} surface={el.params.surface} onChange={surface => set({ surface })} />}
      {el.kind === "zone" && el.params.zone && <SoundZoneFields zone={el.params.zone} onChange={(zone, step) => set({ zone }, step && `${step}:${el.id}`)} />}
      {el.kind === "lanes" && el.params.lanes && <LanesFields lanes={el.params.lanes} w={el.w} h={el.h} onChange={(lanes, step) => set({ lanes }, step && `${step}:${el.id}`)} />}
      {el.kind === "chalkboard" && el.params.chalkboard && <ChalkboardFields board={el.params.chalkboard} onChange={(chalkboard, step) => set({ chalkboard }, step && `${step}:${el.id}`)} />}
      {el.kind === "chest" && el.params.chest && <ChestFields chest={el.params.chest} onChange={(chest, step) => set({ chest }, step && `${step}:${el.id}`)} />}
      {isFixedKind(el.kind) && (
        <label className="flex items-center justify-between gap-3" title="Desligado: quem toca senta à esquerda do instrumento, olhando para a direita">
          <span>Virar para o outro lado</span>
          <input type="checkbox" checked={!!el.params.flip} onChange={e => set({ flip: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
        </label>
      )}
      {el.kind === "mineactivator" && <MineActivatorFields activator={el.params.mineActivator ?? defaultMineActivator()} onChange={(mineActivator, step) => set({ mineActivator }, step && `${step}:${el.id}`)} />}
      {el.kind === "gong" && el.params.gong && <GongFields gong={el.params.gong} onChange={(gong, step) => set({ gong }, step && `${step}:${el.id}`)} />}
      {(el.kind === "jukebox" || el.kind === "vitrola") && <PlayerFields player={el.params.player ?? defaultPlayer()} onChange={(player, step) => set({ player }, step && `${step}:${el.id}`)} />}
      {el.kind === "building" && el.params.building && <BuildingFields building={el.params.building} onChange={(building, step) => set({ building }, step && `${step}:${el.id}`)} />}
      {el.kind === "balustrade" && el.params.balustrade && (
        <label className="flex items-center justify-between gap-3" title="O piso de pedra do pátio, embaixo do muro">
          <span>Piso de pedra</span>
          <input type="checkbox" checked={el.params.balustrade.courtyard} onChange={e => set({ balustrade: { courtyard: e.target.checked } })} className="h-5 w-5 accent-[var(--primary)]" />
        </label>
      )}
      {el.kind === "button" && (
        <label className="grid gap-1">
          <span>Ação ao acertar</span>
          <StepSelect value={el.params.action} onChange={e => set({ action: e.target.value as (typeof HORDE_BUTTONS)[number] })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            {HORDE_BUTTONS.map(id => <option key={id} value={id}>{HORDE_BUTTON_LABELS[id]}</option>)}
          </StepSelect>
        </label>
      )}
      {el.kind === "button" && el.params.action === "aliens" && (() => {
        // how often it can be pressed (lib/pigchicken/button-limit.ts); double click: the default
        const rules = pressRules(el.params)
        const at = PRESS_WINDOW_STEPS.reduce((best, v, i) => Math.abs(v - rules.window) < Math.abs(PRESS_WINDOW_STEPS[best] - rules.window) ? i : best, 0)
        return <>
          <PatioRange label="Limite de apertos" min={1} max={PRESS_LIMIT_MAX + 1} value={rules.limit || PRESS_LIMIT_MAX + 1}
            display={rules.limit || "∞"} onEnd={endSlider} onReset={() => set({ pressLimit: undefined })}
            hint="Quantas vezes o botão pode ser apertado dentro do tempo abaixo. Atingido o limite, ele fica cinza até poder de novo. No fim da barra: sem limite."
            onChange={v => set({ pressLimit: v > PRESS_LIMIT_MAX ? 0 : v }, `press-limit:${editSession}:${sliderGesture.current}`)} />
          <PatioRange label="A cada" min={0} max={PRESS_WINDOW_STEPS.length - 1} value={at}
            display={rules.window >= 60 ? `${(rules.window / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min` : `${rules.window} s`}
            dimmed={!rules.limit} onEnd={endSlider} onReset={() => set({ pressWindow: undefined })}
            onChange={i => set({ pressWindow: PRESS_WINDOW_STEPS[i] }, `press-window:${editSession}:${sliderGesture.current}`)} />
          <PatioRange label="Intervalo mínimo" min={PRESS_GAP.min * 10} max={PRESS_GAP.max * 10} value={Math.round(rules.gap * 10)}
            display={`${rules.gap.toLocaleString("pt-BR")} s`} onEnd={endSlider} onReset={() => set({ pressGap: undefined })}
            hint="Tempo entre um aperto e o próximo; o botão fica cinza nesse intervalo."
            onChange={v => set({ pressGap: v / 10 }, `press-gap:${editSession}:${sliderGesture.current}`)} />
        </>
      })()}

    </FloatingPanel>
  )
}

// a Quadro de lousa: its text (in chalk) and the move its ghost does while a player is near
function ChalkboardFields({ board, onChange }: { board: ChalkboardParams; onChange: (board: ChalkboardParams, step?: string) => void }) {
  const gesture = useRef(0)
  const end = () => { gesture.current++ }
  return <>
    <label className="grid gap-1">
      <span>Texto da lousa</span>
      <textarea aria-label="Texto da lousa" value={board.text} maxLength={CHALK_TEXT_MAX} rows={6}
        onChange={e => onChange({ ...board, text: e.target.value }, "chalk-text")}
        className="resize-y rounded-md border border-white/15 bg-[#0b110e] p-2 text-[#dfe8df] outline-none focus:border-primary" />
    </label>
    <label className="grid gap-1">
      <span>Fantasma</span>
      <StepSelect aria-label="Movimento do fantasma" value={board.demo} onChange={e => onChange(chalkboardForDemo(board, e.target.value as DemoId | ""))} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
        <option value="">Nenhum</option>
        {DEMO_IDS.map(id => <option key={id} value={id}>{TRAINING_DEMOS[id].label}</option>)}
      </StepSelect>
    </label>
    {board.demo && <div className="grid gap-field">
      <PatioRange label="Início · horizontal" min={GHOST_OFFSET.min} max={GHOST_OFFSET.max} step={10} value={board.ghostX} onEnd={end}
        onChange={ghostX => onChange({ ...board, ghostX }, `chalk-x:${gesture.current}`)} />
      <PatioRange label="Início · vertical" min={GHOST_OFFSET.min} max={GHOST_OFFSET.max} step={10} value={board.ghostY} onEnd={end}
        onChange={ghostY => onChange({ ...board, ghostY }, `chalk-y:${gesture.current}`)} />
      <PatioRange label="Aparece a" min={GHOST_REACH.min} max={GHOST_REACH.max} step={10} value={board.reach} onEnd={end}
        onChange={reach => onChange({ ...board, reach }, `chalk-reach:${gesture.current}`)} />
    </div>}
  </>
}

// a Gongo: the strikes that press Tocar on the sequencer of its zone (and stop its song), how it forgets them
function GongFields({ gong, onChange }: { gong: GongParams; onChange: (gong: GongParams, step?: string) => void }) {
  const set = (patch: Partial<GongParams>, step?: string) => onChange({ ...gong, ...patch }, step)
  const temple = <label className="flex items-center gap-2" title="Bater nele joga o Templo do Gongo (a campanha dos aliens, ou a música escolhida no aparelho da zona dele) na cena em volta dele">
    <input type="checkbox" checked={gong.temple} onChange={e => set({ temple: e.target.checked })} />Gongo do Templo</label>
  if (gong.temple) return temple
  return <>
    {temple}
    <div className="grid gap-field">
      <PatioRange label="Batidas para começar" min={GONG_HITS.min} max={GONG_HITS.max} value={gong.hits} onChange={hits => set({ hits }, "gong-hits")} />
      <PatioRange label="Batidas para parar a música" min={GONG_STOP_HITS.min} max={GONG_STOP_HITS.max} value={gong.stopHits} display={gong.stopHits || "Não para"} onChange={stopHits => set({ stopHits }, "gong-stop")} />
      <PatioRange label="Esquecer as batidas depois de" min={GONG_FORGET.min} max={GONG_FORGET.max} value={gong.forget} display={gong.forget ? `${gong.forget} s` : "Nunca"} onChange={forget => set({ forget }, "gong-forget")} />
    </div>
    <label className="flex items-center gap-2"><input type="checkbox" checked={gong.lamps} onChange={e => set({ lamps: e.target.checked })} />Lâmpadas das batidas</label>
  </>
}

// an Ativador de grid de campo minado: the music and the damage that fill its two bars
function MineActivatorFields({ activator: a, onChange }: { activator: MineActivatorParams; onChange: (activator: MineActivatorParams, step?: string) => void }) {
  return <div className="grid gap-field">
    <PatioRange label="Notas até ativar" min={MINE_ACTIVATOR_NOTES.min} max={MINE_ACTIVATOR_NOTES.max} step={MINE_ACTIVATOR_NOTES.step} value={a.notes} onChange={notes => onChange({ ...a, notes }, "activator-notes")} />
    <PatioRange label="Dano até ativar" min={MINE_ACTIVATOR_DAMAGE.min} max={MINE_ACTIVATOR_DAMAGE.max} step={MINE_ACTIVATOR_DAMAGE.step} value={a.damage} onChange={damage => onChange({ ...a, damage }, "activator-damage")} />
  </div>
}

// a Jukebox or a Vitrola toca-discos: what its songs ask (the least accuracy at the end, the hearts)
function PlayerFields({ player, onChange }: { player: PlayerParams; onChange: (player: PlayerParams, step?: string) => void }) {
  const set = (patch: Partial<PlayerParams>, step?: string) => onChange({ ...player, ...patch }, step)
  return <div className="grid gap-field">
    <PatioRange label="Precisão mínima" min={PLAYER_ACCURACY.min} max={PLAYER_ACCURACY.max} step={5} value={player.minAccuracy} display={player.minAccuracy ? `${player.minAccuracy}%` : "Nenhuma"} onChange={minAccuracy => set({ minAccuracy }, "player-accuracy")} />
    <PatioRange label="Corações" min={PLAYER_HEARTS.min} max={PLAYER_HEARTS.max} value={player.hearts} onChange={hearts => set({ hearts }, "player-hearts")} />
    <LootList label="Prêmio ao vencer" groupLabel="Prêmio ao vencer a música" loot={player.prize} onChange={(prize, step) => set({ prize }, step && `player-${step}`)} />
  </div>
}

// a Prédio: its roof, storeys, columns, doors, lanterns, plaque and haze
function BuildingFields({ building: b, onChange }: { building: BuildingParams; onChange: (building: BuildingParams, step?: string) => void }) {
  const set = (patch: Partial<BuildingParams>, step?: string) => onChange({ ...b, ...patch }, step)
  const bays = b.columns - 1
  return <>
    <label className="grid gap-1">
      <span>Telhado</span>
      <StepSelect aria-label="Formato do telhado" value={b.roof} onChange={e => set({ roof: e.target.value as BuildingParams["roof"] })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
        {Object.entries(BUILDING_ROOFS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </StepSelect>
    </label>
    <div className="grid gap-field">
      <PatioRange label="Andares" min={1} max={2} value={b.storeys} onChange={storeys => set({ storeys }, "building-storeys")} />
      <PatioRange label="Colunas" min={BUILDING_COLUMNS.min} max={BUILDING_COLUMNS.max} value={b.columns} onChange={columns => set({ columns, doors: Math.min(b.doors, columns - 1) }, "building-columns")} />
      <PatioRange label="Portas" min={0} max={bays} value={Math.min(b.doors, bays)} onChange={doors => set({ doors }, "building-doors")} />
      <PatioRange label="Lanternas" min={BUILDING_LANTERNS.min} max={BUILDING_LANTERNS.max} value={b.lanterns} onChange={lanterns => set({ lanterns }, "building-lanterns")} />
    </div>
    <label className="flex items-center gap-2"><input type="checkbox" checked={b.ridge} onChange={e => set({ ridge: e.target.checked })} />{b.roof === "pyramid" ? "Ponta dourada" : "Cumeeira com dragões"}</label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={b.plaque} onChange={e => set({ plaque: e.target.checked })} />Placa</label>
    <label className="flex items-center gap-2" title="Desbotado na névoa do fundo; os telhados deixam de ser pisos"><input type="checkbox" checked={b.haze} onChange={e => set({ haze: e.target.checked })} />Na névoa</label>
  </>
}

// a Chão's biome or a Parede's style, and how its outline is edited
function SurfaceFields({ el, surface, onChange }: { el: LayoutElement; surface: SurfaceParams; onChange: (surface: SurfaceParams) => void }) {
  const ground = el.kind === "ground"
  return <>
    <div className="grid h-28 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0b110e] p-2" aria-label="Prévia">
      <div className="relative" style={{ height: 96, aspectRatio: `${el.w} / ${el.h}`, maxWidth: "100%" }}><ElementArt el={el} /></div>
    </div>
    <label className="grid gap-1">
      <span>{ground ? "Bioma" : "Tipo de parede"}</span>
      <StepSelect aria-label={ground ? "Bioma do chão" : "Tipo de parede"} value={surface.style} onChange={e => onChange({ ...surface, style: e.target.value as SurfaceParams["style"] })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
        {surfaceStyles(ground ? "ground" : "wall").map(style => <option key={style} value={style}>{SURFACE_STYLE_LABELS[style]}</option>)}
      </StepSelect>
    </label>
    <p className="text-[#93a79a]">Contorno com {surface.points.length} pontos, em volta do objeto inteiro. Com ele selecionado, clique numa linha da borda para criar um ponto, arraste os pontos e dê dois cliques num ponto para removê-lo (mínimo 3). O contorno é o desenho e a colisão; “Objeto duro” fica em Camada e colisões.</p>
  </>
}

// ---------- the palette: drag an element onto the Pátio ----------
type Entry = { key: string; kind: ElementKind; label: string; params?: ElementParams; size?: { w: number; h: number } }
const ENTRIES: { group: string; items: Entry[] }[] = [
  { group: "Portais", items: [{ key: "portal", kind: "portal", label: "Par de portais" }, { key: "portal-patio", kind: "portal", label: "Portal para outro Pátio", params: { portalPairId: "", portalTarget: "" } }, { key: "spawn", kind: "spawn", label: ELEMENT_DEFS.spawn.label }] },
  { group: "Plataformas", items: (["platform", "terrace", "balustrade", "pillar", "trampoline"] as const).map(k => ({ key: k, kind: k, label: ELEMENT_DEFS[k].label })) },
  { group: "Chãos e paredes", items: [
    ...GROUND_BIOMES.map(style => ({ key: `ground-${style}`, kind: "ground" as ElementKind, label: `Chão · ${SURFACE_STYLE_LABELS[style]}`, params: { surface: defaultSurface("ground", style) } })),
    ...WALL_STYLES.map(style => ({ key: `wall-${style}`, kind: "wall" as ElementKind, label: `Parede · ${SURFACE_STYLE_LABELS[style]}`, params: { surface: defaultSurface("wall", style) } })),
  ] },
  { group: "Energia", items: [...POLE_MODELS, ...TOWER_MODELS].map(id => {
    const m = POWER_MODELS[id]
    return { key: `power-${id}`, kind: m.kind as ElementKind, label: `${m.kind === "pole" ? "Poste" : "Torre"} · ${m.label}`, params: { power: { ...defaultPower(m.kind), model: id, links: [] } } }
  }) },
  { group: "Alvos", items: [{ key: "dummy", kind: "dummy", label: ELEMENT_DEFS.dummy.label }] },
  { group: "Treino", items: [{ key: "chalkboard", kind: "chalkboard", label: ELEMENT_DEFS.chalkboard.label }] },
  { group: "Música", items: (["zone", "lanes", "gong", "jukebox", "vitrola", "resetstone", "pedalharp", "drumkit", "grandpiano"] as const).map(k => ({ key: k, kind: k, label: ELEMENT_DEFS[k].label })) },
  // the Templo do Gongo's pieces: its halls and its gong
  { group: "Templo", items: [
    { key: "building-hall", kind: "building", label: "Prédio: salão", params: { building: defaultBuilding() } },
    { key: "building-pavilion", kind: "building", label: "Prédio: pavilhão", params: { building: { ...defaultBuilding(), roof: "pyramid", columns: 5, doors: 4 } }, size: { w: 400, h: 395 } },
    { key: "gong-temple", kind: "gong", label: "Gongo do Templo", params: { gong: { ...defaultGong(), temple: true } } },
  ] },
  { group: "Botões da horda", items: HORDE_BUTTONS.map(a => ({ key: `btn-${a}`, kind: "button" as ElementKind, label: HORDE_BUTTON_LABELS[a], params: { action: a } })) },
  { group: "Esportivos", items: SPORTS_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Armas", items: WEAPON_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Instrumentos", items: INSTRUMENT_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Habilidades especiais", items: CONSUMABLE_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Magia", items: MAGIC_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Chaves", items: KEY_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Grade de blocos", items: [{ key: "mineactivator", kind: "mineactivator" as ElementKind, label: ELEMENT_DEFS.mineactivator.label }, ...MINE_ITEM_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } }))] },
  { group: "Gaiolas", items: CAGE_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Baús", items: CHEST_RARITIES.map(r => ({ key: `chest-${r.value}`, kind: "chest" as ElementKind, label: `Baú ${r.label.toLowerCase()}`, params: { chest: defaultChest(r.value) } })) },
]

function Thumb({ entry }: { entry: Entry }) {
  const d = ELEMENT_DEFS[entry.kind]
  // the item's own art (an SVG fragment in its box; the instruments are drawings placed inside it)
  const item = entry.kind === "rack" ? entry.params?.item : undefined
  if (item && ITEM_SVG[item] && ITEM_BOX[item]) {
    return <svg aria-hidden="true" viewBox={ITEM_BOX[item]!.join(" ")} className="h-8 w-12" preserveAspectRatio="xMidYMid meet" dangerouslySetInnerHTML={{ __html: ITEM_SVG[item]! }} />
  }
  if (entry.kind === "dummy") return <span className="relative block h-9 w-6"><span className="absolute inset-x-0 top-0 h-6 rounded-md bg-[#d9cfb8]" /><span className="absolute left-1/2 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#d6453d] bg-[#f4f1e8]" /><span className="absolute bottom-0 left-1/2 h-3 w-1 -translate-x-1/2 bg-[#5b4630]" /></span>
  if (entry.kind === "zone") return <span className="flex h-7 w-10 items-center justify-center rounded-md border-2 border-dashed border-[#7b8cff] bg-[#7b8cff]/20 text-[13px] text-[#7b8cff]">♫</span>
  if (entry.kind === "gong") return <span aria-hidden="true" className="relative block h-8 w-9"><span className="absolute inset-x-0 top-0 h-1 rounded-sm bg-[#b3261e]" /><span className="absolute bottom-0 left-0.5 top-0 w-1 bg-[#8d1b14]" /><span className="absolute bottom-0 right-0.5 top-0 w-1 bg-[#8d1b14]" /><span className="absolute left-1/2 top-2 h-5 w-5 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#f2c46d,#c58b2e_55%,#7a4f12)]" /></span>
  if (entry.kind === "building") { const s = entry.size ?? ELEMENT_DEFS.building; return <span className="relative block h-9" style={{ aspectRatio: `${s.w} / ${s.h}` }}><BuildingArt building={entry.params?.building ?? defaultBuilding()} w={s.w} h={s.h} /></span> }
  if (entry.kind === "resetstone") return <span aria-hidden="true" className="relative block h-9 w-7"><span className="absolute inset-x-1 bottom-1 top-0 rounded-t-full bg-[#7c8892]" /><span className="absolute left-1/2 top-2.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#7bdff2]" /><span className="absolute inset-x-0 bottom-0 h-1.5 rounded-sm bg-[#6f695f]" /></span>
  if (entry.kind === "mineactivator") return <span aria-hidden="true" className="relative block h-8 w-11"><span className="absolute inset-x-1.5 bottom-1 top-0.5 rounded-t-full bg-[radial-gradient(circle_at_35%_30%,#bfe0ff,#3d8bff_45%,#1b4fb8)]" /><span className="absolute inset-x-0 bottom-0 h-1.5 rounded-sm bg-[#2b3440]" /></span>
  if (entry.kind === "jukebox") return <span aria-hidden="true" className="relative block h-9 w-6 rounded-t-full border-2 border-[#39ff88] bg-[#0f2a1e]"><span className="absolute inset-x-1 top-2 h-2 rounded-sm bg-[#7b8cff]" /><span className="absolute inset-x-1 bottom-1 h-3 rounded-sm bg-[repeating-linear-gradient(45deg,#ff4d6d_0_2px,#ffd166_2px_4px)]" /></span>
  if (entry.kind === "vitrola") return <VitrolaThumb />
  if (entry.kind === "pedalharp") return <HarpThumb />
  if (entry.kind === "drumkit") return <DrumKitThumb />
  if (entry.kind === "grandpiano") return <GrandPianoThumb />
  if (entry.kind === "chest") return <ChestThumb rarity={entry.params?.chest?.rarity ?? "simple"} />
  if (entry.kind === "spawn") return <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#7cc4ff] bg-blue-950/60 shadow-[0_0_6px_#408cff]"><span className="h-2 w-2 rounded-full bg-[#ffd166]" /></span>
  if (entry.kind === "chalkboard") return <span aria-hidden="true" className="block h-7 w-11 rounded-[3px] border-[3px] border-[#7a4f27] bg-[#2f5b3f]" />
  // the Mureta com cerca draws in its own units (posts, floor, wall): drawn at its size, scaled down into the card
  if (entry.kind === "balustrade") { const k = Math.min(48 / d.w, 34 / d.h); return <span className="relative block" style={{ width: d.w * k, height: d.h * k }}><BalustradeArt balustrade={{ courtyard: false }} w={d.w} h={d.h} /></span> }
  if (entry.kind === "button") return <HordeButtonThumb action={entry.params?.action ?? "aliens"} />
  const m = entry.params?.power ? POWER_MODELS[entry.params.power.model] : null
  const w = m?.w ?? d.w, h = m?.h ?? d.h
  const k = Math.min(48 / w, (m ? 44 : 34) / h)
  // the postes and torres take the sky's silhouette colour: light here, on the dark card
  return <span className="relative block" style={{ width: w * k, height: h * k, ...(m ? { ["--patio-sil" as string]: "#dfe8df" } : {}) }}><ElementArt el={{ kind: entry.kind, params: previewParams(entry), w: w * k, h: h * k }} editing /></span>
}

// a horde button on its card, as it stands in the Pátio (drawButton in draw/creatures.ts): the post, the dark base
// and the cap, red for the ones that call a horde, blue for the ones that set it up
function HordeButtonThumb({ action }: { action: HordeButton }) {
  const cap = action === "aliens" || action === "zombies" ? "#d6453d" : "#4cc9f0"
  return (
    <svg aria-hidden="true" viewBox="-25 -11 50 54" className="h-9 w-8">
      <rect x="-4" y="14" width="8" height="29" fill="#3a3f4a" />
      <ellipse cx="0" cy="6" rx="24" ry="12" fill="#23262d" />
      <rect x="-19" y="0" width="38" height="6" fill={cap} />
      <ellipse cx="0" cy="0" rx="19" ry="10" fill={cap} />
      <ellipse cx="0" cy="6" rx="19" ry="4" fill={cap} />
    </svg>
  )
}

// the Vitrola toca-discos on its card: the wooden case, the black record and the golden horn on its neck
function VitrolaThumb() {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" className="h-9 w-9">
      <path d="M24 22 C30 17 30 11 23 9" stroke="#b9741f" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M23 9 L12 3 C5 4 2 10 6 16 Z" fill="#e9a93c" stroke="#f6cf6b" strokeWidth="0.8" />
      <path d="M21 9.5 L8 6 M21 9.5 L5 11 M21 9.5 L9 15" stroke="#8a4f14" strokeWidth="0.7" />
      <rect x="6" y="23" width="24" height="10" rx="1" fill="#8a5130" />
      <rect x="10" y="25" width="16" height="6" fill="#5e3219" />
      <ellipse cx="18" cy="23" rx="12" ry="3" fill="#4a2611" />
      <ellipse cx="17" cy="22.6" rx="8.5" ry="2" fill="#16161a" />
      <ellipse cx="17" cy="22.6" rx="2" ry="0.6" fill="#e8582f" />
      <path d="M30 28 L33 28 L33 31" stroke="#e7b94a" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// the Harpa on its card: the column, the curved neck, the soundboard and a few strings
function HarpThumb() {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 36" className="h-9 w-8">
      <path d="M22 4 L22 33" stroke="#d9a441" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M22 5 C14 1 9 6 5 12" stroke="#d9a441" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M5 12 L19 33" stroke="#b07d2a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M18 6 L18 29 M14 6 L14 24 M10 8 L10 19" stroke="#f4ecd8" strokeWidth="0.8" fill="none" />
      <path d="M16 5 L16 27" stroke="#ff4d4d" strokeWidth="0.8" fill="none" /><path d="M12 6 L12 22" stroke="#3f6dff" strokeWidth="0.8" fill="none" />
      <path d="M17 33 L25 33" stroke="#b07d2a" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

// the Bateria on its card: the bass drum, a tom, the snare and two cymbals
function DrumKitThumb() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 32" className="h-8 w-10">
      <path d="M6 30 L6 9 M34 30 L34 6" stroke="#9aa0a8" strokeWidth="1.2" fill="none" />
      <ellipse cx="6" cy="9" rx="6" ry="1.6" fill="#e3b23c" /><ellipse cx="34" cy="6" rx="6" ry="1.6" fill="#e3b23c" />
      <rect x="15" y="6" width="10" height="7" rx="1.5" fill="#4f8fc0" />
      <circle cx="20" cy="22" r="9" fill="#c8553d" stroke="#e9e4d8" strokeWidth="1.6" />
      <rect x="1" y="17" width="9" height="4" rx="1" fill="#e9e4d8" /><path d="M5.5 21 L5.5 30" stroke="#9aa0a8" strokeWidth="1.2" />
    </svg>
  )
}

// the Piano de cauda on its card: the black case with its lid open, the keys and three legs
function GrandPianoThumb() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 32" className="h-8 w-10">
      <path d="M8 17 L33 6 L34 8 L10 18 Z" fill="#2c2c33" />
      <path d="M4 18 L32 18 Q38 18 38 21 Q38 24 32 24 L4 24 Z" fill="#16161a" />
      <rect x="2" y="17" width="5" height="2" fill="#f2ecdc" />
      <path d="M7 24 L7 31 M27 24 L27 31 M35 24 L35 30" stroke="#16161a" strokeWidth="1.8" />
      <path d="M26 18 L30 9" stroke="#d4a84a" strokeWidth="0.8" />
    </svg>
  )
}

// a Baú on its card: the chest in the glow of its rarity
function ChestThumb({ rarity }: { rarity: ChestRarity }) {
  const g = CHEST_GLOW[rarity], trim = rarity === "legendary" ? "#9fd4ff" : "#e7b43a"
  return <span aria-hidden="true" className="relative block h-8 w-11" style={{ filter: `drop-shadow(0 0 ${rarity === "legendary" ? 6 : 3}px ${g.color})` }}>
    <span className="absolute inset-x-0 top-0 h-3 rounded-t-md bg-[#8a5a2b]" style={{ borderTop: `2px solid ${trim}` }} />
    <span className="absolute inset-x-0 bottom-0 top-3 bg-[#8a5a2b]" style={{ borderLeft: `3px solid ${trim}`, borderRight: `3px solid ${trim}`, borderTop: `2px solid ${trim}` }} />
    <span className="absolute left-1/2 top-2 h-2.5 w-2 -translate-x-1/2 rounded-[2px]" style={{ background: trim }} />
  </span>
}

// what a palette entry looks like before it is placed
const previewParams = (entry: Entry): ElementParams =>
  isMusicElement(entry.kind) ? defaultParams(entry.kind) : isSurfaceElement(entry.kind) || isPowerElement(entry.kind) ? { ...defaultParams(entry.kind), ...entry.params } : { seed: 4242 }

// how far around a Baú (world units) a dragged item still goes inside it
const CHEST_DROP_MARGIN = 10

const PALETTE_CARD = "flex min-h-16 cursor-grab touch-none flex-col items-center justify-center gap-1 rounded-md border border-white/10 bg-[#0b110e] px-1 py-1.5 text-center text-[10px] leading-tight hover:border-[#ffd166] active:cursor-grabbing disabled:opacity-50"

function PaletteSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return <PatioDisclosure title={title} open={open} onToggle={setOpen}>
    {open && <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,96px),1fr))] gap-1.5 px-4 pb-4">
      {children}
    </div>}
  </PatioDisclosure>
}

function Palette({ active, onActive, onAdd, bindHouse, bindTree, canAddScenery, hidden, draggingScenery, soundLayer, onSoundLayer, layersOpen, onLayers, floorBelow, chestAt, onInsert, onClose, undo, redo, canUndo, canRedo }: {
  active: boolean; onActive?: (on: boolean) => void
  onAdd: (el: LayoutElement) => void; bindHouse: (house: HouseParams) => PatioPlacementHandlers
  bindTree: (tree: TreeParams) => PatioPlacementHandlers
  canAddScenery: boolean; hidden: boolean; draggingScenery: boolean
  soundLayer: boolean; onSoundLayer: () => void
  layersOpen: boolean; onLayers?: () => void
  floorBelow: (x: number, y: number) => number
  chestAt: (clientX: number, clientY: number) => LayoutElement | null; onInsert: (chest: LayoutElement, item: ItemId) => void
  onClose: () => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean
}) {
  const [housePreviews] = useState(() => (Object.keys(HOUSE_STYLE_LABELS) as HouseStyle[]).map(style => randomHouse(style).house))
  const [treePreviews] = useState(() => (Object.keys(TREE_STYLES) as TreeParams["style"][]).map(style => randomTree(style)))
  const [drag, setDrag] = useState<{ entry: Entry; x: number; y: number; pointer: number } | null>(null)
  const start = (entry: Entry) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDrag({ entry, x: e.clientX, y: e.clientY, pointer: e.pointerId })
  }
  // an item (a rack's card) dragged over a Baú goes inside it instead of standing on a rack
  const chestUnder = (d: { entry: Entry; x: number; y: number }) => (d.entry.kind === "rack" && d.entry.params?.item ? chestAt(d.x, d.y) : null)
  const into = drag ? chestUnder(drag) : null
  const move = (e: React.PointerEvent) => { if (drag?.pointer === e.pointerId) setDrag({ ...drag, x: e.clientX, y: e.clientY }) }
  const end = (e: React.PointerEvent) => {
    if (drag?.pointer !== e.pointerId) return
    const over = document.elementsFromPoint(e.clientX, e.clientY).some(n => n.closest?.("aside, header"))
    const chest = over ? null : chestUnder({ ...drag, x: e.clientX, y: e.clientY })
    if (chest) onInsert(chest, drag.entry.params!.item!)
    else if (!over) {
      const p = screenToWorld(e.clientX, e.clientY)
      const el = createElement(drag.entry.kind, p.x, p.y, drag.entry.params)
      if (drag.entry.size) { el.w = drag.entry.size.w; el.h = drag.entry.size.h; el.x = p.x - el.w / 2; el.y = p.y - el.h / 2 }
      // dummies and racks stand on the floor right under where they were dropped
      if (el.kind === "dummy" || el.kind === "rack" || el.kind === "gong" || el.kind === "jukebox" || el.kind === "vitrola" || el.kind === "resetstone" || el.kind === "chest" || el.kind === "mineactivator" || isFixedKind(el.kind)) el.y = floorBelow(p.x, p.y - el.h / 2) - el.h
      if (el.kind === "trampoline") el.y = Math.min(el.y, WORLD_GROUND_Y - el.h)
      // postes and torres in their model's proportions, planted on the floor under where they were dropped
      if (el.params.power) {
        const m = POWER_MODELS[el.params.power.model]
        el.w = m.w; el.h = m.h; el.x = p.x - m.w / 2
        el.y = floorBelow(p.x, p.y) - m.h + 6
      }
      // a new zone starts as the next scene's, so walking in changes the music right away
      if (el.kind === "zone") el.params = { zone: defaultSoundZone(ZONES[(sceneAt(p.x) + 1) % ZONES.length]) }
      onAdd(el)
    }
    setDrag(null)
  }
  const d = drag ? ELEMENT_DEFS[drag.entry.kind] : null
  const [docked, toggleDock] = useEditorDocked()
  const body = (
    <>
        <div data-drag-handle className="flex shrink-0 items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <h2 className="whitespace-nowrap text-sm text-white">Modo editor</h2>
          <button type="button" role="switch" aria-checked={active} aria-label="Edição ativa" onClick={() => onActive?.(!active)}
            title={active ? "Desligar a edição (o painel continua aberto para arrastar elementos)" : "Ligar a edição: selecionar, mover e editar os elementos do Pátio"}
            className={cn("relative h-5 w-9 shrink-0 rounded-full border transition-colors", active ? "border-[#ffd166] bg-[#ffd166]/80" : "border-white/25 bg-white/10")}>
            <span aria-hidden className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all", active ? "left-[18px] bg-[#101713]" : "left-0.5 bg-[#b9c7b9]")} />
          </button>
          <span className="flex-1" />
          <button type="button" className={cn(TOOL, docked && "border-[#ffd166] text-white")} onClick={toggleDock} aria-pressed={docked}
            title={docked ? "Soltar o painel (flutuante)" : "Fixar o painel à direita do Pátio"} aria-label="Fixar o painel à direita"><PanelRight className="h-4 w-4" /></button>
          <button type="button" className={TOOL} disabled={!canUndo} onClick={undo} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 className="h-4 w-4" /></button>
          <button type="button" className={TOOL} disabled={!canRedo} onClick={redo} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 className="h-4 w-4" /></button>
          <button type="button" className={TOOL} onClick={onClose} title="Sair do modo editor (=)" aria-label="Sair do modo editor"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-2">
          <div className="ml-4 flex gap-1.5">
            <button type="button" className={cn(TOOL, "h-8 w-auto gap-1.5 px-2", soundLayer && "border-primary text-primary")} title="Mostra as zonas, a zona de cada cena, as superfícies que rebatem notas e as notas das faixas fixas"
              aria-pressed={soundLayer} onClick={onSoundLayer}><Music size={16} /> Zonas</button>
            {onLayers && <button type="button" className={cn(TOOL, "h-8 w-auto gap-1.5 px-2", layersOpen && "border-primary text-primary")} title="Abre o painel Camadas"
              aria-pressed={layersOpen} onClick={onLayers}><Eye size={16} /> Camadas</button>}
          </div>
          <PaletteSection title="Casas">
            {housePreviews.map(house => {
              const size = houseDraftSize(house)
              return <button key={house.style} type="button" title="Clique para abrir no criador ou arraste para sortear uma casa"
                {...bindHouse(house)} disabled={!canAddScenery} className={PALETTE_CARD}>
                <span className="relative h-12" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
                  <ElementArt el={{ kind: 'house', params: { house }, ...size }} />
                </span>
                <span>{HOUSE_STYLE_LABELS[house.style]}</span>
              </button>
            })}
          </PaletteSection>
          <PaletteSection title="Árvores">
            {treePreviews.map(({ tree, w, h }) => (
              <button key={tree.style} type="button" title="Clique para editar ou arraste para sortear uma árvore"
                {...bindTree(tree)} disabled={!canAddScenery} className={PALETTE_CARD}>
                <span className="relative h-12 max-w-full" style={{ aspectRatio: `${w} / ${h}` }}>
                  <CustomTreeArt tree={tree} animate={false} />
                </span>
                <span>{TREE_STYLES[tree.style].label}</span>
              </button>
            ))}
          </PaletteSection>
          {ENTRIES.map(g => (
            <PaletteSection key={g.group} title={g.group}>
              {g.items.map(entry => (
                <button key={entry.key} type="button" title={`Arraste para o Pátio: ${entry.label}`} className={PALETTE_CARD}
                  onPointerDown={start(entry)} onPointerMove={move} onPointerUp={end} onPointerCancel={() => setDrag(null)}>
                  <span className="flex h-9 items-center justify-center"><Thumb entry={entry} /></span>
                  <span>{entry.label}</span>
                </button>
              ))}
            </PaletteSection>
          ))}
        </div>
    </>
  )
  return (
    <>
      {docked
        ? <EditorDock aria-label="Elementos do Pátio" className="font-mono text-xs">{body}</EditorDock>
        : <FloatingPanel id="patio-palette" aria-label="Elementos do Pátio" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(260, vw - 24), h: vw < 640 ? Math.min(300, vh * 0.38) : Math.min(560, vh - 80) })} minW={180} minH={140} className={cn("rounded-xl border border-[#ffd166]/40 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]", hidden && "hidden", draggingScenery && "pointer-events-none opacity-0")}>{body}</FloatingPanel>}
      {/* what is being dragged, at its real size in the world */}
      {drag && into && <InsertHint chest={into} entry={drag.entry} x={drag.x} y={drag.y} />}
      {drag && d && !into && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[250] outline outline-2 outline-dashed outline-[#ffd166]" style={{ left: drag.x - d.w / 2, top: drag.y - d.h / 2, width: d.w, height: d.h, opacity: 0.75 }}>
          {d.entity ? <div className="absolute inset-0 flex items-center justify-center bg-[#ffd166]/15"><Thumb entry={drag.entry} /></div> : <ElementArt el={{ kind: drag.entry.kind, params: previewParams(drag.entry), w: d.w, h: d.h }} editing />}
        </div>
      )}
    </>
  )
}

// an item dragged over a Baú: the Baú lit in its rarity's colour and, at the pointer, the item with the "insert" mark
function InsertHint({ chest, entry, x, y }: { chest: LayoutElement; entry: Entry; x: number; y: number }) {
  const at = worldToScreen(chest.x, chest.y), z = liveCamera.zoom, color = CHEST_GLOW[chest.params.chest?.rarity ?? "simple"].color
  return <>
    <div aria-hidden="true" className="pointer-events-none fixed z-[250] rounded-lg border-2" style={{ left: at.x - 6, top: at.y - 6, width: chest.w * z + 12, height: chest.h * z + 12, borderColor: color, boxShadow: `0 0 18px ${color}` }} />
    <div aria-hidden="true" data-chest-insert className="pointer-events-none fixed z-[251] flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5" style={{ left: x, top: y - 4 }}>
      <Thumb entry={entry} />
      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[#101713]" style={{ background: color }}><PackagePlus className="h-4 w-4" strokeWidth={2.5} /></span>
    </div>
  </>
}

// a scene's own zone: the same fields as a Zona sonora of the map (it is one, stuck to the ground), for this Pátio
function SceneZonePanel({ scene, zones, onChange, onReset, onClose }: { scene: number; zones?: SceneZones; onChange: (z: SoundZoneParams, step?: string) => void; onReset: () => void; onClose: () => void }) {
  const zone = sceneZoneParams(zones, scene), changed = !!zones?.[String(scene)]
  // the fields start over only on Voltar ao padrão (not on the first edit, which would lose what is being typed)
  const [resets, setResets] = useState(0)
  return (
    <FloatingPanel id="patio-scene-zone" overDock aria-label={`Zona da cena ${scene + 1}`} initial={vw => ({ x: Math.max(12, vw - 352), y: 64, w: 340, h: 560 })} minW={260} minH={220} bodyClassName="gap-field p-4" className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="mb-2.5 flex items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Zona da cena {scene + 1}</h2>
        <button type="button" className={TOOL} onClick={onClose} title="Fechar" aria-label="Fechar"><X className="h-4 w-4" /></button>
      </div>
      <SoundZoneFields key={resets} zone={zone} scene onChange={onChange} />
      <button type="button" disabled={!changed} onClick={() => { onReset(); setResets(n => n + 1) }} className="h-9 rounded-md border border-white/15 px-3 hover:border-white/40 disabled:opacity-40">Voltar ao padrão</button>
    </FloatingPanel>
  )
}
