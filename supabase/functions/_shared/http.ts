import { createClient } from 'npm:@supabase/supabase-js@2.117.2'

export class HttpError extends Error {
  constructor(public status: number, public code: string, public detail: string = code) { super(detail) }
}

const allowedOrigins = () => (Deno.env.get('ONLINE_ALLOWED_ORIGINS') ?? 'http://localhost:3000').split(',').map(v => v.trim()).filter(Boolean)
export function headers(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    ...(origin && allowedOrigins().includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
export function respond(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) })
}
export function preflight(request: Request): Response | null {
  const origin = request.headers.get('origin')
  if (origin && !allowedOrigins().includes(origin)) return respond(request, { error: 'ORIGIN_NOT_ALLOWED', code: 'ORIGIN_NOT_ALLOWED' }, 403)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) })
  if (request.method !== 'POST') return respond(request, { error: 'METHOD_NOT_ALLOWED', code: 'METHOD_NOT_ALLOWED' }, 405)
  return null
}
export async function body(request: Request, limit: number): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('content-length'))
  if (declared > limit) throw new HttpError(413, 'BODY_TOO_LARGE')
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON_REQUIRED')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'INVALID_REQUEST')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    size += chunk.value.byteLength
    if (size > limit) { await reader.cancel(); throw new HttpError(413, 'BODY_TOO_LARGE') }
    chunks.push(chunk.value)
  }
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch { throw new HttpError(400, 'INVALID_REQUEST') }
}
export function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
function env(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new HttpError(503, 'BACKEND_NOT_CONFIGURED')
  return value
}
export async function authenticate(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'UNAUTHORIZED')
  const token = authorization.slice(7)
  const userClient = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
  // Auth validates a real, current session. Never infer a user id from decoded JWT.
  const { data, error } = await userClient.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'UNAUTHORIZED')
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
  return { user: data.user, userClient, admin }
}
export function databaseError(error: { code?: string; message?: string }): never {
  const code = error.message ?? 'DATABASE_ERROR'
  const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : ['PT409', '40001', '23505', '23514'].includes(error.code ?? '') ? 409 : error.code === '22023' ? 400 : 500
  throw new HttpError(status, status === 500 ? 'DATABASE_ERROR' : code)
}
export function failure(request: Request, error: unknown) {
  if (error instanceof HttpError) return respond(request, { error: error.detail, code: error.code }, error.status)
  return respond(request, { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR' }, 500)
}
