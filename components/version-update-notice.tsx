'use client'

import { useEffect, useState } from 'react'
import { RELEASE_LABEL } from '@/lib/release'
import { VERSION_CHECK_INTERVAL_MS, checkForNewReleaseVersion } from '@/lib/version-check'

export function VersionUpdateNotice() {
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)

  useEffect(() => {
    if (availableVersion) return
    let active = true
    let checking = false

    const verifyVersion = async () => {
      if (!active || checking) return
      checking = true
      try {
        const nextVersion = await checkForNewReleaseVersion(RELEASE_LABEL)
        if (active && nextVersion) {
          setAvailableVersion(nextVersion)
        }
      } finally {
        checking = false
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void verifyVersion()
      }
    }
    const onFocus = () => {
      void verifyVersion()
    }

    void verifyVersion()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void verifyVersion()
      }
    }, VERSION_CHECK_INTERVAL_MS)

    window.addEventListener('online', onFocus)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('online', onFocus)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [availableVersion])

  if (!availableVersion) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-version-update-notice={availableVersion}
      onPointerDown={event => event.stopPropagation()}
      className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-[170] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-black/15 bg-white px-3.5 py-2.5 font-mono text-xs text-neutral-900 shadow-lg"
    >
      <span>Há uma versão nova!</span>
      <a
        href=""
        onClick={event => {
          event.preventDefault()
          window.location.reload()
        }}
        className="shrink-0 font-bold text-neutral-950 underline underline-offset-4 transition-colors hover:text-emerald-700"
      >
        Atualizar
      </a>
    </div>
  )
}
