"use client"

// The Pátio drawn from its layout (lib/pigchicken/layout.ts): each layer's scenery (platforms, trees) and the
// invisible floors and walls the chicken's engine reads (`data-chicken-platforms`). The game's own things
// (dummies, racks, buttons) are drawn on the game's canvas (parquinho.tsx) and only placed from here.
import { memo, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { ELEMENT_DEFS, elementBounds, elementCorners, elementFloorLine, elementOutline, isHard, layoutCollisionDepth, treeWorldSurfaces, type LayoutElement, type LayoutLayer } from "@/lib/pigchicken/layout"
import { houseSurfaces, normalizeHouse } from "@/lib/pigchicken/houses"
import { TRAMPOLINE_DEFAULTS, TRAMPOLINE_LEVELS } from "@/lib/pigchicken/trampoline"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"
import { followCamera, followDepth } from "@/lib/pigchicken/live-camera"
import { PowerArt, PowerFloors, PowerLines } from "./power-art"
import { TreeArt, TreeStyles } from "./patio-trees"
import { SceneryRegion } from "./scenery-region"
import { HouseArt, PlacedHouseArt } from "./house-art"
import { houseRooms, roomFloorSlab } from "@/lib/pigchicken/house-rooms"
import { houseRoomsStore } from "@/lib/pigchicken/house-rooms-store"
import { CustomTreeArt, CustomTreeStyles } from "./tree-art"
import { SceneryWindStyles } from "./scenery-wind-bend"
import { LanesArt, ZoneArt } from "./sound-zone-art"
import { SurfaceArt } from "./surface-art"
import { ChalkboardArt } from "./chalkboard-art"

// one element's art filling its box
// placed: the element as it stands in the Pátio (a house there opens when someone goes in), not a preview of it
export const ElementArt = memo(function ElementArt({ el, worldX, editing, placed }: { el: Pick<LayoutElement, "kind" | "params" | "w" | "h"> & { depth?: number; id?: string }; worldX?: number; editing?: boolean; placed?: boolean }) {
  if ((el.kind === "pole" || el.kind === "tower") && el.params.power) return <PowerArt kind={el.kind} power={el.params.power} w={el.w} depth={el.depth} />
  if (el.kind === "zone") return el.params.zone ? <ZoneArt zone={el.params.zone} /> : null
  if (el.kind === "lanes") return el.params.lanes ? <LanesArt lanes={el.params.lanes} w={el.w} h={el.h} editing={editing} /> : null
  if (el.kind === "chalkboard") return el.params.chalkboard ? <ChalkboardArt board={el.params.chalkboard} w={el.w} h={el.h} /> : null
  if (el.kind === "house") return placed && el.id ? <PlacedHouseArt id={el.id} house={el.params.house ?? normalizeHouse(null)} /> : <HouseArt house={el.params.house ?? normalizeHouse(null)} />
  if ((el.kind === "ground" || el.kind === "wall") && el.params.surface) return <SurfaceArt surface={el.params.surface} w={el.w} h={el.h} />
  if (el.kind === "tree" && el.params.tree) return <CustomTreeArt tree={el.params.tree} worldX={worldX} />
  if (el.kind === "trampoline") {
    const { strength } = el.params.trampoline ?? TRAMPOLINE_DEFAULTS
    const { pad, trim } = TRAMPOLINE_LEVELS[strength - 1]
    return <svg aria-hidden="true" data-trampoline-strength={strength} viewBox="0 0 200 48" preserveAspectRatio="none" className="absolute inset-0 size-full">
      <path d="M18 12h164l-10 29H28Z" fill="#161e2a" />
      <path d="M13 44h174M35 18v21m130-21v21" fill="none" stroke="#525d70" strokeWidth="6" strokeLinecap="round" />
      <path d={Array.from({ length: strength }, (_, i) => {
        const x = 46 + (i + 0.5) * 108 / strength
        return `M${x - 8} 16l16 5-16 5 16 5-16 5 16 5`
      }).join(" ")} fill="none" stroke={trim} strokeWidth="3" strokeLinejoin="round" />
      <rect width="200" height="16" rx="4" fill={pad} />
      <path d="M5 2h190M10 11h12m156 0h12" fill="none" stroke={trim} strokeWidth="4" strokeLinecap="round" />
    </svg>
  }
  if (el.kind === "portal") return <div className="absolute inset-0 rounded-full border-[3px] border-[#7cc4ff] bg-blue-950/60 shadow-[0_0_8px_#408cff,inset_0_0_8px_#408cff]" />
  if (el.kind === "pine" || el.kind === "blossom") return <TreeArt kind={el.kind} seed={el.params.seed ?? 1} flip={el.params.flip} delay={((el.params.seed ?? 0) % 70) / 10} worldX={worldX} />
  if (el.kind === "terrace") return <div className="absolute inset-0 rounded-sm border-t-4 border-[#ffd166] shadow-[0_6px_0_#5c120d,0_14px_18px_rgba(40,8,4,0.35)]" style={{ background: "linear-gradient(#d8402f, #9a2117 55%, #1f6b62 55%, #1f6b62 80%, #ffd166 80%, #ffd166 88%, #7a1710 88%)" }} />
  if (el.kind === "pillar") return <div className="absolute inset-0 rounded-md border border-primary/30 bg-[#16241b] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_46px,rgba(255,255,255,0.04)_46px,rgba(255,255,255,0.04)_48px)]" />
  if (el.kind === "platform") return <div className="absolute inset-0 rounded-md border border-primary/30 bg-[#16241b]" />
  return null
})

// something in a parallax depth of its own: slides with the camera inside the layer that already follows it
// pinned: on a fixed point of a layer of the scenery far behind (LayoutElement.backdrop), see live-camera
export function DepthLayer({ depth, pinned = false, children, className = "pointer-events-none absolute left-0 top-0" }: { depth: number; pinned?: boolean; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? followDepth(ref.current, depth, pinned) : undefined), [depth, pinned])
  return <div ref={ref} className={className}>{children}</div>
}

