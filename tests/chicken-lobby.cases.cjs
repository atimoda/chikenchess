const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const L = loadTs('lib/chicken/lobby.ts')
const D = loadTs('lib/chicken/input-devices.ts')
const { defaultChickenControls } = loadTs('lib/chicken/controls.ts')

const start = (devices = ['kb1', 'kb2', 'mouse']) => L.createLobby({ name: 'Titi' }, devices, 1000)
const ok = r => { assert.equal(r.ok, true, r.reason); return r.state }

test('the first player gets every device and owns the lobby, alone in the editors', () => {
  const s = start(['pad0', 'kb2', 'mouse', 'kb1'])
  assert.equal(s.players.length, 1)
  assert.deepEqual(s.players[0].inputs, ['kb1', 'kb2', 'mouse', 'pad0'])
  assert.equal(s.ownerId, s.players[0].id)
  assert.deepEqual(s.editors, [s.players[0].id])
})

test('adding a local player moves a spare device to them: a gamepad first, then the secondary keyboard', () => {
  let s = start(['kb1', 'kb2', 'mouse', 'pad0'])
  const r2 = L.addLocalPlayer(s, 2000); s = ok(r2)
  assert.equal(r2.player.name, 'Player 2')
  assert.deepEqual(r2.player.inputs, ['pad0'])
  const r3 = L.addLocalPlayer(s, 3000); s = ok(r3)
  assert.deepEqual(r3.player.inputs, ['kb2'])
  assert.deepEqual(s.players[0].inputs, ['kb1', 'mouse'])
  // nothing spare: the chicken arrives but stands still
  const r4 = L.addLocalPlayer(s, 4000); s = ok(r4)
  assert.deepEqual(r4.player.inputs, [])
  assert.equal(r4.player.name, 'Player 4')
})

test('at most 13 players per lobby', () => {
  let s = start()
  for (let i = 0; i < 12; i++) s = ok(L.addLocalPlayer(s, 2000 + i))
  assert.equal(s.players.length, L.LOBBY_MAX)
  const r = L.addLocalPlayer(s, 9000)
  assert.equal(r.ok, false)
  assert.equal(r.state.players.length, 13)
})

test('only the owner removes players, never themselves, and the removed devices go back to player 1', () => {
  let s = start(['kb1', 'kb2'])
  const r2 = L.addLocalPlayer(s, 2000); s = ok(r2)
  const p1 = s.players[0].id, p2 = r2.player.id
  assert.equal(L.removePlayer(s, p2, p1).ok, false)
  assert.equal(L.removePlayer(s, p1, p1).ok, false)
  s = ok(L.removePlayer(s, p1, p2))
  assert.equal(s.players.length, 1)
  assert.deepEqual(s.players[0].inputs, ['kb1', 'kb2'])
})

test('Edit mode: only the owner edits by default and changes who may; a new owner resets it to only them', () => {
  let s = start()
  s = ok(L.addLocalPlayer(s, 2000)); s = ok(L.addLocalPlayer(s, 3000))
  const [a, b, c] = s.players.map(p => p.id)
  assert.equal(L.canEditPatio(s, b), false)
  assert.equal(L.setEditor(s, b, c, true).ok, false)
  s = ok(L.setEditor(s, a, b, true)); s = ok(L.setEditor(s, a, c, true))
  assert.deepEqual(s.editors.sort(), [a, b, c].sort())
  // the owner can not take the permission from themselves
  s = ok(L.setEditor(s, a, a, false))
  assert.equal(L.canEditPatio(s, a), true)
  // the owner leaves with others still there: the oldest one left owns it, and only they edit
  s = L.leavePlayer(s, a)
  assert.equal(s.ownerId, b)
  assert.deepEqual(s.editors, [b])
})

test('bots never own a lobby', () => {
  const s = start()
  const bot = { id: 'bot-1', kind: 'bot', name: 'Bot', joinedAt: 1, inputs: [] }
  const next = L.reconcileOwner({ ...s, players: [bot, ...s.players] })
  assert.equal(next.ownerId, s.players[0].id)
})

