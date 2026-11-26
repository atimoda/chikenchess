// The Mesas de chickenchess (lib/pigchicken/chess-table.ts) drawn in the world: a wooden table with a chickenchess
// board and its pieces on top and a stool at each side; under the top, its options as tags (the city on the left
// half, the radius of its music on the right half) that change like an airport board; over the table, the photo of
// the city picked; over each stool, the name of who is in its queue (or "Bot"); under the stool a player of this
// screen stands on, what Usar does there.
import { cities, getCityById } from "@/lib/cities-data"
import { CHESS_RANDOM, CHESS_TAG_H, CHESS_PROMPT_LABELS, chessRadiusLabel, chessStool, chessTop, isBot, whoOf, type ChessOption, type ChessSide } from "@/lib/pigchicken/chess-table"
import { chessTableStore, type ChessTableBox } from "@/lib/pigchicken/chess-table-store"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { chessHints } from "../chess-table-play"
import { type Ctx } from "./shared"

const WOOD = "#6b4226", WOOD_DARK = "#43271a", WOOD_LIGHT = "#8d5a36"
const GOLD = "#ffd34a"
// how long a tag's value takes to change, and the photo to come in (ms)
const FLIP_MS = 260, PHOTO_MS = 450

// the photos of the cities, loaded once each
const photos = new Map<string, HTMLImageElement>()
function photoOf(url: string) {
  let im = photos.get(url)
  if (!im) { im = new Image(); im.decoding = "async"; im.src = url; photos.set(url, im) }
  return im.complete && im.naturalWidth > 0 ? im : null
}

// the cities a table goes through after Random: the map's, by year
let order: string[] | null = null
export const chessCityOrder = () => (order ??= [...cities].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name)).map(c => c.id))

export const chessCityLabel = (city: string) => {
  if (city === CHESS_RANDOM) return "Random"
  const c = getCityById(city)
  return c ? `${c.year} ${c.name}` : city
}

export function drawChessTables(ctx: Ctx, camX: number, view: ViewRect, people: { names?: Record<string, string>; colors?: Record<string, string> }) {
  const boxes = chessTableStore.boxes
  if (!boxes.length) return
  const now = performance.now()
  for (const b of boxes) {
    if (!intersectsView({ x: b.x, y: b.y - 260, w: b.w, h: b.h + 300 }, view, 32)) continue
    ctx.save()
    drawStools(ctx, b, camX)
    drawTable(ctx, b, camX)
    drawTags(ctx, b, camX, now)
    drawPhoto(ctx, b, camX, now)
    drawSeats(ctx, b, camX, people)
    ctx.restore()
  }
}

function drawStools(ctx: Ctx, b: ChessTableBox, camX: number) {
  for (const side of [0, 1] as const) {
    const s = chessStool(b, side), l = s.l - camX, w = s.r - s.l, h = s.floor - s.top
    // three legs and a rung
    ctx.strokeStyle = WOOD_DARK; ctx.lineWidth = 5; ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(l + 8, s.top + 8); ctx.lineTo(l + 4, s.floor)
    ctx.moveTo(l + w - 8, s.top + 8); ctx.lineTo(l + w - 4, s.floor)
    ctx.moveTo(l + w / 2, s.top + 8); ctx.lineTo(l + w / 2, s.floor - 2)
    ctx.stroke()
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l + 7, s.top + h * 0.62); ctx.lineTo(l + w - 7, s.top + h * 0.62); ctx.stroke()
    // the seat: a round cushion on a wooden disc
    ctx.fillStyle = WOOD; ctx.beginPath(); ctx.roundRect(l, s.top, w, 9, 3); ctx.fill()
    ctx.fillStyle = "#b8323a"; ctx.beginPath(); ctx.ellipse(l + w / 2, s.top + 1, w / 2 - 3, 5, 0, Math.PI, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(l + 3, s.top + 2, w - 6, 1.5)
  }
}

