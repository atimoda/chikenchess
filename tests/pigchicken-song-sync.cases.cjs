const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

// two browsers of the same player: each its own localStorage, one account on a fake server
const stores = { a: new Map(), b: new Map() }
let store = stores.a
global.window = {
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  dispatchEvent: () => true, addEventListener() {}, removeEventListener() {},
}
const lib = loadTs('lib/pigchicken/song-library.ts')
const online = loadTs('lib/pigchicken/song-online.ts')

function server() {
  const rows = new Map()
  return {
    rows,
    async list() { return [...rows.values()].map(r => ({ ownerId: 'u', ownerName: 'Titi', id: r.id, name: r.song.name, revision: r.revision, createdAt: null, updatedAt: null })) },
    async get(id) { const r = rows.get(id); return r ? { info: { id, revision: r.revision }, song: lib.normalizeSong({ ...JSON.parse(JSON.stringify(r.song)), id }) } : null },
    async save(id, song, revision) {
      const r = rows.get(id)
      if ((r?.revision ?? 0) !== revision) throw new Error('SONG_CONFLICT')
      rows.set(id, { id, song: JSON.parse(JSON.stringify(song)), revision: revision + 1 })
      return { revision: revision + 1 }
    },
    async remove(id) { rows.delete(id) },
  }
}
const mine = () => lib.loadLibrary().songs.filter(s => !s.builtin)
const on = k => { store = stores[k] }

test('songs saved here go to the account and come back on another browser', async () => {
  const api = server()
  on('a'); lib.newSong(lib.loadLibrary(), 'Primeira')
  let r = await online.syncSongs('u', api)
  assert.equal(r.sent, 1); assert.equal(api.rows.get('primeira').revision, 1)
  assert.deepEqual(lib.loadPending(), { saved: [], deleted: [] })
  on('b'); r = await online.syncSongs('u', api)
  assert.equal(r.got, 1); assert.deepEqual(mine().map(s => s.name), ['Primeira'])
  // an edit on b reaches a
  const s = mine()[0]
  lib.updateSong(lib.loadLibrary(), { ...s, name: 'Primeira editada' })
  await online.syncSongs('u', api)
  assert.equal(api.rows.get('primeira').revision, 2)
  on('a'); await online.syncSongs('u', api)
  assert.equal(mine()[0].name, 'Primeira editada')
  // nothing new: nothing sent, nothing fetched
  r = await online.syncSongs('u', api)
  assert.deepEqual([r.sent, r.got, r.removed], [0, 0, 0])
})

test('a song deleted on one browser goes from the account and from the other one', async () => {
  const api = server()
  for (const k of ['a', 'b']) { stores[k].clear() }
  on('a'); lib.newSong(lib.loadLibrary(), 'Some'); await online.syncSongs('u', api)
  on('b'); await online.syncSongs('u', api)
  lib.deleteSong(lib.loadLibrary(), 'some')
  await online.syncSongs('u', api)
  assert.equal(api.rows.size, 0)
  on('a'); await online.syncSongs('u', api)
  assert.deepEqual(mine(), [])
})

test('changed here and on another browser: the account wins and this one stays as a copy', async () => {
  const api = server()
  for (const k of ['a', 'b']) { stores[k].clear() }
  on('a'); lib.newSong(lib.loadLibrary(), 'Briga'); await online.syncSongs('u', api)
  on('b'); await online.syncSongs('u', api)
  lib.updateSong(lib.loadLibrary(), { ...mine()[0], intro: 'de b' }); await online.syncSongs('u', api)
  on('a'); lib.updateSong(lib.loadLibrary(), { ...mine()[0], intro: 'de a' })
  const r = await online.syncSongs('u', api)
  assert.deepEqual(r.copies, ['Briga (este aparelho)'])
  const byName = Object.fromEntries(mine().map(s => [s.name, s]))
  assert.equal(byName['Briga'].intro, 'de b'); assert.equal(byName['Briga (este aparelho)'].intro, 'de a')
  assert.equal(api.rows.size, 2, 'the copy is in the account too')
})
