"use client"

import { useEffect, useRef } from "react"
import { type CityData } from "@/lib/cities-data"
import { cn } from "@/lib/utils"
import { Draggable } from "@/components/ui/draggable"

export interface CityPopupProps {
  city: CityData
  popup: {
    x: number
    y: number
    zIndex: number
    isClosing?: boolean
    isFalling?: boolean
    enterX: number
    enterRot: number
    timestamp: number
  }
  isUnlocked: boolean
  isPressed: boolean
  rotation: number
  bringToFront: (id: string) => void
  closePopup: (id: string) => void
  updatePopupPosition: (id: string, x: number, y: number) => void
  playMapSound: (type: string, forceResume?: boolean) => void
  startWhistleLoop: () => void
  stopWhistleLoop: () => void
  setPressedPopupState: (state: { id: string, rotation: number } | null) => void
  onCitySelect: (city: CityData) => void
  handleSmartPadSound: (e: React.MouseEvent<HTMLButtonElement>) => void
  handleSmartPadLeave: (e: React.MouseEvent<HTMLButtonElement>) => void
  stopPadSound: () => void
  isEntering: boolean
  onEnter: () => void
  scale: number
  onDragMove: () => void
  onDragStart?: (e?: React.MouseEvent | React.TouchEvent) => void
  onDragEnd?: () => void
  transformOrigin?: string
}

