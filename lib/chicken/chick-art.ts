// Chick (pintinho) art: a whole set of parts for the chicken rig (lib/chicken/engine.ts), in the same flat SVG
// style as the chickens (no outlines): a round fluffy body, a big head with a dark beady eye, a short neck, a tiny
// beak, a wing stub and a small tuft for a tail, no comb or wattle.
// Styles: 'realista' are the natural down colors (yellow, cream, black and cream, silver, caramel, striped,
// chocolate, slate, speckled); 'colorido' are the strong dyed colors (pink, green, orange, purple, yellow), kept for
// zones and game events that recolor chicks (engine.setArt).
import type { ChickenArtSet, ChickenArtVariant } from './look-art'

export type ChickStyleKind = 'realista' | 'colorido'
// down: the main down; belly: the lighter front; head / cap / cheek: the head (else the down), a darker top of the
// head and back, a lighter face; back: the wings and the darker back; stripe: dark lines (eye line and back);
// speckle: dark spots over the down
export type ChickStyle = {
  id: string; label: string; kind: ChickStyleKind
  down: string; belly: string; back: string; beak: string; legs: string
  head?: string; cap?: string; cheek?: string; stripe?: string; speckle?: string
}

export const CHICK_STYLES: ChickStyle[] = [
  { id: 'amarelo', label: 'Amarelo-claro', kind: 'realista', down: '#f3dc8c', belly: '#fbefc4', back: '#e6c768', beak: '#e7a24a', legs: '#f0a95a' },
  { id: 'creme', label: 'Creme', kind: 'realista', down: '#f4ecd6', belly: '#fbf8ee', back: '#e3d8ba', beak: '#e9b066', legs: '#efb06a' },
  { id: 'preto', label: 'Preto e creme', kind: 'realista', down: '#2c2826', belly: '#efe3bf', back: '#1d1a19', head: '#2c2826', cheek: '#f1e6c4', beak: '#d9a04d', legs: '#e2a65c' },
  { id: 'prata', label: 'Prata', kind: 'realista', down: '#c7ccd2', belly: '#eceeef', back: '#a9b0b8', head: '#d3d7db', beak: '#e6b07a', legs: '#e9b98a' },
  { id: 'caramelo', label: 'Caramelo', kind: 'realista', down: '#d48a45', belly: '#f1cf9c', back: '#b46a2c', cheek: '#ecc28c', beak: '#e09c58', legs: '#eba25f' },
  { id: 'listrado', label: 'Listrado', kind: 'realista', down: '#b78a5c', belly: '#ecd7ae', back: '#8a6038', cap: '#7a5232', cheek: '#ecd7ae', stripe: '#4f341e', beak: '#d99b55', legs: '#e7a660' },
  { id: 'chocolate', label: 'Chocolate', kind: 'realista', down: '#7d4628', belly: '#9b5d38', back: '#5e321c', beak: '#c98a4a', legs: '#d99556' },
  { id: 'ardosia', label: 'Ardósia', kind: 'realista', down: '#6e7884', belly: '#dcdcd2', back: '#58616c', head: '#7b8591', cheek: '#e4e1d4', beak: '#e2ad6e', legs: '#e5ae72' },
  { id: 'carijo', label: 'Carijó', kind: 'realista', down: '#9a9c9d', belly: '#dadad5', back: '#6e7173', speckle: '#2e2f31', beak: '#e3ad6f', legs: '#e6b072' },
  { id: 'pintado', label: 'Pintado', kind: 'realista', down: '#e3cf9f', belly: '#f2e6c6', back: '#b58c55', cap: '#a07a46', stripe: '#6b4a2a', speckle: '#5b3d22', beak: '#e4a556', legs: '#eaa75c' },
  { id: 'rosa', label: 'Rosa', kind: 'colorido', down: '#ff3fa4', belly: '#ff7cc2', back: '#e02688', beak: '#f2a3b8', legs: '#e58aa6' },
  { id: 'verde', label: 'Verde', kind: 'colorido', down: '#17a65a', belly: '#43c97f', back: '#0e8546', beak: '#f0b36a', legs: '#e9a35e' },
  { id: 'laranja', label: 'Laranja', kind: 'colorido', down: '#ff5420', belly: '#ff8248', back: '#e23d10', beak: '#f2b06a', legs: '#e99a5a' },
  { id: 'roxo', label: 'Roxo', kind: 'colorido', down: '#7a3ce0', belly: '#9d67f2', back: '#5f27bf', beak: '#f0b0c0', legs: '#d99bb0' },
  { id: 'amarelo-forte', label: 'Amarelo forte', kind: 'colorido', down: '#ffd400', belly: '#ffe45a', back: '#f0b800', beak: '#f29a3a', legs: '#ef9a40' },
]

