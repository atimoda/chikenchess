// The scale Bateria (lib/pigchicken/drum-kit.ts) around a player sitting at the kit, and the same chart in the
// kit's editor: one big round button per piece, where the kit's setup puts it. The drums are discs with a rim, the
// cymbals thin discs with their bell in the middle; the ones behind (Ataque, China) are drawn first, under the
// others. A piece just hit lights up and throws a ring; the Chimbal shows how far its pedal is open as an arc
// around it; each drumstick is a small ring where it is; a knock between the pieces leaves a small ring that fades.
import { t } from "@/lib/i18n"
import { DRUM_IDS, drumChartFrame, drumPiece, type DrumKit, type DrumPiece } from "@/lib/pigchicken/drum-kit"

function hexA(hex: string, a: number) {
  const v = parseInt(hex.slice(1, 7), 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Math.max(0, Math.min(1, a))})`
}

export type DrumChartLook = {
  alpha: number; lines: number
  // how long ago (s) and how hard a piece was hit (null: never)
  pulse?: (piece: DrumPiece) => { age: number; vel: number } | null
  sticks?: ({ x: number; y: number } | null)[]
  open?: number // the Chimbal's pedal (0 closed … 1 open)
  knocks?: { x: number; y: number; age: number }[] // the knocks between the pieces: where and how long ago (s)
  selected?: DrumPiece | null // the editor's selection
  hint?: (piece: DrumPiece) => string // the piece's shortcuts, small under its name
}

// the part of the screen the chart may use, in the chart's units (the page says it every frame; null: unknown)
let screen: { l: number; t: number; r: number; b: number } | null = null
export const setDrumScreen = (s: { l: number; t: number; r: number; b: number } | null) => { screen = s }
/**
 * Where the chart goes for a player whose shoulder is at (x, y): its middle and radius, by the kit's own framing
 * (lib/pigchicken/drum-kit.ts, `drumChartFrame`). `unit`: the radius of a chart of size 1 for her.
 */
export const drumFrame = (kit: DrumKit, x: number, y: number, unit: number) => drumChartFrame(kit, x, y, unit, screen)
/** That part of the screen (the Estrela sitting at the Piano de cauda fits in it too). */
export const drumScreen = () => screen

/** The chart centred at (cx, cy) with radius rOut (screen units). */
export function drawDrumChart(ctx: CanvasRenderingContext2D, kit: DrumKit, cx: number, cy: number, rOut: number, look: DrumChartLook) {
  const { alpha, lines } = look
  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  const order = [...kit.pads].sort((a, b) => Number(b.back) - Number(a.back) || b.r - a.r)
  for (const p of order) {
    const info = drumPiece(p.piece), x = cx + p.x * rOut, y = cy + p.y * rOut, r = p.r * rOut
    const hit = look.pulse?.(p.piece) ?? null
    const glow = hit && hit.age >= 0 && hit.age < 0.5 ? Math.exp(-hit.age * 9) * (0.4 + 0.6 * hit.vel) : 0
    const dim = p.back ? 0.6 : 1, sel = look.selected === p.piece
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = hexA(info.color, alpha * dim * (0.24 + 0.5 * glow))
    ctx.fill()
    if (lines > 0 || sel) {
      ctx.lineWidth = sel ? 2.5 : info.cymbal ? 1 : 2
      ctx.strokeStyle = hexA(sel ? "#ffffff" : info.color, sel ? 1 : alpha * dim * (0.55 + 0.45 * glow) * Math.max(lines, 0.35))
      if (p.back) ctx.setLineDash([4, 4])
      ctx.stroke(); ctx.setLineDash([])
    }
    // a cymbal's bell, a drum's inner rim
    if (lines > 0 && p.piece !== "bell") {
      ctx.beginPath(); ctx.arc(x, y, info.cymbal ? Math.max(1.5, r * 0.12) : r * 0.82, 0, Math.PI * 2)
      ctx.lineWidth = 1; ctx.strokeStyle = hexA(info.color, alpha * dim * 0.35 * lines); ctx.stroke()
    }
    // the hit's ring, going out
    if (hit && hit.age >= 0 && hit.age < 0.35) {
      ctx.beginPath(); ctx.arc(x, y, r * (1 + hit.age * 1.1), 0, Math.PI * 2)
      ctx.lineWidth = 2; ctx.strokeStyle = hexA("#ffffff", alpha * (1 - hit.age / 0.35) * 0.7 * hit.vel); ctx.stroke()
    }
    // the Chimbal's pedal: an arc around it, longer the wider it opens
    if (p.piece === "hat" && (look.open ?? 0) > 0.02) {
      ctx.beginPath(); ctx.arc(x, y, r + Math.max(3, rOut * 0.012), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, look.open!))
      ctx.lineWidth = 2.5; ctx.strokeStyle = hexA("#ffffff", alpha * 0.9); ctx.stroke()
    }
    if (p.piece === "bell" && r < 16) continue
    const hint = look.hint?.(p.piece) ?? ""
    const font = Math.max(8, Math.min(15, r * 0.42))
    ctx.globalAlpha = Math.min(1, alpha * dim * (0.85 + glow))
    ctx.fillStyle = "#ffffff"
    ctx.font = `${glow > 0.3 ? "bold " : ""}${Math.round(font)}px monospace`
    // (a piece behind another shows its name on the part that sticks out, away from the middle)
    // and one with a smaller piece on it, the Condução under its Sino, shows it below that one)
    const inner = p.back ? null : kit.pads.find(q => q !== p && !q.back && Math.hypot(q.x - p.x, q.y - p.y) + q.r <= p.r)
    const ty = p.back ? y - r * 0.45 : inner ? cy + (inner.y + inner.r) * rOut + (y + r - (cy + (inner.y + inner.r) * rOut)) * 0.45 : hint ? y - font * 0.35 : y
    ctx.fillText(t(info.label), x, ty)
    if (hint) {
      ctx.globalAlpha = Math.min(1, alpha * dim * 0.6)
      ctx.font = `${Math.round(Math.max(7, font * 0.72))}px monospace`
      ctx.fillText(hint, x, ty + font * 0.95)
    }
    ctx.globalAlpha = 1
  }
  // a knock between the pieces: a small ring going out from where it landed
  look.knocks?.forEach(k => {
    const u = Math.min(1, k.age / 0.3)
    ctx.beginPath(); ctx.arc(cx + k.x * rOut, cy + k.y * rOut, rOut * (0.015 + 0.05 * u), 0, Math.PI * 2)
    ctx.lineWidth = 1.5; ctx.strokeStyle = hexA("#ffffff", alpha * 0.8 * (1 - u)); ctx.stroke()
  })
  look.sticks?.forEach(s => {
    if (!s) return
    ctx.beginPath(); ctx.arc(cx + s.x * rOut, cy + s.y * rOut, Math.max(3, rOut * 0.028), 0, Math.PI * 2)
    ctx.lineWidth = 1.5; ctx.strokeStyle = hexA("#ffffff", alpha * 0.9); ctx.stroke()
  })
  ctx.restore()
}

/** Every piece's shortcuts as short text ("→ RB"), the Chimbal's with its pedal's after a bar ("← LB | ↓ LT"). */
export function drumHints(kit: DrumKit, name: (token: string) => string): (piece: DrumPiece) => string {
  const of = (id: DrumPiece) => kit.binds[id].map(name).join(" ")
  const all = Object.fromEntries(DRUM_IDS.map(id => [id, of(id)])) as Record<DrumPiece, string>
  return piece => (piece === "hat" && all.hatOpen ? `${all.hat} | ${all.hatOpen}`.trim() : all[piece])
}
