'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Square } from 'chess.js'
import type { CreativeSession } from '@/lib/music/creative'
import type { MusicRuntime } from '@/lib/music/runtime'

type Resources = {
  runtime: MusicRuntime
  snapshot: typeof import('@/lib/music/creative').creativeSnapshot
}

/** A single, short manual note at a time, using the same runtime as the match. */
export function useLobbyKitAudition(enabled: boolean, onError: (message: string) => void) {
  const pending = useRef<Promise<Resources | null> | null>(null)
  const current = useRef<Resources | null>(null)
  const request = useRef(0)
  const owner = useRef<string | null>(null)
  const pendingHover = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let active = true
    pending.current = Promise.all([import('@/lib/music/runtime'), import('@/lib/music/creative')]).then(([music, creative]) => {
      if (!active) return null
      const runtime = new music.MusicRuntime(() => {}, error => {
        if (active) onError(error instanceof Error ? error.message : String(error))
      })
      current.current = { runtime, snapshot: creative.creativeSnapshot }
      runtime.preload()
      return current.current
    }).catch(error => {
      if (active) onError(error instanceof Error ? error.message : String(error))
      return null
    })
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        request.current += 1
        owner.current = null
        pendingHover.current = null
        current.current?.runtime.endAudition()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      active = false
      request.current += 1
      owner.current = null
      pendingHover.current = null
      document.removeEventListener('visibilitychange', onVisibilityChange)
      current.current?.runtime.dispose()
      current.current = null
      pending.current = null
    }
  }, [enabled, onError])

  const play = useCallback((kit: CreativeSession, piece: CreativeSession['pieces'][number], previewOwner: string, source: 'hover' | 'press') => {
    const serial = ++request.current
    owner.current = previewOwner
    pendingHover.current = source === 'hover' ? previewOwner : null
    void pending.current?.then(resources => {
      if (!resources || serial !== request.current) return
      pendingHover.current = null
      resources.runtime.endAudition()
      resources.runtime.update(resources.snapshot(kit, false))
      resources.runtime.audition(piece.id, piece.origin as Square)
      resources.runtime.releaseAudition()
    })
  }, [])

  const stop = useCallback((previewOwner: string) => {
    if (owner.current !== previewOwner) return
    request.current += 1
    owner.current = null
    pendingHover.current = null
    current.current?.runtime.endAudition()
  }, [])

  const cancelHover = useCallback((previewOwner: string) => {
    if (pendingHover.current !== previewOwner) return
    request.current += 1
    pendingHover.current = null
    owner.current = null
  }, [])

  const confirmHover = useCallback((previewOwner: string) => {
    if (pendingHover.current === previewOwner) pendingHover.current = null
  }, [])

  return { play, stop, cancelHover, confirmHover }
}
