// Who is joining. With a Supabase access token the account is checked here, without calling Supabase per join:
// the signature is verified with the project's public keys (JWKS, fetched once and kept for an hour) or, for
// projects still on the shared secret, with SUPABASE_JWT_SECRET. Without a token the player is a guest, known
// only by the name they typed (no anonymous user is created in Supabase). Anonymous Supabase sessions count as
// guests too. Without SUPABASE_URL (local development) tokens are not checked and everyone is a guest.
import { createHmac, createPublicKey, verify as verifySignature } from 'node:crypto'
import { cleanName } from './rules.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET
const JWKS_TTL_MS = 3600_000

let jwks = null, jwksAt = 0, jwksLoading = null
async function publicKeys(force = false) {
  if (!SUPABASE_URL) return []
  if (!force && jwks && Date.now() - jwksAt < JWKS_TTL_MS) return jwks
  jwksLoading ??= fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    .then(r => (r.ok ? r.json() : { keys: [] }))
    .then(body => { jwks = Array.isArray(body?.keys) ? body.keys : []; jwksAt = Date.now(); return jwks })
    .catch(() => jwks ?? [])
    .finally(() => { jwksLoading = null })
  return jwksLoading
}

const b64 = s => Buffer.from(s, 'base64url')

/** the token's claims when its signature and expiry check out, else null */
export async function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  let header, claims
  try { header = JSON.parse(b64(parts[0])); claims = JSON.parse(b64(parts[1])) } catch { return null }
  const data = Buffer.from(`${parts[0]}.${parts[1]}`), sig = b64(parts[2])
  let ok = false
  if (header.alg === 'HS256') {
    ok = !!JWT_SECRET && createHmac('sha256', JWT_SECRET).update(data).digest().equals(sig)
  } else if (header.alg === 'ES256' || header.alg === 'RS256') {
    let keys = await publicKeys()
    if (!keys.some(k => k.kid === header.kid)) keys = await publicKeys(true) // a rotated key
    const jwk = keys.find(k => k.kid === header.kid)
    if (jwk) {
      try {
        const key = createPublicKey({ key: jwk, format: 'jwk' })
        ok = verifySignature('sha256', data, header.alg === 'ES256' ? { key, dsaEncoding: 'ieee-p1363' } : key, sig)
      } catch { ok = false }
    }
  }
  if (!ok) return null
  if (typeof claims.exp === 'number' && claims.exp * 1000 < now) return null
  if (SUPABASE_URL && claims.iss && claims.iss !== `${SUPABASE_URL}/auth/v1`) return null
  return claims
}

/** { userId, guest, name } for a join; throws when a token was sent but does not check out */
export async function authenticate(options) {
  const typed = cleanName(options?.name)
  if (!options?.token || !SUPABASE_URL) return { userId: null, guest: true, name: typed || 'Galinha' }
  const claims = await verifyToken(options.token)
  if (!claims?.sub) throw new Error('invalid token')
  const guest = claims.is_anonymous === true
  const meta = claims.user_metadata ?? {}
  return { userId: guest ? null : claims.sub, guest, name: typed || cleanName(meta.name ?? meta.full_name) || 'Galinha' }
}
