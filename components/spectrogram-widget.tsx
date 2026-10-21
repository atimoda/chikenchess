"use client"

import type React from "react"
import { useRef, forwardRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import { getSfxEngine } from "@/lib/sfx-engine"

import { Resizable } from "re-resizable"

interface SpectrogramWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  togglePortalized?: boolean
  isOn: boolean
  onToggle: () => void
  isPlaying: boolean
  getFrequencyData?: (data: Uint8Array<ArrayBuffer>) => void
  topColor?: 'w' | 'b'
  getTeamFrequencyData?: (color: 'w' | 'b', data: Uint8Array<ArrayBuffer>) => void
}

export interface SpectrogramCanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  cityColor: string
  isOn: boolean
  isPlaying: boolean
  origin?: 'bottom' | 'center'
  mirrored?: boolean
  getFrequencyData?: (data: Uint8Array<ArrayBuffer>) => void
}

export function SpectrogramCanvas({
  cityColor,
  isOn,
  isPlaying,
  origin = 'bottom',
  mirrored = false,
  getFrequencyData,
  className,
  ...props
}: SpectrogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastFrameRef = useRef(0)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128))

  useEffect(() => {
    if (!isOn) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    const animate = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(animate)
      // Canvas analysis is intentionally capped. Audio scheduling is unaffected.
      if (timestamp - lastFrameRef.current < 1000 / 24) return
      lastFrameRef.current = timestamp
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      if (!width || !height) return

      // Ensure canvas internal size matches display size
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      // Fade existing bars without painting an opaque black canvas over the widget.
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = "source-over"

      const isCenter = origin === 'center'
      const centerY = Math.floor(height / 2)

      if (isPlaying) {
        if (getFrequencyData) getFrequencyData(dataArrayRef.current)
        else getSfxEngine().getFrequencyData(dataArrayRef.current)

        const bars = 16
        const barWidth = width / bars

        for (let i = 0; i < bars; i++) {
          const binIdx = mirrored ? (bars - 1 - i) : i
          const firstBin = Math.floor(binIdx * (dataArrayRef.current.length / bars))
          const lastBin = Math.floor((binIdx + 1) * (dataArrayRef.current.length / bars))
          let value = 0
          for (let bin = firstBin; bin < lastBin; bin++) {
            value = Math.max(value, dataArrayRef.current[bin] || 0)
          }
          const percent = value / 255

          ctx.fillStyle = cityColor
          if (isCenter) {
            const barHeight = Math.max(1, percent * (height - 2))
            const y = Math.floor(centerY - barHeight / 2)
            ctx.fillRect(
              i * barWidth,
              y,
              Math.max(1, barWidth - 1),
              barHeight
            )
          } else {
            const barHeight = percent * height
            ctx.fillRect(
              i * barWidth,
              height - barHeight,
              Math.max(1, barWidth - 1),
              barHeight
            )
          }
        }
      } else {
        // Flat line
        ctx.fillStyle = cityColor
        if (isCenter) {
          ctx.fillRect(0, centerY, width, 1)
        } else {
          ctx.fillRect(0, height - 1, width, 1)
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isOn, isPlaying, cityColor, origin, mirrored, getFrequencyData])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("w-full h-full", className)}
      {...props}
    />
  )
}

export const SpectrogramWidget = forwardRef<HTMLDivElement, SpectrogramWidgetProps>(({
  cityColor,
  position,
  onPositionChange,
  handleRef,
  toggleRef,
  togglePortalized = false,
  isOn,
  onToggle,
  isPlaying,
  getFrequencyData,
  topColor = 'b',
  getTeamFrequencyData,
  ...props
}, ref) => {
  // Remove onDrag from props to avoid type conflict with Draggable's onDrag
  const { onDrag: _onDrag, ...restProps } = props as any

  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef

  const widgetBorderColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : "rgba(255,255,255,0.3)"

  const initialPosRef = useRef<{x: number, y: number} | null>(null)

  return (
    <Draggable
      data-widget="spectrum"
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      dragFromBackground
      className={cn(
        "pointer-events-auto", // Remove z-50 and visual styles from container
        props.className
      )}
      style={{
        ...props.style,
        zIndex: undefined // Ensure no z-index on container
      }}
      {...restProps}
    >
      <Resizable
        defaultSize={{
          width: 180,
          height: 100,
        }}
        size={props.style?.position === 'static' ? { width: '100%', height: 100 } : undefined}
        minWidth={156}
        minHeight={100}
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
        aria-label={isOn ? 'Desligar Spectrogram' : 'Ligar Spectrogram'}
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

      {/* Invisible Drag Handle Header - z-60 */}
      <div 
        ref={effectiveHandleRef}
        className="absolute inset-x-0 top-0 h-8 z-60"
      />

      {/* Main Content - z-50 */}
      <div className={cn("relative z-50 px-2.5 py-2.5 w-full h-full flex flex-col", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col flex-1 h-full">
          <div className="flex items-center justify-center px-1 h-4 relative shrink-0">
             <span className={cn(
               "text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300",
               "text-white"
             )}>
                SPECTROGRAM
             </span>
          </div>
          
          <div className="flex-1 w-full overflow-hidden relative min-h-0 flex gap-0.5">
            <div className="relative h-full w-1/2 overflow-hidden">
              <SpectrogramCanvas
                cityColor={cityColor}
                isOn={isOn}
                isPlaying={isPlaying}
                origin="center"
                getFrequencyData={getTeamFrequencyData ? (data) => getTeamFrequencyData(topColor, data) : getFrequencyData}
              />
            </div>
            <div className="relative h-full w-1/2 overflow-hidden">
              <SpectrogramCanvas
                cityColor={cityColor}
                isOn={isOn}
                isPlaying={isPlaying}
                origin="center"
                mirrored
                getFrequencyData={getTeamFrequencyData ? (data) => getTeamFrequencyData(topColor === 'w' ? 'b' : 'w', data) : getFrequencyData}
              />
            </div>
          </div>

        </div>
      </div>
      {!isOn && <div className={cn("absolute inset-0 z-[65]", props.style?.position === 'static' ? "touch-pan-y" : "touch-none")} aria-hidden="true" />}
      </Resizable>
    </Draggable>
  )
})

SpectrogramWidget.displayName = "SpectrogramWidget"
