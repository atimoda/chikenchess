// The Filhotes of Pig and Ken (leitão and raposinha) as sets of parts for the chicken's rig, like the chick
// (chick-art.ts): the same flat style with no outlines, round head and body, a bead eye with a shine, no mouth,
// standing on two legs. Drawn in the pixels of Titi's "Trio de filhotes" picture and brought to rig units by BABY_K
// (the chick of that picture is 400 px tall; the game's, 180 rig units before the species' 0.42).
import type { ChickenArtSet } from './look-art'

type P = [number, number]
const fx = (n: number) => Math.round(n * 10) / 10
const stroke = (pts: P[], w: number, c: string) => `<path d="M${pts.map(p => `${fx(p[0])} ${fx(p[1])}`).join(' L ')}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
const at = (x: number, y: number, deg: number, inner: string) => `<g transform="translate(${x} ${y}) rotate(${deg})">${inner}</g>`
const ell = (s: number[][], fill: string) => s.map(([x, y, rx, ry, r = 0]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="${fill}"/>`).join('')
let uid = 0
const uidOf = (p: string) => `baby-${p}${++uid}`

const BABY_K = 0.45
// the picture's pixels → rig units: the body's middle on the chick's (x −2), the feet on the ground
type Frame = { cx: number; ground: number }
const PIGLET_FRAME: Frame = { cx: 169.4, ground: 468 }
const KIT_FRAME: Frame = { cx: 219.4, ground: 472 }
const inFrame = (f: Frame, inner: string) => `<g transform="translate(${fx(-BABY_K * f.cx)} ${fx(-BABY_K * f.ground)}) scale(${BABY_K})">${inner}</g>`
const toRig = (f: Frame, p: P): [number, number] => [fx((p[0] - f.cx) * BABY_K), fx((p[1] - f.ground) * BABY_K)]
const HOOF = 'M-10 -11 C 4 -15, 17 -6, 18 8 C 10 13, -2 11, -10 4 Z'

// ---------- leitão ----------
export type PigletStyle = { id: string; label: string; skin: string; belly: string; ear: string; snout: string; nostril: string; hoof: string; patch?: string; eyePatch?: boolean; earPatch?: boolean; spots?: 'malhado' | 'cinza' | 'ruivo'; eye?: string }
export const PIGLET_STYLES: PigletStyle[] = [
  { id: 'rosa', label: 'Rosa', skin: '#f4a8a1', belly: '#f9d0c9', ear: '#ec958e', snout: '#ee8c88', nostril: '#a8474f', hoof: '#7b3d40' },
  { id: 'branco', label: 'Branco', skin: '#f6ebe7', belly: '#fdf7f4', ear: '#f2b4ad', snout: '#f2a6a0', nostril: '#b25a5e', hoof: '#d9aaa2' },
  { id: 'malhado', label: 'Malhado', skin: '#f3c9c2', belly: '#fbe3de', ear: '#e9a59d', snout: '#ee9f99', nostril: '#9c4048', hoof: '#6e3a3c', patch: '#2e2a2d', eyePatch: true, spots: 'malhado' },
  { id: 'cinza', label: 'Manchas cinza', skin: '#ecdcd5', belly: '#f7eeea', ear: '#4c4447', snout: '#e8a39d', nostril: '#8f3f46', hoof: '#5a4c4e', patch: '#4c4447', eyePatch: true, earPatch: true, spots: 'cinza' },
  { id: 'ruivo', label: 'Ruivo pintado', skin: '#dc9a62', belly: '#efc89c', ear: '#c7824b', snout: '#cf8a68', nostril: '#6b3a2e', hoof: '#4a2f28', patch: '#30282a', spots: 'ruivo' },
  { id: 'caramelo', label: 'Caramelo', skin: '#bd7b52', belly: '#d9a57f', ear: '#a86742', snout: '#b8704e', nostril: '#5d2f24', hoof: '#4a2a22' },
  { id: 'preto', label: 'Preto', skin: '#3a363c', belly: '#48434a', ear: '#2a272c', snout: '#57505a', nostril: '#151316', hoof: '#1b1a1d', eye: '#0b0a0c' },
]
const PG = {
  head: 'M200 60 C 270 58, 330 100, 334 160 C 338 225, 290 275, 200 276 C 120 277, 64 232, 64 168 C 64 104, 126 62, 200 60 Z',
  earFar: 'M136 70 C 106 58, 66 64, 46 88 C 30 108, 34 142, 52 156 C 70 168, 100 160, 118 140 C 130 124, 138 100, 140 80 Z',
  earFarIn: 'M140 74 C 142 102, 134 134, 112 152 C 104 136, 110 104, 124 78 Z',
  earNear: 'M240 68 C 248 44, 272 32, 296 36 C 318 40, 336 62, 340 88 C 330 98, 312 100, 296 96 C 278 90, 256 80, 240 68 Z',
  earNearIn: 'M250 62 C 262 46, 286 42, 306 50 C 290 54, 274 62, 262 74 Z',
  body: 'M165 255 C 228 255, 268 300, 268 350 C 268 400, 228 428, 168 428 C 106 428, 60 398, 60 345 C 60 292, 104 255, 165 255 Z',
  tail: [[66, 322], [40, 330], [22, 318], [18, 300], [28, 284], [44, 284], [50, 296], [42, 304]] as P[],
}
const PIG_SPOTS: Record<string, { head: number[][]; body: number[][] }> = {
  malhado: { head: [[150, 92, 40, 30, -20]], body: [[96, 300, 44, 34, 10], [120, 404, 34, 22, 0]] },
  cinza: { head: [[120, 120, 34, 26, 30]], body: [[90, 330, 36, 30, 0], [150, 290, 22, 16, 0], [230, 300, 18, 14, 0]] },
  ruivo: { head: [[150, 90, 22, 14, -10], [104, 150, 16, 12, 0]], body: [[92, 300, 26, 18, 20], [140, 280, 18, 13, 0], [100, 380, 24, 16, 0], [150, 404, 16, 10, 0], [236, 300, 14, 10, 0]] },
}
const PIGLET_ARM: P[] = [[250, 316], [268, 330]]

