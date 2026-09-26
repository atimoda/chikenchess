"use client"

import { useRef } from "react"
import { getCityEras, type CityData } from "@/lib/cities-data"
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
  isConquered?: boolean
  isUnlocked?: boolean
  isPressed: boolean
  bringToFront: (id: string) => void
  closePopup: (id: string) => void
  updatePopupPosition: (id: string, x: number, y: number) => void
  playMapSound: (type: string, forceResume?: boolean) => void
  startWhistleLoop: () => void
  stopWhistleLoop: () => void
  setPressedPopupState: (state: { id: string } | null) => void
  handleSmartPadSound: (e: React.MouseEvent<HTMLButtonElement>) => void
  handleSmartPadLeave: (e: React.MouseEvent<HTMLButtonElement>) => void
  stopPadSound: () => void
  isEntering: boolean
  onEnter: () => void
  scale: number
  onDragMove?: () => void
  onDragStart?: (e?: React.MouseEvent | React.TouchEvent) => void
  onDragEnd?: () => void
  transformOrigin?: string
  onEraSelect?: (city: CityData) => void
}

export const CityPopup = ({
  city,
  popup,
  isConquered = false,
  isUnlocked: _isUnlocked,
  isPressed,
  bringToFront,
  closePopup,
  updatePopupPosition,
  playMapSound,
  startWhistleLoop,
  stopWhistleLoop,
  setPressedPopupState,
  handleSmartPadSound,
  handleSmartPadLeave,
  stopPadSound,
  isEntering,
  onEnter,
  scale,
  onDragMove,
  onDragStart,
  onDragEnd,
  transformOrigin,
  onEraSelect,
}: CityPopupProps) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const enterButtonRef = useRef<HTMLButtonElement>(null)
  const exitStyleRef = useRef<React.CSSProperties | null>(null)
  const lastDragAccent = useRef(0)

  return (
    <Draggable
      position={{ x: popup.x, y: popup.y }}
      scale={scale}
      onDrag={(pos) => {
        updatePopupPosition(city.id, pos.x, pos.y)
        if (Date.now() - lastDragAccent.current > 110) {
          lastDragAccent.current = Date.now()
          playMapSound('popup_drag')
        }
        onDragMove?.()
      }}
      onDragStart={(e) => {
        bringToFront(city.id)
        startWhistleLoop()
        playMapSound('popup_down', true)
        setPressedPopupState({ id: city.id })
        if (onDragStart) onDragStart(e)
      }}
      onDragEnd={() => {
        stopWhistleLoop()
        playMapSound('popup_up', true)
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
        willChange: 'left, top',
        contain: 'layout',
        touchAction: 'none',
        '--enter-x': `${popup.enterX || 0}px`,
        '--enter-rot': `${popup.enterRot || 0}deg`
      } as React.CSSProperties}
      onMouseDown={() => {
        bringToFront(city.id)
      }}
    >
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
        onMouseDown={(e) => {
          e.stopPropagation();
          playMapSound("alesissr16_oh");
          closePopup(city.id);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          playMapSound("alesissr16_oh");
          closePopup(city.id);
        }}
        onClick={(e) => e.stopPropagation()}
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

      <div
        ref={containerRef}
        data-drag-handle="true" // Make the entire popup draggable
        data-popup-surface="true"
        className="relative overflow-hidden p-5 rounded-lg border bg-card/[0.82] shadow-2xl transition-transform cursor-grab active:cursor-grabbing"
        onClick={(e) => {
            e.stopPropagation()
        }}
        style={{
          boxShadow: isConquered
            ? `0 0 35px ${city.color}40, 0 0 15px rgba(234, 179, 8, 0.35)`
            : `0 0 30px ${city.color}25`,
          borderColor: isConquered ? '#eab308' : city.color,
          ...((isEntering && exitStyleRef.current) ? {
              // Reset container transform to prevent scaling, just let the button handle it
              transform: 'none',
              transition: 'none',
              zIndex: 1000
          } : {
              transform: popup.isClosing
                ? undefined
                : (isPressed ? 'scale(0.92)' : 'scale(1)'),
              transformOrigin: transformOrigin || (popup.isClosing
                ? '0px 3px'
                : (isPressed ? '0px 40px' : 'center center')),
              transition: popup.isClosing
                ? undefined
                : 'transform 0.2s ease-out'
          })
        }}
        onMouseDown={() => {
            bringToFront(city.id)
        }}
      >
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
            className="w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        </div>

        <div className="flex items-center justify-between mb-3 animate-content-2">
          <h3 className="font-mono font-bold text-xl tracking-wide" style={{ color: city.color }}>
            {city.name}
          </h3>
          <span className="text-xs text-muted-foreground font-mono border border-border px-1.5 py-0.5 rounded">{city.year}</span>
        </div>

        <div className="mb-4 animate-content-3">
          <p className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">{city.genre}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{city.description}</p>
        </div>

        {getCityEras(city).length > 1 && <nav aria-label={`Épocas de ${city.name}`} className="flex flex-wrap justify-end gap-2 mb-3" data-no-drag>
          {getCityEras(city).map(era => <button key={era.id} type="button" disabled={isEntering} aria-pressed={era.id === city.id}
            onClick={() => onEraSelect?.(era)} className={cn('border rounded px-2 py-1 text-xs font-mono cursor-pointer', era.id === city.id ? 'text-white border-white/60' : 'text-white/50 border-white/20')}>
            {era.year} {era.genre.split('·')[0].trim()}
          </button>)}
        </nav>}

        <div className="space-y-3 animate-content-4">
          <div className="flex items-center justify-between text-xs font-mono">
            {isConquered ? (
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                👑 CONQUERED
              </span>
            ) : <span />}
              <button
                ref={enterButtonRef}
                className={cn(
                   "px-3 py-1.5 rounded border transition-all cursor-pointer relative z-[100] overflow-hidden group",
                   isEntering && "pointer-events-none duration-[2000ms] ease-in"
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
      </div>
    </Draggable>
  )
}
