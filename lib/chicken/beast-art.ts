// Pig (Pig, the tank) and Ken (the fox, the assassin) drawn on the chicken's rig (lib/chicken/engine.ts), as breeds of the
// Vestiário: one variant per slot (look-art.ts). Flat folk style with no outlines, traced from Titi's "Game / Flat" art,
// facing right. Each drawing is made in the reference picture's pixels and brought to rig units by one transform per
// species (feet at 0, up is negative), so the near arm's shoulder lands on the rig's shoulder (the wing's pivot).
// The near arm is the "wing" (it holds the items, hand at `hand`), the far arm the back wing; the face draws its own
// eyes; the legs keep the rig's joints with thicker strokes and a hoof or paw for a foot.
import type { ChickenArtVariant, ChickenSlot } from './look-art'

type P = [number, number]
const fx = (n: number) => Math.round(n * 10) / 10
const pt = (p: P) => `${fx(p[0])} ${fx(p[1])}`
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]]
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]]
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const len = (a: P) => Math.hypot(a[0], a[1])
const ang = (a: P, b: P) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
const poly = (pts: P[], w: number, c: string) => `<path d="M${pts.map(pt).join(' L ')}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
const at = (p: P, deg: number, inner: string) => `<g transform="translate(${fx(p[0])} ${fx(p[1])}) rotate(${fx(deg)})">${inner}</g>`
const ells = (list: number[][], fill: string) => list.map(([x, y, rx, ry, r = 0]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="${fill}"/>`).join('')
// mix a color toward black (k > 0) or white (k < 0)
function shade(hex: string, k: number) {
  const to = k > 0 ? 0 : 255, a = Math.abs(k)
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - a) + to * a).toString(16).padStart(2, '0')).join('')
}
let uid = 0
const uidOf = (p: string) => `bst-${p}${++uid}`

// the reference picture's pixels → rig units
type Frame = { s: number; x0: number; ground: number }
const PIG_FRAME: Frame = { s: 0.287, x0: 397, ground: 790 }
const FOX_FRAME: Frame = { s: 0.27, x0: 410, ground: 858 }
const inFrame = (f: Frame, inner: string) => `<g transform="translate(${fx(-f.s * f.x0)} ${fx(-f.s * f.ground)}) scale(${f.s})">${inner}</g>`
const toRig = (f: Frame, p: P): [number, number] => [fx((p[0] - f.x0) * f.s), fx((p[1] - f.ground) * f.s)]
// a capsule from a to b (rig units), for the far arm's outline
function capsule(a: P, b: P, r: number) {
  const d = sub(b, a), l = len(d) || 1, n: P = [-d[1] / l * r, d[0] / l * r]
  return `M${pt(add(a, n))} L ${pt(add(b, n))} A ${r} ${r} 0 0 0 ${pt(sub(b, n))} L ${pt(sub(a, n))} A ${r} ${r} 0 0 0 ${pt(add(a, n))} Z`
}

