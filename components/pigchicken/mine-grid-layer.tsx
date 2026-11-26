"use client"

// The Grade de blocos in the Pátio (lib/pigchicken/mine-grid.ts): the rounds of this browser (useMineGrid starts
// them in lib/pigchicken/mine-grid-store.ts), what is seen of them and the walls the chicken's engine reads. Behind
// the Pátio's own elements: the numbers of the open blocks, so that a house in front of one hides it until one of this
// browser's players goes in (lib/pigchicken/house-rooms-store.ts). Behind the characters: the blocks, the bombs and
// the walls; in front of them: the veil over
// the other side's blocks, which hides whoever is there, and the face of every closed block (its seesaw, its cracks,
// its flag, its doubt and its detonator's count), which both sides see.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { requestGameFrame, cancelGameFrame } from "@/lib/game-frame"
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { stageHeight, stageWidth } from "@/lib/stage-size"
import { zoomedView } from "@/lib/pigchicken/viewport"
import type { LayoutElement } from "@/lib/pigchicken/layout"
import { houseRoomsStore } from "@/lib/pigchicken/house-rooms-store"
import { houseWallPolygon } from "@/lib/pigchicken/houses"
import { isFreeBlock } from "@/lib/pigchicken/spawn-portals"
import {
  MINE_MARGIN, bombsAround, createMineGrid, mineCell, mineCellRect, mineGeometry, mineNearestCell, mineOutline, minePlugs, mineSideNext, mineWallThickness, mineWalls,
  type MineCell, type MineGeo, type MineGrid, type MineGridParams, type MineSide, type MineSideState,
} from "@/lib/pigchicken/mine-grid"
import { mineStore, setMineParams, setMineSide, startMineRound } from "@/lib/pigchicken/mine-grid-store"
import { BOMB_USE_LABELS, mineHints, mineSpotOf } from "./mine-grid-play"
import { MINE_BOMB_BOX, mineBombSvg } from "@/lib/pigchicken/mine-bomb-art"
import { mineItemElements, mineItemSpots } from "@/lib/pigchicken/mine-items"
import { FollowLayer } from "./patio-layout"

// the round of the Pátio open: drawn again when another Pátio opens, when the grid's shape (its blocks' cut corners
// too), the chance of bombs, the seesaw's turn or the free blocks change, and on "Resetar grade". The other settings
// are read as the round goes.
export function useMineGrid({ patioKey, params, width, top, ground, portals }: {
  patioKey: string | null; params: MineGridParams | null; width: number; top: number; ground: number; portals: LayoutElement[]
}) {
  const [round, setRound] = useState(0)
  const seed = useMemo(() => Math.floor(Math.random() * 0x7fffffff), [patioKey, round])
  const cell = params?.cell, gap = params?.gap, corner = params?.corner, bombs = params?.bombs, turn = params?.turn
  const geo = useMemo(() => (cell === undefined || gap === undefined ? null : mineGeometry({ cell, gap, corner }, { left: MINE_MARGIN.side, width: width - MINE_MARGIN.side * 2, top: top + MINE_MARGIN.top, ground })), [cell, gap, corner, width, top, ground])
  // the blocks of the portals with "Bloco liberado"
  const free = geo ? [...new Set(portals.filter(isFreeBlock).map(p => { const s = mineNearestCell(geo, p.x + p.w / 2, p.y + p.h / 2); return `${s.c},${s.r}` }))].sort().join("|") : ""
  const grid = useMemo(
    () => (geo ? createMineGrid(geo, { bombs: bombs ?? 0, seed, turn, free: free ? free.split("|").map(k => { const [c, r] = k.split(",").map(Number); return { c, r } }) : [] }) : null),
    [geo, bombs, seed, free, turn],
  )
  useEffect(() => { startMineRound(grid); return () => startMineRound(null) }, [grid])
  useEffect(() => { setMineParams(params); return () => setMineParams(null) }, [params])
  return { grid, reset: () => setRound(n => n + 1) }
}

