// Draws the weapons' tambor / pente (lib/pigchicken/ammo-hud.ts): the small HUD next to the reticle (white micro
// icons with a thin dark edge; an empty one is only a faint outline) and the ring of rounds round her shoulder.
import { aroundAngle, aroundRing, cylinder, dropAlpha, hudSlot, litRounds, type AmmoDrop, type AmmoLook, type AmmoStyle, type AmmoView } from "@/lib/pigchicken/ammo-hud"

const AMMO = "#ffffff", OUT = "rgba(0,0,0,0.45)", EMPTY = "rgba(255,255,255,0.4)", RED = "#e5484d"

// one micro icon of a style, centred on 0 (along +x for the ones that point)
function hudIcon(ctx: CanvasRenderingContext2D, style: AmmoStyle, R: number, n: number, filled: boolean) {
  ctx.lineWidth = 1; ctx.strokeStyle = filled ? OUT : EMPTY; ctx.fillStyle = filled ? AMMO : "rgba(0,0,0,0)"
  const pill = (l: number, w: number) => { ctx.beginPath(); ctx.roundRect(-l / 2, -w / 2, l, w, w / 2); ctx.fill(); ctx.stroke() }
  if (style === "revolver" || style === "shotgun") {
    // a chamber: loaded, the round's base with its primer (the shell also has its rim); empty, the hole
    const { cr } = cylinder(style, R, n)
    ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    if (filled) {
      ctx.strokeStyle = OUT; ctx.fillStyle = OUT
      if (style === "shotgun") { ctx.beginPath(); ctx.arc(0, 0, cr * 0.64, 0, Math.PI * 2); ctx.stroke() }
      ctx.beginPath(); ctx.arc(0, 0, cr * (style === "shotgun" ? 0.22 : 0.3), 0, Math.PI * 2); ctx.fill()
    }
    return
  }
  if (style === "column") { ctx.beginPath(); ctx.arc(0, 0, R * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); return }
  if (style === "trios" || style === "arcs") { pill(R * 0.24, R * 0.11); return }
  if (style === "flanks") {
    // a small rocket pointing along +x
    const l = R * 0.46, w = R * 0.16
    ctx.beginPath(); ctx.moveTo(l / 2, 0); ctx.lineTo(l / 2 - w, -w / 2); ctx.lineTo(-l / 2 + w * 0.6, -w / 2); ctx.lineTo(-l / 2, -w); ctx.lineTo(-l / 2, w); ctx.lineTo(-l / 2 + w * 0.6, w / 2); ctx.lineTo(l / 2 - w, w / 2); ctx.closePath(); ctx.fill(); ctx.stroke()
    return
  }
  // an arrow along +x: shaft and head
  const l = R * 0.5
  if (filled) { ctx.lineWidth = Math.max(2.4, R * 0.11); ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(-l / 2, 0); ctx.lineTo(l / 2 - R * 0.1, 0); ctx.stroke() }
  ctx.lineWidth = Math.max(1, R * 0.05); ctx.strokeStyle = filled ? AMMO : EMPTY
  ctx.beginPath(); ctx.moveTo(-l / 2, 0); ctx.lineTo(l / 2 - R * 0.1, 0); ctx.stroke()
  ctx.lineWidth = 1; ctx.strokeStyle = filled ? OUT : EMPTY
  ctx.beginPath(); ctx.moveTo(l / 2 + R * 0.06, 0); ctx.lineTo(l / 2 - R * 0.14, -R * 0.075); ctx.lineTo(l / 2 - R * 0.14, R * 0.075); ctx.closePath(); ctx.fill(); ctx.stroke()
}

const edged = (ctx: CanvasRenderingContext2D, path: () => void, color = "rgba(255,255,255,0.7)") => {
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; path(); ctx.stroke()
  ctx.lineWidth = 1.2; ctx.strokeStyle = color; path(); ctx.stroke()
}

