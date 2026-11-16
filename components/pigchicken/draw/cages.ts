// The Gaiolas on the canvas (lib/pigchicken/cages.ts; the art is in lib/pigchicken/cage-art.ts). A cage with its
// souls is one small image, painted again only when what is in it changes: the far bars, each soul as a still sprite
// (the birds anywhere inside, the chicks standing on the floor, always in the same place for the same soul) and the
// near bars. So many full cages on the screen cost one drawImage each. Here too: the first player's cages hanging in
// the top left corner (they swing with the camera), every cage's counter as its model's silhouette, and the avatar
// with those counters that says where another player is.
import { cageArt } from "@/lib/pigchicken/cage-art"
import { CAGE_FLASH, SWAY, cageEnter, newSway, soulSpot, swayStep, type CageFlash, type CageState, type Sway } from "@/lib/pigchicken/cages"
import type { ItemId } from "@/lib/pigchicken/items"
import { soulCatalogVersion } from "@/lib/pigchicken/soul-library"
import { CHICK_STYLES, chickArt } from "@/lib/chicken/chick-art"
import { LOOK_ART, type ChickenLook } from "@/lib/chicken/look-art"
import { stageWidth } from "@/lib/stage-size"
import { drawSoulArt, soulLook } from "./soul-art"
import { type Ctx } from "./shared"

const GLOW: Record<CageFlash, string> = { gain: "#4cc9f0", lose: "#ff5a5a" }
const DARK = "rgba(8,15,13,0.94)"

// ---------- the art as images (they load a moment after they are first asked for) ----------
let artVersion = 0
function svgImage(svg: string) {
  const img = new Image()
  img.onload = () => { artVersion++ }
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return img
}
const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
/** goes up when a piece of art finishes loading: a cage's image asked for before that is painted again */
export const cageArtVersion = () => artVersion

const PIC_K = 2 // pixels of a cage's image per unit of its art
const layers = new Map<ItemId, { back: HTMLImageElement; front: HTMLImageElement }>()
function cageLayers(item: ItemId) {
  let l = layers.get(item)
  if (!l) {
    const a = cageArt(item)
    const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w * PIC_K}" height="${a.h * PIC_K}" viewBox="0 0 ${a.w} ${a.h}">${a.defs ? `<defs>${a.defs}</defs>` : ""}${body}</svg>`
    l = { back: svgImage(wrap(a.back)), front: svgImage(wrap(a.front)) }
    layers.set(item, l)
  }
  return l
}

