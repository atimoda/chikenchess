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

/** True at "Baixíssima": the Pátio leaves out the scenery that is only decoration (docs/mechanics/performance.md). */
export function useBareScenery() {
  // false on the first render (as on the server), then the option
  const [bare, setBare] = useState(false)
  useEffect(() => {
    const update = () => setBare(graphicsQuality() === "lowest")
    update()
    return subscribeQuality(update)
  }, [])
  return bare
}