// "Spawn de itens": the Pátio's elements plus the platforms and items the blocks were born with (lib/pigchicken/
// mine-items.ts), for the game alone (the world, its colliders and the items lying in it). Each new round of this
// browser (or of the online owner's, mirrored here) puts them back, so the items taken come back with it.
export function useMineItems(elements: LayoutElement[], params: MineGridParams | null, geo: MineGeo | undefined): LayoutElement[] {
  const roundNo = useSyncExternalStore(mineStore.subscribe, () => mineStore.roundNo, () => 0)
  const items = params?.items
  const spots = useMemo(() => (geo && items ? mineItemSpots(geo, items) : []), [geo, items])
  return useMemo(() => (spots.length ? [...elements, ...mineItemElements(spots, roundNo)] : elements), [elements, spots, roundNo])
}

type View = { side: MineSide; c0: number; c1: number; r0: number; r1: number; near: string; hints: string }

// what changes as they move: the first local player's side, the blocks on the screen, the blocks around each local
// chicken (only those keep their walls in the DOM) and what each one could do at a bomb
function useMineView(grid: MineGrid | null, engine: ChickenEngine | null, extras: React.RefObject<Map<string, ChickenEngine>>) {
  const [view, setView] = useState<View>({ side: "open", c0: 0, c1: -1, r0: 0, r1: -1, near: "", hints: "" })
  useEffect(() => {
    if (!grid || !engine) return
    const g = grid.geo
    let raf = 0, key = ""
    // each local chicken's side, which is also her key for the walls between two closed blocks, and how many times
    // she had gone through one of them (a way into the gap other than that is a way out of the rooms, mineSideNext)
    const sides = new Map<ChickenEngine, MineSideState>(), names = new Set<string>(), crossed = new Map<ChickenEngine, number>()
    const spot = (who: string, e: ChickenEngine) => {
      // where she is: just off her feet, on the side of her body, whatever they are on (a floor, a wall or a
      // ceiling). Her feet never leave the space she is in, while her head can show through a wall or a low ceiling.
      const at = mineSpotOf(e)
      const was = sides.get(e), count = e.crossings(), now = mineSideNext(grid, at.x, at.y, was ?? { side: "open", crossed: false }, count !== (crossed.get(e) ?? count))
      crossed.set(e, count)
      sides.set(e, now)
      if (now.side !== was?.side) { e.setCrossKey(now.side); names.add(who); setMineSide(who, now.side) }
      return at
    }
    const frame = () => {
      raf = requestGameFrame(frame)
      const me = spot("p1", engine), side = sides.get(engine)?.side ?? "open"
      const v = zoomedView(stageWidth(), stageHeight(), liveCamera.zoom)
      const left = v.x + liveCamera.x, topY = v.y - liveCamera.y
      const c0 = Math.max(0, Math.floor((left - g.x0) / g.step) - 1), c1 = Math.min(g.cols - 1, Math.floor((left + v.w - g.x0) / g.step) + 1)
      const r1 = Math.min(g.rows - 1, Math.floor((g.ground - topY) / g.step) + 1), r0 = Math.max(0, Math.floor((g.ground - topY - v.h) / g.step) - 1)
      const near = [me, ...[...(extras.current?.entries() ?? [])].map(([id, e]) => spot(id, e))].map(p => { const s = mineNearestCell(g, p.x, p.y); return `${s.c},${s.r}` })
      const hints = [...mineHints.values()].map(h => `${h.use ? `${h.use.at.c},${h.use.at.r},${h.use.use}` : ""}/${h.install ? `${h.install.c},${h.install.r}` : ""}`).join(";")
      const next = `${side}|${c0}|${c1}|${r0}|${r1}|${[...new Set(near)].sort().join(";")}|${hints}`
      if (next === key) return
      key = next
      setView({ side, c0, c1, r0, r1, near: [...new Set(near)].sort().join(";"), hints })
    }
    raf = requestGameFrame(frame)
    return () => { cancelGameFrame(raf); sides.forEach((_, e) => e.setCrossKey(null)); names.forEach(who => setMineSide(who, null)) }
  }, [grid, engine, extras])
  return view
}

