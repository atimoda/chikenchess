'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { CAMPAIGNS, citiesInCampaign } from '@/lib/campaigns'
import type { CityData } from '@/lib/cities-data'
import styles from './campaign-city-list.module.css'

export function CampaignCityList({ cities, onFocus, onOpen }: {
  cities: CityData[]
  onFocus: (cityId: string | null) => void
  onOpen: (city: CityData) => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; y: number; scroll: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [expanded, setExpanded] = useState(false)

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { id: event.pointerId, y: event.clientY, scroll: viewport.current?.scrollTop ?? 0, moved: false }
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId || !viewport.current) return
    const distance = event.clientY - current.y
    if (!current.moved && Math.abs(distance) < 5) return
    if (!current.moved) {
      current.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    viewport.current.scrollTop = current.scroll - distance
    suppressClick.current = true
    onFocus(null)
  }
  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
    window.setTimeout(() => { suppressClick.current = false }, 0)
  }

  return <aside className="absolute left-3 md:left-6 top-24 bottom-20 z-40 flex w-[min(15rem,calc(100vw-2rem))] flex-col pointer-events-none pl-2" aria-label="Campanhas e cidades">
    <button type="button" className="pointer-events-auto md:hidden mb-2 rounded-md border border-white/20 bg-[#10131c]/90 px-3 py-2 text-left text-[13px] text-white" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>Campanhas {expanded ? '−' : '+'}</button>
    <div ref={viewport} className={`${expanded ? 'block' : 'hidden md:block'} ${styles.viewport} pointer-events-none min-h-0 flex-1 overflow-y-auto overscroll-contain text-[13px] select-none`}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onPointerLeave={() => onFocus(null)}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation() } }}>
      {CAMPAIGNS.map(campaign => <section key={campaign.id} className="mb-4 last:mb-0">
        <h2 className="mb-1 text-[12px] font-semibold uppercase leading-4 text-[#b6c9bb]/50">{campaign.name}</h2>
        <ul className="space-y-1">
          {citiesInCampaign(cities, campaign.id).map(city => <li key={city.id}>
            <button type="button" className="pointer-events-auto w-fit max-w-full text-left leading-6 text-[#d8dce1] transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
              onClick={() => { if (!suppressClick.current) { onFocus(city.id); onOpen(city) } }}>
              {city.name} {city.year}
            </button>
          </li>)}
        </ul>
      </section>)}
    </div>
  </aside>
}
