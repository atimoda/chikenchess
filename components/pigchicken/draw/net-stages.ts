// The fases de notas of the other browsers, online (lib/pigchicken/net-stages.ts): her ring, the aliens and the note
// shots where that browser says they are (the shots carried on by their speed between two words), and a small panel
// per stage under this browser's own: whose song it is, the hearts, the song's name, the points, the combo and the
// afinação. Canvas, world units shifted by camX for the world and screen pixels for the panel.
import { t as tr } from "@/lib/i18n"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import type { Combat } from "@/lib/pigchicken/combat"
import { ARRIVE_R } from "@/lib/pigchicken/note-stage"
import type { NoteShot } from "@/lib/pigchicken/note-shots"
import type { RemoteStage } from "@/lib/pigchicken/net-stages"
import { multOf } from "@/lib/pigchicken/temple"
import { drawTempleAlien } from "@/components/pigchicken/temple-draw"
import { drawNoteShots } from "@/components/pigchicken/note-stage-draw"
import { stageWidth } from "@/lib/stage-size"

type Ctx = CanvasRenderingContext2D
type Target = Combat["targets"][number]
const STATES: NoteShot["state"][] = ["incoming", "rebated", "missed"]

export function drawRemoteStages(ctx: Ctx, list: readonly RemoteStage[], camX: number, view: ViewRect, beatPhase: number, beat: number, now: number) {
  for (const { act, at } of list) {
    const dt = Math.max(0, Math.min(0.2, (now - at) / 1000))
    // her ring, pulsing softly on the beat (the campaign has none)
    if (!act.cp && intersectsView({ x: act.x - 120, y: act.y - 120, w: 240, h: 240 }, view)) {
      ctx.save()
      ctx.globalAlpha = 0.25 + 0.2 * (1 - beatPhase)
      ctx.strokeStyle = act.c; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(act.x - camX, act.y, ARRIVE_R, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }
    for (const [x, y, w, h, species, color, size, dying] of act.a) {
      if (!intersectsView({ x: x - w, y: y - h * 1.5, w: w * 2, h: h * 2 }, view)) continue
      const g: Target = { id: 0, kind: "alien", home: 0, x, y, w, h, hp: 1, maxHp: 1, flash: 0, wobble: 0, vx: 0, deadT: dying ? 0.2 : 0, face: 1, state: "fly", animT: 0, data: { species, color, size } }
      drawTempleAlien(ctx, g, x - camX, beatPhase, 0, beat, { x: act.x, y: act.y })
    }
    const shots: NoteShot[] = act.q.map(([id, x, y, vx, vy, c, r, st, midi]) => ({ id, x: x + vx * dt, y: y + vy * dt, vx, vy, midi, color: c, size: r, glow: 0.7, arriveAt: 0, state: STATES[st], t: 0, source: "net" }))
    drawNoteShots(ctx, shots, camX, view)
  }
}

/** the panels, from `top` down (one per stage); returns where the next thing goes */
export function drawRemoteStageHuds(ctx: Ctx, list: readonly RemoteStage[], top: number, nameOf: (pid: number) => string) {
  const W = stageWidth()
  let y0 = top
  for (const { pid, act } of list) {
    const pw = Math.min(460, W - 32), x0 = Math.round((W - pw) / 2)
    ctx.save()
    ctx.textBaseline = "middle"
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(x0, y0, pw, 44, 12); ctx.fill()
    ctx.font = "bold 14px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "left"
    for (let i = 0; i < act.hm; i++) { ctx.fillStyle = i < act.h ? "#ff4d6d" : "rgba(255,255,255,0.2)"; ctx.fillText("♥", x0 + 10 + i * 15, y0 + 13) }
    ctx.font = "bold 11px ui-monospace, monospace"
    ctx.fillStyle = act.c
    ctx.fillText(`${nameOf(pid)} · ${tr(act.n).toUpperCase()}`, x0 + 14 + act.hm * 15, y0 + 13)
    ctx.textAlign = "right"; ctx.fillStyle = "#ffffff"
    ctx.fillText(tr("{n} pts", { n: act.sc.toLocaleString("pt-BR") }), x0 + pw - 12, y0 + 13)
    if (act.cb > 0) { ctx.textAlign = "center"; ctx.fillStyle = multOf(act.cb) > 1 ? "#ffd166" : "#c9ced6"; ctx.fillText(tr("combo {n}", { n: act.cb }), x0 + pw * 0.62, y0 + 13) }
    // the afinação bar (the campaign has none)
    if (act.cp) { ctx.restore(); y0 += 52; continue }
    const bx = x0 + 12, bw = pw - 24, by = y0 + 31
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.roundRect(bx, by - 4, bw, 8, 4); ctx.fill()
    const a = Math.max(0, Math.min(1, act.af))
    ctx.fillStyle = a > 0.5 ? "#7bd88f" : a > 0.25 ? "#ffd166" : "#ff6b5b"
    if (a > 0) { ctx.beginPath(); ctx.roundRect(bx, by - 4, Math.max(8, bw * a), 8, 4); ctx.fill() }
    ctx.restore()
    y0 += 52
  }
  return y0
}
