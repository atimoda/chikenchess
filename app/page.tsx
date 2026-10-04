"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { WorldMap } from "@/components/world-map"
import { DusseldorfGame } from "@/components/modes/dusseldorf-game"
import { type CityData, getCityById } from "@/lib/cities-data"
import { OnlineProvider } from '@/components/online/online-provider'
import { OnlineGame } from '@/components/online/online-game'
import { LegalLinks } from '@/components/legal-links'

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
    <Suspense fallback={<main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
      <h1 className="text-3xl font-semibold">ChickenChess</h1>
      <p className="max-w-md text-sm leading-relaxed text-white/60">Play chess. Compose music. Explore musical cities, create your own kits, and play casual online matches.</p>
      <p role="status" className="text-xs text-white/45">Loading the game…</p>
      <LegalLinks newTab className="text-white/55" />
    </main>}>
      <OnlineProvider><GameContent /></OnlineProvider>
    </Suspense>
  )
}
