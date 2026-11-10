import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'

const ITEMS_FILE_URL = '/__admin-local/file?id=pigchicken-items'

async function adminToken() {
  const client = getOnlineClient()
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  if (error || !data.session || !isAdminUser(data.session.user)) return null
  return data.session.access_token
}

/** "Salvar no game": writes the PigChicKen item sheets' changes from the code to data/pigchicken/items.json through the local Admin service. */
export async function saveOfficialItems(value: unknown) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal) throw new Error('Salvar no game só funciona no Admin local (npm run admin:dev).')
  const token = await adminToken()
  if (!token) throw new Error('Entre com uma conta admin para salvar no game.')
  const headers = { Authorization: `Bearer ${token}` }
  const current = await fetch(ITEMS_FILE_URL, { cache: 'no-store', headers }).catch(() => null)
  const payload = await current?.json().catch(() => null)
  if (!current?.ok || typeof payload?.revision !== 'string') throw new Error(payload?.error || 'Salvamento local indisponível. Rode npm run admin:dev.')
  const response = await fetch(ITEMS_FILE_URL, {
    method: 'PUT', cache: 'no-store',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: payload.revision, value }),
  })
  const saved = await response.json().catch(() => null)
  if (!response.ok) throw new Error(saved?.error || 'Não foi possível salvar os itens no game.')
}
