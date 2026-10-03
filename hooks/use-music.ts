'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import type { CityData } from '@/lib/cities-data'
import type { SquareEffects } from '@/lib/types'
import { instrumentFor, gameMusicStateFromHistory, type InstrumentPerformanceEdit } from '@/lib/music/model'
import { MusicRuntime, renderMusicCode, type Preview, type MusicSnapshot } from '@/lib/music/runtime'
import { defaultCityKit, loadCityKit } from '@/lib/music/city-kits'
import { scaleForCreativeSession, type CreativeSession } from '@/lib/music/creative'
import { createMusicMonitor, createMusicPulseMonitor } from '@/lib/music/monitor'
import { createTeamMixes, TEAM_GAIN_MAX, type TeamMix } from '@/lib/music/team-mixer'
import type { HarmonyPlanId } from '@/lib/music/harmony'
import { applyReactions, reactionContext } from '@/lib/music/reactions'
import { identifyPitchCollection } from '@/lib/music/scales'
import type { SampleSource } from '@/lib/music/sample-banks'

export function useMusic(history: string[], city: CityData, playing: boolean, bpm: number, volume: number, showCode = true, engineActive = true) {
  const builtInKit = useMemo(() => defaultCityKit(city.id), [city.id])
  const enabled = builtInKit !== null
  const [kit, setKit] = useState<CreativeSession | null>(builtInKit)
  const sampleFingerprint = JSON.stringify(Object.values(kit?.instruments ?? {}).flatMap(instrument => instrument.source?.kind === 'sample' ? [instrument.source] : []))
  const sampleSources = useMemo(() => JSON.parse(sampleFingerprint) as SampleSource[], [sampleFingerprint])
  const [teamMixes, setTeamMixes] = useState(() => createTeamMixes(TEAM_GAIN_MAX / 2))
  const updateTeamMix = useCallback((color: 'w' | 'b', patch: Partial<TeamMix>) => setTeamMixes(current => ({ ...current, [color]: { ...current[color], ...patch } })), [])
  const gameMusicState = useMemo(() => gameMusicStateFromHistory(history), [history])
  const pieces = gameMusicState.pieces
  const context = useMemo(() => reactionContext(history, kit?.reactions.minimumPieces), [history, kit?.reactions.minimumPieces])
  const [effects, setEffects] = useState<Record<string, SquareEffects>>(builtInKit?.effects ?? {})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manuallyActiveIds, setManuallyActiveIds] = useState<Set<string>>(() => new Set())
  const [soloIds, setSoloIds] = useState<Set<string>>(() => new Set())
  const [soloRestoredIds, setSoloRestoredIds] = useState<Set<string>>(() => new Set())
  const soloMemoryRef = useRef<Set<string> | null>(null)
  const soloCycleIdsRef = useRef<Set<string>>(new Set())
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const runtime = useRef<MusicRuntime | null>(null)
  const monitor = useMemo(createMusicMonitor, [])
  const pulseMonitor = useMemo(createMusicPulseMonitor, [])
  const baseSnapshot = useMemo(() => ({
    pieces: pieces.map(p => ({ ...p, active: p.activation === 'move' || manuallyActiveIds.has(p.id) || soloRestoredIds.has(p.id), checkEnsemble: false })),
    scale: kit ? scaleForCreativeSession(kit) : city.scale,
    harmony: kit?.harmony,
    arrangement: kit?.arrangement,
    meter: kit?.meter ?? '4/4',
    bpm,
    tuning: 1,
    volume,
    playing,
    effects,
    instruments: kit?.instruments,
    mappings: kit?.mappings,
    teamMixes,
    title: kit ? `${city.name} · ${kit.name}` : city.name,
  }), [pieces, manuallyActiveIds, soloRestoredIds, kit, city.scale, city.name, bpm, volume, playing, effects, teamMixes])
  const [audible, setAudible] = useState<MusicSnapshot | null>(null)
  const resolved = useMemo(() => kit ? applyReactions(baseSnapshot,kit.reactions,context) : {snapshot:baseSnapshot,descriptions:[]},[baseSnapshot,kit,context])
  const soloIdsList = useMemo(() => [...soloIds], [soloIds])
  const soloSnapshot = useMemo<MusicSnapshot>(() => {
    if (!soloIdsList.length) return resolved.snapshot
    const instruments = resolved.snapshot.instruments ? { ...resolved.snapshot.instruments } : undefined
    for (const id of soloIdsList) {
      const instrument = instruments?.[id]
      if (instrument) instruments![id] = { ...instrument, loopEnabled: true }
    }
    return {
      ...resolved.snapshot,
      soloId: soloIdsList.length === 1 ? soloIdsList[0] : null,
      soloIds: soloIdsList,
      instruments,
      pieces: resolved.snapshot.pieces.map(piece => ({ ...piece, active: soloIds.has(piece.id) })),
    }
  }, [resolved.snapshot, soloIds, soloIdsList])
  const input = useMemo(() => ({...baseSnapshot,soloIds:soloIdsList.length ? soloIdsList : undefined,reactionInput:kit?{config:kit.reactions,context,scope:city.id}:undefined}),[baseSnapshot,soloIdsList,kit,context,city.id])
  const snapshot: MusicSnapshot = audible ?? soloSnapshot
  const currentPitchCollection = useMemo(() => identifyPitchCollection(snapshot.scale, kit?.scale), [snapshot.scale, kit?.scale])
  const activeSquares = useMemo(() => new Set(snapshot.pieces.filter(p => p.active && snapshot.instruments?.[p.id]?.loopEnabled !== false).map(p => p.square)), [snapshot.pieces, snapshot.instruments])
  const code = useMemo(() => enabled && showCode ? renderMusicCode(snapshot, preview) : '', [enabled, showCode, snapshot, preview])

  useEffect(() => {
    const resolved = loadCityKit(city.id)
    setKit(resolved)
    setTeamMixes(createTeamMixes(TEAM_GAIN_MAX / 2))
    setEffects(resolved?.effects ?? {})
    setSelectedId(null)
    setManuallyActiveIds(new Set())
    setSoloIds(new Set())
    setSoloRestoredIds(new Set())
    soloMemoryRef.current = null
    soloCycleIdsRef.current = new Set()
    setPreview(null)
    runtime.current?.endAudition()
  }, [city.id])
  useEffect(() => {
    if (!enabled || !engineActive) {
      setPreview(null)
      pulseMonitor.clear()
      setAudible(null)
      return
    }
    const engine = new MusicRuntime(pulseMonitor.publish, e => setError(e instanceof Error ? e.message : String(e)), monitor, setAudible)
    runtime.current = engine
    engine.preload()
    const onVisibilityChange = () => engine.setPageVisible(document.visibilityState === 'visible')
    onVisibilityChange()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { document.removeEventListener('visibilitychange', onVisibilityChange); engine.dispose(); pulseMonitor.clear(); runtime.current = null }
  }, [enabled, engineActive, monitor, pulseMonitor])
  useEffect(() => {
    if (!enabled || !engineActive) return
    let current = true
    void runtime.current?.prepareSamples(sampleSources).catch(error => { if (current) setError(error instanceof Error ? error.message : String(error)) })
    return () => { current = false }
  }, [enabled, engineActive, sampleSources])
  useEffect(() => {
    const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    if (!engineActive) return
    const timer = setTimeout(() => runtime.current?.update(input), mobile ? 50 : 16)
    return () => clearTimeout(timer)
  }, [input, engineActive])
  useEffect(() => {
    if (enabled && engineActive && playing) void runtime.current?.unlock()
  }, [enabled, engineActive, playing])
  useEffect(() => {
    setPreview(null)
    runtime.current?.endAudition()
  }, [history])

  const audition = useCallback((from: Square, to: Square = from) => {
    if (!engineActive) return
    const piece = pieces.find(p => p.square === from)
    if (!piece) return
    setSelectedId(piece.id)
    // The runtime owns the live square. Keeping React state stable while the
    // pointer crosses the board avoids rerendering the whole match per note.
    setPreview(current => current?.id === piece.id && current.mode === 'manual'
      ? current
      : { id: piece.id, square: to, mode: 'manual' })
    runtime.current?.audition(piece.id, to)
  }, [pieces, engineActive])
  const endAudition = useCallback(() => {
    setPreview(null)
    runtime.current?.endAudition()
  }, [])
  const releaseAudition = useCallback(() => {
    setPreview(null)
    runtime.current?.releaseAudition()
  }, [])
  const select = useCallback((square: Square) => {
    const piece = pieces.find(p => p.square === square)
    if (piece) setSelectedId(piece.id)
  }, [pieces])
  const togglePiece = useCallback((square: Square) => {
    const piece = pieces.find(p => p.square === square)
    if (!piece || !kit) return false
    const active = resolved.snapshot.pieces.some(p => p.id === piece.id && p.active)
    const enabled = kit.instruments[piece.id]?.loopEnabled !== false
    const turnOn = !active || !enabled
    setSelectedId(piece.id)
    if (turnOn) setManuallyActiveIds(current => new Set(current).add(piece.id))
    setKit(current => current && ({
      ...current,
      instruments: {
        ...current.instruments,
        [piece.id]: { ...current.instruments[piece.id], loopEnabled: turnOn },
      },
    }))
    return turnOn
  }, [pieces, kit, resolved.snapshot.pieces])
  const toggleSolo = useCallback((id: string) => {
    if (!pieces.some(piece => piece.id === id)) return false
    endAudition()
    if (soloIds.has(id)) {
      const next = new Set(soloIds)
      next.delete(id)
      if (next.size === 0) {
        const aliveIds = new Set(pieces.map(piece => piece.id))
        const restoreIds = new Set([...(soloMemoryRef.current ?? []), ...soloCycleIdsRef.current].filter(pieceId => aliveIds.has(pieceId)))
        setSoloRestoredIds(current => new Set([...current, ...restoreIds]))
        soloMemoryRef.current = null
        soloCycleIdsRef.current = new Set()
      }
      setSoloIds(next)
      return false
    }
    if (soloIds.size === 0) {
      soloMemoryRef.current = new Set(resolved.snapshot.pieces
        .filter(piece => piece.active && resolved.snapshot.instruments?.[piece.id]?.loopEnabled !== false)
        .map(piece => piece.id))
      soloCycleIdsRef.current = new Set()
    }
    soloCycleIdsRef.current.add(id)
    setManuallyActiveIds(current => new Set(current).add(id))
    setSelectedId(id)
    setSoloIds(current => new Set([...current, id]))
    return true
  }, [pieces, endAudition, soloIds, resolved.snapshot])
  useEffect(() => {
    if (!soloIds.size) return
    const aliveIds = new Set(pieces.map(piece => piece.id))
    const next = new Set([...soloIds].filter(id => aliveIds.has(id)))
    if (next.size === soloIds.size) return
    if (next.size === 0) {
      const restoreIds = new Set([...(soloMemoryRef.current ?? []), ...soloCycleIdsRef.current].filter(id => aliveIds.has(id)))
      setSoloRestoredIds(current => new Set([...current, ...restoreIds]))
      soloMemoryRef.current = null
      soloCycleIdsRef.current = new Set()
    }
    setSoloIds(next)
  }, [soloIds, pieces])
  const reset = useCallback(() => {
    setEffects(kit?.effects ?? {})
    setSelectedId(null)
    setManuallyActiveIds(new Set())
    setSoloIds(new Set())
    setSoloRestoredIds(new Set())
    soloMemoryRef.current = null
    soloCycleIdsRef.current = new Set()
    endAudition()
  }, [endAudition, kit])
  const selected = snapshot.pieces.find(p => p.id === selectedId)
  const instrument = selected ? (snapshot.instruments?.[selected.id] ?? kit?.instruments[selected.id] ?? instrumentFor(selected)) : null
  const updateInstrument = useCallback((patch: InstrumentPerformanceEdit) => {
    if (!selectedId) return
    setKit(current => {
      if (!current) return current
      const previous = current.instruments[selectedId]
      const next = { ...previous, ...patch }
      return { ...current, instruments: { ...current.instruments, [selectedId]: next } }
    })
  }, [selectedId])
  const setPieceEffect = useCallback((key: keyof SquareEffects, value: number) => {
    if (!selected || !instrument) return
    const id = selected.id
    setEffects(current => ({ ...current, [id]: { ...(current[id] ?? { delay: 0, reverb: .12, gain: 1, pan: 0, pitch: 1, decay: instrument.decay ?? .15, lpf: instrument.lpf, hpf: instrument.hpf }), [key]: value } }))
    if (key === 'lpf' && instrument.lpfRange) updateInstrument({ lpfRange: undefined })
  }, [selected, instrument, updateInstrument])
  const setTonality = useCallback((root: CreativeSession['root'], scale: CreativeSession['scale']) => {
    setKit(current => current && ({ ...current, root, scale }))
  }, [])
  const setHarmony = useCallback((harmony: HarmonyPlanId) => {
    setKit(current => current && ({ ...current, harmony }))
  }, [])
  const getFrequencyData = useCallback((data: Uint8Array<ArrayBuffer>) => {
    if (runtime.current) runtime.current.getFrequencyData(data)
    else data.fill(0)
  }, [])
  return {
    enabled, engineActive, audition, endAudition, releaseAudition, select, togglePiece, toggleSolo, soloIds, reset, selected, effects: snapshot.effects, setEffects, snapshot, teamMixes, updateTeamMix,
    code, preview, pulseMonitor, error, getFrequencyData, monitor, reactionDescriptions: snapshot.reactionDescriptions ?? resolved.descriptions,
    kitName: kit?.name ?? null,
    kitBpm: kit?.bpm ?? null,
    kitVolume: kit?.volume ?? null,
    instrument: selected ? snapshot.instruments?.[selected.id] ?? instrument : null, updateInstrument, setPieceEffect, setTonality, setHarmony,
    tonality: kit ? { root: currentPitchCollection.root as CreativeSession['root'], scale: currentPitchCollection.scale } : undefined,
    baseTonality: kit ? { root: kit.root, scale: kit.scale } : undefined,
    currentScaleLabel: currentPitchCollection.label,
    harmony: snapshot.harmony ?? kit?.harmony,
    attackingColor: gameMusicState.attackingColor, activeSquares,
  }
}
