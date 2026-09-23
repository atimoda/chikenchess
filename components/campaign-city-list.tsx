'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { CAMPAIGNS, citiesInCampaign } from '@/lib/campaigns'
import type { CityData } from '@/lib/cities-data'

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

  return <aside className="absolute left-3 md:left-6 top-24 bottom-20 z-40 flex w-[min(15rem,calc(100vw-2rem))] flex-col pointer-events-auto" aria-label="Campanhas e cidades">
    <button type="button" className="md:hidden mb-2 rounded-md border border-white/20 bg-[#10131c]/90 px-3 py-2 text-left text-xs text-white" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>Campanhas {expanded ? '−' : '+'}</button>
    <div ref={viewport} className={`${expanded ? 'block' : 'hidden md:block'} min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-[#0b0d14]/80 px-3 py-3 text-xs backdrop-blur-sm select-none`} style={{ touchAction: 'pan-y', cursor: 'grab' }}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onPointerLeave={() => onFocus(null)}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation() } }}>
      {CAMPAIGNS.map(campaign => <section key={campaign.id} className="mb-4 last:mb-0">
        <h2 className="mb-1 text-[11px] font-semibold leading-4 text-[#b6c9bb]">{campaign.name}</h2>
        <ul className="space-y-0.5">
          {citiesInCampaign(cities, campaign.id).map(city => <li key={city.id}>
            <button type="button" className="w-full rounded px-1 py-1 text-left leading-4 text-[#d8dce1] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#49aaff] cursor-pointer"
              onMouseEnter={() => onFocus(city.id)} onFocus={() => onFocus(city.id)} onClick={() => { if (!suppressClick.current) onOpen(city) }}>
              <span className="mr-1" aria-hidden="true">-</span>{city.name} {city.year}
            </button>
          </li>)}
        </ul>
      </section>)}
    </div>
  </aside>
}
