// Drawing of the Templo do Gongo (canvas, screen pixels): its aliens, the gong totem, bombs and fire, and the HUD
// (hearts, score, the rhythm "pista" with the beats coming, the judgement of each press and the stage banners).
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { ALIEN_FRAMES } from "@/lib/pigchicken/enemies"
import { lookDir, lookRows, type Point } from "@/lib/pigchicken/eyes"
import type { Combat } from "@/lib/pigchicken/combat"
import type { Conductor } from "@/lib/pigchicken/music"
import { SPECIES, STAGES, drumOpen, multOf, type Species, type Temple } from "@/lib/pigchicken/temple"
import { stageWidth } from "@/lib/stage-size"

type Ctx = CanvasRenderingContext2D
type Target = Combat["targets"][number]

// original pixel art, 4 px a pixel. Each letter is a colour of the palette below; '.' is empty.
const P = 4
const ART: Partial<Record<Species, { frames: string[][]; pal: Record<string, string> }>> = {
  lantern: {
    pal: { g: "#ffd166", r: "#e63946", R: "#9d0208", w: "#fff4e0", o: "#1a0a0a", y: "#ffb703" },
    frames: [[
      "....gggg....",
      "..gggggggg..",
      ".rrRrrrrRrr.",
      "rrRrrrrrrRrr",
      "rRrrwwwwrrRr",
      "rRrwwoowwrRr",
      "rRrrwwwwrrRr",
      "rrRrrrrrrRrr",
      ".rrRrrrrRrr.",
      "..gggggggg..",
      "....gggg....",
      ".....yy.....",
      "....y..y....",
    ], [
      "....gggg....",
      "..gggggggg..",
      ".rrRrrrrRrr.",
      "rrRrrrrrrRrr",
      "rRrrwwwwrrRr",
      "rRrwoowwwrRr",
      "rRrrwwwwrrRr",
      "rrRrrrrrrRrr",
      ".rrRrrrrRrr.",
      "..gggggggg..",
      "....gggg....",
      "......yy....",
      ".....y..y...",
    ]],
  },
  shell: {
    pal: { s: "#6a994e", S: "#386641", b: "#a7c957", w: "#f4f1e8", o: "#101018" },
    frames: [[
      ".....ssss.....",
      "...ssSssSss...",
      "..sSssssssSs..",
      ".ssSssSSssSss.",
      "sSssssSSssssSs",
      "SSSSSSSSSSSSSS",
      ".bbwwbbbbwwbb.",
      ".bbwobbbbwobb.",
      "..b.b....b.b..",
      ".b..b....b..b.",
    ], [
      ".....ssss.....",
      "...ssSssSss...",
      "..sSssssssSs..",
      ".ssSssSSssSss.",
      "sSssssSSssssSs",
      "SSSSSSSSSSSSSS",
      ".bbwwbbbbwwbb.",
      ".bbowbbbbowbb.",
      "..b..b..b..b..",
      "..b..b..b..b..",
    ]],
  },
  twin: {
    pal: { "#": "#4cc9f0", x: "#f72585", w: "#f4f1e8", o: "#101018" },
    frames: [[
      ".####....xxxx.",
      "######..xxxxxx",
      "#ww###..xxxwwx",
      "#wo###..xxxowx",
      "######xxxxxxxx",
      ".#####xxxxxxx.",
      "..###xxxxxx...",
      "..#.#.x.x.x...",
      ".#..#.x..x.x..",
    ], [
      ".####....xxxx.",
      "######..xxxxxx",
      "#ww###..xxxwwx",
      "#ow###..xxxwox",
      "######xxxxxxxx",
      ".#####xxxxxxx.",
      "..###xxxxxx...",
      "..#.#.x.x.x...",
      "..#.#..x.x.x..",
    ]],
  },
  mini: {
    pal: { "#": "#f72585", w: "#f4f1e8", o: "#101018" },
    frames: [[
      "..####..",
      ".######.",
      "#wo##wo#",
      "########",
      ".#.##.#.",
      "#......#",
    ], [
      "..####..",
      ".######.",
      "#ow##ow#",
      "########",
      ".#.##.#.",
      ".#....#.",
    ]],
  },
  drum: {
    pal: { L: "#e9c46a", r: "#c1121f", g: "#ffd166", w: "#fff4e0", o: "#101018" },
    // closed, then open (on the beat: the lid lifts and the eye shows)
    frames: [[
      "............",
      ".LLLLLLLLLL.",
      "LLLLLLLLLLLL",
      "rgrrrrrrrrgr",
      "rrrrrrrrrrrr",
      "rgrrrrrrrrgr",
      "rrrrrrrrrrrr",
      "rgrrrrrrrrgr",
      ".LLLLLLLLLL.",
      "..r......r..",
      ".r........r.",
    ], [
      ".LLLLLLLLLL.",
      "LLLLLLLLLLLL",
      "............",
      "rgrwwwwwwrgr",
      "rrrwwoowwrrr",
      "rgrwwwwwwrgr",
      "rrrrrrrrrrrr",
      "rgrrrrrrrrgr",
      ".LLLLLLLLLL.",
      "..r......r..",
      ".r........r.",
    ]],
  },
}

