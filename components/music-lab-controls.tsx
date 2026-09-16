'use client'
import { InfoTip, HelpLabel } from './info-tip'

import { useEffect, useState } from 'react'
import type { CreativeSession } from '@/lib/music/creative'
import { SAMPLE_BANKS, sampleAsset } from '@/lib/music/sample-banks'
import { AUTOMATION_TARGETS, type AutomationTarget, type Automations } from '@/lib/music/automation'
import type { Groove, GrooveBinding } from '@/lib/music/grooves'
import styles from './creative-studio.module.css'

type Instrument = CreativeSession['instruments'][string]
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e)

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
      <label><span className={styles.helpCaption}>Afinação do sample<InfoTip label="Afinação e origem do sample">{source.pitched ? `Referência de afinação: ${asset?.rootNote?.toUpperCase() ?? 'C4 (convencional para este som)'}.` : 'Os números do padrão marcam ataques; a altura original é preservada.'} {bank.name} · {bank.license}. Som e comportamento podem ser combinados em qualquer peça.</InfoTip></span><select value={source.pitched ? 'pitched' : 'hit'} onChange={e => onChange({ source: { ...source, pitched: e.target.value === 'pitched' } })}><option value="hit">Original · sem seguir a escala</option><option value="pitched">Afinado · seguir graus da escala</option></select></label>

    </>}
  </div>
}

export function AutomationControls({ id, instrument, onApply }: { id: string; instrument: Instrument; onApply: (automations: Automations) => Promise<void> }) {
  const [draft, setDraft] = useState<Automations>(instrument.automations ?? {})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setDraft(instrument.automations ?? {}); setError('') }, [id, instrument.automations])
  return <details open><summary>Acentos e automações<InfoTip label="Automações">Ganho multiplica o volume base. Filtro, pan e efeitos substituem seus valores fixos. As curvas são lidas a cada ataque; A/B/C/D seguem a seção compartilhada.</InfoTip></summary><div className={styles.formEditor}>

    {(Object.keys(AUTOMATION_TARGETS) as AutomationTarget[]).map(target => {
      const meta = AUTOMATION_TARGETS[target], value = draft[target]
      return <div className={styles.automationRow} key={target}>
        <label><HelpLabel label={meta.label}>Valor fixo desliga a automação; padrão segue as seções; curva suave oscila entre início e fim; rampa cresce e reinicia a cada quantidade de ciclos.</HelpLabel><select aria-label={`Automação ${target}`} value={value?.kind ?? 'off'} onChange={e => {
          const kind = e.target.value
          setDraft(current => ({ ...current, [target]: kind === 'off' ? undefined : kind === 'pattern' ? { kind, patterns: [meta.initial] } : { kind: kind as 'sine' | 'ramp', min: meta.min, max: target === 'gain' ? 1 : meta.max, cycles: 4 } }))
        }}><option value="off">Valor fixo</option><option value="pattern">Padrão por seção</option><option value="sine">Curva suave</option><option value="ramp">Rampa crescente</option></select></label>
        {value?.kind === 'pattern' && <>
          {value.patterns.map((pattern, index) => <label key={index}>{String.fromCharCode(65 + index)} · {meta.min} a {meta.max}<input aria-label={`${target} padrão ${String.fromCharCode(65 + index)}`} value={pattern} maxLength={256} onChange={e => setDraft(current => ({ ...current, [target]: { ...value, patterns: value.patterns.map((p, i) => i === index ? e.target.value : p) } }))} /></label>)}
          <div className={styles.actions}><button disabled={value.patterns.length >= 4} onClick={() => setDraft(current => ({ ...current, [target]: { ...value, patterns: [...value.patterns, value.patterns.at(-1)!] } }))}>+ Seção</button><button disabled={value.patterns.length <= 1} onClick={() => setDraft(current => ({ ...current, [target]: { ...value, patterns: value.patterns.slice(0, -1) } }))}>− Seção</button></div>
        </>}
        {value && value.kind !== 'pattern' && <div className={styles.triple}>{(['min', 'max', 'cycles'] as const).map(field => <label key={field}>{field === 'min' ? 'Início' : field === 'max' ? 'Fim' : 'Ciclos'}<input aria-label={`${target} ${field}`} type="number" step={field === 'cycles' ? .25 : target === 'lpf' ? 10 : .05} min={field === 'cycles' ? .25 : meta.min} max={field === 'cycles' ? 32 : meta.max} value={value[field]} onChange={e => setDraft(current => ({ ...current, [target]: { ...value, [field]: Number(e.target.value) } }))} /></label>)}</div>}
      </div>
    })}
    <button disabled={busy} onClick={async () => { setBusy(true); try { await onApply(Object.fromEntries(Object.entries(draft).filter(([, value]) => value))); setError('') } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }}>Aplicar automações</button>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div></details>
}

