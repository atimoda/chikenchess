'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import { creativeSnapshot, type CreativeSession } from '@/lib/music/creative'
import { MusicRuntime, renderMusicCode, type Preview, type MusicSnapshot } from '@/lib/music/runtime'
import { strudelCodeStats } from '@/lib/music/code-export'
import { createMusicMonitor, createMusicPulseMonitor } from '@/lib/music/monitor'
import { applyReactions, resolveReactions, type ReactionContext } from '@/lib/music/reactions'
import { useGlobalReactions } from '@/lib/music/global-reactions'
import type { SampleSource } from '@/lib/music/sample-banks'

export function useCreativeMusic(session: CreativeSession, playing: boolean, soloIds: ReadonlySet<string>, context: ReactionContext, showCode = false) {
  const runtime = useRef<MusicRuntime | null>(null)
  const monitor = useMemo(createMusicMonitor, [])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [audible, setAudible] = useState<MusicSnapshot | null>(null)
  const [preparedFingerprint, setPreparedFingerprint] = useState<string | null>(null)
  const pulseMonitor = useMemo(createMusicPulseMonitor, [])
  const soloList = useMemo(() => [...soloIds], [soloIds])
  const globalReactions = useGlobalReactions()
  const reactions = useMemo(() => resolveReactions(globalReactions, session.reactions), [globalReactions, session.reactions])
  const input = useMemo(() => ({...creativeSnapshot(session,playing,soloList), reactionInput:{config:reactions,context,scope:session.cityId??session.name}}),[session,playing,soloList,context,reactions])
  const sampleFingerprint = JSON.stringify(Object.values(session.instruments).flatMap(instrument => instrument.source?.kind === 'sample' ? [instrument.source] : []))
  const sampleSources = useMemo(() => JSON.parse(sampleFingerprint) as SampleSource[], [sampleFingerprint])
  const auditionReady = preparedFingerprint === sampleFingerprint
  const resolved = useMemo(() => applyReactions(input,reactions,context),[input,reactions,context])
  const snapshot = audible ?? resolved.snapshot
  const code = useMemo(() => showCode ? renderMusicCode(snapshot, preview) : '', [snapshot, preview, showCode])

  const codeStats = useMemo(() => showCode ? strudelCodeStats(code) : null, [code, showCode])

  useEffect(() => {
    const engine = new MusicRuntime(pulseMonitor.publish, e => setError(e instanceof Error ? e.message : String(e)), monitor, setAudible)
    runtime.current = engine
    engine.preload()
    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      if (!visible) setPreview(null)
      engine.setPageVisible(visible)
    }
    onVisibilityChange()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { document.removeEventListener('visibilitychange', onVisibilityChange); engine.dispose(); pulseMonitor.clear(); runtime.current = null }
  }, [monitor, pulseMonitor])
  useEffect(() => {
    let current = true
    void runtime.current?.prepareSamples(sampleSources).then(() => {
      if (current) setPreparedFingerprint(sampleFingerprint)
    }).catch(error => {
      if (current) { setError(error instanceof Error ? error.message : String(error)); setPreparedFingerprint(sampleFingerprint) }
    })
    return () => { current = false }
  }, [sampleSources, sampleFingerprint])
  useEffect(() => {
    // Coalesce continuous slider updates. Fifty milliseconds still feels immediate
    // on touch while avoiding a full Strudel graph compilation for every pointer event.
    const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    const timer = setTimeout(() => runtime.current?.update(input), mobile ? 50 : 16)
    return () => clearTimeout(timer)
  }, [input])
  useEffect(() => {
    if (playing) { setError(''); void runtime.current?.unlock() }
  }, [playing])
  const audition = useCallback((id: string, square: string, mode: Preview['mode'] = 'manual') => {
    // The runtime owns the live square; crossing cells must not rerender the studio.
    setPreview(current => current?.id === id && current.mode === mode
      ? current
      : { id, square: square as Square, mode })
    runtime.current?.audition(id, square as Square, mode)
  }, [])
  const unlock = useCallback(() => { void runtime.current?.unlock(false) }, [])
  const seekSection = useCallback((sectionId: string) => {
    setPreview(null)
    // Queueing immediately after an edit must use the current order and durations,
    // not the snapshot waiting in the coalesced parameter-update timer.
    runtime.current?.update(input)
    runtime.current?.queueSection(sectionId)
  }, [input])
  const endAudition = useCallback(() => {
    setPreview(null)
    runtime.current?.endAudition()
  }, [])
  const releaseAudition = useCallback(() => {
    setPreview(null)
    runtime.current?.releaseAudition()
  }, [])
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') endAudition() }
    window.addEventListener('blur', endAudition)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('blur', endAudition); window.removeEventListener('keydown', escape) }
  }, [endAudition])

  return { audition, auditionReady, unlock, seekSection, endAudition, releaseAudition, preview, pulseMonitor, error, code, codeStats, monitor, snapshot, reactionDescriptions: snapshot.reactionDescriptions ?? resolved.descriptions }
}
