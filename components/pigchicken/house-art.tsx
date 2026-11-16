"use client"

import { memo, useId, useSyncExternalStore } from 'react'
import {
  HOUSE_BASE, houseOpenings, houseRandom, houseRoof, houseWallPolygon, houseWallTexture, openingGeometry, type HouseParams,
} from '@/lib/pigchicken/houses'
import { houseInterior } from '@/lib/pigchicken/house-rooms'
import { houseRoomsStore } from '@/lib/pigchicken/house-rooms-store'

type Tile = { w: number; h: number; dark: string; light?: string; stroke?: number }

const PAPER_TILE: Tile = {
  w: 5, h: 4, stroke: .15,
  dark: 'M.3 .6h.21M1.4 .2l.18 .12M2.6 .6h.22M4.2 .4l.21 .1M.8 1.6l.25-.08M1.9 1.1h.25M3 1.45h.28M4.6 1.32h.2M.45 2.8h.22M2.28 2.17h.19M3.55 2.38l.2 .11M4.8 2.9h.15M1.3 3.65h.27M2.74 3.48h.17M3.9 3.6l.18-.1',
  light: 'M.8 .22h.25M2.16 .36h.2M3.44 .73h.21M4.7 .9h.2M.15 1.8h.25M1.68 1.75h.25M2.5 1.15h.21M3.7 1.55l.23 .08M4.29 2.14h.27M.98 2.71h.24M1.7 2.92h.21M3.02 2.84h.24M3.8 3.07h.21M.4 3.63h.2M4.63 3.7h.27',
}

const WALL_TILES: Record<Exclude<ReturnType<typeof houseWallTexture>, 'smooth'>, Tile> = {
  plaster: { w: 28, h: 24, dark: 'M2 6l6-1 2 2-7 2zM19 14l4-1 3 3-7 1zM6 22l2-1 2 1', light: 'M14 2l5 1M10 13l4-1M21 22l4-1' },
  canvas: { w: 8, h: 7, dark: 'M0 1h8M2 4h5M1 0v7M6 3v4', light: 'M0 2h8M2 0v7' },
  paper: PAPER_TILE,
  clapboard: { w: 36, h: 7, dark: 'M0 6h36M4 3l8-.5m8 1 9-.5', light: 'M0 0h36' },
  boards: { w: 12, h: 32, dark: 'M1 0v32M7 3l-1 7 1 4m2 4v7', light: 'M2 0v32' },
  corrugated: { w: 6, h: 24, dark: 'M1 0v24', light: 'M3 0v24' },
  brick: { w: 21, h: 12, dark: 'M0 0h21M0 6h21M6 0v6m10 0v6', light: 'M0 1h21M0 7h21' },
  stone: { w: 29, h: 19, dark: 'M0 7l9 2 10-2 10 1M0 16l8-2 12 2 9-1M4 0l2 8m12 0-2 8m9 0 1 3', light: 'M7 10l10-1m4 8 7-1' },
}
const ROOF_TILES: Record<Exclude<HouseParams['roofTexture'], 'plain'>, Tile> = {
  tile: { w: 14, h: 7, dark: 'M0 6Q3.5 8 7 6T14 6M3.5 0v7m7-7v7', light: 'M1 1v4m7-4v4' },
  slate: { w: 15, h: 8, dark: 'M0 0h15M0 4h15M4 0v4m8 0v4', light: 'M0 1h15M0 5h15' },
  scales: { w: 12, h: 8, dark: 'M0 0q3 6 6 0 3 6 6 0M-3 4q3 6 6 0 3 6 6 0 3 6 6 0', light: 'M1 1q2 3 4 0m2 0q2 3 4 0' },
  diamond: { w: 12, h: 10, dark: 'M0 5l6-5 6 5-6 5z', light: 'M0 5l6-5 6 5' },
  stripes: { w: 10, h: 7, dark: 'M0 2h10M0 5h10', light: 'M0 3h10' },
  paper: PAPER_TILE,
}

