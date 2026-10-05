"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { WorldMap } from "@/components/world-map"
import { DusseldorfGame } from "@/components/modes/dusseldorf-game"
import { type CityData, getCityById } from "@/lib/cities-data"
import { OnlineProvider } from '@/components/online/online-provider'
import { OnlineGame } from '@/components/online/online-game'

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

  const matchId = searchParams.get('match')
  const handleMatch = (id: string) => router.push(`/?match=${encodeURIComponent(id)}`)
  if (matchId && /^[0-9a-f-]{36}$/i.test(matchId)) {
    return <OnlineGame matchId={matchId} onBack={handleBack} onMatch={handleMatch} />
  }

  if (selectedCity) {
    return <DusseldorfGame city={selectedCity} onBack={handleBack} />
  }

  return <WorldMap onCitySelect={handleCitySelect} onOnlineMatch={handleMatch} inviteCode={searchParams.get('room')} />
}

export default function Home() {
  return (
    <Suspense fallback={<div aria-hidden="true" className="min-h-dvh bg-black" />}>
      <OnlineProvider><GameContent /></OnlineProvider>
    </Suspense>
  )
}
