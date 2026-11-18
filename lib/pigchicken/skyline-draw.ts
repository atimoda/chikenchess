// The buildings' drawing (Configurações do Pátio → Prédios), as SVG paths in a layer's own units (x from the layer's
// left, y the world's). Pure: no DOM. components/pigchicken/parallax.tsx paints them: the silhouettes in the wall's
// colour, the facades in a lighter tone, the lights in the row's light colour.
//
// The facades are strokes, so a whole row of windows is one dashed line (its dashes are the windows) and a building
// costs a few dozen path commands, not hundreds of rectangles. Dashes restart at each subpath, so every row of
// windows starts on a window.
//
// Two random streams: one for the buildings' shapes and one for the facades' details, so changing a facade setting
// (windows, lights) never reshapes the buildings.
import { WORLD_GROUND_Y } from './world'
import { rng } from './mountain-draw'
import type { SkylineFacade, SkylineRow } from './skyline'

const G = WORLD_GROUND_Y
const f = (n: number) => (Math.round(n * 10) / 10).toString()
const rect = (x: number, y: number, w: number, h: number) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`
const hline = (x: number, y: number, w: number) => `M${f(x)} ${f(y)}h${f(w)}`
const vline = (x: number, y: number, h: number) => `M${f(x)} ${f(y)}v${f(h)}`

// where a row's buildings stand by its depth: on the horizon line between the tree lines' ground and the ranges' feet
const FEET: [number, number][] = [[0.1, G - 2], [0.2, G - 6], [0.34, G - 42], [0.48, 860], [0.57, 825], [0.66, 790], [0.74, 755], [0.82, 720], [0.9, 680]]
export function skylineFeet(p: number) {
  if (p <= FEET[0][0]) return FEET[0][1]
  for (let i = 1; i < FEET.length; i++) {
    const [pa, ya] = FEET[i - 1], [pb, yb] = FEET[i]
    if (p <= pb) return ya + (yb - ya) * (p - pa) / (pb - pa)
  }
  return FEET[FEET.length - 1][1]
}
export const SKYLINE_LIFT_UNIT = 4
// the usual building at 100%: its height and width (layer units)
export const SKYLINE_BASE = { h: 240, w: 110 } as const
// past this many path commands a row stops adding facade details (a huge layer of tiny buildings)
const DETAIL_CAP = 60000

export type SkylineShapes = {
  body: string; panel: string; win: string; litWin: string; stripe: string; code: string; litCode: string
  slot: string; led: string; dots: string; antenna: string
  // the dashes and strokes the facades are drawn with
  winDash: string; winH: number; stripeW: number; codeW: number; slotDash: string; slotH: number; ledDash: string
  feet: number; top: number
}

const KINDS: SkylineFacade[] = ['janelas', 'verticais', 'horizontais']

export function skylineShapes(w: number, row: SkylineRow, seed: number): SkylineShapes {
  const rS = rng(seed), rD = rng(seed + 977), rC = rng(seed + 31)
  const p = row.depth / 100
  const feet = skylineFeet(p) - row.lift * SKYLINE_LIFT_UNIT
  const ws = row.windowSize / 100, gs = row.windowGap / 100, lit = row.lit / 100
  // the facades' measures
  const ww = 7 * ws, wh = 9 * ws, gx = Math.max(1.5, 6 * gs), gy = Math.max(1.5, 7 * gs)
  const stripeW = 2.2 * ws, codeW = 4 * ws, codeStep = codeW + 6.5 * gs
  const rackW = 34 * ws, slotH = 3 * ws, slotGap = 3, slotStep = slotH + 5 * gs, ledL = 2.2 * ws
  const out = { body: '', panel: '', win: '', litWin: '', stripe: '', code: '', litCode: '', slot: '', led: '', dots: '', antenna: '' }
  let cmds = 0, top = feet
  const baseH = SKYLINE_BASE.h * row.height / 100, baseW = SKYLINE_BASE.w * row.width / 100
  // the clusters: a smooth noise along the row, one value every few buildings, the tallest in the middle of each
  const period = Math.max(400, baseW * 6), ctl: number[] = []
  for (let i = 0; i <= Math.ceil(w / period) + 1; i++) ctl.push(rC())
  const cluster = (x: number) => {
    const t = x / period, i = Math.floor(t), u = (1 - Math.cos((t - i) * Math.PI)) / 2
    return ctl[i] * (1 - u) + ctl[i + 1] * u
  }

  // a block's facade, inside its rectangle
  const facade = (x: number, y: number, bw: number, bh: number, kind: SkylineFacade) => {
    if (cmds > DETAIL_CAP || row.contrast <= 0 && lit <= 0) return
    const m = Math.max(gx, 4 * ws)
    if (kind === 'janelas') {
      const n = Math.floor((bw - 2 * m + gx) / (ww + gx))
      if (n < 1) return
      const total = n * (ww + gx) - gx, xs = x + (bw - total) / 2
      for (let yy = y + m; yy + wh <= y + bh - m * 0.5; yy += wh + gy) {
        out.win += hline(xs, yy + wh / 2, total); cmds++
        // the lit ones: runs of a few windows, each starting on a window
        if (lit > 0) for (let c = 0; c < n;) {
          const run = Math.min(n - c, 1 + Math.floor(rD() * 3))
          if (rD() < lit) { out.litWin += hline(xs + c * (ww + gx), yy + wh / 2, run * (ww + gx) - gx); cmds++ }
          c += run
        }
      }
    } else if (kind === 'verticais') {
      const n = Math.floor((bw - 2 * m) / (ww + gx))
      if (n < 1) return
      const xs = x + (bw - (n - 1) * (ww + gx)) / 2
      for (let i = 0; i < n; i++) { out.stripe += vline(xs + i * (ww + gx), y + m, bh - 2 * m); cmds++ }
    } else if (kind === 'horizontais') {
      for (let yy = y + m + wh / 2; yy <= y + bh - m; yy += wh + gy) { out.stripe += hline(x + m, yy, bw - 2 * m); cmds++ }
    } else if (kind === 'codigo') {
      // an app window: the title bar with three dots, then lines of code of different lengths and indents
      const bar = Math.min(bh * 0.3, 13 * ws), pad = 6 * ws
      out.panel += rect(x, y, bw, bar)
      for (let i = 0; i < 3; i++) out.dots += `M${f(x + pad + i * 7 * ws + 2.2 * ws)} ${f(y + bar / 2)}a${f(2.2 * ws)} ${f(2.2 * ws)} 0 1 0 0.01 0Z`
      const x0 = x + pad + codeW / 2, x1 = x + bw - pad - codeW / 2
      for (let yy = y + bar + 7 * ws + codeW / 2; yy <= y + bh - pad; yy += codeStep) {
        if (rD() < 0.12) continue
        const ind = Math.floor(rD() * 4) * 9 * ws
        let xx = x0 + ind
        for (let seg = 0; seg < 3 && xx < x1; seg++) {
          const len = Math.min(x1 - xx, (x1 - x0) * (0.12 + rD() * 0.5))
          if (len <= codeW * 0.5) break
          if (rD() < lit) out.litCode += hline(xx, yy, len); else out.code += hline(xx, yy, len)
          cmds++
          xx += len + codeW * 2.2
          if (rD() < 0.55) break
        }
      }
    } else if (kind === 'servidores') {
      // racks of servers: rows of blades (dashed lines, one dash per rack), a light at the end of some
      const n = Math.floor((bw - 2 * m + slotGap) / rackW)
      if (n < 1) return
      const total = n * rackW - slotGap, xs = x + (bw - total) / 2
      let k = 0
      for (let yy = y + m + slotH / 2; yy <= y + bh - m; yy += slotStep, k++) {
        // every few blades a gap, like the racks' shelves
        if (k % 7 === 6) continue
        out.slot += hline(xs, yy, total); cmds++
        if (lit > 0) for (let c = 0; c < n;) {
          const run = Math.min(n - c, 1 + Math.floor(rD() * 4))
          if (rD() < lit) { out.led += hline(xs + c * rackW + rackW - slotGap - ledL - 2 * ws, yy, run * rackW - (rackW - ledL)); cmds++ }
          c += run
        }
      }
      // the racks' uprights, every few racks
      for (let i = 0; i <= n; i += 4) { out.stripe += vline(xs + i * rackW - slotGap / 2, y + m * 0.5, bh - m); cmds++ }
    }
  }
  const block = (x: number, y: number, bw: number, bh: number, kind: SkylineFacade) => {
    out.body += rect(x, y, bw, bh)
    top = Math.min(top, y)
    facade(x, y, bw, bh, kind)
  }

  const vary = (v: number) => (rS() * 2 - 1) * v / 100
  for (let x = rS() * baseW; x < w;) {
    const bw = Math.max(16, baseW * (1 + vary(row.widthVar) * 0.65))
    const c = 1 + row.cluster / 100 * (cluster(x + bw / 2) * 2 - 1) * 0.85
    const bh = Math.max(14, baseH * (1 + vary(row.heightVar) * 0.7) * c)
    const kind = row.facade === 'misto' ? KINDS[Math.floor(rS() * 3)] : row.facade
    const y = feet - bh
    // setbacks: the main block is lower and one or two narrower blocks stand on it
    const steps = rS() < row.setback / 100 ? 1 + (rS() < 0.4 ? 1 : 0) : 0
    let mainY = y, mainH = bh, tx = x, tw = bw
    if (steps) {
      const part = 0.55 + rS() * 0.2
      mainH = bh * part; mainY = feet - mainH
      let sx = x, sw = bw, sy = mainY, left = bh - mainH
      for (let s = 0; s < steps; s++) {
        const nw = sw * (0.55 + rS() * 0.25), side = rS()
        const nx = sx + (sw - nw) * (side < 0.33 ? 0.08 : side < 0.66 ? 0.5 : 0.92)
        const nh = s === steps - 1 ? left : left * (0.55 + rS() * 0.2)
        block(nx, sy - nh, nw, nh, kind)
        sx = nx; sw = nw; sy -= nh; left -= nh
      }
      tx = sx; tw = sw
    }
    block(x, mainY, bw, mainH, kind)
    // an annex: a lower block against one side
    if (rS() < row.annex / 100) {
      const aw = bw * (0.3 + rS() * 0.35), ah = Math.min(mainH, bh * (0.22 + rS() * 0.3)), right = rS() < 0.5
      block(right ? x + bw : x - aw, feet - ah, aw, ah, kind)
    }
    // things on the roof: boxes and machines (a data-center's coolers), on the main block's roof
    if (rS() < row.roof / 100) {
      const n = Math.max(1, Math.floor(bw / 70)), slot = bw / n
      for (let i = 0; i < n; i++) {
        const uw = Math.min(slot * 0.8, 10 + rS() * 26), uh = 5 + rS() * 12, ux = x + i * slot + rS() * (slot - uw)
        out.body += rect(ux, mainY - uh, uw, uh)
        top = Math.min(top, mainY - uh)
      }
    }
    // an antenna on the highest block
    if (rS() < row.antenna / 100) {
      const ah = Math.min(160, bh * (0.12 + rS() * 0.25)), ax = tx + tw * (0.3 + rS() * 0.4)
      out.antenna += vline(ax, feet - bh, -ah)
      top = Math.min(top, feet - bh - ah)
    }
    const spacing = bw * row.gap / 100 * rS() * 1.4
    x += (bw + spacing) * 100 / row.density
  }
  return {
    ...out, winDash: `${f(ww)} ${f(gx)}`, winH: wh, stripeW, codeW, slotDash: `${f(rackW - slotGap)} ${slotGap}`, slotH,
    ledDash: `${f(ledL)} ${f(rackW - ledL)}`, feet, top,
  }
}
