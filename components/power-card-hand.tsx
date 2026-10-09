"use client"

import React, { useEffect, useState } from "react"
import styles from "./power-card-hand.module.css"
import { MULLIGAN_ANIMATION_MS } from "@/lib/power-presentation"

export type PowerCardKind = "best" | "worst" | "undo" | "freeze" | "shield"
export type PowerCardAction = React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }
const cards = [
  { kind: "best", name: "Best moves", cost: 1, color: "#39ff72", art: [42, 140, 345, 377] },
  { kind: "worst", name: "Worst moves", cost: 1, color: "#ff454e", art: [445, 140, 345, 377] },
  { kind: "undo", name: "Mulligan", cost: 2, color: "#cf65ff", art: [845, 140, 345, 377] },
  { kind: "freeze", name: "Freeze", cost: 3, color: "#36dcff", art: [217, 718, 368, 398] },
  { kind: "shield", name: "Shield", cost: 3, color: "#ffc337", art: [638, 718, 368, 398] },
] as const

export function PowerCardHand({ visible, actions, undoAnimationKey }: { visible: boolean; actions: Record<PowerCardKind, PowerCardAction>; undoAnimationKey?: number }) {
  const [active, setActive] = useState<number | null>(null)
  const [angles, setAngles] = useState([-10, -5, 0, 5, 10])
  const [mulliganAnimating, setMulliganAnimating] = useState(false)
  const [entryAnimating, setEntryAnimating] = useState(false)
  const previousUndoKey = React.useRef(undoAnimationKey ?? 0)
  useEffect(() => setAngles([-10, -5, 0, 5, 10].map(angle => angle + Math.random() * 2 - 1)), [])
  useEffect(() => {
    if (!visible) {
      setEntryAnimating(false)
      return
    }
    setEntryAnimating(true)
    const timeout = window.setTimeout(() => setEntryAnimating(false), 740)
    return () => window.clearTimeout(timeout)
  }, [visible])
  useEffect(() => {
    const nextKey = undoAnimationKey ?? 0
    if (nextKey <= previousUndoKey.current) {
      previousUndoKey.current = nextKey
      return
    }
    previousUndoKey.current = nextKey
    setMulliganAnimating(true)
    const timeout = window.setTimeout(() => setMulliganAnimating(false), MULLIGAN_ANIMATION_MS)
    return () => window.clearTimeout(timeout)
  }, [undoAnimationKey])
  return <div className={styles.row} style={{ opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden" }}>
    <div className={styles.hand} aria-label="Super-powers" onPointerLeave={() => setActive(null)}>
      {cards.map((card, index) => {
        const action = actions[card.kind]
        const [x, y, width, height] = card.art
        const focused = active === index
        return <button key={card.kind} {...action} type="button" className={styles.card}
          aria-label={`${card.name} · ${card.cost} golden egg${card.cost === 1 ? "" : "s"}`}
          data-power-card={card.kind} data-match-power-action={card.kind === "freeze" || card.kind === "shield" ? card.kind : undefined}
          data-ranked-move-action={card.kind === "best" || card.kind === "worst" ? card.kind : undefined}
          onPointerEnter={event => { setActive(index); action.onPointerEnter?.(event) }}
          onFocus={event => { setActive(index); action.onFocus?.(event) }}
          onBlur={event => { setActive(null); action.onBlur?.(event) }}
          style={{ "--card-color": card.color, "--angle": `${angles[index]}deg`, "--arc-y": `${[14, 4, 0, 4, 14][index]}px`, "--spread": active === null ? "0%" : index < active ? "-22%" : index > active ? "22%" : "0%", "--lift": focused ? "-12px" : "0px", "--entry-delay": `${index * 55}ms`, "--mulligan-ms": `${MULLIGAN_ANIMATION_MS}ms`, zIndex: mulliganAnimating && card.kind === "undo" ? 20 : focused ? 10 : index + 1 } as React.CSSProperties}
          data-entry-animating={entryAnimating ? "true" : undefined}
          data-visible={visible ? "true" : undefined}
          data-mulligan-animating={mulliganAnimating && card.kind === "undo" ? "true" : undefined}>
          <span className={styles.title}>{card.name}</span>
          <span className={styles.cost} aria-hidden="true">{card.cost}<span className={styles.egg} /></span>
          <span className={styles.art} aria-hidden="true" style={{ aspectRatio: `${width}/${height}` }}>
            <img src="/power-cards/powers-art.png" alt="" draggable={false} style={{ width: `${1254 / width * 100}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} />
          </span>
        </button>
      })}
    </div>
  </div>
}
