// Screen-space HUD: the reticle, the throw path, the inventory bars and the item wheel.
// Split out of parquinho.tsx; the component there owns the loop and calls these each frame.
import { CONSUMABLE_LIMITS } from "@/lib/pigchicken/items"
import { type Combat } from "@/lib/pigchicken/combat"
import { itemGroup, wheelSliceCenter, wheelSpan } from "@/lib/pigchicken/inventory"
import { itemImage } from "@/lib/pigchicken/art"
import { drawItem, type Ctx } from "./shared"

export function drawReticle(ctx: Ctx, combat: Combat, origin: { x: number; y: number }, rx: number, ry: number, dist: number, spreadDeg: number, locked: boolean, path: { x: number; y: number }[] | null, showPath: boolean, showLand: boolean, tint: string) {
  const d = combat.def(), armed = !!combat.inventory[combat.current] && d.mag > 0 && !d.meleeOnly
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
  // the faint aim line (the families that draw their own path skip it)
  if (showPath && !path && d.reticle !== "cone") {
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
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
    if (showPath && end) { ctx.strokeStyle = "rgba(255,80,80,0.75)"; ctx.lineWidth = 1; line(origin.x, origin.y, end.x, end.y) }
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
      path.forEach((p, i) => { if (i % 3 === 0) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill() } })
    } else { ctx.setLineDash([3, 5]); line(origin.x, origin.y, end.x, end.y); ctx.setLineDash([]) }
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
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4])
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

