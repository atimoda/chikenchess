"use client"

import { useState } from "react"
import type { CityData } from "@/lib/cities-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface LiveCodeOverlayProps {
  pattern: string
  city: CityData
  isPlaying: boolean
}

export function LiveCodeOverlay({ pattern, city, isPlaying }: LiveCodeOverlayProps) {
  const [copied, setCopied] = useState(false)

  // Syntax highlighting for Strudel patterns
  const highlightCode = (code: string) => {
    return code
      .replace(
        /\b(s|note|sound|n|gain|pan|speed|cutoff|resonance|decay|distort|delay|room|struct|stack|setcps)\b(?=\()/g,
        '<span class="text-primary">$1</span>',
      ) // Extended keywords, added setcps, strict word boundary and lookahead for (
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

  return (
    <Card className="h-full border-border bg-card/80 backdrop-blur-sm overflow-hidden flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isPlaying ? "animate-pulse" : ""}`}
              style={{ backgroundColor: isPlaying ? city.color : "#666" }}
            />
            LIVE CODE
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Badge variant="outline" style={{ borderColor: city.color, color: city.color }}>
              STRUDEL
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
        <div
          className="p-4 font-mono text-xs leading-relaxed overflow-auto flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        >
          <pre
            className="whitespace-pre-wrap break-all text-foreground/90"
            dangerouslySetInnerHTML={{ __html: highlightCode(pattern) }}
          />
        </div>

        {/* Pattern Info */}
        <div className="p-4 border-t border-border space-y-3 shrink-0">
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
            <div className="flex gap-1 mt-1 flex-wrap">
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
