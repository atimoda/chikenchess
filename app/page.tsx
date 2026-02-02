"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { WorldMap } from "@/components/world-map"
import { DusseldorfGame } from "@/components/modes/dusseldorf-game"
import { type CityData, getCityById } from "@/lib/cities-data"

function GameContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null)

  useEffect(() => {
    const cityId = searchParams.get("city")
    if (cityId) {
      const city = getCityById(cityId)
      if (city) {
        setSelectedCity(city)
      } else {
        router.replace("/")
        setSelectedCity(null)
      }
    } else {
      setSelectedCity(null)
    }
  }, [searchParams, router])

  const handleCitySelect = (city: CityData) => {
    setSelectedCity(city)
    router.push(`?city=${city.id}`)
  }

  const handleBack = () => {
    setSelectedCity(null)
    router.push("/")
  }

  if (selectedCity) {
    return <DusseldorfGame city={selectedCity} onBack={handleBack} />
  }

  return <WorldMap onCitySelect={handleCitySelect} />
}

export default function Home() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-black" />}>
      <GameContent />
    </Suspense>
  )
}
