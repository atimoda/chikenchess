'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { arrangementPosition, DEFAULT_SECTION_TYPE, isSectionType, SECTION_TYPES, type Arrangement, type SectionType } from '@/lib/music/arrangement'
import type { HarmonyPlanId } from '@/lib/music/harmony'
import { beatsPerBar } from '@/lib/music/meter'
import type { MusicMonitor } from '@/lib/music/monitor'
import { HelpLabel } from './info-tip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import styles from './creative-studio.module.css'
import controls from './music-arrangement-controls.module.css'

type Section = Arrangement['sections'][number]
type Draft = { id: string | null; label: SectionType; beats: string; degrees: string }
type Drag = {
  id: string; pointerId: number; element: HTMLButtonElement; capture: HTMLElement; x: number; y: number
  scrollLeft: number; center: number; slots: { id: string; center: number }[]
  active: boolean; order: string[]
}

const CLICK_DELAY = 450
const DRAG_THRESHOLD = 7
const MAX_SECTIONS = 24
const MAX_BEATS = 512

function reordered(sections: Section[], id: string, target: number) {
  const next = [...sections]
  const index = next.findIndex(section => section.id === id)
  if (index < 0) return next
  next.splice(target, 0, next.splice(index, 1)[0])
  return next
}

export function MusicArrangementControls({ arrangement, monitor, harmony, onChange, onSeek }: {
  arrangement: Arrangement
  monitor: MusicMonitor
  harmony: HarmonyPlanId
  onChange: (arrangement: Arrangement) => void
  onSeek: (sectionId: string) => void
}) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const position = arrangementPosition(arrangement, frame.cycle, beatsPerBar(frame.transport?.meter))
  const total = arrangement.sections.reduce((sum, section) => sum + section.beats, 0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const timeline = useRef<HTMLDivElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const returnFocusId = useRef<string | null>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const pendingSeek = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const seek = useRef(onSeek)

  useEffect(() => { seek.current = onSeek }, [onSeek])

  const clearPendingSeek = useCallback(() => {
    if (pendingSeek.current) clearTimeout(pendingSeek.current.timer)
    pendingSeek.current = null
  }, [])

  const cancelDrag = useCallback(() => {
    const gesture = drag.current
    drag.current = null
    setPreview(null)
    setDraggingId(null)
    if (!gesture) return
    suppressClick.current = true
    clearPendingSeek()
    if (gesture.capture.hasPointerCapture(gesture.pointerId)) gesture.capture.releasePointerCapture(gesture.pointerId)
  }, [clearPendingSeek])

  useEffect(() => {
    if (pendingSeek.current && !arrangement.sections.some(section => section.id === pendingSeek.current?.id)) clearPendingSeek()
    const gesture = drag.current
    if (gesture && (gesture.slots.length !== arrangement.sections.length || gesture.slots.some((slot, index) => arrangement.sections[index]?.id !== slot.id))) cancelDrag()
  }, [arrangement, cancelDrag, clearPendingSeek])

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      clearPendingSeek()
      if (drag.current) {
        event.preventDefault()
        cancelDrag()
        setAnnouncement('Reordenação cancelada.')
      }
    }
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('keydown', escape)
      clearPendingSeek()
      const gesture = drag.current
      drag.current = null
      if (gesture?.capture.hasPointerCapture(gesture.pointerId)) gesture.capture.releasePointerCapture(gesture.pointerId)
    }
  }, [cancelDrag, clearPendingSeek])

  const edit = (section: Section) => {
    clearPendingSeek()
    cancelDrag()
    returnFocusId.current = section.id
    setError('')
    setNotice(null)
    setDraft({ id: section.id, label: section.label, beats: String(section.beats), degrees: section.harmony?.join(' ') ?? '' })
  }

  const add = () => {
    clearPendingSeek()
    cancelDrag()
    returnFocusId.current = null
    setError('')
    if (arrangement.sections.length >= MAX_SECTIONS || MAX_BEATS - total < .25) {
      setNotice(arrangement.sections.length >= MAX_SECTIONS
        ? 'O arranjo já atingiu o limite de 24 seções. Exclua uma seção para adicionar outra. A duração total também é limitada a 512 tempos.'
        : 'O arranjo não tem espaço para mais uma seção dentro do limite de 512 tempos. Encurte ou exclua uma seção para adicionar outra. São permitidas até 24 seções.')
      setDraft(null)
      return
    }
    setNotice(null)
    setDraft({ id: null, label: DEFAULT_SECTION_TYPE, beats: String(Math.min(4, MAX_BEATS - total)), degrees: '' })
  }

  const clickSection = (section: Section, detail: number) => {
    if (suppressClick.current && detail !== 0) return
    // Keyboard requests are immediate; pointer clicks wait to distinguish a double click/tap.
    if (detail === 0) {
      clearPendingSeek()
      onSeek(section.id)
      return
    }
    if (pendingSeek.current?.id === section.id || detail > 1) {
      edit(section)
      return
    }
    clearPendingSeek()
    pendingSeek.current = { id: section.id, timer: setTimeout(() => {
      pendingSeek.current = null
      seek.current(section.id)
    }, CLICK_DELAY) }
  }

  const startDrag = (event: PointerEvent<HTMLButtonElement>, section: Section) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return
    const slots = Array.from(timeline.current?.querySelectorAll<HTMLButtonElement>('[data-section-id]') ?? []).map(element => {
      const rect = element.getBoundingClientRect()
      return { id: element.dataset.sectionId!, center: rect.left + rect.width / 2 }
    })
    suppressClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      id: section.id, pointerId: event.pointerId, element: event.currentTarget, capture: event.currentTarget,
      x: event.clientX, y: event.clientY, scrollLeft: timeline.current?.scrollLeft ?? 0,
      center: slots.find(slot => slot.id === section.id)!.center,
      slots, active: false, order: slots.map(slot => slot.id),
    }
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.slots.some((slot, index) => arrangement.sections[index]?.id !== slot.id) || gesture.slots.length !== arrangement.sections.length) {
      cancelDrag()
      return
    }
    if (!gesture.active) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < DRAG_THRESHOLD) return
      gesture.active = true
      suppressClick.current = true
      clearPendingSeek()
      // Capture on the stable container before React moves any preview buttons.
      if (timeline.current) {
        gesture.capture = timeline.current
        gesture.capture.setPointerCapture(event.pointerId)
      }
      setDraggingId(gesture.id)
    }
    event.preventDefault()
    const container = timeline.current
    if (container) {
      const rect = container.getBoundingClientRect()
      if (event.clientX < rect.left + 28) container.scrollLeft -= 16
      else if (event.clientX > rect.right - 28) container.scrollLeft += 16
    }
    // Original centers keep variable-width sections from oscillating as the preview moves.
    const center = gesture.center + event.clientX - gesture.x + (container?.scrollLeft ?? 0) - gesture.scrollLeft
    const target = gesture.slots.filter(slot => slot.id !== gesture.id && center > slot.center).length
    const order = reordered(arrangement.sections, gesture.id, target).map(section => section.id)
    if (order.some((id, index) => id !== gesture.order[index])) {
      gesture.order = order
      setPreview(order)
    }
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    drag.current = null
    setPreview(null)
    setDraggingId(null)
    if (gesture.capture.hasPointerCapture(event.pointerId)) gesture.capture.releasePointerCapture(event.pointerId)
    if (!gesture.active) return
    event.preventDefault()
    suppressClick.current = true
    if (gesture.slots.length !== arrangement.sections.length || gesture.slots.some((slot, index) => arrangement.sections[index]?.id !== slot.id)) return
    const target = gesture.order.indexOf(gesture.id)
    if (arrangement.sections[target]?.id === gesture.id) return
    onChange({ ...arrangement, sections: reordered(arrangement.sections, gesture.id, target) })
    setAnnouncement('Seção movida para a posição ' + (target + 1) + '.')
    gesture.element.focus({ preventScroll: true })
  }

  const save = () => {
    if (!draft) return
    const existing = arrangement.sections.find(section => section.id === draft.id)
    if (draft.id !== null && !existing) { setError('Esta seção já foi excluída. Feche e selecione outra seção.'); return }
    const label = draft.label
    const beats = Number(draft.beats)
    if (!isSectionType(label)) { setError('Escolha um tipo de seção da lista.'); return }
    if (!Number.isFinite(beats) || beats < .25 || beats > 64) { setError('A duração deve ser de 0,25 a 64 tempos.'); return }
    if (total - (existing?.beats ?? 0) + beats > MAX_BEATS) { setError('Essa duração excede o limite de 512 tempos do arranjo. Encurte uma seção.'); return }
    if (!existing && arrangement.sections.length >= MAX_SECTIONS) { setError('O arranjo já atingiu o limite de 24 seções. Exclua uma seção antes de adicionar.'); return }
    let section: Section
    if (existing) section = { ...existing, label, beats }
    else {
      let id = globalThis.crypto.randomUUID()
      while (arrangement.sections.some(item => item.id === id)) id = globalThis.crypto.randomUUID()
      section = { id, label, beats }
    }
    if (harmony === 'kit') {
      const tokens = draft.degrees.trim() ? draft.degrees.trim().split(/[\s,]+/) : []
      if (tokens.length > 8 || tokens.some(token => !/^[+-]?\d+$/.test(token) || Math.abs(Number(token)) > 14)) {
        setError('Use até oito graus inteiros de −14 a 14, separados por espaços ou vírgulas.')
        return
      }
      if (tokens.length) section.harmony = tokens.map(Number)
      else delete section.harmony
    }
    onChange({ ...arrangement, sections: existing
      ? arrangement.sections.map(item => item.id === existing.id ? section : item)
      : [...arrangement.sections, section] })
    setDraft(null)
  }

  const remove = () => {
    if (!draft?.id || arrangement.sections.length <= 1) return
    onChange({ ...arrangement, sections: arrangement.sections.filter(section => section.id !== draft.id) })
    setDraft(null)
  }

  const sections = preview?.length === arrangement.sections.length && preview.every(id => arrangement.sections.some(section => section.id === id))
    ? preview.map(id => arrangement.sections.find(section => section.id === id)!) : arrangement.sections

  return <>
    <div className={controls.dock} role="group" aria-label="Arranjo global">
    <div ref={timeline} className={controls.timeline} role="group" aria-label="Seções do arranjo global" data-dragging={!!draggingId || undefined}
      onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}
      onLostPointerCapture={event => { if (event.target === drag.current?.capture) cancelDrag() }}>
      {sections.map(item => {
        const playing = frame.running && position.section.id === item.id
        const next = frame.transport?.nextSectionId === item.id
        return <button type="button" key={item.id} className={controls.sectionButton}
          data-section-id={item.id} data-playing={playing || undefined} data-next={next || undefined} data-dragging={draggingId === item.id || undefined}
          aria-label={item.label + ', ' + item.beats + ' tempos' + (playing ? ', em execução' : '') + (next ? ', próxima seção' : '')}
          aria-current={playing ? 'true' : undefined} aria-keyshortcuts="Enter Space F2 Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
          style={{ flexGrow: item.beats }} title={item.label + ' · ' + item.beats + ' tempos · Clique para marcar a próxima; duplo clique ou F2 para editar'}
          onClick={event => clickSection(item, event.detail)}
          onDoubleClick={event => { event.preventDefault(); if (!suppressClick.current) edit(item) }}
          onPointerDown={event => startDrag(event, item)}
          onKeyDown={event => {
            if (drag.current) {
              if (event.key === 'Escape') { event.preventDefault(); cancelDrag() }
              return
            }
            if (event.key === 'F2') { event.preventDefault(); edit(item) }
            else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); clearPendingSeek(); onSeek(item.id) }
            else if (event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
              event.preventDefault()
              clearPendingSeek()
              const index = arrangement.sections.findIndex(section => section.id === item.id)
              const target = index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1)
              if (target < 0 || target >= arrangement.sections.length) return
              onChange({ ...arrangement, sections: reordered(arrangement.sections, item.id, target) })
              setAnnouncement(item.label + ': posição ' + (target + 1) + '.')
            }
          }}>
          {playing && <span className={controls.progress} aria-hidden="true" style={{ width: Math.max(0, Math.min(1, position.progress)) * 100 + '%' }} />}
          <span className={controls.sectionLabel}>{item.label}</span><small>{item.beats} tempos{next && <span className={controls.nextMarker}> · Próxima</span>}</small>
        </button>
      })}
      <button ref={addButton} type="button" className={controls.addButton} aria-label="Adicionar seção global" title="Adicionar seção global" onClick={add}><Plus size={18} aria-hidden="true" /></button>
    </div>
    <span className={controls.srOnly} role="status" aria-live="polite">{announcement}</span>
    </div>
    <Dialog open={!!draft || !!notice} onOpenChange={open => { if (!open) { setDraft(null); setNotice(null); setError('') } }}>
      <DialogContent className={controls.dialog} closeLabel={notice ? 'Fechar aviso do arranjo' : 'Cancelar edição do arranjo'}
        onCloseAutoFocus={event => {
          event.preventDefault()
          const buttons = Array.from(timeline.current?.querySelectorAll<HTMLButtonElement>('[data-section-id]') ?? [])
          const target = returnFocusId.current ? buttons.find(button => button.dataset.sectionId === returnFocusId.current) ?? buttons[0] : addButton.current
          target?.focus({ preventScroll: true })
        }}>
        <DialogHeader className={notice ? undefined : controls.srOnly}>
          <DialogTitle className={notice ? controls.dialogTitle : controls.srOnly}>{notice ? 'Limite do arranjo' : draft?.id ? 'Editar seção global' : 'Adicionar seção global'}</DialogTitle>
          <DialogDescription className={notice ? controls.description : controls.srOnly}>{notice ?? 'Salvar aplica os campos. Cancelar descarta o rascunho.'}</DialogDescription>
        </DialogHeader>
        {notice ? <div className={styles.actions + ' ' + controls.dialogActions}><button type="button" onClick={() => setNotice(null)}>Entendi</button></div> : draft && <form className={controls.form} noValidate onSubmit={event => { event.preventDefault(); save() }}>
          <label><HelpLabel label="Tipo de seção">Função da seção na forma da música. A seção é compartilhada por todas as peças; o mesmo tipo pode se repetir.</HelpLabel>
            <select aria-label="Tipo de seção" value={draft.label} onChange={event => { if (isSectionType(event.target.value)) setDraft({ ...draft, label: event.target.value }); setError('') }}>
              {SECTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label><HelpLabel label="Duração (tempos)">De 0,25 a 64 pulsos. Todas as peças compartilham esta duração; a unidade do pulso acompanha o compasso do kit.</HelpLabel>
            <input aria-label="Duração da seção global" type="number" inputMode="decimal" min={.25} max={64} step={.25} value={draft.beats} onChange={event => { setDraft({ ...draft, beats: event.target.value }); setError('') }} />
          </label>
          <label><HelpLabel label="Graus harmônicos">Use até oito inteiros de −14 a 14, separados por espaços ou vírgulas. 0 é a tônica, 1 o próximo grau da escala e −1 o anterior. Cada compasso local avança um grau e repete a sequência. Editável somente em Kit Harmony; os demais planos conservam os graus salvos.</HelpLabel>
            <input aria-label="Graus harmônicos da seção" disabled={harmony !== 'kit'} value={draft.degrees} placeholder="Opcional, ex.: 0 3 4 0" onChange={event => { setDraft({ ...draft, degrees: event.target.value }); setError('') }} />
          </label>
          {harmony !== 'kit' && <p className={controls.description}>Selecione Kit Harmony para editar os graus. Os valores salvos são preservados.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions + ' ' + controls.dialogActions + ' ' + controls.editorFooter}>
            {draft.id && <button type="button" className={controls.delete} disabled={arrangement.sections.length <= 1} onClick={remove}><Trash2 size={14} aria-hidden="true" />Excluir</button>}
            <div className={controls.confirmActions}>
              <button type="button" onClick={() => setDraft(null)}>Cancelar</button>
              <button type="submit" className={controls.save}>Salvar</button>
            </div>
          </div>
          {draft.id && arrangement.sections.length <= 1 && <p className={controls.description}>O arranjo precisa manter uma seção.</p>}
        </form>}
      </DialogContent>
    </Dialog>
  </>
}
