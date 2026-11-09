// The "Escala da mira" layer (debug, the header's layers menu): around each player holding an item whose note
// follows the aim, the aim's fan cut in lanes where the note changes, each one labelled small with its note and its
// degree in the zone's scale (in brackets when the note is outside the scale, a chord note on a pentatonic).
// Instruments: their pitch set, octave and span (music.noteFor). Weapons: only when their rebate chain has
// "Pelo ângulo do golpe" (the scale, that step's octave). The note only depends on how high the aim points, so the
// lanes are the same on both sides; the labels go on the side she aims at.
import type { Combat } from "@/lib/pigchicken/combat"
import { DEGREE_COLORS, NOTE_NAMES, SCALES, type PitchSet } from "@/lib/pigchicken/music"

const R_IN = 34, R_OUT = 118

const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`

// what the held item's aim plays: its pitch set, octave and span (null: its note does not follow the aim)
function aimSource(combat: Combat): { set: PitchSet; octave: number; span: number } | null {
  if (!combat.inventory[combat.current]) return null
  const d = combat.def()
  if (d.instrument) return { set: d.pitchSet, octave: d.octave, span: d.span }
  const by = d.rebateChain?.find(t => t.kind === "byAngle")
  return by ? { set: "scale", octave: by.n, span: 2 } : null
}

// the current player's fan (combat.use(id) first), centred at (cx, cy) in screen units
export function drawScaleFan(ctx: CanvasRenderingContext2D, combat: Combat, cx: number, cy: number, aim: number, scale = 1) {
  const src = aimSource(combat)
  if (!src) return
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
  const rIn = R_IN * scale, rOut = R_OUT * scale
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
      ctx.globalAlpha = i === now ? 0.32 : 0.1
      ctx.fillStyle = color
      ctx.fill()
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a0) * rIn, cy + Math.sin(a0) * rIn)
      ctx.lineTo(cx + Math.cos(a0) * rOut, cy + Math.sin(a0) * rOut)
      ctx.stroke()
    }
    // the label in the middle of the lane, on the side she aims at
    const mid = angle((lo + hi) / 2, right), r = rOut + 4 * scale
    const x = cx + Math.cos(mid) * r, y = cy + Math.sin(mid) * r
    ctx.globalAlpha = i === now ? 1 : 0.8
    ctx.font = `${i === now ? "bold " : ""}${Math.round(9 * Math.max(0.8, scale))}px monospace`
    ctx.textAlign = right ? "left" : "right"
    ctx.textBaseline = "middle"
    const label = `${noteName(m)} ${inScale ? deg + 1 : `(${deg + 1})`}`
    ctx.lineWidth = 3
    ctx.strokeStyle = "rgba(0,0,0,0.85)"
    ctx.strokeText(label, x, y)
    ctx.fillStyle = color
    ctx.fillText(label, x, y)
    ctx.lineWidth = 1
  }
  ctx.restore()
}
