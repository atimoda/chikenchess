// The Baús (lib/pigchicken/chests.ts) drawn in the world: a wooden chest with metal trims and the glow of its rarity
// (simples: soft yellow; lendário: a stronger blue). The lock shows what opens it: a latch (free), a padlock (key) or
// a seal with the souls it asks for (merit). Open, the lid stands up, light pours out and the glow calms down.
import { CHEST_GLOW } from "@/lib/pigchicken/chests"
import { type Chest } from "@/lib/pigchicken/combat"
import { type Ctx } from "./shared"

// the hint over the Baú a local player is next to (set every frame): the first player next to one shows theirs
// key: the grab bind's name; block: what keeps it shut for them; souls: how many they have in their Gaiolas
export const chestMarks = new Map<Chest, { key: string; block: "key" | "souls" | null; souls: number }>()

const W = 84, BODY = 44, LID = 24

export function drawChest(ctx: Ctx, c: Chest, x: number, now: number) {
  const g = CHEST_GLOW[c.params.rarity], legend = c.params.rarity === "legendary"
  const floor = c.y, top = floor - BODY
  if (c.shake > 0) x += Math.sin(now * 70) * 3 * Math.min(1, c.shake / 0.2)
  const pulse = 0.82 + 0.18 * Math.sin(now * (legend ? 3.4 : 2.2))
  // the glow behind it: calmer once open
  const glowA = g.alpha * pulse * (1 - 0.6 * c.lid)
  const R = W * g.reach
  ctx.save()
  const halo = ctx.createRadialGradient(x, top, 4, x, top, R)
  halo.addColorStop(0, hexA(g.core, glowA)); halo.addColorStop(0.35, hexA(g.color, glowA * 0.7)); halo.addColorStop(1, hexA(g.color, 0))
  ctx.fillStyle = halo; ctx.beginPath(); ctx.ellipse(x, top, R, R * 0.85, 0, 0, Math.PI * 2); ctx.fill()
  // just opened: a beam of its light going up, fading in two seconds
  if (c.open && c.t < 2) {
    const k = 1 - c.t / 2, bw = W * (legend ? 0.8 : 0.6), bh = legend ? 420 : 260
    const beam = ctx.createLinearGradient(0, top, 0, top - bh)
    beam.addColorStop(0, hexA(g.core, 0.75 * k)); beam.addColorStop(1, hexA(g.color, 0))
    ctx.fillStyle = beam; ctx.beginPath()
    ctx.moveTo(x - bw / 2, top); ctx.lineTo(x + bw / 2, top); ctx.lineTo(x + bw * 0.9, top - bh); ctx.lineTo(x - bw * 0.9, top - bh); ctx.closePath(); ctx.fill()
  }
  ctx.restore()

  const wood = "#8a5a2b", woodDark = "#5e3a17", trim = legend ? "#9fd4ff" : "#e7b43a", trimDark = legend ? "#3f79b8" : "#8a5a12"
  // shadow on the floor
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(x, floor, W * 0.55, 5, 0, 0, Math.PI * 2); ctx.fill()
  // open: the inside, lit by its rarity
  if (c.lid > 0.05) {
    ctx.fillStyle = "#24160a"; ctx.fillRect(x - W / 2 + 4, top - 6, W - 8, 8)
    ctx.fillStyle = hexA(g.core, 0.85 * c.lid); ctx.fillRect(x - W / 2 + 8, top - 4, W - 16, 4)
  }
  // the body: planks, the metal corners and the band
  ctx.fillStyle = wood; ctx.fillRect(x - W / 2, top, W, BODY)
  ctx.strokeStyle = woodDark; ctx.lineWidth = 1.5
  for (const yy of [top + 15, top + 30]) { ctx.beginPath(); ctx.moveTo(x - W / 2, yy); ctx.lineTo(x + W / 2, yy); ctx.stroke() }
  ctx.fillStyle = trim
  ctx.fillRect(x - W / 2, top, 7, BODY); ctx.fillRect(x + W / 2 - 7, top, 7, BODY)
  ctx.fillRect(x - W / 2, top, W, 4)
  ctx.strokeStyle = trimDark; ctx.lineWidth = 1.2; ctx.strokeRect(x - W / 2 + 0.5, top + 0.5, W - 1, BODY - 1)
  // the lid: shut, a rounded top; opening, it swings up and shows its dark underside
  const lidUp = LID * (1 - 1.7 * c.lid)
  if (lidUp > 0) {
    ctx.fillStyle = wood
    ctx.beginPath(); ctx.moveTo(x - W / 2, top); ctx.lineTo(x - W / 2, top - lidUp * 0.55)
    ctx.quadraticCurveTo(x - W / 2, top - lidUp, x - W / 2 + 12, top - lidUp); ctx.lineTo(x + W / 2 - 12, top - lidUp)
    ctx.quadraticCurveTo(x + W / 2, top - lidUp, x + W / 2, top - lidUp * 0.55); ctx.lineTo(x + W / 2, top); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = trimDark; ctx.lineWidth = 1.2; ctx.stroke()
    ctx.fillStyle = trim; ctx.fillRect(x - W / 2, top - 3, W, 3); ctx.fillRect(x - W / 2, top - lidUp * 0.55, 7, lidUp * 0.55); ctx.fillRect(x + W / 2 - 7, top - lidUp * 0.55, 7, lidUp * 0.55)
  } else {
    const h = -lidUp * 1.4
    ctx.fillStyle = "#3d250e"; ctx.fillRect(x - W / 2 + 2, top - 6 - h, W - 4, h)
    ctx.fillStyle = trim; ctx.fillRect(x - W / 2 + 2, top - 6 - h, W - 4, 3)
  }
  // the lock: what opens it
  const lx = x, ly = top + 4
  if (c.lid < 0.5) {
    if (c.params.lock === "key") {
      // a padlock with its keyhole
      ctx.strokeStyle = trimDark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(lx, ly + 2, 5.5, Math.PI, 0); ctx.stroke()
      ctx.fillStyle = trim; ctx.fillRect(lx - 8, ly + 2, 16, 13)
      ctx.strokeStyle = trimDark; ctx.lineWidth = 1; ctx.strokeRect(lx - 7.5, ly + 2.5, 15, 12)
      ctx.fillStyle = "#2a1d08"; ctx.beginPath(); ctx.arc(lx, ly + 7, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(lx - 0.8, ly + 7, 1.6, 5)
    } else if (c.params.lock === "souls") {
      // a round seal with the souls it asks for
      ctx.fillStyle = "rgba(10,18,15,0.92)"; ctx.beginPath(); ctx.arc(lx, ly + 9, 10, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.stroke()
      const n = String(c.params.souls)
      ctx.font = `bold ${n.length > 2 ? 8 : 10}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillStyle = "#e9f4ee"; ctx.fillText(n, lx, ly + 9.5); ctx.textBaseline = "alphabetic"
    } else {
      // a plain latch
      ctx.fillStyle = trim; ctx.fillRect(lx - 6, ly - 2, 12, 12)
      ctx.strokeStyle = trimDark; ctx.lineWidth = 1; ctx.strokeRect(lx - 5.5, ly - 1.5, 11, 11)
    }
  }
  // a local player is next to it: the bind to open it, or what it still asks of them
  const mark = chestMarks.get(c)
  if (mark && !c.open) {
    const text = mark.block === "key" ? "precisa de chave" : mark.block === "souls" ? `almas nas gaiolas ${mark.souls}/${c.params.souls}` : mark.key ? `${mark.key}: abrir` : "abrir"
    ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"
    // under it, like the items' hint (over it the chicken would hide it)
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText(text, x, floor + 16)
    ctx.fillStyle = mark.block ? "#ffb4a8" : g.color; ctx.fillText(text, x, floor + 16)
  }
}

// "#rrggbb" with an alpha
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}
