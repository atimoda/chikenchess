import { createCreativeSession, creativeSchema, type CreativeSession } from './creative'

export const MANCHESTER_JAZZ_CITY = 'manchester-1999'

// Original motifs, composed for interacting pieces. @ weights encode gentle
// long/short eighths directly in mini-notation, so every preview shares timing.
export const JAZZ_PHRASES = {
  bass: ['[0@5 ~@4] ~ [0@5 4@4] [~@5 6@4]', '[0@5 ~@4] [~@5 2@4] 4 [~@5 -1@4]', '0 ~ ~ [4@5 ~@4]', '[0@5 0@4] ~ [4@5 3@4] [~@5 -1@4]'],
  bassReply: ['~ ~ ~ [~@5 4@4]', '~ [~@5 4@4] ~ ~', '~ ~ 0 ~', '~ ~ [~@5 6@4] ~'],
  lead: ['[0@5 2@4] [4@5 ~@4] [3@5 2@4] [~@5 0@4]', '[0@5 2@4] [4@5 6@4] [4@5 ~@4] [2@5 0@4]', '[0@5 ~@4] ~ [2@5 4@4] ~', '[0@5 2@4] [4@5 ~@4] [6@5 4@4] [2@5 -1@4]'],
  lowHorn: ['0 ~ [~@5 4@4] ~', '0 ~ [2@5 4@4] ~', '~ ~ 0 ~', '0 [~@5 2@4] 4 ~'],
  highHorn: ['~ ~ ~ [4@5 2@4]', '~ [~@5 4@4] ~ [6@5 4@4]', '~ ~ ~ 2', '~ ~ [~@5 6@4] [4@5 2@4]'],
  keys: ['~ [0,2,6] ~ ~', '~ [0,2,6] ~ [2,4,6]', '~ ~ [0,2,4] ~', '~ [0,2,6] ~ [0,3,6]'],
  keysReply: ['~ ~ ~ [~@5 [2,4]@4]', '~ ~ [~@5 [2,4]@4] ~', '[2,4]/2', '~ ~ ~ [2,4]'],
  call: ['~ ~ [~@5 0@4] ~', '~ ~ ~ [2@5 0@4]', '~ 0 ~ ~', '~ [~@5 4@4] ~ [2@5 ~@4]'],
} as const

