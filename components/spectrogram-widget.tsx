"use client"

import type React from "react"
import { useRef, forwardRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Power } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import { getAudioEngine } from "@/lib/audio-engine"

import { Resizable } from "re-resizable"

interface SpectrogramWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  cityColor: string
  position?: { x: number; y: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  handleRef?: React.RefObject<HTMLDivElement | null>
  toggleRef?: React.RefObject<HTMLButtonElement | null>
  isOn: boolean
  onToggle: () => void
  isPlaying: boolean
}

export const SpectrogramWidget = forwardRef<HTMLDivElement, SpectrogramWidgetProps>(({
  cityColor,
  position,
  onPositionChange,
  handleRef,
  toggleRef,
  isOn,
  onToggle,
  isPlaying,
  ...props
}, ref) => {
  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(128))

  const widgetBorderColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : "rgba(255,255,255,0.3)"

  const toggleIconColor = !isOn 
    ? "var(--city-neon)" 
    : "#60a5fa" // Blue if active? No, let's keep it consistent or white. 
                // User said: "deixe a cor do ícone do botão "on/off" na cor neon da fase" WHEN OFF.
                // So when !isOn -> cityColor. When isOn -> white/blue? 
                // Original was white when off, blue when on.
                // Let's use white when on, city-neon when off as requested.

  // Animation Loop
  useEffect(() => {
    if (!isOn) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        return
    }

    const animate = () => {
        const canvas = canvasRef.current
        if (!canvas) return
    
        const ctx = canvas.getContext("2d")
        if (!ctx) return
    
        const width = canvas.offsetWidth
        const height = canvas.offsetHeight
        
        // Ensure canvas internal size matches display size
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width
            canvas.height = height
        }
    
        // Clear
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)" // Fade effect
        ctx.fillRect(0, 0, width, height)
    
        if (isPlaying) {
            const audioEngine = getAudioEngine()
            audioEngine.getFrequencyData(dataArrayRef.current)
        
            const bars = 32
            const barWidth = width / bars
        
            for (let i = 0; i < bars; i++) {
                const dataIndex = Math.floor(i * (dataArrayRef.current.length / bars))
                const value = dataArrayRef.current[dataIndex] || 0
                const percent = value / 255
                const barHeight = percent * height
        
                ctx.fillStyle = cityColor
                ctx.fillRect(
                    i * barWidth,
                    height - barHeight,
                    barWidth - 1,
                    barHeight
                )
            }
        } else {
             // Flat line
             ctx.fillStyle = cityColor
             ctx.fillRect(0, height - 1, width, 1)
        }
    
        animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isOn, isPlaying, cityColor])

  const initialPosRef = useRef<{x: number, y: number} | null>(null)

  return (
    <Draggable
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      className={cn(
        "pointer-events-auto", // Remove z-50 and visual styles from container
        props.className
      )}
      style={{
        ...props.style,
        zIndex: undefined // Ensure no z-index on container
      }}
      {...props}
    >
      <Resizable
        defaultSize={{
          width: 340,
          height: 140, // Approx height based on content
        }}
        minWidth={200}
        minHeight={100}
        enable={{ top:false, right:true, bottom:true, left:true, topRight:false, bottomRight:true, bottomLeft:true, topLeft:false }}
        className="relative"
        onResizeStart={() => {
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
            "absolute inset-0 z-50 rounded-md",
            isOn ? "border-2 bg-black/80 backdrop-blur-md" : "border bg-black/60 backdrop-blur-sm",
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
        ref={toggleRef}
        className={cn(
          "absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center transition-all z-70 shadow-md group hover:cursor-pointer",
        )}
        style={{ 
          borderColor: widgetBorderColor, 
          color: toggleIconColor,
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
        className="absolute inset-x-0 top-0 h-8 cursor-grab active:cursor-grabbing z-60"
      />

      {/* Main Content - z-50 */}
      <div className={cn("relative z-50 px-2.5 py-2.5 w-full h-full flex flex-col", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3 flex-1 h-full">
          <div className="flex items-center justify-center mb-2 px-1 h-4 relative shrink-0">
             <span className={cn(
               "text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300",
               isOn ? "text-[var(--city-neon)]" : "text-muted-foreground"
             )}>
                SPECTROGRAM
             </span>
          </div>
          
          <div className="flex-1 w-full overflow-hidden relative min-h-0">
            <canvas 
                ref={canvasRef}
                className="w-full h-full"
            />
          </div>

        </div>
      </div>
      </Resizable>
    </Draggable>
  )
})

SpectrogramWidget.displayName = "SpectrogramWidget"
