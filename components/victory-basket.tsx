'use client'

/* global Animation */

import { useEffect, useId, useRef, useState } from 'react'
import type { ConquestResult } from '@/lib/game-progression'
import { basketVisualEggCount } from '@/lib/match-eggs'
import styles from './victory-basket.module.css'

export interface EggBasketSource {
  amount: number
  element: () => HTMLElement | null
}

/** Presentation only: settlement is persisted before this component mounts. */
export function EggBasketTransfer({ earnedEggs, accountEggs, sources, onLaunch, onLand, onComplete }: {
  earnedEggs: number; accountEggs: number; sources: EggBasketSource[]
  onLaunch?: (amount: number, source: number) => void
  onLand?: (amount: number) => void
  onComplete?: () => void
}) {
  const [landed, setLanded] = useState(0)
  const basketRef = useRef<SVGSVGElement>(null)
  const callbacks = useRef({ onLaunch, onLand, onComplete })
  callbacks.current = { onLaunch, onLand, onComplete }
  const gradientId = useId().replace(/:/g, '')
  useEffect(() => {
    let transferred = 0
    let launched = 0
    let finished = false
    const launchedBySource = sources.map(() => 0)
    const flights = new Set<{ element: HTMLElement; animation: Animation }>()
    const timers: number[] = []
    const clearFlights = () => {
      timers.forEach(clearTimeout)
      flights.forEach(({ element, animation }) => { animation.cancel(); element.remove() })
      flights.clear()
    }
    const finish = () => {
      if (finished) return
      finished = true
      clearFlights()
      sources.forEach((source, index) => {
        const remainder = source.amount - launchedBySource[index]
        if (remainder > 0) callbacks.current.onLaunch?.(remainder, index)
      })
      setLanded(earnedEggs)
      if (earnedEggs > transferred) callbacks.current.onLand?.(earnedEggs - transferred)
      callbacks.current.onComplete?.()
    }
    if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches || earnedEggs === 0) {
      finish()
      return
    }
    // Sonner slides the reward card into place before its basket is a stable target.
    const entranceDelay = basketRef.current?.closest('[data-sonner-toast]') ? 450 : 0
    sources.forEach((source, sourceIndex) => {
      const count = Math.min(source.amount, 8)
      for (let i = 0; i < count; i++) {
        const amount = Math.floor((i + 1) * source.amount / count) - Math.floor(i * source.amount / count)
        const delay = entranceDelay + launched++ * 140
        timers.push(window.setTimeout(() => {
          if (finished) return
          const from = source.element()?.getBoundingClientRect()
          const to = basketRef.current?.getBoundingClientRect()
          launchedBySource[sourceIndex] += amount
          callbacks.current.onLaunch?.(amount, sourceIndex)
          const land = () => {
            if (finished) return
            transferred += amount
            setLanded(transferred)
            callbacks.current.onLand?.(amount)
            if (transferred === earnedEggs) { finished = true; callbacks.current.onComplete?.() }
          }
          if (!from || !to) { land(); return }
          const egg = document.createElement('span')
          egg.className = styles.flyingEgg
          egg.setAttribute('aria-hidden', 'true')
          document.body.appendChild(egg)
          const x = from.left + from.width / 2 - 8
          const y = from.top + from.height / 2 - 11
          const endX = to.left + to.width / 2 - 8 + (i % 3 - 1) * 12
          const endY = to.top + to.height * .46 - 11
          const apexX = x + (endX - x) * .25
          const apexY = y - 38
          const keyframes = Array.from({ length: 41 }, (_, frame) => {
            const t = frame / 40
            const rising = t <= .3
            const u = rising ? t / .3 : (t - .3) / .7
            // Two quadratic arcs: rise above the counter, then curve down into the basket.
            const px = rising ? (1-u)**2*x + 2*(1-u)*u*x + u*u*apexX
              : (1-u)**2*apexX + 2*(1-u)*u*endX + u*u*endX
            const py = rising ? (1-u)**2*y + 2*(1-u)*u*apexY + u*u*apexY
              : (1-u)**2*apexY + 2*(1-u)*u*apexY + u*u*endY
            return { transform: `translate(${px}px, ${py}px) rotate(${t * 45 - 15}deg)`, opacity: t > .9 ? (1-t)*10 : 1 }
          })
          const animation = egg.animate(keyframes, { duration: 850, easing: 'linear', fill: 'forwards' })
          const flight = { element: egg, animation }
          flights.add(flight)
          animation.onfinish = () => { egg.remove(); flights.delete(flight); land() }
        }, delay))
      }
    })
    const hide = () => { if (document.hidden) finish() }
    document.addEventListener('visibilitychange', hide)
    return () => { finished = true; clearFlights(); document.removeEventListener('visibilitychange', hide) }
  }, [earnedEggs, sources])
  const balance = accountEggs - earnedEggs + landed
  const visibleCount = basketVisualEggCount(balance)
  return <div className={styles.stage} aria-label={`${balance.toLocaleString()} golden eggs in your account`}>
    <svg ref={basketRef} viewBox="0 0 200 135" className={styles.basket} aria-hidden="true">
      <defs><linearGradient id={`${gradientId}-wicker`} x2="0" y2="1"><stop stopColor="#c38b49"/><stop offset="1" stopColor="#70421e"/></linearGradient><radialGradient id={`${gradientId}-gold`}><stop stopColor="#fff2aa"/><stop offset="1" stopColor="#d99818"/></radialGradient></defs>
      <path d="M42 71 C42 0 158 0 158 71" fill="none" stroke="#c38b49" strokeWidth="9"/>
      <path d="M28 73 Q100 53 172 73 L155 122 Q100 141 45 122 Z" fill={`url(#${gradientId}-wicker)`} stroke="#e2b578" strokeWidth="3"/>
      {[83,95,107,119].map(y=><path key={y} d={`M37 ${y} Q100 ${y+16} 163 ${y}`} fill="none" stroke="#e2b578" strokeOpacity=".5" strokeWidth="3"/>)}
      {[54,76,100,124,146].map(x=><path key={x} d={`M${x} 73 L${100+(x-100)*.8} 128`} stroke="#56321a" strokeOpacity=".5" strokeWidth="3"/>)}
      {Array.from({ length: visibleCount }, (_, i) => {
        const row = Math.floor(i / 5)
        const x = 54 + (i % 5) * 23
        const y = 86 - row * 14
        return <ellipse key={i} data-basket-egg cx={x} cy={y} rx="10" ry="14" fill={`url(#${gradientId}-gold)`} stroke="#bc851b" strokeWidth=".7" transform={`rotate(${i%2?12:-12} ${x} ${y})`}/>
      })}
      <path d="M28 73 Q100 53 172 73" fill="none" stroke="#f0c890" strokeWidth="7"/>
    </svg>
    <span className={styles.basketCount}>{balance.toLocaleString()}</span>
  </div>
}

