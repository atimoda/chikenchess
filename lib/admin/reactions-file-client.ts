import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'
import type { Reactions } from '../music/reactions'

const REACTIONS_FILE_URL = '/__admin-local/file?id=reactions'

async function adminToken() {
  const client = getOnlineClient()
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  if (error || !data.session || !isAdminUser(data.session.user)) return null
  return data.session.access_token
}

/** Writes the global States & Events set to data/music/reactions.json through the local Admin service. */
export async function saveOfficialReactions(value: Reactions) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal) throw new Error('Saving to the game works only in the local Admin (npm run admin:dev).')
  const token = await adminToken()
  if (!token) throw new Error('Sign in with an admin account to save to the game.')
  const headers = { Authorization: `Bearer ${token}` }
  const current = await fetch(REACTIONS_FILE_URL, { cache: 'no-store', headers }).catch(() => null)
  const payload = await current?.json().catch(() => null)
  if (!current?.ok || typeof payload?.revision !== 'string') throw new Error(payload?.error || 'Local save is unavailable. Run npm run admin:dev.')
  const response = await fetch(REACTIONS_FILE_URL, {
    method: 'PUT', cache: 'no-store',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: payload.revision, value }),
  })
  const saved = await response.json().catch(() => null)
  if (!response.ok) throw new Error(saved?.error || 'Could not save the global rules.')
}
