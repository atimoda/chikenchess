import { applyMatchCommand, parseMatchCommand } from './domain.js'
import { authenticate, body, databaseError, failure, HttpError, preflight, respond, uuid } from '../_shared/http.ts'

Deno.serve(async (request: Request) => {
  const early = preflight(request); if (early) return early
  try {
    const { user, userClient, admin } = await authenticate(request)
    const input = await body(request, 32768)
    if (!uuid(input.matchId) || !uuid(input.commandId) || !Number.isSafeInteger(input.expectedVersion) || Number(input.expectedVersion) < 0) throw new HttpError(400, 'INVALID_REQUEST')
    let command
    try { command = parseMatchCommand(input.command) } catch { throw new HttpError(400, 'INVALID_COMMAND') }
    const { data: match, error: readError } = await userClient.rpc('get_online_match', { p_match_id: input.matchId })
    if (readError) databaseError(readError)
    const member = match?.members?.find((m: { user_id: string }) => m.user_id === user.id)
    if (!member) throw new HttpError(403, 'FORBIDDEN')
    // Retry an already accepted command BEFORE evaluating it on the newer state.
    // A retry after resignation, rematch or a paid power returns the latest authorized snapshot without applying the command again.
    const { data: receipt, error: receiptError } = await admin.from('online_match_commands').select('actor_id,expected_version,command,response').eq('match_id', input.matchId).eq('command_id', input.commandId).maybeSingle()
    if (receiptError) databaseError(receiptError)
    if (receipt) {
      if (receipt.actor_id !== user.id || receipt.expected_version !== input.expectedVersion || !sameJson(receipt.command, command)) throw new HttpError(409, 'COMMAND_ID_REUSED')
      return respond(request, match)
    }
    if (match.version !== input.expectedVersion) throw new HttpError(409, 'VERSION_CONFLICT')
    let next
    try { next = applyMatchCommand(match.state, member.color, command, Date.now()) }
    catch (error) { throw new HttpError(400, 'RULE_REJECTED', error instanceof Error ? error.message : 'Invalid command') }
    const { data, error } = await admin.rpc('online_commit_match', {
      p_match_id: input.matchId, p_actor: user.id, p_command_id: input.commandId,
      p_expected_version: input.expectedVersion, p_state: next, p_command: command,
    })
    if (error) databaseError(error)
    return respond(request, data)
  } catch (error) { return failure(request, error) }
})

function sameJson(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, canonical(val)])) : value
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
}
