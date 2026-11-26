"use client"

// What an Ativador de grid de campo minado shows over the Pátio (lib/pigchicken/mine-activator-store.ts):
// - the count before the grid it turned on appears: 3, 2, 1, big in the middle of the screen, the size and colours of
//   the grid's numbers, and at each number the grid flashes where it will stand, so the players can move away;
// - a change of its grid options (a slam on it): the grid with the new block, gap and corners, 0.1 s at 0.3.
import { useEffect, useState, useSyncExternalStore } from "react"
import { MINE_ACTIVATOR_COUNT_MS, activatedMineGrid, type MineActivatorParams } from "@/lib/pigchicken/mine-activator"
import { mineActivatorStore } from "@/lib/pigchicken/mine-activator-store"
import { MINE_MARGIN, mineCellRect, mineGeometry, mineOutline, type MineGridParams } from "@/lib/pigchicken/mine-grid"
import { followCamera, liveCamera } from "@/lib/pigchicken/live-camera"
import { DIGIT_OUTLINE, NUMBER_COLORS } from "./mine-grid-layer"

// how long a change of options shows the grid, and how strongly; the count's flash at each number
const OPTIONS_FLASH = { ms: 100, opacity: 0.3 }
const COUNT_FLASH = { ms: 160, opacity: 0.45 }

type World = { width: number; top: number; ground: number }

// the blocks of a grid, where they will stand (world units, following the camera)
function GridFlash({ grid, world, opacity }: { grid: Pick<MineGridParams, "cell" | "gap" | "corner">; world: World; opacity: number }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  useEffect(() => (host ? followCamera(host) : undefined), [host])
  const g = mineGeometry(grid, { left: MINE_MARGIN.side, width: world.width - MINE_MARGIN.side * 2, top: world.top + MINE_MARGIN.top, ground: world.ground })
  const blocks: string[] = []
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const k = mineCellRect(g, c, r)
      blocks.push(mineOutline(g, r).map(([x, y]) => `${k.x + x},${k.y + y}`).join(" "))
    }
  }
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[205] overflow-hidden" style={{ opacity }}>
    <div ref={setHost} className="absolute left-0 top-0">
      <svg width={1} height={1} className="absolute left-0 top-0 overflow-visible">
        {blocks.map((points, i) => <polygon key={i} points={points} fill="rgba(255,255,255,0.55)" stroke="#ffffff" strokeWidth={4} />)}
      </svg>
    </div>
  </div>
}

export function MineActivatorOverlay({ saved, world }: { saved: MineGridParams | undefined; world: World }) {
  useSyncExternalStore(mineActivatorStore.subscribe, mineActivatorStore.version, mineActivatorStore.version)
  const start = mineActivatorStore.countStart, via = mineActivatorStore.via
  const changed = mineActivatorStore.optionsChanged
  const [now, setNow] = useState(() => performance.now())
  // while the count is on, or a change of options is showing: every frame
  const live = start !== null || (!!changed && now - changed.at < OPTIONS_FLASH.ms)
  useEffect(() => {
    if (!live) return
    let raf = 0
    const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live, changed])
  const out: React.ReactNode[] = []
  if (start !== null && via) {
    const grid = activatedMineGrid(saved, via, mineActivatorStore.pendingParams)
    const elapsed = now - start, left = Math.max(0, MINE_ACTIVATOR_COUNT_MS - elapsed)
    const n = Math.max(1, Math.ceil(left / 1000)), size = grid.cell * (liveCamera.zoom || 1)
    if (elapsed % 1000 < COUNT_FLASH.ms) out.push(<GridFlash key="count" grid={grid} world={world} opacity={COUNT_FLASH.opacity} />)
    out.push(<div key="n" aria-live="assertive" className="pointer-events-none fixed inset-0 z-[207] flex items-center justify-center">
      <span key={n} className="font-mono font-bold leading-none" style={{ fontSize: size * 0.5, color: NUMBER_COLORS[n], ...DIGIT_OUTLINE(size) }}>{n}</span>
    </div>)
  }
  if (changed && now - changed.at < OPTIONS_FLASH.ms) {
    const p: MineActivatorParams | undefined = mineActivatorStore.boxes.find(b => b.id === changed.id)?.params
    if (p) out.push(<GridFlash key="options" grid={activatedMineGrid(saved, "music", p)} world={world} opacity={OPTIONS_FLASH.opacity} />)
  }
  return <>{out}</>
}
