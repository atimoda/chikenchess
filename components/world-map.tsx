"use client"

import { useState, useCallback } from "react"
import { cities, getCitiesForDecade, type CityData } from "@/lib/cities-data"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface WorldMapProps {
  onCitySelect: (city: CityData) => void
}

export function WorldMap({ onCitySelect }: WorldMapProps) {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [hoverProgress, setHoverProgress] = useState(0)

  const availableCities = getCitiesForDecade(selectedYear)

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
        <div className="text-muted-foreground font-mono text-sm">SELECT YOUR ARENA</div>
      </header>

      {/* Time Slider */}
      <div className="relative z-20 px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-muted-foreground">1970</span>
            <span className="font-mono text-2xl font-bold text-primary">{selectedYear}</span>
            <span className="font-mono text-sm text-muted-foreground">2025</span>
          </div>
          <Slider
            value={[selectedYear]}
            onValueChange={(value) => setSelectedYear(value[0])}
            min={1970}
            max={2025}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
            <span>DISCO ERA</span>
            <span>HOUSE</span>
            <span>TECHNO</span>
            <span>TRANCE</span>
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
        <svg
          viewBox="0 0 100 60"
          className="absolute inset-0 w-full h-full opacity-20"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Simplified world continents */}
          <path
            d="M5,25 Q10,20 20,22 T35,24 Q40,20 45,25 T55,22 Q60,18 65,20 T75,25 Q80,22 85,28 T95,30"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            className="text-primary"
          />
          <path
            d="M45,28 Q50,32 55,35 T60,40 Q55,45 50,48"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            className="text-primary"
          />
          <path
            d="M70,35 Q75,38 80,42 T85,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.3"
            className="text-primary"
          />
        </svg>

        {/* City Markers */}
        {cities.map((city) => {
          const isAvailable = availableCities.includes(city)
          const isHovered = hoveredCity === city.id

          return (
            <button
              key={city.id}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group",
                isAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-30",
              )}
              style={{
                left: `${city.coordinates.x}%`,
                top: `${city.coordinates.y}%`,
              }}
              onMouseEnter={() => isAvailable && handleCityHover(city.id)}
              onMouseLeave={() => handleCityHover(null)}
              onClick={() => isAvailable && onCitySelect(city)}
              disabled={!isAvailable}
            >
              {/* Pulse ring */}
              {isAvailable && (
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
                  "w-4 h-4 rounded-full border-2 transition-all duration-300",
                  isHovered ? "scale-150" : "scale-100",
                )}
                style={{
                  backgroundColor: isAvailable ? city.color : "#333",
                  borderColor: isAvailable ? city.color : "#333",
                  boxShadow: isAvailable ? `0 0 20px ${city.color}` : "none",
                }}
              />

              {/* Hover Card */}
              {isHovered && isAvailable && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 w-64 p-4 rounded-lg border border-border bg-card/95 backdrop-blur-sm z-50"
                  style={{ boxShadow: `0 0 30px ${city.color}40` }}
                >
                  {/* Filter progress bar */}
                  <div
                    className="absolute top-0 left-0 h-1 rounded-t-lg transition-all duration-100"
                    style={{
                      width: `${hoverProgress}%`,
                      backgroundColor: city.color,
                    }}
                  />

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-mono font-bold text-lg" style={{ color: city.color }}>
                      {city.name}
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono">{city.year}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{city.genre}</p>
                  <p className="text-xs text-muted-foreground mb-3">{city.description}</p>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">
                      BPM: <span style={{ color: city.color }}>{city.bpm}</span>
                    </span>
                    <span className="px-2 py-1 rounded border" style={{ borderColor: city.color, color: city.color }}>
                      ENTER
                    </span>
                  </div>
                </div>
              )}
            </button>
          )
        })}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm">
          <h4 className="font-mono text-xs text-muted-foreground mb-2">ACTIVE SCENES</h4>
          <div className="space-y-1">
            {availableCities.slice(0, 5).map((city) => (
              <div key={city.id} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
                <span className="text-foreground">{city.name}</span>
                <span className="text-muted-foreground">{city.genre}</span>
              </div>
            ))}
            {availableCities.length > 5 && (
              <span className="text-xs text-muted-foreground">+{availableCities.length - 5} more</span>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 p-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm max-w-xs">
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">
            Slide through decades to unlock cities. Hover over a city to preview its sound. Click to enter the arena.
          </p>
        </div>
      </div>

      {/* Footer Status */}
      <footer className="relative z-20 px-8 py-4 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <span>
            CITIES: {availableCities.length}/{cities.length}
          </span>
          <span className="text-primary">|</span>
          <span>DECADE: {Math.floor(selectedYear / 10) * 10}s</span>
        </div>
        <div className="text-xs font-mono text-muted-foreground">AUDIO ENGINE: STRUDEL.CC</div>
      </footer>
    </div>
  )
}
