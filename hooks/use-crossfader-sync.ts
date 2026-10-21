"use client"

import { useEffect, useState } from "react"

const KEY = "chickenchess:crossfader-sync:v1"
const EVENT = "chickenchess:crossfader-sync"

export function useCrossfaderSync() {
  const [sync, setSync] = useState<boolean>(true)
  useEffect(() => {
    const read = () => {
      try {
        const stored = localStorage.getItem(KEY)
        setSync(stored === null ? true : stored === "true")
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
    setSync(value)
    try {
      localStorage.setItem(KEY, String(value))
      window.dispatchEvent(new window.Event(EVENT))
    } catch {
      /* The choice still works for this session. */
    }
  }
  return [sync, update] as const
}
