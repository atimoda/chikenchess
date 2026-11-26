"use client"

// "Gaiolas" in the Itens panel: the six models one under the other. Each one empty and as full as its limit (the
// souls where the game puts them: the same image the Pátio draws, components/pigchicken/draw/cages.ts) over its limit.
import { useT } from "@/lib/i18n"
import { useEffect, useMemo, useRef } from "react"
import { PatioRange } from "@/components/ui/patio-range"
import { cageArt } from "@/lib/pigchicken/cage-art"
import { newCage, sampleSouls } from "@/lib/pigchicken/cages"
import { CAGE_IDS, DEFAULT_ITEMS, ITEM_PARAM_META, type ItemDef, type ItemId } from "@/lib/pigchicken/items"
import { cageArtVersion, cagePic } from "./draw/cages"

const LIMIT = ITEM_PARAM_META.find(m => m.key === "cageSouls")!
// every model at the same scale: the widest one takes its whole column
const WIDEST = Math.max(...CAGE_IDS.map(id => cageArt(id).w))

function CagePicture({ item, souls }: { item: ItemId; souls: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const art = cageArt(item)
  const cage = useMemo(() => ({ ...newCage(Math.max(1, souls)), souls: sampleSouls(souls) }), [souls])
  useEffect(() => {
    // the art loads a moment after it is first asked for: painted again whenever a piece of it arrives
    let raf = 0, seen = -1
    const paint = () => {
      raf = requestAnimationFrame(paint)
      const version = cageArtVersion()
      if (version === seen) return
      const pic = cagePic(item, cage), canvas = ref.current
      if (!pic || !canvas) return
      canvas.width = pic.width; canvas.height = pic.height
      canvas.getContext("2d")!.drawImage(pic, 0, 0)
      seen = version
    }
    paint()
    return () => cancelAnimationFrame(raf)
  }, [item, cage])
  return <canvas ref={ref} aria-hidden className="mx-auto block" style={{ width: `${art.w / WIDEST * 100}%`, aspectRatio: `${art.w} / ${art.h}` }} />
}

export function CagesView({ items, onChange }: { items: Record<ItemId, ItemDef>; onChange: (id: ItemId, souls: number) => void }) {
  const t = useT()
  return (
    <div className="grid gap-5 px-4 py-4">
      {CAGE_IDS.map(id => {
        const n = items[id].cageSouls, base = DEFAULT_ITEMS[id].cageSouls
        return (
          <div key={id} className="grid gap-2">
            {/* a sky behind them: the black models and the white one both read on it */}
            <div className="grid grid-cols-2 items-end gap-3 rounded-md bg-[#5d7386] px-2 py-3">
              <CagePicture item={id} souls={0} />
              <CagePicture item={id} souls={n} />
            </div>
            <PatioRange label={t(items[id].name)} name={`${t(items[id].name)}: ${t(LIMIT.label)}`} min={LIMIT.min} max={LIMIT.max} step={LIMIT.step} value={n}
              display={`${n} ${t(LIMIT.unit ?? "")}`} changed={n !== base} hint={LIMIT.hint ? t(LIMIT.hint) : undefined}
              onChange={v => onChange(id, v)} onReset={() => onChange(id, base)} />
          </div>
        )
      })}
    </div>
  )
}
