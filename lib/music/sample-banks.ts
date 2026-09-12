/** Asset metadata has no knowledge of chess roles or instrument behaviours. */
export interface SampleAsset {
  id: string
  name: string
  variants: { name: string; file: string }[]
  rootNote?: string
}
export interface SampleBank {
  id: string
  name: string
  credit: string
  license: string
  assets: SampleAsset[]
}

const variants = (id: string, names = ['Normal', 'Suave']) => names.map((name, i) => ({ name, file: `/samples/chicken-electro-v1/${id}-${i}.wav` }))
export const SAMPLE_BANKS: SampleBank[] = [{
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
}]

export interface SampleSource { kind: 'sample'; bank: string; asset: string; variant: number; pitched: boolean }
export function sampleAsset(source: SampleSource) {
  return SAMPLE_BANKS.find(bank => bank.id === source.bank)?.assets.find(asset => asset.id === source.asset)
}
export function sampleSound(source: SampleSource) {
  return `cc_${source.bank.replace(/-/g, '_')}_${source.asset.replace(/-/g, '_')}_${source.variant}_${source.pitched ? 'pitched' : 'hit'}`
}
export function sampleRegistration(source: SampleSource) {
  const asset = sampleAsset(source)
  const file = asset?.variants[source.variant]?.file
  if (!file) throw new Error(`Sample inexistente: ${source.bank}/${source.asset}/${source.variant}`)
  return { sound: sampleSound(source), file, map: { [sampleSound(source)]: source.pitched ? { [asset.rootNote ?? 'c4']: file } : file } }
}
