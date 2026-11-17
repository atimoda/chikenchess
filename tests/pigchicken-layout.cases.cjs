const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const world = loadTs('lib/pigchicken/world.ts')
const L = loadTs('lib/pigchicken/layout.ts')
const H = loadTs('lib/pigchicken/houses.ts')
const T = loadTs('lib/pigchicken/trampoline.ts')

test('trampoline saves its strength and aim and uses only a one-way landing surface', () => {
  const el = L.createElement('trampoline', 500, world.WORLD_GROUND_Y - 28)
  assert.deepEqual(el.params.trampoline, { strength: 3, angle: 0 })
  assert.equal(el.y + el.h, world.WORLD_GROUND_Y)
  assert.deepEqual(L.layoutBoxes([el]), [])
  assert.equal(L.layoutFloorBelow([el], 500, el.y - 50), el.y)
  const layout = L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [
    { ...el, rot: 45, solid: false, notes: true, params: { trampoline: { strength: 9, angle: -70 } } },
  ] })
  const [saved] = layout.elements
  assert.equal(saved.rot, 0)
  assert.deepEqual(saved.params.trampoline, { strength: 5, angle: -35 })
  assert.equal(L.layoutBoxes([saved])[0].notes, true)
  assert.equal(L.layoutBoxes([saved])[0].solid, false)
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(layout))), layout)
})

test('trampoline levels have distinct pads and increasing height with symmetric aim', () => {
  const gravity = 1200
  const levels = T.TRAMPOLINE_LEVELS
  assert.equal(levels.length, 5)
  assert.equal(new Set(levels.map(level => level.pad)).size, 5)
  levels.forEach(({ height }, index) => {
    const { vx, vy } = T.trampolineVelocity({ strength: index + 1, angle: 0 }, gravity)
    assert.equal(vx, 0)
    assert.ok(vy < 0)
    assert.ok(Math.abs(vy ** 2 / (2 * gravity) - height) < 1e-8)
    if (index > 0) assert.ok(height > levels[index - 1].height)
  })
  const left = T.trampolineVelocity({ strength: 3, angle: -25 }, gravity)
  const right = T.trampolineVelocity({ strength: 3, angle: 25 }, gravity)
  assert.ok(right.vx > 0)
  assert.equal(left.vx, -right.vx)
  assert.equal(left.vy, right.vy)
})

test('the default layout is the Pátio the code always drew: same platform boxes and ids', () => {
  const lay = L.defaultLayout()
  const plat = lay.elements.filter(e => e.kind === 'platform' || e.kind === 'pillar')
  const old = world.worldPlatforms(L.LAYOUT_MAX_SCREENS)
  assert.equal(plat.length, old.length)
  old.forEach(p => {
    const e = plat.find(x => x.id === p.id)
    assert.ok(e, p.id)
    assert.deepEqual({ x: e.x, y: e.y, w: e.w, h: e.h }, { x: p.x, y: p.y, w: p.w, h: p.h })
    assert.equal(e.solid, true); assert.equal(e.shots, true); assert.equal(e.notes, false); assert.equal(e.layer, 'scene')
  })
  // trees in front, half see-through, never solid; racks, horde buttons and five dummies with their tips
  // (the Templo do Gongo's own elements apart: see the v12 test)
  const own = lay.elements.filter(e => !e.id.startsWith('temple-'))
  const trees = own.filter(e => e.kind === 'pine' || e.kind === 'blossom')
  assert.equal(trees.length, L.defaultTrees(L.LAYOUT_MAX_SCREENS).length)
  trees.forEach(t => { assert.equal(t.layer, 'frontGhost'); assert.equal(t.solid, false) })
  // 8 weapons, 9 instruments (the Hangdrum at the end of the shelf), the 2 consumables (Maryjane, Cok) and the Gaiola básica
  assert.equal(own.filter(e => e.kind === 'rack').length, 20)
  assert.equal(lay.elements.filter(e => e.kind === 'button').length, 4)
  const dummies = lay.elements.filter(e => e.kind === 'dummy')
  assert.equal(dummies.length, 5)
  dummies.forEach(d => { assert.ok(d.params.message.length > 0); assert.equal(d.y + d.h, world.WORLD_GROUND_Y) })
  // the code's Pátio is all 8 screens wide; a narrower world hides what is past its end (the Vila's last scene)
  assert.equal(lay.settings.screens, L.LAYOUT_MAX_SCREENS)
  assert.ok(lay.elements.every(e => !e.region))
  assert.ok(L.elementsInWorld(lay, 1).every(e => e.depth || e.x + e.w / 2 < world.worldScenes(1) * world.SCENE_W))
})

test('layouts from storage are cleaned: unknown kinds dropped, turns snapped, the game things never turn or collide', () => {
  const lay = L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [
    { kind: 'castle', x: 0, y: 0 },
    { id: 'a', kind: 'platform', x: 10, y: 20, w: 3, h: 50, rot: 50, layer: 'nowhere', solid: false, notes: true, opacity: 3 },
    { id: 'a', kind: 'dummy', x: 0, y: 0, w: 46, h: 112, rot: 90, layer: 'front', solid: true, params: { message: 'x'.repeat(400), maxHp: 99999 } },
    { id: 'r', kind: 'rack', params: { item: 'banana' } },
  ] })
  assert.equal(lay.elements.length, 4)
  assert.equal(lay.elements[3].kind, 'entry')
  const [p, d, r] = lay.elements
  assert.equal(p.rot, 45); assert.equal(p.layer, 'scene'); assert.equal(p.w, L.ELEMENT_DEFS.platform.minW); assert.equal(p.solid, false); assert.equal(p.notes, true); assert.equal(p.opacity, 1)
  assert.notEqual(d.id, 'a') // duplicate ids get a new one
  assert.equal(d.rot, 0); assert.equal(d.layer, 'scene'); assert.equal(d.solid, false)
  assert.equal(d.params.message.length, 280); assert.equal(d.params.maxHp, 1000)
  assert.equal(r.params.item, 'pistol')
  assert.equal(L.normalizeLayout({ nope: 1 }), null)
})

