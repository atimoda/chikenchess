"use client"

import { memo } from 'react'
import { SceneryRegion } from './scenery-region'

// The Vila dos Telhados' fixed scenery: the row of terraces far behind (decorative) and the sign. The rocky slope
// she walks on is the layout's first ground element (biome "Rocha da Vila", lib/pigchicken/surfaces.ts).
const TOP = 500, BOTTOM = 940
const UPPER_TERRACE = '498,876 562,812 606,753 742,748 814,683 941,681 1022,648 1072,646 1128,582 1239,582 1298,570 1377,570 1434,527 1551,527 1612,545 1720,546 1776,564 1890,564 1920,576 1920,940 498,940'

export const VillageBackdrop = memo(function VillageBackdrop({ left }: { left: number }) {
  const box = { x: 498, y: TOP, w: 1920 - 498, h: BOTTOM - TOP }
  return <>
    <SceneryRegion bounds={{ ...box, x: left + box.x }} aria-hidden="true" className="absolute" style={{ left: left + box.x, top: box.y, width: box.w, height: box.h }}>
      <svg width={box.w} height={box.h} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>
        <defs>
          <pattern id="village-rock-grain" patternUnits="userSpaceOnUse" width="97" height="81">
            <path d="M0 15l21 3 13-3 23 3 16-6 24 2M0 57l20-3 22 6 17-8 38 2M21 18l-4 20 3 16m51-40-8 23-4 15m-18 8-3 21m47-26-8 26" fill="none" stroke="#413b48" strokeWidth="1.4" opacity=".41" />
            <path d="M4 17l16 3 14-2m38 38 18-1m-64-1 13 4" fill="none" stroke="#b3a29a" strokeWidth="1.4" opacity=".41" />
          </pattern>
        </defs>
        <polygon points={UPPER_TERRACE} fill="#55515e" />
        <polygon points={UPPER_TERRACE} fill="url(#village-rock-grain)" opacity=".62" />
        <path d="M580 829l38-65 143 2 67-67 103 1 109-37 41 1 63-66 98 4 80-18 68 4 63-43 99 2 62 18 113 1 66 17 112 5" fill="none" stroke="#82747d" strokeWidth="3" opacity=".64" />
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
