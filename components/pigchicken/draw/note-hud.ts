// Draws the instruments' and the throwing items' ring round the reticle (lib/pigchicken/note-hud.ts): thin neon
// lines with a halo of their own colour and a dark shade under them so they read on a day sky and at night (a wide
// see-through stroke, no shadowBlur: it stays cheap on a phone). Empty is only the faint track.
import { bitAlpha, blackKey, fieldAngle, fieldSize, glissSlot, nextColor, nextNote, noteLit, noteSlot, sweepAlpha, SPECIAL_CARDS, type NoteView } from "@/lib/pigchicken/note-hud"
import { DEGREE_COLORS } from "@/lib/pigchicken/music"

const SHADE = "rgba(0,4,14,0.55)", TRACK = "rgba(190,232,255,0.36)", TAU = Math.PI * 2

type Path = () => void
function neon(ctx: CanvasRenderingContext2D) {
  const line = (path: Path, color: string, w: number, alpha = 1) => {
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"
    path(); ctx.globalAlpha = alpha; ctx.strokeStyle = SHADE; ctx.lineWidth = w + 2.2; ctx.stroke()
    ctx.globalAlpha = alpha * 0.26; ctx.strokeStyle = color; ctx.lineWidth = w + 4.5; ctx.stroke()
    ctx.globalAlpha = alpha; ctx.lineWidth = w; ctx.stroke()
    ctx.globalAlpha = alpha * 0.6; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(0.5, w * 0.32); ctx.stroke()
    ctx.restore()
  }
  const empty = (path: Path, w: number) => { ctx.save(); ctx.lineCap = "round"; path(); ctx.strokeStyle = TRACK; ctx.lineWidth = Math.max(0.8, w * 0.5); ctx.stroke(); ctx.restore() }
  const dot = (x: number, y: number, r: number, color: string, alpha = 1) => {
    if (!(r > 0)) return
    ctx.save(); ctx.globalAlpha = alpha
    ctx.fillStyle = SHADE; ctx.beginPath(); ctx.arc(x, y, r + 1.1, 0, TAU); ctx.fill()
    ctx.globalAlpha = alpha * 0.28; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * 2.3, 0, TAU); ctx.fill()
    ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
    ctx.globalAlpha = alpha * 0.7; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, TAU); ctx.fill()
    ctx.restore()
  }
  const hole = (x: number, y: number, r: number) => { ctx.save(); ctx.strokeStyle = TRACK; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore() }
  const arc = (r: number, a0: number, a1: number): Path => () => { ctx.beginPath(); ctx.arc(0, 0, r, a0, a1) }
  const ray = (a: number, r0: number, r1: number): Path => () => { ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1) }
  return { line, empty, dot, hole, arc, ray }
}

