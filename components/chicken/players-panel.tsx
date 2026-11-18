"use client"

// Players and lobby of the Pátio: the panel (local / online switch, one row per player with the input devices as
// columns, Edit mode permission and Remove), the other local players' chickens and the lobby switcher of the header.
import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Crown, Link2, Plus, UserPlus, Users, X } from "lucide-react"
import { createChickenEngine, type ChickenEngine } from "@/lib/chicken/engine"
import { LOOK_ART, type ChickenLook } from "@/lib/chicken/look-art"
import { connectedPads, inputDeviceLabel, sortDevices, type InputDeviceId } from "@/lib/chicken/input-devices"
import {
  LOCAL_MAX, canEditPatio, isProtectedPlayer, firstLocal, isOwner, localPlayers, neighbourLobby,
  type LobbyMode, type LobbyPlayer, type LobbyState,
} from "@/lib/chicken/lobby"
import { ONLINE_OFF, listNetLobbies, type NetLobby } from "@/lib/chicken/online-room"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { ChickenHeadIcon } from "./chicken-vestiario"
import { cn } from "@/lib/utils"

// ---------- the input devices this computer has ----------
// Keyboards can not be detected: a computer with a fine pointer (or one that typed a key) has both of them.
// Gamepads show after their first button press (the browser hides them before that).
export function useInputDevices(): InputDeviceId[] {
  const [list, setList] = useState<InputDeviceId[]>([])
  useEffect(() => {
    let typed = false
    const read = () => {
      const fine = window.matchMedia("(any-pointer: fine)").matches
      const coarse = window.matchMedia("(any-pointer: coarse)").matches
      const next: InputDeviceId[] = []
      if (fine || typed) next.push("kb1", "kb2")
      if (fine) next.push("mouse")
      if (coarse) next.push("touch")
      next.push(...connectedPads())
      const sorted = sortDevices(next)
      setList(prev => (prev.length === sorted.length && prev.every((d, i) => d === sorted[i]) ? prev : sorted))
    }
    const onKey = () => { if (!typed) { typed = true; read() } }
    read()
    const timer = window.setInterval(read, 1000)
    window.addEventListener("gamepadconnected", read)
    window.addEventListener("gamepaddisconnected", read)
    window.addEventListener("keydown", onKey)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("gamepadconnected", read)
      window.removeEventListener("gamepaddisconnected", read)
      window.removeEventListener("keydown", onKey)
    }
  }, [])
  return list
}

// a look for a new local player: another breed than the first player's, so the chickens are told apart
export function lookForNewPlayer(taken: ChickenLook[]): ChickenLook {
  const used = new Set(taken.map(l => l.torso))
  const breed = LOOK_ART.BREEDS.find(b => !used.has(LOOK_ART.breedLook(b.id).torso)) ?? LOOK_ART.BREEDS[taken.length % LOOK_ART.BREEDS.length]
  return LOOK_ART.breedLook(breed.id)
}

