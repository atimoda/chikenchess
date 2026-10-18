"use client"

import { useEffect, useState } from "react"

export type ChancePosition = "board" | "footer"
const KEY = "chickenchess:chance-position:v1"
const EVENT = "chickenchess:chance-position"

export function useChancePosition() {
  const [position, setPosition] = useState<ChancePosition>("board")
  useEffect(() => {
    const read = () => {
      try {
        const stored = localStorage.getItem(KEY)
        setPosition(stored === "footer" ? "footer" : "board")
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
  const update = (value: ChancePosition) => {
    setPosition(value)
    try {
      localStorage.setItem(KEY, value)
      window.dispatchEvent(new window.Event(EVENT))
    } catch {
      /* The choice still works for this session. */
    }
  }
  return [position, update] as const
}
