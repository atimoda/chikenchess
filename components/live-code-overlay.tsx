"use client"

import type { CityData } from "@/lib/cities-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LiveCodeOverlayProps {
  pattern: string
  city: CityData
  isPlaying: boolean
}

export function LiveCodeOverlay({ pattern, city, isPlaying }: LiveCodeOverlayProps) {
  // Syntax highlighting for Strudel patterns
  const highlightCode = (code: string) => {
    return code
      .replace(
        /(s|note|sound|n|gain|pan|speed|cutoff|resonance|delay|room|struct|stack)\(/g,
        '<span class="text-primary">$1</span>(',
      )
      .replace(/(".*?")/g, '<span class="text-accent">$1</span>')
      .replace(/(\d+\.?\d*)/g, '<span class="text-chart-4">$1</span>')
      .replace(/(\.\w+)/g, '<span class="text-chart-2">$1</span>')
  }

  return (
    <Card className="h-full border-border bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isPlaying ? "animate-pulse" : ""}`}
              style={{ backgroundColor: isPlaying ? city.color : "#666" }}
            />
            LIVE CODE
          </CardTitle>
          <Badge variant="outline" style={{ borderColor: city.color, color: city.color }}>
            STRUDEL
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="p-4 font-mono text-xs leading-relaxed overflow-auto max-h-96"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        >
          <pre
            className="whitespace-pre-wrap break-all text-foreground/90"
            dangerouslySetInnerHTML={{ __html: highlightCode(pattern) }}
          />
        </div>

        {/* Pattern Info */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">GENRE</span>
              <p className="text-foreground">{city.genre}</p>
            </div>
            <div>
              <span className="text-muted-foreground">BPM</span>
              <p style={{ color: city.color }}>{city.bpm}</p>
            </div>
          </div>

          <div>
            <span className="text-xs text-muted-foreground font-mono">SCALE</span>
            <div className="flex gap-1 mt-1">
              {city.scale.map((note, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{
                    backgroundColor: `${city.color}20`,
                    color: city.color,
                    border: `1px solid ${city.color}40`,
                  }}
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground italic">{city.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