export function createManchesterJazzKit(): CreativeSession {
  const kit = createCreativeSession()
  Object.assign(kit, { cityId: MANCHESTER_JAZZ_CITY, name: 'Manchester 1999 · Northern Jazz Breaks', bpm: 123,
    root: 'G', scale: 'Dórica', volume: .72, sectionPattern: '[0@4 1@8 2@4 3@8]/24' })
  const rhythms: Record<string, string[]> = {
    kick: ['x ~ [x@5 ~@4] [~@5 x@4]', 'x [~@5 x@4] x ~', 'x ~ ~ ~', 'x ~ [x@5 ~@4] [~@5 x@4]'],
    snare: ['~ x ~ x', '~ x ~ x', '~ x ~ x', '~ x ~ [x@5 x@4]'],
    hat: ['[x@5 x@4]*4', '[x@5 x@4]*4', '[~@5 x@4]*4', '[x@5 x@4]*4'],
    ghost: ['~ ~ [~ ~ ~ x] ~', '[~ ~ ~ x] ~ [~ ~ ~ x] ~', '~ ~ ~ [~ ~ ~ x]', '~ ~ [~ ~ ~ x] ~'],
    ride: ['x ~ x ~', 'x [~@5 x@4] x ~', '~ ~ x ~', 'x ~ [x@5 x@4] ~'],
    open: ['~ ~ ~ [~@5 x@4]', '~ [~@5 x@4] ~ ~', '~ ~ ~ x', '~ ~ ~ [~@5 x@4]'],
    rim: ['~ [~@5 x@4] ~ ~', '~ ~ [~@5 x@4] ~', '~ x ~ ~', '[~@5 x@4] ~ ~ ~'],
    shaker: ['[~@5 x@4]*4', '[~@5 x@4]*4', '~ [~@5 x@4] ~ [~@5 x@4]', '[~@5 x@4]*4'],
  }
  kit.grooves = { jazzBreaks: { name: 'Northern breaks · pulso e respostas', lanes: Object.fromEntries(Object.entries(rhythms).map(([key, rhythms]) => [key, {
    name: key, rhythms, accents: key === 'hat' || key === 'shaker' ? ['1 .5 .75 .45 1 .5 .7 .4'] : ['1 .85 .9 .8'],
  }])) } }
  const drums = [
    ['kick', 'Bumbo seco', 'chicken-jazz-v1', 'kick', 0, .52],
    ['snare', 'Caixa breaks', 'chicken-jazz-v1', 'snare', 0, .34],
    ['hat', 'Chimbal longo-curto', 'chicken-electro-v1', 'hat', 1, .18],
    ['ghost', 'Caixa fantasma', 'chicken-jazz-v1', 'snare', 1, .13],
    ['ride', 'Ride pontuado', 'chicken-drums-v1', 'ride', 0, .15],
    ['open', 'Chimbal de resposta', 'chicken-electro-v1', 'open-hat', 0, .12],
    ['rim', 'Rim de madeira', 'chicken-electro-v1', 'rim', 0, .19],
    ['shaker', 'Shaker sincopado', 'chicken-electro-v1', 'shaker', 0, .12],
  ] as const
  const melodic = {
    a: ['lowHorn', 'Barítono · apoio', 'baritone', 3, .27, 'phrase'],
    b: ['bass', 'Baixo · pergunta', 'pluck', 2, .42, 'phrase'],
    c: ['keys', 'Teclas · acordes curtos', 'keys', 4, .12, 'sustain'],
    d: ['lead', 'Palheta · motivo principal', 'reed', 4, .31, 'phrase'],
    e: ['call', 'Vogal · interjeições', 'formant', 4, .18, 'phrase'],
    f: ['keysReply', 'Teclas · resposta', 'keys', 4, .11, 'sustain'],
    g: ['bassReply', 'Baixo · resposta', 'pluck', 2, .29, 'phrase'],
    h: ['highHorn', 'Metal · resposta', 'brass', 4, .23, 'phrase'],
  } as const
  for (const piece of kit.pieces) {
    piece.active = piece.color === 'w'
    const inst = kit.instruments[piece.id]
    const file = piece.origin[0] as keyof typeof melodic
    const drum = piece.type === 'p' ? drums[file.charCodeAt(0) - 97] : null
    Object.assign(inst, { mask: undefined, source: undefined, groove: undefined, phrases: undefined, automations: undefined,
      sound: 'sine', notes: '0', attack: .002, decay: .16, sustain: 1, release: .04, clip: .9, hpf: 0, lpf: 12000 })
    if (drum) {
      const [lane, name, bank, asset, variant, gain] = drum
      Object.assign(inst, { name, behavior: 'pulse', octave: 2, gain,
        source: { kind: 'sample', bank, asset, variant, pitched: false }, groove: { groove: 'jazzBreaks', lane } })
    } else {
      const [phrase, name, asset, octave, gain, behavior] = melodic[file]
      const keyAsset = file === 'c' ? 'rhodes' : file === 'f' ? 'grand' : asset
      Object.assign(inst, { name, behavior, octave, gain, notes: JAZZ_PHRASES[phrase][0], phrases: [...JAZZ_PHRASES[phrase]],
        source: { kind: 'sample', bank: asset === 'keys' ? 'chicken-keys-v1' : 'chicken-jazz-v1', asset: keyAsset, variant: 0, pitched: true },
        lpf: asset === 'pluck' ? 1400 : asset === 'keys' ? 3800 : 5500, hpf: asset === 'pluck' ? 25 : 120, clip: asset === 'keys' ? .4 : .82,
        automations: { gain: { kind: 'pattern', patterns: ['1 .78 .9 .72', '1 .85 .95 .8', '.85 .65 .8 .65', '1 .85 .95 .8'] } } })
    }
    kit.effects[piece.id] = { gain: piece.color === 'w' ? 1 : .85, pitch: 1,
      pan: piece.color === 'w' ? -.12 : .12, delay: 0, reverb: drum ? .035 : .08, decay: .16 }
    // Preserve the recognisable motif on routine forward moves; lateral motion
    // shifts it slowly. Audition still follows every square and controls filter.
    kit.mappings[piece.id] = { fileDegrees: drum ? 0 : .5, rankDegrees: 0, panWidth: .3, previewFilter: true }
  }
  return creativeSchema.parse(kit)
}