// the scenery of one layer, in world units (the parent moves with the camera)
// power: only the Postes and Torres with their wires (true), or everything else (false); missing: all of it. The
// world draws the power apart from the sky's light filter: they already have the silhouette's colour, faded by depth.
export const LayoutLayerView = memo(function LayoutLayerView({ elements, layer, editing, power }: { elements: LayoutElement[]; layer: LayoutLayer; editing: boolean; power?: boolean }) {
  return (
    <>
      {elements.map(el => {
        if (ELEMENT_DEFS[el.kind].entity || el.layer !== layer) return null
        if (power !== undefined && power !== (el.kind === "pole" || el.kind === "tower")) return null
        if (el.hidden && !editing) return null
        const art = (
          <SceneryRegion
            depth={el.depth}
            pinned={!!el.backdrop}
            key={el.id}
            bounds={elementBounds(el)}
            aria-hidden="true"
            data-patio-el={el.id}
            className="absolute"
            style={{
              left: el.x, top: el.y, width: el.w, height: el.h,
              transform: el.rot ? `translate3d(0,0,0) rotate(${el.rot}deg)` : (el.kind === "pine" || el.kind === "blossom") ? "translate3d(0,0,0)" : undefined,
              // other scenery in a depth fades into the sky behind it (the haze of Céu e luz)
              opacity: el.hidden ? 0.35 * el.opacity : el.depth && el.kind !== "pole" && el.kind !== "tower" ? `calc(${el.opacity} * (1 - ${el.depth} * var(--patio-haze, 0.5)))` : el.opacity,
              outline: el.hidden ? "2px dashed rgba(255,255,255,0.5)" : undefined,
            }}
          >
            <ElementArt el={el} editing={editing} placed worldX={el.kind === "tree" || el.kind === "pine" || el.kind === "blossom" ? el.x + el.w / 2 : undefined} />
          </SceneryRegion>
        )
        return el.depth ? <DepthLayer key={el.id} depth={el.depth} pinned={!!el.backdrop}>{art}</DepthLayer> : art
      })}
      {power !== false && <PowerLines elements={elements} layer={layer} />}
    </>
  )
})

