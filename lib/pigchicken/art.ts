// SVG art of the items held in the chicken's wing: pointing right, grip at (0, 0), in rig units.
// `box` is the art's bounding box [x, y, width, height], used to draw it on the canvas (pickups, inventory).
import type { ItemId } from './items'

type Art = { svg: string; box: [number, number, number, number] }

const ART: Partial<Record<ItemId, Art>> = {
  pistol: {
    box: [-6, -16, 64, 40],
    svg: `<g transform="scale(1.7)">
    <path d="M2 -1 L11 -1 L9 12 L1 12 Z" fill="#2b2f38"/>
    <path d="M11 0 Q16 1 15 6 L11 6" fill="none" stroke="#2b2f38" stroke-width="1.6"/>
    <rect x="-2" y="-8" width="32" height="8" fill="#566072"/>
    <rect x="-2" y="-8" width="32" height="2.5" fill="#7d8899"/>
    <rect x="28" y="-6.5" width="4" height="5" fill="#1c1f25"/>
  </g>`,
  },
  smg: {
    box: [-32, -14, 96, 38],
    svg: `<rect x="-26" y="-9" width="13" height="4" fill="#2b2f38"/>
    <rect x="-30" y="-12" width="5" height="12" rx="1" fill="#2b2f38"/>
    <path d="M-2 0 L8 0 L6 18 L-3 18 Z" fill="#2b2f38"/>
    <rect x="14" y="0" width="7" height="22" rx="1" fill="#3a3f4a"/>
    <rect x="-14" y="-12" width="58" height="13" rx="2" fill="#4a5262"/>
    <rect x="-14" y="-12" width="58" height="4" fill="#6b7587"/>
    <rect x="44" y="-9" width="18" height="5" fill="#2b2f38"/>`,
  },
  rifle: {
    box: [-46, -17, 154, 43],
    svg: `<path d="M-10 -11 L-44 -8 L-44 6 L-10 1 Z" fill="#6b4a2b"/>
    <path d="M0 0 L9 0 L6 18 L-3 18 Z" fill="#6b4a2b"/>
    <path d="M16 1 L26 1 L30 22 L20 24 Z" fill="#2b2f38"/>
    <rect x="-10" y="-11" width="60" height="12" rx="2" fill="#4b5320"/>
    <rect x="-4" y="-15" width="40" height="4" fill="#2b2f38"/>
    <rect x="50" y="-10" width="30" height="9" rx="2" fill="#3e451a"/>
    <rect x="80" y="-7.5" width="26" height="4" fill="#1c1f25"/>`,
  },
  pump: {
    box: [-48, -13, 154, 27],
    svg: `<path d="M-6 -9 L-46 -4 L-46 10 L-6 2 Z" fill="#7a4a24"/>
    <path d="M-6 -2 L4 -2 L0 12 L-9 12 Z" fill="#7a4a24"/>
    <rect x="-6" y="-11" width="34" height="12" rx="2" fill="#3a3f4a"/>
    <rect x="28" y="-11" width="76" height="6" fill="#2b2f38"/>
    <rect x="28" y="-4" width="60" height="5" fill="#23262d"/>
    <rect x="44" y="-6" width="26" height="9" rx="3" fill="#8b5a2b"/>`,
  },
  sniper: {
    box: [-54, -23, 198, 39],
    svg: `<path d="M-8 -8 L-50 -6 L-52 10 L-30 10 L-8 3 Z" fill="#5a6b3a"/>
    <path d="M-6 0 L4 0 L0 14 L-9 14 Z" fill="#46542c"/>
    <rect x="48" y="-6" width="88" height="4" fill="#1c1f25"/>
    <rect x="134" y="-7.5" width="8" height="7" fill="#2b2f38"/>
    <rect x="-8" y="-9" width="56" height="11" rx="2" fill="#5a6b3a"/>
    <rect x="10" y="-13" width="4" height="5" fill="#1c1f25"/><rect x="26" y="-13" width="4" height="5" fill="#1c1f25"/>
    <rect x="0" y="-20" width="38" height="8" rx="4" fill="#1c1f25"/>
    <rect x="36" y="-21" width="5" height="10" rx="2" fill="#7bdff2"/>`,
  },
  launcher: {
    box: [-52, -36, 156, 48],
    svg: `<path d="M-2 -9 L8 -9 L6 10 L-3 10 Z" fill="#2b2f38"/>
    <path d="M92 -22 L100 -17 L92 -12 Z" fill="#d6453d"/>
    <rect x="-40" y="-26" width="120" height="18" rx="3" fill="#56603a"/>
    <rect x="-30" y="-27" width="5" height="20" fill="#3a4027"/><rect x="60" y="-27" width="5" height="20" fill="#3a4027"/>
    <path d="M80 -28 L92 -30 L92 -4 L80 -6 Z" fill="#3a4027"/>
    <path d="M-40 -27 L-50 -31 L-50 -3 L-40 -7 Z" fill="#3a4027"/>
    <rect x="20" y="-34" width="6" height="8" fill="#2b2f38"/>`,
  },
  grenade: {
    box: [-4, -22, 26, 30],
    svg: `<circle cx="8" cy="-4" r="10" fill="#4b5320"/>
    <path d="M-1 -4 L17 -4 M8 -13 L8 5" stroke="#3a4019" stroke-width="1.5"/>
    <rect x="4" y="-18" width="8" height="5" fill="#8a8f98"/>
    <path d="M12 -16 Q20 -20 18 -10" fill="none" stroke="#c9c9c9" stroke-width="1.5"/>`,
  },
  bow: {
    box: [-22, -56, 58, 112],
    svg: `<path d="M-12 -52 L-12 52" stroke="#e8e2d0" stroke-width="1.2"/>
    <path d="M-20 0 L26 0" stroke="#c9a46a" stroke-width="2"/>
    <path d="M30 0 L22 -4 L22 4 Z" fill="#8a8f98"/>
    <path d="M-20 0 L-24 -4 M-20 0 L-24 4" stroke="#d6453d" stroke-width="2"/>
    <path d="M-12 -52 Q12 0 -12 52" fill="none" stroke="#8b5a2b" stroke-width="5" stroke-linecap="round"/>
    <rect x="-3" y="-7" width="6" height="14" rx="2" fill="#3b2a1a"/>`,
  },
}

export const ITEM_SVG: Partial<Record<ItemId, string>> = Object.fromEntries(Object.entries(ART).map(([k, a]) => [k, a!.svg]))

// canvas images of the same art, built once per item
const images: Partial<Record<ItemId, HTMLImageElement>> = {}
export function itemImage(item: ItemId): { img: HTMLImageElement; box: Art['box'] } | null {
  const art = ART[item]
  if (!art || typeof window === 'undefined') return null
  let img = images[item]
  if (!img) {
    const [x, y, w, h] = art.box
    img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w * 2}" height="${h * 2}">${art.svg}</svg>`)}`
    images[item] = img
  }
  return img.complete && img.naturalWidth ? { img, box: art.box } : null
}
