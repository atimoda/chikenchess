import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'
import { chickenControlsDefaultsFile, type ChickenControls } from '../chicken/controls'

const CONTROLS_FILE_URL = '/__admin-local/file?id=chicken-controls'

/** Calls back with whether this browser's session is an admin's, now and whenever it changes. */
export function watchAdminSession(onChange: (admin: boolean) => void) {
  const client = getOnlineClient()
  if (!client) { onChange(false); return () => {} }
  void client.auth.getSession().then(({ data }) => onChange(isAdminUser(data.session?.user)), () => onChange(false))
  const { data } = client.auth.onAuthStateChange((_event, session) => onChange(isAdminUser(session?.user)))
  return () => data.subscription.unsubscribe()
}

/** Writes these controls to data/chicken/default-controls.json through the local Admin service. */
export async function saveDefaultChickenControls(controls: ChickenControls) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal) throw new Error('Só funciona no Admin local (npm run admin:dev).')
  const client = getOnlineClient()
  const { data } = client ? await client.auth.getSession() : { data: { session: null } }
  if (!data.session || !isAdminUser(data.session.user)) throw new Error('Entre com uma conta admin.')
  const headers = { Authorization: `Bearer ${data.session.access_token}` }
  const current = await fetch(CONTROLS_FILE_URL, { cache: 'no-store', headers }).catch(() => null)
  const payload = await current?.json().catch(() => null)
  if (!current?.ok || typeof payload?.revision !== 'string') throw new Error(payload?.error || 'Salvamento local indisponível. Rode npm run admin:dev.')
  const response = await fetch(CONTROLS_FILE_URL, {
    method: 'PUT', cache: 'no-store',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: payload.revision, value: chickenControlsDefaultsFile(controls) }),
  })
  const saved = await response.json().catch(() => null)
  if (!response.ok) throw new Error(saved?.error || 'Não deu para salvar o padrão.')
}
