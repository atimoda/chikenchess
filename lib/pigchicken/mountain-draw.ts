// The far mountains' drawing (Configurações do Pátio → Montanhas), as SVG paths in a layer's own units: the ranges'
// silhouette by peak type, the faces turned away from the light by shading style, and the snow by its edge style.
// Pure: no DOM. components/pigchicken/parallax.tsx paints them in the sky's colours. The light comes from the
// upper left, so a peak's left slope is lit and its right slope is in shade.

import type { MountainPeakType, MountainShadeStyle, MountainSnowStyle } from './mountains'

export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let r = s
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// a peak on the crest: where its top is, its index in the crest and the crest's stretch it owns (from the valley on
// its left to the valley on its right)
export type Peak = { x: number; y: number; i: number; lo: number; hi: number }
export type Ridge = { d: string; line: string; top: number; base: number; crest: [number, number][]; peaks: Peak[] }

const f0 = (n: number) => n.toFixed(0)

// a range's silhouette, closed far below at `bottom`. wave: rolling peaks (a few waves summed, the Pátio's first
// drawing); sharp: peaks with concave, slightly jagged slopes; geo: straight triangles. amp: the peaks' height,
// rough: how narrow and many they are, step: the sampling.
export function ridge(w: number, seed: number, base: number, amp: number, rough: number, step: number, type: MountainPeakType, bottom: number): Ridge {
  const r = rng(seed)
  const xs: number[] = []
  for (let x = 0; x <= w + step; x += step) xs.push(x)
  let heightAt: (x: number) => number
  if (type === 'wave') {
    const waves = Array.from({ length: 5 }, (_, i) => ({ k: (0.0016 + r() * 0.002) * (i + 1) * rough, ph: r() * 6.28, a: amp / (i + 1.3) }))
    heightAt = x => waves.reduce((h, v) => h + v.a * (0.5 + 0.5 * Math.sin(x * v.k + v.ph)), 0)
  } else {
    // peaks of their own width and height, overlapping; the crest is the highest of them at each x
    const tops: { x: number; h: number; hw: number }[] = []
    for (let x = -300 + r() * 200; x < w + 400;) {
      const gap = (260 + r() * 380) / Math.max(0.2, rough)
      tops.push({ x, h: amp * (0.75 + r() * 1.15), hw: gap * (0.75 + r() * 0.6) })
      x += gap
    }
    const e = type === 'sharp' ? 1.35 : 1
    const n1 = r() * 6.28, n2 = r() * 6.28, jag = type === 'sharp' ? amp * 0.05 * Math.min(2, rough) : 0
    heightAt = x => {
      let h = 0
      for (const t of tops) { const u = Math.abs(x - t.x) / t.hw; if (u < 1) h = Math.max(h, t.h * Math.pow(1 - u, e)) }
      // small notches along the slopes (sawtooth), never on the very top
      return jag && h > 0 ? Math.max(0, h - jag * (Math.abs(((x * 0.021 + n1) % 2) - 1) * 0.6 + Math.abs(((x * 0.047 + n2) % 2) - 1) * 0.4)) : h
    }
    tops.forEach(t => { if (t.x > 0 && t.x < w + step) xs.push(t.x) })
    xs.sort((a, b) => a - b)
  }
  const crest: [number, number][] = xs.map(x => [Math.round(x), Math.round(base - heightAt(x))])
  const top = Math.min(...crest.map(c => c[1]))
  const peaks = findPeaks(crest, Math.max(6, amp * 0.08))
  const line = crest.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ')
  const d = `M 0 ${bottom} ${crest.map(([x, y]) => `L ${x} ${y}`).join(' ')} L ${crest[crest.length - 1][0]} ${bottom} Z`
  return { d, line, top, base, crest, peaks }
}

// the crest's peaks: its highest points that stand at least `prominence` above the valleys on both sides
export function findPeaks(crest: [number, number][], prominence: number): Peak[] {
  const n = crest.length, cand: number[] = []
  for (let i = 0; i < n; i++) {
    const y = crest[i][1]
    if ((i === 0 || crest[i - 1][1] > y) && (i === n - 1 || crest[i + 1][1] >= y)) cand.push(i)
  }
  // keep the prominent ones: walk out on each side until a higher point; the deepest valley met must be deep enough
  const keep = cand.filter(i => {
    const y = crest[i][1]
    let l = y, rr = y
    for (let k = i - 1; k >= 0 && crest[k][1] >= y; k--) l = Math.max(l, crest[k][1])
    for (let k = i + 1; k < n && crest[k][1] >= y; k++) rr = Math.max(rr, crest[k][1])
    return Math.min(l, rr) - y >= prominence || (l - y >= prominence && rr - y >= prominence * 0.3) || (rr - y >= prominence && l - y >= prominence * 0.3)
  })
  const peaks: Peak[] = []
  keep.forEach((i, k) => {
    let lo = 0, hi = n - 1
    if (k > 0) { lo = keep[k - 1]; for (let j = keep[k - 1]; j <= i; j++) if (crest[j][1] > crest[lo][1]) lo = j }
    if (k < keep.length - 1) { hi = i; for (let j = i; j <= keep[k + 1]; j++) if (crest[j][1] > crest[hi][1]) hi = j }
    peaks.push({ x: crest[i][0], y: crest[i][1], i, lo, hi })
  })
  return peaks
}

