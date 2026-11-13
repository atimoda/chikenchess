// Every Web Audio context of the game (music, effects, chicken, portal, lobby) goes quiet while the player is away
// from the tab or the app (other tab, home screen, locked phone) and picks up where it was when they come back.
// Contexts are tracked by wrapping the AudioContext constructor once, so code that creates its own context needs
// no change. A context that was already suspended or closed when the tab was hidden is left alone.

import { watchAudioOutput } from './quality-monitor'

let installed = false
const contexts = new Set<AudioContext>()
const suspendedByUs = new Set<AudioContext>()

function leave() {
  contexts.forEach(ctx => {
    if (ctx.state === 'closed') { contexts.delete(ctx); return }
    if (ctx.state === 'running') { suspendedByUs.add(ctx); void ctx.suspend().catch(() => {}) }
  })
}
function back() {
  suspendedByUs.forEach(ctx => { if (ctx.state !== 'closed') void ctx.resume().catch(() => {}) })
  suspendedByUs.clear()
}

export function installAudioFocus() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const win = window as unknown as Record<string, unknown>
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Original = win[name] as (new (options?: AudioContextOptions) => AudioContext) | undefined
    if (!Original) continue
    win[name] = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options)
        contexts.add(this)
        // the FPS counter and "Ajustar automaticamente" read this context's output glitches
        watchAudioOutput(this)
        // created while away (a timer, a late load): start quiet
        if (document.visibilityState === 'hidden') { suspendedByUs.add(this); void this.suspend().catch(() => {}) }
      }
    }
  }
  const onVisibility = () => { if (document.visibilityState === 'hidden') leave(); else back() }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', leave)
  window.addEventListener('pageshow', () => { if (document.visibilityState !== 'hidden') back() })
}
