"use client"

/* global HTMLInputElement */
import { useEffect, useRef, useState } from 'react'
import { Check, Eye, EyeOff, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cities } from '@/lib/cities-data'
import { resetCampaign, type PlayerProfile } from '@/lib/game-progression'
import { onlineErrorMessage } from '@/lib/online/client'
import { useOnline } from './online-provider'
import { useT } from '@/lib/i18n'

export function ProfilePane({ playerProfile, onSignIn }: { playerProfile: PlayerProfile | null; onSignIn: () => void }) {
  const t = useT()
  const online = useOnline()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const identityRef = useRef(online.user?.id)
  identityRef.current = online.user?.id
  const googleIdentity = online.user?.identities?.find(identity => identity.provider === 'google')
  const googleValue = googleIdentity?.identity_data?.full_name || googleIdentity?.identity_data?.name || (googleIdentity ? online.user?.user_metadata?.full_name || online.user?.user_metadata?.name : null)
  const googleName = typeof googleValue === 'string' ? Array.from(googleValue).filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join('').trim().slice(0, 40) : ''
  useEffect(() => { setEditing(false); setName(''); setError(null); setMessage(null); setShowEmail(false) }, [online.user?.id])
  useEffect(() => { if (editing) nameInputRef.current?.focus() }, [editing])
  const saveName = async (value: string) => {
    const actor = online.user?.id
    setBusy(true); setError(null); setMessage(null)
    try {
      await online.ensureGuest()
      if (identityRef.current !== actor) return
      const nextName = value.trim() || online.profile?.baptismal_name || online.profile?.display_name || ''
      await online.refreshProfile(nextName)
      if (identityRef.current === actor) { setEditing(false); setMessage(t('Public name saved.')) }
    } catch (cause) { if (identityRef.current === actor) setError(onlineErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  const logOut = async () => {
    setBusy(true); setError(null)
    try { await online.signOut() }
    catch (cause) { setError(onlineErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  return (
      <div className="space-y-4">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="text-5xl leading-none">🐔</span>
              <h2 className="min-w-0 flex-1 break-words font-mono text-xl">{online.profile?.display_name ?? (online.user ? t('Loading profile…') : t('Guest profile'))}</h2>
              <Button size="icon" variant="ghost" className="size-8 shrink-0 border border-transparent text-white hover:border-primary hover:bg-transparent hover:text-white hover:drop-shadow-[0_0_4px_var(--primary)] focus-visible:border-primary focus-visible:bg-transparent focus-visible:text-white focus-visible:drop-shadow-[0_0_4px_var(--primary)]" aria-label={t('Edit profile name')} title={t('Edit')} disabled={!online.profile || busy} onClick={() => { setName(online.profile?.display_name || ''); setEditing(current => !current); setError(null); setMessage(null) }}><Pencil className="size-4" /></Button>
            </div>
          <div className="space-y-4 font-mono">
            {editing && <form className="space-y-2" onSubmit={event => { event.preventDefault(); void saveName(name) }}>
              <label htmlFor="profile-display-name" className="text-xs text-white/60">{t('Public name')}</label>
              <input ref={nameInputRef} id="profile-display-name" className="h-10 w-full min-w-0 rounded-md border border-white/20 bg-black/30 px-3 text-sm outline-none focus:border-primary" value={name} placeholder={online.profile?.baptismal_name} disabled={busy} onChange={event => setName(event.target.value)} maxLength={40} />
              <p className="text-[11px] text-white/45">{t('Leave empty to use your baptismal name.')}</p>
              <div className="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditing(false); setError(null) }}>{t('Cancel')}</Button><Button size="sm" type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Check />}{t('Save')}</Button></div>
              {googleName && <button type="button" className="text-xs text-white/55 underline underline-offset-4" disabled={busy} onClick={() => void saveName(googleName)}>{t('Use Google name')}</button>}
            </form>}
            <div className="space-y-1.5 text-xs text-white/60">
              <span className="inline-flex items-center gap-1 text-amber-300">
                <ProfileEggIcon golden />
                {(playerProfile?.goldenEggs || 0).toLocaleString()}
                <span>{t('golden eggs')}</span>
              </span>
              <p className="flex items-center gap-1"><ProfileEggIcon />{t('{n} historical points', { n: (playerProfile?.points || 0).toLocaleString() })}</p>
              <p className="flex items-center gap-1"><span aria-hidden="true">🎖️</span>{t(playerProfile?.rank || 'Novice Beatmaker')}</p>
              <div className="space-y-2">
                <p><span aria-hidden="true">🏆</span> {t('Campaign (Cities Conquered):')} <strong className="font-normal text-primary">{playerProfile?.conqueredCityIds?.length || 0}</strong> / {cities.length}</p>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div aria-hidden="true" className="absolute inset-y-0 right-0 bg-secondary" style={{ left: `${((playerProfile?.conqueredCityIds?.length || 0) / cities.length) * 100}%`, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 5px, rgba(0, 255, 160, 0.48) 5px 6px), repeating-linear-gradient(0deg, rgba(0, 255, 160, 0.48) 0 2px, transparent 2px 4px)' }} />
                  <div className="relative h-full bg-primary transition-all duration-500" style={{ width: `${((playerProfile?.conqueredCityIds?.length || 0) / cities.length) * 100}%` }} />
                </div>
              </div>
            </div>
            {!online.user || online.user.is_anonymous ? <Button className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-xs sm:text-sm" onClick={onSignIn}>{t('Sign in to save your profile')}</Button>
              : online.pendingTransfer ? <Button className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-xs sm:text-sm" onClick={onSignIn}>{t('Integrar perfil visitante')}</Button>
                : null}
            {(error || online.error) && <p role="alert" className="text-xs text-rose-200">{error || (online.error ? t(online.error) : '')}</p>}
            {message && <p role="status" className="text-xs text-primary">{message}</p>}
            <div className="flex items-end justify-between gap-3 pt-3">
              <div className="min-w-0 text-xs text-white/60">
                {online.profile && <div className="break-words">{online.profile.baptismal_name && online.profile.display_name !== online.profile.baptismal_name && <div>{t('Baptismal name:')} {online.profile.baptismal_name}</div>}<div>{t('Profile code:')} <span className="select-all break-all">{online.profile.code}</span></div></div>}
                {online.user?.email && <div className="flex min-w-0 items-center gap-1.5">
                  <span>{t('Mail:')}</span>
                  <button type="button" className="inline-flex size-4 shrink-0 items-center justify-center rounded text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" aria-label={showEmail ? t('Hide email address') : t('Show email address')} title={showEmail ? t('Hide email address') : t('Show email address')} onClick={() => setShowEmail(value => !value)}>
                    {showEmail ? <EyeOff aria-hidden="true" className="size-3.5" /> : <Eye aria-hidden="true" className="size-3.5" />}
                  </button>
                  <span className="break-all">{showEmail ? online.user.email : maskEmail(online.user.email)}</span>
                </div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t("Reset campaign progress?"))) resetCampaign()
                  }}
                  className="rounded border border-white/10 px-3 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  {t('RESET SAVE')}
                </button>
                {online.user && !online.user.is_anonymous && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void logOut()}
                    className="rounded border border-white/10 px-3 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
                  >
                    {busy ? t('LOGGING OUT…') : t('LOGOUT')}
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>

  )
}

function ProfileEggIcon({ golden = false }: { golden?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 16 20" className="h-3.5 w-3 shrink-0">
    <path d="M8 1.5c-3.2 0-6 6.3-6 11.3a6 6 0 0 0 12 0c0-5-2.8-11.3-6-11.3Z" fill={golden ? '#facc15' : 'currentColor'} stroke={golden ? '#ca8a04' : 'currentColor'} strokeWidth="1.2" />
    <path d="M5 6.5c-.9 1.7-1.5 3.8-1.5 5.5" fill="none" stroke={golden ? '#fef08a' : '#101713'} strokeOpacity={golden ? 1 : 0.4} strokeLinecap="round" strokeWidth="1.2" />
  </svg>
}

function maskEmail(email: string) {
  const separator = email.lastIndexOf('@')
  if (separator <= 0) return email
  const local = email.slice(0, separator)
  const domain = email.slice(separator)
  if (local.length === 1) return `${local}...${domain}`
  return `${local[0]}...${local[local.length - 1]}${domain}`
}