// a colour mixed toward white (k > 0) or black (k < 0)
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), to = k > 0 ? 255 : 0, a = Math.abs(k)
  const ch = (v: number) => Math.round(v + (to - v) * a)
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`
}
// a variation of another colour: its body's pixels take it (a darker and a lighter shade where the art has them)
function bodyTint(sp: Species, color: string): ((ch: string) => string | null) | undefined {
  if (!/^#[0-9a-f]{6}$/i.test(color) || color.toLowerCase() === SPECIES[sp].color.toLowerCase()) return undefined
  const map: Record<string, string> =
    sp === "lantern" ? { r: color, R: shade(color, -0.45) }
      : sp === "shell" ? { s: color, S: shade(color, -0.4), b: shade(color, 0.35) }
        : sp === "twin" ? { "#": color }
          : sp === "drum" ? { r: color }
            : {}
  return ch => map[ch] ?? null
}

function pixels(ctx: Ctx, rows: string[], pal: Record<string, string>, left: number, top: number, flash: string | null, tint?: (ch: string) => string | null) {
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      if (ch === ".") continue
      ctx.fillStyle = flash ?? tint?.(ch) ?? pal[ch] ?? "#ffffff"
      ctx.fillRect(left + c * P, top + r * P, P, P)
    }
  })
}

// a temple alien at screen x (its target's y is its bottom). charge: about to drop a bomb (glows red)
// lookAt: the character it looks at (world coordinates; its eyes follow them)
export function drawTempleAlien(ctx: Ctx, g: Target, x: number, beatPhase: number, charge: number, beat: number, lookAt: Point | null = null) {
  // a variation of the catalogue can be bigger or smaller: its art scaled from its feet
  const size = (g.data as { size?: number }).size ?? 1
  if (size !== 1 && size > 0) {
    ctx.save(); ctx.translate(x, g.y); ctx.scale(size, size); ctx.translate(-x, -g.y)
    drawTempleAlien(ctx, { ...g, w: g.w / size, h: g.h / size, data: { ...(g.data as object), size: 1 } }, x, beatPhase, charge, beat, lookAt)
    ctx.restore()
    return
  }
  const d = g.data as { species: Species; color: string }
  const sp = d.species
  const top = g.y - g.h
  const look = lookDir({ x: g.x, y: g.y - g.h / 2 }, lookAt)
  ctx.save()
  if (g.deadT > 0) ctx.globalAlpha = Math.max(0, g.deadT / 0.35) * 0.6
  // a dark halo behind it, so it reads against the temple's roofs and walls
  {
    const cy = g.y - g.h / 2, r = Math.max(g.w, g.h) * 0.85
    const halo = ctx.createRadialGradient(x, cy, r * 0.3, x, cy, r)
    halo.addColorStop(0, "rgba(8,8,20,0.6)"); halo.addColorStop(1, "rgba(8,8,20,0)")
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill()
  }
  // the bomb's warning: a red glow pulsing under it
  if (charge > 0.3 && g.deadT <= 0) {
    const r = g.w * (0.7 + 0.15 * Math.sin(performance.now() / 50))
    const grad = ctx.createRadialGradient(x, g.y - g.h / 2, 2, x, g.y - g.h / 2, r)
    grad.addColorStop(0, `rgba(255,77,109,${0.55 * charge})`); grad.addColorStop(1, "rgba(255,77,109,0)")
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, g.y - g.h / 2, r, 0, Math.PI * 2); ctx.fill()
  }
  const flash = g.flash > 0 ? (g.tint ?? "#ffffff") : null
  if (sp === "dragon" || sp === "dragonHead") { drawDragon(ctx, g, x, flash, look); ctx.restore(); return }
  // the stomp: a squash on each beat
  const squash = 1 - 0.1 * Math.pow(1 - beatPhase, 5)
  ctx.translate(x, g.y); ctx.scale(2 - squash, squash); ctx.translate(-x, -g.y)
  const frame = Math.floor(beat) % 2
  if (sp === "jelly") {
    const rows = lookRows(ALIEN_FRAMES[frame], look)
    pixels(ctx, rows, { "#": d.color, w: "#f4f1e8", o: "#101018" }, x - g.w / 2, top, flash)
  } else if (sp === "drum") {
    const open = drumOpen(beatPhase)
    if (open && !flash) { ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 16 }
    pixels(ctx, lookRows(ART.drum!.frames[open ? 1 : 0], look), ART.drum!.pal, x - g.w / 2, top, flash, bodyTint(sp, d.color))
    ctx.shadowBlur = 0
  } else {
    const art = ART[sp]!
    const tint = sp === "mini" ? (ch: string) => (ch === "#" ? d.color : null) : bodyTint(sp, d.color)
    pixels(ctx, lookRows(art.frames[frame], look), art.pal, x - g.w / 2, top, flash, tint)
    // the shell cracks as it loses hit points
    if (sp === "shell" && !flash) {
      const k = g.hp / g.maxHp
      ctx.strokeStyle = "#1b2b12"; ctx.lineWidth = 2
      if (k < 0.7) { ctx.beginPath(); ctx.moveTo(x - 10, top + 2); ctx.lineTo(x - 4, top + 10); ctx.lineTo(x - 12, top + 16); ctx.stroke() }
      if (k < 0.4) { ctx.beginPath(); ctx.moveTo(x + 8, top + 4); ctx.lineTo(x + 14, top + 12); ctx.lineTo(x + 6, top + 20); ctx.lineTo(x + 16, top + 22); ctx.stroke() }
    }
  }
  ctx.restore()
  // hit points of the tough ones
  if (g.deadT <= 0 && (sp === "shell" || sp === "drum") && g.hp < g.maxHp) {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 20, top - 8, 40, 4)
    ctx.fillStyle = "#ffd166"; ctx.fillRect(x - 20, top - 8, 40 * Math.max(0, g.hp / g.maxHp), 4)
  }
}

// the dragon: round golden segments with a red crest; the head with horns, whiskers and a fiery mane
function drawDragon(ctx: Ctx, g: Target, x: number, flash: string | null, look: Point | null) {
  const cy = g.y - g.h / 2, t = performance.now() / 1000
  const head = (g.data as { species: Species }).species === "dragonHead"
  ctx.save()
  ctx.translate(x, cy)
  ctx.scale(g.face < 0 ? -1 : 1, 1)
  if (!head) {
    const r = g.w / 2
    // a variation of another colour tints its body
    const own = (g.data as { color?: string }).color
    const tinted = own && /^#[0-9a-f]{6}$/i.test(own) && own.toLowerCase() !== SPECIES.dragon.color ? own : null
    // crest
    ctx.fillStyle = flash ?? (tinted ? shade(tinted, -0.35) : "#d62828")
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.6); ctx.lineTo(-r * 0.3, -r * 1.45); ctx.lineTo(0, -r * 0.8); ctx.lineTo(r * 0.35, -r * 1.35); ctx.lineTo(r * 0.8, -r * 0.6); ctx.fill()
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r)
    grad.addColorStop(0, flash ?? (tinted ? shade(tinted, 0.55) : "#ffe08a")); grad.addColorStop(1, flash ?? (tinted ?? "#e85d04"))
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
    // scales
    if (!flash) {
      ctx.strokeStyle = "rgba(157,2,8,0.55)"; ctx.lineWidth = 2
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * r * 0.45, r * 0.15, r * 0.32, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke() }
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.7, r * 0.3, 0, 0, Math.PI); ctx.fill()
    }
  } else {
    const shielded = (g.shield ?? 0) >= 1
    // mane: flames behind the head
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.55 + i * 0.16), len = 40 + Math.sin(t * 9 + i) * 8
      ctx.fillStyle = flash ?? (i % 2 ? "#d62828" : "#ff6b35")
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-14 + Math.cos(a) * len - 8, Math.sin(a) * len * 0.8); ctx.lineTo(-14 + Math.cos(a + 0.2) * len * 0.6, Math.sin(a + 0.2) * len * 0.6); ctx.fill()
    }
    // horns
    ctx.strokeStyle = flash ?? "#ffe8a3"; ctx.lineWidth = 5; ctx.lineCap = "round"
    ctx.beginPath(); ctx.moveTo(-6, -20); ctx.quadraticCurveTo(-20, -46, -40, -50); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(4, -22); ctx.quadraticCurveTo(-4, -50, -20, -60); ctx.stroke()
    // head and snout
    const grad = ctx.createLinearGradient(0, -30, 0, 30)
    grad.addColorStop(0, flash ?? "#ffd166"); grad.addColorStop(1, flash ?? "#e85d04")
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 26, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(30, 6, 26, 15, 0.1, 0, Math.PI * 2); ctx.fill()
    // the jaw opens with the beat of its fire
    const open = 4 + Math.max(0, Math.sin(t * 6)) * 8
    ctx.fillStyle = flash ?? "#9d0208"; ctx.beginPath(); ctx.ellipse(32, 18 + open / 2, 22, 6 + open / 2, 0.15, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#fff4e0"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(18 + i * 9, 16); ctx.lineTo(22 + i * 9, 22); ctx.lineTo(26 + i * 9, 16); ctx.fill() }
    // eye
    ctx.fillStyle = "#fff4e0"; ctx.beginPath(); ctx.ellipse(10, -8, 9, 7, 0, 0, Math.PI * 2); ctx.fill()
    // the pupil looks at her (mirrored with the head); straight ahead when there is no one
    const lx = look ? look.x * (g.face < 0 ? -1 : 1) * 4 : 3, ly = look ? look.y * 2.5 : 0
    ctx.fillStyle = "#d00000"; ctx.beginPath(); ctx.arc(10 + lx, -8 + ly, 4, 0, Math.PI * 2); ctx.fill()
    // whiskers
    ctx.strokeStyle = flash ?? "#ffe8a3"; ctx.lineWidth = 2.5
    ;[-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(48, 2 + k * 4); for (let s = 0; s <= 50; s += 5) ctx.lineTo(48 + s, 2 + k * 4 + Math.sin(s * 0.12 + t * 5 + k) * 7 + k * s * 0.15); ctx.stroke() })
    // while its body is there, the head sits in a golden bubble
    if (shielded) {
      ctx.strokeStyle = `rgba(255,209,102,${0.45 + 0.2 * Math.sin(t * 5)})`; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(10, 0, 58, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = "rgba(255,209,102,0.08)"; ctx.fill()
    }
  }
  ctx.restore()
  if (head && g.deadT <= 0 && (g.shield ?? 0) < 1) {
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - 50, g.y - g.h - 26, 100, 6)
    ctx.fillStyle = "#ff6b35"; ctx.fillRect(x - 50, g.y - g.h - 26, 100 * Math.max(0, g.hp / g.maxHp), 6)
  }
}

// the gong totem: a lacquered frame with golden caps and a bronze gong that swings after each strike
export function drawGong(ctx: Ctx, g: Target, x: number, temple: Temple) {
  const s = temple.state, t = performance.now() / 1000
  const ground = g.y + 40, cy = g.y - 72, R = 58
  const waiting = s.phase === "idle" || s.phase === "cleared" || s.phase === "failed" || s.phase === "victory"
  // the frame
  ctx.fillStyle = "#8d1b14"
  ctx.fillRect(x - 88, ground - 220, 14, 220); ctx.fillRect(x + 74, ground - 220, 14, 220)
  ctx.fillStyle = "#5c120d"; ctx.fillRect(x - 96, ground - 14, 30, 14); ctx.fillRect(x + 66, ground - 14, 30, 14)
  ctx.fillStyle = "#b3261e"
  ctx.beginPath(); ctx.moveTo(x - 112, ground - 226); ctx.quadraticCurveTo(x - 100, ground - 222, x - 92, ground - 232); ctx.lineTo(x + 92, ground - 232); ctx.quadraticCurveTo(x + 100, ground - 222, x + 112, ground - 226); ctx.lineTo(x + 104, ground - 214); ctx.lineTo(x - 104, ground - 214); ctx.fill()
  ctx.fillStyle = "#ffd166"; [-81, 81].forEach(k => { ctx.beginPath(); ctx.arc(x + k, ground - 238, 7, 0, Math.PI * 2); ctx.fill() })
  ctx.fillRect(x - 92, ground - 216, 184, 3)
  // swinging after the strike
  const k = s.gongRing
  const swing = Math.sin(k * 13) * Math.exp(-k * 2.6) * 0.16
  ctx.save()
  ctx.translate(x, ground - 214); ctx.rotate(swing); ctx.translate(-x, -(ground - 214))
  ctx.strokeStyle = "#c9a46a"; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x - 30, ground - 214); ctx.lineTo(x - 22, cy - R + 6); ctx.moveTo(x + 30, ground - 214); ctx.lineTo(x + 22, cy - R + 6); ctx.stroke()
  // a waiting gong breathes with a warm glow
  if (waiting) { ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 18 + 10 * Math.sin(t * 3) }
  const grad = ctx.createRadialGradient(x - 18, cy - 18, 4, x, cy, R)
  grad.addColorStop(0, g.flash > 0 ? "#fff1c1" : "#f2c46d"); grad.addColorStop(0.55, "#c58b2e"); grad.addColorStop(1, "#7a4f12")
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, cy, R, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = "rgba(90,55,10,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, cy, R - 6, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = "rgba(255,230,160,0.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, cy, R * 0.62, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = "#e3a82b"; ctx.beginPath(); ctx.arc(x, cy, 15, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(x - 4, cy - 5, 5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // the ring of the strike: light opening out
  if (k < 0.9) {
    const p = k / 0.9
    ctx.strokeStyle = `rgba(255,209,102,${0.8 * (1 - p)})`; ctx.lineWidth = 4 * (1 - p) + 1
    ctx.beginPath(); ctx.arc(x, cy, R + p * 160, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(x, cy, R + p * 90, 0, Math.PI * 2); ctx.stroke()
  }
  // how many strikes so far: little lamps over the frame
  if (waiting) {
    for (let i = 0; i < s.gongNeed; i++) {
      const lx = x + (i - (s.gongNeed - 1) / 2) * 22, ly = ground - 264
      ctx.fillStyle = i < s.gongHits ? "#ffd166" : "rgba(255,255,255,0.18)"
      ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill()
    }
    const label = s.phase === "idle" ? "BATA NO GONGO" : s.phase === "cleared" ? `FASE ${s.stage + 2}: BATA NO GONGO` : s.phase === "failed" ? "TENTAR DE NOVO" : "JOGAR DE NOVO"
    // the label rests right on top of the frame's top beam, between its two gold knobs
    ctx.font = "bold 12px ui-monospace, monospace"; ctx.textAlign = "center"
    const w = Math.min(148, ctx.measureText(label).width + 14)
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - w / 2, ground - 252, w, 18)
    ctx.fillStyle = "#ffd166"; ctx.fillText(label, x, ground - 239, w - 10)
  }
}

// the reset stone (Recomeçar): a carved stele on a little plinth; it glows teal when there is a game to end
export function drawResetStone(ctx: Ctx, g: Target, x: number, temple: Temple) {
  const s = temple.state, t = performance.now() / 1000
  const ground = g.y + 4
  const live = s.phase !== "idle" || s.score > 0
  const k = s.resetRing, shake = k < 0.3 ? Math.sin(k * 60) * 3 * (1 - k / 0.3) : 0
  ctx.save()
  ctx.translate(shake, 0)
  // the plinth
  ctx.fillStyle = "#6f695f"; ctx.fillRect(x - 46, ground - 14, 92, 14)
  ctx.fillStyle = "#8e877b"; ctx.fillRect(x - 40, ground - 20, 80, 8)
  // the stele, rounded on top
  const grad = ctx.createLinearGradient(x - 34, 0, x + 34, 0)
  grad.addColorStop(0, "#5b6670"); grad.addColorStop(0.5, g.flash > 0 ? "#c9e6ee" : "#8a98a3"); grad.addColorStop(1, "#4a545c")
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.moveTo(x - 32, ground - 20); ctx.lineTo(x - 32, ground - 96); ctx.quadraticCurveTo(x, ground - 124, x + 32, ground - 96); ctx.lineTo(x + 32, ground - 20); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = "rgba(20,24,28,0.6)"; ctx.lineWidth = 2; ctx.stroke()
  // the carving: a circular arrow, lit when it can reset
  if (live) { ctx.shadowColor = "#7bdff2"; ctx.shadowBlur = 10 + 6 * Math.sin(t * 3) }
  ctx.strokeStyle = live ? "#7bdff2" : "rgba(255,255,255,0.35)"; ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(x, ground - 66, 16, -Math.PI * 0.3, Math.PI * 1.45); ctx.stroke()
  ctx.fillStyle = ctx.strokeStyle
  const ax = x + 16 * Math.cos(-Math.PI * 0.3), ay = ground - 66 + 16 * Math.sin(-Math.PI * 0.3)
  ctx.beginPath(); ctx.moveTo(ax + 8, ay - 2); ctx.lineTo(ax - 6, ay - 6); ctx.lineTo(ax, ay + 8); ctx.closePath(); ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()
  if (!live) return
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < s.resetHits ? "#7bdff2" : "rgba(255,255,255,0.18)"
    ctx.beginPath(); ctx.arc(x + (i - 1) * 18, ground - 138, 5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"
  const label = "RECOMEÇAR", w = ctx.measureText(label).width + 12
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - w / 2, ground - 166, w, 16)
  ctx.fillStyle = "#7bdff2"; ctx.fillText(label, x, ground - 154)
}

// bombs (red orbs with a white core) and the dragon's fire
export function drawTempleShots(ctx: Ctx, temple: Temple, camX: number, view: ViewRect) {
  const t = performance.now() / 1000
  temple.state.bombs.forEach(b => {
    const trailX = b.x - b.vx * 0.048, trailY = b.y - b.vy * 0.048
    if (!intersectsView({ x: Math.min(b.x, trailX) - 20, y: Math.min(b.y, trailY) - 20, w: Math.abs(b.x - trailX) + 40, h: Math.abs(b.y - trailY) + 40 }, view)) return
    const x = b.x - camX
    if (b.kind === "fire") {
      for (let i = 4; i >= 0; i--) {
        ctx.fillStyle = i === 0 ? "#fff1c1" : i < 3 ? "#ffb703" : "#e85d04"
        ctx.globalAlpha = i === 0 ? 1 : 0.5
        ctx.beginPath(); ctx.arc(x - b.vx * 0.012 * i, b.y - b.vy * 0.012 * i, 13 - i * 1.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      return
    }
    const r = 8 + Math.sin(t * 20 + b.x) * 1.5
    ctx.fillStyle = "rgba(255,77,109,0.3)"; ctx.beginPath(); ctx.arc(x, b.y, r + 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#ff4d6d"; ctx.beginPath(); ctx.arc(x, b.y, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#fff4e0"; ctx.beginPath(); ctx.arc(x, b.y, r * 0.4, 0, Math.PI * 2); ctx.fill()
  })
}

// ---------- HUD (screen) ----------
const GRADE = { perfect: { text: "PERFEITO!", color: "#ffd166" }, good: { text: "BOM", color: "#7bdff2" }, miss: { text: "fora do tempo", color: "#9aa0a8" } } as const

export function drawTempleHud(ctx: Ctx, temple: Temple, music: Conductor, inside: boolean, top: number) {
  const s = temple.state
  const W = stageWidth(), H = window.innerHeight
  const active = s.phase === "intro" || s.phase === "playing"
  // hurt: a red vignette for a moment
  if (s.hurtT < 0.45) {
    const a = 0.45 * (1 - s.hurtT / 0.45)
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7)
    grad.addColorStop(0, "rgba(255,0,40,0)"); grad.addColorStop(1, `rgba(255,0,40,${a})`)
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
  }
  if (inside || active) {
    const pw = Math.min(460, W - 32), x0 = Math.round((W - pw) / 2), y0 = top
    ctx.save()
    // the top line: hearts, the stage and the score
    ctx.font = "bold 18px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < s.hearts || !active ? "#ff4d6d" : "rgba(255,255,255,0.2)"
      if (s.invuln > 0 && i === s.hearts && Math.floor(s.invuln * 10) % 2 === 0) ctx.fillStyle = "#ffffff"
      ctx.fillText("♥", x0 + i * 20, y0 + 10)
    }
    ctx.font = "bold 12px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#ffd166"
    const stageName = s.phase === "idle" ? "TEMPLO DO GONGO" : `FASE ${s.stage + 1}/${STAGES.length} · ${STAGES[s.stage].name.toUpperCase()}`
    ctx.fillText(stageName, W / 2, y0 + 10)
    ctx.textAlign = "right"; ctx.fillStyle = "#ffffff"
    ctx.fillText(`${s.score.toLocaleString("pt-BR")} pts`, x0 + pw, y0 + 10)
    // the pista: beats slide in from the right to the ring; red ones drop bombs; pressing fire on the ring scores
    const ly = y0 + 40, ringX = x0 + 26, perBeat = (pw - 46) / 4
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(x0, ly - 18, pw, 36, 18); ctx.fill()
    ctx.strokeStyle = "rgba(255,209,102,0.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ringX, ly); ctx.lineTo(x0 + pw - 10, ly); ctx.stroke()
    const beat = music.beat
    for (let k = Math.floor(beat); k <= beat + 4.2; k++) {
      const dx = (k - beat) * perBeat
      if (dx < -6) continue
      const bx = ringX + dx, bar = k % 4 === 0, drop = active && temple.isDropBeat(k)
      ctx.globalAlpha = Math.min(1, (pw - 10 - dx) / 40, 1 + dx / 6)
      ctx.fillStyle = drop ? "#ff4d6d" : bar ? "#ffd166" : "#e9e4d0"
      ctx.beginPath(); ctx.arc(bx, ly, bar ? 9 : 6.5, 0, Math.PI * 2); ctx.fill()
      if (drop) { ctx.fillStyle = "#fff4e0"; ctx.beginPath(); ctx.arc(bx, ly, 2.5, 0, Math.PI * 2); ctx.fill() }
    }
    ctx.globalAlpha = 1
    const pulse = Math.pow(1 - music.beatPhase, 4)
    const j = s.judge
    ctx.strokeStyle = j && j.t < 0.25 ? GRADE[j.grade].color : "#ffffff"
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ringX, ly, 12 + pulse * 4, 0, Math.PI * 2); ctx.stroke()
    // combo and multiplier
    ctx.font = "bold 12px ui-monospace, monospace"; ctx.textAlign = "right"
    if (active && s.combo > 0) { ctx.fillStyle = multOf(s.combo) > 1 ? "#ffd166" : "#c9ced6"; ctx.fillText(`combo ${s.combo}${multOf(s.combo) > 1 ? ` · ×${multOf(s.combo)}` : ""}`, x0 + pw, ly + 30) }
    // what the pista is for, until the first stage is under way
    if (s.phase === "idle" || s.phase === "intro" || (s.phase === "playing" && s.stage === 0 && s.t < 10)) {
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(244,241,232,0.85)"
      ctx.fillText(W < 700 ? "Atire quando a bolinha chegar no anel · vermelhas = bombas" : "Ritmo: atire quando a bolinha chegar no anel (PERFEITO soma combo e multiplica os pontos). Vermelhas = bombas.", W / 2, ly + 48)
    }
    // the judgement of the last press, popping over the ring
    if (j) {
      const k = j.t / 0.6
      ctx.globalAlpha = 1 - k; ctx.textAlign = "left"
      ctx.font = `bold ${j.grade === "perfect" ? 16 : 13}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillStyle = "#000"; ctx.fillText(GRADE[j.grade].text, ringX - 10 + 1, ly + 30 - k * 8 + 1)
      ctx.fillStyle = GRADE[j.grade].color; ctx.fillText(GRADE[j.grade].text, ringX - 10, ly + 30 - k * 8)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
  // the stage's banner: the title, then what is new
  if (s.banner) drawBanner(ctx, s.banner, top)
}

