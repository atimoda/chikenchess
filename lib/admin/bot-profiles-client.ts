import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'
import type { BotProfile } from '../chess-bots'

const BOTS_FILE_URL = '/__admin-local/file?id=bots'

async function adminToken() {
  const client = getOnlineClient()
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  if (error || !data.session || !isAdminUser(data.session.user)) return null
  return data.session.access_token
}

async function readBotsFile(token: string) {
  const response = await fetch(BOTS_FILE_URL, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
  const payload = await response.json().catch(() => null)
  return { ok: response.ok && !!payload && Array.isArray(payload.value), payload }
}

/**
 * The bot catalog the local admin service would save to, or null when this
 * browser cannot save bots (not localhost, no admin session or no service).
 */
export async function loadEditableBotProfiles(): Promise<BotProfile[] | null> {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal) return null
  try {
    const token = await adminToken()
    if (!token) return null
    const { ok, payload } = await readBotsFile(token)
    return ok && typeof payload.revision === 'string' ? payload.value as BotProfile[] : null
  } catch {
    return null
  }
}

/** Replaces one bot in the local catalog file and returns the saved catalog. */
export async function saveBotProfile(updatedBot: BotProfile): Promise<BotProfile[]> {
  const token = await adminToken()
  if (!token) throw new Error('Sessão administrativa indisponível.')
  const { ok, payload } = await readBotsFile(token)
  if (!ok) throw new Error(payload?.error || 'Salvamento local indisponível. Execute npm run admin:dev.')
  const nextProfiles = (payload.value as BotProfile[]).map(profile => profile.id === updatedBot.id ? updatedBot : profile)
  const putRes = await fetch(BOTS_FILE_URL, {
    method: 'PUT',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: payload.revision, value: nextProfiles }),
  })
  const putPayload = await putRes.json().catch(() => null)
  if (!putRes.ok || !putPayload) throw new Error(putPayload?.error || 'Falha ao salvar configuração do bot.')
  return nextProfiles
}
