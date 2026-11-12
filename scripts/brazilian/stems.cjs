/* global __dirname, process, console, URL, Buffer */
// Measures each white piece of a kit as a solo stem in the shipped Strudel/Superdough
// renderer (headless Chromium, OfflineAudioContext), plus the full 16-piece mix.
// Prints the active RMS (mean power over the 100 ms windows above -60 dBFS) and the peak,
// so part gains can be balanced by measurement. Not a substitute for listening.
// The mix line also reports the level below ~150 Hz (two one-pole low-passes): how much of the mix is bass drum.
// Stages with an official kit (data/music/kits) are measured from it; the others from their profile.
// --mp3 out.mp3 also saves the rendered mix (for listening; it is not committed).
// Usage: node scripts/brazilian/stems.cjs <stage> [--from <section>] [--to <section>] [--only a1,c2,mix] [--json out.json] [--mp3 out.mp3]
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { loadTs } = require('../../tests/helpers/music.cjs')
const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
const { createStyledCityKit } = loadTs('lib/music/styled-kits.ts')
const { cities } = loadTs('lib/cities-data.ts')
const { creativeSnapshot } = loadTs('lib/music/creative.ts')
const { renderMusicCode } = loadTs('lib/music/runtime.ts')
const { voiceSpecs } = loadTs('lib/music/runtime.ts')
const { sampleRegistration } = loadTs('lib/music/sample-banks.ts')
const { beatsPerBar } = loadTs('lib/music/meter.ts')
const root = path.resolve(__dirname, '..', '..')

const args = process.argv.slice(2)
const id = args[0]
const option = name => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1] }
const city = cities.find(item => item.id === id)
const official = fs.existsSync(path.join(root, 'data/music/kits', `${id}.json`))
const kit = city && !official ? createStyledCityKit(city, JSON.parse(fs.readFileSync(path.join(root, 'data/music/profiles', `${id}.json`), 'utf8'))) : defaultCityKit(id)
const bpb = beatsPerBar(kit.meter)
const starts = []; let beat = 0
for (const section of kit.arrangement.sections) { starts.push(beat); beat += section.beats }
const from = Number(option('--from') ?? 0), to = Number(option('--to') ?? kit.arrangement.sections.length - 1)
const begin = starts[from] / bpb, end = (starts[to] + kit.arrangement.sections[to].beats) / bpb

const strip = code => code.split('\n').filter(line => !line.startsWith('//') && !line.startsWith('setcps(') && !line.startsWith('samples(')).join('\n')
const snapshot = creativeSnapshot(kit, true)
const white = snapshot.pieces.filter(piece => piece.color === 'w')
const samples = [...new Map(voiceSpecs(snapshot, null).flatMap(voice => voice.instrument.source?.kind === 'sample'
  ? [[sampleRegistration(voice.instrument.source).sound, sampleRegistration(voice.instrument.source).map]] : [])).values()]
const jobs = white.map(piece => ({ key: piece.id, name: kit.instruments[piece.id].name,
  code: strip(renderMusicCode({ ...snapshot, pieces: snapshot.pieces.map(other => ({ ...other, active: other.id === piece.id })) }, null)) }))
jobs.push({ key: 'mix', name: '16 peças', code: strip(renderMusicCode(snapshot, null)) })
const only = option('--only')?.split(',')
if (only) for (let i = jobs.length - 1; i >= 0; i--) if (!only.some(key => jobs[i].key === key || jobs[i].key === `w:${key}`)) jobs.splice(i, 1)
const cps = kit.bpm / 60 / bpb

