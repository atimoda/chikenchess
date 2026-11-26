import { isAdminUser } from './access'
import { getOnlineClient, requireOnlineClient } from '../online/client'
import { adoptGameDefault, announceGameDefault, freshGameDefault, type GameDefaultPart } from '../game-defaults'
import PATIO_FILE from '../../data/pigchicken/default-patio.json'
import ITEMS_FILE from '../../data/pigchicken/default-items.json'
import SCALES_FILE from '../../data/pigchicken/default-scales.json'
import CONTROLS_FILE from '../../data/chicken/default-controls.json'
import SOULS_FILE from '../../data/pigchicken/default-souls.json'
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

// "Salvar no game": admins save a part of the game's defaults in Supabase (lib/game-defaults.ts), which counts at once
// for everyone, from any address; the database checks the admin. Each part keeps its last 50 versions to restore.

/** Calls back with whether this browser's session is an admin's, now and whenever it changes. */
export function watchAdminSession(onChange: (admin: boolean) => void) {
  const client = getOnlineClient()
  if (!client) { onChange(false); return () => {} }
  void client.auth.getSession().then(({ data }) => onChange(isAdminUser(data.session?.user)), () => onChange(false))
  const { data } = client.auth.onAuthStateChange((_event, session) => onChange(isAdminUser(session?.user)))
  return () => data.subscription.unsubscribe()
}

// The confirmation before a save writes: it gets every change against the part as the game reads it now and says
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
const PART_DIFF: Partial<Record<GameDefaultPart, { read?: (file: unknown) => unknown; label?: (path: string[]) => string }>> = {
  items: {
    read: file => itemsDefaultsFile(itemsOver(file)),
    label: ([id, key, cls, sub]) => [DEFAULT_ITEMS[id as ItemId]?.name ?? id,
      ...(key === 'classPoints' ? [`Pontos do ${CLASS_WORD[cls] ?? cls}`, ITEM_KEY_LABEL[sub] ?? sub] : [ITEM_KEY_LABEL[key] ?? key])].filter(Boolean).join(' › '),
  },
}

// The repository's files: what a part the server never saved still is (lib/game-defaults.ts)
const FILES: Record<GameDefaultPart, unknown> = {
  settings: PATIO_FILE.settings, layers: PATIO_FILE.layers, camera: PATIO_FILE.camera, volume: PATIO_FILE.volume,
  mineGrid: (PATIO_FILE as { mineGrid?: unknown }).mineGrid, items: ITEMS_FILE, scales: SCALES_FILE, controls: CONTROLS_FILE, souls: SOULS_FILE,
}

export class GameDefaultsError extends Error {}
function saveErrorMessage(error: unknown) {
  const e = (error && typeof error === 'object' ? error : {}) as { message?: string; code?: string }
  const msg = e.message ?? ''
  if (msg.includes('CONFIG_CONFLICT')) return 'Outra versão foi salva enquanto você salvava. Tente de novo para ver o que muda.'
  if (msg.includes('ADMIN_REQUIRED') || msg.includes('UNAUTHORIZED')) return 'Só a conta admin pode salvar no game.'
  if (msg.includes('CONFIG_TOO_LARGE')) return 'Grande demais para salvar.'
  if (e.code === 'PGRST202' || msg.includes('game_defaults')) return 'O servidor ainda não tem os padrões do game (falta aplicar a migração 202611250002_game_defaults.sql).'
  return msg || 'Não deu para salvar no game.'
}

/** Saves a part of the game's defaults in Supabase (admin only): value is the part's new content, or how to make it
 *  from the content the game has now. Asks first with the changes, then everyone gets it on their next read. */
async function savePart(part: GameDefaultPart, value: unknown) {
  const client = getOnlineClient()
  const { data } = client ? await client.auth.getSession() : { data: { session: null } }
  if (!client || !data.session || !isAdminUser(data.session.user)) throw new Error('Entre com uma conta admin.')
  const held = await freshGameDefault(part)
  const current = held?.value ?? FILES[part]
  const next = typeof value === 'function' ? value(current) : value
  if (confirmHook) {
    const how = PART_DIFF[part] ?? {}
    const changes = diffValues(how.read ? how.read(current) : current, how.read ? how.read(next) : next, how.label)
    if (!(await confirmHook(changes))) throw new SaveCancelled()
  }
  const { data: saved, error } = await client.rpc('game_defaults_save', { p_part: part, p_value: next, p_revision: held?.revision ?? 0 })
  if (error) throw new GameDefaultsError(saveErrorMessage(error))
  adoptGameDefault(part, { value: saved.value, revision: Number(saved.revision) || 0, updatedAt: typeof saved.updated_at === 'string' ? saved.updated_at : null })
  announceGameDefault(part)
}

export type GameDefaultVersion = { id: number; revision: number; updatedAt: string; by: string | null }
/** The saved versions of a part (newest first), admin only. */
export async function gameDefaultVersions(part: GameDefaultPart): Promise<GameDefaultVersion[]> {
  const { data, error } = await requireOnlineClient().rpc('game_defaults_versions', { p_part: part })
  if (error) throw new GameDefaultsError(saveErrorMessage(error))
  return ((data ?? []) as { id: number; revision: number; updated_at: string; by: string | null }[]).map(v => ({ id: Number(v.id), revision: v.revision, updatedAt: v.updated_at, by: v.by }))
}
/** Brings back an older version of a part: saves its value again (with the same confirmation as Salvar no game). */
export async function restoreGameDefault(part: GameDefaultPart, id: number) {
  const { data, error } = await requireOnlineClient().rpc('game_defaults_version', { p_id: id })
  if (error) throw new GameDefaultsError(saveErrorMessage(error))
  if (!data || data.part !== part) throw new GameDefaultsError('Versão não encontrada.')
  await savePart(part, data.value)
}

/** Saves these controls as the game's default. */
export const saveDefaultChickenControls = (controls: ChickenControls) => savePart('controls', chickenControlsDefaultsFile(controls))
/** Saves these items as the game's default. */
export const saveDefaultItems = (items: Record<ItemId, ItemDef>) => savePart('items', itemsDefaultsFile(items))
/** Saves these scale numbers (the Escalas panel) as the game's default. */
export const saveDefaultScales = (scales: Record<InstrumentScaleId, ScaleParams>) => savePart('scales', scalesDefaultsFile(scales))
/** Saves this catalogue of souls (what differs from the code's) as the game's default. */
export const saveDefaultSouls = (entries: readonly SoulEntry[]) => savePart('souls', soulsFile(entries))

// the Pátio panels' parts (once the parts of data/pigchicken/default-patio.json)
// value: the part's new content, or how to make it from the part as the game has it now
const savePatioPart = (part: 'settings' | 'layers' | 'camera' | 'volume' | 'mineGrid', value: unknown) => savePart(part, value)
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
