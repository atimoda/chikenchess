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
    <label><HelpLabel label="Sound source">Synthesis builds the sound from oscillators; sample plays a sound from the local bank. Any piece can use any source.</HelpLabel><select value={source?.kind ?? 'synth'} onChange={e => onChange({ source: e.target.value === 'synth' ? { kind: 'synth' } : { kind: 'sample', bank: bank.id, asset: bank.assets[0].id, variant: 0, pitched: false } })}>
      <option value="synth">Synthesis</option><option value="sample">Sample bank</option>
    </select></label>
    {source?.kind === 'sample' && <>
      <label><HelpLabel label="Sample bank">Collection of local sounds. Switching banks selects its first sound and articulation.</HelpLabel><select value={source.bank} onChange={e => { const next = SAMPLE_BANKS.find(b => b.id === e.target.value)!; onChange({ source: { ...source, bank: next.id, asset: next.assets[0].id, variant: 0 } }) }}>{SAMPLE_BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <div className={styles.pair}><label><HelpLabel label="Bank sound">Sound this piece plays. Switching sounds goes back to the first articulation.</HelpLabel><select value={source.asset} onChange={e => onChange({ source: { ...source, asset: e.target.value, variant: 0 } })}>{bank.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label><HelpLabel label="Articulation">Attack or timbre variation of the sample, such as a soft or dry hit.</HelpLabel><select value={source.variant} onChange={e => onChange({ source: { ...source, variant: Number(e.target.value) } })}>{asset?.variants.map((v, index) => <option key={v.file} value={index}>{v.name}</option>)}</select></label></div>
      <label><span className={styles.helpCaption}>Sample tuning<InfoTip label="Sample tuning and origin">{source.pitched ? `Tuning reference: ${asset?.rootNote?.toUpperCase() ?? 'C4 (conventional for this sound)'}.` : 'MIDI notes mark the attacks; the original pitch is kept.'} {bank.name} · {bank.license}. Sound and behavior can be combined on any piece.</InfoTip></span><select value={source.pitched ? 'pitched' : 'hit'} onChange={e => onChange({ source: { ...source, pitched: e.target.value === 'pitched' } })}><option value="hit">Original · ignore the scale</option><option value="pitched">Pitched · follow scale degrees</option></select></label>

    </>}
  </div>
}
