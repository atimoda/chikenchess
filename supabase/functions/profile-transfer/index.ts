import { authenticate, body, databaseError, failure, HttpError, preflight, respond } from '../_shared/http.ts'

Deno.serve(async (request: Request) => {
  const early = preflight(request); if (early) return early
  try {
    const { user: target, userClient, admin } = await authenticate(request)
    if (target.is_anonymous) throw new HttpError(400, 'PERMANENT_ACCOUNT_REQUIRED')
    const input = await body(request, 16384)
    if (typeof input.sourceAccessToken !== 'string' || input.sourceAccessToken.length > 8192 || !['source', 'target'].includes(String(input.choice))) throw new HttpError(400, 'INVALID_REQUEST')
    // Both live sessions are necessary; a claimed source UUID proves nothing.
    const { data: sourceAuth, error: sourceError } = await admin.auth.getUser(input.sourceAccessToken)
    if (sourceError || !sourceAuth.user || sourceAuth.user.id === target.id) throw new HttpError(401, 'UNAUTHORIZED')
    // Restrict this visitor-preservation flow to an anonymous source. Transferring
    // two permanent accounts requires a separate account-merge policy.
    if (!sourceAuth.user.is_anonymous) throw new HttpError(400, 'ANONYMOUS_SOURCE_REQUIRED')
    const { error: ensureError } = await userClient.rpc('online_profile')
    if (ensureError) databaseError(ensureError)
    const { data, error } = await admin.rpc('online_transfer_profile', { p_source: sourceAuth.user.id, p_target: target.id, p_choice: input.choice })
    if (error) databaseError(error)
    return respond(request, data)
  } catch (error) { return failure(request, error) }
})
