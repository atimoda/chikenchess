"use client"

import { memo, useId } from 'react'
import {
  HOUSE_BASE, HOUSE_WALL, houseOpenings, houseRandom, houseRoof, houseWallTexture, openingGeometry, type HouseParams,
} from '@/lib/pigchicken/houses'

type Tile = { w: number; h: number; dark: string; light?: string }

const WALL_TILES: Record<Exclude<ReturnType<typeof houseWallTexture>, 'smooth'>, Tile> = {
  plaster: { w: 28, h: 24, dark: 'M2 6l6-1 2 2-7 2zM19 14l4-1 3 3-7 1zM6 22l2-1 2 1', light: 'M14 2l5 1M10 13l4-1M21 22l4-1' },
  canvas: { w: 8, h: 7, dark: 'M0 1h8M2 4h5M1 0v7M6 3v4', light: 'M0 2h8M2 0v7' },
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
}

function Pattern({ id, tile, offset = 0 }: { id: string; tile: Tile; offset?: number }) {
  return <pattern id={id} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse" x={offset} y={offset}>
    <path d={tile.dark} fill="none" stroke="#201c28" strokeWidth=".55" />
    {tile.light && <path d={tile.light} fill="none" stroke="#fff0d6" strokeWidth=".65" opacity=".55" />}
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
  const door = o.kind === 'door', bottom = y + h, x = o.x
  const base = door ? house.doorColor : { dark: '#263144', warm: '#ebb26a', blue: '#7693a5' }[house.glass]
  const top = y + 1
  const arch = Math.min(w * .46, h * .44)
  const path = o.shape === 'arch'
    ? `M${left} ${bottom}V${top + arch}Q${left} ${top} ${x} ${top}Q${right} ${top} ${right} ${top + arch}V${bottom}Z`
    : `M${left} ${top}H${right}V${bottom}H${left}Z`
  const fill = shade(base, '#31323b', house.glass === 'warm' && !door ? .06 : .15)
  const frame = shade(house.trim, house.wall, .28)
  const railing = `M${left - 2} ${y}H${right + 2}${door ? '' : `M${left - 2} ${bottom}H${right + 2}`}`
  const pane = y + h * (o.shape === 'arch' ? .48 : .5)
  return <g>
    {house.shutters && !door && o.shape !== 'round' && <path d={`M${left - 4} ${top + 1}h3v${h - 2}h-3zM${right + 1} ${top + 1}h3v${h - 2}h-3z`} fill={house.doorColor} stroke={frame} strokeWidth=".45" />}
    {o.shape === 'round'
      ? <ellipse cx={x} cy={(top + bottom) / 2} rx={w / 2} ry={(bottom - top) / 2} fill={fill} stroke={frame} strokeWidth="1.25" />
      : <path d={path} fill={fill} stroke={frame} strokeWidth="1.25" />}
    {house.panes && !door && <path d={`M${x} ${top + 1}V${bottom - 1}M${left + 1} ${pane}H${right - 1}`} fill="none" stroke={frame} strokeWidth=".85" opacity=".84" />}
    {door && <>
      <path d={`M${x - w * .24} ${y + h * .42}v${h * .48}m${w * .48} ${-h * .48}v${h * .48}`} stroke="#201e26" opacity=".36" strokeWidth=".7" fill="none" />
      <circle cx={x + w * .26} cy={y + h * .59} r=".8" fill={frame} />
    </>}
    <path d={railing} stroke="#33303c" strokeWidth="2.9" fill="none" />
    <path d={railing} stroke="#ffe4b0" strokeWidth="1.05" fill="none" />
  </g>
}

export const HouseArt = memo(function HouseArt({ house }: { house: HouseParams }) {
  const id = useId()
  const roof = houseRoof(house)
  const outline = roof.map(([x, y]) => `${x},${y}`).join(' ')
  const { left, right, bottom } = HOUSE_WALL
  const wall = `M0 ${roof[0][1]}L${outline}L${right} ${roof.at(-1)![1] + 4}V${bottom}H${left}V${roof[0][1] + 4}Z`
  const roofBand = `${outline} ${[...roof].reverse().map(([x, y]) => `${x},${y + (house.roof === 'flat' ? 6 : 5)}`).join(' ')}`
  const texture = houseWallTexture(house)
  const stains = weathering(house.seed)
  const shift = house.seed % 23
  return <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <clipPath id={`${id}-wall-clip`}><path d={wall} /></clipPath>
      {texture !== 'smooth' && <Pattern id={`${id}-wall`} tile={WALL_TILES[texture]} offset={shift} />}
      {house.roofTexture !== 'plain' && <Pattern id={`${id}-roof`} tile={ROOF_TILES[house.roofTexture]} offset={shift % 5} />}
    </defs>
    <path d={wall} fill={house.wall} stroke={shade(house.wall, '#262737', .40)} strokeWidth="1" />
    <g clipPath={`url(#${id}-wall-clip)`}>
      <path d="M7 26H17L14 100H7Z" fill="#f3d8ae" opacity=".17" />
      <path d="M83 7H100V100H80Z" fill="#28293d" opacity=".22" />
      {texture !== 'smooth' && <path d="M0 0H100V100H0Z" fill={`url(#${id}-wall)`} opacity={.17 + house.wear * .003} />}
      {house.wear > 0 && <>
        <path d={stains.stains} fill="#f6dec2" opacity={house.wear * .0033} />
        <path d={stains.marks} fill="none" stroke="#352638" strokeWidth=".53" opacity={house.wear * .004} />
        <path d="M7 90l14 2 12-2 21 5 12-3 18 3 9-2v7H7Z" fill="#3e3041" opacity={house.wear * .0022} />
      </>}
      {house.floors > 1 && <path d="M7 60H93M7 61H93" stroke="#352f3b" strokeWidth=".4" opacity=".15" />}
      <path d="M7 98H93V100H7Z" fill="#332c40" opacity=".36" />
    </g>
    <polygon points={roofBand} fill={house.roofColor} stroke={shade(house.roofColor, '#272636', .45)} strokeWidth="1.2" />
    {house.roofTexture !== 'plain' && <polygon points={roofBand} fill={`url(#${id}-roof)`} opacity=".58" />}
    <polyline points={outline} fill="none" stroke="#34303c" strokeWidth="3.1" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <polyline points={outline} fill="none" stroke="#ffe4b0" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <polyline points={HOUSE_BASE.map(point => point.join(',')).join(' ')} fill="none" stroke="#34303c" strokeWidth="4" vectorEffect="non-scaling-stroke" />
    <polyline points={HOUSE_BASE.map(point => point.join(',')).join(' ')} fill="none" stroke="#ffe4b0" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    {houseOpenings(house).map((opening, i) => <OpeningArt key={i} o={openingGeometry(house, opening)} house={house} />)}
  </svg>
})
