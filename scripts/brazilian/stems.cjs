/* global __dirname, process, console, URL, Buffer */
// Measures each white piece of a kit as a solo stem in the shipped Strudel/Superdough
// renderer (headless Chromium, OfflineAudioContext), plus the full 16-piece mix.
// Prints the active RMS (mean power over the 100 ms windows above -60 dBFS) and the peak,
// so part gains can be balanced by measurement. Not a substitute for listening.
// Usage: node scripts/brazilian/stems.cjs <stage> [--from <section>] [--to <section>] [--json out.json]
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
const profile = JSON.parse(fs.readFileSync(path.join(root, 'data/music/profiles', `${id}.json`), 'utf8'))
const city = cities.find(item => item.id === id)
const kit = city ? createStyledCityKit(city, profile) : defaultCityKit(id)
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
const cps = kit.bpm / 60 / bpb

const page = `<!doctype html><meta charset="utf-8"><script type="module">
import * as api from '/strudel.mjs'
window.measure = async (job) => {
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
    await api.renderPatternAudio(pattern, ${cps}, ${begin}, ${end}, 24000, attacks + 1, false, 'stem')
  } finally { OfflineAudioContext.prototype.startRendering = start; HTMLAnchorElement.prototype.click = click }
  const window_ = Math.round(buffer.sampleRate / 10)
  let peak = 0, activePower = 0, activeWindows = 0, windows = 0
  const channels = [...Array(buffer.numberOfChannels).keys()].map(index => buffer.getChannelData(index))
  for (let at = 0; at < buffer.length; at += window_) {
    let power = 0, count = 0
    for (const data of channels) for (let i = at; i < Math.min(buffer.length, at + window_); i++) { power += data[i] ** 2; peak = Math.max(peak, Math.abs(data[i])); count++ }
    windows++
    if (power / count > 1e-6) { activePower += power / count; activeWindows++ }
  }
  return { activeDb: 10 * Math.log10(activePower / Math.max(1, activeWindows) || 1e-12), peakDb: 20 * Math.log10(peak || 1e-12), active: activeWindows / windows }
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
    const result = await tab.evaluate(job => window.measure(job), job)
    results.push({ key: job.key, name: job.name, ...result })
    console.log(`${job.key.padEnd(5)} ${job.name.padEnd(36)} active ${result.activeDb.toFixed(1).padStart(6)} dB · peak ${result.peakDb.toFixed(1).padStart(6)} dB · on ${(result.active * 100).toFixed(0)}%`)
  }
  if (option('--json')) fs.writeFileSync(option('--json'), JSON.stringify({ id, from, to, results }, null, 2))
  await browser.close(); server.close()
})
