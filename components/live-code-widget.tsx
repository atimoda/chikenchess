"use client"

import type React from "react"
import { useRef, forwardRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Power, Copy, Check } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import { toast } from "sonner"
import type { CityData } from "@/lib/cities-data"

import { Resizable } from "re-resizable"

interface LiveCodeWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  pattern: string
  city: CityData
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  togglePortalized?: boolean
  isOn: boolean
  onToggle: () => void
  isPlaying: boolean
  playback?: React.ReactNode
  stockfishDebugOn: boolean
  onToggleStockfishDebug?: () => void
  botControlOn?: boolean
  onToggleBotControl?: () => void
  onForceWin?: () => void
  onGetEggs?: () => void
  onShowTopMoves?: (button: HTMLButtonElement) => void
  topMovesDisabled?: boolean
  codeVisible?: boolean
  onToggleCodeVisible?: () => void
  pieceDebugOn: boolean
  onTogglePieceDebug: () => void
}

export const LiveCodeWidget = forwardRef<HTMLDivElement, LiveCodeWidgetProps>(({
  pattern,
  city: _city,
  cityColor,
  position,
  onPositionChange,
  handleRef,
  toggleRef,
  togglePortalized = false,
  isOn,
  onToggle,
  isPlaying: _isPlaying,
  playback,
  stockfishDebugOn,
  onToggleStockfishDebug,
  botControlOn = false,
  onToggleBotControl,
  onForceWin,
  onGetEggs,
  onShowTopMoves,
  topMovesDisabled = false,
  codeVisible = true,
  onToggleCodeVisible,
  pieceDebugOn,
  onTogglePieceDebug,
  ...props
}, ref) => {
  // Remove onDrag from props to avoid type conflict with Draggable's onDrag
  const { onDrag: _onDrag, ...restProps } = props as any

  const [copied, setCopied] = useState(false)

  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef

  const widgetBorderColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : "rgba(255,255,255,0.3)"

  const handleCopy = () => {
    navigator.clipboard.writeText(pattern)
    setCopied(true)
    toast.success("Code copied to clipboard!", {
      description: "Paste it into strudel.cc to jam."
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const initialPosRef = useRef<{x: number, y: number} | null>(null)

  return (
    <Draggable
      data-widget="strudel"
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      dragFromBackground
      className={cn(
        "pointer-events-auto",
        props.className
      )}
      style={{
        ...props.style,
        zIndex: undefined
      }}
      {...restProps}
    >
      <Resizable
        defaultSize={{
          width: 180,
          height: 200,
        }}
        size={props.style?.position === 'static' ? { width: '100%', height: 200 } : undefined}
        minWidth={150}
        minHeight={200}
        enable={props.style?.position === 'static' ? false : { top:false, right:true, bottom:true, left:true, topRight:false, bottomRight:true, bottomLeft:true, topLeft:false }}
        className="relative"
        onResizeStart={(event) => {
            event.stopPropagation()
            initialPosRef.current = position || { x: 0, y: 0 }
        }}
        onResize={(e, direction, ref, d) => {
            if (direction.includes('left') && initialPosRef.current) {
                onPositionChange?.({
                    x: initialPosRef.current.x - d.width,
                    y: initialPosRef.current.y
                })
            }
        }}
      >
      {/* Widget Background/Box - z-50 */}
      <div 
        className={cn(
            "absolute inset-0 z-50 rounded-md transition-all duration-300",
            isOn ? "border bg-black/80 backdrop-blur-md opacity-100" : "border bg-black/60 backdrop-blur-sm opacity-60",
            "border-white/30"
        )}
        style={{
            ...panelStyle,
            borderColor: widgetBorderColor,
            boxShadow: isOn ? `0 0 20px ${cityColor}40` : "none",
        }}
      />

      {/* Toggle Button (On/Off) - Top Left - z-70 */}
      <button
        aria-label={isOn ? 'Desligar Debug' : 'Ligar Debug'}
        aria-hidden={togglePortalized || undefined}
        tabIndex={togglePortalized ? -1 : 0}
        ref={toggleRef}
        className={cn(
          "absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center transition-all z-70 shadow-md group cursor-pointer hover:text-[#60a5fa]",
          togglePortalized && "invisible pointer-events-none",
          !isOn && "hover:drop-shadow-[0_0_8px_#60a5fa]",
          isOn ? "text-[var(--city-neon)]" : "text-white",
        )}
        style={{ 
          ...panelStyle,
          borderColor: widgetBorderColor,
          backgroundColor: isOn ? undefined : "color-mix(in srgb, var(--background) 50%, transparent)",
          top: -5, 
          left: -8,
          boxShadow: isOn ? `0 0 10px ${cityColor}40` : "none"
        }}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <Power className={cn("w-4 h-4", isOn ? "drop-shadow-[0_0_8px_currentColor]" : "")} />
      </button>

      {/* Copy Button - Top Right - z-80 (Higher than Handle) */}
      <button
        aria-label="Copy Strudel code"
        className={cn(
          "absolute top-1.5 right-2 p-1 rounded-md transition-all z-[80] group hover:bg-white/10",
          !isOn && "pointer-events-none opacity-0"
        )}
        onClick={(e) => {
          e.stopPropagation()
          handleCopy()
        }}
        title={copied ? "copied!" : "copy strudel code"}
      >
        <span className={cn(
          "pointer-events-none absolute right-full top-1/2 mr-0 -translate-y-1/2 whitespace-nowrap rounded bg-black/90 px-1.5 py-1 font-mono text-[9px] text-white transition-opacity",
          copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {copied ? "copied!" : "copy strudel code"}
        </span>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
        )}
      </button>

      {/* Invisible Drag Handle Header - z-60 */}
      <div 
        ref={effectiveHandleRef}
        className="absolute inset-x-0 top-0 h-8 z-60"
      />

      {/* Main Content - z-50 */}
      <div className={cn("relative z-50 px-2.5 py-2.5 w-full h-full min-h-0 flex flex-col overflow-hidden", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
          <div className="flex items-center justify-center mb-2 px-1 h-4 relative w-full shrink-0">
             <span className={cn(
               "text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-center",
               "text-white"
             )}>
                DEBUG
             </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={pieceDebugOn}
              onClick={event => { event.stopPropagation(); onTogglePieceDebug() }}
              className={cn("rounded border px-2 py-1 font-mono text-[10px] transition-colors", pieceDebugOn ? "border-sky-300/70 bg-sky-300/15 text-sky-200" : "border-white/25 text-white/70 hover:border-white/60 hover:text-white")}
            >Piece</button>
            {onToggleStockfishDebug && <button
              type="button"
              aria-pressed={stockfishDebugOn}
              onClick={event => { event.stopPropagation(); onToggleStockfishDebug() }}
              className={cn("rounded border px-2 py-1 font-mono text-[10px] transition-colors", stockfishDebugOn ? "border-emerald-400/70 bg-emerald-400/20 text-emerald-300" : "border-white/25 text-white/70 hover:border-white/60 hover:text-white")}
            >Stockfish</button>}
            {onToggleBotControl && <button
              type="button"
              aria-pressed={botControlOn}
              onClick={event => { event.stopPropagation(); onToggleBotControl() }}
              className={cn("rounded border px-2 py-1 font-mono text-[10px] transition-colors", botControlOn ? "border-amber-300/70 bg-amber-300/15 text-amber-200" : "border-white/25 text-white/70 hover:border-white/60 hover:text-white")}
            >Bot</button>}
            {onShowTopMoves && <button
              type="button"
              disabled={topMovesDisabled}
              title="Veja as 10 melhores jogadas · 2 golden eggs"
              onClick={event => { event.stopPropagation(); onShowTopMoves(event.currentTarget) }}
              className="rounded border border-green-300/35 px-2 py-1 font-mono text-[10px] text-green-100/80 transition-colors hover:border-green-200/70 hover:text-green-50 disabled:cursor-not-allowed disabled:opacity-40"
            >Moves</button>}
            {onToggleCodeVisible && <button
              type="button"
              role="switch"
              aria-checked={codeVisible}
              title={codeVisible ? "Esconder o código no fundo" : "Mostrar o código no fundo"}
              onClick={event => { event.stopPropagation(); onToggleCodeVisible() }}
              className={cn("flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] transition-colors", codeVisible ? "border-[#78ff93]/60 bg-[#78ff93]/10 text-[#b6ffc4]" : "border-white/25 text-white/70 hover:border-white/60 hover:text-white")}
            >
              <span aria-hidden="true" className={cn("relative h-2.5 w-[18px] shrink-0 rounded-full transition-colors", codeVisible ? "bg-[#78ff93]/70" : "bg-white/25")}>
                <span className={cn("absolute top-[1px] h-2 w-2 rounded-full bg-white transition-[left]", codeVisible ? "left-[9px]" : "left-[1px]")} />
              </span>
              Code
            </button>}
            {onForceWin && <button
              type="button"
              onClick={event => { event.stopPropagation(); onForceWin() }}
              className="rounded border border-white/25 px-2 py-1 font-mono text-[10px] text-white/70 transition-colors hover:border-white/60 hover:text-white"
            >Force win</button>}
            {onGetEggs && <button
              type="button"
              onClick={event => { event.stopPropagation(); onGetEggs() }}
              className="rounded border border-white/25 px-2 py-1 font-mono text-[10px] text-white/70 transition-colors hover:border-white/60 hover:text-white"
            >Eggs</button>}
          </div>
          {playback && <div className="debug-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-1 font-mono text-[10px] [&_*]:!font-mono [&_*]:!text-[10px]">{playback}</div>}

        </div>
      </div>
      <style jsx global>{`
        .debug-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.38) transparent; }
        .debug-scroll:hover { scrollbar-color: rgba(255,255,255,.72) transparent; }
        .debug-scroll::-webkit-scrollbar { width: 6px; }
        .debug-scroll::-webkit-scrollbar-track { background: transparent; }
        .debug-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.38); border-radius: 999px; }
        .debug-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,.72); }
      `}</style>
      {!isOn && <div className={cn("absolute inset-0 z-[65]", props.style?.position === 'static' ? "touch-pan-y" : "touch-none")} aria-hidden="true" />}
      </Resizable>
    </Draggable>
  )
})

LiveCodeWidget.displayName = "LiveCodeWidget"
