"use client"

import { useEffect, useState } from "react"

export type SpectrogramMode = "widget" | "crossfader"
const KEY = "chickenchess:spectrogram-mode:v1"
const EVENT = "chickenchess:spectrogram-mode"

export function useSpectrogramMode() {
  const [mode, setMode] = useState<SpectrogramMode>("crossfader")
  useEffect(() => {
    const read = () => {
      try {
        const stored = localStorage.getItem(KEY)
        setMode(stored === "widget" ? "widget" : "crossfader")
      } catch {
        /* Keep the session default when storage is unavailable. */
      }
    }
    read()
    window.addEventListener("storage", read)
    window.addEventListener(EVENT, read)
    return () => {
      window.removeEventListener("storage", read)
      window.removeEventListener(EVENT, read)
    }
  }, [])
  const update = (value: SpectrogramMode) => {
    setMode(value)
    try {
      localStorage.setItem(KEY, value)
      window.dispatchEvent(new window.Event(EVENT))
    } catch {
      /* The choice still works for this session. */
    }
  }
  return [mode, update] as const
}
