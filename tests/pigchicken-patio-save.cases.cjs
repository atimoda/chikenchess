const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, memoryStorage } = require('./helpers/music.cjs')

const memory = new Map()
globalThis.window = { localStorage: memoryStorage(memory), location: { href: 'http://x.test/patio', search: '' }, history: { state: null, replaceState() {} } }
const store = loadTs('lib/pigchicken/patio-store.ts')
const access = loadTs('lib/pigchicken/edit-access.ts')
const online = loadTs('lib/pigchicken/patio-online.ts')

test('a Pátio kept in this browser keeps how it stands with the database copy', () => {
  memory.clear()
  const fresh = store.newPatio('device:me')
  assert.equal(fresh.revision, 0); assert.equal(fresh.dirty, false); assert.equal(fresh.dbId, fresh.id)
  store.keepPatio({ ...fresh, dirty: true, revision: 4, name: 'Pátio da Ana' })
  const back = store.loadPatio(fresh.id)
  assert.equal(back.revision, 4); assert.equal(back.dirty, true); assert.equal(back.name, 'Pátio da Ana'); assert.equal(back.creatorId, 'device:me')
  assert.deepEqual(store.localPatios().map(p => p.id), [fresh.id])
  // a lobby this browser does not know is a copy of the default nobody here may edit yet
  const other = store.loadPatio('3f1d2c4b-1111-4222-8333-444455556666')
  assert.equal(other.creatorId, null); assert.equal(other.revision, 0); assert.equal(other.dbId, other.id)
  store.forgetPatio(fresh.id)
  assert.equal(store.localPatios().length, 0)
})

test('the default Pátio is the admin\'s alone, also when opened by its lobby id', () => {
  const me = 'u-ana', id = '3f1d2c4b-1111-4222-8333-444455556666'
  access.setPatioInfo({ lobbyId: id, creatorId: me, me, isAdmin: false })
  assert.equal(access.getPatioEditAccess().canEdit, true)
  access.setPatioInfo({ lobbyId: id, creatorId: me, me, isAdmin: false, isDefault: true })
  assert.deepEqual([access.getPatioEditAccess().canEdit, access.getPatioEditAccess().reason], [false, 'default'])
  access.setPatioInfo({ lobbyId: id, creatorId: me, me: 'u-admin', isAdmin: true, isDefault: true })
  assert.equal(access.getPatioEditAccess().canEdit, true)
  // an editor the owner allowed; someone else's lobby; one with no known creator
  access.setPatioInfo({ lobbyId: id, creatorId: me, me: 'u-beto', isAdmin: false, editors: ['u-beto'] })
  assert.equal(access.getPatioEditAccess().canEdit, true)
  access.setPatioInfo({ lobbyId: id, creatorId: me, me: 'u-caio', isAdmin: false, editors: ['u-beto'] })
  assert.equal(access.getPatioEditAccess().reason, 'notCreator')
  access.setPatioInfo({ lobbyId: id, creatorId: null, me: 'u-caio', isAdmin: false })
  assert.equal(access.getPatioEditAccess().reason, 'notCreator')
  access.setPatioInfo({ lobbyId: null, creatorId: null, me: 'u-caio', isAdmin: false })
  assert.equal(access.getPatioEditAccess().reason, 'default')
})

test('another part of the page can ask the Pátio page to switch lobby', () => {
  const seen = []
  const off = store.onPatioOpenRequest(id => seen.push(id))
  store.openPatioLobby('3f1d2c4b-1111-4222-8333-444455556666')
  store.openPatioLobby('not-a-uuid')
  off()
  store.openPatioLobby(null)
  assert.deepEqual(seen, ['3f1d2c4b-1111-4222-8333-444455556666', null])
})

test('an unsaved lobby counts 30 days from its last edit or play; server errors read in Portuguese', () => {
  const day = 86400000, now = Date.parse('2026-11-30T00:00:00Z')
  const iso = t => new Date(t).toISOString()
  assert.equal(online.unsavedDaysLeft({ createdAt: iso(now - 40 * day), lastEditedAt: iso(now - 10 * day), lastPlayedAt: null }, now), 20)
  assert.equal(online.unsavedDaysLeft({ createdAt: iso(now - 40 * day), lastEditedAt: iso(now - 10 * day), lastPlayedAt: iso(now - 2 * day) }, now), 28)
  assert.equal(online.unsavedDaysLeft({ createdAt: iso(now - 90 * day), lastEditedAt: iso(now - 90 * day), lastPlayedAt: null }, now), 0)
  const err = (message, code = 'P0001') => ({ message, code })
  assert.equal(online.isPatioConflict(err('PATIO_CONFLICT', '40001')), true)
  assert.match(online.patioErrorMessage(err('PATIO_CONFLICT', '40001')), /outra versão/)
  assert.match(online.patioErrorMessage(err('Could not find the function public.patio_lobby_save', 'PGRST202')), /migração/)
  assert.match(online.patioErrorMessage(new TypeError('Failed to fetch')), /Sem conexão/)
  assert.match(online.patioErrorMessage(err('PATIO_RENAME_FORBIDDEN', '42501')), /padrinho/)
})

test('live player counts reach the Abrir lists through one small store', () => {
  const live = loadTs('lib/pigchicken/patio-live.ts')
  let calls = 0
  const off = live.subscribePatioLiveCounts(() => calls++)
  live.setPatioLiveCounts({ a: 3, default: 1 })
  off()
  live.setPatioLiveCounts({ a: 4 })
  assert.equal(calls, 1)
  assert.deepEqual(live.getPatioLiveCounts(), { a: 4 })
})
