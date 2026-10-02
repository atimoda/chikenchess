'use client'
import { InfoTip, HelpLabel } from './info-tip'

import type { CreativeSession } from '@/lib/music/creative'
import { SAMPLE_BANKS, sampleAsset } from '@/lib/music/sample-banks'
import styles from './creative-studio.module.css'

type Instrument = CreativeSession['instruments'][string]

export function SampleSourceControls({ instrument, onChange }: { instrument: Instrument; onChange: (update: Partial<Instrument>) => void }) {
  const source = instrument.source
  const bank = SAMPLE_BANKS.find(b => source?.kind === 'sample' && b.id === source.bank) ?? SAMPLE_BANKS[0]
  const asset = source?.kind === 'sample' ? sampleAsset(source) : undefined
  return <div className={styles.formEditor}>
    <label><HelpLabel label="Fonte sonora">Síntese cria o som por osciladores; sample reproduz um som do banco local. Qualquer peça pode usar qualquer fonte.</HelpLabel><select value={source?.kind ?? 'synth'} onChange={e => onChange({ source: e.target.value === 'synth' ? { kind: 'synth' } : { kind: 'sample', bank: bank.id, asset: bank.assets[0].id, variant: 0, pitched: false } })}>
      <option value="synth">Síntese</option><option value="sample">Banco de samples</option>
    </select></label>
    {source?.kind === 'sample' && <>
      <label><HelpLabel label="Banco de samples">Coleção de sons locais. Trocar o banco seleciona seu primeiro som e articulação.</HelpLabel><select value={source.bank} onChange={e => { const next = SAMPLE_BANKS.find(b => b.id === e.target.value)!; onChange({ source: { ...source, bank: next.id, asset: next.assets[0].id, variant: 0 } }) }}>{SAMPLE_BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <div className={styles.pair}><label><HelpLabel label="Som do banco">Som que esta peça reproduz. Trocar o som volta à primeira articulação.</HelpLabel><select value={source.asset} onChange={e => onChange({ source: { ...source, asset: e.target.value, variant: 0 } })}>{bank.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label><HelpLabel label="Articulação">Variação de ataque ou timbre do sample, como toque suave ou seco.</HelpLabel><select value={source.variant} onChange={e => onChange({ source: { ...source, variant: Number(e.target.value) } })}>{asset?.variants.map((v, index) => <option key={v.file} value={index}>{v.name}</option>)}</select></label></div>
      <label><span className={styles.helpCaption}>Afinação do sample<InfoTip label="Afinação e origem do sample">{source.pitched ? `Referência de afinação: ${asset?.rootNote?.toUpperCase() ?? 'C4 (convencional para este som)'}.` : 'As notas MIDI marcam ataques; a altura original é preservada.'} {bank.name} · {bank.license}. Som e comportamento podem ser combinados em qualquer peça.</InfoTip></span><select value={source.pitched ? 'pitched' : 'hit'} onChange={e => onChange({ source: { ...source, pitched: e.target.value === 'pitched' } })}><option value="hit">Original · sem seguir a escala</option><option value="pitched">Afinado · seguir graus da escala</option></select></label>

    </>}
  </div>
}