// a banner in the middle of the screen: the title, then what is new
export function drawBanner(ctx: Ctx, b: { title: string; sub: string; color: string; t: number; life: number }, top: number) {
  const W = stageWidth(), H = window.innerHeight
  const a = Math.min(1, b.t * 4, (b.life - b.t) * 2)
  const grow = 1 + 0.25 * Math.max(0, 1 - b.t * 5)
  ctx.save()
  ctx.globalAlpha = Math.max(0, a)
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  const cx = W / 2, cy = Math.max(top + 120, H * 0.36)
  const maxW = Math.min(560, W - 40)
  ctx.font = "15px ui-sans-serif, system-ui, sans-serif"
  const lines = wrap(ctx, b.sub, maxW - 40)
  const h = 64 + lines.length * 20
  ctx.fillStyle = "rgba(10,8,6,0.72)"; ctx.beginPath(); ctx.roundRect(cx - maxW / 2, cy - 40, maxW, h, 14); ctx.fill()
  ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.stroke()
  ctx.save(); ctx.translate(cx, cy - 10); ctx.scale(grow, grow)
  ctx.font = "bold 30px ui-sans-serif, system-ui, sans-serif"
  ctx.shadowColor = b.color; ctx.shadowBlur = 16; ctx.fillStyle = b.color; ctx.fillText(b.title, 0, 0)
  ctx.restore()
  ctx.font = "15px ui-sans-serif, system-ui, sans-serif"; ctx.fillStyle = "#f4f1e8"
  lines.forEach((l, i) => ctx.fillText(l, cx, cy + 28 + i * 20))
  ctx.restore()
}

function wrap(ctx: Ctx, text: string, maxW: number) {
  const out: string[] = []
  let line = ""
  text.split(" ").forEach(w => {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxW && line) { out.push(line); line = w } else line = next
  })
  if (line) out.push(line)
  return out
}
