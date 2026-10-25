import { RECORDED_BANKS } from './recorded-banks'
/** Asset metadata has no knowledge of chess roles or instrument behaviours. */
export interface SampleAsset {
  id: string
  name: string
  variants: { name: string; file: string; keymap?: Record<string, string> }[]
  rootNote?: string
  keymap?: Record<string, string>
}
export interface SampleBank {
  id: string
  name: string
  credit: string
  license: string
  assets: SampleAsset[]
}

const variants = (id: string, names = ['Normal', 'Suave']) => names.map((name, i) => ({ name, file: `/samples/chicken-electro-v1/${id}-${i}.ogg` }))
const generatedBank = (id: string, name: string, assets: readonly (readonly [string, string, string?])[], generator = 'generate-timbre-samples.py'): SampleBank => ({
  id, name, credit: `ChickenChess · síntese original; scripts/${generator}`, license: 'CC0-1.0',
  assets: assets.map(([assetId, assetName, rootNote]) => ({ id: assetId, name: assetName, rootNote,
    variants: [{ name: 'Original', file: `/samples/${id}/${assetId}-0.ogg` }],
  })),
})
const classicalVariant = (asset: string, name: string, revision: string, notes: string[]) => {
  const keymap = Object.fromEntries(notes.map(note => [note, `/samples/chicken-classical-v1/${asset}-${revision}-${note}.ogg`]))
  return { name, file: Object.values(keymap)[0], keymap }
}
const classicalHitVariant = (asset: string, name: string, revision: string) => ({
  name, file: `/samples/chicken-classical-v1/${asset}-${revision}.ogg`,
})
const classicalBank: SampleBank = {
  id: 'chicken-classical-v1', name: 'Chicken Classical · instrumentos acústicos',
  credit: 'Gravações CC0: VCSL e VSCO 2 CE · preparação em scripts/prepare-classical-recordings.py', license: 'CC0-1.0',
  assets: [
    { id: 'violin-sustain', name: 'Violino arqueado', variants: [
      classicalVariant('violin-sustain', 'Piano', 'piano', ['g3', 'c4', 'e4', 'g4', 'c5']),
      classicalVariant('violin-sustain', 'Forte', 'forte', ['g3', 'c4', 'e4', 'g4', 'c5']),
    ] },
    { id: 'violin-spiccato', name: 'Violino spiccato', variants: [
      classicalVariant('violin-spiccato', 'Round robin 1', 'rr1', ['c3', 'c4', 'c5']),
      classicalVariant('violin-spiccato', 'Round robin 2', 'rr2', ['c3', 'c4', 'c5']),
    ] },
    { id: 'violin-pizzicato', name: 'Violino pizzicato', variants: [
      classicalVariant('violin-pizzicato', 'Piano · round robin 1', 'piano-rr1', ['a3', 'c4', 'e4', 'c5']),
      classicalVariant('violin-pizzicato', 'Piano · round robin 2', 'piano-rr2', ['a3', 'c4', 'e4', 'c5']),
      classicalVariant('violin-pizzicato', 'Forte · round robin 1', 'forte-rr1', ['a3', 'c4', 'e4', 'c5']),
      classicalVariant('violin-pizzicato', 'Forte · round robin 2', 'forte-rr2', ['a3', 'c4', 'e4', 'c5']),
    ] },
    { id: 'cello-sustain', name: 'Violoncelo arqueado', variants: [
      classicalVariant('cello-sustain', 'Timbre 1', 'warm', ['a2', 'c3', 'g3', 'd4']),
      classicalVariant('cello-sustain', 'Timbre 3', 'rich', ['a2', 'c3', 'g3', 'd4']),
    ] },
    { id: 'cello-spiccato', name: 'Violoncelo spiccato', variants: [
      classicalVariant('cello-spiccato', 'Round robin 1', 'rr1', ['a2', 'c3', 'g3']),
      classicalVariant('cello-spiccato', 'Round robin 2', 'rr2', ['a2', 'c3', 'g3']),
    ] },
    { id: 'cello-pizzicato', name: 'Violoncelo pizzicato', variants: [
      classicalVariant('cello-pizzicato', 'Round robin 1', 'rr1', ['a2', 'c3', 'g3']),
      classicalVariant('cello-pizzicato', 'Round robin 2', 'rr2', ['a2', 'c3', 'g3']),
    ] },
    { id: 'viola-sustain', name: 'Violas arqueadas', variants: [
      classicalVariant('viola-sustain', 'Timbre 1', 'v1', ['c2', 'c4', 'e4', 'g4']),
      classicalVariant('viola-sustain', 'Timbre 2', 'v2', ['c2', 'c4', 'e4', 'g4']),
    ] },
    { id: 'flute-sustain', name: 'Flauta transversal', variants: [
      classicalVariant('flute-sustain', 'Timbre 1', 'v1', ['c3', 'c4', 'e4', 'a4']),
      classicalVariant('flute-sustain', 'Timbre 3', 'v3', ['c3', 'c4', 'e4', 'a4']),
    ] },
    { id: 'alto-recorder-sustain', name: 'Flauta doce contralto', variants: [
      classicalVariant('alto-recorder-sustain', 'Sustain vibrato', 'sus', ['c4', 'e4', 'f#4', 'a#4', 'c5']),
    ] },
    { id: 'alto-recorder-staccato', name: 'Flauta doce contralto staccato', variants: [
      classicalVariant('alto-recorder-staccato', 'Staccato', 'stac', ['c4', 'e4', 'f#4', 'a#4', 'c5']),
    ] },
    { id: 'harpsichord', name: 'Cravo flamengo', variants: [
      classicalVariant('harpsichord', 'Registro baixo', 'low', ['c3', 'd3', 'e3', 'f#3', 'a#3', 'c4', 'd4', 'e4', 'f#4', 'a#4', 'c5']),
      classicalVariant('harpsichord', 'Registro alto', 'high', ['a3', 'c#4', 'd4', 'e4', 'f#4', 'a#4', 'c5', 'd5']),
    ] },
    { id: 'horn-sustain', name: 'Trompa em Fá', variants: [
      classicalVariant('horn-sustain', 'Timbre 1', 'v1', ['a2', 'c3', 'd2', 'f2']),
      classicalVariant('horn-sustain', 'Timbre 3', 'v3', ['a2', 'c3', 'd2', 'f2']),
    ] },
    { id: 'timpani-low', name: 'Tímpano grave', variants: [
      classicalHitVariant('timpani-low', 'Round robin 1', 'rr1'),
      classicalHitVariant('timpani-low', 'Round robin 2', 'rr2'),
    ] },
    { id: 'timpani-high', name: 'Tímpano agudo', variants: [
      classicalHitVariant('timpani-high', 'Round robin 1', 'rr1'),
      classicalHitVariant('timpani-high', 'Round robin 2', 'rr2'),
    ] },
  ],
}
export const SAMPLE_BANKS: SampleBank[] = [{id:'chicken-world-v1',name:'Chicken World · instrumentos',credit:'ChickenChess · síntese original; scripts/generate-world-samples.py',license:'CC0-1.0',assets:[
 ...[['guitar','Guitarra dedilhada sintética','c3'],['strings','Cordas sintéticas','c4'],['flute','Flauta sintética','c5'],['marimba','Marimba sintética','c4'],['conga','Conga sintética','c3'],['timpani','Tímpano sintético','c2'],['tambourine','Pandeiro sintético',undefined],['crash','Prato sintético',undefined]].map(([id,name,rootNote])=>({id:id!,name:name!,rootNote,variants:[{name:'Original',file:`/samples/chicken-world-v1/${id}-0.ogg`}]})),
]},{
  id: 'chicken-electro-v1', name: 'Chicken Electro · 01',
  credit: 'ChickenChess · síntese original, gerada por scripts/generate-samples.py', license: 'CC0-1.0',
  assets: [
    { id: 'kick', name: 'Bumbo', variants: variants('kick', ['Profundo', 'Seco']) },
    { id: 'snare', name: 'Caixa', variants: variants('snare', ['Corpo', 'Ghost']) },
    { id: 'hat', name: 'Chimbal fechado', variants: variants('hat', ['Brilhante', 'Suave']) },
    { id: 'open-hat', name: 'Chimbal aberto', variants: variants('open-hat', ['Longo']) },
    { id: 'clap', name: 'Palmas eletrônicas', variants: variants('clap', ['Grupo']) },
    { id: 'tom', name: 'Tom', variants: variants('tom', ['Grave']) },
    { id: 'rim', name: 'Rim', variants: variants('rim', ['Madeira']) },
    { id: 'shaker', name: 'Shaker', variants: variants('shaker', ['Curto']) },
    { id: 'bell', name: 'Sino elétrico · C4', rootNote: 'c4', variants: variants('bell', ['Cristal', 'Feltro']) },
  ],
}, {
  id: 'chicken-jazz-v1', name: 'Chicken Jazz · 01',
  credit: 'ChickenChess · síntese original de sopros, teclas e bateria; scripts/generate-jazz-samples.py', license: 'CC0-1.0',
  assets: [
    ...[
      ['reed', 'Palheta sintética', 'c4', ['Staccato', 'Suave']],
      ['baritone', 'Barítono sintético', 'c3', ['Corpo']],
      ['brass', 'Metal curto sintético', 'c4', ['Queda']],
      ['formant', 'Vogal sintética', 'c4', ['Ah']],
      ['pluck', 'Baixo dedilhado sintético', 'c2', ['Madeira']],
      ['keys', 'Teclas elétricas', 'c4', ['Tine']],
      ['kick', 'Bumbo seco', undefined, ['Curto']],
      ['snare', 'Caixa breaks', undefined, ['Corpo', 'Ghost']],
      ['ride', 'Ride curto', undefined, ['Ponta']],
    ].map(([id, name, rootNote, names]) => ({ id: id as string, name: name as string, rootNote: rootNote as string | undefined,
      variants: (names as string[]).map((name, i) => ({ name, file: `/samples/chicken-jazz-v1/${id}-${i}.ogg` })),
    })),
  ],
}, generatedBank('chicken-strings-v1', 'Chicken Strings · cordas e guitarras', [
  ['steel', 'Violão de aço', 'c4'], ['nylon', 'Violão de nylon', 'c4'],
  ['muted-electric', 'Guitarra elétrica abafada', 'c4'], ['crunch-electric', 'Guitarra elétrica saturada', 'c4'],
  ['slide-electric', 'Guitarra com deslizamento', 'c4'], ['bass-pick', 'Baixo de palheta', 'c2'],
  ['bass-round', 'Baixo elétrico redondo', 'c2'], ['violin', 'Violino arqueado sintético', 'c4'],
  ['cello', 'Violoncelo arqueado sintético', 'c3'], ['pizzicato', 'Pizzicato de cordas', 'c4'],
]), generatedBank('chicken-keys-v1', 'Chicken Keys · teclados', [
  ['grand', 'Piano de cauda', 'c4'], ['upright', 'Piano vertical', 'c4'],
  ['rhodes', 'Piano elétrico FM', 'c4'], ['organ', 'Órgão drawbar', 'c4'],
  ['clav', 'Clavinet', 'c4'], ['celesta', 'Celesta', 'c4'], ['accordion', 'Acordeão', 'c4'],
]), generatedBank('chicken-synths-v1', 'Chicken Synths · síntese modulada', [
  ['acid', 'Baixo ácido com filtro', 'c2'], ['analog-pad', 'Pad analógico desafinado', 'c4'],
  ['fm-bell', 'Sino FM', 'c4'], ['wavetable', 'Lead de tabela de ondas', 'c4'],
  ['sub', 'Subgrave saturado', 'c2'], ['choir', 'Coro formante', 'c4'],
  ['digital-pluck', 'Palheta digital FM', 'c4'],
]), generatedBank('chicken-drums-v1', 'Chicken Drums · bateria acústica', [
  ['rock-kick', 'Bumbo acústico'], ['rock-snare', 'Caixa acústica'],
  ['brush', 'Vassourinha'], ['room-clap', 'Palmas de sala'],
  ['wood-rim', 'Rim de madeira'], ['tambourine', 'Pandeiro acústico'],
  ['ride', 'Ride acústico'],
]), generatedBank('chicken-samba-reggae-v1', 'Chicken Salvador · esboço anterior', [
  ['surdo-fundo', 'Surdo fundo'], ['surdo-meio', 'Surdo meio'], ['surdo-viradeira', 'Surdo viradeira'],
  ['caixa', 'Caixa'], ['tarol', 'Tarol'], ['repinique', 'Repenique'], ['timbau', 'Timbau'],
  ['agogo-grave', 'Agogô grave'], ['agogo-agudo', 'Agogô agudo'],
  ['chocalho', 'Chocalho'], ['pandeiro', 'Pandeiro'],
  ['trompete', 'Trompete', 'c4'], ['trombone', 'Trombone', 'c3'],
], 'generate-samba-reggae-samples.py'), generatedBank('chicken-psytrance-v1', 'Chicken Goa · psytrance', [
  ['kick-punch', 'Bumbo psy · longo'], ['kick-tight', 'Bumbo psy · seco'],
  ['bass-roll', 'Baixo rolante', 'c2'], ['bass-knock', 'Baixo rolante · knock', 'c2'],
  ['acid-squelch', 'Acid squelch (serra ressonante)', 'c3'], ['acid-rubber', 'Acid borracha (quadrada)', 'c3'],
  ['lead-hallucinogen', 'Lead serra desafinada com vibrato', 'c4'], ['fm-pluck', 'Pluck FM de arpejo', 'c4'],
  ['sitar', 'Cítara com ponte jawari', 'c4'], ['om-drone', 'Drone Om formante', 'c3'],
  ['laser-zap', 'Zap laser FM', 'c4'], ['noise-riser', 'Riser de ruído'],
  ['hat-closed', 'Chimbal metálico fechado'], ['hat-soft', 'Chimbal metálico suave'], ['hat-open', 'Chimbal aberto do contratempo'],
  ['clap', 'Palma psy'], ['tick', 'Tick de madeira'],
  ['tabla-na', 'Tabla dayan · Na', 'c5'], ['tabla-ge', 'Tabla bayan · Ge'],
  ['reverse-crash', 'Prato invertido'],
], 'generate-psytrance-samples.py'), generatedBank('chicken-machines-v1', 'Chicken Machines · baterias eletrônicas', [
  ['808-kick', '808 · bumbo'],
  ['808-kick-long', '808 · bumbo longo (boom)'],
  ['808-snare', '808 · caixa'],
  ['808-clap', '808 · palmas'],
  ['808-rim', '808 · rimshot'],
  ['808-cowbell', '808 · cowbell'],
  ['808-clave', '808 · clave'],
  ['808-hat', '808 · chimbal fechado'],
  ['808-open-hat', '808 · chimbal aberto'],
  ['808-cymbal', '808 · prato'],
  ['808-tom-low', '808 · tom grave'],
  ['808-tom-high', '808 · tom agudo'],
  ['808-conga-low', '808 · conga grave'],
  ['808-conga-high', '808 · conga aguda'],
  ['808-maracas', '808 · maracas'],
  ['909-kick', '909 · bumbo'],
  ['909-kick-hard', '909 · bumbo saturado'],
  ['909-snare', '909 · caixa'],
  ['909-snare-tight', '909 · caixa curta'],
  ['909-clap', '909 · palmas'],
  ['909-rim', '909 · rimshot'],
  ['909-hat', '909 · chimbal fechado'],
  ['909-open-hat', '909 · chimbal aberto'],
  ['909-ride', '909 · ride'],
  ['909-crash', '909 · crash'],
  ['909-tom', '909 · tom'],
  ['linn-kick', 'Linn · bumbo'],
  ['linn-snare', 'Linn · caixa com gate'],
  ['linn-clap', 'Linn · palmas com sala'],
  ['linn-cabasa', 'Linn · cabasa'],
  ['linn-tambourine', 'Linn · pandeirola'],
  ['linn-conga', 'Linn · conga'],
  ['break-kick', 'Break · bumbo'],
  ['break-snare', 'Break · caixa'],
  ['break-ghost', 'Break · caixa ghost'],
  ['break-hat', 'Break · chimbal'],
  ['break-open-hat', 'Break · chimbal aberto'],
  ['break-ride', 'Break · ride'],
  ['dusty-kick', 'Dusty · bumbo de vinil'],
  ['dusty-snare', 'Dusty · caixa de vinil'],
  ['dusty-hat', 'Dusty · chimbal de vinil'],
  ['synth-kick', 'Bateria sintética · bumbo'],
  ['synth-snare', 'Bateria sintética · caixa de ruído'],
  ['synth-blip', 'Bateria sintética · blip'],
  ['synth-blip-low', 'Bateria sintética · blip grave'],
  ['synth-tick', 'Bateria sintética · tique'],
], 'generate-machine-samples.py'), generatedBank('chicken-electronic-v1', 'Chicken Electronic · vozes, stabs e efeitos', [
  ['robot-voice', 'Voz robótica (vocoder)', 'c4'],
  ['vox-pad', 'Coro sussurrado (Fairlight)', 'c4'],
  ['oh-chant', 'Grito "oh!" de multidão', 'c4'],
  ['hey', 'Grito "hey!"'],
  ['hoover', 'Hoover rave', 'c3'],
  ['rave-stab', 'Stab rave menor com sétima', 'c4'],
  ['organ-stab', 'Stab de órgão house', 'c4'],
  ['orch-hit', 'Orchestra hit', 'c4'],
  ['siren', 'Sirene'],
  ['dub-siren', 'Sirene dub'],
  ['whistle', 'Apito'],
  ['vinyl', 'Superfície de vinil'],
  ['scratch', 'Scratch'],
  ['metal-hit', 'Chapa de metal'],
  ['gqom-tom', 'Tom-bumbo gqom'],
  ['riser', 'Riser de ruído'],
  ['reverse-cymbal', 'Prato invertido'],
  ['downlifter', 'Downlifter'],
], 'generate-electronic-samples.py'), generatedBank('chicken-brasil-v1', 'Chicken Brasil · cordas, percussão e vozes brasileiras', [
  ['cavaquinho', 'Cavaquinho', 'c5'],
  ['bandolim', 'Bandolim', 'c5'],
  ['viola-caipira', 'Viola caipira (cordas em oitava)', 'c4'],
  ['sanfona', 'Sanfona de três vozes', 'c4'],
  ['coro-laia', 'Coro da quadra · "lá"', 'c4'],
  ['tamborim', 'Tamborim'],
  ['tamborim-abafado', 'Tamborim abafado'],
  ['surdo-mangueira', 'Surdo de primeira (Mangueira)'],
  ['surdo-abafado', 'Surdo abafado'],
  ['zabumba', 'Zabumba · maceta'],
  ['bacalhau', 'Zabumba · bacalhau'],
  ['alfaia', 'Alfaia'],
  ['pandeiro-grave', 'Pandeiro · grave'],
  ['pandeiro-tapa', 'Pandeiro · tapa'],
  ['pandeiro-platinela', 'Pandeiro · platinelas'],
  ['palmas', 'Palmas de roda'],
  ['gongue', 'Gonguê'],
  ['triangulo-aberto', 'Triângulo aberto'],
  ['triangulo-fechado', 'Triângulo fechado'],
  ['ganza', 'Ganzá'],
  ['reco-reco', 'Reco-reco'],
  ['apito', 'Apito do mestre'],
  ['cuica-aguda', 'Cuíca aguda'],
  ['cuica-grave', 'Cuíca grave'],
], 'generate-brazilian-samples.py'), {
  id: 'chicken-samba-reggae-v2', name: 'Chicken Salvador · samba-reggae',
  credit: 'Gravações CC0: VSCO 2 CE e VCSL · Versilian Studios; Samba Percussion · plotzki/Freesound; preparo em scripts/prepare-samba-reggae-recordings.py',
  license: 'CC0-1.0',
  assets: [
    ...[
      ['surdo-fundo', 'Surdo fundo gravado'], ['surdo-meio', 'Surdo meio gravado'],
      ['surdo-viradeira', 'Surdo viradeira gravado'], ['caixa', 'Caixa acústica'],
      ['tarol', 'Tarol de corda'], ['repinique', 'Repinique gravado'],
      ['timbau', 'Resposta de mão (quinto acústico)'], ['agogo-grave', 'Agogô grave'],
      ['agogo-agudo', 'Agogô agudo'], ['chocalho', 'Chocalho'], ['pandeiro', 'Pandeiro gravado'],
    ].map(([id, name]) => ({ id, name, variants: [{ name: 'Gravação', file: `/samples/chicken-samba-reggae-v2/${id}-0.ogg` }] })),
    { id: 'trompete', name: 'Trompete acústico', rootNote: 'f4',
      variants: [{ name: 'Staccato', file: '/samples/chicken-samba-reggae-v2/trompete-f4-0.ogg' }],
      keymap: Object.fromEntries(['g3', 'f4', 'c5'].map(note => [note, `/samples/chicken-samba-reggae-v2/trompete-${note}-0.ogg`])),
    },
    { id: 'trombone', name: 'Trombone tenor acústico', rootNote: 'd3',
      variants: [{ name: 'Staccato', file: '/samples/chicken-samba-reggae-v2/trombone-d3-0.ogg' }],
      keymap: Object.fromEntries([['a#2', 'as2'], ['d3', 'd3'], ['f3', 'f3']].map(([note, file]) => [note, `/samples/chicken-samba-reggae-v2/trombone-${file}-0.ogg`])),
    },
  ],
}, classicalBank, ...RECORDED_BANKS]

