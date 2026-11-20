// The Estrela (lib/pigchicken/star-grid.ts) on the Escalas layer and in the Escalas panel's preview: a six-pointed
// star of hexagons, one note each. White keys are light, black keys dark, like a piano's, and nothing else colours
// them: the notes of the zone's scale have a thin golden edge, the others are more see-through (Notas fora da
// escala), and none moves. The whole star is soft (Opacidade da estrela). The mirror's axis is a thin line down the
// middle. On top, at full strength: the cell each hand is on (outlined), the cells just played (a flash that fades),
// the cells Correr's run keeps (a small ring) and, small under the middle, the dynamic.
// The star itself is drawn once into its own canvas and reused while its size and the zone's scale stay the same.
import { STAR_SCALE, type StarKey } from "@/lib/pigchicken/instrument-scales"
import { fitStar, type StarGrid } from "@/lib/pigchicken/star-grid"
import { drumScreen } from "./drum-chart"

/** Where the star goes for a player sitting at the Piano de cauda with her shoulder at (x, y): fit to the screen. */
export const starSeatFrame = (x: number, y: number, r: number) => fitStar(x, y, r, drumScreen())

export type StarLook = {
  hands?: number[] // the cell each hand is on (-1: none)
  age?: (i: number) => number // how long ago (s) cell i was played (Infinity: not lately)
  run?: number[] // the cells Correr's run keeps
  dyn?: string | null // the dynamic now (ppp … ff)
  opacity?: number // how much of the star shows (0..1)
  offScale?: number // how much the notes outside the zone's scale show next to the others (0..1)
}

const SQ3 = Math.sqrt(3)
function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath()
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k; const px = x + s * Math.cos(a), py = y + s * Math.sin(a); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py) }
  ctx.closePath()
}

// the still star: one canvas per size and scale (a few kept)
const sheets = new Map<string, HTMLCanvasElement>()
function sheet(keys: StarKey[], grid: StarGrid, r: number, px: number, lines: number, off: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null
  const key = `${grid.arm}|${Math.round(r * px)}|${Math.round(lines * 10)}|${Math.round(off * 100)}|${keys.map(k => (k.inScale ? 1 : 0)).join("")}`
  const hit = sheets.get(key)
  if (hit) return hit
  // (the tips' cells stick out of radius r by a cell)
  const side = Math.max(2, Math.ceil(2 * (r + grid.size * r) * px) + 4)
  const cv = document.createElement("canvas")
  cv.width = side; cv.height = side
  const c = cv.getContext("2d")
  if (!c) return null
  c.translate(side / 2, side / 2); c.scale(px, px)
  const s = grid.size * r, inner = s * 0.93
  const font = s * 0.78
  c.textAlign = "center"; c.textBaseline = "middle"
  c.font = `600 ${font}px ui-sans-serif, system-ui, sans-serif`
  for (const k of keys) {
    const x = k.x * r, y = k.y * r
    c.globalAlpha = k.inScale ? 1 : off
    hexPath(c, x, y, inner)
    c.fillStyle = k.black ? "#24201c" : "#f6efdc"
    c.fill()
    if (k.inScale) { c.strokeStyle = `rgba(232,186,92,${0.55 + 0.4 * lines})`; c.lineWidth = Math.max(0.8, s * 0.12); c.stroke() }
    else if (lines > 0) { c.strokeStyle = `rgba(0,0,0,${0.35 * lines})`; c.lineWidth = Math.max(0.5, s * 0.06); c.stroke() }
    if (font >= 5.5) {
      c.fillStyle = k.black ? "#f3e6cc" : "#2f281f"
      c.fillText(k.name, x, y + font * 0.04)
    }
  }
  c.globalAlpha = 1
  // the mirror's axis: the column through the middle, where nothing is played
  c.strokeStyle = `rgba(232,186,92,${0.35 + 0.35 * lines})`; c.lineWidth = Math.max(1, s * 0.12)
  c.beginPath(); c.moveTo(0, -r / SQ3); c.lineTo(0, r / SQ3); c.stroke()
  if (sheets.size > 6) sheets.delete(sheets.keys().next().value as string)
  sheets.set(key, cv)
  return cv
}

/**
 * The star centred at (cx, cy) with its tips at radius r (screen units). alpha: the layer's strength (the standby in
 * it); alphaOn: the same for the cells the hands are on; lines: "Escalas (Linhas)".
 */
export function drawStar(ctx: CanvasRenderingContext2D, keys: StarKey[], grid: StarGrid, look: StarLook, cx: number, cy: number, r: number, alpha = 1, lines = 1, alphaOn = alpha) {
  if (!(r > 4) || !keys.length) return
  const t = ctx.getTransform(), px = Math.max(1, Math.min(4, Math.hypot(t.a, t.b)))
  const s = grid.size * r, inner = s * 0.93
  ctx.save()
  const soft = Math.max(0, Math.min(1, look.opacity ?? 1))
  const cv = sheet(keys, grid, r, px, lines, Math.max(0, Math.min(1, look.offScale ?? 1)))
  if (cv && alpha * soft > 0.003) { ctx.globalAlpha = Math.max(0, Math.min(1, alpha * soft)); ctx.drawImage(cv, cx - cv.width / px / 2, cy - cv.height / px / 2, cv.width / px, cv.height / px) }
  // just played: a warm flash that fades in half a second
  const age = look.age
  if (age && alpha > 0.003) {
    for (const k of keys) {
      const a = age(k.index)
      if (!(a < 0.5)) continue
      hexPath(ctx, cx + k.x * r, cy + k.y * r, inner)
      ctx.globalAlpha = Math.max(0, Math.min(1, Math.max(alpha, alphaOn))) * (1 - a / 0.5)
      ctx.fillStyle = "#ffcf5a"; ctx.fill()
    }
  }
  // the cells Correr's run keeps: a small ring each
  const run = look.run ?? []
  if (run.length) {
    ctx.globalAlpha = Math.max(alpha, alphaOn)
    ctx.strokeStyle = "#5fd3ff"; ctx.lineWidth = Math.max(1, s * 0.14)
    for (const i of new Set(run)) { const k = keys[i]; if (!k) continue; ctx.beginPath(); ctx.arc(cx + k.x * r, cy + k.y * r, s * 0.45, 0, Math.PI * 2); ctx.stroke() }
  }
  // the hands
  for (const i of look.hands ?? []) {
    const k = keys[i]
    if (!k) continue
    hexPath(ctx, cx + k.x * r, cy + k.y * r, inner)
    ctx.globalAlpha = Math.max(0, Math.min(1, alphaOn))
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fill()
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, s * 0.2); ctx.stroke()
  }
  if (look.dyn && alpha > 0.003) {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.85
    ctx.fillStyle = "#f3e6cc"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.font = `italic 700 ${Math.max(10, Math.min(22, r * 0.06))}px Georgia, "Times New Roman", serif`
    ctx.fillText(look.dyn, cx, cy + r * 0.66)
  }
  ctx.restore()
}

/** The star's layout for an instrument's octave in the zone the conductor plays (the drawing's keys). */
export const starKeys = (music: Parameters<typeof STAR_SCALE.layout>[0], octave: number) => STAR_SCALE.layout(music, { octave })
