// The "Escala da mira" layer (debug, the header's layers menu): around each player holding an item whose note
// follows the aim, the aim's fan cut in lanes where the note changes, each one labelled small with its note and its
// degree in the zone's scale (in brackets when the note is outside the scale, a chord note on a pentatonic).
// Instruments: their pitch set, octave and span (music.noteFor). Weapons: only when their rebate chain has
// "Pelo ângulo do golpe" (the scale, that step's octave). The note only depends on how high the aim points, so the
// lanes are the same on both sides; the labels go on the side she aims at.
import type { Combat } from "@/lib/pigchicken/combat"
import { DEGREE_COLORS, NOTE_NAMES, SCALES, type Conductor, type PitchSet } from "@/lib/pigchicken/music"
import { HangScale, HarmonicFieldScale, INSTRUMENT_SCALES, SpiralScale, StringsScale, fieldHouses, fieldTurn, houseAt, sectorEdges, spiralAngle, spiralGap, spiralRadius, type InstrumentScale, type HangLayout, type HangShape, type HarpString, type ScaleShape, type StringTouch, type ScaleRegion, type SpiralLayout } from "@/lib/pigchicken/instrument-scales"
import { hangOf } from "@/lib/pigchicken/items"
import { DrumsScale } from "@/lib/pigchicken/instrument-scales"
import { drumKit } from "@/lib/pigchicken/drum-kit"
import { drumBindName } from "@/lib/pigchicken/drum-input"
import { drawDrumChart, drumFrame, drumHints } from "./drum-chart"


