"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { subscribeTuning, tuningVersion } from "@/lib/pigchicken/patio-tuning"
import { gameDefaultsVersion, onGameDefaults, refreshGameDefaults } from "@/lib/game-defaults"

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
    return () => { off(); document.removeEventListener("visibilitychange", onFocus) }
  }, [])
  return version
}

/** Re-renders when the open Pátio's personalized values or this browser's change (lib/pigchicken/patio-tuning.ts). */
export function useTuningVersion() {
  return useSyncExternalStore(subscribeTuning, tuningVersion, tuningVersion)
}
