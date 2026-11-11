"use client"

// The jukebox's panel (it opens when she strikes the jukebox in the temple): a grid of covers, the old campaign's
// disc first, then the songs; the one picked is the one the gong starts. Under the grid, the picked one's numbers
// (bpm, key, length, record) and its buttons: Tocar (now), Editar (the timeline), Salvar como, Nova música, and for
// the ones made here their cover's style and Excluir; Gerar de MIDI opens the generator. A line says where the songs are kept
// (this browser, or the account), and the admin can list everyone's songs, hear one or copy it.
import { useEffect, useRef, useState } from "react"
import { Cloud, CloudOff, Copy, Disc3, FileMusic, Pencil, Play, Plus, Save, Square, Trash2, Users, X } from "lucide-react"
import { useOnline } from "@/components/online/online-provider"
import { isAdminUser } from "@/lib/admin/access"
import { listAllSongs, songApi, songErrorMessage, subscribeSyncState, syncState, type SongInfo } from "@/lib/pigchicken/song-online"
import { FloatingPanel } from "@/components/ui/floating-panel"
import { coverCanvas } from "@/components/pigchicken/song-cover-draw"
import {
  CAMPAIGN, CAMPAIGN_ID, COVER_PALETTES, COVER_STYLES, clock, deleteSong, keyName, loadLibrary, newSong, nowPlaying, openMidiGenerator, openSongEditor, pickSong, playDraft, playSongNow, saveSongAs, stopSongNow,
  songSeconds, subscribeLibrary, updateSong, type Library, type LibrarySong,
} from "@/lib/pigchicken/song-library"
import { loadCatalog } from "@/lib/pigchicken/alien-catalog"
import { SCALES } from "@/lib/pigchicken/music"
import { STAGES } from "@/lib/pigchicken/temple"
import { STAGE_MUSIC } from "@/lib/pigchicken/temple-music"
import { noteCount } from "@/lib/pigchicken/note-stage"
import { cn } from "@/lib/utils"

const NEON = "#39ff88"

function Cover({ song, size, className }: { song: LibrarySong | null; size: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const art = coverCanvas(song, size * dpr, loadCatalog())
    c.width = art.width; c.height = art.height
    c.getContext("2d")!.drawImage(art, 0, 0)
  }, [song, size])
  return <canvas ref={ref} aria-hidden="true" style={{ width: size, height: size }} className={cn("block rounded-md", className)} />
}

