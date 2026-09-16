'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import { creativeSnapshot, type CreativeSession } from '@/lib/music/creative'
import { MusicRuntime, renderMusicCode, type MusicPulse, type Preview, type MusicSnapshot } from '@/lib/music/runtime'
import { createMusicMonitor } from '@/lib/music/monitor'
import { applyReactions, type ReactionContext } from '@/lib/music/reactions'

export function useCreativeMusic(session: CreativeSession, playing: boolean, soloId: string | null, context: ReactionContext) {
  const runtime = useRef<MusicRuntime | null>(null)
  const monitor = useMemo(createMusicMonitor, [])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [pulse, setPulse] = useState<MusicPulse | null>(null)
  const [error, setError] = useState('')
  const [audible, setAudible] = useState<MusicSnapshot | null>(null)
  const input = useMemo(() => ({...creativeSnapshot(session,playing,soloId), reactionInput:{config:session.reactions,context,scope:session.cityId??session.name}}),[session,playing,soloId,context])
  const resolved = useMemo(() => applyReactions(input,session.reactions,context),[input,session.reactions,context])
  const snapshot = audible ?? resolved.snapshot
  const code = useMemo(() => renderMusicCode(snapshot, preview), [snapshot, preview])

  useEffect(() => {
    const engine = new MusicRuntime(setPulse, e => setError(e instanceof Error ? e.message : String(e)), monitor, setAudible)
    runtime.current = engine
    engine.preload()
    return () => { engine.dispose(); runtime.current = null }
  }, [monitor])
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
  useEffect(() => {
    if (!pulse) return
    const timer = setTimeout(() => setPulse(null), Math.max(80, Math.min(220, pulse.duration * 1000)))
    return () => clearTimeout(timer)
  }, [pulse])

  const audition = useCallback((id: string, square: string, mode: Preview['mode'] = 'manual') => {
    setPreview({ id, square: square as Square, mode })
    runtime.current?.audition(id, square as Square, mode)
  }, [])
  const endAudition = useCallback(() => {
    setPreview(null)
    runtime.current?.endAudition()
  }, [])
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') endAudition() }
    window.addEventListener('blur', endAudition)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('blur', endAudition); window.removeEventListener('keydown', escape) }
  }, [endAudition])

  return { audition, endAudition, preview, pulse, error, code, monitor, snapshot, reactionDescriptions: snapshot.reactionDescriptions ?? resolved.descriptions }
}
