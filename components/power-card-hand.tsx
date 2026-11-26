"use client"

import React, { useEffect, useState } from "react"
import styles from "./power-card-hand.module.css"
import { MULLIGAN_ANIMATION_MS } from "@/lib/power-presentation"
import { BoardResizeHandles } from "./board-resize-handles"
import type { BoardResizeCorner } from "@/hooks/use-board-resize"
import { msg, useT } from "@/lib/i18n"

export type PowerCardKind = "best" | "worst" | "undo" | "freeze" | "shield"
export type PowerCardAction = React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }
const cards = [
  { kind: "best", name: msg("Best moves"), cost: 1, color: "#39ff72", art: [42, 140, 345, 377] },
  { kind: "worst", name: msg("Worst moves"), cost: 1, color: "#ff454e", art: [445, 140, 345, 377] },
  { kind: "undo", name: "Mulligan", cost: 2, color: "#cf65ff", art: [845, 140, 345, 377] },
  { kind: "freeze", name: "Freeze", cost: 3, color: "#36dcff", art: [217, 718, 368, 398] },
  { kind: "shield", name: "Shield", cost: 3, color: "#ffc337", art: [638, 718, 368, 398] },
] as const

export interface PowerCardResize {
  enabled: boolean
  onStart: (event: React.PointerEvent<HTMLButtonElement>, corner: BoardResizeCorner) => void
  onResizeBy: (delta: number) => void
  onCancel: () => void
}

/** Drag from the hand's empty background moves the cards (session-only `translate`, see useBoardPan). */
export interface PowerCardMove {
  translate: string
  moving: boolean
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void
}

/**
 * The hand is sized by `--power-cards-width`, independent of the board: resizing the board never
 * resizes the cards. `resize` adds the four corner handles of the board to the hand's container, and
 * `move` lets the empty background of the container drag the whole hand.
 */
export function PowerCardHand({ visible, actions, undoAnimationKey, rowRef, resize, move, hideCost = false }: { visible: boolean; actions: Record<PowerCardKind, PowerCardAction>; undoAnimationKey?: number; rowRef?: React.Ref<HTMLDivElement>; resize?: PowerCardResize; move?: PowerCardMove; /** Creative cards are free: no egg price. */ hideCost?: boolean }) {
  const t = useT()
  const [active, setActive] = useState<number | null>(null)
  const [angles, setAngles] = useState([-10, -5, 0, 5, 10])
  const [mulliganAnimating, setMulliganAnimating] = useState(false)
  const [entryAnimating, setEntryAnimating] = useState(false)
  const previousUndoKey = React.useRef(undoAnimationKey ?? 0)
  const pointerStartRef = React.useRef<{ pointerId: number; x: number; y: number; dragged: boolean } | null>(null)
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
  return <div ref={rowRef} className={styles.row} data-power-cards
    data-movable={move && visible ? "true" : undefined} data-moving={move?.moving ? "true" : undefined}
    onPointerDown={move ? event => {
      // Only the background: cards and resize handles keep their own gestures.
      const target = event.target as HTMLElement
      if (target.closest("button, [data-resize-target]")) return
      move.onPointerDown(event)
    } : undefined}
    style={{ opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden", translate: move?.translate }}>
    <div className={styles.hand} aria-label={t("Super-powers")} onPointerLeave={() => setActive(null)}>
      {resize && <BoardResizeHandles target="cards" enabled={resize.enabled && visible} onStart={resize.onStart} onResizeBy={resize.onResizeBy} onCancel={resize.onCancel} />}
      {cards.map((card, index) => {
        const action = actions[card.kind]
        const [x, y, width, height] = card.art
        const focused = active === index
        return <button key={card.kind} {...action} type="button" className={styles.card}
          aria-label={hideCost ? t(card.name) : card.cost === 1 ? t("{name} · 1 golden egg", { name: t(card.name) }) : t("{name} · {n} golden eggs", { name: t(card.name), n: card.cost })}
          data-power-card={card.kind} data-match-power-action={card.kind === "freeze" || card.kind === "shield" ? card.kind : undefined}
          data-ranked-move-action={card.kind === "best" || card.kind === "worst" ? card.kind : undefined}
          onPointerDown={event => {
            if (event.isPrimary && event.button === 0) {
              pointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragged: false }
            }
            action.onPointerDown?.(event)
          }}
          onPointerMove={event => {
            const start = pointerStartRef.current
            if (start && start.pointerId === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) {
              start.dragged = true
            }
            action.onPointerMove?.(event)
          }}
          onPointerCancel={event => {
            if (pointerStartRef.current?.pointerId === event.pointerId) pointerStartRef.current = null
            action.onPointerCancel?.(event)
          }}
          onClick={event => {
            const start = pointerStartRef.current
            pointerStartRef.current = null
            if (start?.dragged && event.detail > 0) {
              event.preventDefault()
              return
            }
            action.onClick?.(event)
          }}
          onPointerEnter={event => { setActive(index); action.onPointerEnter?.(event) }}
          onPointerLeave={event => { action.onPointerLeave?.(event) }}
          onMouseEnter={event => { action.onMouseEnter?.(event) }}
          onMouseLeave={event => { action.onMouseLeave?.(event) }}
          onFocus={event => { setActive(index); action.onFocus?.(event) }}
          onBlur={event => { setActive(null); action.onBlur?.(event) }}
          style={{ "--card-color": card.color, "--angle": `${angles[index]}deg`, "--arc-y": `${[14, 4, 0, 4, 14][index]}px`, "--spread": active === null ? "0%" : index < active ? "-22%" : index > active ? "22%" : "0%", "--lift": focused ? "-12px" : "0px", "--entry-delay": `${index * 55}ms`, "--mulligan-ms": `${MULLIGAN_ANIMATION_MS}ms`, zIndex: mulliganAnimating && card.kind === "undo" ? 20 : focused ? 10 : index + 1 } as React.CSSProperties}
          data-entry-animating={entryAnimating ? "true" : undefined}
          data-visible={visible ? "true" : undefined}
          data-mulligan-animating={mulliganAnimating && card.kind === "undo" ? "true" : undefined}>
          <span className={styles.title}>{t(card.name)}</span>
          {!hideCost && <span className={styles.cost} aria-hidden="true">{card.cost}<span className={styles.egg} /></span>}
          <span className={styles.art} aria-hidden="true" style={{ aspectRatio: `${width}/${height}` }}>
            <img src="/power-cards/powers-art.png" alt="" draggable={false} style={{ width: `${1254 / width * 100}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} />
          </span>
        </button>
      })}
    </div>
  </div>
}