/** The ring of a player's held item round (x, y), radius R (px). */
export function drawNoteHud(ctx: CanvasRenderingContext2D, v: NoteView, x: number, y: number, R: number, alpha = 1) {
  const look = v.look, f = v.f
  if (!look || !f) return
  const g = neon(ctx), n = look.n, base = look.color, nx = nextColor(v)
  const reloading = f.reload > 0, top = nextNote(f.ammo)
  const lit = (j: number) => noteLit(look, j, f.ammo, f.reload, f.refill, f.amount)
  const sw = (j: number) => sweepAlpha(v, j / n)
  // the notes a press spends together (a phrase, a strum, a chord, the arpeggio): each in the aim's degrees
  const inGroup = (j: number) => !reloading && look.deg && top - j >= 0 && top - j < look.group
  const groupColor = (j: number) => {
    if (!f.color) return nx
    const i = DEGREE_COLORS.indexOf(f.color), k = top - j
    if (i < 0) return nx
    const step = look.style === "bars" ? [0, 2, 4, 2][k % 4] : look.style === "trios" ? k : k * 2
    return DEGREE_COLORS[(i + step) % DEGREE_COLORS.length]
  }
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= alpha
  switch (look.style) {
    case "dots": for (let j = 0; j < n; j++) {
      const s = noteSlot(look, j), px = Math.cos(s.a) * s.r * R, py = Math.sin(s.a) * s.r * R, l = lit(j)
      if (l >= 1) { const isNext = j === top && !reloading; g.dot(px, py, isNext ? 1.9 : 1.05, isNext ? nx : base, sw(j)) }
      else if (l > 0) g.dot(px, py, 1.05 * l, base, 0.9)
      else g.hole(px, py, 0.8)
    } break
    case "bars": case "keys": case "pulse": if (look.style === "pulse") { drawPulse(); break } for (let j = 0; j < n; j++) {
      const s = noteSlot(look, j), l = lit(j), w = look.style === "keys" ? (blackKey(j) ? 2 : 3.2) : 2
      const cur = look.style === "bars" && f.firing && inGroup(j) && top - j === v.arp % 4
      if (l >= 1) g.line(g.ray(s.a, s.r0 * R, (cur ? 1.04 : s.r1) * R), inGroup(j) ? groupColor(j) : look.style === "keys" && blackKey(j) ? "#9fdcff" : base, cur ? 3 : w, sw(j))
      else if (l > 0) g.line(g.ray(s.a, s.r0 * R, (s.r0 + (s.r1 - s.r0) * l) * R), base, w, 0.8)
      else g.empty(g.ray(s.a, s.r0 * R, s.r1 * R), w)
    } break
    case "trios": case "rosette": case "strokes": case "blocks": for (let j = 0; j < n; j++) {
      const s = noteSlot(look, j), l = lit(j), w = look.style === "strokes" ? 4.5 : look.style === "blocks" ? 5 : look.style === "trios" ? 3 : 2.2
      if (look.style === "strokes") {
        g.empty(g.arc(s.r * R, s.a0, s.a1), w)
        if (l > 0) {
          const head = j === Math.ceil(f.ammo) - 1 && !reloading
          g.line(g.arc(s.r * R, s.a0, s.a0 + (s.a1 - s.a0) * l), head ? nx : base, w, sw(j))
          if (head && f.firing) { const a = s.a0 + (s.a1 - s.a0) * l; g.dot(Math.cos(a) * s.r * R, Math.sin(a) * s.r * R, 2.6, "#ffffff") }
        }
        continue
      }
      if (l >= 1) g.line(g.arc(s.r * R, s.a0, s.a1), inGroup(j) ? groupColor(j) : base, w, sw(j))
      else if (l > 0) g.line(g.arc(s.r * R, s.a0, s.a0 + (s.a1 - s.a0) * l), base, w, 0.8)
      else g.empty(g.arc(s.r * R, s.a0, s.a1), w)
    } break
    case "jingles": {
      const r = 0.92 * R
      g.empty(g.arc(r, 0, TAU), 1.4)
      if (f.charge > 0) g.line(g.arc(r, -Math.PI / 2, -Math.PI / 2 + TAU * f.charge), nx, 1.6)
      for (let j = 0; j < n; j++) {
        const s = noteSlot(look, j), l = lit(j), t = s.a + Math.PI / 2
        for (const side of [-1, 1]) {
          const px = Math.cos(s.a) * r + Math.cos(t) * side * 3, py = Math.sin(s.a) * r + Math.sin(t) * side * 3
          if (l >= 1) g.dot(px, py, 2.3, j === top && !reloading ? nx : base, sw(j))
          else if (l > 0) g.dot(px, py, 2.3 * l, base, 0.8)
          else g.hole(px, py, 2.3)
        }
      }
    } break
    case "lyre": {
      g.line(g.arc(1.22 * R, 14 * Math.PI / 180, 166 * Math.PI / 180), base, 1.6, 0.75)
      for (let j = 0; j < n; j++) {
        const s = noteSlot(look, j), l = lit(j), r0 = s.r0 * R, r1 = s.r1 * R, isNext = j === top && !reloading
        if (v.twang && v.twang.j === j) {
          const amp = (1 - v.twang.t / 0.3) * 2.2, nx2 = Math.cos(s.a + Math.PI / 2), ny2 = Math.sin(s.a + Math.PI / 2)
          g.line(() => { ctx.beginPath(); for (let q = 0; q <= 10; q++) { const r = r0 + (r1 - r0) * q / 10, w = Math.sin(q / 10 * Math.PI) * Math.sin(v.t * 90 + q) * amp, px = Math.cos(s.a) * r + nx2 * w, py = Math.sin(s.a) * r + ny2 * w; if (q) ctx.lineTo(px, py); else ctx.moveTo(px, py) } }, base, 1.3, 0.7)
        } else if (l >= 1) g.line(g.ray(s.a, r0, r1), base, isNext ? 1.8 : 1.3, sw(j))
        else if (l > 0) g.line(g.ray(s.a, r1 - (r1 - r0) * l, r1), base, 1.3, 0.7)
        else g.empty(g.ray(s.a, r0, r1), 1.3)
      }
    } break
    case "fields": {
      if (v.slap > 0) ctx.translate(Math.sin(v.t * 97) * 1, Math.cos(v.t * 89) * 1)
      g.empty(g.arc(0.22 * R, 0, TAU), 1.4)
      const per = fieldSize(n)
      for (let i = 0; i < 8; i++) {
        const a = fieldAngle(i), cx = Math.cos(a) * 0.72 * R, cy = Math.sin(a) * 0.72 * R
        const ell = (s = 1) => () => { ctx.beginPath(); ctx.ellipse(cx, cy, 0.19 * R * s, 0.13 * R * s, a, 0, TAU) }
        if (v.slap > 0) g.line(ell(), "#ffffff", 1.2, v.slap / 0.25)
        else g.empty(ell(), 1.6)
        for (const rp of v.ripples) if (rp.field === i) g.line(ell(1 + rp.t * 1.6), rp.color, 1.2, 1 - rp.t / 0.45)
        for (let d = 0; d < per; d++) {
          const j = i * per + d
          if (j >= n) break
          const s = noteSlot(look, j), px = Math.cos(s.a) * s.r * R, py = Math.sin(s.a) * s.r * R, l = lit(j), isNext = j === top && !reloading
          if (l >= 1) g.dot(px, py, isNext ? 1.6 : 1.1, isNext ? nx : base, sw(j))
          else if (l > 0) g.dot(px, py, 1.1 * l, base, 0.8)
          else g.hole(px, py, 0.9)
        }
      }
    } break
    case "cards": {
      const home = (j: number) => !f.away.includes(j)
      let nextCard = -1
      for (let j = 0; j < n; j++) if (home(j)) { nextCard = j; break }
      for (let j = 0; j < n; j++) {
        const s = noteSlot(look, j), isNext = j === nextCard, r = (isNext ? 1.12 : 1) * R
        const special = SPECIAL_CARDS.includes(j)
        // the 7 and the Ace burst on their own: a little shake and an extra glow while they are in the deck
        const jx = special ? Math.sin(v.t * 47 + j) * 0.9 : 0, jy = special ? Math.cos(v.t * 53 + j * 2) * 0.9 : 0, jr = special ? Math.sin(v.t * 41 + j) * 0.09 : 0
        const px = Math.cos(s.a) * r + jx, py = Math.sin(s.a) * r + jy, w = 0.13 * R, h = 0.2 * R
        const rect = () => { ctx.save(); ctx.translate(px, py); ctx.rotate(s.a + Math.PI / 2 + jr); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 1.5); ctx.restore() }
        if (!home(j)) { ctx.save(); ctx.setLineDash([2, 2]); g.empty(rect, 1.6); ctx.restore(); continue }
        const fl = v.flash[j] ?? 0
        if (special) {
          const pulse = 0.55 + 0.45 * Math.sin(v.t * 7 + j)
          g.line(rect, "#ffffff", 5, 0.18 + 0.2 * pulse)
          g.dot(px, py, 1.6, "#ffffff", 0.5 + 0.5 * pulse)
        }
        g.line(rect, isNext && look.deg ? nx : base, isNext || special ? 1.7 : 1.2, fl > 0 || special || isNext ? 1 : 0.8)
        if (fl > 0) g.dot(px, py, 2.5 * fl / 0.35, "#ffffff", fl / 0.35)
      }
    } break
    case "wings": for (let j = 0; j < n; j++) {
      const s = noteSlot(look, j), away = j < f.out, charging = !away && j === f.out && f.charge > 0, ch = charging ? f.charge : 0
      const r = (s.r + 0.12 * ch) * R, path = g.arc(r, s.a0, s.a1)
      if (away) { ctx.save(); ctx.setLineDash([2.5, 2.5]); g.empty(path, 3.5); ctx.restore(); const u = (v.t * 0.7) % 1, a = s.a + u * TAU; g.dot(Math.cos(s.a) * 0.55 * R + Math.cos(a) * 0.28 * R, Math.sin(a) * 0.2 * R, 1.3, base, 0.9) }
      else g.line(path, (v.flash[j] ?? 0) > 0 ? "#ffffff" : base, 3.5 + 2 * ch)
    } break
    case "coil": {
      const sp = f.special ?? 0, full = sp * n
      for (let j = 0; j < n; j++) {
        const s = noteSlot(look, j), l = Math.max(0, Math.min(1, full - j))
        g.empty(g.arc(s.r * R, s.a0, s.a1), 3)
        if (l > 0) g.line(g.arc(s.r * R, s.a0, s.a0 + (s.a1 - s.a0) * l), l >= 1 && sp >= 1 ? "#ffffff" : base, 3, l >= 1 ? 1 : 0.75)
      }
      if (sp >= 1) {
        // ready: sparks run between the segments (the Cajado's longer, like its bolts)
        const len = base === "#ffd36b" ? 1.8 : 0.9, seed = Math.floor(v.t / 0.06)
        for (let z = 0; z < 2; z++) {
          const a = ((Math.sin(seed * 12.9898 + z * 78.233) * 43758.5453) % 1 + 1) % 1 * TAU
          g.line(() => { ctx.beginPath(); for (let q = 0; q <= 6; q++) { const t = a + (q / 6) * len, r = (0.88 + (q % 2 ? 0.12 : -0.1) * (q && q < 6 ? 1 : 0)) * R, px = Math.cos(t) * r, py = Math.sin(t) * r; if (q) ctx.lineTo(px, py); else ctx.moveTo(px, py) } }, base, 1, 0.9)
        }
      }
      // inner ring: the hammer in her wing (solid), thrown (dashed, turning) or the strong blow's charge (the Cajado)
      if (f.out > 0) { ctx.save(); ctx.setLineDash([3, 3]); ctx.lineDashOffset = -v.t * 30; g.line(g.arc(0.52 * R, 0, TAU), base, 1.2, 0.6); ctx.restore() }
      else if (f.charge > 0) g.line(g.arc(0.52 * R, -Math.PI / 2, -Math.PI / 2 + TAU * f.charge), f.charge >= 1 ? "#ffffff" : base, 2)
    } break
    case "links": if (f.charge > 0) {
      const vis = Math.min(1, f.charge * 4)
      for (let j = 0; j < n; j++) {
        const a = f.spin + j * TAU / n, px = Math.cos(a) * 0.86 * R, py = Math.sin(a) * 0.86 * R, on = j < Math.ceil(f.charge * n)
        const ell = () => { ctx.beginPath(); ctx.ellipse(px, py, j % 2 ? 2.2 : 3.4, j % 2 ? 3.4 : 2.2, a, 0, TAU) }
        if (on) g.line(ell, base, 1.3, vis); else g.empty(ell, 1.3)
      }
      if (f.charge >= 1) g.dot(0, -1.08 * R, 2.4, "#ff8a2a")
    } break
  }
  // Carga em glissando: the arpeggio's notes in a row over the horizon; each one the dragged aim plays goes out
  if (f.gliss) for (let j = 0; j < f.gliss.max; j++) {
    const s = glissSlot(j, f.gliss.max), px = s.x * R, py = s.y * R
    if (j < f.gliss.spent) g.hole(px, py, 1.6)
    else { const isNext = j === f.gliss.spent && f.charge > 0; g.dot(px, py, isNext ? 2.6 : 2, isNext ? nx : base) }
  }
  ctx.restore()

  function drawPulse() {
    // the Granada: never runs out, so only the charge growing round the reticle and the cadence fading after a throw
    for (let j = 0; j < n; j++) {
      const s = noteSlot(look!, j)
      if (f!.charge > 0) { const l = Math.max(0, Math.min(1, f!.charge * n - j)); if (l > 0) g.line(g.ray(s.a, s.r0 * R, (s.r0 + (s.r1 - s.r0) * l) * R), base, 2.2); else g.empty(g.ray(s.a, s.r0 * R, (s.r0 + 0.1) * R), 2.2) }
      else if (f!.cadence > 0 && j / n < f!.cadence) g.line(g.ray(s.a, s.r0 * R, s.r1 * R), base, 2.2, 0.55)
    }
  }
}

