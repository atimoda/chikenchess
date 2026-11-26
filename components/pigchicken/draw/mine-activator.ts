// The Ativadores de grid de campo minado (lib/pigchicken/mine-activator.ts) drawn in the world, like the Campo minado's
// icon: a dark mine with its spikes and glint on a bevelled red tile whose red glows (more as a bar fills). The music
// bar fills up the tile's left side in blue and the damage bar up its right side in red. Under its top, its grid
// options as tags (block, gap, corners), each with a little drawing of what it changes; a locked one has a gold
// padlock and no bars. While it waits ("incólume") it is a small grey tile, standing where it stood. Under it, what
// Usar does for a player of this screen by a locked one.
import { MINE_ACTIVATOR_SMALL, MINE_ACTIVATOR_TILE, mineActivatorTile, type MineActivatorOption, type MineActivatorParams } from "@/lib/pigchicken/mine-activator"
import { mineActivatorStore } from "@/lib/pigchicken/mine-activator-store"
import { intersectsView, type ViewRect } from "@/lib/pigchicken/viewport"
import { activatorHints } from "../mine-grid-play"
import { type Ctx } from "./shared"

const GOLD = "#ffd34a"
const TAG_H = 18, FLIP_MS = 260

// the mine: a dark ball with eight spikes, a white glint and a little dark mark, centred at (x, y), radius r
function drawMine(ctx: Ctx, x: number, y: number, r: number, grey: boolean) {
  ctx.save()
  ctx.strokeStyle = grey ? "#3a3f46" : "#15171a"; ctx.lineCap = "round"
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, long = k % 2 === 0 ? 1.5 : 1.3
    ctx.lineWidth = r * (k % 2 === 0 ? 0.26 : 0.2)
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); ctx.lineTo(x + Math.cos(a) * r * long, y + Math.sin(a) * r * long); ctx.stroke()
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r)
  if (grey) { g.addColorStop(0, "#c9d1da"); g.addColorStop(0.5, "#6f7884"); g.addColorStop(1, "#3a4048") }
  else { g.addColorStop(0, "#f4f4f4"); g.addColorStop(0.22, "#8a8d92"); g.addColorStop(0.7, "#34373c"); g.addColorStop(1, "#16181b") }
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.9)"
  ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = "#0c0d0f"; ctx.lineWidth = r * 0.14
  ctx.beginPath(); ctx.moveTo(x + r * 0.12, y + r * 0.02); ctx.lineTo(x + r * 0.42, y + r * 0.32); ctx.stroke()
  ctx.restore()
}