test('turned elements: 90° swaps the box, 45° is a ramp whose upper edges are floors', () => {
  const el = { x: 0, y: 0, w: 200, h: 40, rot: 90 }
  assert.deepEqual(L.elementBounds(el), { x: 80, y: -80, w: 40, h: 200 })
  assert.equal(L.elementFloorLine(el), null)
  const ramp = { x: 0, y: 0, w: 200, h: 40, rot: 45 }
  const b = L.elementBounds(ramp)
  assert.ok(Math.abs(b.w - b.h) < 0.01 && Math.abs(b.w - 240 / Math.SQRT2) < 0.01)
  const pts = L.elementFloorLine(ramp).split(' ').map(p => p.split(',').map(Number))
  assert.equal(pts.length, 3)
  // from the left edge over the top to the right edge
  assert.ok(Math.abs(pts[0][0]) < 0.11 && Math.abs(pts[2][0] - b.w) < 0.11 && Math.abs(pts[1][1]) < 0.11)
})

test('combat boxes follow each element\'s collisions', () => {
  const mk = (o) => L.normalizeElement({ kind: 'platform', x: 0, y: 100, w: 100, h: 20, ...o })
  const boxes = L.layoutBoxes([mk({ id: 'p' }), mk({ id: 'g', solid: false, shots: false }), mk({ id: 'n', solid: false, shots: false, notes: true }), L.normalizeElement({ kind: 'dummy', x: 0, y: 0 })])
  assert.equal(boxes.length, 2)
  assert.deepEqual(boxes.map(b => [b.solid, b.shots, b.notes]), [[true, true, false], [false, false, true]])
})

test('a new element is centred where it was dropped, with its kind\'s defaults', () => {
  const e = L.createElement('pine', 1000, 500)
  assert.equal(e.x + e.w / 2, 1000); assert.equal(e.y + e.h / 2, 500)
  assert.equal(e.layer, 'frontGhost'); assert.ok(Number.isInteger(e.params.seed))
  const rack = L.createElement('rack', 0, 0, { item: 'violin' })
  assert.equal(rack.params.item, 'violin')
})

test('gravity: an element falls onto the solid element under it, or the ground, and stacks settle in one pass', () => {
  const G = world.WORLD_GROUND_Y
  const base = L.createElement('platform', 500, G - 24) // resting on the ground
  const shelf = { ...L.createElement('platform', 500, 300), id: 'shelf' }
  const box = { ...L.createElement('platform', 520, 100), id: 'box', w: 40, h: 40, gravity: true }
  const top = { ...L.createElement('platform', 520, 0), id: 'top', w: 40, h: 40, gravity: true }
  const away = { ...L.createElement('pine', 3000, 100), id: 'tree', gravity: true }
  const out = L.settleLayout([base, shelf, top, box, away])
  const by = id => out.find(e => e.id === id)
  const shelfTop = shelf.y
  assert.equal(by('box').y + 40, shelfTop) // onto the shelf
  assert.equal(by('top').y + 40, by('box').y) // onto the box that fell first
  assert.equal(by('tree').y + by('tree').h, G) // nothing under it: the ground
  assert.equal(by('shelf').y, shelf.y) // without gravity nothing moves
  // the one being dragged stays where it is
  assert.equal(L.settleLayout([shelf, box], 'box').find(e => e.id === 'box').y, box.y)
  // on a 45° ramp it rests on the slope's highest point under it
  const ramp = { ...L.createElement('platform', 1200, 600), id: 'ramp', w: 300, h: 40, rot: 45 }
  const rb = L.elementBounds(ramp)
  const onRamp = L.settleLayout([ramp, { ...box, x: rb.x + rb.w / 2 - 20, y: 0 }]).find(e => e.id === 'box')
  assert.ok(onRamp.y + 40 > rb.y && onRamp.y + 40 < rb.y + rb.h)
  // the flag survives normalizing
  assert.equal(L.normalizeElement(box).gravity, true)
  assert.equal(L.normalizeElement({ ...box, gravity: false }).gravity, undefined)
})

test('a layout saved before the consumables gets their racks once; one that already has them (or is v2) does not', () => {
  const old = L.normalizeLayout({ v: 1, elements: [{ id: 'r', kind: 'rack', params: { item: 'maryjane' } }] })
  const items = old.elements.filter(e => e.kind === 'rack' && !e.id.startsWith('temple-')).map(e => e.params.item)
  assert.deepEqual(items.sort(), ['cok', 'maryjane'])
  assert.equal(old.v, L.LAYOUT_VERSION)
  const cok = old.elements.find(e => e.params.item === 'cok')
  assert.equal(cok.y + cok.h, world.WORLD_GROUND_Y)
  // saved again (v2), a rack the editor removed stays removed
  const again = L.normalizeLayout({ ...old, elements: old.elements.filter(e => e.params.item !== 'cok') })
  assert.equal(again.elements.filter(e => e.kind === 'rack' && !e.id.startsWith('temple-')).length, 1)
  // a rack can hold a consumable
  assert.equal(L.createElement('rack', 0, 0, { item: 'cok' }).params.item, 'cok')
})

test('inserting a portal creates two independently positioned, linked non-solid entrances', () => {
  const [a,b] = L.createPortalPair(300,400)
  assert.notEqual(a.id,b.id)
  assert.equal(a.params.portalPairId,b.params.portalPairId)
  assert.equal(b.x-a.x,240)
  assert.equal(a.params.portalInstruction,'hover')
  for (const p of [a,b]) { assert.equal(p.kind,'portal'); assert.equal(p.solid,false); assert.equal(p.shots,false) }
  assert.equal(L.portalPartner(a,[a,b]),b)
  b.x+=500; b.y-=250
  assert.equal(L.portalPartner(a,[a,b]),b)
  assert.equal(L.portalPartner(a,[a]),null)
  assert.deepEqual(L.layoutBoxes([a,b]),[])
})

test('portal pairs and instruction settings survive save/load, without accepting invalid links or modes', () => {
  const [a,b]=L.createPortalPair(100,600)
  a.params.portalLabel='Ir para o alto'
  a.params.portalInstruction='always'
  const layout=L.normalizeLayout(JSON.parse(JSON.stringify({v:L.LAYOUT_VERSION,elements:[a,b]})))
  assert.equal(layout.elements[0].params.portalLabel,'Ir para o alto')
  assert.equal(layout.elements[0].params.portalInstruction,'always')
  assert.equal(L.portalPartner(layout.elements[0],layout.elements).id,b.id)
  const invalid=L.normalizeElement({...a,w:1000,h:500,rot:45,solid:true,params:{portalPairId:123,portalLabel:'x'.repeat(200),portalInstruction:'bad'}})
  assert.equal(invalid.params.portalPairId,'')
  assert.equal(invalid.params.portalLabel.length,100)
  assert.equal(invalid.params.portalInstruction,'hover')
  assert.equal(invalid.w,150);assert.equal(invalid.h,150);assert.equal(invalid.rot,0);assert.equal(invalid.solid,false)
})