export function pigletArt(s: PigletStyle): ChickenArtSet {
  const f = PIGLET_FRAME, hc = uidOf('ph'), bc = uidOf('pb')
  const sp = s.spots ? PIG_SPOTS[s.spots] : null
  const ear = s.earPatch ? s.patch! : s.skin
  const head = `<defs><clipPath id="${hc}"><path d="${PG.head}"/></clipPath></defs><path d="${PG.head}" fill="${s.skin}"/>` +
    `<g clip-path="url(#${hc})">${sp ? ell(sp.head, s.patch!) : ''}${s.eyePatch ? `<ellipse cx="224" cy="136" rx="34" ry="30" transform="rotate(-15 224 136)" fill="${s.patch}"/>` : ''}</g>` +
    `<path d="${PG.earFar}" fill="${ear}"/>${s.earPatch ? '' : `<path d="${PG.earFarIn}" fill="${s.ear}"/>`}` +
    `<circle cx="221" cy="138" r="14" fill="${s.eye ?? '#2b1a1c'}"/><circle cx="216" cy="133" r="4.5" fill="#fff"/>` +
    `<ellipse cx="296" cy="178" rx="42" ry="37" fill="${s.snout}"/><ellipse cx="286" cy="180" rx="7" ry="8.5" fill="${s.nostril}"/><ellipse cx="317" cy="180" rx="7" ry="8.5" fill="${s.nostril}"/>` +
    `<path d="${PG.earNear}" fill="${ear}"/>${s.earPatch ? '' : `<path d="${PG.earNearIn}" fill="${s.ear}"/>`}`
  const body = `<defs><clipPath id="${bc}"><path d="${PG.body}"/></clipPath></defs><path d="${PG.body}" fill="${s.skin}"/>` +
    `<g clip-path="url(#${bc})"><ellipse cx="198" cy="364" rx="54" ry="70" transform="rotate(-12 198 364)" fill="${s.belly}"/>${sp ? ell(sp.body, s.patch!) : ''}</g>` +
    stroke([[146, 318], [180, 340]], 22, s.skin) + at(188, 346, 34, `<path d="${HOOF}" fill="${s.hoof}" transform="scale(1.45)"/>`)
  const [sh, wr] = PIGLET_ARM
  return {
    comb: { label: 'Sem crista', svg: '' }, wattle: { label: 'Sem barbela', svg: '' },
    beak: { label: 'Focinho', svg: '', mouth: toRig(f, [300, 200]) },
    neck: { label: 'Sem pescoço', svg: '' },
    face: { label: `Leitão ${s.label.toLowerCase()}`, ownEyes: true, svg: inFrame(f, head) },
    torso: { label: 'Corpinho de leitão', svg: inFrame(f, body) },
    wing: { label: 'Bracinho', back: s.skin, backPath: 'M0 0 Z', hand: toRig(f, wr), svg: inFrame(f, stroke([sh, wr], 20, s.skin) + at(wr[0] + 7, wr[1] + 6, 42, `<path d="${HOOF}" fill="${s.hoof}" transform="scale(1.35)"/>`)) },
    tail: { label: 'Rabinho', swing: 0.6, svg: inFrame(f, stroke(PG.tail, 9, s.skin)) },
    legs: {
      label: 'Perninhas', front: { drum: s.skin, shank: s.skin }, back: { drum: s.skin, shank: s.skin },
      shape: { thigh: 12, tib: 12, shin: 11.5, dxFront: 18.8, dxBack: 6.5, foot: `<path d="M-6 -2 L 6 -2 L 6 6 L -6 6 Z" fill="${s.hoof}"/>` },
    },
  }
}

