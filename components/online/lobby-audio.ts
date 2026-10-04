'use client'

let context: AudioContext | null = null

/** Called from Create/Join while the browser still has the user's gesture. */
export function prepareLobbyAudio() {
  try {
    if (!context || context.state === 'closed') context = new AudioContext()
    if (context.state === 'suspended') void context.resume().catch(() => {})
  } catch { /* A visible lobby alert is still available without audio. */ }
}

export function playLobbyJoinSound() {
  if (!context || context.state !== 'running' || document.visibilityState === 'hidden') return
  const audio = context
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

export function disposeLobbyAudio() {
  if (context) void context.close().catch(() => {})
  context = null
}
