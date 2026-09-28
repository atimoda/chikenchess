'use client'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { CAMPAIGNS, citiesInCampaign } from '@/lib/campaigns'
import { getCityEras, type CityData } from '@/lib/cities-data'
import { cityFlagColor } from '@/lib/globe-flags'
import styles from './campaign-city-list.module.css'

export function CampaignCityList({ cities, conqueredCities = [], openCityIds = [], onFocus, onOpen, focusedCityId, pinHoveredCityId }: {
  cities: CityData[]
  conqueredCities?: string[]
  openCityIds?: string[]
  onFocus: (cityId: string | null) => void
  onOpen: (city: CityData) => void
  focusedCityId?: string | null
  pinHoveredCityId?: string | null
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; y: number; scroll: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [expanded, setExpanded] = useState(false)
  const lastHoveredCity = useRef<string | null>(null)
  useEffect(() => {
    const wheelOverList = (event: WheelEvent) => {
      const container = viewport.current
      // Blank areas pass pointer events to the globe's canvas. Mirror that
      // wheel input into the list without blocking the globe's own zoom.
      if (!container || !(event.target instanceof HTMLCanvasElement) || !container.getClientRects().length) return
      const rect = container.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? rect.height : 1
      container.scrollTop += event.deltaY * unit
    }
    window.addEventListener('wheel', wheelOverList, { capture: true, passive: true })
    return () => window.removeEventListener('wheel', wheelOverList, true)
  }, [])
  useEffect(() => {
    const container = viewport.current
    if (!container || !pinHoveredCityId || drag.current) return
    const row = [...container.querySelectorAll<HTMLButtonElement>('button[data-city-id]')]
      .find(button => button.dataset.cityId === pinHoveredCityId)
    if (!row || !row.getClientRects().length) return
    const containerRect = container.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const top = container.scrollTop + rowRect.top - containerRect.top - (containerRect.height - rowRect.height) / 2
    container.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [pinHoveredCityId, expanded])
  const playHover = (cityId: string) => {
    if (lastHoveredCity.current === cityId) return
    lastHoveredCity.current = cityId
    window.dispatchEvent(new CustomEvent('map-city-hover', { detail: { cityId } }))
  }

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

  return <aside className="absolute left-3 md:left-6 top-16 md:top-24 bottom-20 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col pointer-events-none pl-2" aria-label="Campanhas e cidades">
    <button type="button" className="pointer-events-auto md:hidden mb-2 rounded-md border border-white/20 bg-[#10131c]/90 px-3 py-2 text-left text-[13px] text-white" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>Campanhas {expanded ? '−' : '+'}</button>
    <div ref={viewport} className={`${expanded ? 'block' : 'hidden md:block'} ${styles.viewport} pointer-events-none min-h-0 flex-1 overflow-y-auto overscroll-contain text-[13px] select-none`}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onPointerLeave={() => onFocus(null)}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation() } }}>
      {CAMPAIGNS.map(campaign => <section key={campaign.id} className="mb-4 last:mb-0">
        <h2 className="mb-1 text-[12px] font-semibold uppercase leading-4 text-[#b6c9bb]/50">{campaign.name}</h2>
        <ul className="space-y-1">
          {citiesInCampaign(cities, campaign.id).map(city => {
            const conquered = getCityEras(city).some(era => conqueredCities.includes(era.id))
            const active = focusedCityId === city.id || pinHoveredCityId === city.id || openCityIds.includes(city.id)
            return <li key={city.id}>
              <button type="button" data-city-id={city.id} data-active={active} style={{ '--city-color': city.color } as CSSProperties} className={`${styles.cityButton} pointer-events-auto inline-flex w-fit max-w-full items-center gap-1.5 text-left leading-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary cursor-pointer`}
                onPointerEnter={() => { onFocus(city.id); playHover(city.id) }} onFocus={() => { onFocus(city.id); playHover(city.id) }} onPointerLeave={() => { if (lastHoveredCity.current === city.id) lastHoveredCity.current = null; onFocus(null) }} onBlur={() => onFocus(null)}
                onClick={() => { if (!suppressClick.current) { onFocus(city.id); onOpen(city) } }}>
                <span className="shrink-0">{city.name} {city.year}</span>
                {active && <span className={styles.genre}>{city.genre}</span>}
                {conquered && <span className={`${styles.flagIcon} ${active ? styles.flagIconActive : ''}`} style={{ '--flag-color': cityFlagColor(city.color) } as CSSProperties} aria-label="Conquistada" title="Conquistada"><svg viewBox="0 0 16 16" aria-hidden="true"><path className={styles.flagPole} d="M3.2 14V2.2"/><path className={styles.flagCloth} d="M3.7 2.7c3-1.6 5 1.1 9-.4v5.2c-3.8 1.5-6-1.1-9 .4z"/></svg></span>}
              </button>
            </li>
          })}
        </ul>
      </section>)}
    </div>
  </aside>
}
