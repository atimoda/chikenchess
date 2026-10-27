"use client"

import type { CSSProperties, Ref } from "react"
import { cn } from "@/lib/utils"

interface EggCounterProps {
  ref?: Ref<HTMLDivElement>
  value: number
  /** Counts shown on both sides; the wider one sets a shared width so both boxes match. */
  widthFor: readonly number[]
  tone: "player" | "opponent"
  empty?: boolean
  className?: string
  "aria-label"?: string
  "aria-hidden"?: boolean | "true" | "false"
  role?: string
  title?: string
  /** Text shown instead of the number, such as the Creative's endless "∞". */
  display?: string
}

/** Golden-egg box used above (opponent) and below (player) the board in every match mode. */
export function EggCounter({ ref, value, widthFor, tone, empty, className, display, ...rest }: EggCounterProps) {
  const digits = Math.max(...widthFor.map(n => n.toLocaleString().length))
  return <div
    ref={ref}
    {...rest}
    className={cn(
      "flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border bg-black/45 px-2 font-mono text-xs font-bold",
      tone === "opponent" ? "border-zinc-500/50 text-zinc-300" : empty ? "border-red-500/80 text-red-400" : "border-amber-400/50 text-amber-200",
      className,
    )}
    style={{ width: `max(3.5rem, calc(${digits}ch + 41px))` }}
  >
    <span>{display ?? value.toLocaleString()}</span>
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-[19px] w-[15px] rounded-[50%_50%_45%_45%/60%_60%_40%_40%]",
        tone === "opponent"
          ? "bg-[radial-gradient(circle_at_32%_25%,#f4f4f5_0%,#a1a1aa_43%,#52525b_100%)] shadow-[0_0_6px_#a1a1aa33]"
          : "bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)] shadow-[0_0_8px_#fbbf24]",
      )}
    />
  </div>
}

interface MatchStatusProps {
  text: string
  color: string
  /** Opponent's turn shows the status above the board; anything else shows it below. */
  placement: "top" | "bottom"
  pulse?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Turn status line, centered on the board. The top slot floats above the opponent row so the
 * board never shifts; the bottom slot keeps its height to avoid moving the cards each turn.
 */
export function MatchStatus({ text, color, placement, pulse, className, style }: MatchStatusProps) {
  return <div
    role="status"
    className={cn(
      "w-[var(--game-board-width)] h-4 text-center text-[9px] sm:text-xs leading-4 font-mono truncate pointer-events-none",
      placement === "top" && "absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5",
      pulse && "animate-pulse",
      className,
    )}
    style={{ ...style, color }}
  >{text}</div>
}
