// The "Escala da mira" layer (debug, the header's layers menu): around each player holding an item whose note
// follows the aim, the aim's fan cut in lanes where the note changes, each one labelled small with its note and its
// degree in the zone's scale (in brackets when the note is outside the scale, a chord note on a pentatonic).
// Instruments: their pitch set, octave and span (music.noteFor). Weapons: only when their rebate chain has
// "Pelo ângulo do golpe" (the scale, that step's octave). The note only depends on how high the aim points, so the
// lanes are the same on both sides; the labels go on the side she aims at.
import type { Combat } from "@/lib/pigchicken/combat"
import { DEGREE_COLORS, NOTE_NAMES, SCALES, type PitchSet } from "@/lib/pigchicken/music"
import { HangScale, HarmonicFieldScale, INSTRUMENT_SCALES, SpiralScale, fieldHouses, fieldTurn, houseAt, sectorEdges, spiralAngle, spiralGap, spiralRadius, type InstrumentScale, type HangLayout, type ScaleRegion, type SpiralLayout } from "@/lib/pigchicken/instrument-scales"
import { hangOf } from "@/lib/pigchicken/items"


const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`

// what the held item's aim plays: its pitch set, octave and span (null: its note does not follow the aim)
function aimSource(combat: Combat): { set: PitchSet; octave: number; span: number } | null {
  if (!combat.inventory[combat.current]) return null
  const d = combat.def()
  if (d.instrument) return { set: d.pitchSet, octave: d.octave, span: d.span }
  const by = d.rebateChain?.find(t => t.kind === "byAngle")
  return by ? { set: "scale", octave: by.n, span: 2 } : null
}

// the fan's radius at size 1x (the layers menu's "Escalas (Tamanho)" goes from 0.1x to 3x; 0.3x by default)
export const SCALE_FAN_R = 390

// the current player's fan (combat.use(id) first), centred at (cx, cy) in screen units; alpha: the layer's
// strength (with the scale's standby already in it); alphaOn: the same for the cell the aim is on (the standby's
// "Visibilidade da célula mirada"); size: its radius in SCALE_FAN_R; fade: "Escalas (Degradê)" from 0 to 1. Each lane fades out toward the
// circle (0 at its edge) as (1 - t)^(fade * 2) up to 1/2 and then up to (1 - t)^4: 0 is solid, 1/2 linear, 1 a long
// soft tail. lines: "Escalas (Linhas)", how strongly the lanes' dividing lines show (0 to 1). The labels sit
// in the middle of each lane on the side she aims at.
export function drawScaleFan(ctx: CanvasRenderingContext2D, combat: Combat, cx: number, cy: number, aim: number, scale = 1, alpha = 1, size = 0.3, fade = 0.5, lines = 1, alphaOn = alpha) {
  const src = aimSource(combat)
  if (!src) return
  // an instrument on a chart scale (Ciclo de quintas, Tensão e resolução): the round chart instead of the leque;
  // on the Espiral, the spiral of the zone's scale
  const chart = combat.def().instrument ? combat.scale : null
  if (chart instanceof SpiralScale) {
    const d = combat.def(), lay = chart.layout(combat.music, { octave: d.octave, span: d.span, descending: d.spiralDescending })
    drawSpiral(ctx, lay, chart.pieceAt(lay, aim, combat.aimReach), cx, cy, SCALE_FAN_R * size * scale, alpha, lines, alphaOn)
    return
  }
  if (chart instanceof HangScale) {
    const d = combat.def(), lay = chart.layout(combat.music, { octave: d.octave, hang: hangOf(d) })
    drawHang(ctx, lay, chart.touch(lay, aim, combat.aimReach), aim, combat.aimReach, cx, cy, SCALE_FAN_R * size * scale, alpha, lines, alphaOn)
    return
  }
  if (chart instanceof HarmonicFieldScale) {
    drawHarmonicWheel(ctx, combat.music, aim, cx, cy, SCALE_FAN_R * size * scale, alpha, lines, alphaOn)
    return
  }
  if (chart && chart.regions().length) {
    drawScaleChart(ctx, chart, combat.music, chart.regionAt(aim, combat.aimReach), cx, cy, SCALE_FAN_R * size * scale, alpha, lines, alphaOn)
    return
  }
  const music = combat.music, zone = music.zone
  const pool = music.aimPool(src.set, src.octave, src.span)
  const n = pool.length
  if (!n) return
  const steps = SCALES[zone.scale].steps
  const upOf = (a: number) => Math.max(-1, Math.min(1, -Math.sin(a)))
  // lane i covers "up" (-1 down … 1 up) from edge(i) to edge(i + 1)
  const edge = (i: number) => (n === 1 ? (i <= 0 ? -1 : 1) : Math.max(-1, Math.min(1, ((i - 0.5) / (n - 1)) * 2 - 1)))
  const right = Math.cos(aim) >= 0
  // the angle on a side for a height of the aim
  const angle = (up: number, side: boolean) => (side ? -Math.asin(up) : Math.PI + Math.asin(up))
  const now = Math.round(((upOf(aim) + 1) / 2) * (n - 1))
  const rOut = SCALE_FAN_R * size * scale, rIn = Math.min(rOut * 0.3, 34 * scale)
  // fading from the centre to nothing at the circle (solid when fade is 0)
  const power = fade <= 0.5 ? fade * 2 : 1 + (fade - 0.5) * 6
  const fill = (color: string, a: number): string | CanvasGradient => {
    if (power <= 0) return hexA(color, a)
    const g = ctx.createRadialGradient(cx, cy, rIn, cx, cy, rOut)
    const stops = power === 1 ? 1 : 12
    for (let k = 0; k <= stops; k++) { const t = k / stops; g.addColorStop(t, hexA(color, a * (1 - t) ** power)) }
    return g
  }
  const font = Math.max(8, Math.min(14, rOut * 0.07))
  ctx.save()
  ctx.lineWidth = 1
  for (let i = 0; i < n; i++) {
    const m = pool[i], pc = (((m - zone.root) % 12) + 12) % 12
    const deg = music.degreeOf(m), inScale = steps.includes(pc)
    const color = DEGREE_COLORS[deg % DEGREE_COLORS.length]
    const lo = edge(i), hi = edge(i + 1)
    for (const side of [true, false]) {
      const a0 = angle(lo, side), a1 = angle(hi, side)
      ctx.beginPath()
      ctx.arc(cx, cy, rOut, Math.min(a0, a1), Math.max(a0, a1))
      ctx.arc(cx, cy, rIn, Math.max(a0, a1), Math.min(a0, a1), true)
      ctx.closePath()
      ctx.fillStyle = fill(color, i === now ? alphaOn * 0.4 : alpha * 0.14)
      ctx.fill()
      if (lines > 0) {
        ctx.strokeStyle = fill(color, alpha * 0.6 * lines)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a0) * rIn, cy + Math.sin(a0) * rIn)
        ctx.lineTo(cx + Math.cos(a0) * rOut, cy + Math.sin(a0) * rOut)
        ctx.stroke()
      }
    }
    // the label in the middle of the lane, on the side she aims at
    const mid = angle((lo + hi) / 2, right), r = (rIn + rOut) / 2
    ctx.globalAlpha = i === now ? alphaOn : alpha * 0.8
    ctx.font = `${i === now ? "bold " : ""}${Math.round(font)}px monospace`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = color
    ctx.fillText(`${noteName(m)} ${inScale ? deg + 1 : `(${deg + 1})`}`, cx + Math.cos(mid) * r, cy + Math.sin(mid) * r)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// "#rrggbb" with an alpha
function hexA(hex: string, a: number) {
  const v = parseInt(hex.slice(1, 7), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Math.max(0, Math.min(1, a))})`
}