test('duplicating a portal copies its entire pair into a new independent link, preserving settings', () => {
  const pair=L.createPortalPair(300,400)
  pair[1].x+=600;pair[1].params.portalLabel='Voltar'
  const copy=L.duplicatePortalPair(pair[0],pair)
  assert.equal(copy.length,2)
  assert.notEqual(copy[0].params.portalPairId,pair[0].params.portalPairId)
  assert.equal(copy[0].params.portalPairId,copy[1].params.portalPairId)
  assert.equal(copy[1].x-copy[0].x,pair[1].x-pair[0].x)
  assert.equal(copy[1].params.portalLabel,'Voltar')
  assert.equal(L.portalPartner(copy[0],[...pair,...copy]).id,copy[1].id)
  copy[1].params.portalLabel='Outro'
  assert.equal(pair[1].params.portalLabel,'Voltar')
})

test('a legacy default gains the demo once, at the world x it had, and it stays there at every width', () => {
  const raw = { v: 2, elements: [{ id: 'kept', kind: 'platform', x: 200 }] }
  const personal = L.normalizeLayout(raw)
  assert.deepEqual(personal.elements.filter(e => e.kind !== 'portal' && e.kind !== 'entry' && !e.id.startsWith('temple-')).map(e => e.id), ['village-ground', 'kept'])
  const defaultPatio = L.normalizeLayout(raw, true)
  // saved without a width: the one it was shown at (the game's default here) becomes its own
  assert.equal(defaultPatio.settings.screens, 4)
  const demo = defaultPatio.elements.filter(e => e.kind === 'house')
  assert.ok(demo.length > 0)
  const village = world.villageScene(4) * world.SCENE_W
  demo.forEach(h => { assert.equal(h.region, undefined); assert.ok(h.x + h.w / 2 >= village && h.x + h.w / 2 < village + world.SCENE_W) })
  for (const screens of [4, 8]) {
    const projected = L.elementsInWorld(defaultPatio, screens).filter(e => e.kind === 'house')
    assert.equal(projected.length, demo.length)
    assert.equal(projected[0].x, demo[0].x)
    assert.deepEqual(L.storeElementPosition(projected[0], screens), demo[0])
  }
  // narrower: past the world's end, hidden but kept
  assert.equal(L.elementsInWorld(defaultPatio, 2).filter(e => e.kind === 'house').length, 0)
  const edited = { ...defaultPatio, elements: defaultPatio.elements.filter(e => e.id !== demo[0].id) }
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(edited)), true), edited)
})

test('v11: the Templo\'s and the Vila\'s elements get the world x they had and no longer follow the width', () => {
  const W = world.SCENE_W
  const old = { v: 10, settings: { screens: 3 }, elements: [
    { id: 'shown', kind: 'platform', x: 500, y: 600, w: 200, h: 40 },
    { id: 'hidden', kind: 'platform', x: W * 3.5, y: 600, w: 200, h: 40 },
    { id: 'house', kind: 'house', region: 'village', x: 100, y: 500, w: 300, h: 300 },
    { id: 'gong-side', kind: 'platform', region: 'temple', x: 900, y: 600, w: 200, h: 40 },
  ] }
  const now = L.normalizeLayout(JSON.parse(JSON.stringify(old)))
  const at = id => now.elements.find(e => e.id === id)
  assert.equal(now.v, L.LAYOUT_VERSION)
  assert.ok(now.elements.every(e => !e.region))
  assert.equal(at('shown').x, 500)
  assert.equal(at('house').x, 100 + world.villageScene(3) * W)
  assert.equal(at('gong-side').x, 900 + world.templeScene(3) * W)
  // what the width hid stays hidden (it does not turn up on the Templo or the Vila)
  assert.equal(at('hidden').x, W * 5.5)
  assert.deepEqual(L.elementsInWorld(now, 3).filter(e => !e.id.startsWith('temple-')).map(e => e.id).sort(), ['entry-portal', 'gong-side', 'house', 'shown'])
  // the same layout on a wider world: everything where it was, nothing moved to the new end
  const wide = L.elementsInWorld(now, 8)
  assert.equal(wide.find(e => e.id === 'house').x, at('house').x)
  assert.equal(wide.find(e => e.id === 'hidden').x, W * 5.5)
  // narrower: the house is past the end, hidden but kept, and back at the same place when it widens again
  assert.equal(L.elementsInWorld(now, 1).some(e => e.id === 'house'), false)
  assert.equal(now.settings.screens, 3)
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(now))), now)
  // saved without its own width: the one it was shown at (the game's default here) is pinned with it
  const bare = L.normalizeLayout({ v: 10, elements: [{ id: 'h', kind: 'house', region: 'temple', x: 10, y: 500, w: 300, h: 300 }] })
  assert.equal(bare.settings.screens, 4)
  assert.equal(bare.elements.find(e => e.id === 'h').x, 10 + world.templeScene(4) * W)
  // a current layout without scene-local positions is left as it is, whatever its width
  const current = L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [{ id: 'far', kind: 'platform', x: W * 7, y: 600, w: 200, h: 40 }] })
  assert.equal(current.elements[0].x, W * 7)
  assert.equal(current.settings, undefined)
})

test('both default shortcuts resolve a partner and return to the start', () => {
  const layout = L.defaultLayout()
  const screens = layout.settings.screens
  const portals = L.elementsInWorld(layout, screens).filter(e => e.kind === 'portal')
  for (const [index, scene] of [[0, world.templeScene(screens)], [2, world.villageScene(screens)]]) {
    const entry = portals[index]
    const platform = world.SCENE_PLATFORMS[0][index === 0 ? 2 : 3]
    assert.equal(entry.x + entry.w / 2, platform.x + platform.w / 2)
    assert.equal(entry.y + entry.h - 6, world.WORLD_GROUND_Y - platform.bottom - platform.h)
    const exit = L.portalPartner(entry, portals)
    assert.equal(Math.floor((exit.x + exit.w / 2) / world.SCENE_W), scene)
    assert.equal(L.portalPartner(exit, portals), entry)
    assert.equal(Math.floor(entry.x / world.SCENE_W), 0)
  }
})