const HouseCollider = memo(function HouseCollider({ id, x, y, w, h, house, depth }: Pick<LayoutElement, 'id' | 'x' | 'y' | 'w' | 'h'> & { house: NonNullable<LayoutElement['params']['house']>; depth: number }) {
  const lines = useMemo(() => houseSurfaces(house, w, h)
    .map(({ points }) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')).join('|'), [house, w, h])
  return <div data-chicken-id={id} data-chicken-depth={depth} data-chicken-world-box={`${x},${y},${w},${h}`} data-chicken-line={lines} data-chicken-nearby className="absolute" />
})

const TreeCollider = memo(function TreeCollider({ id, x, y, w, h, rot, tree, depth }: Pick<LayoutElement, 'id' | 'x' | 'y' | 'w' | 'h' | 'rot'> & { tree: NonNullable<LayoutElement['params']['tree']>; depth: number }) {
  const { box, floors, walls } = useMemo(() => {
    const el = { x, y, w, h, rot }
    const b = elementBounds(el)
    const surface = treeWorldSurfaces(el, tree)
    const encode = (groups: typeof surface.floors) => groups.map(line =>
      line.map(([x, y]) => `${(x - b.x).toFixed(2)},${(y - b.y).toFixed(2)}`).join(' ')).join('|')
    return { box: `${b.x},${b.y},${b.w},${b.h}`, floors: encode(surface.floors), walls: encode(surface.walls) }
  }, [x, y, w, h, rot, tree])
  if (!floors && !walls) return null
  return <div data-chicken-id={id} data-chicken-depth={depth} data-chicken-world-box={box} data-chicken-line={floors || undefined}
    data-chicken-walls={walls || undefined} data-chicken-nearby className="absolute" />
})

// a closed outline (a Chão or Parede, or any "Objeto duro"): the engine reads its edges as floors (facing up),
// walls (steep) and ceilings (facing down); `data-chicken-hard` makes all of them solid and blocks walking through
const ShapeCollider = memo(function ShapeCollider({ id, outline, hard, depth }: { id: string; outline: [number, number][]; hard: boolean; depth: number }) {
  const { box, shape } = useMemo(() => {
    const xs = outline.map(p => p[0]), ys = outline.map(p => p[1])
    const x = Math.min(...xs), y = Math.min(...ys)
    return {
      box: `${x},${y},${Math.max(...xs) - x},${Math.max(...ys) - y}`,
      shape: outline.map(([px, py]) => `${(px - x).toFixed(2)},${(py - y).toFixed(2)}`).join(" "),
    }
  }, [outline])
  return <div data-chicken-id={id} data-chicken-depth={depth} data-chicken-world-box={box} data-chicken-shape={shape} data-chicken-hard={hard || undefined} data-chicken-nearby className="absolute" />
})

// The rooms of the houses with someone of this browser inside (lib/pigchicken/house-rooms.ts): a hard ground floor
// and the storeys' one-way floors, read only by the engines of whoever is in that room (`data-chicken-room`; its
// walls and ceiling are her engine's limits, see parquinho.tsx). Nothing in front hides them.
const ROOM_DEPTH = 1e9
function HouseRoomColliders({ elements }: { elements: LayoutElement[] }) {
  const open = useSyncExternalStore(houseRoomsStore.subscribe, () => houseRoomsStore.open, () => houseRoomsStore.open)
  const rooms = useMemo(() => (open.size ? houseRooms(elements).filter(room => open.has(room.id)) : []), [elements, open])
  return <>{rooms.map(room => {
    const { l, t, r, b } = room.room, w = roomFloorSlab(room)
    return [
      <div key={`${room.id}:ground`} data-chicken-room={room.id} data-chicken-id={`room:${room.id}:ground`} data-chicken-depth={ROOM_DEPTH}
        data-chicken-world-box={`${w.l},${w.t},${w.r - w.l},${w.b - w.t}`} data-chicken-shape={`0,0 ${w.r - w.l},0 ${w.r - w.l},${w.b - w.t} 0,${w.b - w.t}`} data-chicken-hard data-chicken-nearby className="absolute" />,
      room.floors.length > 0 && <div key={`${room.id}:floors`} data-chicken-room={room.id} data-chicken-id={`room:${room.id}:floors`} data-chicken-depth={ROOM_DEPTH}
        data-chicken-world-box={`${l},${t},${r - l},${b - t}`} data-chicken-line={room.floors.map(y => `0,${(y - t).toFixed(2)} ${(r - l).toFixed(2)},${(y - t).toFixed(2)}`).join("|")} data-chicken-nearby className="absolute" />,
    ]
  })}</>
}

// what she stands on: one invisible box per solid element (its turned bounds); a sloped one is a ramp, a one-way
// floor along its upper edges. The ids stay the elements' own, so standing on one survives edits.
export const LayoutColliders = memo(function LayoutColliders({ elements }: { elements: LayoutElement[] }) {
  return (
    <div data-chicken-platforms className="pointer-events-none absolute inset-0">
      {elements.map((el, index) => {
        const depth = layoutCollisionDepth(el, index)
        // in a parallax depth it is only scenery
        if (el.depth) return null
        if (el.kind === "tree" && el.params.tree) {
          const tree = el.params.tree
          if (!tree.climbTrunk && !tree.walkBranches && !tree.walkCrown) return null
          return <TreeCollider key={el.id} id={el.id} x={el.x} y={el.y} w={el.w} h={el.h} rot={el.rot} tree={tree} depth={depth} />
        }
        if (!el.solid || ELEMENT_DEFS[el.kind].entity) return null
        if (el.kind === "trampoline" && el.params.trampoline) {
          return <div key={el.id} data-chicken-id={el.id} data-chicken-depth={depth} data-chicken-world-box={`${el.x},${el.y},${el.w},${el.h}`}
            data-chicken-bounce={`${el.params.trampoline.strength},${el.params.trampoline.angle}`} data-chicken-nearby className="absolute" />
        }
        if (el.kind === "house" && el.params.house) return <HouseCollider key={el.id} id={el.id} x={el.x} y={el.y} w={el.w} h={el.h} house={el.params.house} depth={depth} />
        const outline = elementOutline(el) ?? (isHard(el) ? elementCorners(el) : null)
        if (outline) return <ShapeCollider key={el.id} id={el.id} outline={outline} hard={isHard(el)} depth={depth} />
        const b = elementBounds(el)
        const line = elementFloorLine(el)
        return <div key={el.id} data-chicken-id={el.id} data-chicken-depth={depth} data-chicken-world-box={`${b.x},${b.y},${b.w},${b.h}`} data-chicken-line={line ?? undefined} className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
      })}
      <PowerFloors elements={elements} />
      <HouseRoomColliders elements={elements} />
    </div>
  )
})

// a full-screen layer above or below the chicken whose world element follows the camera
// filter: the sky's light on the scenery (Configurações do Pátio → Céu e luz)
// (its filter changes softly: the scenery goes dark while someone is inside a house, components/pigchicken/house-dusk.tsx)
export function FollowLayer({ z, opacity = 1, width, filter = "none", children }: { z: number; opacity?: number; width: number; filter?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? followCamera(ref.current) : undefined), [])
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: z, opacity, filter: filter === "none" ? undefined : filter, transition: "filter 280ms ease" }}>
      <div ref={ref} className="absolute left-0 top-0" style={{ width, height: WORLD_GROUND_Y }}>
        {children}
      </div>
    </div>
  )
}

export function PatioTreeStyles() { return <><TreeStyles /><CustomTreeStyles /><SceneryWindStyles /></> }
