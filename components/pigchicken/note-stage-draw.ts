// Drawing of the note stage (the guitar hero mode's first stage, in the temple): the fan of lanes around her with
// the ring where the notes arrive, the note shots, the disc that starts the song and the stage's HUD.
// Canvas, world units shifted by camX (like the rest of the world), and screen pixels for the HUD.
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import type { Combat } from "@/lib/pigchicken/combat"
import { SCALES } from "@/lib/pigchicken/music"
import { fanLanes } from "@/lib/pigchicken/fan"
import { ARRIVE_R, type NoteStage, type StageTalk } from "@/lib/pigchicken/note-stage"
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
    // its trail: seconds of its path behind it (the alien's variation sets how long; 0.3 = the usual)
    const own = 0.02 + (n.trail ?? 0.3) * 0.1
    const trail = n.state === "rebated" ? Math.max(0.09, own + 0.04) : own
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

// the jukebox: an arched cabinet with neon tubes along its edges, a screen on top with the picked song's cover, a
// row of buttons, a diamond grille and the speakers below. The neon is green at rest and takes the song's colour
// while it plays, pulsing on the beat; the big speaker shakes with the bass. Strike it to open the songs.
export const JUKEBOX_W = 112, JUKEBOX_H = 214
export function drawJukebox(ctx: Ctx, g: Target, x: number, o: { cover: HTMLCanvasElement; playing: boolean; color: string; beatPhase: number; ring: number }) {
  const W = JUKEBOX_W, H = JUKEBOX_H, ground = g.y + 4, top = ground - H, l = x - W / 2
  const k = o.ring, shake = k < 0.25 ? Math.sin(k * 70) * 3 * (1 - k / 0.25) : 0
  const pulse = o.playing ? Math.pow(1 - o.beatPhase, 3) : 0.35 + 0.15 * Math.sin(performance.now() / 600)
  const neon = o.playing ? o.color : "#39ff88"
  const arch = (inset: number) => {
    const r = W / 2 - inset
    ctx.beginPath()
    ctx.moveTo(l + inset, ground - 6)
    ctx.lineTo(l + inset, top + W / 2)
    ctx.arc(x, top + W / 2, r, Math.PI, 0)
    ctx.lineTo(l + W - inset, ground - 6)
  }
  ctx.save()
  ctx.translate(shake, 0)
  // the cabinet
  ctx.fillStyle = g.flash > 0 ? "#24503a" : "#0f2a1e"
  arch(0); ctx.closePath(); ctx.fill()
  ctx.fillStyle = "#08160f"; ctx.fillRect(l + 6, ground - 8, W - 12, 8)
  // the neon tubes
  ctx.lineCap = "round"
  ctx.shadowColor = neon; ctx.shadowBlur = 10 + 14 * pulse
  ctx.strokeStyle = neon; ctx.globalAlpha = 0.55 + 0.45 * pulse; ctx.lineWidth = 6
  arch(5); ctx.stroke()
  ctx.globalAlpha = 1; ctx.shadowBlur = 0
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.5
  arch(5); ctx.stroke()
  // the chrome frame inside
  ctx.strokeStyle = "#8a8f98"; ctx.lineWidth = 3
  arch(13); ctx.stroke()
  // the screen: the cover of the song picked
  const sw = W - 40, sx = x - sw / 2, sy = top + 26, sh = sw * 0.78
  ctx.fillStyle = "#050507"; ctx.fillRect(sx - 3, sy - 3, sw + 6, sh + 6)
  const cs = Math.min(sw, sh)
  ctx.drawImage(o.cover, x - cs / 2, sy + (sh - cs) / 2, cs, cs)
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(sx, sy, sw, sh * 0.35)
  // the row of buttons
  const by = sy + sh + 10
  for (let i = 0; i < 6; i++) {
    const bx = sx + 2 + i * ((sw - 4) / 6)
    ctx.fillStyle = i === 2 ? neon : "#e9e4d0"; ctx.globalAlpha = i === 2 ? 0.6 + 0.4 * pulse : 0.9
    ctx.fillRect(bx, by, (sw - 4) / 6 - 3, 6)
  }
  ctx.globalAlpha = 1
  // the diamond grille, with its rainbow behind
  const gy = by + 14, gh = 40, gw = sw - 18
  const rb = ctx.createLinearGradient(x - gw / 2, 0, x + gw / 2, 0)
  ;["#ff6b5b", "#ffd166", "#7bd88f", "#4cc9f0", "#c77dff"].forEach((c, i) => rb.addColorStop(i / 4, c))
  ctx.fillStyle = rb; ctx.globalAlpha = 0.35 + 0.3 * pulse; ctx.fillRect(x - gw / 2, gy, gw, gh); ctx.globalAlpha = 1
  ctx.save(); ctx.beginPath(); ctx.rect(x - gw / 2, gy, gw, gh); ctx.clip()
  ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2
  for (let d = -gh; d < gw + gh; d += 9) {
    ctx.beginPath(); ctx.moveTo(x - gw / 2 + d, gy); ctx.lineTo(x - gw / 2 + d + gh, gy + gh); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x - gw / 2 + d, gy + gh); ctx.lineTo(x - gw / 2 + d + gh, gy); ctx.stroke()
  }
  ctx.restore()
  // two little speakers, then the big one that shakes with the bass
  const sy2 = gy + gh + 12
  for (const dx of [-24, 24]) { ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x + dx, sy2, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#3a3a3a"; ctx.beginPath(); ctx.arc(x + dx, sy2, 3, 0, Math.PI * 2); ctx.fill() }
  const R = 26, cy = ground - 14 - R, bump = o.playing ? 1 + 0.06 * Math.pow(1 - o.beatPhase, 4) : 1
  ctx.fillStyle = "#0a0a0a"; ctx.beginPath(); ctx.arc(x, cy, R * bump, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = neon; ctx.shadowColor = neon; ctx.shadowBlur = 6 + 8 * pulse; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(x, cy, R * bump - 2, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1
  for (let r = 6; r < R - 4; r += 4) { ctx.beginPath(); ctx.arc(x, cy, r * bump, 0, Math.PI * 2); ctx.stroke() }
  ctx.restore()
  // its label
  ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"
  const label = o.playing ? "TOCANDO" : "JUKEBOX", w = ctx.measureText(label).width + 12
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - w / 2, top - 22, w, 16)
  ctx.fillStyle = neon; ctx.fillText(label, x, top - 10)
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
  // the lines: in the banner, or in a strip under the score (and the balloons whose speaker is not around); the strip
  // stays up there so it never covers her, the notes coming in or the inventory bar
  const strips: StageTalk[] = []
  for (const t of s.talk) {
    if (t.place === "banner") drawBanner(ctx, { title: t.name, sub: t.text.slice(0, t.shown) || " ", color: t.color, t: t.t, life: t.secs }, top)
    else if (t.place === "faixa" || !t.over) strips.push(t)
  }
  if (strips.length) {
    const sw = Math.min(640, W - 32), x0 = Math.round((W - sw) / 2)
    ctx.save()
    ctx.textBaseline = "middle"
    let y = top + (stage.active ? 100 : 8)
    for (const t of strips) {
      ctx.font = "14px ui-sans-serif, system-ui, sans-serif"
      const lines = wrapText(ctx, t.text, sw - 24), shown = wrapText(ctx, t.text.slice(0, t.shown), sw - 24)
      const h = 30 + Math.max(1, lines.length) * 18
      ctx.globalAlpha = Math.max(0, Math.min(1, t.t * 5, (t.secs - t.t) * 3))
      ctx.fillStyle = "rgba(6,8,10,0.78)"; ctx.beginPath(); ctx.roundRect(x0, y, sw, h, 10); ctx.fill()
      ctx.fillStyle = t.color; ctx.fillRect(x0, y + 8, 3, h - 16)
      ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = t.color
      ctx.fillText(t.name.toUpperCase(), x0 + 14, y + 14)
      ctx.font = "14px ui-sans-serif, system-ui, sans-serif"; ctx.fillStyle = "#f4f1e8"
      shown.forEach((l, k) => ctx.fillText(l, x0 + 14, y + 33 + k * 18))
      y += h + 6
    }
    ctx.restore()
  }
}

function wrapText(ctx: Ctx, text: string, maxW: number) {
  const out: string[] = []
  let line = ""
  text.split(" ").forEach(w => {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxW && line) { out.push(line); line = w } else line = next
  })
  if (line) out.push(line)
  return out
}