function drawTable(ctx: Ctx, b: ChessTableBox, camX: number) {
  const t = chessTop(b), l = t.l - camX, w = t.r - t.l
  // the legs and the apron (the tags hang on it)
  ctx.fillStyle = WOOD_DARK
  ctx.fillRect(l + 12, t.bottom, 12, t.floorY - t.bottom)
  ctx.fillRect(l + w - 24, t.bottom, 12, t.floorY - t.bottom)
  ctx.fillRect(l + 18, t.floorY - 26, w - 36, 5)
  ctx.fillStyle = WOOD; ctx.fillRect(l + 6, t.bottom, w - 12, CHESS_TAG_H + 8)
  // the top
  ctx.fillStyle = WOOD_LIGHT; ctx.beginPath(); ctx.roundRect(l - 6, t.top, w + 12, t.bottom - t.top, 3); ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(l - 4, t.top + 2, w + 8, 2)
  // the board on it, seen from its side: its edge checkered, the pieces standing on it
  const bw = 152, bl = l + (w - bw) / 2, bt = t.top - 7
  ctx.fillStyle = "#1c1410"; ctx.fillRect(bl - 3, bt - 1, bw + 6, 8)
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#3b2b22" : "#e9dcc4"; ctx.fillRect(bl + (i * bw) / 8, bt + 1, bw / 8, 5) }
  const pieces: [number, string, boolean][] = [[0.5, "r", true], [1.5, "n", true], [2.6, "k", true], [3.5, "p", true], [4.6, "p", false], [5.5, "q", false], [6.5, "n", false], [7.5, "r", false]]
  for (const [i, kind, white] of pieces) drawPiece(ctx, bl + (i * bw) / 8, bt - 1, kind, white)
}

// a little piece's silhouette standing at (x, y) (its base)
function drawPiece(ctx: Ctx, x: number, y: number, kind: string, white: boolean) {
  ctx.fillStyle = white ? "#f4efe2" : "#1d1a18"
  ctx.strokeStyle = white ? "#7d7261" : "#d6cbb8"; ctx.lineWidth = 0.8
  const h = kind === "k" ? 26 : kind === "q" ? 24 : kind === "p" ? 13 : 18
  ctx.beginPath()
  ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.lineTo(x + 4, y - 3); ctx.lineTo(x + 2.4, y - h + 6); ctx.lineTo(x - 2.4, y - h + 6); ctx.lineTo(x - 4, y - 3); ctx.closePath()
  ctx.fill(); ctx.stroke()
  ctx.beginPath()
  if (kind === "p") ctx.arc(x, y - h + 4, 3.4, 0, Math.PI * 2)
  else if (kind === "r") ctx.rect(x - 4, y - h, 8, 6)
  else if (kind === "n") { ctx.moveTo(x - 3, y - h + 7); ctx.lineTo(x - 2, y - h); ctx.lineTo(x + 5, y - h + 3); ctx.lineTo(x + 3, y - h + 7); ctx.closePath() }
  else if (kind === "q") { ctx.arc(x, y - h + 4, 4, 0, Math.PI * 2); ctx.moveTo(x + 1.6, y - h - 1); ctx.arc(x, y - h - 1, 1.6, 0, Math.PI * 2) }
  else { ctx.arc(x, y - h + 5, 4, 0, Math.PI * 2); ctx.rect(x - 0.8, y - h - 4, 1.6, 6); ctx.rect(x - 2.6, y - h - 2.2, 5.2, 1.6) }
  ctx.fill(); ctx.stroke()
}

