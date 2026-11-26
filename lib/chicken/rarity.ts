// Rarity of breeds and of the Vestiário's items (one part variant of a slot), each with its color.
// The color tints the item's "photo" background; where it comes from (liberado / conquista / loja) only colors
// its small label. Player colors (lobby) are the borders, so the cards' borders stay a neutral gray.
import type { ChickenSlot } from './look-art'
import { msg } from '../i18n'

export type Rarity = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria'
export const RARITIES: Rarity[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']
export const RARITY_LABEL: Record<Rarity, string> = { comum: msg('Comum'), incomum: msg('Incomum'), rara: msg('Rara'), epica: msg('Épica'), lendaria: msg('Lendária') }
export const RARITY_COLOR: Record<Rarity, string> = { comum: '#9aa3ad', incomum: '#3fcf6b', rara: '#3d8bff', epica: '#b45cff', lendaria: '#ff9f1a' }

// each breed's rarity; its parts are as rare as the breed unless listed in ITEM_RARITY
export const BREED_RARITY: Record<string, Rarity> = {
  caipira: 'comum', angola: 'rara', onagadori: 'lendaria',
  'porco-rosa': 'comum', 'porco-hampshire': 'incomum', 'porco-mangalica': 'rara',
  'raposa-vermelha': 'comum', 'raposa-cinzenta': 'incomum', 'raposa-corsac': 'incomum', 'raposa-deserto': 'incomum',
  'raposa-prateada': 'rara', 'raposa-artico': 'rara', 'raposa-tibetana': 'rara',
  'raposa-marmorizada': 'epica', 'raposa-feneco': 'epica', 'raposa-morcego': 'epica',
}
// exceptions per part (slot:variant)
export const ITEM_RARITY: Partial<Record<`${ChickenSlot}:${string}`, Rarity>> = {
  'legs:angola': 'incomum',
  'beak:onagadori': 'epica',
  'legs:onagadori': 'epica',
}

export const breedRarity = (breed: string): Rarity => BREED_RARITY[breed] ?? 'comum'
export const itemRarity = (slot: ChickenSlot, variant: string): Rarity =>
  ITEM_RARITY[`${slot}:${variant}`] ?? (variant === 'none' ? 'comum' : breedRarity(variant))
