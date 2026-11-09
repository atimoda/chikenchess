// Birds, undead (and their riders), people, horde buttons, aliens, zombies and training dummies.
// Split out of parquinho.tsx; the component there owns the loop and calls these each frame.
import { TIP_TIME, type Combat } from "@/lib/pigchicken/combat"
import { lookDir, lookRows, nearestPoint } from "@/lib/pigchicken/eyes"
import { ALIEN_FRAMES, ALIEN_PIXEL, ZOMBIE_TIMES, type EnemyData } from "@/lib/pigchicken/enemies"
import { drawTempleAlien } from "@/components/pigchicken/temple-draw"
import { BIRDS, UNDEAD_EYE, birdColors, type BirdType } from "@/lib/pigchicken/birds"
import { undeadSize, type UndeadState } from "@/lib/pigchicken/undead"
import { type Ctx } from "./shared"

// where the characters are (world coordinates, at their heads), set every frame: the aliens' eyes follow the
// nearest one. Only her for now; online, every character on screen goes in here.
export const lookTargets: { x: number; y: number }[] = []

// the bird an alien becomes: original pixel art, two flaps. '#' body, 'w' wing, 'b' belly, 'o' eye, '>' beak
export const BIRD_FRAMES = [
  [
    "..w......w.",
    "..ww....ww.",
    "...ww..ww..",
    "....####...",
    "..#####o#>>",
    ".#bbbbbb#..",
    "...bbbb....",
    "....#.#....",
  ],
  [
    "...........",
    "...........",
    "....####...",
    "..#####o#>>",
    "wwwwbbbbb#.",
    "w.#bbbb#...",
    "...####....",
    "....#.#....",
  ],
]
// a bird of a type (or the old one in its alien's colour), undead ones grey with eyes in their note's colour
export function drawBirdArt(ctx: Ctx, x: number, y: number, face: number, t: number, type: BirdType | null, color: string, undead = false, eye = UNDEAD_EYE, flash = 0) {
  const f = BIRD_FRAMES[Math.floor(t * (type?.flap ?? 8.3)) % 2], p = type?.pixel ?? 4
  const c = type ? birdColors(type, undead) : { body: color, wing: color, belly: color, beak: "#ffb347" }
  ctx.save(); ctx.translate(x, y); ctx.scale(face < 0 ? -1 : 1, 1)
  f.forEach((row, r) => { for (let i = 0; i < row.length; i++) {
    const ch = row[i]; if (ch === ".") continue
    ctx.fillStyle = flash > 0 ? "#ffffff" : ch === "o" ? (undead ? eye : "#101018") : ch === ">" ? c.beak : ch === "w" ? c.wing : ch === "b" ? c.belly : c.body
    ctx.fillRect((i - 5.5) * p, (r - 4) * p, p, p)
  } })
  if (undead) { ctx.globalAlpha = 0.5; ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(1.5 * p, -0.5 * p, p * 1.4, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}
export function drawBird(ctx: Ctx, c: Combat["critters"][number], x: number) {
  drawBirdArt(ctx, x, c.y, c.face, c.t, c.bird ? BIRDS[c.bird] : null, c.color)
}

// an undead: the alien it was, grey, stiff and turned as it fell, with red eyes; once resurrected, a grey bird
export function drawUndead(ctx: Ctx, g: Combat["targets"][number], x: number, beatPhase: number, beat: number) {
  const u = g.data as UndeadState
  if (u.bird) {
    ctx.save(); if (g.deadT > 0) ctx.globalAlpha = Math.max(0, g.deadT / 0.3)
    drawBirdArt(ctx, x, g.y - g.h / 2, g.face, g.animT, BIRDS[u.bird], "#8d9096", true, u.eye, g.flash)
    ctx.restore()
    return
  }
  const c = Math.abs(Math.cos(u.angle)), sn = Math.abs(Math.sin(u.angle))
  const hb = g.h * c + g.w * sn
  // the alien drawn grey on a small canvas of its own (a filter on the whole scene costs too much per pixel drawn)
  const art = greyArt(Math.ceil(Math.max(g.w, g.h) * 2.4), a => {
    const proxy = { ...g, kind: "alien" as const, y: g.h / 2, deadT: 0, flash: 0, data: u.look }
    if ((u.look as { kind?: string } | undefined)?.kind === "temple") drawTempleAlien(a, proxy, 0, beatPhase, 0, beat, null)
    else drawAlien(a, proxy, 0)
  }, g.flash > 0 ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.22)")
  ctx.save()
  if (g.deadT > 0) ctx.globalAlpha = Math.max(0, g.deadT / 0.3)
  ctx.translate(x, g.y - hb / 2); ctx.rotate(u.angle)
  ctx.drawImage(art, -art.width / 2, -art.height / 2)
  // red eyes, glowing
  ctx.fillStyle = u.eye; ctx.shadowColor = u.eye; ctx.shadowBlur = 8
  const ex = Math.max(4, g.w * 0.15), ey = -g.h * 0.08, r = Math.max(2.5, g.w * 0.055)
  ctx.beginPath(); ctx.arc(-ex, ey, r, 0, Math.PI * 2); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// draws `paint` (centred on 0,0) on a scratch canvas, greys it (saturation blend, then its own shape as a mask) and
// tints it; the result is reused until the next call
export let greyA: HTMLCanvasElement | null = null, greyB: HTMLCanvasElement | null = null
export function greyArt(size: number, paint: (ctx: Ctx) => void, tint: string) {
  const make = (c: HTMLCanvasElement | null) => {
    const el = c ?? document.createElement("canvas")
    if (el.width !== size || el.height !== size) { el.width = size; el.height = size }
    const x = el.getContext("2d")!
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.clearRect(0, 0, size, size)
    return [el, x] as const
  }
  const [a, ax] = make(greyA), [b, bx] = make(greyB)
  greyA = a; greyB = b
  ax.translate(size / 2, size / 2); paint(ax); ax.setTransform(1, 0, 0, 1, 0, 0)
  bx.drawImage(a, 0, 0)
  bx.globalCompositeOperation = "saturation"; bx.fillStyle = "#808080"; bx.fillRect(0, 0, size, size)
  bx.globalCompositeOperation = "source-atop"; bx.fillStyle = tint; bx.fillRect(0, 0, size, size)
  bx.globalCompositeOperation = "destination-in"; bx.drawImage(a, 0, 0)
  return b
}

// the undead she can ride: a thin floor on top of each one that is not falling (the chicken's engine reads them
// as moving boxes and carries her along)
export const riderEls = new Map<number, HTMLDivElement>()
export function syncRiders(host: HTMLElement, undead: Combat["targets"]) {
  const seen = new Set<number>()
  for (const g of undead) {
    const u = g.data as UndeadState
    if (u.phase === "fall" || g.deadT > 0) continue
    const size = u.bird ? { w: g.w, h: g.h * 0.7 } : undeadSize(g, u)
    const box = `${(g.x - size.w / 2).toFixed(1)},${(g.y - size.h).toFixed(1)},${size.w.toFixed(1)},8`
    let el = riderEls.get(g.id)
    if (!el || el.parentElement !== host) {
      el = document.createElement("div")
      el.dataset.chickenId = `undead-${g.id}`
      el.className = "absolute"
      host.appendChild(el); riderEls.set(g.id, el)
    }
    if (el.dataset.chickenWorldBox !== box) el.dataset.chickenWorldBox = box
    seen.add(g.id)
  }
  riderEls.forEach((el, id) => { if (!seen.has(id)) { el.remove(); riderEls.delete(id) } })
}

// the person a zombie becomes (the zombie art with its colour back), running away happy
export const PERSON_RUN = { w: 182, h: 208, n: 10, ax: 91 }
export let personImg: HTMLImageElement | null = null
export function drawPerson(ctx: Ctx, c: Combat["critters"][number], x: number) {
  if (!personImg) { personImg = new Image(); personImg.src = "/pigchicken/person/run.webp" }
  if (!personImg.complete || !personImg.naturalWidth) return
  const f = Math.floor(c.t / 0.06) % PERSON_RUN.n, k = ZOMBIE_HEIGHT / ZOMBIE_SHEETS.walk.h
  ctx.save(); ctx.translate(x, c.y); ctx.scale(c.face < 0 ? -k : k, k)
  ctx.drawImage(personImg, f * PERSON_RUN.w, 0, PERSON_RUN.w, PERSON_RUN.h, -PERSON_RUN.ax, -PERSON_RUN.h, PERSON_RUN.w, PERSON_RUN.h)
  ctx.restore()
}

// the harmony bar (instruments fill it; full converts)
export function harmonyBar(ctx: Ctx, g: Combat["targets"][number], x: number, y: number, w: number) {
  const v = g.harmony ?? 0
  if (v <= 0) return
  const grad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  grad.addColorStop(0, "#7b8cff"); grad.addColorStop(0.5, "#c77dff"); grad.addColorStop(1, "#ff6b9a")
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - w / 2, y, w, 5)
  ctx.fillStyle = grad; ctx.fillRect(x - w / 2, y, w * Math.min(1, v / g.maxHp), 5)
}

// the horde buttons' labels (set every frame from the horde settings)
export const buttonLabels: Record<string, string> = {}
export function drawButton(ctx: Ctx, g: Combat["targets"][number], x: number) {
  const ground = g.y + 46, cy = g.y - g.h / 2, on = g.flash > 0
  ctx.fillStyle = "#3a3f4a"; ctx.fillRect(x - 4, g.y, 8, ground - g.y)
  ctx.fillStyle = "#23262d"; ctx.beginPath(); ctx.ellipse(x, cy + 6, 24, 12, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = on ? "#ffd166" : g.label === "aliens" || g.label === "zombies" ? "#d6453d" : "#4cc9f0"
  ctx.beginPath(); ctx.ellipse(x, cy + (on ? 4 : 0), 19, 10, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(x - 19, cy + (on ? 4 : 0), 38, on ? 2 : 6)
  ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(0,0,0,0.55)"; const label = buttonLabels[g.label ?? ""] ?? ""; const w = ctx.measureText(label).width + 10
  ctx.fillRect(x - w / 2, cy - 34, w, 15)
  ctx.fillStyle = "#ffffff"; ctx.fillText(label, x, cy - 23)
}

export function drawAlien(ctx: Ctx, g: Combat["targets"][number], x: number) {
  const d = g.data as EnemyData & { kind: "alien" }
  // its eye looks at the character nearest to it
  const look = lookDir({ x: g.x, y: g.y - g.h / 2 }, nearestPoint({ x: g.x, y: g.y - g.h / 2 }, lookTargets))
  const frame = lookRows(ALIEN_FRAMES[Math.floor(g.animT / 0.4) % 2], look), p = ALIEN_PIXEL
  const left = x - g.w / 2, top = g.y - g.h
  ctx.save()
  if (g.deadT > 0) ctx.globalAlpha = Math.max(0, g.deadT / 0.35) * 0.6
  frame.forEach((row, r) => { for (let c = 0; c < row.length; c++) {
    const ch = row[c]
    if (ch === ".") continue
    ctx.fillStyle = g.flash > 0 ? (g.tint ?? "#ffffff") : ch === "w" ? (Math.floor(g.animT * 2) % 9 === 0 ? d.color : "#f4f1e8") : ch === "o" ? "#101018" : d.color
    ctx.fillRect(left + c * p, top + r * p, p, p)
  } })
  ctx.restore()
  if (g.deadT <= 0) harmonyBar(ctx, g, x, top - 9, g.w)
}

// the zombie sprite sheets (Craftpix free zombie pack), one strip per animation
export const ZOMBIE_SHEETS = { walk: { w: 123, h: 206, n: 6, ax: 61.6 }, attack: { w: 130, h: 192, n: 6, ax: 36.2 }, hurt: { w: 152, h: 201, n: 5, ax: 55.6 }, dead: { w: 238, h: 193, n: 8, ax: 55 }, idle: { w: 123, h: 197, n: 4, ax: 77.8 } }
export type ZombieAnim = keyof typeof ZOMBIE_SHEETS
export const zombieImages: Partial<Record<ZombieAnim, HTMLImageElement>> = {}
export function zombieImage(a: ZombieAnim) {
  let img = zombieImages[a]
  if (!img) { img = new Image(); img.src = `/pigchicken/zombie1/${a}.webp`; zombieImages[a] = img }
  return img.complete && img.naturalWidth ? img : null
}
export const ZOMBIE_HEIGHT = 175 // px on screen for the walk frame
export function drawZombie(ctx: Ctx, g: Combat["targets"][number], x: number) {
  const a: ZombieAnim = g.state === "attack" ? "attack" : g.state === "hurt" ? "hurt" : g.state === "dead" ? "dead" : "walk"
  const sheet = ZOMBIE_SHEETS[a], img = zombieImage(a)
  if (!img) return
  const dur = a === "attack" ? ZOMBIE_TIMES.attack : a === "hurt" ? ZOMBIE_TIMES.hurt : a === "dead" ? ZOMBIE_TIMES.dead : 0.8
  const f = a === "walk" ? Math.floor((g.animT / dur) * sheet.n) % sheet.n : Math.min(sheet.n - 1, Math.floor((g.animT / dur) * sheet.n))
  const k = ZOMBIE_HEIGHT / ZOMBIE_SHEETS.walk.h
  const hue = (g.data as { hue?: number } | undefined)?.hue ?? 0
  ctx.save()
  ctx.translate(x, g.y)
  ctx.scale(g.face < 0 ? -k : k, k)
  if (g.state === "dead") ctx.globalAlpha = Math.min(1, g.deadT / ZOMBIE_TIMES.fade)
  const filters = hue ? [`hue-rotate(${hue}deg)`, "saturate(1.25)"] : []
  if (g.flash > 0) filters.push(g.tint ? `drop-shadow(0 0 10px ${g.tint})` : "brightness(2.2)", ...(g.tint ? ["brightness(1.5)"] : []))
  else if ((g.stun ?? 0) > 0 && g.tint) filters.push(`drop-shadow(0 0 6px ${g.tint})`)
  if (filters.length) ctx.filter = filters.join(" ")
  ctx.drawImage(img, f * sheet.w, 0, sheet.w, sheet.h, -sheet.ax, -sheet.h, sheet.w, sheet.h)
  ctx.restore()
  if (g.state !== "dead" && g.hp < g.maxHp) {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 22, g.y - g.h - 16, 44, 5)
    ctx.fillStyle = "#7bd88f"; ctx.fillRect(x - 22, g.y - g.h - 16, 44 * Math.max(0, g.hp / g.maxHp), 5)
  }
  if (g.state !== "dead") harmonyBar(ctx, g, x, g.y - g.h - 9, 44)
}
// a steady pseudo-random number per dummy, so its cracks stay in the same place
export const seeded = (id: number, i: number) => { const v = Math.sin(id * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v) }

// a crack: a zigzag from a point, with a little branch
export function crack(ctx: Ctx, x: number, y: number, angle: number, len: number, id: number, k: number) {
  ctx.beginPath(); ctx.moveTo(x, y)
  let a = angle, cx = x, cy = y
  for (let i = 0; i < 4; i++) {
    a += (seeded(id, k + i) - 0.5) * 1.1
    cx += Math.cos(a) * len / 4; cy += Math.sin(a) * len / 4; ctx.lineTo(cx, cy)
    if (i === 1) { const bx = cx, by = cy; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 0.9) * len / 5, by + Math.sin(a + 0.9) * len / 5); ctx.moveTo(cx, cy) }
  }
  ctx.stroke()
}

// the board's outline: rounded while whole; chipped corners as it breaks
export function boardPath(ctx: Ctx, g: Combat["targets"][number], stage: number) {
  const L = -g.w / 2, R = g.w / 2, T = -g.h, B = -g.h * 0.32
  ctx.beginPath()
  if (stage >= 3) { ctx.roundRect(L, T, g.w, B - T, 14); return }
  const r = (i: number) => seeded(g.id, i)
  ctx.moveTo(L + 10, T)
  ctx.lineTo(R - 16 - r(1) * 6, T); ctx.lineTo(R - 9, T + 5 + r(2) * 4); ctx.lineTo(R - 4, T + 9); ctx.lineTo(R, T + 18 + r(3) * 6)
  ctx.lineTo(R, B - 10); ctx.quadraticCurveTo(R, B, R - 10, B)
  if (stage <= 1) { ctx.lineTo(L + 18 + r(4) * 5, B); ctx.lineTo(L + 11, B - 6 - r(5) * 4); ctx.lineTo(L + 5, B - 9); ctx.lineTo(L, B - 18 - r(6) * 6) }
  else { ctx.lineTo(L + 10, B); ctx.quadraticCurveTo(L, B, L, B - 10) }
  ctx.lineTo(L, T + 10); ctx.quadraticCurveTo(L, T, L + 10, T)
  ctx.closePath()
}

// the whole board as it is at this stage (cracks, hole, peeled bullseye), in the dummy's own coordinates
export function drawBoard(ctx: Ctx, g: Combat["targets"][number], stage: number, flash: boolean) {
  const cy = -g.h * 0.68, wrecked = stage === 0
  const wood = flash ? (g.tint ?? "#ffffff") : wrecked ? "#a69a80" : "#d9cfb8"
  boardPath(ctx, g, stage)
  ctx.fillStyle = wood; ctx.fill()
  ctx.save(); boardPath(ctx, g, stage); ctx.clip()
  // the grain: darker as it gets worn
  ctx.strokeStyle = `rgba(90,70,45,${0.12 + (4 - stage) * 0.05})`; ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) { const y = -g.h + 12 + i * 18; ctx.beginPath(); ctx.moveTo(-g.w / 2, y); ctx.bezierCurveTo(-8, y + 3, 8, y - 3, g.w / 2, y + 1); ctx.stroke() }
  const rings = flash ? ["#ffffff", "#ffffff", "#ffffff"] : wrecked ? ["#8a4a40", "#cfc6b0", "#8a4a40"] : ["#d6453d", "#f4f1e8", "#d6453d"]
  ;[17, 11, 5].forEach((r, i) => { ctx.fillStyle = rings[i]; ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill() })
  // scuffs and holes from the hits
  ctx.fillStyle = "rgba(60,40,25,0.55)"
  const marks = [0, 2, 4, 6, 9][4 - stage]
  for (let i = 0; i < marks; i++) { ctx.beginPath(); ctx.arc((seeded(g.id, 20 + i) - 0.5) * g.w * 0.8, -g.h + 10 + seeded(g.id, 40 + i) * g.h * 0.55, 1.6 + seeded(g.id, 60 + i) * 1.4, 0, Math.PI * 2); ctx.fill() }
  // the bullseye peels off
  if (stage <= 1) { ctx.fillStyle = wood; ctx.beginPath(); ctx.moveTo(4, cy - 18); ctx.lineTo(19, cy - 6); ctx.lineTo(13, cy + 4); ctx.lineTo(6, cy - 3); ctx.closePath(); ctx.fill() }
  // cracks
  ctx.strokeStyle = "rgba(55,38,22,0.85)"; ctx.lineWidth = 1.3
  if (stage <= 3) crack(ctx, g.w / 2, -g.h + 14, Math.PI * 0.85, 14, g.id, 80)
  if (stage <= 2) { crack(ctx, -g.w / 2, -g.h + 40, -0.1, 24, g.id, 90); crack(ctx, 6, -g.h, Math.PI * 0.55, 26, g.id, 100) }
  if (stage <= 1) {
    crack(ctx, g.w / 2, cy + 10, Math.PI * 1.05, 30, g.id, 110)
    // a hole straight through
    ctx.fillStyle = "#2b2016"; ctx.beginPath(); ctx.ellipse(-8, -g.h + 22, 6, 4.5, 0.4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#e8dcc0"; ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(-8 + Math.cos(a) * 5, -g.h + 22 + Math.sin(a) * 4); ctx.lineTo(-8 + Math.cos(a) * 9, -g.h + 22 + Math.sin(a) * 7); ctx.stroke() }
  }
  ctx.restore()
  // the edge, darker when worn
  boardPath(ctx, g, stage); ctx.strokeStyle = `rgba(70,50,30,${0.25 + (4 - stage) * 0.1})`; ctx.lineWidth = 1.2; ctx.stroke()
}

// a training dummy: whole, scratched, cracked, falling apart or (no life) a wreck
export function drawDummy(ctx: Ctx, g: Combat["targets"][number], x: number, time: number) {
  const d = g.dummy, stage = d?.stage ?? 4, flash = g.flash > 0
  const jolt = d && d.crackT > 0 ? Math.sin(d.crackT * 90) * 4 * (d.crackT / 0.35) : 0
  const side = seeded(g.id, 7) < 0.5 ? -1 : 1
  ctx.save()
  ctx.translate(x + jolt, g.y)
  ctx.rotate(g.wobble)
  if (stage > 0) {
    // the post leans a little more each stage; the board tilts on it
    const lean = [0, 0.1, 0.05, 0.015, 0][stage] * side
    ctx.rotate(lean)
    ctx.fillStyle = "#5b4630"; ctx.fillRect(-3, -g.h * 0.35, 6, g.h * 0.35)
    if (stage <= 2) { ctx.translate(0, -g.h * 0.35); ctx.rotate([0, 0.12, 0.06][stage] * -side); ctx.translate(0, g.h * 0.35) }
    drawBoard(ctx, g, stage, flash)
    // a plank nailed across while it is falling apart
    if (stage === 1) { ctx.fillStyle = "#8a6a44"; ctx.save(); ctx.translate(0, -g.h * 0.55); ctx.rotate(-0.35 * side); ctx.fillRect(-g.w / 2 - 2, -4, g.w + 4, 8); ctx.fillStyle = "#3a3a3a"; ctx.fillRect(-g.w / 2 + 2, -1, 2, 2); ctx.fillRect(g.w / 2 - 4, -1, 2, 2); ctx.restore() }
  } else {
    // a wreck: the post bent over, half of the board hanging from a nail, the other half on the floor
    const T = -g.h, B = -g.h * 0.32, split = (i: number) => -g.h * 0.62 + (seeded(g.id, 140 + i) - 0.5) * 10
    const upper = () => { ctx.beginPath(); ctx.moveTo(-g.w / 2, T); ctx.lineTo(g.w / 2, T); for (let i = 0; i <= 5; i++) ctx.lineTo(g.w / 2 - i * g.w / 5, split(i) - i * 3); ctx.closePath() }
    const lower = () => { ctx.beginPath(); for (let i = 0; i <= 5; i++) ctx.lineTo(g.w / 2 - i * g.w / 5, split(i) - i * 3); ctx.lineTo(-g.w / 2, B); ctx.lineTo(g.w / 2, B); ctx.closePath() }
    // the half on the floor
    ctx.save(); ctx.translate(side * 36, 0); ctx.rotate(side * 0.16); ctx.translate(0, g.h * 0.32 - 1)
    lower(); ctx.clip(); drawBoard(ctx, g, 0, flash); ctx.restore()
    // the post, snapped and bent
    ctx.save(); ctx.rotate(-0.28 * side)
    ctx.fillStyle = "#4a3a28"; ctx.fillRect(-3, -g.h * 0.42, 6, g.h * 0.42)
    ctx.beginPath(); ctx.moveTo(-3, -g.h * 0.42); ctx.lineTo(0, -g.h * 0.47); ctx.lineTo(3, -g.h * 0.42); ctx.fill()
    // the other half, hanging crooked from the nail at the top of the post
    ctx.translate(0, -g.h * 0.4); ctx.rotate(0.55 * side + Math.sin(time * 1.3 + g.id) * 0.04 + g.wobble)
    ctx.save(); ctx.translate(0, g.h * 0.72); upper(); ctx.clip(); drawBoard(ctx, g, 0, flash); ctx.restore()
    ctx.fillStyle = "#3a3a3a"; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    // flies buzzing around the wreck
    ctx.fillStyle = "#1d1d1d"
    for (let i = 0; i < 2; i++) { const a = time * (4 + i * 1.7) + i * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 18, -g.h * 0.55 + Math.sin(a * 1.6) * 9, 1.6, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.restore()
  // life bar while hurt (not on the wreck)
  if (stage > 0 && g.hp < g.maxHp) {
    const k = Math.max(0, g.hp / g.maxHp)
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 24, g.y - g.h - 14, 48, 5)
    ctx.fillStyle = k > 0.5 ? "#7bd88f" : k > 0.25 ? "#ffd166" : "#ff6b5b"; ctx.fillRect(x - 24, g.y - g.h - 14, 48 * k, 5)
  }
}

// the wrapped lines of a tip
export function wrapLines(ctx: Ctx, text: string, maxW: number) {
  const lines: string[] = []
  let line = ""
  text.split(/\s+/).forEach(w => { const next = line ? `${line} ${w}` : w; if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = w } else line = next })
  if (line) lines.push(line)
  return lines
}

// the tip of a destroyed dummy: a speech bubble that pops up and fades; while it is down, a little "…" says there is one
export function drawDummyTip(ctx: Ctx, g: Combat["targets"][number], x: number, time: number) {
  const d = g.dummy
  if (!d || !d.params.message) return
  const top = g.y - g.h * (d.stage === 0 ? 0.62 : 1) - 18
  if (d.tipT <= 0) {
    if (d.stage !== 0) return
    const y = top - 6 + Math.sin(time * 3 + g.id) * 2
    ctx.fillStyle = "rgba(255,253,245,0.9)"; ctx.beginPath(); ctx.roundRect(x - 15, y - 12, 30, 18, 9); ctx.fill()
    ctx.beginPath(); ctx.moveTo(x - 4, y + 6); ctx.lineTo(x, y + 11); ctx.lineTo(x + 3, y + 6); ctx.fill()
    ctx.fillStyle = "#5b4630"; ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("…", x, y + 1)
    return
  }
  ctx.save()
  ctx.font = "13px ui-sans-serif, system-ui, sans-serif"
  const maxW = 220, lines = wrapLines(ctx, d.params.message, maxW)
  const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + 22, lh = 17, h = lines.length * lh + 34
  const age = TIP_TIME - d.tipT, pop = Math.min(1, age / 0.18)
  ctx.globalAlpha = Math.min(1, d.tipT * 2)
  ctx.translate(x, top); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop)
  // the bubble stays on screen; its tail keeps pointing at the dummy
  const m = ctx.getTransform(), left = -m.e / m.a + 8, right = (ctx.canvas.width - m.e) / m.a - 8
  const bx = Math.max(Math.min(-w / 2, right - w), Math.min(left, -16)), by = -h - 10
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2
  ctx.fillStyle = "#fffdf5"; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 12); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-7, by + h - 1); ctx.lineTo(0, 0); ctx.lineTo(8, by + h - 1); ctx.fill()
  ctx.shadowColor = "transparent"
  ctx.fillStyle = "#b5651d"; ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText("DICA", bx + 11, by + 17)
  ctx.fillStyle = "#2b2016"; ctx.font = "13px ui-sans-serif, system-ui, sans-serif"
  lines.forEach((l, i) => ctx.fillText(l, bx + 11, by + 34 + i * lh))
  ctx.restore()
}