function Pattern({ id, tile, offset = 0 }: { id: string; tile: Tile; offset?: number }) {
  return <pattern id={id} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse" x={offset} y={offset}>
    <path d={tile.dark} fill="none" stroke="#201c28" strokeWidth={tile.stroke ?? .55} />
    {tile.light && <path d={tile.light} fill="none" stroke="#fff0d6" strokeWidth={tile.stroke ?? .65} opacity=".55" />}
  </pattern>
}

function shade(color: string, toward: string, amount: number) {
  const parts = [1, 3, 5].map(i => Math.round(Number.parseInt(color.slice(i, i + 2), 16) * (1 - amount) + Number.parseInt(toward.slice(i, i + 2), 16) * amount))
  return `rgb(${parts.join(',')})`
}

function weathering(seed: number) {
  const rand = houseRandom(seed ^ 0xe17b90ac)
  let stains = '', marks = ''
  for (let i = 0; i < 14; i++) {
    const x = 8 + rand() * 82, y = 24 + rand() * 72, w = 2 + rand() * 9, h = 1 + rand() * 7
    stains += `M${x.toFixed(1)} ${y.toFixed(1)}l${w.toFixed(1)} -1 -2 ${h.toFixed(1)} -3 -1z`
    if (i < 7) marks += `M${x.toFixed(1)} ${y.toFixed(1)}l-1 3 1 2-2 4`
  }
  return { stains, marks }
}

type Opening = ReturnType<typeof openingGeometry>

function OpeningArt({ o, house }: { o: Opening; house: HouseParams }) {
  const { left, right, w, h, y } = o
  const paper = house.style === 'paper'
  const door = o.kind === 'door', bottom = y + h, x = o.x
  const base = door ? house.doorColor : { dark: '#263144', warm: '#ebb26a', blue: '#7693a5' }[house.glass]
  const top = y + (paper ? 0 : 1)
  const arch = Math.min(w * .46, h * .44)
  const path = o.shape === 'arch'
    ? `M${left} ${bottom}V${top + arch}Q${left} ${top} ${x} ${top}Q${right} ${top} ${right} ${top + arch}V${bottom}Z`
    : `M${left} ${top}H${right}V${bottom}H${left}Z`
  const fill = paper ? base : shade(base, '#31323b', house.glass === 'warm' && !door ? .06 : .15)
  const frame = shade(house.trim, house.wall, .28)
  const openingStroke = paper ? undefined : frame
  const railing = `M${left - 2} ${y}H${right + 2}${door ? '' : `M${left - 2} ${bottom}H${right + 2}`}`
  const pane = y + h * (o.shape === 'arch' ? .48 : .5)
  return <g>
    {house.shutters && !door && o.shape !== 'round' && <path d={`M${left - 4} ${top + 1}h3v${h - 2}h-3zM${right + 1} ${top + 1}h3v${h - 2}h-3z`} fill={house.doorColor} stroke={frame} strokeWidth=".45" />}
    {o.shape === 'round'
      ? <ellipse cx={x} cy={(top + bottom) / 2} rx={w / 2} ry={(bottom - top) / 2} fill={fill} stroke={openingStroke} strokeWidth="1.25" />
      : <path d={path} fill={fill} stroke={openingStroke} strokeWidth="1.25" />}
    {house.panes && !door && <path d={`M${x} ${top + 1}V${bottom - 1}M${left + 1} ${pane}H${right - 1}`} fill="none" stroke={frame} strokeWidth=".85" opacity=".84" />}
    {door && !paper && <>
      <path d={`M${x - w * .24} ${y + h * .42}v${h * .48}m${w * .48} ${-h * .48}v${h * .48}`} stroke="#201e26" opacity=".36" strokeWidth=".7" fill="none" />
      <circle cx={x + w * .26} cy={y + h * .59} r=".8" fill={frame} />
    </>}
    <path d={railing} stroke="#33303c" strokeWidth={paper ? 2.6 : 2.9} fill="none" vectorEffect={paper ? 'non-scaling-stroke' : undefined} />
    <path d={railing} stroke={paper ? house.trim : '#ffe4b0'} strokeWidth={paper ? 1.25 : 1.05} fill="none" vectorEffect={paper ? 'non-scaling-stroke' : undefined} />
  </g>
}

