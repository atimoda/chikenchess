'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { InstrumentParamsTab, ParamsScope } from '@/components/creative/instrument-parameters'
import type { NoteParamsSelection } from '@/components/music-note-params'

/** Scope and page of the instrument parameters. Selecting a note opens Note and deselecting it
 * goes back; selecting a section in the arrangement strip opens Section. */
export function useParamsScope(noteSelection: NoteParamsSelection | null, sectionId: string | null) {
  const [tab, setTab] = useState<InstrumentParamsTab>('filters')
  const [scope, setScope] = useState<ParamsScope>('all')
  const before = useRef<ParamsScope>('all'), hadNote = useRef(false)
  useEffect(() => {
    const hasNote = !!noteSelection
    if (hasNote === hadNote.current) return
    hadNote.current = hasNote
    if (hasNote) setScope(current => { if (current !== 'note') before.current = current; return 'note' })
    else setScope(current => current === 'note' ? before.current : current)
  }, [noteSelection])
  // A section that disappears (deleted, other kit) leaves the Section scope.
  useEffect(() => { if (!sectionId) { setScope(current => current === 'section' ? 'all' : current); if (before.current === 'section') before.current = 'all' } }, [sectionId])
  const showSection = useCallback(() => { before.current = 'section'; setScope(current => current === 'note' ? current : 'section') }, [])
  return { tab, setTab, scope: scope === 'section' && !sectionId ? 'all' : scope, setScope, showSection }
}