/** The HUD next to the reticle at (x, y): the weapon's rounds, lit for the loaded ones. */
export function drawAmmoHud(ctx: CanvasRenderingContext2D, v: AmmoView, x: number, y: number, R: number, alpha: number, reload: number, shellReload: boolean) {
  const look = v.look
  if (!look || alpha <= 0.003) return
  const n = look.n, lit = litRounds(look, v.ammo, reload, shellReload)
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = "round"; ctx.lineJoin = "round"
  if (look.style === "revolver" || look.style === "shotgun") {
    // the barrel's red mark above the chamber that fires
    const { rc, cr } = cylinder(look.style, R, n), my = y - rc - cr - R * 0.14, s = R * 0.12
    edged(ctx, () => { ctx.beginPath(); ctx.moveTo(x - s, my - s * 0.5); ctx.lineTo(x, my + s * 0.5); ctx.lineTo(x + s, my - s * 0.5) }, RED)
  } else if (look.style === "column") {
    // the Sniper's bracket, inside its rounds
    edged(ctx, () => { ctx.beginPath(); ctx.arc(x, y, R * 0.8, -0.62, 0.62) })
  } else if (look.style === "flanks") {
    const bx = R * 1.1, by = R * 0.42, k = R * 0.14
    for (const sx of [-1, 1]) edged(ctx, () => { ctx.beginPath(); ctx.moveTo(x + sx * (bx - k), y - by); ctx.lineTo(x + sx * bx, y - by); ctx.lineTo(x + sx * bx, y + by); ctx.lineTo(x + sx * (bx - k), y + by) })
  }
  for (let j = n - 1; j >= 0; j--) {
    const p = hudSlot(look, R, j, v.rot, v.ammo, v.draw)
    ctx.save(); ctx.translate(x + p.x, y + p.y); ctx.rotate(p.a); hudIcon(ctx, look.style, R, n, j < lit); ctx.restore()
  }
  ctx.restore()
}

// ---------- round her: rounds seen from the side ----------
const BRASS = "#d9a93f", BRASS_D = "#9c7224", COPPER = "#c0703c", STEEL = "#3d4448", STEEL_L = "#5c666b"
function sideRound(ctx: CanvasRenderingContext2D, look: AmmoLook) {
  const { L, W, kind } = look
  if (kind === "arrow") {
    ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2 - 6, 0); ctx.stroke()
    ctx.fillStyle = "#9aa4aa"; ctx.beginPath(); ctx.moveTo(L / 2 + 2, 0); ctx.lineTo(L / 2 - 8, -4); ctx.lineTo(L / 2 - 8, 4); ctx.closePath(); ctx.fill()
    ctx.fillStyle = "#e2523d"; ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2 + 9, -4.5); ctx.lineTo(-L / 2 + 12, 0); ctx.lineTo(-L / 2 + 9, 4.5); ctx.closePath(); ctx.fill()
    return
  }
  if (kind === "shell") { ctx.fillStyle = "#c23b2e"; ctx.fillRect(-L / 2 + 5, -W / 2, L - 5, W); ctx.fillStyle = BRASS; ctx.fillRect(-L / 2, -W / 2 - 1, 6, W + 2); return }
  if (kind === "rocket") {
    ctx.fillStyle = "#7d878c"; ctx.fillRect(-L / 2 + 4, -W / 4, L - 12, W / 2)
    ctx.fillStyle = "#c23b2e"; ctx.beginPath(); ctx.moveTo(L / 2 - 8, -W / 4); ctx.lineTo(L / 2 + 2, 0); ctx.lineTo(L / 2 - 8, W / 4); ctx.closePath(); ctx.fill()
    return
  }
  const pointy = kind === "rifle" || kind === "sniper", tip = pointy ? L * 0.36 : L * 0.3, caseL = L - tip, x0 = -L / 2 + caseL
  ctx.fillStyle = BRASS; ctx.fillRect(-L / 2, -W / 2, caseL, W)
  ctx.fillStyle = BRASS_D; ctx.fillRect(-L / 2, -W / 2, 1.6, W)
  ctx.fillStyle = COPPER; ctx.beginPath()
  if (pointy) { ctx.moveTo(x0, -W / 2 + 0.6); ctx.quadraticCurveTo(x0 + tip * 0.7, -W / 2 + 0.6, L / 2, 0); ctx.quadraticCurveTo(x0 + tip * 0.7, W / 2 - 0.6, x0, W / 2 - 0.6) }
  else { ctx.moveTo(x0, -W / 2); ctx.lineTo(x0 + tip - W / 2, -W / 2); ctx.arc(x0 + tip - W / 2, 0, W / 2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x0, W / 2) }
  ctx.closePath(); ctx.fill()
}
// a shell's base, in the Escopeta's drum
function shellBase(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = BRASS; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#c23b2e"; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = BRASS_D; ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill()
}