test('default shortcut portal migration moves only untouched entries onto their platforms', () => {
  const current = L.defaultLayout()
  const old = structuredClone(current)
  old.v = 5
  for (const [id, cx] of [['shortcut-temple', 395], ['shortcut-village', 620]]) {
    const portal = old.elements.find(e => e.id === id)
    portal.x = cx - portal.w / 2
    portal.y = world.WORLD_GROUND_Y - portal.h + 6
  }
  const migrated = L.normalizeLayout(old, true)
  for (const [id, platformIndex] of [['shortcut-temple', 2], ['shortcut-village', 3]]) {
    const portal = migrated.elements.find(e => e.id === id)
    const platform = world.SCENE_PLATFORMS[0][platformIndex]
    assert.equal(portal.x + portal.w / 2, platform.x + platform.w / 2)
    assert.equal(portal.y + portal.h - 6, world.WORLD_GROUND_Y - platform.bottom - platform.h)
  }
  const custom = structuredClone(old)
  custom.elements.find(e => e.id === 'shortcut-temple').x += 1
  const preserved = L.normalizeLayout(custom, true).elements.find(e => e.id === 'shortcut-temple')
  assert.equal(preserved.x, custom.elements.find(e => e.id === 'shortcut-temple').x)
})

test('older layouts gain editable shortcuts once, preserving custom pairs and saved moves', () => {
  const existing = L.createPortalPair(560, 280)
  existing.forEach(p => { p.params.portalPairId = 'shortcut-village' })
  const layout = L.normalizeLayout({ v: 3, elements: existing })
  // its two portals, the four shortcuts, the Vila's ground, the entry portal and the Templo's 16 elements (v12)
  assert.equal(layout.elements.length, 8 + L.TEMPLE_ELEMENT_IDS.length)
  assert.equal(L.portalPartner(layout.elements.find(e => e.id === existing[0].id), layout.elements).id, existing[1].id)
  const worldView = L.elementsInWorld(layout, 4)
  const exit = worldView.find(p => p.id === 'shortcut-village-return')
  const entry = L.portalPartner(exit, worldView)
  assert.equal(entry.params.portalLabel, 'Vila dos Telhados')
  assert.equal(Math.floor((exit.x + exit.w / 2) / world.SCENE_W), world.villageScene(4))
  const moved = L.storeElementPosition({ ...exit, x: exit.x + 95, y: exit.y - 50 }, 4)
  assert.equal(moved.region, undefined)
  assert.equal(moved.x, exit.x + 95)
  const saved = L.normalizeLayout(JSON.parse(JSON.stringify({ ...layout, elements: layout.elements.map(p => p.id === moved.id ? moved : p) })))
  // a wider world keeps it where it was; a narrower one hides it
  const wide = L.elementsInWorld(saved, 8)
  const projected = wide.find(p => p.id === moved.id)
  assert.equal(projected.x, moved.x)
  assert.equal(projected.y, moved.y)
  assert.equal(L.portalPartner(projected, wide).id, entry.id)
  assert.equal(L.elementsInWorld(saved, 1).some(p => p.id === moved.id), false)
  const removed = { ...saved, elements: saved.elements.filter(p => p.id !== entry.id && p.id !== exit.id) }
  assert.deepEqual(L.normalizeLayout(removed), removed)
})

test('a full legacy layout keeps all its elements when shortcut pairs are added', () => {
  const old = { v: 3, elements: Array.from({ length: 1500 }, (_, i) => ({ id: `old-${i}`, kind: 'platform' })) }
  const current = L.normalizeLayout(old)
  assert.equal(current.elements.length, L.LAYOUT_MAX_ELEMENTS)
  assert.equal(current.elements[0].id, 'village-ground')
  assert.equal(current.elements[1].id, 'temple-far-pine')
  assert.equal(current.elements[1500 + L.TEMPLE_ELEMENT_IDS.length].id, 'old-1499')
  assert.equal(current.elements.filter(el => el.kind === 'portal').length, 4)
  assert.deepEqual(L.normalizeLayout(current), current)
})