// ---------- the chain on Pig's cuffs ----------
const CHAIN = { ring: '#6b6a75', edge: '#4c4b55', hi: '#9d9ca8', cuff: '#3d3b45', cuffHi: '#55535f', rivet: '#a3a1ad' }
function chainLinks(path: P[], link = 34, scale = 1.35) {
  const pts: P[] = [path[0]]
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    let a = path[i - 1]
    const b = path[i]
    let d = len(sub(b, a))
    while (acc + d >= link) { const t = (link - acc) / d; a = lerp(a, b, t); pts.push(a); d = len(sub(b, a)); acc = 0 }
    acc += d
  }
  let out = ''
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], m = lerp(a, b, 0.5), g = ang(a, b), last = i === pts.length - 2
    if (i % 2 === 0) {
      const rx = link * 0.68, ry = link * 0.4
      const arc = `M${fx(rx * 0.55)} ${fx(-ry * 0.95)} A ${fx(rx)} ${fx(ry)} 0 1 0 ${fx(rx * 0.8)} ${fx(ry * 0.7)}`
      out += last
        ? at(m, g, `<path d="${arc}" stroke="${CHAIN.edge}" stroke-width="${8 * scale}" fill="none" stroke-linecap="round"/><path d="${arc}" stroke="${CHAIN.ring}" stroke-width="${4.4 * scale}" fill="none" stroke-linecap="round"/>`)
        : at(m, g, `<ellipse rx="${fx(rx)}" ry="${fx(ry)}" stroke="${CHAIN.edge}" stroke-width="${8 * scale}" fill="none"/><ellipse rx="${fx(rx)}" ry="${fx(ry)}" stroke="${CHAIN.ring}" stroke-width="${4.4 * scale}" fill="none"/>`)
    } else {
      const h = link * 0.62
      out += at(m, g, `<path d="M${fx(-h)} 0 L ${fx(h)} 0" stroke="${CHAIN.edge}" stroke-width="${9 * scale}" stroke-linecap="round"/><path d="M${fx(-h * 0.7)} ${fx(-1.6 * scale)} L ${fx(h * 0.7)} ${fx(-1.6 * scale)}" stroke="${CHAIN.hi}" stroke-width="${2 * scale}" stroke-linecap="round"/>`)
    }
  }
  return out
}
const cuff = (p: P, deg: number, w = 40, h = 84) => at(p, deg, `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="9" fill="${CHAIN.cuff}"/><rect x="${-w / 2}" y="${-h / 2}" width="${w * 0.32}" height="${h}" rx="6" fill="${CHAIN.cuffHi}"/>` +
  [-0.3, 0, 0.3].map(f => `<circle cx="${fx(w * 0.12)}" cy="${fx(f * h)}" r="4.6" fill="${CHAIN.rivet}"/>`).join(''))

