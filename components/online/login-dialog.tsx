'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ONLINE_CONFIGURATION_MESSAGE, onlineErrorMessage, onlineRpc, requireOnlineClient } from '@/lib/online/client'
import type { PlayerProfile } from '@/lib/game-progression'
import type { OnlineRoom } from '@/lib/online/types'
import { useOnline } from './online-provider'
import { LegalLinks } from '@/components/legal-links'

/* global Window, URL, MessageEvent */
type LoginStep = 'email' | 'code' | 'conflict' | 'saved'
const inputClass = 'h-11 w-full rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary'

function ProfileSummary({ label, profile }: { label: string; profile: PlayerProfile | undefined }) {
  return <div className="space-y-1 rounded-md border border-white/15 bg-black/20 p-3 text-sm">
    <strong className="block text-white">{label}</strong>
    <p className="text-white/70">{profile?.goldenEggs ?? 0} golden eggs · {profile?.points ?? 0} pontos</p>
    <p className="text-xs text-white/55">{profile?.conqueredCityIds.length ?? 0} cidades · {profile?.winsCount ?? 0} vitórias</p>
  </div>
}

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
  const [existingAccount, setExistingAccount] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [savePending, setSavePending] = useState(false)
  const [now, setNow] = useState(0)
  const sourceId = useRef<string | null>(null)
  const popupRef = useRef<Window | null>(null)
  const popupWaiting = useRef(false)
  const popupClosureHandled = useRef(false)

  useEffect(() => {
    if (!open) return
    setStep(pendingTransfer ? 'conflict' : user && !user.is_anonymous && profile ? 'saved' : 'email')
    setError(null)
    setNotice(null)
    setCode('')
    setBusy(false)
    setSavePending(false)
    // Opening the dialog preserves an unresolved transfer held by the provider.
  }, [open])

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
    setStep(sourceId.current && sourceId.current !== data.session.user.id ? 'conflict' : 'saved')
    setNotice(null)
  }, [refreshProfile])

  useEffect(() => {
    if (!popupWaiting.current || !user || user.is_anonymous) return
    // Auth broadcasts still finish the flow if Google severs window.opener.
    popupWaiting.current = false
    popupRef.current?.close()
    popupRef.current = null
    void finishLogin().catch((cause) => setError(onlineErrorMessage(cause))).finally(() => setBusy(false))
  }, [user?.id, user?.is_anonymous, finishLogin])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popupRef.current || event.data?.type !== 'chickenchess:auth-complete') return
      popupWaiting.current = false
      popupRef.current = null
      if (!event.data.ok) {
        setError('O login Google não foi concluído. Tente novamente ou use email.')
        setBusy(false)
        return
      }
      void finishLogin().catch((cause) => setError(onlineErrorMessage(cause))).finally(() => setBusy(false))
    }
    window.addEventListener('message', onMessage)
    const timer = setInterval(() => {
      if (!popupWaiting.current || !popupRef.current?.closed || popupClosureHandled.current) return
      popupClosureHandled.current = true
      // COOP may detach the handle before login finishes. Keep watching Auth
      // while allowing retry/cancel; never discard the in-memory guest source.
      void finishLogin().then(() => { popupWaiting.current = false; popupRef.current = null }).catch(() => setError('Se o login Google não foi concluído, tente novamente ou use email.')).finally(() => setBusy(false))
    }, 1000)
    return () => { window.removeEventListener('message', onMessage); clearInterval(timer) }
  }, [finishLogin])

  const captureSource = async () => {
    const current = await ensureGuest()
    if (current.is_anonymous && existingAccount) {
      const activeRoom = await onlineRpc<OnlineRoom | null>('online_room', { p_action: 'get', p_code: null })
      if (activeRoom) throw new Error('Saia da sala ou termine a partida antes de entrar em uma conta existente. Seu perfil visitante continua conectado.')
    }
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
      const current = await captureSource()
      const online = requireOnlineClient()
      const address = email.trim()
      const type = current.is_anonymous && !existingAccount ? 'email_change' : 'email'
      const result = type === 'email_change'
        ? await online.auth.updateUser({ email: address })
        : await online.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } })
      if (result.error) {
        if (type === 'email_change' && ['email_exists', 'user_already_exists', 'identity_already_exists'].includes(result.error.code || '')) {
          setExistingAccount(true)
          throw new Error('Este email já tem uma conta. Sua cópia de visitante foi guardada. Clique em Email me a code para entrar nessa conta.')
        }
        throw result.error
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
    setBusy(true)
    const popup = window.open('about:blank', 'chickenchess-google-login', 'popup,width=500,height=700')
    if (!popup) {
      setBusy(false)
      setError('Permita a janela de login Google no navegador ou use email.')
      return
    }
    popupRef.current = popup
    try {
      const current = await captureSource()
      const redirect = new URL('/', window.location.origin)
      redirect.searchParams.set('authCallback', '1')
      const options = { redirectTo: redirect.toString(), skipBrowserRedirect: true }
      const online = requireOnlineClient()
      const result = current.is_anonymous && !existingAccount
        ? await online.auth.linkIdentity({ provider: 'google', options })
        : await online.auth.signInWithOAuth({ provider: 'google', options })
      if (result.error) throw result.error
      if (!result.data.url) throw new Error('Não foi possível abrir o login Google.')
      popupWaiting.current = true
      popupClosureHandled.current = false
      popup.location.href = result.data.url
    } catch (cause) {
      popup.close()
      popupRef.current = null
      popupWaiting.current = false
      setBusy(false)
      setError(onlineErrorMessage(cause))
    }
  }

  const chooseProfile = async (choice: 'source' | 'target') => {
    setBusy(true)
    setError(null)
    try {
      await resolveProfileTransfer(choice)
      sourceId.current = null
      setStep('saved')
    } catch (cause) { setError(onlineErrorMessage(cause)) } finally { setBusy(false) }
  }

  const changeOpen = (next: boolean) => {
    if (!next && popupWaiting.current) {
      popupWaiting.current = false
      popupRef.current?.close()
      popupRef.current = null
      setBusy(false)
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
        <DialogTitle className="text-xl font-semibold">{step === 'conflict' ? 'Escolha o perfil' : step === 'saved' ? 'Perfil salvo' : 'Sign in to save your profile'}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-white/60">
          {step === 'conflict' ? 'A conta já tem um perfil. Escolha qual progresso usar; os saldos não serão somados e as duas cópias ficam guardadas.'
            : step === 'saved' ? 'Seu perfil foi confirmado pelo servidor e pode ser recuperado nesta conta.'
              : 'Conecte Google ou email para recuperar seu perfil em outros aparelhos.'}
        </DialogDescription>
      </DialogHeader>
      {!configured ? <p className="rounded border border-white/15 p-3 text-sm text-white/70">{ONLINE_CONFIGURATION_MESSAGE}</p>
        : step === 'saved' ? <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/10 p-3"><Check className="text-primary" /><div><strong>{profile?.display_name}</strong><p className="text-xs text-white/60">{user?.email || 'Conta Google conectada'}</p></div></div>
          <Button className="w-full" onClick={() => onOpenChange(false)}>Continuar</Button>
        </div>
          : step === 'conflict' ? <div className="space-y-3">
            <ProfileSummary label="Perfil visitante" profile={pendingTransfer?.sourceProfile} />
            <Button className="w-full" disabled={busy || !pendingTransfer} onClick={() => void chooseProfile('source')}>Usar perfil visitante</Button>
            <ProfileSummary label="Perfil da conta" profile={profile?.profile} />
            <Button variant="outline" className="w-full border-white/20 bg-transparent" disabled={busy || !pendingTransfer || !profile} onClick={() => void chooseProfile('target')}>Usar perfil da conta</Button>
            <p className="text-xs leading-relaxed text-white/50">As amizades são transferidas sem aceitar pedidos automaticamente. Uma partida ativa precisa terminar antes da transferência.</p>
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
                <label className="flex items-center gap-2 text-xs text-white/65"><input type="checkbox" className="accent-[#71c486]" checked={existingAccount} onChange={(event) => setExistingAccount(event.target.checked)} disabled={busy} />Já tenho uma conta</label>
                <p className="text-xs leading-relaxed text-white/45">O perfil visitante é vinculado à conta nova. Ao entrar em uma conta existente, você escolhe o progresso que deseja conservar.</p>
              </div>}
      {error && <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      {savePending && <Button disabled={busy} onClick={() => void retrySave()}>Tentar salvar perfil</Button>}
      {notice && <p role="status" className="text-xs text-primary">{notice}</p>}
      {busy && <p role="status" className="text-xs text-white/60">{popupWaiting.current ? 'Aguardando Google…' : 'Aguarde…'}</p>}
      <div className="space-y-2 border-t border-white/10 pt-3 text-center">
        <p className="text-xs leading-relaxed text-white/50">By signing in, you agree to our Terms of Service. Our Privacy Policy explains how we handle your information.</p>
        <LegalLinks newTab className="text-white/65" />
      </div>
      {step !== 'saved' && <Button variant="ghost" className="text-white/60" onClick={() => changeOpen(false)}>Cancel</Button>}
    </DialogContent>
  </Dialog>
}