test('every house style survives storage and has independent roof, sill and lintel geometry', () => {
  for (const style of Object.keys(H.HOUSE_STYLES)) {
    const house = H.housePreset(style, 7549)
    const element = L.normalizeElement({ kind: 'house', params: { house }, solid: false, rot: 45 })
    assert.deepEqual(element.params.house, house)
    assert.deepEqual(L.normalizeElement(JSON.parse(JSON.stringify(element))), element)
    assert.equal(element.solid, true)
    assert.equal(element.rot, 0)
    assert.deepEqual(L.layoutBoxes([element]), [])
    assert.equal(H.houseWallTexture(house), H.houseWallTexture(H.housePreset(style, 7549)))
  }
  const house = H.normalizeHouse({ style: 'cliff', roof: 'gable', pitch: 25, windowShape: 'arch', doorShape: 'round', wall: 'url(evil)', windowSize: 999 })
  assert.match(house.wall, /^#[a-f0-9]{6}$/)
  assert.equal(house.windowSize, 130)
  const lines = H.houseSurfaces(house, 200, 400)
  assert.deepEqual(lines[0].points, [[0, 112], [100, 12], [200, 112]])
  assert.deepEqual(lines.find(l => l.id === 'base').points, [[14, 400], [186, 400]])
  for (const [i, opening] of H.houseOpenings(house).entries()) {
    const o = H.openingGeometry(house, opening)
    const cap = lines.find(l => l.id === `lintel-${i}`)
    assert.deepEqual(cap.points, [[(o.left - 2) * 2, o.y * 4], [(o.right + 2) * 2, o.y * 4]])
    const sill = lines.find(l => l.id === `sill-${i}`)
    if (o.kind === 'door') assert.equal(sill, undefined)
    else assert.equal(sill.points[0][1], (o.y + o.h) * 4)
  }
})

test('new houses use the larger scale and palette randomness honors the selected style', () => {
  const e = L.createElement('house', 0, 0)
  assert.deepEqual({ w: e.w, h: e.h }, { w: 380, h: 550 })
  const choices = Array.from({ length: 30 }, (_, i) => H.randomHouse('random', i * 2654435761 >>> 0))
  assert.ok(new Set(choices.map(({ house }) => house.style)).size >= 5)
  assert.ok(new Set(choices.map(({ house }) => house.floors)).size >= 3)
  assert.ok(new Set(choices.map(({ w }) => w)).size > 10)
  for (const { house } of choices) assert.deepEqual(H.normalizeHouse(house), house)
  const pick = H.randomHouse('nordic', 520)
  assert.equal(pick.house.style, 'nordic')
  assert.deepEqual(pick, H.randomHouse('nordic', 520))
})

test('house occlusion defaults on for old layouts and follows the facade and paint order', () => {
  const house = L.normalizeElement({ id: 'wall', kind: 'house', x: 100, y: 300, w: 200, h: 400 })
  const platform = L.createElement('platform', 200, 500)
  assert.equal(L.occludesColliders(house), true)
  assert.equal(L.occludesColliders(platform), false)
  const [mask] = L.layoutCollisionMasks([platform, house])
  assert.ok(mask.depth > L.layoutCollisionDepth(platform, 0))
  assert.deepEqual(mask.polygon, H.houseWallPolygon(house.params.house).map(([x, y]) => [100 + x * 2, 300 + y * 4]))
  const optOut = L.normalizeElement({ ...house, occludesColliders: false })
  assert.equal(L.normalizeElement(JSON.parse(JSON.stringify(optOut))).occludesColliders, false)
  assert.deepEqual(L.layoutCollisionMasks([optOut, { ...house, hidden: true }, { ...house, opacity: .8 }, { ...house, layer: 'frontGhost' }]), [])
  assert.equal(L.layoutCollisionMasks([{ ...platform, occludesColliders: true, layer: 'front' }, house]).length, 2)
  assert.ok(L.layoutCollisionDepth({ ...platform, layer: 'front' }, 0) > mask.depth)
  const [behind] = L.layoutBoxes([platform, house])
  assert.equal(behind.occludedAt(200, 500), true)
  assert.equal(behind.occludedAt(90, 500), false)
  const [inFront] = L.layoutBoxes([house, platform])
  assert.equal(inFront.occludedAt, undefined)
})

test('paper houses keep the cutout silhouette when randomized and use its roof and door as supports', () => {
  const samples = Array.from({ length: 24 }, (_, i) => H.randomHouse('paper', i * 2654435761 >>> 0))
  assert.deepEqual(new Set(samples.map(({ house }) => house.roof)), new Set(['gable', 'hip']))
  assert.ok(new Set(samples.map(({ house }) => house.wall)).size > 4)
  assert.ok(samples.some(({ w, h }) => w >= h))
  assert.ok(samples.some(({ w, h }) => w < h))
  for (const { house, w, h } of samples) {
    assert.deepEqual(H.houseDraftSize(house), { w, h })
    assert.equal(H.houseWallTexture(house), 'paper')
    assert.equal(house.roofTexture, 'paper')
    const openings = H.houseOpenings(house)
    assert.equal(openings.length, 1)
    assert.deepEqual([openings[0].kind, openings[0].shape, openings[0].x], ['door', 'rect', 50])
    const roof = H.houseRoof(house)
    if (house.roof === 'hip') assert.deepEqual(roof.slice(1, 3), [[12, 3], [88, 3]])
    const supports = H.houseSurfaces(house, 100, 100)
    assert.deepEqual(supports.map(({ id }) => id), ['roof', 'lintel-0', 'base'])
    assert.deepEqual(supports[0].points, roof)
  }
})

test('cubist terrace joins all four parapet corners as one-way floors when resized', () => {
  const samples = Array.from({ length: 24 }, (_, i) => H.randomHouse('cubist', i * 2654435761 >>> 0))
  assert.deepEqual(new Set(samples.map(({ house }) => house.roof)), new Set(['parapet', 'flat']))
  for (const { house } of samples) {
    const terrace = H.normalizeHouse({ ...house, roof: 'parapet' })
    const corners = H.houseRoof(terrace)
    assert.equal(corners.length, 5)
    assert.deepEqual(corners.at(-1), corners[0])
    assert.equal(new Set(corners.slice(0, 4).map(([x]) => x)).size, 4)
    assert.deepEqual(H.houseSurfaces(terrace, 200, 400)[0], {
      id: 'roof', points: corners.map(([x, y]) => [x * 2, y * 4]),
    })
    const el = L.normalizeElement({ kind: 'house', params: { house: terrace }, x: 0, y: 0, w: 200, h: 400 })
    assert.deepEqual(L.normalizeElement(JSON.parse(JSON.stringify(el))), el)
    const roofAtCenter = L.layoutFloorBelow([el], 100, -20)
    assert.ok(roofAtCenter < 100, 'a falling actor meets the back rim before the front rim')
  }
})

test('the old Chão da Vila becomes the first ground element, keeping an edited ridge, only once', () => {
  const S = loadTs('lib/pigchicken/surfaces.ts')
  const V = loadTs('lib/pigchicken/village.ts')
  const ridge = [[300, 900], [700, 650], [1500, 700]]
  const migrated = L.normalizeLayout({ v: 4, elements: [{ id: 'kept', kind: 'platform', x: 10 }], terrain: ridge })
  assert.equal(migrated.terrain, undefined)
  const [ground] = migrated.elements
  assert.equal(ground.id, 'village-ground')
  assert.equal(ground.kind, 'ground')
  // in the Vila's scene of the width it was shown at (the game's default here), at its world x
  const off = world.villageScene(4) * world.SCENE_W
  assert.equal(ground.region, undefined)
  assert.equal(migrated.settings.screens, 4)
  assert.equal(ground.hard, true)
  assert.equal(ground.params.surface.style, 'village')
  const outline = S.surfacePolygon(ground, ground.params.surface)
  assert.deepEqual(outline.slice(0, 3).map(([x, y]) => [Math.round(x - off), Math.round(y)]), ridge)
  assert.equal(Math.round(outline[3][1]), S.VILLAGE_ROCK_BOTTOM)
  // saved again (v5) it is just an element: kept, moved or deleted like any other
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(migrated))), migrated)
  const without = { ...migrated, elements: migrated.elements.slice(1) }
  assert.deepEqual(L.normalizeLayout(without).elements.filter(e => !e.id.startsWith('temple-')).map(e => e.id), ['kept', 'entry-portal'])
  // an invalid ridge falls back to the default slope
  const fallback = L.normalizeLayout({ v: 3, elements: [], terrain: [[24, 800], [20, 810]] }).elements.find(e => e.kind === 'ground')
  const def = S.surfacePolygon(fallback, fallback.params.surface)
  assert.deepEqual(def.slice(0, V.VILLAGE_RIDGE.length).map(([x, y]) => [Math.round(x - off), Math.round(y)]), V.VILLAGE_RIDGE)
  // the default Pátio draws it first, so the houses stand in front of it
  assert.equal(L.defaultLayout().elements[0].id, 'village-ground')
})

