// Freezes the Electronic World and Brazilian kits as they were before the 25/10/2026 revisions into
// public/presets/legacy/<city>.json. They load in Creative under "Legacy kits", with no
// city link, so the history stays playable after the profiles are rewritten.
// Run once, before changing a profile: node scripts/export-legacy-kits.cjs [city ...]
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../tests/helpers/music.cjs')
const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
const { creativeSchema } = loadTs('lib/music/creative.ts')
const { cities } = loadTs('lib/cities-data.ts')

const LEGACY = ['dusseldorf', 'nyc', 'chicago', 'detroit', 'ibiza', 'manchester', 'berlin', 'tokyo', 'london', 'saopaulo', 'johannesburg', 'paris',
  'rio-1910', 'rio-1930', 'recife-1935', 'piracicaba-1940', 'recife-1950', 'rio-1960', 'recife-1975', 'salvador-1992', 'rio-1995']
const dest = path.resolve(__dirname, '..', 'public', 'presets', 'legacy')
fs.mkdirSync(dest, { recursive: true })
const index = []
for (const id of process.argv.slice(2).length ? process.argv.slice(2) : LEGACY) {
  const city = cities.find(item => item.id === id)
  const kit = defaultCityKit(id)
  const frozen = creativeSchema.parse({ ...kit, cityId: undefined, name: `${kit.name} · legacy` })
  fs.writeFileSync(path.join(dest, `${id}.json`), JSON.stringify(frozen) + '\n')
  index.push({ id, name: frozen.name, city: city.name, revision: kit.catalogRevision })
}
// The index lists every frozen kit, including ones frozen by earlier runs.
const indexFile = path.resolve(__dirname, '..', 'data', 'music', 'legacy-kits.json')
const previous = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : []
const merged = [...previous.filter(item => !index.some(entry => entry.id === item.id)), ...index]
fs.writeFileSync(indexFile, JSON.stringify(merged, null, 2) + '\n')
console.log(`Froze ${index.length} kits in public/presets/legacy`)