// ---------- raposinha ----------
export type KitStyle = { id: string; label: string; coat: string; cream: string; paw: string; nose: string; tip: string; eye?: string; earScale?: number; tailCoat?: string; mask?: string; patch?: string; patches?: number[][]; headPatches?: number[][] }
export const KIT_STYLES: KitStyle[] = [
  { id: 'vermelha', label: 'Raposa-vermelha', coat: '#f8b552', cream: '#fbe5bf', paw: '#a65a2c', nose: '#3a1e1c', tip: '#fbe5bf' },
  { id: 'prateada', label: 'Raposa-prateada', coat: '#6c6d77', cream: '#e6e7eb', paw: '#2b2b31', nose: '#141416', tip: '#f6f6f4', eye: '#120f10' },
  { id: 'marmorizada', label: 'Raposa-marmorizada', coat: '#f4f4f2', cream: '#ffffff', paw: '#7a7a84', nose: '#141416', tip: '#ffffff', tailCoat: '#9a9aa4', mask: '#4a4a53', patch: '#5a5a63', patches: [[170, 290, 30, 40, 20], [150, 380, 22, 26, 0]], headPatches: [[180, 90, 40, 22, -20]] },
  { id: 'artico', label: 'Raposa-do-ártico', coat: '#f5f4f1', cream: '#ffffff', paw: '#d8d5ce', nose: '#2a2626', tip: '#ffffff', earScale: 0.72 },
  { id: 'cinzenta', label: 'Raposa-cinzenta', coat: '#a3a1a0', cream: '#f4f0e9', paw: '#bb6e3c', nose: '#1a1717', tip: '#2a2728', patch: '#c27a4a', patches: [[150, 300, 26, 40, 10]] },
  { id: 'corsac', label: 'Raposa-corsac', coat: '#d9c4a0', cream: '#f6f0e5', paw: '#b8996b', nose: '#2a211b', tip: '#5a4836' },
  { id: 'tibetana', label: 'Raposa-tibetana', coat: '#d49a5e', cream: '#f2ebde', paw: '#a08c76', nose: '#2a1f1a', tip: '#f6f2ea', earScale: 0.74, patch: '#b3ada4', patches: [[140, 360, 30, 50, 0]] },
  { id: 'feneco', label: 'Feneco', coat: '#f1d8a8', cream: '#fdf3df', paw: '#cfa56e', nose: '#3a2a22', tip: '#6a4a33', earScale: 1.45 },
  { id: 'deserto', label: 'Raposa-do-deserto', coat: '#d5c3a2', cream: '#f6f0e4', paw: '#c08a58', nose: '#2a211b', tip: '#2a2320', earScale: 1.28 },
  { id: 'morcego', label: 'Raposa-orelhas-de-morcego', coat: '#a8997f', cream: '#ebe3d4', paw: '#2a2522', nose: '#141212', tip: '#1f1b19', mask: '#2a2522', earScale: 1.55 },
]
const KT = {
  tail: 'M50 228 C 80 236, 116 262, 136 296 C 146 314, 150 336, 148 360 C 140 384, 118 398, 88 400 C 54 400, 30 380, 24 346 C 18 310, 24 262, 50 228 Z',
  tailTip: 'M0 200 L 170 200 L 170 294 C 152 298, 142 312, 128 306 C 112 300, 104 318, 88 312 C 74 306, 64 322, 50 318 C 38 314, 30 326, 0 332 Z',
  head: 'M236 54 C 300 54, 340 90, 352 124 C 360 132, 372 140, 378 148 C 366 170, 338 200, 312 222 C 290 242, 262 256, 230 256 C 168 256, 118 216, 118 158 C 118 98, 172 54, 236 54 Z',
  mask: 'M118 172 C 150 186, 200 186, 250 178 C 290 172, 330 164, 370 150 C 358 176, 336 198, 312 220 C 288 240, 262 256, 230 256 C 176 256, 128 222, 118 172 Z',
  earL: 'M158 106 C 136 84, 128 52, 140 28 C 164 38, 190 54, 208 70 Z', earLIn: 'M148 46 C 164 56, 180 66, 190 74 L 150 98 C 146 80, 144 62, 148 46 Z',
  earR: 'M262 62 C 276 46, 290 32, 306 20 C 318 40, 324 64, 322 90 Z', earRIn: 'M302 38 C 310 52, 314 66, 314 80 L 280 64 Z',
  body: 'M215 245 C 270 245, 306 290, 306 338 C 306 392, 270 424, 214 424 C 160 424, 124 392, 124 338 C 124 288, 160 245, 215 245 Z',
  belly: 'M224 256 C 262 252, 294 268, 300 288 L 288 298 L 304 310 C 306 360, 290 400, 250 412 C 222 418, 200 404, 204 380 C 210 350, 214 300, 224 256 Z',
}
const KIT_ARM: P[] = [[296, 292], [310, 308]]

