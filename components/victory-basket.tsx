'use client'

import { useEffect, useRef, useState } from 'react'
import type { ConquestResult } from '@/lib/game-progression'
import styles from './victory-basket.module.css'

/** Presentation only: the profile has already been credited before this mounts. */
export function VictoryBasket({ result, collected, onLand, onReturn }: {
  result: ConquestResult; collected: number; onLand: (amount: number) => void; onReturn: () => void
}) {
  const [landed, setLanded] = useState(0)
  const landRef = useRef(onLand)
  landRef.current = onLand
  const count = Math.min(result.earnedEggs, 16)
  useEffect(() => {
    let stopped = false
    let transferred = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setLanded(result.earnedEggs); landRef.current(result.earnedEggs); return }
    const timers = Array.from({ length: count }, (_, i) => window.setTimeout(() => {
      if (stopped || document.hidden) return
      const amount = Math.floor((i + 1) * result.earnedEggs / count) - Math.floor(i * result.earnedEggs / count)
      transferred += amount
      setLanded(value => value + amount)
      landRef.current(amount)
    }, 700 + i * 140))
    const hide = () => {
      if (!document.hidden) return
      stopped = true; timers.forEach(clearTimeout)
      setLanded(result.earnedEggs)
      landRef.current(result.earnedEggs - transferred)
    }
    document.addEventListener('visibilitychange', hide)
    return () => { stopped = true; timers.forEach(clearTimeout); document.removeEventListener('visibilitychange', hide) }
  }, [count, result.earnedEggs])
  return <section className={styles.card} aria-label="Victory rewards">
    <div className={styles.heading}>CITY CONQUERED!</div>
    <div className={styles.stage} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <span key={i} className={styles.fallingEgg} style={{ animationDelay: `${i * 140}ms`, left: `${28 + (i % 5) * 10}%` }} />)}
      <svg viewBox="0 0 200 135" className={styles.basket}>
        <defs><linearGradient id="victory-wicker" x2="0" y2="1"><stop stopColor="#c38b49"/><stop offset="1" stopColor="#70421e"/></linearGradient><radialGradient id="victory-gold"><stop stopColor="#fff2aa"/><stop offset="1" stopColor="#d99818"/></radialGradient></defs>
        <path d="M42 71 C42 0 158 0 158 71" fill="none" stroke="#c38b49" strokeWidth="9"/>
        {[65,88,112,136].map((x,i)=><ellipse key={x} cx={x} cy={65+(i%2)*5} rx="15" ry="21" fill="url(#victory-gold)" transform={`rotate(${i%2?15:-12} ${x} 70)`}/>)}
        <path d="M28 73 Q100 53 172 73 L155 122 Q100 141 45 122 Z" fill="url(#victory-wicker)" stroke="#e2b578" strokeWidth="3"/>
        {[83,95,107,119].map(y=><path key={y} d={`M37 ${y} Q100 ${y+16} 163 ${y}`} fill="none" stroke="#e2b578" strokeOpacity=".5" strokeWidth="3"/>)}
        {[54,76,100,124,146].map(x=><path key={x} d={`M${x} 73 L${100+(x-100)*.8} 128`} stroke="#56321a" strokeOpacity=".5" strokeWidth="3"/>)}
        <path d="M28 73 Q100 53 172 73" fill="none" stroke="#f0c890" strokeWidth="7"/>
      </svg>
      <span className={styles.basketCount}>{(result.profile.goldenEggs - result.earnedEggs + landed).toLocaleString()}</span>
    </div>
    <p className={styles.takeHome}>You took home <strong>{result.earnedEggs} golden {result.earnedEggs === 1 ? 'egg' : 'eggs'}!</strong></p>
    <p>You now have <strong>{result.profile.goldenEggs.toLocaleString()} golden eggs.</strong></p>
    <p className={styles.history}>Plus {collected} {collected === 1 ? 'egg' : 'eggs'} collected during the game added to your all-time points.</p>
    <div className={styles.rank}>{result.rankedUp ? 'Promoted to ' : 'Rank: '}{result.newRank}<span>{result.profile.points.toLocaleString()} all-time points</span></div>
    <button className={styles.returnButton} onClick={onReturn}>Return to map <span aria-hidden="true">→</span></button>
  </section>
}
