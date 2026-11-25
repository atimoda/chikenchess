"use client"

// The Pátio's "Salvar" and "Abrir" panels and the small profile card of a person who made or played it.
//   Salvar: the name (the first one makes it a saved lobby, kept for good, and its giver the godparent; after that
//   only the creator or the godparent rename it), favourite, "Salvar agora" (it also saves itself every minute),
//   a conflict with someone else's save, and the people: creator, godparent, who edited and who played.
//   Playgrounds (Abrir): a new Pátio (a copy of the default, or an empty one), then three folding blocks: Destaques
//   (the default and the Pátios an admin featured), Favoritos and Salvos (mine, or for the admin everyone's), with a
//   star to favourite, delete, duplicate, "set as default" and the admin's Destaque.
import { StepSelect } from "@/components/ui/step-select"
import { useEffect, useMemo, useRef, useState } from "react"
import { Award, Copy, Crown, FolderOpen, Home, Loader2, Plus, Save, Star, Trash2, X } from "lucide-react"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { cn } from "@/lib/utils"
import type { NewPatioKind, PatioRecord } from "@/lib/pigchicken/patio-store"
import { localPatios } from "@/lib/pigchicken/patio-store"
import {
  deletePatioLobby, duplicatePatioLobby, favoritePatioLobby, listFeaturedPatios, listPatioLobbies, patioErrorMessage, patioOnlineAvailable, setDefaultPatioLobby, setPatioLobbyFeatured, unsavedDaysLeft,
  UNSAVED_DAYS, type PatioLobby, type PatioLobbyInfo, type PatioPerson,
} from "@/lib/pigchicken/patio-online"
import type { PatioSaveState } from "./use-patio-lobby"
import { NewPatioGenerator } from "./new-patio-generator"
import { usePatioLiveCounts, type PatioLiveCounts } from "@/lib/pigchicken/patio-live"

export const DEFAULT_PATIO_NAME = "Pátio das Galinhas"
const panelCls = "rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs text-[#dfe8df] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
const panelBody = "gap-3 p-4"
const btn = "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-white/20 px-2.5 hover:border-primary disabled:opacity-40 disabled:hover:border-white/20"
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "")

export type PatioRole = "Criador" | "Padrinho" | "Editou" | "Jogou"
export type PatioPersonCard = PatioPerson & { roles: PatioRole[] }

function PanelHead({ title, icon, onClose }: { title: string; icon: React.ReactNode; onClose: () => void }) {
  return (
    <div data-drag-handle className="flex shrink-0 items-center gap-2">
      {icon}
      <h2 className="flex-1 text-sm text-white">{title}</h2>
      <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
    </div>
  )
}

// a small round avatar: the name's first letter on a colour of its own
export function PersonAvatar({ person, onClick, size = 28 }: { person: Pick<PatioPerson, "userId" | "name">; onClick?: () => void; size?: number }) {
  let h = 0
  for (const c of person.userId) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <button type="button" title={person.name} aria-label={`Perfil de ${person.name}`} onClick={onClick} className="shrink-0 rounded-full border-2 border-white/25 font-bold text-[#05060c] hover:border-[#ffd166]" style={{ width: size, height: size, background: `hsl(${h} 70% 68%)`, fontSize: size * 0.45 }}>
      {person.name.trim().charAt(0).toUpperCase() || "?"}
    </button>
  )
}

// the people of a lobby, each with what they did in it
export function patioPeople(remote: PatioLobby | null): PatioPersonCard[] {
  if (!remote) return []
  const byId = new Map<string, PatioPersonCard>()
  const get = (id: string, fallback: string | null) => {
    let p = byId.get(id)
    if (!p) {
      const known = remote.people.find(x => x.userId === id)
      p = { ...(known ?? { userId: id, name: fallback ?? "Jogador", points: 0, goldenEggs: 0, wins: 0, editedAt: null, playedAt: null }), roles: [] }
      byId.set(id, p)
    }
    return p
  }
  if (remote.creatorId) get(remote.creatorId, remote.creatorName).roles.push("Criador")
  if (remote.godparentId) get(remote.godparentId, null).roles.push("Padrinho")
  for (const x of remote.people) {
    const p = get(x.userId, x.name)
    if (x.editedAt) p.roles.push("Editou")
    if (x.playedAt) p.roles.push("Jogou")
  }
  return [...byId.values()]
}

