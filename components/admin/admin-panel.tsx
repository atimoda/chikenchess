'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, FileJson, Save } from 'lucide-react'
import { useOnline } from '@/components/online/online-provider'
import { getOnlineClient } from '@/lib/online/client'
import { isAdminUser } from '@/lib/admin/access'
import type { AdminEntry } from '@/lib/admin/catalog'
import { RELEASE_LABEL } from '@/lib/changelog'
import { ListEditor } from './list-editor'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import styles from './admin-panel.module.css'

/* global BeforeUnloadEvent, fetch */

const format = (value: unknown) => JSON.stringify(value, null, 2)

export function AdminPanel() {
  const online = useOnline()
  const [access, setAccess] = useState<'checking' | 'admin' | 'denied'>('checking')
  const [entries, setEntries] = useState<AdminEntry[]>([])
  const [selected, setSelected] = useState<AdminEntry | null>(null)
  const [draft, setDraft] = useState('')
  const [original, setOriginal] = useState('')
  const [revision, setRevision] = useState('')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState<AdminEntry | 'map' | null>(null)
  const generation = useRef(0)
  const identity = useRef(online.user?.id)
  identity.current = online.user?.id
  const dirty = draft !== original
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  let value: unknown
  let parseError = ''
  try { value = draft ? JSON.parse(draft) : null } catch { parseError = 'JSON inválido. Corrija a sintaxe antes de validar ou salvar.' }

  const request = useCallback(async (path: string, method = 'GET', body?: unknown) => {
    const requestIdentity = identity.current
    const client = getOnlineClient()
    if (!client) throw new Error('Login indisponível.')
    const { data, error: sessionError } = await client.auth.getSession()
    if (sessionError || !data.session || data.session.user.id !== identity.current) throw new Error('A sessão mudou. Entre novamente para continuar.')
    const response = await fetch(`/__admin-local${path}`, {
      method, cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const result = await response.json().catch(() => null)
    if (requestIdentity !== identity.current) throw new Error('A sessão mudou. Entre novamente para continuar.')
    if (response.status === 401 || response.status === 403) throw new Error('Sua sessão não tem acesso administrativo. Entre novamente.')
    if (response.status === 409) throw new Error('Este arquivo foi alterado fora do painel. Copie seu rascunho e recarregue o arquivo antes de salvar.')
    if (!response.ok || !result) throw new Error(result?.error || 'Salvamento local indisponível. Execute npm run admin:dev e abra o endereço indicado.')
    return result
  }, [])

  const load = useCallback(async (entry: AdminEntry) => {
    const current = ++generation.current
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await request(`/file?id=${encodeURIComponent(entry.id)}`)
      if (current !== generation.current) return
      setSelected(entry); setRevision(result.revision); setDraft(format(result.value)); setOriginal(format(result.value))
      setMode(entry.kind.startsWith('music-') ? 'json' : 'form')
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Falha ao abrir arquivo.') }
    finally { if (current === generation.current) setBusy(false) }
  }, [request])

  useEffect(() => {
    let active = true
    ++generation.current
    setAccess('checking'); setEntries([]); setSelected(null); setConnected(false); setDraft(''); setOriginal(''); setError(''); setNotice(''); setPending(null); setBusy(false)
    const client = getOnlineClient()
    if (!client || !online.user) { if (!online.loading) setAccess('denied'); return }
    void client.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return
      if (authError || data.user?.id !== identity.current || !isAdminUser(data.user)) { setAccess('denied'); return }
      setAccess('admin')
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (!isLocal) return
      try {
        const result = await request('/catalog')
        if (!active) return
        setEntries(result.entries); setConnected(true)
        if (result.entries[0]) void load(result.entries[0])
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Serviço local indisponível.') }
    }).catch(() => { if (active) setAccess('denied') })
    return () => { active = false; ++generation.current }
  }, [online.user?.id, online.loading, load, request])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const navigate = (destination: AdminEntry | 'map') => {
    if (dirty) { setPending(destination); return }
    if (destination === 'map') window.location.assign('/')
    else void load(destination)
  }
  const continueTo = (destination: AdminEntry | 'map') => {
    dirtyRef.current = false
    setPending(null)
    if (destination === 'map') window.location.assign('/')
    else void load(destination)
  }
  const save = async (destination?: AdminEntry | 'map') => {
    if (!selected || parseError || busy) return
    const current = generation.current
    const text = draft
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await request(`/file?id=${encodeURIComponent(selected.id)}`, 'PUT', { revision, value: JSON.parse(text) })
      if (current !== generation.current) return
      dirtyRef.current = false
      setRevision(result.revision); setOriginal(format(JSON.parse(text))); setDraft(format(JSON.parse(text)))
      setNotice('Arquivo salvo no projeto. A publicação acontece no próximo deploy.')
      if (selected.kind === 'names') {
        const migration = await request('/names-migration', 'POST', {})
        if (current !== generation.current) return
        setNotice(`Arquivo salvo. Atualização do Supabase preparada em ${migration.path}; publique com as migrações.`)
      }
      if (destination) continueTo(destination)
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Falha ao salvar.') }
    finally { if (current === generation.current) setBusy(false) }
  }
  const validate = async () => {
    if (!selected || parseError) return
    const current = generation.current
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await request('/validate', 'POST', { id: selected.id, value })
      if (current !== generation.current) return
      if (!result.valid) setError(result.error)
      else setNotice('Conteúdo válido.')
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Falha na validação.') }
    finally { if (current === generation.current) setBusy(false) }
  }
  const filtered = entries.filter(entry => `${entry.title} ${entry.path} ${entry.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const groups = [...new Set(filtered.map(entry => entry.group))]
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div><h1>Admin</h1><p className={styles.muted}>Catálogos do ChickenChess · {RELEASE_LABEL}</p></div><button className={styles.button} onClick={() => navigate('map')}><ArrowLeft size={16} />Voltar ao globo</button></header>
    {access === 'checking' ? <p className={styles.status} role="status">Verificando acesso…</p> : access === 'denied' ? <section className={styles.status}><h2>Acesso restrito</h2><p className={styles.muted}>Entre com uma conta administradora para abrir esta área.</p><button className={styles.button} onClick={online.openLogin}>Entrar</button></section> : <>
      <div className={styles.status}><p>{connected ? 'Edição local conectada' : 'Manutenção na pasta local'}</p><p className={styles.muted}>{connected ? 'Salvar altera os JSONs deste projeto. Revise as mudanças e publique pelo deploy.' : 'No computador com o projeto, execute npm run admin:dev e abra http://localhost:3010/admin. Os arquivos são salvos no repositório; depois faça o deploy.'}</p>{!connected && <a className={styles.button} href="http://localhost:3010/admin">Abrir Admin local</a>}</div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {connected && <div className={styles.layout}><aside className={styles.sidebar}><label className={styles.field}>Buscar catálogo<input className={styles.input} type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><nav aria-label="Catálogos editáveis">{groups.map(group => <div key={group}><h2 className={styles.group}>{group}</h2>{filtered.filter(entry => entry.group === group).map(entry => <button key={entry.id} disabled={busy} className={`${styles.entry} ${selected?.id === entry.id ? styles.selected : ''}`} aria-current={selected?.id === entry.id ? 'page' : undefined} onClick={() => { if (entry.id !== selected?.id) navigate(entry) }}>{entry.title}</button>)}</div>)}{!filtered.length && <p className={styles.muted}>Nenhum catálogo encontrado.</p>}</nav></aside>
        <section className={styles.editor} aria-busy={busy}>{selected ? <><h2>{selected.title}{dirty ? ' · alterações pendentes' : ''}</h2><p className={styles.muted}>{selected.description}</p><p className={styles.path}>{selected.path}</p>{(selected.cityId || selected.kind === 'music-preset') && <Link className={styles.button} href={selected.kind === 'music-preset' ? `/creative?preset=${encodeURIComponent(selected.id.slice(7))}` : `/creative?city=${encodeURIComponent(selected.cityId!)}&official=1`} target="_blank" rel="noopener noreferrer">Abrir no Criativo</Link>}
          <div className={styles.toolbar}><div className={styles.tabs}>{!selected.kind.startsWith('music-') && <button className={styles.button} disabled={Boolean(parseError)} aria-pressed={mode === 'form'} onClick={() => setMode('form')}>Lista</button>}<button className={styles.button} aria-pressed={mode === 'json'} onClick={() => setMode('json')}><FileJson size={16} />JSON</button></div><div className={styles.actions}><button className={styles.button} disabled={busy || Boolean(parseError)} onClick={() => void validate()}><Check size={16} />Validar</button><button className={`${styles.button} ${styles.primary}`} disabled={busy || !dirty || Boolean(parseError)} onClick={() => void save()}><Save size={16} />{busy ? 'Aguarde…' : 'Salvar arquivo'}</button><button className={styles.button} disabled={busy || !dirty} onClick={() => { setDraft(original); setError(''); setNotice('Rascunho descartado.') }}>Cancelar</button><button className={styles.button} disabled={busy} onClick={() => navigate(selected)}>Recarregar</button></div></div>
          <fieldset disabled={busy} className={styles.form}>{mode === 'json' ? <label className={styles.field}>Conteúdo JSON<textarea spellCheck={false} className={`${styles.textarea} ${styles.code}`} value={draft} onChange={event => { setDraft(event.target.value); setNotice('') }} /></label> : <ListEditor entry={selected} value={value} onChange={next => { setDraft(format(next)); setNotice('') }} />}</fieldset>
          {parseError && <p className={styles.error} role="alert">{parseError}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
          {selected.kind === 'names' && <button className={styles.button} disabled={busy || dirty} onClick={() => { setBusy(true); const current = generation.current; void request('/names-migration', 'POST', {}).then(result => { if (current === generation.current) setNotice(`Atualização preparada: ${result.path}`) }).catch(cause => { if (current === generation.current) setError(cause.message) }).finally(() => { if (current === generation.current) setBusy(false) }) }}>Gerar atualização do Supabase</button>}
        </> : <p className={styles.muted}>Selecione um catálogo para editar.</p>}</section>
      </div>}
    </>}
    <Dialog open={Boolean(pending)} onOpenChange={open => { if (!open && !busy) setPending(null) }}><DialogContent closeLabel="Fechar aviso" className={styles.confirmCard}><DialogTitle>Alterações pendentes</DialogTitle><DialogDescription>Salve o arquivo ou descarte o rascunho antes de continuar.</DialogDescription>{error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.actions}><button className={`${styles.button} ${styles.primary}`} disabled={busy || Boolean(parseError)} onClick={() => { if (pending) void save(pending) }}>Salvar e continuar</button><button className={styles.button} disabled={busy} onClick={() => { if (pending) continueTo(pending) }}>Descartar e continuar</button><button className={styles.button} disabled={busy} onClick={() => setPending(null)}>Continuar editando</button></div></DialogContent></Dialog>
  </div></main>
}
