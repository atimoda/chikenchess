// The glow of the items on the floor (Configurações do Pátio → Brilho dos itens; lib/pigchicken/item-glow.ts):
// a column of light standing on the item's spot, the light it casts on the floor, and a lit outline around the item.
// The column and each item's outline are drawn once into small canvases and kept (by color, and by item image).
import { itemImage } from "@/lib/pigchicken/art"
import { itemGlowLook, type ItemGlowLook } from "@/lib/pigchicken/item-glow"
import { type ItemId } from "@/lib/pigchicken/items"
import { type Ctx } from "./shared"

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) || 0)

// the column: brightest at the floor and along its middle (almost white there), fading up and out to the sides
const BEAM_W = 64, BEAM_H = 256
const beams = new Map<string, HTMLCanvasElement>()
function beamSprite(color: string) {
  let c = beams.get(color)
  if (c) return c
  c = document.createElement("canvas"); c.width = BEAM_W; c.height = BEAM_H
  const g = c.getContext("2d")!, img = g.createImageData(BEAM_W, BEAM_H), [r, gr, b] = rgb(color)
  for (let y = 0; y < BEAM_H; y++) {
    const t = (y + 0.5) / BEAM_H // 0 at the top, 1 at the floor
    const up = t ** 1.7 * Math.min(1, (1 - t) * 40 + 0.6) // the very bottom softens into the floor's light
    for (let x = 0; x < BEAM_W; x++) {
      const n = ((x + 0.5) / BEAM_W) * 2 - 1
      const core = Math.exp(-((n / 0.22) ** 2)), soft = Math.exp(-((n / 0.55) ** 2))
      const a = Math.min(1, (0.6 * soft + 0.55 * core) * up)
      const w = core * 0.35 * t // whiter in the middle, low down
      const i = (y * BEAM_W + x) * 4
      img.data[i] = r + (255 - r) * w; img.data[i + 1] = gr + (255 - gr) * w; img.data[i + 2] = b + (255 - b) * w
      img.data[i + 3] = a * 255
    }
  }
  g.putImageData(img, 0, 0)
  beams.set(color, c)
  return c
}

/** The column of light and the floor's light at an item lying at (x, floorY), behind the item. */
export function drawItemBeam(ctx: Ctx, x: number, floorY: number, look: ItemGlowLook, color: string, flicker: number) {
  const beam = beamSprite(color)
  ctx.save()
  ctx.globalAlpha = Math.min(1, look.beam * flicker)
  ctx.drawImage(beam, x - look.beamW / 2, floorY - look.beamH, look.beamW, look.beamH)
  // the light it casts on the floor
  const pr = look.beamW * 0.85, pool = ctx.createRadialGradient(x, floorY, 0, x, floorY, pr)
  const [r, g, b] = rgb(color)
  pool.addColorStop(0, `rgba(${r},${g},${b},${look.pool * flicker})`); pool.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.globalAlpha = 1; ctx.fillStyle = pool
  ctx.beginPath(); ctx.ellipse(x, floorY - 2, pr, pr * 0.22, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// the outline of one item at one size: the soft light around it and a crisp lit edge (2× for sharp edges)
const RES = 2
const outlines = new WeakMap<CanvasImageSource, Map<string, { c: HTMLCanvasElement; pad: number }>>()
function outlineSprite(img: CanvasImageSource, w: number, h: number, color: string, look: ItemGlowLook, step: number) {
  let byKey = outlines.get(img)
  if (!byKey) { byKey = new Map(); outlines.set(img, byKey) }
  const key = `${color}|${w.toFixed(1)}x${h.toFixed(1)}|${step}`
  const had = byKey.get(key)
  if (had) return had
  const pad = Math.ceil(look.haloR * 2 + look.rimW + 2)
  const W = Math.ceil((w + pad * 2) * RES), H = Math.ceil((h + pad * 2) * RES)
  // the item's shape filled with the color
  const shape = document.createElement("canvas"); shape.width = W; shape.height = H
  const s = shape.getContext("2d")!
  s.drawImage(img, pad * RES, pad * RES, w * RES, h * RES)
  s.globalCompositeOperation = "source-in"; s.fillStyle = color; s.fillRect(0, 0, W, H)
  const c = document.createElement("canvas"); c.width = W; c.height = H
  const g = c.getContext("2d")!
  // the soft light: only the shadow of the shape, drawn far off the canvas
  g.shadowColor = color; g.shadowBlur = look.haloR * RES; g.shadowOffsetX = W * 2
  g.globalAlpha = look.halo
  for (let i = 0; i < 1 + Math.round(look.halo * 2); i++) g.drawImage(shape, -W * 2, 0) // stronger as it grows
  g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetX = 0
  // the crisp edge: the shape pushed out around the item
  g.globalAlpha = look.rim
  const r = look.rimW * RES
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.drawImage(shape, Math.cos(a) * r, Math.sin(a) * r) }
  const out = { c, pad }
  byKey.set(key, out)
  return out
}

/** The lit outline around an item drawn by drawItem(ctx, item, maxW, maxH) at the current origin, before the item. */
// (kept in steps of 5 of the amount, so dragging the slider makes at most 20 of them per item and color)
export function drawItemOutline(ctx: Ctx, item: ItemId, maxW: number, maxH: number, color: string, amount: number) {
  const im = itemImage(item)
  if (!im) return
  const [, , bw, bh] = im.box
  const k = Math.min(maxW / bw, maxH / bh), w = bw * k, h = bh * k
  const step = Math.max(1, Math.round(amount / 5)), look = itemGlowLook(step * 5)
  if (!look) return
  const { c, pad } = outlineSprite(im.img, w, h, color, look, step)
  ctx.drawImage(c, -w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2)
}
