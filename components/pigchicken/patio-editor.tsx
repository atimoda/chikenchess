"use client"

// The Pátio's editor mode: everyone allowed to edit this Pátio (lib/pigchicken/edit-access.ts) changes its layout
// live. A palette of every element (drag one onto the Pátio), click to select, drag the body to move, the corners
// to resize (Shift keeps the shape), and a small bar on the selected one: lock, turn (snaps to the 8 main angles),
// layers and collisions, Edit (elements with params), duplicate and delete. Ctrl+Z / Ctrl+Shift+Z undo and redo.
// The game keeps running underneath: the keyboard moves her, and a click on empty space still shoots (with
// something selected, the first click there only clears the selection).
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { PatioRange } from "@/components/ui/patio-range"
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { ArrowDownToLine, Copy, Ghost, Layers, Lock, LockOpen, Music, PanelRight, Pencil, Redo2, RotateCw, Skull, Trash2, Undo2, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { cn } from "@/lib/utils"
import {
  ELEMENT_DEFS, HARD_KINDS, HORDE_BUTTONS, isMusicElement, isSurfaceElement, defaultParams, HORDE_BUTTON_LABELS, LAYERS, LAYER_HINTS, LAYER_LABELS, createElement, elementBounds, elementsInWorld, layoutFloorBelow, occludesColliders,
  newElementId, normalizeElement, settleLayoutInWorld, storeElementPosition, createPortalPair, LAYOUT_MAX_ELEMENTS, portalPartner, duplicatePortalPair, type ElementKind, type ElementParams, type LayoutElement, type PatioLayout,
} from "@/lib/pigchicken/layout"
import { DUMMY_HP_RANGE } from "@/lib/pigchicken/dummies"
import { TRAMPOLINE_ANGLE, TRAMPOLINE_LEVELS } from "@/lib/pigchicken/trampoline"
import { rackRespawnDelay, RACK_DELAY_MAX } from "@/lib/pigchicken/racks"
import { CONSUMABLE_IDS, DEFAULT_ITEMS, INSTRUMENT_IDS, SPORTS_IDS, WEAPON_IDS, type ItemId } from "@/lib/pigchicken/items"
import { ITEM_BOX, ITEM_SVG } from "@/lib/pigchicken/art"
import { followCamera, screenToWorld } from "@/lib/pigchicken/live-camera"
import { SCENE_W, WORLD_GROUND_Y, sceneAt, templeScene, worldScenes } from "@/lib/pigchicken/world"
import { ZONES } from "@/lib/pigchicken/music"
import { defaultSoundZone, sceneZoneParams, type SceneZones, type SoundZoneParams } from "@/lib/pigchicken/sound-zones"
import { LanesFields, SoundZoneFields, SurfaceRebateFields } from "./sound-zone-panels"
import { MusicZonesLayer } from "./music-zones-layer"
import { ElementArt } from "./patio-layout"
import { HOUSE_STYLE_LABELS, HousePanel } from "./house-panel"
import { houseDraftSize, randomHouse, type HouseParams, type HouseStyle } from "@/lib/pigchicken/houses"
import { TREE_STYLES, randomTree, treeDraftSize, treePreset, type TreeParams } from "@/lib/pigchicken/trees"
import { CustomTreeArt } from "./tree-art"
import { TreePanel } from "./tree-panel"
import { SurfacePoints } from "./surface-points"
import { GROUND_BIOMES, SURFACE_STYLE_LABELS, WALL_STYLES, defaultSurface, surfaceStyles, type SurfaceParams } from "@/lib/pigchicken/surfaces"
import { usePatioPlacement, type PatioPlacementHandlers } from "./use-patio-placement"
import { EditorDock, useEditorDocked } from "./editor-dock"

const UI = "header, aside, button, input, select, textarea, a, label, [data-chicken-ignore], [role='dialog']"
const HISTORY_MAX = 80

type Draft = { kind: "house"; value: HouseParams } | { kind: "tree"; value: TreeParams }
type Change = (next: PatioLayout) => void
type Gesture = { kind: "move" | "resize" | "rotate"; id: string; pointer: number; sx: number; sy: number; start: LayoutElement; corner?: [number, number]; moved: boolean }

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
export function PatioEditor({ layout, screens, onChange, onClose, onSpawnEnemy, soundLayer, onSoundLayer, active = true, onActive }: { layout: PatioLayout; screens: number; onChange: Change; onClose: () => void; active?: boolean; onActive?: (on: boolean) => void; onSpawnEnemy?: (kind: 'alien' | 'zombie', x: number, y: number) => void; soundLayer: number; onSoundLayer: () => void }) {
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
  const [draft, setDraft] = useState<Draft | null>(null)
  // the scene whose own zone is open in its panel (the "Zonas sonoras" layer)
  const [scenePanel, setScenePanel] = useState<number | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const select = useCallback((id: string | null) => { setSelected(id); setPanel("") }, [])
  // switching the editor off lets go of the selection and its panels
  useEffect(() => { if (!active) { select(null); setScenePanel(null) } }, [active, select])
  // a deleted (or undone) element is no longer selected
  useEffect(() => { if (selected && !layout.elements.some(e => e.id === selected)) select(null) }, [layout, selected, select])

  const update = useCallback((el: LayoutElement, step?: string) => {
    const clean = normalizeElement(storeElementPosition(el, screens))
    if (clean) commit(replaceEl(layoutRef.current, clean), step)
  }, [commit, screens])
  // a scene's own zone, saved in the Pátio's settings (null: back to the code's)
  const setSceneZone = useCallback((scene: number, zone: SoundZoneParams | null, step?: string) => {
    const cur = layoutRef.current, zones = { ...cur.settings?.sceneZones }
    if (zone) zones[String(scene)] = { ...zone, life: 0, priority: 1, music: true }
    else delete zones[String(scene)]
    const settings = { ...cur.settings, sceneZones: Object.keys(zones).length ? zones : undefined }
    if (!settings.sceneZones) delete settings.sceneZones
    commit({ ...cur, settings }, step)
  }, [commit])
  const remove = useCallback((id: string) => {
    const el = layoutRef.current.elements.find(e => e.id === id)
    // the entry portal moves but stays
    if (!el || el.kind === 'entry') return
    const partner = portalPartner(el, layoutRef.current.elements)
    if (partner?.locked) return
    commit({ ...layoutRef.current, elements: layoutRef.current.elements.filter(e => e.id !== id && e.id !== partner?.id) }); select(null)
  }, [commit, select])
  const append = useCallback((elements: LayoutElement[], worldPosition = true) => {
    const current = layoutRef.current
    if (current.elements.length + elements.length > LAYOUT_MAX_ELEMENTS) return false
    const added = elements.map(el => normalizeElement(worldPosition ? storeElementPosition(el, screens) : el)!)
    commit({ ...current, elements: [...current.elements, ...added] })
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
    append([{ ...structuredClone(el), id: newElementId(el.kind), x: el.x + 32, y: el.y - 32, locked: false }])
  }, [append])
  const floorBelow = useCallback((x: number, y: number) =>
    layoutFloorBelow(elementsInWorld(layoutRef.current, screens), x, y), [screens])
  const add = useCallback((el: LayoutElement) => {
    append(el.kind === 'portal' ? createPortalPair(el.x + el.w / 2, el.y + el.h / 2) : [el])
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
    if (el.locked || !ELEMENT_DEFS[el.kind].editable) return
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

  // keyboard: Esc clears the selection, Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo and redo, Ctrl+D duplicates
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (placement.cancel()) { e.preventDefault(); return }
        if (draft) { e.preventDefault(); setDraft(null); return }
      }
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      if (e.code === "Escape" && selectedRef.current) { select(null); return }
      if (mod && e.code === "KeyZ") { e.preventDefault(); if (e.shiftKey) forward(); else back(); return }
      if (mod && e.code === "KeyY") { e.preventDefault(); forward(); return }
      if (mod && e.code === "KeyD") {
        e.preventDefault()
        const el = elementsInWorld(layoutRef.current, screens).find(x => x.id === selectedRef.current)
        if (el && !el.locked) duplicate(el)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [back, forward, duplicate, select, placement.cancel, draft, screens])

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
  const begin = (kind: Gesture["kind"], el: LayoutElement, corner?: [number, number]) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    // the first click only selects: dragging needs the element selected
    if (selectedRef.current !== el.id) { select(el.id); return }
    if (el.locked) return
    gesture.current = { kind, id: el.id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, start: el, corner, moved: false }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent, g = gesture.current) => {
    if (!g || g.pointer !== e.pointerId) return
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy
    if (!g.moved && Math.hypot(dx, dy) < 3) return
    g.moved = true
    const s = g.start, step = `${g.kind}:${g.id}:${g.sx}:${g.sy}`
    if (g.kind === "move") { update({ ...s, x: s.x + dx, y: s.y + dy }, step); return }
    if (g.kind === "rotate") {
      const p = screenToWorld(e.clientX, e.clientY)
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
    if (e.shiftKey) { const k = Math.max(w / s.w, h / s.h); w = Math.max(d.minW, s.w * k); h = Math.max(d.minH, s.h * k) }
    const ox = (sx * (w - s.w)) / 2, oy = (sy * (h - s.h)) / 2
    const cx = s.x + s.w / 2 + ox * c - oy * sn, cy = s.y + s.h / 2 + ox * sn + oy * c
    update({ ...s, x: cx - w / 2, y: cy - h / 2, w, h }, step)
  }
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
  const worldRef = useRef<HTMLDivElement>(null)
  useEffect(() => (worldRef.current ? followCamera(worldRef.current) : undefined), [])
  const width = worldScenes(screens) * SCENE_W

  return (
    <>
      <style>{`
        [data-patio-hit] { cursor: pointer; }
        [data-patio-hit]:hover { outline: 1px solid rgba(255,209,102,.7); outline-offset: 2px; }
        [data-patio-hit][data-sel] { outline: 2px solid #ffd166; outline-offset: 2px; cursor: move; }
        [data-patio-hit][data-sel][data-locked] { outline-color: #9aa0a8; cursor: not-allowed; }
        .patio-corner { position: absolute; width: 28px; height: 28px; touch-action: none; display: grid; place-items: center; }
        .patio-corner span { width: 12px; height: 12px; border: 0 solid #ffd166; }
        @media (pointer: coarse) { .patio-corner { width: 44px; height: 44px; } .patio-corner span { width: 16px; height: 16px; } }
      `}</style>
      {active && <div data-patio-editor className="pointer-events-none fixed inset-0 z-[203] overflow-hidden">
        <div ref={worldRef} className="absolute left-0 top-0" style={{ width, height: WORLD_GROUND_Y }}>
          {[...shown.filter(e => isMusicElement(e.kind)), ...shown.filter(e => !isMusicElement(e.kind))].map(el => (
            <HitBox key={el.id} el={el} selected={el.id === selected} begin={begin} onMove={onMove} onUp={onUp} edit={edit} />
          ))}
          {sel && !sel.locked && isSurfaceElement(sel.kind) && <SurfacePoints el={sel} onChange={update} />}
          {sel && (
            <Toolbar
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
            />
          )}
        </div>
      </div>}
      {sel && panel === "layers" && <LayersPanel el={sel} onChange={el => update(el)} onClose={() => setPanel("")} />}
      {sel && panel === "edit" && !draft && (sel.kind === 'house' && sel.params.house
        ? <HousePanel key={sel.id} house={sel.params.house} dimensions={sel} onChange={(house, step) => update({ ...sel, params: { house } }, step && `${sel.id}:${step}`)} onClose={() => setPanel("")} />
        : selectedTree
          ? <TreePanel key={sel.id} tree={selectedTree} dimensions={sel} worldX={sel.x + sel.w / 2} legacy={sel.kind === "tree" ? undefined : <ElementArt el={sel} />}
            onChange={(tree, step) => update({ ...sel, kind: "tree", params: { tree } }, step && `${sel.id}:${step}`)} onClose={() => setPanel("")} />
          : <EditPanel key={sel.id} el={sel} onChange={(el, step) => update(el, step)} onClose={() => setPanel("")} onSpawnEnemy={onSpawnEnemy} />)}
      {active && soundLayer > 0 && <MusicZonesLayer elements={shown} screens={screens} sceneZones={layout.settings?.sceneZones} editable opacity={soundLayer}
        onZone={(el, zone, step) => { if (!el.locked) update({ ...el, params: { ...el.params, zone } }, step) }} onOpenZone={edit}
        onScene={setSceneZone} onOpenScene={s => { select(null); setScenePanel(s) }} />}
      {active && soundLayer > 0 && scenePanel !== null && scenePanel < worldScenes(screens) && scenePanel !== templeScene(screens) && (
        <SceneZonePanel key={scenePanel} scene={scenePanel} zones={layout.settings?.sceneZones} onChange={(zone, step) => setSceneZone(scenePanel, zone, step && `${step}:cena${scenePanel}`)}
          onReset={() => setSceneZone(scenePanel, null)} onClose={() => setScenePanel(null)} />
      )}
      <Palette active={active} onActive={onActive} onAdd={add} hidden={!!draft} draggingScenery={!!placement.ghost}
        bindHouse={house => placement.bind(() => randomHouseElement(house.style), () => openDraft({ kind: "house", value: house }))}
        bindTree={tree => placement.bind(() => {
          const next = randomTree(tree.style)
          return { ...createElement("tree", 0, 0, { tree: next.tree }), w: next.w, h: next.h }
        }, () => openDraft({ kind: "tree", value: tree }))}
        canAddScenery={layout.elements.length < LAYOUT_MAX_ELEMENTS}
        soundLayer={soundLayer > 0} onSoundLayer={onSoundLayer}
        floorBelow={floorBelow} onClose={onClose} undo={back} redo={forward} canUndo={canUndo} canRedo={canRedo} />
      {draft?.kind === "house" && <HousePanel house={draft.value} onChange={value => setDraft({ kind: "house", value })} onClose={() => setDraft(null)} dragging={!!placement.ghost}
        previewDrag={placement.bind(() => ({ ...createElement('house', 0, 0, { house: draft.value }), ...houseDraftSize(draft.value) }))} />}
      {draft?.kind === "tree" && <TreePanel tree={draft.value} onChange={value => setDraft({ kind: "tree", value })} onClose={() => setDraft(null)} dragging={!!placement.ghost}
        previewDrag={placement.bind(() => ({ ...createElement('tree', 0, 0, { tree: draft.value }), ...treeDraftSize(draft.value) }))} />}
      {placement.ghost && <div ref={placement.ghostRef} aria-hidden="true" className="pointer-events-none fixed z-[260] opacity-75"
        style={{ left: -placement.ghost.w / 2, top: -placement.ghost.h, width: placement.ghost.w, height: placement.ghost.h }}>
        <ElementArt el={placement.ghost} />
      </div>}
    </>
  )
}

// one element's hit area (turned like it) with its corners when selected
const HitBox = memo(function HitBox({ el, selected, begin, onMove, onUp, edit }: {
  el: LayoutElement; selected: boolean
  begin: (kind: Gesture["kind"], el: LayoutElement, corner?: [number, number]) => (e: React.PointerEvent) => void
  onMove: (e: React.PointerEvent) => void; onUp: (e: React.PointerEvent) => void; edit: (el: LayoutElement) => void
}) {
  const d = ELEMENT_DEFS[el.kind]
  return (
    <div
      data-chicken-ignore
      data-patio-hit={el.id}
      data-sel={selected || undefined}
      data-locked={el.locked || undefined}
      aria-label={d.label}
      className={cn("pointer-events-auto absolute touch-none", (el.kind === "portal" || el.kind === "entry") && "z-[1]")}
      style={{ left: el.x, top: el.y, width: el.w, height: el.h, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}
      onPointerDown={begin("move", el)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={e => { e.stopPropagation(); edit(el) }}
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
function Toolbar({ el, panel, setPanel, onLock, onGravity, onRotate, onMove, onUp, onDuplicate, onDelete, deleteBlocked }: {
  el: LayoutElement; panel: string; setPanel: (p: "" | "layers" | "edit" | "delete") => void
  onLock: () => void; onGravity: () => void; onRotate: (e: React.PointerEvent) => void; onMove: (e: React.PointerEvent) => void; onUp: (e: React.PointerEvent) => void
  onDuplicate: () => void; onDelete: () => void
  deleteBlocked: boolean
}) {
  const d = ELEMENT_DEFS[el.kind]
  const b = elementBounds(el)
  // kept on the screen side of the element when it is near the world's top
  const top = Math.max(b.y - 46, -2990)
  return (
    <div data-chicken-ignore className="pointer-events-auto absolute z-[2] flex items-center gap-1 font-mono text-[11px]" style={{ left: b.x + b.w, top, transform: "translateX(-100%)" }} onPointerDown={e => e.stopPropagation()}>
      <span className="mr-1 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-white/80">{d.label}</span>
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
          {d.editable && (
            <button type="button" className={cn(TOOL, panel === "edit" && "border-primary text-white")} title="Editar parâmetros" aria-label="Editar" aria-pressed={panel === "edit"} onClick={() => setPanel(panel === "edit" ? "" : "edit")}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {el.kind === "entry" ? (
            <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-white/60">Pode mover; não apaga</span>
          ) : <>
          <button type="button" className={TOOL} title="Duplicar (Ctrl+D)" aria-label="Duplicar" onClick={onDuplicate}><Copy className="h-4 w-4" /></button>
          <div className="relative">
            <button
              type="button"
              className={cn(TOOL, "hover:border-red-400 hover:text-red-300", panel === "delete" && "border-red-400 text-red-300")}
              title={deleteBlocked ? "Destranque o outro portal para apagar o par" : "Apagar (clique duplo apaga sem confirmar)"}
              disabled={deleteBlocked}
              aria-label="Apagar"
              onClick={() => setPanel(panel === "delete" ? "" : "delete")}
              onDoubleClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {panel === "delete" && (
              <div role="dialog" aria-label="Confirmar" className="absolute right-0 top-10 flex items-center gap-2 whitespace-nowrap rounded-lg border border-red-400/60 bg-[#101713] px-3 py-2 text-white shadow-lg">
                <span>{el.kind === 'portal' ? 'Apagar os dois portais do par?' : 'Apagar?'}</span>
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
      <span className="grid"><span>{label}</span>{hint && <span className="text-[10px] text-[#93a79a]">{hint}</span>}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
    </label>
  )
}

// the layer dropdown and the collisions
function LayersPanel({ el, onChange, onClose }: { el: LayoutElement; onChange: (el: LayoutElement) => void; onClose: () => void }) {
  return (
    <FloatingPanel id="patio-layers" aria-label="Camada e colisões" initial={vw => ({ x: Math.max(12, vw - 312), y: 64, w: 300, h: 470 })} minW={240} minH={200} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Camada · {ELEMENT_DEFS[el.kind].label}</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div role="radiogroup" aria-label="Camada" className="grid gap-1">
        {[...LAYERS].reverse().map(l => (
          <label key={l} className={cn("flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5", el.layer === l ? "border-primary bg-primary/10 text-white" : "border-white/10 hover:border-white/30")}>
            <input type="radio" name="patio-layer" checked={el.layer === l} onChange={() => onChange({ ...el, layer: l })} className="mt-0.5 accent-[var(--primary)]" />
            <span className="grid"><span>{LAYER_LABELS[l]}</span><span className="text-[10px] text-[#93a79a]">{LAYER_HINTS[l]}</span></span>
          </label>
        ))}
      </div>
      {isMusicElement(el.kind) ? <p className="border-t border-white/10 pt-3 text-[#93a79a]">{el.kind === "zone" ? "A zona sonora é invisível no jogo e não tem colisões." : "As faixas não têm colisões: só mudam as notas que passam por elas."}</p> : <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-t border-white/10 pt-3">
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
function EditPanel({ el, onChange, onClose, onSpawnEnemy }: { el: LayoutElement; onChange: (el: LayoutElement, step?: string) => void; onClose: () => void; onSpawnEnemy?: (kind: 'alien' | 'zombie', x: number, y: number) => void }) {
  const set = (p: ElementParams, step?: string) => onChange({ ...el, params: { ...el.params, ...p } }, step)
  const [msg, setMsg] = useState(el.params.message ?? "")
  const editSession = useId()
  const sliderGesture = useRef(0)
  const endSlider = () => { sliderGesture.current++ }
  const bounce = el.params.trampoline
  return (
    <FloatingPanel id="patio-edit" aria-label="Editar elemento" initial={vw => ({ x: Math.max(12, vw - 352), y: 64, w: 340, h: 380 })} minW={260} minH={200} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Editar · {ELEMENT_DEFS[el.kind].label}</h2>
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
      {el.kind === "portal" && <>
        <p className="text-[#93a79a]">Este portal leva ao outro portal do mesmo par. Mova cada um separadamente. Duplicar ou apagar afeta o par inteiro.</p>
        <label className="grid gap-1">
          <span>Texto da instrução / confirmação</span>
          <input aria-label="Texto do portal" maxLength={100} value={el.params.portalLabel ?? ''} onChange={e => set({ portalLabel: e.target.value }, `portal-label:${el.id}`)} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2" />
        </label>
        <label className="grid gap-1">
          <span>Mostrar instrução</span>
          <select aria-label="Visibilidade da instrução do portal" value={el.params.portalInstruction ?? 'hover'} onChange={e => set({ portalInstruction: e.target.value as 'always' | 'hover' })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            <option value="hover">Ao encostar ou passar o ponteiro</option>
            <option value="always">Sempre visível</option>
          </select>
        </label>
      </>}
      {el.kind === "trampoline" && bounce && <>
        <div className="grid h-24 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0b110e]" aria-label="Prévia do trampolim">
          <div className="relative h-12 w-48"><ElementArt el={el} /></div>
        </div>
        <PatioRange label="Força do impulso" min={1} max={TRAMPOLINE_LEVELS.length} value={bounce.strength}
          display={`Nível ${bounce.strength}`} onEnd={endSlider}
          onChange={strength => set({ trampoline: { ...bounce, strength } }, `bounce-strength:${editSession}:${sliderGesture.current}`)} />
        <PatioRange label="Direção do impulso" min={-TRAMPOLINE_ANGLE} max={TRAMPOLINE_ANGLE} value={bounce.angle}
          display={bounce.angle === 0 ? "Vertical" : `${Math.abs(bounce.angle)}° ${bounce.angle < 0 ? "←" : "→"}`} onEnd={endSlider}
          onChange={angle => set({ trampoline: { ...bounce, angle } }, `bounce-angle:${editSession}:${sliderGesture.current}`)} />
        <p className="text-[#93a79a]">Pouse por cima para quicar. Segure Agachar ou Chocar para atravessar.</p>
      </>}
      {el.kind === "rack" && <>
        <label className="grid gap-1">
          <span>Item do suporte</span>
          <select aria-label="Item do suporte" value={el.params.item} onChange={e => { const item = e.target.value as ItemId; set({ item, respawnDelay: rackRespawnDelay(item) }) }} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            <optgroup label="Esportivos">{SPORTS_IDS.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
            <optgroup label="Armas">{WEAPON_IDS.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
            <optgroup label="Instrumentos">{INSTRUMENT_IDS.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
            <optgroup label="Habilidades especiais">{CONSUMABLE_IDS.map(id => <option key={id} value={id}>{DEFAULT_ITEMS[id].name}</option>)}</optgroup>
          </select>
        </label>
        <label className="grid gap-1">
          <span>Tempo de reposição (s)</span>
          <input aria-label="Tempo de reposição do item" type="number" min={0} max={RACK_DELAY_MAX} step={0.1} value={el.params.respawnDelay ?? rackRespawnDelay(el.params.item ?? 'pistol')} onChange={e => { if (e.target.value !== '') set({ respawnDelay: Number(e.target.value) }, `rack-delay:${el.id}`) }} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2" />
          <span className="text-[10px] text-[#93a79a]">Espera após pegar o item. Consumíveis: 0,1 s por padrão; armas e instrumentos: 2 s. Zero repõe imediatamente.</span>
        </label>
      </>}
      {isSurfaceElement(el.kind) && el.params.surface && <SurfaceFields el={el} surface={el.params.surface} onChange={surface => set({ surface })} />}
      {el.kind === "zone" && el.params.zone && <SoundZoneFields zone={el.params.zone} onChange={(zone, step) => set({ zone }, step && `${step}:${el.id}`)} />}
      {el.kind === "lanes" && el.params.lanes && <LanesFields lanes={el.params.lanes} w={el.w} h={el.h} onChange={(lanes, step) => set({ lanes }, step && `${step}:${el.id}`)} />}
      {el.kind === "button" && (
        <label className="grid gap-1">
          <span>Ação ao acertar</span>
          <select value={el.params.action} onChange={e => set({ action: e.target.value as (typeof HORDE_BUTTONS)[number] })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
            {HORDE_BUTTONS.map(id => <option key={id} value={id}>{HORDE_BUTTON_LABELS[id]}</option>)}
          </select>
        </label>
      )}

    </FloatingPanel>
  )
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
      <select aria-label={ground ? "Bioma do chão" : "Tipo de parede"} value={surface.style} onChange={e => onChange({ ...surface, style: e.target.value as SurfaceParams["style"] })} className="h-9 rounded-md border border-white/15 bg-[#0b110e] px-2">
        {surfaceStyles(ground ? "ground" : "wall").map(style => <option key={style} value={style}>{SURFACE_STYLE_LABELS[style]}</option>)}
      </select>
    </label>
    <p className="text-[#93a79a]">Contorno com {surface.points.length} pontos, em volta do objeto inteiro. Com ele selecionado, clique numa linha da borda para criar um ponto, arraste os pontos e dê dois cliques num ponto para removê-lo (mínimo 3). O contorno é o desenho e a colisão; “Objeto duro” fica em Camada e colisões.</p>
  </>
}

// ---------- the palette: drag an element onto the Pátio ----------
type Entry = { key: string; kind: ElementKind; label: string; params?: ElementParams }
const ENTRIES: { group: string; items: Entry[] }[] = [
  { group: "Portais", items: [{ key: "portal", kind: "portal", label: "Par de portais" }] },
  { group: "Plataformas", items: (["platform", "terrace", "pillar", "trampoline"] as const).map(k => ({ key: k, kind: k, label: ELEMENT_DEFS[k].label })) },
  { group: "Chãos e paredes", items: [
    ...GROUND_BIOMES.map(style => ({ key: `ground-${style}`, kind: "ground" as ElementKind, label: `Chão · ${SURFACE_STYLE_LABELS[style]}`, params: { surface: defaultSurface("ground", style) } })),
    ...WALL_STYLES.map(style => ({ key: `wall-${style}`, kind: "wall" as ElementKind, label: `Parede · ${SURFACE_STYLE_LABELS[style]}`, params: { surface: defaultSurface("wall", style) } })),
  ] },
  { group: "Alvos", items: [{ key: "dummy", kind: "dummy", label: ELEMENT_DEFS.dummy.label }] },
  { group: "Música", items: (["zone", "lanes"] as const).map(k => ({ key: k, kind: k, label: ELEMENT_DEFS[k].label })) },
  { group: "Botões da horda", items: HORDE_BUTTONS.map(a => ({ key: `btn-${a}`, kind: "button" as ElementKind, label: HORDE_BUTTON_LABELS[a], params: { action: a } })) },
  { group: "Esportivos", items: SPORTS_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Armas", items: WEAPON_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Instrumentos", items: INSTRUMENT_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
  { group: "Habilidades especiais", items: CONSUMABLE_IDS.map(id => ({ key: `rack-${id}`, kind: "rack" as ElementKind, label: DEFAULT_ITEMS[id].name, params: { item: id } })) },
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
  if (entry.kind === "button") return <span className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-[#7bdff2] bg-[#123] text-[9px] text-[#7bdff2]">!</span>
  const k = Math.min(48 / d.w, 34 / d.h)
  return <span className="relative block" style={{ width: d.w * k, height: d.h * k }}><ElementArt el={{ kind: entry.kind, params: previewParams(entry), w: d.w, h: d.h }} editing /></span>
}

// what a palette entry looks like before it is placed
const previewParams = (entry: Entry): ElementParams =>
  isMusicElement(entry.kind) ? defaultParams(entry.kind) : isSurfaceElement(entry.kind) ? { ...defaultParams(entry.kind), ...entry.params } : { seed: 4242 }

const PALETTE_CARD = "flex min-h-16 cursor-grab touch-none flex-col items-center justify-center gap-1 rounded-md border border-white/10 bg-[#0b110e] px-1 py-1.5 text-center text-[10px] leading-tight hover:border-[#ffd166] active:cursor-grabbing disabled:opacity-50"

function PaletteSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return <PatioDisclosure title={title} open={open} onToggle={setOpen}>
    {open && <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,96px),1fr))] gap-1.5 px-4 pb-4">
      {children}
    </div>}
  </PatioDisclosure>
}

function Palette({ active, onActive, onAdd, bindHouse, bindTree, canAddScenery, hidden, draggingScenery, soundLayer, onSoundLayer, floorBelow, onClose, undo, redo, canUndo, canRedo }: {
  active: boolean; onActive?: (on: boolean) => void
  onAdd: (el: LayoutElement) => void; bindHouse: (house: HouseParams) => PatioPlacementHandlers
  bindTree: (tree: TreeParams) => PatioPlacementHandlers
  canAddScenery: boolean; hidden: boolean; draggingScenery: boolean
  soundLayer: boolean; onSoundLayer: () => void
  floorBelow: (x: number, y: number) => number; onClose: () => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean
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
  const move = (e: React.PointerEvent) => { if (drag?.pointer === e.pointerId) setDrag({ ...drag, x: e.clientX, y: e.clientY }) }
  const end = (e: React.PointerEvent) => {
    if (drag?.pointer !== e.pointerId) return
    const over = document.elementsFromPoint(e.clientX, e.clientY).some(n => n.closest?.("aside, header"))
    if (!over) {
      const p = screenToWorld(e.clientX, e.clientY)
      const el = createElement(drag.entry.kind, p.x, p.y, drag.entry.params)
      // dummies and racks stand on the floor right under where they were dropped
      if (el.kind === "dummy" || el.kind === "rack") el.y = floorBelow(p.x, p.y - el.h / 2) - el.h
      if (el.kind === "trampoline") el.y = Math.min(el.y, WORLD_GROUND_Y - el.h)
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
        <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-1.5 border-b border-white/10 px-3 py-2">
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
          <button type="button" className={cn(TOOL, "ml-4 h-8 w-auto gap-1.5 px-2", soundLayer && "border-primary text-primary")} title="Mostra as zonas sonoras, a zona de cada cena, as superfícies que rebatem notas e as notas das faixas fixas"
            aria-pressed={soundLayer} onClick={onSoundLayer}><Music size={16} /> Zonas sonoras</button>
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
      {drag && d && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[250] outline outline-2 outline-dashed outline-[#ffd166]" style={{ left: drag.x - d.w / 2, top: drag.y - d.h / 2, width: d.w, height: d.h, opacity: 0.75 }}>
          {d.entity ? <div className="absolute inset-0 flex items-center justify-center bg-[#ffd166]/15"><Thumb entry={drag.entry} /></div> : <ElementArt el={{ kind: drag.entry.kind, params: previewParams(drag.entry), w: d.w, h: d.h }} editing />}
        </div>
      )}
    </>
  )
}

// a scene's own zone: its music (key, scales, tempo, feel, progression, name and colour), for this Pátio
function SceneZonePanel({ scene, zones, onChange, onReset, onClose }: { scene: number; zones?: SceneZones; onChange: (z: SoundZoneParams, step?: string) => void; onReset: () => void; onClose: () => void }) {
  const zone = sceneZoneParams(zones, scene), changed = !!zones?.[String(scene)]
  return (
    <FloatingPanel id="patio-scene-zone" aria-label={`Zona da cena ${scene + 1}`} initial={vw => ({ x: Math.max(12, vw - 352), y: 64, w: 340, h: 560 })} minW={260} minH={220} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div data-drag-handle className="flex cursor-move items-center gap-2">
        <h2 className="flex-1 text-sm text-white">Zona da cena {scene + 1}</h2>
        <button type="button" className={TOOL} onClick={onClose} title="Fechar" aria-label="Fechar"><X className="h-4 w-4" /></button>
      </div>
      <p className="text-[#93a79a]">Vale para a coluna inteira da cena, do chão ao teto. Uma Zona sonora colocada no mapa vence a da cena.</p>
      <SoundZoneFields key={changed ? "own" : "code"} zone={zone} scene onChange={onChange} />
      <button type="button" disabled={!changed} onClick={onReset} className="h-9 rounded-md border border-white/15 px-3 hover:border-white/40 disabled:opacity-40">Voltar à zona do código</button>
    </FloatingPanel>
  )
}