test('grounds and walls: five biomes, three walls, hard by default and an outline that survives storage', () => {
  const S = loadTs('lib/pigchicken/surfaces.ts')
  assert.equal(S.GROUND_BIOMES.length, 5)
  assert.equal(S.WALL_STYLES.length, 3)
  for (const style of S.GROUND_BIOMES) {
    const el = L.createElement('ground', 400, 600, { surface: S.defaultSurface('ground', style) })
    assert.equal(el.params.surface.style, style)
    assert.equal(el.hard, true)
    assert.equal(el.solid, true)
    assert.deepEqual(L.normalizeElement(JSON.parse(JSON.stringify(el))), el)
  }
  for (const style of S.WALL_STYLES) assert.equal(L.createElement('wall', 0, 0, { surface: { style } }).params.surface.style, style)
  // a wrong style takes the kind's first one; a broken outline, the default one
  assert.equal(L.normalizeElement({ kind: 'wall', params: { surface: { style: 'meadow' } } }).params.surface.style, 'brick')
  assert.equal(L.normalizeElement({ kind: 'ground', params: { surface: { points: [[0, 0], [1, 1]] } } }).params.surface.points.length, 6)
  // turned off, it stays off; platforms only keep "Objeto duro" when it is on
  assert.equal(L.normalizeElement({ kind: 'ground', hard: false }).hard, false)
  assert.equal('hard' in L.normalizeElement({ kind: 'platform' }), false)
  assert.equal(L.normalizeElement({ kind: 'platform', hard: true }).hard, true)
  assert.equal('hard' in L.normalizeElement({ kind: 'house', hard: true }), false)
  // shots and notes meet only what is inside the outline (the default hill dips at its left top)
  const hill = L.normalizeElement({ kind: 'ground', x: 0, y: 0, w: 100, h: 100, params: { surface: { style: 'meadow', points: [[0, 50], [100, 0], [100, 100], [0, 100]] } } })
  const [box] = L.layoutBoxes([hill])
  assert.equal(box.occludedAt(10, 10), true)
  assert.equal(box.occludedAt(90, 10), false)
  assert.equal(L.layoutFloorBelow([hill], 0, -50), 50)
})

test('editing an outline: insert on the nearest line, remove down to three, refit the box around it', () => {
  const S = loadTs('lib/pigchicken/surfaces.ts')
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]]
  const near = S.nearestSurfaceEdge(square, 50, -6)
  assert.equal(near.edge, 0)
  assert.deepEqual(near.point, [50, 0])
  const added = S.insertSurfacePoint(square, near.edge, [50, -40])
  assert.deepEqual(added[1], [50, -40])
  const fit = S.fitSurface(added, 12, 24)
  assert.deepEqual([fit.x, fit.y, fit.w, fit.h], [0, -40, 100, 140])
  assert.deepEqual(fit.points[1], [50, 0])
  assert.deepEqual(S.surfacePolygon(fit, fit).map(p => p.map(v => Math.round(v) + 0)), added)
  const three = S.removeSurfacePoint(S.removeSurfacePoint(added, 1), 0)
  assert.equal(three.length, 3)
  assert.equal(S.removeSurfacePoint(three, 0), null)
  assert.equal(S.removeSurfacePoint([[0, 0], [1, 0], [0, 1]], 0), null)
  // the cap is drawn on the edges facing up, whichever way round the points go
  assert.deepEqual(S.surfaceTopEdges(square), [[[0, 0], [100, 0]]])
  assert.deepEqual(S.surfaceTopEdges([...square].reverse()), [[[100, 0], [0, 0]]])
})

test('a hard outline: floors, walls and ceilings by facing, and its walls stop the body sideways', () => {
  const Hd = loadTs('lib/chicken/hard-shapes.ts')
  const box = [[0, 0], [100, 0], [100, 50], [0, 50]]
  const edges = Hd.shapeEdges(box)
  assert.deepEqual(edges.map(e => e.kind), ['floor', 'wall', 'ceil', 'wall'])
  assert.deepEqual(Hd.shapeEdges([...box].reverse()).map(e => e.kind).sort(), ['ceil', 'floor', 'wall', 'wall'])
  assert.deepEqual(edges[1].n.map(v => Math.round(v) + 0), [1, 0])
  assert.deepEqual(Hd.clipAboveGround([0, 0], [0, 100], 60), [[0, 0], [0, 60]])
  assert.equal(Hd.clipAboveGround([0, 70], [0, 100], 60), null)
  const segs = edges.filter(e => e.kind === 'wall').map(e => ({ ax: e.a[0], ay: e.a[1], bx: e.b[0], by: e.b[1], wall: true, hardN: e.n }))
  // walking left into its right side stops at the radius; the body above the box passes
  assert.equal(Hd.blockHardWalls(segs, 130, 90, 10, 40, 10), 110)
  assert.equal(Hd.blockHardWalls(segs, 130, 90, -80, -10, 10), null)
  // from the left too, and already inside the radius it is not pushed away
  assert.equal(Hd.blockHardWalls(segs, -30, 20, 10, 40, 10), -10)
  assert.equal(Hd.blockHardWalls(segs, 105, 80, 10, 40, 10), 105)
})

