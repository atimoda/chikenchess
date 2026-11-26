// Draws a song's cover (lib/pigchicken/song-cover.ts) on a canvas: kept in a small cache by the song's content, so
// the jukebox's screen, its panel and the end of a song draw it without working it out every frame.
import { t as tr } from "@/lib/i18n"
import { coverArt, SULCO_IN, SULCO_OUT } from "@/lib/pigchicken/song-cover"
import { CAMPAIGN, type LibrarySong } from "@/lib/pigchicken/song-library"
import type { Catalog } from "@/lib/pigchicken/alien-catalog"

type Ctx = CanvasRenderingContext2D
const cache = new Map<string, HTMLCanvasElement>()
const CACHE_MAX = 48

function paintSong(ctx: Ctx, size: number, song: LibrarySong, catalog?: Catalog) {
  const { style, palette, bg } = song.cover
  const art = coverArt(song, style, palette, catalog)
  const S = size
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)
  if (style === "sulco") {
    // the record: black vinyl with its grooves, a label in the song's colour
    ctx.fillStyle = "#0b0b10"; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * (SULCO_OUT + 0.02), 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = Math.max(1, S / 300)
    for (let r = SULCO_IN + 0.02; r < SULCO_OUT; r += 0.018) { ctx.beginPath(); ctx.arc(S / 2, S / 2, S * r, 0, Math.PI * 2); ctx.stroke() }
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.setLineDash([S / 90, S / 120])
    for (const r of art.rings) { ctx.beginPath(); ctx.arc(S / 2, S / 2, S * r, 0, Math.PI * 2); ctx.stroke() }
    ctx.setLineDash([])
  } else {
    // the rows of 4 bars
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = Math.max(1, S / 300)
    const h = 0.84 / art.rows
    for (let i = 0; i <= art.rows; i++) { ctx.beginPath(); ctx.moveTo(S * 0.08, S * (0.08 + i * h)); ctx.lineTo(S * 0.92, S * (0.08 + i * h)); ctx.stroke() }
    for (let b = 1; b < 4; b++) { ctx.beginPath(); ctx.moveTo(S * (0.08 + b * 0.21), S * 0.08); ctx.lineTo(S * (0.08 + b * 0.21), S * 0.92); ctx.stroke() }
  }
  // each alien's path, then its notes with their glow
  ctx.lineWidth = Math.max(1, S / 260); ctx.lineCap = "round"; ctx.lineJoin = "round"
  for (const p of art.paths) {
    if (p.pts.length < 2) continue
    ctx.strokeStyle = p.color; ctx.globalAlpha = 0.35
    ctx.beginPath(); p.pts.forEach((q, i) => (i ? ctx.lineTo(q.x * S, q.y * S) : ctx.moveTo(q.x * S, q.y * S))); ctx.stroke()
  }
  ctx.globalAlpha = 1
  for (const d of art.dots) {
    const r = d.r * S
    if (d.glow > 0) {
      const g = ctx.createRadialGradient(d.x * S, d.y * S, r * 0.3, d.x * S, d.y * S, r * (1.5 + 2 * d.glow))
      g.addColorStop(0, d.color); g.addColorStop(1, "rgba(0,0,0,0)")
      ctx.globalAlpha = 0.45; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x * S, d.y * S, r * (1.5 + 2 * d.glow), 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(d.x * S, d.y * S, r, 0, Math.PI * 2); ctx.fill()
  }
  if (style === "sulco") {
    ctx.fillStyle = song.music.zone.color; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * (SULCO_IN - 0.03), 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.012, 0, Math.PI * 2); ctx.fill()
  }
  title(ctx, S, song.name, style === "sulco" ? "#f4f1e8" : song.music.zone.color)
}

function title(ctx: Ctx, S: number, text: string, color: string) {
  if (S < 56) return
  const fs = Math.max(8, Math.round(S * 0.075))
  ctx.font = `bold ${fs}px ui-monospace, monospace`; ctx.textAlign = "left"; ctx.textBaseline = "bottom"
  let t = tr(text).toUpperCase()
  while (t.length > 3 && ctx.measureText(t).width > S * 0.86) t = t.slice(0, -2) + "…"
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillText(t, S * 0.06 + 1, S * 0.97 + 1)
  ctx.fillStyle = color; ctx.fillText(t, S * 0.06, S * 0.97)
}

// the old campaign's disc: a golden gong
function paintCampaign(ctx: Ctx, S: number) {
  const g = ctx.createLinearGradient(0, 0, S, S)
  g.addColorStop(0, "#3a1d0a"); g.addColorStop(1, "#140a04")
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
  const r = S * 0.34, cx = S / 2, cy = S * 0.46
  const gg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r)
  gg.addColorStop(0, "#fff0b3"); gg.addColorStop(0.5, CAMPAIGN.color); gg.addColorStop(1, "#9a6a00")
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = "rgba(90,50,0,0.6)"; ctx.lineWidth = Math.max(1, S / 120)
  for (const k of [0.75, 0.45]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, Math.PI * 2); ctx.stroke() }
  ctx.fillStyle = "#9a6a00"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2); ctx.fill()
  title(ctx, S, CAMPAIGN.name, CAMPAIGN.color)
}

// the cover of a song (null: the campaign's disc) as a canvas of `size` px
export function coverCanvas(song: LibrarySong | null, size: number, catalog?: Catalog): HTMLCanvasElement {
  const px = Math.max(16, Math.round(size))
  const key = `${px}|${song ? JSON.stringify([song.name, song.cover, song.music.zone, song.fan, song.aliens]) : "campanha"}`
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement("canvas")
  c.width = c.height = px
  const ctx = c.getContext("2d")!
  if (song) paintSong(ctx, px, song, catalog)
  else paintCampaign(ctx, px)
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, c)
  return c
}
