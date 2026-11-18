// The world pass: everything drawn in world coordinates each frame, and the per-frame state it reads.
// Split out of parquinho.tsx; the component there owns the loop and calls these each frame.
import { chickenBindName, padStyleAt, type ChickenAction, type ChickenControls } from "@/lib/chicken/controls"
import { type InputDeviceId } from "@/lib/chicken/input-devices"
import { type Combat, type Pickup } from "@/lib/pigchicken/combat"
import { type Catalog } from "@/lib/pigchicken/alien-catalog"
import { nearestPoint } from "@/lib/pigchicken/eyes"
import { lookSpecies } from "@/lib/pigchicken/enemies"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"
import { RACK_ITEM_START, rackCountdown } from "@/lib/pigchicken/racks"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { type Temple } from "@/lib/pigchicken/temple"
import { type NoteStage } from "@/lib/pigchicken/note-stage"
import { drawJukebox } from "@/components/pigchicken/note-stage-draw"
import { coverCanvas } from "@/components/pigchicken/song-cover-draw"
import { CAMPAIGN, type Library } from "@/lib/pigchicken/song-library"
import { drawGong, drawGongTotem, drawResetStone, drawTempleAlien, type GongLook } from "@/components/pigchicken/temple-draw"
import { lookTargets, drawBird, drawUndead, drawPerson, drawButton, drawAlien, drawZombie, drawDummy, drawDummyTip } from "./creatures"
import { drawNote, drawPuff } from "./effects"
import { drawItem, type Ctx } from "./shared"
import { chestMarks, drawChest } from "./chests"
import { drawHarp, seatMarks } from "./harp"
import { drawDrumKit } from "./drumkit"
import { CAGE_WORLD_SCALE, drawCageOnFloor } from "./cages"
import { cageArt } from "@/lib/pigchicken/cage-art"
import { drawBolts, drawFlights, drawShocked, drawSkyFlash, drawXray } from "./shock"
import { drawCards } from "./cards"
import { drawItemBeam, drawItemOutline } from "./item-glow"
import { itemGlowLook, ITEM_GLOW_OFF, type ItemGlow } from "@/lib/pigchicken/item-glow"
import { drawHooks } from "./hook"

// the temple drawn with the world: its state and which aliens are about to drop a bomb (set every frame)
// gongs: how each Gongo of the layout looks now (by its button's label); jukeLast: the jukebox struck last (its ring)
export const templeDraw: { temple: Temple | null; stage: NoteStage | null; charges: Map<number, number>; library: Library | null; catalog: Catalog | null; jukeRing: number; jukeLast: string; gongs: Map<string, GongLook> } = { temple: null, stage: null, charges: new Map(), library: null, catalog: null, jukeRing: 9, jukeLast: "jukebox", gongs: new Map() }

// the hint over the items the local players can grab (set every frame): the first player to stand on one shows theirs
export const pickupMarks = new Map<Pickup, { c: string; t: string }>()
const MARK_GREY = "#9aa0a8"
export function markHover(combat: Combat, key: string) {
  const at = (p: Pickup | null, c: string, t: string) => { if (p && !pickupMarks.has(p)) pickupMarks.set(p, { c, t: key ? `${key}: ${t}` : t }) }
  // blue: a new item, taken; grey: something of hers changes places (swapped out with no room, or hers equipped)
  at(combat.hover, combat.hoverSwaps ? MARK_GREY : "#4cc9f0", combat.hoverSwaps ? "trocar" : "pegar")
  at(combat.hoverOwned, MARK_GREY, "equipar")
  const near = combat.chestNear
  if (near && !chestMarks.has(near.chest)) chestMarks.set(near.chest, { key, block: near.block, souls: combat.capturedSouls })
  const seat = combat.seatNear
  if (seat && !seatMarks.has(seat)) seatMarks.set(seat, { key })
}
// the grab bind a player sees: from the keyboard they hold (primary first), else from their gamepad
// the name of an action's first bind on a player's inputs: their keyboard's, else their gamepad's ("" when unbound)
export function bindLabel(c: ChickenControls, devices: readonly InputDeviceId[] | null, action: ChickenAction) {
  const pick = (slots: (string | null)[]) => slots.find(Boolean) ?? null
  const kb = !devices || devices.includes("kb1") ? pick(c.keys[action]) : devices.includes("kb2") ? pick(c.keys2[action]) : null
  const pad = devices?.find(d => d.startsWith("pad"))
  const tok = kb ?? (!devices || pad ? pick(c.pad[action]) : null)
  // a gamepad bind is named after this player's own gamepad (a PlayStation pad shows ✕ ○ □ △ L1 ...)
  return tok ? chickenBindName(tok, tok.startsWith("Pad:") ? padStyleAt(pad ? Number(pad.slice(3)) : undefined) : undefined) : ""
}
export const grabLabel = (c: ChickenControls, devices: readonly InputDeviceId[] | null) => bindLabel(c, devices, "grab")
// the keys shown left of each inventory group on the big bar: Próximo instrumento, Próxima arma, Próximo utilitário
export const groupBindLabels = (c: ChickenControls, devices: readonly InputDeviceId[] | null) =>
  (["nextInstrument", "nextWeapon", "nextUtility"] as const).map(a => bindLabel(c, devices, a).toUpperCase() || null)
