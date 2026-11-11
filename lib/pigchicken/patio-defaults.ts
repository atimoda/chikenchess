// The game's defaults for the Pátio, in data/pigchicken/default-patio.json ("Salvar no game", admin only):
// - settings: what a new empty Pátio starts with (Configurações do Pátio), read in patio-settings.ts
// - layers: the Camadas panel's values for a Pátio that saved none, read in patio-layers.ts
// - camera: the Câmera de Mira panel's values for who never changed them and for Padrão, read in settings.ts
// - volume: the Volume panel's values for who never changed them and for Padrão, read in mixer.ts
// Each panel writes its own part; this checks a whole file before it is written.
import { PATIO_DEFAULT_KEYS, patioSettingsOver } from './patio-settings'
import { normalizePatioLayers } from './patio-layers'
import { parquinhoDefaultsFile, parquinhoOver } from './settings'
import { mixOver } from './mixer'

export const PATIO_DEFAULTS_PATH = 'data/pigchicken/default-patio.json'

const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every(k => k in b && same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Why this is not a valid defaults file (unknown part or field, or a value the game would change), or null. */
export function patioDefaultsProblem(value: unknown): string | null {
  if (!isObject(value)) return 'O arquivo precisa ser um objeto com settings, layers, camera e volume.'
  const parts = ['settings', 'layers', 'camera', 'volume']
  const unknown = Object.keys(value).find(k => !parts.includes(k))
  if (unknown) return `Parte desconhecida: ${unknown}.`
  const missing = parts.find(k => !isObject(value[k]))
  if (missing) return `Falta a parte ${missing}.`
  const settings = value.settings as Record<string, unknown>
  const field = Object.keys(settings).find(k => !(PATIO_DEFAULT_KEYS as readonly string[]).includes(k))
  if (field) return `settings: campo desconhecido ${field}.`
  if (!same(patioSettingsOver(settings), settings)) return 'settings: há valor inválido ou fora dos limites do painel Configurações do Pátio.'
  if (!same(normalizePatioLayers(value.layers), value.layers)) return 'layers: há campo faltando, desconhecido ou fora dos limites do painel Camadas.'
  if (!same(parquinhoDefaultsFile(parquinhoOver(value.camera)), value.camera)) return 'camera: há campo faltando, desconhecido ou fora dos limites do painel Câmera de Mira.'
  if (!same(mixOver(value.volume), value.volume)) return 'volume: há campo faltando, desconhecido ou fora de 0 a 1 no painel Volume.'
  return null
}
