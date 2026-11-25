// The Pátio's volume mixer: a master volume over one volume per sound layer, saved in this browser.
// Every sound source asks `mixGain(layer)` (master × layer) when it plays, so a change is heard at once.
// Mute silences every layer without touching the volumes: they come back as they were when it is turned off.
// The defaults are the code's with data/pigchicken/default-patio.json over them (its `volume`, which the Volume
// panel writes with "Salvar no game"): they apply to who never moved a slider here and to Padrão.
import DEFAULTS_FILE from '../../data/pigchicken/default-patio.json'
import { liveDefault, onGameDefault } from '../game-defaults'
import { deepDiff, effectiveTuning, keepLocalTuning, setLocalTuning, subscribeTuning, tuningLocked } from './patio-tuning'

export type MixLayer = 'notes' | 'ambience' | 'weapons' | 'effects' | 'chicken'
export type Mix = { master: number } & Record<MixLayer, number>

export const MIX_LAYERS: { key: MixLayer; label: string; hint: string }[] = [
  { key: 'notes', label: 'Instrumentos', hint: 'As notas que ela toca e as respostas dos inimigos' },
  { key: 'ambience', label: 'Ambiente', hint: 'Percussão e drone de cada zona (0 desliga)' },
  { key: 'weapons', label: 'Armas', hint: 'Tiros, recarga, golpes, explosões e inimigos morrendo' },
  { key: 'effects', label: 'Efeitos do cenário', hint: 'Gongo, sons do Templo, o portal e o canto real das aves' },
  { key: 'chicken', label: 'Galinha', hint: 'Os cacarejos dela (em todas as telas)' },
]

const CODE_MIX: Mix = { master: 1, notes: 0.7, ambience: 0.35, weapons: 0.6, effects: 0.6, chicken: 1 }

const STORE = 'pigchicken-mixer-v1'
// before the mixer, three of these volumes lived in the Parquinho settings
const OLD_STORE = 'pigchicken-parquinho-v1'

const MUTE_STORE = 'pigchicken-mixer-muted-v1'

let mix: Mix | null = null
let muted: boolean | null = null
const listeners = new Set<() => void>()

const clamp = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null)

/** The code's volumes with a defaults file's `volume` over them. */
export function mixOver(raw: unknown): Mix {
  const out = { ...CODE_MIX }
  if (raw && typeof raw === 'object') (Object.keys(out) as (keyof Mix)[]).forEach(k => { const v = clamp((raw as Record<string, unknown>)[k]); if (v !== null) out[k] = v })
  return out
}
export const DEFAULT_MIX: Mix = liveDefault('volume', DEFAULTS_FILE.volume, mixOver)
/** The defaults file's `volume` for these volumes (what "Salvar no game" writes). */
export const mixDefaultsFile = (m: Mix): Mix => mixOver(m)

// The layers (all but the master) in three levels (lib/pigchicken/patio-tuning.ts): the game's, the open Pátio's
// over them (base) and this browser's over those (value). The master is each person's own, in STORE.
export type MixLayers = Omit<Mix, 'master'>
export const mixLayersOf = (m: Mix): MixLayers => { const { master: _master, ...rest } = m; return rest }
const layersOf = mixLayersOf
export function mixTuning() {
  const game = layersOf(DEFAULT_MIX)
  return { game, ...effectiveTuning('volume', game, raw => layersOf(mixOver(raw))) }
}

function load(): Mix {
  let master = DEFAULT_MIX.master
  if (typeof window !== 'undefined') try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) || 'null')
    const old = saved ? null : JSON.parse(window.localStorage.getItem(OLD_STORE) || 'null')
    if (saved) master = clamp(saved.master) ?? master
    // a STORE from before (every layer) becomes this browser's changes once
    if ((saved && !saved.tuned) || old) {
      const before = { ...DEFAULT_MIX }
      if (saved) (Object.keys(before) as (keyof Mix)[]).forEach(k => { const v = clamp(saved[k]); if (v !== null) before[k] = v })
      else {
        const pairs: [MixLayer, string][] = [['weapons', 'weaponVolume'], ['notes', 'noteVolume'], ['ambience', 'ambienceVolume']]
        pairs.forEach(([k, o]) => { const v = clamp(old[o]); if (v !== null) before[k] = v })
      }
      setLocalTuning('volume', deepDiff(layersOf(DEFAULT_MIX), layersOf(before)))
      window.localStorage.setItem(STORE, JSON.stringify({ master, tuned: true }))
    }
  } catch { /* storage unavailable */ }
  return { ...mixTuning().value, master } as Mix
}

export function getMix(): Mix {
  if (!mix) mix = load()
  return mix
}

export function setMix(next: Partial<Mix>) {
  // Lock (patio-tuning): the layers are the Pátio's; the master stays each person's
  if (tuningLocked()) next = next.master === undefined ? {} : { master: next.master }
  mix = { ...getMix(), ...next }
  try { window.localStorage.setItem(STORE, JSON.stringify({ master: mix.master, tuned: true })) } catch { /* ignore */ }
  keepLocalTuning('volume', mixTuning().base, layersOf(mix))
  listeners.forEach(fn => fn())
}

// a new default saved in the game: the volumes nobody personalized follow it
const reload = () => { if (mix) { mix = load(); listeners.forEach(fn => fn()) } }
onGameDefault('volume', reload)
// another Pátio, or its own volumes saved or changed
subscribeTuning(part => { if (part === 'volume') reload() })

export function subscribeMix(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function isMuted(): boolean {
  if (muted === null) {
    muted = false
    try { muted = window.localStorage.getItem(MUTE_STORE) === '1' } catch { /* no window or storage */ }
  }
  return muted
}

export function setMuted(on: boolean) {
  muted = on
  try { window.localStorage.setItem(MUTE_STORE, on ? '1' : '0') } catch { /* ignore */ }
  listeners.forEach(fn => fn())
}

// the volume a layer really plays at: master × layer (nothing while muted)
export function mixGain(layer: MixLayer) {
  if (isMuted()) return 0
  const m = getMix()
  return m.master * m[layer]
}
