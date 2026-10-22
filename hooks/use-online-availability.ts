'use client'

import { useEffect, useState } from 'react'
import { checkOnlineAvailability, getOnlineAvailability, subscribeOnlineAvailability, type OnlineAvailability } from '@/lib/online/availability'

/** Checks once on load; an unavailable result is retried when the tab returns or the network comes back. */
export function useOnlineAvailability(): OnlineAvailability {
  const [availability, setAvailability] = useState<OnlineAvailability>(getOnlineAvailability)
  useEffect(() => {
    const unsubscribe = subscribeOnlineAvailability(setAvailability)
    void checkOnlineAvailability()
    const recheck = () => { if (getOnlineAvailability() === 'unavailable' && document.visibilityState === 'visible') void checkOnlineAvailability() }
    const reconnect = () => void checkOnlineAvailability(true)
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('online', reconnect)
    return () => { unsubscribe(); document.removeEventListener('visibilitychange', recheck); window.removeEventListener('online', reconnect) }
  }, [])
  return availability
}
