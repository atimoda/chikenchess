"use client"

import { useCallback, useMemo } from 'react'
import { ChickenPortal, playPortalSound } from '@/components/chicken/chicken-portal'
import type { ChickenEngine } from '@/lib/chicken/engine'
import { portalGate, PORTAL_TRANSITION_MS } from '@/lib/chicken/portal'
import { elementsInWorld, portalPartner, type LayoutElement } from '@/lib/pigchicken/layout'

export function PatioPortals({ engine, extras, worldRef, elements, screens, editing }: {
  engine: ChickenEngine | null
  extras: React.RefObject<Map<string, ChickenEngine>>
  worldRef: React.RefObject<HTMLDivElement | null>
  elements?: LayoutElement[]
  screens: number
  editing: boolean
}) {
  const portals = useMemo(() => elementsInWorld({ v: 2, elements: elements ?? [] }, screens).filter(e => e.kind === 'portal'), [elements, screens])
  const actors = useCallback(() => [...(engine ? [engine] : []), ...extras.current.values()], [engine, extras])
  return <>{portals.map(el => {
    const destination = portalPartner(el, portals)
    return <ChickenPortal key={el.id} id={el.id} engine={engine} actors={actors}
      world={{ host: worldRef, x: el.x + el.w / 2, groundY: el.y + el.h - 6, d: el.w }}
      enabled={!editing && !!destination}
      label={el.params.portalLabel ?? 'Entrar no portal?'} instructionMode={el.params.portalInstruction}
      onEnter={actor => {
        const box = worldRef.current?.getBoundingClientRect()
        if (!box || !destination || editing) return false
        portalGate(actor, destination.id).block()
        actor.arriveAtPortal({ x: box.left + destination.x + destination.w / 2, y: box.top + destination.y + destination.h / 2, durationMs: PORTAL_TRANSITION_MS })
        playPortalSound('arrive')
        return true
      }} />
  })}</>
}
