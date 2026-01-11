"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { cities, type CityData } from "@/lib/cities-data"
import { getCampaignState, resetCampaign } from "@/lib/game-progression"
import { cn } from "@/lib/utils"

interface WorldMapProps {
  onCitySelect: (city: CityData) => void
}

const CITY_OFFSETS: Record<string, { dx: number; dy: number }> = {
  saopaulo: { dx: -1, dy: 1 },
  ibiza: { dx: -0.8, dy: -0.6 },
  tokyo: { dx: 1.5, dy: -0.8 },
}

// Helper to convert lat/long to x/y percentages (Equirectangular projection)
const getCityPosition = (city: CityData) => {
  // If geoCoordinates are missing, fallback to manual coordinates
  if (!city.geoCoordinates) {
    return { x: city.coordinates.x, y: city.coordinates.y }
  }

  // Map dimensions (from SVG viewBox)
  // viewBox="0 0 201 97"
  // Longitude: -180 to 180 maps to 0 to 201
  // Latitude: 90 to -90 maps to 0 to 97

  const { lat, lng } = city.geoCoordinates
  
  // Normalize longitude (-180 to 180) to 0-1 range
  const lngPercent = (lng + 180) / 360
  
  // Normalize latitude using Gall-Peters projection (Cylindrical Equal-Area)
  // Formula: y is proportional to sin(latitude) instead of latitude itself
  // Range: sin(90) = 1 (Top), sin(-90) = -1 (Bottom)
  // Map to 0-1 range: (1 - sin(lat)) / 2
  const latRad = lat * (Math.PI / 180)
  const latPercent = (1 - Math.sin(latRad)) / 2

  // Calibration Offsets (fine-tuning based on map image)
  const OFFSET_X = -5
  const OFFSET_Y = 10

  const o = CITY_OFFSETS[city.id] ?? { dx: 0, dy: 0 }
  return {
    x: (lngPercent * 100) + OFFSET_X + o.dx,
    y: (latPercent * 100) + OFFSET_Y + o.dy
  }
}

