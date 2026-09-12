'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import type { CityData } from '@/lib/cities-data'
import type { SquareEffects } from '@/lib/types'
import { instrumentFor, gameMusicStateFromHistory, type InstrumentPerformanceEdit } from '@/lib/music/model'
import { MusicRuntime, renderMusicCode, type Preview, type MusicPulse } from '@/lib/music/runtime'
import { defaultCityKit, loadCityKit } from '@/lib/music/city-kits'
import { scaleForCreativeSession, type CreativeSession } from '@/lib/music/creative'
import { createMusicMonitor } from '@/lib/music/monitor'

export function useMusic(history: string[], city: CityData, playing: boolean, bpm: number, volume: number) {
  const builtInKit = useMemo(() => defaultCityKit(city.id), [city.id])
  const enabled = builtInKit !== null
  const [kit, setKit] = useState<CreativeSession | null>(builtInKit)
  const gameMusicState = useMemo(() => gameMusicStateFromHistory(history), [history])
  const pieces = gameMusicState.pieces
  const activeSquares = useMemo(() => new Set(pieces.filter(p => p.active).map(p => p.square)), [pieces])
  const [effects, setEffects] = useState<Record<string, SquareEffects>>(builtInKit?.effects ?? {})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [pulse, setPulse] = useState<MusicPulse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const runtime = useRef<MusicRuntime | null>(null)
  const monitor = useMemo(createMusicMonitor, [])
  const snapshot = useMemo(() => ({
    pieces,
    scale: kit ? scaleForCreativeSession(kit) : city.scale,
    bpm,
    volume,
    playing,
    effects,
    instruments: kit?.instruments,
    mappings: kit?.mappings,
    sectionPattern: kit?.sectionPattern,
    grooves: kit?.grooves,
    title: kit ? `${city.name} · ${kit.name}` : city.name,
  }), [pieces, kit, city.scale, city.name, bpm, volume, playing, effects])
  const code = useMemo(() => enabled ? renderMusicCode(snapshot, preview) : '', [enabled, snapshot, preview])

  useEffect(() => {
    const resolved = loadCityKit(city.id)
    setKit(resolved)
    setEffects(resolved?.effects ?? {})
    setSelectedId(null)
    setPreview(null)
    runtime.current?.endAudition()
  }, [city.id])
  useEffect(() => {
    if (!enabled) return
    const engine = new MusicRuntime(setPulse, e => setError(e instanceof Error ? e.message : String(e)), monitor)
    runtime.current = engine
    engine.preload()
    return () => { engine.dispose(); runtime.current = null }
  }, [enabled, monitor])
  useEffect(() => {
    const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    const timer = setTimeout(() => runtime.current?.update(snapshot), mobile ? 50 : 16)
    return () => clearTimeout(timer)
  }, [snapshot])
  useEffect(() => {
    if (enabled && playing) void runtime.current?.unlock()
  }, [enabled, playing])
  useEffect(() => {
    setPreview(null)
    runtime.current?.endAudition()
  }, [history])

  const audition = useCallback((from: Square, to: Square = from) => {
    const piece = pieces.find(p => p.square === from)
    if (!piece) return
    setSelectedId(piece.id)
    setPreview({ id: piece.id, square: to, mode: 'manual' })
    runtime.current?.audition(piece.id, to)
  }, [pieces])
  const endAudition = useCallback(() => {
    setPreview(null)
    runtime.current?.endAudition()
  }, [])
  const select = useCallback((square: Square) => {
    const piece = pieces.find(p => p.square === square)
    if (piece) setSelectedId(piece.id)
  }, [pieces])
  const reset = useCallback(() => { setEffects(kit?.effects ?? {}); setSelectedId(null); endAudition() }, [endAudition, kit])
  const selected = pieces.find(p => p.id === selectedId)
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
    enabled, audition, endAudition, select, reset, selected, effects, setEffects, snapshot,
    code, preview, pulse, error, getFrequencyData, monitor,
    kitName: kit?.name ?? null,
    kitBpm: kit?.bpm ?? null,
    kitVolume: kit?.volume ?? null,
    instrument, updateInstrument, setPieceEffect, setTonality,
    tonality: kit ? { root: kit.root, scale: kit.scale } : undefined,
    attackingColor: gameMusicState.attackingColor, activeSquares,
  }
}
