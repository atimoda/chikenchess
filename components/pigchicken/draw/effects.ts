// Flying notes, beams, zone banners, the melee swing trail and the puff that cancels a note.
// Split out of parquinho.tsx; the component there owns the loop and calls these each frame.
import { type Combat, type Swing } from "@/lib/pigchicken/combat"
import { ellipsePoint, swingPose, trailSpan } from "@/lib/pigchicken/swing"
import { zoneLabel, type Zone } from "@/lib/pigchicken/music"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { type Ctx } from "./shared"
import { stageWidth } from "@/lib/stage-size"

// a note in flight: its symbol in the colour of its scale degree, swaying, with a short trail, pulsing on the beat
export function drawNote(ctx: Ctx, b: Combat["bullets"][number], x: number, pulse: number) {
  const n = b.note!
  const len = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / len, uy = b.vy / len
  const sway = (t: number) => Math.sin(t * Math.PI * 5 + n.phase) * n.wave
  const size = b.size * 2.8 * (1 + 0.25 * pulse)
  ctx.font = `bold ${Math.round(size)}px ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  for (let k = 3; k >= 0; k--) {
    const back = k * 0.025, o = sway(b.t - back)
    const px = x - b.vx * back - uy * o, py = b.y - b.vy * back + ux * o
    ctx.globalAlpha = k === 0 ? 1 : 0.35 - k * 0.09
    if (k === 0) { ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.strokeText(n.sym, px, py) }
    ctx.fillStyle = n.color; ctx.fillText(n.sym, px, py)
  }
  ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic"
}

// the violin's beam: a vibrating string of light from the muzzle, with notes running along it. The wave is as tall
// as the sound is moving: beamWave() px from the item's "Vibrato natural" depth (cents; 12 = the 3 px of always)
// plus the aim's tremolo bending it now (semitones)
export const beamWave = (cents = 12, bend = 0) => 1 + Math.max(0, Math.min(100, cents)) / 6 + 9 * Math.min(2, Math.abs(bend))
export function drawBeam(ctx: Ctx, combat: Combat, camX: number, view: ViewRect) {
  const b = combat.beam
  if (!b) return
  if (!intersectsView({ x: Math.min(b.x1, b.x2), y: Math.min(b.y1, b.y2), w: Math.abs(b.x2 - b.x1), h: Math.abs(b.y2 - b.y1) }, view, 32)) return
  const x1 = b.x1 - camX, x2 = b.x2 - camX, len = Math.hypot(x2 - x1, b.y2 - b.y1) || 1
  const ux = (x2 - x1) / len, uy = (b.y2 - b.y1) / len, t = performance.now() / 1000
  const amp = beamWave(b.vib, b.bend)
  ctx.save()
  ctx.shadowColor = b.color; ctx.shadowBlur = 12
  ;[[5, 0.25], [2, 0.9]].forEach(([w, a]) => {
    ctx.strokeStyle = b.color; ctx.globalAlpha = a; ctx.lineWidth = w
    ctx.beginPath()
    for (let s = 0; s <= len; s += 8) {
      const o = Math.sin(s * 0.08 - t * 40) * amp * Math.sin((s / len) * Math.PI)
      const px = x1 + ux * s - uy * o, py = b.y1 + uy * s + ux * o
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
  })
  ctx.globalAlpha = 1; ctx.shadowBlur = 0
  ctx.font = "bold 16px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = b.color
  for (let k = 0; k < 4; k++) { const s = ((t * 260 + k * len / 4) % len); ctx.fillText(k % 2 ? "♪" : "♩", x1 + ux * s, b.y1 + uy * s - 8) }
  ctx.restore()
}

export function drawZoneBanner(ctx: Ctx, zone: Zone, life: number) {
  ctx.save()
  ctx.globalAlpha = Math.min(1, life, (2.5 - life) * 4)
  ctx.font = "bold 15px ui-monospace, monospace"; ctx.textAlign = "center"
  const text = `♪ ${zoneLabel(zone)}`, w = ctx.measureText(text).width + 28
  const x = stageWidth() / 2, y = 158
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - w / 2, y - 20, w, 30)
  ctx.fillStyle = zone.color; ctx.fillText(text, x, y)
  ctx.restore()
}
// the wing's pose for the rig: where the blow is now and how much of the swing pose it takes (none once it is over)
export function rigSwing(sw: Swing | null) {
  if (!sw || sw.t >= sw.time) return null
  const p = swingPose(sw)
  return { angle: p.angle, reach: p.reach, t: p.blend, size: sw.size, bare: sw.wing, heavy: !!sw.heavy }
}

// the blow's air: a cream crescent along the sweep, thick at the tip and thin at the tail, that appears in a frame or
// two and dissolves from the tail, letting off a few curls; a flash where it hit. The horizontal blow is a flattened
// ellipse: its back half is drawn behind her (layer "back"), its front half over her (layer "front")
export function drawSwing(ctx: Ctx, combat: Combat, origin: { x: number; y: number }, layer: "back" | "front" = "back", view: ViewRect = { x: 0, y: 0, w: stageWidth(), h: window.innerHeight }) {
  const sw = combat.swing
  if (!sw || sw.trail.opacity <= 0) return
  if (!intersectsView({ x: origin.x - sw.reach - 40, y: origin.y - sw.reach - 40, w: sw.reach * 2 + 80, h: sw.reach * 2 + 80 }, view, 8)) return
  if (layer === "front" && sw.kind !== "flat") return
  const span = trailSpan(sw)
  ctx.save()
  ctx.translate(origin.x, origin.y)
  if (span && span.head > span.tail) {
    const { tail, head, fade, sweep } = span
    const alpha = sw.trail.opacity * (1 - fade * fade)
    const R = sw.reach, W = Math.min(sw.trail.width, R * 0.6)
    // points along the crescent from the tail to the head: outer edge at the reach, inner edge in by the thickness,
    // which grows toward the head (the tip of the blow)
    const n = Math.max(8, Math.ceil((head - tail) / 0.06))
    const at = (p: number, r: number) => {
      if (sw.kind === "flat") { const e = ellipsePoint(sw.angle, sw.dir, -sweep / 2 + p); return { x: e.x * r, y: e.y * r, z: e.z } }
      const a = sw.angle - sw.dir * sweep / 2 + sw.dir * p
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0 }
    }
    const outer: { x: number; y: number; z: number }[] = [], inner: { x: number; y: number }[] = []
    for (let i = 0; i <= n; i++) {
      const p = tail + (head - tail) * (i / n), k = i / n
      outer.push(at(p, R))
      inner.push(at(p, R - W * (0.12 + 0.88 * Math.pow(k, 0.7))))
    }
    // the flat blow: only the half on this layer (behind her: z < 0)
    const keep = (i: number) => sw.kind !== "flat" || (layer === "back" ? outer[i].z < 0.05 : outer[i].z > -0.05)
    const runs: number[][] = []
    let run: number[] = []
    for (let i = 0; i <= n; i++) { if (keep(i)) run.push(i); else if (run.length) { runs.push(run); run = [] } }
    if (run.length) runs.push(run)
    const col = sw.trail.color
    runs.forEach(r => {
      if (r.length < 2) return
      ctx.beginPath()
      r.forEach((i, j) => j ? ctx.lineTo(outer[i].x, outer[i].y) : ctx.moveTo(outer[i].x, outer[i].y))
      for (let j = r.length - 1; j >= 0; j--) ctx.lineTo(inner[r[j]].x, inner[r[j]].y)
      ctx.closePath()
      ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.fill()
      // a brighter rim along the outer edge
      ctx.beginPath(); r.forEach((i, j) => j ? ctx.lineTo(outer[i].x, outer[i].y) : ctx.moveTo(outer[i].x, outer[i].y))
      ctx.globalAlpha = alpha * 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke()
    })
    // the curls: little arcs that come loose from the crescent and drift away as it dissolves
    if (layer === "back" || sw.kind === "flat") {
      const wisps = sw.trail.wisps
      ctx.strokeStyle = col; ctx.lineCap = "round"
      for (let w = 0; w < wisps; w++) {
        const h = hash01(sw.seed * 97 + w * 13.7)
        const p = sweep * (0.15 + 0.8 * (w + h * 0.6) / Math.max(1, wisps))
        if (p < tail || p > head) continue
        const base = at(p, R - W * (0.3 + 0.5 * h))
        if (!keep(Math.round((p - tail) / Math.max(1e-6, head - tail) * n))) continue
        const out = Math.hypot(base.x, base.y) || 1, drift = 8 + 26 * fade
        const cx = base.x + base.x / out * drift, cy = base.y + base.y / out * drift - 6 * fade
        const rr = 3 + 5 * h + 4 * fade
        ctx.globalAlpha = alpha * 0.85; ctx.lineWidth = 2 * (1 - fade) + 0.6
        ctx.beginPath(); ctx.arc(cx, cy, rr, h * 6, h * 6 + Math.PI * (1.1 + 0.5 * h)); ctx.stroke()
      }
    }
  }
  // the impact: a white flash where it hit, for a moment
  const since = sw.t - sw.hitAt
  if (layer === "back" && sw.hits > 0 && since < 0.12) {
    const k = since / 0.12
    sw.impacts.forEach(p => {
      ctx.globalAlpha = 1 - k; ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + sw.seed, r = i % 2 ? 5 : 14 + 10 * k
        ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r)
      }
      ctx.closePath(); ctx.fill()
    })
  }
  ctx.restore()
}
// the screen's jolt when a blow lands (px, fading over 0.1 s)
export function swingShake(sw: Swing | null) {
  if (!sw || sw.hits <= 0) return 0
  const since = sw.t - sw.hitAt
  return since < 0.1 ? 2.5 * (1 - since / 0.1) : 0
}
export const hash01 = (v: number) => { const s = Math.sin(v * 12.9898) * 43758.5453; return s - Math.floor(s) }

// a damaging note or projectile cancelled by a peck: a little cloud that puffs out and fades. Drawn whole on a
// small canvas first, so the overlapping puffs fade as one cloud
export let puffCanvas: HTMLCanvasElement | null = null
export function drawPuff(ctx: Ctx, x: number, y: number, p: Combat["puffs"][number]) {
  const k = p.t / p.life, grow = 1 - (1 - k) * (1 - k), S = 96, dpr = 2
  if (!puffCanvas) { puffCanvas = document.createElement("canvas"); puffCanvas.width = puffCanvas.height = S * dpr }
  const c = puffCanvas.getContext("2d")!
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, S, S); c.translate(S / 2, S / 2)
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = i / 5 * Math.PI * 2 + p.seed * 6, d = 4 + 10 * grow
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7, r: (5 + 4 * hash01(p.seed + i)) * (0.5 + 0.7 * grow) }
  })
  pts.push({ x: 0, y: 0, r: 6 + 5 * grow })
  const cloud = () => { c.beginPath(); pts.forEach(b => { c.moveTo(b.x + b.r, b.y); c.arc(b.x, b.y, b.r, 0, Math.PI * 2) }) }
  c.strokeStyle = "rgba(90,90,100,0.55)"; c.lineWidth = 3; cloud(); c.stroke()
  c.fillStyle = p.color; cloud(); c.fill()
  // three little curls flying off
  c.strokeStyle = p.color; c.lineWidth = 1.5; c.lineCap = "round"
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.9 + p.seed, d = 12 + 18 * grow
    c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 3 + 2 * grow, a, a + Math.PI * 1.3); c.stroke()
  }
  ctx.save()
  ctx.globalAlpha = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65
  ctx.drawImage(puffCanvas, x - S / 2, y - 10 * grow - S / 2, S, S)
  ctx.restore()
}