function PeopleRow({ label, people, onOpen }: { label: string; people: PatioPersonCard[]; onOpen: (p: PatioPersonCard) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] text-[#93a79a]">{label}</span>
      {people.length ? (
        <div className="flex min-w-0 flex-wrap gap-1">{people.slice(0, 24).map(p => <PersonAvatar key={p.userId} person={p} onClick={() => onOpen(p)} />)}{people.length > 24 && <span className="self-center text-[11px] text-[#93a79a]">+{people.length - 24}</span>}</div>
      ) : <span className="text-[11px] text-[#5f6f65]">ninguém ainda</span>}
    </div>
  )
}

export function PatioSavePanel({ patio, remote, save, canEdit, canRename, renameHint, isAccount, onSave, onRename, onFavorite, onResolve, onPerson, onLogin, onClose }: {
  patio: PatioRecord
  remote: PatioLobby | null
  save: PatioSaveState
  canEdit: boolean
  canRename: boolean
  renameHint: string
  isAccount: boolean
  onSave: () => void
  onRename: (name: string) => Promise<boolean>
  onFavorite: (on: boolean) => void
  onResolve: (choice: "saved" | "mine") => void
  onPerson: (p: PatioPersonCard) => void
  onLogin: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(patio.name ?? "")
  const [busy, setBusy] = useState(false)
  useEffect(() => { setName(patio.name ?? "") }, [patio.id, patio.name])
  const people = useMemo(() => patioPeople(remote), [remote])
  const isDefault = patio.id === null || remote?.isDefault
  const named = !!patio.name
  const daysLeft = remote ? unsavedDaysLeft(remote) : UNSAVED_DAYS
  const clean = name.trim()
  const submit = async () => {
    if (!clean || clean === patio.name || busy) return
    setBusy(true)
    await onRename(clean)
    setBusy(false)
  }
  return (
    <FloatingPanel id="patio-save" aria-label="Salvar Pátio" initial={(vw, vh) => ({ x: Math.max(12, vw - Math.min(360, vw - 24) - 12), y: 64, w: Math.min(360, vw - 24), h: Math.min(520, vh - 80) })} bodyClassName={panelBody} className={panelCls}>
      <PanelHead title="Salvar Pátio" icon={<Save className="h-4 w-4 text-[#ffd166]" />} onClose={onClose} />

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-[#93a79a]">Nome</span>
        <div className="flex gap-2">
          <input
            value={name}
            maxLength={60}
            placeholder={DEFAULT_PATIO_NAME}
            disabled={!canRename || busy}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void submit() }}
            className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-[#dfe8df] placeholder:text-[#5f6f65] disabled:opacity-60"
          />
          <button type="button" disabled={!canRename || !clean || clean === patio.name || busy} onClick={() => void submit()} className={btn}>{named ? "Renomear" : "Dar nome"}</button>
        </div>
        {!canRename && <span className="text-[10px] leading-snug text-[#93a79a]">{renameHint}{!isAccount && <> <button type="button" onClick={onLogin} className="underline hover:text-white">Entrar</button></>}</span>}
      </label>

      <div className="flex items-center gap-2">
        <button type="button" disabled={!canEdit || save.kind === "saving"} onClick={onSave} className={cn(btn, "border-[#ffd166] text-[#ffd166]")}>
          {save.kind === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar agora
        </button>
        <button type="button" aria-pressed={!!remote?.favorite} disabled={!remote || !isAccount} title={!isAccount ? "Entre para favoritar" : !remote ? "Salve o Pátio antes de favoritar" : remote.favorite ? "Tirar dos favoritos" : "Favoritar"} onClick={() => remote && onFavorite(!remote.favorite)} className={btn}>
          <Star className={cn("h-3.5 w-3.5", remote?.favorite && "fill-[#ffd166] text-[#ffd166]")} /> {remote?.favorite ? "Favorito" : "Favoritar"}
        </button>
      </div>
      {!save.text && canEdit && patio.dirty && <p className="text-[11px] text-[#ffd166]">Há mudanças ainda não salvas no servidor.</p>}
      {save.text && save.kind !== "conflict" && <p role="status" className={cn("text-[11px]", save.kind === "error" ? "text-[#ff8a7a]" : save.kind === "local" ? "text-[#ffd166]" : "text-[#b9e3c6]")}>{save.text}</p>}
      {save.kind === "conflict" && (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-[#ff8a7a]/60 p-2 text-[11px]">
          <p>{save.text}{save.remote?.updatedAt ? ` Versão salva em ${date(save.remote.updatedAt)}.` : ""}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onResolve("saved")} className={btn}>Abrir a versão salva</button>
            <button type="button" onClick={() => onResolve("mine")} className={cn(btn, "border-[#ff8a7a] text-[#ff8a7a]")}>Salvar a minha por cima</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
        <PeopleRow label="Criador" people={people.filter(p => p.roles.includes("Criador"))} onOpen={onPerson} />
        <PeopleRow label="Padrinho" people={people.filter(p => p.roles.includes("Padrinho"))} onOpen={onPerson} />
        <PeopleRow label="Editaram" people={people.filter(p => p.roles.includes("Editou"))} onOpen={onPerson} />
        <PeopleRow label="Jogaram" people={people.filter(p => p.roles.includes("Jogou"))} onOpen={onPerson} />
        {!remote && !patioOnlineAvailable() && <p className="text-[10px] text-[#5f6f65]">Sem servidor agora.</p>}
        {remote?.visits != null && remote.anonPlayers != null && <p className="text-[10px] text-[#5f6f65]">{remote.visits} {remote.visits === 1 ? "visita" : "visitas"} · {remote.anonPlayers} {remote.anonPlayers === 1 ? "anônimo" : "anônimos"}</p>}
      </div>

      <div className={cn("flex flex-col gap-1 rounded-md border px-2 py-1.5 text-[11px] leading-relaxed", named || isDefault ? "border-primary/30 text-[#b9e3c6]" : "border-[#ffd166]/40 text-[#ffd166]")}>
        <p>
          {isDefault ? "Pátio padrão: todo Pátio novo começa como uma cópia dele."
            : named ? "Lobby salvo: fica guardado para sempre, até quem o salvou (ou o admin) apagar."
              : `Lobby não salvo: é apagado depois de ${UNSAVED_DAYS} dias sem edições nem partidas${remote ? ` (faltam ${daysLeft})` : ""}. Dê um nome para guardá-lo.`}
        </p>
        {canRename && !named && !isDefault && <p>Quem dá o primeiro nome vira o padrinho do Pátio.</p>}
        <p>{canEdit ? "Auto-save a cada minuto ativado." : "Você não pode editar este Pátio."}</p>
      </div>
    </FloatingPanel>
  )
}

export function PatioPersonPanel({ person, onClose }: { person: PatioPersonCard; onClose: () => void }) {
  return (
    <FloatingPanel id="patio-person" aria-label={`Perfil de ${person.name}`} initial={(vw, vh) => { const w = Math.min(280, vw - 24); const left = vw - Math.min(360, vw - 24) - 12 - w - 8; return left >= 12 ? { x: left, y: 64, w, h: 260 } : { x: Math.max(12, vw - w - 12), y: Math.max(64, vh - 272), w, h: 260 } }} minH={200} bodyClassName={panelBody} className={panelCls}>
      <PanelHead title="Perfil" icon={<PersonAvatar person={person} size={24} />} onClose={onClose} />
      <p className="truncate text-sm font-bold text-white">{person.name}</p>
      <p className="text-[11px] text-[#ffd166]">{person.roles.join(" · ") || "Jogador"}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-[#93a79a]">Pontos</dt><dd>{person.points}</dd>
        <dt className="text-[#93a79a]">Ovos de ouro</dt><dd>{person.goldenEggs}</dd>
        <dt className="text-[#93a79a]">Vitórias</dt><dd>{person.wins}</dd>
        {person.editedAt && <><dt className="text-[#93a79a]">Editou em</dt><dd>{date(person.editedAt)}</dd></>}
        {person.playedAt && <><dt className="text-[#93a79a]">Jogou em</dt><dd>{date(person.playedAt)}</dd></>}
      </dl>
    </FloatingPanel>
  )
}

type Filter = "all" | "saved" | "unsaved"
type Sort = "recent" | "played" | "playing" | "name"
const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Recents" },
  { value: "played", label: "Most played" },
  { value: "playing", label: "Mais jogando agora" },
  { value: "name", label: "Nome (A–Z)" },
]
function sortRows(rows: PatioLobbyInfo[], sort: Sort, live: PatioLiveCounts) {
  const recent = (a: PatioLobbyInfo, b: PatioLobbyInfo) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
  const by: Record<Sort, (a: PatioLobbyInfo, b: PatioLobbyInfo) => number> = {
    recent,
    played: (a, b) => b.plays - a.plays || b.favorites - a.favorites || recent(a, b),
    playing: (a, b) => (live[b.id] ?? 0) - (live[a.id] ?? 0) || recent(a, b),
    name: (a, b) => (a.name ?? "\uffff").localeCompare(b.name ?? "\uffff", "pt-BR") || recent(a, b),
  }
  return [...rows].sort(by[sort])
}

export function PatioOpenPanel({ currentId, me, isAdmin, isAccount, onOpen, onNew, onLogin, onDeleted, onFavoriteCurrent, onClose, refreshKey = 0 }: {
  currentId: string | null
  // changes when the open Pátio reaches the database for the first time or gets a name: the lists are read again
  // (only while this panel is open: closed, it is not mounted and asks nothing)
  refreshKey?: number
  me: string | null
  isAdmin: boolean
  isAccount: boolean
  onOpen: (id: string | null) => void
  onNew: (kind?: NewPatioKind) => void
  onLogin: () => void
  onDeleted: (id: string) => void | Promise<void>
  // the star on the open Pátio's row goes through its own state, so the Salvar panel shows it too
  onFavoriteCurrent: (on: boolean) => Promise<void>
  onClose: () => void
}) {
  const server = patioOnlineAvailable() && !!me
  const live = usePatioLiveCounts()
  // "Ver todos" on each list: saved adds every saved lobby (for the admin, every lobby), favourites every lobby
  // someone favourited
  const [savedAll, setSavedAll] = useState(false)
  const [favAll, setFavAll] = useState(false)
  const [savedSort, setSavedSort] = useState<Sort>("recent")
  const [favSort, setFavSort] = useState<Sort>("played")
  const [featSort, setFeatSort] = useState<Sort>("recent")
  // the folding blocks: Destaques open, the others closed until opened
  const [open, setOpen] = useState<Record<string, boolean>>({ feat: true, fav: false, saved: false })
  const fold = (k: string) => (v: boolean) => setOpen(o => ({ ...o, [k]: v }))
  const [filter, setFilter] = useState<Filter>("all")
  const [rows, setRows] = useState<PatioLobbyInfo[] | null>(null)
  // without an account the server lists only the featured ones (Destaques)
  const [guestFeatured, setGuestFeatured] = useState<PatioLobbyInfo[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [dup, setDup] = useState<Dup>(null)
  const [tick, setTick] = useState(0)
  // the generator of a new Pátio (Empty, the default, or Basic biome)
  const [generator, setGenerator] = useState(false)
  const local = useMemo(() => { void tick; return localPatios() }, [tick])
  const seenRefresh = useRef(refreshKey)
  useEffect(() => { if (refreshKey !== seenRefresh.current) { seenRefresh.current = refreshKey; setTick(t => t + 1) } }, [refreshKey])
  const all = savedAll || favAll
  useEffect(() => {
    if (server || !patioOnlineAvailable()) { setGuestFeatured([]); return }
    let alive = true
    listFeaturedPatios().then(r => { if (alive) setGuestFeatured(r) }).catch(() => {})
    return () => { alive = false }
  }, [server, tick])
  useEffect(() => {
    if (!server) { setRows(null); return }
    let alive = true
    setError("")
    listPatioLobbies(all).then(r => { if (alive) setRows(r) }).catch(e => { if (alive) { setRows([]); setError(patioErrorMessage(e)) } })
    return () => { alive = false }
  }, [server, all, tick])

  const known = new Set(rows?.map(r => r.id))
  const localOnly = local.filter((r): r is PatioRecord & { id: string } => !!r.id && !known.has(r.id) && (r.revision === 0 || !server))
  const others = (rows ?? []).filter(r => !r.isDefault)
  const saved = sortRows(others.filter(r => (r.mine || (savedAll && (!!r.name || isAdmin))) && (filter === "all" || (filter === "saved" ? !!r.name : !r.name))), savedSort, live)
  const favorites = sortRows(others.filter(r => r.favorite || (favAll && r.favorites > 0)), favSort, live)
  const def = rows?.find(r => r.isDefault)
  const featured = sortRows(server ? others.filter(r => r.featured) : guestFeatured.filter(r => !r.isDefault), featSort, live)
  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id)
    setError("")
    try { await fn(); setTick(t => t + 1) } catch (e) { setError(patioErrorMessage(e)) } finally { setBusy(null) }
  }
  const canDelete = (r: PatioLobbyInfo) => !r.isDefault && (isAdmin || r.creatorId === me || r.savedBy === me)
  const duplicate = (id: string, n: string) => void act(id, async () => { const copy = await duplicatePatioLobby(id, n); onOpen(copy.id) })
  const playing = (id: string | null | undefined) => (id ? live[id] ?? 0 : 0)

  const lobbyRow = (r: PatioLobbyInfo, list: string) => (
    <Row
      key={`${list}-${r.id}`}
      title={r.name ?? "Lobby não salvo"}
      unsaved={!r.name}
      favorite={r.favorite}
      onFavorite={() => void act(r.id, () => (r.id === currentId ? onFavoriteCurrent(!r.favorite) : favoritePatioLobby(r.id, !r.favorite)))}
      current={r.id === currentId}
      playing={playing(r.id)}
      sub={[r.creatorName && (r.creatorId === me ? "seu" : `de ${r.creatorName}`), r.favorites > 0 && `★ ${r.favorites}`, date(r.updatedAt), !r.name && `apaga em ${unsavedDaysLeft(r)} dias`].filter(Boolean).join(" · ")}
      onOpen={() => onOpen(r.id)}
      busy={busy === r.id}
    >
      {isAdmin && <IconBtn label={r.featured ? "Tirar do Destaque" : "Destacar"} pressed={r.featured} onClick={() => void act(r.id, () => setPatioLobbyFeatured(r.id, !r.featured))}><Award className={cn("h-3.5 w-3.5", r.featured && "text-[#ffd166]")} /></IconBtn>}
      {isAdmin && <IconBtn label="Definir como padrão" onClick={() => void act(r.id, () => setDefaultPatioLobby(r.id))}><Crown className="h-3.5 w-3.5" /></IconBtn>}
      {canDelete(r) && (confirmDel === `${list}-${r.id}`
        ? <button type="button" onClick={() => { setConfirmDel(null); void act(r.id, async () => { await deletePatioLobby(r.id); await onDeleted(r.id) }) }} className={cn(btn, "h-7 border-[#ff8a7a] text-[#ff8a7a]")}>Apagar?</button>
        : <IconBtn label="Apagar" onClick={() => setConfirmDel(`${list}-${r.id}`)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>)}
      {isAdmin && <DupButton id={r.id} list={list} name={r.name} dup={dup} setDup={setDup} onDuplicate={duplicate} />}
    </Row>
  )

  return (
    <FloatingPanel id="patio-open" aria-label="Playgrounds" initial={(vw, vh) => ({ x: Math.max(12, vw - Math.min(580, vw - 24) - 12), y: 64, w: Math.min(580, vw - 24), h: Math.min(720, vh - 80) })} bodyClassName={panelBody} className={panelCls}>
      <PanelHead title="Playgrounds" icon={<FolderOpen className="h-4 w-4 text-[#ffd166]" />} onClose={onClose} />
      <div className="flex shrink-0 gap-2">
        <button type="button" aria-expanded={generator} onClick={() => setGenerator(v => !v)} className={cn(btn, "h-9 flex-1 justify-start border-[#ffd166] text-[#ffd166]", generator && "bg-[#ffd166]/15")}><Plus className="h-4 w-4" /> Novo Pátio</button>
      </div>
      {generator && <div className="shrink-0"><NewPatioGenerator onCreate={recipe => onNew(recipe)} /></div>}

      {!server && (
        <p className="text-[11px] leading-relaxed text-[#ffd166]">
          {patioOnlineAvailable() ? <>Entre para ver seus Pátios salvos e favoritos. <button type="button" onClick={onLogin} className="underline hover:text-white">Entrar</button></> : "Sem servidor agora: mostrando os Pátios deste navegador."}
        </p>
      )}
      {error && <p role="alert" className="text-[11px] text-[#ff8a7a]">{error}</p>}

      <div className="-mx-4 flex shrink-0 flex-col">
        <ListBox title="Destaques" open={open.feat} onToggle={fold("feat")} emptyText="Nenhum Pátio em destaque ainda." sort={featSort} onSort={setFeatSort} loading={server && rows === null}>
          <Row
            key="default" title={def?.name ?? "Pátio padrão"} sub={def?.creatorName ? `de ${def.creatorName}` : undefined} current={currentId === null}
            icon={<Home className="h-4 w-4 text-[#b9e3c6]" />} onOpen={() => onOpen(null)} busy={!!def && busy === def.id} playing={playing(def?.id) + playing("default")}
          >
            {isAdmin && def && <DupButton id={def.id} list="default" name={def.name} dup={dup} setDup={setDup} onDuplicate={duplicate} />}
          </Row>
          {featured.map(r => lobbyRow(r, "feat"))}
        </ListBox>

        {server && (
          <ListBox
            title="Favoritos" open={open.fav} onToggle={fold("fav")} emptyText={favAll ? "Ninguém favoritou um Pátio ainda." : "Favorite um Pátio pela estrela."}
            all={favAll} onAll={setFavAll} allHint="Todos os Pátios que alguém favoritou"
            sort={favSort} onSort={setFavSort} loading={rows === null}
          >
            {favorites.map(r => lobbyRow(r, "fav"))}
          </ListBox>
        )}

        {server && (
          <ListBox
            title="Salvos" open={open.saved} onToggle={fold("saved")} emptyText={savedAll ? "Nenhum Pátio salvo ainda." : "Você ainda não criou, salvou nem editou um Pátio."}
            all={savedAll} onAll={setSavedAll} allHint={isAdmin ? "Todos os lobbies de todos, salvos e não salvos" : "Todos os Pátios salvos"}
            sort={savedSort} onSort={setSavedSort} loading={rows === null}
            extra={isAdmin && (
              <StepSelect aria-label="Filtro" value={filter} onChange={e => setFilter(e.target.value as Filter)} className="h-7 rounded-md border border-white/15 bg-[#0b110e] px-1">
                <option value="all">Salvos e não salvos</option>
                <option value="saved">Só salvos</option>
                <option value="unsaved">Só não salvos</option>
              </StepSelect>
            )}
          >
            {saved.map(r => lobbyRow(r, "saved"))}
          </ListBox>
        )}
      </div>

      {!!localOnly.length && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <h3 className="text-[11px] text-[#93a79a]">{server ? "Só neste navegador (ainda não foram para o servidor)" : "Neste navegador"}</h3>
          {localOnly.map(r => (
            <Row key={r.id} title={r.name ?? "Lobby não salvo"} unsaved={!r.name} current={r.id === currentId} sub={date(r.updatedAt)} playing={playing(r.id)} onOpen={() => onOpen(r.id)} busy={busy === r.id}>
              {confirmDel === `local-${r.id}`
                ? <button type="button" disabled={busy === r.id} onClick={() => { setConfirmDel(null); void act(r.id, async () => { await onDeleted(r.id) }) }} className={cn(btn, "h-7 border-[#ff8a7a] text-[#ff8a7a]")}>Excluir?</button>
                : <IconBtn label="Excluir" onClick={() => setConfirmDel(`local-${r.id}`)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>}
            </Row>
          ))}
        </div>
      )}
      {!isAccount && server && <p className="text-[10px] text-[#5f6f65]">Com uma conta, seus Pátios ficam com você em qualquer aparelho.</p>}
    </FloatingPanel>
  )
}

// one folding block of the Playgrounds panel (the yellow title of the other panels): "Ver todos" and the order on top
function ListBox({ title, open, onToggle, emptyText, all, onAll, allHint, sort, onSort, loading, extra, children }: {
  title: string; open: boolean; onToggle: (open: boolean) => void; emptyText: string; all?: boolean; onAll?: (v: boolean) => void; allHint?: string
  sort: Sort; onSort: (s: Sort) => void; loading: boolean; extra?: React.ReactNode; children: React.ReactNode
}) {
  const rows = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean)
  return (
    <PatioDisclosure title={title} open={open} onToggle={onToggle}>
      <section aria-label={title} className="flex flex-col gap-1.5 px-4 pb-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onAll && <label className="mr-auto flex items-center gap-1.5 text-[11px]" title={allHint}><input type="checkbox" checked={!!all} onChange={e => onAll(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" /> Ver todos</label>}
          <StepSelect aria-label={`Ordem de ${title}`} value={sort} onChange={e => onSort(e.target.value as Sort)} className="h-7 rounded-md border border-white/15 bg-[#0b110e] px-1">
            {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </StepSelect>
          {extra}
        </div>
        {loading ? <p className="flex items-center gap-2 text-[11px] text-[#93a79a]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</p>
          : rows.length ? rows : <p className="text-[11px] text-[#5f6f65]">{emptyText}</p>}
      </section>
    </PatioDisclosure>
  )
}

// admin: a copy of this lobby under another name
type Dup = { key: string; name: string } | null
function DupButton({ id, list, name, dup, setDup, onDuplicate }: { id: string; list: string; name: string | null; dup: Dup; setDup: (d: Dup | ((d: Dup) => Dup)) => void; onDuplicate: (id: string, name: string) => void }) {
  const key = `${list}-${id}`
  const open = dup?.key === key
  return (
    <>
      <IconBtn label="Duplicar" onClick={() => setDup(d => (d?.key === key ? null : { key, name: `${name ?? DEFAULT_PATIO_NAME} (cópia)` }))}><Copy className="h-3.5 w-3.5" /></IconBtn>
      {open && (
        <div className="order-last flex w-full gap-1.5 pt-1">
          <input aria-label="Nome da cópia" value={dup.name} maxLength={60} autoFocus onChange={e => setDup({ key, name: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && dup.name.trim()) { setDup(null); onDuplicate(id, dup.name.trim()) } }} className="h-7 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2" />
          <button type="button" disabled={!dup.name.trim()} onClick={() => { setDup(null); onDuplicate(id, dup.name.trim()) }} className={cn(btn, "h-7")}>Criar cópia</button>
        </div>
      )}
    </>
  )
}

function IconBtn({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary">{children}</button>
}

// onFavorite: the star toggles the favourite (rows from the server only)
function Row({ title, sub, current, unsaved, favorite, onFavorite, icon, busy, playing = 0, onOpen, children }: {
  title: string; sub?: string; current?: boolean; unsaved?: boolean; favorite?: boolean; onFavorite?: () => void; icon?: React.ReactNode; busy?: boolean; playing?: number; onOpen: () => void; children?: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 rounded-md border p-2", current ? "border-primary/60 bg-primary/10" : "border-white/10")}>
      {icon}
      {onFavorite && (
        <button type="button" aria-label="Favoritar" aria-pressed={!!favorite} title={favorite ? "Desfavoritar" : "Favoritar"} disabled={busy} onClick={onFavorite}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#93a79a] hover:text-[#ffd166]">
          <Star className={cn("h-4 w-4", favorite && "fill-[#ffd166] text-[#ffd166]")} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate", unsaved ? "italic text-[#ffd166]" : "text-white")}>{title}</p>
        {sub && <p className="truncate text-[10px] text-[#93a79a]">{sub}</p>}
      </div>
      {playing > 0 && <span title={`${playing} jogando agora`} className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] text-[#b9e3c6]"><span className="h-1.5 w-1.5 rounded-full bg-[#5dff9a]" />{playing} jogando</span>}
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {current ? <span className="px-1 text-[10px] text-[#b9e3c6]">aberto</span> : <button type="button" onClick={onOpen} className={cn(btn, "h-7")}>Enter</button>}
      {children}
    </div>
  )
}
