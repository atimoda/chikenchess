"use client"

// Pátio da Galinha: the game's playground where the player chicken is tuned. The panel edits a draft of
// the central configuration (lib/chicken/config.ts) that the chicken here follows live; "Salvar padrão"
// (admin account only) saves it for every screen that draws the chicken.
import { PatioDisclosure } from "@/components/ui/patio-disclosure"
import { PatioRange } from "@/components/ui/patio-range"
import { useGamePageScrollLock } from "@/hooks/use-game-page-scroll-lock"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Crosshair, FolderOpen, Gamepad2, Ghost, Maximize, Minimize, Pencil, Save, SlidersHorizontal, Sun, Swords, Users, X } from "lucide-react"
import { useOnline } from "@/components/online/online-provider"
import { isAdminUser } from "@/lib/admin/access"
import {
  defaultChickenConfig, getSavedChickenConfig, normalizeChickenConfig, refreshChickenConfig, sameChickenConfig, saveChickenConfig,
  setChickenConfigPreview, subscribeChickenConfig, type ChickenConfig, type SavedChickenConfig,
} from "@/lib/chicken/config"
import { CHICKEN_PARAM_GROUPS, CHICKEN_PARAM_META, CHICKEN_SOUND_TYPES, type ChickenParamKey, type ChickenParamMeta } from "@/lib/chicken/param-meta"
import { ChickenControlsPanel } from "./chicken-controls-panel"
import { CombinationLabel } from "./combination-label"
import { ChickenChat, ChickenChatButton } from "./chicken-chat"
import { LOCAL_CHAT_PLAYER } from "@/lib/chicken/chat"
import { OnlineChickens, netColor, useNet } from "./online-chickens"
import { clearNetNotice, getNetState, joinPatioOnline, kickNetPlayer, leavePatioOnline, onNetLayout, onNetSaved, sendNetLayout, sendNetProfile, sendNetSaved, setNetEditor, setNetPublic } from "@/lib/chicken/online-room"
import { elementsInWorld, entryPortalIn, normalizeLayout, type LayoutElement, type PatioLayout } from "@/lib/pigchicken/layout"
import type { TrainingSpawnRequest } from "@/lib/pigchicken/training-spawn"
import { getOnlineClient } from "@/lib/online/client"
import { ChickenLayer, STICK, useChickenTouch, usePortrait, useTouchLayout } from "./chicken-layer"
import { ChickenPortal, playPortalSound, type ChickenPortalWorld } from "./chicken-portal"
import { portalGate, PORTAL_TRANSITION_MS } from "@/lib/chicken/portal"
import { PatioPortals } from "@/components/pigchicken/patio-portals"
import { ChickenHeadIcon, ChickenVestiario } from "./chicken-vestiario"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GlobeGridIcon } from "@/components/game-presentation"
import { GamePreferences } from "@/components/game-preferences"
import { clearSceneryWind } from "@/lib/pigchicken/scenery-wind"
import type { ChickenEngine } from "@/lib/chicken/engine"
import { BAR_GROUND_H, INV_STACK, ParquinhoForeground, ParquinhoPlay, ParquinhoWorld } from "@/components/pigchicken/parquinho"
import { ItemsPanel } from "@/components/pigchicken/items-panel"
import { AlienCatalogPanel } from "@/components/pigchicken/alien-catalog-panel"
import { JukeboxPanel } from "@/components/pigchicken/jukebox-panel"
import { SongEditorPanel } from "@/components/pigchicken/song-editor-panel"
import { MidiPanel } from "@/components/pigchicken/midi-panel"
import { onOpenJukebox, onOpenMidiGenerator, onOpenSongEditor } from "@/lib/pigchicken/song-library"
import { songsOnlineAvailable, startSongSync } from "@/lib/pigchicken/song-online"
import { VolumeButton } from "@/components/pigchicken/volume-panel"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { CAMERA_MODES } from "@/lib/pigchicken/camera"
import { PatioEditor } from "@/components/pigchicken/patio-editor"
import { LayerEyes, usePatioLayers } from "@/components/pigchicken/layer-eyes"
import { MusicZonesLayer } from "@/components/pigchicken/music-zones-layer"
import { PatioSettingsPanel } from "@/components/pigchicken/patio-settings-panel"
import { patioInventoryLimit, patioScreens, patioWorldTop } from "@/lib/pigchicken/patio-settings"
import { deviceId, forgetPatio, lobbyFromUrl, onPatioOpenRequest, openPatioLobby } from "@/lib/pigchicken/patio-store"
import { setPatioEditAccess, setPatioInfo, usePatioEditAccess } from "@/lib/pigchicken/edit-access"
import { usePatioLobby } from "@/components/pigchicken/use-patio-lobby"
import { setPatioLiveCounts } from "@/lib/pigchicken/patio-live"
import { PatioOpenPanel, PatioPersonPanel, PatioSavePanel, type PatioPersonCard } from "@/components/pigchicken/patio-lobby-panels"
import { AIM_RELEASE_MAX, DEFAULT_PARQUINHO, loadParquinho, saveParquinho, type ParquinhoSettings } from "@/lib/pigchicken/settings"
import {
  LOBBY_MAX, PLAYER_COLORS, addLocalPlayer, adoptDevices, assignDevice, createLobby, firstLocal, loadEntryMode, loadLobby, localPlayers, removePlayer,
  renameLocalPlayer, saveLobby, setEditor, setPlayerLook, type LobbyMode, type LobbyPlayer, type LobbyResult, type LobbyState,
} from "@/lib/chicken/lobby"
import type { ChickenLook } from "@/lib/chicken/look-art"
import { LobbySwitcher, LocalChickens, PlayersPanel, lookForNewPlayer, useInputDevices } from "./players-panel"

const DRAFT = "chickenchess:chicken-patio-draft:v1"
// The globe portal is the layout's entry portal (moved in the editor, never deleted); she starts just to its right,
// clear of the ring
const SPAWN_OFFSET = 110


