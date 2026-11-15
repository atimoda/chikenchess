// The art of the Gaiolas (lib/pigchicken/cages.ts), one model per item, as SVG in the model's own units: what is
// behind the souls (the far bars, the floor, the perches), what is in front of them (the near bars, the frame, the
// hook), where the birds may sit and where the floor is for the chicks. Also each model's simplified silhouette, the
// counter of a cage beside a player's avatar. Pure strings and numbers: the canvas side is in
// components/pigchicken/draw/cages.ts.
import type { ItemId } from './items'

export type CageArt = {
  w: number; h: number
  hang: [number, number] // where the string that holds it ends (the top of its hook or handle)
  birds: [number, number, number, number] // the box the birds' middles stay in: x, y, width, height
  floor: [number, number, number] // the chicks stand on it: from x, to x, at y
  defs?: string
  back: string
  front: string
  sil: [number, number, string] // the silhouette: width, height and its path, from its own top left
}

const f = (n: number) => +n.toFixed(2)
const hook = (x: number, y: number, color: string, w = 2) => `<path d="M${x} ${y} L${x} ${y - 8} M${x} ${y - 8} a4.5 4.5 0 1 1 4.5 -4.5" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`
const vbars = (x0: number, x1: number, step: number, y0: number, y1: number, attrs: string) => {
  let d = ''
  for (let x = x0; x <= x1 + 0.01; x += step) d += `M${f(x)} ${y0} L${f(x)} ${y1} `
  return `<path d="${d}" ${attrs}/>`
}
const shade = (hex: string, k: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')
const perch = (x0: number, x1: number, y: number, col = '#c9a36b') => `<path d="M${x0} ${y} L${x1} ${y}" stroke="${shade(col, 0.72)}" stroke-width="3.4" stroke-linecap="round"/><path d="M${x0} ${y - 0.6} L${x1} ${y - 0.6}" stroke="${col}" stroke-width="1.8" stroke-linecap="round"/>`

// Básica: a black dome, round, hanging by its hook (the one found most)
function basic(): CageArt {
  const cx = 60, R = 44, yS = 78, yB = 150, yT = 26, ink = '#1b1d22'
  const bar = (th: number) => {
    const dx = R * Math.sin(th * Math.PI / 180), x = f(cx + dx)
    return Math.abs(dx) < 0.5 ? `M${x} ${yB} L${x} ${yT} ` : `M${x} ${yB} L${x} ${yS} A${f(Math.abs(dx))} ${yS - yT} 0 0 ${dx < 0 ? 1 : 0} ${cx} ${yT} `
  }
  let fr = '', bk = ''
  for (let t = -90; t <= 90; t += 15) fr += bar(t)
  for (let t = -82.5; t <= 82.5; t += 15) bk += bar(t)
  return {
    w: 120, h: 170, hang: [60, 6], birds: [24, 52, 72, 78], floor: [26, 94, 150],
    back: `<ellipse cx="${cx}" cy="${yB}" rx="${R}" ry="7" fill="#2a2d34"/><path d="${bk}" fill="none" stroke="${ink}" stroke-width="1.1" opacity="0.38"/>${perch(40, 80, 104, '#3a3d45')}`,
    front: `<path d="${fr}" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M${cx - R} ${yS} A${R} 5 0 0 0 ${cx + R} ${yS}" fill="none" stroke="${ink}" stroke-width="2.2"/>
      <path d="M${cx - R} ${yB} A${R} 7 0 0 0 ${cx + R} ${yB} L${cx + R} ${yB + 8} A${R} 7 0 0 1 ${cx - R} ${yB + 8} Z" fill="${ink}"/>
      <path d="M${cx - R + 4} ${yB + 5} A${R} 7 0 0 0 ${cx + R - 4} ${yB + 5}" fill="none" stroke="#4a4e58" stroke-width="0.9"/>
      <ellipse cx="${cx}" cy="${yT}" rx="7" ry="2.6" fill="${ink}"/>${hook(cx, yT, ink, 2.2)}`,
    sil: [20, 24, 'M2 23 L2 11 A8 9 0 0 1 18 11 L18 23 Z M10 2 L10 0'],
  }
}

// De arame: black wire with an arched top and a golden tray
function wire(): CageArt {
  const ink = '#23252b', shape = 'M12 132 L12 58 Q12 44 26 37 Q70 14 114 37 Q128 44 128 58 L128 132 Z'
  return {
    w: 140, h: 150, hang: [70, 6], birds: [18, 44, 104, 62], floor: [18, 122, 131],
    defs: `<clipPath id="cage-wire-c"><path d="${shape}"/></clipPath>`,
    back: `<path d="${shape}" fill="rgba(20,22,28,0.10)"/><g clip-path="url(#cage-wire-c)">${vbars(16, 124, 9, 10, 132, `stroke="${ink}" stroke-width="1" opacity="0.35" fill="none"`)}</g>
      <rect x="10" y="131" width="120" height="6" fill="#b8963a"/><rect x="10" y="131" width="120" height="2" fill="#e2c566"/>${perch(30, 62, 84)}${perch(82, 112, 76)}`,
    front: `<g clip-path="url(#cage-wire-c)">${vbars(12, 128, 9, 10, 132, `stroke="${ink}" stroke-width="1.5" fill="none"`)}</g>
      <path d="${shape}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M12 74 L128 74 M12 114 L128 114 M12 124 L128 124" stroke="${ink}" stroke-width="1.5"/>
      <rect x="8" y="136" width="124" height="4" rx="1" fill="#5d6570"/>
      <path d="M16 140 q-3 6 -6 2 M124 140 q3 6 6 2" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M64 24 L64 12 a6 6 0 0 1 12 0 L76 24" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`,
    sil: [24, 22, 'M2 21 L2 10 Q2 7 5 6 Q12 2 19 6 Q22 7 22 10 L22 21 Z'],
  }
}

// Concorde: white wire, a pitched roof and a yellow tray
function concorde(): CageArt {
  const white = '#f4f6f8', under = 'rgba(40,52,74,0.45)'
  const body = (st: string, w: number) => `${vbars(26, 114, 8, 52, 152, `stroke="${st}" stroke-width="${w}" fill="none"`)}<path d="M24 52 L116 52 M24 86 L116 86 M24 120 L116 120" stroke="${st}" stroke-width="${w}"/><rect x="24" y="52" width="92" height="100" fill="none" stroke="${st}" stroke-width="${w + 0.5}"/>`
  const roof = (st: string, w: number) => {
    let d = ''
    for (let i = 0; i <= 10; i++) { const k = i / 10; d += `M${f(50 + 40 * k)} 22 L${f(10 + 120 * k)} 52 ` }
    return `<path d="${d}" stroke="${st}" stroke-width="${w}" fill="none"/><path d="M10 52 L50 22 L90 22 L130 52 Z" fill="none" stroke="${st}" stroke-width="${w + 0.6}" stroke-linejoin="round"/>`
  }
  return {
    w: 140, h: 182, hang: [70, 8], birds: [30, 56, 80, 82], floor: [28, 112, 156],
    back: `<rect x="24" y="52" width="92" height="100" fill="rgba(255,255,255,0.10)"/><path d="M10 52 L50 22 L90 22 L130 52 Z" fill="rgba(255,255,255,0.16)"/>
      <path d="M14 152 L126 152 L122 160 L18 160 Z" fill="#c99400"/>${perch(44, 84, 82)}${perch(60, 104, 128)}
      <rect x="28" y="118" width="14" height="10" rx="1.5" fill="#2f6fd0"/><rect x="98" y="116" width="14" height="10" rx="1.5" fill="#2f6fd0"/>`,
    front: `${body(under, 2.2)}${roof(under, 2.2)}${body(white, 1.1)}${roof(white, 1.1)}
      <path d="M10 152 L130 152 L124 174 Q123 177 119 177 L21 177 Q17 177 16 174 Z" fill="#f6c315"/>
      <path d="M10 152 L130 152 L129 156 L11 156 Z" fill="#ffdb4d"/><path d="M18 174 L122 174" stroke="#d9a60c" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M65 22 L65 10 L75 10 L75 22" fill="none" stroke="${under}" stroke-width="2.6" stroke-linejoin="round"/><path d="M65 22 L65 10 L75 10 L75 22" fill="none" stroke="${white}" stroke-width="1.3" stroke-linejoin="round"/>`,
    sil: [24, 24, 'M1 8 L8 2 L16 2 L23 8 L20 8 L20 19 L23 19 L21 23 L3 23 L1 19 L4 19 L4 8 Z'],
  }
}

// De madeira: an arched wooden show cage with a drawer
function wood(): CageArt {
  const brown = '#7b3f1d', hi = '#a9642f', shape = 'M12 112 L12 44 Q80 6 148 44 L148 112 Z'
  return {
    w: 160, h: 136, hang: [80, 22], birds: [20, 36, 120, 56], floor: [20, 140, 108],
    defs: `<clipPath id="cage-wood-c"><path d="${shape}"/></clipPath>`,
    back: `<path d="${shape}" fill="rgba(238,236,222,0.42)"/><path d="M14 108 L146 108 L146 112 L14 112 Z" fill="#3a2a20"/>${perch(54, 108, 92, '#8c5a34')}${perch(66, 96, 102, '#8c5a34')}`,
    front: `<g clip-path="url(#cage-wood-c)">${vbars(17, 145, 5.2, 0, 112, 'stroke="rgba(40,30,24,0.35)" stroke-width="1.5" fill="none"')}${vbars(17, 145, 5.2, 0, 112, 'stroke="#f3f1e8" stroke-width="0.8" fill="none"')}</g>
      <path d="M12 66 L148 66 M12 90 L148 90" stroke="${brown}" stroke-width="3"/><path d="M12 65 L148 65 M12 89 L148 89" stroke="${hi}" stroke-width="0.8"/>
      <path d="M26 50 Q80 22 134 50" fill="none" stroke="${brown}" stroke-width="2"/>
      <path d="M12 44 Q80 6 148 44" fill="none" stroke="${brown}" stroke-width="5.5" stroke-linecap="round"/><path d="M14 42 Q80 5 146 42" fill="none" stroke="${hi}" stroke-width="1"/>
      <path d="M12 42 L12 126 M148 42 L148 126" stroke="${brown}" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="10" y="110" width="140" height="14" fill="${brown}"/><rect x="16" y="113" width="104" height="8" fill="#e2b77c"/><rect x="124" y="113" width="20" height="8" fill="#e2b77c"/>
      <circle cx="68" cy="117" r="2" fill="#8f3b22"/><circle cx="134" cy="117" r="2" fill="#8f3b22"/>
      <path d="M10 124 L150 124" stroke="#59290f" stroke-width="2"/>`,
    sil: [28, 20, 'M2 19 L2 9 Q14 1 26 9 L26 19 Z'],
  }
}

// Gaiolão arqueado: a big dark-wood cage with two arches and a hook
function arch(): CageArt {
  const brown = '#6a2c20', hi = '#9b4a36', shape = 'M10 132 L10 60 Q100 -2 190 60 L190 132 Z'
  return {
    w: 200, h: 158, hang: [100, 15], birds: [20, 40, 160, 76], floor: [18, 182, 130],
    defs: `<clipPath id="cage-arch-c"><path d="${shape}"/></clipPath>`,
    back: `<path d="${shape}" fill="rgba(245,240,232,0.20)"/><g clip-path="url(#cage-arch-c)">${vbars(14, 186, 6, 0, 132, 'stroke="#f1eee6" stroke-width="0.8" opacity="0.4" fill="none"')}</g>
      <path d="M12 128 L188 128 L188 134 L12 134 Z" fill="#35211b"/>${perch(52, 92, 84)}${perch(112, 150, 98)}${perch(76, 124, 66)}`,
    front: `<g clip-path="url(#cage-arch-c)">${vbars(11, 189, 6, 0, 132, 'stroke="rgba(40,24,20,0.35)" stroke-width="1.6" fill="none"')}${vbars(11, 189, 6, 0, 132, 'stroke="#f6f4ee" stroke-width="0.85" fill="none"')}</g>
      <path d="M24 78 Q100 30 176 78" fill="none" stroke="${brown}" stroke-width="2.6"/>
      <path d="M10 92 L190 92 M10 114 L190 114" stroke="${brown}" stroke-width="2.6"/>
      <path d="M10 60 Q100 -2 190 60" fill="none" stroke="${brown}" stroke-width="6" stroke-linecap="round"/><path d="M12 58 Q100 -3 188 58" fill="none" stroke="${hi}" stroke-width="1.1"/>
      <path d="M10 58 L10 150 M190 58 L190 150" stroke="${brown}" stroke-width="5" stroke-linecap="round"/>
      <rect x="8" y="132" width="184" height="16" fill="${brown}"/><path d="M12 137 L188 137 M12 142 L188 142" stroke="${hi}" stroke-width="0.7" opacity="0.7"/>
      <path d="M8 148 L192 148" stroke="#421810" stroke-width="2.4"/><circle cx="66" cy="141" r="1.8" fill="#2a120d"/><circle cx="134" cy="141" r="1.8" fill="#2a120d"/>
      <rect x="40" y="118" width="46" height="2.4" fill="${brown}"/><rect x="114" y="118" width="46" height="2.4" fill="${brown}"/>
      ${hook(100, 28, '#3d4046', 2)}`,
    sil: [32, 23, 'M2 22 L2 11 Q16 0 30 11 L30 22 Z'],
  }
}

// Voadeira: a long honey-wood flight cage with a divider in the middle
function flight(): CageArt {
  const honey = '#c5852c', hi = '#e7b25a', dark = '#93601c', bar = '#f0e3a0'
  return {
    w: 250, h: 130, hang: [125, 7], birds: [16, 34, 218, 60], floor: [16, 234, 104],
    back: `<rect x="10" y="26" width="230" height="82" fill="rgba(250,240,200,0.16)"/>${vbars(14, 236, 6, 26, 106, `stroke="${bar}" stroke-width="0.8" opacity="0.4" fill="none"`)}
      <rect x="14" y="102" width="222" height="6" fill="#9aa1ad"/>${perch(34, 70, 62, '#e3cf9c')}${perch(86, 114, 82, '#e3cf9c')}${perch(140, 172, 58, '#e3cf9c')}${perch(186, 222, 80, '#e3cf9c')}`,
    front: `${vbars(13, 237, 6, 26, 106, 'stroke="rgba(70,50,10,0.35)" stroke-width="1.5" fill="none"')}${vbars(13, 237, 6, 26, 106, `stroke="${bar}" stroke-width="0.85" fill="none"`)}
      <path d="M10 50 L240 50 M10 74 L240 74 M10 96 L240 96" stroke="${honey}" stroke-width="2.4"/>
      <path d="M16 18 L246 18 L240 26 L10 26 Z" fill="${hi}"/><path d="M16 18 L246 18 L240 26 L10 26 Z" fill="none" stroke="${dark}" stroke-width="1"/>
      <path d="M10 26 L240 26" stroke="${honey}" stroke-width="4"/>
      <path d="M10 26 L10 120 M240 26 L240 120" stroke="${honey}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M123 26 L123 106 M127 26 L127 106" stroke="#eef0f3" stroke-width="2"/><path d="M125 26 L125 106" stroke="#aab0ba" stroke-width="1"/>
      <rect x="8" y="106" width="234" height="14" fill="${honey}"/><path d="M8 108 L242 108" stroke="${hi}" stroke-width="1.2"/><path d="M8 120 L242 120" stroke="${dark}" stroke-width="2"/>
      <circle cx="70" cy="114" r="1.7" fill="#4a2f0c"/><circle cx="180" cy="114" r="1.7" fill="#4a2f0c"/>
      ${hook(125, 20, '#4a4e58', 2)}`,
    sil: [38, 18, 'M2 17 L2 4 L4 2 L36 2 L36 17 Z'],
  }
}

export const CAGE_ART: Partial<Record<ItemId, CageArt>> = { cage: basic(), cageWire: wire(), cageConcorde: concorde(), cageWood: wood(), cageArch: arch(), cageFlight: flight() }
export const cageArt = (item: ItemId): CageArt => CAGE_ART[item] ?? CAGE_ART.cage!

// the whole cage as one SVG fragment with its middle at (0, 0) and the box around it (the item's art: racks, the
// editor's palette, an empty cage lying in the world before its picture is ready)
export function cageItemArt(item: ItemId): { svg: string; box: [number, number, number, number] } {
  const a = cageArt(item)
  return { box: [-a.w / 2, -a.h / 2, a.w, a.h], svg: `<g transform="translate(${-a.w / 2} ${-a.h / 2})">${a.defs ? `<defs>${a.defs}</defs>` : ''}${a.back}${a.front}</g>` }
}
