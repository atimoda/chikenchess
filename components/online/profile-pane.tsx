"use client"

/* global URL, Blob, HTMLInputElement */
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, LogOut, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cities } from '@/lib/cities-data'
import { resetCampaign, type PlayerProfile } from '@/lib/game-progression'
import { onlineErrorMessage, readProfileBackups } from '@/lib/online/client'
import { useOnline } from './online-provider'

export function ProfilePane({ playerProfile, onSignIn }: { playerProfile: PlayerProfile | null; onSignIn: () => void }) {
  const online = useOnline()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const identityRef = useRef(online.user?.id)
  identityRef.current = online.user?.id
  const googleIdentity = online.user?.identities?.find(identity => identity.provider === 'google')
  const googleValue = googleIdentity?.identity_data?.full_name || googleIdentity?.identity_data?.name || (googleIdentity ? online.user?.user_metadata?.full_name || online.user?.user_metadata?.name : null)
  const googleName = typeof googleValue === 'string' ? Array.from(googleValue).filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join('').trim().slice(0, 40) : ''
  useEffect(() => { setEditing(false); setName(''); setError(null); setMessage(null) }, [online.user?.id])
  useEffect(() => { if (editing) nameInputRef.current?.focus() }, [editing])
  const saveName = async (value: string) => {
    const actor = online.user?.id
    setBusy(true); setError(null); setMessage(null)
    try {
      await online.ensureGuest()
      if (identityRef.current !== actor) return
      const nextName = value.trim() || online.profile?.baptismal_name || online.profile?.display_name || ''
      await online.refreshProfile(nextName)
      if (identityRef.current === actor) { setEditing(false); setMessage('Nome público salvo.') }
    } catch (cause) { if (identityRef.current === actor) setError(onlineErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  const logOut = async () => {
    setBusy(true); setError(null)
    try { await online.signOut() }
    catch (cause) { setError(onlineErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  const downloadBackup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ backups: readProfileBackups() }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'chickenchess-profile-backups.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
      <div className="space-y-4">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="text-5xl leading-none">🐔</span>
              <h2 className="min-w-0 flex-1 break-words font-mono text-xl">{online.profile?.display_name ?? (online.user ? 'Carregando perfil…' : 'Perfil visitante')}</h2>
              <Button size="icon" variant="ghost" className="size-8 shrink-0 border border-transparent text-white hover:border-primary hover:bg-transparent hover:text-white hover:drop-shadow-[0_0_4px_var(--primary)] focus-visible:border-primary focus-visible:bg-transparent focus-visible:text-white focus-visible:drop-shadow-[0_0_4px_var(--primary)]" aria-label="Edit profile name" title="Edit" disabled={!online.profile || busy} onClick={() => { setName(online.profile?.display_name || ''); setEditing(current => !current); setError(null); setMessage(null) }}><Pencil className="size-4" /></Button>
            </div>
          <div className="space-y-4 font-mono">
            {editing && <form className="space-y-2" onSubmit={event => { event.preventDefault(); void saveName(name) }}>
              <label htmlFor="profile-display-name" className="text-xs text-white/60">Nome público</label>
              <input ref={nameInputRef} id="profile-display-name" className="h-10 w-full min-w-0 rounded-md border border-white/20 bg-black/30 px-3 text-sm outline-none focus:border-primary" value={name} placeholder={online.profile?.baptismal_name} disabled={busy} onChange={event => setName(event.target.value)} maxLength={40} />
              <p className="text-[11px] text-white/45">Deixe vazio para usar seu nome de batismo.</p>
              <div className="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditing(false); setError(null) }}>Cancelar</Button><Button size="sm" type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Check />}Salvar</Button></div>
              {googleName && <button type="button" className="text-xs text-white/55 underline underline-offset-4" disabled={busy} onClick={() => void saveName(googleName)}>Usar nome do Google</button>}
            </form>}
            {online.profile && <p className="break-words text-xs text-white/60">{online.profile.baptismal_name && online.profile.display_name !== online.profile.baptismal_name && <>Baptismal name: {online.profile.baptismal_name}<br /></>}Código de perfil: <span className="select-all break-all">{online.profile.code}</span></p>}
            {!online.user || online.user.is_anonymous ? <Button className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-xs sm:text-sm" onClick={onSignIn}>Sign in to save your profile</Button>
              : online.pendingTransfer ? <Button className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-xs sm:text-sm" onClick={onSignIn}>Escolher perfil para a conta</Button>
                : <div className="space-y-2">
                  
                  {online.user.email && <p className="break-all text-xs text-white/60">{online.user.email}</p>}
                  <Button size="sm" variant="outline" className="border-white/20 bg-transparent" disabled={busy} onClick={() => void logOut()}>
                    {busy ? <Loader2 className="animate-spin" /> : <LogOut />}{busy ? 'Saindo…' : 'Sair da conta'}
                  </Button>
                </div>}
            {(error || online.error) && <p role="alert" className="text-xs text-rose-200">{error || online.error}</p>}
            {message && <p role="status" className="text-xs text-primary">{message}</p>}
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Golden eggs</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold tracking-wide text-amber-300">
                  <svg aria-hidden="true" viewBox="0 0 16 20" className="h-4 w-3.5">
                    <path d="M8 1.5c-3.2 0-6 6.3-6 11.3a6 6 0 0 0 12 0c0-5-2.8-11.3-6-11.3Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
                    <path d="M5 6.5c-.9 1.7-1.5 3.8-1.5 5.5" fill="none" stroke="#fef08a" strokeLinecap="round" strokeWidth="1.2" />
                  </svg>
                  {(playerProfile?.goldenEggs || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Historical score</span>
                <span className="tracking-wide text-muted-foreground">{(playerProfile?.points || 0).toLocaleString()} points</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rank</span>
                <span className="text-xs text-muted-foreground">🎖️ {playerProfile?.rank || "Novice Beatmaker"}</span>
              </div>
            </div>
            <div className="space-y-2 pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true">🏆</span>Cities conquered</span>
                <span><strong className="text-primary">{playerProfile?.conqueredCityIds?.length || 0}</strong> / {cities.length}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((playerProfile?.conqueredCityIds?.length || 0) / cities.length) * 100}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3">
              {readProfileBackups().length > 0 ? <button className="min-w-0 text-left text-[10px] text-white/50 underline underline-offset-4 hover:text-white" type="button" onClick={downloadBackup}>Baixar cópias do perfil visitante</button> : <span />}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset Campaign Progress?")) resetCampaign()
                }}
                className="rounded border border-white/10 px-3 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
              >
                RESET SAVE
              </button>
            </div>
          </div>
      </div>

  )
}
