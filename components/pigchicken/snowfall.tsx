"use client"

// Neve caindo: one canvas the size of the screen, over the far scenery and behind the Pátio's things. It sits in the
// world element and undoes the camera and the zoom every frame, so it always covers the screen; the flakes drift a
// little against the camera's travel (the near ones more), so they feel among the mountains.
import { graphicsQuality, isLowGraphics } from "@/lib/quality"
import { useEffect, useRef } from "react"
import { liveCamera } from "@/lib/pigchicken/live-camera"
import { stageHeight, stageWidth } from "@/lib/stage-size"
import { flakeCount, type SnowfallParams } from "@/lib/pigchicken/snowfall"

type Flake = { x: number; y: number; z: number; ph: number }

export function Snowfall({ snow, color = "#ffffff" }: { snow: SnowfallParams; color?: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const params = useRef(snow)
  params.current = snow
  const tint = useRef(color)
  tint.current = color
  useEffect(() => {
    const box = boxRef.current, c = canvasRef.current, ctx = c?.getContext("2d")
    if (!box || !c || !ctx) return
    const still = (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false) || isLowGraphics(graphicsQuality())
    const flakes: Flake[] = []
    let raf = 0, last = performance.now(), camX = liveCamera.x
    const make = (W: number, H: number, anywhere: boolean): Flake => ({ x: Math.random() * W, y: anywhere ? Math.random() * H : -8, z: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 })
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      const z = liveCamera.zoom || 1, W = Math.max(1, stageWidth()), H = Math.max(1, stageHeight())
      box.style.transform = `translate3d(${liveCamera.x - (W / 2) * (1 - z) / z}px,${-liveCamera.y - (H / 2) * (1 - z) / z}px,0)`
      box.style.width = `${W / z}px`; box.style.height = `${H / z}px`
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
      const p = params.current, n = flakeCount(p.amount, W, H)
      while (flakes.length < n) flakes.push(make(W, H, true))
      if (flakes.length > n) flakes.length = n
      const fall = 60 * (p.speed / 100), wind = 70 * (p.wind / 100), size = 2.2 * (p.size / 100), pan = liveCamera.x - camX
      camX = liveCamera.x
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = tint.current
      for (const f of flakes) {
        if (!still) {
          f.y += fall * (0.5 + f.z) * dt
          f.x += (wind * (0.5 + f.z) + Math.sin(t / 900 + f.ph) * 12 * f.z) * dt - pan * 0.35 * f.z
        }
        if (f.y > H + 8) { Object.assign(f, make(W, H, false)) }
        f.x = ((f.x % (W + 16)) + W + 16) % (W + 16)
        ctx.globalAlpha = (p.opacity / 100) * (0.45 + f.z * 0.55)
        ctx.beginPath(); ctx.arc(f.x - 8, f.y, Math.max(0.4, size * f.z), 0, 6.283); ctx.fill()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={boxRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0" style={{ transformOrigin: "0 0" }}>
    <canvas ref={canvasRef} className="block h-full w-full" />
  </div>
}