type Point = [number, number]
const pointList = (points: Point[]) => points.map(point => point.join(',')).join(' ')

// The inside of the house, in the place of its wall and openings (lib/pigchicken/house-rooms.ts): the room between
// the walls, under the lowest point of the roof, a floor for each storey, and the windows and the door as the light
// that comes in. Above the ceiling the wall's own shape stays dark.
function InteriorArt({ house, wall, clip }: { house: HouseParams; wall: string; clip: string }) {
  const inside = houseInterior(house)
  if (!inside) return null
  const { room, floors } = inside
  const back = shade(house.wall, '#1b1826', .58), dark = shade(house.wall, '#0e0c16', .8)
  const wood = shade(house.doorColor, '#4a3528', .55), beam = shade(house.doorColor, '#1c1620', .6)
  const light = { dark: '#aebfd0', warm: '#ffd9a0', blue: '#b5d6e8' }[house.glass]
  const frame = shade(house.trim, house.wall, .28)
  const storeys = [...floors, room.b]
  return <g>
    <polygon points={wall} fill={dark} />
    <g clipPath={`url(#${clip})`}>
      <path d={`M${room.l} ${room.t}H${room.r}V${room.b}H${room.l}Z`} fill={back} />
      <path d={`M${room.l} ${room.t}h4V${room.b}h-4Z`} fill="#fff0d6" opacity=".06" />
      <path d={`M${room.r - 6} ${room.t}h6V${room.b}h-6Z`} fill="#0b0a12" opacity=".2" />
      {houseOpenings(house).map((opening, i) => {
        const o = openingGeometry(house, opening), door = o.kind === 'door', bottom = o.y + o.h
        const arch = Math.min(o.w * .46, o.h * .44)
        const path = o.shape === 'arch'
          ? `M${o.left} ${bottom}V${o.y + arch}Q${o.left} ${o.y} ${o.x} ${o.y}Q${o.right} ${o.y} ${o.right} ${o.y + arch}V${bottom}Z`
          : `M${o.left} ${o.y}H${o.right}V${bottom}H${o.left}Z`
        return <g key={i}>
          {o.shape === 'round'
            ? <ellipse cx={o.x} cy={o.y + o.h / 2} rx={o.w / 2} ry={o.h / 2} fill={light} opacity={door ? .5 : .8} stroke={frame} strokeWidth="1" />
            : <path d={path} fill={light} opacity={door ? .5 : .8} stroke={frame} strokeWidth="1" />}
          {!door && house.panes && <path d={`M${o.x} ${o.y + 1}V${bottom - 1}M${o.left + 1} ${o.y + o.h / 2}H${o.right - 1}`} fill="none" stroke={frame} strokeWidth=".8" opacity=".8" />}
          {/* the light it throws on the floor below */}
          {!door && <path d={`M${o.left} ${bottom}H${o.right}L${o.right + 3} ${bottom + 7}H${o.left - 3}Z`} fill={light} opacity=".08" />}
        </g>
      })}
      {storeys.map((y, i) => <g key={i}>
        <path d={`M${room.l} ${y}H${room.r}v${i === storeys.length - 1 ? -1.6 : 1.6}H${room.l}Z`} fill={wood} />
      </g>)}
      <path d={`M${room.l} ${room.t - 1.4}H${room.r}v1.4H${room.l}Z`} fill={beam} />
    </g>
    {storeys.map((y, i) => <path key={i} d={`M${room.l} ${y}H${room.r}`} fill="none" stroke="#ffe4b0" strokeWidth="1.3" opacity=".8" vectorEffect="non-scaling-stroke" />)}
  </g>
}

