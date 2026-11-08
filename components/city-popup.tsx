"use client"

import { requestGameFrame, cancelGameFrame } from "@/lib/game-frame"
import { useEffect, useRef, useState } from "react"
import { getCityEras, type CityData } from "@/lib/cities-data"
import { cn } from "@/lib/utils"
import { Draggable } from "@/components/ui/draggable"

export interface PopupExitMotion {
  fromRotation: number
  translateX: number
  translateY: number
  rotation: number
  originX: number
  originY: number
}

export interface CityPopupProps {
  city: CityData
  popup: {
    x: number
    y: number
    zIndex: number
    isClosing?: boolean
    isFalling?: boolean
    exitMotion?: PopupExitMotion
    enterX: number
    enterRot: number
    timestamp: number
  }
  isConquered?: boolean
  isUnlocked?: boolean
  isPressed: boolean
  bringToFront: (id: string) => void
  closePopup: (id: string, type?: 'open' | 'closed' | 'held', motion?: PopupExitMotion) => void
  updatePopupPosition: (id: string, x: number, y: number, preserveAnchor?: boolean) => void
  playMapSound: (type: string, forceResume?: boolean) => void
  startWhistleLoop: () => void
  stopWhistleLoop: () => void
  setPressedPopupState: (state: { id: string } | null) => void
  handleSmartPadSound: (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>, pitchMultiplier?: number) => void
  handleSmartPadLeave: (e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) => void
  stopPadSound: () => void
  isEntering: boolean
  onEnter: () => void
  scale: number
  onDragMove?: () => void
  onDragStart?: (e?: React.MouseEvent | React.TouchEvent) => void
  onDragEnd?: () => void
  onCloseButtonDragStart?: (clientX: number, clientY: number) => void
  onCloseButtonDragMove?: (clientX: number, clientY: number, popupX: number, popupY: number) => void
  onCloseButtonDragEnd?: () => void
  transformOrigin?: string
  onEraSelect?: (city: CityData) => void
  onCreateRoom?: (city: CityData) => void
  isCreatingRoom?: boolean
  /** Online play exists but the server is unreachable: show the button, disabled. */
  onlineDisabled?: boolean
  /** Another city is being entered: this card lets go and drifts off screen. */
  driftAway?: boolean
}