test('a device goes to one local player at a time; online players keep theirs', () => {
  let s = start(['kb1', 'kb2', 'pad0'])
  const r2 = L.addLocalPlayer(s, 2000); s = ok(r2)
  s = ok(L.assignDevice(s, 'kb2', r2.player.id))
  assert.deepEqual(s.players[0].inputs, ['kb1'])
  assert.deepEqual(r2.player.inputs.length, 1)
  assert.deepEqual(s.players[1].inputs, ['kb2', 'pad0'])
  const online = { id: 'o1', kind: 'online', name: 'Amiga', joinedAt: 5000, inputs: [], inputLabel: 'Gamepad' }
  assert.equal(L.assignDevice({ ...s, players: [...s.players, online] }, 'kb1', 'o1').ok, false)
})

test('new devices: all to the only player; with more, to the first one standing still', () => {
  let s = start(['kb1'])
  s = L.adoptDevices(s, ['kb1', 'pad1'])
  assert.deepEqual(s.players[0].inputs, ['kb1', 'pad1'])
  const r2 = L.addLocalPlayer(s, 2000); s = ok(r2)
  assert.deepEqual(r2.player.inputs, ['pad1'])
  const r3 = L.addLocalPlayer(s, 3000); s = ok(r3)
  assert.deepEqual(r3.player.inputs, [])
  s = L.adoptDevices(s, ['kb1', 'pad1', 'pad2'])
  assert.deepEqual(s.players[2].inputs, ['pad2'])
})

test('the lobby switcher walks the public lobbies in the order they opened, wrapping around', () => {
  const list = [{ id: 'b', createdAt: 2, players: 1 }, { id: 'a', createdAt: 1, players: 13 }, { id: 'c', createdAt: 3, players: 2 }]
  assert.equal(L.neighbourLobby(list, 'a', 1).id, 'b')
  assert.equal(L.neighbourLobby(list, 'a', -1).id, 'c')
  assert.equal(L.neighbourLobby(list, 'c', 1).id, 'a')
  assert.equal(L.neighbourLobby([], 'a', 1), null)
  assert.equal(L.neighbourLobby([list[0]], 'b', 1), null)
})

test('keyboards: the primary and the secondary drive different keys', () => {
  const c = defaultChickenControls()
  const kb1 = D.keyTokensFor(c, 'jump', ['kb1']), kb2 = D.keyTokensFor(c, 'jump', ['kb2'])
  assert.ok(kb1.includes('Key:Space'))
  assert.ok(!kb2.includes('Key:Space'))
  assert.ok(kb2.includes('Key:PageUp'))
  assert.ok(D.keyTokensFor(c, 'left', ['kb2']).includes('Key:ArrowLeft'))
  assert.ok(!D.keyTokensFor(c, 'left', ['kb1']).includes('Key:ArrowLeft'))
  // a player with nothing has no key; the globe (null) has all of them
  assert.deepEqual(D.keyTokensFor(c, 'jump', []), [])
  assert.ok(D.keyTokensFor(c, 'left', null).includes('Key:KeyA'))
  assert.ok(D.keyTokensFor(c, 'left', null).includes('Key:ArrowLeft'))
  // once controls have their own secondary column, it is the one used
  const withKeys2 = { ...c, keys2: { ...Object.fromEntries(Object.keys(c.keys).map(k => [k, [null, null]])), jump: ['Key:Numpad0', null] } }
  assert.deepEqual(D.keyTokensFor(withKeys2, 'jump', ['kb2']), ['Key:Numpad0'])
})

test('the switcher only goes through public lobbies online with someone playing', () => {
  const list = [
    { id: 'a', createdAt: 1, players: 2 },
    { id: 'b', createdAt: 2, players: 0 },
    { id: 'c', createdAt: 3, players: 3, status: 'offline' },
    { id: 'd', createdAt: 4, players: 1, visibility: 'private' },
    { id: 'e', createdAt: 5, players: 4 },
  ]
  assert.equal(L.neighbourLobby(list, 'a', 1).id, 'e')
  assert.equal(L.neighbourLobby(list, 'e', 1).id, 'a')
})

test('switching lobby takes every local player along; the oldest player there stays the owner', () => {
  let s = start(['kb1', 'kb2'])
  s = ok(L.addLocalPlayer(s, 2000))
  const host = { id: 'h', kind: 'online', name: 'Host', joinedAt: 10, inputs: [] }
  const next = L.moveLocalsTo(s, { id: 'other', createdAt: 5, roster: [host] }, 50000)
  assert.equal(next.id, 'other')
  assert.equal(next.players.length, 3)
  assert.equal(next.ownerId, 'h')
  assert.deepEqual(next.editors, ['h'])
  assert.deepEqual(next.players.filter(p => p.kind === 'local').map(p => p.inputs), [['kb1'], ['kb2']])
})