// the faces turned away from the light, as one path:
// slopes: under every stretch of the crest that goes down to the right, from the crest to the bottom;
// split: each peak's right half, cut by a straight line from its top to its foot (a flat-shaded drawing);
// creases: narrow wedges from near each top down the slopes, like the creases of a rocky face
export function shadeFaces(rg: Ridge, style: MountainShadeStyle, bottom: number, seed = 1) {
  const { crest, peaks, base } = rg
  let d = ''
  if (style === 'slopes') {
    for (let i = 1; i < crest.length; i++) {
      if (crest[i][1] <= crest[i - 1][1]) continue
      const start = i - 1
      while (i + 1 < crest.length && crest[i + 1][1] > crest[i][1]) i++
      d += `M ${crest[start][0]} ${bottom}`
      for (let k = start; k <= i; k++) d += ` L ${crest[k][0]} ${crest[k][1]}`
      d += ` L ${crest[i][0]} ${bottom} Z `
    }
    return d
  }
  if (style === 'split') {
    for (const p of peaks) {
      const right = crest[p.hi][0], lean = Math.min((base - p.y) * 0.22, (right - p.x) * 0.8)
      d += `M ${p.x} ${p.y}`
      for (let k = p.i + 1; k <= p.hi; k++) d += ` L ${crest[k][0]} ${crest[k][1]}`
      d += ` L ${right} ${bottom} L ${f0(p.x + lean)} ${bottom} L ${f0(p.x + lean)} ${base} Z `
    }
    return d
  }
  const r = rng(seed)
  for (const p of peaks) {
    const h = base - p.y
    if (h < 20) continue
    const n = 2 + Math.floor(r() * 3)
    for (let c = 0; c < n; c++) {
      // a start on the crest near the top (either side), then down and outward, widening
      const side = c === 0 ? 1 : r() < 0.6 ? -1 : 1
      const k = Math.max(p.lo, Math.min(p.hi, p.i + Math.round(side * r() * (side > 0 ? p.hi - p.i : p.i - p.lo) * 0.35)))
      const [sx, sy] = crest[k], len = h * (0.35 + r() * 0.45)
      const ex = sx + side * len * (0.12 + r() * 0.3), ey = sy + len, wd = h * (0.04 + r() * 0.07)
      const mx = (sx + ex) / 2 + (r() - 0.5) * wd, my = (sy + ey) / 2
      d += `M ${sx} ${sy} L ${f0(mx)} ${f0(my)} L ${f0(ex)} ${f0(ey)} L ${f0(ex + wd)} ${f0(ey - wd * 0.3)} L ${f0(mx + wd * 0.6)} ${f0(my)} Z `
    }
  }
  return d
}

export type SnowShape = { amount: number; perPeak: boolean; style: MountainSnowStyle; edge: number; side: number }

