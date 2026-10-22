const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { acceptedFriendNames, applyDirectoryChange, roomArrivalNames, roomErrorMessage, isAlreadyInRoom, startedRoomMatch, yourTurnGameOpponents } = loadTs('lib/online/lobby-updates.ts')

const member = (id, name) => ({ user_id: id, profile: { display_name: name } })
const room = (members, id = 'room-a') => ({ id, host_id: 'host', members })
const friend = (status, sender = 'me', id = 'friend-a') => ({ id, sender_id: sender, status, profile: { display_name: 'Fulana' } })
const game = (id, turn, color = 'w', name = 'Rival') => ({ id, turn, color, opponent: { display_name: name } })

test('recovering a playing room never opens a game; only an observed lobby start does', () => {
  const lobby = { ...room([member('host', 'Anfitrião'), member('guest', 'Fulano')]), status: 'open', match_id: null }
  const playing = { ...lobby, status: 'playing', match_id: 'match-a' }
  assert.equal(startedRoomMatch(null, playing, 'host'), null)
  assert.equal(startedRoomMatch(playing, playing, 'host'), null)
  assert.equal(startedRoomMatch(lobby, playing, 'host'), 'match-a')
  assert.equal(startedRoomMatch(lobby, playing, 'guest'), 'match-a')
  assert.equal(startedRoomMatch(lobby, playing, 'outsider'), null)
  assert.equal(startedRoomMatch(lobby, playing, null), null)
  assert.equal(startedRoomMatch(lobby, { ...playing, id: 'room-b' }, 'host'), null)
  assert.equal(startedRoomMatch({ ...lobby, members: [] }, playing, 'host'), null)
  assert.equal(startedRoomMatch(lobby, { ...playing, members: [] }, 'host'), null)
  assert.equal(startedRoomMatch(lobby, { ...playing, status: 'closed' }, 'host'), null)
})

test('opening or recovering a full room establishes a baseline without announcing old arrivals', () => {
  const full = room([member('host', 'Anfitrião'), member('guest', 'Fulano')])
  assert.deepEqual(roomArrivalNames(null, full, 'host'), [])
  assert.deepEqual(roomArrivalNames(room([], 'room-b'), full, 'host'), [])
})

test('a new member announces their current name to the host once; refetch and kit updates stay silent', () => {
  const alone = room([member('host', 'Anfitrião')])
  const full = room([...alone.members, member('guest', 'Fulano')])
  assert.deepEqual(roomArrivalNames(alone, full, 'host'), ['Fulano'])
  assert.deepEqual(roomArrivalNames(full, full, 'host'), [])
  assert.deepEqual(roomArrivalNames(full, { ...full, members: full.members.map(m => ({ ...m, city_id: 'tokyo' })) }, 'host'), [])
})

test('the arriving guest does not receive a host arrival alert, but a later re-entry announces again', () => {
  const alone = room([member('host', 'Anfitrião')])
  const full = room([...alone.members, member('guest', 'Fulano')])
  assert.deepEqual(roomArrivalNames(alone, full, 'guest'), [])
  assert.deepEqual(roomArrivalNames(full, alone, 'host'), [])
  assert.deepEqual(roomArrivalNames(alone, full, 'host'), ['Fulano'])
})

test('initial friendship history and refetch do not announce old acceptances', () => {
  assert.deepEqual(acceptedFriendNames(null, [friend('accepted')], 'me'), [])
  assert.deepEqual(acceptedFriendNames([friend('accepted')], [friend('accepted')], 'me'), [])
})

test('only acceptance of the current sender pending request announces; a new request or cancellation stays silent', () => {
  assert.deepEqual(acceptedFriendNames([friend('pending')], [friend('accepted')], 'me'), ['Fulana'])
  assert.deepEqual(acceptedFriendNames([friend('pending', 'other')], [friend('accepted', 'other')], 'me'), [])
  assert.deepEqual(acceptedFriendNames([], [friend('pending')], 'me'), [])
  assert.deepEqual(acceptedFriendNames([friend('pending')], [], 'me'), [])
  assert.deepEqual(acceptedFriendNames([friend('pending')], [friend('accepted', 'me', 'different-request')], 'me'), [])
})

