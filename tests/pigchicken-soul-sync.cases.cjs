const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

// two browsers of the same player: each its own localStorage, one account on a fake server
const stores = { a: new Map(), b: new Map() }
let store = stores.a
let listeners = [], backs = []
global.window = {
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  addEventListener: (type, fn) => { listeners.push({ type, fn }) }, removeEventListener: (type, fn) => { listeners = listeners.filter(l => l.type !== type || l.fn !== fn) },
  dispatchEvent: e => { for (const l of [...listeners]) if (l.type === e.type) l.fn(e); return true },
}
if (!global.CustomEvent) global.CustomEvent = class { constructor(type) { this.type = type } }
global.document = { visibilityState: 'visible', addEventListener: (_type, fn) => { backs.push(fn) }, removeEventListener: (_type, fn) => { backs = backs.filter(f => f !== fn) } }
const L = loadTs('lib/pigchicken/soul-library.ts')
const O = loadTs('lib/pigchicken/soul-online.ts')

// the account: it merges as the migration does (supabase/tests/database.test.cjs runs the real one)
function server() {
  const s = {
    found: {}, calls: 0, fail: null, during: null,
    async merge(found) {
      s.calls++
      if (s.fail) throw s.fail
      s.found = L.mergeCollections(s.found, L.normalizeCollection(JSON.parse(JSON.stringify(found))))
      const out = JSON.parse(JSON.stringify(s.found))
      if (s.during) { const d = s.during; s.during = null; d() }
      return out
    },
  }
  return s
}
const soul = (species, state, shot = null, note = null, weapon = null) => ({ species, state, shot, note, weapon })
const chick = soul('chick', 'alive')
const on = k => { store = stores[k] }
const settle = () => new Promise(r => setImmediate(r))

test('what is caught here goes to the account and comes back on another browser', async () => {
  const api = server()
  on('a'); L.collectSoul(soul('horde', 'alive', 'wind', 'tonic'), 100); L.collectSoul(soul('horde', 'alive', 'wind', 'consonant'), 200)
  let r = await O.syncSouls(api)
  assert.equal(r.got, 0); assert.equal(r.again, false)
  assert.deepEqual(api.found['horde.alive.wind'], { n: 2, at: 100, notes: ['tonic', 'consonant'], weapons: [] })
  // the other browser caught the same soul earlier, on another note, and a chick
  on('b'); L.collectSoul(soul('horde', 'alive', 'wind', 'tension'), 50); L.collectSoul(chick, 60)
  r = await O.syncSouls(api)
  assert.equal(r.got, 1, 'the entry both had, now with what the first one found')
  assert.deepEqual(L.loadCollection()['horde.alive.wind'], { n: 2, at: 50, notes: ['tonic', 'consonant', 'tension'], weapons: [] })
  assert.equal(api.found.chick.n, 1)
  const b = L.loadCollection()
  on('a'); r = await O.syncSouls(api)
  assert.equal(r.got, 2)
  assert.deepEqual(L.loadCollection(), b, 'both browsers hold the same')
  // nothing new: nothing is written here
  let saves = 0
  const off = L.subscribeCollection(() => saves++)
  r = await O.syncSouls(api)
  off()
  assert.equal(r.got, 0); assert.equal(saves, 0)
  assert.equal(r.known, L.collectionKey(L.loadCollection()))
})

test('a soul caught while the pass is away stays, and goes in the next one', async () => {
  const api = server()
  stores.a.clear(); on('a')
  L.collectSoul(soul('jelly', 'alive', 'keys', 'tonic'), 10)
  api.during = () => L.collectSoul(chick, 20)
  let r = await O.syncSouls(api)
  assert.equal(r.again, true)
  assert.equal(L.loadCollection().chick.n, 1); assert.ok(!api.found.chick)
  r = await O.syncSouls(api)
  assert.equal(r.again, false); assert.equal(api.found.chick.n, 1)
})

test('signed in, the collection follows the account; a guest keeps it in this browser', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const seen = []
  const offState = O.subscribeSoulSyncState(s => seen.push(s.status))
  O.startSoulSync(null)()
  assert.equal(O.soulSyncState().status, 'local')
  const api = server()
  stores.a.clear(); on('a')
  L.collectSoul(soul('jelly', 'alive', 'keys', 'tonic'), 10)
  const stop = O.startSoulSync('u', api)
  await settle()
  assert.equal(api.calls, 1); assert.deepEqual(seen, ['local', 'syncing', 'synced'])
  assert.equal(api.found['jelly.alive.keys'].n, 1)
  // captures: sent a while later, the ones in a row together, and no more than a pass every 30 s
  L.collectSoul(chick, 20); L.collectSoul(chick, 21)
  t.mock.timers.tick(4000); await settle()
  assert.equal(api.calls, 1)
  t.mock.timers.tick(26000); await settle()
  assert.equal(api.calls, 2); assert.equal(api.found.chick.n, 2)
  // what another browser caught comes when the tab is back, after a while; bringing it asks for no other pass
  api.found = L.mergeCollections(api.found, { 'rare.fenix': { n: 1, at: 5, notes: ['tonic'], weapons: [] } })
  for (const fn of backs) fn()
  await settle()
  assert.equal(api.calls, 2, 'not so soon')
  t.mock.timers.tick(5 * 60_000 + 1)
  for (const fn of backs) fn()
  await settle()
  assert.equal(api.calls, 3); assert.equal(L.loadCollection()['rare.fenix'].n, 1)
  t.mock.timers.tick(120_000); await settle()
  assert.equal(api.calls, 3)
  stop()
  L.collectSoul(chick, 30)
  t.mock.timers.tick(120_000); await settle()
  assert.equal(api.calls, 3, 'stopped'); assert.equal(backs.length, 0)
  offState()
})

test('a server without the migration is not asked again, and a lost connection is; the collection stays here', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const api = server()
  api.fail = { code: 'PGRST202', message: 'Could not find the function public.pigchicken_souls_merge(p_found) in the schema cache' }
  stores.a.clear(); on('a')
  L.collectSoul(chick, 5)
  let stop = O.startSoulSync('u', api)
  await settle()
  assert.equal(O.soulSyncState().status, 'error'); assert.match(O.soulSyncState().message, /migração/)
  L.collectSoul(chick, 6)
  t.mock.timers.tick(120_000); await settle()
  assert.equal(api.calls, 1); assert.equal(L.loadCollection().chick.n, 2)
  stop()

  const flaky = server()
  flaky.fail = new TypeError('Failed to fetch')
  stop = O.startSoulSync('u', flaky)
  await settle()
  assert.match(O.soulSyncState().message, /Sem conexão/)
  flaky.fail = null
  L.collectSoul(chick, 7)
  t.mock.timers.tick(30_000); await settle()
  assert.equal(flaky.calls, 2); assert.equal(O.soulSyncState().status, 'synced'); assert.equal(flaky.found.chick.n, 3)
  stop()
  assert.match(O.soulErrorMessage(new Error('ACCOUNT_REQUIRED')), /conta/)
  assert.match(O.soulErrorMessage(new Error('TOO_MANY_SOULS')), /grande demais/)
})
