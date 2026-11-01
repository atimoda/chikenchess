// PigChicKen items: weapons and (later) instruments share one sheet of numbers. The Parquinho's item popup
// edits these sheets; they are saved in this browser for now.

export type FireMode = 'semi' | 'auto' | 'burst'
export type ItemId = 'wing' | 'pistol'

export type ItemDef = {
  id: ItemId
  name: string
  family: string
  // firing
  fireMode: FireMode
  rate: number // shots per second
  burst: number // shots per press in burst mode
  mag: number // shots per magazine (0 = no ammo, never reloads)
  reloadTime: number // s
  autoReload: boolean
  slideFire: boolean // can fire while sliding
  // projectile
  speed: number // px/s
  drop: number // projectile drop (gravity, px/s²); 0 = straight line
  damage: number
  pierce: number // targets it goes through
  range: number // px before it fades
  size: number // px
  // spread (degrees)
  spreadBase: number
  spreadShot: number // added per shot
  spreadMax: number
  spreadRecover: number // per second
  spreadMove: number // added while walking
  spreadAir: number // added in the air
  crouchMult: number
  broodMult: number
  // feel
  recoilKick: number // px the weapon jumps back
  recoilPush: number // px/s pushing her away from the shot, only in the air
  weight: number // walking speed multiplier
  turnRate: number // deg/s the aim can turn (0 = instant)
  // melee (Y / right click)
  meleeDamage: number
  meleeRange: number // px
  meleeArc: number // degrees
  meleeCooldown: number // s
  durability: number // melee hits on a target before it breaks (0 = never)
  meleePush: number // knockback px/s
  // throw (RB)
  throwDamage: number
  throwSpeed: number // px/s at full charge
  throwCharge: number // s to full charge
}

const PISTOL: ItemDef = {
  id: 'pistol', name: 'Pistola', family: 'Pistola',
  fireMode: 'semi', rate: 6, burst: 3, mag: 12, reloadTime: 1.1, autoReload: true, slideFire: true,
  speed: 1500, drop: 0, damage: 12, pierce: 0, range: 1100, size: 3,
  spreadBase: 1.5, spreadShot: 2.2, spreadMax: 9, spreadRecover: 14, spreadMove: 1.5, spreadAir: 3, crouchMult: 0.7, broodMult: 0.5,
  recoilKick: 7, recoilPush: 60, weight: 1, turnRate: 0,
  meleeDamage: 18, meleeRange: 95, meleeArc: 110, meleeCooldown: 0.45, durability: 40, meleePush: 260,
  throwDamage: 25, throwSpeed: 1100, throwCharge: 1,
}

// no item: firing and hitting are both a wing slap
const WING: ItemDef = {
  ...PISTOL, id: 'wing', name: 'Asa (sem item)', family: 'Sem item',
  mag: 0, rate: 2.5, damage: 0, recoilKick: 0, recoilPush: 0,
  meleeDamage: 8, meleeRange: 80, meleeArc: 120, meleeCooldown: 0.35, durability: 0, meleePush: 180, throwDamage: 0,
}

export const DEFAULT_ITEMS: Record<ItemId, ItemDef> = { wing: WING, pistol: PISTOL }
export const ITEM_IDS: ItemId[] = ['pistol', 'wing']

