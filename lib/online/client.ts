'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getPlayerProfile, normalizePlayerProfile, type PlayerProfile } from '@/lib/game-progression'
import type { OnlineProfile } from './types'

/* global process */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const onlineConfigured = Boolean(supabaseUrl && /^https?:\/\//.test(supabaseUrl) && supabaseKey)
export const ONLINE_CONFIGURATION_MESSAGE = 'O modo online ainda não foi configurado. A campanha e o Criativo continuam disponíveis.'
let client: SupabaseClient | null = null

/** A browser-only singleton: no server credentials or extra SSR auth runtime. */
export function getOnlineClient(): SupabaseClient | null {
  if (!onlineConfigured || typeof window === 'undefined') return null
  if (!client) {
    client = createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'chickenchess:online:auth',
      },
    })
  }
  return client
}

export function requireOnlineClient(): SupabaseClient {
  const online = getOnlineClient()
  if (!online) throw new Error(ONLINE_CONFIGURATION_MESSAGE)
  return online
}

export async function onlineRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireOnlineClient().rpc(name, args)
  if (error) throw error
  return data as T
}

export function onlineErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error ? (error as { code?: string }).code : ''
  if (code === 'otp_expired') return 'Código inválido ou expirado. Confira o código ou peça um novo.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Aguarde um pouco antes de pedir outro código.'
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
  return 'Não foi possível completar a ação. Tente novamente.'
}

const BACKUP_KEY = 'chickenchess:online:profile-backups:v1'
export interface LocalProfileBackup {
  userId: string | null
  savedAt: number
  profile: PlayerProfile
}

/** Profile timestamps carry CAS versions; property order is not a mutation. */
export function samePlayerProfileContent(left: PlayerProfile, right: PlayerProfile): boolean {
  const { updatedAt: _leftTimestamp, ...leftContent } = normalizePlayerProfile(left)
  const { updatedAt: _rightTimestamp, ...rightContent } = normalizePlayerProfile(right)
  return JSON.stringify(leftContent) === JSON.stringify(rightContent)
}

export function readLocalProfile(): PlayerProfile {
  // getPlayerProfile also writes its normalized save. Read existing snapshots
  // directly so a cloud refresh cannot look like a new campaign mutation.
  try {
    const cookie = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)chikenchess_player=([^;]*)/) : null
    if (cookie) return normalizePlayerProfile(JSON.parse(decodeURIComponent(cookie[1])))
  } catch { /* Try the mirrored local save if the cookie is malformed. */ }
  try {
    const stored = localStorage.getItem('chikenchess_player')
    if (stored) return normalizePlayerProfile(JSON.parse(stored))
  } catch { /* The one-time legacy migration can still use the original reader. */ }
  try { return getPlayerProfile() } catch { return normalizePlayerProfile(null) }
}

export function readProfileBackups(): LocalProfileBackup[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((entry): entry is LocalProfileBackup => Boolean(
      entry && typeof entry === 'object' && 'profile' in entry && 'savedAt' in entry,
    )) : []
  } catch { return [] }
}

/** Keep the campaign save intact and retain a separately recoverable guest copy. */
export function preserveProfileBackup(userId: string | null, profile = readLocalProfile()): LocalProfileBackup {
  const backup = { userId, savedAt: Date.now(), profile }
  try {
    const backups = readProfileBackups()
    const last = backups[backups.length - 1]
    if (last?.userId !== userId || !samePlayerProfileContent(last.profile, profile)) {
      localStorage.setItem(BACKUP_KEY, JSON.stringify([...backups, backup]))
    }
  } catch {
    // The campaign cookie and the in-memory copy survive blocked browser storage.
  }
  return backup
}

const LOCAL_OWNER_KEY = 'chickenchess:online:local-owner:v1'
const GUEST_PROFILE_KEY = 'chickenchess:online:guest-profile:v1'
const cloudCacheKey = (userId: string) => `chickenchess:online:cloud-profile:v1:${userId}`
const localCacheKey = (userId: string) => `chickenchess:online:local-profile:v1:${userId}`

export function readLocalProfileOwner(): string | null {
  try { return localStorage.getItem(LOCAL_OWNER_KEY) || null } catch { return null }
}

export function setLocalProfileOwner(userId: string | null) {
  try {
    if (userId) localStorage.setItem(LOCAL_OWNER_KEY, userId)
    else localStorage.removeItem(LOCAL_OWNER_KEY)
  } catch { /* Identity remains isolated in the provider's memory. */ }
}

export function cacheLocalProfile(userId: string | null, profile: PlayerProfile) {
  try { localStorage.setItem(userId ? localCacheKey(userId) : GUEST_PROFILE_KEY, JSON.stringify(profile)) } catch { /* Cookie and memory remain available. */ }
}

export function readCachedLocalProfile(userId: string | null): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(userId ? localCacheKey(userId) : GUEST_PROFILE_KEY)
    return raw ? normalizePlayerProfile(JSON.parse(raw)) : null
  } catch { return null }
}

export function cacheOnlineProfile(profile: OnlineProfile) {
  try { localStorage.setItem(cloudCacheKey(profile.id), JSON.stringify(profile)) } catch { /* Never claim an unconfirmed profile was saved. */ }
}

export function readCachedOnlineProfile(userId: string): OnlineProfile | null {
  try {
    const parsed: OnlineProfile = JSON.parse(localStorage.getItem(cloudCacheKey(userId)) || 'null')
    return parsed?.id === userId ? parsed : null
  } catch { return null }
}
