// SVG art of the items held in the chicken's wing: pointing right, grip at (0, 0), in rig units.
import type { ItemId } from './items'

export const ITEM_SVG: Partial<Record<ItemId, string>> = {
  pistol: `<g transform="scale(1.7)">
    <path d="M2 -1 L11 -1 L9 12 L1 12 Z" fill="#2b2f38"/>
    <path d="M11 0 Q16 1 15 6 L11 6" fill="none" stroke="#2b2f38" stroke-width="1.6"/>
    <rect x="-2" y="-8" width="32" height="8" fill="#566072"/>
    <rect x="-2" y="-8" width="32" height="2.5" fill="#7d8899"/>
    <rect x="28" y="-6.5" width="4" height="5" fill="#1c1f25"/>
  </g>`,
}
