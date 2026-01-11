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
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [hoverProgress, setHoverProgress] = useState(0)
  const [unlockedCities, setUnlockedCities] = useState<string[]>([])

  // Zoom and Pan state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Load campaign state
  useEffect(() => {
    const state = getCampaignState()
    setUnlockedCities(state.unlockedCityIds)
  }, [])

  const handleCityHover = useCallback((cityId: string | null) => {
    setHoveredCity(cityId)
    if (cityId) {
      setHoverProgress(0)
      const interval = setInterval(() => {
        setHoverProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 5
        })
      }, 50)
      return () => clearInterval(interval)
    }
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

  // Wheel handler for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    // e.deltaY > 0 means scrolling down (zoom out)
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(scale * delta, 1), 8) // Limit zoom between 1x and 8x
    setScale(newScale)
  }

  // Ref for the map container to calculate positions
  const mapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [lineEnd, setLineEnd] = useState<{x: number, y: number} | null>(null)

  // Update line position when dragging/zooming if a city is hovered
  useEffect(() => {
    if (!hoveredCity || !mapRef.current || !containerRef.current) return

    const updateLine = () => {
      const pinElement = document.getElementById(`city-pin-${hoveredCity}`)
      if (!pinElement || !containerRef.current) return

      const pinRect = pinElement.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()

      // Calculate center of the pin relative to the container
      const pinX = pinRect.left + pinRect.width / 2 - containerRect.left
      const pinY = pinRect.top + pinRect.height / 2 - containerRect.top

      setLineEnd({ x: pinX, y: pinY })
    }

    updateLine()
    
    // Add event listeners for smoother updates during interaction if needed
    // But since scale/position are state, this effect runs on every render
  }, [hoveredCity, scale, position, cities]) // Re-run when map moves or city changes

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-background overflow-hidden flex flex-col">
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
      <header className="absolute top-0 left-0 w-full z-20 flex items-center justify-between px-8 py-6 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse-glow" style={{ color: "var(--neon-cyan)" }} />
            <h1 className="text-2xl font-mono font-bold tracking-wider text-foreground">
              ChiKen<span className="text-primary">Chess</span>
            </h1>
          </div>
        </div>
        <div className="text-muted-foreground font-mono text-sm">CAMPAIGN MODE</div>
      </header>

      {/* Time Slider - REMOVED */}
      
      {/* Map Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-0 overflow-hidden z-10 cursor-move active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          ref={mapRef}
          className="relative w-full max-w-6xl mx-auto transition-transform duration-75 ease-out"
          style={{ 
            aspectRatio: "201/97",
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center"
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
            const isHovered = hoveredCity === city.id
            const pos = getCityPosition(city)

            return (
              <button
                key={city.id}
                id={`city-pin-${city.id}`}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group focus:outline-none",
                  isUnlocked ? "cursor-pointer z-10" : "cursor-not-allowed opacity-40 z-0",
                )}
                style={{
                  left: `${Math.round(pos.x * 10000) / 10000}%`,
                  top: `${Math.round(pos.y * 10000) / 10000}%`,
                  transform: `translate(-50%, -50%) scale(${1 / Math.sqrt(scale)})`
                }}
                onMouseEnter={() => handleCityHover(city.id)}
                onMouseLeave={() => handleCityHover(null)}
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUnlocked) onCitySelect(city);
                }}
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
                    isHovered ? "scale-150" : "scale-100",
                  )}
                  style={{
                    borderColor: isUnlocked ? city.color : "#666",
                    boxShadow: isUnlocked ? `0 0 20px ${city.color}` : "none",
                  }}
                >
                  {!isUnlocked && (
                    <div className="w-2 h-2 rounded-full bg-neutral-600" />
                  )}
                  {isUnlocked && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* UI OVERLAY LAYER - Fixed elements that don't scale */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        
        {/* Connection Line & Hover Popup */}
        {hoveredCity && lineEnd && (
          <>
            {/* SVG Layer for Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
                  <circle cx="4" cy="4" r="2" fill="var(--primary)" />
                </marker>
              </defs>
              <line 
                x1={lineEnd.x} 
                y1={lineEnd.y} 
                x2="80%" // Fixed X position for popup (right side)
                y2="40%" // Fixed Y position for popup
                stroke={cities.find(c => c.id === hoveredCity)?.color || "var(--primary)"} 
                strokeWidth="2"
                strokeDasharray="4 4"
                className="opacity-80"
              />
              <circle cx={lineEnd.x} cy={lineEnd.y} r="3" fill={cities.find(c => c.id === hoveredCity)?.color || "var(--primary)"} />
            </svg>

            {/* Fixed Popup Card */}
            <div 
              className="absolute right-[10%] top-[30%] w-72 pointer-events-auto"
              onMouseEnter={() => handleCityHover(hoveredCity)} // Keep hover alive if moving over popup
              onMouseLeave={() => handleCityHover(null)}
            >
              {(() => {
                const city = cities.find(c => c.id === hoveredCity)!
                const isUnlocked = unlockedCities.includes(city.id)
                
                return (
                  <div
                    className={cn(
                      "p-5 rounded-lg border bg-card/95 backdrop-blur-md shadow-2xl transition-all duration-300",
                      !isUnlocked && "opacity-80 grayscale-[0.5]"
                    )}
                    style={{
                      boxShadow: isUnlocked ? `0 0 40px ${city.color}20` : 'none',
                      borderColor: isUnlocked ? city.color : '#444',
                    }}
                  >
                    {/* Decorative Header Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" style={{ backgroundColor: city.color }} />
                    
                    {/* City Image */}
                    <div className="w-full h-32 mb-4 rounded-md overflow-hidden relative">
                      <img 
                        src={city.image} 
                        alt={`City of ${city.name}`} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-mono font-bold text-xl tracking-wide" style={{ color: isUnlocked ? city.color : '#aaa' }}>
                        {city.name}
                      </h3>
                      <span className="text-xs text-muted-foreground font-mono border border-border px-1.5 py-0.5 rounded">{city.year}</span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">{city.genre}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{city.description}</p>
                    </div>

                    {isUnlocked ? (
                      <div className="space-y-3">
                        <div className="w-full bg-secondary/50 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full animate-pulse" 
                            style={{ width: `${hoverProgress}%`, backgroundColor: city.color }} 
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-muted-foreground">
                            TARGET BPM: <span style={{ color: city.color }}>{city.bpm}</span>
                          </span>
                          <button 
                            className="px-3 py-1.5 rounded border transition-colors hover:bg-white/5" 
                            style={{ borderColor: city.color, color: city.color }}
                            onClick={() => onCitySelect(city)}
                          >
                            ENTER ARENA
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-xs font-mono p-3 bg-neutral-900/50 rounded border border-dashed border-neutral-700 text-neutral-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        <span>LOCATION LOCKED</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </>
        )}

        {/* Legend (Fixed Bottom Left) */}
        <div 
          className="absolute bottom-4 left-4 p-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h4 className="font-mono text-xs text-muted-foreground mb-2">CAMPAIGN PROGRESS</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-primary font-bold">{unlockedCities.length}</span>
              <span className="text-muted-foreground">/ {cities.length} CITIES UNLOCKED</span>
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
        <div className="absolute bottom-20 right-8 flex flex-col gap-2 z-50 pointer-events-auto">
          <button 
            className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent"
            onClick={() => setScale(s => Math.min(s * 1.2, 8))}
          >
            +
          </button>
          <button 
            className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent"
            onClick={() => setScale(s => Math.max(s / 1.2, 1))}
          >
            -
          </button>
          <button 
            className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:bg-accent text-xs"
            onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
          >
            R
          </button>
        </div>

        {/* Bottom Right Info & Controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-4 pointer-events-auto z-50 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-mono text-muted-foreground">v0.2.2</span>
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
