"use client"

import { useState } from "react"
import { WorldMap } from "@/components/world-map"
import { ChessGame } from "@/components/chess-game"
import type { CityData } from "@/lib/cities-data"

export default function Home() {
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null)

  if (selectedCity) {
    return <ChessGame city={selectedCity} onBack={() => setSelectedCity(null)} />
  }

  return <WorldMap onCitySelect={setSelectedCity} />
}
