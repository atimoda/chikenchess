const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { loadTs } = require('./helpers/music.cjs')

const { isAdminUser } = loadTs('lib/admin/access.ts')
const { ADMIN_ENTRIES } = loadTs('lib/admin/catalog.ts')
const { validateAdminValue } = loadTs('lib/admin/validation.ts')

const root = path.resolve(__dirname, '..')
const json = name => JSON.parse(fs.readFileSync(path.join(root, 'data/ui', `${name}.json`), 'utf8'))
const entry = id => ADMIN_ENTRIES.find(item => item.id === id)

test('admin access requires application metadata and rejects spoofed profile fields', () => {
  assert.equal(isAdminUser({ app_metadata: { access_level: 'admin' }, is_anonymous: false }), true)
  for (const user of [null, undefined, { is_anonymous: true, app_metadata: { access_level: 'admin' } }, { is_anonymous: false, app_metadata: { access_level: 'user' } }, { is_anonymous: false, app_metadata: {}, user_metadata: { access_level: 'admin' } }, { is_anonymous: false, user_metadata: { access_level: 'admin' } }]) assert.equal(isAdminUser(user), false)
})

test('all admin catalog files validate against their current authoritative data', () => {
  for (const item of ADMIN_ENTRIES) {
    const value = JSON.parse(fs.readFileSync(path.join(root, item.path), 'utf8'))
    validateAdminValue(item, value)
  }
})

test('catalog validation rejects structural and stable-contract edits', () => {
  const openings = json('opening-phrases'); assert.throws(() => validateAdminValue(entry('opening-phrases'), []))
  const moves = json('move-messages'); const empty = { ...moves, BEST_MOVE_MESSAGES: [] }; assert.throws(() => validateAdminValue(entry('move-messages'), empty))
  const campaigns = json('campaigns'); const removed = campaigns.slice(0, -1); assert.throws(() => validateAdminValue(entry('campaigns'), removed))
  const intros = json('city-intros'); const unknownCity = { ...intros, '__unknown-city__': intros[Object.keys(intros)[0]] }; assert.throws(() => validateAdminValue(entry('city-intros'), unknownCity))
  const ranks = json('rank-titles'); const changed = ranks.map(item => ({ ...item })); changed[0].minPoints = 1; assert.throws(() => validateAdminValue(entry('rank-titles'), changed))
  const names = json('baptism-names'); const duplicate = structuredClone(names); duplicate.title.push(duplicate.title[0]); assert.throws(() => validateAdminValue(entry('baptism-names'), duplicate))
  const oversized = structuredClone(names); oversized.title = ['T'.repeat(12)]; oversized.noun = ['N'.repeat(12)]; oversized.adjective = ['A'.repeat(12)]; oversized.epithet = ['E'.repeat(12)]; assert.throws(() => validateAdminValue(entry('baptism-names'), oversized))
  assert.ok(openings.length > 0)
})

test('music profile and preset validation rejects invalid sample, notation, and ownership', () => {
  const { STYLE_PROFILES } = loadTs('lib/music/kit-profiles/catalog.ts')
  const cityId = Object.keys(STYLE_PROFILES)[0]
  const profileEntry = entry(`profile:${cityId}`)
  const profile = structuredClone(STYLE_PROFILES[cityId])
  assert.throws(() => validateAdminValue(profileEntry, { ...profile, parts: profile.parts.map((part, i) => i ? part : { ...part, source: { kind: 'sample', bank: 'unknown', asset: 'x', variant: 0, pitched: false } }) }))
  assert.throws(() => validateAdminValue(profileEntry, { ...profile, parts: profile.parts.map((part, i) => i ? part : { ...part, patterns: ['bad-notes'] }) }))
  const presetEntry = ADMIN_ENTRIES.find(item => item.kind === 'music-preset' && item.cityId)
  assert.ok(presetEntry)
  const file = JSON.parse(fs.readFileSync(path.join(root, presetEntry.path), 'utf8'))
  assert.throws(() => validateAdminValue(presetEntry, { ...file, cityId: '__unknown_city__' }))
})

test('edited style profile is consumed without mutating the source profile', () => {
  const { STYLE_PROFILES } = loadTs('lib/music/kit-profiles/catalog.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  const { createStyledCityKit } = loadTs('lib/music/styled-kits.ts')
  const cityId = Object.keys(STYLE_PROFILES)[0]; const city = cities.find(item => item.id === cityId)
  const source = structuredClone(STYLE_PROFILES[cityId]); const edited = structuredClone(source); edited.name = `${source.name} edited`; edited.bpm = source.bpm + 1
  const kit = createStyledCityKit(city, edited)
  assert.equal(kit.name, edited.name); assert.equal(kit.bpm, edited.bpm); assert.deepEqual(STYLE_PROFILES[cityId], source)
})

test('names migration is digest-idempotent, escapes SQL, and preserves source files', async t => {
  const { generateNamesMigration, namesDigest } = await import('../scripts/admin/names-migration.mjs')
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'chicken-admin-')); t.after(async () => fsp.rm(temp, { recursive: true, force: true })); await fsp.mkdir(path.join(temp, 'data/ui'), { recursive: true }); await fsp.mkdir(path.join(temp, 'supabase/migrations'), { recursive: true })
  const value = { title: ["O'Reilly"], adjective: ['Bright'], noun: ['Hen'], epithet: ['The Bold'] }
  const source = path.join(temp, 'data/ui/baptism-names.json'); await fsp.writeFile(source, JSON.stringify(value) + '\n'); const before = await fsp.readFile(source, 'utf8')
  const validate = v => { if (!v.title?.length) throw new Error('invalid') }
  const first = await generateNamesMigration(temp, validate); const sql = await fsp.readFile(path.join(temp, first.path), 'utf8')
  assert.match(sql, /O''Reilly/); assert.match(sql, new RegExp(`source-sha256: ${namesDigest(value)}`))
  const second = await generateNamesMigration(temp, validate); assert.equal(second.unchanged, true); assert.equal(second.path, first.path)
  value.noun.push('Rooster'); await fsp.writeFile(source, JSON.stringify(value) + '\n'); const third = await generateNamesMigration(temp, validate); assert.notEqual(third.path, first.path); assert.equal(await fsp.readFile(source, 'utf8'), JSON.stringify(value) + '\n'); assert.equal(before.includes("O'Reilly"), true)
})
