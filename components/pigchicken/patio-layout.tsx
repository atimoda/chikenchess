"use client"

// The Pátio drawn from its layout (lib/pigchicken/layout.ts): each layer's scenery (platforms, trees) and the
// invisible floors and walls the chicken's engine reads (`data-chicken-platforms`). The game's own things
// (dummies, racks, buttons) are drawn on the game's canvas (parquinho.tsx) and only placed from here.
import { memo, useEffect, useRef } from "react"
import { ELEMENT_DEFS, elementBounds, elementFloorLine, type LayoutElement, type LayoutLayer } from "@/lib/pigchicken/layout"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"
import { followCamera } from "@/lib/pigchicken/live-camera"
import { TreeArt, TreeStyles } from "./patio-trees"

// one element's art filling its box
export const ElementArt = memo(function ElementArt({ el }: { el: Pick<LayoutElement, "kind" | "params" | "w" | "h"> }) {
  if (el.kind === "portal") return <div className="absolute inset-0 rounded-full border-[3px] border-[#7cc4ff] bg-blue-950/60 shadow-[0_0_8px_#408cff,inset_0_0_8px_#408cff]" />
  if (el.kind === "pine" || el.kind === "blossom") return <TreeArt kind={el.kind} seed={el.params.seed ?? 1} flip={el.params.flip} delay={((el.params.seed ?? 0) % 70) / 10} />
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
          <div
            key={el.id}
            aria-hidden="true"
            data-patio-el={el.id}
            className="absolute"
            style={{
              left: el.x, top: el.y, width: el.w, height: el.h,
              transform: el.rot ? `rotate(${el.rot}deg)` : undefined,
              opacity: el.hidden ? 0.35 * el.opacity : el.opacity,
              outline: el.hidden ? "2px dashed rgba(255,255,255,0.5)" : undefined,
            }}
          >
            <ElementArt el={el} />
          </div>
        )
      })}
    </>
  )
})

// what she stands on: one invisible box per solid element (its turned bounds); a sloped one is a ramp, a one-way
// floor along its upper edges. The ids stay the elements' own, so standing on one survives edits.
export const LayoutColliders = memo(function LayoutColliders({ elements }: { elements: LayoutElement[] }) {
  return (
    <div data-chicken-platforms className="pointer-events-none absolute inset-0">
      {elements.map(el => {
        if (!el.solid || ELEMENT_DEFS[el.kind].entity) return null
        const b = elementBounds(el)
        const line = elementFloorLine(el)
        return <div key={el.id} data-chicken-id={el.id} data-chicken-line={line ?? undefined} className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
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
      <div ref={ref} className="absolute left-0 top-0 will-change-transform" style={{ width, height: WORLD_GROUND_Y }}>
        {children}
      </div>
    </div>
  )
}

export { TreeStyles }
