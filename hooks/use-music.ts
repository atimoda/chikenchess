'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import type { CityData } from '@/lib/cities-data'
import type { SquareEffects } from '@/lib/types'
import { instrumentFor, gameMusicStateFromHistory, type InstrumentPerformanceEdit } from '@/lib/music/model'
import { MusicRuntime, renderMusicCode, type Preview, type MusicPulse, type MusicSnapshot } from '@/lib/music/runtime'
import { defaultCityKit, loadCityKit } from '@/lib/music/city-kits'
import { scaleForCreativeSession, type CreativeSession } from '@/lib/music/creative'
import { createMusicMonitor } from '@/lib/music/monitor'
import { createTeamMixes, resolveDeckClock, type TeamMix } from '@/lib/music/team-mixer'
import { applyReactions, reactionContext } from '@/lib/music/reactions'

export function useMusic(history: string[], city: CityData, playing: boolean, bpm: number, volume: number, showCode = true, engineActive = true) {
  const builtInKit = useMemo(() => defaultCityKit(city.id), [city.id])
  const enabled = builtInKit !== null
  const [kit, setKit] = useState<CreativeSession | null>(builtInKit)
  const [teamMixes, setTeamMixes] = useState(createTeamMixes)
  const [finePitch, setFinePitch] = useState(0)
  const [quartzLock, setQuartzLock] = useState(false)
  const { tuning, bpm: effectiveBpm } = resolveDeckClock(bpm, kit?.bpm ?? bpm, finePitch, quartzLock)
  const updateTeamMix = useCallback((color: 'w' | 'b', patch: Partial<TeamMix>) => setTeamMixes(current => ({ ...current, [color]: { ...current[color], ...patch } })), [])
  const gameMusicState = useMemo(() => gameMusicStateFromHistory(history), [history])
  const pieces = gameMusicState.pieces
  const context = useMemo(() => reactionContext(history, kit?.reactions.minimumPieces), [history, kit?.reactions.minimumPieces])
  const [effects, setEffects] = useState<Record<string, SquareEffects>>(builtInKit?.effects ?? {})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [pulse, setPulse] = useState<MusicPulse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const runtime = useRef<MusicRuntime | null>(null)
  const monitor = useMemo(createMusicMonitor, [])
  const baseSnapshot = useMemo(() => ({
    pieces: pieces.map(p => ({ ...p, active: p.activation === 'move', checkEnsemble: false })),
    scale: kit ? scaleForCreativeSession(kit) : city.scale,
    bpm: effectiveBpm,
    tuning,
    volume,
    playing,
    effects,
    instruments: kit?.instruments,
    mappings: kit?.mappings,
    sectionPattern: kit?.sectionPattern,
    grooves: kit?.grooves,
    teamMixes,
    title: kit ? `${city.name} · ${kit.name}` : city.name,
  }), [pieces, kit, city.scale, city.name, effectiveBpm, tuning, volume, playing, effects, teamMixes])
  const [audible, setAudible] = useState<MusicSnapshot | null>(null)
  const input = useMemo(() => ({...baseSnapshot,reactionInput:kit?{config:kit.reactions,context,scope:city.id,lockedBpm:quartzLock?kit.bpm:undefined}:undefined}),[baseSnapshot,kit,context,city.id,quartzLock])
  const resolved = useMemo(() => kit ? applyReactions(baseSnapshot,kit.reactions,context) : {snapshot:baseSnapshot,descriptions:[]},[baseSnapshot,kit,context])
  const snapshot: MusicSnapshot = audible ?? resolved.snapshot
  const activeSquares = useMemo(() => new Set(snapshot.pieces.filter(p => p.active).map(p => p.square)), [snapshot.pieces])
  const code = useMemo(() => enabled && engineActive && showCode ? renderMusicCode(snapshot, preview) : '', [enabled, engineActive, showCode, snapshot, preview])

  useEffect(() => {
    const resolved = loadCityKit(city.id)
    setKit(resolved)
    setTeamMixes(createTeamMixes())
    setFinePitch(0); setQuartzLock(false)
    setEffects(resolved?.effects ?? {})
    setSelectedId(null)
    setPreview(null)
    runtime.current?.endAudition()
  }, [city.id])
  useEffect(() => {
    if (!enabled || !engineActive) {
      setPreview(null)
      setPulse(null)
      setAudible(null)
      return
    }
    const engine = new MusicRuntime(setPulse, e => setError(e instanceof Error ? e.message : String(e)), monitor, setAudible)
    runtime.current = engine
    engine.preload()
    return () => { engine.dispose(); runtime.current = null }
  }, [enabled, engineActive, monitor])
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
    setPreview({ id: piece.id, square: to, mode: 'manual' })
    runtime.current?.audition(piece.id, to)
  }, [pieces, engineActive])
  const endAudition = useCallback(() => {
    setPreview(null)
    runtime.current?.endAudition()
  }, [])
  const select = useCallback((square: Square) => {
    const piece = pieces.find(p => p.square === square)
    if (piece) setSelectedId(piece.id)
  }, [pieces])
  const reset = useCallback(() => { setEffects(kit?.effects ?? {}); setSelectedId(null); endAudition() }, [endAudition, kit])
  const selected = snapshot.pieces.find(p => p.id === selectedId)
  const instrument = selected ? (kit?.instruments[selected.id] ?? instrumentFor(selected)) : null
  const updateInstrument = useCallback((patch: InstrumentPerformanceEdit) => {
    if (!selectedId) return
    setKit(current => current && ({ ...current, instruments: { ...current.instruments, [selectedId]: { ...current.instruments[selectedId], ...patch } } }))
  }, [selectedId])
  const setPieceEffect = useCallback((key: keyof SquareEffects, value: number) => {
    if (!selected || !instrument) return
    const id = selected.id
    setEffects(current => ({ ...current, [id]: { ...(current[id] ?? { delay: 0, reverb: .12, gain: 1, pan: 0, pitch: 1, decay: instrument.decay ?? .15, lpf: instrument.lpf, hpf: instrument.hpf }), [key]: value } }))
    // Taking a knob takes control from the corresponding absolute automation.
    // Gain remains a multiplier, so its rhythmic accents are preserved.
    const target = ({ lpf: 'lpf', pan: 'pan', reverb: 'room', delay: 'delay' } as const)[key as 'lpf' | 'pan' | 'reverb' | 'delay']
    if (target && instrument.automations?.[target]) {
      const automations = { ...instrument.automations }; delete automations[target]
      updateInstrument({ automations })
    }
  }, [selected, instrument, updateInstrument])
  const setTonality = useCallback((root: CreativeSession['root'], scale: CreativeSession['scale']) => {
    setKit(current => current && ({ ...current, root, scale }))
  }, [])
  const getFrequencyData = useCallback((data: Uint8Array<ArrayBuffer>) => {
    if (runtime.current) runtime.current.getFrequencyData(data)
    else data.fill(0)
  }, [])
  return {
    enabled, engineActive, audition, endAudition, select, reset, selected, effects, setEffects, snapshot, teamMixes, updateTeamMix,
    deckClock: { finePitch, quartzLock, effectiveBpm: snapshot.bpm, originalBpm: kit?.bpm ?? bpm, setFinePitch, setQuartzLock },
    code, preview, pulse, error, getFrequencyData, monitor, reactionDescriptions: snapshot.reactionDescriptions ?? resolved.descriptions,
    kitName: kit?.name ?? null,
    kitBpm: kit?.bpm ?? null,
    kitVolume: kit?.volume ?? null,
    instrument, updateInstrument, setPieceEffect, setTonality,
    tonality: kit ? { root: kit.root, scale: kit.scale } : undefined,
    attackingColor: gameMusicState.attackingColor, activeSquares,
  }
}