// the classic colours of the numbers, light enough for the Pátio's dusk
export const NUMBER_COLORS = ["", "#7cc4ff", "#7be08a", "#ff7a7a", "#c9a2ff", "#ffb35c", "#5fe0d8", "#f4f1e8", "#b9c7b9"]
// how many blocks around a chicken keep their walls for the engine
const WALL_REACH = 2
// the cracks of a damaged block, in a square of 100: the more red, the more of them show
const CRACKS = [
  "M50 0 L46 14 L55 24 L49 38", "M0 62 L15 58 L24 66 L38 60", "M100 30 L86 36 L80 28 L66 34", "M30 100 L34 86 L26 76 L33 64",
  "M49 38 L58 47 L52 58 L62 66", "M38 60 L46 52 L52 58", "M66 34 L58 47", "M33 64 L44 70 L52 58", "M62 66 L74 62 L82 72 L100 68", "M62 66 L66 80 L60 100",
  "M55 24 L68 18 L74 6", "M24 66 L18 80 L6 86",
]

// the face of a closed block: the seesaw (blue from one edge, red from the other one), the cracks of its damage, the
// yellow over a flag, and at its middle the flag, the doubt and the detonator's count. Over a veil for whoever is
// outside; for whoever is inside it is a light tint, and they see the room through it.
function Face({ k, x, y, size, p, veil, clip }: { k: MineCell; x: number; y: number; size: number; p: MineGridParams; veil: boolean; clip?: string }) {
  // "Opacidade das paredes": how much of what is behind the veil it covers
  const turn = k.turn ?? 0, blue = Math.max(0, k.gauge), red = Math.max(0, -k.gauge)
  const fill = (deg: number, color: string, part: number) => `linear-gradient(${deg}deg, ${color} 0 ${part * 100}%, transparent ${part * 100}%)`
  const shown = Math.ceil(red * CRACKS.length)
  return (
    <div className="absolute overflow-hidden" style={{ left: x, top: y, width: size, height: size, clipPath: clip }}>
      {veil && p.wallOpacity > 0 && <div className="absolute inset-0" style={{ background: p.grey, opacity: p.wallOpacity / 100 }} />}
      {blue > 0 && <div className="absolute inset-0" style={{ background: fill(turn, p.blue, blue), opacity: veil ? 1 : 0.4 }} />}
      {red > 0 && <div className="absolute inset-0" style={{ background: fill(turn + 180, p.red, red), opacity: veil ? 1 : 0.4 }} />}
      {k.flag && k.yellow > 0 && <div className="absolute inset-0" style={{ background: fill(turn, p.orange, k.yellow), opacity: veil ? 0.9 : 0.5 }} />}
      {shown > 0 && <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none" stroke="#14181d" strokeWidth={1.4} strokeLinejoin="round" opacity={0.75}>
        {CRACKS.slice(0, shown).map(d => <path key={d} d={d} vectorEffect="non-scaling-stroke" />)}
      </svg>}
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-bold leading-none" style={{ gap: size * 0.03 }}>
        {k.flag && <svg viewBox="0 0 40 48" style={{ width: size * 0.3, height: size * 0.36 }}>
          <path d="M12 4 L12 44" stroke="#14181d" strokeWidth={3.5} strokeLinecap="round" />
          <path d="M13 5 L36 13 L13 22 Z" fill="#f4f1e8" stroke="#14181d" strokeWidth={2} strokeLinejoin="round" />
          <path d="M5 44 L20 44" stroke="#14181d" strokeWidth={3.5} strokeLinecap="round" />
        </svg>}
        {k.doubt && <span style={{ fontSize: size * 0.46, color: p.orange, textShadow: "0 2px 0 #14181d" }}>?</span>}
        {k.fuse !== null && <span style={{ fontSize: size * 0.2, color: "#fff", background: p.red, borderRadius: size, padding: `${size * 0.02}px ${size * 0.06}px` }}>{Math.max(0, Math.ceil(k.fuse))}</span>}
      </div>
    </div>
  )
}

// the bomb of a block (lib/pigchicken/mine-bomb-art.ts). Armed: the timer lit, with the seconds its detonator has
// left (the "Tempo do detonador" while nobody pressed it) and a glow in the damage's colour; disarmed: grey, the
// timer off and a wire cut
const BOMB_W = 0.36
function Bomb({ k, size, p }: { k: MineCell; size: number; p: MineGridParams }) {
  const [, , bw, bh] = MINE_BOMB_BOX, w = size * BOMB_W
  const svg = useMemo(() => mineBombSvg(k.armed ? { time: k.fuse ?? p.fuse } : {}), [k.armed, k.fuse === null ? p.fuse : Math.ceil(k.fuse)])
  return <svg viewBox={MINE_BOMB_BOX.join(" ")} width={w} height={(w * bh) / bw} style={{ filter: k.armed ? `drop-shadow(0 0 ${Math.max(3, size * 0.02)}px ${p.red})` : "grayscale(0.9)" }} dangerouslySetInnerHTML={{ __html: svg }} />
}