// the options as tags hanging under the top, each on its half; a new value comes in from above as the old one leaves
// down (like an airport board)
function drawTags(ctx: Ctx, b: ChessTableBox, camX: number, now: number) {
  const t = chessTop(b), p = chessTableStore.params(b.id), mid = (t.l + t.r) / 2
  const tags: [ChessOption, string, number, number][] = [["city", chessCityLabel(p.city), t.l + 8, mid - 3], ["radius", chessRadiusLabel(p.radius), mid + 3, t.r - 8]]
  ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (const [option, text, l, r] of tags) {
    const x = l - camX, y = t.bottom + 4, w = r - l
    ctx.fillStyle = "rgba(10,12,16,0.78)"; ctx.beginPath(); ctx.roundRect(x, y, w, CHESS_TAG_H, 4); ctx.fill()
    ctx.strokeStyle = "rgba(255,211,74,0.5)"; ctx.lineWidth = 1; ctx.stroke()
    const k = Math.min(1, (now - chessTableStore.changedAt(b.id, option)) / FLIP_MS)
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, CHESS_TAG_H); ctx.clip()
    const fit = fitText(ctx, text, w - 8)
    ctx.fillStyle = option === "radius" && p.radius === 0 ? "#ff8a80" : "#f3ead2"
    ctx.fillText(fit, x + w / 2, y + CHESS_TAG_H / 2 + 1 - (1 - easeOut(k)) * CHESS_TAG_H)
    ctx.restore()
  }
  ctx.textBaseline = "alphabetic"
}
const easeOut = (k: number) => 1 - (1 - k) * (1 - k)
function fitText(ctx: Ctx, text: string, w: number) {
  if (ctx.measureText(text).width <= w) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > w) s = s.slice(0, -1)
  return `${s}…`
}

// the city picked: its photo in a frame over the table (Random: none)
function drawPhoto(ctx: Ctx, b: ChessTableBox, camX: number, now: number) {
  const p = chessTableStore.params(b.id)
  if (p.city === CHESS_RANDOM) return
  const city = getCityById(p.city), im = city ? photoOf(city.image) : null
  const t = chessTop(b), cx = (t.l + t.r) / 2 - camX
  const k = Math.min(1, (now - chessTableStore.changedAt(b.id, "city")) / PHOTO_MS)
  const w = 168, h = 104, x = cx - w / 2, y = t.top - 54 - h - (1 - easeOut(k)) * 14
  ctx.save()
  ctx.globalAlpha = easeOut(k)
  ctx.fillStyle = "#f6f1e4"; ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 10
  ctx.fillRect(x - 6, y - 6, w + 12, h + 24); ctx.shadowBlur = 0
  if (im) {
    // cover the frame
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s
    ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
  } else { ctx.fillStyle = city?.color ?? "#555"; ctx.fillRect(x, y, w, h) }
  if (city) {
    ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#2a2118"
    ctx.fillText(fitText(ctx, `${city.year} ${city.name}`, w), cx, y + h + 13)
  }
  ctx.restore()
}

// over each stool, who is in its queue (or the bot); under the stool a player of this screen stands on, what Usar does
function drawSeats(ctx: Ctx, b: ChessTableBox, camX: number, people: { names?: Record<string, string>; colors?: Record<string, string> }) {
  const st = chessTableStore.state(b.id)
  ctx.textAlign = "center"
  for (const side of [0, 1] as ChessSide[]) {
    const s = chessStool(b, side), x = s.cx - camX, o = st.seats[side]
    if (o) {
      const who = whoOf(o), name = isBot(o) ? "Bot" : people.names?.[who!] ?? who!
      ctx.font = "bold 14px ui-monospace, monospace"
      ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(name, x, s.top - 150)
      ctx.fillStyle = isBot(o) ? "#9fd3ff" : people.colors?.[who!] ?? "#ffffff"; ctx.fillText(name, x, s.top - 150)
    }
    const hint = chessHints.get(`${b.id}:${side}`)
    if (hint) {
      const text = `${hint.key ? `${hint.key} - ` : ""}${CHESS_PROMPT_LABELS[hint.prompt]}`
      ctx.font = "bold 11px ui-monospace, monospace"
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText(text, x, s.floor + 16)
      ctx.fillStyle = GOLD; ctx.fillText(text, x, s.floor + 16)
    }
  }
}