export function WorldMap({ onCitySelect }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [unlockedCities, setUnlockedCities] = useState<string[]>([])

  // Zoom and Pan state
  const [scale, setScale] = useState(0.01)
  const [transitionDuration, setTransitionDuration] = useState(3300)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  interface PopupState {
    x: number
    y: number
    zIndex: number
    isClosing?: boolean
    timestamp: number
    enterX: number
    enterRot: number
  }

  const [openPopups, setOpenPopups] = useState<Record<string, PopupState>>({})
  const [nextZIndex, setNextZIndex] = useState(100)
  const [showTitle, setShowTitle] = useState(false)

  const [pressedPopupState, setPressedPopupState] = useState<{ id: string, rotation: number } | null>(null)
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null)

  // --- AUDIO LOGIC ---
  const audioContextRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Record<string, AudioBuffer>>({})

  useEffect(() => {
    // Initialize AudioContext
    const initAudio = async () => {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext
            if (!Ctx) return
            const ctx = new Ctx()
            audioContextRef.current = ctx

            const loadSample = async (name: string, url: string) => {
                try {
                    const res = await fetch(url)
                    const arrayBuffer = await res.arrayBuffer()
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
                    buffersRef.current[name] = audioBuffer
                } catch (e) {
                    console.warn(`Failed to load sample ${name}`, e)
                }
            }

            await Promise.all([
                loadSample("bd", "/samples/bd.wav"),
                loadSample("sd", "/samples/sd.wav"),
                loadSample("cr", "/samples/cy.wav") // Using Cymbal for Crash
            ])
        } catch (e) {
            console.error("Audio init failed", e)
        }
    }
    initAudio()
    
    return () => {
        audioContextRef.current?.close()
    }
  }, [])

  const playMapSound = (type: "bd" | "sd" | "cr") => {
      const ctx = audioContextRef.current
      const buffer = buffersRef.current[type]
      if (!ctx || !buffer) return

      if (ctx.state === "suspended") ctx.resume()

      const src = ctx.createBufferSource()
      src.buffer = buffer
      
      // Random pitch variation (small)
      const rate = 0.95 + Math.random() * 0.1
      src.playbackRate.value = rate

      const gain = ctx.createGain()
      gain.gain.value = 0.3 // Volume

      src.connect(gain)
      gain.connect(ctx.destination)
      src.start(0)
  }

  const bringToFront = (cityId: string) => {
    setOpenPopups(prev => ({
      ...prev,
      [cityId]: { ...prev[cityId], zIndex: nextZIndex }
    }))
    setNextZIndex(n => n + 1)
  }

  const closePopup = (cityId: string) => {
    playMapSound("cr")
    setOpenPopups(prev => ({
      ...prev,
      [cityId]: { ...prev[cityId], isClosing: true }
    }))

    setTimeout(() => {
      setOpenPopups(prev => {
        const next = { ...prev }
        delete next[cityId]
        return next
      })
    }, 500)
  }

  const handleCityClick = (city: CityData) => {
    playMapSound("sd")
    if (openPopups[city.id] && !openPopups[city.id].isClosing) {
      bringToFront(city.id)
      return
    }

    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    const h = typeof window !== 'undefined' ? window.innerHeight : 768
    
    // Position randomly near bottom corners (left or right side)
    const isLeft = Math.random() > 0.5
    
    // X: random offset from left or right edge
    let x = isLeft 
      ? 50 + Math.random() * (w * 0.2) // 50px to 20% width
      : w - 350 - Math.random() * (w * 0.2) // Right side
      
    // Y: random offset from bottom (concentrated near bottom)
    let y = h - 250 - Math.random() * (h * 0.1)

    // Constrain to screen boundaries (assuming popup width ~300px, height ~400px)
    const popupWidth = 300
    const popupHeight = 450
    x = Math.max(20, Math.min(x, w - popupWidth - 20))
    y = Math.max(80, Math.min(y, h - popupHeight - 20)) // Top 80 to avoid header
    
    setOpenPopups(prev => ({
      ...prev,
      [city.id]: { 
        x, 
        y, 
        zIndex: nextZIndex,
        timestamp: Date.now(),
        enterX: (Math.random() - 0.5) * 400, // -200 to 200
        enterRot: (Math.random() - 0.5) * 40 // -20 to 20 deg
      }
    }))
    setNextZIndex(n => n + 1)
  }

  const [isMobile, setIsMobile] = useState(false)
  const [isIntro, setIsIntro] = useState(true)

  // Initial Zoom Animation
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const t1 = setTimeout(() => setScale(window.innerWidth < 768 ? 1.2 : 1.44), 100)
    const t2 = setTimeout(() => setTransitionDuration(75), 3400)
    const t3 = setTimeout(() => setShowTitle(true), 3000)
    const t4 = setTimeout(() => setIsIntro(false), 100)
    
    return () => { 
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Load campaign state
  useEffect(() => {
    const state = getCampaignState()
    setUnlockedCities(state.unlockedCityIds)
  }, [])

  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Wheel handler for zooming with mouse focus
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    if (!containerRef.current) return

    // Set short transition for responsive feel
    setTransitionDuration(50)

    // Calculate mouse position relative to container center
    const rect = containerRef.current.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const mouseX = e.clientX - rect.left - cx
    const mouseY = e.clientY - rect.top - cy

    // Determine zoom factor
    // e.deltaY > 0 means scrolling down (zoom out)
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(scale * delta, 1), 8) // Limit zoom between 1x and 8x
    
    if (newScale === scale) return

    // Adjust position to keep mouse point stationary
    // Formula: new_pos = mouse - (mouse - old_pos) * (new_scale / old_scale)
    const scaleRatio = newScale / scale
    const newX = mouseX - (mouseX - position.x) * scaleRatio
    const newY = mouseY - (mouseY - position.y) * scaleRatio

    setScale(newScale)
    setPosition({ x: newX, y: newY })
    
    // Reset transition duration after a delay (debounce could be better but this works for single scroll)
    // Actually, keeping it low while scrolling is fine. We can reset it in a useEffect if needed, 
    // or just leave it low since we mostly pan/zoom via gestures now.
  }

  const [lineEnds, setLineEnds] = useState<Record<string, {x: number, y: number}>>({})

  // Update line positions for all open popups
  useEffect(() => {
    if (Object.keys(openPopups).length === 0 || !mapRef.current || !containerRef.current) return

    const updateLines = () => {
        const nextEnds: Record<string, {x: number, y: number}> = {}
        Object.keys(openPopups).forEach(cityId => {
            const pinElement = document.getElementById(`city-pin-${cityId}`)
            if (pinElement && containerRef.current) {
                const pinRect = pinElement.getBoundingClientRect()
                const containerRect = containerRef.current.getBoundingClientRect()
                nextEnds[cityId] = {
                    x: pinRect.left + pinRect.width / 2 - containerRect.left,
                    y: pinRect.top + pinRect.height / 2 - containerRect.top
                }
            }
        })
        setLineEnds(nextEnds)
    }

    updateLines()
  }, [openPopups, scale, position, cities]) 

  const updatePopupPosition = (cityId: string, x: number, y: number) => {
    setOpenPopups(prev => ({
      ...prev,
      [cityId]: { ...prev[cityId], x, y }
    }))
  }

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-background overflow-hidden flex flex-col">
      <style jsx global>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawLineReverse {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 1000; }
        }
        .animate-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawLine 0.4s ease-out forwards;
        }
        .animate-line-exit {
          stroke-dasharray: 1000;
          stroke-dashoffset: 0;
          animation: drawLineReverse 0.4s ease-in forwards;
        }
        @keyframes popupEnter {
          0% { opacity: 0; transform: perspective(1000px) rotateX(10deg) translate(var(--enter-x), 100vh) rotate(var(--enter-rot)) scale(0.5); }
          100% { opacity: 1; transform: perspective(1000px) rotateX(0) translate(0, 0) rotate(0) scale(1); }
        }
        @keyframes popupExit {
          0% { opacity: 1; transform: translateY(0) rotate(0); }
          100% { opacity: 0; transform: translateY(100vh) rotate(15deg); }
        }
        .animate-popup {
          opacity: 0;
          animation: popupEnter 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s forwards;
        }
        .animate-popup-exit {
          animation: popupExit 0.5s cubic-bezier(0.6, 0.04, 0.98, 0.335) forwards;
        }
        @keyframes contentFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-content-1 { opacity: 0; animation: contentFade 0.5s ease-out 0.5s forwards; }
        .animate-content-2 { opacity: 0; animation: contentFade 0.5s ease-out 0.6s forwards; }
        .animate-content-3 { opacity: 0; animation: contentFade 0.5s ease-out 0.7s forwards; }
        .animate-content-4 { opacity: 0; animation: contentFade 0.5s ease-out 0.8s forwards; }
      `}</style>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none scanline opacity-20 z-50" />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 170, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 170, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-20 flex flex-col md:flex-row items-center md:justify-between px-8 py-6 pointer-events-none gap-2">
        {/* Placeholder for layout */}
        <div className="hidden md:block w-[280px] h-10" />

        <div className="flex items-center gap-4 pointer-events-none transition-all duration-1000 ease-out z-50"
             style={{
                position: 'absolute',
                top: '24px',
                left: isMobile ? '50%' : '32px',
                transform: isIntro 
                  ? (isMobile ? 'translate(-150%, 0)' : 'translate(-150%, 0)') 
                  : (isMobile 
                      ? `translateX(-50%) ${scale >= 2.8 ? 'scale(0.5)' : 'scale(1)'}` 
                      : 'none'),
                transformOrigin: 'top center',
                opacity: isIntro ? 0 : 1,
             }}
        >
          <div className="flex items-center gap-2">
            <img 
              src="/images/logo-chikenchess-border-darker.png" 
              alt="ChiKenChess Logo" 
              className="w-[80vw] max-w-[200px] md:w-10 md:h-10 md:max-w-none object-contain pointer-events-none transition-transform duration-1000"
              style={{
                 transform: (!isIntro && !isMobile) ? 'scaleX(-1)' : 'scaleX(1)'
              }}
            />
            <h1 
              className={cn(
                "hidden md:block text-[33px] font-mono font-bold tracking-wider text-foreground transition-opacity duration-1000",
                (isMobile && scale >= 2.8) && "absolute left-full ml-2 w-max animate-content-1"
              )}
              style={{ 
                textShadow: "rgb(0, 0, 0) 0px 3px 1px, rgb(0, 0, 0) 3px 3px 0px, rgb(0, 0, 0) 3px 3px 0px, rgb(0, 0, 0) -3px -3px 0px, rgb(0, 0, 0) 0px 0px 0px"
              }}
            >
              ChiKen<span className="text-primary">Chess</span>
            </h1>
          </div>
        </div>
        
        <div 
          className="font-mono font-bold text-xl text-white uppercase tracking-widest transition-opacity duration-500 text-center md:text-right"
          style={{ 
            textShadow: "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            opacity: (showTitle && scale <= (typeof window !== 'undefined' && window.innerWidth >= 768 ? 1.5 : 1.33)) ? 1 : 0,
            position: isMobile ? 'absolute' : 'relative',
            top: isMobile ? '220px' : 'auto',
            left: isMobile ? '50%' : 'auto',
            transform: isMobile ? 'translateX(-50%)' : 'none',
            width: isMobile ? '100%' : 'auto',
            zIndex: 10
          }}
        >
          Select your stage
        </div>
      </header>

      {/* Map Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-0 overflow-hidden z-10 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={() => {}}
      >
        <div 
          ref={mapRef}
          className="relative w-full max-w-6xl mx-auto transition-transform ease-in-out"
          style={{ 
            aspectRatio: "201/97",
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transitionDuration: `${transitionDuration}ms`
          }}
        >
          {/* World Map SVG Background */}
          <img
            src="/world_map_tech.svg"
            alt="World Map"
            className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
            draggable={false}
          />

          {/* City Markers ONLY (No Popups here) */}
          {cities.map((city) => {
            const isUnlocked = unlockedCities.includes(city.id)
            const isSelected = !!openPopups[city.id]
            const pos = getCityPosition(city)

            return (
              <button
                key={city.id}
                id={`city-pin-${city.id}`}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group focus:outline-none",
                  "cursor-pointer z-10"
                )}
                style={{
                  left: `${Math.round(pos.x * 10000) / 10000}%`,
                  top: `${Math.round(pos.y * 10000) / 10000}%`,
                  transform: `translate(-50%, -50%) scale(${1 / Math.sqrt(scale)})`
                }}
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCityClick(city);
                }}
                onMouseEnter={() => {
                  setHoveredCityId(city.id)
                  playMapSound("bd")
                }}
                onMouseLeave={() => setHoveredCityId(null)}
              >
                {/* Pulse ring */}
                {isUnlocked && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: city.color,
                      opacity: 0.3,
                      width: "24px",
                      height: "24px",
                      marginLeft: "-4px",
                      marginTop: "-4px",
                    }}
                  />
                )}

                {/* City dot */}
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center bg-background",
                    isSelected ? "scale-150" : "scale-100",
                  )}
                  style={{
                    borderColor: (isUnlocked || hoveredCityId === city.id || isSelected) ? city.color : "#666",
                    boxShadow: (isUnlocked || hoveredCityId === city.id || isSelected) ? `0 0 20px ${city.color}` : "none",
                  }}
                >
                  <div 
                    className={cn("w-2 h-2 rounded-full", !(isUnlocked || hoveredCityId === city.id || isSelected) && "bg-neutral-600")}
                    style={{ backgroundColor: (isUnlocked || hoveredCityId === city.id || isSelected) ? city.color : undefined }} 
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* UI OVERLAY LAYER - Fixed elements that don't scale */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
              <circle cx="4" cy="4" r="2" fill="var(--primary)" />
            </marker>
          </defs>
          {Object.entries(openPopups).map(([cityId, popup]) => {
             const city = cities.find(c => c.id === cityId)
             const start = lineEnds[cityId]
             if (!city || !start) return null
             return (
               <g key={`line-${cityId}-${popup.timestamp || 0}`}>
                 <line 
                   x1={start.x} y1={start.y} 
                   x2={popup.x + 144} 
                   y2={popup.y + 64} 
                   stroke={city.color} 
                   strokeWidth="2" strokeDasharray="4 4"
                   className={cn("opacity-80", popup.isClosing ? "animate-line-exit" : "animate-line")}
                 />
                 <circle cx={start.x} cy={start.y} r="3" fill={city.color} />
               </g>
             )
          })}
        </svg>

        {/* Popups */}
        {Object.entries(openPopups).map(([cityId, popup]) => {
          const city = cities.find(c => c.id === cityId)
          if (!city) return null
          const isUnlocked = unlockedCities.includes(city.id)
          const isPressed = pressedPopupState?.id === cityId
          const rotation = isPressed ? pressedPopupState.rotation : 0
          
          return (
            <div 
              key={cityId} 
              className={cn(
                "absolute w-72 pointer-events-auto flex flex-col",
                popup.isClosing ? "animate-popup-exit" : "animate-popup"
              )}
              style={{ 
                left: popup.x, 
                top: popup.y, 
                zIndex: popup.zIndex,
                // @ts-ignore
                '--enter-x': `${popup.enterX || 0}px`,
                // @ts-ignore
                '--enter-rot': `${popup.enterRot || 0}deg`
              }}
              onMouseDown={() => bringToFront(cityId)}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="relative p-5 rounded-lg border bg-card/95 backdrop-blur-md shadow-2xl transition-all"
                style={{
                  boxShadow: isUnlocked ? `0 0 40px ${city.color}20` : 'none',
                  borderColor: isUnlocked ? city.color : '#444',
                  backgroundColor: !isUnlocked ? `color-mix(in srgb, ${city.color}, black 95%)` : undefined,
                  transform: isPressed ? `scale(0.9) rotate(${rotation}deg)` : 'scale(1) rotate(0deg)',
                  transition: isPressed ? 'transform 0.2s ease-out' : 'transform 0.1s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                }}
              >
                {/* Close Button */}
                <button 
                  className="absolute -top-3 -right-3 w-8 h-8 bg-background border rounded-full flex items-center justify-center text-muted-foreground transition-colors z-50 shadow-md group hover:cursor-pointer hover:text-black"
                  style={{ borderColor: city.color }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = city.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  onClick={(e) => { e.stopPropagation(); closePopup(cityId); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>

                {/* Decorative Header Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" style={{ backgroundColor: city.color }} />
                
                {/* City Image (Draggable Handle) */}
                <div 
                  className="w-full h-32 mb-4 rounded-md overflow-hidden relative animate-content-1 cursor-grab active:cursor-grabbing group"
                  onMouseDown={(e) => {
                     e.stopPropagation()
                     bringToFront(cityId)
                     const rot = (Math.random() * 6) - 3
                     setPressedPopupState({ id: cityId, rotation: rot })
                     const startX = e.clientX
                     const startY = e.clientY
                     const startLeft = popup.x
                     const startTop = popup.y
                     
                     const onMove = (mv: MouseEvent) => {
                       updatePopupPosition(cityId, startLeft + (mv.clientX - startX), startTop + (mv.clientY - startY))
                     }
                     const onUp = () => {
                       setPressedPopupState(null)
                       window.removeEventListener('mousemove', onMove)
                       window.removeEventListener('mouseup', onUp)
                     }
                     window.addEventListener('mousemove', onMove)
                     window.addEventListener('mouseup', onUp)
                  }}
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
                        className="px-3 py-1.5 rounded border transition-all cursor-pointer" 
                        style={{ borderColor: city.color, color: city.color }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.boxShadow = `0 0 15px ${city.color}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = city.color;
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => onCitySelect(city)}
                      >
                        ENTER ARENA
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
            </div>
          )
        })}

        {/* Legend (Fixed Bottom Left) */}
        <div 
          className="absolute bottom-4 left-4 p-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted-foreground">
              Campaign Progress: <span className="text-primary font-bold">{unlockedCities.length}</span> / {cities.length} cities unlocked
            </div>
            <div className="w-32 bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(unlockedCities.length / cities.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Zoom Controls (Fixed Bottom Right) */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 md:bottom-20 md:right-8 md:left-auto md:translate-x-0 flex flex-col gap-2 z-50 pointer-events-auto items-center md:items-end">
          <div className="flex flex-row md:flex-col gap-2">
            <button 
              className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent text-xs"
              onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
            >
              R
            </button>
            <button 
              className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent"
              onClick={() => setScale(s => Math.max(s / 1.2, 1))}
            >
              -
            </button>
            <button 
              className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent"
              onClick={() => setScale(s => Math.min(s * 1.2, 8))}
            >
              +
            </button>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground bg-background/80 backdrop-blur px-1 rounded border border-border">
             {Math.round(scale * 100)}%
          </div>
        </div>

        {/* Bottom Right Info & Controls */}
        <div className="hidden md:flex absolute bottom-4 right-4 items-center gap-4 pointer-events-auto z-50 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-mono text-muted-foreground">v0.2.3 "World Map Popups"</span>
          </div>

          <div className="h-4 w-px bg-border" />

          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm("Reset Campaign Progress?")) {
                resetCampaign()
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="px-3 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-white/10 border border-transparent hover:border-white/10 rounded transition-all"
          >
            RESET SAVE
          </button>
        </div>
      </div>
    </div>
  )
}
