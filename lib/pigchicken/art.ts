// SVG art of the items held in the chicken's wing: pointing right, grip at (0, 0), in rig units.
// `box` is the art's bounding box [x, y, width, height], used to draw it on the canvas (pickups, inventory).
import type { ItemId } from './items'
import { CAGE_ART, cageItemArt } from './cage-art'

type Art = { svg: string; box: [number, number, number, number]; pic?: Pic }
// a drawing (PNG) placed in rig units: `len` along its height, the point (gx, gy) of the picture (0..1) at the grip,
// then turned `rot` degrees around the grip (90 turns its top to point forward, -90 its bottom)
type Pic = { src: string; iw: number; ih: number; len: number; gx: number; gy: number; rot: number }

function picture(p: Pic): Art {
  const h = p.len, w = (p.len * p.iw) / p.ih
  const x = -p.gx * w, y = -p.gy * h
  const r = (p.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
  const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [px * c - py * s, px * s + py * c])
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1])
  const l = Math.floor(Math.min(...xs)), t = Math.floor(Math.min(...ys))
  return {
    pic: p,
    box: [l, t, Math.ceil(Math.max(...xs)) - l, Math.ceil(Math.max(...ys)) - t],
    svg: `<g transform="rotate(${p.rot})"><image href="${p.src}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" preserveAspectRatio="none"/></g>`,
  }
}
// a red gummy bear standing at (cx, cy), translucent like the real candy: a darker rim, a lighter core and a shine
function gummyBear(cx: number, cy: number, rot: number) {
  const parts = (dx: number, dy: number, k: number) => `
      <circle cx="${cx - 4.6 * k + dx}" cy="${cy - 10.4 * k + dy}" r="${2.7 * k}"/><circle cx="${cx + 4.6 * k + dx}" cy="${cy - 10.4 * k + dy}" r="${2.7 * k}"/>
      <circle cx="${cx + dx}" cy="${cy - 6.4 * k + dy}" r="${5.6 * k}"/>
      <ellipse cx="${cx + dx}" cy="${cy + 3 * k + dy}" rx="${6.2 * k}" ry="${6.8 * k}"/>
      <ellipse cx="${cx - 6.4 * k + dx}" cy="${cy + 0.6 * k + dy}" rx="${2.5 * k}" ry="${3.4 * k}"/><ellipse cx="${cx + 6.4 * k + dx}" cy="${cy + 0.6 * k + dy}" rx="${2.5 * k}" ry="${3.4 * k}"/>
      <ellipse cx="${cx - 3.8 * k + dx}" cy="${cy + 9.4 * k + dy}" rx="${3.2 * k}" ry="${2.6 * k}"/><ellipse cx="${cx + 3.8 * k + dx}" cy="${cy + 9.4 * k + dy}" rx="${3.2 * k}" ry="${2.6 * k}"/>`
  return `<g transform="rotate(${rot} ${cx} ${cy})">
    <g fill="#a3101f">${parts(0, 0, 1.08)}</g>
    <g fill="#e3192f">${parts(0, 0, 1)}</g>
    <g fill="#ff5b6b" opacity="0.55">${parts(-0.6, -0.6, 0.62)}</g>
    <ellipse cx="${cx - 2.2}" cy="${cy - 8.6}" rx="1.8" ry="1.1" fill="#fff" opacity="0.75"/>
    <ellipse cx="${cx - 3}" cy="${cy + 0.6}" rx="1.2" ry="2.6" fill="#fff" opacity="0.5"/>
    <circle cx="${cx - 1.8}" cy="${cy - 6.4}" r="0.7" fill="#7a0a16"/><circle cx="${cx + 1.8}" cy="${cy - 6.4}" r="0.7" fill="#7a0a16"/>
  </g>`
}

const I = '/pigchicken/instruments/'

