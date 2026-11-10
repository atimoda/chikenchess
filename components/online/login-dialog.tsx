'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ONLINE_CONFIGURATION_MESSAGE, onlineErrorMessage, onlineRpc, requireOnlineClient } from '@/lib/online/client'
import type { OnlineRoom } from '@/lib/online/types'
import { AUTH_CALLBACK_CHANNEL, emailAlreadyRegistered, googleLoginFailure, isAuthCallbackMessage } from '@/lib/online/auth-callback'
import { useOnline, type MigrationSummary } from './online-provider'
import { LegalLinks } from '@/components/legal-links'

/* global Window, URL, MessageEvent, BroadcastChannel, crypto */
type LoginStep = 'email' | 'code' | 'conflict' | 'saved'
const inputClass = 'h-11 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary'

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.7-2.4L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.4 13.7a6 6 0 0 1 0-3.4V7.6H3a10 10 0 0 0 0 8.8l3.4-2.7Z" />
    <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.6l3.4 2.7c.8-2.4 3-4.2 5.6-4.2Z" />
  </svg>
}

export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { configured, user, profile, ensureGuest, prepareSignIn, refreshProfile, pendingTransfer, resolveProfileTransfer } = useOnline()
  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [otpType, setOtpType] = useState<'email' | 'email_change'>('email')
  // Set only when Google reports the identity already belongs to an account, so the next click signs in to it.
  const [existingAccount, setExistingAccount] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [savePending, setSavePending] = useState(false)
  const [now, setNow] = useState(0)
  const [migratedSummary, setMigratedSummary] = useState<MigrationSummary | null>(null)
  const sourceId = useRef<string | null>(null)
  const popupRef = useRef<Window | null>(null)
  const popupWaiting = useRef(false)
  const popupRequestId = useRef<string | null>(null)

  const executeMerge = useCallback(async (afterLogin = false) => {
    setBusy(true)
    setError(null)
    try {
      const summary = await resolveProfileTransfer()
      if (summary) {
        setMigratedSummary(summary)
      } else if (pendingTransfer) {
        setMigratedSummary({
          eggs: pendingTransfer.sourceProfile.goldenEggs || 0,
          points: pendingTransfer.sourceProfile.points || 0,
          friends: pendingTransfer.sourceFriendsCount || 0,
        })
      }
      sourceId.current = null
      setStep('conflict')
    } catch (cause) {
      if (afterLogin || user && !user.is_anonymous && profile) {
        // Authentication and profile loading already succeeded. A failed
        // best-effort guest transfer must not make the completed login look failed.
        setError(null)
        setStep('saved')
        setNotice('Login realizado. A cópia do perfil visitante continua guardada neste navegador.')
      } else {
        setError(onlineErrorMessage(cause))
      }
    } finally {
      setBusy(false)
    }
  }, [resolveProfileTransfer, pendingTransfer, user, profile])

  useEffect(() => {
    if (!open) return
    setStep(pendingTransfer ? 'conflict' : user && !user.is_anonymous && profile ? 'saved' : 'email')
    setError(null)
    setNotice(null)
    setCode('')
    setBusy(false)
    setSavePending(false)
    setMigratedSummary(null)
    if (pendingTransfer) {
      void executeMerge()
    }
  }, [open, pendingTransfer, user, profile, executeMerge])

  useEffect(() => {
    if (step !== 'code' || !open) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [step, open])

  const finishLogin = useCallback(async () => {
    const { data, error: sessionError } = await requireOnlineClient().auth.getSession()
    if (sessionError) throw sessionError
    if (!data.session?.user || data.session.user.is_anonymous) throw new Error('O login ainda não foi confirmado. Tente novamente.')
    let saved
    try { saved = await refreshProfile() } catch (cause) { setSavePending(true); throw cause }
    if (!saved) throw new Error('Conta conectada. O perfil ainda precisa ser salvo; tente novamente.')
    setSavePending(false)
    if (sourceId.current && sourceId.current !== data.session.user.id && pendingTransfer) {
      setStep('conflict')
      void executeMerge(true)
    } else {
      sourceId.current = null
      setStep('saved')
    }
    setNotice(null)
  }, [refreshProfile, executeMerge, pendingTransfer])

  useEffect(() => {
    if (!popupWaiting.current || !user || user.is_anonymous) return
    // Auth broadcasts still finish the flow if Google severs window.opener.
    popupWaiting.current = false
    popupRef.current?.close()
    popupRef.current = null
    void finishLogin().catch((cause) => setError(onlineErrorMessage(cause))).finally(() => setBusy(false))
  }, [user?.id, user?.is_anonymous, finishLogin])

  useEffect(() => {
    const finishFromCallback = (value: unknown) => {
      if (!popupWaiting.current || !isAuthCallbackMessage(value) || value.requestId !== popupRequestId.current) return
      popupWaiting.current = false
      popupRef.current = null
      popupRequestId.current = null
      if (!value.ok) {
        const failure = googleLoginFailure(value.errorCode, value.error)
        if (failure.existingAccount) setExistingAccount(true)
        setError(failure.message)
        setBusy(false)
        return
      }
      void finishLogin().catch((cause) => setError(onlineErrorMessage(cause))).finally(() => setBusy(false))
    }
    const onMessage = (event: MessageEvent) => {
      if (!popupRef.current || event.origin !== window.location.origin || event.source !== popupRef.current) return
      finishFromCallback(event.data)
    }
    const channel = new BroadcastChannel(AUTH_CALLBACK_CHANNEL)
    const onBroadcast = (event: MessageEvent) => finishFromCallback(event.data)
    channel.addEventListener('message', onBroadcast)
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage); channel.removeEventListener('message', onBroadcast); channel.close() }
  }, [finishLogin])

  const ensureNoActiveRoom = async () => {
    const activeRoom = await onlineRpc<OnlineRoom | null>('online_room', { p_action: 'get', p_code: null })
    if (activeRoom) throw new Error('Saia da sala ou termine a partida antes de entrar em uma conta existente. Seu perfil visitante continua conectado.')
  }

  const captureSource = async (switchingAccount: boolean) => {
    const current = await ensureGuest()
    if (current.is_anonymous && switchingAccount) await ensureNoActiveRoom()
    sourceId.current = current.is_anonymous ? current.id : null
    await prepareSignIn()
    return current
  }

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const current = await captureSource(false)
      const online = requireOnlineClient()
      const address = email.trim()
      // A new email becomes an account on the guest identity itself (welcome email with the code);
      // an email that already has an account just receives the sign-in code.
      let type: 'email' | 'email_change' = current.is_anonymous ? 'email_change' : 'email'
      if (type === 'email_change') {
        const linked = await online.auth.updateUser({ email: address })
        if (linked.error) {
          if (!emailAlreadyRegistered(linked.error.code)) throw linked.error
          type = 'email'
          await ensureNoActiveRoom()
        }
      }
      if (type === 'email') {
        const result = await online.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } })
        if (result.error) throw result.error
      }
      setEmail(address)
      setOtpType(type)
      setCode('')
      setResendAt(Date.now() + 60_000)
      setStep('code')
    } catch (cause) { setError(onlineErrorMessage(cause)) } finally { setBusy(false) }
  }

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error: otpError } = await requireOnlineClient().auth.verifyOtp({ email, token: code, type: otpType })
      if (otpError) throw otpError
      await finishLogin()
    } catch (cause) { setError(onlineErrorMessage(cause)) } finally { setBusy(false) }
  }

  const resendCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const online = requireOnlineClient()
      const result = otpType === 'email_change'
        ? await online.auth.resend({ type: 'email_change', email })
        : await online.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      if (result.error) throw result.error
      setResendAt(Date.now() + 60_000)
      setNotice('Novo código enviado. Confira também a pasta de spam.')
    } catch (cause) { setError(onlineErrorMessage(cause)) } finally { setBusy(false) }
  }

  const signInGoogle = async () => {
    setError(null)
    setNotice(null)
    setBusy(true)
    const popup = window.open('about:blank', 'chickenchess-google-login', 'popup,width=500,height=700')
    if (!popup) {
      setBusy(false)
      setError('Permita a janela de login Google no navegador ou use email.')
      return
    }
    popupRef.current = popup
    try {
      const current = await captureSource(existingAccount)
      const redirect = new URL('/', window.location.origin)
      redirect.searchParams.set('authCallback', '1')
      const requestId = crypto.randomUUID()
      popupRequestId.current = requestId
      redirect.searchParams.set('authCallbackId', requestId)
      const options = { redirectTo: redirect.toString(), skipBrowserRedirect: true }
      const online = requireOnlineClient()
      const result = current.is_anonymous && !existingAccount
        ? await online.auth.linkIdentity({ provider: 'google', options })
        : await online.auth.signInWithOAuth({ provider: 'google', options })
      if (result.error) throw result.error
      if (!result.data.url) throw new Error('Não foi possível abrir o login Google.')
      popupWaiting.current = true
      popup.location.href = result.data.url
    } catch (cause) {
      popup.close()
      popupRef.current = null
      popupWaiting.current = false
      popupRequestId.current = null
      setBusy(false)
      const code = cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string' ? cause.code : null
      const failure = googleLoginFailure(code, onlineErrorMessage(cause))
      if (failure.existingAccount) setExistingAccount(true)
      setError(failure.message)
    }
  }

  const changeOpen = (next: boolean) => {
    if (!next && popupWaiting.current) {
      popupWaiting.current = false
      popupRequestId.current = null
      popupRef.current?.close()
      popupRef.current = null
      setBusy(false)
    }
    if (!next) {
      setMigratedSummary(null)
    }
    onOpenChange(next)
  }

  const retrySave = async () => {
    setBusy(true)
    setError(null)
    try { await finishLogin() } catch (cause) { setError(onlineErrorMessage(cause)) } finally { setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto border-primary/30 bg-[#101713] text-[#dfe8df]" closeLabel="Fechar login">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">{step === 'conflict' ? 'Perfil visitante migrado' : step === 'saved' ? 'Perfil salvo' : 'Sign in to save your profile'}</DialogTitle>
        {(step === 'conflict' || step === 'saved') && <DialogDescription className="text-sm leading-relaxed text-white/60">
          {step === 'conflict' ? 'Os dados do perfil visitante foram integrados à sua conta.' : 'Seu perfil foi confirmado pelo servidor e pode ser recuperado nesta conta.'}
        </DialogDescription>}
      </DialogHeader>
      {!configured ? <p className="rounded border border-white/15 p-3 text-sm text-white/70">{ONLINE_CONFIGURATION_MESSAGE}</p>
        : step === 'saved' ? <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/10 p-3"><Check className="text-primary" /><div><strong>{profile?.display_name}</strong><p className="text-xs text-white/60">{user?.email || 'Conta Google conectada'}</p></div></div>
          <Button className="w-full" onClick={() => onOpenChange(false)}>Continuar</Button>
        </div>
          : step === 'conflict' ? <div className="space-y-4">
            {busy ? (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-white/70">Integrando perfil visitante…</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
                <Button className="w-full" disabled={busy} onClick={() => void executeMerge()}>Tentar integrar novamente</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/30 bg-[#14231b] p-4 text-center">
                  <p className="text-sm leading-relaxed text-white">
                    <strong>{migratedSummary?.eggs ?? pendingTransfer?.sourceProfile.goldenEggs ?? 0}</strong> golden eggs and <strong>{migratedSummary?.points ?? pendingTransfer?.sourceProfile.points ?? 0}</strong> historical points and <strong>{migratedSummary?.friends ?? pendingTransfer?.sourceFriendsCount ?? 0}</strong> friends were migrated from the &ldquo;Perfil visitante&rdquo; para o seu perfil.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md border border-white/10 bg-black/20 p-2.5">
                    <span className="block text-lg font-bold text-amber-300">+{migratedSummary?.eggs ?? pendingTransfer?.sourceProfile.goldenEggs ?? 0}</span>
                    <span className="text-white/60">Eggs &rarr; Pontos</span>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/20 p-2.5">
                    <span className="block text-lg font-bold text-primary">+{migratedSummary?.points ?? pendingTransfer?.sourceProfile.points ?? 0}</span>
                    <span className="text-white/60">Pontos hist.</span>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/20 p-2.5">
                    <span className="block text-lg font-bold text-sky-400">+{migratedSummary?.friends ?? pendingTransfer?.sourceFriendsCount ?? 0}</span>
                    <span className="text-white/60">Amizades</span>
                  </div>
                </div>
                <Button className="h-11 w-full text-base font-medium" onClick={() => changeOpen(false)}>
                  Ok!
                </Button>
              </div>
            )}
          </div>
            : step === 'code' ? <form className="space-y-4" onSubmit={(event) => void verifyCode(event)}>
              <p className="text-sm text-white/70">Enviamos um código para <strong className="break-all text-white">{email}</strong>.</p>
              <label className="block space-y-2"><span className="text-sm">Código de acesso</span><input autoFocus className={`${inputClass} text-center font-mono text-xl tracking-[0.3em]`} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required disabled={busy} /></label>
              <Button className="w-full" type="submit" disabled={busy || code.length < 6}>{busy ? <Loader2 className="animate-spin" /> : <Mail />}Verify code</Button>
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <button type="button" disabled={busy} className="text-white/70 underline underline-offset-4 disabled:opacity-40" onClick={() => { setStep('email'); setError(null); setNotice(null) }}>Corrigir email</button>
                <button type="button" disabled={busy || now < resendAt} className="text-primary underline underline-offset-4 disabled:opacity-40" onClick={() => void resendCode()}>{now < resendAt ? `Reenviar em ${Math.ceil((resendAt - now) / 1000)}s` : 'Reenviar código'}</button>
              </div>
            </form>
              : <div className="space-y-4">
                <Button variant="outline" className="h-11 w-full border-white/20 bg-[#0b1512] text-white hover:bg-[#182820] hover:text-white dark:border-white/20 dark:bg-[#0b1512] dark:hover:bg-[#182820]" disabled={busy} onClick={() => void signInGoogle()}><GoogleIcon />Continue with Google</Button>
                <div className="flex items-center gap-3 text-xs text-white/45"><span className="h-px flex-1 bg-white/15" />OR<span className="h-px flex-1 bg-white/15" /></div>
                <form className="space-y-3" onSubmit={(event) => void sendCode(event)}>
                  <label className="block space-y-2"><span className="text-sm">Email</span><input className={inputClass} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} required /></label>
                  <Button className="h-11 w-full" type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Mail />}Email me a code</Button>
                </form>
              </div>}
      {error && <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      {savePending && <Button disabled={busy} onClick={() => void retrySave()}>Tentar salvar perfil</Button>}
      {notice && <p role="status" className="text-xs text-primary">{notice}</p>}
      {busy && <p role="status" className="text-xs text-white/60">{popupWaiting.current ? 'Aguardando Google…' : 'Aguarde…'}</p>}
      <div className="space-y-2 border-t border-white/10 pt-3 text-center">
        <p className="text-xs leading-relaxed text-white/50">By signing in, you agree to our Terms of Service. Our Privacy Policy explains how we handle your information.</p>
        <LegalLinks newTab className="text-white/65" />
      </div>
      {step !== 'saved' && step !== 'conflict' && <Button variant="ghost" className="text-white/60" onClick={() => changeOpen(false)}>Cancel</Button>}
    </DialogContent>
  </Dialog>
}
