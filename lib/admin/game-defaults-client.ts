import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'
import { chickenControlsDefaultsFile, type ChickenControls } from '../chicken/controls'
import { itemsDefaultsFile, type ItemDef, type ItemId } from '../pigchicken/items'
import { soulsFile, type SoulEntry } from '../pigchicken/soul-library'

// "Salvar no game": admins write a game defaults file of the repository through the local Admin service
// (npm run admin:dev), which checks the session and validates the content; publishing is commit + deploy.

/** Calls back with whether this browser's session is an admin's, now and whenever it changes. */
export function watchAdminSession(onChange: (admin: boolean) => void) {
  const client = getOnlineClient()
  if (!client) { onChange(false); return () => {} }
  void client.auth.getSession().then(({ data }) => onChange(isAdminUser(data.session?.user)), () => onChange(false))
  const { data } = client.auth.onAuthStateChange((_event, session) => onChange(isAdminUser(session?.user)))
  return () => data.subscription.unsubscribe()
}

async function saveAdminFile(id: string, value: unknown) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal) throw new Error('Só funciona no Admin local (npm run admin:dev).')
  const client = getOnlineClient()
  const { data } = client ? await client.auth.getSession() : { data: { session: null } }
  if (!data.session || !isAdminUser(data.session.user)) throw new Error('Entre com uma conta admin.')
  const url = `/__admin-local/file?id=${encodeURIComponent(id)}`
  const headers = { Authorization: `Bearer ${data.session.access_token}` }
  const current = await fetch(url, { cache: 'no-store', headers }).catch(() => null)
  const payload = await current?.json().catch(() => null)
  if (!current?.ok || typeof payload?.revision !== 'string') throw new Error(payload?.error || 'Salvamento local indisponível. Rode npm run admin:dev.')
  const response = await fetch(url, {
    method: 'PUT', cache: 'no-store',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: payload.revision, value }),
  })
  const saved = await response.json().catch(() => null)
  if (!response.ok) throw new Error(saved?.error || 'Não deu para salvar no game.')
}

/** Writes these controls to data/chicken/default-controls.json. */
export const saveDefaultChickenControls = (controls: ChickenControls) => saveAdminFile('chicken-controls', chickenControlsDefaultsFile(controls))
/** Writes these items to data/pigchicken/default-items.json. */
export const saveDefaultItems = (items: Record<ItemId, ItemDef>) => saveAdminFile('pigchicken-items', itemsDefaultsFile(items))
/** Writes this catalogue of souls (what differs from the code's) to data/pigchicken/default-souls.json. */
export const saveDefaultSouls = (entries: readonly SoulEntry[]) => saveAdminFile('pigchicken-souls', soulsFile(entries))
