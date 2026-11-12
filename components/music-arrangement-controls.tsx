'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { arrangementPosition, DEFAULT_SECTION_TYPE, isSectionType, SECTION_TYPES, type Arrangement } from '@/lib/music/arrangement'
import type { HarmonyPlanId } from '@/lib/music/harmony'
import { beatsPerBar } from '@/lib/music/meter'
import type { MusicMonitor } from '@/lib/music/monitor'
import { CompactNumberInput } from './compact-number-input'
import controls from './music-arrangement-controls.module.css'

type Section = Arrangement['sections'][number]
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

/** Global Sections bar. A click queues a section; a double click opens its inline
 * editor row below the bar. Without `onChange` the bar only queues sections. */
export function MusicArrangementControls({ arrangement, monitor, harmony, onChange, onSeek, compact = false, selectedId, onSelect }: {
  arrangement: Arrangement
  monitor: MusicMonitor
  harmony: HarmonyPlanId
  onChange?: (arrangement: Arrangement) => void
  onSeek: (sectionId: string) => void
  compact?: boolean
  /** Section picked for the instrument editor's Section scope; a click picks it at once. */
  selectedId?: string | null
  /** null when a single click lands on the section that was already selected. */
  onSelect?: (sectionId: string | null) => void
}) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const position = arrangementPosition(arrangement, frame.cycle, beatsPerBar(frame.transport?.meter))
  const total = arrangement.sections.reduce((sum, section) => sum + section.beats, 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [degrees, setDegrees] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const timeline = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const pendingSeek = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const seek = useRef(onSeek)
  const openBeforeClick = useRef(false)

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
    setError('')
    setNotice(null)
    setEditingId(section.id)
    setDegrees(section.harmony?.join(' ') ?? '')
  }

  const add = () => {
    if (!onChange) return
    clearPendingSeek()
    cancelDrag()
    setError('')
    if (arrangement.sections.length >= MAX_SECTIONS || MAX_BEATS - total < .25) {
      setNotice(arrangement.sections.length >= MAX_SECTIONS
        ? 'The arrangement already has the maximum of 24 sections. Delete one to add another.'
        : 'No room for another section within the 512-beat limit. Shorten or delete a section.')
      setEditingId(null)
      return
    }
    setNotice(null)
    let id = globalThis.crypto.randomUUID()
    while (arrangement.sections.some(item => item.id === id)) id = globalThis.crypto.randomUUID()
    onChange({ ...arrangement, sections: [...arrangement.sections, { id, label: DEFAULT_SECTION_TYPE, beats: Math.min(4, MAX_BEATS - total) }] })
    setEditingId(id)
    setDegrees('')
  }

  const editing = arrangement.sections.find(section => section.id === editingId) ?? null
  const patch = (changes: Partial<Section>) => {
    if (!editing || !onChange) return
    onChange({ ...arrangement, sections: arrangement.sections.map(item => item.id === editing.id ? { ...item, ...changes } : item) })
  }
  const setBeats = (value: number) => {
    if (!editing || !Number.isFinite(value)) return
    const room = MAX_BEATS - (total - editing.beats)
    const beats = Math.max(.25, Math.min(64, room, value))
    setError(beats < value ? 'The arrangement is limited to 512 beats in total.' : '')
    if (beats !== editing.beats) patch({ beats })
  }
  const commitDegrees = () => {
    if (!editing || harmony !== 'kit') return
    const tokens = degrees.trim() ? degrees.trim().split(/[\s,]+/) : []
    if (tokens.length > 16 || tokens.some(token => !/^[+-]?\d+$/.test(token) || Math.abs(Number(token)) > 14)) {
      setError('Harmony: up to sixteen whole degrees from −14 to 14, separated by spaces or commas.')
      return
    }
    setError('')
    const next = tokens.map(Number)
    if (next.join(' ') === (editing.harmony ?? []).join(' ')) return
    const section: Section = { ...editing }
    if (next.length) section.harmony = next
    else delete section.harmony
    onChange?.({ ...arrangement, sections: arrangement.sections.map(item => item.id === editing.id ? section : item) })
  }
  const remove = () => {
    if (!editing || !onChange || arrangement.sections.length <= 1) return
    const index = arrangement.sections.findIndex(section => section.id === editing.id)
    onChange({ ...arrangement, sections: arrangement.sections.filter(section => section.id !== editing.id) })
    setEditingId(null)
    setError('')
    const buttons = Array.from(timeline.current?.querySelectorAll<HTMLButtonElement>('[data-section-id]') ?? []).filter(button => button.dataset.sectionId !== editing.id)
    buttons[Math.min(index, buttons.length - 1)]?.focus({ preventScroll: true })
  }
  const closeEditor = () => {
    const id = editingId
    setEditingId(null)
    setError('')
    timeline.current?.querySelector<HTMLButtonElement>(`[data-section-id="${id}"]`)?.focus({ preventScroll: true })
  }

  const clickSection = (section: Section, detail: number) => {
    if (suppressClick.current && detail !== 0) return
    // A single click on the selected section deselects it (Piece Parameters go back to All) without seeking.
    if (detail === 1 && onSelect && selectedId === section.id && !editingId) {
      clearPendingSeek()
      onSelect(null)
      return
    }
    onSelect?.(section.id)
    // Keyboard requests are immediate; pointer clicks wait to distinguish a double click/tap.
    if (detail === 0) {
      clearPendingSeek()
      onSeek(section.id)
      return
    }
    if (onChange && (pendingSeek.current?.id === section.id || detail > 1)) {
      // Double clicking the section that was already open closes its row.
      if (openBeforeClick.current) closeEditor()
      else edit(section)
      return
    }
    openBeforeClick.current = editingId === section.id
    // With the row open, a single click moves it to the clicked section.
    if (onChange && editingId && editingId !== section.id) edit(section)
    clearPendingSeek()
    pendingSeek.current = { id: section.id, timer: setTimeout(() => {
      pendingSeek.current = null
      seek.current(section.id)
    }, CLICK_DELAY) }
  }

  const startDrag = (event: PointerEvent<HTMLButtonElement>, section: Section) => {
    if (!onChange || !event.isPrimary || event.button !== 0 || drag.current) return
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
    onChange?.({ ...arrangement, sections: reordered(arrangement.sections, gesture.id, target) })
    setAnnouncement('Section moved to position ' + (target + 1) + '.')
    gesture.element.focus({ preventScroll: true })
  }

  const sections = preview?.length === arrangement.sections.length && preview.every(id => arrangement.sections.some(section => section.id === id))
    ? preview.map(id => arrangement.sections.find(section => section.id === id)!) : arrangement.sections

  return <>
    <div className={controls.dock} role="group" aria-label="Global arrangement" data-compact={compact || undefined}>
    <div ref={timeline} className={controls.timeline} role="group" aria-label="Global arrangement sections" data-dragging={!!draggingId || undefined}
      onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}
      onLostPointerCapture={event => { if (event.target === drag.current?.capture) cancelDrag() }}>
      {sections.map(item => {
        const playing = frame.running && position.section.id === item.id
        const next = frame.transport?.nextSectionId === item.id
        return <button type="button" key={item.id} className={controls.sectionButton}
          data-section-id={item.id} data-playing={playing || undefined} data-next={next || undefined} data-dragging={draggingId === item.id || undefined} data-editing={editingId === item.id || undefined} data-selected={selectedId === item.id || undefined}
          aria-label={item.label + ', ' + item.beats + ' beats' + (playing ? ', playing' : '') + (next ? ', next section' : '')}
          aria-current={playing ? 'true' : undefined} aria-keyshortcuts={onChange ? 'Enter Space F2 Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown' : 'Enter Space'} aria-expanded={onChange ? editingId === item.id : undefined}
          style={{ flexGrow: item.beats }} title={item.label + ' · ' + item.beats + ' beats · Click to queue it next' + (onChange ? '; double-click or F2 to edit' : '')}
          onClick={event => clickSection(item, event.detail)}
          // The second click (detail 2) already opened the editor.
          onDoubleClick={event => event.preventDefault()}
          onPointerDown={event => startDrag(event, item)}
          onKeyDown={event => {
            if (drag.current) {
              if (event.key === 'Escape') { event.preventDefault(); cancelDrag() }
              return
            }
            if (event.key === 'F2' && onChange) { event.preventDefault(); edit(item) }
            else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); clearPendingSeek(); onSeek(item.id) }
            else if (onChange && event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
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
          {compact && next && <span className={controls.compactNext} aria-hidden="true">Next</span>}
        </button>
      })}
      {onChange && <button type="button" className={controls.addButton} aria-label="Add global section" title="Add global section" onClick={add}><Plus size={compact ? 14 : 18} aria-hidden="true" /></button>}
    </div>
    {editing && onChange && <div className={controls.editor} role="group" aria-label={'Edit global section ' + editing.label}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeEditor() } }}>
      <label className={controls.field}><span>Label</span>
        <select aria-label="Section type" value={editing.label} title="The section’s role in the song form, shared by every piece" onChange={event => { if (isSectionType(event.target.value)) patch({ label: event.target.value }) }}>
          {SECTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className={controls.field}><span>Beats</span>
        <CompactNumberInput ariaLabel="Global section length" min={.25} max={64} step={.25} value={editing.beats} onChange={setBeats} />
      </label>
      <label className={controls.field + ' ' + controls.harmonyField} title={harmony === 'kit' ? 'Up to sixteen whole degrees from −14 to 14. 0 is the root; each local bar moves one degree.' : 'Select Kit Harmony to edit the degrees. The saved values are kept.'}><span>Harmony</span>
        <input aria-label="Section harmonic degrees" disabled={harmony !== 'kit'} value={degrees} placeholder="e.g. 0 3 4 0"
          onChange={event => { setDegrees(event.target.value); setError('') }} onBlur={commitDegrees}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commitDegrees() } }} />
      </label>
      <button type="button" className={controls.deleteIcon} aria-label="Delete global section" title={arrangement.sections.length <= 1 ? 'The arrangement must keep at least one section' : 'Delete section'} disabled={arrangement.sections.length <= 1} onClick={remove}><Trash2 size={14} aria-hidden="true" /></button>
    </div>}
    {(error || notice) && <p className={controls.inlineNotice} role="alert">{error || notice}</p>}
    <span className={controls.srOnly} role="status" aria-live="polite">{announcement}</span>
    </div>
  </>
}