const ART: Partial<Record<ItemId, Art>> = {
  // Taco: a wooden baseball bat, the knob and the taped handle at the grip, the barrel widening to a rounded end
  bat: {
    box: [-12, -9, 98, 18],
    svg: `<path d="M-6 -2.2 L30 -3 Q56 -7.5 80 -7.2 Q85 -7 85 0 Q85 7 80 7.2 Q56 7.5 30 3 L-6 2.2 Z" fill="#c8894a"/>
    <path d="M30 -3 Q56 -7.5 80 -7.2 Q84 -7 84.6 -3 Q60 -4.2 30 -1.2 Z" fill="#e2a868" opacity="0.8"/>
    <path d="M40 4.2 Q60 6 80 5.6" stroke="#9c6331" stroke-width="1" fill="none" opacity="0.7"/>
    <rect x="-6" y="-2.6" width="22" height="5.2" rx="1.4" fill="#2b2f38"/>
    <path d="M-2 -2.6 L1 2.6 M3 -2.6 L6 2.6 M8 -2.6 L11 2.6 M13 -2.6 L16 2.6" stroke="#4a5262" stroke-width="1"/>
    <ellipse cx="-8" cy="0" rx="3.4" ry="4.4" fill="#9c6331"/>`,
  },
  // Passaguá: a hand-sized grip at (0,0), a light shaft and, stuck to its tip and going on the same way, the hoop
  // with its mesh (seen from the side of the net: the hoop is long along the shaft)
  passagua: {
    box: [-7, -16, 90, 32],
    svg: `<path d="M1 0 L45 0" stroke="#805b35" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M5 -1.5 L41 -1.5" stroke="#c99b61" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>
    <path d="M-5 -3 L2 -3 L2 3 L-5 3 Z" fill="#70502f"/><path d="M-3 -2.5 L-3 2.5 M0 -2.5 L0 2.5" stroke="#d7bb8e" stroke-width="0.8"/>
    <ellipse cx="62" cy="0" rx="17" ry="12.5" fill="rgba(171,223,220,0.14)"/>
    <path d="M51 -9.5 L51 9.5 M56.5 -11.8 L56.5 11.8 M62 -12.5 L62 12.5 M67.5 -11.8 L67.5 11.8 M73 -9.5 L73 9.5 M47.1 -6 L76.9 -6 M45 0 L79 0 M47.1 6 L76.9 6" fill="none" stroke="#9bcac7" stroke-width="0.65" opacity="0.8"/>
    <ellipse cx="62" cy="0" rx="17" ry="12.5" fill="none" stroke="#d4eeeb" stroke-width="2.8"/>
    <rect x="42.5" y="-2.8" width="4.5" height="5.6" rx="1.2" fill="#b9c4c2"/>`,
  },
  // Martelo de Thor: a short war hammer. A leather-wrapped handle with a strap at the pommel and a heavy block of
  // grey steel across its end, bevelled at the corners, with an engraved band on each face
  mjolnir: {
    box: [-20, -19, 80, 38],
    svg: `<path d="M-8 0.6 C-13 -7 -19 -3 -17 1.5 C-15.5 5 -11 4.5 -8 -0.6" fill="none" stroke="#6b4226" stroke-width="1.9" stroke-linecap="round"/>
    <rect x="-3" y="-2.7" width="35" height="5.4" fill="#7a4a2b"/>
    <path d="M-3 -2.7 L32 -2.7 L32 -1 L-3 -1 Z" fill="#96603a" opacity="0.8"/>
    <path d="M0 -2.7 L3.4 2.7 M6 -2.7 L9.4 2.7 M12 -2.7 L15.4 2.7 M18 -2.7 L21.4 2.7 M24 -2.7 L27.4 2.7" stroke="#dfe4ea" stroke-width="1.1"/>
    <rect x="-9" y="-3.6" width="6.5" height="7.2" rx="1.5" fill="#aab2bc"/><path d="M-8 -2 L-3.5 -2" stroke="#e6eaef" stroke-width="1"/>
    <rect x="29.5" y="-4" width="3.5" height="8" rx="0.9" fill="#858d98"/>
    <path d="M32 -13 L36 -17 L54 -17 L58 -13 L58 13 L54 17 L36 17 L32 13 Z" fill="#b7bec8"/>
    <path d="M36 -17 L54 -17 L58 -13 L32 -13 Z" fill="#e3e8ee"/>
    <path d="M32 13 L58 13 L54 17 L36 17 Z" fill="#858d98"/>
    <path d="M32 -13 L36 -13 L36 13 L32 13 Z" fill="#9ea6b1"/>
    <path d="M36 -9.5 L58 -9.5 M36 9.5 L58 9.5" stroke="#737b86" stroke-width="0.8"/>
    <path d="M37.5 -11 l2 -1.4 l2 1.4 l2 -1.4 l2 1.4 l2 -1.4 l2 1.4 l2 -1.4 l2 1.4 l2 -1.4 M37.5 11.6 l2 1.4 l2 -1.4 l2 1.4 l2 -1.4 l2 1.4 l2 -1.4 l2 1.4 l2 -1.4 l2 1.4" fill="none" stroke="#6a727d" stroke-width="0.8"/>
    <path d="M40 -6 L55 -6" stroke="#d3d9e0" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>`,
  },
  // Cajado de Odin: a long golden staff, ringed along the shaft, a spike at the foot and at the top a pointed blade
  // between two horns that curl around it
  odinstaff: {
    box: [-11, -18, 138, 36],
    svg: `<path d="M-9 0 L-1 -2 L-1 2 Z" fill="#a86a12"/>
    <rect x="-2" y="-2.1" width="97" height="4.2" rx="1.6" fill="#d9982b"/>
    <path d="M0 -1 L93 -1" stroke="#ffd98a" stroke-width="1" stroke-linecap="round" opacity="0.85"/>
    <rect x="18" y="-3" width="3" height="6" rx="1" fill="#a86a12"/><rect x="52" y="-3" width="3" height="6" rx="1" fill="#a86a12"/><rect x="84" y="-3" width="3" height="6" rx="1" fill="#a86a12"/>
    <path d="M96 -3 C99 -15 113 -17 116 -8 C112 -12 104 -10 102 -3 Z" fill="#d9982b"/>
    <path d="M96 3 C99 15 113 17 116 8 C112 12 104 10 102 3 Z" fill="#c4841f"/>
    <path d="M97 -4.5 C91 -9 94 -14.5 99.5 -12" fill="none" stroke="#d9982b" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M97 4.5 C91 9 94 14.5 99.5 12" fill="none" stroke="#c4841f" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M96 -3.4 Q110 -6.5 126 0 Q110 6.5 96 3.4 Z" fill="#f0b540"/>
    <path d="M98 -1.6 Q110 -3.6 122 -0.4" fill="none" stroke="#fff0c2" stroke-width="1.1" stroke-linecap="round" opacity="0.9"/>
    <rect x="92" y="-3.8" width="5" height="7.6" rx="1.5" fill="#f0b540"/>`,
  },
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
  // instruments: the drawings, held like their weapon family
  flute: picture({ src: `${I}flute.png`, iw: 58, ih: 363, len: 110, gx: 0.5, gy: 0.45, rot: -90 }),
  sax: picture({ src: `${I}sax.png`, iw: 136, ih: 262, len: 120, gx: 0.45, gy: 0.45, rot: 0 }),
  trumpet: picture({ src: `${I}trumpet.png`, iw: 110, ih: 349, len: 120, gx: 0.5, gy: 0.55, rot: 90 }),
  guitar: picture({ src: `${I}guitar.png`, iw: 136, ih: 375, len: 150, gx: 0.5, gy: 0.6, rot: 90 }),
  violin: picture({ src: `${I}violin.png`, iw: 123, ih: 320, len: 135, gx: 0.5, gy: 0.6, rot: 90 }),
  keys: picture({ src: `${I}keys.png`, iw: 119, ih: 375, len: 150, gx: 0.7, gy: 0.55, rot: 90 }),
  harp: picture({ src: `${I}harp.png`, iw: 162, ih: 229, len: 100, gx: 0.2, gy: 0.55, rot: 0 }),
  // special abilities (consumables)
  // Bear Gummy (Maryjane): one red gummy bear
  maryjane: {
    box: [-11, -17, 22, 32],
    svg: gummyBear(0, 0, -8),
  },
  // Cok: a little glass soda bottle with its contoured waist, the dark drink inside, the red label and cap
  cok: {
    box: [-20, -15, 78, 30],
    svg: `<path d="M-15 -8 Q-16 -11 -12 -11.5 L-3 -11 Q2 -8.6 6 -8.6 Q11 -8.6 15 -11 L21 -11 Q27 -10 31 -7 L41 -4.6 L47 -4.6 L47 4.6 L41 4.6 L31 7 Q27 10 21 11 L15 11 Q11 8.6 6 8.6 Q2 8.6 -3 11 L-12 11.5 Q-16 11 -15 8 Z" fill="#cfe3d8" opacity="0.55"/>
    <path d="M-13.5 -7.5 Q-14 -9.8 -11 -10 L-3 -9.6 Q2 -7.4 6 -7.4 Q11 -7.4 15 -9.6 L21 -9.6 Q26.5 -8.6 30 -6 L33 -5 L33 5 L30 6 Q26.5 8.6 21 9.6 L15 9.6 Q11 7.4 6 7.4 Q2 7.4 -3 9.6 L-11 10 Q-14 9.8 -13.5 7.5 Z" fill="#3b1a0c"/>
    <path d="M30 -6 L33 -5 L33 5 L30 6 Q31.5 0 30 -6 Z" fill="#6b3416"/>
    ${[[-7, -4, 1.1], [-2, 3, 0.8], [11, -2, 1], [18, 4, 0.7], [24, -3, 0.9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#a0602e" opacity="0.8"/>`).join('')}
    <rect x="-1" y="-9.4" width="19" height="18.8" rx="1.5" fill="#d7192a"/>
    <text x="8.5" y="3" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" font-size="8.5" fill="#fff">Cok</text>
    <path d="M-12 -8.6 L28 -8 M34 -3.6 L45 -3.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>
    <rect x="47" y="-5.6" width="5.2" height="11.2" rx="1" fill="#d7192a"/>
    <path d="M48 -5.6 L48 5.6 M49.8 -5.6 L49.8 5.6 M51.4 -5.6 L51.4 5.6" stroke="#9c0f1c" stroke-width="0.6"/>`,
  },
  // Chave: an old golden key, its bow a ring with a hole, the shaft and two teeth
  key: {
    box: [-14, -12, 52, 24],
    svg: `<circle cx="-3" cy="0" r="9" fill="#e7b43a" stroke="#8a5a12" stroke-width="1.6"/>
    <circle cx="-3" cy="0" r="3.6" fill="#2a1d08"/>
    <rect x="5" y="-2.2" width="30" height="4.4" rx="1.2" fill="#e7b43a" stroke="#8a5a12" stroke-width="1.2"/>
    <path d="M25 2 L25 8 L29 8 L29 2 M31 2 L31 6 L34 6 L34 2" fill="#e7b43a" stroke="#8a5a12" stroke-width="1.2"/>
    <path d="M-8 -5 Q-4 -8 0 -6.5 M8 -1 L32 -1" stroke="#fff3c4" stroke-width="1" fill="none" opacity="0.8"/>`,
  },
  // Hangdrum: the hang seen from the side, two steel domes joined at the rim, the ding on top and dents of notes
  hangdrum: {
    box: [-2, -15, 64, 26],
    svg: `<path d="M0 1 Q30 15 60 1 Z" fill="#3e2a19"/>
    <ellipse cx="30" cy="7.5" rx="6" ry="1.6" fill="#1d130b"/>
    <path d="M0 1 Q30 -22 60 1 Z" fill="#7a5532"/>
    <path d="M7 -3 Q30 -16 53 -3" fill="none" stroke="#a37848" stroke-width="1.4" opacity="0.7"/>
    ${[[9, -2.4, 3.2], [51, -2.4, 3.2], [17, -6.4, 4], [43, -6.4, 4]].map(([x, y, rx]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="1.5" fill="#5f4126" stroke="#9c7244" stroke-width="0.6"/>`).join('')}
    <ellipse cx="30" cy="-10.6" rx="6.5" ry="2.4" fill="#8f6a40" stroke="#4a3220" stroke-width="0.8"/>
    <ellipse cx="28.5" cy="-11.2" rx="2.6" ry="0.8" fill="#d8b47a" opacity="0.7"/>
    <ellipse cx="30" cy="1" rx="30" ry="1.8" fill="#4f361f"/>`,
  },
  tambourine: {
    box: [-8, -24, 46, 48],
    svg: `<circle cx="14" cy="0" r="20" fill="#e8d3a6" stroke="#9a5b2e" stroke-width="5"/>
    <circle cx="14" cy="0" r="14" fill="#f4e6c4"/>
    ${[0, 60, 120, 180, 240, 300].map(a => { const r = (a * Math.PI) / 180; return `<rect x="${(14 + Math.cos(r) * 20 - 4).toFixed(1)}" y="${(Math.sin(r) * 20 - 2.5).toFixed(1)}" width="8" height="5" rx="2" fill="#c9ced6" stroke="#8a8f98" stroke-width="1" transform="rotate(${a + 90} ${(14 + Math.cos(r) * 20).toFixed(1)} ${(Math.sin(r) * 20).toFixed(1)})"/>` }).join('')}
    <path d="M6 -4 Q14 -10 22 -4" stroke="#d6453d" stroke-width="2" fill="none"/>`,
  },
}

// "Arco e Flecha" (lib/pigchicken/held-pose.ts): the bow and the arrow as separate drawings. `body` is the bow alone
// (no string, no arrow), `arrow` the arrow with its nock at (0, 0) pointing right, `string` the two ends of the
// string on the bow [x1, y1, x2, y2]; the string is drawn from one end to the arrow's nock to the other
export const ARCHERY_ART: Partial<Record<ItemId, { body: string; arrow: string; string: [number, number, number, number] }>> = {
  bow: {
    body: `<path d="M-12 -52 Q12 0 -12 52" fill="none" stroke="#8b5a2b" stroke-width="5" stroke-linecap="round"/>
    <rect x="-3" y="-7" width="6" height="14" rx="2" fill="#3b2a1a"/>`,
    arrow: `<path d="M0 0 L43 0" stroke="#c9a46a" stroke-width="2"/>
    <path d="M50 0 L42 -4 L42 4 Z" fill="#8a8f98"/>
    <path d="M2 0 L-2 -4 M2 0 L-2 4 M6 0 L2 -4 M6 0 L2 4" stroke="#d6453d" stroke-width="2"/>`,
    string: [-12, -52, -12, 52],
  },
}

// the Gaiolas: each model's whole drawing (lib/pigchicken/cage-art.ts)
for (const id of Object.keys(CAGE_ART) as ItemId[]) ART[id] = cageItemArt(id)

export const ITEM_SVG: Partial<Record<ItemId, string>> = Object.fromEntries(Object.entries(ART).map(([k, a]) => [k, a!.svg]))
// each item's art box [x, y, width, height]: the viewBox to show ITEM_SVG inside an <svg>
export const ITEM_BOX: Partial<Record<ItemId, Art['box']>> = Object.fromEntries(Object.entries(ART).map(([k, a]) => [k, a!.box]))

// canvas images of the same art, built once per item (drawings are turned into a canvas the size of the box)
const images: Partial<Record<ItemId, HTMLImageElement>> = {}
const pics: Partial<Record<ItemId, HTMLCanvasElement>> = {}
export function itemImage(item: ItemId): { img: CanvasImageSource; box: Art['box'] } | null {
  const art = ART[item]
  if (!art || typeof window === 'undefined') return null
  if (art.pic) {
    if (pics[item]) return { img: pics[item]!, box: art.box }
    let img = images[item]
    if (!img) { img = new Image(); img.src = art.pic.src; images[item] = img }
    if (!img.complete || !img.naturalWidth) return null
    const p = art.pic, [bx, by, bw, bh] = art.box, k = 2
    const c = document.createElement('canvas'); c.width = Math.ceil(bw * k); c.height = Math.ceil(bh * k)
    const g = c.getContext('2d')!
    g.scale(k, k); g.translate(-bx, -by); g.rotate((p.rot * Math.PI) / 180)
    const h = p.len, w = (p.len * p.iw) / p.ih
    g.drawImage(img, -p.gx * w, -p.gy * h, w, h)
    pics[item] = c
    return { img: c, box: art.box }
  }
  let img = images[item]
  if (!img) {
    const [x, y, w, h] = art.box
    img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w * 2}" height="${h * 2}">${art.svg}</svg>`)}`
    images[item] = img
  }
  return img.complete && img.naturalWidth ? { img, box: art.box } : null
}