export function VictoryBasket({ result, collected, sources, draw = false, onLaunch, onLand, onComplete, onReturn }: {
  result: ConquestResult; collected: number; sources: EggBasketSource[]; draw?: boolean
  onLaunch: (amount: number, source: number) => void; onLand: (amount: number) => void
  onComplete: () => void; onReturn: () => void
}) {
  return <section className={styles.card} aria-label={draw ? 'Draw rewards' : 'Victory rewards'}>
    <div className={styles.heading}>{draw ? 'DRAW — EGGS SHARED' : 'CITY CONQUERED!'}</div>
    <EggBasketTransfer earnedEggs={result.earnedEggs} accountEggs={result.profile.goldenEggs} sources={sources} onLaunch={onLaunch} onLand={onLand} onComplete={onComplete}/>
    <p className={styles.takeHome}>You took home <strong>{result.earnedEggs} golden {result.earnedEggs === 1 ? 'egg' : 'eggs'}!</strong></p>
    <p>You now have <strong>{result.profile.goldenEggs.toLocaleString()} golden eggs.</strong></p>
    <p className={styles.history}>Plus {collected} historic {collected === 1 ? 'point' : 'points'} from eggs earned with a full egg counter.</p>
    <div className={styles.rank}>{result.rankedUp ? 'Promoted to ' : 'Rank: '}{result.newRank}<span>{result.profile.points.toLocaleString()} all-time points</span></div>
    <button className={styles.returnButton} onClick={onReturn}>Return to map <span aria-hidden="true">→</span></button>
  </section>
}
