"use client"

import type { CSSProperties, RefObject } from "react"
import { PiecesSVG } from "@/components/chessground-board"
import { cn } from "@/lib/utils"

interface CapturedPiecesProps {
  /** Lowercase piece letters, in capture order. */
  pieces: readonly string[]
  /** Color of the captured pieces' SVG. */
  color: "w" | "b"
  viewportRef: RefObject<HTMLDivElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  scale: number
  /** "top" for the row under the board, "center" for the one above it. */
  align: "top" | "center"
  /** Neon outline drawn around the player's trophies. */
  outlineColor?: string
  className?: string
  "aria-label"?: string
}

export function CapturedPieces({ pieces, color, viewportRef, contentRef, scale, align, outlineColor, className, ...rest }: CapturedPiecesProps) {
  const itemStyle: CSSProperties | undefined = outlineColor ? {
    filter: `drop-shadow(1px 0 0 ${outlineColor}) drop-shadow(-1px 0 0 ${outlineColor}) drop-shadow(0 1px 0 ${outlineColor}) drop-shadow(0 -1px 0 ${outlineColor})`,
  } : undefined
  return <div ref={viewportRef} aria-label={rest["aria-label"]} className={cn("flex-1 min-w-0 overflow-hidden flex justify-start", align === "top" ? "h-8 items-start" : "h-full items-center", className)}>
    <div
      ref={contentRef}
      className={cn("flex w-max justify-start gap-0.5", align === "top" ? "items-start" : "items-center")}
      style={{ transform: `scale(${scale})`, transformOrigin: align === "top" ? "left top" : "left center" }}
    >
      {pieces.map((piece, i) => (
        <div
          key={i}
          className="w-6 h-6 shrink-0 opacity-90 p-0.5"
          style={itemStyle}
          dangerouslySetInnerHTML={{ __html: PiecesSVG[`${color}${piece.toUpperCase()}` as keyof typeof PiecesSVG] }}
        />
      ))}
    </div>
  </div>
}