export function kitArt(s: KitStyle): ChickenArtSet {
  const f = KIT_FRAME, tc = uidOf('kt'), bc = uidOf('kb'), hc = uidOf('kh')
  const es = s.earScale ?? 1
  const earAt = (bx: number, by: number) => es === 1 ? '' : `transform="translate(${bx + (es > 1 ? 14 * (es - 1) : 0)} ${by + (es > 1 ? 24 * (es - 1) : 0)}) scale(${es}) translate(${-bx} ${-by})"`
  const head = `<g ${earAt(170, 100)}><path d="${KT.earL}" fill="${s.coat}"/><path d="${KT.earLIn}" fill="${s.cream}"/></g><g ${earAt(290, 80)}><path d="${KT.earR}" fill="${s.coat}"/><path d="${KT.earRIn}" fill="${s.cream}"/></g>` +
    `<defs><clipPath id="${hc}"><path d="${KT.head}"/></clipPath></defs><path d="${KT.head}" fill="${s.coat}"/><g clip-path="url(#${hc})">${s.headPatches ? ell(s.headPatches, s.patch!) : ''}</g><path d="${KT.mask}" fill="${s.cream}"/>` +
    (s.mask ? `<ellipse cx="286" cy="136" rx="30" ry="24" fill="${s.mask}"/>` : '') +
    `<circle cx="288" cy="135" r="14" fill="${s.eye ?? '#2c1a1c'}"/><circle cx="283" cy="130" r="4.5" fill="#fff"/><circle cx="370" cy="148" r="11" fill="${s.nose}"/>`
  const body = `<defs><clipPath id="${bc}"><path d="${KT.body}"/></clipPath></defs><path d="${KT.body}" fill="${s.coat}"/><g clip-path="url(#${bc})">${s.patches ? ell(s.patches, s.patch!) : ''}<path d="${KT.belly}" fill="${s.cream}"/></g>` +
    stroke([[204, 312], [236, 334]], 22, s.coat) + at(244, 340, 34, `<path d="${HOOF}" fill="${s.paw}" transform="scale(1.4)"/>`)
  const [sh, wr] = KIT_ARM
  return {
    comb: { label: 'Sem crista', svg: '' }, wattle: { label: 'Sem barbela', svg: '' },
    beak: { label: 'Focinho', svg: '', mouth: toRig(f, [350, 180]) },
    neck: { label: 'Sem pescoço', svg: '' },
    face: { label: `Raposinha (${s.label.toLowerCase()})`, ownEyes: true, svg: inFrame(f, head) },
    torso: { label: 'Corpinho de raposinha', svg: inFrame(f, body) },
    wing: { label: 'Bracinho', back: s.coat, backPath: 'M0 0 Z', hand: toRig(f, wr), svg: inFrame(f, stroke([sh, wr], 20, s.coat) + at(wr[0] + 6, wr[1] + 7, 46, `<path d="${HOOF}" fill="${s.paw}" transform="scale(1.3)"/>`)) },
    tail: { label: 'Rabinho', swing: 0.5, svg: inFrame(f, `<defs><clipPath id="${tc}"><path d="${KT.tail}"/></clipPath></defs><path d="${KT.tail}" fill="${s.tailCoat ?? s.coat}"/><g clip-path="url(#${tc})"><path d="${KT.tailTip}" fill="${s.tip}"/></g>`) },
    legs: {
      label: 'Perninhas', front: { drum: s.coat, shank: s.paw }, back: { drum: s.coat, shank: s.paw },
      shape: { thigh: 11, tib: 11, shin: 11, dxFront: 21.5, dxBack: 10.1, foot: `<path d="M-6 -2 L 6 -2 L 6 6 L -6 6 Z" fill="FILL"/>` },
    },
  }
}
