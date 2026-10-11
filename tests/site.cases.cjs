const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { analyticsPageUrl } = loadTs('lib/site-info.ts')
const { trackMatchCompleted, trackMatchStarted } = loadTs('lib/game-analytics.ts')

test('analytics omit auth callback pages and authorization codes', () => {
  for (const url of [
    'https://chickenchess.com/?authCallback=1&code=private-code',
    'http://localhost:3000/?authCallback=1#error=access_denied',
    'https://chickenchess.com/?code=private-code',
  ]) assert.equal(analyticsPageUrl(url), null)
})

test('analytics retain page paths without private invitations, match IDs, or fragments', () => {
  assert.equal(analyticsPageUrl('https://chickenchess.com/?room=private-invite&match=private-match#access_token=secret'), 'https://chickenchess.com/')
  assert.equal(analyticsPageUrl('https://chickenchess.com/privacy-policy#rights'), 'https://chickenchess.com/privacy-policy')
  assert.equal(analyticsPageUrl('https://chickenchess.com/terms-of-service'), 'https://chickenchess.com/terms-of-service')
})

test('analytics ignore invalid and non-web URLs', () => {
  for (const url of ['invalid', '/relative', 'javascript:alert(1)', 'mailto:hello@chickenchess.com']) assert.equal(analyticsPageUrl(url), null)
})

test('completed match analytics sends aggregate outcomes without player or match identifiers', () => {
  const previousWindow = globalThis.window
  const calls = []
  globalThis.window = { gtag: (...args) => calls.push(args) }
  try {
    trackMatchCompleted({
      game_mode: 'online',
      result: 'white',
      result_reason: 'resign',
      move_count: 24,
      golden_eggs_saved: 7,
      golden_eggs_collected: 3,
      freeze_uses: 2,
      shield_uses: 1,
      undo_uses: 0,
      redo_uses: 0,
      best_uses: 3,
      worst_uses: 2,
      city_name: 'Düsseldorf',
      white_kit_city: 'Detroit',
      black_kit_city: 'Paris',
    })
    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], 'event')
    assert.equal(calls[0][1], 'match_completed')
    assert.deepEqual(calls[0][2], {
      game_mode: 'online',
      result: 'white',
      result_reason: 'resign',
      move_count: 24,
      golden_eggs_saved: 7,
      golden_eggs_collected: 3,
      freeze_uses: 2,
      shield_uses: 1,
      undo_uses: 0,
      redo_uses: 0,
      best_uses: 3,
      worst_uses: 2,
      city_name: 'Düsseldorf',
      white_kit_city: 'Detroit',
      black_kit_city: 'Paris',
    })
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('match start analytics sends only aggregate mode and kit context', () => {
  const previousWindow = globalThis.window
  const calls = []
  globalThis.window = { gtag: (...args) => calls.push(args) }
  try {
    trackMatchStarted({ game_mode: 'campaign', city_name: 'Düsseldorf', white_kit_city: 'Düsseldorf', black_kit_city: 'Düsseldorf' })
    assert.deepEqual(calls, [['event', 'match_started', { game_mode: 'campaign', city_name: 'Düsseldorf', white_kit_city: 'Düsseldorf', black_kit_city: 'Düsseldorf' }]])
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
