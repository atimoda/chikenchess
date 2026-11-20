"use client"

// The Vestiário's Perfil tab inside the Pátio: the globe's Profile tab (name, code, golden eggs, progress and the
// account's actions). Loaded only when the tab opens.
import { useEffect, useState } from "react"
import { ProfilePane } from "@/components/online/profile-pane"
import { useOnline } from "@/components/online/online-provider"
import { readLocalProfile } from "@/lib/online/client"
import type { PlayerProfile } from "@/lib/game-progression"

// onSignIn: runs before the login opens (the Pátio closes the Vestiário)
export function PatioProfile({ onSignIn }: { onSignIn: () => void }) {
  const { openLogin } = useOnline()
  // this browser's campaign profile (eggs, points, cities), read without writing it back
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  useEffect(() => { setProfile(readLocalProfile()) }, [])
  return <ProfilePane playerProfile={profile} onSignIn={() => { onSignIn(); openLogin() }} />
}
