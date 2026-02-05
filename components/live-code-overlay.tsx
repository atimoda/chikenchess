"use client"

import { useState } from "react"
import type { CityData } from "@/lib/cities-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, Terminal } from "lucide-react"
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

  const hasStarted = isPlaying // Using isPlaying as a proxy for game started/focused state
  const boxClass = `h-full border-border overflow-hidden flex flex-col transition-all duration-[3000ms] ${hasStarted ? "bg-transparent border-transparent" : "bg-black/90 border-border"}`

  return (
    <div className={boxClass} style={{ flex: 1 }}>
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live Music Code (Strudel)</span>
          <Badge className="ml-2 text-[9px] px-2 py-0.5 font-mono bg-primary/10 border-primary/40">
            {city.name}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="h-7 w-7 border-border bg-background/40 hover:bg-background/70"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>
      <div 
        className="p-4 font-mono text-xs leading-relaxed overflow-y-auto flex-1 scrollbar-hide"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      >
        <div className="space-y-1">
          <pre
            className="whitespace-pre-wrap break-all text-foreground/90"
            dangerouslySetInnerHTML={{ __html: highlightCode(pattern) }}
          />
        </div>
      </div>
    </div>
  )
}
