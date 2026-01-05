"use client"

import { useEffect, useRef, useCallback } from "react"

interface AudioVisualizerProps {
  isPlaying: boolean
  color: string
  pattern: string
}

import { getAudioEngine } from "@/lib/audio-engine"

interface AudioVisualizerProps {
  isPlaying: boolean
  color: string
  pattern: string
}

export function AudioVisualizer({ isPlaying, color, pattern }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  // dataArray reused to avoid GC
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(128)) // Half of fftSize (256)

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight

    // Clear with fade effect for trailing
    ctx.fillStyle = "rgba(10, 10, 20, 0.2)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scale = window.devicePixelRatio || 1

    if (isPlaying) {
      const audioEngine = getAudioEngine()
      audioEngine.getFrequencyData(dataArrayRef.current)

      const bars = 64
      const barWidth = width / bars

      // Draw bars
      for (let i = 0; i < bars; i++) {
        // Map frequency data to bar height
        // We use the lower part of the frequency spectrum mostly, as it has more energy usually
        const dataIndex = Math.floor(i * (dataArrayRef.current.length / bars))
        const value = dataArrayRef.current[dataIndex] || 0

        const percent = value / 255
        const barHeight = Math.max(4, percent * height * 0.8)

        // Create gradient
        const gradient = ctx.createLinearGradient(0, height * scale, 0, (height - barHeight) * scale)
        gradient.addColorStop(0, color)
        gradient.addColorStop(0.5, `${color}cc`)
        gradient.addColorStop(1, `${color}44`)

        ctx.fillStyle = gradient
        ctx.fillRect(
          i * barWidth * scale + scale,
          (height - barHeight) * scale,
          (barWidth - 2) * scale,
          barHeight * scale,
        )

        // Top glow dot (only if there is sound)
        if (value > 10) {
          ctx.beginPath()
          ctx.arc((i * barWidth + barWidth / 2) * scale, (height - barHeight) * scale, 1.5 * scale, 0, Math.PI * 2)
          ctx.fillStyle = "#ffffff"
          ctx.fill()
        }
      }

    } else {
      // Static visualization when paused
      ctx.strokeStyle = `${color}33`
      ctx.lineWidth = scale
      ctx.setLineDash([5 * scale, 5 * scale])
      ctx.beginPath()
      ctx.moveTo(0, (height / 2) * scale)
      ctx.lineTo(width * scale, (height / 2) * scale)
      ctx.stroke()
      ctx.setLineDash([])
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [isPlaying, color])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const scale = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * scale
      canvas.height = canvas.offsetHeight * scale
    }

    resize()
    window.addEventListener("resize", resize)

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  return (
    <div className="relative h-28 rounded-lg overflow-hidden border border-border bg-card/30 backdrop-blur-sm">
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />

      {/* Overlay info */}
      <div className="absolute top-2 left-3 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isPlaying ? "animate-pulse" : ""}`}
          style={{ backgroundColor: isPlaying ? color : "#666" }}
        />
        <span className="text-xs font-mono text-muted-foreground">{isPlaying ? "LIVE" : "PAUSED"}</span>
      </div>

      <div className="absolute top-2 right-3 text-xs font-mono text-muted-foreground">SPECTROGRAM</div>

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20">
          <span className="text-sm font-mono text-muted-foreground px-4 py-2 rounded-full border border-border bg-card/80">
            Click Play to start audio
          </span>
        </div>
      )}
    </div>
  )
}
