// Screen-space HUD: the reticle, the throw path, the inventory bars and the item wheel.
// Split out of parquinho.tsx; the component there owns the loop and calls these each frame.
import { PATIO_GROUND } from "@/lib/pigchicken/patio-settings"
import { ARP_GLYPHS, CONSUMABLE_LIMITS, type Arp, type ItemId } from "@/lib/pigchicken/items"
import { DEGREE_COLORS } from "@/lib/pigchicken/music"
import { CARD_RANKS, burstsAlone } from "@/lib/pigchicken/cards"
import { type Combat } from "@/lib/pigchicken/combat"
import { wheelSliceCenter, wheelSpan } from "@/lib/pigchicken/inventory"
import { itemImage } from "@/lib/pigchicken/art"
import { drawItem, type Ctx } from "./shared"
import { stageWidth } from "@/lib/stage-size"
import { type InventoryAlign } from "@/lib/chicken/controls"

export function drawReticle(ctx: Ctx, combat: Combat, origin: { x: number; y: number }, rx: number, ry: number, dist: number, spreadDeg: number, locked: boolean, path: { x: number; y: number }[] | null, showPath: boolean, showLand: boolean, tint: string) {
  const d = combat.def(), armed = !!combat.held && d.mag > 0 && !d.meleeOnly
  const t = performance.now() / 1000
  const gap = Math.max(5, Math.tan((spreadDeg / 2) * Math.PI / 180) * dist)
  const ang = Math.atan2(ry - origin.y, rx - origin.x)
  // the player's own color (their lobby color), with a dark outline so it reads on any background; aim locked
  // draws it thicker, reloading fainter
  const color = tint
  const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke() }
  const end = path ? path[path.length - 1] : null
  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 3
  if (combat.reloading) ctx.globalAlpha = 0.55
  const baseAlpha = ctx.globalAlpha
  // the faint aim line (the families that draw their own path skip it)
  if (showPath && !path && d.reticle !== "cone") {
    const grad = ctx.createLinearGradient(origin.x, origin.y, rx, ry)
    grad.addColorStop(0, "rgba(255,255,255,0.25)"); grad.addColorStop(1, "rgba(255,255,255,0)")
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
    line(origin.x, origin.y, rx, ry)
    ctx.setLineDash([])
  }
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = locked ? 3 : 2
  if (!armed) {
    ctx.beginPath(); ctx.arc(rx, ry, 8, 0, Math.PI * 2); ctx.stroke()
  } else if (d.reticle === "circle") {
    // SMG: a circle that pulses and opens fast while firing
    const r = gap + 6 + Math.sin(t * 18) * Math.min(3, gap * 0.15)
    ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); ctx.fill()
  } else if (d.reticle === "cross") {
    // rifle: a cross with a gap in the middle that opens with walking and firing
    ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => line(rx + ux * (gap + 3), ry + uy * (gap + 3), rx + ux * (gap + 15), ry + uy * (gap + 15)))
  } else if (d.reticle === "cone") {
    // pump: the reticle is as wide as the pellets' spread at the aim's distance (small near the gun, wide far away),
    // and fades past the pellets' range; the cone's sides are its path
    const half = (spreadDeg / 2) * Math.PI / 180, reach = d.range
    if (showPath) {
      const grad = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, reach)
      grad.addColorStop(0, combat.reloading ? "rgba(138,143,152,0.8)" : "rgba(255,255,255,0.8)"); grad.addColorStop(1, "rgba(255,255,255,0)")
      ctx.strokeStyle = grad
      ;[-half, half].forEach(a => line(origin.x, origin.y, origin.x + Math.cos(ang + a) * reach, origin.y + Math.sin(ang + a) * reach))
    }
    ctx.globalAlpha = dist <= reach ? 0.95 : 0.3
    ctx.strokeStyle = color
    ctx.beginPath(); ctx.arc(origin.x, origin.y, dist, ang - half, ang + half); ctx.stroke()
    ;[-half, half].forEach(a => {
      const cx = origin.x + Math.cos(ang + a) * dist, cy = origin.y + Math.sin(ang + a) * dist
      line(cx - Math.cos(ang) * 6, cy - Math.sin(ang) * 6, cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6)
    })
    ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  } else if (d.reticle === "laser") {
    // sniper: a thin laser from the muzzle to whatever it hits, and a circle with a cross that closes while still
    if (showPath && end) {
      const grad = ctx.createLinearGradient(origin.x, origin.y, end.x, end.y)
      grad.addColorStop(0, "rgba(255,80,80,0.75)"); grad.addColorStop(1, "rgba(255,80,80,0)")
      ctx.strokeStyle = grad; ctx.lineWidth = 1; line(origin.x, origin.y, end.x, end.y)
    }
    ctx.strokeStyle = color; ctx.lineWidth = 1.5
    const r = 10 + gap
    ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke()
    line(rx - r - 6, ry, rx - 4, ry); line(rx + 4, ry, rx + r + 6, ry); line(rx, ry - r - 6, rx, ry - 4); line(rx, ry + 4, rx, ry + r + 6)
    if (showPath && end) { ctx.fillStyle = "#ff5050"; ctx.beginPath(); ctx.arc(end.x, end.y, 2.5, 0, Math.PI * 2); ctx.fill() }
  } else if ((d.reticle === "impact" || d.reticle === "grenade")) {
    // launchers and grenades: the path (dotted for the grenade) and where it lands, with the blast's radius
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.5
    if (!showPath || !path || !end) { /* path hidden: only where it lands */ }
    else if (d.reticle === "grenade") {
      ctx.fillStyle = "#ffffff"
      const totalPathLength = path.reduce((sum, point, index) => index ? sum + Math.hypot(point.x - path[index - 1].x, point.y - path[index - 1].y) : sum, 0)
      let distance = 0
      path.forEach((p, i) => {
        if (i) distance += Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y)
        if (i % 3 === 0 || i === path.length - 1) {
          ctx.globalAlpha = baseAlpha * 0.6 * (1 - distance / Math.max(1, totalPathLength))
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill()
        }
      })
      ctx.globalAlpha = baseAlpha
    } else {
      const grad = ctx.createLinearGradient(origin.x, origin.y, end.x, end.y)
      grad.addColorStop(0, "rgba(255,255,255,0.45)"); grad.addColorStop(1, "rgba(255,255,255,0)")
      ctx.strokeStyle = grad; ctx.setLineDash([3, 5]); line(origin.x, origin.y, end.x, end.y); ctx.setLineDash([])
    }
    // where it lands, with the blast's radius (per item: always, or only with the fire button held, …)
    if (showLand && end) {
      ctx.strokeStyle = color; ctx.lineWidth = 2
      line(end.x - 6, end.y - 6, end.x + 6, end.y + 6); line(end.x - 6, end.y + 6, end.x + 6, end.y - 6)
      ctx.strokeStyle = "rgba(255,170,70,0.7)"; ctx.setLineDash([6, 5])
      ctx.beginPath(); ctx.arc(end.x, end.y, d.explodeRadius || 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
    }
    // where the mouse (or the stick) points, so the aim is never lost while the marker shows the landing
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([])
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); ctx.fill()
    // the fuse: a ring that empties in the fuse's time
    if (showLand && end && d.fuse > 0) { ctx.strokeStyle = "#ff6b5b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(end.x, end.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, d.fuse / 6)); ctx.stroke() }
  } else if (d.reticle === "bow") {
    // bow: a half moon that fills with the charge, and a short path that gets longer
    const c = combat.fireCharge
    const n = Math.max(2, Math.round((path?.length ?? 0) * (0.25 + 0.75 * c)))
    if (showPath && path) {
      const tip = path[Math.min(n - 1, path.length - 1)]
      const grad = ctx.createLinearGradient(origin.x, origin.y, tip.x, tip.y)
      grad.addColorStop(0, "rgba(255,255,255,0.5)"); grad.addColorStop(1, "rgba(255,255,255,0)")
      ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4])
      ctx.beginPath(); path.slice(0, n).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([])
    }
    const tip = showPath && path ? path[n - 1] : { x: rx, y: ry }
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2); ctx.stroke()
  } else {
    // pistol: a dot and four short ticks that open a little with the spread
    ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => line(rx + ux * gap, ry + uy * gap, rx + ux * (gap + 8), ry + uy * (gap + 8)))
    ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, Math.PI * 2); ctx.fill()
  }
  if (combat.reloading) {
    const at = end && d.reticle !== "laser" && (showLand || (d.reticle !== "impact" && d.reticle !== "grenade")) ? end : { x: rx, y: ry }
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(at.x, at.y, 18, -Math.PI / 2, -Math.PI / 2 + combat.reloading * Math.PI * 2); ctx.stroke()
  }
  ctx.restore()
}

