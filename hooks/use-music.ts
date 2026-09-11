'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import type { CityData } from '@/lib/cities-data'
import type { SquareEffects } from '@/lib/types'
import { instrumentFor, piecesFromHistory } from '@/lib/music/model'
import { MusicRuntime, renderMusicCode, type Preview, type MusicPulse } from '@/lib/music/runtime'
import { defaultCityKit, loadCityKit } from '@/lib/music/city-kits'
import { scaleForCreativeSession, type CreativeSession } from '@/lib/music/creative'
import { createMusicMonitor } from '@/lib/music/monitor'

export function useMusic(history: string[], city: CityData, playing: boolean, bpm: number, volume: number) {
  const builtInKit = useMemo(() => defaultCityKit(city.id), [city.id])
  const enabled = builtInKit !== null
  const [kit, setKit] = useState<CreativeSession | null>(builtInKit)
  const pieces = useMemo(() => piecesFromHistory(history), [history])
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
  const getFrequencyData = useCallback((data: Uint8Array<ArrayBuffer>) => {
    if (runtime.current) runtime.current.getFrequencyData(data)
    else data.fill(0)
  }, [])
  return {
    enabled, audition, endAudition, select, reset, selected, effects, setEffects,
    code, preview, pulse, error, getFrequencyData, monitor,
    kitName: kit?.name ?? null,
    kitBpm: kit?.bpm ?? null,
    kitVolume: kit?.volume ?? null,
    instrument: selected ? (kit?.instruments[selected.id] ?? instrumentFor(selected)) : null,
  }
}