// a chick standing still, in its style (the place in CHICK_STYLES it was hatched with)
const CHICK_VIEW = { x: -80, y: -186, w: 170, h: 188 }
const chickPics = new Map<number, HTMLImageElement>()
function chickPic(style: number) {
  let img = chickPics.get(style)
  if (!img) {
    const st = CHICK_STYLES[style] ?? CHICK_STYLES[0], a = chickArt(st), eye = a.face.eyeAt ?? [52, -154]
    const leg = (x: number) => `<path d="M${x} -30 L${x} -3 M${x} -3 l10 2 M${x} -3 l-7 2" stroke="${st.legs}" stroke-width="5" stroke-linecap="round" fill="none"/>`
    img = svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="${CHICK_VIEW.w}" height="${CHICK_VIEW.h}" viewBox="${CHICK_VIEW.x} ${CHICK_VIEW.y} ${CHICK_VIEW.w} ${CHICK_VIEW.h}">${leg(-16)}${leg(8)}${a.tail.svg ?? ""}${a.torso.svg ?? ""}${a.neck.svg ?? ""}${a.face.svg ?? ""}${a.beak.svg ?? ""}${a.wing.svg ?? ""}<circle cx="${eye[0]}" cy="${eye[1]}" r="4.4" fill="#1a1614"/></svg>`)
    chickPics.set(style, img)
  }
  return img
}

/** a chick standing still with its feet at (x, y), `h` tall, in its style; nothing while its picture loads */
export function drawChickStill(ctx: Ctx, style: number, x: number, y: number, h: number, face: number) {
  const img = chickPic(style)
  if (!ready(img)) return false
  const w = h * CHICK_VIEW.w / CHICK_VIEW.h
  ctx.save(); ctx.translate(x, y); ctx.scale(face < 0 ? -1 : 1, 1)
  ctx.drawImage(img, CHICK_VIEW.x / CHICK_VIEW.w * w, CHICK_VIEW.y / CHICK_VIEW.h * h, w, h)
  ctx.restore()
  return true
}

// ---------- a cage with its souls, as one image ----------
const BIRD_CELL = 1.9 // units of the cage's art per pixel of a bird
const CHICK_H = 27 // a chick's height, in units of the cage's art
type Pic = { canvas: HTMLCanvasElement; key: string }
const pics = new WeakMap<CageState, Pic>()
/** the cage's image (PIC_K px per unit of its art); null while its art loads */
export function cagePic(item: ItemId, cage: CageState): HTMLCanvasElement | null {
  const l = cageLayers(item)
  if (!ready(l.back) || !ready(l.front)) return null
  // what is in it, in order (a stack: almost always only its top changes)
  let h = cage.souls.length
  for (const s of cage.souls) h = (Math.imul(h, 31) + s.id) | 0
  const key = `${item}|${h}|${artVersion}|${soulCatalogVersion()}`
  let pic = pics.get(cage)
  if (pic?.key === key) return pic.canvas
  if (!pic) { pic = { canvas: document.createElement("canvas"), key: "" }; pics.set(cage, pic) }
  const a = cageArt(item), c = pic.canvas
  c.width = a.w * PIC_K; c.height = a.h * PIC_K
  const g = c.getContext("2d")!
  g.drawImage(l.back, 0, 0, c.width, c.height)
  g.save(); g.scale(PIC_K, PIC_K)
  const [bx, by, bw, bh] = a.birds, [fx0, fx1, fy] = a.floor
  for (const s of cage.souls) {
    const at = soulSpot(s.id)
    if (s.species === "chick") {
      // its feet on the floor, a little into it for the ones further back
      drawChickStill(g, s.chick ?? 0, fx0 + 8 + at.u * Math.max(0, fx1 - fx0 - 16), fy - at.v * 3, CHICK_H, at.face)
    } else {
      const look = soulLook(s), k = BIRD_CELL / look.pixel
      g.save(); g.translate(bx + at.u * bw, by + at.v * bh); g.scale(k, k)
      drawSoulArt(g, 0, 0, at.face, 0, look, false, true) // resting, its wing folded
      g.restore()
    }
  }
  g.restore()
  g.drawImage(l.front, 0, 0, c.width, c.height)
  pic.key = key
  return c
}

/** A cage hanging from (x, y) (the top of its hook), `s` px per unit of its art, swung by `a` rad around that point.
 * It glows blue for a moment when a soul comes in and red when one goes out. */
export function drawCage(ctx: Ctx, item: ItemId, cage: CageState, x: number, y: number, s: number, a = 0) {
  const pic = cagePic(item, cage), art = cageArt(item)
  if (!pic) return
  ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a)
  if (cage.flash && cage.flashT > 0) { ctx.shadowColor = GLOW[cage.flash]; ctx.shadowBlur = 34 * (cage.flashT / CAGE_FLASH) }
  ctx.drawImage(pic, -art.hang[0] * s, -art.hang[1] * s, art.w * s, art.h * s)
  ctx.restore()
}
/** a cage standing on the floor at (x, floor): the world's pickups */
export const CAGE_WORLD_SCALE = 0.5
export function drawCageOnFloor(ctx: Ctx, item: ItemId, cage: CageState, x: number, floor: number) {
  const art = cageArt(item), s = CAGE_WORLD_SCALE
  drawCage(ctx, item, cage, x, floor - (art.h - art.hang[1]) * s, s)
}

// ---------- the first player's cages, hanging in the top left corner ----------
export type CageLike = { item: ItemId; cage?: CageState }
// seen: where each cage is drawn now (it eases to its place when they turn) and how many souls it had
export type CageHud = { sways: Sway[]; seen: WeakMap<CageState, { x: number; len: number; s: number; n: number; cx: number; cy: number }>; camV: number }
export const newCageHud = (): CageHud => ({ sways: [newSway(), newSway(), newSway()], seen: new WeakMap(), camV: 0 })
/** the camera moved at camVx px/s this frame: the cages lag behind its changes of speed */
export function stepCageHud(hud: CageHud, camVx: number, dt: number) {
  if (dt <= 0) return
  const accel = Math.max(-1600, Math.min(1600, (camVx - hud.camV) / dt))
  hud.camV = camVx
  hud.sways.forEach((s, i) => swayStep(s, accel * [1, 0.8, 1.25][i], dt))
}
/** where a cage of the HUD is on the screen (the middle of its souls); null: not drawn yet */
export const cageHudSpot = (hud: CageHud, cage: CageState | null | undefined) => { const v = cage ? hud.seen.get(cage) : null; return v ? { x: v.cx, y: v.cy } : null }

export type CageBox = { i: number; x: number; y: number; w: number; h: number; cx: number; cy: number }
/** The cages (the first one in front, the second behind it on the left, the third on the right) hanging from `top`
 * (the top of the play area, screen px), each with its count over its limit. deny: 0..1, the shake of a catch that
 * did not fit; callback: the cage in front is empty and a press on it calls the souls back. Returns where each one
 * is (screen px), for the presses. */
export function drawHangingCages(ctx: Ctx, hud: CageHud, cages: readonly CageLike[], opts: { top: number; color: string; deny: number; now: number; dt: number; callback: boolean; hover: number | null }): CageBox[] {
  const boxes: CageBox[] = []
  if (!cages.length || !cages[0].cage) return boxes
  const W = stageWidth(), H = window.innerHeight, fa = cageArt(cages[0].item)
  // as tall as a fifth of the screen (92 to 168 px for the tallest model); on a narrow screen the whole group keeps
  // to its left half
  const backs = (cages[1] ? cageArt(cages[1].item).w : 0) + (cages[2] ? cageArt(cages[2].item).w : 0)
  const s = Math.min(Math.max(92, Math.min(168, H * 0.2)) / 170, (W * 0.36) / fa.w, (W * 0.5 - 12) / (fa.w + backs * 0.55 * 0.75))
  // the ones behind, one on each side, a quarter of each tucked behind the one in front; the whole group starts at
  // the left edge of the screen, whatever the models are
  const bs = s * 0.55, half = fa.w * 0.5 * s
  const lw = cages[1] ? cageArt(cages[1].item).w * bs : 0, rw = cages[2] ? cageArt(cages[2].item).w * bs : 0
  const cx = 12 + half + lw * 0.75
  const slots = [{ x: cx, len: 30 * s, s }, { x: cx - half - lw * 0.25, len: 5 * s, s: bs }, { x: cx + half + rw * 0.25, len: 9 * s, s: bs }]
  const shake = opts.deny > 0 ? Math.sin(opts.now * 0.05) * 6 * opts.deny : 0
  const ease = Math.min(1, opts.dt * 12)
  const one = (i: number) => {
    const o = cages[i], cage = o?.cage
    if (!o || !cage) return
    const slot = slots[i], art = cageArt(o.item), sway = hud.sways[i]
    let v = hud.seen.get(cage)
    if (!v) { v = { x: slot.x, len: slot.len, s: slot.s, n: cage.souls.length, cx: 0, cy: 0 }; hud.seen.set(cage, v) }
    v.x += (slot.x - v.x) * ease; v.len += (slot.len - v.len) * ease; v.s += (slot.s - v.s) * ease
    // a soul in or out gives it a little push
    if (cage.souls.length !== v.n) { sway.v += (cage.souls.length > v.n ? 1 : -1) * SWAY.kick * 0.3; v.n = cage.souls.length }
    // it comes in from outside the top left corner, swinging
    const enter = cageEnter(cage.enterT), angle = sway.a + enter.swing
    const ax = v.x - (1 - enter.k) * (v.x + art.w * v.s) + shake, ay = opts.top - 6 - (1 - enter.k) * art.h * v.s * 0.6
    // a pendulum: the string turns around where it is tied, the cage with it
    const len = v.len + 6, hx = ax - Math.sin(angle) * len, hy = ay + Math.cos(angle) * len
    ctx.strokeStyle = "#1b1d22"; ctx.lineWidth = Math.max(1.2, 2 * v.s); ctx.lineCap = "round"
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke()
    drawCage(ctx, o.item, cage, hx, hy, v.s, angle * 1.1)
    const bodyH = (art.h - art.hang[1]) * v.s, w = art.w * v.s
    v.cx = hx + (art.birds[0] + art.birds[2] / 2 - art.hang[0]) * v.s; v.cy = hy + (art.birds[1] + art.birds[3] / 2 - art.hang[1]) * v.s
    // its count over its limit, under it; the one in front, empty with souls out, says what a press does instead
    const text = i === 0 && opts.callback ? "Callback" : `${cage.souls.length}/${cage.cap}`, big = i === 0
    const fs = Math.round((big ? 13 : 10) * Math.max(0.8, Math.min(1.15, s))), ly = hy + bodyH + (big ? 14 : 9) * s
    ctx.font = `bold ${fs}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
    const tw = ctx.measureText(text).width + fs * 1.1, th = fs * 1.7
    ctx.beginPath(); ctx.roundRect(hx - tw / 2, ly - th / 2, tw, th, th / 2)
    ctx.fillStyle = DARK; ctx.fill()
    if (i === 0 && (opts.callback || opts.hover === 0)) { ctx.globalAlpha = opts.callback ? (opts.hover === 0 ? 0.5 : 0.3) : 0.2; ctx.fillStyle = opts.color; ctx.fill(); ctx.globalAlpha = 1 }
    if (big || opts.hover === i) { ctx.lineWidth = 2; ctx.strokeStyle = opts.color; ctx.stroke() }
    ctx.fillStyle = "#e9f4ee"; ctx.fillText(text, hx, ly + 0.5)
    boxes[i] = { i, x: hx - w / 2, y: hy, w, h: bodyH + (big ? 14 : 9) * s + th / 2, cx: v.cx, cy: v.cy }
  }
  // the ones behind first
  ctx.save()
  one(1); one(2); one(0)
  ctx.restore()
  return boxes.filter(Boolean)
}

