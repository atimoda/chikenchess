import { useCallback, useRef, useSyncExternalStore } from 'react'
import { EMPTY_MUSIC_FRAME, type MusicFrame, type MusicMonitor } from '@/lib/music/monitor'

const subscribeNothing = () => () => {}

function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every(key => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}

/**
 * Subscribes to the part of each monitor frame a view actually shows. Frames
 * arrive several times per second; the component only re-renders when the
 * selected value changes (shallow comparison), not on every clock tick.
 */
export function useMonitorSelector<T>(monitor: MusicMonitor | undefined, select: (frame: MusicFrame) => T, enabled = true): T {
  const selectRef = useRef(select)
  selectRef.current = select
  const cache = useRef<{ frame: MusicFrame; select: (frame: MusicFrame) => T; value: T } | null>(null)
  const read = useCallback((frame: MusicFrame) => {
    const previous = cache.current, current = selectRef.current
    if (previous && previous.frame === frame && previous.select === current) return previous.value
    const next = current(frame)
    const value = previous && shallowEqual(previous.value, next) ? previous.value : next
    cache.current = { frame, select: current, value }
    return value
  }, [])
  const live = enabled && !!monitor
  const subscribe = live ? monitor.subscribe : subscribeNothing
  const getSnapshot = useCallback(() => read(live ? monitor.getSnapshot() : monitor?.getServerSnapshot() ?? EMPTY_MUSIC_FRAME), [live, monitor, read])
  const getServerSnapshot = useCallback(() => read(monitor?.getServerSnapshot() ?? EMPTY_MUSIC_FRAME), [monitor, read])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
