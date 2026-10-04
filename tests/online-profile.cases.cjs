const { test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, memoryStorage } = require('./helpers/music.cjs')

const { normalizePlayerProfile, savePlayerProfile } = loadTs('lib/game-progression.ts')
const {
  cacheLocalProfile,
  cacheOnlineProfile,
  preserveProfileBackup,
  readCachedLocalProfile,
  readCachedOnlineProfile,
  readLocalProfile,
  readLocalProfileOwner,
  readProfileBackups,
  samePlayerProfileContent,
  setLocalProfileOwner,
} = loadTs('lib/online/client.ts')

// These cases exercise the real profile/cache helpers with browser storage,
// without pretending to validate Auth, a live Supabase project, or logout RPCs.
const browserGlobals = ['window', 'document', 'localStorage']
let previousGlobals
let memory
let dispatched

beforeEach(() => {
  previousGlobals = new Map(browserGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  memory = new Map()
  dispatched = []
  globalThis.window = { dispatchEvent: (event) => { dispatched.push(event); return true } }
  globalThis.document = { cookie: '' }
  globalThis.localStorage = memoryStorage(memory)
})

afterEach(() => {
  for (const name of browserGlobals) {
    const descriptor = previousGlobals.get(name)
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})

function profile(overrides = {}) {
  return normalizePlayerProfile({ ...normalizePlayerProfile(null, 100), ...overrides }, 100)
}

function setCampaign(source) {
  document.cookie = `other=value; chikenchess_player=${encodeURIComponent(JSON.stringify(source))}`
  localStorage.setItem('chikenchess_player', JSON.stringify(source))
}

test('cloud-sync reads prefer the campaign cookie without saving or dispatching a campaign mutation', () => {
  const cookieProfile = profile({ goldenEggs: 14, points: 24, conqueredCityIds: ['dusseldorf'], winsCount: 1 })
  setCampaign(cookieProfile)
  localStorage.setItem('chikenchess_player', JSON.stringify(profile({ goldenEggs: 22, points: 22 })))
  const originalCookie = document.cookie
  const originalMemory = new Map(memory)

  assert.deepEqual(readLocalProfile(), cookieProfile)
  assert.deepEqual(readLocalProfile(), cookieProfile)
  assert.equal(dispatched.length, 0)
  assert.equal(document.cookie, originalCookie)
  assert.deepEqual(memory, originalMemory)
})

test('a damaged campaign cookie falls back to the local mirror without creating a new save', () => {
  const mirrored = profile({ goldenEggs: 17, points: 37, gameplayTipSeen: true })
  document.cookie = 'chikenchess_player=%7Bbroken'
  localStorage.setItem('chikenchess_player', JSON.stringify(mirrored))

  assert.deepEqual(readLocalProfile(), mirrored)
  assert.equal(dispatched.length, 0)
  assert.equal(localStorage.getItem('chikenchess_player'), JSON.stringify(mirrored))
})

test('local and confirmed cloud snapshots stay isolated for two accounts and the guest', () => {
  const guest = profile({ goldenEggs: 11, points: 11 })
  const alice = profile({ goldenEggs: 14, points: 24, updatedAt: 200 })
  const bob = profile({ goldenEggs: 22, points: 52, updatedAt: 300 })
  const cloudAlice = { id: 'alice', code: 'ALICE1', display_name: 'Alice', baptismal_name: 'Lady Wobbly Kazoo', profile: alice }
  const cloudBob = { id: 'bob', code: 'BOB001', display_name: 'Bob', baptismal_name: 'Mx. Clucks-a-Lot', profile: bob }

  cacheLocalProfile(null, guest)
  cacheLocalProfile('alice', alice)
  cacheLocalProfile('bob', bob)
  cacheOnlineProfile(cloudAlice)
  cacheOnlineProfile(cloudBob)

  assert.deepEqual(readCachedLocalProfile(null), guest)
  assert.deepEqual(readCachedLocalProfile('alice'), alice)
  assert.deepEqual(readCachedLocalProfile('bob'), bob)
  assert.deepEqual(readCachedOnlineProfile('alice'), cloudAlice)
  assert.deepEqual(readCachedOnlineProfile('bob'), cloudBob)
  assert.equal(readCachedLocalProfile('unknown'), null)
  assert.equal(readCachedOnlineProfile('unknown'), null)
  assert.equal(readCachedOnlineProfile(null), null)

  const copy = readCachedLocalProfile('alice')
  copy.goldenEggs = 999
  assert.equal(readCachedLocalProfile('alice').goldenEggs, 14)
})

test('a stored guest copy can restore the campaign after clearing its account owner', () => {
  const guest = profile({ goldenEggs: 12, points: 12, conqueredCityIds: ['dusseldorf'] })
  const account = profile({ goldenEggs: 30, points: 70, conqueredCityIds: ['dusseldorf', 'nyc'] })
  cacheLocalProfile(null, guest)
  cacheLocalProfile('account', account)
  setLocalProfileOwner('account')
  setCampaign(account)
  assert.equal(readLocalProfileOwner(), 'account')

  setLocalProfileOwner(null)
  savePlayerProfile(readCachedLocalProfile(null))

  assert.equal(readLocalProfileOwner(), null)
  assert.deepEqual(readLocalProfile(), guest)
  assert.deepEqual(readCachedLocalProfile(null), guest)
  assert.deepEqual(readCachedLocalProfile('account'), account)
})

test('backups deduplicate equivalent snapshots but retain balance changes and distinct identities', () => {
  const source = profile({ goldenEggs: 15, points: 35, updatedAt: 200 })
  setCampaign(source)
  const originalCookie = document.cookie
  const originalLocalSave = localStorage.getItem('chikenchess_player')
  const reordered = Object.fromEntries(Object.entries(source).reverse())

  preserveProfileBackup('alice', source)
  preserveProfileBackup('alice', { ...reordered, updatedAt: 900 })
  assert.equal(readProfileBackups().length, 1)

  const changed = { ...source, goldenEggs: 16, points: 36 }
  preserveProfileBackup('alice', changed)
  preserveProfileBackup('bob', changed)
  assert.deepEqual(readProfileBackups().map((entry) => [entry.userId, entry.profile.goldenEggs]), [['alice', 15], ['alice', 16], ['bob', 16]])
  assert.equal(document.cookie, originalCookie)
  assert.equal(localStorage.getItem('chikenchess_player'), originalLocalSave)
  assert.equal(dispatched.length, 0)
})

test('profile comparison ignores timestamp and property order while detecting real economy and progress changes', () => {
  const source = profile({ goldenEggs: 15, points: 45, conqueredCityIds: ['dusseldorf'], winsCount: 1 })
  const reordered = Object.fromEntries(Object.entries(source).reverse())
  assert.equal(samePlayerProfileContent(source, { ...reordered, updatedAt: 999 }), true)
  assert.equal(samePlayerProfileContent(source, { ...reordered, goldenEggs: 14 }), false)
  assert.equal(samePlayerProfileContent(source, { ...reordered, points: 46 }), false)
  assert.equal(samePlayerProfileContent(source, { ...reordered, conqueredCityIds: ['dusseldorf', 'nyc'] }), false)
  assert.equal(samePlayerProfileContent(source, { ...reordered, winsCount: 2 }), false)
  assert.equal(samePlayerProfileContent(source, { ...reordered, gameplayTipSeen: true }), false)
})

test('blocked browser storage keeps the campaign readable and backup/cache writes fail gracefully', () => {
  const source = profile({ goldenEggs: 19, points: 39 })
  setCampaign(source)
  globalThis.localStorage = {
    getItem() { throw new Error('Storage blocked') },
    setItem() { throw new Error('Storage blocked') },
    removeItem() { throw new Error('Storage blocked') },
  }

  assert.deepEqual(readLocalProfile(), source)
  assert.doesNotThrow(() => cacheLocalProfile('alice', source))
  assert.doesNotThrow(() => cacheOnlineProfile({ id: 'alice', code: 'ALICE1', display_name: 'Alice', profile: source }))
  assert.doesNotThrow(() => setLocalProfileOwner(null))
  assert.equal(readLocalProfileOwner(), null)
  assert.equal(readCachedLocalProfile('alice'), null)
  assert.equal(readCachedOnlineProfile('alice'), null)
  assert.deepEqual(readProfileBackups(), [])
  assert.deepEqual(preserveProfileBackup('alice', source).profile, source)
  assert.deepEqual(readLocalProfile(), source)
  assert.equal(dispatched.length, 0)
})