export function JukeboxPanel({ onClose }: { onClose: () => void }) {
  const [lib, setLib] = useState<Library>(() => loadLibrary())
  const [naming, setNaming] = useState<string | null>(null)
  useEffect(() => subscribeLibrary(setLib), [])
  // a song (or the campaign) playing: Tocar turns into Parar
  const [playing, setPlaying] = useState(() => !!nowPlaying.id || nowPlaying.campaign)
  useEffect(() => {
    const id = window.setInterval(() => setPlaying(!!nowPlaying.id || nowPlaying.campaign), 200)
    return () => window.clearInterval(id)
  }, [])
  const online = useOnline()
  const isAdmin = isAdminUser(online.user)
  const [sync, setSync] = useState(syncState)
  useEffect(() => subscribeSyncState(setSync), [])
  // the admin's list of everyone's songs
  const [all, setAll] = useState<SongInfo[] | null>(null)
  const [allNote, setAllNote] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const openAll = async () => {
    if (all) { setAll(null); return }
    setAllNote("Carregando…")
    try { setAll(await listAllSongs()); setAllNote("") } catch (e) { setAllNote(songErrorMessage(e)) }
  }
  const fetchSong = async (s: SongInfo) => {
    setBusy(`${s.ownerId}/${s.id}`)
    try { const got = await songApi.get(s.id, s.ownerId); if (!got?.song) setAllNote("Essa música não está mais lá."); return got?.song ?? null } catch (e) { setAllNote(songErrorMessage(e)); return null } finally { setBusy(null) }
  }
  const picked = lib.songs.find(s => s.id === lib.picked) ?? null
  const isCampaign = lib.picked === CAMPAIGN_ID
  const record = lib.records[lib.picked]

  const stats: [string, string][] = isCampaign
    ? [["Fases", String(STAGES.length)], ["bpm", `${STAGE_MUSIC[0].zone.bpm}–${STAGE_MUSIC[STAGE_MUSIC.length - 1].zone.bpm}`], ["Tom", "Ré, Lá, Dó, Sol"], ["Recorde", "—"]]
    : picked
      ? [
        ["bpm", String(picked.music.zone.bpm)],
        ["Tom", `${keyName(picked.music.zone.root)} · ${SCALES[picked.music.zone.scale].label.toLowerCase()}`],
        ["Duração", clock(songSeconds(picked))],
        ["Notas", `${noteCount(picked)} · ${picked.aliens.length} aliens`],
        ["Recorde", record ? `${record.score.toLocaleString("pt-BR")} · ${Math.round(record.accuracy * 100)}%` : "—"],
      ]
      : []

  const saveAs = () => {
    if (!picked || naming === null) return
    const name = naming.trim()
    if (!name) return
    saveSongAs(lib, picked, name)
    setNaming(null)
  }
  const setCover = (fn: (s: LibrarySong) => void) => {
    if (!picked || picked.builtin) return
    const next = structuredClone(picked); fn(next)
    updateSong(lib, next)
  }

  return (
    <FloatingPanel id="pigchicken-jukebox" aria-label="Jukebox" initial={(vw, vh) => ({ x: Math.max(12, vw - Math.min(520, vw - 24) - 12), y: 64, w: Math.min(520, vw - 24), h: Math.min(720, vh - 104) })} minW={300}
      className="rounded-[22px] border-2 bg-[#07130d] font-mono text-xs text-[#dfe8df] shadow-[0_0_24px_rgba(57,255,136,0.25),0_20px_60px_rgba(0,0,0,0.6)]" style={{ borderColor: NEON }}>
      <div data-drag-handle className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <Disc3 className="h-4 w-4" style={{ color: NEON }} />
        <h2 className="min-w-0 flex-1 truncate text-sm text-white">Jukebox</h2>
        <button type="button" aria-label="Fechar jukebox" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* where the songs are kept */}
        <div className="mx-3 mt-3 flex items-center gap-1.5 text-[11px] text-[#93a79a]">
          {sync.status === "local" ? <CloudOff className="h-3.5 w-3.5 shrink-0" /> : <Cloud className="h-3.5 w-3.5 shrink-0" style={{ color: sync.status === "error" ? "#ff6b5b" : NEON }} />}
          <span className="min-w-0">
            {sync.status === "local" ? "Neste navegador. Entre com sua conta para guardar as músicas nela."
              : sync.status === "syncing" ? "Sincronizando com a sua conta…"
              : sync.status === "synced" ? `Na sua conta.${sync.message ? ` ${sync.message}` : ""}`
              : sync.message}
          </span>
        </div>
        {/* the screen: a grid of covers */}
        <div role="listbox" aria-label="Músicas" className="m-3 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 rounded-xl border border-white/10 bg-black/60 p-2">
          {[null, ...lib.songs].map(s => {
            const id = s?.id ?? CAMPAIGN_ID, on = id === lib.picked
            return (
              <button key={id} type="button" role="option" aria-selected={on} onClick={() => { pickSong(id); setNaming(null) }}
                className={cn("grid min-w-0 gap-1 rounded-lg border p-1 text-left transition-colors", on ? "bg-white/5" : "border-transparent hover:border-white/25")}
                style={on ? { borderColor: s?.music.zone.color ?? CAMPAIGN.color } : undefined}>
                <Cover song={s} size={88} className="w-full" />
                <span className="truncate px-0.5 text-[11px] text-white">{s?.name ?? CAMPAIGN.name}</span>
              </button>
            )
          })}
        </div>
        {/* the one picked */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 pb-3">
          <Cover song={picked} size={112} />
          <div className="grid min-w-0 content-start gap-1">
            <h3 className="truncate text-sm font-bold" style={{ color: picked?.music.zone.color ?? CAMPAIGN.color }}>{picked?.name ?? CAMPAIGN.name}</h3>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[11px]">
              {stats.map(([k, v]) => <div key={k} className="contents"><dt className="text-[#93a79a]">{k}</dt><dd className="truncate text-white">{v}</dd></div>)}
            </dl>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {playing
            ? <button type="button" onClick={() => { stopSongNow(); setPlaying(false) }} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-bold text-[#05060c]" style={{ background: "#ff6b5b" }}><Square className="h-4 w-4" />Parar</button>
            : <button type="button" onClick={() => { playSongNow(lib.picked); onClose() }} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-bold text-[#05060c]" style={{ background: NEON }}><Play className="h-4 w-4" />Tocar</button>}
          {!isCampaign && <button type="button" onClick={() => setNaming(n => (n === null ? `${picked?.name ?? "Música"} 2` : null))} aria-expanded={naming !== null} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 hover:border-primary"><Save className="h-4 w-4" />Salvar como</button>}
          {picked && <button type="button" onClick={() => openSongEditor(picked.id)} title={picked.builtin ? "Esta é do jogo: salve as mudanças com outro nome" : undefined} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 hover:border-primary"><Pencil className="h-4 w-4" />Editar</button>}
          <button type="button" onClick={() => openSongEditor(newSong(lib).id)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 hover:border-primary"><Plus className="h-4 w-4" />Nova música</button>
          <button type="button" onClick={() => openMidiGenerator()} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 hover:border-primary"><FileMusic className="h-4 w-4" />Gerar de MIDI</button>
          {picked && !picked.builtin && <button type="button" onClick={() => deleteSong(lib, picked.id)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 hover:border-[#ff6b5b]"><Trash2 className="h-4 w-4" />Excluir</button>}
        </div>
        {naming !== null && (
          <form onSubmit={e => { e.preventDefault(); saveAs() }} className="flex gap-1.5 px-4 pb-3">
            <input autoFocus aria-label="Nome da nova música" value={naming} onChange={e => setNaming(e.target.value)} onKeyDown={e => e.stopPropagation()} maxLength={60} className="h-9 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b110e] px-2 text-sm text-white" />
            <button type="submit" disabled={!naming.trim()} className="h-9 rounded-md border px-3 font-bold disabled:opacity-40" style={{ borderColor: NEON, color: NEON }}>Salvar</button>
          </form>
        )}
        {picked && !picked.builtin && (
          <div className="grid gap-2 border-t border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-[#93a79a]">Capa</span>
              {COVER_STYLES.map(o => <button key={o.value} type="button" aria-pressed={picked.cover.style === o.value} onClick={() => setCover(s => { s.cover.style = o.value })} className={cn("h-7 rounded-full border px-3", picked.cover.style === o.value ? "border-primary text-white" : "border-white/15")}>{o.label}</button>)}
              <input type="color" aria-label="Fundo da capa" value={picked.cover.bg} onChange={e => { const v = e.target.value; setCover(s => { s.cover.bg = v }) }} className="h-7 w-10 cursor-pointer rounded-md border border-white/15 bg-[#0b110e] p-0.5" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-[#93a79a]">Cores</span>
              {COVER_PALETTES.map(o => <button key={o.value} type="button" aria-pressed={picked.cover.palette === o.value} onClick={() => setCover(s => { s.cover.palette = o.value })} className={cn("h-7 rounded-full border px-3", picked.cover.palette === o.value ? "border-primary text-white" : "border-white/15")}>{o.label}</button>)}
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="grid gap-2 border-t border-white/10 px-4 py-3">
            <button type="button" onClick={openAll} aria-expanded={!!all} className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-white/20 px-3 hover:border-primary"><Users className="h-4 w-4" />Músicas de todos (admin)</button>
            {allNote && <p className="text-[11px] text-[#93a79a]">{allNote}</p>}
            {all && (all.length ? (
              <ul className="grid gap-1">
                {all.map(s => {
                  const key = `${s.ownerId}/${s.id}`
                  return (
                    <li key={key} className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-white">{s.name}</div>
                        <div className="truncate text-[10px] text-[#93a79a]">{s.ownerName ?? "Jogador"}{s.updatedAt ? ` · ${new Date(s.updatedAt).toLocaleDateString("pt-BR")}` : ""}</div>
                      </div>
                      <button type="button" disabled={busy === key} aria-label={`Ouvir ${s.name}`} title="Tocar no templo" onClick={async () => { const song = await fetchSong(s); if (song) { playDraft(song, 0); onClose() } }} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary disabled:opacity-40"><Play className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={busy === key} aria-label={`Copiar ${s.name} para a minha biblioteca`} title="Copiar para a minha biblioteca" onClick={async () => { const song = await fetchSong(s); if (song) { saveSongAs(loadLibrary(), song, `${s.name} (${s.ownerName ?? "cópia"})`.slice(0, 60)); setAllNote(`“${s.name}” foi copiada para a sua biblioteca.`) } }} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 hover:border-primary disabled:opacity-40"><Copy className="h-3.5 w-3.5" /></button>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="text-[11px] text-[#93a79a]">Ninguém guardou músicas ainda.</p>)}
          </div>
        )}
      </div>
    </FloatingPanel>
  )
}