// ---------- a cage's counter: its model's silhouette with how many souls it has ----------
export type CageCount = { item: ItemId; n: number; flash: CageFlash | null; flashT: number }
export const cageCounts = (cages: readonly CageLike[]): CageCount[] => cages.flatMap(o => (o.cage ? [{ item: o.item, n: o.cage.souls.length, flash: o.cage.flash, flashT: o.cage.flashT }] : []))
const silPaths = new Map<ItemId, Path2D>()
const silPath = (item: ItemId) => { let p = silPaths.get(item); if (!p) { p = new Path2D(cageArt(item).sil[2]); silPaths.set(item, p) } return p }
export const cageCounterWidth = (item: ItemId, h: number) => { const [w0, h0] = cageArt(item).sil; return w0 * h / h0 }
/** one counter with its top left at (x, y), `h` px tall; it glows blue when its cage got a soul, red when it lost one */
export function drawCageCounter(ctx: Ctx, c: CageCount, x: number, y: number, h: number, color: string, lit = false) {
  const [w0, h0] = cageArt(c.item).sil, k = h / h0, w = w0 * k, p = silPath(c.item)
  const glow = c.flash && c.flashT > 0 ? GLOW[c.flash] : null
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k)
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16 * (c.flashT / CAGE_FLASH) }
  ctx.fillStyle = DARK; ctx.fill(p)
  if (lit) { ctx.globalAlpha = 0.25; ctx.fillStyle = color; ctx.fill(p); ctx.globalAlpha = 1 }
  ctx.lineWidth = 2 / k; ctx.lineJoin = "round"; ctx.strokeStyle = glow ?? color; ctx.stroke(p)
  ctx.restore()
  const text = String(c.n)
  ctx.font = `bold ${Math.round(h * (text.length > 1 ? 0.44 : 0.5))}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.fillStyle = "#e9f4ee"; ctx.fillText(text, x + w / 2, y + h * 0.6)
  return w
}
/** a row of counters; x: its left end, or its right end with align "right". Returns each one's box. */
export function drawCageCounters(ctx: Ctx, list: readonly CageCount[], x: number, y: number, h: number, color: string, align: "left" | "right" = "left", lit: number | null = null) {
  const gap = Math.max(2, h * 0.14)
  let at = align === "right" ? x - list.reduce((n, c) => n + cageCounterWidth(c.item, h) + gap, -gap) : x
  return list.map((c, i) => { const w = drawCageCounter(ctx, c, at, y, h, color, lit === i); const box = { i, x: at, y, w, h }; at += w + gap; return box })
}

// ---------- where another player is: their avatar with their cages' counters ----------
const heads = new Map<string, HTMLImageElement | null>()
function headPic(look: Record<string, string> | null | undefined) {
  if (!look) return null
  const key = JSON.stringify(look)
  let img = heads.get(key)
  if (img === undefined) {
    try { img = svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="12 -232 70 70">${LOOK_ART.headSvg(look as ChickenLook)}</svg>`) } catch { img = null }
    if (heads.size > 64) heads.delete(heads.keys().next().value!)
    heads.set(key, img)
  }
  return img
}
export const TAG_R = 15
/** The tag of a player whose chicken's head is at (sx, sy) on the screen. On the screen (inside `box`) it sits over
 * them, and only when they carry a cage; outside it, it stays at the edge of the screen in their direction with an
 * arrow, cage or not. */
