"use client"

// "Camadas do fundo" in a Poste's or Torre's Editar: the layers of the scenery far behind (sky, clouds, each mountain
// range, the tree lines), farthest first. Picking one pins the pole to a fixed point of that layer
// (LayoutElement.backdrop, lib/pigchicken/backdrop-layers.ts): it takes the layer's depth, stands on its crest (or
// its ground) right below, and from then on slides exactly like it, on every screen. Picking it again lets go,
// keeping the depth. While the list is open, pointing at a row shows that layer alone.
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { depthOffset } from "@/lib/pigchicken/live-camera"
import { BACKDROP_DEPTH, backdropLayers, moveToDepth, type BackdropLayerId } from "@/lib/pigchicken/backdrop-layers"
import type { LayoutElement } from "@/lib/pigchicken/layout"
import type { MountainParams } from "@/lib/pigchicken/mountains"
import { useT } from "@/lib/i18n"

// what the Pátio's backdrop shows: its width, ranges, and whether it has clouds and the tree lines
export type BackdropScene = { worldW: number; mountains: MountainParams; clouds: boolean; forest: boolean }

// shows one backdrop layer alone (the others faint), or all of them again (null)
function focusLayer(id: BackdropLayerId | null) {
  document.querySelectorAll<SVGElement | HTMLElement>("[data-backdrop-layer]").forEach(node => {
    node.style.opacity = id && node.dataset.backdropLayer !== id ? "0.12" : ""
  })
}

export function BackdropPin({ el, scene, onChange }: { el: LayoutElement; scene: BackdropScene; onChange: (el: LayoutElement) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<BackdropLayerId | null>(null)
  const layers = useMemo(() => backdropLayers(scene), [scene])
  // pointing at a row shows that layer alone; with the list open and nothing pointed, the pinned one
  const shown = open ? hover ?? el.backdrop ?? null : null
  useEffect(() => { focusLayer(shown); return () => focusLayer(null) }, [shown])
  const pin = (id: BackdropLayerId) => onChange(el.backdrop === id
    ? moveToDepth(el, { depth: BACKDROP_DEPTH[id] }, depthOffset)
    : moveToDepth(el, { depth: 0, backdrop: id }, depthOffset, { worldW: scene.worldW, mountains: scene.mountains }))
  return <div className="grid gap-1">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
      title={t("Prende a um ponto fixo de uma camada do fundo: ele anda junto com ela quando a câmera se move.")}
      className={cn("h-9 shrink-0 rounded-md border", open ? "border-[#7bdff2] bg-[#7bdff2]/15 text-white" : "border-white/15 hover:border-white/40")}>
      {t("Camadas do fundo")}
    </button>
    {open && <div role="radiogroup" aria-label={t("Camadas do fundo")} className="grid gap-1" onPointerLeave={() => setHover(null)}>
      {layers.map(l => (
        <button key={l.id} type="button" role="radio" aria-checked={el.backdrop === l.id} onClick={() => pin(l.id)}
          onPointerEnter={() => setHover(l.id)} onFocus={() => setHover(l.id)} onBlur={() => setHover(null)}
          className={cn("flex h-8 items-center justify-between rounded-md border px-2 text-left",
            el.backdrop === l.id ? "border-[#7bdff2] bg-[#7bdff2]/15 text-white" : "border-white/10 hover:border-white/30")}>
          <span>{t(l.label)}</span><span className="text-[#93a79a]">{Math.round(l.depth * 100)}%</span>
        </button>
      ))}
    </div>}
  </div>
}
