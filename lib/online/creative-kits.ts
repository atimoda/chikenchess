'use client'

import { isAdminUser } from '@/lib/admin/access'
import { getOnlineClient, onlineRpc } from './client'
import type { CreativeSession } from '@/lib/music/creative'

export interface CreativeAccount { userId: string; admin: boolean }
export interface RemoteKitEntry { name: string; updatedAt: string }

/** The signed-in (non-guest) account, or null for guests and offline builds. */
export async function creativeAccount(): Promise<CreativeAccount | null> {
  const client = getOnlineClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  const user = data.session?.user
  return user && !user.is_anonymous ? { userId: user.id, admin: isAdminUser(user) } : null
}

/** Calls back whenever the session changes, so the studio follows sign-in/out in another tab. */
export function watchCreativeAccount(onChange: (account: CreativeAccount | null) => void) {
  const client = getOnlineClient()
  if (!client) { onChange(null); return () => {} }
  void creativeAccount().then(onChange)
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    const user = session?.user
    onChange(user && !user.is_anonymous ? { userId: user.id, admin: isAdminUser(user) } : null)
  })
  return () => data.subscription.unsubscribe()
}

export async function listRemoteKits(): Promise<RemoteKitEntry[]> {
  const rows = await onlineRpc<{ name: string; updated_at: string }[]>('creative_kits')
  return rows.map(row => ({ name: row.name, updatedAt: row.updated_at }))
}

export async function loadRemoteKit(name: string): Promise<unknown> {
  const kit = await onlineRpc<unknown>('creative_kit', { p_name: name })
  if (!kit) throw new Error(`Kit “${name}” is no longer saved in your account.`)
  return kit
}

export async function saveRemoteKit(kit: CreativeSession): Promise<RemoteKitEntry> {
  const saved = await onlineRpc<{ name: string; updated_at: string }>('creative_kit_save', { p_name: kit.name, p_kit: kit })
  return { name: saved.name, updatedAt: saved.updated_at }
}

export function remoteKitError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (message.includes('KIT_LIMIT')) return 'Your account already has 30 kits. Save over an existing name.'
  if (message.includes('KIT_TOO_LARGE')) return 'This kit is too large to save in your account. Use Export.'
  return message || 'Could not reach your account.'
}