/** The ring of rounds (the Escopeta's drum) round her shoulder at (x, y), `scale` her size. */
export function drawAmmoAround(ctx: CanvasRenderingContext2D, v: AmmoView, x: number, y: number, scale: number, alpha: number, reload: number, shellReload: boolean) {
  const look = v.look
  if (!look || alpha <= 0.003) return
  const n = look.n, ring = aroundRing(look), lit = litRounds(look, v.ammo, reload, shellReload)
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha *= alpha
  if (ring.drum) {
    const base = ctx.globalAlpha
    ctx.globalAlpha = base * 0.85; ctx.fillStyle = STEEL
    ctx.beginPath(); ctx.arc(0, 0, ring.outer, 0, Math.PI * 2); ctx.arc(0, 0, ring.inner, 0, Math.PI * 2, true); ctx.fill("evenodd")
    ctx.strokeStyle = STEEL_L; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(0, 0, ring.outer - 1, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(0, 0, ring.inner + 1, 0, Math.PI * 2); ctx.stroke()
    if (n > 1) for (let i = 0; i < n; i++) {
      const a = aroundAngle(look, i + 0.5, v.rot)
      ctx.fillStyle = "#2a2f32"; ctx.beginPath(); ctx.ellipse(Math.cos(a) * (ring.outer - 2), Math.sin(a) * (ring.outer - 2), ring.hr * 0.55, ring.hr * 0.3, a, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = base
    for (let i = 0; i < n; i++) {
      const a = aroundAngle(look, i, v.rot)
      ctx.save(); ctx.translate(Math.cos(a) * ring.R, Math.sin(a) * ring.R)
      ctx.fillStyle = "#121416"; ctx.beginPath(); ctx.arc(0, 0, ring.hr + 1.5, 0, Math.PI * 2); ctx.fill()
      if (i < lit) shellBase(ctx, ring.hr)
      ctx.restore()
    }
  } else {
    for (let i = n - 1; i >= 0; i--) {
      const a = aroundAngle(look, i, v.rot)
      ctx.save(); ctx.translate(Math.cos(a) * ring.R, Math.sin(a) * ring.R); ctx.rotate(a)
      if (i < lit) sideRound(ctx, look)
      else { ctx.globalAlpha *= 0.45; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-look.L / 2 + 2, 0, Math.max(2, Math.min(5, look.W / 2)), 0, Math.PI * 2); ctx.stroke() }
      ctx.restore()
    }
  }
  ctx.restore()
}

/** The rounds falling off (both views). */
export function drawAmmoDrops(ctx: CanvasRenderingContext2D, v: AmmoView) {
  for (const d of v.drops) drawDrop(ctx, d)
}
function drawDrop(ctx: CanvasRenderingContext2D, d: AmmoDrop) {
  const a = dropAlpha(d)
  if (a <= 0.003) return
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.globalAlpha *= a
  if (d.hud) hudIcon(ctx, d.look.style, d.scale * 15, d.look.n, true)
  else {
    ctx.scale(d.scale, d.scale)
    if (d.look.kind === "shell" && aroundRing(d.look).drum) shellBase(ctx, aroundRing(d.look).hr)
    else sideRound(ctx, d.look)
  }
  ctx.restore()
}
