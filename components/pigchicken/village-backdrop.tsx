"use client"

import { memo, useId } from 'react'
import { SCENE_W, WORLD_GROUND_Y } from '@/lib/pigchicken/world'
import { VILLAGE_RIDGE, type RidgePoint } from '@/lib/pigchicken/village'
import { SceneryRegion } from './scenery-region'

const ROCK_BOTTOM = WORLD_GROUND_Y + 10
const artTop = (ridge: RidgePoint[]) => Math.min(500, ...ridge.map(([, y]) => y - 5))
const UPPER_TERRACE = '498,876 562,812 606,753 742,748 814,683 941,681 1022,648 1072,646 1128,582 1239,582 1298,570 1377,570 1434,527 1551,527 1612,545 1720,546 1776,564 1890,564 1920,576 1920,940 498,940'

export const VillageBackdrop = memo(function VillageBackdrop({ left, ridge = VILLAGE_RIDGE }: { left: number; ridge?: RidgePoint[] }) {
  const clip = useId()
  const top = artTop(ridge)
  const box = { y: top, w: SCENE_W, h: ROCK_BOTTOM - top }
  const line = ridge.map(p => p.join(',')).join(' ')
  const rock = `${line} ${ridge.at(-1)![0]},${ROCK_BOTTOM} ${ridge[0][0]},${ROCK_BOTTOM}`
  return <>
    <SceneryRegion bounds={{ x: left, ...box }} aria-hidden="true" className="absolute" style={{ left, top, width: box.w, height: box.h }}>
      <svg width={box.w} height={box.h} viewBox={`0 ${top} ${box.w} ${box.h}`}>
        <defs>
          <clipPath id={clip}><polygon points={rock} /></clipPath>
          <pattern id="village-rock-grain" patternUnits="userSpaceOnUse" width="97" height="81">
            <path d="M0 15l21 3 13-3 23 3 16-6 24 2M0 57l20-3 22 6 17-8 38 2M21 18l-4 20 3 16m51-40-8 23-4 15m-18 8-3 21m47-26-8 26" fill="none" stroke="#413b48" strokeWidth="1.4" opacity=".41" />
            <path d="M4 17l16 3 14-2m38 38 18-1m-64-1 13 4" fill="none" stroke="#b3a29a" strokeWidth="1.4" opacity=".41" />
          </pattern>
        </defs>
        <polygon points={UPPER_TERRACE} fill="#55515e" />
        <polygon points={UPPER_TERRACE} fill="url(#village-rock-grain)" opacity=".62" />
        <path d="M580 829l38-65 143 2 67-67 103 1 109-37 41 1 63-66 98 4 80-18 68 4 63-43 99 2 62 18 113 1 66 17 112 5" fill="none" stroke="#82747d" strokeWidth="3" opacity=".64" />
        <polygon points={rock} fill="#77707a" />
        <polygon points={rock} fill="url(#village-rock-grain)" />
        <g clipPath={`url(#${clip})`}>
          <path d="M456 873l51 30 132 13 77-26 115-46 88 15 82-41 143-27 155-15 95-40 125-25 65 16 76-21 79 17 154-41v258H284l158-43z" fill="#544f60" opacity=".5" />
          <path d="M803 796l-44 82-47 40m229-118 12 28-33 65-64 47m316-211-40 42-36 111m294-157-67 61-4 37-61 117m306-260-39 38 27 39-56 107m244-182-83 46-29 53-54 45m229-159-56 52-18 81" fill="none" stroke="#433e51" strokeWidth="4" opacity=".53" />
          <path d="M323 924l91-3m75-37h111m160-29 54-29 101-11m111-12 73-14 76-30 137-8m95-6 80-20m110-22 99-7m91-2 81-21" fill="none" stroke="#bbada0" strokeWidth="3" opacity=".42" />
        </g>
        <polyline points={line} stroke="#34303c" strokeWidth="8" fill="none" strokeLinejoin="round" />
        <polyline points={line} stroke="#e2cbab" strokeWidth="3" fill="none" strokeLinejoin="round" />
      </svg>
    </SceneryRegion>
    <SceneryRegion bounds={{ x: left + 238, y: 828, w: 154, h: 96 }} aria-hidden="true" className="absolute" style={{ left: left + 238, top: 828, width: 154, height: 96 }}>
      <svg viewBox="0 0 154 96" className="size-full">
        <path d="M25 35v58m102-61v53" stroke="#514452" strokeWidth="7" />
        <path d="M3 15l145-3-4 40-141 4z" fill="#3c384b" stroke="#bb9e8d" strokeWidth="2" />
        <text x="74" y="30" textAnchor="middle" fontSize="9" letterSpacing="3" fill="#c7a88c">PÁTIO</text>
        <text x="74" y="45" textAnchor="middle" fontSize="11" letterSpacing="1" fontWeight="700" fill="#f1dbc2">VILA DOS TELHADOS</text>
      </svg>
    </SceneryRegion>
  </>
})

export const VillageCollider = memo(function VillageCollider({ left, ridge = VILLAGE_RIDGE }: { left: number; ridge?: RidgePoint[] }) {
  const top = artTop(ridge)
  return <div data-chicken-id="village-ridge" data-chicken-world-box={`${left},${top},${SCENE_W},${ROCK_BOTTOM - top}`}
    data-chicken-line={ridge.map(([x, y]) => `${x},${y - top}`).join(' ')} data-chicken-nearby className="absolute" />
})