export function drawPlayerTag(ctx: Ctx, sx: number, sy: number, box: { l: number; r: number; t: number; b: number }, color: string, look: Record<string, string> | null | undefined, cages: readonly CageCount[]) {
  const R = TAG_R, on = sx >= box.l && sx <= box.r && sy >= box.t && sy <= box.b
  if (on && !cages.length) return
  const h = 22, rowW = cages.reduce((n, c) => n + cageCounterWidth(c.item, h) + 3, 0)
  const m = R + 8
  let x: number, y: number
  if (on) { x = Math.max(box.l + m, Math.min(box.r - m - rowW, sx - rowW / 2)); y = Math.max(box.t + m, sy - R - 6) }
  else { x = Math.max(box.l + m, Math.min(box.r - m, sx)); y = Math.max(box.t + m, Math.min(box.b - m, sy)) }
  ctx.save()
  if (!on) {
    // the arrow, on the side they are
    const a = Math.atan2(sy - y, sx - x)
    ctx.save(); ctx.translate(x, y); ctx.rotate(a)
    ctx.beginPath(); ctx.moveTo(R + 9, 0); ctx.lineTo(R + 1, -6); ctx.lineTo(R + 1, 6); ctx.closePath(); ctx.fillStyle = color; ctx.fill()
    ctx.restore()
  }
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = "#101713"; ctx.fill()
  const img = headPic(look)
  if (img && ready(img)) { ctx.save(); ctx.clip(); ctx.drawImage(img, x - R, y - R, R * 2, R * 2); ctx.restore() }
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.stroke()
  // the counters beside it: on the side with room
  if (cages.length) {
    const right = x + R + 5 + rowW <= box.r - 4
    drawCageCounters(ctx, cages, right ? x + R + 5 : x - R - 5, y - h / 2, h, color, right ? "left" : "right")
  }
  ctx.restore()
}
