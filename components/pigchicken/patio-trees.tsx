// Trees along the Pátio's scenes, in the Templo do Gongo's style (old courtyard pines with flat layered canopies and
// plum trees in blossom), each one a different random variation: lean, size, canopy layout and a shade of its
// palette. The randomness is seeded (the same trees on the server and in the browser, and for every player).
// They stand on the ground in the foreground, in front of her, half see-through (ParquinhoForeground). Each tree is its own small
// SVG so its breeze only repaints itself.
import { memo } from "react"
import { WORLD_GROUND_Y } from "@/lib/pigchicken/world"
import { defaultTrees } from "@/lib/pigchicken/layout"

type Rand = () => number
function rng(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(r: Rand, list: T[]) => list[Math.floor(r() * list.length)]
// rounded to a tenth: the same text on the server and in the browser
const q = (v: number) => Math.round(v * 10) / 10
const between = (r: Rand, a: number, b: number) => q(a + r() * (b - a))

// the temple's muted look (its tp-muted filter: less saturation, a little darker), baked into the colours
function mute(hex: string) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  const out = c.map((v, i) => Math.round(Math.max(0, Math.min(255, (l + (v - l) * 0.42) * (i === 2 ? 0.84 : 0.8)))))
  return `#${out.map(v => v.toString(16).padStart(2, "0")).join("")}`
}
const muted = (list: string[]) => list.map(mute)

// [shadow, canopy, light] greens and the trunks
const PINE_GREENS = [["#1c3328", "#264434", "#33573f"], ["#1a3a2c", "#24503a", "#3a6b4a"], ["#22352a", "#2f4a36", "#47664a"], ["#18302c", "#21463f", "#2f6157"]].map(muted)
const TRUNKS = muted(["#5a3a24", "#4a2f1e", "#6a4430", "#3f2a1c"])
// [deep, petal, highlight]
const BLOSSOMS = [["#e88aa8", "#f6aec4", "#ffd4e1"], ["#d9718f", "#ec96b0", "#fbc2d3"], ["#eea7b8", "#f8c6d2", "#fff0f4"], ["#c95c74", "#df8198", "#f4b1c1"]].map(muted)
const BLOSSOM_TRUNKS = muted(["#3b2418", "#2f1d14", "#4a2c1d"])

export type Tree = { kind: "pine" | "blossom"; x: number; h: number; flip: boolean; seed: number; delay: number }

// a pine: a crooked trunk that leans its own way, and 4 to 6 flat canopies stepping up it
function Pine({ seed }: { seed: number }) {
  const r = rng(seed)
  const [dark, mid, light] = pick(r, PINE_GREENS), trunk = pick(r, TRUNKS)
  const top = between(r, 330, 420), lean = between(r, -26, 26)
  const n = 4 + Math.floor(r() * 3)
  const pads = Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 0.4)
    const side = i % 2 === 0 ? -1 : 1
    const rad = between(r, 0.85, 1.15) * (80 - 40 * t)
    return { x: q(lean * t + side * between(r, 20, 70) * (1 - t * 0.6)), y: q(-top * t - 40 + between(r, -10, 10)), r: q(rad) }
  })
  pads.push({ x: lean, y: -top - 6, r: between(r, 36, 50) })
  const w = between(r, 9, 13)
  const branches = pads.slice(0, -1).map(p => `M ${lean * (-p.y / top)} ${p.y} Q ${(lean * (-p.y / top) + p.x) / 2} ${p.y - between(r, 2, 14)} ${p.x * 0.85} ${p.y}`).join(" ")
  return (
    <>
      <path d={`M ${-w} 0 C ${-w - 6} -90 ${lean * 0.3 + 18} -130 ${lean * 0.5} -200 C ${lean * 0.6 - 12} -250 ${lean + 18} -${top - 80} ${lean - 4} -${top} L ${lean + 8} -${top} C ${lean + 28} -${top - 80} ${lean * 0.6 + 4} -250 ${lean * 0.5 + 14} -200 C ${lean * 0.3 + 34} -130 ${w - 4} -90 ${w} 0 Z`} fill={trunk} />
      <path d={branches} stroke={trunk} strokeWidth={7} strokeLinecap="round" fill="none" />
      {pads.map((p, i) => (
        <g key={i}>
          <ellipse cx={p.x} cy={p.y + 6} rx={p.r} ry={p.r * 0.32} fill={dark} />
          <ellipse cx={p.x} cy={p.y} rx={p.r * 0.92} ry={p.r * 0.28} fill={mid} />
          <ellipse cx={p.x - p.r * 0.2} cy={p.y - 4} rx={p.r * 0.55} ry={p.r * 0.14} fill={light} />
        </g>
      ))}
    </>
  )
}