// the door a player stands at (to go in or out with Usar): its outline lights up
function DoorMark({ house }: { house: HouseParams }) {
  const door = houseInterior(house)?.door
  if (!door) return null
  return <path d={`M${door.l - 1} ${door.b}V${door.t - 1}H${door.r + 1}V${door.b}`} fill="none" stroke="#fff3c4" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
}

function CubistHouseArt({ house, id, open, hot }: { house: HouseParams; id: string; open: boolean; hot: boolean }) {
  const outline = houseRoof(house)
  const parapet = house.roof === 'parapet'
  const top = parapet ? [outline[0], outline[3], outline[2]] : outline
  const [baseLeft, baseRight] = HOUSE_BASE
  const wall = pointList(houseWallPolygon(house, outline))
  const fascia = parapet ? '' : pointList([...outline, ...outline.slice().reverse().map(([x, y]): Point => [x, y + 8])])
  const contactPath = `M${pointList(outline).replaceAll(' ', 'L')}M${baseLeft}L${baseRight}`
  const seam: Point = parapet ? outline[1] : [68, house.pitch + 3]
  const texture = houseWallTexture(house)
  const tile = house.roofTexture === 'plain' ? undefined : ROOF_TILES[house.roofTexture]
  const { stains, marks } = weathering(house.seed)
  const openings = houseOpenings(house).map(opening => openingGeometry(house, opening))
  const door = openings.find(o => o.kind === 'door')
  const awning = door && house.seed % 4 !== 0 ? door : null
  return <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <clipPath id={`${id}-wall-clip`}><polygon points={wall} /></clipPath>
      {texture !== 'smooth' && <Pattern id={`${id}-wall`} tile={WALL_TILES[texture]} offset={house.seed % 23} />}
      {tile && <Pattern id={`${id}-roof`} tile={tile} offset={house.seed % 5} />}
    </defs>
    {open ? <InteriorArt house={house} wall={wall} clip={`${id}-wall-clip`} /> : <>
      <polygon points={wall} fill={house.wall} />
      <g clipPath={`url(#${id}-wall-clip)`}>
        <polygon points={pointList([top[0], [26, 0], [32, 100], baseLeft])} fill={shade(house.wall, '#ffe0ab', .24)} />
        <polygon points={pointList([seam, top.at(-1)!, baseRight, [seam[0] - 9, 100]])} fill={shade(house.wall, '#45302f', .32)} />
        {texture !== 'smooth' && <polygon points={wall} fill={`url(#${id}-wall)`} opacity={.16 + house.wear * .003} />}
        <path d={stains} fill="#f5c28b" opacity={house.wear * .003} />
        <path d={marks} fill="none" stroke="#613b36" strokeWidth=".48" opacity={house.wear * .003} />
      </g>
    </>}
    {parapet
      ? <CubistTerrace outline={outline} house={house} pattern={tile && `url(#${id}-roof)`} />
      : <>
        <polygon points={fascia} fill={shade(house.roofColor, house.trim, .29)} />
        {tile && <polygon points={fascia} fill={`url(#${id}-roof)`} opacity=".36" />}
        <path d="M0 0h3l-1.5 2zM5 1h3L6.5 3zM10 0h3l-1.5 2zM15 1h3l-1.5 2zM20 0h3l-1.5 2z"
          transform={`translate(33 ${house.pitch + 3})`} fill={shade(house.roofColor, '#423030', .54)} />
      </>}
    {!open && <path d={`M${seam[0] + 5} ${seam[1] + 8}l8-1m-7 5 8-1m-7 5 8-1`} stroke="#614032" strokeWidth="1.2" fill="none" strokeLinecap="round" />}
    {!open && awning && <g transform={`translate(${awning.x} ${awning.y})`}>
      <path d="M-10 -11L11 -13 16 -4Q1 0 -16 -3Z" fill={shade(house.roofColor, '#413135', .49)} />
      <path d="M-12 -8Q1 -6 13 -9M-14 -5Q1 -3 15 -6" fill="none" stroke={house.trim} strokeWidth="1.1" opacity=".36" />
      <path d="M-15 -3l3 5m14-7-1 6" fill="none" stroke="#624336" strokeWidth=".6" />
    </g>}
    {!open && openings.map((o, i) => <OpeningArt key={i} o={o} house={house} />)}
    <path d={contactPath} fill="none" stroke="#453536" strokeWidth="3.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <path d={contactPath} fill="none" stroke="#ffe4b0" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    {hot && <DoorMark house={house} />}
  </svg>
}

