"use client"

import type { CityData } from "@/lib/cities-data"
import { ChessGame } from "@/components/chess-game"

interface DusseldorfGameProps {
  city: CityData
  onBack: () => void
}

export function DusseldorfGame({ city, onBack }: DusseldorfGameProps) {
  return <ChessGame city={city} onBack={onBack} panelsFollowPlayerTurn={false} />
}