// ---------- the other local players' chickens ----------
// One engine per local player after the first, each listening only to its own devices. They arrive falling from
// the sky next to the first player's chicken; the Parquinho moves them with its camera (through `engines`).
export function LocalChickens({ players, lead, groundHeight, engines }: {
  players: LobbyPlayer[]
  lead: ChickenEngine | null
  groundHeight: number
  engines: React.RefObject<Map<string, ChickenEngine>>
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const groundRef = useRef(groundHeight)
  groundRef.current = groundHeight
  useEffect(() => {
    const host = hostRef.current, map = engines.current
    if (!host || !lead) return
    const ids = new Set(players.map(p => p.id))
    map.forEach((eng, id) => { if (!ids.has(id)) { eng.destroy(); map.delete(id) } })
    players.forEach((p, i) => {
      let eng = map.get(p.id)
      if (!eng) {
        eng = createChickenEngine(host, { groundHeight: groundRef.current, fixedScale: true, look: p.look })
        eng.setGame({ gameMode: true })
        const st = lead.getMotionState()
        // next to the nearest player (for now: the first one), alternating sides
        eng.dropAt(st.x + (i % 2 ? -1 : 1) * (90 + 50 * Math.floor(i / 2)))
        map.set(p.id, eng)
      }
      eng.setDevices(p.inputs)
      eng.setLook(p.look ?? null)
    })
  }, [players, lead, engines])
  // all of them go when the Pátio closes (or the first player's chicken is remade)
  useEffect(() => {
    const map = engines.current
    return () => { map.forEach(eng => eng.destroy()); map.clear() }
  }, [engines, lead])
  return <div ref={hostRef} className="pointer-events-none fixed inset-0 z-[200]" />
}

// ---------- header: the lobby switcher ----------
// back / forward through the public lobbies on the game server, in the order they opened; going to another one
// leaves this lobby, and every local player of this computer goes along (onSwitch)
export function LobbySwitcher({ mode, roomId, onStatus, onSwitch }: { mode: LobbyMode; roomId: string | null; onStatus: (text: string) => void; onSwitch: (lobby: NetLobby) => void }) {
  const go = async (dir: -1 | 1) => {
    if (mode !== "online") { onStatus("O passador de lobby só funciona no modo online (painel de players)."); return }
    const list = await listNetLobbies()
    const pick = neighbourLobby(list.map(l => ({ id: l.roomId, createdAt: Date.parse(l.createdAt) || 0, players: l.players })), roomId, dir)
    const next = pick && pick.id !== roomId ? list.find(l => l.roomId === pick.id) ?? null : null
    if (!next) { onStatus(list.length ? "Nenhum outro lobby público aberto." : ONLINE_OFF); return }
    onStatus(`Indo para o lobby ${next.name ?? (next.patioId === "default" ? "do Pátio padrão" : "")} (${next.players}/${next.max})…`)
    onSwitch(next)
  }
  const btn = "inline-flex h-9 w-7 items-center justify-center text-[#b9c7b9] transition-colors hover:text-white disabled:opacity-40"
  return (
    <div className={cn("hidden h-9 items-center rounded-md border sm:inline-flex", mode === "online" ? "border-white/15" : "border-white/10 opacity-60")} title={mode === "online" ? "Passador de lobby: lobbies públicos em ordem de abertura" : "Passador de lobby (só no modo online)"}>
      <button type="button" aria-label="Lobby anterior" onClick={() => void go(-1)} className={btn}><ChevronLeft className="h-4 w-4" /></button>
      <span className="font-mono text-[10px] uppercase tracking-wider text-[#93a79a]">{mode === "online" ? "lobby" : "local"}</span>
      <button type="button" aria-label="Próximo lobby" onClick={() => void go(1)} className={btn}><ChevronRight className="h-4 w-4" /></button>
    </div>
  )
}

// ---------- the panel ----------
export function PlayersPanel({ lobby, link, seats, connecting, onPublic, devices, meName, meLook, onClose, onMode, onAdd, onInviteFriend, onRemove, onAssign, onEditor, onRename, onAvatar }: {
  lobby: LobbyState
  // the invite link: this Pátio and, online, its room
  link: string
  // online: browsers in the lobby out of 13 (the counter); null in Local mode, where it counts this computer's players
  seats: { used: number; max: number } | null
  // online chosen but not connected yet
  connecting: boolean
  // the owner opens (listed for everyone) or closes (invite only) the online lobby
  onPublic: (on: boolean) => void
  // the devices found on this computer (the columns); devices held but gone (a gamepad unplugged) stay as columns
  devices: InputDeviceId[]
  // the first local player's nickname (logged account)
  meName: string | null
  // the first local player's look (the vestiário's, from the central configuration's draft)
  meLook: ChickenLook
  onClose: () => void
  onMode: (mode: LobbyMode) => void
  onAdd: () => void
  // opens the Friends panel, where each friend is called into this lobby
  onInviteFriend: () => void
  onRemove: (playerId: string) => void
  onAssign: (device: InputDeviceId, playerId: string) => void
  onEditor: (playerId: string, on: boolean) => void
  onRename: (playerId: string, name: string) => void
  onAvatar: (playerId: string) => void
}) {
  const me = firstLocal(lobby)
  const iOwn = isOwner(lobby, me?.id)
  const held = lobby.players.flatMap(p => (p.kind === "local" ? p.inputs : []))
  const columns = sortDevices([...devices, ...held])
  const present = new Set(devices)
  const full = localPlayers(lobby).length >= LOCAL_MAX
  const [note, setNote] = useState<string | null>(null)
  const nameOf = (p: LobbyPlayer) => (p.id === me?.id && meName ? meName : p.name)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setNote(lobby.mode === "online" ? "Link de convite copiado." : "Link de convite copiado. Quem abrir entra quando o modo online voltar.")
    } catch {
      setNote(`Não deu para copiar. O link é: ${link}`)
    }
  }

  return (
    <FloatingPanel
      id="patio-players"
      aria-label="Players e lobby"
      initial={(vw, vh) => { const w = Math.min(720, vw - 24); return { x: Math.max(12, (vw - w) / 2), y: 64, w, h: Math.min(460, vh - 80) } }}
      minW={300}
      className="rounded-xl border border-primary/30 bg-[#101713] font-mono text-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
    >
      <div data-drag-handle className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <h2 className="text-sm text-white">Players</h2>
        <ModeSwitch mode={lobby.mode} onChange={onMode} />
        {seats && (
          <label className={cn("flex items-center gap-1.5 text-[#b9c7b9]", !iOwn && "opacity-50")} title={iOwn ? "Público: aparece para todos. Privado: só por convite." : "Só o dono do lobby abre ou fecha"}>
            <input type="checkbox" checked={lobby.visibility !== "private"} disabled={!iOwn} onChange={e => onPublic(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Público
          </label>
        )}
        <span className="ml-auto text-[#93a79a]" title={seats ? "Navegadores no lobby" : "Players locais neste computador"}>{seats ? `${seats.used}/${seats.max}` : `${localPlayers(lobby).length}/${LOCAL_MAX}`}</span>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      {connecting && <p className="shrink-0 border-b border-amber-300/20 bg-amber-300/5 px-4 py-2 text-amber-200">Conectando ao modo online…</p>}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-[#101713] text-[10px] uppercase tracking-wider text-[#93a79a]">
            <tr>
              <th className="w-12 px-3 py-2" />
              <th className="px-2 py-2">Player</th>
              {columns.map(d => (
                <th key={d} className={cn("px-2 py-2 text-center leading-tight", !present.has(d) && "opacity-50")} title={present.has(d) ? undefined : "Desconectado"}>{inputDeviceLabel(d)}</th>
              ))}
              <th className="px-2 py-2 text-center leading-tight" title="Quem pode editar o Pátio quando o Modo Edição está ligado">Edit mode</th>
              <th className="whitespace-nowrap px-3 py-2 text-center">Remove</th>
            </tr>
          </thead>
          <tbody>
            {lobby.players.map(p => {
              const local = p.kind === "local", owner = lobby.ownerId === p.id
              return (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-1.5">
                    <button type="button" onClick={() => onAvatar(p.id)} disabled={!local} title={local ? "Vestiário" : undefined} aria-label={`Vestiário de ${nameOf(p)}`} style={{ borderColor: p.color }} className="relative block h-10 w-10 overflow-hidden rounded-full border-[3px] border-white/20 bg-[#0b110e] disabled:cursor-default">
                      {p.id === me?.id ? <ChickenHeadIcon look={meLook} /> : p.look ? <ChickenHeadIcon look={p.look} /> : <Users className="m-auto h-5 w-5 text-[#93a79a]" />}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {owner && <span title="Dono do lobby"><Crown className="h-3.5 w-3.5 shrink-0 text-amber-300" /></span>}
                      {local && p.id !== me?.id ? (
                        <input
                          aria-label="Nome do player"
                          value={p.name}
                          maxLength={20}
                          onChange={e => onRename(p.id, e.target.value)}
                          className="h-7 w-28 rounded border border-transparent bg-transparent px-1 text-white hover:border-white/15 focus:border-primary focus:outline-none"
                        />
                      ) : (
                        <span className="truncate text-white">{nameOf(p)}</span>
                      )}
                      {!local && <span className="text-[10px] text-[#93a79a]">{p.kind === "bot" ? "bot" : "online"}</span>}
                    </div>
                  </td>
                  {columns.map(d => (
                    <td key={d} className="px-2 py-1.5 text-center">
                      {local ? (
                        <input
                          type="radio"
                          name={`device-${d}`}
                          aria-label={`${inputDeviceLabel(d)} para ${nameOf(p)}`}
                          checked={p.inputs.includes(d)}
                          onChange={() => onAssign(d, p.id)}
                          className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                        />
                      ) : (
                        // online players: only which kind of input they use, not changeable from here
                        <span className={cn("inline-block h-3 w-3 rounded-full border", p.inputLabel === inputDeviceLabel(d) ? "border-white/50 bg-white/40" : "border-white/10")} />
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${nameOf(p)} pode editar`}
                      checked={canEditPatio(lobby, p.id)}
                      disabled={!iOwn || owner || p.kind === "bot"}
                      onChange={e => onEditor(p.id, e.target.checked)}
                      title={iOwn ? undefined : "Só o dono do lobby muda quem edita"}
                      className="h-4 w-4 cursor-pointer accent-[var(--primary)] disabled:cursor-default"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {iOwn && !owner && !isProtectedPlayer(lobby, p) && (
                      <button type="button" aria-label={`Remover ${nameOf(p)}`} onClick={() => onRemove(p.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-[#b9c7b9] hover:border-red-400 hover:text-red-300"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </td>
                </tr>
              )
            })}
            <tr className="border-t border-white/5">
              <td className="px-3 py-1.5">
                <button type="button" onClick={onAdd} disabled={full} aria-label="Add local player" className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-white/25 text-[#93a79a] hover:border-primary hover:text-white disabled:opacity-40">
                  <Plus className="h-5 w-5" />
                </button>
              </td>
              <td colSpan={columns.length + 3} className="px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-x-1 text-[#b9c7b9]">
                  <button type="button" onClick={onAdd} disabled={full} className="hover:text-white disabled:opacity-40">Add local player</button>
                  <span className="text-white/25">/</span>
                  <button type="button" onClick={onInviteFriend} className="inline-flex items-center gap-1 hover:text-white"><UserPlus className="h-3.5 w-3.5" />Invite friend</button>
                  <span className="text-white/25">/</span>
                  <button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-1 hover:text-white"><Link2 className="h-3.5 w-3.5" />Copy link</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {(note || full) && (
        <p className="shrink-0 border-t border-white/10 px-4 py-2 text-[10px] leading-relaxed text-[#93a79a]">
          {note ?? `Até ${LOCAL_MAX} players locais neste computador.`}
        </p>
      )}
    </FloatingPanel>
  )
}

function ModeSwitch({ mode, onChange }: { mode: LobbyMode; onChange: (mode: LobbyMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Lobby" className="inline-flex rounded-md border border-white/15 p-0.5">
      {(["local", "online"] as const).map(m => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => onChange(m)} className={cn("h-7 rounded px-3 capitalize", mode === m ? "bg-primary font-bold text-[#05060c]" : "text-[#b9c7b9] hover:text-white")}>{m}</button>
      ))}
    </div>
  )
}
