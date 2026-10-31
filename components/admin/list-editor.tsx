'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { AdminEntry } from '@/lib/admin/catalog'
import styles from './admin-panel.module.css'

export function ListEditor({ entry, value, onChange }: { entry: AdminEntry; value: unknown; onChange: (value: unknown) => void }) {
  const grouped = entry.kind === 'string-groups' || entry.kind === 'names' || entry.kind === 'text-map'
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const keys = grouped ? Object.keys(record) : []
  const [selectedKey, setSelectedKey] = useState(keys[0] || '')
  useEffect(() => { setSelectedKey(Object.keys(record)[0] || '') }, [entry.id]) // Selection is independent of draft edits.
  const key = keys.includes(selectedKey) ? selectedKey : keys[0]
  const selected = grouped ? record[key] : value
  const replace = (next: unknown) => onChange(grouped ? { ...(value as object), [key]: next } : next)
  const labels: Record<string, string> = {
    title: 'Tratamentos e títulos', adjective: 'Adjetivos', noun: 'Substantivos', epithet: 'Epítetos',
    BEST_MOVE_MESSAGES: 'Melhores jogadas', BEST_MOVES_WITH_WORST_SCORES_MESSAGES: 'Boas escolhas em posições difíceis', WORST_MOVE_MESSAGES: 'Piores jogadas',
    OTHER_PIECE_WORST_MESSAGES: 'Ovos de Worst com outra peça', OTHER_PIECE_BEST_MESSAGES: 'Ovos de Best com outra peça',
    BEST_STREAK_MESSAGES: 'Sequências de boas jogadas', WORST_STREAK_MESSAGES: 'Sequências de más jogadas',
    BEST_STREAK_6_PLUS_MESSAGES: 'Boas sequências de seis ou mais', WORST_STREAK_6_PLUS_MESSAGES: 'Más sequências de seis ou mais', SINGLE_LEGAL_MOVE_MESSAGES: 'Jogada única',
  }
  return <div className={styles.form}>
    {grouped && <label className={styles.field}>Categoria<select className={styles.input} value={key || ''} onChange={event => setSelectedKey(event.target.value)}>{keys.map(item => <option key={item} value={item}>{labels[item] || item}</option>)}</select></label>}
    {typeof selected === 'string' ? <label className={styles.field}>Texto<textarea className={styles.textarea} value={selected} onChange={event => replace(event.target.value)} /></label> : Array.isArray(selected) && selected.every(item => typeof item === 'string') ? <>
      <p className={styles.muted}>{selected.length} itens · a ordem é preservada no arquivo.</p>
      {selected.map((item, index) => <div className={styles.row} key={index}>
        <textarea className={styles.textarea} aria-label={`Item ${index + 1}`} value={item} onChange={event => replace(selected.map((text, position) => position === index ? event.target.value : text))} />
        <div className={styles.rowActions}>
          <button className={styles.button} disabled={index === 0} aria-label={`Mover item ${index + 1} para cima`} onClick={() => { const next = [...selected]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; replace(next) }}><ArrowUp size={16} /></button>
          <button className={styles.button} disabled={index === selected.length - 1} aria-label={`Mover item ${index + 1} para baixo`} onClick={() => { const next = [...selected]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; replace(next) }}><ArrowDown size={16} /></button>
          <button className={styles.button} aria-label={`Remover item ${index + 1}`} onClick={() => replace(selected.filter((_, position) => position !== index))}><Trash2 size={16} /></button>
        </div>
      </div>)}
      <button className={styles.button} onClick={() => replace([...selected, ''])}><Plus size={16} />Adicionar item</button>
    </> : Array.isArray(selected) && selected.every(item => item && typeof item === 'object' && typeof item[entry.kind === 'campaigns' ? 'name' : 'title'] === 'string') && (entry.kind === 'campaigns' || entry.kind === 'ranks') ? selected.map((item, index) => {
      const field = entry.kind === 'campaigns' ? 'name' : 'title'
      return <label className={styles.field} key={index}>{item.id || `${item.minPoints} pontos`}<input className={styles.input} value={item[field]} onChange={event => replace(selected.map((row, position) => position === index ? { ...row, [field]: event.target.value } : row))} /></label>
    }) : <p className={styles.muted}>Use a aba JSON para editar este conteúdo.</p>}
  </div>
}
