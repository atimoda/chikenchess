const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('./helpers/music.cjs')
const G = loadTs('lib/pigchicken/bird-guide.ts')
const L = loadTs('lib/pigchicken/soul-library.ts')
const A = loadTs('lib/pigchicken/soul-acts.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

test('the guide: thirty real birds, each with its names, its drawing and its recordings with credits', () => {
  assert.equal(G.GUIDE_BIRDS.length, 30)
  assert.equal(new Set(G.GUIDE_BIRDS.map(b => b.id)).size, 30)
  const samples = path.join(__dirname, '..', 'public', G.BIRD_SONGS_FOLDER)
  for (const b of G.GUIDE_BIRDS) {
    assert.equal(b.id, b.sci.toLowerCase().replace(' ', '-'), 'its id is its scientific name')
    assert.ok(b.name && b.game && b.family && b.where && b.about && b.cm > 0, b.id)
    for (const k of ['body', 'wing', 'belly', 'beak']) assert.match(b[k], /^#[0-9a-f]{6}$/, `${b.id}.${k}`)
    assert.ok(b.pixel >= L.SOUL_PIXEL.min && b.pixel <= L.SOUL_PIXEL.max && b.shape in L.SOUL_SHAPES, b.id)
    const clips = G.birdClips(b.id)
    assert.ok(clips.length >= 1 && clips.length <= 4, `${b.id} has recordings`)
    for (const c of clips) {
      assert.ok(c.file.startsWith(b.id + '-') && c.by && c.xc > 0 && c.seconds >= 1 && c.seconds <= 8, c.file)
      assert.match(c.license, /^CC(0| BY)/, c.file); assert.doesNotMatch(c.license, /ND/, 'a clip is a cut: no "no derivatives"')
      assert.equal(c.url, `https://xeno-canto.org/${c.xc}`); assert.match(c.licenseUrl, /^https:\/\/creativecommons\.org\//)
      for (const ext of ['.ogg', '.m4a']) assert.ok(fs.existsSync(path.join(samples, c.file + ext)), c.file + ext)
    }
  }
  assert.equal(G.birdCredits().length, G.GUIDE_BIRDS.reduce((n, b) => n + G.birdClips(b.id).length, 0), 'every clip is in the credits')
  assert.equal(G.guideBird('nope').id, G.GUIDE_BIRDS[0].id); assert.equal(G.isGuideBird('ardea-alba'), true); assert.equal(G.isGuideBird('nope'), false)
  // the synth's piu is the voice of two rare ones only
  assert.deepEqual(G.GUIDE_BIRDS.filter(b => b.voice === 'bird').map(b => b.id), ['vanellus-chilensis', 'tangara-seledon'])
  // a song three times out of four when it has both; whatever it has otherwise
  assert.equal(G.pickBirdClip('turdus-rufiventris', () => 0).kind, 'song')
  assert.equal(G.pickBirdClip('turdus-rufiventris', () => 0.9).kind, 'call')
  assert.equal(G.pickBirdClip('ardea-alba', () => 0.99).kind, 'call')
  assert.equal(G.pickBirdClip('nope'), null)
})

test('every soul takes after one bird of the guide, and every bird inspires a soul', () => {
  for (const e of L.SOUL_ENTRIES) assert.ok(G.isGuideBird(e.bird), e.id)
  for (const b of G.GUIDE_BIRDS) assert.ok(L.SOUL_ENTRIES.some(e => e.bird === b.id), `${b.id} inspires nobody`)
  const of = id => L.SOUL_ENTRIES.find(e => e.id === id).bird
  assert.equal(of('chick'), 'gallus-gallus')
  assert.equal(of('horde.alive.wind'), 'passer-domesticus')
  assert.equal(of('rare.fenix'), 'turdus-rufiventris')
  const night = ['nyctibius-griseus', 'nyctidromus-albicollis', 'tyto-furcata', 'rupornis-magnirostris', 'athene-cunicularia', 'crotophaga-ani', 'caracara-plancus', 'coragyps-atratus']
  for (const e of L.SOUL_ENTRIES) if (!e.recipe && e.state === 'dead') assert.ok(night.includes(e.bird), `${e.id}: a dead one takes after a bird of the night or of carrion`)
  assert.equal(L.entryBird(L.SOUL_ENTRIES[0]).id, L.SOUL_ENTRIES[0].bird)
})

test("a sheet may name another bird: only what differs from the code's is kept", () => {
  const next = L.changeEntry(L.SOUL_ENTRIES, 'horde.alive.wind', o => ({ ...o, bird: 'ardea-alba' }))
  assert.equal(next.find(o => o.id === 'horde.alive.wind').bird, 'ardea-alba')
  const file = L.soulsFile(next)
  assert.deepEqual(file, { sheets: { 'horde.alive.wind': { bird: 'ardea-alba' } } })
  assert.equal(L.soulsFileProblem(file), null)
  assert.match(L.soulsFileProblem({ sheets: { 'horde.alive.wind': { bird: 'nope' } } }), /sheets\.horde\.alive\.wind/)
  assert.match(L.soulsFileProblem({ sheets: { 'horde.alive.wind': { bird: 'passer-domesticus' } } }), /sheets\.horde\.alive\.wind/, "the code's own is not a change")
  assert.equal(L.changeEntry(L.SOUL_ENTRIES, 'horde.alive.wind', o => ({ ...o, bird: 'nope' })).find(o => o.id === 'horde.alive.wind').bird, 'passer-domesticus')
  // a rare one: the list is rewritten whole, with the bird only where it is not the rule's
  const rare = L.changeEntry(L.SOUL_ENTRIES, 'rare.fenix', o => ({ ...o, bird: 'ramphastos-toco' }))
  const rares = L.soulsFile(rare).rares
  assert.equal(rares.find(r => r.id === 'rare.fenix').bird, 'ramphastos-toco')
  assert.ok(rares.filter(r => r.id !== 'rare.fenix').every(r => !('bird' in r)))
  assert.equal(L.soulsFileProblem(L.soulsFile(rare)), null)
  assert.equal(L.soulEntriesOver(L.soulsFile(rare)).find(o => o.id === 'rare.fenix').bird, 'ramphastos-toco')
  assert.deepEqual(L.soulsFile(L.soulEntriesOver({})), {}, 'nothing changed: an empty file')
})

test('the recipe says how a soul like it is made', () => {
  const of = id => L.recipeText(L.SOUL_ENTRIES.find(e => e.id === id))
  assert.equal(of('chick'), 'Capture um pintinho com o Passaguá.')
  assert.equal(of('horde.alive.wind'), 'Encha a harmonia de um alien Horda tocando um instrumento de Sopro e capture o pássaro com o Passaguá.')
  assert.equal(of('jelly.dead.rebate'), 'Mate um alien Água-viva com qualquer arma, ressuscite-o tocando notas de alien rebatidas com um golpe e capture o pássaro com o Passaguá.')
  assert.equal(of('rare.fenix'), 'Encha a harmonia de um alien Dragão tocando qualquer instrumento, com a última nota sendo a tônica e capture o pássaro com o Passaguá.')
  assert.equal(of('rare.gemea-ma'), 'Mate um alien Gêmeos com um golpe, ressuscite-o tocando qualquer instrumento, com a última nota sendo a sensível (sétima) ou uma nota fora da escala e capture o pássaro com o Passaguá.')
  assert.match(of('rare.alma-blue'), /^Encha a harmonia de um alien qualquer tocando um instrumento de Cordas/)
  for (const e of L.SOUL_ENTRIES) assert.ok(L.recipeText(e).length > 20, e.id)
})

test('the real song: a chance each time the clock comes round, never twice in a row; quieter far away', () => {
  const p = { ...A.SOUL_ACT_DEFAULTS, song: 0.5 }
  assert.ok(A.SOUL_ACT_DEFAULTS.song > 0 && A.SOUL_ACT_DEFAULTS.song <= 0.5, 'now and then by default')
  assert.equal(A.songDue({ in: 1, ready: false }, p, Infinity, 0.016, () => 0), false, 'not before its clock comes round')
  assert.equal(A.songDue({ in: 0.01, ready: false }, p, Infinity, 0.016, () => 0.49), true)
  assert.equal(A.songDue({ in: 0.01, ready: false }, p, Infinity, 0.016, () => 0.5), false, 'by chance')
  assert.equal(A.songDue({ in: 0.01, ready: false }, p, A.SOUL_ACT.song.gap - 1, 0.016, () => 0), false, 'it has just sung')
  assert.equal(A.songDue({ in: 0.01, ready: false }, { ...p, song: 0 }, Infinity, 0.016, () => 0), false, '0: never')
  assert.equal(A.songVolume(0), 1); assert.equal(A.songVolume(A.SOUL_ACT.song.far), 0); assert.equal(A.songVolume(1e6), 0)
  assert.ok(A.songVolume(400) > A.songVolume(800))
})

test('a soul flying free sings the song of the bird its sheet takes after', () => {
  const c = createCombat()
  c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  c.setView(-2000, 2000)
  const her = { x: 0, y: 40, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const step = () => c.step(0.016, her, { x: 0, y: -60 }, { x: 0, y: -60 }, 0,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, [], 40, () => {}, { peckOrigin: { x: 0, y: -60 } })
  c.give('cageFlight')
  c.bagOfSouls.push({ id: 9100, species: 'horde', state: 'alive', shot: 'wind', note: 'tonic', weapon: null, rarity: 'common', color: '#7bd88f', bird: 'pardal' })
  c.releaseSoul({ x: 0, y: -300 })
  const f = c.freedSouls[c.freedSouls.length - 1]
  assert.equal(f.bird, 'passer-domesticus')
  const random = Math.random
  try {
    Math.random = () => 0
    f.act = { ...f.act, song: 1 }; f.clock.in = 0.001; step()
    assert.deepEqual(c.songs.map(s => s.bird), ['passer-domesticus'])
    assert.ok(c.texts.some(t => t.text === '♪'), 'a note shows over it')
    // (its clock comes round again at once: it has just sung)
    f.clock.in = 0.001; step()
    assert.equal(c.songs.length, 1)
    c.songs.length = 0; f.sang = -Infinity
    f.act = { ...f.act, song: 0 }; f.clock.in = 0.001; step()
    assert.equal(c.songs.length, 0, 'a sheet with 0 never sings')
  } finally { Math.random = random }
})