// a block's outline with its corners cut ("Cantos em octógono"), for a CSS clip-path and for an SVG path; and the
// ring of its walls (the outline and, the other way round, the room inside)
const outlinePath = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x} ${y}`).join("L")}Z`
function blockShapes(g: MineGeo, r: number, t: number) {
  const outer = mineOutline(g, r), inner = mineOutline(g, r, t)
  return { clip: `polygon(${outer.map(([x, y]) => `${x}px ${y}px`).join(",")})`, outer: outlinePath(outer), walls: `${outlinePath(outer)}${outlinePath(inner)}` }
}

// the number of an open block, with a dark outline so that its light colour reads over any sky
export const DIGIT_OUTLINE = (size: number) => { const w = Math.max(2, Math.round(size * 0.012)); return { WebkitTextStroke: `${w * 2}px #14181dcc`, paintOrder: "stroke fill" } as const }
function Digit({ x, y, size, count }: { x: number; y: number; size: number; count: number }) {
  return <div className="absolute flex items-center justify-center font-mono font-bold" style={{ left: x, top: y, width: size, height: size, fontSize: size * 0.5, color: NUMBER_COLORS[count], ...DIGIT_OUTLINE(size) }}>{count}</div>
}

// houses: the Pátio's houses in the world's units (a number shows again inside the ones open on this screen)
export function MineGridLayer({ pass, engine, extras, worldRef, width, opacity, houses }: {
  pass: boolean; engine: ChickenEngine | null; extras: React.RefObject<Map<string, ChickenEngine>>
  worldRef: React.RefObject<HTMLDivElement | null>; width: number; opacity: number; houses?: readonly LayoutElement[]
}) {
  // the round changes in place: `version` says when to look at it again
  const version = useSyncExternalStore(mineStore.subscribe, mineStore.version, () => 0)
  const grid = mineStore.round?.grid ?? null, p = mineStore.params
  const view = useMineView(grid, engine, extras)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  // the world's place for the numbers, behind the Pátio's own elements (ParquinhoWorld)
  const [under, setUnder] = useState<HTMLElement | null>(null)
  // looked for again whenever the round changes, so that a world drawn again never keeps the numbers in a place gone
  // from the page
  useEffect(() => { setHost(worldRef.current); setUnder(worldRef.current?.querySelector<HTMLElement>("[data-mine-numbers]") ?? null) }, [worldRef, grid, version])
  const openHouses = useSyncExternalStore(houseRoomsStore.subscribe, () => houseRoomsStore.open, () => houseRoomsStore.open)
  const walls = useMemo(() => {
    if (!grid || !pass || !view.near) return []
    const near = view.near.split(";").map(k => k.split(",").map(Number))
    const close = (c: number, r: number) => near.some(([nc, nr]) => Math.abs(c - nc) <= WALL_REACH && Math.abs(r - nr) <= WALL_REACH)
    // a wall with a closed room behind it lets the closed side through (`data-chicken-cross`, Chocar + Pulo); the
    // plugs of the narrow gaps count only for the bodies that do not fit in them (`data-chicken-fit`); all of them
    // are one solid for the engine (`data-chicken-fused`)
    return [
      ...mineWalls(grid, close).map(w => ({ ...w, fit: undefined as number | undefined, cross: w.cross ? `closed,${w.cross}${w.skip ? `,${w.skip}` : ""}` : undefined })),
      ...minePlugs(grid, close).map(p => ({ ...p, shape: undefined as [number, number][] | undefined, cross: undefined as string | undefined })),
    ]
  }, [grid, pass, view.near, version])
  const cells = useMemo(() => {
    if (!grid) return []
    const out: { c: number; r: number; x: number; y: number; k: MineCell; count: number }[] = []
    for (let r = view.r0; r <= view.r1; r++) for (let c = view.c0; c <= view.c1; c++) {
      const k = mineCell(grid, c, r)
      if (!k) continue
      const b = mineCellRect(grid.geo, c, r)
      out.push({ c, r, x: b.x, y: b.y, k, count: k.open ? bombsAround(grid, c, r) : 0 })
    }
    return out
  }, [grid, view.c0, view.c1, view.r0, view.r1, version])
  if (!grid || !host || !p) return null
  const size = grid.geo.cell, t = mineWallThickness(grid.geo), mine = view.side, debug = mineStore.debug, front = mineStore.numbersFront
  // with cut corners: the blocks' shape (the bottom row keeps its bottom corners)
  const cutShapes = grid.geo.cut > 0 ? [blockShapes(grid.geo, 0, t), blockShapes(grid.geo, 1, t)] : null
  const shapeOf = (r: number) => cutShapes?.[r === 0 ? 0 : 1]
  // what the local players could do now: Usar at a bomb (the word over it), the block a bomb would go in
  const hints = view.hints ? view.hints.split(";").map(h => h.split("/")) : []
  const uses = new Map(hints.filter(h => h[0]).map(h => { const [c, r, use] = h[0].split(","); return [`${c},${r}`, use as keyof typeof BOMB_USE_LABELS] }))
  const installs = new Set(hints.map(h => h[1]).filter(Boolean))
  // the numbers, for whoever is on the open side (with "Mostrar números", for both sides, in front of everything)
  const digits = front || mine === "open" ? cells.filter(cell => cell.k.open && cell.count > 0) : []
  // behind the Pátio's elements, unless "Mostrar números" brings them to the front
  const behind = front ? [] : digits
  // the houses a local player is in: their walls are gone, so the numbers behind them show
  const entered = behind.length ? (houses ?? []).filter(el => openHouses.has(el.id)) : []
  return <>
    {under && opacity > 0 && createPortal(<div aria-hidden="true" className="absolute inset-0" style={{ opacity }}>
      {behind.map(({ c, r, x, y, count }) => <Digit key={`${c},${r}`} x={x} y={y} size={size} count={count} />)}
    </div>, under)}
    {createPortal(<>
      {/* over the veil that darkens the scenery while someone is inside a house (components/pigchicken/house-dusk.tsx) */}
      {opacity > 0 && <div aria-hidden="true" data-mine-grid className="pointer-events-none absolute inset-0" style={{ opacity, zIndex: 2 }}>
        {cells.map(({ c, r, x, y, k, count }) => k.open
          // an open block: the mark of the bomb that went off there (its number is behind the Pátio's elements, or
          // here in a world without that place)
          ? <div key={`${c},${r}`} className={`absolute flex items-center justify-center font-mono font-bold${cutShapes ? "" : " rounded-sm border border-dashed border-white/10"}`}
            style={{ left: x, top: y, width: size, height: size, fontSize: size * 0.5, color: NUMBER_COLORS[count], background: k.crater ? "radial-gradient(circle, #14181dcc 0 22%, #14181d55 38%, transparent 62%)" : undefined }}>
            {cutShapes && <svg className="absolute inset-0 h-full w-full" fill="none" stroke="#ffffff1a" strokeWidth={1} strokeDasharray="3 3"><path d={shapeOf(r)!.outer} /></svg>}
            {!under && !front && mine === "open" && count > 0 ? <span style={DIGIT_OUTLINE(size)}>{count}</span> : null}
          </div>
          // a closed block: its walls, and its bomb for whoever is on the closed side (a disarmed one is grey, with
          // no spark)
          : <div key={`${c},${r}`} className="absolute flex items-center justify-center" style={{ left: x, top: y, width: size, height: size }}>
            {p.wallOpacity > 0 && (cutShapes
              ? <svg className="absolute inset-0 h-full w-full" style={{ opacity: p.wallOpacity / 100 }}><path d={shapeOf(r)!.outer} fill={`${p.grey}40`} /><path d={shapeOf(r)!.walls} fill="#5b6470" fillRule="evenodd" /></svg>
              : <div className="absolute inset-0" style={{ background: `${p.grey}40`, boxShadow: `inset 0 0 0 ${t}px #5b6470`, opacity: p.wallOpacity / 100 }} />)}
            {mine === "closed" && k.bomb && <span className="relative flex">
              <Bomb k={k} size={size} p={p} />
              {uses.has(`${c},${r}`) && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[13px] font-bold text-white" style={{ bottom: "118%", textShadow: "0 1px 0 #14181d" }}>{BOMB_USE_LABELS[uses.get(`${c},${r}`)!]}</span>}
            </span>}
          </div>)}
        {/* inside a house a local player is in: the numbers behind it, over its inside (within its walls) */}
        {under && entered.map(el => <div key={`h${el.id}`} className="absolute overflow-hidden" style={{ left: el.x, top: el.y, width: el.w, height: el.h, clipPath: el.params.house ? `polygon(${houseWallPolygon(el.params.house).map(([x, y]) => `${x}% ${y}%`).join(",")})` : undefined }}>
          {behind.filter(d => d.x < el.x + el.w && d.x + size > el.x && d.y < el.y + el.h && d.y + size > el.y).map(({ c, r, x, y, count }) => <Digit key={`${c},${r}`} x={x - el.x} y={y - el.y} size={size} count={count} />)}
        </div>)}
      </div>}
      {/* the walls near the local chickens, for the engine: hard on every side */}
      <div data-chicken-platforms className="pointer-events-none absolute inset-0">
        {walls.map(w => <div key={w.id} data-chicken-id={w.id} data-chicken-depth={0} data-chicken-world-box={`${w.x},${w.y},${w.w},${w.h}`}
          data-chicken-shape={w.shape ? w.shape.map(([x, y]) => `${x},${y}`).join(" ") : `0,0 ${w.w},0 ${w.w},${w.h} 0,${w.h}`} data-chicken-hard=""
          data-chicken-fused={w.shape ? undefined : w.group} data-chicken-join={w.shape ? w.group : undefined} data-chicken-nearby data-chicken-fit={w.fit} data-chicken-cross={w.cross} className="absolute" />)}
      </div>
    </>, host)}
    {/* over the characters: the other side's blocks are covered, with whoever is in them; every closed block shows its face */}
    {opacity > 0 && <FollowLayer z={203} width={width}>
      <div aria-hidden="true" data-mine-faces style={{ opacity: Math.min(1, opacity + 0.35) }}>
        {cells.map(({ c, r, x, y, k }) => k.open
          ? mine === "closed" && <div key={`${c},${r}`} className="absolute bg-[#0e1512]" style={{ left: x, top: y, width: size, height: size, clipPath: shapeOf(r)?.clip }} />
          : <Face key={`${c},${r}`} k={k} x={x} y={y} size={size} p={p} veil={mine === "open"} clip={shapeOf(r)?.clip} />)}
        {/* "Mostrar números": the numbers of the open blocks over everything, the veils included */}
        {front && digits.map(({ c, r, x, y, count }) => <Digit key={`d${c},${r}`} x={x} y={y} size={size} count={count} />)}
        {/* the admin's debug (Configurações do Pátio → Grade de blocos): the bombs and the numbers of every block */}
        {debug.bombs && cells.filter(({ k }) => !k.open && k.bomb).map(({ c, r, x, y, k }) => <span key={`b${c},${r}`} className="absolute flex items-center justify-center" style={{ left: x, top: y, width: size, height: size }}><Bomb k={k} size={size} p={p} /></span>)}
        {debug.numbers && cells.map(({ c, r, x, y }) => <span key={`n${c},${r}`} className="absolute rounded-sm bg-black/70 px-1 font-mono font-bold text-white" style={{ left: x + 6, top: y + 6, fontSize: Math.max(12, size * 0.07) }}>{bombsAround(grid, c, r)}</span>)}
        {/* the open block a bomb in the wing would close */}
        {cells.filter(({ c, r }) => installs.has(`${c},${r}`)).map(({ c, r, x, y }) => cutShapes
          ? <svg key={`i${c},${r}`} className="absolute" style={{ left: x, top: y, width: size, height: size }} fill="none" stroke={p.red} strokeWidth={2} strokeDasharray="6 5"><path d={shapeOf(r)!.outer} /></svg>
          : <div key={`i${c},${r}`} className="absolute border-2 border-dashed" style={{ left: x, top: y, width: size, height: size, borderColor: p.red }} />)}
      </div>
    </FollowLayer>}
  </>
}