// The round chart of a chart scale: 12 sectors (the first centred straight up), the inner ring up to the scale's ring split
// (shape.ringSplit) of the radius and the outer one to the edge, each region with its chord. Tensão e resolução draws its outer
// ring as a circle of balls; the region she aims at (direction and reach) is lit. Each region shows its chord in
// letters (cifra) and, small above it, its degree in the zone's key (Roman numerals).
function drawScaleChart(ctx: CanvasRenderingContext2D, chart: InstrumentScale, music: Combat["music"], now: ScaleRegion | null, cx: number, cy: number, rOut: number, alpha: number, lines: number, alphaOn = alpha) {
  const regions = chart.regions()
  const rHole = rOut * chart.shape.hole, rMid = rOut * chart.shape.ringSplit
  const font = Math.max(8, Math.min(14, rOut * 0.075))
  ctx.save()
  ctx.lineWidth = 1
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  for (const r of regions) {
    const { a0, a1 } = sectorEdges(r.sector), on = r === now
    const inner = r.ring === 0 ? rHole : rMid, outer = r.ring === 0 ? rMid : rOut
    const mid = (a0 + a1) / 2, rc = (inner + outer) / 2
    if (r.kind === "resolution") {
      // a ball in the middle of the sector's outer band
      const br = Math.min((outer - inner) * 0.42, rc * Math.sin((a1 - a0) / 2) * 0.85)
      ctx.beginPath()
      ctx.arc(cx + Math.cos(mid) * rc, cy + Math.sin(mid) * rc, br, 0, Math.PI * 2)
      ctx.fillStyle = hexA(r.color, on ? alphaOn * 0.85 : alpha * 0.4)
      ctx.fill()
      if (lines > 0) { ctx.strokeStyle = hexA("#f3e6c4", alpha * 0.6 * lines); ctx.stroke() }
    } else {
      ctx.beginPath()
      ctx.arc(cx, cy, outer, a0, a1)
      ctx.arc(cx, cy, inner, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = hexA(r.color, on ? alphaOn * 0.6 : alpha * 0.2)
      ctx.fill()
      if (lines > 0) { ctx.strokeStyle = hexA("#ffffff", alpha * 0.35 * lines); ctx.stroke() }
    }
    const fs = Math.round(r.ring === 1 ? font : font * 0.85), px = cx + Math.cos(mid) * rc, py = cy + Math.sin(mid) * rc
    ctx.globalAlpha = on ? alphaOn : alpha * 0.75
    ctx.fillStyle = "#ffffff"
    ctx.font = `${on ? "bold " : ""}${fs}px monospace`
    ctx.fillText(r.label, px, py + fs * 0.35)
    ctx.globalAlpha = on ? alphaOn * 0.9 : alpha * 0.55
    ctx.font = `${Math.round(fs * 0.7)}px monospace`
    ctx.fillText(chart.degreeLabel(r, music), px, py - fs * 0.55)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// The Espiral: a dashed spiral line from the outer edge (straight up) inward, clockwise, cut into one piece per note
// of the zone's scale, each a band coloured by its degree with the note in letters and, small above it, its degree
// number; the piece she aims at is lit.
function drawSpiral(ctx: CanvasRenderingContext2D, lay: SpiralLayout, now: number, cx: number, cy: number, rOut: number, alpha: number, lines: number, alphaOn = alpha) {
  const n = lay.pieces.length
  if (!n) return
  const half = spiralGap(lay.turns) * 0.46 * rOut // half a band: the distance between turns, a hair less
  const at = (u: number, off = 0) => { const a = spiralAngle(u, lay.turns), r = spiralRadius(u, lay.turns) * rOut + off; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r } }
  const font = Math.max(8, Math.min(14, Math.min(half * 0.9, rOut * 0.07)))
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  lay.pieces.forEach((p, i) => {
    const on = i === now, color = DEGREE_COLORS[(p.degree - 1) % DEGREE_COLORS.length]
    // the band: out along the piece's outer edge, back along its inner one
    const steps = Math.max(4, Math.ceil((p.u1 - p.u0) * lay.turns * 48))
    ctx.beginPath()
    for (let k = 0; k <= steps; k++) { const q = at(p.u0 + ((p.u1 - p.u0) * k) / steps, half); if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y) }
    for (let k = steps; k >= 0; k--) { const q = at(p.u0 + ((p.u1 - p.u0) * k) / steps, -half); ctx.lineTo(q.x, q.y) }
    ctx.closePath()
    ctx.fillStyle = hexA(color, on ? alphaOn * 0.6 : alpha * 0.18)
    ctx.fill()
    if (lines > 0) { ctx.strokeStyle = hexA("#ffffff", alpha * 0.25 * lines); ctx.lineWidth = 1; ctx.stroke() }
  })
  // the spiral's own line, dashed, like the reference drawing
  if (lines > 0) {
    ctx.beginPath()
    const steps = Math.ceil(lay.turns * 96)
    for (let k = 0; k <= steps; k++) { const q = at(k / steps); if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y) }
    ctx.setLineDash([4, 4]); ctx.strokeStyle = hexA("#ffffff", alpha * 0.45 * lines); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([])
  }
  lay.pieces.forEach((p, i) => {
    const on = i === now, q = at((p.u0 + p.u1) / 2)
    ctx.globalAlpha = on ? alphaOn : alpha * 0.75
    ctx.fillStyle = "#ffffff"
    ctx.font = `${on ? "bold " : ""}${Math.round(font)}px monospace`
    ctx.fillText(p.letter, q.x, q.y + font * 0.35)
    ctx.globalAlpha = on ? alphaOn * 0.9 : alpha * 0.55
    ctx.font = `${Math.round(font * 0.7)}px monospace`
    ctx.fillText(String(p.degree), q.x, q.y - font * 0.55)
  })
  ctx.globalAlpha = 1
  ctx.restore()
}


