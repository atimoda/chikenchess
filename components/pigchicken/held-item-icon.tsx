"use client"

// The outline of the item the main player holds (weapon, instrument or consumable), in the button's colour, like the
// Personagem button's outline of the boneco. Empty-handed (or an item with no drawing, as Pig's chain): `fallback`.
import { useEffect, useId, useMemo, useState, type ReactNode } from "react"
import { ITEM_BOX, ITEM_SVG } from "@/lib/pigchicken/art"
import { currentHeldItem, subscribeHeldItem, type ItemId } from "@/lib/pigchicken/items"

export function useHeldItem(): ItemId | null {
  const [held, setHeld] = useState<ItemId | null>(null)
  useEffect(() => { setHeld(currentHeldItem()); return subscribeHeldItem(setHeld) }, [])
  return held
}

export function HeldItemIcon({ className, fallback }: { className?: string; fallback: ReactNode }) {
  const item = useHeldItem()
  const id = useId().replace(/:/g, "")
  const art = item ? ITEM_SVG[item] : undefined, box = item ? ITEM_BOX[item] : undefined
  const shape = useMemo(() => {
    if (!art || !box) return null
    // a square around the drawing, with room for the ring; the ring keeps about the same width at any item size
    const [x, y, w, h] = box, side = Math.max(w, h), r = side * 0.04, pad = r * 2
    const view = [x + w / 2 - side / 2 - pad, y + h / 2 - side / 2 - pad, side + pad * 2, side + pad * 2].map(n => n.toFixed(2)).join(" ")
    const f = `it${id}`
    const html = `<defs><filter id="${f}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${r.toFixed(2)}" result="grown"/><feComposite in="grown" in2="SourceAlpha" operator="out" result="ring"/><feFlood flood-color="currentColor"/><feComposite in2="ring" operator="in"/></filter></defs><g filter="url(#${f})">${art}</g>`
    return { view, html }
  }, [art, box, id])
  if (!shape) return <>{fallback}</>
  return <svg viewBox={shape.view} aria-hidden="true" className={className} dangerouslySetInnerHTML={{ __html: shape.html }} />
}
