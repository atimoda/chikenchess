// Browser-side audio QA. Import from the bridge started by review-kits.cjs.
// This renders the shipped Strudel/Superdough audio, not a MIDI approximation.
export async function renderKitReview({ ids, modes = ['white', 'all'] } = {}) {
  if (window.kitReview && !window.kitReview.done) throw new Error('A review is already running on this page')
  const api = await import('/strudel.mjs')
  api.miniAllStrings()
  api.registerSynthSounds()
  const { kits } = await fetch('/catalog.json').then(response => response.json())
  const selected = ids ? kits.filter(kit => ids.includes(kit.id)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) : kits
  const progress = window.kitReview = { completed: 0, total: selected.length * modes.length, current: '', results: [], done: false }
  let renderedBuffer, renderedBlob
  const start = OfflineAudioContext.prototype.startRendering
  const objectUrl = URL.createObjectURL
  const click = HTMLAnchorElement.prototype.click
  const logError = console.error
  let errors = []
  OfflineAudioContext.prototype.startRendering = function () {
    return start.call(this).then(buffer => { renderedBuffer = buffer; return buffer })
  }
  URL.createObjectURL = function (blob) {
    if (blob.type === 'audio/wav') renderedBlob = blob
    return objectUrl.call(this, blob)
  }
  HTMLAnchorElement.prototype.click = function () {
    if (!this.download || !this.href.startsWith('blob:')) click.call(this)
  }
  console.error = (...values) => { errors.push(values.map(String).join(' ')); logError(...values) }
  try {
    for (const entry of selected) {
      const kit = await fetch(`/kit/${entry.id}`).then(response => response.json())
      for (const mode of modes) {
        progress.current = `${entry.id} · ${mode}`
        document.querySelector('#status').textContent = `${progress.completed}/${progress.total} · ${progress.current}`
        renderedBuffer = renderedBlob = undefined
        errors = []
        try {
          for (const sample of kit.samples) await api.samples(sample)
          const code = (mode === 'all' ? kit.stressCode : kit.code).split('\n').filter(line => !line.startsWith('//') && !line.startsWith('setcps(') && !line.startsWith('samples(')).join('\n')
          const names = Object.keys(api).filter(key => /^[a-zA-Z_$][\w$]*$/.test(key) && key !== 'default')
          const pattern = new Function(...names, `return (${code});`)(...names.map(name => api[name]))
          const cps = kit.bpm / 60 / ({ '2/4': 2, '3/4': 3, '4/4': 4, '6/8': 2, '9/8': 3, '12/8': 4, '2/2': 2, '5/4': 5, '7/4': 7, '5/8': 5, '7/8': 7 }[kit.meter])
          // The upstream offline renderer schedules the whole form before time
          // advances. Its live polyphony limiter otherwise deletes early notes.
          const scheduledAttacks = pattern.queryArc(0, kit.cycles).filter(hap => hap.hasOnset()).length
          await api.renderPatternAudio(pattern, cps, 0, kit.cycles, 24000, scheduledAttacks + 1, false, `${kit.id}-${mode}`)
          if (!renderedBuffer || !renderedBlob) throw new Error('Renderer did not produce a WAV')
          let peak = 0, power = 0, clipped = 0
          const segments = []
          for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
            const values = renderedBuffer.getChannelData(channel)
            for (let index = 0; index < values.length; index++) {
              const amplitude = Math.abs(values[index]); peak = Math.max(peak, amplitude); power += amplitude ** 2
              if (amplitude > 1) clipped++
              const segment = Math.floor(index / renderedBuffer.sampleRate / 8)
              const item = segments[segment] ??= { start: segment * 8, power: 0, samples: 0, peak: 0 }
              item.power += amplitude ** 2; item.samples++; item.peak = Math.max(item.peak, amplitude)
            }
          }
          const samples = renderedBuffer.length * renderedBuffer.numberOfChannels
          const result = { id: kit.id, revision: kit.revision, rendererVersion: 3, renderedAt: new Date().toISOString(), mode, status: errors.length ? 'audio-errors' : 'complete', seconds: renderedBuffer.duration,
            peakDbfs: 20 * Math.log10(peak || 1e-12), rmsDbfs: 10 * Math.log10(power / samples || 1e-24), clippedSamples: clipped,
            clippedFraction: clipped / samples, errors,
            segments: segments.map(item => ({ start: item.start, rmsDbfs: 10 * Math.log10(item.power / item.samples || 1e-24), peakDbfs: 20 * Math.log10(item.peak || 1e-12) })) }
          await fetch(`/audio?id=${kit.id}&mode=${mode}`, { method: 'POST', body: renderedBlob })
          await fetch('/result', { method: 'POST', body: JSON.stringify(result) })
          progress.results.push(result)
          const list = document.querySelector('#results')
          if (list) {
            const row = document.createElement('li')
            row.textContent = `${kit.city} · ${kit.genre} · ${mode === 'white' ? '16' : '32'} peças · pico ${result.peakDbfs.toFixed(1)} dBFS · ${clipped} amostras fora de ±1 · ${errors.length} erros`
            const audio = document.createElement('audio')
            audio.controls = true; audio.preload = 'none'; audio.src = `/rendered/${kit.id}-${mode}.wav`
            row.append(audio); list.append(row)
          }
        } catch (error) {
          const result = { id: kit.id, mode, status: 'failed', error: String(error), errors }
          await fetch('/result', { method: 'POST', body: JSON.stringify(result) })
          progress.results.push(result)
        }
        progress.completed++
      }
    }
  } finally {
    OfflineAudioContext.prototype.startRendering = start
    URL.createObjectURL = objectUrl
    HTMLAnchorElement.prototype.click = click
    console.error = logError
    progress.done = true
    document.querySelector('#status').textContent = `${progress.completed}/${progress.total} renderizações terminadas.`
  }
  return progress
}
