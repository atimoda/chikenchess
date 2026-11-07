/* global __dirname, process, console, URL, Buffer */
// Reproducible full-form audit and a local browser bridge to the real Strudel
// OfflineAudioContext renderer. No changes to saved kits or live app state.
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { loadTs, strudel } = require('../tests/helpers/music.cjs')
const { cities } = loadTs('lib/cities-data.ts')
const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
const { creativeSnapshot } = loadTs('lib/music/creative.ts')
const { voiceSpecs, compileVoice, renderMusicCode } = loadTs('lib/music/runtime.ts')
const { sampleRegistration } = loadTs('lib/music/sample-banks.ts')
const { beatsPerBar } = loadTs('lib/music/meter.ts')
const root = path.resolve(__dirname, '..')
const output = path.resolve(process.argv.slice(2).find(argument => !argument.startsWith('--')) || path.join(root, '.artifacts/music-review-arrangement-v6'))
const port = Number(process.env.MUSIC_REVIEW_PORT || 3011)
const selectedIds = process.argv.find(argument => argument.startsWith('--cities='))?.slice(9).split(',')
if (selectedIds?.some(id => !cities.some(city => city.id === id))) throw new Error('Unknown --cities ID')
const selectedCities = selectedIds ? cities.filter(city => selectedIds.includes(city.id)) : cities

async function audit() {
  fs.mkdirSync(output, { recursive: true })
  const api = await strudel()
  const kits = []
  for (const city of selectedCities) {
    const kit = defaultCityKit(city.id)
    const snapshot = creativeSnapshot(kit, true)
    const voices = voiceSpecs(snapshot, null)
    const cycles = kit.arrangement.sections.reduce((sum, section) => sum + section.beats, 0) / beatsPerBar(kit.meter)
    const samples = [...new Map(voices.flatMap(voice => voice.instrument.source?.kind === 'sample'
      ? [[sampleRegistration(voice.instrument.source).sound, sampleRegistration(voice.instrument.source).map]] : [])).values()]
    const tracks = voices.map(voice => {
      const pattern = compileVoice(api, voice)
      const haps = pattern.queryArc(0, cycles).filter(hap => hap.hasOnset())
      const variations = voice.instrument.pianoRolls.map(roll => JSON.stringify(roll))
      return { id: voice.piece.id, instrument: voice.instrument.name, source: voice.instrument.source, variations: variations.length,
        uniqueVariations: new Set(variations).size, attacks: haps.length,
        restart: voice.instrument.arrangement?.restart ?? false,
        sections: kit.arrangement.sections.map((section, index) => ({ ...section,
          ...(voice.instrument.arrangement?.sections[section.id] ?? { variation: index % voice.instrument.pianoRolls.length, transpose: 0, active: true }),
        })),
        peakNoteGain: Math.max(0, ...haps.map(hap => Number(hap.value.gain ?? 1) * Number(hap.value.velocity ?? 1))),
      }
    })
    const stress = { ...snapshot, pieces: snapshot.pieces.map(piece => ({ ...piece, active: true })) }
    const data = { id: city.id, revision: kit.catalogRevision, city: city.name, genre: city.genre, title: kit.name, meter: kit.meter, bpm: kit.bpm,
      cycles, seconds: cycles * beatsPerBar(kit.meter) * 60 / kit.bpm, active: voices.length, samples,
      arrangement: kit.arrangement, tracks,
      code: renderMusicCode(snapshot, null), stressCode: renderMusicCode(stress, null),
    }
    fs.writeFileSync(path.join(output, `${city.id}.json`), JSON.stringify(data, null, 2) + '\n')
    kits.push({ id: data.id, city: data.city, genre: data.genre, seconds: data.seconds, cycles: data.cycles,
      meter: data.meter, bpm: data.bpm, active: data.active, arrangement: data.arrangement, uniqueBanks: [...new Set(tracks.map(track => track.source?.bank).filter(Boolean))], tracks })
    console.log(`Audited ${kits.length}/${selectedCities.length}: ${city.id}`)
  }
  fs.writeFileSync(path.join(output, 'catalog.json'), JSON.stringify({ generated: new Date().toISOString(), limitations: 'Structural and rendered-audio evidence; not a claim of perceptual listening or device performance.', kits }, null, 2) + '\n')
  return kits
}