export function GrooveControls({ id, grooves, binding, onApply }: { id: string; grooves: Record<string, Groove>; binding?: GrooveBinding; onApply: (grooves: Record<string, Groove>, binding?: GrooveBinding) => Promise<void> }) {
  const [draft, setDraft] = useState(grooves)
  const [grooveId, setGrooveId] = useState(binding?.groove ?? '')
  const [laneId, setLaneId] = useState(binding?.lane ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setDraft(grooves); setGrooveId(binding?.groove ?? ''); setLaneId(binding?.lane ?? ''); setError('') }, [id, grooves, binding])
  const groove = draft[grooveId], lane = groove?.lanes[laneId]
  function updateLane(update: Partial<Groove['lanes'][string]>) { setDraft(current => ({ ...current, [grooveId]: { ...current[grooveId], lanes: { ...current[grooveId].lanes, [laneId]: { ...current[grooveId].lanes[laneId], ...update } } } })) }
  return <details open><summary>Groove compartilhado<InfoTip label="Groove e trilhas">x = ataque · ~ = pausa. Esta trilha define o ritmo e os acentos; os graus continuam vindo do instrumento. Editar a trilha altera todas as peças ligadas a ela. Qualquer peça pode usar qualquer trilha.</InfoTip></summary><div className={styles.formEditor}>
    <label><HelpLabel label="Groove">Escolhe um ritmo compartilhado. Sem groove, a peça usa o ritmo de suas próprias notas.</HelpLabel><select value={grooveId} onChange={e => { setGrooveId(e.target.value); setLaneId(Object.keys(draft[e.target.value]?.lanes ?? {})[0] ?? '') }}><option value="">Usar ritmo do próprio padrão</option>{Object.entries(draft).map(([key, g]) => <option key={key} value={key}>{g.name}</option>)}</select></label>
    <button disabled={Object.keys(draft).length >= 8} onClick={() => { const key = `groove-${Date.now()}`; setDraft(current => ({ ...current, [key]: { name: 'Meu groove', lanes: { pulse: { name: 'Minha trilha', rhythms: ['x ~ x ~'], accents: ['1 .6'] } } } })); setGrooveId(key); setLaneId('pulse') }}>Novo groove</button>
    {groove && <>
      <label><HelpLabel label="Nome do groove">Nome da coleção compartilhada de trilhas rítmicas.</HelpLabel><input value={groove.name} maxLength={80} onChange={e => setDraft(current => ({ ...current, [grooveId]: { ...groove, name: e.target.value } }))} /></label>
      <label><HelpLabel label="Trilha desta peça">Liga esta peça a uma trilha do groove. Outras peças podem compartilhar a mesma trilha.</HelpLabel><select value={laneId} onChange={e => setLaneId(e.target.value)}>{Object.entries(groove.lanes).map(([key, l]) => <option key={key} value={key}>{l.name}</option>)}</select></label>
      <button disabled={Object.keys(groove.lanes).length >= 16} onClick={() => { const key = `lane-${Date.now()}`; setDraft(current => ({ ...current, [grooveId]: { ...groove, lanes: { ...groove.lanes, [key]: { name: 'Nova trilha', rhythms: ['x ~'], accents: ['1'] } } } })); setLaneId(key) }}>Nova trilha</button>
    </>}
    {lane && <>
      <label><HelpLabel label="Nome da trilha">Nome da linha de ritmo e acentos. Editá-la afeta todas as peças vinculadas.</HelpLabel><input maxLength={60} value={lane.name} onChange={e => updateLane({ name: e.target.value })} /></label>
      {lane.rhythms.map((rhythm, i) => <div key={i} className={styles.automationRow}><label>Ritmo {String.fromCharCode(65 + i)}<input aria-label={`Groove ritmo ${String.fromCharCode(65 + i)}`} value={rhythm} maxLength={256} onChange={e => updateLane({ rhythms: lane.rhythms.map((r, index) => i === index ? e.target.value : r) })} /></label><label>Acentos {String.fromCharCode(65 + i)} · 0 a 1<input aria-label={`Groove acentos ${String.fromCharCode(65 + i)}`} value={lane.accents[i % lane.accents.length]} maxLength={256} onChange={e => updateLane({ accents: lane.rhythms.map((_, index) => i === index ? e.target.value : lane.accents[index % lane.accents.length]) })} /></label></div>)}
      <div className={styles.actions}><button disabled={lane.rhythms.length >= 4} onClick={() => updateLane({ rhythms: [...lane.rhythms, lane.rhythms.at(-1)!], accents: [...lane.rhythms.map((_, i) => lane.accents[i % lane.accents.length]), lane.accents.at(-1)!] })}>+ Variação</button><button disabled={lane.rhythms.length <= 1} onClick={() => updateLane({ rhythms: lane.rhythms.slice(0, -1), accents: lane.accents.slice(0, -1) })}>− Variação</button></div>

    </>}
    <button disabled={busy} onClick={async () => { setBusy(true); try { await onApply(draft, grooveId ? { groove: grooveId, lane: laneId } : undefined); setError('') } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }}>Aplicar trilha e groove</button>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div></details>
}
