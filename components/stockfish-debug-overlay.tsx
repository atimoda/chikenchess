"use client"

import type React from "react"
import { useEffect, useRef, useState, type RefObject } from "react"
import { createPortal } from "react-dom"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import type { ChessMoveAnalysis, StockfishTrace } from "@/lib/chess-evaluation"
import { formatEvaluation } from "@/lib/chess-evaluation"

interface Props {
  cityColor: string
  trace: StockfishTrace | null
  analysis: ChessMoveAnalysis | null
  onClose: () => void
  onRetry: () => void
  boardRef: RefObject<HTMLDivElement | null>
  position: { x: number; y: number } | null
  onPositionChange: (position: { x: number; y: number }) => void
}

export function StockfishDebugOverlay({ cityColor, trace, analysis, onClose, onRetry, boardRef, position, onPositionChange }: Props) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef(position)
  positionRef.current = position

  useEffect(() => {
    setMounted(true)
    const place = () => {
      const board = boardRef.current?.getBoundingClientRect()
      const width = panelRef.current?.offsetWidth ?? Math.max(190, Math.min(window.innerWidth * .66, 330))
      const height = panelRef.current?.offsetHeight ?? Math.min(window.innerHeight * .62, 500)
      const current = positionRef.current
      const initialX = board && window.innerWidth - board.right >= width + 16
        ? board.right + 12
        : board && board.left >= width + 16
          ? board.left - width - 12
          : board ? board.right - width - 8 : window.innerWidth - width - 8
      const x = current?.x ?? initialX
      const y = current?.y ?? board?.top ?? 8
      const clamped = {
        x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
        y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
      }
      if (!current || current.x !== clamped.x || current.y !== clamped.y) onPositionChange(clamped)
    }
    const frame = window.requestAnimationFrame(place)
    window.addEventListener('resize', place)
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('resize', place) }
  }, [boardRef, onPositionChange])

  const current = trace?.fen && (!analysis || trace.fen === analysis.fen) ? trace : null
  if (!mounted || !position) return null
  return createPortal(<Draggable
    ref={panelRef}
    position={position}
    onDrag={next => {
      const width = panelRef.current?.offsetWidth ?? 330
      const height = panelRef.current?.offsetHeight ?? 500
      onPositionChange({
        x: Math.max(8, Math.min(next.x, window.innerWidth - width - 8)),
        y: Math.max(8, Math.min(next.y, window.innerHeight - height - 8)),
      })
    }}
    handleRef={dragHandleRef}
    className="h-[min(62dvh,500px)] w-[min(66vw,330px)] min-w-[190px]"
    style={{ position: 'fixed', zIndex: 1000 }}
  ><section
    aria-label="Debug stockfish"
    className="relative flex h-full w-full flex-col font-mono text-[10px] text-white"
    style={{ "--city-neon": cityColor } as React.CSSProperties}
    onClick={event => event.stopPropagation()}
  >
    <div
      className="absolute inset-0 rounded-md border bg-black/85 backdrop-blur-md"
      style={{ borderColor: "rgba(255,255,255,0.3)", boxShadow: `0 0 20px ${cityColor}40` }}
    />
    <button
      type="button"
      aria-label="Desligar Debug stockfish"
      className="absolute z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-background text-[var(--city-neon)] shadow-md transition-all hover:text-[#60a5fa]"
      style={{ borderColor: "rgba(255,255,255,0.3)", top: -5, left: -8, boxShadow: `0 0 10px ${cityColor}40` }}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); onClose() }}
    >
      <Power className="h-4 w-4 drop-shadow-[0_0_8px_currentColor]" />
    </button>
    <div ref={dragHandleRef} className="relative z-10 flex h-9 shrink-0 cursor-move touch-none select-none items-center justify-center px-8" title="Arraste para mover o Debug stockfish">
      <span className="truncate text-center text-xs font-bold uppercase tracking-wider text-white">DEBUG STOCKFISH</span>
      {trace?.phase === 'error' && <button type="button" data-no-drag="true" onPointerDown={event => event.stopPropagation()} onClick={onRetry} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-300 hover:text-amber-100">Retry</button>}
    </div>
    <div className="debug-scroll relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2.5 pb-2.5">
      {!current ? <p className="py-2 text-white/55">Aguardando a posição…</p> : <>
        <div className="sticky top-0 z-10 bg-black/90 py-1 text-white/70">
          <div>{current.phase.toUpperCase()} · {current.side === 'w' ? 'White' : 'Black'} to move · {current.legalMoves} legal</div>
          <div>depth {current.depth} · complete {current.completeDepth || '—'} · {current.nodes.toLocaleString()} nodes · {current.engineMs} ms · {current.nps.toLocaleString()} nps</div>
        </div>
        <div className="break-all border-y border-white/15 py-1 text-[9px] text-white/45">{current.fen}</div>
        {analysis?.fen === current.fen && analysis.complete && <div className="mt-2 border-b border-white/20 pb-2">
          <p className="text-amber-300">Best/Worst arrows · complete depth {analysis.depth}{analysis.final ? ' · final' : ' · preview'}</p>
          <p>Best: {analysis.best.map(move => `${move.san} ${formatEvaluation(move.score, move.mate)}`).join(' · ')}</p>
          <p>Worst: {analysis.worst.map(move => `${move.san} ${formatEvaluation(move.score, move.mate)}`).join(' · ')}</p>
        </div>}
        <p className="mt-2 text-emerald-300">Latest UCI lines · score from side to move</p>
        <p className="text-[9px] text-white/45">{analysis?.fen === current.fen && analysis.complete
          ? 'These lines may be from a newer, incomplete depth. Compare arrows with the complete-depth ranking above.'
          : 'These lines may be from different depths or include bounds. Arrows wait for a complete ranking.'}</p>
        <div className="space-y-1">
          {current.lines.length ? current.lines.map(line => <div key={line.multipv} className="border-b border-white/10 py-0.5">
            <div className="flex justify-between gap-1"><span>#{line.multipv} {line.san} ({line.uci})</span><strong className={line.mate !== null && line.mate < 0 ? 'text-red-300' : 'text-emerald-300'}>{formatEvaluation(line.score, line.mate)}{line.bound ? ` ${line.bound}` : ''}</strong></div>
            <div className="text-white/45">d{line.depth} · {line.pv.join(' ')}</div>
          </div>) : <p className="text-white/40">Aguardando linhas…</p>}
        </div>
        <p className="mt-2 border-t border-white/20 pt-1 text-white/50">UCI recebido · últimas {current.raw.length} linhas</p>
        <pre className="whitespace-pre-wrap break-all text-[9px] leading-3 text-white/45">{current.raw.join('\n')}</pre>
      </>}
    </div>
  </section></Draggable>, document.body)
}
