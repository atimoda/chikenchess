const { test } = require('node:test')
const assert = require('node:assert/strict')
const { URL } = require('node:url')
const { loadTs } = require('./helpers/music.cjs')
const { readAuthCallback, authCallbackMessage, completeAuthCallback, isAuthCallbackMessage, googleLoginFailure } = loadTs('lib/online/auth-callback.ts')

test('the reported production failure is recognized without authCallback and keeps its machine code', () => {
  const url = new URL('http://localhost:3000/?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user&sb=')
  const callback = readAuthCallback(url.search, url.hash)
  assert.deepEqual(callback, { requested: false, error: 'Identity is already linked to another user', errorCode: 'identity_already_exists', requestId: null })
  const message = authCallbackMessage(callback, null, false)
  assert.equal(message.ok, false)
  assert.equal(message.errorCode, 'identity_already_exists')
  assert.equal(googleLoginFailure(message.errorCode, message.error).existingAccount, true)
})

test('fragment-only OAuth rejection is recognized and cancellation does not select an existing account', () => {
  const callback = readAuthCallback('?authCallback=1', '#error=access_denied&error_description=User+cancelled')
  assert.deepEqual(callback, { requested: true, error: 'User cancelled', errorCode: null, requestId: null })
  assert.deepEqual(googleLoginFailure(callback.errorCode, callback.error), { existingAccount: false, message: 'User cancelled' })
})

test('query failure has priority over a different fragment failure', () => {
  const callback = readAuthCallback('?error_code=identity_already_exists&error_description=Existing+identity&authCallbackId=login-123', '#error_code=access_denied&error_description=Cancelled')
  assert.equal(callback.errorCode, 'identity_already_exists')
  assert.equal(callback.error, 'Existing identity')
  assert.equal(callback.requestId, 'login-123')
  assert.equal(authCallbackMessage(callback, null, false).requestId, 'login-123')
})

test('an explicit OAuth error takes priority over an older permanent session and SDK error', () => {
  const callback = readAuthCallback('?authCallback=1&error_code=identity_already_exists', '')
  const message = authCallbackMessage(callback, { message: 'SDK failure', code: 'unknown' }, true)
  assert.equal(message.ok, false)
  assert.equal(message.errorCode, 'identity_already_exists')
  assert.equal(message.error, 'identity_already_exists')
})

test('successful callback requires a permanent session, and SDK errors are forwarded', () => {
  const callback = readAuthCallback('?authCallback=1', '')
  assert.deepEqual(authCallbackMessage(callback, null, true), { type: 'chickenchess:auth-complete', ok: true, error: null, errorCode: null })
  assert.equal(authCallbackMessage(callback, null, false).ok, false)
  assert.deepEqual(authCallbackMessage(callback, { message: 'Expired code', code: 'otp_expired' }, true), { type: 'chickenchess:auth-complete', ok: false, error: 'Expired code', errorCode: 'otp_expired' })
})

test('ordinary game URLs are not callbacks and session credentials never enter the popup message', () => {
  assert.deepEqual(readAuthCallback('?room=ABCD12', '#board'), { requested: false, error: null, errorCode: null, requestId: null })
  const callback = readAuthCallback('?authCallback=1&code=private-authorization-code', '#access_token=private-session-token&refresh_token=private-refresh-token')
  const serialized = JSON.stringify(authCallbackMessage(callback, null, true))
  assert.ok(!serialized.includes('private-'))
})

test('popup messages require boolean status and plain-text optional errors', () => {
  for (const value of [null, 'chickenchess:auth-complete', { type: 'other', ok: true }, { type: 'chickenchess:auth-complete', ok: 'true' }, { type: 'chickenchess:auth-complete', ok: false, errorCode: {} }]) assert.equal(isAuthCallbackMessage(value), false)
  assert.equal(isAuthCallbackMessage(authCallbackMessage(readAuthCallback('?authCallback=1', ''), null, true)), true)
  assert.equal(isAuthCallbackMessage({ type: 'chickenchess:auth-complete', ok: false }), true)
})

test('only the existing-identity code selects existing-account retry; other failures keep their explanation', () => {
  const existing = googleLoginFailure('identity_already_exists', 'Identity is already linked to another user')
  assert.equal(existing.existingAccount, true)
  assert.match(existing.message, /Clique novamente em Continue with Google/)
  assert.deepEqual(googleLoginFailure('over_request_rate_limit', 'Tente mais tarde'), { existingAccount: false, message: 'Tente mais tarde' })
  assert.equal(googleLoginFailure(null, null).existingAccount, false)
})

test('a failed PKCE initialization preserves the SDK cause instead of reading an older clean session', async () => {
  let sessionReads = 0
  const message = await completeAuthCallback({
    initialize: async () => ({ error: { message: 'PKCE code verifier not found in storage', code: 'pkce_code_verifier_not_found' } }),
    getSession: async () => {
      sessionReads += 1
      return { data: { session: { user: { is_anonymous: false } } }, error: null }
    },
  }, readAuthCallback('?authCallback=1&code=private-code', ''))
  assert.equal(message.ok, false)
  assert.equal(message.errorCode, 'pkce_code_verifier_not_found')
  assert.equal(message.error, 'PKCE code verifier not found in storage')
  assert.equal(sessionReads, 0)
  assert.ok(!JSON.stringify(message).includes('private-code'))
})

test('successful initialization is awaited before checking the permanent callback session', async () => {
  const order = []
  const message = await completeAuthCallback({
    initialize: async () => { order.push('initialize'); return { error: null } },
    getSession: async () => {
      order.push('session')
      return { data: { session: { user: { is_anonymous: false } } }, error: null }
    },
  }, readAuthCallback('?authCallback=1', ''))
  assert.deepEqual(order, ['initialize', 'session'])
  assert.equal(message.ok, true)
})