// the snow: a clip region (one path) the range is painted through in snow colour. amount 0 to 1 (how far down);
// perPeak: every peak gets its own cap, as deep as the peak is tall (off: one line for the whole range, from its
// highest top); edge 0 to 1 (how marked the edge's style is); side 0 to 1 (0 both slopes alike, 1 only the lit
// slope). Styles: tongues (long tongues down the gullies), waves (a scalloped, rounded edge), soft (a gentle
// wave), streaks (bands along the lit slope), ridge (one band along each lit ridge)
export function snowRegion(rg: Ridge, s: SnowShape, seed: number) {
  if (s.amount <= 0 || !rg.peaks.length) return null
  const { crest, peaks, base, top } = rg
  const r = rng(seed)
  const lineOf = (p: Peak) => s.perPeak ? p.y + (base - p.y) * s.amount * 0.6 : top + (base - top) * s.amount * 0.6
  let d = ''
  if (s.style === 'streaks' || s.style === 'ridge') {
    for (const p of peaks) {
      const h = base - p.y
      if (s.perPeak ? false : lineOf(p) <= p.y) continue
      const th = 3 + h * (s.style === 'ridge' ? 0.05 + s.edge * 0.16 : 0.03 + s.edge * 0.09)
      const sides: [number, number][] = [[-1, 1], [1, 1 - s.side]]
      for (const [dir, k] of sides) {
        if (k <= 0.02) continue
        const end = dir < 0 ? p.lo : p.hi
        const span = Math.abs(end - p.i)
        if (span < 1) continue
        // the band along the ridge, from the top down `amount` of the slope
        d += band(crest, p.i, dir, Math.max(1, Math.round(span * Math.min(1, s.amount * 1.3) * k)), 0, th, true)
        if (s.style === 'streaks') {
          const n = 2 + Math.round(s.edge * 4)
          for (let b = 1; b <= n; b++) {
            const off = b * th * (1.5 + r() * 0.8), from = Math.round(span * r() * 0.25)
            const len = Math.round(span * Math.min(1, s.amount * 1.2) * k * (0.25 + r() * 0.6))
            if (off > h * 0.8 || len < 2) continue
            d += band(crest, p.i + dir * from, dir, len, off, th * (0.5 + r() * 0.5), false)
          }
        }
      }
    }
    return d || null
  }
  for (const p of peaks) {
    const y = lineOf(p), x0 = crest[p.lo][0], x1 = crest[p.hi][0]
    if (y <= p.y) continue
    const half = Math.max(1, x1 - p.x)
    // on the shaded slope the line climbs toward the top as `side` grows
    const lift = (x: number, yy: number) => x <= p.x ? yy : yy - s.side * (yy - p.y) * Math.min(1, Math.pow((x - p.x) / (half * 0.55), 0.7))
    const pts: [number, number][] = []
    const k1 = 0.004 + r() * 0.004, ph = r() * 6.28
    if (s.style === 'tongues' && s.edge > 0) {
      const tongue = 150 * s.edge
      for (let x = x1; x > x0;) {
        const b = y + 22 * Math.sin(x * k1 + ph)
        const gap = 40 + r() * 120, long = tongue * (0.1 + Math.pow(r(), 2) * 0.9), tip = 0.3 + r() * 0.4
        pts.push([x, lift(x, b - tongue * 0.08 * r())])
        const tx = Math.max(x0, x - gap * tip)
        pts.push([tx, lift(tx, b + long)])
        x -= gap
      }
    } else if (s.style === 'waves') {
      // hanging rounded lobes, every one its own width
      const deep = 6 + 40 * s.edge
      for (let x = x1; x > x0;) {
        const g = 40 + r() * 70, dd = deep * (0.6 + r() * 0.6)
        for (let q = 0; q <= 6; q++) {
          const xx = Math.max(x0, x - (g * q) / 6)
          pts.push([xx, lift(xx, y + 14 * Math.sin(xx * k1 + ph) + dd * Math.pow(Math.sin((Math.PI * q) / 6), 0.6))])
        }
        x -= g
      }
    } else {
      const a = s.style === 'soft' ? 10 + 30 * s.edge : 22
      for (let x = x1; x > x0; x -= 24) pts.push([x, lift(x, y + a * Math.sin(x * k1 + ph) + a * 0.4 * Math.sin(x * k1 * 3.1 + ph * 2))])
    }
    pts.push([x0, lift(x0, y)])
    d += `M ${x1} -6000 ${pts.map(([x, yy]) => `L ${f0(x)} ${f0(yy)}`).join(' ')} L ${x0} -6000 Z `
  }
  return d || null
}

// a band along the crest from index `from`, `len` samples in direction dir, `off` below the crest and `th` thick,
// tapering to a point at its far end (and at its near end unless it starts at the top, `cap`: then it reaches over
// the crest, which the range clips)
function band(crest: [number, number][], from: number, dir: number, len: number, off: number, th: number, cap: boolean) {
  const idx: number[] = []
  for (let k = 0; k <= len; k++) { const j = from + dir * k; if (j < 0 || j >= crest.length) break; idx.push(j) }
  if (idx.length < 2) return ''
  const n = idx.length - 1
  const topE = idx.map((j, k) => {
    const u = k / n, t = cap ? 1 - u : Math.sin(Math.PI * u)
    return [crest[j][0], crest[j][1] + off - (cap ? 80 : th * 0.5 * t)] as const
  })
  const botE = idx.map((j, k) => {
    const u = k / n, t = cap ? Math.pow(1 - u, 0.8) : Math.sin(Math.PI * u)
    return [crest[j][0], crest[j][1] + off + th * (cap ? t : 0.5 * t)] as const
  })
  return `M ${topE.map(([x, y]) => `${f0(x)} ${f0(y)}`).join(' L ')} L ${[...botE].reverse().map(([x, y]) => `${f0(x)} ${f0(y)}`).join(' L ')} Z `
}