// the little drawing of an option: a block, two blocks and their gap, an octagon
function drawOptionIcon(ctx: Ctx, option: MineActivatorOption, x: number, y: number, s: number) {
  ctx.save(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.4
  if (option === "cell") ctx.strokeRect(x, y, s, s)
  else if (option === "gap") { ctx.strokeRect(x, y + s * 0.2, s * 0.38, s * 0.6); ctx.strokeRect(x + s * 0.62, y + s * 0.2, s * 0.38, s * 0.6) }
  else {
    const c = s * 0.3
    ctx.beginPath()
    ctx.moveTo(x + c, y); ctx.lineTo(x + s - c, y); ctx.lineTo(x + s, y + c); ctx.lineTo(x + s, y + s - c)
    ctx.lineTo(x + s - c, y + s); ctx.lineTo(x + c, y + s); ctx.lineTo(x, y + s - c); ctx.lineTo(x, y + c); ctx.closePath(); ctx.stroke()
  }
  ctx.restore()
}
const optionText = (option: MineActivatorOption, p: MineActivatorParams) => {
  const v = p[option]
  return v === null ? "Pátio" : option === "corner" ? `${v}%` : `${v}`
}

function drawPadlock(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save()
  ctx.strokeStyle = GOLD; ctx.lineWidth = s * 0.16
  ctx.beginPath(); ctx.arc(x, y - s * 0.15, s * 0.3, Math.PI, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = GOLD; ctx.strokeStyle = "#5a3d00"; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(x - s * 0.45, y - s * 0.15, s * 0.9, s * 0.7, s * 0.12); ctx.fill(); ctx.stroke()
  ctx.fillStyle = "#5a3d00"
  ctx.beginPath(); ctx.arc(x, y + s * 0.14, s * 0.1, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(x - s * 0.04, y + s * 0.14, s * 0.08, s * 0.22)
  ctx.restore()
}

export function drawMineActivators(ctx: Ctx, camX: number, view: ViewRect, colors: { blue: string; red: string }) {
  const boxes = mineActivatorStore.boxes
  if (!boxes.length) return
  const armed = mineActivatorStore.armed(), now = performance.now(), t = now / 1000
  const changed = mineActivatorStore.optionsChanged
  for (const b of boxes) {
    if (!intersectsView(b, view, 48)) continue
    const bars = mineActivatorStore.bars(b.id)
    const music = Math.min(1, bars.notes / b.params.notes), damage = Math.min(1, bars.damage / b.params.damage)
    const tile = mineActivatorTile(b)
    const k = armed ? 1 : MINE_ACTIVATOR_SMALL, size = MINE_ACTIVATOR_TILE * k
    const cx = (tile.l + tile.r) / 2 - camX, l = cx - size / 2, top = tile.bottom - size
    ctx.save()
    if (!armed) ctx.globalAlpha = 0.75
    // the tile: a red that glows (pulsing, stronger the fuller a bar is), bevelled like the icon
    const full = b.params.lock ? 0.35 : Math.max(music, damage)
    if (armed) { ctx.shadowColor = "#ff2a1a"; ctx.shadowBlur = 16 + 34 * full * (0.8 + 0.2 * Math.sin(t * 5)) + 6 * Math.sin(t * 2.2) }
    const g = ctx.createRadialGradient(cx, top + size * 0.55, size * 0.05, cx, top + size * 0.55, size * 0.75)
    if (armed) { g.addColorStop(0, "#ffd0b8"); g.addColorStop(0.28, `rgb(255,${70 + 50 * full},${40 + 30 * full})`); g.addColorStop(0.75, "#e0141c"); g.addColorStop(1, "#8e0a12") }
    else { g.addColorStop(0, "#b7bec7"); g.addColorStop(1, "#5d646d") }
    ctx.fillStyle = g
    ctx.fillRect(l, top, size, size)
    ctx.shadowBlur = 0
    const bevel = Math.max(2, size * 0.04)
    ctx.fillStyle = "rgba(255,255,255,0.55)"
    ctx.beginPath(); ctx.moveTo(l, top); ctx.lineTo(l + size, top); ctx.lineTo(l + size - bevel, top + bevel); ctx.lineTo(l + bevel, top + bevel); ctx.lineTo(l + bevel, top + size - bevel); ctx.lineTo(l, top + size); ctx.closePath(); ctx.fill()
    ctx.fillStyle = "rgba(0,0,0,0.42)"
    ctx.beginPath(); ctx.moveTo(l + size, top); ctx.lineTo(l + size, top + size); ctx.lineTo(l, top + size); ctx.lineTo(l + bevel, top + size - bevel); ctx.lineTo(l + size - bevel, top + size - bevel); ctx.lineTo(l + size - bevel, top + bevel); ctx.closePath(); ctx.fill()
    // the mine, under the tags
    const tagsH = armed ? TAG_H + bevel + 4 : 0
    drawMine(ctx, cx, top + tagsH + (size - tagsH) * 0.5, (size - tagsH) * 0.3, !armed)
    if (armed) {
      // the tags under its top: block, gap, corners
      const tw = (size - bevel * 2 - 4) / 3
      ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle"
      ;(["cell", "gap", "corner"] as const).forEach((option, i) => {
        const x = l + bevel + 2 + i * tw, y = top + bevel + 2
        const since = changed && changed.id === b.id && changed.option === option ? now - changed.at : Infinity
        const flip = since < FLIP_MS ? Math.abs(Math.cos((since / FLIP_MS) * Math.PI)) : 1
        ctx.save()
        ctx.translate(0, y + TAG_H / 2); ctx.scale(1, Math.max(0.05, flip)); ctx.translate(0, -(y + TAG_H / 2))
        ctx.fillStyle = "rgba(20,24,29,0.82)"; ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(x + 1, y, tw - 2, TAG_H, 4); ctx.fill(); ctx.stroke()
        drawOptionIcon(ctx, option, x + 5, y + 5, 8)
        ctx.fillStyle = "#ffffff"; ctx.fillText(optionText(option, b.params), x + 16, y + TAG_H / 2 + 0.5)
        ctx.restore()
      })
      if (b.params.lock) drawPadlock(ctx, l + size - 2, top + size - 4, 26)
      else {
        // the two bars at its sides: music up the left, damage up the right
        const bw = 8, gap = 6
        for (const [x, part, color] of [[l - gap - bw, music, colors.blue], [l + size + gap, damage, colors.red]] as const) {
          ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.roundRect(x, top, bw, size, 3); ctx.fill()
          if (part > 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, top + size * (1 - part), bw, size * part, 3); ctx.fill() }
        }
      }
    }
    ctx.restore()
    // what Usar does at a locked one
    const hint = activatorHints.get(b.id)
    if (hint) {
      const text = hint.has ? `${hint.key ? `${hint.key} - ` : ""}Usar a Chave de ouro` : "Precisa de uma Chave de ouro"
      ctx.save()
      ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText(text, cx, tile.bottom + 16)
      ctx.fillStyle = hint.has ? GOLD : "#e8e8e8"; ctx.fillText(text, cx, tile.bottom + 16)
      ctx.restore()
    }
  }
}