async function main() {
  const kits = process.argv.includes('--serve-only') ? JSON.parse(fs.readFileSync(path.join(output, 'catalog.json'))).kits : await audit()
  if (!process.argv.some(argument => argument === '--serve' || argument === '--serve-only')) { console.log(`Audited ${kits.length} kits: ${output}`); return }
  const allowed = new Set(kits.map(kit => kit.id))
  const results = []
  http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://127.0.0.1:${port}`)
      const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
      if (request.method === 'POST' && url.pathname === '/audio') {
        const id = url.searchParams.get('id'), mode = url.searchParams.get('mode')
        if (!allowed.has(id) || !['white', 'all'].includes(mode)) throw new Error('Unknown audio target')
        const chunks = []
        for await (const chunk of request) chunks.push(chunk)
        fs.writeFileSync(path.join(output, `${id}-${mode}.wav`), Buffer.concat(chunks))
        response.writeHead(200, headers).end('saved'); return
      }
      if (request.method === 'POST' && url.pathname === '/result') {
        const chunks = []; for await (const chunk of request) chunks.push(chunk)
        const result = JSON.parse(Buffer.concat(chunks).toString())
        if (!allowed.has(result.id)) throw new Error('Unknown result')
        results.push(result)
        fs.writeFileSync(path.join(output, 'render-results.json'), JSON.stringify(results, null, 2) + '\n')
        console.log(JSON.stringify(result)); response.writeHead(200, headers).end('saved'); return
      }
      let file
      if (url.pathname === '/strudel.mjs') file = path.join(root, 'node_modules/@strudel/web/dist/index.mjs')
      else if (url.pathname === '/client.js') file = path.join(root, 'scripts/render-kit-review.js')
      else if (url.pathname === '/catalog.json') file = path.join(output, 'catalog.json')
      else if (url.pathname === '/render-results.json') file = path.join(output, 'render-results.json')
      else if (url.pathname.startsWith('/rendered/')) {
        const match = /^\/rendered\/([a-z\d-]+)-(white|all)\.wav$/.exec(url.pathname)
        if (!match || !allowed.has(match[1])) throw new Error('Unknown rendered audio')
        file = path.join(output, `${match[1]}-${match[2]}.wav`)
      }
      else if (url.pathname.startsWith('/kit/') && allowed.has(url.pathname.slice(5))) file = path.join(output, `${url.pathname.slice(5)}.json`)
      else if (url.pathname.startsWith('/samples/')) {
        file = path.resolve(root, 'public', '.' + decodeURIComponent(url.pathname))
        if (!file.startsWith(path.join(root, 'public/samples/') )) throw new Error('Invalid sample path')
      } else if (url.pathname === '/') {
        response.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' })
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>ChickenChess · revisão musical</title>
          <style>body{font:16px system-ui;background:#161616;color:#eee;margin:3rem;max-width:900px}button{padding:.6rem;margin:.3rem}li{margin:1rem 0}audio{display:block;margin-top:.5rem}a{color:#b0e59a}</style>
          <h1>Revisão musical · formas completas</h1><p>${kits.length} cidades, notas MIDI e arranjo global com presença por peça. Gráficos/picos não substituem escuta nem avaliação de estilo.</p>
          <button data-modes="white">Renderizar 16 peças</button><button data-modes="all">Estresse com 32 peças</button><button data-modes="white,all">Renderizar os dois modos</button>
          <p id="status">Pronto. A renderização pode levar vários minutos por kit.</p><ol id="results"></ol>
          <script type="module">import {renderKitReview} from '/client.js';document.querySelectorAll('button').forEach(button=>button.onclick=()=>{if(window.kitReview&&!window.kitReview.done)return;window.reviewPromise=renderKitReview({modes:button.dataset.modes.split(',')});window.reviewPromise.catch(error=>document.querySelector('#status').textContent=String(error));});</script></html>`); return
      } else { response.writeHead(404, headers).end(); return }
      response.writeHead(200, { ...headers, 'Content-Type': /\.(mjs|js)$/.test(file) ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : 'audio/wav' })
      const stream = fs.createReadStream(file)
      stream.on('error', () => response.destroy())
      stream.pipe(response)
    } catch (error) { response.writeHead(500).end(String(error)) }
  }).listen(port, '127.0.0.1', () => console.log(`Review bridge: http://127.0.0.1:${port}; ${output}`))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
