// The Filhote (docs/mechanics/chicken/characters.md): at zero health a player's chicken, Pig or Ken turns into a
// baby of its class (pintinho, leitão, raposinha): immortal and small, it plays instruments and uses Usar but does not
// shoot, hit or throw. Its music bar fills with the notes that hit it (notes rebated off the aliens and the birds,
// the instruments' notes); full, it is an adult again. The state is kept in this browser, so going back to the globe
// and into another Pátio keeps it (never captured). Pure state plus the art for each class.
import { variantClass } from './beast-art'
import { CHICK_STYLES, chickArt, chickStyle } from './chick-art'
import { KIT_STYLES, PIGLET_STYLES, kitArt, pigletArt } from './baby-art'
import type { ChickenArtSet, ChickenLook } from './look-art'

export type BabyState = { on: boolean; skin: string | null; bar: number }
const KEY = 'chickenchess:baby:v1'
const OFF: BabyState = { on: false, skin: null, bar: 0 }
let state: BabyState = OFF
let loaded = false
const subs = new Set<(s: BabyState) => void>()

function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || 'null')
    if (raw && typeof raw === 'object' && raw.on === true) state = { on: true, skin: typeof raw.skin === 'string' ? raw.skin : null, bar: Math.max(0, Math.min(1, Number(raw.bar) || 0)) }
  } catch { /* storage unavailable */ }
}
export function getBaby(): BabyState { if (typeof window !== 'undefined') load(); return state }
export function setBaby(next: Partial<BabyState>) {
  load()
  state = { ...state, ...next }
  if (!state.on) state = { ...OFF }
  try { window.localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  subs.forEach(f => f(state))
}
export function subscribeBaby(f: (s: BabyState) => void) { subs.add(f); return () => { subs.delete(f) } }

// a note that reaches the baby: one share of the bar (`notes` of them fill it); full, it is an adult again
export function feedBaby(notes: number): boolean {
  const s = getBaby()
  if (!s.on) return false
  const bar = Math.min(1, s.bar + 1 / Math.max(1, notes))
  if (bar >= 1) { setBaby({ on: false }); return true }
  setBaby({ bar })
  return false
}

export type BabyClass = 'galinha' | 'porco' | 'raposa'
export const babyClassOf = (look: ChickenLook): BabyClass => variantClass(look.torso)
// the baby skins of each class, the ones the Vestiário offers while she is a Filhote
export function babySkins(klass: BabyClass): { id: string; label: string }[] {
  if (klass === 'porco') return PIGLET_STYLES.map(s => ({ id: s.id, label: s.label }))
  if (klass === 'raposa') return KIT_STYLES.map(s => ({ id: s.id, label: s.label }))
  return CHICK_STYLES.filter(s => s.kind === 'realista').map(s => ({ id: s.id, label: s.label }))
}
// the skin a baby starts with: the one closest to the adult's look
const PIG_BABY: Record<string, string> = { 'porco-rosa': 'rosa', 'porco-hampshire': 'preto', 'porco-mangalica': 'caramelo' }
export function defaultBabySkin(look: ChickenLook): string {
  const k = babyClassOf(look)
  if (k === 'porco') return PIG_BABY[look.torso] ?? 'rosa'
  if (k === 'raposa') { const id = look.torso.replace('raposa-', ''); return KIT_STYLES.some(s => s.id === id) ? id : 'vermelha' }
  return 'amarelo'
}
export function babyArt(look: ChickenLook, skin: string | null): ChickenArtSet {
  const k = babyClassOf(look), id = skin ?? defaultBabySkin(look)
  if (k === 'porco') return pigletArt(PIGLET_STYLES.find(s => s.id === id) ?? PIGLET_STYLES[0])
  if (k === 'raposa') return kitArt(KIT_STYLES.find(s => s.id === id) ?? KIT_STYLES[0])
  return chickArt(chickStyle(id))
}
