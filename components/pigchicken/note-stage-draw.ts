// Drawing of the note stage (the guitar hero mode's first stage, in the temple): the fan of lanes around her with
// the ring where the notes arrive, the note shots, the disc that starts the song and the stage's HUD.
// Canvas, world units shifted by camX (like the rest of the world), and screen pixels for the HUD.
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import type { Combat } from "@/lib/pigchicken/combat"
import { SCALES } from "@/lib/pigchicken/music"
import { fanLanes } from "@/lib/pigchicken/fan"
import { ARRIVE_R, type NoteStage } from "@/lib/pigchicken/note-stage"
import type { NoteShot } from "@/lib/pigchicken/note-shots"
import { multOf } from "@/lib/pigchicken/temple"
import { drawBanner } from "@/components/pigchicken/temple-draw"

type Ctx = CanvasRenderingContext2D
type Target = Combat["targets"][number]

// the scale degree of a note in the song's key (the lanes' colours)
function degreeIn(root: number, steps: number[], m: number) {
  const pc = (((m - root) % 12) + 12) % 12
  let best = 0
  steps.forEach((s, i) => { if (Math.abs(s - pc) < Math.abs(steps[best] - pc)) best = i })
  return best
}

// the fan: faint rays from the ring outwards, like frets, a band of colour per lane on the ring, lit as a note
// comes in on it; the ring pulses on the beat
export function drawStageFan(ctx: Ctx, stage: NoteStage, shots: readonly NoteShot[], camX: number, now: number, beatPhase: number) {
  if (!stage.active) return
  const sg = stage.song, z = sg.music.zone
  const steps = SCALES[z.scale].steps
  const lanes = fanLanes(sg.fan, m => degreeIn(z.root, steps, m))
  const c = stage.state.center, cx = c.x - camX, cy = c.y
  const R = ARRIVE_R, OUT = 900
  // how lit each lane is: the nearest note coming in on it
  const lit = lanes.map(() => 0)
  shots.forEach(n => {
    if (n.state !== "incoming" || n.source !== "stage") return
    const i = lanes.findIndex(l => l.midi === n.midi)
    if (i >= 0) lit[i] = Math.max(lit[i], Math.max(0, 1 - Math.max(0, n.arriveAt - now) / 1.2))
  })
  ctx.save()
  ctx.lineCap = "round"
  lanes.forEach((l, i) => {
    const a0 = Math.min(l.a0, l.a1), a1 = Math.max(l.a0, l.a1)
    // the lane's band on the ring
    const k = lit[i]
    ctx.strokeStyle = l.color; ctx.globalAlpha = 0.4 + 0.55 * k
    ctx.lineWidth = 8 + 6 * k
    ctx.beginPath(); ctx.arc(cx, cy, R + 6, a0 + 0.02, a1 - 0.02); ctx.stroke()
    // a lit lane glows outwards too
    if (k > 0) {
      const grad = ctx.createRadialGradient(cx, cy, R, cx, cy, R + 260)
      grad.addColorStop(0, l.color); grad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.globalAlpha = 0.16 * k; ctx.fillStyle = grad
      ctx.beginPath(); ctx.arc(cx, cy, R + 260, a0, a1); ctx.arc(cx, cy, R + 10, a1, a0, true); ctx.closePath(); ctx.fill()
    }
    // the fret between lanes
    ctx.globalAlpha = 0.12; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(l.a0) * (R + 12), cy + Math.sin(l.a0) * (R + 12)); ctx.lineTo(cx + Math.cos(l.a0) * OUT, cy + Math.sin(l.a0) * OUT); ctx.stroke()
    if (i === lanes.length - 1) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(l.a1) * (R + 12), cy + Math.sin(l.a1) * (R + 12)); ctx.lineTo(cx + Math.cos(l.a1) * OUT, cy + Math.sin(l.a1) * OUT); ctx.stroke() }
  })
  // the ring: where the notes must be rebated
  const pulse = Math.pow(1 - beatPhase, 4)
  ctx.globalAlpha = 0.35 + 0.35 * pulse; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2 + 1.5 * pulse
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}

// the note shots: balls of light with a short trail; rebated ones shine brighter and leave a longer trail; a
// missed one goes grey and fades
export function drawNoteShots(ctx: Ctx, shots: readonly NoteShot[], camX: number, view: ViewRect) {
  ctx.save()
  shots.forEach(n => {
    const trail = n.state === "rebated" ? 0.09 : 0.05
    const tx = n.x - n.vx * trail, ty = n.y - n.vy * trail
    const r = n.size * (n.state === "rebated" ? 1.15 : 1)
    if (!intersectsView({ x: Math.min(n.x, tx) - r * 4, y: Math.min(n.y, ty) - r * 4, w: Math.abs(n.x - tx) + r * 8, h: Math.abs(n.y - ty) + r * 8 }, view)) return
    const x = n.x - camX
    const color = n.state === "missed" ? "#8b9099" : n.color
    ctx.globalAlpha = n.state === "missed" ? Math.max(0, 1 - n.t / 0.6) * 0.7 : 1
    // the trail
    const g = ctx.createLinearGradient(tx - camX, ty, x, n.y)
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, color)
    ctx.strokeStyle = g; ctx.lineWidth = r * 1.3; ctx.lineCap = "round"
    ctx.beginPath(); ctx.moveTo(tx - camX, ty); ctx.lineTo(x, n.y); ctx.stroke()
    // the glow
    const glow = r * (1.6 + 2 * n.glow) * (n.state === "rebated" ? 1.3 : 1)
    const halo = ctx.createRadialGradient(x, n.y, r * 0.3, x, n.y, glow)
    halo.addColorStop(0, color); halo.addColorStop(1, "rgba(0,0,0,0)")
    ctx.globalAlpha *= 0.55; ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, n.y, glow, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = n.state === "missed" ? Math.max(0, 1 - n.t / 0.6) * 0.7 : 1
    // the ball and its white core
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, n.y, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#fffdf5"; ctx.beginPath(); ctx.arc(x - r * 0.15, n.y - r * 0.15, r * 0.45, 0, Math.PI * 2); ctx.fill()
  })
  ctx.restore()
}

