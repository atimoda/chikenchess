// Identity of a player joining the game server. With SUPABASE_URL and SUPABASE_ANON_KEY set the
// Supabase access token is verified (guests included); without them (local development) any
// name is accepted.
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

const cleanName = (name) => String(name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24)

export async function authenticate(options) {
  const look = options?.look && typeof options.look === 'object' ? options.look : null
  if (!authEnabled) return { userId: `dev-${Math.random().toString(36).slice(2, 10)}`, name: cleanName(options?.name) || 'Galinha', look }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${options?.token}` } })
  if (!res.ok) throw new Error('invalid token')
  const user = await res.json()
  return { userId: user.id, name: cleanName(options?.name) || cleanName(user.user_metadata?.name) || 'Galinha', look }
}
