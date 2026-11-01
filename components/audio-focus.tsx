"use client"

// Mounted once in the root layout: sounds stop while the player is away from the tab (lib/audio-focus.ts).
import { installAudioFocus } from "@/lib/audio-focus"

// runs at module load in the browser, before the screens create their audio contexts
installAudioFocus()

export function AudioFocus() {
  return null
}
