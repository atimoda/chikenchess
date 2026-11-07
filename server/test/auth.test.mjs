import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, generateKeyPairSync, sign } from 'node:crypto'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_JWT_SECRET = 'segredo-de-teste'
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'ES256' }
let jwksCalls = 0
globalThis.fetch = async url => { jwksCalls++; assert.match(String(url), /jwks\.json$/); return { ok: true, json: async () => ({ keys: [jwk] }) } }
const { authenticate, verifyToken } = await import('../src/auth.mjs')

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const claims = (extra = {}) => ({ sub: 'u1', iss: 'https://example.supabase.co/auth/v1', exp: Math.floor(Date.now() / 1000) + 600, user_metadata: { name: 'Titi' }, ...extra })
const hs = c => { const d = `${b64({ alg: 'HS256' })}.${b64(c)}`; return `${d}.${createHmac('sha256', 'segredo-de-teste').update(d).digest('base64url')}` }
const es = c => { const d = `${b64({ alg: 'ES256', kid: 'k1' })}.${b64(c)}`; return `${d}.${sign('sha256', Buffer.from(d), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}` }

test('accounts are checked here, by signature and expiry; guests need only a name', async () => {
  assert.deepEqual(await authenticate({ token: hs(claims()) }), { userId: 'u1', guest: false, name: 'Titi' })
  assert.deepEqual(await authenticate({ token: es(claims()), name: 'Outro' }), { userId: 'u1', guest: false, name: 'Outro' })
  await authenticate({ token: es(claims()) })
  assert.equal(jwksCalls, 1) // the public keys are fetched once
  assert.equal(await verifyToken(hs(claims({ exp: 1 }))), null)
  assert.equal(await verifyToken(hs(claims()).slice(0, -2) + 'xx'), null)
  assert.equal(await verifyToken(hs(claims({ iss: 'https://other/auth/v1' }))), null)
  await assert.rejects(authenticate({ token: 'nope' }), /invalid token/)
  assert.deepEqual(await authenticate({ token: hs(claims({ is_anonymous: true })) }), { userId: null, guest: true, name: 'Titi' })
  assert.deepEqual(await authenticate({ name: '  <Zé>  ' }), { userId: null, guest: true, name: 'Zé' })
})
