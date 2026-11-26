"use client"

import { useMemo, type CSSProperties } from "react"
import { PiecesSVG } from "@/lib/chess-piece-svg"
import { cn, stableHtml } from "@/lib/utils"

type PieceKey = keyof typeof PiecesSVG
const FILES = "abcdefgh"

/** Board squares from a FEN, rank 8 first, each as `{ square, piece }`. */
export function fenSquares(fen: string, orientation: "white" | "black" = "white") {
  const ranks = fen.split(" ")[0].split("/")
  const squares: { square: string; piece: PieceKey | null; light: boolean }[] = []
  ranks.forEach((row, r) => {
    let file = 0
    for (const char of row) {
      const empty = Number(char)
      if (empty) {
        for (let i = 0; i < empty; i++, file++) squares.push({ square: `${FILES[file]}${8 - r}`, piece: null, light: (r + file) % 2 === 0 })
      } else {
        const color = char === char.toUpperCase() ? "w" : "b"
        squares.push({ square: `${FILES[file]}${8 - r}`, piece: `${color}${char.toUpperCase()}` as PieceKey, light: (r + file) % 2 === 0 })
        file++
      }
    }
  })
  return orientation === "white" ? squares : squares.reverse()
}

/** Static, read-only miniature of a position, styled like the match board. */
export function MoveBoardPreview({ fen, from, to, cityColor, orientation = "white", className, style }: {
  fen: string
  from?: string
  to?: string
  cityColor: string
  orientation?: "white" | "black"
  className?: string
  style?: CSSProperties
}) {
  const squares = useMemo(() => fenSquares(fen, orientation), [fen, orientation])
  return (
    <div
      aria-hidden="true"
      className={cn("grid grid-cols-8 overflow-hidden rounded-sm bg-black/80 shadow-[0_6px_24px_rgba(0,0,0,0.6)] backdrop-blur-sm pointer-events-none select-none", className)}
      style={style}
    >
      {squares.map(({ square, piece, light }) => (
        <div
          key={square}
          className="relative flex aspect-square items-center justify-center"
          style={{ backgroundColor: light ? "rgba(255, 255, 255, 0.2)" : `color-mix(in srgb, ${cityColor} 60%, rgba(150, 150, 150, 0.75) 80%)` }}
        >
          {(square === from || square === to) && <span className="absolute inset-0" style={{ backgroundColor: "rgba(220, 205, 255, 0.35)" }} />}
          {piece && (
            <div
              className={cn("relative h-[85%] w-[85%] [&_svg]:h-full [&_svg]:w-full", piece[0] === "b" && "[&_svg_*]:!stroke-white/30")}
              dangerouslySetInnerHTML={stableHtml(PiecesSVG[piece])}
            />
          )}
        </div>
      ))}
    </div>
  )
}