// Pendulum feel of a card held by its close button (px/s² and 1/s).
const SWING_GRAVITY = 2600
const SWING_DAMPING = 2.4

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
  onCloseButtonDragStart,
  onCloseButtonDragMove,
  onCloseButtonDragEnd,
  transformOrigin,
  onEraSelect,
  onCreateRoom,
  isCreatingRoom = false,
  onlineDisabled = false,
  driftAway = false,
}: CityPopupProps) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null)
  const popupWrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const enterButtonRef = useRef<HTMLButtonElement>(null)
  const lastDragAccent = useRef(0)
  const closeGestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startPopupX: number
    startPopupY: number
    moved: boolean
    cleanup: () => void
  } | null>(null)
  const [closeHeld, setCloseHeld] = useState(false)
  const [closeRotation, setCloseRotation] = useState(0)
  const [closeRestRotation, setCloseRestRotation] = useState(0)
  const [closePivot, setClosePivot] = useState({ x: 6, y: 8 })
  const [closeDragResting, setCloseDragResting] = useState(false)
  const [closeGestureCancelled, setCloseGestureCancelled] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)
  // Card size chosen with the bottom-right grip; null keeps the default layout.
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null)
  const [drift, setDrift] = useState<{ x: number; y: number; fromRotation: number; rotation: number } | null>(null)
  useEffect(() => {
    if (!driftAway || popup.isClosing) { setDrift(null); return }
    const wrapper = popupWrapperRef.current
    if (!wrapper) return
    // Away from the screen center, a little off-axis, far enough to leave the viewport.
    const rect = wrapper.getBoundingClientRect()
    const fromX = rect.left + rect.width / 2 - window.innerWidth / 2
    const fromY = rect.top + rect.height / 2 - window.innerHeight / 2
    const base = Math.hypot(fromX, fromY) > 1 ? Math.atan2(fromY, fromX) : Math.random() * Math.PI * 2
    const angle = base + (Math.random() - .5) * .7
    const distance = Math.hypot(window.innerWidth, window.innerHeight) + Math.max(rect.width, rect.height)
    const fromRotation = readPopupRotation()
    setDrift({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      fromRotation,
      rotation: fromRotation + (Math.random() < .5 ? -1 : 1) * (60 + Math.random() * 200),
    })
  // readPopupRotation reads the DOM at the moment the drift starts.
  }, [driftAway, popup.isClosing])

  const startCardResize = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    const surface = containerRef.current
    if (!surface) return
    const start = { x: e.clientX, y: e.clientY, width: surface.offsetWidth, height: surface.offsetHeight }
    const grip = e.currentTarget
    grip.setPointerCapture(e.pointerId)
    const move = (event: PointerEvent) => {
      const zoom = scale || 1
      setCardSize({
        width: Math.max(240, Math.min(window.innerWidth - 24, start.width + (event.clientX - start.x) / zoom)),
        height: Math.max(220, Math.min(window.innerHeight - 24, start.height + (event.clientY - start.y) / zoom)),
      })
    }
    const end = () => {
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', end)
      grip.removeEventListener('pointercancel', end)
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', end)
    grip.addEventListener('pointercancel', end)
  }
  // Pendulum held by the close button: the card hangs from the pressed point,
  // gravity pulls its center down and the hand's acceleration swings it.
  const swingRef = useRef<{ angle: number; velocity: number; pointer: { x: number; y: number }; last: { x: number; y: number }; handVelocity: { x: number; y: number }; handAcceleration: { x: number; y: number }; frame: number | null; time: number } | null>(null)

  const stopSwing = (clearTransform: boolean) => {
    const swing = swingRef.current
    if (swing?.frame != null) cancelGameFrame(swing.frame)
    swingRef.current = null
    if (clearTransform && popupWrapperRef.current) popupWrapperRef.current.style.transform = ''
  }

  const startSwing = (startAngle: number, pointer: { x: number; y: number }, pivot: { x: number; y: number }) => {
    stopSwing(false)
    const width = popupWrapperRef.current?.offsetWidth ?? 288
    const height = containerRef.current?.offsetHeight ?? 400
    // Center of mass relative to the pivot, in the card's own (unrotated) frame.
    const center = { x: width / 2 - pivot.x, y: height / 2 - pivot.y }
    // Moment of inertia per unit mass of a flat card about the pivot.
    const inertia = (width * width + height * height) / 12 + center.x * center.x + center.y * center.y
    const swing = { angle: startAngle, velocity: 0, pointer: { ...pointer }, last: { ...pointer }, handVelocity: { x: 0, y: 0 }, handAcceleration: { x: 0, y: 0 }, frame: null as number | null, time: performance.now() }
    swingRef.current = swing
    const step = (now: number) => {
      if (swingRef.current !== swing) return
      const dt = Math.min(.034, Math.max(.001, (now - swing.time) / 1000))
      swing.time = now
      // Smoothed hand velocity and acceleration from the pointer path.
      const velocity = { x: (swing.pointer.x - swing.last.x) / dt, y: (swing.pointer.y - swing.last.y) / dt }
      swing.last = { ...swing.pointer }
      const blend = 1 - Math.exp(-dt * 30)
      const nextVelocity = { x: swing.handVelocity.x + (velocity.x - swing.handVelocity.x) * blend, y: swing.handVelocity.y + (velocity.y - swing.handVelocity.y) * blend }
      const limit = 26000
      swing.handAcceleration = {
        x: Math.max(-limit, Math.min(limit, (nextVelocity.x - swing.handVelocity.x) / dt)),
        y: Math.max(-limit, Math.min(limit, (nextVelocity.y - swing.handVelocity.y) / dt)),
      }
      swing.handVelocity = nextVelocity
      // In the hand's frame the card feels gravity minus the hand's acceleration.
      const radians = swing.angle * Math.PI / 180
      const cos = Math.cos(radians), sin = Math.sin(radians)
      const arm = { x: center.x * cos - center.y * sin, y: center.x * sin + center.y * cos }
      const force = { x: -swing.handAcceleration.x, y: SWING_GRAVITY - swing.handAcceleration.y }
      const torque = arm.x * force.y - arm.y * force.x
      const acceleration = torque / inertia - SWING_DAMPING * swing.velocity
      swing.velocity += acceleration * dt
      swing.angle += swing.velocity * dt * 180 / Math.PI
      if (popupWrapperRef.current) popupWrapperRef.current.style.transform = `rotate(${swing.angle}deg)`
      swing.frame = requestGameFrame(step)
    }
    swing.frame = requestGameFrame(step)
  }

  useEffect(() => () => {
    closeGestureRef.current?.cleanup()
    stopSwing(false)
  }, [])

  const closeButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'touch' && e.button !== 0) return
    if (popup.isClosing || closeGestureRef.current) return
    e.preventDefault()
    e.stopPropagation()
    bringToFront(city.id)
    playMapSound('popup_close_hold_start', true)
    const popupWidth = containerRef.current?.offsetWidth ?? 288
    const popupHeight = containerRef.current?.offsetHeight ?? 400
    const restRotation = Math.atan2(Math.max(1, popupWidth), Math.max(1, popupHeight)) * 180 / Math.PI
    const buttonRect = e.currentTarget.getBoundingClientRect()
    const pivot = {
      x: e.currentTarget.offsetLeft + (e.clientX - buttonRect.left) * (e.currentTarget.offsetWidth / buttonRect.width),
      y: e.currentTarget.offsetTop + (e.clientY - buttonRect.top) * (e.currentTarget.offsetHeight / buttonRect.height),
    }
    setCloseHeld(true)
    setCloseRestRotation(restRotation)
    setClosePivot(pivot)
    setCloseDragResting(false)
    setCloseRotation(readPopupRotation())
    setCloseGestureCancelled(false)
    startSwing(readPopupRotation(), { x: e.clientX, y: e.clientY }, pivot)

    const gesture = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPopupX: popup.x,
      startPopupY: popup.y,
      moved: false,
      cleanup: () => {},
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== gesture.pointerId) return
      if (swingRef.current) swingRef.current.pointer = { x: event.clientX, y: event.clientY }
      const dx = (event.clientX - gesture.startX) / (scale || 1)
      const dy = (event.clientY - gesture.startY) / (scale || 1)
      if (!gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 4) {
        gesture.moved = true
        onCloseButtonDragStart?.(gesture.startX, gesture.startY)
      }
      if (gesture.moved) {
        const popupX = gesture.startPopupX + dx
        const popupY = gesture.startPopupY + dy
        onCloseButtonDragMove?.(event.clientX, event.clientY, popupX, popupY)
        updatePopupPosition(city.id, popupX, popupY, true)
      }
    }
    const detach = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onBlur)
    }
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== gesture.pointerId) return
      if (!gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 4) {
        gesture.moved = true
        onCloseButtonDragStart?.(gesture.startX, gesture.startY)
      }
      detach()
      closeGestureRef.current = null
      const dx = (event.clientX - gesture.startX) / (scale || 1)
      const dy = (event.clientY - gesture.startY) / (scale || 1)
      const angle = readPopupRotation()
      if (gesture.moved) {
        const popupX = gesture.startPopupX + dx
        const popupY = gesture.startPopupY + dy
        onCloseButtonDragMove?.(event.clientX, event.clientY, popupX, popupY)
        updatePopupPosition(city.id, popupX, popupY, true)
      }
      stopSwing(true)
      setCloseHeld(false)
      setCloseRotation(angle)
      playMapSound('popup_close_hold_end', true)

      if (gesture.moved) {
        // The card keeps the tilt it was dropped with until it is dragged by its body.
        setCloseRestRotation(angle)
        setCloseDragResting(true)
        setHasEntered(true)
        onCloseButtonDragEnd?.()
        return
      }

      const direction = Math.random() * Math.PI * 2
      const distance = 100 + Math.random() * 120
      const spinDirection = Math.random() < 0.5 ? -1 : 1
      const exitMotion: PopupExitMotion = {
        fromRotation: angle,
        translateX: Math.cos(direction) * distance,
        translateY: Math.sin(direction) * distance,
        rotation: angle + spinDirection * (35 + Math.random() * 30),
        originX: 10 + Math.random() * 80,
        originY: 10 + Math.random() * 80,
      }
      closePopup(city.id, 'held', exitMotion)
    }
    const onCancel = (event?: PointerEvent) => {
      if (event && event.pointerId !== gesture.pointerId) return
      detach()
      closeGestureRef.current = null
      stopSwing(true)
      setCloseHeld(false)
      setCloseGestureCancelled(true)
      if (gesture.moved) onCloseButtonDragEnd?.()
      playMapSound('popup_close_hold_end', true)
    }
    const onBlur = () => onCancel()
    gesture.cleanup = detach
    closeGestureRef.current = gesture
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onBlur)
  }

  const readPopupRotation = () => {
    const transform = popupWrapperRef.current && window.getComputedStyle(popupWrapperRef.current).transform
    if (!transform || transform === 'none') return 0
    try {
      const matrix = new DOMMatrixReadOnly(transform)
      return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
    } catch {
      return 0
    }
  }

  const closeButtonPointerLeave = () => {
    playMapSound('kr55_hh_low', true)
  }

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
        setCloseDragResting(false)
        startWhistleLoop()
        playMapSound('popup_down', true)
        setPressedPopupState({ id: city.id })
        if (onDragStart) onDragStart(e)
      }}
      onDragEnd={() => {
        setCloseDragResting(false)
        stopWhistleLoop()
        playMapSound('popup_up', true)
        setPressedPopupState(null)
        stopPadSound()
        if (onDragEnd) onDragEnd()
      }}
      handleRef={dragHandleRef}
      ref={popupWrapperRef}
      className={cn(
        "absolute pointer-events-auto flex flex-col select-none",
        // Default width: 10% wider than the former 288 px.
        !cardSize && "w-[317px]",
        drift ? "popup-drift-away" : popup.isClosing ? popup.exitMotion ? "animate-popup-exit-from-button" : "animate-popup-exit" : closeHeld ? "popup-close-held" : closeDragResting ? "popup-close-resting" : closeGestureCancelled ? "popup-close-restored" : hasEntered ? "popup-entered" : "animate-popup"
      )}
      style={{
        zIndex: popup.zIndex,
        width: cardSize?.width,
        willChange: 'left, top',
        contain: 'layout',
        touchAction: 'none',
        '--enter-x': `${popup.enterX || 0}px`,
        '--enter-rot': `${popup.enterRot || 0}deg`,
        '--close-held-rotation': `${popup.exitMotion?.fromRotation ?? closeRotation}deg`,
        '--close-rest-rotation': `${closeRestRotation}deg`,
        '--close-pivot-x': `${closePivot.x}px`,
        '--close-pivot-y': `${closePivot.y}px`,
        '--exit-x': `${popup.exitMotion?.translateX ?? 0}px`,
        '--exit-y': `${popup.exitMotion?.translateY ?? 0}px`,
        '--exit-rot': `${popup.exitMotion?.rotation ?? 0}deg`,
        '--exit-origin': `${popup.exitMotion?.originX ?? 50}% ${popup.exitMotion?.originY ?? 50}%`,
        '--drift-x': `${drift?.x ?? 0}px`,
        '--drift-y': `${drift?.y ?? 0}px`,
        '--drift-from-rot': `${drift?.fromRotation ?? 0}deg`,
        '--drift-rot': `${drift?.rotation ?? 0}deg`,
        transformOrigin: closeHeld || popup.exitMotion ? `${closePivot.x}px ${closePivot.y}px` : undefined,
      } as React.CSSProperties}
      onMouseDown={(e) => {
        if (e.button === 0 && !(e.target instanceof Element && e.target.closest('[data-popup-close-hold]'))) bringToFront(city.id)
      }}
      onAnimationEnd={event => {
        if (event.animationName === 'popupEnter') setHasEntered(true)
      }}
    >
      <button
        data-no-drag="true"
        data-popup-close-hold="true"
        className="absolute w-8 h-8 bg-background border rounded-full flex items-center justify-center text-muted-foreground transition-all z-50 shadow-md group hover:cursor-pointer hover:text-black"
        style={{ borderColor: city.color, top: -8, left: -10 }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = city.color;
          playMapSound("kr55_hh");
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '';
        }}
        onPointerDown={closeButtonPointerDown}
        onPointerLeave={closeButtonPointerLeave}
        onClick={(e) => {
          e.stopPropagation()
          if (e.detail === 0 && !popup.isClosing) closePopup(city.id)
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

      <div
        ref={containerRef}
        data-drag-handle="true" // Make the entire popup draggable
        data-popup-surface="true"
        data-chicken-platform
        className="popup-scrollbar-hidden relative overflow-hidden rounded-lg border bg-card/[0.82] shadow-2xl transition-transform cursor-grab active:cursor-grabbing"
        onClick={(e) => {
            e.stopPropagation()
        }}
        style={{
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100dvh - 24px)',
          height: cardSize?.height,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          boxShadow: isConquered
            ? `0 0 35px ${city.color}40, 0 0 15px rgba(234, 179, 8, 0.35)`
            : `0 0 30px ${city.color}25`,
          borderColor: isConquered ? '#eab308' : city.color,
          transform: popup.isClosing
            ? undefined
            : (isPressed ? 'scale(0.92)' : 'scale(1)'),
          transformOrigin: transformOrigin || (popup.isClosing
            ? '0px 3px'
            : (isPressed ? '0px 40px' : 'center center')),
          transition: popup.isClosing
            ? undefined
            : 'transform 0.2s ease-out'
        }}
        onMouseDown={() => {
            bringToFront(city.id)
        }}
      >
        <style jsx>{`
          .popup-scrollbar-hidden::-webkit-scrollbar { display: none; }
          .era-track { transition: transform 360ms ease-in-out; }
          @media (prefers-reduced-motion: reduce) { .era-track { transition: none; } }
        `}</style>
        {/* Decorative Header Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" style={{ backgroundColor: city.color }} />

        <div className="overflow-hidden" data-era-viewport>
          <div className="era-track flex items-start" style={{ transform: `translateX(-${getCityEras(city).findIndex(era => era.id === city.id) * 100}%)` }}>
            {getCityEras(city).map(era => <article key={era.id} aria-hidden={era.id !== city.id} inert={era.id !== city.id} className="w-full min-w-0 shrink-0" data-era-id={era.id}>
              <div data-drag-handle="true" className="relative h-32 w-full overflow-hidden cursor-grab active:cursor-grabbing">
                <img src={era.image} alt={`City of ${era.name}`} className="w-full h-full object-cover pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                {era.id === city.id && isConquered && <span className="absolute top-2 right-2 text-[10px] font-mono font-bold bg-black/70 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full pointer-events-none">👑 CONQUERED</span>}
              </div>
              <div className="px-5 pt-5 pb-1">
                <h3 className="mb-3 font-mono font-bold text-xl tracking-wide" style={{ color: era.color }}>{era.name}, {era.year}</h3>
                <p className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">{era.genre}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{era.description}</p>
              </div>
            </article>)}
          </div>
        </div>
        <div className="px-5 pb-5">
        {getCityEras(city).length > 1 && <nav aria-label={`Épocas de ${city.name}`} className="flex flex-wrap justify-start gap-2 mb-3">
          {getCityEras(city).map((era, index) => <button key={era.id} type="button" disabled={isEntering}
            // Closed hat on hover: even positions (2nd, 4th…) full, odd ones softer.
            onMouseEnter={() => { if (!isEntering) playMapSound(index % 2 === 1 ? 'alesissr16_ch' : 'alesissr16_ch_soft', true) }} aria-label={`${era.name}, ${era.year}: ${era.genre.split('·')[0].trim()}`} aria-pressed={era.id === city.id}
            onClick={() => onEraSelect?.(era)} className={cn('border rounded px-2 py-1 text-xs font-mono cursor-pointer', era.id === city.id ? 'text-white border-white/60' : 'text-white/50 border-white/20 hover:border-white/60')}>
            {era.year}
          </button>)}
        </nav>}

        <div className="space-y-3 animate-content-4">
          <div className="flex w-full flex-row items-stretch gap-2 font-mono">
              <button
                data-chicken-platform
                ref={enterButtonRef}
                className={cn(
                   "inline-flex w-3/5 items-center justify-center gap-1 px-2 py-1.5 rounded border transition-all cursor-pointer relative z-[100] overflow-hidden group text-sm",
                   isEntering && "pointer-events-none duration-[2000ms] ease-in"
                )}
                style={{
                    borderColor: city.color,
                    color: city.color,
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

                  // The card drifts off with the others (driftAway), so the button no longer zooms.
                  onEnter();
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 size-5 shrink-0">
                  <path d="M12 15v-12M12 3l7 3-7 3M2 21l4.2-4.4 2.4 2.4L12 15l3.4 4 2.4-2.4L22 21" />
                  <path d="m6.2 16.6 3.3 3.8 2.5-2.1 2.5 2.1 2.9-3.4" />
                </svg>
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
                    CAMPAIGN
                </span>
              </button>
              {(onCreateRoom || onlineDisabled) && (
                <div
                  data-no-drag
                  className="w-2/5 min-w-0"
                  // Same synth when online is down, a bit lower in pitch.
                  onPointerEnter={(e) => { if (!isEntering) handleSmartPadSound(e, onCreateRoom ? 0.45 : 0.38) }}
                  onPointerMove={(e) => { if (!isEntering) handleSmartPadSound(e, onCreateRoom ? 0.45 : 0.38) }}
                  onPointerLeave={(e) => { if (!isEntering) handleSmartPadLeave(e) }}
                >
                  <button
                    data-chicken-platform
                    type="button"
                    disabled={isEntering || isCreatingRoom || !onCreateRoom}
                    className={cn(
                      "group relative flex h-full w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded border border-primary/70 bg-transparent px-1.5 py-1.5 uppercase font-mono text-xs text-primary transition-all",
                      !onCreateRoom && "text-sm normal-case",
                      "hover:border-primary hover:shadow-[0_0_14px_rgba(16,185,129,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                      "cursor-crosshair disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    onClick={() => {
                      if (!isEntering && !isCreatingRoom) onCreateRoom?.(city)
                    }}
                  >
                    <span aria-hidden="true" className="absolute inset-0 rounded-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100" style={{ background: 'linear-gradient(115deg, rgb(16 185 129 / 22%), rgb(167 139 250 / 25%), rgb(16 185 129 / 22%)), radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgb(167 139 250 / 45%), transparent 68%)' }} />
                    {isCreatingRoom ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="relative z-10 size-8 shrink-0 text-primary">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="origin-center animate-spin" style={{ animationDuration: '3s' }} />
                        <path d="M12 6a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="origin-center animate-spin" style={{ animationDuration: '1.1s' }} />
                        <circle cx="12" cy="12" r="2.2" fill="currentColor" className="animate-pulse" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 size-5 shrink-0">
                        <path d="M4 21V4a1 1 0 0 1 1-1h9" />
                        <path d="M14 3l6 3v14l-6-3V3Z" />
                        <path d="M4 21h16" />
                      </svg>
                    )}
                    <span className="relative z-10">{!onCreateRoom ? 'Online mode temporarily disabled' : isCreatingRoom ? 'Waiting response' : 'Lobby'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Resize grip, same look as the Creative widgets. */}
      <span data-no-drag="true" aria-hidden="true" className="popup-resize-grip" onPointerDown={startCardResize} />
    </Draggable>
  )
}
