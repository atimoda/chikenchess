// Ready-made Pátios offered by "Playgrounds" next to the default and the empty one.
// Pôr do sol com torres: a sunset in many bands of colour, everything in contraluz, rows of transmission towers
// far, mid and near in their own parallax depths (one row recedes into the distance), wooden poles along the path
// whose wires the birds rest on, palm trees and pines in the depth, a Passaguá and the aliens' button to make birds.
import { LAYOUT_VERSION, createElement, entryPortalElement, normalizeElement, type ElementKind, type ElementParams, type LayoutElement, type PatioLayout } from './layout'
import { POWER_MODELS, defaultPower } from './power-lines'
import { treePreset } from './trees'
import { WORLD_GROUND_Y } from './world'
import type { SkyParams } from './sky'
import { MOUNTAINS_DEFAULT } from './mountains'

const G = WORLD_GROUND_Y

let n = 0
function el(kind: ElementKind, x: number, bottom: number, params: ElementParams, size?: { w: number; h: number }, extra: Partial<LayoutElement> = {}): LayoutElement {
  const e = createElement(kind, 0, 0, params)
  const w = size?.w ?? e.w, h = size?.h ?? e.h
  return { ...e, id: `${kind}-ex${++n}`, ...extra, x: Math.round(x - w / 2), y: Math.round(bottom - h), w: Math.round(w), h: Math.round(h) }
}
function power(model: string, line: number, x: number, bottom: number, scale: number, depth: number, sag = 40, wire = 2): LayoutElement {
  const m = POWER_MODELS[model]
  return el(m.kind, x, bottom, { power: { ...defaultPower(m.kind), model, line, sag, wire } }, { w: m.w * scale, h: m.h * scale }, { depth, layer: 'back' })
}

export const SUNSET_SKY: SkyParams = {
  hour: 18.4, follow: false,
  stops: [
    { at: 0, color: '#161a46' }, { at: 0.2, color: '#3d2a6b' }, { at: 0.38, color: '#7e3577' }, { at: 0.55, color: '#c94a66' },
    { at: 0.7, color: '#ef6f43' }, { at: 0.84, color: '#ffa33a' }, { at: 0.94, color: '#ffd36a' }, { at: 1, color: '#fff0b8' },
  ],
  sunSize: 58, glow: 85, clouds: 35, texture: 30, haze: 55, silhouette: 85, light: 70, forest: true, radial: 45, radialX: 0, radialY: 25, sunColor: '', glowSize: 120, sunSoft: 0, glowColor: '', sunX: 0, sunLift: 0, radialSun: false, radialSize: 100, starCount: 100, starSize: 100, starGlow: 100, texScale: 120, texStreak: 60, texGrain: 40, texBlend: 'soft',
}

export function sunsetPowerLayout(): PatioLayout {
  n = 0
  const out: LayoutElement[] = []
  const entry = entryPortalElement()
  out.push({ ...entry, x: 140, y: G - entry.h + 6 })
  // far: small lattice towers along the horizon (deep in the haze)
  for (let i = 0; i < 16; i++) out.push(power('trelica', 1, -400 + i * 470, G - 60, 0.3, 0.8, 30, 1))
  // a row that recedes: each tower deeper and smaller than the one before, the wires meet them as the camera moves
  const recede = [[0.15, 1], [0.3, 0.78], [0.45, 0.6], [0.58, 0.46], [0.68, 0.36], [0.76, 0.28], [0.82, 0.22], [0.87, 0.17]]
  recede.forEach(([d, s], i) => out.push(power('alta', 2, 2350 + i * (360 - i * 30), G + 30 - i * 9, s, d, 30, 2.5 - i * 0.2)))
  // mid: cat-head towers
  for (let i = 0; i < 7; i++) out.push(power('gato', 1, 300 + i * 1050, G - 8, 0.55, 0.5, 45, 1.5))
  // near: big lattice towers, a little in front of the far ones
  for (let i = 0; i < 4; i++) out.push(power('trelica', 3, 1300 + i * 1500, G + 10, 0.72, 0.25, 50, 2.5))
  // the path: wooden poles with the wires the birds rest on (in reach of a jump from the platforms)
  for (let i = 0; i < 11; i++) out.push(power(i % 4 === 3 ? 'duplo' : 'madeira', 1, 420 + i * 540, G + 6, 1, 0, 34, 2.5))
  // the vegetation: palms and pines near the path, more of them in the depth
  const tree = (style: 'palm' | 'pine' | 'oak', x: number, scale: number, depth: number, layer: LayoutElement['layer'] = 'back', seed = 1) =>
    el('tree', x, G + 8, { tree: { ...treePreset(style, 7000 + seed), climbTrunk: false, walkBranches: false, walkCrown: false } }, { w: 380 * scale, h: 460 * scale }, { depth, layer })
  ;[[600, 0.55, 0.45], [1500, 0.5, 0.5], [2900, 0.6, 0.4], [4100, 0.45, 0.55], [5200, 0.55, 0.45]].forEach(([x, s, d], i) => out.push(tree(i % 2 ? 'pine' : 'palm', x, s, d, 'back', i)))
  ;[[1150, 1.1], [3300, 1.25], [4700, 1]].forEach(([x, s], i) => out.push(tree('palm', x, s, 0, 'scene', 20 + i)))
  out.push(tree('oak', 2050, 1.05, 0, 'frontGhost', 30))
  // platforms to reach the wires, the Passaguá, a flute and the aliens' button (aliens turned into birds go perch)
  ;[[700, 230], [1250, 330], [2600, 260], [3700, 310], [4900, 250]].forEach(([x, h]) => out.push(el('platform', x, G - h, {}, { w: 220, h: 28 })))
  out.push(el('rack', 420, G, { item: 'passagua', respawnDelay: 2 }))
  out.push(el('rack', 520, G, { item: 'flute', respawnDelay: 2 }))
  out.push(el('button', 900, G - 46, { action: 'aliens' }))
  return { v: LAYOUT_VERSION, elements: out.map(e => normalizeElement(e)!), settings: { screens: 3, sky: SUNSET_SKY, mountains: { ...MOUNTAINS_DEFAULT, show: false }, temple: false } }
}
