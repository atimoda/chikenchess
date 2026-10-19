'use client'

let context: AudioContext | null = null
let unlockBound = false

/** Called from user gestures so background notifications can play audio cues. */
export function prepareLobbyAudio() {
  try {
    if (!context || context.state === 'closed') context = new AudioContext()
    if (context.state === 'suspended') void context.resume().catch(() => {})
  } catch { /* A visible lobby alert is still available without audio. */ }
}

export function bindLobbyAudioUnlock() {
  if (unlockBound || typeof window === 'undefined') return
  unlockBound = true
  const unlock = () => {
    prepareLobbyAudio()
    if (context && context.state === 'running') {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock, { passive: true })
}

export function playLobbyJoinSound() {
  if (!context || context.state === 'closed') return
  const playChime = (audio: AudioContext) => {
    for (const [index, frequency] of [880, 1320].entries()) {
      const start = audio.currentTime + index * 0.08
      const oscillator = audio.createOscillator()
      const envelope = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      envelope.gain.setValueAtTime(0.08, start)
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      oscillator.connect(envelope).connect(audio.destination)
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
      oscillator.start(start)
      oscillator.stop(start + 0.36)
    }
  }
  if (context.state === 'running') {
    playChime(context)
  } else if (context.state === 'suspended') {
    const target = context
    void target.resume().then(() => {
      if (target.state === 'running') playChime(target)
    }).catch(() => {})
  }
}

export function disposeLobbyAudio() {
  // Retain the unlocked AudioContext across screen transitions so background turn alerts remain audible.
}
