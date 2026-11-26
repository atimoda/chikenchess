"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { subscribeTuning, tuningVersion } from "@/lib/pigchicken/patio-tuning"
import { gameDefaultsVersion, onGameDefaults, refreshGameDefaults } from "@/lib/game-defaults"
import { refreshChickenConfig } from "@/lib/chicken/config"

// While a screen that reads the defaults is open and visible: a check every 5 minutes (one for the whole page,
// however many screens use it). Unchanged parts come back without their value, so a check costs well under 1 KB.
const POLL_MS = 5 * 60_000
let polling = 0, pollTimer: ReturnType<typeof setInterval> | null = null
function startPoll() {
  if (polling++ === 0) pollTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return
    void refreshGameDefaults(true); void refreshChickenConfig(true)
  }, POLL_MS)
  return () => { if (--polling === 0 && pollTimer) { clearInterval(pollTimer); pollTimer = null } }
}

/** Reads the game's saved defaults (lib/game-defaults.ts) on mount and re-renders when a new one arrives; the number
 *  goes up each time, for effects and memos that read the defaults. */
export function useGameDefaults() {
  const [version, setVersion] = useState(gameDefaultsVersion)
  useEffect(() => {
    const off = onGameDefaults(() => setVersion(gameDefaultsVersion()))
    void refreshGameDefaults()
    // back to the tab after a while: there may be a newer one
    const onFocus = () => { if (document.visibilityState === "visible") void refreshGameDefaults() }
    document.addEventListener("visibilitychange", onFocus)
    const stopPoll = startPoll()
    return () => { off(); stopPoll(); document.removeEventListener("visibilitychange", onFocus) }
  }, [])
  return version
}

/** Re-renders when the open Pátio's personalized values or this browser's change (lib/pigchicken/patio-tuning.ts). */
export function useTuningVersion() {
  return useSyncExternalStore(subscribeTuning, tuningVersion, tuningVersion)
}
