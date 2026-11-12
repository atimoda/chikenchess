// The clouds' drawing (Configurações do Pátio → Nuvens), in the cloud layer's own units. Pure: no DOM.
// components/pigchicken/parallax.tsx paints them in the sky's light.
// soft: the Pátio's first clouds, a few flat lobes over a shaded base, faint and see-through.
// cumulus: tall heaps of round puffs, each one lit on the side of the sun and shaded on the other, so the puffs in
// front cast their shade on the ones behind; small puffs along the rims fray the outline (and the painter pushes
// the outline around with a noise, by the same Desfiado).

import { rng } from './mountain-draw'

// lobes: ellipses painted as they are (shade: in the shade's colour); puffs: discs painted twice, the shade and
// then the lit face moved toward the sun. o: its own opacity; drift: how far the wind carries it back and forth.
// top/bottom: how far above and below y it reaches (for the camera's visibility pass)
export type CloudShape = {
  x: number; y: number; o: number; drift: number; top: number; bottom: number
  lobes: { dx: number; dy: number; rx: number; ry: number; shade?: boolean }[]
  puffs: { dx: number; dy: number; r: number }[]
}

// size (1 = usual), height (0 low to 1 high) and spread (0 one height to 1 scattered): Configurações → Nuvens
export function softClouds(w: number, seed: number, size = 1, height = 0.5, spread = 0.5): CloudShape[] {
  const r = rng(seed)
  const mid = 290 + (0.5 - height) * 500, band = 720 * spread
  const out: CloudShape[] = []
  for (let x = r() * 500; x < w; x += (380 + r() * 700) * Math.max(0.6, size)) {
    const n = 3 + Math.floor(r() * 4), span = (120 + r() * 260) * size, thick = (16 + r() * 26) * size
    const lobes: CloudShape['lobes'] = Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const mid = 1 - Math.abs(t - 0.5) * 1.4
      return { dx: (t - 0.5) * span + (r() - 0.5) * 30, dy: -mid * thick * (0.4 + r() * 0.6), rx: span * (0.18 + r() * 0.16), ry: thick * (0.5 + mid * 0.6) }
    })
    // a flat base under the lobes
    lobes.push({ dx: 0, dy: thick * 0.15, rx: span * 0.62, ry: thick * 0.35, shade: true })
    out.push({ x, y: mid + (r() - 0.5) * band, lobes, puffs: [], o: 0.12 + r() * 0.22, drift: 60 + r() * 90, top: 100, bottom: 100 })
  }
  return out
}

// puffs (0 to 1): how many heaps each cloud has; detail (0 to 1): small puffs along the rims
export function cumulusClouds(w: number, seed: number, size = 1, height = 0.5, spread = 0.5, puffs = 0.5, detail = 0.4): CloudShape[] {
  const r = rng(seed)
  const mid = 380 + (0.5 - height) * 620, band = 520 * spread
  const out: CloudShape[] = []
  for (let x = r() * 400; x < w; x += (260 + r() * 520) * Math.max(0.6, size)) {
    const span = (240 + r() * 420) * size, tall = span * (0.3 + r() * 0.28)
    const n = Math.round(5 + puffs * 9), kids = Math.round(detail * 3)
    const list: CloudShape['puffs'] = []
    for (let i = 0; i < n; i++) {
      const t = Math.max(-0.5, Math.min(0.5, (i + r() * 0.8 - 0.4) / (n - 1) - 0.5))
      // the heap's outline: tallest in the middle, with every puff at its own height inside it
      const prof = Math.pow(Math.max(0, 1 - 4 * t * t), 0.7)
      const rad = tall * (0.16 + Math.pow(r(), 1.6) * 0.34) * (0.45 + 0.55 * prof)
      const px = t * span, py = -prof * tall * (0.12 + r() * 0.6)
      list.push({ dx: px, dy: py, r: rad })
      for (let k = 0; k < kids; k++) {
        // on the rim, mostly on its upper half
        const a = -Math.PI * (0.05 + r() * 0.9), cr = rad * (0.28 + r() * 0.3)
        list.push({ dx: px + Math.cos(a) * rad * 0.82, dy: py + Math.sin(a) * rad * 0.82, r: cr })
        if (detail > 0.65 && r() < detail - 0.4) list.push({ dx: px + Math.cos(a) * (rad * 0.82 + cr * 0.8), dy: py + Math.sin(a) * (rad * 0.82 + cr * 0.8), r: cr * 0.5 })
      }
    }
    // the puffs behind first: the higher ones, so the lower ones in front shade them
    list.sort((a, b) => a.dy - b.dy)
    const top = Math.max(...list.map(p => p.r - p.dy)) + 40, bottom = tall * 0.3 + 60
    out.push({
      x, y: mid + (r() - 0.5) * band, puffs: list, o: 0.6 + r() * 0.3, drift: 40 + r() * 60, top, bottom,
      // a flat, shaded base under the heap
      lobes: [{ dx: 0, dy: tall * 0.06, rx: span * 0.56, ry: tall * 0.2, shade: true }],
    })
  }
  return out
}

// how far a cloud reaches to each side of its x (its lobes and puffs)
export function cloudReach(c: CloudShape): { l: number; r: number } {
  const ls = [...c.lobes.map(l => l.dx - l.rx), ...c.puffs.map(p => p.dx - p.r)], rs = [...c.lobes.map(l => l.dx + l.rx), ...c.puffs.map(p => p.dx + p.r)]
  return { l: Math.min(...ls), r: Math.max(...rs) }
}
