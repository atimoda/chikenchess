'use client'
import { InfoTip, HelpLabel } from './info-tip'
import { useT } from '@/lib/i18n'

import type { CreativeSession } from '@/lib/music/creative'
import { SAMPLE_BANKS, sampleAsset } from '@/lib/music/sample-banks'
import styles from './creative-studio.module.css'

type Instrument = CreativeSession['instruments'][string]

export function SampleSourceControls({ instrument, onChange }: { instrument: Instrument; onChange: (update: Partial<Instrument>) => void }) {
  const t = useT()
  const source = instrument.source
  const bank = SAMPLE_BANKS.find(b => source?.kind === 'sample' && b.id === source.bank) ?? SAMPLE_BANKS[0]
  const asset = source?.kind === 'sample' ? sampleAsset(source) : undefined
  return <div className={styles.formEditor}>
    <label><HelpLabel label={t("Sound source")}>{t("Synthesis builds the sound from oscillators; sample plays a sound from the local bank. Any piece can use any source.")}</HelpLabel><select value={source?.kind ?? 'synth'} onChange={e => onChange({ source: e.target.value === 'synth' ? { kind: 'synth' } : { kind: 'sample', bank: bank.id, asset: bank.assets[0].id, variant: 0, pitched: false } })}>
      <option value="synth">{t("Synthesis")}</option><option value="sample">{t("Sample bank")}</option>
    </select></label>
    {source?.kind === 'sample' && <>
      <label><HelpLabel label={t("Sample bank")}>{t("Collection of local sounds. Switching banks selects its first sound and articulation.")}</HelpLabel><select value={source.bank} onChange={e => { const next = SAMPLE_BANKS.find(b => b.id === e.target.value)!; onChange({ source: { ...source, bank: next.id, asset: next.assets[0].id, variant: 0 } }) }}>{SAMPLE_BANKS.map(b => <option key={b.id} value={b.id}>{t(b.name)}</option>)}</select></label>
      <div className={styles.pair}><label><HelpLabel label={t("Bank sound")}>{t("Sound this piece plays. Switching sounds goes back to the first articulation.")}</HelpLabel><select value={source.asset} onChange={e => onChange({ source: { ...source, asset: e.target.value, variant: 0 } })}>{bank.assets.map(a => <option key={a.id} value={a.id}>{t(a.name)}</option>)}</select></label>
      <label><HelpLabel label={t("Articulation")}>{t("Attack or timbre variation of the sample, such as a soft or dry hit.")}</HelpLabel><select value={source.variant} onChange={e => onChange({ source: { ...source, variant: Number(e.target.value) } })}>{asset?.variants.map((v, index) => <option key={v.file} value={index}>{t(v.name)}</option>)}</select></label></div>
      <label><span className={styles.helpCaption}>{t("Sample tuning")}<InfoTip label={t("Sample tuning and origin")}>{source.pitched ? t('Tuning reference: {note}.', { note: asset?.rootNote?.toUpperCase() ?? t('C4 (conventional for this sound)') }) : t('MIDI notes mark the attacks; the original pitch is kept.')} {t('{bank} · {license}. Sound and behavior can be combined on any piece.', { bank: t(bank.name), license: bank.license })}</InfoTip></span><select value={source.pitched ? 'pitched' : 'hit'} onChange={e => onChange({ source: { ...source, pitched: e.target.value === 'pitched' } })}><option value="hit">{t("Original · ignore the scale")}</option><option value="pitched">{t("Pitched · follow scale degrees")}</option></select></label>

    </>}
  </div>
}
