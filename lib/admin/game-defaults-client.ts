import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'
import { chickenControlsDefaultsFile, type ChickenControls } from '../chicken/controls'
import { itemsDefaultsFile, type ItemDef, type ItemId } from '../pigchicken/items'
import { soulsFile, type SoulEntry } from '../pigchicken/soul-library'
import { patioSettingsDefaultsFile, type PatioSettings } from '../pigchicken/patio-settings'
import type { PatioLayers } from '../pigchicken/patio-layers'
import { parquinhoDefaultsFile, type ParquinhoSettings } from '../pigchicken/settings'

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

// value: the file's new content, or how to make it from the content it has now
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
    body: JSON.stringify({ revision: payload.revision, value: typeof value === 'function' ? value(payload.value) : value }),
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

// data/pigchicken/default-patio.json has one part per panel: each writes its own and keeps the others as they are
const savePatioPart = (part: 'settings' | 'layers' | 'camera', value: unknown) =>
  saveAdminFile('pigchicken-patio', (current: unknown) => ({ ...(current && typeof current === 'object' ? current : {}), [part]: value }))
/** Writes this Pátio's settings (its width as shown) as what a new empty Pátio starts with. */
export const saveDefaultPatioSettings = (settings: PatioSettings | undefined, screens: number) => savePatioPart('settings', patioSettingsDefaultsFile(settings, screens))
/** Writes these layers as the Camadas panel's defaults. */
export const saveDefaultPatioLayers = (layers: PatioLayers) => savePatioPart('layers', layers)
/** Writes these settings as the Câmera de Mira panel's defaults. */
export const saveDefaultCamera = (settings: ParquinhoSettings) => savePatioPart('camera', parquinhoDefaultsFile(settings))
