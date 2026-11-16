// The inside of the houses (lib/pigchicken/house-rooms.ts): the room, its door and its storeys, going in and out
// with Usar, and what is fired inside staying in the room (lib/pigchicken/combat.ts).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { houseInterior, houseRoom, houseRooms, atDoor, doorAt, withinRoom, createDoorGate, roomShotWalls, roomFloorSlab, cleanNetHouses } = loadTs('lib/pigchicken/house-rooms.ts')
const { housePreset, houseRoof, HOUSE_STYLES, HOUSE_ROOFS } = loadTs('lib/pigchicken/houses.ts')
const { normalizeElement } = loadTs('lib/pigchicken/layout.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

const house = (extra = {}, el = {}) => normalizeElement({ id: 'house-1', kind: 'house', x: 1000, y: 380, w: 400, h: 550, params: { house: { ...housePreset('cliff', 5), ...extra } }, ...el })

test('the room of every style and roof stays under the roof, between the walls, with the door on its floor', () => {
  for (const style of Object.keys(HOUSE_STYLES)) for (const roof of Object.keys(HOUSE_ROOFS)) for (const floors of [1, 2, 4]) {
    const p = { ...housePreset(style, 7), roof, floors }
    const inside = houseInterior(p)
    assert.ok(inside, `${style} ${roof}`)
    const { room, door } = inside
    for (const [, y] of houseRoof(p)) assert.ok(room.t > y, `${style} ${roof}: the ceiling is under the roof`)
    assert.ok(room.l >= 0 && room.r <= 100 && room.b === 100 && room.b - room.t > 40)
    assert.ok(door.l >= room.l && door.r <= room.r && door.b === room.b && door.t > room.t)
    // one floor for each storey above the ground one, from the top down, never crowded
    assert.ok(inside.floors.length <= floors - 1)
    let last = room.t
    for (const y of inside.floors) { assert.ok(y - last >= 9 && room.b - y >= 9); last = y }
  }
  assert.equal(houseInterior({ ...housePreset('cliff', 5), floors: 2 }).floors.length, 1)
  assert.equal(houseInterior({ ...housePreset('cliff', 5), door: false }), null, 'no door, no way in')
})

test('a house of the layout: its room in the world, and the ones nobody can go into', () => {
  const el = house({ floors: 2 }), room = houseRoom(el)
  const inside = houseInterior(el.params.house)
  assert.equal(room.id, 'house-1')
  assert.equal(room.room.l, 1000 + inside.room.l * 4); assert.equal(room.room.b, 380 + 550)
  assert.equal(room.door.b, 930); assert.equal(room.floors.length, 1)
  assert.ok(room.floors[0] > room.room.t && room.floors[0] < room.room.b)
  assert.equal(houseRoom(house({ door: false })), null)
  assert.equal(houseRoom(house({}, { layer: 'front' })), null, 'in front of the characters')
  assert.equal(houseRoom(house({}, { hidden: true })), null)
  assert.equal(houseRoom({ ...house(), solid: false }), null, 'without its floors')
  assert.equal(houseRoom(house({}, { depth: 0.4 })), null, 'part of the scenery far away')
  assert.equal(houseRooms([el, house({ door: false }, { id: 'house-2' })]).length, 1)
})

test('standing at the door, the nearest door, and still being in the room', () => {
  const room = houseRoom(house()), mid = (room.door.l + room.door.r) / 2
  const body = (x, y) => ({ x, y, scale: 0.5 })
  assert.ok(atDoor(room, body(mid, 930)))
  assert.ok(atDoor(room, body(room.door.l, 930 - 10)), 'a step above')
  assert.ok(!atDoor(room, body(room.door.l - 30, 930)), 'beside it')
  assert.ok(!atDoor(room, body(mid, 930 - 80)), 'in the air or on the floor above')
  const other = { ...room, id: 'house-2', door: { ...room.door, l: room.door.l + 30, r: room.door.r + 30 } }
  assert.equal(doorAt([room, other], body(room.door.l + 5, 930)).id, 'house-1')
  assert.equal(doorAt([room, other], body(other.door.r - 5, 930)).id, 'house-2')
  assert.equal(doorAt([room, other], body(0, 930)), null)
  assert.ok(withinRoom(room, body(room.room.l, room.room.t)))
  assert.ok(!withinRoom(room, body(room.room.l - 400, 930)), 'a portal took her away')
})

test('Usar at the door: one press that began there, never a key held on the way', () => {
  const gate = createDoorGate()
  // held since before she got to the door: nothing
  assert.equal(gate.update(null, true), false)
  assert.equal(gate.update('a', true), false)
  assert.equal(gate.update('a', true), false)
  // let go and pressed at the door: once
  assert.equal(gate.update('a', false), false)
  assert.equal(gate.update('a', true), true)
  assert.equal(gate.update('a', true), false, 'still held')
  // again, to go out
  assert.equal(gate.update('a', false), false)
  assert.equal(gate.update('a', true), true)
  // pressed away from any door
  assert.equal(gate.update(null, false), false)
  assert.equal(gate.update(null, true), false)
  // let go at one door, pressed at another one in the same frame she got there
  assert.equal(gate.update('a', false), false)
  assert.equal(gate.update('b', true), false)
})

test('the walls for what is fired inside and the ground floor under her', () => {
  const room = houseRoom(house()), { boxes, groundY } = roomShotWalls(room), { l, t, r, b } = room.room
  assert.equal(groundY, b)
  const inWall = (x, y) => boxes.some(k => x >= k.l && x <= k.r && y >= k.t && y <= k.b)
  assert.ok(!inWall((l + r) / 2, (t + b) / 2), 'the room itself is free')
  assert.ok(inWall(l - 5, (t + b) / 2) && inWall(r + 5, (t + b) / 2) && inWall((l + r) / 2, t - 5))
  assert.ok(inWall(l - 5, t - 5) && inWall(r + 5, t - 5), 'the corners are closed')
  for (const k of boxes) assert.ok(k.shots === true && k.notes === true && k.solid === true)
  const slab = roomFloorSlab(room)
  assert.equal(slab.t, b); assert.ok(slab.l < l && slab.r > r && slab.b > b)
})

const body = { x: 1200, y: 930, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
const bullet = (x, y, vx, extra = {}) => ({ x, y, vx, vy: 0, dist: 0, damage: 10, pierce: 0, hits: new Set(), size: 4, drop: 0, range: 5000, item: 'pistol', t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0, ...extra })

test('a shot fired inside stops at the wall and touches no enemy outside; outside it is as before', () => {
  const room = houseRoom(house()), shot = { id: room.id, ...roomShotWalls(room) }
  const run = inRoom => {
    const c = createCombat()
    // an enemy in front of the façade, and one beyond the wall
    c.addTarget((room.room.l + room.room.r) / 2 + 60, 930); c.addTarget(room.room.r + 200, 930)
    const hp = c.targets.map(t => t.hp)
    c.bullets.push(bullet((room.room.l + room.room.r) / 2, 880, 900, inRoom ? { room: shot } : {}))
    let lastX = 0
    for (let i = 0; i < 120 && c.bullets.length; i++) { lastX = c.bullets[0].x; c.step(0.016, body, body, body, 0, input, [], 2000, () => {}) }
    return { c, hp, lastX }
  }
  const inside = run(true)
  assert.equal(inside.c.bullets.length, 0, 'it ended')
  assert.ok(inside.lastX <= room.room.r + 20, 'at the wall')
  assert.deepEqual(inside.c.targets.map(t => t.hp), inside.hp, 'nobody outside was hit')
  const outside = run(false)
  assert.ok(outside.c.targets[0].hp < outside.hp[0], 'the same shot outside hits the enemy in front of the house')
})

test('a rocket bursting inside hurts and pushes no enemy outside', () => {
  const room = houseRoom(house()), shot = { id: room.id, ...roomShotWalls(room) }
  for (const inRoom of [true, false]) {
    const c = createCombat()
    c.addTarget(room.room.r + 40, 930)
    const hp = c.targets[0].hp
    c.bullets.push(bullet(room.room.r - 60, 880, 900, { item: 'launcher', explode: 150, explodeDamage: 40, explodePush: 800, ...(inRoom ? { room: shot } : {}) }))
    for (let i = 0; i < 60 && c.bullets.length; i++) c.step(0.016, body, body, body, 0, input, [], 2000, () => {})
    assert.equal(c.bullets.length, 0)
    if (inRoom) { assert.equal(c.targets[0].hp, hp); assert.equal(c.targets[0].blast, undefined) }
    else assert.ok(c.targets[0].hp < hp)
  }
})

test('what a player inside fires and throws carries her room, and nothing does once she is out', () => {
  const room = houseRoom(house()), shot = { id: room.id, ...roomShotWalls(room) }
  const c = createCombat()
  c.give('pistol')
  const fire = { ...input, fire: true, firePressed: true }
  const at = { x: (room.room.l + room.room.r) / 2, y: 880 }
  c.setPlayerRoom('p1', shot)
  c.step(0.016, { ...body, x: at.x }, at, at, 0, fire, [], 2000, () => {})
  assert.ok(c.bullets.length > 0, 'she fired')
  assert.ok(c.bullets.every(b => b.room === shot))
  c.bullets.length = 0
  c.setPlayerRoom('p1', null)
  for (let i = 0; i < 80; i++) c.step(0.016, { ...body, x: at.x }, at, at, 0, input, [], 2000, () => {})
  c.step(0.016, { ...body, x: at.x }, at, at, 0, fire, [], 2000, () => {})
  assert.ok(c.bullets.length > 0 && c.bullets.every(b => b.room === undefined))
})

test("another browser's shots: hidden in a closed house, kept in the room of an open one", () => {
  const room = houseRoom(house()), shot = { id: room.id, ...roomShotWalls(room) }
  const packet = { k: 'b', i: 'pistol', x: 1200, y: 880, vx: 900, vy: 0, sz: 4, dr: 0, rg: 5000, fu: 0, bo: 0, ex: 0, ep: 0, pi: 0 }
  const c = createCombat()
  c.addRemoteShots([packet], () => 'hidden')
  assert.equal(c.bullets.length, 0)
  c.addRemoteShots([packet], () => shot)
  assert.equal(c.bullets.length, 1); assert.equal(c.bullets[0].room, shot)
  c.addRemoteShots([packet], () => null); c.addRemoteShots([packet])
  assert.equal(c.bullets.length, 3); assert.equal(c.bullets[2].room, undefined)
})

test('what a browser says of its players in the houses', () => {
  assert.deepEqual(cleanNetHouses(['house-3', '']), ['house-3', ''])
  assert.deepEqual(cleanNetHouses([]), [])
  assert.equal(cleanNetHouses(['', '', '', '', '']), null)
  assert.equal(cleanNetHouses('x'), null); assert.equal(cleanNetHouses([1]), null); assert.equal(cleanNetHouses(['x'.repeat(81)]), null)
})

test('who is where: a house opens with one of this screen inside, and hides the others in a closed one', () => {
  const { houseRoomsStore, setHouseRoom, setHouseDoors, clearHouseRooms, setNetHouseRooms, clearNetHouseRooms } = loadTs('lib/pigchicken/house-rooms-store.ts')
  let told = 0
  const off = houseRoomsStore.subscribe(() => told++)
  setHouseRoom('p1', 'a')
  assert.equal(houseRoomsStore.roomOf('p1'), 'a'); assert.ok(houseRoomsStore.isOpen('a')); assert.equal(told, 1)
  setHouseRoom('p1', 'a'); assert.equal(told, 1, 'nothing new')
  setNetHouseRooms(7, ['a', 'b'])
  assert.equal(houseRoomsStore.netHidden(7, 0), false, 'in the house that is open here')
  assert.equal(houseRoomsStore.netHidden(7, 1), true, 'in a closed one')
  assert.equal(houseRoomsStore.netHidden(7, 2), false, 'outside')
  setHouseRoom('p2', 'b'); assert.equal(houseRoomsStore.netHidden(7, 1), false)
  setHouseRoom('p1', null); assert.equal(houseRoomsStore.netHidden(7, 0), true); assert.ok(!houseRoomsStore.isOpen('a'))
  setNetHouseRooms(7, ['', '']); assert.equal(houseRoomsStore.netRoom(7, 0), null)
  setNetHouseRooms(7, ['a']); setNetHouseRooms(7, null); assert.equal(houseRoomsStore.netHidden(7, 0), false)
  setHouseDoors(['a']); assert.ok(houseRoomsStore.atDoor('a'))
  const before = told
  setHouseDoors(['a']); assert.equal(told, before, 'the same doors')
  clearHouseRooms(); clearNetHouseRooms()
  assert.equal(houseRoomsStore.roomOf('p2'), null); assert.ok(!houseRoomsStore.atDoor('a')); assert.equal(houseRoomsStore.open.size, 0)
  off()
})
