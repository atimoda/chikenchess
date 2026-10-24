import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'
import type { CreativeSession } from '../music/creative'

/** Writes a Creative kit as the city's official kit (data/music/kits) through the local Admin service. */
export async function saveOfficialCityKit(cityId: string, value: CreativeSession): Promise<{ path: string; revision: string }> {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal) throw new Error('Save DB works only in the local Admin (npm run admin:dev).')
  const client = getOnlineClient()
  const { data } = client ? await client.auth.getSession() : { data: { session: null } }
  if (!data.session || !isAdminUser(data.session.user)) throw new Error('Sign in with an admin account to use Save DB.')
  const response = await fetch('/__admin-local/official-kit', {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cityId, value }),
  }).catch(() => null)
  const saved = await response?.json().catch(() => null)
  if (!response?.ok) throw new Error(saved?.error || 'Local save is unavailable. Run npm run admin:dev.')
  return saved
}
