"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { Chess } from "chess.js"
import type { CityData } from "@/lib/cities-data"
import { getAudioEngine, type AudioEngine } from "@/lib/audio-engine"
import { parsePatternForAudio } from "@/lib/strudel-engine"

export function useAudio(game: Chess, city: CityData, isPlaying: boolean) {
  const engineRef = useRef<AudioEngine | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize engine on mount
  useEffect(() => {
    engineRef.current = getAudioEngine()
    setIsInitialized(true)

    return () => {
      engineRef.current?.stop()
    }
  }, [])

  // Update pattern when game changes
  useEffect(() => {
    if (!engineRef.current || !isInitialized) return

    const pattern = parsePatternForAudio(game, city)
    engineRef.current.setPattern(pattern)
  }, [game, city, isInitialized])

  // Control playback
  useEffect(() => {
    if (!engineRef.current || !isInitialized) return

    if (isPlaying) {
      engineRef.current.start()
    } else {
      engineRef.current.stop()
    }
  }, [isPlaying, isInitialized])

  const togglePlayback = useCallback(async () => {
    if (!engineRef.current) return

    await engineRef.current.resume()
  }, [])

  return { togglePlayback, isInitialized }
}