const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`

// what the held item's aim plays: its pitch set, octave and span (null: its note does not follow the aim)
function aimSource(combat: Combat): { set: PitchSet; octave: number; span: number } | null {
  if (!combat.held) return null
  const d = combat.def()
  if (d.instrument) return { set: d.pitchSet, octave: d.octave, span: d.span }
  const by = d.rebateChain?.find(t => t.kind === "byAngle")
  return by ? { set: "scale", octave: by.n, span: 2 } : null
}

// the fan's radius at size 1x (the layers menu's "Escalas (Tamanho)" goes from 0.1x to 3x; 0.3x by default)
export const SCALE_FAN_R = 390
// sitting at a fixed instrument (the Harpa), its strings show at least this big (in SCALE_FAN_R), whatever the
// layer's "Escalas (Tamanho)" says: they are what she plays on
export const SEATED_FAN_MIN = 0.9
export const seatedFanSize = (size: number) => Math.max(SEATED_FAN_MIN, size)

// the current player's fan (combat.use(id) first), centred at (cx, cy) in screen units; alpha: the layer's
// strength (with the scale's standby already in it); alphaOn: the same for the cell the aim is on (the standby's
// "Visibilidade da célula mirada"); size: its radius in SCALE_FAN_R; fade: "Escalas (Degradê)" from 0 to 1. Each lane fades out toward the
// circle (0 at its edge) as (1 - t)^(fade * 2) up to 1/2 and then up to (1 - t)^4: 0 is solid, 1/2 linear, 1 a long
// soft tail. lines: "Escalas (Linhas)", how strongly the lanes' dividing lines show (0 to 1). The labels sit
// in the middle of each lane on the side she aims at.
export function drawScaleFan(ctx: CanvasRenderingContext2D, combat: Combat, cx: number, cy: number, aim: number, scale = 1, alpha = 1, size = 0.3, fade = 0.5, lines = 1, alphaOn = alpha) {
  const src = aimSource(combat)
  if (!src) return
  const chart = combat.def().instrument ? combat.scale : null
  if (chart instanceof DrumsScale) {
    // (its size is the kit's own, not the layer's "Escalas (Tamanho)")
    const kit = drumKit(), at = drumFrame(kit, cx, cy, SCALE_FAN_R * scale)
    drawDrumChart(ctx, kit, at.x, at.y, at.r, { alpha, lines, pulse: p => combat.drumPulse(p), sticks: combat.drumSticks, open: combat.hatOpen, knocks: combat.drumKnocks, hint: drumHints(kit, drumBindName) })
    return
  }
  const d = combat.def()
  drawScaleShape(ctx, chart, combat.music, {
    ...src, descending: d.spiralDescending, hang: hangOf(d), aim, reach: combat.aimReach, fade, unit: scale,
    hands: chart instanceof StringsScale ? combat.stringHands.flatMap(h => h ? [chart.touch(h.angle, h.r)] : []) : undefined,
    stringAge: i => combat.stringAge(i),
  }, cx, cy, SCALE_FAN_R * size * scale, alpha, lines, alphaOn)
}

/**
 * What a scale's drawing asks besides the scale itself: the register it covers (its instrument's numbers) and where
 * the aim is. aim null: nobody aiming (the Escalas panel's preview with the pointer away), so no cell is lit.
 * hands / stringAge: the Cordas soltas' hands and how long ago (s) each string was plucked (without them, one hand
 * where the aim is and still strings). fade: "Escalas (Degradê)"; unit: the screen's zoom, for the leque's middle.
 * still: the Campo harmônico's wheel already at its key, without easing round (the preview).
 */
export type ScaleDraw = {
  set: PitchSet; octave: number; span: number; descending?: boolean; hang?: HangShape
  aim: number | null; reach: number
  hands?: StringTouch[]; stringAge?: (i: number) => number
  fade?: number; unit?: number; still?: boolean
}

/**
 * A scale's drawing centred at (cx, cy) with radius rOut (screen units): the same for the Pátio's layer and for the
 * Escalas panel's preview. chart null (a weapon whose note follows the aim) or the Escala primária: the leque.
 * The Bateria is not here: its chart is the kit's (draw/drum-chart.ts).
 */
export function drawScaleShape(ctx: CanvasRenderingContext2D, chart: InstrumentScale | null, music: Conductor, q: ScaleDraw, cx: number, cy: number, rOut: number, alpha = 1, lines = 1, alphaOn = alpha) {
  const aim = q.aim, fade = q.fade ?? 0.5
  // an instrument on a chart scale (Ciclo de quintas, Tensão e resolução): the round chart instead of the leque;
  // on the Espiral, the spiral of the zone's scale
  if (chart instanceof SpiralScale) {
    const lay = chart.layout(music, { octave: q.octave, span: q.span, descending: q.descending })
    drawSpiral(ctx, lay, aim === null ? -1 : chart.pieceAt(lay, aim, q.reach), cx, cy, rOut, alpha, lines, alphaOn)
    return
  }
  if (chart instanceof HangScale) {
    const lay = chart.layout(music, { octave: q.octave, hang: q.hang })
    drawHang(ctx, lay, aim === null ? { index: -1, slap: false } : chart.touch(lay, aim, q.reach), aim ?? 0, q.reach, cx, cy, rOut, alpha, lines, alphaOn)
    return
  }
  if (chart instanceof StringsScale) {
    drawStrings(ctx, chart.layout(music, { octave: q.octave }), q.hands ?? (aim === null ? [] : [chart.touch(aim, q.reach)]), chart.shape, q.stringAge ?? (() => -1), cx, cy, rOut, alpha, lines, alphaOn)
    return
  }
  if (chart instanceof HarmonicFieldScale) {
    drawHarmonicWheel(ctx, music, aim, cx, cy, rOut, alpha, lines, alphaOn, q.still)
    return
  }
  if (chart && chart.regions().length) {
    drawScaleChart(ctx, chart, music, aim === null ? null : chart.regionAt(aim, q.reach), cx, cy, rOut, alpha, lines, alphaOn)
    return
  }
  const zone = music.zone
  const pool = music.aimPool(q.set, q.octave, q.span)
  const n = pool.length
  if (!n) return
  const steps = SCALES[zone.scale].steps
  const upOf = (a: number) => Math.max(-1, Math.min(1, -Math.sin(a)))
  // lane i covers "up" (-1 down … 1 up) from edge(i) to edge(i + 1)
  const edge = (i: number) => (n === 1 ? (i <= 0 ? -1 : 1) : Math.max(-1, Math.min(1, ((i - 0.5) / (n - 1)) * 2 - 1)))
  const right = aim === null || Math.cos(aim) >= 0
  // the angle on a side for a height of the aim
  const angle = (up: number, side: boolean) => (side ? -Math.asin(up) : Math.PI + Math.asin(up))
  const now = aim === null ? -1 : Math.round(((upOf(aim) + 1) / 2) * (n - 1))
  const rIn = Math.min(rOut * 0.3, 34 * (q.unit ?? 1))
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
function drawScaleChart(ctx: CanvasRenderingContext2D, chart: InstrumentScale, music: Conductor, now: ScaleRegion | null, cx: number, cy: number, rOut: number, alpha: number, lines: number, alphaOn = alpha) {
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
function drawHarmonicWheel(ctx: CanvasRenderingContext2D, music: Conductor, aim: number | null, cx: number, cy: number, rOut: number, alpha: number, lines: number, alphaOn = alpha, still = false) {
  const target = fieldTurn(music.zone.root)
  let turnNow = 0
  if (!still) {
    if (wheelTurn === null) wheelTurn = target
    // the shortest way round, a bit each frame
    let diff = target - wheelTurn
    diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
    wheelTurn = Math.abs(diff) < 0.002 ? target : wheelTurn + diff * 0.12
    turnNow = wheelTurn - target
  }
  const houses = fieldHouses(music.zone), now = aim === null ? -1 : houseAt(aim, target), bar = music.degree % houses.length
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

// The Cordas soltas: a harp's strings around her, each one a line from where the strings start to where they end.
// The Dó strings are red and the Fá ones blue, like on a real harp; the others are clear. The string she aims at is
// lit, with its note at its tip; a small ring shows where on it the aim is (filled on the harmonic's place, the dot
// in the middle of every string); a string just plucked shakes. lines: the two circles where the strings start and
// end (under the first the touch is the string's flat, past the second its sharp).
const STRING_C = "#ff4d4d", STRING_F = "#3f6dff", STRING_PLAIN = "#ffffff"
function drawStrings(ctx: CanvasRenderingContext2D, strs: HarpString[], hands: StringTouch[], shape: ScaleShape, age: (i: number) => number, cx: number, cy: number, rOut: number, alpha: number, lines: number, alphaOn = alpha) {
  const r0 = shape.stringStart * rOut, r1 = shape.stringEnd * rOut, mid = (r0 + r1) / 2
  ctx.save()
  ctx.lineCap = "round"
  if (lines > 0) {
    ctx.lineWidth = 1; ctx.strokeStyle = hexA("#ffffff", alpha * 0.16 * lines)
    for (const r of [r0, r1]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke() }
  }
  const n = strs.length
  strs.forEach((s, i) => {
    const on = hands.some(h => h.index === i), dx = Math.cos(s.angle), dy = Math.sin(s.angle)
    const color = s.letter === 0 ? STRING_C : s.letter === 3 ? STRING_F : STRING_PLAIN, plain = color === STRING_PLAIN
    // a plucked string shakes sideways for a moment (lower strings wider and longer)
    const t = age(i), low = 1 - i / Math.max(1, n - 1)
    const shake = t >= 0 && t < 1.2 ? Math.sin(t * (50 + 40 * (1 - low))) * Math.exp(-t * (7 - 3 * low)) * rOut * (0.012 + 0.014 * low) : 0
    ctx.beginPath()
    ctx.moveTo(cx + dx * r0, cy + dy * r0)
    if (shake) ctx.quadraticCurveTo(cx + dx * mid - dy * shake * 2, cy + dy * mid + dx * shake * 2, cx + dx * r1, cy + dy * r1)
    else ctx.lineTo(cx + dx * r1, cy + dy * r1)
    ctx.lineWidth = (on ? 1.6 : 1) * (1 + 1.4 * low)
    ctx.strokeStyle = hexA(color, on ? alphaOn : alpha * (plain ? 0.3 : 0.8))
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + dx * mid - dy * shake, cy + dy * mid + dx * shake, on ? 2 : 1.2, 0, Math.PI * 2)
    ctx.fillStyle = hexA(color, on ? alphaOn : alpha * (plain ? 0.45 : 0.9))
    ctx.fill()
  })
  // each hand on the strings: a ring where it is (filled on the harmonic's place) and the note it would pluck
  hands.forEach(now => {
    const s = strs[now.index]
    if (!s) return
    const dx = Math.cos(s.angle), dy = Math.sin(s.angle), font = Math.max(9, Math.min(15, rOut * 0.075))
    const rr = Math.min(now.r, 1) * rOut
    ctx.beginPath()
    ctx.arc(cx + dx * rr, cy + dy * rr, Math.max(3, rOut * 0.028), 0, Math.PI * 2)
    if (now.zone === "harmonic") { ctx.fillStyle = hexA("#ffffff", alphaOn * 0.9); ctx.fill() }
    ctx.lineWidth = 1.5; ctx.strokeStyle = hexA("#ffffff", alphaOn * 0.9); ctx.stroke()
    ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.font = `bold ${Math.round(font)}px monospace`
    ctx.fillStyle = hexA("#ffffff", alphaOn)
    const lr = Math.min(rOut, r1) + font * 1.1
    ctx.fillText(s.name + (now.zone === "flat" ? "♭" : now.zone === "sharp" ? "♯" : now.zone === "harmonic" ? "°" : ""), cx + dx * lr, cy + dy * lr)
  })
  ctx.restore()
}