// a plum tree in blossom: a dark twisted trunk with 3 or 4 branches and 6 to 10 pink clouds of flowers
function Blossom({ seed }: { seed: number }) {
  const r = rng(seed)
  const [deep, petal, light] = pick(r, BLOSSOMS), trunk = pick(r, BLOSSOM_TRUNKS)
  const top = between(r, 230, 300)
  const nb = 3 + Math.floor(r() * 2)
  const branches = Array.from({ length: nb }, (_, i) => {
    const a = -Math.PI / 2 + (i - (nb - 1) / 2) * between(r, 0.45, 0.7)
    const len = between(r, 0.7, 1) * top
    const from = between(r, 40, 110)
    return { x0: between(r, -6, 6), y0: -from, x: q(Math.cos(a) * len * 0.6), y: q(-from + Math.sin(a) * (len - from * 0.4)), c: between(r, -40, 40) }
  })
  const n = 6 + Math.floor(r() * 5)
  const puffs = Array.from({ length: n }, (_, i) => {
    const b = branches[i % nb]
    return { x: b.x + between(r, -40, 40), y: b.y + between(r, -20, 40), r: between(r, 30, 60) }
  })
  return (
    <>
      <path d={`M -9 0 C -10 -40 -4 -80 0 -${top * 0.4} L 8 -${top * 0.4} C 10 -80 12 -40 11 0 Z`} fill={trunk} />
      <path d={branches.map(b => `M ${b.x0} ${b.y0} Q ${(b.x0 + b.x) / 2 + b.c} ${(b.y0 + b.y) / 2} ${b.x} ${b.y}`).join(" ")} stroke={trunk} strokeWidth={9} strokeLinecap="round" fill="none" />
      {puffs.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y + 4} r={p.r} fill={deep} />
          <circle cx={p.x - p.r * 0.15} cy={p.y - p.r * 0.1} r={p.r * 0.8} fill={petal} />
          <circle cx={p.x - p.r * 0.3} cy={p.y - p.r * 0.3} r={p.r * 0.35} fill={light} />
        </g>
      ))}
      {Array.from({ length: 4 }, (_, i) => <circle key={`p${i}`} className="pt-petal" style={{ animationDelay: `${-i * 2.1 - r() * 2}s` }} cx={puffs[i % n].x} cy={puffs[i % n].y + 20} r={4} fill={petal} />)}
    </>
  )
}

// the trees of a world `screens` scenes wide (the temple, after them, has its own): seeded in lib/pigchicken/layout.ts
export function treesFor(screens: number): Tree[] { return defaultTrees(screens) }

// the box each tree's SVG gets (tree units, base at 0 in the middle of the bottom)
export const TREE_BOX_W = 420, TREE_BOX_H = 480
const BOX_W = TREE_BOX_W, BOX_H = TREE_BOX_H

// one tree's art filling its box (w x h, base in the middle of the bottom); the Pátio's layout places it
export const TreeArt = memo(function TreeArt({ kind, seed, flip, delay = 0 }: { kind: Tree["kind"]; seed: number; flip?: boolean; delay?: number }) {
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full" style={{ overflow: "visible" }} viewBox={`${-BOX_W / 2} ${-BOX_H} ${BOX_W} ${BOX_H}`} preserveAspectRatio="none">
      <g transform={flip ? "scale(-1 1)" : undefined}>
        <g className="pt-tree" style={{ animationDelay: `${-delay}s` }}>
          {kind === "pine" ? <Pine seed={seed} /> : <Blossom seed={seed} />}
        </g>
      </g>
    </svg>
  )
})

// the trees' breeze and falling petals (once per page)
export function TreeStyles() {
  return (
    <style>{`
      .pt-tree { transform-box: fill-box; transform-origin: 50% 100%; animation: pt-breeze 7s ease-in-out infinite; }
      .pt-petal { animation: pt-fall 9s linear infinite; }
      @keyframes pt-breeze { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(-1deg); } }
      @keyframes pt-fall { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 0.8; } 100% { transform: translate(-90px, 170px) rotate(240deg); opacity: 0; } }
      @media (prefers-reduced-motion: reduce) { .pt-tree, .pt-petal { animation: none !important; } }
    `}</style>
  )
}

export const PatioTrees = memo(function PatioTrees({ screens }: { screens: number }) {
  return (
    <>
      <style>{`
        .pt-tree { transform-box: fill-box; transform-origin: 50% 100%; animation: pt-breeze 7s ease-in-out infinite; }
        .pt-petal { animation: pt-fall 9s linear infinite; }
        @keyframes pt-breeze { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(-1deg); } }
        @keyframes pt-fall { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 0.8; } 100% { transform: translate(-90px, 170px) rotate(240deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .pt-tree, .pt-petal { animation: none !important; } }
      `}</style>
      {treesFor(screens).map((t, i) => {
        const w = q(BOX_W * t.h), hh = q(BOX_H * t.h)
        return (
          <svg
            key={i}
            aria-hidden="true"
            className="absolute"
            style={{ left: q(t.x - w / 2), top: q(WORLD_GROUND_Y + 6 - hh), width: w, height: hh, overflow: "visible" }}
            viewBox={`${-BOX_W / 2} ${-BOX_H} ${BOX_W} ${BOX_H}`}
          >
            <g transform={t.flip ? "scale(-1 1)" : undefined}>
              <g className="pt-tree" style={{ animationDelay: `${-t.delay}s` }}>
                {t.kind === "pine" ? <Pine seed={t.seed} /> : <Blossom seed={t.seed} />}
              </g>
            </g>
          </svg>
        )
      })}
    </>
  )
})
