'use client'

import { useSyncExternalStore } from 'react'
import type { MusicPulseMonitor } from '@/lib/music/monitor'

export function MusicPulseOverlay({ monitor, variant = 'game', orientation = 'white' }: { monitor: MusicPulseMonitor; variant?: 'game' | 'creative'; orientation?: 'white' | 'black' }) {
  const pulse = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  if (!pulse) return null
  const file = pulse.square.charCodeAt(0) - 97
  const rank = Number(pulse.square[1])
  return <span
    key={`${pulse.id}:${pulse.square}:${pulse.duration}`}
    data-musical-pulse={pulse.square}
    aria-hidden="true"
    className="absolute pointer-events-none"
    style={{
      left: `${(orientation === "black" ? 7 - file : file) * 12.5}%`, top: `${(orientation === "black" ? rank - 1 : 8 - rank) * 12.5}%`, width: '12.5%', height: '12.5%', zIndex: 30,
      ...(variant === 'creative'
        ? { background: 'rgba(174, 189, 101, .72)', boxShadow: 'inset 0 0 0 2px #d9ef9e' }
        : { border: '2px solid rgb(165 243 252)', background: 'rgb(165 243 252 / .2)', borderRadius: '.25rem', transform: 'scale(.86)' }),
    }}
  />
}
