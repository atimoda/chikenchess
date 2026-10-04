const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { analyticsPageUrl } = loadTs('lib/site-info.ts')

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