test('yourTurnGameOpponents announces only when a game transitions to the player turn and is not currently visible', () => {
  assert.deepEqual(yourTurnGameOpponents(null, [game('m1', 'w', 'w', 'Cicлана')]), [])
  assert.deepEqual(yourTurnGameOpponents([game('m1', 'w', 'w', 'Cicлана')], [game('m1', 'w', 'w', 'Cicлана')]), [])
  assert.deepEqual(yourTurnGameOpponents([game('m1', 'b', 'w', 'Cicлана')], [game('m1', 'w', 'w', 'Cicлана')]), ['Cicлана'])
  assert.deepEqual(yourTurnGameOpponents([game('m1', 'b', 'w', 'Cicлана')], [game('m1', 'w', 'w', 'Cicлана')], 'm1'), [])
  assert.deepEqual(yourTurnGameOpponents([], [game('m2', 'b', 'b', 'Beltrano')]), ['Beltrano'])
})

test('different-room conflicts receive visible guidance without hiding other errors', () => {
  const conflict = { code: 'P0001', message: 'ALREADY_IN_ROOM' }
  assert.equal(isAlreadyInRoom(conflict), true)
  assert.match(roomErrorMessage(conflict), /switch automatically|trocar automaticamente/)
  assert.match(roomErrorMessage({ message: 'ACTIVE_MATCH' }), /game in progress|partida em andamento/)
  assert.match(roomErrorMessage({ message: 'ROOM_FULL' }), /two players|dois participantes/)
  assert.match(roomErrorMessage({ message: 'ROOM_CLOSED' }), /closed|encerrada/)
  assert.match(roomErrorMessage({ message: 'ROOM_NOT_FOUND' }), /Room not found|Confira o código/)
  assert.match(roomErrorMessage({ message: 'INVALID_KIT' }), /kit is not available/)
  assert.equal(roomErrorMessage({ message: 'Network failure' }), null)
  assert.equal(isAlreadyInRoom(null), false)
})

test('public directory applies Realtime rows in place without re-reading the list', () => {
  const a = { room_id: 'a', code: 'A', creator_name: 'Ana', players: 0, created_at: '2026-10-21T10:00:00Z' }
  const b = { room_id: 'b', code: 'B', creator_name: 'Bia', players: 1, created_at: '2026-10-21T09:00:00Z' }
  let rooms = [a, b]
  rooms = applyDirectoryChange(rooms, { kind: 'upsert', room: { room_id: 'c', code: 'C', creator_name: 'Caio', players: 0 } })
  assert.deepEqual(rooms.map(r => r.code), ['C', 'A', 'B'])
  rooms = applyDirectoryChange(rooms, { kind: 'upsert', room: { room_id: 'b', code: 'B', creator_name: 'Bia', players: 0 } })
  assert.deepEqual(rooms.map(r => [r.code, r.players]), [['C', 0], ['A', 0], ['B', 0]])
  assert.equal(rooms[2].created_at, b.created_at)
  rooms = applyDirectoryChange(rooms, { kind: 'delete', room_id: 'a' })
  assert.deepEqual(rooms.map(r => r.code), ['C', 'B'])
  const many = Array.from({ length: 50 }, (_, i) => ({ room_id: `r${i}`, code: `R${i}`, creator_name: 'x', players: 0 }))
  assert.equal(applyDirectoryChange(many, { kind: 'upsert', room: { room_id: 'new', code: 'N', creator_name: 'y', players: 0 } }).length, 50)
})

test('online availability hides online entry points when Supabase refuses the probe', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-key'
  const previousWindow = globalThis.window, previousFetch = globalThis.fetch
  globalThis.window = {}
  const requests = []
  try {
    globalThis.fetch = async (url, init) => { requests.push([url, init.headers.apikey]); return { ok: false, status: 402 } }
    const availability = loadTs('lib/online/availability.ts')
    assert.equal(availability.getOnlineAvailability(), 'checking')
    const seen = []
    const unsubscribe = availability.subscribeOnlineAvailability(next => seen.push(next))
    assert.equal(await availability.checkOnlineAvailability(), 'unavailable')
    assert.deepEqual(requests, [['https://example.supabase.co/rest/v1/online_public_rooms?select=room_id&limit=1', 'public-key']])
    assert.equal(await availability.checkOnlineAvailability(), 'unavailable', 'a fresh result is reused')
    assert.equal(requests.length, 1)
    globalThis.fetch = async () => ({ ok: true, status: 200 })
    assert.equal(await availability.checkOnlineAvailability(true), 'available')
    globalThis.fetch = async () => { throw new TypeError('network down') }
    assert.equal(await availability.checkOnlineAvailability(true), 'unavailable')
    assert.deepEqual(seen, ['unavailable', 'available', 'unavailable'])
    unsubscribe()
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})
