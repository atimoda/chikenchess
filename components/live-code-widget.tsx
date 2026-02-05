"use client"

import type React from "react"
import { useRef, forwardRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Power, Copy, Check, Terminal } from "lucide-react"
import { Draggable } from "@/components/ui/draggable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
}

export const LiveCodeWidget = forwardRef<HTMLDivElement, LiveCodeWidgetProps>(({
  pattern,
  city,
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
  const [copied, setCopied] = useState(false)

  const panelStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  const localHandleRef = useRef<HTMLDivElement>(null)
  const effectiveHandleRef = handleRef || localHandleRef

  const widgetBorderColor = !isOn 
    ? "rgba(255,255,255,0.1)" 
    : "rgba(255,255,255,0.3)"

  const toggleIconColor = !isOn 
    ? "var(--city-neon)" 
    : "#60a5fa"

  const codeRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when pattern updates
  useEffect(() => {
    if (codeRef.current) {
        codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [pattern])

  // Syntax highlighting for Strudel patterns
  const highlightCode = (code: string) => {
    // Remove the first 3 lines if they are comments (start with //)
    const lines = code.split('\n');
    let startIndex = 0;
    let commentCount = 0;
    
    // First, handle the comment removal logic requested previously
    const filteredLines = lines.filter((line, index) => {
        if (index < 3 && line.trim().startsWith('//')) {
            return false;
        }
        return true;
    });

    // New request: Remove the first line if it is empty/blank
    if (filteredLines.length > 0 && filteredLines[0].trim() === '') {
        filteredLines.shift();
    }

    const filteredCode = filteredLines.join('\n');

    return filteredCode
      .replace(/(".*?")/g, '<span class="text-accent">$1</span>')
      .replace(/(\b\d+\.?\d*\b)/g, '<span class="text-chart-4">$1</span>')
      .replace(/(\.\w+)/g, '<span class="text-chart-2">$1</span>')
  }

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
      ref={ref}
      position={position}
      onDrag={onPositionChange}
      handleRef={effectiveHandleRef}
      className={cn(
        "pointer-events-auto",
        props.className
      )}
      style={{
        ...props.style,
        zIndex: undefined
      }}
      {...props}
    >
      <Resizable
        defaultSize={{
          width: 340,
          height: 'auto',
        }}
        minWidth={300}
        minHeight={200}
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
            "absolute inset-0 z-50 rounded-md transition-all duration-300",
            isOn ? "border-2 bg-black/80 backdrop-blur-md opacity-100" : "border bg-black/60 backdrop-blur-sm opacity-60",
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

      {/* Copy Button - Top Right - z-80 (Higher than Handle) */}
      <button
        className={cn(
          "absolute top-1.5 right-2 p-1 rounded-md transition-all z-[80] group hover:bg-white/10",
          !isOn && "pointer-events-none opacity-0"
        )}
        onClick={(e) => {
          e.stopPropagation()
          handleCopy()
        }}
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
        )}
      </button>

      {/* Invisible Drag Handle Header - z-60 */}
      <div 
        ref={effectiveHandleRef}
        className="absolute inset-x-0 top-0 h-8 cursor-grab active:cursor-grabbing z-60"
      />

      {/* Main Content - z-50 */}
      <div className={cn("relative z-50 px-2.5 py-2.5 w-full h-full flex flex-col", !isOn && "opacity-50 grayscale")}>
        <div className="flex flex-col gap-3 flex-1 h-full">
          <div className="flex items-center justify-center mb-2 px-1 h-4 relative w-full shrink-0">
             <span className={cn(
               "text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-300 text-center",
               isOn ? "text-[var(--city-neon)]" : "text-muted-foreground"
             )}>
                STRUDEL CODE
             </span>
          </div>
          
          <div className="flex-1 w-full flex flex-col gap-2 min-h-0">
            
            <div 
                ref={codeRef}
                className="flex-1 p-2 font-mono text-xs leading-relaxed overflow-y-auto bg-black/40 rounded inner-shadow scrollbar-hide h-full"
            >
                {/* Scrollbar styling for Webkit/Blink */}
                <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .inner-shadow {
                    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.3);
                }
                }
                `}</style>
                <pre
                    className="whitespace-pre-wrap break-all text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: highlightCode(pattern) }}
                />
            </div>
          </div>

        </div>
      </div>
      </Resizable>
    </Draggable>
  )
})

LiveCodeWidget.displayName = "LiveCodeWidget"