function readDraft(): ChickenConfig | null {
  try {
    const raw = window.localStorage.getItem(DRAFT)
    return raw ? normalizeChickenConfig(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
function writeDraft(next: ChickenConfig | null) {
  try {
    if (next) window.localStorage.setItem(DRAFT, JSON.stringify(next))
    else window.localStorage.removeItem(DRAFT)
  } catch { /* storage unavailable */ }
}

const fmt = (v: number, step: number) => (step >= 1 ? String(Math.round(v)) : v.toFixed(Math.min(3, String(step).split(".")[1]?.length ?? 2)))

export function ChickenPatio() {
  useGamePageScrollLock()
  const online = useOnline()
  const isAdmin = isAdminUser(online.user)
  // same first render on the server and in the browser; the cached and saved versions come in the effect
  const [saved, setSaved] = useState<SavedChickenConfig>(() => ({ config: defaultChickenConfig(), revision: 0, updatedAt: null }))
  const [draft, setDraft] = useState<ChickenConfig>(defaultChickenConfig)
  const [panelOpen, setPanelOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  // a phone held upright: the whole scene moves up and the touch controls get the ground below it to themselves
  const showTouch = useChickenTouch(), portrait = usePortrait()
  const lifted = showTouch && portrait
  const controlsBottom = lifted ? 16 : undefined
  // on desktop and tablet the world rises so her ground sits above the inventory bar at the bottom
  const groundHeight = lifted ? 16 + STICK + 12 + STICK + 16 : BAR_GROUND_H
  // tela cheia: segue o estado real do navegador (Esc também sai)
  const [fullscreen, setFullscreen] = useState(false)
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", on)
    return () => document.removeEventListener("fullscreenchange", on)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }
  const [vestOpen, setVestOpen] = useState(false)
  const [status, setStatus] = useState<{ kind: "info" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [engine, setEngine] = useState<ChickenEngine | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  // chat bubbles follow these chickens; with several local players, Player 1 speaks for this screen
  // online: the other browsers' first chickens speak too
  const [speakers, setSpeakers] = useState<Record<string, ChickenEngine>>({})
  const chatPlayers = useMemo(() => ({ ...speakers, [LOCAL_CHAT_PLAYER]: engine }), [engine, speakers])
  const worldRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<HTMLDivElement>(null)
  const trainingSpawns = useRef<TrainingSpawnRequest[]>([])
  const [pq, setPq] = useState<ParquinhoSettings>(DEFAULT_PARQUINHO)
  const [pqOpen, setPqOpen] = useState(false)
  // the Sun button: the current Pátio's settings (its limits)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [itemsOpen, setItemsOpen] = useState(false)
  const [aliensOpen, setAliensOpen] = useState(false)
  // the jukebox in the temple opens the songs' panel when she strikes it
  const [jukeboxOpen, setJukeboxOpen] = useState(false)
  const [editingSong, setEditingSong] = useState<string | null>(null)
  useEffect(() => onOpenJukebox(() => setJukeboxOpen(true)), [])
  const [midiOpen, setMidiOpen] = useState(false)
  useEffect(() => onOpenSongEditor(id => { setEditingSong(id); setJukeboxOpen(false); setMidiOpen(false) }), [])
  useEffect(() => onOpenMidiGenerator(() => { setMidiOpen(true); setJukeboxOpen(false) }), [])
  // the jukebox's songs go to the account of whoever is signed in (guests keep them in this browser)
  const songUser = online.user && !online.user.is_anonymous && songsOnlineAvailable() ? online.user.id : null
  useEffect(() => startSongSync(songUser), [songUser])
  useEffect(() => { setPq(loadParquinho()) }, [])
  const setPqValue = <K extends keyof ParquinhoSettings>(key: K, value: ParquinhoSettings[K]) => setPq(prev => { const next = { ...prev, [key]: value }; saveParquinho(next); return next })
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Visual: true, Movimento: true })

  // ---------- players and lobby ----------
  const devices = useInputDevices()
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [playersOpen, setPlayersOpen] = useState(false)
  // whose look the vestiário edits: null the first player (the central configuration's draft), else a local player
  const [vestFor, setVestFor] = useState<string | null>(null)
  const extraEngines = useRef(new Map<string, ChickenEngine>())
  const invOffset = useTouchLayout().offsets.inventory
  // a short notice under the header (lobby rules, online unavailable)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])
  const meName = online.profile?.display_name?.trim() || null
  const changeLobby = (fn: (s: LobbyState) => LobbyState | LobbyResult) => setLobby(prev => {
    if (!prev) return prev
    const out = fn(prev)
    if ("ok" in out) {
      if (!out.ok) setToast(out.reason)
      return out.state
    }
    return out
  })
  // this browser's lobby (its local players and their devices), or a new one; the globe's portal says local or online
  useEffect(() => {
    const entry = loadEntryMode()
    const saved = loadLobby()
    const base = saved ? { ...saved, mode: entry } : createLobby({ name: "Player 1" }, [], Date.now(), entry)
    // the Pátio's id in the address (an invite link or the editor's saved Pátio) is this lobby's id
    const fromUrl = new URLSearchParams(window.location.search).get("lobby")
    setLobby(fromUrl ? { ...base, id: fromUrl } : base)
  }, [])
  useEffect(() => { if (lobby) saveLobby(lobby) }, [lobby])
  // devices found later (a gamepad's first press) go to the first player, or to one standing still
  useEffect(() => { if (devices.length) setLobby(prev => (prev ? adoptDevices(prev, devices) : prev)) }, [devices])
  const me = lobby ? firstLocal(lobby) : null
  const others = useMemo(() => (lobby ? localPlayers(lobby).slice(1) : []), [lobby])
  // each local player's lobby color: their avatar's border and their reticle
  const colors = useMemo(() => {
    const out: Record<string, string> = { p1: me?.color ?? PLAYER_COLORS[0] }
    others.forEach(p => { if (p.color) out[p.id] = p.color })
    return out
  }, [me, others])
  // alone, she listens to everything (as on the globe); with more local players, only to her own devices
  const myDevices = useMemo(() => {
    const first = lobby ? firstLocal(lobby) : null
    return lobby && first && localPlayers(lobby).length > 1 ? first.inputs : null
  }, [lobby])
  useEffect(() => { engine?.setDevices(myDevices) }, [engine, myDevices])
  const setMode = (mode: LobbyMode) => changeLobby(s => ({ ...s, mode }))
  const addPlayer = () => changeLobby(s => addLocalPlayer(s, Date.now(), lookForNewPlayer([draft.look, ...localPlayers(s).flatMap(p => (p.look ? [p.look] : []))])))
  const vestPlayer = lobby && vestFor ? lobby.players.find(p => p.id === vestFor) ?? null : null
  const openVestiario = (playerId: string | null) => { setVestFor(playerId && playerId !== me?.id ? playerId : null); setVestOpen(true) }

  // ---------- the Pátio open here (a lobby: its layout, who created it, its saving) and the editor mode ----------
  const [editorOn, setEditorOn] = useState(false)
  // the header's eyes: the scenery far behind and the "Zonas sonoras" layer
  const patioLayers = usePatioLayers()
  const [editHint, setEditHint] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [openOpen, setOpenOpen] = useState(false)
  const [person, setPerson] = useState<PatioPersonCard | null>(null)
  const meId = online.user?.id ?? null
  const isAccount = !!online.user && !online.user.is_anonymous
  const access = usePatioEditAccess()
  // online, only the lobby owner's browser saves the Pátio to the database (the others edit live through it)
  const net = useNet()
  const netLive = lobby?.mode === "online" && net.status === "online" && !!net.info
  const amOwner = netLive && net.info!.ownerPid === net.myPid
  const amEditor = netLive && (amOwner || net.info!.editors.includes(net.myPid ?? -1))
  const pl = usePatioLobby({ userId: meId, isAccount, isAdmin, canEdit: access.canEdit, saver: !netLive || amOwner, onSaved: rev => { if (getNetState().status === "online") sendNetSaved(rev) } })
  const patio = pl.patio
  useEffect(() => () => clearSceneryWind(), [patio?.id])
  useEffect(() => { void pl.load(lobbyFromUrl()) }, [])
  // a Pátio made here before signing in (its creator is this browser) is mine once I sign in, until it is saved
  const creator = patio && patio.revision === 0 && patio.creatorId === (typeof window === "undefined" ? null : deviceId()) ? (meId ?? patio.creatorId) : patio?.creatorId ?? null
  const editors = pl.remote?.editors
  // the default Pátio is the admin's alone, whoever made it
  const isDefaultLobby = !patio?.id || !!pl.remote?.isDefault
  useEffect(() => {
    setPatioInfo({ lobbyId: patio?.id ?? null, isDefault: isDefaultLobby, creatorId: creator, me: meId ?? (patio ? deviceId() : null), isAdmin, editors })
  }, [patio?.id, creator, meId, isAdmin, editors, isDefaultLobby])
  // the Playgrounds lists count who is here: the local players for now (the online presence feeds it when it is on)
  // ---------- online (the game server, server/) ----------
  const mode = lobby?.mode ?? "local"
  const localCount = lobby ? localPlayers(lobby).length : 1
  const myLooks = useMemo(() => [draft.look, ...others.map(p => p.look ?? null)] as (Record<string, string> | null)[], [draft.look, others])
  const myName = meName ?? "Player 1"
  const netJoin = useRef({ name: myName, chickens: localCount, looks: myLooks, patio })
  netJoin.current = { name: myName, chickens: localCount, looks: myLooks, patio }
  // online on: join the oldest public lobby of this Pátio with a seat (or the room of an invite); off: leave
  const patioKey = patio ? patio.id ?? "default" : null
  useEffect(() => {
    if (mode !== "online" || !patioKey) { void leavePatioOnline(); return }
    let alive = true
    void (async () => {
      const session = (await getOnlineClient()?.auth.getSession())?.data.session ?? null
      const token = session && !session.user.is_anonymous ? session.access_token : null
      const j = netJoin.current
      const roomId = new URLSearchParams(window.location.search).get("room")
      const r = await joinPatioOnline({
        patioId: j.patio?.id ?? null, roomId: roomId || null, token, name: j.name, chickens: j.chickens, looks: j.looks,
        claimed: { name: j.patio?.name ?? null, creatorId: j.patio?.creatorId ?? null, godparentId: j.patio?.godparentId ?? null },
      })
      if (!alive) return
      if (!r.ok) { setToast(r.reason); changeLobby(s => ({ ...s, mode: "local" })) }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, patioKey])
  useEffect(() => () => { void leavePatioOnline() }, [])
  // name, chickens and looks reach the others as they change
  useEffect(() => { if (net.status === "online") sendNetProfile({ name: myName, chickens: localCount, looks: myLooks }) }, [net.status, myName, localCount, myLooks])
  // a notice from the server (removed by the owner, an action refused); removed: back to local
  useEffect(() => {
    if (!net.notice) return
    setToast(net.notice)
    clearNetNotice()
    if (getNetState().status === "off") changeLobby(s => ({ ...s, mode: "local" }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net.notice])
  // the Players panel online: this browser's players plus one row per other browser, owner and editors as the server says
  const myPid = net.myPid
  const shownLobby = useMemo<LobbyState | null>(() => {
    if (!lobby || mode !== "online" || net.status !== "online" || !net.info) return lobby
    const info = net.info
    const mine = info.players.find(p => p.pid === myPid)
    const myColor = mine ? netColor(mine.color) : PLAYER_COLORS[0]
    const locals = localPlayers(lobby).map(p => ({ ...p, color: myColor }))
    const remote: LobbyPlayer[] = info.players.filter(p => p.pid !== myPid).map(p => ({
      id: `net:${p.pid}`, kind: "online", name: p.chickens > 1 ? `${p.name} (${p.chickens})` : p.name, joinedAt: p.joinedAt, inputs: [],
      inputLabel: p.inputLabel || undefined, look: (p.looks[0] as ChickenLook | null) ?? undefined, userId: p.userId ?? undefined, color: netColor(p.color),
    }))
    const idOf = (pid: number | null) => (pid === null ? null : pid === myPid ? locals[0]?.id ?? null : `net:${pid}`)
    const editors = info.editors.map(idOf).filter((x): x is string => !!x)
    const ownerId = idOf(info.ownerPid)
    return { ...lobby, players: [...locals, ...remote], ownerId, editors: ownerId ? [...new Set([ownerId, ...editors])] : editors, creatorId: patio?.creatorId ?? null, godparentId: patio?.godparentId ?? null, visibility: info.public ? "public" : "private", status: "online" }
  }, [lobby, mode, net, myPid, patio?.creatorId, patio?.godparentId])
  const netPid = (id: string) => (id.startsWith("net:") ? Number(id.slice(4)) : null)
  const removeFromLobby = (id: string) => {
    const pid = netPid(id)
    if (pid !== null) kickNetPlayer(pid)
    else changeLobby(s => removePlayer(s, me?.id ?? "", id))
  }
  const editorInLobby = (id: string, on: boolean) => {
    const pid = netPid(id)
    if (pid !== null) setNetEditor(pid, on)
    else if (net.status === "online" && id !== me?.id) { /* this browser's other players edit with Player 1 */ }
    else changeLobby(s => setEditor(s, me?.id ?? "", id, on))
  }
  const playersHere = net.status === "online" && net.info ? net.info.players.length : lobby?.players.length ?? 0
  useEffect(() => { setPatioLiveCounts({ [patio?.id ?? "default"]: playersHere }) }, [patio?.id, playersHere])
  // losing the permission (another Pátio, the owner changed it) closes the editor
  useEffect(() => { if (!access.canEdit) setEditorOn(false) }, [access.canEdit])
  // Edit mode live: whoever may edit sends the layout to the lobby a moment after each change; the others' edits
  // arrive here (and the owner's saves move everyone's revision along)
  const sendTimer = useRef<number | null>(null)
  const lastSent = useRef("")
  const changeLayout = (layout: PatioLayout) => {
    pl.changeLayout(layout)
    if (!netLive || !access.canEdit) return
    if (sendTimer.current) window.clearTimeout(sendTimer.current)
    sendTimer.current = window.setTimeout(() => {
      sendTimer.current = null
      // a change undone before it left: nothing new to send
      const json = JSON.stringify(layout)
      if (json === lastSent.current) return
      lastSent.current = json
      sendNetLayout(layout)
    }, 300)
  }
  const liveRef = useRef({ apply: pl.applyLiveLayout, adopt: pl.adoptRevision, isDefault: isDefaultLobby })
  liveRef.current = { apply: pl.applyLiveLayout, adopt: pl.adoptRevision, isDefault: isDefaultLobby }
  useEffect(() => {
    const offLayout = onNetLayout(raw => { const layout = normalizeLayout(raw, liveRef.current.isDefault); if (layout) liveRef.current.apply(layout) })
    const offSaved = onNetSaved(rev => liveRef.current.adopt(rev))
    return () => { offLayout(); offSaved() }
  }, [])
  // online, the lobby decides who edits (the owner and whoever it allowed); the default Pátio stays the admin's
  useEffect(() => {
    setPatioEditAccess(netLive ? { lobbyId: patio?.id ?? null, mode: "online", canEdit: amEditor } : null)
    return () => setPatioEditAccess(null)
  }, [netLive, amEditor, patio?.id])
  // Switching Pátio: every local chicken is sucked into this Pátio's entry portal; once the other one is open (and
  // drawn), they come out of its entry portal.
  const entryRef = useRef<LayoutElement | null>(null)
  const travelling = useRef(false)
  const travel = async <T,>(go: () => Promise<T>): Promise<T> => {
    const actors = () => [...(engine ? [engine] : []), ...extraEngines.current.values()]
    const centre = () => {
      const box = worldRef.current?.getBoundingClientRect(), el = entryRef.current
      return box && el ? { x: box.left + el.x + el.w / 2, y: box.top + el.y + el.h / 2 } : null
    }
    const from = centre()
    if (travelling.current || !from || !actors().length) return go()
    travelling.current = true
    try {
      for (const a of actors()) { portalGate(a, "patio").block(); a.setPortalEntry({ ...from, durationMs: PORTAL_TRANSITION_MS }) }
      playPortalSound("enter")
      await new Promise(r => window.setTimeout(r, PORTAL_TRANSITION_MS))
      const result = await go()
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const to = centre() ?? from
      for (const a of actors()) { portalGate(a, "patio").block(); a.arriveAtPortal({ ...to, durationMs: PORTAL_TRANSITION_MS }) }
      playPortalSound("arrive")
      return result
    } catch (err) {
      for (const a of actors()) a.setPortalEntry(null)
      throw err
    } finally {
      travelling.current = false
    }
  }
  // another lobby (from "Abrir" or the lobby panel's Próximo / Anterior): what is pending is saved, the editor closes
  const switchLobby = (id: string | null) => {
    setEditorOn(false)
    setEditHint(false)
    setOpenOpen(false)
    setPerson(null)
    // the players' lobby is the Pátio open here
    setLobby(prev => (prev ? { ...prev, id: id ?? prev.id } : prev))
    return travel(() => pl.switchTo(id))
  }
  const switchRef = useRef(switchLobby)
  switchRef.current = switchLobby
  useEffect(() => onPatioOpenRequest(id => switchRef.current(id)), [])
  // a new Pátio of mine (a copy of the default one, or an empty one): I am its creator and may edit it
  const startNewPatio = (empty = false) => {
    setEditorOn(false)
    setEditHint(false)
    setOpenOpen(false)
    setPerson(null)
    void travel(() => pl.startNew(meId ?? deviceId(), empty)).then(id => {
      if (id) setLobby(prev => (prev ? { ...prev, id } : prev))
      setEditorOn(true)
    })
  }
  const canRename = !!patio && isAccount && (isDefaultLobby ? isAdmin : patio.name ? isAdmin || patio.creatorId === meId || patio.godparentId === meId : access.canEdit)
  const renameHint = !isAccount ? "Entre com sua conta para dar nome ao Pátio." : isDefaultLobby ? "Só o admin renomeia o Pátio padrão." : patio?.name ? "Só o criador ou o padrinho renomeiam este Pátio." : "Só quem pode editar este Pátio dá o primeiro nome."
  const toggleEditor = () => {
    if (!access.canEdit) { setEditHint(v => !v); return }
    setEditHint(false)
    setEditorOn(v => !v)
  }
  const toggleRef = useRef(toggleEditor)
  toggleRef.current = toggleEditor
  // "=" turns the editor mode on and off
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
      if (e.key === "=" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); toggleRef.current() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // start from this browser's unsaved draft, if any, and fetch the latest saved version
  useEffect(() => {
    const local = readDraft()
    const cached = getSavedChickenConfig()
    setSaved(cached)
    setDraft(local ?? cached.config)
    void refreshChickenConfig(true).then(next => {
      setSaved(next)
      if (!local) setDraft(next.config)
    })
    return subscribeChickenConfig(() => setSaved(getSavedChickenConfig()))
  }, [])

  // the chickens on screen follow the draft while the pátio is open
  useEffect(() => { setChickenConfigPreview(draft) }, [draft])
  useEffect(() => () => setChickenConfigPreview(null), [])

  const dirty = useMemo(() => !sameChickenConfig(draft, saved.config), [draft, saved])

  const update = (fn: (c: ChickenConfig) => void) => {
    setDraft(prev => {
      const next = structuredClone(prev)
      fn(next)
      writeDraft(sameChickenConfig(next, saved.config) ? null : next)
      return next
    })
    setStatus(null)
  }
  const setParam = (key: ChickenParamKey, value: unknown) => update(c => { (c.params as Record<string, unknown>)[key] = value })
  const replaceDraft = (next: ChickenConfig) => {
    writeDraft(sameChickenConfig(next, saved.config) ? null : next)
    setDraft(next)
    setStatus(null)
  }

  const save = async () => {
    setSaving(true)
    setStatus({ kind: "info", text: "Salvando…" })
    try {
      const next = await saveChickenConfig(draft)
      setSaved(next)
      setDraft(next.config)
      writeDraft(null)
      setStatus({ kind: "info", text: "Salvo. Todas as telas com a galinha já usam esta versão." })
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar." })
    } finally {
      setSaving(false)
    }
  }

  const patioName = patio?.name ?? (patio?.id ? "Pátio sem nome" : "Pátio da Galinha")
  // the Pátio's limits (the Sun panel): its width in scenes (a Pátio saved before it had one keeps this browser's
  // old "Largura do mundo") and its ceiling; the Câmera de Mira settings with that width
  const screens = patioScreens(patio?.layout.settings, pq.screens)
  const worldTop = patioWorldTop(patio?.layout.settings)
  const pqWorld = useMemo(() => ({ ...pq, screens }), [pq, screens])
  // the entry portal (to the globe, and where she arrives) as the layout places it
  const entry = useMemo(() => entryPortalIn(elementsInWorld(patio?.layout ?? { v: 0, elements: [] }, screens)), [patio?.layout, screens])
  entryRef.current = entry
  const portalWorld = useMemo<ChickenPortalWorld>(() => ({ host: worldRef, x: entry.x + entry.w / 2, groundY: entry.y + entry.h - 6, d: entry.w }), [entry])

  return (
    <main data-disable-text-selection className="fixed inset-0 overflow-hidden bg-[#05060c] text-[#dfe8df]">
      <header className="pointer-events-auto absolute inset-x-0 top-0 z-[120] flex items-center gap-2 bg-transparent px-4 py-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]" style={{ "--city-neon": "var(--primary)" } as React.CSSProperties}>
        {/* the same Globe button as the chess matches' header */}
        <Button
          asChild
          variant="outline"
          size="icon"
          className="shrink-0 text-[var(--city-neon)] hover:text-white hover:bg-[var(--city-neon)] hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-black/70 active:text-[var(--city-neon)] active:border-[var(--city-neon)] focus-visible:text-[var(--city-neon)] transition-all"
        >
          <Link href="/" aria-label="Voltar ao globo" title="Voltar ao globo"><GlobeGridIcon maskId="patio" /></Link>
        </Button>
        <button type="button" aria-label="Playgrounds" aria-pressed={openOpen} title="Playgrounds" onClick={() => setOpenOpen(v => !v)} className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors hover:border-[#ffd166] hover:text-white", openOpen ? "border-[#ffd166] text-white" : "border-white/15 text-[#b9c7b9]")}>
          <FolderOpen className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Salvar Pátio" aria-pressed={saveOpen} title={patio?.dirty ? "Salvar Pátio (há mudanças)" : "Salvar Pátio"} onClick={() => setSaveOpen(v => !v)} className={cn("relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors hover:border-[#ffd166] hover:text-white", saveOpen ? "border-[#ffd166] text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Save className="h-4 w-4" />
          {patio?.dirty && <span aria-hidden="true" className={cn("absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full", pl.save.kind === "conflict" || pl.save.kind === "error" ? "bg-[#ff8a7a]" : "bg-[#ffd166]")} />}
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Modo editor"
            aria-pressed={editorOn}
            title={access.canEdit ? "Modo editor (=)" : "Modo editor: este Pátio não é seu"}
            onClick={toggleEditor}
            className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-[#ffd166] hover:text-white", editorOn ? "border-[#ffd166] bg-[#ffd166]/15 text-white" : "border-white/15 text-[#b9c7b9]", !access.canEdit && "opacity-60")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {editHint && !access.canEdit && (
            <div role="dialog" aria-label="Sem permissão para editar" className="fixed right-3 top-14 z-[130] w-64 rounded-lg border border-[#ffd166]/50 bg-[#101713] p-3 font-mono text-[11px] leading-relaxed text-[#dfe8df] shadow-lg [text-shadow:none]">
              <p>{access.reason === "default" ? "Este é o Pátio padrão: só o admin edita." : access.reason === "notAllowed" ? "O dono deste Pátio não liberou a edição para você." : "Este Pátio não é seu."} Crie um Pátio seu (uma cópia do padrão) para editar.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => startNewPatio()} className="h-8 rounded-md border border-[#ffd166] bg-[#ffd166] px-3 font-bold text-[#05060c]">Criar meu Pátio</button>
                <button type="button" onClick={() => setEditHint(false)} className="h-8 rounded-md border border-white/20 px-3">Fechar</button>
              </div>
            </div>
          )}
        </div>
        <LayerEyes {...patioLayers} />
        <h1 className="hidden min-w-0 items-baseline gap-1.5 whitespace-nowrap font-mono text-sm font-bold sm:flex">
          <span className="truncate" title={patioName}>{patioName}</span>
          {patio?.dirty && <span className="shrink-0 text-[11px] font-normal text-[#93a79a]"> (não salvo)</span>}
        </h1>
        {/* the lobby switcher and the players, right after the Pátio's name */}
        <LobbySwitcher mode={lobby?.mode ?? "local"} roomId={net.info?.roomId ?? null} onStatus={setToast} onSwitch={target => {
          // the other lobby's Pátio opens, and its room is the one joined
          const url = new URL(window.location.href)
          url.searchParams.set("room", target.roomId)
          window.history.replaceState(null, "", url)
          void leavePatioOnline()
          if ((patio?.id ?? "default") === target.patioId) void joinPatioOnline({ roomId: target.roomId, name: myName, chickens: localCount, looks: myLooks }).then(r => { if (!r.ok) setToast(r.reason) })
          else openPatioLobby(target.patioId === "default" ? null : target.patioId)
        }} />
        {/* on a phone the buttons scroll sideways instead of pushing the avatar off screen */}
        <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto [&>*]:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" aria-label="Players e lobby" aria-pressed={playersOpen} title="Players e lobby" onClick={() => setPlayersOpen(v => !v)} className={cn("relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", playersOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Users className="h-4 w-4" />
          {playersHere > 1 && <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center font-mono text-[10px] font-bold leading-4 text-[#05060c]">{playersHere}</span>}
        </button>
        <ChickenChatButton open={chatOpen} onToggle={() => setChatOpen(v => !v)} />
        <button type="button" aria-label="Configurações do Pátio" aria-pressed={settingsOpen} title="Configurações do Pátio" onClick={() => setSettingsOpen(v => !v)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-[#ffd166] hover:text-white", settingsOpen ? "border-[#ffd166] text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Sun className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Itens" aria-pressed={itemsOpen} title="Armas e instrumentos" onClick={() => { setItemsOpen(v => !v); setPqOpen(false); setAliensOpen(false) }} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", itemsOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Swords className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Catálogo de aliens" aria-pressed={aliensOpen} title="Catálogo de aliens" onClick={() => { setAliensOpen(v => !v); setItemsOpen(false); setPqOpen(false) }} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", aliensOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Ghost className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Câmera de Mira" aria-pressed={pqOpen} title="Câmera de Mira" onClick={() => { setPqOpen(v => !v); setItemsOpen(false); setAliensOpen(false) }} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", pqOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <Crosshair className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Controles" title="Controles" onClick={() => setControlsOpen(v => !v)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-[#b9c7b9] transition-colors hover:border-primary hover:text-white">
          <Gamepad2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Ajustes da galinha" aria-pressed={panelOpen} title="Ajustes da galinha" onClick={() => setPanelOpen(v => !v)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", panelOpen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <VolumeButton />
        <GamePreferences className="border-white/15 bg-transparent text-[#b9c7b9] hover:border-primary" />
        <button type="button" aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"} aria-pressed={fullscreen} title={fullscreen ? "Sair da tela cheia" : "Tela cheia"} onClick={toggleFullscreen} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:border-primary hover:text-white", fullscreen ? "border-primary text-white" : "border-white/15 text-[#b9c7b9]")}>
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
        </div>
      </header>
      {/* the avatars: one per local player, at the right end of that player's inventory (drawn by the Parquinho) */}
      <div data-chicken-ignore className="pointer-events-none fixed z-[190] flex flex-col" style={{ top: INV_STACK.top + (invOffset?.y ?? 0), right: INV_STACK.right - (invOffset?.x ?? 0), gap: INV_STACK.rowGap }}>
        {[{ id: null as string | null, look: draft.look, name: meName ?? "Player 1", color: colors.p1 }, ...others.map(p => ({ id: p.id as string | null, look: p.look ?? draft.look, name: p.name, color: colors[p.id] ?? PLAYER_COLORS[0] }))].map(row => {
          const on = vestOpen && vestFor === row.id
          return (
            <button key={row.id ?? "me"} type="button" aria-label={`Vestiário · ${row.name}`} aria-pressed={on} title={`Vestiário · ${row.name}`} onClick={() => { if (on) setVestOpen(false); else openVestiario(row.id) }} className={cn("pointer-events-auto shrink-0 overflow-hidden rounded-full border-[3px] bg-[#101713] transition-shadow", on && "ring-2 ring-white/80 ring-offset-1 ring-offset-black")} style={{ width: INV_STACK.size, height: INV_STACK.size, borderColor: row.color }}>
              <ChickenHeadIcon look={row.look} />
            </button>
          )
        })}
      </div>
      {toast && (
        <div role="status" className="pointer-events-none fixed left-1/2 top-16 z-[330] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border border-amber-300/40 bg-black/80 px-4 py-2 text-center font-mono text-xs text-amber-100 backdrop-blur animate-in fade-in">
          {toast}
        </div>
      )}


      {/* the world (ground included) is in fixed units: the same size on every screen, only the crop changes */}
      <ParquinhoWorld screens={screens} worldRef={worldRef} debug={pq.debug} elements={patio?.layout.elements} editing={editorOn} worldTop={worldTop} groundHeight={groundHeight} hideBackdrop={!patioLayers.layers.backdrop} />

      <ChickenLayer dropIn={false} fixedScale onEngine={setEngine} groundHeight={groundHeight} controlsBottom={controlsBottom} />
      <ChickenPortal engine={engine} id="patio" href="/" world={portalWorld} label="Back to the globe?" enabled={!editorOn} actors={() => [...(engine ? [engine] : []), ...extraEngines.current.values()]} />
      <PatioPortals engine={engine} extras={extraEngines} worldRef={worldRef} elements={patio?.layout.elements} screens={screens} editing={editorOn} />
      <LocalChickens players={others} lead={engine} groundHeight={groundHeight} engines={extraEngines} />
      {mode === "online" && <OnlineChickens own={() => (engine ? [engine, ...others.map(p => extraEngines.current.get(p.id)).filter((e): e is ChickenEngine => !!e)] : [])} groundHeight={groundHeight} onSpeakers={setSpeakers} />}
      <ParquinhoPlay engine={engine} settings={pqWorld} worldTop={worldTop} worldRef={worldRef} groundHeight={groundHeight} lifted={lifted} spawnX={entry.x + entry.w / 2 + SPAWN_OFFSET} fgRef={fgRef} devices={myDevices} extras={extraEngines} colors={colors} elements={patio?.layout.elements} trainingSpawns={trainingSpawns} inventoryLimit={patioInventoryLimit(patio?.layout.settings)} sceneZones={patio?.layout.settings?.sceneZones} showScaleFan={patioLayers.layers.scale} />
      {/* the trees in front of her (half see-through) */}
      <ParquinhoForeground screens={screens} fgRef={fgRef} elements={patio?.layout.elements} editing={editorOn} />
      {editorOn && patio && access.canEdit && <PatioEditor layout={patio.layout} screens={screens} onChange={changeLayout} onClose={() => setEditorOn(false)} onSpawnEnemy={(kind, x, y) => trainingSpawns.current.push({ kind, x, y })}
        soundLayer={patioLayers.layers.zones} onSoundLayer={() => patioLayers.toggle("zones")} />}
      {/* the "Zonas sonoras" layer outside the editor: only shown, the tags do not change anything */}
      {patioLayers.layers.zones && !(editorOn && patio && access.canEdit) && (
        <MusicZonesLayer elements={elementsInWorld({ v: 1, elements: patio?.layout.elements ?? [] }, screens)} screens={screens} sceneZones={patio?.layout.settings?.sceneZones} editable={false} />
      )}
      <ChickenChat players={chatPlayers} open={chatOpen} onOpenChange={setChatOpen} bottom={groundHeight + 12} myName={me?.name} />
      {saveOpen && patio && (
        <PatioSavePanel
          patio={patio} remote={pl.remote} save={pl.save} canEdit={access.canEdit} canRename={canRename} renameHint={renameHint} isAccount={isAccount}
          onSave={() => void pl.saveNow()} onRename={pl.rename} onFavorite={on => void pl.favorite(on)} onResolve={c => void pl.resolveConflict(c)}
          onPerson={setPerson} onLogin={online.openLogin} onClose={() => setSaveOpen(false)}
        />
      )}
      {openOpen && (
        <PatioOpenPanel
          currentId={patio?.id ?? null} me={meId} isAdmin={isAdmin} isAccount={isAccount}
          onOpen={switchLobby} onNew={startNewPatio} onLogin={online.openLogin}
          onDeleted={id => { forgetPatio(id); if (id === patio?.id) switchLobby(null) }}
          onClose={() => setOpenOpen(false)}
        />
      )}
      {settingsOpen && patio && <PatioSettingsPanel layout={patio.layout} screens={screens} canEdit={access.canEdit} onChange={changeLayout} onClose={() => setSettingsOpen(false)} />}
      {person && <PatioPersonPanel key={person.userId} person={person} onClose={() => setPerson(null)} />}
      {itemsOpen && <ItemsPanel onClose={() => setItemsOpen(false)} />}
      {aliensOpen && <AlienCatalogPanel onClose={() => setAliensOpen(false)} />}
      {jukeboxOpen && <JukeboxPanel onClose={() => setJukeboxOpen(false)} />}
      {midiOpen && <MidiPanel onClose={() => setMidiOpen(false)} />}
      {editingSong && <SongEditorPanel key={editingSong} songId={editingSong} onClose={() => setEditingSong(null)} />}
      {pqOpen && (
        <FloatingPanel id="parquinho" aria-label="Câmera de Mira" initial={(vw, vh) => ({ x: 12, y: 64, w: Math.min(320, vw - 24), h: Math.min(560, vh - 80) })} className="gap-3 overflow-y-auto rounded-xl border border-primary/30 bg-[#101713] p-4 font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div data-drag-handle className="flex shrink-0 cursor-move items-center gap-2">
            <h2 className="flex-1 text-sm text-white">Câmera de Mira</h2>
            <button type="button" onClick={() => { setPq(DEFAULT_PARQUINHO); saveParquinho(DEFAULT_PARQUINHO) }} className="h-7 rounded-md border border-white/20 px-2 hover:border-primary">Padrão</button>
            <button type="button" aria-label="Fechar" onClick={() => setPqOpen(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
          </div>
          <label className="flex items-center justify-between gap-3 text-xs"><span>Câmera</span>
            <select aria-label="Câmera" value={pq.camera} onChange={e => setPqValue("camera", e.target.value as ParquinhoSettings["camera"])} className="h-8 rounded-md border border-white/15 bg-[#0b110e] px-2 font-mono text-xs">
              {CAMERA_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <PqRange label="Folga da câmera" unit="px" min={0} max={400} step={10} value={pq.deadband} onChange={v => setPqValue("deadband", v)} hint="Quanto ela anda a partir do centro antes da câmera seguir" />
          <PqRange label="Velocidade da câmera" unit="" min={1} max={20} step={1} value={pq.lag} onChange={v => setPqValue("lag", v)} />
          <PqRange label="Desvio da tela de acordo com o lado" unit="px" min={0} max={500} step={10} value={pq.lookAhead} onChange={v => setPqValue("lookAhead", v)} hint="Quanto a tela se desloca para o lado em que ela está olhando (câmera seguindo; 0 deixa ela no centro)" />
          <PqRange label="Velocidade do desvio" unit="" min={0.5} max={12} step={0.5} value={pq.lookAheadSpeed} onChange={v => setPqValue("lookAheadSpeed", v)} hint="Quão rápido a tela passa para o outro lado quando ela vira" />
          <PqRange label="Mira parada volta para o movimento" unit="s" min={0} max={AIM_RELEASE_MAX + 0.25} step={0.25} value={Number.isFinite(pq.aimRelease) ? pq.aimRelease : AIM_RELEASE_MAX + 0.25} onChange={v => setPqValue("aimRelease", v > AIM_RELEASE_MAX ? Infinity : v)} format={v => (v > AIM_RELEASE_MAX ? "∞ (nunca)" : `${v} s`)} hint="Depois de quantos segundos com o mouse / analógico de mira parados o analógico esquerdo ou as teclas de movimento voltam a mirar. No fim da barra (∞) a mira fica sempre onde você deixou" />
          <PqRange label="Distância da retícula" unit="px" min={60} max={500} step={10} value={pq.reticleDist} onChange={v => setPqValue("reticleDist", v)} hint="No analógico e nas setas" />
          <PqRange label="Tremida da mira quando pula" unit="°" min={0} max={30} step={0.5} value={pq.jumpShake} onChange={v => setPqValue("jumpShake", v)} hint="Quanto a mira treme ao pular (também no ar e na parede); some em meio segundo. 0 desliga" />
          <PqRange label="Tremida da mira quando super-pulo" unit="°" min={0} max={30} step={0.5} value={pq.superJumpShake} onChange={v => setPqValue("superJumpShake", v)} hint="Quanto a mira treme no super pulo (agachar + pular). 0 desliga" />
          <label className="flex items-center justify-between gap-3 text-xs"><span>Notas no ritmo (quantizar)</span><input type="checkbox" checked={pq.quantize} onChange={e => setPqValue("quantize", e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" /></label>
          <p className="text-[10px] text-[#93a79a]">Zona morta e ímã dos analógicos ficam em Controles.</p>
        </FloatingPanel>
      )}
      <ChickenControlsPanel open={controlsOpen} onOpenChange={setControlsOpen} editLayout />

      {vestOpen && (vestPlayer?.look
        ? <ChickenVestiario key={vestPlayer.id} look={vestPlayer.look} savedLook={vestPlayer.look} onChange={(look: ChickenLook) => changeLobby(s => setPlayerLook(s, vestPlayer.id, look))} onClose={() => setVestOpen(false)} />
        : <ChickenVestiario look={draft.look} savedLook={saved.config.look} onChange={look => update(c => { c.look = look })} onClose={() => setVestOpen(false)} />)}

      {playersOpen && lobby && (
        <PlayersPanel
          lobby={shownLobby ?? lobby}
          seats={net.status === "online" && net.info ? { used: net.info.players.length, max: LOBBY_MAX } : null}
          connecting={mode === "online" && net.status !== "online"}
          onPublic={on => setNetPublic(on)}
          devices={devices}
          meName={meName}
          meLook={draft.look}
          onClose={() => setPlayersOpen(false)}
          onMode={setMode}
          onAdd={addPlayer}
          onRemove={removeFromLobby}
          onAssign={(d, id) => changeLobby(s => assignDevice(s, d, id))}
          onEditor={editorInLobby}
          onRename={(id, name) => changeLobby(s => renameLocalPlayer(s, id, name))}
          onAvatar={id => openVestiario(id)}
        />
      )}

      {panelOpen && (
        <FloatingPanel id="chicken-tuning" aria-label="Ajustes da galinha" initial={(vw, vh) => { const w = Math.min(400, vw - 24); return { x: vw - w - 12, y: 64, w, h: vh - 104 } }} minW={280} className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div data-drag-handle className="flex cursor-move items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <h2 className="flex-1 text-sm text-white">Ajustes</h2>
            {dirty && <span className="rounded-full border border-amber-300/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">rascunho</span>}
            <button type="button" aria-label="Fechar ajustes" onClick={() => setPanelOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-2 border-b border-white/10 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <button type="button" disabled={!dirty || saving} onClick={() => void save()} className="h-8 rounded-md border border-primary bg-primary px-3 font-bold text-[#05060c] disabled:cursor-default disabled:opacity-45">Salvar padrão</button>
              ) : (
                <button type="button" onClick={online.openLogin} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">Entrar para salvar</button>
              )}
              <button type="button" disabled={!dirty} onClick={() => replaceDraft(saved.config)} className="h-8 rounded-md border border-white/20 px-3 hover:border-primary disabled:opacity-45">Desfazer</button>
              <button type="button" onClick={() => replaceDraft(defaultChickenConfig())} title="Volta todos os valores para o padrão que vem no código do jogo" className="h-8 rounded-md border border-white/20 px-3 hover:border-primary">Valores do código</button>
              <button type="button" aria-pressed={pq.debug} onClick={() => setPqValue("debug", !pq.debug)} title="Mostra as informações de debug: a linha de estado no rodapé, os nomes das cenas e as linhas dos telhados que são plataformas" className={cn("h-8 rounded-md border px-3 hover:border-primary", pq.debug ? "border-primary bg-primary/15 text-white" : "border-white/20")}>Debug</button>
            </div>
            <p className={cn("leading-relaxed", status?.kind === "error" ? "text-red-300" : "text-[#93a79a]")}>
              {status?.text ?? (isAdmin
                ? "Os ajustes valem aqui na hora. “Salvar padrão” grava para todas as telas e para todo mundo."
                : online.user && !online.user.is_anonymous
                  ? "Os ajustes valem só aqui, neste navegador. Só a conta admin salva a configuração central."
                  : "Os ajustes valem só aqui, neste navegador. Entre com a conta admin para salvar para todas as telas.")}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Group title="Visual" open={!!openGroups.Visual} onToggle={v => setOpenGroups(o => ({ ...o, Visual: v }))}>
              <button type="button" onClick={() => setVestOpen(true)} className="h-8 justify-self-start rounded-md border border-white/20 px-3 hover:border-primary">Abrir o vestiário (raças e partes)</button>
              {CHICKEN_PARAM_META.filter(p => p.group === "Visual").map(p => <ParamRow key={p.key} meta={p} draft={draft} saved={saved.config} onChange={setParam} />)}
            </Group>
            {CHICKEN_PARAM_GROUPS.filter(g => g !== "Visual").map(g => (
              <Group key={g} title={g} open={!!openGroups[g]} onToggle={v => setOpenGroups(o => ({ ...o, [g]: v }))}>
                {CHICKEN_PARAM_META.filter(p => p.group === g).map(p => <ParamRow key={p.key} meta={p} draft={draft} saved={saved.config} onChange={setParam} />)}
              </Group>
            ))}
          </div>
        </FloatingPanel>
      )}
    </main>
  )
}

function Group({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <PatioDisclosure title={title} open={open} onToggle={onToggle}>
      <div className="grid gap-3 px-4 pb-4">{children}</div>
    </PatioDisclosure>
  )
}

function ParamRow({ meta, draft, saved, onChange }: { meta: ChickenParamMeta; draft: ChickenConfig; saved: ChickenConfig; onChange: (key: ChickenParamKey, value: unknown) => void }) {
  const value = draft.params[meta.key] ?? defaultChickenConfig().params[meta.key]
  const changed = value !== (saved.params[meta.key] ?? defaultChickenConfig().params[meta.key])
  if (meta.type === "bool") {
    return (
      <label className="flex items-center justify-between gap-3" title={meta.hint}>
        <span className={cn(changed && "text-amber-300")}><CombinationLabel meta={meta} /></span>
        <input type="checkbox" checked={!!value} onChange={e => onChange(meta.key, e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
      </label>
    )
  }
  if (meta.type === "select") {
    return (
      <label className="flex items-center justify-between gap-3">
        <span className={cn("min-w-0", changed && "text-amber-300")}><CombinationLabel meta={meta} /></span>
        <select value={String(value)} onChange={e => onChange(meta.key, e.target.value)} className="h-8 w-36 shrink-0 rounded-md border border-white/15 bg-[#0b110e] px-2">
          <option value="">sem som</option>
          <option value="all">sorteio</option>
          {CHICKEN_SOUND_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    )
  }
  const n = value as number
  return <PatioRange label={<CombinationLabel meta={meta} />} name={meta.label} min={meta.min} max={meta.max} step={meta.step}
    value={n} display={`${fmt(n, meta.step)}${meta.unit ? ` ${meta.unit}` : ""}`} hint={meta.hint} changed={changed}
    onChange={value => onChange(meta.key, value)} onReset={() => onChange(meta.key, saved.params[meta.key])} />
}

function PqRange({ label, unit, min, max, step, value, onChange, hint, format }: { label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; hint?: string; format?: (v: number) => string }) {
  return <PatioRange label={label} min={min} max={max} step={step} value={value} onChange={onChange} hint={hint}
    display={format ? format(value) : `${value}${unit ? ` ${unit}` : ""}`} />
}
