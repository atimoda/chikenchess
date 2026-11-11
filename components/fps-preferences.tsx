"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import {
  cancelGameFrame, GAME_FPS_LIMIT, getFramePreferences, getServerFramePreferences,
  requestGameFrame, setFramePreference, subscribeFramePreferences,
} from "@/lib/game-frame"

export const useFramePreferences = () => useSyncExternalStore(subscribeFramePreferences, getFramePreferences, getServerFramePreferences)

export function FpsPreferences() {
  const prefs = useFramePreferences()
  return <div className="grid gap-2 border-t border-border/40 px-2 py-2 text-sm">
    <label className="flex cursor-pointer items-center justify-between gap-5">
      Contador de FPS
      <input type="checkbox" className="size-4 accent-primary" checked={prefs.counter} onChange={e => setFramePreference("counter", e.target.checked)} />
    </label>
    <label className="flex cursor-pointer items-center justify-between gap-5">
      Limitar a {GAME_FPS_LIMIT} FPS
      <input type="checkbox" className="size-4 accent-primary" checked={prefs.limit} onChange={e => setFramePreference("limit", e.target.checked)} />
    </label>
  </div>
}

export function FpsCounter() {
  const { counter } = useFramePreferences()
  const output = useRef<HTMLSpanElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const node = output.current
    if (!node) return
    let start: number | undefined
    let frames = 0
    const reset = () => { start = undefined; frames = 0; node.textContent = "— FPS" }
    const sample = (now: number) => {
      if (start === undefined) start = now
      else {
        frames++
        const elapsed = now - start
        if (elapsed >= 500) {
          node.textContent = `${Math.round(frames * 1000 / elapsed)} FPS`
          start = now
          frames = 0
        }
      }
      frame = requestGameFrame(sample)
    }
    let frame = requestGameFrame(sample)
    document.addEventListener("visibilitychange", reset)
    return () => {
      cancelGameFrame(frame)
      document.removeEventListener("visibilitychange", reset)
    }
  }, [counter, mounted])
  return counter && mounted ? createPortal(<span ref={output} data-fps-counter aria-hidden="true"
    className="pointer-events-none fixed bottom-[max(0.3rem,env(safe-area-inset-bottom))] left-[max(0.5rem,env(safe-area-inset-left))] z-[200] select-none rounded-sm bg-black/35 px-1.5 py-0.5 font-mono text-[10px] leading-none text-white/65 tabular-nums">
    — FPS
  </span>, document.body) : null
}