/** What floats off the ring (in the ring's units round where it was drawn). */
export function drawNoteBits(ctx: CanvasRenderingContext2D, v: NoteView, x: number, y: number, R: number) {
  if (!v.bits.length) return
  const g = neon(ctx)
  ctx.save(); ctx.translate(x, y)
  for (const b of v.bits) {
    const al = bitAlpha(b), px = b.x * R, py = b.y * R, s = b.size * (1 + b.t * 0.8)
    if (b.kind === "dot") g.dot(px, py, s * 1.4, b.color, al)
    else if (b.kind === "ring") g.line(() => { ctx.beginPath(); ctx.arc(px, py, (b.size + b.t * b.grow) * R, 0, TAU) }, b.color, 1.2, al * 0.8)
    else if (b.kind === "card") { const w = 0.13 * R, h = 0.2 * R; g.line(() => { ctx.save(); ctx.translate(px, py); ctx.rotate(b.a); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 1.5); ctx.restore() }, b.color, 1.4, al) }
    else { const l = b.len * R / 2, c = Math.cos(b.a), sn = Math.sin(b.a); g.line(() => { ctx.beginPath(); ctx.moveTo(px - c * l, py - sn * l); ctx.lineTo(px + c * l, py + sn * l) }, b.color, b.w, al) }
  }
  ctx.restore()
}
