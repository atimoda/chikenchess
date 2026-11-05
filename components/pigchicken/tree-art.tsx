"use client"

import { memo, useMemo, type CSSProperties } from "react"
import { treeColor, treeGeometry, treeSurfaces, type TreeParams, type TreePoint } from "@/lib/pigchicken/trees"

const q = (n: number) => Math.round(n * 10) / 10
const pathLines = (lines: TreePoint[][]) => lines.map(line => `M${line.map(p => p.join(",")).join("L")}`).join("")
type Crown = ReturnType<typeof treeGeometry>["crowns"][number]

function ellipsePath({ x, y, rx, ry, tilt }: Crown) {
  const radians = tilt * Math.PI / 180
  const dx = rx * Math.cos(radians), dy = rx * Math.sin(radians)
  const left = `${q(x - dx)},${q(y - dy)}`, right = `${q(x + dx)},${q(y + dy)}`
  const arc = `A${q(rx)},${q(ry)} ${tilt} 1 0 `
  return `M${left}${arc}${right}${arc}${left}Z`
}

function barkPath(tree: TreeParams, trunk: TreePoint[]) {
  const [base, tip, farTip, farBase] = trunk
  const at = (along: number, across: number) => {
    const edge = base[0] + (tip[0] - base[0]) * along
    const width = (farBase[0] - base[0]) * (1 - along) + (farTip[0] - tip[0]) * along
    return `${q(edge + width * across)},${q(100 - tree.trunkHeight * along)}`
  }
  switch (tree.bark) {
    case "smooth": return ""
    case "grooves": return [0.23, 0.45, 0.74].map((t, i) => `M${at(0.04, t)}Q${at(.51, t + .12)} ${at(.92 - i * .08, t)}`).join("")
    case "rings":
    case "paper": return Array.from({ length: 9 }, (_, i) => {
      const along = (i + 1) / 10
      const across = tree.bark === "paper" ? (i % 3) * .24 + .07 : .05
      return `M${at(along, across)}L${at(along + .012, tree.bark === "paper" ? across + .36 : .95)}`
    }).join("")
  }
}

function drawTree(tree: TreeParams) {
  const geometry = treeGeometry(tree)
  const { trunk, branches, crowns } = geometry
  const [, tip, farTip, farBase] = trunk
  const contacts = treeSurfaces(tree, geometry)
  return {
    crowns, trunk: `${pathLines([trunk])}Z`, trunkShade: pathLines([[
      [50, 100], [q((tip[0] + farTip[0]) / 2), tip[1]], farTip, farBase,
    ]]) + "Z",
    roots: `M${trunk[0][0] - 3},100L${trunk[0][0] + 1},95L50,98L${farBase[0] - 1},94L${farBase[0] + 4},100Z`,
    branches: pathLines(branches), bark: barkPath(tree, trunk),
    shadow: crowns.map(p => ellipsePath({ ...p, y: p.y + 1 })).join(""),
    leaf: crowns.map(p => ellipsePath({ ...p, rx: p.rx * .94, ry: p.ry * .9 })).join(""),
    light: crowns.map(p => ellipsePath({ ...p, x: p.x - p.rx * .16, y: p.y - p.ry * .16, rx: p.rx * .55, ry: p.ry * .48 })).join(""),
    detail: crowns.map(p => `M${q(p.x - p.rx * .35)},${q(p.y)}q${q(p.rx * .28)},${q(-p.ry * .41)} ${q(p.rx * .63)},${q(-p.ry * .26)}`).join(""),
    floors: pathLines(contacts.floors), walls: pathLines(contacts.walls),
  }
}

