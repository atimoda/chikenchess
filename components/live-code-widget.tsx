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
  isOn: boolean
  onToggle: () => void
  isPlaying: boolean
  playback?: React.ReactNode
}

export const LiveCodeWidget = forwardRef<HTMLDivElement, LiveCodeWidgetProps>(({
  pattern,
  city: _city,
  cityColor,
  position,
  onPositionChange,
  handleRef,
  toggleRef,
  isOn,
  onToggle,
  isPlaying: _isPlaying,
  playback,
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
          width: 340,
          height: 280,
        }}
        minWidth={300}
        minHeight={200}
        enable={{ top:false, right:true, bottom:true, left:true, topRight:false, bottomRight:true, bottomLeft:true, topLeft:false }}
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
        ref={toggleRef}
        className={cn(
          "absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center transition-all z-70 shadow-md group cursor-pointer hover:text-[#60a5fa]",
          isOn ? "text-[var(--city-neon)]" : "text-white",
        )}
        style={{ 
          ...panelStyle,
          borderColor: widgetBorderColor,
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
      <div className={cn("relative z-50 px-2.5 py-2.5 w-full h-full flex flex-col", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3 flex-1 h-full">
          <div className="flex items-center justify-center mb-2 px-1 h-4 relative w-full shrink-0">
             <span className={cn(
               "text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-center",
               "text-white"
             )}>
                DEBUG
             </span>
          </div>
          {playback && <div className="shrink-0 space-y-1 font-mono text-[10px] [&_*]:!font-mono [&_*]:!text-[10px]">{playback}</div>}

        </div>
      </div>
      {!isOn && <div className="absolute inset-0 z-[65] touch-none" aria-hidden="true" />}
      </Resizable>
    </Draggable>
  )
})

LiveCodeWidget.displayName = "LiveCodeWidget"
