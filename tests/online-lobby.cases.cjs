const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { acceptedFriendNames, roomArrivalNames, roomErrorMessage, isAlreadyInRoom, startedRoomMatch } = loadTs('lib/online/lobby-updates.ts')

const member = (id, name) => ({ user_id: id, profile: { display_name: name } })
const room = (members, id = 'room-a') => ({ id, host_id: 'host', members })
const friend = (status, sender = 'me', id = 'friend-a') => ({ id, sender_id: sender, status, profile: { display_name: 'Fulana' } })

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