// a line in a balloon over who says it (world units)
export function drawStageTalk(ctx: Ctx, stage: NoteStage, camX: number) {
  for (const t of stage.state.talk) {
    if (t.place !== "balao" || !t.over) continue
    ctx.save()
    ctx.font = "14px ui-sans-serif, system-ui, sans-serif"
    const lines = wrapText(ctx, t.text.slice(0, t.shown), 240)
    const full = wrapText(ctx, t.text, 240)
    const w = Math.max(90, ...full.map(l => ctx.measureText(l).width)) + 24, h = 26 + Math.max(1, full.length) * 18
    // kept on the screen; the tail still points at who speaks
    const x = Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, t.x - camX - w / 2))), y = Math.round(t.y - h - 14)
    const tx = Math.max(x + 16, Math.min(x + w - 16, t.x - camX))
    ctx.globalAlpha = Math.max(0, Math.min(1, t.t * 6, (t.secs - t.t) * 3))
    ctx.fillStyle = "rgba(250,247,238,0.96)"; ctx.strokeStyle = t.color; ctx.lineWidth = 2
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12)
    ctx.moveTo(tx - 8, y + h); ctx.lineTo(tx, y + h + 12); ctx.lineTo(tx + 8, y + h)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = "rgba(250,247,238,0.96)"; ctx.fillRect(tx - 7, y + h - 2, 14, 3)
    ctx.textBaseline = "middle"; ctx.textAlign = "left"
    ctx.font = "bold 10px ui-monospace, monospace"; ctx.fillStyle = "#5b5f66"
    ctx.fillText(t.name.toUpperCase(), x + 12, y + 12)
    ctx.font = "14px ui-sans-serif, system-ui, sans-serif"; ctx.fillStyle = "#16181c"
    lines.forEach((l, k) => ctx.fillText(l, x + 12, y + 30 + k * 18))
    ctx.restore()
  }
}