// The Campo harmônico: the zone's key as a wheel of 7 houses (I ii iii IV V vi vii°), each with its triad in letters
// and, small above it, its degree. The wheel turns to the key (the I where the tonic is on the circle of fifths),
// easing round when the zone changes. The house she aims at is lit; the bar's chord has a light outline.
const HOUSE_COLORS = { major: "#5e9e3c", minor: "#9cc77f", other: "#b8a77a" }
let wheelTurn: number | null = null
function drawHarmonicWheel(ctx: CanvasRenderingContext2D, music: Combat["music"], aim: number, cx: number, cy: number, rOut: number, alpha: number, lines: number, alphaOn = alpha) {
  const target = fieldTurn(music.zone.root)
  if (wheelTurn === null) wheelTurn = target
  // the shortest way round, a bit each frame
  let diff = target - wheelTurn
  diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  wheelTurn = Math.abs(diff) < 0.002 ? target : wheelTurn + diff * 0.12
  const turnNow = wheelTurn - target
  const houses = fieldHouses(music.zone), now = houseAt(aim, target), bar = music.degree % houses.length
  const rIn = rOut * INSTRUMENT_SCALES.harmonic.shape.hole, rc = (rIn + rOut) / 2
  const font = Math.max(8, Math.min(14, rOut * 0.075))
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  for (const h of houses) {
    const on = h.degree === now, a0 = h.a0 + turnNow, a1 = h.a1 + turnNow, mid = (a0 + a1) / 2
    const color = HOUSE_COLORS[h.quality]
    ctx.beginPath()
    ctx.arc(cx, cy, rOut, a0, a1)
    ctx.arc(cx, cy, rIn, a1, a0, true)
    ctx.closePath()
    ctx.fillStyle = hexA(color, on ? alphaOn * 0.6 : alpha * 0.2)
    ctx.fill()
    if (lines > 0) { ctx.lineWidth = 1; ctx.strokeStyle = hexA("#ffffff", alpha * 0.35 * lines); ctx.stroke() }
    if (h.degree === bar) { ctx.lineWidth = 2; ctx.strokeStyle = hexA("#ffffff", alpha * 0.8); ctx.stroke() }
    const px = cx + Math.cos(mid) * rc, py = cy + Math.sin(mid) * rc
    ctx.globalAlpha = on ? alphaOn : alpha * 0.75
    ctx.fillStyle = "#ffffff"
    ctx.font = `${on ? "bold " : ""}${Math.round(font)}px monospace`
    ctx.fillText(h.label, px, py + font * 0.35)
    ctx.globalAlpha = on ? alphaOn * 0.9 : alpha * 0.55
    ctx.font = `${Math.round(font * 0.7)}px monospace`
    ctx.fillText(h.numeral, px, py - font * 0.55)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// The Hangdrum: the hang seen from above, a steel disc with the big ding in the middle and its rows of round notes,
// each one coloured by its degree with the note in letters and, small above it, its degree number. The note she
// aims at is lit; between the notes (a slap) a small ring marks where the hand lands.
function drawHang(ctx: CanvasRenderingContext2D, lay: HangLayout, now: { index: number; slap: boolean }, aim: number, reach: number, cx: number, cy: number, rOut: number, alpha: number, lines: number, alphaOn = alpha) {
  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.beginPath()
  ctx.arc(cx, cy, rOut * Math.min(1, lay.edge + 0.06), 0, Math.PI * 2)
  ctx.fillStyle = hexA("#6b4a2b", alpha * 0.28)
  ctx.fill()
  if (lines > 0) { ctx.lineWidth = 1; ctx.strokeStyle = hexA("#e8c896", alpha * 0.35 * lines); ctx.stroke() }
  lay.fields.forEach((f, i) => {
    const on = i === now.index && !now.slap, color = DEGREE_COLORS[(f.degree - 1) % DEGREE_COLORS.length]
    const x = cx + f.x * rOut, y = cy + f.y * rOut, r = f.r * rOut
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = hexA(color, on ? alphaOn * 0.65 : alpha * 0.22)
    ctx.fill()
    if (lines > 0) { ctx.lineWidth = 1; ctx.strokeStyle = hexA("#ffffff", (i === now.index && now.slap ? alphaOn * 0.8 : alpha * 0.35) * lines); ctx.stroke() }
    const font = Math.max(8, Math.min(i ? 14 : 18, r * 0.62))
    ctx.globalAlpha = on ? alphaOn : alpha * 0.75
    ctx.fillStyle = "#ffffff"
    ctx.font = `${on ? "bold " : ""}${Math.round(font)}px monospace`
    ctx.fillText(f.letter, x, y + font * 0.35)
    ctx.globalAlpha = on ? alphaOn * 0.9 : alpha * 0.55
    ctx.font = `${Math.round(font * 0.7)}px monospace`
    ctx.fillText(String(f.degree), x, y - font * 0.55)
    ctx.globalAlpha = 1
  })
  if (now.slap) {
    const rr = (reach > lay.edge ? lay.ring : reach) * rOut
    ctx.beginPath()
    ctx.arc(cx + Math.cos(aim) * rr, cy + Math.sin(aim) * rr, Math.max(3, rOut * 0.035), 0, Math.PI * 2)
    ctx.lineWidth = 1.5; ctx.strokeStyle = hexA("#ffffff", alphaOn * 0.9); ctx.stroke()
  }
  ctx.restore()
}
