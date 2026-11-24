import { isAdminUser } from './access'
import { getOnlineClient } from '../online/client'
import { chickenControlsDefaultsFile, type ChickenControls } from '../chicken/controls'
import { DEFAULT_ITEMS, ITEM_PARAM_META, itemsDefaultsFile, itemsOver, type ItemDef, type ItemId } from '../pigchicken/items'
import { diffValues, type SaveChange } from './save-diff'
import { soulsFile, type SoulEntry } from '../pigchicken/soul-library'
import { scalesDefaultsFile, type ScaleParams } from '../pigchicken/scale-params'
import type { InstrumentScaleId } from '../pigchicken/instrument-scales'
import { patioSettingsDefaultsFile, type PatioSettings } from '../pigchicken/patio-settings'
import type { PatioLayers } from '../pigchicken/patio-layers'
import { parquinhoDefaultsFile, parquinhoOver, type ParquinhoSettings } from '../pigchicken/settings'
import { mixDefaultsFile, type Mix } from '../pigchicken/mixer'
import { mineGridDefaultsFile, type MineGridParams } from '../pigchicken/mine-grid'

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

// The confirmation before a save writes: it gets every change against the file as the game reads it now and says
// whether to go on. Set by the button for the length of its save (one save at a time)
type ConfirmSave = (changes: SaveChange[]) => Promise<boolean>
let confirmHook: ConfirmSave | null = null
export class SaveCancelled extends Error { constructor() { super('Cancelado.') } }
/** Runs a save asking `confirm` with the changes before writing; a "no" rejects with SaveCancelled. */
export async function withSaveConfirm<T>(confirm: ConfirmSave, run: () => Promise<T>): Promise<T> {
  confirmHook = confirm
  try { return await run() } finally { confirmHook = null }
}

// how each file is compared (as the game reads it, so keys a file lacks are not news) and its changes named
const ITEM_KEY_LABEL: Record<string, string> = Object.fromEntries(ITEM_PARAM_META.map(m => [m.key, m.label]))
const CLASS_WORD: Record<string, string> = { pig: 'Pig', fox: 'Ken' }
const FILE_DIFF: Record<string, { read?: (file: unknown) => unknown; label?: (path: string[]) => string }> = {
  'pigchicken-items': {
    read: file => itemsDefaultsFile(itemsOver(file)),
    label: ([id, key, cls, sub]) => [DEFAULT_ITEMS[id as ItemId]?.name ?? id,
      ...(key === 'classPoints' ? [`Pontos do ${CLASS_WORD[cls] ?? cls}`, ITEM_KEY_LABEL[sub] ?? sub] : [ITEM_KEY_LABEL[key] ?? key])].filter(Boolean).join(' › '),
  },
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
  const next = typeof value === 'function' ? value(payload.value) : value
  if (confirmHook) {
    const how = FILE_DIFF[id] ?? {}
    const changes = diffValues(how.read ? how.read(payload.value) : payload.value, how.read ? how.read(next) : next, how.label)
    if (!(await confirmHook(changes))) throw new SaveCancelled()
  }
  const response = await fetch(url, {
    method: 'PUT', cache: 'no-store',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: payload.revision, value: next }),
  })
  const saved = await response.json().catch(() => null)
  if (!response.ok) throw new Error(saved?.error || 'Não deu para salvar no game.')
}

/** Writes these controls to data/chicken/default-controls.json. */
export const saveDefaultChickenControls = (controls: ChickenControls) => saveAdminFile('chicken-controls', chickenControlsDefaultsFile(controls))
/** Writes these items to data/pigchicken/default-items.json. */
export const saveDefaultItems = (items: Record<ItemId, ItemDef>) => saveAdminFile('pigchicken-items', itemsDefaultsFile(items))
/** Writes these scale numbers (the Escalas panel) to data/pigchicken/default-scales.json. */
export const saveDefaultScales = (scales: Record<InstrumentScaleId, ScaleParams>) => saveAdminFile('pigchicken-scales', scalesDefaultsFile(scales))
/** Writes this catalogue of souls (what differs from the code's) to data/pigchicken/default-souls.json. */
export const saveDefaultSouls = (entries: readonly SoulEntry[]) => saveAdminFile('pigchicken-souls', soulsFile(entries))

// data/pigchicken/default-patio.json has one part per panel: each writes its own and keeps the others as they are
// value: the part's new content, or how to make it from the part as the file has it now
const savePatioPart = (part: 'settings' | 'layers' | 'camera' | 'volume' | 'mineGrid', value: unknown) =>
  saveAdminFile('pigchicken-patio', (current: unknown) => {
    const file = (current && typeof current === 'object' ? current : {}) as Record<string, unknown>
    return { ...file, [part]: typeof value === 'function' ? value(file[part]) : value }
  })
/** Writes this Pátio's settings (its width as shown) as what a new empty Pátio starts with. */
export const saveDefaultPatioSettings = (settings: PatioSettings | undefined, screens: number) => savePatioPart('settings', patioSettingsDefaultsFile(settings, screens))
/** Writes these layers as the Camadas panel's defaults. */
export const saveDefaultPatioLayers = (layers: PatioLayers) => savePatioPart('layers', layers)
// the file's `camera` is shared by two panels: each writes only its own fields and keeps the other's as they are
const fileQuantize = (camera: unknown) => parquinhoOver(camera).quantize
/** Writes these settings as the Câmera de Mira panel's defaults (Notas no ritmo stays as the file has it: Ajustes'). */
export const saveDefaultCamera = (settings: ParquinhoSettings) =>
  savePatioPart('camera', (camera: unknown) => parquinhoDefaultsFile({ ...settings, quantize: fileQuantize(camera) }))
/** Writes the Ajustes panel's default (Notas no ritmo) and keeps the Câmera de Mira's fields as the file has them. */
export const saveDefaultTuning = (settings: ParquinhoSettings) =>
  savePatioPart('camera', (camera: unknown) => parquinhoDefaultsFile({ ...parquinhoOver(camera), quantize: settings.quantize }))
/** Writes these volumes as the Volume panel's defaults. */
export const saveDefaultVolume = (mix: Mix) => savePatioPart('volume', mixDefaultsFile(mix))
/** Writes this Grade de blocos (all but Ligar) as the grid's defaults: what a Pátio that saved none starts with. */
export const saveDefaultMineGrid = (grid: MineGridParams) => savePatioPart('mineGrid', mineGridDefaultsFile(grid))