export interface SampleSource { kind: 'sample'; bank: string; asset: string; variant: number; pitched: boolean }
export function sampleAsset(source: SampleSource) {
  return SAMPLE_BANKS.find(bank => bank.id === source.bank)?.assets.find(asset => asset.id === source.asset)
}
export function sampleSound(source: SampleSource) {
  return `cc_${source.bank.replace(/-/g, '_')}_${source.asset.replace(/-/g, '_')}_${source.variant}_${source.pitched ? 'pitched' : 'hit'}`
}
export { SAMPLE_FORMAT, sampleUrl } from './sample-format'
import { sampleUrl } from './sample-format'
export function sampleRegistration(source: SampleSource) {
  const asset = sampleAsset(source)
  const variant = asset?.variants[source.variant]
  if (!asset || !variant?.file) throw new Error(`Sample inexistente: ${source.bank}/${source.asset}/${source.variant}`)
  const file = variant.file
  const keymap = source.pitched ? (variant.keymap ?? asset.keymap ?? { [asset.rootNote ?? 'c4']: file }) : undefined
  return { sound: sampleSound(source), file, files: keymap ? Object.values(keymap) : [file],
    map: { [sampleSound(source)]: keymap ? Object.fromEntries(Object.entries(keymap).map(([note, path]) => [note, sampleUrl(path)])) : sampleUrl(file) } }
}
