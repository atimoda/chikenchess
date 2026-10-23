'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { arrangementPosition, DEFAULT_SECTION_TYPE, isSectionType, SECTION_TYPES, type Arrangement, type SectionType } from '@/lib/music/arrangement'
import type { HarmonyPlanId } from '@/lib/music/harmony'
import { beatsPerBar } from '@/lib/music/meter'
import type { MusicMonitor } from '@/lib/music/monitor'
import { HelpLabel } from './info-tip'
import { CompactNumberInput } from './compact-number-input'
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
        setAnnouncement('Reordering canceled.')
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
        ? 'The arrangement already has the maximum of 24 sections. Delete a section to add another. The total length is also limited to 512 beats.'
        : 'The arrangement has no room for another section within the 512-beat limit. Shorten or delete a section to add another. Up to 24 sections are allowed.')
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
    setAnnouncement('Section moved to position ' + (target + 1) + '.')
    gesture.element.focus({ preventScroll: true })
  }

  const save = () => {
    if (!draft) return
    const existing = arrangement.sections.find(section => section.id === draft.id)
    if (draft.id !== null && !existing) { setError('This section was already deleted. Close and pick another section.'); return }
    const label = draft.label
    const beats = Number(draft.beats)
    if (!isSectionType(label)) { setError('Pick a section type from the list.'); return }
    if (!Number.isFinite(beats) || beats < .25 || beats > 64) { setError('The length must be 0.25 to 64 beats.'); return }
    if (total - (existing?.beats ?? 0) + beats > MAX_BEATS) { setError('That length exceeds the arrangement’s 512-beat limit. Shorten a section.'); return }
    if (!existing && arrangement.sections.length >= MAX_SECTIONS) { setError('The arrangement already has the maximum of 24 sections. Delete a section before adding one.'); return }
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
        setError('Use up to eight whole degrees from −14 to 14, separated by spaces or commas.')
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
    <div className={controls.dock} role="group" aria-label="Global arrangement">
    <div ref={timeline} className={controls.timeline} role="group" aria-label="Global arrangement sections" data-dragging={!!draggingId || undefined}
      onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}
      onLostPointerCapture={event => { if (event.target === drag.current?.capture) cancelDrag() }}>
      {sections.map(item => {
        const playing = frame.running && position.section.id === item.id
        const next = frame.transport?.nextSectionId === item.id
        return <button type="button" key={item.id} className={controls.sectionButton}
          data-section-id={item.id} data-playing={playing || undefined} data-next={next || undefined} data-dragging={draggingId === item.id || undefined}
          aria-label={item.label + ', ' + item.beats + ' beats' + (playing ? ', playing' : '') + (next ? ', next section' : '')}
          aria-current={playing ? 'true' : undefined} aria-keyshortcuts="Enter Space F2 Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
          style={{ flexGrow: item.beats }} title={item.label + ' · ' + item.beats + ' beats · Click to queue it next; double-click or F2 to edit'}
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
              setAnnouncement(item.label + ': position ' + (target + 1) + '.')
            }
          }}>
          {playing && <span className={controls.progress} aria-hidden="true" style={{ width: Math.max(0, Math.min(1, position.progress)) * 100 + '%' }} />}
          <span className={controls.sectionLabel}>{item.label}</span><small>{item.beats} beats{next && <span className={controls.nextMarker}> · Next</span>}</small>
        </button>
      })}
      <button ref={addButton} type="button" className={controls.addButton} aria-label="Add global section" title="Add global section" onClick={add}><Plus size={18} aria-hidden="true" /></button>
    </div>
    <span className={controls.srOnly} role="status" aria-live="polite">{announcement}</span>
    </div>
    <Dialog open={!!draft || !!notice} onOpenChange={open => { if (!open) { setDraft(null); setNotice(null); setError('') } }}>
      <DialogContent className={controls.dialog} closeLabel={notice ? 'Close arrangement notice' : 'Cancel arrangement edit'}
        onCloseAutoFocus={event => {
          event.preventDefault()
          const buttons = Array.from(timeline.current?.querySelectorAll<HTMLButtonElement>('[data-section-id]') ?? [])
          const target = returnFocusId.current ? buttons.find(button => button.dataset.sectionId === returnFocusId.current) ?? buttons[0] : addButton.current
          target?.focus({ preventScroll: true })
        }}>
        <DialogHeader className={notice ? undefined : controls.srOnly}>
          <DialogTitle className={notice ? controls.dialogTitle : controls.srOnly}>{notice ? 'Arrangement limit' : draft?.id ? 'Edit global section' : 'Add global section'}</DialogTitle>
          <DialogDescription className={notice ? controls.description : controls.srOnly}>{notice ?? 'Save applies the fields. Cancel discards the draft.'}</DialogDescription>
        </DialogHeader>
        {notice ? <div className={styles.actions + ' ' + controls.dialogActions}><button type="button" onClick={() => setNotice(null)}>Got it</button></div> : draft && <form className={controls.form} noValidate onSubmit={event => { event.preventDefault(); save() }}>
          <label><HelpLabel label="Section type">The section’s role in the song form. The section is shared by every piece; the same type can repeat.</HelpLabel>
            <select aria-label="Section type" value={draft.label} onChange={event => { if (isSectionType(event.target.value)) setDraft({ ...draft, label: event.target.value }); setError('') }}>
              {SECTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label><HelpLabel label="Length (beats)">From 0.25 to 64 beats. Every piece shares this length; the beat unit follows the kit’s time signature.</HelpLabel>
            <CompactNumberInput ariaLabel="Global section length" min={.25} max={64} step={.25} value={Number(draft.beats) || .25} onChange={beats => { setDraft({ ...draft, beats: String(beats) }); setError('') }} />
          </label>
          <label><HelpLabel label="Harmonic degrees">Use up to eight whole numbers from −14 to 14, separated by spaces or commas. 0 is the root, 1 the next scale degree and −1 the previous one. Each local bar moves one degree and the sequence repeats. Editable only with Kit Harmony; the other plans keep the saved degrees.</HelpLabel>
            <input aria-label="Section harmonic degrees" disabled={harmony !== 'kit'} value={draft.degrees} placeholder="Optional, e.g. 0 3 4 0" onChange={event => { setDraft({ ...draft, degrees: event.target.value }); setError('') }} />
          </label>
          {harmony !== 'kit' && <p className={controls.description}>Select Kit Harmony to edit the degrees. The saved values are kept.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions + ' ' + controls.dialogActions + ' ' + controls.editorFooter}>
            {draft.id && <button type="button" className={controls.delete} disabled={arrangement.sections.length <= 1} onClick={remove}><Trash2 size={14} aria-hidden="true" />Delete</button>}
            <div className={controls.confirmActions}>
              <button type="button" onClick={() => setDraft(null)}>Cancel</button>
              <button type="submit" className={controls.save}>Save</button>
            </div>
          </div>
          {draft.id && arrangement.sections.length <= 1 && <p className={controls.description}>The arrangement must keep at least one section.</p>}
        </form>}
      </DialogContent>
    </Dialog>
  </>
}