function CubistTerrace({ outline, house, pattern }: { outline: Point[]; house: HouseParams; pattern?: string }) {
  const rim = outline.slice(0, 4)
  const center = rim.reduce(([x, y], point) => [x + point[0] / 4, y + point[1] / 4] as Point, [0, 0])
  const inner = rim.map(([x, y]): Point => [x * .91 + center[0] * .09, y * .83 + center[1] * .17])
  const [frontLeft, frontRight, backRight, backLeft] = inner
  const depth = Math.min(6, house.pitch * .2)
  const backFloor: Point = [backRight[0] - 1, backRight[1] + depth]
  const leftFloor: Point = [backLeft[0] + 3, backLeft[1] + depth]
  const lattice = Array.from({ length: 9 }, (_, i) => {
    const t = .18 + .075 * i
    const x = backLeft[0] + (backRight[0] - backLeft[0]) * t
    const y = backLeft[1] + (backRight[1] - backLeft[1]) * t + .6
    return `M${x.toFixed(1)} ${y.toFixed(1)}h3l-1.5 ${Math.min(2, depth * .55)}z`
  }).join('')
  return <g>
    <polygon points={pointList(rim)} fill={shade(house.roofColor, house.trim, .48)} />
    <polygon points={pointList(inner)} fill={shade(house.roofColor, '#503731', .24)} />
    <polygon points={pointList([backLeft, backRight, backFloor, leftFloor])} fill={shade(house.roofColor, '#49312f', .46)} />
    <polygon points={pointList([backLeft, leftFloor, [frontLeft[0] + 8, frontLeft[1] - 1], frontLeft])} fill={shade(house.roofColor, '#422d32', .60)} />
    <polygon points={pointList([leftFloor, backFloor, frontRight, [frontLeft[0] + 8, frontLeft[1] - 1]])} fill={shade(house.roofColor, '#efd4b5', .12)} />
    <path d={lattice} fill={shade(house.roofColor, house.trim, .56)} />
    {pattern && <polygon points={pointList(rim)} fill={pattern} opacity=".36" />}
  </g>
}