test('all tree styles produce bounded deterministic variation and round-trip with the layout', () => {
  const T = loadTs('lib/pigchicken/trees.ts')
  const styles = Object.keys(T.TREE_STYLES)
  assert.equal(styles.length, 18)
  for (const style of styles) {
    const { tree, w, h } = T.randomTree(style, 52354)
    assert.deepEqual(T.randomTree(style, 52354), { tree, w, h })
    assert.notDeepEqual(T.randomTree(style, 784).tree, tree)
    assert.equal(tree.style, style)
    const el = L.createElement('tree', 800, 420, { tree })
    const saved = L.normalizeLayout(JSON.parse(JSON.stringify({ v: L.LAYOUT_VERSION, elements: [el] })))
    assert.deepEqual(saved.elements[0].params.tree, tree)
    assert.deepEqual(L.layoutBoxes(saved.elements), [])
    assert.deepEqual(T.treeSurfaces(tree), { floors: [], walls: [] })
    const g = T.treeGeometry(tree)
    assert.equal(g.crowns.length, tree.crown === 'fronds' ? tree.branches || tree.density : Math.max(tree.density, tree.branches))
    assert.equal(g.branches.length, tree.branches)
  }
  const invalid = T.normalizeTree({ style: 'constructor', seed: Infinity, trunkWidth: 500, density: 0, particles: 8, leafColor: 'url(evil)' })
  assert.equal(invalid.style, 'pine')
  assert.equal(invalid.trunkWidth, 38)
  assert.equal(invalid.density, 1)
  assert.equal(invalid.particles, 4)
  assert.match(invalid.leafColor, /^#[a-f0-9]{6}$/)
  const legacy = L.normalizeElement({ kind: 'blossom', x: 100, y: 200, params: { seed: 70, flip: true }, rot: 45 })
  assert.deepEqual(legacy.params, { seed: 70, flip: true })
  assert.equal(legacy.rot, 45)
})

test('species foliage follows branch tips, uses sharpness in the SVG and preserves new settings', () => {
  const T = loadTs('lib/pigchicken/trees.ts')
  const F = loadTs('lib/pigchicken/tree-foliage.ts')
  const baobab = { ...T.treePreset('baobab', 52), density: 1 }
  const baobabGeometry = T.treeGeometry(baobab)
  assert.deepEqual(baobabGeometry.crowns.map(({ x, y }) => [x, y]), baobabGeometry.branches.map(branch => branch.at(-1)))
  assert.ok(new Set(baobabGeometry.crowns.map(({ y }) => y)).size > 3)
  const palm = T.treePreset('palm', 53)
  const fronds = T.treeGeometry(palm).crowns
  assert.ok(fronds.every(({ frond }) => frond.length > 3 && frond[0][0] === 50 && frond[0][1] === 100 - palm.trunkHeight))
  assert.notEqual(F.drawTreeFoliage(palm, fronds).leaves, F.drawTreeFoliage({ ...palm, sharpness: 0 }, fronds).leaves)
  const willow = T.treePreset('willow', 54)
  assert.match(F.drawTreeFoliage(willow, T.treeGeometry(willow).crowns).twigs, /Q/)
  const ipes = Array.from({ length: 40 }, (_, seed) => T.treePreset('ipe', seed))
  assert.equal(new Set(ipes.map(T.treeFlowerColor)).size, 4)
  const custom = { ...ipes[0], bloom: 'custom', flowerColor: '#43a562', trunkSway: 4, sharpness: 86 }
  assert.deepEqual(T.normalizeTree(JSON.parse(JSON.stringify(custom))), custom)
  assert.equal(T.treeFlowerColor(custom), '#43a562')
  assert.equal(T.normalizeTree({ style: 'palm', wind: 0 }).trunkSway, 1)
  assert.ok(T.treeDraftSize(T.treePreset('redwood', 56)).h > 1500)
  assert.ok(T.treeDraftSize(T.treePreset('centurion', 57)).h > 1500)
  assert.ok(T.treeDraftSize(T.treePreset('tule', 58)).w > 1000)
})

test('tree supports are independently selectable and follow mirror, resize and rotation', () => {
  const T = loadTs('lib/pigchicken/trees.ts')
  const tree = T.treePreset('palm', 56)
  const geometry = T.treeGeometry(tree)
  assert.deepEqual(T.treeSurfaces({ ...tree, walkBranches: true }).floors, geometry.branches)
  assert.equal(T.treeSurfaces({ ...tree, walkCrown: true }).floors.length, geometry.crowns.length)
  const trunk = { ...tree, climbTrunk: true }
  const supports = T.treeSurfaces(trunk)
  assert.deepEqual(supports.walls[0], geometry.trunk.slice(0, 2))
  assert.deepEqual(supports.floors[0], geometry.trunk.slice(1, 3))
  const el = { x: 100, y: 200, w: 500, h: 250, rot: 0 }
  const [x, y] = supports.walls[0][0]
  assert.deepEqual(L.treeWorldSurfaces(el, trunk).walls[0][0], [100 + x * 5, 200 + y * 2.5])
  assert.deepEqual(L.treeWorldSurfaces(el, { ...trunk, flip: true }).walls[0][0], [100 + (100 - x) * 5, 200 + y * 2.5])
  const rotated = L.treeWorldSurfaces({ ...el, rot: 90 }, trunk).walls[0][0]
  assert.deepEqual(rotated.map(Math.round), [225, Math.round(325 + (x - 50) * 5)])
})

test('the Pátio settings (Sun panel) travel with the layout and are clamped', () => {
  const saved = L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [], settings: { screens: 2, height: 1500 } })
  assert.deepEqual(saved.settings, { screens: 2, height: 1500 })
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(saved))).settings, saved.settings)
  assert.deepEqual(L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [], settings: { screens: 99, height: 99999 } }).settings, { screens: 8, height: 8000 })
  assert.equal(L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [] }).settings, undefined)
  // things may sit up to the tallest ceiling allowed
  const high = L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [{ id: 'p', kind: 'platform', x: 100, y: -6000, w: 200, h: 40, rot: 0, layer: 'scene' }] })
  assert.equal(high.elements[0].y, -6000)
})

test('every Pátio has exactly one entry portal: moved and kept, never duplicated, and alone in an empty Pátio', () => {
  const def = L.defaultLayout()
  const entries = def.elements.filter(e => e.kind === 'entry')
  assert.equal(entries.length, 1)
  const [entry] = entries
  const platform = world.SCENE_PLATFORMS[0][1]
  // where the globe portal always stood: centred over the small platform at the far left
  assert.equal(entry.x + entry.w / 2, platform.x + platform.w / 2)
  assert.equal(entry.y + entry.h - 6, world.WORLD_GROUND_Y - platform.bottom - platform.h)
  assert.equal(entry.solid, false); assert.equal(entry.shots, false)
  // a moved entry keeps its place; a second one is dropped; its size never changes
  const moved = { ...entry, x: 900, y: 300, w: 999 }
  const saved = L.normalizeLayout(JSON.parse(JSON.stringify({ v: L.LAYOUT_VERSION, elements: [moved, { ...entry, id: 'other' }] })))
  const kept = saved.elements.filter(e => e.kind === 'entry')
  assert.equal(kept.length, 1)
  assert.equal(kept[0].x, 900); assert.equal(kept[0].y, 300); assert.equal(kept[0].w, 150)
  assert.equal(L.entryPortalIn(L.elementsInWorld(saved, 4)).x, 900)
  // past a narrower world's end, the game falls back to the default place
  const far = L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [{ ...entry, x: world.SCENE_W * 6 }] })
  assert.equal(L.entryPortalIn(L.elementsInWorld(far, 1)).x, entry.x)
  // the empty Pátio: only the entry portal, and it stays that way through storage
  const empty = L.emptyLayout()
  assert.deepEqual(empty.elements.map(e => e.kind), ['entry'])
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(empty))), empty)
})

