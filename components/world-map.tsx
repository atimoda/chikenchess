"use client"

import { useState, useCallback, useEffect } from "react"
import { cities, type CityData } from "@/lib/cities-data"
import { getCampaignState, getLastUnlockedYear, resetCampaign } from "@/lib/game-progression"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface WorldMapProps {
  onCitySelect: (city: CityData) => void
}

export function WorldMap({ onCitySelect }: WorldMapProps) {
  const [maxUnlockedYear, setMaxUnlockedYear] = useState(1970)
  const [selectedYear, setSelectedYear] = useState(1970)
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [hoverProgress, setHoverProgress] = useState(0)
  const [unlockedCities, setUnlockedCities] = useState<string[]>([])

  // Load campaign state
  useEffect(() => {
    const lastYear = getLastUnlockedYear()
    const state = getCampaignState()
    setMaxUnlockedYear(lastYear)
    setSelectedYear(lastYear) // Start at the latest unlocked
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

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none scanline opacity-20" />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 170, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 170, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse-glow" style={{ color: "var(--neon-cyan)" }} />
            <h1 className="text-2xl font-mono font-bold tracking-wider text-foreground">
              ChiKen<span className="text-primary">Chess</span>
            </h1>
          </div>
        </div>
        <div className="text-muted-foreground font-mono text-sm">CAMPAIGN MODE</div>
      </header>

      {/* Time Slider - Controls "Current Time" visualization, limited by progress */}
      <div className="relative z-20 px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-muted-foreground">1970</span>
            <span className="font-mono text-2xl font-bold text-primary">{selectedYear}</span>
            <span className="font-mono text-sm text-muted-foreground">2025</span>
          </div>
          <Slider
            value={[selectedYear]}
            onValueChange={(value) => setSelectedYear(Math.min(value[0], maxUnlockedYear))}
            min={1970}
            max={2025}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
            <span>KRAUTROCK</span>
            <span>DISCO</span>
            <span>HOUSE</span>
            <span>TECHNO</span>
            <span>JUNGLE</span>
            <span>EDM</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        className="relative flex-1 mx-8 my-4 rounded-lg border border-border bg-card/50 overflow-hidden"
        style={{ height: "calc(100vh - 280px)" }}
      >
        {/* World Map SVG Background */}
        <img
          src="/world_map_with_points.svg"
          alt="World Map"
          className="absolute inset-0 w-full h-full object-contain object-center opacity-40 select-none pointer-events-none"
        />

        {/* City Markers */}
        {cities.map((city) => {
          const isUnlocked = unlockedCities.includes(city.id)
          const isHovered = hoveredCity === city.id

          // Determine tooltip position based on vertical position (to avoid clipping at top)
          const isTopCity = city.coordinates.y < 30 // If in top 30% of screen

          return (
            <button
              key={city.id}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group focus:outline-none",
                isUnlocked ? "cursor-pointer z-10" : "cursor-not-allowed opacity-40 z-0",
              )}
              style={{
                left: `${city.coordinates.x}%`,
                top: `${city.coordinates.y}%`,
              }}
              onMouseEnter={() => handleCityHover(city.id)}
              onMouseLeave={() => handleCityHover(null)}
              onClick={() => isUnlocked && onCitySelect(city)}
            >
              {/* Pulse ring (Only for unlocked) */}
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

              {/* Hover Card */}
              {isHovered && (
                <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-64 p-4 rounded-lg border bg-card/95 backdrop-blur-sm z-50 text-left transition-opacity",
                    !isUnlocked && "opacity-80 grayscale-[0.5]",
                    // Position tooltip below if it's a top city, otherwise above
                    isTopCity ? "top-full mt-4" : "bottom-full mb-4"
                  )}
                  style={{
                    boxShadow: isUnlocked ? `0 0 30px ${city.color}40` : 'none',
                    borderColor: isUnlocked ? 'var(--border)' : '#444'
                  }}
                >
                  {/* Filter progress bar */}
                  {isUnlocked && (
                    <div
                      className="absolute top-0 left-0 h-1 rounded-t-lg transition-all duration-100"
                      style={{
                        width: `${hoverProgress}%`,
                        backgroundColor: city.color,
                      }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-mono font-bold text-lg" style={{ color: isUnlocked ? city.color : '#aaa' }}>
                      {city.name}
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono">{city.year}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{city.genre}</p>
                  <p className="text-xs text-muted-foreground mb-3">{city.description}</p>

                  {isUnlocked ? (
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">
                        BPM: <span style={{ color: city.color }}>{city.bpm}</span>
                      </span>
                      <span className="px-2 py-1 rounded border" style={{ borderColor: city.color, color: city.color }}>
                        ENTER ARENA
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs font-mono p-2 bg-neutral-900 rounded border border-neutral-700 text-neutral-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <span>LOCKED - UNLOCK PREVIOUS</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm">
          <h4 className="font-mono text-xs text-muted-foreground mb-2">CAMPAIGN PROGRESS</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-primary font-bold">{unlockedCities.length}</span>
              <span className="text-muted-foreground">/ {cities.length} CITIES UNLOCKED</span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(unlockedCities.length / cities.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reset Button (Dev) */}
        <button
          onClick={() => {
            if (confirm("Reset Campaign Progress?")) {
              resetCampaign()
            }
          }}
          className="absolute bottom-4 right-4 px-3 py-1 text-[10px] font-mono text-muted-foreground opacity-50 hover:opacity-100 border border-transparent hover:border-border rounded transition-all"
        >
          RESET SAVE
        </button>

      </div>

      {/* Footer Status */}
      <footer className="relative z-20 px-8 py-4 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <span>
            CURRENT ERA: {Math.floor(selectedYear / 10) * 10}s
          </span>
          <span className="text-primary">|</span>
          <span>AUDIO ENGINE: STRUDEL.CC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground outline-dotted outline-1 px-1 rounded hover:bg-white/10" title="Version Control">v0.2.1 (EUCLIDEAN + AMBIENCE)</span>
        </div>
      </footer>
    </div>
  )
}