// open: seen from inside (someone of this screen is in it); hot: a player stands at its door
export const HouseArt = memo(function HouseArt({ house, open = false, hot = false }: { house: HouseParams; open?: boolean; hot?: boolean }) {
  const id = useId()
  if (house.style === 'cubist' || house.roof === 'parapet') return <CubistHouseArt house={house} id={id} open={open} hot={hot} />
  const roof = houseRoof(house)
  const outline = roof.map(([x, y]) => `${x},${y}`).join(' ')
  const paper = house.style === 'paper'
  const eaves = house.pitch + 3
  const wall = pointList(houseWallPolygon(house, roof))
  const roofBand = paper && house.roof !== 'flat'
    ? `${outline} 100,${eaves + 1} 0,${eaves + 1}`
    : `${outline} ${[...roof].reverse().map(([x, y]) => `${x},${y + (house.roof === 'flat' ? 6 : 5)}`).join(' ')}`
  const texture = houseWallTexture(house)
  const stains = !paper && house.wear > 0 ? weathering(house.seed) : null
  const contactColor = paper ? house.trim : '#ffe4b0'
  const shift = house.seed % 23
  return <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <clipPath id={`${id}-wall-clip`}><polygon points={wall} /></clipPath>
      {texture !== 'smooth' && <Pattern id={`${id}-wall`} tile={WALL_TILES[texture]} offset={shift} />}
      {house.roofTexture !== 'plain' && <Pattern id={`${id}-roof`} tile={ROOF_TILES[house.roofTexture]} offset={shift % 5} />}
    </defs>
    {open ? <InteriorArt house={house} wall={wall} clip={`${id}-wall-clip`} /> : <>
      <polygon points={wall} fill={house.wall} stroke={paper ? undefined : shade(house.wall, '#262737', .40)} strokeWidth="1" />
      <g clipPath={`url(#${id}-wall-clip)`}>
        {!paper && <>
          <path d="M7 26H17L14 100H7Z" fill="#f3d8ae" opacity=".17" />
          <path d="M83 7H100V100H80Z" fill="#28293d" opacity=".22" />
        </>}
        {texture !== 'smooth' && <path d="M0 0H100V100H0Z" fill={`url(#${id}-wall)`} opacity={texture === 'paper' ? .26 + house.wear * .004 : .17 + house.wear * .003} />}
        {stains && <>
          <path d={stains.stains} fill="#f6dec2" opacity={house.wear * .0033} />
          <path d={stains.marks} fill="none" stroke="#352638" strokeWidth=".53" opacity={house.wear * .004} />
          <path d="M7 90l14 2 12-2 21 5 12-3 18 3 9-2v7H7Z" fill="#3e3041" opacity={house.wear * .0022} />
        </>}
        {!paper && <>
          {house.floors > 1 && <path d="M7 60H93M7 61H93" stroke="#352f3b" strokeWidth=".4" opacity=".15" />}
          <path d="M7 98H93V100H7Z" fill="#332c40" opacity=".36" />
        </>}
      </g>
    </>}
    <polygon points={roofBand} fill={house.roofColor} stroke={paper ? undefined : shade(house.roofColor, '#272636', .45)} strokeWidth="1.2" />
    {house.roofTexture !== 'plain' && <polygon points={roofBand} fill={`url(#${id}-roof)`} opacity={house.roofTexture === 'paper' ? .26 + house.wear * .004 : .58} />}
    <polyline points={outline} fill="none" stroke="#34303c" strokeWidth={paper ? 2.6 : 3.1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <polyline points={outline} fill="none" stroke={contactColor} strokeWidth={paper ? 1.25 : 1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <polyline points={HOUSE_BASE.map(point => point.join(',')).join(' ')} fill="none" stroke="#34303c" strokeWidth={paper ? 2.6 : 4} vectorEffect="non-scaling-stroke" />
    <polyline points={HOUSE_BASE.map(point => point.join(',')).join(' ')} fill="none" stroke={contactColor} strokeWidth={paper ? 1.25 : 1.6} vectorEffect="non-scaling-stroke" />
    {!open && houseOpenings(house).map((opening, i) => <OpeningArt key={i} o={openingGeometry(house, opening)} house={house} />)}
    {hot && <DoorMark house={house} />}
  </svg>
})

// a house of the Pátio's layout: open while someone of this screen is inside, its door lit while one stands at it
export function PlacedHouseArt({ id, house }: { id: string; house: HouseParams }) {
  const open = useSyncExternalStore(houseRoomsStore.subscribe, () => houseRoomsStore.isOpen(id), () => false)
  const hot = useSyncExternalStore(houseRoomsStore.subscribe, () => houseRoomsStore.atDoor(id), () => false)
  return <HouseArt house={house} open={open} hot={hot} />
}
