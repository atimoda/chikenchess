"use client"

import React, { type RefObject, type TransitionEventHandler } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CityData } from "@/lib/cities-data"
import { formatEvaluation } from "@/lib/chess-evaluation"
import type { WidgetConnection } from "@/hooks/use-game-widget-layout"

export function GameWidgetEntranceStyles() {
  return (
      <style jsx global>{`
        .continue-btn:hover {
            border-color: var(--city-neon) !important;
            box-shadow: 0 0 15px var(--city-neon) !important;
        }
        @keyframes game-widget-fly-from-left {
            from { opacity: 0; transform: translateX(-100vw); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes game-widget-fly-from-right {
            from { opacity: 0; transform: translateX(100vw); }
            to { opacity: 1; transform: translateX(0); }
        }
        [data-widget-entrance="true"] [data-widget="mixer"],
        [data-widget-entrance="true"] [data-widget="spectrum"],
        [data-widget-entrance="true"] [data-widget="strudel"],
        [data-widget-entrance="true"] [data-widget="board"] {
            animation: game-widget-fly-from-left 950ms cubic-bezier(.16, 1, .3, 1) both;
        }
        [data-widget-entrance="true"] [data-widget="piece"] {
            animation: game-widget-fly-from-right 950ms cubic-bezier(.16, 1, .3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
            [data-widget-entrance="true"] [data-widget] { animation: none; }
        }
      `}</style>
  )
}