// glow: Configurações do Pátio → Brilho dos itens, over every item lying on the floor
export function drawWorld(ctx: Ctx, combat: Combat, camX: number, view: ViewRect, glow: ItemGlow = ITEM_GLOW_OFF) {
  const visible = (x: number, y: number, w = 160, h = 240) => intersectsView({ x: x - w / 2, y: y - h, w, h }, view, 32)
  const X = (x: number) => x - camX
  const t = performance.now() / 1000
  const floorY = combat.targets.find(t => t.kind === "dummy")?.y ?? WORLD_GROUND_Y
  combat.racks.forEach(r => {
    const x = X(r.x), groundY = r.y ?? floorY
    if (!visible(r.x, groundY)) return
    ctx.fillStyle = "#5b4630"; ctx.fillRect(x - 34, groundY - 52, 6, 52); ctx.fillRect(x + 28, groundY - 52, 6, 52)
    ctx.fillStyle = "#7a5f40"; ctx.fillRect(x - 38, groundY - 56, 76, 7)
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(r.label, x, groundY - 62)
    // waiting to put its item back: the time left, where the item appears
    const left = rackCountdown(r)
    if (left) { ctx.textBaseline = "top"; ctx.fillText(left, x, groundY - RACK_ITEM_START); ctx.textBaseline = "alphabetic" }
  })
  combat.chests.forEach(c => { if (visible(c.x, c.y + 40, 320, 520)) drawChest(ctx, c, X(c.x), t) })
  combat.seats.forEach(s => { if (!visible(s.x, s.y + 40, 320, 520)) return; if (s.kind === 'drumkit') drawDrumKit(ctx, s, X(s.x), p => combat.seatPulse(s, p)); else drawHarp(ctx, s, X(s.x)) })
  const glowLook = itemGlowLook(glow.amount)
  combat.pickups.forEach(p => {
    if (!visible(p.x, p.y + 40, 160, glowLook ? glowLook.beamH + 40 : 240)) return
    const x = X(p.x), y = p.y - 14 - Math.sin(t * 3 + p.id) * 3
    // its column of light (behind it), breathing a little
    if (glowLook) drawItemBeam(ctx, x, p.y, glowLook, glow.color, 0.92 + 0.08 * Math.sin(t * 2.2 + p.id * 1.7))
    // a Gaiola stands on the floor with whoever is in it (its own image: ./cages.ts)
    const cage = p.owned.cage
    if (cage) {
      const mark = pickupMarks.get(p), top = p.y - (cageArt(p.owned.item).h - cageArt(p.owned.item).hang[1]) * CAGE_WORLD_SCALE
      ctx.save()
      if (mark) ctx.filter = `drop-shadow(2px 0 0 ${mark.c}) drop-shadow(-2px 0 0 ${mark.c}) drop-shadow(0 2px 0 ${mark.c}) drop-shadow(0 -2px 0 ${mark.c})`
      drawCageOnFloor(ctx, p.owned.item, cage, x, p.y)
      ctx.filter = "none"
      ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"
      if (mark) { ctx.fillStyle = mark.c; ctx.fillText(mark.t, x, top - 18) }
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillText(`${cage.souls.length}/${cage.cap}`, x, top - 5)
      ctx.restore()
      return
    }
    ctx.fillStyle = "rgba(123,223,242,0.18)"; ctx.beginPath(); ctx.ellipse(x, p.y - 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.translate(x, y - 8)
    // the item grab would take: a blue outline and the key to press
    // blue: grab takes it; grey: grab swaps it in (no room for it) or, when she already carries one, equips hers
    const mark = pickupMarks.get(p)
    if (glowLook) drawItemOutline(ctx, p.owned.item, 64, 34, glow.color, glow.amount)
    if (mark) {
      ctx.filter = `drop-shadow(2px 0 0 ${mark.c}) drop-shadow(-2px 0 0 ${mark.c}) drop-shadow(0 2px 0 ${mark.c}) drop-shadow(0 -2px 0 ${mark.c})`
      drawItem(ctx, p.owned.item, 64, 34); ctx.filter = "none"
      ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = mark.c; ctx.fillText(mark.t, 0, 30)
    } else drawItem(ctx, p.owned.item, 64, 34)
    ctx.restore()
  })
  combat.thrown.forEach(o => {
    if (!visible(o.x, o.y + 80)) return
    ctx.save(); ctx.translate(X(o.x), o.y); ctx.rotate(o.angle); drawItem(ctx, o.owned.item, 64, 34); ctx.restore()
  })
  combat.critters.forEach(c => { if (!visible(c.x, c.y + 60)) return; if (c.kind === "bird") drawBird(ctx, c, X(c.x)); else drawPerson(ctx, c, X(c.x)) })
  drawFlights(ctx, combat, camX, view)
  drawHooks(ctx, combat, camX, view)
  drawCards(ctx, combat, camX, view)
  const drawTarget = (ctx: Ctx, g: Combat["targets"][number], x: number) => {
    if (g.kind === "undead") { drawUndead(ctx, g, x, combat.music.beatPhase, combat.music.beat); return }
    if (g.kind === "alien" && lookSpecies(g.data)) { drawTempleAlien(ctx, g, x, combat.music.beatPhase, templeDraw.charges.get(g.id) ?? 0, combat.music.beat, nearestPoint({ x: g.x, y: g.y - g.h / 2 }, lookTargets)); return }
    if (g.kind === "alien") { drawAlien(ctx, g, x); return }
    if (g.kind === "button" && g.label === "gong") { if (templeDraw.temple) drawGong(ctx, g, x, templeDraw.temple); return }
    if (g.kind === "button" && g.label === "reset") { if (templeDraw.temple) drawResetStone(ctx, g, x, templeDraw.temple); return }
    if (g.kind === "button" && g.label?.startsWith("gong:")) { const look = templeDraw.gongs.get(g.label); if (look) drawGongTotem(ctx, g, x, look); return }
    if (g.kind === "button" && (g.label === "jukebox" || g.label?.startsWith("jukebox:"))) {
      const st = templeDraw.stage, lib = templeDraw.library
      const picked = lib?.songs.find(x => x.id === (st?.active ? st.song.id : lib.picked)) ?? null
      drawJukebox(ctx, g, x, { cover: coverCanvas(picked, 96, templeDraw.catalog ?? undefined), playing: !!st?.active, color: picked?.music.zone.color ?? CAMPAIGN.color, beatPhase: combat.music.beatPhase, ring: g.label === templeDraw.jukeLast ? templeDraw.jukeRing : 9 })
      return
    }
    if (g.kind === "zombie") { drawZombie(ctx, g, x); return }
    if (g.kind === "button") { drawButton(ctx, g, x); return }
    drawDummy(ctx, g, x, t)
  }
  combat.targets.forEach(g => {
    if (!visible(g.x, g.y + 60, Math.max(320, g.w + 160), g.h + 240)) return
    if (g.state === "converted") return
    // shocked by a lightning weapon: it shakes and blinks in x-ray
    if (g.shock && g.kind !== "button") drawShocked(ctx, g, X(g.x), t, (c, x) => drawTarget(c, g, x))
    // standing in a Zona with x-ray: always in x-ray
    else if (g.kind !== "button" && combat.zoneEffectsAt(g.x, g.y - g.h / 2).xray) drawXray(ctx, g, X(g.x), (c, x) => drawTarget(c, g, x))
    else drawTarget(ctx, g, X(g.x))
  })
  const pulse = Math.pow(1 - combat.music.beatPhase, 3)
  combat.bullets.forEach(b => {
    if (!visible(b.x, b.y + 100, Math.max(200, b.size * 2 + 64))) return
    const len = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / len, uy = b.vy / len, x = X(b.x)
    ctx.lineCap = "round"
    if (b.note) drawNote(ctx, b, x, pulse)
    else if (b.item === "grenade") {
      ctx.fillStyle = "#4b5320"; ctx.beginPath(); ctx.arc(x, b.y, b.size, 0, Math.PI * 2); ctx.fill()
      // the fuse blinks faster as it runs out
      if (Math.sin(b.t * (6 + b.t * 10)) > 0) { ctx.fillStyle = "#ff6b5b"; ctx.beginPath(); ctx.arc(x, b.y - b.size, 2.5, 0, Math.PI * 2); ctx.fill() }
    } else if (b.item === "launcher") {
      ctx.strokeStyle = "rgba(255,170,80,0.8)"; ctx.lineWidth = b.size
      ctx.beginPath(); ctx.moveTo(x - ux * 30, b.y - uy * 30); ctx.lineTo(x - ux * 8, b.y - uy * 8); ctx.stroke()
      ctx.strokeStyle = "#d6453d"; ctx.lineWidth = b.size + 2
      ctx.beginPath(); ctx.moveTo(x - ux * 10, b.y - uy * 10); ctx.lineTo(x, b.y); ctx.stroke()
    } else if (b.item === "bow") {
      ctx.strokeStyle = "#c9a46a"; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x - ux * 30, b.y - uy * 30); ctx.lineTo(x, b.y); ctx.stroke()
      ctx.fillStyle = "#c9ced6"; ctx.beginPath(); ctx.moveTo(x + ux * 4, b.y + uy * 4); ctx.lineTo(x - ux * 4 - uy * 4, b.y - uy * 4 + ux * 4); ctx.lineTo(x - ux * 4 + uy * 4, b.y - uy * 4 - ux * 4); ctx.fill()
    } else {
      ctx.strokeStyle = "rgba(255,230,140,0.9)"; ctx.lineWidth = b.size
      ctx.beginPath(); ctx.moveTo(x - ux * 14, b.y - uy * 14); ctx.lineTo(x, b.y); ctx.stroke()
    }
  })
  combat.tracers.forEach(t => {
    if (!intersectsView({ x: Math.min(t.x1, t.x2), y: Math.min(t.y1, t.y2), w: Math.abs(t.x2 - t.x1), h: Math.abs(t.y2 - t.y1) }, view, 8)) return
    ctx.strokeStyle = `rgba(255,245,200,${Math.min(1, t.life * 10)})`; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(X(t.x1), t.y1); ctx.lineTo(X(t.x2), t.y2); ctx.stroke()
  })
  combat.booms.forEach(b => {
    if (!intersectsView({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, view, 8)) return
    if (b.color) {
      // an instrument's burst: rings of colour opening out
      const k = 1 - b.life / 0.5
      ctx.lineWidth = 3
      ;[1, 0.7, 0.4].forEach((f, i) => { ctx.strokeStyle = b.color!; ctx.globalAlpha = (1 - k) * (0.9 - i * 0.25); ctx.beginPath(); ctx.arc(X(b.x), b.y, b.r * f * (0.2 + 0.8 * k), 0, Math.PI * 2); ctx.stroke() })
      ctx.globalAlpha = 1
      return
    }
    const k = 1 - b.life / 0.35
    ctx.fillStyle = `rgba(255,170,70,${0.45 * (1 - k)})`; ctx.beginPath(); ctx.arc(X(b.x), b.y, b.r * (0.3 + 0.7 * k), 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(255,240,200,${0.8 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(b.x), b.y, b.r * k, 0, Math.PI * 2); ctx.stroke()
  })
  drawBolts(ctx, combat, camX, view, t)
  combat.puffs.forEach(p => { if (visible(p.x, p.y + 30, 60, 60)) drawPuff(ctx, X(p.x), p.y, p) })
  combat.sparks.forEach(s => { if (!visible(s.x, s.y + s.size, s.size * 2, s.size * 2)) return; ctx.globalAlpha = Math.max(0, s.life / s.max); ctx.fillStyle = s.color; ctx.fillRect(X(s.x) - s.size / 2, s.y - s.size / 2, s.size, s.size) })
  ctx.globalAlpha = 1
  ctx.font = "bold 13px ui-monospace, monospace"; ctx.textAlign = "center"
  combat.texts.forEach(tx => {
    if (!visible(tx.x, tx.y + 40, tx.text.length * (tx.size ?? 13) + 32, 100)) return
    ctx.font = tx.size ? `bold ${tx.size}px ui-sans-serif, system-ui, sans-serif` : "bold 13px ui-monospace, monospace"
    ctx.globalAlpha = Math.min(1, tx.life * 2); ctx.fillStyle = "#000"; ctx.fillText(tx.text, X(tx.x) + 1, tx.y + 1); ctx.fillStyle = tx.color; ctx.fillText(tx.text, X(tx.x), tx.y)
  })
  ctx.globalAlpha = 1
  drawSkyFlash(ctx, combat, camX, view)
  // the tips of destroyed dummies, above everything
  combat.targets.forEach(g => { if (g.dummy && (g.dummy.tipT > 0 || visible(g.x, g.y, 400, g.h + 300))) drawDummyTip(ctx, g, X(g.x), t) })
}
