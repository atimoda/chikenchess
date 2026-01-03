"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { Chess } from "chess.js"
import type { CityData } from "@/lib/cities-data"
import { getAudioEngine, type AudioEngine } from "@/lib/audio-engine"
import { parsePatternForAudio } from "@/lib/strudel-engine"

export function useAudio(game: Chess, city: CityData, isPlaying: boolean, activeSquares: Set<string>) {
  const engineRef = useRef<AudioEngine | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize engine on mount
  useEffect(() => {
    engineRef.current = getAudioEngine()
    setIsInitialized(true)

    return () => {
      engineRef.current?.stop()
      engineRef.current?.stopAmbience()
    }
  }, [])

  // Update pattern when game OR activeSquares changes
  useEffect(() => {
    if (!engineRef.current || !isInitialized) return

    const pattern = parsePatternForAudio(game, city, activeSquares)
    engineRef.current.setPattern(pattern)
  }, [game, city, isInitialized, activeSquares])

  // Control playback (Pattern + Ambience)
  useEffect(() => {
    if (!engineRef.current || !isInitialized) return

    if (isPlaying) {
      engineRef.current.resume()
      engineRef.current.start()
      // Start ambience only if playing AND city.id exists
      if (city.id) {
        engineRef.current.startAmbience(city.scale, city.id)
      }
    } else {
      engineRef.current.stop()
      // Stop ambience if pause/mute
      engineRef.current.stopAmbience()
    }
  }, [isPlaying, isInitialized, city.scale, city.id])

  const togglePlayback = useCallback(async () => {
    if (!engineRef.current) return

    await engineRef.current.resume()
  }, [])

  return { togglePlayback, isInitialized }
}