export function GameCityBackground({ city, isBackgroundDark, introPhase }: { city: Pick<CityData, 'image' | 'color'>; isBackgroundDark: boolean; introPhase: number }) {
  return <>
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-[3000ms]"
        style={{
            backgroundImage: `url(${city.image})`,
            filter: (!isBackgroundDark && introPhase < 3) 
                ? "grayscale(0%) contrast(100%) brightness(100%) blur(0px)"
                : "grayscale(100%) contrast(120%) brightness(30%) blur(0px)", // Darken for game
            opacity: (!isBackgroundDark && introPhase < 3) ? 0.8 : 0.4
        }}
      />
      
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(${city.color}20 1px, transparent 1px),
            linear-gradient(90deg, ${city.color}20 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

  </>
}

export function GameCityTitleIntro({ city, showIntroBoxes, showIntroGlow, introExitStarted, onTitleTransitionEnd }: {
  city: Pick<CityData, 'name' | 'genre' | 'year' | 'color'>
  showIntroBoxes: boolean
  showIntroGlow: boolean
  introExitStarted: boolean
  onTitleTransitionEnd?: TransitionEventHandler<HTMLElement>
}) {
  return (
                  <div className="flex flex-col items-center gap-3 md:gap-4 w-full px-4 text-center">
                      <h2
                          onTransitionEnd={onTitleTransitionEnd}
                          className={cn(
                              "text-5xl md:text-7xl lg:text-8xl font-black transition-[opacity,text-shadow]",
                              showIntroBoxes ? "opacity-100" : "opacity-0"
                          )}
                          style={{
                            color: 'black',
                            textShadow: showIntroGlow ? `0 0 15px ${city.color}, 0 0 30px ${city.color}` : '0 0 0 transparent, 0 0 0 transparent',
                            transitionProperty: 'opacity, text-shadow',
                            transitionDuration: introExitStarted ? (showIntroBoxes ? '0ms, 1500ms' : '1000ms, 0ms') : '700ms, 0ms',
                          }}
                      >
                          {city.name.toUpperCase()}
                      </h2>
                      <p
                          className={cn(
                              "text-3xl md:text-4xl font-normal transition-[opacity,text-shadow]",
                              showIntroBoxes ? "opacity-100" : "opacity-0"
                          )}
                          style={{
                            color: 'black',
                            textShadow: showIntroGlow ? `0 0 15px ${city.color}, 0 0 30px ${city.color}` : '0 0 0 transparent, 0 0 0 transparent',
                            transitionProperty: 'opacity, text-shadow',
                            transitionDuration: introExitStarted ? (showIntroBoxes ? '0ms, 1500ms' : '1000ms, 0ms') : '700ms, 0ms',
                          }}
                      >
                          {city.genre} ({city.year})
                      </p>
                  </div>
  )
}

export function GameWidgetConnections({ visible, pieceConnections, chainConnections }: { visible: boolean; pieceConnections: readonly WidgetConnection[]; chainConnections: readonly WidgetConnection[] }) {
  if (!visible) return null
  return (
      <svg aria-label="Conexões entre widgets e tabuleiro" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
        {[...pieceConnections, ...chainConnections].map((conn, i) => {
          if (!conn) return null
          
          const startX = conn.x1
          const startY = conn.y1
          const endX = conn.x2
          const endY = conn.y2
          
          // Standard S-curve (Cubic Bezier)
          // Adjust control points based on exit/entry direction
          const dist = Math.hypot(endX - startX, endY - startY)
          const handleLen = dist * 0.5

          let cp1x = startX, cp1y = startY
          let cp2x = endX, cp2y = endY

          switch(conn.sourceSide) {
              case 'left': cp1x -= handleLen; break;
              case 'right': cp1x += handleLen; break;
              case 'top': cp1y -= handleLen; break;
              case 'bottom': cp1y += handleLen; break;
          }

          switch(conn.targetSide) {
              case 'left': cp2x -= handleLen; break;
              case 'right': cp2x += handleLen; break;
              case 'top': cp2y -= handleLen; break;
              case 'bottom': cp2y += handleLen; break;
          }

          const r = 4 // Handle radius

          // Source Handle (Widget) - Anchored to widget edge, bulging OUTWARDS
          let sourceHandlePath = ""
          const ax1 = conn.anchorX1 ?? startX // Fallback if type issue, though we added it
          const ay1 = conn.anchorY1 ?? startY

          if (conn.sourceSide === 'left') {
              // Bulge Left (CCW, sweep 0)
              sourceHandlePath = `M ${ax1} ${ay1 - r} A ${r} ${r} 0 0 0 ${ax1} ${ay1 + r}`
          } else if (conn.sourceSide === 'right') {
              // Bulge Right (CW, sweep 1)
              sourceHandlePath = `M ${ax1} ${ay1 - r} A ${r} ${r} 0 0 1 ${ax1} ${ay1 + r}`
          } else if (conn.sourceSide === 'top') {
              // Bulge Up (CW, sweep 1 - FLIPPED) 
              // Start (-4, 0). End (4, 0). Vector Right. 
              sourceHandlePath = `M ${ax1 - r} ${ay1} A ${r} ${r} 0 0 1 ${ax1 + r} ${ay1}`
          } else if (conn.sourceSide === 'bottom') {
              // Bulge Down (CCW, sweep 0 - FLIPPED)
              sourceHandlePath = `M ${ax1 - r} ${ay1} A ${r} ${r} 0 0 0 ${ax1 + r} ${ay1}`
          }

          // Target Handle - Anchored to widget edge, bulging OUTWARDS
          let targetHandlePath = ""
          const ax2 = conn.anchorX2 ?? endX
          const ay2 = conn.anchorY2 ?? endY

          if (conn.targetSide === 'bottom') {
              // Bulge Down (CCW, sweep 0 - FLIPPED)
              targetHandlePath = `M ${ax2 - r} ${ay2} A ${r} ${r} 0 0 0 ${ax2 + r} ${ay2}`
          } else if (conn.targetSide === 'left') {
              targetHandlePath = `M ${ax2} ${ay2 - r} A ${r} ${r} 0 0 0 ${ax2} ${ay2 + r}`
          } else if (conn.targetSide === 'right') {
              targetHandlePath = `M ${ax2} ${ay2 - r} A ${r} ${r} 0 0 1 ${ax2} ${ay2 + r}`
          } else if (conn.targetSide === 'top') {
              // Bulge Up (CW, sweep 1 - FLIPPED)
              targetHandlePath = `M ${ax2 - r} ${ay2} A ${r} ${r} 0 0 1 ${ax2 + r} ${ay2}`
          }

          return (
             <React.Fragment key={i}>
               <path
                 d={`M ${startX} ${startY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endX} ${endY}`}
                 stroke="white"
                 strokeWidth={1.5}
                 fill="none"
                 className="opacity-20"
               />
               {sourceHandlePath && (
                   <path
                       d={sourceHandlePath}
                       fill="white"
                       className="opacity-20"
                   />
               )}
               {targetHandlePath && (
                   <path
                       d={targetHandlePath}
                       fill="white"
                       className="opacity-20"
                   />
               )}
             </React.Fragment>
          )
        })}
      </svg>
  )
}

export function GameFooter({ visible, moves, tickerRef, score, mate, evaluationError, evaluating, dimmed }: {
  visible: boolean
  moves: readonly string[]
  tickerRef: RefObject<HTMLDivElement | null>
  score: number | null
  mate: number | null
  evaluationError?: string | null
  evaluating: boolean
  dimmed: boolean
}) {
  // Visual balance only, not a probability model. Keep large non-mate scores distinguishable.
  const whitePercent = score === null ? 50 : mate !== null
    ? (score < 0 ? 0 : 100)
    : 50 + 50 * score / (Math.abs(score) + 300)
  return (
      <div className={cn("fixed inset-x-0 bottom-0 z-[40] w-full pointer-events-none transition-opacity duration-1000", !visible ? "opacity-0" : "opacity-100")}>
        <div aria-label="Histórico de jogadas" className="flex h-6 w-full items-center overflow-hidden bg-transparent px-3 pointer-events-auto">
          <div ref={tickerRef} className="flex w-full items-center justify-start gap-3 overflow-x-auto whitespace-nowrap font-mono text-xs scrollbar-hide" style={{ textShadow: "1px 1px 1px black" }}>
            {moves.map((move, i) => <span key={i} className={i % 2 === 0 ? "text-white" : "text-muted-foreground"}>
              {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ""} {move}
            </span>)}
          </div>
        </div>
        <div className="relative h-2 w-full overflow-hidden border-t border-white/10 bg-black/40 select-none" role="img" aria-label={`Avaliação da posição: ${evaluationError ? 'indisponível' : score === null ? 'em análise' : formatEvaluation(score, mate)}`}>
          <div className={cn("absolute inset-y-0 left-0 bg-white ease-in-out", score === null ? "transition-none" : "transition-[width] duration-1000", dimmed ? "opacity-25" : "opacity-100")} style={{ width: `${whitePercent}%` }} />
          {evaluating && <div className="absolute right-2 top-1/2 z-30 -translate-y-1/2"><Loader2 className="h-2 w-2 animate-spin text-white" /></div>}
        </div>
        <style jsx>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
      </div>
  )
}

export function GameActionCostHint({ visible, amount }: { visible: boolean; amount: number }) {
  return <span aria-hidden="true" className={cn("pointer-events-none absolute -right-2.5 z-10 flex items-center gap-1 whitespace-nowrap rounded border border-zinc-500 bg-white px-1.5 py-0.5 text-[10px] leading-none font-bold text-red-900 opacity-0",visible && "opacity-100")} style={{bottom:"calc(100% - 5px)"}}>
    <span>-{amount}</span><span className="inline-block h-3 w-[9px] rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)] shadow-[0_0_5px_#fbbf24]" />
  </span>
}

/** Keep the campaign action groups in their shared board-width row. */
export function GameActionRow({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return <div className={cn("relative z-50 mb-2 sm:mb-4 grid w-[var(--game-board-width)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2 transition-opacity duration-1000 pointer-events-none max-[360px]:grid-cols-2 max-[360px]:[&>div:nth-child(2)]:col-span-2 max-[360px]:[&>div:nth-child(2)]:order-3", visible ? "opacity-100" : "opacity-0")}>
    {children}
  </div>
}