test('the last online player leaving takes the lobby offline; it comes back only when made public', () => {
  let s = { ...start(), mode: 'online', visibility: 'public', status: 'online' }
  s = L.leavePlayer(s, s.players[0].id)
  assert.equal(s.status, 'offline')
  assert.equal(s.visibility, 'private')
  const back = L.createLobby({ name: 'X' }, ['kb1'], 9000, 'online')
  const reopened = ok(L.setPublic({ ...back, id: s.id, status: 'offline' }, back.players[0].id, true))
  assert.equal(reopened.status, 'online')
  assert.equal(reopened.visibility, 'public')
})

test('editing follows the Pátio in any mode: admin, its creator, or who the owner marked; the default Pátio only the admin', () => {
  let s = L.createLobby({ name: 'Titi', userId: 'u1' }, ['kb1', 'kb2'], 1000, 'local')
  s = ok(L.addLocalPlayer(s, 2000))
  const [p1, p2] = s.players.map(p => p.id)
  assert.equal(L.canUseEditor(s, p1), false)
  assert.equal(L.canUseEditor(s, p1, { isAdmin: true }), true)
  const mine = { ...s, creatorId: 'u1' }
  assert.equal(L.canUseEditor(mine, p1), true)
  assert.equal(L.canUseEditor(mine, p2), false)
  assert.equal(L.canUseEditor(ok(L.setEditor(mine, p1, p2, true)), p2), true)
  assert.equal(L.canUseEditor({ ...s, creatorId: 'someone-else' }, p2), false)
})

test('the owner removes anyone except themselves, the creator and the padrinho', () => {
  const s0 = L.createLobby({ name: 'Fulano', userId: 'f' }, ['kb1'], 1000, 'online')
  const creator = { id: 'c', kind: 'online', name: 'Criador', joinedAt: 2000, inputs: [], userId: 'u-c' }
  const padrinho = { id: 'g', kind: 'online', name: 'Padrinho', joinedAt: 3000, inputs: [], userId: 'u-g' }
  const other = { id: 'o', kind: 'online', name: 'Outro', joinedAt: 4000, inputs: [], userId: 'u-o' }
  const s = { ...s0, creatorId: 'u-c', godparentId: 'u-g', players: [...s0.players, creator, padrinho, other] }
  const me = s0.players[0].id
  assert.equal(L.removePlayer(s, me, 'c').ok, false)
  assert.equal(L.removePlayer(s, me, 'g').ok, false)
  assert.equal(L.removePlayer(s, me, 'o').ok, true)
})

test('each player gets a color of their own, kept while they stay; a newcomer takes the first free one', () => {
  let s = start(['kb1', 'kb2'])
  assert.equal(s.players[0].color, L.PLAYER_COLORS[0])
  const r2 = L.addLocalPlayer(s, 2000); s = ok(r2)
  const r3 = L.addLocalPlayer(s, 3000); s = ok(r3)
  assert.deepEqual(s.players.map(p => p.color), L.PLAYER_COLORS.slice(0, 3))
  s = ok(L.removePlayer(s, s.players[0].id, r2.player.id))
  assert.equal(s.players[1].color, L.PLAYER_COLORS[2])
  const r4 = L.addLocalPlayer(s, 4000); s = ok(r4)
  assert.equal(s.players.find(p => p.id === r4.player.id).color, L.PLAYER_COLORS[1])
  assert.equal(new Set(L.PLAYER_COLORS).size, L.LOBBY_MAX)
  // arriving in another lobby: a color already taken there goes to the first free one
  const host = { id: 'h', kind: 'online', name: 'Host', joinedAt: 10, inputs: [], color: L.PLAYER_COLORS[0] }
  const next = L.moveLocalsTo(s, { id: 'x', createdAt: 5, roster: [host] }, 9000)
  assert.equal(new Set(next.players.map(p => p.color)).size, next.players.length)
  assert.equal(next.players[0].color, L.PLAYER_COLORS[0])
})
