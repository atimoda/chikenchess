// Validates Electronic World profiles the way the Admin does and prints a short summary.
// Usage: node scripts/electronic/check.cjs <city> [city ...]
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../../tests/helpers/music.cjs')
const { styleProfileSchema } = loadTs('lib/admin/validation.ts')
const { createStyledCityKit } = loadTs('lib/music/styled-kits.ts')
const { cities } = loadTs('lib/cities-data.ts')
const { instrumentRole } = loadTs('lib/music/sound-design.ts')

let failed = false
for (const id of process.argv.slice(2)) {
  try {
    const file = path.resolve(__dirname, '..', '..', 'data', 'music', 'profiles', `${id}.json`)
    const profile = styleProfileSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')))
    const kit = createStyledCityKit(cities.find(city => city.id === id), profile)
    const white = kit.pieces.filter(piece => piece.color === 'w')
    const notes = white.reduce((sum, piece) => sum + kit.instruments[piece.id].pianoRolls.reduce((n, roll) => n + roll.notes.length, 0), 0)
    const roles = {}
    for (const piece of white) { const role = instrumentRole(kit.instruments[piece.id]); roles[role] = (roles[role] ?? 0) + 1 }
    const bars = kit.arrangement.sections.reduce((sum, section) => sum + section.beats, 0) / 4
    console.log(`${id}: ok · ${profile.bpm} BPM ${profile.root} ${profile.scale} · ${bars} bars · ${notes} notes · roles ${JSON.stringify(roles)} · ${kit.reactions.rules.length} kit rules`)
  } catch (error) {
    failed = true
    console.error(`${id}: ${error.message.slice(0, 2000)}`)
  }
}
process.exit(failed ? 1 : 0)
