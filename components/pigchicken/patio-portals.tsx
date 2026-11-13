"use client"

import { useCallback, useMemo } from 'react'
import { ChickenPortal, playPortalSound } from '@/components/chicken/chicken-portal'
import type { ChickenEngine } from '@/lib/chicken/engine'
import { portalGate, PORTAL_TRANSITION_MS } from '@/lib/chicken/portal'
import { elementsInWorld, LAYOUT_VERSION, portalPartner, type LayoutElement } from '@/lib/pigchicken/layout'
import { portalTarget } from '@/lib/pigchicken/portal-links'

// where a portal to another Pátio sends her: the page checks the Pátio and opens it (her drawing stays hidden in
// the portal meanwhile), or brings her back out of this portal with the notice
export type PatioPortalTravel = (target: string, portal: { id: string; centre: () => { x: number; y: number } | null }, actor: ChickenEngine) => void

export function PatioPortals({ engine, extras, worldRef, elements, screens, editing, onTravel }: {
  engine: ChickenEngine | null
  extras: React.RefObject<Map<string, ChickenEngine>>
  worldRef: React.RefObject<HTMLDivElement | null>
  elements?: LayoutElement[]
  screens: number
  editing: boolean
  onTravel?: PatioPortalTravel
}) {
  const portals = useMemo(() => elementsInWorld({ v: LAYOUT_VERSION, elements: elements ?? [] }, screens).filter(e => e.kind === 'portal'), [elements, screens])
  const actors = useCallback(() => [...(engine ? [engine] : []), ...extras.current.values()], [engine, extras])
  return <>{portals.map(el => {
    const target = portalTarget(el)
    const destination = target === undefined ? portalPartner(el, portals) : null
    return <ChickenPortal key={el.id} id={el.id} engine={engine} actors={actors}
      world={{ host: worldRef, x: el.x + el.w / 2, groundY: el.y + el.h - 6, d: el.w }}
      enabled={!editing && (target === undefined ? !!destination : !!target && !!onTravel)}
      label={el.params.portalLabel ?? 'Entrar no portal?'} instructionMode={el.params.portalInstruction}
      onEnter={actor => {
        const box = worldRef.current?.getBoundingClientRect()
        if (!box || editing) return false
        if (target) {
          if (!onTravel) return false
          onTravel(target, { id: el.id, centre: () => {
            const b = worldRef.current?.getBoundingClientRect()
            return b ? { x: b.left + el.x + el.w / 2, y: b.top + el.y + el.h / 2 } : null
          } }, actor)
          return true
        }
        if (!destination) return false
        portalGate(actor, destination.id).block()
        actor.arriveAtPortal({ x: box.left + destination.x + destination.w / 2, y: box.top + destination.y + destination.h / 2, durationMs: PORTAL_TRANSITION_MS })
        playPortalSound('arrive')
        return true
      }} />
  })}</>
}