// ---------- Pig ----------
type PigStyle = { id: string; label: string; skin: string; snout: string; inner: string; cheek: string; vest: string; hoof: string; nostril: string; white: string; pupil: string; brow: string; mouth: string; tongue: string; belt?: string; wool?: string; flop?: boolean }
export const PIG_STYLES: PigStyle[] = [
  { id: 'rosa', label: 'Rosa', skin: '#f4917f', snout: '#f9c2a4', inner: '#e86c5b', cheek: '#ec6467', vest: '#d93d1d', hoof: '#5a2b28', nostril: '#8a3437', white: '#fbe9cf', pupil: '#2e1613', brow: '#5b2a22', mouth: '#7b1e27', tongue: '#df5a5e' },
  { id: 'hampshire', label: 'Hampshire', skin: '#2e2d34', snout: '#4a4851', inner: '#45434c', cheek: '#6d4c58', vest: '#d93d1d', hoof: '#1d1c21', nostril: '#141317', white: '#fbe9cf', pupil: '#1a1517', brow: '#141317', mouth: '#4a1218', tongue: '#c9545a', belt: '#efe8dc' },
  { id: 'mangalica', label: 'Mangalica', skin: '#ecd19c', snout: '#4f3832', inner: '#d9b578', cheek: '#e7a27f', vest: '#d93d1d', hoof: '#33231f', nostril: '#1f1412', white: '#fbf1dc', pupil: '#2e1613', brow: '#7a5a3a', mouth: '#6e2a24', tongue: '#d4625a', wool: '#cfac6a', flop: true },
]
const PIG = {
  head: 'M300 40 C 395 38, 462 100, 470 190 C 476 282, 410 346, 300 348 C 196 350, 124 290, 128 205 C 130 115, 200 42, 300 40 Z',
  earFar: 'M226 82 C 216 58, 202 44, 182 44 C 150 46, 106 92, 78 128 C 96 156, 150 186, 206 190 C 216 160, 224 112, 226 82 Z',
  earFarIn: 'M204 86 C 208 120, 208 158, 204 184',
  earNearFlop: 'M360 60 C 392 40, 440 52, 470 90 C 488 116, 492 150, 480 176 C 468 180, 452 168, 442 150 C 430 128, 402 98, 360 60 Z',
  earNear: 'M360 58 C 374 38, 400 26, 422 30 C 454 38, 482 62, 494 92 C 496 104, 484 112, 472 108 C 454 102, 442 110, 432 128 C 414 112, 386 82, 360 58 Z',
  earNearIn: 'M378 60 C 396 48, 420 50, 434 62 C 448 78, 454 96, 450 112 C 442 116, 436 122, 432 128 C 416 108, 396 80, 378 60 Z',
  body: 'M300 300 C 412 300, 474 362, 494 452 C 516 560, 470 702, 308 720 C 160 734, 70 642, 72 540 C 74 430, 168 302, 300 300 Z',
  vestL: 'M166 316 C 212 310, 262 328, 290 352 C 306 420, 318 500, 326 570 C 250 580, 148 574, 92 552 C 70 540, 58 516, 62 496 C 80 430, 118 346, 166 316 Z',
  vestR: 'M378 338 C 410 332, 438 338, 454 352 C 472 400, 492 460, 500 522 C 482 536, 462 545, 440 547 C 420 480, 400 400, 378 338 Z',
  belt: 'M250 318 C 300 306, 360 312, 410 330 C 404 380, 396 420, 392 452 C 350 446, 300 446, 262 452 C 258 410, 254 360, 250 318 Z',
  tail: 'M90 574 C 58 592, 18 586, 12 554 C 6 524, 40 508, 56 526 C 70 544, 54 566, 36 556',
  handHoof: 'M-6 -26 C 20 -30, 44 -14, 48 10 C 50 24, 40 30, 31 22 L 23 6 L 18 26 C 9 34, -6 28, -9 14 Z',
}
const woolOf = (s: PigStyle) => {
  if (!s.wool) return { defs: '', wool: (_d: string) => '' }
  const id = uidOf('wool')
  return { defs: `<defs><pattern id="${id}" width="22" height="20" patternUnits="userSpaceOnUse"><path d="M3 11 a5.5 5.5 0 1 1 8.5 4.4 M13 3 a4.6 4.6 0 1 1 6 5" stroke="${s.wool}" stroke-width="2.6" fill="none" stroke-linecap="round"/></pattern></defs>`, wool: (d: string) => `<path d="${d}" fill="url(#${id})"/>` }
}
function pigHead(s: PigStyle) {
  const { defs, wool } = woolOf(s)
  return defs + `<path d="${PIG.head}" fill="${s.skin}"/>${wool('M300 40 C 395 38, 462 100, 470 190 L 300 190 L 128 205 C 130 115, 200 42, 300 40 Z')}` +
    `<path d="M282 56 C 278 38, 290 26, 304 28 C 298 36, 298 46, 302 54 Z M300 52 C 304 34, 318 22, 332 26 C 322 34, 318 44, 318 54 Z" fill="${s.skin}"/>` +
    `<path d="${PIG.earFar}" fill="${s.skin}"/>${wool(PIG.earFar)}<path d="${PIG.earFarIn}" stroke="${s.inner}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>` +
    `<ellipse cx="254" cy="234" rx="33" ry="16" fill="${s.cheek}" opacity="0.85"/>` +
    `<ellipse cx="306" cy="170" rx="36" ry="39" fill="${s.white}"/><ellipse cx="322" cy="176" rx="13" ry="17" fill="${s.pupil}"/><circle cx="317" cy="168" r="4.2" fill="#fff"/>` +
    `<ellipse cx="394" cy="144" rx="22" ry="30" fill="${s.white}"/><ellipse cx="401" cy="151" rx="9" ry="14" fill="${s.pupil}"/><circle cx="398" cy="144" r="3" fill="#fff"/>` +
    `<path d="M262 100 C 270 88, 284 84, 298 88" stroke="${s.brow}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M360 86 C 370 78, 384 80, 394 90" stroke="${s.brow}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    `<path d="M316 246 C 332 254, 352 262, 374 266 C 380 288, 370 306, 350 307 C 330 307, 318 282, 316 246 Z" fill="${s.mouth}"/><path d="M328 286 C 340 278, 360 280, 370 293 C 362 305, 344 310, 334 301 Z" fill="${s.tongue}"/>` +
    `<ellipse cx="420" cy="222" rx="58" ry="50" fill="${s.snout}"/><ellipse cx="398" cy="226" rx="10" ry="17" transform="rotate(-8 398 226)" fill="${s.nostril}"/><ellipse cx="441" cy="220" rx="10" ry="17" transform="rotate(-8 441 220)" fill="${s.nostril}"/>` +
    (s.flop ? `<path d="${PIG.earNearFlop}" fill="${s.skin}"/>${wool(PIG.earNearFlop)}` : `<path d="${PIG.earNear}" fill="${s.skin}"/><path d="${PIG.earNearIn}" fill="${s.inner}"/>`)
}
// the near arm, from the shoulder (the rig's) down to the hoof, with its cuff and a broken chain hanging from it
const PIG_ARM: P[] = [[446, 372], [474, 428], [470, 482]]
function pigArm(s: PigStyle, dk = 0) {
  const [sh, el, wr] = PIG_ARM, dir = ang(el, wr), skin = shade(s.belt ?? s.skin, dk), hoof = shade(s.hoof, dk)
  const tip = add(wr, [Math.cos(dir * Math.PI / 180) * 4, Math.sin(dir * Math.PI / 180) * 4])
  const c = lerp(el, wr, 0.82)
  return poly([sh, el, wr], 56, skin) + at(tip, dir - 10, `<path d="${PIG.handHoof}" fill="${hoof}"/>`) + cuff(c, dir) +
    chainLinks([c, add(c, [-14, 44]), add(c, [-8, 98]), add(c, [12, 138])])
}

function pigParts(s: PigStyle): Record<ChickenSlot, ChickenArtVariant> {
  const f = PIG_FRAME, { defs, wool } = woolOf(s), back = shade(s.belt ?? s.skin, 0.18)
  const hand = toRig(f, PIG_ARM[2]), shoulder = toRig(f, PIG_ARM[0])
  return {
    comb: { label: 'Sem crista', svg: '' },
    wattle: { label: 'Sem barbela', svg: '' },
    beak: { label: 'Focinho', svg: '', mouth: toRig(f, [345, 284]) },
    neck: { label: 'Sem pescoço', svg: '' },
    face: { label: `Cabeça de porco ${s.label.toLowerCase()}`, ownEyes: true, svg: inFrame(f, pigHead(s)) },
    torso: { label: `Corpo de porco ${s.label.toLowerCase()} com colete`, svg: inFrame(f, defs + `<path d="${PIG.body}" fill="${s.skin}"/>${wool(PIG.body)}` + (s.belt ? `<path d="${PIG.belt}" fill="${s.belt}"/>` : '') + `<path d="${PIG.vestL}" fill="${s.vest}"/><path d="${PIG.vestR}" fill="${s.vest}"/>`) },
    wing: { label: 'Braço com algema', back, backPath: capsule(shoulder, hand, 7.5), backSvg: inFrame(f, pigArm(s, 0.14)), backOffset: [-30, 4], backFront: true, hand, holdDrop: 16, svg: inFrame(f, pigArm(s)) },
    tail: { label: 'Rabinho enrolado', swing: 0.6, svg: inFrame(f, `<path d="${PIG.tail}" stroke="${s.skin}" stroke-width="15" fill="none" stroke-linecap="round"/>`) },
    legs: {
      label: 'Pernas de porco', front: { drum: s.skin, shank: s.skin }, back: { drum: shade(s.skin, 0.12), shank: shade(s.skin, 0.12) },
      shape: { thigh: 18, tib: 18, shin: 17, dxFront: 1, dxBack: -36, foot: `<path d="M-9 -2 C -8 -6, 9 -6, 10 -2 L 11 6 L 2 6 L 0.5 2 L -1 6 L -10 6 Z" fill="${s.hoof}"/>` },
    },
  }
}

// ---------- Ken (the foxes) ----------
type FoxStyle = { id: string; label: string; coat: string; band: string; cream: string; dark: string; tip: string; nose: string; iris: string; lid: string; tail: string; silver?: string; pupil?: boolean; tailCoat?: string; mask?: string; patch?: string; patches?: number[][]; headPatches?: number[][]; earScale?: number; squint?: boolean }
export const FOX_STYLES: FoxStyle[] = [
  { id: 'vermelha', label: 'Raposa-vermelha', coat: '#f0801f', band: '#d0611a', cream: '#fae4c8', dark: '#5a2a20', tip: '#4a2219', nose: '#3a1c16', iris: '#3e1d17', lid: '#3a1a14', tail: '#fae4c8' },
  { id: 'prateada', label: 'Raposa-prateada', coat: '#383840', band: '#2a2a31', cream: '#d9dbe0', dark: '#18181c', tip: '#121215', nose: '#0d0d0f', iris: '#e5a62b', lid: '#0d0d0f', tail: '#f4f4f1', silver: '#b9bcc4', pupil: true },
  { id: 'marmorizada', label: 'Raposa-marmorizada', coat: '#f1f1ef', band: '#55555e', cream: '#ffffff', dark: '#6a6a73', tip: '#2a2a30', nose: '#141416', iris: '#7a4e26', lid: '#1a1a1e', tail: '#ffffff', tailCoat: '#8a8a94', mask: '#3a3a42', patch: '#4a4a53', patches: [[376, 430, 30, 46, 20], [458, 480, 16, 40, -10], [392, 560, 26, 34, 0]], headPatches: [[340, 196, 46, 26, -24], [452, 160, 30, 16, 6]] },
  { id: 'artico', label: 'Raposa-do-ártico', coat: '#f3f2ee', band: '#e2e0d9', cream: '#ffffff', dark: '#d6d3cb', tip: '#e9e7e1', nose: '#2a2626', iris: '#3a2e28', lid: '#4a4540', tail: '#ffffff', tailCoat: '#f3f2ee', earScale: 0.72 },
  { id: 'cinzenta', label: 'Raposa-cinzenta', coat: '#8e8c8b', band: '#a8653a', cream: '#f1ece4', dark: '#b2622f', tip: '#6a4a36', nose: '#1a1717', iris: '#3a2a1e', lid: '#2a2422', tail: '#1d1b1c', silver: '#dcdad6', patch: '#b8673a', patches: [[352, 430, 20, 46, 12], [470, 440, 16, 40, -10]] },
  { id: 'corsac', label: 'Raposa-corsac', coat: '#cdb58f', band: '#b89d74', cream: '#f3ecdf', dark: '#b8996b', tip: '#8a7558', nose: '#2a211b', iris: '#3a2a1e', lid: '#5a4632', tail: '#4a3a2c', silver: '#ebe0c9' },
  { id: 'tibetana', label: 'Raposa-tibetana', coat: '#c98a4c', band: '#a8703e', cream: '#efe6d6', dark: '#9e8a74', tip: '#a8703e', nose: '#2a1f1a', iris: '#4a3220', lid: '#3a2a1e', tail: '#f4f0e8', earScale: 0.74, squint: true, patch: '#aaa49b', patches: [[344, 560, 30, 70, 8], [476, 560, 24, 70, -8]] },
  { id: 'feneco', label: 'Feneco', coat: '#e8c68e', band: '#d6ae6e', cream: '#fbf2df', dark: '#c49a5f', tip: '#e8c68e', nose: '#2c1f19', iris: '#2c1d15', lid: '#6b4a2e', tail: '#4a3426', earScale: 1.4 },
  { id: 'deserto', label: 'Raposa-do-deserto', coat: '#c8b491', band: '#b8875a', cream: '#f4ede0', dark: '#c08a58', tip: '#9a7550', nose: '#2a211b', iris: '#3a2a1e', lid: '#4a3a2a', tail: '#2a2320', silver: '#e6dcc8', earScale: 1.24 },
  { id: 'morcego', label: 'Raposa-orelhas-de-morcego', coat: '#9c8c74', band: '#5a4c3e', cream: '#e6dccb', dark: '#2a2522', tip: '#2a2522', nose: '#141212', iris: '#2a2018', lid: '#141212', tail: '#1f1b19', silver: '#d4c8b2', mask: '#2a2522', earScale: 1.5 },
]
const FOX = {
  earA: 'M235 15 C 215 80, 225 180, 270 262 L 352 175 C 320 110, 280 50, 235 15 Z',
  earAIn: 'M252 62 C 246 130, 258 200, 282 246 L 336 174 C 314 126, 286 86, 252 62 Z',
  earB: 'M490 12 C 452 40, 418 95, 406 150 L 500 226 C 515 150, 512 70, 490 12 Z',
  earBIn: 'M484 58 C 464 100, 452 150, 450 186 L 498 214 C 506 160, 502 102, 484 58 Z',
  dome: 'M262 270 C 262 210, 320 140, 420 138 C 490 138, 536 190, 536 262 C 536 300, 500 330, 420 336 C 340 340, 262 320, 262 270 Z',
  mask: 'M262 262 L 224 287 L 266 298 L 252 322 L 300 328 C 330 340, 380 350, 420 348 C 455 346, 488 332, 512 308 C 522 298, 530 288, 534 280 L 558 264 L 524 262 C 510 272, 490 272, 470 272 C 452 276, 440 286, 420 290 C 395 296, 365 294, 345 286 C 320 276, 290 268, 262 262 Z',
  eyeN: 'M364 262 C 374 250, 408 246, 426 258 C 418 278, 384 284, 364 262 Z',
  eyeF: 'M474 258 C 480 246, 498 244, 506 254 C 502 270, 484 272, 474 258 Z',
  eyeNSq: 'M364 262 C 376 254, 408 252, 426 258 C 416 270, 384 272, 364 262 Z',
  eyeFSq: 'M474 257 C 482 250, 498 249, 506 254 C 500 263, 484 264, 474 257 Z',
  torso: 'M350 382 C 390 372, 440 378, 470 395 C 480 440, 462 482, 458 520 C 462 560, 478 600, 472 632 C 455 652, 430 656, 410 648 C 380 650, 344 642, 330 620 C 346 580, 362 546, 362 516 C 358 470, 338 420, 350 382 Z',
  bib: 'M380 382 C 400 372, 440 372, 458 386 L 446 404 L 456 418 L 442 432 C 440 480, 438 560, 432 640 C 425 646, 415 646, 410 640 C 408 560, 404 476, 400 444 L 380 434 L 390 420 L 368 410 L 384 398 Z',
  hipTuft: 'M336 598 L 298 612 L 326 616 L 304 632 L 342 626 Z',
  neck: 'M376 320 L 428 320 L 440 392 L 370 392 Z',
  // the tail at rest, as traced; its six bones bend it in poses (planagem, rabada) in a later step
  tail: 'M25 350 C 70 330, 150 322, 200 368 C 236 400, 246 452, 242 502 C 240 560, 272 608, 338 610 L 352 640 C 300 690, 240 714, 170 712 C 92 708, 44 652, 46 582 C 50 520, 34 420, 25 350 Z',
  tailTip: 'M-20 300 L 300 300 L 300 420 L 232 420 L 214 478 L 196 438 L 172 494 L 150 446 L 128 500 L 110 474 L 90 520 L 72 500 L 52 540 L -20 540 Z',
  fist: 'M-4 -24 C 14 -30, 36 -22, 40 -2 C 44 16, 32 30, 12 30 C -6 30, -16 18, -16 4 C -16 -8, -14 -18, -4 -24 Z',
  knuckles: 'M22 -18 C 26 -8, 26 2, 22 10 M30 -10 C 33 -2, 33 6, 30 12',
}
const frostOf = (s: FoxStyle) => {
  if (!s.silver) return { defs: '', frost: (_d: string) => '' }
  const id = uidOf('sv')
  return { defs: `<defs><pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><path d="M2 3 l6 0 M7 10 l5 0" stroke="${s.silver}" stroke-width="1.8" stroke-linecap="round"/></pattern></defs>`, frost: (d: string) => `<path d="${d}" fill="url(#${id})" opacity="0.5"/>` }
}
function foxHead(s: FoxStyle) {
  const { defs, frost } = frostOf(s)
  const cA = uidOf('ea'), cB = uidOf('eb'), eN = uidOf('en'), eF = uidOf('ef'), dc = uidOf('dm')
  const es = s.earScale ?? 1
  const earT = (cx: number, cy: number) => es === 1 ? '' : `transform="translate(${cx} ${cy}) scale(${es}) translate(${-cx} ${-cy})"`
  const EN = s.squint ? FOX.eyeNSq : FOX.eyeN, EF = s.squint ? FOX.eyeFSq : FOX.eyeF
  return defs +
    `<g ${earT(311, 218)}><clipPath id="${cA}"><path d="${FOX.earA}"/></clipPath><path d="${FOX.earA}" fill="${s.coat}"/><g clip-path="url(#${cA})"><path d="M200 0 L 300 0 L 300 70 L 236 196 L 200 196 Z" fill="${s.tip}"/><path d="M200 196 L 236 196 L 300 70 L 300 100 L 248 214 L 200 214 Z" fill="${s.band}"/></g><path d="${FOX.earAIn}" fill="${s.cream}"/></g>` +
    `<g ${earT(453, 188)}><clipPath id="${cB}"><path d="${FOX.earB}"/></clipPath><path d="${FOX.earB}" fill="${s.coat}"/><g clip-path="url(#${cB})"><path d="M400 0 L 520 0 L 520 40 L 420 120 L 400 120 Z" fill="${s.tip}"/><path d="M400 120 L 420 120 L 470 80 L 470 200 L 400 200 Z" fill="${s.band}"/></g><path d="${FOX.earBIn}" fill="${s.cream}"/></g>` +
    `<path d="${FOX.dome}" fill="${s.coat}"/>${frost(FOX.dome)}` +
    (s.headPatches ? `<clipPath id="${dc}"><path d="${FOX.dome}"/></clipPath><g clip-path="url(#${dc})">${ells(s.headPatches, s.patch!)}</g>` : '') +
    `<path d="${FOX.mask}" fill="${s.cream}"/>` + (s.mask ? ells([[394, 262, 46, 28, -6], [492, 256, 26, 22, 0]], s.mask) : '') +
    `<path d="M420 154 C 430 140, 446 138, 454 146 C 442 146, 434 152, 430 160 Z" fill="${s.coat}"/>` +
    `<path d="${EN}" fill="${s.cream}"/><clipPath id="${eN}"><path d="${EN}"/></clipPath><circle cx="403" cy="265" r="17" fill="${s.iris}" clip-path="url(#${eN})"/>${s.pupil ? `<circle cx="404" cy="266" r="7" fill="#120d0b" clip-path="url(#${eN})"/>` : ''}` +
    `<path d="M354 256 C 372 236, 408 234, 432 252" stroke="${s.lid}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M356 254 L 343 247" stroke="${s.lid}" stroke-width="5.5" stroke-linecap="round"/>` +
    `<path d="${EF}" fill="${s.cream}"/><clipPath id="${eF}"><path d="${EF}"/></clipPath><circle cx="494" cy="259" r="11.5" fill="${s.iris}" clip-path="url(#${eF})"/>` +
    `<path d="M469 254 C 480 239, 499 237, 509 250" stroke="${s.lid}" stroke-width="6.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M384 208 C 394 200, 408 204, 414 214" stroke="${s.lid}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M480 210 C 486 204, 494 206, 498 214" stroke="${s.lid}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M476 292 C 490 286, 506 288, 512 294 C 506 306, 496 312, 490 314 C 482 308, 476 300, 476 292 Z" fill="${s.nose}"/>` +
    `<path d="M410 318 C 426 334, 452 336, 472 320" stroke="${s.lid}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M410 318 L 402 314" stroke="${s.lid}" stroke-width="4" stroke-linecap="round"/>`
}
const FOX_ARM: P[] = [[462, 412], [500, 466], [516, 516]]
function foxArm(s: FoxStyle, dk = 0) {
  const [sh, el, wr] = FOX_ARM, dir = ang(el, wr), coat = shade(s.coat, dk)
  return poly([sh, el], 26, coat) + poly([el, wr], 22, coat) + at(wr, dir - 70, `<path d="${FOX.fist}" fill="${shade(s.dark, dk)}"/><path d="${FOX.knuckles}" stroke="${s.tip}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55"/>`)
}
function foxParts(s: FoxStyle): Record<ChickenSlot, ChickenArtVariant> {
  const f = FOX_FRAME, { defs, frost } = frostOf(s), tc = uidOf('tz'), tl = uidOf('tl')
  const hand = toRig(f, FOX_ARM[2]), shoulder = toRig(f, FOX_ARM[0])
  return {
    comb: { label: 'Sem crista', svg: '' },
    wattle: { label: 'Sem barbela', svg: '' },
    beak: { label: 'Focinho', svg: '', mouth: toRig(f, [440, 326]) },
    neck: { label: 'Pescoço', svg: '' },
    face: { label: `Cabeça de ${s.label.toLowerCase()}`, ownEyes: true, svg: inFrame(f, foxHead(s)) },
    torso: {
      label: `Corpo de ${s.label.toLowerCase()}`,
      svg: inFrame(f, defs + `<path d="${FOX.neck}" fill="${s.coat}"/><path d="${FOX.torso}" fill="${s.coat}"/>${frost(FOX.torso)}` +
        (s.patches ? `<clipPath id="${tc}"><path d="${FOX.torso}"/></clipPath><g clip-path="url(#${tc})">${ells(s.patches, s.patch!)}</g>` : '') +
        `<path d="${FOX.bib}" fill="${s.cream}"/><path d="${FOX.hipTuft}" fill="${s.coat}"/>`),
    },
    wing: { label: 'Braço de raposa', back: shade(s.coat, 0.2), backPath: capsule(shoulder, hand, 3.2), backSvg: inFrame(f, foxArm(s, 0.16)), backOffset: [-20, 2], backFront: true, hand, holdDrop: 24, svg: inFrame(f, foxArm(s)) },
    tail: {
      label: `Rabo de ${s.label.toLowerCase()}`, swing: 0.5,
      svg: inFrame(f, `<clipPath id="${tl}"><path d="${FOX.tail}"/></clipPath><path d="${FOX.tail}" fill="${s.tailCoat ?? s.coat}"/>${frost(FOX.tail)}<g clip-path="url(#${tl})"><path d="${FOX.tailTip}" fill="${s.tail}"/></g>`),
    },
    legs: {
      label: 'Pernas de raposa', front: { drum: s.coat, shank: s.dark }, back: { drum: shade(s.coat, 0.15), shank: shade(s.dark, 0.15) },
      shape: { thigh: 11, tib: 9, shin: 8, dxFront: 8, dxBack: 34, foot: `<path d="M-8 -3 C -5 -7, 9 -7, 14 -2 C 16 1, 15 5, 11 5 L -9 5 C -12 4, -11 -1, -8 -3 Z" fill="FILL"/>` },
    },
  }
}

// ---------- the breeds ----------
export type BeastClass = 'porco' | 'raposa'
export const BEAST_BREEDS = [
  ...PIG_STYLES.map(s => ({ id: `porco-${s.id}`, label: s.id === 'rosa' ? 'Pig' : `Pig ${s.label}`, cat: 'porcos', klass: 'porco' as BeastClass, parts: pigParts(s) })),
  ...FOX_STYLES.map(s => ({ id: `raposa-${s.id}`, label: s.id === 'vermelha' ? 'Ken' : `Ken ${s.label.replace('Raposa-', '')}`, cat: 'raposas', klass: 'raposa' as BeastClass, parts: foxParts(s) })),
]
/** The species class of a breed or part variant id: the chickens' are 'galinha'. */
export function variantClass(id: string): 'galinha' | BeastClass {
  return id.startsWith('porco-') ? 'porco' : id.startsWith('raposa-') ? 'raposa' : 'galinha'
}