// where a throw let go now would fly: a dotted arc that fades smoothly from the hand to full transparency at impact
export function drawThrowPath(ctx: Ctx, pts: { x: number; y: number }[]) {
  if (pts.length < 2) return
  const len: number[] = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = len[len.length - 1]
  if (total < 1) return
  ctx.save()
  ctx.fillStyle = "#7bdff2"
  let j = 1
  for (let step = 1; step <= Math.ceil(total / 14); step++) {
    const at = Math.min(step * 14, total)
    while (j < pts.length - 1 && len[j] < at) j++
    const a = pts[j - 1], b = pts[j], seg = len[j] - len[j - 1] || 1, u = (at - len[j - 1]) / seg
    const t = at / total
    ctx.globalAlpha = 0.9 * (1 - t)
    ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 2.6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

export const INV_SIZE = 34, INV_GAP = 0, INV_TOP = 100
// the inventories' stack on a phone held upright: top right, one row per local player, the player's avatar at the
// right end of the row (the avatars stay there on every screen)
export const INV_STACK = { top: 64, right: 12, size: INV_SIZE, rowGap: 6, avatarGap: 6, soulGap: 6 }
export const invRowY = (row: number) => INV_STACK.top + row * (INV_SIZE + INV_STACK.rowGap)
export const invRight = INV_STACK.right + INV_SIZE + INV_STACK.avatarGap + INV_SIZE + INV_STACK.soulGap
// the hotbar at the bottom (desktop and tablet): big slots apart from each other, the key numbers under them; the
// world is lifted so her ground sits above it
// label: the room left of each group's first slot for its key (Próximo instrumento / arma / utilitário)
export const BAR = { size: 56, gap: 6, tab: 16, bottom: 12, side: 16, groupGap: 10, minSize: 30, label: 30 }
export const BAR_GROUND_H = PATIO_GROUND.default
// the small rows: 3 px between slots, 5 px more between groups; they shrink (down to 18 px) to fit the screen
const ROW = { gap: 3, groupGap: 5, minSize: 18, margin: 12 }
// where each slot sits along a bar (from its left end) and how wide the bar is: `gap` between slots, `groupGap`
// more where the group changes (instruments | weapons | the rest), and `lead` before each group (its key's label)
export function barSlots(groups: readonly number[], size: number, gap: number, groupGap: number, lead = 0) {
  const xs: number[] = []
  let x = 0
  groups.forEach((g, i) => {
    if (!i) x = lead
    else if (g !== groups[i - 1]) x += gap + groupGap + lead
    else x += gap
    xs.push(x); x += size
  })
  return { xs, w: Math.max(0, x) }
}
// the biggest slot (up to `max`, at least `min`) whose bar still fits `room` px
function fitSize(groups: readonly number[], room: number, max: number, min: number, gap: number, groupGap: number, lead = 0) {
  const n = Math.max(1, groups.length), spaces = barSlots(groups, 0, gap, groupGap, lead).w
  return Math.max(min, Math.min(max, Math.floor((room - spaces) / n)))
}
// a mouse is the main pointer (desktop): the slot numbers (keys 1-9, then 0 for slot ten) only show there
export const desktopPointer = typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)") : null
// the key hints (the 1-9 and 0 numbers under the slots, each group's key beside it) need a mouse and a roomy screen: phones and
// small windows show none
export const SMALL_SCREEN_W = 768
export const showKeyHints = () => (desktopPointer?.matches ?? true) && (typeof window === "undefined" || stageWidth() >= SMALL_SCREEN_W)
// where a player's bar sits. bottom: the first player's big bar at the bottom of the screen (desktop and tablet).
// Otherwise the small row to the left of that player's avatar, in the stack at the top right (every local player
// but the first on desktop and tablet; everyone on a phone held upright)
// groups: each shown slot's group (Combat.inventoryGroups). The page's invisible slot buttons use the same numbers.
// labels: the big bar shows each group's key left of its first slot. align (Controles → Inventário) places the big
// bar: split, the instruments at the left edge and the weapons and utilities at the right one (xs then span the whole
// screen); center, centred on the screen; left / right, against that edge. The groups keep their order: the
// instruments, then the weapons, then the utilities (xs are from the bar's left end). When it does not fit even with
// the smallest slots, it slides so the held slot (cur) sits as near the centre as the bar's ends allow.
// rest: where the circles of the effects whose item has left the bar start, and which way they go (-1 left, 1 right)
export function invGeom(row: number, groups: readonly number[], bottom: boolean, offset?: { x: number; y: number }, W = stageWidth(), H = window.innerHeight, labels = false, cur = 0, align: InventoryAlign = "center") {
  if (!bottom) {
    const size = fitSize(groups, W - invRight - ROW.margin, INV_SIZE, ROW.minSize, ROW.gap, ROW.groupGap)
    const { xs, w } = barSlots(groups, size, ROW.gap, ROW.groupGap)
    const x = Math.round(W - invRight - w + (offset?.x ?? 0))
    return { x, y: invRowY(row) + (offset?.y ?? 0), size, gap: ROW.gap, groupGap: ROW.groupGap, xs, w, tabs: false, lead: 0, rest: { x: x + (xs[0] ?? 0), dir: -1 as const } }
  }
  const lead = labels ? BAR.label : 0, room = W - BAR.side * 2
  const size = fitSize(groups, room, BAR.size, BAR.minSize, BAR.gap, BAR.groupGap, lead)
  let { xs, w } = barSlots(groups, size, BAR.gap, BAR.groupGap, lead)
  let x = align === "left" ? BAR.side : align === "right" ? W - BAR.side - w : (W - w) / 2
  // split: the instruments stay at the left edge and the rest goes to the right one (both halves present only)
  const right = align === "split" ? groups.findIndex(g => g !== 0) : -1
  if (w > room) {
    const at = xs[Math.max(0, Math.min(cur, xs.length - 1))] ?? 0
    x = Math.min(BAR.side, Math.max(W - BAR.side - w, W / 2 - at - size / 2))
  } else if (align === "split") {
    x = right === 0 ? W - BAR.side - w : BAR.side
    if (right > 0) {
      const shift = room - w
      xs = xs.map((sx, i) => i >= right ? sx + shift : sx); w = room
    }
  }
  const y = H - BAR.bottom - BAR.tab - size
  const bx = Math.round(x + (offset?.x ?? 0)), last = xs.length - 1
  // the effects' circles: left of the first group's key; with the bar against the left edge, right of its end; split,
  // left of the weapons' half
  const atLeft = align === "left" || (align === "split" && right !== 0)
  const rest = right > 0 && w <= room ? { x: bx + xs[right] - lead, dir: -1 as const }
    : atLeft && last >= 0 ? { x: bx + xs[last] + size, dir: 1 as const }
    : { x: bx + (xs[0] ?? 0) - lead, dir: -1 as const }
  return { x: bx, y: Math.round(y + (offset?.y ?? 0)), size, gap: BAR.gap, groupGap: BAR.groupGap, xs, w, tabs: true, lead, rest }
}
// the slot under a point along a bar (px from its left end): the nearest one, and whether the point is on its right half
export function barSlotAt(xs: readonly number[], size: number, x: number): { slot: number; after: boolean } {
  let best = 0, dist = Infinity
  xs.forEach((sx, i) => { const d = x < sx ? sx - x : x > sx + size ? x - sx - size : 0; if (d < dist) { dist = d; best = i } })
  return { slot: best, after: x > (xs[best] ?? 0) + size / 2 }
}
// a slot being dragged on the first player's bar: which one, where the pointer is (screen) and where it would go
export type BarDrag = { from: number; x: number; y: number; to: number; after: boolean }
// the ammo bar along the bottom of a slot: the whole width, one segment per shot (or blow), the loaded ones lit.
// What is coming back (the reload of the held item, the gradual auto reload) fills in a paler colour, so it also
// works as the cooldown's bar. Segments too thin to tell apart are drawn as one bar
function drawAmmoBar(ctx: Ctx, x: number, y: number, size: number, r: number, h: number, mag: number, ammo: number, coming: number) {
  const segs = Math.max(1, Math.round(mag)), have = Math.max(0, Math.min(segs, ammo)), soon = Math.max(0, Math.min(segs - have, coming))
  const k = have / segs, color = k > 0.5 ? "#7bd88f" : k > 0.25 ? "#ffd166" : "#ff6b5b"
  const gap = size / segs >= 4 ? 1 : 0, sw = (size - gap * (segs - 1)) / segs
  ctx.save()
  roundRect(ctx, x, y, size, size, r); ctx.clip()
  const by = y + size - h
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x, by - 1, size, h + 1)
  const fill = (from: number, to: number) => {
    if (to <= from) return
    if (!gap) { ctx.fillRect(x + (from / segs) * size, by, ((to - from) / segs) * size, h); return }
    for (let i = Math.floor(from); i < Math.ceil(to); i++) {
      const a = Math.max(from, i) - i, b = Math.min(to, i + 1) - i
      ctx.fillRect(x + i * (sw + gap) + a * sw, by, (b - a) * sw, h)
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.4)"; fill(have, have + soon)
  ctx.fillStyle = color; fill(0, have)
  ctx.restore()
}
// the item's name over the bar for a moment after switching (per player row)
export const invPill = new Map<number, { key: string; at: number }>()
export const PILL_TIME = 1500
const effectTint = (look: string) => look === "buddha" ? "#ffd166" : look === "fizz" ? "#f3e1c7" : "#7bdff2"
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
// the arpeggiator's glyph over an instrument's slot: the pattern's dots (ARP_GLYPHS), small squares with no box;
// lit in the degrees' colours on the held slot, pale on the others. Its bottom sits `gap` px over the slot; returns
// the area a click turns to the next option (the slot's width, from the slot's top up past the glyph)
export const arpGlyphHeight = (big: boolean) => (big ? 5 : 3) * 4 + 6
export function drawArpGlyph(ctx: Ctx, arp: Arp, cx: number, top: number, big: boolean, lit: boolean, w: number) {
  const cols = ARP_GLYPHS[arp], d = big ? 4 : 2, step = d + 1
  const x0 = Math.round(cx - (cols.length * step - 1) / 2), base = top - 3 - d
  ctx.save()
  cols.forEach((h, i) => {
    if (h === null) return
    ctx.fillStyle = lit ? DEGREE_COLORS[(h * 2) % DEGREE_COLORS.length] : "rgba(255,255,255,0.5)"
    ctx.fillRect(x0 + i * step, base - h * step, d, d)
  })
  ctx.restore()
  return { l: cx - w / 2, r: cx + w / 2, t: top - arpGlyphHeight(big), b: top }
}
// the inventory bar, moved by the player's saved offset (edit mode of the touch controls). Only her items show, plus
// one empty slot while there is room (instruments, weapons, then the other items); with no item at all no slot shows
// (only a running effect's circle and the name over the bar). Each slot is a glass tile; the
// current one glows teal. A bar along the bottom shows the ammo (a badge counts a consumable's doses), a thin line
// what is left of an item that wears.
// labels: each group's key (Próximo instrumento / arma / utilitário), shown left of the group's first slot on the
// big bar (null: none)
// Returns the arpeggiator glyphs drawn over its instruments (the item and the area a click turns to its next option).
export function drawInventory(ctx: Ctx, combat: Combat, row: number, bottom: boolean, color: string | null, now: number, offset?: { x: number; y: number }, drag?: BarDrag | null, labels?: readonly (string | null)[] | null, align: InventoryAlign = "center") {
  const glyphs: { item: ItemId; box: { l: number; r: number; t: number; b: number } }[] = []
  const slots = combat.inventory, groups = combat.inventoryGroups
  // no item at all: the bar hides (not even the empty slot shows)
  const empty = !slots.some(Boolean), n = empty ? 0 : slots.length
  const showLabels = !empty && bottom && !!labels?.some(Boolean)
  const g = invGeom(row, groups, bottom, offset, undefined, undefined, showLabels, combat.current, align), { size, gap } = g
  const x0 = g.x, y = g.y
  // the slot numbers (keys 1-9, then 0 for slot ten) are the first player's, with a mouse
  const numbers = g.tabs && row === 0 && showKeyHints()
  const r = Math.max(3, Math.round(size * (bottom ? 0.16 : 0.15)))
  ctx.save()
  ctx.textBaseline = "middle"
  // the effects running on her, by item (the longest one, and how many doses add up)
  const running = new Map<ItemId, { left: number; total: number; look: string; count: number }>()
  combat.effects.forEach(e => {
    const was = running.get(e.item)
    if (!was || e.left > was.left) running.set(e.item, { left: e.left, total: e.total, look: e.look, count: (was?.count ?? 0) + 1 })
    else was.count++
  })
  for (let i = 0; i < n; i++) {
    const x = x0 + g.xs[i], o = slots[i], on = i === combat.current
    // the slot being dragged stays faint in its place until it is dropped
    ctx.globalAlpha = drag && drag.from === i ? 0.3 : 1
    roundRect(ctx, x, y, size, size, r)
    if (on) { ctx.save(); ctx.shadowColor = "rgba(64,224,208,0.85)"; ctx.shadowBlur = bottom ? 14 : 8; ctx.fillStyle = "rgba(38,92,88,0.62)"; ctx.fill(); ctx.restore() }
    else { ctx.fillStyle = "rgba(48,58,52,0.5)"; ctx.fill() }
    ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? "#5ee8d8" : "rgba(255,255,255,0.22)"; ctx.stroke()
    // a consumable's effect running on her: the slot's background in the effect's colour, losing it from the top
    // down as the time runs out (the longest dose of that item; the last 3 seconds blink)
    const fx = o ? running.get(o.item) : undefined
    if (fx) {
      const k = Math.max(0, Math.min(1, fx.left / Math.max(0.01, fx.total))), fh = size * k
      ctx.save(); roundRect(ctx, x, y, size, size, r); ctx.clip()
      ctx.globalAlpha = fx.left < 3 && Math.floor(fx.left * 4) % 2 ? 0.25 : 0.55
      ctx.fillStyle = effectTint(fx.look); ctx.fillRect(x, y + size - fh, size, fh)
      ctx.restore()
    }
    // an item with a special (the lightning weapons): the slot's background is blue while it is ready; after it is
    // used the blue fills back from the bottom up as its interval runs
    const sp = o ? combat.special(o) : null
    if (sp !== null) {
      ctx.save(); roundRect(ctx, x, y, size, size, r); ctx.clip()
      if (sp >= 1) { ctx.fillStyle = `rgba(70,150,255,${0.42 + 0.1 * Math.sin(now / 260)})`; ctx.fillRect(x, y, size, size) }
      else { ctx.fillStyle = "rgba(70,150,255,0.32)"; ctx.fillRect(x, y + size * (1 - sp), size, size * sp) }
      ctx.restore()
    }
    // a soft light along the top edge: glass
    ctx.save(); roundRect(ctx, x + 1, y + 1, size - 2, size * 0.45, r - 1); ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill(); ctx.restore()
    if (o) {
      // thrown and on its way back: faint until it is in her wing again
      ctx.save(); if (o.flying) ctx.globalAlpha *= 0.3; ctx.translate(x + size / 2, y + size / 2 + 1); drawItem(ctx, o.item, size * (bottom ? 0.79 : 0.82), size * (bottom ? 0.75 : 0.76)); ctx.restore()
      const d = combat.item(o.item)
      // an instrument: its arpeggiator's pattern over the slot (the other players' small rows sit too close for it:
      // there it goes small inside the slot's top, without the click)
      if (d.instrument && !d.deck && !(drag && drag.from === i)) {
        if (bottom || row === 0) glyphs.push({ item: o.item, box: drawArpGlyph(ctx, d.arp, x + size / 2, y, bottom, on, size) })
        else drawArpGlyph(ctx, d.arp, x + size / 2, y + 14, false, on, size)
      }
      // a consumable's badge: the doses left, in the bottom right corner
      if (d.mag > 0 && d.consumable) {
        const t = String(Math.ceil(o.ammo))
        ctx.font = `bold ${bottom ? 12 : 9}px ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = "right"
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(t, x + size - 4, y + size - (bottom ? 9 : 6))
        ctx.fillStyle = o.ammo <= 0 ? "#ff8c69" : "#ffffff"; ctx.fillText(t, x + size - 4, y + size - (bottom ? 9 : 6))
      }
      // a deck: the card its next throw sends, in the bottom right corner (golden: one that bursts on its own)
      const card = d.deck ? combat.nextCard(o) : null
      if (card !== null) {
        const t = CARD_RANKS[card]
        ctx.font = `bold ${bottom ? 12 : 9}px ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = "right"
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(t, x + size - 4, y + size - (bottom ? 9 : 6))
        ctx.fillStyle = burstsAlone(card) ? "#ffd166" : "#ffffff"; ctx.fillText(t, x + size - 4, y + size - (bottom ? 9 : 6))
      }
      // several doses of it running at once: how many, in the top left corner
      if (fx && fx.count > 1) {
        const t = `×${fx.count}`
        ctx.font = `bold ${bottom ? 11 : 8}px ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = "left"
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(t, x + 4, y + (bottom ? 9 : 6))
        ctx.fillStyle = effectTint(fx.look); ctx.fillText(t, x + 4, y + (bottom ? 9 : 6))
      }
      // the shots (or the taco's blows) loaded and coming back
      const ammoBar = d.mag > 0 && !d.consumable && !d.infiniteAmmo, barH = bottom ? 4 : 3
      if (ammoBar) {
        const segs = Math.max(1, Math.round(d.mag))
        const coming = on && combat.reloading > 0 ? (d.shellReload ? combat.reloading : combat.reloading * (segs - o.ammo))
          : d.refillTime > 0 ? ((o.refill ?? 0) / d.refillTime) * Math.max(1, d.refillAmount) : 0
        drawAmmoBar(ctx, x, y, size, r, barH, d.mag, o.ammo, coming)
      }
      // more than one of it to throw (the two Boomerangs, a deck's cards): the ones in her wings, in the same bar
      else if (d.returnThrow && d.returnCount > 1) drawAmmoBar(ctx, x, y, size, r, barH, combat.inHand(o) + (o.out ?? 0), combat.inHand(o), 0)
      // what is left of an item that wears out with hits (over the ammo bar when it has one)
      if (d.durability > 0 && o.durability < d.durability) {
        const k = Math.max(0, o.durability / d.durability), bw = size - 12, ly = y + size - 4 - (ammoBar ? barH + 2 : 0)
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x + 6, ly, bw, 2)
        ctx.fillStyle = k > 0.5 ? "#7bd88f" : k > 0.25 ? "#ffd166" : "#ff6b5b"; ctx.fillRect(x + 6, ly, bw * k, 2)
      }
    }
    // the key number under the slot (keys 1-9, then 0 for slot ten)
    if (numbers && i < 10) {
      const tx = x + size / 2, tw = 16, th = 13, ty = y + size + 3
      roundRect(ctx, tx - tw / 2, ty, tw, th, 3); ctx.fillStyle = on ? "rgba(38,92,88,0.9)" : "rgba(18,22,26,0.72)"; ctx.fill()
      ctx.lineWidth = 1; ctx.strokeStyle = on ? "#5ee8d8" : "rgba(255,255,255,0.28)"; ctx.stroke()
      ctx.font = "bold 9px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = on ? "#ffffff" : "rgba(255,255,255,0.75)"
      ctx.fillText(String((i + 1) % 10), tx, ty + th / 2 + 0.5)
    }
  }
  ctx.globalAlpha = 1
  // dragging: a line where the slot would go (in the colour of the group it would join) and the item on the pointer
  if (drag && slots[drag.from]) {
    const to = Math.min(drag.to, n - 1), before = !slots[to] || !drag.after
    const gx = before ? x0 + g.xs[to] - gap / 2 : x0 + g.xs[to] + size + gap / 2
    ctx.fillStyle = slots[to] ? GROUP_COLORS[groups[to]] ?? "#ffffff" : GROUP_COLORS[2]
    roundRect(ctx, gx - 1.5, y - 4, 3, size + 8, 1.5); ctx.fill()
    const ds = size * 0.9
    ctx.save(); ctx.globalAlpha = 0.9
    roundRect(ctx, drag.x - ds / 2, drag.y - ds / 2, ds, ds, r); ctx.fillStyle = "rgba(38,92,88,0.7)"; ctx.fill()
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#5ee8d8"; ctx.stroke()
    ctx.translate(drag.x, drag.y); drawItem(ctx, slots[drag.from]!.item, ds * 0.79, ds * 0.75)
    ctx.restore()
  }
  // the other local players: a dot of their colour at the start of the bar
  if (color && row > 0 && !empty) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 - 8, y + size / 2, 4, 0, Math.PI * 2); ctx.fill() }
  // each group's key, left of its first slot (the empty slot counts as the last group: Próximo utilitário stops there)
  if (showLabels) {
    ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "center"
    for (let i = 0; i < n; i++) {
      if (i && groups[i] === groups[i - 1]) continue
      const label = labels?.[groups[i]]
      if (!label) continue
      const tw = g.lead - 6, th = 18, tx = x0 + g.xs[i] - g.lead + 1, ty = y + size / 2 - th / 2
      roundRect(ctx, tx, ty, tw, th, 4); ctx.fillStyle = "rgba(18,22,26,0.78)"; ctx.fill()
      ctx.lineWidth = 1; ctx.strokeStyle = GROUP_COLORS[groups[i]] ?? "rgba(255,255,255,0.3)"; ctx.stroke()
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillText(label, tx + tw / 2, ty + th / 2 + 0.5, tw - 4)
    }
  }
  // an effect whose item is no longer in the bar (its last dose was used): its item in a circle, the ring emptying
  // as the time runs out (one circle per item, from the bar outwards)
  let ring = 0
  running.forEach((e, item) => {
    if (slots.some(o => o?.item === item)) return
    const er = size / 2 - 2, cx = g.rest.x + g.rest.dir * ((color && row > 0 ? 18 : 8) + er + ring++ * (er * 2 + 6)), cy = y + size / 2, k = Math.max(0, Math.min(1, e.left / Math.max(0.01, e.total)))
    const tint = effectTint(e.look)
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.translate(cx, cy); drawItem(ctx, item, er * 1.3, er * 1.3); ctx.restore()
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.stroke()
    // the last 3 seconds blink
    ctx.strokeStyle = tint; ctx.globalAlpha = e.left < 3 && Math.floor(e.left * 4) % 2 ? 0.35 : 1
    ctx.beginPath(); ctx.arc(cx, cy, er, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1
  })
  // the name of what she just picked up or switched to, over the bar for a moment
  const held = slots[combat.current] ?? null, key = `${combat.current}:${held?.item ?? ""}`
  const pill = invPill.get(row)
  if (!pill) invPill.set(row, { key, at: -Infinity })
  else if (pill.key !== key) { pill.key = key; pill.at = now }
  const since = now - (invPill.get(row)?.at ?? -Infinity)
  if (since < PILL_TIME) {
    const d = held ? combat.item(held.item) : null
    const name = d ? d.name : "Mãos vazias"
    const info = held && d ? [d.mag > 0 && !d.infiniteAmmo ? `${Math.ceil(held.ammo)}/${d.consumable ? CONSUMABLE_LIMITS[held.item] : d.mag}` : "", d.durability > 0 ? `${held.durability} golpes` : ""].filter(Boolean).join(" · ") : ""
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif"
    const nw = ctx.measureText(name).width
    ctx.font = "400 11px ui-monospace, monospace"
    const iw = info ? ctx.measureText(info).width + 7 : 0
    const pw = Math.ceil(nw + iw)
    // on the big bar, over the held slot (kept on the screen)
    const at = x0 + (g.xs[Math.min(combat.current, n - 1)] ?? 0) + size / 2
    const px = Math.round(bottom ? Math.max(8, Math.min(at - pw / 2, stageWidth() - pw - 8)) : x0 + g.w - pw), py = bottom ? y - 12 - (d?.instrument ? arpGlyphHeight(true) - 4 : 0) : y + size + 12
    ctx.globalAlpha = since > PILL_TIME - 300 ? (PILL_TIME - since) / 300 : 1
    ctx.shadowBlur = 0; ctx.shadowColor = "transparent"
    ctx.textAlign = "left"
    if (info) { ctx.fillStyle = "#aeb5be"; ctx.font = "400 11px ui-monospace, monospace"; ctx.fillText(info, px, py) }
    ctx.fillStyle = "#ffffff"; ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif"; ctx.fillText(name, px + iw, py)
    ctx.globalAlpha = 1
  }
  ctx.restore()
  return glyphs
}

// ---------- the inventory wheel: her items plus the empty slot (while there is room), in equal slices ----------
// centred on the screen; the first slot at the top, then clockwise in the inventory's order
export function wheelGeom() {
  const W = stageWidth(), H = window.innerHeight
  const rOut = Math.max(120, Math.min(230, Math.min(W, H) * 0.42))
  return { cx: W / 2, cy: H / 2, rOut, rIn: rOut * 0.5 }
}
export const GROUP_COLORS = ["#c77dff", "#ff9f43", "#7bd88f"]
export const GROUP_NAMES = ["Instrumento", "Arma", "Utilitário"]
export function drawWheel(ctx: Ctx, combat: Combat, hover: number, open: number) {
  const slots = combat.inventory, groups = combat.inventoryGroups, n = slots.length, { cx, cy, rOut, rIn } = wheelGeom(), span = wheelSpan(n)
  const ease = 1 - (1 - open) ** 3
  ctx.save()
  ctx.globalAlpha = ease
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, 0, stageWidth(), window.innerHeight)
  ctx.translate(cx, cy); ctx.scale(0.88 + 0.12 * ease, 0.88 + 0.12 * ease)
  const mid = (rIn + rOut) / 2, ring = rOut - rIn
  ctx.beginPath(); ctx.arc(0, 0, rIn - 3, 0, Math.PI * 2); ctx.fillStyle = "rgba(14,17,22,0.92)"; ctx.fill()
  for (let i = 0; i < n; i++) {
    const o = slots[i], c = wheelSliceCenter(i, n), on = i === hover
    const gap = n > 1 ? 1.5 / rIn : 0
    const a0 = n > 1 ? c - span / 2 + gap : 0, a1 = n > 1 ? c + span / 2 - gap : Math.PI * 2
    ctx.beginPath(); ctx.arc(0, 0, rOut, a0, a1); ctx.arc(0, 0, rIn, a1, a0, true); ctx.closePath()
    ctx.fillStyle = on ? "rgba(255,255,255,0.92)" : "rgba(28,32,38,0.66)"; ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.stroke()
    // the group's colour along the inner edge, the held one in yellow, the chosen one with a blue rim
    if (o) { ctx.strokeStyle = GROUP_COLORS[groups[i]]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rIn + 2.5, a0, a1); ctx.stroke() }
    if (i === combat.current) { ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, rOut - 2.5, a0, a1); ctx.stroke() }
    if (on) { ctx.strokeStyle = "#4cc9f0"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, rOut + 3.5, a0, a1); ctx.stroke() }
    const x = Math.cos(c) * mid, y = Math.sin(c) * mid, arc = n > 1 ? span * mid : Infinity
    if (o) {
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = ease * (on ? 1 : 0.85)
      // about the same area for every item: long guns stay long, a pistol is not huge, the bow is not a thin line
      const im = itemImage(o.item)
      if (im) {
        const [, , w, h] = im.box, maxW = Math.min(ring * 0.95, arc * 0.75), maxH = Math.min(ring * 0.7, arc * 0.7)
        const k = Math.min(maxW / w, maxH / h, Math.sqrt((ring * ring * 0.26) / (w * h)))
        ctx.drawImage(im.img, -w * k / 2, -h * k / 2, w * k, h * k)
      }
      ctx.restore()
    } else {
      ctx.fillStyle = on ? "rgba(20,24,30,0.7)" : "rgba(255,255,255,0.45)"
      ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText("vazio", x, y)
    }
  }
  // the centre: what the chosen (or held) slot is
  const i = hover >= 0 ? hover : combat.current, o = slots[i] ?? null
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  if (o) {
    const d = combat.item(o.item)
    ctx.fillStyle = GROUP_COLORS[groups[i]]; ctx.font = "10px ui-monospace, monospace"
    ctx.fillText(GROUP_NAMES[groups[i]].toUpperCase(), 0, -22)
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 17px ui-sans-serif, system-ui, sans-serif"
    ctx.fillText(d.name, 0, 0, rIn * 1.7)
    const info = [d.mag > 0 && !d.infiniteAmmo ? `${Math.ceil(o.ammo)}/${d.consumable ? CONSUMABLE_LIMITS[o.item] : d.mag}` : "", d.durability > 0 ? `${o.durability} golpes` : ""].filter(Boolean).join(" · ")
    if (info) { ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "11px ui-monospace, monospace"; ctx.fillText(info, 0, 20) }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "bold 15px ui-sans-serif, system-ui, sans-serif"
    ctx.fillText("Mãos vazias", 0, 0)
  }
  ctx.restore()
}
