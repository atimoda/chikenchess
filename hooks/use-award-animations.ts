"use client"

import { useEffect, useState } from "react"

const KEY = "chickenchess:award-animations:v1"
const EVENT = "chickenchess:award-animations"

export function useAwardAnimations() {
  const [enabled, setEnabled] = useState<boolean>(true)
  useEffect(() => {
    const read = () => {
      try {
        const stored = localStorage.getItem(KEY)
        setEnabled(stored === null ? true : stored === "true")
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
  const update = (value: boolean) => {
    setEnabled(value)
    try {
      localStorage.setItem(KEY, String(value))
      window.dispatchEvent(new window.Event(EVENT))
    } catch {
      /* The choice still works for this session. */
    }
  }
  return [enabled, update] as const
}
