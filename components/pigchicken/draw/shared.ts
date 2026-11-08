// Shared canvas helpers for the Parquinho drawing: the context type and item art.
// Split out of parquinho.tsx; the component there owns the loop and calls these each frame.
import { type ItemId } from "@/lib/pigchicken/items"
import { itemImage } from "@/lib/pigchicken/art"

// ---------- drawing (canvas, screen pixels) ----------
export type Ctx = CanvasRenderingContext2D
export function drawItem(ctx: Ctx, item: ItemId, maxW: number, maxH: number, atGrip = false) {
  const im = itemImage(item)
  if (!im) return
  const [x, y, w, h] = im.box
  const k = Math.min(maxW / w, maxH / h)
  if (atGrip) ctx.drawImage(im.img, x * k, y * k, w * k, h * k)
  else ctx.drawImage(im.img, -w * k / 2, -h * k / 2, w * k, h * k)
}