// where a throw let go now would fly: a dotted arc, solid for its first half and fading out over the second
export function drawThrowPath(ctx: Ctx, pts: { x: number; y: number }[]) {
  if (pts.length < 2) return
  const len: number[] = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = len[len.length - 1]
  if (total < 1) return
  ctx.save()
  ctx.fillStyle = "#7bdff2"
  let j = 1
  for (let at = 14; at < total; at += 14) {
    while (j < pts.length - 1 && len[j] < at) j++
    const a = pts[j - 1], b = pts[j], seg = len[j] - len[j - 1] || 1, u = (at - len[j - 1]) / seg
    const t = at / total
    ctx.globalAlpha = 0.9 * (t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.5))
    ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 2.6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

export const INV_SIZE = 34, INV_GAP = 0, INV_TOP = 100
export const INV_W = (n: number) => n * INV_SIZE + (n - 1) * INV_GAP
// the inventories' stack on a phone held upright: top right, one row per local player, the player's avatar at the
// right end of the row (the avatars stay there on every screen)
export const INV_STACK = { top: 64, right: 12, size: INV_SIZE, rowGap: 6, avatarGap: 6 }
export const invRowY = (row: number) => INV_STACK.top + row * (INV_SIZE + INV_STACK.rowGap)
export const invRight = INV_STACK.right + INV_SIZE + INV_STACK.avatarGap
// the hotbar at the bottom (desktop and tablet): big slots apart from each other, the key numbers under them; the
// world is lifted so her ground sits above it
export const BAR = { size: 56, gap: 6, tab: 16, bottom: 12, side: 16 }
export const BAR_GROUND_H = 100
export const BAR_W = (n: number) => n * BAR.size + (n - 1) * BAR.gap
// a mouse is the main pointer (desktop): the slot numbers (keys 1-9) only show there
export const desktopPointer = typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)") : null
// where a player's bar sits. bottom: the first player's big bar, at the bottom on the right (desktop and tablet).
// Otherwise the small row to the left of that player's avatar, in the stack at the top right (every local player
// but the first on desktop and tablet; everyone on a phone held upright)
export function invGeom(row: number, n: number, bottom: boolean, offset?: { x: number; y: number }) {
  const W = window.innerWidth, H = window.innerHeight
  if (!bottom) {
    const w = INV_W(n)
    return { x: Math.round(W - invRight - w + (offset?.x ?? 0)), y: invRowY(row) + (offset?.y ?? 0), size: INV_SIZE, gap: 3, w, tabs: false }
  }
  const w = BAR_W(n), x = W - BAR.side - w, y = H - BAR.bottom - BAR.tab - BAR.size
  return { x: Math.round(x + (offset?.x ?? 0)), y: Math.round(y + (offset?.y ?? 0)), size: BAR.size, gap: BAR.gap, w, tabs: true }
}
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
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
// the inventory bar, moved by the player's saved offset (edit mode of the touch controls). Only her items show, plus
// one empty slot while there is room (instruments, weapons, then the other items). Each slot is a glass tile; the
// current one glows teal. A bar along the bottom shows the ammo (a badge counts a consumable's doses), a thin line
// what is left of an item that wears.
export function drawInventory(ctx: Ctx, combat: Combat, row: number, bottom: boolean, color: string | null, now: number, offset?: { x: number; y: number }) {
  const slots = combat.inventory, n = slots.length
  const g = invGeom(row, n, bottom, offset), { size, gap } = g
  const x0 = g.x, y = g.y
  // the slot numbers (keys 1-9) are the first player's, with a mouse
  const numbers = g.tabs && row === 0 && (desktopPointer?.matches ?? true)
  const r = bottom ? 9 : 5
  ctx.save()
  ctx.textBaseline = "middle"
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (size + gap), o = slots[i], on = i === combat.current
    roundRect(ctx, x, y, size, size, r)
    if (on) { ctx.save(); ctx.shadowColor = "rgba(64,224,208,0.85)"; ctx.shadowBlur = bottom ? 14 : 8; ctx.fillStyle = "rgba(38,92,88,0.62)"; ctx.fill(); ctx.restore() }
    else { ctx.fillStyle = "rgba(48,58,52,0.5)"; ctx.fill() }
    ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? "#5ee8d8" : "rgba(255,255,255,0.22)"; ctx.stroke()
    // a soft light along the top edge: glass
    ctx.save(); roundRect(ctx, x + 1, y + 1, size - 2, size * 0.45, r - 1); ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill(); ctx.restore()
    if (o) {
      ctx.save(); ctx.translate(x + size / 2, y + size / 2 + 1); drawItem(ctx, o.item, size - (bottom ? 12 : 6), size - (bottom ? 14 : 8)); ctx.restore()
      const d = combat.item(o.item)
      // a consumable's badge: the doses left, in the bottom right corner
      if (d.mag > 0 && d.consumable) {
        const t = String(Math.ceil(o.ammo))
        ctx.font = `bold ${bottom ? 12 : 9}px ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = "right"
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(t, x + size - 4, y + size - (bottom ? 9 : 6))
        ctx.fillStyle = o.ammo <= 0 ? "#ff8c69" : "#ffffff"; ctx.fillText(t, x + size - 4, y + size - (bottom ? 9 : 6))
      }
      // the shots (or the taco's blows) loaded and coming back
      const ammoBar = d.mag > 0 && !d.consumable, barH = bottom ? 4 : 3
      if (ammoBar) {
        const segs = Math.max(1, Math.round(d.mag))
        const coming = on && combat.reloading > 0 ? (d.shellReload ? combat.reloading : combat.reloading * (segs - o.ammo))
          : d.refillTime > 0 ? ((o.refill ?? 0) / d.refillTime) * Math.max(1, d.refillAmount) : 0
        drawAmmoBar(ctx, x, y, size, r, barH, d.mag, o.ammo, coming)
      }
      // what is left of an item that wears out with hits (over the ammo bar when it has one)
      if (d.durability > 0 && o.durability < d.durability) {
        const k = Math.max(0, o.durability / d.durability), bw = size - 12, ly = y + size - 4 - (ammoBar ? barH + 2 : 0)
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x + 6, ly, bw, 2)
        ctx.fillStyle = k > 0.5 ? "#7bd88f" : k > 0.25 ? "#ffd166" : "#ff6b5b"; ctx.fillRect(x + 6, ly, bw * k, 2)
      }
    }
    // the key number under the slot (keys 1-9)
    if (numbers && i < 9) {
      const tx = x + size / 2, tw = 16, th = 13, ty = y + size + 3
      roundRect(ctx, tx - tw / 2, ty, tw, th, 3); ctx.fillStyle = on ? "rgba(38,92,88,0.9)" : "rgba(18,22,26,0.72)"; ctx.fill()
      ctx.lineWidth = 1; ctx.strokeStyle = on ? "#5ee8d8" : "rgba(255,255,255,0.28)"; ctx.stroke()
      ctx.font = "bold 9px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = on ? "#ffffff" : "rgba(255,255,255,0.75)"
      ctx.fillText(String(i + 1), tx, ty + th / 2 + 0.5)
    }
  }
  // the other local players: a dot of their colour at the start of the bar
  if (color && row > 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 - 8, y + size / 2, 4, 0, Math.PI * 2); ctx.fill() }
  // the effect running on her (a consumable): its item in a circle, the ring emptying as the time runs out
  const e = combat.effect
  if (e) {
    const er = size / 2 - 2, cx = x0 - (color && row > 0 ? 18 : 8) - er, cy = y + size / 2, k = Math.max(0, Math.min(1, e.left / Math.max(0.01, e.total)))
    const tint = e.look === "buddha" ? "#ffd166" : e.look === "fizz" ? "#f3e1c7" : "#7bdff2"
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.translate(cx, cy); drawItem(ctx, e.item, er * 1.3, er * 1.3); ctx.restore()
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.stroke()
    // the last 3 seconds blink
    ctx.strokeStyle = tint; ctx.globalAlpha = e.left < 3 && Math.floor(e.left * 4) % 2 ? 0.35 : 1
    ctx.beginPath(); ctx.arc(cx, cy, er, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1
  }
  // the name of what she just picked up or switched to, over the bar for a moment
  const held = slots[combat.current] ?? null, key = `${combat.current}:${held?.item ?? ""}`
  const pill = invPill.get(row)
  if (!pill) invPill.set(row, { key, at: -Infinity })
  else if (pill.key !== key) { pill.key = key; pill.at = now }
  const since = now - (invPill.get(row)?.at ?? -Infinity)
  if (since < PILL_TIME) {
    const d = held ? combat.item(held.item) : null
    const name = d ? d.name : "Mãos vazias"
    const info = held && d ? [d.mag > 0 ? `${Math.ceil(held.ammo)}/${d.consumable ? CONSUMABLE_LIMITS[held.item] : d.mag}` : "", d.durability > 0 ? `${held.durability} golpes` : ""].filter(Boolean).join(" · ") : ""
    ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif"
    const nw = ctx.measureText(name).width
    ctx.font = "11px ui-monospace, monospace"
    const iw = info ? ctx.measureText(info).width + 14 : 0
    const icon = held ? 26 : 0, pw = Math.ceil(12 + icon + nw + iw + 12), ph = 26
    const px = Math.round(bottom ? Math.min(x0 + g.w / 2 - pw / 2, window.innerWidth - pw - 8) : x0 + g.w - pw), py = bottom ? y - ph - 10 : y + size + 6
    ctx.globalAlpha = since > PILL_TIME - 300 ? (PILL_TIME - since) / 300 : 1
    roundRect(ctx, px, py, pw, ph, 7); ctx.fillStyle = "rgba(24,30,28,0.78)"; ctx.fill()
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.stroke()
    let cx = px + 12
    if (held) { ctx.save(); ctx.translate(cx + 10, py + ph / 2); drawItem(ctx, held.item, 20, 16); ctx.restore(); cx += icon }
    ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif"; ctx.fillText(name, cx, py + ph / 2 + 0.5)
    if (info) { ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "11px ui-monospace, monospace"; ctx.fillText(info, cx + nw + 14, py + ph / 2 + 0.5) }
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// ---------- the inventory wheel: her items plus the empty slot (while there is room), in equal slices ----------
// centred on the screen; the first slot at the top, then clockwise in the inventory's order
export function wheelGeom() {
  const W = window.innerWidth, H = window.innerHeight
  const rOut = Math.max(120, Math.min(230, Math.min(W, H) * 0.42))
  return { cx: W / 2, cy: H / 2, rOut, rIn: rOut * 0.5 }
}
export const GROUP_COLORS = ["#c77dff", "#ff9f43", "#7bd88f"]
export const GROUP_NAMES = ["Instrumento", "Arma", "Item"]
export function drawWheel(ctx: Ctx, combat: Combat, hover: number, open: number) {
  const slots = combat.inventory, n = slots.length, { cx, cy, rOut, rIn } = wheelGeom(), span = wheelSpan(n)
  const ease = 1 - (1 - open) ** 3
  ctx.save()
  ctx.globalAlpha = ease
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
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
    if (o) { ctx.strokeStyle = GROUP_COLORS[itemGroup(o.item, combat.item(o.item).instrument)]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rIn + 2.5, a0, a1); ctx.stroke() }
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
    ctx.fillStyle = GROUP_COLORS[itemGroup(o.item, d.instrument)]; ctx.font = "10px ui-monospace, monospace"
    ctx.fillText(GROUP_NAMES[itemGroup(o.item, d.instrument)].toUpperCase(), 0, -22)
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 17px ui-sans-serif, system-ui, sans-serif"
    ctx.fillText(d.name, 0, 0, rIn * 1.7)
    const info = [d.mag > 0 ? `${Math.ceil(o.ammo)}/${d.consumable ? CONSUMABLE_LIMITS[o.item] : d.mag}` : "", d.durability > 0 ? `${o.durability} golpes` : ""].filter(Boolean).join(" · ")
    if (info) { ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "11px ui-monospace, monospace"; ctx.fillText(info, 0, 20) }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "bold 15px ui-sans-serif, system-ui, sans-serif"
    ctx.fillText("Mãos vazias", 0, 0)
  }
  ctx.restore()
}
