// The Mata's tree lines (Configurações do Pátio → Mata) as SVG silhouettes in a layer's own units. Pure: no DOM.
// components/pigchicken/parallax.tsx paints them in the sky's colours.
import { rng } from './mountain-draw'

// trees along a line, as one silhouette path per colour. forms: how much of each crown, as a proportion: pines,
// round crowns, cloud crowns (a tall bush outlined by small bumps) and umbrellas (a wide flat crown bent by the wind
// on a thick trunk forking in a Y). With only the first two, the draw is the one the Mata always had.
export function trees(w: number, seed: number, base: number, size: number, gap: number, forms: [number, number, number, number] = [45, 55, 0, 0]) {
  const r = rng(seed)
  const [pine, round, cloud, umbrella] = forms, total = pine + round + cloud + umbrella
  // the wind bends every umbrella of the line the same way
  const lean = seed % 2 ? 1 : -1
  let crowns = "", trunks = ""
  const blob = (cx: number, cy: number, rx: number, ry: number) => `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 1 ${rx * 2} 0 a ${rx} ${ry} 0 1 1 ${-rx * 2} 0 Z `
  for (let x = r() * gap; x < w; x += gap * (0.5 + r())) {
    const h = size * (0.65 + r() * 0.6)
    const v = r() * (total > 0 ? total : 1)
    const kind = total <= 0 ? 1 : v < pine ? 0 : v < pine + round ? 1 : v < pine + round + cloud ? 2 : 3
    if (kind === 0) {
      // a pine: three stacked triangles
      const wd = h * 0.42
      trunks += `M ${x - h * 0.03} ${base} L ${x - h * 0.03} ${base - h * 0.2} L ${x + h * 0.03} ${base - h * 0.2} L ${x + h * 0.03} ${base} Z `
      for (let k = 0; k < 3; k++) {
        const y0 = base - h * (0.15 + k * 0.27), y1 = y0 - h * 0.42, ww = wd * (1 - k * 0.25)
        crowns += `M ${x - ww} ${y0} L ${x} ${y1} L ${x + ww} ${y0} Z `
      }
    } else if (kind === 1) {
      // a round crown on a short trunk
      const rr = h * 0.32
      trunks += `M ${x - h * 0.035} ${base} L ${x - h * 0.035} ${base - h * 0.45} L ${x + h * 0.035} ${base - h * 0.45} L ${x + h * 0.035} ${base} Z `
      crowns += `M ${x - rr} ${base - h * 0.55} a ${rr} ${rr * 0.9} 0 1 1 ${rr * 2} 0 a ${rr} ${rr * 0.9} 0 1 1 ${-rr * 2} 0 Z `
      crowns += `M ${x - rr * 1.25} ${base - h * 0.42} a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${rr * 1.4} 0 a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${-rr * 1.4} 0 Z `
      crowns += `M ${x - rr * 0.15} ${base - h * 0.42} a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${rr * 1.4} 0 a ${rr * 0.7} ${rr * 0.55} 0 1 1 ${-rr * 1.4} 0 Z `
    } else if (kind === 2) {
      // a cloud crown: a tall oval filled in, its outline made of many small bumps, on a short trunk
      const cx = x, cy = base - h * 0.6, rx = h * 0.26, ry = h * 0.4, bump = h * (0.11 + r() * 0.03)
      trunks += `M ${x - h * 0.04} ${base} L ${x - h * 0.03} ${base - h * 0.3} L ${x + h * 0.03} ${base - h * 0.3} L ${x + h * 0.04} ${base} Z `
      crowns += blob(cx, cy, rx * 0.88, ry * 0.9)
      const n = 13 + Math.floor(r() * 4), turn = r() * Math.PI
      for (let k = 0; k < n; k++) {
        const a = turn + k / n * Math.PI * 2, b = bump * (0.8 + r() * 0.4)
        crowns += blob(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, b, b)
      }
    } else {
      // an umbrella: a thick trunk curving with the wind and forking in a Y, under a wide flat wavy crown whose
      // leeward tip curls down like a hook
      const tw = h * 0.07, cw = h * (1.15 + r() * 0.35), cy = base - h * (0.82 + r() * 0.1)
      const cx = x + lean * h * 0.25, fx = x + lean * h * 0.13, fy = base - h * 0.48
      const b1x = cx - lean * cw * 0.24, b2x = cx + lean * cw * 0.16, by = cy + h * 0.06
      trunks += `M ${x - tw} ${base} Q ${x - tw + lean * h * 0.12} ${base - h * 0.26} ${fx - tw * 0.75} ${fy} L ${b1x - tw * 0.4} ${by} L ${b1x + tw * 0.4} ${by} `
        + `L ${fx} ${fy - tw * 1.1} L ${b2x - tw * 0.4} ${by} L ${b2x + tw * 0.4} ${by} L ${fx + tw * 0.75} ${fy} Q ${x + tw + lean * h * 0.12} ${base - h * 0.26} ${x + tw} ${base} Z `
      // the crown: flat puffs along a gently drooping arc with small bumps along its top, then the curl at its
      // leeward tip
      const n = 6 + Math.floor(r() * 3), th = h * (0.13 + r() * 0.04)
      const at = (t: number) => [cx + (t - 0.5) * cw * lean, cy + t * t * h * 0.12 - Math.sin(t * Math.PI) * h * 0.04] as const
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1), [px, py] = at(t)
        crowns += blob(px, py, cw / n * (0.8 + r() * 0.3), th * (0.75 + r() * 0.3) * (1 - t * 0.2))
      }
      for (let k = 0; k < n * 2; k++) {
        const t = (k + 0.5) / (n * 2), [px, py] = at(t), b = th * (0.35 + r() * 0.2)
        crowns += blob(px, py - th * 0.55, b, b * 0.8)
      }
      const [tipX, tipY] = at(1)
      for (let k = 1; k <= 4; k++) {
        const a = k / 4 * Math.PI * 0.85, rr = th * (0.62 - k * 0.09)
        crowns += blob(tipX + lean * Math.sin(a) * th * 1.1, tipY + (1 - Math.cos(a)) * th * 1.15, rr, rr)
      }
    }
  }
  return { crowns, trunks }
}