type Meta = { key: keyof ItemDef; label: string; min: number; max: number; step: number; unit?: string; group: string; hint?: string }
export const ITEM_PARAM_META: Meta[] = [
  { key: 'rate', label: 'Cadência', min: 0.5, max: 20, step: 0.5, unit: 'tiros/s', group: 'Disparo' },
  { key: 'burst', label: 'Tiros por rajada', min: 2, max: 6, step: 1, group: 'Disparo' },
  { key: 'mag', label: 'Pente', min: 0, max: 60, step: 1, unit: 'tiros', group: 'Disparo', hint: '0 = sem munição' },
  { key: 'reloadTime', label: 'Recarga', min: 0.2, max: 4, step: 0.1, unit: 's', group: 'Disparo' },
  { key: 'speed', label: 'Velocidade do projétil', min: 200, max: 4000, step: 50, unit: 'px/s', group: 'Projétil' },
  { key: 'drop', label: 'Queda do projétil', min: 0, max: 3000, step: 50, unit: 'px/s²', group: 'Projétil', hint: '0 = linha reta' },
  { key: 'damage', label: 'Dano', min: 0, max: 100, step: 1, group: 'Projétil' },
  { key: 'pierce', label: 'Atravessa', min: 0, max: 10, step: 1, unit: 'alvos', group: 'Projétil' },
  { key: 'range', label: 'Alcance', min: 100, max: 3000, step: 50, unit: 'px', group: 'Projétil' },
  { key: 'size', label: 'Tamanho', min: 1, max: 12, step: 1, unit: 'px', group: 'Projétil' },
  { key: 'spreadBase', label: 'Espalhamento base', min: 0, max: 20, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'spreadShot', label: 'Por tiro', min: 0, max: 10, step: 0.1, unit: '°', group: 'Espalhamento' },
  { key: 'spreadMax', label: 'Máximo', min: 0, max: 40, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'spreadRecover', label: 'Recupera', min: 1, max: 60, step: 1, unit: '°/s', group: 'Espalhamento' },
  { key: 'spreadMove', label: 'Andando', min: 0, max: 15, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'spreadAir', label: 'No ar', min: 0, max: 15, step: 0.5, unit: '°', group: 'Espalhamento' },
  { key: 'crouchMult', label: 'Agachada', min: 0.1, max: 1.5, step: 0.05, unit: '×', group: 'Espalhamento' },
  { key: 'broodMult', label: 'Chocando', min: 0.1, max: 1.5, step: 0.05, unit: '×', group: 'Espalhamento' },
  { key: 'recoilKick', label: 'Coice visual', min: 0, max: 30, step: 1, unit: 'px', group: 'Manuseio' },
  { key: 'recoilPush', label: 'Recuo no ar', min: 0, max: 800, step: 10, unit: 'px/s', group: 'Manuseio' },
  { key: 'weight', label: 'Peso (velocidade)', min: 0.3, max: 1.2, step: 0.05, unit: '×', group: 'Manuseio' },
  { key: 'turnRate', label: 'Giro da mira', min: 0, max: 1440, step: 30, unit: '°/s', group: 'Manuseio', hint: '0 = instantâneo' },
  { key: 'meleeDamage', label: 'Dano do golpe', min: 0, max: 100, step: 1, group: 'Golpe' },
  { key: 'meleeRange', label: 'Alcance do golpe', min: 30, max: 250, step: 5, unit: 'px', group: 'Golpe' },
  { key: 'meleeArc', label: 'Arco do golpe', min: 20, max: 360, step: 10, unit: '°', group: 'Golpe' },
  { key: 'meleeCooldown', label: 'Intervalo', min: 0.1, max: 2, step: 0.05, unit: 's', group: 'Golpe' },
  { key: 'meleePush', label: 'Empurrão', min: 0, max: 800, step: 10, unit: 'px/s', group: 'Golpe' },
  { key: 'durability', label: 'Quebra depois de', min: 0, max: 200, step: 1, unit: 'golpes', group: 'Golpe', hint: '0 = nunca quebra' },
  { key: 'throwDamage', label: 'Dano do arremesso', min: 0, max: 100, step: 1, group: 'Arremesso' },
  { key: 'throwSpeed', label: 'Força máxima', min: 200, max: 2500, step: 50, unit: 'px/s', group: 'Arremesso' },
  { key: 'throwCharge', label: 'Tempo de carga', min: 0.1, max: 3, step: 0.1, unit: 's', group: 'Arremesso' },
]
export const ITEM_PARAM_GROUPS = [...new Set(ITEM_PARAM_META.map(m => m.group))]

const STORE = 'pigchicken-items-v1'
const EVENT = 'pigchicken-items'

export function loadItems(): Record<ItemId, ItemDef> {
  const out = structuredClone(DEFAULT_ITEMS)
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) || 'null')
    if (!saved) return out
    ITEM_IDS.forEach(id => {
      const s = saved[id]
      if (!s) return
      ITEM_PARAM_META.forEach(m => {
        const v = s[m.key]
        if (typeof v === 'number' && Number.isFinite(v)) (out[id] as Record<string, unknown>)[m.key] = Math.min(m.max, Math.max(m.min, v))
      })
      if (s.fireMode === 'semi' || s.fireMode === 'auto' || s.fireMode === 'burst') out[id].fireMode = s.fireMode
      if (typeof s.autoReload === 'boolean') out[id].autoReload = s.autoReload
      if (typeof s.slideFire === 'boolean') out[id].slideFire = s.slideFire
    })
  } catch { /* storage unavailable */ }
  return out
}

export function saveItems(items: Record<ItemId, ItemDef>) {
  try { window.localStorage.setItem(STORE, JSON.stringify(items)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribeItems(onChange: (items: Record<ItemId, ItemDef>) => void) {
  const handler = () => onChange(loadItems())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
