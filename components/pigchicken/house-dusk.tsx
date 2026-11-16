"use client"

// While one of this browser's players is inside a house (docs/mechanics/patio/houses.md), the rest of the scenery
// goes dark: a veil over the whole world, with the open houses drawn again over it, and the layers in front of the
// characters dimmed by the same amount. The characters, the items and what is fired keep their colours, as with the
// hour's light.
import { useEffect, useState, useSyncExternalStore } from "react"
import { HOUSE_DUSK, houseDuskFilter } from "@/lib/pigchicken/house-rooms"
import { houseRoomsStore } from "@/lib/pigchicken/house-rooms-store"
import { normalizeHouse } from "@/lib/pigchicken/houses"
import type { LayoutElement } from "@/lib/pigchicken/layout"
import { PlacedHouseArt } from "./house-art"

const FADE_MS = 280
export const HOUSE_DUSK_FADE = `${FADE_MS}ms ease`

const useOpenHouses = () => useSyncExternalStore(houseRoomsStore.subscribe, () => houseRoomsStore.open, () => houseRoomsStore.open)

// the filter of a layer drawn in front of the world (ParquinhoForeground)
export function useHouseDuskFilter(filter: string) {
  return houseDuskFilter(filter, useOpenHouses().size > 0)
}

// in the world, over everything of it. lit: the hour's light on the scenery, for the houses drawn again
export function HouseDusk({ elements, lit }: { elements: LayoutElement[]; lit?: React.CSSProperties }) {
  const open = useOpenHouses()
  const dark = open.size > 0
  // it comes and goes softly: in the page a moment before it darkens and a moment after it clears
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (dark) { setMounted(true); return }
    const t = setTimeout(() => setMounted(false), FADE_MS)
    return () => clearTimeout(t)
  }, [dark])
  if (!dark && !mounted) return null
  return <div aria-hidden="true" data-house-dusk className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
    <div className="absolute" style={{ left: -4000, right: -4000, top: -6000, bottom: -4000, background: "#05060c", opacity: dark && mounted ? 1 - HOUSE_DUSK : 0, transition: `opacity ${HOUSE_DUSK_FADE}` }} />
    {elements.map(el => el.kind === "house" && open.has(el.id) && <div key={el.id} className="absolute" style={{ left: el.x, top: el.y, width: el.w, height: el.h, opacity: el.opacity, ...lit }}>
      <PlacedHouseArt id={el.id} house={el.params.house ?? normalizeHouse(null)} />
    </div>)}
  </div>
}
