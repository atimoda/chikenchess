// Central configuration of the player chicken: movement, animation and sound params plus the look.
// Every screen that draws the chicken reads it from here. The saved version lives in Supabase
// (public.chicken_config, written only by the admin from the Pátio da Galinha) and is cached in this
// browser so the chicken starts with it right away; without it the defaults in params.ts apply.
// The Pátio sets a preview (its unsaved draft) that the chickens on screen follow until it closes.
import { LOOK_ART, type ChickenLook, type ChickenSlot } from './look-art'
import { CHICKEN_CLUCKS, CHICKEN_PARAMS, type ChickenParams } from './params'
import { onlineConfigured, requireOnlineClient } from '@/lib/online/client'

/* global process, fetch */
export type ChickenConfig = { params: ChickenParams; look: ChickenLook }
export type SavedChickenConfig = { config: ChickenConfig; revision: number; updatedAt: string | null }

const CACHE = 'chickenchess:chicken-config:v1'
const REFRESH_AFTER_MS = 60_000

export const defaultChickenConfig = (): ChickenConfig => ({ params: { ...CHICKEN_PARAMS }, look: LOOK_ART.breedLook('caipira') })

const SFX_VALUES = new Set(['', 'all', ...Object.keys(CHICKEN_CLUCKS)])

/** Keeps only known settings with the right type; anything missing or broken falls back to the default. */
export function normalizeChickenConfig(raw: unknown): ChickenConfig {
  const out = defaultChickenConfig()
  const src = (raw && typeof raw === 'object' ? raw : {}) as { params?: Record<string, unknown>; look?: Record<string, unknown> }
  const params = src.params && typeof src.params === 'object' ? src.params : {}
  const target = out.params as Record<string, unknown>
  // a version saved before 'runBroodJumpBoost' existed still has the old crouch-run speed (1): drop it so the new default applies
  const legacy = !('runBroodJumpBoost' in params)
  for (const [key, def] of Object.entries(CHICKEN_PARAMS)) {
    if (legacy && key === 'crouchRunSpeed') continue
    const v = params[key]
    if (typeof def === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === typeof def) {
      if (key.startsWith('sfx_') && !SFX_VALUES.has(v as string)) continue
      target[key] = v
    }
  }
  const look = src.look && typeof src.look === 'object' ? src.look : {}
  for (const slot of Object.keys(out.look) as ChickenSlot[]) {
    const v = look[slot]
    if (typeof v === 'string' && LOOK_ART.art[slot][v]) out.look[slot] = v
  }
  return out
}

export const sameChickenConfig = (a: ChickenConfig, b: ChickenConfig) => JSON.stringify(normalizeChickenConfig(a)) === JSON.stringify(normalizeChickenConfig(b))

function readCache(): SavedChickenConfig {
  const fallback = { config: defaultChickenConfig(), revision: 0, updatedAt: null }
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(CACHE)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return { config: normalizeChickenConfig(parsed?.config), revision: Number(parsed?.revision) || 0, updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null }
  } catch {
    return fallback
  }
}

let saved: SavedChickenConfig | null = null
let preview: ChickenConfig | null = null
let fetchedAt = 0
let request: Promise<SavedChickenConfig> | null = null
let knownRevisionUnsupported = false
const listeners = new Set<(config: ChickenConfig) => void>()

const savedNow = () => (typeof window === 'undefined' ? readCache() : (saved ??= readCache()))
const publish = () => { const c = getChickenConfig(); listeners.forEach(fn => fn(c)) }

/** What the chickens on screen use: the Pátio's draft while it is open, otherwise the saved version. */
export const getChickenConfig = (): ChickenConfig => preview ?? savedNow().config
export const getSavedChickenConfig = (): SavedChickenConfig => savedNow()

export function subscribeChickenConfig(onChange: (config: ChickenConfig) => void) {
  listeners.add(onChange)
  return () => { listeners.delete(onChange) }
}

export function setChickenConfigPreview(next: ChickenConfig | null) {
  preview = next ? normalizeChickenConfig(next) : null
  publish()
}

function adopt(next: SavedChickenConfig) {
  saved = next
  fetchedAt = Date.now()
  try { window.localStorage.setItem(CACHE, JSON.stringify(next)) } catch { /* storage unavailable */ }
  publish()
  return next
}

function parseRow(row: unknown): SavedChickenConfig {
  if (!row || typeof row !== 'object') return { config: defaultChickenConfig(), revision: 0, updatedAt: null }
  const r = row as { config?: unknown; revision?: unknown; updated_at?: unknown }
  return { config: normalizeChickenConfig(r.config), revision: Number(r.revision) || 0, updatedAt: typeof r.updated_at === 'string' ? r.updated_at : null }
}

/** Reads the saved version (anonymous, no login). Offline or not installed yet: keeps what it had. */
export function refreshChickenConfig(force = false): Promise<SavedChickenConfig> {
  if (!force && Date.now() - fetchedAt < REFRESH_AFTER_MS) return Promise.resolve(savedNow())
  if (request) return request
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!onlineConfigured || !url || !key || typeof window === 'undefined') return Promise.resolve(savedNow())
  // Egress: the revision cached here goes along and the server leaves the config out while it is still current.
  // A server without migration 202611040001 rejects the argument (404): the call is repeated without it, once.
  const held = savedNow()
  const call = (known: number | null) => fetch(`${url}/rest/v1/rpc/chicken_config`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: known ? JSON.stringify({ p_known_revision: known }) : '{}',
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const known = held.revision > 0 && !knownRevisionUnsupported ? held.revision : null
  request = call(known)
    .then(response => {
      if (known && response.status === 404) { knownRevisionUnsupported = true; return call(null) }
      return response
    })
    .then(async response => {
      if (!response.ok) throw new Error(`chicken_config ${response.status}`)
      const row: unknown = await response.json()
      // unchanged: only the revision came back, the cached config stands
      if (known && row && typeof row === 'object' && !('config' in row) && Number((row as { revision?: unknown }).revision) === known) {
        fetchedAt = Date.now()
        return savedNow()
      }
      return adopt(parseRow(row))
    })
    .catch(() => { fetchedAt = Date.now(); return savedNow() })
    .finally(() => { request = null })
  return request
}

export class ChickenConfigError extends Error {}

function saveErrorMessage(error: unknown) {
  const e = (error && typeof error === 'object' ? error : {}) as { message?: string; code?: string }
  const msg = e.message ?? ''
  if (msg.includes('CONFIG_CONFLICT')) return 'Outra versão foi salva enquanto você editava. Recarregue os valores salvos e refaça o ajuste.'
  if (msg.includes('ADMIN_REQUIRED') || msg.includes('UNAUTHORIZED')) return 'Só a conta admin pode salvar a configuração central.'
  if (e.code === 'PGRST202' || msg.includes('chicken_config_save')) return 'O servidor ainda não tem a configuração central (falta aplicar a migração 202611010001_chicken_config.sql).'
  return msg || 'Não foi possível salvar. Tente de novo.'
}

/** Saves the central configuration (admin only) over the revision the editor started from. */
export async function saveChickenConfig(next: ChickenConfig): Promise<SavedChickenConfig> {
  const config = normalizeChickenConfig(next)
  const { data, error } = await requireOnlineClient().rpc('chicken_config_save', { p_config: config, p_revision: savedNow().revision })
  if (error) throw new ChickenConfigError(saveErrorMessage(error))
  return adopt(parseRow(data))
}