// the disc: a record on a little stand by the reset stone; strike it to play the test song (it spins while it plays)
export function drawDisc(ctx: Ctx, g: Target, x: number, stage: NoteStage) {
  const s = stage.state, t = performance.now() / 1000
  const ground = g.y + 4, cy = ground - 74, R = 36
  const k = s.discRing, shake = k < 0.25 ? Math.sin(k * 70) * 3 * (1 - k / 0.25) : 0
  const color = stage.song.music.zone.color
  ctx.save()
  ctx.translate(shake, 0)
  // the stand
  ctx.fillStyle = "#3b2f2a"; ctx.fillRect(x - 6, cy + 20, 12, ground - cy - 26)
  ctx.fillStyle = "#5a4a40"; ctx.fillRect(x - 30, ground - 10, 60, 10)
  // the record
  if (!stage.active) { ctx.shadowColor = color; ctx.shadowBlur = 12 + 6 * Math.sin(t * 3) }
  ctx.fillStyle = g.flash > 0 ? "#3a3a46" : "#16161c"
  ctx.beginPath(); ctx.arc(x, cy, R, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1
  for (let r = 14; r < R - 2; r += 4) { ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.stroke() }
  // the label turns while the song plays
  const spin = stage.active ? t * 3.5 : 0
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, cy, 11, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(x, cy, 11, spin, spin + Math.PI / 2); ctx.lineTo(x, cy); ctx.fill()
  ctx.fillStyle = "#f4f1e8"; ctx.beginPath(); ctx.arc(x, cy, 2, 0, Math.PI * 2); ctx.fill()
  // the sheen
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(x, cy, R - 8, spin - 2.4, spin - 1.6); ctx.stroke()
  ctx.restore()
  // its label
  ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"
  const label = stage.active ? "TOCANDO" : "MÚSICA TESTE", w = ctx.measureText(label).width + 12
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - w / 2, cy - R - 30, w, 16)
  ctx.fillStyle = color; ctx.fillText(label, x, cy - R - 18)
}

const JUDGE = {
  perfect: { text: "PERFEITO!", color: "#ffd166" }, good: { text: "BOM", color: "#7bdff2" }, fora: { text: "FORA", color: "#c9ced6" },
  miss: { text: "PERDEU", color: "#ff6b5b" }, parry: { text: "ANULOU", color: "#e9e4d0" }, contact: { text: "ENCOSTOU", color: "#ff8c69" },
} as const

// the HUD: the song, the score, the combo, the afinação bar and the judgement of the last note; the banners
export function drawNoteStageHud(ctx: Ctx, stage: NoteStage, top: number) {
  const s = stage.state
  const W = window.innerWidth
  if (stage.active) {
    const pw = Math.min(460, W - 32), x0 = Math.round((W - pw) / 2), y0 = top
    ctx.save()
    ctx.textBaseline = "middle"
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(x0, y0, pw, 58, 14); ctx.fill()
    ctx.font = "bold 12px ui-monospace, monospace"
    ctx.textAlign = "left"; ctx.fillStyle = stage.song.music.zone.color
    ctx.fillText(stage.song.name.toUpperCase(), x0 + 12, y0 + 15)
    ctx.textAlign = "right"; ctx.fillStyle = "#ffffff"
    ctx.fillText(`${s.score.toLocaleString("pt-BR")} pts`, x0 + pw - 12, y0 + 15)
    if (s.combo > 0) {
      ctx.textAlign = "center"; ctx.fillStyle = multOf(s.combo) > 1 ? "#ffd166" : "#c9ced6"
      ctx.fillText(`combo ${s.combo}${multOf(s.combo) > 1 ? ` · ×${multOf(s.combo)}` : ""}`, x0 + pw / 2, y0 + 15)
    }
    // the afinação bar
    const bx = x0 + 92, bw = pw - 104, by = y0 + 38
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(244,241,232,0.8)"; ctx.font = "bold 10px ui-monospace, monospace"
    ctx.fillText("AFINAÇÃO", x0 + 12, by)
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.roundRect(bx, by - 5, bw, 10, 5); ctx.fill()
    const a = Math.max(0, Math.min(1, s.afina))
    ctx.fillStyle = a > 0.5 ? "#7bd88f" : a > 0.25 ? "#ffd166" : "#ff6b5b"
    if (a > 0) { ctx.beginPath(); ctx.roundRect(bx, by - 5, Math.max(10, bw * a), 10, 5); ctx.fill() }
    // the last note's judgement, popping under the panel
    const j = s.judge
    if (j) {
      const k = j.t / 0.7, J = JUDGE[j.grade]
      ctx.globalAlpha = 1 - k; ctx.textAlign = "center"
      ctx.font = `bold ${j.grade === "perfect" ? 20 : 15}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillStyle = "#000"; ctx.fillText(J.text, W / 2 + 1, y0 + 80 - k * 8 + 1)
      ctx.fillStyle = J.color; ctx.fillText(J.text, W / 2, y0 + 80 - k * 8)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
  if (s.banner) drawBanner(ctx, s.banner, top)
}
