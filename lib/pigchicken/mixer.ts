// The Pátio's volume mixer: a master volume over one volume per sound layer, saved in this browser.
// Every sound source asks `mixGain(layer)` (master × layer) when it plays, so a change is heard at once.
// The defaults are the code's with data/pigchicken/default-patio.json over them (its `volume`, which the Volume
// panel writes with "Salvar no game"): they apply to who never moved a slider here and to Padrão.
import DEFAULTS_FILE from '../../data/pigchicken/default-patio.json'

export type MixLayer = 'notes' | 'ambience' | 'weapons' | 'effects' | 'chicken'
export type Mix = { master: number } & Record<MixLayer, number>

export const MIX_LAYERS: { key: MixLayer; label: string; hint: string }[] = [
  { key: 'notes', label: 'Instrumentos', hint: 'As notas que ela toca e as respostas dos inimigos' },
  { key: 'ambience', label: 'Ambiente', hint: 'Percussão e drone de cada zona (0 desliga)' },
  { key: 'weapons', label: 'Armas', hint: 'Tiros, recarga, golpes, explosões e inimigos morrendo' },
  { key: 'effects', label: 'Efeitos do cenário', hint: 'Gongo, sons do Templo e o portal' },
  { key: 'chicken', label: 'Galinha', hint: 'Os cacarejos dela (em todas as telas)' },
]

const CODE_MIX: Mix = { master: 1, notes: 0.7, ambience: 0.35, weapons: 0.6, effects: 0.6, chicken: 1 }

const STORE = 'pigchicken-mixer-v1'
// before the mixer, three of these volumes lived in the Parquinho settings
const OLD_STORE = 'pigchicken-parquinho-v1'

let mix: Mix | null = null
const listeners = new Set<() => void>()

const clamp = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null)

/** The code's volumes with a defaults file's `volume` over them. */
export function mixOver(raw: unknown): Mix {
  const out = { ...CODE_MIX }
  if (raw && typeof raw === 'object') (Object.keys(out) as (keyof Mix)[]).forEach(k => { const v = clamp((raw as Record<string, unknown>)[k]); if (v !== null) out[k] = v })
  return out
}
export const DEFAULT_MIX: Mix = mixOver(DEFAULTS_FILE.volume)
/** The defaults file's `volume` for these volumes (what "Salvar no game" writes). */
export const mixDefaultsFile = (m: Mix): Mix => mixOver(m)

function load(): Mix {
  const base = { ...DEFAULT_MIX }
  if (typeof window === 'undefined') return base
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) || 'null')
    if (saved) {
      (Object.keys(base) as (keyof Mix)[]).forEach(k => { const v = clamp(saved[k]); if (v !== null) base[k] = v })
      return base
    }
    const old = JSON.parse(window.localStorage.getItem(OLD_STORE) || 'null')
    if (old) {
      const pairs: [MixLayer, string][] = [['weapons', 'weaponVolume'], ['notes', 'noteVolume'], ['ambience', 'ambienceVolume']]
      pairs.forEach(([k, o]) => { const v = clamp(old[o]); if (v !== null) base[k] = v })
    }
  } catch { /* storage unavailable */ }
  return base
}

export function getMix(): Mix {
  if (!mix) mix = load()
  return mix
}

export function setMix(next: Partial<Mix>) {
  mix = { ...getMix(), ...next }
  try { window.localStorage.setItem(STORE, JSON.stringify(mix)) } catch { /* ignore */ }
  listeners.forEach(fn => fn())
}

export function subscribeMix(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// the volume a layer really plays at: master × layer
export function mixGain(layer: MixLayer) {
  const m = getMix()
  return m.master * m[layer]
}
