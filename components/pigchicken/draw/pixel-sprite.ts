// Pixel art drawn once and stamped after: each drawing (its rows, already with the look of its eyes) in each set
// of colours becomes a small canvas of its own, one pixel per cell, and every frame draws only that image scaled
// with no smoothing. Painting cell by cell (a fillRect and a fillStyle for each one, about a hundred per alien) and
// a glow blurred for every cell weighed too much with many aliens on screen; an image per alien costs about the same
// whatever its art. Also the halo behind them: one gradient painted once, scaled to each.
type Ctx = CanvasRenderingContext2D
type Sprite = HTMLCanvasElement

function canvas(w: number, h: number): Sprite {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h))
  return c
}

// a drawing's sprites, by the key of its colours. The rows come from fixed frames or the eyes' cache (the same array
// each time), so they key the cache themselves; a handful of colour sets each (tints, flashes), capped all the same
const sprites = new WeakMap<readonly string[], Map<string, Sprite>>()
const MAX_PER_ROWS = 48
export function pixelSprite(rows: readonly string[], key: string, colours: () => (ch: string) => string): Sprite {
  let byKey = sprites.get(rows)
  if (!byKey) { byKey = new Map(); sprites.set(rows, byKey) }
  let s = byKey.get(key)
  if (s) return s
  const colourOf = colours()
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0)
  s = canvas(cols, rows.length)
  const ctx = s.getContext("2d")!
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      if (ch === ".") continue
      ctx.fillStyle = colourOf(ch); ctx.fillRect(c, r, 1, 1)
    }
  })
  if (byKey.size >= MAX_PER_ROWS) byKey.delete(byKey.keys().next().value!)
  byKey.set(key, s)
  return s
}

// the sprite stamped at (left, top) with `cell` screen pixels per cell, crisp
export function stampPixels(ctx: Ctx, sprite: Sprite, left: number, top: number, cell: number) {
  const smooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sprite, left, top, sprite.width * cell, sprite.height * cell)
  ctx.imageSmoothingEnabled = smooth
}

// a glow around a sprite (what a shadowBlur on each cell drew), blurred once: drawn under the sprite
const glows = new WeakMap<Sprite, Map<string, { img: Sprite; pad: number }>>()
export function stampGlow(ctx: Ctx, sprite: Sprite, left: number, top: number, cell: number, colour: string, blur: number) {
  let byColour = glows.get(sprite)
  if (!byColour) { byColour = new Map(); glows.set(sprite, byColour) }
  const key = `${colour}|${blur}|${cell}`
  let g = byColour.get(key)
  if (!g) {
    const pad = Math.ceil(blur * 2)
    const img = canvas(sprite.width * cell + pad * 2, sprite.height * cell + pad * 2)
    const x = img.getContext("2d")!
    x.imageSmoothingEnabled = false
    x.shadowColor = colour; x.shadowBlur = blur
    x.drawImage(sprite, pad, pad, sprite.width * cell, sprite.height * cell)
    g = { img, pad }
    byColour.set(key, g)
  }
  ctx.drawImage(g.img, left - g.pad, top - g.pad)
}

// a soft round halo (a radial gradient from `inner` of the radius out, `colour` fading to clear), drawn once and scaled
const halos = new Map<string, Sprite>()
const HALO = 64
export function stampHalo(ctx: Ctx, cx: number, cy: number, r: number, colour: string, clear: string, inner = 0.3) {
  const key = `${colour}|${clear}|${inner}`
  let h = halos.get(key)
  if (!h) {
    h = canvas(HALO * 2, HALO * 2)
    const x = h.getContext("2d")!
    const grad = x.createRadialGradient(HALO, HALO, HALO * inner, HALO, HALO, HALO)
    grad.addColorStop(0, colour); grad.addColorStop(1, clear)
    x.fillStyle = grad; x.beginPath(); x.arc(HALO, HALO, HALO, 0, Math.PI * 2); x.fill()
    halos.set(key, h)
  }
  ctx.drawImage(h, cx - r, cy - r, r * 2, r * 2)
}