export const chickStyle = (id: string) => CHICK_STYLES.find(s => s.id === id) ?? CHICK_STYLES[0]
export const chickStyles = (kind: ChickStyleKind) => CHICK_STYLES.filter(s => s.kind === kind)
// a chick in a player's colour: a Filhote of the Grade de blocos (lib/pigchicken/mine-round.ts), which nobody should
// take for one of the chicks of a flock
const mixHex = (hex: string, to: number, k: number) => `#${[1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k) + to * k).toString(16).padStart(2, '0')).join('')}`
export function playerChickStyle(color: string | undefined): ChickStyle {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return CHICK_STYLES[0]
  return { id: `filhote-${color}`, label: 'Kids', kind: 'colorido', down: color, belly: mixHex(color, 255, 0.4), back: mixHex(color, 0, 0.22), cheek: mixHex(color, 255, 0.55), beak: '#f2a13a', legs: '#ef9a40' }
}
// a style of this kind at random (the chicks that start following her are realistic)
export const randomChickStyle = (kind: ChickStyleKind = 'realista', rand: () => number = Math.random) => {
  const list = chickStyles(kind)
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))]
}

// rig units, like the chicken's parts (feet at 0, up is negative). The parts are drawn as if for a tall bird and
// lowered as a whole (DROP; the wings a little less, to stay under the shoulder they turn around): the rig keeps the
// chicken's legs, and a chick shows only the short end of them under its down.
const DROP = 32, WING_DROP = 14
const BODY = 'M-56 -112 C -58 -138, -30 -152, -2 -150 C 30 -149, 52 -132, 52 -104 C 52 -74, 28 -56, -4 -56 C -36 -56, -54 -80, -56 -112 Z'
const BELLY = 'M-20 -62 C -2 -56, 26 -60, 42 -78 C 48 -92, 46 -104, 40 -110 C 30 -94, 10 -84, -12 -78 C -22 -74, -26 -68, -20 -62 Z'
const FLUFF = 'M-50 -128 l -8 -6 l 10 0 Z M-38 -142 l -4 -9 l 9 4 Z M-20 -150 l 0 -9 l 7 7 Z M44 -78 l 9 2 l -7 5 Z M30 -62 l 6 7 l -9 -2 Z'
const NECK = 'M8 -128 C 8 -148, 22 -160, 38 -160 C 50 -158, 52 -142, 46 -128 C 34 -120, 18 -120, 8 -128 Z'
const HEAD = '<circle cx="42" cy="-174" r="30" fill="F"></circle>'
const HEAD_TUFT = 'M30 -202 l -3 -10 l 8 7 Z M38 -204 l 2 -10 l 4 9 Z'
const CAP = 'M13 -170 C 12 -196, 30 -206, 46 -204 C 62 -202, 72 -192, 72 -180 C 64 -186, 56 -190, 46 -188 C 34 -186, 22 -178, 13 -170 Z'
const CHEEK = 'M50 -182 C 62 -184, 72 -178, 70 -166 C 66 -154, 52 -152, 44 -158 C 40 -166, 42 -178, 50 -182 Z'
const WING = 'M-30 -118 C -12 -124, 10 -122, 18 -110 C 20 -98, 8 -88, -8 -90 C -24 -92, -36 -104, -30 -118 Z'
const TAIL = 'M-52 -112 C -62 -118, -70 -128, -70 -138 C -62 -132, -56 -126, -46 -122 Z M-50 -104 C -62 -106, -70 -112, -74 -120 C -64 -118, -56 -116, -48 -112 Z'
const SPECKS: [number, number, number][] = [[-38, -126, 4], [-20, -138, 3.5], [-2, -130, 4], [14, -140, 3], [-44, -104, 3.5], [-26, -112, 3], [24, -122, 3.5], [-10, -116, 3]]
const HEAD_SPECKS: [number, number, number][] = [[30, -192, 3], [40, -198, 2.5], [22, -180, 2.5]]

