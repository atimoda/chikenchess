"use client"

// The Pátio drawn from its layout (lib/pigchicken/layout.ts): each layer's scenery (platforms, trees) and the
// invisible floors and walls the chicken's engine reads (`data-chicken-platforms`). The game's own things
// (dummies, racks, buttons) are drawn on the game's canvas (parquinho.tsx) and only placed from here.
import { memo, useEffect, useMemo, useRef } from "react"
import { ELEMENT_DEFS, elementBounds, elementFloorLine, layoutCollisionDepth, treeWorldSurfaces, type LayoutElement, type LayoutLayer } from "@/lib/pigchicken/layout"
import { houseSurfaces, normalizeHouse } from "@/lib/pigchicken/houses"
import { TRAMPOLINE_DEFAULTS, TRAMPOLINE_LEVELS } from "@/lib/pigchicken/trampoline"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"
import { followCamera } from "@/lib/pigchicken/live-camera"
import { TreeArt, TreeStyles } from "./patio-trees"
import { SceneryRegion } from "./scenery-region"
import { HouseArt } from "./house-art"
import { CustomTreeArt, CustomTreeStyles } from "./tree-art"
import { SceneryWindStyles } from "./scenery-wind-bend"
import { LanesArt, ZoneArt } from "./sound-zone-art"

// one element's art filling its box
export const ElementArt = memo(function ElementArt({ el, worldX, editing }: { el: Pick<LayoutElement, "kind" | "params" | "w" | "h">; worldX?: number; editing?: boolean }) {
  if (el.kind === "zone") return el.params.zone ? <ZoneArt zone={el.params.zone} /> : null
  if (el.kind === "lanes") return el.params.lanes ? <LanesArt lanes={el.params.lanes} w={el.w} h={el.h} editing={editing} /> : null
  if (el.kind === "house") return <HouseArt house={el.params.house ?? normalizeHouse(null)} />
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

// the scenery of one layer, in world units (the parent moves with the camera)
export const LayoutLayerView = memo(function LayoutLayerView({ elements, layer, editing }: { elements: LayoutElement[]; layer: LayoutLayer; editing: boolean }) {
  return (
    <>
      {elements.map(el => {
        if (ELEMENT_DEFS[el.kind].entity || el.layer !== layer) return null
        if (el.hidden && !editing) return null
        return (
          <SceneryRegion
            key={el.id}
            bounds={elementBounds(el)}
            aria-hidden="true"
            data-patio-el={el.id}
            className="absolute"
            style={{
              left: el.x, top: el.y, width: el.w, height: el.h,
              transform: el.rot ? `translate3d(0,0,0) rotate(${el.rot}deg)` : (el.kind === "pine" || el.kind === "blossom") ? "translate3d(0,0,0)" : undefined,
              opacity: el.hidden ? 0.35 * el.opacity : el.opacity,
              outline: el.hidden ? "2px dashed rgba(255,255,255,0.5)" : undefined,
            }}
          >
            <ElementArt el={el} editing={editing} worldX={el.kind === "tree" || el.kind === "pine" || el.kind === "blossom" ? el.x + el.w / 2 : undefined} />
          </SceneryRegion>
        )
      })}
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

// what she stands on: one invisible box per solid element (its turned bounds); a sloped one is a ramp, a one-way
// floor along its upper edges. The ids stay the elements' own, so standing on one survives edits.
export const LayoutColliders = memo(function LayoutColliders({ elements }: { elements: LayoutElement[] }) {
  return (
    <div data-chicken-platforms className="pointer-events-none absolute inset-0">
      {elements.map((el, index) => {
        const depth = layoutCollisionDepth(el, index)
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
        const b = elementBounds(el)
        const line = elementFloorLine(el)
        return <div key={el.id} data-chicken-id={el.id} data-chicken-depth={depth} data-chicken-world-box={`${b.x},${b.y},${b.w},${b.h}`} data-chicken-line={line ?? undefined} className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
      })}
    </div>
  )
})

// a full-screen layer above or below the chicken whose world element follows the camera
export function FollowLayer({ z, opacity = 1, width, children }: { z: number; opacity?: number; width: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? followCamera(ref.current) : undefined), [])
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: z, opacity }}>
      <div ref={ref} className="absolute left-0 top-0" style={{ width, height: WORLD_GROUND_Y }}>
        {children}
      </div>
    </div>
  )
}

export function PatioTreeStyles() { return <><TreeStyles /><CustomTreeStyles /><SceneryWindStyles /></> }