export const CustomTreeArt = memo(function CustomTreeArt({ tree, animate = true }: { tree: TreeParams; animate?: boolean }) {
  const art = useMemo(() => drawTree(tree), [tree])
  const barkShadow = treeColor(tree.barkColor, "#26212b", .35)
  const shadow = treeColor(tree.leafColor, "#252732", .40)
  const light = treeColor(tree.leafColor, tree.accentColor, .52)
  const phase = (tree.seed % 97) / 10
  return <svg aria-hidden="true" data-custom-tree className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
    <g transform={tree.flip ? "translate(100 0) scale(-1 1)" : undefined}>
      <path d={art.roots} fill={barkShadow} />
      <path d={art.branches} fill="none" stroke={tree.barkColor} strokeWidth={Math.max(1.25, tree.trunkWidth / 5)} strokeLinecap="round" strokeLinejoin="round" />
      <path d={art.trunk} fill={tree.barkColor} />
      <path d={art.trunkShade} fill={barkShadow} opacity=".45" />
      {art.bark && <path d={art.bark} stroke={tree.bark === "paper" ? "#483c45" : barkShadow} strokeWidth={tree.bark === "paper" ? 1 : .65}
        fill="none" opacity=".75" strokeLinecap="round" />}
      <g className={animate && tree.wind > 0 && !tree.walkCrown ? "custom-tree-wind" : undefined}
        style={{ "--tree-sway": `${tree.wind}deg`, animationDuration: `${tree.windPeriod}s`, animationDelay: `-${phase}s` } as CSSProperties}>
        <path d={art.shadow} fill={shadow} />
        <path d={art.leaf} fill={tree.leafColor} />
        <path d={art.light} fill={light} />
        <path d={art.detail} fill="none" stroke={tree.accentColor} opacity=".46" strokeWidth=".52" strokeLinecap="round" />
      </g>
      {art.walls && <path d={art.walls} fill="none" stroke="#dfc598" strokeWidth="1.6" opacity=".75" vectorEffect="non-scaling-stroke" />}
      {art.floors && <>
        <path d={art.floors} fill="none" stroke="#35303b" strokeWidth="3.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={art.floors} fill="none" stroke="#ffe2a9" strokeWidth="1.65" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </>}
      {animate && tree.effect !== "none" && tree.particles > 0 && <g className="custom-tree-particles">
        {Array.from({ length: tree.particles }, (_, i) => {
          const p = art.crowns[(i * 3 + tree.seed) % art.crowns.length]
          const x = p.x, y = p.y + p.ry * .5
          const d = tree.effect === "pollen" ? `M${x},${y}m-1,0a1,1 0 1,0 2,0a1,1 0 1,0 -2,0`
            : tree.effect === "petals" ? `M${x},${y}q-2,-1 -2,-3q2,-1 3,1q2,-1 3,1q-1,2 -4,2Z`
            : `M${x},${y}q-1,-3 3,-5q2,3 -3,5Z`
          return <path key={i} d={d} fill={tree.accentColor} className={tree.effect === "pollen" ? "custom-tree-pollen" : undefined}
            style={{ animationDelay: `-${phase + i * 2.27}s`, animationDuration: `${6 + (i % 3)}s` }} />
        })}
      </g>}
    </g>
  </svg>
})

export function CustomTreeStyles() {
  return <style>{`
    .custom-tree-wind { transform-box: fill-box; transform-origin: 50% 100%; animation: custom-tree-sway ease-in-out infinite; }
    .custom-tree-particles > path { animation: custom-tree-fall linear infinite; opacity: 0; }
    .custom-tree-particles > .custom-tree-pollen { animation-name: custom-tree-rise; }
    @keyframes custom-tree-sway { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(var(--tree-sway)); } }
    @keyframes custom-tree-fall { 0% { transform: translate(0, 0); opacity: 0; } 18%, 57% { opacity: .75; } 100% { transform: translate(-10px, 25px); opacity: 0; } }
    @keyframes custom-tree-rise { 0% { transform: translate(0, 0); opacity: 0; } 20%, 62% { opacity: .7; } 100% { transform: translate(12px, -11px); opacity: 0; } }
    @media (pointer: coarse) { .custom-tree-particles > path:nth-child(n+3) { display: none; } }
    @media (prefers-reduced-motion: reduce) { .custom-tree-wind { animation: none !important; } .custom-tree-particles { display: none; } }
  `}</style>
}
