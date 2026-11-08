/* global URLSearchParams */

export interface AuthCallback {
  requested: boolean
  error: string | null
  errorCode: string | null
  requestId: string | null
}

export interface AuthCallbackMessage {
  type: 'chickenchess:auth-complete'
  ok: boolean
  error: string | null
  errorCode: string | null
  requestId?: string
}

export const AUTH_CALLBACK_CHANNEL = 'chickenchess:auth-complete'

interface CallbackAuthClient {
  initialize: () => Promise<{ error: { message: string; code?: string } | null }>
  getSession: () => Promise<{
    data: { session: { user: { is_anonymous?: boolean } } | null }
    error: { message: string; code?: string } | null
  }>
}

/** Read OAuth failures even when Supabase falls back to Site URL without our flag. */
export function readAuthCallback(search: string, hash: string): AuthCallback {
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const value = (key: string) => query.get(key) || fragment.get(key)
  const errorCode = value('error_code')
  return {
    requested: query.get('authCallback') === '1',
    error: value('error_description') || value('error') || errorCode,
    errorCode,
    requestId: query.get('authCallbackId'),
  }
}

export function authCallbackMessage(
  callback: AuthCallback,
  sessionError: { message: string; code?: string } | null,
  hasPermanentSession: boolean,
): AuthCallbackMessage {
  // An existing stored session must never turn a failed OAuth attempt into success.
  const error = callback.error || sessionError?.message || (!hasPermanentSession ? 'O login ainda não foi confirmado. Tente novamente.' : null)
  return {
    type: 'chickenchess:auth-complete',
    ok: !error && hasPermanentSession,
    error,
    errorCode: callback.errorCode || sessionError?.code || null,
    ...(callback.requestId ? { requestId: callback.requestId } : {}),
  }
}

/** Initialization reports code-exchange errors that getSession does not return. */
export async function completeAuthCallback(auth: CallbackAuthClient, callback: AuthCallback): Promise<AuthCallbackMessage> {
  const { error: initializationError } = await auth.initialize()
  if (callback.error || initializationError) return authCallbackMessage(callback, initializationError, false)
  const { data, error: sessionError } = await auth.getSession()
  return authCallbackMessage(callback, sessionError, Boolean(data.session?.user && !data.session.user.is_anonymous))
}

export function isAuthCallbackMessage(value: unknown): value is AuthCallbackMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<AuthCallbackMessage>
  return message.type === 'chickenchess:auth-complete' && typeof message.ok === 'boolean'
    && (message.error == null || typeof message.error === 'string')
    && (message.errorCode == null || typeof message.errorCode === 'string')
    && (message.requestId == null || typeof message.requestId === 'string')
}

export function googleLoginFailure(errorCode: string | null | undefined, error: string | null): { existingAccount: boolean; message: string } {
  if (errorCode === 'identity_already_exists') {
    return {
      existingAccount: true,
      message: 'Este Google já está ligado a uma conta ChickenChess. Clique novamente em Continue with Google para entrar nessa conta; seu progresso visitante será integrado a ela.',
    }
  }
  return { existingAccount: false, message: error || 'O login Google não foi concluído. Tente novamente ou use email.' }
}

const EXISTING_EMAIL_CODES = new Set(['email_exists', 'user_already_exists', 'identity_already_exists'])

/** True when linking an email to the guest failed because that email already has an account. */
export function emailAlreadyRegistered(errorCode: string | null | undefined): boolean {
  return !!errorCode && EXISTING_EMAIL_CODES.has(errorCode)
}
