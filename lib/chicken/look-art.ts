// Chicken art split by customizable part (ported from the "Pátio da Caipira" prototype).
// so any part can be combined with any other. Flat folk style: no outlines.
export type ChickenSlot = 'comb' | 'face' | 'beak' | 'wattle' | 'neck' | 'torso' | 'wing' | 'tail' | 'legs'
export type ChickenLook = Record<ChickenSlot, string>
type LegColors = { drum: string; shank: string }
// One variant of a part. Extra fields per slot: face.lid (eyelid color), wing.back (far wing color), beak.mouth (the mouth point),
// tail.swing (how much the tail follows the body), legs.front/back (leg stroke colors).
export type ChickenArtVariant = { label: string; svg?: string; lid?: string; back?: any; swing?: number; front?: LegColors; mouth?: [number, number] }

export const LOOK_ART = (() => {
  const chev = (pts: number[][], fill: string) => '<g fill="' + fill + '">' + pts.map(([x, y]) => '<path d="M' + x + ' ' + y + ' l3 5 l3 -5 l-3 2 Z"></path>').join('') + '</g>';
  const WING = 'M-34 -124 C -10 -130, 22 -128, 34 -118 C 40 -100, 32 -80, 12 -72 C -10 -66, -36 -74, -44 -92 C -48 -108, -46 -120, -34 -124 Z';
  const TORSO_CAIPIRA = 'M28 -150 C 56 -140, 66 -106, 52 -80 C 40 -58, -6 -52, -38 -62 C -62 -70, -72 -94, -64 -114 C -56 -128, -36 -126, -16 -122 C 0 -120, 12 -134, 28 -150 Z';
  const TORSO_ROOSTER = 'M30 -154 C 62 -142, 66 -104, 50 -80 C 38 -60, -6 -54, -36 -63 C -58 -71, -66 -94, -60 -112 C -54 -127, -36 -129, -16 -125 C 0 -123, 14 -138, 30 -154 Z';
  const TORSO_ANGOLA = 'M30 -146 C 58 -132, 62 -100, 48 -78 C 34 -58, -8 -54, -38 -62 C -64 -70, -74 -96, -66 -116 C -56 -140, -30 -156, -2 -152 C 12 -150, 22 -150, 30 -146 Z';
  const BELLY = 'M-38 -62 C -10 -54, 34 -58, 50 -80 C 44 -66, 20 -56, -8 -56 C -22 -56, -32 -58, -38 -62 Z';

  const art: Record<ChickenSlot, Record<string, ChickenArtVariant>> = {
    comb: {
      caipira: { label: 'Crista simples', svg: '<path d="M28 -200 C 26 -214, 34 -220, 38 -208 C 38 -224, 50 -226, 50 -210 C 54 -222, 66 -218, 60 -202 Z" fill="#f2522f"></path>' },
      onagadori: { label: 'Crista de galo', svg: '<path d="M22 -197 C 18 -212, 26 -222, 32 -210 C 30 -230, 44 -234, 45 -214 C 47 -234, 62 -232, 58 -212 C 66 -228, 79 -220, 69 -203 C 60 -197, 34 -194, 22 -197 Z" fill="#e0322b"></path><path d="M30 -204 C 40 -208, 56 -208, 66 -204 C 56 -200, 40 -200, 30 -204 Z" fill="#b8241f"></path>' },
      angola: { label: 'Capacete', svg: '<path d="M36 -198 C 29 -210, 29 -224, 36 -231 C 45 -224, 49 -211, 48 -199 Z" fill="#b4602e"></path><path d="M37 -205 C 34 -213, 35 -222, 37 -226 C 41 -219, 43 -211, 42 -204 Z" fill="#d27d43"></path>' },
      none: { label: 'Sem crista', svg: '' }
    },
    face: {
      caipira: { label: 'Cabeça emplumada', lid: '#f7b21b', svg: '<circle cx="44" cy="-188" r="19" fill="#f7b21b"></circle><circle cx="38" cy="-182" r="4.5" fill="#f2522f"></circle><circle cx="38" cy="-182" r="1.8" fill="#fff1b8"></circle>' },
      onagadori: { label: 'Rosto vermelho e brinco branco', lid: '#e0322b', svg: '<circle cx="44" cy="-188" r="19" fill="#f3f0e6"></circle><path d="M44 -199 C 54 -202, 63 -196, 62 -186 C 61 -176, 52 -172, 45 -176 C 41 -182, 40 -192, 44 -199 Z" fill="#e0322b"></path><ellipse cx="40" cy="-176" rx="4.2" ry="5.4" fill="#fbf8ef"></ellipse>' },
      angola: { label: 'Cabeça pelada azulada', lid: '#b9d0e6', svg: '<circle cx="47" cy="-189" r="15" fill="#b9d0e6"></circle><path d="M40 -182 C 44 -176, 52 -175, 57 -179 C 52 -183, 45 -184, 40 -182 Z" fill="#8fb3d6"></path>' }
    },
    beak: {
      caipira: { label: 'Bico curto', mouth: [68, -188], svg: '<path d="M60 -194 L 76 -188 L 60 -182 Z" fill="#f2522f"></path>' },
      onagadori: { label: 'Bico de galo', mouth: [69, -188], svg: '<path d="M60 -195 C 68 -195, 76 -191, 77 -186 C 71 -186, 65 -184, 60 -182 Z" fill="#e3b955"></path><path d="M60 -188 L 75 -187" stroke="#b98f35" stroke-width="1" fill="none"></path>' },
      angola: { label: 'Bico marfim', mouth: [66, -187], svg: '<path d="M59 -193 C 66 -192, 71 -189, 72 -185 C 67 -185, 63 -183, 59 -182 Z" fill="#d9c9a6"></path>' }
    },
    wattle: {
      caipira: { label: 'Barbela redonda', svg: '<path d="M57 -180 C 52 -170, 58 -162, 64 -168 C 66 -174, 63 -180, 57 -180 Z" fill="#f2522f"></path>' },
      onagadori: { label: 'Barbela longa', svg: '<path d="M54 -179 C 49 -166, 51 -152, 58 -150 C 64 -152, 64 -166, 61 -180 Z" fill="#b8241f"></path><path d="M57 -179 C 53 -166, 56 -154, 62 -153 C 67 -156, 66 -168, 63 -180 Z" fill="#e0322b"></path>' },
      angola: { label: 'Barbela pequena e bochecha azul', svg: '<ellipse cx="50" cy="-178" rx="5.5" ry="3.6" fill="#4f86c6"></ellipse><path d="M57 -180 C 55 -173, 58 -169, 62 -171 C 64 -174, 62 -179, 57 -180 Z" fill="#d8382c"></path>' },
      none: { label: 'Sem barbela', svg: '' }
    },
    neck: {
      caipira: { label: 'Pescoço caipira', svg: '<path d="M8 -126 C 10 -150, 18 -170, 28 -182 L 54 -180 C 50 -164, 50 -140, 52 -112 C 36 -108, 18 -114, 8 -126 Z" fill="#f7b21b"></path>' + chev([[34, -160], [42, -146], [30, -144], [44, -128]], '#e5402a') + chev([[40, -168], [38, -136], [28, -128]], '#fff1b8') },
      onagadori: { label: 'Gola prateada listrada', svg: '<path d="M4 -122 C 6 -150, 16 -172, 26 -185 L 56 -183 C 52 -166, 52 -140, 58 -106 C 44 -96, 14 -100, 4 -122 Z" fill="#f3f0e6"></path><path d="M30 -166 L 24 -128 M38 -168 L 34 -122 M46 -164 L 46 -118 M53 -150 L 54 -116 M20 -150 L 12 -124" stroke="#2a2a33" stroke-width="2.2" stroke-linecap="round" fill="none"></path><path d="M6 -118 l -7 12 l 12 -6 Z M18 -108 l -4 13 l 10 -9 Z M34 -104 l 0 13 l 7 -11 Z M48 -104 l 4 12 l 3 -13 Z" fill="#f3f0e6"></path>' },
      angola: { label: 'Pescoço fino de angola', svg: '<path d="M14 -128 C 18 -150, 26 -168, 34 -180 L 52 -178 C 48 -162, 46 -142, 46 -122 C 32 -114, 20 -118, 14 -128 Z" fill="#2c323d"></path><path d="M20 -140 L 46 -140 M18 -132 L 46 -132 M23 -148 L 47 -148" stroke="#9aa6b6" stroke-width="1.2" fill="none"></path><path d="M30 -178 C 30 -170, 28 -162, 26 -156 L 48 -156 C 48 -164, 50 -172, 52 -178 Z" fill="#93aec9"></path>' }
    },
    torso: {
      caipira: { label: 'Corpo caipira', svg: '<path d="' + TORSO_CAIPIRA + '" fill="#f7b21b"></path><path d="' + BELLY + '" fill="#e8961a"></path>' + chev([[40, -120], [36, -106], [46, -98], [30, -96]], '#e5402a') + chev([[44, -108], [40, -90]], '#fff1b8') },
      onagadori: { label: 'Peito preto e dorso branco', svg: '<path d="' + TORSO_ROOSTER + '" fill="#1f2029"></path><path d="M40 -142 C 58 -122, 58 -96, 46 -80 C 50 -100, 48 -122, 36 -138 Z" fill="#30364f"></path><path d="M-60 -112 C -54 -128, -34 -131, -14 -125 C -2 -121, 8 -129, 16 -135 C 8 -116, -10 -112, -30 -112 C -44 -112, -54 -106, -60 -100 Z" fill="#f3f0e6"></path><path d="' + BELLY + '" fill="#15161c"></path>' + chev([[40, -118], [44, -102], [34, -96]], '#f3f0e6') },
      angola: { label: 'Corpo pérola', svg: '<path d="' + TORSO_ANGOLA + '" fill="#3b4250"></path><path d="' + TORSO_ANGOLA + '" fill="url(#chk-pearlDots)"></path><path d="' + BELLY + '" fill="#2a2f3a"></path>' }
    },
    wing: {
      caipira: { label: 'Asa caipira', back: '#df8d17', svg: '<path d="' + WING + '" fill="#fde68a"></path><g clip-path="url(#chk-wingClip)"><path d="M-50 -100 C -24 -94, 10 -94, 40 -104 L 44 -60 L -50 -60 Z" fill="#e5402a"></path><path d="M-30 -92 L -34 -76 M-16 -91 L -18 -72 M-2 -91 L -2 -70 M12 -93 L 14 -72 M24 -97 L 28 -78" stroke="#a51d1d" stroke-width="3" stroke-linecap="round" fill="none"></path><path d="M-23 -91 L -26 -74 M-9 -91 L -10 -70 M5 -92 L 6 -70 M18 -95 L 21 -74" stroke="#fde68a" stroke-width="1.6" stroke-linecap="round" fill="none"></path><path d="M-50 -100 C -24 -94, 10 -94, 40 -104" stroke="#fde68a" stroke-width="2.4" fill="none"></path></g><g fill="#e5402a"><circle cx="-26" cy="-108" r="2.6"></circle><circle cx="-12" cy="-106" r="2.6"></circle><circle cx="2" cy="-106" r="2.6"></circle><circle cx="16" cy="-109" r="2.6"></circle></g>' },
      onagadori: { label: 'Ombro branco e penas pretas', back: '#15161c', svg: '<path d="' + WING + '" fill="#f3f0e6"></path><g clip-path="url(#chk-wingClip)"><path d="M-50 -98 C -24 -92, 10 -92, 40 -102 L 44 -60 L -50 -60 Z" fill="#1f2029"></path><path d="M-30 -90 L -34 -74 M-16 -89 L -18 -70 M-2 -89 L -2 -68 M12 -91 L 14 -70 M24 -95 L 28 -76" stroke="#f3f0e6" stroke-width="1.4" stroke-linecap="round" fill="none"></path></g><g fill="#1f2029"><circle cx="-22" cy="-110" r="2.2"></circle><circle cx="-6" cy="-108" r="2.2"></circle><circle cx="10" cy="-111" r="2.2"></circle></g>' },
      angola: { label: 'Asa pérola', back: '#2c323d', svg: '<path d="' + WING + '" fill="#3b4250"></path><path d="' + WING + '" fill="url(#chk-pearlDots)"></path><g clip-path="url(#chk-wingClip)"><path d="M-30 -90 L -34 -74 M-14 -89 L -16 -70 M2 -89 L 2 -68 M18 -93 L 20 -72" stroke="#dfe5ec" stroke-width="1.2" stroke-dasharray="3 3" fill="none"></path></g>' }
    },
    tail: {
      caipira: { label: 'Cauda em leque', swing: 1, svg: '<path d="M-52 -96 C -70 -104, -84 -118, -92 -132 C -98 -142, -90 -150, -82 -142 C -88 -156, -80 -166, -70 -156 C -72 -170, -60 -172, -56 -160 C -54 -150, -56 -136, -50 -120 Z" fill="#f2522f"></path><path d="M-50 -118 C -62 -112, -70 -104, -60 -94 L -40 -92 Z" fill="#f7b21b"></path>' },
      onagadori: { label: 'Cauda longa de Onagadori', swing: 0.3, svg: '<path d="M-46 -122 C -80 -172, -142 -152, -172 -92 C -196 -42, -252 -10, -342 -4 C -252 -18, -202 -44, -178 -94 C -152 -142, -98 -158, -52 -112 Z" fill="#f3f0e6"></path><path d="M-50 -112 C -90 -142, -132 -122, -152 -72 C -172 -26, -222 -6, -302 2 C -228 -12, -186 -30, -162 -74 C -142 -114, -98 -130, -54 -104 Z" fill="#ddd8ca"></path><path d="M-52 -100 C -80 -112, -110 -96, -124 -60 C -140 -24, -180 -4, -252 4 C -188 -10, -152 -28, -136 -60 C -122 -90, -92 -104, -54 -94 Z" fill="#f3f0e6"></path><path d="M-60 -128 C -100 -150, -140 -130, -162 -90 C -184 -50, -232 -20, -300 -10" stroke="#cfc9bb" stroke-width="1.2" fill="none"></path><path d="M-50 -116 C -70 -152, -102 -152, -114 -124 C -98 -138, -74 -136, -56 -108 Z" fill="#1f2029"></path><path d="M-40 -128 C -60 -124, -66 -108, -58 -96 L -36 -100 Z" fill="#f3f0e6"></path>' },
      angola: { label: 'Cauda curta caída', swing: 0.8, svg: '<path d="M-52 -102 C -68 -102, -80 -94, -84 -80 C -86 -70, -78 -66, -70 -70 C -62 -78, -56 -88, -44 -94 Z" fill="#353b47"></path><path d="M-52 -102 C -68 -102, -80 -94, -84 -80 C -86 -70, -78 -66, -70 -70 C -62 -78, -56 -88, -44 -94 Z" fill="url(#chk-pearlDots)"></path>' }
    },
    legs: {
      caipira: { label: 'Pernas vermelhas', front: { drum: '#df8d17', shank: '#e5402a' }, back: { drum: '#c27510', shank: '#c2301f' } },
      onagadori: { label: 'Pernas amarelo-salgueiro', front: { drum: '#1f2029', shank: '#d9b43a' }, back: { drum: '#15161c', shank: '#b8962c' } },
      angola: { label: 'Pernas cinza', front: { drum: '#3b4250', shank: '#5b616b' }, back: { drum: '#2c323d', shank: '#474c55' } }
    }
  };

  const SLOTS: { id: ChickenSlot; label: string; tab: string }[] = [
    { id: 'comb', label: 'Crista', tab: 'cabeca' },
    { id: 'face', label: 'Rosto e brinco', tab: 'cabeca' },
    { id: 'beak', label: 'Bico', tab: 'cabeca' },
    { id: 'wattle', label: 'Barbela', tab: 'cabeca' },
    { id: 'neck', label: 'Pescoço', tab: 'penas' },
    { id: 'wing', label: 'Asas', tab: 'penas' },
    { id: 'tail', label: 'Cauda', tab: 'penas' },
    { id: 'torso', label: 'Corpo', tab: 'corpo' },
    { id: 'legs', label: 'Pernas e pés', tab: 'pernas' }
  ];
  const BREEDS = [
    { id: 'caipira', label: 'Caipira', cat: 'galinhas', klass: 'media' },
    { id: 'angola', label: "Galinha-d'angola", cat: 'galinhas', klass: 'leve' },
    { id: 'onagadori', label: 'Onagadori', cat: 'galos', klass: 'cauda_longa' }
  ];
  const breedLook = (id: string): ChickenLook => { const l = {} as ChickenLook; SLOTS.forEach(s => { l[s.id] = art[s.id][id] ? id : Object.keys(art[s.id])[0]; }); return l; };

  // rest-pose leg drawing for thumbnails (the live rig poses its own legs)
  function staticLeg(hx: number, c: LegColors) {
    const k = [hx + 21, -67], a = [hx, -46], f = [hx, -3];
    return '<path d="M' + hx + ' -88 L ' + k[0] + ' ' + k[1] + ' L ' + a[0] + ' ' + a[1] + '" stroke="' + c.drum + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>' +
      '<path d="M' + a[0] + ' ' + a[1] + ' L ' + f[0] + ' ' + f[1] + ' M' + f[0] + ' ' + f[1] + ' l15 2 M' + f[0] + ' ' + f[1] + ' l10 4 M' + f[0] + ' ' + f[1] + ' l-9 2" stroke="' + c.shank + '" stroke-width="4.5" stroke-linecap="round" fill="none"></path>';
  }
  function headSvg(look: ChickenLook) {
    return (art.comb[look.comb].svg ?? '') + (art.face[look.face].svg ?? '') + (art.beak[look.beak].svg ?? '') + (art.wattle[look.wattle].svg ?? '') +
      '<circle cx="51" cy="-192" r="4.6" fill="#fff8e1"></circle><circle cx="52.5" cy="-192" r="2.8" fill="#1f1a17"></circle>';
  }
  // whole chicken in rest pose, as SVG markup (thumbnails, avatar)
  function compose(look: ChickenLook) {
    const legs = art.legs[look.legs], wing = art.wing[look.wing];
    return staticLeg(-26, legs.back as LegColors) + staticLeg(-14, legs.front as LegColors) +
      '<g transform="translate(-4 -2)"><path d="M-34 -124 C -10 -130, 22 -128, 34 -118 C 40 -100, 32 -80, 12 -72 C -10 -66, -36 -74, -44 -92 C -48 -108, -46 -120, -34 -124 Z" fill="' + wing.back + '"></path></g>' +
      (art.tail[look.tail].svg ?? '') + (art.torso[look.torso].svg ?? '') + (art.neck[look.neck].svg ?? '') + headSvg(look) + (wing.svg ?? '');
  }
  // where each part sits in rest pose, for cropped thumbnails
  const VIEW: Record<ChickenSlot, string> = { comb: '14 -238 70 70', face: '22 -214 50 50', beak: '40 -210 44 44', wattle: '34 -200 44 58', neck: '-10 -196 76 104', wing: '-56 -136 102 80', tail: '-120 -180 120 120', torso: '-76 -160 140 110', legs: '-50 -100 80 106' };
  const TAIL_VIEW: Record<string, string> = { onagadori: '-350 -180 360 190' };
  return { art, SLOTS, BREEDS, breedLook, compose, headSvg, VIEW, TAIL_VIEW, WING };
})()