test('the default Pátio saved before the Hangdrum (v6) gets its rack on the shelf once; other Pátios do not', () => {
  const saved = { v: 6, elements: [{ id: 'rack-harp', kind: 'rack', x: 1642, y: 0, w: 76, h: 62, params: { item: 'harp' } }] }
  const def = L.normalizeLayout(saved, true)
  const rack = def.elements.find(e => e.kind === 'rack' && e.params.item === 'hangdrum')
  assert.ok(rack)
  assert.equal(rack.y + rack.h, world.SHELF_TOP)
  assert.ok(rack.x >= 1718 && rack.x + rack.w <= 154 + 1651)
  assert.equal(L.normalizeLayout(saved, false).elements.some(e => e.params.item === 'hangdrum'), false)
  // saved again (v7) without it: the admin removed it, it stays removed
  const again = L.normalizeLayout({ ...def, elements: def.elements.filter(e => e.params.item !== 'hangdrum') }, true)
  assert.equal(again.elements.some(e => e.params.item === 'hangdrum'), false)
})

test('v12: the Templo do Gongo becomes elements where its drawing stood, once, and only where it was on', () => {
  const W = world.SCENE_W
  const old = L.normalizeLayout({ v: 11, settings: { screens: 3 }, elements: [{ id: 'kept', kind: 'platform', x: 10, y: 600, w: 200, h: 40 }] })
  const L0 = world.templeScene(3) * W
  const at = id => old.elements.find(e => e.id === id)
  assert.deepEqual(L.TEMPLE_ELEMENT_IDS.filter(id => at(id)).length, L.TEMPLE_ELEMENT_IDS.length)
  // the halls: the main one with two roofs, the pyramid pavilion, the far one in the haze (nothing to climb)
  const hall = at('temple-hall')
  assert.deepEqual([hall.kind, hall.x, hall.y, hall.w, hall.h], ['building', L0 + 46, 352, 1228, 451])
  assert.equal(at('temple-pavilion').params.building.roof, 'pyramid')
  const far = at('temple-far-hall')
  assert.equal(far.layer, 'back'); assert.equal(far.solid, false); assert.equal(far.params.building.haze, true)
  // the main hall's roofs are the old floors: its upper roof's ridge at y 400, its lower eaves at y 648
  const B = loadTs('lib/pigchicken/buildings.ts')
  const floors = B.buildingSurfaces(hall.params.building, hall.w, hall.h).map(line => line.map(([x, y]) => [x + hall.x, y + hall.y]))
  assert.ok(floors.some(line => line.some(([, y]) => Math.abs(y - 400) < 0.5)))
  assert.ok(floors.some(line => line.length === 2 && Math.abs(line[0][1] - 648) < 0.5))
  // the balustrade: its floor is the old terrace (y 842) along the whole scene
  const wall = at('temple-wall')
  assert.deepEqual([wall.kind, wall.x, wall.w, wall.y + B.BALUSTRADE_FLOOR], ['balustrade', L0, W, 842])
  // the gong runs the Templo, the stone and the jukebox stand where they were, the racks by the entrance
  const gong = at('temple-gong')
  assert.equal(gong.params.gong.temple, true)
  assert.equal(gong.x + gong.w / 2, L0 + 560); assert.equal(gong.y + gong.h, world.WORLD_GROUND_Y)
  assert.equal(at('temple-reset').x + at('temple-reset').w / 2, L0 + 1770)
  assert.equal(at('temple-jukebox').x + at('temple-jukebox').w / 2, L0 + 1640)
  assert.deepEqual(old.elements.filter(e => e.id.startsWith('temple-rack-')).map(e => [e.params.item, e.x + e.w / 2]), ['bat', 'pistol', 'smg', 'guitar', 'flute'].map((item, i) => [item, L0 + 60 + i * 90]))
  // saved again (v12): just elements, never added twice; deleted ones stay deleted
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(old))), old)
  const edited = { ...old, elements: old.elements.filter(e => e.id !== 'temple-pavilion') }
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(edited))), edited)
  // a Pátio saved with the Templo off gets none of it
  const off = L.normalizeLayout({ v: 11, settings: { screens: 3, temple: false }, elements: [] })
  assert.equal(off.elements.some(e => e.id.startsWith('temple-')), false)
  // the code's Pátio has it in its Templo's scene, behind everything but the Vila's ground
  const def = L.defaultLayout()
  assert.equal(def.elements[1].id, 'temple-far-pine')
  assert.equal(def.elements.find(e => e.id === 'temple-hall').x, world.templeScene(L.LAYOUT_MAX_SCREENS) * W + 46)
})

test('Prédio and Mureta com cerca: params cleaned, roofs as floors (none in the haze), the wall a floating floor', () => {
  const B = loadTs('lib/pigchicken/buildings.ts')
  const b = B.normalizeBuilding({ roof: 'nope', storeys: 9, columns: 1, doors: 50, lanterns: -2, plaque: 'x', haze: true })
  assert.deepEqual(b, { roof: 'hip', storeys: 2, ridge: true, columns: 2, doors: 1, lanterns: 0, plaque: true, haze: true })
  assert.equal(B.buildingSurfaces(b, 600, 400).length, 0)
  for (const roof of ['hip', 'pyramid']) for (const storeys of [1, 2]) {
    const p = { ...B.defaultBuilding(), roof, storeys }
    const lines = B.buildingSurfaces(p, 600, 400)
    assert.equal(lines.length, roof === 'pyramid' ? (storeys === 2 ? 3 : 1) : storeys * 2)
    lines.flat().forEach(([x, y]) => { assert.ok(x >= -1 && x <= 601, `${roof}/${storeys} x ${x}`); assert.ok(y >= 0 && y <= 400, `${roof}/${storeys} y ${y}`) })
  }
  const el = L.normalizeElement({ id: 'b', kind: 'building', x: 0, y: 100, w: 600, h: 400 })
  assert.deepEqual(el.params.building, B.defaultBuilding())
  assert.equal(el.solid, true)
  // the Prédio holds only her (the shots pass), like the houses; the Mureta's box for what falls starts at its floor
  const wall = L.normalizeElement({ id: 'w', kind: 'balustrade', x: 100, y: 500, w: 400, h: 130 })
  assert.equal(wall.params.balustrade.courtyard, true)
  const boxes = L.layoutBoxes([el, wall])
  assert.equal(boxes.length, 1)
  assert.equal(boxes[0].t, 500 + B.BALUSTRADE_FLOOR)
  assert.equal(L.layoutFloorBelow([wall], 200, 100), 500 + B.BALUSTRADE_FLOOR)
  // the Recomeçar stone keeps its art's size
  const stone = L.normalizeElement({ id: 's', kind: 'resetstone', x: 0, y: 0, w: 999, h: 999 })
  assert.deepEqual([stone.w, stone.h], [L.ELEMENT_DEFS.resetstone.w, L.ELEMENT_DEFS.resetstone.h])
})