const path = (d: string, fill: string) => `<path d="${d}" fill="${fill}"></path>`
const lower = (svg: string, dy = DROP) => `<g transform="translate(0 ${dy})">${svg}</g>`
// an absolute path (pairs of x y after M/C/L) lowered by dy, for the far wing the engine draws from its outline
const lowerPath = (d: string, dy: number) => { let i = 0; return d.replace(/-?\d+(\.\d+)?/g, n => (i++ % 2 ? String(Number(n) + dy) : n)) }
const specks = (list: [number, number, number][], fill: string) => `<g fill="${fill}">${list.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.7).toFixed(1)}"></ellipse>`).join('')}</g>`

// the chick's whole set of parts in this style, for engine.setArt / createChickenEngine({ art })
export function chickArt(style: ChickStyle): ChickenArtSet {
  const head = style.head ?? style.down
  const cap = style.cap
  const backStripes = style.stripe ? `<path d="M-48 -128 C -30 -144, -6 -148, 18 -142 M-50 -114 C -32 -128, -8 -134, 14 -130" stroke="${style.stripe}" stroke-width="5" stroke-linecap="round" fill="none"></path>` : ''
  const torso: ChickenArtVariant = {
    label: 'Corpo de pintinho',
    svg: lower(path(BODY, style.down) + path(FLUFF, style.down) + path(BELLY, style.belly) + backStripes + (style.speckle ? specks(SPECKS, style.speckle) : '')),
  }
  const face: ChickenArtVariant = {
    label: 'Cabeça de pintinho', lid: cap ?? head, eye: '#1a1614', pupil: '#3a3330', eyeAt: [52, -186 + DROP],
    svg: lower(HEAD.replace('F', head) + path(HEAD_TUFT, cap ?? head) + (cap ? path(CAP, cap) : '') + (style.cheek ? path(CHEEK, style.cheek) : '') +
      (style.stripe ? `<path d="M46 -188 C 36 -190, 26 -186, 18 -178" stroke="${style.stripe}" stroke-width="3.5" stroke-linecap="round" fill="none"></path>` : '') +
      (style.speckle ? specks(HEAD_SPECKS, style.speckle) : '')),
  }
  const wing = lowerPath(WING, WING_DROP)
  return {
    comb: { label: 'Sem crista', svg: '' },
    face,
    beak: { label: 'Bico de pintinho', mouth: [76, -179 + DROP], svg: lower(path('M68 -184 L 80 -179 L 68 -174 Z', style.beak)) },
    wattle: { label: 'Sem barbela', svg: '' },
    neck: { label: 'Pescoço de pintinho', svg: lower(path(NECK, head)) },
    torso,
    wing: { label: 'Asinha', back: style.back, backPath: wing, svg: path(wing, style.back) },
    tail: { label: 'Rabinho', swing: 0.7, svg: lower(path(TAIL, style.back)) },
    legs: { label: 'Perninhas', front: { drum: style.down, shank: style.legs }, back: { drum: style.back, shank: style.legs } },
  }
}
