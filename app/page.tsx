"use client"

import { Suspense, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { WorldMap } from "@/components/world-map"
import { type CityData, getCityById } from "@/lib/cities-data"
import { OnlineProvider } from '@/components/online/online-provider'

// Matches carry the board, Stockfish and the music engine; the map loads them
// only when a player enters one.
const matchFallback = () => <div aria-hidden="true" className="min-h-dvh bg-black" />
const DusseldorfGame = dynamic(() => import("@/components/modes/dusseldorf-game").then(module => module.DusseldorfGame), { ssr: false, loading: matchFallback })
const OnlineGame = dynamic(() => import('@/components/online/online-game').then(module => module.OnlineGame), { ssr: false, loading: matchFallback })

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
