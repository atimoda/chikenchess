"use client"

// The Escalas panel's preview: the selected scale's own drawing (the same one the Pátio's Escalas layer puts around
// the player, draw/scale-fan.ts), whole and always visible, redrawn as its numbers change. It is in the Pátio's key
// and on the bar's chord, with the register of the instrument the main player holds (or the first one that plays
// the scale). The pointer over it is the aim: the cell under it lights up, as it would in the Pátio. It is drawn
// whole, solid and with its lines, whatever the layer's own look (Camadas: strength, Degradê, Linhas) is.
// The Bateria has its own chart, in its kit's editor (drum-kit-editor.tsx).
import { useEffect, useRef, useState } from "react"
import { useT } from "@/lib/i18n"
import { drawScaleShape } from "@/components/pigchicken/draw/scale-fan"
import { INSTRUMENT_SCALES, type InstrumentScaleId } from "@/lib/pigchicken/instrument-scales"
import { DEFAULT_ITEMS, currentHeldItem, hangOf, loadItems, subscribeItems, type ItemDef, type ItemId } from "@/lib/pigchicken/items"
import { previewInstrument, scaleStage } from "@/lib/pigchicken/scale-preview"
import type { ScaleParams } from "@/lib/pigchicken/scale-params"

// room around the drawing; the Cordas soltas write the aimed string's note past its tip
const pad = (scale: InstrumentScaleId) => (scale === "strings" ? 18 : 6)

export function ScalePreview({ scale, params, className }: { scale: InstrumentScaleId; params: ScaleParams; className?: string }) {
  const t = useT()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [items, setItems] = useState<Record<ItemId, ItemDef>>(DEFAULT_ITEMS)
  // the pointer over the preview, from its middle: the aim's direction and reach (null: away)
  const aim = useRef<{ angle: number; reach: number } | null>(null)
  useEffect(() => { setItems(loadItems()); return subscribeItems(setItems) }, [])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    let raf = 0, last = ""
    const frame = () => {
      raf = requestAnimationFrame(frame)
      const w = c.clientWidth, h = c.clientHeight
      if (!w || !h) return
      const music = scaleStage(), d = previewInstrument(items, scale, currentHeldItem()), a = aim.current
      // drawn again only when something it shows changed: the size, the key, the bar's chord, the instrument or the aim
      const dpr = window.devicePixelRatio || 1
      const z = music.zone
      const key = [w, h, dpr, z.id, z.root, z.scale, z.chordScale, music.degree, d?.id, a?.angle, a?.reach].join("|")
      if (key === last) return
      last = key
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
      const ctx = c.getContext("2d")
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (!d) return
      drawScaleShape(ctx, INSTRUMENT_SCALES[scale], music, {
        set: d.pitchSet, octave: d.octave, span: d.span, descending: d.spiralDescending, hang: hangOf(d),
        aim: a ? a.angle : null, reach: a ? a.reach : 1, fade: 0, still: true,
      }, w / 2, h / 2, Math.max(1, Math.min(w, h) / 2 - pad(scale)), 1, 1, 1)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // (params: the scale's shape numbers are already in the scale itself; a change draws it again)
  }, [scale, params, items])

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = e.currentTarget.getBoundingClientRect(), r = Math.max(1, Math.min(b.width, b.height) / 2 - pad(scale))
    const x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top - b.height / 2
    aim.current = { angle: Math.atan2(y, x), reach: Math.hypot(x, y) / r }
  }
  const onAway = () => { aim.current = null }
  return <canvas ref={canvas} data-no-drag aria-label={t("Prévia da escala {name}", { name: t(INSTRUMENT_SCALES[scale].label) })} onPointerDown={onMove} onPointerMove={onMove} onPointerLeave={onAway} onPointerCancel={onAway} className={className} />
}
