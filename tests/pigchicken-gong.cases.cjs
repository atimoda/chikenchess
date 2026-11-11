const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

const gong = loadTs('lib/pigchicken/gong.ts')
const layout = loadTs('lib/pigchicken/layout.ts')
const sync = loadTs('lib/pigchicken/layout-sync.ts')

test('a Gongo saved comes back the same; odd values are cleaned and clamped', () => {
  const g = { song: 'minha-musica', hits: 7, title: 'Toque!', lamps: false, forget: 6, stopHits: 0 }
  assert.deepEqual(gong.normalizeGong(JSON.parse(JSON.stringify(g))), g)
  assert.deepEqual(gong.normalizeGong(null), gong.defaultGong())
  const odd = gong.normalizeGong({ song: 'Não Vale!', hits: 99, title: 'x'.repeat(80), lamps: 'sim', forget: -3, stopHits: 40 })
  assert.equal(odd.song, gong.GONG_DEFAULT_SONG)
  assert.equal(odd.hits, gong.GONG_HITS.max)
  assert.equal(odd.title.length, gong.GONG_TITLE_MAX)
  assert.equal(odd.lamps, true)
  assert.equal(odd.forget, 0)
  assert.equal(odd.stopHits, gong.GONG_STOP_HITS.max)
  assert.equal(gong.normalizeGong({ title: '' }).title, '', 'an empty title stays empty (no label)')
})

test('strikes: the count starts the song, then (while it plays) the stopping strikes stop it', () => {
  const p = { ...gong.defaultGong(), hits: 3, stopHits: 2 }
  const run = gong.newGongRun()
  assert.equal(gong.strikeGong(run, p, false), 'count')
  assert.equal(gong.strikeGong(run, p, false), 'count')
  assert.equal(gong.strikeGong(run, p, false), 'start')
  assert.equal(run.hits, 0)
  assert.equal(gong.strikeGong(run, p, true), 'count')
  assert.equal(gong.strikeGong(run, p, true), 'stop')
  assert.equal(gong.strikeGong(run, { ...p, stopHits: 0 }, true), 'dull', 'a Gongo that never stops its song')
})

test('time: a count left too long is forgotten (or never, with 0)', () => {
  const run = gong.newGongRun()
  const p = { ...gong.defaultGong(), hits: 5, forget: 2 }
  gong.strikeGong(run, p, false); gong.strikeGong(run, p, false)
  gong.stepGong(run, { ...p, forget: 0 }, 10)
  assert.equal(run.hits, 2)
  run.since = 0
  gong.stepGong(run, p, 1.5); assert.equal(run.hits, 2)
  gong.stepGong(run, p, 1); assert.equal(run.hits, 0)
})

test('in the layout: Gongo and Jukebox keep their size, stand where dropped and become the game\'s buttons', () => {
  const g = layout.createElement('gong', 500, 600)
  assert.deepEqual([g.w, g.h], [gong.GONG_BOX.w, gong.GONG_BOX.h])
  assert.deepEqual(g.params.gong, gong.defaultGong())
  const j = layout.normalizeElement({ ...layout.createElement('jukebox', 900, 600), w: 999, h: 5, solid: true })
  assert.deepEqual([j.w, j.h, j.solid], [gong.JUKEBOX_BOX.w, gong.JUKEBOX_BOX.h, false])
  const targets = []
  const combat = { targets, racks: [], addButton(x, y, label, w, h) { targets.push({ id: targets.length, kind: 'button', x, home: x, y, w, h, label, vx: 0 }) } }
  const s = sync.createLayoutSync(combat)
  s.sync([g, j], 8)
  assert.deepEqual(targets.map(t => t.label), [`gong:${g.id}`, `jukebox:${j.id}`])
  assert.equal(targets[0].x, g.x + g.w / 2)
  assert.equal(targets[0].y, g.y + g.h - 40, 'the gong\'s art stands on the box\'s bottom')
  s.sync([j], 8)
  assert.deepEqual(targets.map(t => t.label), [`jukebox:${j.id}`], 'deleted: its button goes')
})
