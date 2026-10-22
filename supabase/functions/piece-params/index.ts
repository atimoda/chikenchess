import { parsePieceParams } from './params.js'
import { authenticate, body, databaseError, failure, HttpError, preflight, respond, uuid } from '../_shared/http.ts'

Deno.serve(async (request: Request) => {
  const early = preflight(request); if (early) return early
  try {
    const { user, userClient, admin } = await authenticate(request)
    const input = await body(request, 131072)
    if (!uuid(input.matchId)) throw new HttpError(400, 'INVALID_REQUEST')
    // Membership plus the musical context; the full match is only read until
    // the lighter RPC has been migrated.
    let { data: contextCityId, error: membershipError } = await userClient.rpc('online_match_context', { p_match_id: input.matchId })
    if (membershipError?.code === 'PGRST202') {
      const legacy = await userClient.rpc('get_online_match', { p_match_id: input.matchId })
      contextCityId = legacy.data?.context_city_id
      membershipError = legacy.error
    }
    if (membershipError) databaseError(membershipError)
    let params
    try { params = parsePieceParams({ pieceId: input.pieceId, instrument: input.instrument, effects: input.effects }, contextCityId) }
    catch { throw new HttpError(400, 'INVALID_PARAMS') }
    const { data, error } = await admin.rpc('online_commit_piece', { p_match_id: input.matchId, p_actor: user.id, p_piece_id: params.pieceId, p_instrument: params.instrument, p_effects: params.effects ?? null })
    if (error) databaseError(error)
    // The author already has the piece; echoing it back would only cost egress.
    return respond(request, { piece_id: data.piece_id, revision: data.revision })
  } catch (error) { return failure(request, error) }
})
