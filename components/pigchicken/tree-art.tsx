"use client"

import { memo, useMemo, type CSSProperties } from "react"
import { treeColor, treeFlowerColor, treeGeometry, treeSurfaces, type TreeParams, type TreePoint } from "@/lib/pigchicken/trees"
import { drawTreeFoliage } from "@/lib/pigchicken/tree-foliage"
import { SceneryWindBend } from "./scenery-wind-bend"

const q = (n: number) => Math.round(n * 10) / 10
const pathLines = (lines: TreePoint[][]) => lines.map(line => `M${line.map(p => p.join(",")).join("L")}`).join("")
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

function branchShape(points: TreePoint[], width: number) {
  const edges = (side: number) => points.map(([x, y], i): TreePoint => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const radius = (1 - i / (points.length - 1)) * width / 2 + .2
    const offset = side * radius / (Math.hypot(dx, dy) || 1)
    return [q(x - dy * offset), q(y + dx * offset)]
  })
  return `${pathLines([[...edges(1), ...edges(-1).reverse()]])}Z`
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
    branches: tree.crown === "fronds" ? "" : branches.map(points => branchShape(points, Math.max(1.35, tree.trunkWidth * .24))).join(""),
    bark: barkPath(tree, trunk),
    ...drawTreeFoliage(tree, crowns),
    floors: pathLines(contacts.floors), walls: pathLines(contacts.walls),
  }
}

export const CustomTreeArt = memo(function CustomTreeArt({ tree, animate = true, worldX }: { tree: TreeParams; animate?: boolean; worldX?: number }) {
  const art = useMemo(() => drawTree(tree), [tree])
  const barkShadow = treeColor(tree.barkColor, "#26212b", .35)
  const shadow = treeColor(tree.leafColor, "#252732", .36)
  const light = treeColor(tree.leafColor, tree.accentColor, .60)
  const flowers = treeFlowerColor(tree)
  const floweringColor = tree.style === "ipe" ? flowers : null
  const phase = (tree.seed % 97) / 10
  const trunkMoves = animate && !tree.climbTrunk && !tree.walkBranches && !tree.walkCrown
  const crownMoves = animate && !tree.walkCrown && !(tree.crown === "fronds" && tree.walkBranches)
  const response = tree.flip ? -1 : 1
  const origin = `${50 + tree.lean}% ${100 - tree.trunkHeight}%`
  const swing = (degrees: number, delay = phase) => ({
    "--tree-sway": `${degrees}deg`, animationDuration: `${tree.windPeriod}s`, animationDelay: `-${delay}s`,
  }) as CSSProperties
  return <svg aria-hidden="true" data-custom-tree className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
    <g transform={tree.flip ? "translate(100 0) scale(-1 1)" : undefined}>
      <path d={art.roots} fill={barkShadow} />
      <SceneryWindBend x={trunkMoves ? worldX : undefined} origin="50% 100%" response={response * .45}>
        <g className={trunkMoves && tree.trunkSway > 0 ? "custom-tree-trunk custom-tree-sway" : undefined} style={swing(tree.trunkSway)}>
          {art.branches && <path d={art.branches} fill={tree.barkColor} />}
          <path d={art.trunk} fill={tree.barkColor} />
          <path d={art.trunkShade} fill={barkShadow} opacity=".45" />
          {art.bark && <path d={art.bark} stroke={tree.bark === "paper" ? "#483c45" : barkShadow} strokeWidth={tree.bark === "paper" ? 1 : .65}
            fill="none" opacity=".75" strokeLinecap="round" />}
          <SceneryWindBend x={crownMoves ? worldX : undefined} origin={origin} response={response * .55}>
            <g className={crownMoves && tree.wind > 0 ? "custom-tree-crown custom-tree-sway" : undefined}
              style={{ ...swing(tree.wind, phase + .55), transformOrigin: origin }}>
              {art.shadows && <path d={art.shadows} fill={floweringColor ? treeColor(floweringColor, "#5d394d", .40) : shadow} />}
              <path d={art.leaves} fill={floweringColor ? treeColor(floweringColor, "#6e435b", .22) : tree.leafColor} />
              <path d={art.lights} fill={floweringColor ? treeColor(floweringColor, "#f5ead3", .26) : light} />
              {art.twigs && <path d={art.twigs} fill="none" stroke={light} strokeWidth={tree.crown === "fronds" ? .46 : .29}
                opacity=".65" strokeLinecap="round" strokeLinejoin="round" />}
              {flowers && art.flowers && <path d={art.flowers} fill={flowers} />}
            </g>
          </SceneryWindBend>
        </g>
      </SceneryWindBend>
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
          return <path key={i} d={d} fill={tree.effect === "petals" ? flowers ?? tree.accentColor : tree.accentColor}
            className={tree.effect === "pollen" ? "custom-tree-pollen" : undefined}
            style={{ animationDelay: `-${phase + i * 2.27}s`, animationDuration: `${6 + (i % 3)}s` }} />
        })}
      </g>}
    </g>
  </svg>
})

export function CustomTreeStyles() {
  return <style>{`
    .custom-tree-sway { transform-box: view-box; animation: custom-tree-sway ease-in-out infinite; }
    .custom-tree-trunk { transform-origin: 50% 100%; }
    .custom-tree-particles > path { animation: custom-tree-fall linear infinite; opacity: 0; }
    .custom-tree-particles > .custom-tree-pollen { animation-name: custom-tree-rise; }
    @keyframes custom-tree-sway { 0%, 100% { transform: skewX(calc(-1 * var(--tree-sway))); } 50% { transform: skewX(var(--tree-sway)); } }
    @keyframes custom-tree-fall { 0% { transform: translate(0, 0); opacity: 0; } 18%, 57% { opacity: .75; } 100% { transform: translate(-10px, 25px); opacity: 0; } }
    @keyframes custom-tree-rise { 0% { transform: translate(0, 0); opacity: 0; } 20%, 62% { opacity: .7; } 100% { transform: translate(12px, -11px); opacity: 0; } }
    @media (pointer: coarse) { .custom-tree-particles > path:nth-child(n+3) { display: none; } }
    @media (prefers-reduced-motion: reduce) { .custom-tree-sway { animation: none !important; } .custom-tree-particles { display: none; } }
  `}</style>
}
