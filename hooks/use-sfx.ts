"use client"

import { useCallback, useRef } from "react"
import { getSfxEngine, type SfxEngine } from "@/lib/sfx-engine"

/** Interface cues for a match; the generative loops belong to useMusic. */
export function useSfx() {
  const engineRef = useRef<SfxEngine | null>(null)
  if (!engineRef.current && typeof window !== "undefined") engineRef.current = getSfxEngine()

  const resumeAudio = useCallback(async () => { await engineRef.current?.resume() }, [])
  const playCheckmate = useCallback(() => { engineRef.current?.playCheckmate() }, [])
  const playVictoryFanfare = useCallback(() => { engineRef.current?.playVictoryFanfare() }, [])
  const playDrawKalimba = useCallback(() => { engineRef.current?.playDrawKalimba() }, [])
  const playSquareSample = useCallback((square: string) => { void engineRef.current?.playSquareSample(square) }, [])
  const playDrum = useCallback((sample: string, gain?: number, pitch?: number, openHatDecay?: number) => {
    engineRef.current?.playDrum(sample, gain, pitch, openHatDecay)
  }, [])

  return { engineRef, resumeAudio, playCheckmate, playVictoryFanfare, playDrawKalimba, playSquareSample, playDrum }
}
