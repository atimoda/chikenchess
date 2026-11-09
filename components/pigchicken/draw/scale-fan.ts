// The "Escala da mira" layer (debug, the header's layers menu): around each player holding an item whose note
// follows the aim, the aim's fan cut in lanes where the note changes, each one labelled small with its note and its
// degree in the zone's scale (in brackets when the note is outside the scale, a chord note on a pentatonic).
// Instruments: their pitch set, octave and span (music.noteFor). Weapons: only when their rebate chain has
// "Pelo ângulo do golpe" (the scale, that step's octave). The note only depends on how high the aim points, so the
// lanes are the same on both sides; the labels go on the side she aims at.
import type { Combat } from "@/lib/pigchicken/combat"
import { DEGREE_COLORS, NOTE_NAMES, SCALES, type PitchSet } from "@/lib/pigchicken/music"


const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`

// what the held item's aim plays: its pitch set, octave and span (null: its note does not follow the aim)
function aimSource(combat: Combat): { set: PitchSet; octave: number; span: number } | null {
  if (!combat.inventory[combat.current]) return null
  const d = combat.def()
  if (d.instrument) return { set: d.pitchSet, octave: d.octave, span: d.span }
  const by = d.rebateChain?.find(t => t.kind === "byAngle")
  return by ? { set: "scale", octave: by.n, span: 2 } : null
}

// the fan's radius at size 1x (the layers menu's "Escalas (Tamanho)" goes from 0.1x to 2x; 0.3x by default)
export const SCALE_FAN_R = 390

// the current player's fan (combat.use(id) first), centred at (cx, cy) in screen units; alpha: the layer's
// strength; size: its radius in SCALE_FAN_R. Each lane fades out toward the circle (0 at its edge), the labels sit
// in the middle of each lane on the side she aims at.
export function drawScaleFan(ctx: CanvasRenderingContext2D, combat: Combat, cx: number, cy: number, aim: number, scale = 1, alpha = 1, size = 0.3) {
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
  const rOut = SCALE_FAN_R * size * scale, rIn = Math.min(rOut * 0.3, 34 * scale)
  // fading from the centre to nothing at the circle
  const fade = (color: string, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, rIn, cx, cy, rOut)
    g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0))
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
      ctx.fillStyle = fade(color, alpha * (i === now ? 0.4 : 0.14))
      ctx.fill()
      ctx.strokeStyle = fade(color, alpha * 0.6)
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a0) * rIn, cy + Math.sin(a0) * rIn)
      ctx.lineTo(cx + Math.cos(a0) * rOut, cy + Math.sin(a0) * rOut)
      ctx.stroke()
    }
    // the label in the middle of the lane, on the side she aims at
    const mid = angle((lo + hi) / 2, right), r = (rIn + rOut) / 2
    ctx.globalAlpha = alpha * (i === now ? 1 : 0.8)
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