const page = `<!doctype html><meta charset="utf-8"><script type="module">
import * as api from '/strudel.mjs'
window.measure = async (job, keep) => {
  if (!window.ready) { api.miniAllStrings(); api.registerSynthSounds(); for (const sample of ${JSON.stringify(samples)}) await api.samples(sample); window.ready = true }
  let buffer
  const start = OfflineAudioContext.prototype.startRendering
  OfflineAudioContext.prototype.startRendering = function () { return start.call(this).then(result => { buffer = result; return result }) }
  const click = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () {}
  try {
    const names = Object.keys(api).filter(key => /^[a-zA-Z_$][\\w$]*$/.test(key) && key !== 'default')
    const pattern = new Function(...names, 'return (' + job.code + ');')(...names.map(name => api[name]))
    const attacks = pattern.queryArc(${begin}, ${end}).filter(hap => hap.hasOnset()).length
    window.lastAttacks = attacks
    await api.renderPatternAudio(pattern, ${cps}, ${begin}, ${end}, 24000, attacks + 1, false, 'stem')
  } finally { OfflineAudioContext.prototype.startRendering = start; HTMLAnchorElement.prototype.click = click }
  const window_ = Math.round(buffer.sampleRate / 10)
  let peak = 0, activePower = 0, activeWindows = 0, windows = 0
  const channels = [...Array(buffer.numberOfChannels).keys()].map(index => buffer.getChannelData(index))
  const k = 1 - Math.exp(-2 * Math.PI * 150 / buffer.sampleRate)
  let lowPower = 0, allPower = 0
  for (const data of channels) { let a = 0, b = 0; for (let i = 0; i < data.length; i++) { a += k * (data[i] - a); b += k * (a - b); lowPower += b * b; allPower += data[i] ** 2 } }
  for (let at = 0; at < buffer.length; at += window_) {
    let power = 0, count = 0
    for (const data of channels) for (let i = at; i < Math.min(buffer.length, at + window_); i++) { power += data[i] ** 2; peak = Math.max(peak, Math.abs(data[i])); count++ }
    windows++
    if (power / count > 1e-6) { activePower += power / count; activeWindows++ }
  }
  return { activeDb: 10 * Math.log10(activePower / Math.max(1, activeWindows) || 1e-12), peakDb: 20 * Math.log10(peak || 1e-12), active: activeWindows / windows,
    lowShare: 10 * Math.log10(lowPower / (allPower || 1e-12) || 1e-12), attacks: window.lastAttacks,
    pcm: keep ? (() => { const out = new Int16Array(buffer.length * 2); for (let i = 0; i < buffer.length; i++) for (let c = 0; c < 2; c++) out[i * 2 + c] = Math.max(-1, Math.min(1, channels[Math.min(c, channels.length - 1)][i])) * 32767
      let text = ''; const bytes = new Uint8Array(out.buffer); for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(text) })() : undefined }
}
window.loaded = true
</script>`

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  try {
    if (url.pathname === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(page); return }
    let file
    if (url.pathname === '/strudel.mjs') file = path.join(root, 'node_modules/@strudel/web/dist/index.mjs')
    else if (url.pathname.startsWith('/samples/')) file = path.join(root, 'public', decodeURIComponent(url.pathname))
    if (!file || !fs.existsSync(file)) { response.writeHead(404).end(); return }
    response.writeHead(200, { 'Content-Type': file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.ogg') ? 'audio/ogg' : 'audio/mp4' })
    fs.createReadStream(file).pipe(response)
  } catch (error) { response.writeHead(500).end(String(error)) }
})

server.listen(0, '127.0.0.1', async () => {
  const { chromium } = require('playwright')
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
  const tab = await browser.newPage()
  tab.on('pageerror', error => console.error('page error:', error.message))
  if (process.env.DEBUG) tab.on('console', message => console.error('console:', message.text().slice(0, 200)))
  const results = []
  for (const job of process.env.TWICE ? [...jobs, ...jobs] : jobs) {
    // A fresh page per stem: the renderer keeps buses from the previous offline context.
    await tab.goto(`http://127.0.0.1:${server.address().port}/`)
    await tab.waitForFunction(() => window.loaded)
    const keep = job.key === 'mix' && !!option('--mp3')
    const result = await tab.evaluate(([job, keep]) => window.measure(job, keep), [job, keep])
    if (result.pcm) {
      require('node:child_process').execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '2', '-i', 'pipe:0', '-b:a', '160k', option('--mp3')], { input: Buffer.from(result.pcm, 'base64') })
      delete result.pcm
    }
    results.push({ key: job.key, name: job.name, ...result })
    console.log(`${job.key.padEnd(5)} ${job.name.padEnd(36)} active ${result.activeDb.toFixed(1).padStart(6)} dB · peak ${result.peakDb.toFixed(1).padStart(6)} dB · on ${(result.active * 100).toFixed(0).padStart(3)}% · low ${result.lowShare.toFixed(1).padStart(5)} dB · ${String(result.attacks).padStart(4)} notes (${(result.attacks / ((end - begin) * bpb * 60 / kit.bpm)).toFixed(1)}/s)`)
  }
  if (option('--json')) fs.writeFileSync(option('--json'), JSON.stringify({ id, from, to, results }, null, 2))
  await browser.close(); server.close()
})
