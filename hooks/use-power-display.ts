"use client"

import { useEffect, useState } from "react"

export type PowerDisplay = "cards" | "buttons"
const KEY = "chickenchess:power-display:v1"
const EVENT = "chickenchess:power-display"

export function usePowerDisplay() {
  const [display, setDisplay] = useState<PowerDisplay>("cards")
  useEffect(() => {
    const read = () => {
      try { setDisplay(localStorage.getItem(KEY) === "buttons" ? "buttons" : "cards") } catch { /* Keep the session default when storage is unavailable. */ }
    }
    read()
    window.addEventListener("storage", read)
    window.addEventListener(EVENT, read)
    return () => { window.removeEventListener("storage", read); window.removeEventListener(EVENT, read) }
  }, [])
  const update = (value: PowerDisplay) => {
    setDisplay(value)
    try { localStorage.setItem(KEY, value); window.dispatchEvent(new window.Event(EVENT)) } catch { /* The choice still works for this session. */ }
  }
  return [display, update] as const
}
