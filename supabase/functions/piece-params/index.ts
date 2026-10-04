import { parsePieceParams } from './params.js'
import { authenticate, body, databaseError, failure, HttpError, preflight, respond, uuid } from '../_shared/http.ts'

Deno.serve(async (request: Request) => {
  const early = preflight(request); if (early) return early
  try {
    const { user, userClient, admin } = await authenticate(request)
    const input = await body(request, 131072)
    if (!uuid(input.matchId)) throw new HttpError(400, 'INVALID_REQUEST')
    const { data: match, error: membershipError } = await userClient.rpc('get_online_match', { p_match_id: input.matchId })
    if (membershipError) databaseError(membershipError)
    let params
    try { params = parsePieceParams({ pieceId: input.pieceId, instrument: input.instrument, effects: input.effects }, match.context_city_id) }
    catch { throw new HttpError(400, 'INVALID_PARAMS') }
    const { data, error } = await admin.rpc('online_commit_piece', { p_match_id: input.matchId, p_actor: user.id, p_piece_id: params.pieceId, p_instrument: params.instrument, p_effects: params.effects ?? null })
    if (error) databaseError(error)
    return respond(request, data)
  } catch (error) { return failure(request, error) }
})
