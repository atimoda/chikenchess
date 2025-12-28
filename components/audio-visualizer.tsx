"use client"

import { useEffect, useRef, useCallback } from "react"

interface AudioVisualizerProps {
  isPlaying: boolean
  color: string
  pattern: string
}

export function AudioVisualizer({ isPlaying, color, pattern }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const phaseRef = useRef(0)

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight

    // Clear with fade effect for trailing
    ctx.fillStyle = "rgba(10, 10, 20, 0.15)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scale = window.devicePixelRatio || 1

    if (isPlaying) {
      const bars = 64
      const barWidth = width / bars

      for (let i = 0; i < bars; i++) {
        // Generate dynamic heights based on pattern content and phase
        const patternInfluence = pattern.length > 0 ? (pattern.charCodeAt(i % pattern.length) % 50) / 50 : 0.5

        // Multiple sine waves for more organic movement
        const wave1 = Math.sin(phaseRef.current * 2 + i * 0.2) * 0.3
        const wave2 = Math.sin(phaseRef.current * 3 + i * 0.1) * 0.2
        const wave3 = Math.sin(phaseRef.current + i * 0.4) * 0.15

        const noise = (wave1 + wave2 + wave3 + 0.65) * patternInfluence
        const barHeight = Math.max(4, noise * height * 0.7)

        // Create gradient
        const gradient = ctx.createLinearGradient(0, height * scale, 0, (height - barHeight) * scale)
        gradient.addColorStop(0, color)
        gradient.addColorStop(0.4, `${color}cc`)
        gradient.addColorStop(0.7, `${color}66`)
        gradient.addColorStop(1, `${color}22`)

        ctx.fillStyle = gradient
        ctx.fillRect(
          i * barWidth * scale + scale,
          (height - barHeight) * scale,
          (barWidth - 2) * scale,
          barHeight * scale,
        )

        // Top glow dot
        ctx.beginPath()
        ctx.arc((i * barWidth + barWidth / 2) * scale, (height - barHeight) * scale, 2 * scale, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        // Reflection
        const reflectionGradient = ctx.createLinearGradient(0, height * scale, 0, (height + barHeight * 0.3) * scale)
        reflectionGradient.addColorStop(0, `${color}22`)
        reflectionGradient.addColorStop(1, "transparent")
        ctx.fillStyle = reflectionGradient
        ctx.fillRect(i * barWidth * scale + scale, height * scale, (barWidth - 2) * scale, barHeight * 0.3 * scale)
      }

      // Waveform overlay
      ctx.beginPath()
      ctx.strokeStyle = `${color}44`
      ctx.lineWidth = 2 * scale
      for (let x = 0; x < width; x += 2) {
        const y =
          height / 2 + Math.sin(phaseRef.current * 2 + x * 0.03) * 15 + Math.sin(phaseRef.current * 4 + x * 0.01) * 10
        if (x === 0) {
          ctx.moveTo(x * scale, y * scale)
        } else {
          ctx.lineTo(x * scale, y * scale)
        }
      }
      ctx.stroke()

      // Center frequency indicator
      const centerY = height / 2
      const freqHeight = Math.sin(phaseRef.current * 5) * 20 + 30
      ctx.beginPath()
      ctx.moveTo((width / 2) * scale, (centerY - freqHeight) * scale)
      ctx.lineTo((width / 2) * scale, (centerY + freqHeight) * scale)
      ctx.strokeStyle = color
      ctx.lineWidth = 3 * scale
      ctx.stroke()

      phaseRef.current += 0.08
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

      // Pulsing center dot
      const pulseSize = 4 + Math.sin(Date.now() / 500) * 2
      ctx.beginPath()
      ctx.arc((width / 2) * scale, (height / 2) * scale, pulseSize * scale, 0, Math.PI * 2)
      ctx.fillStyle = `${color}66`
      ctx.fill()
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [isPlaying, color, pattern])

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
