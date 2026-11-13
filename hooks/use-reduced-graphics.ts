"use client"

import { useEffect, useState } from "react"
import { graphicsQuality, subscribeQuality } from "@/lib/quality"

/** True while "Qualidade e efeitos gráficos" is below Alta; follows the option while the screen is open. */
export function useReducedGraphics() {
  const [reduced, setReduced] = useState(() => graphicsQuality() !== "high")
  useEffect(() => {
    const update = () => setReduced(graphicsQuality() !== "high")
    update()
    return subscribeQuality(update)
  }, [])
  return reduced
}