export const CityPopup = ({
  city,
  popup,
  isUnlocked,
  isPressed,
  rotation,
  bringToFront,
  closePopup,
  updatePopupPosition,
  playMapSound,
  startWhistleLoop,
  stopWhistleLoop,
  setPressedPopupState,
  onCitySelect,
  handleSmartPadSound,
  handleSmartPadLeave,
  stopPadSound,
  isEntering,
  onEnter,
  scale,
  onDragMove,
  onDragStart,
  onDragEnd,
  transformOrigin
}: CityPopupProps) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const enterButtonRef = useRef<HTMLButtonElement>(null)
  const exitStyleRef = useRef<React.CSSProperties | null>(null)

  useEffect(() => {
    // console.log('CityPopup mounted', { 
    //     cityId: city.id, 
    //     dragHandleRef: dragHandleRef.current,
    //     popupX: popup.x,
    //     popupY: popup.y
    // })
  }, [city.id])

  return (
    <Draggable
      position={{ x: popup.x, y: popup.y }}
      scale={scale}
      onDrag={(pos) => {
        updatePopupPosition(city.id, pos.x, pos.y)
        onDragMove()
      }}
      onDragStart={(e) => {
        bringToFront(city.id)
        startWhistleLoop()
        const rot = (Math.random() * 6) - 3
        setPressedPopupState({ id: city.id, rotation: rot })
        if (onDragStart) onDragStart(e)
      }}
      onDragEnd={() => {
        stopWhistleLoop()
        setPressedPopupState(null)
        stopPadSound()
        if (onDragEnd) onDragEnd()
      }}
      handleRef={dragHandleRef}
      className={cn(
        "absolute w-72 pointer-events-auto flex flex-col select-none",
        popup.isClosing ? "animate-popup-exit" : "animate-popup"
      )}
      style={{
        zIndex: popup.zIndex,
        // @ts-ignore - CSS custom property for popup enter offset
        '--enter-x': `${popup.enterX || 0}px`,
        // @ts-ignore - CSS custom property for popup enter rotation
        '--enter-rot': `${popup.enterRot || 0}deg`
      }}
      onMouseDown={() => {
        bringToFront(city.id)
      }}
    >
      <div
        ref={containerRef}
        data-drag-handle="true" // Make the entire popup draggable
        className="relative p-5 rounded-lg border bg-card/80 backdrop-blur-md shadow-2xl transition-all cursor-grab active:cursor-grabbing"
        onClick={(e) => {
            e.stopPropagation()
        }}
        onMouseDownCapture={(e) => {
            // console.log('CityPopup inner div onMouseDownCapture', e.target)
        }}
        style={{
          boxShadow: isUnlocked ? `0 0 40px ${city.color}20` : 'none',
          borderColor: isUnlocked ? city.color : '#444',
          backgroundColor: !isUnlocked ? `color-mix(in srgb, color-mix(in srgb, ${city.color}, black 95%) 80%, transparent)` : undefined,
          ...((isEntering && exitStyleRef.current) ? {
              // Reset container transform to prevent scaling, just let the button handle it
              transform: 'none',
              transition: 'none',
              zIndex: 1000
          } : {
              transform: popup.isClosing 
                ? undefined 
                : (isPressed ? `scale(0.9) rotate(${rotation}deg)` : 'scale(1) rotate(0deg)'),
              transformOrigin: transformOrigin || (popup.isClosing 
                ? '0px 3px'
                : (isPressed ? '0px 40px' : 'center center')),
              transition: popup.isClosing 
            ? undefined 
            : (isPressed ? 'transform 0.2s ease-out' : 'all 0.3s ease-in-out')
          })
        }}
        onMouseDown={() => {
            bringToFront(city.id)
        }}
      >
        {/* Close Button */}
        <button 
          className="absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center text-muted-foreground transition-all z-50 shadow-md group hover:cursor-pointer hover:text-black"
          style={{ borderColor: city.color, top: -8, left: -10 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = city.color;
            playMapSound("kr55_hh");
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
          }}
          onClick={(e) => { 
            e.stopPropagation(); 
            playMapSound("alesissr16_oh");
            closePopup(city.id); 
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={cn("transition-transform duration-500 ease-out", popup.isClosing && "rotate-180")}
          >
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* Decorative Header Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" style={{ backgroundColor: city.color }} />
        
        {/* City Image */}
        <div 
          data-drag-handle="true"
          className="w-full h-32 mb-4 rounded-md overflow-hidden relative animate-content-1 group cursor-grab active:cursor-grabbing"
        >
          <img 
            src={city.image} 
            alt={`City of ${city.name}`} 
            className={cn(
              "w-full h-full object-cover pointer-events-none",
              !isUnlocked && "grayscale"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          
        </div>

        <div className="flex items-center justify-between mb-3 animate-content-2">
          <h3 className="font-mono font-bold text-xl tracking-wide" style={{ color: isUnlocked ? city.color : '#aaa' }}>
            {city.name}
          </h3>
          <span className="text-xs text-muted-foreground font-mono border border-border px-1.5 py-0.5 rounded">{city.year}</span>
        </div>
        
        <div className="mb-4 animate-content-3">
          <p className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">{city.genre}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{city.description}</p>
        </div>

        {isUnlocked ? (
          <div className="space-y-3 animate-content-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                TARGET BPM: <span style={{ color: city.color }}>{city.bpm}</span>
              </span>
              <button 
                ref={enterButtonRef}
                className={cn(
                   "px-3 py-1.5 rounded border transition-all cursor-pointer relative z-[100] overflow-hidden group",
                   isEntering && "pointer-events-none duration-[1500ms] ease-in-out"
                )}
                style={{ 
                    borderColor: city.color, 
                    color: city.color,
                    ...(isEntering && exitStyleRef.current ? exitStyleRef.current : {})
                }}
                onMouseEnter={(e) => {
                    if (isEntering) return
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.boxShadow = `0 0 15px ${city.color}`;
                    handleSmartPadSound(e)
                    playMapSound("bd", true) // Add pin hover sound (bd)
                }}
                onMouseMove={(e) => {
                    if (isEntering) return
                    handleSmartPadSound(e)
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    const centerX = rect.width / 2
                    const centerY = rect.height / 2
                    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI)
                    // Offset the rotation so it aligns with mouse direction if needed
                    e.currentTarget.style.setProperty('--mouse-angle', `${angle}deg`)
                    e.currentTarget.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`)
                    e.currentTarget.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`)
                }}
                onMouseLeave={(e) => {
                    if (isEntering) return
                    handleSmartPadLeave(e)
                    // Re-apply city color (handleSmartPadLeave clears it)
                    e.currentTarget.style.color = city.color;
                }}
                onClick={() => {
                  stopPadSound();
                  if (isEntering) return;
                  playMapSound("suction", true);
                  
                  // Calculate Exit Transform
                  if (containerRef.current && enterButtonRef.current) {
                      const buttonRect = enterButtonRef.current.getBoundingClientRect()
                      
                      const buttonCenter = {
                          x: buttonRect.left + buttonRect.width / 2,
                          y: buttonRect.top + buttonRect.height / 2
                      }
                      
                      const viewportCenter = {
                          x: window.innerWidth / 2,
                          y: window.innerHeight / 2
                      }
                      
                      const tx = viewportCenter.x - buttonCenter.x
                      const ty = viewportCenter.y - buttonCenter.y
                      
                      exitStyleRef.current = {
                          transform: `translate(${tx}px, ${ty}px) scale(30)`,
                          zIndex: 9999,
                          opacity: 0, // Restore fade out
                      }
                  }

                  onEnter();
                  setTimeout(() => {
                     onCitySelect(city);
                  }, 1500);
                }}
              >
                <div 
                    className={cn(
                        "absolute inset-0 transition-opacity duration-300 pointer-events-none mix-blend-screen overflow-hidden rounded-sm",
                        isEntering ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    style={{ animation: "hue-rotate 3s linear infinite" }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${city.color}, transparent 60%)`,
                            filter: "hue-rotate(calc(var(--mouse-angle, 0deg)))",
                        }}
                    />
                </div>
                {/* Scale ONLY the button text/content or the button itself */}
                <span className={cn(
                    "relative z-10 block transition-opacity duration-[1000ms] ease-in-out",
                    isEntering ? "opacity-0" : "opacity-100"
                )}>
                    ENTER BOARD
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs font-mono p-3 bg-neutral-900/50 rounded border border-dashed border-neutral-700 text-neutral-400 animate-content-4 cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <span>LOCATION LOCKED</span>
          </div>
        )}
      </div>
    </Draggable>
  )
}
