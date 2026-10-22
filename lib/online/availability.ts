'use client'

import { onlineConfigured } from './client'

/* global process, fetch */
export type OnlineAvailability = 'checking' | 'available' | 'unavailable'

const RECHECK_AFTER_MS = 5 * 60_000
let state: OnlineAvailability = onlineConfigured ? 'checking' : 'unavailable'
let checkedAt = 0
let request: Promise<OnlineAvailability> | null = null
const listeners = new Set<(next: OnlineAvailability) => void>()

function publish(next: OnlineAvailability) {
  state = next
  checkedAt = Date.now()
  for (const listener of listeners) listener(next)
}

/**
 * One tiny anonymous read of the public directory. A restricted project
 * (exceeded quota, paused) or an unreachable server answers with an error,
 * so the globe can hide online entry points and keep the campaign in focus.
 */
async function probe(): Promise<OnlineAvailability> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!onlineConfigured || !url || !key) return 'unavailable'
  try {
    const response = await fetch(`${url}/rest/v1/online_public_rooms?select=room_id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return response.ok ? 'available' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

export function checkOnlineAvailability(force = false): Promise<OnlineAvailability> {
  if (typeof window === 'undefined') return Promise.resolve(state)
  if (request) return request
  if (!force && state !== 'checking' && Date.now() - checkedAt < RECHECK_AFTER_MS) return Promise.resolve(state)
  request = probe().then((next) => { publish(next); return next }).finally(() => { request = null })
  return request
}

export function getOnlineAvailability(): OnlineAvailability { return state }

export function subscribeOnlineAvailability(listener: (next: OnlineAvailability) => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
