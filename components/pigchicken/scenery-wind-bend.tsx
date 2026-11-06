"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { watchSceneryWind } from "@/lib/pigchicken/scenery-wind"

export function SceneryWindBend({ x, origin, response = 1, children }: {
  x?: number; origin?: string; response?: number; children: ReactNode
}) {
  const ref = useRef<SVGGElement>(null)
  useEffect(() => {
    const group = ref.current
    if (!group || x === undefined) return
    let previous: number | undefined
    return watchSceneryWind(x, strength => {
      if (strength === previous) return
      previous = strength
      group.style.setProperty("--scenery-gust", `${-strength * response}deg`)
    })
  }, [x, response])
  if (x === undefined) return <>{children}</>
  return <g ref={ref} className="scenery-wind-bend" style={origin ? { transformBox: "view-box", transformOrigin: origin } : undefined}>
    {children}
  </g>
}

export function SceneryWindStyles() {
  return <style>{`
    .scenery-wind-bend { transform-box: fill-box; transform-origin: 50% 100%; transform: skewX(var(--scenery-gust, 0deg)); transition: transform .45s ease-in-out; }
    @media (prefers-reduced-motion: reduce) { .scenery-wind-bend { transform: none !important; transition: none; } }
  `}</style>
}
